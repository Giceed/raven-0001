// Native package only. The browser continues to use js/pwa.js.
const ravenCapacitor=window.Capacitor;
const ravenNativePlugins=ravenCapacitor?.Plugins||{};
const ravenGeolocation=ravenNativePlugins.Geolocation;
const ravenAppPlugin=ravenNativePlugins.App;

if(ravenGeolocation){
  window.RavenNativeLocation={
    async requestPermission(){
      const current=await ravenGeolocation.checkPermissions();
      if(current.location==="granted")return true;
      const result=await ravenGeolocation.requestPermissions({permissions:["location"]});
      if(result.location!=="granted")throw Object.assign(new Error("Standortzugriff wurde nicht erlaubt."),{code:1});
      return true;
    },
    watchPosition(options,callback){return ravenGeolocation.watchPosition(options,(position,error)=>callback(position,error));},
    clearWatch(id){return ravenGeolocation.clearWatch({id});}
  };
}

function ravenHandleAppState(isActive){
  const action=isActive?window.resumeRavenExplorationFromLifecycle:window.pauseRavenExplorationForLifecycle;
  if(typeof action==="function")void action();
}

if(ravenAppPlugin?.addListener){
  ravenAppPlugin.addListener("appStateChange",({isActive})=>ravenHandleAppState(isActive));
}else if(document.addEventListener){
  document.addEventListener("visibilitychange",()=>ravenHandleAppState(!document.hidden));
}

window.addEventListener("pagehide",()=>{
  if(typeof window.pauseRavenExplorationForLifecycle==="function")void window.pauseRavenExplorationForLifecycle();
});

function updateRavenNativeConnection() {
  const badge = document.querySelector('.online');
  if (!badge) return;
  badge.textContent = navigator.onLine ? '● ONLINE' : '● OFFLINE';
  badge.classList.toggle('offline', !navigator.onLine);
}
document.getElementById('installRavenButton').hidden = true;
window.addEventListener('online', updateRavenNativeConnection);
window.addEventListener('offline', updateRavenNativeConnection);
updateRavenNativeConnection();
