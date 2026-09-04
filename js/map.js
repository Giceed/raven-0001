/* ==========================================================
   KARTE
   ========================================================== */

const BAD_WUENNENBERG_BOUNDS = L.latLngBounds(
  [51.447216,8.709994],
  [51.555537,8.837855]
);

const map = L.map("map",{
  zoomControl:false,
  minZoom:12,
  maxBounds:BAD_WUENNENBERG_BOUNDS,
  maxBoundsViscosity:1
}).setView([51.5157,8.741],15);

/* Marker liegen bewusst über dem Erkundungsnebel. */
map.createPane("ravenFogPane");
map.getPane("ravenFogPane").style.zIndex="450";
map.getPane("ravenFogPane").style.pointerEvents="none";

map.createPane("ravenForegroundPane");
map.getPane("ravenForegroundPane").style.zIndex="700";

/* Der eigene Standort bleibt immer über Grenzen, Fog und POIs sichtbar. */
map.createPane("ravenUserPane");
map.getPane("ravenUserPane").style.zIndex="850";
map.getPane("ravenUserPane").style.pointerEvents="none";

/* Außerhalb der echten Stadtgrenze wird die Karte vollständig ausgeschnitten. */
map.createPane("ravenTerritoryMaskPane");
map.getPane("ravenTerritoryMaskPane").style.zIndex="800";
map.getPane("ravenTerritoryMaskPane").style.pointerEvents="none";

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom:19,
    noWrap:true,
    bounds:BAD_WUENNENBERG_BOUNDS.pad(.15),
    keepBuffer:2,
    attribution:"© OpenStreetMap"
  }
).addTo(map);

function joinBoundaryLines(lines){
  const remaining=lines.map(line=>line.map(point=>[point[0],point[1]]));
  const ring=remaining.shift()||[];
  const key=point=>point[0].toFixed(6)+","+point[1].toFixed(6);
  while(remaining.length){
    const end=key(ring[ring.length-1]);
    const index=remaining.findIndex(line=>key(line[0])===end||key(line[line.length-1])===end);
    if(index<0) break;
    let next=remaining.splice(index,1)[0];
    if(key(next[next.length-1])===end) next.reverse();
    ring.push(...next.slice(1));
  }
  if(ring.length&&key(ring[0])!==key(ring[ring.length-1])) ring.push(ring[0]);
  return ring;
}

async function cutMapToBadWuennenberg(){
  try{
    const response=await fetch("data/fuerstenberg-boundary.json?v=1");
    const data=await response.json();
    const coordinates=data.geojson.type==="Polygon"
      ? data.geojson.coordinates[0]
      : data.geojson.coordinates[0][0];
    const cityRing=coordinates.map(point=>[point[1],point[0]]);
    const outside=[[-85,-180],[-85,180],[85,180],[85,-180],[-85,-180]];
    L.polygon([outside,cityRing],{
      pane:"ravenTerritoryMaskPane",stroke:false,fillColor:"#05070b",fillOpacity:1,
      fillRule:"evenodd",interactive:false
    }).addTo(map);

  }catch(error){
    console.warn("Stadtgrenzen-Ausschnitt konnte nicht geladen werden.",error);
  }
}

cutMapToBadWuennenberg();

L.control.zoom({position:"topright"}).addTo(map);

let userMarker = null;
let pointMarkers = {};
let boundaryLayer = null;
let fuerstenbergBoundary = null;
let currentPlaceBoundaryLayer = null;
let testRegionLayer = null;
let godViewLayer = null;
let godViewEnabled = false;

function drawTestRegion(){
  if(testRegionLayer) return;

  testRegionLayer=L.circle(
    [TEST_REGION.centerLat,TEST_REGION.centerLon],
    {
      radius:TEST_REGION.radiusMeters,
      pane:"ravenForegroundPane",
      color:"#a855f7",
      weight:2,
      opacity:.7,
      dashArray:"8 8",
      fill:false,
      interactive:false
    }
  ).addTo(map);
}

function showCurrentPlaceBoundary(geojson){
  if(currentPlaceBoundaryLayer){
    map.removeLayer(currentPlaceBoundaryLayer);
    currentPlaceBoundaryLayer=null;
  }

  if(!geojson || !["Polygon","MultiPolygon"].includes(geojson.type)) return false;

  currentPlaceBoundaryLayer=L.geoJSON(geojson,{
    pane:"ravenForegroundPane",
    interactive:false,
    style:{
      color:"#c084fc",
      weight:3,
      opacity:.95,
      fillColor:"#7e22ce",
      fillOpacity:.04
    }
  }).addTo(map);

  return true;
}

let followUser = true;
let internalMapMove = false;

let tracking = false;
let watchId = null;
let lastPosition = null;
let sessionDistance = 0;

let currentLat = null;
let currentLon = null;
let currentAccuracy = null;

let firstValidFix = false;
let godMode = false;


/* ==========================================================
   USER MARKER
   ========================================================== */

function updateUserMarker(){

  if(currentLat === null || currentLon === null) return;

  const html =
    `<div class="raven-user-marker ${godMode ? "god" : ""}"></div>`;

  const icon = L.divIcon({
    className:"",
    html,
    iconSize:[22,22],
    iconAnchor:[11,11]
  });

  if(!userMarker){

    userMarker = L.marker(
      [currentLat,currentLon],
      {icon,pane:"ravenUserPane",zIndexOffset:1000}
    ).addTo(map);

  }else{

    userMarker.setLatLng([currentLat,currentLon]);
    userMarker.setIcon(icon);

  }
}


/* ==========================================================
   GOD MODE
   ========================================================== */

function toggleGodMode(){

  godMode = !godMode;

  document
    .getElementById("godBox")
    .classList.toggle("active",godMode);

  if(godMode){

    map.setMinZoom(11);
    setMapMode("travel");

    followUser = false;

    document.getElementById("statusText").textContent="GOD";
    document.getElementById("gpsInfo").textContent="GOD MODE";

    setTemporaryMessage(
      "🛠 GOD MODE aktiv – tippe auf die Karte, um Raven zu teleportieren.",
      5000
    );

  }else{

    map.setMinZoom(12);
    if(map.getZoom()<12) map.setZoom(12);
    setMapMode("explore");

    disableGodModeView();

    document.getElementById("statusText").textContent =
      tracking ? "Aktiv" : "Bereit";

    document.getElementById("gpsInfo").textContent =
      tracking ? "GPS aktiv" : "GPS pausiert";

    setTemporaryMessage("🛠 GOD MODE beendet.");

  }

  updateFollowUI();
  updateUserMarker();
  updateAllPointStates(currentLat??TEST_REGION.centerLat,currentLon??TEST_REGION.centerLon);
}

async function toggleGodModeView(){
  if(!godMode){
    setTemporaryMessage("👁 GOD MODE VIEW ist nur im GOD MODE verfügbar.");
    return;
  }
  if(godViewEnabled){disableGodModeView();return;}

  try{
    setTemporaryMessage("👁 Grenze von Fürstenberg wird geladen …",5000);
    const response=await fetch("data/fuerstenberg-boundary.json?v=1");
    if(!response.ok) throw new Error();
    const data=await response.json();
    godViewLayer=L.layerGroup().addTo(map);
    const allPoints=[];

    const layer=L.geoJSON(data.geojson,{pane:"ravenForegroundPane",style:{color:"#facc15",weight:5,opacity:.98,fill:false},interactive:true})
      .bindTooltip("Fürstenberg",{sticky:true,direction:"top"}).addTo(godViewLayer);
    layer.eachLayer(item=>{const latlngs=item.getLatLngs?.().flat(3)||[];allPoints.push(...latlngs);});

    godViewEnabled=true;
    document.getElementById("godViewButton").classList.add("active");
    if(allPoints.length){
      internalMapMove=true;
      map.fitBounds(allPoints,{padding:[25,25],maxZoom:12});
      setTimeout(()=>internalMapMove=false,600);
    }
    setTemporaryMessage("👁 GOD MODE VIEW aktiv – Fürstenberg-Grenze gelb.",5000);
  }catch(error){
    setTemporaryMessage("⚠ GOD MODE VIEW konnte nicht geladen werden.");
  }
}

function disableGodModeView(){
  if(godViewLayer){map.removeLayer(godViewLayer);godViewLayer=null;}
  godViewEnabled=false;
  document.getElementById("godViewButton")?.classList.remove("active");
}

map.on("click",event=>{

  if(!godMode) return;

  currentLat = event.latlng.lat;
  currentLon = event.latlng.lng;

  updateUserMarker();
  updateAllPointStates(currentLat,currentLon);

  internalMapMove=true;
  map.panTo([currentLat,currentLon]);

  setTimeout(()=>internalMapMove=false,300);

  maybeReverseGeocode(currentLat,currentLon,true);

  setTemporaryMessage("⚡ Raven wurde teleportiert.");
});


/* ==========================================================
   FOLLOW MODE
   ========================================================== */

map.on("dragstart",()=>{

  if(internalMapMove) return;

  followUser=false;
  updateFollowUI();
});

map.on("zoomstart",()=>{

  if(internalMapMove) return;

  followUser=false;
  updateFollowUI();
});

function updateFollowUI(){

  document.getElementById("followState").textContent =
    followUser
      ? "📍 RAVEN FOLGT DIR"
      : "🗺️ FREIE KARTE";
}

function recenterMap(){

  if(currentLat === null || currentLon === null){

    setTemporaryMessage("📍 Noch keine Position vorhanden.");
    return;
  }

  followUser=true;
  updateFollowUI();

  internalMapMove=true;

  map.setView(
    [currentLat,currentLon],
    Math.max(map.getZoom(),16),
    {animate:true}
  );

  setTimeout(()=>internalMapMove=false,500);
}


/* ==========================================================
   REISE / ERKUNDUNG
   ========================================================== */

function setMapMode(mode){

  mapMode=mode;

  localStorage.setItem("ravenMapMode",mode);

  updateMapModeUI();
  redrawFog();
}

function updateMapModeUI(){

  document
    .getElementById("travelModeButton")
    .classList.toggle("active",mapMode==="travel");

  document
    .getElementById("exploreModeButton")
    .classList.toggle("active",mapMode==="explore");
}

