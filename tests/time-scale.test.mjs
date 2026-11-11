import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createTimeScale,MAX_HITSTOP} from '../public/time-scale.mjs';
import {createEventBus} from '../public/events.mjs';
import {createFx} from '../public/fx/index.mjs';

// REMASTER-HOOK hq: hit-stop scales animation dt only.
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('time scale passes real dt through, freezes for a hit-stop, then resumes',()=>{
  const ts=createTimeScale();near(ts.step(.016),.016);assert.equal(ts.scale,1);
  ts.hitstop(.05);assert.equal(ts.stopped,true);assert.equal(ts.scale,0);
  near(ts.step(.02),0);near(ts.step(.02),0);near(ts.step(.02),.01);   // 0.05 s frozen, remainder of the frame runs
  assert.equal(ts.stopped,false);near(ts.step(.016),.016);
  ts.hitstop(.1,.5);near(ts.step(.04),.02);ts.hitstop(.01);near(ts.step(.06),.03);near(ts.step(.01),.01);   // a shorter stop never cuts a longer one
  ts.hitstop(99);let frozen=0;while(ts.stopped){ts.step(.01);frozen+=.01;}assert.ok(frozen<=MAX_HITSTOP+.011,'hit-stop is capped');
  ts.set(.5);near(ts.step(.02),.01);ts.set(7);near(ts.step(.02),.02);ts.reset();near(ts.step(NaN),0);near(ts.step(-1),0);
});

test('game.js applies the scale to animation dt only: network, input and FPS timing stay on real time',async()=>{
  const src=await readFile(new URL('../public/game.js',import.meta.url),'utf8');
  assert.match(src,/dt=timeScale\.step\(frameDt\)/);
  assert.match(src,/freeCamera\.update\(local\.group\.position,frameDt\)/);
  assert.match(src,/fx\.update\(dt,elapsed,state,frameDt\)/);
  assert.match(src,/perf\.frame\(realDt\)/);assert.match(src,/sampleTime\+=realDt/);
  const uses=[...src.matchAll(/timeScale\b[^\n]{0,40}/g)].map(m=>m[0]);
  for(const line of src.split('\n').filter(l=>/transport\.|send\(|stateReceivedAt=/.test(l)&&!/function animate|requestAnimationFrame/.test(l)))assert.doesNotMatch(line,/timeScale/);
  assert.ok(uses.length>=4);
  for(const file of ['../server.mjs','../shared/simulation.mjs','../public/connection.mjs'])assert.doesNotMatch(await readFile(new URL(file,import.meta.url),'utf8'),/timeScale|time-scale/);
});

test('a local hit triggers a short hit-stop; shake and flash still advance on real time; remote hits do not stop time',()=>{
  const scene=new THREE.Scene(),bus=createEventBus(),camera=new THREE.PerspectiveCamera(),timeScale=createTimeScale();
  const fx=createFx({scene,bus,pipeline:{camera,render(){},flash(){}},profile:()=>'high',timeScale});
  const state={tick:1,players:{a:{id:'a',character:'mizu',x:0,z:0,height:0}},humans:[],encounter:null};fx.update(1/60,0,state);
  const hit=local=>bus.emit('hit',{playerId:'a',position:{x:0,y:0,z:0},tick:1,local});
  hit(false);assert.equal(timeScale.stopped,false);
  hit(true);assert.equal(timeScale.stopped,true);const trauma=fx.feel.trauma;assert.ok(trauma>0);
  const dt=timeScale.step(1/60);assert.equal(dt,0);fx.update(dt,0,state,1/60);
  assert.ok(fx.feel.trauma<trauma,'shake decays on real time during the freeze');
  for(let i=0;i<10;i++)timeScale.step(1/60);assert.equal(timeScale.stopped,false);
});
