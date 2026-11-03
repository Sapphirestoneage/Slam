// SPDX-License-Identifier: AGPL-3.0-only
// Calendar markers (Phase 3.5 section 5): FOO dates and the month-end close day, as slim markers behind a filter.
// Pure: no DOM. FOO dates are months, so they sit on the first of their month; the close day is the last day.
import { foo } from './foo.js';
import { daysIn, dateOf } from '../month.js';

export function calendarMarkers(doc, ref, ym, { now = new Date(), flags = [] } = {}) {
  const out = [];
  const f = foo(doc, ref, { now, flags });
  for (const d of f.path) if (d.ym === ym) out.push({ date: dateOf(ym, 1), kind: 'foo', step: d.step, name: `FOO ${d.step}: ${d.name}` });
  const month = doc.spending?.months?.[ym];
  const closed = month?.closed && month.closedAt ? String(month.closedAt).slice(0, 10) : null;
  out.push({ date: closed || dateOf(ym, daysIn(ym)), kind: 'close', name: closed ? 'Month closed' : 'Month-end close' });
  return out;
}
