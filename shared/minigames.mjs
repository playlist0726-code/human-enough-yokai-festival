// The server checks individual inputs, attempts and timing. No client score is accepted.
export const GAMES={
  shoot:{title:'Cork Shooting',icon:'◎',time:18,goal:3,instructions:'Aim at the moving prizes and fire. Hit 3 prizes with 6 corks!',reward:'1 potion',keys:'Drag to aim, then Fire / Arrow keys + Space'},
  fish:{title:'Goldfish Scooping',icon:'◌',time:18,goal:3,instructions:'Slide the paper net under a fish and lift. Catch 3 before you tear 6 nets.',reward:'Disguise ward: 15s',keys:'Drag the net and lift / Arrow keys + Space'},
  ring:{title:'Ring Toss',icon:'○',time:18,goal:3,instructions:'Pull back and release at golden power while aiming at the center. Land 3 of 5 rings.',reward:'Speed boost: 20s',keys:'Hold and release / Space'},
  cook:{title:'Takoyaki Kitchen',icon:'●',time:16,goal:4,instructions:'Flip each takoyaki when golden. Too early or burnt counts as a miss. Cook 4 of 6!',reward:'+35 spirit',keys:'Tap golden takoyaki / Keys 1–6'},
  fortune:{title:'Lucky Draw',icon:'✿',time:15,goal:1,instructions:'Pick a lucky bag and pull it upward to reveal your free surprise.',reward:'A potion, spirit, or a disguise ward',keys:'Pull a bag upward / Keys 1–3'},
  ice:{title:'Moonlight Shaved Ice',icon:'❄',time:18,goal:12,instructions:'Turn the handle 12 times, then choose the syrup in the order.',reward:'+20 spirit · 8s disguise ward',keys:'Circle the handle / Space; syrup: keys 1–3'},
};
const syrups=['Strawberry','Melon','Lemon'];
export function createGame(kind,seed,now){
  if(!GAMES[kind])throw Error('Unknown festival game');
  return {kind,seed:seed>>>0,status:'intro',openedAt:now,startedAt:null,endsAt:null,score:0,attempts:0,hits:[],cooked:Array(6).fill(0),turns:0,syrup:(seed>>>0)%3,lastInput:-1,result:null};
}
export const gameAge=(g,now)=>g.startedAt===null?0:Math.max(0,now-g.startedAt);
export function targets(g,now){
  const t=gameAge(g,now),fish=g.kind==='fish';
  return Array.from({length:fish?5:6},(_,i)=>({id:i,x:fish?.16+(i%3)*.31+Math.sin(t*1.2+i*2+g.seed%7)*.055:.18+(i%3)*.32+Math.sin(t*1.8+i)*.045,y:fish?.33+Math.floor(i/3)*.37+Math.cos(t*1.3+i)*.06:.3+Math.floor(i/3)*.38,r:fish?.077:.09,hit:g.hits.includes(i)}));
}
export const ringPosition=(g,now)=>(Math.sin(gameAge(g,now)*2.8+(g.seed%13)*.12)+1)/2;
export const cookingPhase=(g,i,now)=>g.cooked[i]===1?'done':g.cooked[i]===-1?'burnt':gameAge(g,now)<1.3+i*.85?'raw':gameAge(g,now)>4.2+i*.85?'burnt':'gold';
export const syrupName=g=>syrups[g.syrup];
function finish(g,won,reason,now){g.status='result';g.result={won,reason};g.endsAt=now;return g;}
export function advanceGame(g,now){
  if(g.status==='intro'&&now-g.openedAt>20)return finish(g,false,'Time to begin has expired. Visit again for another try.',now);
  if(g.status!=='active')return g;
  if(g.kind==='cook'){
    for(let i=0;i<6;i++)if(!g.cooked[i]&&cookingPhase(g,i,now)==='burnt')g.cooked[i]=-1;
    if(g.cooked.filter(n=>n!==-1).length<4)return finish(g,false,'Too many burnt takoyaki. Flip them when golden.',now);
  }
  if(now>=g.endsAt)return finish(g,false,'Time is up. Try again on your next visit!',now);
  return g;
}
export function inputGame(g,input,now){
  advanceGame(g,now);if(!input||typeof input!=='object')return g;
  if(input.type==='begin'&&g.status==='intro'){g.status='active';g.startedAt=now;g.endsAt=now+GAMES[g.kind].time;return g;}
  if(g.status!=='active'||now-g.lastInput<.075)return g;
  if(['shoot','fish'].includes(g.kind)&&input.type==='aim'){
    if(!Number.isFinite(input.x)||!Number.isFinite(input.y)||input.x<0||input.x>1||input.y<0||input.y>1)return g;
    g.lastInput=now;g.attempts++;
    const hit=targets(g,now).find(t=>!t.hit&&Math.hypot(input.x-t.x,input.y-t.y)<t.r+.025);
    if(hit){g.hits.push(hit.id);g.score++;}
    if(g.score>=3)return finish(g,true,'Great aim! You won a festival prize.',now);
    const max=g.kind==='shoot'?6:9;if(g.attempts-g.score>=6||g.attempts>=max)return finish(g,false,'No attempts left. Watch the movement and try again.',now);
  }else if(g.kind==='ring'&&input.type==='throw'){
    if(input.power!==undefined&&(!Number.isFinite(input.power)||input.power<0||input.power>1||!Number.isFinite(input.aimX)||input.aimX<0||input.aimX>1))return g;
    g.lastInput=now;g.attempts++;
    const accurate=input.power!==undefined?input.power>.43&&input.power<.70&&input.aimX>.28&&input.aimX<.72:ringPosition(g,now)>.34&&ringPosition(g,now)<.66;
    if(accurate)g.score++;
    if(g.score>=3)return finish(g,true,'A perfect ring toss!',now);
    if(g.attempts>=5)return finish(g,false,'The rings missed. Aim at the center and release at golden power.',now);
  }else if(g.kind==='cook'&&input.type==='flip'&&Number.isInteger(input.index)&&input.index>=0&&input.index<6){
    if(g.cooked[input.index])return g;g.lastInput=now;g.attempts++;
    const good=cookingPhase(g,input.index,now)==='gold';g.cooked[input.index]=good?1:-1;if(good)g.score++;
    if(g.score>=4)return finish(g,true,'Crisp outside, fluffy inside. Takoyaki ready!',now);
    advanceGame(g,now);
  }else if(g.kind==='fortune'&&input.type==='pick'&&Number.isInteger(input.index)&&input.index>=0&&input.index<3){
    g.lastInput=now;g.choice=input.index;g.prize=(g.seed+input.index*7)%3;g.score=1;return finish(g,true,'The surprise inside the lucky bag is yours!',now);
  }else if(g.kind==='ice'){
    if(input.type==='turn'&&g.turns<12){g.lastInput=now;g.turns++;g.score=g.turns;}
    else if(input.type==='syrup'&&g.turns===12&&Number.isInteger(input.index)&&input.index>=0&&input.index<3){
      g.lastInput=now;if(input.index===g.syrup)return finish(g,true,`${syrups[g.syrup]} shaved ice is ready. Enjoy!`,now);
      g.attempts++;if(g.attempts>=2)return finish(g,false,'That is not the ordered syrup. Check the order next time.',now);
    }
  }
  return g;
}
export function rewardFor(g){
  if(!g.result?.won)return null;
  if(g.kind==='shoot')return {bottles:1,label:'1 potion'};
  if(g.kind==='fish')return {ward:15,label:'Disguise ward: 15s'};
  if(g.kind==='ring')return {speed:20,label:'+35% speed for 20s'};
  if(g.kind==='cook')return {energy:35,label:'+35 spirit'};
  if(g.kind==='fortune')return [{bottles:1,label:'1 lucky potion'},{energy:45,label:'Lucky spirit: +45'},{ward:20,label:'Lucky disguise ward: 20s'}][g.prize];
  return {energy:20,ward:8,label:'+20 spirit · 8s disguise ward'};
}
