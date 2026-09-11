/* Zehn isolierte Belastungstests für Raven, Items und Player View. */
function ravenLifeTestResult(name,ok,detail){return {name,ok:Boolean(ok),detail};}
async function runRavenLifeTests(){
  const output=document.getElementById("lifeTestResult");if(!output)return;
  output.className="edge-test-result running";output.textContent="⏳ Raven wird mit Extremfällen geprüft …";
  const lifeSnapshot=JSON.parse(JSON.stringify(ravenLife)),itemSnapshot=JSON.parse(JSON.stringify(ravenItems)),pendingSnapshot=JSON.parse(JSON.stringify(ravenPendingItems)),messageSnapshot=document.getElementById("ravenLifeMessage")?.textContent||"";
  const storedLife=localStorage.getItem("ravenLife"),storedItems=localStorage.getItem("ravenItems"),storedPending=localStorage.getItem("ravenPendingItems"),results=[];
  try{
    ravenTestMode=true;
    ravenLife={hunger:50,energy:50,mood:50,updatedAt:Date.now()};ravenItems={futter:2,feder:0,glanzstein:0};feedRaven();
    results.push(ravenLifeTestResult("1 · Füttern",ravenItems.futter===1&&ravenLife.hunger===74&&ravenLife.mood===54,"1 Futter verbraucht · Hunger +24 · Stimmung +4"));
    ravenLife={hunger:50,energy:50,mood:50,updatedAt:Date.now()};playWithRaven();
    results.push(ravenLifeTestResult("2 · Spielen",ravenLife.hunger===44&&ravenLife.energy===42&&ravenLife.mood===68,"Hunger −6 · Energie −8 · Stimmung +18"));
    ravenLife={hunger:50,energy:7,mood:50,updatedAt:Date.now()};playWithRaven();
    results.push(ravenLifeTestResult("3 · Erschöpfung",ravenLife.energy===7&&ravenLife.hunger===50&&ravenLife.mood===50,"unter 8 Energie wird Spielen blockiert"));
    ravenLife={hunger:50,energy:50,mood:50,updatedAt:Date.now()};restRaven();
    results.push(ravenLifeTestResult("4 · Ausruhen",ravenLife.energy===70&&ravenLife.hunger===47,"Energie +20 · Hunger −3"));
    results.push(ravenLifeTestResult("5 · Wertebegrenzung",clampRavenNeed(-20)===0&&clampRavenNeed(120)===100&&clampRavenNeed(49.6)===50,"kein Wert fällt unter 0 oder über 100"));
    ravenItems={futter:30,feder:0,glanzstein:0};
    results.push(ravenLifeTestResult("6 · Volles Inventar",addRavenItems({futter:1})===false&&ravenInventoryCount()===30,"der 31. Platz wird abgewiesen"));
    ravenItems={futter:29,feder:0,glanzstein:0};ravenPendingItems={futter:3,feder:0,glanzstein:0};claimPendingRavenItems();
    results.push(ravenLifeTestResult("7 · Vorgemerkte Belohnung",ravenItems.futter===30&&ravenPendingItems.futter===2,"ein freier Platz gefüllt · Rest bleibt sicher vorgemerkt"));
    const samples=[{name:"Brunnen"},{name:"Spielplatz"},{name:"Sportplatz"},{name:"Park"}].flatMap(point=>Array.from({length:75},()=>createRavenActivityReward(point))),valid=samples.every(reward=>Object.values(reward).reduce((sum,value)=>sum+value,0)>=1&&(reward.feder||0)<=1&&(reward.glanzstein||0)<=1&&Object.keys(reward).every(id=>RAVEN_ITEM_DEFS[id]));
    results.push(ravenLifeTestResult("8 · Ortsabhängige Funde",valid,"300 Brunnen-, Spielplatz-, Sportplatz- und Park-Funde geprüft"));
    results.push(ravenLifeTestResult("9 · Aktivitäts-Cooldown",typeof ACTIVITY_COOLDOWN_MS!=="undefined"&&ACTIVITY_COOLDOWN_MS===60*1000,"Aktivität bleibt im Prototyp exakt 1 Minute erschöpft"));
    results.push(ravenLifeTestResult("10 · NFC-Spielersperre",isRavenPlayerLocked("?view=player")&&!isRavenPlayerLocked("?v=developer"),"Spielerlink gesperrt · Entwicklerlink frei"));
    ravenLife={hunger:50,energy:50,mood:50,movementMeters:0,updatedAt:Date.now()};applyRavenMovement(249);const beforeStep=ravenLife.hunger===50&&ravenLife.energy===50;applyRavenMovement(1);
    results.push(ravenLifeTestResult("11 · Bewegungskosten",beforeStep&&ravenLife.hunger===49&&ravenLife.energy===49,"nach 250 m sinken Hunger und Energie"));
    ravenLife={hunger:20,energy:100,mood:100,movementMeters:0,updatedAt:Date.now()};
    results.push(ravenLifeTestResult("12 · Abhängige Stimmung",effectiveRavenMood()===75&&ravenMoodStatus()==="Unruhig","volle Laune kann Hunger nicht überdecken"));
  }catch(error){results.push(ravenLifeTestResult("Testsystem",false,error.message||String(error)));}
  finally{
    ravenTestMode=false;
    ravenLife=lifeSnapshot;ravenItems=itemSnapshot;ravenPendingItems=pendingSnapshot;
    [["ravenLife",storedLife],["ravenItems",storedItems],["ravenPendingItems",storedPending]].forEach(([key,value])=>value===null?localStorage.removeItem(key):localStorage.setItem(key,value));
    renderRavenGamePanel();setRavenLifeMessage(messageSnapshot);
  }
  const passed=results.filter(result=>result.ok).length,total=results.length;output.className=`edge-test-result ${passed===total?"ok":"error"}`;
  output.innerHTML=`<strong>${passed===total?"✓":"⚠"} ${passed}/${total} Raven-Stresstests bestanden</strong><div class="edge-test-grid">${results.map(result=>`<div class="edge-test-row ${result.ok?"ok":"error"}"><b>${result.ok?"✓":"✕"} ${escapeHTML(result.name)}</b><span>${escapeHTML(result.detail)}</span></div>`).join("")}</div>`;
  if(typeof logRavenEvent==="function")logRavenEvent("Raven-Stresstest",`${passed}/${total} bestanden`);
}

