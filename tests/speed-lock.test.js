const fs=require("fs");
const vm=require("vm");
const assert=require("assert");

const gps=fs.readFileSync("js/gps.js","utf8");
const start=gps.indexOf("const RAVEN_SPEED_PAUSE_KMH");
const end=gps.indexOf("function handlePosition",start);
assert(start>=0&&end>start,"Geschwindigkeitslogik nicht gefunden");

let now=1000;
const sandbox={window:{},Date:{now:()=>now},logRavenEvent:()=>{}};
vm.runInNewContext(gps.slice(start,end)+"\nthis.update=updateRavenSpeedState;",sandbox);

assert.equal(sandbox.update(11),"free");
assert.equal(sandbox.update(12),"paused");
assert.equal(sandbox.update(20),"paused");
assert.equal(sandbox.update(20.1),"blocked");
assert.equal(sandbox.update(0),"cooldown");
now=5999;
assert.equal(sandbox.update(0),"cooldown");
now=6000;
assert.equal(sandbox.update(0),"free");
console.log("✓ Speed-Lock-Test bestanden: 12 km/h Pause, über 20 km/h Sperre, 5 s Freigabe");
