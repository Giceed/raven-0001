/* Eigene Bot-Testkarte. Kein Bot verändert den Spielstand des echten Ravens. */
const RAVEN_BOT_SPEEDUP=120,RAVEN_BOT_TICK_MS=150;
const RAVEN_FOOT_ROUTER="https://routing.openstreetmap.de/routed-foot/route/v1/driving";
const RAVEN_CAR_ROUTER="https://router.project-osrm.org/route/v1/driving";
const RAVEN_BOT_DEFS=[
  {id:"walker",name:"Mila",icon:"🚶",label:"Läuferin",speed:4.5,color:"#2563eb"},
  {id:"jogger",name:"Jaro",icon:"🏃",label:"Jogger",speed:7,color:"#16a34a"},
  {id:"car",name:"Kara",icon:"🚗",label:"Auto + Aussteigen",speed:38,color:"#ea580c"}
];
let ravenBots=[],ravenBotTimer=null,ravenBotMap=null,ravenBotLayer=null,ravenBotPoiLayer=null,ravenBotPoiMarkers={},ravenBotProtocol=[];

function getRavenBotPoints(){return ALL_POINTS.filter(point=>normalizePlaceName(point.district||"Fürstenberg")===normalizePlaceName("Fürstenberg")).sort((a,b)=>(a.type==="exploration"?0:1)-(b.type==="exploration"?0:1));}
function makeRavenBot(definition,index){const start=[51.5157+(index-1)*.00012,8.741+(index-1)*.00012];return {...definition,lat:start[0],lon:start[1],start,targets:getRavenBotPoints(),targetIndex:0,target:null,segments:[],results:[],routeChecks:0,routeFallbacks:0,running:false,finished:false,state:"Bereit"};}

function ensureRavenBotMap(){
  if(!ravenBotMap){
    ravenBotMap=L.map("botMap",{zoomControl:true,minZoom:13,maxBounds:BAD_WUENNENBERG_BOUNDS,maxBoundsViscosity:1}).setView([51.5157,8.741],15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,noWrap:true,bounds:BAD_WUENNENBERG_BOUNDS.pad(.15),keepBuffer:1,attribution:"© OpenStreetMap"}).addTo(ravenBotMap);
    ravenBotLayer=L.layerGroup().addTo(ravenBotMap);ravenBotPoiLayer=L.layerGroup().addTo(ravenBotMap);drawRavenBotPois();
  }
  setTimeout(()=>ravenBotMap.invalidateSize(),50);
}

function drawRavenBotPois(){
  if(!ravenBotPoiLayer)return;ravenBotPoiLayer.clearLayers();ravenBotPoiMarkers={};
  getRavenBotPoints().forEach(point=>{
    const states=ravenBots.flatMap(bot=>bot.results).filter(result=>result.pointId===point.id),failed=states.some(result=>!result.ok),passed=states.some(result=>result.ok),status=failed?"failed":passed?"passed":"",symbol=failed?"✕":passed?"✓":"?";
    const radius=getDiscoveryRadius(point),color=point.type==="activity"?"#f97316":"#8b5cf6";
    L.circle([point.lat,point.lon],{radius,color,weight:3,opacity:.95,fillColor:color,fillOpacity:.14,interactive:false})
      .bindTooltip(`${radius} m`,{permanent:true,direction:"right",className:`bot-radius-label ${point.type}`,offset:[8,0]}).addTo(ravenBotPoiLayer);
    const icon=L.divIcon({className:"",html:`<div class="bot-poi-marker ${point.type} ${status}">${symbol}</div>`,iconSize:[25,25],iconAnchor:[12,12]});
    ravenBotPoiMarkers[point.id]=L.marker([point.lat,point.lon],{icon}).bindPopup(`<b>${escapeHTML(point.name)}</b><br>${point.type==="exploration"?"Erkundungspunkt":"Aktivitätspunkt"}<br>Radius: ${getDiscoveryRadius(point)} m`).addTo(ravenBotPoiLayer);
  });
}

function renderRavenBotCards(){
  const grid=document.getElementById("botGrid");if(!grid)return;
  grid.innerHTML=ravenBots.map(bot=>{const passed=bot.results.filter(result=>result.ok).length,total=bot.targets.length,percent=total?Math.round(passed/total*100):0;return `<div class="bot-card ${bot.id}"><div class="bot-name">${bot.icon} ${bot.name} · ${bot.label}</div><div class="bot-state">${escapeHTML(bot.state)}</div><div class="bot-progress"><i style="width:${percent}%"></i></div><div class="bot-score">${passed}/${total} bestanden · ${bot.routeChecks} Wegrouten</div><div class="bot-card-actions"><button class="run" onclick="startRavenBot('${bot.id}')">${bot.finished?"Neu starten":"Starten"}</button><button class="halt" onclick="stopRavenBot('${bot.id}')">Stoppen</button></div></div>`;}).join("");
}

function addRavenBotProtocol(bot,kind,message){ravenBotProtocol.push({time:Date.now(),bot:bot.name,kind,message});ravenBotProtocol=ravenBotProtocol.slice(-100);renderRavenBotProtocol();}
function renderRavenBotProtocol(){
  const box=document.getElementById("botProtocol"),counter=document.getElementById("botErrorCount");if(!box||!counter)return;const errors=ravenBotProtocol.filter(entry=>entry.kind==="error");counter.textContent=errors.length;
  box.innerHTML=ravenBotProtocol.length?ravenBotProtocol.slice().reverse().map(entry=>`<div class="bot-${entry.kind}">${new Date(entry.time).toLocaleTimeString("de-DE")} · ${escapeHTML(entry.bot)} · ${escapeHTML(entry.message)}</div>`).join(""):"Noch keine Fehler gefunden.";
}
function updateRavenBotSummary(){
  const box=document.getElementById("botSummary");if(!box)return;const active=ravenBots.filter(bot=>bot.running).length,finished=ravenBots.filter(bot=>bot.finished).length,errors=ravenBotProtocol.filter(entry=>entry.kind==="error").length;
  box.className="bot-summary "+(finished===3&&!errors?"ok":errors?"warn":"");box.textContent=active?`${active} Bot${active===1?"":"s"} unterwegs · ${finished}/3 fertig · ${errors} Fehler.`:finished===3?`Test beendet · ${errors?errors+" Fehler im Protokoll":"alle Prüfungen bestanden"}.`:"Bots einzeln starten oder alle gemeinsam einsetzen.";
}

function createRavenBotMarker(bot){if(bot.marker)ravenBotLayer.removeLayer(bot.marker);const icon=L.divIcon({className:"",html:`<div class="raven-bot-marker ${bot.id}">${bot.icon}</div>`,iconSize:[25,25],iconAnchor:[12,12]});bot.marker=L.marker([bot.lat,bot.lon],{icon,zIndexOffset:500}).bindTooltip(`${bot.name} · ${bot.label}`,{direction:"top"}).addTo(ravenBotLayer);}
async function fetchRavenBotRoute(bot,target){
  const base=bot.id==="car"?RAVEN_CAR_ROUTER:RAVEN_FOOT_ROUTER,url=`${base}/${bot.lon},${bot.lat};${target.lon},${target.lat}?overview=full&geometries=geojson&steps=false`;
  try{const response=await fetch(url,{mode:"cors"});if(!response.ok)throw new Error(`HTTP ${response.status}`);const data=await response.json(),coordinates=data.routes?.[0]?.geometry?.coordinates;if(!Array.isArray(coordinates)||coordinates.length<2)throw new Error("Keine Route");bot.routeChecks++;return coordinates.map(([lon,lat])=>[lat,lon]);}
  catch(error){bot.routeFallbacks++;addRavenBotProtocol(bot,"error",`Keine öffentliche Wegroute zu ${target.name}; Luftlinie als Notlösung.`);return [[bot.lat,bot.lon],[target.lat,target.lon]];}
}
function buildRavenBotSegments(route){const segments=[];for(let index=1;index<route.length;index++){const from=route[index-1],to=route[index];segments.push({from,to,length:haversineDistance(from[0],from[1],to[0],to[1])});}return segments;}
async function prepareRavenBotTarget(bot){
  if(!bot.running)return;const target=bot.targets[bot.targetIndex];
  if(!target){bot.finished=true;bot.running=false;bot.state="✓ Testlauf abgeschlossen";addRavenBotProtocol(bot,"info","Testlauf abgeschlossen.");renderRavenBotCards();updateRavenBotSummary();stopRavenBotClockWhenIdle();return;}
  bot.state=`Route zu ${target.type==="exploration"?"🟣":"🟠"} ${target.name} wird gesucht …`;renderRavenBotCards();const route=await fetchRavenBotRoute(bot,target);if(!bot.running)return;
  bot.route=route;bot.segments=buildRavenBotSegments(route);bot.segmentIndex=0;bot.segmentProgress=0;bot.target=target;bot.carStopped=false;if(bot.routeLayer)ravenBotLayer.removeLayer(bot.routeLayer);bot.routeLayer=L.polyline(route,{color:bot.color,weight:4,opacity:.8,dashArray:bot.routeFallbacks?"7 7":null,interactive:false}).addTo(ravenBotLayer);bot.state=`Unterwegs zu ${target.name}`;renderRavenBotCards();
}

function finishRavenBotPoint(bot){
  const target=bot.target,distance=haversineDistance(bot.lat,bot.lon,target.lat,target.lon),radius=getDiscoveryRadius(target),ok=distance<=radius;bot.results.push({pointId:target.id,name:target.name,type:target.type,distance,radius,ok});bot.state=ok?`✓ ${target.name} bei ${Math.round(distance)} m freigeschaltet`:`✗ ${target.name}: Weg endet bei ${Math.round(distance)} m`;
  addRavenBotProtocol(bot,ok?"info":"error",ok?`${target.name} innerhalb ${radius} m bestanden.`:`${target.name}: ${Math.round(distance)} m entfernt, Radius nur ${radius} m.`);if(bot.routeLayer){ravenBotLayer.removeLayer(bot.routeLayer);bot.routeLayer=null;}bot.targetIndex++;bot.target=null;drawRavenBotPois();renderRavenBotCards();updateRavenBotSummary();setTimeout(()=>prepareRavenBotTarget(bot),350);
}
function advanceRavenBot(bot,seconds){
  if(!bot.running||!bot.target||!bot.segments.length)return;const distance=haversineDistance(bot.lat,bot.lon,bot.target.lat,bot.target.lon),radius=getDiscoveryRadius(bot.target);
  if(bot.id==="car"&&!bot.carStopped&&distance<=Math.max(radius+45,105)){bot.carStopped=true;bot.state="🚗 Fahrt-Sperre bestanden · ausgestiegen";addRavenBotProtocol(bot,"info","Punkt während der Fahrt gesperrt; Bot ist ausgestiegen.");}
  if(distance<=radius){finishRavenBotPoint(bot);return;}const speed=bot.id==="car"&&bot.carStopped?4.5:bot.speed;let remaining=speed/3.6*seconds;
  while(remaining>0&&bot.segmentIndex<bot.segments.length){const segment=bot.segments[bot.segmentIndex],left=segment.length-bot.segmentProgress,move=Math.min(left,remaining);bot.segmentProgress+=move;remaining-=move;const ratio=segment.length?bot.segmentProgress/segment.length:1;bot.lat=segment.from[0]+(segment.to[0]-segment.from[0])*ratio;bot.lon=segment.from[1]+(segment.to[1]-segment.from[1])*ratio;if(bot.segmentProgress>=segment.length){bot.segmentIndex++;bot.segmentProgress=0;}}
  bot.marker?.setLatLng([bot.lat,bot.lon]);if(bot.segmentIndex>=bot.segments.length)finishRavenBotPoint(bot);
}

function ensureRavenBotClock(){if(ravenBotTimer)return;ravenBotTimer=setInterval(()=>{ravenBots.forEach(bot=>advanceRavenBot(bot,RAVEN_BOT_TICK_MS/1000*RAVEN_BOT_SPEEDUP));stopRavenBotClockWhenIdle();},RAVEN_BOT_TICK_MS);}
function stopRavenBotClockWhenIdle(){if(ravenBots.some(bot=>bot.running))return;if(ravenBotTimer){clearInterval(ravenBotTimer);ravenBotTimer=null;}}
function resetRavenBot(bot){bot.running=false;bot.finished=false;bot.lat=bot.start[0];bot.lon=bot.start[1];bot.targetIndex=0;bot.target=null;bot.segments=[];bot.results=[];bot.routeChecks=0;bot.routeFallbacks=0;bot.state="Startbereit";if(bot.routeLayer){ravenBotLayer.removeLayer(bot.routeLayer);bot.routeLayer=null;}createRavenBotMarker(bot);}
function startRavenBot(id){ensureRavenBotMap();const bot=ravenBots.find(item=>item.id===id);if(!bot||bot.running)return;if(bot.finished||bot.targetIndex>=bot.targets.length)resetRavenBot(bot);bot.running=true;bot.state="Startet …";createRavenBotMarker(bot);addRavenBotProtocol(bot,"info","Einzeltest gestartet.");ensureRavenBotClock();prepareRavenBotTarget(bot);renderRavenBotCards();updateRavenBotSummary();}
function stopRavenBot(id){const bot=ravenBots.find(item=>item.id===id);if(!bot||!bot.running)return;bot.running=false;bot.state="Gestoppt";if(bot.routeLayer){ravenBotLayer.removeLayer(bot.routeLayer);bot.routeLayer=null;}addRavenBotProtocol(bot,"info","Test gestoppt.");renderRavenBotCards();updateRavenBotSummary();stopRavenBotClockWhenIdle();}
function startRavenBots(){ensureRavenBotMap();ravenBots.forEach(bot=>startRavenBot(bot.id));}
function stopRavenBots(){ravenBots.forEach(bot=>stopRavenBot(bot.id));}

ravenBots=RAVEN_BOT_DEFS.map(makeRavenBot);renderRavenBotCards();renderRavenBotProtocol();updateRavenBotSummary();

