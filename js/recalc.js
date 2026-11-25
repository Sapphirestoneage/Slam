// SPDX-License-Identifier: AGPL-3.0-only
// Recalculating, for the coach app (Nov 25 2026). Pure: no DOM. It reads the household and the numbers the screens
// already show, and hands them to js/math/recalc.js (the same functions the game runs). Nothing here works a date or
// a payoff out a second way: the debt-free month is the one debt plan (M34), the FI month is M53, the cushion is the
// cash layers, a line's monthly share is M21.
//   The kept plan is the last snapshot with numbers (End session, Month end, Save snapshot). Today's side always
//   starts from today's balances, never from where that snapshot said they would be by now.
import { keyNumbers, debtRerunOf } from './math/metrics.js';
import { myShare } from './math/spending.js';
import { layerSnapshot } from './math/layers.js';
import { actualOf, instances, ymOf } from './month.js';
import { CALM_LETTER, exerciseOf } from './exercises/calm-letter.js';
import { rcRoute, rcHoldExtra, rcWords, rcMonthsBetween, rcYm, rcTriage, rcClassOf, rcScriptsFor, rcRefill, rcSafeLine, rcMonthState, rcAudit, RC_KINDS } from './math/recalc.js';

export const notesOf = doc => doc.settings?.recalc ?? {};
const keptPlan = doc => [...(doc.snapshots || [])].reverse().find(s => s.metrics && (s.metrics.debtFreeMonths != null || s.metrics.monthsToFi != null)) ?? null;

// What still waits for a mark this month: calendar items due by today that are still Planned. Counted only once the
// calendar is in use this month (something has a mark), so a household that never marks it is not nagged.
export function openThisMonth(doc, ref, now = new Date()) {
  try {
    const list = instances(doc, ref, ymOf(now), { now }), today = now.toISOString().slice(0, 10);
    if (!list.some(i => i.status && i.status !== 'Planned')) return 0;
    return list.filter(i => (i.status ?? 'Planned') === 'Planned' && i.group !== 'Maybe' && i.date && i.date <= today).length;
  } catch { return 0; }
}

// The two routes (debt free, work optional), the one card's words, the triage, the refill, the safe-to-fail line,
// the letter and the state of the month.
export function recalcOf(doc, ref, m, { now = new Date(), open = openThisMonth(doc, ref, now) } = {}) {
  const kept = keptPlan(doc), k = keyNumbers(m), nowAt = now.toISOString();
  const debt = kept ? rcRoute({ planAt: kept.at, planMonths: kept.metrics.debtFreeMonths ?? null, nowAt, months: k.debtFreeMonths, open: (k.debtTotal ?? 0) > 0 }) : null;
  const fi = kept ? rcRoute({ planAt: kept.at, planMonths: kept.metrics.monthsToFi ?? null, nowAt, months: k.monthsToFi, open: true }) : null;
  let hold = null;
  if (debt?.moved && debt.later && !debt.noDate) {
    const rerun = debtRerunOf(m);
    hold = rcHoldExtra(extra => rerun(extra)?.months ?? null, rcMonthsBetween(rcYm(nowAt), debt.oldYm));
  }
  // The triage: every line that is yours this month, and each debt's payment, down the order.
  const x = m.inputs, mine = l => myShare(l, { roommates: x.roommates ?? 0 }).value ?? null;
  const lines = (x.typedLines || []).filter(l => l.amount != null && !x.dupOf?.[l.id] && l.status !== 'Not for me' && !['Debt', 'Retirement'].includes(l.draftt));
  const bills = [...lines.map(l => ({ name: l.name || l.category || 'A line', cls: rcClassOf(l.category, l.name), amount: mine(l) })),
    ...(x.debts || []).filter(d => !d.inFull && (d.balance ?? 0) > 0 && d.payment != null).map(d => ({ name: `${d.name || d.type || 'Debt'} payment`, cls: 'minimums', amount: d.payment }))];
  // One total for the month: what goes out is take-home less the surplus, the same number The gap shows. When the
  // lines and the debts add up to less than that (a gut number with few lines), the rest is one row at the end.
  const out = x.takeHome != null && m.surplus?.value != null ? x.takeHome - m.surplus.value : null;
  const listed = bills.reduce((t, b) => t + (b.amount ?? 0), 0);
  if (out != null && out - listed > 0.5) bills.push({ name: 'Everything else in your spending number', cls: 'rest', amount: out - listed });
  const T = bills.length ? rcTriage({ income: x.takeHome ?? null, bills }) : null;
  const triage = T && T.short > 0.5 ? { ...T, scripts: rcScriptsFor(T) } : null; // scripts: null until Eli has reviewed the words (RC_SCRIPTS_REVIEWED)
  // With the triage on, the one next turn is the order to pay in, not an extra payment.
  if (triage) hold = null;
  const turn = triage ? 'Start with the order below: housing first. The dates settle once the month is covered.' : null;
  const cards = [debt?.moved ? { id: 'debt', route: debt, words: rcWords(debt, { what: 'Debt free', hold, turn }), hold } : null,
    fi?.moved ? { id: 'fi', route: fi, words: rcWords(fi, { what: 'Work optional', turn }) } : null].filter(Boolean);
  // The refill: after money was used (a recorded dip), put the cash back to where it stood before. Before is the
  // cash of the last snapshot taken before the dip; with none, it is today's cash plus what was used. It ends when
  // the cash is back, or when the person says it is (settings.recalc.refilled).
  const N = notesOf(doc);
  const dips = doc.spending?.dips || [], last = dips.length ? [...dips].sort((a, b) => String(a.at).localeCompare(String(b.at))).at(-1) : null;
  let refill = null;
  if (last && last.amount > 0 && N.refilled !== last.id) {
    const today = layerSnapshot(doc, ref, now);
    const before = [...(doc.snapshots || [])].reverse().find(sn => sn.at <= last.at && sn.layers?.cash != null);
    if (today?.cash != null) {
      // never more to put back than was used
      const r = rcRefill({ target: Math.min(before ? before.layers.cash : Infinity, today.cash + last.amount), balance: today.cash, monthly: m.surplus?.value > 0 ? m.surplus.value : null, nowAt });
      if (r && !r.full) refill = { ...r, used: last.amount, at: last.at, id: last.id, layers: (last.from || []).map(f => f.name) };
    }
  }
  // The safe-to-fail line: the plan counts its amount whether it is used or not.
  const safeRec = N.safe ? (x.typedLines || []).find(l => l.id === N.safe) ?? null : null;
  let safe = null;
  if (safeRec) {
    const ym = ymOf(now); let spent = null;
    try { const a = actualOf(doc, ym, safeRec, instances(doc, ref, ym, { now })); spent = a.value == null ? null : Math.abs(a.value); } catch { spent = null; }
    const s = rcSafeLine({ cap: mine(safeRec), spent });
    if (s) safe = { ...s, id: safeRec.id, name: safeRec.name || safeRec.category || 'Fun' };
  }
  // A date that moved sooner is a win. Keeping it adds a Win row (the calendar's stars); once kept, the button goes.
  for (const c of cards) if (c.words.win) { c.winName = `${c.id === 'debt' ? 'Debt free' : 'Work optional'}: ${c.words.head.replace(/^New route: /, '')} (now ${c.words.is})`; c.winKept = (doc.records || []).some(r => r.kind === 'win' && r.name === c.winName); }
  const state = rcMonthState({ routes: [debt, fi], triage, refill, open });
  return { kept, cards, debt, fi, hold, triage, refill, safe, state, letter: exerciseOf(doc, CALM_LETTER.id),
    safeChoices: (x.typedLines || []).filter(l => l.amount != null && ['Wants', 'Other'].includes(l.draftt) && l.status !== 'Not for me').map(l => ({ id: l.id, name: l.name || l.category })) };
}

// The opt-in audit that looks back. The events are the person's own list (settings.recalc.audit.events).
export function auditOf(doc, m, { now = new Date() } = {}) {
  const A = notesOf(doc).audit ?? {}, x = m.inputs, ym = rcYm(now.toISOString());
  const events = (A.events || []).map(e => ({ ...e, yearsAgo: e.ym ? Math.max(0, rcMonthsBetween(e.ym, ym)) / 12 : null }));
  const saved = m.surplus?.value > 0 ? m.surplus.value : null, months = m.monthsToFi?.value ?? null;
  const R = rcAudit({ events, realReturn: x.realReturn ?? null, years: months == null ? null : months / 12, perDay: saved == null ? null : saved * 12 / 365, hourly: m.hourly?.value ?? null, yearIncome: x.takeHome == null ? null : x.takeHome * 12 });
  return { on: !!A.on, ...R, kinds: RC_KINDS, saved, years: months == null ? null : months / 12, realReturn: x.realReturn ?? null };
}
