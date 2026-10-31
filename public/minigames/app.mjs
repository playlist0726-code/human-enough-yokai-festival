import * as THREE from 'three';
import {createFirstPerson} from './first-person.mjs';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createAvatar,animateAvatar} from '/avatar.mjs';
import {createVisitor,animateVisitor} from '/visitors.mjs';
import {surface,fabric,orb,softBox,tube,ring,group,curve,batchRigidParts} from '/renderkit.mjs';
import {timber,stoneSurface} from '/art-materials.mjs';
import {GAMES,createGame,inputGame,advanceGame,targets,ringPosition,cookingPhase,syrupName} from '/shared/minigames.mjs';
import {loadSettings,saveSettings} from '/profile.mjs';
import {CHANNEL,isFrameMessage} from '/shared/stall-protocol.mjs';
const embedded=new URLSearchParams(location.search).get('embedded')==='1'&&parent!==window;
document.body.classList.toggle('embedded',embedded);
if(embedded)document.querySelector('.brand').removeAttribute('href');
let hostSession=null,hostTick=0,hostReceived=0,requestSeq=0,pending=new Map();
const gameNow=()=>embedded?hostTick+Math.min(.35,(performance.now()-hostReceived)/1000):performance.now()/1000;
function hostInput(input,target){
 const requestId=++requestSeq;
 pending.set(requestId,{input,target:target?.clone(),score:game?.score||0,attempts:game?.attempts||0,turns:game?.turns||0});
 parent.postMessage({channel:CHANNEL,type:'input',session:hostSession,requestId,input},location.origin);
}
function hostClose(){if(hostSession)parent.postMessage({channel:CHANNEL,type:'close',session:hostSession},location.origin);}
const $=id=>document.getElementById(id),clock=new THREE.Clock();
const cast={mizu:'Mizu',pon:'Pon',kon:'Kon',sumi:'Sumi',nemu:'Nemu',akari:'Akari',kasa:'Kasa'};
const names={fish:'Goldfish Scooping',ring:'Ring Toss',shoot:'Cork Shooting',cook:'Takoyaki',fortune:'Lucky Draw',ice:'Moonlight Shaved Ice'};
const icons={fish:'◌',ring:'◎',shoot:'⊕',cook:'●',fortune:'✿',ice:'❄'};
const hints={fish:'Drag the net under a fish, then release to lift',ring:'Pull back, then release at golden power',shoot:'Drag to aim, then fire',cook:'Watch the griddle and flip each golden takoyaki',fortune:'Grab a lucky bag and pull upward',ice:'Circle the handle to shave the ice'};
const instructions={
 shoot:'Aim down the cork gun. Drag the crosshair onto a prize, then press Fire. Hit 3 prizes with 6 shots!',
 fish:'Slide the paper net under a goldfish. Release your finger or press Lift the net. Catch 3 fish!',
 ring:'Hold the button or drag upward to charge your throw. Aim at the center and release in the golden zone. Land 3 of 5 rings!',
 cook:'Look down at your griddle. Tap a golden takoyaki or aim the pick and press Flip. Cook 4 of 6!',
 fortune:'Grab a lucky bag and pull it upward to reveal a surprise. You can also choose with keys 1–3.',
 ice:'Circle the handle twice or press Turn handle 12 times. Then choose the syrup shown in the order.'
};
let fps,aimScreen=new THREE.Vector2(),gesture={held:false,power:0,angle:0};
const flavors={mizu:'Keep your water dish steady as you reach.',pon:'Your belly-mouth grins at the challenge.',kon:'Your long neck gives you a curious view.',sumi:'Both heads are watching. Try to agree!',nemu:'Your tail-mask watches with sleepy eyes.',akari:'Three lanterns sway with every move.',kasa:'Balance carefully on your one big foot.'};
let selected='mizu',kind='fish',game=null,rig,shop,objects=[],interactives=[],ready=false;
let lastInput=-9,action={start:-9,target:new THREE.Vector3(),good:false,type:''},feedbackUntil=0,resultShown=false;
let stamps;try{stamps=new Set(JSON.parse(localStorage.getItem('eve-festival-stamps-v1')||'[]'));}catch{stamps=new Set();}
let soundStore;try{soundStore=localStorage;}catch{}
let sound=loadSettings(soundStore).sound,audio;
function showSound(){$('sound').textContent=sound?'Sound on':'Sound off';$('sound').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on');}
showSound();
function tone(good=true){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const t=audio.currentTime;for(let i=0;i<2;i++){const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=(good?660:230)*(i?1.5:1);g.gain.setValueAtTime(.045,t+i*.09);g.gain.exponentialRampToValueAtTime(.001,t+.25+i*.09);o.connect(g);g.connect(audio.destination);o.start(t+i*.09);o.stop(t+.28+i*.09);}}catch{}}
$('sound').onclick=()=>{sound=!sound;showSound();const settings=loadSettings(soundStore);settings.sound=sound;saveSettings(soundStore,settings);if(embedded&&hostSession)parent.postMessage({channel:CHANNEL,type:'sound',session:hostSession,enabled:sound},location.origin);if(sound)tone();};
function feedback(text,good=true){$('feedback').textContent=text;$('feedback').classList.add('show');feedbackUntil=performance.now()/1000+1.4;tone(good);if(navigator.vibrate&&matchMedia('(pointer:coarse)').matches)navigator.vibrate(good?18:35);}
const scene=new THREE.Scene();scene.background=new THREE.Color('#253d50');scene.fog=new THREE.Fog('#253d50',21,55);
let renderer;try{renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'});}catch(e){$('loading').classList.add('hidden');$('fatal').classList.remove('hidden');throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const camera=new THREE.PerspectiveCamera(40,1,.1,100),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
scene.add(new THREE.HemisphereLight('#b8e3ef','#6b694e',1.5));
const moon=new THREE.DirectionalLight('#c2d9ff',1.7);moon.position.set(5,12,8);moon.castShadow=true;moon.shadow.mapSize.set(1024,1024);moon.shadow.camera.left=-8;moon.shadow.camera.right=8;moon.shadow.camera.top=8;moon.shadow.camera.bottom=-8;moon.shadow.normalBias=.035;scene.add(moon);
const key=new THREE.PointLight('#ffcf85',68,15,2);key.position.set(0,4,2);scene.add(key);
const floor=softBox(scene,stoneSurface('#8a9986'),0,-.19,0,15,.3,14,.1);
for(let x=-7;x<=7;x+=1.2)for(let z=-5;z<=5;z+=1.2){const tile=softBox(scene,stoneSurface((x+z)%2?'#8e9c8d':'#a2aa96'),x,-.008,z,1.14,.06,1.14,.07);tile.rotation.y=Math.sin(x*7+z*3)*.025;}
for(const x of [-7,7]){softBox(scene,timber('#9f5848'),x,.7,-2,.16,1.5,9);for(let z=-6;z<3;z+=1.7)softBox(scene,timber('#b5694f'),x,.8,z,.25,1.6,.25);softBox(scene,timber('#9f5848'),x,.7,-2,.15,.16,9);softBox(scene,timber('#bd7657'),x,1.4,-2,.24,.18,9);}
for(let i=0;i<12;i++){const x=Math.cos(i*2.4)*13,z=-11-(i%4)*3,h=4+(i%3)*2;orb(scene,'#344f50',x,h*.2,z,4,h,3);for(let j=0;j<3;j++){const m=new THREE.Mesh(new THREE.ConeGeometry(1.7-j*.35,2,7),surface('#254f46'));m.position.set(x,1.7+j*1.1,z+2);scene.add(m);}}
for(let i=0;i<80;i++)orb(scene,surface('#d9e8dc',{emissive:'#d9e8dc',emissiveIntensity:1}),Math.sin(i*78)*30,8+Math.cos(i*16)*12,-20-Math.abs(Math.cos(i*37))*14,.025);
const lanterns=[];
function lantern(parent,x,y,z,color='#f5b96b'){const g=group(parent,x,y,z);orb(g,surface(color,{emissive:color,emissiveIntensity:.5}),0,0,0,.19,.27,.19);for(let j=-2;j<=2;j++){const r=ring(g,'#bb854d',.175,.008,0,j*.085,0);r.rotation.x=Math.PI/2;}tube(g,'#72533e',.11,.11,.05,0,.27,0);tube(g,'#72533e',.11,.11,.05,0,-.27,0);lanterns.push(g);return g;}
curve(scene,'#6e6651',[[-8,5,-6],[0,4.2,-6],[8,5,-6]],.025);for(let i=0;i<11;i++)lantern(scene,-7+i*1.4,4.2+Math.pow((i-5)/7,2),-6);
const permanent=new THREE.Group();scene.add(permanent);
const wood=timber('#a57550'),dark=timber('#70513f');
for(const x of [-3.4,3.6])for(const z of [-2.7,1.9])softBox(permanent,wood,x,2.1,z,.14,4.2,.14,.025);
const roof=softBox(group(permanent),fabric('#386676','waves','#f4dfb3'),.1,4.15,-.4,7.4,.17,5.1,.03);
const awning=softBox(group(permanent),fabric('#386676','waves','#f4dfb3'),.1,3.86,1.95,7.15,.57,.07,.02);
softBox(permanent,wood,.1,.75,-2.65,7,.9,.15,.03);
for(let i=0;i<5;i++)lantern(permanent,-2.6+i*1.35,3.5,1.6);
for(const x of [-2.7,2.7]){softBox(permanent,wood,x,.28,-3.2,1.1,.5,.8);softBox(permanent,dark,x,.56,-3.2,1.2,.09,.9);}
let vendor=createVisitor(2);vendor.root.position.set(1.1,0,-2);scene.add(vendor.root);
const fan=vendor.arms[1].children.find(n=>n.isGroup);if(fan)fan.visible=false;
let flights=[];const stand=group(scene);let held,handTool,toolTip,projectile,crank,iceMound,confetti=[],ripples=[],catchBowl;
function textPlaque(text,color='#f6dfaf'){
 const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,512,128);ctx.fillStyle='#654737';ctx.font='bold 62px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,68);
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(2.8,.7),new THREE.MeshBasicMaterial({map}));m.position.set(1,3.78,2.01);return m;
}
const plaque=textPlaque(names.fish);scene.add(plaque);
function addInteractive(obj,type,index){obj.userData.hitType=type;obj.userData.hitIndex=index;interactives.push(obj);return obj;}
function ballFish(parent,x,y,z,color='#ed8b42'){
 const f=group(parent,x,y,z);orb(f,color,0,0,0,.2,.09,.1);const tail=new THREE.Mesh(new THREE.ConeGeometry(.1,.17,3),surface(color));tail.rotation.z=Math.PI/2;tail.rotation.y=Math.PI/2;tail.position.x=-.22;f.add(tail);orb(f,'#fff1ca',.12,.045,.062,.035);orb(f,'#3c3940',.135,.045,.08,.018);return f;
}
function resetCharacter(id){selected=id;if(rig)scene.remove(rig.root);rig=createAvatar(id);rig.root.position.set(kind==='ice'?-1.7:-1.95,0,.7);rig.root.rotation.y=Math.PI/2;scene.add(rig.root);makeTool();document.querySelectorAll('.character').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===id)));intro();}
function makeTool(){
 if(handTool)scene.remove(handTool);handTool=group(scene);handTool.visible=false;toolTip=new THREE.Vector3();
 const gold=surface('#d9b46e',{metalness:.25,roughness:.5});
 if(kind==='fish'){tube(handTool,wood,.024,.024,1,0,.5,0);const rim=ring(handTool,'#e5c27e',.23,.025,0,1.1,0);rim.rotation.x=Math.PI/2;const paper=new THREE.Mesh(new THREE.CircleGeometry(.225,32),new THREE.MeshStandardMaterial({color:'#f8e8c2',transparent:true,opacity:.75,side:THREE.DoubleSide}));paper.rotation.x=-Math.PI/2;paper.position.y=1.1;handTool.add(paper);}
 else if(kind==='shoot'){softBox(handTool,dark,0,.1,0,.13,.32,.1);softBox(handTool,wood,0,.42,0,.15,.62,.15);tube(handTool,gold,.065,.065,.8,0,.85,0);tube(handTool,'#eab06a',.077,.077,.07,0,1.27,0);}
 else if(kind==='cook'){tube(handTool,'#68503c',.04,.04,.3,0,.15,0);tube(handTool,'#c6c6ad',.014,.014,.85,0,.72,0);}
 else if(kind==='ring'){const r=ring(handTool,'#e2bc7d',.27,.045,0,.18,0);r.rotation.x=Math.PI/2;}
 else if(kind==='fortune'){softBox(handTool,fabric('#c99bb5','flowers'),0,.2,0,.35,.4,.3,.08);}
 else {tube(handTool,wood,.04,.04,.5,0,.25,0);}
}
function cleanupStand(){
 for(const f of flights)scene.remove(f.mesh);flights=[];stand.clear();interactives=[];objects=[];held=null;crank=null;iceMound=null;catchBowl=null;if(projectile){scene.remove(projectile);projectile=null;}
 for(const r of ripples)scene.remove(r.mesh);ripples=[];action.start=-9;
}
function createStand(next){
 kind=next;cleanupStand();scene.remove(vendor.root);vendor=createVisitor(({fish:4,shoot:1,ring:2,cook:3,fortune:7,ice:0})[kind]);vendor.root.position.set(kind==='ice'?2:1.1,0,-2);scene.add(vendor.root);if(rig)rig.root.position.set(kind==='ice'?-1.7:-1.95,0,.7);game=null;resultShown=false;const at=new THREE.Vector3(.9,1.1,0);
 const clothColors={fish:'#3c7e87',ring:'#b7974c',shoot:'#b46956',cook:'#b87745',fortune:'#ad7690',ice:'#72a3b6'};
 awning.material=fabric(clothColors[kind],'waves','#f5ddb1');roof.material=surface(clothColors[kind],{roughness:.9});
 scene.remove(plaque);const nextPlaque=textPlaque(names[kind]);plaque.geometry=nextPlaque.geometry;plaque.material=nextPlaque.material;scene.add(plaque);
 softBox(stand,wood,at.x,.58,at.z,4.2,1.1,2.6,.12);
 softBox(stand,fabric(clothColors[kind],'waves'),at.x,.76,1.32,4.12,.75,.05,.01);
 if(kind==='fish'){
  softBox(stand,'#93724c',at.x,1.17,0,4.35,.24,2.75,.08);
  const water=softBox(stand,surface('#5cc4cf',{roughness:.19,metalness:.2,transparent:true,opacity:.85}),at.x,1.32,0,4,.1,2.35,.08);addInteractive(water,'water',0);
  for(let i=0;i<5;i++){const fish=ballFish(stand,0,1.42,0,i%2?'#e6ae57':'#ec774b');fish.userData.fish=i;fish.scale.setScalar(1.35);orb(fish,new THREE.MeshBasicMaterial({visible:false}),0,0,0,.30,.24,.24);fish.traverse(n=>{if(n.isMesh)addInteractive(n,'aim',i);});objects.push(fish);}
  catchBowl=group(stand,-1.65,1.35,1);orb(catchBowl,'#e3e5cb',0,0,0,.4,.11,.3);
  for(let i=0;i<3;i++){const scoop=ring(stand,'#d6ac6b',.19,.025,2.5+i*.12,1.65,-1.25);scoop.rotation.y=.3;}
 }else if(kind==='shoot'){
  softBox(stand,fabric('#956456','stars','#b78368'),1,2.1,-1.25,4.4,2.3,.15,.04);
  for(const y of [1.25,2.15,3.05])softBox(stand,wood,1,y,-.95,4.5,.12,.7,.03);
  for(let i=0;i<6;i++){const toy=group(stand);const col=['#dd9a6a','#e3be74','#d9878e','#86afac','#ccb3d8','#d56650'][i];orb(toy,col,0,0,0,.25,.3,.2);orb(toy,col,-.16,.26,0,.1);orb(toy,col,.16,.26,0,.1);orb(toy,'#fff1ce',0,-.05,.16,.16,.1,.06);for(const s of [-1,1])orb(toy,'#3b3845',s*.08,.08,.18,.025);toy.traverse(n=>{if(n.isMesh)addInteractive(n,'aim',i);});objects.push(toy);}
 }else if(kind==='ring'){
  softBox(stand,'#e9c78e',.9,1.19,0,3.85,.13,2.35,.03);
  for(let i=0;i<9;i++){const x=-.25+(i%3)*1.1,z=-.7+Math.floor(i/3)*.7;const base=orb(stand,['#b66f56','#d5ae59','#78a28b'][i%3],x,1.27,z,.32,.02,.24);tube(stand,wood,.055,.07,.4,x,1.47,z);}
  for(let i=0;i<3;i++){const r=ring(stand,'#e0c496',.26,.045,-.7,1.38+i*.08,1);r.rotation.x=Math.PI/2;}
  addInteractive(softBox(stand,new THREE.MeshBasicMaterial({visible:false}),.9,1.5,0,4,.7,2.4),'throw',0);
 }else if(kind==='cook'){
  softBox(stand,'#353b3d',.9,1.22,0,3.9,.25,2.4,.07);
  for(let i=0;i<6;i++){const x=-.25+(i%3)*1.1,z=-.6+Math.floor(i/3)*1.1;orb(stand,'#151e23',x,1.36,z,.4,.08,.4);const b=orb(stand,surface('#e6c48d'),x,1.49,z,.32,.2,.32);addInteractive(b,'flip',i);objects.push(b);for(let j=0;j<3;j++)orb(b,'#5f8b59',Math.sin(j*6)*.4,.8,Math.cos(j*6)*.4,.08,.025,.08);}
  softBox(stand,'#e1d0a4',2.8,1.45,1.0,.65,.15,.35);for(let i=0;i<3;i++)orb(stand,'#b67c3d',2.6+i*.18,1.57,1,.09);
 }else if(kind==='fortune'){
  for(let i=0;i<3;i++){const bag=group(stand,-.3+i*1.2,1.72,0);orb(bag,fabric(['#d9957e','#b193bf','#83aba3'][i],'flowers'),0,0,0,.43,.48,.35);tube(bag,'#f3d696',.16,.25,.1,0,.42,0);orb(bag,'#e6c183',0,.46,.05,.22,.04,.05);bag.traverse(n=>{if(n.isMesh)addInteractive(n,'pick',i);});objects.push(bag);}
 }else{
  for(const x of [.35,1.45])softBox(stand,'#75a4ab',x,1.96,-.3,.12,1.6,.12,.025);
  softBox(stand,'#7babb2',.9,2.72,-.3,1.5,.13,.8,.04);
  softBox(stand,surface('#c5eced',{transparent:true,opacity:.68,roughness:.15}),.9,2.29,-.3,.7,.65,.65,.07);
  tube(stand,'#c0d6c6',.27,.27,.08,.9,1.91,-.3);
  crank=group(stand,-.55,2.05,.7);const wheel=ring(crank,'#8eaca2',.45,.055);for(let i=0;i<4;i++){const a=i*Math.PI/2;curve(crank,'#77958e',[[0,0,0],[Math.cos(a)*.43,Math.sin(a)*.43,0]],.025);}
  tube(crank,'#8eaca2',.035,.035,.27,.43,0,.13).rotation.x=Math.PI/2;orb(crank,wood,.43,0,.29,.09,.06,.06);
  tube(stand,'#8eaca2',.04,.04,1.5,0,1.85,.5).rotation.z=Math.PI/2;crank.traverse(n=>{if(n.isMesh)addInteractive(n,'turn',0);});
  orb(stand,'#e3e8d4',.9,1.37,.15,.45,.13,.4);
  iceMound=orb(stand,'#f0ffff',.9,1.55,.15,.37,.32,.35);iceMound.scale.y=.04;
  for(let i=0;i<3;i++){const b=group(stand,1.8+i*.45,1.5,.75);tube(b,surface(['#db7175','#7da367','#e8c36f'][i],{roughness:.24}),.13,.13,.46,0,0,0);tube(b,'#e5d9ad',.055,.06,.16,0,.3,0);b.traverse(n=>{if(n.isMesh)addInteractive(n,'syrup',i);});}
 }
 // A working human operator, towel, coin dish and spare stock in every booth.
 const dish=orb(stand,'#c5a879',2.65,1.35,-.8,.23,.025,.18);for(let i=0;i<3;i++)orb(dish,'#ddbf86',i*.35-.3,1,0,.2,.04,.2);
 softBox(stand,'#e4ddbf',2.45,1.33,-.4,.5,.05,.3,.02);makeTool();
 document.querySelectorAll('.game').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kind===kind)));intro();
}
function intro(){
 game=null;$('feedback').classList.remove('show');$('feedback').textContent='';feedbackUntil=0;roof.visible=false;awning.visible=false;plaque.visible=false;lanterns.forEach(l=>{if(l.parent===permanent)l.visible=false;});gesture={held:false,power:0,angle:0};fps?.configure(kind,selected);document.body.dataset.game=kind;document.body.dataset.playing='false';resultShown=false;$('dialog').classList.remove('hidden');$('actions').classList.add('hidden');$('scoreboard').classList.add('hidden');
 $('eyebrow').textContent='Moonlight Festival · '+cast[selected];$('title').textContent=names[kind];$('hint').textContent=hints[kind];
 $('dialog-label').textContent='Playing as '+cast[selected];$('dialog-title').textContent=names[kind]+' awaits!';$('dialog-body').textContent=instructions[kind]+' '+flavors[selected];
 $('begin').innerHTML='Start playing <span>→</span>';$('begin').onclick=begin;
 $('bottom-note').textContent='First-person festival games, played through your yokai’s hands';
 $('world').dataset.state='intro';$('world').dataset.character=selected;$('world').dataset.game=kind;
}
function begin(){
 if(embedded){hostInput({type:'begin'});return;}
 if(catchBowl)catchBowl.children.slice(1).forEach(n=>catchBowl.remove(n));
 game=createGame(kind,Math.floor(Math.random()*1000000),performance.now()/1000);inputGame(game,{type:'begin'},performance.now()/1000);resultShown=false;
 showActive();
}
function showActive(){
 $('dialog').classList.add('hidden');$('scoreboard').classList.remove('hidden');$('actions').classList.remove('hidden');$('timing').classList.toggle('hidden',kind!=='ring');$('action-buttons').replaceChildren();$('target-buttons').replaceChildren();

 gesture={held:false,power:0,angle:0};aimScreen.set(0,0);setAimAt(innerWidth/2,innerHeight/2);
 if(kind==='shoot')addAction('Fire',fireAtAim,true);
 if(kind==='fish')addAction('Lift the net',scoopAtAim,true);
 if(kind==='ring'){
  const b=addAction('Hold & release',()=>{},true);
  b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);gesture={held:true,power:0,start:performance.now()/1000,button:true};};
  b.onpointerup=e=>{if(gesture.held)releaseRing();};b.onkeydown=e=>{if(e.code==='Space'){e.preventDefault();if(!e.repeat)gesture={held:true,power:0,start:performance.now()/1000,button:true};}};b.onkeyup=e=>{if(e.code==='Space'&&gesture.held){e.preventDefault();releaseRing();}};b.onpointercancel=()=>gesture.held=false;
 }
 if(kind==='cook')addAction('Flip takoyaki',()=>actOnAim('flip'),true);
 if(kind==='fortune')addAction('Pull the bag',()=>actOnAim('pick'),true);
 if(kind==='ice'){addAction('Turn handle ↻',()=>doInput({type:'turn'}),true);['Strawberry','Melon','Lemon'].forEach((name,index)=>addAction(name,()=>doInput({type:'syrup',index}),false,'syrup-'+index));}
 document.body.dataset.playing='true';
 $('bottom-note').textContent=hints[kind]+' · You can also use Space';
 $('world').dataset.state='active';
 $('world').focus({preventScroll:true});
}
function addAction(name,fn,primary=false,id){const b=document.createElement('button');b.textContent=name;b.className='primary';b.onclick=fn;if(id)b.id=id;$('action-buttons').append(b);return b;}
function hitIndex(index){
 if(!game||game.status!=='active')return;
 if(['fish','shoot'].includes(kind)){const t=targets(game,gameNow())[index];if(!t.hit)doInput({type:'aim',x:t.x,y:t.y},objects[index].getWorldPosition(new THREE.Vector3()));}
 else doInput({type:kind==='cook'?'flip':'pick',index},objects[index]?.getWorldPosition(new THREE.Vector3()));
}
function doInput(input,target){
 if(!game||game.status!=='active')return;
 const t=performance.now()/1000;if(t-lastInput<.12)return;
 if(input.type==='syrup'&&game.turns<12){feedback('Shave the ice 12 times first',false);return;}
 if(input.type==='aim'&&targets(game,gameNow()).some(a=>a.hit&&Math.hypot(input.x-a.x,input.y-a.y)<a.r))return;
 if(embedded){lastInput=t;hostInput(input,target);return;}
 const before=game.score,attempts=game.attempts,turns=game.turns;inputGame(game,input,gameNow());
 playInputFeedback(input,target,before,attempts,turns);
}
function playInputFeedback(input,target,before,attempts,turns){
 const t=performance.now()/1000;
 if(before===game.score&&attempts===game.attempts&&turns===game.turns&&game.status!=='result')return;
 lastInput=t;const good=game.score>before||game.turns>turns||game.result?.won;
 const end=target||new THREE.Vector3(.9,1.35,0);action={start:t,target:end.clone(),good,type:input.type};
 if(input.type==='turn')feedback('Crunch! '+game.turns+' / 12');
 else if(input.type==='syrup')feedback(good?'Shaved ice ready!':'Check the ordered syrup',good);
 else feedback(good?({fish:'Nice, gentle catch!',shoot:'Prize hit!',ring:'Ring landed!',cook:'Perfect golden flip!',fortune:'What is inside?'}[kind]):({fish:'Oh! The paper net tore.',shoot:'Aim a little closer!',ring:'Try the next ring',cook:'Wait until it turns golden'}[kind]),good);
 if(kind==='ring'||kind==='shoot'){
  if(projectile)scene.remove(projectile);
  projectile=kind==='ring'?ring(scene,'#e2bf82',.28,.045):orb(scene,'#bd9464',0,0,0,.06);
  projectile.userData.start=fps.muzzle();projectile.userData.end=kind==='ring'?new THREE.Vector3(good?.85:.9+(input.aimX-.5)*3,1.45,good?0:1.8-(input.power||.2)*3.3):end.clone();
 }
 if(kind==='fish'&&good){const hit=targets(game,gameNow()).find(a=>game.hits.includes(a.id)&&objects[a.id]?.getWorldPosition(new THREE.Vector3()).distanceTo(end)<.1);if(hit){const mesh=objects[hit.id].clone();mesh.visible=true;mesh.position.copy(end);scene.add(mesh);flights.push({mesh,start:t,from:end.clone(),to:catchBowl.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.12,0))});}}
 if(kind==='fish'){const mesh=ring(scene,'#e5ffff',.18,.015);mesh.rotation.x=-Math.PI/2;mesh.position.copy(end);mesh.position.y=1.46;ripples.push({mesh,start:t});}
}
function result(){
 if(resultShown)return;resultShown=true;gesture.held=false;document.body.dataset.playing='false';const won=game.result.won;
 if(won&&!embedded){stamps.add(kind);try{localStorage.setItem('eve-festival-stamps-v1',JSON.stringify([...stamps]));}catch{}updateStamps();}if(won)celebrate();
 $('dialog').classList.remove('hidden');$('actions').classList.add('hidden');$('dialog-label').textContent=won?'Festival stamp earned!':'You will get it next time';$('dialog-title').textContent=won?'Nicely played, '+cast[selected]+'!':'Ready for another visit?';$('dialog-body').textContent=game.result.reason+(embedded&&game.reward?' Prize: '+game.reward+'.':'');$('begin').innerHTML='Try again <span>↻</span>';if(embedded){$('begin').textContent='Back to festival';$('begin').onclick=hostClose;}else $('begin').onclick=begin;$('world').dataset.state='result';tone(won);
}
function updateStamps(){$('stamps').textContent='Stamps '+stamps.size+' / 6';document.querySelectorAll('.game').forEach(b=>b.querySelector('.stamp').textContent=stamps.has(b.dataset.kind)?'✓':'');}
function celebrate(){
 for(let i=0;i<22;i++){const mesh=orb(scene,surface(['#efc36b','#e5a3b0','#a7cebb'][i%3],{emissive:'#e0a855',emissiveIntensity:.15}),-2.3,2,.55,.045,.07,.025);confetti.push({mesh,velocity:new THREE.Vector3(Math.sin(i*2.4)*1.6,2.6+(i%3)*.5,Math.cos(i*2.4)*1.5),age:0});}
}
if(!embedded)for(const [id,name] of Object.entries(cast)){const b=document.createElement('button');b.className='character';b.dataset.id=id;b.setAttribute('aria-pressed',String(id===selected));b.innerHTML='<img src="/assets/'+id+'-reference.png" alt=""><span>'+name+'</span>';b.onclick=()=>{resetCharacter(id);};$('characters').append(b);}
if(!embedded)for(const [id,name] of Object.entries(names)){const b=document.createElement('button');b.className='game';b.dataset.kind=id;b.setAttribute('aria-pressed',String(id===kind));b.innerHTML='<span class="icon">'+icons[id]+'</span><span>'+name+'</span><span class="stamp"></span>';b.onclick=()=>createStand(id);$('games').append(b);}
$('help').onclick=()=>{if(embedded){feedback(instructions[kind]);return;}intro();feedback('Choose a stall for a new challenge');};

function aimHit(){
 ray.setFromCamera(aimScreen,camera);
 return ray.intersectObjects(interactives,false).find(h=>h.object.visible&&h.object.parent?.visible!==false);
}
function setAimAt(x,y){
 aimScreen.set(x/innerWidth*2-1,-y/innerHeight*2+1);ray.setFromCamera(aimScreen,camera);
 const plane=kind==='shoot'?new THREE.Plane(new THREE.Vector3(0,0,1),.88):new THREE.Plane(new THREE.Vector3(0,1,0),-(kind==='cook'?1.49:1.44));
 const point=ray.ray.intersectPlane(plane,new THREE.Vector3())||new THREE.Vector3(.9,1.44,0);
 if(kind==='fish'){point.x=THREE.MathUtils.clamp(point.x,-.85,2.65);point.z=THREE.MathUtils.clamp(point.z,-1,1.05);}
 fps?.setAim(aimScreen.x,aimScreen.y,point);
 const cursor=$('crosshair');cursor.style.left=x+'px';cursor.style.top=y+'px';
 return point;
}
function fireAtAim(){
 const h=aimHit();
 if(h?.object.userData.hitType==='aim')hitIndex(h.object.userData.hitIndex);
 else {ray.setFromCamera(aimScreen,camera);const end=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),.88),new THREE.Vector3());doInput({type:'aim',x:0,y:0},end||new THREE.Vector3(.9,2,-.88));}
}
function scoopAtAim(){const p=fps.worldAim;doInput({type:'aim',x:THREE.MathUtils.clamp((p.x+.8)/3.4,0,1),y:THREE.MathUtils.clamp((p.z+1)/2,0,1)},p);}
function actOnAim(type){const h=aimHit();if(h?.object.userData.hitType===type)doInput({type,index:h.object.userData.hitIndex},h.point);else feedback(type==='flip'?'Aim the pick at a takoyaki first':'Aim at a bag first',false);}
function releaseRing(){
 const power=gesture.button?THREE.MathUtils.clamp((performance.now()/1000-gesture.start)/1.4,0,1):gesture.power;
 gesture.held=false;doInput({type:'throw',power,aimX:(aimScreen.x+1)/2});
}
function crankAngle(e){const p=crank.getWorldPosition(new THREE.Vector3()).project(camera);const x=(p.x+1)*innerWidth/2,y=(1-p.y)*innerHeight/2;return Math.atan2(e.clientY-y,e.clientX-x);}
$('world').addEventListener('pointerdown',e=>{
 if(e.button!==0||!game||game.status!=='active')return;
 setAimAt(e.clientX,e.clientY);$('world').setPointerCapture(e.pointerId);
 const h=aimHit();gesture={held:true,power:0,start:performance.now()/1000,x:e.clientX,y:e.clientY,angle:kind==='ice'?crankAngle(e):0,accum:0,bag:h?.object.userData.hitType==='pick'?h.object.userData.hitIndex:-1,hit:h?.object.userData.hitType,lift:0};
});
$('world').addEventListener('pointermove',e=>{
 if(!game||game.status!=='active')return;
 if(e.pointerType==='mouse'||gesture.held)setAimAt(e.clientX,e.clientY);
 if(!gesture.held)return;
 if(kind==='ring')gesture.power=THREE.MathUtils.clamp(Math.max(0,gesture.y-e.clientY)/180,0,1);
 if(kind==='fortune')gesture.lift=THREE.MathUtils.clamp((gesture.y-e.clientY)/100,0,.7);
 if(kind==='ice'){
  const a=crankAngle(e),delta=Math.atan2(Math.sin(a-gesture.angle),Math.cos(a-gesture.angle));gesture.angle=a;gesture.accum+=Math.abs(delta);
  if(gesture.accum>=Math.PI/3){const before=game.turns;doInput({type:'turn'});if(game.turns>before)gesture.accum-=Math.PI/3;}
 }
});
$('world').addEventListener('pointerup',e=>{
 if(!gesture.held)return;
 const moved=Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y);
 if(kind==='ring'){gesture.power=THREE.MathUtils.clamp(Math.max(gesture.power||0,(gesture.y-e.clientY)/180),0,1);$('world').dataset.lastGesture=JSON.stringify({from:gesture.y,to:e.clientY,power:gesture.power,aim:(aimScreen.x+1)/2});releaseRing();return;}
 gesture.held=false;
 if(kind==='fish')scoopAtAim();
 if(kind==='cook')actOnAim('flip');
 if(kind==='fortune'&&gesture.bag>=0&&gesture.lift>.2)doInput({type:'pick',index:gesture.bag},objects[gesture.bag].getWorldPosition(new THREE.Vector3()));
 else if(kind==='fortune')feedback('Pull the bag upward',false);
 if(kind==='ice'&&moved<10&&gesture.hit==='turn')doInput({type:'turn'});
 if(kind==='ice'&&gesture.hit==='syrup'){const h=aimHit();if(h?.object.userData.hitType==='syrup')doInput({type:'syrup',index:h.object.userData.hitIndex});}
});
$('world').addEventListener('pointercancel',()=>{gesture.held=false;});
window.addEventListener('keydown',e=>{
 if(!['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown',...Array.from({length:6},(_,i)=>'Digit'+(i+1))].includes(e.code))return;
 if((e.target instanceof HTMLButtonElement||e.target instanceof HTMLAnchorElement)&&e.code==='Space')return;
 e.preventDefault();if(e.repeat)return;
 if(!game||game.status!=='active'){if(e.code==='Space'){if(embedded&&game?.status==='result')hostClose();else begin();}return;}
 if(e.code.startsWith('Arrow')){const x=THREE.MathUtils.clamp(aimScreen.x+(e.code==='ArrowRight'?.07:e.code==='ArrowLeft'?-.07:0),-.95,.95),y=THREE.MathUtils.clamp(aimScreen.y+(e.code==='ArrowUp'?.07:e.code==='ArrowDown'?-.07:0),-.95,.95);setAimAt((x+1)*innerWidth/2,(1-y)*innerHeight/2);}
 else if(e.code==='Space'){if(kind==='shoot')fireAtAim();if(kind==='fish')scoopAtAim();if(kind==='cook')actOnAim('flip');if(kind==='fortune')actOnAim('pick');if(kind==='ice')doInput({type:'turn'});if(kind==='ring')gesture={held:true,power:0,start:performance.now()/1000,button:true};}
 else{const i=Number(e.code.slice(5))-1;if(kind==='ice'&&i<3)doInput({type:'syrup',index:i});else if(['cook','fortune'].includes(kind)&&i<objects.length)hitIndex(i);}
});
window.addEventListener('keyup',e=>{if(e.code==='Space'&&kind==='ring'&&gesture.held)releaseRing();});
window.addEventListener('blur',()=>{gesture.held=false;});
function resize(){
 const w=innerWidth,h=innerHeight;renderer.setSize(w,h);camera.aspect=w/h;

 fps?.configure(kind,selected);
 camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);resize();batchRigidParts(scene);fps=createFirstPerson(scene,camera,$('world'));resetCharacter('mizu');createStand('fish');updateStamps();
let elapsed=0,sampleAt=0,frames=0,fpsFrames=0,quality='balanced',qualityMode=loadSettings(soundStore).quality;
function applyStallQuality(mode){qualityMode=mode;quality=mode==='light'?'light':mode==='high'?'high':'balanced';renderer.setPixelRatio(Math.min(devicePixelRatio,mode==='light'||mode==='auto'&&(matchMedia('(any-pointer:coarse)').matches||innerWidth<800)?1:1.5));renderer.shadowMap.enabled=mode!=='light';}
applyStallQuality(qualityMode);
let frameId;
function frame(){
 frameId=requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05),t=performance.now()/1000;elapsed+=dt;frames++;fpsFrames++;
 if(!ready){ready=true;$('loading').classList.add('hidden');}
 if(embedded&&game?.status==='intro'){$('intro-time').textContent='Start within '+Math.max(0,Math.ceil(20-(gameNow()-game.openedAt)))+'s';}else $('intro-time').textContent='';
 if(game){if(!embedded)advanceGame(game,gameNow());$('progress').textContent=game.score+' / '+GAMES[kind].goal;if(game.status==='active'){$('progress').textContent=game.score+' / '+GAMES[kind].goal;$('timer').textContent=Math.max(0,Math.ceil(game.endsAt-gameNow()))+'s';if(kind==='ice')$('hint').textContent='Order: '+syrupName(game)+' · Ice '+game.turns+' / 12';}else if(game.status==='result'){result();$('timer').textContent='';}}
 if(t>feedbackUntil)$('feedback').classList.remove('show');
 const age=t-action.start,p=THREE.MathUtils.clamp(age/.62,0,1),reach=age<.62?Math.sin(p*Math.PI):0;
 animateAvatar(rig,{action:'idle',facing:Math.PI/2,cover:0},dt,elapsed,t);
 rig.arms.forEach((a,i)=>{a.rotation.x=i===1?-.65-reach*.95:-.15-reach*.3;a.rotation.z=i===1?-.12:0;});
 rig.body.rotation.z=-reach*.07;
 if(kind==='ice'&&reach>0){rig.arms[1].rotation.x=-1.8+Math.sin(p*Math.PI*2)*.45;rig.arms[1].rotation.z=-.3;}
 if(rig.character==='kon')rig.head.rotation.z=-reach*.12;
 if(rig.character==='kasa')rig.body.position.y+=reach*.14;
 if(rig.character==='akari')rig.lanterns.forEach((l,i)=>l.rotation.z=Math.sin(p*Math.PI-i*.25)*reach*.14);
 if(game?.result?.won){rig.body.position.y+=Math.abs(Math.sin(elapsed*7))*.10;rig.arms.forEach((a,i)=>{a.rotation.x=-1.7;a.rotation.z=(i===0?1:-1)*.3;});}
 animateVisitor(vendor,{x:1.1,z:-2,direction:0,owner:null},dt,elapsed);vendor.arms[0].rotation.x=-.5-reach*.4;vendor.head.rotation.z=Math.sin(elapsed*1.4)*.04;
 if(handTool){handTool.visible=kind!=='ice';rig.root.updateMatrixWorld(true);const hand=rig.arms[1].localToWorld(new THREE.Vector3(.11,-.38,.08));handTool.position.copy(hand);const end=action.target.clone();if(age>.65||action.type==='turn')end.set(-.5,1.9,.4);if(kind==='shoot')end.y=Math.max(end.y,1.6);
  const direction=end.sub(hand).normalize();handTool.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);handTool.scale.setScalar(kind==='fish'?1:1);if(kind==='ring'&&age<.55)handTool.visible=false;}
 if(kind==='fish'||kind==='shoot'){
  const data=targets(game?.kind===kind?game:createGame(kind,7,gameNow()),gameNow());
  objects.forEach((o,i)=>{const at=data[i];if(kind==='fish'){o.position.set(-.8+at.x*3.4,1.42,-1+at.y*2);o.rotation.y=Math.cos(elapsed*1.3+i)*.25;}else o.position.set(-1.1+at.x*4.3,3.2-at.y*2.4,-.88);
   o.visible=!game?.hits.includes(i);});
  if(catchBowl){catchBowl.scale.y=1+(game?.score||0)*.04;}
 }else if(kind==='cook')objects.forEach((o,i)=>{const phase=game?cookingPhase(game,i,gameNow()):'raw';o.material=surface(({raw:'#e6c48d',gold:'#d99c40',done:'#b87e36',burnt:'#543e34'})[phase]);o.rotation.z=action.type==='flip'&&age<.62&&o.position.distanceTo(action.target)<.3?p*Math.PI*2:0;});
 else if(kind==='fortune')objects.forEach((o,i)=>{if(game?.status==='active')o.position.y=1.72+(gesture.held&&gesture.bag===i?gesture.lift:0);o.rotation.z=Math.sin(elapsed*1.5+i)*.025;if(game?.choice===i&&game.status==='result'){o.position.y=1.72+Math.sin(Math.min(age,1)*Math.PI)*.6;o.rotation.y=age*2;}});
 else if(kind==='ice'){if(crank)crank.rotation.z=(game?.turns||0)*Math.PI/3+reach*.15;if(iceMound){iceMound.scale.y=THREE.MathUtils.lerp(iceMound.scale.y,.05+(game?.turns||0)/12*.32,dt*8);iceMound.material=surface(game?.result?.won?['#f2a3ad','#b7d9aa','#f4dc8e'][game.syrup]:'#f0ffff');}document.querySelectorAll('[id^=syrup-]').forEach(b=>b.disabled=game?.turns<12);}
 document.querySelectorAll('[data-target]').forEach(b=>{const i=Number(b.dataset.target);b.disabled=!!(game&&(game.hits.includes(i)||(kind==='cook'&&game.cooked[i])));});
 if(kind==='ring'){if(gesture.held&&gesture.button)gesture.power=THREE.MathUtils.clamp((t-gesture.start)/1.4,0,1);$('timing').querySelector('i').style.left=(gesture.power||0)*100+'%';}
 if(projectile){const u=Math.min(age/.55,1);projectile.position.lerpVectors(projectile.userData.start,projectile.userData.end,u);projectile.position.y+=Math.sin(u*Math.PI)*(kind==='ring'?1.6:.12);projectile.rotation.x=kind==='ring'?-Math.PI/2+Math.sin(u*Math.PI)*.6:0;if(age>1.5){scene.remove(projectile);projectile=null;}}
 flights=flights.filter(f=>{const u=Math.min((t-f.start)/.8,1);f.mesh.position.lerpVectors(f.from,f.to,u);f.mesh.position.y+=Math.sin(u*Math.PI)*.7;f.mesh.rotation.y+=dt*3;if(u>=1){scene.remove(f.mesh);if(catchBowl){catchBowl.add(f.mesh);f.mesh.position.set(((game?.score||1)-2)*.1,.08,0);f.mesh.scale.setScalar(.6);}return false;}return true;});
 ripples=ripples.filter(r=>{const a=t-r.start;r.mesh.scale.setScalar(1+a*3);r.mesh.material.transparent=true;r.mesh.material.opacity=Math.max(0,1-a);if(a>1){scene.remove(r.mesh);return false;}return true;});
 confetti=confetti.filter(c=>{c.age+=dt;c.velocity.y-=3*dt;c.mesh.position.addScaledVector(c.velocity,dt);c.mesh.rotation.z+=dt*3;if(c.age>2){scene.remove(c.mesh);return false;}return true;});
 lanterns.forEach((l,i)=>l.rotation.z=Math.sin(elapsed*.7+i)*.018);
 if(t-sampleAt>3){if(sampleAt&&qualityMode==='auto'&&fpsFrames/(t-sampleAt)<25&&quality!=='light'){renderer.setPixelRatio(1);renderer.shadowMap.enabled=false;quality='light';}sampleAt=t;fpsFrames=0;}
 rig.root.visible=false;if(handTool)handTool.visible=false;fps.update(dt,elapsed,action,game,gesture);
 renderer.render(scene,camera);
 if(frames%10===0){$('world').dataset.score=String(game?.score||0);$('world').dataset.attempts=String(game?.attempts||0);$('world').dataset.action=action.type;$('world').dataset.drawCalls=String(renderer.info.render.calls);$('world').dataset.quality=quality;}
}
frame();

function receiveHost(event){
 if(!embedded||!isFrameMessage(event,location.origin,parent))return;
 const m=event.data;if(!['init','state','ack'].includes(m.type)||!m.game||!Number.isFinite(m.tick))return;
 if(hostSession&&m.session!==hostSession)return;
 if(!hostSession){
  if(m.type!=='init'||!cast[m.character]||!GAMES[m.game.kind])return;
  hostSession=m.session;resetCharacter(m.character);createStand(m.game.kind);pending.clear();
 }
 if(m.game.session!==hostSession||m.game.kind!==kind)return;
 if(['auto','high','light'].includes(m.quality)&&m.quality!==qualityMode)applyStallQuality(m.quality);
 if(typeof m.sound==='boolean'&&m.sound!==sound){sound=m.sound;showSound();}
 const previous=game?.status;
 hostTick=m.tick;hostReceived=performance.now();game=m.game;fps.setDisguise(m.revealed===true);
 stamps=new Set(m.stamps||[]);updateStamps();
 if(game.status==='active'&&previous!=='active')showActive();
 if(game.status==='result')result();
 $('world').dataset.session=hostSession;$('world').dataset.state=game.status;
 $('world').dataset.character=selected;$('world').dataset.game=kind;
 if(m.type==='ack'){
  const entry=pending.get(m.requestId);pending.delete(m.requestId);
  if(entry&&entry.input.type!=='begin')playInputFeedback(entry.input,entry.target,entry.score,entry.attempts,entry.turns);
 }
}
window.addEventListener('message',receiveHost);
window.addEventListener('keydown',e=>{if(embedded&&e.code==='Escape'){e.preventDefault();hostClose();}},true);
window.addEventListener('pagehide',()=>{cancelAnimationFrame(frameId);renderer.dispose();renderer.forceContextLoss();audio?.close();});
if(embedded)parent.postMessage({channel:CHANNEL,type:'ready'},location.origin);
