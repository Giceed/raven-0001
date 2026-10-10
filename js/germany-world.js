/* ==========================================================
   RAVEN DEUTSCHLAND – BEDARFSGESTEUERTE SPIELWELT

   Es wird niemals ganz Deutschland als riesige POI-Datei geladen.
   Erst wenn GPS oder God Mode einen Ort erkennt, lädt Raven eine
   kleine, nach Ortsgröße begrenzte Auswahl aus offenen Kartendaten.
   Fürstenberg bleibt der handgepflegte Referenzort.
   ========================================================== */

const RAVEN_PLACE_POINT_CACHE_KEY="ravenGermanyPlacePointsV2";
const RAVEN_PLACE_BOUNDARY_CACHE_KEY="ravenGermanyBoundariesV1";
const RAVEN_OVERPASS_ENDPOINTS=[
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter"
];
const ravenPlacePointCache=readRavenStorageJSON(RAVEN_PLACE_POINT_CACHE_KEY,{});
const ravenPlaceBoundaryCache=readRavenStorageJSON(RAVEN_PLACE_BOUNDARY_CACHE_KEY,{});
let ravenPlaceLoadToken=0;
let ravenGermanyBoundaryLayer=null;

const RAVEN_PLACE_PROFILES={
  hamlet:{radius:1300,exploration:2,activity:3,label:"kleiner Ort"},
  village:{radius:2200,exploration:3,activity:5,label:"Dorf"},
  town:{radius:4200,exploration:6,activity:9,label:"Stadt"},
  city:{radius:6500,exploration:10,activity:14,label:"Großstadt"}
};

function ravenPlaceKey(place){
  return normalizePlaceName([place.name,place.municipality,place.region].filter(Boolean).join("|"));
}

function ravenBoundaryForPlace(place){
  return ravenPlaceBoundaryCache[ravenPlaceKey(place)]?.geometry||null;
}

function ravenPointInRing(lat,lon,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const xi=ring[i][0],yi=ring[i][1],xj=ring[j][0],yj=ring[j][1];
    const intersects=((yi>lat)!==(yj>lat))&&(lon<(xj-xi)*(lat-yi)/(yj-yi||Number.EPSILON)+xi);
    if(intersects)inside=!inside;
  }
  return inside;
}

function ravenPointInGeometry(lat,lon,geometry){
  if(!geometry)return true;
  const polygons=geometry.type==="Polygon"?[geometry.coordinates]:geometry.type==="MultiPolygon"?geometry.coordinates:[];
  return polygons.some(polygon=>{
    if(!polygon[0]||!ravenPointInRing(lat,lon,polygon[0]))return false;
    return !polygon.slice(1).some(hole=>ravenPointInRing(lat,lon,hole));
  });
}

function ravenDistanceToSegmentMeters(lat,lon,a,b){
  const metersLat=111320,metersLon=111320*Math.cos(lat*Math.PI/180);
  const ax=(a[0]-lon)*metersLon,ay=(a[1]-lat)*metersLat;
  const bx=(b[0]-lon)*metersLon,by=(b[1]-lat)*metersLat;
  const dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy;
  const t=length?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/length)):0;
  return Math.hypot(ax+t*dx,ay+t*dy);
}

function ravenBoundaryClearanceMeters(lat,lon,geometry){
  if(!geometry)return Infinity;
  const polygons=geometry.type==="Polygon"?[geometry.coordinates]:geometry.coordinates||[];
  let closest=Infinity;
  polygons.forEach(polygon=>polygon.forEach(ring=>{
    for(let index=1;index<ring.length;index++)closest=Math.min(closest,ravenDistanceToSegmentMeters(lat,lon,ring[index-1],ring[index]));
  }));
  return closest;
}

function ravenPointSafelyInsidePlace(point,place,minimumClearance=90){
  const geometry=ravenBoundaryForPlace(place);
  return !geometry||(ravenPointInGeometry(point.lat,point.lon,geometry)&&ravenBoundaryClearanceMeters(point.lat,point.lon,geometry)>=minimumClearance);
}

function registerRavenPlaceBoundary(place,geometry){
  if(!place?.name||!geometry||!["Polygon","MultiPolygon"].includes(geometry.type))return false;
  const key=ravenPlaceKey(place);
  ravenPlaceBoundaryCache[key]={place:{name:place.name,municipality:place.municipality,region:place.region,country:place.country||"Deutschland"},geometry,savedAt:Date.now()};
  localStorage.setItem(RAVEN_PLACE_BOUNDARY_CACHE_KEY,JSON.stringify(ravenPlaceBoundaryCache));
  renderRavenGermanyBoundaries();
  return true;
}

function renderRavenGermanyBoundaries(){
  if(ravenGermanyBoundaryLayer){map.removeLayer(ravenGermanyBoundaryLayer);ravenGermanyBoundaryLayer=null;}
  if(!(godMode||mapMode==="travel"))return;
  ravenGermanyBoundaryLayer=L.layerGroup().addTo(map);
  Object.values(ravenPlaceBoundaryCache).forEach(entry=>{
    if(!entry?.geometry)return;
    const current=normalizePlaceName(entry.place?.name)===normalizePlaceName(currentRavenDistrict);
    L.geoJSON(entry.geometry,{
      pane:"ravenForegroundPane",interactive:true,
      style:{color:current?"#facc15":"#a855f7",weight:current?4:2,opacity:.92,fillColor:"#7e22ce",fillOpacity:current ? .06 : .025}
    }).bindTooltip(entry.place?.name||"Entdecktes Gebiet",{sticky:true,direction:"top"}).addTo(ravenGermanyBoundaryLayer);
  });
}

function updateRavenGermanyBoundaryVisibility(){renderRavenGermanyBoundaries();}

function ravenPointIcon(type){
  const icons={castle:"🏰",museum:"🏛️",memorial:"🗿",monument:"🗿",viewpoint:"🔭",place_of_worship:"⛪",townhall:"🏛️",library:"📚",fire_station:"🚒",police:"🚓",school:"🏫",kindergarten:"🧸",station:"🚉",halt:"🚉",park:"🌳",playground:"🛝",pitch:"⚽",sports_centre:"🏟️",fountain:"⛲",water_tower:"💧",swimming_pool:"🏊"};
  return icons[type]||"◆";
}

function classifyRavenOsmElement(element,place){
  const tags=element.tags||{};
  if(["private","no"].includes(tags.access))return null;
  const rawType=tags.historic||tags.tourism||tags.leisure||tags.amenity||tags.railway||tags.man_made||(tags.highway==="trailhead"?"trailhead":"");
  const explorationTypes=new Set(["castle","manor","museum","attraction","memorial","monument","archaeological_site","viewpoint","artwork","place_of_worship","townhall","library","community_centre","fire_station","police","school","kindergarten","station","halt","water_tower","tower"]);
  const activityTypes=new Set(["playground","pitch","sports_centre","fitness_station","swimming_pool","fountain","park","picnic_site","trailhead"]);
  const category=explorationTypes.has(rawType)?"exploration":activityTypes.has(rawType)?"activity":null;
  if(!category)return null;
  const lat=Number(element.lat??element.center?.lat),lon=Number(element.lon??element.center?.lon);
  if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
  const fallbackNames={playground:"Spielplatz",pitch:"Sportplatz",sports_centre:"Sportanlage",fountain:"Brunnen",park:"Park",place_of_worship:"Kirche",townhall:"Rathaus",school:"Schule",kindergarten:"Kindergarten",fire_station:"Feuerwehr",police:"Polizei",station:"Bahnhof",halt:"Haltestelle",viewpoint:"Aussichtspunkt",memorial:"Denkmal"};
  const name=tags.name||fallbackNames[rawType];
  if(!name)return null;
  const sourceId=`de-${element.type}-${element.id}`;
  return {
    id:sourceId,type:category,name,icon:ravenPointIcon(rawType),lat,lon,
    discoveryRadius:category==="activity"?80:(["castle","manor","water_tower","tower"].includes(rawType)?140:60),
    access:"osm_candidate",accessHint:"Automatischer Vorschlag – öffentliche Erreichbarkeit vor Ort prüfen",
    district:place.name,municipality:place.municipality,region:place.region,country:place.country||"Deutschland",
    rawType,conceptOnly:true,studioStatus:"pending",source:"OpenStreetMap Deutschland"
  };
}

function selectSpreadRavenPoints(points,limit,lat,lon){
  const sorted=[...points].sort((a,b)=>haversineDistance(lat,lon,a.lat,a.lon)-haversineDistance(lat,lon,b.lat,b.lon));
  const selected=[];
  for(const point of sorted){
    const spacing=selected.every(saved=>haversineDistance(saved.lat,saved.lon,point.lat,point.lon)>140);
    if(spacing||selected.length<2)selected.push(point);
    if(selected.length>=limit)break;
  }
  return selected;
}

function createRavenFallbackPoints(place,profile){
  const points=[];
  const geometry=ravenBoundaryForPlace(place);
  const total=profile.exploration+profile.activity;
  for(let index=0;index<total;index++){
    const exploration=index<profile.exploration;
    const localIndex=exploration?index:index-profile.exploration;
    const count=exploration?profile.exploration:profile.activity;
    const bearing=(360/count*localIndex)+(exploration?18:42);
    const distance=(exploration?320:520)+(localIndex%3)*170;
    let [lat,lon]=destinationPoint(place.lat,place.lon,distance,bearing);
    if(geometry){
      let adjustedDistance=distance;
      while(adjustedDistance>80&&!ravenPointSafelyInsidePlace({lat,lon},place,90)){
        adjustedDistance*=.72;
        [lat,lon]=destinationPoint(place.lat,place.lon,adjustedDistance,bearing);
      }
      if(!ravenPointInGeometry(lat,lon,geometry)){lat=place.lat;lon=place.lon;}
    }
    points.push({
      id:`fallback-${ravenPlaceKey(place).replace(/[^a-z0-9]+/g,"-")}-${exploration?"e":"a"}-${localIndex+1}`,
      type:exploration?"exploration":"activity",
      name:exploration?`Erkundungspunkt ${localIndex+1}`:`Aktivitätspunkt ${localIndex+1}`,
      icon:exploration?"?":"◆",lat,lon,
      discoveryRadius:exploration?60:80,
      access:"generated_fallback",accessHint:"Konzeptpunkt – wird durch geprüfte Ortsdaten ersetzt",
      district:place.name,municipality:place.municipality,region:place.region,country:place.country||"Deutschland",
      rawType:"raven_fallback",conceptOnly:true,studioStatus:"pending",source:"Raven Deutschland-Konzept"
    });
  }
  return points;
}

function removeRavenFallbackPoints(place){
  const prefix=`fallback-${ravenPlaceKey(place).replace(/[^a-z0-9]+/g,"-")}-`;
  for(let index=ALL_POINTS.length-1;index>=0;index--){
    const point=ALL_POINTS[index];
    if(!String(point.id).startsWith(prefix))continue;
    if(pointMarkers[point.id]){map.removeLayer(pointMarkers[point.id]);delete pointMarkers[point.id];}
    if(typeof removePointRadius==="function")removePointRadius(point.id);
    ALL_POINTS.splice(index,1);
  }
}

function addRavenPlacePoints(points){
  const known=new Set(ALL_POINTS.map(point=>point.id));
  const added=[];
  points.forEach(point=>{if(!known.has(point.id)){ALL_POINTS.push(point);known.add(point.id);added.push(point);}});
  added.forEach(point=>renderPointMarker(point,isDiscovered(point),false,Infinity));
  if(added.length){
    renderMainLists();renderTravelBook();redrawFog();
    if(typeof syncRavenBotTargets==="function")syncRavenBotTargets();
  }
  return added.length;
}

async function requestRavenOverpass(query){
  for(const endpoint of RAVEN_OVERPASS_ENDPOINTS){
    try{
      const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body:"data="+encodeURIComponent(query)});
      if(response.ok)return response.json();
    }catch(error){}
  }
  throw new Error("Kartenvorschläge sind gerade nicht erreichbar");
}

async function loadRavenPlacePoints(place){
  if(!place?.name||normalizePlaceName(place.name)==="fürstenberg")return;
  const key=ravenPlaceKey(place),cached=ravenPlacePointCache[key];
  if(Array.isArray(cached?.points)){
    addRavenPlacePoints(cached.points);
    return cached.points;
  }

  const profile=RAVEN_PLACE_PROFILES[place.placeType]||RAVEN_PLACE_PROFILES.village;
  const token=++ravenPlaceLoadToken;
  const syncStatus=document.getElementById("poiSyncStatus");
  const fallbackPoints=createRavenFallbackPoints(place,profile);
  addRavenPlacePoints(fallbackPoints);
  if(syncStatus)syncStatus.textContent=`🗺️ ${place.name}: ${profile.exploration} Erkundung · ${profile.activity} Aktivitäten bereit · Ortsdaten werden verfeinert …`;
  const filter=`(around:${profile.radius},${place.lat},${place.lon})`;
  const query=`[out:json][timeout:22];(nwr${filter}[historic];nwr${filter}[tourism];nwr${filter}[leisure~"playground|pitch|sports_centre|fitness_station|swimming_pool|park|picnic_site"];nwr${filter}[amenity~"place_of_worship|townhall|library|community_centre|fire_station|police|school|kindergarten|fountain"];nwr${filter}[railway~"station|halt"];nwr${filter}[man_made~"water_tower|tower"];);out center tags 180;`;
  try{
    const data=await requestRavenOverpass(query);
    if(token!==ravenPlaceLoadToken)return [];
    const candidates=(data.elements||[])
      .map(element=>classifyRavenOsmElement(element,place))
      .filter(Boolean)
      .filter(point=>ravenPointSafelyInsidePlace(point,place,80));
    const unique=[...new Map(candidates.map(point=>[normalizePlaceName(point.name)+"|"+point.rawType,point])).values()];
    const explorations=selectSpreadRavenPoints(unique.filter(point=>point.type==="exploration"),profile.exploration,place.lat,place.lon);
    const activities=selectSpreadRavenPoints(unique.filter(point=>point.type==="activity"),profile.activity,place.lat,place.lon);
    let points=[...explorations,...activities];
    if(points.length){
      removeRavenFallbackPoints(place);
    }else{
      points=fallbackPoints;
    }
    ravenPlacePointCache[key]={savedAt:Date.now(),place,points,fallback:points===fallbackPoints};
    localStorage.setItem(RAVEN_PLACE_POINT_CACHE_KEY,JSON.stringify(ravenPlacePointCache));
    addRavenPlacePoints(points);
    if(syncStatus)syncStatus.textContent=`🇩🇪 ${place.name}: ${explorations.length} Erkundung · ${activities.length} Aktivitäten (${profile.label})`;
    return points;
  }catch(error){
    ravenPlacePointCache[key]={savedAt:Date.now(),place,points:fallbackPoints,fallback:true};
    localStorage.setItem(RAVEN_PLACE_POINT_CACHE_KEY,JSON.stringify(ravenPlacePointCache));
    if(syncStatus)syncStatus.textContent=`🗺️ ${place.name}: Konzeptpunkte aktiv · echte Ortsdaten werden später erneut geprüft`;
    console.warn("Raven Deutschland-POIs konnten nicht geladen werden.",error);
    return [];
  }
}

/* Bereits besuchte Deutschland-Orte nach einem Neuladen aus dem lokalen
   Ortscache wiederherstellen, ohne Netzabfragen für ganz Deutschland. */
Object.values(ravenPlacePointCache).forEach(entry=>{
  if(Array.isArray(entry?.points))addRavenPlacePoints(entry.points);
});
renderRavenGermanyBoundaries();
