// SPDX-License-Identifier: AGPL-3.0-only
// Batch 31 (Phase 4, Track 1 groundwork): "typical at your age" from data/priors-2026.json, which holds only the rows
// docs/engines/priors-sources.md marks Primary. For an age band (and a place, where a primary row gives one) the
// typical range of a field; a check on a typed number far outside it, in calm words; and the shares (SHED) that are
// a chance, not an amount. Every function takes the priors data as an argument: the math never loads a file.
// No row publishes percentiles, so a range is SLAM's stated spread (RULES typicalLow, typicalHigh) around the
// source's figure: the median where it gives one (SCF), else the mean (CE). "Far outside" is one more spread beyond
// an edge: above high x high / likely, or below low x low / likely (2.25 and 0.36 of likely at 0.6 and 1.5).
import { fmt } from './result.js';
import { RULES } from '../registry/assumptions.js';

const money = v => fmt.money(Math.round(v));

// The fields with a typical range, what the note says they are, and which sides of the range get a note. A debt or
// spending a long way under typical is not worth a line, and a solo household's spending is under a CE average
// household's by design, so those only note the high side.
export const TYPICAL = {
  cash: { what: 'have in checking and savings', short: 'checking and savings, all accounts together', sides: ['above', 'below'] },
  card: { what: 'carry on cards', short: 'card balances, all cards together', sides: ['above'] },
  studentLoans: { what: 'owe on student loans', short: 'student loans, all together', sides: ['above'] },
  spending: { what: 'spend a month', short: 'spending a month, all in', sides: ['above'], perMonth: true },
  netWorth: { what: 'have in net worth', short: 'net worth', sides: [] },
};
// CE categories as a month (spending.<key>): the shape for a later Budget check, no note yet.
export const CE_CATEGORIES = ['total', 'food', 'foodAtHome', 'foodAway', 'housing', 'shelter', 'utilities', 'transportation', 'vehiclePurchases', 'healthCare', 'entertainment', 'apparel', 'personalInsurance', 'cashContributions'];
// No Primary row yet: these say why instead of a range (empty is not zero).
export const NO_ROW = {
  rent: 'No Primary rent row yet (ACS B25064 is still Secondary); CE rented dwellings averages renters and owners',
  retirement: 'No Primary retirement balance by age yet (the SCF historical tables are not read)',
};

const inBand = (ages, age) => !ages || (age != null && (ages[0] == null || age >= ages[0]) && (ages[1] == null || age <= ages[1]));
// The row for a field at an age: the age band's row, else the all-ages row (which says so), else null.
export function rowFor(data, field, age = null) {
  const rows = (data?.rows || []).filter(r => r.field === field);
  return rows.find(r => r.ages && inBand(r.ages, age)) ?? rows.find(r => !r.ages) ?? null;
}
// A place scale where a primary row gives one (none yet: data.place is empty, so every figure is national).
export const placeOf = (data, field, place) => (place ? (data?.place || []).find(p => p.place === place && (p.field === field || p.field === '*')) ?? null : null);

const center = r => r.median ?? r.mean ?? null;
// Spending all in, a month: CE total expenditures less personal insurance and pensions (payroll taxes and retirement
// contributions, which come out before take-home), over 12. Both rows from the same band, or nothing.
function spendingRow(data, age) {
  const t = rowFor(data, 'spending.total', age), p = rowFor(data, 'spending.personalInsurance', age);
  if (!t || !p || t.band !== p.band) return null;
  return { ...t, field: 'spending', mean: (t.mean - p.mean) / 12, unit: 'month', table: `${t.table} less ${p.table.replace(/, annual.*$/, '')}, over 12` };
}

// The typical range: { field, low, likely, high, by: 'median' | 'mean', band, who, allAges, source, table, link, year,
// place, basis }, or null when no Primary row covers it (NO_ROW says why).
export function typicalOf(data, field, { age = null, place = null, low = RULES.typicalLow, high = RULES.typicalHigh } = {}) {
  if (NO_ROW[field]) return null;
  const r = field === 'spending' ? spendingRow(data, age) : field.startsWith('spending.') ? ((x) => (x ? { ...x, mean: x.mean / 12, unit: 'month' } : null))(rowFor(data, field, age)) : rowFor(data, field, age);
  const c = r ? center(r) : null;
  if (c == null || r.unit === 'share') return null;
  const p = placeOf(data, field, place);
  const likely = c * (p?.factor ?? 1);
  const by = r.median != null ? 'median' : 'mean';
  const src = data.sources?.[r.source]?.name ?? r.source;
  const at = r.ages ? r.band : 'all ages';
  return { field, low: likely * low, likely, high: likely * high, by, band: r.band, who: r.who, allAges: !r.ages, source: src, table: r.table, link: r.link, year: r.year,
    place: p ? p.place : 'national', among: r.among ?? null,
    basis: `Typical ${at === 'all ages' ? 'at all ages' : `at ${at}`}: ${money(likely * low)} to ${money(likely * high)}${r.unit === 'month' ? ' a month' : ''}. ${src}, ${r.year}, ${r.table}: ${by} ${money(likely)}${r.among ? ` among ${r.among}` : ''}${p ? `, scaled for ${p.place}` : ', national'}. The range is SLAM's ${low} to ${high} spread around it (no percentiles published)` };
}

// Which side of the range a value is far outside, or null. sides limits it (a debt notes only the high side).
export function farFrom(range, value, sides = ['above', 'below']) {
  if (!range || value == null || !Number.isFinite(Number(value)) || !(range.likely > 0)) return null;
  const v = Number(value);
  if (sides.includes('above') && v > range.high * (range.high / range.likely)) return 'above';
  if (sides.includes('below') && v < range.low * (range.low / range.likely)) return 'below';
  return null;
}

// A typed number against its typical range: { field, value, dir, range, text, tip } when far outside, else null.
// The words are calm and from the client's side: what most people like them have, never a verdict.
export function typicalCheck(data, field, value, opts = {}) {
  const T = TYPICAL[field];
  if (!T) return null;
  const range = typicalOf(data, field, opts);
  const dir = farFrom(range, value, T.sides);
  if (!dir) return null;
  return { field, value: Number(value), dir, range, text: `${dir === 'above' ? 'Above' : 'Below'} what most ${range.who} ${T.what}`, tip: range.basis };
}

// The checks for a household, one per field: each list is the boxes that make up the total ({ key, value }); the
// total is checked and the note goes under the biggest box (ties: the first). Blank boxes do not count.
export function typicalChecks(data, { age = null, place = null, boxes = {} } = {}) {
  const out = [];
  for (const field of Object.keys(TYPICAL)) {
    const list = (boxes[field] || []).filter(b => b.value != null && Number.isFinite(Number(b.value)));
    if (!list.length) continue;
    const total = list.reduce((s, b) => s + Number(b.value), 0);
    const c = typicalCheck(data, field, total, { age, place });
    if (c) out.push({ ...c, key: list.reduce((a, b) => (Number(b.value) > Number(a.value) ? b : a)).key, boxes: list.length });
  }
  return out;
}

// A share, not an amount (SHED): { share, band, who, source, table, link, year, text }, or null.
export function shareOf(data, field, age = null) {
  const r = rowFor(data, field, age);
  if (!r || r.share == null) return null;
  const what = { cover400: 'could cover a $400 emergency with cash', emergency3mo: 'have three months of expenses in emergency savings' }[field] ?? field;
  return { share: r.share, band: r.band, who: r.who, source: data.sources?.[r.source]?.name ?? r.source, table: r.table, link: r.link, year: r.year,
    text: `About ${Math.round(r.share * 100)}% of ${r.who} ${what}` };
}

// A short range for a faded placeholder ("4.9K to 12K"), the dollar sign being the box's own.
export function shortRange(range) {
  if (!range) return null;
  const k = v => { const n = Math.round(v); if (n < 1000) return String(n); const t = n / 1000; return `${t < 10 ? Math.round(t * 10) / 10 : Math.round(t)}K`; };
  return `${k(range.low)} to ${k(range.high)}`;
}

// The boxes each check adds up, read from the household's rows (the ones that apply): cash accounts, card balances,
// student loans and the gut spending number, each with the key its money box carries.
export function typicalBoxes(records = []) {
  const bal = r => ({ key: `${r.id}:balance`, value: r.values?.balance ?? null });
  return {
    cash: records.filter(r => r.kind === 'account' && r.values?.group === 'cash').map(bal),
    card: records.filter(r => r.kind === 'debt' && r.type === 'Credit card').map(bal),
    studentLoans: records.filter(r => r.kind === 'debt' && r.type === 'Student loan').map(bal),
    spending: records.filter(r => r.kind === 'spending' && r.type === 'All in').slice(0, 1).map(r => ({ key: 'gut', value: r.amount ?? null })),
  };
}
