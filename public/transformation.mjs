// R10 opening: yokai -> toon smoke "POP" -> human, on lantern-lit wooden daises at night.
// API unchanged for game.js: createTransformation(renderer) -> {start(nodes), clear(), render(progress,time), duration, scene}.
// Timeline (progress 0..1 over DISGUISE.intro = 4.2 s; the rig swaps yokai -> human at 0.51):
//   0.00-0.40  gather: spirit wisps spiral in, light ring rises, slow camera push-in
//   0.40-0.47  anticipation: wisps tighten and brighten, low rumble
//   0.40-0.51  smoke builds and fully hides the body before the swap
//   0.51       POP: smoke burst, star sparks, floor shockwave, flash, camera kick
//   0.51-1.00  smoke dissolves, confetti sparkles drift down, camera settles
import * as THREE from 'three';
import {DISGUISE} from '../shared/disguise.mjs';
import {createPool,fxTexture,GLOW} from './fx/particles.mjs';

const POP=.51,SMOKE_START=.40;
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const clamp01=t=>Math.min(1,Math.max(0,t));
// damped spring response to an impulse at t=0 (jelly settle): amplitude * e^(-k t) * sin(w t)
const jelly=(t,k=5.5,w=15)=>t<0?0:Math.exp(-k*t)*Math.sin(w*t);
const hopArc=(t,d=.42)=>t<0||t>d?0:4*(t/d)*(1-t/d);

/**
 * Pose the legacy rig for the opening so nobody stands frozen: magic-hands 'charm' pose while
 * gathering, a 'ta-da' cover pose after the pop, and idle breathing otherwise. The rig's own
 * damped blends (character-motion.mjs) keep every change smooth. Everyone faces the camera.
 */
export function transformationPose(progress,i=0){
  const charm=progress>.16+i*.03&&progress<POP-.02,tada=progress>POP+.07+i*.025&&progress<.82+i*.02;
  return {action:charm?'charm':'idle',cover:tada?1:0,facing:0,height:0};   // face the opening camera (+z)
}

function warmPoolTexture(){
  const c=typeof document!=='undefined'?document.createElement('canvas'):null;if(!c)return null;c.width=c.height=128;
  const g=c.getContext('2d'),gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,190,120,.85)');gr.addColorStop(.45,'rgba(255,150,80,.32)');gr.addColorStop(1,'rgba(255,120,60,0)');
  g.fillStyle=gr;g.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

const PROFILE_BUDGET={high:1,balanced:.8,mobile:.5,light:.5};
export function createTransformation(renderer,{budget:fixed}={}){
  // mobile/light profiles emit half the particles (profile is set on the canvas by render/quality.mjs)
  let budget=fixed??1;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#121a30');scene.fog=new THREE.FogExp2('#18213d',.04);
  const camera=new THREE.PerspectiveCamera(36,1,.1,90);
  scene.add(new THREE.HemisphereLight('#8fa8ff','#3a2618',.4));
  const key=new THREE.DirectionalLight('#ffcf9a',2.6);key.position.set(-3,6,6);scene.add(key);
  const rim=new THREE.DirectionalLight('#8fa8ff',2.2);rim.position.set(3,4,-5);scene.add(rim);
  const pop=new THREE.PointLight('#ffe2b0',0,9,2);pop.position.set(0,1.6,1.2);scene.add(pop);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(40,64),new THREE.MeshStandardMaterial({color:'#1b2133',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.08;scene.add(floor);
  // backdrop: moon, stars, mountain silhouette, a string of paper lanterns
  const moon=new THREE.Mesh(new THREE.SphereGeometry(1.3,24,16),new THREE.MeshBasicMaterial({color:'#ffe9bd'}));moon.position.set(-8,9,-22);scene.add(moon);
  const starPos=new Float32Array(220*3);for(let i=0;i<220;i++){starPos[i*3]=Math.sin(i*93.1)*30;starPos[i*3+1]=4+(i*7.31%13);starPos[i*3+2]=-14-Math.abs(Math.sin(i*3.7))*18;}
  const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.BufferAttribute(starPos,3));scene.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:'#ffe9bd',size:.06,transparent:true,opacity:.7})));
  const ridge=new THREE.Shape();ridge.moveTo(-40,0);for(let x=-40;x<=40;x+=4)ridge.lineTo(x,3+Math.sin(x*.21)*1.6+Math.sin(x*.07)*2.4);ridge.lineTo(40,0);
  const mountains=new THREE.Mesh(new THREE.ShapeGeometry(ridge),new THREE.MeshBasicMaterial({color:'#1d2744',fog:false}));mountains.position.set(0,-.1,-26);scene.add(mountains);
  const poolTex=warmPoolTexture();
  const lanterns=[],lanternGeo=new THREE.SphereGeometry(.2,16,12),lanternMat=new THREE.MeshBasicMaterial({color:new THREE.Color('#ffb066').multiplyScalar(1.4)});
  const haloMat=poolTex?new THREE.SpriteMaterial({map:poolTex,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:.9,fog:false}):null;
  for(let i=0;i<11;i++){const l=new THREE.Mesh(lanternGeo,lanternMat);l.scale.set(1,1.3,1);l.position.set(-12.5+i*2.5,5.6+Math.cos(i*.9)*.3,-10);scene.add(l);lanterns.push(l);
    if(haloMat){const h=new THREE.Sprite(haloMat);h.scale.setScalar(2.1);l.add(h);}}
  const wire=new THREE.Line(new THREE.BufferGeometry().setFromPoints(lanterns.map(l=>l.position.clone().add(new THREE.Vector3(0,.45,0)))),new THREE.LineBasicMaterial({color:'#3a2a20'}));scene.add(wire);
  // particle pools live in this scene only
  const smoke=createPool({scene,kind:'smoke',capacity:140,map:fxTexture('/assets/fx/smoke-atlas.png'),grid:[4,4],renderOrder:12});
  const glow=createPool({scene,kind:'glow',capacity:520,map:fxTexture('/assets/fx/glow-atlas.png'),grid:[4,1],renderOrder:13});
  const shockMat=new THREE.MeshBasicMaterial({color:new THREE.Color('#ffd79a').multiplyScalar(2),transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  const ringGeo=new THREE.RingGeometry(.86,1,64);
  const dais=[],crew=[];let originals=new Map(),last=-1,lastTime=0,emitAcc=0;
  const overlay=document.querySelector('#transformation'),title=document.querySelector('#transformation-title'),caption=document.querySelector('#transformation-caption'),fill=document.querySelector('#transformation-progress');

  function clear(){
    for(const {node,parent}of originals.values()){node.scale.set(1,1,1);node.rotation.set(0,0,0);parent?.add(node);}originals.clear();crew.length=0;
    for(const d of dais){for(const m of d.meshes){scene.remove(m);if(m.geometry!==ringGeo)m.geometry.dispose();if(m.material!==shockMat&&m.material!==lanternMat)m.material.dispose();}}dais.length=0;
    smoke.clear();glow.clear();last=-1;emitAcc=0;overlay?.classList.add('hidden');
  }
  function start(nodes){
    clear();budget=fixed??PROFILE_BUDGET[renderer?.domElement?.dataset?.quality]??1;nodes.forEach((n,i)=>{
      originals.set(n.p.id,{node:n.group,parent:n.group.parent});scene.add(n.group);crew.push(n);const x=(i-(nodes.length-1)/2)*2.6;
      const top=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.15,.16,40),new THREE.MeshStandardMaterial({color:'#8a5230',roughness:.8,emissive:'#4a240e',emissiveIntensity:.45}));top.position.set(x,-.06,0);
      const trim=new THREE.Mesh(new THREE.TorusGeometry(1.08,.035,8,64),new THREE.MeshStandardMaterial({color:'#e9b765',metalness:.6,roughness:.35,emissive:'#7a5420',emissiveIntensity:.4}));trim.rotation.x=-Math.PI/2;trim.position.set(x,.03,0);
      const pool=new THREE.Mesh(new THREE.PlaneGeometry(4.2,4.2),new THREE.MeshBasicMaterial({map:poolTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.8}));pool.rotation.x=-Math.PI/2;pool.position.set(x,-.07,0);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.95,.03,8,64),new THREE.MeshBasicMaterial({color:new THREE.Color('#ffd79a').multiplyScalar(1.8),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));ring.rotation.x=-Math.PI/2;ring.position.set(x,.05,0);
      const shock=new THREE.Mesh(ringGeo,shockMat.clone());shock.rotation.x=-Math.PI/2;shock.position.set(x,.02,0);
      for(const m of [top,trim,pool,ring,shock])scene.add(m);
      dais.push({x,ring,shock,meshes:[top,trim,pool,ring,shock]});
    });overlay?.classList.remove('hidden');
  }
  function emitGather(x,dt,strength){
    emitAcc+=dt*55*strength*budget;
    while(emitAcc>=1){emitAcc--;const a=Math.random()*6.283,r=1.6+Math.random()*.6;
      glow.emit({x,y:.2,z:0,vy:.55+Math.random()*.5,life:1.1,size:.2+Math.random()*.14,sizeEnd:.07,color:Math.random()<.5?'#c9b6ff':'#ffd79a',intensity:3,alpha:.95,alphaEnd:0,frame:GLOW.dot,fadeIn:.25,
        swirl:{cx:x,cz:0,angle:a,radius:r,w:3.2+strength*2.5,vr:-1.3}});}
  }
  function emitSmoke(x){
    const n=Math.round(15*budget);
    for(let k=0;k<n;k++){const a=k/n*6.283+Math.random()*.4,r=.2+Math.random()*.4,up=((k*7)%n)/n;
      smoke.emit({x:x+Math.cos(a)*r*1.1,y:.5+up*2.3,z:.5+Math.sin(a)*r*.4,vx:Math.cos(a)*.9,vy:.25+up*.3,vz:Math.sin(a)*.6,drag:2.2,life:1.45+Math.random()*.3,
        size:.6+Math.random()*.25,sizeEnd:1.25+Math.random()*.35,color:'#f7f2ff',shade:'#8c7fc4',alpha:1,alphaEnd:1,fadeIn:0,spin:(Math.random()-.5)*.8,delay:Math.random()*.06});}
  }
  function emitCore(x){   // dense core in front of chest and head so the swap is never seen
    for(const [y,z,sz] of [[1.0,.75,1.15],[1.75,.8,1.2],[2.35,.7,1.05],[1.4,.55,1.25]])
      smoke.emit({x:x+(Math.random()-.5)*.2,y,z,vy:.12,drag:1,life:1.25+Math.random()*.2,size:.5,sizeEnd:sz,color:'#f7f2ff',shade:'#8c7fc4',alpha:1,alphaEnd:1,fadeIn:0,delay:.12+Math.random()*.05,spin:(Math.random()-.5)*.6});
  }
  function emitPop(x){
    const n=Math.round(10*budget);
    for(let k=0;k<n;k++){const a=k/n*6.283,s=2.4+Math.random()*1.2;   // outer puffs flung outward
      smoke.emit({x,y:1.3,z:.5,vx:Math.cos(a)*s,vy:Math.sin(a)*s*.7+.4,vz:.2,drag:3.2,life:1.2+Math.random()*.3,size:.45,sizeEnd:1.05,color:'#ffffff',shade:'#9d8fd6',alphaEnd:1,fadeIn:0,frame:undefined});}
    for(let k=0;k<Math.round(36*budget);k++){const a=Math.random()*6.283,e=Math.random()*1.2-.2,s=4+Math.random()*3.5;  // star sparks
      glow.emit({x,y:1.4,z:.3,vx:Math.cos(a)*Math.cos(e)*s,vy:Math.sin(e)*s+1,vz:Math.sin(a)*Math.cos(e)*s*.6,drag:3,gravity:2.5,life:.7+Math.random()*.5,size:.3,sizeEnd:.05,
        color:k%3?'#ffe2a6':'#e4dbff',intensity:3,alpha:1,alphaEnd:0,frame:GLOW.sparkle,fadeIn:0,spin:(Math.random()-.5)*4});}
    glow.emit({x,y:1.4,z:.6,life:.3,size:.9,sizeEnd:2.6,color:'#fff1d6',intensity:1.5,alpha:1,alphaEnd:0,frame:GLOW.dot,fadeIn:0});
    glow.emit({x,y:1.4,z:.6,life:.45,size:.6,sizeEnd:3.6,color:'#ffd79a',intensity:2,alpha:.9,alphaEnd:0,frame:GLOW.ring,fadeIn:0});
  }
  function emitConfetti(x,dt){
    if(Math.random()>dt*18*budget)return;
    glow.emit({x:x+(Math.random()-.5)*2.2,y:3.2+Math.random(),z:(Math.random()-.5)*1.2,vy:-.5,vx:(Math.random()-.5)*.3,life:1.6,size:.11,sizeEnd:.08,
      color:['#ffd79a','#ff9fc8','#c9b6ff','#9ee1e3'][Math.floor(Math.random()*4)],intensity:2,alpha:1,alphaEnd:0,frame:GLOW.sparkle,spin:3,fadeIn:.1});
  }

  function render(progress,time){
    const dt=last<0?1/60:THREE.MathUtils.clamp(time-lastTime,0,.1),count=crew.length;lastTime=time;
    const crossed=t=>last<t&&progress>=t;
    const pre=clamp01((progress-.4)/(POP-.4)),after=clamp01((progress-POP)/.12);
    crew.forEach((n,i)=>{
      const d=dais[i],x=d.x;n.group.position.set(x,0,0);n.label.visible=false;n.aura.visible=false;
      // whole-body secondary motion: each character on its own phase so the crew never moves in lockstep
      const ph=i*1.7,tPop=(progress-POP)*DISGUISE.intro-i*.04;
      const sway=Math.sin(time*1.6+ph)*.045*(1-pre*.6),bob=(Math.sin(time*3.2+ph)*.5+.5)*.035;
      const crouch=progress<POP?ease(pre):0;                                   // anticipation
      const squash=1-.13*crouch+.2*jelly(tPop)+.05*jelly(tPop-.5,4,11);         // pop stretch, jelly settle
      n.group.scale.set(1/Math.sqrt(squash),squash,1/Math.sqrt(squash));
      n.group.position.y=bob*(1-crouch)+hopArc(tPop)*.55;
      n.group.rotation.set(-.06*crouch+.08*jelly(tPop,5,9),Math.sin(time*.9+ph)*.18*(1-pre)+(i-(count-1)/2)*-.12,sway+.06*jelly(tPop-.08,4.5,12)*(i%2?1:-1));
      d.ring.position.y=.05+ease(Math.min(1,progress/POP))*1.25*(progress<POP?1:1-ease(after));
      d.ring.scale.setScalar(1-.35*pre+after*.6);d.ring.material.opacity=progress<POP?.55+.45*pre:1-after;d.ring.rotation.z=time*1.2;
      const sh=THREE.MathUtils.clamp((progress-POP)/.16,0,1);d.shock.scale.setScalar(.6+sh*3.6);d.shock.material.opacity=progress>=POP?(1-sh)*.9:0;
      if(progress<POP)emitGather(x,dt,.4+pre*1.6);
      if(crossed(SMOKE_START)){emitSmoke(x);emitCore(x);}
      if(crossed(POP))emitPop(x);
      if(progress>POP+.04&&progress<.9)emitConfetti(x,dt);
    });
    smoke.update(dt);glow.update(dt);
    lanterns.forEach((l,i)=>{l.rotation.z=Math.sin(time*1.3+i)*.08;});
    const flash=Math.max(0,1-Math.abs(progress-POP)/.03);pop.intensity=flash*30;
    // camera: slow push-in, rumble before the pop, kick on the pop, ease back out
    camera.aspect=innerWidth/innerHeight;
    const width=Math.max(3,(count-1)*2.6+2.9),base=Math.max(6.6,width/(2*Math.tan(36*Math.PI/360)*camera.aspect));
    const push=progress<POP?1.12-.2*ease(Math.min(1,progress/POP)):.92+.08*ease(THREE.MathUtils.clamp((progress-POP)/(1-POP),0,1));
    const trauma=Math.max(pre*pre*.25*(progress<POP?1:0),Math.max(0,1-(progress-POP)/.08)*(progress>=POP?1:0));
    const sx=(Math.sin(time*23)+Math.sin(time*31.7)*.5)*.045*trauma*trauma,sy=(Math.sin(time*27+1)+Math.sin(time*19.3)*.5)*.04*trauma*trauma;
    camera.position.set(Math.sin(time*.2)*.3+sx,2.3+sy,base*push);camera.lookAt(0,1.45,0);camera.rotation.z+=Math.sin(time*17)*.01*trauma*trauma;camera.updateProjectionMatrix();
    if(title){title.textContent=progress<.4?'Borrow a human face':progress<.7?'One little trick…':'Human enough. For now.';
      caption.textContent=progress<.7?'Hide your true shape before the festival gates open.':'Stay close. Every 15 seconds, your disguise may slip.';
      fill.style.width=`${progress*100}%`;overlay.style.setProperty('--flash',String(flash*.55));}
    last=progress;
    renderer.render(scene,camera);
  }
  return {start,clear,render,duration:DISGUISE.intro,scene,camera,pools:{smoke,glow}};
}
