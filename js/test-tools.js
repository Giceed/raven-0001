/* Raven Testzentrale – Diagnose, Protokoll und reproduzierbarer Testreset. */
const RAVEN_EVENT_KEY="ravenTestEvents";
let ravenTestEvents=JSON.parse(localStorage.getItem(RAVEN_EVENT_KEY)||"[]");

function logRavenEvent(type,detail=""){
  ravenTestEvents.push({time:Date.now(),type,detail});
  ravenTestEvents=ravenTestEvents.slice(-200);
  localStorage.setItem(RAVEN_EVENT_KEY,JSON.stringify(ravenTestEvents));
  updateRavenDevPanel();
}

function updateRavenDevPanel(){
  const card=document.getElementById("devCard");
  if(!card)return;
  card.classList.toggle("active",Boolean(godMode));
  if(godMode&&typeof ensureRavenBotMap==="function")ensureRavenBotMap();
  const points=ALL_POINTS.filter(p=>(p.district||"Fürstenberg")==="Fürstenberg");
  const explorations=points.filter(p=>p.type==="exploration");
  const activities=points.filter(p=>p.type==="activity");
  const nearest=currentLat==null?null:points.map(p=>({p,d:haversineDistance(currentLat,currentLon,p.lat,p.lon)})).sort((a,b)=>a.d-b.d)[0];
  const items=JSON.parse(localStorage.getItem("ravenItems")||'{"futter":0}');
  document.getElementById("devGrid").innerHTML=`
    <div class="dev-metric">Ort<b>${escapeHTML(currentRavenDistrict||"unbekannt")}</b></div>
    <div class="dev-metric">GPS<b>${currentAccuracy==null?"–":"±"+Math.round(currentAccuracy)+" m"}</b></div>
    <div class="dev-metric">Geschwindigkeit<b>${(window.currentSpeedKmh||0).toFixed(1)} km/h</b></div>
    <div class="dev-metric">Nächster Punkt<b>${nearest?Math.round(nearest.d)+" m · "+escapeHTML(nearest.p.name):"–"}</b></div>
    <div class="dev-metric">Erkundung<b>${explorations.filter(isDiscovered).length}/${explorations.length}</b></div>
    <div class="dev-metric">Aktivitäten<b>${activities.filter(isDiscovered).length}/${activities.length}</b></div>
    <div class="dev-metric">Fog<b>${fuerstenbergMission.completed?"frei":"aktiv"}</b></div>
    <div class="dev-metric">Test-Items<b>${items.futter||0} Futter</b></div>`;
  document.getElementById("devLog").innerHTML=ravenTestEvents.slice(-20).reverse().map(e=>`<div>${new Date(e.time).toLocaleTimeString("de-DE")} · ${escapeHTML(e.type)}${e.detail?" · "+escapeHTML(e.detail):""}</div>`).join("")||"Noch keine Ereignisse.";
}

function updateCompletionBanner(){
  document.getElementById("completionBanner")?.classList.toggle("active",Boolean(fuerstenbergMission.completed));
}

function runRavenSelfTest(){
  const checks=[
    [ALL_POINTS.some(p=>p.type==="exploration"),"Erkundungspunkte geladen"],
    [ALL_POINTS.some(p=>p.type==="activity"),"Aktivitätspunkte geladen"],
    [ALL_POINTS.filter(p=>p.type==="activity").every(p=>[80,120].includes(getDiscoveryRadius(p))),"Aktivitätsradien 80/120 m"],
    [Boolean(map.getPane("ravenFogPane")&&map.getPane("ravenForegroundPane")),"Kartenebenen vorhanden"],
    [Number(map.getPane("ravenForegroundPane").style.zIndex)>Number(map.getPane("ravenFogPane").style.zIndex),"Marker vor Fog"],
    [Array.isArray(fuerstenbergMission.visitedPOIs),"Fortschritt lesbar"]
  ];
  const failed=checks.filter(([ok])=>!ok),result=document.getElementById("devTestResult");
  result.className="dev-test-result "+(failed.length?"error":"ok");
  result.textContent=failed.length?`⚠ ${failed.length} Fehler: ${failed.map(x=>x[1]).join(", ")}`:`✓ ${checks.length}/${checks.length} Prüfungen bestanden.`;
  logRavenEvent("Selbsttest",failed.length?`${failed.length} Fehler`:"bestanden");
}

function resetRavenTestProgress(){
  if(!confirm("Testfortschritt, Fog, Items, XP und Strecke wirklich zurücksetzen?"))return;
  ["ravenFuerstenbergMission","ravenExploredPoints","ravenTravelHistory","ravenDiscoveredPlaces","ravenItems","ravenActivityCooldowns","ravenXP","ravenLevel","ravenDistance",RAVEN_EVENT_KEY].forEach(key=>localStorage.removeItem(key));
  location.reload();
}

setInterval(()=>{updateRavenDevPanel();updateCompletionBanner();},1000);
setInterval(()=>{if(currentRavenDistrict)renderMainLists();},1000);
updateRavenDevPanel();
updateCompletionBanner();

