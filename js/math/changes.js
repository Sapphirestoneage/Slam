// SPDX-License-Identifier: AGPL-3.0-only
// Known changes ahead (batch 15, items 6 and 13; part of M53). A bill someone else covers until a month ("Becomes
// mine in"), a Budget line that starts on a month (a known future cost, like health care from a date) and
// unemployment benefits that end. Each change: { ym, at (months from this month), surplus (the monthly surplus moves
// by this from then on), spending (monthly spending moves by this, and stays in retirement), name, kind, id }.
// The projections (FI date, ladder, debt plan, calendar) read these; today's numbers do not change.
import { myShare } from './spending.js';
import { ok, fmt } from './result.js';

const ymOfDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthsFrom = (a, b) => { const [y1, m1] = a.split('-').map(Number); const [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); };
const midMonth = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 15, 12); };
const ymOf = v => (v && /^\d{4}-\d{2}/.test(String(v)) ? String(v).slice(0, 7) : null);
// The month benefits stop counting: the month of the day after the last day paid.
export const endYm = end => { const d = new Date(`${end}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };

export function datedChanges(x, { now = new Date() } = {}) {
  const here = ymOfDate(now), out = [];
  const roommates = x.roommates ?? 0;
  for (const l of x.typedLines || x.lines || []) {
    if (x.dupOf?.[l.id]) continue;
    for (const [field, kind] of [['takeover', 'takeover'], ['startsIn', 'starts']]) {
      const ym = ymOf(l[field] ?? l.values?.[field]);
      if (!ym || ym <= here) continue;
      if (kind === 'takeover' && (l.whoPays ?? l.values?.whoPays) !== 'Covered by someone') continue;
      const later = myShare(l, { roommates, now: midMonth(ym) }).value ?? 0, today = myShare(l, { roommates, now }).value ?? 0;
      const d = later - today;
      if (Math.abs(d) < 0.005) continue;
      out.push({ id: l.id, kind, ym, at: monthsFrom(here, ym), surplus: -d, spending: d, name: l.name || l.category || 'A bill' });
    }
  }
  for (const i of x.income || []) {
    if (!i.benefit?.end || i.takeHome?.value == null) continue;
    const ym = endYm(i.benefit.end);
    if (ym <= here) continue;
    out.push({ id: i.r.id, kind: 'benefitEnd', ym, at: monthsFrom(here, ym), surplus: -i.takeHome.value, spending: 0, income: -i.takeHome.value, name: i.r.name || 'Unemployment benefits', end: i.benefit.end });
  }
  return out.sort((a, b) => a.at - b.at);
}

// The one line the Plan shows for each change: "Benefits end Jan 2027: your month changes by -$3,766".
export function changeWords(c) {
  const [y, m] = c.ym.split('-').map(Number);
  const when = new Date(Date.UTC(y, m - 1, 15)).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const by = `${c.surplus < 0 ? '-' : '+'}${fmt.money(Math.abs(c.surplus))}`;
  if (c.kind === 'benefitEnd') return `Benefits end ${when}: your month changes by ${by}`;
  if (c.kind === 'takeover') return `${c.name} becomes yours ${when}: your month changes by ${by}`;
  return `${c.name} starts ${when}: your month changes by ${by}`;
}

// What the monthly surplus is in a month k months from now, with the changes in.
export function surplusIn(surplus, changes, k) {
  if (surplus == null) return null;
  const v = surplus + (changes || []).reduce((s, c) => s + (c.at <= k ? c.surplus : 0), 0);
  return ok('M27', v, `${fmt.money(surplus)} a month today${(changes || []).filter(c => c.at <= k).map(c => `, ${c.surplus < 0 ? 'minus' : 'plus'} ${fmt.money(Math.abs(c.surplus))} from ${c.ym} (${c.name})`).join('')} = ${fmt.money(v)}.`);
}
