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

function startExploration(){

  if(!navigator.geolocation){

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

  watchId=navigator.geolocation.watchPosition(

    handlePosition,

    ()=>{

      tracking=false;

      document.getElementById("exploreButton").textContent =
        "Erkundung starten";

      document.getElementById("exploreButton").className =
        "primary";

      document.getElementById("statusText").textContent =
        "Bereit";

      document.getElementById("gpsInfo").textContent =
        "GPS-Fehler";

      setMessage("GPS-Fehler. Standortzugriff prüfen.");
    },

    {
      enableHighAccuracy:true,
      maximumAge:0,
      timeout:20000
    }
  );
}

function stopExploration(){

  tracking=false;

  if(watchId!==null){

    navigator.geolocation.clearWatch(watchId);
    watchId=null;
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

function handlePosition(position){

  if(!tracking || godMode) return;

  const coords=position.coords;

  const lat=coords.latitude;
  const lon=coords.longitude;
  const accuracy=coords.accuracy;

  if(accuracy && accuracy>35){

    document.getElementById("gpsInfo").textContent =
      `GPS ungenau ±${Math.round(accuracy)} m`;

    return;
  }

  currentLat=lat;
  currentLon=lon;
  currentAccuracy=accuracy;

  if(!firstValidFix){

    firstValidFix=true;

    document.getElementById("statusText").textContent =
      "Aktiv";

    setMessage("📍 GPS aktiv – Raven folgt dir.");

    /* Nach einem God-Mode-Test sofort zum echten Standort zurückkehren. */
    internalMapMove=true;
    map.setView([lat,lon],Math.max(map.getZoom(),16),{animate:true});
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
      Math.max(map.getZoom(),16),
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

      localStorage.setItem(
        "ravenDistance",
        totalDistance
      );

      travelHistory.push({
        lat,
        lon,
        time:Date.now()
      });

      if(travelHistory.length>12000){
        travelHistory=travelHistory.slice(-12000);
      }

      localStorage.setItem(
        "ravenTravelHistory",
        JSON.stringify(travelHistory)
      );
    }
  }

  lastPosition={lat,lon};

  saveExploredPoint(lat,lon);

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

  if(exploredPoints.length>12000){
    exploredPoints=exploredPoints.slice(-12000);
  }

  localStorage.setItem(
    "ravenExploredPoints",
    JSON.stringify(exploredPoints)
  );
}

