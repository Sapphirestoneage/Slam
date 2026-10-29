// Reads a household's records and works out every headline number with the Math functions.
// One place maps records to formula inputs, so every screen shows the same answer.
import { statusOf } from '../records.js';
import { isBlank, needs } from './result.js';
import { monthlyFrom, incomeRow, defaultFilingStatus } from './income.js';
import { gatesOf, visible } from '../gates.js';
import { myShare, supportReceived, monthlySurplus, savingsRate, housingPct, fixedFloor } from './spending.js';
import { cardMinimum, payoffMonths, totalInterest, payoffPlan } from './debt.js';
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
  const gates = gatesOf(doc.profile, doc.client);
  const live = visible(doc.records, gates, ref); // gated-out rows count nowhere (R001, R066)
  const filingStatus = doc.profile.filingStatus ?? defaultFilingStatus(gates.couple); // R043
  const income = live.filter(r => r.kind === 'income').map(r => ({ r, ...incomeRow(r, { filingStatus, ref }) }));
  const takeHome = income.length
    ? income.reduce((s, x) => (s === null || x.takeHome.value === null ? null : s + x.takeHome.value), 0)
    : null;
  const grossAnnual = income.some(x => x.gross !== null) ? income.reduce((s, x) => s + (x.gross ?? 0), 0) : null;
  const lines = live.filter(r => r.kind === 'bill').map(r => ({ ...r, ...r.values, amount: read(r, 'amount').v }));
  const allIn = live.find(r => r.kind === 'spending' && r.type === 'All in');
  const lineTotal = lines.length ? lines.reduce((s, l) => s + (myShare(l, { roommates: doc.profile.roommates ?? 0 }).value ?? 0), 0) : null;
  // Spending for the math: the Gut number until the lines are chosen on Budget (R131: the gut is a test kept to compare).
  const useLines = !allIn || (doc.spending?.source ?? 'gut') === 'lines' && lineTotal !== null;
  const spending = useLines ? lineTotal : read(allIn, 'amount').v;
  const debts = live.filter(r => r.kind === 'debt').map(r => {
    const apr = read(r, 'apr', ref.typicalRates[r.type] ?? null);
    const balance = read(r, 'balance').v;
    let payment = read(r, 'payment').v;
    let paymentIsMinimum = false;
    // A card is paid the minimum, a custom amount, or in full (R020). In full carries no interest, and its
    // charges are already in spending, so it adds nothing on top.
    const choice = r.type === 'Credit card' ? r.values.payChoice ?? (payment === null ? 'Minimum' : 'Custom') : null;
    const inFull = choice === 'In full';
    if (inFull) payment = balance;
    else if (r.type === 'Credit card' && (choice === 'Minimum' || payment === null)) { // R036, R037
      const min = cardMinimum({ balance, apr: apr.v });
      payment = min.value; paymentIsMinimum = min.value !== null;
    }
    return { id: r.id, name: r.name ?? r.type, type: r.type, balance, apr: apr.v, aprGuess: !!apr.guess, payment, paymentIsMinimum, inFull, choice, stress: r.stress, linkedTo: r.linkedTo };
  });
  const debtPayments = debts.reduce((s, d) => s + (d.inFull ? 0 : d.payment ?? 0), 0);
  const includesDebt = allIn ? allIn.values.includesDebtPayments !== false : false;
  const accounts = live.filter(r => r.kind === 'account').map(r => ({ id: r.id, name: r.name ?? r.type, group: r.values.group, type: r.type, value: read(r, 'balance').v, unvested: r.values.unvested ?? null }));
  const things = live.filter(r => r.kind === 'asset').map(r => ({ id: r.id, name: r.name ?? r.type, type: r.type, value: read(r, 'value').v }));
  const none = gates.none; // R002: 'None of these' counts as done, with zeros
  const cash = accounts.some(a => a.group === 'cash') ? accounts.filter(a => a.group === 'cash').reduce((s, a) => s + (a.value ?? 0), 0) : none ? 0 : null;
  const invested = accounts.some(a => a.group === 'investment') ? accounts.filter(a => a.group === 'investment').reduce((s, a) => s + (a.value ?? 0), 0) : none ? 0 : null;
  const brokerage = accounts.filter(a => a.type === 'Brokerage').reduce((s, a) => s + (a.value ?? 0), 0);
  const housingLines = lines.filter(l => HOUSING.has(l.category));
  const housing = housingLines.some(l => l.category === 'Rent or mortgage' && l.amount !== null)
    ? housingLines.reduce((s, l) => s + (myShare(l).value ?? 0), 0) : null;
  const a = doc.assumptions;
  return {
    takeHome, spending, lines, debts, accounts, things, cash, invested, brokerage, housing, income, grossAnnual, gates, filingStatus, none,
    debtOrder: doc.settings?.debtOrder ?? 'avalanche',
    debtPaymentsOutsideSpending: spending === null ? null : ((!useLines && includesDebt) || (useLines && lines.some(l => l.draftt === 'Debt')) ? 0 : debtPayments),
    spendingSource: useLines ? 'lines' : 'gut', lineTotal,
    guessLines: lines.filter(l => l.status === 'Not sure' && l.preset).length,
    guessTotal: lines.filter(l => l.status === 'Not sure' && l.preset).reduce((s, l) => s + (myShare(l, { roommates: doc.profile.roommates ?? 0 }).value ?? 0), 0), gutTotal: allIn ? read(allIn, 'amount').v : null,
    age: ageOf(doc.profile, now),
    realReturn: a.realReturn ?? ref.presets.realReturn.default,
    withdrawalRate: a.withdrawalRate ?? ref.presets.withdrawalRate.default,
    inflation: a.inflation ?? ref.presets.inflation.default,
    retireAge: a.fiAge ?? a.retireAge ?? ref.defaults.retireAge, // FI target age if set, else Retire by, else 60
    retirementSpending: a.retirementSpending ?? spending, // R030
    hours: doc.profile.hours ?? {},
    roommates: doc.profile.roommates ?? 0,
  };
}

export function metrics(doc, ref, { now = new Date() } = {}) {
  const x = inputsOf(doc, ref, now);
  const out = { inputs: x };
  out.netWorth = x.none && !x.accounts.length && !x.things.length && !x.debts.length
    ? { id: 'M40', value: 0, needs: [], guess: false, unit: 'money', text: 'None of these: no cash, investments, home, car or debt, so net worth is $0.' }
    : netWorth({ assets: [...x.accounts, ...x.things], debts: x.debts });
  out.liquidNetWorth = liquidNetWorth({ cash: x.cash, brokerage: x.brokerage, consumerDebt: x.debts.filter(d => CONSUMER.has(d.type)).reduce((s, d) => s + (d.balance ?? 0), 0) });
  const floor = x.lines.length ? fixedFloor(x.lines, { roommates: x.roommates }).value : null;
  out.runwayMonths = runway({ cash: x.cash, spending: x.spending, fixedFloor: floor || null });
  out.surplus = monthlySurplus({ takeHome: x.takeHome, spending: x.spending, debtPaymentsOutsideSpending: x.debtPaymentsOutsideSpending ?? 0 });
  out.savingsRate = savingsRate({ takeHome: x.takeHome, surplus: out.surplus.value });
  out.housingPct = housingPct({ housing: x.housing, takeHome: x.takeHome });
  out.supportReceived = supportReceived(x.lines, { roommates: x.roommates });
  const paidInFull = { id: 'M31', value: 1, needs: [], guess: false, unit: 'months', text: 'Paid in full each month: no interest, nothing carried over.' };
  out.debts = x.debts.map(d => (d.inFull ? { ...d, payoff: paidInFull, interest: { id: 'M32', value: 0, needs: [], unit: 'money', text: 'Paid in full each month, so no interest.' } }
    : { ...d, payoff: payoffMonths(d, { from: now }), interest: totalInterest(d) }));
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
  const ds = m.inputs.debts;
  const debtTotal = ds.length ? ds.reduce((s, d) => s + (d.balance ?? 0), 0) : null;
  const debtPayments = ds.some(d => d.payment != null) ? ds.reduce((s, d) => s + (d.payment ?? 0), 0) : null;
  const plan = ds.length ? payoffPlan(ds.filter(d => !d.inFull && d.balance > 0 && d.apr != null && d.payment != null), { order: m.inputs.debtOrder }) : null;
  return { netWorth: m.netWorth.value, liquidNetWorth: m.liquidNetWorth.value, fiNumber: m.fiNumber.value, surplus: m.surplus.value, savingsRate: m.savingsRate.value, debtTotal, debtPayments,
    debtFreeMonths: plan?.months ?? null, debtInterest: plan && plan.months !== null ? Math.round(plan.interest) : null, monthsToFi: m.monthsToFi.value };
}

export const firstDebt = (m, type) => m.debts.find(d => d.type === type) || { payoff: needs('M31', [`a ${type.toLowerCase()}`]), interest: needs('M32', [`a ${type.toLowerCase()}`]) };
