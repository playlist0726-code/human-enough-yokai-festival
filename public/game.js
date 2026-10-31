import * as THREE from 'three';
import {CHARACTERS, WORLD, STALLS, POTION_SPOTS, distance, groundHeight,nearbyStall,findPath,walkable} from '/shared/world.mjs';
import {createStallUI} from '/stall-ui.mjs';
import {createPlayerAvatar as createAvatar,animatePlayerAvatar as animateAvatar} from '/disguise.mjs';
import {DISGUISE,disguiseState} from '/shared/disguise.mjs';
import {createTransformation} from '/transformation.mjs';
import {keyIntent,MOVEMENT,viewMovement} from '/controls.mjs';
import {buildFestival} from '/festival.mjs';
import {createVisitor,animateVisitor} from '/visitors.mjs';
import {POTION_COLORS} from '/renderkit.mjs';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {SMAAPass} from 'three/addons/postprocessing/SMAAPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {createConnection} from '/connection.mjs';
import {createFoundationUI} from '/foundation-ui.mjs';
import {loadSettings,saveSettings} from '/profile.mjs';
import {PROFILES,initialProfile,slowerProfile} from '/visual-quality.mjs';
import {FestivalCamera} from '/free-camera.mjs';
import {modelReport} from '/model-assets.mjs';
import {installPlaytest} from '/playtest-client.mjs';
import {bindJoystick} from '/touch-controls.mjs';
import {createEncounterView} from '/encounter-view.mjs';

const $ = id => document.getElementById(id);
let localStore,sessionStore;try{localStore=localStorage;sessionStore=sessionStorage;}catch{}
const settings=loadSettings(localStore);
const query=new URLSearchParams(location.search),touchMode=query.get('touch')==='1'||matchMedia('(any-pointer: coarse)').matches;
document.body.classList.toggle('touch-mode',touchMode);
const invitedRoom=(query.get('room')||'').toUpperCase();if(/^[A-Z2-9]{5}$/.test(invitedRoom))$('join-code').value=invitedRoom;
let connectionState='idle';
let selected=CHARACTERS.some(c=>c.id===settings.character)?settings.character:'mizu',myId,state,practice=false,seenEvent=0,lastPhase='',talkTarget=null,transport,shell,stateReceivedAt=0;
const save=()=>saveSettings(localStore,settings);
$('nickname').value=settings.name;
let strikeHeld=false,nextStrikeAt=0;
let sound=settings.sound,audio,joystick={x:0,z:0},clickGoal=null,clickPath=[];
const keys=new Set(), playerNodes=new Map(), humanNodes=new Map(), potionNodes=new Map(), textures=new Map();
const playerCache=new Map(),humanCache=new Map();
const canvas=$('scene'), scene=new THREE.Scene();
const stallUI=createStallUI(send,stopInput,()=>canvas.focus({preventScroll:true}),{getSound:()=>sound,getQuality:()=>qualityMode,onSoundChange:enabled=>{sound=enabled;settings.sound=enabled;save();$('sound').classList.toggle('active',sound);$('sound').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on');shell?.refreshSettings();}});
const perks=document.createElement('div');perks.className='festival-perks';$('followers').after(perks);
scene.background=new THREE.Color('#151c34');
scene.fog=new THREE.FogExp2('#26374f',.0065);
let renderer;
try { renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false}); }
catch { $('loading').textContent='This browser could not open the 3D view. Please use a browser with WebGL support.'; throw Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.info.autoReset=false;
const camera=new THREE.PerspectiveCamera(55,1,.08,300);
const freeCamera=new FestivalCamera(camera);
camera.position.set(0,14,33); camera.lookAt(0,0,12);
scene.add(new THREE.HemisphereLight('#afc9f4','#4c6853',.65));
const pmrem=new THREE.PMREMGenerator(renderer),roomEnvironment=new RoomEnvironment();
scene.environment=pmrem.fromScene(roomEnvironment,.04).texture;scene.environmentIntensity=.30;roomEnvironment.dispose();pmrem.dispose();
const moonLight=new THREE.DirectionalLight('#adc6f3',1.1);moonLight.position.set(-15,28,8);moonLight.castShadow=true;
moonLight.shadow.mapSize.set(2048,2048);moonLight.shadow.normalBias=.035;moonLight.shadow.bias=-.0003;moonLight.shadow.camera.left=-30;moonLight.shadow.camera.right=30;
moonLight.shadow.camera.top=16;moonLight.shadow.camera.bottom=-16;moonLight.shadow.camera.left=-16;moonLight.shadow.camera.right=16;moonLight.shadow.camera.far=75;moonLight.shadow.radius=3;scene.add(moonLight);
const warmFill=new THREE.DirectionalLight('#ffcf95',.65);warmFill.position.set(12,8,15);scene.add(warmFill);
const rimLight=new THREE.DirectionalLight('#b4c4ff',.65);rimLight.position.set(0,12,-25);scene.add(rimLight);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
const ao=new SSAOPass(scene,camera,innerWidth,innerHeight,16);ao.kernelRadius=.65;ao.minDistance=.002;ao.maxDistance=.06;composer.addPass(ao);
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.28,.45,1.25);composer.addPass(bloom);
const grade=new ShaderPass({uniforms:{tDiffuse:{value:null}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D tDiffuse;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);float edge=dot(vUv-.5,vUv-.5);c.rgb*=1.-smoothstep(.1,.5,edge)*.13;gl_FragColor=c;}'});composer.addPass(grade);
composer.addPass(new SMAAPass());composer.addPass(new OutputPass());
let qualityMode=settings.quality,profile=qualityMode==='auto'?initialProfile(innerWidth,navigator.hardwareConcurrency||4,touchMode):qualityMode,slowSeconds=0,sampleTime=0,sampleFrames=0,measuredFps=60;
const qualityButton=document.createElement('button');qualityButton.className='view-control';qualityButton.setAttribute('aria-label','Change graphics quality');
const cameraButton=document.createElement('button');cameraButton.className='view-control';cameraButton.setAttribute('aria-label','Change camera distance');
const rotateButton=document.createElement('button');rotateButton.className='view-control';rotateButton.textContent='Reset view';rotateButton.setAttribute('aria-label','Reset camera');
const lookButton=document.createElement('button');lookButton.className='view-control';lookButton.textContent='Mouse look';lookButton.setAttribute('aria-label','Toggle mouse look');
let mouseLook=false;
const viewControls=document.createElement('div');viewControls.className='view-controls';viewControls.append(cameraButton,rotateButton,lookButton,qualityButton);$('hud').append(viewControls);
let cameraStyle=settings.camera;cameraButton.textContent=cameraStyle==='close'?'View · Close':'View · Wide';freeCamera.reset(cameraStyle==='wide');
cameraButton.onclick=()=>{cameraStyle=cameraStyle==='close'?'wide':'close';cameraButton.textContent=cameraStyle==='close'?'View · Close':'View · Wide';freeCamera.reset(cameraStyle==='wide');settings.camera=cameraStyle;save();shell?.refreshSettings();};
rotateButton.onclick=()=>{freeCamera.yaw=.2;freeCamera.reset(cameraStyle==='wide');};
lookButton.onclick=async()=>{if(document.pointerLockElement===canvas||mouseLook){mouseLook=false;lookButton.textContent='Mouse look';if(document.pointerLockElement===canvas)document.exitPointerLock();return;}try{if(!canvas.requestPointerLock)throw Error('Unavailable');await canvas.requestPointerLock();}catch{mouseLook=true;lookButton.textContent='Mouse look · On';canvas.focus();toast('Mouse look enabled. Move over the world to look; Esc releases it.');}};
document.addEventListener('pointerlockchange',()=>{lookButton.textContent=document.pointerLockElement===canvas?'Mouse look · On':'Mouse look';if(document.pointerLockElement!==canvas)stopInput();});
function applyQuality(){const q=PROFILES[profile];renderer.setPixelRatio(Math.min(devicePixelRatio,q.ratio));composer.setPixelRatio(Math.min(devicePixelRatio,q.ratio));ao.enabled=q.ao;bloom.strength=q.bloom;renderer.shadowMap.enabled=q.shadows;moonLight.shadow.mapSize.set(q.shadow,q.shadow);if(moonLight.shadow.map){moonLight.shadow.map.dispose();moonLight.shadow.map=null;}qualityButton.textContent=`Quality · ${qualityMode==='auto'?'Auto':qualityMode==='high'?'High':'Light'}`;canvas.dataset.quality=profile;}
qualityButton.onclick=()=>{qualityMode=qualityMode==='auto'?'high':qualityMode==='high'?'light':'auto';profile=qualityMode==='auto'?initialProfile(innerWidth,navigator.hardwareConcurrency||4,touchMode):qualityMode;slowSeconds=0;settings.quality=qualityMode;save();applyQuality();shell?.refreshSettings();};applyQuality();
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extra});
function mesh(geometry,mat,x,y,z,parent=scene){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function planeText(text,color='#594632',bg='#f5e5bf',width=256){
  const c=document.createElement('canvas');c.width=width;c.height=80;const ctx=c.getContext('2d');
  ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(3,3,width-6,74,18);ctx.fill();
  ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,width/2,40,width-24);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthWrite:false}));sprite.scale.set(2.8,.88,1);return sprite;
}
const festival=buildFestival(scene,potionNodes);
const encounterView=createEncounterView(scene,{hud:$('hud'),onAction:action=>act(action)});
const transformation=createTransformation(renderer);

const referenceImages=await Promise.all(CHARACTERS.map(c=>new Promise(resolve=>{
  const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>{const fallback=document.createElement('canvas');fallback.width=150;fallback.height=158;const ctx=fallback.getContext('2d');ctx.fillStyle=c.color;ctx.beginPath();ctx.arc(75,75,55,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 30px sans-serif';ctx.textAlign='center';ctx.fillText(c.name,75,85);resolve(fallback);};image.src=`/assets/${c.id}-reference.png`;
})));
CHARACTERS.forEach((c,i)=>{
  const frames=[referenceImages[i]];textures.set(c.id,{frames});
  const button=document.createElement('button');button.className='character';button.dataset.character=c.id;button.setAttribute('aria-label',`${c.name} · ${c.tag}`);button.setAttribute('aria-pressed',String(c.id===selected));
  const pic=document.createElement('canvas');pic.width=150;pic.height=158;pic.getContext('2d').drawImage(frames[0],7,0,136,158);button.append(pic);
  const name=document.createElement('span');name.textContent=c.name;button.append(name);
  button.onclick=()=>{selected=c.id;settings.character=selected;save();updateSelection();};$('characters').append(button);
});
function updateSelection(){for(const button of $('characters').children){const active=button.dataset.character===selected;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));}const c=CHARACTERS.find(c=>c.id===selected);$('character-name').textContent=`${c.name} · ${c.tag}`;$('character-quote').textContent=`“${c.quote}”`;$('character-bio').textContent=c.bio;$('character-story').style.setProperty('--character-color',c.color);}
updateSelection();$('loading').classList.add('hidden');
$('title-enter').disabled=false;
function showCharacterSelection(){
  $('title-screen').classList.add('hidden');$('menu').classList.remove('hidden');
  $('characters').querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
}
$('title-enter').onclick=showCharacterSelection;
$('title-back').onclick=()=>{$('menu').classList.add('hidden');$('title-screen').classList.remove('hidden');$('title-enter').focus({preventScroll:true});};
document.addEventListener('keydown',e=>{
  if(e.code==='Enter'&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!$('title-screen').classList.contains('hidden')&&!$('title-enter').disabled){e.preventDefault();showCharacterSelection();}
});
let contactShadowTexture;
function shadow(parent){
  if(!contactShadowTexture){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,2,64,64,64);g.addColorStop(0,'#192d39a6');g.addColorStop(.4,'#192d3966');g.addColorStop(1,'#192d3900');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);contactShadowTexture=new THREE.CanvasTexture(c);}
  const m=mesh(new THREE.PlaneGeometry(1.8,1.45),new THREE.MeshBasicMaterial({map:contactShadowTexture,transparent:true,opacity:.6,depthWrite:false}),0,.065,0,parent);m.rotation.x=-Math.PI/2;return m;
}
function makePlayer(p){
  const reused=playerCache.get(p.character);
  if(reused){
    playerCache.delete(p.character);reused.p=p;reused.group.position.set(p.x,groundHeight(p.x,p.z),p.z);reused.rig.root.position.y=0;reused.aura.visible=false;
    reused.group.remove(reused.label);reused.label.material.map.dispose();reused.label.material.dispose();
    reused.label=planeText(p.name,p.id===myId?'#604438':'#59697a',p.id===myId?'#fff0cc':'#e5e9e5',192);reused.label.scale.set(1.2,.32,1);reused.label.position.y=3.45;reused.group.add(reused.label);
    scene.add(reused.group);playerNodes.set(p.id,reused);return reused;
  }
  const g=new THREE.Group();g.position.set(p.x,groundHeight(p.x,p.z),p.z);scene.add(g);shadow(g);
  const rig=createAvatar(p.character);g.add(rig.root);
  const label=planeText(p.name,p.id===myId?'#604438':'#59697a',p.id===myId?'#fff0cc':'#e5e9e5',192);label.scale.set(1.2,.32,1);label.position.y=3.45;g.add(label);
  const aura=mesh(new THREE.RingGeometry(.7,.8,48),new THREE.MeshBasicMaterial({color:'#b8a7f7',transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}),0,.08,0,g);aura.rotation.x=-Math.PI/2;aura.visible=false;
  const n={group:g,rig,label,aura,p};playerNodes.set(p.id,n);return n;
}
function makeHuman(h,i){
  const reused=humanCache.get(h.id);
  if(reused){humanCache.delete(h.id);reused.h=h;reused.heart.visible=false;reused.rig.lastX=reused.rig.lastZ=null;reused.group.position.set(h.x,groundHeight(h.x,h.z),h.z);scene.add(reused.group);humanNodes.set(h.id,reused);return reused;}
  const g=new THREE.Group();g.position.set(h.x,groundHeight(h.x,h.z),h.z);scene.add(g);shadow(g);
  const rig=createVisitor(i);g.add(rig.root);
  const label=planeText(h.name,'#705345','#fbebca',128);label.scale.set(.9,.28,1);label.position.y=2.72;g.add(label);
  const heart=planeText('♡','#fff1df','#9e77bd',80);heart.scale.set(.5,.5,1);heart.position.y=3.15;heart.visible=false;g.add(heart);
  const node={group:g,rig,label,heart,h};humanNodes.set(h.id,node);return node;
}

function send(m){return transport?.send(m);}
function setJoinBusy(busy){for(const id of ['create','practice','boss-practice','join'])$(id).disabled=busy;$('title-back').disabled=busy;}
function join(code='',solo=false,boss=false){
  practice=solo;$('menu-error').textContent='';seenEvent=0;settings.name=$('nickname').value;save();
  transport.join({type:'join',character:selected,name:settings.name,code,mode:boss?'boss':'festival'});
}
transport=createConnection({url:`${location.protocol==='https:'?'wss':'ws'}://${location.host}`,storage:sessionStore,
  onStatus(status){
    connectionState=status;
    setJoinBusy(status==='connecting'||status==='reconnecting');
    $('connection-status').classList.toggle('hidden',status!=='reconnecting');
    if(status==='reconnecting'){stopInput();stallUI.sync(null,0);$('game').inert=$('hud').inert=true;}
    else if(!shell?.visible){$('game').inert=$('hud').inert=state?.phase!=='playing';}
  },
  onError(message){$('menu-error').textContent=message;toast(message);},
  onExpired(message){leave();$('menu-error').textContent=message;toast(message);},
  onMessage(m){
    if(m.type==='joined'){myId=m.id;if(practice&&!m.resumed)send({type:'start'});if(m.resumed&&shell?.visible)send({type:'pause',paused:true});if(m.resumed&&!shell?.visible)canvas.focus({preventScroll:true});}
    if(m.type==='feedback')toast(m.message);
    if(m.type==='stall_ack')stallUI.ack(m);
    if(m.type==='state'){state=m.state;stateReceivedAt=performance.now();updateState();}
  }
});
$('create').onclick=()=>join();$('practice').onclick=()=>join('',true);$('boss-practice').onclick=()=>join('',true,true);
$('join').onclick=()=>{const code=$('join-code').value.trim();if(code.length!==5){$('menu-error').textContent='Enter your friend’s 5-character room code.';return;}join(code);};
$('join-code').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('join').click();}});
$('join-code').addEventListener('input',()=>{$('join-code').value=$('join-code').value.toUpperCase();});
$('start').onclick=()=>send({type:'start'});$('restart').onclick=()=>send({type:'rematch'});
$('ready').onclick=()=>send({type:'ready',ready:!state?.players[myId]?.ready});
function leave(){transformation.clear();stallUI.sync(null,0);shell?.clear();transport.leave();state=null;lastPhase='';myId=null;seenEvent=0;talkTarget=null;stopInput();
  $('game').inert=$('hud').inert=true;$('connection-status').classList.add('hidden');$('title-screen').classList.add('hidden');
  clearTimeout(toast.timer);$('toast').classList.remove('visible');$('toast').textContent='';
  for(const n of playerNodes.values()){scene.remove(n.group);playerCache.set(n.p.character,n);}for(const [id,n] of humanNodes){scene.remove(n.group);humanCache.set(id,n);}playerNodes.clear();humanNodes.clear();clearActionEffects();
  for(const id of ['lobby','hud','ending','dialog','instructions','transformation'])$(id).classList.add('hidden');$('menu').classList.remove('hidden');$('characters').querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
}
$('connection-leave').onclick=leave;
$('leave').onclick=leave;$('ending-leave').onclick=leave;
$('copy-invite').onclick=async()=>{if(!state)return;const invite=new URL('/',location.href);invite.searchParams.set('room',state.code);try{await navigator.clipboard.writeText(invite.href);toast('Invitation copied. Friends can choose a different yokai and join your room.');}catch{toast(`Room ${state.code} · Share this page address with your friends.`);}};
$('copy-code').onclick=async()=>{try{await navigator.clipboard.writeText(state.code);toast('Room code copied.');}catch{toast(`Room code: ${state.code}`);}};
let helpFromMenu=false;
$('menu-rules').onclick=()=>{helpFromMenu=true;$('menu').inert=true;$('instructions').classList.remove('hidden');$('help-close').focus();};
$('help').onclick=()=>{shell.open();$('instructions').classList.remove('hidden');$('game-menu').inert=true;$('help-close').focus();};$('help-close').onclick=()=>{$('instructions').classList.add('hidden');$('game-menu').inert=false;if(helpFromMenu){helpFromMenu=false;$('menu').inert=false;$('menu-rules').focus();return;}if(shell.visible)$('menu-help').focus();else canvas.focus();};
$('dialog-close').onclick=()=>{$('dialog').classList.add('hidden');canvas.focus();};
$('dialog-charm').onclick=()=>{act('charm',talkTarget);$('dialog').classList.add('hidden');canvas.focus();};
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('visible'),4000);}
function act(action,target,source='click'){
  if(state?.phase!=='playing'||state.paused||stallUI.visible||shell?.visible||!$('instructions').classList.contains('hidden'))return;
  if(!transport.connected){toast('Please reconnect to the game.');return;}
  if(action==='strike')nextStrikeAt=performance.now()+700;
  canvas.dataset.lastInput=JSON.stringify({action,source,at:Date.now()});
  for(const button of document.querySelectorAll(`[data-action="${action}"]`)){button.classList.remove('pressed');void button.offsetWidth;button.classList.add('pressed');setTimeout(()=>button.classList.remove('pressed'),220);}
  if(action==='interact'&&!$('dialog').classList.contains('hidden')){$('dialog').classList.add('hidden');canvas.focus();return;}
  if(action==='charm'&&!$('dialog').classList.contains('hidden'))target??=talkTarget;
  if(action==='share'||action==='handoff')target??=shell.assistTarget||undefined;
  send({type:'action',action,target});if(action==='charm')$('dialog').classList.add('hidden');canvas.focus({preventScroll:true});
}
function updateState(){
  const p=state.players[myId];if(!p)return;
  for(const b of document.querySelectorAll('[data-action="interact"],[data-action="drink"],[data-action="charm"]'))b.disabled=p.health<=0;
  encounterView.sync(state,myId);
  stallUI.sync(state.phase==='playing'?p.mini:null,state.tick,p);
  perks.textContent=`Festival stamps ${p.stamps?.length||0}/6${p.ward>0?` · Disguise ward ${Math.ceil(p.ward)}s`:''}${p.speedBoost>0?` · Swift steps ${Math.ceil(p.speedBoost)}s`:''}`;
  canvas.dataset.player=JSON.stringify(p);
  canvas.dataset.airborne=String(p.height>0);
  canvas.dataset.world=JSON.stringify({phase:state.phase,code:state.code,players:state.players,humans:state.humans,potions:state.potions,encounter:state.encounter});
  const playing=!['lobby','countdown','disguising'].includes(state.phase);$('title-screen').classList.add('hidden');$('menu').classList.add('hidden');$('lobby').classList.toggle('hidden',playing||state.phase==='disguising');$('hud').classList.toggle('hidden',!playing);
  if(['lobby','countdown'].includes(state.phase)){
    $('copy-code').textContent=state.code;$('party').replaceChildren();
    for(const member of Object.values(state.players)){
      const row=document.createElement('div');row.className='party-member';const pic=document.createElement('canvas');pic.width=64;pic.height=72;pic.getContext('2d').drawImage(textures.get(member.character).frames[0],0,0,64,72);
      const name=document.createElement('span');name.textContent=member.name;const badge=document.createElement('span');badge.className=`member-state${member.ready?' ready':''}`;badge.textContent=!member.connected?'Reconnecting…':member.id===state.host?'Host':member.ready?'Ready':'Not ready';row.append(pic,name,badge);$('party').append(row);
    }
    const locked=state.phase==='countdown',crew=Object.values(state.players);$('start').disabled=locked||state.host!==myId||crew.some(a=>!a.connected||a.id!==myId&&!a.ready);$('start').textContent=locked?`Starting in ${Math.max(1,Math.ceil(state.countdown))}…`:'Enter the festival';$('ready').classList.toggle('hidden',state.host===myId);$('ready').disabled=locked;$('ready').textContent=p.ready?'Ready ✓ · Cancel':'Ready up';$('ready').setAttribute('aria-pressed',String(p.ready));$('lobby-hint').textContent=state.host===myId?crew.length===1?'Invite 1–3 friends, or start solo to practice.':'Everyone ready? Start a new night with your crew.':'Ready up, then wait for your host to start.';
  }
  $('hud-code').textContent=state.code;$('lobby-phone').href='/phone-lab.html?room='+encodeURIComponent(state.code);$('player-name').textContent=p.name;
  $('energy-value').textContent=Math.ceil(p.energy);$('energy-fill').style.width=`${p.energy}%`;$('energy-fill').style.background=p.energy<20?'#c77474':'#a6bd84';
  $('bottles').textContent=`Potions: ${p.bottles}`;
  const following=state.humans.filter(h=>h.owner===myId);$('followers').textContent=following.length?`Following: ${following.map(h=>`${h.name} ${Math.ceil(h.charm)}s`).join(' · ')}`:'F: 5-second charm · Guests wait when it ends';
  const best=Math.max(...Object.values(state.players).map(p=>p.delivered));$('score').textContent=`${best} / 3`;
  const seconds=Math.ceil(state.time);$('time').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  $('team').replaceChildren();for(const member of Object.values(state.players)){const span=document.createElement('span');span.textContent=`${member.name} ${member.connected?(disguiseState(member,state.tick).revealed?'! ':''):'↻ '}${member.delivered}/3 · ${Math.ceil(member.energy)}✦`;span.title=`${member.name}: ${member.bottles} potion${member.bottles===1?'':'s'}${member.connected?'':' · Reconnecting'}`;span.style.color='#6e6253';span.style.borderBottom=`2px solid ${CHARACTERS.find(c=>c.id===member.character).color}`;$('team').append(span);}
  for(const button of document.querySelectorAll('[data-action="cover"]')){button.disabled=p.health<=0||p.coverCooldown>0;const label=button.querySelector('.cover-label')||button;label.textContent=p.coverCooldown>0?`${Math.ceil(p.coverCooldown)}s`:(button.id==='cover-touch'?'Ward':'Ward / hide');}
  for(const button of document.querySelectorAll('[data-action="jump"]'))button.disabled=p.health<=0||p.jumpCooldown>0||p.height>0||['arrive','drink','charm'].includes(p.action);
  $('portrait').getContext('2d').clearRect(0,0,80,100);$('portrait').getContext('2d').drawImage(textures.get(p.character).frames[0],0,0,80,100);
  for(const member of Object.values(state.players)){const n=playerNodes.get(member.id)||makePlayer(member);n.p=member;}
  for(const [id,n]of playerNodes)if(!state.players[id]){scene.remove(n.group);playerCache.set(n.p.character,n);playerNodes.delete(id);}
  state.humans.forEach((h,i)=>{const n=humanNodes.get(h.id)||makeHuman(h,i);n.h=h;});
  for(const potion of state.potions)potionNodes.get(potion.id).visible=potion.available;
  for(const event of state.events){
    if(event.id<=seenEvent)continue;seenEvent=Math.max(seenEvent,event.id);if(event.fx){if(!encounterView.event(event))spawnActionEffect(event);if(['bolt','blocked','hit','bossDown','omen'].includes(event.fx))tone(event.fx==='hit'?180:event.fx==='omen'?110:event.fx==='bossDown'?880:620);}if(event.player&&event.player!==myId)continue;
    if(event.type==='talk'){
      const human=state.humans.find(h=>h.id===event.target)||state.humans.filter(h=>distance(p,h)<2.6).sort((a,b)=>distance(p,a)-distance(p,b))[0];talkTarget=human?.id;
      $('dialog-name').textContent=human?.name||'Festival guest';$('dialog-text').textContent=event.text.split(': ')[1]||event.text;$('dialog').classList.remove('hidden');keys.clear();clickGoal=null;
    }else if(event.text&&!event.text.startsWith('Press F to ')){if(state.encounter&&state.encounter.phase!=='quiet')encounterView.announce(event.text);else toast(event.text);if(['potion','charm','delivered'].includes(event.type))tone(event.type==='charm'?440:660);}
  }
  if(state.phase!==lastPhase){
    if(state.phase==='lobby')(state.host===myId?($('start').disabled?$('copy-code'):$('start')):$('ready')).focus({preventScroll:true});
    $('ending').classList.toggle('hidden',!['won','lost'].includes(state.phase));
    if(state.phase==='disguising'){stopInput();clearActionEffects();transformation.start([...playerNodes.values()]);}
    if(lastPhase==='disguising'&&state.phase!=='disguising')transformation.clear();
    if(state.phase==='playing'){for(const n of playerNodes.values())n.group.position.set(n.p.x,groundHeight(n.p.x,n.p.z),n.p.z);for(const n of humanNodes.values())n.group.position.set(n.h.x,groundHeight(n.h.x,n.h.z),n.h.z);clearActionEffects();$('instructions').classList.add('hidden');$('dialog').classList.add('hidden');canvas.focus();toast(state.mode==='boss'?'Boss practice · C Ward · E Seals · J Spirit bolt · Space Dodge':practice?'Solo practice · Approach a human. Press E to talk and F to charm.':'Stay human. Cover your crew, and charm guests in 5-second steps.');}
    if(state.phase==='won'||state.phase==='lost'){
      $('instructions').classList.add('hidden');$('dialog').classList.add('hidden');
      const won=state.phase==='won';$('ending-label').textContent=won?'First night complete':'There is always another night';$('ending-title').textContent=won?'The Spirit Gate is open!':'The fireworks have ended';
      $('ending-text').textContent=won?`${state.players[state.winner]?.name||state.winnerName||'Your crew'} brought 3 humans to the shrine. Everyone can return home!`:(state.lossReason||'Find potions together, shield your crew and escort three humans.');$('restart').disabled=state.host!==myId;keys.clear();clickGoal=null;(state.host===myId?$('restart'):$('ending-leave')).focus();
    }
    lastPhase=state.phase;
  }
  shell.sync(state,myId);
  $('game').inert=$('hud').inert=state.phase!=='playing'||shell.visible||!!p.mini||!$('connection-status').classList.contains('hidden');
  drawMap();
}
function drawMap(){
  const c=$('minimap'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#cad0ad';ctx.fillRect(0,0,c.width,c.height);
  const x=v=>12+(v+21)/42*136,z=v=>8+(v+36)/57*164;
  ctx.fillStyle='#e7d6ae';ctx.fillRect(x(-3.6),8,x(3.6)-x(-3.6),164);
  ctx.fillStyle='#8b7064';for(const s of STALLS)ctx.fillRect(x(s.x-s.w/2),z(s.z-s.d/2),s.w/42*136,s.d/57*164);
  ctx.fillStyle='#8971a8';ctx.fillRect(x(-2),z(-31),14,7);
  for(const h of state.humans){if(h.state==='delivered')continue;ctx.fillStyle=h.owner?'#9b6dad':h.state==='waiting'?'#d79b46':'#f6eee1';ctx.beginPath();ctx.arc(x(h.x),z(h.z),2.5,0,7);ctx.fill();}
  for(const potion of state.potions)if(potion.available){ctx.fillStyle='#81749a';ctx.fillRect(x(potion.x)-1,z(potion.z)-1,2,2);}
  const encounter=state.encounter;if(encounter&&['omen','assault','exposed'].includes(encounter.phase)){ctx.fillStyle='#673d85';ctx.beginPath();ctx.arc(x(encounter.x),z(encounter.z),6,0,7);ctx.fill();for(const seal of encounter.seals)if(!seal.broken){ctx.fillStyle='#e9b75f';ctx.fillRect(x(seal.x)-2,z(seal.z)-2,4,4);}}
  for(const p of Object.values(state.players)){if(p.pingAt&&p.pingUntil>state.tick){ctx.strokeStyle='#f5bb43';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x(p.pingAt.x),z(p.pingAt.z),8+Math.sin(state.tick*6)*2,0,7);ctx.stroke();}ctx.fillStyle=p.id===myId?'#ac5443':'#426f89';ctx.strokeStyle='#fff4d9';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x(p.x),z(p.z),4,0,7);ctx.fill();ctx.stroke();}
}
document.addEventListener('keydown',e=>{
  if(stallUI.key(e))return;
  const focused=document.activeElement;
  if(e.key==='Tab'&&!$('instructions').classList.contains('hidden')){const controls=[$('help-close')];e.preventDefault();controls[0].focus();return;}
  if(state?.phase!=='playing')return;
  const intent=keyIntent(e);if(!intent)return;
  if(intent==='close'){e.preventDefault();if(e.repeat)return;if(mouseLook||document.pointerLockElement===canvas){mouseLook=false;lookButton.textContent='Mouse look';if(document.pointerLockElement===canvas)document.exitPointerLock();return;}if(!$('instructions').classList.contains('hidden')){$('help-close').click();}else if(!$('dialog').classList.contains('hidden')){$('dialog-close').click();}else shell.escape();return;}
  if(['INPUT','TEXTAREA','SELECT'].includes(focused?.tagName)||focused?.isContentEditable||shell.visible)return;
  e.preventDefault();if(e.repeat)return;
  if(!$('instructions').classList.contains('hidden'))return;
  if(MOVEMENT.has(intent)){keys.add(intent);clickGoal=null;}else {if(intent==='strike')strikeHeld=true;act(intent,undefined,'keyboard');}
},true);
document.addEventListener('keyup',e=>{const intent=keyIntent({code:e.code,key:e.key});keys.delete(intent);if(intent==='strike')strikeHeld=false;},true);
function stopInput(){strikeHeld=false;keys.clear();joystick={x:0,z:0};clickGoal=null;clickPath=[];mouseLook=false;lookButton.textContent='Mouse look';if($('stick'))$('stick').style.transform='';send({type:'input',dx:0,dz:0});if(document.pointerLockElement===canvas)document.exitPointerLock();}
window.addEventListener('blur',stopInput);window.addEventListener('orientationchange',stopInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopInput();});
for(const b of document.querySelectorAll('[data-action]')){
  let touchAt=-Infinity;
  b.addEventListener('pointerdown',e=>{if(b.disabled||e.pointerType!=='touch'&&b.dataset.action!=='strike')return;e.preventDefault();touchAt=performance.now();if(b.dataset.action==='strike'){strikeHeld=true;b.setPointerCapture(e.pointerId);}act(b.dataset.action);});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,()=>{if(b.dataset.action==='strike'){strikeHeld=false;touchAt=performance.now();}});
  b.onclick=()=>{if(performance.now()-touchAt>500)act(b.dataset.action);};
}
const joy=$('joystick'),stick=$('stick');
bindJoystick(joy,stick,v=>joystick=v,()=>{clickGoal=null;clickPath=[];});
const raycaster=new THREE.Raycaster();
let orbitAt=null;const touchPointers=new Map();let pinchDistance=0;
const cameraInputEnabled=()=>state?.phase==='playing'&&!state.paused&&!stallUI.visible&&!shell?.visible&&$('instructions').classList.contains('hidden')&&$('dialog').classList.contains('hidden');
function pointNavigation(x,y){raycaster.setFromCamera(new THREE.Vector2(x/innerWidth*2-1,-y/innerHeight*2+1),camera);const hit=raycaster.intersectObject(festival.ground,false)[0];if(hit)navigateTo({x:hit.point.x,z:hit.point.z});}
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{
  if(!cameraInputEnabled())return;canvas.focus();
  if(mouseLook)return;
  if(e.pointerType==='touch'){touchPointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false});canvas.setPointerCapture(e.pointerId);pinchDistance=0;return;}
  if((e.button===2||e.button===0)&&document.pointerLockElement!==canvas){orbitAt={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,tap:e.button===0,moved:false};canvas.setPointerCapture(e.pointerId);return;}
});
canvas.addEventListener('pointermove',e=>{
  if(!cameraInputEnabled())return;
  if(document.pointerLockElement===canvas||mouseLook){freeCamera.drag(e.movementX,e.movementY);return;}
  const touch=touchPointers.get(e.pointerId);
  if(touch){
    const dx=e.clientX-touch.x,dy=e.clientY-touch.y;touch.x=e.clientX;touch.y=e.clientY;touch.moved||=Math.hypot(touch.x-touch.startX,touch.y-touch.startY)>8;
    if(touchPointers.size===2){const [a,b]=[...touchPointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance)freeCamera.zoom((pinchDistance-d)*3);pinchDistance=d;for(const t of touchPointers.values())t.moved=true;}
    else freeCamera.drag(dx,dy);return;
  }
  if(orbitAt?.id===e.pointerId){orbitAt.moved||=Math.hypot(e.clientX-orbitAt.startX,e.clientY-orbitAt.startY)>6;if(!orbitAt.tap||orbitAt.moved)freeCamera.drag(e.clientX-orbitAt.x,e.clientY-orbitAt.y);orbitAt.x=e.clientX;orbitAt.y=e.clientY;}
});
function endCameraPointer(e){const t=touchPointers.get(e.pointerId);if(t&&!t.moved&&cameraInputEnabled()&&e.type!=='pointercancel')pointNavigation(e.clientX,e.clientY);touchPointers.delete(e.pointerId);pinchDistance=0;if(orbitAt?.id===e.pointerId){if(orbitAt.tap&&!orbitAt.moved&&cameraInputEnabled()&&e.type!=='pointercancel')pointNavigation(e.clientX,e.clientY);orbitAt=null;}}
canvas.addEventListener('pointerup',endCameraPointer);canvas.addEventListener('pointercancel',endCameraPointer);canvas.addEventListener('lostpointercapture',e=>{touchPointers.delete(e.pointerId);if(orbitAt?.id===e.pointerId)orbitAt=null;});
canvas.addEventListener('wheel',e=>{if(!cameraInputEnabled())return;e.preventDefault();freeCamera.zoom(e.deltaY);},{passive:false});
let stuckTime=0,lastPosition=null;
setInterval(()=>{
  if(state?.phase!=='playing')return;const p=state.players[myId];if(!p)return;
  if(strikeHeld&&performance.now()>=nextStrikeAt&&!document.querySelector('.touch-actions [data-action="strike"]').disabled)act('strike',undefined,'held');
  let dx=(keys.has('right')?1:0)-(keys.has('left')?1:0)+joystick.x;
  let dz=(keys.has('down')?1:0)-(keys.has('up')?1:0)+joystick.z;
  ({dx,dz}=viewMovement(dx,dz,freeCamera.smoothYaw));
  if(clickGoal&&dx===0&&dz===0){while(clickPath.length&&distance(p,clickPath[0])<.3)clickPath.shift();const goal=clickPath[0]||clickGoal,d=distance(p,goal);if(d<.3){clickGoal=null;}else{dx=(goal.x-p.x)/d;dz=(goal.z-p.z)/d;stuckTime=['arrive','drink','charm'].includes(p.action)?0:lastPosition&&distance(p,lastPosition)<.005?stuckTime+.05:0;if(stuckTime>1){clickGoal=null;clickPath=[];}}}
  lastPosition={x:p.x,z:p.z};
  if(state.paused||shell.visible||!transport.connected||stallUI.visible||!$('instructions').classList.contains('hidden')||!$('dialog').classList.contains('hidden'))dx=dz=0;
  send({type:'input',dx,dz});
},50);
$('sound').onclick=()=>{sound=!sound;$('sound').classList.toggle('active',sound);$('sound').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on');settings.sound=sound;save();shell?.refreshSettings();if(sound)tone(660);};
function tone(freq){if(!sound)return;audio||=new AudioContext();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*1.5,audio.currentTime+.2);g.gain.setValueAtTime(.08,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.35);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.35);}
function navigateTo(goal){const p=state?.players[myId];if(!p||!walkable(goal.x,goal.z))return;const path=findPath(p,goal);if(!path.length){toast('Choose a clear spot on the festival path.');return;}keys.clear();joystick={x:0,z:0};clickGoal=goal;clickPath=path;stuckTime=0;}
function applySettings(){sound=settings.sound;qualityMode=settings.quality;profile=qualityMode==='auto'?initialProfile(innerWidth,navigator.hardwareConcurrency||4,touchMode):qualityMode;cameraStyle=settings.camera;freeCamera.reset(cameraStyle==='wide');cameraButton.textContent=cameraStyle==='close'?'View · Close':'View · Wide';$('sound').classList.toggle('active',sound);$('sound').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on');applyQuality();}
shell=createFoundationUI({send,stop:stopInput,focusWorld:()=>canvas.focus({preventScroll:true}),leave,toast,storage:localStore,settings,save,applySettings,navigate:navigateTo});applySettings();transport.resume();
const actionEffects=[],jumpProbe={count:0,peak:0,renderPeak:0};
const sparkGeometry=new THREE.OctahedronGeometry(.065),waveGeometry=new THREE.TorusGeometry(1,.025,8,48);
function spawnActionEffect(event){
  const actor=state.players[event.actor];if(!actor)return;
  if(event.fx==='jump'&&actor.id===myId){jumpProbe.count++;jumpProbe.peak=0;jumpProbe.renderPeak=0;}
  const color=['charm','drink'].includes(event.fx)?POTION_COLORS[actor.character]:event.fx==='cover'?'#9ee1e3':'#f5d599';
  const group=new THREE.Group();group.name=`effect-${event.fx}`;scene.add(group);
  const glow=new THREE.MeshBasicMaterial({color,transparent:true,opacity:1,depthWrite:false});
  const rings=[];for(let i=0;i<3;i++){const r=new THREE.Mesh(waveGeometry,glow);r.rotation.x=-Math.PI/2;rings.push(r);group.add(r);}
  const sparks=[];for(let i=0;i<28;i++){const spark=new THREE.Mesh(sparkGeometry,glow);group.add(spark);sparks.push(spark);}
  const light=new THREE.PointLight(color,5,4,2);group.add(light);
  let target=state.humans.find(h=>h.id===event.target),origin=event.at||actor;
  const label=planeText(event.fx==='drink'?'+ Spirit':event.fx==='charm'?'✦ Charmed ✦':event.fx==='pickup'?'+ Potion':event.fx==='reward'?'✦ Prize won':event.fx==='ping'?'Help needed!':event.fx==='reveal'?'Disguise slipping!':'Hide teammates','#ffffff',event.fx==='charm'?'#9978b7':'#89a084',192);label.scale.set(1.6,.5,1);group.add(label);label.visible=!['jump','land'].includes(event.fx);
  actionEffects.push({group,glow,rings,sparks,light,label,kind:event.fx,actor:event.actor,target:event.target,origin:{x:origin.x,z:origin.z},destination:target?{x:target.x,z:target.z}:null,age:0,duration:event.fx==='ping'?3:event.fx==='cover'?2.2:['jump','land'].includes(event.fx)?.5:1.8});
}
function clearActionEffects(){for(const f of actionEffects){scene.remove(f.group);f.glow.dispose();f.label.material.map.dispose();f.label.material.dispose();}actionEffects.length=0;}
function updateActionEffects(dt){
  for(let j=actionEffects.length-1;j>=0;j--){
    const f=actionEffects[j];f.age+=dt;const t=f.age/f.duration,p=state?.players[f.actor];
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
    if(t>=1){scene.remove(f.group);f.glow.dispose();f.label.material.map.dispose();f.label.material.dispose();actionEffects.splice(j,1);}
  }
  if(frames%6===0)canvas.dataset.visuals=JSON.stringify({avatars:[...playerNodes.values()].map(n=>({id:n.p.id,character:n.p.character,volumetric:n.rig.root.userData.volumetric,height:n.rig.root.position.y,yaw:n.rig.root.rotation.y,legAngles:n.rig.legs.map(l=>l.rotation.x),armAngles:n.rig.arms.map(a=>a.rotation.x),waist:n.rig.waist.rotation.toArray().slice(0,3),speed:n.rig.speed,phase:n.rig.gaitPhase,motionVersion:n.rig.root.userData.motionVersion,appearance:n.rig.root.userData.appearance,revealed:n.rig.root.userData.revealed,action:n.p.action})),humans:[...humanNodes.values()].map(n=>({id:n.h.id,human:n.rig.root.userData.human})),graphics:{bloom:true,drawCalls:renderer.info.render.calls},effects:actionEffects.map(f=>({kind:f.kind,age:f.age}))});
}
const fireworkNodes=[];let nextFirework=1;
function firework(time){
  const center=new THREE.Vector3(Math.sin(time*2)*19,12.5+Math.sin(time)*1.7,-44),positions=[],velocities=[];
  for(let i=0;i<170;i++){const a=i*2.39996,y=1-2*i/170,r=Math.sqrt(1-y*y);positions.push(center.x,center.y,center.z);velocities.push(Math.cos(a)*r*5,y*5,Math.sin(a)*r*5);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const color=new THREE.Color(['#ffc67b','#dd9bff','#79e2d9','#ff87a6'][Math.floor(time)%4]).multiplyScalar(3);
  const node=new THREE.Points(geo,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{color:{value:color},opacity:{value:1}},vertexShader:'void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(220./-p.z,2.,9.);gl_Position=projectionMatrix*p;}',fragmentShader:'uniform vec3 color;uniform float opacity;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(color,pow(1.-d,2.)*opacity);}'}));scene.add(node);fireworkNodes.push({node,velocities,age:0});
}
function resize(){renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}resize();window.addEventListener('resize',resize);
const clock=new THREE.Clock();let elapsed=0,frames=0;
function animate(){
  requestAnimationFrame(animate);if(document.hidden){clock.getDelta();return;}const realDt=clock.getDelta(),dt=Math.min(realDt,.1);elapsed+=dt;frames++;
  const alpha=1-Math.exp(-dt*13);
  const disguising=state?.phase==='disguising';
  const introProgress=disguising?THREE.MathUtils.clamp(1-((state.introRemaining||0)-(performance.now()-stateReceivedAt)/1000)/DISGUISE.intro,0,1):1;
  for(const n of playerNodes.values()){
    const p=n.p;n.label.visible=!disguising&&p.id!==myId;n.label.position.y=3.45+(p.height||0)*.5;
    if(!disguising)n.group.position.lerp(new THREE.Vector3(p.x,groundHeight(p.x,p.z),p.z),alpha);
    animateAvatar(n.rig,p,dt,elapsed,state?.tick||0,disguising?{x:0,z:0}:n.group.position,{form:disguising?'transform':'human',progress:introProgress});
    if(p.id===myId){jumpProbe.peak=Math.max(jumpProbe.peak,p.height||0);jumpProbe.renderPeak=Math.max(jumpProbe.renderPeak,n.rig.root.position.y);canvas.dataset.jump=JSON.stringify(jumpProbe);}
    n.aura.visible=!disguising&&(p.cover>0||p.action==='charm'||disguiseState(p,state?.tick||0).concealed);n.aura.material.color.set(p.cover>0?'#9bd6d7':'#c4a4ed');n.aura.scale.setScalar(p.cover>0?2.4:1.4+Math.sin(elapsed*8)*.2);
  }
  for(const n of humanNodes.values()){
    const h=n.h,me=state?.players?.[myId];n.label.visible=!!me&&Math.hypot(h.x-me.x,h.z-me.z)<4;n.group.visible=h.state!=='delivered'&&(!me||distance(me,h)<PROFILES[profile].actorRange);n.group.position.lerp(new THREE.Vector3(h.x,groundHeight(h.x,h.z),h.z),alpha);if(n.group.visible)animateVisitor(n.rig,h,dt,elapsed,n.group.position);n.heart.visible=!!h.owner||h.state==='waiting'&&me&&distance(me,h)<7;n.heart.position.y=2.75+Math.sin(elapsed*3)*.06;
    const text=h.owner?`${Math.ceil(h.charm)}s`:'F';if(n.heart.userData.text!==text){const c=n.heart.material.map.image,ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle=h.owner?'#9e77bd':'#c39250';ctx.beginPath();ctx.roundRect(3,3,c.width-6,c.height-6,16);ctx.fill();ctx.fillStyle='#fff5dd';ctx.font='bold 38px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,c.width/2,c.height/2);n.heart.material.map.needsUpdate=true;n.heart.userData.text=text;}
  }
  const threat=state?.encounter,threatFocus=threat&&['omen','assault','exposed'].includes(threat.phase)?new THREE.Vector3(threat.x,groundHeight(threat.x,threat.z)+3.2,threat.z):null;
  festival.update(elapsed,camera,playerNodes.get(myId)?.group.position,threatFocus);
  const darken=threatFocus?.86:1;warmFill.intensity=THREE.MathUtils.lerp(warmFill.intensity,.65*darken,.03);
  stallUI.frame();
  const local=playerNodes.get(myId);
  moonLight.position.x=(local?.group.position.x||0)-12;moonLight.position.z=(local?.group.position.z||0)+8;moonLight.target.position.copy(local?.group.position||new THREE.Vector3());moonLight.target.updateMatrixWorld();
  freeCamera.focusLift=THREE.MathUtils.lerp(freeCamera.focusLift,threatFocus?1.6:0,1-Math.exp(-dt*2.5));
  if(local){const probe=freeCamera.update(local.group.position,dt);if(frames%6===0){canvas.dataset.camera=JSON.stringify({...probe,position:camera.position.toArray(),locked:document.pointerLockElement===canvas,mouseLook});canvas.dataset.models=JSON.stringify({loaded:[...modelReport.loaded],failed:[...modelReport.failed],players:[...playerNodes.values()].map(n=>({character:n.p.character,asset:n.rig.root.userData.modelAsset,status:n.rig.root.userData.modelStatus}))});}}
  encounterView.update(state,myId,elapsed,(state?.tick||0)+(state?.paused?0:Math.min(.2,(performance.now()-stateReceivedAt)/1000)));
  if(local&&encounterView.shake>0&&!matchMedia('(prefers-reduced-motion: reduce)').matches){camera.position.x+=Math.sin(elapsed*49)*encounterView.shake*.065;camera.position.y+=Math.cos(elapsed*41)*encounterView.shake*.04;}
  if(state?.phase==='playing'){
    const p=state.players[myId],nearPotion=state.potions.find(o=>o.available&&distance(p,o)<2),nearHuman=state.humans.filter(h=>h.state!=='delivered'&&distance(p,h)<2.5).sort((a,b)=>distance(p,a)-distance(p,b))[0];
    const shop=nearbyStall(p),cooldown=shop?Math.max(0,(p.stallCooldowns[shop.id]||0)-state.tick):0;
    const prompt=encounterView.prompt(state,p)||(shop?`${shop.name} · ${cooldown>0?`Try again in ${Math.ceil(cooldown)}s`:'E · Play'}`:nearPotion?'E · Pick up potion':nearHuman?`${nearHuman.name} · ${nearHuman.state==='waiting'?'F Charm again':nearHuman.owner?`Following ${Math.ceil(nearHuman.charm)}s`:'E Talk / F Charm 5s'}`:distance(p,WORLD.gate)<4?'Shrine · Wait for your followers to arrive':'');
    $('interaction').textContent=prompt;$('interaction').classList.toggle('hidden',stallUI.visible||!prompt||!$('dialog').classList.contains('hidden'));
  }
  if(state?.phase==='playing'){
    const p=state.players[myId],d=disguiseState(p,state.tick);$('disguise-status').textContent=d.revealed?`${d.part} showing · ${Math.ceil(d.remaining)}s · Ask for Cover`:d.concealed?(p.ward>0?`Disguise ward · ${Math.ceil(p.ward)}s`:'Features hidden · Teammate Cover'):`Human disguise · Slip in ${Math.ceil(d.next)}s`;$('disguise-status').classList.toggle('revealed',d.revealed);
  }
  if(elapsed>nextFirework){firework(elapsed);nextFirework=elapsed+2.8;}
  for(let i=fireworkNodes.length-1;i>=0;i--){const f=fireworkNodes[i];f.age+=dt;const a=f.node.geometry.attributes.position;for(let k=0;k<a.count;k++){a.setXYZ(k,a.getX(k)+f.velocities[k*3]*dt,a.getY(k)+(f.velocities[k*3+1]-f.age*1.6)*dt,a.getZ(k)+f.velocities[k*3+2]*dt);}a.needsUpdate=true;f.node.material.uniforms.opacity.value=Math.max(0,1-f.age/2.8);if(f.age>2.8){scene.remove(f.node);f.node.geometry.dispose();f.node.material.dispose();fireworkNodes.splice(i,1);}}
  updateActionEffects(dt);
  if(!document.hidden&&realDt<1){sampleTime+=realDt;sampleFrames++;}if(sampleTime>2){measuredFps=sampleFrames/sampleTime;transport.ping();canvas.dataset.performance=JSON.stringify({fps:Math.round(measuredFps),profile,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,cachedActors:playerCache.size+humanCache.size});if(qualityMode==='auto'&&local&&!document.hidden){slowSeconds=measuredFps<27?slowSeconds+sampleTime:Math.max(0,slowSeconds-1);if(slowSeconds>8&&profile!=='light'){profile=slowerProfile(profile);slowSeconds=0;applyQuality();}}sampleTime=0;sampleFrames=0;}
  if(!stallUI.visible&&state&&!['lobby','countdown'].includes(state.phase)&&!document.hidden){renderer.info.reset();if(disguising)transformation.render(introProgress,elapsed);else if(PROFILES[profile].post)composer.render();else renderer.render(scene,camera);}
}
window.__YOKAI_GAME__={getState:()=>state,getPlayer:()=>state?.players[myId],getMetrics:()=>({frames,objects:scene.children.length,players:playerNodes.size,humans:humanNodes.size,drawCalls:renderer.info.render.calls})};
installPlaytest({canvas,onStop:stopInput,getMetrics:()=>({fps:state?.phase==='playing'?Math.round(measuredFps):null,profile,connection:connectionState,rtt:transport.rtt,phase:state?.phase||'title',encounter:state?.encounter?{phase:state.encounter.phase,hp:state.encounter.hp,wave:state.encounter.wave,banished:state.encounter.banished}:null,room:state?.code||null,player:state?.players[myId]?{x:state.players[myId].x,z:state.players[myId].z,energy:state.players[myId].energy,bottles:state.players[myId].bottles,action:state.players[myId].action,health:state.players[myId].health,combat:state.players[myId].combatStats,jumps:jumpProbe.count}:null,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,modelsLoaded:modelReport.loaded.size,modelsFailed:modelReport.failed.size})});
animate();
