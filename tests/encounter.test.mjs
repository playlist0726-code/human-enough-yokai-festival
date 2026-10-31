import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,addPlayer,startRound,stepRoom,doAction,setInput,setPaused,setConnected,snapshot} from '../shared/simulation.mjs';
import {COMBAT,stepEncounter} from '../shared/encounter.mjs';
import {walkable,distance} from '../shared/world.mjs';
const advance=(r,seconds)=>{for(let i=0;i<Math.round(seconds/.05);i++)stepRoom(r,.05);};
function setup(count=1,mode='festival'){
 const r=createRoom('BOSS2',{mode});for(let i=0;i<count;i++)addPlayer(r,String(i),`Player ${i}`,['mizu','pon','kon','sumi'][i]);startRound(r,'0');advance(r,1);return r;
}
function assault(r){advance(r,COMBAT.firstArrival+COMBAT.omen+.2-r.tick);return r.encounter;}
function burst(r,p,extra={}){r.encounter.phase='assault';r.encounter.attackAt=r.tick+100;r.encounter.hazards.push({id:++r.encounter.seq,kind:'burst',x:p.x,z:p.z,radius:2,startsAt:r.tick+.1,endsAt:r.tick+1,resolved:false,...extra});}

test('director grants a grace period, spawns valid seals, scales health to crew and restarts cleanly',()=>{
 const r=setup(3);advance(r,COMBAT.firstArrival-3);assert.equal(r.encounter.phase,'quiet');advance(r,2.1);assert.equal(r.encounter.phase,'omen');assert.equal(r.encounter.seals.length,3);assert.ok(r.encounter.seals.every(s=>walkable(s.x,s.z,.6)));assert.equal(r.encounter.maxHp,120);advance(r,3.1);assert.equal(r.encounter.phase,'assault');
 const state=snapshot(r);assert.equal(state.encounter,r.encounter);r.phase='lost';startRound(r,'0');assert.equal(r.encounter.phase,'quiet');assert.equal(r.encounter.banished,0);assert.equal(r.players['0'].health,4);
 const drill=setup(1,'boss');advance(drill,3.1);assert.equal(drill.encounter.phase,'omen');
});
test('ground warnings lock their position, hit once and can be dodged by moving or jumping',()=>{
 const r=setup(),p=r.players['0'];burst(r,p);advance(r,.15);assert.equal(p.health,3);advance(r,.5);assert.equal(p.health,3);
 advance(r,1.5);burst(r,p);doAction(r,'0','jump');advance(r,.15);assert.ok(p.height>.5);assert.equal(p.health,3);
 advance(r,1);burst(r,p);p.x+=3;advance(r,.15);assert.equal(p.health,3);
});
test('Cover is the trailer talisman shield for self and nearby allies; it does not extend charm',()=>{
 const r=setup(2),p=r.players['0'],b=r.players['1'],h=r.humans[0];Object.assign(p,{x:0,z:5});Object.assign(b,{x:1,z:5});Object.assign(h,{x:1,z:5});doAction(r,'1','charm',h.id);
 doAction(r,'0','cover');burst(r,b);advance(r,.15);assert.equal(b.health,4);assert.ok(b.combatStats.wards>0);assert.ok(h.charm<5);advance(r,5);assert.equal(h.owner,null);
 p.cover=0;p.ward=0;b.ward=0;b.hurtUntil=0;burst(r,b);advance(r,.15);assert.equal(b.health,3);
});
test('a hit parks the escorted guest without losing deliveries, and potions heal a full-spirit injured player',()=>{
 const r=setup(),p=r.players['0'],h=r.humans[0];p.delivered=1;Object.assign(h,{owner:p.id,state:'following',charm:5,x:p.x,z:p.z});burst(r,p);advance(r,.15);assert.equal(h.owner,null);assert.equal(h.state,'waiting');assert.equal(p.delivered,1);
 p.energy=100;doAction(r,p.id,'drink');assert.equal(p.health,4);assert.equal(p.bottles,0);
});
test('seal channels require proximity, survive a ward and cancel when leaving range',()=>{
 const r=setup(),e=assault(r),p=r.players['0'],seal=e.seals[0];e.attackAt=r.tick+100;e.minions=[];e.hazards=[];
 Object.assign(p,{x:seal.x,z:seal.z});doAction(r,p.id,'interact');assert.equal(p.sealing.id,seal.id);p.x+=4;advance(r,1.2);assert.equal(p.sealing,null);assert.equal(seal.broken,false);
 Object.assign(p,{x:seal.x,z:seal.z});doAction(r,p.id,'interact');advance(r,1.2);assert.equal(seal.broken,true);assert.equal(p.combatStats.seals,1);
});
test('Spirit bolt obeys energy, range, server cooldown and closed crystal shield',()=>{
 const r=setup(),e=assault(r),p=r.players['0'];e.minions=[];e.hazards=[];Object.assign(p,{x:e.x,z:e.z+4});const health=e.hp,energy=p.energy;doAction(r,p.id,'strike');assert.equal(e.hp,health);assert.equal(p.energy,energy);
 e.phase='exposed';e.until=r.tick+9;doAction(r,p.id,'strike');assert.equal(e.hp,health-14);assert.equal(p.energy,energy-3);doAction(r,p.id,'strike');assert.equal(e.hp,health-14);
 advance(r,.75);p.energy=2;doAction(r,p.id,'strike');assert.equal(e.hp,health-14);p.energy=100;p.x=20;p.z=20;doAction(r,p.id,'strike');assert.equal(e.hp,health-14);
});
test('alternating teammates earn a combo, boss victory grants the escort rewards and safe breathing room',()=>{
 const r=setup(2),e=assault(r),a=r.players['0'],b=r.players['1'];e.phase='exposed';e.until=r.tick+9;e.minions=[];e.hazards=[];Object.assign(a,{x:e.x,z:e.z+3});Object.assign(b,{x:e.x+1,z:e.z+3});
 const hp=e.hp;doAction(r,a.id,'strike');doAction(r,b.id,'strike');assert.equal(e.hp,hp-14-21);assert.ok(r.events.some(ev=>ev.combo===true));
 e.hp=14;advance(r,.75);const time=r.time;doAction(r,a.id,'strike');assert.equal(e.phase,'banished');assert.equal(e.banished,1);assert.ok(r.time>=time+19.9);assert.ok(a.ward>=12&&b.ward>=12);assert.equal(a.bottles,2);assert.ok(a.speedBoost>0);advance(r,6);assert.equal(e.phase,'quiet');assert.ok(e.nextAt>r.tick);
});
test('a shield can return but damage persists; last-second shots cannot damage an invulnerable crystal',()=>{
 const r=setup(),e=assault(r),p=r.players['0'];Object.assign(p,{x:e.x,z:e.z+3});e.minions=[];e.hazards=[];e.phase='exposed';e.until=r.tick+.2;const hp=e.hp;doAction(r,p.id,'strike');advance(r,.3);assert.equal(e.phase,'assault');assert.equal(e.hp,hp-14);assert.ok(e.seals.every(s=>!s.broken));
});
test('nearby teammates rescue a sealed player; solo reforms and co-op wipe has an explicit reason',()=>{
 const r=setup(2),p=r.players['0'],b=r.players['1'];Object.assign(p,{health:0,downUntil:r.tick+8,x:0,z:5});Object.assign(b,{x:1,z:5});doAction(r,b.id,'interact');assert.equal(p.health,3);assert.equal(b.combatStats.revives,1);assert.ok(p.hurtUntil>r.tick);
 Object.assign(p,{health:0,downUntil:r.tick+8});Object.assign(b,{health:0,downUntil:r.tick+8});advance(r,4.2);assert.equal(r.phase,'lost');assert.match(r.lossReason,/whole crew/);
 const solo=setup();Object.assign(solo.players['0'],{health:0,downUntil:solo.tick+1});setInput(solo,'0',1,0);assert.equal(solo.players['0'].dx,0);advance(solo,1.2);assert.equal(solo.players['0'].health,3);assert.equal(solo.phase,'playing');
});
test('menus pause solo hazards; booth players and disconnected players cannot take offscreen damage',()=>{
 const r=setup(),p=r.players['0'];burst(r,p);setPaused(r,p.id,true);const old=JSON.stringify(r);advance(r,4);assert.equal(JSON.stringify(r),old);setPaused(r,p.id,false);
 p.mini={status:'ready',session:'test',kind:'fish',startedAt:r.tick,endsAt:r.tick+20,settled:false}; // Direct encounter stepping isolates booth immunity from minigame rules.
 r.tick+=.2;const hp=p.health;stepEncounter(r,.2);assert.equal(p.health,hp);p.mini=null;
 // A disconnected player must also be protected and must not block a future encounter.
 setConnected(r,p.id,false);p.mini=null;advance(r,.2);assert.equal(p.health,hp);
});

test('the king singles out a revealed disguise and attacks follow server-side aiming',()=>{
 const r=setup(2),e=assault(r),a=r.players['0'],b=r.players['1'];Object.assign(a,{revealUntil:0});Object.assign(b,{revealUntil:r.tick+5,concealedUntil:0});e.attackCount=0;e.attackAt=r.tick;e.minions=[];e.hazards=[];stepRoom(r,.05);assert.equal(e.hazards[0].x,b.x);assert.equal(e.hazards[0].z,b.z);
 e.minions=[];e.phase='exposed';e.until=r.tick+9;Object.assign(a,{x:e.x+3,z:e.z+3});doAction(r,a.id,'strike');assert.ok(Math.abs(a.facing-Math.atan2(e.x-a.x,e.z-a.z))<1e-8);
});
