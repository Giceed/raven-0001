const fs=require("node:fs");
const assert=require("node:assert/strict");
const manifest=JSON.parse(fs.readFileSync("manifest.webmanifest","utf8"));
const worker=fs.readFileSync("service-worker.js","utf8");
assert.equal(manifest.display,"standalone");
assert.match(manifest.start_url,/view=player/);
assert.ok(manifest.icons.some(icon=>icon.purpose==="maskable"));
for(const icon of manifest.icons)assert.ok(fs.existsSync(icon.src),`Icon fehlt: ${icon.src}`);
assert.match(worker,/raven-app-v60/);
assert.match(worker,/request\.mode==="navigate"/);
assert.doesNotMatch(worker,/tile\.openstreetmap|\/tile\//i,"Kartenkacheln dürfen den App-Cache nicht aufblasen.");
const shellBlock=worker.match(/const RAVEN_SHELL=\[([\s\S]*?)\];/)[1];
const shellFiles=[...shellBlock.matchAll(/"\.\/([^"?]+)(?:\?[^" ]*)?"/g)].map(match=>match[1]);
for(const file of shellFiles)assert.ok(fs.existsSync(file),`Offline-Datei fehlt: ${file}`);
assert.ok(shellFiles.length>=20,"Offline-Shell ist unvollständig.");
console.log(`✓ PWA-Test bestanden: Spielerstart, Icons, ${shellFiles.length} Offline-Dateien und begrenzter Cache`);

