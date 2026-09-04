/* ==========================================================
   FESTE ORTS- UND ORTSTEILGRENZEN V2.5
   Der Datensatz enthält die OSM-Verwaltungsgrenzen im
   100-km-Testkreis. Gerendert wird nur der sichtbare Ausschnitt.
   ========================================================== */

const administrativeBoundaryLayer=L.layerGroup().addTo(map);
let boundaryLoadTimer=null;
let administrativeBoundaryData=null;

async function ensureAdministrativeBoundaryData(){
  if(administrativeBoundaryData) return administrativeBoundaryData;

  const manifestResponse=await fetch("data/boundaries/manifest.json");
  if(!manifestResponse.ok) throw new Error("Grenzmanifest fehlt");
  const manifest=await manifestResponse.json();

  const parts=await Promise.all(
    manifest.files.map(async file=>{
      const response=await fetch("data/boundaries/"+file);
      if(!response.ok) throw new Error("Grenzteil fehlt");
      return response.text();
    })
  );

  const binary=Uint8Array.from(atob(parts.join("")),char=>char.charCodeAt(0));
  const stream=new Blob([binary]).stream().pipeThrough(new DecompressionStream("gzip"));
  administrativeBoundaryData=await new Response(stream).json();
  return administrativeBoundaryData;
}

function scheduleBoundaryLoad(){
  clearTimeout(boundaryLoadTimer);
  boundaryLoadTimer=setTimeout(loadVisibleAdministrativeBoundaries,250);
}

async function loadVisibleAdministrativeBoundaries(){
  const status=document.getElementById("areaBoundaryStatus");
  const zoom=map.getZoom();

  if(zoom<9){
    administrativeBoundaryLayer.clearLayers();
    status.textContent="🔎 Näher heranzoomen, um Ortsgrenzen zu sehen.";
    status.className="boundary-status";
    return;
  }

  status.textContent="Orts- und Ortsteilgrenzen werden geladen …";
  status.className="boundary-status loading";

  try{
    const data=await ensureAdministrativeBoundaryData();
    const bounds=map.getBounds().pad(.12);
    const allowedLevels=zoom>=13 ? new Set([8,9,10])
      : zoom>=11 ? new Set([8,9])
      : new Set([8]);

    administrativeBoundaryLayer.clearLayers();
    let added=0;

    data.features.forEach(feature=>{
      if(!allowedLevels.has(feature.level)) return;

      const color=feature.level>=10
        ? "#22d3ee"
        : feature.level===9 ? "#60a5fa" : "#a855f7";

      feature.lines.forEach(line=>{
        if(!line.some(point=>bounds.contains(point))) return;

        L.polyline(line,{
          pane:"ravenForegroundPane",
          color,
          weight:feature.level>=10 ? 2 : 2.5,
          opacity:.88,
          dashArray:feature.level>=10 ? "5 5" : null,
          interactive:true
        })
          .bindTooltip(feature.name,{sticky:true,direction:"top"})
          .addTo(administrativeBoundaryLayer);
        added++;
      });
    });

    status.textContent=added
      ? `✓ ${added} sichtbare Ortsgrenzen · im 100-km-Testkreis`
      : "✓ Testkreis geladen · hier verläuft gerade keine Grenze";
    status.className="boundary-status ok";

  }catch(error){
    status.textContent="⚠ Der feste Grenzdatensatz konnte nicht geladen werden.";
    status.className="boundary-status outside";
  }
}

map.on("moveend zoomend",scheduleBoundaryLoad);

