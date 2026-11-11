// Character portrait images used by the select screen, lobby and HUD.
// A missing image falls back to a coloured badge so menus never break.
// REMASTER-HOOK r05: portrait slot. Character rooms drop a v2 render at /assets/ui/portraits/<id>.webp
// (square, 512 px, transparent, head and shoulders) and add the id to /assets/ui/portraits/index.json.
// Until then the concept reference image is used, so nothing 404s.
let v2Portraits=null;
const portraitList=()=>v2Portraits??=fetch('/assets/ui/portraits/index.json').then(r=>r.ok?r.json():{}).then(j=>new Set(Array.isArray(j.portraits)?j.portraits:[])).catch(()=>new Set());
export async function portraitURL(id){return (await portraitList()).has(id)?`/assets/ui/portraits/${id}.webp`:`/assets/${id}-reference.png`;}
export async function loadPortrait(c){
  const src=await portraitURL(c.id);
  return new Promise(resolve=>{
    const image=new Image();image.onload=()=>resolve(image);
    image.onerror=()=>{const fallback=document.createElement('canvas');fallback.width=150;fallback.height=158;const ctx=fallback.getContext('2d');ctx.fillStyle=c.color;ctx.beginPath();ctx.arc(75,75,55,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 30px sans-serif';ctx.textAlign='center';ctx.fillText(c.name,75,85);resolve(fallback);};
    image.src=src;
  });
}
export function loadPortraits(characters){return Promise.all(characters.map(loadPortrait));}
