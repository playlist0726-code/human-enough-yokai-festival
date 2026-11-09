import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {makeContractGlb} from './fixtures/make-contract-glb.mjs';
import {validateDef,normalizeDef,loadDefs,rigMode,selectBaseClip,selectUpperClip,resolveClip,locomotionScale,upperBodyClip,createV2Rig,createRigFactory,DEFAULTS,PLAYER_CLIPS} from '../public/characters/rig-v2.mjs';

const DEF={id:'mizu',version:2,forms:{yokai:'/assets/models/v2/mizu_yokai.glb',human:'/assets/models/v2/mizu_human.glb'}};
async function parse(options={}){const b=makeContractGlb({texture:false,...options});return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.length),'');}
async function rig(options){return createV2Rig(DEF,{yokai:await parse(options),human:await parse(options)});}
const idle={action:'idle',facing:0,height:0,vy:0,health:4,cover:0};
// move the rig along x at `speed` units/s for `seconds`
function drive(r,p,{speed=0,seconds=.6,options={}}={}){let x=r.lastPosition?.x||0;const dt=1/30;for(let t=0;t<seconds;t+=dt){x+=speed*dt;r.update(p,dt,t,10,{x,z:0},options);}}
const action=(r,name,form='human')=>{const f=r.forms[form],clip=f.player.mixer._actions.find(a=>a.getClip().name===name);return clip;};

test('def validation, defaults and the legacy URL switch',()=>{
  assert.deepEqual(validateDef(DEF),[]);
  assert.ok(validateDef({...DEF,version:1}).length);
  assert.ok(validateDef({...DEF,forms:{}}).length);
  assert.ok(validateDef({...DEF,forms:{yokai:'x.png'}}).length);
  assert.ok(validateDef({...DEF,gait:{walkSpeed:-1}}).length);
  assert.ok(validateDef({...DEF,gait:{stride:1}}).length,'unknown gait keys are rejected');
  const n=normalizeDef({...DEF,gait:{walkSpeed:3}});assert.equal(n.gait.walkSpeed,3);assert.equal(n.gait.runSpeed,DEFAULTS.gait.runSpeed);assert.equal(n.height.yokai,2.85);assert.equal(n.crossfade,.2);
  assert.equal(rigMode('?rig=legacy'),'legacy');assert.equal(rigMode('?perf=1'),'auto');
});

test('loadDefs keeps valid defs, skips broken ones, and does nothing in legacy mode',async()=>{
  const files={'/characters/defs/index.json':{characters:['mizu','kon','pon']},'/characters/defs/mizu.json':DEF,'/characters/defs/kon.json':{...DEF,id:'fox'}};
  const calls=[],warnings=[],log={warn:m=>warnings.push(m)};
  const fetch=async url=>{calls.push(url);return files[url]?{ok:true,json:async()=>files[url]}:{ok:false,status:404};};
  const defs=await loadDefs({fetch,mode:'auto',log});
  assert.deepEqual([...defs.keys()],['mizu']);assert.equal(warnings.length,2);
  assert.equal(defs.get('mizu').gait.walkSpeed,DEFAULTS.gait.walkSpeed);
  calls.length=0;assert.equal((await loadDefs({fetch,mode:'legacy',log})).size,0);assert.equal(calls.length,0);
  assert.equal((await loadDefs({fetch:async()=>{throw Error('offline');},mode:'auto',log})).size,0,'no index -> everyone legacy');
});

test('clip selection follows the server snapshot with sensible priorities',()=>{
  const ctx={speed:0,tick:10,gait:DEFAULTS.gait,form:'human'};
  assert.equal(selectBaseClip(idle,ctx),'idle');
  assert.equal(selectBaseClip(idle,{...ctx,speed:3.6}),'walk');
  assert.equal(selectBaseClip(idle,{...ctx,speed:4.86}),'run');
  assert.equal(selectBaseClip({...idle,height:.4,vy:3},ctx),'jump_start');
  assert.equal(selectBaseClip({...idle,height:.4,vy:-2},ctx),'jump_air');
  assert.equal(selectBaseClip(idle,{...ctx,justLanded:true}),'land');
  assert.equal(selectBaseClip(idle,{...ctx,revealAge:.2}),'reveal_panic');
  assert.equal(selectBaseClip(idle,{...ctx,revealAge:.2,form:'yokai'}),'idle','only the human disguise panics');
  assert.equal(selectBaseClip({...idle,hurtUntil:10.3},ctx),'hit');
  assert.equal(selectBaseClip({...idle,health:0,height:1},ctx),'sealed');
  assert.equal(selectBaseClip({...idle,action:'down'},ctx),'sealed');
  assert.equal(selectBaseClip(idle,{...ctx,phase:'won'}),'victory');
  assert.equal(selectUpperClip({action:'drink'}),'drink_potion');assert.equal(selectUpperClip({action:'charm'}),'charm_cast');assert.equal(selectUpperClip({action:'cover'}),'cover_ward');assert.equal(selectUpperClip({action:'idle'}),null);
});

test('missing clips fall back, walk speed scales with ground speed, upper clips drop leg tracks',()=>{
  assert.equal(resolveClip('run',new Set(['walk','idle'])),'walk');
  assert.equal(resolveClip('jump_start',new Set(['idle'])),'idle');
  assert.equal(resolveClip('drink_potion',new Set(['idle'])),null);
  assert.equal(locomotionScale('walk',3.6),1);assert.equal(locomotionScale('walk',2.7),.75);
  assert.equal(locomotionScale('walk',.5),DEFAULTS.gait.minScale);assert.equal(locomotionScale('walk',20),DEFAULTS.gait.maxScale);
  assert.equal(locomotionScale('idle',3),1);assert.equal(locomotionScale('run',4.86),1);
  const clip=new THREE.AnimationClip('drink_potion',1,[new THREE.QuaternionKeyframeTrack('Hips.quaternion',[0,1],[0,0,0,1,0,0,0,1]),new THREE.QuaternionKeyframeTrack('LeftLeg.quaternion',[0,1],[0,0,0,1,0,0,0,1]),new THREE.QuaternionKeyframeTrack('RightArm.quaternion',[0,1],[0,0,0,1,0,0,0,1])]);
  assert.deepEqual(upperBodyClip(clip).tracks.map(t=>t.name),['RightArm.quaternion']);
});

test('contract GLB plays through the v2 rig: scale, forms, crossfade, speed sync, layers, sockets',async()=>{
  const r=await rig();
  assert.equal(r.kind,'v2');assert.equal(r.root.userData.motionVersion,'rig-v2');
  for(const form of ['yokai','human']){const f=r.forms[form];assert.deepEqual([...f.player.available].sort(),[...PLAYER_CLIPS].sort());}
  r.root.updateMatrixWorld(true);
  r.forms.human.holder.visible=true;const box=new THREE.Box3().setFromObject(r.forms.human.holder);
  assert.ok(Math.abs(box.max.y-box.min.y-2.55)<.02,`human form normalised to 2.55, got ${(box.max.y-box.min.y).toFixed(3)}`);assert.ok(Math.abs(box.min.y)<.02,'feet on the ground');
  drive(r,idle,{seconds:.5});assert.equal(r.clip.base,'idle');assert.equal(r.appearance,'human');
  // start walking: idle fades out while walk fades in
  r.update(idle,1/30,0,10,{x:r.lastPosition.x+.12,z:0});
  drive(r,idle,{speed:3.6,seconds:.1});
  assert.equal(r.clip.base,'walk');
  const wIdle=action(r,'idle').getEffectiveWeight(),wWalk=action(r,'walk').getEffectiveWeight();
  assert.ok(wIdle>0&&wIdle<1&&wWalk>0&&wWalk<1,`crossfading (idle ${wIdle.toFixed(2)}, walk ${wWalk.toFixed(2)})`);
  drive(r,idle,{speed:3.6,seconds:1});assert.ok(Math.abs(action(r,'walk').timeScale-1)<.05,'walk plays at 1x at the reference speed');
  drive(r,idle,{speed:2.7,seconds:1});assert.ok(Math.abs(action(r,'walk').timeScale-.75)<.05,'and slows down with the player');
  // upper-body layer on top of walking legs
  drive(r,{...idle,action:'drink'},{speed:3.6,seconds:.3});
  assert.equal(r.clip.base,'walk');assert.equal(r.clip.upper,'drink_potion');
  const upper=r.forms.human.player.mixer._actions.find(a=>a.getClip().name==='drink_potion__upper');
  assert.ok(upper&&!upper.getClip().tracks.some(t=>/^Hips\.|Leg\./.test(t.name)));
  drive(r,idle,{speed:3.6,seconds:.4});assert.equal(r.clip.upper,null);
  // jump -> air -> land, and sealed overrides everything
  drive(r,{...idle,height:.5,vy:4},{seconds:.1});assert.equal(r.clip.base,'jump_start');
  drive(r,{...idle,height:.5,vy:-3},{seconds:1.2});assert.equal(r.clip.base,'jump_air');
  drive(r,idle,{seconds:.05});assert.equal(r.clip.base,'land');
  drive(r,{...idle,health:0},{seconds:.1});assert.equal(r.clip.base,'sealed');
  // transformation picks the form by progress
  drive(r,idle,{seconds:.1,options:{form:'transform',progress:.3}});assert.equal(r.appearance,'yokai');assert.ok(r.forms.yokai.holder.visible&&!r.forms.human.holder.visible);
  drive(r,idle,{seconds:.1,options:{form:'transform',progress:.9}});assert.equal(r.appearance,'human');
  // sockets
  const potion=new THREE.Object3D();assert.equal(r.attach('socket_hand_R',potion),true);assert.equal(potion.parent.name,'socket_hand_R');
  assert.equal(r.attach('socket_missing',new THREE.Object3D()),false);
  assert.ok(r.socket('socket_reveal'),'disguise socket present');
});

test('a GLB missing optional clips still animates through fallbacks',async()=>{
  const r=await rig({omitClips:['run','jump_start','land','sealed']});
  drive(r,idle,{speed:6,seconds:.5});assert.equal(r.clip.base,'walk');
  drive(r,{...idle,height:.5,vy:4},{seconds:.1});assert.equal(r.clip.base,'jump_air');
  drive(r,{...idle,health:0},{seconds:.5});assert.equal(r.clip.base,'idle');assert.ok(r.root.rotation.z>.1,'no sealed clip: legacy tilt is used instead');
});

test('rig factory: legacy by default, v2 when a def loads, legacy again on any failure',async()=>{
  const legacyCalls=[],createLegacy=id=>({kind:undefined,id,root:new THREE.Group()}),animateLegacy=(r,p)=>legacyCalls.push(r.id);
  const quiet={warn(){}},defs=new Map([['mizu',normalizeDef(DEF)]]);
  const gltf=await parse(),loader={load:async url=>{if(url.includes('missing'))throw Error('404');return gltf;}};
  const f=createRigFactory({defs,loader,mode:'auto',createLegacy,animateLegacy,log:quiet});
  const legacy=f.create('mizu');assert.equal(legacy.id,'mizu');f.animate(legacy,idle,.1,0,0,{x:0,z:0});assert.deepEqual(legacyCalls,['mizu']);
  assert.equal(await f.upgrade('pon'),null,'no def');
  const v2=await f.upgrade('mizu');assert.equal(v2.kind,'v2');f.animate(v2,idle,.1,0,0,{x:0,z:0});assert.equal(legacyCalls.length,1);
  assert.notEqual(v2.forms.human.model,gltf.scene,'each actor gets its own copy');
  assert.equal(await createRigFactory({defs,loader,mode:'legacy',createLegacy,animateLegacy}).upgrade('mizu'),null,'?rig=legacy');
  const broken=new Map([['mizu',normalizeDef({...DEF,forms:{human:'/assets/models/v2/missing.glb'}})]]);
  assert.equal(await createRigFactory({defs:broken,loader,mode:'auto',createLegacy,animateLegacy,log:quiet}).upgrade('mizu'),null,'load error falls back');
  assert.equal(await createRigFactory({defs,loader:null,mode:'auto',createLegacy,animateLegacy}).upgrade('mizu'),null,'no loader');
});
