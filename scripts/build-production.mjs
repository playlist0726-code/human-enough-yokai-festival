import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import {gzip} from 'node:zlib';
import {promisify} from 'node:util';
import path from 'node:path';
const zip=promisify(gzip),root=process.cwd();let files=0,before=0,after=0;
async function visit(relative){
  for(const item of await readdir(relative,{withFileTypes:true})){
    const file=path.join(relative,item.name);
    if(item.isDirectory()){await visit(file);continue;}
    if(!/\.(html|css|js|mjs|json|glb|svg)$/.test(file))continue;
    const source=await readFile(file);if(source.length<512)continue;
    const compressed=await zip(source,{level:9});if(compressed.length>=source.length*.95)continue;
    const target=path.join(root,'.cache','gzip',file);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,compressed);
    files++;before+=source.length;after+=compressed.length;
  }
}
for(const directory of ['public','shared','node_modules/three/build','node_modules/three/examples/jsm'])await visit(directory);
console.log(`Prepared ${files} compressed game assets: ${(before/1048576).toFixed(1)} MB → ${(after/1048576).toFixed(1)} MB.`);
