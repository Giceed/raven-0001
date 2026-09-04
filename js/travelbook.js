/* ==========================================================
   REVERSE GEOCODING
   ========================================================== */

let lastGeocodeTime=0;
let lastGeocodePosition=null;

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

  try{

    const url=
      "https://api.bigdatacloud.net/data/reverse-geocode-client" +
      "?latitude=" + encodeURIComponent(lat) +
      "&longitude=" + encodeURIComponent(lon) +
      "&localityLanguage=de";

    const response=await fetch(url);

    if(!response.ok) return;

    const data=await response.json();

    const name=
      data.locality ||
      data.city ||
      data.principalSubdivision ||
      "Unbekannter Ort";

    const region=
      data.principalSubdivision || "";

    const country=
      data.countryName || "";

    document.getElementById("locationName").textContent =
      name;

    document.getElementById("locationRegion").textContent =
      [region,country].filter(Boolean).join(" · ");

    const exists=discoveredPlaces.some(
      place =>
        normalizePlaceName(place.name) ===
        normalizePlaceName(name)
    );

    if(!exists && name!=="Unbekannter Ort"){

      discoveredPlaces.push({
        name,
        region,
        country,
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

      if (isFuerstenbergDiscovered() && fuerstenbergBoundary) {
        document.getElementById("boundaryStatus").textContent =
          "✓ Amtliche Gemarkungsgrenze geladen";
        document.getElementById("boundaryStatus").classList.add("ok");
      }
    }

    updateUI();

  }catch(error){}
}


/* ==========================================================
   REISEBUCH
   ========================================================== */

function renderTravelBook(){

  const list=document.getElementById("travelList");

  list.innerHTML="";

  const countries=
    new Set(
      discoveredPlaces
        .map(p=>p.country)
        .filter(Boolean)
    ).size;

  const regions=
    new Set(
      discoveredPlaces
        .map(p=>p.region)
        .filter(Boolean)
    ).size;

  document.getElementById("travelSummary").textContent =
    `${discoveredPlaces.length} Orte · ${regions} Regionen · ${countries} Länder`;

  [...discoveredPlaces]
    .reverse()
    .forEach(place=>{

      const element=document.createElement("div");

      element.className="place";

      element.innerHTML=`
        <div class="place-row">

          <div>
            <div class="place-name">
              📍 ${escapeHTML(place.name)}
            </div>

            <div class="place-meta">
              ${escapeHTML(
                [place.region,place.country]
                  .filter(Boolean)
                  .join(" · ")
              )}
            </div>
          </div>

          <div class="place-arrow">›</div>

        </div>
      `;

      element.onclick=()=>openPlaceDetail(place);

      list.appendChild(element);
    });
}

function openPlaceDetail(place){

  document
    .getElementById("travelOverview")
    .classList.add("hidden");

  const detail=
    document.getElementById("travelDetail");

  detail.classList.add("active");

  const isFuerstenberg =
    normalizePlaceName(place.name)
      .includes("fürstenberg");

  if(!isFuerstenberg){

    detail.innerHTML=`

      <div class="detail-header">

        <div class="detail-place-name">
          📍 ${escapeHTML(place.name)}
        </div>

        <div class="detail-meta">
          ${escapeHTML(
            [place.region,place.country]
              .filter(Boolean)
              .join(" · ")
          )}
        </div>

        <div class="detail-status">
          ENTDECKT
        </div>

      </div>

      <div class="message">
        Für diesen Ort sind in V1.8 noch keine
        Erkundungspunkte hinterlegt.
      </div>

      <button
        class="secondary back-button"
        onclick="closePlaceDetail()">
        ← Zurück zu Ravens Reisen
      </button>
    `;

    return;
  }

  const requiredRows=
    FUERSTENBERG.explorationPOIs
      .map(point=>detailPointHTML(point))
      .join("");

  const activityRows=
    FUERSTENBERG.activityPOIs
      .map(point=>detailPointHTML(point))
      .join("");

  detail.innerHTML=`

    <div class="detail-header">

      <div class="detail-place-name">
        🏘️ Fürstenberg
      </div>

      <div class="detail-meta">
        Nordrhein-Westfalen · Deutschland
      </div>

      <div class="detail-status">
        ${fuerstenbergMission.completed
          ? "ERKUNDET ✓"
          : `${fuerstenbergMission.visitedPOIs.length}/${FUERSTENBERG.explorationPOIs.length} ERKUNDUNGSPUNKTE`
        }
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
