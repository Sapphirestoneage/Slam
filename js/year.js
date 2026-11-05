// SPDX-License-Identifier: AGPL-3.0-only
// The year ahead (missed ideas M4, M5, M7): every known yearly date and cost in the next 12 months, sinking funds,
// and the bills someone else covers that you will take over. Pure: no DOM. Reads the same records as everything else.
import { ymOf, addMonths, monthsBetween } from './month.js';
import { monthlyFrom } from './math/income.js';
import { holidayYm } from './math/holidays.js';

// Next time a month of the year comes round, from this month on.
export function nextYm(month, now = new Date()) {
  if (!month) return null;
  const here = ymOf(now);
  const [y, m] = here.split('-').map(Number);
  return `${month >= m ? y : y + 1}-${String(month).padStart(2, '0')}`;
}

// The usual yearly dates (M4.1). Costs stay blank: never an example number.
export function usualDates({ renting = false, coverage = [] } = {}, now = new Date()) {
  const list = [
    { name: 'Tax day', type: 'Tax day', month: nextYm(4, now), day: 15 },
    { name: 'IRA contribution deadline (for last year)', type: 'IRA deadline', month: nextYm(4, now), day: 15 },
    { name: 'Open enrollment at work', type: 'Open enrollment', month: nextYm(11, now) },
  ];
  if (renting) list.push({ name: 'Lease renewal', type: 'Lease renewal', month: null });
  for (const c of coverage) list.push({ name: `${c.type} insurance renews`, type: 'Insurance renewal', month: null, coverageId: c.id });
  return list;
}

// Everything on the year view, by month (M4.1): events, yearly costs from Spending, card annual fees.
export function yearItems(records, now = new Date()) {
  const start = ymOf(now), end = addMonths(start, 12);
  const out = [];
  for (const r of records) {
    if (r.kind === 'event') out.push({ id: r.id, rec: r, name: r.name || r.type || 'Event', ym: r.values.holiday ? holidayYm(r.values.holiday, now) ?? r.values.month ?? null : r.values.month ?? null, holiday: r.values.holiday ?? null, cost: r.amount ?? null, source: r.type || 'Event', rentUp: r.type === 'Lease renewal' ? r.values.rentIncrease ?? null : null });
    else if (r.kind === 'bill' && r.values.irregular && r.status !== 'Not for me') out.push({ id: r.id, rec: r, name: r.name || 'Yearly cost', ym: nextYm(r.values.monthDue, now), cost: r.amount ?? null, source: 'Yearly cost' });
    else if (r.kind === 'debt' && r.type === 'Credit card' && r.values.annualFee) {
      const m = /^\d{4}-(\d{2})/.exec(r.values.opened || '')?.[1];
      out.push({ id: r.id, rec: r, name: `${r.name || 'Card'} annual fee`, ym: m ? nextYm(Number(m), now) : null, cost: r.values.annualFee, source: 'Card fee', derived: true });
    }
  }
  const inYear = x => x.ym && x.ym >= start && x.ym < end;
  const months = Array.from({ length: 12 }, (_, k) => addMonths(start, k)).map(ym => {
    const items = out.filter(x => x.ym === ym);
    return { ym, items, cost: items.some(x => x.cost != null) ? items.reduce((s, x) => s + (x.cost ?? 0), 0) : null };
  });
  return { months, undated: out.filter(x => !x.ym), later: out.filter(x => x.ym && !inYear(x)), all: out };
}

// Sinking fund (M5): target, due month, saved so far (typed, or the dollars on a linked purpose tag), monthly needed, % funded.
export function sinkingOf(item, { records = [], now = new Date() } = {}) {
  const r = item.rec;
  const target = item.cost ?? null;
  const link = r.values.sinkingFund ? records.find(a => a.id === r.values.sinkingFund) : null;
  const tag = link && r.values.fundTag ? (link.values.tags || []).find(t => t.name === r.values.fundTag) : null;
  const saved = tag ? tag.dollars ?? null : r.values.saved ?? null;
  const months = item.ym ? Math.max(1, monthsBetween(ymOf(now), item.ym)) : null;
  const left = target === null ? null : Math.max(0, target - (saved ?? 0));
  return { target, saved, savedFrom: tag ? `${link.name || link.type}: ${tag.name}` : saved != null ? 'typed' : null, due: item.ym, months,
    monthly: left === null || months === null ? null : left / months, funded: target && saved != null ? saved / target : null }; // blank saved shows no %, not 0%
}

// Taking over (M7.2): each covered bill, its monthly cost, the month you take it over, and the monthly total added then.
export const COVERERS = ['Parents', 'Partner', 'Employer', 'Other'];
const monthlyOf = l => (l.amount == null ? null : monthlyFrom(l.amount, l.per).value);
export function takingOver(records) {
  const items = records.filter(r => r.kind === 'bill' && r.values.whoPays === 'Covered by someone' && r.status !== 'Not for me')
    .map(r => ({ id: r.id, name: r.name || r.values.category || 'Bill', who: r.values.coveredBy ?? null, ym: r.values.takeover ?? null, monthly: monthlyOf(r) }));
  const dates = [...new Set(items.map(x => x.ym).filter(Boolean))].sort();
  let running = 0;
  const steps = dates.map(ym => {
    const these = items.filter(x => x.ym === ym);
    const added = these.reduce((s, x) => s + (x.monthly ?? 0), 0);
    running += added;
    return { ym, items: these, added, total: running };
  });
  return { items, steps, undated: items.filter(x => !x.ym), total: items.reduce((s, x) => s + (x.monthly ?? 0), 0) };
}
