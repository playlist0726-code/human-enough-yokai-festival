import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,addPlayer,removePlayer,startRound,setInput,doAction,stepRoom} from '../shared/simulation.mjs';
import {walkable,findPath,WORLD} from '../shared/world.mjs';
const room=()=>{const r=createRoom('TEST2',{combat:false});addPlayer(r,'a','A','mizu');startRound(r,'a');stepRoom(r,2.1);return r;};
test('four distinct characters, duplicate selection rejected',()=>{
  const r=createRoom('TEST2');addPlayer(r,'a','A','mizu');
  assert.throws(()=>addPlayer(r,'b','B','mizu'));
  for(const [id,char]of [['b','pon'],['c','kon'],['d','sumi']])addPlayer(r,id,id,char);
  assert.throws(()=>addPlayer(r,'e','E','nemu'));assert.equal(Object.keys(r.players).length,4);
  startRound(r,'a');const positions=Object.values(r.players).map(p=>p.x);
  assert.ok(Math.abs(positions.reduce((sum,x)=>sum+x,0))<.001);
  assert.ok(positions.slice(1).every((x,i)=>x-positions[i]>=2.5));
});
test('only host starts; invalid input cannot teleport or cross a stall',()=>{
  const r=room();assert.equal(startRound(r,'stranger'),false);const p=r.players.a;
  setInput(r,'a',Infinity,0);assert.equal(p.dx,0);
  setInput(r,'a',100,100);assert.ok(Math.hypot(p.dx,p.dz)<=1.00001);
  Object.assign(p,{x:-8,z:11.2});setInput(r,'a',0,-1);for(let i=0;i<60;i++)stepRoom(r,.05);
  assert.ok(p.z>11.05);assert.ok(walkable(p.x,p.z));
});
test('one potion is consumed once even when two players collect together',()=>{
  const r=room();addPlayer(r,'b','B','pon');const potion=r.potions[0];
  for(const p of Object.values(r.players))Object.assign(p,{x:potion.x,z:potion.z});
  doAction(r,'a','interact');doAction(r,'b','interact');
  assert.equal(r.players.a.bottles,2);assert.equal(r.players.b.bottles,1);assert.equal(potion.available,false);
  for(let i=0;i<601;i++)stepRoom(r,.05);assert.equal(potion.available,true);
});
test('charm requires proximity, energy, and an unclaimed human',()=>{
  const r=room(),p=r.players.a,h=r.humans[0];doAction(r,'a','charm',h.id);assert.equal(h.owner,null);
  Object.assign(p,{x:h.x,z:h.z,energy:17});doAction(r,'a','charm',h.id);assert.equal(h.owner,null);
  p.energy=70;doAction(r,'a','charm',h.id);assert.equal(h.owner,'a');assert.equal(p.energy,52);
  addPlayer(r,'b','B','pon');Object.assign(r.players.b,{x:h.x,z:h.z});doAction(r,'b','charm',h.id);assert.equal(h.owner,'a');
});
test('charm has a fixed five-second window, even with zero energy and Cover',()=>{
  const r=room(),p=r.players.a,h=r.humans[0];Object.assign(p,{x:h.x,z:h.z});doAction(r,'a','charm',h.id);p.energy=0;
  doAction(r,'a','cover');for(let i=0;i<80;i++)stepRoom(r,.05);assert.equal(h.owner,'a');assert.ok(h.charm>.9&&h.charm<1.1);
  for(let i=0;i<190;i++)stepRoom(r,.05);assert.equal(h.owner,null);
});
test('team total of three is insufficient; one player must deliver three',()=>{
  const r=room();addPlayer(r,'b','B','pon');
  for(const p of Object.values(r.players))Object.assign(p,{x:WORLD.gate.x,z:WORLD.gate.z});
  for(let i=0;i<3;i++)Object.assign(r.humans[i],{x:0,z:-30,owner:i===2?'b':'a',state:'following',charm:8});
  stepRoom(r,.05);assert.equal(r.players.a.delivered,2);assert.equal(r.players.b.delivered,1);assert.equal(r.phase,'playing');
  Object.assign(r.humans[3],{x:0,z:-30,owner:'a',state:'following',charm:8});stepRoom(r,.05);assert.equal(r.phase,'won');assert.equal(r.winner,'a');
});
test('human path goes around a stall; disconnected owner releases followers',()=>{
  const path=findPath({x:-8,z:12},{x:-8,z:5});assert.ok(path.length>0);assert.ok(path.every(p=>walkable(p.x,p.z,.4)));
  const r=room();addPlayer(r,'b','B','pon');r.humans[0].owner='a';r.humans[0].state='following';removePlayer(r,'a');assert.equal(r.host,'b');assert.equal(r.humans[0].owner,null);
});
test('repeated five-second charms can relay a waiting guest to the summit with potions',()=>{
  const r=room(),p=r.players.a,h=r.humans[8];Object.assign(p,{x:0,z:12,energy:100});Object.assign(h,{x:0,z:12});
  for(let i=0;i<1800&&h.state!=='delivered';i++){
    if(p.energy<20&&p.action==='idle'){p.bottles=1;doAction(r,'a','drink');}
    if(!h.owner){const d=Math.hypot(p.x-h.x,p.z-h.z);if(d<2.8){setInput(r,'a',0,0);doAction(r,'a','charm',h.id);}else setInput(r,'a',(h.x-p.x)/d,(h.z-p.z)/d);}
    else setInput(r,'a',0,p.z>-30?-1:0);
    stepRoom(r,.05);
  }
  assert.equal(h.state,'delivered');assert.equal(p.delivered,1);assert.ok(p.stats.charmed>=3);
});
test('every successful action publishes its effect; invalid attempts explain the reason',()=>{
  const r=room(),p=r.players.a;
  doAction(r,'a','interact');assert.ok(r.events.at(-1).text.includes('closer'));
  doAction(r,'a','drink');assert.equal(r.events.at(-1).fx,'drink');assert.equal(r.events.at(-1).actor,'a');
  stepRoom(r,1.1);doAction(r,'a','drink');assert.ok(r.events.at(-1).text.includes('No potions'));
  Object.assign(p,{x:r.potions[0].x,z:r.potions[0].z});doAction(r,'a','interact');assert.equal(r.events.at(-1).fx,'pickup');assert.deepEqual(r.events.at(-1).at,{x:p.x,z:p.z});
  const h=r.humans[0];Object.assign(p,{x:h.x,z:h.z});doAction(r,'a','charm',h.id);assert.equal(r.events.at(-1).fx,'charm');assert.equal(r.events.at(-1).target,h.id);
  doAction(r,'a','cover');assert.equal(r.events.at(-1).fx,'cover');doAction(r,'a','cover');assert.ok(r.events.at(-1).text.includes('ready in'));
});
test('jump rises and lands on the server, refuses midair jumps and keeps collision',()=>{
  const r=room(),p=r.players.a;Object.assign(p,{x:-8,z:11.25});
  doAction(r,'a','jump');assert.equal(p.vy,6.2);assert.equal(r.events.at(-1).fx,'jump');
  stepRoom(r,.1);assert.ok(p.height>0);const velocity=p.vy;
  doAction(r,'a','jump');assert.equal(p.vy,velocity);
  setInput(r,'a',0,-1);let apex=p.height;for(let i=0;i<20;i++){stepRoom(r,.05);apex=Math.max(apex,p.height);assert.ok(walkable(p.x,p.z));}
  assert.ok(apex>.8);assert.equal(p.height,0);assert.equal(p.vy,0);assert.ok(r.events.some(e=>e.fx==='land'));
  doAction(r,'a','jump');assert.equal(p.vy,6.2);r.phase='lost';startRound(r,'a');assert.equal(p.height,0);assert.equal(p.vy,0);
  doAction(r,'a','jump');assert.equal(p.vy,0,'arrival cannot jump');
});
