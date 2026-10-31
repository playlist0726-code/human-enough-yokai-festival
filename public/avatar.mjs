import * as THREE from 'three';
import {fabric,createPotion,POTION_COLORS,batchRigidParts} from './renderkit.mjs';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {microSurface} from './art-materials.mjs';
import {flexibleTube,clothHem,prepareMotion,animateCharacter} from './character-motion.mjs';

// Original, fully volumetric game models. Local +Z is the face direction.
// Shared geometry keeps four animated characters inexpensive to draw.
const ball=new THREE.SphereGeometry(1,32,24),block=new RoundedBoxGeometry(1,1,1,2,.08),materials=new Map();
function mat(color,glow=0){const key=color+':'+glow;if(!materials.has(key))materials.set(key,new THREE.MeshPhysicalMaterial({color,roughness:color==='#34313f'?.12:.58,clearcoat:color==='#34313f'?.7:.12,clearcoatRoughness:.3,bumpMap:microSurface('clay'),bumpScale:.005,emissive:color,emissiveIntensity:glow}));return materials.get(key);}
function part(parent,geo,color,x,y,z,sx=1,sy=1,sz=1,glow=0){const m=new THREE.Mesh(geo,color.isMaterial?color:mat(color,glow));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const orb=(g,color,x,y,z,sx,sy=sx,sz=sx,glow=0)=>part(g,ball,color,x,y,z,sx,sy,sz,glow);
const cube=(g,color,x,y,z,w,h,d)=>part(g,block,color,x,y,z,w,h,d);
const tube=(g,color,r1,r2,h,x,y,z)=>part(g,new THREE.CylinderGeometry(r1,r2,h,20),color,x,y,z);
function curve(g,color,points,r){return part(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),36,r,10,false),color,0,0,0);}
function ring(g,color,r,t,x,y,z){return part(g,new THREE.TorusGeometry(r,t,10,32),color,x,y,z);}
function group(g,x=0,y=0,z=0){const n=new THREE.Group();n.position.set(x,y,z);g.add(n);return n;}
function eye(g,x,y,z,size=.19){
  const e=group(g,x,y,z);e.userData.eye=true;e.name='expressive-eye';
  orb(e,'#fff5d7',0,0,0,size,size*1.2,size*.38);
  const iris=group(e,size*.09,-size*.03,size*.32);e.userData.iris=iris;
  orb(iris,'#34313f',0,0,0,size*.49,size*.64,size*.22);
  orb(iris,'#ffffff',size*.15,size*.32,size*.19,size*.13,size*.16,size*.06);
  curve(g,'#354e49',[[x-size*.8,y+size*.8,z],[x,y+size*1.15,z+.06],[x+size*.8,y+size*.8,z]],size*.04);
}
function ears(g,color,y=2.55){
  for(const side of [-1,1]){const pivot=group(g,side*.44,y,-.03);pivot.name='yokai-ear';pivot.rotation.z=-side*.23;part(pivot,new THREE.ConeGeometry(.24,.55,3),color,0,0,0);part(pivot,new THREE.ConeGeometry(.14,.32,3),'#d99594',0,.01,.11);}
}
function bottle(g,color){const b=createPotion(color,.72);b.position.set(0,-.38,.18);g.add(b);return b;}
function kimono(r,color,skin){
  const styles={mizu:['#ff984b','waves','#fbe0ad','#294979'],pon:['#b74161','check','#f9e5c2','#ecb336'],kon:['#354a81','stars','#f9e3b7','#db613d'],sumi:['#a0b489','flowers','#f6dfb1','#d45939'],nemu:['#a6b796','moon','#fae2b8','#ac2c6c'],akari:['#2d486e','flowers','#f9dfa3','#e46436']};
  const [base,pattern,ink,obi]=styles[r.character]||[color,'flowers','#fff0cd','#e6bd76'],cloth=fabric(base,pattern,ink);
  const profile=[[.53,0],[.6,.035],[.58,.13],[.52,.36],[.41,.63],[.38,.8]].map(([x,y])=>new THREE.Vector2(x,y));
  const robe=new THREE.LatheGeometry(profile,48),v=robe.attributes.position;
  for(let i=0;i<v.count;i++){const y=v.getY(i),a=Math.atan2(v.getX(i),v.getZ(i)),fold=1+Math.cos(a*10)*.035*(1-y/.8);v.setX(i,v.getX(i)*fold);v.setZ(i,v.getZ(i)*fold);}robe.computeVertexNormals();
  r.robe=part(r.body,clothHem(robe),cloth,0,.51,0);tube(r.body,obi,.49,.49,.17,0,1.08,0);
  const bow=group(r.body,0,1.08,-.44);orb(bow,obi,-.18,0,0,.2,.13,.09);orb(bow,obi,.18,0,0,.2,.13,.09);orb(bow,obi,0,0,.035,.09,.095,.08);
  for(const side of [-1,1]){
    const collar=cube(r.body,'#efe0be',side*.11,1.3,.37,.1,.4,.065);collar.rotation.z=side*.46;
    const arm=group(r.body,side*.48,1.27,0);orb(arm,cloth,side*.09,-.13,0,.25,.32,.24);orb(arm,skin,side*.11,-.38,.08,.14,.14,.15);
    r.arms.push(arm);
    const leg=group(r.body,side*.23,.46,0);orb(leg,skin,0,-.055,0,.13,.135,.14);
    const knee=group(leg,0,-.13,0);orb(knee,skin,0,-.04,0,.12,.105,.13);
    const foot=group(knee,0,-.17,.02);cube(foot,'#694e3b',0,-.05,.09,.35,.1,.46);orb(foot,skin,0,.06,.14,.145,.07,.16);curve(foot,'#d6ad76',[[-.12,.06,.17],[0,.1,.06],[.12,.06,.17]],.03);
    r.legs.push(leg);r.knees.push(knee);r.feet.push(foot);
  }
  r.bottle=bottle(r.arms[1],POTION_COLORS[r.character]);r.bottle.visible=false;
  r.hipBottle=createPotion(POTION_COLORS[r.character],.58);r.hipBottle.position.set(.45,.72,.4);r.body.add(r.hipBottle);
}
function mizu(r){
  const g=r.body;kimono(r,'#ff984b','#60cbbd');
  r.head=group(g,0,2,0);orb(r.head,'#60cbbd',0,0,0,.64,.61,.54);
  r.head.scale.set(1.13,1.08,1.12);
  eye(r.head,0,.04,.5,.4);curve(r.head,'#365c56',[[-.075,-.4,.46],[0,-.375,.48],[.06,-.4,.46]],.015);
  for(const s of [-1,1])orb(r.head,'#edb2a4',s*.45,-.22,.39,.14,.08,.035);
  orb(g,'#50755c',0,1.12,-.48,.57,.63,.24);ring(g,'#9cb991',.46,.04,0,1.12,-.7);
  for(let j=0;j<3;j++)for(let i=0;i<3;i++){const x=(i-1)*.23,y=.78+j*.25;const plate=part(g,new THREE.CircleGeometry(.14,6),'#6b8d74',x,y,-.72+Math.abs(x)*.12);plate.rotation.y=Math.PI;}
  const dish=ring(r.head,'#95b73f',.38,.08,0,.56,0);dish.rotation.x=-Math.PI/2;
  orb(r.head,'#28cded',0,.56,0,.35,.035,.35,.6);const waterRing=ring(r.head,'#b6f7ff',.22,.012,0,.605,0);waterRing.rotation.x=-Math.PI/2;
  for(let i=0;i<9;i++){const a=i/9*Math.PI*2;const leaf=orb(r.head,'#92b943',Math.sin(a)*.43,.46,Math.cos(a)*.43,.14,.065,.27);leaf.rotation.y=a;const drop=orb(r.head,'#26c7e6',Math.sin(a)*.5,.27,Math.cos(a)*.5,.034,.067,.034,.3);drop.rotation.z=Math.sin(a)*.2;}
}
function pon(r){
  const g=r.body;kimono(r,'#904b58','#b9835a');
  orb(g,'#bd9165',0,1.45,0,.67,.73,.48);
  r.head=group(g,0,2.1,0);orb(r.head,'#ae7b54',0,0,0,.55,.42,.43);
  for(const s of [-1,1]){orb(r.head,'#79543b',s*.41,.33,-.01,.23,.23,.17);orb(r.head,'#ddac91',s*.41,.34,.12,.11,.12,.04);eye(r.head,s*.34,.02,.38,.105);}
  // The oversized open belly-mouth is its unmistakable silhouette.
  r.mouth=group(g,0,1.35,.48);const rim=ring(r.mouth,'#e8c58d',.38,.075,0,0,0);rim.scale.set(1.25,1,1);
  orb(r.mouth,'#51333e',0,0,-.01,.46,.35,.1);orb(r.mouth,'#d77889',0,-.17,.09,.26,.08,.06);
  for(const side of [-1,1])cube(r.mouth,'#fff0cf',side*.18,.2,.075,.14,.08,.075);
  r.tail=group(g,0,1,-.37);const tail=orb(r.tail,'#ab744e',.15,.45,-.5,.59,.86,.48);tail.rotation.x=-.25;
  const tailGeo=ball.clone(),colors=[];
  for(let i=0;i<tailGeo.attributes.position.count;i++){const v=tailGeo.attributes.position.getY(i),stripe=Math.sin(v*10+1)>.05,c=new THREE.Color(stripe?'#795036':'#bb895e');colors.push(c.r,c.g,c.b);}
  tailGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));tail.geometry=tailGeo;tail.material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.87,bumpMap:microSurface('clay'),bumpScale:.02});
  for(const s of [-1,1])cube(g,'#e1b185',s*.5,1.25,.27,.13,.45,.1);
}
function kon(r){
  const g=r.body;kimono(r,'#565583','#f1c891');
  r.neck=flexibleTube(g,[[0,1.35,0],[.27,1.75,0],[-.2,2.15,0],[.16,2.46,0]],.19,mat('#f0cf9b'));
  r.head=group(r.neck.end,0,.08,0);orb(r.head,'#f1cc98',0,0,0,.45,.36,.35);
  orb(r.head,'#f8e0b3',0,-.09,.34,.26,.15,.22);orb(r.head,'#574640',0,-.03,.51,.07,.055,.04);
  ears(r.head,'#eab980',.5);eye(r.head,-.19,.06,.32,.13);eye(r.head,.18,.09,.32,.17);
  r.tail=group(g,0,.82,-.35);r.tailTips=[];for(const s of [-1,1]){const tip=group(r.tail);r.tailTips.push(tip);curve(tip,'#f0d8b3',[[s*.12,0,0],[s*.55,.18,-.3],[s*.88,.6,-.35],[s*.7,1.12,-.25]],.27);orb(tip,'#c8a4ee',s*.7,1.05,-.25,.28,.37,.26);}
  for(const s of [-1,1])for(let i=0;i<2;i++){const star=part(g,new THREE.OctahedronGeometry(.07),'#ebc472',s*.29,.73+i*.22,.46);star.scale.z=.3;}
}
function crowHead(g,x,y,expression){
  const h=group(g,x,y,0);orb(h,'#484564',0,0,0,.35,.38,.32);
  eye(h,-.135,.04,.28,.135);eye(h,.135,.04,.28,.135);
  curve(h,'#75604d',[[0,-.06,.26],[0,-.06,.52],[0,-.23,.67]],.12);
  const beak=orb(h,'#847360',0,-.065,.44,.2,.11,.27);beak.rotation.x=.22;
  for(let i=0;i<3;i++){const feather=part(h,new THREE.ConeGeometry(.075,.3,5),'#454f68',-.12+i*.12,.38,-.03);feather.rotation.z=(i-1)*.35;}
  if(expression){const brow=cube(h,'#394455',.13,.18,.4,.23,.045,.035);brow.rotation.z=-.3;}
  return h;
}
function sumi(r){
  const g=r.body;kimono(r,'#819878','#505f75');orb(g,'#556478',0,1.45,-.06,.49,.5,.34);
  r.head=crowHead(g,-.27,2.12,false);r.extraHead=crowHead(g,.3,2.32,true);
  r.tail=group(g,0,1.05,-.4);for(let i=0;i<3;i++){const feather=orb(r.tail,'#46576e',(i-1)*.17,-.16,-.16,.12,.43,.13);feather.rotation.z=(i-1)*.3;}
  for(const s of [-1,1])for(let i=0;i<6;i++){const feather=orb(r.arms[s===-1?0:1],'#4d486b',s*(i%2)*.1,-.06-i*.06,-.13,.14,.21,.08);feather.rotation.z=-s*.25;}
}
function nemu(r){
  const g=r.body;kimono(r,'#87a89c','#b09bab');
  r.head=group(g,0,1.99,0);orb(r.head,'#ae98ad',0,0,0,.52,.45,.41);ears(r.head,'#ae98ad',.48);
  // No eyes on the main head: the expressive face belongs to the curled tail.
  r.tail=group(g,0,.9,-.4);r.tailSpine=flexibleTube(r.tail,[[0,0,0],[.62,.35,-.12],[.95,1.13,0],[.55,1.55,.08]],.14,mat('#a38b9f'));
  const mask=group(r.tailSpine.end,0,.07,0);r.mask=mask;orb(mask,'#f2d4bb',0,0,0,.36,.35,.25);ears(mask,'#e3baad',.35);
  eye(mask,-.13,.04,.23,.1);eye(mask,.13,.04,.23,.1);orb(mask,'#9f6b74',0,-.13,.27,.05,.04,.025);
  for(const s of [-1,1]){const brow=cube(mask,'#6f5a67',s*.13,.15,.29,.15,.025,.025);brow.rotation.z=s*.23;}
  for(const s of [-1,1]){orb(mask,'#c58299',s*.13,.08,.27,.1,.045,.02);orb(mask,'#e29e9c',s*.22,-.1,.19,.065,.025,.015);}
  const bow=group(g,0,1.03,-.52);orb(bow,'#c17891',-.2,0,0,.2,.14,.08);orb(bow,'#c17891',.2,0,0,.2,.14,.08);
}
function akari(r){
  const g=r.body;kimono(r,'#4c7984','#dabb84');r.lanterns=[];
  for(let i=0;i<3;i++){
    const l=group(i?r.lanterns[i-1]:g,i?Math.sin(i)*.04:0,i?.68:1.02,0);r.lanterns.push(l);
    orb(l,'#ffb354',0,0,0,.44-i*.05,.35,.4-i*.04,.85);
    for(const y of [-.22,-.11,0,.11,.22]){const t=ring(l,'#bb8b50',.35-i*.04,.012,0,y,0);t.rotation.x=Math.PI/2;}
    for(const y of [-.32,.32])tube(l,'#855c42',.21,.21,.05,0,y,0);
  }
  r.head=r.lanterns[2];eye(r.head,-.13,.03,.33,.12);eye(r.head,.13,.03,.33,.12);
  orb(r.lanterns[1],'#764346',0,-.01,.39,.21,.15,.045);orb(r.lanterns[1],'#cc8190',0,-.08,.42,.12,.045,.03);
  const cap=part(r.head,new THREE.ConeGeometry(.14,.19,16),'#85623d',0,.43,0);
  ring(r.head,'#c29960',.085,.023,0,.56,0);r.head.userData.cap=cap;
}
function kasa(r){
  const g=r.body;r.legs=[];r.arms=[];
  r.tassels=[];r.umbrella=group(g,0,2.12,0);const geo=new THREE.ConeGeometry(.95,.6,12,1,true);const canopy=part(r.umbrella,geo,'#a58cbe',0,0,0);canopy.material=mat('#a58cbe').clone();canopy.material.side=THREE.DoubleSide;
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;curve(r.umbrella,'#d6bdca',[[0,.3,0],[Math.sin(a)*.47,0,Math.cos(a)*.47],[Math.sin(a)*.95,-.3,Math.cos(a)*.95]],.012);const tassel=group(r.umbrella,Math.sin(a)*.91,-.3,Math.cos(a)*.91);orb(tassel,'#e6c29a',0,-.13,0,.035,.16,.035);r.tassels.push(tassel);}
  eye(r.umbrella,0,-.04,.58,.26);orb(r.umbrella,'#e28ca6',0,-.36,.53,.12,.16,.06);tube(g,'#8c6b48',.065,.065,1.1,0,1.3,0);tube(g,fabric('#e7a73b','flowers'),.26,.45,.6,0,1.02,0);
  const arm=group(g,.35,1.23,0);orb(arm,'#c7b0d0',0,-.14,.02,.14,.25,.14);r.arms.push(group(g,-.35,1.23,0),arm);
  orb(r.arms[0],'#c7b0d0',0,-.14,.02,.14,.25,.14);r.bottle=bottle(arm,'#75ef83');r.bottle.visible=false;r.hipBottle=createPotion('#75ef83',.56);r.hipBottle.position.set(.32,.83,.32);g.add(r.hipBottle);
  const leg=group(g,0,.81,0);tube(leg,'#beabc9',.095,.095,.42,0,-.14,0);cube(leg,'#a5784d',0,-.62,.12,.68,.22,.75);cube(leg,'#e2c991',0,-.47,.16,.6,.06,.68);r.legs.push(leg);r.head=r.umbrella;
  const bow=group(g,0,1.1,.3);orb(bow,'#556884',-.14,0,0,.17,.11,.07);orb(bow,'#556884',.14,0,0,.17,.11,.07);
}
const builders={mizu,pon,kon,sumi,nemu,akari,kasa};
export function createAvatar(character){
  if(!builders[character])throw Error('Unknown yokai model');
  const root=new THREE.Group(),body=group(root),rig={root,body,arms:[],legs:[],knees:[],feet:[],character};builders[character](rig);
  root.name=`yokai-3d-${character}`;root.userData.volumetric=true;rig.armOrigins=rig.arms.map(a=>a.rotation.clone());rig.eyes=[];root.traverse(n=>{if(n.userData.eye)rig.eyes.push(n);});rig.phase=Object.keys(builders).indexOf(character)*.71;rig.ears=[];root.traverse(n=>{if(n.name==='yokai-ear')rig.ears.push(n);});
  prepareMotion(rig);batchRigidParts(root);
  return rig;
}
export function animateAvatar(r,p,dt,time,tick,position){animateCharacter(r,p,dt,time,tick,position);}
