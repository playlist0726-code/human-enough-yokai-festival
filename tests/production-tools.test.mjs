import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import * as THREE from 'three';
import {makeContractGlb} from './fixtures/make-contract-glb.mjs';
import {frameStats,estimateGpuMemory} from '../public/perf-overlay.mjs';

const root=new URL('../',import.meta.url).pathname,fixture=path.join(root,'tests/fixtures/minimal_player.glb');
function validate(file,profile='player'){
  try{return {code:0,report:JSON.parse(execFileSync(process.execPath,[path.join(root,'tools/validate-glb.mjs'),file,'--profile',profile,'--json'],{encoding:'utf8'}))};}
  catch(error){return {code:error.status,report:JSON.parse(error.stdout)};}
}
function temp(name,buffer){const dir=mkdtempSync(path.join(tmpdir(),'glb-'));const file=path.join(dir,name);writeFileSync(file,buffer);return file;}
const failed=report=>report.results.filter(r=>!r.ok&&r.severity==='error').map(r=>r.name);

test('validate-glb passes the committed contract fixture for player and disguise',()=>{
  assert.deepEqual(readFileSync(fixture),makeContractGlb(),'fixture is up to date with its generator');
  for(const profile of ['player','disguise']){const {code,report}=validate(fixture,profile);assert.equal(code,0,JSON.stringify(failed(report)));assert.equal(report.pass,true);assert.equal(report.errors,0);}
});

test('validate-glb names each broken rule',()=>{
  let r=validate(temp('a.glb',makeContractGlb({omitBones:['LeftForeArm']})));assert.equal(r.code,1);assert.deepEqual(failed(r.report),['humanoid bones']);
  r=validate(temp('b.glb',makeContractGlb({omitClips:['drink_potion']})));assert.deepEqual(failed(r.report),['animation clips']);
  r=validate(temp('c.glb',makeContractGlb({omitSockets:['socket_reveal']})),'disguise');assert.deepEqual(failed(r.report),['socket socket_reveal']);
  r=validate(temp('d.glb',makeContractGlb()),'guest');assert.ok(failed(r.report).includes('animation clips'),'guest clips are different');
  r=validate(temp('e.glb',makeContractGlb({boneNamePrefix:'mixamorig:'})));assert.equal(r.code,0,'auto-rig prefixes are tolerated');
});

test('v2 build step compresses in place, keeps the contract, and is idempotent',async t=>{
  let build;try{await import('@gltf-transform/core');build=await import('../scripts/build-production.mjs');}catch{t.skip('dev dependencies not installed');return;}
  const dir=mkdtempSync(path.join(tmpdir(),'v2-')),file=path.join(dir,'mizu_yokai.glb');copyFileSync(fixture,file);
  const log=[],first=await build.compressV2({dirs:[dir],log:m=>log.push(m)});
  assert.equal(first.compressed,1);
  const json=build.glbJson(readFileSync(file));assert.ok(json.extensionsUsed.includes('EXT_meshopt_compression'));
  const {code,report}=validate(file);assert.equal(code,0,JSON.stringify(failed(report)));
  assert.ok(json.nodes.some(n=>n.name==='socket_hand_R'),'empty socket nodes survive pruning');
  const second=await build.compressV2({dirs:[dir],log:m=>log.push(m)});assert.equal(second.compressed,0);
});

test('perf overlay maths: average FPS, 1% low, GPU memory estimate',()=>{
  const times=[...Array(99).fill(1/60),1/10];const s=frameStats(times);
  assert.ok(Math.abs(s.fps-100/(99/60+.1))<1e-9);assert.equal(Math.round(s.low1),10);assert.deepEqual(frameStats([]),{fps:0,low1:0,frames:0});
  const scene=new THREE.Scene(),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(30),3));
  const tex=new THREE.DataTexture(new Uint8Array(64*64*4),64,64);tex.generateMipmaps=false;tex.minFilter=THREE.LinearFilter;
  scene.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:tex})),new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:tex})));
  assert.deepEqual(estimateGpuMemory(scene),{geometry:120,texture:64*64*4,total:120+64*64*4},'shared geometry and textures count once');
});
