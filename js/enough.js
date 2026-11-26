// SPDX-License-Identifier: AGPL-3.0-only
// Lifestyle creep and enough, for the coach app (run Not built, groups 1 to 5, Part 3, Nov 25 2026). Pure: no DOM. It
// reads the household and hands plain rows to js/math/enough.js (the same functions the game runs). Nothing here works
// a number out a second way: the enough number scales the plan's own FI number (M50), its dates are the one FI date
// (M53), a line's month is its share (M21).
//   The ledger: each Budget line's Actual, month by month (spending.months; an import adds to it), by Budget
//   category; income: the paychecks brought in with an import (spending.transactions with an income). A month with no
//   Actual typed is not a $0 month: it is left out.
//   The choices (settings.enough): the inflation rate tapped, the income growth guessed, the life called enough, the
//   room for error. Screen choices, not money inputs of the plan.
import { enCreep, enCreepWords, enPareto, enEnough, EN_INCOME_GUESS, enJoy, enCurve, enRich, enSubs, enJoyOk } from './math/enough.js';
import { categoryName, categoryKeyOf, myShare } from './math/spending.js';
import { fiDate, fiMoveOf } from './math/fi.js';
import { categoryJoyOf } from './capture.js';

export const enoughChoicesOf = doc => doc?.settings?.enough ?? {};
const day = v => (v ? String(v).slice(0, 10) : null);

// The rows of the ledger, in the shape the engine reads.
export function creepRowsOf(doc) {
  const lines = new Map((doc?.records || []).filter(r => r.kind === 'bill').map(r => [r.id, r]));
  const rows = [];
  for (const [ym, mo] of Object.entries(doc?.spending?.months || {})) {
    if (!/^\d{4}-\d{2}$/.test(ym)) continue;
    for (const [id, v] of Object.entries(mo?.lines || {})) {
      const l = lines.get(id);
      if (!l || typeof v?.actual !== 'number' || !Number.isFinite(v.actual)) continue;
      const key = categoryKeyOf(l);
      if (key === 'Debt' || key === 'Retirement') continue; // a payment to a debt or a saving is not spending that creeps
      rows.push({ d: ym, amt: v.actual, cat: categoryName(key), kind: 'out' });
    }
  }
  for (const t of doc?.spending?.transactions || []) {
    if (t && t.incomeId && typeof t.amount === 'number' && t.amount > 0 && day(t.date)) rows.push({ d: day(t.date), amt: t.amount, kind: 'in' });
  }
  return rows;
}

// Everything the Budget's two sections and the Goals section show.
export function enoughOf(doc, ref, m, { now = new Date() } = {}) {
  const ch = enoughChoicesOf(doc), x = m.inputs;
  const inflation = ch.inflation === 'cpi' ? ref.cpi.value : typeof ch.inflation === 'number' ? ch.inflation : null;
  const creep = enCreep(creepRowsOf(doc), { inflation, incomeGrowth: typeof ch.incomeGrowth === 'number' ? ch.incomeGrowth : null });
  // The few lines: each line's month (your share), the same number the Budget shows.
  const pareto = enPareto(spendLinesOf(m));
  // Enough: the plan's FI number scaled to the life called enough, and the same FI date run to it.
  const E = enEnough({ fi: m.fiNumber?.value ?? null, share: typeof ch.share === 'number' ? ch.share : 1, room: typeof ch.room === 'number' ? ch.room : null, have: x.invested ?? null });
  const when = target => (target == null || x.invested == null || x.realReturn == null ? null
    : fiDate({ invested: x.invested, monthlyInvesting: m.investing?.monthly ?? 0, realReturn: x.realReturn, target }, { from: now, before: m.investing?.before ?? null, changes: m.investing?.changes ?? null }));
  const enough = { ...E, at: E.value == null ? null : when(E.value), atRoom: E.withRoom == null ? null : when(E.withRoom) };
  return { choices: ch, inflation, inflationFrom: ch.inflation === 'cpi' ? 'cpi' : inflation == null ? null : 'tapped', creep, pareto, enough, incomeChoices: EN_INCOME_GUESS };
}
export const creepCardOf = (E, money) => enCreepWords(E.creep, money);

// ---------- joy and enough (run Finish everything partly built, Part 8, Nov 26 2026) ----------
// The spending lines the Budget shows (your share a month), with what the joy, the curve and the subscriptions read:
// the line's own joy tap (values.joyRate), its category (values.category, the key of the category joy ratings) and
// its group (Bills and subscriptions is the group 'Bills').
export function spendLinesOf(m) {
  const x = m.inputs;
  return (x.typedLines || []).filter(l => l.amount != null && !x.dupOf?.[l.id] && l.status !== 'Not for me' && !['Debt', 'Retirement'].includes(l.draftt))
    .map(l => { const key = categoryKeyOf(l); return { id: l.id, name: l.name || l.category || 'A line', amt: myShare(l, { roommates: x.roommates ?? 0 }).value ?? 0, cat: l.category || categoryName(key), key, joyRate: enJoyOk(l.joyRate) ? l.joyRate : null }; });
}
// Joy per dollar: each line's own joy tap, or its category's rating (Joy by category) while it has none of its own.
export function joyOf(doc, m) {
  const L = spendLinesOf(m), cat = categoryJoyOf(doc);
  const rows = L.map(l => { const c = cat[l.cat]?.value ?? null; return { name: l.name, amt: l.amt, joy: l.joyRate ?? (enJoyOk(c) ? c : null), from: l.joyRate != null ? 'line' : enJoyOk(c) ? 'category' : null }; });
  return { ...enJoy(rows, { wage: m.hourly?.value ?? null }), lines: L, wageGuess: !!m.hourly?.guess };
}
// The fulfillment curve: each category of the Budget (your share a month), placed with a tap (settings.enough.curve).
export function curveOf(doc, m) {
  const by = new Map();
  for (const l of spendLinesOf(m)) by.set(l.cat, (by.get(l.cat) ?? 0) + l.amt);
  return enCurve([...by].map(([cat, amt]) => ({ cat, amt })), enoughChoicesOf(doc).curve ?? {});
}
// The days a move shifts the plan's own FI date (M53 through fiMoveOf, to a fraction of a month; later is positive).
const movedDays = (m, move, now) => { const r = fiMoveOf(m, move, { from: now }); return r == null || r.never || r.fineDays == null ? null : r.fineDays; };
// The rich-life list (settings.richLife): each thing with its price and joy, the memory dividends, the regret view.
export const richListOf = doc => (Array.isArray(doc?.settings?.richLife) ? doc.settings.richLife : []);
export function richOf(doc, ref, m, { now = new Date() } = {}) {
  const lifeTo = doc?.assumptions?.lifeExpectancy ?? ref?.defaults?.lifeExpectancy ?? null;
  return enRich(richListOf(doc), { age: m.inputs.age ?? null, lifeTo, days: price => movedDays(m, { once: price }, now) });
}
// Every subscription (each line of Bills and subscriptions) as days added to the FI date: the plan run with all of
// them cancelled (that much more invested a month, and a smaller FI number, as they would not be paid after work
// either), each one's part by its share.
export function subsOf(doc, m, { now = new Date() } = {}) {
  const S = spendLinesOf(m).filter(l => l.key === 'Bills' && l.amt > 0).map(l => ({ name: l.name, amt: l.amt }));
  const total = S.reduce((s, l) => s + l.amt, 0), wr = m.inputs.withdrawalRate;
  const sooner = total > 0 && wr > 0 ? movedDays(m, { changes: [{ at: 0, monthly: total }], fi: -(total * 12) / wr }, now) : null;
  const days = sooner == null ? null : -sooner; // cancelled, the date comes this much sooner: kept, it adds these days
  return enSubs(S, days, { wage: m.hourly?.value ?? null });
}
