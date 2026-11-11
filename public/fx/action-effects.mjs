// Floating labels for server action events ("+ Spirit", "Charmed", "Help needed!").
// R10: the legacy rings, sparks and per-effect PointLight were removed. Particles now come from
// fx/recipes.mjs via the event bus; a point light per effect recompiled shaders and cost a light slot.
import * as THREE from 'three';
import {groundHeight} from '../../shared/world.mjs';
import {planeText} from '../render/labels.mjs';

const TEXT={drink:'+ Spirit',charm:'✦ Charmed ✦',pickup:'+ Potion',reward:'✦ Prize won',ping:'Help needed!',reveal:'Disguise slipping!',cover:'Hide teammates'};

export function createActionEffects(scene){
  const list=[];
  function dispose(f){scene.remove(f.group);f.label.material.map.dispose();f.label.material.dispose();}
  return {
    list,
    /** Spawn the label for a server event that has an `fx` field. */
    spawn(event,state){
      const actor=state.players[event.actor];if(!actor||['jump','land'].includes(event.fx)||!TEXT[event.fx])return;
      const group=new THREE.Group();group.name=`effect-${event.fx}`;scene.add(group);
      const label=planeText(TEXT[event.fx],'#ffffff',event.fx==='charm'?'#9978b7':event.fx==='ping'?'#3b8a8c':'#89a084',192);label.scale.set(1.6,.5,1);group.add(label);
      const origin=event.at||actor;
      list.push({group,label,kind:event.fx,actor:event.actor,origin:{x:origin.x,z:origin.z},age:0,duration:event.fx==='ping'?3:event.fx==='cover'?2.2:1.8});
    },
    clear(){for(const f of list)dispose(f);list.length=0;},
    update(dt,state){
      for(let j=list.length-1;j>=0;j--){
        const f=list[j];f.age+=dt;const t=f.age/f.duration,p=state?.players[f.actor],o=p&&f.kind!=='ping'?p:f.origin;
        f.group.position.set(o.x,groundHeight(o.x,o.z),o.z);
        // pop in with overshoot, drift up, fade out
        const s=f.age<.18?1.25*Math.sin(f.age/.18*Math.PI*.5)+(f.age/.18)*-.25:1;f.label.scale.set(1.6*s,.5*s,1);
        f.label.position.y=3.1+f.age*.45;f.label.material.opacity=t>.7?(1-t)/.3:1;f.label.material.transparent=true;
        if(t>=1){dispose(f);list.splice(j,1);}
      }
    }
  };
}
