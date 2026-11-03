// SPDX-License-Identifier: AGPL-3.0-only
// M20 to M2B: line amounts, my share, support, floor, set-asides, passes, surplus, savings rate, DRAFTT, housing, prepaid.
import { ok, needs, missing, fmt, isBlank } from './result.js';
import { LISTS } from '../registry/assumptions.js';
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

// How much of a line someone else covers. Answer to 94: once the takeover month arrives, it is yours.
const ymNow = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export function coveredShare(line, now = new Date()) {
  const takeover = line.takeover ?? line.values?.takeover ?? null;
  if (takeover && String(takeover).slice(0, 7) <= ymNow(now)) return 0; // a month, or a date in that month
  return line.coveredPct ?? (line.whoPays === 'Covered by someone' ? 1 : 0);
}

// M21: my share of a line.
export function myShare(line, { roommates = 0, basis = 'accrual', now = new Date() } = {}) {
  if (!isBlank(line.myShare)) return ok('M21', line.myShare, `You said your share is ${fmt.money(line.myShare)}.`);
  if (line.status === 'Not for me') return ok('M21', 0, 'Marked Not for me, so it counts as zero.');
  // Answer to 74: Included in rent is already in the rent line; N/A is not for me. Neither counts again.
  if (line.whoPays === 'Included in rent') return ok('M21', 0, 'Included in the rent, so it is already counted there.');
  if (line.whoPays === 'N/A') return ok('M21', 0, 'Does not apply, so it counts as zero.');
  const m = lineMonthly(line, { basis });
  if (m.value === null) return { ...m, id: 'M21' };
  const covered = coveredShare(line, now);
  const split = splitOf(line, roommates);
  // People often give their own share of a shared bill ("my rent is $1,500"): then the amount is already theirs.
  if (line.sharePct != null && line.sharePct > 0) { // a couple's own split: your share is a percent of the bill
    if (amountIsMine(line)) return ok('M21', m.value * (1 - covered), `${fmt.money(m.value)} a month is your ${fmt.pct(line.sharePct)} share (the whole bill is about ${fmt.money(m.value / line.sharePct)}).`);
    const v = m.value * (1 - covered) * line.sharePct;
    return ok('M21', v, `${fmt.money(m.value)} a month, your share ${fmt.pct(line.sharePct)} = ${fmt.money(v)} is yours.`);
  }
  if (amountIsMine(line) && split > 1) return ok('M21', m.value * (1 - covered), `${fmt.money(m.value)} a month is your share of a bill split ${split} ways (the whole bill is about ${fmt.money(m.value * split)}).`);
  const v = m.value * (1 - covered) / split;
  const parts = [];
  if (covered) parts.push(`${fmt.pct(covered)} covered by someone else`);
  if (split > 1) parts.push(`split ${split} ways`);
  return ok('M21', v, parts.length ? `${fmt.money(m.value)} a month, ${parts.join(', ')} = ${fmt.money(v)} is yours.` : `${fmt.money(v)} a month, all yours.`);
}

// About you › Home and shared bills fills in what a Budget line leaves blank: a bill in a shared group is split; it is
// split with the people you live with (you plus Splitting with, else your roommates); a couple can give their share as
// a percent (Split: my share); and a shared bill is given the way you usually give it (your share or the whole bill).
// What a line says itself always wins.
export function withHome(line, profile = {}) {
  const cat = line.category ?? line.values?.category;
  const shared = profile.shared || {};
  const inShared = Object.entries(LISTS.sharedGroups).some(([k, g]) => shared[k] === true && g.categories.includes(cat));
  const out = { ...line };
  const who = line.whoPays ?? line.values?.whoPays ?? null;
  if (!who && inShared) out.whoPays = 'Split';
  if ((out.whoPays ?? who) !== 'Split') return out;
  if ((line.amountIs ?? line.values?.amountIs) == null && profile.billsGivenAs) out.amountIs = profile.billsGivenAs;
  const typedSplit = line.splitBy ?? line.values?.splitBy;
  if (typedSplit == null) {
    if (profile.household === 'Couple' && profile.splitMine != null && profile.splitWith == null) out.sharePct = profile.splitMine;
    else if (profile.splitWith != null) out.splitBy = profile.splitWith + 1;
    else if (partnerSplits(profile)) out.splitBy = (profile.roommates ?? 0) + 2; // you, your partner and each roommate
  }
  return out;
}

// A partner splits the shared bills when the couple keeps money Separate or Mix (Joint: one budget, nothing to split).
export const partnerSplits = profile => profile.household === 'Couple' && ['Separate', 'Mix'].includes(profile.moneyStyle);
// The people splitting a shared bill when nothing more is said: you, your roommates, and a partner who splits.
export const peopleSharing = profile => (profile.splitWith ?? (profile.roommates ?? 0) + (partnerSplits(profile) ? 1 : 0)) + 1;

// How many ways a shared bill is split: Split by when typed, else you plus each roommate (R033).
export const splitOf = (line, roommates = 0) => line.splitBy ?? line.values?.splitBy ?? ((line.whoPays ?? line.values?.whoPays) === 'Split' ? roommates + 1 : 1);
// The amount typed on a split bill is the person's own share (This amount is: Your share), not the whole bill.
export const amountIsMine = line => (line.amountIs ?? line.values?.amountIs) === 'Your share';
// The whole bill a month, worked out from a share and the split (or the amount itself when it is the whole bill).
export function wholeBill(line, { roommates = 0, basis = 'accrual' } = {}) {
  const m = lineMonthly(line, { basis });
  if (m.value === null) return { ...m, id: 'M21' };
  const split = splitOf(line, roommates);
  if (line.sharePct != null && line.sharePct > 0) {
    const whole = amountIsMine(line) ? m.value / line.sharePct : m.value;
    return ok('M21', whole, amountIsMine(line) ? `Your ${fmt.pct(line.sharePct)} share ${fmt.money(m.value)} a month = ${fmt.money(whole)} for the whole bill.` : `${fmt.money(m.value)} a month is the whole bill.`);
  }
  return amountIsMine(line) && split > 1
    ? ok('M21', m.value * split, `Your share ${fmt.money(m.value)} a month times ${split} people = ${fmt.money(m.value * split)} a month for the whole bill.`)
    : ok('M21', m.value, `${fmt.money(m.value)} a month is the whole bill.`);
}

// M22: support received.
export function supportReceived(lines, opts) {
  let total = 0;
  const items = [];
  for (const l of lines) {
    const covered = coveredShare(l, opts?.now);
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
export function monthlySurplus({ takeHome, spending, debtPaymentsOutsideSpending = 0, sinkingFunds = 0 }) {
  const m = missing({ 'take-home': takeHome, spending });
  if (m.length) return needs('M27', m);
  const v = takeHome - spending - debtPaymentsOutsideSpending - sinkingFunds;
  // Answer to 62: money going into a sinking fund is spoken for, so it comes out of the surplus.
  const sink = sinkingFunds ? ` minus ${fmt.money(sinkingFunds)} into sinking funds` : '';
  return { ...ok('M27', v, debtPaymentsOutsideSpending
    ? `${fmt.money(takeHome)} take-home minus ${fmt.money(spending)} spending minus ${fmt.money(debtPaymentsOutsideSpending)} debt payments${sink} = ${fmt.money(v)} a month.`
    : `${fmt.money(takeHome)} take-home minus ${fmt.money(spending)} spending (debt payments included)${sink} = ${fmt.money(v)} a month.`), sinkingFunds };
}

// M28: savings rate. Headline on take-home; gross version for Show the math.
// M28, headline (reorganize pass, answer to Brandon question 70): counts the 401(k) and HSA money taken from the
// paycheck and the employer match, over take-home plus that money. The old M28 (surplus over take-home) is the second line.
export function savingsRate({ takeHome, surplus, afterTaxSavings = 0, gross = null, pretaxSaving = 0, match = 0 }) {
  const m = missing({ 'take-home': takeHome, 'monthly surplus': surplus });
  if (m.length) return needs('M28', m, { unit: 'pct' });
  const base = (surplus + afterTaxSavings) / takeHome;
  const extra = (pretaxSaving || 0) + (match || 0);
  const head = extra ? (surplus + afterTaxSavings + extra) / (takeHome + extra) : base;
  const grossRate = isBlank(gross) || !gross ? null : (surplus + afterTaxSavings + extra) / gross;
  const text = extra
    ? `(${fmt.money(surplus)} surplus + ${fmt.money(pretaxSaving)} into your 401(k) and HSA from the paycheck${match ? ` + ${fmt.money(match)} employer match` : ''}) divided by (${fmt.money(takeHome)} take-home + ${fmt.money(extra)}) = ${fmt.pct(head)}. Second line: ${fmt.money(surplus)} surplus divided by ${fmt.money(takeHome)} take-home = ${fmt.pct(base)}.`
    : `(${fmt.money(surplus)} surplus + ${fmt.money(afterTaxSavings)} saved in the budget) divided by ${fmt.money(takeHome)} take-home = ${fmt.pct(base)}.`;
  return { ...ok('M28', head, `${text}${grossRate === null ? '' : ` On gross: ${fmt.pct(grossRate)}.`}`, { unit: 'pct' }),
    gross: grossRate, ofTakeHome: base, second: extra ? `${fmt.pct(base)} of take-home, before the 401(k), HSA and match` : null, pretaxSaving, match };
}

// M29: DRAFTT shares of take-home. Proportions only.
export const DRAFTT = ['Debt', 'Retirement', 'Accommodation', 'Food', 'Transportation', 'Taxes', 'Therapy'];
// What each letter is called on screen. The stored key stays 'Therapy'; it reads Health and self-care (answer to 92).
export const DRAFTT_NAME = { Therapy: 'Health and self-care' };
export const drafttName = k => DRAFTT_NAME[k] ?? k;
export function drafttShares(lines, takeHome, opts) {
  if (isBlank(takeHome)) return needs('M29', ['take-home'], { unit: 'pct' });
  const totals = Object.fromEntries(DRAFTT.map(k => [k, 0]));
  for (const l of lines) if (l.draftt in totals) totals[l.draftt] += myShare(l, opts).value ?? 0;
  const shares = Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v / takeHome]));
  return { ...ok('M29', shares, DRAFTT.filter(k => totals[k]).map(k => `${drafttName(k)} ${fmt.pct(shares[k])}`).join(', ') || 'No lines tagged yet.', { unit: 'pct' }), totals };
}

// M2A: housing share of take-home.
export function housingPct({ housing, takeHome }) {
  const m = missing({ 'rent or mortgage': housing, 'take-home': takeHome });
  if (m.length) return needs('M2A', m, { unit: 'pct' });
  const v = housing / takeHome;
  return ok('M2A', v, `Housing ${fmt.money(housing)} (your share of rent and utilities) divided by ${fmt.money(takeHome)} take-home = ${fmt.pct(v)}. The reference line is 35%.`, { unit: 'pct' });
}
