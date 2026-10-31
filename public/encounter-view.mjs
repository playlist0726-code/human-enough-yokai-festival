import * as THREE from 'three';
import {COMBAT} from '/shared/encounter.mjs';
import {distance,groundHeight} from '/shared/world.mjs';
import {orb,cube,group,curve,ring,surface,batchRigidParts,fabric,POTION_COLORS} from './renderkit.mjs';

const glow=color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,depthWrite:false,side:THREE.DoubleSide});
const sealCrystalGeometry=new THREE.OctahedronGeometry(.33),sealPaperGeometry=new THREE.PlaneGeometry(.52,.8);
const circleGeometry=new THREE.CircleGeometry(1,48),ringGeometry=new THREE.RingGeometry(.94,1,64),ballGeometry=new THREE.SphereGeometry(1,20,14);
function floorDisk(parent,material,radius){const m=new THREE.Mesh(circleGeometry,material);m.rotation.x=-Math.PI/2;m.scale.setScalar(radius);parent.add(m);return m;}
function floorRing(parent,material,radius){const m=new THREE.Mesh(ringGeometry,material);m.rotation.x=-Math.PI/2;m.scale.setScalar(radius);parent.add(m);return m;}
function paperTexture(color='#f9d88f'){
 const c=document.createElement('canvas');c.width=128;c.height=192;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,128,192);x.strokeStyle='#a34236';x.lineWidth=5;x.strokeRect(8,8,112,176);x.save();x.translate(64,80);x.rotate(Math.PI/4);x.strokeRect(-32,-32,64,64);x.strokeRect(-23,-23,46,46);x.restore();x.lineWidth=7;for(let i=0;i<3;i++){x.beginPath();x.moveTo(42,120+i*16);x.lineTo(86,120+i*16);x.stroke();}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function demon(){
 const root=new THREE.Group();root.name='demon-king';const body=group(root),head=group(body,0,3.05,0),arms=[];
 const robe=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(1.12,0),new THREE.Vector2(.83,.4),new THREE.Vector2(.70,1.3),new THREE.Vector2(1.02,2.2),new THREE.Vector2(.53,2.5)],24),fabric('#20182f','stars','#69426d'));robe.position.y=.15;body.add(robe);
 const gold=surface('#c79753',{metalness:.65,roughness:.4}),skin=surface('#64566f',{roughness:.65}),ivory=surface('#ead5a5');
 cube(body,gold,0,1.12,.72,1.28,.17,.17);orb(body,gold,0,1.16,.86,.23,.25,.10);orb(body,skin,0,2.42,0,.58,.4,.5);
 orb(head,skin,0,0,0,.79,.64,.58);orb(head,'#372d43',0,-.20,.51,.56,.30,.15);orb(head,'#b7a2bb',0,-.05,.58,.23,.14,.18);
 for(const s of [-1,1]){
  orb(head,skin,s*.70,-.06,0,.22,.30,.17);const eye=orb(head,surface('#ff714e',{emissive:'#ff331c',emissiveIntensity:2.5}),s*.29,.13,.49,.21,.14,.12);eye.rotation.z=-s*.17;
  orb(head,'#1b0d21',s*.29,.13,.60,.045,.10,.025);const brow=cube(head,'#1d1824',s*.29,.31,.49,.48,.12,.17);brow.rotation.z=-s*.32;
  curve(head,ivory,[[s*.49,.43,0],[s*.82,.67,-.07],[s*1.03,1.02,-.14],[s*.95,1.35,-.12]],.105);
  const tip=new THREE.Mesh(new THREE.ConeGeometry(.10,.36,12),ivory);tip.position.set(s*.95,1.45,-.12);head.add(tip);
  const fang=new THREE.Mesh(new THREE.ConeGeometry(.105,.40,12),ivory);fang.position.set(s*.42,-.14,.68);fang.rotation.z=Math.PI;head.add(fang);
  const arm=group(body,s*.94,2.15,0);arms.push(arm);orb(arm,skin,s*.24,-.25,.18,.28,.66,.30);orb(arm,gold,s*.35,-.57,.34,.32,.10,.31);orb(arm,skin,s*.35,-.78,.53,.30,.30,.27);
  for(let i=0;i<3;i++)curve(arm,skin,[[s*(.18+i*.12),-.84,.67],[s*(.16+i*.13),-1.02,.83],[s*(.14+i*.13),-.90,.98]],.055);
 }
 for(let i=0;i<5;i++)cube(head,ivory,(i-2)*.16,-.26,.665,.13,.13,.06);
 for(let i=0;i<7;i++){const a=(i/6-.5)*Math.PI;const spike=new THREE.Mesh(new THREE.ConeGeometry(.17,.46,8),surface('#241c2d'));spike.position.set(Math.sin(a)*.53,.48+Math.cos(a)*.18,-.04);spike.rotation.z=-a*.55;head.add(spike);}
 const crystal=group(body,0,1.78,1.10),core=new THREE.Mesh(new THREE.IcosahedronGeometry(.60,1),surface('#9f65ef',{metalness:.4,roughness:.12,emissive:'#8a37ed',emissiveIntensity:1.5}));crystal.add(core);
 const glass=new THREE.Mesh(ballGeometry,new THREE.MeshPhysicalMaterial({color:'#b9a7ff',transparent:true,opacity:.20,roughness:.03,metalness:.15,depthWrite:false}));glass.scale.setScalar(.74);crystal.add(glass);
 const orbits=[];for(let i=0;i<3;i++){const o=ring(crystal,surface('#e6b979',{emissive:'#9d6bcc',emissiveIntensity:.8}),.86,.025);o.rotation.set(i*.8,i*.7,.3);orbits.push(o);}
 const aura=new THREE.PointLight('#a26cf1',9,9,2);aura.position.set(0,2.2,1);body.add(aura);
 const footRing=floorRing(root,glow('#ad66fc'),1.8);footRing.position.y=.05;
 batchRigidParts(head);for(const arm of arms)batchRigidParts(arm);
 return {root,body,head,arms,crystal,core,orbits,footRing};
}
export function createEncounterView(scene,{hud,onAction}){
 const root=new THREE.Group();root.name='demon-king-encounter';scene.add(root);const king=demon();root.add(king.root);king.root.visible=false;
 const paperMaterial=new THREE.MeshStandardMaterial({map:paperTexture(),color:'#fff0bb',emissive:'#d8a13d',emissiveIntensity:.3,side:THREE.DoubleSide,roughness:.8});
 const sealNodes=new Map(),hazardNodes=new Map(),minionNodes=new Map(),wards=new Map(),effects=[];
 const card=document.createElement('section');card.className='encounter-card hidden';card.setAttribute('aria-label','Demon King encounter');card.innerHTML='<div class="encounter-heading"><span>THE DEMON KING</span><b class="encounter-phase"></b></div><div class="boss-meter"><i></i></div><p></p>';
 const health=document.createElement('div');health.className='combat-health';health.setAttribute('aria-label','Hearts');document.querySelector('.status>div').append(health);
 const down=document.createElement('div');down.className='down-notice hidden';down.setAttribute('role','status');hud.append(card,down);
 const task=document.createElement('div');task.className='seal-progress hidden';task.innerHTML='<span>Unbinding seal…</span><i></i>';hud.append(task);
 let current=null,myId=null,shake=0,maskTemplate=null,wardTemplate=null,announcement=null;
 function sync(state,id){
  current=state;myId=id;const e=state.encounter,p=state.players[id],live=state.phase==='playing';
  const visible=live&&e&&e.phase!=='quiet';card.classList.toggle('hidden',!visible);hud.classList.toggle('under-siege',!!visible);document.body.classList.toggle('boss-active',!!visible);hud.classList.toggle('combat-downed',live&&p.health<=0);
  health.textContent=`${'♥'.repeat(Math.max(0,p.health??4))}${'♡'.repeat(4-(p.health??4))}`;health.classList.toggle('critical',p.health<=1);health.title='Potions restore one heart. C Ward blocks shadow attacks.';
  if(visible){card.dataset.phase=e.phase;card.querySelector('b').textContent=e.phase==='omen'?'APPROACHING':e.phase==='exposed'?`EXPOSED · ${Math.ceil(Math.max(0,e.until-state.tick))}s`:e.phase==='banished'?'BANISHED':`${e.seals.filter(s=>s.broken).length}/${e.seals.length} SEALS BROKEN`;card.querySelector('.boss-meter i').style.width=`${e.hp/e.maxHp*100}%`;card.querySelector('p').textContent=e.phase==='omen'?'His curse is coming. Move together.':e.phase==='exposed'?'J / Spirit bolt! Alternate shots for a team combo.':e.phase==='banished'?'+20 seconds · Potions · Protected sprint. Escort your guests!':'E at purple seals → J at the crystal. Move, jump or C Ward to dodge.';if(announcement&&announcement.until>performance.now())card.querySelector('p').textContent=announcement.text;}
  down.classList.toggle('hidden',!live||p.health>0);down.textContent=e?.rescueAt>0?`ALL SEALED · The curse closes in ${Math.max(1,Math.ceil(e.rescueAt-state.tick))}s`:Object.keys(state.players).length===1?`SEALED · Your talisman reforms you in ${Math.max(1,Math.ceil(p.downUntil-state.tick))}s`:'SEALED · A teammate can rescue you with E. Stay together!';
  task.classList.toggle('hidden',!live||!p.sealing);if(p.sealing)task.querySelector('i').style.width=`${Math.max(0,1-(p.sealing.endsAt-state.tick)/COMBAT.sealTime)*100}%`;
  const available=!!e&&(e.phase==='exposed'&&distance(p,e)<COMBAT.boltRange||e.minions.some(m=>m.hp>0&&distance(p,m)<COMBAT.boltRange));
  for(const b of document.querySelectorAll('[data-action="strike"]')){const cooldown=Math.max(0,p.strikeUntil-state.tick);b.disabled=p.health<=0||p.energy<COMBAT.boltCost||!available||cooldown>.05;b.title='J · Spirit bolt · 3 spirit · Hold to fire';b.classList.toggle('attack-ready',available&&cooldown<=0);}
 }
 function sealNode(s){
  const g=new THREE.Group();g.name=s.id;const mat=glow('#ad6af4'),base=floorRing(g,mat,1.1);base.position.y=.08;
  const crystal=new THREE.Mesh(sealCrystalGeometry,surface('#8555bc',{emissive:'#a756d7',emissiveIntensity:1.1}));crystal.position.y=.8;g.add(crystal);
  const paper=new THREE.Mesh(sealPaperGeometry,paperMaterial);paper.position.set(0,1.6,0);g.add(paper);root.add(g);return {g,mat,paper,crystal};
 }
 function minionNode(){if(maskTemplate){const clone=maskTemplate.clone(true);root.add(clone);return clone;}const g=new THREE.Group();g.name='cursed-shadow-mask';orb(g,'#33233e',0,0,0,.36,.42,.23);for(const s of [-1,1]){orb(g,surface('#ffbd72',{emissive:'#ed6746',emissiveIntensity:2}),s*.13,.08,.22,.075,.095,.04);const fang=new THREE.Mesh(new THREE.ConeGeometry(.05,.18,8),surface('#e8d5ae'));fang.position.set(s*.16,-.16,.24);fang.rotation.z=Math.PI;g.add(fang);}curve(g,'#755184',[[0,-.30,0],[.13,-.6,-.05],[-.12,-.85,0]],.08);batchRigidParts(g);maskTemplate=g.clone(true);root.add(g);return g;}
 function wardNode(){if(wardTemplate){const clone=wardTemplate.clone(true);root.add(clone);return clone;}const g=new THREE.Group();const mat=glow('#ffd894');mat.opacity=.22;const dome=new THREE.Mesh(new THREE.SphereGeometry(3.15,24,14,0,Math.PI*2,0,Math.PI/2),mat);g.add(dome);const edge=floorRing(g,glow('#ffe3a1'),3.15);edge.position.y=.07;for(let i=0;i<7;i++){const a=i/7*Math.PI*2,m=new THREE.Mesh(new THREE.PlaneGeometry(.35,.55),paperMaterial);m.position.set(Math.cos(a)*2.7,1.3,Math.sin(a)*2.7);m.rotation.y=-a+Math.PI/2;g.add(m);}wardTemplate=g.clone(true);root.add(g);return g;}
 function prune(map,ids,dispose){for(const [id,n]of map)if(!ids.has(id)){root.remove(n.g||n);dispose?.(n);map.delete(id);}}
 function update(state,id,time,tick){
  shake*=.85;const e=state?.encounter,live=state?.phase==='playing';root.visible=!!live&&!!e;if(!root.visible)return;
  king.root.visible=e.phase!=='quiet';king.root.position.set(e.x,groundHeight(e.x,e.z)+.30+Math.sin(time*1.6)*.13,e.z);
  const appear=e.phase==='omen'?THREE.MathUtils.clamp(1-(e.until-tick)/COMBAT.omen,.01,1):e.phase==='banished'?THREE.MathUtils.clamp((e.until-tick)/5,0,1):1;king.root.scale.setScalar(appear);
  const me=state.players[id];king.root.rotation.y=me?Math.atan2(me.x-e.x,me.z-e.z):0;king.body.rotation.z=Math.sin(time*.8)*.025;king.head.rotation.y=Math.sin(time*.6)*.10;
  king.arms.forEach((a,i)=>a.rotation.z=(i?1:-1)*(.15+Math.sin(time*2+i)*.04));king.crystal.rotation.y=time*.65;king.core.material.emissive.set(e.phase==='exposed'?'#ffc154':'#8a37ed');king.orbits.forEach((o,i)=>{o.rotation.x=time*.5+i;o.rotation.z=time*.3+i;});
  const seals=e.phase==='assault'||e.phase==='omen'?e.seals.filter(s=>!s.broken):[];
  for(const s of seals){let n=sealNodes.get(s.id);if(!n){n=sealNode(s);sealNodes.set(s.id,n);}n.g.position.set(s.x,groundHeight(s.x,s.z),s.z);n.paper.rotation.y=time*.7;n.paper.position.y=1.5+Math.sin(time*2+s.index)*.15;n.crystal.rotation.y=time;n.mat.opacity=.6+Math.sin(time*5)*.2;}
  prune(sealNodes,new Set(seals.map(s=>s.id)),n=>n.mat.dispose());
  for(const h of e.hazards){let n=hazardNodes.get(h.id);if(!n){const g=new THREE.Group(),mat=glow('#d478ff'),diskMat=glow('#ba517b');diskMat.opacity=.18;const edge=floorRing(g,mat,1),disk=floorDisk(g,diskMat,1);g.position.y=.07;root.add(g);n={g,mat,diskMat,edge,disk};hazardNodes.set(h.id,n);}const warning=tick<h.startsAt,radius=h.kind==='wave'?(warning?1.5:Math.max(.1,(tick-h.startsAt)*5.8)):h.radius;n.g.position.set(h.x,groundHeight(h.x,h.z)+.10,h.z);n.edge.scale.setScalar(radius);n.disk.scale.setScalar(radius*(warning?THREE.MathUtils.clamp(1-(h.startsAt-tick)/1.8,.04,1):1));n.disk.visible=h.kind==='burst';n.mat.color.set(warning?'#ffbc80':'#e7a2ff');n.mat.opacity=warning?.65+Math.sin(time*14)*.3:1;n.diskMat.opacity=warning?.13+Math.sin(time*10)*.06:.65;n.g.position.y+=!warning&&h.kind==='wave'?.14:0;}
  prune(hazardNodes,new Set(e.hazards.map(h=>h.id)),n=>{n.mat.dispose();n.diskMat.dispose();});
  for(const m of e.minions){let n=minionNodes.get(m.id);if(!n){n=minionNode();minionNodes.set(m.id,n);}n.position.set(m.x,groundHeight(m.x,m.z)+1+Math.sin(time*5)*.12,m.z);if(me)n.rotation.y=Math.atan2(me.x-m.x,me.z-m.z);}
  prune(minionNodes,new Set(e.minions.map(m=>m.id)));
  const wardPlayers=Object.values(state.players).filter(p=>p.connected&&p.health>0&&(p.cover>0||p.ward>0));
  for(const p of wardPlayers){let n=wards.get(p.id);if(!n){n=wardNode();wards.set(p.id,n);}n.position.set(p.x,groundHeight(p.x,p.z)+.03,p.z);n.rotation.y=time*.18;n.scale.setScalar(p.cover>0?1:.43);}
  prune(wards,new Set(wardPlayers.map(p=>p.id)));
  for(let i=effects.length-1;i>=0;i--){const f=effects[i],t=(performance.now()-f.at)/1000/f.duration;if(t>=1){root.remove(f.node);f.material.dispose();effects.splice(i,1);continue;}if(f.kind==='bolt'){f.node.position.lerpVectors(f.start,f.end,Math.min(1,t));f.node.scale.setScalar(.15+Math.sin(t*Math.PI)*.12);}else{f.node.position.copy(f.start);f.node.scale.setScalar(.4+t*3);f.material.opacity=1-t;}}
 }
 function event(ev){
  if(!['bolt','hit','blocked','seal','revive','bossDown','omen'].includes(ev.fx))return false;
  if(ev.fx==='omen')return true;
  const p=current?.players[ev.actor],at=ev.at||p;if(!at)return true;
  const color=ev.fx==='hit'?'#ff8c84':ev.fx==='bolt'?(ev.combo?'#fff1a6':POTION_COLORS[p?.character]||'#fff1a6'):'#ffdb84',mat=glow(color),node=new THREE.Mesh(ev.fx==='bolt'?ballGeometry:ringGeometry,mat);
  const start=new THREE.Vector3(p?.x??at.x,groundHeight(p?.x??at.x,p?.z??at.z)+1.5,p?.z??at.z),end=new THREE.Vector3(at.x,groundHeight(at.x,at.z)+(ev.boss?2.8:1.1),at.z);
  if(ev.fx!=='bolt'){start.set(at.x,groundHeight(at.x,at.z)+.2,at.z);node.rotation.x=-Math.PI/2;}node.position.copy(start);root.add(node);effects.push({node,material:mat,kind:ev.fx,start,end,at:performance.now(),duration:ev.fx==='bolt'?.28:.8});
  if(ev.fx==='hit'&&ev.actor===myId){shake=1;hud.classList.add('combat-hit');setTimeout(()=>hud.classList.remove('combat-hit'),350);}
  return true;
 }
 function prompt(state,p){
  if(p.health<=0)return 'SEALED · Wait for a teammate or your talisman';
  const ally=Object.values(state.players).find(a=>a.id!==p.id&&a.connected&&a.health<=0&&distance(p,a)<COMBAT.reviveRange);if(ally)return `E · Rescue ${ally.name}`;
  if(p.sealing)return 'Unbinding seal… stay close · C Ward protects you';
  if(state.encounter?.phase==='assault'&&state.encounter.seals.some(s=>!s.broken&&distance(p,s)<COMBAT.sealRange))return 'E · Break cursed seal';
  return '';
 }
 return {sync,update,event,prompt,announce(text){announcement={text,until:performance.now()+2600};card.querySelector('p').textContent=text;},get shake(){return shake;}};
}
