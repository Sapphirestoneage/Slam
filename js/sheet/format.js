// SPDX-License-Identifier: AGPL-3.0-only
// The workbook's export format version and fingerprints. The version is a number in _meta that goes up whenever the
// registries' shape changes: shapeOf() hashes every field, formula and tab id, and FORMATS lists each shape with its
// number. When the hash is new, test/coverage.test.js fails and says the line to add here, so the number always
// moves with the shape. An older file still imports: its missing columns are left alone.
import { AREAS } from '../registry/fields.js';
import { MATH } from '../registry/math.js';
import { ASSUMPTIONS } from '../registry/assumptions.js';
import { REPORTS } from '../registry/reports.js';

export const APP_VERSION = '2026.11.5';

// FNV-1a, 32 bits, as 8 hex digits: small and the same in every browser and in Node.
export function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
// The same value always gives the same text, whatever order its keys were set in.
export const stable = v => (Array.isArray(v) ? `[${v.map(stable).join(',')}]` : v && typeof v === 'object'
  ? `{${Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}` : JSON.stringify(v ?? null));

// What a record holds, without its own bookkeeping (when it was touched).
export function fingerprint(rec) {
  if (!rec) return null;
  const { createdAt, updatedAt, ...rest } = rec;
  return hash(stable(rest));
}

export function shapeOf() {
  const ids = [
    ...AREAS.flatMap(a => [`tab:${a.tab}`, ...a.fields.filter(f => f.sheet === true).map(f => `field:${f.id}`)]),
    ...MATH.flatMap(e => [`math:${e.id}`, ...(e.parts || []).map(p => `math:${e.id}.${p.key}`), ...(e.cols || []).map(c => `col:${c.area}.${c.key}`)]),
    ...REPORTS.flatMap(r => [`tab:${r.tab}`, ...(r.cols || []).map(c => `col:${c.area}.${c.key}`)]),
    ...ASSUMPTIONS.filter(a => a.client).map(a => `assumption:${a.client}`),
  ];
  return hash(ids.sort().join('\n'));
}

// Each shape the registries have had, oldest first. Add a line (the next number) when the coverage test asks.
export const FORMATS = [
  { version: 1, shape: 'c1034e9f' }, // Nov 3 2026: the first export
  { version: 2, shape: '63c29a6a' }, // Nov 3 2026: Income's 401(k) a paycheck and Employer match?, Cash here is on purpose, Invest my surplus
  { version: 3, shape: 'ab31a47f' }, // Nov 3 2026: This amount is (your share or the whole bill) on Spending lines
  { version: 4, shape: 'aadce0f5' }, // Nov 3 2026: About you › Home and shared bills; the split SLAM uses on each Budget line
  { version: 5, shape: '641d89c9' }, // Nov 3 2026: shared fields (Name, Notes, Stress ...) carry their own area's id
  { version: 6, shape: 'fc766f60' }, // Nov 3 2026: Amount they cover, Reimbursed to you, Check again on, today's or future dollars
  { version: 7, shape: '2c78ff04' }, // Nov 5 2026: Locked (confirmed) on Income, Debt, Assets and Spending lines; M73 Picture %; the Program tab
  { version: 8, shape: '276f00d0' }, // Nov 5 2026: Short or long term and Need, want or wish on milestones; M74 Scorecard; the Scorecard tab
  { version: 9, shape: 'b964ff19' }, // Nov 5 2026: Retirement lines and after-tax contributions as investing (M27 retire, M28 afterTax); the surplus invested unless turned off
  { version: 10, shape: 'b521922f' }, // Nov 6 2026 (the overnight run, one bump): M75 the ladder; the household mode; owner on goals
  { version: 11, shape: '6aeffdc5' }, // Nov 6 2026 (batch 5, one bump): the Rule of 5 as age / 5 (M43 months a formula), Confidence beside Joy, the last paycheck matched on Income, the safer FI line, Split N ways and the per-bill My share / Whole bill on Profile (splitWith and billsGivenAs gone, migrated)
  { version: 12, shape: 'a2acef2e' }, // Nov 6 2026 (batch 6, one bump): the Institutions list (typed names migrate to rows), institutionId on accounts, debts and coverage
  { version: 13, shape: '22665ac6' }, // Nov 6 2026 (the merge with main's Your calendar, one bump): calendars on About you, Weekly lines with a weekday, Holiday on events; M78 Holiday dates (M75 on main before the merge)
  { version: 14, shape: '77a8c604' }, // Nov 5 2026 (batch 10, one bump): Typical amount, Level and Everything else on Spending lines (M27 by level); Bills and subscriptions as a letter; Why now chips on Profile
  { version: 15, shape: 'b9c21b0b' }, // Nov 5 2026 (batch 11, one bump): the debt rule (DebtFirst, M34 heavy and minimum, M53 debtMonths, freed, before), credit freeze, Extra to debt
  { version: 16, shape: '9d9b88a4' }, // Nov 5 2026 (batch 12, one bump): M79 freed money follows the FOO, M80 next best, M81 the gap, M82 next 3 moves, rules FreedFollowsFoo, NextBestMin, ShortPlanMonths, GapTrimLine, GapTrimGut
  { version: 17, shape: '5c3b3584' }, // Nov 6 2026 (batch 15, one bump): household tax columns, unemployment, Starts in, Paid to my partner, known changes on M53, M50 later, the 529 goal part
  { version: 18, shape: '05099ecd' }, // Nov 6 2026: materiality hours and floor per client (assumptions.materialHours, materialFloor)
  { version: 19, shape: 'c33c4b9f' }, // batch 21: settings.phase4 and M90 (Life Transitions)
  { version: 20, shape: '314ea84e' }, // Nov 6 2026 (batch 22): M25 by category, this month (Month end after an import)
  { version: 21, shape: 'b67d018a' }, // batch 24: M34 rangeLow and rangeHigh (the debt-free range), rules AprGuessSwing and RoughBalanceShare
  { version: 22, shape: '329adf3e' }, // batch 23: M83 Can I afford it?, and the M72 table and waterfall functions
  { version: 23, shape: '173768f5' }, // Nov 6 2026 (batch 30): the card library (debt.cardId, debt.cardUse), M9C worth its fee, M9D what moves the score, rules PlainCardRate, UtilHigh, UtilBest, InquiriesMany
  { version: 24, shape: '221ccf4a' }, // batch 25: profile.identity (address, letters, tilt, later) and M95 (who they are with money)
  { version: 25, shape: 'cb99234a' }, // batch 29: M9T, M9L, M9S (the true cost of debt, the student loan decision) and Debt › First borrowed
  { version: 26, shape: 'da9adc90' }, // batch 27: income by type (tips, shifts, Platform rows), Purpose: Taxes, the Platforms table
  { version: 27, shape: '27bcbd80' }, // batch 26: profile.library (skills done), M9K (learn and unlearn at each FOO step), rules LearnShown and CarPaymentYears
  { version: 28, shape: '3e1794ab' }, // Nov 6 2026 (batch 31): M9E typical at your age (data/priors-2026.json), rules TypicalLow, TypicalHigh
  { version: 29, shape: '45a738f7' }, // batch 35: workbook formulas for tips, shifts, house fees and Platform rows (Income), M10 tips (the tips deduction), M12 extra and platform
  { version: 30, shape: '0325a73e' }, // batch 36: profile.sleepAtNight (the sleep-at-night number on Cash layers), M68 sleepPicks, M9K libraryOn and slamRuleOf
  { version: 31, shape: 'a370bd9c' }, // batch 38: M27 sinking funds (Goals: Set aside a month), the couple's household part of a split bill (Spending), M81 the gap and its levers, M9E net worth by age (Assumptions)
  { version: 32, shape: 'cc7ff4a3' }, // batch 41: M9R ranges on the key outputs (low, likely, high), rules RangeBalance*, RangeSpend*, RangeIncome*, RangeVariable*, RangeAprRough, RangeMinMonths, RangeMinEfMonths
  { version: 33, shape: '82622750' }, // Nov 6 2026 (batch 28): who sees this (seen, notesSeen, shareName on every record kind)
  { version: 34, shape: 'd2b2a232' }, // batch 42: M9W the lender's-eye view, Income › Tax returns filed and the last two returns' net profit, rules Lender*
  { version: 35, shape: '30c2fd8b' }, // batch 44: M9F the bank fire drill (days covered, with the card, out of reach, must-pay), income Lands in and bankKey (skipped), table Bill_order, rule FireDrillDays
  { version: 36, shape: '7d731cd2' }, // batch 43: M9Q Ask me next and the certainty meter, rules CertaintyWeight*, CertaintyOpenMonths, AskSeconds*
  { version: 37, shape: 'fe5cb0eb' }, // batch 46: M9A the plan from an age (typical for the age until answered), rule PriorSpendShare
  { version: 38, shape: 'a5501e0b' }, // batch 48: the mortgage rate and the taxes-and-insurance share per client (assumptions.lenderRate, lenderTaxIns), account.planJob (Current job / Old job)
  { version: 39, shape: '9d7d2829' }, // batch 47: M9B the benefits cliff, About you › Benefits now (six taps), SNAP a month, Child care paid out of pocket, the cliff tables and values
  { version: 40, shape: 'cbac14c2' }, // batch 50: M9P the year-by-year projection (months to FI, debt free, net worth at 10 and 30 years, the age the money lasts to), rules ProjectionRaise, ProjectionCashReturn
  { version: 41, shape: '3cf3c796' }, // batch 49: M9N households of any size, the People tab (name, adult or dependent, role, age), Shared among and Split how on every row (the percents skipped), Owner P3 to P7
  { version: 42, shape: '6e45b952' }, // batch 51: M9H Shift P&L, Income › getting to a shift, childcare, outfits and gear, the hours around a shift, rule MileageRate
  { version: 43, shape: 'a8ebfcce' }, // batch 57: M73 answered and solid (the Picture split into quantity and quality), the Pace table's Reads and Due at start columns
  { version: 44, shape: '7b631d3a' }, // batch 53: head of household (StdDed_head, Fed_head), the Child Tax Credit (CTC_*, M10 ctc), New York's child care help (cliff.ccap, cliff.careFull, CCAP_*, M9B ccap)
  { version: 45, shape: '7b631d3a' }, // batch 55: the same columns as 44; the account type Savings or HYSA split into Savings and High-yield savings (often online), an older file's rows read as Savings (js/records.js migrate, js/import-sheet.js); the money-control map's fields (ctl*) are skipped, private by design
  { version: 46, shape: '52719be6' }, // batch 60: nights on an income row (kinds of night, the row's boxes their sum) and NYC area on About you (the typical numbers read the NY metro)
  { version: 47, shape: '7caa6b1e' }, // batch 56: M9J Social Security (each person's statement number and level, claim ages, the trust fund switch, the SS_ values and SS_fra table), the partner's own Retire by, go-go, slow-go and no-go spending, rules ProjectionSocialSecurity, ProjectionFiNet
  { version: 48, shape: 'a49bd526' }, // batch 62: the Phase 4 reads as live formulas: the Lender, Fire drill, Shift P&L, Credit score and Benefits cliff tabs, their columns on the Income, Debt, Assets, Budget and People tabs, and the FireDrill and Medicaid_states tables
  { version: 49, shape: '9f95f75d' }, // batch 58: People birth year for each adult past the couple (QUESTIONS 419), Institutions' Whose takes P3 to P7 (QUESTIONS 415)
  { version: 50, shape: 'ce7c59ee' }, // batch 63: the Ranges tab (M9R live, with What widens it), the priors tables on Assumptions (M9E, M9A), the M9N part column on each tab with an Owner, the M53 changes as dated
];
export const FORMAT_VERSION = FORMATS.at(-1).version;
export const formatOf = shape => FORMATS.findLast(f => f.shape === shape)?.version ?? null; // the newest version with that shape (batch 55: a type change keeps the shape)
