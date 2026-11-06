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
  leanSeasonMonths: 3, // batch 15: an irregular income's lean-season fund holds this many months of the swing (no twelve months typed)
  fiRangeMaxYears: 5, // batch 15: an FI range wider than this many years shows the one step that narrows it instead
  aprGuessSwing: 0.05, roughBalanceShare: 0.10, // batch 24 (QUESTIONS 244, 245): a guessed APR 5 points either way, a rough balance 10% (docs/engines/ranges.md)
  materialHours: 2, materialFloor: 100, // batch 15: a task is worth doing when its dollars a year beat these hours at the real hourly wage (never under $100)
  debtFirst: 1, // batch 11: while heavy debt is carried the surplus goes to it first (1 on, 0 off); js/math/metrics.js debtRuleOf
  // Batch 12 (QUESTIONS 196, Eli Nov 5): freed money follows the FOO. After heavy debt the surplus and the freed payments
  // fill big e, then Tax-Free Growth, then the rest is invested (1 on, 0: invested once heavy debt is gone); js/math/flow.js.
  freedFollowsFoo: 1,
  shortPlanMonths: 12, // batch 12 (QUESTIONS 200): the debt-free card's chips become +5% / +10% / +25% on a plan this short or shorter
  gapTrimLine: 0.25, gapTrimGut: 0.1, // batch 12 (item 5): what a gap lever closes: a quarter of the largest line that can move, or a tenth of the gut number with no lines
  nextBestMin: 100, // batch 12: an alternative shows as "Worth a look" on a FOO step when it beats the step by this much a year
  // Batch 21 (Life Transitions, M90): retirement money taken before 59 and a half pays a 10% additional tax (IRS
  // Topic 558); the dip runs at most this many months; a card's cost is shown on this example amount and time.
  earlyPenalty: 0.1, penaltyAge: 59.5, transitionMaxMonths: 120, cardExampleAmount: 1000, cardExampleMonths: 3,
  // Batch 30 (the card library, M9C and M9D): a card with a fee is set against a no-fee card at this flat rate; the
  // score line names utilization over utilHigh, then over utilBest, and this many hard inquiries in 2 years (myFICO).
  plainCardRate: 0.02, utilHigh: 0.3, utilBest: 0.1, inquiriesMany: 3,
  // Batch 26 (the library's first slice, M9K): three skills to learn at each FOO step (the older Stacker's rule,
  // docs/engines/library.md). Can I afford it? (QUESTIONS 273): a car payment starts at this many years; other monthly costs For good.
  learnShown: 3, carPaymentYears: 5,
  // Batch 31 (typical at your age, js/math/priors.js): no Primary row publishes percentiles, so a typical range is this
  // spread around the source's figure (docs/engines/priors.md, until the CE and SCF microdata percentiles are read).
  typicalLow: 0.6, typicalHigh: 1.5,
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
  // Batch 21 (Life Transitions): the accounts that are retirement money, and the one with no early penalty (a 457(b)
  // plan's money comes out after leaving the job with no 10% additional tax, IRS Topic 558).
  retirementTypes: ['401(k)', '403(b)', '457', 'TSP', 'Solo 401(k)', 'Traditional IRA', 'Rollover IRA', 'SEP', 'SEP IRA', 'SIMPLE IRA', 'Roth IRA'],
  penaltyFreeTypes: ['457'],
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
  { id: 'client.retirementSpending', name: 'RetirementSpending', label: 'Spending in retirement, a month (blank: today\'s spending)', unit: 'money', get: () => null, client: 'retirementSpending', fallback: 'IF(Math_M27_spending="","",Math_M27_spending+N(Math_M50_later))', source: 'Plan › Goals (R030)', date: '2026-11-03' },
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
  // Unemployment benefits (batch 15, item 13).
  { id: 'limits.unemployment.NY.maxWeekly', name: 'UI_NY_maxWeekly', label: 'NY unemployment: most a week', unit: 'money', get: r => r.limits.unemployment.NY.maxWeekly, source: 'NY DOL, claims filed on or after Oct 6 2025 (via Littler, Oct 2025); QUESTIONS: check the Oct 2026 indexing', date: '2026-11-05' },
  { id: 'limits.unemployment.NY.weeks', name: 'UI_NY_weeks', label: 'NY unemployment: weeks it lasts', unit: 'number', get: r => r.limits.unemployment.NY.weeks, source: 'NY DOL (26 weeks of benefits)', date: '2026-11-05' },
  { id: 'tax.unemployment.withholdRate', name: 'UI_withhold', label: 'Unemployment: federal withholding when chosen', unit: 'pct', get: r => r.tax.unemployment.withholdRate, source: 'IRS Form W-4V (10%)', date: '2026-11-05' },
  // Batch 27 (income by type): the federal tips deduction (One Big Beautiful Bill Act, IRC section 224; final rules
  // T.D. 10044, Federal Register Apr 13 2026) and tip reporting (IRS Publication 531, Dec 2024 revision).
  { id: 'tax.tips.deductionCap', name: 'Tips_cap', label: 'Tips deduction: most a year, any filing status (federal income tax only; Social Security and Medicare still apply)', unit: 'money', get: r => r.tax.tips.deductionCap, source: 'IRS IR-2026-49 (Apr 10 2026); T.D. 10044, Federal Register Apr 13 2026, via RSM (Apr 2026)', date: '2026-11-06' },
  { id: 'tax.tips.phaseOutSingle', name: 'Tips_phaseSingle', label: 'Tips deduction: shrinks above this income (MAGI), single', unit: 'money', get: r => r.tax.tips.phaseOutSingle, source: 'T.D. 10044 (Apr 13 2026), via RSM', date: '2026-11-06' },
  { id: 'tax.tips.phaseOutJoint', name: 'Tips_phaseJoint', label: 'Tips deduction: shrinks above this income (MAGI), married jointly', unit: 'money', get: r => r.tax.tips.phaseOutJoint, source: 'T.D. 10044 (Apr 13 2026), via RSM', date: '2026-11-06' },
  { id: 'tax.tips.phaseOutPer1000', name: 'Tips_phaseStep', label: 'Tips deduction: dollars it shrinks by for each $1,000 over the line', unit: 'money', get: r => r.tax.tips.phaseOutPer1000, source: 'T.D. 10044 (Apr 13 2026), via RSM', date: '2026-11-06' },
  { id: 'tax.tips.firstYear', name: 'Tips_firstYear', label: 'Tips deduction: first tax year', unit: 'number', get: r => r.tax.tips.firstYear, source: 'T.D. 10044: applies to tax years beginning after Dec 31 2024', date: '2026-11-06' },
  { id: 'tax.tips.lastYear', name: 'Tips_lastYear', label: 'Tips deduction: last tax year (it ends unless Congress extends it)', unit: 'number', get: r => r.tax.tips.lastYear, source: 'T.D. 10044 (through 2028), via Thomson Reuters (Apr 13 2026)', date: '2026-11-06' },
  { id: 'tax.tips.reportOver', name: 'Tips_reportOver', label: 'Tips: a month of tips from one job at or over this is reported to the employer, by the 10th of the next month', unit: 'money', get: r => r.tax.tips.reportOver, source: 'IRS Publication 531 (Dec 2024 revision, page reviewed Apr 30 2026)', date: '2026-11-06' },
  { id: 'tax.tips.unreportedPenalty', name: 'Tips_penalty', label: 'Tips not reported to the employer: penalty, as a share of the Social Security and Medicare tax on them', unit: 'pct', get: r => r.tax.tips.unreportedPenalty, source: 'IRS Publication 531 (Dec 2024 revision): 50%, unless there is reasonable cause', date: '2026-11-06' },
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
  { id: 'rules.freedFollowsFoo', name: 'FreedFollowsFoo', label: 'Freed money follows the FOO: the surplus fills step 1 (buffer, little e) first, then heavy debt; after it the surplus and freed payments fill big e, then Tax-Free Growth, then are invested (1 on, 0 off)', unit: 'number', get: () => RULES.freedFollowsFoo, source: RULE('js/math/flow.js freedFlow, M79; Eli confirmed Nov 5 (QUESTIONS 196); step 1 first, QUESTIONS 217, Nov 6'), date: '2026-11-06' },
  { id: 'rules.nextBestMin', name: 'NextBestMin', label: 'Next best opportunity: an alternative shows on a FOO step when it beats the step by at least this a year', unit: 'money', get: () => RULES.nextBestMin, source: RULE('js/math/flow.js nextBest, M80; Eli Nov 5: "actually measure the next best opportunity"'), date: '2026-11-05' },
  { id: 'rules.earlyPenalty', name: 'EarlyPenalty', label: 'Life Transitions: the additional tax on retirement money taken early', unit: 'pct', get: () => RULES.earlyPenalty, source: 'IRS Topic 558, additional tax on early distributions (10%)', date: '2026-11-06' },
  { id: 'rules.penaltyAge', name: 'PenaltyAge', label: 'Life Transitions: the age from which retirement money comes out with no early penalty', unit: 'number', get: () => RULES.penaltyAge, source: 'IRS Topic 558 (age 59 and a half)', date: '2026-11-06' },
  { id: 'rules.transitionMaxMonths', name: 'TransitionMaxMonths', label: 'Life Transitions: the dip runs this many months at most (past it: the money lasts)', unit: 'number', get: () => RULES.transitionMaxMonths, source: RULE('js/math/transitions.js dipOf, M90'), date: '2026-11-06' },
  { id: 'rules.cardExampleAmount', name: 'CardExampleAmount', label: 'Life Transitions: a card rung shows its cost on this many dollars', unit: 'money', get: () => RULES.cardExampleAmount, source: RULE('js/math/transitions.js cardCost, M90 (Eli Nov 5: "using $1,000 for 3 months costs about $60")'), date: '2026-11-06' },
  { id: 'rules.cardExampleMonths', name: 'CardExampleMonths', label: 'Life Transitions: a card rung shows its cost over this many months', unit: 'number', get: () => RULES.cardExampleMonths, source: RULE('js/math/transitions.js cardCost, M90'), date: '2026-11-06' },
  { id: 'rules.shortPlanMonths', name: 'ShortPlanMonths', label: 'Debt-free card: a plan this many months or shorter gets +5% / +10% / +25% chips instead of +$50 / +$100 / +$250', unit: 'number', get: () => RULES.shortPlanMonths, source: RULE('js/math/debt.js heroExtras; Batch 12 item 4 (QUESTIONS 200)'), date: '2026-11-05' },
  { id: 'rules.gapTrimLine', name: 'GapTrimLine', label: 'The gap: the spending lever trims the largest Level 1 or 2 line that can move by this share', unit: 'pct', get: () => RULES.gapTrimLine, source: RULE('js/math/gap.js gapOf, M81; Batch 12 item 5'), date: '2026-11-05' },
  { id: 'rules.gapTrimGut', name: 'GapTrimGut', label: 'The gap: with no spending lines, the spending lever trims the gut number by this share', unit: 'pct', get: () => RULES.gapTrimGut, source: RULE('js/math/gap.js gapOf, M81; Batch 12 item 5'), date: '2026-11-05' },
  { id: 'rules.leanSeasonMonths', name: 'LeanSeasonMonths', label: 'Irregular income: lean-season fund, months of the swing', unit: 'number', get: () => RULES.leanSeasonMonths, source: RULE('js/math/income.js irregularPlan; batch 15 item 11 (QUESTIONS: confirm 3)'), date: '2026-11-06' },
  { id: 'rules.aprGuessSwing', name: 'AprGuessSwing', label: 'Debt-free range: a guessed APR moves this many points either way', unit: 'pct', get: () => RULES.aprGuessSwing, source: RULE('js/math/metrics.js debtRangeOf; docs/engines/ranges.md (APR 5 points if guessed); QUESTIONS 244'), date: '2026-11-06' },
  { id: 'rules.roughBalanceShare', name: 'RoughBalanceShare', label: 'Debt-free and FI ranges: a balance marked Roughly or Not sure moves this share either way', unit: 'pct', get: () => RULES.roughBalanceShare, source: RULE('js/math/metrics.js debtRangeOf, js/math/fi.js fiRangeOf; docs/engines/ranges.md (balances 10%); QUESTIONS 244, 245'), date: '2026-11-06' },
  { id: 'rules.fiRangeMaxYears', name: 'FiRangeMaxYears', label: 'FI date range: widest shown, years (wider shows the one step that narrows it)', unit: 'number', get: () => RULES.fiRangeMaxYears, source: RULE('js/math/picture.js fiWordsOf; batch 15 item 7 (QUESTIONS: confirm 5)'), date: '2026-11-06' },
  // Batch 29 (the true cost of debt and the student loan decision, js/math/truecost.js and studentloan.js).
  { id: 'tax.mortgageDebtLimit', name: 'MortgageDebtLimit', label: 'Home loan interest is deductible on this much debt (itemizers only)', unit: 'money', get: r => r.tax.mortgageDebtLimit, source: 'IRC 163(h)(3)(F), made permanent by the 2025 law (P.L. 119-21) (unverified: from memory; confirm in IRS Pub. 936 for 2026)', date: '2026-11-06' },
  { id: 'tax.saltCap', name: 'SaltCap', label: 'State and local taxes an itemizer can deduct, a year', unit: 'money', get: r => r.tax.saltCap, source: 'P.L. 119-21 sec. 70120: $40,000 for 2025 plus 1% a year (unverified: from memory; confirm in the 2026 Schedule A instructions)', date: '2026-11-06' },
  { id: 'studentLoans.poverty.base', name: 'Poverty_base', label: 'Poverty guideline, one person (48 states and DC)', unit: 'money', get: r => r.studentLoans.poverty.base, source: 'HHS 2026 poverty guidelines (Federal Register, Jan 26 2026: the LSC table is 125% of it)', date: '2026-11-06' },
  { id: 'studentLoans.poverty.perPerson', name: 'Poverty_perPerson', label: 'Poverty guideline, each added person', unit: 'money', get: r => r.studentLoans.poverty.perPerson, source: 'HHS 2026 poverty guidelines (Federal Register, Jan 26 2026)', date: '2026-11-06' },
  { id: 'studentLoans.ibr.newPct', name: 'IBR_newPct', label: 'IBR payment, first borrowed July 2014 or later: share of income over the line', unit: 'pct', get: r => r.studentLoans.ibr.newPct, source: 'HEA 493C as changed by P.L. 119-21 (no hardship test now), via Tate Law, Income-Driven Repayment Plans in 2026 (updated Oct 4 2026)', date: '2026-11-06' },
  { id: 'studentLoans.ibr.newYears', name: 'IBR_newYears', label: 'IBR forgiveness, first borrowed July 2014 or later, years', unit: 'number', get: r => r.studentLoans.ibr.newYears, source: 'HEA 493C, via Tate Law (updated Oct 4 2026)', date: '2026-11-06' },
  { id: 'studentLoans.ibr.oldPct', name: 'IBR_oldPct', label: 'IBR payment, first borrowed before July 2014: share of income over the line', unit: 'pct', get: r => r.studentLoans.ibr.oldPct, source: 'HEA 493C, via Tate Law (updated Oct 4 2026)', date: '2026-11-06' },
  { id: 'studentLoans.ibr.oldYears', name: 'IBR_oldYears', label: 'IBR forgiveness, first borrowed before July 2014, years', unit: 'number', get: r => r.studentLoans.ibr.oldYears, source: 'HEA 493C, via Tate Law (updated Oct 4 2026)', date: '2026-11-06' },
  { id: 'studentLoans.ibr.povertyMultiple', name: 'IBR_povertyLine', label: 'IBR: income over this many times the poverty guideline is counted', unit: 'number', get: r => r.studentLoans.ibr.povertyMultiple, source: 'HEA 493C, via Tate Law (updated Oct 4 2026)', date: '2026-11-06' },
  { id: 'studentLoans.rap.minimum', name: 'RAP_minimum', label: 'RAP: the smallest payment a month', unit: 'money', get: r => r.studentLoans.rap.minimum, source: 'P.L. 119-21 sec. 82001 (HEA 455(q)), via Student Loan Planner (Jul 30 2026) and CRS IF13075', date: '2026-11-06' },
  { id: 'studentLoans.rap.perDependent', name: 'RAP_perDependent', label: 'RAP: taken off the payment a month for each dependent', unit: 'money', get: r => r.studentLoans.rap.perDependent, source: 'P.L. 119-21 sec. 82001, via Student Loan Planner (Jul 30 2026) and CRS IF13075', date: '2026-11-06' },
  { id: 'studentLoans.rap.principalMatch', name: 'RAP_principalMatch', label: 'RAP: when a payment takes less than $50 off the principal, the principal goes down by up to this much more (the lesser of $50 and the part of the payment that went to interest); interest the payment leaves is waived', unit: 'money', get: r => r.studentLoans.rap.principalMatch, source: 'P.L. 119-21 sec. 82001, via CRS IF13075 and Student Loan Planner (unverified: read from the CRS wording, the lesser of $50 or the payment minus the principal it repaid; no worked example from the Department yet)', date: '2026-11-06' },
  { id: 'studentLoans.rap.years', name: 'RAP_years', label: 'RAP forgiveness, years (360 payments)', unit: 'number', get: r => r.studentLoans.rap.years, source: 'P.L. 119-21 sec. 82001, via Student Loan Planner (Jul 30 2026)', date: '2026-11-06' },
  { id: 'studentLoans.pslfPayments', name: 'PSLF_payments', label: 'PSLF: qualifying payments to forgiveness (tax-free)', unit: 'number', get: r => r.studentLoans.pslfPayments, source: 'HEA 455(m) and IRC 108(f)(1), via Student Loan Planner (Jul 30 2026)', date: '2026-11-06' },
  { id: 'studentLoans.standardYears', name: 'Standard_years', label: 'Standard plan for loans before July 2026, years', unit: 'number', get: r => r.studentLoans.standardYears, source: 'Tate Law, Tiered Standard Repayment Plan (Sep 1 2026): the 10-year plan stays for older loans', date: '2026-11-06' },
  { id: 'studentLoans.interestDeduction.max', name: 'SLID_max', label: 'Student loan interest deduction, most a year', unit: 'money', get: r => r.studentLoans.interestDeduction.max, source: 'IRC 221 (not indexed), via beancount.io (Sep 13 2026)', date: '2026-11-06' },
  { id: 'studentLoans.interestDeduction.singleFrom', name: 'SLID_singleFrom', label: 'Student loan interest deduction phases out from (single)', unit: 'money', get: r => r.studentLoans.interestDeduction.singleFrom, source: 'IRS Rev. Proc. 2025-32 for 2026, via beancount.io (Sep 13 2026) (unverified against the Rev. Proc. itself)', date: '2026-11-06' },
  { id: 'studentLoans.interestDeduction.singleTo', name: 'SLID_singleTo', label: 'Student loan interest deduction gone at (single)', unit: 'money', get: r => r.studentLoans.interestDeduction.singleTo, source: 'IRS Rev. Proc. 2025-32, via beancount.io (unverified against the Rev. Proc. itself)', date: '2026-11-06' },
  { id: 'studentLoans.interestDeduction.jointFrom', name: 'SLID_jointFrom', label: 'Student loan interest deduction phases out from (married jointly)', unit: 'money', get: r => r.studentLoans.interestDeduction.jointFrom, source: 'IRS Rev. Proc. 2025-32, via beancount.io (unverified against the Rev. Proc. itself)', date: '2026-11-06' },
  { id: 'studentLoans.interestDeduction.jointTo', name: 'SLID_jointTo', label: 'Student loan interest deduction gone at (married jointly)', unit: 'money', get: r => r.studentLoans.interestDeduction.jointTo, source: 'IRS Rev. Proc. 2025-32, via beancount.io (unverified against the Rev. Proc. itself)', date: '2026-11-06' },
  { id: 'studentLoans.idrForgivenessTaxed', name: 'IDR_forgivenTaxed', label: 'Forgiveness after IBR or RAP is taxed as income: 1 yes, 0 no (PSLF never is)', unit: 'number', get: r => r.studentLoans.idrForgivenessTaxed, source: 'The ARPA sec. 9675 exclusion ended Dec 31 2025, via Tate Law (Oct 4 2026) and Student Loan Planner (Jul 30 2026)', date: '2026-11-06' },
  { id: 'rules.materialHours', name: 'MaterialHours', label: 'Worth doing: dollars a year beat this many hours at your real hourly wage', unit: 'number', get: () => RULES.materialHours, client: 'materialHours', source: RULE('js/plan.js next3 (R073); batch 15 item 4 (QUESTIONS: confirm 2 hours)'), date: '2026-11-06' },
  { id: 'rules.materialFloor', name: 'MaterialFloor', label: 'Worth doing: never under this many dollars a year', unit: 'money', get: () => RULES.materialFloor, client: 'materialFloor', source: RULE('js/plan.js next3 (R073)'), date: '2026-11-06' },
  { id: 'rules.plainCardRate', name: 'PlainCardRate', label: 'Card library: a no-fee card set beside a card with a fee earns this on everything', unit: 'pct', get: () => RULES.plainCardRate, source: RULE('js/math/cards.js feeCheck, M9C; batch 30 (Wells Fargo Active Cash and Citi Double Cash pay 2% with no fee)'), date: '2026-11-06' },
  { id: 'rules.utilHigh', name: 'UtilHigh', label: 'Your credit: utilization over this moves the score most after on-time payments', unit: 'pct', get: () => RULES.utilHigh, source: 'myFICO, What\'s in my FICO Scores (amounts owed are 30% of the score; under 30% utilization is the common guide)', date: '2026-11-06' },
  { id: 'rules.utilBest', name: 'UtilBest', label: 'Your credit: utilization under this is where the best scores sit', unit: 'pct', get: () => RULES.utilBest, source: 'myFICO, What\'s in my FICO Scores (people with top scores use under 10% of their limits)', date: '2026-11-06' },
  { id: 'rules.inquiriesMany', name: 'InquiriesMany', label: 'Your credit: this many hard inquiries in 2 years makes holding off on applications the next step', unit: 'number', get: () => RULES.inquiriesMany, source: RULE('js/math/cards.js creditMove, M9D; the Credit health note (more than 2 holds a strong score at OK)'), date: '2026-11-06' },
  { id: 'rules.learnShown', name: 'LearnShown', label: 'The library: skills to learn shown at each FOO step', unit: 'number', get: () => RULES.learnShown, source: RULE('js/math/library.js, M9K; the older suite\'s Stacker, three at a time (docs/engines/library.md)'), date: '2026-11-06' },
  { id: 'rules.carPaymentYears', name: 'CarPaymentYears', label: 'Can I afford it?: a car payment starts at this many years (other monthly costs start at For good)', unit: 'number', get: () => RULES.carPaymentYears, source: RULE('js/math/afford.js, M83; QUESTIONS 273 (decided Nov 6)'), date: '2026-11-06' },
  { id: 'rules.typicalLow', name: 'TypicalLow', label: 'Typical at your age: the low end of a typical range, times the source\'s median (or mean)', unit: 'number', get: () => RULES.typicalLow, source: RULE('js/math/priors.js, M9E; docs/engines/priors.md, until percentiles are read'), date: '2026-11-06' },
  { id: 'rules.typicalHigh', name: 'TypicalHigh', label: 'Typical at your age: the high end of a typical range, times the source\'s median (or mean)', unit: 'number', get: () => RULES.typicalHigh, source: RULE('js/math/priors.js, M9E; docs/engines/priors.md, until percentiles are read'), date: '2026-11-06' },
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
  { id: 'QuarterlyDue', label: 'Quarterly estimated tax due dates (month-day; the fourth is in January of the next year)', columns: [['quarter', 'Quarter', 'number'], ['due', 'Due', 'text']],
    rows: r => r.tax.quarterlyDue.map((d, i) => [i + 1, d]), source: 'IRS Form 1040-ES (2026)', date: '2026-11-05' },
  // Batch 27: platform income (each row: the fee, the days a payout is held, the usual payout schedule, and where it came from).
  { id: 'Platforms', label: 'Platforms: fee, hold and payout schedule (prefilled on a Platform income row)', columns: [['platform', 'Platform', 'text'], ['fee', 'Fee', 'pct'], ['hold', 'Hold, days', 'number'], ['payout', 'Payout', 'text'], ['source', 'Source', 'text']],
    rows: r => Object.entries(r.platforms).map(([k, p]) => [k, p.fee, p.holdDays, p.payout, p.source]), source: 'Each row names its source (checked Nov 6 2026; the unverified ones are on QUESTIONS)', date: '2026-11-06' },
  { id: 'NYC_single', label: 'NYC brackets, single', columns: BRACKET_COLS, rows: r => bracketRows(r.tax.local.NYC.brackets.single), source: r => r.tax.local.NYC.source, date: '2026-11-03' },
  { id: 'NYC_joint', label: 'NYC brackets, joint', columns: BRACKET_COLS, rows: r => bracketRows(r.tax.local.NYC.brackets.joint), source: r => r.tax.local.NYC.source, date: '2026-11-03' },
  { id: 'NYC_head', label: 'NYC brackets, head of household', columns: BRACKET_COLS, rows: r => bracketRows(r.tax.local.NYC.brackets.head), source: r => r.tax.local.NYC.source, date: '2026-11-03' },
  { id: 'RAP_bands', label: 'RAP: share of the whole AGI a year by income (batch 29)', columns: [['over', 'AGI over', 'money'], ['rate', 'Share of AGI', 'pct']],
    rows: r => r.studentLoans.rap.bands, source: 'P.L. 119-21 sec. 82001, via Student Loan Planner (Jul 30 2026); $10,000 or less pays the minimum', date: '2026-11-06' },
  { id: 'Tiered_standard', label: 'Tiered Standard plan years by balance, loans first disbursed July 2026 or later (does not count for PSLF)', columns: [['over', 'Balance from', 'money'], ['years', 'Years', 'number']],
    rows: r => r.studentLoans.tiered, source: 'Tate Law, Tiered Standard Repayment Plan (Sep 1 2026)', date: '2026-11-06' },
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
  'tax.brackets': 'the Fed_single and Fed_joint tables', 'tax.quarterlyDue': 'the QuarterlyDue table',
  'tax.state.NY.brackets': 'the NY tables', 'tax.state.NY.source': 'the NY tables source', 'tax.local': 'the NYC tables',
  'studentLoans.rap.bands': 'the RAP_bands table', 'studentLoans.tiered': 'the Tiered_standard table', 'studentLoans.asOf': 'the day the student loan rules were checked (batch 29)',
  'studentLoans.legacyCloses': 'the day PAYE and ICR close to new enrollment, June 30 2028 (Tate Law, Oct 4 2026); words on the student loan drill-down, no math reads it',
  'studentLoans.saveEnded': 'the day a court order ended SAVE, March 10 2026 (Tate Law, Oct 4 2026); words only',
  lists: 'picker lists (debt types, account types, statuses) and, since batch 20, the usual 401(k) match formulas as taps (matchPicks: the job row\'s first tier)',
  platforms: 'the Platforms table (batch 27)',
  'tax.noWageTax': 'the states with no tax on wages (batch 35, QUESTIONS 306): words on Taxes only ("FL has no state income tax on wages"); no math reads it',
  categoryDefaults: 'the starting DRAFTT letter, amount and date for each Budget category',
  spendingPresets: 'starter Budget lines, each a Guess',
  year: 'the tax year this file is for', source: 'where this file came from',
  transitions: 'Life Transitions (batch 21, js/math/transitions.js, M90): the templates (job loss, quitting, student to job, marriage, a baby, divorce, empty nest, something else), their start and destination words, which income types stop, how the cut starts, the tripwire choices and the ways to earn money quickly. Words and tap choices: no math reads a number from them',
  importFormats: 'batch 22: the CSV exports SLAM recognizes (Rocket Money, Monarch, a bank), each by its header row, with its columns, sign and source links (js/import/apps.js). Words, not numbers',
  importCategories: 'batch 22: each app\'s own category names to SLAM\'s Budget line categories (or income, transfer, debt, leave out), with sources; a client\'s own edits are kept in settings.importCategoryMap',
  merchantWords: 'batch 22: merchant words to a Budget line category (or paycheck, transfer, debt), the last matching step on an import; shown as Guessed',
  findWords: 'Find\'s everyday words (batch 14, js/find.js): what people type (401k, emergency fund, payday) and the screen and box each lands on, so Find reaches a thing in one search. Words, not numbers: no math reads them',
};

// Reference data that lives in its own file under data/library/ (a library, not a rate the math reads), each with
// where it came from and when it was taken. test/library.test.js fails when a file there is not listed here, or when a
// listed file's own id, source or asOf does not match. Batch 17: the skill library, no UI yet (docs/engines/library.md).
export const REFERENCE_FILES = [
  { id: 'library.skills', file: 'data/library/skills.json', label: 'The skill library: the FI Skill Tree\'s 625 skills (25 trees, 25 levels)',
    source: 'FI Skill Tree v6.3.1, from the public Sapphirestoneage/personalfinance repo (data/skill_tree.json, data/skill_links.json), copied by tools/library/extract-skills.mjs',
    date: '2026-11-05', readBy: 'Plan › FOO (each step\'s Learn and unlearn) and Home (Learn next), through js/math/library.js (M9K)' },
  // Batch 24 (QUESTIONS 207): the second set, the older app's own 40 skills, tagged by FOO step from their gates.
  { id: 'library.appSkills', file: 'data/library/app-skills.json', label: 'The skill library, second set: the older app\'s own 40 skills (six trees, with their proofs)',
    source: 'The older app\'s skills (data/skill_tree.json, the six app trees, gates read against data/foo_rules.json), from the public Sapphirestoneage/personalfinance repo, copied by tools/library/extract-app-skills.mjs',
    date: '2026-11-06', readBy: 'Plan › FOO and Home, through js/math/library.js (M9K): the picks, and the data proofs that tick themselves' },
  // Batch 26: the unlearn list, SLAM's own (popular advice that fits one FOO stage and not another).
  { id: 'library.unlearn', file: 'data/library/unlearn.json', label: 'The unlearn list: popular advice that fits one FOO step and not another, with the step it belongs to',
    source: 'SLAM\'s own (Eli Saperstein), written for SLAM\'s FOO steps in Batch 26; from names where each piece of advice is usually heard',
    date: '2026-11-06', readBy: 'Plan › FOO (the one thing to unlearn at each step), through js/math/library.js (M9K)' },
  // Batch 36 (QUESTIONS 313): where a skill's words disagree with a SLAM rule, SLAM's rule in one line (the skill's words stay).
  { id: 'library.slamRules', file: 'data/library/slam-rules.json', label: 'SLAM\'s rule beside a skill: one line per skill whose words disagree with a SLAM rule (the Rule of 5, heavy debt at 8%, the cash layers, the FOO order)',
    source: 'SLAM\'s own (Eli Saperstein), from a scan of all 665 skills against RULES and the FOO in Batch 36; the skill files are not changed',
    date: '2026-11-06', readBy: 'Plan › FOO (each step\'s Learn and unlearn) and Home (Learn next), through js/math/library.js (M9K)' },
  { id: 'library.cards', file: 'data/library/cards.json', label: 'The card library: current consumer cards of the biggest US issuers, store and secured cards (fee, APR range, rewards, credits, benefits)',
    source: 'The issuers\' own pages first (Chase, Capital One, Bank of America, Wells Fargo, US Bank, Citi, American Express, Apple), read 2026-11-06; each card names its source and whether it was checked there, on a review site, or not re-read (tools/library/cards-source.mjs)',
    date: '2026-11-06', readBy: 'Net worth > Credit cards (js/ui/cards-ui.js): Which card is it?, What your cards give you, the fee check (js/math/cards.js, M9C)' },
  // Batch 31 (Phase 4, Track 1): typical at your age, only the rows docs/engines/priors-sources.md marks Primary.
  { id: 'priors', file: 'data/priors-2026.json', label: 'Typical at your age: net worth by age, cash, card balances and student loans (SCF 2025), spending by age (CE 2024), emergency savings by age (SHED 2025)',
    source: 'Federal Reserve SCF 2025 report (scf26.pdf, Tables 2 to 4), Federal Reserve SHED data tables (survey of October 2025), BLS Consumer Expenditure Survey 2024 by age on FRED; only the Primary rows of docs/engines/priors-sources.md',
    date: '2026-11-06', readBy: 'the money box hook (js/ui/typical-ui.js): a faded typical range in a blank box (coach view) and a one-line note under a typed number far outside typical (js/math/priors.js, M9E)' },
];

export const valueOf = (a, ref) => a.get(ref);
export const sourceOf = (t, ref) => (typeof t.source === 'function' ? t.source(ref) : t.source);
