// M60, M61: running balance and bonus paycheck months.
import { ok, needs, fmt, isBlank } from './result.js';

const iso = d => d.toISOString().slice(0, 10);
const day = s => new Date(`${s}T00:00:00Z`);

// M60: start + in - out per day. Maybe entries only count when counted. Variable-date items spread evenly.
export function runningBalance({ start, from, to, entries }) {
  if (isBlank(start)) return needs('M60', ['a starting balance']);
  const days = [];
  for (let d = day(from); d <= day(to); d = new Date(d.getTime() + 86400000)) days.push(iso(d));
  const delta = Object.fromEntries(days.map(d => [d, 0]));
  for (const e of entries) {
    if (e.maybe && !e.counted) continue;
    if (e.status === "Didn't happen") continue;
    if (e.variableDate) {
      const each = e.amount / days.length;
      for (const d of days) delta[d] += each;
    } else if (e.date in delta) delta[e.date] += e.amount;
  }
  let b = start, low = { date: from, balance: start };
  const rows = days.map(d => {
    b += delta[d];
    if (b < low.balance) low = { date: d, balance: b };
    return { date: d, balance: b };
  });
  return { ...ok('M60', rows, `Starts at ${fmt.money(start)}; each day adds money in and takes money out. Lowest point ${fmt.money(low.balance)}.`), low };
}

// M61: months with three paydays for every-2-weeks pay.
export function bonusMonths({ firstPayday, year }) {
  if (!firstPayday) return needs('M61', ['a payday']);
  const counts = new Map();
  let d = day(firstPayday);
  while (d.getUTCFullYear() > year) d = new Date(d.getTime() - 14 * 86400000);
  while (d.getUTCFullYear() >= year) d = new Date(d.getTime() - 14 * 86400000);
  for (; d.getUTCFullYear() <= year; d = new Date(d.getTime() + 14 * 86400000)) {
    if (d.getUTCFullYear() !== year) continue;
    const k = d.getUTCMonth();
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const months = [...counts].filter(([, c]) => c === 3).map(([m]) => m);
  const names = months.map(m => new Date(Date.UTC(year, m, 15)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }));
  return ok('M61', months, months.length ? `Three paychecks land in ${names.join(' and ')} ${year}.` : `No three-paycheck months in ${year}.`, { unit: 'list' });
}
