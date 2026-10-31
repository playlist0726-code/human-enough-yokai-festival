export const PROFILES={
  high:{ratio:1.6,ao:true,bloom:.28,shadow:2048,shadows:true,post:true,actorRange:65},
  balanced:{ratio:1.25,ao:false,bloom:.23,shadow:1024,shadows:true,post:true,actorRange:48},
  mobile:{ratio:1,ao:false,bloom:.18,shadow:768,shadows:true,post:true,actorRange:38},
  light:{ratio:1,ao:false,bloom:0,shadow:768,shadows:false,post:false,actorRange:35},
};
export function initialProfile(width,cores=4,touch=false){return cores<=2?'light':touch?'mobile':width<700?'balanced':'high';}
export function slowerProfile(name){return name==='high'?'balanced':'light';}
