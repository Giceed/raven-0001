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

let mapMode =
  localStorage.getItem("ravenMapMode") || "explore";
