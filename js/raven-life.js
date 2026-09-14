/* Erster spielbarer Raven: Bedürfnisse, Inventar, Mission und Player View. */
const RAVEN_INVENTORY_CAPACITY=30;
const RAVEN_OFFLINE_DECAY_CAP_HOURS=24;
const RAVEN_ITEM_DEFS={
  beeren:{name:"Beeren",icon:"🫐",use:"food",hunger:10,mood:1},
  futter:{name:"Futter",icon:"🍖",use:"food",hunger:24,mood:4},
  lieblingsfutter:{name:"Lieblingsfutter",icon:"🥜",use:"food",hunger:36,mood:10},
  energiekorn:{name:"Energiekorn",icon:"🌾",use:"energy",energy:18},
  feder:{name:"Rabenfeder",icon:"🪶"},
  glanzstein:{name:"Glanzstein",icon:"💎"}
};
let ravenItems=readRavenJSON("ravenItems",{beeren:2,futter:3,lieblingsfutter:0,energiekorn:0,feder:0,glanzstein:0});
let ravenLife=normalizeRavenLifeState(readRavenJSON("ravenLife",{hunger:78,energy:82,mood:76,movementMeters:0,updatedAt:Date.now(),sleepStartedAt:0,sleepUntil:0,sleepStartEnergy:0}));
let ravenPendingItems=readRavenJSON("ravenPendingItems",{beeren:0,futter:0,lieblingsfutter:0,energiekorn:0,feder:0,glanzstein:0});
let ravenProfile=readRavenJSON("ravenProfile",{name:"Raven",onboardingDone:false});
let ravenDaily=loadRavenDaily();
let ravenTestMode=false;
function isRavenPlayerLocked(search=location.search){return new URLSearchParams(search).get("view")==="player";}
const ravenPlayerLocked=isRavenPlayerLocked();
let ravenPlayerView=ravenPlayerLocked||localStorage.getItem("ravenPlayerView")!=="developer";

function readRavenJSON(key,fallback){try{return {...fallback,...JSON.parse(localStorage.getItem(key)||"null")};}catch{return {...fallback};}}
function finiteRavenNumber(value,fallback){const number=Number(value);return Number.isFinite(number)?number:fallback;}
function normalizeRavenLifeState(value={},now=Date.now()){
  const sleepUntil=Math.min(Math.max(0,finiteRavenNumber(value.sleepUntil,0)),now+10*60000);
  const sleepStartedAt=Math.min(Math.max(0,finiteRavenNumber(value.sleepStartedAt,0)),sleepUntil||now);
  return {...value,
    hunger:clampRavenNeed(finiteRavenNumber(value.hunger,78)),energy:clampRavenNeed(finiteRavenNumber(value.energy,82)),mood:clampRavenNeed(finiteRavenNumber(value.mood,76)),
    movementMeters:Math.max(0,finiteRavenNumber(value.movementMeters,0)),updatedAt:Math.max(0,finiteRavenNumber(value.updatedAt,now)),
    sleepStartedAt,sleepUntil,sleepStartEnergy:clampRavenNeed(finiteRavenNumber(value.sleepStartEnergy,0))
  };
}
function ravenToday(){return new Date().toISOString().slice(0,10);}
function loadRavenDaily(){const saved=readRavenJSON("ravenDaily",{});return saved.date===ravenToday()?{date:ravenToday(),feed:saved.feed||0,play:saved.play||0,collect:saved.collect||0,rewarded:Boolean(saved.rewarded)}:{date:ravenToday(),feed:0,play:0,collect:0,rewarded:false};}
function clampRavenNeed(value){return Math.max(0,Math.min(100,Math.round(value)));}
function ravenInventoryCount(items=ravenItems){return Object.values(items).reduce((sum,value)=>sum+(Number(value)||0),0);}
function saveRavenLife(){ravenLife.updatedAt=Date.now();localStorage.setItem("ravenLife",JSON.stringify(ravenLife));}
function saveRavenItems(){localStorage.setItem("ravenItems",JSON.stringify(ravenItems));}
function isRavenSleeping(now=Date.now()){return Number(ravenLife.sleepUntil)>now;}
function ravenSleepRemaining(now=Date.now()){return Math.max(0,Math.ceil((Number(ravenLife.sleepUntil||0)-now)/1000));}
function applyRavenSleep(now=Date.now()){
  const until=Number(ravenLife.sleepUntil)||0,started=Number(ravenLife.sleepStartedAt)||0;if(!until||!started)return;
  const duration=Math.max(1,until-started),progress=Math.max(0,Math.min(1,(now-started)/duration)),startEnergy=Number(ravenLife.sleepStartEnergy)||0;
  ravenLife.energy=clampRavenNeed(Math.max(ravenLife.energy,startEnergy+(100-startEnergy)*progress));
  if(now>=until){ravenLife.energy=100;ravenLife.sleepUntil=0;ravenLife.sleepStartedAt=0;ravenLife.sleepStartEnergy=0;saveRavenLife();setRavenLifeMessage(`${ravenProfile.name} ist ausgeschlafen und wieder bereit.`);}
}
function applyRavenTime(now=Date.now()){
  ravenLife=normalizeRavenLifeState(ravenLife,now);
  applyRavenSleep(now);
  const elapsed=Math.max(0,Math.min(RAVEN_OFFLINE_DECAY_CAP_HOURS,(now-(Number(ravenLife.updatedAt)||now))/3600000));
  if(elapsed<=.02)return;
  ravenLife.hunger=clampRavenNeed(ravenLife.hunger-elapsed*2.2);
  ravenLife.energy=clampRavenNeed(ravenLife.energy-elapsed*1.3);
  ravenLife.mood=clampRavenNeed(ravenLife.mood-elapsed*.8);
  ravenLife.updatedAt=now;localStorage.setItem("ravenLife",JSON.stringify(ravenLife));
}
function createRavenActivityReward(point={}){
  const name=String(point.name||"").toLowerCase(),roll=Math.random();let reward;
  if(name.includes("brunnen"))reward={beeren:roll<.3?2:1};
  else if(name.includes("spiel"))reward={futter:1};
  else if(name.includes("sport"))reward={energiekorn:1};
  else reward={beeren:1};
  if(roll>.72)reward.feder=1;
  if(roll>.96)reward.glanzstein=1;
  return reward;
}
function ravenRewardText(reward){return Object.entries(reward).filter(([,amount])=>amount>0).map(([id,amount])=>`${amount} ${RAVEN_ITEM_DEFS[id]?.name||id}`).join(" · ");}
function addRavenItems(reward){
  const amount=Object.values(reward).reduce((sum,value)=>sum+(Number(value)||0),0);
  if(ravenInventoryCount()+amount>RAVEN_INVENTORY_CAPACITY)return false;
  Object.entries(reward).forEach(([id,value])=>ravenItems[id]=(ravenItems[id]||0)+value);
  saveRavenItems();renderRavenGamePanel();return true;
}
function grantRavenMissionItems(reward){
  if(addRavenItems(reward))return true;
  Object.entries(reward).forEach(([id,value])=>ravenPendingItems[id]=(ravenPendingItems[id]||0)+value);
  localStorage.setItem("ravenPendingItems",JSON.stringify(ravenPendingItems));return false;
}
function claimPendingRavenItems(){
  let free=RAVEN_INVENTORY_CAPACITY-ravenInventoryCount(),changed=false;
  Object.keys(ravenPendingItems).forEach(id=>{const amount=Math.min(free,ravenPendingItems[id]||0);if(amount>0){ravenItems[id]=(ravenItems[id]||0)+amount;ravenPendingItems[id]-=amount;free-=amount;changed=true;}});
  if(changed){saveRavenItems();localStorage.setItem("ravenPendingItems",JSON.stringify(ravenPendingItems));}
}
function setRavenLifeMessage(text){const box=document.getElementById("ravenLifeMessage");if(box)box.textContent=text;}
function feedRaven(itemId){
  if(isRavenSleeping()){setRavenLifeMessage(`${ravenProfile.name} schläft gerade.`);return;}
  const chosen=itemId||(ravenItems.beeren>0?"beeren":ravenItems.futter>0?"futter":ravenItems.lieblingsfutter>0?"lieblingsfutter":null),item=RAVEN_ITEM_DEFS[chosen];
  if(!chosen||!item||item.use!=="food"||(ravenItems[chosen]||0)<1){setRavenLifeMessage("Kein Futter mehr – besuche einen Aktivitätspunkt.");return;}
  if(ravenLife.hunger>=100){setRavenLifeMessage("Raven ist bereits satt.");return;}
  ravenItems[chosen]--;ravenLife.hunger=clampRavenNeed(ravenLife.hunger+item.hunger);ravenLife.mood=clampRavenNeed(ravenLife.mood+item.mood);
  saveRavenItems();saveRavenLife();recordDailyTask("feed");setRavenLifeMessage(`${item.icon} ${item.name}: Raven hat gefressen und wirkt zufrieden.`);renderRavenGamePanel();
}
function useRavenItem(itemId){const item=RAVEN_ITEM_DEFS[itemId];if(!item)return;if(item.use==="food")return feedRaven(itemId);if(item.use==="energy"&&(ravenItems[itemId]||0)>0){if(ravenLife.energy>=100){setRavenLifeMessage("Raven hat bereits volle Energie.");return;}ravenItems[itemId]--;ravenLife.energy=clampRavenNeed(ravenLife.energy+item.energy);saveRavenItems();saveRavenLife();setRavenLifeMessage(`${item.icon} Raven erhält ${item.energy} Energie.`);renderRavenGamePanel();}}
function restRaven(){
  if(isRavenSleeping()){setRavenLifeMessage(`${ravenProfile.name} schläft noch ${Math.ceil(ravenSleepRemaining()/60)} Minute(n).`);return;}
  if(ravenLife.energy>=100){setRavenLifeMessage("Raven ist bereits ausgeruht.");return;}
  const minutes=Math.max(1,Math.min(10,Math.ceil((100-ravenLife.energy)/10)));ravenLife.sleepStartedAt=Date.now();ravenLife.sleepUntil=Date.now()+minutes*60000;ravenLife.sleepStartEnergy=ravenLife.energy;
  saveRavenLife();setRavenLifeMessage(`${ravenProfile.name} schläft jetzt ungefähr ${minutes} Minute(n).`);renderRavenGamePanel();
}
function playWithRaven(){
  if(isRavenSleeping()){setRavenLifeMessage(`${ravenProfile.name} schläft gerade.`);return;}
  if(ravenLife.energy<8){setRavenLifeMessage("Raven ist zu müde zum Spielen.");return;}
  ravenLife.energy=clampRavenNeed(ravenLife.energy-8);ravenLife.hunger=clampRavenNeed(ravenLife.hunger-6);ravenLife.mood=clampRavenNeed(ravenLife.mood+18);
  saveRavenLife();recordDailyTask("play");setRavenLifeMessage("Raven spielt begeistert – das kostet Energie und macht hungrig.");renderRavenGamePanel();
}
function effectiveRavenMood(){return Math.min(ravenLife.mood,clampRavenNeed((ravenLife.hunger+ravenLife.energy)/2+15));}
function ravenMoodStatus(){
  const lowest=Math.min(ravenLife.hunger,ravenLife.energy,effectiveRavenMood());
  if(lowest<20)return "Braucht dich";if(lowest<45)return "Unruhig";if(lowest<75)return "Zufrieden";return "Glücklich";
}
function canRavenStartExploration(){
  if(isRavenSleeping())return {ok:false,message:`${ravenProfile.name} schläft noch ungefähr ${Math.ceil(ravenSleepRemaining()/60)} Minute(n).`};
  if(ravenLife.hunger<10)return {ok:false,message:`${ravenProfile.name} ist zu hungrig für eine neue Erkundung. Füttere ihn zuerst.`};
  if(ravenLife.energy<10)return {ok:false,message:`${ravenProfile.name} ist zu erschöpft für eine neue Erkundung. Lass ihn zuerst ausruhen.`};
  return {ok:true,message:""};
}
function applyRavenMovement(meters){ravenLife.movementMeters=(ravenLife.movementMeters||0)+Math.max(0,meters||0);if(ravenLife.movementMeters<250)return;const steps=Math.floor(ravenLife.movementMeters/250);ravenLife.movementMeters-=steps*250;ravenLife.hunger=clampRavenNeed(ravenLife.hunger-steps);ravenLife.energy=clampRavenNeed(ravenLife.energy-steps*.6);saveRavenLife();renderRavenGamePanel();}
function recordDailyTask(task,amount=1){if(ravenTestMode)return;ravenDaily=loadRavenDaily();ravenDaily[task]=(ravenDaily[task]||0)+amount;const done=ravenDaily.feed>0&&ravenDaily.play>0&&ravenDaily.collect>0;if(done&&!ravenDaily.rewarded){ravenDaily.rewarded=true;grantRavenMissionItems({lieblingsfutter:1});if(typeof addXP==="function")addXP(20);setRavenLifeMessage("☀️ Tagesaufgaben geschafft: Lieblingsfutter und 20 XP!");}localStorage.setItem("ravenDaily",JSON.stringify(ravenDaily));renderRavenGamePanel();}
function openRavenNaming(){const overlay=document.getElementById("onboardingOverlay"),input=document.getElementById("ravenNameInput");if(overlay)overlay.style.display="flex";if(input){input.value=ravenProfile.name==="Raven"?"":ravenProfile.name;input.focus();}}
function finishRavenOnboarding(){const input=document.getElementById("ravenNameInput"),name=String(input?.value||"").trim().slice(0,18);ravenProfile.name=name||"Raven";ravenProfile.onboardingDone=true;localStorage.setItem("ravenProfile",JSON.stringify(ravenProfile));document.getElementById("onboardingOverlay").style.display="none";setRavenLifeMessage(`${ravenProfile.name} ist bereit für euer Abenteuer.`);renderRavenGamePanel();}
function skipRavenOnboarding(){ravenProfile.onboardingDone=true;localStorage.setItem("ravenProfile",JSON.stringify(ravenProfile));document.getElementById("onboardingOverlay").style.display="none";renderRavenGamePanel();}
function renderRavenGamePanel(){
  applyRavenTime();claimPendingRavenItems();
  const shownMood=effectiveRavenMood();
  [["ravenHunger",ravenLife.hunger],["ravenEnergy",ravenLife.energy],["ravenMood",shownMood]].forEach(([id,value])=>{const bar=document.getElementById(id+"Bar"),text=document.getElementById(id+"Value");if(bar)bar.style.width=value+"%";if(text)text.textContent=Math.round(value);});
  const mood=document.getElementById("ravenMoodLabel");if(mood)mood.textContent=ravenMoodStatus();
  const title=document.getElementById("ravenTitle");if(title)title.textContent=`${ravenProfile.name.toUpperCase()} #0001`;
  const sleeping=isRavenSleeping(),avatar=document.getElementById("ravenAvatar");if(avatar){const status=ravenMoodStatus();avatar.textContent=sleeping?"🐦‍⬛💤":status==="Braucht dich"?"🐦‍⬛❗":ravenLife.energy<30?"🐦‍⬛💤":ravenLife.hunger<30?"🐦‍⬛🍽️":shownMood>80?"🐦‍⬛✨":"🐦‍⬛";avatar.dataset.mood=sleeping?"Schläft":status;}
  const feedButton=document.getElementById("ravenFeedButton"),restButton=document.getElementById("ravenRestButton"),playButton=document.getElementById("ravenPlayButton");if(feedButton)feedButton.disabled=sleeping;if(playButton)playButton.disabled=sleeping;if(restButton){restButton.disabled=sleeping;restButton.textContent=sleeping?`💤 ${Math.floor(ravenSleepRemaining()/60)}:${String(ravenSleepRemaining()%60).padStart(2,"0")}`:"🌙 Schlafen";}
  const inventory=document.getElementById("inventoryCapacity");if(inventory)inventory.textContent=`${ravenInventoryCount()} / ${RAVEN_INVENTORY_CAPACITY}`;
  const slots=document.getElementById("inventorySlots");if(slots)slots.innerHTML=Object.entries(RAVEN_ITEM_DEFS).map(([id,item])=>`<div class="inventory-slot"><span>${item.icon}</span><div><b>${item.name}</b><small>${ravenItems[id]||0} Stück</small></div>${item.use?`<button onclick="useRavenItem('${id}')" ${(ravenItems[id]||0)<1?"disabled":""}>Nutzen</button>`:""}</div>`).join("");
  ravenDaily=loadRavenDaily();const dailyTasks=[{id:"feed",label:"Raven füttern"},{id:"play",label:"Mit Raven spielen"},{id:"collect",label:"Aktivitätspunkt sammeln"}],dailyDone=dailyTasks.filter(task=>(ravenDaily[task.id]||0)>0).length;
  const dailyState=document.getElementById("dailyState"),dailyList=document.getElementById("dailyList");if(dailyState)dailyState.textContent=ravenDaily.rewarded?"✓ FERTIG":`${dailyDone}/3`;if(dailyList)dailyList.innerHTML=dailyTasks.map(task=>`<div class="daily-row ${(ravenDaily[task.id]||0)>0?"done":""}"><span>${(ravenDaily[task.id]||0)>0?"✓":"○"}</span>${task.label}</div>`).join("");
  const points=typeof ALL_POINTS!=="undefined"?ALL_POINTS.filter(point=>point.type==="exploration"&&normalizePlaceName(point.district||"Fürstenberg")===normalizePlaceName("Fürstenberg")):[];
  const found=typeof isDiscovered==="function"?points.filter(isDiscovered).length:0,percent=points.length?Math.round(found/points.length*100):0;
  const state=document.getElementById("storyMissionState"),bar=document.getElementById("storyMissionBar"),text=document.getElementById("storyMissionText");
  if(state)state.textContent=fuerstenbergMission?.completed?"✓ GESCHAFFT":`${found}/${points.length}`;if(bar)bar.style.width=percent+"%";
  if(text)text.textContent=fuerstenbergMission?.completed?"Fürstenberg ist vollständig entdeckt und im Reisetagebuch verewigt.":`Entdecke noch ${Math.max(0,points.length-found)} Erkundungspunkt${points.length-found===1?"":"e"} und vertreibe den Fog.`;
}
function applyRavenPlayerView(){
  document.body.classList.toggle("player-view",ravenPlayerView);
  document.body.classList.toggle("player-locked",ravenPlayerLocked);
  localStorage.setItem("ravenPlayerView",ravenPlayerView?"player":"developer");
  const button=document.getElementById("playerViewToggle");if(button)button.textContent=ravenPlayerView?"🛠 ENTWICKLER":"🎮 SPIELERANSICHT";
  if(ravenPlayerView&&typeof godMode!=="undefined"&&godMode&&typeof toggleGodMode==="function")toggleGodMode();
}
function toggleRavenPlayerView(){if(ravenPlayerLocked)return;ravenPlayerView=!ravenPlayerView;applyRavenPlayerView();}
window.addEventListener("storage",event=>{
  if(event.key==="ravenLife"&&event.newValue)ravenLife=normalizeRavenLifeState(readRavenJSON("ravenLife",ravenLife));
  if(event.key==="ravenItems"&&event.newValue)ravenItems=readRavenJSON("ravenItems",ravenItems);
  if(event.key==="ravenPendingItems"&&event.newValue)ravenPendingItems=readRavenJSON("ravenPendingItems",ravenPendingItems);
  if(event.key==="ravenProfile"&&event.newValue)ravenProfile=readRavenJSON("ravenProfile",ravenProfile);
  if(event.key==="ravenDaily"&&event.newValue)ravenDaily=loadRavenDaily();
  if(event.key==="ravenFuerstenbergMission"&&event.newValue){
    try{fuerstenbergMission=JSON.parse(event.newValue);}catch{}
  }
  if(event.key==="ravenXP")xp=Number(event.newValue)||0;
  if(event.key==="ravenLevel")level=Number(event.newValue)||1;
  if(["ravenLife","ravenItems","ravenPendingItems","ravenProfile","ravenDaily","ravenFuerstenbergMission","ravenXP","ravenLevel","ravenActivityCooldowns"].includes(event.key)){
    renderRavenGamePanel();
    if(typeof updateUI==="function")updateUI();
    if(typeof renderMainLists==="function")renderMainLists();
    if(typeof renderTravelBook==="function")renderTravelBook();
    if(typeof updateAllPointStates==="function"&&currentLat!==null&&currentLon!==null)updateAllPointStates(currentLat,currentLon);
  }
  if(event.key==="ravenSharedPoisLive")location.reload();
});
window.addEventListener("DOMContentLoaded",()=>{applyRavenTime();applyRavenPlayerView();renderRavenGamePanel();if(ravenPlayerLocked&&!ravenProfile.onboardingDone)openRavenNaming();setInterval(()=>{renderRavenGamePanel();if(typeof renderMainLists==="function")renderMainLists();},30000);setInterval(()=>{if(isRavenSleeping())renderRavenGamePanel();},1000);});

