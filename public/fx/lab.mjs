// R10 FX lab: deterministic frame-by-frame rendering of effects for review GIFs (see source/v2/fx/record_lab.py).
// /fx/lab.html?mode=transform&chars=mizu,pon,kon   -> window.labFrame(i, fps)
// /fx/lab.html?mode=world&char=mizu                 -> window.labEmit(type,payload), window.labFrame(i, fps)
import * as THREE from 'three';
import {createPlayerAvatar,animatePlayerAvatar} from '../disguise.mjs';
import {modelReport} from '../model-assets.mjs';
import {createTransformation,transformationPose} from '../transformation.mjs';

const q=new URLSearchParams(location.search),mode=q.get('mode')||'transform';
const W=+(q.get('w')||960),H=+(q.get('h')||540);
const canvas=document.createElement('canvas');document.body.append(canvas);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setSize(W,H,false);renderer.setPixelRatio(1);
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;
Object.defineProperty(window,'innerWidth',{get:()=>W});Object.defineProperty(window,'innerHeight',{get:()=>H});

const waitModels=keys=>new Promise(res=>{const t=setInterval(()=>{if(keys.every(k=>modelReport.loaded.has(k)||modelReport.failed.has(k))){clearInterval(t);res();}},100);});
const player=(id,i)=>({id:`p${i}`,character:id,facing:0,health:3,height:0,action:'idle',x:0,z:0});

if(mode==='transform'){
  const chars=(q.get('chars')||'mizu,pon,kon').split(',');
  const tf=createTransformation(renderer,{budget:+(q.get('budget')||1)});
  const nodes=chars.map((c,i)=>{const r=createPlayerAvatar(c),group=new THREE.Group();group.add(r.root);return {p:player(c,i),r,group,label:{visible:false},aura:{visible:false}};});
  await waitModels(chars.flatMap(c=>[`${c}_yokai`,`${c}_human`]));
  tf.start(nodes);
  window.labFrame=(i,fps=24)=>{
    const time=i/fps,progress=Math.min(1,time/tf.duration);
    nodes.forEach((n,k)=>{Object.assign(n.p,transformationPose(progress,k));animatePlayerAvatar(n.r,n.p,1/fps,time,0,{x:0,z:0},{form:'transform',progress});});
    tf.render(progress,time);return {progress,done:progress>=1,particles:tf.pools.smoke.count+tf.pools.glow.count};
  };
  window.labFrames=Math.ceil(tf.duration*24)+6;
  window.labReady=true;
}
