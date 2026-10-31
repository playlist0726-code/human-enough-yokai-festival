import test from 'node:test';
import assert from 'node:assert/strict';
import {journeySteps} from '../public/journey.mjs';
import {createRoom,addPlayer,startRound,stepRoom,setConnected,doAction,setPaused,removePlayer} from '../shared/simulation.mjs';
const setup=()=>{const r=createRoom('CREW2');for(const [id,char] of [['a','mizu'],['b','pon'],['c','kon']])addPlayer(r,id,id.toUpperCase(),char);startRound(r,'a');stepRoom(r,2.1);return r;};
test('first returning player receives host authority when the whole crew was offline',()=>{
 const r=setup();for(const id of ['a','b','c'])setConnected(r,id,false);
 assert.equal(r.host,'c');setConnected(r,'a',true);assert.equal(r.host,'a');
 setConnected(r,'b',true);assert.equal(r.host,'a');
});
test('potion shares and guest handoffs honor the chosen teammate; invalid targets never fall back',()=>{
 const r=setup(),p=r.players.a;Object.assign(p,{x:0,z:14,bottles:3});Object.assign(r.players.b,{x:.5,z:14});Object.assign(r.players.c,{x:2,z:14});
 doAction(r,'a','share','c');assert.equal(p.bottles,2);assert.equal(r.players.c.bottles,2);assert.equal(r.players.b.bottles,1);
 doAction(r,'a','share','missing');assert.equal(p.bottles,2);
 const h=r.humans[0];Object.assign(h,{x:0,z:14,owner:'a',state:'following'});doAction(r,'a','handoff','c');assert.equal(h.owner,'c');
 r.players.c.x=10;doAction(r,'a','share','c');assert.equal(p.bottles,2);
});
test('help requests have a fixed location, expire and cannot be spammed or used while paused',()=>{
 const r=setup(),p=r.players.a;doAction(r,'a','ping');assert.equal(p.pingUntil,r.tick+8);assert.equal(r.events.at(-1).fx,'ping');
 const at={...p.pingAt},eventCount=r.events.length;doAction(r,'a','ping');assert.equal(p.pingUntil,r.tick+8);assert.equal(r.events.length,eventCount+1);
 p.x+=1;assert.deepEqual(p.pingAt,at);stepRoom(r,8.1);assert.ok(p.pingUntil<r.tick);
 removePlayer(r,'b');removePlayer(r,'c');setPaused(r,'a',true);doAction(r,'a','ping');assert.ok(p.pingUntil<r.tick);
});

test('first-night checklist uses actual travel and successful actions; resets with each night',()=>{
 const r=setup(),p=r.players.a;assert.equal(journeySteps(p).filter(s=>s.done).length,0);
 p.dx=1;for(let i=0;i<15;i++)stepRoom(r,.05);p.dx=0;assert.equal(journeySteps(p)[0].done,true);
 const potion=r.potions[0];Object.assign(p,{x:potion.x,z:potion.z});doAction(r,'a','interact');assert.equal(journeySteps(p)[1].done,true);
 doAction(r,'a','drink');assert.equal(journeySteps(p)[2].done,true);
 r.phase='lost';startRound(r,'a');assert.equal(journeySteps(p).filter(s=>s.done).length,0);
});
