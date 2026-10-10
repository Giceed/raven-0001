const fs=require("fs"),assert=require("assert");
const root=require("path").join(__dirname,"..");
const html=fs.readFileSync(require("path").join(root,"index.html"),"utf8"),flow=fs.readFileSync(require("path").join(root,"js/hub-flow.js"),"utf8");
assert.match(html,/id="habitatView"/);assert.match(html,/id="explorationView"/);assert.match(html,/beginRavenJourney\(\)/);assert.match(html,/finishRavenJourney\(\)/);
assert.match(flow,/RAVEN_TOUR_START_KEY/);assert.match(flow,/RAVEN_TOUR_REPORT_KEY/);assert.match(flow,/distanceBeforeStop/);assert.match(flow,/showRavenHubView\("habitat"\)/);
console.log("✓ Hub-Test bestanden: Habitat, Karte, Tourstart, Rückkehr und Reisebericht verbunden");

