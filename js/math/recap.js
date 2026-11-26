// SPDX-License-Identifier: AGPL-3.0-only
// M8R, the auto session summary (run Finish everything partly built, Part 18): the top takeaways of one session and
// the client's next steps, drafted from what the session changed. Pure: no DOM, no new money math. Each number comes
// from keyNumbers (js/math/metrics.js) now and in the snapshot saved before the session; each date from the one debt
// plan (M34) and the FI date (M53) those snapshots carry; the steps are the next moves (M82) and the client's homework.
// The coach edits the draft on Report › One-pager before it is sent.
import { fmt } from './result.js';
import { addMonths, monthName } from '../month.js';

const RECAP_MAX = { takeaways: 10, steps: 5 };
// The kinds of rows, in words (one and many).
const KIND_WORDS = {
  income: ['income row', 'income rows'], debt: ['debt', 'debts'], asset: ['asset', 'assets'], bill: ['Budget line', 'Budget lines'],
  milestone: ['goal', 'goals'], protection: ['cover', 'covers'], entry: ['calendar entry', 'calendar entries'], person: ['person', 'people'],
  account: ['account', 'accounts'], spending: ['spending total', 'spending totals'], coverage: ['cover', 'covers'], event: ['life event', 'life events'], date: ['date', 'dates'], rung: ['step', 'steps'], gap: ['income gap', 'income gaps'], backup: ['backup', 'backups'], homework: ['to-do', 'to-dos'],
};
// The parts of the file that are not rows, in words.
const PART_WORDS = { profile: 'About you', assumptions: 'the plan\'s assumptions', taxes: 'Taxes', spending: 'the Budget settings', program: 'the plan', session: 'the session notes', scorecard: 'the Scorecard' };
const kindWords = (kind, n) => { const w = KIND_WORDS[kind] ?? [kind || 'row', `${kind || 'row'}s`]; return n === 1 ? w[0] : w[1]; };
const OPS = { add: 'Added', set: 'Updated', status: 'Updated', remove: 'Removed' };
const list = names => (names.length <= 2 ? names.join(' and ') : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`);

// The changes of the session, grouped: one group for each kind of row (or part of the file) and what was done to it.
// changes: [{ op: 'add' | 'set' | 'status' | 'remove', kind, part, rowId, name }], name null for a row kept private
// (it counts, its name never shows). A row added in the session counts once, as added, however often it was edited.
export function recapChanges(changes) {
  const added = new Set((changes || []).filter(c => c.op === 'add' && c.rowId).map(c => c.rowId));
  const groups = new Map();
  for (const c of changes || []) {
    const op = OPS[c.op] ? (c.op === 'status' ? 'set' : c.op) : null;
    if (!op || (op === 'set' && c.rowId && added.has(c.rowId))) continue;
    const key = `${op}:${c.rowId ? `k:${c.kind}` : `p:${c.part}`}`;
    const g = groups.get(key) ?? { op, kind: c.rowId ? c.kind : null, part: c.rowId ? null : c.part, rows: new Map(), fields: 0 };
    if (c.rowId) { if (!g.rows.has(c.rowId)) g.rows.set(c.rowId, c.name ?? null); } else g.fields += 1;
    groups.set(key, g);
  }
  return [...groups.values()].map(g => {
    const n = g.rows.size, named = [...g.rows.values()].filter(Boolean), unnamed = n - named.length;
    const text = g.kind != null || n
      ? `${OPS[g.op]} ${n} ${kindWords(g.kind, n)}${named.length ? `: ${list(named)}${unnamed ? ` and ${unnamed} kept private` : ''}` : unnamed ? ' (kept private)' : ''}.`
      : `${OPS[g.op]} ${PART_WORDS[g.part] ?? g.part} (${g.fields} ${g.fields === 1 ? 'answer' : 'answers'}).`;
    return { key: `change:${g.op}:${g.kind ?? g.part}`, kind: 'change', count: g.kind != null || n ? n : g.fields, text };
  }).sort((a, b) => b.count - a.count);
}

// The key numbers, then and now, as takeaways. before null: the first session, so each number is said as it is today.
// at and beforeAt: the month of today and of the snapshot (YYYY-MM). fiOk false: the FI date is not unlocked yet, so it stays out (the same rule as the one-pager).
export function recapNumbers(before, now, { at = null, beforeAt = null, fiOk = true } = {}) {
  if (!now) return [];
  const out = [];
  const signed = (d, f) => (d > 0 ? `up ${f(d)}` : `down ${f(-d)}`);
  const money = v => fmt.money(v), pct = v => fmt.pct(v);
  const same = (k, eps = 0.5) => before && before[k] != null && now[k] != null && Math.abs(now[k] - before[k]) < eps;
  const num = (k, label, f, eps) => {
    if (now[k] == null || same(k, eps)) return;
    const was = before?.[k];
    out.push({ key: `num:${k}`, kind: 'number', text: was == null ? `${label} today: ${f(now[k])}.` : `${label} is ${f(now[k])}, ${signed(now[k] - was, f)} since the last session.` });
  };
  num('netWorth', 'Net worth', money);
  num('debtTotal', 'Debt on file', money);
  num('surplus', 'Monthly surplus', money);
  num('savingsRate', 'Savings rate', pct, 0.0005);
  // A date is compared as a calendar month: the snapshot's months count from its own day, today's from today.
  const idx = (ym, n) => { const [y, mo] = String(ym).split('-').map(Number); return y * 12 + (mo - 1) + n; };
  const when = months => (at ? monthName(addMonths(at, months), 'short') : `${months} months from now`);
  const date = (k, label) => {
    if (now[k] == null) return;
    const was = before?.[k];
    const gap = was == null ? null : at && beforeAt ? idx(beforeAt, was) - idx(at, now[k]) : was - now[k];
    if (gap === 0) return;
    // A later date is never a verdict: the plan recalculates and says the new date (the run's tone rule).
    out.push({ key: `date:${k}`, kind: 'date', text: gap == null ? `${label}: ${when(now[k])}.` : gap > 0 ? `${label}: ${when(now[k])}, ${gap} ${gap === 1 ? 'month' : 'months'} sooner.` : `Recalculating: ${label === 'FI date' ? 'the FI date' : label.toLowerCase()} is now ${when(now[k])}.` });
  };
  date('debtFreeMonths', 'Debt free');
  if (fiOk) date('monthsToFi', 'FI date');
  return out;
}

// The whole draft: the top takeaways (numbers first, then what was done, the biggest first) and the next steps (the
// next moves, then the client's own to-dos, each once).
export function sessionRecap({ before = null, now = null, changes = [], moves = [], todo = [] }, { at = null, beforeAt = null, fiOk = true, max = RECAP_MAX } = {}) {
  const takeaways = [...recapNumbers(before, now, { at, beforeAt, fiOk }), ...recapChanges(changes)].slice(0, max.takeaways);
  const seen = new Set(), steps = [];
  for (const s of [...moves, ...todo]) { const k = String(s || '').trim(); if (k && !seen.has(k.toLowerCase())) { seen.add(k.toLowerCase()); steps.push(k); } }
  return { takeaways, steps: steps.slice(0, max.steps), firstSession: before == null };
}

// The draft as the text that is sent (and that the coach edits): a title, the takeaways, the steps, the next session.
export function recapText(recap, { title, next = null, notes = [] } = {}) {
  const n = recap.steps.length;
  return [
    title, '',
    recap.takeaways.length ? `Top ${recap.takeaways.length === 1 ? 'takeaway' : `${recap.takeaways.length} takeaways`}:` : null,
    ...recap.takeaways.map((t, i) => `${i + 1}. ${t.text}`),
    recap.takeaways.length ? '' : null,
    n ? `Your next ${n === 1 ? 'step' : `${n} steps`}:` : null,
    ...recap.steps.map((t, i) => `${i + 1}. ${t}`),
    n ? '' : null,
    ...notes.map(([k, v]) => `${k}: ${v}`),
    notes.length ? '' : null,
    next ? `Next session: ${next}` : null,
    next ? '' : null,
    'Coach, not a licensed financial advisor.',
  ].filter(x => x !== null).join('\n');
}
