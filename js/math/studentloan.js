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
import { addMonths, ymOf, monthName, monthsBetween } from '../month.js';

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
// part of the payment that went to interest). At the end, whatever is owed is forgiven. accrued (Part 5, the stepladder):
// interest from before repayment that waits beside the principal at the start (it is not added to it).
export function repay({ balance, apr, payment, months, rap = false, inflation = 0, accrued = 0 }, ref) {
  const r = (apr ?? 0) / 12, match = ref.studentLoans.rap.principalMatch;
  let P = balance, A = accrued ?? 0, paid = 0, paidToday = 0, n = 0;
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

// The household size the income-driven plans use: the size the person tapped (profile.loanFamilySize, the one on their
// loan papers), else them, a spouse and the people they support (Part 5 of the run of Nov 25 2026).
export const familyOf = (profile, married, dependents) => (Number(profile?.loanFamilySize) > 0 ? Math.round(Number(profile.loanFamilySize)) : 1 + (married ? 1 : 0) + dependents);
export const FAMILY_SIZES = [1, 2, 3, 4, 5, 6];

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
  return { federal, private: priv, unknown, loans: all, balance, apr, payment, pslf, made, first, firstGuess: !first, filingStatus: fs, gross, pretax, magi, deduction, agi, dependents, familySize: familyOf(doc.profile, married, dependents), familyTyped: Number(doc.profile?.loanFamilySize) > 0, m: M };
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

// ---------- Run "Finish everything partly built", Part 5 (Nov 25 2026) ----------
// PSLF in one card: the employer answer, the payments counted, the payments and years left, and what is forgiven, from
// the plans above (the PSLF row that pays least in all). Nothing is worked out twice: the rows come from studentLoanPlans.
export function pslfOf(R) {
  const employer = R?.s?.pslf ?? null;
  if (!R?.rows?.length) return { employer, counted: null, left: null, years: null, forgiven: null, row: null, needs: R?.needs ?? ['a federal student loan'] };
  const rows = R.rows.filter(r => r.pslf);
  if (employer === 'No' || employer == null || !rows.length) return { employer, counted: R.made ?? null, left: null, years: null, forgiven: null, row: null, needs: employer == null ? ['whether your employer counts for PSLF'] : [] };
  const row = rows.reduce((p, r) => (r.paid < p.paid ? r : p), rows[0]);
  const left = R.pslfLeft;
  return { employer, counted: R.made ?? null, countedGuess: R.made == null, left, years: left / 12, forgiven: row.forgiven, paid: row.paid, payment: row.payment, endsYm: row.endsYm, row, needs: [],
    text: `${R.made == null ? 'No payments counted yet (or not told)' : `${R.made} qualifying ${R.made === 1 ? 'payment' : 'payments'} counted`} of ${R.pslfLeft + (R.made ?? 0)}: ${left} to go, about ${+(left / 12).toFixed(1)} years. On ${row.name.replace(' with PSLF', '')} that is ${money(row.paid)} paid, then ${money(row.forgiven)} forgiven, tax-free.` };
}

// The payments left on the loan record (paymentsLeft) for a count of qualifying payments made.
export const pslfLeftFor = (made, ref) => Math.max(0, ref.studentLoans.pslfPayments - (made ?? 0));

// Refinance: a private loan at the person's own rate (a tap, no default and no lender), next to the federal plans. A
// private loan is a level payment over its years. What is given up is read from the federal rows: the forgiveness (PSLF,
// or IBR and RAP at the end) and the income-driven payment.
export const REFI_RATES = [0.04, 0.05, 0.06, 0.07, 0.08];
export const REFI_YEARS = [5, 7, 10, 15, 20];
export function refiOf(R, { rate = null, years = null } = {}, ref) {
  const need = [];
  if (!R?.rows?.length) need.push(...(R?.needs?.length ? R.needs : ['a federal student loan']));
  if (!(rate > 0)) need.push('the rate a private lender offers you');
  if (!(years > 0)) need.push('how many years');
  if (need.length) return { id: 'M8S', value: null, needs: need };
  const balance = R.s.balance, months = Math.round(years * 12);
  const payment = levelPayment(balance, rate, months);
  const run = repay({ balance, apr: rate, payment, months }, ref);
  const fed = R.rows.find(r => r.id === R.lowestTotal) ?? R.rows[0];
  const idr = R.rows.filter(r => r.id === 'ibr' || r.id === 'rap' || r.pslf), lowIdr = idr.length ? idr.reduce((p, r) => (r.payment < p.payment ? r : p), idr[0]) : null;
  const forgive = R.rows.filter(r => r.forgiven > 0.5), most = forgive.length ? forgive.reduce((p, r) => (r.forgiven > p.forgiven ? r : p), forgive[0]) : null;
  const pslfRow = R.onPslf ? R.rows.filter(r => r.pslf).reduce((p, r) => (!p || r.paid < p.paid ? r : p), null) : null;
  const diff = run.paid - (fed.paid + fed.tax); // more (positive) or less in all than the federal plan that pays least
  const gives = [
    pslfRow ? `PSLF: on it, ${money(pslfRow.forgiven)} would be forgiven tax-free after ${R.pslfLeft} more payments. A private loan has no PSLF.` : most ? `Forgiveness: ${most.name.split(',')[0]} forgives ${money(most.forgiven)} at the end. A private loan has none.` : 'Forgiveness: none of the federal plans forgives anything on your numbers, so this one costs you nothing here.',
    lowIdr ? `A payment set by your income: ${lowIdr.name.split(',')[0]} asks ${money(lowIdr.payment)} a month now and goes down if your pay does. A private payment stays ${money(payment)} whatever happens to your pay.` : null,
    'The federal pauses (deferment and forbearance) and the discharge if you die or become totally and permanently disabled. Some lenders offer their own versions; they vary.',
    'It cannot be undone: a private loan never turns back into a federal one.',
  ].filter(Boolean);
  return { id: 'M8S', value: run.paid, unit: 'money', needs: [], rate, years, payment, months: run.months, paid: run.paid, interest: run.paid - balance, endsYm: null, fed, diff, gives, lowIdr, most, pslfRow,
    text: `${money(balance)} at ${fmt.pct(rate)} over ${years} years: ${money(payment)} a month, ${money(run.paid)} in all (${money(run.paid - balance)} of interest). ${fed.name.split(',')[0]}, the federal plan that pays least in all, is ${money(fed.paid + fed.tax)}${fed.tax > 0 ? ' with the tax on what it forgives' : ''}: the private loan is ${money(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} in all.` };
}

// The stepladder: each school year's loan at its own rate (SL_rates, plus the graduate or PLUS add-on, or the person's
// own rate), the interest each one gathers before payments start (none on a subsidized loan while in school and in the
// grace period), and each one paid back on its own over the Standard 10 years. Federal loans do not add that interest to
// the principal when payments start (no capitalization since July 1 2023): it waits beside it and is paid first.
// A rung: { year: '2022-23', level: 'ug' | 'grad' | 'plus', amount, rate (null: the table's), subsidized }.
// Each year's loan is taken as paid out in September of its school year; payments start `grace` months after the last
// school year ends (May of its second year).
export const LADDER_LEVELS = [['ug', 'Undergraduate'], ['grad', 'Graduate'], ['plus', 'PLUS (parent or grad)']];
export const LADDER_GAPS = [0, 6, 12];
export function ladderRate(year, level, ref) {
  const L = ref.studentLoans, row = L.rates.find(([y]) => y === year);
  if (!row) return null;
  return Math.round((row[1] + (level === 'grad' ? L.gradAdd : level === 'plus' ? L.plusAdd : 0)) * 1e6) / 1e6;
}
const yearStart = year => Number(String(year).slice(0, 4));
export function stepladderOf(rungs, { gap = null } = {}, ref) {
  const R = ref.studentLoans, wait = gap ?? R.grace;
  const list = (rungs ?? []).filter(r => r && r.year);
  if (!list.length) return { id: 'M8L', value: null, needs: ['one school year'], rungs: [] };
  const missing = list.filter(r => !(r.amount > 0) || (r.rate == null && ladderRate(r.year, r.level, ref) == null));
  if (missing.length) return { id: 'M8L', value: null, needs: missing.map(r => (!(r.amount > 0) ? `what you borrowed for ${r.year}` : `the rate for ${r.year}`)), rungs: [] };
  const last = Math.max(...list.map(r => yearStart(r.year)));
  const startYm = addMonths(`${last + 1}-05`, wait);
  const out = list.map(r => {
    const rate = r.rate ?? ladderRate(r.year, r.level, ref), level = r.level ?? 'ug', sub = !!r.subsidized && level === 'ug';
    const months = Math.max(0, monthsBetween(`${yearStart(r.year)}-09`, startYm));
    const before = sub ? 0 : r.amount * rate * months / 12; // simple interest, it waits beside the principal
    const payment = levelPayment(r.amount + before, rate, R.standardYears * 12);
    const run = repay({ balance: r.amount, apr: rate, payment, months: R.standardYears * 12, accrued: before }, ref);
    return { year: r.year, level, amount: r.amount, rate, own: r.rate != null, subsidized: sub, months, before, owed: r.amount + before, payment, paid: run.paid, interest: run.paid - r.amount, paidMonths: run.months };
  }).sort((a, b) => yearStart(a.year) - yearStart(b.year));
  const sum = k => out.reduce((t, r) => t + r[k], 0);
  const principal = sum('amount'), before = sum('before'), payment = sum('payment'), paid = sum('paid');
  const blended = out.reduce((t, r) => t + r.amount * r.rate, 0) / principal;
  return { id: 'M8L', value: principal + before, unit: 'money', needs: [], rungs: out, principal, before, owed: principal + before, payment, paid, interest: paid - principal, blended, startYm, gap: wait,
    text: `${out.length} ${out.length === 1 ? 'year' : 'years'} of loans, ${money(principal)} borrowed. Before payments start (${monthName(startYm, 'short')}) they gather ${money(before)} of interest${out.some(r => r.subsidized) ? ' (none on the subsidized ones)' : ''}, so ${money(principal + before)} is owed. Paid back on the Standard 10 years, each at its own rate: ${money(payment)} a month, ${money(paid)} in all. The rates average ${fmt.pct(blended)}, weighted by what you borrowed.` };
}

// Guess / Close / Exact for the three cards: where the person says the number is from. 'guess' (or no answer) is a
// Guess; a lender's quote is Close; the servicer's own count, the PSLF tracker or the loan list on studentaid.gov is Exact.
export const SL_FROM = [['guess', 'My best guess'], ['quote', 'A quote or a rough look'], ['own', 'My servicer or studentaid.gov']];
export function slLevel(ready, source) {
  if (!ready) return null;
  return source === 'own' ? 'Exact' : source === 'quote' ? 'Close' : 'Guess';
}

// The dated sources the page names in plain words (checked Nov 25 2026, through WebSearch: the pages themselves could
// not be opened from here).
export const SL_SOURCES = {
  pslfRule: 'A rule that started July 1 2026 lets the Department of Education drop an employer it finds has a "substantial illegal purpose" from PSLF (the final rule of October 2025, Federal Register 2025-19729). A federal court set it aside in July 2026, and the case was still going on Aug 31 2026 (Congressional Research Service, LSB11472). Checked Nov 25 2026.',
  pslfCheck: 'The PSLF Help Tool on studentaid.gov says whether your employer counts, and your PSLF tracker there shows the payments counted so far.',
  refi: 'What a private refinance gives up, from the Consumer Financial Protection Bureau ("Should I consolidate or refinance my student loans?"), read Nov 25 2026.',
  rates: 'Rates by school year from Federal Student Aid (loans first paid out July 1 to June 30; 2026-27 announced Jun 4 2026), checked Nov 25 2026. Graduate loans add 1.55% and PLUS loans 2.55% to the undergraduate rate of the same year (the law sets each as the 10-year Treasury rate plus a fixed add-on). Each loan keeps the rate of the year it was paid out.',
  capitalize: 'Since July 1 2023 the interest from school and the grace period is not added to the principal of a Direct Loan when payments start (34 CFR 685.202, read through Tate Law, checked Nov 25 2026): it waits beside it and is paid first.',
};
