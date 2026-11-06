// SPDX-License-Identifier: AGPL-3.0-only
// The field registry: every record type and field SLAM stores, declared once. The spreadsheet export and import
// (js/sheet/) read only this file for the Inputs tabs: one tab per area, one row per record, one column per field.
// A new field lands in the workbook by being added here, and test/coverage.test.js fails until it is: it scans the
// code for every key the app writes.
//
// A field: { key, label, type, sheet }. type is money, pct (stored as a decimal, 7% = 0.07), date (YYYY-MM-DD),
// month (YYYY-MM), day (1 to 31), number, text, choice (with options), yesno (true or false) or list (several values,
// shown comma separated). sheet: true for a column on the area's tab, or { skip: 'why' } when the field stays in the
// app. coach: true marks coach-only notes, left out of the client view export. unused: true marks a shared field a
// record of this area never has (a debt has no Amount), so the spec needs no row for it.
//
// where: 'top' for the record's own name, amount and per; 'values' (the default) for record.values; paths inside
// doc parts use dots (variable.lowest is doc.profile.variable.lowest).

import { PERIODS } from '../records.js';
import { LISTS } from './assumptions.js';

const PERS = PERIODS;
const FREQS = ['week', '2 weeks', 'twice a month', 'month'];
const MONTHS3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YES_NO_WORDS = ['Yes', 'No'];
// Batch 55 (QUESTIONS 400): the savings types. "Savings or HYSA" split in two; every older row reads as Savings
// (js/records.js migrate), and the second starts on Another bank in the fire drill like an online bank's name.
export const SAVINGS_TYPES = ['Savings', 'High-yield savings (often online)'];

const f = (key, label, type = 'text', opts = {}) => ({ key, label, type, sheet: true, where: 'values', ...opts });
const top = (key, label, type, opts = {}) => f(key, label, type, { where: 'top', ...opts });
const skip = (key, label, why, opts = {}) => f(key, label, 'text', { sheet: { skip: why }, ...opts });
const pick = (key, label, options, opts = {}) => f(key, label, 'choice', { options, ...opts });
const coachNote = () => top('privateNote', 'Coach notes', 'text', { coach: true });
// Batch 28 (js/privacy.js): who sees a row and its notes, and the neutral name a private row takes in anything shared.
// Blank is Everyone. Every record kind carries them.
const SEEN_F = [
  f('seen', 'Who sees this (blank: everyone)', 'choice', { options: LISTS.privacy.seen }),
  f('notesSeen', 'Who sees its notes (blank: as the row)', 'choice', { options: LISTS.privacy.seen }),
  f('shareName', 'Name when shared', 'choice', { options: LISTS.privacy.shareNames }),
];
// Batch 55 (js/math/control.js): the money-control map's taps on an account, a card, a loan and a paycheck. Private by
// design: the workbook leaves them out, and js/privacy.js takes them out of a partner's view and anything shared.
const CTL_WHY = 'batch 55: the money-control map, private by design: never in the workbook, a partner\'s view or anything shared (js/privacy.js); set on Net worth › Money control';
const CTL = (opts = {}) => [
  f('ctlOn', 'Money control: who else is on it, and as what', 'text', { sheet: { skip: CTL_WHY }, ...opts }),
  f('ctlMail', 'Money control: where its statements go', 'choice', { options: ['Me', 'Shared', 'Partner', 'P3', 'P4', 'P5', 'P6', 'P7', 'Other'], sheet: { skip: CTL_WHY }, ...opts }),
  f('ctlLogin', 'Money control: who has the login', 'choice', { options: ['Me', 'Shared', 'Partner', 'P3', 'P4', 'P5', 'P6', 'P7', 'Other', 'None'], sheet: { skip: CTL_WHY }, ...opts }),
  f('ctlSees', 'Money control: who can see it', 'list', { sheet: { skip: CTL_WHY }, ...opts }),
  f('ctlMoves', 'Money control: who can move money out', 'list', { sheet: { skip: CTL_WHY }, ...opts }),
  f('ctlStops', 'Money control: who can freeze or close it', 'list', { sheet: { skip: CTL_WHY }, ...opts }),
];
// The next check date for a rough or aged number (js/checks.js): set it to check sooner or later than the rule.
const CHECK = f('checkOn', 'Check again on', 'date');

// The shared top-level fields every record has (blankRecord in js/records.js).
const NAME = top('name', 'Name', 'text');
const AMOUNT = (label = 'Amount') => top('amount', label, 'money');
const PER = (label = 'Per') => top('per', label, 'choice', { options: PERS });
const OWNER = top('owner', 'Owner', 'choice', { options: ['Me', 'Partner', 'Joint', 'P3', 'P4', 'P5', 'P6', 'P7'] }); // batch 49: P3 to P7 are the adults past the couple (About you › People)
// Batch 49 (households of any size, M9N): how a shared row is split among the adults in the plan. Blank: everyone, as About you says (By income, else equally).
const SPLIT_F = [
  f('splitAmong', 'Shared among (blank: everyone in the plan)', 'list'),
  pick('splitHow', 'Split how (blank: as About you says)', ['Equal', 'Percent', 'By income']),
  f('splitPcts', 'Split by percent: each adult\'s part', 'text', { sheet: { skip: 'one percent per adult (an id and a share); set on the row\'s Owner chip in SLAM. Each person\'s part counts in their own view only; the household books count the whole row' } }),
];
const NOTES = top('notes', 'Notes', 'text');
const STRESS = top('stress', 'Stress (1 to 5)', 'number');
const PAID_WITH = top('paidWith', 'Paid with', 'text', { sheet: { skip: 'points at another row (checking, savings or a card) by its id; set it in SLAM' } });
const LINKED_TO = top('linkedTo', 'Linked to', 'text', { sheet: { skip: 'points at another row by its id (a car loan and its car); set it in SLAM' } });
const SOURCE = top('source', 'Typed from', 'text', { sheet: { skip: 'where a number came from (manual, statement, bank); set by the app' } });
const COVERS = top('covers', 'Paid in advance', 'text', { sheet: { skip: 'a prepayment (date paid and months covered); set it on the Budget line' } });
// Locked: the coach confirmed this row's number (its level is Actual for the Picture %, Phase 3).
const LOCKED = () => f('locked', 'Locked (confirmed)', 'yesno');

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
      f('nycArea', 'NYC area (blank: as Live in New York City)', 'yesno'), // batch 60 (QUESTIONS 432): the typical numbers read the NY metro's rows
      pick('household', 'Solo or couple', ['Solo', 'Couple'], { named: 'Profile_household' }),
      pick('mode', 'Household mode', ['Solo', 'Dating', 'Living together', 'Engaged', 'Married separate', 'Married merged']), // F2: sets Solo or couple, the default view and the filing status (js/registry/couples.js)
      pick('splitMethod', 'Shared bills split', ['50/50', 'By income']), // F2: By income uses each person's take-home as the share when none is typed
      f('partnerName', 'Partner first name'), f('partnerBirthYear', 'Partner birth year', 'number'),
      f('dependents', 'Dependents', 'number'), f('kidAges', 'Kids ages', 'list'),
      pick('workSituation', 'Work situation', ['Employed (W-2)', 'Self-employed', 'Mixed', 'Between jobs', 'Student', 'Retired']),
      pick('incomeStability', 'Income stability', ['Steady', 'Varies', 'Unpredictable'], { named: 'Profile_incomeStability' }),
      f('bigEMultiplier', 'big e multiplier (blank: from income stability)', 'number', { named: 'Profile_bigEMultiplier' }), // answer 172: age / 5 x this
      pick('housing', 'Housing', ['Rent', 'Own', 'Family', 'Other']),
      f('roommates', 'Roommates', 'number', { named: 'Profile_roommates' }),
      f('worstCase', 'Worst case: all on me', 'yesno'),
      f('splitWays', 'Split shared bills N ways (you included)', 'number', { named: 'Profile_splitWays' }), // batch 5 (E4): replaces Splitting with (people besides you)
      f('shared.rent', 'Shared: rent or mortgage', 'yesno'), f('shared.utilities', 'Shared: electric, gas, water', 'yesno'),
      f('shared.internet', 'Shared: internet and phone', 'yesno'), f('shared.renters', 'Shared: renters or home insurance', 'yesno'),
      f('shared.groceries', 'Shared: groceries', 'yesno'), f('shared.household', 'Shared: household supplies', 'yesno'),
      // Batch 5 (E1): per bill, is the amount typed your share or the whole bill (replaces the one "usually given as").
      pick('sharedAs.rent', 'Rent or mortgage given as', ['Your share', 'The whole bill']), pick('sharedAs.utilities', 'Electric, gas, water given as', ['Your share', 'The whole bill']),
      pick('sharedAs.internet', 'Internet and phone given as', ['Your share', 'The whole bill']), pick('sharedAs.renters', 'Renters or home insurance given as', ['Your share', 'The whole bill']),
      pick('sharedAs.groceries', 'Groceries given as', ['Your share', 'The whole bill']), pick('sharedAs.household', 'Household supplies given as', ['Your share', 'The whole bill']),
      pick('healthCoverage', 'Health coverage', ['Employer', 'ACA', "Parent's plan", 'Medicaid', 'None', 'Other']),
      f('hasCar', 'Has a car', 'yesno'), f('hasPets', 'Has pets', 'yesno'),
      f('hsaEligible', 'HSA-eligible plan', 'yesno'), f('fsa', 'FSA at work', 'yesno'), f('equityPay', 'Equity pay (ESPP, RSU)', 'yesno'),
      pick('moneyStyle', 'How you run money', ['Joint', 'Separate', 'Mix']),
      f('splitMine', 'Split: my share', 'pct'),
      f('jointAccounts', 'Joint accounts', 'list', { sheet: { skip: 'a list of account ids; tick them on About you' } }),
      f('email', 'Email'), f('phone', 'Phone'),
      f('whyNow', 'What prompted this call'), f('worry', 'Biggest worry'), f('goalWords', 'Goal in their words'),
      // Batch 10: Why now as chips (several each), a star on the main one, and Other's own words. The text boxes above stay.
      f('chips.whyNow', 'What prompted this call: chips', 'list'), f('chips.worry', 'Biggest worry: chips', 'list'), f('chips.goalWords', 'Goal: chips', 'list'),
      f('chipStar.whyNow', 'What prompted this call: the main one', 'text'), f('chipStar.worry', 'Biggest worry: the main one', 'text'), f('chipStar.goalWords', 'Goal: the main one', 'text'),
      f('chipOther.whyNow', 'What prompted this call: Other', 'text'), f('chipOther.worry', 'Biggest worry: Other', 'text'), f('chipOther.goalWords', 'Goal: Other', 'text'),
      f('goalSuggest', 'Goal suggestions set aside', 'list', { sheet: { skip: 'which goal chip suggestions the coach set aside on Plan › Goals; set in SLAM' } }),
      // Batch 25 (Phase 4): who they are with money, on Coach tools › Discovery (js/math/identity.js, M95). Tap answers only; the codes are worked out.
      f('identity.address', 'FI Address taps', 'text', { sheet: { skip: 'tap answers (how money feels, can earn more, can spend less, chosen or imposed, modifiers) on Coach tools › Discovery; the four-character address is worked out (M95)' } }),
      f('identity.letters', 'Personality letters answers', 'text', { sheet: { skip: 'twelve Agree, Neutral or Disagree taps per person on Coach tools › Discovery; the four letters are worked out (M95)' } }),
      f('identity.tilt', 'Skill trees the letters lead with', 'list', { sheet: { skip: 'the 25 skill tree ids ranked by the letters (M95), kept for the library on Plan › FOO; set by the app' } }),
      f('identity.later', 'Who they are with money: do this later', 'yesno', { sheet: { skip: 'Do this later on Fast Track; set in SLAM' } }),
      // Batch 26 (the library's first slice, M9K): the skills marked done with one tap on Plan › FOO (by the coach or the client, with the date). Skills the data proves are not stored.
      f('library', 'Skills done (the library)', 'text', { sheet: { skip: 'one entry per skill id marked Done on Plan › FOO (done, by, on); the skills the data proves tick themselves (M9K)' } }),
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
      f('credit.scorePartner', 'Credit score (partner)', 'number'), f('credit.sourcePartner', 'Where the partner checked it'), f('credit.checkedPartner', 'Partner score checked on', 'date'), // item 34: per person
      f('credit.latePayments', 'Late payments in the last 2 years', 'yesno'), f('credit.lateCount', 'How many late payments', 'number'),
      f('credit.oldestAccountYears', 'Age of oldest account (years)', 'number'), f('credit.inquiries', 'Hard inquiries in the last 2 years', 'number'), // batch 11: two years, as the bureaus keep them
      f('credit.freezeEquifax', 'Credit freeze at Equifax', 'yesno'), f('credit.freezeExperian', 'Credit freeze at Experian', 'yesno'), f('credit.freezeTransUnion', 'Credit freeze at TransUnion', 'yesno'), // batch 11 (item 6)
      // Item 35: what Taxes and Income need to rate themselves.
      f('taxes.lastYear', 'Last year: refund (+) or owed (-)', 'money'), f('taxes.withholdingChanged', 'Withholding changed since', 'yesno'),
      f('incomeFacts.lastRaiseDate', 'Last raise', 'month'), f('incomeFacts.lastRaiseAmount', 'Last raise amount (a year)', 'money'), pick('incomeFacts.marketRate', 'Paid at market rate', ['Yes', 'No', 'Unsure']),
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
      // Batch 47 (the benefits cliff, M9B): which public benefits the household gets now, one tap each (Plan › Raise and benefits).
      ...['snap:SNAP (food)', 'medicaid:Medicaid', 'essential:The Essential Plan (NY)', 'aca:Marketplace premium help', 'kids:Children\'s coverage (Medicaid, Child Health Plus)', 'eitc:Earned income credit (EITC)']
        .map(x => { const [k, l] = x.split(':'); return pick(`cliff.${k}`, `Benefits now: ${l}`, ['Getting it', 'Might qualify', 'Not on it']); }),
      f('cliff.snapAmount', 'SNAP a month (from the benefit letter)', 'money'),
      f('cliff.careCosts', 'Child care paid out of pocket', 'yesno'),
      // Batch 53: New York's child care help (CCAP), one tap, and what care costs at full price.
      pick('cliff.ccap', 'Benefits now: Child care help (CCAP)', ['Getting it', 'Might qualify', 'Not on it']),
      f('cliff.careFull', 'Child care at full price, a month', 'money'),
      // Batch 56 (Social Security, M9J): each person's benefit at full retirement age off their my Social Security
      // statement, and how sure it is (blank: Know it). No number: estimated from pay, a Gut range (js/math/socialsecurity.js).
      f('ss.benefit', 'Social Security at full retirement age, a month (my Social Security statement)', 'money'),
      pick('ss.level', 'Social Security number: how sure', ['Gut', 'Estimate', 'Know it']),
      f('ss.benefitPartner', 'Partner: Social Security at full retirement age, a month', 'money'),
      pick('ss.levelPartner', 'Partner: Social Security number, how sure', ['Gut', 'Estimate', 'Know it']),
      f('benefits', 'Employer benefits', 'text', { sheet: { skip: 'a set of benefit answers, each with have it, amount and per; on About you › Benefits' } }),
      f('lifeAdmin', 'Life admin checklist', 'text', { sheet: { skip: 'done / not yet / not for me per item; on Net worth › Protection' } }),
      f('taxHistory', 'Refund history', 'text', { area: 'taxes', sheet: { skip: 'two earlier tax years; on the Taxes tab of SLAM' } }),
      f('later', "I'll find it later", 'text', { sheet: { skip: 'homework flags on profile answers; the Homework list in SLAM' } }),
      f('laterDue', "I'll find it later: due", 'text', { sheet: { skip: 'homework due dates; the Homework list in SLAM' } }),
      f('incomeGaps', 'Income gaps', 'text', { sheet: { skip: 'its own tab: Income gaps' } }),
      f('people', 'People in the plan', 'text', { sheet: { skip: 'its own tab: People' } }), // batch 49
      f('backups', 'Backups of the backups', 'text', { sheet: { skip: 'its own tab: Backups' } }),
      f('sleepAtNight', 'Sleep-at-night number (the cash that lets you sleep)', 'money'), // batch 36 (QUESTIONS 310): on Assets › Cash layers; ticks Know your sleep-at-night number (M9K)
      f('institutions', 'Institutions', 'text', { sheet: { skip: 'its own tab: Institutions' } }), // batch 6
      // Your calendar (About you): holidays computed year to year (M78), and Shabbat as a weekly Budget line.
      f('calendars.jewish', 'Calendar: Jewish holidays', 'yesno'), f('calendars.shabbat', 'Calendar: Shabbat every week', 'yesno'),
      f('calendars.muslim', 'Calendar: Muslim holidays', 'yesno'), f('calendars.christian', 'Calendar: Christian holidays', 'yesno'),
      f('calendars.orthodox', 'Calendar: Orthodox Christian holidays', 'yesno'), f('calendars.us', 'Calendar: US holidays', 'yesno'),
      // Settings that change the math.
      pick('spending.source', 'Spending uses', ['gut', 'lines'], { part: 'spending', key: 'source', named: 'Set_spendingSource' }),
      pick('spending.basis', 'Budget view', ['accrual', 'cash'], { part: 'spending', key: 'basis' }),
      pick('settings.debtOrder', 'Debt payoff order', ['avalanche', 'snowball', 'hassle', 'stress', 'custom'], { part: 'settings', key: 'debtOrder' }), // F3: js/registry/debt.js METHODS
      pick('settings.layerMode', 'Cash layers kept', ['virtual', 'accounts'], { part: 'settings', key: 'layerMode' }),
      f('settings.qqOpensLaunch', 'Quiet Quitting FI opens the launch window', 'yesno', { part: 'settings', key: 'qqOpensLaunch' }),
      pick('settings.dollars', "Plan shows today's or future dollars", ['real', 'nominal'], { part: 'settings', key: 'dollars' }),
      f('settings.debtExtra', 'Extra to debt a month (Make it the plan on Home)', 'money', { part: 'settings', key: 'debtExtra' }), // batch 11 (item 3)
      f('settings.phase4', 'Phase 4 previews on (Life Transitions on Plan)', 'yesno', { part: 'settings', key: 'phase4' }), // batch 21: Coach tools › Session; on for new households in this build
      f('client.couple', 'Couple (from Solo or couple)', 'yesno', { part: 'client', key: 'couple', sheet: { skip: 'set by Solo or couple' } }),
    ],
  },
  {
    id: 'income', prefix: 'Income', tab: 'Income', source: 'records', kinds: { income: 'Income', benefit: 'Other benefit' },
    about: 'Paychecks and other money in, and benefits from work.',
    types: { income: ['Job', 'Partner job', 'Side hustle', 'Self-employed', 'Platform', 'Unemployment', 'Benefits', 'Rental', 'Money from family', 'From partner'] }, // batch 27: Platform
    fields: [
      NAME, AMOUNT('Amount'), PER(),
      pick('basis', 'Given as', ['Take-home', 'Gross', 'Both'], { kinds: ['income'] }),
      f('gross', 'Gross a year', 'money', { kinds: ['income'] }),
      pick('payFrequency', 'Pay frequency', FREQS, { kinds: ['income'] }),
      f('payDay', 'Payday (day of month)', 'day', { kinds: ['income'] }),
      f('payDays', 'Paydays (twice a month)', 'list', { kinds: ['income'] }),
      f('nextPayday', 'Next payday', 'date', { kinds: ['income'] }),
      f('actualPay', 'Last paycheck matched', 'money', { kinds: ['income'] }), f('actualPayDate', 'Last paycheck date', 'date', { kinds: ['income'] }), // answer 168: from a bank CSV; the row counts as Actual
      pick('incomeType', 'Tax type', ['W-2', '1099', 'Business', 'Side hustle', 'Rental', 'Benefits', 'Other'], { kinds: ['income'] }),
      pick('incomeKind', 'Income type', ['Salary', 'Side hustle', 'Windfall', 'Other'], { kinds: ['income'] }),
      // Batch 15, item 13: unemployment benefits (weekly, taxed on the return, no FICA; nothing withheld unless chosen).
      f('benefitStart', 'Benefits started', 'date', { kinds: ['income'] }),
      f('benefitEnd', 'Benefits end', 'date', { kinds: ['income'] }),
      pick('withhold', 'Have 10% federal tax withheld', YES_NO_WORDS, { kinds: ['income'] }), // F6: for a later Wrapped; blank reads from the row's type (js/capture.js)
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
      // Batch 27 (income by type): a shift job, its tips and tip-out, its seasons (js/math/earnings.js).
      f('shiftsWeek', 'Shifts a week', 'number', { kinds: ['income'] }),
      f('payShift', 'Pay a shift (before tax)', 'money', { kinds: ['income'] }),
      f('hourly', 'Hourly pay', 'money', { kinds: ['income'] }), f('hoursShift', 'Hours a shift', 'number', { kinds: ['income'] }),
      f('houseFee', 'House or stage fee a shift', 'money', { kinds: ['income'] }),
      f('cardTips', 'Card tips (on the paycheck)', 'money', { kinds: ['income'] }), pick('cardTipsPer', 'Card tips per', ['shift', 'month'], { kinds: ['income'] }),
      f('cashTips', 'Cash tips', 'money', { kinds: ['income'] }), pick('cashTipsPer', 'Cash tips per', ['shift', 'month'], { kinds: ['income'] }),
      pick('cashReported', 'Cash tips reported', YES_NO_WORDS, { kinds: ['income'] }),
      pick('tipOutBy', 'Tip-out as', ['% of sales', '% of tips', '$ a shift'], { kinds: ['income'] }),
      f('tipOutPct', 'Tip-out %', 'pct', { kinds: ['income'] }), f('tipOutAmount', 'Tip-out a shift', 'money', { kinds: ['income'] }),
      f('salesShift', 'Sales a shift', 'money', { kinds: ['income'] }),
      f('slowMonths', 'Slow season months', 'list', { kinds: ['income'] }), f('slowShifts', 'Shifts a week in the slow season', 'number', { kinds: ['income'] }),
      f('busyMonths', 'Busy season months', 'list', { kinds: ['income'] }), f('busyShifts', 'Shifts a week in the busy season', 'number', { kinds: ['income'] }),
      // Batch 60 (QUESTIONS 422): kinds of night on one row, each with its own shifts, pay, hours, tips, fee and tip-out.
      f('nights', 'Kinds of night', 'text', { kinds: ['income'], sheet: { skip: 'one entry per kind of night (its shifts a week, pay, hours, card and cash tips, house fee and tip-out); set on Income › Tips and shifts. The row\'s Shifts a week, Pay a shift, House fee, tips and tip-out columns hold the nights added together, so its take-home works out the same' } }),
      // A Platform row: amount is the gross a month; the fee and hold are prefilled from the Platforms table.
      pick('platform', 'Platform', ['OnlyFans', 'Fansly', 'Patreon', 'Etsy', 'Uber', 'DoorDash', 'Upwork', 'Other'], { kinds: ['income'] }),
      f('feePct', 'Platform fee %', 'pct', { kinds: ['income'] }), f('holdDays', 'Payout hold (days)', 'number', { kinds: ['income'] }),
      f('landsIn', 'Lands in (which account)', 'text', { kinds: ['income'], sheet: { skip: 'points at a checking or savings row by its id; set it on Net worth › Fire drill' } }), // batch 44
      f('chargebacks', 'Chargebacks and refunds a month', 'money', { kinds: ['income'] }),
      // Batch 51 (Shift P&L, M9H): what a shift costs and the hours around it (js/math/shiftpnl.js). Hours a shift is above.
      pick('travelBy', 'Getting to a shift', ['Ride', 'Drive', 'Transit', 'Walk'], { kinds: ['income'] }),
      f('travelCost', 'Ride or fare each way', 'money', { kinds: ['income'] }), f('travelWays', 'Ride or fare: ways a shift (1 or 2)', 'number', { kinds: ['income'] }),
      f('milesShift', 'Miles driven a shift, there and back', 'number', { kinds: ['income'] }),
      f('travelHours', 'Travel hours a shift, there and back', 'number', { kinds: ['income'] }),
      f('prepHours', 'Getting ready, hours a shift', 'number', { kinds: ['income'] }), f('windDownHours', 'Winding down after, hours a shift', 'number', { kinds: ['income'] }),
      f('sitterHours', 'Childcare hours a shift', 'number', { kinds: ['income'] }), f('sitterRate', 'Childcare: the sitter\'s rate an hour', 'money', { kinds: ['income'] }),
      f('gearCost', 'Outfits and gear: what they cost', 'money', { kinds: ['income'] }), f('gearShifts', 'Outfits and gear: shifts they last', 'number', { kinds: ['income'] }),
      // Batch 42 (the lender's-eye view, M9W): the returns a self-employment row has on file, as a lender reads them.
      pick('returnsFiled', 'Tax returns filed with this income', ['2 or more', '1', 'None'], { kinds: ['income'] }),
      f('returnLast', 'Net profit on the last return filed (a year)', 'money', { kinds: ['income'] }),
      f('returnBefore', 'Net profit on the return before that (a year)', 'money', { kinds: ['income'] }),
      f('what', 'What it is', 'text', { kinds: ['benefit'] }),
      pick('how', 'How it works', ['Reimbursed', 'Stipend', 'Pretax', 'Match', 'Discount'], { kinds: ['benefit'] }),
      pick('using', 'Using it?', ['Yes', 'No', 'Partly'], { kinds: ['benefit'] }),
      ...CTL({ kinds: ['income'] }),
      CHECK, LOCKED(), OWNER, NOTES, coachNote(), SOURCE, PAID_WITH, LINKED_TO, COVERS, STRESS, ...SEEN_F, ...SPLIT_F,
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
      f('cardId', 'Card from the library'), // batch 30: a data/library/cards.json id; the card's rewards, credits and benefits come from there
      f('cardUse', 'Card credits and benefits used', 'text', { sheet: { skip: 'a Use it or Don\'t tap per credit and benefit of the library card; set them on Credit cards' } }),
      f('promoApr', 'Promo APR', 'pct'), f('promoEnd', 'Promo ends', 'month'),
      pick('use', 'Personal or business', ['Personal', 'Business']),
      pick('federal', 'Federal or private', ['Federal', 'Private']),
      f('plan', 'Repayment plan'), f('servicer', 'Servicer'),
      pick('pslf', 'PSLF eligible', ['Yes', 'No', 'Not sure']), pick('firstBorrowed', 'First borrowed', ['Before July 2014', 'July 2014 to June 2026', 'July 2026 or later']), /* batch 29: which federal plans a loan can use */ f('forgiveness', 'Forgiveness', 'yesno', { sheet: { skip: 'an older way to mark forgiveness; PSLF eligible is the one to use' } }),
      pick('forbearance', 'Forbearance or deferment', ['None', 'Forbearance', 'Deferment']),
      f('monthsLeft', 'Months left', 'number'), f('yearsLeft', 'Years left', 'number'), f('paymentsLeft', 'Payments left', 'number'),
      pick('rateType', 'Fixed or adjustable', ['Fixed', 'Adjustable']),
      f('collections', 'In collections', 'yesno'), f('terms', 'Terms agreed'),
      f('hassle', 'Hassle (1 to 5)', 'number'), // F3: Return on Hassle, the coach's score
      f('fee', 'Fee per period', 'money'), f('periods', 'Periods a year', 'number'),
      f('taxPlan', 'Payment plan in place', 'yesno'), f('guaranteed', 'Personally guaranteed', 'yesno'),
      f('institution', 'Institution'), f('opened', 'Opened', 'month'),
      f('institutionId', 'Institution (from the list)', 'text', { sheet: { skip: 'points at an Institutions row by id; the Institution column shows its name' } }),
      f('bankKey', 'Same bank as (kept private)', 'text', { sheet: { skip: 'batch 44: on a row kept private, an opaque key in place of its institution, so the fire drill still knows which rows share a bank; set by the fold' } }),
      ...CTL(),
      CHECK, LOCKED(), OWNER, STRESS, NOTES, coachNote(), SOURCE, PAID_WITH, LINKED_TO, COVERS, AMOUNT('Amount (unused)'), PER(), ...SEEN_F, ...SPLIT_F,
    ].map(x => (x.key === 'amount' || x.key === 'per' ? { ...x, unused: true, sheet: { skip: 'a debt uses Balance and Payment' } } : x)),
  },
  {
    id: 'assets', prefix: 'Assets', tab: 'Assets', source: 'records', kinds: { account: 'Account', asset: 'Home or car' },
    about: 'Cash, investments, and things you own.',
    types: {
      account: ['Checking', ...SAVINGS_TYPES, 'Money market', 'CD', 'Cash on hand', 'Payment app', '401(k)', '403(b)', '457', 'TSP', 'Roth IRA', 'Traditional IRA', 'Rollover IRA', 'SEP', 'Solo 401(k)', 'HSA', '529', 'Brokerage', 'Crypto', 'Other', 'All investments'],
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
      f('institution', 'Institution', 'text', { kinds: ['account'] }), // the older typed name; the Institutions list is the home now
      f('institutionId', 'Institution (from the list)', 'text', { kinds: ['account'], sheet: { skip: 'points at an Institutions row by id; the Institution column shows its name' } }),
      f('bankKey', 'Same bank as (kept private)', 'text', { kinds: ['account'], sheet: { skip: 'batch 44: on a row kept private, an opaque key in place of its institution, so the fire drill still knows which rows share a bank; set by the fold' } }),
      f('apy', 'APY', 'pct', { kinds: ['account'] }), pick('yieldKind', 'APY or 7-day yield', ['APY', '7-day yield'], { kinds: ['account'] }),
      pick('purpose', 'Purpose', ['Emergency', 'Sinking fund', 'Goal', 'Taxes', 'General'], { kinds: ['account'] }), // batch 27: Taxes is owed money, kept out of emergency cash
      f('contribution', 'Putting in', 'money', { kinds: ['account'] }),
      pick('contributionPer', 'Putting in per', ['Paycheck', 'Year', 'Month'], { kinds: ['account'] }),
      f('salaryPct', '% of salary', 'pct', { kinds: ['account'] }),
      pick('planJob', 'Workplace plan: from the current job or an old one', ['Current job', 'Old job'], { kinds: ['account'] }), // batch 48 (QUESTIONS 368): Old job lists it under Fire drill › Stranded money
      f('payFrequency', 'Pay frequency', 'choice', { options: FREQS, kinds: ['account'] }),
      pick('rothSplitBy', 'Roth part as', ['Percent', 'Amount'], { kinds: ['account'] }),
      f('rothPct', 'Roth part %', 'pct', { kinds: ['account'] }), f('rothPerPaycheck', 'Roth part a paycheck', 'money', { kinds: ['account'] }),
      pick('vestingSchedule', 'Vesting schedule', ['Immediate', 'Cliff', 'Graded'], { kinds: ['account'] }),
      f('vestYears', 'Fully vested after (years)', 'number', { kinds: ['account'] }),
      f('contributionsYtd', 'Put in this year', 'money', { kinds: ['account'] }),
      f('contributionsToDate', 'Contributions to date', 'money', { kinds: ['account'] }),
      f('costBasis', 'Cost basis', 'money', { kinds: ['account'] }), f('rothBasis', 'Roth IRA contributions so far', 'money', { kinds: ['account'] }),
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
      ...CTL({ kinds: ['account'] }),
      CHECK, LOCKED(), OWNER, NOTES, coachNote(), STRESS, SOURCE, PAID_WITH, LINKED_TO, COVERS, AMOUNT('Amount (unused)'), PER(), ...SEEN_F, ...SPLIT_F,
    ].map(x => (x.key === 'amount' || x.key === 'per' ? { ...x, unused: true, sheet: { skip: 'an account uses Balance, a thing you own uses Value' } } : x)),
  },
  {
    id: 'protection', prefix: 'Protection', tab: 'Protection', source: 'records', kinds: { coverage: 'Coverage' },
    about: 'Insurance: health, life, disability, home or renters, car, umbrella.',
    types: { coverage: ['Health', 'Life', 'Disability', 'Renters or home', 'Car', 'Umbrella'] },
    fields: [
      NAME, pick('have', 'Have it?', ['Have it', "Don't", 'Not sure']), AMOUNT('Premium'), PER('Premium per'),
      f('institutionId', 'Insurer (from the Institutions list)', 'text', { sheet: { skip: 'points at an Institutions row by id' } }),
      pick('paidFrom', 'Paid from', ['Paycheck', 'Budget']),
      f('paidFromJob', 'Paid from which job', 'text', { sheet: { skip: 'points at a job row by its id; set it in SLAM' } }),
      f('employer', 'Through employer', 'yesno'),
      f('deductible', 'Deductible in-network', 'money'), f('deductibleOut', 'Deductible out-of-network', 'money'),
      f('oopMax', 'Out-of-pocket max in-network', 'money'), f('oopMaxOut', 'Out-of-pocket max out-of-network', 'money'),
      f('copayPcp', 'Copay: doctor', 'money'), f('copaySpecialist', 'Copay: specialist', 'money'), f('copayUrgent', 'Copay: urgent care', 'money'),
      pick('term', 'Short-term or long-term', ['Short-term', 'Long-term']),
      f('benefitPct', 'Pays this share of your pay', 'pct'), f('duration', 'Pays for how long'), f('waiting', 'Waiting period'),
      f('coverage', 'Coverage amount', 'money'), f('plannedChange', 'Planned change'),
      pick('decision', 'Bills list: keep or try to cut', ['Keep', 'Cancel']), // batch 15: the recurring bills list (Cancel shows as Try to cut)
      f('notSame', 'Not the same as a Budget line', 'yesno', { sheet: { skip: 'an answer to Same as your ...?; asked in SLAM' } }),
      f('sameAs', 'Same as a Budget line', 'text', { sheet: { skip: 'an answer to Same as your ...?; asked in SLAM' } }),
      CHECK, OWNER, NOTES, coachNote(), STRESS, SOURCE, PAID_WITH, LINKED_TO, COVERS, ...SEEN_F, ...SPLIT_F,
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
    id: 'spending', prefix: 'Spend', tab: 'Spending lines', source: 'records', kinds: { bill: 'Budget line', spending: 'Gut number or category' }, // batch 7 (A): a category row is kind spending with the category as its type
    about: 'Every Budget line, and the one gut number for all spending.',
    fields: [
      NAME, AMOUNT('Amount'), PER(),
      f('category', 'Category', 'text', { kinds: ['bill'] }),
      pick('draftt', 'DRAFTT letter', ['Debt', 'Retirement', 'Accommodation', 'Food', 'Transportation', 'Taxes', 'Therapy', 'Bills', 'Wants', 'Other'], { kinds: ['bill'] }), // batch 10: Bills (Bills and subscriptions) and Wants sit outside DRAFTT, like Other (blank)
      // Batch 10: a starter line's typical amount, kept apart from the amount: shown faded, counted nowhere until used.
      f('typical', 'Typical amount (for reference, not counted)', 'money', { kinds: ['bill'] }),
      f('usedTypical', 'Amount came from Use typical', 'yesno', { kinds: ['bill', 'spending'], sheet: { skip: 'set by the Use button; the Status column says Roughly' } }),
      f('level', 'Level in its group (1, 2, 3 = Everything else; blank is 2)', 'number', { kinds: ['bill'] }),
      f('elseAmount', 'Everything else, one rough amount a month', 'money', { kinds: ['spending'] }), // on a category row: counts while none of its level 3 lines has a number
      pick('amountType', 'Amount is', ['Fixed', 'Variable', 'Range'], { kinds: ['bill'] }),
      f('low', 'Range: low', 'money', { kinds: ['bill'] }), f('high', 'Range: high', 'money', { kinds: ['bill'] }),
      pick('timing', 'Date is', ['Fixed date', 'Variable date', 'Weekly', 'Any time', 'Spread out'], { kinds: ['bill'] }),
      f('dueDay', 'Due day', 'day', { kinds: ['bill'] }),
      f('weekday', 'Weekly: lands on (0 Sunday to 6 Saturday)', 'number', { kinds: ['bill'] }),
      pick('whoPays', 'Who pays', ['Me', 'Split', 'My share', 'Covered by someone', 'Included in rent', 'N/A', 'Not for me'], { kinds: ['bill'] }),
      f('coveredBy', 'Who covers it', 'text', { kinds: ['bill'] }),
      f('coveredAmount', 'Amount they cover', 'money', { kinds: ['bill'] }),
      f('reimbursed', 'Reimbursed to you', 'money', { kinds: ['bill'] }),
      f('myShare', 'My share', 'money', { kinds: ['bill'] }), f('splitBy', 'Split by', 'number', { kinds: ['bill'] }),
      pick('amountIs', 'This amount is', ['Your share', 'The whole bill'], { kinds: ['bill'] }),
      f('takeover', 'Becomes mine in', 'month', { kinds: ['bill'] }),
      f('startsIn', 'Starts in (a known cost ahead)', 'month', { kinds: ['bill'] }), // batch 15: counted from this month on, in every projection
      pick('toPartner', 'Paid to my partner (moves money between you)', YES_NO_WORDS, { kinds: ['bill'] }), // batch 15: the household view leaves it out
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
      f('pass', 'Budget pass', 'text', { kinds: ['spending'], sheet: { skip: 'where the gut number came from (Gut, or Statements when read off statements or an app); set by Fast Track and the gut box' } }),
      f('maaser', 'Maaser line', 'yesno', { kinds: ['bill'], sheet: { skip: 'set by the community preset' } }),
      CHECK, LOCKED(), OWNER, STRESS, NOTES, coachNote(), SOURCE, PAID_WITH, LINKED_TO, COVERS, ...SEEN_F, ...SPLIT_F,
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
      f('trip', 'Trip', 'yesno', { kinds: ['entry'] }), // F6: the Trip tag on a calendar entry
      f('lineId', 'Budget line', 'text', { kinds: ['entry'], sheet: { skip: 'points at a Budget line by its id; pick it in SLAM' } }),
      NOTES, coachNote(), PER(), OWNER, STRESS, SOURCE, PAID_WITH, LINKED_TO, COVERS, ...SEEN_F, ...SPLIT_F,
    ].map(x => (['per', 'owner', 'stress'].includes(x.key) ? { ...x, unused: true, sheet: { skip: 'not used on calendar entries' } } : x)),
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
      pick('horizon', 'Short or long term', ['Short term', 'Long term'], { kinds: ['milestone'] }),
      pick('tag', 'Need, want or wish', ['Need', 'Want', 'Wish'], { kinds: ['milestone'] }),
      pick('month', 'Month', MONTHS3, { kinds: ['event'] }), f('day', 'Day of the month', 'day', { kinds: ['event'] }),
      f('rentIncrease', 'Rent goes up by, a month', 'money', { kinds: ['event'] }),
      f('saved', 'Saved so far', 'money', { kinds: ['event'] }),
      f('sinking', 'Save for it each month', 'yesno', { kinds: ['event'] }),
      f('sinkingFund', 'Sinking fund account', 'text', { kinds: ['event'], sheet: { skip: 'points at an account row by its id; set it in SLAM' } }),
      f('fundTag', 'Purpose tag', 'text', { kinds: ['event'] }),
      f('coverageId', 'For this coverage', 'text', { kinds: ['event'], sheet: { skip: 'points at a Protection row by its id; set by Add the usual dates' } }),
      f('holiday', 'Holiday (the block re-dates itself each year)', 'text', { kinds: ['event'] }),
      NOTES, coachNote(), PER(), OWNER, STRESS, SOURCE, PAID_WITH, LINKED_TO, COVERS, ...SEEN_F, ...SPLIT_F,
    ].map(x => (['per', 'stress'].includes(x.key) ? { ...x, unused: true, sheet: { skip: 'not used on goals and events' } } : x)), // owner: a goal is one person's or Joint (F2)
  },
  {
    id: 'institutions', prefix: 'Inst', tab: 'Institutions', source: 'list', part: 'profile', path: 'institutions',
    about: 'The banks, credit unions, brokerages, workplace plans, lenders and insurers the household uses (batch 6). Name, kind, website, notes, whose. Never a login or a password.',
    fields: [f('name', 'Institution'), pick('kind', 'Kind', ['Bank', 'Credit union', 'Brokerage', 'Workplace plan', 'Lender', 'Insurer', 'Other']), f('website', 'Website'), f('notes', 'Notes'), pick('owner', 'Whose', ['Me', 'Partner', 'Joint', 'P3', 'P4', 'P5', 'P6', 'P7'])], // batch 58 (QUESTIONS 415): P3 to P7 are the adults past the couple
  },
  {
    id: 'people', prefix: 'People', tab: 'People', source: 'list', part: 'profile', path: 'people',
    about: 'Batch 49: the adults in the plan past this client and the partner (P3 to P7: each with a view of their own) and the dependents (D1 ...: a child, a parent you support). This client and the partner are on Profile.',
    fields: [f('name', 'Name'), pick('kind', 'Adult or dependent', ['Adult', 'Dependent']), pick('role', 'Role', ['Partner', 'Sibling', 'Parent', 'Adult child', 'Friend', 'Other adult', 'Child', 'Parent I support', 'Other dependent']), f('age', 'Age (a dependent)', 'number'), f('birthYear', 'Birth year (an adult)', 'number')], // batch 58 (QUESTIONS 419)
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
  'settings.intake': 'when the pre-session intake was imported, and how many answers (Import intake on Coach tools > Data)',
  'settings.presetsAdded': 'marks that the starter lines were added once',
  'settings.migrated10': 'marks that batch 10 turned untouched starter amounts faded, once per file',
  'settings.fadedNote': 'how many starter amounts turned faded, for the one-time note on the Budget (cleared when it is closed)',
  'settings.layerAccounts': 'which account holds each cash layer; set on Cash layers',
  'settings.person': 'the person filter on Net worth and Cash flow (all, Me, Partner), a screen setting (F2)',
  'settings.typicalInClient': 'batch 31: Coach tools > Session > Typical at your age, whether client view shows the typical-at-your-age notes (the coach always sees them); a display switch, default off',
  'settings.typicalOff': 'batch 31: the money boxes whose typical-at-your-age note was hidden (box key to true), so each stays hidden for this client',
  'settings.debtCustomOrder': 'the custom payoff order, debt ids dragged into place on Plan › Debt payoff (F3)',
  'spending.categoryJoy': 'dated joy ratings (1 to 5) per spending category, rated on the Budget (F6); the Captured tab lists them',
  'spending.transactions': 'transactions imported from bank CSVs (J): date, description, amount, bank, the Budget line, Actual level',
  'spending.months.actualFrom': 'where a month actual came from (csv); set by the statement import (J)',
  'settings.csvMaps': 'which CSV column is which, saved once per bank (J)',
  'program.proposed': 'the Proposed plan the coach edits on Plan › Current vs Proposed (K): spending, debt order, retire-by age, surplus invested, extra to debt, extra income (batch 12)',
  'program.control': 'batch 55: the money-control map\'s What to set up ticks on Net worth › Money control (each with the day it was ticked); private by design, so never in the workbook, a partner\'s view or anything shared (js/privacy.js)',
  'program.fireDrill': 'the bank fire drill on Net worth › Fire drill (batch 44): the account picked, same bank or another bank as said on the drill, the backup plan ticks (and where the payroll form lives) and the stranded money ticks, each with the day it was ticked. A checklist, not a number: the Math tab shows the drill (M9F) and the household rows hold the money',
  'program.transition': 'the Life Transitions plan on Plan › Transitions (batch 21): the template, start and destination, the start month, each rung\'s on or off and any amount typed, the tripwires, Plan B and C, the share switch. A what-if like program.proposed: the Math tab shows its runway (M90), the household rows hold the money',
  'session.weather': 'the money weather per session and person (batch 25, Coach tools › Discovery): six tap answers each; Clear, Fair, Overcast or Storm is worked out (M95)',
  'program.gap': 'the gap card (batch 12): the income option the coach fills (extra shifts or a side gig, a month)',
  'settings.csvRules': 'description words to Budget line, learned from each import (J)',
  'settings.merchantRules': 'batch 22: Always put this merchant here, merchant name to a Budget line (or a transfer, a paycheck, a debt payment, left out); set on the import review',
  'settings.importCategoryMap': 'batch 22: this client\'s own edits to how Rocket Money or Monarch categories land on Budget categories; set on the import review',
  'spending.basics': 'Fast Track totals, kept to compare with the lines',
  'spending.calendar': 'calendar marks (paid, moved, partial) and the starting balance; set on the calendar',
  'spending.months.closed': 'month-end close state; set on Month end',
  'spending.months.gut': 'batch 45 (QUESTIONS 321): a gut number for one month, typed on Budget (Different in <month>); Month end splits that month\'s gut-only categories from it, and the month-end summary keeps it',
  'spending.months.statements': 'statement balances typed at month end; set on Month end',
  'spending.months.summary': 'the month-end summary; set on Month end',
  session: 'session agenda, notes, feelings and the one-pager; not money',
  'program.ladder': 'the Fat FI label a client renames (the ladder, M75)',
  program: 'the 12-session program: the coach\'s checklist ticks, the hole each session pulled, the game plan; the Program tab shows where it stands',
  scorecard: 'the Scorecard: the coach\'s ratings, reasons, efforts, typed payoffs, chosen holes and the next chapter; the Scorecard tab shows it',
  'session.feedback': 'Report this notes (coach only; the Coach notes tab when coach-only is ticked)',
  'session.timer': 'the onboarding timer (coach only; the Coach notes tab when coach-only is ticked)',
  'assumptions.socialSecurity': 'Social Security on Plan › Goals: parked (spec F222); the answer is kept, no math uses it yet',
  history: 'dated history of every change; kept in the app and the backup file',
  snapshots: 'snapshots for change since last session; kept in the app and the backup file',
  parking: 'parking lot notes; kept in the app and the backup file',
  usage: 'the usage log (batch 14): time and clicks per screen, back presses, undos, Find words that found nothing, Show me dead ends, Walk me through steps; no dollar amounts; Coach tools › Data exports it as CSV',
};

// Every field of an area that a record of this kind can carry.
export const fieldsFor = (area, kind = null) => area.fields.filter(x => !x.kinds || !kind || x.kinds.includes(kind));
export const sheetFields = (area, { coach = false } = {}) => area.fields.filter(x => x.sheet === true && (coach || !x.coach));
export const areaOf = id => AREAS.find(a => a.id === id);

// Every field's id (area.key, with its doc part when it is not the area's own) and area, set once here.
// The shared fields (Name, Notes, Stress ...) are one object in the code above: each area gets its own copy first.
for (const a of AREAS) a.fields = a.fields.map(f => ({ ...f }));
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
