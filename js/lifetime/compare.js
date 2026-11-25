// SPDX-License-Identifier: AGPL-3.0-only
// Compare the ways: the same lifetime plan (the person's money, spending, stop age, Social Security and taxes) run
// through every way of taking money out in js/math/withdraw.js. Nothing is worked out here that the engines do not
// already work out: each row is js/math/lifetime.js on a smooth market (year-one spending), js/math/stress.js on every
// real start year and on 1,000 shuffled markets, summed up by wayHistory. Pure: no DOM, no storage.
import { WAYS, WAY_FAMILIES, wayOff, wayRow, wayCustom, wayMath } from '../math/withdraw.js';
import { lifetime, needAt, worked } from '../math/lifetime.js';
import { replay, shuffle, replayYear } from '../math/stress.js';

export const WORST_YEAR = 1966; // the start year the chart follows: the long inflation after 1966, the hardest stretch in the record for steady spending
const lastCape = hist => [...hist.years].reverse().find(y => y.cape != null) ?? null;

// The plan with one way set. A way with its own horizon is counted for that many years from the stop age.
export function planFor(life, way, hist, retireAge = life.x.retireAge) {
  const x = life.x, cape = lastCape(hist);
  return { ...x, retireAge, strategy: way, stocks: life.settings?.stocks ?? 0.8, cape: cape?.cape ?? null, planAge: way.horizon ? retireAge + way.horizon - 1 : x.planAge };
}
const ctxOf = (life, hist) => ({ where: 'web', stopAge: life.x.retireAge, hasCape: hist.years.some(y => y.cape != null), hasYield: hist.years.some(y => y.yield != null) });

// The earliest age work can stop on this way: the first age where a smooth market works, year one pays at least what
// life costs then, and at least `target` of the real start years work. Null when no age to `until` does.
export function stopAgeFor(life, ref, hist, way, { until = 80 } = {}) {
  const target = life.settings?.target ?? 0.95, stocks = life.settings?.stocks ?? 0.8;
  for (let a = life.x.age; a <= until; a++) {
    const x = planFor(life, way, hist, a);
    if (way.rule === 'rmd' && a < (way.fromAge ?? 73)) continue;
    const run = lifetime(x, ref);
    if (!worked(run, x) || run.firstSpend < needAt(a, x) * 0.999) continue;
    const r = replay(x, ref, hist, { stocks });
    if (r.success !== null && r.success >= target) return a;
  }
  return null;
}

// One row of the table. stopAge: false leaves the (slow) search for the stop age out; runs: how many shuffled markets.
export function compareRow(life, ref, hist, way, { stopAge = true, runs = 1000 } = {}) {
  const off = wayOff(way, ctxOf(life, hist));
  if (off) return wayRow(way, { off });
  const x = planFor(life, way, hist), stocks = life.settings?.stocks ?? 0.8;
  const smooth = lifetime(x, ref), R = replay(x, ref, hist, { stocks }), S = shuffle(x, ref, hist, { stocks, runs });
  return wayRow(way, { first: smooth.firstSpend, need: needAt(x.retireAge, x), atStop: smooth.atRetire, stopAt: x.retireAge, target: life.settings?.target ?? 0.95,
    cycles: R.cycles.map(c => ({ start: c.start, lasted: c.lasted, ranOutAge: c.ranOutAge, end: c.end, lowest: c.paid, cuts: c.cuts })),
    randomOk: Math.round(S.success * S.runs), randomRuns: S.runs, years: x.planAge - x.retireAge + 1, stopAge: stopAge ? stopAgeFor(life, ref, hist, way) : undefined });
}
// The ways of the table: every way of js/math/withdraw.js, with the custom one built from the person's picks.
export const waysFor = custom => WAYS.map(w => (w.custom ? wayCustom(custom) : w));
// The default row of each family (what the table shows before "Show variants" is opened).
export const defaultWays = custom => WAY_FAMILIES.map(f => waysFor(custom).find(w => w.family === f.id));

// The chart: spending each year from one real start year, for the pinned rows. { year, lines: [{ id, name, pts: [[age, spend]] }] }.
// The year is 1966 when the record holds the whole stretch for this plan, else the hardest start year of the first row.
export function worstChart(life, ref, hist, ways, fallbackYear = null) {
  const stocks = life.settings?.stocks ?? 0.8, live = ways.filter(w => !wayOff(w, ctxOf(life, hist)));
  const runOf = (w, year) => replayYear(planFor(life, w, hist), ref, hist, year, { stocks });
  let year = WORST_YEAR;
  if (!live.length) return { year, lines: [] };
  if (live.some(w => !runOf(w, year))) year = fallbackYear ?? year; // the record ends before this plan does: use the hardest start year instead
  const lines = live.map(w => { const run = runOf(w, year); return run ? { id: w.id, name: w.name, pts: run.years.filter(y => y.phase === 'free').map(y => [y.age, y.spend]) } : null; }).filter(Boolean);
  return { year, lines };
}

// THE SPREADSHEET FILE: every row as one line of a CSV (Excel and Google Sheets open it), each number in its own
// column, and the math of the row in words in the last one. The lifetime plan itself is not in the household workbook
// (M9U is app-only), so the comparison is exported as its own file. rows: compareRow results. Amounts are whole dollars.
export function compareCsv(rows, source) {
  const cell = v => { const s = v == null ? '' : String(v); return s.includes('"') || s.includes(',') || s.includes('\n') ? `"${s.split('"').join('""')}"` : s; };
  const head = ['Family', 'Way', 'Switched off because', 'Year one, a month', 'Year one, a year', 'Random markets that work', 'Random markets run', 'Real start years that work', 'Real start years in all',
    'Hardest start year', 'Money short at age (hardest start)', 'Lowest share of the aim paid (hardest start)', 'Lowest share of the aim paid (any start where the money lasted)', 'Years with a cut (hardest start)', 'Years counted',
    'Left at the end (the middle start year)', 'Work can stop at age', 'When the money comes out', 'How it is worked out'];
  const whole = v => (v == null ? '' : Math.round(v)), share = v => (v == null ? '' : Math.round(v * 10000) / 10000);
  const lines = rows.map(r => (r.off ? [r.familyName, r.name, r.off] : [r.familyName, r.name, '', whole(r.first / 12), whole(r.first), r.randomOk, r.randomRuns, r.ok, r.n, r.worstYear, r.worstRanOut ?? '', share(r.drop), share(r.deepest), r.cuts, r.years,
    whole(r.end), r.stopAge ?? '', r.timing, wayMath(r, v => `$${Math.round(v).toLocaleString('en-US')}`, source).join(' ')]));
  return [head, ...lines].map(l => l.map(cell).join(',')).join('\n') + '\n';
}
