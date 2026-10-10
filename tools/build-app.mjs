import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
// Only this fixed, generated directory can be removed. Sources are never modified.
await readFile(path.join(root, 'node_modules/leaflet/dist/leaflet.js'));
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const assets = ['index.html', 'css', 'js', 'data', 'icons', 'habitat', 'studio', 'simulation'];
for (const asset of assets) await cp(path.join(root, asset), path.join(output, asset), { recursive: true });
await cp(path.join(root, 'node_modules/leaflet/dist'), path.join(output, 'vendor/leaflet'), { recursive: true });
await cp(path.join(root, 'node_modules/leaflet/LICENSE'), path.join(output, 'vendor/leaflet/LICENSE'));

for (const page of ['index.html', 'habitat/index.html', 'studio/index.html', 'simulation/index.html']) {
  const filename = path.join(output, page);
  const prefix = page === 'index.html' ? '' : '../';
  let html = await readFile(filename, 'utf8');
  html = html.replaceAll('https://unpkg.com/leaflet@1.9.4/dist/', `${prefix}vendor/leaflet/`);
  if (page === 'index.html') {
    html = html.replace(/<link rel="manifest"[^>]*>\s*/, '');
    html = html.replace(/<script src="js\/pwa\.js[^\"]*"><\/script>/, '<script src="native-shell.js"></script>');
    // Lock the same player view used by the web manifest, before game scripts execute.
    html = html.replace('<head>', '<head>\n<script>const ravenAppURL=new URL(location.href);ravenAppURL.searchParams.set("view","player");history.replaceState(null,"",ravenAppURL);</script>');
    html = html.replace('<script src="js/city-concept-points.js', '<script src="native-storage.js"></script>\n<script src="js/city-concept-points.js');
  }
  await writeFile(filename, html);
}
await cp(path.join(root, 'mobile/native-shell.js'), path.join(output, 'native-shell.js'));
await cp(path.join(root, 'mobile/native-storage.js'), path.join(output, 'native-storage.js'));
// Never ship an old PWA worker in the native asset bundle.
await rm(path.join(output, 'js/pwa.js'));
console.log('Raven app assets built in dist; original web files unchanged.');
