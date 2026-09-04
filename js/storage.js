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
  "bad wünnenberg","wünnenberg","bleiwäsche","elisenhof",
  "fürstenberg","haaren","helmern","leiberg"
]);
discoveredPlaces=discoveredPlaces.filter(place=>
  ravenAllowedDistricts.has(String(place.name||"").trim().toLowerCase())
);

/* Einmaliger Konzeptreset: Ortsnamen müssen neu durch GPS enthüllt werden. */
if(!localStorage.getItem("ravenV27HiddenPlacesResetDone")){
  discoveredPlaces=[];
  localStorage.setItem("ravenV27HiddenPlacesResetDone","1");
}
localStorage.setItem("ravenDiscoveredPlaces",JSON.stringify(discoveredPlaces));

let mapMode =
  localStorage.getItem("ravenMapMode") || "explore";

