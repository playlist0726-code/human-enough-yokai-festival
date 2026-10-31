const SETTINGS='eve-human-enough-settings-v1',HISTORY='eve-human-enough-record-v1';
export const DEFAULTS={sound:false,quality:'auto',camera:'close',name:'',character:'mizu'};
export function loadSettings(storage){
  let value;try{value=JSON.parse(storage?.getItem(SETTINGS)||'null');}catch{}
  if(!value||typeof value!=='object')return {...DEFAULTS};
  return {sound:value.sound===true,quality:['auto','high','light'].includes(value.quality)?value.quality:'auto',camera:value.camera==='wide'?'wide':'close',name:typeof value.name==='string'?value.name.slice(0,12):'',character:typeof value.character==='string'?value.character:'mizu'};
}
export function saveSettings(storage,value){try{storage?.setItem(SETTINGS,JSON.stringify(value));}catch{}}
export function loadRecord(storage){
  let r;try{r=JSON.parse(storage?.getItem(HISTORY)||'null');}catch{}
  if(!r||typeof r!=='object')return {rounds:0,wins:0,bestTime:null,stamps:[],counted:[]};
  const n=v=>Number.isSafeInteger(v)&&v>=0?v:0;
  return {rounds:n(r.rounds),wins:n(r.wins),bestTime:Number.isFinite(r.bestTime)&&r.bestTime>=0?r.bestTime:null,stamps:Array.isArray(r.stamps)?r.stamps.filter(s=>typeof s==='string'):[],counted:Array.isArray(r.counted)?r.counted.filter(s=>typeof s==='string').slice(-30):[]};
}
export function recordResult(storage,state,id){
  const r=loadRecord(storage),p=state.players[id],key=`${state.code}:${id}:${state.round}`;
  if(!p||!['won','lost'].includes(state.phase)||r.counted.includes(key))return r;
  r.rounds++;if(state.phase==='won'){r.wins++;r.bestTime=r.bestTime===null?state.tick:Math.min(r.bestTime,state.tick);}
  r.stamps=[...new Set([...r.stamps,...(p.stamps||[])])];r.counted=[...r.counted,key].slice(-30);
  try{storage?.setItem(HISTORY,JSON.stringify(r));}catch{}return r;
}
