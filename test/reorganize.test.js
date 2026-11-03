// Reorganize pass (Nov 3 2026): Net worth vs Cash flow. Synthetic households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { metrics } from '../js/math/metrics.js';
import { duplicates, debtLines, afterTaxContributions } from '../js/math/linked.js';
import { instances } from '../js/month.js';
import { paydayOf, setAsideOf } from '../js/payday.js';

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

test('a typed line that repeats a debt payment asks once, and only Yes keeps it from counting twice', () => {
  const s = fresh();
  const loan = s.add('debt', { name: 'Car loan', values: { balance: 9000, apr: 0.07, payment: 320 } }, { type: 'Car loan' });
  const typed = s.add('bill', { name: 'Car payment', amount: 320, values: { draftt: 'Transportation', amountType: 'Fixed' } });
  let x = m(s).inputs;
  assert.equal(x.askOf[typed.id].sourceId, loan.id, 'asked: Same as your Car loan payment?');
  assert.deepEqual(x.dupOf, {}, 'never merged silently');
  assert.equal(x.spending, 2140, 'both count until someone answers');
  // Yes: counted once, everywhere, the calendar too.
  s.update(typed.id, { sameAs: loan.id });
  x = m(s).inputs;
  assert.equal(x.dupOf[typed.id].sourceId, loan.id);
  assert.equal(x.askOf[typed.id], undefined);
  assert.equal(x.spending, 1820);
  const out = instances(s.doc, ref, '2026-11', { now }).filter(i => i.planned < 0 && Math.abs(i.planned + 320) < 1);
  assert.equal(out.length, 1);
  // No: both count and it does not ask again.
  s.update(typed.id, { sameAs: null, notSame: [loan.id] });
  x = m(s).inputs;
  assert.deepEqual([x.dupOf, x.askOf], [{}, {}]);
  assert.equal(x.spending, 2140);
});

test("the match: the line's own name (not its group), an exact amount, or the Debt group", () => {
  const debts = [{ id: 'd1', name: 'Chase', type: 'Credit card', payment: 75, balance: 2000 }, { id: 'd2', name: 'Navient', type: 'Student loan', payment: 210, balance: 15000 },
    { id: 'd3', name: 'Home loan', type: 'Mortgage', payment: 1800, balance: 300000 }];
  const autos = debtLines(debts);
  const lines = [
    { id: 'a', name: 'Bank and card fees', category: 'Fees', draftt: 'Other', amount: 15, per: 'month' },
    { id: 'b', name: 'Student loan payment', draftt: 'Other', amount: 200, per: 'month' },
    { id: 'c', name: 'Loans', draftt: 'Debt', amount: 500, per: 'month' },
    { id: 'd', name: 'Monthly payment', draftt: 'Other', amount: 75, per: 'month' },
    { id: 'g', name: 'Gym', draftt: 'Therapy', amount: 75, per: 'month' },
    { id: 'e', name: 'Rent', category: 'Rent or mortgage', draftt: 'Accommodation', amount: 1650, per: 'month' },
    { id: 'f', name: 'Car payment', draftt: 'Other', amount: 75.5, per: 'month' },
  ];
  const { askOf, dupOf } = duplicates(lines, { debts, autos });
  assert.deepEqual(Object.keys(askOf).sort(), ['b', 'c', 'd']);
  assert.equal(askOf.b.sourceId, 'd2', 'its own words: student loan');
  assert.equal(askOf.d.sourceId, 'd1', 'a payment word and the exact amount');
  assert.equal(askOf.g, undefined, 'the same amount alone is not enough');
  assert.equal(askOf.e, undefined, 'the Rent or mortgage group is not evidence');
  assert.equal(askOf.f, undefined, 'close is not exact');
  assert.deepEqual(dupOf, {});
});

test('the health premium: a typed line for it asks, and Yes keeps the premium from being spent twice', () => {
  const s = fresh();
  const health = s.add('coverage', { amount: 120, per: 'paycheck', values: { have: 'Have it', paidFrom: 'Paycheck' } }, { type: 'Health' });
  const typed = s.add('bill', { name: 'Health insurance (not through work)', amount: 260, values: { draftt: 'Therapy', category: 'Health insurance', amountType: 'Fixed' } });
  assert.equal(m(s).inputs.askOf[typed.id]?.from, 'Health');
  assert.equal(m(s).inputs.spending, 1760);
  s.update(typed.id, { sameAs: health.id });
  assert.equal(m(s).inputs.spending, 1500, 'the premium is not spent twice');
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

// ---------- Item 3: answers to the Brandon questions ----------

test('headline savings rate counts the 401(k), HSA and the match; surplus over take-home is the second line', () => {
  const s = new Store(newHousehold({ name: 'Synthetic', now: '2026-11-01T09:00:00.000Z' }));
  s.add('income', { name: 'Job', amount: 78000, per: 'year', values: { basis: 'Gross', payFrequency: '2 weeks', contributionPct: 0.06, matchPct: 1, matchCapPct: 0.04 } }, { type: 'Job' });
  s.add('spending', { amount: 3000, values: {} }, { type: 'All in' });
  const sr = m(s).savingsRate;
  const pre = 78000 * 0.06 / 12, match = 78000 * 0.04 / 12;
  assert.ok(Math.abs(sr.pretaxSaving - pre) < 0.01);
  assert.ok(Math.abs(sr.match - match) < 0.01, 'match: 100% of the first 4%');
  const th = m(s).inputs.takeHome, surplus = m(s).surplus.value;
  assert.ok(Math.abs(sr.value - (surplus + pre + match) / (th + pre + match)) < 1e-9);
  assert.ok(Math.abs(sr.ofTakeHome - surplus / th) < 1e-9);
  assert.match(sr.second, /of take-home/);
});

test('the Health row owns the premium: Income borrows it, it leaves take-home once, never as a Budget line too', () => {
  const s = new Store(newHousehold({ name: 'Synthetic', now: '2026-11-01T09:00:00.000Z' }));
  const job = s.add('income', { name: 'Job', amount: 78000, per: 'year', values: { basis: 'Gross', payFrequency: '2 weeks', premium: 999 } }, { type: 'Job' });
  const before = m(s).inputs.takeHome; // the typed 999 still counts with no Health row
  const health = s.add('coverage', { amount: 100, per: 'paycheck', values: { have: 'Have it', paidFrom: 'Paycheck' } }, { type: 'Health' });
  const x = m(s).inputs;
  assert.equal(x.health.jobId, job.id);
  assert.equal(x.health.perPaycheck, 100);
  assert.ok(x.income[0].pretax === 100 * 26, 'the typed Income premium is set aside: Health owns it');
  assert.ok(x.takeHome > before, 'a $100 premium leaves more take-home than the typed $999');
  // Its own Budget line while the paycheck pays it: flagged, not counted.
  const line = s.add('bill', { name: 'Health insurance', amount: 216.67, linkedTo: health.id, values: { draftt: 'Therapy', category: 'Health insurance', amountType: 'Fixed' } });
  assert.ok(m(s).inputs.dupOf[line.id]);
  // Paid as a Budget line instead: nothing comes out of the paycheck, the line counts.
  s.update(health.id, { paidFrom: 'Budget line' });
  const y = m(s).inputs;
  assert.equal(y.income[0].pretax, 0);
  assert.equal(y.dupOf[line.id], undefined);
});

test('Free after savings: savings goals and sinking funds come out of free to spend, per paycheck and per month', () => {
  const s = new Store(newHousehold({ name: 'Synthetic', now: '2026-11-01T09:00:00.000Z' }));
  s.add('income', { name: 'Job', amount: 2000, per: 'paycheck', values: { payFrequency: 'twice a month', paydays: [7, 22] } }, { type: 'Job' });
  s.add('bill', { name: 'Rent', amount: 1500, values: { draftt: 'Accommodation', amountType: 'Fixed', dueDay: 1 } });
  s.add('account', { name: 'Savings', values: { group: 'cash', balance: 1000, tags: [{ name: 'Trip', target: 2200, dollars: 1000, date: '2027-11' }] } }, { type: 'Savings or HYSA' });
  const save = setAsideOf(s.doc, ref, now);
  assert.equal(Math.round(save.goals), 100, '$1,200 left over 12 months');
  const d = paydayOf(s.doc, ref, now);
  assert.equal(Math.round(d.month.save), 100);
  assert.equal(Math.round(d.month.afterSavings), Math.round(d.month.free - 100));
  assert.equal(Math.round(d.period.afterSavings), Math.round(d.period.free - 50), 'two paychecks a month: $50 each');
});
