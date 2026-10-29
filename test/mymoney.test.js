// Build phase 5 (My Money): gates add and remove sections, take-home and gross solve each other,
// card payment choices, car loan on Assets and Debt, and Fast Track turning on every lens.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { gatesOf, gatedOut, visible, syncCount, applies } from '../js/gates.js';
import { metrics } from '../js/math/metrics.js';
import { incomeRow, takeHomeFromGross } from '../js/math/income.js';
import { householdFromInputs } from '../js/demo.js';
import { addPresets } from '../js/presets.js';
import { applyFastTrack, fastTrackAnswers } from '../js/fasttrack.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const now = new Date('2026-11-01T12:00:00');
const fresh = () => new Store(newHousehold({ name: 'Test', now: '2026-11-01T09:00:00.000Z' }));

test('an unanswered gate shows everything; only a no takes things away (R001)', () => {
  const g = gatesOf({}, {});
  assert.equal(g.areas.debt, null);
  assert.equal(gatedOut({ kind: 'debt', values: {} }, g, ref), null);
  const no = gatesOf({ areas: { cash: true, investments: false, real: true, debt: false } }, {});
  assert.equal(gatedOut({ kind: 'debt', values: {} }, no, ref), 'debt');
  assert.equal(gatedOut({ kind: 'account', values: { group: 'investment' } }, no, ref), 'investments');
  assert.equal(gatedOut({ kind: 'account', values: { group: 'cash' } }, no, ref), null);
});

test('gated-out rows count nowhere: net worth drops the hidden debt, and comes back when ticked (R001, R066)', () => {
  const s = new Store(householdFromInputs(demo.inputs));
  const all = metrics(s.doc, ref, { now }).netWorth.value;
  assert.equal(all, 8300);
  s.setDoc('profile', { areas: { cash: true, investments: true, real: true, debt: false } });
  assert.equal(metrics(s.doc, ref, { now }).netWorth.value, 8300 + 7000 + 18000 + 4200);
  s.setDoc('profile', { areas: { cash: true, investments: true, real: true, debt: true } });
  assert.equal(metrics(s.doc, ref, { now }).netWorth.value, 8300);
});

test("'None of these' counts as done with zeros (R002)", () => {
  const s = fresh();
  assert.equal(metrics(s.doc, ref, { now }).netWorth.value, null);
  s.setDoc('profile', { noneOfThese: true });
  const m = metrics(s.doc, ref, { now });
  assert.equal(m.netWorth.value, 0);
  assert.equal(m.inputs.cash, 0);
});

test('a count of N makes N blank rows; lowering it only takes away blank ones (R003)', () => {
  const s = fresh();
  syncCount(s, 'Credit card', 3, ref);
  assert.equal(s.find(r => r.type === 'Credit card').length, 3);
  s.update(s.find(r => r.type === 'Credit card')[0].id, { balance: 500 });
  const res = syncCount(s, 'Credit card', 0, ref);
  assert.equal(res.kept, 1);
  assert.equal(s.find(r => r.type === 'Credit card').length, 1);
  syncCount(s, 'Roth IRA', 2, ref);
  assert.deepEqual(s.find(r => r.type === 'Roth IRA').map(r => [r.kind, r.values.group]), [['account', 'investment'], ['account', 'investment']]);
  syncCount(s, 'Car', 1, ref);
  assert.equal(s.find(r => r.type === 'Car')[0].kind, 'asset');
});

test('car, kids and pets gates take their budget lines away; owning takes the rent line away (R008 to R011)', () => {
  const s = fresh();
  addPresets(s, ref);
  const shown = profile => visible(s.records, gatesOf(profile, {}), ref).map(r => r.name);
  const all = shown({});
  assert.ok(all.includes('Car insurance') && all.includes('Pets') && all.includes('Kids and childcare') && all.includes('Rent'));
  const none = shown({ hasCar: false, hasPets: false, dependents: 0, housing: 'Own' });
  for (const n of ['Car insurance', 'Gas or charging', 'Pets', 'Kids and childcare', 'Rent', 'Renters insurance']) assert.ok(!none.includes(n), `${n} should be hidden`);
  assert.ok(none.includes('Transit') && none.includes('Uber and Lyft'), 'transit and Uber appear either way');
});

test('work situation gates the employer fields and the variable income block (R004 to R006)', () => {
  assert.equal(applies('match', { g: gatesOf({ workSituation: 'Between jobs' }) }), false);
  assert.equal(applies('match', { g: gatesOf({ workSituation: 'Mixed' }) }), true);
  assert.equal(applies('variable', { g: gatesOf({ workSituation: 'Self-employed' }) }), true);
  assert.equal(applies('unemployment', { g: gatesOf({ workSituation: 'Between jobs' }) }), true);
  assert.equal(applies('hsaFsa', { g: gatesOf({}) }), false, 'HSA only once confirmed (R012)');
  assert.equal(applies('repaymentPlan', { g: gatesOf({}), r: { values: { federal: 'Private' } } }), false, 'R016');
  assert.equal(applies('twoBalances', { g: gatesOf({}), r: { values: { taxType: 'Both' } } }), true, 'R018');
});

test('take-home typed: gross is worked out and marked Computed; gross typed: take-home is (R046)', () => {
  const th = incomeRow({ type: 'Job', amount: 5000, per: 'month', values: {} }, { filingStatus: 'Single', ref });
  assert.equal(th.computed, 'gross');
  assert.equal(th.grossResult.status, 'Computed');
  assert.ok(Math.abs(takeHomeFromGross({ gross: th.gross }, ref).value / 12 - 5000) < 1);
  const gr = incomeRow({ type: 'Job', amount: 90000, per: 'year', values: { basis: 'Gross' } }, { filingStatus: 'Single', ref });
  assert.equal(gr.computed, 'takeHome');
  assert.ok(Math.abs(gr.takeHome.value - takeHomeFromGross({ gross: 90000 }, ref).value / 12) < 0.01);
  const benefit = incomeRow({ type: 'Unemployment', amount: 1800, per: 'month', values: {} }, { ref });
  assert.equal(benefit.taxType, null);
  assert.equal(benefit.takeHome.value, 1800);
});

test('a card paid in full carries no interest and adds nothing to spending; minimum and custom as chosen (R020)', () => {
  const s = fresh();
  s.add('income', { amount: 5000 }, { type: 'Job' });
  s.add('spending', { amount: 3000, values: { includesDebtPayments: false } }, { type: 'All in' });
  const card = s.add('debt', { values: { balance: 2000, apr: 0.24, payChoice: 'In full' } }, { type: 'Credit card' });
  let m = metrics(s.doc, ref, { now });
  assert.equal(m.debts[0].interest.value, 0);
  assert.equal(m.surplus.value, 2000);
  s.update(card.id, { payChoice: 'Minimum', payment: 300 });
  m = metrics(s.doc, ref, { now });
  assert.ok(m.debts[0].paymentIsMinimum, 'Minimum ignores a typed amount');
  s.update(card.id, { payChoice: 'Custom' });
  assert.equal(metrics(s.doc, ref, { now }).debts[0].payment, 300);
});

test('Fast Track turns on every lens and keeps the totals by area (R068, R132)', () => {
  const s = fresh();
  applyFastTrack(s, {
    firstName: 'Sam', birthMonth: 3, birthYear: 1994, household: 'Solo', takeHome: 4200, takePer: 'month', payFrequency: '2 weeks',
    gut: 3000, gutIncludesDebt: true, checking: 2500, savings: 6000, invested: 30000, housing: 'Rent', hasCar: true, carValue: 9000,
    carLoanBalance: 5000, carLoanPayment: 300, debts: { 'Credit card': { balance: 3000, payment: 150 }, 'Student loan': { balance: null, payment: null } }, fiAge: 50,
  }, { seconds: 240 });
  const m = metrics(s.doc, ref, { now });
  for (const k of ['netWorth', 'surplus', 'savingsRate', 'monthsToFi']) assert.notEqual(m[k].value, null, `${k} is on`);
  assert.equal(m.netWorth.value, 2500 + 6000 + 30000 + 9000 - 5000 - 3000);
  const car = s.find(r => r.type === 'Car')[0];
  const loan = s.find(r => r.type === 'Car loan')[0];
  assert.equal(loan.linkedTo, car.id, 'the car loan is the same record on Assets and Debt (R049)');
  assert.equal(s.find(r => r.type === 'Credit card')[0].fieldStatus.apr, 'Not sure', 'a typical APR fills in as a Guess');
  assert.equal(s.doc.profile.areas.debt, true);
  assert.equal(s.doc.settings.fastTrack.seconds, 240);
  assert.equal(s.undoStack.length, 1, 'one undo step');
  // Again, from what is on file: nothing doubles up
  applyFastTrack(s, { ...fastTrackAnswers(s.doc), savings: 7000 });
  assert.equal(s.find(r => r.kind === 'account' && r.type === 'Savings or HYSA').length, 1);
  assert.equal(metrics(s.doc, ref, { now }).netWorth.value, 2500 + 7000 + 30000 + 9000 - 5000 - 3000);
});

test('Fast Track leaves line-by-line debts alone and skipped steps unanswered', () => {
  const s = fresh();
  s.add('debt', { name: 'Amex', values: { balance: 1000 } }, { type: 'Credit card' });
  s.add('debt', { name: 'Chase', values: { balance: 2000 } }, { type: 'Credit card' });
  applyFastTrack(s, { debts: { 'Credit card': { balance: 9999, payment: 10 } }, takeHome: 3000 });
  assert.deepEqual(s.find(r => r.type === 'Credit card').map(r => r.values.balance), [1000, 2000]);
  assert.equal(gatesOf(s.doc.profile).areas.investments, null, 'a skipped step hides nothing');
});

test('gross only: take-home is worked out (R046)', () => {
  const x = incomeRow({ type: 'Job', amount: null, per: 'month', values: { gross: 60000 } }, { filingStatus: 'Single', ref });
  assert.equal(x.computed, 'takeHome');
  assert.ok(Math.abs(x.takeHome.value - takeHomeFromGross({ gross: 60000 }, ref).value / 12) < 0.01);
});
