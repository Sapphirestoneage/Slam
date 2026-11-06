// SPDX-License-Identifier: AGPL-3.0-only
// Current vs Proposed (overnight K, M76). Proposed is a copy of the file the coach edits: spending a month, the
// debt order, the retire-by age, whether the surplus is invested, extra to debt. Both sides give the FI date, the
// savings rate, net worth in 5 and 10 years, the next step and the next marker, each with how we got it, step by
// step with the inputs used. Make Proposed the plan writes the choices onto the real file in one undoable step.
import { metrics } from './metrics.js';
import { ladderOf } from './ladder.js';
import { payoffPlan } from './debt.js';
import { waitWords } from './fi.js';
import { addMonths, ymOf, monthName } from '../month.js';
import { METHODS } from '../registry/debt.js';
import { blankRecord } from '../records.js';
import { ownPlanPerson } from '../registry/couples.js';

// Batch 12 (Use the gap): extra income on the proposed copy is one take-home row a month.
export const extraIncomeRecord = amount => ({ ...blankRecord('income', 'Side hustle'), id: 'proposed-extra-income', name: 'Extra shifts or a side gig', amount, per: 'month', status: 'Roughly', values: { basis: 'Take-home', payFrequency: 'month', incomeType: 'Side hustle' } });

const clone = x => JSON.parse(JSON.stringify(x));
export const PROPOSED_KEYS = ['spending', 'debtOrder', 'fiAge', 'investSurplus', 'extraDebt', 'extraIncome']; // extraIncome: batch 12, Use the gap
export const proposedOf = doc => doc.program?.proposed ?? {};
export const hasProposal = doc => PROPOSED_KEYS.some(k => proposedOf(doc)[k] != null);

// The proposed file: the real one with the choices applied. Spending scales every Budget line (or sets the gut
// number) to the proposed total, so the shape of the budget stays.
export function proposedDoc(doc, ref, { now = new Date() } = {}) {
  const p = proposedOf(doc), out = clone(doc);
  const m = metrics(doc, ref, { now, person: ownPlanPerson(doc) }); // batch 33: the spending scale is against the same person's spending the Current side shows
  if (p.spending != null && m.inputs.spending) {
    const k = p.spending / m.inputs.spending;
    if (m.inputs.lines?.length && doc.spending?.source === 'lines') { for (const r of out.records) if (r.kind === 'bill' && r.amount != null) r.amount = Math.round(r.amount * k * 100) / 100; }
    for (const r of out.records) if (r.kind === 'spending' && r.type === 'All in' && r.amount != null) r.amount = Math.round(p.spending);
  }
  if (p.debtOrder) out.settings = { ...(out.settings || {}), debtOrder: p.debtOrder };
  if (p.fiAge != null) out.assumptions = { ...(out.assumptions || {}), fiAge: p.fiAge };
  if (p.investSurplus != null) out.assumptions = { ...(out.assumptions || {}), investSurplus: !!p.investSurplus };
  if (p.extraDebt) out.settings = { ...(out.settings || {}), debtExtra: p.extraDebt }; // the copy only: the one debt plan carries it (batch 11)
  if (p.extraIncome) out.records.push(extraIncomeRecord(p.extraIncome));
  return out;
}
// Net worth in t years: invested grows at the real return with what goes in each month; the rest of net worth
// (cash, things, minus debts) stays, plus the debt paid down by then on the payoff plan.
// Batch 33 (QUESTIONS 289): a monthly shortfall is borrowed on the card: the client's highest card APR, else the
// typical card APR (Reference data). Owed after n months: the shortfall each month, growing at APR / 12 a month.
// Batch 37 (QUESTIONS 320): the borrowing stops at the room on the cards: each card's limit less its balance where
// limits are typed, else the typical limit at the client's age (Reference data, Experian) less what the cards owe.
// Past that point the month cannot be covered, so net worth from then on is not given as a number.
export function typicalCardLimit(ref, age) {
  const T = ref?.typicalCardLimit;
  if (!T) return null;
  let v = T.all ?? null;
  if (age != null) for (const [from, limit] of T.byAge || []) if (age >= from) v = limit;
  return v;
}
export function shortfallOf(m, ref) {
  const short = m.surplus?.value != null && m.surplus.value < -0.5 ? -m.surplus.value : 0;
  const all = (m.inputs.debts || []).filter(d => d.type === 'Credit card');
  const cards = all.filter(d => d.apr != null);
  const apr = cards.length ? Math.max(...cards.map(d => d.apr)) : ref?.typicalRates?.['Credit card'] ?? null;
  const typed = all.filter(d => d.limit != null);
  const limit = typed.length ? typed.reduce((s, d) => s + d.limit, 0) : typicalCardLimit(ref, m.inputs.age);
  const room = typed.length ? typed.reduce((s, d) => s + Math.max(0, d.limit - (d.balance ?? 0)), 0)
    : limit == null ? null : Math.max(0, limit - all.reduce((s, d) => s + (d.balance ?? 0), 0));
  return { monthly: short, apr, from: cards.length ? 'card' : 'typical', room, limit, roomFrom: typed.length ? 'limits' : 'typical' };
}
export const shortfallOwed = (monthly, apr, months) => (!monthly || !months ? 0 : !apr ? monthly * months : monthly * ((1 + apr / 12) ** months - 1) / (apr / 12));
// What the card owes month by month: the whole gap through the first k months, then `late` a month; full: the first
// month the owed amount would pass the room (null when it never does within n months).
export function shortfallPath(shortfall, k, late, n) {
  const i = (shortfall?.apr ?? 0) / 12;
  let owed = 0, full = null;
  if (!shortfall?.monthly) return { owed, full };
  for (let t = 1; t <= n; t++) {
    const next = owed * (1 + i) + (t <= k ? shortfall.monthly : late);
    if (shortfall.room != null && next > shortfall.room + 0.5) { full = t; owed = shortfall.room; break; }
    owed = next;
  }
  return { owed, full };
}
export function netWorthIn(m, years, { extraDebt = 0, shortfall = null, now = null } = {}) {
  const r = m.inputs.realReturn ?? 0, n = years * 12, monthly = m.investing?.monthly ?? 0, inv = m.inputs.invested ?? 0, nw = m.netWorth.value;
  if (nw == null) return { value: null, steps: ['Net worth needs a balance.'] };
  // The same monthly growth as the FI date (M53): (1 + r)^(1/12), with the debt-first months first (batch 11).
  const gm = (1 + r) ** (1 / 12), g = gm ** n, b = m.investing?.before, k = b ? Math.min(n, b.months) : 0;
  const fv = (P, t) => (r ? P * (gm ** t - 1) / (gm - 1) : P * t);
  const going = P => (shortfall?.monthly ? Math.max(0, P) : P); // batch 33: a short month invests nothing; the card carries it
  const grown = inv * g + fv(going(b ? b.monthly : monthly), k) * gm ** (n - k) + fv(going(monthly), n - k);
  const ds = m.inputs.debts.filter(d => !d.inFull && d.balance > 0 && d.apr != null && d.payment != null);
  const plan = ds.length ? (m.debtPlan && !extraDebt ? m.debtPlan : payoffPlan(ds, { order: m.inputs.debtOrder, extra: extraDebt, maxMonths: n })) : null; // the one debt plan (batch 11)
  const left = plan ? (plan.path[Math.min(n, plan.path.length - 1)] || []).reduce((s, v) => s + v, 0) : 0;
  const debtNow = ds.reduce((s, d) => s + d.balance, 0), paid = Math.max(0, debtNow - left);
  // The shortfall is borrowed while it lasts: the whole gap through the debt-first months, then whatever going in is
  // still below zero once the freed payments come back (none, when they cover it).
  const late = monthly < 0 ? -monthly : k ? 0 : shortfall?.monthly ?? 0;
  const { owed, full } = shortfallPath(shortfall, k, late, n);
  const when = t => (now ? monthName(addMonths(ymOf(now), t), 'short') : `month ${t}`);
  const roomWords = s => `${money(s.room)} of room on the cards (${s.roomFrom === 'limits' ? 'the limits typed less what they owe' : `a typical limit at this age, ${money(s.limit)}, less what they owe`})`;
  const card = owed || full ? `The ${money(shortfall.monthly)} a month shortfall goes on the card at ${(shortfall.apr * 100).toFixed(1)}%${shortfall.from === 'card' ? ' (the highest card APR)' : ' (a typical card APR)'}${k < n && late !== shortfall.monthly ? `, ${late ? `${money(late)} a month` : 'nothing'} once the freed payments come back` : ''}` : null;
  const value = full ? null : grown + (nw - inv) + paid - owed;
  return { value, owed, full, steps: [
    `Invested today ${money(inv)} grows at ${(r * 100).toFixed(1)}% real for ${years} years: ${money(inv * g)}.`,
    k ? `${money(b.monthly)} a month going in for the ${k} months ${waitWords(b)}, then ${money(monthly)} a month: ${money(grown - inv * g)}.` : `${money(monthly)} a month going in, ${n} months, grows to ${money(grown - inv * g)}.`,
    `The rest of net worth (cash, things, minus debts) stays: ${money(nw - inv)}.`,
    `Debt paid down on the ${m.inputs.debtOrder} plan${extraDebt || m.inputs.debtExtra ? ` with ${money(extraDebt || m.inputs.debtExtra)} extra` : ''}${m.debtRule?.on ? ', the surplus on heavy debt first' : ''} by then: ${money(paid)} of ${money(debtNow)}.`,
    ...(full ? [`${card}, until it reaches the ${roomWords(shortfall)} in ${when(full)}.`, `From ${when(full)} the month cannot be covered: there is no card room left to carry it, so there is no net worth number for ${years} years.`]
      : owed ? [`${card}: ${money(owed)} owed by then${shortfall.room != null ? `, within the ${roomWords(shortfall)}` : ''}.`] : []),
    ...(full ? [] : [`Net worth in ${years} years: ${money(value)}.`])] };
}
const money = v => (v == null ? '–' : `${Math.round(v) < 0 ? '−' : ''}$${Math.abs(Math.round(v)).toLocaleString('en-US')}`); // batch 33: −$65, not $-65
function side(doc, ref, { now, flags, extraDebt = 0 }) {
  const m = metrics(doc, ref, { now, person: ownPlanPerson(doc) }); // batch 20: a couple with no combined totals compares one person's plan, as Home and Plan show it
  const fi = m.monthsToFi.value;
  const L = ladderOf(doc, ref, { now, flags });
  const shortfall = shortfallOf(m, ref); // batch 33 (Q289): a short month is borrowed, so a plan that closes the gap shows the difference
  const nw5 = netWorthIn(m, 5, { shortfall, now }), nw10 = netWorthIn(m, 10, { shortfall, now }); // the extra is on the copy's debt plan (proposedDoc)
  const at = mo => (mo == null ? null : addMonths(ymOf(now), mo));
  const full = nw10.full ?? nw5.full ?? null; // batch 37 (Q320): the month the card room runs out, if it does in 10 years
  return { m, shortfall: { ...shortfall, full, fullYm: full == null ? null : at(full) }, fiMonths: fi, fiDate: fi == null ? null : at(Math.ceil(fi)),
    fiSteps: [`Invested ${money(m.inputs.invested)}; ${m.investing?.before ? `${money(m.investing.before.monthly)} a month going in for the ${m.investing.before.months} months ${waitWords(m.investing.before)}, then ` : ''}${money(m.investing?.monthly)} a month going in at ${((m.inputs.realReturn ?? 0) * 100).toFixed(1)}% real.`, `FI number ${money(m.fiNumber.value)} (spending ${money(m.annualSpending)} a year over the ${((m.inputs.withdrawalRate ?? 0.04) * 100).toFixed(1)}% withdrawal rate).`, fi == null ? 'No FI date yet: something is missing.' : `Months until invested reaches the FI number: ${Math.ceil(fi)} (${monthName(at(Math.ceil(fi)))}).`],
    savingsRate: m.savingsRate.value, savingsSteps: [m.savingsRate.text ?? 'Savings rate: surplus plus after-tax savings over take-home.'],
    nw5: nw5.value, nw5Steps: nw5.steps, nw5Full: nw5.full ? at(nw5.full) : null, nw10: nw10.value, nw10Steps: nw10.steps, nw10Full: nw10.full ? at(nw10.full) : null,
    nextStep: L.next ? { name: L.next.name, date: L.next.date, pct: L.next.pct } : null, nextMarker: L.nextMarker ? { name: L.nextMarker.name, date: L.nextMarker.date } : null,
    ladderSteps: [L.next ? `Next step ${L.next.name}: ${Math.round(L.next.pct * 100)}% there; its gap over what goes to savings a month gives ${L.next.date ? monthName(L.next.date) : 'no date'}.` : 'Every step done.', L.nextMarker ? `Next marker ${L.nextMarker.name}: the months-to math on invested gives ${L.nextMarker.date ? monthName(L.nextMarker.date) : 'no date'}.` : 'Every marker reached.'],
    debtMonths: m.debtPlan?.debts.length ? m.debtPlan.months : null, debtFree: m.debtPlan?.debts.length && m.debtPlan.months != null ? at(m.debtPlan.months) : null, debtSteps: [m.debtPlan?.text ?? 'No debt with a balance, an APR and a payment.'],
    spending: m.inputs.spending, debtOrder: m.inputs.debtOrder, fiAge: doc.assumptions?.fiAge ?? m.inputs.retireAge ?? null, investSurplus: m.investing?.investSurplus ?? true };
}
// Both sides and the differences. A difference in months is also given in days (FI days) for the time view.
export function compareOf(doc, ref, { now = new Date(), flags = [] } = {}) {
  const p = proposedOf(doc);
  const current = side(doc, ref, { now, flags });
  const proposed = side(proposedDoc(doc, ref, { now }), ref, { now, flags });
  const d = (a, b) => (a == null || b == null ? null : b - a);
  const rows = [
    { key: 'fiDate', label: 'FI date', unit: 'month', current: current.fiDate, proposed: proposed.fiDate, diffMonths: d(current.fiMonths, proposed.fiMonths), how: { current: current.fiSteps, proposed: proposed.fiSteps } },
    { key: 'savingsRate', label: 'Savings rate', unit: 'pct', current: current.savingsRate, proposed: proposed.savingsRate, diff: d(current.savingsRate, proposed.savingsRate), how: { current: current.savingsSteps, proposed: proposed.savingsSteps } },
    { key: 'nw5', label: 'Net worth in 5 years', unit: 'money', current: current.nw5, proposed: proposed.nw5, full: { current: current.nw5Full, proposed: proposed.nw5Full }, diff: d(current.nw5, proposed.nw5), how: { current: current.nw5Steps, proposed: proposed.nw5Steps } },
    { key: 'nw10', label: 'Net worth in 10 years', unit: 'money', current: current.nw10, proposed: proposed.nw10, full: { current: current.nw10Full, proposed: proposed.nw10Full }, diff: d(current.nw10, proposed.nw10), how: { current: current.nw10Steps, proposed: proposed.nw10Steps } },
    { key: 'debtFree', label: 'Debt free', unit: 'month', current: current.debtFree, proposed: proposed.debtFree, diffMonths: d(current.debtMonths, proposed.debtMonths), how: { current: current.debtSteps, proposed: proposed.debtSteps } },
    { key: 'nextStep', label: 'Next step', unit: 'text', current: current.nextStep ? `${current.nextStep.name}${current.nextStep.date ? `, ${monthName(current.nextStep.date, 'short')}` : ''}` : 'Every step done', proposed: proposed.nextStep ? `${proposed.nextStep.name}${proposed.nextStep.date ? `, ${monthName(proposed.nextStep.date, 'short')}` : ''}` : 'Every step done', how: { current: current.ladderSteps, proposed: proposed.ladderSteps } },
    { key: 'nextMarker', label: 'Next marker', unit: 'text', current: current.nextMarker ? `${current.nextMarker.name}${current.nextMarker.date ? `, ${monthName(current.nextMarker.date, 'short')}` : ''}` : 'Every marker reached', proposed: proposed.nextMarker ? `${proposed.nextMarker.name}${proposed.nextMarker.date ? `, ${monthName(proposed.nextMarker.date, 'short')}` : ''}` : 'Every marker reached', how: { current: current.ladderSteps, proposed: proposed.ladderSteps } },
  ];
  const choices = [
    { key: 'spending', label: 'Spending a month', unit: 'money', current: current.spending, proposed: p.spending ?? current.spending },
    { key: 'debtOrder', label: 'Debt order', unit: 'text', current: METHODS.find(x => x.id === current.debtOrder)?.name ?? current.debtOrder, proposed: METHODS.find(x => x.id === (p.debtOrder ?? current.debtOrder))?.name ?? (p.debtOrder ?? current.debtOrder) },
    { key: 'fiAge', label: 'Retire by (age)', unit: 'number', current: current.fiAge, proposed: p.fiAge ?? current.fiAge },
    { key: 'investSurplus', label: 'Surplus invested', unit: 'text', current: current.investSurplus ? 'Yes' : 'No', proposed: (p.investSurplus ?? current.investSurplus) ? 'Yes' : 'No' },
    { key: 'extraDebt', label: 'Extra to debt a month', unit: 'money', current: 0, proposed: p.extraDebt ?? 0 },
    { key: 'extraIncome', label: 'Extra income a month', unit: 'money', current: 0, proposed: p.extraIncome ?? 0 },
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
    if (p.extraIncome) { const { values, ...r } = extraIncomeRecord(p.extraIncome); store.add('income', { name: r.name, amount: r.amount, per: r.per, status: r.status, values }, { type: r.type }); }
    store.setIn('program', ['proposed'], undefined);
  });
}
