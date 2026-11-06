// SPDX-License-Identifier: AGPL-3.0-only
// M9R (Phase 4, Track 1, docs/engines/ranges.md): a low, a likely and a high on the key outputs (the FI date, the
// debt-free date, emergency fund months, the monthly surplus, net worth and the FOO step), from each input's level.
// One method for every output, so two screens never disagree about how wide "about" is.
//
// The method (ranges.md, "corners first"): run the household once as it is (likely, the very number every screen
// already shows), then once with each uncertain input at its low and once at its high, the rest as entered. Each
// input's swing on an output is the gap between its two runs; the swings combine as the root of the sum of their
// squares (inputs treated as independent). A date that never arrives at an end reads "or later". The drivers are the
// inputs in order of the share of the width each causes.
//
// How far an input moves comes from its level (picture.js levelOf: Know it is Actual, Roughly is Rough, Not sure and
// the gut number are Gut, a statements total is Estimate) and its kind, by the widths in RULES (rangeBalance*,
// rangeSpend*, rangeIncome*, rangeVariable*, rangeApr*). A typical amount the client has not answered (a starter
// line still Not sure, a blank APR read as the typical rate) is a prior: TypicalLow to TypicalHigh, or AprGuessSwing.
// An input at Know it with no width (a paycheck, a bill, a rate) does not move, so an all Know it household's range
// is its balances' 2% only. Pure: reads a household, never the DOM, never saves.
import { metrics } from './metrics.js';
import { foo } from './foo.js';
import { levelOf } from './picture.js';
import { statusOf } from '../records.js';
import { gatesOf, visible } from '../gates.js';
import { isCategoryRecord } from './spending.js';
import { taxTypeOf } from './income.js';
import { materialityOf } from './time.js';
import { debtRoute } from '../nav.js';
import { LEVELS, levelWord } from '../registry/program.js';
import { RULES } from '../registry/assumptions.js';
import { fmt } from './result.js';

const isBlank = v => v === null || v === undefined || v === '';
const valueOf = (rec, field) => (field in rec && field !== 'values' ? rec[field] : rec.values?.[field]);
const withValue = (rec, field, v) => (field in rec && field !== 'values' ? { ...rec, [field]: v } : { ...rec, values: { ...rec.values, [field]: v } });
const STEADY = new Set(['W-2', 'Benefits']);
const levelName = level => levelWord(level) ?? 'Missing';

// The width an input of this kind moves at this level, either way: a share of the value (a dollar input) or points
// (an APR). The table is RULES so the sheet's Assumptions tab lists every cell.
export function widthOf(kind, level) {
  const L = levelName(level);
  const T = {
    balance: { Actual: RULES.rangeBalanceActual, Estimate: RULES.rangeBalanceEstimate, Rough: RULES.roughBalanceShare, Gut: RULES.rangeBalanceGut },
    spending: { Actual: 0, Estimate: RULES.rangeSpendEstimate, Rough: RULES.rangeSpendRough, Gut: RULES.rangeSpendGut },
    income: { Actual: 0, Estimate: RULES.rangeIncomeEstimate, Rough: RULES.rangeIncomeRough, Gut: RULES.rangeIncomeGut },
    variable: { Actual: RULES.rangeVariableActual, Estimate: RULES.rangeVariableEstimate, Rough: RULES.rangeVariableRough, Gut: RULES.rangeVariableGut },
    apr: { Actual: 0, Estimate: 0, Rough: RULES.rangeAprRough, Gut: RULES.aprGuessSwing },
  }[kind];
  return T?.[L] ?? 0;
}
// A prior (typical, not the client's own yet): the stated spread around it, TypicalLow to TypicalHigh.
const PRIOR = () => ({ low: RULES.typicalLow, high: RULES.typicalHigh });

// Every input that moves, as a knob: { id, label, kind, level, prior, recId, field, route, focus, apply(doc, side) }.
// side is 'low' or 'high' (the input's own low and high, not the output's). Spending is one knob: the gut number, or
// the lines together (they move together, ranges.md "Correlated inputs"), each line by its own level.
// force (batch 43, Ask me next and the certainty meter): (id, level, prior) => a level to read an input at instead of its
// own, or null to keep it. Ask me next reads one input at the level its answer reaches; the certainty meter reads every
// input as a guess (its stand-in for age-only). A typical amount read at a level of its own is the client's number then.
export function knobsOf(doc, ref, { force = null } = {}) {
  const live = visible(doc.records, gatesOf(doc.profile, doc.client), ref);
  const months = doc.spending?.months || {};
  const lv = (r, f) => levelOf(r, f, { months });
  const name = r => r.name || r.type || 'Item';
  const knobs = [];
  const swap = (d, recs) => { const by = new Map(recs.map(r => [r.id, r])); return { ...d, records: d.records.map(r => by.get(r.id) ?? r) }; };
  const at = (id, level, prior) => { const f = force?.(id, level, !!prior); return f == null ? { level, prior: !!prior } : { level: f, prior: false }; };
  const scaleKnob = (r, field, o) => {
    const v = valueOf(r, field);
    if (isBlank(v) || !Number(v)) return;
    const own = lv(r, field);
    if (own === null) return;
    const { level, prior } = at(`${r.id}:${field}`, own, o.prior);
    const w = prior ? PRIOR() : { low: 1 - widthOf(o.kind, level), high: 1 + widthOf(o.kind, level) };
    if (w.low === 1 && w.high === 1) return;
    knobs.push({ id: `${r.id}:${field}`, recId: r.id, field, ...o, level, prior, factor: w,
      apply: (d, side) => swap(d, [withValue(r, field, Number(v) * (side === 'low' ? w.low : w.high))]) });
  };
  // Income: each row on its own (two jobs, a couple's two incomes). A paycheck is steady; tips, gigs and a business vary.
  for (const r of live.filter(x => x.kind === 'income')) {
    const steady = STEADY.has(taxTypeOf(r) ?? 'W-2') && !(r.values?.tips > 0);
    scaleKnob(r, 'amount', { kind: steady ? 'income' : 'variable', label: /take-home|pay/i.test(name(r)) ? name(r) : `${name(r)} pay`, route: '#/cash-flow/income' });
  }
  // Spending: the gut number while it drives the math, else every line and category amount together.
  const allIns = live.filter(r => r.kind === 'spending' && r.type === 'All in' && !isBlank(r.amount));
  const lines = live.filter(r => (r.kind === 'bill' || isCategoryRecord(r)) && !isBlank(r.amount) && Number(r.amount) && statusOf(r, 'amount') !== 'Not for me');
  const useLines = !allIns.length || (doc.spending?.source ?? 'gut') === 'lines';
  if (!useLines) {
    const own = Math.min(...allIns.map(r => lv(r, 'amount') ?? LEVELS.Actual));
    const { level } = at('spending', own, false);
    const w = widthOf('spending', level);
    if (w > 0) knobs.push({ id: 'spending', recId: allIns[0].id, field: 'amount', kind: 'spending', gut: true, level, label: own >= LEVELS.Estimate ? 'Spending total from statements' : 'Gut spending number', route: '#/cash-flow/budget', focus: 'gut', factor: { low: 1 - w, high: 1 + w },
      apply: (d, side) => swap(d, allIns.map(r => ({ ...r, amount: r.amount * (side === 'low' ? 1 - w : 1 + w) }))) });
  } else if (lines.length) {
    const each = lines.map(r => { const { level, prior } = at('spending', lv(r, 'amount'), r.values?.preset === true && statusOf(r, 'amount') === 'Not sure'); const w = widthOf('spending', level);
      return { r, level, prior, low: prior ? PRIOR().low : 1 - w, high: prior ? PRIOR().high : 1 + w }; }).filter(e => e.low !== 1 || e.high !== 1);
    if (each.length) {
      const big = [...each].sort((a, b) => Math.abs(b.r.amount) * (b.high - b.low) - Math.abs(a.r.amount) * (a.high - a.low))[0];
      knobs.push({ id: 'spending', recId: big.r.id, field: 'amount', kind: 'spending', level: Math.min(...each.map(e => e.level ?? LEVELS.Actual)), prior: each.every(e => e.prior), label: each.length === 1 ? `${name(big.r)} line` : 'Spending lines', route: '#/cash-flow/budget', lines: each.length,
        apply: (d, side) => swap(d, each.map(e => ({ ...e.r, amount: e.r.amount * (side === 'low' ? e.low : e.high) }))) });
    }
  }
  // Balances and values: each account, each thing, each debt.
  for (const r of live.filter(x => x.kind === 'account')) scaleKnob(r, 'balance', { kind: 'balance', label: `${name(r)} balance`, route: '#/net-worth/assets' });
  for (const r of live.filter(x => x.kind === 'asset')) scaleKnob(r, 'value', { kind: 'balance', label: `${name(r)} value`, route: '#/net-worth/assets' });
  for (const r of live.filter(x => x.kind === 'debt')) {
    const short = name(r);
    scaleKnob(r, 'balance', { kind: 'balance', label: `${short} balance`, route: debtRoute(r) });
    if (statusOf(r, 'apr') === 'Not for me' || isBlank(valueOf(r, 'balance')) || !Number(valueOf(r, 'balance'))) continue;
    const apr = valueOf(r, 'apr'), typical = ref.typicalRates?.[r.type] ?? null;
    const blank = isBlank(apr);
    if (blank && typical == null) continue;
    const { level, prior: guessed } = at(`${r.id}:apr`, blank ? LEVELS.Missing : lv(r, 'apr'), blank);
    const w = guessed ? RULES.aprGuessSwing : widthOf('apr', level);
    if (!w) continue;
    const base = blank ? typical : Number(apr);
    knobs.push({ id: `${r.id}:apr`, recId: r.id, field: 'apr', kind: 'apr', level, prior: guessed, label: `${short} APR`, route: debtRoute(r), points: w,
      apply: (d, side) => swap(d, [withValue(r, 'apr', Math.max(0, base + (side === 'low' ? -w : w)))]) });
  }
  return knobs;
}

// The outputs every run reads. Dates are months from now; a date that never comes on its path is Infinity.
export const DATE = new Set(['fi', 'debtFree']);
export const OUTPUTS = { fi: 'FI date', debtFree: 'Debt-free date', efMonths: 'Emergency fund, months of spending held', surplus: 'Monthly surplus', netWorth: 'Net worth' };
export function readOut(m) {
  const fi = m.monthsToFi?.value ?? (m.monthsToFi?.never ? Infinity : null);
  const plan = m.debtPlan?.debts?.length ? m.debtPlan : null;
  return { fi, debtFree: plan ? plan.months ?? Infinity : null, efMonths: m.runwayMonths?.value ?? null, surplus: m.surplus?.value ?? null, netWorth: m.netWorth?.value ?? null };
}

// Root of the sum of the squares, one side at a time (ranges.md steps 3 to 6).
export function combine(base, runs, { date = false, floor = null } = {}) {
  if (base === null || base === undefined || base === Infinity) return null;
  const each = runs.map(r => {
    const vals = [r.low, r.high].map(v => (v === null || v === undefined ? base : v));
    return { ...r, lo: Math.min(base, ...vals), hi: Math.max(base, ...vals) };
  }).filter(r => r.lo !== base || r.hi !== base);
  const never = each.some(r => r.hi === Infinity);
  const down = Math.sqrt(each.reduce((s, r) => s + (base - r.lo) ** 2, 0));
  const up = never ? Infinity : Math.sqrt(each.reduce((s, r) => s + (r.hi - base) ** 2, 0));
  let low = base - down, high = base + up;
  if (floor !== null) low = Math.max(floor, low);
  if (date) { low = Math.round(low); high = high === Infinity ? null : Math.round(high); }
  const sq = r => (r.hi === Infinity ? Infinity : (r.hi - r.lo) ** 2);
  const finite = each.filter(r => sq(r) !== Infinity).reduce((s, r) => s + sq(r), 0);
  const drivers = each.map(r => ({ id: r.id, label: r.label, recId: r.recId, field: r.field, route: r.route, focus: r.focus, level: r.level, prior: !!r.prior, known: !!r.known,
    low: r.low === Infinity ? null : r.low, high: r.high === Infinity ? null : r.high, share: sq(r) === Infinity ? 1 : never ? 0 : finite ? sq(r) / finite : 0 }))
    .sort((a, b) => b.share - a.share || Math.abs((b.high ?? Infinity) - (b.low ?? 0)) - Math.abs((a.high ?? Infinity) - (a.low ?? 0)));
  return { low, likely: base, high, never, width: high === null || high === Infinity ? Infinity : high - low, drivers };
}

// Every key output's range for a household. m: the metrics every screen already shows (so likely is that number, to
// the dollar and the month); person: whose plan (a couple with no combined totals walks one person's).
export function rangesOf(doc, ref, { now = new Date(), person = null, m = null } = {}) {
  const base = m ?? metrics(doc, ref, { now, person });
  const knobs = knobsOf(doc, ref);
  const b = readOut(base);
  const runs = runsOf(doc, ref, knobs, { now, person });
  const out = {};
  const spend = base.inputs?.spending ?? null;
  const material = materialityOf(base.hourly, doc.assumptions).value;
  const known = k => !k.prior && k.level >= LEVELS.Actual;
  for (const key of Object.keys(OUTPUTS)) {
    const swings = runs.map(({ k, low, high }) => ({ id: k.id, label: k.label, recId: k.recId, field: k.field, route: k.route, focus: k.focus, level: k.level, prior: k.prior, known: known(k), low: low[key], high: high[key] }));
    const o = { date: DATE.has(key), floor: DATE.has(key) || key === 'efMonths' ? 0 : null };
    const r = combine(b[key], swings, o);
    if (r) {
      // Shown only when what is not known yet moves it a material amount: numbers typed at Know it still widen the
      // range a little (a balance moves), but never put a line on screen by themselves (ranges.md: no range on a
      // number the client typed at Know it).
      const open = combine(b[key], swings.filter(x => !x.known), o);
      r.material = !!open && materialOf(key, open, { material, spending: spend });
    }
    out[key] = r;
  }
  // runs: each knob's two runs, read (batch 43: Ask me next swaps one input's runs for its answered ones).
  return { ...out, knobs: knobs.map(({ apply, ...k }) => k), runs: runs.map(({ k, low, high }) => ({ id: k.id, low, high })), material, now };
}
// Each knob run at its low and at its high, the outputs read off each run.
export function runsOf(doc, ref, knobs, { now = new Date(), person = null } = {}) {
  return knobs.map(k => ({ k, low: readOut(metrics(k.apply(doc, 'low'), ref, { now, person })), high: readOut(metrics(k.apply(doc, 'high'), ref, { now, person })) }));
}
// One output's range from a set of runs ({ id, low, high } with each side's outputs read): the same combine rangesOf uses.
export function rangeFromRuns(key, likely, runs) {
  return combine(likely, runs.map(r => ({ id: r.id, low: r.low[key], high: r.high[key] })), { date: DATE.has(key), floor: DATE.has(key) || key === 'efMonths' ? 0 : null });
}

// The FOO step as a range (ranges.md "step 3, maybe 4"): the step at likely, and the lowest and highest step any one
// input reaches at its low or high. A step is a place on a list, so the ends are the runs' own steps (no squares).
// Kept apart from rangesOf because each run walks the whole FOO.
export function fooRangeOf(doc, ref, { now = new Date(), person = undefined, flags = [], knobs = null } = {}) {
  const opts = person === undefined ? { now, flags } : { now, flags, person };
  const F = foo(doc, ref, opts);
  if (!F?.here) return null;
  const order = F.steps.map(s => s.id), at = id => order.indexOf(id);
  const ks = (knobs ?? knobsOf(doc, ref)).filter(k => k.prior || k.level < LEVELS.Actual); // a number at Know it does not move a step
  let lo = F.here, hi = F.here;
  const moved = [];
  for (const k of ks) {
    const knobRec = { ...k };
    for (const side of ['low', 'high']) {
      const here = foo(k.apply(doc, side), ref, opts)?.here ?? null;
      if (!here || here === F.here) continue;
      if (at(here) < at(lo)) lo = here;
      if (at(here) > at(hi)) hi = here;
      if (!moved.some(x => x.id === k.id)) moved.push({ id: k.id, label: knobRec.label, recId: k.recId, field: k.field, route: k.route, focus: k.focus, level: k.level, prior: !!k.prior, step: here });
    }
  }
  return { likely: F.here, low: lo, high: hi, moves: lo !== hi, drivers: moved, name: F.steps.find(s => s.id === F.here)?.name ?? null };
}

// Is a range wide enough to say? A dollar range when its width beats the client's materiality (a surplus counts a
// year of it); a date range when it spans at least RULES.rangeMinMonths (emergency fund months: rangeMinEfMonths) and
// those months, valued at a month of spending, beat the materiality too (what a month of work buys).
export function materialOf(key, r, { material, spending = null }) {
  if (!r || r.width === 0) return false;
  if (r.width === Infinity) return true;
  if (key === 'surplus') return r.width * 12 >= material;
  if (key === 'netWorth') return r.width >= material;
  const months = r.width;
  if (DATE.has(key) && months < RULES.rangeMinMonths) return false;
  if (key === 'efMonths' && months < RULES.rangeMinEfMonths) return false;
  return spending == null || months * Math.max(0, spending) >= material;
}

// The quiet line under a key number: "Could be Aug 2039 to Jan 2044" (Nov 6: the big number above already says the likely one). null when there is nothing to
// say (the range is under a material amount, or both ends read the same as likely). Months are counted from now.
export function rangeWordsOf(key, r, { now = new Date() } = {}) {
  if (!r || !r.material) return null;
  const at = n => new Date(now.getFullYear(), now.getMonth() + n, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  // The ends round to a step that fits the width ($86,000 wide reads in thousands), the likely value never rounds.
  const step = r.width === Infinity ? 1 : Math.max(10, 10 ** (Math.floor(Math.log10(Math.max(1, r.width))) - 1));
  const $ = (v, exact = false) => fmt.money(exact ? Math.round(v) : Math.round(v / step) * step);
  const mo = v => (Math.round(v * 10) / 10).toFixed(1);
  let likely, low, high, line;
  if (DATE.has(key)) {
    likely = at(r.likely); low = at(r.low); high = r.high == null ? null : at(r.high);
    if (low === likely && high === likely) return null;
    line = high == null ? `Could be ${low} or later` : `Could be ${low} to ${high}`;
  } else if (key === 'efMonths') {
    likely = mo(r.likely); low = mo(r.low); high = mo(r.high);
    if (low === likely && high === likely) return null;
    line = `Could be ${low} to ${high} months`;
  } else if (key === 'surplus') {
    const w = (v, exact) => (v < 0 ? `${$(-v, exact)} short` : $(v, exact));
    likely = w(r.likely, true); low = w(r.low); high = w(r.high);
    if (low === likely && high === likely) return null;
    line = r.likely >= 0 && r.low < 0 ? `Could be anywhere from nothing to ${high} a month` : `Could be ${low} to ${high} a month`;
  } else {
    likely = $(r.likely, true); low = $(r.low); high = $(r.high);
    if (low === high) return null;
    line = `Could be ${low} to ${high}`;
  }
  // The tap names what can still be pinned down: a number already at Know it is left off the list.
  return { key, likely, low, high, line, drivers: r.drivers.filter(d => d.share > 0 && !d.known).slice(0, 2).map(d => ({ ...d, words: driverWords(d) })) };
}
// What an input is, in a few words, for the tap: "the card APR (a guess)".
export function driverWords(d) {
  const how = d.prior ? 'typical, not yours yet' : { Missing: 'a guess', Gut: 'a guess', Rough: 'rough', Estimate: 'not itemized', Actual: 'as typed' }[levelName(d.level)];
  return `${d.label.replace(/^[a-z]/, c => c.toUpperCase())} (${how})`;
}
// The FOO step's line, when one input could move it: "Likely step 3, maybe step 4".
export function fooWordsOf(r) {
  if (!r?.moves) return null;
  const other = [r.low, r.high].filter(s => s !== r.likely);
  return { line: `Likely step ${r.likely}, maybe step ${other.join(' or ')}`, drivers: r.drivers.slice(0, 2).map(d => ({ ...d, words: driverWords(d) })) };
}
