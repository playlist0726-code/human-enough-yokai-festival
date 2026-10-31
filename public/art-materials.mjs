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
    ctx.fillStyle='#567b5f';ctx.fillRect(0,0,n,n);
    // Broad, quiet color patches and tiny leaf marks read as a painted meadow.
    for(let i=0;i<160;i++){
      const x=noise(i,1)*n,y=noise(i,2)*n,r=15+noise(i,3)*45;
      const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,i%2?'#c6ce8c18':'#325d5815');g.addColorStop(1,'#68976900');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    for(let i=0;i<550;i++){
      const x=noise(i,4)*n,y=noise(i,5)*n,r=1.5+noise(i,6)*2.5;ctx.fillStyle=i%3?'#b4c59436':'#386b5b28';ctx.beginPath();ctx.moveTo(x-r,y+r*.5);ctx.quadraticCurveTo(x,y-r*1.5,x+r,y+r*.5);ctx.quadraticCurveTo(x,y+r,x-r,y+r*.5);ctx.fill();
    }
  },512,true);if(map)map.repeat.set(11,16);
  return new THREE.MeshStandardMaterial({color:'#f4f1d7',map,roughness:.98,bumpMap:microSurface('clay'),bumpScale:.008});
}
export async function pavingMaterial(){
  const draw=(ctx,n,height=false)=>{
    ctx.fillStyle=height?'#303030':'#606e65';ctx.fillRect(0,0,n,n);
    const rows=8,cols=5,w=n/cols,h=n/rows;
    for(let j=-1;j<=rows;j++)for(let i=-1;i<=cols;i++){
      const x=i*w+(j%2)*w*.5+noise(i+10,j+10)*9,y=j*h+noise(i+20,j+20)*7;
      const pad=3.5,ww=w-8+noise(i+30,j+30)*5,hh=h-7+noise(i+40,j+40)*3;
      const colors=['#a6aa9b','#b6b3a0','#a4ada3','#c1bba6','#b0b1a4'];
      const g=ctx.createLinearGradient(x,y,x+ww*.4,y+hh);g.addColorStop(0,height?'#e8e8e8':'#d1ccb6');g.addColorStop(.16,height?'#c8c8c8':colors[((i+cols)*3+j+rows)%5]);g.addColorStop(.83,height?'#b8b8b8':colors[((i+cols)*3+j+rows)%5]);g.addColorStop(1,height?'#737373':'#7b887e');
      ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(x+pad,y+pad,ww,hh,[11,17,12,16]);ctx.fill();
      if(!height){ctx.strokeStyle='#e4ddbd44';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#4e795c';if((i+j)%3===0){ctx.beginPath();ctx.ellipse(x+ww*.6,y+hh+pad,7,2,.1,0,Math.PI*2);ctx.fill();}}
    }
  };
  const map=texture((ctx,n)=>draw(ctx,n),1024,true),bump=texture((ctx,n)=>draw(ctx,n,true),1024);
  for(const t of [map,bump])if(t)t.repeat.set(1,8);
  return new THREE.MeshStandardMaterial({color:'#ffffff',map,bumpMap:bump,bumpScale:.008,roughness:.92});
}
