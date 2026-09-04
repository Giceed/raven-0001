/* ==========================================================
   SPEICHER
   ========================================================== */

let xp = Number(localStorage.getItem("ravenXP")) || 0;
let level = Number(localStorage.getItem("ravenLevel")) || 1;
let totalDistance = Number(localStorage.getItem("ravenDistance")) || 0;

let exploredPoints =
  JSON.parse(localStorage.getItem("ravenExploredPoints")) || [];

let travelHistory =
  JSON.parse(localStorage.getItem("ravenTravelHistory")) || [];

let discoveredPlaces =
  JSON.parse(localStorage.getItem("ravenDiscoveredPlaces")) || [];

/* Alte Testreisen außerhalb des aktuellen Stadtgebiets entfernen. */
const ravenAllowedDistricts=new Set([
  "fürstenberg"
]);
discoveredPlaces=discoveredPlaces.filter(place=>
  ravenAllowedDistricts.has(String(place.name||"").trim().toLowerCase())
);

/* Einmaliger Konzeptreset: Ortsnamen müssen neu durch GPS enthüllt werden. */
if(!localStorage.getItem("ravenV27HiddenPlacesResetDone")){
  discoveredPlaces=[];
  localStorage.setItem("ravenV27HiddenPlacesResetDone","1");
}
if(!localStorage.getItem("ravenV27PlayerViewResetDone")){
  discoveredPlaces=[];
  localStorage.setItem("ravenV27PlayerViewResetDone","1");
}
if(!localStorage.getItem("ravenV27FuerstenbergOnlyResetDone")){
  discoveredPlaces=[];
  localStorage.setItem("ravenV27FuerstenbergOnlyResetDone","1");
}
localStorage.setItem("ravenDiscoveredPlaces",JSON.stringify(discoveredPlaces));

let mapMode =
  localStorage.getItem("ravenMapMode") || "explore";

if(!localStorage.getItem("ravenV27FuerstenbergFogResetDone")){
  exploredPoints=[];
  travelHistory=[];
  mapMode="explore";
  localStorage.setItem("ravenExploredPoints","[]");
  localStorage.setItem("ravenTravelHistory","[]");
  localStorage.setItem("ravenMapMode","explore");
  localStorage.setItem("ravenV27FuerstenbergFogResetDone","1");
}

