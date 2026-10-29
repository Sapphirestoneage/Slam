// Where client files live: localStorage today. Nothing else touches storage.
import { newHousehold, migrate } from './records.js';

const INDEX = 'slam.clients';
const PREFS = 'slam.prefs';
const fileKey = id => `slam.client.${id}`;

export function localAdapter(ls = globalThis.localStorage) {
  return {
    get(key) { try { const v = ls.getItem(key); return v === null ? null : JSON.parse(v); } catch { return null; } },
    set(key, value) { ls.setItem(key, JSON.stringify(value)); },
    remove(key) { ls.removeItem(key); },
  };
}

// For tests and for when the browser blocks storage.
export function memoryAdapter() {
  const m = new Map();
  return {
    get: k => (m.has(k) ? JSON.parse(m.get(k)) : null),
    set: (k, v) => m.set(k, JSON.stringify(v)),
    remove: k => m.delete(k),
    fail: false,
  };
}

export function listClients(a) { return a.get(INDEX) || []; }
export function loadClient(a, id) { const d = a.get(fileKey(id)); return d ? migrate(d) : null; }
export function saveClient(a, doc) {
  a.set(fileKey(doc.id), doc);
  const list = listClients(a).filter(c => c.id !== doc.id);
  list.push({ id: doc.id, name: doc.client.name, updatedAt: doc.updatedAt });
  a.set(INDEX, list);
}
export function createClient(a, name, now) {
  const doc = newHousehold({ name, now });
  saveClient(a, doc);
  return doc;
}
export function removeClient(a, id) {
  a.remove(fileKey(id));
  a.set(INDEX, listClients(a).filter(c => c.id !== id));
}
export function getPrefs(a) { return { density: 'comfortable', theme: 'system', clientId: null, ...(a.get(PREFS) || {}) }; }
export function setPrefs(a, patch) { const p = { ...getPrefs(a), ...patch }; a.set(PREFS, p); return p; }

// R084: saved within 1 second of any change; 'Unsaved' if it fails.
export function autosave(store, adapter, { delay = 800, onState = () => {}, timers = globalThis } = {}) {
  let timer = null;
  let state = 'saved';
  const set = s => { if (s !== state) { state = s; onState(s); } };
  const flush = () => {
    timer = null;
    try { saveClient(adapter, store.doc); set('saved'); }
    catch { set('unsaved'); }
  };
  const off = store.subscribe(() => {
    set('saving');
    if (timer) timers.clearTimeout(timer);
    timer = timers.setTimeout(flush, delay);
  });
  return { flush: () => { if (timer) { timers.clearTimeout(timer); flush(); } }, get state() { return state; },
    get pending() { return timer !== null || state === 'unsaved'; }, stop: off };
}
