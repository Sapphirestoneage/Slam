// SPDX-License-Identifier: AGPL-3.0-only
// Batch 29: the true cost of debt (Eli's Level 15 Borrow design, Oct 11 to 12 2026; M9T, M9L). Three readings, all
// from the client's own plan:
// - trueCostOf (M9T): for every debt, the interest still to pay on the one plan (M34) and in today's dollars, the
//   months of FI it costs (the FI date as it is, and with that debt gone today, its payment invested from now on the
//   same FOO flow), the rate after tax where interest is deductible, and when it is still owed at FI, what its payment
//   adds to the FI number (payments counted as spending, the FIRE view).
// - loanOffers (M9L): a new loan or a different one, up to three offers side by side and paying cash instead. Each
//   offer is added to a copy of the file (never saved) and the plan runs again: the payment, the total, the FI months
//   it costs, the month the debt-free date moves to, the free money a month. Paying cash takes the amount from cash
//   (the largest account first) and says what that does to big e and the FI date.
// - boughtOf (M9L): for school or business borrowing, the extra pay a year it is expected to bring, the year it is
//   paid back and the FI date with both. Never a verdict.
// Pure: no DOM.
import { metrics, flowOf } from './metrics.js';
import { layersOf } from './layers.js';
import { householdRates } from './income.js';
import { isHeavyDebt } from './debt.js';
import { interestDeduction } from './studentloan.js';
import { fmt } from './result.js';
import { gutRecord, addMonths, ymOf, monthName } from '../month.js';
import { setAsideOf } from '../payday.js';

const money = fmt.money;
const clone = x => (typeof structuredClone === 'function' ? structuredClone(x) : JSON.parse(JSON.stringify(x)));
const mon = (now, n) => (n == null ? null : monthName(addMonths(ymOf(now), n), 'short'));
const months = n => `${Math.abs(n)} ${Math.abs(n) === 1 ? 'month' : 'months'}`;
const fiOf = m => (m.monthsToFi.never ? null : m.monthsToFi.value);
const pct2 = v => `${(Math.round(v * 10000) / 100).toString()}%`; // 3.25%, 4.94%, 22%

// What each kind of borrowing is in the plan: its Debt type and the usual term.
export const LOAN_KINDS = {
  car: { type: 'Car loan', name: 'A new car loan', years: 5 },
  home: { type: 'Mortgage', name: 'A new home loan', years: 30 },
  school: { type: 'Student loan', name: 'A new school loan', years: 10 },
  business: { type: 'Business', name: 'A new business loan', years: 7 },
  stuff: { type: 'Personal loan', name: 'A loan for stuff', years: 2 },
  other: { type: 'Personal loan', name: 'A new loan', years: 3 },
};
export const MAX_OFFERS = 3;

// A level payment over months; and the schedule it makes: total paid, interest, interest in today's dollars.
export function loanPayment(amount, apr, n) {
  if (!(amount > 0) || !(n > 0)) return null;
  const r = (apr ?? 0) / 12;
  return r === 0 ? amount / n : amount * r / (1 - (1 + r) ** -n);
}
export function loanSchedule({ amount, apr, payment, n, inflation = 0 }) {
  const r = (apr ?? 0) / 12;
  let b = amount, paid = 0, interest = 0, interestToday = 0, k = 0;
  while (b > 0.005 && k < n + 1) {
    k += 1;
    const i = b * r, pay = Math.min(payment, b + i);
    interest += i; interestToday += i / (1 + inflation) ** (k / 12); paid += pay; b = b + i - pay;
  }
  return { months: k, paid, interest, interestToday };
}

// Is a debt's payment inside spending (a gut number that includes debt payments, or the Budget lines, where each
// payment is a line From Debt)? Then taking it away, or adding one, moves spending too.
const inSpending = x => x.spendingSource === 'lines' || (x.spendingSource === 'gut' && x.debtPaymentsOutsideSpending === 0 && x.spending != null);
// Retirement spending is held where the plan has it, unless the debt is still there at FI: then its payment is in
// retirement spending too (the FIRE view: a payment is spending), and the FI number moves with it.
function holdRetirement(copy, base, delta) {
  if (copy.assumptions?.retirementSpending != null || base.inputs.retirementSpending == null) return;
  copy.assumptions = { ...(copy.assumptions || {}), retirementSpending: base.inputs.retirementSpending + delta };
}
const record = (id, kind, type, name, values) => ({ id, kind, type, name, amount: null, per: 'month', owner: null, status: null, fieldStatus: {}, paidWith: null, linkedTo: null, source: 'manual', covers: null, values, notes: null, privateNote: null, stress: null, createdAt: null, updatedAt: null });

// The file with one debt gone today: its payment stays in the household (invested on the FOO flow from now).
export function withoutDebt(doc, base, id) {
  const copy = clone(doc), x = base.inputs;
  const d = x.debts.find(q => q.id === id);
  copy.records = copy.records.filter(r => r.id !== id);
  if (!d) return copy;
  const g = gutRecord(copy), inside = inSpending(x);
  if (inside && x.spendingSource === 'gut' && g) g.amount = Math.max(0, (g.amount ?? 0) - (d.payment ?? 0));
  const fi = fiOf(base), past = fi != null && (d.planMonths == null || d.planMonths > fi);
  holdRetirement(copy, base, inside && past ? -(d.payment ?? 0) : 0);
  return copy;
}
// The file with a new loan in: { type, name, balance, apr, payment, n }.
export function withLoan(doc, base, loan, now = new Date()) {
  const copy = clone(doc), x = base.inputs;
  // A loan under the heavy line ends on its own: when it is paid off its payment goes back to the surplus (a known
  // change), it does not roll into the next debt. Heavy debt keeps the plan's own rule (freed heavy payments roll, then go in).
  const heavy = isHeavyDebt({ type: loan.type, balance: loan.balance, apr: loan.apr });
  copy.records.push(record('truecost-loan', 'debt', loan.type, loan.name, { balance: loan.balance, apr: loan.apr, payment: loan.payment, ...(heavy ? {} : { noRoll: true }) }));
  const g = gutRecord(copy), inside = inSpending(x);
  if (inside && x.spendingSource === 'gut' && g) g.amount = (g.amount ?? 0) + loan.payment;
  const fi = fiOf(base), past = fi != null && loan.n > fi;
  holdRetirement(copy, base, inside && past ? loan.payment : 0);
  if (!heavy) copy.whatIf = { changes: [...(copy.whatIf?.changes || []), { id: 'truecost-loan-ends', kind: 'ends', ym: addMonths(ymOf(now), loan.n), at: loan.n, surplus: loan.payment, spending: inside ? -loan.payment : 0, name: `${loan.name} paid off` }] };
  return copy;
}
// The file with amount paid out of cash, the largest account first. short: what cash could not cover.
export function withCash(doc, amount) {
  const copy = clone(doc);
  let left = amount;
  const cash = copy.records.filter(r => r.kind === 'account' && r.values?.group === 'cash' && (r.values.balance ?? 0) > 0).sort((a, b) => b.values.balance - a.values.balance);
  for (const r of cash) { if (left <= 0) break; const take = Math.min(left, r.values.balance); r.values.balance -= take; left -= take; }
  return { copy, short: Math.max(0, left) };
}

// The rate after tax, where interest comes off taxable income. Student loan: the interest deduction (up to $2,500,
// phased out by income). A home loan: only when itemizing beats the standard deduction (the interest on up to $750,000
// of home debt plus state and local tax up to the cap). A rental's loan or a business loan: a cost taken off that income.
export function afterTaxOf(doc, ref, m, d) {
  const x = m.inputs, rec = doc.records.find(r => r.id === d.id) ?? null;
  const asset = rec?.linkedTo ? doc.records.find(r => r.id === rec.linkedTo) : null;
  const rental = d.type === 'Mortgage' && asset?.type === 'Other property';
  const kind = d.type === 'Student loan' ? 'student' : rental ? 'rental' : d.type === 'Mortgage' ? 'home' : d.type === 'Business' || rec?.values?.use === 'Business' ? 'business' : null;
  if (!kind || !(d.balance > 0) || d.apr == null) return null;
  const rates = householdRates(x.householdTax, ref);
  if (rates.value == null) return { kind, rate: null, needs: ['gross pay'], text: 'Needs gross pay on Income to work out the tax.' };
  const fed = rates.federalMarginal ?? 0, both = fed + (rates.stateMarginal ?? 0);
  const interest = d.balance * d.apr;
  const at = r => pct2(r);
  if (kind === 'student') {
    const magi = (x.grossAllAnnual ?? x.grossAnnual ?? 0) - (m.pretaxSaving ?? 0) * 12;
    const all = x.debts.filter(q => q.type === 'Student loan' && (q.balance ?? 0) > 0).reduce((s, q) => s + q.balance * (q.apr ?? 0), 0);
    const ded = interestDeduction({ interest: all, magi, filingStatus: x.filingStatus }, ref) * (all ? interest / all : 0);
    const saving = ded * both, rate = d.apr - saving / d.balance;
    return { kind, rate, saving, deductible: ded, text: ded > 0 ? `About ${at(rate)} after tax: ${money(ded)} of its ${money(interest)} interest a year comes off taxable income (the student loan interest deduction), about ${money(saving)} less tax at your ${at(both)} rate.` : `No tax break here: the student loan interest deduction phases out at your income${x.filingStatus === 'Married separately' ? ' (or filing separately)' : ''}.` };
  }
  if (kind === 'rental' || kind === 'business') {
    const rate = d.apr * (1 - both);
    return { kind, rate, saving: interest * both, text: `About ${at(rate)} after tax: the interest is a cost of the ${kind === 'rental' ? 'rental' : 'business'}, taken off its income at your ${at(both)} rate.` };
  }
  const homeLoans = x.debts.filter(q => q.type === 'Mortgage' && (q.balance ?? 0) > 0 && doc.records.find(r => r.id === (doc.records.find(z => z.id === q.id)?.linkedTo))?.type !== 'Other property');
  const homeBal = homeLoans.reduce((s, q) => s + q.balance, 0);
  const share = homeBal > ref.tax.mortgageDebtLimit ? ref.tax.mortgageDebtLimit / homeBal : 1;
  const homeInterest = homeLoans.reduce((s, q) => s + q.balance * (q.apr ?? 0), 0) * share;
  const propertyTax = (asset?.values?.propertyTax ?? 0) * 12;
  const salt = Math.min(ref.tax.saltCap, (x.householdTax?.total?.state ?? 0) + (x.householdTax?.total?.local ?? 0) + propertyTax);
  const std = ref.tax.standardDeduction[x.filingStatus === 'Married jointly' ? 'joint' : 'single'];
  const over = Math.max(0, homeInterest + salt - std);
  const mine = homeInterest ? interest * share / homeInterest : 0;
  const saving = Math.min(interest * share, over * mine) * fed, rate = d.apr - saving / d.balance;
  return { kind, rate, saving, itemized: homeInterest + salt, standard: std,
    text: over > 0 ? `About ${at(rate)} after tax: itemizing (${money(homeInterest)} of home loan interest plus ${money(salt)} of state and local tax) beats the ${money(std)} standard deduction by ${money(over)}, saving about ${money(saving)} a year at your ${at(fed)} federal rate.`
      : `Deductible only if you itemize: ${money(homeInterest)} of home loan interest a year plus ${money(salt)} of state and local tax is under the ${money(std)} standard deduction, so it saves no tax today (${at(d.apr)}).` };
}

// M9T: the true cost of each debt, one line each.
export function trueCostOf(doc, ref, { now = new Date(), m = null } = {}) {
  const base = m ?? metrics(doc, ref, { now }), x = base.inputs, plan = base.debtPlan;
  const fi0 = fiOf(base), wr = x.withdrawalRate, inside = inSpending(x);
  const lines = plan.debts.map(p => {
    const d = x.debts.find(q => q.id === p.id) ?? p;
    const without = metrics(withoutDebt(doc, base, p.id), ref, { now });
    const fi1 = fiOf(without);
    const cost = fi0 != null && fi1 != null ? fi0 - fi1 : null;
    const forgiven = !!p.forgiven, endsAt = p.paidOffMonth;
    const past = fi0 != null && (endsAt == null || endsAt > fi0);
    const fiAdd = past && inside && wr ? (d.payment ?? 0) * 12 / wr : null;
    const tax = afterTaxOf(doc, ref, base, d);
    const fiWords = fi0 == null ? 'The FI date is not on this path yet.'
      : fi1 == null ? `FI ${mon(now, fi0)} with it.`
        : cost === 0 ? `Its payments do not move the FI date (${mon(now, fi0)}).`
          : `Its payments push FI back ${months(cost)}: FI ${mon(now, fi0)} with it, ${mon(now, fi1)} without it.`;
    const head = forgiven && p.forgivenAmount > 0
      ? `${money((d.payment ?? 0) * (p.forgiveAt ?? endsAt ?? 0))} still to pay over ${p.forgiveAt ?? endsAt} payments to forgiveness (PSLF, ${mon(now, endsAt)}), then ${money(p.forgivenAmount)} is forgiven, tax-free. Paying more than the plan asks does not shorten it.`
      : `${money(p.interest)} of interest still to pay (${money(p.interestToday)} in today's dollars), gone ${endsAt == null ? 'never at this payment' : mon(now, endsAt)}.`;
    const fireWords = fiAdd ? `Still owed at FI: its ${money(d.payment)} a month is in your spending then too, ${money(fiAdd)} of the FI number.` : null;
    return { id: p.id, name: p.name, type: p.type, balance: p.balance, apr: p.apr, aprGuess: p.aprGuess, interest: p.interest, interestToday: p.interestToday, endsAt, endsYm: endsAt == null ? null : addMonths(ymOf(now), endsAt),
      forgiven, forgivenAmount: p.forgivenAmount, fi: { with: fi0, without: fi1, cost }, fiAdd, afterTax: tax, text: [head, fiWords, tax?.text ?? null, fireWords].filter(Boolean).join(' ') };
  });
  const skipped = plan.skipped ?? [];
  const totalToday = lines.reduce((s, l) => s + (l.interestToday ?? 0), 0);
  return { id: 'M9T', value: lines.length ? totalToday : null, unit: 'money', needs: lines.length ? [] : ['a debt with a balance, an APR and a payment'], lines, skipped, inflation: x.inflation, fi: fi0,
    text: lines.length ? `Interest still to pay on the plan, each month's interest divided by ${fmt.pct(x.inflation)} inflation a year to that month: ${money(totalToday)} in today's dollars (${money(plan.interest)} as paid). The FI months a debt costs: the FI date as it is, against the plan run again with that debt gone today and its payment kept.` : 'No debt with a balance, an APR and a payment.' };
}

const freeOf = (doc, ref, m, now) => flowOf(m.inputs, { pretaxSaving: m.pretaxSaving, setAside: setAsideOf(doc, ref, now).total }).free;
const bigEOf = L => L.layers.filter(l => l.id.startsWith('big-e')).reduce((s, l) => s + (l.filled ?? 0), 0);

// The question, cleaned: { kind, amount, offers: [{ rate, years, fees }] }.
export function loanAskOf(ask = {}) {
  const kind = LOAN_KINDS[ask.kind] ? ask.kind : 'other';
  const amount = Number(ask.amount) > 0 ? Number(ask.amount) : null;
  const offers = (ask.offers || []).slice(0, MAX_OFFERS).map(o => ({ rate: o?.rate == null || o.rate === '' || Number.isNaN(Number(o.rate)) ? null : Number(o.rate), years: Number(o?.years) > 0 ? Number(o.years) : LOAN_KINDS[kind].years, fees: Number(o?.fees) > 0 ? Number(o.fees) : 0 }));
  return { kind, amount, offers: offers.length ? offers : [{ rate: null, years: LOAN_KINDS[kind].years, fees: 0 }] };
}

// M9L: each offer and paying cash, against the plan as it is.
export function loanOffers(doc, ref, ask, { now = new Date(), m = null } = {}) {
  const a = loanAskOf(ask), K = LOAN_KINDS[a.kind];
  const base = m ?? metrics(doc, ref, { now }), x = base.inputs, inflation = x.inflation ?? 0;
  const fi0 = fiOf(base), free0 = freeOf(doc, ref, base, now), free0Debt = base.debtPlan.months;
  if (!a.amount) return { id: 'M9L', value: null, needs: ['an amount'], ask: a, offers: [], cash: null, text: 'Pick how much.' };
  const offers = a.offers.map((o, i) => {
    if (o.rate == null) return { i, ...o, needs: ['a rate'] };
    const principal = a.amount + o.fees, n = Math.round(o.years * 12);
    const payment = loanPayment(principal, o.rate, n);
    const s = loanSchedule({ amount: principal, apr: o.rate, payment, n, inflation });
    const loan = { type: K.type, name: K.name, balance: principal, apr: o.rate, payment, n };
    const copy = withLoan(doc, base, loan, now), after = metrics(copy, ref, { now });
    const fi1 = fiOf(after), moved = fi0 != null && fi1 != null ? fi1 - fi0 : null;
    const d1 = after.debtPlan.months;
    const tax = ['home', 'school', 'business'].includes(a.kind) ? afterTaxOf(copy, ref, after, { id: 'truecost-loan', type: K.type, balance: principal, apr: o.rate }) : null;
    const total = s.paid, cost = total - a.amount; // what borrowing costs over the amount: the interest and the fees
    return { i, ...o, needs: [], payment, n, total, interest: s.interest, cost, costToday: s.interestToday + o.fees, heavy: isHeavyDebt({ type: K.type, balance: principal, apr: o.rate }),
      fi: { before: fi0, after: fi1, moved, afterYm: fi1 == null ? null : addMonths(ymOf(now), fi1) }, debtFree: { before: free0Debt, after: d1, afterYm: d1 == null ? null : addMonths(ymOf(now), d1) },
      free: { before: free0, after: freeOf(copy, ref, after, now) }, afterTax: tax,
      text: `${money(principal)}${o.fees ? ` (the ${money(a.amount)} plus ${money(o.fees)} of fees)` : ''} at ${fmt.pct(o.rate)} over ${o.years} ${o.years === 1 ? 'year' : 'years'}: ${money(payment)} a month, ${money(total)} in all, ${money(cost)} more than the amount (${money(s.interestToday + o.fees)} in today's dollars). ${fi0 == null || fi1 == null ? 'The FI date is not on this path.' : moved === 0 ? `FI stays ${mon(now, fi0)}.` : `FI ${mon(now, fi1)} instead of ${mon(now, fi0)}: ${months(moved)} ${moved > 0 ? 'later' : 'sooner'}.`} ${d1 == null ? 'Debt free is not on this path.' : d1 === free0Debt ? `Debt free stays ${mon(now, d1)}.` : `Debt free ${mon(now, d1)}${free0Debt == null ? '' : ` instead of ${mon(now, free0Debt)}`}.`}` };
  });
  // Paying cash instead: the amount out of cash, then the plan refills big e from the surplus first (FOO step 4).
  const { copy: cashCopy, short } = withCash(doc, a.amount);
  let cash;
  if (short > 0.5) cash = { needs: ['more cash'], short, text: `Cash on hand is ${money(a.amount - short)}: paying cash needs ${money(short)} more.` };
  else {
    const after = metrics(cashCopy, ref, { now }), L0 = layersOf(doc, ref, now), L1 = layersOf(cashCopy, ref, now);
    const fi1 = fiOf(after), moved = fi0 != null && fi1 != null ? fi1 - fi0 : null;
    const e0 = bigEOf(L0), e1 = bigEOf(L1), spend = x.spending || null;
    cash = { needs: [], total: a.amount, cost: 0, bigE: { before: e0, after: e1, monthsBefore: spend ? e0 / spend : null, monthsAfter: spend ? e1 / spend : null }, fi: { before: fi0, after: fi1, moved, afterYm: fi1 == null ? null : addMonths(ymOf(now), fi1) },
      debtFree: { before: free0Debt, after: after.debtPlan.months }, free: { before: free0, after: free0 },
      text: `${money(a.amount)} out of cash: no interest, no payment. big e goes from ${money(e0)} to ${money(e1)}${spend ? ` (${(e0 / spend).toFixed(1)} to ${(e1 / spend).toFixed(1)} months of spending)` : ''}, and the surplus refills it first (FOO step 4). ${fi0 == null || fi1 == null ? 'The FI date is not on this path.' : moved === 0 ? `FI stays ${mon(now, fi0)}.` : `FI ${mon(now, fi1)} instead of ${mon(now, fi0)}: ${months(moved)} ${moved > 0 ? 'later' : 'sooner'}.`}` };
  }
  const ready = offers.filter(o => !o.needs.length);
  const lowestTotal = ready.length > 1 ? ready.reduce((p, o) => (o.total < p.total ? o : p)).i : null;
  const lowestPayment = ready.length > 1 ? ready.reduce((p, o) => (o.payment < p.payment ? o : p)).i : null;
  return { id: 'M9L', value: ready[0]?.fi.moved ?? null, unit: 'months', needs: ready.length ? [] : ['a rate'], ask: a, offers, cash, lowestTotal, lowestPayment, fi: fi0, free: free0,
    text: `Each offer is added to a copy of your plan and the plan runs again (never saved): the payment over the term, the FI date and the debt-free month. ${ready.map(o => o.text).join(' ')}` };
}

// What it bought (school and business): extra pay a year (gross), starting after startYears; the year it is paid back
// (the extra take-home, after your marginal rate, adds up to what the loan costs in all) and the FI date with both.
export function boughtOf(doc, ref, { ask, offer = 0, extra, startYears = 0 }, { now = new Date(), m = null } = {}) {
  const base = m ?? metrics(doc, ref, { now });
  const L = loanOffers(doc, ref, ask, { now, m: base }), o = L.offers[offer] ?? L.offers[0];
  const need = [!(extra > 0) ? 'the extra pay a year' : null, !o || o.needs?.length ? 'an offer with a rate' : null, L.needs.includes('an amount') ? 'an amount' : null].filter(Boolean);
  if (need.length) return { id: 'M9L', value: null, needs: need, text: `Needs ${need.join(' and ')}.` };
  const rates = householdRates(base.inputs.householdTax, ref);
  const marginal = rates.value == null ? null : rates.marginal;
  const takeHome = extra * (1 - (marginal ?? 0));
  const years = startYears + Math.ceil(o.total / takeHome - 1e-9);
  const year = now.getUTCFullYear() + years;
  const K = LOAN_KINDS[L.ask.kind];
  const copy = withLoan(doc, base, { type: K.type, name: K.name, balance: L.ask.amount + o.fees, apr: o.rate, payment: o.payment, n: o.n }, now);
  const at = Math.round(startYears * 12);
  copy.whatIf = { changes: [...(copy.whatIf?.changes || []), { id: 'truecost-pay', kind: 'starts', ym: addMonths(ymOf(now), at), at, surplus: takeHome / 12, spending: 0, name: 'Extra pay' }] };
  const both = metrics(copy, ref, { now }), fiBoth = fiOf(both), fi0 = fiOf(base);
  const moved = fi0 != null && fiBoth != null ? fiBoth - fi0 : null;
  return { id: 'M9L', value: years, unit: 'years', needs: [], extra, takeHome, marginal, years, year, total: o.total, fi: { before: fi0, loan: o.fi.after, both: fiBoth, moved },
    text: `If it brings ${money(extra)} a year more (${money(takeHome)} after tax${marginal == null ? '' : ` at your ${fmt.pct(marginal)} rate`})${startYears ? ` starting in ${startYears} ${startYears === 1 ? 'year' : 'years'}` : ''}, that adds up to the ${money(o.total)} the loan costs in all by ${year} (year ${years}). ${fi0 == null || fiBoth == null ? '' : `FI ${mon(now, fi0)} without borrowing, ${o.fi.after == null ? 'not on this path' : mon(now, o.fi.after)} with the loan alone, ${mon(now, fiBoth)} with the loan and the extra pay (${moved === 0 ? 'the same month' : `${months(moved)} ${moved > 0 ? 'later' : 'sooner'}`}).`}` };
}
