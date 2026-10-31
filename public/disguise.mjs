import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {createAvatar,animateAvatar} from './avatar.mjs';
import {createVisitor} from './visitors.mjs';
import {animateCharacter} from './character-motion.mjs';
import {orb,group,surface} from './renderkit.mjs';
import {disguiseState} from '../shared/disguise.mjs';
import {attachBlenderModel,animateBlenderModel} from './model-assets.mjs';

export const HUMAN_STYLES={
 mizu:['#efcdb2','#253e40','#ff984b','waves','#294979','short'],
 pon:['#e1b392','#684437','#b74161','check','#ecb336','short'],
 kon:['#f4d4bc','#dcc394','#354a81','stars','#db613d','bob'],
 sumi:['#c7977a','#302c3f','#a0b489','flowers','#d45939','short'],
 nemu:['#f2c6b5','#948297','#a6b796','moon','#ac2c6c','bob'],
 akari:['#efc19a','#714332','#2d486e','flowers','#e46436','bun'],
 kasa:['#e9bdc8','#6d537f','#e7a73b','flowers','#556884','long'],
};
function copiedPart(parent,source,position,scale,sync){
  const target=cloneSkeleton(source);target.position.set(...position);target.scale.setScalar(scale);parent.add(target);
  const originals=[],copies=[];source.traverse(n=>originals.push(n));target.traverse(n=>copies.push(n));
  sync.push(()=>originals.forEach((n,i)=>{const c=copies[i];if(i===0){c.rotation.copy(n.rotation);return;}c.position.copy(n.position);c.rotation.copy(n.rotation);c.scale.copy(n.scale);}));return target;
}
function revealParts(r){
  const {human:h,yokai:y,character:id}=r,parts=[],sync=r.syncParts;
  const add=(parent)=>{const g=group(parent);g.name=`revealed-${id}-feature`;parts.push(g);return g;};
  if(id==='mizu'){
    const g=add(h.head);g.scale.setScalar(.86);g.position.y=.035;
    const colors=new Set(['92b943','95b73f','28cded','b6f7ff','26c7e6']);
    for(const child of y.head.children)if(child.isMesh&&colors.has(child.material.color?.getHexString()))g.add(child.clone());
  }
  if(id==='pon')copiedPart(add(h.body),y.tail,[0,.95,-.3],.63,sync);
  if(id==='kon'){
    for(const ear of y.ears)copiedPart(add(h.head),ear,[ear.position.x*.72,.45,-.04],.73,sync);
    copiedPart(add(h.body),y.tail,[0,.82,-.31],.48,sync);
  }
  if(id==='sumi')for(let i=0;i<2;i++){
    const wing=add(h.arms[i]),side=i===0?-1:1;for(let k=0;k<5;k++){const feather=orb(wing,'#4d486b',side*(.06+k*.06),-.12-k*.055,-.10,.10,.26,.075);feather.rotation.z=-side*(.4+k*.12);}
  }
  if(id==='nemu')copiedPart(add(h.body),y.tail,[0,.9,-.3],.68,sync);
  if(id==='akari'){
    const hand=add(h.arms[1]);hand.position.set(.06,-.49,.03);hand.scale.setScalar(.36);for(const mesh of y.lanterns[0].children)if(mesh.isMesh)hand.add(mesh.clone());
    const halo=orb(hand,surface('#ffd87e',{emissive:'#ffba53',emissiveIntensity:1.4,transparent:true,opacity:.16,depthWrite:false}),0,0,0,.58);halo.castShadow=false;
  }
  if(id==='kasa')copiedPart(add(h.head),y.umbrella,[0,.5,0],.56,sync);
  return parts;
}
export function createPlayerAvatar(character){
  if(!HUMAN_STYLES[character])throw Error('Unknown disguise');
  const root=new THREE.Group(),yokai=createAvatar(character),human=createVisitor(Object.keys(HUMAN_STYLES).indexOf(character),HUMAN_STYLES[character]);
  human.gaitKey=character==='kasa'?'visitor':character;root.name=`disguised-player-${character}`;root.userData.volumetric=true;root.userData.motionVersion='human-disguise-v1';root.add(yokai.root,human.root);
  attachBlenderModel(yokai,`${character}_yokai`,2.85);attachBlenderModel(human,`${character}_human`,2.55);
  const r={root,yokai,human,character,syncParts:[],appearance:'human',active:human,revealBlend:0};r.parts=revealParts(r);r.partScales=r.parts.map(n=>n.scale.clone());
  for(const key of ['arms','legs','waist','speed','gaitPhase','head','eyes'])Object.defineProperty(r,key,{get:()=>r.active[key]});
  yokai.root.visible=false;r.parts.forEach(n=>n.visible=false);return r;
}
export function animatePlayerAvatar(r,p,dt,time,tick,position,options={}){
  const delta=Math.atan2(Math.sin((p.facing||0)-r.root.rotation.y),Math.cos((p.facing||0)-r.root.rotation.y)),turn=delta*(1-Math.exp(-dt*12));r.root.rotation.y+=turn;
  r.root.rotation.z=THREE.MathUtils.lerp(r.root.rotation.z,p.health===0?.65:0,1-Math.exp(-dt*8));
  r.root.position.y=THREE.MathUtils.lerp(r.root.position.y,p.height||0,1-Math.exp(-dt*23));
  const pose={...p,facing:0,height:0,poseHeight:p.height||0,turnRate:turn/Math.max(dt,.001),action:['arrive','transform'].includes(p.action)?'idle':p.action};
  animateAvatar(r.yokai,pose,dt,time,tick,position);animateCharacter(r.human,pose,dt,time,tick,position);
  animateBlenderModel(r.yokai,pose,time);animateBlenderModel(r.human,pose,time);
  const progress=options.progress??1,transform=options.form==='transform',yokai=options.form==='yokai'||transform&&progress<.51;
  r.yokai.root.visible=yokai;r.human.root.visible=!yokai;r.active=yokai?r.yokai:r.human;
  r.appearance=yokai?'yokai':'human';
  const morph=transform?Math.sin(Math.PI*THREE.MathUtils.clamp((progress-.25)/.5,0,1)):0;
  r.yokai.root.scale.setScalar(1-morph*.18);r.human.root.scale.setScalar(1.06-morph*.13);
  const revealed=!yokai&&(options.revealed??disguiseState(p,tick).revealed);
  r.revealBlend=THREE.MathUtils.lerp(r.revealBlend,revealed?1:0,1-Math.exp(-dt*22));
  r.parts.forEach((part,i)=>{part.visible=r.revealBlend>.015;part.scale.copy(r.partScales[i]).multiplyScalar(Math.max(.001,r.revealBlend));});
  r.syncParts.forEach(fn=>fn());r.root.userData.appearance=r.appearance;r.root.userData.revealed=revealed;
  r.root.userData.motionVersion=r.active.root.userData.motionVersion;r.root.userData.modelStatus=r.active.root.userData.modelStatus;r.root.userData.modelAsset=r.active.root.userData.modelAsset;
}
