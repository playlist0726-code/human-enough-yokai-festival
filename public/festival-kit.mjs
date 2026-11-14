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
    else{m.vertexColors=m.name!=='kit_glow';if(m.map){m.map.anisotropy=8;m.map.wrapS=m.map.wrapT=THREE.RepeatWrapping;}}
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

  // ---- unique structures (torii, gate, shrine, drum tower) ---------------------------------
  const structures=[];
  /**
   * Add a kit GLB as ordinary meshes under `parent` (local space). fade:true gives the structure its own
   * transparent material copies so festival-scenery's overhead fade can drive their opacity.
   */
  function structure(parent,id,{fallback=null,fade=false}={}){
    structures.push(load(id).then(gltf=>{
      const own=new Map();
      for(const o of meshesOf(gltf)){
        let material=shared(o.material);
        if(fade){if(!own.has(material)){const c=material.clone();c.transparent=true;own.set(material,c);}material=own.get(material);}
        else if(material.name==='kit_glow')material=glowMaterial(material,'#ffffff',.6);
        const mesh=new THREE.Mesh(o.geometry,material);mesh.applyMatrix4(o.matrixWorld);mesh.castShadow=mesh.receiveShadow=true;mesh.name=`${id}:${material.name}`;parent.add(mesh);
      }
      mark(id);
    }).catch(error=>{console.warn(`festival kit: ${id} failed, using the procedural structure`,error);fallback?.();}));
  }
  const glows=new Map();
  /** Emissive paper material: the kit_lantern gradient drives both colour and glow. */
  function glowMaterial(base,tint,intensity){
    const key=`${tint}|${intensity}`;
    if(!glows.has(key)){const m=base.clone();m.name='kit_glow';m.vertexColors=false;m.color.set(tint);m.emissive.set(tint);m.emissiveMap=m.map;m.emissiveIntensity=intensity;m.roughness=.9;glows.set(key,m);}
    return glows.get(key);
  }
  // Banner cloth sways in the vertex shader (flag hangs on +X of its pole).
  const wind={value:0};let flagMaterial=null;
  function swayMaterial(base){
    if(flagMaterial)return flagMaterial;
    const m=base.clone();m.name='kit_cloth_flag';m.side=THREE.DoubleSide;m.color.setScalar(1.55); // banners read as dyed cloth, not as mats, under the dim night ambient
    m.onBeforeCompile=shader=>{
      shader.uniforms.kitWind=wind;
      shader.vertexShader='uniform float kitWind;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifdef USE_INSTANCING
      float kitPhase=instanceMatrix[3].x*.9+instanceMatrix[3].z*.6;
      transformed.z+=sin(kitWind*1.7+kitPhase+position.y*1.6)*.11*position.x+sin(kitWind*2.9+kitPhase*1.7+position.y*3.1)*.03*position.x;
      #endif`);
    };
    m.customProgramCacheKey=()=>'kit-flag-sway-v1';flagMaterial=m;return m;
  }

  // ---- generic instanced props ----------------------------------------------------------
  const props=new Map();
  /** Instanced kit prop. node: mesh node name inside a multi-node GLB; color: per-instance tint. */
  function prop(id,matrix,{node=null,color=null}={}){
    const key=`${id}|${node||''}`;if(!props.has(key))props.set(key,{id,node,items:[]});
    props.get(key).items.push({matrix:matrix.clone(),color:color?new THREE.Color(color):null});
  }
  const pose=new THREE.Object3D();
  /** Convenience: prop at world x, y, z with yaw and uniform (or xyz) scale. */
  function propAt(id,x,y,z,{yaw=0,scale=1,tilt=0,node=null,color=null}={}){
    pose.position.set(x,y,z);pose.rotation.set(tilt,yaw,0,'YXZ');if(typeof scale==='number')pose.scale.setScalar(scale);else pose.scale.set(...scale);pose.updateMatrix();prop(id,pose.matrix,{node,color});
  }
  function finishGenericProps(){
    return [...props.values()].map(({id,node,items})=>load(id).then(gltf=>{
      const tinted=items.some(i=>i.color),white=new THREE.Color('#ffffff');
      instances(gltf,`kit-${node||id}`,items.map(i=>i.matrix),{
        only:node?(o=>o.name===node||o.parent?.name===node):null,
        colors:tinted?items.map(i=>i.color||white):null,
        materialFor:o=>{const m=shared(o.material);return node==='banner_flag'?swayMaterial(m):m.name==='kit_glow'?glowMaterial(m,'#ffffff',.6):m;}
      });
      mark(`${id}${node?':'+node:''}`);
    }).catch(error=>console.warn(`festival kit: ${id} failed (decorative, no fallback)`,error)));
  }

  const paper=[],stone=[],tiles=[];
  /** Paper lantern with its body centre at world (x, y, z); tint = paper colour or null for the default. */
  function paperLantern(x,y,z,tint,fallback){paper.push({matrix:new THREE.Matrix4().makeTranslation(x,y-PAPER_LANTERN_CENTER,z),tint:tint||'#ffffff',fallback});}
  /** Stone lantern standing at the given world matrix (origin on the ground). */
  function stoneLantern(matrix,fallback){stone.push({matrix:matrix.clone(),fallback});}
  /** Lane flagstone. variant: integer; color: THREE.Color multiplier. */
  function pathTile(matrix,variant,color,fallback){tiles.push({matrix:matrix.clone(),variant,color,fallback});}

  function finishProps(){
    const failed=(id,list)=>error=>{console.warn(`festival kit: ${id} failed, using procedural parts`,error);list.forEach(i=>i.fallback?.());};
    const jobsOut=[];
    if(paper.length)jobsOut.push(load('env_lantern_paper').then(gltf=>{
      const byTint=new Map();
      for(const p of paper){if(!byTint.has(p.tint))byTint.set(p.tint,[]);byTint.get(p.tint).push(p.matrix);}
      const isGlow=o=>o.material.name==='kit_glow';
      instances(gltf,'kit-paper-lanterns',paper.map(p=>p.matrix),{only:o=>!isGlow(o)});
      // lit paper: the gradient texture keeps a hot core and saturated orange ends instead of a flat white ball
      for(const [tint,matrices] of byTint)instances(gltf,`kit-paper-lanterns(${tint})`,matrices,{only:isGlow,materialFor:o=>glowMaterial(shared(o.material),tint,.62)}).forEach(mesh=>{mesh.castShadow=false;});
      mark('env_lantern_paper');
    }).catch(failed('env_lantern_paper',paper)));
    if(stone.length)jobsOut.push(load('env_lantern_stone').then(gltf=>{
      instances(gltf,'kit-stone-lanterns',stone.map(x=>x.matrix),{materialFor:o=>o.material.name==='kit_glow'?glowMaterial(shared(o.material),'#ffffff',.7):shared(o.material)});
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
    return Promise.all([...jobsOut,...finishGenericProps(),...structures]);
  }

  let ready=null;
  return {
    root,stall,paperLantern,stoneLantern,pathTile,structure,prop,propAt,
    /** Per-frame: banner sway. */
    update(time){wind.value=time;},
    /** Asset ids this build will load (lookdev waits for their markers). */
    get ids(){return [...new Set([...stalls.length?Object.values(KIT_STALLS):[],...(paper.length?['env_lantern_paper']:[]),...(stone.length?['env_lantern_stone']:[]),...(tiles.length?['env_path_tiles']:[])])];},
    /** Call once after the world is laid out. Resolves when every kit asset is in the scene (or fell back). */
    finish(){ready??=Promise.all([finishStalls(),finishProps()]);return ready;},
    get ready(){return ready;}
  };
}
