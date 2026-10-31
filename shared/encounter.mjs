import {WORLD,distance,walkable,movePoint} from './world.mjs';
import {disguiseState} from './disguise.mjs';

export const COMBAT={firstArrival:45,omen:3,health:4,boltCost:3,boltCooldown:.68,boltRange:17,exposed:9,sealTime:1.15,sealRange:2.25,reviveRange:2.3,invulnerability:1.5};
export const freshCombat=()=>({health:COMBAT.health,hurtUntil:0,downUntil:0,strikeUntil:0,sealing:null,combatStats:{hits:0,wards:0,seals:0,revives:0}});
export const createEncounter=()=>({phase:'quiet',nextAt:COMBAT.firstArrival,until:0,wave:0,hp:0,maxHp:0,x:0,z:0,seals:[],minions:[],hazards:[],attackAt:0,attackCount:0,seq:0,banished:0,combo:0,lastStrike:0,lastActor:null,rescueAt:0});
const active=room=>Object.values(room.players).filter(p=>p.connected&&!p.mini&&p.health>0);
const emit=(room,player,text,type='combat',extra={})=>{room.events.push({id:++room.eventSeq,player,text,type,...extra});if(room.events.length>32)room.events.shift();};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function clearSpot(x,z){
 for(const [dx,dz]of [[0,0],[1.6,0],[-1.6,0],[0,1.6],[0,-1.6],[3,0],[-3,0],[0,3],[0,-3]])if(walkable(x+dx,z+dz,.6))return {x:x+dx,z:z+dz};
 return {x:0,z:clamp(z,-32,16)};
}
function sealsFor(e){return Array.from({length:e.sealCount},(_,i)=>{const a=i/e.sealCount*Math.PI*2;return {id:`seal-${e.wave}-${i}`,index:i,...clearSpot(e.x+Math.cos(a)*4,e.z+Math.sin(a)*3.6),broken:false};});}
function arrive(room){
 const e=room.encounter,crew=active(room);if(!crew.length)return false;
 const target=crew.find(p=>room.humans.some(h=>h.owner===p.id))||crew[0],spot=clearSpot(clamp(target.x,-3,3),clamp(target.z-7,-27,9));
 Object.assign(e,{phase:'omen',until:room.tick+COMBAT.omen,wave:e.wave+1,...spot,maxHp:66+crew.length*18,hp:66+crew.length*18,sealCount:crew.length>1?3:2,hazards:[],minions:[],attackCount:0,combo:0,lastActor:null,rescueAt:0});e.seals=sealsFor(e);
 emit(room,null,'The Demon King is watching. Break the cursed seals, then strike his crystal!','omen',{fx:'omen'});return true;
}
function shielded(room,p){return p.ward>0||Object.values(room.players).some(a=>a.connected&&!a.mini&&a.health>0&&a.cover>0&&distance(a,p)<3.2);}
function hurt(room,p,source){
 if(!p.connected||p.mini||p.health<=0||p.hurtUntil>room.tick)return;
 if(shielded(room,p)){p.hurtUntil=room.tick+.45;p.combatStats.wards++;emit(room,p.id,'Ward held! Your crew is safe.','guard',{fx:'blocked',actor:p.id});return;}
 p.health=Math.max(0,p.health-1);p.energy=Math.max(0,p.energy-8);p.hurtUntil=room.tick+COMBAT.invulnerability;p.sealing=null;
 // A hit scatters followers without deleting any guest or delivery progress.
 for(const h of room.humans)if(h.owner===p.id)Object.assign(h,{owner:null,state:'waiting',charm:0,path:[],pathAt:0});
 if(!p.health){p.downUntil=room.tick+8;p.action='down';p.dx=p.dz=0;emit(room,null,`${p.name} is sealed! A teammate can press E nearby to rescue them.`,'down',{fx:'hit',actor:p.id});}
 else emit(room,p.id,`${source}! ${p.health} hearts left. Move out of the warning or use C Ward.`,'hurt',{fx:'hit',actor:p.id});
}
function restore(room,p,rescuer){
 p.health=3;p.downUntil=0;p.hurtUntil=room.tick+3;p.energy=Math.max(38,p.energy);p.bottles=Math.max(1,p.bottles);p.action='idle';p.actionUntil=0;p.busyUntil=0;
 if(rescuer){rescuer.combatStats.revives++;emit(room,null,`${rescuer.name} rescued ${p.name}!`,'revive',{fx:'revive',actor:p.id});}
 else emit(room,p.id,'Your talisman brought you back. Keep moving!','revive',{fx:'revive',actor:p.id});
}
export function combatAction(room,p,action,target){
 const e=room.encounter;if(!e)return false;
 if(p.health<=0)return true;
 if(action==='strike'){
  if(room.tick<p.strikeUntil||p.busyUntil>room.tick)return true;
  const minion=e.minions.filter(m=>m.hp>0&&distance(p,m)<COMBAT.boltRange).sort((a,b)=>distance(p,a)-distance(p,b))[0];
  const boss=e.phase==='exposed'&&distance(p,e)<COMBAT.boltRange;
  if(!minion&&!boss){emit(room,p.id,e.phase==='assault'||e.phase==='omen'?'His shield is closed. Press E at the cursed seals first.':'No shadow in range. Save your spirit.');return true;}
  if(p.energy<COMBAT.boltCost){emit(room,p.id,'Low spirit. Drink Q, collect a potion, or win a stall prize.');return true;}
  p.strikeUntil=room.tick+COMBAT.boltCooldown;p.energy-=COMBAT.boltCost;p.action='strike';p.actionUntil=room.tick+.28;p.combatStats.hits++;
  const enemy=minion||e,damage=minion?30:14;p.facing=Math.atan2(enemy.x-p.x,enemy.z-p.z);e.combo=room.tick-e.lastStrike<2.3?Math.min(5,e.combo+1):1;
  const teamStrike=!minion&&e.lastActor&&e.lastActor!==p.id&&room.tick-e.lastStrike<2.3;e.lastStrike=room.tick;e.lastActor=p.id;
  enemy.hp=Math.max(0,enemy.hp-damage-(teamStrike?7:0));
  emit(room,null,teamStrike?'Team combo! Crystal shattered further.':'','bolt',{fx:'bolt',actor:p.id,from:{x:p.x,z:p.z},at:{x:enemy.x,z:enemy.z},boss:!minion,combo:teamStrike});
  if(minion&&minion.hp<=0)p.energy=Math.min(100,p.energy+5);
  if(e.hp<=0&&e.phase==='exposed'){
   e.phase='banished';e.until=room.tick+5;e.nextAt=room.tick+64;e.banished++;e.hazards=[];e.minions=[];
   room.time=Math.min(WORLD.duration,room.time+20);
   for(const ally of Object.values(room.players)){if(!ally.connected)continue;if(ally.health<=0)restore(room,ally);ally.health=Math.min(COMBAT.health,ally.health+1);ally.energy=Math.min(100,ally.energy+30);ally.bottles=Math.min(3,ally.bottles+1);ally.ward=Math.max(ally.ward,12);ally.speedBoost=Math.max(ally.speedBoost,9);}
   emit(room,null,'Demon King banished! +20 seconds, potions and a protected sprint to the shrine.','banished',{fx:'bossDown',at:{x:e.x,z:e.z}});
  }
  return true;
 }
 if(action!=='interact')return false;
 if(p.busyUntil>room.tick)return true;
 const ally=Object.values(room.players).filter(a=>a.id!==p.id&&a.connected&&a.health<=0&&distance(p,a)<COMBAT.reviveRange).sort((a,b)=>distance(p,a)-distance(p,b))[0];
 if(ally){restore(room,ally,p);return true;}
 if(e.phase!=='assault')return false;
 const seal=e.seals.filter(s=>!s.broken&&(!target||s.id===target)&&distance(p,s)<COMBAT.sealRange).sort((a,b)=>distance(p,a)-distance(p,b))[0];
 if(!seal)return false;
 if(!p.sealing){p.sealing={id:seal.id,endsAt:room.tick+COMBAT.sealTime};emit(room,p.id,'Unbinding the seal… stay close. Ask a teammate for C Ward.');}
 return true;
}
function scheduleAttack(room){
 const e=room.encounter,crew=active(room);if(!crew.length)return;
 const revealed=crew.filter(p=>disguiseState(p,room.tick).revealed),escorts=crew.filter(p=>room.humans.some(h=>h.owner===p.id)),priority=revealed.length?revealed:escorts.length?escorts:crew;
 const target=priority[e.attackCount%priority.length];
 e.attackCount++;const rage=room.time<90||e.wave>1,warning=rage?1.35:1.8;
 if(e.attackCount%3===0){e.hazards.push({id:++e.seq,kind:'wave',x:e.x,z:e.z,radius:0,startsAt:room.tick+warning,endsAt:room.tick+warning+2.7});emit(room,null,'Shockwave! Jump over the purple ring or stand inside C Ward.','warning');}
 else {
  const targets=e.attackCount%2===0?crew:[target];for(const p of targets)e.hazards.push({id:++e.seq,kind:'burst',x:p.x,z:p.z,radius:rage?2.35:2,startsAt:room.tick+warning,endsAt:room.tick+warning+.55,resolved:false});
 }
 if(e.attackCount%4===1&&e.minions.filter(m=>m.hp>0).length<Math.min(3,crew.length+1)){
  const spot=clearSpot(e.x+(e.attackCount%2?2.6:-2.6),e.z+2);e.minions.push({id:`shadow-${++e.seq}`,hp:30,...spot,hitAt:room.tick+1.5});
 }
 e.attackAt=room.tick+(rage?3.6:4.8);
}
export function stepEncounter(room,dt){
 const e=room.encounter;if(!e)return;
 const crew=Object.values(room.players).filter(p=>p.connected),playing=active(room);
 for(const p of crew){
  if(p.health<=0&&room.tick>=p.downUntil)restore(room,p);
  if(p.sealing){const seal=e.seals.find(s=>s.id===p.sealing.id);
   if(e.phase!=='assault'||!seal||seal.broken||p.mini||p.health<=0||distance(p,seal)>=COMBAT.sealRange)p.sealing=null;
   else if(room.tick>=p.sealing.endsAt){seal.broken=true;p.sealing=null;p.combatStats.seals++;p.energy=Math.min(100,p.energy+8);emit(room,null,`${p.name} broke a cursed seal!`,'seal',{fx:'seal',actor:p.id,at:{x:seal.x,z:seal.z}});}
  }
 }
 if(e.phase==='quiet'&&room.tick>=e.nextAt){arrive(room);return;}
 if(e.phase==='banished'){if(room.tick>=e.until)e.phase='quiet';return;}
 if(e.phase==='omen'&&room.tick>=e.until){e.phase='assault';e.attackAt=room.tick+1;emit(room,null,'Break the purple seals with E. Then J Spirit bolt when the crystal opens!','combat');}
 if(e.phase==='assault'&&e.seals.length>0&&e.seals.every(s=>s.broken)){e.phase='exposed';e.until=room.tick+COMBAT.exposed;e.hazards=[];emit(room,null,'Crystal exposed! J Spirit bolt — alternate shots with your crew for bonus damage!','exposed');}
 if(e.phase==='exposed'&&room.tick>=e.until){e.phase='assault';e.seals=sealsFor(e);e.attackAt=room.tick+1;e.combo=0;emit(room,null,'His shield returned. Break the seals again; the damage you dealt remains.','combat');}
 if(e.phase==='assault'&&room.tick>=e.attackAt)scheduleAttack(room);
 for(const h of e.hazards){
  if(room.tick<h.startsAt)continue;
  if(h.kind==='burst'&&!h.resolved){h.resolved=true;for(const p of active(room))if(distance(p,h)<h.radius&&p.height<.5)hurt(room,p,'Shadow burst');}
  if(h.kind==='wave'){
   const radius=(room.tick-h.startsAt)*5.8;h.radius=radius;
   for(const p of active(room))if(Math.abs(distance(p,h)-radius)<.65&&p.height<.5)hurt(room,p,'Shockwave');
  }
 }
 e.hazards=e.hazards.filter(h=>room.tick<h.endsAt);e.minions=e.minions.filter(m=>m.hp>0);
 for(const m of e.minions){
  const target=active(room).sort((a,b)=>distance(m,a)-distance(m,b))[0];if(!target)continue;
  const d=distance(m,target);if(d>1){const v=Math.min(d,1.4*dt);movePoint(m,(target.x-m.x)/d*v,(target.z-m.z)/d*v);}
  if(d<1.2&&room.tick>=m.hitAt){m.hitAt=room.tick+2.5;hurt(room,target,'Shadow mask');}
 }
 // Solo reforms automatically. Co-op has a short last-chance rescue window before a wipe.
 if(crew.length>1&&crew.every(p=>p.health<=0)){e.rescueAt||=room.tick+4;if(room.tick>=e.rescueAt){room.phase='lost';room.lossReason='The Demon King sealed your whole crew. Stay near a ward and rescue fallen friends with E.';emit(room,null,room.lossReason,'lost');}}
 else e.rescueAt=0;
}
