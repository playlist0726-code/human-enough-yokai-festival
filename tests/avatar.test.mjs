import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAvatar,animateAvatar} from '../public/avatar.mjs';
import {createVisitor,animateVisitor} from '../public/visitors.mjs';
import {createPotion} from '../public/renderkit.mjs';
test('all seven characters have actual depth and shadow-casting meshes',()=>{
  for(const id of ['mizu','pon','kon','sumi','nemu','akari','kasa']){
    const rig=createAvatar(id),bounds=new THREE.Box3().setFromObject(rig.root),size=bounds.getSize(new THREE.Vector3());
    assert.ok(size.z>.7,`${id} needs real volume`);assert.ok(size.y>1.8);let surfaces=0;
    rig.root.traverse(n=>{assert.ok(!n.isSprite);if(n.isMesh){surfaces++;if(!n.material.transparent)assert.ok(n.castShadow);for(const v of n.geometry.attributes.position.array)assert.ok(Number.isFinite(v));}});
    assert.ok(surfaces>12);
  }
});
test('walking animates legs and turns the whole model, drinking raises a bottle',()=>{
  const r=createAvatar('mizu');animateAvatar(r,{dx:1,dz:0,facing:Math.PI/2,action:'walk',cover:0},.1,.15,4);
  assert.ok(r.root.rotation.y>.5);for(let j=0;j<5;j++)animateAvatar(r,{dx:1,dz:0,facing:Math.PI/2,action:'walk',cover:0},.05,.2+j*.05,4);assert.ok(Math.abs(r.legs[0].rotation.x)>.1);assert.ok(r.legs[0].rotation.x*r.legs[1].rotation.x<0);
  animateAvatar(r,{dx:0,dz:0,facing:0,action:'drink',cover:0},.1,.2,4);assert.ok(r.bottle.visible);assert.ok(r.arms[1].rotation.x<-1);
  animateAvatar(r,{dx:0,dz:0,facing:0,action:'idle',cover:0},.1,.3,5);assert.ok(!r.bottle.visible);
});
test('human visitors have paired legs and animated arms, potion glass surrounds liquid',()=>{
  for(let i=0;i<9;i++){
    const r=createVisitor(i);assert.equal(r.root.userData.human,true);assert.equal(r.legs.length,2);assert.equal(r.arms.length,2);
    animateVisitor(r,{x:0,z:0,direction:0,owner:null},.1,.1);animateVisitor(r,{x:.08,z:0,direction:1,owner:'a'},.1,.18);
    assert.ok(r.root.rotation.y>0);let peak=0;for(let j=0;j<20;j++){animateVisitor(r,{x:.16+j*.08,z:0,direction:1,owner:'a'},.05,.23+j*.05);peak=Math.max(peak,Math.abs(r.legs[0].rotation.x));}assert.ok(peak>.1);
  }
  const potion=createPotion();let glass=0,liquid=0;
  potion.traverse(n=>{if(n.isMesh){if(n.material.isMeshPhysicalMaterial&&n.material.transparent)glass++;if(n.material.emissiveIntensity>.5)liquid++;}});
  assert.ok(glass>=2);assert.ok(liquid>0);
  const r=createAvatar('mizu');animateAvatar(r,{height:1,action:'walk',facing:0,cover:0},.1,.2,4);assert.ok(r.root.position.y>.8);
});
