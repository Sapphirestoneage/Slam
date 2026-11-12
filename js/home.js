// SPDX-License-Identifier: AGPL-3.0-only
// Buying a home, as a what-if on the self-serve journey. Pure: no DOM. It reuses the lender view's terms
// (RULES.lenderMortgageRate, lenderMortgageYears, lenderTaxInsShare) and the journey's whatIf for the date, so the
// only arithmetic here is a loan's level payment, which is loanFromPayment (js/math/lender.js) run the other way.
import { RULES } from './registry/assumptions.js';
import { loanFromPayment, LENDER_RATES } from './math/lender.js';
import { whatIf, spanWords } from './journey.js';

export const HOME_PRICES = [300000, 400000, 500000, 600000, 750000, 900000, 1200000];
export const HOME_DOWNS = [0.035, 0.05, 0.1, 0.2, 0.3];
export const HOME_RATES = LENDER_RATES;
export const HOME_NOW = [0, 1000, 1500, 2000, 2500, 3000, 4000];
export const HOME_DEFAULTS = { price: 500000, down: 0.2, rate: null, now: null };

// The all-in monthly payment for a loan: principal and interest at the rate and term, with taxes and insurance as the
// same share of the payment the lender view uses.
export function paymentFor(loan, { rate = RULES.lenderMortgageRate, years = RULES.lenderMortgageYears, share = RULES.lenderTaxInsShare } = {}) {
  if (!(loan > 0)) return { pi: 0, taxIns: 0, all: 0 };
  const r = rate / 12, n = years * 12;
  const pi = r === 0 ? loan / n : loan * r / (1 - (1 + r) ** -n);
  const all = pi / (1 - share);
  return { pi, taxIns: all - pi, all };
}

// What the home screen shows. pick: { price, down (a share), rate, now (housing paid today, a month) }.
export function homeOf(doc, ref, priors, pl, pick = {}, { now = new Date() } = {}) {
  const price = pick.price ?? HOME_DEFAULTS.price, down = pick.down ?? HOME_DEFAULTS.down, rate = pick.rate ?? RULES.lenderMortgageRate;
  const cash = price * down, loan = price - cash;
  const pay = paymentFor(loan, { rate });
  const takeHome = pl?.m?.inputs?.takeHome ?? null;
  const today = pick.now ?? null;
  const extra = today == null ? null : pay.all - today;
  let moved = null, date = null, beforeDate = null, left = null;
  if (extra != null && doc) {
    const w = whatIf(doc, ref, priors, { spendLess: -extra }, { now });
    if (w) { moved = w.moved; date = w.date; beforeDate = w.beforeDate; left = w.surplus ?? null; }
  }
  const insured = down < 0.2;
  return {
    price, down, rate, cash, loan, pi: pay.pi, taxIns: pay.taxIns, all: pay.all, today, extra,
    share: takeHome > 0 ? pay.all / takeHome : null, insured,
    check: Math.abs(loanFromPayment(pay.all, { rate }) - loan) < 1,
    moved, date, beforeDate, left,
    line: extra == null ? 'Tap what you pay for housing today to see what this does to your date.'
      : moved == null ? (left != null && left <= 0 ? 'At this payment nothing is left to invest on your numbers today, so there is no date to show. A lower price, more down, or more pay brings it back.' : `That is ${extra >= 0 ? 'more' : 'less'} than you pay today.`)
      : moved === 0 ? `Your date stays at ${date}.`
      : moved < 0 ? `Work becomes optional ${date}, ${spanWords(-moved)} later than ${beforeDate}.`
      : `Work becomes optional ${date}, ${spanWords(moved)} sooner than ${beforeDate}.`,
    notes: [
      `Taxes and insurance are counted as ${Math.round(RULES.lenderTaxInsShare * 100)}% of the payment, a rough national share. Yours will differ.`,
      insured ? 'Under 20% down, most loans add mortgage insurance. It is not in this number.' : null,
      'Closing costs, moving and repairs come on top of the down payment.',
    ].filter(Boolean),
  };
}
