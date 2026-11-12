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

// ---- The math, checked by hand: each headline number recomputed here from first principles, not by calling the engine.
test('the headline numbers match a by-hand recomputation', () => {
  // No debt, and cash already past big e (age 25: 5 months x $3,000 = $15,000), so every surplus dollar is invested.
  const s = person();
  answer(s, 'income', { takeHome: 5000 }); answer(s, 'spending', { gut: 3000 });
  answer(s, 'cash', { checking: 3000, savings: 20000 }); answer(s, 'invested', { invested: 40000 }); answer(s, 'card', {}, { none: true });
  const m = metrics(s.doc, ref, { now });
  const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: app ${a}, by hand ${b}`);
  near(m.surplus.value, 5000 - 3000, 0.01, 'left over');
  near(m.savingsRate.value, 2000 / 5000, 1e-9, 'savings rate');
  near(m.fiNumber.value, 3000 * 12 / 0.04, 0.01, 'FI number (25x)');
  near(m.runwayMonths.value, 23000 / 3000, 1e-9, 'runway');
  near(m.netWorth.value, 3000 + 20000 + 40000, 0.01, 'net worth');
  near(m.ruleOf5.value, 25 / 5 * 3000, 0.01, 'Rule of 5');
  near(m.coastFi.value, 900000 / 1.07 ** (65 - 25), 1, 'Coast FI');
  // FI date: $40,000 growing 7% a year (compounded monthly), $2,000 added each month, until it reaches $900,000.
  const g = 1.07 ** (1 / 12);
  let bal = 40000, n = 0;
  while (bal < 900000) { bal = bal * g + 2000; n++; }
  near(m.monthsToFi.value, n, 1, 'months to FI');
  // The shockingly simple math: from $0, saving 40% of pay, years until 25x spending.
  const p = planOf(s.doc, ref, priors, { flags, now });
  const simple = numbersOf(p, s.doc, ref, { now }).find(x => x.id === 'simpleYears');
  let b2 = 0, k = 0;
  while (b2 < 0.6 * 12 / 0.04) { b2 = b2 * g + 0.4; k++; }
  near(parseFloat(simple.value), k / 12, 0.15, 'years from zero at a 40% savings rate');
  // A change of assumption does what the formula says: 3% withdrawal is spending x 12 / 0.03.
  setTweak(s, tweaksOf(s.doc, ref).find(t => t.id === 'withdrawalRate'), 0.03);
  near(metrics(s.doc, ref, { now }).fiNumber.value, 36000 / 0.03, 0.01, 'FI number at 3%');
});

test('pay by paycheck, salary or hour lands on one income row; spending parts add up', async () => {
  const { answerPay, payOnFile, sumParts } = await import('../js/journey.js');
  const take = s => Math.round(metrics(s.doc, ref, { now }).inputs.takeHome);
  let s = person(); answerPay(s, { mode: 'paycheck', amount: 1900, frequency: '2 weeks' });
  assert.equal(take(s), Math.round(1900 * 26 / 12));
  s = person(); answerPay(s, { mode: 'paycheck', amount: 2000, frequency: 'twice a month' });
  assert.equal(take(s), 4000);
  s = person(); answerPay(s, { mode: 'salary', amount: 65000 });
  assert.ok(take(s) > 65000 / 12 * 0.6 && take(s) < 65000 / 12 * 0.9, 'take-home is the salary less a believable tax');
  assert.equal(onFile(s.doc, 'income', { ref, now }).takeHome, take(s));
  assert.deepEqual(payOnFile(s.doc), { mode: 'salary', amount: 65000, frequency: null });
  const hourly = person(); answerPay(hourly, { mode: 'hourly', amount: 30, hours: 40 });
  assert.equal(payOnFile(hourly.doc).amount, 30 * 40 * 52);
  answerPay(s, { mode: 'month', amount: 4000 });
  assert.equal(s.doc.records.filter(r => r.kind === 'income').length, 1);
  assert.equal(take(s), 4000);
  assert.equal(answerPay(s, { mode: 'salary', amount: null }), false);
  assert.equal(sumParts({ housing: 1500, food: 600, rest: 700, bills: '' }), 2800);
});
