// R10 fireworks: rocket with a spark trail -> shell burst (peony / ring / heart / willow) with
// twinkling crackle, all in the shared additive glow pool (no per-shell draw calls or geometry).
// onBurst(burst) still reports every burst so the event bus emits 'firework' (sound, sky flash).
import {GLOW} from './particles.mjs';

export const FIREWORK_INTERVAL=2.8;
const PALETTES=[['#ffc67b','#fff1d6'],['#dd9bff','#ff9fc8'],['#79e2d9','#e4fbff'],['#ff87a6','#ffd79a'],['#ffd79a','#ff8a3d']];
const SHAPES=['peony','peony','ring','heart','willow'];
const TAU=Math.PI*2,R=Math.random;

export function createFireworks(glow,{onBurst,budget=()=>1}={}){
  const rockets=[];let next=1,count=0;
  function launch(time,{x,shape,palette}={}){
    const sx=x??Math.sin(time*2+count)*19,apex=12.5+Math.sin(time+count)*1.7+R()*1.5;count++;
    rockets.push({x:sx,y:-2,z:-44,vy:16+R()*3,apex,age:0,shape:shape??SHAPES[count%SHAPES.length],palette:palette??PALETTES[count%PALETTES.length]});
  }
  function burst(r){
    const n=Math.round(110*budget()),[a,b]=r.palette;
    for(let i=0;i<n;i++){
      let dx,dy,dz,s=10.5;
      if(r.shape==='ring'){const t=i/n*TAU;dx=Math.cos(t);dy=Math.sin(t)*.35;dz=Math.sin(t);s=12;}
      else if(r.shape==='heart'){const t=i/n*TAU,hx=16*Math.pow(Math.sin(t),3),hy=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);dx=hx/16;dy=hy/16;dz=(R()-.5)*.15;s=10;}
      else{const y=1-2*(i+.5)/n,rr=Math.sqrt(1-y*y),t=i*2.39996;dx=Math.cos(t)*rr;dy=y;dz=Math.sin(t)*rr;}
      const willow=r.shape==='willow';
      glow.emit({x:r.x,y:r.y,z:r.z,vx:dx*s,vy:dy*s,vz:dz*s,drag:willow?.7:1,gravity:willow?2.4:1.4,life:(willow?2.8:2.1)*(.85+R()*.3),size:willow?.6:.75,sizeEnd:.08,
        color:i%3?a:b,intensity:3.2,alpha:1,alphaEnd:0,frame:i%5?GLOW.dot:GLOW.sparkle,fadeIn:0});
    }
    for(let i=0,m=Math.round(24*budget());i<m;i++){const t=R()*TAU,e=R()*TAU;   // late crackle
      glow.emit({x:r.x+Math.cos(t)*Math.sin(e)*8,y:r.y+Math.cos(e)*6-2,z:r.z+Math.sin(t)*Math.sin(e)*8,life:.35,size:.7,sizeEnd:.05,color:'#fff6e0',intensity:3.5,alpha:1,alphaEnd:0,frame:GLOW.sparkle,delay:1+R()*.8,fadeIn:0});}
    glow.emit({x:r.x,y:r.y,z:r.z,life:.45,size:5,sizeEnd:16,color:a,intensity:1.1,alpha:.7,alphaEnd:0,frame:GLOW.dot,fadeIn:0});
    onBurst?.({position:{x:r.x,y:r.y,z:r.z},color:a,shape:r.shape});
  }
  return {
    rockets,
    /** Launch n shells at once (round start, victory). */
    salvo(n=3,time=0){for(let i=0;i<n;i++)launch(time,{x:(i-(n-1)/2)*7+(R()-.5)*3});},
    update(elapsed,dt){
      if(elapsed>next){launch(elapsed);next=elapsed+FIREWORK_INTERVAL;}
      for(let i=rockets.length-1;i>=0;i--){const r=rockets[i];r.age+=dt;r.y+=r.vy*dt;r.vy-=4*dt;
        if(R()<dt*60*budget())glow.emit({x:r.x+(R()-.5)*.1,y:r.y,z:r.z,vy:-1,life:.6,size:.4,sizeEnd:.04,color:'#ffd79a',intensity:2.5,alpha:1,alphaEnd:0,frame:GLOW.dot,fadeIn:0});
        if(r.y>=r.apex||r.vy<2){burst(r);rockets.splice(i,1);}}
    },
    clear(){rockets.length=0;}
  };
}
