// SPDX-License-Identifier: AGPL-3.0-only
// The canon rows finished in Part 21 (js/math/canonmath.js, M8X), each against a hand calculation with made-up numbers,
// and the web functions that now call them (yearsAtRate, simpleMath, payYourselfFirst's sums, outsourceCheck).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cmFyou, cmFooNine, CM_NINE, cmHandOff, cmNoodle, cmNoodleKeep, cmPayFirst, cmYearsAtRate, cmSimpleCurve, cmBalanceSheet, cmTabulate } from '../js/math/canonmath.js';
import { yearsAtRate, simpleMath } from '../js/math/simple.js';
import { outsourceCheck } from '../js/math/time.js';
import { ORDER } from '../js/registry/foo.js';
import { ORIGINAL } from '../js/math/foo.js';

const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} vs ${b}`);

test('F-You money: months you could walk away, by hand', () => {
  assert.equal(cmFyou({ reach: null, spending: 3000 }).ready, false);
  assert.equal(cmFyou({ reach: 9000, spending: null }).ready, false);
  // $12,000 reachable, $3,000 a month, $200 of work costs stop, $500 of health cover: 12,000 / 3,300 = 3.64 months
  const F = cmFyou({ reach: 12000, spending: 3000, workCosts: 200, health: 500, floor: 2000 });
  near(F.walk, 3300); near(F.months, 12000 / 3300); near(F.onFloor, 6);
  assert.equal(F.next, 6); near(F.toNext, 6 * 3300 - 12000);
  assert.deepEqual(F.marks.map(m => m.at), [true, false, false, false]);
  // a tap not given counts as nothing and is said
  const G = cmFyou({ reach: 6000, spending: 3000 });
  near(G.months, 2); assert.deepEqual(G.counted, { workCosts: false, health: false });
  // nothing goes out: no end
  assert.equal(cmFyou({ reach: 100, spending: 100, workCosts: 100 }).months, null);
});

test('the Money Guy nine: every SLAM step has a place, and the list is the one Plan › FOO shows', () => {
  assert.deepEqual(CM_NINE, ORIGINAL);
  for (const id of ORDER) assert.ok(cmFooNine(id).ready, id);
  const N = cmFooNine('4');
  assert.equal(N.n, 4); assert.equal(N.name, 'Emergency reserves');
  assert.deepEqual(N.rows.filter(r => r.done).map(r => r.n), [1, 2, 3]);
  assert.equal(cmFooNine('5b').extra, true);
  assert.equal(cmFooNine(null).ready, false);
});

test('the hand-off check, and the web outsource check uses it', () => {
  assert.equal(cmHandOff({ cost: 100, hoursSaved: 4 }).ready, false);
  const H = cmHandOff({ cost: 100, hoursSaved: 4, wage: 30 });
  near(H.worth, 120); near(H.gap, 20); near(H.perHour, 25); assert.equal(H.under, true); near(H.yearHours, 48);
  const O = outsourceCheck({ cost: 100, hoursSaved: 4 }, { value: 30 });
  near(O.value, 20); near(O.worth, 120); near(O.perHour, 25);
});

test('the noodle budget: the usual keeps, your own taps, and the months', () => {
  assert.ok(cmNoodleKeep('Rent') && cmNoodleKeep('Groceries') && cmNoodleKeep('Car insurance') && cmNoodleKeep('Food'));
  assert.ok(!cmNoodleKeep('Dining out') && !cmNoodleKeep('Fun and everything else') && !cmNoodleKeep('Streaming'));
  assert.equal(cmNoodle({ lines: [] }).ready, false);
  const N = cmNoodle({ lines: [{ k: 'Rent', amt: 1500 }, { k: 'Groceries', amt: 400 }, { k: 'Dining out', amt: 300 }, { k: 'Gym', amt: 50, keep: true }, { k: 'Phone', amt: 60, keep: false }], cash: 6000 });
  near(N.full, 2310); near(N.noodle, 1950); near(N.cut, 360); near(N.months, 6000 / 1950); near(N.monthsFull, 6000 / 2310);
  assert.equal(N.kept, 3);
});

test('pay yourself first: the sums, a part before the pay lands is not taken twice', () => {
  const P = cmPayFirst({ parts: [{ name: '401(k)', monthly: 500, pre: true }, { name: 'Trip goal', monthly: 200 }, { name: 'Nothing', monthly: 0 }], paysPerMonth: 26 / 12, takeHome: 4000, spending: 3500 });
  near(P.monthly, 700); near(P.perPaycheck, 700 / (26 / 12)); near(P.fromTake, 200); near(P.share, 0.05); near(P.left, 3800); near(P.room, 300);
  assert.equal(P.parts.length, 2);
});

test('Shockingly Simple Math: the shared loop gives the web the same years as before (from $0, monthly)', () => {
  // by hand at 0% return: s x n >= (1 - s) x 12 / wr; at 50% and 4%: n = 300 months, 25 years
  assert.equal(cmYearsAtRate(0.5, { realReturn: 0, withdrawalRate: 0.04 }), 25);
  assert.equal(yearsAtRate(0.5, { realReturn: 0.05, withdrawalRate: 0.04 }), cmYearsAtRate(0.5, { realReturn: 0.05, withdrawalRate: 0.04, maxMonths: 840 }));
  assert.equal(cmYearsAtRate(0, { realReturn: 0.05, withdrawalRate: 0.04 }), null);
  assert.equal(cmYearsAtRate(1, { realReturn: 0.05, withdrawalRate: 0.04 }), 0);
  const S = cmSimpleCurve({ savingsRate: 0.23, realReturn: 0.05, withdrawalRate: 0.04 });
  assert.equal(S.curve.length, 19); near(S.next.rate, 0.25); assert.ok(S.gain > 0);
  const M = simpleMath({ savingsRate: 0.23, realReturn: 0.05, withdrawalRate: 0.04 });
  assert.deepEqual(M.curve, S.curve); assert.equal(M.gain, S.gain);
});

test('YMOYL step 1b: the balance sheet adds what you own and owe, a blank line is left out', () => {
  assert.equal(cmBalanceSheet({}).ready, false);
  const B = cmBalanceSheet({ owns: [{ k: 'Checking', v: 2000, g: 'cash' }, { k: 'Savings', v: 3000, g: 'cash' }, { k: 'Roth', v: 10000, g: 'invest' }, { k: 'Car', v: null, g: 'car' }], owes: [{ k: 'Card', v: 4000 }] });
  near(B.own, 15000); near(B.owe, 4000); near(B.net, 11000);
  assert.deepEqual(B.groups.map(g => [g.g, g.v]), [['cash', 5000], ['invest', 10000]]);
});

test('YMOYL step 3: each month in hours of life, a month with nothing logged left out', () => {
  const T = cmTabulate([
    { d: '2026-10-03', amt: 4000, kind: 'in' }, { d: '2026-10-05', amt: 1500, cat: 'Home', kind: 'out' }, { d: '2026-10-09', amt: 500, cat: 'Food', kind: 'out' },
    { d: '2026-12-01', amt: 100, cat: 'Food', kind: 'out' }, { d: '2026-12-02', amt: 50, kind: 'out' }, { d: 'x', amt: 'no', kind: 'out' }], 25);
  assert.deepEqual(T.months.map(m => m.m), ['2026-10', '2026-12']);
  const O = T.months[0];
  near(O.out, 2000); near(O.kept, 2000); near(O.hoursOut, 80); near(O.cats[0].hours, 60); near(O.cats[0].share, 0.75);
  assert.equal(T.last.cats.find(c => c.cat === 'Not sorted').amt, 50);
  assert.equal(cmTabulate([{ d: '2026-10-01', amt: 10, cat: 'A', kind: 'out' }], null).months[0].cats[0].hours, null);
});

test('the game copy is current', () => {
  const r = spawnSync(process.execPath, ['tools/game_canonmath_build.mjs', '--check'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
