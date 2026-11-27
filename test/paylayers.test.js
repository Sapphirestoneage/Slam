// SPDX-License-Identifier: AGPL-3.0-only
// What it is / What it could be (run A, Nov 27 2026): the two numbers and the year-by-year run of the layer chart
// (js/math/paylayers.js), and the game's copy of it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { LY_END, LY_LAYERS, LY_ACCOUNTS, LY_SPENDING, lyShapeAt, lyShapeBands, lyYears, lyBars, lyNeedsAge, lyLayerSum, lyCoverage, lyTarget, lyPile, lyCounted, lyNumbers, lyReceipt, lyLifetime, lyShares, lyTaxPlan, lyEndsAt, lyFlex } from '../js/math/paylayers.js';

const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);
// a made-up tax: nothing on the first 16,100, then 12%, then 22% over 66,500
const tax = x => Math.max(0, Math.min(x, 66500) - 16100) * 0.12 + Math.max(0, x - 66500) * 0.22;
const base = (over = {}) => ({ age: 27, spend: 42000, needsShare: 0.75, workPay: 54000, save: 12000, bal: { tax: 0, pre: 60000, roth: 0, hsa: 0 }, saveTo: { pre: 1 }, preShare: 1,
  grow: 0.07, draw: 0.04, ss: { year: 24000, age: 67 }, other: [], health: { year: 8436, until: 65 }, tax, ...over });
const people = [
  base(),
  base({ age: 38, spend: 88800, workPay: 126000, save: 37200, bal: { tax: 25000, pre: 210000, roth: 40000, hsa: 9000 }, saveTo: { tax: 0.1, pre: 0.7, roth: 0.15, hsa: 0.05 }, preShare: 210 / 284, ss: { year: 52000, age: 67 }, other: [{ year: 9000, from: 62 }] }),
  base({ age: 31, spend: 46800, workPay: 62400, save: 15600, bal: { tax: 6000, pre: 0, roth: 28000, hsa: 0 }, saveTo: { tax: 0.2, roth: 0.8 }, preShare: 0, ss: { year: 21000, age: 67 } }),
  base({ age: 55, spend: 60000, workPay: 60000, save: 0, bal: { tax: 0, pre: 0, roth: 0, hsa: 0 } }), // saves nothing and has nothing: no age
];
const sumsTo = r => near(r.work + r.tax + r.pre + r.roth + r.hsa + r.ss + r.other + r.gap, r.line);

test('What it is: a year of spending divided by the rate (25 times), and the first year the pile reaches it', () => {
  const N = lyNumbers(base(), {});
  assert.equal(N.is.target, 1050000);
  let inv = 60000, n = 0; while (inv < 1050000) { inv = inv * 1.07 + 12000; n++; }
  assert.equal(N.is.years, n); assert.equal(N.is.age, 27 + n);
  near(lyPile(60000, 12000, 0.07, n), inv, 1e-6);
  assert.equal(lyNumbers(people[3], {}).is.age, null, 'no saving and not there: no age');
});

test('with nothing counted the two numbers are equal, for every player', () => {
  for (const p of people) {
    const N = lyNumbers(p, {});
    assert.deepEqual(N.could, N.is); assert.equal(N.counted, false); assert.deepEqual(N.raisedBy, []);
    assert.deepEqual(lyNumbers(p, undefined).could, N.is);
  }
});

test('the target at an age with flat spending and nothing else is the 25 times number', () => {
  const q = lyCounted(base(), {});
  for (const at of [27, 45, 60, 80, 95]) near(lyTarget(q, at), 1050000, 1e-6);
});

test('counting steady income or a spending shape never raises it; counting a cost can, and it is named', () => {
  for (const p of people.slice(0, 3)) {
    const is = lyNumbers(p, {}).is;
    for (const c of [{ ss: { share: 1 } }, { ss: { share: 0.5 } }, { other: {} }, { shape: { bands: [{ from: 75, f: 0.8 }, { from: 85, f: 0.7 }] } }, { ss: {}, other: {}, shape: { bands: [{ from: 70, f: 0.9 }] } }]) {
      const N = lyNumbers(p, c);
      assert.ok(N.could.target <= is.target + 1e-6, JSON.stringify(c)); assert.ok(N.could.age <= is.age); assert.deepEqual(N.raisedBy, []);
    }
    const H = lyNumbers(p, { health: {} });
    assert.ok(H.could.target > is.target); assert.deepEqual(H.raisedBy, ['health']);
    if (p.preShare > 0) { const T = lyNumbers(p, { wtax: {} }); assert.ok(T.could.target > is.target); assert.deepEqual(T.raisedBy, ['wtax']); }
    const R = lyReceipt(is, lyNumbers(p, { ss: { share: 1 } }).could);
    assert.ok(R.off > 0 && R.months >= 0 && R.months % 12 === 0);
  }
  // a layer that is switched off is not counted
  const off = lyNumbers(base({ off: { ss: true } }), { ss: { share: 1 } });
  assert.equal(off.counted, false); assert.deepEqual(off.could, off.is);
});

test('for every year, the layers plus the gap equal the spending line', () => {
  for (const p of people) for (const stop of [null, p.age, 50, 62, 70]) for (const off of [{}, { work: true }, { pre: true }, { ss: true }, { tax: true, pre: true, roth: true, hsa: true }]) {
    const rows = lyYears({ ...p, stop, off });
    assert.equal(rows.length, LY_END - p.age + 1); assert.equal(rows[0].age, p.age); assert.equal(rows.at(-1).age, LY_END);
    for (const r of rows) { sumsTo(r); near(r.needs + r.wants + r.health + r.wtax, r.line); assert.ok(r.gap >= 0); near(r.inv, r.tax + r.pre + r.roth + r.hsa); }
    for (const b of lyBars(rows, 5)) { near(b.work + b.inv + b.ss + b.other + b.gap, b.line); assert.ok(b.n <= 5); }
    near(lyBars(rows, 5).reduce((s, b) => s + b.line * b.n, 0), rows.reduce((s, r) => s + r.line, 0), 0.5);
  }
});

test('switching a layer off never raises coverage', () => {
  for (const p of people) for (const stop of [null, 50, 62]) {
    const on = lyYears({ ...p, stop }), c0 = lyCoverage(on);
    for (const off of [{ work: true }, { tax: true }, { pre: true }, { roth: true }, { hsa: true }, { ss: true }, { other: true }, { tax: true, pre: true, roth: true, hsa: true }]) {
      const rows = lyYears({ ...p, stop, off }), c = lyCoverage(rows);
      assert.ok(c.share <= c0.share + 1e-9, JSON.stringify(off));
      rows.forEach((r, i) => assert.ok(r.gap >= on[i].gap - 0.01, `age ${r.age} ${JSON.stringify(off)}`));
      const k = Object.keys(off)[0];
      assert.equal(lyLayerSum(rows, k).total, 0, 'a layer that is off pays nothing');
    }
  }
});

test('the year: steady income first, then work, then the accounts in their order; the HSA pays health first', () => {
  const p = base({ age: 60, stop: 60, bal: { tax: 20000, pre: 300000, roth: 50000, hsa: 30000 }, tax: null, ss: { year: 24000, age: 67 } });
  const rows = lyYears(p), a = rows[0];
  near(a.health, 8436); near(a.hsa, 8436); near(a.tax, 20800); near(a.pre, 42000 - 20800); assert.equal(a.roth, 0); assert.equal(a.work, 0);
  const at67 = rows.find(r => r.age === 67);
  near(at67.ss, 24000); near(at67.toNeeds, 24000); assert.equal(at67.health, 0); assert.equal(at67.needsMet, false);
  assert.equal(lyNeedsAge(rows), null);
  assert.equal(lyNeedsAge(lyYears({ ...p, ss: { year: 33000, age: 67 } })), 67);
  // while work pays, nothing comes out and the saving goes in
  const w = lyYears(base({ stop: 50, tax: null }));
  near(w[0].work, 42000); assert.equal(w[0].inv, 0); near(w[0].left, 60000 * 1.07 + 12000);
  // the tax on traditional money is part of the line, and it settles
  const t = lyYears(base({ age: 60, stop: 60, bal: { tax: 0, pre: 2000000, roth: 0, hsa: 0 } }))[0];
  near(t.wtax, tax(t.pre), 0.01); near(t.pre, 42000 + 8436 + t.wtax);
});

test('a spending shape and the lists the screens read', () => {
  assert.equal(lyShapeAt(null, 80), 1);
  assert.equal(lyShapeAt([{ from: 85, f: 0.7 }, { from: 75, f: 0.8 }], 74), 1);
  assert.equal(lyShapeAt([{ from: 85, f: 0.7 }, { from: 75, f: 0.8 }], 80), 0.8);
  assert.equal(lyShapeAt([{ from: 85, f: 0.7 }, { from: 75, f: 0.8 }], 90), 0.7);
  const rows = lyYears(base({ stop: 50, shape: [{ from: 75, f: 0.8 }] }));
  near(rows.find(r => r.age === 80).needs + rows.find(r => r.age === 80).wants, 42000 * 0.8);
  assert.deepEqual(LY_LAYERS.map(l => l.id), ['work', 'inv', 'ss', 'other']);
  assert.deepEqual(LY_ACCOUNTS.map(l => l.id), ['tax', 'pre', 'roth', 'hsa']);
  assert.deepEqual(LY_SPENDING.filter(s => s.cost).map(s => s.id), ['health', 'wtax']);
  for (const l of [...LY_LAYERS, ...LY_ACCOUNTS, ...LY_SPENDING]) assert.ok(l.name && l.what && !(l.name + l.what).includes(String.fromCharCode(0x2014)));
});

test('the game\'s copy is made from js/math/paylayers.js and is current (node tools/game_paylayers_build.mjs)', () => {
  const src = readFileSync(new URL('../js/math/paylayers.js', import.meta.url), 'utf8');
  const hash = createHash('sha256').update(src).digest('hex').slice(0, 16);
  assert.match(readFileSync(new URL('../game/core/paylayers.js', import.meta.url), 'utf8'), new RegExp(`SOURCE-HASH  ${hash}`), 'run node tools/game_paylayers_build.mjs, then the game steps (stamp, code map)');
  const html = readFileSync(new URL('../game/index.html', import.meta.url), 'utf8');
  assert.match(html, /<script src="core\/paylayers\.js\?v=[0-9a-f]+"><\/script>/);
  assert.ok(html.indexOf('src="core/withdraw.js') < html.indexOf('src="core/paylayers.js'), 'wayPay loads first');
  assert.ok(html.indexOf('src="core/paylayers.js') < html.indexOf('src="features/couldbe.js'));
});

test('the spending-shape default: bands from the dated reference data, in full, at half, and off', async () => {
  const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url), 'utf8'));
  const rp = ref.retirementPhases;
  assert.deepEqual(lyShapeBands(rp), [{ from: 75, f: 0.85 }, { from: 85, f: 0.75 }]);
  const half = lyShapeBands(rp, 0.5);
  near(half[0].f, 0.925); near(half[1].f, 0.875);
  assert.deepEqual(lyShapeBands(rp, 0), []); assert.deepEqual(lyShapeBands(null), []);
  assert.deepEqual(lyShapeBands({ goGo: 1, slowGo: 1, noGo: 0.9, slowGoAge: 75, noGoAge: 85 }), [{ from: 85, f: 0.9 }]);
  assert.match(rp.source, /BLS Consumer Expenditure Survey 2024/); assert.match(rp.source, /read Nov 6 2026/);
  // the game's copy carries the same reference rows
  const copy = readFileSync(new URL('../game/core/paylayers.js', import.meta.url), 'utf8');
  assert.ok(copy.includes('const LY_SHAPE_REF = ' + JSON.stringify(rp) + ';'), 'run node tools/game_paylayers_build.mjs');
  assert.ok(copy.includes('const LY_SS_REF = ' + JSON.stringify(ref.socialSecurity.trustFund) + ';'), 'run node tools/game_paylayers_build.mjs');
  // counting the default shape never raises the number
  const p = { age: 30, spend: 42000, save: 12000, grow: 0.07, draw: 0.04, bal: { tax: 0, pre: 60000, roth: 0, hsa: 0 } };
  const { lyNumbers } = await import('../js/math/paylayers.js');
  const a = lyNumbers(p, {}), b = lyNumbers(p, { shape: { bands: lyShapeBands(rp) } }), c = lyNumbers(p, { shape: { bands: half } });
  assert.ok(b.could.target < c.could.target && c.could.target < a.could.target);
  assert.ok(b.could.age <= c.could.age && c.could.age <= a.could.age);
});

test('one growth rate for the whole chart, and a separate withdrawal rate that sizes the numbers (the owner, 2026-11-27)', async () => {
  const { lyNumbers, lyYears, lyTarget } = await import('../js/math/paylayers.js');
  const p = { age: 30, spend: 40000, needsShare: 0.6, workPay: 60000, save: 12000, grow: 0.07, take: 0.04, bal: { tax: 0, pre: 0, roth: 100000, hsa: 0 }, saveTo: { roth: 1 } };
  const N = lyNumbers(p, {});
  near(N.is.target, 1000000); near(N.could.target, 1000000); near(lyTarget({ ...p, stop: N.is.age }, N.is.age), 1000000);
  // after work stops the pile still grows 7%: it pays the year and ends higher than it started
  const rows = lyYears({ ...p, stop: N.is.age }), at = rows.find(r => r.age === N.is.age), before = rows.find(r => r.age === N.is.age - 1);
  near(at.left, before.left * 1.07 - 40000, 0.01);
  assert.ok(rows.at(-1).left > at.left && rows.every(r => r.gap === 0));
  // a caller can still give a lower rate once drawing, and one that gives no take gets draw (the old form)
  const low = lyYears({ ...p, draw: 0.04, stop: N.is.age }).find(r => r.age === N.is.age);
  near(low.left, before.left * 1.04 - 40000, 0.01);
  near(lyNumbers({ ...p, take: undefined, draw: 0.04 }, {}).is.target, 1000000);
});

test('the lifetime spending total: today\'s spending for each year from today to 95, with a shape or without', () => {
  const L = lyLifetime({ age: 30, spend: 42000 });
  assert.deepEqual([L.years, L.from, L.to, L.year], [66, 30, LY_END, 42000]);
  near(L.total, 42000 * 66);
  // it is the needs and wants of the chart, added up: no health insurance, no tax
  const rows = lyYears(base({ stop: 50 }));
  near(lyLifetime(base({ stop: 50 })).total, rows.reduce((s, r) => s + r.needs + r.wants, 0));
  // with a shape the late years cost less: 45 years at 100%, 10 at 85%, 11 at 75%
  const S = lyLifetime({ age: 30, spend: 42000, shape: [{ from: 75, f: 0.85 }, { from: 85, f: 0.75 }] });
  near(S.total, 42000 * (45 + 10 * 0.85 + 11 * 0.75));
  assert.ok(S.total < L.total);
  const rows2 = lyYears(base({ stop: 50, shape: [{ from: 75, f: 0.85 }, { from: 85, f: 0.75 }] }));
  near(lyLifetime(base({ shape: [{ from: 75, f: 0.85 }, { from: 85, f: 0.75 }] })).total, rows2.reduce((s, r) => s + r.needs + r.wants, 0));
  // at the last age there is one year; no spending gives 0
  assert.equal(lyLifetime({ age: 95, spend: 1000 }).years, 1);
  assert.equal(lyLifetime({ age: 40, spend: null }).total, 0);
});

// Batch B, phase 2a: the tax on the way out. A made-up tax table for the tests: nothing on the first 16,000 of ordinary
// income, 10% on the next 12,000, 12% on the next 38,000, 22% above.
const stepTax = w => Math.max(0, Math.min(w, 28000) - 16000) * 0.1 + Math.max(0, Math.min(w, 66000) - 28000) * 0.12 + Math.max(0, w - 66000) * 0.22;
const mixed = (o = {}) => base({ age: 60, stop: 60, spend: 60000, save: 0, workPay: 0, bal: { tax: 400000, pre: 800000, roth: 300000, hsa: 0 }, saveTo: { tax: 4 / 15, pre: 8 / 15, roth: 3 / 15, hsa: 0 }, tax: stepTax, health: null, ss: null, ...o });
test('the tax plan in the year-by-year run: traditional first to the fill line, the rest of the line moves to Roth', () => {
  const plain = lyYears(mixed()), plan = lyYears(mixed({ plan: { fill: 16000 } }));
  // the plain order: taxable pays the first year, and nothing moves
  assert.ok(plain[0].tax > 0 && plain[0].pre === 0 && plain[0].conv === 0);
  // the plan: 16,000 of traditional money first (no tax on it), the rest from taxable; nothing is left of the line to move
  near(plan[0].pre, 16000); near(plan[0].wtax, 0); near(plan[0].tax, 60000 - 16000); near(plan[0].conv, 0); near(plan[0].ord, 16000);
  for (const r of plan) near(r.work + r.tax + r.pre + r.roth + r.hsa + r.ss + r.other + r.gap, r.line);
  // a year that needs less than the line: the rest of the line is moved, and it is not spending
  const small = lyYears(mixed({ spend: 10000, plan: { fill: 16000 } }));
  near(small[0].pre, 10000); near(small[0].conv, 6000); near(small[0].line, 10000); near(small[0].wtax, 0);
  // moving money loses none of it: the same total is left as in a run with no plan and no tax
  const flat = lyYears(mixed({ spend: 10000, tax: null }));
  near(small[0].left, flat[0].left);
  // a fill line above the 0% space: the moved money is taxed that year, and the tax is part of the year's cost
  const high = lyYears(mixed({ spend: 10000, plan: { fill: 28000 } }));
  assert.ok(high[0].ord <= 28000 + 0.01 && high[0].conv > 0 && high[0].wtax > 0);
  near(high[0].wtax, stepTax(high[0].ord));
  // the plan is for the years after work: a working year is the same with it and without it
  const w = lyYears(mixed({ age: 50, stop: 60, workPay: 90000, plan: { fill: 16000 } }))[0], w0 = lyYears(mixed({ age: 50, stop: 60, workPay: 90000 }))[0];
  assert.deepEqual(w, w0);
});
test('the target with a tax counted comes from the same run as the chart, and the tax plan lowers it', () => {
  // all traditional: every year the tax t solves t = tax(spending + t), and the target is the 25 times number of that
  const all = mixed({ bal: { tax: 0, pre: 1500000, roth: 0, hsa: 0 }, saveTo: { pre: 1 } });
  let t = 0; for (let i = 0; i < 80; i++) t = stepTax(60000 + t);
  near(lyTarget(all, 60), (60000 + t) / 0.04, 1);
  near(lyTarget({ ...all, tax: null }, 60), 1500000);
  // all traditional: there is nothing to move the tax with, so no line is a plan
  const lines = [{ id: 'std', fill: 16000 }, { id: 'b10', fill: 28000 }, { id: 'b12', fill: 66000 }];
  const P0 = lyTaxPlan(all, {}, lines);
  assert.equal(P0.ok, true); assert.equal(P0.best, null); assert.equal(P0.receipt.off, 0); assert.ok(P0.cost.off < 0, 'the tax raises the number');
  // a mix of accounts: the plan beats the plain order, and what it shows is what lyNumbers gives with it counted
  const M = mixed({ age: 40, stop: null, save: 30000, workPay: 90000, bal: { tax: 100000, pre: 250000, roth: 80000, hsa: 0 }, saveTo: { tax: 0.2, pre: 0.6, roth: 0.2, hsa: 0 }, ss: { year: 24000, age: 67 } });
  const P = lyTaxPlan(M, { ss: {} }, lines);
  assert.ok(P.best && lines.some(l => l.id === P.best.id));
  assert.ok(P.receipt.off > 0 || P.receipt.months > 0, 'the plan is a drop');
  assert.ok(P.with.could.target <= P.plain.could.target || P.with.could.age < P.plain.could.age);
  assert.deepEqual(lyNumbers(M, { ss: {}, wtax: {}, taxplan: { fill: P.best.fill } }).could, P.with.could);
  assert.deepEqual(lyNumbers(M, { ss: {}, wtax: {} }).could, P.plain.could);
  assert.equal(P.tried.length, 3);
  for (const x of P.tried) assert.ok(x.target >= P.best.target - 0.5);
  // the plan with no tax counted moves nothing; no tax table: no plan
  assert.deepEqual(lyNumbers(M, { ss: {}, taxplan: { fill: 16000 } }).could, lyNumbers(M, { ss: {} }).could);
  assert.equal(lyTaxPlan({ ...M, tax: null }, {}, lines).ok, false);
  // the shares on the day work stops add up to 1
  const S = lyShares(M, 55); near(S.tax + S.pre + S.roth + S.hsa, 1);
  assert.deepEqual(lyShares({ age: 30, bal: {}, save: 0, grow: 0.07 }, 50), { tax: 0, pre: 1, roth: 0, hsa: 0 });
});
test('the capital gains lines of the dated reference data are the lines of the lifetime plan, and the game copy carries the tax lines with their sources', async () => {
  const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url), 'utf8')), G = ref.tax.capitalGains;
  const { GAIN_BANDS } = await import('../js/math/lifetime.js');
  for (const k of ['single', 'joint', 'head']) assert.deepEqual(GAIN_BANDS[k], [G.zeroTo[k], G.fifteenTo[k]]);
  assert.equal(G.taxYear, 2026); assert.match(G.source, /Rev\. Proc\. 2025-32/); assert.equal(G.read, '2026-11-27');
  const copy = readFileSync(new URL('../game/core/paylayers.js', import.meta.url), 'utf8'), m = copy.match(/const LY_TAX_REF = (.*);\n/);
  const T = JSON.parse(m[1]);
  assert.deepEqual(T.standardDeduction, ref.tax.standardDeduction); assert.deepEqual(T.brackets, ref.tax.brackets); assert.deepEqual(T.zeroGainsTo, G.zeroTo);
  for (const k of Object.keys(T.sources)) assert.ok(T.sources[k].source && /^2026-\d\d-\d\d$/.test(T.sources[k].date), k);
});

// Batch B, phases 2b and 2c (Nov 27 2026)
test('a flexible way to take money out sizes What it could be at its own rate, only when that is above the standard rate', () => {
  const p = base({ take: 0.04, tax: null, health: null });
  const N = lyNumbers(p, { flex: { take: 0.05 } });
  assert.equal(N.counted, true); near(N.could.target, 42000 / 0.05, 0.5); assert.equal(N.is.target, 1050000);
  assert.ok(N.could.age < N.is.age, 'a smaller number is reached sooner');
  assert.equal(lyFlex(p, { flex: { take: 0.05 } }), 0.05);
  for (const take of [0.04, 0.035, null, NaN]) { assert.equal(lyFlex(p, { flex: { take } }), null); assert.equal(lyNumbers(p, { flex: { take } }).counted, false); }
  assert.equal(lyFlex(p, {}), null);
  // with Social Security counted too, the target is still below the one at the standard rate
  assert.ok(lyNumbers(p, { ss: {}, flex: { take: 0.05 } }).could.target < lyNumbers(p, { ss: {} }).could.target);
  assert.equal(lyCounted(p, { flex: { take: 0.05 } }).take, 0.05); assert.equal(lyCounted(p, {}).take, 0.04);
});
test('a payment that ends lowers the year from the age it ends, the needs first, and the number only when it is counted', () => {
  const ends = [{ year: 12000, from: 47 }], p = base({ take: 0.04, tax: null, health: null, ends, stop: 60 });
  assert.equal(lyEndsAt(p, 46), 0); assert.equal(lyEndsAt(p, 47), 12000); assert.equal(lyEndsAt({}, 50), 0);
  const rows = lyYears(p), at = a => rows.find(r => r.age === a);
  near(at(46).needs, 42000 * 0.75); near(at(47).needs, 42000 * 0.75 - 12000); near(at(47).wants, 42000 * 0.25);
  rows.forEach(sumsTo);
  // more than the needs: the rest comes off the wants, and the year never costs less than nothing
  const big = lyYears({ ...p, ends: [{ year: 40000, from: 47 }] }).find(r => r.age === 47);
  near(big.needs, 0); near(big.wants, 2000);
  near(lyYears({ ...p, ends: [{ year: 99000, from: 47 }] }).find(r => r.age === 47).line, 0);
  assert.equal(lyNumbers(p, {}).counted, false);
  const N = lyNumbers(p, { ends: {} });
  assert.equal(N.counted, true); assert.ok(N.could.target < N.is.target);
  // paid off before work stops: the whole of the free years costs 12,000 less, so the target is 25 times that lower
  near(lyTarget(lyCounted(p, { ends: {} }), 60), (42000 - 12000) / 0.04, 0.5);
  assert.deepEqual(lyCounted(p, {}).ends, []);
  assert.equal(lyNumbers(base({ take: 0.04, tax: null }), { ends: {} }).counted, false, 'nothing ends: nothing counted');
});
