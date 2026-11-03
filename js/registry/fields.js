// SPDX-License-Identifier: AGPL-3.0-only
// The field registry: every record type and field SLAM stores, declared once. The spreadsheet export and import
// (js/sheet/) read only this file for the Inputs tabs: one tab per area, one row per record, one column per field.
// A new field lands in the workbook by being added here, and test/coverage.test.js fails until it is: it scans the
// code for every key the app writes.
//
// A field: { key, label, type, sheet }. type is money, pct (stored as a decimal, 7% = 0.07), date (YYYY-MM-DD),
// month (YYYY-MM), day (1 to 31), number, text, choice (with options), yesno (true or false) or list (several values,
// shown comma separated). sheet: true for a column on the area's tab, or { skip: 'why' } when the field stays in the
// app. coach: true marks coach-only notes, left out of the client view export.
//
// where: 'top' for the record's own name, amount and per; 'values' (the default) for record.values; paths inside
// doc parts use dots (variable.lowest is doc.profile.variable.lowest).

import { PERIODS } from '../records.js';

const PERS = PERIODS;
const FREQS = ['week', '2 weeks', 'twice a month', 'month'];
const MONTHS3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YES_NO_WORDS = ['Yes', 'No'];

const f = (key, label, type = 'text', opts = {}) => ({ key, label, type, sheet: true, where: 'values', ...opts });
const top = (key, label, type, opts = {}) => f(key, label, type, { where: 'top', ...opts });
const skip = (key, label, why, opts = {}) => f(key, label, 'text', { sheet: { skip: why }, ...opts });
const pick = (key, label, options, opts = {}) => f(key, label, 'choice', { options, ...opts });
const coachNote = () => top('privateNote', 'Coach notes', 'text', { coach: true });

// The shared top-level fields every record has (blankRecord in js/records.js).
const NAME = top('name', 'Name', 'text');
const AMOUNT = (label = 'Amount') => top('amount', label, 'money');
const PER = (label = 'Per') => top('per', label, 'choice', { options: PERS });
const OWNER = top('owner', 'Owner', 'choice', { options: ['Me', 'Partner', 'Joint'] });
const NOTES = top('notes', 'Notes', 'text');
const STRESS = top('stress', 'Stress (1 to 5)', 'number');
const PAID_WITH = top('paidWith', 'Paid with', 'text', { sheet: { skip: 'points at another row (checking, savings or a card) by its id; set it in SLAM' } });
const LINKED_TO = top('linkedTo', 'Linked to', 'text', { sheet: { skip: 'points at another row by its id (a car loan and its car); set it in SLAM' } });
const SOURCE = top('source', 'Typed from', 'text', { sheet: { skip: 'where a number came from (manual, statement, bank); set by the app' } });
const COVERS = top('covers', 'Paid in advance', 'text', { sheet: { skip: 'a prepayment (date paid and months covered); set it on the Budget line' } });

// Every area is one Inputs tab, in this order. source says where its rows live:
//   records: doc.records of these kinds (one row per record)
//   doc:     one row, from one part of the household file (profile, client, assumptions, settings, spending)
//   list:    rows from a list inside the household file (doc.profile.incomeGaps)
//   months:  one row per Budget line per month (doc.spending.months)
export const AREAS = [
  {
    id: 'profile', prefix: 'Profile', tab: 'Profile', source: 'doc',
    about: 'You and your household. One row.',
    fields: [
      f('client.name', 'Client name', 'text', { part: 'client', key: 'name' }),
      f('firstName', 'First name'), f('lastName', 'Last name'),
      f('age', 'Age', 'number', { named: 'Profile_age' }),
      f('birthMonth', 'Birth month (1 to 12)', 'number'), f('birthYear', 'Birth year', 'number'),
      f('state', 'State', 'text', { named: 'Profile_state' }),
      f('nyc', 'Live in New York City', 'yesno', { named: 'Profile_nyc' }),
      pick('household', 'Solo or couple', ['Solo', 'Couple'], { named: 'Profile_household' }),
      f('partnerName', 'Partner first name'), f('partnerBirthYear', 'Partner birth year', 'number'),
      f('dependents', 'Dependents', 'number'), f('kidAges', 'Kids ages', 'list'),
      pick('workSituation', 'Work situation', ['Employed (W-2)', 'Self-employed', 'Mixed', 'Between jobs', 'Student', 'Retired']),
      pick('incomeStability', 'Income stability', ['Steady', 'Varies', 'Unpredictable']),
      pick('housing', 'Housing', ['Rent', 'Own', 'Family', 'Other']),
      f('roommates', 'Roommates', 'number', { named: 'Profile_roommates' }),
      f('worstCase', 'Worst case: all on me', 'yesno'),
      pick('healthCoverage', 'Health coverage', ['Employer', 'ACA', "Parent's plan", 'Medicaid', 'None', 'Other']),
      f('hasCar', 'Has a car', 'yesno'), f('hasPets', 'Has pets', 'yesno'),
      f('hsaEligible', 'HSA-eligible plan', 'yesno'), f('fsa', 'FSA at work', 'yesno'), f('equityPay', 'Equity pay (ESPP, RSU)', 'yesno'),
      pick('moneyStyle', 'How you run money', ['Joint', 'Separate', 'Mix']),
      f('splitMine', 'Split: my share', 'pct'),
      f('jointAccounts', 'Joint accounts', 'list', { sheet: { skip: 'a list of account ids; tick them on About you' } }),
      f('email', 'Email'), f('phone', 'Phone'),
      f('whyNow', 'What prompted this call'), f('worry', 'Biggest worry'), f('goalWords', 'Goal in their words'),
      f('areas.cash', 'Has cash', 'yesno'), f('areas.investments', 'Has investments', 'yesno'), f('areas.real', 'Has a home or car', 'yesno'), f('areas.debt', 'Has debt', 'yesno'),
      f('noneOfThese', 'None of these (no money areas)', 'yesno'),
      f('counts', 'How many of each', 'text', { sheet: { skip: 'the counts typed on About you only make blank rows; the rows themselves are on each tab' } }),
      // Variable income (Cash flow › Income).
      f('variable.last12', 'Variable income: last 12 months', 'money'),
      f('variable.typical', 'Variable income: typical month', 'money', { named: 'Var_typical' }),
      f('variable.lowest', 'Variable income: lowest month', 'money', { named: 'Var_lowest' }),
      f('variable.setAside', 'Variable income: set aside for taxes', 'pct', { named: 'Var_setAside' }),
      f('variable.business', 'Variable income: business expenses a month', 'money'),
      f('variable.months', 'Variable income: each month', 'list'),
      // Credit (Net worth › Debt).
      f('credit.score', 'Credit score', 'number'), f('credit.source', 'Where you checked it'), f('credit.checked', 'Credit score checked on', 'date'),
      pick('mostOnCards', 'Most spending goes on cards', ['Yes', 'No', 'Some']),
      // Work hours, for the time view (M17).
      f('hours.paidHours', 'Paid hours a month', 'number', { named: 'Hours_paid' }),
      f('hours.commuteHours', 'Commute hours a month', 'number', { named: 'Hours_commute' }),
      f('hours.prepHours', 'Getting-ready hours a month', 'number', { named: 'Hours_prep' }),
      f('hours.workCosts', 'Work costs a month', 'money', { named: 'Hours_costs' }),
      // Plan › FOO.
      f('giving.on', 'Giving first', 'yesno'), pick('giving.mode', 'Giving as', ['pct', 'amount']), f('giving.pct', 'Giving %', 'pct'),
      pick('giving.base', 'Giving % of', ['gross', 'net']), f('giving.amount', 'Giving a month', 'money'),
      pick('keepJobAfterLaunch', 'Keep a job after launch', YES_NO_WORDS),
      f('launch.move', 'Launch move'), f('launch.date', 'Launch month', 'month'),
      f('benefits', 'Employer benefits', 'text', { sheet: { skip: 'a set of benefit answers, each with have it, amount and per; on About you › Benefits' } }),
      f('lifeAdmin', 'Life admin checklist', 'text', { sheet: { skip: 'done / not yet / not for me per item; on Net worth › Protection' } }),
      f('taxHistory', 'Refund history', 'text', { area: 'taxes', sheet: { skip: 'two earlier tax years; on the Taxes tab of SLAM' } }),
      f('later', "I'll find it later", 'text', { sheet: { skip: 'homework flags on profile answers; the Homework list in SLAM' } }),
      f('laterDue', "I'll find it later: due", 'text', { sheet: { skip: 'homework due dates; the Homework list in SLAM' } }),
      f('incomeGaps', 'Income gaps', 'text', { sheet: { skip: 'its own tab: Income gaps' } }),
      f('backups', 'Backups of the backups', 'text', { sheet: { skip: 'its own tab: Backups' } }),
      // Settings that change the math.
      pick('spending.source', 'Spending uses', ['gut', 'lines'], { part: 'spending', key: 'source', named: 'Set_spendingSource' }),
      pick('spending.basis', 'Budget view', ['accrual', 'cash'], { part: 'spending', key: 'basis' }),
      pick('settings.debtOrder', 'Debt payoff order', ['avalanche', 'snowball', 'stress'], { part: 'settings', key: 'debtOrder' }),
      pick('settings.layerMode', 'Cash layers kept', ['virtual', 'accounts'], { part: 'settings', key: 'layerMode' }),
      f('settings.qqOpensLaunch', 'Quiet Quitting FI opens the launch window', 'yesno', { part: 'settings', key: 'qqOpensLaunch' }),
      f('client.couple', 'Couple (from Solo or couple)', 'yesno', { part: 'client', key: 'couple', sheet: { skip: 'set by Solo or couple' } }),
    ],
  },
  {
    id: 'income', prefix: 'Income', tab: 'Income', source: 'records', kinds: { income: 'Income', benefit: 'Other benefit' },
    about: 'Paychecks and other money in, and benefits from work.',
    types: { income: ['Job', 'Partner job', 'Side hustle', 'Self-employed', 'Unemployment', 'Benefits', 'Rental', 'Money from family'] },
    fields: [
      NAME, AMOUNT('Amount'), PER(),
      pick('basis', 'Given as', ['Take-home', 'Gross', 'Both'], { kinds: ['income'] }),
      f('gross', 'Gross a year', 'money', { kinds: ['income'] }),
      pick('payFrequency', 'Pay frequency', FREQS, { kinds: ['income'] }),
      f('payDay', 'Payday (day of month)', 'day', { kinds: ['income'] }),
      f('payDays', 'Paydays (twice a month)', 'list', { kinds: ['income'] }),
      f('nextPayday', 'Next payday', 'date', { kinds: ['income'] }),
      pick('incomeType', 'Tax type', ['W-2', '1099', 'Business', 'Side hustle', 'Rental', 'Benefits', 'Other'], { kinds: ['income'] }),
      f('contributionPct', '401(k) %', 'pct', { kinds: ['income'] }),
      f('k401Paycheck', '401(k) a paycheck', 'money', { kinds: ['income'] }), // Income's first pass at the 401(k)
      pick('hasMatch', 'Employer match?', ['Yes', 'No', "Don't know"], { kinds: ['income'] }),
      f('matchPct', 'Employer match %', 'pct', { kinds: ['income'] }),
      f('matchCapPct', 'Match up to % of pay', 'pct', { kinds: ['income'] }),
      f('bonus', 'Bonus', 'money', { kinds: ['income'] }),
      pick('bonusMonth', 'Bonus month', MONTHS3, { kinds: ['income'] }),
      f('premium', 'Health premium a paycheck', 'money', { kinds: ['income'] }),
      pick('vesting', 'Match vesting', ['Immediate', 'Cliff', 'Graded'], { kinds: ['income'] }),
      f('hsaFsa', 'HSA or FSA a paycheck', 'money', { kinds: ['income'] }),
      f('equity', 'ESPP and RSUs', 'text', { kinds: ['income'] }),
      f('raisePct', 'Raise % a year', 'pct', { kinds: ['income'] }),
      f('otherPretax', 'Other before-tax a paycheck', 'money', { kinds: ['income'] }),
      f('what', 'What it is', 'text', { kinds: ['benefit'] }),
      pick('how', 'How it works', ['Reimbursed', 'Stipend', 'Pretax', 'Match', 'Discount'], { kinds: ['benefit'] }),
      pick('using', 'Using it?', ['Yes', 'No', 'Partly'], { kinds: ['benefit'] }),
      OWNER, NOTES, coachNote(), SOURCE, PAID_WITH, LINKED_TO, COVERS, STRESS,
    ],
  },
  {
    id: 'debt', prefix: 'Debt', tab: 'Debt', source: 'records', kinds: { debt: 'Debt' },
    about: 'Everything you owe.',
    types: { debt: ['Credit card', 'Student loan', 'Car loan', 'Personal loan', 'Mortgage', 'Medical', 'Family or friend', 'Buy now, pay later', 'Payday or cash advance', 'Tax debt', '401(k) loan', 'Business'] },
    fields: [
      NAME, f('balance', 'Balance', 'money'), f('apr', 'APR', 'pct'), f('payment', 'Payment a month', 'money'),
      pick('payChoice', 'Card: pay', ['Minimum', 'Custom', 'In full']),
      f('minimum', 'Minimum payment', 'money'), f('extra', 'Extra a month', 'money'),
      f('limit', 'Credit limit', 'money'), f('dueDay', 'Due day', 'day'), f('statementDay', 'Statement closes on day', 'day'),
      f('autopay', 'Autopay', 'choice', { options: ['Yes', 'No', 'Minimum', 'Full'] }),
      f('rewards', 'Rewards'), f('annualFee', 'Annual fee', 'money'),
      f('bonus', 'Sign-up bonus'), f('bonusSpend', 'Bonus: spend needed', 'money'), f('bonusBy', 'Bonus: spend by', 'date'),
      f('promoApr', 'Promo APR', 'pct'), f('promoEnd', 'Promo ends', 'month'),
      pick('use', 'Personal or business', ['Personal', 'Business']),
      pick('federal', 'Federal or private', ['Federal', 'Private']),
      f('plan', 'Repayment plan'), f('servicer', 'Servicer'),
      pick('pslf', 'PSLF eligible', ['Yes', 'No', 'Not sure']), f('forgiveness', 'Forgiveness', 'yesno', { sheet: { skip: 'an older way to mark forgiveness; PSLF eligible is the one to use' } }),
      pick('forbearance', 'Forbearance or deferment', ['None', 'Forbearance', 'Deferment']),
      f('monthsLeft', 'Months left', 'number'), f('yearsLeft', 'Years left', 'number'), f('paymentsLeft', 'Payments left', 'number'),
      pick('rateType', 'Fixed or adjustable', ['Fixed', 'Adjustable']),
      f('collections', 'In collections', 'yesno'), f('terms', 'Terms agreed'),
      f('fee', 'Fee per period', 'money'), f('periods', 'Periods a year', 'number'),
      f('taxPlan', 'Payment plan in place', 'yesno'), f('guaranteed', 'Personally guaranteed', 'yesno'),
      f('institution', 'Institution'), f('opened', 'Opened', 'month'),
      OWNER, STRESS, NOTES, coachNote(), SOURCE, PAID_WITH, LINKED_TO, COVERS, AMOUNT('Amount (unused)'), PER(),
    ].map(x => (x.key === 'amount' || x.key === 'per' ? { ...x, sheet: { skip: 'a debt uses Balance and Payment' } } : x)),
  },
  {
    id: 'assets', prefix: 'Assets', tab: 'Assets', source: 'records', kinds: { account: 'Account', asset: 'Home or car' },
    about: 'Cash, investments, and things you own.',
    types: {
      account: ['Checking', 'Savings or HYSA', 'Money market', 'CD', 'Cash on hand', '401(k)', '403(b)', '457', 'TSP', 'Roth IRA', 'Traditional IRA', 'Rollover IRA', 'SEP', 'Solo 401(k)', 'HSA', '529', 'Brokerage', 'Crypto', 'Other', 'All investments'],
      asset: ['Car', 'Home', 'Other property', 'Business', 'Valuables', 'Money owed to you'],
    },
    fields: [
      NAME,
      pick('group', 'Cash or investment', ['cash', 'investment'], { kinds: ['account'] }),
      f('balance', 'Balance', 'money', { kinds: ['account'] }),
      f('value', 'Value', 'money', { kinds: ['asset'] }),
      pick('financed', 'Paid off or financed', ['Paid off', 'Financed'], { kinds: ['asset'] }),
      f('pretaxBalance', 'Pretax part', 'money', { kinds: ['account'] }), f('rothBalance', 'Roth part', 'money', { kinds: ['account'] }),
      pick('taxType', 'Pretax, Roth or both', ['Pretax', 'Roth', 'Both'], { kinds: ['account'] }),
      f('unvested', 'Unvested', 'money', { kinds: ['account'] }),
      f('institution', 'Institution', 'text', { kinds: ['account'] }),
      f('apy', 'APY', 'pct', { kinds: ['account'] }), pick('yieldKind', 'APY or 7-day yield', ['APY', '7-day yield'], { kinds: ['account'] }),
      pick('purpose', 'Purpose', ['Emergency', 'Sinking fund', 'Goal', 'General'], { kinds: ['account'] }),
      f('contribution', 'Putting in', 'money', { kinds: ['account'] }),
      pick('contributionPer', 'Putting in per', ['Paycheck', 'Year', 'Month'], { kinds: ['account'] }),
      f('salaryPct', '% of salary', 'pct', { kinds: ['account'] }),
      f('payFrequency', 'Pay frequency', 'choice', { options: FREQS, kinds: ['account'] }),
      pick('rothSplitBy', 'Roth part as', ['Percent', 'Amount'], { kinds: ['account'] }),
      f('rothPct', 'Roth part %', 'pct', { kinds: ['account'] }), f('rothPerPaycheck', 'Roth part a paycheck', 'money', { kinds: ['account'] }),
      pick('vestingSchedule', 'Vesting schedule', ['Immediate', 'Cliff', 'Graded'], { kinds: ['account'] }),
      f('vestYears', 'Fully vested after (years)', 'number', { kinds: ['account'] }),
      f('contributionsYtd', 'Put in this year', 'money', { kinds: ['account'] }),
      f('contributionsToDate', 'Contributions to date', 'money', { kinds: ['account'] }),
      f('costBasis', 'Cost basis', 'money', { kinds: ['account'] }), f('rothBasis', 'Roth contributions so far', 'money', { kinds: ['account'] }),
      f('realized', 'Gains sold this year', 'money', { kinds: ['account'] }), f('dividends', 'Dividends this year', 'money', { kinds: ['account'] }),
      f('shortTerm', 'Short-term gains', 'money', { kinds: ['account'] }), f('longTerm', 'Long-term gains', 'money', { kinds: ['account'] }),
      f('fees', 'Expense ratio', 'pct', { kinds: ['account'] }), f('accountFee', 'Account fee a year', 'money', { kinds: ['account'] }),
      f('asOf', 'Balance as of', 'date', { kinds: ['account'] }), f('last4', 'Last 4 digits', 'text', { kinds: ['account'] }),
      f('autoInvest', 'Auto-invest', 'yesno', { kinds: ['account'] }), f('drip', 'Reinvest dividends', 'yesno', { kinds: ['account'] }),
      pick('beneficiary', 'Beneficiary named', ['Yes', 'No'], { kinds: ['account'] }),
      pick('ownership', 'Individual or joint', ['Individual', 'Joint'], { kinds: ['account'] }),
      pick('hsaStyle', 'HSA: how it is invested', ['Self-directed', 'Managed'], { kinds: ['account'] }),
      f('hsaInvested', 'HSA invested', 'money', { kinds: ['account'] }), f('hsaCash', 'HSA cash', 'money', { kinds: ['account'] }),
      f('cashOk', 'Cash here is on purpose', 'yesno', { kinds: ['account'] }), // turns the uninvested-cash flag off for this account
      f('hsaManagedFee', 'HSA managed fee a year', 'money', { kinds: ['account'] }), f('hsaSelfFee', 'HSA self-directed fee a year', 'money', { kinds: ['account'] }),
      f('hsaYtd', 'HSA put in this year', 'money', { kinds: ['account'] }),
      f('purchasePrice', 'Purchase price', 'money', { kinds: ['asset'] }), f('purchased', 'Purchased', 'month', { kinds: ['asset'] }),
      f('propertyTax', 'Property tax a month', 'money', { kinds: ['asset'] }), f('homeInsurance', 'Home insurance a month', 'money', { kinds: ['asset'] }),
      f('hoa', 'HOA a month', 'money', { kinds: ['asset'] }),
      f('positions', 'Holdings', 'text', { kinds: ['account'], sheet: { skip: 'a table of holdings inside one account; edit it in SLAM (Inside this account)' } }),
      f('allocation', 'Allocation', 'text', { kinds: ['account'], sheet: { skip: 'a mix of asset classes inside one account; edit it in SLAM' } }),
      f('target', 'Target allocation', 'text', { kinds: ['account'], sheet: { skip: 'a mix of asset classes inside one account; edit it in SLAM' } }),
      f('targetOn', 'Target allocation on', 'yesno', { kinds: ['account'], sheet: { skip: 'goes with the target allocation' } }),
      f('tags', 'Tags', 'list', { kinds: ['account'] }),
      f('matchTiers', 'Match tiers', 'text', { kinds: ['account'], sheet: { skip: 'a table of match tiers on the 401(k); the first tier is on Income as match % and up to %' } }),
      f('rothLog', 'Roth IRA log', 'text', { kinds: ['account'], sheet: { skip: 'a dated list of Roth IRA contributions; edit it in SLAM' } }),
      OWNER, NOTES, coachNote(), STRESS, SOURCE, PAID_WITH, LINKED_TO, COVERS, AMOUNT('Amount (unused)'), PER(),
    ].map(x => (x.key === 'amount' || x.key === 'per' ? { ...x, sheet: { skip: 'an account uses Balance, a thing you own uses Value' } } : x)),
  },
  {
    id: 'protection', prefix: 'Protection', tab: 'Protection', source: 'records', kinds: { coverage: 'Coverage' },
    about: 'Insurance: health, life, disability, home or renters, car, umbrella.',
    types: { coverage: ['Health', 'Life', 'Disability', 'Renters or home', 'Car', 'Umbrella'] },
    fields: [
      NAME, pick('have', 'Have it?', ['Have it', "Don't", 'Not sure']), AMOUNT('Premium'), PER('Premium per'),
      pick('paidFrom', 'Paid from', ['Paycheck', 'Budget']),
      f('paidFromJob', 'Paid from which job', 'text', { sheet: { skip: 'points at a job row by its id; set it in SLAM' } }),
      f('employer', 'Through employer', 'yesno'),
      f('deductible', 'Deductible in-network', 'money'), f('deductibleOut', 'Deductible out-of-network', 'money'),
      f('oopMax', 'Out-of-pocket max in-network', 'money'), f('oopMaxOut', 'Out-of-pocket max out-of-network', 'money'),
      f('copayPcp', 'Copay: doctor', 'money'), f('copaySpecialist', 'Copay: specialist', 'money'), f('copayUrgent', 'Copay: urgent care', 'money'),
      pick('term', 'Short-term or long-term', ['Short-term', 'Long-term']),
      f('benefitPct', 'Pays this share of your pay', 'pct'), f('duration', 'Pays for how long'), f('waiting', 'Waiting period'),
      f('coverage', 'Coverage amount', 'money'), f('plannedChange', 'Planned change'),
      f('notSame', 'Not the same as a Budget line', 'yesno', { sheet: { skip: 'an answer to Same as your ...?; asked in SLAM' } }),
      f('sameAs', 'Same as a Budget line', 'text', { sheet: { skip: 'an answer to Same as your ...?; asked in SLAM' } }),
      OWNER, NOTES, coachNote(), STRESS, SOURCE, PAID_WITH, LINKED_TO, COVERS,
    ],
  },
  {
    id: 'taxes', prefix: 'Taxes', tab: 'Taxes', source: 'doc',
    about: 'How you file and what happened last year. One row.',
    fields: [
      pick('filingStatus', 'Filing status', ['Single', 'Married jointly', 'Married separately', 'Head of household'], { named: 'Tax_filingStatus' }),
      pick('lastYearTax', 'Last tax year: refund or owed', ['Refund', 'Owed', "Don't know"]),
      f('lastYearAmount', 'Last tax year: amount', 'money'),
      pick('w4Status', 'W-4 filing status', ['Single or married filing separately', 'Married filing jointly', 'Head of household']),
      f('w4Extra', 'Extra withheld a paycheck', 'money'),
      f('quarterlyPaid', 'Quarterly estimates paid this year', 'money'),
    ],
  },
  {
    id: 'spending', prefix: 'Spend', tab: 'Spending lines', source: 'records', kinds: { bill: 'Budget line', spending: 'Gut number' },
    about: 'Every Budget line, and the one gut number for all spending.',
    fields: [
      NAME, AMOUNT('Amount'), PER(),
      f('category', 'Category', 'text', { kinds: ['bill'] }),
      pick('draftt', 'DRAFTT letter', ['Debt', 'Retirement', 'Accommodation', 'Food', 'Transportation', 'Taxes', 'Therapy'], { kinds: ['bill'] }),
      pick('amountType', 'Amount is', ['Fixed', 'Variable', 'Range'], { kinds: ['bill'] }),
      f('low', 'Range: low', 'money', { kinds: ['bill'] }), f('high', 'Range: high', 'money', { kinds: ['bill'] }),
      pick('timing', 'Date is', ['Fixed date', 'Any time', 'Spread out'], { kinds: ['bill'] }),
      f('dueDay', 'Due day', 'day', { kinds: ['bill'] }),
      pick('whoPays', 'Who pays', ['Me', 'Split', 'My share', 'Covered by someone', 'Included in rent', 'N/A', 'Not for me'], { kinds: ['bill'] }),
      f('coveredBy', 'Who covers it', 'text', { kinds: ['bill'] }),
      f('myShare', 'My share', 'money', { kinds: ['bill'] }), f('splitBy', 'Split by', 'number', { kinds: ['bill'] }),
      f('takeover', 'Becomes mine in', 'month', { kinds: ['bill'] }),
      f('irregular', 'Irregular (once or a few times a year)', 'yesno', { kinds: ['bill'] }),
      pick('monthDue', 'Month due', MONTHS3, { kinds: ['bill'] }),
      f('timesYear', 'How many a year', 'number', { kinds: ['bill'] }), f('costEach', 'Cost each', 'money', { kinds: ['bill'] }),
      f('trip', 'A trip or flight', 'yesno', { kinds: ['bill'] }),
      f('sinking', 'Save for it each month', 'yesno', { kinds: ['bill'] }),
      f('sinkingFund', 'Sinking fund account', 'text', { kinds: ['bill'], sheet: { skip: 'points at an account row by its id; set it in SLAM' } }),
      f('fundTag', 'Purpose tag', 'text', { kinds: ['bill'] }),
      f('joy', 'Bedazzle (a joy line)', 'yesno', { kinds: ['bill'] }),
      pick('decision', 'Looking for savings', ['Keep', 'Cut', 'Lower', 'Look into it'], { kinds: ['bill'] }),
      f('target', 'Target or cap a month', 'money', { kinds: ['bill'] }),
      f('tags', 'Tags', 'list', { kinds: ['bill'] }),
      f('group', 'Group', 'text', { kinds: ['bill'] }),
      f('preset', 'Started from a guess', 'yesno', { kinds: ['bill'], sheet: { skip: 'marks a starter guess; set by the app' } }),
      f('autoFrom', 'From another row', 'text', { kinds: ['bill'], sheet: { skip: 'set by the app' } }),
      f('notSame', 'Not the same as a debt or premium', 'yesno', { kinds: ['bill'], sheet: { skip: 'an answer to Same as your ...?; asked in SLAM' } }),
      f('sameAs', 'Same as a debt or premium', 'text', { kinds: ['bill'], sheet: { skip: 'an answer to Same as your ...?; asked in SLAM' } }),
      f('includesDebtPayments', 'Includes debt payments', 'yesno', { kinds: ['spending'] }),
      f('pass', 'Budget pass', 'text', { kinds: ['spending'], sheet: { skip: 'which Budget pass the gut number came from; set by the app' } }),
      f('maaser', 'Maaser line', 'yesno', { kinds: ['bill'], sheet: { skip: 'set by the community preset' } }),
      OWNER, STRESS, NOTES, coachNote(), SOURCE, PAID_WITH, LINKED_TO, COVERS,
    ],
  },
  {
    id: 'calendar', prefix: 'Cal', tab: 'Calendar entries', source: 'records', kinds: { entry: 'Entry', win: 'Win' },
    about: 'One-off money in and out on the calendar, and wins.',
    types: { entry: ['Money in', 'Money out', 'Maybe'], win: ['Win'] },
    fields: [
      NAME, AMOUNT(), f('date', 'Date', 'date'),
      pick('direction', 'In or out', ['In', 'Out', 'Maybe'], { kinds: ['entry'] }),
      pick('repeats', 'Repeats', ['Never', 'Weekly', 'Every 2 weeks', 'Twice a month', 'Monthly', 'Yearly'], { kinds: ['entry'] }),
      f('endsOn', 'Ends on', 'date', { kinds: ['entry'] }),
      f('category', 'Counts as', 'text', { kinds: ['entry'] }),
      f('lineId', 'Budget line', 'text', { kinds: ['entry'], sheet: { skip: 'points at a Budget line by its id; pick it in SLAM' } }),
      NOTES, coachNote(), PER(), OWNER, STRESS, SOURCE, PAID_WITH, LINKED_TO, COVERS,
    ].map(x => (['per', 'owner', 'stress'].includes(x.key) ? { ...x, sheet: { skip: 'not used on calendar entries' } } : x)),
  },
  {
    id: 'goals', prefix: 'Goals', tab: 'Goals and events', source: 'records', kinds: { milestone: 'Milestone', event: 'Event' },
    about: 'Milestones on Plan, and dated events in your year.',
    types: { milestone: ['Lean FI', 'Coast FI', 'Barista FI', 'Regular FI', 'Fat FI', 'Debt free', 'Custom'] },
    fields: [
      NAME, AMOUNT('Amount'),
      pick('mode', 'At a date or when true', ['date', 'condition'], { kinds: ['milestone'] }),
      f('date', 'Date', 'date'),
      f('condition', 'When this is true', 'text', { kinds: ['milestone'] }),
      pick('month', 'Month', MONTHS3, { kinds: ['event'] }), f('day', 'Day of the month', 'day', { kinds: ['event'] }),
      f('rentIncrease', 'Rent goes up by, a month', 'money', { kinds: ['event'] }),
      f('saved', 'Saved so far', 'money', { kinds: ['event'] }),
      f('sinking', 'Save for it each month', 'yesno', { kinds: ['event'] }),
      f('sinkingFund', 'Sinking fund account', 'text', { kinds: ['event'], sheet: { skip: 'points at an account row by its id; set it in SLAM' } }),
      f('fundTag', 'Purpose tag', 'text', { kinds: ['event'] }),
      f('coverageId', 'For this coverage', 'text', { kinds: ['event'], sheet: { skip: 'points at a Protection row by its id; set by Add the usual dates' } }),
      NOTES, coachNote(), PER(), OWNER, STRESS, SOURCE, PAID_WITH, LINKED_TO, COVERS,
    ].map(x => (['per', 'owner', 'stress'].includes(x.key) ? { ...x, sheet: { skip: 'not used on goals and events' } } : x)),
  },
  {
    id: 'gaps', prefix: 'Gaps', tab: 'Income gaps', source: 'list', part: 'profile', path: 'incomeGaps',
    about: 'Dated months with less or no income (cash layer 2).',
    fields: [f('name', 'What is the gap'), f('start', 'Starts', 'month'), f('months', 'Months', 'number')],
  },
  {
    id: 'backups', prefix: 'Backups', tab: 'Backups', source: 'list', part: 'profile', path: 'backups', keyField: 'kind',
    about: 'Dollars you could lean on if cash ran out. They add months of runway; never counted as a fund.',
    fields: [pick('kind', 'Backup', ['Unemployment benefits', 'Disability coverage', 'Available credit', 'What you could cut', 'Family help']), f('amount', 'Dollars', 'money')],
  },
  {
    id: 'months', prefix: 'Months', tab: 'Budget months', source: 'months',
    about: 'Each Budget line, month by month: the plan for that month and what it really was.',
    fields: [f('estimate', 'Plan this month', 'money'), f('actual', 'Actual', 'money')],
  },
];

// The record kinds the app stores, each in exactly one area (checked by test/coverage.test.js).
export const KINDS = Object.fromEntries(AREAS.filter(a => a.source === 'records').flatMap(a => Object.keys(a.kinds).map(k => [k, a.id])));

// Doc parts whose keys are not money inputs and stay in the app (also checked by the test).
export const NOT_IN_SHEET = {
  'settings.timeView': 'the $ / Hours / FI days view, a screen setting',
  'settings.fastTrack': 'the last Fast Track run, kept to compare',
  'settings.presetsAdded': 'marks that the starter lines were added once',
  'settings.layerAccounts': 'which account holds each cash layer; set on Cash layers',
  'spending.basics': 'Fast Track totals, kept to compare with the lines',
  'spending.calendar': 'calendar marks (paid, moved, partial) and the starting balance; set on the calendar',
  'spending.months.closed': 'month-end close state; set on Month end',
  'spending.months.statements': 'statement balances typed at month end; set on Month end',
  'spending.months.summary': 'the month-end summary; set on Month end',
  session: 'session agenda, notes, feelings and the one-pager; not money',
  'session.feedback': 'Report this notes (coach only; the Coach notes tab when coach-only is ticked)',
  'session.timer': 'the onboarding timer (coach only; the Coach notes tab when coach-only is ticked)',
  history: 'dated history of every change; kept in the app and the backup file',
  snapshots: 'snapshots for change since last session; kept in the app and the backup file',
  parking: 'parking lot notes; kept in the app and the backup file',
};

// Every field of an area that a record of this kind can carry.
export const fieldsFor = (area, kind = null) => area.fields.filter(x => !x.kinds || !kind || x.kinds.includes(kind));
export const sheetFields = (area, { coach = false } = {}) => area.fields.filter(x => x.sheet === true && (coach || !x.coach));
export const areaOf = id => AREAS.find(a => a.id === id);

// Every field's id (area.key, with its doc part when it is not the area's own) and area, set once here.
for (const a of AREAS) for (const f of a.fields) { f.area = a.id; f.id = `${a.id}.${f.part && f.part !== (a.part ?? 'profile') ? `${f.part}.` : ''}${f.key}`; }

// What a field must say to be in the registry. Returns one plain sentence per problem (the coverage test shows them).
export const FIELD_TYPES = ['money', 'pct', 'date', 'month', 'day', 'number', 'text', 'choice', 'yesno', 'list'];
export function fieldProblems(areas = AREAS) {
  const out = [];
  for (const a of areas) {
    if (!a.id || !a.tab || !a.prefix || !a.source || !a.about) out.push(`Area ${a.id ?? '?'}: needs id, tab, prefix, source and about.`);
    if (a.tab && (a.tab.length > 31 || /[[\]:*?/\\]/.test(a.tab))) out.push(`Area ${a.id}: "${a.tab}" is not a tab name Excel accepts.`);
    const seen = new Set();
    for (const f of a.fields) {
      const name = `${a.tab} › ${f.label ?? f.key}`;
      if (!f.key || !f.label) out.push(`${name}: needs a key and a label.`);
      if (!FIELD_TYPES.includes(f.type)) out.push(`${name}: type must be one of ${FIELD_TYPES.join(', ')}.`);
      if (!(f.sheet === true || (f.sheet?.skip && String(f.sheet.skip).length > 10))) out.push(`${name}: has no sheet info. Give it sheet: true (a column on ${a.tab}) or sheet: { skip: 'the reason it stays in the app' }.`);
      if (f.type === 'choice' && !f.options?.length) out.push(`${name}: a choice needs its options.`);
      const id = `${f.part ?? ''}.${f.key}`;
      if (seen.has(id)) out.push(`${name}: declared twice.`);
      seen.add(id);
    }
  }
  return out;
}
