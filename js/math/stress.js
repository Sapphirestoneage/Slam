// SPDX-License-Identifier: AGPL-3.0-only
// Stress tests for a whole-life plan (js/math/lifetime.js). Two kinds, both on the free years only (the working
// years grow at the plan's own return):
//   replay   every stretch of real history long enough to hold the free years, in order, as it happened
//            (data/history-returns.json: US stocks and bonds, after inflation, each year since 1871)
//   shuffle  the same real years drawn in random order, many times (a Monte Carlo that keeps each year's real stock
//            and bond pair together); seeded, so the same plan gives the same answer
// Pure: no DOM. The past is not a forecast, and the screen says so.
import { lifetime, worked } from './lifetime.js';

// Each real year as the engine reads it: r is the portfolio's return at this mix; the rest is what the market-aware ways
// and the ways of holding money read (js/math/withdraw.js): stocks, bonds, inflation, the CAPE and the two yields.
export const mixOf = (hist, stocks = 0.8) => hist.years.map(y => ({ year: y.year, r: stocks * y.stocks + (1 - stocks) * y.bonds, s: y.stocks, b: y.bonds, i: y.inflation, cape: y.cape ?? null, dy: y.yield ?? null, by: y.bondYield ?? null, stock: stocks }));
// What a way needs from each year to run on it: 'cape' or 'yield' (the first ten years of the record have no CAPE).
const has = (y, need) => (need === 'cape' ? y.cape != null : need === 'yield' ? y.dy != null && y.by != null : true);
const median = list => { const a = [...list].sort((p, q) => p - q); return a.length ? a[Math.floor((a.length - 1) / 2)] : null; };
const freeYears = x => x.planAge - x.retireAge + 1;
const runWith = (x, ref, seq) => { const lead = x.retireAge - x.age; return lifetime(x, ref, { returns: k => (k < lead ? x.realReturn : seq[k - lead] ?? x.realReturn) }); };

// Every start year history allows. { cycles: [{ start, ok, end, lowest, ranOutAge }], success (0 to 1), failed: [start
// years], worst: the cycle that ran out soonest (or ended lowest), medianEnd, from, to }.
export function replay(x, ref, hist, { stocks = 0.8 } = {}) {
  const mix = mixOf(hist, stocks), L = freeYears(x), cycles = [], need = x.strategy?.needs;
  for (let s = 0; s + L <= mix.length; s++) {
    const seq = mix.slice(s, s + L);
    if (need && !seq.every(y => has(y, need))) continue; // a way that reads the CAPE starts where the CAPE does
    const run = runWith(x, ref, seq);
    cycles.push({ start: mix[s].year, ok: worked(run, x), end: run.end, lowest: run.lowestSpend, ranOutAge: run.ranOutAge, lasted: run.ok, paid: run.lowestPaid, cuts: run.cutYears, first: run.firstSpend });
  }
  const bad = cycles.filter(c => !c.ok);
  const worst = cycles.length ? [...cycles].sort((a, b) => (a.ranOutAge ?? 999) - (b.ranOutAge ?? 999) || a.lowest - b.lowest || a.end - b.end)[0] : null;
  return { cycles, success: cycles.length ? 1 - bad.length / cycles.length : null, failed: bad.map(c => c.start), worst, medianEnd: median(cycles.map(c => c.end)), from: mix[0]?.year ?? null, to: mix.at(-1)?.year ?? null, stocks };
}

// A small seeded random number source (mulberry32), so a test and a screen agree.
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
export function shuffle(x, ref, hist, { stocks = 0.8, runs = 1000, seed = 7 } = {}) {
  const need = x.strategy?.needs, all = mixOf(hist, stocks), mix = need ? all.filter(y => has(y, need)) : all, L = freeYears(x), next = rng(seed), ends = [];
  let good = 0;
  for (let i = 0; i < runs; i++) {
    const run = runWith(x, ref, Array.from({ length: L }, () => mix[Math.floor(next() * mix.length)]));
    if (worked(run, x)) good++;
    ends.push(run.end);
  }
  const sorted = ends.sort((a, b) => a - b);
  return { runs, success: good / runs, medianEnd: sorted[Math.floor(runs / 2)], lowEnd: sorted[Math.floor(runs / 10)], stocks };
}

// The earliest age to stop work that history would have carried: the first age whose replay works in at least
// `target` of the start years. Searched upward from the plan's own earliest age. { age, replay } or { age: null }.
// One real start year, in full: the whole run, for the chart of spending year by year. Null when the record is too short.
export function replayYear(x, ref, hist, year, { stocks = 0.8 } = {}) {
  const mix = mixOf(hist, stocks), s = mix.findIndex(y => y.year === year), L = freeYears(x);
  return s < 0 || s + L > mix.length ? null : runWith(x, ref, mix.slice(s, s + L));
}
export function safeFreedom(x, ref, hist, { stocks = 0.8, target = 0.95, from = x.age, until = 80 } = {}) {
  for (let a = Math.max(x.age, from); a <= until; a++) {
    const r = replay({ ...x, retireAge: a }, ref, hist, { stocks });
    if (r.success !== null && r.success >= target) return { age: a, replay: r };
  }
  return { age: null, replay: null };
}
