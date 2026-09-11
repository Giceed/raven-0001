/* Erster spielbarer Raven: Bedürfnisse, Inventar, Mission und Player View. */
const RAVEN_INVENTORY_CAPACITY=30;
const RAVEN_ITEM_DEFS={
  futter:{name:"Futter",icon:"🍖"},
  feder:{name:"Rabenfeder",icon:"🪶"},
  glanzstein:{name:"Glanzstein",icon:"💎"}
};
let ravenItems=readRavenJSON("ravenItems",{futter:3,feder:0,glanzstein:0});
let ravenLife=readRavenJSON("ravenLife",{hunger:78,energy:82,mood:76,updatedAt:Date.now()});
let ravenPlayerView=localStorage.getItem("ravenPlayerView")!=="developer";

function readRavenJSON(key,fallback){try{return {...fallback,...JSON.parse(localStorage.getItem(key)||"null")};}catch{return {...fallback};}}
function clampRavenNeed(value){return Math.max(0,Math.min(100,Math.round(value)));}
function ravenInventoryCount(items=ravenItems){return Object.values(items).reduce((sum,value)=>sum+(Number(value)||0),0);}
function saveRavenLife(){ravenLife.updatedAt=Date.now();localStorage.setItem("ravenLife",JSON.stringify(ravenLife));}
function saveRavenItems(){localStorage.setItem("ravenItems",JSON.stringify(ravenItems));}
function applyRavenTime(){
  const elapsed=Math.min(48,(Date.now()-(Number(ravenLife.updatedAt)||Date.now()))/3600000);
  if(elapsed<=.02)return;
  ravenLife.hunger=clampRavenNeed(ravenLife.hunger-elapsed*2.2);
  ravenLife.energy=clampRavenNeed(ravenLife.energy-elapsed*1.3);
  ravenLife.mood=clampRavenNeed(ravenLife.mood-elapsed*.8);
  saveRavenLife();
}
function createRavenActivityReward(){
  const roll=Math.random(),reward={futter:roll<.18?2:1};
  if(roll>.68)reward.feder=1;
  if(roll>.94)reward.glanzstein=1;
  return reward;
}
function ravenRewardText(reward){return Object.entries(reward).filter(([,amount])=>amount>0).map(([id,amount])=>`${amount} ${RAVEN_ITEM_DEFS[id]?.name||id}`).join(" · ");}
function addRavenItems(reward){
  const amount=Object.values(reward).reduce((sum,value)=>sum+(Number(value)||0),0);
  if(ravenInventoryCount()+amount>RAVEN_INVENTORY_CAPACITY)return false;
  Object.entries(reward).forEach(([id,value])=>ravenItems[id]=(ravenItems[id]||0)+value);
  saveRavenItems();renderRavenGamePanel();return true;
}
function setRavenLifeMessage(text){const box=document.getElementById("ravenLifeMessage");if(box)box.textContent=text;}
function feedRaven(){
  if((ravenItems.futter||0)<1){setRavenLifeMessage("Kein Futter mehr – besuche einen Aktivitätspunkt.");return;}
  if(ravenLife.hunger>=100){setRavenLifeMessage("Raven ist bereits satt.");return;}
  ravenItems.futter--;ravenLife.hunger=clampRavenNeed(ravenLife.hunger+24);ravenLife.mood=clampRavenNeed(ravenLife.mood+4);
  saveRavenItems();saveRavenLife();setRavenLifeMessage("Raven hat gefressen und wirkt zufrieden.");renderRavenGamePanel();
}
function restRaven(){
  if(ravenLife.energy>=100){setRavenLifeMessage("Raven ist bereits ausgeruht.");return;}
  ravenLife.energy=clampRavenNeed(ravenLife.energy+20);ravenLife.hunger=clampRavenNeed(ravenLife.hunger-3);
  saveRavenLife();setRavenLifeMessage("Raven ruht sich einen Moment aus.");renderRavenGamePanel();
}
function playWithRaven(){
  if(ravenLife.energy<8){setRavenLifeMessage("Raven ist zu müde zum Spielen.");return;}
  ravenLife.energy=clampRavenNeed(ravenLife.energy-8);ravenLife.mood=clampRavenNeed(ravenLife.mood+18);
  saveRavenLife();setRavenLifeMessage("Raven hüpft neugierig um dich herum.");renderRavenGamePanel();
}
function ravenMoodStatus(){
  const lowest=Math.min(ravenLife.hunger,ravenLife.energy,ravenLife.mood);
  if(lowest<20)return "Braucht dich";if(lowest<45)return "Unruhig";if(lowest<75)return "Zufrieden";return "Glücklich";
}
function renderRavenGamePanel(){
  applyRavenTime();
  [["ravenHunger",ravenLife.hunger],["ravenEnergy",ravenLife.energy],["ravenMood",ravenLife.mood]].forEach(([id,value])=>{const bar=document.getElementById(id+"Bar"),text=document.getElementById(id+"Value");if(bar)bar.style.width=value+"%";if(text)text.textContent=value;});
  const mood=document.getElementById("ravenMoodLabel");if(mood)mood.textContent=ravenMoodStatus();
  const inventory=document.getElementById("inventoryCapacity");if(inventory)inventory.textContent=`${ravenInventoryCount()} / ${RAVEN_INVENTORY_CAPACITY}`;
  const slots=document.getElementById("inventorySlots");if(slots)slots.innerHTML=Object.entries(RAVEN_ITEM_DEFS).map(([id,item])=>`<div class="inventory-slot"><span>${item.icon}</span><div><b>${item.name}</b><small>${ravenItems[id]||0} Stück</small></div></div>`).join("");
  const points=typeof ALL_POINTS!=="undefined"?ALL_POINTS.filter(point=>point.type==="exploration"&&normalizePlaceName(point.district||"Fürstenberg")===normalizePlaceName("Fürstenberg")):[];
  const found=typeof isDiscovered==="function"?points.filter(isDiscovered).length:0,percent=points.length?Math.round(found/points.length*100):0;
  const state=document.getElementById("storyMissionState"),bar=document.getElementById("storyMissionBar"),text=document.getElementById("storyMissionText");
  if(state)state.textContent=fuerstenbergMission?.completed?"✓ GESCHAFFT":`${found}/${points.length}`;if(bar)bar.style.width=percent+"%";
  if(text)text.textContent=fuerstenbergMission?.completed?"Fürstenberg ist vollständig entdeckt und im Reisetagebuch verewigt.":`Entdecke noch ${Math.max(0,points.length-found)} Erkundungspunkt${points.length-found===1?"":"e"} und vertreibe den Fog.`;
}
function applyRavenPlayerView(){
  document.body.classList.toggle("player-view",ravenPlayerView);
  localStorage.setItem("ravenPlayerView",ravenPlayerView?"player":"developer");
  const button=document.getElementById("playerViewToggle");if(button)button.textContent=ravenPlayerView?"🛠 ENTWICKLER":"🎮 SPIELERANSICHT";
  if(ravenPlayerView&&typeof godMode!=="undefined"&&godMode&&typeof toggleGodMode==="function")toggleGodMode();
}
function toggleRavenPlayerView(){ravenPlayerView=!ravenPlayerView;applyRavenPlayerView();}
window.addEventListener("DOMContentLoaded",()=>{applyRavenTime();applyRavenPlayerView();renderRavenGamePanel();setInterval(()=>{renderRavenGamePanel();if(typeof renderMainLists==="function")renderMainLists();},30000);});

