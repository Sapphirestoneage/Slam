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
export const HOME_DEFAULTS = { price: 500000, down: 0.2, rate: null, now: null, pmi: RULES.homePmi, closing: RULES.homeClosing };
export const HOME_PMI = [0.003, 0.005, 0.01];
export const HOME_CLOSING = [0.02, 0.03, 0.04, 0.05];
export const HOME_GUESS = { homeGrowth: RULES.homeGrowth, investGrowth: RULES.homeInvestGrowth, rentGrowth: RULES.homeRentGrowth, horizon: 10 };
export const HOME_RENT_GROWTHS = [0, 0.02, 0.03, 0.04, 0.05];
export const HOME_GROWTHS = [0, 0.02, 0.03, 0.04, 0.05];
export const HOME_INVEST = [0.05, 0.07, 0.09];
export const HOME_HORIZONS = [5, 10, 15, 30];
export const HOME_SELLING = [0, 0.03, 0.06, 0.08];
// Year one's interest next to the standard deduction: mortgage interest only lowers tax for someone who itemizes.
export function interestNote(loan, rate, ref, joint = false) {
  const first = scheduleOf(loan, { rate })[0]?.interest ?? 0, std = ref?.tax?.standardDeduction?.[joint ? 'joint' : 'single'] ?? null;
  if (!first || std == null) return null;
  return { interest: first, standard: std, itemize: first > std };
}

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
  const insuredFirst = down < 0.2, extra = today == null ? null : pay.all + (insuredFirst ? loan * (pick.pmi ?? HOME_DEFAULTS.pmi) / 12 : 0) - today;
  let moved = null, date = null, beforeDate = null, left = null;
  if (extra != null && doc) {
    const w = whatIf(doc, ref, priors, { spendLess: -extra }, { now });
    if (w) { moved = w.moved; date = w.date; beforeDate = w.beforeDate; left = w.surplus ?? null; }
  }
  const insured = down < 0.2;
  const pmiRate = pick.pmi ?? HOME_DEFAULTS.pmi, closingShare = pick.closing ?? HOME_DEFAULTS.closing;
  const pmi = insured ? loan * pmiRate / 12 : 0, closing = price * closingShare;
  pay.all += pmi;
  return {
    price, down, rate, cash, loan, pi: pay.pi, taxIns: pay.taxIns, pmi, pmiRate, closing, closingShare, upfront: cash + closing, all: pay.all, today, extra: today == null ? null : pay.all - today,
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
      insured ? `Under 20% down, most loans add mortgage insurance. It is counted here at ${+(pmiRate * 100).toFixed(1)}% of the loan a year. Your lender sets the real rate.` : null,
      'Moving and repairs come on top of the cash up front.',
    ].filter(Boolean),
  };
}

// The loan year by year: what goes to interest, what pays the loan down, and what is still owed.
export function scheduleOf(loan, { rate = RULES.lenderMortgageRate, years = RULES.lenderMortgageYears } = {}) {
  if (!(loan > 0)) return [];
  const r = rate / 12, pi = paymentFor(loan, { rate, years, share: 0 }).pi, rows = [];
  let bal = loan;
  for (let y = 1; y <= years; y++) {
    let interest = 0, paid = 0;
    for (let k = 0; k < 12; k++) { const i = bal * r, pr = Math.min(bal, pi - i); interest += i; paid += pr; bal -= pr; }
    rows.push({ year: y, interest, paid, balance: Math.max(0, bal) });
  }
  return rows;
}

// Own or rent, side by side. The owner pays the loan, taxes, insurance (and mortgage insurance while the loan is over
// 80% of the price). The renter pays rent and keeps the cash up front invested. Whoever pays less in a month invests
// the difference. At the end: the owner has the home's value less the loan plus what they invested; the renter has
// their investments. Selling the home costs a share of the sale price, and a gain above the tax-free amount (IRS
// Topic 701) is taxed. Tax on the investments' growth is left out on both sides.
export function rentOrBuy({ price, down, rate = RULES.lenderMortgageRate, years = RULES.lenderMortgageYears, share = RULES.lenderTaxInsShare, pmi = 0, closing = 0, rent, homeGrowth = HOME_GUESS.homeGrowth, investGrowth = HOME_GUESS.investGrowth, rentGrowth = HOME_GUESS.rentGrowth, horizon = HOME_GUESS.horizon, selling = RULES.homeSelling, joint = false } = {}) {
  if (!(price > 0) || !(rent > 0)) return null;
  const cash = price * down, loan = price - cash, first = paymentFor(loan, { rate, years, share });
  const r = rate / 12, g = (1 + investGrowth) ** (1 / 12) - 1;
  const run = n => {
    let bal = loan, ownerPot = 0, renterPot = cash + price * closing;
    for (let k = 0; k < n * 12; k++) {
      const y = Math.floor(k / 12), paying = k < years * 12 && bal > 0;
      const i = bal * r, pr = paying ? Math.min(bal, first.pi - i) : 0;
      const own = (paying ? i + pr : 0) + first.taxIns * (1 + homeGrowth) ** y + (bal > 0.8 * price ? loan * pmi / 12 : 0);
      const rnt = rent * (1 + rentGrowth) ** y;
      ownerPot *= 1 + g; renterPot *= 1 + g;
      if (own > rnt) renterPot += own - rnt; else ownerPot += rnt - own;
      bal -= pr;
    }
    const sale = price * (1 + homeGrowth) ** n, cost = sale * selling;
    const gainTax = Math.max(0, sale - cost - price - RULES.homeGainFree * (joint ? 2 : 1)) * RULES.homeGainRate;
    return { owner: sale - cost - gainTax - Math.max(0, bal) + ownerPot, renter: renterPot, sale, cost, gainTax };
  };
  const at = run(horizon);
  let even = null;
  for (let y = 1; y <= 30; y++) { const t = run(y); if (t.owner >= t.renter) { even = y; break; } }
  return { ...at, horizon, even, homeGrowth, investGrowth, rentGrowth, selling };
}
