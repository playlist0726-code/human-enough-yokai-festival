import {STALLS,stallEntrance,distance,WORLD} from '/shared/world.mjs';
import {journeySteps} from '/journey.mjs';
import {GAMES} from '/shared/minigames.mjs';
import {loadRecord,recordResult} from '/profile.mjs';
const $=id=>document.getElementById(id);
const clock=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
export function createFoundationUI({send,stop,focusWorld,leave,toast,storage,settings,save,applySettings,navigate}){
  let state=null,myId=null,recorded='',warning60=false,warning10=false,lastRound='',confirming=false,assistTarget='',pauseRequested=false;
  const visible=()=>!$('game-menu').classList.contains('hidden');
  function close(){
    $('game-menu').classList.add('hidden');$('game-menu').inert=false;$('leave-confirm').classList.add('hidden');confirming=false;
    if(state?.phase==='playing')send({type:'pause',paused:false});pauseRequested=false;
    $('game').inert=$('hud').inert=state?.phase!=='playing';focusWorld();
  }
  function open(){
    if(state?.phase!=='playing'||state.players[myId]?.mini)return;
    stop();$('dialog').classList.add('hidden');$('game-menu').classList.remove('hidden');
    $('game').inert=$('hud').inert=true;pauseRequested=Object.keys(state.players).length===1;send({type:'pause',paused:pauseRequested});
    $('pause-note').textContent=Object.keys(state.players).length===1?'Solo practice is paused.':'Online play continues while this menu is open.';
    $('resume-game').focus();renderJournal();
  }
  $('assist-target').onchange=()=>{assistTarget=$('assist-target').value;};
  $('crew-ping').onclick=()=>{close();send({type:'action',action:'ping'});};
  $('open-menu').onclick=open;$('resume-game').onclick=close;
  $('menu-help').onclick=()=>{$('instructions').classList.remove('hidden');$('game-menu').inert=true;$('help-close').focus();};
  $('request-leave').onclick=()=>{confirming=true;$('leave-confirm').classList.remove('hidden');$('cancel-leave').focus();};
  $('cancel-leave').onclick=()=>{confirming=false;$('leave-confirm').classList.add('hidden');$('request-leave').focus();};
  $('confirm-leave').onclick=()=>{close();leave();};
  for(const key of ['sound','quality','camera']){
    const el=$(`setting-${key}`);if(key==='sound')el.checked=settings.sound;else el.value=settings[key];
    el.onchange=()=>{settings[key]=key==='sound'?el.checked:el.value;save();applySettings();};
  }
  $('game-menu').addEventListener('keydown',e=>{
    if(e.key!=='Tab'||!$('instructions').classList.contains('hidden'))return;
    const controls=[...$('game-menu').querySelectorAll('button,input,select')].filter(el=>!el.disabled&&el.getClientRects().length);
    const first=controls[0],last=controls.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });
  function renderCrew(){
    const p=state?.players[myId];if(!p)return;
    const crew=Object.values(state.players).filter(a=>a.id!==myId),select=$('assist-target'),ids=crew.map(a=>a.id).join(',');
    if(select.dataset.members!==ids){
      select.replaceChildren(new Option('Nearest teammate',''),...crew.map(a=>new Option(a.name,a.id)));select.dataset.members=ids;
      if(!crew.some(a=>a.id===assistTarget))assistTarget='';select.value=assistTarget;
    }
    select.disabled=!crew.length;
    const box=$('crew-status');
    if(box.dataset.members!==ids){
      box.replaceChildren();for(const a of crew){const row=document.createElement('div');row.className='crew-member';row.dataset.member=a.id;row.append(document.createElement('b'),document.createElement('span'));box.append(row);}box.dataset.members=ids;
    }
    for(const a of crew){const row=box.querySelector(`[data-member="${a.id}"]`),steps=Math.round(distance(p,a));row.firstElementChild.textContent=a.name;row.lastElementChild.textContent=!a.connected?'Reconnecting…':`${Math.ceil(a.energy)} spirit · ${a.bottles} potion${a.bottles===1?'':'s'} · ${a.delivered}/3 guests · ${steps} steps away`;}
    if(!crew.length)box.textContent='You are exploring solo. Invite friends from the lobby for co-op play.';
    const list=$('journey-checklist'),steps=journeySteps(p);
    if(!list.children.length)for(const step of steps){const row=document.createElement('li');row.append(document.createElement('b'),document.createElement('span'));list.append(row);}
    steps.forEach((step,i)=>{const row=list.children[i];row.classList.toggle('complete',step.done);row.firstElementChild.textContent=`${step.done?'✓':'○'} ${step.title}`;row.lastElementChild.textContent=step.hint;});
    const wait=Math.max(0,(p.pingUntil||0)-state.tick);$('crew-ping').disabled=wait>0;$('crew-ping').textContent=wait>0?`Help ping ready in ${Math.ceil(wait)}s`:'Call for help · G';
  }
  function renderJournal(){
    const p=state?.players[myId];if(!p)return;
    renderCrew();
    const journal=$('stall-journal');
    if(!journal.children.length)for(const stall of STALLS){
      const b=document.createElement('button');b.type='button';b.className='journal-stall';b.dataset.stall=stall.id;
      const stampIcon=new Image(40,40);stampIcon.className='journal-stamp';stampIcon.alt='';stampIcon.src=`/assets/ui/icons/stamp-${stall.game}.svg`;const text=document.createElement('div');text.append(document.createElement('b'),document.createElement('span'));b.append(stampIcon,text);
      b.onclick=()=>{close();navigate(stallEntrance(stall));toast(`On your way to ${stall.name}. Use movement keys to cancel.`);};journal.append(b);
    }
    for(const stall of STALLS){
      const won=p.stamps?.includes(stall.id),wait=Math.max(0,(p.stallCooldowns?.[stall.id]||0)-(state.tick||0)),b=journal.querySelector(`[data-stall="${stall.id}"]`);
      b.classList.toggle('stamped',won);b.querySelector('b').textContent=`${won?'✓ ':''}${stall.name}`;
      b.querySelector('span').textContent=`${GAMES[stall.game].reward}${wait>0?` · ${Math.ceil(wait)}s cooldown`:''}`;
    }
    const r=loadRecord(storage);$('personal-record').textContent=`Your device: ${r.wins} wins / ${r.rounds} night${r.rounds===1?'':'s'} · ${r.stamps.length}/6 stamps${r.bestTime===null?'':` · Best ${clock(r.bestTime)}`}`;
  }
  function sync(next,id){
    state=next;myId=id;const p=state.players[id];if(!p)return;
    if(assistTarget&&!state.players[assistTarget]){assistTarget='';$('assist-target').value='';}
    const roundKey=`${state.code}:${state.round}`;
    if(roundKey!==lastRound){lastRound=roundKey;warning60=warning10=false;}
    if(state.phase==='countdown'){$('lobby-hint').textContent=`Festival begins in ${Math.max(1,Math.ceil(state.countdown))}…`;}
    if(state.phase!=='playing'&&visible())close();
    if(state.phase==='playing'){
      if(visible()){const solo=Object.keys(state.players).length===1;if(solo!==pauseRequested){pauseRequested=solo;send({type:'pause',paused:solo});}$('pause-note').textContent=solo?'Solo practice is paused.':'Online play continues while this menu is open.';}
      if(state.time<=60&&!warning60){toast('One minute until the last firework. Lead your guests to the summit!');warning60=true;}
      if(state.time<=10&&!warning10){toast('10 seconds left! The Spirit Gate is at the summit.');warning10=true;}
      $('time').classList.toggle('time-critical',state.time<=60);
      const following=state.humans.filter(h=>h.owner===id),fading=following.filter(h=>h.charm<2),nearAlly=Object.values(state.players).some(a=>a.id!==id&&(!assistTarget||a.id===assistTarget)&&a.connected&&!a.mini&&distance(p,a)<3);
      const nearestPotion=state.potions.filter(o=>o.available).sort((a,b)=>distance(p,a)-distance(p,b))[0];
      $('next-step').textContent=p.energy<20&&following.length?'Low spirit! Drink Q or ask a teammate for a potion.':fading.length?`${fading.map(h=>h.name).join(', ')}: charm fading (${Math.ceil(Math.min(...fading.map(h=>h.charm)))}s). They will wait here; charm again to continue.`:following.length?'Move uphill before the 5-second charm ends ↟':p.delivered>0?'Find your next guest. One yokai must deliver all 3.':'Find a guest → F Charm → Escort uphill · Ward your crew when shadows arrive';
      $('route-hint').textContent=following.length?`Summit: ${Math.round(distance(p,WORLD.gate))} steps away`:nearestPotion?`Nearest potion: ${Math.round(distance(p,nearestPotion))} steps away`:'';
      const ally=Object.values(state.players).filter(a=>a.id!==id&&(!assistTarget||a.id===assistTarget)&&a.connected&&!a.mini&&distance(p,a)<3).sort((a,b)=>distance(p,a)-distance(p,b))[0];
      for(const b of document.querySelectorAll('[data-action="share"]'))b.disabled=p.health<=0||!ally||p.bottles<1||ally.bottles>=3;
      for(const b of document.querySelectorAll('[data-action="handoff"]'))b.disabled=p.health<=0||!nearAlly||!following.some(h=>ally&&distance(h,ally)<4);
      for(const b of document.querySelectorAll('[data-action="ping"]')){const wait=Math.max(0,(p.pingUntil||0)-state.tick);b.disabled=p.health<=0||wait>0;b.title=wait>0?`Call for help in ${Math.ceil(wait)}s`:'Mark your location for your crew';}
      if(visible())renderJournal();
    }
    const key=`${roundKey}:${id}`;
    if(['won','lost'].includes(state.phase)){
      if(recorded!==key){recordResult(storage,state,id);recorded=key;}
      const summary=$('round-summary');summary.replaceChildren();
      for(const member of Object.values(state.players)){
        const row=document.createElement('div');row.className='summary-row';
        const name=document.createElement('b');name.textContent=member.name;
        const stats=document.createElement('span');stats.textContent=`${member.delivered} guests · ${member.stats?.stallsWon||0} prizes · ${member.stats?.potionsShared||0} shared potions · ${member.combatStats?.seals||0} seals · ${member.combatStats?.revives||0} rescues`;
        row.append(name,stats);summary.append(row);
      }
      $('round-time').textContent=`Night ${state.round} · ${clock(state.tick)} played · Your stamps ${p.stamps?.length||0}/6`;
      $('restart').textContent=state.host===id?'Back to crew · Play again':'Waiting for the host';$('restart').disabled=state.host!==id;
    }
  }
  return {sync,open,close,get assistTarget(){return assistTarget;},get visible(){return visible();},escape(){if(!visible()){open();return;}if(confirming)$('cancel-leave').click();else close();},clear(){state=null;recorded='';assistTarget='';close();},refreshSettings(){for(const key of ['sound','quality','camera']){const el=$(`setting-${key}`);if(key==='sound')el.checked=settings[key];else el.value=settings[key];}}};
}
