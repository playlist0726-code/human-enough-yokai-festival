import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {groundHeight} from '../shared/world.mjs';
import {surface,part,group,orb,tube,curve,softBox} from './renderkit.mjs';
import {timber,stoneSurface} from './art-materials.mjs';
// REMASTER-HOOK r02: stone lanterns register light anchors; the night sky moved to public/render/sky.mjs.
import {registerLantern} from './render/lanterns.mjs';
const {sin,cos}=Math;

const rand=n=>{const x=Math.sin(n*127.1+12.7)*43758.5453;return x-Math.floor(x);};
const roofMat=surface('#263b55',{roughness:.58}),vermilion=timber('#a64538'),wood=timber('#71513e'),ivory=surface('#eed9b2'),brass=surface('#c7a35e',{metalness:.45,roughness:.4});
function roof(parent,w,d,y){
  const positions=[],uv=[],indices=[],nx=16,nz=16;
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
    const u=i/nx*2-1,v=j/nz*2-1,edge=Math.max(Math.abs(u),Math.abs(v));
    positions.push(u*w/2,y+.85*(1-edge)+Math.pow(edge,7)*.23+Math.cos(i*Math.PI)*.018,v*d/2);uv.push(i/nx,j/nz);
    if(i<nx&&j<nz){const a=j*(nx+1)+i;indices.push(a,a+nx+1,a+1,a+1,a+nx+1,a+nx+2);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  const m=roofMat.clone();m.side=THREE.DoubleSide;part(parent,g,m);
  for(const s of [-1,1])curve(parent,brass,[[-w/2,y+.23,s*d/2],[0,y+.24,s*d/2],[w/2,y+.23,s*d/2]],.045);
  curve(parent,brass,[[0,y+.85,-d*.37],[0,y+.91,0],[0,y+.85,d*.37]],.065);
}
function shrine(parent,x,z,scale=1){
  const g=group(parent,x,groundHeight(x,z),z);g.scale.setScalar(scale);
  softBox(g,stoneSurface('#8b9395'),0,.3,0,7,.6,5.4,.1);
  for(let k=0;k<4;k++)softBox(g,stoneSurface('#a9aaa0'),0,.12+k*.13,3.1-k*.30,3.7,.25,.8,.06);
  for(const xx of [-2.5,2.5])for(const zz of [-1.6,1.6])tube(g,vermilion,.14,.17,3.7,xx,2.05,zz);
  softBox(g,wood,0,1.7,-1.65,5.3,2.6,.15,.02);
  for(let i=0;i<12;i++)softBox(g,brass,-2.35+i*.43,1.7,-1.55,.035,2.2,.045,.005);
  roof(g,7.8,6.1,3.7);
  curve(g,ivory,[[-2,3.3,1.9],[0,2.9,2.03],[2,3.3,1.9]],.065);
  for(const xx of [-1.15,0,1.15]){const paper=softBox(g,ivory,xx,2.9,2.05,.17,.48,.02,.01);paper.rotation.z=.25;}
  for(const xx of [-3.1,3.1])stoneLantern(g,xx,0,2.2);
  return g;
}
function stoneLantern(parent,x,y,z){
  const stone=stoneSurface('#8b9897'),g=group(parent,x,y,z);
  softBox(g,stone,0,.09,0,.6,.18,.6,.04);tube(g,stone,.13,.19,.80,0,.55,0);
  softBox(g,stone,0,1.0,0,.50,.14,.50,.04);
  softBox(g,surface('#ffd69b',{emissive:'#ffc479',emissiveIntensity:1.3}),0,1.27,0,.32,.38,.32,.025);
  for(const s of [-1,1])for(const t of [-1,1])tube(g,stone,.035,.035,.43,s*.19,1.27,t*.19);
  const cap=part(g,new THREE.ConeGeometry(.49,.28,4),stone,0,1.57,0);cap.rotation.y=Math.PI/4;orb(g,stone,0,1.78,0,.09);
  g.updateWorldMatrix(true,false);const w=g.localToWorld(new THREE.Vector3(0,1.27,0));registerLantern({x:w.x,y:w.y,z:w.z,kind:'stone'}); // REMASTER-HOOK r02
}
function torii(parent,x,z,w=6.8){
  const y=groundHeight(x,z),g=group(parent,x,y,z);
  for(const s of [-1,1]){tube(g,vermilion,.14,.21,4.4,s*w*.43,2.2,0);tube(g,roofMat,.22,.23,.48,s*w*.43,.25,0);}
  softBox(g,vermilion,0,3.35,0,w*.97,.18,.27,.02);softBox(g,vermilion,0,4.14,0,w*1.1,.24,.39,.04);
  curve(g,roofMat,[[-w*.61,4.40,0],[-w*.40,4.29,0],[0,4.22,0],[w*.40,4.29,0],[w*.61,4.40,0]],.11);
  softBox(g,brass,0,3.73,.18,.46,.62,.10,.03);
  return g;
}
function batchStatic(root){
  root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),buckets=new Map();
  root.traverse(n=>{if(n.isMesh&&!n.isInstancedMesh&&!n.material.transparent){const k=n.material;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(n);}});
  for(const [mat,nodes]of buckets){if(nodes.length<2)continue;const geos=nodes.map(n=>{const g=n.geometry.clone().applyMatrix4(inverse.clone().multiply(n.matrixWorld));return g.index?g.toNonIndexed():g;});const merged=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());if(!merged)continue;nodes.forEach(n=>n.removeFromParent());part(root,merged,mat);}
}
export function buildFestivalScenery(scene){
  const root=group(scene);root.name='mountain-festival-v02';
  const occluders=[],wisteriaMaterials=[];
  function fadingStructure(g){g.traverse(n=>{if(n.isMesh){n.material=n.material.clone();n.material.transparent=true;}});occluders.push({group:g,opacity:1,box:new THREE.Box3()});return g;}
  // Continuous terrain surrounds the playable space, including behind the camera.
  const terrain=new THREE.PlaneGeometry(320,320,96,96);terrain.rotateX(-Math.PI/2);const p=terrain.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),away=Math.max(0,Math.abs(x)-23,Math.abs(z+7)-39);let y=groundHeight(x,z)-.15;if(away>0)y+=Math.sin(x*.08)*Math.cos(z*.07)*Math.min(8,away*.16);if(x>29)y-=Math.min(8,(x-29)*.50);p.setY(i,y);}terrain.computeVertexNormals();part(root,terrain,surface('#344e48',{roughness:1})).castShadow=false;
  // Actual mountain silhouettes, not a cylindrical photograph.
  for(let layer=0;layer<3;layer++){
    const verts=[],faces=[],count=160,radius=98+layer*23;
    for(let i=0;i<=count;i++){const a=i/count*Math.PI*2,r=radius+sin(a*7+layer)*5,h=10+layer*4+Math.pow(Math.max(0,sin(a*9+layer*.7)),2)*15+sin(a*17+layer)*3;verts.push(cos(a)*r,-8,sin(a)*r-7,cos(a)*r,h,sin(a)*r-7);if(i<count){const n=i*2;faces.push(n,n+1,n+2,n+2,n+1,n+3);}}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(faces);geo.computeVertexNormals();const m=surface(['#263d4d','#2a3f53','#30445c'][layer],{roughness:1,side:THREE.DoubleSide});part(root,geo,m).castShadow=false;
  }
  // REMASTER-HOOK r02: sky dome, stars and moon now come from public/render/sky.mjs (R02 owns the sky).
  const sky={material:{uniforms:{time:{value:0}}}};
  // The valley lake catches streaks of moonlight and the warm village lights.
  const lakeMaterial=new THREE.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float time;varying vec2 v;void main(){float r=pow(max(0.,sin(v.y*330.+sin(v.x*51.+time*.45)*2.+time*.3)),18.);float path=exp(-pow((v.x-.45)*5.,2.));vec3 c=vec3(.025,.09,.14)+r*path*vec3(.16,.23,.28);float gold=exp(-pow((v.x-.72)*13.,2.));c+=r*gold*vec3(.35,.19,.045);gl_FragColor=vec4(c,1.);}'});
  const lake=part(root,new THREE.PlaneGeometry(65,155),lakeMaterial,63,-3.4,-12);lake.rotation.x=-Math.PI/2;lake.castShadow=false;
  for(let i=0;i<28;i++){
    const x=43+rand(i*6)*35,z=-57+rand(i*8)*95,y=-2.9+rand(i*7)*1.2,g=group(root,x,y,z);g.scale.setScalar(.7+rand(i)*.6);
    softBox(g,wood,0,.8,0,2.3,1.6,1.9,.05);roof(g,3.1,2.6,1.55);
    for(const xx of [-.65,.65])softBox(g,surface('#f4c57c',{emissive:'#ffbf66',emissiveIntensity:.8}),xx,.93,1,.48,.56,.02,.01);
  }
  shrine(root,0,-40,1.15);
  fadingStructure(torii(root,0,11.5,7.3));fadingStructure(torii(root,0,-22,6.2));
  // Stone lantern avenue and flowering wisteria pergolas.
  for(const z of [16,11,5,-2,-9,-16,-24])for(const s of [-1,1])stoneLantern(root,s*4,groundHeight(s*4,z),z);
  const flowers=[];
  for(const z of [14,-7]){
    const y=groundHeight(0,z),g=group(root,0,y,z);
    for(const x of [-3.7,3.7])for(const zz of [-1.0,1.0])tube(g,wood,.09,.12,4.8,x,2.4,zz);
    for(let k=0;k<8;k++)softBox(g,wood,-4+k*1.15,4.75,0,.12,.14,2.7,.02);
    for(const zz of [-1.1,1.1])softBox(g,wood,0,4.6,zz,8.3,.22,.18,.03);
    fadingStructure(g);
    for(let k=0;k<78;k++){
      const x=rand(k*3+z)*7.7-3.85,zz=rand(k*3+1+z)*2.1-1.05,len=.4+rand(k*3+2)*1.1;
      for(let j=0;j<6;j++)flowers.push({x,y:y+4.62-j/6*len,z:z+zz,s:.075*(1-j*.11),c:k%3});
    }
  }
  const petalGeometry=new THREE.SphereGeometry(1,6,5),petalColors=['#c899e1','#e4b6ee','#a47fc4'];
  for(let color=0;color<3;color++){
    const entries=flowers.filter(f=>f.c===color),inst=new THREE.InstancedMesh(petalGeometry,surface(petalColors[color],{roughness:.83}),entries.length),dummy=new THREE.Object3D();
    entries.forEach((f,i)=>{dummy.position.set(f.x,f.y,f.z);dummy.scale.set(f.s*.8,f.s*1.7,f.s*.8);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);});inst.castShadow=true;root.add(inst);
    inst.material.transparent=true;wisteriaMaterials.push(inst.material);
  }
  // Cherry trees at the edges, with dense rounded flowering crowns.
  const blossomTransforms=[];
  for(const [tx,tz]of [[-17,14],[17,11],[-17,-5],[17,-24],[-16,-28]]){
    const ty=groundHeight(tx,tz);curve(root,wood,[[tx,ty,tz],[tx+.15,ty+2,tz],[tx-.3,ty+3.8,tz+.1]],.20);
    for(let branch=0;branch<5;branch++){
      const a=branch*2.4,end=new THREE.Vector3(tx+sin(a)*1.4,ty+3.6+cos(a)*.3,tz+cos(a)*1.4);
      curve(root,wood,[[tx,ty+2,tz],[tx+sin(a)*.6,ty+3,tz+cos(a)*.6],end.toArray()],.085);
      for(let k=0;k<18;k++)blossomTransforms.push({x:end.x+(rand(k*3+branch)*2-1)*.9,y:end.y+(rand(k*3+2)*2-1)*.6,z:end.z+(rand(k*3+1+branch)*2-1)*.9,s:.31+rand(k+branch)*.27});
    }
  }
  const blossom=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),surface('#e7aac2',{roughness:.9}),blossomTransforms.length),dummy=new THREE.Object3D();
  blossomTransforms.forEach((b,i)=>{dummy.position.set(b.x,b.y,b.z);dummy.scale.setScalar(b.s);dummy.rotation.set(rand(i),rand(i+2),rand(i+4));dummy.updateMatrix();blossom.setMatrixAt(i,dummy.matrix);});blossom.castShadow=true;root.add(blossom);
  const falling=new Float32Array(105*3),fallGeo=new THREE.BufferGeometry();fallGeo.setAttribute('position',new THREE.BufferAttribute(falling,3));const petals=new THREE.Points(fallGeo,new THREE.PointsMaterial({color:'#f2c9d9',size:.065,transparent:true,opacity:.75,depthWrite:false}));scene.add(petals);
  batchStatic(root);
  const ray=new THREE.Ray(),hit=new THREE.Vector3(),origin=new THREE.Vector3(),direction=new THREE.Vector3();
  return {update(time,camera,subject,focus){
    lakeMaterial.uniforms.time.value=time;sky.material.uniforms.time.value=time;
    let floralOpacity=1;
    if(camera&&subject){const subjects=[new THREE.Vector3(subject.x,subject.y+1.65,subject.z)];if(focus)subjects.push(focus);
      for(const o of occluders){o.box.setFromObject(o.group);const intersects=o.box.containsPoint(camera.position)||subjects.some(point=>{origin.copy(point);direction.copy(camera.position).sub(origin);const length=direction.length();ray.set(origin,direction.normalize());return ray.intersectBox(o.box,hit)&&hit.distanceTo(origin)<length;});o.opacity=THREE.MathUtils.lerp(o.opacity,intersects?.13:1,.15);o.group.traverse(n=>{if(n.isMesh){n.material.opacity=o.opacity;n.material.depthWrite=o.opacity>.95;}});floralOpacity=Math.min(floralOpacity,o.opacity);}
      for(const z of [14,-7])if(Math.abs(camera.position.z-z)<2.5&&Math.abs(camera.position.x)<5&&camera.position.y<groundHeight(0,z)+6)floralOpacity=.12;
    }
    wisteriaMaterials.forEach(m=>{m.opacity=THREE.MathUtils.lerp(m.opacity,floralOpacity,.15);m.depthWrite=m.opacity>.95;});
    for(let i=0;i<105;i++){falling[i*3]=(rand(i*3)*36-18)+sin(time*.25+i)*.8;falling[i*3+1]=groundHeight(falling[i*3],falling[i*3+2])+((7-time*.21+rand(i+1)*7)%7+7)%7;falling[i*3+2]=rand(i*3+2)*55-34;}fallGeo.attributes.position.needsUpdate=true;
  }};
}
