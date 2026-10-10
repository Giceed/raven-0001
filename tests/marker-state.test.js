const fs=require("node:fs");
const assert=require("node:assert/strict");

const poi=fs.readFileSync("js/poi.js","utf8");
const shared=fs.readFileSync("js/shared-pois.js","utf8");

assert.match(poi,/point\.type==="exploration" \? "✓" : point\.icon/,
  "Entdeckte Erkundungspunkte müssen einen Haken rendern.");
assert.match(poi,/css\+=" exploration"/,
  "Erkundungspunkte benötigen eine eigene Farbklasse.");
assert.match(shared,/renderPointMarker\(point,isDiscovered\(point\),false,Infinity\)/,
  "Synchronisierte Marker müssen ihren gespeicherten Entdeckungsstatus erhalten.");
assert.match(poi,/detailZoomEnough=map\.getZoom\(\)>=11/,
  "Beim Deutschland-Zoom müssen Einzelmarker ausgeblendet werden.");
assert.match(poi,/pointVisible=detailZoomEnough&&Boolean\(districtActive\)/,
  "Es dürfen ausschließlich Punkte des aktuell erkannten Orts erscheinen.");
assert.doesNotMatch(poi,/visibleBeforeGps/,
  "Vor der Ortserkennung dürfen keine Spielpunkte sichtbar sein.");

console.log("✓ Marker-Test bestanden: Punkte erscheinen nur im aktuell erkannten Ort");
