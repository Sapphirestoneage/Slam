// SPDX-License-Identifier: AGPL-3.0-only
// The audit's first half: make thousands of made-up cases from a seed, run SLAM's own math on each, and write the
// inputs and SLAM's answers to one file. The second engine (engine2.py) reads the inputs, works each answer out its
// own way, and compares. Usage: node tools/audit/cases.mjs <out.json> [cases per function] [seed]
import { readFileSync, writeFileSync } from 'node:fs';
import { federalTax, fica, stateTax, takeHomeFromGross, grossFromTakeHome } from '../../js/math/income.js';
import { payoffMonths, totalInterest, payoffPlan, cardMinimum } from '../../js/math/debt.js';
import { fiNumber, fiDate, coastFi, solveMonthlySaving, fatFiNumber, chubbyFiNumber, baristaGap, baristaFiNumber, fiStress } from '../../js/math/fi.js';
import { yearsAtRate } from '../../js/math/simple.js';
import { fireSheetRows } from '../../js/math/firesheet.js';
import { runwayOf, backwardsOf, tripCostOf, habitCostOf, loanCostOf, stoppedPayOf, workYearsOf, coastOf, dollarLaterOf, carFitsOf, expectedWorthOf, realWageOf, splitOf, homeFitsOf } from '../../js/solo.js';
import { ilIncomeTaxOf, ilNationalInsuranceOf, olimPointsOf, aliyahOf } from '../../js/math/aliyah.js';
import { RULES } from '../../js/registry/assumptions.js';
import { hbRun, hbBreakeven, hbPriceToRent, hbFivePercent } from '../../js/math/homebuy.js';
import { qcHysa, qcDca, qcWarranty, qcPerUse, qcHassle, qcInflation, qcStart, qcKids, qcPet, qcApartment, qcUiNy, qcBenefitRunway } from '../../js/math/quick.js';
import { qcConsolidate, qcLeave, qcRoommates, qcW4, qcGlance } from '../../js/math/quickplan.js';
import { crRoi, crStack, crVestLeft, crRothTrad, crHack, crHop } from '../../js/math/career.js';
import { rcRoute, rcTriage, rcRefill, rcSafeLine, rcAudit, rcCoast, RC_ORDER } from '../../js/math/recalc.js';
import { snOutside, snFixCheck, SN_RULES } from '../../js/math/sins.js';
import { Store, newHousehold } from '../../js/records.js';
import { answer } from '../../js/journey.js';
import { taxableSocialSecurity, gainsTax, requiredWithdrawal, premiumCredit, yearTax, medicareSurcharge, lifetime, earliestFreedom, worked } from '../../js/math/lifetime.js';
import { JOB_IDS, jobRoles, jobAdmin, jobLiving, jobTaskMonthly, jobWireTimes, jobWirePer, jobCheckNext, jobDateNext } from '../../js/math/jobs.js';
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
    const r = baristaGap(x); add('baristaGap', x, { closes: v(r), covers: r.covers, afterHealth: r.afterHealth, left: r.left, barista: v(baristaFiNumber(x)) }); }
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
  { const x = { invested: money(500, 2000000), realReturn: pick([0.03, 0.05, 0.07]), monthly: rnd() < 0.1 ? pick([0, null]) : money(20, 9000), nowAt: `2026-${String(whole(1, 12)).padStart(2, '0')}-05`, maxMonths: pick([120, 360, 840]) }; x.coast = Math.round(x.invested * between(0.8, 1.6));
    const r = rcCoast(x); add('rcCoast', x, { below: r.below, by: r.by, months: r.months, ym: r.below ? r.ym : null }); }
  // The money sins read (js/math/sins.js): the weights, the fading (half-life SN_RULES.halfLife) and the quiz as a
  // starting guess that shares out as other evidence comes in; and the month of a defense (before and during).
  { const T = ['lust', 'greed', 'sloth', 'denial', 'fear'], SRC = ['quiz', 'ledger', 'checkin', 'app', 'you', 'fix'], now = '2026-11-25';
    const day = n => new Date(Date.UTC(2026, 10, 25) - n * 86400000).toISOString().slice(0, 10);
    const ev = Array.from({ length: whole(1, 25) }, () => { const source = pick(SRC), add = {}; for (const t of T) if (rnd() < 0.4) add[t] = pick([-3, -2, -1, 1, 1, 2, 2, 3]);
      return { source, add, d: source === 'quiz' && rnd() < 0.5 ? null : day(whole(-3, 240)) }; });
    const x = { ev, now, halfLife: SN_RULES.halfLife }, out = snOutside(ev, now);
    add('snOutside', x, { sources: out.map(o => o.source), scores: Object.fromEntries(out.map(o => [o.source, o.scores])) });
    const fx = { trait: pick(T), group: 'sin', start: day(whole(0, 60)) }, C = snFixCheck(fx, ev, now);
    add('snFixCheck', { ev, now, fix: fx, days: SN_RULES.fixDays }, { before: C.before, during: C.during, done: C.done, daysLeft: C.daysLeft }); }
  // Home buying and renting (js/math/homebuy.js, M9O): the payment, the first month line by line, each year's position, the breakeven year
  { const x = { price: money(90000, 1500000), downPct: pick([3, 5, 10, 20, 25]), ratePct: pick([0, 3, 4.5, 6, 6.5, 7.25, 9]), years: pick([15, 20, 30]), taxPct: pick([0, 0.5, 1.2, 2.5]), insYear: pick([0, 900, 1800, 4200]), pmiPct: pick([0.3, 0.75, 1.5]), hoa: pick([0, 0, 150, 600]), maintPct: pick([1, 1.5, 2]), repairsYear: pick([0, 1500, 5000]),
      rent: money(500, 7000), rentIns: pick([0, 12, 25]), rentGrowthPct: pick([0, 2, 3, 3.5, 4, 6]), homeGrowthPct: pick([-1, 0, 2, 3, 5]), closingPct: pick([0, 2, 3, 5]), sellingPct: pick([0, 5, 6, 8]), retPct: pick([0, 4, 6, 7, 9]) };
    const r = hbRun({ ...x, stay: 30 }), b = hbBreakeven(x);
    add('homeBuy', x, { pmt: r.pmt, first: r.first, rent1: r.firstRent.total, pmiMonths: r.pmiMonths, ahead: r.byYear.map(y => y.ahead), ownOut: r.byYear.map(y => y.ownOut), rentOut: r.byYear.map(y => y.rentOut), year: b.year, never: b.never, ratio: hbPriceToRent(x.price, x.rent), five: hbFivePercent(x.price, x.rent).line, rentLess: hbFivePercent(x.price, x.rent).rentLess }); }
  // The quick calculators (js/math/quick.js and quickplan.js, M8Q)
  { const x = { balance: money(100, 200000), fromRate: pick([0, 0.0001, 0.001, 0.005, 0.01, 0.02]), toRate: pick([0.03, 0.035, 0.04, 0.045, 0.05]), monthly: pick([0, 0, 100, 250, 1000]), years: pick([1, 3, 5, 10]) }, r = qcHysa(x); add('qcHysa', x, { yearGain: r.yearGain, endFrom: r.endFrom, endTo: r.endTo }); }
  { const x = { amount: money(1000, 500000), months: pick([1, 3, 6, 12, 24]), ret: pick([0.03, 0.06, 0.0914, 0.12]), cashRate: pick([0, 0.02, 0.04, 0.05]) }, r = qcDca(x); add('qcDca', x, { lump: r.lump, spread: r.spread, waiting: r.averageWaiting }); }
  { const x = { price: money(20, 2000), repair: money(50, 5000), chance: pick([0.05, 0.1, 0.2, 0.3, 0.5]), resale: pick([0, 0, 10, 100, 5000]), uses: pick([1, 5, 10, 50, 365]), saved: money(5, 3000), hours: pick([0.5, 1, 2, 4, 8]), wage: pick([null, 15, 30, 60]) };
    const w = qcWarranty(x), u = qcPerUse(x), h = qcHassle(x); add('qcSmall', x, { expected: w.expected, even: w.evenChance, perUse: u.perUse, perHour: h.perHour, times: h.times }); }
  { const parts = ['housing', 'food', 'transport', 'health', 'other'].map(key => ({ key, amount: rnd() < 0.2 ? null : money(50, 4000), change: pick([-0.02, 0, 0.02, 0.03, 0.05, 0.08, 0.12]) })); if (parts.every(q => q.amount == null)) parts[0].amount = 1000;
    const r = qcInflation({ parts, planRate: 0.02 }); add('qcInflation', { parts }, { rate: r.rate, yearMore: r.yearMore }); }
  { const x = { monthly: money(25, 3000), ageA: whole(18, 50), ageB: whole(18, 60), to: 65, ret: pick([0, 0.03, 0.05, 0.07]) }, r = qcStart(x); add('qcStart', x, { a: r.a, b: r.b, catchUp: r.catchUp }); }
  { const x = { age: whole(0, 17), little: money(1000, 40000), school: money(1000, 30000), teen: money(1000, 30000), upfront: pick([0, 150, 2000]), monthly: money(10, 400), vet: pick([0, 300, 1500]), years: pick([5, 10, 15]), rent: money(500, 6000), depositMonths: pick([0, 1, 2]), lastMonth: pick([0, 1]), brokerMonths: pick([0, 1, 1.8]), moving: pick([0, 600]), setup: pick([0, 1500]), monthlyOther: pick([0, 150]) };
    const k = qcKids(x), p = qcPet(x), a = qcApartment(x); add('qcAdd', x, { kids: k.left, pet: p.lifetime, petFirst: p.firstYear, keys: a.keys, month: a.month }); }
  { const N = ref.limits.unemployment.NY, x = { highQuarter: money(500, 60000), cash: money(1, 60000), spending: money(800, 12000), keep: pick([1, 0.9]) }, U = qcUiNy({ highQuarter: x.highQuarter, rules: N }), R = qcBenefitRunway({ cash: x.cash, spending: x.spending, weekly: U.weekly, weeks: U.weeks, keep: x.keep });
    add('qcJobless', { ...x, rules: N }, { weekly: U.weekly, months: R.months }); }
  { const x = { balance: money(500, 80000), apr: pick([0.12, 0.18, 0.22, 0.25, 0.29]), loanApr: pick([0, 0.07, 0.1, 0.13, 0.2]), loanYears: pick([2, 3, 4, 5]), feePct: pick([0, 0.01, 0.03, 0.05, 0.08]) }; x.payment = Math.max(25, Math.round(x.balance * between(0.005, 0.06)));
    const r = qcConsolidate(x); add('qcConsolidate', x, { never: r.never, nowMonths: r.nowMonths, nowInterest: r.nowInterest, loanPay: r.loanPay, loanCost: r.loanCost }); }
  { const x = { cash: money(1, 100000), spending: money(800, 12000), health: pick([0, 200, 700]), profit: pick([0, 0, money(200, 20000)]) }, r = qcLeave({ ...x, ref }); add('qcLeave', x, { tax: r.tax, months: r.months }); }
  { const n = whole(2, 4), people = Array.from({ length: n }, (_, i) => ({ id: i ? `P${i + 1}` : 'Me', size: money(60, 300), income: money(500, 15000) })), x = { rent: money(800, 8000), bills: pick([0, 150, 400]), how: pick(['size', 'income', 'equal']), billsHow: pick(['equal', 'same']), people };
    const r = qcRoommates(x); add('qcRoommates', x, { totals: r.rows.map(p => p.total) }); }
  { const x = { gross: money(15000, 400000), pretax: pick([0, 0, 5000, 23500]), filingStatus: pick(STATUS), kids: pick([0, 0, 1, 3]), withheld: rnd() < 0.1 ? 0 : money(1, 60000), perCheck: rnd() < 0.1 ? 0 : money(1, 4000), checksLeft: whole(0, 26), checksYear: pick([52, 26, 24, 12]) }, r = qcW4({ ...x, ref });
    add('qcW4', x, { owe: r.owe, diff: r.diff, extra: r.extra, deductions: r.deductions }); }
  { const x = { takeHome: money(1000, 30000), spending: money(500, 30000), debtOutside: pick([0, 0, 300]) }, r = qcGlance(x); add('qcGlance', x, { left: r.left, rate: r.rate }); }
  // Career and education (js/math/career.js, M9Z): one path priced, the stack's overlaps, the match left behind, the launch window
  { const x = { cost: money(200, 150000), help: pick([0, 0, 1000, 5000]), months: pick([0, 3, 6, 12, 18, 48]), keepPct: pick([0, 50, 100]), payBefore: money(15000, 200000), payAfter: money(15000, 260000), taxPct: pick([0, 10, 12, 22, 24, 32, 35]),
      loan: pick([0, 0, 5000, 30000]), loanRatePct: pick([0, 4, 6.5, 9]), loanYears: pick([5, 10, 20]), age: whole(18, 55), endAge: pick([55, 60, 65, 70]) }, r = crRoi(x);
    add('careerRoi', x, { total: r.total, gainNet: r.gainNet, payback: r.paybackYears, lifetime: r.lifetime, interest: r.interest, once: r.once, changes: r.changes }); }
  { const n = whole(1, 5), ym = () => `${whole(2026, 2029)}-${String(whole(1, 12)).padStart(2, '0')}`, list = Array.from({ length: n }, (_, i) => { const a = ym(), b = ym(); return { name: `C${i}`, from: a < b ? a : b, to: a < b ? b : a, cost: rnd() < 0.2 ? null : money(100, 20000), raise: rnd() < 0.2 ? null : money(500, 30000) }; }), S = crStack(list);
    add('careerStack', { list }, { overlaps: S.overlaps.map(o => [o.a, o.b, o.months]), busy: S.busy, span: S.span, cost: S.cost, raise: S.raise }); }
  { const x = { match: money(100, 80000), years: pick([0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 5.9, 6, 8]), schedule: pick(['now', 'cliff3', 'graded6']) }, V = crVestLeft(x); add('careerVest', x, { pct: V.pct, left: V.left, more: V.next ? V.next.more : null, months: V.next ? V.next.months : null }); }
  { const x = { raise: money(500, 60000), taxPct: pick([0, 12, 22, 32]), left: pick([0, 1500, 8000]), yearly: money(500, 23500), nowPct: pick([10, 12, 22, 24, 32]), laterPct: pick([0, 10, 12, 22, 24]), rent: money(200, 3000), costs: pick([0, 100, 400]), years: pick([1, 2, 5]) };
    const H = crHop(x), T = crRothTrad({ yearly: x.yearly, nowPct: x.nowPct, laterPct: x.laterPct }), K = crHack(x); add('careerLaunch', x, { hop: H.monthly, hopOnce: H.once, roth: T.monthly, hack: K.monthly, hackMonths: K.months }); }
  { const x = { cap: money(10, 800), spent: rnd() < 0.1 ? null : money(1, 1200) }, r = rcSafeLine(x); add('rcSafeLine', x, { left: r.left, over: r.over, ranOut: r.ranOut, planCost: r.planCost }); }
  { const TAGS = ['mistake', 'unavoidable', null], KS = ['Late fee', 'Overdraft', 'Car repair', 'Other'], events = Array.from({ length: whole(1, 9) }, (_, k) => ({ id: `e${k}`, kind: pick(KS), amount: rnd() < 0.08 ? null : money(5, 9000), tag: pick(TAGS), yearsAgo: Math.round(between(0, 6) * 10) / 10 }));
    const x = { events, realReturn: pick([0.03, 0.04, 0.05, 0.06]), years: whole(1, 40), perDay: rnd() < 0.25 ? pick([0, -5, -40, null]) : money(2, 300), hourly: money(8, 150), yearIncome: money(15000, 300000) }, r = rcAudit(x);
    add('rcAudit', x, { mCount: r.mistake.count, mCost: r.mistake.cost, mLater: r.mistake.later, mDays: r.mistake.fiDays, mHours: r.mistake.hours, measure: r.measure, uCost: r.unavoidable.cost, uLater: r.unavoidable.later, untagged: r.untagged, open: r.open, tax: r.tax, repeats: r.repeats.length, repeatCost: r.repeats.reduce((t, k) => t + k.cost, 0) }); }
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
// The Job of Existing (js/math/jobs.js, run JOE-1): the jobs from the answers, the admin hours, Running it and Living it.
for (let i = 0; i < N; i++) {
  const a = { work: pick(['Student', 'First job', 'A few jobs or gigs', 'Established', 'Self-employed']), incKinds: ['A main job', 'Side gigs', 'My own business'].filter(() => rnd() < 0.4),
    steady: pick(['Steady', 'Changes month to month']), home: pick(['Renting', 'Owning', 'With family']), live: ['Roommates', 'A partner', 'Kids', 'Parents or family'].filter(() => rnd() < 0.3),
    deps: pick(['None', 'Planning', 'Kids', 'Supporting a parent', 'Pets']), share: pick(['No one', 'A partner', 'More than one partner', 'Family']), invest: pick(['No', 'Sometimes', 'Every month']),
    accts: ['Checking', 'Savings', 'Retirement plan at work', 'IRA or Roth IRA', 'HSA'].filter(() => rnd() < 0.5), debtKinds: ['Credit card balance', 'Car loan', 'Medical bills'].filter(() => rnd() < 0.3),
    prot: { renters: pick(['Yes', 'No', undefined]), life: pick(['Yes', 'No', undefined]), disab: pick(['Yes', 'No', undefined]), health: pick(['Through my job', 'On my own', 'None right now', undefined]) },
    debts: whole(0, 3), goals: whole(0, 3), kids: whole(0, 2), cards: whole(0, 3), banks: whole(0, 3), age: whole(18, 80) };
  add('jobRoles', a, { order: jobRoles(a).map(r => r.id), scores: Object.fromEntries(jobRoles(a).map(r => [r.id, r.score])) });
  const mins = {}; for (const id of JOB_IDS) if (rnd() < 0.6) mins[id] = { v: pick([0, 15, 60, 180, 300]), cf: whole(1, 3) };
  const tasks = Array.from({ length: whole(0, 14) }, (_, k) => ({ id: `t${k}`, role: pick(JOB_IDS), per: pick([1, 5, 10, 15, 20, 30, 45, 90, 120, 240]), times: pick([1, 2, 4, 6, 12, 24, 26, 52]) }));
  const exits = Object.fromEntries(tasks.filter(() => rnd() < 0.7).map(t => [t.id, pick(['do', 'auto', 'hand', 'drop'])]));
  const ad = jobAdmin(mins), L = jobLiving(ad, tasks, exits);
  add('jobLiving', { mins, tasks, exits }, { total: ad.total, st: ad.st, living: L.living, running: L.running, better: L.better, monthly: tasks.map(jobTaskMonthly) });
  // features 4 and 5 (run JOE-1): a wired goal's deposit, its quarterly check-in, a date the person taps
  const w = { monthly: rnd() < 0.1 ? 0 : money(10, 3000), day: pick(['pay', 'd1', 'd15', '1and15']), pay: pick([52, 26, 24, 12, 0]) };
  const times = jobWireTimes(w.day, w.pay); add('jobWire', w, { times, per: jobWirePer(w.monthly, times) });
  const day = () => `${2026 + whole(0, 2)}-${String(whole(1, 12)).padStart(2, '0')}-${String(whole(1, 31)).padStart(2, '0')}`.replace(/-(\d\d)-(3[01]|29)$/, (m, mm, dd) => `-${mm}-${mm === '02' ? '28' : dd === '31' && ['04', '06', '09', '11'].includes(mm) ? '30' : dd}`);
  const ck = { set: day(), last: rnd() < 0.5 ? null : day(), today: day() }; add('jobCheck', ck, jobCheckNext(ck.set, ck.last, ck.today));
  const dt = { md: `${String(whole(1, 12)).padStart(2, '0')}-${String(whole(1, 31)).padStart(2, '0')}`, today: day(), lead: pick([14, 21, 30, 45]) }; add('jobDate', dt, jobDateNext(dt.md, dt.today, dt.lead));
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
