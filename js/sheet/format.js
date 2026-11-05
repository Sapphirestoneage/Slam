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
];
export const FORMAT_VERSION = FORMATS.at(-1).version;
export const formatOf = shape => FORMATS.find(f => f.shape === shape)?.version ?? null;
