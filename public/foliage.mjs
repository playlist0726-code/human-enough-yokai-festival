import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {groundHeight,walkable,STALLS,stallEntrance,POTION_SPOTS} from '../shared/world.mjs';

const random=(n)=>{const v=Math.sin(n*127.1+43.7)*43758.5453;return v-Math.floor(v);};
// Folded leaves have an actual silhouette, a central ridge and a shaded underside.
export function leafGeometry(rings=8,sides=8){
  const p=[],uv=[],indices=[],colors=[];
  for(let j=0;j<=rings;j++)for(let k=0;k<=sides;k++){
    const t=j/rings,a=k/sides*Math.PI*2,w=Math.max(.001,Math.pow(Math.sin(Math.PI*t),.8));
    p.push(Math.cos(a)*w*.46,t*1.45,Math.sin(a)*w*.12+Math.sin(t*Math.PI)*.11+t*t*.12);
    uv.push(k/sides,t);const shade=.76+t*.2+Math.max(0,Math.sin(a))*.04;colors.push(shade,Math.min(1,shade+.035),shade*.93);
    if(j<rings&&k<sides){const n=j*(sides+1)+k;indices.push(n,n+sides+1,n+1,n+1,n+sides+1,n+sides+2);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
  // Close the UV seam with matching normals, so grazing light stays smooth.
  const normal=g.attributes.normal;for(let j=0;j<=rings;j++){const first=j*(sides+1),last=first+sides,n=new THREE.Vector3().fromBufferAttribute(normal,first).add(new THREE.Vector3().fromBufferAttribute(normal,last)).normalize();normal.setXYZ(first,n.x,n.y,n.z);normal.setXYZ(last,n.x,n.y,n.z);}return g;
}
export function plantingPlan(){
  const trees=[];
  for(let i=0;i<13;i++)for(const side of [-1,1])trees.push({x:side*(19.5+random(i*3+side)*1.3),z:-36+i*4.8,scale:.9+random(i+7)*.25,blossom:false});
  for(const [x,z]of [[-15,-23],[14,16],[-16,4],[17,-14]])trees.push({x,z,scale:1.1,blossom:true});
  const plants=[];
  for(let i=0;i<2600;i++){
    const x=(random(i*3)-.5)*40,z=random(i*3+1)*57-36;
    if(Math.abs(x)<4.3||!walkable(x,z,.85)||STALLS.some(s=>Math.hypot(x-stallEntrance(s).x,z-stallEntrance(s).z)<2.5)||POTION_SPOTS.some(p=>Math.hypot(x-p.x,z-p.z)<.8))continue;
    plants.push({x,z,scale:.25+random(i*3+2)*.35,flower:i%5===0});
  }
  return {trees,plants};
}
function breezeMaterial(color,time){
  const mat=new THREE.MeshStandardMaterial({color,roughness:.83,vertexColors:true,side:THREE.FrontSide});
  mat.onBeforeCompile=shader=>{
    shader.uniforms.festivalWind=time;
    shader.vertexShader='uniform float festivalWind;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifdef USE_INSTANCING
      float phase=instanceMatrix[3].x*.7+instanceMatrix[3].z*.4;
      transformed.z+=sin(festivalWind*1.25+phase+position.y*1.8)*.045*position.y;
      #endif`);
  };
  mat.customProgramCacheKey=()=> 'festival-leaf-breeze-v1';return mat;
}
function instances(root,name,geometry,material,count){const m=new THREE.InstancedMesh(geometry,material,count);m.name=name;m.castShadow=true;m.receiveShadow=true;root.add(m);return m;}
export function buildFoliage(scene,kit=null){
  const root=new THREE.Group();root.name='living-festival-garden';scene.add(root);
  const plan=plantingPlan(),time={value:0},leaf=leafGeometry(),dummy=new THREE.Object3D(),color=new THREE.Color();
  const green=instances(root,'layered-broadleaf-canopies',leaf,breezeMaterial('#ffffff',time),plan.trees.length*180);
  const blossom=instances(root,'sakura-petals',new THREE.SphereGeometry(1,7,5),new THREE.MeshStandardMaterial({color:'#fff3df',roughness:.9}),4*240);
  const grass=instances(root,'curved-meadow-blades',leafGeometry(4,4),breezeMaterial('#ffffff',time),plan.plants.length*3);
  const flowers=instances(root,'five-petal-meadow-flowers',new THREE.SphereGeometry(1,6,4),new THREE.MeshStandardMaterial({color:'#fff5d9',roughness:.8}),plan.plants.length*6);
  const wood=new THREE.MeshStandardMaterial({color:'#88684e',roughness:.95}),trunks=[];
  const greens=['#7eaa66','#92b274','#6f9c65','#a2b77e','#5c8b69'];let lc=0,bc=0,gc=0,fc=0;
  function place(mesh,index,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0,tint=null){dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rz);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);if(tint)mesh.setColorAt(index,color.set(tint));}
  function branch(a,b,r1,r2){const aa=new THREE.Vector3(...a),bb=new THREE.Vector3(...b),dir=bb.clone().sub(aa);const g=new THREE.CylinderGeometry(r2,r1,dir.length(),9,3);dummy.position.copy(aa).add(bb).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());dummy.scale.set(1,1,1);dummy.updateMatrix();trunks.push(g.applyMatrix4(dummy.matrix));}
  // R04-2: with the festival kit, trees are modelled GLB instances (pine / broadleaf / cherry); the leaf-built trees stay as the no-kit path.
  if(kit)plan.trees.forEach((tree,index)=>{const y=groundHeight(tree.x,tree.z);kit.propAt(tree.blossom?'env_tree_cherry':index%3===0?'env_tree_pine':'env_tree_broadleaf',tree.x,y-.03,tree.z,{yaw:random(index+500)*Math.PI*2,scale:tree.scale*(tree.blossom?1.1:1.05)});});
  else plan.trees.forEach((tree,index)=>{
    const {x,z,scale:s,blossom:pink}=tree,y=groundHeight(x,z),height=3.4*s;
    branch([x,y,z],[x+.13,y+height,z-.1],.38*s,.16*s);
    for(let k=0;k<5;k++){const a=k*Math.PI*2/5+.3;branch([x+Math.sin(a)*.65,y+.05,z+Math.cos(a)*.65],[x,y+.8,z],.07,.18);branch([x,y+height*.6,z],[x+Math.sin(a)*1.25*s,y+height+.35,z+Math.cos(a)*1.25*s],.15,.045);}
    for(let i=0;i<180;i++){
      const seed=index*301+i,a=random(seed)*Math.PI*2,v=random(seed+8000)*2-1,rad=Math.sqrt(1-v*v),r=(.65+random(seed+3000)*.35)*2.2*s;
      const px=x+Math.cos(a)*rad*r,pz=z+Math.sin(a)*rad*r,py=y+height+.75+v*1.45*s;
      const size=(.48+random(seed+4000)*.4)*s;
      place(green,lc++,px,py,pz,size,size,size,Math.acos(v)*.65+.25,a+.5,(random(seed+6000)-.5)*1.2,pink?['#b58599','#cfa3ac','#ddbac1'][i%3]:greens[(i+index)%greens.length]);
      if(pink&&i<160){place(blossom,bc++,px,py+.18,pz,.16,.11,.17,0,a,0,['#ecc2ce','#f4d6cf','#d7a9c6'][i%3]);}
    }
  });
  const trunkGeometry=trunks.length?mergeGeometries(trunks,false):new THREE.BufferGeometry();trunks.forEach(g=>g.dispose());const treeWood=new THREE.Mesh(trunkGeometry,wood);treeWood.visible=trunks.length>0;treeWood.name='forked-trunks-and-roots';treeWood.castShadow=treeWood.receiveShadow=true;root.add(treeWood);
  for(let i=0;i<plan.plants.length;i++){
    const p=plan.plants[i],y=groundHeight(p.x,p.z),angle=random(i+8000)*Math.PI*2;
    for(let k=0;k<3;k++){const a=angle+k*2.1;place(grass,gc++,p.x,y-.01,p.z,p.scale*.4,p.scale*.58,p.scale*.4,.75,a,.16,greens[i%5]);}
    if(p.flower){const h=p.scale*.65;for(let k=0;k<5;k++){const a=k*Math.PI*2/5;place(flowers,fc++,p.x+Math.sin(a)*.065,y+h,p.z+Math.cos(a)*.065,.065,.025,.065,.1,a,0,['#ead5ff','#fff0bb','#ffc2c6'][i%3]);}place(flowers,fc++,p.x,y+h+.015,p.z,.037,.028,.037,0,0,0,'#e9ad55');}
  }
  green.count=lc;blossom.count=bc;grass.count=gc;flowers.count=fc;
  // Ground-cover shadows cost more than they contribute at this scale.
  grass.castShadow=false;flowers.castShadow=false;
  for(const m of [green,blossom,grass,flowers]){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.computeBoundingSphere();}
  return {root,stats:{trees:plan.trees.length,leaves:lc,plants:plan.plants.length},update(t){time.value=t;}};
}
