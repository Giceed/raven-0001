/* ==========================================================
   FOG OF WAR
   ========================================================== */

const REVEAL_RADIUS_METERS=40;

let fogCanvas=null;

function createFogLayer(){

  if(fogCanvas) fogCanvas.remove();

  fogCanvas=document.createElement("canvas");
  fogCanvas.classList.add("raven-fog-svg");

  /* Direkt über dem Kartenfenster platzieren. Dadurch bleibt der Fog
     unabhängig von Leaflets Pane-Transformationen stabil sichtbar. */
  map.getContainer().appendChild(fogCanvas);

  redrawFog();
}

function redrawFog(){

  if(!fogCanvas) return;

  if(mapMode!=="explore"){

    fogCanvas.style.display="none";
    return;
  }

  fogCanvas.style.display="block";

  const size=map.getSize();
  const dpr=window.devicePixelRatio||1;
  fogCanvas.width=Math.round(size.x*dpr);
  fogCanvas.height=Math.round(size.y*dpr);
  fogCanvas.style.width=size.x+"px";
  fogCanvas.style.height=size.y+"px";
  const context=fogCanvas.getContext("2d");
  context.setTransform(dpr,0,0,dpr,0,0);
  context.globalCompositeOperation="source-over";
  context.clearRect(0,0,size.x,size.y);
  context.fillStyle="rgba(0,0,0,.94)";
  context.fillRect(0,0,size.x,size.y);
  context.globalCompositeOperation="destination-out";

  exploredPoints.forEach(point=>{
    const center=map.latLngToContainerPoint([point.lat,point.lon]);
    const edge=destinationPoint(point.lat,point.lon,REVEAL_RADIUS_METERS,90);
    const edgePoint=map.latLngToContainerPoint(edge);
    const radius=Math.max(Math.abs(edgePoint.x-center.x),1);
    context.beginPath();
    context.arc(center.x,center.y,radius,0,Math.PI*2);
    context.fill();
  });
  context.globalCompositeOperation="source-over";
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

