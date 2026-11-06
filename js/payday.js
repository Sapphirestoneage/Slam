// SPDX-License-Identifier: AGPL-3.0-only
// Payday card (B7): "You get $X on [date]. $Y covers fixed bills. $Z is free to spend." Per pay period and per month.
// Pure: reads the same month model as the calendar. Fixed bills are the fixed floor (fixed-amount lines, your share)
// plus debt payments that are not already spending lines.
import { instances, ymOf, addMonths } from './month.js';
import { metrics } from './math/metrics.js';
import { fixedFloor } from './math/spending.js';
import { tagsOf } from './math/portfolio.js';
import { yearItems, sinkingOf } from './year.js';
import { gatesOf, visible } from './gates.js';
import { ownPlanPerson } from './registry/couples.js';

// Savings goals (purpose tags on accounts) and sinking funds, a month (answer to Brandon question 75). A sinking fund
// on a yearly cost from the Budget is left out: that cost is already in spending as its set-aside.
export function setAsideOf(doc, ref, now = new Date()) {
  const live = visible(doc.records, gatesOf(doc.profile, doc.client), ref);
  const goals = live.filter(r => r.kind === 'account').flatMap(a => tagsOf(a.values.tags || [], { now }).rows).reduce((s, t) => s + (t.monthly ?? 0), 0);
  const sinking = yearItems(live, now).all.filter(x => x.rec.values.sinking && !(x.rec.kind === 'bill' && x.rec.values.irregular))
    .reduce((s, x) => s + (sinkingOf(x, { records: live, now }).monthly ?? 0), 0);
  return { goals, sinking, total: goals + sinking };
}

const PAYS = { week: 52, '2 weeks': 26, 'twice a month': 24, month: 12 };

export function paydayOf(doc, ref, now = new Date()) {
  const m = metrics(doc, ref, { now, person: ownPlanPerson(doc) });
  const x = m.inputs;
  const today = now.toISOString().slice(0, 10);
  const ym = ymOf(now);
  const pays = [...instances(doc, ref, ym, { now }), ...instances(doc, ref, addMonths(ym, 1), { now })]
    .filter(i => i.kind === 'income' && i.planned > 0 && i.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const next = pays[0] || null;
  if (!next || x.takeHome == null) return { needs: x.takeHome == null ? 'take-home pay' : 'a paycheck on the calendar' };
  // Batch 15: the household's pay, per pay period of its biggest paycheck (several jobs, a partner's part-time pay):
  // every paycheck covers its share of the fixed bills, not just the next one to land.
  const main = [...x.income].filter(i => i.takeHome?.value != null).sort((a, b) => b.takeHome.value - a.takeHome.value)[0];
  const freq = main?.r.values.payFrequency ?? x.income.find(i => i.r.values.payFrequency)?.r.values.payFrequency ?? (main?.benefit ? 'week' : 'month');
  const perMonth = (PAYS[freq] ?? 12) / 12;
  const several = x.income.filter(i => i.takeHome?.value).length > 1;
  const payIn = several ? x.takeHome / perMonth : next.planned;
  const floor = x.lines.length ? fixedFloor(x.lines, { roommates: x.roommates }).value ?? 0 : 0;
  const fixedMonthly = floor + (x.debtPaymentsOutsideSpending ?? 0);
  const fixedPerPay = fixedMonthly / perMonth;
  const save = setAsideOf(doc, ref, now);
  const free = { period: payIn - fixedPerPay, month: x.takeHome - fixedMonthly };
  return {
    date: next.date, guessDate: !!next.guessDate, paycheck: payIn, name: several ? 'Household pay' : next.name, several,
    period: { in: payIn, fixed: fixedPerPay, free: free.period, save: save.total / perMonth, afterSavings: free.period - save.total / perMonth },
    month: { in: x.takeHome, fixed: fixedMonthly, free: free.month, save: save.total, afterSavings: free.month - save.total },
    freq, hasFixed: fixedMonthly > 0, setAside: save,
  };
}
