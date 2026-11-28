// SPDX-License-Identifier: AGPL-3.0-only
// The math checks of the publish (run CC-1, item A3). One named check for each rule on the owner's list:
//   1 FI number   2 Coast FI   3 Quiet Quitting FI   4 Rule of 5 (age / 5 months)
//   5 little e (the smaller of $1,000 and the highest deductible)
//   6 the order of debts: Avalanche, Snowball, Return on Hassle   7 the 8% heavy-debt rule   8 the 7/4/2 defaults
// Each check calls the function the app itself uses (js/math, js/registry) and compares it with a number worked out
// by hand here. Where the second engine (tools/audit/engine2.py, Python) has the rule, the same case goes through it
// too. This file runs with `node --test`, on every push (.github/workflows/test.yml), and tools/promote.sh does not
// publish to /game/ when it does not pass. It needs Node.js only; the second-engine part also needs python3.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fiNumber, coastFi } from '../js/math/fi.js';
import { quietQuittingFi, coastFiNumber } from '../js/math/foo.js';
import { ruleOf5 } from '../js/math/assets.js';
import { littleE, LITTLE_E } from '../js/math/layers.js';
import { payoffPlan, isHeavyDebt, hasslePerDollar } from '../js/math/debt.js';
import { RULES, bigEMonthsOf } from '../js/registry/assumptions.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const ref = JSON.parse(readFileSync(join(root, 'data', 'reference-2026.json'), 'utf8'));
const near = (got, want, what, tol = 0.01) => assert.ok(Math.abs(got - want) <= tol, `${what}: got ${got}, want ${want}`);
const NOW = new Date(2026, 10, 27);

// The second engine works the same cases out again. One run of Python for all of them.
const python = spawnSync('python3', ['--version']).status === 0;
const DEBTS = [
  { name: 'Card', balance: 4000, apr: 0.24, payment: 120 },
  { name: 'Car', balance: 9000, apr: 0.07, payment: 250 },
  { name: 'Store card', balance: 600, apr: 0.18, payment: 40 },
];
const plan = (order, extra = 200) => payoffPlan(DEBTS, { order, extra, now: NOW });
const each = p => Object.fromEntries(p.debts.map(d => [d.name, d.paidOffMonth]));
function secondEngine() {
  const cases = [];
  const add = (fn, input, output) => cases.push({ fn, input, output });
  for (const x of [{ annualSpending: 60000, withdrawalRate: 0.04 }, { annualSpending: 48000, withdrawalRate: 0.035 }])
    add('fiNumber', x, { fi: fiNumber(x).value });
  for (const x of [{ fiNumber: 1500000, realReturn: 0.07, age: 30, retireAge: 60 }, { fiNumber: 900000, realReturn: 0.06, age: 52, retireAge: 65 }])
    add('coastFi', x, { coast: coastFi(x).value });
  for (const order of ['avalanche', 'snowball']) {
    const p = plan(order);
    add('debtPlan', { debts: DEBTS, extra: 200, order }, { months: p.months, interest: p.interest, each: each(p) });
  }
  const dir = mkdtempSync(join(tmpdir(), 'slam-mathchecks-'));
  try {
    writeFileSync(join(dir, 'cases.json'), JSON.stringify({ seed: 0, cases }));
    const r = spawnSync('python3', [join(root, 'tools', 'audit', 'engine2.py'), join(dir, 'cases.json'), join(root, 'data', 'reference-2026.json'), join(dir, 'report.json')], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    return JSON.parse(readFileSync(join(dir, 'report.json'), 'utf8')).byFunction;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
let second = null;
const agrees = (fn, cases) => {
  second = second || secondEngine();
  const v = second[fn];
  assert.ok(v && v.cases === cases && v.checks >= cases, `the second engine did not work out ${fn}`);
  assert.equal(v.off, 0, `the second engine differs on ${fn}: ${JSON.stringify(v.example)}`);
};
const skip2 = python ? false : 'python3 is not installed';

test('math check 1, FI number: a year of spending divided by the withdrawal rate', () => {
  near(fiNumber({ annualSpending: 60000, withdrawalRate: 0.04 }).value, 1500000, '$60,000 at 4%');
  near(fiNumber({ annualSpending: 48000, withdrawalRate: 0.035 }).value, 48000 / 0.035, '$48,000 at 3.5%');
  const blank = fiNumber({ annualSpending: null, withdrawalRate: 0.04 });
  assert.equal(blank.value, null, 'no spending gives no number, not zero');
});
test('math check 1, FI number: the second engine agrees', { skip: skip2 }, () => agrees('fiNumber', 2));

test('math check 2, Coast FI: the FI number divided by one year of growth for each year to the FI age', () => {
  near(coastFi({ fiNumber: 1500000, realReturn: 0.07, age: 30, retireAge: 60 }).value, 1500000 / 1.07 ** 30, 'age 30 to 60 at 7%');
  near(coastFi({ fiNumber: 1500000, realReturn: 0.07, age: 30, retireAge: 60 }).value, 197050.68, 'the same, as a figure worked out apart from the code', 0.01);
  near(coastFi({ fiNumber: 900000, realReturn: 0.06, age: 65, retireAge: 65 }).value, 900000, 'at the FI age, Coast FI is the FI number');
  // The order of operations has its own Coast FI helper: one answer, two doors.
  near(coastFiNumber({ fiNumber: 1500000, realReturn: 0.07, age: 30, fiAge: 60 }), coastFi({ fiNumber: 1500000, realReturn: 0.07, age: 30, retireAge: 60 }).value, 'the two Coast FI functions');
});
test('math check 2, Coast FI: the second engine agrees', { skip: skip2 }, () => agrees('coastFi', 2));

test('math check 3, Quiet Quitting FI: invested today, after which the yearly minimum alone reaches FI (M70)', () => {
  const x = { fiNumber: 1500000, realReturn: 0.07, age: 30, fiAge: 60, yearlyMinimum: 7500 };
  const g = 1.07 ** 30, byHand = (1500000 - 7500 * (g - 1) / 0.07) / g;
  near(quietQuittingFi(x).value, byHand, 'age 30 to 60, $7,500 a year');
  near(quietQuittingFi(x).value, 103982.87, 'the same, as a figure worked out apart from the code', 0.01);
  // Proof by growing it: that amount today, plus the minimum at the end of each year, lands on the FI number.
  let pile = quietQuittingFi(x).value;
  for (let y = 0; y < 30; y++) pile = pile * 1.07 + 7500;
  near(pile, 1500000, 'grown for 30 years', 0.01);
  assert.ok(quietQuittingFi(x).value < coastFi({ fiNumber: 1500000, realReturn: 0.07, age: 30, retireAge: 60 }).value, 'Quiet Quitting FI comes before Coast FI');
  assert.equal(quietQuittingFi({ ...x, yearlyMinimum: 1e9 }).value, 0, 'never under zero');
  assert.equal(quietQuittingFi({ ...x, age: null }).value, null, 'no age gives no number');
});
// Not built: the second engine has no Quiet Quitting FI, so this number has one engine and the proof by growth above.
test.todo('math check 3, Quiet Quitting FI: the second engine (tools/audit/engine2.py has no Quiet Quitting FI yet, QUESTIONS 661 a)');

test('math check 4, Rule of 5: age divided by 5 is the months of spending to hold', () => {
  assert.equal(ruleOf5({ age: 30, spending: 4000 }).months, 6);
  near(ruleOf5({ age: 30, spending: 4000 }).value, 24000, 'age 30, $4,000 a month');
  assert.equal(ruleOf5({ age: 47, spending: 5000 }).months, 9.4);
  near(ruleOf5({ age: 47, spending: 5000 }).value, 47000, 'age 47, $5,000 a month');
  assert.equal(bigEMonthsOf(60), 12, 'the one definition behind it');
  assert.equal(ruleOf5({ age: null, spending: 4000 }).value, null, 'no age gives no number');
  // The game holds the same rule in its own engine (classic scripts, so it is read as text here).
  assert.match(readFileSync(join(root, 'game', 'core', 'engine.js'), 'utf8'), /d\.target = Math\.max\(1, c\.age \/ 5\);/, 'the game: months = age / 5');
});

test('math check 5, little e: the smaller of $1,000 and the highest deductible', () => {
  assert.equal(RULES.littleE, 1000);
  assert.equal(LITTLE_E, 1000);
  assert.equal(littleE([500, 2000]).target, 1000, 'highest deductible $2,000: little e is $1,000');
  assert.equal(littleE([250, 500]).target, 500, 'highest deductible $500: little e is $500');
  assert.equal(littleE([1000]).target, 1000);
  assert.equal(littleE([500, 2000]).deductible, 2000, 'the highest one is the one that counts');
  const none = littleE([]);
  assert.equal(none.target, 1000);
  assert.equal(none.guess, true, 'with no deductible it is $1,000 and marked a Guess');
  assert.equal(littleE([null, 0, 750]).target, 750, 'a blank or a zero is not a deductible');
});

test('math check 6, the order of debts: Avalanche is the highest rate first, Snowball the smallest balance first', () => {
  assert.deepEqual(plan('avalanche').debts.map(d => d.name), ['Card', 'Store card', 'Car']);
  assert.deepEqual(plan('snowball').debts.map(d => d.name), ['Store card', 'Card', 'Car']);
  const a = plan('avalanche'), s = plan('snowball');
  assert.ok(a.months != null && s.months != null);
  assert.ok(a.interest <= s.interest + 0.005, 'Avalanche never costs more interest than Snowball');
  assert.ok(each(s)['Store card'] <= each(a)['Store card'], 'Snowball clears the smallest debt no later');
});
test('math check 6, the order of debts: the second engine agrees on Avalanche and Snowball', { skip: skip2 }, () => agrees('debtPlan', 2));
test('math check 6, the order of debts: Return on Hassle is the hassle score for each dollar owed, highest first', () => {
  const debts = [
    { name: 'Big loan', balance: 9000, apr: 0.07, payment: 250, hassle: 9 }, // 0.001 a dollar
    { name: 'Not scored', balance: 300, apr: 0.29, payment: 30 },
    { name: 'Old store card', balance: 500, apr: 0.18, payment: 40, hassle: 5 }, // 0.01 a dollar
    { name: 'Tie, lower rate', balance: 1000, apr: 0.1, payment: 50, hassle: 10 }, // 0.01 a dollar
  ];
  near(hasslePerDollar(debts[2]), 0.01, 'hassle 5 on $500', 1e-12);
  assert.equal(hasslePerDollar(debts[1]), -1, 'a debt with no score goes last');
  assert.deepEqual(payoffPlan(debts, { order: 'hassle', extra: 100, now: NOW }).debts.map(d => d.name), ['Old store card', 'Tie, lower rate', 'Big loan', 'Not scored']);
});

test('math check 7, the 8% heavy-debt rule: any debt at 8% or more is heavy', () => {
  assert.equal(RULES.heavyApr, 0.08);
  const loan = apr => ({ type: 'Car loan', balance: 5000, apr });
  assert.equal(isHeavyDebt(loan(0.08)), true, 'exactly 8% is heavy');
  assert.equal(isHeavyDebt(loan(0.0799)), false, 'under 8% is not');
  assert.equal(isHeavyDebt(loan(0.12)), true);
  assert.equal(isHeavyDebt({ ...loan(0.12), balance: 0 }), false, 'a paid debt is not heavy');
  assert.equal(isHeavyDebt({ ...loan(0.12), forgiven: true }), false, 'a debt on a forgiveness plan is not heavy');
  assert.equal(isHeavyDebt({ type: 'Credit card', balance: 100, apr: 0.02 }), true, 'a card balance is heavy at any rate');
});

test('math check 8, the 7/4/2 defaults: 7% return after inflation, 4% withdrawal rate, 2% inflation', () => {
  assert.equal(ref.presets.realReturn.default, 0.07);
  assert.equal(ref.presets.withdrawalRate.default, 0.04);
  assert.equal(ref.presets.inflation.default, 0.02);
  assert.equal(ref.presets.pace.Likely, 0.07, 'the Likely pace is the default return');
  for (const k of ['realReturn', 'withdrawalRate', 'inflation']) assert.ok(ref.presets[k].values.includes(ref.presets[k].default), `${k}: the default is one of the choices`);
  // The game has the first two in its own engine. It works in dollars of today, so it holds no inflation rate.
  const game = readFileSync(join(root, 'game', 'core', 'engine.js'), 'utf8');
  assert.match(game, /const R = 0\.07,\s+SWR = 0\.04,/, 'the game: R = 0.07 and SWR = 0.04');
});
