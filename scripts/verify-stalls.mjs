import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {STALLS,stallEntrance,findPath,distance} from '../shared/world.mjs';
import {targets,cookingPhase} from '../shared/minigames.mjs';
const sockets=[],sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,timeout=10000){const start=Date.now();while(!fn()){if(Date.now()-start>timeout)throw Error('Stall integration timed out');await sleep(25);}}
async function connect(character,code){const c={ws:new WebSocket('ws://127.0.0.1:4173'),id:null,state:null,errors:[],acks:[],send(m){this.ws.send(JSON.stringify(m));}};sockets.push(c.ws);c.ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='hello')c.id=m.id;if(m.type==='state')c.state=m.state;if(m.type==='error')c.errors.push(m.message);if(m.type==='stall_ack')c.acks.push(m);});await until(()=>c.id);c.send({type:'join',character,name:'Stall QA',code});await until(()=>c.state);return c;}
async function walk(c,goal){const route=findPath(c.state.players[c.id],goal);route.push(goal);for(const point of route){const start=Date.now();while(distance(c.state.players[c.id],point)>.28){const p=c.state.players[c.id],d=distance(p,point);c.send({type:'input',dx:(point.x-p.x)/d,dz:(point.z-p.z)/d});await sleep(40);if(Date.now()-start>7000)throw Error(`Path blocked ${JSON.stringify(point)}`);}}c.send({type:'input',dx:0,dz:0});await sleep(120);}
try{
  const a=await connect('mizu'),b=await connect('pon',a.state.code);b.send({type:'ready',ready:true});await until(()=>a.state.players[b.id]?.ready);a.send({type:'start'});await until(()=>a.state.tick>2);
  for(const s of STALLS){
    await walk(a,stallEntrance(s));a.send({type:'action',action:'interact'});await until(()=>a.state.players[a.id].mini?.kind===s.game);
    let requestId=0;const session=a.state.players[a.id].mini.session,cmd=input=>a.send({type:'stall',session,input,requestId:++requestId});
    const bx=b.state.players[b.id].x;b.send({type:'input',dx:1,dz:0});await sleep(200);b.send({type:'input',dx:0,dz:0});assert.ok(b.state.players[b.id].x>bx);
    cmd({type:'begin'});await until(()=>a.state.players[a.id].mini.status==='active');
    const start=Date.now();let last=0;
    while(a.state.players[a.id].mini.status==='active'){
      const g=a.state.players[a.id].mini,t=a.state.tick;
      if(Date.now()-start>19000)throw Error('Game did not finish');
      if(Date.now()-last>150){let input;
        if(['shoot','fish'].includes(g.kind)){const target=targets(g,t).find(t=>!t.hit);input={type:'aim',x:target.x,y:target.y};}
        if(g.kind==='ring')input={type:'throw',power:.55,aimX:.5};
        if(g.kind==='cook'){const index=g.cooked.findIndex((n,i)=>!n&&cookingPhase(g,i,t)==='gold');if(index!==-1)input={type:'flip',index};}
        if(g.kind==='fortune')input={type:'pick',index:0};
        if(g.kind==='ice')input=g.turns<12?{type:'turn'}:{type:'syrup',index:g.syrup};
        if(input){cmd(input);last=Date.now();}
      }
      await sleep(30);
    }
    assert.ok(a.acks.some(m=>m.session===session&&m.game?.status==='active'),'server acknowledges embedded inputs');const p=a.state.players[a.id];assert.equal(p.mini.result.won,true,`${s.game}: ${p.mini.result.reason}`);assert.ok(p.stamps.includes(s.id));assert.ok(p.mini.reward);
    const before={b:p.bottles,e:p.energy,w:p.ward,s:p.speedBoost};cmd({type:'pick',index:2,score:10000});await sleep(150);const after=a.state.players[a.id];assert.equal(after.bottles,before.b);assert.equal(after.energy,before.e);assert.ok(after.ward<=before.w);assert.ok(after.speedBoost<=before.s);
    console.log(`PASS ${s.game}: ${p.mini.reward}`);cmd({type:'close'});await until(()=>!a.state.players[a.id].mini);
    a.send({type:'action',action:'interact'});await sleep(200);assert.equal(a.state.players[a.id].mini,null,'cooldown enforced');
  }
  assert.equal(a.state.players[a.id].stamps.length,6);assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);console.log('PASS all six stalls over real sockets; independent movement, cooldowns and replay protection.');
}finally{for(const ws of sockets){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'leave'}));ws.close();}}
