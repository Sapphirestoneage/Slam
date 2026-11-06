// SPDX-License-Identifier: AGPL-3.0-only
// Batch 29: the student loan decision (M9S). For a client's federal student loans, held together the way a servicer
// figures an income-driven payment: the Standard plan, IBR and RAP (the plans open in 2026 after the 2025 law), each
// on its own and, for a borrower on a forgiveness track, with PSLF. For each: the payment now, the total paid, what is
// forgiven and any tax on it, and when it ends. Rules from data/reference-2026.json (studentLoans), registered with
// their sources in js/registry/assumptions.js. SAVE is gone (a court order, March 10 2026); PAYE and ICR close June 30
// 2028 and are not compared. Income is held where it is today (a raise raises an income-driven payment).
// The FOO rule (js/math/foo.js forgiveness): a loan marked PSLF is never heavy or low-rate debt to pay down, so nothing
// here tells a forgiveness borrower to pay it off fast; the words say what paying more does instead.
// Pure: no DOM.
import { metrics } from './metrics.js';
import { federalTax, householdRates } from './income.js';
import { fmt } from './result.js';
import { addMonths, ymOf, monthName } from '../month.js';

const money = fmt.money;
const yrs = n => (n % 12 === 0 ? `${n / 12} ${n === 12 ? 'year' : 'years'}` : `${(n / 12).toFixed(1)} years`);
const mon = (now, n) => monthName(addMonths(ymOf(now), n), 'short');
export const FIRST_BORROWED = ['Before July 2014', 'July 2014 to June 2026', 'July 2026 or later'];
export const PAYMENTS_MADE = [0, 24, 48, 72, 96, 108];

// The poverty guideline for a household of this size (48 states and DC).
export const povertyLine = (size, ref) => ref.studentLoans.poverty.base + ref.studentLoans.poverty.perPerson * Math.max(0, (size ?? 1) - 1);

// A level payment that clears amount at apr over months.
export function levelPayment(amount, apr, months) {
  if (!(amount > 0) || !(months > 0)) return 0;
  const r = (apr ?? 0) / 12;
  return r === 0 ? amount / months : amount * r / (1 - (1 + r) ** -months);
}

// IBR a month: 10% (first borrowed July 2014 or later) or 15% (before) of income over 150% of the poverty line, never
// more than the 10-year Standard payment.
export function ibrPayment({ agi, familySize = 1, old = false, cap = null }, ref) {
  const R = ref.studentLoans.ibr;
  const yearly = Math.max(0, (old ? R.oldPct : R.newPct) * (agi - R.povertyMultiple * povertyLine(familySize, ref)));
  return cap != null ? Math.min(cap, yearly / 12) : yearly / 12;
}
// RAP a month: a share of the whole AGI by band (RAP_bands), less $50 a dependent, never under $10.
export function rapRate(agi, ref) { let rate = 0; for (const [over, r] of ref.studentLoans.rap.bands) if (agi > over) rate = r; return rate; }
export function rapPayment({ agi, dependents = 0 }, ref) {
  const R = ref.studentLoans.rap;
  return Math.max(R.minimum, agi * rapRate(agi, ref) / 12 - R.perDependent * (dependents ?? 0));
}

// Month by month at a level payment for up to months payments. Federal loans charge simple interest: what a payment
// leaves unpaid waits beside the principal (it is not added to it). On RAP the unpaid interest is waived, and when a
// payment takes less than $50 off the principal the principal goes down by up to $50 more (the lesser of $50 and the
// part of the payment that went to interest). At the end, whatever is owed is forgiven.
export function repay({ balance, apr, payment, months, rap = false, inflation = 0 }, ref) {
  const r = (apr ?? 0) / 12, match = ref.studentLoans.rap.principalMatch;
  let P = balance, A = 0, paid = 0, paidToday = 0, n = 0;
  while (P + A > 0.005 && n < months) {
    n += 1;
    const i = P * r;
    const pay = Math.min(payment, P + A + i);
    paid += pay; paidToday += inflation ? pay / (1 + inflation) ** (n / 12) : pay;
    if (rap) {
      const toInt = Math.min(pay, i), toPrin = pay - toInt;
      const extra = toPrin < match ? Math.min(match, toInt) : 0;
      P = Math.max(0, P - toPrin - extra);
    } else {
      A += i;
      const toInt = Math.min(pay, A);
      A -= toInt;
      P = Math.max(0, P - (pay - toInt));
    }
  }
  const owed = P + A;
  return { months: n, paid, paidToday, forgiven: owed > 0.005 ? owed : 0, paidOff: owed <= 0.005 };
}

// The student loan interest deduction a year: the interest, up to $2,500, phased out by income; none when married filing
// separately.
export function interestDeduction({ interest, magi, filingStatus = 'Single' }, ref) {
  const D = ref.studentLoans.interestDeduction;
  if (filingStatus === 'Married separately' || !(interest > 0)) return 0;
  const [from, to] = filingStatus === 'Married jointly' ? [D.jointFrom, D.jointTo] : [D.singleFrom, D.singleTo];
  const share = magi == null ? 1 : magi <= from ? 1 : magi >= to ? 0 : (to - magi) / (to - from);
  return Math.min(D.max, interest) * share;
}

// What the drill-down reads from the file: every federal student loan as one, the income the plans use, the family.
export function studentLoanOf(doc, ref, { now = new Date(), m = null } = {}) {
  const M = m ?? metrics(doc, ref, { now }), x = M.inputs;
  const recOf = id => doc.records.find(r => r.id === id);
  const all = x.debts.filter(d => d.type === 'Student loan' && (d.balance ?? 0) > 0).map(d => ({ ...d, rec: recOf(d.id) }));
  const federal = all.filter(d => d.rec?.values?.federal === 'Federal'), priv = all.filter(d => d.rec?.values?.federal === 'Private'), unknown = all.filter(d => !d.rec?.values?.federal);
  if (!federal.length) return { federal, private: priv, unknown, loans: all };
  const balance = federal.reduce((s, d) => s + d.balance, 0);
  const apr = federal.reduce((s, d) => s + d.balance * (d.apr ?? 0), 0) / balance;
  const payment = federal.reduce((s, d) => s + (d.payment ?? 0), 0);
  const pslf = federal.some(d => d.rec.values.pslf === 'Yes') ? 'Yes' : federal.some(d => d.rec.values.pslf === 'Not sure') ? 'Not sure' : federal.some(d => d.rec.values.pslf === 'No') ? 'No' : null;
  const lefts = federal.map(d => d.rec.values.paymentsLeft).filter(v => Number(v) > 0).map(Number);
  const pslfN = ref.studentLoans.pslfPayments;
  const made = pslf === 'Yes' && lefts.length ? Math.max(0, pslfN - Math.min(...lefts)) : null; // payments left is PSLF's count on a PSLF loan
  const first = federal.map(d => d.rec.values.firstBorrowed).find(Boolean) ?? null;
  const fs = x.filingStatus ?? 'Single';
  const gross = x.grossAllAnnual ?? x.grossAnnual;
  const pretax = (M.pretaxSaving ?? 0) * 12;
  const magi = gross == null ? null : Math.max(0, gross - pretax);
  const deduction = magi == null ? 0 : interestDeduction({ interest: balance * apr, magi, filingStatus: fs }, ref);
  const agi = magi == null ? null : Math.max(0, magi - deduction);
  const married = /^Married/.test(fs) || /^Married/.test(doc.profile?.mode ?? '');
  const dependents = Number(doc.profile?.dependents ?? 0) || 0;
  return { federal, private: priv, unknown, loans: all, balance, apr, payment, pslf, made, first, firstGuess: !first, filingStatus: fs, gross, pretax, magi, deduction, agi, dependents, familySize: 1 + (married ? 1 : 0) + dependents, m: M };
}

// M9S: the plans compared. Each row: { id, name, payment, months, paid, forgiven, tax, endsYm, pslf, available, note }.
export function studentLoanPlans(doc, ref, { now = new Date(), m = null } = {}) {
  const s = studentLoanOf(doc, ref, { now, m });
  if (!s.federal.length) return { id: 'M9S', value: null, needs: s.loans.length ? ['a federal student loan (Federal or private on its row)'] : ['a student loan'], rows: [], s, text: s.unknown.length ? 'Say whether the loan is federal or private.' : 'No federal student loans.' };
  if (s.agi == null) return { id: 'M9S', value: null, needs: ['gross pay'], rows: [], s, text: 'Income-driven payments are figured from gross pay: add it on Income.' };
  const R = ref.studentLoans, x = s.m.inputs, inflation = x.inflation ?? 0;
  const newOnly = s.first === 'July 2026 or later', old = s.first === 'Before July 2014';
  const made = s.made ?? 0, pslfLeft = Math.max(1, R.pslfPayments - made);
  const tierYears = (R.tiered.filter(([from]) => s.balance >= from).at(-1) ?? [0, R.standardYears])[1];
  const stdYears = newOnly ? tierYears : R.standardYears;
  const std = levelPayment(s.balance, s.apr, stdYears * 12);
  const cap10 = levelPayment(s.balance, s.apr, R.standardYears * 12);
  const ibr = ibrPayment({ agi: s.agi, familySize: s.familySize, old, cap: cap10 }, ref);
  const rap = rapPayment({ agi: s.agi, dependents: s.dependents }, ref);
  const taxOn = (forgiven, months) => {
    if (!(forgiven > 0) || !R.idrForgivenessTaxed) return 0;
    const today = forgiven / (1 + inflation) ** (months / 12); // in today's dollars, against today's brackets
    const fs = s.filingStatus;
    return federalTax({ gross: (s.gross ?? 0) + today, pretax: s.pretax, filingStatus: fs }, ref).value - federalTax({ gross: s.gross ?? 0, pretax: s.pretax, filingStatus: fs }, ref).value;
  };
  const row = (id, name, payment, months, { rapRules = false, pslf = false, note = null, available = true } = {}) => {
    const r = repay({ balance: s.balance, apr: s.apr, payment, months, rap: rapRules, inflation }, ref);
    const tax = pslf ? 0 : taxOn(r.forgiven, r.months);
    return { id, name, payment, months: r.months, paid: r.paid, paidToday: r.paidToday, forgiven: r.forgiven, tax, paidOff: r.paidOff, endsYm: addMonths(ymOf(now), r.months), pslf, available, note,
      text: `${money(payment)} a month for ${r.months} ${r.months === 1 ? 'payment' : 'payments'} (${yrs(r.months)}): ${money(r.paid)} paid${r.forgiven > 0 ? `, then ${money(r.forgiven)} forgiven${pslf ? ', tax-free (PSLF)' : `; the federal tax on it is about ${money(tax)} in today's dollars`}` : ', paid off'}.` };
  };
  const idrYears = old ? R.ibr.oldYears : R.ibr.newYears;
  const rows = [
    row('standard', newOnly ? `Standard, ${stdYears} years (tiered)` : 'Standard, 10 years', std, stdYears * 12, { note: newOnly ? 'The tiered plan does not count for PSLF.' : null }),
    ...(newOnly ? [] : [row('ibr', `IBR, forgiven after ${idrYears} years`, ibr, Math.max(1, idrYears * 12 - made), { note: `${old ? 15 : 10}% of income over ${money(R.ibr.povertyMultiple * povertyLine(s.familySize, ref))}` })]),
    row('rap', 'RAP, forgiven after 30 years', rap, Math.max(1, R.rap.years * 12 - made), { rapRules: true, note: `${fmt.pct(rapRate(s.agi, ref))} of AGI${s.dependents ? `, less ${money(R.rap.perDependent * s.dependents)} for dependents` : ''}` }),
  ];
  const track = s.pslf === 'Yes' || s.pslf === 'Not sure';
  if (track) {
    if (!newOnly) rows.push(row('ibr-pslf', 'IBR with PSLF', ibr, pslfLeft, { pslf: true }));
    rows.push(row('rap-pslf', 'RAP with PSLF', rap, pslfLeft, { rapRules: true, pslf: true }));
  }
  // The FOO rule, in words: on a forgiveness track, paying more than the plan asks only lowers what is forgiven.
  const onPslf = s.pslf === 'Yes';
  const lowest = rows.reduce((p, r) => (r.paid + r.tax < p.paid + p.tax ? r : p), rows[0]);
  const words = onPslf
    ? `On PSLF: ${pslfLeft} more qualifying ${pslfLeft === 1 ? 'payment' : 'payments'}, then what is left is forgiven, tax-free. Paying more than the plan asks does not shorten it; it only lowers what is forgiven.`
    : s.pslf === 'Not sure' ? 'If your job is public service (a government or nonprofit employer, full time), PSLF forgives what is left after 120 qualifying payments, tax-free. The PSLF rows assume it.'
      : 'IBR and RAP forgive what is left at the end; that amount is taxed as income from 2026 on (PSLF never is).';
  return { id: 'M9S', value: lowest.paid + lowest.tax, needs: [], unit: 'money', rows, s, onPslf, pslfLeft: track ? pslfLeft : null, made: s.made, standard: std, ibr: newOnly ? null : ibr, rap, newOnly,
    lowestTotal: lowest.id, words,
    text: `${money(s.balance)} of federal student loans at ${fmt.pct(s.apr)}. AGI ${money(s.agi)} (gross ${money(s.gross)}${s.pretax ? ` less ${money(s.pretax)} before-tax saving` : ''}${s.deduction ? ` less the ${money(s.deduction)} student loan interest deduction` : ''}), a household of ${s.familySize}. ${rows.map(r => `${r.name}: ${r.text}`).join(' ')} Income is held where it is today.` };
}
