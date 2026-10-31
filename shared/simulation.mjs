import {CHARACTERS,WORLD,POTION_SPOTS,HUMAN_SPOTS,distance,walkable,movePoint,findPath,nearbyStall} from './world.mjs';
import {DISGUISE,disguiseState} from './disguise.mjs';
import {createEncounter,freshCombat,combatAction,stepEncounter} from './encounter.mjs';
import {createGame,inputGame,advanceGame,rewardFor} from './minigames.mjs';
const stallState=()=>({mini:null,stallCooldowns:{},stamps:[],ward:0,speedBoost:0});
const names=['Haru','Ao','Yuki','Ren','Nao','Mio','Sora','Rio','Hina'];
const wishes=['candied apples','fireworks','goldfish','festival music','a wish','moon cakes'];
const roundStats=()=>({distanceWalked:0,potionsCollected:0,charmed:0,potionsUsed:0,potionsShared:0,handoffs:0,stallsWon:0});
export function createRoom(code,{combat=true,mode='festival'}={}){return{code,mode:mode==='boss'?'boss':'festival',combatEnabled:combat,encounter:combat?createEncounter():null,lossReason:null,phase:'lobby',introRemaining:0,host:null,time:WORLD.duration,tick:0,round:0,countdown:0,paused:false,players:{},humans:HUMAN_SPOTS.map(([x,z],i)=>({id:`h${i}`,name:names[i],wish:wishes[i%wishes.length],x,z,homeX:x,homeZ:z,owner:null,charm:0,state:'wander',talkUntil:0,path:[],pathAt:0,direction:0})),potions:POTION_SPOTS.map(p=>({...p,available:true,readyAt:0})),winner:null,winnerName:null,events:[],eventSeq:0};}
export function addPlayer(room,id,name,character){
  if(Object.keys(room.players).length>=4)throw Error('This room is full (4 players).');
  if(!CHARACTERS.some(c=>c.id===character))throw Error('Choose a character.');
  if(Object.values(room.players).some(p=>p.character===character))throw Error('That character is taken. Choose another yokai.');
  const n=Object.keys(room.players).length;
  room.players[id]={id,name:(String(name||'').replace(/[\u0000-\u001f\u007f]/g,'').trim()||CHARACTERS.find(c=>c.id===character).name).slice(0,12),character,x:(n-1.5)*1.2,z:16,dx:0,dz:0,height:0,vy:0,jumpCooldown:0,busyUntil:0,energy:70,bottles:1,delivered:0,cover:0,coverCooldown:0,action:'idle',actionUntil:0,facing:0,ready:false};
  Object.assign(room.players[id],stallState(),freshCombat(),{connected:true,pingUntil:0,pingAt:null,stats:roundStats(),nextRevealAt:DISGUISE.period,revealUntil:0,concealedUntil:0});if(!room.host)room.host=id;return room.players[id];
}
export function removePlayer(room,id){
  delete room.players[id];for(const h of room.humans)if(h.owner===id)parkGuest(h);
  if(room.host===id)room.host=Object.values(room.players).find(p=>p.connected)?.id||Object.keys(room.players)[0]||null;
  if(['countdown','disguising'].includes(room.phase)){room.phase='lobby';room.countdown=0;room.introRemaining=0;}
}
function event(room,player,text,type='info',extra={}){room.events.push({id:++room.eventSeq,player,text,type,...extra});if(room.events.length>32)room.events.shift();}
export function setReady(room,id,ready){const p=room.players[id];if(room.phase!=='lobby'||!p?.connected)return false;p.ready=!!ready;return true;}
export function beginCountdown(room,id){
  const crew=Object.values(room.players);
  if(room.phase!=='lobby'||room.host!==id||!room.players[id]?.connected||crew.some(p=>!p.connected||p.id!==id&&!p.ready))return false;
  room.players[id].ready=true;room.phase='countdown';room.countdown=3;return true;
}
export function returnToLobby(room,id){
  if(room.host!==id||!['won','lost'].includes(room.phase))return false;
  room.phase='lobby';room.paused=false;for(const p of Object.values(room.players)){p.ready=false;p.mini=null;p.dx=p.dz=0;}return true;
}
export function setConnected(room,id,connected){
  const p=room.players[id];if(!p)return;p.connected=connected;p.dx=p.dz=0;
  if(connected&&!room.players[room.host]?.connected)room.host=id;
  if(!connected){p.ready=false;p.mini=null;room.paused=false;if(['countdown','disguising'].includes(room.phase)){room.phase='lobby';room.countdown=0;room.introRemaining=0;}
    if(room.host===id)room.host=Object.values(room.players).find(a=>a.connected)?.id||id;
  }
}
export function setPaused(room,id,paused){
  if(room.phase!=='playing'||Object.keys(room.players).length!==1||!room.players[id])return false;
  room.paused=!!paused;room.players[id].dx=room.players[id].dz=0;return true;
}
export function startRound(room,id){
  if(room.host!==id||room.phase==='playing')return false;
  const fresh=createRoom(room.code);Object.assign(room,{phase:'playing',introRemaining:0,round:room.round+1,countdown:0,paused:false,time:WORLD.duration,tick:0,encounter:room.combatEnabled?fresh.encounter:null,lossReason:null,humans:fresh.humans,potions:fresh.potions,winner:null,winnerName:null,events:[]});
  const players=Object.values(room.players);
  players.forEach((p,i)=>Object.assign(p,stallState(),freshCombat(),{stats:roundStats(),nextRevealAt:DISGUISE.period,revealUntil:0,concealedUntil:0,pingUntil:0,pingAt:null,ready:false,x:(i-(players.length-1)/2)*2.6,z:16,dx:0,dz:0,height:0,vy:0,jumpCooldown:0,busyUntil:0,energy:70,bottles:1,delivered:0,cover:0,coverCooldown:0,action:'arrive',actionUntil:.45}));if(room.encounter&&room.mode==='boss')room.encounter.nextAt=4;return true;
}
function settleStall(room,p){
  const g=p.mini;if(!g||g.status!=='result'||g.settled)return;g.settled=true;
  p.stallCooldowns[g.stallId]=room.tick+(g.result.won?45:8);p.action='idle';
  const reward=rewardFor(g);if(!reward)return;p.stats.stallsWon++;
  g.reward=reward.label;
  if(reward.bottles){if(p.bottles<3)p.bottles++;else{p.energy=Math.min(100,p.energy+25);g.reward='Bag full: +25 spirit';}}
  p.energy=Math.min(100,p.energy+(reward.energy||0));p.ward=Math.max(p.ward,reward.ward||0);p.speedBoost=Math.max(p.speedBoost,reward.speed||0);
  if(!p.stamps.includes(g.stallId))p.stamps.push(g.stallId);
  event(room,p.id,`Prize: ${g.reward}! Festival stamps ${p.stamps.length}/6`,'reward',{fx:'reward',actor:p.id});
}
export function stallInput(room,id,session,input){
  const p=room.players[id],g=p?.mini;if(room.phase!=='playing'||room.paused||!p?.connected||!g||g.session!==session)return;
  if(input?.type==='close'){if(g.status!=='result')p.stallCooldowns[g.stallId]=room.tick+5;p.mini=null;p.dx=p.dz=0;p.action='idle';return;}
  inputGame(g,input,room.tick);settleStall(room,p);
}
export function setInput(room,id,dx,dz){const p=room.players[id];if(!p||!p.connected||p.health<=0||room.paused||room.phase!=='playing')return;dx=Number(dx);dz=Number(dz);if(!Number.isFinite(dx)||!Number.isFinite(dz))return;const d=Math.max(1,Math.hypot(dx,dz));p.dx=Math.max(-1,Math.min(1,dx/d));p.dz=Math.max(-1,Math.min(1,dz/d));}
export function doAction(room,id,action,target){
  const p=room.players[id];if(!p?.connected||room.phase!=='playing'||room.paused||p.mini||p.health<=0)return;
  if((p.action==='arrive'||['drink','charm'].includes(action)&&(p.busyUntil||0)>room.tick)){event(room,id,'Finish your current action first.');return;}
  if(combatAction(room,p,action,target))return;
  if(action==='ping'){
    const wait=(p.pingUntil||0)-room.tick;
    if(wait>0){event(room,id,`You can call again in ${Math.ceil(wait)}s.`);return;}
    p.pingAt={x:p.x,z:p.z};p.pingUntil=room.tick+8;
    event(room,null,`${p.name} needs help! Look for the gold ring on your map.`,'ping',{fx:'ping',actor:id,at:p.pingAt});return;
  }
  if(action==='share'||action==='handoff'){
    const allies=Object.values(room.players).filter(a=>a.id!==id&&a.connected&&!a.mini&&distance(p,a)<3);
    const ally=target?allies.find(a=>a.id===target):allies.sort((a,b)=>distance(p,a)-distance(p,b))[0];
    if(!ally){event(room,id,target?'Your selected teammate must be connected and within 3 steps.':'Move close to a teammate first (within 3 steps).');return;}
    if(action==='share'){
      if(p.bottles<1){event(room,id,'You have no potion to share.');return;}
      if(ally.bottles>=3){event(room,id,`${ally.name} already has 3 potions.`);return;}
      p.bottles--;ally.bottles++;p.stats.potionsShared++;
      event(room,id,`Gave a potion to ${ally.name}.`,'potion',{fx:'pickup',actor:ally.id});event(room,ally.id,`${p.name} gave you a potion. Press Q to drink it.`);return;
    }
    const h=room.humans.filter(h=>h.owner===id&&distance(h,ally)<4).sort((a,b)=>distance(p,a)-distance(p,b))[0];
    if(!h){event(room,id,'Bring a following guest close to your teammate first.');return;}
    h.owner=ally.id;h.path=[];p.stats.handoffs++;
    event(room,id,`${ally.name} is now escorting ${h.name}. Their deliveries count toward the gate.`);event(room,ally.id,`${p.name} handed ${h.name} over to you. The original 5-second charm timer keeps running.`);return;
  }
  if(action==='jump'){
    if(p.height>0||p.jumpCooldown>0||['arrive','drink','charm'].includes(p.action))return;
    p.vy=6.2;p.jumpCooldown=.82;event(room,null,'','jump',{fx:'jump',actor:id});return;
  }
  if(action==='drink'){
    if(p.bottles<=0){event(room,id,'No potions left. Approach a glowing bottle and press E.');return;}
    if(p.energy>=99&&p.health>=4){event(room,id,'Your spirit and hearts are already full.');return;}
    p.bottles--;p.stats.potionsUsed++;p.energy=Math.min(100,p.energy+55);p.health=Math.min(4,p.health+1);p.action='drink';p.actionUntil=room.tick+1;p.busyUntil=p.actionUntil;event(room,id,'Potion used. Spirit restored and one heart healed.','potion',{fx:'drink',actor:id});return;
  }
  if(action==='cover'){
    if(p.coverCooldown>0){event(room,id,`Cover will be ready in ${Math.ceil(p.coverCooldown)}s.`);return;}p.cover=DISGUISE.cover;p.coverCooldown=12;if(!['drink','charm'].includes(p.action)){p.action='cover';p.actionUntil=room.tick+DISGUISE.cover;}event(room,id,'Talisman Ward! Block shadow attacks and hide nearby teammates for 5 seconds.','cover',{fx:'cover',actor:id});return;
  }
  if(action==='interact'){
    const stall=nearbyStall(p);
    if(stall){
      const wait=(p.stallCooldowns[stall.id]||0)-room.tick;
      if(wait>0){event(room,id,`${stall.name}: Try again in ${Math.ceil(wait)}s.`);return;}
      if(p.height>0||['arrive','drink','charm'].includes(p.action))return;
      const seq=++room.eventSeq;p.mini={...createGame(stall.game,seq*7919+Math.floor(room.tick*100),room.tick),stallId:stall.id,session:`${id}:${seq}`};p.dx=p.dz=0;p.facing=Math.PI;p.action='stall';return;
    }
    const potion=room.potions.filter(o=>o.available&&distance(p,o)<2).sort((a,b)=>distance(p,a)-distance(p,b))[0];
    if(potion){if(p.bottles>=3){event(room,id,'You can carry up to 3 potions.');return;}potion.available=false;potion.readyAt=room.tick+30;p.bottles++;p.stats.potionsCollected++;event(room,id,'Potion collected. Press Q to drink it.','potion',{fx:'pickup',actor:id,at:{x:potion.x,z:potion.z}});return;}
    const h=room.humans.filter(h=>h.state!=='delivered'&&distance(p,h)<2.5).sort((a,b)=>distance(p,a)-distance(p,b))[0];
    if(h){h.talkUntil=room.tick+4;event(room,id,`${h.name}: “I came for ${h.wish}… Do you know somewhere special?”`,'talk',{target:h.id});event(room,id,`Press F to show ${h.name} a magical vision.`);}
    else event(room,id,'Move closer to a potion, a guest, or a stall.');
    return;
  }
  if(action==='charm'){
    const candidates=room.humans.filter(h=>h.state!=='delivered'&&distance(p,h)<3&&!h.owner);
    const h=target?candidates.find(h=>h.id===target):candidates.sort((a,b)=>distance(p,a)-distance(p,b))[0];
    if(!h){event(room,id,'Move closer to a human who is not already charmed.');return;}
    if(p.energy<18){event(room,id,'Not enough spirit. Drink a potion first.');return;}
    p.energy-=18;p.stats.charmed++;p.action='charm';p.actionUntil=room.tick+.6;p.busyUntil=p.actionUntil;h.owner=id;h.charm=DISGUISE.charm;h.state='following';h.path=[];event(room,id,`${h.name} will follow for 5 seconds, then wait in place. Charm them again to continue.`,'charm',{fx:'charm',actor:id,target:h.id});
  }
}
function parkGuest(h){h.owner=null;h.state='waiting';h.charm=0;h.path=[];h.pathAt=0;}
function directClear(a,b){const d=distance(a,b),n=Math.ceil(d/.45);for(let i=1;i<=n;i++)if(!walkable(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n,.38))return false;return true;}
export function stepRoom(room,dt){
  if(room.phase==='countdown'){room.countdown=Math.max(0,room.countdown-dt);if(room.countdown<=0){room.phase='disguising';room.introRemaining=DISGUISE.intro;}return;}
  if(room.phase==='disguising'){room.introRemaining=Math.max(0,room.introRemaining-dt);if(room.introRemaining<=0)startRound(room,room.host);return;}
  if(room.phase!=='playing'||room.paused)return;room.tick+=dt;room.time=Math.max(0,room.time-dt);
  for(const p of Object.values(room.players)){
    p.ward=Math.max(0,p.ward-dt);p.speedBoost=Math.max(0,p.speedBoost-dt);
    if(p.mini){advanceGame(p.mini,room.tick);settleStall(room,p);if(p.mini.status==='result'&&room.tick-p.mini.endsAt>20)p.mini=null;}
    p.jumpCooldown=Math.max(0,p.jumpCooldown-dt);
    if(p.vy!==0||p.height>0){p.vy-=17*dt;p.height=Math.max(0,p.height+p.vy*dt);if(p.height===0&&p.vy<0){p.vy=0;event(room,null,'','land',{fx:'land',actor:p.id});}}
    if(!p.mini&&room.tick>p.actionUntil)p.action=p.health>0?'idle':'down';p.cover=Math.max(0,p.cover-dt);p.coverCooldown=Math.max(0,p.coverCooldown-dt);
    if(p.connected&&p.health>0&&!p.mini&&p.action!=='arrive'&&p.action!=='drink'&&p.action!=='charm'){
      const speed=3.6*(p.speedBoost>0?1.35:1),before={x:p.x,z:p.z};movePoint(p,p.dx*speed*dt,p.dz*speed*dt);p.stats.distanceWalked+=distance(p,before);if(Math.hypot(p.dx,p.dz)>.05&&!(p.action==='strike'&&room.tick<p.actionUntil)){p.facing=Math.atan2(p.dx,p.dz);if(p.cover<=0)p.action='walk';}
    }
    const followers=room.humans.filter(h=>h.owner===p.id&&h.state==='following').length;if(!p.mini||p.mini.status==='result')p.energy=Math.max(0,p.energy-followers*1.8*dt);
  }
  for(const p of Object.values(room.players)){
    if(room.tick>=p.nextRevealAt){
      const scheduled=p.nextRevealAt+Math.floor((room.tick-p.nextRevealAt)/DISGUISE.period)*DISGUISE.period;p.revealUntil=scheduled+DISGUISE.reveal;p.nextRevealAt=scheduled+DISGUISE.period;
      if(room.tick<p.revealUntil)event(room,p.id,`Your ${disguiseState(p,room.tick).part} is showing! Ask a teammate to cover you.`,'reveal',{fx:'reveal',actor:p.id});
    }
    if(Object.values(room.players).some(a=>a.id!==p.id&&a.connected&&a.cover>0&&distance(a,p)<DISGUISE.range))p.concealedUntil=room.tick+.15;
  }
  stepEncounter(room,dt);
  for(const potion of room.potions)if(!potion.available&&room.tick>=potion.readyAt)potion.available=true;
  for(const h of room.humans){
    if(h.state==='delivered')continue;
    if(h.owner){
      const p=room.players[h.owner];if(!p){parkGuest(h);continue;}
      h.charm=Math.max(0,h.charm-dt);
      if(h.charm<=1e-6){event(room,p.id,`${h.name} is waiting here. Charm them again when you are ready.`,'waiting');parkGuest(h);continue;}
      if(distance(h,WORLD.gate)<2.5&&distance(p,WORLD.gate)<4){h.state='delivered';h.owner=null;p.delivered++;event(room,p.id,`${h.name} reached the shrine. ${p.delivered}/3`,'delivered');if(p.delivered>=3&&room.phase==='playing'){room.phase='won';room.winner=p.id;room.winnerName=p.name;event(room,null,'The Spirit Gate is open!','won');}continue;}
      const i=room.humans.filter(o=>o.owner===p.id&&o.id<h.id).length;
      const atGate=distance(p,WORLD.gate)<4;
      const goal=atGate?WORLD.gate:{x:p.x-Math.sin(p.facing)*(1.3+i*.65),z:p.z-Math.cos(p.facing)*(1.3+i*.65)};
      if(distance(h,goal)>.35&&(atGate||distance(h,p)>1.15)){
        let dest=goal;
        if(!directClear(h,goal)){
          if(room.tick>h.pathAt||!h.path.length){h.path=findPath(h,p);h.pathAt=room.tick+1;}
          while(h.path.length&&distance(h,h.path[0])<.4)h.path.shift();if(h.path.length)dest=h.path[0];else dest=h;
        }else h.path=[];
        const d=distance(h,dest);if(d>.1){const sp=Math.min(d,3.35*(p.speedBoost>0?1.35:1)*dt);const dx=(dest.x-h.x)/d,dz=(dest.z-h.z)/d;movePoint(h,dx*sp,dz*sp);h.direction=Math.atan2(dx,dz);}
      }
    }else if(h.state==='wander'&&room.tick>h.talkUntil){
      const i=Number(h.id.slice(1)),goal={x:h.homeX+Math.sin(room.tick*.18+i)*1.6,z:h.homeZ+Math.cos(room.tick*.16+i)*1.3};const d=distance(h,goal);if(d>.15){const dx=(goal.x-h.x)/d,dz=(goal.z-h.z)/d;movePoint(h,dx*.5*dt,dz*.5*dt);h.direction=Math.atan2(dx,dz);}
    }
  }
  if(room.time<=0&&room.phase==='playing'){room.phase='lost';event(room,null,'The night is over. Ready to try again?','lost');}
  if(room.phase!=='playing')for(const p of Object.values(room.players))p.mini=null;
}
export function snapshot(room){return{code:room.code,mode:room.mode,phase:room.phase,introRemaining:room.introRemaining,round:room.round,countdown:room.countdown,paused:room.paused,host:room.host,time:room.time,tick:room.tick,encounter:room.encounter,lossReason:room.lossReason,winner:room.winner,winnerName:room.winnerName,players:room.players,humans:room.humans.map(({path,pathAt,...h})=>h),potions:room.potions,events:room.events};}
