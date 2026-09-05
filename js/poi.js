/* ==========================================================
   POI MARKER
   ========================================================== */

function isDiscovered(point){

  return point.type==="activity"
    ? fuerstenbergMission.visitedActivities.includes(point.id)
    : fuerstenbergMission.visitedPOIs.includes(point.id);
}

function getDiscoveryRadius(point){
  return point.discoveryRadius || FUERSTENBERG.visitRadius;
}

function updateAllPointStates(lat,lon){

  ALL_POINTS.forEach(point=>{

    const distance=haversineDistance(
      lat,
      lon,
      point.lat,
      point.lon
    );

    const discovered=isDiscovered(point);
    const inRange=distance<=getDiscoveryRadius(point);

    renderPointMarker(
      point,
      discovered,
      inRange,
      distance
    );
  });

  renderMainLists();
}

function renderPointMarker(point,discovered,inRange,distance){

  const district=point.district||(point.id.startsWith("concept-")?"":"Fürstenberg");
  const districtActive=currentRavenDistrict&&normalizePlaceName(currentRavenDistrict)===normalizePlaceName(district);
  if(!godMode&&!districtActive){
    if(pointMarkers[point.id]){
      map.removeLayer(pointMarkers[point.id]);
      delete pointMarkers[point.id];
    }
    removePointRadius(point.id);
    return;
  }

  renderPointRadius(point);

  let css="poi-marker";

  if(point.type==="activity"){
    css+=" activity";
  }

  if(discovered){
    css+=" done";
  }else if(inRange){
    css+=" range";
  }

  const content =
    discovered
      ? point.icon
      : "?";

  const icon=L.divIcon({
    className:"",
    html:`<div class="${css}">${content}</div>`,
    iconSize:[28,28],
    iconAnchor:[14,14]
  });

  if(!pointMarkers[point.id]){

    pointMarkers[point.id]=
      L.marker(
        [point.lat,point.lon],
        {icon,pane:"ravenForegroundPane"}
      )
      .addTo(map)
      .on("click",()=>tryOpenPoint(point));

  }else{

    pointMarkers[point.id].setIcon(icon);
  }
}

function removePointRadius(pointId){
  if(!pointRadiusLayers[pointId]) return;
  map.removeLayer(pointRadiusLayers[pointId]);
  delete pointRadiusLayers[pointId];
}

function renderPointRadius(point){
  if(!godMode){
    removePointRadius(point.id);
    return;
  }

  const color=point.type==="activity"?"#fb923c":"#a855f7";
  const radius=getDiscoveryRadius(point);

  if(!pointRadiusLayers[point.id]){
    pointRadiusLayers[point.id]=L.circle([point.lat,point.lon],{
      radius,
      color,
      weight:2,
      opacity:.95,
      dashArray:"7 5",
      fillColor:color,
      fillOpacity:.12,
      interactive:false
    }).addTo(map);
  }else{
    pointRadiusLayers[point.id]
      .setLatLng([point.lat,point.lon])
      .setRadius(radius)
      .setStyle({color,fillColor:color});
  }

  pointRadiusLayers[point.id].bringToBack();
}

function tryOpenPoint(point){

  if(isDiscovered(point)){

    setTemporaryMessage(
      `${point.icon} ${point.name} wurde bereits entdeckt.`
    );

    return;
  }

  if(currentLat===null || currentLon===null){

    setTemporaryMessage(
      "📍 Raven kennt seine Position noch nicht."
    );

    return;
  }

  const distance=haversineDistance(
    currentLat,
    currentLon,
    point.lat,
    point.lon
  );

  const discoveryRadius=getDiscoveryRadius(point);

  if(distance>discoveryRadius){

    setTemporaryMessage(
      `? Dieser Punkt ist noch ${Math.round(distance)} m entfernt (Radius ${discoveryRadius} m).`
    );

    return;
  }

  openScratch(point);
}


/* ==========================================================
   HAUPTLISTEN
   ========================================================== */

function renderMainLists(){
  if(!currentRavenDistrict){
    document.getElementById("explorationList").innerHTML="";
    document.getElementById("activityList").innerHTML="";
    updateMissionUI();
    return;
  }

  const placePoints=ALL_POINTS.filter(point=>
    normalizePlaceName(point.district||(point.id.startsWith("concept-")?"":"Fürstenberg"))===normalizePlaceName(currentRavenDistrict)
  );

  renderPointList("explorationList",placePoints.filter(point=>point.type==="exploration"));
  renderPointList("activityList",placePoints.filter(point=>point.type==="activity"));

  updateMissionUI();
}

function renderPointList(elementId,points){

  const container=document.getElementById(elementId);

  container.innerHTML="";

  points.forEach(point=>{

    const discovered=isDiscovered(point);

    const row=document.createElement("div");

    row.className=
      "poi-row " +
      (point.type==="activity" ? "activity " : "") +
      (discovered ? "done" : "");

    row.innerHTML=`
      <div class="poi-name">
        ${discovered
          ? `${point.icon} ${escapeHTML(point.name)}`
          : "? Unbekannter " +
            (point.type==="activity"
              ? "Aktivitätspunkt"
              : "Erkundungspunkt")
        }
      </div>

      <div class="poi-state">
        ${discovered ? "ENTDECKT ✓" : "UNBEKANNT"}
      </div>
    `;

    row.onclick=()=>tryOpenPoint(point);

    container.appendChild(row);
  });
}

/* ==========================================================
   RUBBELN
   ========================================================== */

let scratchPoint=null;
let scratching=false;
let scratchCompleted=false;
let scratchCheckCounter=0;

const scratchOverlay=
  document.getElementById("scratchOverlay");

const scratchCanvas=
  document.getElementById("scratchCanvas");

const scratchContext=
  scratchCanvas.getContext("2d");

function openScratch(point){

  scratchPoint=point;
  scratchCompleted=false;
  scratchCheckCounter=0;

  document.getElementById("scratchTitle").textContent =
    point.type==="activity"
      ? "🐦‍⬛ Aktivität entdeckt?"
      : "🐦‍⬛ Erkundungspunkt";

  document.getElementById("scratchIcon").textContent =
    point.icon;

  document.getElementById("scratchName").textContent =
    point.name;

  scratchOverlay.style.display="flex";

  document.getElementById("scratchClose").textContent =
    "Schließen";

  requestAnimationFrame(setupScratchCanvas);
}

function setupScratchCanvas(){

  const rect=
    scratchCanvas.getBoundingClientRect();

  const dpr=
    window.devicePixelRatio || 1;

  scratchCanvas.width=
    Math.round(rect.width*dpr);

  scratchCanvas.height=
    Math.round(rect.height*dpr);

  scratchContext.setTransform(
    dpr,0,0,dpr,0,0
  );

  scratchContext.globalCompositeOperation=
    "source-over";

  const gradient=
    scratchContext.createLinearGradient(
      0,0,rect.width,rect.height
    );

  gradient.addColorStop(0,"#3f3f46");
  gradient.addColorStop(.5,"#71717a");
  gradient.addColorStop(1,"#27272a");

  scratchContext.fillStyle=gradient;

  scratchContext.fillRect(
    0,0,rect.width,rect.height
  );

  scratchContext.fillStyle="#e4e4e7";
  scratchContext.font="bold 16px Arial";
  scratchContext.textAlign="center";
  scratchContext.textBaseline="middle";

  scratchContext.fillText(
    "RUBBEL MICH FREI",
    rect.width/2,
    rect.height/2
  );
}

function scratchAt(clientX,clientY){

  if(scratchCompleted) return;

  const rect=
    scratchCanvas.getBoundingClientRect();

  const x=clientX-rect.left;
  const y=clientY-rect.top;

  scratchContext.globalCompositeOperation=
    "destination-out";

  scratchContext.beginPath();

  scratchContext.arc(
    x,y,22,0,Math.PI*2
  );

  scratchContext.fill();

  scratchCheckCounter++;

  if(scratchCheckCounter%12===0){
    checkScratchProgress();
  }
}

function checkScratchProgress(){

  if(scratchCompleted) return;

  const image=
    scratchContext.getImageData(
      0,
      0,
      scratchCanvas.width,
      scratchCanvas.height
    );

  let transparent=0;
  let checked=0;

  for(
    let i=3;
    i<image.data.length;
    i+=4*20
  ){

    checked++;

    if(image.data[i]<40){
      transparent++;
    }
  }

  if(transparent/checked>=.45){
    completeScratch();
  }
}

function completeScratch(){

  if(scratchCompleted || !scratchPoint) return;

  scratchCompleted=true;

  scratchContext.clearRect(
    0,
    0,
    scratchCanvas.width,
    scratchCanvas.height
  );

  discoverPoint(scratchPoint);

  document.getElementById("scratchClose").textContent =
    "Weiter";
}

function closeScratch(){

  scratchOverlay.style.display="none";
  scratchPoint=null;
  scratching=false;
}

scratchCanvas.addEventListener(
  "pointerdown",
  event=>{

    scratching=true;

    scratchAt(
      event.clientX,
      event.clientY
    );
  }
);

scratchCanvas.addEventListener(
  "pointermove",
  event=>{

    if(!scratching) return;

    scratchAt(
      event.clientX,
      event.clientY
    );
  }
);

window.addEventListener(
  "pointerup",
  ()=>scratching=false
);


/* ==========================================================
   PUNKT ENTDECKEN
   ========================================================== */

function discoverPoint(point){

  if(isDiscovered(point)) return;

  if(point.type==="activity"){

    fuerstenbergMission
      .visitedActivities
      .push(point.id);

    addXP(FUERSTENBERG.activityXP);

    setTemporaryMessage(
      `✨ ${point.name} entdeckt! +${FUERSTENBERG.activityXP} XP`,
      4500
    );

  }else{

    fuerstenbergMission
      .visitedPOIs
      .push(point.id);

    addXP(FUERSTENBERG.poiXP);

    const allDone=
      FUERSTENBERG.explorationPOIs
        .every(point =>
          fuerstenbergMission
            .visitedPOIs
            .includes(point.id)
        );

    if(
      allDone &&
      !fuerstenbergMission.completed
    ){

      fuerstenbergMission.completed=true;

      addXP(
        FUERSTENBERG.completionXP
      );

      setTemporaryMessage(
        `🏆 Fürstenberg vollständig erkundet! +${FUERSTENBERG.completionXP} XP`,
        5000
      );

    }else{

      setTemporaryMessage(
        `✨ ${point.name} entdeckt! +${FUERSTENBERG.poiXP} XP`,
        4500
      );
    }
  }

  saveMission();

  renderMainLists();
  renderTravelBook();
  updateMissionUI();

  if(
    currentLat!==null &&
    currentLon!==null
  ){

    updateAllPointStates(
      currentLat,
      currentLon
    );
  }

  updateBoundaryOutline();
  redrawFog();
}

function saveMission(){

  localStorage.setItem(
    "ravenFuerstenbergMission",
    JSON.stringify(fuerstenbergMission)
  );
}

function isFuerstenbergDiscovered(){

  return discoveredPlaces.some(place =>
    normalizePlaceName(place.name).includes("fürstenberg")
  );
}

function updateMissionUI(){
  const title=document.getElementById("missionTitle");
  const text=document.getElementById("missionText");
  if(!currentRavenDistrict){
    title.textContent="📍 Standort: unbekannt";
    text.textContent="Starte die Erkundung, damit Raven deinen Ort erkennt und die zugehörigen Punkte lädt.";
    return;
  }
  const points=ALL_POINTS.filter(point=>normalizePlaceName(point.district||(point.id.startsWith("concept-")?"":"Fürstenberg"))===normalizePlaceName(currentRavenDistrict));
  const exploration=points.filter(point=>point.type==="exploration");
  const activities=points.filter(point=>point.type==="activity");
  const foundExploration=exploration.filter(isDiscovered).length;
  const foundActivities=activities.filter(isDiscovered).length;
  title.textContent=`📍 Standort: ${currentRavenDistrict}`;
  text.textContent=`${foundExploration}/${exploration.length} Erkundungspunkte entdeckt · Aktivitäten ${foundActivities}/${activities.length}.`;
}


/* ==========================================================
   XP
   ========================================================== */

function addXP(amount){

  xp+=amount;

  while(xp>=100){

    xp-=100;
    level++;
  }

  localStorage.setItem(
    "ravenXP",
    xp
  );

  localStorage.setItem(
    "ravenLevel",
    level
  );

  updateUI();
}

