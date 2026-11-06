// Batch 47: the benefits cliff (js/math/cliff.js, M9B). Every number here is worked by hand in the comment beside it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fplOf, snapLine, snapBenefit, applicablePct, healthAt, kidsAt, eitcOf, programsAt, raiseOf, breakEven, cliffOf, cliffOn, CLIFF_STATUS } from '../js/math/cliff.js';
import { metrics } from '../js/math/metrics.js';
import { importFile } from '../js/records.js';
import { ASSUMPTIONS, TABLES } from '../js/registry/assumptions.js';
import { loadDefs, OUT_DIR, NOW } from '../tools/personas/build.mjs';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date(NOW);
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);
// A household as the lines read it, built by hand (cliffHousehold's shape).
const H = over => ({ state: 'NY', nyc: false, coverage: null, adults: 1, kids: 0, ages: [], size: 1, age: 35, elderly: false, care: false, joint: false,
  filingStatus: 'Single', place: { state: 'NY', nyc: false }, earned: 0, unearned: 0, gross: 0, magi: 0, rentMonthly: 0, utilitiesMonthly: 0, taxRows: [], has: true, statuses: {}, snapTyped: null, ...over });

test('the poverty line: HHS 2026, $15,960 and $5,680 a person', () => {
  assert.equal(fplOf(ref, 1), 15960);
  assert.equal(fplOf(ref, 3), 27320); // 15,960 + 2 x 5,680
  assert.equal(fplOf(ref, 4), 33000);
});

test('the SNAP line: federal 130% table, New York 150% with earnings and 200% with child care', () => {
  assert.equal(snapLine(H({ state: 'PA', size: 1, earned: 20000 }), ref).monthly, 1729); // USDA FY2027, 1 person
  assert.equal(snapLine(H({ state: 'PA', size: 9, earned: 1 }), ref).monthly, 6037 + 616); // 8 people + each one more
  near(snapLine(H({ size: 3, earned: 20000 }), ref).monthly, 3415); // 1.5 x 27,320 / 12
  near(snapLine(H({ size: 3, earned: 20000, care: true }), ref).monthly, 4553.33); // 2 x 27,320 / 12
  assert.equal(snapLine(H({ size: 3, earned: 0, unearned: 12000 }), ref).monthly, 2960); // no earnings: the federal 130% line
});

test('the SNAP benefit: the most for the size less 30% of net income, the minimum for one or two', () => {
  // Jasmine: 3 people, $28,000 earned, rent $1,250, a utilities bill (rest of state heating SUA $877).
  const j = H({ size: 3, kids: 2, earned: 28000, gross: 28000, rentMonthly: 1250, utilitiesMonthly: 120 });
  const s = snapBenefit(j, ref);
  near(s.adj, 1649.67); // 2,333.33 - 466.67 - 217
  assert.equal(s.excess, 769); // 2,127 - 824.83 = 1,302.17, capped
  near(s.net, 880.67);
  assert.equal(s.monthly, 543); // 808 - ceil(264.20)
  // One person in PA at $1,500 a month, no rent: net = 1,500 - 300 - 217 = 983, 30% = 294.90 -> 295; 306 - 295 = 11, so the $25 minimum.
  const one = snapBenefit(H({ state: 'PA', earned: 18000, gross: 18000 }), ref);
  assert.equal(one.eligible, true);
  assert.equal(one.monthly, 25);
  // Over the federal net line outside New York: $1,700 gross, $0 earned (unearned): net 1,483 > 1,330.
  assert.equal(snapBenefit(H({ state: 'PA', unearned: 20400, gross: 20400 }), ref).eligible, false);
  // Over the gross line: nothing.
  assert.equal(snapBenefit(j, ref, { gross: 41000, earned: 41000 }).monthly, 0);
});

test('the marketplace share of income: the IRS 2027 table, a straight line inside each band, none over 400%', () => {
  near(applicablePct(1.2, ref), 0.0215);
  near(applicablePct(1.75, ref), 0.043 + 0.5 * (0.0678 - 0.043)); // halfway through 150% to 200%
  near(applicablePct(3.88, ref), 0.1022);
  assert.equal(applicablePct(4.01, ref), null);
});

test('health coverage is one chain: Medicaid, the Essential Plan (NY), help, full price', () => {
  const ny = H({ size: 2, adults: 2 }); // 21,640 a year for 2
  assert.equal(healthAt(ny, ref, 29000).on, 'medicaid'); // 134%
  assert.equal(healthAt(ny, ref, 40000).on, 'essential'); // 185%, free
  assert.equal(healthAt(ny, ref, 40000).cost, 0);
  const a = healthAt(ny, ref, 84000); // 388%, 10.22%: 8,584.80 of a 2 x 1,041 x 12 = 24,984 benchmark (KFF 2027, batch 54)
  assert.equal(a.on, 'aca');
  near(a.cost, 8584.8);
  near(a.help, 16399.2);
  assert.equal(healthAt(ny, ref, 90000).on, 'full');
  near(healthAt(ny, ref, 90000).cost, 24984);
  // Texas has not expanded Medicaid: under 100% of the line there is no help at all (the coverage gap).
  assert.equal(healthAt(H({ state: 'TX' }), ref, 12000).on, 'gap');
  assert.equal(healthAt(H({ state: 'TX' }), ref, 20000).on, 'aca');
});

test('New York children: Medicaid to 154%, Child Health Plus free to 222%, $15 a child a month to 250%', () => {
  const j = H({ size: 3, kids: 2, ages: [4, 8] });
  assert.equal(kidsAt(j, ref, 41000).on, 'medicaid'); // 150%
  assert.deepEqual([kidsAt(j, ref, 50000).on, kidsAt(j, ref, 50000).cost], ['chp', 0]); // 183%
  assert.equal(kidsAt(j, ref, 65000).cost, 2 * 15 * 12); // 238%
  assert.equal(kidsAt(j, ref, 120000).cost, null); // over 400%: full price, not priced
  assert.equal(kidsAt(H({ state: 'PA', kids: 1, size: 2 }), ref, 30000), null);
});

test('the EITC: tax year 2026, phased in and out, New York adds 30%', () => {
  const two = eitcOf(H({ kids: 2, size: 3 }), ref, { earned: 28000, agi: 28000 });
  near(two.federal, 7316 - 4110 * 7316 / 34739); // 6,450.44
  near(two.total, two.federal * 1.3);
  near(eitcOf(H({ state: 'PA', size: 1 }), ref, { earned: 5000, agi: 5000 }).federal, 5000 * 664 / 8680); // phase-in, no children: $664 at $8,680 earned (7.65%, as the table rounds it)
  assert.equal(eitcOf(H({ state: 'PA', size: 1, age: 23 }), ref, { earned: 5000, agi: 5000 }).total, 0); // under 25 with no children
  assert.equal(eitcOf(H({ state: 'PA', size: 1 }), ref, { earned: 20000, agi: 20000 }).total, 0); // past $19,540
  near(eitcOf(H({ state: 'PA', kids: 1, size: 3, joint: true, adults: 2 }), ref, { earned: 40000, agi: 40000 }).federal, 4427 - 8840 * 4427 / 27703); // joint threshold 31,160
});

test('a raise: kept after tax, less each counted benefit lost; the break-even', () => {
  // A one-person NY household on the Essential Plan at $31,000 of W-2 pay, taxed as SLAM taxes it.
  const base = H({ earned: 31000, gross: 31000, magi: 31000, taxRows: [{ id: 'j', person: 'Me', gross: 31000, pretax: 0, taxType: 'W-2', tips: 0 }] });
  const counted = new Set(['essential']);
  const r = raiseOf(base, ref, 2000, { counted });
  // Tax on $2,000: 12% federal + 7.65% FICA + 5.4% NY (taxable 23,000 to 25,000 is in the 5.4% band from 13,900) = 25.05%.
  near(r.afterTax, 1499); // 2,000 x (1 - 0.2505)
  // $33,000 is 206.8% of the line: 6.78% + (0.0677 / 0.5) x 1.88% = 7.0345%, x 33,000 = $2,321.38 a year, from $0.
  near(r.lost[0].amount, 33000 * (0.0678 + (33000 / 15960 - 2) / 0.5 * 0.0188), 0.01);
  assert.ok(r.net < 0);
  const even = breakEven(base, ref, 2000, { counted });
  assert.ok(even > 2000 && even % 100 === 0);
  assert.ok(raiseOf(base, ref, even, { counted }).net >= 0 && raiseOf(base, ref, even - 100, { counted }).net < 0);
  // Not on it: the same raise only pays tax.
  near(raiseOf(base, ref, 2000, { counted: new Set() }).net, 1499);
});

test('statuses: a tap wins, a Guess comes from About you; Phase 4 previews turn the screen on', () => {
  assert.deepEqual(CLIFF_STATUS, ['Getting it', 'Might qualify', 'Not on it']);
  assert.equal(cliffOn({ settings: { phase4: true } }), true);
  assert.equal(cliffOn({ settings: {} }), false);
});

test('every cliff number has a source and a date on the Assumptions tab', () => {
  for (const a of ASSUMPTIONS.filter(x => x.id.startsWith('cliff.'))) assert.ok(a.source.length > 20 && /^\d{4}-\d{2}-\d{2}$/.test(a.date), a.id);
  for (const id of ['SNAP_limits', 'ACA_applicable', 'ACA_benchmark', 'EITC_2026']) assert.ok(TABLES.some(t => t.id === id), id);
});

// The persona defs say what the screen should say (cliff: { ... }).
const allDefs = await loadDefs();
const defs = allDefs.filter(d => d.cliff);
test('every persona has a cliff block; two sit near a line, the W-2 households read nowhere near', () => {
  assert.equal(defs.length, allDefs.length);
  for (const id of ['single-parent', 'aca-couple']) assert.equal(defs.find(d => d.id === id)?.cliff.near?.value ?? true, true, id);
  for (const id of ['alexis', 'maya', 'tom', 'teacher']) assert.equal(defs.find(d => d.id === id).cliff.near.value, false, id);
});
for (const def of defs) {
  test(`persona ${def.id}: the benefits cliff reads as the def says`, () => {
    const doc = importFile(readFileSync(join(OUT_DIR, `${def.id}.json`), 'utf8'));
    const m = metrics(doc, ref, { now });
    const C = cliffOf(doc, ref, { now, m });
    const P = id => C.programs.find(p => p.id === id);
    const raiseNet = r => cliffOf(doc, ref, { now, m, raise: r }).raise;
    const got = {
      near: () => C.near, size: () => C.household.size, past: () => C.past, next: () => C.next?.id ?? null,
      snapLine: () => P('snap').line, snapMonthly: () => C.base.snap.monthly, medicaidLine: () => P('medicaid').line, essentialLine: () => P('essential').line,
      acaLine: () => P('aca').line, zones: () => C.zones.map(z => [z.from, z.to]), help: () => C.base.health.help, eitc: () => C.base.eitc.total,
    };
    const words = [C.nextText, C.nowhere, C.pastText, C.zonesText];
    for (const [key, e] of Object.entries(def.cliff)) {
      if (key === 'says') continue;
      let m2 = /^raise(\d+)$/.exec(key);
      if (m2) { const R = raiseNet(Number(m2[1])); near(R.net, e.value, e.tol ?? 0.01); words.push(R.say, R.mightText, ...R.rows.map(x => x.text)); continue; }
      m2 = /^breakEven(\d+)$/.exec(key);
      if (m2) { assert.equal(raiseNet(Number(m2[1])).even, e.value, key); continue; }
      m2 = /^health(\d+)$/.exec(key);
      if (m2) { const R = raiseNet(Number(m2[1])); near(R.rows.find(x => ['medicaid', 'essential', 'aca'].includes(x.id))?.amount ?? 0, e.value, e.tol ?? 0.01); words.push(R.say, ...R.rows.map(x => x.text)); continue; }
      const v = got[key]?.();
      if (typeof e.value === 'number') near(v, e.value, e.tol ?? 0.01); else assert.deepEqual(v, e.value, key);
    }
    words.push(...C.programs.filter(p => p.applies).flatMap(p => [p.label, p.status]));
    const all = words.filter(Boolean).join(' | ');
    for (const s of def.cliff.says || []) assert.ok(all.includes(s), `${def.id}: the screen should say "${s}" (it says: ${all})`);
    assert.doesNotMatch(all, /\u2014|NaN|undefined|\bat risk\b|\bbad\b|\bgood\b/);
  });
}
