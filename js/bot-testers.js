/* Eigene Bot-Testkarte. Kein Bot verändert den Spielstand des echten Ravens. */
const RAVEN_BOT_SPEEDUP=120,RAVEN_BOT_TICK_MS=150;
const RAVEN_FOOT_ROUTER="https://routing.openstreetmap.de/routed-foot/route/v1/driving";
const RAVEN_CAR_ROUTER="https://router.project-osrm.org/route/v1/driving";
const RAVEN_BOT_DEFS=[
  {id:"walker",name:"Mila",icon:"🚶",label:"Läuferin",speed:4.5,color:"#2563eb"},
  {id:"jogger",name:"Jaro",icon:"🏃",label:"Jogger",speed:7,color:"#16a34a"},
  {id:"car",name:"Kara",icon:"🚗",label:"Auto + Aussteigen",speed:38,color:"#ea580c"},
  {id:"driveonly",name:"Rico",icon:"🚙",label:"Auto bleibt drin",speed:42,color:"#dc2626",noExit:true}
];
let ravenBots=[],ravenBotTimer=null,ravenBotMap=null,ravenBotLayer=null,ravenBotPoiLayer=null,ravenBotPoiMarkers={},ravenBotProtocol=[],ravenBotFogCanvas=null,activeRavenBotId="walker";

function getRavenBotPoints(){return ALL_POINTS.filter(point=>normalizePlaceName(point.district||"Fürstenberg")===normalizePlaceName("Fürstenberg")).sort((a,b)=>(a.type==="exploration"?0:1)-(b.type==="exploration"?0:1));}
function makeRavenBot(definition,index){const start=[51.5157+(index-1.5)*.00012,8.741+(index-1.5)*.00012];return {...definition,lat:start[0],lon:start[1],start,targets:getRavenBotPoints(),targetIndex:0,target:null,segments:[],results:[],trail:[{lat:start[0],lon:start[1]}],blockedChecks:0,routeChecks:0,routeFallbacks:0,running:false,finished:false,state:"Bereit"};}
function syncRavenBotTargets(){
  if(ravenBots.some(bot=>bot.running))return;const currentIds=getRavenBotPoints().map(point=>point.id).join("|");const botIds=(ravenBots[0]?.targets||[]).map(point=>point.id).join("|");if(currentIds!==botIds)ravenBots=RAVEN_BOT_DEFS.map(makeRavenBot);
}

function ensureRavenBotMap(){
  syncRavenBotTargets();
  if(!ravenBotMap){
    ravenBotMap=L.map("botMap",{zoomControl:true,minZoom:13,maxBounds:BAD_WUENNENBERG_BOUNDS,maxBoundsViscosity:1}).setView([51.5157,8.741],15);
    ravenBotMap.createPane("botFogPane");ravenBotMap.getPane("botFogPane").style.zIndex="450";ravenBotMap.getPane("botFogPane").style.pointerEvents="none";
    ravenBotMap.createPane("botPoiPane");ravenBotMap.getPane("botPoiPane").style.zIndex="650";
    ravenBotMap.createPane("botRoutePane");ravenBotMap.getPane("botRoutePane").style.zIndex="700";ravenBotMap.getPane("botRoutePane").style.pointerEvents="none";
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,noWrap:true,bounds:BAD_WUENNENBERG_BOUNDS.pad(.15),keepBuffer:1,attribution:"© OpenStreetMap"}).addTo(ravenBotMap);
    ravenBotLayer=L.layerGroup().addTo(ravenBotMap);ravenBotPoiLayer=L.layerGroup().addTo(ravenBotMap);drawRavenBotPois();createRavenBotFog();ravenBotMap.on("move zoom resize",redrawRavenBotFog);
  }
  setTimeout(()=>ravenBotMap.invalidateSize(),50);
}

function drawRavenBotPois(){
  if(!ravenBotPoiLayer)return;ravenBotPoiLayer.clearLayers();ravenBotPoiMarkers={};
  const activeBot=ravenBots.find(bot=>bot.id===activeRavenBotId);
  getRavenBotPoints().forEach(point=>{
    const states=(activeBot?.results||[]).filter(result=>result.pointId===point.id),failed=states.some(result=>!result.ok&&!result.blocked),passed=states.some(result=>result.ok),status=failed?"failed":passed?"passed":"",symbol=failed?"✕":passed?"✓":"?";
    const radius=getDiscoveryRadius(point),color=point.type==="activity"?"#f97316":"#8b5cf6";
    L.circle([point.lat,point.lon],{pane:"botPoiPane",radius,color,weight:3,opacity:.95,fillColor:color,fillOpacity:.14,interactive:false})
      .bindTooltip(`${radius} m`,{permanent:true,direction:"right",className:`bot-radius-label ${point.type}`,offset:[8,0]}).addTo(ravenBotPoiLayer);
    const icon=L.divIcon({className:"",html:`<div class="bot-poi-marker ${point.type} ${status}">${symbol}</div>`,iconSize:[25,25],iconAnchor:[12,12]});
    ravenBotPoiMarkers[point.id]=L.marker([point.lat,point.lon],{icon,pane:"botPoiPane"}).bindPopup(`<b>${escapeHTML(point.name)}</b><br>${point.type==="exploration"?"Erkundungspunkt":"Aktivitätspunkt"}<br>Radius: ${getDiscoveryRadius(point)} m`).addTo(ravenBotPoiLayer);
  });
}

function createRavenBotFog(){
  if(ravenBotFogCanvas)ravenBotFogCanvas.remove();
  ravenBotFogCanvas=document.createElement("canvas");ravenBotFogCanvas.className="raven-bot-fog";ravenBotMap.getPane("botFogPane").appendChild(ravenBotFogCanvas);redrawRavenBotFog();
}
function botHasCompletedExploration(bot){const required=bot.targets.filter(point=>point.type==="exploration");return required.length>0&&required.every(point=>bot.results.some(result=>result.pointId===point.id&&result.ok));}
function redrawRavenBotFog(){
  if(!ravenBotMap||!ravenBotFogCanvas)return;const bot=ravenBots.find(item=>item.id===activeRavenBotId);if(!bot)return;
  const status=document.getElementById("botMapStatus"),complete=botHasCompletedExploration(bot),exploration=bot.targets.filter(point=>point.type==="exploration"),found=exploration.filter(point=>bot.results.some(result=>result.pointId===point.id&&result.ok)).length;if(status)status.textContent=`${bot.icon} ${bot.name} · ${found}/${exploration.length} Erkundung · ${complete?"Fürstenberg frei":"Fog aktiv"}`;
  if(complete){ravenBotFogCanvas.style.display="none";return;}ravenBotFogCanvas.style.display="block";
  const size=ravenBotMap.getSize(),dpr=window.devicePixelRatio||1,panePosition=ravenBotMap._getMapPanePos?.()||L.point(0,0);ravenBotFogCanvas.width=Math.round(size.x*dpr);ravenBotFogCanvas.height=Math.round(size.y*dpr);ravenBotFogCanvas.style.width=size.x+"px";ravenBotFogCanvas.style.height=size.y+"px";ravenBotFogCanvas.style.left=(-panePosition.x)+"px";ravenBotFogCanvas.style.top=(-panePosition.y)+"px";
  const context=ravenBotFogCanvas.getContext("2d");context.setTransform(dpr,0,0,dpr,0,0);context.globalCompositeOperation="source-over";context.clearRect(0,0,size.x,size.y);context.fillStyle="rgba(0,0,0,.91)";context.fillRect(0,0,size.x,size.y);context.globalCompositeOperation="destination-out";
  bot.trail.forEach(position=>{const center=ravenBotMap.latLngToContainerPoint([position.lat,position.lon]),edge=destinationPoint(position.lat,position.lon,42,90),edgePoint=ravenBotMap.latLngToContainerPoint(edge),radius=Math.max(Math.abs(edgePoint.x-center.x),1);context.beginPath();context.arc(center.x,center.y,radius,0,Math.PI*2);context.fill();});context.globalCompositeOperation="source-over";
}
function showRavenBotFog(id){activeRavenBotId=id;ensureRavenBotMap();drawRavenBotPois();renderRavenBotCards();redrawRavenBotFog();const bot=ravenBots.find(item=>item.id===id);if(bot?.marker)ravenBotMap.panTo([bot.lat,bot.lon]);}
function recordRavenBotTrail(bot){
  const last=bot.trail[bot.trail.length-1];if(!last||haversineDistance(last.lat,last.lon,bot.lat,bot.lon)>=18){bot.trail.push({lat:bot.lat,lon:bot.lon});if(bot.id===activeRavenBotId)redrawRavenBotFog();}
}

function renderRavenBotCards(){
  const grid=document.getElementById("botGrid");if(!grid)return;
  grid.innerHTML=ravenBots.map(bot=>{const passed=bot.results.filter(result=>result.ok).length,total=bot.targets.length,score=bot.noExit?bot.blockedChecks:passed,percent=total?Math.round(score/total*100):0,scoreText=bot.noExit?`${bot.blockedChecks}/${total} korrekt gesperrt`:`${passed}/${total} bestanden`;return `<div class="bot-card ${bot.id} ${activeRavenBotId===bot.id?"viewed":""}"><div class="bot-name">${bot.icon} ${bot.name} · ${bot.label}</div><div class="bot-state">${escapeHTML(bot.state)}</div><div class="bot-progress"><i style="width:${percent}%"></i></div><div class="bot-score">${scoreText} · ${bot.routeChecks} Wegrouten</div><div class="bot-card-actions"><button class="run" onclick="startRavenBot('${bot.id}')">${bot.finished?"Neu starten":"Starten"}</button><button class="halt" onclick="stopRavenBot('${bot.id}')">Stoppen</button><button class="view" onclick="showRavenBotFog('${bot.id}')">${activeRavenBotId===bot.id?"Karte aktiv":"Karte ansehen"}</button></div></div>`;}).join("");
}

function addRavenBotProtocol(bot,kind,message){ravenBotProtocol.push({time:Date.now(),bot:bot.name,kind,message});ravenBotProtocol=ravenBotProtocol.slice(-100);renderRavenBotProtocol();}
function renderRavenBotProtocol(){
  const box=document.getElementById("botProtocol"),counter=document.getElementById("botErrorCount");if(!box||!counter)return;const errors=ravenBotProtocol.filter(entry=>entry.kind==="error");counter.textContent=errors.length;
  box.innerHTML=ravenBotProtocol.length?ravenBotProtocol.slice().reverse().map(entry=>`<div class="bot-${entry.kind}">${new Date(entry.time).toLocaleTimeString("de-DE")} · ${escapeHTML(entry.bot)} · ${escapeHTML(entry.message)}</div>`).join(""):"Noch keine Fehler gefunden.";
}
function updateRavenBotSummary(){
  const box=document.getElementById("botSummary");if(!box)return;const active=ravenBots.filter(bot=>bot.running).length,finished=ravenBots.filter(bot=>bot.finished).length,errors=ravenBotProtocol.filter(entry=>entry.kind==="error").length;
  const totalBots=ravenBots.length;box.className="bot-summary "+(finished===totalBots&&!errors?"ok":errors?"warn":"");box.textContent=active?`${active} Bot${active===1?"":"s"} unterwegs · ${finished}/${totalBots} fertig · ${errors} Fehler.`:finished===totalBots?`Test beendet · ${errors?errors+" Fehler im Protokoll":"alle Prüfungen bestanden"}.`:"Bots einzeln starten oder alle gemeinsam einsetzen.";
}

function createRavenBotMarker(bot){if(bot.marker)ravenBotLayer.removeLayer(bot.marker);const icon=L.divIcon({className:"",html:`<div class="raven-bot-marker ${bot.id}">${bot.icon}</div>`,iconSize:[25,25],iconAnchor:[12,12]});bot.marker=L.marker([bot.lat,bot.lon],{icon,pane:"botRoutePane",zIndexOffset:500}).bindTooltip(`${bot.name} · ${bot.label}`,{direction:"top"}).addTo(ravenBotLayer);}
async function fetchRavenBotRoute(bot,target){
  const base=(bot.id==="car"||bot.noExit)?RAVEN_CAR_ROUTER:RAVEN_FOOT_ROUTER,url=`${base}/${bot.lon},${bot.lat};${target.lon},${target.lat}?overview=full&geometries=geojson&steps=false`;
  try{const response=await fetch(url,{mode:"cors"});if(!response.ok)throw new Error(`HTTP ${response.status}`);const data=await response.json(),coordinates=data.routes?.[0]?.geometry?.coordinates;if(!Array.isArray(coordinates)||coordinates.length<2)throw new Error("Keine Route");bot.routeChecks++;return coordinates.map(([lon,lat])=>[lat,lon]);}
  catch(error){bot.routeFallbacks++;addRavenBotProtocol(bot,"error",`Keine öffentliche Wegroute zu ${target.name}; Luftlinie als Notlösung.`);return [[bot.lat,bot.lon],[target.lat,target.lon]];}
}
function buildRavenBotSegments(route){const segments=[];for(let index=1;index<route.length;index++){const from=route[index-1],to=route[index];segments.push({from,to,length:haversineDistance(from[0],from[1],to[0],to[1])});}return segments;}
async function prepareRavenBotTarget(bot){
  if(!bot.running)return;const target=bot.targets[bot.targetIndex];
  if(!target){bot.finished=true;bot.running=false;bot.state="✓ Testlauf abgeschlossen";addRavenBotProtocol(bot,"info","Testlauf abgeschlossen.");renderRavenBotCards();updateRavenBotSummary();stopRavenBotClockWhenIdle();return;}
  bot.state=`Route zu ${target.type==="exploration"?"🟣":"🟠"} ${target.name} wird gesucht …`;renderRavenBotCards();const route=await fetchRavenBotRoute(bot,target);if(!bot.running)return;
  bot.route=route;bot.segments=buildRavenBotSegments(route);bot.segmentIndex=0;bot.segmentProgress=0;bot.target=target;bot.carStopped=false;if(bot.routeLayer)ravenBotLayer.removeLayer(bot.routeLayer);bot.routeLayer=L.polyline(route,{pane:"botRoutePane",color:bot.color,weight:4,opacity:.8,dashArray:bot.routeFallbacks?"7 7":null,interactive:false}).addTo(ravenBotLayer);bot.state=`Unterwegs zu ${target.name}`;renderRavenBotCards();
}

function finishRavenBotPoint(bot){
  const target=bot.target,distance=haversineDistance(bot.lat,bot.lon,target.lat,target.lon),radius=getDiscoveryRadius(target),ok=distance<=radius;bot.results.push({pointId:target.id,name:target.name,type:target.type,distance,radius,ok});bot.state=ok?`✓ ${target.name} bei ${Math.round(distance)} m freigeschaltet`:`✗ ${target.name}: Weg endet bei ${Math.round(distance)} m`;
  addRavenBotProtocol(bot,ok?"info":"error",ok?`${target.name} innerhalb ${radius} m bestanden.`:`${target.name}: ${Math.round(distance)} m entfernt, Radius nur ${radius} m.`);if(bot.routeLayer){ravenBotLayer.removeLayer(bot.routeLayer);bot.routeLayer=null;}bot.targetIndex++;bot.target=null;drawRavenBotPois();redrawRavenBotFog();renderRavenBotCards();updateRavenBotSummary();setTimeout(()=>prepareRavenBotTarget(bot),350);
}
function finishDriveOnlyCheck(bot){
  const target=bot.target,distance=haversineDistance(bot.lat,bot.lon,target.lat,target.lon),radius=getDiscoveryRadius(target);
  bot.blockedChecks++;bot.results.push({pointId:target.id,name:target.name,type:target.type,distance,radius,ok:false,blocked:true});bot.state=`🚙 ${target.name} trotz ${Math.round(bot.speed)} km/h gesperrt ✓`;
  addRavenBotProtocol(bot,"info",`Fahrt-Sperre bestanden: ${target.name} bei ${Math.round(distance)} m nicht freigeschaltet.`);if(bot.routeLayer){ravenBotLayer.removeLayer(bot.routeLayer);bot.routeLayer=null;}bot.targetIndex++;bot.target=null;renderRavenBotCards();updateRavenBotSummary();setTimeout(()=>prepareRavenBotTarget(bot),350);
}
function advanceRavenBot(bot,seconds){
  if(!bot.running||!bot.target||!bot.segments.length)return;const distance=haversineDistance(bot.lat,bot.lon,bot.target.lat,bot.target.lon),radius=getDiscoveryRadius(bot.target);
  if(bot.id==="car"&&!bot.carStopped&&distance<=Math.max(radius+45,105)){bot.carStopped=true;bot.state="🚗 Fahrt-Sperre bestanden · ausgestiegen";addRavenBotProtocol(bot,"info","Punkt während der Fahrt gesperrt; Bot ist ausgestiegen.");}
  if(distance<=radius){if(bot.noExit)finishDriveOnlyCheck(bot);else finishRavenBotPoint(bot);return;}const speed=bot.id==="car"&&bot.carStopped?4.5:bot.speed;let remaining=speed/3.6*seconds;
  while(remaining>0&&bot.segmentIndex<bot.segments.length){const segment=bot.segments[bot.segmentIndex],left=segment.length-bot.segmentProgress,move=Math.min(left,remaining);bot.segmentProgress+=move;remaining-=move;const ratio=segment.length?bot.segmentProgress/segment.length:1;bot.lat=segment.from[0]+(segment.to[0]-segment.from[0])*ratio;bot.lon=segment.from[1]+(segment.to[1]-segment.from[1])*ratio;if(bot.segmentProgress>=segment.length){bot.segmentIndex++;bot.segmentProgress=0;}}
  bot.marker?.setLatLng([bot.lat,bot.lon]);recordRavenBotTrail(bot);if(bot.segmentIndex>=bot.segments.length){const finalDistance=haversineDistance(bot.lat,bot.lon,bot.target.lat,bot.target.lon);if(bot.noExit&&finalDistance<=radius)finishDriveOnlyCheck(bot);else finishRavenBotPoint(bot);}
}

function ensureRavenBotClock(){if(ravenBotTimer)return;ravenBotTimer=setInterval(()=>{ravenBots.forEach(bot=>advanceRavenBot(bot,RAVEN_BOT_TICK_MS/1000*RAVEN_BOT_SPEEDUP));stopRavenBotClockWhenIdle();},RAVEN_BOT_TICK_MS);}
function stopRavenBotClockWhenIdle(){if(ravenBots.some(bot=>bot.running))return;if(ravenBotTimer){clearInterval(ravenBotTimer);ravenBotTimer=null;}}
function resetRavenBot(bot){bot.running=false;bot.finished=false;bot.lat=bot.start[0];bot.lon=bot.start[1];bot.targetIndex=0;bot.target=null;bot.segments=[];bot.results=[];bot.trail=[{lat:bot.start[0],lon:bot.start[1]}];bot.blockedChecks=0;bot.routeChecks=0;bot.routeFallbacks=0;bot.state="Startbereit";if(bot.routeLayer){ravenBotLayer.removeLayer(bot.routeLayer);bot.routeLayer=null;}createRavenBotMarker(bot);drawRavenBotPois();redrawRavenBotFog();}
function startRavenBot(id){activeRavenBotId=id;ensureRavenBotMap();const bot=ravenBots.find(item=>item.id===id);if(!bot||bot.running)return;if(bot.finished||bot.targetIndex>=bot.targets.length)resetRavenBot(bot);bot.running=true;bot.state="Startet …";createRavenBotMarker(bot);drawRavenBotPois();redrawRavenBotFog();addRavenBotProtocol(bot,"info","Einzeltest gestartet · eigene Kartenansicht aktiviert.");ensureRavenBotClock();prepareRavenBotTarget(bot);renderRavenBotCards();updateRavenBotSummary();}
function stopRavenBot(id){const bot=ravenBots.find(item=>item.id===id);if(!bot||!bot.running)return;bot.running=false;bot.state="Gestoppt";if(bot.routeLayer){ravenBotLayer.removeLayer(bot.routeLayer);bot.routeLayer=null;}addRavenBotProtocol(bot,"info","Test gestoppt.");renderRavenBotCards();updateRavenBotSummary();stopRavenBotClockWhenIdle();}
function startRavenBots(){ensureRavenBotMap();ravenBots.forEach(bot=>startRavenBot(bot.id));}
function stopRavenBots(){ravenBots.forEach(bot=>stopRavenBot(bot.id));}

ravenBots=RAVEN_BOT_DEFS.map(makeRavenBot);renderRavenBotCards();renderRavenBotProtocol();updateRavenBotSummary();

