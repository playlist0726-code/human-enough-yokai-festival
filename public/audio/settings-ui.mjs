// R13 volume sliders, injected into the festival menu's Settings grid right after "Sound effects".
// Lives in public/audio so the audio room does not edit the UI room's markup; it reuses the grid's
// two-column layout (docs/production/UI_KIT.md section 8). Values persist in localStorage.
const ROWS=[['master','Volume'],['music','Music'],['sfx','Effects'],['ambience','Festival ambience'],['voice','Voices']];

export function installAudioSettings({engine,volumes}){
  const grid=document.querySelector('#game-menu .settings-grid');if(!grid||grid.querySelector('[data-audio-slider]'))return;
  const anchor=document.getElementById('setting-sound');let after=anchor||grid.lastElementChild;
  if(!document.getElementById('audio-slider-style')){
    const style=document.createElement('style');style.id='audio-slider-style';
    style.textContent='.settings-grid input[type=range][data-audio-slider]{width:100%;min-height:28px;accent-color:var(--vermilion-ink,#a83c24);cursor:pointer}.settings-grid .audio-row-label{font-weight:700}';
    document.head.append(style);
  }
  for(const [key,text] of ROWS){
    const id=`setting-volume-${key}`,label=document.createElement('label'),input=document.createElement('input');
    label.htmlFor=id;label.textContent=text;label.className='audio-row-label';
    Object.assign(input,{id,type:'range',min:0,max:100,step:5,value:Math.round((volumes[key]??.8)*100)});
    input.dataset.audioSlider=key;input.setAttribute('aria-valuetext',`${input.value} percent`);
    input.addEventListener('input',()=>{engine.setVolume(key,input.value/100);input.setAttribute('aria-valuetext',`${input.value} percent`);});
    after.after(label,input);after=input;
  }
}
