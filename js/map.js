/* ==========================================================
   KARTE
   ========================================================== */

const map = L.map("map",{
  zoomControl:false
}).setView([51.5157,8.741],15);

/* Marker liegen bewusst über dem Erkundungsnebel. */
map.createPane("ravenFogPane");
map.getPane("ravenFogPane").style.zIndex="450";
map.getPane("ravenFogPane").style.pointerEvents="none";

map.createPane("ravenForegroundPane");
map.getPane("ravenForegroundPane").style.zIndex="700";

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom:19,
    attribution:"© OpenStreetMap"
  }
).addTo(map);

L.control.zoom({position:"topright"}).addTo(map);

let userMarker = null;
let pointMarkers = {};
let boundaryLayer = null;
let fuerstenbergBoundary = null;

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
      {icon,pane:"ravenForegroundPane",zIndexOffset:1000}
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

    followUser = false;

    document.getElementById("statusText").textContent="GOD";
    document.getElementById("gpsInfo").textContent="GOD MODE";

    setTemporaryMessage(
      "🛠 GOD MODE aktiv – tippe auf die Karte, um Raven zu teleportieren.",
      5000
    );

  }else{

    document.getElementById("statusText").textContent =
      tracking ? "Aktiv" : "Bereit";

    document.getElementById("gpsInfo").textContent =
      tracking ? "GPS aktiv" : "GPS pausiert";

    setTemporaryMessage("🛠 GOD MODE beendet.");

  }

  updateFollowUI();
  updateUserMarker();
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
