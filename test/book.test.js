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

// ---------- what you have, what comes in, what goes out ----------
import { HAVE_BOOK, IN_BOOK, OUT_BOOK, BOOKS } from '../js/book.js';
import { metrics } from '../js/math/metrics.js';
const five = () => { const s = fresh(); for (const [k, v] of [['income', { takeHome: 4200 }], ['spending', { gut: 3100 }], ['cash', { checking: 2500, savings: 4000 }], ['invested', { invested: 18000 }], ['card', { 'Credit card': 3200 }]]) answer(s, k, v); return s; };
const G = (book, secId, id) => { const x = book.sections.find(z => z.id === secId); return [...x.front, ...x.more].find(f => f.id === id); };
const S = (s, book, id) => bookOf(s.doc, book, { now }).sections.find(x => x.id === id);

test('every book writes only fields the coach app keeps, on types it knows', () => {
  const area = { account: 'assets', income: 'income', bill: 'spending', debt: 'debt', asset: 'assets', coverage: 'protection' };
  for (const book of Object.values(BOOKS)) {
    const a = FIELDS.find(g => g.id === area[book.kind]), keys = new Set(a.fields.map(f => f.key)), types = a.types?.[book.kind] ?? [];
    for (const sec of book.sections) {
      for (const f of [...sec.front, ...sec.more]) { if (f.id === 'promo' || f.id === 'type') continue; assert.ok(keys.has(f.id), `${book.id}.${sec.id}.${f.id}`); assert.ok(f.type !== 'pick' || f.options.length >= 2, `${book.id}.${f.id} options`); }
      for (const t of sec.types) assert.ok(types.includes(t), `${book.id}: ${t}`);
      assert.ok(sec.front.length <= 4 && sec.add && sec.title, `${book.id}.${sec.id}`);
    }
  }
});

test('what you have: the accounts from the five questions show in their sections', () => {
  const s = five();
  assert.deepEqual(S(s, HAVE_BOOK, 'cash').rows.map(r => [r.type, r.main]), [['Checking', 2500], ['Savings', 4000]]);
  assert.deepEqual(S(s, HAVE_BOOK, 'open').rows.map(r => [r.type, r.main]), [['All investments', 18000]]);
  assert.deepEqual(S(s, HAVE_BOOK, 'open').rows[0].todo, ['type']); // it still wants to know what kind it is
  assert.equal(bookOf(s.doc, HAVE_BOOK, { now }).total, 24500);
});

test('listing accounts never counts money twice: the earlier total shrinks, then goes', () => {
  const s = five(), before = metrics(s.doc, ref, { now }).inputs.invested;
  const k = addRow(s, HAVE_BOOK, 'work'); setField(s, k.id, G(HAVE_BOOK, 'work', 'balance'), 9000, { now });
  assert.equal(s.get(k.id).values.group, 'investment'); assert.equal(s.get(k.id).type, '401(k)');
  assert.equal(s.doc.records.find(r => r.type === 'All investments').values.balance, 9000);
  assert.equal(metrics(s.doc, ref, { now }).inputs.invested, before);
  const r = addRow(s, HAVE_BOOK, 'ira'); setField(s, r.id, G(HAVE_BOOK, 'ira', 'balance'), 6000, { now });
  setField(s, k.id, G(HAVE_BOOK, 'work', 'balance'), 10000, { now }); // a correction moves the rest too
  assert.equal(s.doc.records.find(r2 => r2.type === 'All investments').values.balance, 2000);
  const b = addRow(s, HAVE_BOOK, 'open'); setField(s, b.id, G(HAVE_BOOK, 'open', 'balance'), 3000, { now });
  assert.equal(s.doc.records.some(r2 => r2.type === 'All investments'), false);
  assert.equal(metrics(s.doc, ref, { now }).inputs.invested, 19000);
  assert.equal(levelsOf(s.doc).find(l => l.id === 'accounts').state, 'done');
});

test('an account: the kind is a tap, and the extras are the coach app\'s own', () => {
  const s = fresh(); const a = addRow(s, HAVE_BOOK, 'cash');
  setField(s, a.id, G(HAVE_BOOK, 'cash', 'type'), 'High-yield savings (often online)', { now }); setField(s, a.id, G(HAVE_BOOK, 'cash', 'balance'), 8000, { now });
  setField(s, a.id, G(HAVE_BOOK, 'cash', 'apy'), 0.04, { now }); setField(s, a.id, G(HAVE_BOOK, 'cash', 'purpose'), 'Emergency', { now });
  const r = s.get(a.id); assert.equal(r.type, 'High-yield savings (often online)'); assert.equal(r.name, 'High-yield savings (often online)'); assert.equal(r.values.group, 'cash'); assert.equal(r.values.apy, 0.04);
  assert.equal(progressOf(s.doc, ref, { now }).answered.cash, true);
  const i = addRow(s, HAVE_BOOK, 'ira'); setField(s, i.id, G(HAVE_BOOK, 'ira', 'contribution'), 583, { now });
  assert.equal(s.get(i.id).values.contributionPer, 'Month');
});

test('what comes in: a second income adds to take-home', () => {
  const s = five(), before = metrics(s.doc, ref, { now }).inputs.takeHome;
  assert.deepEqual(S(s, IN_BOOK, 'jobs').rows.map(r => [r.main, r.per]), [[4200, 'a month']]);
  const side = addRow(s, IN_BOOK, 'side'); setField(s, side.id, G(IN_BOOK, 'side', 'amount'), 500, { now });
  assert.equal(s.get(side.id).type, 'Side hustle'); assert.equal(s.get(side.id).values.basis, 'Take-home'); assert.equal(s.get(side.id).per, 'month');
  assert.equal(Math.round(metrics(s.doc, ref, { now }).inputs.takeHome), Math.round(before + 500));
  setField(s, S(s, IN_BOOK, 'jobs').rows[0].id, G(IN_BOOK, 'jobs', 'contributionPct'), 0.06, { now });
  assert.equal(s.doc.records.find(r => r.kind === 'income').values.contributionPct, 0.06);
});

test('what goes out: lines sit beside the rough number until the person says to use them', () => {
  const s = five(), gut = metrics(s.doc, ref, { now }).inputs.spending;
  const rent = addRow(s, OUT_BOOK, 'housing'); renameRow(s, rent.id, 'Rent'); setField(s, rent.id, G(OUT_BOOK, 'housing', 'amount'), 1500, { now });
  const food = addRow(s, OUT_BOOK, 'food'); renameRow(s, food.id, 'Groceries'); setField(s, food.id, G(OUT_BOOK, 'food', 'amount'), 600, { now });
  const r = s.get(rent.id); assert.equal(r.kind, 'bill'); assert.equal(r.values.draftt, 'Accommodation'); assert.equal(r.values.category, 'Rent'); assert.equal(r.amount, 1500);
  assert.equal(S(s, OUT_BOOK, 'housing').total, 1500); assert.equal(bookOf(s.doc, OUT_BOOK, { now }).total, 2100);
  assert.equal(metrics(s.doc, ref, { now }).inputs.spending, gut); // still the rough number
  s.setDoc('spending', { source: 'lines' });
  const m2 = metrics(s.doc, ref, { now }).inputs; // the lines, plus the card's payment the engine adds as its own line
  assert.equal(m2.spending, m2.lineTotal); assert.ok(m2.spending >= 2100 && m2.spending < 2100 + 200, String(m2.spending));
  assert.equal(levelsOf(s.doc).find(l => l.id === 'where').state, 'open'); // getting around is still to come
  const t = addRow(s, OUT_BOOK, 'transport'); renameRow(s, t.id, 'Transit'); setField(s, t.id, G(OUT_BOOK, 'transport', 'amount'), 130, { now });
  assert.equal(levelsOf(s.doc).find(l => l.id === 'where').state, 'done');
});

import { OWN_BOOK, COVER_BOOK, whereOf, setSure } from '../js/book.js';
import { pictureOf } from '../js/math/picture.js';

test('things you own: a home and a car go on file the way level 7 puts them', () => {
  const s = five(), before = metrics(s.doc, ref, { now }).netWorth?.value;
  const home = addRow(s, OWN_BOOK, 'homes'); setField(s, home.id, G(OWN_BOOK, 'homes', 'value'), 400000, { now });
  assert.equal(home.type, 'Home'); assert.equal(s.doc.profile.housing, 'Own');
  const car = addRow(s, OWN_BOOK, 'cars'); setField(s, car.id, G(OWN_BOOK, 'cars', 'value'), 10000, { now });
  assert.equal(s.doc.profile.hasCar, true); assert.equal(bookOf(s.doc, OWN_BOOK, { now }).total, 410000);
  assert.equal(addRow(s, OWN_BOOK, 'homes').type, 'Other property');
  if (before != null) assert.equal(Math.round(metrics(s.doc, ref, { now }).netWorth.value - before), 410000);
  const loan = addRow(s, DEBT_BOOK, 'car'); assert.equal(s.get(loan.id).linkedTo, car.id); // a car loan added later lands on the same car
  removeRow(s, car.id); assert.equal(s.get(loan.id).linkedTo, null);
});

test('insurance: a yes or a no is an answer, and the cost is asked only on a yes', () => {
  const s = five(); const h = addRow(s, COVER_BOOK, 'health');
  assert.equal(h.kind, 'coverage'); assert.equal(h.type, 'Health');
  const row = () => S(s, COVER_BOOK, 'health').rows[0];
  assert.deepEqual(row().todo, ['have']);
  setField(s, h.id, G(COVER_BOOK, 'health', 'have'), "Don't", { now }); assert.equal(row().ready, true);
  setField(s, h.id, G(COVER_BOOK, 'health', 'have'), 'Have it', { now }); assert.deepEqual(row().todo, ['amount']);
  setField(s, h.id, G(COVER_BOOK, 'health', 'amount'), 250, { now }); assert.equal(row().main, 250); assert.equal(row().ready, true);
});

test('how sure: a guess, roughly or known moves the whole picture, and each piece knows where it is answered', () => {
  const s = five(), solid = () => pictureOf(s.doc, ref, { now }).solid;
  const a = solid(), inv = s.doc.records.find(r => r.type === 'All investments');
  setSure(s, inv.id, 'Know it'); assert.ok(solid() > a);
  setSure(s, inv.id, 'Not sure'); assert.ok(solid() < a + 1e-9);
  const P = pictureOf(s.doc, ref, { now });
  for (const it of P.items) { const w = whereOf(s.doc, it); assert.ok(['you', 'numbers', 'books'].includes(w.stage), `${it.id}: ${w.stage}`); if (w.stage === 'books') assert.ok(BOOKS[w.book], it.id); }
  assert.deepEqual(whereOf(s.doc, P.items.find(i => i.kind === 'gut')), { stage: 'numbers', q: 'spending' });
  assert.equal(whereOf(s.doc, P.items.find(i => i.recId === inv.id)).book, 'have');
});
