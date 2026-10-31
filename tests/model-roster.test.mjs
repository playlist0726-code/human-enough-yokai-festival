import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import {FestivalCamera,CAMERA_LIMITS} from '../public/free-camera.mjs';
import {animateBlenderModel} from '../public/model-assets.mjs';
const base=new URL('../',import.meta.url);
test('all 23 Blender sources and self-contained GLBs exist, with real meshes and articulated nodes',()=>{
 const manifest=JSON.parse(readFileSync(new URL('public/assets/models/manifest.json',base)));assert.equal(manifest.models.length,23);
 for(const asset of manifest.models){
  assert.equal(asset.ok,true,asset.key);assert.ok(existsSync(new URL(`art/characters/roster-v02/${asset.source}`,base)),asset.source);
  const b=readFileSync(new URL('public'+asset.url,base));assert.equal(b.toString('utf8',0,4),'glTF');assert.equal(b.readUInt32LE(8),b.length);
  const g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));assert.ok(g.meshes.length>10,asset.key);assert.ok(g.nodes.some(n=>n.name?.endsWith('__head')),asset.key);
  for(const image of g.images||[])assert.ok(image.bufferView!==undefined,'textures must be embedded');
 }
});
test('free camera can see the zenith, clamps pitch and zoom, and keeps finite poses',()=>{
 const cam=new THREE.PerspectiveCamera(),rig=new FestivalCamera(cam);rig.drag(350,-1000);rig.zoom(-10000);
 assert.equal(rig.pitch,CAMERA_LIMITS.minPitch);assert.equal(rig.distance,CAMERA_LIMITS.minDistance);
 let state;for(let i=0;i<80;i++)state=rig.update(new THREE.Vector3(0,0,16),1/60);
 assert.equal(state.sky,true);assert.ok(cam.getWorldDirection(new THREE.Vector3()).y>.8);assert.ok(cam.position.y>.35);assert.ok(cam.matrixWorld.elements.every(Number.isFinite));
 rig.drag(0,10000);rig.zoom(10000);assert.equal(rig.pitch,CAMERA_LIMITS.maxPitch);assert.equal(rig.distance,CAMERA_LIMITS.maxDistance);
});
test('camera retracts in front of booths instead of entering the roof',()=>{
 const cam=new THREE.PerspectiveCamera(),rig=new FestivalCamera(cam);rig.yaw=Math.PI;rig.smoothYaw=Math.PI;rig.pitch=.05;rig.smoothPitch=.05;
 const state=rig.update(new THREE.Vector3(8,0,12),1/60);assert.equal(state.obstructed,true);assert.ok(state.distance<rig.distance);
});
test('loaded articulation resets to its authored rest pose and actions affect the actual bones',()=>{
 const bones={},rest=new Map();for(const role of ['body','head','leg_L','leg_R','arm_L','arm_R','tail']){const n=new THREE.Bone();bones[role]=n;rest.set(n,{q:n.quaternion.clone(),p:n.position.clone(),s:n.scale.clone()});}
 const r={character:'mizu',motion:1,gaitPhase:1,phase:0,blenderModel:{bones,rest,eyes:[],wrapper:new THREE.Group()}};
 animateBlenderModel(r,{action:'idle'},1);assert.ok(bones.leg_L.rotation.x*bones.leg_R.rotation.x<0);
 animateBlenderModel(r,{action:'drink'},1);assert.ok(bones.arm_R.rotation.x<-1);r.motion=0;animateBlenderModel(r,{action:'idle'},2);assert.ok(Math.abs(bones.leg_L.rotation.x)<1e-8);
});
