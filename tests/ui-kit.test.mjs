import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// R05 UI kit guards: referenced UI assets exist, no external font/style requests, icons share one grid.
const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>readFile(path.join(root,file),'utf8');

test('every /assets/ui/ reference in the UI sources points at a shipped file',async()=>{
  const sources=['public/index.html','public/style.css','public/foundation-ui.mjs','public/characters/portraits.mjs'];
  const missing=[];
  for(const file of sources){
    const text=await read(file);
    for(const [,ref] of text.matchAll(/\/assets\/ui\/([\w./-]+\.(?:svg|png|webp|woff2|json))/g)){
      try{await access(path.join(root,'public/assets/ui',ref));}catch{missing.push(`${file}: ${ref}`);}
    }
  }
  const journal=await read('public/foundation-ui.mjs');
  if(journal.includes('stamp-${stall.game}.svg')){
    const {STALLS}=await import('../shared/world.mjs');
    for(const stall of STALLS){try{await access(path.join(root,`public/assets/ui/icons/stamp-${stall.game}.svg`));}catch{missing.push(`stamp-${stall.game}.svg`);}}
  }
  assert.deepEqual(missing,[]);
});

test('UI fonts and styles are local (no external requests)',async()=>{
  const html=await read('public/index.html'),css=await read('public/style.css');
  assert.doesNotMatch(css,/@import|url\(\s*['"]?https?:/i);
  assert.doesNotMatch(html,/<link[^>]+href="https?:\/\/(?!human-enough)/i);
  assert.match(css,/@font-face\{font-family:'Fredoka';src:url\('\/assets\/ui\/fonts\//);
  assert.match(css,/@font-face\{font-family:'Nunito';src:url\('\/assets\/ui\/fonts\//);
});

test('icon family shares the 64 grid, ink line and cream rim',async()=>{
  const dir=path.join(root,'public/assets/ui/icons');const files=(await readdir(dir)).filter(f=>f.endsWith('.svg'));
  assert.ok(files.length>=17,`expected the full icon family, got ${files.length}`);
  for(const file of files){
    const svg=await readFile(path.join(dir,file),'utf8');
    assert.match(svg,/viewBox="0 0 64 64"/,file);assert.match(svg,/#2b2622/,`${file} ink line`);assert.match(svg,/#f4efe6/,`${file} cream rim`);
  }
});

test('portrait slot manifest is valid and lists only existing renders',async()=>{
  const manifest=JSON.parse(await read('public/assets/ui/portraits/index.json'));
  assert.ok(Array.isArray(manifest.portraits));
  for(const id of manifest.portraits)await access(path.join(root,`public/assets/ui/portraits/${id}.webp`));
});
