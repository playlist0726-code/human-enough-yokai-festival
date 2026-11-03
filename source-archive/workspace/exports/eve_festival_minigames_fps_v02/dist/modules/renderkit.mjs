import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {microSurface} from './art-materials.mjs';

const cache=new Map(),textures=new Map();
export function surface(color,extra={}){
  const key=color+JSON.stringify(extra);
  if(!cache.has(key))cache.set(key,new (extra.clearcoat?THREE.MeshPhysicalMaterial:THREE.MeshStandardMaterial)({color,roughness:.64,...extra}));
  return cache.get(key);
}
// Hand-drawn repeat patterns, generated once. No external texture requests.
export function fabric(color,pattern='flowers',ink='#fff0cd'){
  const key=[color,pattern,ink].join(':');if(cache.has(key))return cache.get(key);
  let texture;
  if(typeof document!=='undefined'){
    const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
    x.fillStyle=color;x.fillRect(0,0,256,256);x.fillStyle=ink;x.strokeStyle=ink;x.lineWidth=3;
    if(pattern==='check'){for(let i=0;i<8;i++)for(let j=0;j<8;j++)if((i+j)%2===0)x.fillRect(i*32,j*32,32,32);}
    else if(pattern==='waves')for(let j=-1;j<6;j++)for(let i=-1;i<6;i++)for(let r=8;r<=28;r+=8){x.beginPath();x.arc(i*64+(j%2)*32,j*48,r,Math.PI,Math.PI*2);x.stroke();}
    else for(let i=0;i<4;i++)for(let j=0;j<4;j++){
      const px=i*64+24+(j%2)*20,py=j*64+25;
      if(pattern==='moon'){x.beginPath();x.arc(px,py,12,0,7);x.fill();x.fillStyle=color;x.beginPath();x.arc(px+6,py-5,11,0,7);x.fill();x.fillStyle=ink;}
      else if(pattern==='stars'){x.beginPath();for(let k=0;k<10;k++){const a=k*Math.PI/5-Math.PI/2,r=k%2?5:13;x.lineTo(px+Math.cos(a)*r,py+Math.sin(a)*r);}x.closePath();x.fill();}
      else {for(let k=0;k<5;k++){const a=k/5*Math.PI*2;x.beginPath();x.ellipse(px+Math.cos(a)*8,py+Math.sin(a)*8,6,5,a,0,7);x.fill();}x.fillStyle=color;x.beginPath();x.arc(px,py,4,0,7);x.fill();x.fillStyle=ink;}
      x.beginPath();x.arc(px+25,py+24,2,0,7);x.fill();
    }
    x.globalAlpha=.05;x.fillStyle='#ffffff';for(let i=0;i<256;i+=3)x.fillRect(0,i,256,1);
    texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;textures.set(key,texture);
  }
  const m=new THREE.MeshPhysicalMaterial({color:texture?'#ffffff':color,map:texture||null,roughness:.86,sheen:.35,sheenColor:ink,bumpMap:microSurface('cloth'),bumpScale:.014});cache.set(key,m);return m;
}
const ball=new THREE.SphereGeometry(1,24,16),block=new THREE.BoxGeometry(1,1,1);
export function part(parent,geometry,material,x=0,y=0,z=0,sx=1,sy=1,sz=1){
  const m=new THREE.Mesh(geometry,typeof material==='string'?surface(material):material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
export const orb=(g,m,x,y,z,sx,sy=sx,sz=sx)=>part(g,ball,m,x,y,z,sx,sy,sz);
export const cube=(g,m,x,y,z,w,h,d)=>part(g,block,m,x,y,z,w,h,d);
const softBoxes=new Map();
export function softBox(g,m,x,y,z,w,h,d,r=.07){
  const radius=Math.min(r,w/3,h/3,d/3),key=[w,h,d,radius].join(':');
  if(!softBoxes.has(key))softBoxes.set(key,new RoundedBoxGeometry(w,h,d,2,radius));
  return part(g,softBoxes.get(key),m,x,y,z);
}
export const tube=(g,m,r1,r2,h,x,y,z)=>part(g,new THREE.CylinderGeometry(r1,r2,h,24),m,x,y,z);
export function group(g,x=0,y=0,z=0){const n=new THREE.Group();n.position.set(x,y,z);g.add(n);return n;}
export function curve(g,m,points,r=.02){return part(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,r,8,false),m);}
export function ring(g,m,r,t,x=0,y=0,z=0){return part(g,new THREE.TorusGeometry(r,t,8,48),m,x,y,z);}
// Merge only rigid siblings; the arm, leg, head and tail groups stay animated.
export function batchRigidParts(root){
  const groups=[];root.traverse(n=>{if(n.isGroup)groups.push(n);});
  for(const g of groups){
    const buckets=new Map();for(const n of g.children){if(!n.isMesh||n.material.transparent)continue;if(!buckets.has(n.material))buckets.set(n.material,[]);buckets.get(n.material).push(n);}
    for(const [mat,nodes]of buckets){if(nodes.length<2)continue;const geometries=nodes.map(n=>{n.updateMatrix();const geo=n.geometry.clone().applyMatrix4(n.matrix);return geo.index?geo.toNonIndexed():geo;});const geo=mergeGeometries(geometries);geometries.forEach(n=>n.dispose());if(!geo)continue;nodes.forEach(n=>g.remove(n));part(g,geo,mat);}
  }
}

const glass=new THREE.MeshPhysicalMaterial({color:'#c8eeff',transparent:true,opacity:.32,roughness:.08,metalness:.12,clearcoat:1,clearcoatRoughness:.08,side:THREE.FrontSide,depthWrite:false});
const gold=surface('#dbaa58',{metalness:.65,roughness:.3});
export const POTION_COLORS={mizu:'#00bffd',pon:'#ffac23',kon:'#b961ff',sumi:'#26c6ff',nemu:'#ffe3a7',akari:'#ff8f20',kasa:'#75ef83'};
export function createPotion(color='#31d6fa',size=1){
  const g=new THREE.Group();g.name='enchanted-glass-potion';g.scale.setScalar(size);
  const liquid=surface(color,{roughness:.15,metalness:.12,emissive:color,emissiveIntensity:.7});
  orb(g,liquid,0,0,0,.27,.27,.27);
  const shell=orb(g,glass,0,.03,0,.31,.34,.31);shell.castShadow=false;
  tube(g,glass,.1,.12,.24,0,.35,0);tube(g,surface('#b78142'),.095,.11,.16,0,.5,0);
  const rim=ring(g,gold,.114,.028,0,.38,0);rim.rotation.x=Math.PI/2;
  const cord=ring(g,surface('#e88336'),.12,.025,0,.3,0);cord.rotation.x=Math.PI/2;
  curve(g,'#e88336',[[.11,.3,0],[.2,.25,0],[.19,-.12,0]],.022);
  for(let i=0;i<3;i++)orb(g,gold,.19,-.05-i*.045,0,.038);
  const shine=surface('#eaffff',{emissive:'#c6ffff',emissiveIntensity:.8});
  curve(g,shine,[[-.17,-.16,.21],[-.23,-.03,.2],[-.17,.16,.21]],.019);
  orb(g,shine,.12,.09,.255,.042,.062,.015);
  const bubbles=group(g);for(let i=0;i<4;i++)orb(bubbles,shine,Math.sin(i*4)*.15,-.15+i*.085,Math.cos(i*4)*.13,.023+i*.004);
  g.userData.bubbles=bubbles;g.userData.color=color;batchRigidParts(g);return g;
}
