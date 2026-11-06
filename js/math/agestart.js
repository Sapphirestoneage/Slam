// SPDX-License-Identifier: AGPL-3.0-only
// M9A (Batch 46, Phase 4 Track 1: the age-only start; docs/engines/priors.md, "Purpose" and "How a range narrows").
// From an age alone (plus the place and Solo or Couple when About you has them) every blank core input is filled by its
// prior, typical for that age (js/math/priors.js, M9E), and the one ranges method (js/math/ranges.js, M9R) gives the
// FI date, the debt-free date, emergency fund months and the monthly surplus as a low, a likely and a high.
//
// A prior is never the client's number (priors.md): the filled records live only on a copy of the household for this
// run, are never saved, never count toward the Picture % or any check mark, and each one is its own knob at its
// Gut-level range (all households' 25th to 75th, those with none counted as $0, priorFill). As each real answer comes
// in it replaces its prior (a field with a typed value is never filled), and its own level's width takes over, so the
// ranges narrow. Pure: reads a household and the priors data, never the DOM, never saves.
import { ageOf } from './metrics.js';
import { rangesOf } from './ranges.js';
import { typicalOf, priorsOpts, ageRatioOf } from './priors.js';
import { gatesOf, visible } from '../gates.js';
import { isCategoryRecord } from './spending.js';
import { statusOf } from '../records.js';
import { LEVELS } from '../registry/program.js';
import { RULES } from '../registry/assumptions.js';
import { fmt } from './result.js';

const has = v => v !== null && v !== undefined && v !== '';
// The core inputs a plan needs, in Fast Track's order (the next question is the first one still typical).
export const CORE = [
  { key: 'income', label: 'Take-home pay', step: 'Take-home pay', field: 'income' },
  { key: 'spending', label: 'Spending a month', step: 'Spending, all in', field: 'spending' },
  { key: 'cash', label: 'Checking and savings', step: 'Cash and investments', field: 'cash' },
  { key: 'invested', label: 'Invested, all accounts', step: 'Cash and investments', field: 'retirement' },
  { key: 'card', label: 'Card balances', step: 'Debts', field: 'card' },
];
// The four outputs the age-only start shows (ROADMAP Phase 4, Track 1).
export const PLAN_OUTPUTS = { fi: 'FI date', debtFree: 'Debt free', efMonths: 'Emergency fund', surplus: 'Surplus' };
// The SCF shares that some households have none of (the rest count as $0 in all households' range).
const SHARE = { cash: 'cash', invested: 'retirement', card: 'card' };

// A typical range as all households' 25th, middle and 75th when only a share has any (an SCF "among holders" row):
// a household's place p among all of them is the holders' place 1 - (1 - p) / share; below 0 it has none ($0). The
// holders' own spread is SLAM's (low at their 25th, likely at their middle, high at their 75th, straight lines between
// and down to $0 at their very bottom). A share of 1 leaves the range as it is.
export function priorFill(range, share = 1) {
  if (!range) return null;
  const s = Math.min(1, Math.max(0, share ?? 1));
  if (s >= 1) return { low: range.low, likely: range.likely, high: range.high };
  const at = q => {
    if (q <= 0) return 0;
    if (q <= 0.25) return range.low * (q / 0.25);
    if (q <= 0.5) return range.low + (range.likely - range.low) * ((q - 0.25) / 0.25);
    if (q <= 0.75) return range.likely + (range.high - range.likely) * ((q - 0.5) / 0.25);
    return range.high;
  };
  const q = p => (s > 0 ? 1 - (1 - p) / s : 0);
  return { low: at(q(0.25)), likely: at(q(0.5)), high: at(q(0.75)) };
}

// Which core inputs the household has answered (a typed number, or a 'no' on About you's areas), from its live rows.
export function answeredOf(doc, ref) {
  const p = doc.profile || {};
  const live = visible(doc.records || [], gatesOf(p, doc.client), ref);
  const area = k => (p.noneOfThese ? false : p.areas?.[k] ?? null);
  const bal = pred => live.some(r => pred(r) && has(r.values?.balance));
  const lines = live.some(r => (r.kind === 'bill' || isCategoryRecord(r)) && has(r.amount) && statusOf(r, 'amount') !== 'Not for me');
  return {
    income: live.some(r => r.kind === 'income' && (has(r.amount) || has(r.values?.gross) || has(r.values?.hourly))),
    spending: live.some(r => r.kind === 'spending' && r.type === 'All in' && has(r.amount)) || lines,
    cash: area('cash') === false || bal(r => r.kind === 'account' && r.values?.group === 'cash'),
    invested: area('investments') === false || bal(r => r.kind === 'account' && r.values?.group === 'investment'),
    card: area('debt') === false || bal(r => r.kind === 'debt'),
  };
}

// The words the plan is labeled with: "Typical for 25 to 34 year olds in New York" (the band from the CE spending
// table, which shapes the most; the place where a Primary place row scales it, else the US).
export function planLabel(data, { age, place = null, household = null }) {
  const q = ageRatioOf(data, 'spending.total', age);
  const band = q?.band ?? null;
  const who = !band ? 'people' : /^under /.test(band) ? `people ${band}` : / and over$/.test(band) ? `people ${band}` : `${band} year olds`;
  const area = [].concat(place ?? []).map(pl => (data?.place || []).find(x => x.place === pl)).find(Boolean); // the closest place first (batch 60)
  const where = area ? ({ 'NY metro': 'the New York area', NY: 'New York', NJ: 'New Jersey' }[area.place] ?? area.area) : 'the US';
  return { band, where, text: `Typical for ${who}${household === 'Solo' ? ' living alone' : ''} in ${where}` };
}

// The prior for one core input: { key, label, low, likely, high, basis, share } in the record's own unit (a year of
// gross pay for income, a month for spending, a balance for the rest), or null when no row covers it.
export function priorOf(data, key, opts) {
  const C = CORE.find(c => c.key === key);
  const r = C ? typicalOf(data, C.field, opts) : null;
  if (!r) return null;
  const row = SHARE[key] ? (data.rows || []).find(x => x.field === SHARE[key] && x.share != null && x.unit !== 'share') : null;
  const f = priorFill(r, row?.share ?? 1);
  return { key, label: C.label, ...f, basis: r.basis, share: row?.share ?? 1, band: r.band, place: r.place };
}

// The household with every blank core input filled by its prior, and the knobs that move each prior from its low to
// its high (absolute values, not a share of the likely: a card that is $0 at likely is $2,800 at high).
export function filledOf(doc, ref, data, { now = new Date() } = {}) {
  const age = ageOf(doc.profile || {}, now);
  if (age == null || !data) return null;
  const o = priorsOpts(doc.profile);
  const opts = { age, place: o.place, household: o.household };
  const done = answeredOf(doc, ref);
  const P = Object.fromEntries(CORE.map(c => [c.key, priorOf(data, c.key, opts)]));
  const rec = (key, kind, type, fields) => ({ id: `prior:${key}`, kind, type, name: fields.name, prior: true, status: null, fieldStatus: {}, source: 'prior', amount: fields.amount ?? null, per: fields.per ?? 'month', linkedTo: null, values: fields.values ?? {} });
  const build = {
    income: v => rec('income', 'income', 'Job', { name: 'Pay (typical)', amount: v, per: 'year', values: { basis: 'Gross', payFrequency: '2 weeks', incomeType: 'W-2' } }),
    spending: v => rec('spending', 'spending', 'All in', { name: 'Spending (typical)', amount: v, values: { includesDebtPayments: false } }), // CE spending leaves out what pays a loan down
    cash: v => rec('cash', 'account', 'Checking', { name: 'Checking and savings (typical)', values: { group: 'cash', balance: v } }),
    invested: v => rec('invested', 'account', 'All investments', { name: 'Invested (typical)', values: { group: 'investment', balance: v } }),
    card: v => rec('card', 'debt', 'Credit card', { name: 'Cards (typical)', values: { balance: v } }),
  };
  const put = (d, kind, v) => {
    const r = build[kind](Math.max(0, v));
    const at = d.records.findIndex(x => x.id === r.id);
    return { ...d, records: at >= 0 ? d.records.map((x, i) => (i === at ? r : x)) : [...d.records, r] };
  };
  // Pay and spending are tied (people who earn more spend more). While both are typical they move together, each
  // from its low to its high (one knob), and the share of pay spent moves on its own, PriorSpendShare either way. Once
  // one is answered the other stays at its typical amount and moves PriorSpendShare either way: never wider than
  // before, so an answer always narrows the plan.
  const w = RULES.priorSpendShare, pct = v => `${Math.round(v * 100)}%`;
  const priors = [], knobs = [];
  let filled = { ...doc, records: [...(doc.records || [])] };
  const add = (p, kind = p.key) => { priors.push(p); filled = put(filled, kind, p.likely); };
  const knob = (id, label, kind, sides) => knobs.push({ id: `prior:${id}`, recId: `prior:${id === 'pay' ? 'income' : id === 'share' ? 'spending' : id}`, field: kind === 'balance' ? 'balance' : 'amount', kind, level: LEVELS.Missing, prior: true, label, route: null, apply: sides });
  const near = (p, kind) => { const q = { ...p, low: p.likely * (1 - w), high: p.likely * (1 + w), basis: `${p.basis}. Next to an answered ${kind === 'income' ? 'spending number' : 'take-home'}, it moves ${pct(w)} either way` }; add(q); knob(kind, p.label, kind, (d, side) => put(d, kind, q[side])); };
  if (!done.income && !done.spending && P.income && P.spending) {
    add(P.income); add(P.spending);
    knob('pay', 'Pay and spending', 'income', (d, side) => put(put(d, 'income', P.income[side]), 'spending', P.spending[side]));
    knob('share', 'Share of pay spent', 'spending', (d, side) => put(d, 'spending', P.spending.likely * (side === 'low' ? 1 - w : 1 + w)));
  } else {
    if (!done.income && P.income) near(P.income, 'income');
    if (!done.spending && P.spending) near(P.spending, 'spending');
  }
  for (const k of ['cash', 'invested', 'card']) {
    if (done[k] || !P[k]) continue;
    add(P[k]);
    if (P[k].low !== P[k].high) knob(k, P[k].label, 'balance', (d, side) => put(d, k, P[k][side]));
  }
  return { doc: filled, priors, knobs, opts, age, answered: done };
}

// The plan from an age: { label, band, where, age, priors, answered, next, ranges: { fi, debtFree, efMonths, surplus },
// words }, or null with no age. Each range is { low, likely, high, never } from M9R (months from now for the dates).
export function agePlanOf(doc, ref, data, { now = new Date() } = {}) {
  const F = filledOf(doc, ref, data, { now });
  if (!F) return null;
  const R = rangesOf(F.doc, ref, { now, extra: F.knobs, zeroDebt: F.priors.some(p => p.key === 'card'), openBase: true });
  const L = planLabel(data, F.opts);
  const ranges = {};
  for (const k of Object.keys(PLAN_OUTPUTS)) ranges[k] = R[k] ?? null;
  const next = CORE.find(c => !F.answered[c.key]) ?? null;
  const typical = F.priors.length;
  return { ...L, label: L.text, age: F.age, priors: F.priors, answered: Object.keys(F.answered).filter(k => F.answered[k]), typical, next: next ? { key: next.key, label: next.label, step: next.step } : null,
    ranges, words: Object.fromEntries(Object.keys(PLAN_OUTPUTS).map(k => [k, planWordsOf(k, ranges[k], { now })])), width: widthsOf(ranges) };
}

// The plan from the age alone (QUESTIONS 371: the certainty meter's 0%): the same household with nothing answered but
// its age, place and Solo or Couple, every key output's range (M9R), or null with no age.
export function ageOnlyRangesOf(doc, ref, data, { now = new Date() } = {}) {
  const p = doc.profile || {};
  const bare = { ...doc, records: [], profile: { birthYear: p.birthYear ?? null, birthMonth: p.birthMonth ?? null, age: p.age ?? null, state: p.state ?? null, household: p.household ?? null, mode: p.mode ?? null } };
  const F = filledOf(bare, ref, data, { now });
  if (!F) return null;
  return rangesOf(F.doc, ref, { now, extra: F.knobs, zeroDebt: F.priors.some(x => x.key === 'card'), openBase: true });
}

// How wide each range is, in its own unit (months, months of spending, dollars a month); Infinity when an end never
// comes. The test of "the ranges narrow" reads these.
export function widthsOf(ranges) {
  return Object.fromEntries(Object.keys(PLAN_OUTPUTS).map(k => { const r = ranges[k]; return [k, !r ? null : r.high == null || r.high === Infinity || r.likely === Infinity ? Infinity : r.high - r.low]; }));
}

// The short words for one range: "2049 to 2062", "Now to Jun 2027", "0.8 to 3.1 months", "$210 short to $1,450 a
// month". Wide dates read in years. Null with no range (an input no prior covers).
export function planWordsOf(key, r, { now = new Date() } = {}) {
  if (!r) return null;
  const date = n => new Date(now.getFullYear(), now.getMonth() + Math.round(n), 1);
  const mon = n => date(n).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const yr = n => String(date(n).getFullYear());
  const step = v => Math.max(10, 10 ** (Math.floor(Math.log10(Math.max(1, Math.abs(v)))) - 1));
  const $ = v => fmt.money(Math.round(v / step(v)) * step(v));
  if (key === 'fi' || key === 'debtFree') {
    const wide = r.high == null || r.high - r.low >= 36;
    const at = n => (n <= 0 ? 'Now' : wide ? yr(n) : mon(n));
    if (r.likely === Infinity || r.never) return r.low != null && r.low !== Infinity ? `${at(r.low)} or later` : `Past ${RULES.maxMonths / 12} years`;
    if (r.high == null) return `${at(r.low)} or later`;
    const lo = at(r.low), hi = at(r.high);
    return lo === hi ? lo : `${lo} to ${hi === 'Now' ? 'now' : hi}`;
  }
  if (key === 'efMonths') { const m = v => (Math.round(v * 10) / 10).toFixed(1); return m(r.low) === m(r.high) ? `${m(r.low)} months` : `${m(r.low)} to ${m(r.high)} months`; }
  const w = v => (v < 0 ? `${$(-v)} short` : $(v));
  return `${w(r.low)} to ${w(r.high)} a month`;
}
