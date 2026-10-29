import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuickAdd } from '../js/quickadd.js';

test('quick add: a bill with a period', () => {
  const r = parseQuickAdd('Netflix 15.99 monthly');
  assert.equal(r.kind, 'bill'); assert.equal(r.name, 'Netflix'); assert.equal(r.amount, 15.99); assert.equal(r.per, 'month');
  assert.equal(r.section, 'Spending › Budget');
});
test('quick add: a card with a balance and APR', () => {
  const r = parseQuickAdd('Chase card 3200 at 24%');
  assert.equal(r.kind, 'debt'); assert.equal(r.type, 'Credit card'); assert.equal(r.name, 'Chase card');
  assert.equal(r.values.balance, 3200); assert.equal(r.values.apr, 0.24);
});
test('quick add: other shapes', () => {
  assert.equal(parseQuickAdd('Gym $40 a month').amount, 40);
  assert.equal(parseQuickAdd('Car insurance 1,200 yearly').per, 'year');
  assert.equal(parseQuickAdd('Car insurance 1,200 yearly').amount, 1200);
  assert.equal(parseQuickAdd('Paycheck 2100 every 2 weeks').kind, 'income');
  assert.equal(parseQuickAdd('Paycheck 2100 every 2 weeks').per, '2 weeks');
  assert.equal(parseQuickAdd('Roth 6000').type, 'Roth IRA');
  assert.equal(parseQuickAdd('Ally savings 5000').values.group, 'cash');
  assert.equal(parseQuickAdd('Student loan 18000 at 5.5%').type, 'Student loan');
  assert.equal(parseQuickAdd('Coffee').amount, null, 'no amount stays empty, never 0');
  assert.equal(parseQuickAdd('   '), null);
});
