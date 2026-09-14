let ravenInstallPrompt=null;
function updateRavenConnectionState(){const badge=document.querySelector(".online");if(!badge)return;badge.textContent=navigator.onLine?"● ONLINE":"● OFFLINE";badge.classList.toggle("offline",!navigator.onLine);}
function updateRavenInstallButton(){const button=document.getElementById("installRavenButton");if(button)button.hidden=!ravenInstallPrompt||window.matchMedia("(display-mode: standalone)").matches;}
async function installRavenApp(){
  if(ravenInstallPrompt){ravenInstallPrompt.prompt();const result=await ravenInstallPrompt.userChoice;ravenInstallPrompt=null;updateRavenInstallButton();setTemporaryMessage(result.outcome==="accepted"?"🐦‍⬛ Raven wird installiert.":"Installation wurde geschlossen.");return;}
  const isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent);setTemporaryMessage(isiOS?"Auf iPhone: Teilen antippen und ‚Zum Home-Bildschirm‘ wählen.":"Öffne das Browsermenü und wähle ‚App installieren‘.",6000);
}
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();ravenInstallPrompt=event;updateRavenInstallButton();});
window.addEventListener("appinstalled",()=>{ravenInstallPrompt=null;updateRavenInstallButton();setTemporaryMessage("🐦‍⬛ Raven wurde als App installiert.");});
window.addEventListener("online",updateRavenConnectionState);window.addEventListener("offline",updateRavenConnectionState);
window.addEventListener("DOMContentLoaded",()=>{updateRavenConnectionState();updateRavenInstallButton();if("serviceWorker" in navigator)navigator.serviceWorker.register("./service-worker.js").catch(error=>console.warn("Raven App-Service konnte nicht gestartet werden.",error));});

