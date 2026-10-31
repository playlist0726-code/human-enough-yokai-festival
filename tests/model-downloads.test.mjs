import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCharacterModel,modelReport} from '../public/model-assets.mjs';
const emptyScene=()=>new Response(JSON.stringify({asset:{version:'2.0'},scene:0,scenes:[{}]}),{status:200});
test('model requests are shared and limited to three concurrent downloads',async()=>{
 const original=globalThis.fetch;let running=0,peak=0,requests=0;
 globalThis.fetch=async()=>{requests++;running++;peak=Math.max(peak,running);await new Promise(r=>setTimeout(r,15));running--;return emptyScene();};
 try{
  const first=loadCharacterModel('queue-test-0');assert.equal(loadCharacterModel('queue-test-0'),first);
  await Promise.all([first,...Array.from({length:6},(_,i)=>loadCharacterModel(`queue-test-${i+1}`))]);
  assert.equal(requests,7);assert.equal(peak,3);
 }finally{globalThis.fetch=original;}
});
test('a transient download failure retries automatically before declaring fallback',async()=>{
 const original=globalThis.fetch;let attempts=0;
 globalThis.fetch=async()=>{if(++attempts===1)throw new TypeError('Failed to fetch');return emptyScene();};
 try{await loadCharacterModel('transient-test');assert.equal(attempts,2);assert.ok(modelReport.loaded.has('transient-test'));assert.ok(!modelReport.failed.has('transient-test'));}
 finally{globalThis.fetch=original;}
});
test('missing files fail promptly and a later successful load clears the failure report',async()=>{
 const original=globalThis.fetch;let attempts=0;
 globalThis.fetch=async()=>{attempts++;return new Response('',{status:404});};
 try{
  await assert.rejects(loadCharacterModel('missing-test'),/404/);assert.equal(attempts,1);assert.ok(modelReport.failed.has('missing-test'));
  globalThis.fetch=async()=>emptyScene();await loadCharacterModel('missing-test');assert.ok(modelReport.loaded.has('missing-test'));assert.ok(!modelReport.failed.has('missing-test'));
 }finally{globalThis.fetch=original;}
});
