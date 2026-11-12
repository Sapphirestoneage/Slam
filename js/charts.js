// SPDX-License-Identifier: AGPL-3.0-only
// What the journey's four pictures draw (start.html, See it). Each takes results the engines already returned (the
// metrics object m from js/math/metrics.js, the plan from js/journey.js) and lays them out as points: no new math, no
// DOM. The growth path is the engine's own month-by-month path (fiDate with path: true), read once a year.
import { fiDate } from './math/fi.js';
import { RULES } from './registry/assumptions.js';

// Growth over time: one row a year from today to the year work becomes optional (60 years at most).
// { rows: [{ year, age, put (what you put in, the start included), grown (what growth added), total }], target, fiMonths,
//   start } or null when the plan has no path yet. put + grown = total on every row.
export function growthOf(m, { age = null, now = new Date(), maxYears = 60 } = {}) {
  const x = m.inputs, inv = m.investing, target = m.fiNumber.value;
  if (x.invested == null || inv?.monthly == null || target == null) return null;
  const path = fiDate({ invested: x.invested, monthlyInvesting: inv.monthly, realReturn: x.realReturn, target }, { from: now, path: true, before: inv.before ?? null, changes: inv.changes ?? null });
  const pts = path.points || [];
  if (pts.length < 2) return null;
  const reach = path.value != null && path.value < RULES.maxMonths ? path.value : null;
  const last = Math.min(pts.length - 1, (reach != null ? Math.ceil(reach / 12) : maxYears) * 12, maxYears * 12);
  const going = k => (inv.before && k < inv.before.months ? inv.before.monthly : inv.monthly + (inv.changes || []).reduce((s, c) => s + (c.at <= k ? c.monthly : 0), 0));
  const rows = []; let put = x.invested;
  for (let k = 0; k <= last; k++) {
    if (k > 0) put += going(k - 1);
    if (k % 12 === 0 || k === last) { const total = pts[Math.min(k, pts.length - 1)]; rows.push({ month: k, year: now.getFullYear() + Math.floor((now.getMonth() + k) / 12), age: age == null ? null : Math.floor(age + k / 12), put: Math.min(put, total), grown: Math.max(0, total - put), total }); }
  }
  return { rows, target, fiMonths: reach, start: x.invested, monthly: inv.monthly, wait: inv.before ?? null };
}

// Where the money goes: pay on the left, where it lands on the right.
// { total, from, parts: [{ id, label, amount, kind: 'tax' | 'save' | 'need' | 'debt' | 'rest' | 'left' }] }; the parts add up to total.
export function flowOf(m) {
  const f = m.flow, x = m.inputs;
  if (!f || f.takeHome == null || x.spending == null) return null;
  const line = letter => (x.lines || []).filter(l => (l.draftt ?? l.values?.draftt) === letter && l.amount != null).reduce((s, l) => s + (l.monthly ?? l.amount ?? 0), 0);
  const housing = line('Accommodation'), food = line('Food'), transport = line('Transportation');
  const debt = x.debts.reduce((s, d) => s + (d.inFull ? 0 : d.payment ?? 0), 0);
  const inSpending = x.debtPaymentsOutsideSpending ? 0 : debt; // the gut number holds the debt payments unless it says it does not
  const named = housing + food + transport + inSpending;
  const rest = Math.max(0, x.spending - named);
  const scale = named > x.spending && named > 0 ? x.spending / named : 1; // the lines can add up past a gut number: show them in proportion
  const left = f.takeHome - x.spending - (x.debtPaymentsOutsideSpending ?? 0);
  const gross = f.gross != null && f.gross >= f.takeHome;
  const parts = [
    gross ? { id: 'tax', label: 'Taxes', amount: f.taxes ?? 0, kind: 'tax' } : null,
    gross && f.beforeTax ? { id: 'pretax', label: '401(k) from your paycheck', amount: f.beforeTax, kind: 'save' } : null,
    { id: 'housing', label: 'Housing', amount: housing * scale, kind: 'need' },
    { id: 'food', label: 'Food', amount: food * scale, kind: 'need' },
    { id: 'transport', label: 'Getting around', amount: transport * scale, kind: 'need' },
    { id: 'debt', label: 'Debt payments', amount: (x.debtPaymentsOutsideSpending ? debt : inSpending * scale), kind: 'debt' },
    { id: 'rest', label: named ? 'Everything else' : 'Spending', amount: rest, kind: 'rest' },
    { id: 'left', label: left >= 0 ? 'Left over' : 'Short', amount: Math.abs(left), kind: 'left', short: left < 0 },
  ].filter(p => p && p.amount > 0.5);
  const total = parts.filter(p => !p.short).reduce((s, p) => s + p.amount, 0);
  return { total, from: gross ? 'Pay before taxes' : 'Take-home pay', takeHome: f.takeHome, parts, split: named > 0 };
}

// Debt payoff: the balance of each debt, month by month, on the plan in use.
// { months, debts: [{ id, name, points: [balance at month k], paidOff }], total: [sum at month k], interest } or null with no debt.
export function debtOf(m, { maxMonths = 30 * 12 } = {}) {
  const plan = m.debtPlan, debts = (plan?.debts || []).filter(d => d.balance > 0);
  if (!debts.length || !Array.isArray(plan.path) || !plan.path.length) return null;
  const all = plan.debts, path = plan.path.slice(0, maxMonths + 1);
  const idx = debts.map(d => all.indexOf(d));
  const series = debts.map((d, i) => ({ id: d.id, name: d.name.replace(/ \(total\)$/, ''), points: path.map(row => row[idx[i]] ?? 0), paidOff: d.paidOffMonth ?? null }));
  return { months: path.length - 1, debts: series, total: path.map(row => idx.reduce((s, i) => s + (row[i] ?? 0), 0)), interest: plan.interest ?? null, done: plan.months ?? null };
}

// The timeline: the plan's milestones placed between today and the last one. { span (months), points: [{ id, name, date, months, at (0 to 1), done }] }.
export function timelineOf(plan) {
  const open = plan.milestones.filter(x => !x.done && x.months != null && x.months < RULES.maxMonths);
  if (!open.length) return null;
  const span = Math.max(...open.map(x => x.months), 1);
  return { span, done: plan.milestones.filter(x => x.done).map(x => x.name), points: open.map(x => ({ id: x.id, name: x.name, date: x.date, months: x.months, at: x.months / span })) };
}
