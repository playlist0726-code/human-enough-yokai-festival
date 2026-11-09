// R13 pure audio rules (no WebAudio here, so Node tests can import it).
// Event-bus type -> sound cue. Cue names match the VFX table (docs/production/VFX_LIST.md, fx/recipes.mjs).

/** bus: which mixer bus; duck: dB to dip music+ambience; local: only when it is the local player's event;
 *  range: metres at which a remote event fades to its floor; voice: character vocal to add ('laugh'|'surprise'). */
export const CUES={
  potion_pickup:{cue:'potion_pickup',bus:'sfx',gain:-4},
  potion_drink:{cue:'potion_drink',bus:'sfx',gain:-4},
  charm_cast:{cue:'charm_cast',bus:'sfx',gain:-3,voice:'laugh',voiceChance:.5},
  charm_end:{cue:'charm_end',bus:'sfx',gain:-8,local:true},
  cover_ward:{cue:'cover_ward',bus:'sfx',gain:-4},
  reveal_start:{cue:'reveal_pop',bus:'sfx',gain:-2,voice:'surprise',voiceChance:1},
  reveal_end:{cue:'reveal_hide',bus:'sfx',gain:-9},
  guest_delivered:{cue:'guest_delivered',bus:'sfx',gain:-2,duck:-6,voice:'laugh',voiceChance:1},
  stall_enter:{cue:'stall_enter',bus:'ui',gain:-6,local:true},
  stall_win:{cue:'stall_win',bus:'sfx',gain:-3,local:true,voice:'laugh',voiceChance:1},
  stall_fail:{cue:'stall_fail',bus:'sfx',gain:-6,local:true},
  stall_reward:{cue:'stall_reward',bus:'sfx',gain:-5},
  hit:{cue:'hit',bus:'sfx',gain:-2,voice:'surprise',voiceChance:.6},
  sealed:{cue:'sealed',bus:'sfx',gain:-3,duck:-4},
  rescued:{cue:'rescued',bus:'sfx',gain:-4},
  boss_omen:{cue:'boss_omen',bus:'sfx',gain:-2,duck:-5,range:60},
  boss_banished:{cue:'boss_banished',bus:'sfx',gain:0,duck:-9,range:80},
  spirit_bolt:{cue:'spirit_bolt',bus:'sfx',gain:-6},
  ward_block:{cue:'ward_block',bus:'sfx',gain:-5},
  seal_break:{cue:'seal_break',bus:'sfx',gain:-4},
  ping:{cue:'ping',bus:'ui',gain:-4,range:80},
  footstep:{cue:'footstep',bus:'sfx',gain:-14,throttle:.07,maxVoices:4,range:14},
  jump:{cue:'jump',bus:'sfx',gain:-10,range:16},
  land:{cue:'land',bus:'sfx',gain:-8,range:16},
  round_start:{cue:'round_start',bus:'sfx',gain:-4},
  round_end:{cue:null,bus:'music'},            // handled as a music stinger (victory / defeat)
  firework:{cue:'firework',bus:'ambience',gain:-6,distant:true}
};

/** Opening (disguising) cues, timed to public/transformation.mjs: progress 0 / 0.51 (pop) / 0.6. */
export const OPENING=[{at:0,cue:'transform_gather',gain:-4},{at:.51,cue:'transform_pop',gain:0},{at:.6,cue:'transform_reveal',gain:-6}];

export const BUSES=['music','sfx','ambience','voice','ui'];
export const DEFAULT_VOLUMES={master:.9,music:.7,sfx:.9,ambience:.65,voice:.8,ui:.6};
export const CHARACTERS=['mizu','pon','kon','sumi','nemu','akari','kasa'];

/** Settings slider (0..1) -> linear gain. Squared so the audible change spreads over the whole slider. */
export const sliderGain=v=>{const x=Math.min(1,Math.max(0,Number(v)||0));return x*x;};
export const dbToGain=db=>Math.pow(10,db/20);

/** Distance attenuation with a floor so remote crew actions stay faintly audible. */
export function distanceGain(dist,range=24,floor=.12){if(!Number.isFinite(dist))return 1;const k=dist/range;return Math.max(floor,1/(1+k*k*4));}
/** Stereo pan from the listener (camera sits behind the player, looking uphill toward -z). */
export function panFor(dx,width=10){return Math.max(-.8,Math.min(.8,dx/width));}

/** Pick the decodable format: Vorbis where supported, AAC (m4a) otherwise (Safari/iOS). */
export function pickFormat(canPlay){try{return canPlay('audio/ogg; codecs="vorbis"')?'ogg':'m4a';}catch{return 'm4a';}}

/** Remote players' characters are not in event payloads; fall back to a stable per-id choice. */
export function characterFor(playerId,known){if(known)return known;let h=0;for(const c of String(playerId||''))h=(h*31+c.charCodeAt(0))>>>0;return CHARACTERS[h%CHARACTERS.length];}

/** Which music should play for the visible screen. */
export function musicFor({title,menu,hud,boss,ending}){if(ending)return null;if(hud)return boss?'boss':'festival';if(title||menu)return 'title';return null;}
