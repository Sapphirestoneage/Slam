// SPDX-License-Identifier: AGPL-3.0-only
// The plan as a mirror: it leads with what the person said matters most, and shows their own money back to them in
// a few plain views. Pure: no DOM. Nothing here is new engine math: every figure is read off the plan (js/journey.js)
// or summed from rows the person gave.
import { fmt } from './math/result.js';

// What matters most. order: the plan screen's cards, first to last.
export const MIRRORS = [
  { id: 'date', label: 'When work becomes optional', order: ['hero', 'step', 'tiles', 'milestones'] },
  { id: 'safe', label: 'Being OK if something goes sideways', order: ['safe', 'step', 'hero', 'tiles', 'milestones'] },
  { id: 'enjoy', label: 'Enjoying more of my money now', order: ['enjoy', 'hero', 'step', 'tiles', 'milestones'] },
  { id: 'guide', label: 'Just tell me what to do next', order: ['step', 'hero', 'milestones', 'tiles'] },
];
export const mirrorOf = id => MIRRORS.find(m => m.id === id) ?? MIRRORS[0];

// How far along: what is invested, as a share of the number that makes work optional.
export function pctToFi(pl) {
  const t = pl?.m?.fiNumber?.value, inv = pl?.m?.inputs?.invested;
  return t > 0 && inv != null ? Math.max(0, Math.min(1, inv / t)) : null;
}

// One year of this household, top to bottom.
export function snapshotOf(pl) {
  const m = pl?.m, x = m?.inputs;
  if (!x || x.takeHome == null) return null;
  const y = v => (v == null ? null : v * 12), $ = v => (v == null ? 'Needs an answer' : fmt.money(Math.round(v)));
  const invest = m.investing?.monthly ?? null, left = m.surplus?.value ?? null;
  return [
    { label: 'Take-home pay', value: $(y(x.takeHome)), kind: 'head' },
    { label: 'Spending', value: $(y(x.spending)), sign: '−', kind: 'line' },
    { label: 'Left over', value: $(y(left)), kind: 'total' },
    invest != null ? { label: 'Of that, invested', value: $(y(invest)), kind: 'line' } : null,
    m.savingsRate?.value != null ? { label: 'Savings rate', value: fmt.pct(m.savingsRate.value), kind: 'line' } : null,
  ].filter(Boolean);
}

// A statement export, read into spending a month by category. read: what js/import/apps.js readFile returns.
// Money in, transfers between your own accounts and card payments are left out, so nothing is counted twice.
export function auditOf(read, ref) {
  if (!read || read.problem) return { problem: read?.problem ?? 'That file could not be read.' };
  if (!read.fmt?.id || !read.transactions?.length) return { problem: 'This reads a Rocket Money or Monarch export (a .csv file) for now.' };
  const cats = ref.importCategories?.[read.fmt.id] || {};
  const spend = read.transactions.filter(t => t.amount < 0 && !t.ignored && !String(cats[t.appCategory] ?? '').startsWith('@'));
  const months = [...new Set(spend.map(t => t.date.slice(0, 7)))].sort();
  if (!months.length) return { problem: 'No spending was found in that file.' };
  const by = {};
  for (const t of spend) { const k = cats[t.appCategory] || t.appCategory || 'Everything else'; by[k] = (by[k] ?? 0) - t.amount; }
  const rows = Object.entries(by).map(([name, total]) => ({ name, monthly: Math.round(total / months.length) })).filter(r => r.monthly > 0).sort((a, b) => b.monthly - a.monthly);
  return { name: read.fmt.name, months: months.length, from: months[0], to: months.at(-1), count: spend.length, rows, monthly: rows.reduce((s, r) => s + r.monthly, 0) };
}
export function auditWords(a, gut) {
  if (!a || a.problem) return null;
  const base = `${a.count} purchases over ${a.months} ${a.months === 1 ? 'month' : 'months'}: ${fmt.money(a.monthly)} a month.`;
  if (!(gut > 0)) return base;
  const d = a.monthly - gut;
  return Math.abs(d) < 0.03 * gut ? `${base} Your number from memory was ${fmt.money(gut)}, right on it.` : `${base} Your number from memory was ${fmt.money(gut)}, so the statement is ${fmt.money(Math.abs(d))} a month ${d > 0 ? 'higher' : 'lower'}.`;
}

// The value matrix: each spending line, marked by how it feels.
export const FEELINGS = [['love', 'Love'], ['like', 'Like'], ['tolerate', 'Tolerate'], ['dislike', 'Dislike']];
export function valuesOf(rows, feel = {}) {
  const totals = Object.fromEntries(FEELINGS.map(([k]) => [k, 0]));
  let marked = 0, all = 0;
  for (const r of rows) { all += r.monthly; const f = feel[r.name]; if (f && f in totals) { totals[f] += r.monthly; marked++; } }
  const loose = totals.tolerate + totals.dislike;
  return { totals, marked, of: rows.length, all, loose, half: Math.round(loose / 2) };
}

// What changed since the last visit. prev, now: { at: 'YYYY-MM-DD', fi: words, worth: number }.
export function sinceWords(prev, now) {
  if (!prev || !now || prev.at === now.at) return null;
  const parts = [];
  if (prev.fi && now.fi && prev.fi !== now.fi) parts.push(`your date went from ${prev.fi} to ${now.fi}`);
  if (prev.worth != null && now.worth != null && Math.round(prev.worth) !== Math.round(now.worth)) { const d = now.worth - prev.worth; parts.push(`your net worth is ${d > 0 ? 'up' : 'down'} ${fmt.money(Math.abs(Math.round(d)))}`); }
  const day = new Date(`${prev.at}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return parts.length ? `Since ${day}: ${parts.join(', and ')}.` : `Nothing has moved since ${day}.`;
}
