// SPDX-License-Identifier: AGPL-3.0-only
// Income by type (batch 27, Phase 4 Track 2 wave 1): tips, shifts and platform payouts, worked out per income row.
// Pure: no DOM. js/math/income.js (incomeRow) reads these and folds them into the row's take-home; the screens only
// show what comes back. Every rate here is in data/reference-2026.json (tax.tips, platforms) with its source.
//
// A shift job (values): shiftsWeek, payShift (or hourly x hoursShift), houseFee (a shift), cardTips and cashTips
// (each a shift or a month: cardTipsPer, cashTipsPer), the tip-out (tipOutBy: '% of sales' with tipOutPct and
// salesShift, '% of tips' with tipOutPct, or '$ a shift' with tipOutAmount), cashReported ('Yes' or 'No'), and the
// seasons (slowMonths and busyMonths, each with shifts a week then: slowShifts, busyShifts).
//
// Two ways a row is typed:
//   Paycheck typed (the row's amount): card tips are already in that paycheck (taxed there). Cash tips come on top;
//     the tip-out and the house fee are paid from the cash at the end of the shift.
//   No paycheck, pay a shift typed: the row's yearly gross is worked out from the shifts and taxed on the household's
//     return. Card tips and reported cash tips are taxed; the tip-out comes off the taxed tips first (IRS Publication
//     531: report only the tips you keep); a house fee is a business cost on a 1099 row, and paid after tax on a W-2.
// Cash tips that are not reported still count for the plan (they are money in hand); the note says what reporting
// changes, never more.
import { fmt } from './result.js';
import { LISTS } from '../registry/assumptions.js';

export const SHIFTS_PER_MONTH = 52 / 12; // one shift a week, a month
export const MONTHS3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const TIP_OUT_BY = ['% of sales', '% of tips', '$ a shift'];
export const WORK_KEYS = ['shiftsWeek', 'payShift', 'hourly', 'hoursShift', 'houseFee', 'cardTips', 'cashTips', 'tipOutBy', 'tipOutPct', 'tipOutAmount', 'salesShift'];
const num = x => (x === null || x === undefined || x === '' || Number.isNaN(Number(x)) ? null : Number(x));
const round2 = x => Math.round(x * 100) / 100;

// An amount typed a shift or a month, as both (each needs the shifts a week to turn into the other).
function perBoth(amount, per, shiftsMonth) {
  const a = num(amount);
  if (a === null) return null;
  return per === 'month' ? { shift: shiftsMonth ? a / shiftsMonth : null, month: a, per: 'month' } : { shift: a, month: shiftsMonth == null ? null : a * shiftsMonth, per: 'shift' };
}
export const hasWork = v => WORK_KEYS.some(k => num(v?.[k]) !== null || (k === 'tipOutBy' && v?.[k]));

// The shifts, pay, tips, tip-out and fees of one row, a shift and a month.
export function workOf(r) {
  const v = r?.values || {};
  const shifts = num(v.shiftsWeek);
  const shiftsMonth = shifts === null ? null : shifts * SHIFTS_PER_MONTH;
  const payShift = num(v.payShift) ?? (num(v.hourly) !== null && num(v.hoursShift) !== null ? v.hourly * v.hoursShift : null);
  const pay = payShift === null ? null : { shift: payShift, month: shiftsMonth === null ? null : payShift * shiftsMonth, hourly: num(v.payShift) === null };
  const card = perBoth(v.cardTips, v.cardTipsPer ?? 'shift', shiftsMonth);
  const cash = perBoth(v.cashTips, v.cashTipsPer ?? 'shift', shiftsMonth);
  const fee = num(v.houseFee) === null ? null : { shift: v.houseFee, month: shiftsMonth === null ? null : v.houseFee * shiftsMonth };
  const by = v.tipOutBy ?? null, rate = num(v.tipOutPct);
  let tipOut = null;
  if (by === '% of sales' && rate !== null && num(v.salesShift) !== null) tipOut = { shift: rate * v.salesShift, month: shiftsMonth === null ? null : rate * v.salesShift * shiftsMonth };
  else if (by === '% of tips' && rate !== null && (card || cash)) {
    const m = card?.month != null || cash?.month != null ? rate * ((card?.month ?? 0) + (cash?.month ?? 0)) : null;
    const s = card?.shift != null || cash?.shift != null ? rate * ((card?.shift ?? 0) + (cash?.shift ?? 0)) : null;
    tipOut = { shift: s, month: m };
  } else if (by === '$ a shift' && num(v.tipOutAmount) !== null) tipOut = { shift: v.tipOutAmount, month: shiftsMonth === null ? null : v.tipOutAmount * shiftsMonth };
  if (tipOut) tipOut.by = by;
  const reported = v.cashReported ?? null;
  return { any: hasWork(v), shifts, shiftsMonth, pay, card, cash, fee, tipOut, reported, rate };
}

// What the row adds on top of its paycheck, and the yearly gross a shift job is taxed on. taxType: 'W-2' or '1099'.
// Returns { mode, extra (a month, after tax), grossYear (shift mode: what the household's return taxes), grossExtra
// (a year: income before tax that is not in the row's gross, for Gross as all income), cashMonth, tipOutMonth, feeMonth }.
export function workCash(w, { paycheckTyped = false, taxType = 'W-2' } = {}) {
  if (!w?.any) return null;
  const m = x => x?.month ?? 0;
  const se = taxType === '1099';
  if (paycheckTyped || !w.pay || w.pay.month == null) {
    // The paycheck holds the wage and the card tips. The cash tips come on top, less the tip-out and the house fee.
    const extra = m(w.cash) - m(w.tipOut) - m(w.fee);
    return { mode: 'paycheck', extra, grossYear: null, grossExtra: (m(w.cash) - m(w.tipOut)) * 12, cashMonth: m(w.cash), tipOutMonth: m(w.tipOut), feeMonth: m(w.fee) };
  }
  const reportedCash = w.reported === 'Yes' ? m(w.cash) : 0;
  const taxedTips = m(w.card) + reportedCash;
  // On a 1099 row the tip-out and the house fee are business costs: both come off the taxed gross. On a W-2 row the
  // tip-out comes off the taxed tips first (what is left of it is paid from cash), and a house fee is paid after tax.
  const outTaxed = se ? m(w.tipOut) : Math.min(m(w.tipOut), taxedTips), outCash = m(w.tipOut) - outTaxed;
  const grossMonth = Math.max(0, w.pay.month + taxedTips - outTaxed - (se ? m(w.fee) : 0));
  const untaxedCash = m(w.cash) - reportedCash;
  const extra = untaxedCash - outCash - (se ? 0 : m(w.fee));
  return { mode: 'shifts', extra, grossYear: grossMonth * 12, grossExtra: (untaxedCash - outCash) * 12, cashMonth: m(w.cash), tipOutMonth: m(w.tipOut), feeMonth: m(w.fee), taxedTipsMonth: taxedTips - outTaxed };
}

// The take-home a shift: the row's whole take-home a month (after tax, fees and tip-out) over its shifts a month.
export function perShift(takeHomeMonth, w) {
  if (takeHomeMonth == null || !w?.shiftsMonth) return null;
  return takeHomeMonth / w.shiftsMonth;
}

// The words for one shift job: what each part is, a shift and a month, and the take-home a shift.
export function workText(w, c, takeHomeMonth) {
  if (!w?.any || !c) return '';
  const parts = [];
  const at = (x, word) => (x?.shift != null ? `${fmt.money(x.shift, { cents: true })} ${word} a shift` : x?.month != null ? `${fmt.money(x.month, { cents: true })} ${word} a month` : null);
  if (w.shifts != null) parts.push(`${w.shifts} ${w.shifts === 1 ? 'shift' : 'shifts'} a week is ${fmt.number(Math.round(w.shiftsMonth * 100) / 100)} a month (x 52 / 12).`);
  const list = [w.pay ? at(w.pay, 'pay') : null, w.card ? `${at(w.card, 'card tips')}${c.mode === 'paycheck' ? ' (in the paycheck)' : ''}` : null, w.cash ? at(w.cash, 'cash tips') : null,
    w.tipOut ? `minus ${at(w.tipOut, `tip-out${w.tipOut.by === '$ a shift' ? '' : ` (${fmt.pct(w.rate)} of ${w.tipOut.by === '% of sales' ? 'sales' : 'tips'})`}`)}` : null,
    w.fee ? `minus ${at(w.fee, 'house fee')}` : null].filter(Boolean);
  if (list.length) parts.push(`${list.join(', ')}.`);
  if (c.mode === 'paycheck') parts.push(`On top of the paycheck: ${fmt.money(c.cashMonth)} cash tips${c.tipOutMonth ? ` minus ${fmt.money(c.tipOutMonth)} tip-out` : ''}${c.feeMonth ? ` minus ${fmt.money(c.feeMonth)} house fees` : ''} = ${fmt.money(c.extra)} a month.`);
  else parts.push(`Taxed on ${fmt.money(c.grossYear)} a year${c.extra ? `; ${fmt.money(c.extra)} a month in cash on top` : ''}.`);
  const ps = perShift(takeHomeMonth, w);
  if (ps != null) parts.push(`Take-home a shift, after tax, fees and tip-out: ${fmt.money(ps, { cents: true })}.`);
  return parts.join(' ');
}

// Cash tips that are not reported: still income for the plan. The calm note: what reporting changes, and roughly what
// the tax on them would be (income tax at this return's rate plus Social Security and Medicare, 7.65%), with the
// federal tips deduction (2025 to 2028) that only counts reported tips. year: the tax year shown.
export function tipsTaxNote(w, c, { marginal = null, federalMarginal = null, year = 2026, ref }) {
  if (!w?.cash || !c?.cashMonth) return null;
  const t = ref.tax.tips;
  const yearly = Math.max(0, c.cashMonth - (c.mode === 'paycheck' ? c.tipOutMonth : 0)) * 12;
  const fica = ref.tax.socialSecurityRate + ref.tax.medicareRate;
  const inWindow = year >= t.firstYear && year <= t.lastYear;
  const deduction = inWindow ? Math.min(yearly, t.deductionCap) * (federalMarginal ?? 0) : 0;
  if (w.reported === 'Yes') {
    return { reported: true, yearly, deduction, line: inWindow ? `Reported, so they may count for the federal tips deduction through ${t.lastYear}.` : 'Reported, so they are taxed through the paycheck.', text: inWindow
      ? `Reported cash tips may count for the federal tips deduction (up to ${fmt.money(t.deductionCap)} a year, ${t.firstYear} to ${t.lastYear}${federalMarginal ? `; about ${fmt.money(deduction)} less federal income tax here` : ''}). Social Security and Medicare still apply.`
      : 'Reported tips are taxed through the paycheck.' };
  }
  const exposure = marginal == null ? yearly * fica : yearly * Math.max(marginal, fica);
  return { reported: false, yearly, exposure, deduction, line: `Not reported yet: they still count here as money in hand, with about ${fmt.money(exposure)} a year of tax on them if it came up.`, text: `${fmt.money(yearly)} a year in cash tips counts here as money in hand. Unreported, it is still taxable: about ${fmt.money(exposure)} a year if it came up later, plus a penalty of up to half the Social Security and Medicare part. Reporting it (to the employer by the 10th, for months of ${fmt.money(t.reportOver)} or more) adds to your Social Security record and the income a lender or landlord can see${inWindow ? `, and lets it count for the tips deduction through ${t.lastYear}` : ''}.` };
}

// The shifts a week in each month of the year (the slow and busy seasons), and each month's share of a regular month.
export function seasonShifts(v) {
  const base = num(v?.shiftsWeek);
  if (base === null) return null;
  const slow = new Set(v.slowMonths || []), busy = new Set(v.busyMonths || []);
  return MONTHS3.map(mo => (slow.has(mo) && num(v.slowShifts) !== null ? v.slowShifts : busy.has(mo) && num(v.busyShifts) !== null ? v.busyShifts : base));
}
export const hasSeasons = v => !!seasonShifts(v)?.some(s => s !== num(v.shiftsWeek));
// Batch 15's irregular income view, fed by the shifts: each month of the household's income, with a shift job's
// scaled by that month's shifts (a slow January at 2 shifts a week instead of 3 is two thirds of the job). The view
// takes its own tax set-aside off, so self-employment income goes in before its tax (as it lands, like the calendar);
// a paycheck goes in as its take-home. income: metrics inputs income ([{ r, takeHome, taxType, tax }]).
// Returns { months, typical, lowest, highest, text } or null when no row has a season.
export function shiftMonthsOf(income) {
  const rows = (income || []).filter(i => i.takeHome?.value != null);
  if (!rows.some(i => hasSeasons(i.r.values))) return null;
  const base = i => i.takeHome.value + (i.taxType === '1099' && i.tax ? i.tax.total / 12 : 0);
  const months = MONTHS3.map((_, k) => round2(rows.reduce((s, i) => {
    const ss = seasonShifts(i.r.values);
    return s + (ss && num(i.r.values.shiftsWeek) ? base(i) * ss[k] / i.r.values.shiftsWeek : base(i));
  }, 0)));
  const typical = round2(rows.reduce((s, i) => s + base(i), 0));
  return { months, typical, lowest: Math.min(...months), highest: Math.max(...months),
    text: `Each month is your income (self-employment before its tax) with each shift job scaled by that month's shifts a week: lowest ${fmt.money(Math.min(...months))}, a regular month ${fmt.money(typical)}, highest ${fmt.money(Math.max(...months))}.` };
}

// A Platform income row: gross a month (what fans, buyers or riders paid), the platform's fee (the registered one for
// the platform unless typed), chargebacks or refunds a month, the hold before a payout lands and the payout schedule.
export const PLATFORMS = ['OnlyFans', 'Fansly', 'Patreon', 'Etsy', 'Uber', 'DoorDash', 'Upwork', 'Other'];
export function platformOf(r, ref) {
  const v = r?.values || {};
  const name = v.platform ?? 'Other';
  const d = ref.platforms?.[name] ?? ref.platforms?.Other ?? { fee: 0, holdDays: 0, payout: 'month' };
  const fee = num(v.feePct) ?? d.fee;
  const holdDays = num(v.holdDays) ?? d.holdDays;
  const gross = num(r?.amount) === null ? null : r.amount * (LISTS.perMonth[r.per ?? 'month'] ?? 1);
  const chargebacks = num(v.chargebacks) ?? 0;
  const net = gross === null ? null : Math.max(0, gross * (1 - fee) - chargebacks);
  const payout = v.payFrequency ?? d.payout;
  return { name, gross, fee, feeTyped: num(v.feePct) !== null, feeAmount: gross === null ? null : gross * fee, chargebacks, net, holdDays, holdTyped: num(v.holdDays) !== null, payout, source: d.source ?? null,
    text: gross === null ? `Needs the gross a month on ${name}.` : `${fmt.money(gross)} a month on ${name} minus the ${fmt.pct(fee)} fee (${fmt.money(gross * fee)})${chargebacks ? ` minus ${fmt.money(chargebacks)} chargebacks and refunds` : ''} = ${fmt.money(net)} paid out a month${holdDays ? `, each payout landing ${holdDays} days after it is earned` : ''}.` };
}

// The calendar: the dates a payout lands, each payout date moved later by the hold. dates(ym) gives the schedule's
// dates in a month (YYYY-MM-DD); the month before and the one before that are looked at too, so a payout earned late
// in one month and held into the next lands in the next.
export function heldDates(ym, holdDays, datesOf) {
  const shift = (iso, days) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
  if (!holdDays) return datesOf(ym).map(d => ({ date: d, earned: d }));
  const prev = k => { const [y, m] = ym.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1 - k, 1)); return t.toISOString().slice(0, 7); };
  const out = [];
  for (const m of [prev(2), prev(1), ym]) for (const d of datesOf(m)) { const lands = shift(d, holdDays); if (lands.slice(0, 7) === ym) out.push({ date: lands, earned: d }); }
  return out;
}
