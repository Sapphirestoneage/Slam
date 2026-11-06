// SPDX-License-Identifier: AGPL-3.0-only
// Batch 49 (households of any size): every number each view of a household shows, in one object, so a change to how
// households are read can prove it moved nothing for any file that was already there. For every persona and the Demo,
// in the household view and each person's view: the key numbers, take-home, spending, the FOO step, the cash layers,
// this month's statements, this month's calendar and the views each audience (coach, Client view) sees after the
// privacy fold. test/households.test.js compares it with fixtures/views-baseline.json, written before batch 49.
//   node tools/personas/views.mjs           writes fixtures/views-baseline.json
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importFile } from '../../js/records.js';
import { metrics, keyNumbers } from '../../js/math/metrics.js';
import { foo } from '../../js/math/foo.js';
import { layersOf } from '../../js/math/layers.js';
import { statements, periodOf } from '../../js/math/statements.js';
import { instances, monthView, ymOf } from '../../js/month.js';
import { foldDoc, audienceOf } from '../../js/privacy.js';
import { NOW } from './build.mjs';
import { householdFromInputs } from '../../js/demo.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ref = JSON.parse(readFileSync(join(root, 'data', 'reference-2026.json'), 'utf8'));
export const BASELINE = join(root, 'fixtures', 'views-baseline.json');
const now = new Date(NOW);
const r2 = v => (typeof v === 'number' ? Math.round(v * 100) / 100 : v ?? null);

function one(doc, person) {
  const m = metrics(doc, ref, { now, person });
  const k = keyNumbers(m);
  const x = m.inputs;
  let step = null; try { step = foo(doc, ref, { now, person: person === 'all' ? null : person }).here; } catch { step = 'error'; }
  let layers = null; try { layers = layersOf(doc, ref, now, { person: person === 'all' ? null : person }).layers.map(l => [l.id, r2(l.target), r2(l.have)]); } catch { layers = 'error'; }
  let st = null; try { const s = statements(doc, ref, periodOf('month', now), { now, person }); st = [r2(s.income.takeHome), r2(s.income.surplus), r2(s.cash.end), r2(s.netWorth.netWorth)]; } catch { st = 'error'; }
  const ym = ymOf(now);
  let cal = null; try { const list = instances(doc, ref, ym, { now, person }); cal = [list.length, r2(list.reduce((s, i) => s + (i.planned ?? 0), 0)), list.map(i => `${i.key}=${r2(i.planned)}`).join('|').length]; } catch { cal = 'error'; }
  let mv = null; try { const v = monthView(doc, ref, ym, { now, person }); mv = [v.rows.length, r2(v.totals.estimate), r2(v.totals.rough)]; } catch { mv = 'error'; }
  return { ...Object.fromEntries(Object.entries(k).map(([a, b]) => [a, r2(b)])), takeHome: r2(x.takeHome), spending: r2(x.spending), housing: r2(x.housing), cash: r2(x.cash), invested: r2(x.invested),
    runway: r2(m.runwayMonths?.value), ruleOf5: r2(m.ruleOf5?.value), lines: x.lines.length, step, layers, st, cal, mv };
}

export function snapshotOf(doc) {
  const out = {};
  for (const p of [null, 'Me', 'Partner']) out[p ?? 'all'] = one(doc, p);
  for (const clientView of [false, true]) for (const person of ['all', 'Me', 'Partner']) {
    const d = { ...doc, settings: { ...doc.settings, person } };
    const aud = audienceOf(d, { clientView });
    const f = foldDoc(d, aud, ref);
    out[`fold:${clientView ? 'client' : 'coach'}:${person}`] = { n: f.records.length, names: f.records.map(r => r.name).join('|').length, ...keyNumbers(metrics(f, ref, { now, person: aud.person === 'all' ? null : aud.person })) };
  }
  return out;
}

// The Demo as "Try with example numbers" opens it: the fixture's inputs, then the usual list.
export function demoDoc() {
  const doc = householdFromInputs(JSON.parse(readFileSync(join(root, 'fixtures', 'demo.json'), 'utf8')).inputs, { now: NOW });
  return doc;
}

export function allSnapshots() {
  const dir = join(root, 'fixtures', 'personas');
  const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  const out = {};
  for (const f of files) out[f.replace(/\.json$/, '')] = snapshotOf(importFile(readFileSync(join(dir, f), 'utf8')));
  out.demo = snapshotOf(demoDoc());
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const only = process.argv.slice(2).filter(a => !a.startsWith('-'));
  const all = allSnapshots();
  const keep = only.length ? Object.fromEntries(Object.entries(all).filter(([k]) => only.includes(k))) : all;
  writeFileSync(BASELINE, `${JSON.stringify(keep, null, 1)}\n`);
  console.log(`Wrote ${Object.keys(keep).length} households to fixtures/views-baseline.json`);
}
