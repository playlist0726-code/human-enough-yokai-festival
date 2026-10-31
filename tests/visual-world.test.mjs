import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WORLD,STALLS,POTION_SPOTS,groundHeight,walkable,findPath,stallEntrance} from '../shared/world.mjs';
import {createAvatar,animateAvatar} from '../public/avatar.mjs';
import {createVisitor,animateVisitor} from '../public/visitors.mjs';
import {viewMovement} from '../public/controls.mjs';

test('rotating the view preserves screen-relative controls and input magnitude',()=>{
  const eastFacing=viewMovement(0,-1,Math.PI/2);assert.ok(Math.abs(eastFacing.dx+1)<1e-9);assert.ok(Math.abs(eastFacing.dz)<1e-9);
  const backFacing=viewMovement(1,0,Math.PI);assert.ok(Math.abs(backFacing.dx+1)<1e-9);assert.ok(Math.abs(backFacing.dz)<1e-9);
  for(const angle of [0,.2,Math.PI/4,Math.PI,Math.PI*1.7]){const p=viewMovement(.3,-.7,angle);assert.ok(Math.abs(Math.hypot(p.dx,p.dz)-Math.hypot(.3,-.7))<1e-9);}
});

test('sloped festival preserves reachable entrances, potions and the summit',()=>{
  assert.ok(groundHeight(WORLD.gate.x,WORLD.gate.z)-groundHeight(WORLD.start.x,WORLD.start.z)>3);
  for(const destination of [...STALLS.map(stallEntrance),...POTION_SPOTS,WORLD.gate]){
    assert.ok(walkable(destination.x,destination.z),JSON.stringify(destination));
    const path=findPath(WORLD.start,destination);assert.ok(path.length>0);
    for(const point of path){assert.ok(walkable(point.x,point.z,.4));assert.ok(Number.isFinite(groundHeight(point.x,point.z)));}
  }
  assert.equal(walkable(-16,-9),false);
  const acrossPond=findPath({x:-16,z:-14},{x:-16,z:-4});assert.ok(acrossPond.length>0);
  assert.ok(acrossPond.every(p=>walkable(p.x,p.z,.4)));
});

test('mesh batching leaves eyes attached and blink animation reversible',()=>{
  for(const id of ['mizu','pon','kon','sumi','nemu','akari','kasa']){
    const r=createAvatar(id),p={action:'idle',facing:0,cover:0};assert.ok(r.eyes.length>0);
    const time=(4.7-r.phase+.08)%4.7;
    animateAvatar(r,p,.1,time,4);
    for(const eye of r.eyes){assert.ok(eye.scale.y<.15);assert.ok(r.root.getObjectById(eye.id));}
    animateAvatar(r,p,.1,time+.3,4);
    for(const eye of r.eyes){assert.equal(eye.scale.y,1);assert.ok(eye.userData.iris.parent===eye);}
    const box=new THREE.Box3().setFromObject(r.root);assert.ok(Number.isFinite(box.max.y));
  }
  const human=createVisitor(3);animateVisitor(human,{x:0,z:0,direction:0},.1,5.1-3*.46+.085);
  assert.ok(human.eyes.every(e=>e.scale.y<.15&&human.root.getObjectById(e.id)));
  animateVisitor(human,{x:0,z:0,direction:0},.1,5.1-3*.46+.4);assert.ok(human.eyes.every(e=>e.scale.y===1));
});

test('walking settles naturally when a stall locks movement',()=>{
  const r=createAvatar('mizu');for(let i=0;i<10;i++){animateAvatar(r,{dx:1,action:'walk'},.1,.2+i*.1,5);if(Math.abs(r.legs[0].rotation.x)>.2)break;}
  const before=Math.abs(r.legs[0].rotation.x);assert.ok(before>.1);
  for(let i=0;i<10;i++)animateAvatar(r,{dx:1,action:'stall',mini:{phase:'playing'}},.1,.2,5);
  assert.ok(Math.abs(r.legs[0].rotation.x)<before*.01);
});
