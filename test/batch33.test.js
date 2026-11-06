// Batch 33: the Rocket Surgery majors left open by Batch 20 (QUESTIONS 287 to 291, findings 12, 17, 18, 22, 23).
// A raise in one tap (js/math/raise.js), the shortfall on Current vs Proposed, the gut split at Month end, one
// typical amount on both Budget passes, a Living together couple's own FOO, Scorecard and Transitions, and the
// read-only Both preview.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importFile, Store } from '../js/records.js';
import { metrics } from '../js/math/metrics.js';
import { foo } from '../js/math/foo.js';
import { raiseOf } from '../js/math/raise.js';
import { compareOf, shortfallOwed } from '../js/math/proposed.js';
import { monthView, closeMonth } from '../js/month.js';
import { groupTypicalOf, categoryTypicalOf } from '../js/math/spending.js';
import { ownPlanPerson, setBothScreen, bothPreviewOn } from '../js/registry/couples.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00.000Z'); // the personas' moment
const load = id => importFile(readFileSync(new URL(`../fixtures/personas/${id}.json`, import.meta.url), 'utf8'));
const income = (doc, id) => metrics(doc, ref, { now }).inputs.income.find(i => i.r.id === id);

test('a raise: Tom (Given as Both) +10% sets the gross and works out the take-home with the tax math', () => {
  const doc = load('tom');
  const job = doc.records.find(r => r.kind === 'income' && r.values.basis === 'Both');
  const o = raiseOf(doc, ref, job.id, 0.1, { now });
  assert.equal(o.patch.gross, Math.round(job.values.gross * 1.1));
  assert.ok(o.takeHomeAfter > o.takeHomeBefore && o.takeHomeAfter - o.takeHomeBefore < o.grossAfter / 12 - o.grossBefore / 12); // tax takes some of it
  // The patched row reads the same take-home the math worked out.
  Object.assign(job, { amount: o.patch.amount }); job.values.gross = o.patch.gross;
  assert.ok(Math.abs(income(doc, job.id).takeHome.value - o.takeHomeAfter) < 1);
});

test('a raise on a take-home row and on a gross row keeps the row as it is given', () => {
  const doc = load('maya');
  const job = doc.records.find(r => r.kind === 'income');
  const o = raiseOf(doc, ref, job.id, 0.05, { now });
  assert.deepEqual(Object.keys(o.patch), ['amount']); // a take-home row: only the take-home changes
  assert.ok(o.patch.amount > job.amount);
  job.values.basis = 'Gross'; job.amount = 90000; job.per = 'year';
  const g = raiseOf(doc, ref, job.id, 0.03, { now });
  assert.equal(g.patch.amount, 92700);
  assert.equal(raiseOf(doc, ref, job.id, 0, { now }), null);
});

test('Current vs Proposed: a $400 a month shortfall is card borrowing, so closing the gap shows in net worth', () => {
  const doc = load('deficit');
  let c = compareOf(doc, ref, { now });
  assert.equal(c.current.shortfall.monthly, 400);
  assert.ok(c.current.shortfall.apr > 0.2);
  doc.program = { ...(doc.program || {}), proposed: { extraIncome: 400 } };
  c = compareOf(doc, ref, { now });
  const nw5 = c.rows.find(r => r.key === 'nw5');
  assert.equal(c.proposed.shortfall.monthly, 0);
  assert.ok(nw5.proposed - nw5.current > 20000, 'five years of a $400 gap on the card is not the same net worth');
  assert.ok(c.rows.find(r => r.key === 'nw5').how.current.some(t => /shortfall goes on the card/.test(t)));
  assert.equal(Math.round(shortfallOwed(100, 0.12, 12)), 1268); // $100 a month at 1% a month for a year
});

test('Month end for a gut-only client closes the gut-only categories against their gut split', () => {
  const doc = load('maya');
  const v = monthView(doc, ref, '2026-11', { now, gutCats: true });
  const cats = v.rows.filter(r => r.gutCat);
  assert.ok(cats.length >= 2, 'Food and Transportation at least');
  assert.ok(Math.abs(v.totals.estimate - v.gut) < 1, 'the lines and the split add up to the gut number (no debt in it)');
  // The split matches the Plan pass's Use typical for Food (the same scaled typicals, QUESTIONS 290).
  const scale = metrics(doc, ref, { now }).inputs.typicalScale;
  const food = cats.find(r => r.gutCat === 'Food');
  assert.ok(Math.abs(food.estimate - categoryTypicalOf(doc.records.filter(r => r.kind === 'bill'), 'Food', scale)) <= 10);
  // A typed actual on the category closes with it; the others close at $0.
  const s = new Store(doc, { now: () => now });
  s.setIn('spending', ['months', '2026-11', 'lines', food.line.id, 'actual'], 400);
  closeMonth(s, ref, '2026-11', { now });
  const after = monthView(s.doc, ref, '2026-11', { now, gutCats: true });
  assert.equal(after.rows.find(r => r.gutCat === 'Food').actual, 400);
  assert.equal(after.closed, true);
  assert.ok(after.rows.filter(r => r.gutCat).every(r => r.actual != null));
  // Without gutCats (the Budget's own view) nothing changes.
  assert.ok(!monthView(doc, ref, '2026-11', { now }).rows.some(r => r.gutCat));
});

test('the Actual pass note uses the same scaled typical as the Plan pass', () => {
  const doc = load('maya');
  const x = metrics(doc, ref, { now }).inputs;
  const food = doc.records.filter(r => r.kind === 'bill' && r.values.draftt === 'Food' && !r.values.irregular);
  assert.equal(groupTypicalOf(food, { categories: x.categories, scale: x.typicalScale }), categoryTypicalOf(food, 'Food', x.typicalScale));
});

test('Living together: FOO, Scorecard and Transitions follow the person switch', () => {
  const doc = load('couple-separate');
  const me = foo(doc, ref, { now }).steps.find(s => s.id === '3');
  doc.settings.person = 'Partner';
  const sam = foo(doc, ref, { now }).steps.find(s => s.id === '3');
  assert.equal(sam.status, 'Done', "Sam has no heavy debt; Jordan's card is Jordan's");
  assert.notEqual(me.status, 'Done');
});

test('Both (preview): household numbers only on a screen that offers it, and the store puts edits back', () => {
  const doc = load('couple-separate');
  doc.settings.person = 'all';
  assert.equal(ownPlanPerson(doc), 'Me'); // anywhere else Both reads as this client
  setBothScreen(true);
  try {
    assert.equal(ownPlanPerson(doc), null);
    assert.ok(bothPreviewOn(doc));
    const s = new Store(doc, { now: () => now });
    s.readOnly = (a, b) => JSON.stringify({ ...a, settings: { ...a.settings, person: null } }) !== JSON.stringify({ ...b, settings: { ...b.settings, person: null } });
    const before = JSON.stringify(s.doc.records), seen = [];
    s.subscribe(c => seen.push(c.type));
    s.update(s.doc.records[0].id, { amount: 1 });
    assert.equal(JSON.stringify(s.doc.records), before);
    assert.equal(s.canUndo, false);
    assert.deepEqual(seen, ['readonly']);
    s.setDoc('settings', { person: 'Me' }); // the switch itself still works
    assert.equal(s.doc.settings.person, 'Me');
  } finally { setBothScreen(false); }
});
