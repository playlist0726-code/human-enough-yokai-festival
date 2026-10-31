import * as THREE from 'three';

const TAU=Math.PI*2;
const damp=(a,b,dt,rate=12)=>THREE.MathUtils.lerp(a,b,1-Math.exp(-Math.min(dt,.1)*rate));
const clamp=THREE.MathUtils.clamp;
export const GAITS={
  mizu:{stride:1.55,swing:.67,bounce:.075,sway:.043,arms:.61,lean:.09},
  pon:{stride:1.8,swing:.58,bounce:.095,sway:.067,arms:.68,lean:.08},
  kon:{stride:1.65,swing:.76,bounce:.064,sway:.035,arms:.58,lean:.1},
  sumi:{stride:1.5,swing:.7,bounce:.067,sway:.047,arms:.79,lean:.12},
  nemu:{stride:1.72,swing:.65,bounce:.058,sway:.038,arms:.51,lean:.07},
  akari:{stride:1.55,swing:.64,bounce:.08,sway:.042,arms:.65,lean:.075},
  visitor:{stride:1.5,swing:.6,bounce:.045,sway:.028,arms:.46,lean:.065},
  kasa:{stride:1.18,swing:.29,bounce:.21,sway:.065,arms:.57,lean:.07},
};

// A small real skeleton bends the neck/tail; the end joint carries its face.
export function flexibleTube(parent,points,radius,material){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const segments=36,sides=10,geometry=new THREE.TubeGeometry(curve,segments,radius,sides,false),indices=[],weights=[];
  for(let j=0;j<=segments;j++){
    const t=j/segments*(points.length-1),a=Math.min(points.length-2,Math.floor(t)),b=a+1,f=t-a,w=f*f*(3-2*f);
    for(let k=0;k<=sides;k++){indices.push(a,b,0,0);weights.push(1-w,w,0,0);}
  }
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  const mesh=new THREE.SkinnedMesh(geometry,material),bones=points.map(()=>new THREE.Bone());
  points.forEach((p,i)=>{bones[i].name=`flex-joint-${i}`;bones[i].position.set(...p);if(i){bones[i].position.sub(new THREE.Vector3(...points[i-1]));bones[i-1].add(bones[i]);}});
  mesh.name='articulated-yokai-curve';mesh.add(bones[0]);parent.add(mesh);mesh.bind(new THREE.Skeleton(bones));mesh.castShadow=mesh.receiveShadow=true;
  // Animated bounds must not be frozen at the bind pose.
  mesh.frustumCulled=false;return {mesh,bones,end:bones.at(-1)};
}

// Morph just the lower fabric. The neckline stays attached to the shoulders.
export function clothHem(geometry,height=.8){
  const base=geometry.attributes.position,normal=geometry.attributes.normal,targets=[],normals=[];
  for(const axis of ['x','z']){
    const pose=geometry.clone(),p=pose.attributes.position;
    for(let i=0;i<p.count;i++){const weight=Math.pow(clamp(1-p.getY(i)/height,0,1),2);if(axis==='x')p.setX(i,p.getX(i)+weight*.12);else p.setZ(i,p.getZ(i)+weight*.13);}
    pose.computeVertexNormals();const delta=new Float32Array(base.count*3),dn=new Float32Array(base.count*3);
    for(let i=0;i<delta.length;i++){delta[i]=pose.attributes.position.array[i]-base.array[i];dn[i]=pose.attributes.normal.array[i]-normal.array[i];}
    targets.push(new THREE.Float32BufferAttribute(delta,3));normals.push(new THREE.Float32BufferAttribute(dn,3));pose.dispose();
  }
  geometry.morphTargetsRelative=true;geometry.morphAttributes.position=targets;geometry.morphAttributes.normal=normals;return geometry;
}
function remember(node){if(!node)return null;return {node,position:node.position.clone(),rotation:node.rotation.clone(),scale:node.scale.clone()};}
function restore(r){for(const pose of r.rest){pose.node.position.copy(pose.position);pose.node.rotation.copy(pose.rotation);pose.node.scale.copy(pose.scale);}}
export function prepareMotion(r){
  // Feet keep their own ground contact while the upper body rocks at the waist.
  r.stance=new THREE.Group();r.stance.name='independent-footwork';r.root.add(r.stance);
  for(const leg of r.legs)r.stance.add(leg);
  r.waist=new THREE.Group();r.waist.name='weight-shift-pivot';r.waist.position.y=.92;r.root.add(r.waist);r.waist.add(r.body);r.body.position.y=-.92;
  r.rest=[];const seen=new Set();
  for(const node of [r.body,r.waist,r.stance,r.head,r.extraHead,r.mask,r.tail,r.hipBottle,...r.arms,...r.legs,...(r.knees||[]),...(r.feet||[]),...(r.lanterns||[]),...(r.tailTips||[]),...(r.ears||[]),...(r.tassels||[]),...(r.neck?.bones||[]),...(r.tailSpine?.bones||[])])if(node&&!seen.has(node)){seen.add(node);r.rest.push(remember(node));}
  r.restByNode=new Map(r.rest.map(p=>[p.node,p]));r.gaitPhase=r.phase;r.motion=0;r.speed=0;r.lastSpeed=0;r.lastXZ=null;r.groundHeight=0;r.airborne=false;r.landing=0;r.turnLean=0;r.drinkBlend=0;r.charmBlend=0;r.coverBlend=0;
  r.root.userData.motionVersion='expressive-v1';
}
function look(r,time,charm,dt){
  // Short glances settle between changes rather than scanning constantly.
  const glance=Math.sin(time*.53+r.phase)*.5+Math.sin(time*.19+r.phase)*.5;
  for(const eye of r.eyes){
    const phase=(time+r.phase)%(r.blinkPeriod||4.7),blink=phase<.16?Math.sin(phase/.16*Math.PI):0;eye.scale.y=1-blink*.94;
    eye.userData.iris.rotation.y=damp(eye.userData.iris.rotation.y,glance*.18,dt,10);
    eye.userData.iris.rotation.x=charm?-.15:Math.sin(time*.77+r.phase)*.045;
  }
}
export function animateCharacter(r,p,dt,time,tick,position){
  dt=clamp(dt,0,.1);const gait=GAITS[r.gaitKey||r.character],locked=['arrive','drink','charm','stall'].includes(p.action)||!!p.mini;
  let speed=0;
  if(position&&Number.isFinite(position.x)&&Number.isFinite(position.z)){
    if(r.lastXZ&&dt>0){const travel=Math.hypot(position.x-r.lastXZ.x,position.z-r.lastXZ.z);if(travel<2.5)speed=clamp(travel/dt,0,6);}
    r.lastXZ={x:position.x,z:position.z};
  }else speed=Math.min(1,Math.hypot(p.dx||0,p.dz||0))*3.6;
  if(locked)speed=0;
  r.lastSpeed=r.speed;r.speed=damp(r.speed,speed,dt,12);r.motion=damp(r.motion,clamp(r.speed/3.6,0,1.25),dt,14);
  if(locked&&r.motion<.001)r.motion=0;
  r.gaitPhase+=speed/gait.stride*TAU*dt;
  const phase=r.gaitPhase,walk=r.motion,step=Math.sin(phase),breath=Math.sin(time*2.2+r.phase),idle=1-clamp(walk,0,1),drink=p.action==='drink',charm=p.action==='charm'||p.action==='strike'||!!p.sealing,cover=p.cover>0;
  r.drinkBlend=damp(r.drinkBlend,drink?1:0,dt,15);r.charmBlend=damp(r.charmBlend,charm?1:0,dt,15);r.coverBlend=damp(r.coverBlend,cover?1:0,dt,15);
  const facing=Number.isFinite(p.facing)?p.facing:0,delta=Math.atan2(Math.sin(facing-r.root.rotation.y),Math.cos(facing-r.root.rotation.y));
  const turn=delta*(1-Math.exp(-dt*12));r.root.rotation.y+=turn;r.turnLean=damp(r.turnLean,clamp(-(p.turnRate??turn/Math.max(dt,.001))*.025,-.17,.17)*walk,dt,8);
  restore(r);
  // Blend the server jump samples and add a short landing compression.
  const height=Math.max(0,p.height||0),poseHeight=p.poseHeight??height,newAir=(p.vy||0)>0||poseHeight>.02;
  if(!newAir&&r.airborne)r.landing=1;
  r.airborne=newAir;r.landing*=Math.exp(-dt*13);
  r.root.position.y=damp(r.root.position.y,height,dt,23);
  const bounce=(1-Math.cos(phase*2))*.5*gait.bounce*walk,hop=r.character==='kasa'?Math.pow(Math.max(0,Math.sin(phase)),1.2)*gait.bounce*walk:0;
  r.body.position.y+=bounce+hop+breath*.016*idle-r.landing*.07;
  r.body.position.x+=Math.cos(phase)*gait.sway*walk;
  r.waist.rotation.z=-Math.sin(phase)*.05*walk+r.turnLean+Math.sin(time*1.15+r.phase)*.015*idle;
  r.waist.rotation.x=gait.lean*walk+clamp((r.speed-r.lastSpeed)/Math.max(dt,.001)*.004,-.07,.07)+r.landing*.11;
  r.waist.rotation.y=Math.sin(phase)*.055*walk;
  const squash=r.landing*.07;
  r.waist.scale.set(1+breath*.009*idle+squash*.45,1+breath*.012*idle-squash,1+breath*.008*idle+squash*.4);
  r.legs.forEach((leg,i)=>{
    const local=((phase+i*Math.PI)%TAU+TAU)%TAU,swing=local<Math.PI;
    const travel=(swing?-Math.cos(local):1-2*(local-Math.PI)/Math.PI),lift=swing?Math.sin(local):0,origin=r.restByNode.get(leg);
    leg.rotation.x=-travel*gait.swing*walk;leg.rotation.z=(i===0?1:-1)*.025*walk;
    if(r.knees?.[i]&&r.feet?.[i]){
      const knee=r.knees[i],foot=r.feet[i],k=r.restByNode.get(knee).position,f=r.restByNode.get(foot).position;
      knee.rotation.x=lift*.55*walk;foot.rotation.x=-leg.rotation.x-knee.rotation.x-lift*.12*walk;foot.rotation.z=-leg.rotation.z;
      const a=leg.rotation.x,b=a+knee.rotation.x;
      const ankleY=k.y*Math.cos(a)-k.z*Math.sin(a)+f.y*Math.cos(b)-f.z*Math.sin(b);
      const ankleZ=k.y*Math.sin(a)+k.z*Math.cos(a)+f.y*Math.sin(b)+f.z*Math.cos(b);
      // During the planted half-step the foot moves backwards at ground speed.
      // The hidden hip shift absorbs short cartoon legs without sliding the shoe.
      leg.position.y=origin.position.y+k.y+f.y+lift*.12*walk-ankleY;
      leg.position.z=origin.position.z+k.z+f.z+travel*gait.stride*.25*walk-ankleZ;
    }else{
      leg.position.y=origin.position.y+lift*.095*walk;leg.position.z=origin.position.z+travel*.11*walk;
    }
  });
  if(r.character==='kasa'){
    r.stance.position.y=hop*.85;r.legs[0].rotation.x=-Math.sin(phase)*.3*walk;r.legs[0].position.y+=r.landing*.035;
  }
  r.arms.forEach((arm,i)=>{
    const sign=i===0?1:-1;arm.rotation.x=Math.sin(phase+i*Math.PI)*gait.arms*walk+Math.sin(time*1.7+r.phase+i*.8)*.04*idle;
    arm.rotation.z=sign*(.08+Math.max(0,Math.sin(phase+i*Math.PI))*.11*walk)+r.turnLean*.25;
    arm.rotation.y=Math.cos(phase+i*Math.PI)*.07*walk;
    const coverWeight=r.coverBlend*(1-r.charmBlend);
    arm.rotation.x=THREE.MathUtils.lerp(arm.rotation.x,-.35+Math.sin(time*3+i)*.08,coverWeight);
    arm.rotation.z=THREE.MathUtils.lerp(arm.rotation.z,sign*1.03,coverWeight);
    arm.rotation.x=THREE.MathUtils.lerp(arm.rotation.x,-1.15+Math.sin(time*7+i)*.13,r.charmBlend);
    arm.rotation.z=THREE.MathUtils.lerp(arm.rotation.z,sign*(.34+Math.sin(time*5+i)*.08),r.charmBlend);
    if(i===1){const angle={pon:-1.45,akari:-1.85,kasa:-1.85}[r.character]||-2.24;arm.rotation.x=THREE.MathUtils.lerp(arm.rotation.x,angle+Math.sin(time*12)*.055,r.drinkBlend);arm.rotation.z=THREE.MathUtils.lerp(arm.rotation.z,.24,r.drinkBlend);}
  });
  const gesturePhase=(time+r.phase*2)%12,gesture=gesturePhase>7&&gesturePhase<9?Math.pow(Math.sin((gesturePhase-7)*Math.PI/2),2)*idle:0;
  if(!locked&&!cover){
    if(r.character==='mizu'){r.arms[0].rotation.x-=gesture*.75;r.arms[0].rotation.z+=gesture*.25;}
    if(r.character==='pon'){r.arms.forEach(a=>a.rotation.x-=gesture*.4);}
    if(r.character==='sumi')r.arms.forEach((a,i)=>a.rotation.z+=(i===0?1:-1)*gesture*.28);
    if(r.character==='nemu')r.arms[0].rotation.x-=gesture*.5;
    if(r.character==='akari')r.arms[1].rotation.x-=gesture*.6;
    if(r.character==='kasa')r.arms[0].rotation.z+=gesture*.35;
  }
  if(r.head){
    r.head.rotation.x+=-Math.cos(phase*2)*.035*walk+breath*.025*idle-r.drinkBlend*.18-r.charmBlend*.06;
    r.head.rotation.y+=Math.sin(time*.6+r.phase)*.11*idle-r.waist.rotation.y*.6;
    r.head.rotation.z+=Math.sin(time*1.05+r.phase)*.028*idle+Math.sin(phase-.5)*.025*walk;
    r.waist.rotation.x=THREE.MathUtils.lerp(r.waist.rotation.x,-.07,r.drinkBlend);
  }
  if(r.robe?.morphTargetInfluences){r.robe.morphTargetInfluences[0]=Math.sin(phase-.6)*walk*.85+r.turnLean*2;r.robe.morphTargetInfluences[1]=Math.cos(phase*2-.4)*walk*.45+breath*.12*idle;}
  if(r.tail){r.tail.rotation.y+=Math.sin(phase-.8)*.25*walk+Math.sin(time*1.7+r.phase)*.075*idle-r.turnLean*.7;r.tail.rotation.z+=Math.sin(phase-1.2)*.07*walk+breath*.025*idle;}
  r.tailTips?.forEach((tip,i)=>{tip.rotation.z+=(i===0?1:-1)*(Math.sin(phase-1-i*.5)*.12*walk+Math.sin(time*1.7+r.phase+i)*.045*idle);tip.rotation.x+=Math.sin(time*2+phase*.3+i)*.045;});
  r.neck?.bones.forEach((bone,i)=>{if(!i)return;bone.rotation.z+=Math.sin(phase-i*.65)*.065*walk+Math.sin(time*1.4+r.phase-i*.6)*.028*idle+r.turnLean*.25;bone.rotation.x+=Math.sin(phase-i*.8)*.035*walk+(charm?-.05:0);});
  r.tailSpine?.bones.forEach((bone,i)=>{if(!i)return;bone.rotation.z+=Math.sin(phase-i*.7)*.09*walk+Math.sin(time*1.6+r.phase-i*.65)*.04*idle;bone.rotation.y+=Math.sin(time*1.1-i*.8)*.025*idle;});
  if(r.neck){const recoil=1-r.drinkBlend*.44;r.neck.bones[0].scale.y=recoil;r.head.scale.y/=recoil;}
  if(r.tailSpine){const recoil=1-r.drinkBlend*.35;r.tailSpine.bones[0].scale.y=recoil;r.mask.scale.y/=recoil;}
  if(r.mask){r.mask.rotation.x+=Math.sin(time*1.8)*.06;r.mask.rotation.y+=Math.sin(time*.9)*.15*idle;}
  if(r.extraHead){r.extraHead.rotation.y+=Math.sin(time*1.5+1)*.2*idle;r.extraHead.rotation.z+=Math.sin(phase-.9)*.065*walk;}
  r.lanterns?.forEach((l,i)=>{l.rotation.z+=Math.sin(phase-i*.7)*.10*walk+Math.sin(time*1.8+r.phase-i*.6)*.035*idle;l.rotation.x+=Math.cos(phase-i*.7)*.045*walk;});
  r.ears?.forEach((ear,i)=>{const twitch=Math.pow(Math.max(0,Math.sin(time*2.1+r.phase+i*2.7)),14);ear.rotation.z+=(i%2?1:-1)*(Math.sin(phase-.45)*.045*walk+twitch*.10*idle);});
  r.tassels?.forEach((t,i)=>{t.rotation.z+=Math.sin(phase-.6+i*.5)*.2*walk+Math.sin(time*2+i*.5)*.05*idle;});
  if(r.mouth){r.mouth.scale.y=1+breath*.055*idle+Math.max(0,Math.sin(phase))*.055*walk+gesture*.1;}
  if(r.hipBottle){r.hipBottle.visible=!drink;r.hipBottle.rotation.z+=Math.sin(phase-.8)*.16*walk+breath*.02;r.hipBottle.rotation.x+=Math.cos(phase-.5)*.13*walk;}
  if(r.bottle){r.bottle.visible=drink;const angle={pon:-1.45,akari:-1.85,kasa:-1.85}[r.character]||-2.24;r.bottle.rotation.x=-angle-.4;}
  if(poseHeight>.1){r.legs.forEach(l=>l.rotation.x=-.55);r.knees?.forEach(k=>k.rotation.x=.8);r.arms.forEach((a,i)=>{if(!drink&&!charm&&!cover)a.rotation.z=(i===0?1:-1)*.65;});r.waist.rotation.x=-.09;}
  look(r,time,charm,dt);
  const arrival=p.action==='arrive'?clamp(1-(p.actionUntil-tick)/2,0,1):1;r.root.scale.setScalar(Math.max(.01,arrival));r.body.position.y+=(1-arrival)*.6;
}
