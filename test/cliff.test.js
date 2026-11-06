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
      ccapLine: () => P('ccap').line, ccapShare: () => C.base.ccap?.share ?? null, ctc: () => m.inputs.householdTax.ctc?.total ?? 0, // batch 53
    };
    const words = [C.nextText, C.nowhere, C.pastText, C.zonesText];
    for (const [key, e] of Object.entries(def.cliff)) {
      if (key === 'says') continue;
      let m2 = /^raise(\d+)$/.exec(key);
      if (m2) { const R = raiseNet(Number(m2[1])); near(R.net, e.value, e.tol ?? 0.01); words.push(R.say, R.mightText, R.ctcRow?.text, R.ctcText, ...R.rows.map(x => x.text)); continue; }
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

// ---------- Batch 53: head of household, the Child Tax Credit, New York's child care help ----------
import { federalTax, householdTax, childTaxCredit, defaultFilingStatus, kidsOf, ctcKidsOf, ctcLineOf } from '../js/math/income.js';
import { ccapLine, ccapAt, careTypical } from '../js/math/cliff.js';

test('head of household: the 2026 brackets and the $24,150 deduction (Rev. Proc. 2025-32)', () => {
  // $28,000: taxable 3,850 at 10% = $385 (single: 11,900, $1,190).
  near(federalTax({ gross: 28000, filingStatus: 'Head of household' }, ref).value, 385);
  near(federalTax({ gross: 28000, filingStatus: 'Single' }, ref).value, 1190);
  // $100,000: taxable 75,850: 1,770 + 12% x 49,750 = 7,740, + 22% x 8,400 = 1,848: $9,588.
  near(federalTax({ gross: 100000, filingStatus: 'Head of household' }, ref).value, 9588);
  // Jasmine's $13,000 raise: federal on it $1,300 as head of household (all at 10%), $1,550 on the single brackets: $250.00 less.
  const fed = (fs, g) => householdTax([{ id: 'a', person: 'Me', gross: g, pretax: 0, taxType: 'W-2' }], { filingStatus: fs }, ref).total.federal;
  near(fed('Head of household', 41000) - fed('Head of household', 28000), 1300);
  near(fed('Single', 41000) - fed('Single', 28000), 1550);
  near((fed('Single', 41000) - fed('Single', 28000)) - (fed('Head of household', 41000) - fed('Head of household', 28000)), 250);
});

test('the filing status guess: Married jointly once married, Head of household with a dependent, else Single', () => {
  assert.equal(defaultFilingStatus({ household: 'Solo', dependents: 2 }), 'Head of household');
  assert.equal(defaultFilingStatus({ household: 'Solo', dependents: 0 }), 'Single');
  assert.equal(defaultFilingStatus({ household: 'Solo', kidAges: [3] }), 'Head of household');
  assert.equal(defaultFilingStatus({ mode: 'Married merged', dependents: 1 }), 'Married jointly');
  assert.deepEqual(kidsOf({ dependents: 3, kidAges: [4, 8] }), { count: 3, ages: [4, 8, null], others: 0 });
  // Batch 49's People list: a child with an age, and a parent you support (an other dependent, not a child).
  const people = { people: [{ id: 'D1', kind: 'Dependent', role: 'Child', age: 6 }, { id: 'D2', kind: 'Dependent', role: 'Parent I support', age: 71 }], dependents: 2, kidAges: [6] };
  assert.deepEqual(kidsOf(people), { count: 1, ages: [6], others: 1 });
  assert.deepEqual(ctcKidsOf(people, ref), { kids: 1, others: 1, guessed: false });
  assert.equal(defaultFilingStatus({ household: 'Solo', people: [{ id: 'D1', kind: 'Dependent', role: 'Parent I support' }] }), 'Head of household');
  assert.deepEqual(ctcKidsOf({ dependents: 3, kidAges: [4, 17] }, ref), { kids: 2, others: 1, guessed: true }); // 17 is too old; no age typed counts as under 17
});

test('the Child Tax Credit: $2,200 a child, off the tax first, the refund to $1,700 a child, a slow phase-out', () => {
  // Jasmine: 2 children, tax $385, earnings $28,000: $385 off, refund min(4,015, 3,400, 3,825) = 3,400.
  const j = childTaxCredit({ kids: 2, magi: 28000, incomeTax: 385, earned: 28000 }, ref);
  near(j.nonrefundable, 385); near(j.refundable, 3400); near(j.total, 3785);
  // Low earnings: $10,000 earned, no tax: the refund is 15% of 7,500 = $1,125.
  near(childTaxCredit({ kids: 1, magi: 10000, incomeTax: 0, earned: 10000 }, ref).total, 1125);
  // Over the line: $210,500 single with 1 child: 11 thousands (10,500 rounds up) x $50 = $550 off, $1,650 left.
  const hi = childTaxCredit({ kids: 1, magi: 210500, incomeTax: 40000, earned: 210500 }, ref);
  near(hi.credit, 1650); assert.equal(hi.phasedOut, true);
  // Married jointly the line is $400,000: nothing off at $210,500.
  near(childTaxCredit({ kids: 1, magi: 210500, incomeTax: 30000, earned: 210500, joint: true }, ref).credit, 2200);
  // An other dependent is $500 and not refundable.
  near(childTaxCredit({ others: 1, magi: 20000, incomeTax: 0, earned: 20000 }, ref).total, 0);
  // In the household tax: on Me's return, said apart (federal is before it).
  const hh = householdTax([{ id: 'a', person: 'Me', gross: 28000, pretax: 0, taxType: 'W-2' }], { filingStatus: 'Head of household', children: { kids: 2, others: 0 } }, ref);
  near(hh.total.federal, 385); near(hh.ctc.total, 3785); near(hh.total.ctc, 3785);
  assert.match(ctcLineOf(hh, ref).text, /Child Tax Credit: \$3,785 a year for 2 children under 17 \(\$385 off your federal tax and \$3,400 back as a refund\)/);
  assert.equal(householdTax([{ id: 'a', person: 'Me', gross: 28000, pretax: 0, taxType: 'W-2' }], { filingStatus: 'Single' }, ref).ctc, null);
});

test('New York child care help (CCAP): 85% of the state median income, 1% of income over the poverty line', () => {
  const j = H({ size: 3, kids: 2, careKids: 2, careAges: [4, 8], earned: 28000, gross: 28000 });
  assert.equal(ccapLine(j, ref), 97853); // OCFS, 3 people, June 1 2026 to May 31 2027
  assert.equal(ccapLine(H({ size: 9 }), ref), 160759 + 3495); // past 8: the step between 7 and 8
  assert.equal(ccapAt(j, ref, 28000).share, 0); // $6.80 a year is 13 cents a week: $0
  assert.equal(ccapAt(j, ref, 41000).weekly, 2.5); // 136.80 / 52 = 2.63
  assert.equal(ccapAt(j, ref, 97853).weekly, 13.5); // the county table's example at 85% SMI for 3: $13.50
  assert.equal(ccapAt(j, ref, 97900).eligible, false);
  assert.equal(ccapAt(H({ state: 'PA', size: 3, careKids: 2 }), ref, 28000), null); // not modelled outside New York
  assert.equal(careTypical(j, ref), Math.round((340 + 286) * 52 / 12)); // a 4-year-old and an 8-year-old outside NYC
  // A raise across the line: 3 people at $96,000, care $2,000 a month: the help ends, $24,000 less the $676 share a year.
  const near97 = H({ size: 3, kids: 2, careKids: 2, careAges: [4, 8], earned: 96000, gross: 96000, magi: 96000, careFull: 2000,
    taxRows: [{ id: 'j', person: 'Me', gross: 96000, pretax: 0, taxType: 'W-2', tips: 0 }] });
  const r = raiseOf(near97, ref, 3000, { counted: new Set(['ccap']) });
  const lost = r.lost.find(l => l.id === 'ccap');
  assert.equal(lost.ends, true);
  near(lost.amount, 24000 - ccapAt(near97, ref, 96000).share); // share: 1% of 68,680 = 686.80 / 52 = 13.21, $13.00 a week, $676
  near(ccapAt(near97, ref, 96000).share, 676);
  assert.ok(r.net < 0);
});
