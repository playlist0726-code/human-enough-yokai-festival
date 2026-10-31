import test from 'node:test';
import assert from 'node:assert/strict';
import {createConnection} from '../public/connection.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function setup(token=null){
  const sockets=[],values=new Map(token?[['eve-human-enough-session-v1',token]]:[]),statuses=[],messages=[],errors=[];
  class Socket{constructor(){this.readyState=0;this.sent=[];sockets.push(this);}send(m){this.sent.push(JSON.parse(m));}close(){this.readyState=3;this.onclose?.();}receive(m){this.readyState=1;this.onmessage?.({data:JSON.stringify(m)});}}
  const c=createConnection({url:'ws://example',storage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},WebSocketImpl:Socket,onMessage:m=>messages.push(m),onStatus:s=>statuses.push(s),onError:m=>errors.push(m),onExpired:m=>errors.push(m),retryWindow:1500});
  return {c,sockets,values,statuses,messages,errors};
}
test('join is sent once after hello, rejects double-clicks, and saves an opaque resume token',()=>{
  const {c,sockets,values}=setup();try{
    assert.equal(c.join({type:'join',character:'mizu'}),true);assert.equal(c.join({type:'join',character:'pon'}),false);
    sockets[0].receive({type:'hello',id:'initial'});assert.equal(sockets[0].sent.length,1);
    sockets[0].receive({type:'joined',token:'secret',id:'a'});assert.equal(c.connected,true);assert.equal(values.get('eve-human-enough-session-v1'),'secret');
    c.leave();assert.equal(values.size,0);assert.equal(sockets[0].sent.at(-1).type,'leave');
  }finally{c.leave();}
});
test('refresh resumes instead of joining twice; stale socket messages cannot change current state',async()=>{
  const {c,sockets,messages}=setup('token');try{
    c.resume();sockets[0].receive({type:'hello'});assert.deepEqual(sockets[0].sent[0],{type:'resume',token:'token'});
    sockets[0].receive({type:'joined',token:'token',id:'same'});sockets[0].close();await sleep(280);
    assert.equal(sockets.length,2);sockets[0].receive({type:'state',state:{stale:true}});assert.equal(messages.some(m=>m.state?.stale),false);
    sockets[1].receive({type:'hello'});assert.equal(sockets[1].sent[0].type,'resume');
  }finally{c.leave();}
});
test('expired recovery clears token and stops retries; invalid room may be corrected on the same connection',()=>{
  const a=setup('expired');try{a.c.resume();a.sockets[0].receive({type:'hello'});a.sockets[0].receive({type:'resume_failed',message:'Expired'});assert.equal(a.values.size,0);assert.deepEqual(a.errors,['Expired']);}finally{a.c.leave();}
  const b=setup();try{b.c.join({type:'join',code:'WRONG'});b.sockets[0].receive({type:'hello'});b.sockets[0].receive({type:'error',message:'Missing'});assert.equal(b.c.join({type:'join',code:'RIGHT'}),true);assert.equal(b.sockets.length,1);assert.equal(b.sockets[0].sent.at(-1).code,'RIGHT');}finally{b.c.leave();}
});
test('round-trip measurements accept only the outstanding nonce and do not enter game messages',()=>{
 const {c,sockets,messages}=setup();try{
  c.join({type:'join'});sockets[0].receive({type:'hello'});sockets[0].receive({type:'joined',token:'test',id:'a'});c.ping();const ping=sockets[0].sent.at(-1);
  sockets[0].receive({type:'pong',nonce:ping.nonce-1});assert.equal(c.rtt,null);sockets[0].receive({type:'pong',nonce:ping.nonce});assert.ok(c.rtt>=0);assert.equal(messages.some(m=>m.type==='pong'),false);
 }finally{c.leave();}
});
