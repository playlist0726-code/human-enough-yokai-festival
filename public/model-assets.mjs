import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createPotion,POTION_COLORS} from './renderkit.mjs';

const loader=new GLTFLoader(),cache=new Map();
export const modelReport={loaded:new Set(),failed:new Set()};
export function loadCharacterModel(key){
  if(!cache.has(key))cache.set(key,loader.loadAsync(`/assets/models/${key}.glb`).then(g=>{modelReport.loaded.add(key);return g;}).catch(e=>{modelReport.failed.add(key);cache.delete(key);throw e;}));
  return cache.get(key);
}
// Merge only rigid, unanimated sibling meshes. Bones and face morphs survive.
function batchModel(root){
  root.updateMatrixWorld(true);const buckets=new Map();
  root.traverse(n=>{
    if(!n.isMesh||n.isSkinnedMesh||n.morphTargetInfluences?.length||Array.isArray(n.material)||n.material.transparent||n.material.transmission>0||/eye_|Eye|hand|Hand|potion|Potion/.test(n.name))return;
    const key=`${n.parent.uuid}:${n.material.uuid}:${Object.keys(n.geometry.attributes).sort().join(',')}`;
    if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(n);
  });
  for(const nodes of buckets.values()){
    if(nodes.length<2)continue;
    const parent=nodes[0].parent,inverse=parent.matrixWorld.clone().invert();
    const geos=nodes.map(n=>{const g=n.geometry.clone().applyMatrix4(inverse.clone().multiply(n.matrixWorld));return g.index?g.toNonIndexed():g;});
    const geometry=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());if(!geometry)continue;
    const m=new THREE.Mesh(geometry,nodes[0].material);m.name='blender-batched-part';m.castShadow=m.receiveShadow=true;parent.add(m);nodes.forEach(n=>n.removeFromParent());
  }
}
function roleOf(name){
  const raw=name.split('__').at(-1).replace(/\.\d+$/,'');
  return ({armL:'arm_L',armR:'arm_R',legL:'leg_L',legR:'leg_R','arm.L':'arm_L','arm.R':'arm_R','leg.L':'leg_L','leg.R':'leg_R'})[raw]||raw;
}
export function attachBlenderModel(r,key,height=2.7){
  if(typeof document==='undefined')return;
  r.root.userData.modelStatus='loading';
  // Capture only the original visual meshes, never later-added reveal features.
  const originals=[];r.root.traverse(n=>{if(n.isMesh||n.isLine)originals.push(n);});
  loadCharacterModel(key).then(g=>{
    const imported=cloneSkeleton(g.scene);imported.name=`blender-${key}`;imported.updateMatrixWorld(true);batchModel(imported);
    const box=new THREE.Box3().setFromObject(imported),size=box.getSize(new THREE.Vector3());
    if(!Number.isFinite(size.y)||size.y<=0)throw Error('Invalid model bounds');
    const wrapper=new THREE.Group(),scale=height/size.y;wrapper.name='blender-character-visual';wrapper.scale.setScalar(scale);
    imported.position.set(-(box.min.x+box.max.x)/2,-box.min.y,-(box.min.z+box.max.z)/2);wrapper.add(imported);
    const bones={},rest=new Map(),eyes=[],hipParts=[];let hand=null;
    imported.traverse(n=>{
      if(n.isMesh){n.castShadow=n.receiveShadow=true;if(n.material.map)n.material.map.anisotropy=4;}
      if(n.isBone){bones[roleOf(n.name)]=n;rest.set(n,{q:n.quaternion.clone(),p:n.position.clone(),s:n.scale.clone()});}
      if(n.isMesh&&(/eye_|Eye/.test(n.name)||n.morphTargetDictionary?.Blink!==undefined))eyes.push({node:n,scale:n.scale.clone()});
      if(n.isMesh&&/potion/i.test(n.name))hipParts.push(n);
      if(n.isMesh&&/hand/i.test(n.name)){let p=n.parent;while(p){if(roleOf(p.name)==='arm_R'){hand=n;break;}p=p.parent;}}
    });
    originals.forEach(n=>n.visible=false);r.root.add(wrapper);
    let heldPotion=null;
    if(!key.includes('_guest')){heldPotion=createPotion(POTION_COLORS[key.split('_')[0]],.42);heldPotion.visible=false;r.root.add(heldPotion);}
    r.blenderModel={wrapper,imported,bones,rest,eyes,key,hand,heldPotion,hipParts};r.root.userData.modelStatus='ready';r.root.userData.modelAsset=key;r.root.userData.motionVersion='blender-weighted-v3';
  }).catch(e=>{r.root.userData.modelStatus='fallback';console.warn(`Character model unavailable: ${key}`,e.message);});
}
const axisX=new THREE.Vector3(1,0,0),axisY=new THREE.Vector3(0,1,0),axisZ=new THREE.Vector3(0,0,1),rotation=new THREE.Quaternion();
export function animateBlenderModel(r,p,time){
  const m=r.blenderModel;if(!m)return;
  const moving=Math.min(1.2,r.motion||0),phase=r.gaitPhase||time*7,idle=1-Math.min(1,moving),breath=Math.sin(time*2.1+(r.phase||0));
  const airborne=(p.poseHeight??p.height??0)>.08,charm=p.action==='charm'||p.action==='strike'||!!p.sealing,drink=p.action==='drink',cover=p.cover>0;
  const twist=(name,x=0,y=0,z=0)=>{const n=m.bones[name],rest=m.rest.get(n);if(!n||!rest)return;n.quaternion.copy(rest.q);n.position.copy(rest.p);n.scale.copy(rest.s);for(const [a,v]of [[axisX,x],[axisY,y],[axisZ,z]])if(v)n.quaternion.multiply(rotation.setFromAxisAngle(a,v));};
  twist('body',airborne?-.1:Math.cos(phase*2)*.025*moving,Math.sin(phase)*.03*moving,Math.sin(phase)*.045*moving+breath*.008*idle);
  twist('head',breath*.02*idle-(drink?.12:0),Math.sin(time*.65)*.07*idle,Math.sin(phase-.4)*.025*moving);
  const swing=r.gaitKey==='kasa'||r.character==='kasa'?.28:.58;
  for(const [i,side]of ['L','R'].entries()){
    const s=i===0?1:-1,w=Math.sin(phase+i*Math.PI);
    twist(`leg_${side}`,airborne?-.48:w*swing*moving,0,airborne?s*.07:0);
    twist(`arm_${side}`,drink&&i===1?-1.6:charm?-1.02+Math.sin(time*8+i)*.1:cover?-.35:w*-.38*moving,0,cover?s*.85:airborne?s*.6:s*.035);
  }
  twist('tail',Math.sin(phase-.5)*.06*moving,Math.sin(time*1.7+phase*.4)*.13,Math.sin(phase-.8)*.10*moving);
  twist('neck',Math.sin(time*1.4)*.025,Math.sin(time*.8)*.035,Math.sin(phase-.8)*.065*moving);
  twist('extra_head',breath*.03,Math.sin(time*1.3+1)*.10,Math.sin(phase-.9)*.05*moving);
  twist('mask',Math.sin(time*1.8)*.04,Math.sin(time*.8)*.12,Math.sin(phase-.6)*.07*moving);
  twist('lantern_mid',0,0,Math.sin(time*1.8+phase*.4)*.035+Math.sin(phase)*.06*moving);
  twist('umbrella',0,Math.sin(time*.6)*.035,Math.sin(phase)*.06*moving);
  twist('hem_L',Math.sin(phase-.45)*.15*moving+(airborne?-.10:0),0,Math.sin(time*2.2)*.018);
  twist('hem_R',-Math.sin(phase-.45)*.15*moving+(airborne?-.10:0),0,-Math.sin(time*2.2)*.018);
  twist('neck_mid',Math.sin(time*1.5-.4)*.025,Math.sin(time*.8-.3)*.025,Math.sin(phase-1.1)*.045*moving);
  twist('neck_tip',Math.sin(time*1.5-.9)*.02,Math.sin(time*.8-.7)*.02,Math.sin(phase-1.5)*.04*moving);
  twist('tail_mid',Math.sin(time*1.6-.5)*.03,Math.sin(time*1.3-.5)*.055,Math.sin(phase-1)*.045*moving);
  twist('tail_tip',Math.sin(time*1.6-1)*.035,Math.sin(time*1.3-1)*.065,Math.sin(phase-1.5)*.05*moving);
  m.wrapper.position.y=Math.abs(Math.sin(phase))*(r.character==='kasa'?.12:.045)*moving+breath*.012*idle-(r.landing||0)*.04;
  const b=(time+(r.phase||0))%4.8,blink=b<.17?Math.sin(b/.17*Math.PI):0;
  for(const {node,scale}of m.eyes){
    if(node.morphTargetDictionary?.Blink!==undefined)node.morphTargetInfluences[node.morphTargetDictionary.Blink]=blink;
    else {node.scale.copy(scale);node.scale.z*=1-blink*.94;if(/glint/.test(node.name))node.visible=blink<.5;}
  }
  if(m.heldPotion){
    m.heldPotion.visible=drink;m.hipParts.forEach(n=>n.visible=!drink);
    if(drink){
      r.root.updateWorldMatrix(true,true);
      const position=new THREE.Vector3();
      if(m.hand){m.hand.getWorldPosition(position);r.root.worldToLocal(position);}
      else position.set(.4,1.9,.45);
      m.heldPotion.position.copy(position);m.heldPotion.position.z+=.10;m.heldPotion.rotation.x=1.05;
    }
  }
}
