// SPDX-License-Identifier: AGPL-3.0-only
// Batch 31 (Phase 4, Track 1 groundwork): "typical at your age" from data/priors-2026.json, which holds only the rows
// docs/engines/priors-sources.md marks Primary. For an age band (and a place, where a primary row gives one) the
// typical range of a field; a check on a typed number far outside it, in calm words; and the shares (SHED) that are
// a chance, not an amount. Every function takes the priors data as an argument: the math never loads a file.
// A row that gives its 25th and 75th percentiles (p25, p75) is its own range; every other range is SLAM's stated
// spread (RULES typicalLow, typicalHigh) around the source's figure: the median where it gives one (SCF, ACS), else
// the mean (CE). "Far outside" is one more spread beyond an edge: above high x high / likely, or below low x low /
// likely (2.25 and 0.36 of likely at 0.6 and 1.5).
// Batch 39 (the data pass): a row can be for one household type (household: 'Solo', the CE one-person row) or one
// place (place: 'NY', ACS rent for New York State); the closest row wins (place, then household, then age band).
// Spending scales by a place row (BEA price parities: the NY metro for NY clients, QUESTIONS 210; batch 60, QUESTIONS 432:
// the metro for the NYC area, New York State for the rest of the state). Rent is new: the
// ACS median gross rent, a renter's share when the rent is split with roommates.
// Batch 46 (Phase 4, Track 1, the age-only start; QUESTIONS 336): one rule for every all-ages row read at an age, the
// age band's ratio to all ages. The CE one-person row (all ages, average age 56) is scaled by the band's CE figure over
// the all-ages figure (per category where both tables have it, else the totals), so a 25 year old living alone is not
// read as a 56 year old living alone. Income, cash and retirement have no Primary age row, so data.shapes says which
// age split shapes them (income and cash like CE spending, retirement like SCF net worth). priorFill turns a range into
// all households' 25th, middle and 75th when only a share has any (those with none count as $0).
import { fmt } from './result.js';
import { RULES } from '../registry/assumptions.js';
import { splitWaysOf } from './spending.js';

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
  rent: { what: 'pay in rent a month', short: 'rent a month', sides: ['above'], perMonth: true },
};
// CE categories as a month (spending.<key>): the shape for a later Budget check, no note yet.
export const CE_CATEGORIES = ['total', 'food', 'foodAtHome', 'foodAway', 'housing', 'shelter', 'utilities', 'transportation', 'vehiclePurchases', 'healthCare', 'entertainment', 'apparel', 'personalInsurance', 'cashContributions'];
// No Primary row yet: these say why instead of a range (empty is not zero).
// Batch 46: income now reads the all-households median shaped by age (data.shapes), so nothing is left here.
export const NO_ROW = {};

// Batch 60 (QUESTIONS 432): a place can be a list, closest first. A client in the NYC area reads the New York metro's
// rows ('NY metro': the price parity, and the metro rent once it is in the data), then the state's where the metro has
// none; anyone else in New York reads New York State's.
const placesOf = place => (place == null ? [] : Array.isArray(place) ? place : [place]);
export const NYC_AREA = {
  NY: ['the five boroughs', 'Nassau', 'Suffolk', 'Westchester', 'Rockland', 'Orange', 'Putnam'],
  NJ: ['Bergen', 'Hudson', 'Essex', 'Passaic', 'Union', 'Middlesex', 'Monmouth', 'Morris', 'Somerset', 'Sussex', 'Hunterdon', 'Ocean'],
};
// In the NYC area: the answer, else on when Live in NYC is on (QUESTIONS 432). Only asked in New York and New Jersey.
export const inNycArea = (p = {}) => (p?.state === 'NY' || p?.state === 'NJ') && (p.nycArea ?? (p.state === 'NY' && p.nyc === true));
const inBand = (ages, age) => !ages || (age != null && (ages[0] == null || age >= ages[0]) && (ages[1] == null || age <= ages[1]));
// The row for a field: of the rows that fit (their place, household and age band each match or are not set), the
// closest one: its own place counts most, then its household type, then the age band. So a person living alone reads
// the CE one-person row (all ages) before the age band's row of every household size, a NY renter reads New York's
// rent, and anyone else the national all-ages row (which says so). Null when nothing fits.
export function rowFor(data, field, age = null, { place = null, household = null } = {}) {
  let best = null, top = -1;
  const places = placesOf(place);
  for (const r of data?.rows || []) {
    if (r.field !== field) continue;
    if (r.place != null && !places.includes(r.place)) continue;
    if (r.household != null && r.household !== household) continue;
    if (r.ages && !inBand(r.ages, age)) continue;
    const score = (r.place != null ? 4 * (places.length - places.indexOf(r.place)) : 0) + (r.household != null ? 2 : 0) + (r.ages ? 1 : 0); // the closer place first
    if (score > top) { best = r; top = score; }
  }
  return best;
}
// A place scale where a primary row gives one: for a field or its parts (spending covers spending.food).
export const placeOf = (data, field, place) => placesOf(place).map(pl => (data?.place || []).find(p => p.place === pl && (p.field === field || field.startsWith(`${p.field}.`) || p.field === '*'))).find(Boolean) ?? null;

// The household facts the rows are picked by, from About you: the state (the NYC area reads the NY metro where a row
// has it, then its own state; batch 60),
// Solo or Couple, and for rent how many ways it is split when the amount given is the person's own share.
export function priorsOpts(profile = {}) {
  const p = profile || {};
  const share = p.shared?.rent !== false && (p.sharedAs?.rent ?? 'Your share') === 'Your share';
  const ways = p.roommates != null || p.splitWays != null ? splitWaysOf(p) : 1;
  return { place: inNycArea(p) ? ['NY metro', p.state] : p.state ?? null, household: p.household === 'Solo' || p.household === 'Couple' ? p.household : null, split: share && ways > 1 ? ways : 1, housing: p.housing ?? null };
}

const center = r => r.median ?? r.mean ?? null;
const plain = r => r.household == null && r.place == null;
// The age band's ratio to all ages for a CE field (QUESTIONS 336): the band's figure over the all-ages figure, both
// rows of every household size; a category with no all-ages row uses the totals. Null with no age or no row.
export function ageRatioOf(data, field, age) {
  if (age == null) return null;
  const rows = data?.rows || [];
  const pick = f => ({ band: rows.find(r => r.field === f && plain(r) && r.ages && inBand(r.ages, age)), all: rows.find(r => r.field === f && plain(r) && !r.ages) });
  let p = pick(field), via = field;
  if (!(p.band && p.all) && field !== 'spending.total') { p = pick('spending.total'); via = 'spending.total'; }
  if (!(p.band && p.all)) return null;
  const b = center(p.band), a = center(p.all);
  return b > 0 && a > 0 ? { factor: b / a, field: via, band: p.band.band, bandValue: b, allValue: a, allYear: p.all.period ?? p.all.year } : null;
}
// A row read at an age: the one-person row times its age ratio (QUESTIONS 336); any other row as it is.
const atAge = (data, r, field, age) => {
  const q = r && r.household === 'Solo' && !r.ages && r.unit === 'year' ? ageRatioOf(data, field, age) : null;
  return q ? { ...r, mean: r.mean * q.factor, mean0: r.mean, band: q.band, ages: true, ratio: q } : r;
};
// Spending all in, a month: CE total expenditures less personal insurance and pensions (payroll taxes and retirement
// contributions, which come out before take-home), over 12. Both rows from the same band, or nothing.
function spendingRow(data, age, pick) {
  const t0 = rowFor(data, 'spending.total', age, pick), p0 = rowFor(data, 'spending.personalInsurance', age, pick);
  if (!t0 || !p0 || t0.band !== p0.band || t0.household !== p0.household) return null;
  const t = atAge(data, t0, 'spending.total', age), p = atAge(data, p0, 'spending.personalInsurance', age);
  return { ...t, field: 'spending', mean: (t.mean - p.mean) / 12, mean0: (t0.mean - p0.mean) / 12, unit: 'month', table: `${t.table} less ${p.table.replace(/, annual.*$/, '')}, over 12` };
}
// What shapes an all-ages row by age (data.shapes): its factor (the age's, and living alone's, figure over the
// all-ages figure), or null when there is nothing to shape by.
export function shapeOf(data, field, { age = null, household = null } = {}) {
  const S = (data?.shapes || []).find(x => x.field === field);
  if (!S || (age == null && household == null)) return null;
  const all = (data.rows || []).find(r => r.field === S.by && plain(r) && !r.ages);
  const row = atAge(data, rowFor(data, S.by, age, { household }), S.by, age);
  const v = row ? center(row) : null, a = all ? center(all) : null;
  if (!(v > 0 && a > 0) || row === all) return null;
  return { factor: v / a, by: S.by, band: row.ages ? row.band : null, household: row.household ?? null, value: v, allValue: a, placeBy: S.placeBy ?? null, note: S.note };
}

// The typical range: { field, low, likely, high, by: 'median' | 'mean', band, who, allAges, household, percentiles,
// split, source, table, link, year, place, area, basis }, or null when no Primary row covers it (NO_ROW says why).
// household picks a household-type row where one exists (Solo: the CE one-person row); split divides a rent by the
// people it is split among (the client gives their own share).
export function typicalOf(data, field, { age = null, place = null, household = null, split = 1, low = RULES.typicalLow, high = RULES.typicalHigh } = {}) {
  if (NO_ROW[field]) return null;
  const pick = { place, household };
  const r = field === 'spending' ? spendingRow(data, age, pick) : field.startsWith('spending.') ? ((x) => (x ? { ...x, mean: x.mean / 12, mean0: x.mean0 != null ? x.mean0 / 12 : undefined, unit: 'month' } : null))(atAge(data, rowFor(data, field, age, pick), field, age)) : rowFor(data, field, age, pick);
  const c = r ? center(r) : null;
  if (c == null || r.unit === 'share') return null;
  const sh = !r.ages ? shapeOf(data, field, { age, household }) : null; // batch 46: an all-ages row shaped by age
  const p = r.place != null ? null : placeOf(data, sh?.placeBy ?? field, place);
  const ways = field === 'rent' && split > 1 ? split : 1;
  const f = (p?.factor ?? 1) * (sh?.factor ?? 1) / ways;
  const pct = r.median != null && r.p25 != null && r.p75 != null;
  const likely = c * f, lo = pct ? r.p25 * f : likely * low, hi = pct ? r.p75 * f : likely * high;
  const by = r.median != null ? 'median' : 'mean';
  const src = data.sources?.[r.source]?.name ?? r.source;
  const band = r.ratio?.band ?? sh?.band ?? r.band;
  const at = r.household === 'Solo' ? `living alone${r.ratio ? ` at ${band}` : ''}` : r.place != null ? `in ${r.area ?? r.place}` : r.ages ? `at ${r.band}` : sh?.band ? `at ${sh.band}${sh.household === 'Solo' ? ', living alone' : ''}` : sh?.household === 'Solo' ? 'living alone' : 'at all ages';
  const where = r.place != null ? '' : p ? `, scaled for ${p.area ?? p.place} (${p.table})` : ', national';
  const parts = ways > 1 ? `, split ${ways} ways (your share)` : '';
  const x2 = v => (Math.round(v * 100) / 100).toFixed(2);
  const scaled = r.ratio ? `, scaled to ${band} by ${band}'s ratio to all ages (${x2(r.ratio.factor)}: ${band}'s ${money(r.ratio.bandValue)} against all ages' ${money(r.ratio.allValue)} a year${r.ratio.field === 'spending.total' && !['spending', 'spending.total'].includes(field) ? ', the totals' : ''}, all ages ${r.ratio.allYear})` : '';
  const shaped = sh ? `, shaped${sh.band ? ` for ${sh.band}` : ''}${sh.household === 'Solo' ? ' living alone' : ''} like ${sh.by === 'netWorth' ? 'net worth' : 'spending'} (${x2(sh.factor)} of all ages)` : '';
  const spread = pct ? 'The range is the published 25th to 75th percentile' : `The range is SLAM's ${low} to ${high} spread around it (no percentiles published)`;
  return { field, low: lo, likely, high: hi, by, band, who: r.who, allAges: !r.ages && !sh?.band, household: r.household ?? sh?.household ?? null, percentiles: pct, split: ways, source: src, table: r.table, link: r.link, year: r.year,
    place: r.place ?? p?.place ?? 'national', area: r.area ?? p?.area ?? null, among: r.among ?? null, ratio: r.ratio ?? null, shape: sh,
    basis: `Typical ${at}: ${money(lo)} to ${money(hi)}${r.unit === 'month' ? ' a month' : ''}. ${src}${r.period ? '' : `, ${r.year}`}, ${r.table}: ${by} ${money(r.mean0 ?? c)}${r.among ? ` among ${r.among}` : ''}${scaled}${shaped}${where}${parts}${f !== 1 || r.ratio ? `: ${money(likely)}` : ''}. ${spread}` };
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
export function typicalChecks(data, { age = null, place = null, household = null, split = 1, boxes = {} } = {}) {
  const out = [];
  for (const field of Object.keys(TYPICAL)) {
    const list = (boxes[field] || []).filter(b => b.value != null && Number.isFinite(Number(b.value)));
    if (!list.length) continue;
    const total = list.reduce((s, b) => s + Number(b.value), 0);
    const c = typicalCheck(data, field, total, { age, place, household, split });
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
// student loans, the gut spending number and, for a renter, the rent line(s) they pay, each with the key its money box
// carries. housing is About you's Rent, Own, Family or Other (rent is checked unless they own or live with family).
export const isRentLine = r => r.kind === 'bill' && r.values?.category === 'Rent or mortgage' && !['Covered by someone', 'N/A', 'Not for me', 'Included in rent'].includes(r.values?.whoPays) && !r.values?.irregular && (r.per ?? 'month') === 'month';
export function typicalBoxes(records = [], { housing = null } = {}) {
  const bal = r => ({ key: `${r.id}:balance`, value: r.values?.balance ?? null });
  return {
    rent: housing === 'Own' || housing === 'Family' ? [] : records.filter(isRentLine).map(r => ({ key: `${r.id}:amount`, value: r.amount ?? null })),
    cash: records.filter(r => r.kind === 'account' && r.values?.group === 'cash').map(bal),
    card: records.filter(r => r.kind === 'debt' && r.type === 'Credit card').map(bal),
    studentLoans: records.filter(r => r.kind === 'debt' && r.type === 'Student loan').map(bal),
    spending: records.filter(r => r.kind === 'spending' && r.type === 'All in').slice(0, 1).map(r => ({ key: 'gut', value: r.amount ?? null })),
  };
}
