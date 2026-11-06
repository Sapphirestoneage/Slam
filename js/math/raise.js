// SPDX-License-Identifier: AGPL-3.0-only
// Batch 33 (QUESTIONS 288): a raise in one tap. The new gross is the row's gross a year times (1 + the raise); the new
// take-home is worked out with the app's own tax math (the household's tax, M12) on a copy of the file where the row
// is given as that gross, and the raise's extra take-home is added to what the row says now (so a pay stub's own
// deductions stay). Returns the patch for the row as it is given: Gross (the amount), Take-home (the amount) or Both.
import { metrics } from './metrics.js';

const clone = x => JSON.parse(JSON.stringify(x));
const rowIn = (m, id) => m.inputs.income.find(i => i.r.id === id) ?? null;
// The row's take-home a month and gross a year, as the household's math has them.
function rowAt(doc, ref, id, now) { const i = rowIn(metrics(doc, ref, { now }), id); return i ? { takeHome: i.takeHome?.value ?? null, gross: i.gross ?? null } : null; }
function asGross(doc, id, grossYear) {
  const out = clone(doc), r = out.records.find(x => x.id === id);
  r.amount = grossYear; r.per = 'year'; r.values = { ...r.values, basis: 'Gross', gross: null };
  return out;
}
export function raiseOf(doc, ref, id, pct, { now = new Date() } = {}) {
  const r = doc.records.find(x => x.id === id);
  if (!r || r.kind !== 'income' || !(pct > 0)) return null;
  const was = rowAt(doc, ref, id, now);
  if (!was || was.gross == null || was.takeHome == null) return null;
  const grossAfter = was.gross * (1 + pct);
  const at = g => rowAt(asGross(doc, id, g), ref, id, now)?.takeHome ?? null;
  const t0 = at(was.gross), t1 = at(grossAfter);
  if (t0 == null || t1 == null) return null;
  const takeHomeAfter = was.takeHome + (t1 - t0);
  const basis = r.values?.basis ?? 'Take-home';
  const scale = was.takeHome ? takeHomeAfter / was.takeHome : 1; // the typed amount keeps its own period (a paycheck, a month)
  const round = v => Math.round(v); // whole dollars: a worked-out number never looks more exact than it is
  const patch = basis === 'Gross' ? { amount: round(r.amount * (1 + pct)) }
    : basis === 'Both' ? { amount: round(r.amount * scale), gross: Math.round(grossAfter) }
      : { amount: round(r.amount * scale) };
  return { pct, basis, grossBefore: was.gross, grossAfter, takeHomeBefore: was.takeHome, takeHomeAfter, patch };
}
