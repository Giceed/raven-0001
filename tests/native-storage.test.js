const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../mobile/native-storage.js'), 'utf8');

function createContext(seed = {}) {
  class FakeStorage {
    constructor(values = {}) { this.values = new Map(Object.entries(values)); }
    get length() { return this.values.size; }
    key(index) { return [...this.values.keys()][index] ?? null; }
    getItem(key) { return this.values.has(String(key)) ? this.values.get(String(key)) : null; }
    setItem(key, value) { this.values.set(String(key), String(value)); }
    removeItem(key) { this.values.delete(String(key)); }
    clear() { this.values.clear(); }
  }
  const localStorage = new FakeStorage(seed);
  const sessionStorage = new FakeStorage();
  const events = [];
  const window = { dispatchEvent(event) { events.push(event); } };
  const context = {
    Storage: FakeStorage,
    localStorage,
    sessionStorage,
    window,
    location: { reload() {} },
    CustomEvent: class { constructor(name, options) { this.type = name; this.detail = options?.detail; } },
    queueMicrotask,
    setTimeout,
    clearTimeout
  };
  vm.runInNewContext(source, context);
  return { context, localStorage, events };
}

test('native storage creates checksummed rotating backups and can restore them', async () => {
  const { context, localStorage } = createContext();
  localStorage.setItem('ravenProfile', JSON.stringify({ name: 'Milo' }));
  await context.window.RavenNativeStorage.flush();
  localStorage.setItem('ravenXP', '42');
  await context.window.RavenNativeStorage.flush();
  assert.ok(localStorage.getItem('__ravenBackupA'));
  assert.ok(localStorage.getItem('__ravenBackupB'));

  const exported = context.window.RavenNativeStorage.exportSnapshot();
  localStorage.removeItem('ravenProfile');
  await context.window.RavenNativeStorage.importSnapshot(exported);
  assert.equal(JSON.parse(localStorage.getItem('ravenProfile')).name, 'Milo');
  assert.equal(localStorage.getItem('ravenXP'), '42');
});

test('native preferences receives a snapshot and storage failures are reported', async () => {
  const { context, localStorage, events } = createContext();
  localStorage.setItem('ravenXP', '7');
  const writes = [];
  await context.window.RavenNativeStorage.attach({
    async get() { return { value: null }; },
    async set(entry) { writes.push(entry); }
  });
  assert.equal(writes.at(-1).key, 'raven.snapshot.v1');
  assert.match(writes.at(-1).value, /ravenXP/);

  await context.window.RavenNativeStorage.attach({
    async get() { throw new Error('Speicher nicht erreichbar'); },
    async set() {}
  });
  assert.equal(events.at(-1).type, 'raven-storage-error');
});
