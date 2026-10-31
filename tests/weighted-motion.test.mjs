import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {animateBlenderModel} from '../public/model-assets.mjs';

// Decode the production geometry/skins in Node; image decoding is browser-only.
async function geometryOnly(key){
 const b=readFileSync(new URL(`../public/assets/models/${key}.glb`,import.meta.url)),length=b.readUInt32LE(12),g=JSON.parse(b.toString('utf8',20,20+length));
 delete g.materials;delete g.images;delete g.textures;for(const m of g.meshes)for(const p of m.primitives)delete p.material;
 const json=Buffer.from(JSON.stringify(g)),pad=Buffer.alloc((4-json.length%4)%4,32),bin=b.subarray(20+length),out=Buffer.alloc(20+json.length+pad.length+bin.length);
 b.copy(out,0,0,12);out.writeUInt32LE(out.length,8);out.writeUInt32LE(json.length+pad.length,12);out.write('JSON',16);json.copy(out,20);pad.copy(out,20+json.length);bin.copy(out,20+json.length+pad.length);
 return (await new GLTFLoader().parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.length),'')).scene;
}
function rigFor(scene){
 const bones={},rest=new Map();scene.traverse(n=>{if(n.isBone){bones[n.name.split('__').at(-1)]=n;rest.set(n,{q:n.quaternion.clone(),p:n.position.clone(),s:n.scale.clone()});}});
 return {character:'kon',motion:1,gaitPhase:1,phase:0,blenderModel:{bones,rest,eyes:[],wrapper:scene}};
}
test('production weighted clothes deform, secondary joints remain bounded, and cloned players have separate skeletons',async()=>{
 for(const key of ['mizu_yokai','kon_yokai','nemu_yokai','pon_human','guest-0_guest']){
  const scene=await geometryOnly(key),other=clone(scene),r=rigFor(scene),r2=rigFor(other);
  assert.notEqual(r.blenderModel.bones.hem_L,r2.blenderModel.bones.hem_L);
  let cloth;scene.traverse(n=>{if(n.isSkinnedMesh&&/yukata/i.test(n.name))cloth=n;});assert.ok(cloth,key);
  scene.updateMatrixWorld(true);const points=[];for(let i=0;i<cloth.geometry.attributes.position.count;i++)points.push(cloth.getVertexPosition(i,new THREE.Vector3()).clone());
  let deformation=0;
  for(const action of ['idle','drink','charm'])for(const phase of [0,1,2,4]){
   r.gaitPhase=phase;animateBlenderModel(r,{action},1.7);scene.updateMatrixWorld(true);
   for(let i=0;i<points.length;i++)deformation=Math.max(deformation,cloth.getVertexPosition(i,new THREE.Vector3()).distanceTo(points[i]));
   scene.traverse(n=>{if(n.isSkinnedMesh)n.computeBoundingBox();});const box=new THREE.Box3().setFromObject(scene);
   assert.ok(box.min.toArray().every(Number.isFinite)&&box.max.toArray().every(Number.isFinite),key);assert.ok(box.getSize(new THREE.Vector3()).length()<8,key+' must not explode under action poses');
  }
  assert.ok(deformation>.01,key+' has visible weighted movement');assert.ok(r2.blenderModel.bones.hem_L.quaternion.angleTo(r2.blenderModel.rest.get(r2.blenderModel.bones.hem_L).q)<1e-7);
 }
});
