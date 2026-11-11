import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createEventBus} from '../public/events.mjs';
import {createFx,BUDGET,CAPACITY} from '../public/fx/index.mjs';
import {FX_MAP,TIERS} from '../public/fx/recipes.mjs';

// R10: every event the bus can emit has a visual recipe (or an explicit 'none'), recipes stay inside
// the particle budget, the mobile profile emits about half, and effects never touch game state.
const state={tick:10,players:{a:{id:'a',character:'mizu',x:0,z:4,height:0},b:{id:'b',character:'pon',x:2,z:4,height:0}},
  humans:[{id:'h1',x:1,z:7,state:'following',owner:'a'}],encounter:{x:0,z:-10}};
const sample=type=>({type,playerId:'a',position:{x:0,y:0,z:4},tick:10,local:true,guestId:'h1',reason:'expired',foot:'left',result:'won',combo:true,color:'#ffd79a',part:'water dish'});
const fakeCamera=()=>{const c=new THREE.PerspectiveCamera();c.position.set(0,6,14);return c;};
function make(profile){
  const scene=new THREE.Scene(),bus=createEventBus(),camera=fakeCamera();
  const pipeline={camera,render(){},flash(){}};
  const fx=createFx({scene,bus,pipeline,profile:()=>profile});fx.update(1/60,0,structuredClone(state));
  return {fx,bus,scene};
}
const sources=async()=>(await readFile(new URL('../public/events.mjs',import.meta.url),'utf8'));

test('every event-bus type has an FX recipe with a tier and a sound cue',async()=>{
  const text=await sources();
  const emitted=new Set([...text.matchAll(/type:'([a-z_]+)'/g)].map(m=>m[1]));
  for(const t of ['stall_win','stall_fail','firework'])emitted.add(t);
  for(const type of emitted){
    assert.ok(FX_MAP[type],`missing FX recipe for ${type}`);
    assert.ok(TIERS[FX_MAP[type].tier],`${type} has an unknown tier`);
    assert.match(FX_MAP[type].cue,/^[a-z_]+$/,`${type} needs a sound cue name`);
  }
});

test('each recipe spawns feedback within the particle budget and leaves game state untouched',()=>{
  for(const type of Object.keys(FX_MAP)){
    const {fx,bus}=make('high');const before=JSON.stringify(state);
    bus.emit(type,sample(type));
    for(let i=0;i<40;i++)fx.update(1/30,i/30,state);
    assert.equal(JSON.stringify(state),before,`${type} mutated game state`);
    assert.ok(fx.glow.count<=CAPACITY.glow&&fx.smoke.count<=CAPACITY.smoke,`${type} exceeded capacity`);
    const off=fx.glow.mesh.geometry.attributes.aOffset.array.slice(0,fx.glow.count*3);assert.ok(off.every(Number.isFinite),`${type} produced NaN particle positions`);
    if(FX_MAP[type].tier!=='none'&&type!=='round_start'&&type!=='firework')assert.ok(fx.played.includes(type),`${type} did not run`);
  }
});

test('mobile profile emits about half the particles of high',()=>{
  const count=profile=>{const {fx,bus}=make(profile);for(const t of ['potion_drink','reveal_start','guest_delivered','boss_banished','hit'])bus.emit(t,sample(t));fx.update(1/60,.02,state);return fx.glow.count+fx.smoke.count;};
  const hi=count('high'),mo=count('mobile');
  assert.ok(hi>60,`high spawned ${hi}`);assert.ok(mo<=hi*.65&&mo>=hi*.35,`mobile ${mo} vs high ${hi}`);
  assert.equal(BUDGET.mobile,.5);
});

test('particles all render in two draw calls and expire',()=>{
  const {fx,bus,scene}=make('high');bus.emit('boss_banished',sample('boss_banished'));
  const pools=scene.children.filter(o=>o.name?.startsWith('fx-'));assert.equal(pools.length,2);
  for(let i=0;i<200;i++)fx.update(1/30,i/30,state);
  assert.equal(fx.smoke.count,0);assert.equal(fx.meshes.live.length,0);
});

test('camera shake only offsets the camera during render and restores it',()=>{
  const scene=new THREE.Scene(),bus=createEventBus(),camera=fakeCamera();let seen=null;
  const pipeline={camera,render(){seen=camera.position.clone();},flash(){}};
  const fx=createFx({scene,bus,pipeline,profile:()=>'high'});fx.update(1/60,0,state);
  fx.feel.shake(.8);fx.update(1/60,.1,state);const rest=camera.position.clone();pipeline.render(true);
  assert.ok(seen.distanceTo(rest)>0,'shake should move the camera while rendering');
  assert.equal(camera.position.distanceTo(rest),0,'camera must be restored after render');
});
