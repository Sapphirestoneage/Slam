// Overnight F1: the ladder (M75). Synthetic households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { ladderOf } from '../js/math/ladder.js';
import { STEPS, MARKERS } from '../js/registry/ladder.js';
import { householdFromInputs } from '../js/demo.js';
import { endSession, startSession } from '../js/program.js';
import { metrics } from '../js/math/metrics.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z');
const fresh = () => new Store(newHousehold({ name: 'Synthetic', now: now.toISOString() }), { now: () => now.toISOString() });
const names = list => list.map(r => r.name);

test('the registry: steps in FOO order, markers in reach order; nothing calculated in the registry', () => {
  assert.deepEqual(names(STEPS), ['little e', '401(k) match captured', '25% of heavy debt paid', '50% of heavy debt paid', '75% of heavy debt paid', 'Heavy debt free', 'big e']);
  assert.deepEqual(names(MARKERS), ['Net worth positive', 'All consumer debt free', '$100k net worth', 'Quiet Quitting FI', 'Coast FI', 'Lean FI', 'FI', 'Fat FI']);
  assert.ok(MARKERS.find(k => k.id === 'fat').editable, 'the Fat FI label can be renamed');
});

test('an empty client: no step done, no marker reached, no dates; nothing crashes', () => {
  const L = ladderOf(fresh().doc, ref, { now });
  assert.equal(L.wins, 0);
  assert.ok(L.steps.every(s => !s.done && s.date == null));
  assert.equal(L.next.id, 'littleE');
});

test('the Demo client: little e done, net worth and Quiet Quitting FI reached, heavy debt by quarters dated from the payoff path, markers slotted by date', () => {
  const d = new Store(householdFromInputs(demo.inputs, { name: 'Z', now: now.toISOString() }));
  const L = ladderOf(d.doc, ref, { now });
  assert.ok(L.steps.find(s => s.id === 'littleE').done);
  assert.ok(L.markers.find(k => k.id === 'nwZero').reached);
  assert.equal(L.next.id, 'heavy25');
  const q = L.steps.filter(s => s.share != null).map(s => s.months);
  assert.ok(q.every(m => m != null), 'every quarter has a month');
  assert.ok(q[0] < q[1] && q[1] < q[2] && q[2] <= q[3], `quarters in order: ${q}`);
  assert.equal(L.steps.find(s => s.id === 'heavyFree').months, L.markers.find(k => k.id === 'consumerFree').months, 'heavy debt free and consumer debt free agree when every debt is a card');
  // The ladder: steps keep their order; a marker sits before the first step dated after it.
  const r = L.rungs;
  assert.ok(r.findIndex(x => x.id === 'nwZero') < r.findIndex(x => x.id === 'littleE'));
  assert.ok(r.findIndex(x => x.id === 'heavy25') < r.findIndex(x => x.id === 'heavy50'));
  assert.ok(r.findIndex(x => x.id === 'coast') > r.findIndex(x => x.id === 'bigE'), 'Coast FI after big e: later by date');
  assert.ok(r.findIndex(x => x.id === 'fi') < r.findIndex(x => x.id === 'fat'));
  assert.match(L.next.what, /heavy debt/);
});

test('a household starting at -$40k: net worth positive is a marker ahead, not the start; the quarters date from the card and loan payoff; Day 0 fixes the heavy start', () => {
  const s = fresh();
  s.transaction('x', () => {
    s.setDoc('profile', { age: 29, household: 'Just me', state: 'TX', incomeStability: 'Steady', areas: { debt: true } });
    s.add('income', { name: 'Job', amount: 4200, per: 'month', values: {} }, { type: 'Job' });
    s.add('spending', { name: 'Gut', amount: 2800, values: { includesDebtPayments: true } }, { type: 'All in' });
    s.add('account', { name: 'Checking', values: { group: 'cash', balance: 600 } }, { type: 'Checking' });
    s.add('debt', { name: 'Visa', values: { balance: 12000, apr: 0.24, payment: 400, limit: 15000 } }, { type: 'Credit card' });
    s.add('debt', { name: 'Personal', values: { balance: 18000, apr: 0.12, payment: 450 } }, { type: 'Personal loan' });
    s.add('debt', { name: 'Car', values: { balance: 10600, apr: 0.05, payment: 300 } }, { type: 'Car loan' });
  });
  const m = metrics(s.doc, ref, { now });
  assert.ok(m.netWorth.value <= -40000 && m.netWorth.value > -41000, `net worth ${m.netWorth.value}`);
  const L = ladderOf(s.doc, ref, { now });
  assert.equal(L.wins, 0);
  assert.equal(L.next.id, 'littleE');
  assert.ok(!L.steps.find(s => s.id === 'match'), 'no match offered: the step is left out');
  assert.equal(L.heavy.start, 30000, 'the card and the personal loan are heavy; the car loan is not');
  const nw = L.markers.find(k => k.id === 'nwZero');
  assert.ok(!nw.reached && nw.months > 0, 'net worth positive is ahead');
  const cf = L.markers.find(k => k.id === 'consumerFree');
  assert.ok(cf.months > 0 && cf.months <= 60, `consumer debt free in ${cf.months} months`);
  assert.ok(L.steps.find(x => x.id === 'heavy25').months < L.steps.find(x => x.id === 'heavyFree').months);
  // Day 0 then paying half the card: the quarters measure from Day 0's heavy total, so 25% is done at $22,500 left.
  startSession(s, { now }); endSession(s, ref, { now, metricsOf: () => ({}) });
  s.update(s.find(r => r.name === 'Visa')[0].id, { balance: 4500 });
  const L2 = ladderOf(s.doc, ref, { now });
  assert.equal(L2.heavy.start, 30000);
  assert.ok(L2.steps.find(x => x.id === 'heavy25').done, '25% paid since Day 0');
  assert.ok(!L2.steps.find(x => x.id === 'heavy50').done);
  assert.ok(L2.day0, 'Day 0 shows on the ladder');
});

test('a young high-saver hits Coast FI before big e: the marker slots in before the step; every step not done keeps its place', () => {
  const s = fresh();
  s.transaction('x', () => {
    s.setDoc('profile', { age: 26, household: 'Just me', state: 'WA', incomeStability: 'Steady', areas: { debt: false } });
    s.setDoc('assumptions', { fiAge: 60 });
    s.add('income', { name: 'Job', amount: 9000, per: 'month', values: {} }, { type: 'Job' });
    s.add('spending', { name: 'Gut', amount: 2500, values: { includesDebtPayments: false } }, { type: 'All in' });
    s.add('account', { name: 'Checking', values: { group: 'cash', balance: 3000 } }, { type: 'Checking' });
    s.add('account', { name: 'Brokerage', values: { group: 'investment', balance: 120000 } }, { type: 'Brokerage' });
  });
  const L = ladderOf(s.doc, ref, { now });
  const coast = L.markers.find(k => k.id === 'coast');
  assert.ok(coast.reached, `Coast FI reached with $120k at 26 (target ${coast.target})`);
  const bigE = L.steps.find(x => x.id === 'bigE');
  assert.ok(!bigE.done && bigE.months > 0, 'big e still ahead');
  const r = L.rungs;
  assert.ok(r.findIndex(x => x.id === 'coast') < r.findIndex(x => x.id === 'bigE'), 'Coast FI before big e on the ladder');
  assert.ok(!L.steps.some(x => x.share != null), 'no heavy debt: the quarters are left out');
  assert.ok(!L.markers.find(k => k.id === 'consumerFree'), 'no debt per About you: the consumer debt marker is left out');
  assert.ok(L.markers.find(k => k.id === 'nw100k').reached);
  assert.ok(L.wins >= 3, `wins ${L.wins}`);
  assert.equal(L.next.id, 'bigE');
  // The Fat FI label can be renamed per client.
  s.setIn('program', ['ladder'], { fatLabel: 'Roomy FI' }, 'Fat label');
  assert.equal(ladderOf(s.doc, ref, { now }).markers.find(k => k.id === 'fat').name, 'Roomy FI');
});
