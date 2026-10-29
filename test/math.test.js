import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { compare } from '../js/math/match.js';
import { metrics } from '../js/math/metrics.js';
import { householdFromInputs } from '../js/demo.js';
import { monthlyFrom, federalTax, fica, takeHomeFromGross, grossFromTakeHome, taxRates, employerMatch, variableSafeBudget, realHourlyWage } from '../js/math/income.js';
import { lineMonthly, prepaidLeft, myShare, supportReceived, fixedFloor, irregularSetAside, estimateVsActual, gutAccuracy, monthlySurplus, savingsRate, drafttShares, housingPct } from '../js/math/spending.js';
import { cardMinimum, payoffMonths, totalInterest, feeApr, payoffPlan, utilization, debtToIncome, promoPayment } from '../js/math/debt.js';
import { netWorth, liquidNetWorth, runway, ruleOf5, limitUsed } from '../js/math/assets.js';
import { realReturn, fiNumber, leanFiNumber, baristaFiNumber, fiDate, coastFi, pctToFi, bigDeals, solveMonthlySaving, solveSpending, moneyAsTime } from '../js/math/fi.js';
import { runningBalance, bonusMonths } from '../js/math/calendar.js';
import { hourlyRate, inView, timeChip } from '../js/math/time.js';
import { money, pct, duration, date, month, hours, fiDays, EMPTY } from '../js/format.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

test('Demo client: every expected output within $1 or 1 month', () => {
  const fixture = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
  const rows = compare(fixture, ref);
  assert.equal(rows.length, 14);
  for (const r of rows) assert.ok(r.pass, `${r.label}: expected ${r.expected}, got ${r.got}`);
});

const privatePath = new URL('../fixtures/eli.local.json', import.meta.url);
test('Test client (private): every expected output', { skip: !existsSync(privatePath) && 'fixtures/eli.local.json is missing. Put SLAM Test Client (private).xlsx in fixtures/ and run python3 tools/fixtures.py private.' }, () => {
  const rows = compare(JSON.parse(readFileSync(privatePath)), ref);
  for (const r of rows) assert.ok(r.pass, `${r.label}: did not match`);
});

test('formats: empty is a dash, never $0', () => {
  assert.equal(money(null), EMPTY);
  assert.equal(money(0), '$0');
  assert.equal(money(1240.4), '$1,240');
  assert.equal(money(15.99, { cents: true }), '$15.99');
  assert.equal(money(-240), '−$240');
  assert.equal(pct(0.224), '22.4%');
  assert.equal(pct(undefined), EMPTY);
  assert.equal(date('2026-11-12'), 'Nov 12, 2026');
  assert.equal(month('2026-11-12'), 'Nov 2026');
  assert.equal(duration(26, new Date(2026, 10, 1)), '26 months (Jan 2029)');
  assert.equal(hours(14.2), '14 hrs');
  assert.equal(fiDays(3), '3 FI days');
});

test('M01 any period to monthly', () => {
  near(monthlyFrom(100, 'week').value, 433.33);
  near(monthlyFrom(1000, '2 weeks').value, 2166.67);
  assert.equal(monthlyFrom(1000, 'twice a month').value, 2000);
  assert.equal(monthlyFrom(1200, 'year').value, 100);
  near(monthlyFrom(1000, 'paycheck', '2 weeks').value, 2166.67);
  const r = monthlyFrom(500, null);
  assert.equal(r.value, 500);
  assert.ok(r.roughly, 'missing period is marked Roughly');
});

test('M10 to M14 federal tax, FICA, take-home, gross, rates', () => {
  // $60,000 single: taxable 43,900 -> 1,240 + 12% of 31,500 = 5,020
  const fed = federalTax({ gross: 60000, filingStatus: 'Single' }, ref);
  near(fed.value, 5020);
  assert.equal(fed.marginal, 0.12);
  near(fica({ gross: 60000 }, ref).value, 4590);
  near(fica({ gross: 250000 }, ref).value, 184500 * 0.062 + 250000 * 0.0145 + 50000 * 0.009);
  const th = takeHomeFromGross({ gross: 60000 }, ref);
  near(th.value, 60000 - 5020 - 4590);
  const g = grossFromTakeHome({ takeHome: th.value }, ref);
  assert.ok(Math.abs(g.value - 60000) <= 1);
  assert.equal(g.status, 'Computed');
  const rates = taxRates({ gross: 60000 }, ref);
  near(rates.effective, (5020 + 4590) / 60000, 1e-6);
  near(rates.marginal, 0.12 + 0.0765, 1e-9);
  assert.equal(federalTax({ gross: null }, ref).value, null);
  near(fica({ gross: 50000, selfEmployed: true }, ref).value, 50000 * 0.9235 * 0.153);
});

test('M15 match, M16 variable income, M17 real hourly wage', () => {
  near(employerMatch({ contributionPct: 0.04, matchPct: 0.5, matchCapPct: 0.06, gross: 80000 }).value, 1600);
  near(employerMatch({ contributionPct: 0.10, matchPct: 1, matchCapPct: 0.06, gross: 80000 }).value, 4800);
  assert.deepEqual(employerMatch({ contributionPct: 0.1 }).needs.length, 3);
  near(variableSafeBudget({ lowestMonth: 3000 }, ref).value, 2250);
  const v = variableSafeBudget({ typicalMonth: 4000 }, ref);
  near(v.value, 2250); assert.ok(v.guess);
  near(realHourlyWage({ takeHome: 4000, workCosts: 400, paidHours: 160, commuteHours: 20, prepHours: 20 }).value, 18);
  assert.deepEqual(realHourlyWage({ takeHome: 4000 }).needs, ['hours']);
});

test('M20, M2B accrual and prepaid; M21, M22 my share and support', () => {
  assert.equal(lineMonthly({ amount: 1200, covers: { months: 12 } }).value, 100);
  assert.equal(lineMonthly({ amount: 1200, covers: { months: 12 } }, { basis: 'cash' }).value, 1200);
  assert.equal(prepaidLeft({ amount: 1200, months: 12, monthsElapsed: 3 }).value, 900);
  assert.equal(myShare({ amount: 1500, whoPays: 'Split' }, { roommates: 2 }).value, 500);
  assert.equal(myShare({ amount: 1500, myShare: 600 }).value, 600);
  assert.equal(myShare({ amount: 70, whoPays: 'Covered by someone' }).value, 0);
  assert.equal(myShare({ amount: 70, status: 'Not for me' }).value, 0);
  assert.equal(myShare({ amount: null }).value, null);
  assert.equal(supportReceived([{ name: 'Phone', amount: 70, whoPays: 'Covered by someone' }, { amount: 1000, coveredPct: 0.5 }]).value, 570);
});

test('M23 floor, M24 set-aside, M25 estimate vs actual, M26 gut accuracy', () => {
  assert.equal(fixedFloor([{ amount: 1000, amountType: 'Fixed' }, { amount: 300, amountType: 'Variable' }]).value, 1000);
  assert.equal(irregularSetAside(600).value, 50);
  const e = estimateVsActual({ estimate: 400, actual: 500 });
  assert.equal(e.value, 100); assert.equal(e.pct, 0.25);
  assert.equal(estimateVsActual({ estimate: 0, actual: 50 }).pct, null);
  assert.ok(gutAccuracy([]).hidden);
  near(gutAccuracy([{ guess: 3000, actual: 3600 }, { guess: 3500, actual: 3500 }]).value, (600 / 3600) / 2, 1e-9);
});

test('M27 surplus, M28 savings rate, M29 DRAFTT, M2A housing', () => {
  assert.equal(monthlySurplus({ takeHome: 4800, spending: 3600 }).value, 1200);
  assert.equal(monthlySurplus({ takeHome: 4800, spending: 3000, debtPaymentsOutsideSpending: 500 }).value, 1300);
  assert.deepEqual(monthlySurplus({ takeHome: null, spending: null }).needs, ['take-home', 'spending']);
  const sr = savingsRate({ takeHome: 4000, surplus: 800, afterTaxSavings: 200, gross: 6000, pretaxSaving: 300, match: 100 });
  assert.equal(sr.value, 0.25); near(sr.gross, 1400 / 6000, 1e-9);
  const d = drafttShares([{ amount: 1000, draftt: 'Accommodation' }, { amount: 400, draftt: 'Food' }], 4000);
  assert.equal(d.value.Accommodation, 0.25); assert.equal(d.value.Food, 0.1);
  assert.equal(housingPct({ housing: 1400, takeHome: 4000 }).value, 0.35);
});

test('M30 to M37 debt', () => {
  near(cardMinimum({ balance: 4200, apr: 0.2215 }).value, 42 + 4200 * 0.2215 / 12);
  assert.equal(cardMinimum({ balance: 500, apr: 0.2 }).value, 25);
  assert.equal(cardMinimum({ balance: 20, apr: 0.2 }).value, 20);
  const never = payoffMonths({ balance: 20000, apr: 0.25, payment: 400 });
  assert.ok(never.never);
  assert.equal(never.paymentNeeded, 417);
  assert.match(never.text, /never pays it off\. It needs at least \$417 a month/);
  assert.equal(payoffMonths({ balance: 2000, apr: 0, payment: 500 }).value, 4);
  assert.deepEqual(payoffMonths({ balance: 4200, apr: null, payment: 250 }).needs, ['APR']);
  const ti = totalInterest({ balance: 4200, apr: 0.2215, payment: 250 });
  near(ti.value, 873.92); assert.ok(Math.abs(ti.simulated - ti.value) < 2);
  near(feeApr({ fee: 15, amount: 100, periodsPerYear: 26 }).value, 3.9);
  const debts = [{ name: 'Card', balance: 4200, apr: 0.2215, payment: 250 }, { name: 'Student', balance: 18000, apr: 0.055, payment: 210 }, { name: 'Car', balance: 7000, apr: 0.0714, payment: 320, stress: 5 }];
  const av = payoffPlan(debts, { extra: 200, order: 'avalanche' });
  const sb = payoffPlan(debts, { extra: 200, order: 'snowball' });
  const st = payoffPlan(debts, { extra: 200, order: 'stress' });
  assert.equal(av.debts[0].name, 'Card'); assert.equal(sb.debts[0].name, 'Card'); assert.equal(st.debts[0].name, 'Car');
  assert.ok(av.interest <= sb.interest + 0.01 && av.interest <= st.interest + 0.01, 'avalanche pays the least interest');
  assert.ok(payoffPlan(debts).months > av.months, 'extra payment speeds it up');
  assert.ok(utilization([{ balance: 1000 }]).hidden);
  assert.equal(utilization([{ balance: 1000, limit: 4000 }]).value, 0.25);
  assert.equal(debtToIncome({ monthlyDebtPayments: 780, grossMonthly: 6000 }).value, 0.13);
  assert.equal(promoPayment({ balance: 1200, monthsLeft: 6 }).value, 200);
});

test('M40 to M44 assets', () => {
  assert.equal(netWorth({ assets: [{ name: 'Cash', value: 6000 }, { name: '401(k)', value: 10000, unvested: 2000 }], debts: [{ name: 'Card', balance: 1000 }] }).value, 13000);
  assert.equal(netWorth({ assets: [], debts: [] }).value, null);
  assert.equal(liquidNetWorth({ cash: 6000, brokerage: 1000, rothBasis: 500, consumerDebt: 4200 }).value, 3300);
  const rw = runway({ cash: 6000, spending: 3000, fixedFloor: 2000 });
  assert.equal(rw.value, 2); assert.equal(rw.onFloor, 3);
  const r5 = ruleOf5({ age: 30, spending: 3000, emergencyCash: 10000 });
  assert.equal(r5.months, 6); assert.equal(r5.value, 18000); assert.equal(r5.keepPace, 50); assert.equal(r5.gap, 8000);
  assert.equal(limitUsed({ contributions: 12250, type: '401(k)', age: 30 }, ref).value, 0.5);
  assert.equal(limitUsed({ contributions: 0, type: '401(k)', age: 61 }, ref).limit, 35750);
  assert.equal(limitUsed({ contributions: 0, type: 'Roth IRA', age: 52 }, ref).limit, 8600);
});

test('M02, M50 to M58 FI', () => {
  assert.equal(realReturn(null, ref).value, 0.07);
  assert.equal(fiNumber({ annualSpending: 40000, withdrawalRate: 0.04 }).value, 1000000);
  assert.equal(leanFiNumber({ annualFat: 24000, withdrawalRate: 0.04 }).value, 600000);
  assert.equal(baristaFiNumber({ annualSpending: 40000, partTimeIncome: 20000, withdrawalRate: 0.04 }).value, 500000);
  assert.equal(fiDate({ invested: 1e6, monthlyInvesting: 0, realReturn: 0.07, target: 1e6 }).value, 0);
  assert.ok(fiDate({ invested: 0, monthlyInvesting: 1, realReturn: 0, target: 1e6 }).never);
  near(coastFi({ fiNumber: 1e6, realReturn: 0.07, age: 60, retireAge: 60 }).value, 1e6);
  assert.equal(pctToFi(250000, { Regular: 1e6, Lean: 500000 }).value.Lean, 0.5);
  const bd = bigDeals({ invested: 22000, monthlyInvesting: 1200, annualSpending: 43200 }, ref);
  assert.equal(bd.rows.length, 3);
  assert.ok(['Return', 'Withdrawal rate'].includes(bd.value));
  assert.equal(bd.rows.find(r => r.assumption === 'Inflation').spread, 0);
  const save = solveMonthlySaving({ invested: 22000, realReturn: 0.07, target: 1080000, months: 240 });
  assert.ok(fiDate({ invested: 22000, monthlyInvesting: save.value, realReturn: 0.07, target: 1080000 }).value <= 240);
  assert.ok(fiDate({ invested: 22000, monthlyInvesting: save.value - 2, realReturn: 0.07, target: 1080000 }).value > 240);
  const sp = solveSpending({ invested: 22000, monthlyIncomeLeft: 4800, realReturn: 0.07, withdrawalRate: 0.04, months: 303 });
  assert.ok(sp.value >= 3590 && sp.value <= 3600, `spending solver ${sp.value}`);
  const t = moneyAsTime({ amount: 1000, hourlyWage: 25, annualSpending: 36500 });
  assert.equal(t.value.hours, 40); assert.equal(t.value.fiDays, 10);
});

test('M60 running balance and M61 bonus months', () => {
  const rb = runningBalance({ start: 1000, from: '2026-11-01', to: '2026-11-30', entries: [
    { date: '2026-11-01', amount: -900 }, { date: '2026-11-15', amount: 2000 },
    { date: '2026-11-10', amount: 500, maybe: true }, { amount: -300, variableDate: true }] });
  assert.equal(rb.value.length, 30);
  near(rb.value.at(-1).balance, 1800);
  assert.equal(rb.low.date, '2026-11-14');
  const b = bonusMonths({ firstPayday: '2026-01-02', year: 2026 });
  assert.deepEqual(b.value, [0, 6]); // Jan and Jul 2026
});

test('time view: 173-hour fallback as a Guess, real hours replace it (R152, R153, R155)', () => {
  const g = hourlyRate({ takeHome: 4800 }, ref);
  near(g.value, 4800 / 173); assert.ok(g.guess);
  const real = hourlyRate({ takeHome: 4800, paidHours: 160 }, ref);
  assert.equal(real.value, 30); assert.ok(!real.guess);
  assert.equal(hourlyRate({ takeHome: null }, ref).value, null);
  assert.equal(inView(1650, 'Hours', { rate: real }).text, '55 hrs');
  assert.equal(inView(3600, 'FI days', { annualSpending: 43200 }).text, '30 FI days');
  assert.equal(inView(null, 'Hours', { rate: real }).text, EMPTY);
  assert.equal(inView(100, 'Hours', { rate: { value: null } }).missing, 'take-home pay');
  assert.equal(timeChip(40, { rate: real }), null, 'small amounts get no chip');
  assert.equal(timeChip(300, { rate: real }), '10 hrs');
});

test('show the math: every demo number explains itself in plain words', () => {
  const fixture = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
  const m = metrics(householdFromInputs(fixture.inputs), ref, { now: new Date(2026, 10, 1) });
  for (const key of ['netWorth', 'runwayMonths', 'surplus', 'savingsRate', 'housingPct', 'fiNumber', 'monthsToFi', 'coastFi']) {
    assert.ok(m[key].text && m[key].text.length > 20, key);
    assert.ok(!/undefined|NaN|null/.test(m[key].text), `${key}: ${m[key].text}`);
  }
  assert.match(m.surplus.text, /\$4,800 take-home minus \$3,600 spending/);
  assert.match(m.monthsToFi.text, /303 months \(Feb 2052\)/);
});

test('a blank household shows needs, never 0', () => {
  const m = metrics(householdFromInputs({}), ref);
  for (const key of ['netWorth', 'surplus', 'savingsRate', 'fiNumber', 'monthsToFi', 'runwayMonths', 'housingPct']) {
    assert.equal(m[key].value, null, key);
    assert.ok(m[key].needs.length, key);
  }
});

test('Not sure APR fills a typical rate labeled Guess (R055)', () => {
  const doc = householdFromInputs({ cardBalance: 3000, cardPayment: 200 });
  doc.records.find(r => r.type === 'Credit card').fieldStatus.apr = 'Not sure';
  const d = metrics(doc, ref).debts[0];
  assert.equal(d.apr, 0.2215); assert.ok(d.aprGuess);
});
