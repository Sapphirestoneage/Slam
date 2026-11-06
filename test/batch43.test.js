// Batch 43 (Phase 4, Track 1): Ask me next and the certainty meter (M9Q, js/math/nextbest.js, docs/engines/next-best.md).
// The meter is 1 minus each key range's width over its all-guess width, weighted; Ask me next is the input whose answer
// narrows the key ranges most per second, checked here against actually answering each question on a copy of the file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { addPresets, ensureCategories } from '../js/presets.js';
import { applyFastTrack, fastTrackAnswers } from '../js/fasttrack.js';
import { metrics } from '../js/math/metrics.js';
import { rangesOf, fooRangeOf, knobsOf } from '../js/math/ranges.js';
import { askNextOf, certaintyOf, spanOf, whyWords, answerOf, WEIGHTS, KEYS } from '../js/math/nextbest.js';
import { LEVELS } from '../js/registry/program.js';
import { RULES } from '../js/registry/assumptions.js';
import { sheetContext } from '../js/sheet/context.js';
import { mathById } from '../js/registry/math.js';
import { PLAIN, GLOSSARY } from '../js/glossary.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-06T15:00:00Z');
const client = (name, patch, debts = {}) => {
  const s = new Store(newHousehold({ name }));
  addPresets(s, ref); ensureCategories(s);
  const a = fastTrackAnswers(s.doc);
  Object.assign(a, { hasKids: false, hasPets: false, workSituation: 'Employed (W-2)', hsaEligible: false, fsa: false, equityPay: false, state: 'NY', household: 'Solo', chips: { whyNow: ['Just want to get organized'], worry: ['Debt'], goalWords: ['Debt free'] } }, patch);
  Object.assign(a.debts, debts);
  applyFastTrack(s, a, { finished: true, now: now.toISOString() });
  return s;
};
const alexis = () => client('Alexis Gillmore', { birthYear: 1998, takeHome: 1200, takePer: 'paycheck', payFrequency: '2 weeks', gut: 2800, gutIncludesDebt: false, checking: 400, savings: 0, invested: 0, housing: 'Rent', hasCar: false }, { 'Credit card': { balance: 4200, payment: 120, rows: 0 } });
const maya = () => client('Maya', { birthYear: 1996, takeHome: 2400, takePer: 'paycheck', payFrequency: '2 weeks', gut: 3500, gutIncludesDebt: false, checking: 1200, savings: 4000, invested: 15000, housing: 'Rent', hasCar: false }, { 'Credit card': { balance: 6000, payment: 200, rows: 0 } });
const tom = () => client('Tom Hutchinson', { birthYear: 1988, takeHome: 9800, takePer: 'month', gut: 6500, gutIncludesDebt: true, gutFrom: 'Statements', checking: 8000, savings: 30000, invested: 410000, housing: 'Own', hasCar: true, homeValue: 650000, carValue: 22000, fiAge: 50 });
const ask = doc => { const m = metrics(doc, ref, { now }); const R = rangesOf(doc, ref, { now, m }); return { m, R, A: askNextOf(doc, ref, { now, m, R, F: fooRangeOf(doc, ref, { now }) }) }; };
// Answer a question for real on a copy of the file: the gut number read off statements, any other number typed at Know it.
function answer(s, q, from = s.doc) {
  const rec = s.doc.records[from.records.findIndex(r => r.id === q.recId)]; // the same row in a fresh copy (ids differ)
  if (q.id === 'spending' && rec.type === 'All in') { s.update(rec.id, { pass: 'Statements' }); return; }
  if (q.field === 'apr') { s.update(rec.id, { apr: ref.typicalRates[rec.type] }); s.setFieldStatus(rec.id, 'apr', 'Know it'); return; }
  if (q.field === 'amount') s.update(rec.id, { status: 'Know it' }); else s.setFieldStatus(rec.id, q.field, 'Know it');
}
// The narrowing an answer really buys, measured the way Ask me next scores it.
function measured(before, after, guess) {
  const W = WEIGHTS();
  return KEYS.reduce((s, k) => { const g = spanOf(k, guess[k]); if (!g || !before[k]) return s; const d = (spanOf(k, before[k]) ?? 0) - (spanOf(k, after[k]) ?? 0); return s + (d > 1e-9 ? W[k] * d / g : 0); }, 0);
}

test('the meter by hand: 1 minus the width over the all-guess width, an open end counts CertaintyOpenMonths', () => {
  assert.equal(certaintyOf('surplus', { width: 50 }, { width: 200 }), 0.75);
  assert.equal(certaintyOf('surplus', { width: 300 }, { width: 200 }), 0, 'never below 0');
  assert.equal(certaintyOf('fi', { width: Infinity }, { width: Infinity }), 0);
  assert.equal(certaintyOf('fi', { width: 120 }, { width: Infinity }), 1 - 120 / RULES.certaintyOpenMonths);
  assert.equal(certaintyOf('netWorth', { width: 0 }, { width: 0 }), null, 'nothing could move it: left out');
  assert.equal(spanOf('debtFree', { width: Infinity }), RULES.certaintyOpenMonths);
});

test('the meter: every number at Know it reads near 100%, the same file read as guesses reads 0%', () => {
  const s = new Store(newHousehold({ name: 'All known' }));
  s.setDoc('profile', { birthYear: 1990, state: 'TX', areas: { debt: false, cash: true, investments: true } });
  s.add('income', { name: 'Paycheck', amount: 6000, per: 'month', values: { basis: 'Take-home', payFrequency: 'month', incomeType: 'W-2' } }, { type: 'Job' });
  s.add('bill', { name: 'Rent', amount: 2000, per: 'month', values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed' } });
  s.add('account', { name: 'Checking', values: { group: 'cash', balance: 10000 } }, { type: 'Checking' });
  s.add('account', { name: 'Index fund', values: { group: 'investment', balance: 100000 } }, { type: 'Brokerage' });
  s.setDoc('spending', { source: 'lines' });
  const { A } = ask(s.doc);
  assert.ok(A.meter.value >= 0.9, `all Know it: ${A.meter.value}`);
  assert.equal(A.top, null, 'nothing to ask');
  for (const r of s.doc.records.filter(r => ['income', 'bill', 'account'].includes(r.kind))) s.update(r.id, { status: 'Not sure' });
  assert.equal(ask(s.doc).A.meter.value, 0, 'every number a guess: the ranges are as wide as they get');
});

test('Maya: the spending total first (it moves the FI date most); answering it narrows the FI range and the card moves on', () => {
  const s = maya();
  const { R, A } = ask(s.doc);
  assert.equal(A.top.id, 'spending');
  assert.equal(A.top.question, 'What you spend a month, read off a bank or card app');
  assert.match(A.top.why, /^Pins your FI date to within about \d+ years$/);
  assert.ok(A.runnerUp && A.runnerUp.id !== 'spending');
  const meter = A.meter.value, fiWidth = R.fi.width;
  answer(s, A.top);
  const after = ask(s.doc);
  assert.ok(after.R.fi.width < fiWidth, `the FI range narrows: ${fiWidth} to ${after.R.fi.width}`);
  near(after.R.fi.width, A.top.narrows.to, 1, 'the narrowing it promised is the one answering gives');
  assert.ok(after.A.meter.value > meter, 'the meter rises');
  assert.notEqual(after.A.top.question, A.top.question, 'the card names the next question');
});
function near(a, b, tol, msg) { assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} is not ${b}`); }

test('Alexis (mostly gut): the spending total first, never an account balance; the guessed card APR next', () => {
  const { A } = ask(alexis().doc);
  assert.equal(A.top.id, 'spending');
  assert.equal(A.runnerUp.field, 'apr');
  assert.match(A.runnerUp.question, /interest rate \(APR\)/, 'APR carries its plain meaning');
  assert.ok(!A.questions.slice(0, 2).some(q => q.kind === 'balance'));
});

test('Tom (near Know it): the rough invested total first; the statements total next, built from the lines', () => {
  const { A } = ask(tom().doc);
  assert.match(A.top.label, /Investments/);
  assert.equal(A.runnerUp.id, 'spending');
  assert.equal(A.runnerUp.seconds, RULES.askSecondsBuild);
  assert.ok(A.meter.value > 0.6 && A.meter.value < 1);
});

test('brute force: for each household, answering the top question buys at least as much per second as any other answer', () => {
  for (const make of [alexis, maya, tom]) {
    const first = make(), base = ask(first.doc);
    // A statements total built from the lines is not one box to answer: it is left out of the trial (it is never first).
    const scores = base.A.questions.filter(q => !q.missing && q.seconds !== RULES.askSecondsBuild).map(q => {
      const s = make();
      answer(s, q, first.doc);
      const after = ask(s.doc);
      return { id: q.id, per: measured(base.R, after.R, base.A.guess) / q.seconds, claimed: q.score };
    });
    for (const x of scores) near(x.per, x.claimed, 1e-6, `${x.id}: the score is what answering it really buys`);
    const best = Math.max(...scores.map(x => x.per));
    assert.ok(scores[0].per >= best * 0.98, `${make.name}: the top question is the best one by trying each`);
  }
});

test('skipped: a number marked Will get it is homework, not a question; an item with nothing in comes first', () => {
  const s = maya();
  const gut = s.doc.records.find(r => r.kind === 'spending' && r.type === 'All in');
  s.update(gut.id, { status: 'Will email' });
  assert.ok(!ask(s.doc).A.questions.some(q => q.id === 'spending'));
  const t = maya();
  const inc = t.doc.records.find(r => r.kind === 'income');
  t.update(inc.id, { amount: null });
  const { A } = ask(t.doc);
  assert.equal(A.top.missing, true);
  assert.equal(A.top.recId, inc.id);
  assert.match(A.top.question, /nothing in yet/);
});

test('the answer levels and the why words', () => {
  assert.equal(answerOf({ gut: true, level: LEVELS.Gut }).level, LEVELS.Estimate);
  assert.equal(answerOf({ gut: true, level: LEVELS.Estimate }).seconds, RULES.askSecondsBuild);
  assert.equal(answerOf({ kind: 'apr', prior: true, level: LEVELS.Missing }).seconds, RULES.askSecondsLookup);
  assert.equal(answerOf({ kind: 'balance', level: LEVELS.Rough }).seconds, RULES.askSecondsNumber);
  assert.equal(whyWords({ key: 'fi', to: 26 }), 'Pins your FI date to within about 2 years');
  assert.equal(whyWords({ key: 'debtFree', to: 4 }), 'Pins your debt-free date to within about 4 months');
  assert.equal(whyWords({ key: 'surplus', to: 280 }), 'Pins what you keep each month to within about $280 a month');
  assert.equal(whyWords({ key: 'foo' }), 'Settles which step of your plan you are on');
  assert.ok(PLAIN.some(p => p.term === 'Certainty') && GLOSSARY.Certainty, 'the meter word carries its plain meaning');
});

test('the workbook: M9Q reads the same meter and question as the screens', () => {
  const s = maya();
  const c = sheetContext(s.doc, ref, { now });
  const e = mathById('M9Q');
  const A = askNextOf(s.doc, ref, { now, m: c.m, R: c.ranges(), F: c.fooRange() });
  assert.equal(e.app(c), A.meter.value);
  assert.equal(e.parts.find(p => p.key === 'ask').app(c), A.top.question);
  assert.equal(e.parts.find(p => p.key === 'then').app(c), A.runnerUp.question);
  assert.ok(knobsOf(s.doc, ref, { force: () => LEVELS.Gut }).length >= knobsOf(s.doc, ref).length, 'read as guesses, every number on file moves');
});
