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
  s.add('bill', { name: 'Rent', amount: 3000, values: { category: 'Rent or mortgage', whoPays: 'Split' } });
  s.setDoc('spending', { source: 'lines' });
  const m = metrics(s.doc, ref);
  assert.equal(m.inputs.housing, 1500);
  assert.equal(m.housingPct.value, 0.3);
  assert.equal(m.inputs.spending, 1500);
});

// About you › Home and shared bills: every Budget line follows it unless the line says otherwise.
import { withHome, peopleSharing } from '../js/math/spending.js';
const share = (line, profile) => myShare(withHome(line, profile), { roommates: profile.roommates ?? 0 }).value;
const whole = (line, profile) => wholeBill(withHome(line, profile), { roommates: profile.roommates ?? 0 }).value;

test('a bill in a shared group is split with the people you live with', () => {
  const p = { roommates: 2, shared: { rent: true } };
  assert.equal(share({ amount: 3000, per: 'month', category: 'Rent or mortgage' }, p), 1000);
  assert.equal(share({ amount: 120, per: 'month', category: 'Electric, gas, water' }, p), 120, 'not a shared group: all yours');
  assert.equal(share({ amount: 3000, per: 'month', category: 'Rent or mortgage', whoPays: 'Me' }, p), 3000, 'the line\'s own answer wins');
});

test('shared bills given as your share: the whole bill is worked out', () => {
  const p = { roommates: 1, shared: { rent: true }, billsGivenAs: 'Your share' };
  assert.equal(share({ amount: 1500, per: 'month', category: 'Rent or mortgage' }, p), 1500);
  assert.equal(whole({ amount: 1500, per: 'month', category: 'Rent or mortgage' }, p), 3000);
});

test('Splitting with overrides the roommates; a partner splits when money is Separate or Mix; a couple can give a percent', () => {
  const rentLine = { amount: 3000, per: 'month', category: 'Rent or mortgage' };
  assert.equal(share(rentLine, { roommates: 0, splitWith: 2, shared: { rent: true } }), 1000);
  assert.equal(share(rentLine, { household: 'Couple', moneyStyle: 'Separate', shared: { rent: true } }), 1500);
  assert.equal(share(rentLine, { household: 'Couple', moneyStyle: 'Joint', shared: { rent: true } }), 3000, 'Joint: one budget, nothing to split');
  assert.equal(share(rentLine, { household: 'Couple', moneyStyle: 'Mix', splitMine: 0.6, shared: { rent: true } }), 1800);
  assert.equal(whole({ ...rentLine, amount: 1800 }, { household: 'Couple', splitMine: 0.6, shared: { rent: true }, billsGivenAs: 'Your share' }), 3000);
  assert.equal(peopleSharing({ roommates: 1, household: 'Couple', moneyStyle: 'Mix' }), 3);
});

test('the surplus follows About you', () => {
  const s = new Store(newHousehold({ name: 'Home test' }));
  s.add('income', { name: 'Job', amount: 5000, per: 'month', values: {} }, { type: 'Benefits' });
  s.add('bill', { name: 'Rent', amount: 2400, values: { category: 'Rent or mortgage' } });
  s.setDoc('spending', { source: 'lines' });
  assert.equal(metrics(s.doc, ref).surplus.value, 2600);
  s.setDoc('profile', { roommates: 1, shared: { rent: true } });
  assert.equal(metrics(s.doc, ref).surplus.value, 3800);
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
