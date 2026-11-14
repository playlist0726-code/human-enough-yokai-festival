// Potion pickups, instanced (R04 part 2). The 15 potions used to be 15 groups of ~15 meshes
// (about 320 draw calls with shadows). Here every part is one InstancedMesh shared by all
// potions: glass, liquid (one per colour), gold/cork trim, sparkle, pedestal, halo ring, motes.
// game.js still gets one node per potion in `potionNodes` and only toggles node.visible;
// update() turns that into instance matrices (hidden potions collapse to zero scale).
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createPotion,surface} from './renderkit.mjs';

const SIZE=1.15;

/** Split one procedural potion into merged geometries by role. */
function potionParts(){
  const bottle=createPotion('#ff00ff',1);bottle.updateMatrixWorld(true);
  const buckets={glass:[],liquid:[],glow:[],solid:[]},materials={};
  bottle.traverse(o=>{
    if(!o.isMesh)return;
    const m=o.material,e=m.emissive?.getHexString?.(),role=m.transparent?'glass':e==='ff00ff'?'liquid':(m.emissiveIntensity>0&&e!=='000000')?'glow':'solid';
    let g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(g.index)g=g.toNonIndexed();
    for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);
    if(role==='solid'){const c=m.color,n=g.attributes.position.count,colors=new Float32Array(n*3);for(let i=0;i<n;i++){colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(colors,3));}
    buckets[role].push(g);materials[role]??=m;
  });
  const out={};
  for(const [role,list] of Object.entries(buckets))if(list.length){out[role]={geometry:mergeGeometries(list,false),material:materials[role]};list.forEach(g=>g.dispose());}
  return out;
}

/**
 * @param {THREE.Scene} scene
 * @param {{id:string,x:number,y:number,z:number,color:string}[]} spots
 * @param {Map<string,THREE.Object3D>} nodes  filled with one (empty) node per potion; node.visible drives the instance
 */
export function createPotionField(scene,spots,nodes){
  const root=new THREE.Group();root.name='potion-field';scene.add(root);
  const parts=potionParts(),n=spots.length,meshes=[];
  const add=(name,geometry,material,count,{shadow=false}={})=>{const m=new THREE.InstancedMesh(geometry,material,count);m.name=`potions:${name}`;m.castShadow=shadow;m.receiveShadow=false;m.frustumCulled=false;root.add(m);meshes.push(m);return m;};
  // bottle parts that spin and bob together
  const glass=parts.glass&&add('glass',parts.glass.geometry,parts.glass.material,n);
  const solid=parts.solid&&add('trim',parts.solid.geometry,surface('#ffffff',{vertexColors:true,metalness:.45,roughness:.38}),n,{shadow:true});
  const glow=parts.glow&&add('sparkle',parts.glow.geometry,parts.glow.material,n);
  const colors=[...new Set(spots.map(s=>s.color))],liquid=new Map();
  for(const color of colors){
    const mine=spots.filter(s=>s.color===color),m=parts.liquid.material.clone();m.color.set(color);m.emissive.set(color);
    liquid.set(color,{mesh:add(`liquid(${color})`,parts.liquid.geometry,m,mine.length,{shadow:true}),index:new Map(mine.map((s,i)=>[s.id,i]))});
  }
  // static pedestal and halo, counter-rotating motes
  const pedestal=add('pedestal',new THREE.CylinderGeometry(.39,.48,.15,20),surface('#5b5770'),n);
  const haloGeo=new THREE.TorusGeometry(.36,.02,6,32);haloGeo.rotateX(Math.PI/2);
  const halo=add('halo',haloGeo,surface('#52d4f5',{emissive:'#46bffd',emissiveIntensity:2}),n);
  const moteGeo=mergeGeometries(Array.from({length:5},(_,i)=>new THREE.OctahedronGeometry(.035).translate(Math.sin(i*2.4)*.43,.6+i*.16,Math.cos(i*2.4)*.43)),false);
  const motes=add('motes',moteGeo,surface('#e5f9ff',{emissive:'#a6eaff',emissiveIntensity:2.5}),n);
  spots.forEach(s=>{const node=new THREE.Group();node.name=s.id;node.position.set(s.x,s.y,s.z);root.add(node);nodes.set(s.id,node);});
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),p=new THREE.Vector3(),one=new THREE.Vector3(1,1,1),size=new THREE.Vector3(SIZE,SIZE,SIZE),zero=new THREE.Matrix4().makeScale(0,0,0);
  return {
    root,
    /** Draws used by all potions together (for tests and perf notes). */
    get meshCount(){return meshes.length;},
    update(time){
      spots.forEach((s,i)=>{
        const shown=nodes.get(s.id).visible,l=liquid.get(s.color);
        if(!shown){for(const mesh of [glass,solid,glow,pedestal,halo,motes])mesh?.setMatrixAt(i,zero);l.mesh.setMatrixAt(l.index.get(s.id),zero);return;}
        m.compose(p.set(s.x,s.y+.95+Math.sin(time*2+s.x)*.12,s.z),q.setFromAxisAngle(up,time*.55),size);
        glass?.setMatrixAt(i,m);solid?.setMatrixAt(i,m);glow?.setMatrixAt(i,m);l.mesh.setMatrixAt(l.index.get(s.id),m);
        m.compose(p.set(s.x,s.y+.07,s.z),q.identity(),one);pedestal.setMatrixAt(i,m);
        m.compose(p.set(s.x,s.y+.17,s.z),q,one);halo.setMatrixAt(i,m);
        m.compose(p.set(s.x,s.y,s.z),q.setFromAxisAngle(up,-time*.65),one);motes.setMatrixAt(i,m);
      });
      for(const mesh of meshes)mesh.instanceMatrix.needsUpdate=true;
    }
  };
}
