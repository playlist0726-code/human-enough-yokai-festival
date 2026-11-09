// REMASTER-HOOK r01: legacy action effects moved out of game.js unchanged. R10 owns public/fx/* and may replace this.
// Rings, sparks, a point light and a floating label for server action events (charm, drink, cover, pickup...).
import * as THREE from 'three';
import {groundHeight} from '../../shared/world.mjs';
import {POTION_COLORS} from '../renderkit.mjs';
import {planeText} from '../render/labels.mjs';

export function createActionEffects(scene){
  const list=[];
  const sparkGeometry=new THREE.OctahedronGeometry(.065),waveGeometry=new THREE.TorusGeometry(1,.025,8,48);
  function dispose(f){scene.remove(f.group);f.glow.dispose();f.label.material.map.dispose();f.label.material.dispose();}
  return {
    list,
    /** Spawn the effect for a server event that has an `fx` field. */
    spawn(event,state){
      const actor=state.players[event.actor];if(!actor)return;
      const color=['charm','drink'].includes(event.fx)?POTION_COLORS[actor.character]:event.fx==='cover'?'#9ee1e3':'#f5d599';
      const group=new THREE.Group();group.name=`effect-${event.fx}`;scene.add(group);
      const glow=new THREE.MeshBasicMaterial({color,transparent:true,opacity:1,depthWrite:false});
      const rings=[];for(let i=0;i<3;i++){const r=new THREE.Mesh(waveGeometry,glow);r.rotation.x=-Math.PI/2;rings.push(r);group.add(r);}
      const sparks=[];for(let i=0;i<28;i++){const spark=new THREE.Mesh(sparkGeometry,glow);group.add(spark);sparks.push(spark);}
      const light=new THREE.PointLight(color,5,4,2);group.add(light);
      let target=state.humans.find(h=>h.id===event.target),origin=event.at||actor;
      const label=planeText(event.fx==='drink'?'+ Spirit':event.fx==='charm'?'✦ Charmed ✦':event.fx==='pickup'?'+ Potion':event.fx==='reward'?'✦ Prize won':event.fx==='ping'?'Help needed!':event.fx==='reveal'?'Disguise slipping!':'Hide teammates','#ffffff',event.fx==='charm'?'#9978b7':'#89a084',192);label.scale.set(1.6,.5,1);group.add(label);label.visible=!['jump','land'].includes(event.fx);
      list.push({group,glow,rings,sparks,light,label,kind:event.fx,actor:event.actor,target:event.target,origin:{x:origin.x,z:origin.z},destination:target?{x:target.x,z:target.z}:null,age:0,duration:event.fx==='ping'?3:event.fx==='cover'?2.2:['jump','land'].includes(event.fx)?.5:1.8});
    },
    clear(){for(const f of list)dispose(f);list.length=0;},
    update(dt,state){
      for(let j=list.length-1;j>=0;j--){
        const f=list[j];f.age+=dt;const t=f.age/f.duration,p=state?.players[f.actor];
        const h=state?.humans.find(h=>h.id===f.target),origin=p&&!['pickup','ping'].includes(f.kind)?p:f.origin,destination=h||f.destination||origin;
        const travel=f.kind==='charm'?Math.min(1,f.age/.7):0;
        const center={x:THREE.MathUtils.lerp(origin.x,destination.x,travel),z:THREE.MathUtils.lerp(origin.z,destination.z,travel)};
        f.group.position.set(center.x,groundHeight(center.x,center.z),center.z);
        f.glow.opacity=Math.min(1,(1-t)*2.4);f.light.position.y=1.4;f.light.intensity=(1-t)*4;
        for(let i=0;i<f.rings.length;i++){const radius=(f.kind==='cover'?1.25:.35)+((t+i/3)%1)*1.15;f.rings[i].scale.setScalar(radius);f.rings[i].position.y=f.kind==='charm'?.6+i*.48:.09+i*.07;}
        for(let i=0;i<f.sparks.length;i++){
          const a=i*2.39996+f.age*3.8,radius=f.kind==='charm'?.32+Math.sin(i)*.14:.45+(i%4)*.17;
          const y=['jump','land'].includes(f.kind)?.06+t*.35+(i%3)*.05:f.kind==='pickup'?.25+f.age*1.8:(i%7)*.33+f.age*.8;
          f.sparks[i].position.set(Math.cos(a)*radius,y+Math.sin(travel*Math.PI)*1.1,Math.sin(a)*radius);f.sparks[i].rotation.set(f.age+i,f.age*2,0);f.sparks[i].scale.setScalar(1+(i%3)*.3);
        }
        f.label.position.y=3.1+f.age*.45;
        if(t>=1){dispose(f);list.splice(j,1);}
      }
    }
  };
}
