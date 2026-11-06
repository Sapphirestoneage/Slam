// SPDX-License-Identifier: AGPL-3.0-only
// Batch 46 (Phase 4, Track 1: the age-only start, M9A). QUESTIONS 336 by hand (the one-person row scaled by the age
// band's ratio to all ages); the typical amounts as all households' range; a plan from an age alone for 23, 38 and 61
// year olds, Solo and Couple, in New York and elsewhere; nothing typical is ever saved; and the ranges narrow as each
// real answer replaces its typical amount, three answers in a row.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { addPresets, ensureCategories } from '../js/presets.js';
import { applyFastTrack, fastTrackAnswers } from '../js/fasttrack.js';
import { typicalOf, ageRatioOf, shapeOf } from '../js/math/priors.js';
import { agePlanOf, filledOf, priorFill, priorOf, planLabel, planWordsOf, answeredOf, ageOnlyRangesOf, CORE } from '../js/math/agestart.js';
import { askNextOf, certaintyOf } from '../js/math/nextbest.js';
import { rangesOf, fooRangeOf } from '../js/math/ranges.js';
import { pictureOf } from '../js/math/picture.js';
import { RULES, ASSUMPTIONS } from '../js/registry/assumptions.js';
import { mathById } from '../js/registry/math.js';

const root = new URL('../', import.meta.url);
const ref = JSON.parse(readFileSync(new URL('data/reference-2026.json', root)));
const data = JSON.parse(readFileSync(new URL('data/priors-2026.json', root), 'utf8'));
const now = new Date('2026-11-06T15:00:00Z');
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
const fresh = profile => { const s = new Store(newHousehold({ name: 'New' })); addPresets(s, ref); ensureCategories(s); s.setDoc('profile', profile); return s; };
const answer = (s, patch) => { const a = fastTrackAnswers(s.doc); Object.assign(a, patch); if (patch.debts) a.debts = { ...a.debts, ...patch.debts }; applyFastTrack(s, a, { now: now.toISOString() }); };

test('QUESTIONS 336 by hand: a 25 to 34 year old living alone reads the one-person row times 25 to 34 over all ages', () => {
  const q = ageRatioOf(data, 'spending.total', 28);
  assert.equal(q.band, '25 to 34'); near(q.factor, 74475 / 78535, 1e-12); // 0.948303 (batch 54: the 2024 all-ages total)
  const s = typicalOf(data, 'spending', { age: 28, household: 'Solo' });
  // Batch 54: each part by its own ratio. Total $48,794 x 0.948303 = $46,271.51; personal insurance and pensions
  // $4,329 x $10,701 / $9,797 = $4,728.45; ($46,271.51 - $4,728.45) / 12 = $3,461.92 (was $3,671.06).
  near(s.likely, 3461.92); assert.equal(s.band, '25 to 34');
  assert.match(s.basis, /mean \$3,705 among one-person households of every age \(average age 56\.3\), scaled to 25 to 34 by 25 to 34's ratio to all ages \(0\.95: 25 to 34's \$74,475 against all ages' \$78,535 a year, all ages 2024\)/);
  // Batch 54: food has its own all-ages row now: $5,644 / 12 x $9,630 / $10,169 = $445.40. A category with no all-ages
  // row (shelter, not in Table A) uses the totals, and the tip says so: $12,954 / 12 x 0.948303 = $1,023.69.
  const f = typicalOf(data, 'spending.food', { age: 28, household: 'Solo' });
  near(f.likely, 445.40); assert.doesNotMatch(f.basis, /the totals/);
  const sh = typicalOf(data, 'spending.shelter', { age: 28, household: 'Solo' });
  near(sh.likely, 1023.69); assert.match(sh.basis, /a year, the totals, all ages/);
  // 61 living alone: $48,794 x $84,946 / $78,535 = $52,777.17, less $4,329 x $12,172 / $9,797 = $5,378.44, over 12 = $3,949.89.
  near(typicalOf(data, 'spending', { age: 61, household: 'Solo' }).likely, 3949.89, 0.05);
  // A couple (households of every size) reads its age band as before, and no age reads the row as published.
  near(typicalOf(data, 'spending', { age: 28, household: 'Couple' }).likely, (74475 - 10701) / 12);
  near(typicalOf(data, 'spending', { household: 'Solo' }).likely, 3705.42);
  assert.equal(ageRatioOf(data, 'spending.total', null), null);
});

test('the shapes: income and cash like spending by age (and living alone), retirement like net worth', () => {
  near(shapeOf(data, 'income', { age: 28, household: 'Solo' }).factor, 48794 * (74475 / 78535) / 78535, 1e-9);
  near(typicalOf(data, 'income', { age: 61 }).likely, 87460 * 84946 / 78535, 0.01);
  near(typicalOf(data, 'income', { age: 61, place: 'NY' }).likely, 87460 * 84946 / 78535 * 1.12563, 0.01); // the price parity stands in for a NY income row
  near(typicalOf(data, 'retirement', { age: 61 }).likely, 106000 * 411900 / 215900, 0.01);
  near(typicalOf(data, 'cash', { age: 23, household: 'Solo' }).likely, 8200 * 48794 * (47283 / 78535) / 78535, 0.01);
  assert.equal(shapeOf(data, 'card', { age: 28 }), null, 'cards: all ages, no shape');
});

test('a typical amount is all households\' range: those with none count as $0 (the card, by hand)', () => {
  // Cards: 44.7% carry a balance; among them $1,860 / $3,100 / $4,650. All households' middle is $0 (55% carry none);
  // their 75th sits at the carriers' 1 - 0.25 / 0.447 = 0.4407, between the carriers' 25th and middle:
  // $1,860 + $1,240 x (0.4407 - 0.25) / 0.25 = $2,806.
  const c = priorFill({ low: 1860, likely: 3100, high: 4650 }, 0.447);
  assert.equal(c.low, 0); assert.equal(c.likely, 0); near(c.high, 1860 + 1240 * ((1 - 0.25 / 0.447) - 0.25) / 0.25);
  assert.deepEqual(priorFill({ low: 1, likely: 2, high: 3 }, 1), { low: 1, likely: 2, high: 3 });
  const sl = priorFill({ low: 10, likely: 20, high: 30 }, 0.2);
  assert.deepEqual([sl.low, sl.likely, sl.high], [0, 0, 0], 'student loans: 80% have none, so the 75th is $0 too');
  const card = priorOf(data, 'card', { age: 28 });
  assert.equal(card.likely, 0); near(card.high, 2806, 1);
});

const PEOPLE = [];
for (const birthYear of [2003, 1988, 1965]) for (const household of ['Solo', 'Couple']) for (const state of ['NY', 'TX']) PEOPLE.push({ birthYear, household, state });

test('an age alone gives a plan: FI, debt free, emergency fund and surplus, each a range, labeled typical for the age and place', () => {
  for (const p of PEOPLE) {
    const s = fresh(p);
    const before = JSON.stringify(s.doc), pic = pictureOf(s.doc, ref, { now }).points;
    const P = agePlanOf(s.doc, ref, data, { now });
    const band = { 2003: 'people under 25', 1988: '35 to 44 year olds', 1965: '55 to 64 year olds' }[p.birthYear];
    assert.equal(P.label, `Typical for ${band}${p.household === 'Solo' ? ' living alone' : ''} in ${p.state === 'NY' ? 'New York' : 'the US'}`, JSON.stringify(p));
    assert.equal(P.age, 2026 - p.birthYear, '23, 38 and 61 (born in January by default)');
    assert.equal(P.typical, 5, 'all five core inputs are typical');
    assert.deepEqual(P.next, { key: 'income', label: 'Take-home pay', step: 'Take-home pay' }, 'the first Fast Track question');
    for (const k of ['fi', 'debtFree', 'efMonths', 'surplus']) {
      const r = P.ranges[k];
      assert.ok(r && r.low != null && r.low <= (r.likely === Infinity ? Infinity : r.likely), `${k} for ${JSON.stringify(p)}`);
      assert.ok(P.words[k] && !P.words[k].includes(String.fromCharCode(0x2014)) && !/\b(bad|poor|too|danger|warning|behind|fail|risk)/i.test(P.words[k]), P.words[k]);
    }
    assert.ok(P.ranges.surplus.high - P.ranges.surplus.low > 500, 'wide: a typical surplus is hundreds of dollars either way');
    assert.equal(P.ranges.debtFree.low, 0, 'most households carry no card balance: debt free now at the low end');
    assert.equal(JSON.stringify(s.doc), before, 'nothing typical is saved');
    assert.equal(pictureOf(s.doc, ref, { now }).points, pic, 'and the Picture % does not move');
  }
  assert.equal(agePlanOf(fresh({}).doc, ref, data, { now }), null, 'no age: no plan');
  assert.equal(planLabel(data, { age: 30, place: 'NJ', household: 'Couple' }).text, 'Typical for 25 to 34 year olds in New Jersey');
});

test('a typical amount fills only a blank: a typed number, or a no on About you, is never replaced', () => {
  const s = fresh({ birthYear: 1996, household: 'Solo', state: 'NY', areas: { debt: false } });
  assert.equal(answeredOf(s.doc, ref).card, true, 'no debts on About you is an answer');
  answer(s, { takeHome: 2400, takePer: 'paycheck', payFrequency: '2 weeks' });
  const F = filledOf(s.doc, ref, data, { now });
  assert.deepEqual(F.priors.map(p => p.key), ['spending', 'cash', 'invested']);
  assert.ok(!F.doc.records.some(r => r.id === 'prior:income' || r.id === 'prior:card'));
  assert.ok(F.doc.records.filter(r => r.prior).every(r => r.source === 'prior' && r.id.startsWith('prior:')));
  near(F.priors[0].likely, typicalOf(data, 'spending', { age: 30, household: 'Solo', place: 'NY' }).likely);
  near(F.priors[0].high / F.priors[0].likely, 1 + RULES.priorSpendShare, 1e-9);
  assert.equal(agePlanOf(s.doc, ref, data, { now }).next.label, 'Spending a month');
});

// The widths that must not grow: months for the dates (Infinity while an end never comes), the emergency fund as a
// share of its likely, dollars a month for the surplus.
const widths = P => ({ fi: P.width.fi, debtFree: P.width.debtFree, ef: P.ranges.efMonths ? (P.ranges.efMonths.high - P.ranges.efMonths.low) / P.ranges.efMonths.likely : null, surplus: P.width.surplus });
function narrows(steps, profile) {
  const s = fresh(profile);
  const seen = [widths(agePlanOf(s.doc, ref, data, { now }))];
  for (const st of steps) { answer(s, st); seen.push(widths(agePlanOf(s.doc, ref, data, { now }))); }
  for (let i = 1; i < seen.length; i++) {
    const a = seen[i - 1], b = seen[i];
    for (const k of Object.keys(a)) assert.ok(b[k] <= a[k] + 1e-6, `answer ${i}: ${k} went from ${a[k]} to ${b[k]}`);
    assert.ok(Object.keys(a).some(k => b[k] < a[k] - 1e-6), `answer ${i}: something narrowed (${JSON.stringify(a)} then ${JSON.stringify(b)})`);
  }
  return seen;
}

test('each answer replaces its typical amount and the ranges narrow, three answers in a row (Maya and Tom)', () => {
  const maya = narrows([{ takeHome: 2400, takePer: 'paycheck', payFrequency: '2 weeks' }, { gut: 3500, gutIncludesDebt: false }, { checking: 1200, savings: 4000 }], { birthYear: 1996, household: 'Solo', state: 'NY' });
  assert.equal(maya[0].fi, Infinity, 'age only: FI could be decades away or never');
  assert.ok(Number.isFinite(maya[2].fi), 'with her pay and spending: an FI range with two ends');
  // Batch 54: the 2024 all-ages CE total lowers the age-only spending a little, so the age-only width is $2,006 a
  // month (was $2,123) against $1,057 after three answers: 1.90 times (was 2.01).
  assert.ok(maya[3].surplus < maya[0].surplus / 1.85, 'the surplus range is about half as wide');
  const tom = narrows([{ takeHome: 9800, takePer: 'month' }, { gut: 6500, gutIncludesDebt: true, gutFrom: 'Statements' }, { checking: 8000, savings: 30000 }, { invested: 410000 }], { birthYear: 1988, household: 'Solo', state: 'NY' });
  assert.ok(tom[4].fi < tom[2].fi, 'his invested total narrows the FI date again');
});

test('the words: years for a wide date, months for a near one, "or later" when an end never comes', () => {
  assert.equal(planWordsOf('fi', { low: 120, likely: 200, high: 300 }, { now }), '2036 to 2051');
  assert.equal(planWordsOf('fi', { low: 120, likely: Infinity, high: null, never: true }, { now }), '2036 or later');
  assert.equal(planWordsOf('debtFree', { low: 0, likely: 0, high: 7 }, { now }), 'Now to Jun 2027');
  assert.equal(planWordsOf('efMonths', { low: 0.54, likely: 1.2, high: 2.36 }, { now }), '0.5 to 2.4 months');
  assert.equal(planWordsOf('surplus', { low: -1012, likely: 40, high: 1104 }, { now }), '$1,000 short to $1,100 a month');
  assert.equal(planWordsOf('surplus', null, { now }), null);
});

test('registered: M9A with its reason, the PriorSpendShare rule with its source and date', () => {
  const m = mathById('M9A');
  assert.ok(m && m.fromApp && m.fns.includes('agestart.agePlanOf'));
  const a = ASSUMPTIONS.find(x => x.id === 'rules.priorSpendShare');
  assert.ok(a && a.source && a.date === '2026-11-06' && a.get() === RULES.priorSpendShare);
  assert.ok(RULES.priorSpendShare > RULES.rangeSpendGut, 'wider than a gut spending number, so a gut answer narrows it');
  assert.equal(CORE.length, 5);
});

test('QUESTIONS 371: the certainty meter\'s 0% is the plan from the age alone', () => {
  const s = fresh({ birthYear: 1996, household: 'Solo', state: 'NY' });
  answer(s, { takeHome: 2400, takePer: 'paycheck', payFrequency: '2 weeks', gut: 3500, gutIncludesDebt: false, checking: 1200, savings: 4000, invested: 15000, debts: { 'Credit card': { balance: 6000, payment: 200, rows: 0 } } });
  const zero = ageOnlyRangesOf(s.doc, ref, data, { now });
  // The zero ignores every answer: the same as a bare household with only the age, place and Solo.
  const bare = ageOnlyRangesOf(fresh({ birthYear: 1996, household: 'Solo', state: 'NY' }).doc, ref, data, { now });
  for (const k of ['fi', 'debtFree', 'efMonths', 'surplus', 'netWorth']) assert.deepEqual([zero[k]?.low, zero[k]?.high], [bare[k]?.low, bare[k]?.high], k);
  assert.equal(certaintyOf('surplus', zero.surplus, zero.surplus), 0, 'the age-only plan itself reads 0%');
  const R = rangesOf(s.doc, ref, { now }), F = fooRangeOf(s.doc, ref, { now });
  const A = askNextOf(s.doc, ref, { now, R, F, zero });
  const part = A.meter.parts.find(p => p.key === 'surplus');
  // Batch 51 (QUESTIONS 387): the zero is the wider of the age-only width and the all-guess width. Maya's surplus: the
  // age-only $2,123 against her all-guess $2,330, so the all-guess one; her FI date keeps the age-only open end (600).
  const allGuess = askNextOf(s.doc, ref, { now, R, F }).meter.parts.find(p => p.key === 'surplus');
  near(part.value, Math.max(1 - R.surplus.width / zero.surplus.width, allGuess.value), 1e-9);
  near(A.meter.parts.find(p => p.key === 'fi').value, 1 - R.fi.width / 600, 1e-9);
  assert.ok(A.meter.value > askNextOf(s.doc, ref, { now, R, F }).meter.value, 'Maya after Fast Track is surer against an age-only plan than against all-guess');
  assert.equal(ageOnlyRangesOf(fresh({}).doc, ref, data, { now }), null, 'no age: the all-guess zero stands');
});
