import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,inputGame} from '../dist/modules/minigames.mjs';
function ring(){const g=createGame('ring',31,0);inputGame(g,{type:'begin'},0);return g;}
test('a correctly aimed ring wins from player force, independent of timer phase',()=>{
 const g=ring();for(const t of [.2,.5,.8])inputGame(g,{type:'throw',power:.55,aimX:.5},t);
 assert.equal(g.score,3);assert.equal(g.result.won,true);
});
test('weak, excessive and sideways throws use attempts without awarding a hit',()=>{
 const g=ring();
 for(const [t,power,aimX] of [[.2,.1,.5],[.4,.95,.5],[.6,.55,.95]])inputGame(g,{type:'throw',power,aimX},t);
 assert.equal(g.score,0);assert.equal(g.attempts,3);
});
test('invalid force and aim values never consume attempts or award a hit',()=>{
 const g=ring();
 for(const [power,aimX] of [[NaN,.5],[Infinity,.5],[-1,.5],[2,.5],[.55,NaN],[.55,-1],[.55,2]])inputGame(g,{type:'throw',power,aimX},.2);
 assert.equal(g.attempts,0);assert.equal(g.score,0);
});
