// SPDX-License-Identifier: AGPL-3.0-only
// The persona households (batch 16): twelve made-up full households, from someone below zero to a multimillionaire,
// that every batch runs SLAM against (test/personas.test.js, tools/e2e/personas.cjs). Each one is written readably
// in tools/personas/defs/<id>.mjs and built here into the app's own backup file (the same file Coach tools › Data ›
// Export writes, js/records.js exportFile), so fixtures/personas/<id>.json opens through Import like any client.
// When the backup format changes, run this again and commit the new files.
//   node tools/personas/build.mjs          writes fixtures/personas/*.json
//   node tools/personas/build.mjs --check  exits 1 when a committed file is out of date (nothing is written)
// A def: { id, name, about, profile, client, assumptions, settings, spending, records, expected, cannot, view }.
// records: [{ ref, kind, type, name, amount, per, owner, status, fieldStatus, linkedTo: '@ref', values }]. Every
// def is made up and safe for the public repo.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Store, newHousehold, exportFile } from '../../js/records.js';
import { addPresets, migrateBatch10 } from '../../js/presets.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const NOW = '2026-11-05T12:00:00.000Z'; // every persona is built, and checked, as of this moment
export const DEFS_DIR = join(root, 'tools', 'personas', 'defs');
export const OUT_DIR = join(root, 'fixtures', 'personas');
const ref = JSON.parse(readFileSync(join(root, 'data', 'reference-2026.json'), 'utf8'));

export async function loadDefs() {
  const files = readdirSync(DEFS_DIR).filter(f => f.endsWith('.mjs')).sort();
  const defs = [];
  for (const f of files) defs.push((await import(pathToFileURL(join(DEFS_DIR, f)).href)).default);
  return defs.sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.id.localeCompare(b.id));
}

// One household, built the way a coach builds one: a new client gets the usual list (js/app.js), the persona's own
// rows go in first so the starter lines with the same name are not added twice, then the batch 10 pass runs once.
export function buildPersona(def) {
  let n = 0;
  const store = new Store(newHousehold({ name: def.name, now: NOW, id: `persona-${def.id}` }), { now: () => NOW, id: () => `${def.id}-${String(++n).padStart(3, '0')}` });
  const refs = {};
  store.transaction(`Persona ${def.id}`, () => {
    if (def.client) store.setDoc('client', def.client);
    store.setDoc('profile', def.profile || {});
    store.setDoc('assumptions', def.assumptions || {});
    store.setDoc('settings', { fastTrack: { at: NOW, seconds: 300, done: true }, ...(def.settings || {}) });
    if (def.spending) store.setDoc('spending', def.spending);
    for (const r of def.records || []) {
      const { ref: key, kind, type = null, fieldStatus, linkedTo, paidWith, ...fields } = r;
      const link = v => (typeof v === 'string' && v.startsWith('@') ? refs[v.slice(1)]?.id ?? (() => { throw new Error(`${def.id}: no row ${v}`); })() : v ?? null);
      const rec = store.add(kind, { ...fields, linkedTo: link(linkedTo), paidWith: link(paidWith) }, { type });
      for (const [f, s] of Object.entries(fieldStatus || {})) store.setFieldStatus(rec.id, f, s);
      if (key) refs[key] = rec;
    }
  });
  addPresets(store, ref);
  migrateBatch10(store.doc, ref);
  // History keeps when each row was added (the statements read it); the field-by-field entries of the build itself
  // are left out, as they would only say every value was typed at NOW.
  store.doc.history = store.doc.history.filter(h => h.op === 'add');
  return store.doc;
}

export const fileText = def => `${JSON.stringify(exportFile(buildPersona(def), NOW), null, 1)}\n`;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const defs = await loadDefs();
  mkdirSync(OUT_DIR, { recursive: true });
  const stale = [];
  for (const def of defs) {
    const path = join(OUT_DIR, `${def.id}.json`);
    const text = fileText(def);
    if (check) { if (!existsSync(path) || readFileSync(path, 'utf8') !== text) stale.push(def.id); continue; }
    writeFileSync(path, text);
  }
  if (check) {
    console.log(stale.length ? `Out of date: ${stale.join(', ')}. Run node tools/personas/build.mjs` : `All ${defs.length} persona files are up to date.`);
    process.exitCode = stale.length ? 1 : 0;
  } else console.log(`Wrote ${defs.length} persona files to fixtures/personas/`);
}
