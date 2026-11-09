import test from 'node:test';
import assert from 'node:assert/strict';
import {createEventBus,createSnapshotTracker,createGameEvents,EVENT_TYPES} from '../public/events.mjs';
import {createRoom,addPlayer,startRound,stepRoom,doAction,setInput,snapshot} from '../shared/simulation.mjs';

const clone=v=>JSON.parse(JSON.stringify(v));
function setup(){const r=createRoom('EVENT',{combat:false});addPlayer(r,'a','A','mizu');startRound(r,'a');stepRoom(r,2.1);return r;}
function advance(r,seconds,tracker,out){for(let i=0;i<Math.round(seconds/.05);i++){stepRoom(r,.05);if(i%2===1)out.push(...tracker.ingest(clone(snapshot(r)),'a'));}}
const types=events=>events.map(e=>e.type);

test('bus delivers by type and wildcard, unsubscribes, and isolates throwing handlers',()=>{
  const errors=[],bus=createEventBus({onError:(e,type)=>errors.push(type)}),seen=[];
  const off=bus.on('jump',e=>seen.push(['jump',e.playerId]));bus.on('*',e=>seen.push(['*',e.type]));bus.on('jump',()=>{throw Error('boom');});
  bus.once('land',e=>seen.push(['once',e.type]));
  const event=bus.emit('jump',{playerId:'a',position:{x:1,y:0,z:2}});
  assert.deepEqual(event,{type:'jump',playerId:'a',position:{x:1,y:0,z:2}});
  bus.emit('land');bus.emit('land');off();bus.emit('jump',{playerId:'b'});
  assert.deepEqual(seen,[['jump','a'],['*','jump'],['once','land'],['*','land'],['*','land'],['*','jump']]);
  assert.deepEqual(errors,['jump','jump']);
  assert.equal(EVENT_TYPES.length,22);
});

test('first snapshot only primes the tracker, so joining never replays old events',()=>{
  const r=setup(),tracker=createSnapshotTracker();doAction(r,'a','jump');stepRoom(r,.05);
  assert.deepEqual(tracker.ingest(clone(snapshot(r)),'a'),[]);
  const out=[];advance(r,1.5,tracker,out);
  assert.ok(!out.some(e=>e.type==='jump'),'the jump before priming is not replayed');
  assert.ok(out.some(e=>e.type==='land'),'but the landing that happened afterwards is reported');
});

test('server actions map to bus events with player id, position and local flag',()=>{
  const r=setup(),tracker=createSnapshotTracker(),out=[];tracker.ingest(clone(snapshot(r)),'a');
  const p=r.players.a;
  doAction(r,'a','jump');advance(r,1.5,tracker,out);
  p.bottles=1;doAction(r,'a','drink');advance(r,1.2,tracker,out);
  doAction(r,'a','cover');advance(r,.2,tracker,out);
  const h=r.humans[0];Object.assign(p,{x:h.x+1,z:h.z});p.energy=100;doAction(r,'a','charm');advance(r,.2,tracker,out);
  const jump=out.find(e=>e.type==='jump'),drink=out.find(e=>e.type==='potion_drink'),charm=out.find(e=>e.type==='charm_cast');
  assert.deepEqual(types(out).filter(t=>['jump','land','potion_drink','cover_ward','charm_cast'].includes(t)),['jump','land','potion_drink','cover_ward','charm_cast']);
  assert.equal(jump.playerId,'a');assert.equal(jump.local,true);assert.ok(Number.isFinite(jump.position.x)&&Number.isFinite(jump.position.y));
  assert.ok(drink.position&&drink.tick>0);assert.equal(charm.guestId,h.id);
});

test('charm expiry, guest delivery, reveal and footsteps come from snapshot differences',()=>{
  const r=setup(),tracker=createSnapshotTracker(),out=[];tracker.ingest(clone(snapshot(r)),'a');
  const p=r.players.a,h=r.humans[0];Object.assign(p,{x:h.x+1,z:h.z});p.energy=100;doAction(r,'a','charm');
  advance(r,6,tracker,out);
  const end=out.find(e=>e.type==='charm_end');
  assert.ok(end,'charm ends after 5 seconds');assert.equal(end.playerId,'a');assert.equal(end.guestId,h.id);assert.equal(end.reason,'expired');
  // walk: one footstep per stride, alternating feet
  const steps=[];setInput(r,'a',1,0);for(let i=0;i<20;i++){setInput(r,'a',1,0);stepRoom(r,.05);if(i%2)steps.push(...tracker.ingest(clone(snapshot(r)),'a'));}
  const feet=steps.filter(e=>e.type==='footstep');
  assert.ok(feet.length>=2&&feet.length<=4,`about 3 steps per second at base speed, got ${feet.length}`);
  assert.notEqual(feet[0].foot,feet[1].foot);
  // reveal window from the disguise timer
  const reveal=[];p.nextRevealAt=r.tick+.1;advance(r,7,tracker,reveal);
  assert.ok(types(reveal).includes('reveal_start'),'reveal starts');assert.ok(types(reveal).includes('reveal_end'),'and ends');
  assert.ok(types(reveal).indexOf('reveal_start')<types(reveal).indexOf('reveal_end'));
  // delivery: owner recorded on the guest_delivered event
  const prev=clone(snapshot(r)),next=clone(prev);next.tick+=.1;
  Object.assign(prev.humans[1],{owner:'a',state:'following'});Object.assign(next.humans[1],{owner:null,state:'delivered'});
  const t2=createSnapshotTracker();t2.ingest(prev,'a');const d=t2.ingest(next,'a');
  assert.deepEqual(types(d),['charm_end','guest_delivered']);assert.equal(d[1].playerId,'a');assert.equal(d[0].reason,'delivered');
});

test('stall enter / win / fail and round start / end',()=>{
  const r=setup(),base=clone(snapshot(r)),tracker=createSnapshotTracker();
  const lobby={...clone(base),phase:'lobby'};tracker.ingest(lobby,'a');
  assert.deepEqual(types(tracker.ingest(clone(base),'a')),['round_start']);
  const enter=clone(base);enter.players.a.mini={stallId:'fish',kind:'fish',status:'intro',session:'a:1',result:null};
  const won=clone(enter);won.players.a.mini={...enter.players.a.mini,status:'result',result:{won:true,reason:'Prize'}};
  assert.deepEqual(types(tracker.ingest(enter,'a')),['stall_enter']);
  const w=tracker.ingest(won,'a');assert.deepEqual(types(w),['stall_win']);assert.equal(w[0].stallId,'fish');
  const again=clone(won);again.players.a.mini={stallId:'fish',kind:'fish',status:'result',session:'a:2',result:{won:false,reason:'Missed'}};
  assert.deepEqual(types(tracker.ingest(again,'a')),['stall_fail']);
  const lost={...clone(base),phase:'lost',lossReason:'The night is over.'};lost.players.a.mini=null;
  const end=tracker.ingest(lost,'a');assert.equal(end.at(-1).type,'round_end');assert.equal(end.at(-1).result,'lost');
});

test('combat events: hit, sealed, rescued, boss omen and banish',()=>{
  const r=setup(),s0=clone(snapshot(r)),tracker=createSnapshotTracker();tracker.ingest(s0,'a');
  const s1=clone(s0);s1.encounter={phase:'omen',x:0,z:-20,seals:[]};
  s1.events=[{id:900,fx:'omen',type:'omen',player:null,text:''},{id:901,fx:'hit',type:'hurt',actor:'a',player:'a'},{id:902,fx:'hit',type:'down',actor:'a',player:null},{id:903,fx:'revive',type:'revive',actor:'a'},{id:904,fx:'bossDown',type:'banished',at:{x:0,z:-20}},{id:905,fx:'bolt',type:'bolt',actor:'a',boss:true},{id:906,fx:'pickup',type:'potion',actor:'a',at:{x:3,z:13}}];
  const out=tracker.ingest(s1,'a');
  assert.deepEqual(types(out),['boss_omen','hit','sealed','rescued','boss_banished','spirit_bolt','potion_pickup']);assert.equal(out[6].position.x,3);
  assert.equal(out[0].position.z,-20);assert.equal(out[4].position.x,0);assert.equal(out[2].playerId,'a');
  assert.deepEqual(tracker.ingest(s1,'a'),[],'events are never delivered twice');
});

test('createGameEvents emits every tracked event on the bus and reset() re-primes',()=>{
  const bus=createEventBus(),seen=[],game=createGameEvents(bus);bus.on('*',e=>seen.push(e.type));
  const r=setup();game.ingest(clone(snapshot(r)),'a');doAction(r,'a','jump');stepRoom(r,.05);game.ingest(clone(snapshot(r)),'a');
  assert.deepEqual(seen,['jump']);game.reset();game.ingest(clone(snapshot(r)),'a');assert.deepEqual(seen,['jump']);
});
