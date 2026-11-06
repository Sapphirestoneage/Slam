// Batch 23: Can I afford it? (M83, js/math/afford.js) on Maya, Tom and the deficit persona, and Your Shockingly
// Simple Math (M72, js/math/simple.js) against a hand calculation for Maya.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importFile } from '../js/records.js';
import { metrics } from '../js/math/metrics.js';
import { foo } from '../js/math/foo.js';
import { affordOf, affordDoc, askOf } from '../js/math/afford.js';
import { simpleTable, simpleWaterfall, yearsAtRate } from '../js/math/simple.js';
import { freedFlow } from '../js/math/flow.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00.000Z'); // the personas' moment (tools/personas/build.mjs)
const load = id => importFile(readFileSync(new URL(`../fixtures/personas/${id}.json`, import.meta.url), 'utf8'));
const VERDICT = /\b(can't|cannot afford|too much|risky|at risk|danger|bad|good idea|strong|weak|fail)\b/i;

test('Maya: a $2,000 trip in March is $500 a month from now, the tightest day, heavy debt a month later, FI a month later', () => {
  const r = affordOf(load('maya'), ref, { kind: 'once', amount: 2000, ym: '2027-03', name: 'A trip' }, { now });
  assert.equal(r.needs.length, 0);
  assert.equal(r.sinking.monthly, 500); // $2,000 over Nov, Dec, Jan, Feb
  assert.equal(r.calendar.date, '2027-03-08'); // the tightest day in March, with the trip on the 1st
  assert.equal(Math.round(r.calendar.value), 3350);
  assert.equal(r.calendar.above, true);
  assert.equal(r.foo.step, '3');
  assert.equal(r.foo.before, '2027-03');
  assert.equal(r.foo.after, '2027-04');
  assert.match(r.line, /Heavy Debt done Apr 2027 instead of Mar 2027/);
  assert.equal(r.fi.moved, 1);
  assert.match(r.from, /\$500 a month of the \$1,500 that goes to Heavy Debt/);
  assert.match(r.layers, /big e and little e are not touched/);
  assert.equal(r.numbers.length, 3);
  assert.doesNotMatch(`${r.line} ${r.from} ${r.layers}`, VERDICT);
});

test('Maya: Make it a goal adds the same thing the answer ran, so Goals shows the same FI date afterwards', () => {
  const doc = load('maya');
  const r = affordOf(doc, ref, { kind: 'once', amount: 2000, ym: '2027-03', name: 'A trip' }, { now });
  const copy = affordDoc(doc, ref, { kind: 'once', amount: 2000, ym: '2027-03', name: 'A trip' }, { now });
  const ev = copy.records.find(x => x.kind === 'event');
  assert.deepEqual({ amount: ev.amount, month: ev.values.month, sinking: ev.values.sinking }, { amount: 2000, month: '2027-03', sinking: true });
  assert.equal(metrics(copy, ref, { now }).monthsToFi.value, r.fi.after);
  assert.equal(doc.records.some(x => x.kind === 'event' && x.name === 'A trip'), false, 'the file itself is never changed');
});

test('Maya: a big goal saved faster than the free money allows says the date it is paid for at the free money', () => {
  const r = affordOf(load('maya'), ref, { kind: 'goal', amount: 30000, ym: '2027-11', name: 'A wedding' }, { now });
  assert.equal(r.sinking.monthly, 2500);
  assert.equal(r.over, 1000);
  assert.equal(r.fullAt, '2028-07'); // $30,000 / $1,500 = 20 months from Nov 2026
  assert.equal(r.waits, true);
  assert.equal(r.numbers[1].show, 'Waits for the gap');
});

test('Tom: a $400 a month car payment moves the FI date (for good, and for 5 years)', () => {
  const doc = load('tom');
  const good = affordOf(doc, ref, { kind: 'monthly', amount: 400, ym: '2026-11', name: 'A car payment' }, { now });
  assert.equal(good.free.before - good.free.after, 400);
  assert.ok(good.fi.moved > 0, 'FI later');
  assert.equal(good.fi.moved, 12);
  assert.match(good.line, /The FI date moves 12 months later/);
  const five = affordOf(doc, ref, { kind: 'monthly', amount: 400, ym: '2026-11', years: 5, name: 'A car payment' }, { now });
  assert.ok(five.fi.moved > 0 && five.fi.moved < good.fi.moved, 'a payment that ends moves it less');
  assert.equal(good.foo.step, '4');
  assert.equal(good.calendar != null, true);
  assert.match(good.layers, /not touched/);
});

test('Tom: a car payment from a later month leaves today the same and still moves the FI date', () => {
  const r = affordOf(load('tom'), ref, { kind: 'monthly', amount: 400, ym: '2027-02', name: 'A car payment' }, { now });
  assert.match(r.line, /^From Feb 2027, \$400 a month/);
  assert.ok(r.fi.moved > 0);
});

test('The deficit persona: a calm answer that points to the gap', () => {
  const r = affordOf(load('deficit'), ref, { kind: 'once', amount: 2000, ym: '2027-03', name: 'A trip' }, { now });
  assert.equal(r.gap, 400);
  assert.match(r.line, /Your month is \$400 short today/);
  assert.match(r.line, /Closing the gap comes first/);
  assert.equal(r.numbers[0].label, 'Your month is short by');
  assert.match(r.from, /\$50 of Buffer/);
  assert.doesNotMatch(`${r.line} ${r.from} ${r.layers}`, VERDICT);
});

test('Can I afford it? asks for what it needs, in words', () => {
  const r = affordOf(load('maya'), ref, { kind: 'once', amount: null, ym: null }, { now });
  assert.deepEqual(r.needs, ['an amount', 'a month']);
  assert.equal(askOf({ kind: 'monthly', amount: 100 }, now).ym, '2026-11', 'a monthly cost starts this month');
  assert.equal(askOf({ kind: 'once', amount: 100, ym: '2026-01' }, now).ym, null, 'a month gone by is not an answer');
});

test('A sinking fund stops at its month: the surplus has the money back, and big e fills at that pace', () => {
  const doc = load('maya');
  const copy = affordDoc(doc, ref, { kind: 'once', amount: 2000, ym: '2027-03', name: 'A trip' }, { now });
  const m = metrics(copy, ref, { now });
  const end = m.inputs.changes.find(c => c.kind === 'sinkingEnd');
  assert.deepEqual({ at: end.at, surplus: end.surplus, ym: end.ym }, { at: 4, surplus: 500, ym: '2027-03' });
  // freedFlow with a change: $1,000 a month, then $1,500 from month 2: $5,000 of big e takes 4 months, not 5.
  assert.equal(freedFlow({ surplus: 1000, heavyMonths: 0, bigELeft: 5000 }).bigEMonths, 5);
  assert.equal(freedFlow({ surplus: 1000, heavyMonths: 0, bigELeft: 5000, changes: [{ at: 2, monthly: 500 }] }).bigEMonths, 4);
  assert.equal(foo(copy, ref, { now }).steps.find(s => s.id === '3').date, '2027-04');
});

test('Simple Math: Maya\'s row matches a hand calculation', () => {
  const m = metrics(load('maya'), ref, { now });
  const s = m.savingsRate.value; // $1,500 / $5,200
  assert.ok(Math.abs(s - 1500 / 5200) < 1e-9);
  // From $0, investing s of take-home a month at 7% a year (monthly growth g) until it reaches (1 - s) x 12 / 4%:
  // n = ln(1 + 300 (1 - s)(g - 1) / s) / ln g, rounded up to a whole month.
  const g = 1.07 ** (1 / 12);
  const n = Math.ceil(Math.log(1 + (12 / 0.04) * (1 - s) * (g - 1) / s) / Math.log(g) - 1e-9);
  assert.equal(n, 292);
  const t = simpleTable({ savingsRate: s, realReturn: 0.07, withdrawalRate: 0.04 });
  assert.equal(t.you.rate, s);
  assert.equal(t.you.years, n / 12);
  assert.equal(t.rows.filter(r => r.you).length, 1);
  assert.equal(t.rows.length, 10, 'nine rates and yours');
  // The original table (5%, 4%): 50% saved is about 16.6 years in Mr. Money Mustache's post; monthly steps give 16.4.
  assert.ok(Math.abs(t.rows.find(r => r.rate === 0.5).original - 16.5) < 0.2);
  assert.equal(yearsAtRate(0.5, { realReturn: 0.05, withdrawalRate: 0.04 }), t.rows.find(r => r.rate === 0.5).original);
});

test('Simple Math: the assumption waterfall runs from the original table to Maya\'s own FI date', () => {
  const m = metrics(load('maya'), ref, { now });
  const w = simpleWaterfall(m, { now });
  assert.deepEqual(w.steps.map(s => s.key), ['original', 'return', 'withdrawal', 'invested', 'plan']);
  assert.equal(w.steps[1].years, 292 / 12);
  assert.ok(w.steps[1].change < 0, 'a 7% return is sooner than 5%');
  assert.equal(w.steps[2].change, 0, 'her withdrawal rate is the original 4%');
  assert.ok(w.steps[3].change < 0, 'starting from $15,000 is sooner than from $0');
  assert.equal(w.steps.at(-1).years, m.monthsToFi.value / 12, 'the last line is the FI date on Goals');
  for (let i = 1; i < w.steps.length; i++) assert.ok(Math.abs(w.steps[i].years - w.steps[i - 1].years - w.steps[i].change) < 1e-9);
});

test('Simple Math: a deficit has no row of its own and the waterfall asks for a savings rate above zero', () => {
  const m = metrics(load('deficit'), ref, { now });
  const t = simpleTable({ savingsRate: m.savingsRate.value, realReturn: m.inputs.realReturn, withdrawalRate: m.inputs.withdrawalRate });
  assert.equal(t.you, null);
  assert.equal(simpleWaterfall(m, { now }).needs[0], 'a savings rate above zero');
});
