// SPDX-License-Identifier: AGPL-3.0-only
// The standalone pages' pure part (js/solo.js): the path, the carried link, and "debt free by", checked by hand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold, exportFile, importFile } from '../js/records.js';
import { DEBT_BOOK, addRow, setField, setUnsure } from '../js/book.js';
import { SOLO, soloOf, carryUrl, debtFreeOf, EXTRAS, ORDERS } from '../js/solo.js';
import { progressOf } from '../js/journey.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date(2026, 10, 14);
const F = (sec, id) => DEBT_BOOK.sections.find(s => s.id === sec).front.find(f => f.id === id);
const debt = (s, sec, balance, apr, payment) => { const r = addRow(s, DEBT_BOOK, sec); setField(s, r.id, F(sec, 'balance'), balance, { now }); if (apr != null) setField(s, r.id, F(sec, 'apr'), apr, { now }); if (payment != null) setField(s, r.id, F(sec, 'payment'), payment, { now }); return r; };
const fresh = () => new Store(newHousehold({ name: 'My plan' }));

test('the path: each standalone names the next, and the last is the whole plan', () => {
  assert.equal(SOLO[0].id, 'debt'); assert.equal(SOLO.at(-1).id, 'plan'); assert.equal(SOLO.at(-1).next, null);
  for (const s of SOLO.slice(0, -1)) { assert.ok(soloOf(s.next), s.id); assert.ok(s.nextLabel && s.title && s.page.endsWith('.html')); }
  assert.equal(carryUrl('plan', 'abc'), 'start.html#/open/abc'); assert.equal(carryUrl('debt', 'abc'), 'debt.html#/d/abc'); assert.equal(carryUrl('nope', 'abc'), null);
});

test('nothing owed yet: no date, and the page can say so', () => {
  assert.deepEqual(debtFreeOf(fresh().doc, ref, { now }), { ready: false, count: 0, total: 0 });
});

test('one debt at 0%: $1,200 at $100 a month is 12 months, gone Nov 2027, no interest', () => {
  const s = fresh(); debt(s, 'other', 1200, 0, 100);
  const R = debtFreeOf(s.doc, ref, { now });
  assert.equal(R.months, 12); assert.equal(R.date, 'Nov 2027'); assert.equal(Math.round(R.interest), 0); assert.equal(R.total, 1200); assert.equal(R.payments, 100); assert.equal(R.never, false);
  assert.equal(R.other, null); assert.equal(R.saved, null); assert.deepEqual(R.standIns, []);
});

test('one card at 12%: $1,000 at $100 a month, by hand', () => {
  // month by month at 1% a month: 1000 -> 910 -> 819.10 -> 727.29 -> 634.56 -> 540.91 -> 446.32 -> 350.78 -> 254.29 -> 156.83 -> 58.40 -> 0 (11 payments; the last is 58.98)
  const s = fresh(); debt(s, 'cards', 1000, 0.12, 100);
  const R = debtFreeOf(s.doc, ref, { now });
  assert.equal(R.months, 11); assert.equal(R.date, 'Oct 2027'); assert.ok(Math.abs(R.interest - 58.98) < 0.05, String(R.interest));
});

test('extra money: the same card with $100 more is gone in 6 months, and says what that kept', () => {
  const s = fresh(); debt(s, 'cards', 1000, 0.12, 100);
  const R = debtFreeOf(s.doc, ref, { extra: 100, now }); // 1000 -> 810 -> 618.10 -> 424.28 -> 228.52 -> 30.81 -> 0
  assert.equal(R.months, 6); assert.equal(R.saved.months, 5); assert.ok(R.saved.interest > 25 && R.saved.interest < 30, String(R.saved.interest));
});

test('two debts: highest rate first costs less; smallest first clears one sooner', () => {
  const s = fresh(); debt(s, 'cards', 5000, 0.25, 150); debt(s, 'other', 800, 0.05, 50);
  const A = debtFreeOf(s.doc, ref, { extra: 200, order: 'avalanche', now }), S = debtFreeOf(s.doc, ref, { extra: 200, order: 'snowball', now });
  assert.equal(A.first, 'Card 1'); assert.equal(S.first, 'Debt');
  assert.ok(A.interest < S.interest); assert.ok(S.firstWin < A.firstWin);
  assert.ok(Math.abs(A.other.moreInterest - (S.interest - A.interest)) < 1e-6); assert.equal(A.other.order, 'snowball');
  assert.equal(A.debts.length, 2); assert.ok(A.debts[0].month <= A.debts[1].month); assert.ok(A.debts.every(d => /^[A-Z][a-z]{2} 20\d\d$/.test(d.date)));
});

test('stand-ins are named: a rate marked not sure takes the typical one, a missing payment takes the minimum', () => {
  const s = fresh(); const c = debt(s, 'cards', 3000, null, null); setUnsure(s, c.id, F('cards', 'apr'));
  const R = debtFreeOf(s.doc, ref, { now });
  assert.deepEqual(R.standIns.map(x => x.what), ['rate', 'payment']); assert.equal(R.standIns[0].value, ref.typicalRates['Credit card']);
  assert.ok(R.ready && R.total === 3000);
});

test('payments that never win are said plainly, and extra fixes it', () => {
  const s = fresh(); debt(s, 'cards', 10000, 0.3, 200); // interest alone is 250 a month
  assert.equal(debtFreeOf(s.doc, ref, { now }).never, true);
  assert.equal(debtFreeOf(s.doc, ref, { extra: 250, now }).never, false);
});

test('carried forward: the same file opens in the whole plan with question 5 already answered', () => {
  const s = fresh(); debt(s, 'cards', 5000, 0.25, 150); s.setDoc('settings', { start: { soloExtra: 100 } });
  const there = new Store(importFile(JSON.stringify(exportFile(s.doc))));
  there.setDoc('profile', { birthYear: 1994 });
  const p = progressOf(there.doc, ref, { now });
  assert.equal(p.answered.card, true); assert.equal(p.answered.income, false);
  assert.equal(debtFreeOf(there.doc, ref, { extra: 100, now }).date, debtFreeOf(s.doc, ref, { extra: 100, now }).date);
});

test('the choices on the page', () => { assert.deepEqual(EXTRAS, [0, 50, 100, 250, 500]); assert.deepEqual(ORDERS.map(o => o[0]), ['avalanche', 'snowball']); });
