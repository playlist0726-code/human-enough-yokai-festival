import * as THREE from 'three';
import {surface,fabric,orb,softBox,tube,ring,group} from './modules/renderkit.mjs';

// Every game has a distinct eye position, pitch and tool. +Z faces the customer.
export const VIEWS={
 shoot:{desktop:[.9,2.15,3.4],mobile:[.9,2.15,6.1],target:[.9,2.05,-.9],fov:43,mobileFov:65,tool:'코르크 총',mode:'aim-fire'},
 fish:{desktop:[.9,3.8,3.0],mobile:[.9,5.2,4.1],target:[.9,1.35,0],fov:43,mobileFov:76,tool:'종이 뜰채',mode:'drag-lift'},
 ring:{desktop:[.9,2.5,3.6],mobile:[.9,2.7,5.7],target:[.9,1.3,0],fov:43,mobileFov:65,tool:'밧줄 고리',mode:'pull-release'},
 cook:{desktop:[.9,3.9,2.4],mobile:[.9,4.3,3.2],target:[.9,1.35,0],fov:44,mobileFov:78,tool:'타코야키 꼬치',mode:'pick-flip'},
 fortune:{desktop:[.9,2.45,3.25],mobile:[.9,2.55,5.1],target:[.9,1.75,0],fov:45,mobileFov:68,tool:'주머니를 잡는 손',mode:'reach-pull'},
 ice:{desktop:[.35,2.8,3.4],mobile:[.9,2.95,5.6],target:[.9,1.9,.1],fov:48,mobileFov:86,tool:'손잡이와 시럽병',mode:'circle-pour'}
};
const STYLES={
 mizu:['#60cbbd','#ff984b','waves','#fbe0ad'],
 pon:['#b9835a','#b74161','check','#f9e5c2'],
 kon:['#f1cc98','#354a81','stars','#f9e3b7'],
 sumi:['#505f75','#a0b489','flowers','#f6dfb1'],
 nemu:['#ae98ad','#a6b796','moon','#fae2b8'],
 akari:['#39495b','#2d486e','flowers','#f9dfa3'],
 kasa:['#c7b0d0','#e7a73b','flowers','#ffe2aa']
};
export function createFirstPerson(scene,camera,canvas){
 scene.add(camera);
 const mount=group(camera),right=group(mount),left=group(mount),tool=group(mount),accessory=group(mount),waterNet=group(scene),arc=group(scene);
 let morsels=[],mound;let character='mizu',kind='fish',aim={x:0,y:0},worldAim=new THREE.Vector3(.9,1.44,0),power=0,holding=false;
 const arcDots=Array.from({length:16},()=>orb(arc,surface('#ffe0a3',{emissive:'#f1bf6c',emissiveIntensity:.5}),0,0,0,.035));
 const netRing=ring(waterNet,'#ead097',.25,.026);netRing.rotation.x=Math.PI/2;
 const paper=new THREE.Mesh(new THREE.CircleGeometry(.245,32),new THREE.MeshStandardMaterial({color:'#fff0cf',transparent:true,opacity:.55,side:THREE.DoubleSide}));
 paper.rotation.x=-Math.PI/2;waterNet.add(paper);
 const handle=tube(waterNet,'#c9a570',.016,.016,1,0,0,0);
 function hand(root,side){
  const [skin,base,pattern,ink]=STYLES[character];
  root.clear();
  orb(root,skin,0,0,0,.105,.12,.095);
  for(let i=0;i<3;i++)orb(root,skin,(i-1)*.048,.07,-.04,.032,.05,.045);
  orb(root,skin,-side*.09,.0,-.035,.045,.065,.05);
  tube(root,fabric(base,pattern,ink),.12,.16,.3,0,-.22,.035);
  if(character==='sumi')for(let i=0;i<3;i++)orb(root,'#424d64',side*.11,-.08-i*.06,.02,.065,.1,.04);
 }
 function build(){
  hand(right,1);hand(left,-1);tool.clear();accessory.clear();morsels=[];mound=null;
  if(kind==='fish'||kind==='ice'){
   orb(accessory,'#ede7ce',0,0,0,.18,.075,.15);
   const rim=ring(accessory,'#d8cdb0',.17,.015,0,.04,0);rim.rotation.x=Math.PI/2;
   if(kind==='fish'){orb(accessory,'#83cfd4',0,.05,0,.155,.015,.13);for(let i=0;i<3;i++)morsels.push(orb(accessory,'#eeaa5a',-.08+i*.08,.075,0,.04,.018,.022));}
   else mound=orb(accessory,'#f3ffff',0,.10,0,.14,.12,.12);
  }else if(kind==='cook'){
   softBox(accessory,'#e5c28d',0,0,0,.36,.05,.24,.015);
   for(let i=0;i<4;i++)morsels.push(orb(accessory,'#c99145',i%2*.13-.065,.065,Math.floor(i/2)*.1-.05,.055));
  }
  if(kind==='shoot'){
   softBox(tool,'#9f704b',0,-.015,-.1,.14,.16,.42,.035);
   softBox(tool,'#73503c',.04,-.13,.015,.09,.2,.12,.025);
   const barrel=tube(tool,'#687577',.036,.036,.72,0,.05,-.54);barrel.rotation.x=Math.PI/2;
   const muzzle=tube(tool,'#e1a85c',.049,.049,.045,0,.05,-.91);muzzle.rotation.x=Math.PI/2;
   softBox(tool,'#353e44',0,.105,-.88,.025,.045,.025,.005);
   softBox(tool,'#353e44',0,.10,-.28,.08,.035,.03,.005);
  }else if(kind==='ring'){const r=ring(tool,'#dfbb7c',.21,.038);r.rotation.x=-.55;}
  else if(kind==='cook'){const grip=tube(tool,'#826247',.023,.023,.24,0,0,-.1);grip.rotation.x=Math.PI/2;const pick=tube(tool,'#d6d4c2',.009,.009,.75,0,.01,-.55);pick.rotation.x=Math.PI/2;}
  else if(kind==='fortune'){orb(tool,fabric('#bc91aa','flowers'),0,0,0,.18,.22,.15);tube(tool,'#ead097',.065,.09,.05,0,.21,0);}
  else if(kind==='ice'){tube(tool,'#a2784d',.035,.035,.18,0,0,0).rotation.x=Math.PI/2;}
  else {const rod=tube(tool,'#c9a570',.018,.018,.7,0,0,-.3);rod.rotation.x=Math.PI/2;}
 }
 function configure(next,who){
  kind=next;character=who;build();aim={x:0,y:0};holding=false;power=0;
  const v=VIEWS[kind],mobile=innerWidth<700;
  camera.position.fromArray(mobile?v.mobile:v.desktop);camera.lookAt(...v.target);
  camera.aspect=innerWidth/innerHeight;camera.fov=mobile?v.mobileFov:v.fov;camera.updateProjectionMatrix();
  canvas.dataset.view='first-person';canvas.dataset.interaction=v.mode;canvas.dataset.tool=v.tool;
  canvas.dataset.camera=JSON.stringify({eye:camera.position.toArray(),target:v.target,fov:camera.fov});
 }
 function setAim(x,y,point){aim={x,y};if(point)worldAim.copy(point);}
 function update(dt,time,action,game,gesture={}){
  const v=VIEWS[kind],depth=1.05,halfH=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*depth,halfW=halfH*camera.aspect;
  const age=performance.now()/1000-action.start,progress=THREE.MathUtils.clamp(age/.55,0,1),pulse=age<.55?Math.sin(progress*Math.PI):0;
  holding=!!gesture.held;power=gesture.power||0;
  right.position.set(halfW*.62,-halfH*.55,-depth);left.position.set(-halfW*.64,-halfH*.60,-depth);
  right.rotation.set(.1,0,-.12);left.rotation.set(.1,0,.18);
  tool.position.copy(right.position).add(new THREE.Vector3(-.05,.07,-.08));tool.rotation.set(0,0,0);tool.scale.setScalar(1);tool.visible=true;
  right.position.y+=Math.sin(time*1.5)*.004;left.position.y+=Math.sin(time*1.5+.6)*.004;
  waterNet.visible=kind==='fish';arc.visible=kind==='ring'&&holding;
  if(kind==='shoot'){
   tool.position.set(0,-halfH*.56,-.72);
   tool.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),new THREE.Vector3(aim.x*halfW*.8,aim.y*halfH*.8,-2.5).normalize());
   const recoil=age<.22?Math.sin(age/.22*Math.PI)*.075:0;tool.position.z+=recoil;tool.rotation.x-=recoil*.7;
   right.position.set(.10,-halfH*.60,-.64+recoil);left.position.set(-.12,-halfH*.57,-.96+recoil);
  }else if(kind==='fish'){
   right.position.x=THREE.MathUtils.clamp(aim.x*.18+halfW*.55,-halfW*.8,halfW*.8);right.position.y+=pulse*.13;
   tool.position.copy(right.position).add(new THREE.Vector3(0,.025,-.12));tool.rotation.x=-.25-pulse*.3;
   waterNet.position.copy(worldAim);waterNet.position.y=1.46+pulse*.42;netRing.scale.y=1;
   // The shaft joins the visible hand to the paper net on the actual water plane.
   const from=camera.localToWorld(right.position.clone()),to=waterNet.position.clone(),delta=from.sub(to);
   handle.position.copy(delta).multiplyScalar(.5);handle.scale.y=delta.length();handle.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  }else if(kind==='ring'){
   tool.scale.setScalar(innerWidth<700?.62:.85);tool.position.set(halfW*.3,-halfH*.57,-depth+(holding?power*.17:-pulse*.25));right.position.x=tool.position.x+.08;right.position.y=tool.position.y-.10;
   tool.rotation.x=-.3+power*.7-pulse;
   right.position.z+=holding?power*.17:-pulse*.17;
   tool.visible=!(age<.48&&action.type==='throw');
   const from=camera.localToWorld(tool.position.clone()),to=new THREE.Vector3(.9+aim.x*1.3,1.45,1.8-power*3.3);
   arcDots.forEach((d,i)=>{const u=i/(arcDots.length-1);d.position.lerpVectors(from,to,u);d.position.y+=Math.sin(u*Math.PI)*1.6;});
  }else if(kind==='cook'){
   right.position.x+=aim.x*halfW*.18;right.position.y+=pulse*.10;
   tool.position.copy(right.position).add(new THREE.Vector3(-.03,.04,-.1));tool.rotation.set(-.18-pulse*.5,-aim.x*.12,pulse*.4);
   left.position.y+=.04;
  }else if(kind==='fortune'){
   right.position.x=aim.x*halfW*.5;right.position.y+=holding?.12:pulse*.22;
   tool.visible=!!game?.result?.won;tool.position.copy(right.position).add(new THREE.Vector3(-.04,.17,-.13));
   right.rotation.z=holding?-.5:-.12;
  }else{
   const angle=(game?.turns||0)*Math.PI/3+(gesture.angle||0);
   right.position.x=halfW*.4+Math.cos(angle)*.08;right.position.y=-halfH*.65+Math.sin(angle)*.08;
   tool.position.copy(right.position).add(new THREE.Vector3(-.03,.02,-.07));tool.rotation.z=angle;
   if(action.type==='syrup'&&age<.8)right.rotation.z=-pulse*.8;
   left.position.y+=.05;
  }
  accessory.position.copy(left.position).add(new THREE.Vector3(.02,.10,-.10));accessory.visible=['fish','cook','ice'].includes(kind);
  morsels.forEach((m,i)=>m.visible=(game?.score||0)>i);
  if(mound){mound.scale.y=.015+(game?.turns||0)/12*.12;mound.material=surface(game?.result?.won?['#f1a5ab','#b8d5a2','#f1d878'][game.syrup]:'#f3ffff');}
  const won=game?.result?.won;if(won){right.position.y+=.07+Math.sin(time*6)*.02;left.position.y+=.07+Math.sin(time*6+.5)*.02;}
 }
 build();
 return {configure,setAim,update,muzzle:()=>camera.localToWorld(new THREE.Vector3(0,-.18,-1)),get worldAim(){return worldAim.clone();}};
}
