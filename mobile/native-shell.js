// Native package only. The browser continues to use js/pwa.js.
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
