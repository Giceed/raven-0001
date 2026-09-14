const RAVEN_CACHE="raven-app-v65";
const RAVEN_SHELL=[
  "./index.html","./manifest.webmanifest","./icons/raven-icon.svg","./icons/raven-maskable.svg","./icons/raven-192.png","./icons/raven-512.png",
  "./css/raven.css?v=65-field-test1","./data/bad-wuennenberg-pois.json?v=28sync1","./data/fuerstenberg-boundary.json?v=1",
  "./js/city-concept-points.js?v=28cache1","./js/config.js?v=58-storage-hardening1","./js/storage.js?v=58-storage-hardening1",
  "./js/map.js?v=29testcenter2","./js/fog.js?v=41edge-tests1","./js/gps.js?v=48raven-readiness1","./js/raven-life.js?v=62-tamagotchi1",
  "./js/raven-jumper.js?v=51raven-sleep1","./js/poi.js?v=58-storage-hardening1","./js/travelbook.js?v=28cache1","./js/app.js?v=28cache1",
  "./js/shared-pois.js?v=58-storage-hardening1","./js/test-tools.js?v=58-storage-hardening1","./js/bot-testers.js?v=56-hugo-balance1",
  "./js/edge-tests.js?v=41edge-tests1","./js/game-tests.js?v=62-tamagotchi1","./js/pwa.js?v=65-field-test1","./js/hub-flow.js?v=65-field-test1","./js/field-test.js?v=65-field-test1",
  "./habitat/index.html","./habitat/habitat.css?v=1","./habitat/habitat.js?v=1"
];
self.addEventListener("install",event=>event.waitUntil(caches.open(RAVEN_CACHE).then(cache=>cache.addAll(RAVEN_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("raven-app-")&&key!==RAVEN_CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  const request=event.request,url=new URL(request.url);if(request.method!=="GET"||url.origin!==self.location.origin)return;
  if(request.mode==="navigate"){
    const fallback=url.pathname.includes("/habitat/")?"./habitat/index.html":"./index.html";
    event.respondWith(fetch(request).then(response=>{const copy=response.clone();caches.open(RAVEN_CACHE).then(cache=>cache.put(fallback,copy));return response;}).catch(()=>caches.match(fallback)));return;
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok&&!url.pathname.includes("/data/boundaries/part-")){const copy=response.clone();caches.open(RAVEN_CACHE).then(cache=>cache.put(request,copy));}return response;})));
});

