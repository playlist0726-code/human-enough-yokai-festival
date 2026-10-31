import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {plantingPlan,buildFoliage,leafGeometry} from '../public/foliage.mjs';
import {STALLS,POTION_SPOTS,stallEntrance,walkable} from '../shared/world.mjs';

test('garden is deterministic and leaves gameplay lanes, stall entrances and bottles clear',()=>{
  const plan=plantingPlan();assert.deepEqual(plan,plantingPlan());assert.equal(plan.trees.length,30);
  assert.ok(plan.plants.length>700&&plan.plants.length<2600);
  for(const p of plan.plants){assert.ok(Math.abs(p.x)>=4.3);assert.ok(walkable(p.x,p.z,.85));for(const s of STALLS){const e=stallEntrance(s);assert.ok(Math.hypot(p.x-e.x,p.z-e.z)>=2.5);}for(const b of POTION_SPOTS)assert.ok(Math.hypot(p.x-b.x,p.z-b.z)>=.8);}
});
test('thousands of leaves and meadow plants fit five render batches with valid world bounds',()=>{
  const scene=new THREE.Scene(),garden=buildFoliage(scene);assert.equal(garden.root.children.length,5);assert.equal(garden.stats.leaves,5400);
  const bounds=new THREE.Box3().setFromObject(garden.root);assert.ok(bounds.max.y>6&&bounds.min.y>-.2);assert.ok(bounds.max.x<25&&bounds.min.x> -25);
  garden.update(100);let leaves=0;
  garden.root.traverse(n=>{if(!n.isMesh)return;const values=n.geometry.attributes.position.array;assert.ok([...values].every(Number.isFinite));if(n.isInstancedMesh){assert.ok(n.count<=n.instanceMatrix.count);assert.ok([...n.instanceMatrix.array].every(Number.isFinite));leaves+=n.count;}});assert.ok(leaves>7000);
  const leaf=leafGeometry(),box=new THREE.Box3().setFromBufferAttribute(leaf.attributes.position);assert.ok(box.max.z-box.min.z>.1);assert.ok(leaf.attributes.normal);const mid=4*9;assert.ok(leaf.attributes.normal.getX(mid)>.8,'leaf fronts face outwards');
});
