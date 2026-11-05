// SPDX-License-Identifier: AGPL-3.0-only
// Holidays (M78): computed dates, the weekly Shabbat line, holiday blocks that re-date themselves, and the markers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { holidayDates, holidaysOf, nextHoliday, holidayYm, holidayInMonth, shabbatDays, weekdayDays, holidaysInMonth, HOLIDAY_SETS } from '../js/math/holidays.js';
import { instances } from '../js/month.js';
import { yearItems } from '../js/year.js';
import { calendarMarkers } from '../js/math/markers.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z');
const home = setup => {
  const s = new Store(newHousehold({ name: 'Fake', now: '2026-10-01T09:00:00.000Z' }), { now: () => now.toISOString() });
  s.setDoc('profile', { age: 30, calendars: { jewish: true, shabbat: true } });
  s.add('income', { name: 'Job', amount: 5000, per: 'month', values: { payFrequency: 'month' } }, { type: 'Job' });
  setup(s);
  return s;
};

test('Jewish dates match the published calendar (fixed arithmetic, no table)', () => {
  const pin = (id, gy, start) => assert.equal(holidayDates(id, gy).start, start, `${id} ${gy}`);
  pin('roshHashanah', 2026, '2026-09-12'); pin('yomKippur', 2026, '2026-09-21'); pin('sukkot', 2026, '2026-09-26');
  pin('chanukah', 2026, '2026-12-05'); pin('purim', 2026, '2026-03-03'); pin('pesach', 2026, '2026-04-02'); pin('shavuot', 2026, '2026-05-22'); pin('tishaBav', 2026, '2026-07-23');
  pin('roshHashanah', 2027, '2027-10-02'); pin('pesach', 2027, '2027-04-22'); pin('chanukah', 2027, '2027-12-25');
  pin('roshHashanah', 2028, '2028-09-21'); pin('pesach', 2028, '2028-04-11'); pin('purim', 2027, '2027-03-23'); // 2027 is a leap year: Purim in Adar II
  assert.equal(holidayDates('pesach', 2026).eve, '2026-04-01'); assert.equal(holidayDates('pesach', 2026).end, '2026-04-09');
});

test('Easter, Orthodox Easter, the US rules, and the tabular Islamic dates', () => {
  assert.equal(holidayDates('easter', 2026).start, '2026-04-05'); assert.equal(holidayDates('easter', 2027).start, '2027-03-28'); assert.equal(holidayDates('easter', 2028).start, '2028-04-16');
  assert.equal(holidayDates('orthodoxEaster', 2026).start, '2026-04-12'); assert.equal(holidayDates('orthodoxEaster', 2027).start, '2027-05-02'); assert.equal(holidayDates('orthodoxEaster', 2028).start, '2028-04-16');
  assert.equal(holidayDates('thanksgiving', 2026).start, '2026-11-26'); assert.equal(holidayDates('thanksgiving', 2027).start, '2027-11-25');
  assert.equal(holidayDates('memorialDay', 2026).start, '2026-05-25'); assert.equal(holidayDates('laborDay', 2026).start, '2026-09-07');
  assert.equal(holidayDates('ramadan', 2026).start, '2026-02-18'); assert.equal(holidayDates('eidFitr', 2026).start, '2026-03-20'); assert.equal(holidayDates('eidAdha', 2026).start, '2026-05-27');
  assert.ok(holidayDates('ramadan', 2026).approx, 'Islamic dates are marked about');
  assert.ok(!holidayDates('pesach', 2026).approx);
});

test('only the ticked sets show, in date order; every set has at least one starter block', () => {
  const list = holidaysOf({ jewish: true, us: true }, 2026);
  assert.ok(list.every(d => ['jewish', 'us'].includes(d.set)));
  assert.deepEqual(list.map(d => d.start), [...list.map(d => d.start)].sort());
  assert.deepEqual(holidaysOf({}, 2026), []);
  for (const s of HOLIDAY_SETS) assert.ok(s.holidays.some(x => x.block), `${s.id} has a starter block`);
});

test('a holiday block re-dates itself: next Pesach from Nov 2026 is April 2027, and in May 2027 it is April 2028', () => {
  assert.equal(nextHoliday('pesach', now).start, '2027-04-22');
  assert.equal(holidayYm('pesach', now), '2027-04');
  assert.equal(holidayYm('pesach', new Date('2027-05-01T00:00:00Z')), '2028-04');
  assert.equal(holidayYm('pesach', new Date('2027-04-25T00:00:00Z')), '2027-04', 'still this year while it runs');
  assert.equal(holidayInMonth('chanukah', '2026-12').eve, '2026-12-04');
  assert.equal(holidayInMonth('pesach', '2026-12'), null);
  const s = home(st => st.add('event', { name: 'Pesach (food, cleaning, travel, guests)', amount: 1200, values: { holiday: 'pesach', month: '2027-04', day: 21 } }, { type: 'Holiday' }));
  const y = yearItems(s.doc.records, now);
  assert.equal(y.all.find(x => x.holiday === 'pesach').ym, '2027-04');
  const april = instances(s.doc, ref, '2027-04', { now });
  const ev = april.find(i => i.kind === 'event');
  assert.equal(ev.date, '2027-04-21', 'the block lands on the eve'); assert.equal(ev.planned, -1200);
  assert.ok(!instances(s.doc, ref, '2026-11', { now }).some(i => i.kind === 'event'));
});

test('Shabbat: a weekly line lands on each Thursday (cash), the markers sit on Friday and Saturday (use)', () => {
  const s = home(st => st.add('bill', { name: 'Shabbat (food, guests, flowers)', amount: 150, per: 'week', values: { category: 'Groceries', draftt: 'Food', amountType: 'Variable', timing: 'Weekly', weekday: 4 } }));
  const nov = instances(s.doc, ref, '2026-11', { now }).filter(i => i.kind === 'bill');
  assert.deepEqual(nov.map(i => i.date), ['2026-11-05', '2026-11-12', '2026-11-19', '2026-11-26']);
  const monthly = 150 * 52 / 12;
  assert.ok(Math.abs(nov.reduce((t, i) => t - i.planned, 0) - monthly) < 0.01, 'the month adds up to the weekly amount times 52/12');
  assert.deepEqual(weekdayDays('2026-11', 4), ['2026-11-05', '2026-11-12', '2026-11-19', '2026-11-26']);
  assert.deepEqual(shabbatDays('2026-11').map(x => x.friday), ['2026-11-06', '2026-11-13', '2026-11-20', '2026-11-27']);
  const marks = calendarMarkers(s.doc, ref, '2026-11', { now });
  const shabbat = marks.filter(m => m.kind === 'shabbat');
  assert.equal(shabbat.length, 8); // 4 Fridays and 4 Saturdays
  assert.ok(shabbat.some(m => m.date === '2026-11-06' && /sundown/.test(m.name)));
});

test('holiday markers: Chanukah in Dec 2026 with its eve, Pesach ends, nothing when no set is ticked', () => {
  const s = home(() => {});
  const dec = calendarMarkers(s.doc, ref, '2026-12', { now }).filter(m => m.kind === 'holiday');
  assert.ok(dec.some(m => m.date === '2026-12-04' && /Chanukah begins at sundown/.test(m.name)));
  assert.ok(dec.some(m => m.date === '2026-12-05' && m.name === 'Chanukah'));
  assert.ok(dec.some(m => m.date === '2026-12-12' && /Chanukah ends/.test(m.name)));
  assert.ok(!dec.some(m => /Christmas/.test(m.name)), 'Christian set is off');
  assert.deepEqual(holidaysInMonth({ jewish: true }, '2026-04').map(d => d.id), ['pesach']);
  s.setDoc('profile', { calendars: {} });
  assert.equal(calendarMarkers(s.doc, ref, '2026-12', { now }).filter(m => m.kind === 'holiday' || m.kind === 'shabbat').length, 0);
});
