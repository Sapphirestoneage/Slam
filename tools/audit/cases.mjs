// SPDX-License-Identifier: AGPL-3.0-only
// The audit's first half: make thousands of made-up cases from a seed, run SLAM's own math on each, and write the
// inputs and SLAM's answers to one file. The second engine (engine2.py) reads the inputs, works each answer out its
// own way, and compares. Usage: node tools/audit/cases.mjs <out.json> [cases per function] [seed]
import { readFileSync, writeFileSync } from 'node:fs';
import { federalTax, fica, stateTax, takeHomeFromGross, grossFromTakeHome } from '../../js/math/income.js';
import { payoffMonths, totalInterest, payoffPlan, cardMinimum } from '../../js/math/debt.js';
import { fiNumber, fiDate, coastFi, solveMonthlySaving } from '../../js/math/fi.js';
import { yearsAtRate } from '../../js/math/simple.js';
import { runwayOf, backwardsOf, tripCostOf, habitCostOf } from '../../js/solo.js';
import { taxableSocialSecurity, gainsTax, requiredWithdrawal, premiumCredit, yearTax, medicareSurcharge, lifetime, earliestFreedom } from '../../js/math/lifetime.js';

const [out = '/tmp/slam-audit-cases.json', nArg = '500', seedArg = '20261114'] = process.argv.slice(2);
const N = Number(nArg), ref = JSON.parse(readFileSync(new URL('../../data/reference-2026.json', import.meta.url)));
let s = Number(seedArg) >>> 0;
const rnd = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)], between = (lo, hi) => lo + rnd() * (hi - lo), whole = (lo, hi) => Math.floor(between(lo, hi + 1));
const money = (lo, hi) => Math.round(Math.exp(between(Math.log(lo), Math.log(hi)))); // spread evenly across sizes, small to large
const STATUS = ['Single', 'Married jointly', 'Head of household'], PLACES = [null, { state: 'NY' }, { state: 'NY', nyc: true }];
const NOW = new Date('2026-11-14T12:00:00Z');
const cases = [];
const add = (fn, input, output) => cases.push({ fn, input, output });
const v = r => (r && typeof r === 'object' && 'value' in r ? r.value : r);

for (let i = 0; i < N; i++) {
  { const x = { gross: money(5000, 900000), pretax: rnd() < 0.5 ? 0 : whole(0, 24500), filingStatus: pick(STATUS) }; const r = federalTax(x, ref); add('federalTax', x, { tax: r.value, taxable: r.taxable, marginal: r.marginal }); }
  { const x = { gross: money(5000, 900000), filingStatus: pick(STATUS), selfEmployed: rnd() < 0.3 }; const r = fica(x, ref); add('fica', x, { total: r.value, ss: r.socialSecurity, medicare: r.medicare, half: r.deductibleHalf }); }
  { const x = { gross: money(5000, 900000), pretax: rnd() < 0.5 ? 0 : whole(0, 24500), filingStatus: pick(STATUS), place: pick(PLACES.slice(1)) }; const r = stateTax(x, ref); add('stateTax', x, { state: r.state, local: r.local }); }
  { const x = { gross: money(8000, 600000), pretax: rnd() < 0.5 ? 0 : whole(0, 24500), roth: rnd() < 0.7 ? 0 : whole(0, 7000), filingStatus: pick(STATUS), selfEmployed: rnd() < 0.2, place: pick(PLACES) }; add('takeHome', x, { takeHome: v(takeHomeFromGross(x, ref)) }); }
  { const x = { takeHome: money(8000, 350000), pretax: rnd() < 0.5 ? 0 : whole(0, 20000), filingStatus: pick(STATUS), place: pick(PLACES) }; add('grossFromTakeHome', x, { gross: v(grossFromTakeHome(x, ref)) }); }
  { const balance = money(200, 120000), apr = pick([0, 0.0299, 0.0655, 0.0899, 0.1499, 0.2199, 0.2499, 0.2999, 0.36]), payment = Math.max(15, Math.round(balance * between(0.006, 0.08)));
    const x = { balance, apr, payment }, m = payoffMonths(x, { from: NOW }), ti = totalInterest(x); add('debtOne', x, { months: m.value, exact: m.exact ?? null, never: !!m.never, paymentNeeded: m.paymentNeeded ?? null, interest: v(ti) ?? null, simulated: ti.simulated ?? null, formula: ti.formula ?? null, minimum: v(cardMinimum(x)) }); }
  { const n = whole(2, 6), debts = []; for (let k = 0; k < n; k++) { const balance = money(300, 60000), apr = pick([0, 0.039, 0.0655, 0.0899, 0.1499, 0.2199, 0.2499, 0.2999]); const d = { name: `D${k}`, type: 'Credit card', balance, apr, payment: Math.max(25, Math.ceil(balance * (apr / 12 + between(0.004, 0.04)))) }; if (rnd() < 0.25) { d.promoMonths = whole(3, 21); d.promoApr = pick([0, 0, 0.0299]); } debts.push(d); }
    const x = { debts, extra: pick([0, 0, 50, 100, 250, 500]), order: pick(['avalanche', 'snowball']) }, p = payoffPlan(debts, { extra: x.extra, order: x.order, now: NOW }); add('debtPlan', x, { months: p.months, interest: p.interest, each: Object.fromEntries(p.debts.map(d => [d.name, d.paidOffMonth])) }); }
  { const x = { annualSpending: money(12000, 300000), withdrawalRate: pick([0.03, 0.035, 0.04, 0.047, 0.052]) }; add('fiNumber', x, { fi: v(fiNumber(x)) }); }
  { const x = { invested: rnd() < 0.2 ? 0 : money(500, 1500000), monthlyInvesting: rnd() < 0.1 ? 0 : money(50, 9000), realReturn: pick([0.03, 0.05, 0.06, 0.07, 0.08, 0.12]), target: money(200000, 6000000) }; const r = fiDate(x, { from: NOW }); add('fiDate', x, { months: r.value, never: !!r.never }); }
  { const x = { fiNumber: money(300000, 5000000), realReturn: pick([0.05, 0.06, 0.07, 0.08]), age: whole(18, 62), retireAge: pick([55, 60, 65, 67]) }; add('coastFi', x, { coast: v(coastFi(x)) }); }
  { const x = { invested: rnd() < 0.2 ? 0 : money(500, 800000), realReturn: pick([0.05, 0.06, 0.07, 0.08]), target: money(300000, 4000000), months: whole(24, 480) }; add('solveSaving', x, { monthly: v(solveMonthlySaving(x)) }); }
  { const x = { s: whole(1, 99) / 100, realReturn: pick([0.03, 0.05, 0.07]), withdrawalRate: pick([0.03, 0.04, 0.05]) }; add('yearsAtRate', x, { years: yearsAtRate(x.s, x) }); }
  { const x = { cash: rnd() < 0.05 ? 0 : money(100, 200000), spending: money(900, 15000), stillIn: pick([0, 0, 500, 1000, 1500, 2000]), cut: pick([0, 0.1, 0.2, 0.3]) }; const r = runwayOf({ ...x, now: NOW }); add('runway', x, { covered: !!r.covered, months: r.months ?? null, whole: r.whole ?? null, extraMonths: r.extraMonths ?? null }); }
  { const x = { need: money(1500, 12000), per: 'month', years: pick([5, 10, 15, 20, 25, 30]), have: rnd() < 0.2 ? 0 : money(500, 900000), takeHome: money(2500, 16000), spending: money(1500, 12000) }; const r = backwardsOf({ ...x, ref, now: NOW }); add('backwards', x, { total: r.total, grown: r.grown, needed: r.needed, months: r.months, gap: r.gap }); }
  { const x = { cost: money(200, 20000), age: whole(18, 70), invested: rnd() < 0.3 ? null : money(500, 900000), monthly: rnd() < 0.2 ? null : money(50, 6000), spending: money(1500, 12000) }; const r = tripCostOf({ ...x, ref }); add('trip', x, { grown: r.grown, aYear: r.aYear, at22: r.byAge[0].grown, at60: r.byAge[4].grown, share: r.share, monthsOfSaving: r.monthsOfSaving, before: r.before, after: r.after, delay: r.delay }); }
  { const x = { amount: money(2, 2000), per: pick(['week', 'month']), years: pick([5, 10, 20, 30]) }; const r = habitCostOf({ ...x, ref }); add('habit', x, { grown: r.grown, spent: r.spent, needs: r.needs, times: r.times }); }
  { const x = { ss: money(6000, 70000), other: rnd() < 0.15 ? 0 : money(1000, 200000), filingStatus: pick(STATUS) }; add('taxableSS', x, { taxed: taxableSocialSecurity(x.ss, x.other, x.filingStatus) }); }
  { const x = { gains: money(500, 900000), ordinaryTaxable: rnd() < 0.2 ? 0 : money(1000, 700000), key: pick(['single', 'joint', 'head']) }; add('gainsTax', x, { tax: gainsTax(x.gains, x.ordinaryTaxable, x.key) }); }
  { const x = { age: whole(60, 104), pretax: money(1000, 5000000), startAge: pick([73, 75]) }; add('rmd', x, { out: requiredWithdrawal(x.age, x.pretax, x.startAge) }); }
  { const x = { income: money(8000, 160000), benchmark: money(3000, 30000), people: whole(1, 4) }; add('premiumCredit', x, { credit: premiumCredit(x.income, x.benchmark, x.people) }); }
  { const x = { ordinary: rnd() < 0.15 ? 0 : money(1000, 400000), ss: rnd() < 0.5 ? 0 : money(6000, 70000), gains: rnd() < 0.5 ? 0 : money(500, 300000), tax: { filingStatus: pick(STATUS), place: pick(PLACES) } }; add('yearTax', x, { tax: yearTax(x, x.tax, ref) }); }
  { const x = { magi: money(40000, 900000), filingStatus: pick(STATUS) }; add('medicare', x, { extra: medicareSurcharge(x.magi, x.filingStatus, ref) }); }
}
// The whole-life run: fewer cases (each is 60 or so years), every strategy, conversions, two people, blocks, the credit.
const lifeCase = () => {
  const age = whole(22, 62), two = rnd() < 0.3, spendingAfter = money(24000, 160000);
  const blocks = []; for (let k = whole(0, 2); k > 0; k--) { const fromAge = age + whole(0, 40); blocks.push({ fromAge, toAge: fromAge + whole(0, 15), spending: rnd() < 0.7 ? money(2000, 40000) : 0, income: rnd() < 0.3 ? money(2000, 40000) : 0, once: rnd() < 0.3 ? money(2000, 80000) : 0 }); }
  const roth = rnd() < 0.3 ? 0 : money(500, 600000);
  return {
    age, planAge: pick([90, 95]), retireAge: age + whole(0, 35), realReturn: pick([0.03, 0.05, 0.06, 0.07]), rmdAge: pick([73, 75]),
    start: { taxable: rnd() < 0.3 ? 0 : money(500, 1500000), pretax: rnd() < 0.2 ? 0 : money(500, 3000000), roth, rothFree: rnd() < 0.5 ? 0 : Math.round(roth * rnd()) },
    work: { income: rnd() < 0.2 ? 0 : money(20000, 400000), saving: { pretax: rnd() < 0.2 ? 0 : money(1000, 31000), roth: rnd() < 0.4 ? 0 : whole(500, 7500), taxable: rnd() < 0.4 ? 0 : money(500, 60000) }, wait: { years: pick([0, 0, 1, 2, 4]), pretax: pick([0, 2000, 6000]) } },
    spendingAfter, eras: rnd() < 0.6 ? { slowGoAge: 75, noGoAge: 85, slowGo: 0.85, noGo: 0.75 } : null,
    ss: { claimAge: pick([62, 67, 70]), yearly: rnd() < 0.15 ? 0 : money(8000, 48000) }, partTime: rnd() < 0.25 ? { yearly: money(6000, 40000), untilAge: 64 } : null, blocks,
    strategy: { id: pick(['fixed', 'fixed', 'guardrails', 'floor', 'percent']), rate: pick([0.035, 0.04, 0.05]) },
    tax: { filingStatus: two ? 'Married jointly' : pick(['Single', 'Head of household']), place: pick(PLACES), fill: pick(['none', 'none', 'deduction', '12', '22', '24']), health: pick([0, 0, 6000, 9600]), aca: rnd() < 0.7 },
    partner: two ? { age: age + whole(-8, 8), ss: { claimAge: pick([62, 67, 70]), yearly: money(6000, 40000) } } : null,
  };
};
const slim = run => ({ ok: run.ok, ranOutAge: run.ranOutAge, atRetire: run.atRetire, end: run.end, lifetimeTax: run.lifetimeTax, penalties: run.penalties, surcharges: run.surcharges, lowestSpend: run.lowestSpend, creditHeld: run.creditHeld.map(c => [c.age, c.line]),
  years: run.years.map(y => [y.age, y.total, y.tax, y.spend, y.withdraw, y.convert, y.penalty, y.short, y.taxable, y.pretax, y.roth]) });
const L = Math.max(20, Math.round(N * 0.6));
for (let i = 0; i < L; i++) { const x = lifeCase(); add('lifetime', x, slim(lifetime(x, ref))); }
for (let i = 0; i < Math.round(L / 6); i++) { const x = lifeCase(); x.strategy = { id: 'fixed' }; add('earliest', x, { age: earliestFreedom(x, ref).age }); }
writeFileSync(out, JSON.stringify({ seed: Number(seedArg), perFunction: N, made: new Date().toISOString().slice(0, 10), cases }));
const count = {}; for (const c of cases) count[c.fn] = (count[c.fn] || 0) + 1;
console.log(`${cases.length} cases written to ${out}`, JSON.stringify(count));
