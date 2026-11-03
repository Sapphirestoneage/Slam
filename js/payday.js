// Payday card (B7): "You get $X on [date]. $Y covers fixed bills. $Z is free to spend." Per pay period and per month.
// Pure: reads the same month model as the calendar. Fixed bills are the fixed floor (fixed-amount lines, your share)
// plus debt payments that are not already spending lines.
import { instances, ymOf, addMonths } from './month.js';
import { metrics } from './math/metrics.js';
import { fixedFloor } from './math/spending.js';

const PAYS = { week: 52, '2 weeks': 26, 'twice a month': 24, month: 12 };

export function paydayOf(doc, ref, now = new Date()) {
  const m = metrics(doc, ref, { now });
  const x = m.inputs;
  const today = now.toISOString().slice(0, 10);
  const ym = ymOf(now);
  const pays = [...instances(doc, ref, ym, { now }), ...instances(doc, ref, addMonths(ym, 1), { now })]
    .filter(i => i.kind === 'income' && i.planned > 0 && i.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const next = pays[0] || null;
  if (!next || x.takeHome == null) return { needs: x.takeHome == null ? 'take-home pay' : 'a paycheck on the calendar' };
  const freq = x.income.find(i => i.r.values.payFrequency)?.r.values.payFrequency ?? 'month';
  const perMonth = (PAYS[freq] ?? 12) / 12;
  const floor = x.lines.length ? fixedFloor(x.lines, { roommates: x.roommates }).value ?? 0 : 0;
  const fixedMonthly = floor + (x.debtPaymentsOutsideSpending ?? 0);
  const fixedPerPay = fixedMonthly / perMonth;
  return {
    date: next.date, guessDate: !!next.guessDate, paycheck: next.planned, name: next.name,
    period: { in: next.planned, fixed: fixedPerPay, free: next.planned - fixedPerPay },
    month: { in: x.takeHome, fixed: fixedMonthly, free: x.takeHome - fixedMonthly },
    freq, hasFixed: fixedMonthly > 0,
  };
}
