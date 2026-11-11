// REMASTER-HOOK r01: HUD and lobby DOM updates moved out of game.js unchanged, so the UI room (R05)
// can restyle them without editing game.js. Each function reads one server snapshot.
import {CHARACTERS,WORLD,distance,nearbyStall} from '../shared/world.mjs';
import {disguiseState} from '../shared/disguise.mjs';

const $=id=>document.getElementById(id);

/** Lobby party list and start/ready buttons. portrait(characterId) returns an image/canvas. */
export function renderLobby(state,myId,portrait){
  const p=state.players[myId];
  if(['lobby','countdown'].includes(state.phase)){
    $('copy-code').textContent=state.code;$('party').replaceChildren();
    for(const member of Object.values(state.players)){
      const row=document.createElement('div');row.className='party-member';const pic=document.createElement('canvas');pic.width=64;pic.height=72;pic.getContext('2d').drawImage(portrait(member.character),0,0,64,72);
      const name=document.createElement('span');name.textContent=member.name;const badge=document.createElement('span');badge.className=`member-state${member.ready?' ready':''}`;badge.textContent=!member.connected?'Reconnecting…':member.id===state.host?'Host':member.ready?'Ready':'Not ready';row.append(pic,name,badge);$('party').append(row);
    }
    const locked=state.phase==='countdown',crew=Object.values(state.players);$('start').disabled=locked||state.host!==myId||crew.some(a=>!a.connected||a.id!==myId&&!a.ready);$('start').textContent=locked?`Starting in ${Math.max(1,Math.ceil(state.countdown))}…`:'Enter the festival';$('ready').classList.toggle('hidden',state.host===myId);$('ready').disabled=locked;$('ready').textContent=p.ready?'Ready ✓ · Cancel':'Ready up';$('ready').setAttribute('aria-pressed',String(p.ready));$('lobby-hint').textContent=state.host===myId?crew.length===1?'Invite 1–3 friends, or start solo to practice.':'Everyone ready? Start a new night with your crew.':'Ready up, then wait for your host to start.';
  }
}

/** In-round HUD: room code, spirit, potions, followers, score, clock, crew, action buttons, portrait. */
export function renderHud(state,myId,portrait){
  const p=state.players[myId];
  $('hud-code').textContent=state.code;$('lobby-phone').href='/phone-lab.html?room='+encodeURIComponent(state.code);$('player-name').textContent=p.name;
  $('energy-value').textContent=Math.ceil(p.energy);$('energy-fill').style.width=`${p.energy}%`;$('energy-fill').parentElement.classList.toggle('low',p.energy<20);
  $('bottles').textContent=`Potions: ${p.bottles}`;
  const following=state.humans.filter(h=>h.owner===myId);$('followers').textContent=following.length?`Following: ${following.map(h=>`${h.name} ${Math.ceil(h.charm)}s`).join(' · ')}`:'F: 5-second charm · Guests wait when it ends';
  const best=Math.max(...Object.values(state.players).map(p=>p.delivered));$('score').textContent=`${best} / 3`;
  const seconds=Math.ceil(state.time);$('time').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  $('team').replaceChildren();for(const member of Object.values(state.players)){const span=document.createElement('span');span.textContent=`${member.name} ${member.connected?(disguiseState(member,state.tick).revealed?'! ':''):'↻ '}${member.delivered}/3 · ${Math.ceil(member.energy)}✦`;span.title=`${member.name}: ${member.bottles} potion${member.bottles===1?'':'s'}${member.connected?'':' · Reconnecting'}`;span.className='team-pill';span.style.borderBottom=`2px solid ${CHARACTERS.find(c=>c.id===member.character).color}`;$('team').append(span);}
  for(const button of document.querySelectorAll('[data-action="cover"]')){button.disabled=p.health<=0||p.coverCooldown>0;const label=button.querySelector('.cover-label')||button;label.textContent=p.coverCooldown>0?`${Math.ceil(p.coverCooldown)}s`:(button.id==='cover-touch'?'Ward':'Ward / hide');}
  for(const button of document.querySelectorAll('[data-action="jump"]'))button.disabled=p.health<=0||p.jumpCooldown>0||p.height>0||['arrive','drink','charm'].includes(p.action);
  $('portrait').getContext('2d').clearRect(0,0,80,100);$('portrait').getContext('2d').drawImage(portrait(p.character),0,0,80,100);
}

/** Context prompt near stalls, potions, guests or the shrine ('' when nothing is in reach). */
export function interactionPrompt(state,myId,encounterView){
    const p=state.players[myId],nearPotion=state.potions.find(o=>o.available&&distance(p,o)<2),nearHuman=state.humans.filter(h=>h.state!=='delivered'&&distance(p,h)<2.5).sort((a,b)=>distance(p,a)-distance(p,b))[0];
    const shop=nearbyStall(p),cooldown=shop?Math.max(0,(p.stallCooldowns[shop.id]||0)-state.tick):0;
    const prompt=encounterView.prompt(state,p)||(shop?`${shop.name} · ${cooldown>0?`Try again in ${Math.ceil(cooldown)}s`:'E · Play'}`:nearPotion?'E · Pick up potion':nearHuman?`${nearHuman.name} · ${nearHuman.state==='waiting'?'F Charm again':nearHuman.owner?`Following ${Math.ceil(nearHuman.charm)}s`:'E Talk / F Charm 5s'}`:distance(p,WORLD.gate)<4?'Shrine · Wait for your followers to arrive':'');
  return prompt;
}
