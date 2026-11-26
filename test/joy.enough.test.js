// Joy and enough (run Finish everything partly built, Part 8): joy per dollar, the fulfillment curve and the Enough
// meter, the rich-life list, every subscription in days. The one engine (js/math/enough.js), the coach app's reading of
// the household (js/enough.js) and the FI date to a fraction of a month (js/math/fi.js). Made-up households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { enJoy, enCurve, enRich, enSubs, enDays, enJoyOk, enEnough, EN_RULES, EN_JOY, EN_CURVE } from '../js/math/enough.js';
import { Store } from '../js/records.js';
import { householdFromInputs } from '../js/demo.js';
import { metrics } from '../js/math/metrics.js';
import { fiDate, fiMoveOf } from '../js/math/fi.js';
import { joyOf, curveOf, richOf, subsOf, spendLinesOf } from '../js/enough.js';
import { rateCategoryJoy } from '../js/capture.js';

const root = new URL('..', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const ref = JSON.parse(read('data/reference-2026.json'));
const NOW = new Date('2026-11-26T12:00:00Z');
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} is not ${b}`);
const fresh = () => { const s = new Store(householdFromInputs(JSON.parse(read('fixtures/demo.json')).inputs, { now: NOW.toISOString() })); s.now = () => NOW.toISOString(); return s; };

test('enJoy: share of joy, joy per $100, hours of work and joy per hour; a line with no tap is left out, never 0', () => {
  const J = enJoy([{ name: 'Concerts', amt: 100, joy: 5 }, { name: 'Rent', amt: 1500, joy: 2 }, { name: 'Gym', amt: 40, joy: null }, { name: 'Gone', amt: 0, joy: 5 }], { wage: 25 });
  assert.equal(J.ready, true);
  assert.deepEqual([J.of, J.rated, J.total, J.ratedTotal, J.points], [3, 2, 1640, 1600, 7]);
  const c = J.rows.find(r => r.name === 'Concerts'), g = J.rows.find(r => r.name === 'Gym');
  near(c.joyShare, 5 / 7); near(c.per100, 5); near(c.hours, 4); near(c.perHour, 1.25); near(c.even, (5 / 7) / (100 / 1600));
  assert.equal(g.joyShare, null); assert.equal(g.per100, null); near(g.hours, 1.6);
  near(J.dollarJoy, (5 * 100 + 2 * 1500) / 1600);
  near(J.lovedShare, 100 / 1600); assert.equal(J.lovedTotal, 100);
  assert.equal(J.most.name, 'Concerts'); assert.equal(J.least.name, 'Rent');
  assert.equal(J.rows[J.rows.length - 1].name, 'Gym', 'the untapped line comes last');
  // no wage: no hours, never a made-up wage
  assert.equal(enJoy([{ name: 'A', amt: 10, joy: 3 }]).rows[0].hours, null);
  // nothing tapped: not ready, and says what it needs
  const N = enJoy([{ name: 'A', amt: 10 }]);
  assert.equal(N.ready, false); assert.match(N.need, /joy tap/);
  assert.equal(enJoyOk(0), false); assert.equal(enJoyOk(6), false); assert.equal(enJoyOk(2.5), false); assert.equal(enJoyOk(5), true);
  assert.deepEqual(EN_JOY.map(j => j[0]), [1, 2, 3, 4, 5]);
});

test('enCurve: each category on the curve, the Enough meter, and the share of today\'s life it calls enough', () => {
  const cats = [{ cat: 'Rent', amt: 1500 }, { cat: 'Food', amt: 500 }, { cat: 'Streaming', amt: 60 }, { cat: 'Gadgets', amt: 240 }, { cat: 'Other', amt: 200 }];
  assert.equal(enCurve(cats, {}).ready, false);
  const K = enCurve(cats, { Rent: 'survival', Food: 'comforts', Streaming: 'luxuries', Gadgets: 'past', Other: 'not a step' });
  assert.equal(K.ready, true);
  assert.deepEqual([K.of, K.placed, K.all, K.total, K.placedTotal, K.past, K.up], [5, 4, false, 2500, 2300, 240, 2060]);
  assert.deepEqual(K.levels.map(l => l.amt), [1500, 500, 60, 240]);
  assert.deepEqual(K.levels.map(l => l.id), EN_CURVE.map(c => c[0]));
  near(K.meter, 2060 / 2300);
  assert.equal(K.top, 'past');
  assert.equal(K.share, Math.round((1 - 240 / 2500) * 100) / 100);
  // the curve's share is the share enEnough reads
  assert.equal(enEnough({ fi: 1000000, share: K.share }).value, 1000000 * K.share);
  // nothing past enough: the meter is full and the curve calls today's life enough
  const F = enCurve(cats, { Rent: 'survival', Food: 'comforts' });
  assert.deepEqual([F.meter, F.share, F.top], [1, 1, 'comforts']);
});

test('enRich: joy per $100, memory dividends of an experience, the same 10 years later, the regret view, the FI days', () => {
  const items = [
    { id: 'a', name: 'Chair', price: 600, joy: 4, kind: 'thing', regret: 'little' },
    { id: 'b', name: 'Japan', price: 5000, joy: 5, kind: 'experience', regret: 'alot' },
    { id: 'c', name: 'Class', price: 300, joy: 3, kind: 'experience', regret: 'alot', done: true },
    { id: 'd', name: 'Boat', price: null, joy: 2, kind: 'thing', regret: 'no' },
    { id: 'e', name: '', price: null }];
  const R = enRich(items, { age: 34, lifeTo: 90, days: p => p / 50 });
  assert.equal(R.count, 4, 'a row with no name and no price is left out');
  const b = R.items.find(i => i.id === 'b'), a = R.items.find(i => i.id === 'a'), c = R.items.find(i => i.id === 'c');
  near(b.per100, 0.1); assert.deepEqual([b.memYears, b.dividend, b.laterYears, b.days], [56, 280, 56 - EN_RULES.later, 100]);
  assert.deepEqual([a.memYears, a.dividend], [null, null], 'a thing has no memory dividends');
  assert.equal(c.days, null, 'done: nothing left to pay');
  assert.deepEqual(R.regret.map(i => i.id), ['b', 'c', 'a', 'd']);
  assert.deepEqual([R.planned, R.plannedTotal, R.done, R.doneTotal, R.alot, R.alotTotal, R.alotDays, R.noPrice], [3, 5600, 1, 300, 1, 5000, 100, 1]);
  const N = enRich(items, {});
  assert.equal(N.items.find(i => i.id === 'b').memYears, null, 'no age: no dividends, never a guessed age');
});

test('enSubs: every subscription as days on the FI date, each by its share; no FI date, no days', () => {
  const S = enSubs([{ name: 'Music', amt: 12 }, { name: 'Video', amt: 18 }, { name: 'Free', amt: 0 }], 45, { wage: 30 });
  assert.equal(S.ready, true);
  assert.deepEqual([S.of, S.total, S.year, S.days], [2, 30, 360, 45]);
  assert.deepEqual(S.rows.map(r => [r.name, r.days, r.year]), [['Video', 27, 216], ['Music', 18, 144]]);
  near(S.rows[0].hoursYear, 216 / 30); near(S.hoursYear, 12);
  const N = enSubs([{ name: 'Music', amt: 12 }], null);
  assert.equal(N.ready, false); assert.match(N.need, /FI date/); assert.equal(N.rows[0].days, null);
  assert.equal(enSubs([], 10).ready, false);
  near(enDays(120, 118.5), 1.5 * EN_RULES.daysMonth); assert.equal(enDays(null, 3), null);
});

test('fiDate: the same date as a fraction of a month; fiMoveOf: days to the fraction, and a change to the FI number', () => {
  const r = fiDate({ invested: 100000, monthlyInvesting: 2000, realReturn: 0.05, target: 300000 }, { from: NOW });
  assert.ok(r.fine > r.value - 1 && r.fine <= r.value, `${r.fine} sits in the last month (${r.value})`);
  assert.equal(fiDate({ invested: 400000, monthlyInvesting: 0, realReturn: 0.05, target: 300000 }).fine, 0);
  const s = fresh(), m = metrics(s.doc, ref, { now: NOW });
  const small = fiMoveOf(m, { changes: [{ at: 0, monthly: 15 }] }, { from: NOW });
  assert.ok(small.fineDays < 0, 'a little more invested comes a little sooner, in days');
  const smaller = fiMoveOf(m, { changes: [{ at: 0, monthly: 15 }], fi: -15 * 12 / m.inputs.withdrawalRate }, { from: NOW });
  assert.ok(smaller.fineDays < small.fineDays, 'a smaller FI number too: sooner still');
  assert.equal(fiMoveOf(m, {}, { from: NOW }).fineDays, 0);
});

test('the coach app: joy from a line\'s tap or its category, the curve, the rich-life list and the subscriptions on the plan\'s own FI date', () => {
  const s = fresh();
  const music = s.add('bill', { name: 'Music', amount: 12, per: 'month', values: { draftt: 'Bills', category: 'Music' } });
  const video = s.add('bill', { name: 'Video', amount: 18, per: 'month', values: { draftt: 'Bills', category: 'Streaming' } });
  const food = s.add('bill', { name: 'Groceries', amount: 450, per: 'month', values: { draftt: 'Food', category: 'Groceries' } });
  let m = metrics(s.doc, ref, { now: NOW });
  assert.equal(joyOf(s.doc, m).ready, false);
  s.update(music.id, { joyRate: 5 });
  rateCategoryJoy(s, 'Groceries', 3, { now: NOW.toISOString() });
  m = metrics(s.doc, ref, { now: NOW });
  const J = joyOf(s.doc, m);
  assert.equal(J.ready, true); assert.equal(J.rated, 2);
  assert.equal(J.rows.find(r => r.name === 'Music').from, 'line');
  assert.equal(J.rows.find(r => r.name === 'Groceries').from, 'category');
  assert.equal(J.fromCategory, 1);
  assert.equal(J.wage, m.hourly.value);
  assert.equal(spendLinesOf(m).find(l => l.id === music.id).joyRate, 5);
  s.update(food.id, { joyRate: 2 });
  assert.equal(joyOf(s.doc, metrics(s.doc, ref, { now: NOW })).rows.find(r => r.name === 'Groceries').joy, 2, 'the line\'s own tap comes first');
  s.undo();
  assert.equal(joyOf(s.doc, metrics(s.doc, ref, { now: NOW })).rows.find(r => r.name === 'Groceries').joy, 3, 'undoable');
  // the curve, from settings.enough.curve
  s.setDoc('settings', { enough: { curve: { Groceries: 'survival', Streaming: 'past' } } });
  m = metrics(s.doc, ref, { now: NOW });
  const K = curveOf(s.doc, m);
  assert.equal(K.ready, true); assert.equal(K.past, 18); assert.equal(K.placed, 2);
  // the subscriptions: the plan run with them cancelled, more invested and a smaller FI number
  const P = subsOf(s.doc, m, { now: NOW });
  assert.equal(P.ready, true); assert.equal(P.total, 30);
  const mv = fiMoveOf(m, { changes: [{ at: 0, monthly: 30 }], fi: -(30 * 12) / m.inputs.withdrawalRate }, { from: NOW });
  assert.equal(P.days, Math.round(-mv.fineDays));
  assert.ok(P.days > 0);
  assert.equal(P.rows[0].name, 'Video');
  // the rich-life list, from settings.richLife, with the plan's age and plan-to age
  s.setDoc('settings', { richLife: [{ id: 'x', name: 'Japan', price: 4000, joy: 5, kind: 'experience', regret: 'alot' }] });
  const R = richOf(s.doc, ref, m, { now: NOW });
  assert.equal(R.count, 1);
  const it = R.items[0];
  assert.equal(it.days, fiMoveOf(m, { once: 4000 }, { from: NOW }).fineDays);
  assert.ok(it.days > 0);
  assert.equal(it.memYears, m.inputs.age == null ? null : Math.max(0, ref.defaults.lifeExpectancy - m.inputs.age));
});

test('the screens: one file, the one money formatter, no verdict words, and the sections are wired in', () => {
  const ui = read('js/ui/joy-ui.js');
  assert.doesNotMatch(ui, /'\$' ?\+|"\$" ?\+|\$\$\{/, 'money through money()');
  assert.doesNotMatch(ui, /\b(waste|wasted|bad|should|mistake|failed|behind)\b/i);
  assert.match(read('js/ui/spending-ui.js'), /joySection\(ctx, \(\) => categoryJoyBlock\(ctx\)\), subsSection\(ctx\)/);
  assert.match(read('js/ui/plan-ui.js'), /enough, curve, rich/);
});
