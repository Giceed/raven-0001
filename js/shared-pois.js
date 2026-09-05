/* Gemeinsame POI-Quelle für Raven Studio und Spielkarte.
   Das Studio exportiert dieselbe Datenstruktur. Nach dem Einspielen
   der Exportdatei lädt die Spielkarte die Änderungen automatisch. */
(async function loadSharedRavenPoints(){
  try{
    const response=await fetch("data/bad-wuennenberg-pois.json?v=28sync1",{cache:"no-store"});
    if(!response.ok) throw new Error("POI-Datei nicht verfügbar");
    const payload=await response.json();
    const source=Array.isArray(payload.points)?payload.points:(payload.candidates||[]);
    const shared=source
      .filter(point=>point.status!=="rejected" && point.district==="Fürstenberg")
      .map(point=>({
        id:"shared-"+point.id,
        type:point.category==="activity"?"activity":"exploration",
        name:point.name||"Unbekannter Punkt",
        icon:point.category==="activity"?"◆":"?",
        lat:Number(point.lat),
        lon:Number(point.lon),
        discoveryRadius:Number(point.radius)||60,
        access:"studio_review",
        accessHint:point.access||"Vor Ort prüfen",
        district:point.district,
        conceptOnly:true,
        studioStatus:point.status||"pending"
      }))
      .filter(point=>Number.isFinite(point.lat)&&Number.isFinite(point.lon));

    if(!shared.length) return;
    for(let index=ALL_POINTS.length-1;index>=0;index--){
      if(ALL_POINTS[index].conceptOnly){
        const oldPoint=ALL_POINTS[index];
        if(pointMarkers[oldPoint.id]){
          map.removeLayer(pointMarkers[oldPoint.id]);
          delete pointMarkers[oldPoint.id];
        }
        ALL_POINTS.splice(index,1);
      }
    }
    ALL_POINTS.push(...shared);

    if(currentLat!==null&&currentLon!==null) updateAllPointStates(currentLat,currentLon);
    else shared.forEach(point=>renderPointMarker(point,false,false,Infinity));
    if(typeof renderMainLists==="function") renderMainLists();
    if(typeof renderTravelBook==="function") renderTravelBook();
    console.info(`Raven: ${shared.length} gemeinsame Studio-Punkte geladen.`);
  }catch(error){
    console.warn("Raven nutzt die eingebaute POI-Liste als Rückfalllösung.",error);
  }
})();

