/* ==========================================================
   FOG OF WAR
   ========================================================== */

const REVEAL_RADIUS_METERS=40;

let fogSvg=null;

function createFogLayer(){

  if(fogSvg) fogSvg.remove();

  fogSvg=document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );

  fogSvg.classList.add("raven-fog-svg");

  /* Direkt über dem Kartenfenster platzieren. Dadurch bleibt der Fog
     unabhängig von Leaflets Pane-Transformationen stabil sichtbar. */
  map.getContainer().appendChild(fogSvg);

  redrawFog();
}

function redrawFog(){

  if(!fogSvg) return;

  if(mapMode!=="explore"){

    fogSvg.style.display="none";
    return;
  }

  fogSvg.style.display="block";

  const size=map.getSize();

  fogSvg.setAttribute("width",size.x);
  fogSvg.setAttribute("height",size.y);
  fogSvg.setAttribute("viewBox",`0 0 ${size.x} ${size.y}`);

  fogSvg.innerHTML="";

  const defs=document.createElementNS(
    "http://www.w3.org/2000/svg",
    "defs"
  );

  const mask=document.createElementNS(
    "http://www.w3.org/2000/svg",
    "mask"
  );

  mask.setAttribute("id","ravenFogMask");

  const base=document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect"
  );

  base.setAttribute("width","100%");
  base.setAttribute("height","100%");
  base.setAttribute("fill","white");

  mask.appendChild(base);

  exploredPoints.forEach(point=>{

    appendRevealCircle(
      mask,
      point.lat,
      point.lon,
      REVEAL_RADIUS_METERS
    );

  });

  if(fuerstenbergMission.completed && fuerstenbergBoundary){

    appendGeoJSONGeometryToMask(
      mask,
      fuerstenbergBoundary.geometry
    );
  }

  defs.appendChild(mask);
  fogSvg.appendChild(defs);

  const darkness=document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect"
  );

  darkness.setAttribute("width","100%");
  darkness.setAttribute("height","100%");
  darkness.setAttribute("fill","rgba(0,0,0,.94)");
  darkness.setAttribute("mask","url(#ravenFogMask)");

  fogSvg.appendChild(darkness);
}

function appendRevealCircle(mask,lat,lon,radiusMeters){

  const center=map.latLngToContainerPoint([lat,lon]);

  const edge=destinationPoint(
    lat,
    lon,
    radiusMeters,
    90
  );

  const edgePoint=
    map.latLngToContainerPoint(edge);

  const radius=
    Math.abs(edgePoint.x-center.x);

  const circle=document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle"
  );

  circle.setAttribute("cx",center.x);
  circle.setAttribute("cy",center.y);
  circle.setAttribute("r",Math.max(radius,1));
  circle.setAttribute("fill","black");

  mask.appendChild(circle);
}

function appendGeoJSONGeometryToMask(mask,geometry){

  if(!geometry) return;

  if(geometry.type==="Polygon"){

    appendPolygonToMask(mask,geometry.coordinates);

  }else if(geometry.type==="MultiPolygon"){

    geometry.coordinates.forEach(polygon=>
      appendPolygonToMask(mask,polygon)
    );
  }
}

function appendPolygonToMask(mask,polygon){

  if(!polygon || !polygon[0]) return;

  const ring=polygon[0];

  let pathData="";

  ring.forEach((coordinate,index)=>{

    const point=
      map.latLngToContainerPoint([
        coordinate[1],
        coordinate[0]
      ]);

    pathData +=
      `${index===0 ? "M" : "L"} ${point.x} ${point.y} `;
  });

  pathData+="Z";

  const path=document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );

  path.setAttribute("d",pathData);
  path.setAttribute("fill","black");

  mask.appendChild(path);
}

map.on("move zoom resize",redrawFog);


/* ==========================================================
   GRENZE FÜRSTENBERG
   ========================================================== */

async function loadFuerstenbergBoundary(){
  try{

    const response=await fetch("data/fuerstenberg-boundary.json?v=1");

    if(!response.ok) throw new Error();

    const data=await response.json();

    fuerstenbergBoundary={
      type:"Feature",
      properties:{name:"Fürstenberg"},
      geometry:data.geojson
    };

    if(!fuerstenbergBoundary) throw new Error();

    if (isFuerstenbergDiscovered()) {
      document.getElementById("boundaryStatus").textContent =
        "✓ Amtliche Gemarkungsgrenze geladen";

      document
        .getElementById("boundaryStatus")
        .classList.add("ok");

      if(!fuerstenbergMission.completed){
        showCurrentPlaceBoundary(fuerstenbergBoundary.geometry);
      }
    } else {
      document.getElementById("boundaryStatus").textContent =
        "Ortsgrenze wird nach Entdeckung verfügbar …";
    }

    updateBoundaryOutline();
    redrawFog();

  }catch(error){

    document.getElementById("boundaryStatus").textContent =
      "⚠ Gemarkungsgrenze konnte nicht geladen werden.";
  }
}

function updateBoundaryOutline(){

  if(boundaryLayer){

    map.removeLayer(boundaryLayer);
    boundaryLayer=null;
  }

  if(
    !fuerstenbergMission.completed ||
    !fuerstenbergBoundary
  ) return;

  if(currentPlaceBoundaryLayer){
    map.removeLayer(currentPlaceBoundaryLayer);
    currentPlaceBoundaryLayer=null;
  }

  boundaryLayer=L.geoJSON(
    fuerstenbergBoundary,
    {
      style:{
        color:"#22c55e",
        weight:2,
        opacity:.8,
        fillOpacity:0
      }
    }
  ).addTo(map);
}

