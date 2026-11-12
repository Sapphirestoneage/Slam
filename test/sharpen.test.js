// SPDX-License-Identifier: AGPL-3.0-only
// Sharpen it (js/sharpen.js) and the four pictures (js/charts.js): every level writes fields the engine already reads,
// reads them back (never asked twice), unlocks its numbers, and every picture adds up to the engine's own totals.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { QUESTIONS, answer, planOf, numbersOf } from '../js/journey.js';
import { LEVELS as ALL_LEVELS, levelsOf, levelsFor, sharpnessOf } from '../js/sharpen.js';
import { setSituation, answerBenefit, jobAheadOf, withJobAhead, startJob, questionsFor, progressOf, onFile } from '../js/journey.js';
const LEVELS = ALL_LEVELS.filter(l => l.id !== 'ahead'); // the nine levels of someone with a job (the job ahead is for between jobs)
import { growthOf, flowOf, debtOf, timelineOf } from '../js/charts.js';
import { metrics } from '../js/math/metrics.js';

const read = f => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url)));
const ref = read('reference-2026.json'), priors = read('priors-2026.json'), flags = read('flags.json');
const now = new Date(2026, 10, 12);
const ANSWERS = { income: { takeHome: 4200 }, spending: { gut: 3100 }, cash: { checking: 2500, savings: 4000 }, invested: { invested: 18000 }, card: { 'Credit card': 3200, 'Student loan': 20000 } };
const full = () => { const s = new Store(newHousehold({ name: 'Me' })); s.setDoc('profile', { birthYear: 2001, state: 'NY', nyc: true }); for (const q of QUESTIONS) answer(s, q.key, ANSWERS[q.key]); return s; };
const VALUES = { where: { rent: 1500, food: 600, transport: 130 }, work: { contributionPct: 0.06, match: 'm0' }, accounts: { k401: 9000, roth: 6000, brokerage: 3000 }, time: { paid: 45, commute: 5, costs: 150 },
  own: { housing: 'Rent', hasCar: false }, taxes: { filingStatus: 'Single' }, safety: { incomeStability: 'Varies', healthCoverage: 'Employer' }, finish: { fiAge: 55, retirementSpending: 2800, partTimeIncome: 1000 } };
const valuesFor = (L, s) => (L.id === 'owe' ? Object.fromEntries(L.fields(s.doc, ref).map(f => [f.id, f.type === 'pct' ? (/Credit/.test(f.label) ? 0.22 : 0.055) : 210])) : VALUES[L.id]);
const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: app ${a}, by hand ${b}`);

test('nine levels, each a few taps, each naming what it unlocks', () => {
  const s = full();
  assert.deepEqual(levelsFor(s.doc).map(l => l.n), [2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(levelsFor(s.doc).map(l => l.def.id), ['where', 'owe', 'work', 'accounts', 'time', 'own', 'taxes', 'safety', 'finish']);
  for (const L of LEVELS) { const f = L.fields(s.doc, ref); const shown = f.filter(x => !x.when || x.when(L.read(s.doc, ref))); assert.ok(shown.length >= 1 && shown.length <= 6, `${L.id}: ${shown.length} boxes`); assert.ok(L.unlocks.length && L.title && L.why); }
  assert.ok(levelsOf(s.doc).every(l => l.state === 'open'));
  assert.deepEqual([sharpnessOf(s.doc, true).done, sharpnessOf(s.doc, true).total], [1, 10]);
});

test('each level saves, reads back what was saved, and counts as done', () => {
  const s = full();
  for (const L of LEVELS) {
    const v = valuesFor(L, s);
    L.write(s, v, ref);
    const back = L.read(s.doc, ref);
    for (const [k, val] of Object.entries(v)) assert.equal(back[k], val, `${L.id}.${k} reads back`);
    assert.equal(L.done(s.doc), true, `${L.id} is done`);
    L.write(s, v, ref); // a second save changes rows, it does not add any
  }
  assert.equal(s.doc.records.filter(r => r.kind === 'bill').length, 3);
  assert.equal(s.doc.records.filter(r => r.kind === 'income').length, 1);
  assert.equal(s.doc.records.filter(r => r.kind === 'account' && r.values.group === 'investment').length, 3);
  assert.equal(sharpnessOf(s.doc, true).done, 10);
});

test('a level, once done, stays done: a car loan is asked with the car and never reopens the debt level', () => {
  const s = full(), lv = id => LEVELS.find(l => l.id === id);
  lv('owe').write(s, valuesFor(lv('owe'), s), ref);
  assert.equal(lv('owe').done(s.doc), true);
  lv('own').write(s, { housing: 'Rent', hasCar: true, carValue: 9000, carLoanBalance: 4000, carLoanApr: 0.07, carLoanPayment: 300 }, ref);
  assert.equal(lv('owe').done(s.doc), true, 'level 3 stays done');
  assert.equal(lv('owe').fields(s.doc, ref).length, 4, 'the car loan is not one of its questions');
  const back = lv('own').read(s.doc, ref);
  assert.deepEqual([back.carLoanBalance, back.carLoanApr, back.carLoanPayment], [4000, 0.07, 300]);
  const loan = metrics(s.doc, ref, { now }).inputs.debts.find(d => d.type === 'Car loan');
  assert.deepEqual([loan.apr, loan.aprGuess, loan.payment], [0.07, false, 300]);
  assert.equal(levelsOf(s.doc).filter(l => l.state === 'done').map(l => l.n).join(), '3,7');
});

test('a level with nothing to answer says so and counts as done', () => {
  const s = new Store(newHousehold({ name: 'Me' })); s.setDoc('profile', { birthYear: 1995 });
  answer(s, 'card', {}, { none: true }); answer(s, 'invested', {}, { none: true });
  const L = levelsOf(s.doc);
  assert.equal(L.find(l => l.id === 'owe').state, 'skip');
  assert.equal(L.find(l => l.id === 'accounts').state, 'skip');
});

test('the levels move the engine the way the formulas say', () => {
  const s = full(), lv = id => LEVELS.find(l => l.id === id);
  lv('where').write(s, VALUES.where, ref);
  let m = metrics(s.doc, ref, { now });
  near(m.housingPct.value, 1500 / 4200, 1e-9, 'housing share');
  assert.equal(m.inputs.spending, 3100, 'the gut number stays the total');
  lv('work').write(s, VALUES.work, ref);
  m = metrics(s.doc, ref, { now });
  const gross = m.inputs.income[0].gross;
  near(m.pretaxSaving, gross * 0.06 / 12, 0.01, '6% of pay into the 401(k)');
  near(m.savingsRate.value, (1100 + gross * 0.06 / 12 + gross * 0.03 / 12) / (4200 + gross * 0.09 / 12), 1e-6, 'savings rate with the 401(k) and a 50% match');
  lv('time').write(s, VALUES.time, ref);
  near(metrics(s.doc, ref, { now }).hourly.value, (4200 - 150) / (50 * 52 / 12), 0.01, 'real hourly wage');
  lv('safety').write(s, VALUES.safety, ref);
  near(metrics(s.doc, ref, { now }).ruleOf5.value, 25 / 5 * 1.25 * 3100, 0.01, 'big e when pay varies');
  lv('finish').write(s, VALUES.finish, ref);
  near(metrics(s.doc, ref, { now }).fiNumber.value, 2800 * 12 / 0.04, 0.01, 'FI number on later spending');
});

test('locked numbers open when their level is answered', () => {
  const s = full();
  const nums = () => numbersOf(planOf(s.doc, ref, priors, { flags, now }), s.doc, ref, { now });
  const gated = nums().filter(n => n.level);
  assert.ok(gated.length >= 7 && gated.every(n => n.value === null));
  for (const L of LEVELS) L.write(s, valuesFor(L, s), ref);
  for (const n of nums().filter(x => x.level)) assert.ok(n.value, `${n.label} has a value`);
  const N = id => nums().find(n => n.id === id);
  assert.match(N('buckets').value, /Taxed later: \$9,000 · Never taxed again: \$6,000 · Reachable any time: \$3,000/);
  assert.match(N('barista').label, /\$1,000 a month/);
  near(parseFloat(N('barista').value.replace(/[$,]/g, '')), (2800 - 1000) * 12 / 0.04, 1, 'Barista FI on your own part-time pay');
});

test('every picture adds up to the engine\'s own totals', () => {
  const s = full();
  for (const L of LEVELS) L.write(s, valuesFor(L, s), ref);
  const p = planOf(s.doc, ref, priors, { flags, now }), m = p.m;
  const g = growthOf(m, { age: p.age, now });
  assert.equal(g.rows[0].total, 18000);
  for (const r of g.rows) near(r.put + r.grown, r.total, 0.01, `growth ${r.year}`);
  assert.ok(g.rows.at(-1).total >= g.target && g.fiMonths === m.monthsToFi.value);
  assert.ok(g.rows.every((r, i) => !i || r.total > g.rows[i - 1].total));
  const f = flowOf(m);
  near(f.parts.reduce((a, x) => a + x.amount, 0), m.flow.gross, 1, 'the flow adds up to pay before taxes');
  assert.deepEqual(f.parts.find(x => x.id === 'housing').amount, 1500);
  const d = debtOf(m);
  assert.equal(d.total[0], 23200);
  assert.equal(d.total.at(-1) < 1, true, 'debt reaches zero');
  assert.equal(d.debts.length, 2);
  const t = timelineOf(p);
  assert.ok(t.points.length >= 3 && t.points.every(x => x.at > 0 && x.at <= 1));
  assert.equal(growthOf(metrics(new Store(newHousehold({ name: 'x' })).doc, ref, { now })), null, 'no numbers, no picture');
});

// ---- Between jobs: the journey reshapes, the plan counts benefits that end and a job that starts.
const laidOff = () => {
  const s = new Store(newHousehold({ name: 'Me' })); s.setDoc('profile', { birthYear: 2001, state: 'NY', nyc: false });
  answer(s, 'income', { takeHome: 4200 }); // the job they had
  setSituation(s, 'between');
  answerBenefit(s, { weekly: 504, weeks: 16 }, { now });
  answer(s, 'spending', { gut: 2600 }); answer(s, 'cash', { checking: 3000, savings: 9000 }); answer(s, 'invested', { invested: 30000 }); answer(s, 'card', {}, { none: true });
  return s;
};

test('between jobs: the pay question asks what is coming in, and the levels reshape', () => {
  const s = laidOff();
  assert.equal(questionsFor(s.doc)[0].title, 'What is coming in right now?');
  assert.equal(onFile(s.doc, 'income', { ref, now }).benefit, 504);
  assert.equal(progressOf(s.doc, ref, { now }).done, true);
  const rows = s.doc.records.filter(r => r.kind === 'income');
  assert.deepEqual(rows.map(r => [r.type, r.amount, r.per]), [['Unemployment', 504, 'week']], 'the old job row is gone, benefits are the one income row');
  near(metrics(s.doc, ref, { now }).inputs.takeHome, 504 * 52 / 12, 0.01, 'benefits a month');
  const L = levelsOf(s.doc);
  assert.deepEqual(L.map(l => l.id), ['safety', 'ahead', 'where', 'owe', 'accounts', 'own', 'taxes', 'finish'], 'the safety net and the job ahead come first; work plan and hours are absent');
  assert.deepEqual(L.map(l => l.n), [2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(sharpnessOf(s.doc, true).total, 9);
  const locked = numbersOf(planOf(s.doc, ref, priors, { flags, now }), s.doc, ref, { now }).filter(n => n.level && !n.value).map(n => n.level);
  assert.ok(!locked.includes('work') && !locked.includes('time'), 'a level that is absent locks nothing');
});

test('between jobs: the plan shows how long the money lasts, then counts the job ahead from its month', () => {
  const s = laidOff();
  let p = planOf(s.doc, ref, priors, { flags, now });
  assert.ok(p.between && p.between.runway > 6 && p.between.lasts && p.between.job === null);
  assert.equal(p.m.monthsToFi.value, null, 'benefits alone never reach FI');
  ALL_LEVELS.find(l => l.id === 'ahead').write(s, { months: 4, grossYear: 75000 });
  const j = jobAheadOf(s.doc, ref, { now });
  assert.deepEqual([j.ym, j.months, j.grossYear], ['2027-03', 4, 75000]);
  assert.ok(j.monthly > 75000 / 12 * 0.6 && j.monthly < 75000 / 12 * 0.9);
  p = planOf(s.doc, ref, priors, { flags, now });
  assert.equal(p.between.job.covered, true);
  const ch = p.m.investing.changes;
  assert.ok(ch.some(c => c.at === 4 && Math.abs(c.monthly - j.monthly) < 0.01), 'pay starts in month 4');
  assert.ok(ch.some(c => c.at === 4 && c.monthly < 0), 'benefits stop when the job starts, not after');
  assert.ok(p.m.monthsToFi.value > 0, 'with the job counted there is an FI date');
  assert.equal(s.doc.whatIf, undefined, 'the job ahead is read on a copy: nothing extra is saved');
  assert.equal(withJobAhead(s.doc, ref, { now }).records.find(r => r.type === 'Unemployment').values.benefitEnd, '2027-02-28');
  // the same plan by hand once the job has started: its pay less spending, invested
  const fiAhead = p.m.monthsToFi.value;
  startJob(s, ref, { now });
  assert.equal(s.doc.profile.workSituation, 'Employed (W-2)');
  assert.deepEqual(s.doc.records.filter(r => r.kind === 'income').map(r => [r.type, r.amount, r.per, r.values.basis]), [['Job', 75000, 'year', 'Gross']]);
  assert.deepEqual(levelsOf(s.doc).map(l => l.id), ['where', 'owe', 'work', 'accounts', 'time', 'own', 'taxes', 'safety', 'finish'], 'the work levels are back');
  const after = planOf(s.doc, ref, priors, { flags, now });
  assert.equal(after.between, null);
  assert.ok(after.m.monthsToFi.value < fiAhead, 'starting now beats starting in four months');
  near(after.m.surplus.value, j.monthly - 2600, 1, 'left over once working');
});
