import * as THREE from 'three';
import {createPlayerAvatar as createAvatar,animatePlayerAvatar as animateAvatar} from './disguise.mjs';
import {CHARACTERS} from '/shared/world.mjs';
const canvas=document.querySelector('#rehearsal'),renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.setClearColor(0,0);
const descriptions=['Little steps, careful hands','A hungry, heavy-footed waddle','A curious neck and flowing twin tails','Two heads and fluttering wings','A sleepy cat, a very alert tail','Three lanterns, one wobbly stack','One foot, a cheerful little hop'];
const cast=CHARACTERS.map((character,i)=>{
  const card=document.createElement('section');card.className='card';card.setAttribute('aria-label',character.name);card.innerHTML=`<h2 class="name">${character.name}</h2><div class="stage"></div><p class="note">${descriptions[i]}</p>`;document.querySelector('#cast').append(card);
  const scene=new THREE.Scene(),rig=createAvatar(character.id);scene.add(rig.root);
  scene.add(new THREE.HemisphereLight('#d8ecff','#8a9572',1.3));const key=new THREE.DirectionalLight('#ffe3b3',2.7);key.position.set(-3,6,5);scene.add(key);const rim=new THREE.DirectionalLight('#a7dce6',1.8);rim.position.set(3,4,-3);scene.add(rim);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.15,.07,48),new THREE.MeshStandardMaterial({color:'#456267',roughness:1}));base.position.y=-.075;scene.add(base);
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.55,32),new THREE.MeshBasicMaterial({color:'#162e34',transparent:true,opacity:.3,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.scale.set(1,.7,1);shadow.position.y=-.03;scene.add(shadow);
  const camera=new THREE.PerspectiveCamera(34,1,.1,30);camera.position.set(2.4,2.6,6.8);camera.lookAt(0,1.55,0);
  return {card,stage:card.querySelector('.stage'),scene,rig,camera,shadow};
});
let form='human',mode='walk',time=0,last=performance.now(),nextProbe=0;
for(const button of document.querySelectorAll('[data-mode]'))button.onclick=()=>{mode=button.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));canvas.dataset.mode=mode;};
for(const button of document.querySelectorAll('[data-form]'))button.onclick=()=>{form=button.dataset.form;document.querySelectorAll('[data-form]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));canvas.dataset.form=form;};
function resize(){renderer.setSize(innerWidth,innerHeight,false);}resize();addEventListener('resize',resize);
function render(now){
  requestAnimationFrame(render);if(document.hidden){last=now;return;}const dt=Math.min(.05,(now-last)/1000);last=now;time+=dt;renderer.setScissorTest(false);renderer.clear();renderer.setScissorTest(true);
  for(const {card,stage,scene,rig,camera,shadow}of cast){
    const rect=stage.getBoundingClientRect();if(rect.bottom<0||rect.top>innerHeight)continue;
    const cycle=time%2.5,air=mode==='jump'&&cycle<.72,height=air?Math.max(0,6.2*cycle-8.5*cycle*cycle):0;
    const walking=mode==='walk',p={dx:walking?1:0,dz:0,action:['drink','charm'].includes(mode)?mode:'idle',height,vy:air?6.2-17*cycle:0,cover:mode==='cover'?1:0,facing:.1,actionUntil:0};
    animateAvatar(rig,p,dt,time,time,{x:walking?time*3.6:0,z:0},{form,progress:Math.min(1,(time%6)/4.2),revealed:form==='reveal'});shadow.scale.set(1-height*.18,.7-height*.12,1);shadow.material.opacity=.3-height*.1;
    camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();renderer.setViewport(rect.left,innerHeight-rect.bottom,rect.width,rect.height);renderer.setScissor(rect.left,innerHeight-rect.bottom,rect.width,rect.height);renderer.render(scene,camera);
    if(time>nextProbe)card.dataset.motion=JSON.stringify({character:rig.character,speed:rig.speed,legs:rig.legs.map(l=>l.rotation.x),arms:rig.arms.map(a=>a.rotation.x),waist:rig.waist.rotation.toArray().slice(0,3),cloth:rig.robe?.morphTargetInfluences,appearance:rig.root.userData.appearance,revealed:rig.root.userData.revealed,asset:rig.root.userData.modelAsset,modelStatus:rig.root.userData.modelStatus,weighted:!!rig.active.blenderModel?.bones.hem_L,secondary:rig.active.blenderModel?Object.fromEntries(['hem_L','hem_R','neck_mid','neck_tip','tail_mid','tail_tip'].filter(k=>rig.active.blenderModel.bones[k]).map(k=>[k,rig.active.blenderModel.bones[k].rotation.toArray().slice(0,3)])):{}});
  }
  if(time>nextProbe)nextProbe=time+.25;
}requestAnimationFrame(render);
