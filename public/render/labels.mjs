// Small shared scene helpers: canvas text sprites, shadow-casting meshes and soft contact shadows.
import * as THREE from 'three';

export function shadedMesh(geometry,mat,x,y,z,parent){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}

/** Rounded text badge drawn on a canvas and shown as a camera-facing sprite. */
export function planeText(text,color='#594632',bg='#f5e5bf',width=256){
  const c=document.createElement('canvas');c.width=width;c.height=80;const ctx=c.getContext('2d');
  ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(3,3,width-6,74,18);ctx.fill();
  ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,width/2,40,width-24);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthWrite:false}));sprite.scale.set(2.8,.88,1);return sprite;
}

let contactShadowTexture;
/** Soft blob shadow under an actor. The radial texture is shared by every actor. */
export function contactShadow(parent){
  if(!contactShadowTexture){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,2,64,64,64);g.addColorStop(0,'#192d39a6');g.addColorStop(.4,'#192d3966');g.addColorStop(1,'#192d3900');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);contactShadowTexture=new THREE.CanvasTexture(c);}
  const m=shadedMesh(new THREE.PlaneGeometry(1.8,1.45),new THREE.MeshBasicMaterial({map:contactShadowTexture,transparent:true,opacity:.6,depthWrite:false}),0,.065,0,parent);m.rotation.x=-Math.PI/2;return m;
}
