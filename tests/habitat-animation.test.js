const assert=require("assert");
const fs=require("fs");

const game=fs.readFileSync("index.html","utf8");
const gameCss=fs.readFileSync("css/raven.css","utf8");
const lab=fs.readFileSync("habitat/index.html","utf8");
const labCss=fs.readFileSync("habitat/habitat-effects.css","utf8");

for(const marker of ["raven-food","raven-heart","raven-zzz"])assert.match(game,new RegExp(marker));
for(const marker of ["lab-food","lab-heart","lab-zzz"])assert.match(lab,new RegExp(marker));
for(const action of ["eating","playing","sleeping"])assert.match(gameCss,new RegExp(`data-(?:action|state)=\\\"${action}\\\"`));
for(const action of ["eating","playing","sleeping"])assert.match(labCss,new RegExp(`data-(?:action|state)=${action}`));
assert.match(gameCss,/prefers-reduced-motion/);
assert.match(labCss,/prefers-reduced-motion/);
console.log("✓ Habitat-Animationstest bestanden: Futter, Herz, Schlaf und reduzierte Bewegung vorhanden");

