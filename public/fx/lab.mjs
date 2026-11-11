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

if(mode==='world'){
  const {createRenderPipeline}=await import('../render/pipeline.mjs');
  const {PROFILES}=await import('../visual-quality.mjs');
  const {createEventBus}=await import('../events.mjs');
  const {createFx}=await import('./index.mjs');
  const {createVisitor,animateVisitor}=await import('../visitors.mjs');
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(50,W/H,.08,300);
  const pipeline=createRenderPipeline({canvas,scene,camera,width:W,height:H});
  const profile=q.get('profile')||'high';pipeline.applyProfile(PROFILES[profile]);pipeline.resize(W,H);canvas.dataset.quality=profile;
  // a small night stage: stone ground, lantern posts with warm pools
  const ground=new THREE.Mesh(new THREE.CircleGeometry(30,64),new THREE.MeshStandardMaterial({color:'#3a3f52',roughness:.95}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  for(const [x,z] of [[-5,-2],[5,-2],[-5,6],[5,6]]){const post=new THREE.Mesh(new THREE.BoxGeometry(.3,2.2,.3),new THREE.MeshStandardMaterial({color:'#5a3a26'}));post.position.set(x,1.1,z);scene.add(post);
    const lamp=new THREE.Mesh(new THREE.SphereGeometry(.35,16,12),new THREE.MeshStandardMaterial({color:'#ffb066',emissive:'#ff9c55',emissiveIntensity:2.2}));lamp.position.set(x,2.5,z);scene.add(lamp);
    const l=new THREE.PointLight('#ffb066',6,9,2);l.position.set(x,2.4,z);scene.add(l);}
  const shrine=new THREE.Mesh(new THREE.BoxGeometry(3,.25,2),new THREE.MeshStandardMaterial({color:'#8a3a2a'}));shrine.position.set(-4.5,.12,1.5);scene.add(shrine);
  const king=new THREE.Mesh(new THREE.SphereGeometry(1.1,24,16),new THREE.MeshStandardMaterial({color:'#4a2f6e',emissive:'#2a1240',roughness:.6}));king.position.set(0,2.2,-9);scene.add(king);
  const crew=[['a','mizu',0,2.5],['b','pon',2.4,2]].map(([id,c,x,z])=>{const r=createPlayerAvatar(c);r.root.position.set(x,0,z);scene.add(r.root);return {id,r,p:{...player(c,0),id,x,z}};});
  const guestRig=createVisitor(2);guestRig.root.position.set(-2.4,0,3.5);scene.add(guestRig.root);
  await waitModels(['mizu_yokai','mizu_human','pon_yokai','pon_human']);
  const state={tick:10,phase:'playing',players:Object.fromEntries(crew.map(c=>[c.id,c.p])),humans:[{id:'h1',x:-2.4,z:3.5,state:'waiting',name:'Guest'}],encounter:{x:0,z:-9}};
  const bus=createEventBus(),fx=createFx({scene,bus,pipeline,profile:()=>profile});
  camera.position.set(0,5.2,11.5);camera.lookAt(0,1.4,1.5);
  const at=(x,z,y=0)=>({x,y,z});
  const A=at(0,2.5),B=at(2.4,2),G=at(-2.4,3.5),K=at(0,-9);
  const ev=(type,extra={})=>({type,playerId:'a',position:A,tick:10,local:true,...extra});
  // scenarios: frame -> events
  const SCENES={
    charm:{frames:44,cues:{4:[ev('charm_cast',{guestId:'h1'})]}},
    ward:{frames:60,cues:{4:[ev('cover_ward')]}},
    potion:{frames:52,cues:{3:[ev('potion_pickup',{position:at(-1.2,3.2)})],20:[ev('potion_drink')]}},
    reveal:{frames:40,cues:{6:[ev('reveal_start',{part:'water dish'})],30:[ev('reveal_end')]}},
    delivery:{frames:52,cues:{4:[ev('guest_delivered',{position:at(-4.5,1.5),guestId:'h1'})]}},
    boss:{frames:64,cues:{4:[ev('boss_omen',{position:K,playerId:null,local:false})],22:[ev('spirit_bolt',{combo:false})],32:[ev('spirit_bolt',{position:B,playerId:'b',combo:true})],46:[ev('boss_banished',{position:K})]}},
    feet:{frames:44,cues:{2:[ev('footstep',{foot:'left'})],8:[ev('footstep',{foot:'right'})],14:[ev('jump')],30:[ev('land')]}},
    fireworks:{frames:72,cues:{2:[ev('round_start',{playerId:null,position:null})],30:[ev('round_end',{result:'won',playerId:null,position:null})]}}
  };
  const sc=SCENES[q.get('effect')||'charm'];
  if(sc===SCENES.fireworks){camera.position.set(0,3,14);camera.lookAt(0,9,-30);}
  if(sc===SCENES.boss){camera.position.set(3,6,10);camera.lookAt(0,1.8,-3);}
  window.labFx=fx;window.labScene=scene;window.labFrames=sc.frames;
  window.labFrame=(i,fps=24)=>{
    const time=i/fps,dt=1/fps;
    for(const e of sc.cues[i]||[])bus.emit(e.type,e);
    // a hop for the jump scenario so the dust has a body to come from
    const jumping=sc===SCENES.feet&&i>=14&&i<30;crew[0].p.height=jumping?Math.sin((i-14)/16*Math.PI)*1.1:0;
    for(const c of crew){animatePlayerAvatar(c.r,{...c.p,action:i>=4&&i<14&&sc===SCENES.charm&&c.id==='a'?'charm':'idle',cover:sc===SCENES.ward&&i>=4&&i<44&&c.id==='a'?1:0},dt,time,10,c.r.root.position,{form:'human',revealed:sc===SCENES.reveal&&i>=6&&i<30&&c.id==='a'});c.r.root.position.y=c.p.height;}
    animateVisitor(guestRig,{state:'waiting',x:-2.4,z:3.5,facing:0},dt,time,guestRig.root.position);
    king.position.y=2.2+Math.sin(time*2)*.1;king.visible=sc===SCENES.boss&&i<52;
    fx.update(dt,time+3,state);pipeline.update({dt,elapsed:time,focus:null,threat:null});pipeline.render(true);
    return {glow:fx.glow.count,smoke:fx.smoke.count,meshes:fx.meshes.live.length,played:fx.played.slice(-2)};
  };
  window.labReady=true;
}
