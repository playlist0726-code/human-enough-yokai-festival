// Graphics quality mode (auto / high / light), the profile it resolves to, and the
// automatic step-down when the measured frame rate stays low.
import {PROFILES,initialProfile,slowerProfile} from '../visual-quality.mjs';

const LABEL={auto:'Auto',high:'High',light:'Light'};

/**
 * @param {{settings: {quality: string}, touchMode: boolean, apply: (q: object, profile: string) => void}} o
 */
export function createQualityControl({settings,touchMode,apply}){
  const button=document.createElement('button');button.className='view-control';button.setAttribute('aria-label','Change graphics quality');
  let mode=settings.quality,profile,slowSeconds=0;
  const resolve=m=>m==='auto'?initialProfile(innerWidth,navigator.hardwareConcurrency||4,touchMode):m;
  profile=resolve(mode);
  const control={
    button,
    get mode(){return mode;},
    get profile(){return profile;},
    get settings(){return PROFILES[profile];},
    apply(){apply(PROFILES[profile],profile);button.textContent=`Quality · ${LABEL[mode]||'Light'}`;},
    /** Button: auto -> high -> light -> auto. */
    cycle(){mode=mode==='auto'?'high':mode==='high'?'light':'auto';profile=resolve(mode);slowSeconds=0;settings.quality=mode;control.apply();},
    /** Re-read settings.quality (settings panel changed it). */
    sync(){mode=settings.quality;profile=resolve(mode);control.apply();},
    /** Feed a frame-rate sample; in auto mode a sustained low rate steps the profile down. */
    observe(fps,seconds,active){
      if(mode!=='auto'||!active)return;
      slowSeconds=fps<27?slowSeconds+seconds:Math.max(0,slowSeconds-1);
      if(slowSeconds>8&&profile!=='light'){profile=slowerProfile(profile);slowSeconds=0;control.apply();}
    }
  };
  return control;
}
