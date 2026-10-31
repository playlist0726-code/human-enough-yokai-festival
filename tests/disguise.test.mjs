import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {DISGUISE,disguiseState} from '../shared/disguise.mjs';
import {createRoom,addPlayer,startRound,beginCountdown,stepRoom,doAction,setInput,setConnected,setReady,setPaused,removePlayer,snapshot} from '../shared/simulation.mjs';
import {createPlayerAvatar,animatePlayerAvatar} from '../public/disguise.mjs';
const ids=['mizu','pon','kon','sumi','nemu','akari','kasa'];
function setup(){const r=createRoom('GUISE',{combat:false});addPlayer(r,'a','A','mizu');addPlayer(r,'b','B','pon');startRound(r,'a');stepRoom(r,2.1);return r;}
function advance(r,seconds){const count=Math.round(seconds/.05);for(let i=0;i<count;i++)stepRoom(r,.05);}
function render(r,p,t,options={}){animatePlayerAvatar(r,{dx:0,dz:0,action:'idle',facing:0,height:0,cover:0,...p},1/60,t,t,{x:0,z:0},options);r.root.updateMatrixWorld(true);}

test('crew transforms before entry, with the festival clock and actions stopped; reconnect cancels safely',()=>{
  const r=createRoom('GUISE');addPlayer(r,'a','A','mizu');addPlayer(r,'b','B','pon');setReady(r,'b',true);assert.equal(beginCountdown(r,'a'),true);stepRoom(r,3.1);
  assert.equal(r.phase,'disguising');assert.equal(snapshot(r).introRemaining,DISGUISE.intro);const energy=r.players.a.energy,x=r.players.a.x;
  doAction(r,'a','drink');setInput(r,'a',1,0);stepRoom(r,2);assert.equal(r.time,480);assert.equal(r.players.a.energy,energy);assert.equal(r.players.a.x,x);assert.equal(r.phase,'disguising');
  setConnected(r,'b',false);assert.equal(r.phase,'lobby');assert.equal(r.introRemaining,0);
  setConnected(r,'b',true);setReady(r,'b',true);beginCountdown(r,'a');stepRoom(r,3.1);stepRoom(r,DISGUISE.intro+.1);assert.equal(r.phase,'playing');assert.equal(r.round,1);assert.equal(r.players.a.nextRevealAt,15);
});
test('features reveal for five seconds every fifteen seconds and all timers respect solo pause',()=>{
  const r=setup(),p=r.players.a;advance(r,12.85);assert.equal(disguiseState(p,r.tick).revealed,false);advance(r,.1);assert.equal(disguiseState(p,r.tick).revealed,true);assert.equal(p.nextRevealAt,30);
  advance(r,5);assert.equal(disguiseState(p,r.tick).revealed,false);advance(r,10);assert.equal(disguiseState(p,r.tick).revealed,true);
  removePlayer(r,'b');setPaused(r,'a',true);const before=JSON.stringify(r);stepRoom(r,30);assert.equal(JSON.stringify(r),before);
});
test('Cover hides nearby teammates, cannot hide yourself, and never resets the reveal schedule',()=>{
  const r=setup(),a=r.players.a,b=r.players.b;Object.assign(a,{x:0,z:14});Object.assign(b,{x:1,z:14});advance(r,13);assert.equal(disguiseState(a,r.tick).revealed,true);
  doAction(r,'a','cover');stepRoom(r,.05);assert.equal(disguiseState(b,r.tick).revealed,false);assert.equal(disguiseState(b,r.tick).concealed,true);assert.equal(disguiseState(a,r.tick).revealed,true);assert.equal(b.nextRevealAt,30);
  b.x=10;advance(r,.25);assert.equal(disguiseState(b,r.tick).revealed,true);b.ward=2;assert.equal(disguiseState(b,r.tick).revealed,false);
});
test('charms end after five seconds regardless of energy, proximity, Cover, ward or a booth',()=>{
  const r=setup(),p=r.players.a,h=r.humans[0];Object.assign(p,{x:h.x,z:h.z,energy:100,ward:30});doAction(r,'a','charm',h.id);assert.equal(h.charm,5);advance(r,1);doAction(r,'a','cover');advance(r,3.9);assert.equal(h.owner,'a');advance(r,.1);assert.equal(h.owner,null);assert.equal(h.state,'waiting');
  const end={x:h.x,z:h.z};advance(r,60);assert.deepEqual({x:h.x,z:h.z},end);
  Object.assign(r.players.b,{x:h.x,z:h.z});doAction(r,'b','charm',h.id);assert.equal(h.owner,'b');assert.equal(h.charm,5);
});
test('handoffs preserve remaining charm time and a departed owner leaves the guest parked',()=>{
  const r=setup(),p=r.players.a,b=r.players.b,h=r.humans[0];Object.assign(p,{x:0,z:14});Object.assign(b,{x:1,z:14});Object.assign(h,{x:0,z:14});doAction(r,'a','charm',h.id);advance(r,2);const remaining=h.charm;doAction(r,'a','handoff','b');assert.equal(h.owner,'b');assert.equal(h.charm,remaining);removePlayer(r,'b');assert.equal(h.state,'waiting');assert.equal(h.owner,null);
});
test('every selected yokai has a complete human guise and only its own partial feature can show',()=>{
  for(const id of ids){const r=createPlayerAvatar(id);assert.ok(r.parts.length>0,id);render(r,{character:id},0);assert.equal(r.human.root.visible,true);assert.equal(r.yokai.root.visible,false);assert.ok(r.parts.every(p=>!p.visible));
    for(let i=0;i<30;i++)render(r,{character:id,nextRevealAt:30,revealUntil:20},15+i/60);
    assert.equal(r.appearance,'human');assert.equal(r.yokai.root.visible,false);assert.ok(r.parts.every(p=>p.visible));assert.equal(r.root.userData.revealed,true);
    const bounds=new THREE.Box3().setFromObject(r.root);assert.ok(bounds.max.y<6&&Number.isFinite(bounds.min.x),id);
    for(let i=0;i<30;i++)render(r,{character:id,revealUntil:20,concealedUntil:21},16+i/60);
    assert.ok(r.parts.every(p=>!p.visible),id);assert.equal(r.root.userData.revealed,false);
    r.root.traverse(n=>assert.ok(n.matrixWorld.elements.every(Number.isFinite),id));
  }
});
test('the same rig switches from full yokai to human during the entrance transformation',()=>{
  const r=createPlayerAvatar('nemu');render(r,{character:'nemu'},0,{form:'transform',progress:.1});assert.equal(r.yokai.root.visible,true);assert.equal(r.human.root.visible,false);
  render(r,{character:'nemu'},1,{form:'transform',progress:.7});assert.equal(r.yokai.root.visible,false);assert.equal(r.human.root.visible,true);assert.ok(r.parts.every(p=>!p.visible));
  const meshes=[];r.parts.forEach(p=>p.traverse(n=>{if(n.isSkinnedMesh)meshes.push(n);}));assert.ok(meshes.length);assert.notEqual(meshes[0].skeleton.bones[0],r.yokai.tailSpine.bones[0]);
});
test('Cover does not interrupt drinking, and large clock steps retain the current reveal window',()=>{
  const r=setup(),p=r.players.a;doAction(r,'a','drink');doAction(r,'a','cover');assert.equal(p.action,'drink');assert.ok(p.cover>0);stepRoom(r,30);assert.equal(disguiseState(p,r.tick).revealed,true);assert.equal(p.nextRevealAt,45);
});
