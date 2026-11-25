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
import { enCreep, enCreepWords, enPareto, enEnough, EN_INCOME_GUESS } from './math/enough.js';
import { categoryName, categoryKeyOf, myShare } from './math/spending.js';
import { fiDate } from './math/fi.js';

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
  const lines = (x.typedLines || []).filter(l => l.amount != null && !x.dupOf?.[l.id] && l.status !== 'Not for me' && !['Debt', 'Retirement'].includes(l.draftt))
    .map(l => ({ name: l.name || l.category || 'A line', amt: myShare(l, { roommates: x.roommates ?? 0 }).value ?? 0 }));
  const pareto = enPareto(lines);
  // Enough: the plan's FI number scaled to the life called enough, and the same FI date run to it.
  const E = enEnough({ fi: m.fiNumber?.value ?? null, share: typeof ch.share === 'number' ? ch.share : 1, room: typeof ch.room === 'number' ? ch.room : null, have: x.invested ?? null });
  const when = target => (target == null || x.invested == null || x.realReturn == null ? null
    : fiDate({ invested: x.invested, monthlyInvesting: m.investing?.monthly ?? 0, realReturn: x.realReturn, target }, { from: now, before: m.investing?.before ?? null, changes: m.investing?.changes ?? null }));
  const enough = { ...E, at: E.value == null ? null : when(E.value), atRoom: E.withRoom == null ? null : when(E.withRoom) };
  return { choices: ch, inflation, inflationFrom: ch.inflation === 'cpi' ? 'cpi' : inflation == null ? null : 'tapped', creep, pareto, enough, incomeChoices: EN_INCOME_GUESS };
}
export const creepCardOf = (E, money) => enCreepWords(E.creep, money);
