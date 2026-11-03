// Answers 89 to 91: the Plan column only where a month differs, and "A month in" keeps its cadence.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planDiffs } from '../js/month.js';
import { contributionFromMonthly, yearlyContribution } from '../js/math/portfolio.js';

test('89: a line differs only when this month has a typed plan that is not its usual monthly amount', () => {
  const lines = [{ id: 'a', amount: 100, per: 'month' }, { id: 'b', amount: 1200, per: 'year' }, { id: 'c', amount: 50, per: 'month' }];
  const doc = { spending: { months: { '2026-11': { lines: { a: { estimate: 100 }, b: { estimate: 100 }, c: { estimate: 80 } } } } } };
  assert.deepEqual([...planDiffs(doc, '2026-11', lines)], ['c'], 'same as usual (a, and b at 1200 a year) does not count');
  assert.equal(planDiffs({ spending: {} }, '2026-11', lines).size, 0, 'no typed plans: the column stays hidden');
});

test('91: per paycheck stays per paycheck; blank or yearly saves as yearly', () => {
  const paycheck = { contribution: 200, contributionPer: 'Paycheck' };
  const saved = contributionFromMonthly(650, paycheck, '2 weeks');
  assert.equal(saved.contributionPer, 'Paycheck');
  assert.ok(Math.abs(yearlyContribution({ ...paycheck, ...saved }, '2 weeks') - 650 * 12) < 1);
  assert.deepEqual(contributionFromMonthly(500, { contribution: 6000, contributionPer: 'Year' }), { contribution: 6000, contributionPer: 'Year' });
  assert.deepEqual(contributionFromMonthly(500, {}), { contribution: 6000, contributionPer: 'Year' });
  assert.deepEqual(contributionFromMonthly(null, paycheck), { contribution: null });
});
