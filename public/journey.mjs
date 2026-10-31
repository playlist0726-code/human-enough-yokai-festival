export function journeySteps(player){
 const s=player?.stats||{};
 return [
  {title:'Explore the festival',hint:'Move with WASD, arrow keys or the touch stick.',done:(s.distanceWalked||0)>=2},
  {title:'Collect a potion',hint:'Walk up to a glowing bottle and press E.',done:(s.potionsCollected||0)>0},
  {title:'Restore your spirit',hint:'Press Q to drink a potion when spirit is below 100.',done:(s.potionsUsed||0)>0},
  {title:'Charm a guest',hint:'Press F near a human. They follow for 5 seconds, then wait.',done:(s.charmed||0)>0},
  {title:'Win a festival prize',hint:'Approach any stall and press E to play.',done:(s.stallsWon||0)>0},
  {title:'Break a cursed seal',hint:'During an invasion, press E at a purple seal and stay close.',done:(player?.combatStats?.seals||0)>0},
  {title:'Protect your crew',hint:'C Ward blocks shadow attacks; E rescues a sealed friend.',done:(player?.combatStats?.wards||0)>0||(player?.combatStats?.revives||0)>0},
  {title:'Escort a guest uphill',hint:'Charm again from each stopping point to reach the shrine.',done:(player?.delivered||0)>0},
 ];
}
