// SPDX-License-Identifier: AGPL-3.0-only
// What it is / What it could be (run A, Nov 27 2026): the two numbers and the year-by-year run of the layer chart
// (js/math/paylayers.js), and the game's copy of it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { LY_END, LY_LAYERS, LY_ACCOUNTS, LY_SPENDING, lyShapeAt, lyYears, lyBars, lyNeedsAge, lyLayerSum, lyCoverage, lyTarget, lyPile, lyCounted, lyNumbers, lyReceipt } from '../js/math/paylayers.js';

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
