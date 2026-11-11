// Quality profiles. R02 night look keys:
//   bloom / bloomThreshold / bloomRadius  lantern and potion glow (threshold stays high)
//   grade        0..1 colour-grade LUT strength (post only)
//   smaa         post anti-aliasing
//   lanternLights real PointLights that follow the lanterns nearest the player
//   rim          character rim-light multiplier
//   mist         valley-mist multiplier
export const PROFILES={
  high:{ratio:1.6,ao:true,bloom:.55,bloomThreshold:.8,bloomRadius:.55,grade:1,smaa:true,shadow:2048,shadows:true,post:true,lanternLights:6,rim:1,mist:1,actorRange:65},
  balanced:{ratio:1.25,ao:false,bloom:.5,bloomThreshold:.8,bloomRadius:.5,grade:1,smaa:true,shadow:1024,shadows:true,post:true,lanternLights:4,rim:1,mist:1,actorRange:48},
  mobile:{ratio:1,ao:false,bloom:.42,bloomThreshold:.82,bloomRadius:.45,grade:1,smaa:false,shadow:768,shadows:true,post:true,lanternLights:2,rim:1,mist:1,actorRange:38},
  light:{ratio:1,ao:false,bloom:0,grade:0,smaa:false,shadow:768,shadows:false,post:false,lanternLights:0,rim:1.2,mist:1,actorRange:35},
};
export function initialProfile(width,cores=4,touch=false){return cores<=2?'light':touch?'mobile':width<700?'balanced':'high';}
export function slowerProfile(name){return name==='high'?'balanced':name==='balanced'?'mobile':'light';}
