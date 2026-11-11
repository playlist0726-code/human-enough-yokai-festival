// R13 audio engine: buses, music state, ambience, event-bus SFX, ducking, distance, mobile unlock.
// game.js API is unchanged: createAudioEngine({isEnabled}) -> {tone(freq), attach(bus), context}.
//   - attach(bus) subscribes every gameplay event (cues.mjs) and watches the screens (title/menu/HUD/
//     opening/ending) to pick music, so nothing in game.js needs to change.
//   - tone(freq) is kept for compatibility but is silent: every event game.js used to beep for now has
//     a designed cue on the bus (bolt, ward block, hit, boss, potion, charm, delivery).
// Mixer: master(compressor) <- music(duck) <- ambience(duck) <- sfx <- voice <- ui. Sliders map squared.
import {CUES,OPENING,BUSES,DEFAULT_VOLUMES,sliderGain,dbToGain,distanceGain,panFor,pickFormat,characterFor,musicFor} from './cues.mjs';
import {installAudioSettings} from './settings-ui.mjs';

const STORE='eve-human-enough-audio-v1',BASE='/assets/audio';
const loadVolumes=storage=>{try{return {...DEFAULT_VOLUMES,...JSON.parse(storage?.getItem(STORE)||'{}')};}catch{return {...DEFAULT_VOLUMES};}};
const $=id=>typeof document!=='undefined'?document.getElementById(id):null;
const shown=el=>!!el&&!el.classList.contains('hidden');

export function createAudioEngine({isEnabled=()=>true,storage=globalThis.localStorage,base=BASE}={}){
  let ctx=null,master=null,manifest=null,format='m4a',listener=null,boss=false,musicName=null,musicNode=null,ambNodes=[],openingTimers=[];
  const buses={},ducks={},buffers=new Map(),loading=new Map(),lastPlayed=new Map(),liveCount=new Map();
  const volumes=loadVolumes(storage);
  const localCharacter=()=>{try{return JSON.parse(storage?.getItem('eve-human-enough-settings-v1')||'{}').character;}catch{return null;}};

  function build(){
    const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return false;
    ctx=new AC({latencyHint:'interactive'});
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-12;comp.knee.value=8;comp.ratio.value=4;comp.attack.value=.004;comp.release.value=.22;
    master=ctx.createGain();master.gain.value=0;master.connect(comp);comp.connect(ctx.destination);
    for(const name of BUSES){const g=ctx.createGain(),d=ctx.createGain();g.connect(d);d.connect(master);buses[name]=g;ducks[name]=d;}
    applyVolumes();
    format=pickFormat(t=>new Audio().canPlayType(t));
    return true;
  }
  function applyVolumes(){
    if(!ctx)return;const now=ctx.currentTime;
    for(const name of BUSES)buses[name].gain.setTargetAtTime(sliderGain(volumes[name]),now,.05);
    master.gain.setTargetAtTime(isEnabled()?sliderGain(volumes.master):0,now,.08);
  }
  async function loadManifest(){
    if(manifest)return manifest;
    try{manifest=await (await fetch(`${base}/manifest.json`)).json();}catch(e){console.warn('[audio] manifest',e);manifest={music:{},ambience:{},sfx:{},voice:{}};}
    return manifest;
  }
  function buffer(path){
    if(buffers.has(path))return Promise.resolve(buffers.get(path));
    if(!loading.has(path))loading.set(path,fetch(`${base}/${path}.${format}`).then(r=>r.arrayBuffer()).then(b=>ctx.decodeAudioData(b)).then(buf=>{buffers.set(path,buf);return buf;}).catch(e=>{console.warn('[audio]',path,e);return null;}));
    return loading.get(path);
  }
  /** Warm the cache: everything is small (a browser fetches one format, ~2.5 MB total). */
  async function preload(){
    const m=await loadManifest();
    const first=[...Object.values(m.ambience||{}).map(a=>a.file),...(m.sfx?.footstep||[]),...(m.sfx?.ui_click||[])];
    await Promise.all(first.map(buffer));
    for(const files of Object.values(m.sfx||{}))files.forEach(buffer);
    for(const file of Object.values(m.voice||{}))buffer(file);
    for(const t of Object.values(m.music||{}))buffer(t.file);
  }

  // ---- unlock: browsers only start audio after a user gesture (iOS needs it inside the gesture) ----
  let unlocked=false;
  function unlock(){
    if(unlocked){if(ctx&&ctx.state!=='running')ctx.resume?.();return;}   // iOS: resume inside a real gesture
    if(!isEnabled())return;
    if(!ctx&&!build())return;
    unlocked=true;ctx.resume?.();
    const s=ctx.createBufferSource();s.buffer=ctx.createBuffer(1,1,22050);s.connect(ctx.destination);s.start(0);   // iOS wake
    preload().then(()=>{refreshScene(true);});
  }
  if(typeof addEventListener!=='undefined')for(const type of ['pointerdown','keydown','touchend'])addEventListener(type,unlock,{capture:true,passive:true});

  // ---- playback ----
  function play(cue,{gain=0,bus='sfx',position=null,local=false,range=24,rate=null,delay=0,maxVoices=6}={}){
    if(!ctx||!manifest||!isEnabled())return null;
    const list=manifest.sfx?.[cue];if(!list?.length)return null;
    if((liveCount.get(cue)||0)>=maxVoices)return null;
    const file=list[Math.floor(Math.random()*list.length)],buf=buffers.get(file);
    if(!buf){buffer(file);return null;}
    const src=ctx.createBufferSource();src.buffer=buf;src.playbackRate.value=rate??(1+(Math.random()-.5)*.1);   // +-5% pitch variation
    const g=ctx.createGain(),pan=ctx.createStereoPanner?ctx.createStereoPanner():null;
    let level=dbToGain(gain);
    if(position&&listener&&!local){const dx=position.x-listener.x,dz=position.z-listener.z;level*=distanceGain(Math.hypot(dx,dz),range);if(pan)pan.pan.value=panFor(dx);}
    g.gain.value=level;src.connect(g);const out=buses[bus]||buses.sfx;if(pan){g.connect(pan);pan.connect(out);}else g.connect(out);
    liveCount.set(cue,(liveCount.get(cue)||0)+1);src.onended=()=>liveCount.set(cue,Math.max(0,(liveCount.get(cue)||1)-1));
    src.start(ctx.currentTime+delay);return src;
  }
  function voice(character,kind,opts){const file=manifest?.voice?.[`${character}_${kind}`];if(!file||!ctx)return;const buf=buffers.get(file);if(!buf){buffer(file);return;}
    const src=ctx.createBufferSource();src.buffer=buf;src.playbackRate.value=1+(Math.random()-.5)*.08;const g=ctx.createGain();g.gain.value=dbToGain(opts?.gain??-2)*(opts?.level??1);src.connect(g);g.connect(buses.voice);src.start(ctx.currentTime+(opts?.delay||0));}
  function duck(db,hold=.35){
    if(!ctx)return;const now=ctx.currentTime,g=dbToGain(db);
    for(const name of ['music','ambience']){const p=ducks[name].gain;p.cancelScheduledValues(now);p.setTargetAtTime(g,now,.03);p.setTargetAtTime(1,now+hold,.35);}
  }

  // ---- music & ambience ----
  function setMusic(name,fade=1.2){
    if(!ctx||name===musicName)return;musicName=name;const now=ctx.currentTime;
    if(musicNode){const old=musicNode;old.gain.gain.cancelScheduledValues(now);old.gain.gain.setTargetAtTime(0,now,fade/3);setTimeout(()=>{try{old.src.stop();}catch{}},fade*1500);musicNode=null;}
    const track=name&&manifest?.music?.[name];if(!track)return;
    buffer(track.file).then(buf=>{
      if(!buf||musicName!==name)return;
      const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=buf;src.loop=track.loop!==false;g.gain.value=0;src.connect(g);g.connect(buses.music);
      src.start();g.gain.setTargetAtTime(1,ctx.currentTime,fade/3);musicNode={src,gain:g};
    });
  }
  function stinger(name){
    if(!ctx)return;setMusic(null,.4);const track=manifest?.music?.[name];if(!track)return;
    buffer(track.file).then(buf=>{if(!buf)return;const s=ctx.createBufferSource();s.buffer=buf;s.connect(buses.music);s.start(ctx.currentTime+.3);});
  }
  function setAmbience(level){   // 0 off, .5 title, 1 festival
    if(!ctx||!manifest)return;
    if(!ambNodes.length)for(const [name,a] of Object.entries(manifest.ambience||{})){
      const g=ctx.createGain();g.gain.value=0;g.connect(buses.ambience);const node={name,g,src:null};ambNodes.push(node);
      buffer(a.file).then(buf=>{if(!buf)return;const s=ctx.createBufferSource();s.buffer=buf;s.loop=true;s.connect(g);s.start(ctx.currentTime+Math.random()*.2);node.src=s;});
    }
    const mix={crowd:level>=1?1:0,insects:level>0?1:0,wind:level>0?.8:0};
    for(const n of ambNodes)n.g.gain.setTargetAtTime((mix[n.name]??1)*(level>0?1:0),ctx.currentTime,.8);
  }

  // ---- screens -> music (observing the DOM keeps game.js untouched) ----
  let lastHud=false;
  function refreshScene(force){
    if(!ctx||!manifest)return;
    const scene={title:shown($('title-screen')),menu:shown($('menu'))||shown($('lobby')),hud:shown($('hud')),ending:shown($('ending')),boss};
    const name=musicFor(scene);if(name||force)setMusic(name);
    setAmbience(scene.hud?1:scene.title||scene.menu?.5:0);
    if(!scene.hud&&lastHud)boss=false;lastHud=scene.hud;
  }
  function opening(){
    if(!ctx)return;openingTimers.forEach(clearTimeout);openingTimers=[];
    setMusic(null,.6);const dur=4200;
    for(const o of OPENING)openingTimers.push(setTimeout(()=>{play(o.cue,{gain:o.gain,local:true,maxVoices:2});if(o.cue==='transform_pop')duck(-8,.5);},o.at*dur));
  }
  function observe(){
    if(typeof MutationObserver==='undefined')return;
    const ids=['title-screen','menu','lobby','hud','ending','transformation'];
    const mo=new MutationObserver(records=>{
      for(const r of records)if(r.target.id==='transformation'&&shown(r.target)&&r.oldValue?.includes('hidden'))opening();
      refreshScene();
    });
    for(const id of ids){const el=$(id);if(el)mo.observe(el,{attributes:true,attributeFilter:['class'],attributeOldValue:true});}
    // UI clicks: a quiet wooden tick for buttons (menus, HUD commands)
    addEventListener('click',e=>{if(e.target?.closest?.('button,summary')&&!e.target.closest('#scene'))play('ui_click',{bus:'ui',gain:-10,local:true,maxVoices:2});},{capture:true,passive:true});
  }

  function onEvent(type,e){
    const rule=CUES[type];if(!rule)return;
    if(e.local&&e.position)listener={x:e.position.x,z:e.position.z};
    if(type==='round_start'){boss=e.mode==='boss';refreshScene();}
    if(type==='boss_omen'&&!boss){boss=true;refreshScene();}
    if(type==='boss_banished'){boss=false;setTimeout(refreshScene,2500);}
    if(type==='round_end'){boss=false;stinger(e.result==='won'?'victory':'defeat');return;}
    if(rule.local&&!e.local)return;
    if(!rule.cue)return;
    const now=ctx?.currentTime??0,key=type+(e.playerId||'');
    if(rule.throttle&&now-(lastPlayed.get(key)||-1)<rule.throttle)return;lastPlayed.set(key,now);
    const bus=rule.bus==='ui'?'ui':rule.bus==='ambience'?'ambience':'sfx';
    const distant=rule.distant?{gain:(rule.gain||0)-(Math.random()*6),rate:.9+Math.random()*.15,delay:.15+Math.random()*.35}:{};
    play(rule.cue,{gain:rule.gain||0,bus,position:e.position,local:e.local,range:rule.range||24,maxVoices:rule.maxVoices||6,...distant});
    if(rule.duck)duck(rule.duck);
    if(rule.voice&&Math.random()<(rule.voiceChance??1)){
      const level=e.local||!listener||!e.position?1:distanceGain(Math.hypot(e.position.x-listener.x,e.position.z-listener.z),20);
      voice(characterFor(e.playerId,e.character||(e.local?localCharacter():null)),rule.voice,{delay:rule.voice==='surprise'?.04:.18,level});
    }
  }

  const engine={
    get context(){return ctx;},get volumes(){return volumes;},get music(){return musicName;},get loaded(){return buffers.size;},
    /** Legacy beep (R01 kept it for game.js). Silent now: the bus cues cover the same moments. */
    tone(){},
    play,duck,setMusic,unlock,
    setVolume(name,value){volumes[name]=Math.min(1,Math.max(0,+value));try{storage?.setItem(STORE,JSON.stringify(volumes));}catch{}applyVolumes();},
    /** Subscribe to game events (public/events.mjs) and start watching screens. Returns an unsubscribe function. */
    attach(bus){
      const offs=bus?Object.keys(CUES).map(type=>bus.on(type,e=>onEvent(type,e))):[];
      observe();globalThis.__YOKAI_AUDIO__=engine;   // console/debug handle, like __YOKAI_GAME__
      if(typeof document!=='undefined')installAudioSettings({engine,volumes});
      const poll=setInterval(()=>{applyVolumes();if(isEnabled()&&!unlocked&&navigator.userActivation?.hasBeenActive)unlock();},300);
      return ()=>{offs.forEach(off=>off());clearInterval(poll);};
    }
  };
  return engine;
}
