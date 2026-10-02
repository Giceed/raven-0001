/* ==========================================================
   GPS
   ========================================================== */

function toggleExploration(){

  if(tracking){
    stopExploration();
  }else{
    startExploration();
  }
}

let ravenGpsStartToken=0;
let ravenGpsLifecyclePaused=false;
let ravenGpsResumeAfterLifecycle=false;

function ravenLocationProvider(){
  if(window.RavenNativeLocation)return window.RavenNativeLocation;
  return{
    async requestPermission(){return true;},
    async watchPosition(options,callback){
      if(!navigator.geolocation)throw Object.assign(new Error("GPS wird von diesem Gerät nicht unterstützt."),{code:2});
      return navigator.geolocation.watchPosition(position=>callback(position),error=>callback(null,error),options);
    },
    async clearWatch(id){if(navigator.geolocation&&id!==null)navigator.geolocation.clearWatch(id);}
  };
}

function showRavenGpsError(error){
  tracking=false;
  watchId=null;
  document.getElementById("exploreButton").textContent="Erkundung starten";
  document.getElementById("exploreButton").className="primary";
  document.getElementById("statusText").textContent="Bereit";
  document.getElementById("gpsInfo").textContent="GPS-Fehler";
  const reasons={1:"Standortzugriff wurde nicht erlaubt.",2:"Das Gerät konnte gerade keine Position bestimmen.",3:"Die Standortsuche hat zu lange gedauert."};
  const denied=String(error?.code||"").includes("0003")||String(error?.message||"").toLowerCase().includes("denied");
  const reason=denied?reasons[1]:(reasons[error?.code]||error?.message||"Der Standort konnte nicht bestimmt werden.");
  setMessage(`GPS-Fehler: ${reason} Prüfe Ortungsdienste und versuche es erneut.`);
  if(typeof reportRavenGpsProblem==="function")reportRavenGpsProblem(reason,error?.message||"");
  if(typeof logRavenEvent==="function")logRavenEvent("GPS-Fehler",reason);
}

async function beginRavenPositionWatch(token){
  const provider=ravenLocationProvider();
  await provider.requestPermission();
  const id=await provider.watchPosition({enableHighAccuracy:true,maximumAge:0,timeout:20000,minimumUpdateInterval:1000},(position,error)=>{
    if(token!==ravenGpsStartToken||!tracking||ravenGpsLifecyclePaused)return;
    if(error){showRavenGpsError(error);return;}
    if(position)handlePosition(position);
  });
  if(token!==ravenGpsStartToken||!tracking||ravenGpsLifecyclePaused){await provider.clearWatch(id);return;}
  watchId=id;
}

async function startExploration(){

  if(typeof canRavenStartExploration==="function"){
    const readiness=canRavenStartExploration();
    if(!readiness.ok){setMessage(`🐦‍⬛ ${readiness.message}`);setRavenLifeMessage(readiness.message);return;}
  }

  if(!navigator.geolocation&&!window.RavenNativeLocation){

    setMessage("GPS wird von diesem Gerät nicht unterstützt.");
    return;
  }

  tracking=true;
  sessionDistance=0;
  lastPosition=null;
  followUser=true;
  updateFollowUI();

  document.getElementById("exploreButton").textContent =
    "Erkundung beenden";

  document.getElementById("exploreButton").className =
    "danger";

  document.getElementById("statusText").textContent =
    "Unterwegs";

  document.getElementById("gpsInfo").textContent =
    "GPS wird gestartet …";

  setMessage("📡 Raven sucht deine Position …");
  if(typeof logRavenEvent==="function")logRavenEvent("Erkundung gestartet");

  ravenGpsLifecyclePaused=false;
  const token=++ravenGpsStartToken;
  try{await beginRavenPositionWatch(token);}catch(error){if(token===ravenGpsStartToken)showRavenGpsError(error);}
}

async function stopExploration(){

  tracking=false;
  ravenGpsResumeAfterLifecycle=false;
  ravenGpsLifecyclePaused=false;
  ++ravenGpsStartToken;

  if(watchId!==null){
    const id=watchId;
    watchId=null;
    try{await ravenLocationProvider().clearWatch(id);}catch(error){if(typeof logRavenEvent==="function")logRavenEvent("GPS konnte nicht sauber beendet werden",error?.message||"");}
  }

  document.getElementById("statusText").textContent =
    "Bereit";

  document.getElementById("gpsInfo").textContent =
    "GPS pausiert";

  document.getElementById("exploreButton").textContent =
    "Erkundung starten";

  document.getElementById("exploreButton").className =
    "primary";

  setMessage(
    sessionDistance>0
      ? `🐦‍⬛ Erkundung beendet – ${(sessionDistance/1000).toFixed(2)} km zurückgelegt.`
      : "Erkundung beendet."
  );

  sessionDistance=0;
  updateUI();
}

async function pauseRavenExplorationForLifecycle(){
  if(!tracking||ravenGpsLifecyclePaused)return;
  ravenGpsLifecyclePaused=true;
  ravenGpsResumeAfterLifecycle=true;
  ++ravenGpsStartToken;
  const id=watchId;watchId=null;lastPosition=null;
  if(id!==null)try{await ravenLocationProvider().clearWatch(id);}catch{}
  document.getElementById("gpsInfo").textContent="GPS pausiert · App im Hintergrund";
}

async function resumeRavenExplorationFromLifecycle(){
  if(!tracking||!ravenGpsResumeAfterLifecycle||!ravenGpsLifecyclePaused)return;
  ravenGpsLifecyclePaused=false;
  ravenGpsResumeAfterLifecycle=false;
  lastPosition=null;
  document.getElementById("gpsInfo").textContent="GPS wird fortgesetzt …";
  const token=++ravenGpsStartToken;
  try{await beginRavenPositionWatch(token);}catch(error){if(token===ravenGpsStartToken)showRavenGpsError(error);}
}

const RAVEN_SPEED_PAUSE_KMH=12;
const RAVEN_SPEED_BLOCK_KMH=20;
const RAVEN_SPEED_RELEASE_MS=5000;
const RAVEN_MAX_GPS_ACCURACY=35;
const RAVEN_HISTORY_LIMIT=12000;
let ravenSlowSince=0;
window.ravenSpeedState="free";
window.ravenMovementLocked=false;

function updateRavenSpeedState(speed){
  const previous=window.ravenSpeedState;
  if(speed>RAVEN_SPEED_BLOCK_KMH){
    window.ravenSpeedState="blocked";
    ravenSlowSince=0;
  }else if(speed>=RAVEN_SPEED_PAUSE_KMH){
    window.ravenSpeedState="paused";
    ravenSlowSince=0;
  }else if(previous!=="free"){
    if(!ravenSlowSince)ravenSlowSince=Date.now();
    window.ravenSpeedState=Date.now()-ravenSlowSince>=RAVEN_SPEED_RELEASE_MS?"free":"cooldown";
  }else{
    window.ravenSpeedState="free";
    ravenSlowSince=0;
  }
  window.ravenMovementLocked=window.ravenSpeedState!=="free";
  if(previous!==window.ravenSpeedState&&typeof logRavenEvent==="function"){
    const labels={blocked:"Fahrsperre",paused:"Bewegungspause",cooldown:"Warte auf Freigabe",free:"Bewegung freigegeben"};
    logRavenEvent(labels[window.ravenSpeedState],`${speed.toFixed(1)} km/h`);
  }
  return window.ravenSpeedState;
}

function handlePosition(position){

  if(!tracking || godMode) return;

  const coords=position.coords;

  const lat=coords.latitude;
  const lon=coords.longitude;
  const accuracy=coords.accuracy;

  let measuredSpeed=Number.isFinite(coords.speed)?Math.max(0,coords.speed*3.6):0;
  if(!measuredSpeed&&lastPosition?.time){
    const seconds=(Date.now()-lastPosition.time)/1000;
    if(seconds>0)measuredSpeed=haversineDistance(lastPosition.lat,lastPosition.lon,lat,lon)/seconds*3.6;
  }
  window.currentSpeedKmh=measuredSpeed;
  const speedState=updateRavenSpeedState(measuredSpeed);

  if(accuracy && accuracy>RAVEN_MAX_GPS_ACCURACY){

    document.getElementById("gpsInfo").textContent =
      `Warte auf genaues GPS · aktuell ±${Math.round(accuracy)} m`;

    setMessage("Grober Standort gefunden - Raven wartet auf deine genaue Position.");
    if(typeof logRavenEvent==="function")logRavenEvent("GPS zu ungenau",`±${Math.round(accuracy)} m`);
    return;
  }

  const locationZoom=16;

  currentLat=lat;
  currentLon=lon;
  currentAccuracy=accuracy;

  if(!firstValidFix){

    firstValidFix=true;

    document.getElementById("statusText").textContent =
      "Aktiv";

    setMessage("📍 GPS aktiv – Raven folgt dir.");
    if(typeof logRavenEvent==="function")logRavenEvent("Standort erkannt",`${lat.toFixed(5)}, ${lon.toFixed(5)}`);

    /* Nach einem God-Mode-Test sofort zum echten Standort zurückkehren. */
    internalMapMove=true;
    map.setView([lat,lon],locationZoom,{animate:true});
    setTimeout(()=>internalMapMove=false,500);
  }

  document.getElementById("gpsInfo").textContent =
    accuracy
      ? `GPS aktiv · ±${Math.round(accuracy)} m`
      : "GPS aktiv";

  updateUserMarker();

  if(followUser){

    internalMapMove=true;

    map.setView(
      [lat,lon],
      locationZoom,
      {animate:true}
    );

    setTimeout(()=>internalMapMove=false,500);
  }

  if(lastPosition){

    const moved=haversineDistance(
      lastPosition.lat,
      lastPosition.lon,
      lat,
      lon
    );

    if(moved>=3 && moved<150){

      totalDistance+=moved;
      sessionDistance+=moved;
      if(typeof applyRavenMovement==="function")applyRavenMovement(moved);

      localStorage.setItem(
        "ravenDistance",
        totalDistance
      );

      travelHistory.push({
        lat,
        lon,
        time:Date.now()
      });

      if(travelHistory.length>RAVEN_HISTORY_LIMIT){
        travelHistory=travelHistory.slice(-RAVEN_HISTORY_LIMIT);
      }

      localStorage.setItem(
        "ravenTravelHistory",
        JSON.stringify(travelHistory)
      );
    }
  }

  lastPosition={lat,lon,time:Date.now()};

  /* Reisen deckt die Karte immer auf – auch im Auto. Nur POIs bleiben gesperrt. */
  saveExploredPoint(lat,lon);
  if(speedState!=="free"&&typeof logRavenEvent==="function"){
    logRavenEvent(speedState==="blocked"?"Autofahrt erkannt":"Bewegung zu schnell",`${measuredSpeed.toFixed(1)} km/h · Fog wird aufgedeckt, Punkte bleiben gesperrt`);
  }
  updateAllPointStates(lat,lon);

  maybeReverseGeocode(lat,lon);

  updateUI();
  redrawFog();
}

function saveExploredPoint(lat,lon){

  const last=exploredPoints.at(-1);

  if(last){

    const distance=haversineDistance(
      last.lat,
      last.lon,
      lat,
      lon
    );

    if(distance<20) return;
  }

  exploredPoints.push({
    lat,
    lon,
    time:Date.now()
  });

  if(exploredPoints.length>RAVEN_HISTORY_LIMIT){
    exploredPoints=exploredPoints.slice(-RAVEN_HISTORY_LIMIT);
  }

  localStorage.setItem(
    "ravenExploredPoints",
    JSON.stringify(exploredPoints)
  );
}
