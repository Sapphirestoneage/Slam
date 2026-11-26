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
import { gigInvoicesOf, gigAppsOf, gigProfitFirstOf, gigRetireOf, gigLimitsOf } from '../../js/math/gig.js';
import { gigRate, gigSetAside, gigRetire } from '../../js/math/gigplan.js';
import { opTransitionOf, opPapersOf, opTwoSidesOf, opPackageOf, opSearchFundOf, opFamilyOf, opAgeCareOf } from '../../js/math/ownpath.js';
import { hmUntangle, hmParkMonths } from '../../js/math/hard.js';
import { roommateExit } from '../../js/math/hardplan.js';
import { esHeirs, esTenYear, esCompare, ES_KINDS, ES_HEIRS } from '../../js/math/estate.js';
import { spousalExcess } from '../../js/math/socialsecurity.js';
import { crRoi, crStack, crVestLeft, crRothTrad, crHack, crHop } from '../../js/math/career.js';
import { tpCost, tpPoints, tpSplit, tpJourney } from '../../js/math/trip.js';
import { rcRoute, rcTriage, rcRefill, rcSafeLine, rcAudit, rcCoast, RC_ORDER } from '../../js/math/recalc.js';
import { snOutside, snFixCheck, snClimb, SN_RULES } from '../../js/math/sins.js';
import { Store, newHousehold } from '../../js/records.js';
import { answer } from '../../js/journey.js';
import { taxableSocialSecurity, gainsTax, requiredWithdrawal, premiumCredit, yearTax, medicareSurcharge, lifetime, earliestFreedom, worked } from '../../js/math/lifetime.js';
import { JOB_IDS, jobRoles, jobAdmin, jobLiving, jobTaskMonthly, jobWireTimes, jobWirePer, jobCheckNext, jobDateNext, jobCarry, jobHourValue } from '../../js/math/jobs.js';
import { refiOf, stepladderOf, ladderRate } from '../../js/math/studentloan.js';
import { fwSwan, fwPeak, fwZeroTax, fwBabySteps, fwWealthStage, fwLifetime, fwStep9, fwWins, FW_WINS, fwLead, fwDtiMonths, fwMonthEnd } from '../../js/math/frameworks.js';
import { WAYS, wayCustom, waySpend, wayReturn, wayPay, wayHistory, wayTolerance, vpwShare, spendDownPayment } from '../../js/math/withdraw.js';
import { enCreep, enPareto, enEnough, enRough, enStepCreep, enJoy, enCurve, enRich, enSubs } from '../../js/math/enough.js';
import { bpRules, bpHsa, bpDcfsa, bpEspp, bpCommuter, bpCoverage, bpPlans } from '../../js/math/benefitsplan.js';
import { fmSandwich, fmBoomerang, fmTuition, fm529 } from '../../js/math/family.js';
import { qsStats, qsCapacity, qsFails, qsHidden, qsRank, qsDuel, QS_OPPONENTS } from '../../js/math/quest.js';
import { peNetWorth, peIncome, peSaving } from '../../js/math/peers.js'; // comparing with peers (run Finish everything partly built, Part 9, M8N)
import * as RA from '../../js/math/ratios.js';
import { NT_TAPS, ntEvent, ntRun, ntTrips, ntDegrade, ntPlanB } from '../../js/math/safetynet.js'; // safety nets (run Finish everything partly built, Part 15, M8U)
import { plBonus, plHunt, plChallenge, plFicoRound, plNextMonthly } from '../../js/math/play.js';

const [out = '/tmp/slam-audit-cases.json', nArg = '500', seedArg = '20261114'] = process.argv.slice(2);
const N = Number(nArg), ref = JSON.parse(readFileSync(new URL('../../data/reference-2026.json', import.meta.url)));
const priorsAll = JSON.parse(readFileSync(new URL('../../data/priors-2026.json', import.meta.url))), priorsNw = priorsAll.rows.filter(r => r.field === 'netWorth');
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
    add('snFixCheck', { ev, now, fix: fx, days: SN_RULES.fixDays }, { before: C.before, during: C.during, done: C.done, daysLeft: C.daysLeft });
    // the Rings theme (Part 3): the rings climbed, from the history of takes and the months of the wards
    const SINS7 = ['pride', 'greed', 'envy', 'gluttony', 'lust', 'wrath', 'sloth'], top = pick(SINS7);
    const hist = Array.from({ length: whole(0, 6) }, (_, k) => ({ at: day(400 - k * 91), sin: { top }, scores: Object.fromEntries(SINS7.map(id => [id, rnd() < 0.1 ? 0 : whole(0, 12)])) }));
    const fixes = Array.from({ length: whole(0, 5) }, () => ({ trait: pick(SINS7), end: day(whole(0, 300)), dropped: pick([true, false, null]) }));
    add('snClimb', { hist, fixes, sinIds: SINS7 }, { n: snClimb(hist, fixes, SINS7).length }); }
  // Home buying and renting (js/math/homebuy.js, M9O): the payment, the first month line by line, each year's position, the breakeven year
  { const x = { price: money(90000, 1500000), downPct: pick([3, 5, 10, 20, 25]), ratePct: pick([0, 3, 4.5, 6, 6.5, 7.25, 9]), years: pick([15, 20, 30]), taxPct: pick([0, 0.5, 1.2, 2.5]), insYear: pick([0, 900, 1800, 4200]), pmiPct: pick([0.3, 0.75, 1.5]), hoa: pick([0, 0, 150, 600]), maintPct: pick([1, 1.5, 2]), repairsYear: pick([0, 1500, 5000]),
      rent: money(500, 7000), rentIns: pick([0, 12, 25]), rentGrowthPct: pick([0, 2, 3, 3.5, 4, 6]), homeGrowthPct: pick([-1, 0, 2, 3, 5]), closingPct: pick([0, 2, 3, 5]), sellingPct: pick([0, 5, 6, 8]), retPct: pick([0, 4, 6, 7, 9]) };
    const r = hbRun({ ...x, stay: 30 }), b = hbBreakeven(x);
    add('homeBuy', x, { pmt: r.pmt, first: r.first, rent1: r.firstRent.total, pmiMonths: r.pmiMonths, ahead: r.byYear.map(y => y.ahead), ownOut: r.byYear.map(y => y.ownOut), rentOut: r.byYear.map(y => y.rentOut), year: b.year, never: b.never, ratio: hbPriceToRent(x.price, x.rent), five: hbFivePercent(x.price, x.rent).line, rentLess: hbFivePercent(x.price, x.rent).rentLess }); }
  // Quest mode (js/math/quest.js, M8Z): the stats, capacity, the weak spots, hidden costs, the rank and a duel
  { const T = { take: true, spend: true, cash: true, debt: true, inv: true }, x = { take: money(800, 25000), spend: money(600, 20000), cash: pick([0, money(50, 90000)]), hiDebt: pick([0, 0, money(100, 60000)]), inv: pick([0, money(100, 900000)]), nw: money(1, 900000) * pick([1, 1, -1]), fi: money(100000, 4000000), coast: money(10000, 1500000), target: pick([1, 3, 6, 9]), protDone: whole(0, 4), protMax: 4, sharp: whole(0, 5), sharpOf: 5, streak: whole(0, 30), real: T }, r = qsStats(x);
    add('qsStats', x, { health: r.health.score, armor: r.armor.score, stats: Object.fromEntries(r.stats.map(t => [t.id, t.score])) }); }
  { const x = { take: money(800, 25000), spend: money(600, 26000), cushionMonths: pick([null, 0.2, 0.9, 2, 6]), plate: pick([null, 'light', 'normal', 'full']), felt: pick([null, null, 'less', 'more']) }, r = qsCapacity(x);
    add('qsCapacity', x, { slots: r.slots }); }
  { const x = { take: money(800, 25000), spend: money(600, 22000), cash: pick([0, money(50, 90000)]), hiDebt: pick([0, money(100, 60000)]), incomes: pick([null, 1, 2]), protDone: whole(0, 4), protMax: 4, lowGap: pick([0, 0, money(50, 3000)]) }, r = qsFails(x);
    add('qsFails', x, { order: r.spots.map(t => t.id), rooms: r.spots.map(t => t.room) }); }
  { const items = Array.from({ length: whole(1, 5) }, (_, k) => ({ id: `h${k}`, name: `H${k}`, year: pick([null, 0, money(5, 20000)]) })), x = { items, spend: pick([null, money(500, 15000)]) }, r = qsHidden(items, x.spend);
    add('qsHidden', x, { total: r.total, days: r.days, ids: r.rows.map(t => t.id) }); }
  { const x = { guess: pick(['below', 'near', 'above']), nw: money(1, 3000000) * pick([1, 1, 1, -1]), age: whole(18, 90), rows: priorsNw }, r = qsRank(x);
    add('qsRank', { ...x, rows: undefined }, { where: r.where, quarter: r.quarter, median: r.median }); }
  { const V = ['Freedom and time', 'Security', 'Family', 'Fun', 'Home', 'Giving', 'Learning', 'Friends and community', 'Adventure and travel'], o = pick(QS_OPPONENTS), x = { opp: o.id, choice: pick(['yes', 'half', 'no']), values: V.filter(() => rnd() < 0.35) }, r = qsDuel(o, x.choice, x.values);
    add('qsDuel', { ...x, pull: o.pull, test: o.test }, { beaten: r.beaten }); }
  // Comparing with peers (js/math/peers.js, M8N): net worth at an age, pay and the savings rate next to the published rows
  { const x = { nw: money(1, 4000000) * pick([1, 1, 1, -1]), age: whole(18, 95) }, r = peNetWorth({ ...x, rows: priorsNw });
    add('peNetWorth', x, { where: r.where, quarter: r.quarter, median: r.median, top10: r.top10, ratio: r.ratio }); }
  { const x = { gross: money(5000, 600000) }, r = peIncome({ ...x, data: priorsAll });
    add('peIncome', x, { where: r.where, ratio: r.ratio, middle: r.middle }); }
  { const x = { rate: pick([-0.3, 0, 0.05, 0.2, 0.55]) * rnd() * 2 }, r = peSaving({ ...x, data: priorsAll });
    add('peSaving', x, { gap: r.gap, country: r.country }); }
  // Family money (js/math/family.js, M8F): the sandwich years, living at home, tuition and the NY 529
  { const yrs = () => pick([null, 0, 1, 3, 5, 10]), x = { parents: pick([0, money(50, 3000)]), kids: pick([0, money(50, 4000)]), parentsYears: yrs(), kidsYears: yrs(), parentsFrom: pick([0, 0, 2]), kidsFrom: pick([0, 0, 1, 5]), inSpending: rnd() < 0.2, takeHome: money(1500, 20000), spending: money(1000, 15000) }, r = fmSandwich(x);
    add('fmSandwich', x, { peak: r.peak, total: r.total, both: r.both, all: r.all, leftAfter: r.leftAfter, flows: r.flows.map(f => [f.at, f.monthly]) }); }
  { const x = { rent: money(400, 6000), payHome: pick([0, 0, money(50, 2000)]), savePct: pick([1, 0.75, 0.5, 0.25]), months: pick([6, 12, 18, 24, 36]), target: pick([null, money(1000, 80000)]), have: pick([0, money(100, 20000)]), homeCost: pick([null, 0, money(50, 800)]) }, r = fmBoomerang(x);
    add('fmBoomerang', x, { saving: r.saving, byPlan: r.byPlan, reach: r.reach, extra: r.extra, perMonthFor: r.perMonthFor, household: r.household }); }
  { const x = { yearly: money(1000, 90000), kids: whole(1, 6), years: pick([1, 2, 4, 9, 13]), startIn: pick([0, 1, 3, 5, 10, 15]), rise: pick([0, 0.01, 0.03]), have: pick([0, money(500, 50000)]), ret: pick([0, 0.03, 0.05, 0.07]), share: pick([0, 0.5, 1]) }, r = fmTuition(x);
    const L = ref.limits.ny529, y = { yearly: money(100, 30000), joint: rnd() < 0.5, rate: pick([null, 0.04, 0.0685]), rules: L }, p = fm529(y);
    add('fmTuition', { ...x, n529: y }, { total: r.total, monthly: r.monthly, payGo: r.payGo, deducted: p.deducted, saved: p.saved }); }
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
    add('qcW4', x, { owe: r.owe, diff: r.diff, extra: r.extra, deductions: r.deductions, stillRefund: r.stillRefund }); }
  { const x = { takeHome: money(1000, 30000), spending: money(500, 30000), debtOutside: pick([0, 0, 300]) }, r = qcGlance(x); add('qcGlance', x, { left: r.left, rate: r.rate }); }
  // Travel (js/math/trip.js, M8T): a trip line by line, points, a group split by share and by item, the journey map
  { const opt = v => (rnd() < 0.15 ? null : v), x = { flights: opt(money(0, 4000)), lodging: opt(money(0, 500)), days: opt(whole(1, 21)), nights: rnd() < 0.3 ? whole(0, 20) : null, food: opt(money(0, 200)), visa: opt(pick([0, 25, 160])), insurance: opt(money(0, 500)), other: opt(money(0, 1500)),
      fxPct: opt(pick([0, 1, 2.5, 3])), fxOn: pick([undefined, [], ['flights'], ['lodging', 'food'], ['lodging', 'food', 'other']]), pointsOff: rnd() < 0.3 ? money(0, 3000) : null }, T = tpCost(x);
    add('tripLines', x, { lines: T.lines.map(l => l.amount), fx: T.fx.amount, gross: T.gross, pointsOff: T.pointsOff, total: T.total, open: T.open.length, ready: T.ready }); }
  { const x = { cash: money(50, 3000), points: whole(1000, 150000), fees: pick([0, 5.6, 50, 200]), cpp: pick([0.5, 1, 1.25, 1.5, 2]) }, P = tpPoints(x); add('tripPoints', x, { got: P.got, worth: P.worth, spend: P.spend, keep: P.keep, lead: P.lead }); }
  { const n = whole(2, 6), people = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, shares: pick([null, 1, 1, 2, 3]) })), how = pick(['share', 'item']),
      items = Array.from({ length: whole(1, 6) }, (_, i) => ({ id: `i${i}`, name: `L${i}`, amount: Math.round(rnd() * 300000) / 100, among: rnd() < 0.4 ? null : people.filter(() => rnd() < 0.6).map(p => p.id) })), total = how === 'share' && rnd() < 0.5 ? Math.round(rnd() * 900000) / 100 : null, S = tpSplit({ people, how, items, total });
    add('tripSplit', { people, how, items, total }, { parts: S.parts.map(p => p.amount), total: S.total }); }
  { const kn = v => (rnd() < 0.1 ? null : v), x = { cash: kn(money(0, 30000)), debt: kn(pick([0, 0, money(100, 40000)])), invested: kn(money(0, 1500000)), coast: kn(money(10000, 600000)), fi: kn(money(200000, 2500000)), monthly: pick([null, 0, money(50, 6000)]), trip: pick([null, money(100, 15000)]) }, J = tpJourney(x);
    add('tripJourney', x, { done: J.stages.map(s => s.done), months: J.stages.map(s => s.months), after: J.stages.map(s => (s.after ? [s.after.done, s.after.months] : null)), here: J.here, fromCash: J.fromCash, shift: J.monthsOfSaving }); }
  // Your own path (js/math/ownpath.js, M8P)
  { const x = { covered: pick([0, money(200, 80000)]), notCovered: pick([0, money(50, 10000)]), deductible: pick([0, 500, 1500, 4000]), coinsurance: pick([0, 0.1, 0.2, 0.3, 0.5]), oopMax: pick([null, 3000, 6000, 9000]), metSoFar: pick([0, 0, 800]), help: pick([0, 0, money(100, 20000)]), saved: pick([0, money(100, 5000)]), monthly: pick([null, money(25, 2000)]) }, r = opTransitionOf(x);
    if (r.ready) add('opTransition', x, { plan: r.planPays, yours: r.yours, left: r.save.left, months: r.save.months }); }
  { const own = { court: pick([null, money(50, 400)]), orderCopies: pick([null, money(5, 60)]), birth: pick([null, 0, 40]), other: pick([null, money(10, 800)]) }, x = { court: pick(['nyc', 'ny', 'other']), born: pick(['nys', 'nyc', 'other']), id: pick(['license', 'id', 'none']), passport: pick(['within', 'renew', 'new', 'none']), copies: whole(0, 3), own }, r = opPapersOf(x, ref.idChangeNY);
    add('opPapers', x, { total: r.total, dated: r.dated, toAdd: r.toAdd.length }); }
  { const x = { quietMonthly: money(1, 3000), quietOnce: pick([0, money(10, 5000)]), outMonthly: money(1, 3000), outOnce: pick([0, money(10, 5000)]), years: pick([1, 3, 5, 10]) }, r = opTwoSidesOf(x);
    add('opTwoSides', x, { quiet: r.quiet, out: r.out, gap: r.gap }); }
  { const j = () => ({ pay: money(20000, 400000), health: pick([0, money(50, 1500)]), care: pick([0, money(100, 30000)]), family: pick([0, money(500, 50000)]), other: pick([0, money(100, 10000)]) }), x = { now: j(), next: j() }, r = opPackageOf(x);
    add('opPackage', x, { now: r.now.total, next: r.next.total, gap: r.gap, match: r.payToMatch }); }
  { const x = { age: whole(18, 70), spending: money(800, 15000), cash: pick([null, money(0, 60000)]), extraMonths: whole(0, 12) }, r = opSearchFundOf(x);
    add('opSearchFund', x, { target: r.target, base: r.baseTarget, gap: r.gap }); }
  { const x = { path: pick(['ivf', 'surrogacy', 'adoption', 'adoption', 'foster']), cost: money(500, 200000), insurance: pick([0, money(100, 30000)]), employer: pick([0, money(100, 25000)]), magi: pick([null, money(30000, 400000), 265080, 285080, 305080]), saved: pick([0, money(100, 20000)]), monthly: pick([null, money(50, 3000)]) }, r = opFamilyOf(x, ref.adoptionCredit);
    add('opFamily', x, { yours: r.yours, credit: r.credit ? r.credit.credit : null, refundable: r.credit ? r.credit.refundable : null, months: r.save.months }); }
  { const x = { monthly: money(500, 20000), years: pick([1, 2, 3, 5, 10]), covered: pick([0, money(100, 8000)]), saved: pick([0, money(1000, 500000)]), yearsUntil: pick([null, 5, 10, 20, 30]) }, r = opAgeCareOf(x);
    add('opAgeCare', x, { need: r.need, left: r.left, perMonth: r.perMonth }); }
  // Gig and self-employed (js/math/gig.js and gigplan.js, M8G)
  { const x = { takeHome: money(1500, 15000), health: pick([0, 0, 300, 800]), retire: pick([0, 3000, 7500, 20000]), costs: pick([0, 100, 600]), hoursWeek: pick([20, 30, 40, 50]), billable: pick([0.5, 0.6, 0.7, 0.8, 0.9, 1]), weeksOff: pick([0, 2, 4, 6, 12]), unitHours: pick([null, 1, 2, 8]), filingStatus: pick(STATUS), place: pick([null, 'ny', 'nyc']) }, r = gigRate(x, ref);
    add('gigRate', x, { profit: r.profit, hourly: r.hourly, unit: r.unit, need: r.need.year }); }
  { const x = { profit: money(2000, 400000), wages: pick([0, 0, money(10000, 250000)]), pretax: pick([0, 0, 5000]), filingStatus: pick(STATUS), place: pick([null, 'ny', 'nyc']), earned: pick([null, money(100, 100000)]), set: pick([0, 0, 1500]) }, r = gigSetAside({ ...x, year: 2026 }, ref);
    add('gigSetAside', x, { yearly: r.yearly, rate: r.rate, se: r.parts.selfEmployment, toMove: r.soFar.ready ? r.soFar.toMove : null }); }
  { const x = { profit: money(500, 600000), age: whole(22, 72), deferredAtJob: pick([0, 0, 5000, 24500]), want: pick([null, 3000, 9000, 30000, 70000]) }, r = gigRetire(x, ref);
    add('gigRetire', { ...x, limits: gigLimitsOf(ref.limits) }, { seHalf: r.seHalf, solo: r.solo.total, sep: r.sep, ira: r.ira, first: r.first }); }
  { const day = d => new Date(Date.UTC(2026, 0, 1) + d * 864e5).toISOString().slice(0, 10), today = day(whole(200, 330));
    const list = Array.from({ length: whole(1, 8) }, (_, k) => { const sent = whole(0, 320); const inv = { id: k, client: pick(['A', 'B', 'C']), amount: money(50, 20000), sent: day(sent), terms: pick([0, 15, 30, 45, 60]) }; if (rnd() < 0.2) inv.due = day(sent + whole(0, 90)); if (rnd() < 0.4) inv.paid = day(sent + whole(0, 120)); return inv; });
    const r = gigInvoicesOf(list, today); add('gigInvoices', { list, today }, { waiting: r.waiting, past: r.past, got: r.got, ages: r.ages.map(a => a.total), days: Object.fromEntries(r.rows.map(q => [q.id, q.daysPast])), avg: r.avgDaysToPay }); }
  { const apps = Array.from({ length: whole(1, 3) }, () => ({ earned: money(20, 5000), tips: pick([0, 50, 300]), fee: pick([0, 0, 40]), landed: pick([null, money(20, 5000)]) })), x = { apps, cash: pick([0, 60, 400]) }, r = gigAppsOf(x);
    const pcts = { profit: pick([0.01, 0.05, 0.1]), owner: pick([0.3, 0.5]), tax: pick([0.15, 0.25]), opex: pick([0.1, 0.2, 0.3]) }, income = money(100, 20000), pf = gigProfitFirstOf({ income, pcts });
    add('gigApps', { ...x, pcts, income }, { all: r.all, tips: r.tips, gap: r.gap, owner: pf.ready ? pf.of.owner : null, left: pf.ready ? pf.left : null }); }
  // Hard moments (js/math/hard.js and hardplan.js, M8H): a roommate leaving, untangling, money that waits
  { const n = whole(2, 4), people = Array.from({ length: n }, (_, i) => ({ id: i ? `P${i + 1}` : 'Me', size: money(60, 300), income: money(500, 15000) })), x = { rent: money(800, 8000), bills: pick([0, 150, 400]), how: pick(['size', 'income', 'equal']), billsHow: pick(['equal', 'same']), people, leaver: people[whole(0, n - 1)].id, monthsLeft: whole(0, 12), cover: pick([0, 1, 2, 3, 20]), deposit: pick([0, money(500, 6000)]), damage: pick([0, 0, money(50, 900)]) };
    const r = roommateExit(x); add('hmRoommateExit', x, { toEnd: r.rows.map(p => p.toEnd), now: r.rows.map(p => p.now), later: r.rows.map(p => p.later), deposit: r.rows.map(p => p.deposit), uncovered: r.uncovered, total: r.total }); }
  { const items = Array.from({ length: whole(1, 8) }, (_, k) => ({ id: `i${k}`, kind: pick(['have', 'owe']), amount: rnd() < 0.15 ? null : money(50, 60000), names: pick(['both', 'me', 'them']), plan: pick(['me', 'them', 'split', 'sell', null, 'none']) })), share = pick([0.5, 0.3, 0.6, 1]), U = hmUntangle(items, { share }), park = [money(1, 300000), money(500, 12000)], P = hmParkMonths({ amount: park[0], spending: park[1] });
    add('hmUntangle', { items, share, park }, { mine: [U.mine.have, U.mine.owe, U.mine.net], theirs: [U.theirs.have, U.theirs.owe, U.theirs.net], open: U.open, openAmount: U.openAmount, stillBoth: U.stillBoth, stillBothAmount: U.stillBothAmount, park: P.months }); }
  // Estate and marriage (js/math/estate.js, M8E): who gets what, the 10 years three ways, married or partners
  { const n = whole(1, 4), people = Array.from({ length: n }, (_, k) => ({ id: `p${k}`, name: `P${k}`, heir: pick(Object.keys(ES_HEIRS)) }));
    const items = Array.from({ length: whole(1, 7) }, (_, k) => { const value = rnd() < 0.1 ? null : money(1000, 9000000); return { id: `i${k}`, kind: pick(Object.keys(ES_KINDS)), value, basis: rnd() < 0.3 ? null : money(100, 5000000), to: Object.fromEntries(people.filter(() => rnd() < 0.6).map(p => [p.id, pick([1, 1, 2, 3])])) }; });
    const x = { items, people, deathYear: whole(2026, 2060), started: rnd() < 0.4 }, S = esHeirs(x, ref.estate);
    add('esHeirs', { ...x, rules: ref.estate }, { total: S.total, assigned: S.assigned, erased: S.erased, gets: S.people.map(r => r.gets), pre: S.people.map(r => r.pretax), er: S.people.map(r => r.erased), last: S.people.map(r => r.lastYear), yearly: S.people.map(r => r.yearly), fedBase: S.estate.fedBase, ny: S.estate.ny.state, fed: S.estate.federal.state }); }
  { const taxOf = (g, st) => federalTax({ gross: g, filingStatus: st }, ref).value;
    const x = { balance: money(1000, 3000000), growth: pick([0, 0.02, 0.04, 0.07]), other: pick([0, money(1000, 400000)]), status: pick(['single', 'joint', 'head']), deathYear: whole(2026, 2050), started: rnd() < 0.3 }, X = esTenYear(x, taxOf);
    add('esTenYear', x, Object.fromEntries(['first', 'even', 'last'].map(w => [w, { out: X.ways[w].out, tax: X.ways[w].tax, ready: X.ways[w].ready, rows: X.ways[w].rows.map(r => r.out) }]))); }
  { const taxOf = (g, st) => federalTax({ gross: g, filingStatus: st }, ref).value;
    const x = { people: [0, 1].map(() => ({ pay: pick([0, money(1000, 600000)]), pia: rnd() < 0.3 ? null : money(200, 4500) })), cover: pick([0, money(1000, 25000)]), coverBy: pick([0, 1]) };
    const R = esCompare(x, { taxOf, spousalOf: (a, b) => spousalExcess(a, b, ref.socialSecurity) });
    add('esCompare', x, { single: R.single, joint: R.joint, coverTax: R.coverTax, diff: R.taxDiff, spousal: R.ss ? R.ss.map(s => s.spousal) : null, survivor: R.ss ? R.ss.map(s => s.survivor) : null }); }
  // Eli's frameworks and the canon (js/math/frameworks.js, M8W): SWAN, the peak, 0% tax, the Baby Steps, the stages, 1a, step 9, the wins
  { const x = { monthly: money(800, 15000), months: pick([1, 2, 3, 6, 9, 12]), worry: pick([0, 0, 500, 2500]), cash: rnd() < 0.2 ? null : pick([0, money(1, 90000)]) }, S = fwSwan(x); add('fwSwan', x, { number: S.number, gap: S.gap, monthsHave: S.monthsHave }); }
  { const age = whole(22, 75), x = { age, worth: pick([0, money(1000, 3000000)]), saveYear: pick([0, money(1000, 90000)]), growth: pick([0, 0.02, 0.04, 0.07]), spendYear: money(12000, 200000), endAge: pick([85, 90, 95, 100]), leave: pick([0, 0, 100000]) }, P = fwPeak(x); add('fwPeak', x, { peakAge: P.peakAge, peak: P.peak, canSpend: P.canSpend }); }
  { const x = { std: pick([16100, 32200, 24150]), gainTop: pick([49450, 98900, 66200]), ordinary: pick([0, money(100, 80000)]), gainShare: pick([0.1, 0.25, 0.5, 1]), spend: money(10000, 250000) }, Z = fwZeroTax(x); add('fwZeroTax', x, { gainRoom: Z.gainRoom, saleCash: Z.saleCash, reach: Z.reach, fits: Z.fits }); }
  { const kn = v => (rnd() < 0.1 ? null : v), x = { cash: kn(pick([0, money(1, 60000)])), debt: kn(pick([0, money(100, 50000)])), monthly: kn(money(800, 12000)), retireShare: kn(pick([0, 0.05, 0.15, 0.2])), kids: pick([true, false]), college: pick([true, false, null]), mortgage: kn(pick([0, money(10000, 600000)])) }, B = fwBabySteps(x); add('fwBaby', x, { done: B.steps.map(st => st.done), here: B.here }); }
  { const x = { worth: money(1, 400000) * (rnd() < 0.1 ? -1 : 1), monthly: pick([0, money(50, 6000)]) }, W = fwWealthStage(x); add('fwStage', x, { i: W.i, left: W.left, months: W.months }); }
  { const spans = Array.from({ length: whole(1, 3) }, () => ({ years: whole(1, 20), pay: money(5000, 300000), hours: pick([null, 20, 40, 50]) })), L = fwLifetime(spans); add('fwLifetime', { spans }, { total: L.total, hours: L.hours }); }
  { const x = { invested: pick([0, money(1, 3000000)]), cash: pick([0, money(1, 90000)]), monthly: money(800, 15000), rate: pick([0.03, 0.035, 0.04]) }, S = fwStep9(x); add('fwStep9', x, { income: S.income, cushionLeft: S.cushionLeft, cache: S.cache }); }
  { const wins = Object.fromEntries(FW_WINS.filter(() => rnd() < 0.5).map(([id]) => [id, { done: 1, save: pick([null, 0, 5, 10, 25, 50, 100]) }])), y = money(12000, 200000), T = fwWins(wins, y); add('fwWins', { wins, yearSpend: y }, { month: T.month, fiDays: T.fiDays }); }
  // Results first (Nov 26 2026): the lead number, the months to a DTI target, net worth to the end of the month
  { const x = { worth: pick([null, -money(1, 90000), 0, money(1, 900000)]), fire: rnd() < 0.5 }; add('fwLead', x, { lead: fwLead(x) }); }
  { const x = { home: pick([0, money(1, 4000)]), gross: pick([null, money(1500, 30000)]), debts: Array.from({ length: whole(0, 5) }, () => ({ pay: money(25, 1500), off: pick([null, whole(1, 120)]) })), target: pick([0.28, 0.36, 0.43]) }; add('fwDtiMonths', x, { months: fwDtiMonths(x) }); }
  { const last = pick([28, 30, 31]), today = whole(1, last), x = { worth: money(1, 400000) * (rnd() < 0.3 ? -1 : 1), days: Array.from({ length: whole(0, 8) }, () => ({ day: whole(1, last), net: money(1, 6000) * (rnd() < 0.5 ? -1 : 1) })), today, last, extra: pick([0, money(1, 900)]) }, E = fwMonthEnd(x); add('fwMonthEnd', x, { endAsIs: E.endAsIs, endPlanned: E.endPlanned, n: E.days.length }); }
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
  // feature 6 (run JOE-1): who carries what, for 1 to 5 people, with shared jobs and hand-offs to people and to others
  const np = whole(1, 5), keys = ['me', 'p1', 'p2', 'p3', 'p4'].slice(0, np);
  const hands = Object.fromEntries(tasks.filter(t => exits[t.id] === 'hand').map(t => [t.id, pick(keys.concat(['coach', 'tool']))]));
  const assign = Object.fromEntries(JOB_IDS.filter(() => rnd() < 0.7).map(id => [id, keys.filter(() => rnd() < 0.5).concat(rnd() < 0.1 ? ['gone'] : [])]));
  const hv = { tp: rnd() < 0.5 ? null : money(10, 120), wage: rnd() < 0.3 ? 0 : money(8, 150) }, rate = jobHourValue(hv.tp, hv.wage).rate;
  const K = jobCarry(ad, tasks, exits, hands, assign, keys.map(k => ({ key: k, n: k })), rate);
  add('jobCarry', { mins, tasks, exits, hands, assign, keys, hv }, { rate, total: K.total, value: K.value, min: K.people.map(p => p.min), val: K.people.map(p => p.value) });
}
// Student loans (run of Nov 25 2026, Part 5): a private refinance at the person's own rate next to a federal total, and
// the stepladder of school-year loans, each at its own rate with the interest before payments start.
for (let i = 0; i < N; i++) {
  { const x = { balance: money(2000, 300000), rate: pick([0.03, 0.04, 0.045, 0.05, 0.06, 0.07, 0.08, 0.1]), years: pick([5, 7, 10, 15, 20]), fed: money(2000, 500000), tax: rnd() < 0.5 ? 0 : money(100, 30000) };
    const R = { rows: [{ id: 'standard', name: 'Standard, 10 years', paid: x.fed, tax: x.tax, payment: 100, forgiven: 0 }], lowestTotal: 'standard', s: { balance: x.balance } };
    const F = refiOf(R, { rate: x.rate, years: x.years }, ref); add('slRefi', x, { payment: F.payment, paid: F.paid, diff: F.diff, months: F.months }); }
  { const years = ref.studentLoans.rates.map(r => r[0]), n = whole(1, 6), first = whole(0, years.length - 1);
    const rungs = Array.from({ length: n }, (_, k) => { const y = years[Math.min(years.length - 1, first + k)] ?? years[0], level = pick(['ug', 'ug', 'grad', 'plus']);
      return { year: rnd() < 0.1 ? `${2008 + k}-${String(9 + k).padStart(2, '0')}` : y, level, amount: money(1000, 40000), subsidized: level === 'ug' && rnd() < 0.4, rate: rnd() < 0.2 ? pick([0.03, 0.05, 0.068, 0.079]) : null }; });
    const gap = pick([0, 6, 12, null]), L = stepladderOf(rungs, { gap }, ref);
    add('slLadder', { rungs, gap }, L.needs?.length ? { needs: L.needs.length } : { startYm: L.startYm, before: L.before, owed: L.owed, payment: L.payment, paid: L.paid, blended: L.blended, rates: L.rungs.map(r => r.rate), each: L.rungs.map(r => [r.year, r.before, r.payment, r.paid]) }); }
}
// Lifestyle creep and enough (run Not built, groups 1 to 5, Part 3): a made-up ledger of 1 to 4 years, some months
// missing, refunds, income in some years only; the Pareto of 0 to 12 lines; the enough number; the Rough ranges.
for (let i = 0; i < N; i++) {
  const cats = ['Food', 'Accommodation', 'Transportation', 'Bills and subscriptions', 'Other', 'Health and self-care'], y0 = whole(2021, 2024), ny = whole(1, 4), rows = [];
  for (let y = y0; y < y0 + ny; y++) {
    const paid = rnd() < 0.7;
    for (let mo = 1; mo <= 12; mo++) {
      if (rnd() < 0.25) continue;
      const ym = `${y}-${String(mo).padStart(2, '0')}`;
      for (const c of cats) if (rnd() < 0.7) rows.push({ d: ym, amt: rnd() < 0.05 ? -money(5, 80) : money(5, 3000), cat: c, kind: 'out' });
      if (paid && rnd() < 0.9) rows.push({ d: `${ym}-${String(whole(1, 28)).padStart(2, '0')}`, amt: money(1500, 12000), kind: 'in' });
    }
  }
  const x = { rows, inflation: pick([null, 0.02, 0.027, 0.03, 0.05]), incomeGrowth: pick([null, 0, 0.03, 0.1]) }, r = enCreep(rows, { inflation: x.inflation, incomeGrowth: x.incomeGrowth });
  add('enCreep', x, r.ready ? { ready: true, prev: r.prev.year, now: r.now.year, spendGrowth: r.spendGrowth, income: r.income.growth, alert: r.alert, gap: r.gap,
    cats: r.cats.map(c => ({ cat: c.cat, was: c.was, is: c.is, mutant: c.mutant, over: c.overInflation })), turn: r.turn } : { ready: false });
  const lines = Array.from({ length: whole(0, 12) }, (_, k) => ({ name: `L${k}`, amt: rnd() < 0.1 ? 0 : money(5, 4000) }));
  const P = enPareto(lines); add('enPareto', { lines }, P.ready ? { ready: true, count: P.count, total: P.total, topTotal: P.topTotal } : { ready: false });
  const e = { fi: rnd() < 0.05 ? null : money(50000, 5000000), share: pick([0.8, 0.9, 1, 1.1, 1.2]), room: pick([null, 0.1, 0.2, 0.3]), have: rnd() < 0.2 ? null : money(0, 6000000) };
  const E = enEnough(e); add('enEnough', e, { value: E.value, withRoom: E.withRoom ?? null, left: E.left ?? null, past: E.past ?? null });
  const v = (rnd() < 0.2 ? -1 : 1) * (rnd() < 0.1 ? whole(0, 99) : money(100, 9000000)); add('enRough', { v }, { text: enRough(v) });
  const a = { spend: money(500, 9000), take: rnd() < 0.1 ? 0 : money(500, 12000) }, b = { spend: a.spend * between(0.9, 1.3), take: a.take * between(0.9, 1.3) };
  add('enStepCreep', { a, b }, { up: enStepCreep(a, b) });
}
// Joy and enough (run Finish everything partly built, Part 8): lines with and without a joy tap, a wage or none; the
// curve with some categories placed; a rich-life list with prices, joys, kinds and regrets; subscriptions and a total
// of days. The days function of the rich list is a made-up straight line here (the real one is each app's FI date).
for (let i = 0; i < N; i++) {
  const lines = Array.from({ length: whole(0, 10) }, (_, k) => ({ name: `L${k}`, amt: rnd() < 0.1 ? 0 : money(5, 3000), joy: rnd() < 0.3 ? null : whole(1, 5) }));
  const wage = pick([null, 0, 18.5, 32, 75]), J = enJoy(lines, { wage });
  add('enJoy', { lines, wage }, J.ready ? { ready: true, total: J.total, ratedTotal: J.ratedTotal, dollarJoy: J.dollarJoy, lovedShare: J.lovedShare,
    rows: J.rows.map(r => ({ name: r.name, joyShare: r.joyShare, per100: r.per100, hours: r.hours, perHour: r.perHour })) } : { ready: false });
  const steps = ['survival', 'comforts', 'luxuries', 'past', null], cats = Array.from({ length: whole(0, 8) }, (_, k) => ({ cat: `C${k}`, amt: rnd() < 0.1 ? 0 : money(10, 2500) }));
  const place = Object.fromEntries(cats.map(c => [c.cat, pick(steps)]).filter(([, v]) => v)), K = enCurve(cats, place);
  add('enCurve', { cats, place }, K.ready ? { ready: true, total: K.total, placedTotal: K.placedTotal, past: K.past, meter: K.meter, share: K.share, levels: K.levels.map(l => l.amt) } : { ready: false });
  const items = Array.from({ length: whole(0, 6) }, (_, k) => ({ id: `i${k}`, name: `I${k}`, price: rnd() < 0.15 ? null : money(20, 20000), joy: rnd() < 0.15 ? null : whole(1, 5),
    kind: pick(['experience', 'thing', null]), done: rnd() < 0.3, regret: pick(['alot', 'little', 'no', null]) }));
  const age = rnd() < 0.15 ? null : whole(18, 85), lifeTo = pick([null, 85, 90, 95]), perDay = money(20, 400), Rr = enRich(items, { age, lifeTo, days: p => Math.round(p / perDay) });
  add('enRich', { items, age, lifeTo, perDay }, { plannedTotal: Rr.plannedTotal, doneTotal: Rr.doneTotal, alotTotal: Rr.alotTotal, alotDays: Rr.alotDays,
    items: Rr.items.map(x => ({ id: x.id, per100: x.per100, memYears: x.memYears, dividend: x.dividend, laterYears: x.laterYears, days: x.days })), regret: Rr.regret.map(x => x.id) });
  const subs = Array.from({ length: whole(0, 6) }, (_, k) => ({ name: `S${k}`, amt: rnd() < 0.1 ? 0 : money(1, 90) })), totalDays = rnd() < 0.15 ? null : money(1, 400);
  const P = enSubs(subs, totalDays, { wage }); add('enSubs', { subs, totalDays, wage }, P.ready ? { ready: true, total: P.total, days: P.days, rows: P.rows.map(r => ({ name: r.name, days: r.days, hoursYear: r.hoursYear })) } : { ready: false });
}
// Ratios on Key numbers (run Not built, groups 1 to 5, Part 9): random households, some inputs missing (null), some
// zero; each ratio from js/math/ratios.js, worked out again from its definition in the second engine.
for (let i = 0; i < N; i++) {
  const maybe = (v, p = 0.1) => (rnd() < p ? null : v), z = (lo, hi) => (rnd() < 0.15 ? 0 : money(lo, hi));
  const kinds = ['Credit card', 'Car loan', 'Student loan', 'Mortgage', 'Medical', 'Personal loan', 'Line of credit'];
  const debts = Array.from({ length: whole(0, 4) }, () => ({ type: pick(kinds), balance: money(100, 300000), apr: maybe(pick([0, 0.03, 0.07, 0.2, 0.29]), 0.1), payment: maybe(money(25, 3000), 0.1) }));
  const x = { cash: maybe(z(10, 90000)), hsa: z(10, 9000), oopMax: maybe(pick([0, 3000, 5000, 9200])), target: maybe(money(1000, 60000)), netWorth: maybe((rnd() < 0.2 ? -1 : 1) * money(100, 2000000)),
    assets: maybe(z(100, 3000000)), homeValue: maybe(money(80000, 1500000), 0.3), mortgage: maybe(z(10000, 900000), 0.3), grossYear: maybe(z(5000, 400000)), takeHome: maybe(z(500, 25000)),
    fixed: maybe(z(100, 9000)), variable: maybe(z(100, 9000)), side: maybe(z(10, 5000)), total: maybe(z(100, 30000)), base: maybe(z(10000, 300000)), bonus: z(100, 40000), match: maybe(z(100, 15000)),
    growth: maybe(between(-0.1, 0.2), 0.3), inflation: maybe(pick([0.02, 0.027, 0.04]), 0.1), spendYear: maybe(z(5000, 200000)), invested: maybe(z(100, 3000000)), age: maybe(whole(18, 80)), retireAge: whole(40, 75),
    realReturn: pick([0, 0.03, 0.05, 0.07]), financial: maybe(z(100, 3000000)), advantaged: maybe(z(10, 500000)), planAge: pick([85, 90, 95]), debts: rnd() < 0.1 ? null : debts,
    rows: Array.from({ length: whole(0, 16) }, (_, k) => ({ d: `${2025 + Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, '0')}`, amt: money(100, 9000), kind: rnd() < 0.15 ? 'in' : 'out' })),
    rating: maybe(whole(1, 10), 0.3), good: whole(0, 6), of: whole(0, 8), wind: maybe(money(500, 50000), 0.2), toTax: z(10, 5000), toFun: z(10, 2000), toCash: z(10, 5000), toDebt: z(10, 9000), toInv: z(10, 20000) };
  x.good = Math.min(x.good, x.of);
  const v = r => r.value;
  add('ratios', x, {
    current: v(RA.raCurrent({ cash: x.cash, shortDebt: x.debts && x.debts.filter(d => RA.raIsShort(d.type)).reduce((t, d) => t + d.balance, 0) })),
    health: v(RA.raHealth({ cash: x.cash, hsa: x.hsa, oopMax: x.oopMax })), selfins: v(RA.raSelfInsure({ cash: x.cash, target: x.target })),
    solvency: v(RA.raSolvency({ netWorth: x.netWorth, assets: x.assets })),
    revolving: v(RA.raRevolving({ revolving: x.debts && x.debts.filter(d => RA.raIsRevolving(d.type)).reduce((t, d) => t + d.balance, 0), total: x.debts && x.debts.reduce((t, d) => t + d.balance, 0) })),
    mix: v(RA.raCreditMix({ kinds: x.debts && x.debts.map(d => d.type) })), intprin: v(RA.raInterestPrincipal({ debts: x.debts })),
    equity: v(RA.raHomeEquity({ homeValue: x.homeValue, mortgage: x.mortgage })), ltv: v(RA.raLtv({ mortgage: x.mortgage, homeValue: x.homeValue })),
    priceinc: v(RA.raPriceIncome({ homeValue: x.homeValue, grossYear: x.grossYear })), realestate: v(RA.raRealEstate({ realEstate: x.homeValue, assets: x.assets })),
    discretionary: v(RA.raDiscretionary({ takeHome: x.takeHome, fixed: x.fixed })), fixedvar: v(RA.raFixedShare({ fixed: x.fixed, variable: x.variable })),
    volatility: v(RA.raVolatility({ rows: x.rows })), side: v(RA.raSideShare({ side: x.side, total: x.total })),
    totalcomp: v(RA.raTotalComp({ base: x.base, bonus: x.bonus, match: x.match })), realwage: v(RA.raRealWage({ growth: x.growth, inflation: x.inflation })),
    replace: v(RA.raReplacement({ spendYear: x.spendYear, grossYear: x.grossYear })), investnw: v(RA.raInvestNw({ invested: x.invested, netWorth: x.netWorth })),
    nwincome: v(RA.raNwIncome({ netWorth: x.netWorth, grossYear: x.grossYear })),
    human: v(RA.raHumanCapital({ grossYear: x.grossYear, age: x.age, retireAge: x.retireAge, realReturn: x.realReturn, financial: x.financial })),
    shelter: v(RA.raTaxShelter({ advantaged: x.advantaged, invested: x.invested })),
    longevity: v(RA.raLongevity({ invested: x.invested, spendYear: x.spendYear, age: x.age, retireAge: x.retireAge, planAge: x.planAge })),
    windfall: v(RA.raWindfall({ amount: x.wind, toTax: x.toTax, toFun: x.toFun, toCash: x.toCash, toDebt: x.toDebt, invested: x.toInv })),
    confidence: (() => { const r = RA.raConfidence({ rating: x.rating, good: x.good, of: x.of }); return r.value == null ? null : [r.value, r.read]; })(),
  });
}
// The game's play math (run Not built, groups 1 to 5, Part 10b): a bank bonus with its deposit, months, rates, fees and
// tax (some missing); a hunt of a few bonuses; a daily challenge on random cash, spending and card rates; a round of
// the credit score game; the next monthly date. The second engine works each out again from its definition.
for (let i = 0; i < N; i++) {
  const maybe = (v, p = 0.1) => (rnd() < p ? null : v);
  const bon = () => ({ bonus: maybe(pick([100, 200, 300, 400, 500, 900])), deposit: rnd() < 0.2 ? 0 : money(100, 30000), months: maybe(pick([2, 3, 4, 6, 12])), hysaRate: maybe(pick([0, 0.01, 0.035, 0.045]), 0.15), bankRate: pick([0, 0, 0.001, 0.01]), fees: pick([0, 0, 5, 25, 60]), taxRate: maybe(pick([0.1, 0.12, 0.22, 0.32]), 0.3), state: pick(['planned', 'open', 'paid', 'odd']) });
  const b = bon();
  add('plBonus', b, plBonus(b));
  const list = Array.from({ length: whole(0, 5) }, bon);
  add('plHunt', { list }, plHunt(list));
  const ch = { cost: maybe(money(10, 20000)), cash: maybe(rnd() < 0.1 ? 0 : money(10, 60000)), spendMonth: maybe(money(800, 12000)), cardApr: maybe(pick([0, 0.18, 0.24, 0.29]), 0.3) };
  add('plChallenge', ch, plChallenge(ch));
  const ids = ['pay', 'owed', 'length', 'new', 'mix'], order = ids.slice().sort(() => rnd() - 0.5);
  add('plFicoRound', { order }, plFicoRound(order));
  const t = `${whole(2025, 2028)}-${String(whole(1, 12)).padStart(2, '0')}-${String(whole(1, 28)).padStart(2, '0')}`, day = whole(1, 28), after = rnd() < 0.5;
  add('plNextMonthly', { t, day, after }, { d: plNextMonthly(t, day, after) });
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
// Benefits and health (run Finish everything partly built, Part 10): the optimizer's four, the health chain at an income
// (any state, any size) and plans side by side, some answers missing (null). The 2027 limits and the cliff rows are the
// reference file's; the second engine reads them from there too.
{ const BR = bpRules(ref), maybe = (v, p = 0.1) => (rnd() < p ? null : v);
  for (let i = 0; i < N; i++) {
    { const x = { cover: maybe(pick(['self', 'family'])), age: maybe(whole(20, 70)), you: maybe(money(1, 12000)), employer: pick([null, 0, money(1, 3000)]), rate: maybe(pick([0.15, 0.22, 0.3, 0.4])), years: pick([null, 0, 5, 20, 35]), growth: pick([null, 0, 0.04, 0.07]), receipts: pick([null, 0, money(1, 3000)]) };
      const H = bpHsa(x, BR); add('bpHsa', x, H.ready ? { ready: true, put: H.put, yearly: H.yearly, grows: H.grows, receiptsBank: H.receiptsBank } : { ready: false }); }
    { const x = { care: maybe(money(1, 30000)), ages: Array.from({ length: whole(0, 3) }, () => whole(0, 17)), rate: maybe(pick([0.2, 0.3])), separate: rnd() < 0.2 };
      const D = bpDcfsa(x, BR); add('bpDcfsa', x, D.ready ? { ready: true, put: D.put, yearly: D.yearly, years: D.years, total: D.total } : { ready: false }); }
    { const x = { put: maybe(money(1, 40000)), discount: maybe(pick([0.05, 0.1, 0.15, 0.2])), rate: maybe(pick([0.12, 0.22, 0.32])) };
      const E = bpEspp(x, BR); add('bpEspp', x, E.ready ? { ready: true, put: E.put, gain: E.gain, yearly: E.yearly } : { ready: false }); }
    { const x = { monthly: maybe(money(1, 600)), rate: maybe(pick([0.2, 0.3])) };
      const C = bpCommuter(x, BR); add('bpCommuter', x, C.ready ? { ready: true, covered: C.covered, yearly: C.yearly } : { ready: false }); }
    { const h = { state: pick(['NY', 'NY', 'TX', 'FL', 'CA', 'VT', 'ZZ']), size: whole(1, 8), adults: whole(1, 2) }, magi = money(1, 250000), A = bpCoverage(h, BR, magi);
      add('bpCoverage', { h, magi }, { on: A.on, cost: A.cost, help: A.help }); }
    { const plans = Array.from({ length: whole(1, 3) }, () => ({ premium: maybe(money(1, 1200)), deductible: maybe(money(1, 9000)), oop: maybe(money(1, 12000)), market: rnd() < 0.6 })), help = pick([null, 0, money(1, 15000)]);
      const P = bpPlans(plans, { help }); add('bpPlans', { plans, help }, { rows: P.rows.map(r => (r.ready ? { ready: true, year: r.year, typical: r.typical, heavy: r.heavy } : { ready: false })), cheapest: P.cheapest }); }
  }
}
// Safety nets (run Finish everything partly built, Part 15): a life change on random taps (some left to the start
// pick), with or without pay, a weekly wage and rent; the run of the cash, the tripwires, Plan B and the levels.
{ const rules = { dbl: ref.limits.leave.NY.dbl, pfl: ref.limits.leave.NY.pfl };
  for (let i = 0; i < N; i++) {
    const kind = pick(['medical', 'move', 'breakup', 'baby']), taps = {};
    for (const [k, , opts] of NT_TAPS[kind]) if (rnd() < 0.8) taps[k] = pick(opts)[0];
    const base = { pay: rnd() < 0.1 ? null : money(800, 12000), weekly: rnd() < 0.5 ? null : money(200, 5000), housing: rnd() < 0.2 ? null : money(300, 5000) };
    const E = ntEvent(kind, taps, base, rules), x = { kind, taps, base, cash: money(1, 80000), burn: money(500, 12000), income: rnd() < 0.2 ? 0 : money(500, 15000), basics: money(300, 6000), planBurn: money(300, 9000), max: 60 };
    const args = { cash: x.cash, burn: x.burn, income: x.income, flows: E.flows, max: x.max }, R = ntRun(args), T = ntTrips(R, x.basics), B = ntPlanB(args, x.planBurn);
    x.levels = [x.burn, rnd() < 0.2 ? null : money(300, 12000), money(300, 9000), money(200, 6000)];
    const L = ntDegrade({ cash: x.cash, income: x.income, levels: x.levels.map((burn, j) => ({ id: String(j), burn })) });
    add('ntRun', x, { once: E.once, needs: E.needs, runway: R.runway, lowest: R.lowest, lowestK: R.lowestK, end: R.end, steady: R.steady, trips: T.map(t => [t.level, t.k, t.now]), planB: B.run.runway, more: B.more, levels: L.map(l => [l.burn, l.months, l.lasts]) });
  }
}
writeFileSync(out, JSON.stringify({ seed: Number(seedArg), perFunction: N, made: new Date().toISOString().slice(0, 10), cases }));
const count = {}; for (const c of cases) count[c.fn] = (count[c.fn] || 0) + 1;
console.log(`${cases.length} cases written to ${out}`, JSON.stringify(count));
