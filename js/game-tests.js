/* Zehn isolierte Belastungstests für Raven, Items und Player View. */
function ravenLifeTestResult(name,ok,detail){return {name,ok:Boolean(ok),detail};}
async function runRavenLifeTests(){
  const output=document.getElementById("lifeTestResult");if(!output)return;
  output.className="edge-test-result running";output.textContent="⏳ Raven wird mit Extremfällen geprüft …";
  const lifeSnapshot=JSON.parse(JSON.stringify(ravenLife)),itemSnapshot=JSON.parse(JSON.stringify(ravenItems)),pendingSnapshot=JSON.parse(JSON.stringify(ravenPendingItems)),messageSnapshot=document.getElementById("ravenLifeMessage")?.textContent||"";
  const storedLife=localStorage.getItem("ravenLife"),storedItems=localStorage.getItem("ravenItems"),storedPending=localStorage.getItem("ravenPendingItems"),storedCooldowns=localStorage.getItem("ravenActivityCooldowns"),results=[];
  try{
    ravenTestMode=true;
    ravenLife={hunger:50,energy:50,mood:50,updatedAt:Date.now()};ravenItems={futter:2,feder:0,glanzstein:0};feedRaven();
    results.push(ravenLifeTestResult("1 · Füttern",ravenItems.futter===1&&ravenLife.hunger===74&&ravenLife.mood===54,"1 Futter verbraucht · Hunger +24 · Stimmung +4"));
    ravenLife={hunger:50,energy:50,mood:50,updatedAt:Date.now()};playWithRaven();
    results.push(ravenLifeTestResult("2 · Spielen",ravenLife.hunger===44&&ravenLife.energy===42&&ravenLife.mood===68,"Hunger −6 · Energie −8 · Stimmung +18"));
    ravenLife={hunger:50,energy:7,mood:50,updatedAt:Date.now()};playWithRaven();
    results.push(ravenLifeTestResult("3 · Erschöpfung",ravenLife.energy===7&&ravenLife.hunger===50&&ravenLife.mood===50,"unter 8 Energie wird Spielen blockiert"));
    ravenLife={hunger:50,energy:50,mood:50,updatedAt:Date.now(),sleepStartedAt:0,sleepUntil:0,sleepStartEnergy:0};restRaven();const sleepScheduled=ravenLife.sleepUntil-ravenLife.sleepStartedAt===5*60000&&isRavenSleeping();ravenLife.sleepStartedAt=Date.now()-5*60000;ravenLife.sleepUntil=Date.now()-1;applyRavenSleep();
    results.push(ravenLifeTestResult("4 · Schlafmodus",sleepScheduled&&ravenLife.energy===100&&!isRavenSleeping(),"bei 50 Energie werden 5 Minuten geplant · danach Energie 100"));
    results.push(ravenLifeTestResult("5 · Wertebegrenzung",clampRavenNeed(-20)===0&&clampRavenNeed(120)===100&&clampRavenNeed(49.6)===50,"kein Wert fällt unter 0 oder über 100"));
    ravenItems={futter:30,feder:0,glanzstein:0};
    results.push(ravenLifeTestResult("6 · Volles Inventar",addRavenItems({futter:1})===false&&ravenInventoryCount()===30,"der 31. Platz wird abgewiesen"));
    ravenItems={futter:29,feder:0,glanzstein:0};ravenPendingItems={futter:3,feder:0,glanzstein:0};claimPendingRavenItems();
    results.push(ravenLifeTestResult("7 · Vorgemerkte Belohnung",ravenItems.futter===30&&ravenPendingItems.futter===2,"ein freier Platz gefüllt · Rest bleibt sicher vorgemerkt"));
    const samples=[{name:"Brunnen"},{name:"Spielplatz"},{name:"Sportplatz"},{name:"Park"}].flatMap(point=>Array.from({length:75},()=>createRavenActivityReward(point))),valid=samples.every(reward=>Object.values(reward).reduce((sum,value)=>sum+value,0)>=1&&(reward.feder||0)<=1&&(reward.glanzstein||0)<=1&&Object.keys(reward).every(id=>RAVEN_ITEM_DEFS[id]));
    results.push(ravenLifeTestResult("8 · Ortsabhängige Funde",valid,"300 Brunnen-, Spielplatz-, Sportplatz- und Park-Funde geprüft"));
    results.push(ravenLifeTestResult("9 · Aktivitäts-Cooldown",typeof ACTIVITY_COOLDOWN_MS!=="undefined"&&ACTIVITY_COOLDOWN_MS===60*1000,"Aktivität bleibt im Prototyp exakt 1 Minute erschöpft"));
    results.push(ravenLifeTestResult("10 · NFC-Spielersperre",isRavenPlayerLocked("?view=player")&&!isRavenPlayerLocked("?v=developer"),"Spielerlink gesperrt · Entwicklerlink frei"));
    ravenLife={hunger:50,energy:50,mood:50,movementMeters:0,updatedAt:Date.now()};applyRavenMovement(999);const beforeStep=ravenLife.hunger===50&&ravenLife.energy===50;applyRavenMovement(1);
    results.push(ravenLifeTestResult("11 · Bewegungskosten",beforeStep&&ravenLife.hunger===49&&ravenLife.energy===49,"nach 1 km sinken Hunger um 1 und Energie um 0,6"));
    ravenLife={hunger:20,energy:100,mood:100,movementMeters:0,updatedAt:Date.now()};
    results.push(ravenLifeTestResult("12 · Abhängige Stimmung",effectiveRavenMood()===75&&ravenMoodStatus()==="Unruhig","volle Laune kann Hunger nicht überdecken"));
    const offlineNow=Date.now();ravenLife={hunger:80,energy:80,mood:80,movementMeters:0,updatedAt:offlineNow-7*24*3600000};applyRavenTime(offlineNow);
    results.push(ravenLifeTestResult("13 · Faire Abwesenheit",ravenLife.hunger===27&&ravenLife.energy===49&&ravenLife.mood===61,"eine Woche Abwesenheit wird höchstens wie 24 Stunden berechnet"));
    const broken=normalizeRavenLifeState({hunger:-500,energy:Infinity,mood:240,movementMeters:-12,updatedAt:"kaputt",sleepUntil:Infinity},offlineNow);
    results.push(ravenLifeTestResult("14 · Kaputte Speicherdaten",broken.hunger===0&&broken.energy===82&&broken.mood===100&&broken.movementMeters===0&&broken.updatedAt===offlineNow&&broken.sleepUntil===0,"ungültige Werte werden sicher repariert und begrenzt"));
    ravenLife={hunger:50,energy:50,mood:50,movementMeters:0,updatedAt:offlineNow+24*3600000};applyRavenTime(offlineNow);
    results.push(ravenLifeTestResult("15 · Uhrzeit in der Zukunft",ravenLife.hunger===50&&ravenLife.energy===50&&ravenLife.mood===50,"eine falsche Gerätezeit zieht keine Bedürfnisse ab"));
    ravenLife={hunger:0,energy:0,mood:15,movementMeters:0,updatedAt:Date.now(),sleepStartedAt:0,sleepUntil:0,sleepStartEnergy:0};ravenItems={futter:1,feder:0,glanzstein:0};feedRaven("futter");restRaven();
    results.push(ravenLifeTestResult("16 · Erschöpfter Raven erholt sich",ravenLife.hunger===24&&ravenLife.mood===19&&isRavenSleeping()&&ravenLife.sleepUntil-ravenLife.sleepStartedAt===10*60000,"Füttern und Schlafen lösen den Nullzustand ohne Reset"));
    localStorage.setItem("ravenActivityCooldowns","{kaputt");
    results.push(ravenLifeTestResult("17 · Kaputter Cooldown-Speicher",Object.keys(getActivityCooldowns()).length===0,"beschädigte Daten blockieren keinen Aktivitätspunkt"));
    const cooldownNow=Date.now();localStorage.setItem("ravenActivityCooldowns",JSON.stringify({alt:cooldownNow-1,okay:cooldownNow+30000,falsch:"nie",zuLang:cooldownNow+3600000}));const cooldowns=getActivityCooldowns(cooldownNow);
    results.push(ravenLifeTestResult("18 · Abgelaufener Cooldown",!("alt" in cooldowns)&&cooldowns.okay===cooldownNow+30000&&!("falsch" in cooldowns),"abgelaufene und ungültige Einträge werden verworfen"));
    results.push(ravenLifeTestResult("19 · Cooldown-Begrenzung",cooldowns.zuLang===cooldownNow+ACTIVITY_COOLDOWN_MS,"ein fehlerhafter Cooldown kann höchstens eine Minute sperren"));
    const jsonFallback={safe:true};
    results.push(ravenLifeTestResult("20 · Allgemeine Speicherdaten",parseRavenJSONText("{defekt",jsonFallback)===jsonFallback&&parseRavenJSONText("null",jsonFallback)===jsonFallback&&parseRavenJSONText('{"ok":1}',jsonFallback).ok===1,"Mission, Fog, Reisen und Studio überstehen beschädigte JSON-Daten"));
    const visualHungry=ravenVisualState({hunger:10,energy:90,mood:90},false,65),visualTired=ravenVisualState({hunger:90,energy:10,mood:90},false,65),visualHappy=ravenVisualState({hunger:90,energy:90,mood:90},false,90);
    results.push(ravenLifeTestResult("21 · Tamagotchi-Zustände",visualHungry.state==="hungry"&&visualTired.state==="tired"&&visualHappy.state==="happy"&&ravenVisualState({},true,90).state==="sleeping","Hunger, Müdigkeit, Glück und Schlaf erzeugen eindeutige Ansichten"));
  }catch(error){results.push(ravenLifeTestResult("Testsystem",false,error.message||String(error)));}
  finally{
    ravenTestMode=false;
    ravenLife=lifeSnapshot;ravenItems=itemSnapshot;ravenPendingItems=pendingSnapshot;
    [["ravenLife",storedLife],["ravenItems",storedItems],["ravenPendingItems",storedPending],["ravenActivityCooldowns",storedCooldowns]].forEach(([key,value])=>value===null?localStorage.removeItem(key):localStorage.setItem(key,value));
    renderRavenGamePanel();setRavenLifeMessage(messageSnapshot);
  }
  const passed=results.filter(result=>result.ok).length,total=results.length;output.className=`edge-test-result ${passed===total?"ok":"error"}`;
  output.innerHTML=`<strong>${passed===total?"✓":"⚠"} ${passed}/${total} Raven-Stresstests bestanden</strong><div class="edge-test-grid">${results.map(result=>`<div class="edge-test-row ${result.ok?"ok":"error"}"><b>${result.ok?"✓":"✕"} ${escapeHTML(result.name)}</b><span>${escapeHTML(result.detail)}</span></div>`).join("")}</div>`;
  if(typeof logRavenEvent==="function")logRavenEvent("Raven-Stresstest",`${passed}/${total} bestanden`);
}

