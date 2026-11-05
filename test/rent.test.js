// SPDX-License-Identifier: AGPL-3.0-only
// Rent and other shared bills, typed either way (answer to QUESTIONS 103): "my rent is $1,500" can be your share or
// the whole rent. This amount is: Your share keeps it as yours and works out the whole bill; The whole bill splits it.
// Housing % now splits with your roommates like every other number.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { myShare, wholeBill } from '../js/math/spending.js';
import { Store, newHousehold } from '../js/records.js';
import { metrics } from '../js/math/metrics.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const rent = extra => ({ name: 'Rent', amount: 1500, per: 'month', category: 'Rent or mortgage', whoPays: 'Split', ...extra });

test('a share typed as your share stays yours, and the whole rent is worked out', () => {
  const line = rent({ amountIs: 'Your share' });
  assert.equal(myShare(line, { roommates: 1 }).value, 1500);
  assert.equal(wholeBill(line, { roommates: 1 }).value, 3000);
  assert.equal(wholeBill(rent({ amountIs: 'Your share', splitBy: 3 }), { roommates: 1 }).value, 4500);
});

test('the whole rent is split, as before', () => {
  assert.equal(myShare(rent({ amountIs: 'The whole bill' }), { roommates: 1 }).value, 750);
  assert.equal(myShare(rent({}), { roommates: 1 }).value, 750, 'blank means the whole bill: no old number moves');
  assert.equal(wholeBill(rent({}), { roommates: 1 }).value, 1500);
});

test('Housing % uses your share, with your roommates, like the surplus does', () => {
  const s = new Store(newHousehold({ name: 'Rent test' }));
  s.setDoc('profile', { roommates: 1 });
  s.add('income', { name: 'Job', amount: 5000, per: 'month', values: {} }, { type: 'Benefits' });
  s.add('bill', { name: 'Rent', amount: 3000, values: { category: 'Rent or mortgage', whoPays: 'Split', amountIs: 'The whole bill' } }); // batch 5: with a roommate, rent reads as your share unless the line or About you says the whole bill
  s.setDoc('spending', { source: 'lines' });
  const m = metrics(s.doc, ref);
  assert.equal(m.inputs.housing, 1500);
  assert.equal(m.housingPct.value, 0.3);
  assert.equal(m.inputs.spending, 1500);
});

// About you › Home and shared bills: every Budget line follows it unless the line says otherwise.
import { withHome, peopleSharing, sharedBillsOf, splitWaysOf } from '../js/math/spending.js';
import { migrate } from '../js/records.js';
const share = (line, profile) => myShare(withHome(line, profile), { roommates: profile.roommates ?? 0 }).value;
const whole = (line, profile) => wholeBill(withHome(line, profile), { roommates: profile.roommates ?? 0 }).value;

test('a bill in a shared group is split with the people you live with', () => {
  const p = { roommates: 2, shared: { rent: true }, sharedAs: { rent: 'The whole bill' } };
  assert.equal(share({ amount: 3000, per: 'month', category: 'Rent or mortgage' }, p), 1000);
  assert.equal(share({ amount: 120, per: 'month', category: 'Electric, gas, water' }, p), 120, 'not a shared group: all yours');
  assert.equal(share({ amount: 3000, per: 'month', category: 'Rent or mortgage', whoPays: 'Me' }, p), 3000, 'the line\'s own answer wins');
});

test('shared bills given as your share: the whole bill is worked out', () => {
  const p = { roommates: 1, shared: { rent: true }, sharedAs: { rent: 'Your share' } };
  assert.equal(share({ amount: 1500, per: 'month', category: 'Rent or mortgage' }, p), 1500);
  assert.equal(whole({ amount: 1500, per: 'month', category: 'Rent or mortgage' }, p), 3000);
});

test('Split N ways (you included) overrides the roommates; a partner splits when money is Separate or Mix; a couple can give a percent', () => {
  const rentLine = { amount: 3000, per: 'month', category: 'Rent or mortgage' };
  const whole3 = { shared: { rent: true }, sharedAs: { rent: 'The whole bill' } };
  assert.equal(share(rentLine, { splitWays: 3, ...whole3 }), 1000, 'no roommate count: Split 3 ways');
  assert.equal(share(rentLine, { roommates: 2, splitWays: 2, ...whole3 }), 1000, 'answer 176: the roommate count (3 ways) wins over a typed 2; the disagreement goes to the revisit list');
  assert.equal(share(rentLine, { roommates: 0, splitWays: 3, ...whole3 }), 3000, 'no roommates: the whole bill is yours, and the revisit list says to check');
  assert.equal(share(rentLine, { household: 'Couple', moneyStyle: 'Separate', ...whole3 }), 1500);
  assert.equal(share(rentLine, { household: 'Couple', moneyStyle: 'Joint', ...whole3 }), 3000, 'Joint: one budget, nothing to split');
  assert.equal(share(rentLine, { household: 'Couple', moneyStyle: 'Mix', splitMine: 0.6, ...whole3 }), 1800);
  assert.equal(whole({ ...rentLine, amount: 1800 }, { household: 'Couple', splitMine: 0.6, shared: { rent: true }, sharedAs: { rent: 'Your share' } }), 3000);
  assert.equal(peopleSharing({ roommates: 1, household: 'Couple', moneyStyle: 'Mix' }), 3);
});

// Batch 5 (E): per-bill My share / Whole bill, the Split N ways count (you included), the roommate defaults, the migration.
test('E2, E3: with 3 roommates a bill is split 4 ways; rent $1,500 as my share stays $1,500; electric $240 as the whole bill is $60', () => {
  const p = { roommates: 3 };
  assert.equal(splitWaysOf(p), 4, '3 roommates: 4 ways, you included');
  const g = sharedBillsOf(p);
  assert.deepEqual([g.rent.on, g.rent.as], [true, 'Your share'], 'the default: rent split, given as your share');
  assert.deepEqual([g.utilities.on, g.utilities.as, g.internet.on, g.internet.as], [true, 'The whole bill', true, 'The whole bill']);
  assert.deepEqual([g.renters.on, g.renters.as, g.groceries.on, g.groceries.as, g.household.on, g.household.as], [false, 'Your share', false, 'Your share', false, 'The whole bill']);
  assert.equal(share({ amount: 1500, per: 'month', category: 'Rent or mortgage' }, p), 1500, 'my share is never divided again');
  assert.equal(whole({ amount: 1500, per: 'month', category: 'Rent or mortgage' }, p), 6000);
  assert.equal(share({ amount: 240, per: 'month', category: 'Electric, gas, water' }, p), 60, 'the whole bill divided 4 ways');
  assert.equal(share({ amount: 100, per: 'month', category: 'Groceries' }, p), 100, 'groceries are not split by default');
  assert.equal(sharedBillsOf({ roommates: 0 }).rent.on, false, 'no roommates: nothing is split by default');
  assert.equal(sharedBillsOf({ roommates: 3, shared: { utilities: true } }).rent.on, false, 'once any box is ticked, only the ticked boxes are on');
  assert.equal(share({ amount: 240, per: 'month', category: 'Electric, gas, water' }, { roommates: 3, shared: { utilities: true }, sharedAs: { utilities: 'Your share' } }), 240, 'the per-bill toggle');
});

test('E4: an older file: "splitting with N" becomes N + 1 ways; the one "given as" becomes each ticked bill\'s choice; every box is written out', () => {
  const doc = { profile: { roommates: 2, splitWith: 2, billsGivenAs: 'The whole bill', shared: { rent: true } }, records: [], history: [], snapshots: [], parking: [], session: {} };
  const m = migrate(doc);
  assert.equal(m.profile.splitWays, 3);
  assert.equal(m.profile.splitWith, undefined); assert.equal(m.profile.billsGivenAs, undefined);
  assert.deepEqual(m.profile.sharedAs, { rent: 'The whole bill' });
  assert.deepEqual(m.profile.shared, { rent: true, utilities: false, internet: false, renters: false, groceries: false, household: false });
  assert.equal(share({ amount: 3000, per: 'month', category: 'Rent or mortgage' }, m.profile), 1000, 'the whole rent, 3 ways');
  const old = migrate({ profile: { roommates: 1, shared: { rent: true } }, records: [], history: [], snapshots: [], parking: [], session: {} });
  assert.equal(old.profile.sharedAs.rent, 'The whole bill', 'a ticked bill with no choice keeps the old meaning: the whole bill');
});

test('the surplus follows About you', () => {
  const s = new Store(newHousehold({ name: 'Home test' }));
  s.add('income', { name: 'Job', amount: 5000, per: 'month', values: {} }, { type: 'Benefits' });
  s.add('bill', { name: 'Rent', amount: 2400, values: { category: 'Rent or mortgage' } });
  s.setDoc('spending', { source: 'lines' });
  assert.equal(metrics(s.doc, ref).surplus.value, 2600);
  s.setDoc('profile', { roommates: 1, shared: { rent: true }, sharedAs: { rent: 'The whole bill' } });
  assert.equal(metrics(s.doc, ref).surplus.value, 3800);
  s.setDoc('profile', { sharedAs: { rent: 'Your share' } });
  assert.equal(metrics(s.doc, ref).surplus.value, 2600, 'given as my share: never divided again');
});

// Part of a bill someone else covers (F089), and money reimbursed to you (F093).
import { coveredShare, reimbursedMonthly } from '../js/math/spending.js';
test('someone covers part of a bill: you pay the rest', () => {
  const phone = { amount: 80, per: 'month', whoPays: 'Covered by someone', coveredAmount: 50 };
  assert.equal(coveredShare(phone), 50 / 80);
  assert.equal(myShare(phone).value, 30);
  assert.equal(myShare({ ...phone, coveredAmount: null }).value, 0, 'blank: they cover all of it');
  assert.equal(myShare({ ...phone, coveredAmount: 200 }).value, 0, 'never more than the bill');
});

test('a reimbursed amount comes off your share, a month', () => {
  assert.equal(myShare({ amount: 90, per: 'month', reimbursed: 30 }).value, 60);
  assert.equal(reimbursedMonthly({ amount: 1200, per: 'year', reimbursed: 600 }), 50);
  assert.equal(myShare({ amount: 1200, per: 'year', reimbursed: 600 }).value, 50);
  assert.equal(myShare({ amount: 40, per: 'month', reimbursed: 100 }).value, 0, 'never below zero');
  assert.equal(myShare({ amount: 3000, per: 'month', whoPays: 'Split', reimbursed: 100 }, { roommates: 1 }).value, 1400, 'after the split');
});
