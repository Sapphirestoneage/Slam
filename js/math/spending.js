// M20 to M2B: line amounts, my share, support, floor, set-asides, passes, surplus, savings rate, DRAFTT, housing, prepaid.
import { ok, needs, missing, fmt, isBlank } from './result.js';
import { monthlyFrom } from './income.js';

// M20 and M2B: a line's monthly amount. Accrual spreads prepaid and yearly costs across the months covered.
export function lineMonthly(line, { basis = 'accrual', payFrequency = null } = {}) {
  if (isBlank(line.amount)) return needs('M20', ['amount']);
  if (line.covers?.months) {
    if (basis === 'accrual') {
      const v = line.amount / line.covers.months;
      return ok('M20', v, `${fmt.money(line.amount)} paid for ${line.covers.months} months is ${fmt.money(v)} a month.`);
    }
    return ok('M20', line.amount, `${fmt.money(line.amount)} paid in the month it left (cash view).`);
  }
  return { ...monthlyFrom(line.amount, line.per, payFrequency), id: 'M20' };
}

// M2B: what is left of a prepayment.
export function prepaidLeft({ amount, months, monthsElapsed }) {
  const m = missing({ amount, 'months covered': months, 'date paid': monthsElapsed });
  if (m.length) return needs('M2B', m);
  const monthly = amount / months;
  const v = Math.max(0, amount - monthly * monthsElapsed);
  return ok('M2B', v, `${fmt.money(amount)} minus ${fmt.money(monthly)} a month for ${monthsElapsed} months used = ${fmt.money(v)} still prepaid.`);
}

// M21: my share of a line.
export function myShare(line, { roommates = 0, basis = 'accrual' } = {}) {
  if (!isBlank(line.myShare)) return ok('M21', line.myShare, `You said your share is ${fmt.money(line.myShare)}.`);
  if (line.status === 'Not for me') return ok('M21', 0, 'Marked Not for me, so it counts as zero.');
  const m = lineMonthly(line, { basis });
  if (m.value === null) return { ...m, id: 'M21' };
  const covered = line.coveredPct ?? (line.whoPays === 'Covered by someone' ? 1 : 0);
  const split = line.splitBy ?? (line.whoPays === 'Split' ? roommates + 1 : 1); // R033
  const v = m.value * (1 - covered) / split;
  const parts = [];
  if (covered) parts.push(`${fmt.pct(covered)} covered by someone else`);
  if (split > 1) parts.push(`split ${split} ways`);
  return ok('M21', v, parts.length ? `${fmt.money(m.value)} a month, ${parts.join(', ')} = ${fmt.money(v)} is yours.` : `${fmt.money(v)} a month, all yours.`);
}

// M22: support received.
export function supportReceived(lines, opts) {
  let total = 0;
  const items = [];
  for (const l of lines) {
    const covered = l.coveredPct ?? (l.whoPays === 'Covered by someone' ? 1 : 0);
    if (!covered) continue;
    const full = lineMonthly(l, opts).value;
    const mine = myShare(l, opts).value;
    if (full === null || mine === null) continue;
    total += full - mine;
    items.push(`${l.name ?? 'a line'} ${fmt.money(full - mine)}`);
  }
  return ok('M22', total, items.length ? `Others cover ${items.join(', ')} = ${fmt.money(total)} a month. If it stopped, your spending would go up by that much.` : 'Nobody else covers any of your costs.');
}

// M23: fixed floor.
export function fixedFloor(lines, opts) {
  const fixed = lines.filter(l => l.amountType === 'Fixed');
  const total = fixed.reduce((s, l) => s + (myShare(l, opts).value ?? 0), 0);
  return ok('M23', total, `Your share of the ${fixed.length} fixed lines = ${fmt.money(total)} a month you pay no matter what.`);
}

// M24: irregular set-aside.
export function irregularSetAside(yearly) {
  if (isBlank(yearly)) return needs('M24', ['the yearly cost']);
  return ok('M24', yearly / 12, `${fmt.money(yearly)} a year divided by 12 = ${fmt.money(yearly / 12)} to set aside each month.`);
}

// M25: estimate vs actual.
export function estimateVsActual({ estimate, actual }) {
  const m = missing({ estimate, actual });
  if (m.length) return needs('M25', m);
  const diff = actual - estimate;
  const share = estimate === 0 ? null : diff / estimate;
  return { ...ok('M25', diff, `Actual ${fmt.money(actual)} minus estimate ${fmt.money(estimate)} = ${fmt.money(diff)}${share === null ? '' : ` (${fmt.pct(share)})`}.`), pct: share };
}

// M26: gut accuracy, average % off across closed months. Hidden with no closed month.
export function gutAccuracy(months) {
  const usable = months.filter(m => !isBlank(m.actual) && m.actual !== 0 && !isBlank(m.guess));
  if (!usable.length) return { ...needs('M26', ['one closed month'], { unit: 'pct' }), hidden: true };
  const v = usable.reduce((s, m) => s + Math.abs(m.actual - m.guess) / m.actual, 0) / usable.length;
  return ok('M26', v, `Across ${usable.length} closed ${usable.length === 1 ? 'month' : 'months'}, the first guess was off by ${fmt.pct(v)} on average.`, { unit: 'pct' });
}

// M27: monthly surplus.
export function monthlySurplus({ takeHome, spending, debtPaymentsOutsideSpending = 0 }) {
  const m = missing({ 'take-home': takeHome, spending });
  if (m.length) return needs('M27', m);
  const v = takeHome - spending - debtPaymentsOutsideSpending;
  return ok('M27', v, debtPaymentsOutsideSpending
    ? `${fmt.money(takeHome)} take-home minus ${fmt.money(spending)} spending minus ${fmt.money(debtPaymentsOutsideSpending)} debt payments = ${fmt.money(v)} a month.`
    : `${fmt.money(takeHome)} take-home minus ${fmt.money(spending)} spending (debt payments included) = ${fmt.money(v)} a month.`);
}

// M28: savings rate. Headline on take-home; gross version for Show the math.
export function savingsRate({ takeHome, surplus, afterTaxSavings = 0, gross = null, pretaxSaving = 0, match = 0 }) {
  const m = missing({ 'take-home': takeHome, 'monthly surplus': surplus });
  if (m.length) return needs('M28', m, { unit: 'pct' });
  const v = (surplus + afterTaxSavings) / takeHome;
  const grossRate = isBlank(gross) || !gross ? null : (surplus + afterTaxSavings + pretaxSaving + match) / gross;
  return { ...ok('M28', v, `(${fmt.money(surplus)} surplus + ${fmt.money(afterTaxSavings)} saved in the budget) divided by ${fmt.money(takeHome)} take-home = ${fmt.pct(v)}.${grossRate === null ? '' : ` On gross, counting before-tax saving and the match: ${fmt.pct(grossRate)}.`}`, { unit: 'pct' }), gross: grossRate };
}

// M29: DRAFTT shares of take-home. Proportions only.
export const DRAFTT = ['Debt', 'Retirement', 'Accommodation', 'Food', 'Transportation', 'Taxes', 'Therapy'];
export function drafttShares(lines, takeHome, opts) {
  if (isBlank(takeHome)) return needs('M29', ['take-home'], { unit: 'pct' });
  const totals = Object.fromEntries(DRAFTT.map(k => [k, 0]));
  for (const l of lines) if (l.draftt in totals) totals[l.draftt] += myShare(l, opts).value ?? 0;
  const shares = Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v / takeHome]));
  return { ...ok('M29', shares, DRAFTT.filter(k => totals[k]).map(k => `${k} ${fmt.pct(shares[k])}`).join(', ') || 'No lines tagged yet.', { unit: 'pct' }), totals };
}

// M2A: housing share of take-home.
export function housingPct({ housing, takeHome }) {
  const m = missing({ 'rent or mortgage': housing, 'take-home': takeHome });
  if (m.length) return needs('M2A', m, { unit: 'pct' });
  const v = housing / takeHome;
  return ok('M2A', v, `Housing ${fmt.money(housing)} (your share of rent and utilities) divided by ${fmt.money(takeHome)} take-home = ${fmt.pct(v)}. The reference line is 35%.`, { unit: 'pct' });
}
