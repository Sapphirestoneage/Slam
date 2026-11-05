// SPDX-License-Identifier: AGPL-3.0-only
// Calendar markers (Phase 3.5 section 5): FOO dates and the month-end close day, as slim markers behind a filter.
// Pure: no DOM. FOO dates are months, so they sit on the first of their month; the close day is the last day.
import { foo } from './foo.js';
import { daysIn, dateOf } from '../month.js';
import { holidaysInMonth, shabbatDays } from './holidays.js';

export function calendarMarkers(doc, ref, ym, { now = new Date(), flags = [] } = {}) {
  const out = [];
  const f = foo(doc, ref, { now, flags });
  for (const d of f.path) if (d.ym === ym) out.push({ date: dateOf(ym, 1), kind: 'foo', step: d.step, name: `FOO ${d.step}: ${d.name}` });
  const month = doc.spending?.months?.[ym];
  const closed = month?.closed && month.closedAt ? String(month.closedAt).slice(0, 10) : null;
  out.push({ date: closed || dateOf(ym, daysIn(ym)), kind: 'close', name: closed ? 'Month closed' : 'Month-end close' });
  // Holidays (M75): the sets ticked on About you. Jewish and Muslim holidays begin at sundown the evening before.
  const sets = doc.profile?.calendars || {};
  const add = (date, name, kind = 'holiday') => { if (date.startsWith(ym)) out.push({ date, kind, name }); };
  for (const d of holidaysInMonth(sets, ym)) {
    const about = d.approx ? ' (about)' : '';
    if (d.set === 'jewish' || d.set === 'muslim') add(d.eve, `${d.name} begins at sundown${about}`);
    add(d.start, `${d.name}${about}`);
    if (d.days > 2) add(d.end, `${d.name} ends${about}`);
    else if (d.days === 2) add(d.end, `${d.name}, day 2`);
  }
  if (sets.shabbat) for (const s of shabbatDays(ym)) { add(s.friday, 'Shabbat begins at sundown', 'shabbat'); add(s.saturday, 'Shabbat', 'shabbat'); }
  return out;
}
