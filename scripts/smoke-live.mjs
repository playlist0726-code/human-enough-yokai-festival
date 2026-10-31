import {WebSocket} from 'ws';
import assert from 'node:assert/strict';
const base=new URL(process.argv[2]||'http://127.0.0.1:4173'),clients=[];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,timeout=18000){const start=Date.now();while(!fn()){if(Date.now()-start>timeout)throw Error('Live multiplayer check timed out');await sleep(40);}}
async function client(){
 const ws=new WebSocket(base.href.replace(/^http/,'ws')),c={ws,messages:[],state:null};clients.push(c);
 ws.on('message',raw=>{const m=JSON.parse(raw);c.messages.push(m);if(m.type==='hello')c.id=m.id;if(m.type==='joined')Object.assign(c,{id:m.id,token:m.token,code:m.code});if(m.type==='state')c.state=m.state;});
 ws.on('error',e=>{c.error=e.message;});await until(()=>c.id||c.error);if(c.error)throw Error(c.error);return c;
}
const send=(c,m)=>c.ws.send(JSON.stringify(m));
try{
 const health=await (await fetch(new URL('/health',base))).json();assert.equal(health.ok,true);
 const page=await fetch(base);assert.equal(page.status,200);assert.match(await page.text(),/Human Enough/);
 if(base.protocol==='https:'){
  const info=await (await fetch(new URL('/api/playtest',base))).json();assert.equal(info.public,true);assert.deepEqual(info.urls,[base.origin]);
 }
 const a=await client();send(a,{type:'join',name:'Launch check A',character:'mizu'});await until(()=>a.token);
 const b=await client();send(b,{type:'join',code:a.code,name:'Launch check B',character:'pon'});await until(()=>b.token&&Object.keys(a.state?.players||{}).length===2);
 send(b,{type:'ready',ready:true});await until(()=>a.state.players[b.id]?.ready);send(a,{type:'start'});await until(()=>a.state.phase==='playing'&&b.state.phase==='playing'&&a.state.tick>2);
 const oldX=a.state.players[a.id].x;send(a,{type:'input',dx:1,dz:0});await sleep(350);send(a,{type:'input',dx:0,dz:0});await until(()=>b.state.players[a.id].x>oldX+.1);
 send(a,{type:'action',action:'ping'});await until(()=>b.state.events.some(e=>e.fx==='ping'&&e.actor===a.id));
 send(a,{type:'action',action:'drink'});await until(()=>b.state.players[a.id].bottles===0&&b.state.players[a.id].energy>90);
 send(b,{type:'action',action:'cover'});await until(()=>a.state.players[b.id].cover>0);
 const token=a.token,id=a.id;a.ws.close();await until(()=>b.state.players[id].connected===false);
 const resumed=await client();send(resumed,{type:'resume',token});await until(()=>resumed.token&&b.state.players[id].connected);assert.equal(resumed.id,id);
 console.log(JSON.stringify({ok:true,origin:base.origin,checkedAt:new Date().toISOString(),checks:['HTTP health','game document','two real WebSocket clients','shared readiness and start','movement synchronization','help ping','potion synchronization','teammate ward','reconnect with same player'],physicalDevicesTested:false},null,2));
}finally{
 for(const c of clients)if(c.ws.readyState===WebSocket.OPEN){send(c,{type:'leave'});c.ws.close();}
 await sleep(150);for(const c of clients)c.ws.terminate();
}
