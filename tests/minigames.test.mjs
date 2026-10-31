import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,inputGame,advanceGame,targets,ringPosition,rewardFor} from '../shared/minigames.mjs';
import {createRoom,addPlayer,startRound,stepRoom,doAction,stallInput,setInput} from '../shared/simulation.mjs';
import {STALLS,stallEntrance} from '../shared/world.mjs';
function win(g,start=1){
  inputGame(g,{type:'begin'},start);
  if(['shoot','fish'].includes(g.kind))for(let i=0;i<3;i++){const at=start+.2+i*.2,t=targets(g,at)[i];inputGame(g,{type:'aim',x:t.x,y:t.y},at);}
  if(g.kind==='ring'){for(let at=start+.1;at<start+10&&g.status==='active';at+=.1)if(Math.abs(ringPosition(g,at)-.5)<.06)inputGame(g,{type:'throw'},at);}
  if(g.kind==='cook')for(let i=0;i<4;i++)inputGame(g,{type:'flip',index:i},start+1.5+i*.85);
  if(g.kind==='fortune')inputGame(g,{type:'pick',index:1},start+.2);
  if(g.kind==='ice'){for(let i=0;i<12;i++)inputGame(g,{type:'turn'},start+.1+i*.1);inputGame(g,{type:'syrup',index:g.syrup},start+1.5);}
  return g;
}
for(const kind of ['shoot','fish','ring','cook','fortune','ice'])test(`${kind}: real inputs produce a win and replay cannot change rewards`,()=>{
  const g=win(createGame(kind,73,0));assert.equal(g.result?.won,true);assert.ok(rewardFor(g));const before=JSON.stringify(g);inputGame(g,{type:'pick',index:2,score:10000},20);assert.equal(JSON.stringify(g),before);
});
test('deadlines, bad timing, invalid coordinates and attempt limits are enforced',()=>{
  const g=createGame('shoot',0,0);inputGame(g,{type:'begin'},1);inputGame(g,{type:'aim',x:NaN,y:0},2);inputGame(g,{type:'aim',x:2,y:0},3);assert.equal(g.attempts,0);
  for(let i=0;i<6;i++)inputGame(g,{type:'aim',x:0,y:0},4+i*.2);assert.equal(g.result.won,false);assert.equal(rewardFor(g),null);
  const c=createGame('cook',0,0);inputGame(c,{type:'begin'},1);for(let i=0;i<3;i++)inputGame(c,{type:'flip',index:i},1.1+i*.1);assert.equal(c.result.won,false);
  const intro=createGame('fortune',0,0);advanceGame(intro,21);assert.equal(intro.result.won,false);
  const ice=createGame('ice',0,0);inputGame(ice,{type:'begin'},1);inputGame(ice,{type:'syrup',index:0},2);assert.equal(ice.status,'active');advanceGame(ice,20);assert.equal(ice.result.won,false);
});
function setup(){const r=createRoom('TEST2');addPlayer(r,'a','A','mizu');addPlayer(r,'b','B','pon');startRound(r,'a');stepRoom(r,2.1);return r;}
test('stall sessions require proximity, immobilize only their player, keep charm timers running, and expire',()=>{
  const r=setup(),p=r.players.a;doAction(r,'a','interact');assert.equal(p.mini,null);
  Object.assign(p,stallEntrance(STALLS[0]),{energy:0});const h=r.humans[0];Object.assign(h,{x:p.x+1,z:p.z,owner:'a',state:'following',charm:1});doAction(r,'a','interact');assert.equal(p.mini.kind,'shoot');
  const x=p.x,bx=r.players.b.x;setInput(r,'a',1,0);setInput(r,'b',1,0);stepRoom(r,.5);assert.equal(p.x,x);assert.ok(r.players.b.x>bx);assert.equal(h.owner,'a');assert.equal(h.charm,.5);
  doAction(r,'a','jump');assert.equal(p.vy,0);stallInput(r,'a','wrong',{type:'begin'});assert.equal(p.mini.status,'intro');
  const session=p.mini.session;stallInput(r,'a',session,{type:'begin'});stepRoom(r,19);assert.equal(p.mini.result.won,false);assert.equal(p.bottles,1);
  stallInput(r,'a',session,{type:'close'});assert.equal(p.mini,null);doAction(r,'a','interact');assert.equal(p.mini,null);
});
test('all six rewards settle once, full bottles convert fairly, stamps are unique and round reset clears buffs',()=>{
  const r=setup(),p=r.players.a;
  for(const s of STALLS){Object.assign(p,stallEntrance(s),{action:'idle',bottles:3,energy:10});doAction(r,'a','interact');assert.equal(p.mini.kind,s.game);win(p.mini,r.tick);stallInput(r,'a',p.mini.session,{});assert.equal(p.mini.settled,true);
    const saved=JSON.stringify({b:p.bottles,e:p.energy,w:p.ward,s:p.speedBoost});stallInput(r,'a',p.mini.session,{type:'pick',index:2});assert.equal(JSON.stringify({b:p.bottles,e:p.energy,w:p.ward,s:p.speedBoost}),saved);
    if(s.game==='shoot')assert.equal(p.energy,35);stallInput(r,'a',p.mini.session,{type:'close'});
  }
  assert.equal(p.stamps.length,6);assert.ok(p.ward>0);assert.ok(p.speedBoost>0);r.phase='lost';startRound(r,'a');assert.deepEqual(p.stamps,[]);assert.equal(p.ward,0);assert.equal(p.speedBoost,0);
});
test('two players can use one stall independently and cancelling gives no reward',()=>{
  const r=setup();for(const p of Object.values(r.players))Object.assign(p,stallEntrance(STALLS[4]));doAction(r,'a','interact');doAction(r,'b','interact');assert.notEqual(r.players.a.mini.session,r.players.b.mini.session);
  const session=r.players.a.mini.session;stallInput(r,'a',session,{type:'close'});assert.equal(r.players.a.stamps.length,0);assert.equal(r.players.b.mini.status,'intro');
});
test('speed prize accelerates the escort during a fixed charm window',()=>{
  const r=setup(),p=r.players.a,h=r.humans[0];Object.assign(p,{x:0,z:14,speedBoost:20,energy:100});Object.assign(h,{x:0,z:15,owner:'a',state:'following',charm:5});setInput(r,'a',0,-1);
  for(let i=0;i<80;i++)stepRoom(r,.05);assert.equal(h.owner,'a');assert.ok(Math.hypot(h.x-p.x,h.z-p.z)<6);
});
