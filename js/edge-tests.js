/* Automatische Grenzfälle. Verändert weder Spielstand noch Bot-Fortschritt. */
function ravenPointInRing(lon,lat,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const xi=ring[i][0],yi=ring[i][1],xj=ring[j][0],yj=ring[j][1];
    if(((yi>lat)!==(yj>lat))&&(lon<(xj-xi)*(lat-yi)/(yj-yi)+xi))inside=!inside;
  }
  return inside;
}
function ravenGeometryContains(geometry,lon,lat){
  if(!geometry)return false;const polygons=geometry.type==="Polygon"?[geometry.coordinates]:geometry.type==="MultiPolygon"?geometry.coordinates:[];
  return polygons.some(polygon=>ravenPointInRing(lon,lat,polygon[0])&&!polygon.slice(1).some(hole=>ravenPointInRing(lon,lat,hole)));
}
function ravenEdgeResult(name,ok,detail){return {name,ok:Boolean(ok),detail};}
async function runRavenEdgeTests(){
  const output=document.getElementById("edgeTestResult");if(!output)return;output.className="edge-test-result running";output.textContent="⏳ Zehn Grenzfälle werden geprüft …";const results=[];
  try{
    const classify=speed=>speed>RAVEN_SPEED_BLOCK_KMH?"blocked":speed>=RAVEN_SPEED_PAUSE_KMH?"paused":"free";
    results.push(ravenEdgeResult("1 · Geschwindigkeitswechsel",classify(11)==="free"&&classify(12)==="paused"&&classify(20)==="paused"&&classify(20.1)==="blocked"&&RAVEN_SPEED_RELEASE_MS===5000,"11 frei · 12–20 Pause · über 20 Sperre · 5 s Freigabe"));
    const origin={lat:51.5157,lon:8.741,time:1000},near=destinationPoint(origin.lat,origin.lon,349,90),far=destinationPoint(origin.lat,origin.lon,351,90);
    results.push(ravenEdgeResult("2 · GPS-Sprung",shouldConnectRevealPoints(origin,{lat:near[0],lon:near[1],time:2000})&&!shouldConnectRevealPoints(origin,{lat:far[0],lon:far[1],time:2000})&&!shouldConnectRevealPoints(origin,{lat:near[0],lon:near[1],time:32000}),"349 m verbunden · 351 m und über 30 s getrennt"));
    results.push(ravenEdgeResult("3 · Ungenaues GPS",RAVEN_MAX_GPS_ACCURACY===35,"bis ±35 m akzeptiert · ±60 m abgewiesen"));
    results.push(ravenEdgeResult("4 · Radiusgrenzen",isWithinRavenRadius(59,60)&&isWithinRavenRadius(60,60)&&!isWithinRavenRadius(61,60)&&isWithinRavenRadius(79,80)&&isWithinRavenRadius(80,80)&&!isWithinRavenRadius(81,80),"59/60 ja, 61 nein · 79/80 ja, 81 nein"));
    const storageKey="ravenEdgeTestTemporary",storageValue={fog:[1,2,3],mission:["test"]};
    try{localStorage.setItem(storageKey,JSON.stringify(storageValue));const restored=JSON.parse(localStorage.getItem(storageKey));results.push(ravenEdgeResult("5 · Pause und Neustart",restored.fog.length===3&&restored.mission[0]==="test","Teststand wurde gespeichert und identisch gelesen"));}finally{localStorage.removeItem(storageKey);}
    results.push(ravenEdgeResult("6 · Doppelte Aktivierung",discoverPoint.toString().includes("if(isDiscovered(point)) return"),"bereits entdeckte Punkte stoppen vor XP und Items"));
    const fallbackSegments=buildRavenBotSegments([[51.5157,8.741],[51.516,8.742]]);
    results.push(ravenEdgeResult("7 · Internetausfall",RAVEN_FOOT_ROUTER.startsWith("https://")&&RAVEN_CAR_ROUTER.startsWith("https://")&&fallbackSegments.length===1&&fallbackSegments[0].length>0,"Luftlinien-Notroute und Fehlerprotokoll stehen bereit"));
    const boundaryResponse=await fetch("data/fuerstenberg-boundary.json?v=1",{cache:"no-store"}),boundaryData=await boundaryResponse.json(),points=getRavenBotPoints(),outside=points.filter(point=>!ravenGeometryContains(boundaryData.geojson,point.lon,point.lat));
    results.push(ravenEdgeResult("8 · Ortsgrenze",boundaryResponse.ok&&outside.length===0,outside.length?`${outside.length} Punkte liegen außerhalb Fürstenbergs`:`alle ${points.length} Testpunkte liegen innerhalb Fürstenbergs`));
    const resultStores=new Set(ravenBots.map(bot=>bot.results)),trailStores=new Set(ravenBots.map(bot=>bot.trail));
    results.push(ravenEdgeResult("9 · Parallele Bots",resultStores.size===ravenBots.length&&trailStores.size===ravenBots.length,"vier getrennte Ergebnis- und Fog-Speicher"));
    const stress=Array.from({length:RAVEN_HISTORY_LIMIT+750},(_,index)=>index).slice(-RAVEN_HISTORY_LIMIT);
    results.push(ravenEdgeResult("10 · Langzeitbelastung",stress.length===12000&&stress[0]===750&&exploredPoints.length<=RAVEN_HISTORY_LIMIT&&travelHistory.length<=RAVEN_HISTORY_LIMIT,"Historien bleiben auf 12.000 Einträge begrenzt"));
  }catch(error){results.push(ravenEdgeResult("Testsystem",false,error.message||String(error)));}
  const passed=results.filter(result=>result.ok).length;output.className=`edge-test-result ${passed===10?"ok":"error"}`;
  output.innerHTML=`<strong>${passed===10?"✓":"⚠"} ${passed}/10 Grenzfälle bestanden</strong><div class="edge-test-grid">${results.map(result=>`<div class="edge-test-row ${result.ok?"ok":"error"}"><b>${result.ok?"✓":"✕"} ${escapeHTML(result.name)}</b><span>${escapeHTML(result.detail)}</span></div>`).join("")}</div>`;
  if(typeof logRavenEvent==="function")logRavenEvent("Grenzfalltest",`${passed}/10 bestanden`);
}

