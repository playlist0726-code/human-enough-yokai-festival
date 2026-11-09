// Scene nodes for players and festival guests: creation, reuse between rounds and per-frame animation.
import * as THREE from 'three';
import {groundHeight,distance} from '../../shared/world.mjs';
import {disguiseState} from '../../shared/disguise.mjs';
import {createVisitor,animateVisitor} from '../visitors.mjs';
import {planeText,contactShadow,shadedMesh} from '../render/labels.mjs';

/**
 * @param {object} o
 * @param {THREE.Scene} o.scene
 * @param {() => string} o.getMyId
 * @param {ReturnType<import('./rig-v2.mjs').createRigFactory>} o.rigs
 */
export function createActors({scene,getMyId,rigs}){
  const players=new Map(),humans=new Map(),playerCache=new Map(),humanCache=new Map();
  function nameLabel(p){const mine=p.id===getMyId(),label=planeText(p.name,mine?'#604438':'#59697a',mine?'#fff0cc':'#e5e9e5',192);label.scale.set(1.2,.32,1);label.position.y=3.45;return label;}
  function makePlayer(p){
    const reused=playerCache.get(p.character);
    if(reused){
      playerCache.delete(p.character);reused.p=p;reused.group.position.set(p.x,groundHeight(p.x,p.z),p.z);reused.rig.root.position.y=0;reused.aura.visible=false;
      reused.group.remove(reused.label);reused.label.material.map.dispose();reused.label.material.dispose();
      reused.label=nameLabel(p);reused.group.add(reused.label);
      scene.add(reused.group);players.set(p.id,reused);return reused;
    }
    const g=new THREE.Group();g.position.set(p.x,groundHeight(p.x,p.z),p.z);scene.add(g);contactShadow(g);
    const rig=rigs.create(p.character);g.add(rig.root);
    const label=nameLabel(p);g.add(label);
    const aura=shadedMesh(new THREE.RingGeometry(.7,.8,48),new THREE.MeshBasicMaterial({color:'#b8a7f7',transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}),0,.08,0,g);aura.rotation.x=-Math.PI/2;aura.visible=false;
    const n={group:g,rig,label,aura,p};players.set(p.id,n);
    // v2 characters swap in once their GLBs are ready; on any failure the legacy rig stays.
    rigs.upgrade(p.character).then(v2=>{if(!v2||n.rig!==rig)return;v2.root.rotation.y=rig.root.rotation.y;g.remove(rig.root);g.add(v2.root);n.rig=v2;});
    return n;
  }
  function makeHuman(h,i){
    const reused=humanCache.get(h.id);
    if(reused){humanCache.delete(h.id);reused.h=h;reused.heart.visible=false;reused.rig.lastX=reused.rig.lastZ=null;reused.group.position.set(h.x,groundHeight(h.x,h.z),h.z);scene.add(reused.group);humans.set(h.id,reused);return reused;}
    const g=new THREE.Group();g.position.set(h.x,groundHeight(h.x,h.z),h.z);scene.add(g);contactShadow(g);
    const rig=createVisitor(i);g.add(rig.root);
    const label=planeText(h.name,'#705345','#fbebca',128);label.scale.set(.9,.28,1);label.position.y=2.72;g.add(label);
    const heart=planeText('♡','#fff1df','#9e77bd',80);heart.scale.set(.5,.5,1);heart.position.y=3.15;heart.visible=false;g.add(heart);
    const node={group:g,rig,label,heart,h};humans.set(h.id,node);return node;
  }
  return {
    players,humans,playerCache,humanCache,
    /** Create, update and retire nodes to match a server snapshot. */
    sync(state){
      for(const member of Object.values(state.players)){const n=players.get(member.id)||makePlayer(member);n.p=member;}
      for(const [id,n]of players)if(!state.players[id]){scene.remove(n.group);playerCache.set(n.p.character,n);players.delete(id);}
      state.humans.forEach((h,i)=>{const n=humans.get(h.id)||makeHuman(h,i);n.h=h;});
    },
    /** Jump everyone to their server position (round start). */
    snap(){for(const n of players.values())n.group.position.set(n.p.x,groundHeight(n.p.x,n.p.z),n.p.z);for(const n of humans.values())n.group.position.set(n.h.x,groundHeight(n.h.x,n.h.z),n.h.z);},
    /** Leave the room: keep nodes cached for the next round. */
    stash(){for(const n of players.values()){scene.remove(n.group);playerCache.set(n.p.character,n);}for(const [id,n] of humans){scene.remove(n.group);humanCache.set(id,n);}players.clear();humans.clear();},
    /**
     * Per-frame animation. f = {state, dt, elapsed, disguising, introProgress, alpha, actorRange, onLocalPlayer(node,p)}.
     */
    update({state,dt,elapsed,disguising,introProgress,alpha,actorRange,onLocalPlayer}){
      const myId=getMyId();
      for(const n of players.values()){
        const p=n.p;n.label.visible=!disguising&&p.id!==myId;n.label.position.y=3.45+(p.height||0)*.5;
        if(!disguising)n.group.position.lerp(new THREE.Vector3(p.x,groundHeight(p.x,p.z),p.z),alpha);
        rigs.animate(n.rig,p,dt,elapsed,state?.tick||0,disguising?{x:0,z:0}:n.group.position,{form:disguising?'transform':'human',progress:introProgress,phase:state?.phase});
        if(p.id===myId)onLocalPlayer?.(n,p);
        n.aura.visible=!disguising&&(p.cover>0||p.action==='charm'||disguiseState(p,state?.tick||0).concealed);n.aura.material.color.set(p.cover>0?'#9bd6d7':'#c4a4ed');n.aura.scale.setScalar(p.cover>0?2.4:1.4+Math.sin(elapsed*8)*.2);
      }
      for(const n of humans.values()){
        const h=n.h,me=state?.players?.[myId];n.label.visible=!!me&&Math.hypot(h.x-me.x,h.z-me.z)<4;n.group.visible=h.state!=='delivered'&&(!me||distance(me,h)<actorRange);n.group.position.lerp(new THREE.Vector3(h.x,groundHeight(h.x,h.z),h.z),alpha);if(n.group.visible)animateVisitor(n.rig,h,dt,elapsed,n.group.position);n.heart.visible=!!h.owner||h.state==='waiting'&&me&&distance(me,h)<7;n.heart.position.y=2.75+Math.sin(elapsed*3)*.06;
        const text=h.owner?`${Math.ceil(h.charm)}s`:'F';if(n.heart.userData.text!==text){const c=n.heart.material.map.image,ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle=h.owner?'#9e77bd':'#c39250';ctx.beginPath();ctx.roundRect(3,3,c.width-6,c.height-6,16);ctx.fill();ctx.fillStyle='#fff5dd';ctx.font='bold 38px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,c.width/2,c.height/2);n.heart.material.map.needsUpdate=true;n.heart.userData.text=text;}
      }
    },
    /** Lightweight per-actor summary for automated checks (canvas.dataset.visuals). */
    probe(){
      return {
        avatars:[...players.values()].map(n=>({id:n.p.id,character:n.p.character,volumetric:n.rig.root.userData.volumetric,height:n.rig.root.position.y,yaw:n.rig.root.rotation.y,legAngles:n.rig.legs.map(l=>l.rotation.x),armAngles:n.rig.arms.map(a=>a.rotation.x),waist:n.rig.waist.rotation.toArray().slice(0,3),speed:n.rig.speed,phase:n.rig.gaitPhase,motionVersion:n.rig.root.userData.motionVersion,appearance:n.rig.root.userData.appearance,revealed:n.rig.root.userData.revealed,action:n.p.action,rig:n.rig.kind||'legacy',clip:n.rig.clip?.base})),
        humans:[...humans.values()].map(n=>({id:n.h.id,human:n.rig.root.userData.human}))
      };
    }
  };
}
