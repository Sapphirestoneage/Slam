// SPDX-License-Identifier: AGPL-3.0-only
// The money sins read in the web app: what the household file honestly holds, in the plain shape js/math/sins.js
// reads (`data` of snRead). Pure: no DOM. It works nothing out; it only reads and maps.
// What the file holds and what it does not (QUESTIONS.md, "RUN Money sins, Part 1"):
//   buys and paydays   imported transactions (spending.transactions): the date, the amount (money out is negative),
//                      the Budget line (lineId) and, for a paycheck, the income (incomeId). The day only, no hour.
//   the plan           each Budget line's monthly amount (M20), added up by category.
//   statements         the last importedAt of a transaction.
//   NOT held here      the app left closed, numbers left at Guess for the read, Recalculating cards opened or
//                      ignored, the Safe to spend card, fire drills put off. None of them is guessed.
import { lineMonthly, categoryKeyOf } from '../math/spending.js';

// The Budget categories onto the five categories of the read. Debt, Retirement, Taxes and Health and self-care are not
// buys with a pull, so they are left out.
export const SN_WEB_CAT = { Food: 'food', Accommodation: 'home', Transportation: 'transport', Bills: 'bills', Other: 'fun' };
const day = v => (v ? String(v).slice(0, 10) : null);

export function sinsDataOf(doc) {
  const lines = (doc?.records || []).filter(r => r.kind === 'bill');
  // a buy on a line keeps the line's category; a line outside the five (a debt payment, retirement, taxes) is no buy
  const catOf = id => { const l = id ? lines.find(x => x.id === id) : null; return !l ? null : SN_WEB_CAT[categoryKeyOf(l)] ?? 'none'; };
  const tx = (doc?.spending?.transactions || []).filter(t => t && day(t.date) && typeof t.amount === 'number');
  const buys = tx.filter(t => t.amount < 0 && !t.incomeId).map(t => ({ d: day(t.date), amt: Math.round(-t.amount * 100) / 100, cat: catOf(t.lineId), id: t.id ?? null }))
    .filter(b => b.cat !== 'none');
  const pays = tx.filter(t => t.amount > 0 && t.incomeId).map(t => ({ d: day(t.date) }));
  const plan = {};
  for (const l of lines) {
    const cat = SN_WEB_CAT[categoryKeyOf(l)], m = lineMonthly(l);
    if (cat && typeof m.value === 'number') plan[cat] = (plan[cat] || 0) + m.value;
  }
  const dates = tx.map(t => day(t.date)).sort(), imported = tx.map(t => day(t.importedAt)).filter(Boolean).sort().pop() || null;
  return { since: dates[0] || null, buys, pays, plan, imported };
}
// The buys a check-in can be asked about: the newest imported buys first, each with the other buys for the rules.
export function sinsRecentBuys(data, n = 10) {
  return [...data.buys].sort((a, b) => b.d.localeCompare(a.d)).slice(0, n);
}
