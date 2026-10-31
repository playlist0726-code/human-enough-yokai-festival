import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
const ws=new WebSocket(process.env.GAME_URL||'ws://127.0.0.1:4173');
let id,state,pulse;const feedback=[];
ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='hello')id=m.id;if(m.type==='state')state=m.state;if(m.type==='feedback'||m.type==='error')feedback.push(m.message);});
const send=m=>ws.send(JSON.stringify(m));
async function until(condition){const start=Date.now();while(!condition()){if(Date.now()-start>14000)throw Error('Action integration timed out');await new Promise(r=>setTimeout(r,15));}}
try{
  await until(()=>id);send({type:'join',name:'Action QA',character:'mizu'});await until(()=>state);send({type:'start'});await until(()=>state?.tick>2);
  pulse=setInterval(()=>send({type:'input',dx:0,dz:-1}),40);
  await until(()=>state.humans.some(h=>Math.hypot(h.x-state.players[id].x,h.z-state.players[id].z)<2.2));clearInterval(pulse);send({type:'input',dx:0,dz:0});
  // Consecutive frames reproduce the E-dialogue -> F-charm bug.
  send({type:'action',action:'interact'});send({type:'action',action:'charm'});
  await until(()=>state.humans.some(h=>h.owner===id));
  const guestId=state.humans.find(h=>h.owner===id).id;
  assert.ok(state.events.some(e=>e.type==='talk'));assert.ok(state.events.some(e=>e.fx==='charm'&&e.actor===id));
  await until(()=>state.tick>state.players[id].busyUntil);send({type:'action',action:'drink'});send({type:'action',action:'cover'});
  await until(()=>state.events.some(e=>e.fx==='drink')&&state.events.some(e=>e.fx==='cover'));
  assert.ok(state.players[id].energy>90);assert.ok(state.players[id].cover>0);assert.deepEqual(feedback,[]);
  await until(()=>state.humans.find(h=>h.id===guestId)?.state==='waiting');
  const stopped={...state.humans.find(h=>h.id===guestId)};assert.equal(stopped.owner,null);await new Promise(r=>setTimeout(r,450));const after=state.humans.find(h=>h.id===guestId);assert.equal(after.x,stopped.x);assert.equal(after.z,stopped.z);
  console.log('PASS: E -> F and Q -> C work; a five-second charm ends with the guest waiting in the same spot.');
}finally{clearInterval(pulse);if(ws.readyState===WebSocket.OPEN)send({type:'leave'});ws.close();}
