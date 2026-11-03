// Reorganize pass (Nov 3 2026): Net worth vs Cash flow. Synthetic households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { metrics } from '../js/math/metrics.js';
import { duplicates, debtLines, afterTaxContributions } from '../js/math/linked.js';
import { instances } from '../js/month.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-03T12:00:00Z');
const fresh = () => {
  const s = new Store(newHousehold({ name: 'Synthetic', now: '2026-11-01T09:00:00.000Z' }));
  s.add('income', { name: 'Job', amount: 5000, per: 'month', values: { payFrequency: 'month' } }, { type: 'Job' });
  s.add('bill', { name: 'Rent', amount: 1500, values: { draftt: 'Accommodation', amountType: 'Fixed', category: 'Rent or mortgage' } });
  return s;
};
const m = s => metrics(s.doc, ref, { now });

// ---------- Item 2: enter once, show in both ----------
test('a debt payment shows in Cash flow as a line From Debt, counted once', () => {
  const s = fresh();
  s.add('debt', { name: 'Car loan', values: { balance: 9000, apr: 0.07, payment: 320 } }, { type: 'Car loan' });
  const x = m(s).inputs;
  assert.equal(x.autoLines.length, 1);
  assert.equal(x.autoLines[0].auto.from, 'Debt');
  assert.equal(x.autoLines[0].draftt, 'Debt');
  assert.equal(x.spending, 1500 + 320, 'the payment is in spending through its line');
  assert.equal(x.debtPaymentsOutsideSpending, 0, 'and not added a second time');
  assert.equal(m(s).surplus.value, 5000 - 1820);
});

test('a typed line that repeats a debt payment is flagged once and never double counted', () => {
  const s = fresh();
  const loan = s.add('debt', { name: 'Car loan', values: { balance: 9000, apr: 0.07, payment: 320 } }, { type: 'Car loan' });
  const typed = s.add('bill', { name: 'Car payment', amount: 320, values: { draftt: 'Transportation', amountType: 'Fixed' } });
  let x = m(s).inputs;
  assert.deepEqual(Object.keys(x.dupOf), [typed.id]);
  assert.equal(x.dupOf[typed.id].sourceId, loan.id);
  assert.equal(x.spending, 1820, 'counted once');
  // The calendar does not land it twice either.
  const ym = '2026-11';
  const out = instances(s.doc, ref, ym, { now }).filter(i => i.planned < 0 && Math.abs(i.planned + 320) < 1);
  assert.equal(out.length, 1);
  // "They're different": both count.
  s.update(typed.id, { notSame: [loan.id] });
  x = m(s).inputs;
  assert.deepEqual(x.dupOf, {});
  assert.equal(x.spending, 2140);
});

test('the duplicate check: a payment-sounding line or the Debt letter, not fees on a card', () => {
  const debts = [{ id: 'd1', name: 'Chase', type: 'Credit card', payment: 75, balance: 2000 }, { id: 'd2', name: 'Navient', type: 'Student loan', payment: 210, balance: 15000 }];
  const autos = debtLines(debts);
  const lines = [
    { id: 'a', name: 'Bank and card fees', category: 'Fees', draftt: 'Other', amount: 15, per: 'month' },
    { id: 'b', name: 'Student loan payment', category: null, draftt: 'Debt', amount: 200, per: 'month' },
    { id: 'c', name: 'Loans', draftt: 'Debt', amount: 500, per: 'month' },
    { id: 'd', name: 'Gym', draftt: 'Therapy', amount: 75, per: 'month' },
  ];
  const { dupOf } = duplicates(lines, { debts, autos });
  assert.deepEqual(Object.keys(dupOf).sort(), ['b', 'c']);
  assert.equal(dupOf.b.sourceId, 'd2', 'matched by its words');
});

test('the health premium: a typed line for it is flagged when the paycheck already pays it', () => {
  const s = fresh();
  s.add('coverage', { amount: 120, per: 'paycheck', values: { have: 'Have it', paidFrom: 'Paycheck' } }, { type: 'Health' });
  const typed = s.add('bill', { name: 'Health insurance (not through work)', amount: 260, values: { draftt: 'Therapy', category: 'Health insurance', amountType: 'Fixed' } });
  const x = m(s).inputs;
  assert.equal(x.dupOf[typed.id]?.from, 'Health');
  assert.equal(x.spending, 1500, 'the premium is not spent twice');
});

test('after-tax contributions are savings; a 401(k) is before-tax and stays on Income', () => {
  const accts = [
    { id: 'r', type: 'Roth IRA', values: { group: 'investment', contribution: 6000, contributionPer: 'Year' } },
    { id: 'b', type: 'Brokerage', values: { group: 'investment', contribution: 100, contributionPer: 'Paycheck' } },
    { id: 'k', type: '401(k)', values: { group: 'investment', contribution: 300, contributionPer: 'Paycheck' } },
    { id: 's', type: 'Savings or HYSA', values: { group: 'cash', contribution: 50 } },
  ];
  const c = afterTaxContributions(accts, { payFrequency: '2 weeks' });
  assert.deepEqual(c.parts.map(p => p.id), ['r', 'b']);
  assert.equal(Math.round(c.total), Math.round(500 + 100 * 26 / 12));
});

test('the waterfall adds up: gross, taxes, before-tax savings, take-home, fixed, variable, savings, free', () => {
  const s = fresh();
  s.setDoc('spending', { source: 'lines' });
  s.add('bill', { name: 'Groceries', amount: 400, values: { draftt: 'Food', amountType: 'Variable' } });
  s.add('account', { name: 'Roth', values: { group: 'investment', balance: 1000, contribution: 1200, contributionPer: 'Year' } }, { type: 'Roth IRA' });
  const f = m(s).flow;
  assert.equal(f.takeHome, 5000);
  assert.ok(Math.abs(f.gross - f.taxes - f.beforeTax - f.takeHome) < 0.01);
  assert.equal(f.fixed, 1500);
  assert.equal(f.variable, 400);
  assert.equal(f.savings, 100);
  assert.equal(f.free, 5000 - 1500 - 400 - 100);
});
