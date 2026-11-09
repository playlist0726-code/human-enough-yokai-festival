import {readdir,readFile,mkdir,writeFile,stat,rename,rm} from 'node:fs/promises';
import {gzip} from 'node:zlib';
import {promisify} from 'node:util';
import {execFile} from 'node:child_process';
import path from 'node:path';
const zip=promisify(gzip),run=promisify(execFile),root=process.cwd();let files=0,before=0,after=0;

// ---- Stage 1: v2 GLB compression (ASSET_CONTRACT §1) -------------------------------------
// Runtime GLBs in public/assets/{models,env}/v2 are compressed in place: Meshopt geometry and
// animation, KTX2 (UASTC) textures when `toktx` (KTX-Software) is installed, otherwise WebP.
// A file that already uses EXT_meshopt_compression is skipped, so the step is safe to rerun.
// The compressor is a devDependency: production installs (`npm ci --omit=dev`) only report
// files that still need compressing. Raw exports stay in art/<category>/v2/<id>/ (LFS).
const V2_DIRS=['public/assets/models/v2','public/assets/env/v2'];
async function glbFiles(dir){
  let out=[];
  try{for(const item of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())out=out.concat(await glbFiles(file));else if(item.name.endsWith('.glb'))out.push(file);}}catch{}
  return out;
}
export function glbJson(buffer){
  if(buffer.toString('utf8',0,4)!=='glTF')throw Error('not a GLB');
  return JSON.parse(buffer.toString('utf8',20,20+buffer.readUInt32LE(12)));
}
const isCompressed=json=>(json.extensionsUsed||[]).some(e=>/meshopt_compression/.test(e));
async function hasToktx(){try{await run('toktx',['--version']);return true;}catch{return false;}}

export async function compressV2({dirs=V2_DIRS,log=console.log}={}){
  const targets=[];for(const dir of dirs)targets.push(...await glbFiles(path.resolve(root,dir)));
  const pending=[];for(const file of targets)if(!isCompressed(glbJson(await readFile(file))))pending.push(file);
  if(!targets.length){log('v2 GLB compression: no v2 models yet.');return {compressed:0,pending:0};}
  if(!pending.length){log(`v2 GLB compression: all ${targets.length} v2 GLBs already compressed.`);return {compressed:0,pending:0};}
  let core,functions,extensions,meshoptimizer,sharp;
  try{[core,functions,extensions,meshoptimizer]=await Promise.all([import('@gltf-transform/core'),import('@gltf-transform/functions'),import('@gltf-transform/extensions'),import('meshoptimizer')]);}
  catch{log(`v2 GLB compression skipped: install dev dependencies to compress ${pending.length} file(s):\n  ${pending.map(f=>path.relative(root,f)).join('\n  ')}`);return {compressed:0,pending:pending.length};}
  try{sharp=(await import('sharp')).default;}catch{}
  const ktx2=await hasToktx();
  const io=new core.NodeIO().registerExtensions(extensions.ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':meshoptimizer.MeshoptEncoder,'meshopt.decoder':meshoptimizer.MeshoptDecoder});
  io.setLogger?.(new core.Logger(core.Logger.Verbosity.WARN));await meshoptimizer.MeshoptEncoder.ready;
  let compressed=0;
  for(const file of pending){
    const rel=path.relative(root,file),bytesBefore=(await stat(file)).size,tmp=`${file}.tmp.glb`;
    try{
      let source=file;
      if(ktx2){await run('npx',['--no-install','gltf-transform','uastc',file,tmp]);source=tmp;}
      const doc=await io.read(source);doc.setLogger(new core.Logger(core.Logger.Verbosity.WARN));
      // keepLeaves preserves empty socket nodes (socket_hand_R, ...); no flatten/join/simplify, so skins and sockets survive.
      const steps=[functions.dedup(),functions.prune({keepLeaves:true,keepAttributes:true,keepExtras:true}),functions.resample()];
      if(!ktx2&&sharp)steps.push(functions.textureCompress({encoder:sharp,targetFormat:'webp'}));
      steps.push(functions.meshopt({encoder:meshoptimizer.MeshoptEncoder,level:'medium'}));
      await doc.transform(...steps);
      await io.write(tmp,doc);await rename(tmp,file);compressed++;
      log(`v2 GLB: ${rel} ${(bytesBefore/1048576).toFixed(2)} MB → ${((await stat(file)).size/1048576).toFixed(2)} MB (meshopt + ${ktx2?'KTX2':sharp?'WebP':'original'} textures)`);
    }catch(error){await rm(tmp,{force:true});throw Error(`v2 GLB compression failed for ${rel}: ${error.message}`);}
  }
  if(!ktx2)log('note: toktx (KTX-Software) not found, textures were written as WebP. Install it for KTX2.');
  return {compressed,pending:0};
}

// ---- Stage 2: precompressed gzip copies for the static server ------------------------------
async function visit(relative){
  for(const item of await readdir(relative,{withFileTypes:true})){
    const file=path.join(relative,item.name);
    if(item.isDirectory()){await visit(file);continue;}
    if(!/\.(html|css|js|mjs|json|glb|svg|wasm)$/.test(file))continue;
    const source=await readFile(file);if(source.length<512)continue;
    const compressed=await zip(source,{level:9});if(compressed.length>=source.length*.95)continue;
    const target=path.join(root,'.cache','gzip',file);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,compressed);
    files++;before+=source.length;after+=compressed.length;
  }
}

if(process.argv[1]?.endsWith('build-production.mjs')){
  await compressV2();
  if(!process.argv.includes('--v2-only')){
    for(const directory of ['public','shared','node_modules/three/build','node_modules/three/examples/jsm'])await visit(directory);
    console.log(`Prepared ${files} compressed game assets: ${(before/1048576).toFixed(1)} MB → ${(after/1048576).toFixed(1)} MB.`);
  }
}
