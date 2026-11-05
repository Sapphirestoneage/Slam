// SPDX-License-Identifier: AGPL-3.0-only
// The FOO registry (Phase 3, batch 3): SLAM's own order of operations, and what each step needs before it opens.
// A step can declare a prerequisite step (reached first) and conditions on the numbers; a locked step shows a lock
// and its plain reason, never counts as where you are, and a coach can unlock it anyway with a note (kept on the
// session record) while the cost shows in FI days. js/math/foo.js reads this; the spec's Program tab mirrors it.

// The order, with each step in the client's words. Giving sits at the Roth IRA step in the list, but its only
// prerequisite is no heavy debt (overnight answer 5, Nov 6): it may open before the Roth step.
export const ORDER = ['0b', '1', '2', '3', '4', '5', '5b', '6', '7', '8', '9'];
export const STEP_WORDS = {
  '0b': 'Bedazzle your basic life: the joy lines (goals and mindset live here too)',
  '1': 'Stop the bleeding: no late bills, payday debt at $0, little e full ($1,000 or the highest deductible, whichever is smaller), income gaps within 12 months covered',
  '2': 'Take the free money: the full employer match',
  '3': 'Clear the heavy debt: cards, payday, personal, medical, BNPL, or any APR at or over the heavy line (8%)',
  '4': 'big e: the Rule of 5 (your age divided by 5 months of spending), FAT first, then DRAFTT, then full spending',
  '5': 'Roth and HSA: a Roth IRA and an invested HSA, maxed for the year',
  '5b': 'Give: a percent or an amount; off by default; opens once heavy debt is paid off, even before the Roth step',
  '6': 'Prepay retirement: Quiet Quitting FI, then Coast FI (maxing the 401(k) is the lever)',
  '7': 'SPARKS launch window: opens at Coast FI (or Quiet Quitting FI when that toggle is on), strictly after step 6',
  '8': 'Fund the future: sinking funds and later income gaps',
  '9': 'Low-rate debt, then FI, then True FI',
};
// Prerequisites: after is the step that must be reached first (every step before it done); conditions are tests on
// the numbers (CONDITIONS). A locked step's lock text is label, with any failed condition added.
export const PREREQS = {
  '5b': { conditions: ['noHeavyDebt'], label: 'Giving unlocks once heavy debt is paid off. Oxygen mask on you first.' }, // no after: heavy debt is the only prerequisite
  '7': { after: '6', label: 'The launch window opens at Coast FI (or Quiet Quitting FI when that toggle is on). Coast FI first, then SPARKS.' },
};
export const CONDITIONS = {
  noHeavyDebt: { label: 'no debt at or above the heavy-debt APR', test: f => !f.heavy.length },
};
