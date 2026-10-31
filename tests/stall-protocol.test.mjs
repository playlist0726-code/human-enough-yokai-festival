import test from 'node:test';
import assert from 'node:assert/strict';
import {CHANNEL,isFrameMessage,cleanStallInput} from '../shared/stall-protocol.mjs';
import {createGame,inputGame} from '../shared/minigames.mjs';
import {createRoom,addPlayer,startRound,stepRoom,doAction,stallInput} from '../shared/simulation.mjs';
import {STALLS,stallEntrance} from '../shared/world.mjs';

test('embedded games only accept the bound window, origin and channel',()=>{
  const source={},origin='https://festival.example',event={source,origin,data:{channel:CHANNEL}};
  assert.equal(isFrameMessage(event,origin,source),true);
  assert.equal(isFrameMessage({...event,origin:'https://elsewhere.example'},origin,source),false);
  assert.equal(isFrameMessage({...event,source:{}},origin,source),false);
  assert.equal(isFrameMessage({...event,data:{channel:'other'}},origin,source),false);
});
test('the frame bridge forwards actions without accepting client scores or rewards',()=>{
  assert.deepEqual(cleanStallInput({type:'aim',x:.2,y:.3,won:true,score:99,reward:{bottles:99}}),{type:'aim',x:.2,y:.3});
  for(const bad of [null,{type:'award'},{type:'aim',x:NaN,y:.5},{type:'aim',x:-1,y:0},{type:'throw',power:Infinity,aimX:.5},{type:'throw',power:.5},{type:'flip',index:1.5}])assert.equal(cleanStallInput(bad),null);
  assert.deepEqual(cleanStallInput({type:'throw',power:.55,aimX:.5}),{type:'throw',power:.55,aimX:.5});
});
test('new first-person ring power and aim are judged on the server',()=>{
  const g=createGame('ring',31,0);inputGame(g,{type:'begin'},1);
  inputGame(g,{type:'throw',power:NaN,aimX:.5},1.2);assert.equal(g.attempts,0);
  inputGame(g,{type:'throw',power:.55,aimX:.95},1.3);assert.equal(g.score,0);assert.equal(g.attempts,1);
  for(let i=0;i<3;i++)inputGame(g,{type:'throw',power:.55,aimX:.5},1.5+i*.2);
  assert.equal(g.result.won,true);assert.equal(g.attempts,4);
});
test('closing and reopening a booth rejects stale iframe input and keeps the selected character',()=>{
  const r=createRoom('TEST5');addPlayer(r,'a','A','kasa');startRound(r,'a');stepRoom(r,2.1);
  const p=r.players.a;Object.assign(p,stallEntrance(STALLS[4]));doAction(r,'a','interact');
  const first=p.mini.session;stallInput(r,'a',first,{type:'close'});stepRoom(r,5.1);doAction(r,'a','interact');
  assert.notEqual(p.mini.session,first);stallInput(r,'a',first,{type:'begin'});assert.equal(p.mini.status,'intro');
  const second=p.mini.session;stallInput(r,'a',second,{type:'begin'});stallInput(r,'a',second,{type:'pick',index:0});
  assert.equal(p.mini.result.won,true);assert.equal(p.character,'kasa');assert.equal(p.stamps.length,1);
  const reward=JSON.stringify({e:p.energy,b:p.bottles,w:p.ward});stallInput(r,'a',first,{type:'pick',index:2});assert.equal(JSON.stringify({e:p.energy,b:p.bottles,w:p.ward}),reward);
});
