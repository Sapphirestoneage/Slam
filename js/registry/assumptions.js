// SPDX-License-Identifier: AGPL-3.0-only
// The assumptions registry: every assumption and reference value the math uses (returns, limits, brackets, rules),
// declared once with where it comes from and when it was checked. Values are read from data/reference-2026.json
// (the Reference data tab) or, for SLAM's own rules, from the constant in js/math. The spreadsheet's Assumptions tab
// is built from this list only, and test/coverage.test.js fails when a Reference data value is not on it.
//
// An entry: { id, name, label, unit, get(ref), source, date }. name is the workbook's named range (letters, digits
// and _ only, so Excel and Google Sheets both accept it). client: the key in doc.assumptions when a client can pick
// their own (the sheet shows the default, a blue cell for theirs, and the one used). A table: rows of numbers, each
// column its own named range (tax brackets, periods).

import { LEVELS, WEIGHTS, PACE, SESSIONS } from './program.js';
import { THRESHOLDS, PAYOFF, AREAS as SCORE_AREAS } from './scorecard.js';

// SLAM's own rules and lists. The math in js/math reads these (one source for the app and the sheet).
// The Rule of 5 (M43, confirmed Oct 28, restored Nov 6): big e holds age / 5 months of spending, unrounded (25 is 5.0, 30 is 6.0, 40 is 8.0).
// One definition for FOO step 4, the cash layers, the ladder, the Scorecard, the Rule of 5 card and the workbook. No age: big e is locked.
// Answer 172: times an income stability multiplier (Steady 1, Varies 1.25, Unpredictable 1.5), which the coach can override per client with any number (profile.bigEMultiplier).
export const STABILITY_MULTIPLIER = { Steady: 1, Varies: 1.25, Unpredictable: 1.5 };
export const bigEMultiplierOf = profile => (profile?.bigEMultiplier != null && Number.isFinite(Number(profile.bigEMultiplier)) ? Number(profile.bigEMultiplier) : STABILITY_MULTIPLIER[profile?.incomeStability] ?? 1);
export const bigEMonthsOf = (age, multiplier = 1) => (age == null || Number.isNaN(Number(age)) ? null : Number(age) / 5 * (multiplier ?? 1));
export const RULES = {
  cardMinimumFloor: 25, cardMinimumPct: 0.01, housingLine: 0.35, bufferWeeks: 2, keepPaceMonths: 60, littleE: 1000,
  saferWithdrawal: 0.035, saferUnderAge: 45, // batch 5 C: a second FI line at a safer rate when FI would come before this age
  fatFactor: 1.5, trueFiTax: 0.15, heavyApr: 0.08, variableGuessShare: 0.75, maxMonths: 70 * 12,
  roughCheckDays: 30, agedCheckDays: 90,
  debtFirst: 1, // batch 11: while heavy debt is carried the surplus goes to it first (1 on, 0 off); js/math/metrics.js debtRuleOf
  // Batch 12 (QUESTIONS 196, Eli Nov 5): freed money follows the FOO. After heavy debt the surplus and the freed payments
  // fill big e, then Tax-Free Growth, then the rest is invested (1 on, 0: invested once heavy debt is gone); js/math/flow.js.
  freedFollowsFoo: 1,
  shortPlanMonths: 12, // batch 12 (QUESTIONS 200): the debt-free card's chips become +5% / +10% / +25% on a plan this short or shorter
  gapTrimLine: 0.25, gapTrimGut: 0.1, // batch 12 (item 5): what a gap lever closes: a quarter of the largest line that can move, or a tenth of the gut number with no lines
  nextBestMin: 100, // batch 12: an alternative shows as "Worth a look" on a FOO step when it beats the step by this much a year
};
export const LISTS = {
  perMonth: { week: 52 / 12, '2 weeks': 26 / 12, 'twice a month': 2, month: 1, quarter: 1 / 3, year: 1 / 12 },
  perYear: { week: 52, '2 weeks': 26, 'twice a month': 24, month: 12, quarter: 4, year: 1 },
  consumerDebt: ['Credit card', 'Personal loan', 'Buy now, pay later', 'Payday or cash advance', 'Medical', 'Family or friend'],
  housing: ['Rent or mortgage', 'Electric, gas, water'],
  heavyDebt: ['Credit card', 'Payday or cash advance', 'Personal loan', 'Buy now, pay later', 'Medical', 'Tax debt'],
  rothTypes: ['Roth IRA'],
  pretaxTypes: ['401(k)', '403(b)', '457', 'TSP', 'Solo 401(k)', 'Traditional IRA', 'SEP IRA', 'SIMPLE IRA'],
  // Bills a household can share, each a group of Budget categories (About you › Home and shared bills). Batch 5 (E):
  // with roommates and nothing answered yet, defaultOn says which are split and defaultAs how the amount is usually
  // given (people quote their share of the rent, but the whole electric bill). The choice is per bill (profile.sharedAs).
  sharedGroups: {
    rent: { label: 'Rent or mortgage', categories: ['Rent or mortgage'], defaultOn: true, defaultAs: 'Your share' },
    utilities: { label: 'Electric, gas, water', categories: ['Electric, gas, water'], defaultOn: true, defaultAs: 'The whole bill' },
    internet: { label: 'Internet and phone', categories: ['Internet, phone', 'Internet', 'Phone'], defaultOn: true, defaultAs: 'The whole bill' },
    renters: { label: 'Renters or home insurance', categories: ['Renters or home insurance'], defaultOn: false, defaultAs: 'Your share' },
    groceries: { label: 'Groceries', categories: ['Groceries, dining out, coffee', 'Groceries'], defaultOn: false, defaultAs: 'Your share' },
    household: { label: 'Household supplies', categories: ['Household supplies', 'Laundry', 'Furniture and home'], defaultOn: false, defaultAs: 'The whole bill' },
  },
  sharedAs: ['Your share', 'The whole bill'], // the per-bill choice (shown as My share / Whole bill)
  highRateTypes: ['Personal loan', 'Buy now, pay later', 'Payday or cash advance', 'Medical', 'Family or friend', 'Tax debt', 'Business', '401(k) loan'],
};

const SPEC = 'SLAM Build Spec, Reference data tab';
const IRS = 'IRS Notice 2025-67';
const IRS_TAX = 'IRS 2026 inflation adjustments, via Journal of Accountancy';
const FED = 'Federal Reserve G.19, Q2 2026 (released Aug 7 2026)';
const RULE = file => `SLAM rule (${file})`;

export const ASSUMPTIONS = [
  // Your numbers: presets a client can change (Plan).
  { id: 'presets.realReturn.default', name: 'RealReturn', label: 'Return a year, after inflation', unit: 'pct', get: r => r.presets.realReturn.default, client: 'realReturn', source: 'Your Oct 28 answers (presets 6%, 7%, 8%, 12%)', date: '2026-10-28' },
  { id: 'presets.withdrawalRate.default', name: 'WithdrawalRate', label: 'Withdrawal rate', unit: 'pct', get: r => r.presets.withdrawalRate.default, client: 'withdrawalRate', source: 'Your Oct 28 defaults (3%, 4%, 4.7%, 5.2%)', date: '2026-10-28' },
  { id: 'presets.inflation.default', name: 'Inflation', label: 'Inflation (for the nominal view only)', unit: 'pct', get: r => r.presets.inflation.default, client: 'inflation', source: 'Your Oct 28 defaults (2%, 3%)', date: '2026-10-28' },
  { id: 'defaults.retireAge', name: 'RetireAge', label: 'Retire by (age)', unit: 'number', get: r => r.defaults.retireAge, client: 'retireAge', source: SPEC, date: '2026-11-03' },
  { id: 'client.investSurplus', name: 'InvestSurplus', label: 'Invest my surplus: 1 or blank yes, 0 no (the surplus sits in checking)', unit: 'number', get: () => 1, client: 'investSurplus', source: 'Plan › Goals (Nov 5 answer to 123; it was off by default on Nov 3)', date: '2026-11-05' },
  { id: 'client.debtFirst', name: 'DebtFirst', label: 'Heavy debt first: 1 or blank yes, 0 no (the surplus is invested or stays, as Invest my surplus says)', unit: 'number', get: () => 1, client: 'debtFirst', source: 'Plan › Goals (Batch 11 item 1)', date: '2026-11-05' },
  { id: 'client.fiAge', name: 'FiAge', label: 'FI target age (blank: Retire by)', unit: 'number', get: () => null, client: 'fiAge', fallback: 'RetireAge', source: 'Plan › Goals', date: '2026-11-03' },
  { id: 'client.retirementSpending', name: 'RetirementSpending', label: 'Spending in retirement, a month (blank: today\'s spending)', unit: 'money', get: () => null, client: 'retirementSpending', fallback: 'Math_M27_spending', source: 'Plan › Goals (R030)', date: '2026-11-03' },
  { id: 'client.partTimeIncome', name: 'PartTimeIncome', label: 'Part-time income after launch, a month', unit: 'money', get: () => null, client: 'partTimeIncome', source: 'Plan › Goals (Barista FI)', date: '2026-11-03' },
  { id: 'presets.pace.Likely', name: 'Pace_Likely', label: 'Pace: likely return', unit: 'pct', get: r => r.presets.pace.Likely, source: SPEC, date: '2026-10-28' },
  { id: 'presets.pace.Optimistic', name: 'Pace_Optimistic', label: 'Pace: optimistic return', unit: 'pct', get: r => r.presets.pace.Optimistic, source: SPEC, date: '2026-10-28' },
  { id: 'presets.pace.Pessimistic', name: 'Pace_Pessimistic', label: 'Pace: pessimistic return', unit: 'pct', get: r => r.presets.pace.Pessimistic, source: SPEC, date: '2026-10-28' },
  // Defaults.
  { id: 'defaults.lifeExpectancy', name: 'LifeExpectancy', label: 'Plan to age', unit: 'number', get: r => r.defaults.lifeExpectancy, client: 'lifeExpectancy', source: SPEC, date: '2026-10-28' },
  { id: 'defaults.sessionMinutes', name: 'SessionMinutes', label: 'Session length, minutes', unit: 'number', get: r => r.defaults.sessionMinutes, source: SPEC, date: '2026-10-28' },
  { id: 'defaults.lowBalanceLine', name: 'LowBalanceLine', label: 'Low balance line on the calendar', unit: 'money', get: r => r.defaults.lowBalanceLine, source: 'Accepted rule (Reference data)', date: '2026-10-28' },
  { id: 'defaults.taxSetAside', name: 'TaxSetAside', label: 'Tax set-aside on variable income', unit: 'pct', get: r => r.defaults.taxSetAside, source: 'Rule of thumb (Reference data)', date: '2026-10-28' },
  { id: 'hoursPerMonthFallback', name: 'HoursPerMonth', label: 'Work hours a month when none are typed', unit: 'number', get: r => r.hoursPerMonthFallback, source: 'R153 (40 hours a week)', date: '2026-10-28' },
  // 2026 limits.
  { id: 'limits.401k.base', name: 'Limit_401k', label: '401(k), 403(b), 457, TSP deferral limit', unit: 'money', get: r => r.limits['401k'].base, source: IRS, date: '2026-10-28' },
  { id: 'limits.401k.catchUp50', name: 'Limit_401k_catchUp50', label: '401(k) catch-up, 50 and over', unit: 'money', get: r => r.limits['401k'].catchUp50, source: IRS, date: '2026-10-28' },
  { id: 'limits.401k.catchUp60to63', name: 'Limit_401k_catchUp60', label: '401(k) catch-up, ages 60 to 63', unit: 'money', get: r => r.limits['401k'].catchUp60to63, source: IRS, date: '2026-10-28' },
  { id: 'limits.ira.base', name: 'Limit_IRA', label: 'IRA limit (Roth or traditional)', unit: 'money', get: r => r.limits.ira.base, source: IRS, date: '2026-10-28' },
  { id: 'limits.ira.catchUp50', name: 'Limit_IRA_catchUp50', label: 'IRA catch-up, 50 and over', unit: 'money', get: r => r.limits.ira.catchUp50, source: IRS, date: '2026-10-28' },
  { id: 'limits.total415c', name: 'Limit_415c', label: 'Total defined contribution (415c)', unit: 'money', get: r => r.limits.total415c, source: IRS, date: '2026-10-28' },
  { id: 'limits.hsa.self', name: 'Limit_HSA_self', label: 'HSA limit, self-only', unit: 'money', get: r => r.limits.hsa.self, source: 'IRS, via HR Morning', date: '2026-10-28' },
  { id: 'limits.hsa.family', name: 'Limit_HSA_family', label: 'HSA limit, family', unit: 'money', get: r => r.limits.hsa.family, source: 'IRS, via HR Morning', date: '2026-10-28' },
  { id: 'limits.hsa.catchUp55', name: 'Limit_HSA_catchUp55', label: 'HSA catch-up, 55 and over', unit: 'money', get: r => r.limits.hsa.catchUp55, source: 'IRS, via HR Morning', date: '2026-10-28' },
  { id: 'limits.commuterMonthly', name: 'Limit_commuter', label: 'Pre-tax transit or parking, a month', unit: 'money', get: r => r.limits.commuterMonthly, source: 'IRS 2026 (not in the spec Reference data tab yet)', date: '2026-11-03' },
  { id: 'limits.rothIncome.single', name: 'RothIncome_single', label: 'Roth IRA phase-out starts, single', unit: 'money', get: r => r.limits.rothIncome.single, source: 'IRS 2026 (QUESTIONS 96: confirm)', date: '2026-11-03' },
  { id: 'limits.rothIncome.joint', name: 'RothIncome_joint', label: 'Roth IRA phase-out starts, joint', unit: 'money', get: r => r.limits.rothIncome.joint, source: 'IRS 2026 (QUESTIONS 96: confirm)', date: '2026-11-03' },
  // 2026 taxes.
  { id: 'tax.standardDeduction.single', name: 'StdDed_single', label: 'Standard deduction, single', unit: 'money', get: r => r.tax.standardDeduction.single, source: IRS_TAX, date: '2026-10-28' },
  { id: 'tax.standardDeduction.joint', name: 'StdDed_joint', label: 'Standard deduction, married jointly', unit: 'money', get: r => r.tax.standardDeduction.joint, source: IRS_TAX, date: '2026-10-28' },
  { id: 'tax.socialSecurityWageBase', name: 'SS_wageBase', label: 'Social Security wage base', unit: 'money', get: r => r.tax.socialSecurityWageBase, source: 'SSA 2026 announcement', date: '2026-10-28' },
  { id: 'tax.socialSecurityRate', name: 'SS_rate', label: 'Social Security rate', unit: 'pct', get: r => r.tax.socialSecurityRate, source: 'Statutory', date: '2026-10-28' },
  { id: 'tax.medicareRate', name: 'Medicare_rate', label: 'Medicare rate', unit: 'pct', get: r => r.tax.medicareRate, source: 'Statutory', date: '2026-10-28' },
  { id: 'tax.additionalMedicareRate', name: 'Medicare_addl', label: 'Additional Medicare rate', unit: 'pct', get: r => r.tax.additionalMedicareRate, source: 'Statutory', date: '2026-10-28' },
  { id: 'tax.additionalMedicareOver.single', name: 'Medicare_over_single', label: 'Additional Medicare starts, single', unit: 'money', get: r => r.tax.additionalMedicareOver.single, source: 'Statutory', date: '2026-10-28' },
  { id: 'tax.additionalMedicareOver.joint', name: 'Medicare_over_joint', label: 'Additional Medicare starts, joint', unit: 'money', get: r => r.tax.additionalMedicareOver.joint, source: 'Statutory', date: '2026-10-28' },
  { id: 'tax.selfEmployedRate', name: 'SE_rate', label: 'Self-employment tax rate', unit: 'pct', get: r => r.tax.selfEmployedRate, source: 'Statutory', date: '2026-10-28' },
  { id: 'tax.selfEmployedBase', name: 'SE_base', label: 'Self-employment tax on this share of earnings', unit: 'pct', get: r => r.tax.selfEmployedBase, source: 'Statutory', date: '2026-10-28' },
  { id: 'tax.state.NY.standardDeduction.single', name: 'NY_std_single', label: 'NY standard deduction, single', unit: 'money', get: r => r.tax.state.NY.standardDeduction.single, source: 'NY Tax Law (see the NY brackets note)', date: '2026-11-03' },
  { id: 'tax.state.NY.standardDeduction.joint', name: 'NY_std_joint', label: 'NY standard deduction, joint', unit: 'money', get: r => r.tax.state.NY.standardDeduction.joint, source: 'NY Tax Law (see the NY brackets note)', date: '2026-11-03' },
  { id: 'tax.state.NY.standardDeduction.head', name: 'NY_std_head', label: 'NY standard deduction, head of household', unit: 'money', get: r => r.tax.state.NY.standardDeduction.head, source: 'NY Tax Law (see the NY brackets note)', date: '2026-11-03' },
  // Typical rates, used when a client says Not sure (always a Guess).
  { id: 'typicalRates.Credit card', name: 'Typical_card', label: 'Typical credit card APR', unit: 'pct', get: r => r.typicalRates['Credit card'], source: FED, date: '2026-08-07' },
  { id: 'typicalRates.Personal loan', name: 'Typical_personal', label: 'Typical personal loan APR', unit: 'pct', get: r => r.typicalRates['Personal loan'], source: FED, date: '2026-08-07' },
  { id: 'typicalRates.Car loan', name: 'Typical_car', label: 'Typical car loan APR', unit: 'pct', get: r => r.typicalRates['Car loan'], source: FED, date: '2026-08-07' },
  // SLAM's own rules, kept in the code.
  { id: 'rules.cardMinimumFloor', name: 'CardMin_floor', label: 'Card minimum: at least', unit: 'money', get: () => RULES.cardMinimumFloor, source: RULE('js/math/debt.js, M30'), date: '2026-10-28' },
  { id: 'rules.cardMinimumPct', name: 'CardMin_pct', label: 'Card minimum: share of the balance, plus a month of interest', unit: 'pct', get: () => RULES.cardMinimumPct, source: RULE('js/math/debt.js, M30'), date: '2026-10-28' },
  { id: 'rules.housingLine', name: 'Housing_line', label: 'Housing reference line, share of take-home', unit: 'pct', get: () => RULES.housingLine, source: RULE('Math tab, M2A'), date: '2026-10-28' },
  { id: 'rules.saferWithdrawal', name: 'SaferWithdrawal', label: 'Safer withdrawal rate for a longer retirement (the second FI line)', unit: 'pct', get: () => RULES.saferWithdrawal, source: RULE('js/math/fi.js saferFi; MATH.md flag 1 (batch 5 C)'), date: '2026-11-06' },
  { id: 'rules.saferUnderAge', name: 'SaferUnderAge', label: 'The second FI line shows when FI would come before this age', unit: 'number', get: () => RULES.saferUnderAge, source: RULE('js/math/fi.js saferFi (batch 5 C)'), date: '2026-11-06' },
  { id: 'rules.bufferWeeks', name: 'BufferWeeks', label: 'Buffer (keeps checking from bouncing): weeks of spending', unit: 'number', get: () => RULES.bufferWeeks, source: RULE('js/math/layers.js, M68; overnight default, Nov 5'), date: '2026-11-05' },
  { id: 'rules.keepPaceMonths', name: 'KeepPace', label: 'Rule of 5 keep pace: spending divided by', unit: 'number', get: () => RULES.keepPaceMonths, source: RULE('js/math/assets.js, M43'), date: '2026-10-28' },
  { id: 'rules.littleE', name: 'LittleE', label: 'little e (most it holds)', unit: 'money', get: () => RULES.littleE, source: RULE('js/math/layers.js, M68'), date: '2026-11-03' },
  { id: 'rules.fatFactor', name: 'FatFactor', label: 'Fat FI: times regular spending', unit: 'number', get: () => RULES.fatFactor, source: RULE('js/plan.js (QUESTIONS: confirm)'), date: '2026-10-28' },
  { id: 'rules.trueFiTax', name: 'TrueFiTax', label: 'True FI: rough tax on withdrawals', unit: 'pct', get: () => RULES.trueFiTax, source: RULE('js/math/foo.js (QUESTIONS 93)'), date: '2026-11-03' },
  { id: 'rules.heavyApr', name: 'HeavyApr', label: 'Heavy debt: APR at or over', unit: 'pct', get: () => RULES.heavyApr, source: RULE('js/math/foo.js, FOO step 3'), date: '2026-11-03' },
  { id: 'rules.variableGuessShare', name: 'VarGuess', label: 'Variable income: share of a typical month when no lowest month', unit: 'pct', get: () => RULES.variableGuessShare, source: RULE('js/math/income.js, M16'), date: '2026-10-28' },
  { id: 'rules.roughCheckDays', name: 'CheckRough', label: 'Check a Roughly number again after, days', unit: 'number', get: () => RULES.roughCheckDays, source: RULE('js/checks.js, R061'), date: '2026-11-03' },
  { id: 'rules.agedCheckDays', name: 'CheckAged', label: 'Check any number again after, days', unit: 'number', get: () => RULES.agedCheckDays, source: RULE('js/checks.js, R061'), date: '2026-11-03' },
  { id: 'rules.debtFirst', name: 'DebtFirst_rule', label: 'The debt rule: while heavy debt is carried, the surplus goes to it first (1 on, 0 off)', unit: 'number', get: () => RULES.debtFirst, source: RULE('js/math/metrics.js debtRuleOf; Batch 11 item 1'), date: '2026-11-05' },
  { id: 'rules.freedFollowsFoo', name: 'FreedFollowsFoo', label: 'Freed money follows the FOO: after heavy debt the surplus and freed payments fill big e, then Tax-Free Growth, then are invested (1 on, 0 off)', unit: 'number', get: () => RULES.freedFollowsFoo, source: RULE('js/math/flow.js freedFlow, M79; Eli confirmed Nov 5 (QUESTIONS 196)'), date: '2026-11-05' },
  { id: 'rules.nextBestMin', name: 'NextBestMin', label: 'Next best opportunity: an alternative shows on a FOO step when it beats the step by at least this a year', unit: 'money', get: () => RULES.nextBestMin, source: RULE('js/math/flow.js nextBest, M80; Eli Nov 5: "actually measure the next best opportunity"'), date: '2026-11-05' },
  { id: 'rules.shortPlanMonths', name: 'ShortPlanMonths', label: 'Debt-free card: a plan this many months or shorter gets +5% / +10% / +25% chips instead of +$50 / +$100 / +$250', unit: 'number', get: () => RULES.shortPlanMonths, source: RULE('js/math/debt.js heroExtras; Batch 12 item 4 (QUESTIONS 200)'), date: '2026-11-05' },
  { id: 'rules.gapTrimLine', name: 'GapTrimLine', label: 'The gap: the spending lever trims the largest Level 1 or 2 line that can move by this share', unit: 'pct', get: () => RULES.gapTrimLine, source: RULE('js/math/gap.js gapOf, M81; Batch 12 item 5'), date: '2026-11-05' },
  { id: 'rules.gapTrimGut', name: 'GapTrimGut', label: 'The gap: with no spending lines, the spending lever trims the gut number by this share', unit: 'pct', get: () => RULES.gapTrimGut, source: RULE('js/math/gap.js gapOf, M81; Batch 12 item 5'), date: '2026-11-05' },
  { id: 'rules.maxMonths', name: 'MaxMonths', label: 'Longest FI path looked at, months', unit: 'number', get: () => RULES.maxMonths, source: RULE('js/math/fi.js, M53 (70 years)'), date: '2026-10-28' },
];

// Tables: rows of numbers. Each column is a named range (Table_column) the formulas read.
const bracketRows = list => list.map(([over, rate], i) => [over, rate, rate - (list[i - 1]?.[1] ?? 0)]);
const BRACKET_COLS = [['over', 'Income over', 'money'], ['rate', 'Rate', 'pct'], ['step', 'Rate step (this rate minus the one before)', 'pct']];
export const TABLES = [
  { id: 'Fed_single', label: 'Federal brackets, single', columns: BRACKET_COLS, rows: r => bracketRows(r.tax.brackets.single), source: IRS_TAX, date: '2026-10-28' },
  { id: 'Fed_joint', label: 'Federal brackets, married jointly', columns: BRACKET_COLS, rows: r => bracketRows(r.tax.brackets.joint), source: IRS_TAX, date: '2026-10-28' },
  { id: 'NY_single', label: 'NY brackets, single', columns: BRACKET_COLS, rows: r => bracketRows(r.tax.state.NY.brackets.single), source: r => r.tax.state.NY.source, date: '2026-11-03' },
  { id: 'NY_joint', label: 'NY brackets, joint', columns: BRACKET_COLS, rows: r => bracketRows(r.tax.state.NY.brackets.joint), source: r => r.tax.state.NY.source, date: '2026-11-03' },
  { id: 'NY_head', label: 'NY brackets, head of household', columns: BRACKET_COLS, rows: r => bracketRows(r.tax.state.NY.brackets.head), source: r => r.tax.state.NY.source, date: '2026-11-03' },
  { id: 'NYC_single', label: 'NYC brackets, single', columns: BRACKET_COLS, rows: r => bracketRows(r.tax.local.NYC.brackets.single), source: r => r.tax.local.NYC.source, date: '2026-11-03' },
  { id: 'NYC_joint', label: 'NYC brackets, joint', columns: BRACKET_COLS, rows: r => bracketRows(r.tax.local.NYC.brackets.joint), source: r => r.tax.local.NYC.source, date: '2026-11-03' },
  { id: 'NYC_head', label: 'NYC brackets, head of household', columns: BRACKET_COLS, rows: r => bracketRows(r.tax.local.NYC.brackets.head), source: r => r.tax.local.NYC.source, date: '2026-11-03' },
  { id: 'Per', label: 'Any period to a month (M01)', columns: [['name', 'Period', 'text'], ['month', 'Times a month', 'number'], ['year', 'Times a year', 'number']],
    rows: () => Object.keys(LISTS.perMonth).map(k => [k, LISTS.perMonth[k], LISTS.perYear[k]]), source: RULE('js/math/income.js, M01'), date: '2026-10-28' },
  { id: 'Typical', label: 'Typical APR by debt type (Not sure)', columns: [['type', 'Debt type', 'text'], ['apr', 'APR', 'pct']],
    rows: r => Object.entries(r.typicalRates), source: FED, date: '2026-08-07' },
  { id: 'Consumer', label: 'Consumer debt types (left out of liquid net worth)', columns: [['type', 'Debt type', 'text']],
    rows: () => LISTS.consumerDebt.map(t => [t]), source: RULE('js/math/metrics.js, M41'), date: '2026-10-28' },
  { id: 'Housing', label: 'Housing categories (M2A)', columns: [['category', 'Category', 'text']],
    rows: () => LISTS.housing.map(t => [t]), source: RULE('js/math/metrics.js, M2A'), date: '2026-10-28' },
  { id: 'Heavy', label: 'Heavy debt types (FOO step 3)', columns: [['type', 'Debt type', 'text']],
    rows: () => LISTS.heavyDebt.map(t => [t]), source: RULE('js/math/foo.js, FOO step 3'), date: '2026-11-03' },
  // The program (Phase 3): the levels, weights and pace behind the Picture % (M73).
  { id: 'Levels', label: 'Levels: points per number (M73)', columns: [['name', 'Level', 'text'], ['points', 'Points', 'number']],
    rows: () => Object.entries(LEVELS), source: RULE('js/registry/program.js'), date: '2026-11-05' },
  { id: 'Weights', label: 'Weights: how much each number counts in the Picture % (M73)', columns: [['item', 'Item', 'text'], ['weight', 'Weight', 'number']],
    rows: () => Object.entries(WEIGHTS), source: RULE('js/registry/program.js'), date: '2026-11-05' },
  { id: 'Pace', label: 'Pace: Picture % expected by the end of each session (M73)', columns: [['session', 'Session', 'number'], ['expected', 'Expected %', 'pct']],
    rows: () => SESSIONS.map((s, i) => [i + 1, (PACE.expected[i + 1] ?? PACE.hold) / 100]), source: RULE('js/registry/program.js'), date: '2026-11-05' },
  // The scorecard (batch 2): the thresholds and payoff rules behind each area's rating (M74).
  { id: 'Score', label: 'Scorecard thresholds and payoff rules (M74)', columns: [['area', 'Area', 'text'], ['rule', 'Rule', 'text'], ['value', 'Value', 'number']],
    rows: () => [...Object.entries(THRESHOLDS).flatMap(([a, t]) => Object.entries(t).map(([k, v]) => [a, k, v])), ...Object.entries(PAYOFF).flatMap(([a, t]) => Object.entries(t).map(([k, v]) => [a, `payoff ${k}`, v])),
      ...SCORE_AREAS.map(a => [a.id, 'effort hours (the usual)', a.effort])], source: RULE('js/registry/scorecard.js'), date: '2026-11-05' },
];

// Reference data that is a list of words (pickers), not a number the math uses. Declared so nothing is unaccounted for.
export const REFERENCE_LISTS = {
  'presets.realReturn': 'the preset choices; the default is RealReturn',
  'presets.withdrawalRate': 'the preset choices; the default is WithdrawalRate',
  'presets.inflation': 'the preset choices; the default is Inflation',
  'limits.401k.appliesTo': 'which account types the 401(k) limit covers',
  'limits.ira.appliesTo': 'which account types the IRA limit covers',
  'limits.commuterNote': 'a note on the commuter limit',
  typicalRatesNote: 'a note: the card Guess is 25% on purpose; the Fed average is 22.15%',
  'limits.rothIncome.note': 'a note on the Roth income limit',
  'tax.brackets': 'the Fed_single and Fed_joint tables',
  'tax.state.NY.brackets': 'the NY tables', 'tax.state.NY.source': 'the NY tables source', 'tax.local': 'the NYC tables',
  lists: 'picker lists (debt types, account types, statuses)',
  categoryDefaults: 'the starting DRAFTT letter, amount and date for each Budget category',
  spendingPresets: 'starter Budget lines, each a Guess',
  year: 'the tax year this file is for', source: 'where this file came from',
};

// Reference data that lives in its own file under data/library/ (a library, not a rate the math reads), each with
// where it came from and when it was taken. test/library.test.js fails when a file there is not listed here, or when a
// listed file's own id, source or asOf does not match. Batch 17: the skill library, no UI yet (docs/engines/library.md).
export const REFERENCE_FILES = [
  { id: 'library.skills', file: 'data/library/skills.json', label: 'The skill library: the FI Skill Tree\'s 625 skills (25 trees, 25 levels)',
    source: 'FI Skill Tree v6.3.1, from the public Sapphirestoneage/personalfinance repo (data/skill_tree.json, data/skill_links.json), copied by tools/library/extract-skills.mjs',
    date: '2026-11-05', readBy: 'nothing yet (Phase 4 library slice)' },
];

export const valueOf = (a, ref) => a.get(ref);
export const sourceOf = (t, ref) => (typeof t.source === 'function' ? t.source(ref) : t.source);
