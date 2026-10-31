import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mkdir,writeFile} from 'node:fs/promises';
import {buildFestivalScenery} from '../public/festival-scenery.mjs';

// GLTFExporter uses the browser FileReader interface for its binary buffers.
globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(buffer=>{this.result=buffer;this.onloadend?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(buffer=>{this.result=`data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`;this.onloadend?.();});}
};
const scene=new THREE.Scene();buildFestivalScenery(scene);
const kit=scene.getObjectByName('mountain-festival-v02'),remove=[];
kit.traverse(n=>{if(n.isMesh&&n.material.isShaderMaterial)remove.push(n);});remove.forEach(n=>n.removeFromParent());
kit.traverse(n=>{if(n.isMesh&&n.material.opacity===1)n.material.transparent=false;});
const binary=await new GLTFExporter().parseAsync(kit,{binary:true,onlyVisible:true});
const out=new URL('../art/environment/festival-v02/',import.meta.url);await mkdir(out,{recursive:true});
await writeFile(new URL('festival-scenery-kit.glb',out),Buffer.from(binary));
console.log(`Saved static environment kit: ${binary.byteLength} bytes. Animated sky/water/petals remain in the live scenery module.`);
