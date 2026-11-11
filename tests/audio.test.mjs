import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {CUES,OPENING,BUSES,DEFAULT_VOLUMES,CHARACTERS,sliderGain,distanceGain,panFor,pickFormat,characterFor,musicFor} from '../public/audio/cues.mjs';
import {createAudioEngine} from '../public/audio/engine.mjs';
import {createEventBus} from '../public/events.mjs';

// R13: every gameplay event has a cue that exists on disk in both formats, budgets hold, mixer rules are sane.
const root=new URL('../',import.meta.url),audio=new URL('public/assets/audio/',root);
const manifest=JSON.parse(await readFile(new URL('manifest.json',audio),'utf8'));
const files=()=>[...Object.values(manifest.music).map(m=>m.file),...Object.values(manifest.ambience).map(a=>a.file),...Object.values(manifest.sfx).flat(),...Object.values(manifest.voice)];

test('every event-bus type has an audio rule and every cue exists in the manifest',async()=>{
  const text=await readFile(new URL('public/events.mjs',root),'utf8');
  const emitted=new Set([...text.matchAll(/type:'([a-z_]+)'/g)].map(m=>m[1]));for(const t of ['stall_win','stall_fail','firework'])emitted.add(t);
  for(const type of emitted){assert.ok(CUES[type],`no audio rule for ${type}`);if(CUES[type].cue)assert.ok(manifest.sfx[CUES[type].cue]?.length,`cue ${CUES[type].cue} missing`);}
  for(const o of OPENING)assert.ok(manifest.sfx[o.cue],`opening cue ${o.cue} missing`);
  for(const name of ['title','festival','boss','victory','defeat'])assert.ok(manifest.music[name],`music ${name}`);
  for(const c of CHARACTERS)for(const kind of ['laugh','surprise'])assert.ok(manifest.voice[`${c}_${kind}`],`${c} ${kind}`);
  for(const name of ['title','festival','boss'])assert.equal(manifest.music[name].loop,true);
});

test('all audio ships as ogg + m4a and stays within the 8 MB budget',async()=>{
  let total=0;
  for(const f of files())for(const ext of ['ogg','m4a']){const s=await stat(new URL(`${f}.${ext}`,audio));assert.ok(s.size>200,`${f}.${ext} empty`);total+=s.size;}
  assert.ok(total<=8*1024*1024,`audio total ${(total/1048576).toFixed(2)} MB`);
});

test('mixer rules: squared sliders, distance falloff with a floor, pan, format, music by screen',()=>{
  assert.equal(sliderGain(0),0);assert.equal(sliderGain(1),1);assert.equal(sliderGain(.5),.25);assert.equal(sliderGain('x'),0);
  assert.equal(distanceGain(0),1);assert.ok(distanceGain(10)>distanceGain(30));assert.ok(distanceGain(1e4)>=.12);
  assert.equal(panFor(0),0);assert.equal(panFor(100),.8);assert.equal(panFor(-100),-.8);
  assert.equal(pickFormat(t=>t.includes('vorbis')?'probably':''),'ogg');assert.equal(pickFormat(()=>''),'m4a');assert.equal(pickFormat(()=>{throw 0;}),'m4a');
  assert.equal(characterFor('abc'),characterFor('abc'));assert.equal(characterFor('x','kon'),'kon');assert.ok(CHARACTERS.includes(characterFor('zzz')));
  assert.equal(musicFor({hud:true}),'festival');assert.equal(musicFor({hud:true,boss:true}),'boss');assert.equal(musicFor({title:true}),'title');assert.equal(musicFor({hud:true,ending:true}),null);
  for(const b of BUSES)assert.ok(DEFAULT_VOLUMES[b]>0&&DEFAULT_VOLUMES[b]<=1);
});

test('engine is safe without WebAudio (tests, old browsers) and the legacy tone is silent',()=>{
  const engine=createAudioEngine({isEnabled:()=>true,storage:null});const bus=createEventBus();
  const off=engine.attach(bus);
  for(const type of Object.keys(CUES))bus.emit(type,{type,playerId:'a',position:{x:0,y:0,z:0},local:true,result:'won'});
  assert.equal(engine.tone(440),undefined);assert.equal(engine.context,null);
  engine.setVolume('music',.3);assert.equal(engine.volumes.music,.3);engine.setVolume('music',5);assert.equal(engine.volumes.music,1);
  off();
});
