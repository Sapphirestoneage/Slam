// SPDX-License-Identifier: AGPL-3.0-only
// The whole-life engine (js/lifetime): each rule checked against a by-hand number, and the stress test checked against
// what the 4% rule is known for (it carried a 30-year retirement from almost every start year, and failed in the late 1960s).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lifetime, earliestFreedom, taxableSocialSecurity, yearTax, fillRoom, needAt, STRATEGIES, FILLS, medicareSurcharge, bracketRoom } from '../js/math/lifetime.js';
import { replay, shuffle, safeFreedom, mixOf } from '../js/math/stress.js';
import { lifeOf, strategiesOf, fillsOf, claimsOf, stressOf, cliffsOf, taxNowOf } from '../js/lifetime/inputs.js';
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

import { gainsTax, requiredWithdrawal, premiumCredit, under65 } from '../js/math/lifetime.js';
test('long-term gains stack on ordinary income: 0%, then 15%, then 20% (2026 bands)', () => {
  assert.equal(gainsTax(40000, 0, 'single'), 0);                                   // all inside the 0% band
  assert.ok(Math.abs(gainsTax(83900, 0, 'single') - (83900 - 49450) * 0.15) < 1e-9); // 5,167.50
  assert.equal(gainsTax(10000, 50000, 'single'), 1500);                            // ordinary income already past the 0% band
  assert.ok(Math.abs(gainsTax(100000, 500000, 'single') - (45500 * 0.15 + 54500 * 0.20)) < 1e-9);
  assert.equal(gainsTax(98900, 0, 'joint'), 0);
  // The standard deduction that ordinary income did not use shelters gains first: $60,000 of gains and nothing else
  // leaves $43,900 taxable, inside the 0% band, so no federal tax (a place with no state tax).
  const tax = { filingStatus: 'Single', place: { state: 'TX' } };
  const none = yearTax({ ordinary: 0, ss: 0, gains: 60000 }, tax, ref), more = yearTax({ ordinary: 0, ss: 0, gains: 100000 }, tax, ref);
  assert.ok(more - none >= (100000 - 16100 - 49450) * 0.15 - 1);
  assert.equal(yearTax({ ordinary: 30000, ss: 0 }, tax, ref), yearTax({ ordinary: 30000, ss: 0, gains: 0 }, tax, ref));
});

test('required withdrawals: the balance over the table\'s number, from 73 (or 75), taxed and moved to taxable', () => {
  assert.equal(requiredWithdrawal(72, 500000), 0); assert.ok(Math.abs(requiredWithdrawal(75, 246000) - 10000) < 1e-9); assert.equal(requiredWithdrawal(74, 255000, 75), 0);
  const x = { age: 75, planAge: 76, retireAge: 75, realReturn: 0, start: { taxable: 0, pretax: 246000, roth: 0 }, work: { saving: { pretax: 0, roth: 0, taxable: 0 } }, spendingAfter: 0, ss: { claimAge: 67, yearly: 0 }, strategy: { id: 'fixed' }, tax: { filingStatus: 'Single', place: { state: 'TX' } } };
  const y = lifetime(x, ref).years[0];
  assert.ok(Math.abs(y.rmd - 10000) < 1e-6);
  assert.ok(Math.abs(y.pretax - 236000) < 1 && Math.abs(y.taxable - 10000) < 1, `${y.pretax} ${y.taxable}`); // $10,000 is under the standard deduction: no tax, and nothing was needed for spending
  assert.equal(lifetime({ ...x, rmdAge: 77 }, ref).years[0].taxable, 0);
});

test('the Marketplace credit for 2026: a sliding share of income, and nothing past four times the poverty line', () => {
  assert.ok(Math.abs(premiumCredit(31300, 9600) - (9600 - 31300 * 0.066)) < 1e-6);       // 200% of $15,650: 6.60%
  assert.ok(Math.abs(premiumCredit(15650 * 1.4, 9600) - (9600 - 15650 * 1.4 * (0.0314 + (0.0419 - 0.0314) * (0.07 / 0.17)))) < 1e-6);
  assert.ok(Math.abs(premiumCredit(62600, 9600) - (9600 - 62600 * 0.0996)) < 1e-6);      // exactly 400%
  assert.equal(premiumCredit(62601, 9600), 0); assert.equal(premiumCredit(15000, 9600), 0); assert.equal(premiumCredit(31300, 0), 0);
  assert.ok(premiumCredit(42300, 9600, 2) > premiumCredit(42300, 9600, 1));              // two people: a higher poverty line
});

test('gains are taxed when taxable money is sold, and the credit lowers what cover costs before 65', () => {
  const base = { age: 60, planAge: 62, retireAge: 60, realReturn: 0, work: { saving: { pretax: 0, roth: 0, taxable: 0 } }, ss: { claimAge: 67, yearly: 0 }, strategy: { id: 'fixed' } };
  const tax = { filingStatus: 'Single', place: { state: 'TX' } };
  // $200,000 a year sold from an account that is half gain: $100,000 of gains, $83,900 taxable, 15% above $49,450.
  const g = lifetime({ ...base, start: { taxable: 2000000, pretax: 0, roth: 0, basis: 1000000 }, spendingAfter: 190000, tax }, ref).years[0];
  assert.ok(g.gains > 95000 && g.gains < 105000, String(g.gains)); assert.ok(g.tax > 4000 && g.tax < 6500, String(g.tax));
  assert.equal(lifetime({ ...base, start: { taxable: 2000000, pretax: 0, roth: 0 }, spendingAfter: 190000, tax }, ref).years[0].tax, 0); // all basis: nothing to tax
  // Cover at $800 a month, $30,000 a year of spending from taxed-later money: income near 250% of the line.
  const h = { ...base, start: { taxable: 0, pretax: 900000, roth: 0 }, spendingAfter: 30000 };
  const off = lifetime({ ...h, tax: { ...tax, health: 9600 } }, ref).years[0], on = lifetime({ ...h, tax: { ...tax, health: 9600, aca: true } }, ref).years[0];
  assert.equal(off.credit, 0); assert.ok(on.credit > 4000 && on.credit < 9600, String(on.credit)); assert.ok(on.withdraw < off.withdraw - 4000);
});

test('planning for two: both benefits, joint taxes, cover for each person under 65, and the younger one\'s years', () => {
  const x = { age: 66, planAge: 90, retireAge: 66, realReturn: 0.03, start: { taxable: 0, pretax: 800000, roth: 0 }, work: { saving: { pretax: 0, roth: 0, taxable: 0 } }, spendingAfter: 50000, ss: { claimAge: 67, yearly: 24000 }, strategy: { id: 'fixed' }, tax: { filingStatus: 'Married jointly', place: { state: 'TX' }, health: 9600 } };
  const one = lifetime(x, ref), two = lifetime({ ...x, partner: { age: 61, ss: { claimAge: 67, yearly: 18000 } } }, ref);
  assert.equal(one.years.length, 25); assert.equal(two.years.length, 30);        // five more years for the younger one
  assert.equal(under65(66, { ...x, partner: { age: 61 } }), 1); assert.equal(under65(70, { ...x, partner: { age: 61 } }), 0);
  assert.equal(two.years[0].need, 59600); assert.equal(one.years[0].need, 50000); // cover for the one under 65
  assert.equal(two.years[1].ss, 24000); assert.equal(two.years[6].ss, 42000);    // theirs starts when they reach 67
});

test('the Medicare extra premium: the whole step once income is over the line, per person, by filing status', () => {
  const single = { filingStatus: 'Single' }.filingStatus;
  assert.equal(medicareSurcharge(109000, single, ref), 0);
  near(medicareSurcharge(109001, single, ref), (81.20 + 14.50) * 12, 0.001, 'one dollar over the first line');
  near(medicareSurcharge(180000, single, ref), (324.60 + 60.40) * 12, 0.001, 'the third step');
  near(medicareSurcharge(600000, single, ref), (487 + 91) * 12, 0.001, 'the top step');
  assert.equal(medicareSurcharge(180000, 'Married jointly', ref), 0);
  near(medicareSurcharge(218001, 'Married jointly', ref), (81.20 + 14.50) * 12, 0.001, 'joint, one dollar over');
  near(medicareSurcharge(120000, 'Head of household', ref), (81.20 + 14.50) * 12, 0.001, 'head of household uses the single lines');
});

test('bracket room: where taxable income sits and what fits before the next bracket', () => {
  const list = ref.tax.brackets.single, twelve = list.find(b => b[1] === 0.12), next = list[list.indexOf(twelve) + 1];
  const r = bracketRoom(twelve[0] + 1000, 'Single', ref);
  assert.equal(r.rate, 0.12); assert.equal(r.nextRate, next[1]); assert.equal(r.room, next[0] - twelve[0] - 1000);
  assert.equal(bracketRoom(0, 'Single', ref).rate, list[0][1]);
  const top = bracketRoom(list.at(-1)[0] + 5, 'Single', ref);
  assert.equal(top.rate, list.at(-1)[1]); assert.equal(top.room, null);
});

test('more conversion choices: each fill line is the standard deduction plus the top of its bracket', () => {
  const std = ref.tax.standardDeduction.single, startOf = rate => ref.tax.brackets.single.find(b => b[1] > rate)[0];
  assert.deepEqual(FILLS.map(f => f.id), ['none', 'deduction', '12', '22', '24']);
  assert.equal(fillRoom('12', { filingStatus: 'Single' }, ref), std + startOf(0.12));
  assert.equal(fillRoom('22', { filingStatus: 'Single' }, ref), std + startOf(0.22));
  assert.equal(fillRoom('24', { filingStatus: 'Single' }, ref), std + startOf(0.24));
  assert.ok(fillRoom('24', { filingStatus: 'Single' }, ref) > fillRoom('22', { filingStatus: 'Single' }, ref));
});

test('a big conversion at 65 raises the Medicare premium two years later, and it comes out of the money', () => {
  const x = { ...plain, planAge: 70, start: { taxable: 1000000, pretax: 2000000, roth: 0 }, tax: { filingStatus: 'Single', fill: '24' } };
  const run = lifetime(x, ref), y = age => run.years.find(r => r.age === age);
  assert.equal(y(65).medicare, 0); assert.equal(y(66).medicare, 0);
  const income65 = y(65).convert + y(65).gains; // no pay, no Social Security, nothing else taken from pretax
  assert.ok(income65 > 109000, 'the 24% fill is past the first line');
  near(y(67).medicare, medicareSurcharge(income65, 'Single', ref), 0.01, 'age 67 pays on age 65 income');
  near(run.surcharges, run.years.reduce((t, r) => t + (r.medicare ?? 0), 0), 0.01, 'the total is the sum of the years');
  const none = lifetime({ ...x, tax: { filingStatus: 'Single', fill: 'none' } }, ref);
  assert.equal(none.surcharges, 0);
  near(y(67).withdraw - y(67).tax - (y(67).spend), y(67).medicare, 1, 'the extra premium is taken out on top of spending');
});

test('conversions side by side: cost adds up, no conversions is the yardstick, payback is an age after the first conversion', () => {
  const x = { ...plain, age: 60, retireAge: 60, planAge: 90, realReturn: 0.04, start: { taxable: 400000, pretax: 1500000, roth: 0 }, spendingAfter: 50000, ss: { claimAge: 67, yearly: 30000 }, tax: { filingStatus: 'Single', fill: 'none' } };
  const fills = fillsOf({ run: lifetime(x, ref), x }, ref), by = id => fills.find(f => f.id === id);
  assert.equal(fills.length, 5);
  for (const f of fills) near(f.cost, f.tax + f.penalties + f.medicare, 0.01, `${f.id} cost`);
  assert.equal(by('none').payback, null); assert.equal(by('none').saves, 0); assert.equal(by('none').converted, 0);
  assert.ok(by('12').converted > by('deduction').converted, 'the 12% line moves more than the 0% line');
  assert.ok(by('24').endTaxedLater < by('none').endTaxedLater && by('none').endTaxedLater > 0, 'converting leaves less still to be taxed');
  near(by('12').saves, by('none').cost - by('12').cost, 0.01, 'saves is the difference in everything paid');
  for (const f of fills.filter(f => f.payback != null)) assert.ok(f.payback > 60 && f.payback <= 90 && f.saves >= -0.5, `${f.id} pays back inside the plan`);
  for (const f of fills.filter(f => f.id !== 'none' && f.payback == null)) assert.ok(f.saves < 0.5, `${f.id} never catches up, so it saves nothing`);
  const marks = cliffsOf({ run: lifetime(x, ref), x });
  assert.deepEqual(marks.slice(0, 3).map(m => [m.id, m.age]), [['medicare', 65], ['claim', 67], ['rmd', 73]]);
  assert.equal(marks[1].amount, 30000);
  near(marks[2].amount, lifetime(x, ref).years.find(y => y.age === 72).pretax / 26.5, 1, 'the first required withdrawal is the balance over 26.5');
  const extra = marks.find(m => m.id === 'extra');
  if (extra) assert.ok(extra.age >= 67 && extra.amount > 0, 'an extra premium is two years after the income that set it');
});

test('this year: the bracket and the room come from pay after pretax saving and the standard deduction', () => {
  const doc = { profile: {}, taxes: { filingStatus: 'Single' } }, plan = { m: { inputs: { income: [{ gross: 70000 }] }, pretaxSaving: 500 } };
  const t = taxNowOf(plan, doc, ref), taxable = 70000 - 6000 - ref.tax.standardDeduction.single;
  assert.equal(t.taxable, taxable);
  assert.deepEqual({ rate: t.rate, room: t.room }, { rate: bracketRoom(taxable, 'Single', ref).rate, room: bracketRoom(taxable, 'Single', ref).room });
  assert.equal(taxNowOf({ m: { inputs: { income: [] } } }, doc, ref), null);
});
