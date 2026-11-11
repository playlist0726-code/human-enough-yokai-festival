#!/usr/bin/env node
// npm run check: syntax-check every .js/.mjs under public/, shared/, tools/ and scripts/, plus the
// root-level entry files (server.mjs, playtest-network.mjs, ...). Files are discovered automatically,
// so rooms never have to edit package.json when they add a module.
// Usage: node scripts/check-syntax.mjs [extra paths...]
import {readdir,stat} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {cpus} from 'node:os';
import path from 'node:path';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const DIRS=['public','shared','tools','scripts'];
const SKIP=new Set(['node_modules','vendor','addons','assets','dist','.git']);
const isCode=name=>/\.(mjs|js)$/.test(name);

async function walk(dir,out){
  for(const entry of await readdir(dir,{withFileTypes:true})){
    if(entry.name.startsWith('.')||SKIP.has(entry.name))continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())await walk(full,out);else if(entry.isFile()&&isCode(entry.name))out.push(full);
  }
  return out;
}

const files=[];
for(const dir of DIRS){try{await walk(path.join(root,dir),files);}catch(error){if(error.code!=='ENOENT')throw error;}}
for(const entry of await readdir(root,{withFileTypes:true}))if(entry.isFile()&&isCode(entry.name))files.push(path.join(root,entry.name));
for(const extra of process.argv.slice(2)){const full=path.resolve(extra);if((await stat(full)).isDirectory())await walk(full,files);else files.push(full);}
const unique=[...new Set(files)].sort();
if(!unique.some(f=>path.relative(root,f)==='server.mjs')){console.error('check-syntax: server.mjs not found');process.exit(1);}

const check=file=>new Promise(resolve=>execFile(process.execPath,['--check',file],(error,_out,stderr)=>resolve(error?{file,stderr}:null)));
const failures=[];let next=0;
await Promise.all(Array.from({length:Math.max(2,Math.min(8,cpus().length))},async()=>{
  while(next<unique.length){const failure=await check(unique[next++]);if(failure)failures.push(failure);}
}));
for(const {file,stderr} of failures)console.error(`\n✗ ${path.relative(root,file)}\n${stderr.trim()}`);
if(failures.length){console.error(`\ncheck-syntax: ${failures.length} of ${unique.length} files failed`);process.exit(1);}
console.log(`check-syntax: ${unique.length} files OK`);
