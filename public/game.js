import * as THREE from 'three';
import {CHARACTERS, distance, groundHeight,findPath,walkable} from '/shared/world.mjs';
import {createStallUI} from '/stall-ui.mjs';
import {createPlayerAvatar,animatePlayerAvatar} from '/disguise.mjs';
import {DISGUISE,disguiseState} from '/shared/disguise.mjs';
import {createTransformation} from '/transformation.mjs';
import {keyIntent,MOVEMENT,viewMovement} from '/controls.mjs';
import {buildFestival} from '/festival.mjs';
import {createConnection} from '/connection.mjs';
import {createFoundationUI} from '/foundation-ui.mjs';
import {loadSettings,saveSettings} from '/profile.mjs';
import {FestivalCamera} from '/free-camera.mjs';
import {modelReport} from '/model-assets.mjs';
import {installPlaytest} from '/playtest-client.mjs';
import {bindJoystick} from '/touch-controls.mjs';
import {createEncounterView} from '/encounter-view.mjs';
// Remaster runtime modules (R01). game.js wires them together; look, sound, VFX and characters live in their own folders.
import {createRenderPipeline,WebGLUnavailableError} from '/render/pipeline.mjs';
import {createQualityControl} from '/render/quality.mjs';
import {createCameraControls} from '/render/camera-controls.mjs';
import {drawMinimap} from '/render/minimap.mjs';
import {createAudioEngine} from '/audio/engine.mjs';
import {createEventBus,createGameEvents} from '/events.mjs';
import {createFx} from '/fx/index.mjs';
import {createTimeScale} from '/time-scale.mjs';
import {createActors} from '/characters/actors.mjs';
import {loadPortraits} from '/characters/portraits.mjs';
import {createRigFactory,createV2Loader,loadDefs} from '/characters/rig-v2.mjs';
import {installPerfOverlay} from '/perf-overlay.mjs';
import {renderLobby,renderHud,interactionPrompt} from '/hud.mjs';

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
let sound=settings.sound,joystick={x:0,z:0},clickGoal=null,clickPath=[];
const keys=new Set(), potionNodes=new Map(), textures=new Map();
const canvas=$('scene'), scene=new THREE.Scene();
const stallUI=createStallUI(send,stopInput,()=>canvas.focus({preventScroll:true}),{getSound:()=>sound,getQuality:()=>quality.mode,onSoundChange:enabled=>{sound=enabled;settings.sound=enabled;save();$('sound').classList.toggle('active',sound);$('sound').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on');shell?.refreshSettings();}});
const perks=document.createElement('div');perks.className='festival-perks';$('followers').after(perks);
const camera=new THREE.PerspectiveCamera(55,1,.08,300);
const freeCamera=new FestivalCamera(camera);
camera.position.set(0,14,33); camera.lookAt(0,0,12);
let pipeline;
try { pipeline=createRenderPipeline({canvas,scene,camera}); }
catch(error) { if(!(error instanceof WebGLUnavailableError))throw error; $('loading').textContent='This browser could not open the 3D view. Please use a browser with WebGL support.'; throw Error('WebGL unavailable'); }
const {renderer}=pipeline;
// Gameplay events for VFX and sound. Nothing in game.js depends on subscribers.
const bus=createEventBus(),gameEvents=createGameEvents(bus),audio=createAudioEngine({isEnabled:()=>sound});audio.attach(bus);
const quality=createQualityControl({settings,touchMode,apply:(q,profile)=>{pipeline.applyProfile(q);canvas.dataset.quality=profile;}});
let sampleTime=0,sampleFrames=0,measuredFps=60;
const view=createCameraControls({canvas,camera,freeCamera,settings,onSettingsChange:()=>{save();shell?.refreshSettings();},toast,onPointerLockLost:stopInput,inputEnabled:cameraInputEnabled,getGround:()=>festival.ground,onGroundTap:navigateTo});
view.container.append(quality.button);$('hud').append(view.container);
quality.button.onclick=()=>{quality.cycle();save();shell?.refreshSettings();};quality.apply();
const festival=buildFestival(scene,potionNodes);
const encounterView=createEncounterView(scene,{hud:$('hud'),onAction:action=>act(action)});
const transformation=createTransformation(renderer);
// REMASTER-HOOK hq: hit-stop time scale. Visual only: scales animation/interpolation dt, never server or network time.
const timeScale=createTimeScale();
const fx=createFx({scene,bus,pipeline,timeScale});

const [referenceImages,rigDefs]=await Promise.all([loadPortraits(CHARACTERS),loadDefs()]);
const rigs=createRigFactory({defs:rigDefs,loader:rigDefs.size?createV2Loader(renderer):null,createLegacy:createPlayerAvatar,animateLegacy:animatePlayerAvatar});
const actors=createActors({scene,getMyId:()=>myId,rigs});
const portrait=id=>textures.get(id).frames[0];
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
    if(m.type==='state'){state=m.state;stateReceivedAt=performance.now();updateState();gameEvents.ingest(state,myId);}
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
  actors.stash();fx.clear();gameEvents.reset();
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
  renderLobby(state,myId,portrait);
  renderHud(state,myId,portrait);
  actors.sync(state);
  for(const potion of state.potions)potionNodes.get(potion.id).visible=potion.available;
  for(const event of state.events){
    if(event.id<=seenEvent)continue;seenEvent=Math.max(seenEvent,event.id);if(event.fx){if(!encounterView.event(event))spawnActionEffect(event);if(['bolt','blocked','hit','bossDown','omen'].includes(event.fx))audio.tone(event.fx==='hit'?180:event.fx==='omen'?110:event.fx==='bossDown'?880:620);}if(event.player&&event.player!==myId)continue;
    if(event.type==='talk'){
      const human=state.humans.find(h=>h.id===event.target)||state.humans.filter(h=>distance(p,h)<2.6).sort((a,b)=>distance(p,a)-distance(p,b))[0];talkTarget=human?.id;
      $('dialog-name').textContent=human?.name||'Festival guest';$('dialog-text').textContent=event.text.split(': ')[1]||event.text;$('dialog').classList.remove('hidden');keys.clear();clickGoal=null;
    }else if(event.text&&!event.text.startsWith('Press F to ')){if(state.encounter&&state.encounter.phase!=='quiet')encounterView.announce(event.text);else toast(event.text);if(['potion','charm','delivered'].includes(event.type))audio.tone(event.type==='charm'?440:660);}
  }
  if(state.phase!==lastPhase){
    if(state.phase==='lobby')(state.host===myId?($('start').disabled?$('copy-code'):$('start')):$('ready')).focus({preventScroll:true});
    $('ending').classList.toggle('hidden',!['won','lost'].includes(state.phase));
    if(state.phase==='disguising'){stopInput();fx.clear();transformation.start([...actors.players.values()]);}
    if(lastPhase==='disguising'&&state.phase!=='disguising')transformation.clear();
    if(state.phase==='playing'){actors.snap();fx.clear();$('instructions').classList.add('hidden');$('dialog').classList.add('hidden');canvas.focus();toast(state.mode==='boss'?'Boss practice · C Ward · E Seals · J Spirit bolt · Space Dodge':practice?'Solo practice · Approach a human. Press E to talk and F to charm.':'Stay human. Cover your crew, and charm guests in 5-second steps.');}
    if(state.phase==='won'||state.phase==='lost'){
      $('instructions').classList.add('hidden');$('dialog').classList.add('hidden');
      const won=state.phase==='won';$('ending-label').textContent=won?'First night complete':'There is always another night';$('ending-title').textContent=won?'The Spirit Gate is open!':'The fireworks have ended';
      $('ending-text').textContent=won?`${state.players[state.winner]?.name||state.winnerName||'Your crew'} brought 3 humans to the shrine. Everyone can return home!`:(state.lossReason||'Find potions together, shield your crew and escort three humans.');$('restart').disabled=state.host!==myId;keys.clear();clickGoal=null;(state.host===myId?$('restart'):$('ending-leave')).focus();
    }
    lastPhase=state.phase;
  }
  shell.sync(state,myId);
  $('game').inert=$('hud').inert=state.phase!=='playing'||shell.visible||!!p.mini||!$('connection-status').classList.contains('hidden');
  drawMinimap($('minimap'),state,myId);
}
document.addEventListener('keydown',e=>{
  if(stallUI.key(e))return;
  const focused=document.activeElement;
  if(e.key==='Tab'&&!$('instructions').classList.contains('hidden')){const controls=[$('help-close')];e.preventDefault();controls[0].focus();return;}
  if(state?.phase!=='playing')return;
  const intent=keyIntent(e);if(!intent)return;
  if(intent==='close'){e.preventDefault();if(e.repeat)return;if(view.release())return;if(!$('instructions').classList.contains('hidden')){$('help-close').click();}else if(!$('dialog').classList.contains('hidden')){$('dialog-close').click();}else shell.escape();return;}
  if(['INPUT','TEXTAREA','SELECT'].includes(focused?.tagName)||focused?.isContentEditable||shell.visible)return;
  e.preventDefault();if(e.repeat)return;
  if(!$('instructions').classList.contains('hidden'))return;
  if(MOVEMENT.has(intent)){keys.add(intent);clickGoal=null;}else {if(intent==='strike')strikeHeld=true;act(intent,undefined,'keyboard');}
},true);
document.addEventListener('keyup',e=>{const intent=keyIntent({code:e.code,key:e.key});keys.delete(intent);if(intent==='strike')strikeHeld=false;},true);
function stopInput(){strikeHeld=false;keys.clear();joystick={x:0,z:0};clickGoal=null;clickPath=[];view.resetLook();if($('stick'))$('stick').style.transform='';send({type:'input',dx:0,dz:0});if(document.pointerLockElement===canvas)document.exitPointerLock();}
window.addEventListener('blur',stopInput);window.addEventListener('orientationchange',stopInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopInput();});
for(const b of document.querySelectorAll('[data-action]')){
  let touchAt=-Infinity;
  b.addEventListener('pointerdown',e=>{if(b.disabled||e.pointerType!=='touch'&&b.dataset.action!=='strike')return;e.preventDefault();touchAt=performance.now();if(b.dataset.action==='strike'){strikeHeld=true;b.setPointerCapture(e.pointerId);}act(b.dataset.action);});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,()=>{if(b.dataset.action==='strike'){strikeHeld=false;touchAt=performance.now();}});
  b.onclick=()=>{if(performance.now()-touchAt>500)act(b.dataset.action);};
}
const joy=$('joystick'),stick=$('stick');
bindJoystick(joy,stick,v=>joystick=v,()=>{clickGoal=null;clickPath=[];});
function cameraInputEnabled(){return state?.phase==='playing'&&!state.paused&&!stallUI.visible&&!shell?.visible&&$('instructions').classList.contains('hidden')&&$('dialog').classList.contains('hidden');}
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
$('sound').onclick=()=>{sound=!sound;$('sound').classList.toggle('active',sound);$('sound').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on');settings.sound=sound;save();shell?.refreshSettings();if(sound)audio.tone(660);};
function navigateTo(goal){const p=state?.players[myId];if(!p||!walkable(goal.x,goal.z))return;const path=findPath(p,goal);if(!path.length){toast('Choose a clear spot on the festival path.');return;}keys.clear();joystick={x:0,z:0};clickGoal=goal;clickPath=path;stuckTime=0;}
function applySettings(){sound=settings.sound;view.sync();$('sound').classList.toggle('active',sound);$('sound').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on');quality.sync();}
shell=createFoundationUI({send,stop:stopInput,focusWorld:()=>canvas.focus({preventScroll:true}),leave,toast,storage:localStore,settings,save,applySettings,navigate:navigateTo});applySettings();transport.resume();
const jumpProbe={count:0,peak:0,renderPeak:0};
function spawnActionEffect(event){
  if(!state.players[event.actor])return;
  if(event.fx==='jump'&&event.actor===myId){jumpProbe.count++;jumpProbe.peak=0;jumpProbe.renderPeak=0;}
  fx.spawnAction(event,state);
}
function resize(){pipeline.resize(innerWidth,innerHeight);}resize();window.addEventListener('resize',resize);
const perf=installPerfOverlay({renderer,scene,getProfile:()=>quality.profile});
const clock=new THREE.Clock();let elapsed=0,frames=0;
function animate(){
  requestAnimationFrame(animate);if(document.hidden){clock.getDelta();return;}const realDt=clock.getDelta(),frameDt=Math.min(realDt,.1),dt=timeScale.step(frameDt);elapsed+=dt;frames++; // REMASTER-HOOK hq: dt = animation time (hit-stop scaled); frameDt/realDt = real time
  const alpha=1-Math.exp(-dt*13);
  const disguising=state?.phase==='disguising';
  const introProgress=disguising?THREE.MathUtils.clamp(1-((state.introRemaining||0)-(performance.now()-stateReceivedAt)/1000)/DISGUISE.intro,0,1):1;
  actors.update({state,dt,elapsed,disguising,introProgress,alpha,actorRange:quality.settings.actorRange,onLocalPlayer:(n,p)=>{jumpProbe.peak=Math.max(jumpProbe.peak,p.height||0);jumpProbe.renderPeak=Math.max(jumpProbe.renderPeak,n.rig.root.position.y);canvas.dataset.jump=JSON.stringify(jumpProbe);}});
  const threat=state?.encounter,threatFocus=threat&&['omen','assault','exposed'].includes(threat.phase)?new THREE.Vector3(threat.x,groundHeight(threat.x,threat.z)+3.2,threat.z):null;
  festival.update(elapsed,camera,actors.players.get(myId)?.group.position,threatFocus);
  const local=actors.players.get(myId);
  pipeline.update({dt,elapsed,focus:local?.group.position||null,threat:threatFocus});
  stallUI.frame();
  freeCamera.focusLift=THREE.MathUtils.lerp(freeCamera.focusLift,threatFocus?1.6:0,1-Math.exp(-dt*2.5));
  if(local){const probe=freeCamera.update(local.group.position,frameDt);if(frames%6===0){canvas.dataset.camera=JSON.stringify({...probe,position:camera.position.toArray(),locked:document.pointerLockElement===canvas,mouseLook:view.mouseLook});canvas.dataset.models=JSON.stringify({loaded:[...modelReport.loaded],failed:[...modelReport.failed],players:[...actors.players.values()].map(n=>({character:n.p.character,asset:n.rig.root.userData.modelAsset,status:n.rig.root.userData.modelStatus}))});}}
  encounterView.update(state,myId,elapsed,(state?.tick||0)+(state?.paused?0:Math.min(.2,(performance.now()-stateReceivedAt)/1000)));
  if(local&&encounterView.shake>0&&!matchMedia('(prefers-reduced-motion: reduce)').matches){camera.position.x+=Math.sin(elapsed*49)*encounterView.shake*.065;camera.position.y+=Math.cos(elapsed*41)*encounterView.shake*.04;}
  if(state?.phase==='playing'){
    const prompt=interactionPrompt(state,myId,encounterView);
    $('interaction').textContent=prompt;$('interaction').classList.toggle('hidden',stallUI.visible||!prompt||!$('dialog').classList.contains('hidden'));
  }
  if(state?.phase==='playing'){
    const p=state.players[myId],d=disguiseState(p,state.tick);$('disguise-status').textContent=d.revealed?`${d.part} showing · ${Math.ceil(d.remaining)}s · Ask for Cover`:d.concealed?(p.ward>0?`Disguise ward · ${Math.ceil(p.ward)}s`:'Features hidden · Teammate Cover'):`Human disguise · Slip in ${Math.ceil(d.next)}s`;$('disguise-status').classList.toggle('revealed',d.revealed);
  }
  fx.update(dt,elapsed,state,frameDt);
  if(frames%6===0)canvas.dataset.visuals=JSON.stringify({...actors.probe(),graphics:{bloom:true,drawCalls:renderer.info.render.calls},effects:fx.actions.list.map(f=>({kind:f.kind,age:f.age}))});
  if(!document.hidden&&realDt<1){sampleTime+=realDt;sampleFrames++;}if(sampleTime>2){measuredFps=sampleFrames/sampleTime;transport.ping();canvas.dataset.performance=JSON.stringify({fps:Math.round(measuredFps),profile:quality.profile,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,cachedActors:actors.playerCache.size+actors.humanCache.size});quality.observe(measuredFps,sampleTime,!!local&&!document.hidden);sampleTime=0;sampleFrames=0;}
  if(!stallUI.visible&&state&&!['lobby','countdown'].includes(state.phase)&&!document.hidden){renderer.info.reset();if(disguising)transformation.render(introProgress,elapsed);else pipeline.render(quality.settings.post);}
  perf.frame(realDt);
}
window.__YOKAI_GAME__={getState:()=>state,getPlayer:()=>state?.players[myId],getMetrics:()=>({frames,objects:scene.children.length,players:actors.players.size,humans:actors.humans.size,drawCalls:renderer.info.render.calls}),events:bus,timeScale};
installPlaytest({canvas,onStop:stopInput,getMetrics:()=>({fps:state?.phase==='playing'?Math.round(measuredFps):null,profile:quality.profile,connection:connectionState,rtt:transport.rtt,phase:state?.phase||'title',encounter:state?.encounter?{phase:state.encounter.phase,hp:state.encounter.hp,wave:state.encounter.wave,banished:state.encounter.banished}:null,room:state?.code||null,player:state?.players[myId]?{x:state.players[myId].x,z:state.players[myId].z,energy:state.players[myId].energy,bottles:state.players[myId].bottles,action:state.players[myId].action,health:state.players[myId].health,combat:state.players[myId].combatStats,jumps:jumpProbe.count}:null,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,modelsLoaded:modelReport.loaded.size,modelsFailed:modelReport.failed.size})});
animate();
