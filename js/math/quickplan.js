// SPDX-License-Identifier: AGPL-3.0-only
// The quick calculators that lean on the plan's own engines (run Not built, groups 1 to 5, Part 2; M8Q): debt
// consolidation on the payoff math (M31, M32) and the loan payment, leaving a job on the tax engine (M10 to M13),
// the roommate split on the household split engine (M9N rowShare), the W-4 check on the tax engine and the child tax
// credit, and the month at a glance on the surplus and savings rate (M27, M28). Nothing here works a number out a
// second way: each one calls the function the whole plan uses.
import { payoffMonths, totalInterest } from './debt.js';
import { loanPayment } from './truecost.js';
import { federalTax, takeHomeFromGross, grossFromTakeHome, childTaxCredit } from './income.js';
import { rowShare } from './household.js';
import { monthlySurplus, savingsRate } from './spending.js';
import { HM_SPLIT, splitSharesOf } from './hard.js';

// Debt consolidation: the debts as they are (one balance at its average rate and what is paid now) next to one loan
// that pays them off. feePct: the origination fee, taken out of what the loan pays out, so the loan is larger.
export function qcConsolidate({ balance = null, apr = null, payment = null, loanApr = null, loanYears = null, feePct = 0 } = {}) {
  if (!(balance > 0) || apr == null || !(payment > 0) || loanApr == null || !(loanYears > 0)) return { ready: false };
  const now = payoffMonths({ balance, apr, payment }), nowInterest = totalInterest({ balance, apr, payment });
  const fee = Math.min(0.5, Math.max(0, feePct ?? 0)), principal = balance / (1 - fee), n = loanYears * 12, loanPay = loanPayment(principal, loanApr, n);
  const loanInterest = loanPay * n - principal, feeCost = principal - balance, loanCost = loanInterest + feeCost;
  const never = !!now.never;
  return { ready: true, balance, apr, payment, loanApr, loanYears, feePct: fee, principal, feeCost, loanPay, loanMonths: n, loanInterest, loanCost,
    never, paymentNeeded: now.paymentNeeded ?? null, nowMonths: never ? null : now.value, nowInterest: never ? null : nowInterest.value,
    saved: never ? null : nowInterest.value - loanCost, monthsSooner: never ? null : now.value - n, payDiff: payment - loanPay,
    loanAtSame: payment > loanPay ? payoffMonths({ balance: principal, apr: loanApr, payment }).value : null };
}

// Leave a job or start a business: what the cash covers while the new income grows, with health cover and the
// self-employment tax counted. profit: what the business clears a month before tax (0 at the start). Federal income tax
// and self-employment tax only, on the year's profit; state tax is not in this one.
export function qcLeave({ cash = null, spending = null, health = 0, profit = 0, ref } = {}) {
  if (cash == null || !(cash >= 0) || !(spending > 0)) return { ready: false };
  const hc = health ?? 0, p = Math.max(0, profit ?? 0), need = spending + hc;
  const year = p > 0 ? takeHomeFromGross({ gross: p * 12, selfEmployed: true }, ref) : null;
  const tax = year ? (year.federal.value + year.fica.value) / 12 : 0, kept = p - tax;
  const gap = need - kept, months = gap <= 0 ? null : cash / gap;
  const breakeven = grossFromTakeHome({ takeHome: need * 12, selfEmployed: true }, ref).value / 12;
  return { ready: true, cash, spending, health: hc, need, profit: p, tax, kept, taxShare: p > 0 ? tax / p : null, gap, covered: gap <= 0, months, whole: months == null ? null : Math.floor(months), breakeven, without: cash / need };
}

// Roommates: rent split by room size, by income or equally, through the household split engine (rowShare). people:
// [{ id, name, size, income }], the first one is you. bills: shared bills a month, split equally or the same way.
export const QC_SPLIT = HM_SPLIT;
export function qcRoommates({ rent = null, bills = 0, how = 'size', billsHow = 'equal', people = [] } = {}) {
  if (!(rent > 0) || people.length < 2) return { ready: false };
  const S = splitSharesOf({ how, billsHow, people }, rowShare); // one split for this and the roommate leaving (js/math/hard.js)
  if (!S.ready) return S;
  const rows = S.rows.map(p => ({ ...p, rent: rent * p.rentShare, bills: (bills ?? 0) * p.billShare, total: rent * p.rentShare + (bills ?? 0) * p.billShare }));
  return { ready: true, rent, bills: bills ?? 0, how, billsHow, rows, me: rows[0], equal: (rent + (bills ?? 0)) / people.length };
}

// The W-4 check: this year's federal income tax on the person's pay, next to what is withheld (so far, plus each
// paycheck left). A refund or an amount owed, and the W-4 line that evens it out: Step 4(c) extra withholding a
// paycheck when it comes up short; Step 4(b) deductions when it runs over (withholding annualizes a W-4 line, so a
// deduction lowers each paycheck by deduction x top rate / paychecks a year).
export function qcW4({ gross = null, pretax = 0, filingStatus = 'Single', kids = 0, withheld = null, perCheck = null, checksLeft = null, checksYear = 26, ref } = {}) {
  if (!(gross > 0) || withheld == null || perCheck == null || checksLeft == null || !(checksYear > 0)) return { ready: false };
  const fed = federalTax({ gross, pretax: pretax ?? 0, filingStatus }, ref);
  const ctc = childTaxCredit({ kids: kids ?? 0, magi: gross - (pretax ?? 0), incomeTax: fed.value, earned: gross, joint: filingStatus === 'Married jointly' }, ref);
  const owe = Math.max(0, fed.value - ctc.nonrefundable) - ctc.refundable, total = withheld + perCheck * checksLeft, diff = total - owe;
  const left = Math.max(1, checksLeft);
  // A paycheck cannot hold back less than nothing: the cut a paycheck is at most what it withholds now, and what the
  // paychecks left cannot take back still comes as a refund (stillRefund). Before Nov 26 2026 the line asked for any
  // amount (a $261,733 deduction for a $3,020 refund with three paychecks left).
  const cut = diff > 0 ? Math.min(diff / left, perCheck) : 0;
  const extra = diff < 0 ? -diff / left : 0, deductions = cut > 0 && fed.marginal > 0 ? cut * checksYear / fed.marginal : 0;
  const stillRefund = diff > 0 ? (deductions > 0 ? diff - cut * left : diff) : 0;
  return { ready: true, gross, filingStatus, tax: fed.value, credit: ctc.nonrefundable + ctc.refundable, owe, marginal: fed.marginal, withheld, perCheck, checksLeft, checksYear, total, diff,
    refund: diff > 0 ? diff : 0, owed: diff < 0 ? -diff : 0, extra, deductions, stillRefund, even: Math.abs(diff) < 1 };
}

// Cash flow at a glance: in, out, left, the share kept and what a day costs, on the plan's own surplus and savings rate.
export function qcGlance({ takeHome = null, spending = null, debtOutside = 0 } = {}) {
  if (!(takeHome > 0) || spending == null) return { ready: false };
  const S = monthlySurplus({ takeHome, spending, debtPaymentsOutsideSpending: debtOutside ?? 0 });
  const rate = savingsRate({ takeHome, surplus: S.value });
  return { ready: true, takeHome, spending, debtOutside: debtOutside ?? 0, out: spending + (debtOutside ?? 0), left: S.value, rate: rate.value, perDay: (spending + (debtOutside ?? 0)) * 12 / 365, keptYear: S.value * 12, text: S.text };
}
