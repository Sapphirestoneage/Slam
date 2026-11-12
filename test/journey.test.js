// SPDX-License-Identifier: AGPL-3.0-only
// The self-serve journey (js/journey.js, start.html): a plan from an age, five answers that are never asked twice,
// toggles that write fields the coach app already has, and a credit for every idea.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { STAGES, QUESTIONS, progressOf, onFile, answer, quickPicks, planOf, movedWords, numbersOf, tweaksOf, setTweak, resetTweaks, previewTweak, whatIf } from '../js/journey.js';
import { SOURCES, IDEAS, ideaOf, creditWords } from '../js/registry/credits.js';
import { metrics } from '../js/math/metrics.js';

const read = f => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url)));
const ref = read('reference-2026.json'), priors = read('priors-2026.json'), flags = read('flags.json');
const now = new Date(2026, 10, 12);
const person = (birthYear = 2001) => { const s = new Store(newHousehold({ name: 'Me' })); s.setDoc('profile', { birthYear, state: 'NY', nyc: true }); return s; };
const ANSWERS = { income: { takeHome: 4200 }, spending: { gut: 3100 }, cash: { checking: 2500, savings: 4000 }, invested: { invested: 18000 }, card: { 'Credit card': 3200 } };
const full = () => { const s = person(); for (const q of QUESTIONS) answer(s, q.key, ANSWERS[q.key]); return s; };

test('no age, no plan; an age alone gives a plan labeled typical', () => {
  const blank = new Store(newHousehold({ name: 'Me' }));
  assert.equal(planOf(blank.doc, ref, priors, { flags, now }), null);
  assert.equal(progressOf(blank.doc, ref, { now }).hasAge, false);
  const p = planOf(person().doc, ref, priors, { flags, now });
  assert.equal(p.basis, 'typical');
  assert.match(p.label, /^Typical for/);
  assert.ok(p.words.fi && p.words.surplus && p.step && p.milestones.length);
  for (const q of QUESTIONS) assert.ok(quickPicks(p, q.key).length >= 1, `${q.key} has a one-tap amount`);
});

test('each answer is saved once, read back, and never asked again', () => {
  const s = person();
  let p = planOf(s.doc, ref, priors, { flags, now });
  QUESTIONS.forEach((q, i) => {
    assert.equal(progressOf(s.doc, ref, { now }).next, q.key);
    assert.equal(answer(s, q.key, {}), false, 'nothing typed saves nothing');
    assert.equal(answer(s, q.key, ANSWERS[q.key]), true);
    const after = planOf(s.doc, ref, priors, { flags, now });
    assert.ok(movedWords(p, after), `answer ${i + 1} says what moved`);
    p = after;
    for (const [k, v] of Object.entries(ANSWERS[q.key])) assert.equal(onFile(s.doc, q.key)[k], v);
  });
  const done = progressOf(s.doc, ref, { now });
  assert.deepEqual([done.count, done.next, done.done], [5, null, true]);
  assert.equal(p.basis, 'yours');
  assert.equal(p.typical, 0);
  // the journey's numbers are the coach app's numbers: the same file, the same engine
  assert.equal(p.fi.months, metrics(s.doc, ref, { now }).monthsToFi.value);
  assert.equal(s.doc.records.filter(r => r.kind === 'income').length, 1);
  answer(s, 'income', { takeHome: 4500 });
  assert.equal(s.doc.records.filter(r => r.kind === 'income').length, 1, 'a change edits the row, it does not add one');
});

test('the one-tap none answers count as answered', () => {
  const s = person(1990);
  for (const k of ['cash', 'invested', 'card']) answer(s, k, {}, { none: true });
  const p = progressOf(s.doc, ref, { now });
  assert.deepEqual([p.answered.cash, p.answered.invested, p.answered.card, p.count], [true, true, true, 3]);
  assert.deepEqual(onFile(s.doc, 'card'), { 'Credit card': 0, 'Student loan': 0, 'Personal loan': 0 });
});

test('the plan has one next step, milestones in order, and plain words', () => {
  const p = planOf(full().doc, ref, priors, { flags, now });
  assert.equal(p.step.name, 'Pay off high-interest debt');
  assert.equal(p.steps.filter(x => x.status === 'You are here').length, 1);
  const open = p.milestones.filter(x => !x.done);
  assert.deepEqual(open.map(x => x.months), [...open.map(x => x.months)].sort((a, b) => a - b));
  assert.ok(p.wins >= 1 && p.milestones.slice(0, p.wins).every(x => x.done));
  assert.equal(p.milestones.filter(x => /^heavy(25|50|75)$/.test(x.id)).length, 1, 'one debt quarter at a time');
  for (const x of p.milestones) assert.doesNotMatch(`${x.name} ${x.what}`, /client|Day 0|APR|\u2014/);
});

test('every number has a value or a question to answer, and every idea a credit', () => {
  const s = full(), p = planOf(s.doc, ref, priors, { flags, now });
  const nums = numbersOf(p, s.doc, ref, { now });
  assert.ok(nums.length >= 15);
  for (const n of nums) { assert.ok(n.value, `${n.label} has a value`); assert.equal(n.typical, false); if (n.idea) assert.ok(ideaOf(n.idea), n.idea); }
  const half = person(); answer(half, 'income', ANSWERS.income);
  assert.ok(numbersOf(planOf(half.doc, ref, priors, { flags, now }), half.doc, ref, { now }).some(n => n.typical), 'a number on a typical amount says so');
  for (const i of IDEAS) {
    assert.ok(i.by.length && i.by.every(k => SOURCES[k]), i.id);
    assert.ok(creditWords(i.id));
    if (i.where) assert.ok(STAGES.some(st => st.id === i.where.stage), i.id);
  }
  for (const k of Object.keys(SOURCES)) assert.ok(IDEAS.some(i => i.by.includes(k)), `${k} is credited for something`);
  for (const t of tweaksOf(s.doc, ref)) assert.ok(ideaOf(t.idea), t.id);
});

test('toggles write the fields the coach app reads, preview without saving, and reset', () => {
  const s = full(), base = metrics(s.doc, ref, { now }).monthsToFi.value;
  const T = id => tweaksOf(s.doc, ref).find(t => t.id === id);
  assert.equal(T('debtOrder').show, false, 'one debt: no order to pick');
  const pv = previewTweak(s.doc, ref, priors, T('realReturn'), 0.08, { now });
  assert.ok(pv.months < base);
  assert.equal(s.doc.assumptions.realReturn, undefined, 'a preview saves nothing');
  setTweak(s, T('realReturn'), 0.08);
  assert.equal(metrics(s.doc, ref, { now }).monthsToFi.value, pv.months);
  setTweak(s, T('withdrawalRate'), 0.03);
  assert.ok(metrics(s.doc, ref, { now }).fiNumber.value > 930000);
  resetTweaks(s, ref);
  assert.equal(metrics(s.doc, ref, { now }).monthsToFi.value, base);
  const w = whatIf(s.doc, ref, priors, { spendLess: 300, earnMore: 500 }, { now });
  assert.ok(w.moved > 0 && w.surplus === 1900);
  assert.equal(metrics(s.doc, ref, { now }).monthsToFi.value, base, 'try it saves nothing');
});
