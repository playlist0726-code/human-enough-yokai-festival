import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,addPlayer,startRound,stepRoom,setInput,doAction,setReady,beginCountdown,returnToLobby,setConnected,setPaused,removePlayer} from '../shared/simulation.mjs';
import {loadSettings,saveSettings,loadRecord,recordResult} from '../public/profile.mjs';
const setup=()=>{const r=createRoom('FOUND');addPlayer(r,'a','Mizu','mizu');return r;};
const playing=()=>{const r=setup();startRound(r,'a');stepRoom(r,2.1);return r;};
test('everyone must be ready and connected; countdown stops if someone leaves',()=>{
  const r=setup();addPlayer(r,'b','Pon','pon');assert.equal(beginCountdown(r,'b'),false);assert.equal(beginCountdown(r,'a'),false);
  setReady(r,'b',true);assert.equal(beginCountdown(r,'a'),true);assert.equal(r.phase,'countdown');
  setInput(r,'a',1,0);assert.equal(r.players.a.dx,0);stepRoom(r,1);assert.equal(r.countdown,2);assert.equal(r.time,480);
  setConnected(r,'b',false);assert.equal(r.phase,'lobby');assert.equal(r.players.b.ready,false);assert.equal(beginCountdown(r,'a'),false);
  setConnected(r,'b',true);setReady(r,'b',true);beginCountdown(r,'a');stepRoom(r,3.1);assert.equal(r.phase,'disguising');stepRoom(r,4.3);assert.equal(r.phase,'playing');assert.equal(r.round,1);
  const tick=r.tick;assert.equal(startRound(r,'a'),false);assert.equal(r.tick,tick);
});
test('rematch returns to lobby and clears readiness; live rounds cannot reset',()=>{
  const r=playing();addPlayer(r,'b','Pon','pon');assert.equal(returnToLobby(r,'a'),false);
  r.phase='won';r.players.b.ready=true;assert.equal(returnToLobby(r,'b'),false);assert.equal(returnToLobby(r,'a'),true);assert.equal(r.phase,'lobby');assert.equal(r.players.b.ready,false);
  setReady(r,'b',true);beginCountdown(r,'a');stepRoom(r,3.1);assert.equal(r.phase,'disguising');stepRoom(r,4.3);assert.equal(r.round,2);assert.equal(r.players.a.energy,70);
});
test('solo pause freezes all timers and actions; multiplayer menu cannot pause the crew',()=>{
  const r=playing(),p=r.players.a;setInput(r,'a',1,0);assert.equal(setPaused(r,'a',true),true);
  const before=JSON.stringify(r);setInput(r,'a',1,0);doAction(r,'a','drink');stepRoom(r,10);assert.equal(JSON.stringify(r),before);
  setPaused(r,'a',false);stepRoom(r,.5);assert.equal(r.paused,false);
  addPlayer(r,'b','Pon','pon');assert.equal(setPaused(r,'a',true),false);assert.equal(r.paused,false);
});
test('potion sharing conserves inventory, enforces range and bag capacity, and records assistance',()=>{
  const r=playing(),p=r.players.a;addPlayer(r,'b','Pon','pon');const b=r.players.b;
  Object.assign(b,{x:p.x+10,z:p.z});doAction(r,'a','share');assert.equal(p.bottles,1);
  b.x=p.x+1;doAction(r,'a','share');assert.equal(p.bottles,0);assert.equal(b.bottles,2);assert.equal(p.stats.potionsShared,1);
  doAction(r,'a','share');assert.equal(b.bottles,2);p.bottles=2;b.bottles=3;doAction(r,'a','share');assert.equal(p.bottles,2);
});
test('handoff transfers a nearby owned guest; later disconnect releases only its owner’s guests',()=>{
  const r=playing(),p=r.players.a;addPlayer(r,'b','Pon','pon');const b=r.players.b;Object.assign(b,{x:p.x+1,z:p.z});
  const h=r.humans[0];Object.assign(h,{x:p.x,z:p.z,owner:'a',state:'following',charm:1});doAction(r,'a','handoff');assert.equal(h.owner,'b');assert.equal(h.charm,1);assert.equal(p.stats.handoffs,1);
  doAction(r,'a','handoff');assert.equal(h.owner,'b');removePlayer(r,'a');assert.equal(h.owner,'b');removePlayer(r,'b');assert.equal(h.owner,null);
});
test('disconnect stops movement and migrates host without removing a resumable character',()=>{
  const r=playing();addPlayer(r,'b','Pon','pon');setInput(r,'a',1,0);setConnected(r,'a',false);assert.equal(r.host,'b');assert.equal(r.players.a.dx,0);
  const x=r.players.a.x;stepRoom(r,.1);assert.equal(r.players.a.x,x);assert.equal(Object.keys(r.players).length,2);
  setConnected(r,'a',true);assert.equal(r.players.a.connected,true);assert.equal(r.host,'b');
});
test('drinking cannot be spammed or replaced by a new charm while casting',()=>{
  const r=playing(),p=r.players.a,h=r.humans[0];p.bottles=3;p.energy=0;Object.assign(h,{x:p.x,z:p.z});
  doAction(r,'a','drink');assert.equal(p.energy,55);doAction(r,'a','drink');doAction(r,'a','charm');assert.equal(p.bottles,2);assert.equal(h.owner,null);
  stepRoom(r,1.1);doAction(r,'a','charm');assert.equal(h.owner,'a');
});
function storage(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};}
test('settings and personal records tolerate blocked or corrupt storage; results are counted once',()=>{
  const st=storage();saveSettings(st,{sound:true,quality:'light',camera:'wide',character:'kon',name:'Test'});assert.equal(loadSettings(st).quality,'light');
  // REMASTER-HOOK hq: sound defaults on; a pre-v2 saved `sound:false` was the old default, not a choice; v2 choices persist.
  assert.equal(loadSettings({getItem:()=>'{broken'}).sound,true);assert.equal(loadSettings(storage()).sound,true);assert.equal(loadSettings(st).sound,true);
  assert.equal(loadSettings({getItem:()=>'{"sound":false,"quality":"light"}'}).sound,true);
  const off=storage();saveSettings(off,{...loadSettings(off),sound:false});assert.equal(loadSettings(off).sound,false);
  saveSettings(off,{...loadSettings(off),sound:true});assert.equal(loadSettings(off).sound,true);assert.equal(loadRecord({getItem:()=>'{broken'}).rounds,0);
  const blocked={getItem(){throw Error('Blocked');},setItem(){throw Error('Blocked');}};assert.doesNotThrow(()=>saveSettings(blocked,{}));
  const r=playing();r.phase='won';r.tick=112;r.players.a.stamps=['fish'];recordResult(st,r,'a');recordResult(st,r,'a');assert.equal(loadRecord(st).rounds,1);assert.equal(loadRecord(st).bestTime,112);
  r.round++;r.phase='lost';r.players.a.stamps=['fish','apple'];recordResult(st,r,'a');assert.equal(loadRecord(st).wins,1);assert.equal(loadRecord(st).rounds,2);assert.equal(loadRecord(st).stamps.length,2);
});
test('timed failure closes booths; a clean rematch clears inventory, buffs, stats and old events',()=>{
  const r=playing(),p=r.players.a;p.bottles=3;p.energy=5;p.delivered=2;p.stats.potionsShared=4;p.speedBoost=15;
  r.events.push({id:++r.eventSeq,text:'Old round'});p.mini={status:'result',endsAt:r.tick,settled:true};r.time=.01;stepRoom(r,.05);
  assert.equal(r.phase,'lost');assert.equal(p.mini,null);const seq=r.eventSeq;
  returnToLobby(r,'a');beginCountdown(r,'a');stepRoom(r,3.1);assert.equal(r.phase,'disguising');stepRoom(r,4.3);assert.equal(r.phase,'playing');assert.equal(p.bottles,1);assert.equal(p.delivered,0);assert.equal(p.speedBoost,0);assert.equal(p.stats.potionsShared,0);assert.equal(r.events.length,0);assert.equal(r.eventSeq,seq);
});
