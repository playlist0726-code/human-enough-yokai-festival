import {disguiseState} from '/shared/disguise.mjs';
import {GAMES} from '/shared/minigames.mjs';
import {CHANNEL,isFrameMessage,cleanStallInput} from '/shared/stall-protocol.mjs';

export function createStallUI(send,stop,focusWorld,{getSound=()=>false,getQuality=()=>'auto',onSoundChange=()=>{}}={}){
  const overlay=document.createElement('section');overlay.id='stall-overlay';overlay.className='stall-overlay hidden';
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Festival minigame');document.body.append(overlay);
  let game=null,tick=0,player=null,frame=null,ready=false,session=null,loadTimer=null;
  const close=()=>{if(game)send({type:'stall',session:game.session,input:{type:'close'}});};
  function post(type,extra={}){if(ready&&frame?.contentWindow&&game)frame.contentWindow.postMessage({channel:CHANNEL,type,session:game.session,game,tick,character:player?.character||'mizu',stamps:player?.stamps||[],sound:getSound(),quality:getQuality(),revealed:player?disguiseState(player,tick).revealed:false,...extra},location.origin);}
  function mount(){
    ready=false;clearTimeout(loadTimer);overlay.replaceChildren();
    const loading=document.createElement('div');loading.className='stall-loading';loading.setAttribute('role','status');loading.textContent=`Opening ${GAMES[game.kind].title}…`;
    const back=document.createElement('button');back.type='button';back.className='stall-back';back.textContent='Back to festival ×';back.onclick=close;
    frame=document.createElement('iframe');frame.className='stall-frame';frame.title=`${GAMES[game.kind].title} — first-person minigame`;frame.src='/minigames/index.html?embedded=1';
    frame.addEventListener('error',()=>{loading.textContent='The stall could not load. Return to the festival and try again.';});
    loadTimer=setTimeout(()=>{if(!ready)loading.textContent='This stall is taking longer to load. Use Back to festival and try again.';},8000);
    overlay.append(loading,frame,back);back.focus({preventScroll:true});
  }
  window.addEventListener('message',event=>{
    if(!frame||!game||!isFrameMessage(event,location.origin,frame.contentWindow))return;
    const m=event.data;
    if(m.type==='ready'){clearTimeout(loadTimer);ready=true;post('init');overlay.querySelector('.stall-loading')?.remove();frame.focus();return;}
    if(m.session!==game.session)return;
    if(m.type==='sound'&&typeof m.enabled==='boolean'){onSoundChange(m.enabled);return;}
    if(m.type==='input'){
      const input=cleanStallInput(m.input);
      if(input&&Number.isSafeInteger(m.requestId)&&m.requestId>=0)send({type:'stall',session:game.session,input,requestId:m.requestId});
    }
    if(m.type==='close')close();
  });
  return {
    sync(next,nextTick,nextPlayer){
      const was=!!game;game=next;tick=nextTick;player=nextPlayer||player;overlay.classList.toggle('hidden',!game);
      if(was!==!!game)for(const id of ['game','hud','menu','lobby'])document.getElementById(id).inert=!!game;
      if(!game){clearTimeout(loadTimer);frame?.remove();frame=null;ready=false;session=null;overlay.replaceChildren();if(was)focusWorld();return;}
      if(game.session!==session){session=game.session;stop();mount();}else post('state');
    },
    ack(message){if(game&&message.session===game.session)post('ack',{requestId:message.requestId,game:message.game,tick:message.tick});},
    frame(){},
    key(e){if(!game)return false;if(e.code==='Escape'){e.preventDefault();if(!e.repeat)close();}return true;},
    get visible(){return !!game;}
  };
}
