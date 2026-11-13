// SPDX-License-Identifier: AGPL-3.0-only
// The books (js/book.js): debts sorted by kind, each row asking the plan's few things first, the rest behind More.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { answer, progressOf } from '../js/journey.js';
import { DEBT_BOOK, bookOf, addRow, setField, setUnsure, removeRow, renameRow, fieldValue } from '../js/book.js';
import { levelsOf } from '../js/sharpen.js';
import { AREAS as FIELDS } from '../js/registry/fields.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date(2026, 10, 13);
const fresh = () => { const s = new Store(newHousehold({ name: 'Me' })); s.setDoc('profile', { birthYear: 1996 }); return s; };
const sec = (s, id) => bookOf(s.doc, DEBT_BOOK, { now }).sections.find(x => x.id === id);
const F = (secId, id) => { const x = DEBT_BOOK.sections.find(z => z.id === secId); return [...x.front, ...x.more].find(f => f.id === id); };

test('five sections, each with its own add button and a few things up front', () => {
  assert.deepEqual(DEBT_BOOK.sections.map(s => s.id), ['cards', 'student', 'car', 'home', 'other']);
  for (const s of DEBT_BOOK.sections) { assert.ok(s.add && s.title && s.front.length <= 4 && s.more.length >= 3, s.id); for (const f of [...s.front, ...s.more]) assert.ok(f.label && ['money', 'pct', 'pick'].includes(f.type), `${s.id}.${f.id}`); }
});

test('every field a book writes is one the coach app already keeps on a debt', () => {
  const debt = FIELDS.find(g => g.id === 'debt'), keys = new Set(debt.fields.map(f => f.key));
  for (const s of DEBT_BOOK.sections) for (const f of [...s.front, ...s.more]) { if (f.top || f.id === 'promo') continue; assert.ok(keys.has(f.id), `${s.id}.${f.id} is not a registered debt field`); }
  assert.ok(keys.has('promoApr') && keys.has('promoEnd'));
  for (const t of DEBT_BOOK.sections.flatMap(s => s.types)) assert.ok(debt.types.debt.includes(t), t);
});

test('adding cards one at a time: each is its own row, and question 5 counts as answered', () => {
  const s = fresh();
  assert.equal(progressOf(s.doc, ref, { now }).answered.card, false);
  const a = addRow(s, DEBT_BOOK, 'cards'); setField(s, a.id, F('cards', 'balance'), 2500, { now });
  const b = addRow(s, DEBT_BOOK, 'cards'); setField(s, b.id, F('cards', 'balance'), 700, { now });
  const loan = addRow(s, DEBT_BOOK, 'student'); setField(s, loan.id, F('student', 'balance'), 20000, { now });
  assert.deepEqual(sec(s, 'cards').rows.map(r => [r.name, r.main]), [['Card 1', 2500], ['Card 2', 700]]);
  assert.equal(sec(s, 'cards').total, 3200); assert.equal(sec(s, 'student').total, 20000);
  assert.equal(bookOf(s.doc, DEBT_BOOK, { now }).total, 23200);
  assert.equal(progressOf(s.doc, ref, { now }).answered.card, true);
  assert.deepEqual(sec(s, 'cards').rows[0].todo, ['apr', 'payment']); // the plan still wants a rate and a payment
});

test('a total typed earlier becomes the first card when a second is added', () => {
  const s = fresh(); answer(s, 'card', { 'Credit card': 3200 });
  assert.equal(sec(s, 'cards').rows[0].name, 'Credit cards (total)');
  addRow(s, DEBT_BOOK, 'cards');
  assert.deepEqual(sec(s, 'cards').rows.map(r => r.name), ['Card 1', 'Card 2']);
});

test('a rate: typed is known, Not sure lets a typical one stand in, and level 3 is done when each has a rate and a payment', () => {
  const s = fresh(); const a = addRow(s, DEBT_BOOK, 'cards'); setField(s, a.id, F('cards', 'balance'), 2500, { now });
  setUnsure(s, a.id, F('cards', 'apr'));
  assert.deepEqual(sec(s, 'cards').rows[0].guessed, ['apr']); assert.deepEqual(sec(s, 'cards').rows[0].todo, ['payment']);
  assert.equal(levelsOf(s.doc).find(l => l.id === 'owe').state, 'open');
  setField(s, a.id, F('cards', 'apr'), 0.22, { now }); setField(s, a.id, F('cards', 'payment'), 100, { now });
  const r = s.get(a.id);
  assert.equal(r.values.apr, 0.22); assert.equal(r.fieldStatus.apr, 'Know it'); assert.equal(r.values.payChoice, 'Custom');
  assert.equal(sec(s, 'cards').rows[0].ready, true);
  assert.equal(levelsOf(s.doc).find(l => l.id === 'owe').state, 'done');
});

test('more on tap: a 0% offer, a federal loan with a plan, and the extras are counted', () => {
  const s = fresh(); const a = addRow(s, DEBT_BOOK, 'cards'); setField(s, a.id, F('cards', 'balance'), 2500, { now });
  setField(s, a.id, F('cards', 'promo'), 12, { now });
  assert.equal(s.get(a.id).values.promoApr, 0); assert.equal(s.get(a.id).values.promoEnd, '2027-11');
  assert.equal(fieldValue(s.get(a.id), F('cards', 'promo'), now), 12);
  setField(s, a.id, F('cards', 'promo'), 0, { now }); assert.equal(s.get(a.id).values.promoEnd, null);
  const l = addRow(s, DEBT_BOOK, 'student'); setField(s, l.id, F('student', 'federal'), 'Federal', { now }); setField(s, l.id, F('student', 'plan'), 'IBR', { now }); setField(s, l.id, F('student', 'pslf'), 'Yes', { now });
  assert.equal(sec(s, 'student').rows[0].extras, 3);
  setField(s, l.id, F('student', 'federal'), 'Private', { now });
  assert.ok(!DEBT_BOOK.sections[1].more.filter(f => !f.when || f.when(s.get(l.id))).some(f => f.id === 'pslf')); // a private loan is not asked about federal plans
  renameRow(s, l.id, 'Sallie Mae loan'); assert.equal(sec(s, 'student').rows[0].name, 'Sallie Mae loan');
});

test('a car loan and a mortgage sit on the car and the home, as the coach app keeps them', () => {
  const s = fresh();
  const car = addRow(s, DEBT_BOOK, 'car'); setField(s, car.id, F('car', 'balance'), 12000, { now });
  assert.ok(s.get(car.id).linkedTo); assert.equal(s.doc.records.find(r => r.id === s.get(car.id).linkedTo).type, 'Car'); assert.equal(s.doc.profile.hasCar, true);
  const home = addRow(s, DEBT_BOOK, 'home'); setField(s, home.id, F('home', 'balance'), 300000, { now });
  assert.equal(s.doc.records.find(r => r.id === s.get(home.id).linkedTo).type, 'Home'); assert.equal(s.doc.profile.housing, 'Own');
  assert.equal(bookOf(s.doc, DEBT_BOOK, { now }).total, 312000);
  const second = addRow(s, DEBT_BOOK, 'car'); assert.equal(s.get(second.id).linkedTo ?? null, null); assert.equal(sec(s, 'car').rows.length, 2);
  removeRow(s, car.id);
  assert.equal(s.doc.records.find(r => r.kind === 'asset' && r.type === 'Car').values.financed, 'Paid off');
});

test('other debts: the kind is a tap, and it stays in the section', () => {
  const s = fresh(); const o = addRow(s, DEBT_BOOK, 'other');
  setField(s, o.id, F('other', 'type'), 'Medical', { now }); setField(s, o.id, F('other', 'balance'), 900, { now });
  assert.equal(s.get(o.id).type, 'Medical'); assert.equal(sec(s, 'other').rows[0].main, 900);
  removeRow(s, o.id); assert.equal(bookOf(s.doc, DEBT_BOOK, { now }).count, 0);
});
