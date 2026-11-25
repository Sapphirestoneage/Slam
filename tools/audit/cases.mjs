// SPDX-License-Identifier: AGPL-3.0-only
// The audit's first half: make thousands of made-up cases from a seed, run SLAM's own math on each, and write the
// inputs and SLAM's answers to one file. The second engine (engine2.py) reads the inputs, works each answer out its
// own way, and compares. Usage: node tools/audit/cases.mjs <out.json> [cases per function] [seed]
import { readFileSync, writeFileSync } from 'node:fs';
import { federalTax, fica, stateTax, takeHomeFromGross, grossFromTakeHome } from '../../js/math/income.js';
import { payoffMonths, totalInterest, payoffPlan, cardMinimum } from '../../js/math/debt.js';
import { fiNumber, fiDate, coastFi, solveMonthlySaving, fatFiNumber, chubbyFiNumber, baristaGap, fiStress } from '../../js/math/fi.js';
import { yearsAtRate } from '../../js/math/simple.js';
import { fireSheetRows } from '../../js/math/firesheet.js';
import { runwayOf, backwardsOf, tripCostOf, habitCostOf, loanCostOf, stoppedPayOf, workYearsOf, coastOf, dollarLaterOf, carFitsOf, expectedWorthOf, realWageOf, splitOf, homeFitsOf } from '../../js/solo.js';
import { ilIncomeTaxOf, ilNationalInsuranceOf, olimPointsOf, aliyahOf } from '../../js/math/aliyah.js';
import { RULES } from '../../js/registry/assumptions.js';
import { rcRoute, rcTriage, rcRefill, rcSafeLine, rcAudit, RC_ORDER } from '../../js/math/recalc.js';
import { Store, newHousehold } from '../../js/records.js';
import { answer } from '../../js/journey.js';
import { taxableSocialSecurity, gainsTax, requiredWithdrawal, premiumCredit, yearTax, medicareSurcharge, lifetime, earliestFreedom, worked } from '../../js/math/lifetime.js';
import { WAYS, wayCustom, waySpend, wayReturn, wayPay, wayHistory, wayTolerance, vpwShare, spendDownPayment } from '../../js/math/withdraw.js';

const [out = '/tmp/slam-audit-cases.json', nArg = '500', seedArg = '20261114'] = process.argv.slice(2);
const N = Number(nArg), ref = JSON.parse(readFileSync(new URL('../../data/reference-2026.json', import.meta.url)));
const il = JSON.parse(readFileSync(new URL('../../data/sources/israel-2026.json', import.meta.url)));
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
  // the FI destinations (run of Nov 25 2026): Fat with or without a list of extras, Chubby, what part-time pay closes, the stress table
  { const x = { annualSpending: money(12000, 300000), extrasAnnual: rnd() < 0.4 ? null : pick([0, 3000, 6000, 12000, 24000, 60000]), factor: RULES.fatFactor, withdrawalRate: pick([0.03, 0.035, 0.04, 0.047]) };
    const fat = fatFiNumber(x), regular = v(fiNumber(x)); add('fatFi', x, { fat: v(fat), chubby: v(chubbyFiNumber({ regular, fat: v(fat) })), fromList: !!fat.fromTemplate }); }
  { const x = { annualSpending: money(12000, 200000), partTimeIncome: money(3000, 90000), healthAnnual: rnd() < 0.3 ? null : pick([0, 3600, 6000, 9600, 14400, 21600]), withdrawalRate: pick([0.03, 0.035, 0.04, 0.047]) };
    const r = baristaGap(x); add('baristaGap', x, { closes: v(r), covers: r.covers, afterHealth: r.afterHealth, left: r.left }); }
  { const x = { invested: rnd() < 0.2 ? 0 : money(500, 1500000), monthlyInvesting: rnd() < 0.1 ? 0 : money(50, 9000), annualSpending: money(12000, 240000), rates: ref.fiStress.withdrawalRates, returns: ref.fiStress.returns };
    const r = fiStress(x, x, { from: NOW }); add('fiStress', x, { rows: r.rows.map(row => ({ target: row.target, months: row.cells.map(c => c.months) })), soonest: r.soonest, latest: r.latest }); }
  // The FIRE sheet (M9I): every year row of the tab, for each way to take money out the sheet can write as a formula
  { const age = whole(18, 70), x = { year: 2026, age, stopAge: age + whole(-2, 35), lastAge: pick([90, 95]), income: rnd() < 0.1 ? 0 : money(20000, 400000), spending: money(12000, 200000), spendingAfter: money(12000, 200000), invested: rnd() < 0.15 ? 0 : money(500, 3000000),
      contributions: [rnd() < 0.2 ? 0 : money(1000, 31000), rnd() < 0.4 ? 0 : whole(500, 7500), rnd() < 0.4 ? 0 : money(500, 60000)], realReturn: pick([0, 0.03, 0.05, 0.07]), safeRate: pick([0.03, 0.04, 0.05]), other: rnd() < 0.2 ? 0 : money(8000, 48000), otherAge: pick([62, 67, 70]), kind: pick(['steady', 'share', 'floor', 'guardrails', 'guardrails']), rate: pick([0.035, 0.04, 0.05]) };
    add('fireSheet', x, { rows: fireSheetRows(x).map(r => [r.balance, r.withdrawal, r.spending, r.savingsRate, r.pctToFi]) }); }
  { const x = { invested: rnd() < 0.2 ? 0 : money(500, 800000), realReturn: pick([0.05, 0.06, 0.07, 0.08]), target: money(300000, 4000000), months: whole(24, 480) }; add('solveSaving', x, { monthly: v(solveMonthlySaving(x)) }); }
  { const x = { s: whole(1, 99) / 100, realReturn: pick([0.03, 0.05, 0.07]), withdrawalRate: pick([0.03, 0.04, 0.05]) }; add('yearsAtRate', x, { years: yearsAtRate(x.s, x) }); }
  { const x = { cash: rnd() < 0.05 ? 0 : money(100, 200000), spending: money(900, 15000), stillIn: pick([0, 0, 500, 1000, 1500, 2000]), cut: pick([0, 0.1, 0.2, 0.3]) }; const r = runwayOf({ ...x, now: NOW }); add('runway', x, { covered: !!r.covered, months: r.months ?? null, whole: r.whole ?? null, extraMonths: r.extraMonths ?? null }); }
  { const x = { need: money(1500, 12000), per: 'month', years: pick([5, 10, 15, 20, 25, 30]), have: rnd() < 0.2 ? 0 : money(500, 900000), takeHome: money(2500, 16000), spending: money(1500, 12000) }; const r = backwardsOf({ ...x, ref, now: NOW }); add('backwards', x, { total: r.total, grown: r.grown, needed: r.needed, months: r.months, gap: r.gap }); }
  { const x = { cost: money(200, 20000), age: whole(18, 70), invested: rnd() < 0.3 ? null : money(500, 900000), monthly: rnd() < 0.2 ? null : money(50, 6000), spending: money(1500, 12000) }; const r = tripCostOf({ ...x, ref }); add('trip', x, { grown: r.grown, aYear: r.aYear, at22: r.byAge[0].grown, at60: r.byAge[4].grown, share: r.share, monthsOfSaving: r.monthsOfSaving, before: r.before, after: r.after, delay: r.delay }); }
  // Aliyah Math (Run 8): Israeli income tax and National Insurance, then one whole month on an Israeli salary
  { const x = { monthly: money(2000, 120000), year: whole(1, 6), resident: pick([il.creditPoints.residentBase.man, il.creditPoints.residentBase.woman]), ceiling: rnd() < 0.5 ? null : pick(Object.values(il.olimZeroRate.ceilingAnnual)) };
    const pts = x.resident + olimPointsOf(x.year, il), t = ilIncomeTaxOf({ monthly: x.monthly, points: pts, zeroCeiling: x.ceiling }, il), n = ilNationalInsuranceOf({ monthly: x.monthly }, il); add('ilTax', x, { points: pts, tax: t.tax, ni: n.total, health: n.health }); }
  { const x = { rate: pick([3, 3.4, 3.65, 4.1]), usGross: money(20000, 400000), salary: money(4000, 60000), filing: pick(['Single', 'Married jointly']), year: whole(1, 6), debt: pick([0, 300, 900]), savings: money(1000, 200000), moveCost: pick([0, 8000]), usSpend: money(1500, 9000), ilSpend: money(3000, 30000), usTaxAbroad: pick([null, 2400]) };
    const r = aliyahOf({ ...x, scenario: 'salary', spend: { food: { us: x.usSpend, il: x.ilSpend }, home: { us: 0, il: 0 }, move: { us: 0, il: 0 }, health: { us: 0, il: 0 }, rest: { us: 0, il: 0 } } }, ref, il);
    add('aliyah', x, { usLeft: r.us.left, ilLeft: r.il.left, diff: r.diff, monthsUs: r.cushion.monthsUs, monthsIl: r.cushion.monthsIl, lasts: r.cushion.lasts }); }
  // the canon pack (Run 5)
  { const x = { takeHome: money(1500, 20000) }; x.spending = Math.round(x.takeHome * between(0.2, 0.97)); const r = workYearsOf({ ...x, ref }); add('workYears', x, { rate: r.rate, years: r.years, yearsUp: r.yearsUp, up: r.up, moreAMonth: r.moreAMonth, printed: r.printed }); }
  { const x = { invested: rnd() < 0.15 ? 0 : money(500, 2000000), spending: money(1200, 12000), age: whole(18, 62), retireAge: pick([55, 60, 65, 67]) }; const r = coastOf({ ...x, ref }); add('coast', x, { fi: r.fi, coast: r.coast, there: r.there, gap: r.gap, grown: r.grown }); }
  { const x = { age: whole(18, 70), amount: pick([1, 100, 1000, 10000]) }; const r = dollarLaterOf({ ...x, ref }); add('dollarLater', x, { times: r.times, grown: r.grown }); }
  { const x = { grossMonthly: money(1500, 30000), apr: pick([0, 0.04, 0.07, 0.1, 0.14]), price: rnd() < 0.3 ? null : money(3000, 90000) }; const r = carFitsOf(x); add('carFits', x, { maxPayment: r.maxPayment, maxLoan: r.maxLoan, maxPrice: r.maxPrice, payment: r.payment ?? null, fits: r.fits ?? null }); }
  { const x = { age: whole(18, 75), grossYear: money(15000, 600000), netWorth: rnd() < 0.1 ? 0 : money(500, 5000000) }; const r = expectedWorthOf(x); add('expectedWorth', x, { expected: r.expected, ratio: r.ratio, adjusted: r.adjusted, adjustedRatio: r.adjustedRatio }); }
  { const x = { takeHome: money(1200, 20000), hoursWeek: pick([20, 30, 40, 45, 50, 60]), commuteWeek: pick([0, 2, 5, 8, 10, 15]), costs: pick([0, 50, 150, 300, 500]) }; const r = realWageOf(x); add('realWage', x, { real: r.real, stated: r.stated, hoursPer100: r.hoursPer100 }); }
  { const x = { takeHome: money(1500, 20000) }; x.needs = Math.round(x.takeHome * between(0.2, 0.9)); x.wants = Math.round(x.takeHome * between(0, 0.4)); const r = splitOf(x); add('split', x, { left: r.left, needs: r.shares.needs, wants: r.shares.wants, kept: r.shares.left, markNeeds: r.marks.needs, markWants: r.marks.wants, markLeft: r.marks.left }); }
  // Recalculating (js/math/recalc.js): the route, the triage, the refill, the safe-to-fail line and the audit.
  { const x = { planAt: `${whole(2024, 2026)}-${String(whole(1, 12)).padStart(2, '0')}-15`, planMonths: whole(0, 400), nowAt: `2026-${String(whole(1, 12)).padStart(2, '0')}-20`, months: rnd() < 0.1 ? null : whole(0, 420), open: true }; const r = rcRoute(x); add('rcRoute', x, { oldYm: r.oldYm, newYm: r.newYm, shift: r.shift, moved: r.moved, later: r.later, noDate: r.noDate }); }
  { const CL = RC_ORDER.map(o => o[0]), bills = Array.from({ length: whole(1, 12) }, (_, k) => ({ name: `B${k}`, cls: pick(CL), amount: rnd() < 0.05 ? null : money(10, 4000) })); const x = { income: money(300, 12000), bills }, r = rcTriage(x);
    add('rcTriage', x, { total: r.total, short: r.short, left: r.left, covered: r.covered, firstShort: r.firstShort ? CL.indexOf(r.firstShort) : null, open: r.open, paid: Object.fromEntries(r.rows.map(b => [b.name, b.paid])) }); }
  { const x = { target: money(500, 60000), balance: money(1, 70000), monthly: rnd() < 0.1 ? null : money(10, 3000), nowAt: `2026-${String(whole(1, 12)).padStart(2, '0')}-05` }, r = rcRefill(x); add('rcRefill', x, { gap: r.gap, months: r.months, ym: r.full ? null : r.ym, full: r.full }); }
  { const x = { cap: money(10, 800), spent: rnd() < 0.1 ? null : money(1, 1200) }, r = rcSafeLine(x); add('rcSafeLine', x, { left: r.left, over: r.over, ranOut: r.ranOut, planCost: r.planCost }); }
  { const TAGS = ['mistake', 'unavoidable', null], KS = ['Late fee', 'Overdraft', 'Car repair', 'Other'], events = Array.from({ length: whole(1, 9) }, (_, k) => ({ id: `e${k}`, kind: pick(KS), amount: rnd() < 0.08 ? null : money(5, 9000), tag: pick(TAGS), yearsAgo: Math.round(between(0, 6) * 10) / 10 }));
    const x = { events, realReturn: pick([0.03, 0.04, 0.05, 0.06]), years: whole(1, 40), perDay: money(2, 300), hourly: money(8, 150), yearIncome: money(15000, 300000) }, r = rcAudit(x);
    add('rcAudit', x, { mCount: r.mistake.count, mCost: r.mistake.cost, mLater: r.mistake.later, mDays: r.mistake.fiDays, mHours: r.mistake.hours, uCost: r.unavoidable.cost, uLater: r.unavoidable.later, untagged: r.untagged, open: r.open, tax: r.tax, repeats: r.repeats.length, repeatCost: r.repeats.reduce((t, k) => t + k.cost, 0) }); }
  { const x = { grossMonthly: money(2000, 40000), otherDebt: rnd() < 0.3 ? 0 : money(50, 6000) }; const r = homeFitsOf(x); add('homeFits', { ...x, rate: RULES.lenderMortgageRate, years: RULES.lenderMortgageYears, taxIns: RULES.lenderTaxInsShare, front: RULES.lenderFront, back: RULES.lenderBack }, { payment: r.payment, loan: r.loan, by: r.by }); }
  { const x = { amount: money(2, 2000), per: pick(['week', 'month']), years: pick([5, 10, 20, 30]) }; const r = habitCostOf({ ...x, ref }); add('habit', x, { grown: r.grown, spent: r.spent, needs: r.needs, times: r.times }); }
  { const x = { amount: money(500, 600000), apr: pick([0, 0.029, 0.04, 0.0655, 0.07, 0.1, 0.15, 0.25]), years: pick([1, 2, 3, 5, 7, 10, 15, 30]) }; const r = loanCostOf({ ...x, ref }); add('loan', x, { payment: r.payment, paid: r.paid, interest: r.interest, interestToday: r.interestToday, invested: r.invested, fiNumber: r.fiNumber }); }
  { const x = { ss: money(6000, 70000), other: rnd() < 0.15 ? 0 : money(1000, 200000), filingStatus: pick(STATUS) }; add('taxableSS', x, { taxed: taxableSocialSecurity(x.ss, x.other, x.filingStatus) }); }
  { const x = { gains: money(500, 900000), ordinaryTaxable: rnd() < 0.2 ? 0 : money(1000, 700000), key: pick(['single', 'joint', 'head']) }; add('gainsTax', x, { tax: gainsTax(x.gains, x.ordinaryTaxable, x.key) }); }
  { const x = { age: whole(60, 104), pretax: money(1000, 5000000), startAge: pick([73, 75]) }; add('rmd', x, { out: requiredWithdrawal(x.age, x.pretax, x.startAge) }); }
  { const x = { income: money(8000, 160000), benchmark: money(3000, 30000), people: whole(1, 4) }; add('premiumCredit', x, { credit: premiumCredit(x.income, x.benchmark, x.people) }); }
  { const x = { ordinary: rnd() < 0.15 ? 0 : money(1000, 400000), ss: rnd() < 0.5 ? 0 : money(6000, 70000), gains: rnd() < 0.5 ? 0 : money(500, 300000), tax: { filingStatus: pick(STATUS), place: pick(PLACES) } }; add('yearTax', x, { tax: yearTax(x, x.tax, ref) }); }
  { const x = { magi: money(40000, 900000), filingStatus: pick(STATUS) }; add('medicare', x, { extra: medicareSurcharge(x.magi, x.filingStatus, ref) }); }
}
// If the pay stopped: the Life Transitions ladder on the plan's own answers (fewer cases: each builds a household).
for (let i = 0; i < Math.max(10, Math.round(N / 5)); i++) {
  const x = { spending: money(1200, 12000), checking: money(100, 8000), savings: rnd() < 0.2 ? 0 : money(200, 60000), invested: rnd() < 0.4 ? 0 : money(500, 400000) };
  const st = new Store(newHousehold({ name: 'Me' })); st.setDoc('profile', { birthYear: 1990, state: 'NY' });
  answer(st, 'spending', { gut: x.spending }); answer(st, 'income', { takeHome: x.spending + 500 }); answer(st, 'cash', { checking: x.checking, savings: x.savings });
  if (x.invested) answer(st, 'invested', { invested: x.invested }); else answer(st, 'invested', {}, { none: true });
  const r = stoppedPayOf(st.doc, ref, { now: NOW }); add('ladder', x, { runway: r.runway, held: r.used.reduce((t, u) => t + (u.amount ?? 0), 0), rungs: r.used.length });
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
// The ways to take money out (js/math/withdraw.js): every way in the list, the ones that are switched off on screen
// too, each with a made-up market: stocks and bonds that swing, inflation, a CAPE and the two yields.
const custom = () => wayCustom({ kind: pick(['steady', 'guardrails', 'floor', 'share', 'market']), rate: pick([0.03, 0.0375, 0.045, 0.06]), timing: pick(['start', 'monthly', 'end']), horizon: pick([null, 30, 40]) });
const anyWay = () => { const w = rnd() < 0.15 ? custom() : pick(WAYS.filter(x => x.rule !== 'risk' && !x.custom)); const o = { ...w };
  if (rnd() < 0.3) o.timing = pick(['start', 'monthly', 'end']); if (o.rule === 'dwz' && rnd() < 0.6) { o.target = pick([0, 50000, 250000]); o.targetAge = pick([null, 80, 85, 95]); } return o; };
const market = n => Array.from({ length: n }, () => { const s = between(-0.42, 0.5), b = between(-0.15, 0.25); return { s, b, i: between(-0.06, 0.16), cape: rnd() < 0.05 ? null : between(5, 44), dy: between(0.011, 0.08), by: between(0.006, 0.15) }; });
const W = Math.max(40, N * 2);
for (let i = 0; i < W; i++) {
  { const x = { age: whole(40, 105), stock: whole(0, 100) / 100 }; add('vpwShare', x, { share: vpwShare(x.age, x.stock) }); }
  { const x = { start: money(1000, 5000000), target: pick([0, 0, 10000, 250000]), n: whole(-2, 60), g: pick([0, 0.02, 0.05, 0.07]) }; add('spendDown', x, { payment: spendDownPayment(x.start, x.target, x.n, x.g) }); }
  // one pile of money, the way the game's replay runs it
  { const way = anyWay(), age = whole(40, 75), n = whole(5, 55), x = { way, age, start: money(50000, 6000000), need: money(15000, 200000), income: rnd() < 0.3 ? 0 : money(6000, 60000), incomeAge: pick([62, 67, 70]), stock: pick([0.4, 0.6, 0.8, 1]), growth: pick([0.03, 0.05, 0.07]), seq: market(n) };
    let p = x.start, last = null, lastI = null; const mem = {}, rows = [];
    for (let k = 0; k < n; k++) { const y = x.seq[k], a = age + k;
      const rule = waySpend(way, { need: x.need, start: p, k, age: a, endAge: age + n - 1, last, infl: lastI, cape: y.cape, stock: x.stock, growth: x.growth }, mem), w = way.gross ? rule.spend : Math.max(0, rule.spend - (a >= x.incomeAge ? x.income : 0));
      let r = x.stock * y.s + (1 - x.stock) * y.b; if (way.hold) r = wayReturn(way, { r, s: y.s, b: y.b, dy: y.dy, by: y.by }, { stock: x.stock, k, last, start: p, w }, mem);
      const step = wayPay(p, w, r, way.timing ?? 'start'); p = step.p; rows.push([rule.spend, rule.aim, step.short, p]); last = r; lastI = y.i; }
    add('wayPath', x, { rows }); }
  { const n = whole(1, 40), cycles = Array.from({ length: n }, (_, k) => { const lasted = rnd() < 0.8; return { start: 1900 + k, lasted, ranOutAge: lasted ? null : whole(60, 95), end: lasted ? money(1000, 9000000) : 0, lowest: pick([1, 1, between(0.2, 1)]), cuts: whole(0, 30) }; });
    const x = { cycles, tolerate: pick([0.999, 0.849, 0.75, 0.699]) }, H = wayHistory(cycles, x.tolerate); add('wayHistory', x, { n: H.n, ok: H.ok, worst: H.worst.start, deepest: H.deepest, cutsWorst: H.cutsWorst, medianEnd: H.medianEnd }); }
}
// The whole-life plan on each way, with taxes, through a made-up market in the free years.
for (let i = 0; i < Math.max(30, Math.round(N * 0.8)); i++) {
  const x = lifeCase(), way = anyWay(); x.strategy = way; x.stocks = pick([0.6, 0.8, 1]); x.cape = between(8, 40);
  if (way.horizon) x.planAge = x.retireAge + way.horizon - 1;
  x.seq = market(x.planAge - x.retireAge + 1 + 10).map(y => ({ ...y, r: x.stocks * y.s + (1 - x.stocks) * y.b, stock: x.stocks }));
  const lead = x.retireAge - x.age, run = lifetime(x, ref, { returns: k => (k < lead ? x.realReturn : x.seq[k - lead] ?? x.realReturn) });
  add('wayLife', x, { ...slim(run), lowestPaid: run.lowestPaid, cutYears: run.cutYears, firstSpend: run.firstSpend, worked: worked(run, x) });
}
writeFileSync(out, JSON.stringify({ seed: Number(seedArg), perFunction: N, made: new Date().toISOString().slice(0, 10), cases }));
const count = {}; for (const c of cases) count[c.fn] = (count[c.fn] || 0) + 1;
console.log(`${cases.length} cases written to ${out}`, JSON.stringify(count));
