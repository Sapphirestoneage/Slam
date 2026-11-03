// Phase 3.5 section 5: moving an item on the calendar, its cash flow bucket, and the FOO and close markers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store } from '../js/records.js';
import { householdFromInputs } from '../js/demo.js';
import { instances, mark, balances } from '../js/month.js';
import { cashMonth } from '../js/math/statements.js';
import { calendarMarkers } from '../js/math/markers.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const YM = '2026-11';
const now = new Date('2026-11-01T12:00:00Z');
const make = () => { const doc = householdFromInputs(demo.inputs, { name: 'Calendar test', now: now.toISOString() }); return new Store(doc, { now: () => now.toISOString() }); };
const dayBal = (s, date) => balances(s.doc, ref, YM, 1, { now }).rows.find(r => r.date === date)?.balance;

test('moving an item moves its money on the running balance, and undo puts it back', () => {
  const s = make();
  const bill = instances(s.doc, ref, YM, { now }).find(i => i.kind === 'bill' && !i.onCard && i.planned < 0);
  const later = `${YM}-15`;
  const b1 = dayBal(s, `${YM}-10`), end = dayBal(s, `${YM}-30`);
  mark(s, bill.key, { status: 'Moved', date: later });
  assert.equal(instances(s.doc, ref, YM, { now }).find(i => i.key === bill.key).date, later);
  assert.ok(Math.abs(dayBal(s, `${YM}-10`) - (b1 - bill.planned)) < 0.01, 'before the new day, the money is still there');
  assert.ok(Math.abs(dayBal(s, `${YM}-30`) - end) < 0.01, 'the month ends in the same place');
  s.undo();
  assert.equal(instances(s.doc, ref, YM, { now }).find(i => i.key === bill.key).date, bill.date);
  assert.ok(Math.abs(dayBal(s, `${YM}-10`) - b1) < 0.01);
});

test('a bucket set on an item moves it on the cash flow statement, and survives Back to planned', () => {
  const s = make();
  const bill = instances(s.doc, ref, YM, { now }).find(i => i.kind === 'bill' && !i.onCard && i.planned < 0);
  const base = cashMonth(s.doc, ref, YM, { now });
  mark(s, bill.key, { status: 'Paid', paid: bill.planned });
  mark(s, bill.key, { bucket: 'Investing' });
  const after = cashMonth(s.doc, ref, YM, { now });
  assert.ok(Math.abs((after.totals.Investing - base.totals.Investing) - bill.planned) < 0.01);
  assert.ok(Math.abs((after.totals.Everyday - base.totals.Everyday) + bill.planned) < 0.01);
  assert.ok(Math.abs(after.end - base.end) < 0.01, 'ending cash is the same; only the bucket changed');
  mark(s, bill.key, { status: 'Planned' });
  assert.equal(s.doc.spending.calendar.marks[bill.key].bucket, 'Investing');
});

test('markers: FOO dates on the first of their month, the close day on the last', () => {
  const s = make();
  const m = calendarMarkers(s.doc, ref, '2027-04', { now });
  assert.ok(m.some(x => x.kind === 'close' && x.date === '2027-04-30'));
  assert.ok(m.some(x => x.kind === 'foo' && x.date === '2027-04-01' && /April 15/.test(x.name)), JSON.stringify(m));
});
