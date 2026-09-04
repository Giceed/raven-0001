/* ==========================================================
   REVERSE GEOCODING
   ========================================================== */

let lastGeocodeTime=0;
let lastGeocodePosition=null;
const placeBoundaryCache=new Map();

async function maybeReverseGeocode(lat,lon,force=false){

  const now=Date.now();

  if(!force){

    if(now-lastGeocodeTime<60000) return;

    if(lastGeocodePosition){

      const moved=haversineDistance(
        lastGeocodePosition.lat,
        lastGeocodePosition.lon,
        lat,
        lon
      );

      if(moved<100) return;
    }
  }

  lastGeocodeTime=now;
  lastGeocodePosition={lat,lon};

  const distanceFromCenter=haversineDistance(
    TEST_REGION.centerLat,
    TEST_REGION.centerLon,
    lat,
    lon
  );

  const inTestRegion=distanceFromCenter<=TEST_REGION.radiusMeters;

  const testStatus=document.getElementById("testRegionStatus");
  testStatus.textContent=inTestRegion
    ? `🧭 Testgebiet Stadt Bad Wünnenberg`
    : `⚠ Außerhalb des Testgebiets Bad Wünnenberg`;
  testStatus.className=`boundary-status test-region-status ${inTestRegion ? "ok" : "outside"}`;

  if(!inTestRegion){
    document.getElementById("boundaryStatus").textContent=
      "Orte werden derzeit nur im Testgebiet Bad Wünnenberg gespeichert.";
    document.getElementById("boundaryStatus").className="boundary-status outside";
    return;
  }

  const boundaryStatus=document.getElementById("boundaryStatus");
  boundaryStatus.textContent="Ortsname und Ortsgrenze werden geladen …";
  boundaryStatus.className="boundary-status loading";

  try{

    const url=
      "https://nominatim.openstreetmap.org/reverse" +
      "?format=jsonv2" +
      "&lat=" + encodeURIComponent(lat) +
      "&lon=" + encodeURIComponent(lon) +
      "&zoom=18" +
      "&addressdetails=1" +
      "&polygon_geojson=1" +
      "&polygon_threshold=0.001" +
      "&accept-language=de";

    const response=await fetch(url);

    if(!response.ok) return;

    const data=await response.json();

    const address=data.address || {};

    const district=
      address.village ||
      address.suburb ||
      address.hamlet ||
      address.quarter ||
      address.neighbourhood ||
      "";

    const municipality=
      address.city ||
      address.town ||
      address.municipality ||
      address.county ||
      "Unbekannter Ort";

    const allowedOrtschaften=new Set([
      "Bad Wünnenberg","Bleiwäsche","Elisenhof","Fürstenberg",
      "Haaren","Helmern","Leiberg"
    ]);
    const inBadWuennenberg=
      municipality.includes("Bad Wünnenberg") ||
      allowedOrtschaften.has(district);

    if(!inBadWuennenberg){
      testStatus.textContent="⚠ Außerhalb des Testgebiets Bad Wünnenberg";
      testStatus.className="boundary-status test-region-status outside";
      boundaryStatus.textContent=
        "Dieser Ort wird im aktuellen Teststand nicht gespeichert.";
      boundaryStatus.className="boundary-status outside";
      return;
    }

    const detectedName=district || municipality;
    const name=normalizePlaceName(detectedName)==="wünnenberg"
      ? "Bad Wünnenberg"
      : detectedName;

    currentRavenDistrict=allowedOrtschaften.has(name)
      ? name
      : (municipality.includes("Bad Wünnenberg") ? "Bad Wünnenberg" : null);

    const region=
      address.state || address.county || "";

    const country=
      address.country || "";

    const placeKey=normalizePlaceName(
      [name,address.postcode,region,country].filter(Boolean).join("|")
    );

    let geometry=placeBoundaryCache.get(placeKey) || data.geojson;

    if(!geometry || !["Polygon","MultiPolygon"].includes(geometry.type)){
      /* Die genaue Rückwärtssuche liefert häufig ein Gebäude oder eine
         Straße. Eine zweite, gedrosselte Ortssuche holt dann die echte
         Fläche des erkannten Dorfs oder Stadtteils. */
      await new Promise(resolve=>setTimeout(resolve,1100));

      const query=[name,address.postcode,region,country]
        .filter(Boolean)
        .join(", ");

      const searchUrl=
        "https://nominatim.openstreetmap.org/search" +
        "?format=jsonv2" +
        "&q=" + encodeURIComponent(query) +
        "&limit=1" +
        "&addressdetails=1" +
        "&polygon_geojson=1" +
        "&polygon_threshold=0.001" +
        "&countrycodes=de" +
        "&accept-language=de";

      const searchResponse=await fetch(searchUrl);

      if(searchResponse.ok){
        const matches=await searchResponse.json();
        geometry=matches[0]?.geojson || geometry;
      }
    }
    const boundaryShown=showCurrentPlaceBoundary(geometry);

    if(boundaryShown){
      placeBoundaryCache.set(placeKey,geometry);
      boundaryStatus.textContent="✓ Ortsgrenze von OpenStreetMap geladen";
      boundaryStatus.className="boundary-status ok";
    }else{
      boundaryStatus.textContent="⚠ Für diesen Ort ist noch keine Flächengrenze verfügbar.";
      boundaryStatus.className="boundary-status outside";
    }

    document.getElementById("locationName").textContent =
      name;

    document.getElementById("locationRegion").textContent =
      [district && municipality!==district ? municipality : "",region,country]
        .filter(Boolean)
        .join(" · ");

    renderMainLists();

    const exists=discoveredPlaces.some(
      place =>
        normalizePlaceName(place.name) ===
        normalizePlaceName(name)
    );

    if(!exists && name!=="Unbekannter Ort"){

      discoveredPlaces.push({
        name,
        district:district || name,
        municipality,
        region,
        country,
        osmType:data.osm_type || "",
        osmId:data.osm_id || null,
        boundaryAvailable:boundaryShown,
        lat,
        lon,
        discoveredAt:Date.now()
      });

      localStorage.setItem(
        "ravenDiscoveredPlaces",
        JSON.stringify(discoveredPlaces)
      );

      addXP(25);

      setTemporaryMessage(
        `🗺️ Neuer Ort entdeckt: ${name} · +25 XP`
      );

      renderTravelBook();
      updateMissionUI();
      updateAllPointStates(lat,lon);

    }

    updateUI();

  }catch(error){
    boundaryStatus.textContent="⚠ Ort oder Ortsgrenze konnte nicht geladen werden.";
    boundaryStatus.className="boundary-status outside";
  }
}


/* ==========================================================
   REISEBUCH
   ========================================================== */

function renderTravelBook(){
  const list=document.getElementById("travelList");
  list.innerHTML="";
  const districtNames=["Bad Wünnenberg","Bleiwäsche","Elisenhof","Fürstenberg","Haaren","Helmern","Leiberg"];
  const knownPlaces=districtNames
    .map(name=>discoveredPlaces.find(place=>normalizePlaceName(place.name)===normalizePlaceName(name)))
    .filter(Boolean);

  document.getElementById("travelSummary").textContent=
    `${knownPlaces.length} Orte entdeckt`;

  if(!knownPlaces.length){
    list.innerHTML='<div class="message">Noch keine Reise entdeckt. Starte GPS, um dein erstes Gebiet freizuschalten.</div>';
    return;
  }

  const group=document.createElement("div");
  group.className="municipality-group";
  const title=document.createElement("div");
  title.className="municipality-title";
  title.textContent="🏙️ Stadt Bad Wünnenberg";
  group.appendChild(title);

  knownPlaces.forEach(place=>{
    const name=place.name;
    const points=pointsForTravelPlace(name);
    const found=points.filter(isDiscovered).length;
    const element=document.createElement("div");
    element.className="place";
    element.innerHTML=`<div class="place-row"><div><div class="place-name district-indent">📍 ${escapeHTML(name)}</div><div class="place-meta">ORT ENTDECKT · ${found}/${points.length} Punkte entdeckt · ${points.length-found} unbekannt</div></div><div class="place-arrow">›</div></div>`;
    element.onclick=()=>openPlaceDetail(place);
    group.appendChild(element);
  });
  list.appendChild(group);
}

function pointsForTravelPlace(name){
  return ALL_POINTS.filter(point=>
    normalizePlaceName(point.district||(point.id.startsWith("concept-")?"":"Fürstenberg"))===normalizePlaceName(name)
  );
}

function openPlaceDetail(place){

  document
    .getElementById("travelOverview")
    .classList.add("hidden");

  const detail=
    document.getElementById("travelDetail");

  detail.classList.add("active");

  const placePoints=pointsForTravelPlace(place.name);
  const explorationPoints=placePoints.filter(point=>point.type==="exploration");
  const activityPoints=placePoints.filter(point=>point.type==="activity");
  const requiredRows=explorationPoints.map(point=>detailPointHTML(point)).join("");
  const activityRows=activityPoints.map(point=>detailPointHTML(point)).join("");
  const foundExploration=explorationPoints.filter(isDiscovered).length;
  const foundActivities=activityPoints.filter(isDiscovered).length;

  detail.innerHTML=`

    <div class="detail-header">

      <div class="detail-place-name">
        ${place.unknown?"❔ Unbekannter Ortsteil":"📍 "+escapeHTML(place.name)}
      </div>

      <div class="detail-meta">
        ${place.unknown?"ORT NOCH UNBEKANNT · ":""}Nordrhein-Westfalen · Deutschland
      </div>

      <div class="detail-status">
        ${foundExploration}/${explorationPoints.length} ERKUNDUNGSPUNKTE · ${foundActivities}/${activityPoints.length} AKTIVITÄTEN
      </div>

    </div>

    <div class="section-label">
      ERKUNDUNGSPUNKTE
    </div>

    <div class="poi-list">
      ${requiredRows}
    </div>

    <div class="section-label">
      AKTIVITÄTEN
    </div>

    <div class="poi-list">
      ${activityRows}
    </div>

    <button
      class="secondary back-button"
      onclick="closePlaceDetail()">
      ← Zurück zu Ravens Reisen
    </button>
  `;

  detail.querySelectorAll("[data-point-id]")
    .forEach(row=>{

      row.onclick=()=>{

        const point=
          ALL_POINTS.find(
            p=>p.id===row.dataset.pointId
          );

        if(point) tryOpenPoint(point);
      };
    });
}

function detailPointHTML(point){

  const discovered=isDiscovered(point);

  return `
    <div
      class="poi-row ${discovered ? "done" : ""}"
      data-point-id="${point.id}">

      <div class="poi-name">

        ${discovered
          ? `${point.icon} ${escapeHTML(point.name)}`
          : "? Unbekannter Punkt"
        }

      </div>

      <div class="poi-state">

        ${discovered
          ? "ENTDECKT ✓"
          : "UNBEKANNT"
        }

      </div>

    </div>
  `;
}

function closePlaceDetail(){

  document
    .getElementById("travelDetail")
    .classList.remove("active");

  document
    .getElementById("travelOverview")
    .classList.remove("hidden");
}

function normalizePlaceName(value){

  return String(value || "")
    .trim()
    .toLowerCase();
}

