// R02 night look: grade, lantern anchors and quality profiles.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {gradeColor,GRADE} from '../public/render/post.mjs';
import {registerLantern,lanternAnchors,clearLanterns,LANTERN_KINDS,createLanternLight} from '../public/render/lanterns.mjs';
import {PROFILES,slowerProfile} from '../public/visual-quality.mjs';
import {LIGHTING} from '../public/render/lighting.mjs';

const luma=([r,g,b])=>.2126*r+.7152*g+.0722*b;

test('grade pushes shadows blue, highlights warm and night grass toward teal',()=>{
  const shadow=gradeColor(.12,.12,.12);assert.ok(shadow[2]>shadow[0],'dark greys lean blue');
  const high=gradeColor(.85,.85,.85);assert.ok(high[0]>high[2],'bright greys lean warm');
  const grass=gradeColor(.25,.45,.22);assert.ok(grass[1]-grass[2]<.45-.22,'pure green loses its lead over blue');
  for(const v of [0,.1,.5,.9,1]){const c=gradeColor(v,v,v);for(const x of c){assert.ok(x>=0&&x<=1);}}
  assert.ok(Math.abs(luma(gradeColor(.5,.5,.5))-.5)<.08,'mid grey keeps its brightness');
  assert.equal(GRADE.lutSize,32);
});

test('lanterns register as anchors and the light pool map covers them',()=>{
  clearLanterns();
  registerLantern({x:8,y:2.5,z:10,kind:'stall'});registerLantern({x:-4,y:1.2,z:5,kind:'stone',color:'#ff0000'});
  const a=lanternAnchors();assert.equal(a.length,2);assert.equal(a[0].radius,LANTERN_KINDS.stall.radius);assert.equal(a[1].color.getHexString(),'ff0000');
  const scene=new THREE.Scene(),light=createLanternLight(scene);
  light.applyProfile(PROFILES.mobile);assert.equal(light.lights.length,PROFILES.mobile.lanternLights);
  light.update({dt:.3,elapsed:1,focus:new THREE.Vector3(8,0,10)});
  const {data,width}=light.map.image,b=light.uniforms.lanternBounds.value;
  const px=(x,z)=>{const i=Math.floor((x-b.x)/b.z*width),j=Math.floor((z-b.y)/b.w*light.map.image.height);return data[(j*width+i)*4];};
  assert.ok(px(8,10)>px(8,10+LANTERN_KINDS.stall.radius*1.5),'pool is brightest under the lantern');
  assert.ok(light.lights.every(l=>l.position.distanceTo(new THREE.Vector3(8,2.35,10))<20));
  light.applyProfile(PROFILES.light);assert.equal(light.lights.length,0);
  clearLanterns();
});

test('cheaper profiles never cost more lights or passes, and fall back one step at a time',()=>{
  const order=['high','balanced','mobile','light'];
  for(let i=1;i<order.length;i++){const a=PROFILES[order[i-1]],b=PROFILES[order[i]];assert.ok(b.lanternLights<=a.lanternLights);assert.ok(b.shadow<=a.shadow);assert.ok(b.bloom<=a.bloom);assert.equal(slowerProfile(order[i-1]),order[i]);}
  assert.equal(slowerProfile('light'),'light');
  assert.ok(PROFILES.mobile.lanternLights<=2);
});

test('moonlight is a weak cool key from the uphill side',()=>{
  const c=new THREE.Color(LIGHTING.moon.color);assert.ok(c.b>c.r);assert.ok(LIGHTING.moon.intensity<1.5);
  assert.ok(LIGHTING.moon.direction[2]<0,'moon sits ahead of the default uphill camera');
});

// R04 festival kit: every stall kind has a kit asset on disk and the build sources exist.
import {existsSync,readFileSync} from 'node:fs';
import {STALLS} from '../shared/world.mjs';
test('festival kit covers every stall and its GLBs are valid glTF binaries',async()=>{
  const {KIT_STALLS,PAPER_LANTERN_CENTER}=await import('../public/festival-kit.mjs');
  for(const s of STALLS)assert.ok(KIT_STALLS[s.game],`stall ${s.game} has a kit asset`);
  for(const id of [...Object.values(KIT_STALLS),'env_lantern_paper','env_lantern_stone','env_path_tiles']){
    const file=new URL(`../public/assets/env/v2/${id}.glb`,import.meta.url);assert.ok(existsSync(file),id);
    const b=readFileSync(file);assert.equal(b.toString('ascii',0,4),'glTF');
    const json=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
    for(const m of json.materials)assert.match(m.name,/^kit_(wood|cloth|paint|stone|water|glow)$/,`${id} uses shared kit materials`);
  }
  assert.ok(existsSync(new URL('../public/assets/env/v2/textures/kit_ground.webp',import.meta.url)));
  assert.match(readFileSync(new URL('../source/v2/environment/kit/family.py',import.meta.url),'utf8'),new RegExp(`LANTERN_CENTER = ${String(PAPER_LANTERN_CENTER).replace('0.','\\.')}`));
});
