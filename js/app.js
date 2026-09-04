/* ==========================================================
   NACHRICHTEN
   ========================================================== */

let messageTimer=null;

function setMessage(text){

  if(messageTimer){

    clearTimeout(messageTimer);
    messageTimer=null;
  }

  document.getElementById("message").textContent =
    text;
}

function setTemporaryMessage(
  text,
  duration=3500
){

  if(messageTimer){
    clearTimeout(messageTimer);
  }

  document.getElementById("message").textContent =
    text;

  messageTimer=setTimeout(()=>{

    if(godMode){

      document.getElementById("message").textContent =
        "🛠 GOD MODE aktiv – tippe auf die Karte.";

    }else if(tracking && firstValidFix){

      document.getElementById("message").textContent =
        "📍 GPS aktiv – Raven folgt dir.";

    }else if(tracking){

      document.getElementById("message").textContent =
        "📡 Raven sucht deine Position …";

    }else{

      document.getElementById("message").textContent =
        "Dein Raven wartet auf sein nächstes Abenteuer.";
    }

    messageTimer=null;

  },duration);
}


/* ==========================================================
   UI
   ========================================================== */

function updateUI(){

  document.getElementById("xp").textContent=xp;

  document.getElementById("level").textContent=level;

  document.getElementById("xpfill").style.width=
    Math.min(xp,100)+"%";

  document.getElementById("distance").textContent=
    (totalDistance/1000).toFixed(2);

  document.getElementById("sessionDistance").textContent=
    Math.round(sessionDistance);

  document.getElementById("areas").textContent=
    discoveredPlaces.length;
}


/* ==========================================================
   ENTFERNUNG
   ========================================================== */

function haversineDistance(
  lat1,
  lon1,
  lat2,
  lon2
){

  const R=6371000;

  const toRad=
    value=>value*Math.PI/180;

  const dLat=
    toRad(lat2-lat1);

  const dLon=
    toRad(lon2-lon1);

  const a=
    Math.sin(dLat/2)**2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon/2)**2;

  const c=
    2*Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1-a)
    );

  return R*c;
}

function destinationPoint(
  lat,
  lon,
  distance,
  bearing
){

  const R=6371000;

  const bearingRad=
    bearing*Math.PI/180;

  const lat1=
    lat*Math.PI/180;

  const lon1=
    lon*Math.PI/180;

  const angularDistance=
    distance/R;

  const lat2=
    Math.asin(
      Math.sin(lat1) *
      Math.cos(angularDistance) +

      Math.cos(lat1) *
      Math.sin(angularDistance) *
      Math.cos(bearingRad)
    );

  const lon2=
    lon1 +
    Math.atan2(

      Math.sin(bearingRad) *
      Math.sin(angularDistance) *
      Math.cos(lat1),

      Math.cos(angularDistance) -
      Math.sin(lat1) *
      Math.sin(lat2)
    );

  return[
    lat2*180/Math.PI,
    lon2*180/Math.PI
  ];
}


/* ==========================================================
   SICHERE TEXTE
   ========================================================== */

function escapeHTML(value){

  return String(value)

    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* ==========================================================
   START
   ========================================================== */

/* Erst speichern, nachdem alle Module geladen wurden. */
saveMission();

updateUI();

updateMapModeUI();

updateFollowUI();

updateMissionUI();

renderMainLists();

renderTravelBook();

createFogLayer();

drawTestRegion();

loadVisibleAdministrativeBoundaries();

loadFuerstenbergBoundary();

/* Marker sofort erzeugen */
ALL_POINTS.forEach(point=>{
  renderPointMarker(
    point,
    isDiscovered(point),
    false,
    Infinity
  );
});

setTimeout(()=>{

  map.invalidateSize();
  redrawFog();

},400);

