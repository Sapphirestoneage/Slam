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
