// SPDX-License-Identifier: AGPL-3.0-only
// The FOO registry (Phase 3, batch 3): SLAM's own order of operations, and what each step needs before it opens.
// A step can declare a prerequisite step (reached first) and conditions on the numbers; a locked step shows a lock
// and its plain reason, never counts as where you are, and a coach can unlock it anyway with a note (kept on the
// session record) while the cost shows in FI days. js/math/foo.js reads this; the spec's Program tab mirrors it.

// The order. Giving sits at the tax-free step in the list, but its only
// prerequisite is no heavy debt (overnight answer 5, Nov 6): it may open before the Roth step.
export const ORDER = ['0b', '1', '2', '3', '4', '5', '5b', '6', '7', '8', '9'];
// Batch 11 (item 4): every step has one name, said three ways everywhere it shows: the headline (a plain action, on
// the tile and as the step's name), then "Name · specifics", then "→ what you get". Eli's exact words; edit them here.
export const STEP_NAMES = {
  '0b': { headline: 'Spend on what you love', name: 'Joy Basics', specifics: 'Pick the few things worth spending on', get: "A plan that doesn't feel like a diet" },
  '1': { headline: 'Stop going backwards', name: 'Stop the Bleeding', specifics: 'Spend less than you make; little e = $1,000 or your highest deductible, whichever is smaller', get: 'Small surprises stop turning into new debt' },
  '2': { headline: 'Get the full match', name: 'Free Money', specifics: 'Contribute enough to get every dollar of the employer match', get: 'An instant 50 to 100% return' },
  '3': { headline: 'Pay off high-interest debt', name: 'Heavy Debt', specifics: 'Every debt at 8% or more, surplus first', get: 'That interest stops, and those payments become yours' },
  '4': { headline: 'Build your job-loss fund', name: 'big e', specifics: 'Your age divided by 5 months of spending', get: 'A job loss is a plan, not a panic' },
  '5': { headline: 'Max out tax-free accounts', name: 'Tax-Free Growth', specifics: 'Roth IRA and HSA, to the limit', get: 'Money that grows and comes out tax-free' },
  '5b': { headline: 'Give', name: 'Give', specifics: 'A % or amount, once heavy debt is gone', get: "Generosity that doesn't put you at risk" },
  '6': { headline: 'Prepay retirement', name: 'Coast FI', specifics: 'Invest until retirement grows on its own', get: "Work becomes optional for retirement's sake" },
  '7': { headline: 'Go all in on your thing', name: 'SPARKS Launch', specifics: 'Leave the job, top up the Roth yearly', get: 'Your time goes to what you want to build' },
  '8': { headline: 'Pay for the next big goals', name: 'Fund the Future', specifics: 'Home, kids, travel', get: 'The next life stage is already paid for' },
  '9': { headline: 'Make work optional', name: 'Full Freedom', specifics: 'Reach your FI number', get: 'Work is fully optional' },
};
export const stepHeadline = id => STEP_NAMES[id]?.headline ?? id;
export const stepSub = id => (STEP_NAMES[id] ? `${STEP_NAMES[id].name} · ${STEP_NAMES[id].specifics}` : '');
export const stepGet = id => (STEP_NAMES[id] ? `→ ${STEP_NAMES[id].get}` : '');
// What each step covers in the math (the spec's Program tab): the headline, the name and specifics, then the detail.
const DETAIL = {
  '0b': 'the joy lines (goals and mindset live here too)',
  '1': 'no late bills, payday debt at $0, little e full, income gaps within 12 months covered',
  '2': 'the full employer match',
  '3': 'cards, payday, personal, medical, BNPL, or any APR at or over the heavy line (8%); the surplus goes here first while any is carried (the debt rule)',
  '4': 'the Rule of 5, FAT first, then DRAFTT, then full spending',
  '5': 'a Roth IRA and an invested HSA, maxed for the year',
  '5b': 'off by default; opens once heavy debt is paid off, even before the tax-free step',
  '6': 'Quiet Quitting FI, then Coast FI (maxing the 401(k) is the lever)',
  '7': 'opens at Coast FI (or Quiet Quitting FI when that toggle is on), strictly after step 6',
  '8': 'sinking funds and later income gaps',
  '9': 'low-rate debt, then FI, then True FI',
};
export const STEP_WORDS = Object.fromEntries(ORDER.map(id => [id, `${stepHeadline(id)} (${stepSub(id)}): ${DETAIL[id]}`]));
// Item 31 (batch 6): what each tile says. short is the headline (with the number on the tile); the card on hover or tap:
// full (Name · specifics), one line of why, the problem it solves, what you get, done when.
const CARD_MORE = {
  '0b': { why: 'Fund the few things that make daily life good.', problem: 'Budgets that cut everything feel like punishment, and people quit.', doneWhen: 'The joy lines are picked and funded.' },
  '1': { why: 'Bills current, no payday debt, little e full, income gaps covered.', problem: 'One surprise turns into late fees and new debt.', doneWhen: 'No late bill, payday debt at $0, little e full, any gap within 12 months covered.' },
  '2': { why: 'Get the full employer match.', problem: 'Leaving an instant 50 to 100% return on the table.', doneWhen: 'Putting in enough to get the whole match (or no match is offered).' },
  '3': { why: 'Pay off everything at 8% or more, with the surplus going there first.', problem: 'Interest working against you faster than investing works for you.', doneWhen: 'No debt at or over the heavy line.' },
  '4': { why: 'Your age divided by 5 is the months of spending saved.', problem: 'A job loss forcing new debt or selling investments at a bad time.', doneWhen: 'Every big e layer (FAT, DRAFTT, full) is full.' },
  '5': { why: 'Max the Roth IRA and the HSA.', problem: 'Paying tax on decades of growth.', doneWhen: 'The Roth IRA (and the HSA, when eligible) is maxed for the year.' },
  '5b': { why: 'Giving once heavy debt is gone. Oxygen mask on you first.', problem: 'Giving from borrowed money.', doneWhen: 'The giving lines reach the percent or amount set.' },
  '6': { why: 'Quiet Quitting FI, then Coast FI.', problem: 'Retirement depending on working until 65.', doneWhen: 'Invested reaches Coast FI (or Quiet Quitting FI when that toggle is on).' },
  '7': { why: "Take the big swing while you're young.", problem: 'Waiting until you\'re "ready" and missing the window.', doneWhen: 'A launch move and a month are picked, after Coast FI.' },
  '8': { why: 'Sinking funds for big goals.', problem: 'Big purchases turning into debt.', doneWhen: 'Every sinking fund and later income gap is funded.' },
  '9': { why: 'Low-rate debt, then FI, then True FI.', problem: 'Still owing anything at the finish line.', doneWhen: 'No debt, and invested at or past the FI number.' },
};
export const STEP_CARDS = Object.fromEntries(ORDER.map(id => [id, { short: stepHeadline(id), full: stepSub(id), ...CARD_MORE[id], unlocks: STEP_NAMES[id].get }]));
// Prerequisites: after is the step that must be reached first (every step before it done); conditions are tests on
// the numbers (CONDITIONS). A locked step's lock text is label, with any failed condition added.
export const PREREQS = {
  '5b': { conditions: ['noHeavyDebt'], label: 'Giving unlocks once heavy debt is paid off. Oxygen mask on you first.' }, // no after: heavy debt is the only prerequisite
  '7': { after: '6', label: 'The launch window opens at Coast FI (or Quiet Quitting FI when that toggle is on). Coast FI first, then SPARKS.' },
};
export const CONDITIONS = {
  noHeavyDebt: { label: 'no debt at or above the heavy-debt APR', test: f => !f.heavy.length },
};
