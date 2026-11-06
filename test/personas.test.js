// The persona suite (batch 16): every made-up household in fixtures/personas opens through the app's own import and
// lands on the numbers a coach works out by hand (tools/personas/defs/<id>.mjs, expected, with the arithmetic in
// each note). A number the app gets differently is marked with a finding id in the def and shows here as a todo, so
// the gap stays visible without stopping the run; anything else that differs fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { importFile } from '../js/records.js';
import { metrics, keyNumbers } from '../js/math/metrics.js';
import { foo } from '../js/math/foo.js';
import { layersOf } from '../js/math/layers.js';
import { loadDefs, fileText, OUT_DIR, NOW } from '../tools/personas/build.mjs';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date(NOW);
const defs = await loadDefs();
const TOL = { money: 1, pct: 0.001, months: 1 };

// What the app says for each expected key.
export function appValue(key, doc, view = null) {
  const m = metrics(doc, ref, { now, person: view });
  const debtsWithBalance = m.inputs.debts.filter(d => (d.balance ?? 0) > 0 && !d.inFull);
  switch (key) {
    case 'takeHome': return m.inputs.takeHome;
    case 'netWorth': return m.netWorth.value;
    case 'surplus': case 'householdSurplus': return m.surplus.value;
    case 'savingsRate': return m.savingsRate.value;
    case 'sinking': return m.inputs.sinkingMonthly;
    case 'housingPct': return m.housingPct.value;
    case 'fooStep': return foo(doc, ref, { now }).here;
    case 'debtFreeMonths': return !debtsWithBalance.length ? 'none' : m.debtPlan.months ?? 'never';
    case 'heavyDebtMonths': return m.debtPlan.heavyMonths;
    case 'fiNumber': return m.fiNumber.value;
    case 'monthsToFi': return m.monthsToFi.never ? 'never' : m.monthsToFi.value;
    case 'runwayMonths': return m.runwayMonths.value;
    case 'bigETarget': return m.ruleOf5.value;
    case 'littleEFull': return layersOf(doc, ref, now).littleFull;
    default: throw new Error(`No app value for ${key}`);
  }
}
const close = (got, e) => (typeof e.value === 'number' && typeof got === 'number' ? Math.abs(got - e.value) <= (e.tol ?? TOL[e.unit] ?? 0) : got === e.value);

for (const def of defs) {
  const path = join(OUT_DIR, `${def.id}.json`);
  test(`persona ${def.id}: the backup file is there and opens through Import`, () => {
    assert.ok(existsSync(path), `${path} is missing: run node tools/personas/build.mjs`);
    const doc = importFile(readFileSync(path, 'utf8'));
    assert.equal(doc.client.name, def.name);
    assert.ok(doc.records.length > 5);
    assert.match(def.about, /^Made up\./, 'every persona says it is made up');
  });
  // Stale is a nudge, not a failure: a stale file still opens through migrate, so its numbers below still count.
  const fresh = existsSync(path) && readFileSync(path, 'utf8') === fileText(def);
  test(`persona ${def.id}: the file matches its def`, { todo: fresh ? false : 'out of date: run node tools/personas/build.mjs' }, () => { assert.ok(fresh); });
  const doc = existsSync(path) ? importFile(readFileSync(path, 'utf8')) : null;
  for (const [key, e] of Object.entries(def.expected)) {
    const view = e.view === 'all' ? null : def.view ?? null;
    const got = doc ? appValue(key, doc, view) : undefined;
    const ok = doc && close(got, e);
    // A known gap (e.finding) that still differs is a todo; once the app agrees it passes, and the finding can go.
    test(`persona ${def.id}: ${key} is ${e.value} (${e.note.slice(0, 60)})`, { todo: e.finding && !ok ? `finding ${e.finding}: the app says ${JSON.stringify(got)}` : false }, () => {
      assert.ok(ok, `${def.id} ${key}: expected ${JSON.stringify(e.value)}, the app says ${JSON.stringify(got)}. ${e.note}`);
    });
  }
}

// The FOO step a client is on should not move just because the month went on: two weeks later, with nothing changed,
// each persona should still be on the same step (finding F-LATE: undated payments land on the 1st and turn late).
for (const def of defs) {
  const path = join(OUT_DIR, `${def.id}.json`);
  if (!existsSync(path)) continue;
  const doc = importFile(readFileSync(path, 'utf8'));
  const a = foo(doc, ref, { now }).here, b = foo(doc, ref, { now: new Date(now.getTime() + 15 * 86400000) }).here;
  test(`persona ${def.id}: the FOO step holds two weeks later`, () => { assert.equal(b, a, `step ${a} on Nov 5, step ${b} on Nov 20`); });
}

test('personas: all fourteen are there, and the one-answer checks hold for each', () => {
  assert.equal(defs.length, 14); // batch 21: the job-loss household (Life Transitions); batch 29: the PSLF teacher
  for (const def of defs) {
    const doc = importFile(readFileSync(join(OUT_DIR, `${def.id}.json`), 'utf8'));
    const m = metrics(doc, ref, { now });
    const k = keyNumbers(m);
    // One debt plan: the snapshot's debt-free months and the plan every screen reads are the same number.
    assert.equal(k.debtFreeMonths, m.inputs.debts.length ? m.debtPlan.months : null, `${def.id}: two debt-free answers`);
    assert.equal(k.surplus, m.surplus.value, `${def.id}: two surpluses`);
  }
});
