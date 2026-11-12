// SPDX-License-Identifier: AGPL-3.0-only
// The whole-life engine (js/lifetime): each rule checked against a by-hand number, and the stress test checked against
// what the 4% rule is known for (it carried a 30-year retirement from almost every start year, and failed in the late 1960s).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lifetime, earliestFreedom, taxableSocialSecurity, yearTax, fillRoom, needAt, STRATEGIES } from '../js/lifetime/engine.js';
import { replay, shuffle, safeFreedom, mixOf } from '../js/lifetime/stress.js';
import { lifeOf, strategiesOf, fillsOf, claimsOf, stressOf } from '../js/lifetime/inputs.js';
import { federalTax } from '../js/math/income.js';
import { Store, newHousehold } from '../js/records.js';
import { QUESTIONS, answer, planOf } from '../js/journey.js';

const read = f => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url)));
const ref = read('reference-2026.json'), priors = read('priors-2026.json'), flags = read('flags.json'), hist = read('history-returns.json');
const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: engine ${a}, by hand ${b}`);
const plain = { age: 65, planAge: 94, retireAge: 65, realReturn: 0, start: { taxable: 1000000, pretax: 0, roth: 0 }, work: { saving: { pretax: 0, roth: 0, taxable: 0 } }, spendingAfter: 40000, strategy: { id: 'fixed' }, tax: { filingStatus: 'Single' } };

test('working years: saving goes in at the start of each year and grows', () => {
  const x = { ...plain, age: 30, retireAge: 40, planAge: 40, realReturn: 0.07, start: { taxable: 10000, pretax: 0, roth: 0 }, work: { saving: { pretax: 6000, roth: 7000, taxable: 5000 } } };
  const run = lifetime(x, ref);
  let hand = 10000; for (let i = 0; i < 10; i++) hand = (hand + 18000) * 1.07;
  near(run.atRetire, hand, 0.01, 'ten years of saving');
  const y = run.years[9];
  near(y.pretax, 6000 * 1.07 * (1.07 ** 10 - 1) / 0.07, 0.01, 'the pretax bucket');
  assert.equal(run.years.filter(r => r.phase === 'work').length, 10);
  // a slow start: one year when only the paycheck's own saving goes in
  const slow = lifetime({ ...x, work: { ...x.work, wait: { years: 1, pretax: 6000 } } }, ref);
  near(run.atRetire - slow.atRetire, 12000 * 1.07 ** 10, 0.01, 'a year without the roth and taxable saving');
});

test('free years with no growth and no tax: $1,000,000 at $40,000 a year lasts exactly 25 years', () => {
  const run = lifetime(plain, ref);
  assert.equal(run.years.find(y => y.short > 0).age, 65 + 25);
  assert.equal(run.ok, false);
  assert.equal(lifetime({ ...plain, planAge: 89 }, ref).ok, true);
  assert.equal(lifetime({ ...plain, planAge: 89 }, ref).end, 0);
});

test('spending by era, health cost before 65, and blocks layer onto what life costs', () => {
  const x = { ...plain, eras: { slowGoAge: 75, noGoAge: 85, slowGo: 0.85, noGo: 0.75 }, tax: { filingStatus: 'Single', health: 6000 },
    blocks: [{ fromAge: 70, toAge: 72, spending: 5000 }, { fromAge: 80, toAge: 80, once: 20000 }] };
  assert.deepEqual([60, 66, 71, 76, 80, 86].map(a => needAt(a, x)), [46000, 40000, 45000, 34000, 54000, 30000]);
});

test('Social Security is taxed by the provisional-income rule', () => {
  assert.equal(taxableSocialSecurity(20000, 10000), 0);                      // 10,000 + 10,000 = 20,000, under 25,000
  assert.equal(taxableSocialSecurity(20000, 20000), 2500);                   // 30,000: half of the 5,000 over 25,000
  assert.equal(taxableSocialSecurity(20000, 30000), 0.85 * 6000 + 4500);     // 40,000: 85% of the 6,000 over 34,000, plus 4,500
  assert.equal(taxableSocialSecurity(20000, 200000), 17000);                 // never more than 85%
  assert.equal(taxableSocialSecurity(20000, 20000, 'Married jointly'), 0);   // 30,000, under 32,000
});

test('pretax money is taxed on the way out, and the tax is drawn too', () => {
  const x = { ...plain, start: { taxable: 0, pretax: 1000000, roth: 0 }, spendingAfter: 50000 };
  const y = lifetime(x, ref).years[0];
  near(y.tax, federalTax({ gross: y.withdraw, filingStatus: 'Single' }, ref).value, 2, 'tax on the whole withdrawal');
  near(y.withdraw - y.tax, 50000, 2, 'what is left after tax is the spending');
  assert.ok(y.tax > 3000 && y.tax < 7000);
  assert.equal(lifetime({ ...x, start: { taxable: 0, pretax: 0, roth: 1000000 } }, ref).years[0].tax, 0, 'Roth money comes out untaxed');
});

test('before 59 and a half: taxable first, then Roth money put in, then pretax with the 10% penalty', () => {
  const x = { ...plain, age: 50, retireAge: 50, planAge: 52, spendingAfter: 30000, start: { taxable: 30000, pretax: 500000, roth: 100000, rothFree: 30000 } };
  const [a, b, c] = lifetime(x, ref).years;
  assert.deepEqual([a.penalty, a.tax, Math.round(a.taxable)], [0, 0, 0]);
  assert.deepEqual([b.penalty, b.tax, Math.round(b.roth)], [0, 0, 70000]);
  assert.ok(c.penalty > 3000 && c.tax > 0, 'year three comes from pretax: penalty and tax');
  near(c.penalty, 0.1 * (c.withdraw), 1, '10% of what came out of pretax');
  assert.equal(lifetime({ ...x, age: 60, retireAge: 60, planAge: 62 }, ref).penalties, 0);
});

test('filling the 0% space moves pretax money to Roth with no tax, and it can come out after five years', () => {
  const x = { ...plain, age: 50, retireAge: 50, planAge: 60, spendingAfter: 30000, start: { taxable: 200000, pretax: 300000, roth: 0 }, tax: { filingStatus: 'Single', fill: 'deduction' } };
  const std = ref.tax.standardDeduction.single;
  assert.equal(fillRoom('deduction', x.tax, ref), std);
  assert.equal(fillRoom('12', x.tax, ref), std + ref.tax.brackets.single[2][0]);
  const run = lifetime(x, ref), y = run.years;
  assert.equal(y[0].convert, std); assert.equal(y[0].tax, 0);
  assert.equal(yearTax({ ordinary: std, ss: 0 }, x.tax, ref), 0);
  const none = lifetime({ ...x, tax: { filingStatus: 'Single', fill: 'none' } }, ref);
  assert.ok(run.penalties < none.penalties, 'the ladder cuts the penalty');
  assert.ok(run.lifetimeTax <= none.lifetimeTax);
});

test('history: the 4% rule carried 30 years from almost every start, and failed in the late 1960s', () => {
  assert.equal(hist.first, 1871); assert.ok(hist.years.length >= 150);
  const geo = Math.exp(hist.years.reduce((a, y) => a + Math.log(1 + y.stocks), 0) / hist.years.length) - 1;
  assert.ok(geo > 0.06 && geo < 0.075, `stocks returned ${geo} a year after inflation`);
  assert.ok(hist.years.find(y => y.year === 1931).stocks < -0.3 && hist.years.find(y => y.year === 2008).stocks < -0.3);
  const x = { ...plain, realReturn: 0.05 };
  const r = replay(x, ref, hist, { stocks: 0.75 });
  assert.equal(r.cycles.length, hist.years.length - 30 + 1);
  assert.ok(r.success > 0.93 && r.success < 1, `4% worked in ${r.success}`);
  assert.ok(r.failed.every(y => y >= 1960 && y <= 1973), `failed starts: ${r.failed}`);
  assert.equal(r.worst.start, 1966);
  assert.equal(replay({ ...x, spendingAfter: 30000 }, ref, hist, { stocks: 0.75 }).success, 1, '3% carried every start');
  assert.ok(replay({ ...x, spendingAfter: 60000 }, ref, hist, { stocks: 0.75 }).success < 0.65, '6% did not');
  assert.equal(mixOf(hist, 1)[0].r, hist.years[0].stocks);
  const a = shuffle(x, ref, hist, { runs: 300 }), b = shuffle(x, ref, hist, { runs: 300 });
  assert.equal(a.success, b.success, 'the same seed gives the same answer');
  assert.ok(a.success > 0.8 && a.success < 1);
});

test('flexible strategies last longer than steady spending, at the price of a cut', () => {
  const x = { ...plain, realReturn: 0.05, spendingAfter: 45000 };
  const by = Object.fromEntries(STRATEGIES.map(s => [s.id, replay({ ...x, strategy: { id: s.id, rate: 0.045 } }, ref, hist, { stocks: 0.75 })]));
  const lasted = id => by[id].cycles.filter(c => c.ranOutAge === null).length;
  assert.ok(lasted('guardrails') > lasted('fixed'));
  assert.equal(lasted('percent'), by.percent.cycles.length, 'a share of the portfolio never runs out');
  assert.ok(Math.min(...by.guardrails.cycles.map(c => c.lowest)) >= 0.699, 'guardrails never cut below 70%');
  assert.ok(Math.min(...by.floor.cycles.filter(c => c.ranOutAge === null).map(c => c.lowest)) >= 0.849, 'the floor holds while the money lasts');
  assert.ok(lasted('floor') > lasted('fixed'));
});

test('from a household: an age to plan on, less than 25 times spending once Social Security and later years count', () => {
  const now = new Date(2026, 10, 12);
  const s = new Store(newHousehold({ name: 'Me' })); s.setDoc('profile', { birthYear: 2001, state: 'NY', nyc: true });
  const A = { income: { takeHome: 4200 }, spending: { gut: 3100 }, cash: { checking: 2500, savings: 14000 }, invested: { invested: 18000 }, card: {} };
  for (const q of QUESTIONS) q.key === 'card' ? answer(s, 'card', {}, { none: true }) : answer(s, q.key, A[q.key]);
  const plan = planOf(s.doc, ref, priors, { flags, now });
  const life = lifeOf(plan, s.doc, ref, hist, {});
  assert.equal(life.ready, true);
  assert.ok(life.smooth.age <= life.safe.age, 'history asks for at least as long as a smooth market');
  assert.equal(life.age, life.safe.age);
  assert.ok(life.safe.replay.success >= 0.95);
  assert.equal(life.rule25, 3100 * 12 * 25);
  assert.ok(life.ssYearly > 10000 && life.ssYearly < 40000);
  assert.ok(life.run.ok && life.run.years.at(-1).age === 90);
  near(life.run.years[0].saved, plan.m.investing.monthly * 12, 1, 'the first year saves what the plan invests');
  const stress = stressOf(life, ref, hist);
  assert.ok(stress.replay.success >= 0.95 && stress.shuffle.runs === 1000);
  const strategies = strategiesOf(life, ref, hist);
  assert.equal(strategies.length, 4);
  assert.ok(strategies.find(x => x.id === 'guardrails').age <= strategies.find(x => x.id === 'fixed').age, 'being willing to trim never needs more years');
  const fills = fillsOf(life, ref);
  assert.ok(fills.find(f => f.id === 'deduction').penalties <= fills.find(f => f.id === 'none').penalties);
  const claims = claimsOf(plan, s.doc, ref, hist, {});
  assert.ok(claims[0].yearly < claims[1].yearly && claims[1].yearly < claims[2].yearly, 'waiting pays more');
  // a kid for 18 years pushes the age out; a later claim does not make the plan impossible
  const kid = lifeOf(plan, s.doc, ref, hist, { blocks: [{ id: 'kid', name: 'A kid', fromAge: 32, toAge: 49, spending: 15000 }] });
  assert.ok(kid.age > life.age);
  assert.equal(lifeOf(plan, s.doc, ref, hist, { retireAge: life.age + 3 }).age, life.age + 3, 'your own age is used when you pick one');
});
