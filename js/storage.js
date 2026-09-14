/* ==========================================================
   SPEICHER
   ========================================================== */

let xp = Number(localStorage.getItem("ravenXP")) || 0;
let level = Number(localStorage.getItem("ravenLevel")) || 1;
let totalDistance = Number(localStorage.getItem("ravenDistance")) || 0;

let exploredPoints = readRavenStorageJSON("ravenExploredPoints",[]);
if(!Array.isArray(exploredPoints))exploredPoints=[];

let travelHistory = readRavenStorageJSON("ravenTravelHistory",[]);
if(!Array.isArray(travelHistory))travelHistory=[];

let discoveredPlaces = readRavenStorageJSON("ravenDiscoveredPlaces",[]);
if(!Array.isArray(discoveredPlaces))discoveredPlaces=[];

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

/* Die normale Spielansicht beginnt immer im Erkundungsmodus. */
mapMode="explore";
localStorage.setItem("ravenMapMode","explore");

if(!localStorage.getItem("ravenV27FuerstenbergFogResetDone")){
  exploredPoints=[];
  travelHistory=[];
  mapMode="explore";
  localStorage.setItem("ravenExploredPoints","[]");
  localStorage.setItem("ravenTravelHistory","[]");
  localStorage.setItem("ravenMapMode","explore");
  localStorage.setItem("ravenV27FuerstenbergFogResetDone","1");
}

