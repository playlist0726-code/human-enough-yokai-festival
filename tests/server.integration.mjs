import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {createGameServer} from '../server.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
test('phone test endpoints, QR address validation, static page and real socket round-trip',async()=>{
 const app=createGameServer();let ws;
 try{
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${app.server.address().port}`;
  const info=await (await fetch(origin+'/api/playtest')).json();assert.equal(info.ok,true);assert.equal(info.lan,false);assert.deepEqual(info.urls,[]);
  assert.equal((await fetch(origin+'/phone-lab.html')).status,200);assert.equal((await fetch(origin+'/api/playtest/qr?address=evil.example')).status,400);
  ws=new WebSocket(origin.replace('http:','ws:'));await new Promise(r=>ws.on('open',r));const pong=new Promise(r=>ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='pong')r(m);}));ws.send(JSON.stringify({type:'ping',nonce:1234}));assert.equal((await pong).nonce,1234);
 }finally{ws?.terminate();await app.close();}
});
async function until(fn,ms=14000){const at=Date.now();while(!fn()){if(Date.now()-at>ms)throw Error('Timed out');await sleep(20);}}
test('hosted invitations expose only the configured public origin, and assets revalidate with ETags',async()=>{
 const app=createGameServer({publicBaseURL:'https://festival.example'});
 try{
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${app.server.address().port}`;
  const info=await (await fetch(origin+'/api/playtest')).json();assert.equal(info.public,true);assert.deepEqual(info.urls,['https://festival.example']);assert.equal('port' in info,false);
  const qr=await fetch(origin+'/api/playtest/qr?address=festival.example&room=ABCDE');assert.equal(qr.status,200);assert.match(await qr.text(),/<svg/);
  assert.equal((await fetch(origin+'/api/playtest/qr?address=127.0.0.1')).status,400);
  const asset=await fetch(origin+'/shared/world.mjs');assert.equal(asset.status,200);assert.equal(asset.headers.get('x-content-type-options'),'nosniff');assert.ok((await asset.text()).includes('CHARACTERS'));
  const again=await fetch(origin+'/shared/world.mjs',{headers:{'If-None-Match':asset.headers.get('etag')}});assert.equal(again.status,304);
  const uncompressed=await fetch(origin+'/shared/world.mjs',{headers:{'Accept-Encoding':'gzip;q=0, identity'}});assert.equal(uncompressed.headers.get('content-encoding'),null);assert.ok((await uncompressed.text()).includes('CHARACTERS'));
 }finally{await app.close();}
});
test('real sockets: readiness, countdown, restart protection, reconnect, host migration and explicit leave',async()=>{
  const app=createGameServer({reconnectMs:700}),clients=[];
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const url=`ws://127.0.0.1:${app.server.address().port}`;
  async function connect(){const ws=new WebSocket(url),c={ws,messages:[],state:null};clients.push(c);ws.on('message',raw=>{const m=JSON.parse(raw);c.messages.push(m);if(m.type==='hello')c.id=m.id;if(m.type==='joined')Object.assign(c,{id:m.id,token:m.token,code:m.code});if(m.type==='state')c.state=m.state;});await until(()=>c.id);return c;}
  const send=(c,m)=>c.ws.send(JSON.stringify(m));
  try{
    const a=await connect();send(a,{type:'join',character:'mizu',name:'A'});await until(()=>a.token);const code=a.code;
    const b=await connect();send(b,{type:'join',code,character:'pon',name:'B'});await until(()=>a.state&&Object.keys(a.state.players).length===2);
    send(a,{type:'start'});await sleep(80);assert.equal(a.state.phase,'lobby');
    send(b,{type:'ready',ready:true});await until(()=>a.state.players[b.id].ready);send(a,{type:'start'});await until(()=>a.state.phase==='countdown');await until(()=>a.state.phase==='disguising');assert.ok(a.state.introRemaining>0);assert.equal(a.state.time,480);await until(()=>a.state.phase==='playing');
    send(a,{type:'start'});await sleep(100);assert.equal(a.state.round,1);assert.equal(a.state.phase,'playing');
    send(a,{type:'pause',paused:true});await sleep(80);assert.equal(a.state.paused,false);
    const originalId=a.id,token=a.token;a.ws.close();await until(()=>b.state.players[originalId].connected===false);assert.equal(b.state.host,b.id);
    const resumed=await connect();send(resumed,{type:'resume',token});await until(()=>resumed.token);assert.equal(resumed.id,originalId);assert.equal(resumed.state?.code||resumed.code,code);await until(()=>b.state.players[originalId].connected);
    const takeover=await connect();send(takeover,{type:'resume',token});await until(()=>takeover.messages.some(m=>m.type==='resume_failed'));assert.equal(b.state.players[originalId].connected,true);
    send(resumed,{type:'leave'});await until(()=>!b.state.players[originalId]);const expired=await connect();send(expired,{type:'resume',token});await until(()=>expired.messages.some(m=>m.type==='resume_failed'));
    const remainingToken=b.token;b.ws.close();await sleep(850);const late=await connect();send(late,{type:'resume',token:remainingToken});await until(()=>late.messages.some(m=>m.type==='resume_failed'));
  }finally{for(const c of clients)c.ws.terminate();await app.close();}
});
test('real sockets: targeted potion assist, help ping and recovery after the whole crew disconnects',async()=>{
 const app=createGameServer({reconnectMs:4000}),clients=[];await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const url=`ws://127.0.0.1:${app.server.address().port}`;
 async function client(){const ws=new WebSocket(url),c={ws,state:null};clients.push(c);ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='hello')c.id=m.id;if(m.type==='joined')Object.assign(c,{id:m.id,token:m.token,code:m.code});if(m.type==='state')c.state=m.state;});await until(()=>c.id);return c;}
 const send=(c,m)=>c.ws.send(JSON.stringify(m));
 try{
  const a=await client();send(a,{type:'join',character:'mizu'});await until(()=>a.token);const b=await client();send(b,{type:'join',code:a.code,character:'pon'});await until(()=>b.token);
  send(b,{type:'ready',ready:true});await until(()=>a.state.players[b.id]?.ready);send(a,{type:'start'});await until(()=>a.state.phase==='playing'&&a.state.tick>2.1);
  send(a,{type:'action',action:'share',target:b.id});await until(()=>b.state.players[b.id].bottles===2);assert.equal(a.state.players[a.id].bottles,0);
  send(b,{type:'action',action:'ping'});await until(()=>a.state.players[b.id].pingUntil>a.state.tick);assert.ok(a.state.events.some(e=>e.fx==='ping'&&e.actor===b.id));
  const aid=a.id,at=a.token,bid=b.id,bt=b.token;a.ws.close();await until(()=>b.state.players[aid].connected===false);b.ws.close();await sleep(80);
  const ar=await client();send(ar,{type:'resume',token:at});await until(()=>ar.state);assert.equal(ar.state.host,aid);assert.equal(ar.state.players[aid].bottles,0);
  const br=await client();send(br,{type:'resume',token:bt});await until(()=>br.state?.players[bid].connected);assert.equal(br.state.host,aid);assert.equal(br.state.players[bid].bottles,2);
  for(const c of [ar,br])send(c,{type:'leave'});
 }finally{for(const c of clients)c.ws.terminate();await app.close();}
});
