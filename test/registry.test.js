// Open the books, kept current forever: every field the app stores, every js/math function, every spec M number and
// every Reference data value is in a registry (js/registry/). A new one that is not fails here, with what to add.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { AREAS, KINDS, NOT_IN_SHEET, sheetFields } from '../js/registry/fields.js';
import { MATH, SUPPORT } from '../js/registry/math.js';
import { ASSUMPTIONS, TABLES, REFERENCE_LISTS, RULES } from '../js/registry/assumptions.js';
import { blankRecord } from '../js/records.js';

const root = new URL('../', import.meta.url);
const ref = JSON.parse(readFileSync(new URL('data/reference-2026.json', root)));
const walk = dir => readdirSync(new URL(dir, root)).flatMap(f => (statSync(new URL(`${dir}/${f}`, root)).isDirectory() ? walk(`${dir}/${f}`) : f.endsWith('.js') ? [`${dir}/${f}`] : []));
const SOURCES = walk('js').filter(f => !f.startsWith('js/registry/') && !f.startsWith('js/sheet/'));
const code = Object.fromEntries(SOURCES.map(f => [f, readFileSync(new URL(f, root), 'utf8')]));

// Every key any area declares, with the last part of a dotted key (variable.lowest also declares lowest).
const declared = new Set(AREAS.flatMap(a => a.fields.flatMap(f => [f.key, f.key.split('.').at(-1), f.key.split('.')[0]])));
for (const k of Object.keys(NOT_IN_SHEET)) for (const p of k.split('.')) declared.add(p);
const clientAssumptions = new Set(ASSUMPTIONS.filter(a => a.client).map(a => a.client));

// Keys written through the shapes the screens use: a row's up({ key }), store.update(id, { key }), setDoc(part, { key }),
// the profile helpers set({ key }), and values: { key } on store.add. Words that are not stored (a popover's own
// options) are listed with why.
const NOT_STORED = {
  hint: 'a popover option', label: 'a popover option', min: 'a stepper option', homeworkDue: 'a homework list option, saved under profile.laterDue',
  why: 'a Fast Track answer, saved as whyNow', goal: 'a Fast Track answer, saved as goalWords', takeHome: 'a Fast Track answer, saved on the income row',
  rent: 'a Fast Track answer, saved as a Budget line', debt: 'a Fast Track answer, saved as debt rows', savings: 'a Fast Track answer, saved as an account',
  on: 'a toggle option', mode: 'a Giving option (giving.mode)', type: 'the record type (the Type column)', status: 'the row status (the Status column)',
  kind: 'a backup kind (Backups tab: Backup)', start: 'an income gap start (Income gaps tab)', months: 'months on an income gap, or variable income months',
  result: 'a refund history year (profile.taxHistory, skipped with why)',
};
// Files whose set({ ... }) writes a draft, not the household: Fast Track keeps its answers in settings.fastTrack and
// applyFastTrack (js/fasttrack.js) writes them into the rows, which the scan covers.
const DRAFTS = new Set(['js/ui/fasttrack-ui.js']);
function writtenKeys() {
  const found = new Map();
  const note = (k, where) => { if (!found.has(k)) found.set(k, where); };
  for (const [f, src] of Object.entries(code)) {
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      const at = `${f}:${i + 1}`;
      if (!DRAFTS.has(f)) for (const m of line.matchAll(/\b(?:up|set|setP|setL|setGiving|setH|setBen)\(\{ ?([A-Za-z_]\w*):/g)) note(m[1], at);
      for (const m of line.matchAll(/\.update\([^,()]+(?:\([^)]*\))?, \{ ?([A-Za-z_]\w*):/g)) note(m[1], at);
      for (const m of line.matchAll(/setDoc\('(profile|assumptions|settings|spending|client)', \{ ?([A-Za-z_]\w*):/g)) note(`${m[1]}:${m[2]}`, at);
      for (const m of line.matchAll(/\.add\('[a-z]+', \{[^}]*values: \{([^}]*)\}/g)) for (const k of m[1].matchAll(/([A-Za-z_]\w*):/g)) note(k[1], at);
    });
  }
  return found;
}

test('every key the app writes is in the field registry', () => {
  const missing = [];
  for (const [key, where] of writtenKeys()) {
    const [part, k] = key.includes(':') ? key.split(':') : [null, key];
    if (part === 'assumptions') { if (!clientAssumptions.has(k)) missing.push(`assumptions.${k} (${where}): add it to ASSUMPTIONS in js/registry/assumptions.js with client: '${k}'`); continue; }
    if (part === 'settings' || part === 'spending') { if (!declared.has(k) && !NOT_IN_SHEET[`${part}.${k}`]) missing.push(`${part}.${k} (${where}): add it to js/registry/fields.js (a Profile field with part: '${part}') or NOT_IN_SHEET`); continue; }
    if (declared.has(k) || NOT_STORED[k]) continue;
    missing.push(`${k} (${where}): add it to its area in js/registry/fields.js, or say why it stays in the app with sheet: { skip }`);
  }
  assert.deepEqual(missing, [], `Fields not in the registry:\n${missing.join('\n')}`);
});

test('every record kind the app makes is in exactly one area', () => {
  const kinds = new Set();
  for (const src of Object.values(code)) {
    for (const m of src.matchAll(/store\.add\('([a-z]+)'/g)) kinds.add(m[1]);
    for (const m of src.matchAll(/kind: '([a-z]+)', area:/g)) kinds.add(m[1]); // a list's own kind (js/ui/lists.js and friends)
  }
  for (const m of code['js/gates.js'].matchAll(/return \{ kind: '([a-z]+)'/g)) kinds.add(m[1]);
  {
  }
  const fixture = JSON.parse(readFileSync(new URL('fixtures/demo.json', root)));
  assert.ok(fixture.inputs);
  const missing = [...kinds].filter(k => !KINDS[k]);
  assert.deepEqual(missing, [], `Record kinds with no area: ${missing.join(', ')}. Add each to an area's kinds in js/registry/fields.js.`);
  const seen = {};
  for (const a of AREAS.filter(x => x.source === 'records')) for (const k of Object.keys(a.kinds)) { assert.ok(!seen[k], `${k} is in ${seen[k]} and ${a.id}`); seen[k] = a.id; }
});

test('every record area declares every field a record has', () => {
  const top = Object.keys(blankRecord('x')).filter(k => !['id', 'kind', 'type', 'status', 'fieldStatus', 'values', 'createdAt', 'updatedAt'].includes(k));
  for (const a of AREAS.filter(x => x.source === 'records')) {
    const keys = new Set(a.fields.filter(f => f.where === 'top').map(f => f.key));
    const missing = top.filter(k => !keys.has(k));
    assert.deepEqual(missing, [], `${a.tab}: declare ${missing.join(', ')} (a column, or sheet: { skip } with why)`);
  }
});

test('every field says how it lands in the sheet', () => {
  const TYPES = new Set(['money', 'pct', 'date', 'month', 'day', 'number', 'text', 'choice', 'yesno', 'list']);
  for (const a of AREAS) {
    assert.ok(a.id && a.tab && a.prefix && a.source && a.about, `${a.id}: id, tab, prefix, source and about`);
    assert.ok(a.tab.length <= 31 && !/[[\]:*?/\\]/.test(a.tab), `${a.tab}: a tab name Excel accepts`);
    const keys = new Set();
    for (const f of a.fields) {
      assert.ok(f.label && TYPES.has(f.type), `${a.tab} ${f.key}: label and a type (${[...TYPES].join(', ')})`);
      assert.ok(f.sheet === true || (f.sheet?.skip && f.sheet.skip.length > 10), `${a.tab} ${f.key}: sheet: true, or sheet: { skip: 'why' }`);
      if (f.type === 'choice') assert.ok(f.options?.length, `${a.tab} ${f.key}: a choice needs options`);
      const id = `${f.part ?? ''}.${f.key}`;
      assert.ok(!keys.has(id), `${a.tab} ${f.key}: declared twice`);
      keys.add(id);
    }
    assert.ok(sheetFields(a).length > 0, `${a.tab}: at least one column`);
  }
  assert.equal(new Set(AREAS.map(a => a.tab)).size, AREAS.length, 'tab names are unique');
  assert.equal(new Set(AREAS.map(a => a.prefix)).size, AREAS.length, 'prefixes are unique');
});

test('every js/math export is in the math registry', async () => {
  const claimed = new Set([...MATH.flatMap(e => e.fns), ...Object.keys(SUPPORT)]);
  const missing = [], gone = [];
  const files = readdirSync(new URL('js/math', root)).filter(f => f.endsWith('.js'));
  const all = new Set();
  for (const f of files) {
    const mod = await import(new URL(`js/math/${f}`, root));
    for (const name of Object.keys(mod)) { const id = `${f.replace('.js', '')}.${name}`; all.add(id); if (!claimed.has(id)) missing.push(id); }
  }
  for (const id of claimed) if (!all.has(id)) gone.push(id);
  assert.deepEqual(missing, [], `js/math exports not in js/registry/math.js (add each to an entry's fns, or to SUPPORT with why):\n${missing.join('\n')}`);
  assert.deepEqual(gone, [], `js/registry/math.js names exports that no longer exist:\n${gone.join('\n')}`);
});

test('every M number in the spec is in the math registry, each with a formula or a reason', () => {
  const csv = readFileSync(new URL('spec/csv/Math.csv', root), 'utf8');
  const spec = [...csv.matchAll(/^(M[0-9][0-9A-Z])\b/gm)].map(m => m[1]);
  const ids = MATH.map(e => e.id);
  assert.deepEqual(spec.filter(id => !ids.includes(id)), [], 'spec M numbers missing from js/registry/math.js');
  assert.deepEqual(ids.filter(id => !spec.includes(id)), [], 'registry M numbers the spec does not have');
  assert.equal(new Set(ids).size, ids.length, 'one entry per M number');
  for (const e of MATH) {
    assert.ok(e.name && e.inputs && typeof e.app === 'function', `${e.id}: name, inputs and app()`);
    assert.ok(!!e.sheet !== !!e.fromApp, `${e.id}: a sheet formula or fromApp with a reason, not both`);
    if (e.fromApp) assert.ok(e.fromApp.length > 15, `${e.id}: say why it comes from the app`);
    for (const p of e.parts || []) assert.ok(p.key && p.name && (!!p.sheet !== !!p.fromApp) && typeof p.app === 'function', `${e.id} ${p.key}: name, a formula or fromApp, and app()`);
  }
});

test('every Reference data value is an assumption, a table, or a listed word list', () => {
  const ids = new Set(ASSUMPTIONS.map(a => a.id));
  const prefixes = Object.keys(REFERENCE_LISTS);
  const missing = [];
  const leaves = (o, path) => (o && typeof o === 'object' && !Array.isArray(o) ? Object.entries(o).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k)) : [path]);
  for (const p of leaves(ref, '')) {
    if (ids.has(p) || prefixes.some(x => p === x || p.startsWith(`${x}.`))) continue;
    missing.push(p);
  }
  assert.deepEqual(missing, [], `Reference data values not in js/registry/assumptions.js:\n${missing.join('\n')}`);
  for (const a of ASSUMPTIONS) {
    assert.ok(a.name && a.label && a.source && /^\d{4}-\d{2}-\d{2}$/.test(a.date), `${a.id}: name, label, source and date (YYYY-MM-DD)`);
    if (!a.client) assert.notEqual(a.get(ref), undefined, `${a.id}: has a value`);
  }
  for (const t of TABLES) assert.ok(t.rows(ref).length && t.columns.length && t.date, `${t.id}: rows, columns and a date`);
  for (const [k, v] of Object.entries(RULES)) assert.ok(ASSUMPTIONS.some(a => a.id === `rules.${k}`), `RULES.${k} (${v}) needs an assumption entry`);
});
