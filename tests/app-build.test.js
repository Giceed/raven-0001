const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

test('native build preserves web sources and packages local page dependencies', () => {
  const sourceDirs = ['js', 'css', 'data', 'icons', 'habitat', 'studio', 'simulation'];
  const sources = ['index.html', 'service-worker.js', 'manifest.webmanifest'];
  for (const dir of sourceDirs) {
    for (const entry of fs.readdirSync(path.join(root, dir), { recursive: true })) {
      const file = path.join(dir, entry);
      if (fs.statSync(path.join(root, file)).isFile()) sources.push(file);
    }
  }
  const before = sources.map(file => fs.readFileSync(path.join(root, file)));
  execFileSync(process.execPath, ['tools/build-app.mjs'], { cwd: root });
  // Repeated builds also remove stale generated assets.
  fs.writeFileSync(path.join(root, 'dist/stale.txt'), 'old');
  execFileSync(process.execPath, ['tools/build-app.mjs'], { cwd: root });
  assert.ok(!fs.existsSync(path.join(root, 'dist/stale.txt')));
  sources.forEach((file, i) => assert.deepEqual(fs.readFileSync(path.join(root, file)), before[i], file));
  for (const page of ['index.html', 'habitat/index.html', 'studio/index.html', 'simulation/index.html']) {
    const file = path.join(root, 'dist', page);
    const html = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(html, /https:\/\/unpkg.com/);
    for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      if (/^(https?:|data:)/.test(match[1])) continue;
      const target = path.resolve(path.dirname(file), match[1].split('?')[0]);
      assert.ok(fs.existsSync(target), `${page}: missing ${match[1]}`);
    }
  }
  const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  assert.doesNotMatch(html, /js\/pwa.js|rel="manifest"/);
  assert.match(html, /searchParams.set\("view","player"\)/);
  assert.ok(html.indexOf('searchParams.set') < html.indexOf('src="js/config.js'));
  assert.ok(!fs.existsSync(path.join(root, 'dist/service-worker.js')));
  assert.ok(!fs.existsSync(path.join(root, 'dist/js/pwa.js')));
  for (const file of ['leaflet.js', 'leaflet.css', 'images/marker-icon.png', 'LICENSE']) {
    assert.ok(fs.existsSync(path.join(root, 'dist/vendor/leaflet', file)));
  }
});

test('native shell hides installer and keeps online/offline indicator working', () => {
  const button = { hidden: false };
  const badge = { classList: { toggle(name, value) { this[name] = value; } } };
  const events = {};
  const context = {
    navigator: { onLine: true },
    document: { getElementById: () => button, querySelector: () => badge },
    window: { addEventListener: (name, callback) => events[name] = callback }
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'mobile/native-shell.js'), 'utf8'), context);
  assert.equal(button.hidden, true);
  assert.equal(badge.textContent, '● ONLINE');
  context.navigator.onLine = false;
  events.offline();
  assert.equal(badge.textContent, '● OFFLINE');
  assert.equal(badge.classList.offline, true);
});
