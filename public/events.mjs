// Game event bus. Turns server snapshots into named gameplay events so VFX (R10) and
// sound (R13) can react without reading game state directly.
//
// Every payload: {type, playerId (string|null), character (character id|null), position ({x,y,z}|null), tick, local (bool), ...extra}.
// See HANDOFF.md for the per-event extras.
import {groundHeight} from '../shared/world.mjs';
import {disguiseState} from '../shared/disguise.mjs';

export const EVENT_TYPES=['potion_pickup','potion_drink','charm_cast','charm_end','reveal_start','reveal_end','cover_ward','guest_delivered','stall_enter','stall_win','stall_fail','hit','sealed','rescued','boss_omen','boss_banished','round_start','round_end','footstep','jump','land','firework'];
// Extra events the server already reports; useful for feedback but not part of the R01 brief list.
export const EXTRA_EVENT_TYPES=['spirit_bolt','ward_block','seal_break','ping','stall_reward'];
export const FOOTSTEP_STRIDE=1.2;

export function createEventBus({onError=(error,type)=>console.error(`event handler for ${type} failed`,error)}={}){
  const handlers=new Map();
  const set=type=>{if(!handlers.has(type))handlers.set(type,new Set());return handlers.get(type);};
  const bus={
    /** Subscribe to one type, or '*' for everything. Returns an unsubscribe function. */
    on(type,fn){set(type).add(fn);return ()=>bus.off(type,fn);},
    once(type,fn){const off=bus.on(type,payload=>{off();fn(payload);});return off;},
    off(type,fn){handlers.get(type)?.delete(fn);},
    /** Deliver synchronously. A throwing handler never stops the others (or the game loop). */
    emit(type,payload={}){
      const event={type,playerId:null,position:null,...payload};
      for(const fn of [...(handlers.get(type)||[]),...(handlers.get('*')||[])]){try{fn(event);}catch(error){onError(error,type);}}
      return event;
    },
    clear(){handlers.clear();}
  };
  return bus;
}

const at=(x,z,height=0)=>({x,y:groundHeight(x,z)+(height||0),z});
const playerAt=p=>p?at(p.x,p.z,p.height):null;

// server event fx -> bus event
function fromServerEvent(e,state){
  const actor=e.actor?state.players[e.actor]:null,base={playerId:e.actor??e.player??null,position:e.at?at(e.at.x,e.at.z):playerAt(actor),serverEventId:e.id};
  switch(e.fx){
    case 'pickup':return {...base,type:'potion_pickup'};
    case 'drink':return {...base,type:'potion_drink'};
    case 'charm':return {...base,type:'charm_cast',guestId:e.target??null};
    case 'cover':return {...base,type:'cover_ward'};
    case 'jump':return {...base,type:'jump'};
    case 'land':return {...base,type:'land'};
    case 'hit':return {...base,type:e.type==='down'?'sealed':'hit',health:actor?.health??null};
    case 'revive':return {...base,type:'rescued'};
    case 'omen':return {...base,type:'boss_omen',position:state.encounter?at(state.encounter.x,state.encounter.z):null};
    case 'bossDown':return {...base,type:'boss_banished'};
    case 'bolt':return {...base,type:'spirit_bolt',from:e.from??null,boss:!!e.boss,combo:!!e.combo};
    case 'blocked':return {...base,type:'ward_block'};
    case 'seal':return {...base,type:'seal_break'};
    case 'ping':return {...base,type:'ping'};
    case 'reward':return {...base,type:'stall_reward'};
    default:return null; // 'reveal' comes from the snapshot diff below
  }
}

/**
 * Stateful snapshot differ. ingest(state, myId) returns the events implied by the change since
 * the previous snapshot (in a stable order). The first snapshot after reset() only primes it,
 * so joining mid-round never replays old events.
 */
export function createSnapshotTracker({stride=FOOTSTEP_STRIDE}={}){
  let prev=null,lastEvent=0;const steps=new Map();
  return {
    reset(){prev=null;lastEvent=0;steps.clear();},
    ingest(state,myId=null){
      // REMASTER-HOOK hq: every payload carries the acting player's character id (voices, per-character colours).
      const out=[],push=e=>out.push({tick:state.tick,character:(e.playerId&&(state.players[e.playerId]??prev?.players[e.playerId])?.character)||null,...e,local:!!myId&&e.playerId===myId});
      if(!prev){prev=state;lastEvent=Math.max(0,...state.events.map(e=>e.id));return out;}
      const was=prev.phase,now=state.phase;
      if(was!=='playing'&&now==='playing')push({type:'round_start',playerId:null,position:null,mode:state.mode,round:state.round});
      for(const e of state.events){if(e.id<=lastEvent)continue;lastEvent=e.id;if(!e.fx)continue;const mapped=fromServerEvent(e,state);if(mapped)push(mapped);}
      for(const [id,p] of Object.entries(state.players)){
        const before=prev.players[id];if(!before)continue;
        if(!before.mini&&p.mini)push({type:'stall_enter',playerId:id,position:playerAt(p),stallId:p.mini.stallId??null,game:p.mini.kind??null});
        if(p.mini&&p.mini.status==='result'&&(before.mini?.status!=='result'||before.mini?.session!==p.mini.session))push({type:p.mini.result?.won?'stall_win':'stall_fail',playerId:id,position:playerAt(p),stallId:p.mini.stallId??null,game:p.mini.kind??null,reason:p.mini.result?.reason??null});
        if(now==='playing'&&was==='playing'){
          const r0=disguiseState(before,prev.tick).revealed,r1=disguiseState(p,state.tick).revealed;
          if(!r0&&r1)push({type:'reveal_start',playerId:id,position:playerAt(p),part:disguiseState(p,state.tick).part});
          if(r0&&!r1)push({type:'reveal_end',playerId:id,position:playerAt(p)});
        }
      }
      const humansBefore=new Map(prev.humans.map(h=>[h.id,h]));
      for(const h of state.humans){
        const before=humansBefore.get(h.id);if(!before)continue;
        if(before.owner&&before.owner!==h.owner)push({type:'charm_end',playerId:before.owner,position:at(h.x,h.z),guestId:h.id,reason:h.state==='delivered'?'delivered':h.owner?'transferred':'expired'});
        if(before.state!=='delivered'&&h.state==='delivered')push({type:'guest_delivered',playerId:before.owner??null,position:at(h.x,h.z),guestId:h.id});
      }
      if(now==='playing'&&was==='playing')for(const [id,p] of Object.entries(state.players)){
        const before=prev.players[id];if(!before)continue;
        if((p.height||0)>0||(before.height||0)>0){steps.set(id,{...(steps.get(id)||{left:true}),travelled:0});continue;}
        const s=steps.get(id)||{travelled:0,left:true};s.travelled+=Math.hypot(p.x-before.x,p.z-before.z);
        if(s.travelled>=stride){s.travelled%=stride;s.left=!s.left;push({type:'footstep',playerId:id,position:playerAt(p),foot:s.left?'left':'right'});}
        steps.set(id,s);
      }
      if(was==='playing'&&(now==='won'||now==='lost'))push({type:'round_end',playerId:state.winner??null,position:null,result:now,reason:state.lossReason??null});
      prev=state;return out;
    }
  };
}

/** Wire a tracker to a bus: call ingest(state, myId) for every snapshot. */
export function createGameEvents(bus,options){
  const tracker=createSnapshotTracker(options);
  return {
    bus,
    ingest(state,myId){const events=tracker.ingest(state,myId);for(const e of events)bus.emit(e.type,e);return events;},
    reset(){tracker.reset();}
  };
}
