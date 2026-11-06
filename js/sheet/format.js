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
];
export const FORMAT_VERSION = FORMATS.at(-1).version;
export const formatOf = shape => FORMATS.find(f => f.shape === shape)?.version ?? null;
