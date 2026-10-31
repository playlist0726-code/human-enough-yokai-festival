import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('..',import.meta.url));
async function sources(folder){const result=[];for(const entry of await readdir(folder,{withFileTypes:true})){const name=path.join(folder,entry.name);if(entry.isDirectory())result.push(...await sources(name));else if(/\.(html|css|mjs|js)$/.test(name))result.push(name);}return result;}
test('both game entry points and every shipped UI source use English',async()=>{
  for(const entry of ['public/index.html','public/minigames/index.html']){
    const html=await readFile(path.join(root,entry),'utf8');assert.match(html,/<html lang="en">/);assert.match(html,/<title>Human Enough!/);
  }
  const files=[...await sources(path.join(root,'public')),...await sources(path.join(root,'shared')),path.join(root,'server.mjs')];
  for(const file of files){
    // Input mappings intentionally accept Korean keyboard/IME characters; they are not UI copy.
    if(path.basename(file)==='controls.mjs')continue;
    const text=await readFile(file,'utf8');assert.doesNotMatch(text,/[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u,`${path.relative(root,file)} contains untranslated text`);
  }
});
