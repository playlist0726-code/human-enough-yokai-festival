import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {createGameServer} from '../server.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=18000){const begin=Date.now();while(!f()){if(Date.now()-begin>ms)throw Error('Encounter synchronization timed out');await sleep(30);}}
test('real sockets share boss rehearsal, warnings, hearts and the same seal state without client authority',async()=>{
 const app=createGameServer(),clients=[];await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const origin=`ws://127.0.0.1:${app.server.address().port}`;
 async function client(){const ws=new WebSocket(origin),c={ws,state:null};clients.push(c);ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='hello')c.id=m.id;if(m.type==='joined'){c.code=m.code;c.token=m.token;}if(m.type==='state')c.state=m.state;});await until(()=>c.id);return c;}
 const send=(c,m)=>c.ws.send(JSON.stringify(m));
 try{
  const a=await client();send(a,{type:'join',name:'A',character:'mizu',mode:'boss'});await until(()=>a.code);
  const b=await client();send(b,{type:'join',name:'B',character:'pon',code:a.code});await until(()=>b.state?.players[b.id]);send(b,{type:'ready',ready:true});await until(()=>a.state.players[b.id]?.ready);send(a,{type:'start'});
  await until(()=>a.state?.phase==='playing');assert.equal(a.state.mode,'boss');assert.equal(a.state.players[a.id].health,4);
  send(a,{type:'action',action:'strike',damage:9999});await sleep(200);assert.equal(a.state.players[a.id].energy,70);
  await until(()=>a.state.encounter.phase==='assault'&&b.state.encounter.phase==='assault');assert.equal(a.state.encounter.maxHp,102);assert.equal(b.state.encounter.maxHp,102);assert.deepEqual(a.state.encounter.seals.map(s=>s.id),b.state.encounter.seals.map(s=>s.id));
  send(a,{type:'pause',paused:true});await sleep(100);assert.equal(a.state.paused,false,'online boss encounters cannot be frozen by one player');
  await until(()=>a.state.encounter.hazards.length>0);assert.ok(a.state.encounter.hazards.every(h=>h.startsAt>a.state.tick));assert.ok(a.state.encounter.hazards.every(h=>Number.isFinite(h.x)&&Number.isFinite(h.z)));
  send(a,{type:'action',action:'interact',target:a.state.encounter.seals[0].id});await sleep(200);assert.equal(a.state.encounter.seals[0].broken,false,'remote seal interactions cannot skip distance');
  const token=a.token,originalId=a.id,wave=a.state.encounter.wave;a.ws.close();await until(()=>b.state.players[originalId].connected===false);const resumed=await client();send(resumed,{type:'resume',token});await until(()=>resumed.state?.players[originalId]?.connected);assert.equal(resumed.state.encounter.wave,wave);assert.equal(resumed.state.players[originalId].id,originalId);assert.equal(resumed.state.encounter.maxHp,102);
 }finally{for(const c of clients)c.ws.terminate();await app.close();}
});
