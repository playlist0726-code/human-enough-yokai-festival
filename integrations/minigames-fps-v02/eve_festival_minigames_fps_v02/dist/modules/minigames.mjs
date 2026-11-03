// The server checks individual inputs, attempts and timing. No client score is accepted.
export const GAMES={
  shoot:{title:'축제 사격',icon:'◎',time:18,goal:3,instructions:'움직이는 경품을 눌러 맞히세요. 6발 안에 3개를 맞히면 성공!',reward:'포션 1병',keys:'클릭·터치로 사격 / 방향키로 조준하고 Space'},
  fish:{title:'금붕어 잡기',icon:'魚',time:18,goal:3,instructions:'헤엄치는 금붕어를 눌러 뜰채로 건지세요. 뜰채가 6번 찢어지기 전에 3마리를 잡아요.',reward:'홀림 보호 15초',keys:'클릭·터치 / 방향키로 뜰채 이동 후 Space'},
  ring:{title:'고리 던지기',icon:'○',time:18,goal:3,instructions:'조준선이 황금 구역 안에 들어왔을 때 던지세요. 5번 중 3번 성공하면 돼요.',reward:'이동 속도 증가 20초',keys:'던지기 버튼 / Space'},
  cook:{title:'노릇노릇 타코야키',icon:'●',time:16,goal:4,instructions:'반죽이 노릇해지면 눌러 뒤집어요. 너무 빨라도, 타 버려도 실패! 6개 중 4개를 맛있게 구워요.',reward:'요력 +35',keys:'반죽 클릭·터치 / 숫자 1~6'},
  fortune:{title:'복주머니 뽑기',icon:'✿',time:15,goal:1,instructions:'마음에 드는 복주머니 하나를 골라요. 무료로 한 번 뽑고, 안에 든 선물을 받아요.',reward:'포션 / 요력 / 홀림 보호 중 하나',keys:'복주머니 클릭·터치 / 숫자 1~3'},
  ice:{title:'달빛 빙수 만들기',icon:'氷',time:18,goal:12,instructions:'손잡이를 12번 돌려 얼음을 쌓은 뒤, 주문에 맞는 시럽을 골라요.',reward:'요력 +20 · 홀림 보호 8초',keys:'손잡이 버튼 / Space, 시럽은 숫자 1~3'},
};
const syrups=['딸기','멜론','레몬'];
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
  if(g.status==='intro'&&now-g.openedAt>20)return finish(g,false,'설명 시간이 끝났어요. 다시 도전해 주세요.',now);
  if(g.status!=='active')return g;
  if(g.kind==='cook'){
    for(let i=0;i<6;i++)if(!g.cooked[i]&&cookingPhase(g,i,now)==='burnt')g.cooked[i]=-1;
    if(g.cooked.filter(n=>n!==-1).length<4)return finish(g,false,'타코야키가 너무 많이 탔어요. 노릇할 때 뒤집어 주세요.',now);
  }
  if(now>=g.endsAt)return finish(g,false,'시간이 끝났어요. 한 번 더 도전해 봐요!',now);
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
    if(g.score>=3)return finish(g,true,'잘했어요! 축제 경품을 받았어요.',now);
    const max=g.kind==='shoot'?6:9;if(g.attempts-g.score>=6||g.attempts>=max)return finish(g,false,'기회를 모두 썼어요. 움직임을 보고 다시 도전해요.',now);
  }else if(g.kind==='ring'&&input.type==='throw'){
    if(input.power!==undefined&&(!Number.isFinite(input.power)||input.power<0||input.power>1||!Number.isFinite(input.aimX)||input.aimX<0||input.aimX>1))return g;
    g.lastInput=now;g.attempts++;
    const accurate=input.power!==undefined?input.power>.43&&input.power<.70&&input.aimX>.28&&input.aimX<.72:ringPosition(g,now)>.34&&ringPosition(g,now)<.66;
    if(accurate)g.score++;
    if(g.score>=3)return finish(g,true,'고리가 정확히 들어갔어요!',now);
    if(g.attempts>=5)return finish(g,false,'고리가 빗나갔어요. 황금 구역에서 던져 보세요.',now);
  }else if(g.kind==='cook'&&input.type==='flip'&&Number.isInteger(input.index)&&input.index>=0&&input.index<6){
    if(g.cooked[input.index])return g;g.lastInput=now;g.attempts++;
    const good=cookingPhase(g,input.index,now)==='gold';g.cooked[input.index]=good?1:-1;if(good)g.score++;
    if(g.score>=4)return finish(g,true,'겉은 바삭, 속은 촉촉! 맛있는 타코야키 완성.',now);
    advanceGame(g,now);
  }else if(g.kind==='fortune'&&input.type==='pick'&&Number.isInteger(input.index)&&input.index>=0&&input.index<3){
    g.lastInput=now;g.choice=input.index;g.prize=(g.seed+input.index*7)%3;g.score=1;return finish(g,true,'복주머니 속 선물이 당신의 것이에요!',now);
  }else if(g.kind==='ice'){
    if(input.type==='turn'&&g.turns<12){g.lastInput=now;g.turns++;g.score=g.turns;}
    else if(input.type==='syrup'&&g.turns===12&&Number.isInteger(input.index)&&input.index>=0&&input.index<3){
      g.lastInput=now;if(input.index===g.syrup)return finish(g,true,`${syrups[g.syrup]} 빙수 완성! 시원하게 한 입.`,now);
      g.attempts++;if(g.attempts>=2)return finish(g,false,'주문과 다른 시럽이에요. 다음에는 주문을 확인해 주세요.',now);
    }
  }
  return g;
}
export function rewardFor(g){
  if(!g.result?.won)return null;
  if(g.kind==='shoot')return {bottles:1,label:'포션 1병'};
  if(g.kind==='fish')return {ward:15,label:'홀림 보호 15초'};
  if(g.kind==='ring')return {speed:20,label:'이동 속도 +35% · 20초'};
  if(g.kind==='cook')return {energy:35,label:'요력 +35'};
  if(g.kind==='fortune')return [{bottles:1,label:'행운의 포션 1병'},{energy:45,label:'행운의 요력 +45'},{ward:20,label:'행운의 홀림 보호 20초'}][g.prize];
  return {energy:20,ward:8,label:'요력 +20 · 홀림 보호 8초'};
}
