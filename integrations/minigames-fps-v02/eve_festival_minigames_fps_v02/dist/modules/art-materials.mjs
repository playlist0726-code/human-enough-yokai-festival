import * as THREE from 'three';
const cache=new Map();
const noise=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
function texture(draw,size=256,color=false){
  if(typeof document==='undefined')return null;
  const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');draw(ctx,size);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;if(color)t.colorSpace=THREE.SRGBColorSpace;return t;
}
export function microSurface(kind='clay'){
  const key=`micro:${kind}`;if(cache.has(key))return cache.get(key);
  const t=texture((ctx,n)=>{
    const image=ctx.createImageData(n,n);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const v=kind==='cloth'?128+Math.sin(x*Math.PI)*18+Math.sin(y*Math.PI)*18+noise(x,y)*20:128+(noise(x,y)-.5)*45;
      const at=(y*n+x)*4;image.data[at]=image.data[at+1]=image.data[at+2]=v;image.data[at+3]=255;
    }ctx.putImageData(image,0,0);
    if(kind==='cloth'){ctx.strokeStyle='#888';ctx.lineWidth=1;for(let i=0;i<n;i+=4){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,n);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(n,i);ctx.stroke();}}
  });cache.set(key,t);return t;
}
export function timber(color='#946546'){
  const key=`wood:${color}`;if(cache.has(key))return cache.get(key);
  const base=new THREE.Color(color),map=texture((ctx,n)=>{
    ctx.fillStyle=color;ctx.fillRect(0,0,n,n);
    for(let i=0;i<160;i++){
      ctx.strokeStyle=i%3?'#2e160e24':'#efd0a42b';ctx.lineWidth=.5+noise(i,3)*1.5;ctx.beginPath();
      for(let y=0;y<=n;y+=4){const x=i*n/160+Math.sin(y*.026+i)*2.3+Math.sin(y*.05+i*.5)*1.1;ctx.lineTo(x,y);}ctx.stroke();
    }
    for(let i=0;i<3;i++){ctx.strokeStyle='#351a0e33';for(let k=1;k<6;k++){ctx.beginPath();ctx.ellipse(35+i*87,65+i*51,2+k*1.3,3+k*4,.1,0,7);ctx.stroke();}}
  },512,true);
  const mat=new THREE.MeshStandardMaterial({color:map?'#ffffff':base,map,roughness:.78,bumpMap:map,bumpScale:.025});cache.set(key,mat);return mat;
}
export function stoneSurface(color='#a6a696'){
  const key=`stone:${color}`;if(cache.has(key))return cache.get(key);
  const m=new THREE.MeshStandardMaterial({color,roughness:.91,bumpMap:microSurface('stone'),bumpScale:.035});cache.set(key,m);return m;
}
export function groundMaterial(){
  const map=texture((ctx,n)=>{
    ctx.fillStyle='#42695d';ctx.fillRect(0,0,n,n);
    for(let i=0;i<3500;i++){const x=noise(i,1)*n,y=noise(i,2)*n;ctx.fillStyle=['#91a07812','#334f4616','#6c927315','#b4a47c12'][i%4];ctx.fillRect(x,y,2+noise(i,3)*7,3+noise(i,4)*8);}
  },512,true);if(map)map.repeat.set(10,14);
  return new THREE.MeshStandardMaterial({color:'#b6c5ae',map,roughness:.96,bumpMap:microSurface('stone'),bumpScale:.012});
}
export async function pavingMaterial(){
  const mat=stoneSurface('#a3a391').clone();
  if(typeof document==='undefined')return mat;
  try{
    const map=await new THREE.TextureLoader().loadAsync('/assets/shrine-paving-v05.png');map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(1.15,9.5);map.anisotropy=8;mat.map=map;mat.color.set('#ffffff');mat.needsUpdate=true;
  }catch{/* The procedural material keeps the map playable if an art asset fails. */}
  return mat;
}
