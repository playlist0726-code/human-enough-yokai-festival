// Character portrait images used by the select screen, lobby and HUD.
// A missing image falls back to a coloured badge so menus never break.
export function loadPortrait(c){
  return new Promise(resolve=>{
    const image=new Image();image.onload=()=>resolve(image);
    image.onerror=()=>{const fallback=document.createElement('canvas');fallback.width=150;fallback.height=158;const ctx=fallback.getContext('2d');ctx.fillStyle=c.color;ctx.beginPath();ctx.arc(75,75,55,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 30px sans-serif';ctx.textAlign='center';ctx.fillText(c.name,75,85);resolve(fallback);};
    image.src=`/assets/${c.id}-reference.png`;
  });
}
export function loadPortraits(characters){return Promise.all(characters.map(loadPortrait));}
