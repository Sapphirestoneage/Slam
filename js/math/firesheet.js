// SPDX-License-Identifier: AGPL-3.0-only
// The FIRE sheet's own math: one row for each year from today to the plan's last year, in today's dollars, the way a
// FIRE spreadsheet works it out. It is a simple model on purpose, so that every cell of the tab can be a live formula:
// no income tax, one invested balance, one return a year. The app's own plan (js/math/lifetime.js, or the game's
// engine) is carried beside it as values. js/sheet/fire.js writes the same steps as spreadsheet formulas, and
// test/firesheet.test.js lets LibreOffice work the formulas out and compares each cell with this file.
// tools/audit/engine2.py works every row out a second time (docs/AUDIT.md). Pure: no DOM, no storage.
//
// A working year (age under the stop age): the balance grows for the year, and what goes in grows for the part of the
// year it was there (a twelfth each month, the same as js/math/lifetime.js).
// A free year: the withdrawal comes out at the start of the year, then the rest grows.

// How each way to take money out is written in the sheet. An id that is not here cannot be a formula: the sheet then
// uses 'steady' for its live columns and says so, and the app's values for that way sit beside them.
export const FIRE_KINDS = { fixed: 'steady', fixed_real: 'steady', percent: 'share', floor: 'floor', guardrails: 'guardrails', guyton_klinger: 'guardrails' };
export const fireKindOf = id => FIRE_KINDS[id] ?? null;
// Guardrails, the same rule as js/math/lifetime.js: cut 10% when the rate taken drifts 20% above the first year's,
// raise 10% when it drifts 20% below (while under 130%), never under 70% of what life costs.
export const FIRE_GUARD = { band: 0.2, step: 0.1, low: 0.7, high: 1.3 };
export const FIRE_FLOOR = { low: 0.85, high: 1.2 };

// What a dollar added a twelfth each month is worth at the year's end, at a yearly return r.
export const fireThrough = r => (r === 0 ? 1 : r / (12 * ((1 + r) ** (1 / 12) - 1)));

// x: { year, age, stopAge, lastAge, income, spending, spendingAfter, invested, contributions: [a year, ...],
//      realReturn, safeRate, other (income a year after work stops), otherAge, kind, rate }
// Out: one row a year: { year, age, stage, income, spending, savings, savingsRate (null with no income),
//      contributions, withdrawal, balance (year end), fiNumber, pctToFi (null with no FI number), dial, firstRate }.
export function fireSheetRows(x) {
  const r = x.realReturn ?? 0, through = fireThrough(r), kind = x.kind ?? 'steady', need = x.spendingAfter ?? 0;
  const fiNumber = x.safeRate > 0 ? need / x.safeRate : null;
  const rows = [];
  let bal = x.invested ?? 0, dial = 1, firstRate = 0, wasFree = false;
  for (let k = 0, age = x.age; age <= x.lastAge; k++, age++) {
    const free = age >= x.stopAge;
    const income = free ? (age >= (x.otherAge ?? Infinity) ? x.other ?? 0 : 0) : x.income ?? 0;
    const contributions = (x.contributions || []).map(c => (free ? 0 : c ?? 0)), savings = contributions.reduce((a, b) => a + b, 0);
    let withdrawal = 0, spending = x.spending ?? 0;
    if (free) {
      const start = bal;
      firstRate = wasFree ? firstRate : start > 0 ? need / start : 0;
      if (kind === 'guardrails' && firstRate !== 0) {
        if (need * dial > firstRate * (1 + FIRE_GUARD.band) * start) dial *= 1 - FIRE_GUARD.step;
        else if (need * dial < firstRate * (1 - FIRE_GUARD.band) * start && dial < FIRE_GUARD.high) dial *= 1 + FIRE_GUARD.step;
        dial = Math.max(FIRE_GUARD.low, dial);
      }
      const target = kind === 'share' ? start * (x.rate ?? 0) : kind === 'floor' ? Math.min(need * FIRE_FLOOR.high, Math.max(need * FIRE_FLOOR.low, start * (x.rate ?? 0))) : kind === 'guardrails' ? need * dial : need;
      withdrawal = Math.min(start, Math.max(0, target - income));
      spending = withdrawal + income;
      bal = (start - withdrawal) * (1 + r);
      wasFree = true;
    } else bal = bal * (1 + r) + savings * through;
    rows.push({ year: x.year + k, age, stage: age === x.stopAge ? 'Stop work' : free ? 'Living on the plan' : 'Working', income, spending, savings,
      savingsRate: !free && income > 0 ? savings / income : null, contributions, withdrawal, balance: bal, fiNumber, pctToFi: fiNumber > 0 ? bal / fiNumber : null, dial: free ? dial : 1, firstRate: free ? firstRate : 0 });
  }
  return rows;
}
