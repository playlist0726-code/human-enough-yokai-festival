import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
const url=process.env.GAME_URL||'ws://127.0.0.1:4173';
const clients=[];
async function client(){
  const ws=new WebSocket(url),c={ws,id:null,state:null,errors:[]};clients.push(c);
  ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='hello')c.id=m.id;if(m.type==='state')c.state=m.state;if(m.type==='error')c.errors.push(m.message);});
  await until(()=>c.id);return c;
}
function send(c,message){c.ws.send(JSON.stringify(message));}
async function until(condition,timeout=5000){const start=Date.now();while(!condition()){if(Date.now()-start>timeout)throw Error('Timed out waiting for multiplayer state');await new Promise(r=>setTimeout(r,30));}}
try{
  const a=await client();send(a,{type:'join',character:'mizu',name:'QA A'});await until(()=>a.state);
  const code=a.state.code;
  for(const [i,char]of ['pon','kon','sumi'].entries()){const c=await client();send(c,{type:'join',code,character:char,name:`QA ${i+2}`});await until(()=>c.state);}
  await until(()=>clients.every(c=>Object.keys(c.state.players).length===4));
  send(clients[1],{type:'start'});await new Promise(r=>setTimeout(r,100));assert.equal(a.state.phase,'lobby');
  for(const c of clients.slice(1))send(c,{type:'ready',ready:true});await until(()=>Object.values(a.state.players).filter(p=>p.id!==a.id).every(p=>p.ready));
  send(a,{type:'start'});await until(()=>clients.every(c=>c.state.phase==='playing'));
  await until(()=>a.state.tick>2.1);const initial=a.state.players[a.id].z;
  const pulse=setInterval(()=>send(a,{type:'input',dx:0,dz:-1}),50);
  await until(()=>a.state.players[a.id].z<initial-2);clearInterval(pulse);send(a,{type:'input',dx:0,dz:0});
  await until(()=>clients.every(c=>c.state.players[a.id].z<initial-2));
  send(a,{type:'action',action:'jump'});
  await until(()=>clients.every(c=>c.state.players[a.id].height>.15));
  assert.ok(clients.every(c=>c.state.events.some(e=>e.fx==='jump'&&e.actor===a.id)));
  await until(()=>clients.every(c=>c.state.players[a.id].height===0));
  assert.ok(clients.every(c=>c.errors.length===0));
  send(clients[3],{type:'leave'});clients[3].ws.close();await until(()=>clients.slice(0,3).every(c=>Object.keys(c.state.players).length===3));
  console.log('PASS: four unique players join; host authority, movement and jump sync, landing, and disconnect cleanup verified.');
}finally{for(const c of clients)c.ws.close();}
