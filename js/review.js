/* ==========================================================
   V2.7 OSM POI-PRUEFMODUS
   Vorschlaege bleiben lokal, bis sie spaeter bewusst exportiert werden.
   ========================================================== */

let poiReviewEnabled=false;
let poiReviewCandidates=JSON.parse(localStorage.getItem("ravenPoiReviewV27") || "[]");
let poiReviewMarkers={};
let selectedReviewId=null;
let movingReviewId=null;

const REVIEW_ENDPOINTS=[
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter"
];

function togglePoiReview(){
  poiReviewEnabled=!poiReviewEnabled;
  document.getElementById("reviewToggle").textContent=
    poiReviewEnabled ? "âœ• POI-PRÃœFMODUS BEENDEN" : "ðŸ§­ POI-PRÃœFMODUS STARTEN";

  if(!poiReviewEnabled){
    clearReviewMarkers();
    document.getElementById("reviewEditor").hidden=true;
    setReviewStatus("PrÃ¼fmodus pausiert. Deine Entscheidungen sind gespeichert.");
    return;
  }

  if(poiReviewCandidates.length){
    renderReviewMarkers();
    updateReviewSummary();
  }else{
    loadOsmReviewCandidates();
  }
}

async function loadOsmReviewCandidates(){
  setReviewStatus("â³ OpenStreetMap-VorschlÃ¤ge fÃ¼r FÃ¼rstenberg werden geladen â€¦");
  const query=`[out:json][timeout:25];(
    nwr(around:3000,${TEST_REGION.centerLat},${TEST_REGION.centerLon})[tourism][name];
    nwr(around:3000,${TEST_REGION.centerLat},${TEST_REGION.centerLon})[historic][name];
    nwr(around:3000,${TEST_REGION.centerLat},${TEST_REGION.centerLon})[amenity][name];
    nwr(around:3000,${TEST_REGION.centerLat},${TEST_REGION.centerLon})[leisure][name];
  );out center tags;`;

  let data=null;
  for(const endpoint of REVIEW_ENDPOINTS){
    try{
      const response=await fetch(endpoint,{
        method:"POST",
        headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},
        body:"data="+encodeURIComponent(query)
      });
      if(response.ok){ data=await response.json(); break; }
    }catch(error){ /* naechsten Server versuchen */ }
  }

  if(!data){
    setReviewStatus("âš  OSM-Server gerade nicht erreichbar. SpÃ¤ter erneut versuchen.");
    return;
  }

  poiReviewCandidates=data.elements
    .map(makeReviewCandidate)
    .filter(Boolean)
    .filter(candidate=>!ALL_POINTS.some(point=>
      haversineDistance(candidate.lat,candidate.lon,point.lat,point.lon)<35
    ))
    .sort((a,b)=>b.score-a.score)
    .slice(0,40);

  saveReviewCandidates();
  renderReviewMarkers();
  updateReviewSummary();
}

function makeReviewCandidate(element){
  const tags=element.tags || {};
  const lat=element.lat ?? element.center?.lat;
  const lon=element.lon ?? element.center?.lon;
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||!tags.name) return null;
  if(["private","no"].includes(tags.access)||tags.foot==="no") return null;

  const explorationTypes=["castle","memorial","monument","archaeological_site","attraction","viewpoint","museum","artwork"];
  const activityTypes=["playground","park","sports_centre","pitch","fitness_station","picnic_site"];
  const rawType=tags.historic||tags.tourism||tags.leisure||tags.amenity||"poi";
  const category=activityTypes.includes(rawType) ? "activity" : "exploration";
  const useful=explorationTypes.includes(rawType)||activityTypes.includes(rawType)||
    ["place_of_worship","townhall","library","community_centre","fountain"].includes(rawType);
  if(!useful) return null;

  let score=40;
  if(tags.wikidata||tags.wikipedia) score+=25;
  if(tags.historic||tags.tourism) score+=15;
  if(tags.access==="yes"||tags.foot==="yes") score+=10;
  const radius=["castle","manor","archaeological_site"].includes(rawType) ? 140 :
    ["place_of_worship","townhall","museum"].includes(rawType) ? 60 : 35;

  return {
    id:`osm-${element.type}-${element.id}`,
    osmType:element.type,
    osmId:element.id,
    name:tags.name,
    rawType,
    category,
    lat,lon,radius,score,
    access:tags.access||tags.foot||"unbekannt",
    status:"pending"
  };
}

function renderReviewMarkers(){
  clearReviewMarkers();
  poiReviewCandidates.forEach(candidate=>{
    if(candidate.status==="rejected") return;
    const icon=L.divIcon({className:"",html:`<div class="review-marker ${candidate.category} ${candidate.status}">ðŸ”Ž</div>`,iconSize:[30,30],iconAnchor:[15,15]});
    poiReviewMarkers[candidate.id]=L.marker([candidate.lat,candidate.lon],{icon,pane:"ravenForegroundPane"})
      .addTo(map).on("click",()=>selectReviewCandidate(candidate.id));
  });
}

function clearReviewMarkers(){
  Object.values(poiReviewMarkers).forEach(marker=>map.removeLayer(marker));
  poiReviewMarkers={};
}

function selectReviewCandidate(id){
  const candidate=poiReviewCandidates.find(item=>item.id===id);
  if(!candidate) return;
  selectedReviewId=id;
  document.getElementById("reviewEditor").hidden=false;
  document.getElementById("reviewName").textContent=candidate.name;
  document.getElementById("reviewMeta").textContent=
    `${candidate.category==="activity"?"AktivitÃ¤t":"Erkundung"} Â· ${candidate.rawType} Â· Radius ${candidate.radius} m Â· Bewertung ${candidate.score}/100 Â· Zugang ${candidate.access}`;
}

function currentReviewCandidate(){
  return poiReviewCandidates.find(item=>item.id===selectedReviewId);
}

function changeReviewRadius(delta){
  const candidate=currentReviewCandidate(); if(!candidate) return;
  candidate.radius=Math.max(15,Math.min(250,candidate.radius+delta));
  saveReviewCandidates(); selectReviewCandidate(candidate.id);
}

function approveReviewCandidate(){
  const candidate=currentReviewCandidate(); if(!candidate) return;
  candidate.status="approved"; saveReviewCandidates(); renderReviewMarkers(); updateReviewSummary(); selectReviewCandidate(candidate.id);
}

function rejectReviewCandidate(){
  const candidate=currentReviewCandidate(); if(!candidate) return;
  candidate.status="rejected"; saveReviewCandidates(); renderReviewMarkers(); updateReviewSummary();
  document.getElementById("reviewEditor").hidden=true;
}

function moveReviewCandidate(){
  const candidate=currentReviewCandidate(); if(!candidate) return;
  movingReviewId=candidate.id;
  setReviewStatus(`ðŸ“ Tippe auf der Karte auf die neue Position fÃ¼r ${candidate.name}.`);
}

map.on("click",event=>{
  if(!poiReviewEnabled||!movingReviewId||godMode) return;
  const candidate=poiReviewCandidates.find(item=>item.id===movingReviewId);
  if(!candidate) return;
  candidate.lat=event.latlng.lat; candidate.lon=event.latlng.lng;
  movingReviewId=null; saveReviewCandidates(); renderReviewMarkers(); selectReviewCandidate(candidate.id); updateReviewSummary();
});

function saveReviewCandidates(){
  localStorage.setItem("ravenPoiReviewV27",JSON.stringify(poiReviewCandidates));
}

function setReviewStatus(text){ document.getElementById("reviewStatus").textContent=text; }

function updateReviewSummary(){
  const approved=poiReviewCandidates.filter(item=>item.status==="approved").length;
  const pending=poiReviewCandidates.filter(item=>item.status==="pending").length;
  const rejected=poiReviewCandidates.filter(item=>item.status==="rejected").length;
  setReviewStatus(`${pending} zu prÃ¼fen Â· ${approved} behalten Â· ${rejected} gelÃ¶scht`);
}

