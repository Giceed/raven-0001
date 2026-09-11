/* Drei voneinander getrennte Testspieler. Sie verändern den echten Spielstand nicht. */
const RAVEN_BOT_SPEEDUP=120;
const RAVEN_BOT_TICK_MS=150;
const RAVEN_FOOT_ROUTER="https://routing.openstreetmap.de/routed-foot/route/v1/driving";
const RAVEN_CAR_ROUTER="https://router.project-osrm.org/route/v1/driving";

let ravenBots=[];
let ravenBotTimer=null;
let ravenBotRunId=0;
let ravenBotLayers=L.layerGroup().addTo(map);

const RAVEN_BOT_DEFS=[
  {id:"walker",name:"Mila",icon:"🚶",label:"Läuferin",speed:4.5,color:"#2563eb"},
  {id:"jogger",name:"Jaro",icon:"🏃",label:"Jogger",speed:7,color:"#16a34a"},
  {id:"car",name:"Kara",icon:"🚗",label:"Auto + Aussteigen",speed:38,color:"#ea580c"}
];

function getRavenBotPoints(){
  return ALL_POINTS
    .filter(point=>normalizePlaceName(point.district||"Fürstenberg")===normalizePlaceName("Fürstenberg"))
    .sort((a,b)=>(a.type==="exploration"?0:1)-(b.type==="exploration"?0:1));
}

function createRavenBotMarker(bot){
  const icon=L.divIcon({className:"",html:`<div class="raven-bot-marker ${bot.id}">${bot.icon}</div>`,iconSize:[25,25],iconAnchor:[12,12]});
  bot.marker=L.marker([bot.lat,bot.lon],{icon,pane:"ravenUserPane",zIndexOffset:500}).bindTooltip(`${bot.name} · ${bot.label}`,{direction:"top"}).addTo(ravenBotLayers);
}

function renderRavenBotCards(){
  const grid=document.getElementById("botGrid");
  if(!grid)return;
  grid.innerHTML=ravenBots.map(bot=>{
    const total=bot.targets.length;
    const passed=bot.results.filter(result=>result.ok).length;
    const percent=total?Math.round((passed/total)*100):0;
    return `<div class="bot-card ${bot.id}">
      <div class="bot-name">${bot.icon} ${bot.name} · ${bot.label}</div>
      <div class="bot-state">${escapeHTML(bot.state)}</div>
      <div class="bot-progress"><i style="width:${percent}%"></i></div>
      <div class="bot-score">${passed}/${total} Punkte · ${bot.routeChecks} Wegrouten</div>
    </div>`;
  }).join("");
}

function updateRavenBotSummary(){
  const summary=document.getElementById("botSummary");
  if(!summary)return;
  const finished=ravenBots.filter(bot=>bot.finished).length;
  const failures=ravenBots.flatMap(bot=>bot.results).filter(result=>!result.ok);
  const roadFallbacks=ravenBots.reduce((sum,bot)=>sum+bot.routeFallbacks,0);
  summary.className="bot-summary "+(finished===3&&!failures.length?"ok":roadFallbacks?"warn":"");
  if(finished<3){
    summary.textContent=`Test läuft: ${finished}/3 Bots fertig · ${roadFallbacks} Routen ohne Wegdienst.`;
  }else{
    summary.textContent=failures.length
      ? `Test beendet: ${failures.length} Radius-Prüfungen fehlgeschlagen.`
      : `✓ Alle 3 Bots fertig. Radien bestanden${roadFallbacks?`; ${roadFallbacks} Strecken nutzten die Luftlinien-Notlösung`:"; alle Strecken folgten berechneten Wegen"}.`;
  }
}

async function fetchRavenBotRoute(bot,target){
  const base=bot.id==="car"?RAVEN_CAR_ROUTER:RAVEN_FOOT_ROUTER;
  const url=`${base}/${bot.lon},${bot.lat};${target.lon},${target.lat}?overview=full&geometries=geojson&steps=false`;
  try{
    const response=await fetch(url,{mode:"cors"});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    const coordinates=data.routes?.[0]?.geometry?.coordinates;
    if(!Array.isArray(coordinates)||coordinates.length<2)throw new Error("Keine Route");
    bot.routeChecks++;
    return coordinates.map(([lon,lat])=>[lat,lon]);
  }catch(error){
    bot.routeFallbacks++;
    return [[bot.lat,bot.lon],[target.lat,target.lon]];
  }
}

function buildRavenBotSegments(route){
  const segments=[];
  for(let index=1;index<route.length;index++){
    const from=route[index-1],to=route[index];
    segments.push({from,to,length:haversineDistance(from[0],from[1],to[0],to[1])});
  }
  return segments;
}

async function prepareRavenBotTarget(bot,runId){
  if(runId!==ravenBotRunId||bot.finished)return;
  const target=bot.targets[bot.targetIndex];
  if(!target){bot.finished=true;bot.state="✓ Testlauf abgeschlossen";renderRavenBotCards();updateRavenBotSummary();return;}
  bot.state=`Route zu ${target.type==="exploration"?"🟣":"🟠"} ${target.name} wird gesucht …`;
  renderRavenBotCards();
  const route=await fetchRavenBotRoute(bot,target);
  if(runId!==ravenBotRunId)return;
  bot.route=route;
  bot.segments=buildRavenBotSegments(route);
  bot.segmentIndex=0;
  bot.segmentProgress=0;
  bot.target=target;
  bot.carStopped=false;
  if(bot.routeLayer)ravenBotLayers.removeLayer(bot.routeLayer);
  bot.routeLayer=L.polyline(route,{color:bot.color,weight:3,opacity:.7,dashArray:bot.routeFallbacks?"7 7":null,interactive:false}).addTo(ravenBotLayers);
  bot.state=`Unterwegs zu ${target.name}`;
  renderRavenBotCards();
}

function finishRavenBotPoint(bot){
  const target=bot.target;
  const distance=haversineDistance(bot.lat,bot.lon,target.lat,target.lon);
  const radius=getDiscoveryRadius(target);
  const ok=distance<=radius;
  bot.results.push({pointId:target.id,type:target.type,distance,radius,ok});
  bot.state=ok?`✓ ${target.name} bei ${Math.round(distance)} m bestanden`:`✗ ${target.name}: ${Math.round(distance)} m statt ${radius} m`;
  if(bot.routeLayer){ravenBotLayers.removeLayer(bot.routeLayer);bot.routeLayer=null;}
  bot.targetIndex++;
  bot.target=null;
  renderRavenBotCards();
  updateRavenBotSummary();
  setTimeout(()=>prepareRavenBotTarget(bot,ravenBotRunId),350);
}

function advanceRavenBot(bot,simulatedSeconds){
  if(bot.finished||!bot.target||!bot.segments.length)return;
  const target=bot.target;
  const distanceToTarget=haversineDistance(bot.lat,bot.lon,target.lat,target.lon);
  const radius=getDiscoveryRadius(target);

  if(bot.id==="car"&&bot.speed>25&&!bot.carStopped&&distanceToTarget<=Math.max(radius+45,105)){
    bot.carStopped=true;
    bot.state=`🚗 Fahrt gesperrt ✓ · ausgestiegen, letzte Meter zu Fuß`;
  }
  if(distanceToTarget<=radius){finishRavenBotPoint(bot);return;}

  const activeSpeed=bot.id==="car"&&bot.carStopped?4.5:bot.speed;
  let remaining=(activeSpeed/3.6)*simulatedSeconds;
  while(remaining>0&&bot.segmentIndex<bot.segments.length){
    const segment=bot.segments[bot.segmentIndex];
    const left=segment.length-bot.segmentProgress;
    const move=Math.min(left,remaining);
    bot.segmentProgress+=move;
    remaining-=move;
    const ratio=segment.length?bot.segmentProgress/segment.length:1;
    bot.lat=segment.from[0]+(segment.to[0]-segment.from[0])*ratio;
    bot.lon=segment.from[1]+(segment.to[1]-segment.from[1])*ratio;
    if(bot.segmentProgress>=segment.length){bot.segmentIndex++;bot.segmentProgress=0;}
  }
  bot.marker?.setLatLng([bot.lat,bot.lon]);
  if(bot.segmentIndex>=bot.segments.length)finishRavenBotPoint(bot);
}

function startRavenBots(){
  stopRavenBots(false);
  ravenBotRunId++;
  const runId=ravenBotRunId;
  const targets=getRavenBotPoints();
  if(!targets.length){document.getElementById("botSummary").textContent="Keine Fürstenberg-Punkte geladen.";return;}
  const start=[51.5157,8.741];
  ravenBots=RAVEN_BOT_DEFS.map((definition,index)=>({
    ...definition,lat:start[0]+(index-1)*.00012,lon:start[1]+(index-1)*.00012,
    targets:[...targets],targetIndex:0,target:null,segments:[],results:[],routeChecks:0,routeFallbacks:0,finished:false,state:"Startbereit"
  }));
  ravenBotLayers.clearLayers();
  ravenBots.forEach(bot=>{createRavenBotMarker(bot);prepareRavenBotTarget(bot,runId);});
  document.getElementById("botStartButton").disabled=true;
  document.getElementById("botStopButton").disabled=false;
  renderRavenBotCards();updateRavenBotSummary();
  ravenBotTimer=setInterval(()=>{
    ravenBots.forEach(bot=>advanceRavenBot(bot,(RAVEN_BOT_TICK_MS/1000)*RAVEN_BOT_SPEEDUP));
    if(ravenBots.length&&ravenBots.every(bot=>bot.finished))stopRavenBotClock();
  },RAVEN_BOT_TICK_MS);
  logRavenEvent("Bot-Test gestartet","3 Tester");
}

function stopRavenBotClock(){
  if(ravenBotTimer){clearInterval(ravenBotTimer);ravenBotTimer=null;}
  document.getElementById("botStartButton").disabled=false;
  document.getElementById("botStopButton").disabled=true;
}

function stopRavenBots(markStopped=true){
  ravenBotRunId++;
  stopRavenBotClock();
  if(markStopped&&ravenBots.length){
    ravenBots.filter(bot=>!bot.finished).forEach(bot=>bot.state="Gestoppt");
    logRavenEvent("Bot-Test gestoppt");
    renderRavenBotCards();updateRavenBotSummary();
  }
}

renderRavenBotCards();

