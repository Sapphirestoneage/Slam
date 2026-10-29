// The plan model (build phase 7): FI targets, milestone dates, the Next 3 numbers and Guide me.
// Pure: reads a household and its metrics, never the DOM.
import { metrics } from './math/metrics.js';
import { fiDate, leanFiNumber, baristaFiNumber, pctToFi, solveMonthlySaving, solveSpending } from './math/fi.js';
import { payoffPlan } from './math/debt.js';
import { myShare } from './math/spending.js';
import { statusOf } from './records.js';
import { gatesOf, visible } from './gates.js';
import { addMonths, ymOf, dateOf, monthName } from './month.js';

export const MILESTONES = ['Lean FI', 'Coast FI', 'Barista FI', 'Regular FI', 'Fat FI', 'Debt free', 'Custom'];
export const FAT_FACTOR = 1.5; // Fat FI: 1.5 times regular spending (QUESTIONS: confirm)
const FAT_LETTERS = new Set(['Food', 'Accommodation', 'Transportation']);

// Every FI number the plan talks about.
export function fiTargets(m, doc) {
  const x = m.inputs;
  const w = x.withdrawalRate;
  const fat = x.lines.filter(l => FAT_LETTERS.has(l.draftt)).reduce((s, l) => s + (myShare(l, { roommates: x.roommates }).value ?? 0), 0);
  const partTime = doc.assumptions?.partTimeIncome ?? null; // a month
  return {
    'Lean FI': fat ? leanFiNumber({ annualFat: fat * 12, withdrawalRate: w }) : { id: 'M51', value: null, needs: ['food, housing or transportation lines'] },
    'Coast FI': m.coastFi,
    'Barista FI': baristaFiNumber({ annualSpending: x.retirementSpending === null ? null : x.retirementSpending * 12, partTimeIncome: partTime === null ? null : partTime * 12, withdrawalRate: w }),
    'Regular FI': m.fiNumber,
    'Fat FI': m.fiNumber.value === null ? m.fiNumber : { id: 'M50', value: m.fiNumber.value * FAT_FACTOR, needs: [], unit: 'money', text: `Regular FI ${Math.round(m.fiNumber.value).toLocaleString()} times ${FAT_FACTOR} for a roomier life.` },
  };
}

// Months until invested reaches a target, at a pace (return) and with extra saving a month.
export function monthsTo(m, target, { realReturn = m.inputs.realReturn, extra = 0, now = new Date() } = {}) {
  if (target == null) return { value: null, needs: ['a target'] };
  if (m.inputs.invested != null && m.inputs.invested >= target) return { value: 0, reached: true };
  return fiDate({ invested: m.inputs.invested, monthlyInvesting: m.surplus.value === null ? null : m.surplus.value + extra, realReturn, target }, { from: now });
}

// A milestone row's projected date.
export function projection(m, doc, rec, now = new Date()) {
  const t = rec.type || 'Custom';
  const base = ymOf(now);
  const at = months => (months == null ? null : dateOf(addMonths(base, months), 1));
  if (rec.values.mode === 'date' && rec.values.date) return { months: null, date: rec.values.date, text: `Set for ${rec.values.date}` };
  if (t === 'Custom') return { months: null, date: null, text: rec.values.condition ? 'Checked by hand' : 'Add a date or a condition' };
  if (t === 'Debt free') {
    const ds = m.inputs.debts.filter(d => !d.inFull && d.balance > 0 && d.apr != null && d.payment != null);
    if (!m.inputs.debts.some(d => d.balance > 0)) return { months: 0, date: at(0), reached: true, text: 'No debt' };
    if (!ds.length) return { months: null, date: null, text: 'Needs balance, APR and payment' };
    const p = payoffPlan(ds, { order: m.inputs.debtOrder });
    return p.months === null ? { months: null, date: null, text: 'Payments never clear it' } : { months: p.months, date: at(p.months), text: monthName(addMonths(base, p.months)) };
  }
  const target = fiTargets(m, doc)[t];
  if (!target || target.value == null) return { months: null, date: null, text: `Needs ${(target?.needs || ['more numbers']).join(' and ')}` };
  const r = monthsTo(m, target.value, { now });
  if (r.reached) return { months: 0, date: at(0), reached: true, text: 'Reached' };
  if (r.value == null) return { months: null, date: null, text: r.never ? 'Not on this path' : `Needs ${(r.needs || []).join(' and ')}` };
  return { months: r.value, date: at(r.value), target: target.value, text: monthName(addMonths(base, r.value)) };
}

// Percent of the way to each step (the milestone ladder, M55).
export function ladder(m, doc) {
  const t = fiTargets(m, doc);
  const vals = Object.fromEntries(Object.entries(t).map(([k, r]) => [k, r?.value ?? null]));
  return pctToFi(m.inputs.invested, vals);
}

// With an FI age: what saving or spending gets there (M57).
export function solveFor(m, fiAge) {
  const x = m.inputs;
  if (fiAge == null || x.age == null) return null;
  const months = Math.max(1, Math.round((fiAge - x.age) * 12));
  const save = solveMonthlySaving({ invested: x.invested, realReturn: x.realReturn, target: m.fiNumber.value, months });
  const spend = solveSpending({ invested: x.invested, monthlyIncomeLeft: x.takeHome === null ? null : x.takeHome - (x.debtPaymentsOutsideSpending ?? 0), realReturn: x.realReturn, withdrawalRate: x.withdrawalRate, months });
  return { months, save, spend, extra: save.value == null || m.surplus.value == null ? null : save.value - m.surplus.value };
}

// ---------- Next 3 numbers (R071 to R073) ----------
const clone = v => JSON.parse(JSON.stringify(v));
const OPEN = new Set([null, 'Not sure', 'Not now', 'Will email']);
const ROUTE = { income: '#/my-money/income', debt: '#/my-money/debt', account: '#/my-money/assets', asset: '#/my-money/assets', bill: '#/spending/budget', spending: '#/spending/budget' };

// Fields still open, ranked by how much they move the FI date; anything worth under $100 a year goes to small wins.
export function next3(doc, ref, { now = new Date(), limit = 3 } = {}) {
  const m = metrics(doc, ref, { now });
  const g = gatesOf(doc.profile, doc.client);
  const live = visible(doc.records, g, ref);
  const cands = [];
  const add = c => cands.push(c);
  // The core numbers first: each one locks the FI date on its own.
  if (m.inputs.takeHome === null) add({ label: 'Take-home pay', why: 'Unlocks surplus, savings rate and the FI date', route: '#/my-money/income', quick: 'take-home', core: true });
  if (m.inputs.spending === null) add({ label: 'Monthly spending', why: 'Unlocks surplus and the FI number', route: '#/spending/budget', quick: 'spending', core: true });
  if (m.inputs.invested === null && g.areas.investments !== false) add({ label: 'Invested, all accounts', why: 'Where the FI date starts from', route: '#/my-money/assets', quick: 'invested', core: true });
  if (m.inputs.age === null) add({ label: 'Age', why: 'Coast FI and the Rule of 5 need it', route: '#/my-money/profile', quick: 'age', core: true });
  if (m.inputs.cash === null && g.areas.cash !== false) add({ label: 'Cash in checking and savings', why: 'Runway and the Rule of 5', route: '#/my-money/assets', quick: 'cash', core: true });
  // Then every open field on a record.
  for (const r of live) {
    const fields = r.kind === 'debt' ? ['balance', 'apr', 'payment'] : r.kind === 'account' ? ['balance'] : r.kind === 'asset' ? ['value'] : ['income', 'bill'].includes(r.kind) ? ['amount'] : [];
    for (const f of fields) {
      const st = statusOf(r, f);
      const v = f in r && f !== 'values' ? r[f] : r.values?.[f];
      if (!OPEN.has(st) && v != null) continue;
      if (r.kind === 'debt' && f === 'payment' && r.type === 'Credit card' && r.values.payChoice !== 'Custom') continue; // the minimum is worked out
      if (r.status === 'Not for me') continue;
      // Dollars a year at stake, for materiality (R073).
      const dollars = r.kind === 'bill' ? (r.amount ?? 0) * (r.per === 'year' ? 1 : 12)
        : r.kind === 'debt' ? f === 'apr' ? (r.values.balance ?? 0) * (r.values.apr ?? ref.typicalRates[r.type] ?? 0.1) : f === 'payment' ? (r.values.payment ?? 300) * 12 : (r.values.balance ?? 5000) * 0.1
          : r.kind === 'income' ? 12000 : (v ?? 1000) * 0.07;
      const word = { amount: r.kind === 'bill' ? '' : ' take-home', balance: ' balance', apr: ' APR', payment: ' payment', value: ' value' }[f];
      add({ label: `${r.name || r.values?.category || r.type || 'Item'}${word}`,
        recId: r.id, field: f, kind: f === 'apr' ? 'pct' : 'money', route: ROUTE[r.kind], status: st, dollars, guess: v });
    }
  }
  // Effect on the FI date: the number as it stands (or its guess) against the number at zero.
  const base = m.monthsToFi.value;
  for (const c of cands) {
    if (c.core) { c.effect = Infinity; continue; }
    if (c.dollars < 100) { c.small = true; continue; }
    if (base === null || c.guess == null) { c.effect = c.dollars / 1000; continue; }
    const d = clone(doc);
    const r = d.records.find(x => x.id === c.recId);
    if (c.field in r && c.field !== 'values') r[c.field] = 0; else r.values[c.field] = 0;
    const alt = metrics(d, ref, { now }).monthsToFi.value;
    c.effect = alt === null ? c.dollars / 1000 : Math.abs(alt - base);
    c.moves = alt === null ? null : Math.abs(alt - base);
  }
  const ranked = cands.filter(c => !c.small).sort((a, b) => (b.effect - a.effect) || (b.dollars ?? 0) - (a.dollars ?? 0));
  return { top: ranked.slice(0, limit), all: ranked, small: cands.filter(c => c.small) };
}

// ---------- Guide me: the session 1 curriculum (R076) ----------
export function agenda(doc, ref, { now = new Date() } = {}) {
  const m = metrics(doc, ref, { now });
  const g = gatesOf(doc.profile, doc.client);
  const debtsDone = g.areas.debt === false || m.inputs.debts.every(d => d.balance != null && d.apr != null);
  const custom = doc.session?.agenda;
  const steps = [
    { id: 'why', name: 'Why now', route: '#/my-money/profile', done: !!doc.profile?.whyNow },
    { id: 'debt', name: 'Debt and cash', route: g.areas.debt === false ? '#/my-money/assets' : '#/my-money/debt', done: debtsDone && m.inputs.cash !== null },
    { id: 'spend', name: 'Spending basics', route: '#/spending/budget', done: m.inputs.spending !== null && m.inputs.takeHome !== null },
    { id: 'fi', name: 'FI reveal', route: '#/plan/goals', done: m.monthsToFi.value !== null || !!m.monthsToFi.never },
  ];
  const list = custom?.length ? custom.map(c => steps.find(s => s.id === c.id) || { id: c.id, name: c.name, route: c.route || '#/home/live', done: !!c.done }) : steps;
  const current = list.find(s => !s.done) || null;
  return { steps: list, current };
}
