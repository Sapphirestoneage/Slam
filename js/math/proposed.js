// SPDX-License-Identifier: AGPL-3.0-only
// Current vs Proposed (overnight K, M76). Proposed is a copy of the file the coach edits: spending a month, the
// debt order, the retire-by age, whether the surplus is invested, extra to debt. Both sides give the FI date, the
// savings rate, net worth in 5 and 10 years, the next step and the next marker, each with how we got it, step by
// step with the inputs used. Make Proposed the plan writes the choices onto the real file in one undoable step.
import { metrics } from './metrics.js';
import { ladderOf } from './ladder.js';
import { payoffPlan } from './debt.js';
import { addMonths, ymOf, monthName } from '../month.js';
import { METHODS } from '../registry/debt.js';

const clone = x => JSON.parse(JSON.stringify(x));
export const PROPOSED_KEYS = ['spending', 'debtOrder', 'fiAge', 'investSurplus', 'extraDebt'];
export const proposedOf = doc => doc.program?.proposed ?? {};
export const hasProposal = doc => PROPOSED_KEYS.some(k => proposedOf(doc)[k] != null);

// The proposed file: the real one with the choices applied. Spending scales every Budget line (or sets the gut
// number) to the proposed total, so the shape of the budget stays.
export function proposedDoc(doc, ref, { now = new Date() } = {}) {
  const p = proposedOf(doc), out = clone(doc);
  const m = metrics(doc, ref, { now });
  if (p.spending != null && m.inputs.spending) {
    const k = p.spending / m.inputs.spending;
    if (m.inputs.lines?.length && doc.spending?.source === 'lines') { for (const r of out.records) if (r.kind === 'bill' && r.amount != null) r.amount = Math.round(r.amount * k * 100) / 100; }
    for (const r of out.records) if (r.kind === 'spending' && r.type === 'All in' && r.amount != null) r.amount = Math.round(p.spending);
  }
  if (p.debtOrder) out.settings = { ...(out.settings || {}), debtOrder: p.debtOrder };
  if (p.fiAge != null) out.assumptions = { ...(out.assumptions || {}), fiAge: p.fiAge };
  if (p.investSurplus != null) out.assumptions = { ...(out.assumptions || {}), investSurplus: !!p.investSurplus };
  return out;
}
// Net worth in t years: invested grows at the real return with what goes in each month; the rest of net worth
// (cash, things, minus debts) stays, plus the debt paid down by then on the payoff plan.
export function netWorthIn(m, years, { extraDebt = 0 } = {}) {
  const r = m.inputs.realReturn ?? 0, n = years * 12, monthly = m.investing?.monthly ?? 0, inv = m.inputs.invested ?? 0, nw = m.netWorth.value;
  if (nw == null) return { value: null, steps: ['Net worth needs a balance.'] };
  const g = (1 + r / 12) ** n, grown = inv * g + (r ? monthly * (g - 1) / (r / 12) : monthly * n);
  const ds = m.inputs.debts.filter(d => !d.inFull && d.balance > 0 && d.apr != null && d.payment != null);
  const plan = ds.length ? payoffPlan(ds, { order: m.inputs.debtOrder, extra: extraDebt, maxMonths: n }) : null;
  const left = plan ? (plan.path[Math.min(n, plan.path.length - 1)] || []).reduce((s, v) => s + v, 0) : 0;
  const debtNow = ds.reduce((s, d) => s + d.balance, 0), paid = Math.max(0, debtNow - left);
  const value = grown + (nw - inv) + paid;
  return { value, steps: [
    `Invested today ${money(inv)} grows at ${(r * 100).toFixed(1)}% real for ${years} years: ${money(inv * g)}.`,
    `${money(monthly)} a month going in, ${n} months, grows to ${money(grown - inv * g)}.`,
    `The rest of net worth (cash, things, minus debts) stays: ${money(nw - inv)}.`,
    `Debt paid down on the ${m.inputs.debtOrder} plan${extraDebt ? ` with ${money(extraDebt)} extra` : ''} by then: ${money(paid)} of ${money(debtNow)}.`,
    `Net worth in ${years} years: ${money(value)}.`] };
}
const money = v => (v == null ? '–' : `$${Math.round(v).toLocaleString('en-US')}`);
function side(doc, ref, { now, flags, extraDebt = 0 }) {
  const m = metrics(doc, ref, { now });
  const fi = m.monthsToFi.value;
  const L = ladderOf(doc, ref, { now, flags });
  const nw5 = netWorthIn(m, 5, { extraDebt }), nw10 = netWorthIn(m, 10, { extraDebt });
  const at = mo => (mo == null ? null : addMonths(ymOf(now), mo));
  return { m, fiMonths: fi, fiDate: fi == null ? null : at(Math.ceil(fi)),
    fiSteps: [`Invested ${money(m.inputs.invested)}; ${money(m.investing?.monthly)} a month going in at ${((m.inputs.realReturn ?? 0) * 100).toFixed(1)}% real.`, `FI number ${money(m.fiNumber.value)} (spending ${money(m.annualSpending)} a year over the ${((m.inputs.withdrawalRate ?? 0.04) * 100).toFixed(1)}% withdrawal rate).`, fi == null ? 'No FI date yet: something is missing.' : `Months until invested reaches the FI number: ${Math.ceil(fi)} (${monthName(at(Math.ceil(fi)))}).`],
    savingsRate: m.savingsRate.value, savingsSteps: [m.savingsRate.text ?? 'Savings rate: surplus plus after-tax savings over take-home.'],
    nw5: nw5.value, nw5Steps: nw5.steps, nw10: nw10.value, nw10Steps: nw10.steps,
    nextStep: L.next ? { name: L.next.name, date: L.next.date, pct: L.next.pct } : null, nextMarker: L.nextMarker ? { name: L.nextMarker.name, date: L.nextMarker.date } : null,
    ladderSteps: [L.next ? `Next step ${L.next.name}: ${Math.round(L.next.pct * 100)}% there; its gap over what goes to savings a month gives ${L.next.date ? monthName(L.next.date) : 'no date'}.` : 'Every step done.', L.nextMarker ? `Next marker ${L.nextMarker.name}: the months-to math on invested gives ${L.nextMarker.date ? monthName(L.nextMarker.date) : 'no date'}.` : 'Every marker reached.'],
    spending: m.inputs.spending, debtOrder: m.inputs.debtOrder, fiAge: doc.assumptions?.fiAge ?? m.inputs.retireAge ?? null, investSurplus: m.investing?.investSurplus ?? true };
}
// Both sides and the differences. A difference in months is also given in days (FI days) for the time view.
export function compareOf(doc, ref, { now = new Date(), flags = [] } = {}) {
  const p = proposedOf(doc);
  const current = side(doc, ref, { now, flags });
  const proposed = side(proposedDoc(doc, ref, { now }), ref, { now, flags, extraDebt: p.extraDebt ?? 0 });
  const d = (a, b) => (a == null || b == null ? null : b - a);
  const rows = [
    { key: 'fiDate', label: 'FI date', unit: 'month', current: current.fiDate, proposed: proposed.fiDate, diffMonths: d(current.fiMonths, proposed.fiMonths), how: { current: current.fiSteps, proposed: proposed.fiSteps } },
    { key: 'savingsRate', label: 'Savings rate', unit: 'pct', current: current.savingsRate, proposed: proposed.savingsRate, diff: d(current.savingsRate, proposed.savingsRate), how: { current: current.savingsSteps, proposed: proposed.savingsSteps } },
    { key: 'nw5', label: 'Net worth in 5 years', unit: 'money', current: current.nw5, proposed: proposed.nw5, diff: d(current.nw5, proposed.nw5), how: { current: current.nw5Steps, proposed: proposed.nw5Steps } },
    { key: 'nw10', label: 'Net worth in 10 years', unit: 'money', current: current.nw10, proposed: proposed.nw10, diff: d(current.nw10, proposed.nw10), how: { current: current.nw10Steps, proposed: proposed.nw10Steps } },
    { key: 'nextStep', label: 'Next step', unit: 'text', current: current.nextStep ? `${current.nextStep.name}${current.nextStep.date ? `, ${monthName(current.nextStep.date, 'short')}` : ''}` : 'Every step done', proposed: proposed.nextStep ? `${proposed.nextStep.name}${proposed.nextStep.date ? `, ${monthName(proposed.nextStep.date, 'short')}` : ''}` : 'Every step done', how: { current: current.ladderSteps, proposed: proposed.ladderSteps } },
    { key: 'nextMarker', label: 'Next marker', unit: 'text', current: current.nextMarker ? `${current.nextMarker.name}${current.nextMarker.date ? `, ${monthName(current.nextMarker.date, 'short')}` : ''}` : 'Every marker reached', proposed: proposed.nextMarker ? `${proposed.nextMarker.name}${proposed.nextMarker.date ? `, ${monthName(proposed.nextMarker.date, 'short')}` : ''}` : 'Every marker reached', how: { current: current.ladderSteps, proposed: proposed.ladderSteps } },
  ];
  const choices = [
    { key: 'spending', label: 'Spending a month', unit: 'money', current: current.spending, proposed: p.spending ?? current.spending },
    { key: 'debtOrder', label: 'Debt order', unit: 'text', current: METHODS.find(x => x.id === current.debtOrder)?.name ?? current.debtOrder, proposed: METHODS.find(x => x.id === (p.debtOrder ?? current.debtOrder))?.name ?? (p.debtOrder ?? current.debtOrder) },
    { key: 'fiAge', label: 'Retire by (age)', unit: 'number', current: current.fiAge, proposed: p.fiAge ?? current.fiAge },
    { key: 'investSurplus', label: 'Surplus invested', unit: 'text', current: current.investSurplus ? 'Yes' : 'No', proposed: (p.investSurplus ?? current.investSurplus) ? 'Yes' : 'No' },
    { key: 'extraDebt', label: 'Extra to debt a month', unit: 'money', current: 0, proposed: p.extraDebt ?? 0 },
  ];
  return { rows, choices, has: hasProposal(doc), current, proposed };
}
export function setProposed(store, patch) { store.setIn('program', ['proposed'], { ...proposedOf(store.doc), ...patch }, 'Proposed'); }
export function clearProposed(store) { store.setIn('program', ['proposed'], undefined, 'Proposed cleared'); }
// Make Proposed the plan: one transaction, undoable. Spending scales the lines (or sets the gut number) as the copy did.
export function makeProposedThePlan(store, ref, { now = new Date() } = {}) {
  const p = proposedOf(store.doc);
  const copy = proposedDoc(store.doc, ref, { now });
  store.transaction('Make Proposed the plan', () => {
    if (p.spending != null) for (const r of copy.records) { const was = store.doc.records.find(x => x.id === r.id); if (was && ['bill', 'spending'].includes(r.kind) && was.amount !== r.amount) store.update(r.id, { amount: r.amount }); }
    if (p.debtOrder) store.setDoc('settings', { debtOrder: p.debtOrder });
    if (p.fiAge != null) store.setDoc('assumptions', { fiAge: p.fiAge });
    if (p.investSurplus != null) store.setDoc('assumptions', { investSurplus: !!p.investSurplus });
    store.setIn('program', ['proposed'], undefined);
  });
}
