// SPDX-License-Identifier: AGPL-3.0-only
// Benefits and health (run Finish everything partly built, Part 10): the one engine js/math/benefitsplan.js, worked out
// by hand on made-up numbers; the cliff's health chain is the same function; the web app's read (js/benefits.js);
// the employer library has a source on every row and no guessed field; the game's copy is current.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as B from '../js/math/benefitsplan.js';
import { healthAt, applicablePct, fplOf } from '../js/math/cliff.js';
import { commuterSavings, employerFillsOf, benefitsPlanOf, healthPlansOf } from '../js/benefits.js';
import { householdFromInputs } from '../js/demo.js';
import { metrics } from '../js/math/metrics.js';
import { CR_VEST } from '../js/math/career.js';

const root = new URL('../', import.meta.url), read = p => readFileSync(new URL(p, root), 'utf8');
const ref = JSON.parse(read('data/reference-2026.json')), lib = JSON.parse(read('data/library/employers.json'));
const R = B.bpRules(ref, lib), near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

test('the HSA: the limit less the employer\'s part, the tax, the employer\'s dollars, invested, receipts', () => {
  const H = B.bpHsa({ cover: 'family', age: 56, you: 12000, employer: 1500, rate: 0.3, years: 10, growth: 0.05, receipts: 800 }, R);
  assert.equal(H.limit, 9000 + 1000); // 2027 family plus the catch-up at 55
  assert.equal(H.put, 8500); assert.equal(H.over, 3500);
  assert.ok(near(H.yearly, 8500 * 0.3 + 1500));
  assert.ok(near(H.grows, 10000 * ((1.05 ** 10 - 1) / 0.05), 0.01));
  assert.equal(H.receiptsBank, 8000);
  const none = B.bpHsa({ cover: null, you: 1000, rate: 0.2 }, R);
  assert.equal(none.ready, false); assert.deepEqual(none.needs, ['self or family cover']);
  assert.equal(B.bpHsa({ cover: 'self', you: 1000, rate: 0.2 }, R).grows, null, 'no years: no growth number, never a made-up one');
});

test('the dependent care FSA: the care up to the limit, the years until the youngest turns 13', () => {
  const D = B.bpDcfsa({ care: 18000, ages: [2, 9, 14], rate: 0.25 }, R);
  assert.equal(D.put, 7500); assert.ok(near(D.yearly, 1875)); assert.equal(D.years, 11); assert.ok(near(D.total, 1875 * 11));
  assert.equal(B.bpDcfsa({ care: 18000, ages: [2], rate: 0.25, separate: true }, R).put, 3750);
  const old = B.bpDcfsa({ care: 5000, ages: [13, 15], rate: 0.25 }, R);
  assert.equal(old.yearly, 0); assert.equal(old.years, 0);
  assert.equal(B.bpDcfsa({ care: 5000, ages: [], rate: 0.2 }, R).ready, false);
});

test('the ESPP: the discount as a gain, the $25,000 of stock, at most 15% off', () => {
  const E = B.bpEspp({ put: 6000, discount: 0.1, rate: 0.22 }, R);
  assert.ok(near(E.gain, 6000 / 0.9 - 6000)); assert.ok(near(E.yearly, E.gain * 0.78));
  const cap = B.bpEspp({ put: 30000, discount: 0.15, rate: 0.22 }, R);
  assert.equal(cap.put, 21250); assert.equal(cap.stock, 25000); assert.equal(cap.over, 8750);
  assert.equal(B.bpEspp({ put: 1000, discount: 0.2, rate: 0.2 }, R).ready, false, 'a discount over 15% is not a qualified plan');
});

test('commuter: the one engine behind the About you nudge', () => {
  const C = B.bpCommuter({ monthly: 400, rate: 0.3 }, R);
  assert.equal(C.cap, 350); assert.equal(C.covered, 4200); assert.ok(near(C.yearly, 1260));
  assert.deepEqual(commuterSavings({ have: 'No', transitMonthly: 132, marginal: 0.3, limitMonthly: 340 }), { yearly: 132 * 12 * 0.3, covered: 132 * 12, marginal: 0.3 });
  assert.equal(commuterSavings({ have: 'Yes', transitMonthly: 132, marginal: 0.3, limitMonthly: 340 }), null);
});

test('the sum counts only what is worked out', () => {
  const O = B.bpOptimize({ hsa: { cover: 'self', you: 2000, rate: 0.3 }, espp: { put: null, discount: 0.15, rate: 0.2 }, commuter: { monthly: 100, rate: 0.3 } }, R);
  assert.equal(O.of, 2); assert.ok(near(O.yearly, 600 + 360));
  assert.deepEqual(O.rows.find(r => r.id === 'espp').needs, ['what you put in']);
});

test('coverage: one chain, the same function as the cliff\'s', () => {
  const H = { state: 'NY', size: 2, adults: 2 }, f = 15960 + 5680;
  for (const magi of [0, 20000, 29000, 43000, 50000, 80000, 90000, 200000]) assert.deepEqual(healthAt(H, ref, magi), B.bpCoverage(H, R, magi));
  assert.equal(fplOf(ref, 3), B.bpFpl(R, 3));
  assert.equal(applicablePct(2.2, ref), B.bpApplicable(2.2, R));
  assert.equal(B.bpCoverage(H, R, f * 1.3).on, 'medicaid');
  assert.equal(B.bpCoverage(H, R, f * 1.9).on, 'essential');
  const A = B.bpCoverage(H, R, f * 3);
  assert.equal(A.on, 'aca'); assert.ok(near(A.cost, 0.1022 * f * 3)); assert.ok(near(A.help, 1041 * 12 * 2 - A.cost));
  assert.equal(B.bpCoverage(H, R, f * 4.1).on, 'full');
  assert.equal(B.bpCoverage({ state: 'TX', size: 1, adults: 1 }, R, 12000).on, 'gap', 'Texas did not expand Medicaid: under the line there is no help');
  const E = B.bpEligible({ state: 'NY', size: 1, magi: 30000 }, R);
  assert.equal(E.now.on, 'essential'); assert.deepEqual(E.lines.map(l => l.id), ['medicaid', 'essential', 'aca']);
  assert.ok(near(E.toNext, 15960 * 2 - 30000));
  assert.deepEqual(B.bpEligible({ size: null, magi: 1 }, R).needs, ['the people in your tax household']);
});

test('plans side by side: the credit on marketplace plans only, a light, typical and heavy year', () => {
  const P = B.bpPlans([{ name: 'Gold', premium: 600, deductible: 1000, oop: 4000, market: true }, { name: 'Bronze', premium: 300, deductible: 7000, oop: 9000, market: true }, { name: 'Work', premium: 200, deductible: 2500, oop: 6000, market: false }], { help: 5000 });
  const [g, b, w] = P.rows;
  assert.equal(g.year, 7200 - 5000); assert.equal(b.year, 0, 'the credit never goes past the premium'); assert.equal(w.year, 2400, 'no credit through work');
  assert.equal(g.typical, 2200 + 1000); assert.equal(b.heavy, 9000); assert.equal(w.heavy, 8400);
  assert.deepEqual(P.cheapest, { light: 1, typical: 0, heavy: 0 });
  assert.equal(B.bpPlans([{ premium: 100, deductible: 0, oop: null }, {}]).ready, false);
});

test('the health cliff: a raise across the Essential Plan line, and the raise that makes it up', () => {
  const x = { state: 'NY', size: 1, adults: 1, magi: 31000, raise: 1000 };
  const L = B.bpHealthCliff(x, R);
  assert.equal(L.from, 'essential'); assert.equal(L.to, 'aca'); assert.ok(L.net < 0);
  assert.ok(L.even > 1000 && L.even - (B.bpCoverage({ state: 'NY', size: 1, adults: 1 }, R, 31000 + L.even).cost) >= 0);
  assert.ok(L.even - 100 - B.bpCoverage({ state: 'NY', size: 1, adults: 1 }, R, 31000 + L.even - 100).cost < 0);
});

test('the employer library: a source on every row, vesting ids of the career engine, no guessed field', () => {
  const vest = new Set(CR_VEST.map(v => v.id));
  for (const e of B.bpEmployers(R)) {
    assert.ok(e.sources.length && e.sources.every(s => s.what && s.source && /^\d{4}-\d{2}-\d{2}$/.test(s.read)), `${e.name}: each source says what, where and when it was read`);
    assert.ok(e.vest === null || vest.has(e.vest), `${e.name}: vesting is a CR_VEST id or empty`);
    assert.ok(e.tiers.every(t => t.rate > 0 && t.upTo > 0 && t.upTo <= 1), `${e.name}: match tiers as fractions of pay`);
    assert.ok(e.esppDiscount === null || (e.esppDiscount > 0 && e.esppDiscount <= ref.benefits.espp.maxDiscount), `${e.name}: ESPP discount`);
    for (const k of ['vest', 'esppDiscount', 'hsaEmployer']) if (e[k] !== null) assert.ok(e.sources.some(s => /vest|ESPP|HSA/i.test(s.what + s.source)), `${e.name}: ${k} has its own source`);
  }
  const hd = B.bpEmployer('homedepot', R);
  assert.ok(near(hd.fullAt, 0.05)); assert.ok(near(hd.fullPct, 0.035));
  assert.deepEqual(B.bpEmployer('jpmorgan', R).empty.sort(), ['esppDiscount', 'hsaEmployer', 'vest']);
});

test('the web app: tapping an employer fills the job row and the ESPP, never a field it does not have', () => {
  const doc = { profile: { benefits: {} } };
  const recs = [{ id: 'j1', kind: 'income', type: 'Job', values: {} }];
  const F = employerFillsOf(doc, recs, B.bpEmployer('wellsfargo', R));
  assert.deepEqual(F.records, [{ id: 'j1', patch: { hasMatch: 'Yes', matchPct: 1, matchCapPct: 0.06, vesting: 'Cliff' }, what: 'your job row on Income' }]);
  assert.equal(F.profile.benefits.employer, 'wellsfargo'); assert.equal(F.profile.benefits.espp, undefined);
  const M = employerFillsOf(doc, [...recs, { id: 'a1', kind: 'account', type: '401(k)', values: {} }], B.bpEmployer('homedepot', R));
  assert.deepEqual(M.records.map(r => r.id), ['j1', 'a1']); assert.equal(M.records[0].patch.matchPct, undefined, 'two tiers: the 401(k) holds them');
  assert.equal(employerFillsOf(doc, recs, B.bpEmployer('microsoft', R)).profile.benefits.espp.discount, 0.1);
});

test('the web app reads the one engine (demo household)', () => {
  const fx = JSON.parse(read('fixtures/demo.json')), now = new Date('2026-11-26T12:00:00Z');
  const doc = householdFromInputs(fx.inputs, { now: now.toISOString() });
  doc.profile.benefits = { plan: { hsaCover: 'self', hsaYou: 3000 }, plans: [{ premium: 400, deductible: 2000, oop: 8000, market: true }, { premium: 250, deductible: 6000, oop: 9500, market: true }] };
  const m = metrics(doc, ref, { now });
  const O = benefitsPlanOf(doc, ref, m, { rates: { marginal: 0.3, ficaMarginal: 0.0765 }, transit: 120, lib });
  assert.ok(O.parts.hsa.ready && near(O.parts.hsa.yearly, 900)); assert.ok(O.parts.commuter.ready && near(O.parts.commuter.yearly, 432));
  assert.equal(O.employers.length, Object.keys(lib.rows).length);
  const P = healthPlansOf(doc, ref, m, { now });
  assert.equal(P.P.rows.length, 2);
});

test('the game\'s copy is made from this file and its rows, and is current (node tools/game_benefits_build.mjs)', () => {
  const src = read('js/math/benefitsplan.js');
  const rows = { studentLoans: { poverty: ref.studentLoans.poverty }, benefits: ref.benefits, cliff: { medicaid: ref.cliff.medicaid, ny: ref.cliff.ny, aca: ref.cliff.aca }, tax: { socialSecurityRate: ref.tax.socialSecurityRate, medicareRate: ref.tax.medicareRate }, employers: lib };
  const hash = createHash('sha256').update(src + JSON.stringify(rows)).digest('hex').slice(0, 16);
  assert.match(read('game/core/benefitsplan.js'), new RegExp(`SOURCE-HASH  ${hash}`), 'run node tools/game_benefits_build.mjs, then the game steps');
  assert.match(read('game/index.html'), /<script src="core\/benefitsplan\.js\?v=[0-9a-f]+"><\/script>/);
  assert.match(read('game/index.html'), /<script src="features\/benefits\.js\?v=[0-9a-f]+"><\/script>/);
});

test('the cliff adds a state only with its own dated rule: New Jersey SNAP at 185%, no net test', async () => {
  const { snapLine, snapBenefit } = await import('../js/math/cliff.js');
  const H = { state: 'NJ', size: 4, earned: 50000, gross: 50000, rentMonthly: 0, utilitiesMonthly: 0, elderly: false };
  const L = snapLine(H, ref);
  assert.equal(L.multiple, 1.85); assert.equal(Math.round(L.monthly), 5088, 'the nj.gov table: $5,088 for four');
  assert.equal(Math.round(snapLine({ ...H, size: 1 }, ref).monthly), 2461, 'and $2,461 for one');
  assert.equal(snapBenefit({ ...H, gross: 60000, earned: 60000 }, ref).eligible, true, 'under 185% with no net test');
  assert.equal(snapLine({ ...H, state: 'PA' }, ref).multiple, ref.cliff.snap.baseMultiple, 'a state not on file keeps the federal line');
});
