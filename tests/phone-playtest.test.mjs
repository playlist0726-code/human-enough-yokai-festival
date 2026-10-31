import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {privateIPv4,playtestInfo,inviteURL} from '../playtest-network.mjs';
import {joystickVector} from '../public/touch-controls.mjs';
import {initialProfile,PROFILES} from '../public/visual-quality.mjs';

test('phone invitations list reachable network interfaces and exclude loopback, public and tunnel addresses',()=>{
 const interfaces={lo:[{address:'127.0.0.1',family:'IPv4',internal:true}],wifi:[{address:'100.64.90.105',family:'IPv4',internal:false},{address:'192.168.1.7',family:'IPv4',internal:false}],vpn:[{address:'fe80::1',family:'IPv6',internal:false}],public:[{address:'8.8.8.8',family:'IPv4',internal:false}]};
 const info=playtestInfo({address:'0.0.0.0',port:4173},interfaces);assert.equal(info.lan,true);assert.deepEqual(info.urls,['http://100.64.90.105:4173','http://192.168.1.7:4173']);
 assert.deepEqual(playtestInfo({address:'127.0.0.1',port:4173},interfaces).urls,[]);
 for(const address of ['999.1.1.1','127.0.0.1','8.8.8.8','100.128.1.2'])assert.equal(privateIPv4(address),false,address);
 const invite=new URL(inviteURL(info.urls[0],'ABCDE'));assert.equal(invite.searchParams.get('room'),'ABCDE');assert.equal(invite.searchParams.get('touch'),'1');assert.equal(new URL(inviteURL(info.urls[0],'<script>')).searchParams.has('room'),false);
});
test('joystick ignores center drift, scales analog input and clamps diagonal movement',()=>{
 assert.deepEqual(joystickVector(2,1),{x:0,z:0});assert.deepEqual(joystickVector(0,0),{x:0,z:0});
 const mid=joystickVector(21,0),edge=joystickVector(200,-200);assert.ok(mid.x>0&&mid.x<.5);assert.equal(mid.z,0);assert.ok(Math.abs(Math.hypot(edge.x,edge.z)-1)<1e-9);assert.ok(edge.z<0);
});
test('touchscreen auto quality keeps soft shadows, caps resolution and can fall back to a lighter profile',()=>{
 assert.equal(initialProfile(844,8,true),'mobile');assert.equal(initialProfile(390,8,true),'mobile');assert.equal(initialProfile(1280,8,false),'high');assert.equal(PROFILES.mobile.ratio,1);assert.equal(PROFILES.mobile.ao,false);assert.equal(PROFILES.mobile.shadows,true);assert.equal(PROFILES.light.shadows,false);assert.equal(PROFILES.light.post,false);
});
test('all 23 refined models contain actual weighted cloth skins and editable native sources',()=>{
 const root=new URL('../',import.meta.url),manifest=JSON.parse(readFileSync(new URL('art/characters/roster-v03/manifest.json',root)));
 assert.equal(manifest.models.length,23);
 for(const asset of manifest.models){
  assert.ok(existsSync(new URL('art/characters/roster-v03/'+asset.source,root)),asset.key);
  const b=readFileSync(new URL('public'+asset.url,root)),g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
  const cloth=g.nodes.filter(n=>n.skin!==undefined);assert.ok(cloth.length>=3,asset.key+' has skinned sleeves and yukata');
  assert.ok(g.nodes.some(n=>n.name?.endsWith('__hem_L')),asset.key);
  for(const n of cloth){for(const p of g.meshes[n.mesh].primitives){assert.ok(p.attributes.JOINTS_0!==undefined);assert.ok(p.attributes.WEIGHTS_0!==undefined);}}
  if(asset.key==='kon_yokai')assert.ok(g.nodes.some(n=>n.name?.endsWith('__neck_tip')));
  if(asset.key==='nemu_yokai')assert.ok(g.nodes.some(n=>n.name?.endsWith('__tail_tip')));
 }
});
