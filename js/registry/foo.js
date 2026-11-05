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
// Item 31 (batch 6): what each tile says. short on the tile; the card on hover or tap: the full name, one line of why,
// the problem it solves, what it unlocks, done when. Edit the words here.
export const STEP_CARDS = {
  '0b': { short: 'Joy Basics', full: 'Bedazzle your basic life', why: 'Fund the few things that make daily life good.', problem: 'Budgets that cut everything feel like punishment, and people quit.', unlocks: "A plan you'll actually stick with.", doneWhen: 'The joy lines are picked and funded.' },
  '1': { short: 'Stop the Bleeding', full: 'Stop the bleeding', why: 'Bills current, no payday debt, little e full, income gaps covered.', problem: 'One surprise turns into late fees and new debt.', unlocks: "Nothing's on fire, you can think straight.", doneWhen: 'No late bill, payday debt at $0, little e full, any gap within 12 months covered.' },
  '2': { short: 'Free Money', full: 'Take the free money', why: 'Get the full employer match.', problem: 'Leaving an instant 50 to 100% return on the table.', unlocks: 'A raise you already earned.', doneWhen: 'Putting in enough to get the whole match (or no match is offered).' },
  '3': { short: 'Kill Heavy Debt', full: 'Clear the heavy debt', why: 'Pay off everything at 8% or more.', problem: 'Interest working against you faster than investing works for you.', unlocks: 'Your cash flow back, and giving unlocks.', doneWhen: 'No debt at or over the heavy line.' },
  '4': { short: 'big e', full: 'big e: the Rule of 5', why: 'Your age divided by 5 is the months of spending saved.', problem: 'A job loss forcing new debt or selling investments at a bad time.', unlocks: 'Freedom to invest without fear, and leverage to leave a bad job.', doneWhen: 'Every big e layer (FAT, DRAFTT, full) is full.' },
  '5': { short: 'Tax-Free Growth', full: 'Roth IRA and HSA', why: 'Max the Roth IRA and the HSA.', problem: 'Paying tax on decades of growth.', unlocks: "Money later the IRS can't touch.", doneWhen: 'The Roth IRA (and the HSA, when eligible) is maxed for the year.' },
  '5b': { short: 'Give', full: 'Give', why: 'Giving once heavy debt is gone.', problem: 'Giving from borrowed money.', unlocks: 'Generosity without guilt.', doneWhen: 'The giving lines reach the percent or amount set.' },
  '6': { short: 'Prepay Retirement', full: 'Prepay retirement', why: 'Quiet Quitting FI, then Coast FI.', problem: 'Retirement depending on working until 65.', unlocks: 'Work becomes a choice, and SPARKS unlocks.', doneWhen: 'Invested reaches Coast FI (or Quiet Quitting FI when that toggle is on).' },
  '7': { short: 'SPARKS Launch', full: 'SPARKS launch window', why: "Take the big swing while you're young.", problem: 'Waiting until you\'re "ready" and missing the window.', unlocks: "The life you'd actually design.", doneWhen: 'A launch move and a month are picked, after Coast FI.' },
  '8': { short: 'Fund the Future', full: 'Fund the future', why: 'Sinking funds for big goals (home, car, kids).', problem: 'Big purchases turning into debt.', unlocks: 'Big life moves paid in cash.', doneWhen: 'Every sinking fund and later income gap is funded.' },
  '9': { short: 'Full Freedom', full: 'Low-rate debt, then FI, then True FI', why: 'Low-rate debt, then FI, then True FI.', problem: 'Still owing anything at the finish line.', unlocks: 'Fully done.', doneWhen: 'No debt, and invested at or past the FI number.' },
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
