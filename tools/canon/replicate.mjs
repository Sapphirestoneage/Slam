// SPDX-License-Identifier: AGPL-3.0-only
// The FIRE canon, replicated: the most quoted results re-run on SLAM's own math and SLAM's own history data, to say
// where each one holds, bends or breaks. Each claim is first reproduced the way its author worked it out (so we know
// we are testing the same thing), then run the way SLAM counts. Results are written up in docs/CANON.md.
// Usage: node tools/canon/replicate.mjs [out.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { yearsAtRate } from '../../js/math/simple.js';
import { replay } from '../../js/math/stress.js';
import { coastFi } from '../../js/math/fi.js';

const read = f => JSON.parse(readFileSync(new URL(`../../data/${f}`, import.meta.url)));
const ref = read('reference-2026.json'), hist = read('history-returns.json');
const out = {};

// 1. Mr. Money Mustache, "The Shockingly Simple Math Behind Early Retirement" (Jan 13 2012). 5% return after inflation,
//    4% withdrawal, starting from nothing. The post's table, as printed (under-3 and under-2 for 90% and 95%).
const MMM = { 5: 66, 10: 51, 15: 43, 20: 37, 25: 32, 30: 28, 35: 25, 40: 22, 45: 19, 50: 17, 55: 14.5, 60: 12.5, 65: 10.5, 70: 8.5, 75: 7, 80: 5.5, 85: 4 };
const once = (s, r, wr) => Math.log(1 + (1 - s) / wr * r / s) / Math.log(1 + r); // saving added once a year, at the year's end (how the table was made)
out.savingsRate = Object.entries(MMM).map(([pct, printed]) => { const s = pct / 100; return { rate: Number(pct), printed, yearly5: once(s, 0.05, 0.04), slam5: yearsAtRate(s, { realReturn: 0.05, withdrawalRate: 0.04 }), slam7: yearsAtRate(s, { realReturn: 0.07, withdrawalRate: 0.04 }), slam7at325: yearsAtRate(s, { realReturn: 0.07, withdrawalRate: 0.0325 }) }; });

// 2. The 4% rule. Bengen (1994) and the Trinity study (Cooley, Hubbard, Walz, 1998): 4% of the starting balance, raised
//    with prices each year, over 30 years. Replayed here on SLAM's history (Shiller, 1871 to 2022, real returns):
//    the year's spending comes out on the first day, the rest grows at the mix's real return, rebalanced once a year.
const lasts = (rate, years, stocks, from = -Infinity, to = Infinity) => {
  const mix = hist.years.map(y => ({ year: y.year, r: stocks * y.stocks + (1 - stocks) * y.bonds })); let ok = 0, n = 0, failed = [];
  for (let s = 0; s + years <= mix.length; s++) { if (mix[s].year < from || mix[s].year > to) continue; let b = 1; let good = true;
    for (let k = 0; k < years; k++) { b -= rate; if (b < 0) { good = false; break; } b *= 1 + mix[s + k].r; }
    n++; if (good) ok++; else failed.push(mix[s].year); }
  return { success: n ? ok / n : null, cycles: n, failed };
};
// the highest rate, to a twentieth of a point, that never failed
const safest = (years, stocks) => { let best = 0; for (let r = 0.02; r <= 0.07001; r += 0.0005) if (lasts(r, years, stocks).success === 1) best = r; return best; };
out.fourPercent = {
  trinityWindow: { note: 'starts 1926 to 1966, the 30-year periods the 1998 paper could see', mix75: lasts(0.04, 30, 0.75, 1926, 1966), mix50: lasts(0.04, 30, 0.5, 1926, 1966), stocks: lasts(0.04, 30, 1, 1926, 1966) },
  allHistory: Object.fromEntries([30, 40, 50, 60].map(y => [y, Object.fromEntries([0.03, 0.0325, 0.035, 0.04, 0.045, 0.05].map(r => [r, { mix75: lasts(r, y, 0.75).success, mix50: lasts(r, y, 0.5).success, cycles: lasts(r, y, 0.75).cycles }]))])),
  neverFailed: Object.fromEntries([30, 40, 50, 60].map(y => [y, { mix75: safest(y, 0.75), mix50: safest(y, 0.5) }])),
  failed30at4: lasts(0.04, 30, 0.75).failed,
};
// the same question asked of SLAM's own lifetime engine (no tax: money already taxed, age 60 on), to tie the two together
const x = { age: 60, planAge: 89, retireAge: 60, realReturn: 0.05, start: { taxable: 1000000, pretax: 0, roth: 0 }, work: { saving: { pretax: 0, roth: 0, taxable: 0 } }, spendingAfter: 40000, strategy: { id: 'fixed' }, tax: { filingStatus: 'Single', fill: 'none', health: 0, aca: false }, ss: { claimAge: 200, yearly: 0 } };
out.fourPercent.slamEngine = { mix75: replay(x, { ...ref, tax: { ...ref.tax, state: {} } }, hist, { stocks: 0.75 }).success, byHand: lasts(0.04, 30, 0.75).success, note: 'SLAM taxes the gains as the taxable account is sold, so it can run a little under the by-hand number' };

// 3. "$100 a month is $30,000": every $100 of monthly spending needs 25 times its year, at 4%.
out.hundred = [0.04, 0.035, 0.0325, 0.03].map(wr => ({ wr, needs: 1200 / wr }));

// 4. Mr. Money Mustache's rules of 752 and 173 ("When the Back of the Napkin can be Worth Millions", Jun 24 2013): ten
//    years of a weekly or monthly cost, invested at 7%.
const fv = (g, n) => (g ** n - 1) / (g - 1);
out.napkin = { weekly: { printed: 752, asMade: fv(1 + 0.07 / 52, 520), slamPace: fv(1.07 ** (1 / 52), 520) }, monthly: { printed: 173, asMade: fv(1 + 0.07 / 12, 120), slamPace: fv(1.07 ** (1 / 12), 120) } };

// 5. Coast FI: enough invested today that growth alone reaches the FI number by a chosen age.
out.coast = [0.05, 0.07].map(r => ({ r, share25: coastFi({ fiNumber: 1, realReturn: r, age: 40, retireAge: 65 }).value, share35: coastFi({ fiNumber: 1, realReturn: r, age: 30, retireAge: 65 }).value }));

if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
const p1 = v => (v == null ? 'never' : v.toFixed(1)), pc = v => `${Math.round(v * 100)}%`;
console.log('Savings rate: printed | once a year at 5% | SLAM month by month at 5% | SLAM at 7% | SLAM at 7% and 3.25%');
for (const r of out.savingsRate) console.log(`  ${String(r.rate).padStart(2)}%: ${String(r.printed).padStart(4)} | ${p1(r.yearly5).padStart(5)} | ${p1(r.slam5).padStart(5)} | ${p1(r.slam7).padStart(5)} | ${p1(r.slam7at325).padStart(5)}`);
const F = out.fourPercent;
console.log(`4% for 30 years, the Trinity window: 75/25 ${pc(F.trinityWindow.mix75.success)} of ${F.trinityWindow.mix75.cycles}, 50/50 ${pc(F.trinityWindow.mix50.success)}, all stocks ${pc(F.trinityWindow.stocks.success)}`);
for (const y of [30, 40, 50, 60]) console.log(`  ${y} years, 75/25, all of history (${F.allHistory[y][0.04].cycles} starts): ` + Object.entries(F.allHistory[y]).map(([r, v]) => `${(r * 100).toFixed(2)}% ${pc(v.mix75)}`).join('  ') + `  | never failed up to ${(F.neverFailed[y].mix75 * 100).toFixed(2)}% (50/50: ${(F.neverFailed[y].mix50 * 100).toFixed(2)}%)`);
console.log(`  4% for 30 years failed for starts: ${F.failed30at4.join(', ') || 'none'}. SLAM's engine on the same question: ${pc(F.slamEngine.mix75)} (by hand ${pc(F.slamEngine.byHand)})`);
console.log('$100 a month needs: ' + out.hundred.map(h => `${(h.wr * 100).toFixed(2)}% $${Math.round(h.needs).toLocaleString('en-US')}`).join('  '));
console.log(`752 and 173: as made ${out.napkin.weekly.asMade.toFixed(1)} and ${out.napkin.monthly.asMade.toFixed(1)}; at the plan's pace ${out.napkin.weekly.slamPace.toFixed(1)} and ${out.napkin.monthly.slamPace.toFixed(1)}`);
console.log('Coast FI share of the FI number: ' + out.coast.map(c => `at ${pc(c.r)}: ${pc(c.share25)} with 25 years to go, ${pc(c.share35)} with 35`).join('; '));
