// Festival kit runtime (R04). Loads the hand-modelled kit GLBs from public/assets/env/v2 and
// places them with as few draw calls as possible:
//   stalls         six GLBs share materials by name -> merged into one mesh per material
//   paper lanterns one InstancedMesh per part (and per paper tint)
//   stone lanterns one InstancedMesh per part
//   lane flagstones one InstancedMesh per tile variant, tinted per instance
// Every request takes a `fallback` that builds the old procedural version if a GLB fails to
// load, so the festival never ends up with holes. Sources: source/v2/environment/*.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Stall kind (STALLS[].game in shared/world.mjs) -> kit asset id. */
export const KIT_STALLS={shoot:'env_stall_shoot',fish:'env_stall_fish',ring:'env_stall_ring',cook:'env_stall_cook',fortune:'env_stall_fortune',ice:'env_stall_ice'};
/** Paper lantern body centre above the GLB origin (tassel tip), metres. Matches family.py LANTERN_CENTER. */
export const PAPER_LANTERN_CENTER=.62;
const BASE='/assets/env/v2/';

/**
 * @param {THREE.Scene} scene
 * @param {{water: () => THREE.Material}} options  water() returns the animated water material for kit_water
 */
export function createFestivalKit(scene,{water}){
  const root=new THREE.Group();root.name='festival-kit-v2';scene.add(root);
  const loader=new GLTFLoader(),cache=new Map(),materials=new Map();
  const load=id=>{if(!cache.has(id))cache.set(id,new Promise((resolve,reject)=>loader.load(`${BASE}${id}.glb`,resolve,undefined,reject)));return cache.get(id);};
  // Kit materials are shared by name across every GLB; duplicate textures are released.
  function shared(m){
    if(materials.has(m.name)){if(m.map&&m.map!==materials.get(m.name).map)m.map.dispose();return materials.get(m.name);}
    let out=m;
    if(m.name==='kit_water')out=water();
    else{m.vertexColors=true;if(m.map){m.map.anisotropy=8;m.map.wrapS=m.map.wrapT=THREE.RepeatWrapping;}}
    materials.set(m.name,out);return out;
  }
  const meshesOf=gltf=>{const list=[];gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(o.isMesh)list.push(o);});return list;};
  const mark=id=>{const o=new THREE.Object3D();o.name=id;root.add(o);};
  function addMesh(mesh){mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;}

  // ---- stalls -------------------------------------------------------------------------
  const stalls=[];
  /** Queue a stall GLB at `parent`'s world transform. */
  function stall(parent,id,fallback){
    parent.updateWorldMatrix(true,false);const matrix=parent.matrixWorld.clone();
    stalls.push(load(id).then(gltf=>({id,gltf,matrix})).catch(error=>{console.warn(`festival kit: ${id} failed, using the procedural stall`,error);fallback();return null;}));
  }
  function finishStalls(){
    return Promise.all(stalls).then(list=>{
      const buckets=new Map();
      for(const item of list){
        if(!item)continue;
        for(const o of meshesOf(item.gltf)){
          const material=shared(o.material),geo=o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(item.matrix,o.matrixWorld));
          if(!buckets.has(material))buckets.set(material,[]);buckets.get(material).push(geo);
        }
        mark(item.id);
      }
      for(const [material,geos] of buckets){
        const merged=geos.length>1?mergeGeometries(geos,false):geos[0];
        if(merged){if(geos.length>1)geos.forEach(g=>g.dispose());const mesh=addMesh(new THREE.Mesh(merged,material));mesh.name=`kit-stalls:${material.name||'water'}`;if(material.isShaderMaterial)mesh.castShadow=false;}
        else for(const g of geos)addMesh(new THREE.Mesh(g,material));
      }
    });
  }

  // ---- instanced props ----------------------------------------------------------------
  /** One InstancedMesh per GLB primitive. materialFor(mesh) may swap the material; tint sets instance colours. */
  function instances(gltf,name,matrices,{materialFor=o=>shared(o.material),colors=null,only=null}={}){
    const out=[];
    for(const o of meshesOf(gltf)){
      if(only&&!only(o))continue;
      const mesh=new THREE.InstancedMesh(o.geometry,materialFor(o),matrices.length),local=o.matrixWorld,m=new THREE.Matrix4();
      matrices.forEach((matrix,i)=>{mesh.setMatrixAt(i,m.multiplyMatrices(matrix,local));if(colors)mesh.setColorAt(i,colors[i]);});
      mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      mesh.name=`${name}:${o.material.name}`;mesh.computeBoundingSphere();out.push(addMesh(mesh));
    }
    return out;
  }

  const paper=[],stone=[],tiles=[];
  /** Paper lantern with its body centre at world (x, y, z); tint = paper colour or null for the default. */
  function paperLantern(x,y,z,tint,fallback){paper.push({matrix:new THREE.Matrix4().makeTranslation(x,y-PAPER_LANTERN_CENTER,z),tint:tint||'#ffb872',fallback});}
  /** Stone lantern standing at the given world matrix (origin on the ground). */
  function stoneLantern(matrix,fallback){stone.push({matrix:matrix.clone(),fallback});}
  /** Lane flagstone. variant: integer; color: THREE.Color multiplier. */
  function pathTile(matrix,variant,color,fallback){tiles.push({matrix:matrix.clone(),variant,color,fallback});}

  function finishProps(){
    const failed=(id,list)=>error=>{console.warn(`festival kit: ${id} failed, using procedural parts`,error);list.forEach(i=>i.fallback?.());};
    const jobsOut=[];
    if(paper.length)jobsOut.push(load('env_lantern_paper').then(gltf=>{
      const glow=new Map(),byTint=new Map();
      for(const p of paper){if(!byTint.has(p.tint))byTint.set(p.tint,[]);byTint.get(p.tint).push(p.matrix);}
      const isGlow=o=>o.material.name==='kit_glow';
      instances(gltf,'kit-paper-lanterns',paper.map(p=>p.matrix),{only:o=>!isGlow(o)});
      for(const [tint,matrices] of byTint)instances(gltf,`kit-paper-lanterns(${tint})`,matrices,{only:isGlow,materialFor:o=>{
        if(!glow.has(tint)){const m=o.material.clone();m.name='kit_glow';m.vertexColors=false;m.color.set(tint);m.emissive.set(tint);m.emissiveMap=m.map;m.emissiveIntensity=.42;m.roughness=.85;glow.set(tint,m);}
        return glow.get(tint);
      }}).forEach(mesh=>{mesh.castShadow=false;});
      mark('env_lantern_paper');
    }).catch(failed('env_lantern_paper',paper)));
    if(stone.length)jobsOut.push(load('env_lantern_stone').then(gltf=>{
      let fire=null;
      instances(gltf,'kit-stone-lanterns',stone.map(s=>s.matrix),{materialFor:o=>{
        if(o.material.name!=='kit_glow')return shared(o.material);
        if(!fire){fire=o.material.clone();fire.vertexColors=false;fire.color.set('#ffc98a');fire.emissive.set('#ffa450');fire.emissiveMap=fire.map;fire.emissiveIntensity=.75;}
        return fire;
      }});
      mark('env_lantern_stone');
    }).catch(failed('env_lantern_stone',stone)));
    if(tiles.length)jobsOut.push(load('env_path_tiles').then(gltf=>{
      const variants=meshesOf(gltf).sort((a,b)=>a.name.localeCompare(b.name));
      variants.forEach((o,k)=>{
        const mine=tiles.filter(t=>t.variant%variants.length===k);if(!mine.length)return;
        instances(gltf,'kit-path-tiles',mine.map(t=>t.matrix),{only:x=>x===o,colors:mine.map(t=>t.color)}).forEach(mesh=>{mesh.castShadow=false;});
      });
      mark('env_path_tiles');
    }).catch(failed('env_path_tiles',tiles)));
    return Promise.all(jobsOut);
  }

  let ready=null;
  return {
    root,stall,paperLantern,stoneLantern,pathTile,
    /** Asset ids this build will load (lookdev waits for their markers). */
    get ids(){return [...new Set([...stalls.length?Object.values(KIT_STALLS):[],...(paper.length?['env_lantern_paper']:[]),...(stone.length?['env_lantern_stone']:[]),...(tiles.length?['env_path_tiles']:[])])];},
    /** Call once after the world is laid out. Resolves when every kit asset is in the scene (or fell back). */
    finish(){ready??=Promise.all([finishStalls(),finishProps()]);return ready;},
    get ready(){return ready;}
  };
}
