// Batch 57 (Eli, Nov 6: "quantity versus quality"): the Picture % splits into Answered (how much is in) and Solid
// (how much of it is from a statement or known for sure); session 1's pace reads Answered, sessions 2 on read Solid.
// Synthetic households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { pictureOf, answeredSolidOf, barKeyOf } from '../js/math/picture.js';
import { programOf, snapshotNumbers, autoChecks } from '../js/program.js';
import { askNextOf } from '../js/math/nextbest.js';
import { GLOSSARY } from '../js/glossary.js';
import { mathById } from '../js/registry/math.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-06T12:00:00Z');
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);

// Age (1) and About you (1) Know it, take-home (3) and the card balance (3) typed, the card APR (1) Will get it,
// checking (3) Roughly, the gut spending number (6). Total weight 18.
function household() {
  const s = new Store(newHousehold({ name: 'Synthetic', now: now.toISOString() }), { now: () => now.toISOString() });
  s.setDoc('profile', { birthYear: 1996, state: 'NY', household: 'Solo', areas: { cash: true, investments: false, real: false, debt: true } });
  s.add('income', { name: 'Take-home pay', amount: 4000, per: 'month', values: { basis: 'Take-home' } }, { type: 'Job' });
  const card = s.add('debt', { name: 'Card', values: { balance: 4200, payment: 120 } }, { type: 'Credit card' });
  s.setFieldStatus(card.id, 'apr', 'Will email');
  const chk = s.add('account', { name: 'Checking', values: { group: 'cash', balance: 400 } }, { type: 'Checking' });
  s.setFieldStatus(chk.id, 'balance', 'Roughly');
  const gut = s.add('spending', { name: 'All in', amount: 2800 }, { type: 'All in' });
  return { s, card, chk, gut };
}

test('Answered and Solid, by hand: answered is the weight with any answer, solid the share of it at Estimate or Actual; the blend is unchanged', () => {
  const { s, card, chk, gut } = household();
  let p = pictureOf(s.doc, ref, { now });
  assert.deepEqual(p.items.map(i => [i.label, i.weight, i.level, i.answered]), [
    ['Age', 1, 100, true], ['What you have today (About you)', 1, 100, true], ['Take-home pay', 3, 100, true],
    ['Card balance', 3, 100, true], ['Card APR', 1, 0, false], ['Checking balance', 3, 50, true], ['Monthly spending (the gut number)', 6, 25, true]]);
  near(p.answered, 17 / 18); // everything but the APR's 1
  near(p.solid, 8 / 17); // age, About you, take-home, the balance: 1 + 1 + 3 + 3 of the 17 answered
  near(p.pct, (100 + 100 + 300 + 300 + 0 + 150 + 150) / 1800); // the old blend, still there for whoever reads it
  assert.deepEqual(p.counts, { of: 7, answered: 6, solid: 4 });
  assert.deepEqual(p.bar.map(b => [b.key, b.count, b.weight]), [['know', 4, 8], ['statement', 0, 0], ['rough', 1, 3], ['gut', 1, 6], ['missing', 1, 1]]);
  near(p.bar.reduce((t, b) => t + b.share, 0), 1);
  // The APR comes back from the homework: answered 18 of 18; solid 9 of 18.
  s.update(card.id, { apr: 0.249 }); s.setFieldStatus(card.id, 'apr', null);
  p = pictureOf(s.doc, ref, { now });
  near(p.answered, 1); near(p.solid, 9 / 18);
  // The gut number read off statements counts at Estimate, so it is solid (a statement or app).
  s.update(gut.id, { pass: 'Statements' });
  p = pictureOf(s.doc, ref, { now });
  near(p.solid, 15 / 18);
  assert.equal(p.bar.find(b => b.key === 'statement').count, 1);
  // Will get it on a box that has a number: not answered (the blend still gives it a guess's credit).
  s.setFieldStatus(chk.id, 'balance', 'Will email');
  p = pictureOf(s.doc, ref, { now });
  near(p.answered, 15 / 18); near(p.solid, 1);
  assert.equal(barKeyOf(p.items.find(i => i.label === 'Checking balance')), 'missing');
  // Not now, too.
  s.setFieldStatus(chk.id, 'balance', 'Not now');
  near(pictureOf(s.doc, ref, { now }).answered, 15 / 18);
  // An empty household: nothing answered, nothing solid.
  const e = pictureOf(newHousehold({ name: 'E', now: now.toISOString() }), ref, { now });
  assert.equal(e.answered, 0); assert.equal(e.solid, 0);
  assert.deepEqual(answeredSolidOf([]).counts, { of: 0, answered: 0, solid: 0 });
});

test('a category from lines is answered when any line is; solid when the lines average Estimate or better', () => {
  const { s } = household();
  const rent = s.add('bill', { name: 'Rent', amount: 1500, values: { category: 'Rent or mortgage', draftt: 'Accommodation' } });
  const food = s.add('bill', { name: 'Groceries', amount: 400, values: { category: 'Groceries', draftt: 'Food' } });
  s.setFieldStatus(food.id, 'amount', 'Will email');
  s.setDoc('spending', { source: 'lines' });
  const p = pictureOf(s.doc, ref, { now });
  const cat = id => p.items.find(i => i.id === id);
  assert.equal(cat('draftt:Accommodation').answered, true); assert.equal(cat('draftt:Accommodation').solid, true);
  assert.equal(cat('draftt:Food').answered, false, 'its one line is on the homework list');
  assert.ok(rent.id);
});

test('the pace reads Answered in session 1 and Solid from session 2; the session 3 item needs both at 95%', () => {
  const { s, card, chk, gut } = household();
  let P = programOf(s.doc, ref, { now });
  assert.equal(P.n, 1); assert.equal(P.pace.measure, 'answered'); assert.equal(P.pace.points, 94);
  assert.equal(P.pace.text, 'Session 1: answered 94%; 95% expected by the end of it');
  s.setDoc('session', { ...(s.doc.session || {}), count: 1 }); // as if session 1 had ended
  P = programOf(s.doc, ref, { now });
  assert.equal(P.n, 2); assert.equal(P.pace.measure, 'solid'); assert.equal(P.pace.points, 47); assert.equal(P.pace.word, 'Catch up');
  assert.equal(P.pace.text, 'Session 2: solid 47%; 60% was expected by now, 95% by the end of it');
  // Everything firmed up: the session 3 check reads both halves.
  s.update(card.id, { apr: 0.249 }); s.setFieldStatus(card.id, 'apr', null); s.setFieldStatus(chk.id, 'balance', null); s.update(gut.id, { pass: 'Statements' });
  assert.equal(autoChecks(s.doc, ref, { now }).picture90, true);
  s.setFieldStatus(chk.id, 'balance', 'Will email'); // solid 100 but answered 83: not yet
  assert.equal(autoChecks(s.doc, ref, { now }).picture90, false);
});

test('snapshots keep Answered and Solid beside the blend; the Program report and Ask next use the two words', () => {
  const { s } = household();
  const n = snapshotNumbers(s.doc, ref, { now });
  near(n.pictureAnswered, 17 / 18); near(n.pictureSolid, 8 / 17); assert.ok(n.picturePct > 0);
  const A = askNextOf(s.doc, ref, { now });
  for (const q of A.questions) {
    assert.ok(['answered', 'solid'].includes(q.adds), q.question);
    assert.match(q.addsWords, q.adds === 'solid' ? /raises Solid$/ : /raises Answered$/);
  }
  const apr = A.questions.find(q => /APR/.test(q.label));
  if (apr) assert.equal(apr.adds, 'answered');
  const gutQ = A.questions.find(q => q.kind === 'spending');
  if (gutQ) assert.equal(gutQ.adds, 'solid', 'the gut number is in: reading it off a statement firms it up');
  assert.ok(GLOSSARY.Answered && GLOSSARY.Solid);
  const m = mathById('M73');
  assert.ok(m.parts.some(x => x.key === 'answered') && m.parts.some(x => x.key === 'solid'));
});
