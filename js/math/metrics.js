// Reads a household's records and works out every headline number with the Math functions.
// One place maps records to formula inputs, so every screen shows the same answer.
import { statusOf } from '../records.js';
import { isBlank, needs } from './result.js';
import { monthlyFrom } from './income.js';
import { myShare, supportReceived, monthlySurplus, savingsRate, housingPct, fixedFloor } from './spending.js';
import { cardMinimum, payoffMonths, totalInterest } from './debt.js';
import { netWorth, liquidNetWorth, runway, ruleOf5 } from './assets.js';
import { fiNumber, fiDate, coastFi, bigDeals } from './fi.js';
import { hourlyRate } from './time.js';

const HOUSING = new Set(['Rent or mortgage', 'Electric, gas, water']);
const CONSUMER = new Set(['Credit card', 'Personal loan', 'Buy now, pay later', 'Payday or cash advance', 'Medical', 'Family or friend']);

// A value as the math should see it: Not for me is zero (R058); Not sure with nothing typed is a Guess (R055).
function read(record, field, guessValue = null) {
  const v = field in record && field !== 'values' ? record[field] : record.values?.[field];
  const status = statusOf(record, field);
  if (status === 'Not for me') return { v: 0 };
  if (isBlank(v) && status === 'Not sure' && guessValue !== null) return { v: guessValue, guess: true };
  return { v: isBlank(v) ? null : v };
}

export function ageOf(profile, now = new Date()) {
  if (!isBlank(profile.age)) return profile.age;
  if (isBlank(profile.birthYear)) return null;
  const m = profile.birthMonth ?? 1;
  return now.getFullYear() - profile.birthYear - (now.getMonth() + 1 < m ? 1 : 0);
}

export function inputsOf(doc, ref, now = new Date()) {
  const live = doc.records;
  const income = live.filter(r => r.kind === 'income');
  const takeHome = income.length
    ? income.reduce((s, r) => (s === null || isBlank(r.amount) ? null : s + monthlyFrom(r.amount, r.per, r.values.payFrequency).value), 0)
    : null;
  const lines = live.filter(r => r.kind === 'bill').map(r => ({ ...r, ...r.values, amount: read(r, 'amount').v }));
  const allIn = live.find(r => r.kind === 'spending' && r.type === 'All in');
  const lineTotal = lines.length ? lines.reduce((s, l) => s + (myShare(l, { roommates: doc.profile.roommates ?? 0 }).value ?? 0), 0) : null;
  const spending = allIn ? read(allIn, 'amount').v : lineTotal;
  const debts = live.filter(r => r.kind === 'debt').map(r => {
    const apr = read(r, 'apr', ref.typicalRates[r.type] ?? null);
    const balance = read(r, 'balance').v;
    let payment = read(r, 'payment').v;
    let paymentIsMinimum = false;
    if (payment === null && r.type === 'Credit card') { // R036, R037
      const min = cardMinimum({ balance, apr: apr.v });
      if (min.value !== null) { payment = min.value; paymentIsMinimum = true; }
    }
    return { id: r.id, name: r.name ?? r.type, type: r.type, balance, apr: apr.v, aprGuess: !!apr.guess, payment, paymentIsMinimum, stress: r.stress, linkedTo: r.linkedTo };
  });
  const debtPayments = debts.reduce((s, d) => s + (d.payment ?? 0), 0);
  const includesDebt = allIn ? allIn.values.includesDebtPayments !== false : false;
  const accounts = live.filter(r => r.kind === 'account').map(r => ({ id: r.id, name: r.name ?? r.type, group: r.values.group, type: r.type, value: read(r, 'balance').v, unvested: r.values.unvested ?? null }));
  const things = live.filter(r => r.kind === 'asset').map(r => ({ id: r.id, name: r.name ?? r.type, type: r.type, value: read(r, 'value').v }));
  const cash = accounts.some(a => a.group === 'cash') ? accounts.filter(a => a.group === 'cash').reduce((s, a) => s + (a.value ?? 0), 0) : null;
  const invested = accounts.some(a => a.group === 'investment') ? accounts.filter(a => a.group === 'investment').reduce((s, a) => s + (a.value ?? 0), 0) : null;
  const brokerage = accounts.filter(a => a.type === 'Brokerage').reduce((s, a) => s + (a.value ?? 0), 0);
  const housingLines = lines.filter(l => HOUSING.has(l.category));
  const housing = housingLines.some(l => l.category === 'Rent or mortgage' && l.amount !== null)
    ? housingLines.reduce((s, l) => s + (myShare(l).value ?? 0), 0) : null;
  const a = doc.assumptions;
  return {
    takeHome, spending, lines, debts, accounts, things, cash, invested, brokerage, housing,
    debtPaymentsOutsideSpending: spending === null ? null : (includesDebt || !allIn && lines.some(l => l.draftt === 'Debt') ? 0 : debtPayments),
    age: ageOf(doc.profile, now),
    realReturn: a.realReturn ?? ref.presets.realReturn.default,
    withdrawalRate: a.withdrawalRate ?? ref.presets.withdrawalRate.default,
    inflation: a.inflation ?? ref.presets.inflation.default,
    retireAge: a.retireAge ?? ref.defaults.retireAge,
    retirementSpending: a.retirementSpending ?? spending, // R030
    hours: doc.profile.hours ?? {},
    roommates: doc.profile.roommates ?? 0,
  };
}

export function metrics(doc, ref, { now = new Date() } = {}) {
  const x = inputsOf(doc, ref, now);
  const out = { inputs: x };
  out.netWorth = netWorth({ assets: [...x.accounts, ...x.things], debts: x.debts });
  out.liquidNetWorth = liquidNetWorth({ cash: x.cash, brokerage: x.brokerage, consumerDebt: x.debts.filter(d => CONSUMER.has(d.type)).reduce((s, d) => s + (d.balance ?? 0), 0) });
  const floor = x.lines.length ? fixedFloor(x.lines, { roommates: x.roommates }).value : null;
  out.runwayMonths = runway({ cash: x.cash, spending: x.spending, fixedFloor: floor || null });
  out.surplus = monthlySurplus({ takeHome: x.takeHome, spending: x.spending, debtPaymentsOutsideSpending: x.debtPaymentsOutsideSpending ?? 0 });
  out.savingsRate = savingsRate({ takeHome: x.takeHome, surplus: out.surplus.value });
  out.housingPct = housingPct({ housing: x.housing, takeHome: x.takeHome });
  out.supportReceived = supportReceived(x.lines, { roommates: x.roommates });
  out.debts = x.debts.map(d => ({ ...d, payoff: payoffMonths(d, { from: now }), interest: totalInterest(d) }));
  const r5 = ruleOf5({ age: x.age, spending: x.spending, emergencyCash: x.cash });
  out.ruleOf5 = r5;
  out.fiNumber = fiNumber({ annualSpending: x.retirementSpending === null ? null : x.retirementSpending * 12, withdrawalRate: x.withdrawalRate });
  const monthlyInvesting = out.surplus.value; // R: surplus fully invested until a Plan says otherwise
  out.monthsToFi = fiDate({ invested: x.invested, monthlyInvesting, realReturn: x.realReturn, target: out.fiNumber.value }, { from: now });
  if (out.monthsToFi.value === null && !out.monthsToFi.never) { // say what to type, not which result is missing
    const root = [...new Set([...out.surplus.needs, ...out.fiNumber.needs, ...(x.invested === null ? ['invested'] : [])])];
    if (root.length) out.monthsToFi = needs('M53', root, { unit: 'months' });
  }
  out.coastFi = coastFi({ fiNumber: out.fiNumber.value, realReturn: x.realReturn, age: x.age, retireAge: x.retireAge });
  out.bigDeals = bigDeals({ invested: x.invested, monthlyInvesting, annualSpending: x.retirementSpending === null ? null : x.retirementSpending * 12 }, ref);
  out.hourly = hourlyRate({ takeHome: x.takeHome, ...x.hours }, ref);
  out.annualSpending = x.spending === null ? null : x.spending * 12;
  return out;
}

// The key numbers a snapshot keeps for 'change since last session' (R167).
export function keyNumbers(m) {
  const debtTotal = m.inputs.debts.length ? m.inputs.debts.reduce((s, d) => s + (d.balance ?? 0), 0) : null;
  return { netWorth: m.netWorth.value, surplus: m.surplus.value, savingsRate: m.savingsRate.value, debtTotal, monthsToFi: m.monthsToFi.value };
}

export const firstDebt = (m, type) => m.debts.find(d => d.type === type) || { payoff: needs('M31', [`a ${type.toLowerCase()}`]), interest: needs('M32', [`a ${type.toLowerCase()}`]) };
