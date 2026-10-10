const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

test('native package declares location permissions on iOS and Android', () => {
  const plist = fs.readFileSync(path.join(root, 'ios/App/App/Info.plist'), 'utf8');
  const manifest = fs.readFileSync(path.join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
  assert.match(plist, /NSLocationWhenInUseUsageDescription/);
  assert.match(plist, /NSLocationAlwaysAndWhenInUseUsageDescription/);
  assert.match(manifest, /ACCESS_COARSE_LOCATION/);
  assert.match(manifest, /ACCESS_FINE_LOCATION/);
});

test('native shell uses plugin GPS and pauses an active journey with app lifecycle', async () => {
  const listeners = {};
  const calls = [];
  const context = {
    navigator: { onLine: true },
    document: {
      hidden: false,
      addEventListener(name, callback) { listeners[name] = callback; },
      getElementById() { return { hidden: false }; },
      querySelector() { return { classList: { toggle() {} } }; }
    },
    window: {
      Capacitor: { Plugins: {
        Geolocation: {
          async checkPermissions() { return { location: 'prompt' }; },
          async requestPermissions() { calls.push('permission'); return { location: 'granted' }; },
          async watchPosition(options, callback) { calls.push(options.enableHighAccuracy); callback({ coords: {} }); return 'watch-1'; },
          async clearWatch({ id }) { calls.push(id); }
        },
        App: { async addListener(name, callback) { listeners[name] = callback; } }
      } },
      addEventListener(name, callback) { listeners[name] = callback; },
      pauseRavenExplorationForLifecycle() { calls.push('pause'); },
      resumeRavenExplorationFromLifecycle() { calls.push('resume'); }
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'mobile/native-shell.js'), 'utf8'), context);
  await context.window.RavenNativeLocation.requestPermission();
  const id = await context.window.RavenNativeLocation.watchPosition({ enableHighAccuracy: true }, () => {});
  await context.window.RavenNativeLocation.clearWatch(id);
  listeners.appStateChange({ isActive: false });
  listeners.appStateChange({ isActive: true });
  assert.deepEqual(calls, ['permission', true, 'watch-1', 'pause', 'resume']);
});

test('GPS implementation prevents stale async watches and supports lifecycle resume', () => {
  const gps = fs.readFileSync(path.join(root, 'js/gps.js'), 'utf8');
  assert.match(gps, /ravenGpsStartToken/);
  assert.match(gps, /pauseRavenExplorationForLifecycle/);
  assert.match(gps, /resumeRavenExplorationFromLifecycle/);
  assert.match(gps, /lastPosition=null/);
  assert.match(gps, /minimumUpdateInterval:1000/);
});
