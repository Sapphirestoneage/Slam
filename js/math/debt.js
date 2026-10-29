// M30 to M37: minimums, payoff months, interest, fee APR, payoff order, utilization, DTI, promo.
import { ok, needs, missing, fmt } from './result.js';
import { duration } from '../format.js';

// M30: credit card minimum. A statement number overrides it (R036, R060).
export function cardMinimum({ balance, apr }) {
  const m = missing({ balance, APR: apr });
  if (m.length) return needs('M30', m);
  const interest = balance * apr / 12;
  const v = Math.min(balance, Math.max(25, balance * 0.01 + interest));
  return ok('M30', v, `The larger of $25 or 1% of the ${fmt.money(balance)} balance plus one month's interest (${fmt.money(interest)}) = ${fmt.money(v)} a month.`, { parts: { interest } });
}

// The smallest whole-dollar payment that ever pays it off.
export const paymentNeeded = (balance, apr) => Math.floor(balance * apr / 12) + 1;

// M31: months to pay off. Never-pays-off gives the payment needed (Words: Payment too small).
export function payoffMonths({ balance, apr, payment }, { from = new Date() } = {}) {
  const m = missing({ balance, APR: apr, payment });
  if (m.length) return needs('M31', m, { unit: 'months' });
  if (balance <= 0) return ok('M31', 0, 'Nothing left to pay.', { unit: 'months' });
  const r = apr / 12;
  if (r === 0) {
    const n = Math.ceil(balance / payment - 1e-9);
    return { ...ok('M31', n, `${fmt.money(balance)} at 0% divided by ${fmt.money(payment)} a month = ${duration(n, from)}.`, { unit: 'months' }), exact: balance / payment };
  }
  if (payment <= r * balance) {
    const need = paymentNeeded(balance, apr);
    return { id: 'M31', value: null, needs: [], guess: false, unit: 'months', never: true, paymentNeeded: need,
      text: `This payment never pays it off. It needs at least ${fmt.money(need)} a month.` };
  }
  const exact = -Math.log(1 - r * balance / payment) / Math.log(1 + r);
  const n = Math.ceil(exact - 1e-9);
  return { ...ok('M31', n, `${fmt.money(balance)} at ${fmt.pct(apr)} paying ${fmt.money(payment)} a month: each month adds ${fmt.pct(apr)} / 12 interest and takes off the payment. It is paid off in ${duration(n, from)}.`, { unit: 'months' }), exact };
}

// Month-by-month simulation of one debt (the source of truth for interest, M32).
export function simulateDebt({ balance, apr, payment }, maxMonths = 1200) {
  let b = balance, interest = 0, months = 0;
  const r = apr / 12;
  const path = [b];
  while (b > 0.005 && months < maxMonths) {
    const i = b * r;
    interest += i;
    b = b + i - Math.min(payment, b + i);
    months += 1;
    path.push(b);
  }
  return { months, interest, path, paidOff: b <= 0.005 };
}

// M32: total interest at this payment.
export function totalInterest({ balance, apr, payment }) {
  const p = payoffMonths({ balance, apr, payment });
  if (p.value === null) return { ...p, id: 'M32' };
  // The headline is the spec's formula (what the Demo and Test client expect); the month-by-month
  // simulation sits beside it and can differ by a dollar or two on the last partial payment.
  const sim = simulateDebt({ balance, apr, payment });
  const v = (p.exact ?? p.value) * payment - balance;
  return { ...ok('M32', v, `${fmt.number(p.exact ?? p.value, 2)} months of ${fmt.money(payment)} payments (${fmt.money((p.exact ?? p.value) * payment)}) minus the ${fmt.money(balance)} owed = ${fmt.money(v)} of interest. Month by month it comes to ${fmt.money(sim.interest)}.`), simulated: sim.interest };
}

// M33: fee to APR (payday, cash advance).
export function feeApr({ fee, amount, periodsPerYear }) {
  const m = missing({ fee, 'amount borrowed': amount, 'how often': periodsPerYear });
  if (m.length) return needs('M33', m, { unit: 'pct' });
  const v = fee / amount * periodsPerYear;
  return ok('M33', v, `A ${fmt.money(fee)} fee on ${fmt.money(amount)}, ${periodsPerYear} times a year, is ${fmt.pct(v)} a year.`, { unit: 'pct' });
}

const ORDERS = {
  avalanche: (a, b) => b.apr - a.apr,
  snowball: (a, b) => a.balance - b.balance,
  // Stress: highest rating first, ties by APR; blank ratings go last (R062).
  stress: (a, b) => (b.stress ?? -1) - (a.stress ?? -1) || b.apr - a.apr,
};

// M34: payoff order with an extra payment, rolling each cleared payment forward.
export function payoffPlan(debts, { extra = 0, order = 'avalanche', maxMonths = 1200 } = {}) {
  const usable = debts.filter(d => d.balance > 0 && d.apr !== null && d.apr !== undefined && d.payment !== null && d.payment !== undefined);
  const skipped = debts.filter(d => !usable.includes(d)).map(d => d.name);
  const list = usable.map(d => ({ ...d, left: d.balance, paidOffMonth: null, interest: 0 })).sort(ORDERS[order]);
  let month = 0, total = 0;
  const path = [list.map(d => d.left)];
  while (list.some(d => d.left > 0.005) && month < maxMonths) {
    month += 1;
    let pool = extra;
    for (const d of list) if (d.left <= 0.005) pool += d.payment; // rolled forward
    for (const d of list) {
      if (d.left <= 0.005) continue;
      const i = d.left * d.apr / 12;
      d.interest += i; total += i;
      d.left += i;
      const pay = Math.min(d.left, d.payment);
      d.left -= pay;
      pool += d.payment - pay;
    }
    for (const d of list) {
      if (d.left <= 0.005 || pool <= 0) continue;
      const pay = Math.min(d.left, pool);
      d.left -= pay; pool -= pay;
    }
    for (const d of list) if (d.left <= 0.005 && d.paidOffMonth === null) d.paidOffMonth = month;
    path.push(list.map(d => Math.max(0, d.left)));
  }
  const done = list.every(d => d.left <= 0.005);
  return { id: 'M34', order, months: done ? month : null, interest: total, debts: list.map(({ name, paidOffMonth, interest }) => ({ name, paidOffMonth, interest })), path, skipped,
    text: done ? `Paying the minimums and putting ${fmt.money(extra)} extra on ${list[0]?.name ?? 'the first debt'} first (${order}), every debt is gone in ${month} months with ${fmt.money(total)} interest.`
      : 'These payments never clear every debt.' };
}

// M35: utilization. No limits: hidden.
export function utilization(cards) {
  const withLimits = cards.filter(c => c.limit);
  if (!withLimits.length) return { ...needs('M35', ['credit limits'], { unit: 'pct' }), hidden: true };
  const bal = withLimits.reduce((s, c) => s + (c.balance || 0), 0);
  const lim = withLimits.reduce((s, c) => s + c.limit, 0);
  return ok('M35', bal / lim, `Card balances ${fmt.money(bal)} divided by limits ${fmt.money(lim)} = ${fmt.pct(bal / lim)}.`, { unit: 'pct' });
}

// M36: debt-to-income.
export function debtToIncome({ monthlyDebtPayments, grossMonthly }) {
  const m = missing({ 'debt payments': monthlyDebtPayments, 'gross pay': grossMonthly });
  if (m.length) return needs('M36', m, { unit: 'pct' });
  const v = monthlyDebtPayments / grossMonthly;
  return ok('M36', v, `${fmt.money(monthlyDebtPayments)} of debt payments a month divided by ${fmt.money(grossMonthly)} gross a month = ${fmt.pct(v)}.`, { unit: 'pct' });
}

// M37: payment to clear a 0% promo balance before it ends.
export function promoPayment({ balance, monthsLeft }) {
  const m = missing({ balance, 'promo end date': monthsLeft });
  if (m.length) return needs('M37', m);
  if (monthsLeft <= 0) return needs('M37', ['a promo end date in the future']);
  const v = balance / monthsLeft;
  return ok('M37', v, `${fmt.money(balance)} divided by the ${monthsLeft} months left on the promo = ${fmt.money(v)} a month.`);
}
