import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {WORLD,STALLS,POTION_SPOTS,groundHeight,walkable} from '/shared/world.mjs';
import {surface,fabric,part,orb,cube,tube,group,curve,ring,createPotion,softBox} from './renderkit.mjs';
import {createVisitor,animateVisitor} from './visitors.mjs';
import {buildFoliage} from './foliage.mjs';
import {buildFestivalScenery} from './festival-scenery.mjs';
import {timber,stoneSurface,groundMaterial,pavingMaterial} from './art-materials.mjs';
// REMASTER-HOOK r02: lanterns register light anchors so the render pipeline can paint light pools and place real lights.
import {registerLantern} from './render/lanterns.mjs';
// R04: hand-modelled festival kit (stalls, lanterns, flagstones) from public/assets/env/v2.
import {createFestivalKit,KIT_STALLS} from './festival-kit.mjs';
export {KIT_STALLS};
let kit=null;
const lanternAt=(parent,x,y,z,kind,extra)=>{parent.updateWorldMatrix(true,false);const p=parent.localToWorld(new THREE.Vector3(x,y,z));registerLantern({x:p.x,y:p.y,z:p.z,kind:kind||(p.y-groundHeight(p.x,p.z)>4?'string':'paper'),...extra});};

const wood=timber('#886048'),gold=surface('#d5a758',{metalness:.4,roughness:.45}),red=surface('#b94942'),stone=stoneSurface('#a59c8d');
const lamp=surface('#ffba6c',{emissive:'#ff9b48',emissiveIntensity:1.05,roughness:.82});
function makeWater(color){return new THREE.ShaderMaterial({uniforms:{time:{value:0},color:{value:new THREE.Color(color)}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;uniform float time;uniform vec3 color;void main(){float w=sin(v.x*38.+time*1.7+sin(v.y*19.-time))*sin(v.y*29.-time*1.1);float lines=pow(max(0.,sin(v.x*65.+v.y*33.+time*1.2)),16.);vec3 c=color*(.8+w*.12)+vec3(.18,.22,.20)*lines*.65;float warm=exp(-pow((v.x-.72)*14.,2.))*(.08+lines*.05);c+=vec3(.5,.3,.08)*warm;gl_FragColor=vec4(c,1.);}'});}
function sign(parent,text,x,y,z,w=2.7){
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');
  ctx.fillStyle='#fae1b0';ctx.beginPath();ctx.roundRect(2,2,508,124,18);ctx.fill();ctx.strokeStyle='#bc8050';ctx.lineWidth=6;ctx.stroke();
  ctx.fillStyle='#59332c';ctx.font='700 58px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,67,455);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  const m=part(parent,new THREE.PlaneGeometry(w,w/4),new THREE.MeshStandardMaterial({map:t,roughness:.8,side:THREE.DoubleSide}),x,y,z);return m;
}
let paperTexture;const paperMaterials=new Map();
function lantern(parent,x,y,z,color=null){
  lanternAt(parent,x,y,z,null,color?{color}:undefined); // REMASTER-HOOK r02
  // R04: paper lanterns are instances of env_lantern_paper; the procedural one is the load-failure fallback.
  parent.updateWorldMatrix(true,false);const p=parent.localToWorld(new THREE.Vector3(x,y,z));
  if(kit)kit.paperLantern(p.x,p.y,p.z,color,()=>lanternProcedural(parent,x,y,z,color));else lanternProcedural(parent,x,y,z,color);
}
function lanternProcedural(parent,x,y,z,color=null){
  if(!paperTexture){const c=document.createElement('canvas');c.width=128;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#fff4dc';ctx.fillRect(0,0,128,256);for(let i=0;i<256;i+=16){ctx.fillStyle='#a5774944';ctx.fillRect(0,i,128,2);ctx.fillStyle='#ffffff66';ctx.fillRect(0,i+2,128,2);}for(let i=0;i<1800;i++){ctx.fillStyle=i%2?'#bd8d5120':'#ffffff44';ctx.fillRect((Math.sin(i*13.4)*.5+.5)*128,(Math.cos(i*21)*.5+.5)*256,1,2);}paperTexture=new THREE.CanvasTexture(c);paperTexture.colorSpace=THREE.SRGBColorSpace;}
  const tint=color||'#ffc681';if(!paperMaterials.has(tint))paperMaterials.set(tint,new THREE.MeshStandardMaterial({color:tint,map:paperTexture,emissive:tint,emissiveMap:paperTexture,emissiveIntensity:.65,roughness:.85}));const m=paperMaterials.get(tint);
  const profile=[];for(let i=0;i<=24;i++){const t=i/24;profile.push(new THREE.Vector2(.11+Math.sin(Math.PI*t)*.21+Math.cos(t*Math.PI*24)*.006,(t-.5)*.75));}
  part(parent,new THREE.LatheGeometry(profile,24),m,x,y,z);
  for(const yy of [-.37,.37])tube(parent,wood,.13,.13,.055,x,y+yy,z);
  curve(parent,wood,[[x,y+.4,z],[x,y+.54,z],[x+.08,y+.59,z]],.014);
  const tassel=part(parent,new THREE.ConeGeometry(.025,.18,5),gold,x,y-.48,z);tassel.rotation.z=.08;
}
function terrainMaterial(){
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#628b72';ctx.fillRect(0,0,512,512);
  for(let i=0;i<4500;i++){const x=(Math.sin(i*93.1)*.5+.5)*512,y=(Math.sin(i*13.7)*.5+.5)*512;ctx.fillStyle=i%2?'#87a47b55':'#456e5d44';ctx.fillRect(x,y,2,4);}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(9,12);t.anisotropy=8;
  return new THREE.MeshStandardMaterial({map:t,roughness:1,color:'#b6c7b1'});
}
// Combine the static props by material, keeping the much richer map affordable.
function batch(root){
  root.updateMatrixWorld(true);const buckets=new Map();
  root.traverse(n=>{if(n.isMesh&&!n.material.transparent){if(!buckets.has(n.material))buckets.set(n.material,[]);buckets.get(n.material).push(n);}});
  for(const [mat,nodes]of buckets){if(nodes.length<2)continue;const geos=nodes.map(n=>{const g=n.geometry.clone().applyMatrix4(n.matrixWorld);return g.index?g.toNonIndexed():g;});const geo=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());if(!geo)continue;nodes.forEach(n=>n.removeFromParent());const merged=part(root,geo,mat);merged.name='batched-festival-scenery';}
}
export function buildFestival(scene,potionNodes){
  const world=group(scene),wind=[],keepers=[],waterUniforms=[],steamOrigins=[];let lastTime=0;
  kit=createFestivalKit(scene,{water:()=>{const w=makeWater('#245f78');waterUniforms.push(w.uniforms);return w;}});
  const geo=new THREE.PlaneGeometry(52,75,88,118);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position;for(let i=0;i<pos.count;i++){const z=pos.getZ(i)-7.5;pos.setZ(i,z);pos.setY(i,groundHeight(pos.getX(i),z));}geo.computeVertexNormals();
  const ground=part(world,geo,groundMaterial());ground.castShadow=false;
  // R04: painterly night ground (dark moss, earth, fallen leaves); tiles every 5 m. The canvas texture stays as the fallback.
  new THREE.TextureLoader().load('/assets/env/v2/textures/kit_ground.webp',t=>{t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(52/5,75/5);t.anisotropy=8;ground.material.map=t;ground.material.color.set('#ffffff');ground.material.needsUpdate=true;});
  const pathGeo=new THREE.PlaneGeometry(4.8,56,12,112);pathGeo.rotateX(-Math.PI/2);const pv=pathGeo.attributes.position;
  for(let i=0;i<pv.count;i++){const z=pv.getZ(i)-7.5,x=pv.getX(i)+Math.sin(z*.14)*.35;pv.setX(i,x);pv.setZ(i,z);pv.setY(i,groundHeight(x,z)+.045);}pathGeo.computeVertexNormals();
  const pathMaterial=stoneSurface('#a6a393').clone();part(world,pathGeo,pathMaterial).castShadow=false;pavingMaterial().then(m=>{pathMaterial.copy(m);pathMaterial.color.set('#5b5145');pathMaterial.needsUpdate=true;}); // R04: reads as dark soil between the flagstones
  // Real beveled paving catches light along the edges instead of painting depth on a plane.
  const tileMatrix=new THREE.Matrix4(),tilePos=new THREE.Vector3(),tileQuat=new THREE.Quaternion(),tileEuler=new THREE.Euler(),tileScale=new THREE.Vector3();
  const pavingColors=['#8e9a94','#a2aa9c','#b2b4a2','#95a39a','#aaa994'].map(c=>stoneSurface(c));
  for(let row=0;row<68;row++){
    const z=20-row*.82;
    for(let col=0;col<(row%2?6:5);col++){
      const edge=row%2&&(col===0||col===5),w=edge?.43:.91;
      const x=(row%2?col*.96-2.4:col*.96-1.92)+(edge?(col===0?.24:-.24):0)+Math.sin(z*.14)*.35;
      // R04: flagstones are instances of env_path_tiles (uneven tops, chipped corners, moss); softBox is the fallback.
      const slope=Math.atan2(groundHeight(x,z-.1)-groundHeight(x,z+.1),.2),turn=Math.sin(row*17+col*3)*.02+((row+col)%2?Math.PI:0),n=row*31+col*17;
      const shade=.86+.14*Math.abs(Math.sin(n*1.7)),mossy=Math.sin(n*.37)>.72;
      tileMatrix.compose(tilePos.set(x,groundHeight(x,z)-.015+.012*Math.sin(n*2.3),z),tileQuat.setFromEuler(tileEuler.set(slope,turn,0,'YXZ')),tileScale.set(w/.91,1,1));
      kit.pathTile(tileMatrix,n,new THREE.Color(mossy?'#b9c29a':'#ffffff').multiplyScalar(shade),()=>{
        const tile=softBox(world,pavingColors[(row*3+col*7)%5],x,groundHeight(x,z)+.03,z,w,.075,.77,.055);tile.rotation.x=slope;tile.rotation.y=Math.sin(row*17+col*3)*.014;});
    }
  }
  for(let z=-35;z<21;z+=1.05)for(const side of [-1,1]){const x=side*2.58+Math.sin(z*.14)*.35;const slab=softBox(world,stone,x,groundHeight(x,z)+.075,z,.3,.16,.99,.04);slab.rotation.y=Math.sin(z)*.025;}
  for(const s of STALLS){
    const g=group(world,s.x,groundHeight(s.x,s.z),s.z),cloth=fabric(s.color,'waves','#f6d9a9');
    // R04: stalls with a festival-kit GLB (public/assets/env/v2) skip the procedural body; it stays as the load-failure fallback.
    const bodyA=()=>{
    softBox(g,wood,0,.55,0,s.w,1.1,s.d,.07);softBox(g,timber('#b5865b'),0,1.16,0,s.w+.2,.15,s.d+.3,.035);
    for(let i=0;i<12;i++)cube(g,wood,-s.w/2+(i+.5)*s.w/12,.55,s.d/2+.03,s.w/12-.016,.96,.055);
    for(const x of [-s.w/2,s.w/2])for(const z of [-s.d/2,s.d/2])tube(g,wood,.085,.1,3.15,x,1.55,z);
    const roofGeo=new THREE.PlaneGeometry(s.w+.85,s.d+1.05,16,14),rv=roofGeo.attributes.position;
    for(let i=0;i<rv.count;i++){const x=rv.getX(i),z=rv.getY(i);rv.setXYZ(i,x,Math.cos(z/(s.d+1.05)*Math.PI)*.32+Math.cos(x*12)*.014,z);}roofGeo.computeVertexNormals();
    const roof=part(g,roofGeo,cloth,0,3.13,0);roof.material=cloth.clone();roof.material.side=THREE.DoubleSide;
    for(const side of [-1,1])curve(g,gold,[[side*(s.w/2+.4),3.1,-s.d/2-.25],[side*s.w/2,3.35,0],[side*(s.w/2+.4),3.15,s.d/2+.5]],.065);
    for(let i=0;i<8;i++){const x=-s.w/2+(i+.5)*s.w/8;const flap=softBox(g,cloth,x,2.96,s.d/2+.58,s.w/8-.015,.55,.07,.025);flap.rotation.z=Math.sin(i*4)*.02;}
    };
    sign(g,s.name,0,2.38,s.d/2+.62,2.35);lantern(g,-s.w/2+.1,2.04,s.d/2+.57);lantern(g,s.w/2-.1,2.04,s.d/2+.57);
    sign(g,'E · Play',0,.65,s.d/2+.2,1.3);
    const shopkeeper=createVisitor(STALLS.indexOf(s)+1);shopkeeper.root.position.set(s.x+.75,groundHeight(s.x,s.z)+.07,s.z-.5);shopkeeper.root.scale.setScalar(.94);shopkeeper.arms.forEach(a=>a.rotation.x=-.5);scene.add(shopkeeper.root);keepers.push({rig:shopkeeper,kind:s.game});
    if(s.game==='cook')steamOrigins.push({x:s.x-.4,y:groundHeight(s.x,s.z)+1.7,z:s.z+.5});
    const bodyB=()=>{
    if(s.game==='shoot'){
      for(let row=0;row<2;row++){cube(g,wood,-.75,1.65+row*.58,-.55,1.9,.09,.6);for(let i=0;i<3;i++){const x=-1.4+i*.62,y=1.91+row*.58;orb(g,['#ce6354','#e6c384','#ad869e'][i],x,y,-.55,.2,.23,.16);for(const side of [-1,1]){orb(g,'#d8a570',x+side*.16,y+.18,-.55,.065);orb(g,'#342c31',x+side*.065,y+.04,-.4,.023);}orb(g,'#f6dfa9',x,y-.05,-.39,.065);}}
      const rifle=cube(g,wood,-.5,1.33,.85,1.4,.12,.16);rifle.rotation.y=.2;tube(g,gold,.04,.04,.6,.3,1.33,.7).rotation.z=Math.PI/2;
    }else if(s.game==='fish'){
      softBox(g,'#365c79',-.3,1.27,.4,2.9,.24,1.5,.04);const wm=makeWater('#6fbaca');waterUniforms.push(wm.uniforms);const water=part(g,new THREE.PlaneGeometry(2.7,1.3),wm,-.3,1.42,.4);water.rotation.x=-Math.PI/2;
      for(let i=0;i<8;i++){const x=-1.35+(i%4)*.7,z=.08+Math.floor(i/4)*.55;orb(g,'#ed9751',x,1.46,z,.1,.035,.055);part(g,new THREE.ConeGeometry(.07,.12,3),'#ecbd70',x+.13,1.46,z).rotation.z=-Math.PI/2;}
      ring(g,'#eed5a3',.18,.025,1.2,1.45,1.1).rotation.x=Math.PI/2;
    }else if(s.game==='ring'){
      cube(g,'#dfb87c',-.3,1.28,.5,2.8,.13,1.55);for(let i=0;i<6;i++){const x=-1.15+(i%3)*.8,z=.15+Math.floor(i/3)*.7;const base=ring(g,['#c7594c','#6c9d82','#c7a542'][i%3],.24,.03,x,1.36,z);base.rotation.x=Math.PI/2;tube(g,wood,.055,.07,.36,x,1.52,z);if(i%2===0)ring(g,'#e6cf9a',.18,.025,x,1.4,z).rotation.x=Math.PI/2;}
    }else if(s.game==='cook'){
      cube(g,'#303337',-.4,1.3,.5,2.7,.18,1.4);for(let i=0;i<12;i++){const x=-1.45+(i%6)*.4,z=.25+Math.floor(i/6)*.5;tube(g,'#161d24',.17,.17,.035,x,1.41,z);orb(g,'#d7974a',x,1.48,z,.14,.1,.14);orb(g,'#e7d7a8',x+.04,1.56,z,.07,.012,.025);}for(let i=0;i<2;i++)tube(g,['#cc6847','#eadcae'][i],.075,.09,.35,1.1+i*.22,1.45,.65);
    }else if(s.game==='fortune'){
      cube(g,wood,-.55,1.43,.4,.9,.5,.7);cube(g,'#352b30',-.55,1.7,.4,.3,.02,.26);for(let i=0;i<5;i++){const x=-1.55+i*.61;orb(g,['#ce8c88','#b195ba','#84b2a4'][i%3],x,1.36,.98,.2,.2,.16);tube(g,gold,.09,.055,.09,x,1.57,.98);ring(g,'#f2dda9',.09,.02,x,1.64,.98);}
    }else{
      const m=surface('#6b949d',{metalness:.4});cube(g,m,-.65,1.65,.4,.9,.08,.85);for(const x of [-1.05,-.25])tube(g,m,.05,.05,.95,x,1.8,.4);cube(g,m,-.65,2.25,.4,.9,.14,.85);cube(g,surface('#d5f5ec',{transparent:true,opacity:.7,roughness:.1}),-.65,1.98,.4,.5,.35,.5);const crank=ring(g,m,.27,.045,-.04,2,.4);crank.rotation.y=Math.PI/2;tube(g,wood,.055,.055,.28,.12,2.24,.4).rotation.z=Math.PI/2;for(let i=0;i<3;i++){const x=.48+i*.32;tube(g,['#d96980','#83b16d','#dcba62'][i],.1,.12,.43,x,1.45,.98);tube(g,gold,.05,.05,.13,x,1.73,.98);}
    }
    const apron=softBox(g,cloth,0,.65,s.d/2+.045,s.w-.18,.78,.055,.018);
    for(const x of [-s.w/2,s.w/2]){curve(g,gold,[[x,2.85,s.d/2],[x,3.03,0],[x,2.82,-s.d/2]],.026);for(let i=0;i<3;i++)ring(g,'#ceb087',.115,.025,x,2.8+i*.055,s.d/2);}
    for(let k=0;k<7;k++)cube(g,timber('#986e4e'),-s.w/2+(k+.5)*s.w/7,1.55,-s.d/2+.06,s.w/7-.025,.7,.06);
    cube(g,wood,0,2,-s.d/2,s.w+.15,.12,.12);
    for(let k=0;k<4;k++)cube(g,wood,(k-1.5)*.8,.42,s.d/2+.085,.035,.78,.045);
    };
    if(KIT_STALLS[s.game])kit.stall(g,KIT_STALLS[s.game],()=>{bodyA();bodyB();});else{bodyA();bodyB();}
    // Small stepping stones connect every booth to the festival lane.
    for(let k=0;k<5;k++){const t=(k+.5)/5,x=THREE.MathUtils.lerp(Math.sign(s.x)*2.8,s.x,t),z=s.z+s.d/2+1;for(const side of [-1,1]){const pz=z+side*.34,slab=softBox(world,stone,x,groundHeight(x,pz)+.04,pz,.82,.09,.64,.11);slab.rotation.y=Math.sin(k*4+s.x)*.15;}}

    // REMASTER-HOOK r02: the stall glow is a lantern anchor; the render pipeline decides how many real lights exist per profile.
    registerLantern({x:s.x,y:2.5+groundHeight(s.x,s.z),z:s.z+2,kind:'stall'});
    const flag=group(scene,s.x+s.w/2+.6,groundHeight(s.x,s.z),s.z);tube(flag,wood,.04,.04,4.3,0,2.15,0);const banner=cube(flag,cloth,.45,3.05,0,.85,1.85,.018);wind.push(banner);
  }
  // The water garden is an actual obstacle, with a consistent sloping ground plane.
  const pond=group(world,-16,groundHeight(-16,-9),-9);softBox(pond,stone,0,.11,0,4.5,.24,5,.12);const pondMat=makeWater('#2d6c82');waterUniforms.push(pondMat.uniforms);const pondSurface=part(pond,new THREE.PlaneGeometry(4.1,4.6),pondMat,0,.25,0);pondSurface.rotation.x=-Math.PI/2;
  for(let i=0;i<15;i++){const a=i/15*Math.PI*2;const rock=part(pond,new THREE.DodecahedronGeometry(.4,1),stone,Math.sin(a)*2.1,.28,Math.cos(a)*2.35);rock.scale.set(1,.65,1);rock.rotation.y=i;}
  for(let i=0;i<5;i++){const x=Math.sin(i*3)*1.4,z=Math.cos(i*3)*1.6;const pad=tube(pond,'#7b9b6e',.28,.3,.025,x,.28,z);orb(pond,'#e4b5c6',x,.35,z,.085,.05,.085);}
  // Low fences, stone lanterns, rope ties, baskets and lantern-lit seating.
  for(let z=-30;z<=18;z+=3.5)for(const side of [-1,1]){
    const x=side*17.1,y=groundHeight(x,z);tube(world,wood,.075,.09,1.1,x,y+.55,z);for(const yy of [.42,.85])cube(world,red,x,y+yy,z+1.72,.13,.14,3.5);
  }
  for(const [x,z]of [[-5,16],[5,15],[-6,-5],[5,-15],[-7,-23],[6,-25]]){
    const g=group(world,x,groundHeight(x,z),z);registerLantern({x,y:groundHeight(x,z)+1.26,z,kind:'stone'}); // REMASTER-HOOK r02
    g.rotation.y=Math.sin(x*3+z)*.3;g.updateWorldMatrix(true,false);
    // R04: env_lantern_stone instance; procedural lantern only if the GLB fails.
    kit.stoneLantern(g.matrixWorld,()=>{softBox(g,stone,0,.25,0,.6,.5,.6,.06);tube(g,stone,.19,.27,.7,0,.72,0);softBox(g,wood,0,1.17,0,.58,.46,.58,.02);orb(g,lamp,0,1.16,0,.19,.19,.19);
    part(g,new THREE.ConeGeometry(.59,.35,4),stone,0,1.61,0).rotation.y=Math.PI/4;
    for(const s of [-1,1])for(const zz of [-.22,.22])cube(g,wood,s*.22,1.18,zz,.045,.5,.045);});
  }
  for(const [x,z]of [[-5,5],[5,-7],[-5,-20]]){const g=group(world,x,groundHeight(x,z),z);softBox(g,timber('#b68561'),0,.52,0,2.2,.15,.6,.04);for(const s of [-1,1])softBox(g,wood,s*.7,.24,0,.12,.5,.4,.025);}
  // Shrubs and rocks sit outside the navigation lane and stall entrances.
  for(let i=0;i<45;i++){const side=i%2?1:-1,x=side*(14.7+Math.sin(i*2)*1.2),z=19-i/45*53;if(!walkable(x,z,1.1))continue;const y=groundHeight(x,z);const rock=part(world,new THREE.DodecahedronGeometry(.35+(i%4)*.09,1),stone,x,y+.13,z);rock.scale.set(1.4,.55,1);rock.rotation.set(i*.1,i,0);}
  // Festival drum platform: cloth, rope bands, studs and a striped tower.
  const stage=group(world,7,groundHeight(7,-10),-10);cube(stage,wood,0,.25,0,5,.5,4);cube(stage,red,0,.55,0,5,.1,4);
  for(let i=-3;i<=3;i++)cube(stage,i%2?'#eadcc1':red,i*.7,.27,2.02,.7,.42,.04);
  const drum=tube(stage,'#a46a45',.83,.85,1.05,0,1.11,0);for(const y of [.65,1.62])tube(stage,'#f4d8a0',.88,.88,.07,0,y,0);
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;orb(stage,gold,Math.sin(a)*.855,1.52,Math.cos(a)*.855,.04);}
  for(const side of [-1,1]){const stick=tube(stage,wood,.025,.025,1,side*.23,1.82,0);stick.rotation.z=side*.6;}
  sign(stage,'Moonlight Festival',0,3.7,-1.6,3.3);for(const x of [-2,2]){tube(stage,wood,.07,.07,4,x,2,-1.6);lantern(stage,x,3.3,-1.6);}
  // The shrine arch and portal at the top of the mountain.
  const summit=group(world,0,groundHeight(0,-30),-30);
  for(let i=0;i<3;i++)cube(summit,stone,0,.12+i*.16,0,9-i*.75,.2,5-i*.55);
  for(const x of [-3,3]){tube(summit,red,.22,.3,5,x,2.85,0);tube(summit,gold,.25,.25,.11,x,.63,0);tube(summit,gold,.23,.23,.11,x,4.55,0);}
  cube(summit,red,0,4.8,0,6.9,.32,.55);curve(summit,'#393d47',[[-4.3,5.65,0],[-3.4,5.48,0],[0,5.38,0],[3.4,5.48,0],[4.3,5.65,0]],.2);
  cube(summit,red,0,5.28,0,8.1,.25,.65);cube(summit,wood,0,.99,-1,2.5,.7,1);sign(summit,'Spirit Gate',0,4.35,.35,2.4);
  const rope=curve(summit,'#d5be89',[[-2.7,4.3,.25],[0,3.84,.4],[2.7,4.3,.25]],.055);
  for(const x of [-1.6,0,1.6]){const paper=cube(summit,'#fff4d3',x,3.76,.43,.18,.5,.03);paper.rotation.z=.3;}
  const portal=part(scene,new THREE.PlaneGeometry(5.35,4.15),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:{value:0}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;uniform float time;void main(){vec2 p=v-.5;float r=length(p*vec2(1.,1.3));float s=sin(r*50.-time*3.)*.5+.5;float a=smoothstep(.57,.2,r)*(.17+s*.16);gl_FragColor=vec4(.44+s*.3,.32+s*.23,.9,a);}'}),0,groundHeight(0,-30)+2.5,-30.1);portal.name='summit-portal';registerLantern({x:0,y:groundHeight(0,-30)+1.6,z:-29.4,kind:'portal'}); // REMASTER-HOOK r02
  
  for(const x of [-4.3,4.3]){cube(summit,stone,x,.75,1.9,.55,1.1,.55);lantern(summit,x,1.72,1.9);}
  const arrival=ring(world,surface('#c49cf9',{emissive:'#9672ee',emissiveIntensity:1.3}),2.5,.06,0,.11,18.5);arrival.rotation.x=-Math.PI/2;
  for(let i=0;i<14;i++){const a=i/14*Math.PI*2;const rune=part(world,new THREE.OctahedronGeometry(.08),gold,Math.sin(a)*2.8,.12,18.5+Math.cos(a)*2.8);rune.scale.y=.2;}
  // Sagging paper lantern strings and small cloth pennants.
  for(const z of [15,7,-2,-11,-21]){
    const points=[];for(let i=0;i<=16;i++){const x=-19+i*38/16,y=7.3-Math.sin(i/16*Math.PI)*1.2+groundHeight(x,z);points.push([x,y,z]);}
    curve(world,wood,points,.017);
    for(let i=1;i<15;i++){const x=-19+i*38/16,y=7.3-Math.sin(i/16*Math.PI)*1.2+groundHeight(x,z);if(Math.abs(x)>3)lantern(world,x,y-.5,z,i%4===0?'#f28a8d':null);}
    for(const x of [-19,19])tube(world,wood,.09,.13,7.5,x,groundHeight(x,z)+3.75,z);
  }
  const foliage=buildFoliage(scene);
  // Wishing bamboo and hanging papers beside the shop.
  for(let j=0;j<4;j++){const x=-14.4+j*.42,z=-12.5;const bamboo=group(world,x,groundHeight(x,z),z);tube(bamboo,'#76926b',.045,.06,4,0,2,0);for(let k=0;k<5;k++){const a=k*2.4+j;curve(bamboo,'#718c62',[[0,1+k*.55,0],[Math.sin(a)*.48,1.4+k*.55,Math.cos(a)*.5]],.023);const leaf=orb(bamboo,'#8aab77',Math.sin(a)*.4,1.45+k*.55,Math.cos(a)*.4,.12,.035,.35);leaf.rotation.y=a;if(k%2===0){const slip=cube(bamboo,['#b794c8','#b9d5c2','#f4d38c'][k%3],Math.sin(a)*.35,.98+k*.55,Math.cos(a)*.4,.16,.43,.015);slip.rotation.z=.15;}}}
  for(const p of POTION_SPOTS){
    const g=group(scene,p.x,groundHeight(p.x,p.z),p.z);g.name=p.id;
    tube(g,surface('#5b5770'),.39,.48,.15,0,.07,0);const halo=ring(g,surface('#52d4f5',{emissive:'#46bffd',emissiveIntensity:2}),.36,.02,0,.17,0);halo.rotation.x=Math.PI/2;
    const b=createPotion(['#25c8ff','#b978ff','#ffb53e'][Number(p.id.slice(1))%3],1.15);b.position.y=.9;g.add(b);g.userData.bottle=b;
    const motes=group(g);for(let i=0;i<5;i++){const spark=part(motes,new THREE.OctahedronGeometry(.035),surface('#e5f9ff',{emissive:'#a6eaff',emissiveIntensity:2.5}));spark.position.set(Math.sin(i*2.4)*.43,.6+i*.16,Math.cos(i*2.4)*.43);}g.userData.motes=motes;potionNodes.set(p.id,g);registerLantern({x:p.x,y:groundHeight(p.x,p.z)+.9,z:p.z,kind:'potion'}); // REMASTER-HOOK r02
  
  }
  const scenery=buildFestivalScenery(scene,kit);
  const motePositions=new Float32Array(135*3),moteGeo=new THREE.BufferGeometry();moteGeo.setAttribute('position',new THREE.BufferAttribute(motePositions,3));const moteMat=new THREE.PointsMaterial({color:'#ffe2a0',size:.045,transparent:true,opacity:.65,depthWrite:false});scene.add(new THREE.Points(moteGeo,moteMat));
  const steamData=new Float32Array(steamOrigins.length*18*3),steamGeo=new THREE.BufferGeometry();steamGeo.setAttribute('position',new THREE.BufferAttribute(steamData,3));
  const steamMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:'void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(330./-p.z,3.,22.);gl_Position=projectionMatrix*p;}',fragmentShader:'void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(.82,.87,.92,(1.-r)*(1.-r)*.18);}'});
  scene.add(new THREE.Points(steamGeo,steamMat));
  batch(world);
  kit.finish();
  return {ground,kit,update(time,camera,subject,focus){
    scenery.update(time,camera,subject,focus);foliage.update(time);portal.material.uniforms.time.value=time;wind.forEach((b,i)=>b.rotation.y=Math.sin(time*1.6+i)*.12);
    waterUniforms.forEach(u=>u.time.value=time);
    steamOrigins.forEach((origin,j)=>{for(let i=0;i<18;i++){const age=(time*.4+i/18)%1,at=(j*18+i)*3;steamData[at]=origin.x+Math.sin(i*4+time)*.16+Math.sin(age*5)*.15;steamData[at+1]=origin.y+age*1.2;steamData[at+2]=origin.z+Math.cos(i*3+time)*.2;}});steamGeo.attributes.position.needsUpdate=true;
    const delta=Math.min(.1,Math.max(0,time-lastTime));lastTime=time;
    keepers.forEach(({rig,kind},i)=>{
      animateVisitor(rig,{x:rig.root.position.x,z:rig.root.position.z,direction:0},delta,time);
      rig.arms.forEach((a,j)=>{a.rotation.x+=kind==='cook'?-.5+Math.sin(time*3+i+j)*.17:kind==='ice'?-.5+Math.sin(time*2+i+j)*.25:-.1+Math.sin(time*1.4+i+j)*.08;});
    });
    for(const n of potionNodes.values()){const b=n.userData.bottle;b.rotation.y=time*.55;b.position.y=.95+Math.sin(time*2+n.position.x)*.12;n.userData.motes.rotation.y=-time*.65;b.userData.bubbles.rotation.y=time;}
    for(let i=0;i<135;i++){motePositions[i*3]=Math.sin(i*127)*19+Math.sin(time*.25+i)*.4;motePositions[i*3+1]=.8+(i%5)*.7+Math.sin(time*.5+i)*.2;motePositions[i*3+2]=Math.cos(i*29)*27-7;}moteGeo.attributes.position.needsUpdate=true;
  }};
}
