// Reads a household's records and works out every headline number with the Math functions.
// One place maps records to formula inputs, so every screen shows the same answer.
import { statusOf } from '../records.js';
import { isBlank, needs } from './result.js';
import { monthlyFrom, incomeRow, defaultFilingStatus } from './income.js';
import { gatesOf, visible } from '../gates.js';
import { myShare, supportReceived, monthlySurplus, savingsRate, housingPct, fixedFloor } from './spending.js';
import { cardMinimum, payoffMonths, totalInterest, payoffPlan } from './debt.js';
import { netWorth, liquidNetWorth, runway, ruleOf5 } from './assets.js';
import { link401k, matchFromTiers } from './portfolio.js';
import { fiNumber, fiDate, coastFi, bigDeals } from './fi.js';
import { hourlyRate } from './time.js';
import { debtLines, premiumSources, duplicates, afterTaxContributions } from './linked.js';

const PAYS = { week: 52, '2 weeks': 26, 'twice a month': 24, month: 12 };
const HOUSING = new Set(['Rent or mortgage', 'Electric, gas, water']);
const CONSUMER = new Set(['Credit card', 'Personal loan', 'Buy now, pay later', 'Payday or cash advance', 'Medical', 'Family or friend']);

// A value as the math should see it: Not for me is zero (R058); Not sure with nothing typed is a Guess (R055).
function read(record, field, guessValue = null, { blankIsGuess = false } = {}) {
  const v = field in record && field !== 'values' ? record[field] : record.values?.[field];
  const status = statusOf(record, field);
  if (status === 'Not for me') return { v: 0 };
  if (isBlank(v) && (status === 'Not sure' || blankIsGuess) && guessValue !== null) return { v: guessValue, guess: true };
  return { v: isBlank(v) ? null : v };
}

export const placeOf = p => (p?.state === 'NY' ? { state: 'NY', nyc: p.nyc === true } : null);
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
  const place = placeOf(doc.profile); // B5.1: NY and NYC tax when the Profile says so
  const link = link401k(live); // B3.10: Income and the 401(k) fill each other in
  // Answer to Brandon question 71: the Health coverage row owns the premium. Paid from the paycheck, the job borrows
  // it ("From Health") and it comes out of take-home once; any premium typed on Income is set aside.
  const health = live.find(r => r.kind === 'coverage' && r.type === 'Health' && r.amount != null && r.values.have !== "Don't");
  const healthFromPay = health && (health.values.paidFrom ?? (health.per === 'paycheck' ? 'Paycheck' : null)) === 'Paycheck';
  // Job 1 (the one the 401(k) links to) unless Paid from on the Health row names another job.
  const healthJob = (health?.values.paidFromJob && live.find(r => r.id === health.values.paidFromJob && r.kind === 'income'))
    ?? link.job ?? live.find(r => r.kind === 'income' && ['W-2'].includes(r.values?.incomeType)) ?? null;
  const healthPerPay = !healthFromPay ? 0 : health.per === 'paycheck' ? health.amount : health.amount * 12 / (PAYS[healthJob?.values.payFrequency] ?? 26);
  const withLink = r => {
    let out = r === link.job && r.values.contributionPct == null ? { ...r, values: { ...r.values, contributionPct: link.incomePct, k401Paycheck: link.incomePerPaycheck } } : r;
    const av = link.acct?.values ?? {};
    if (r === link.job && av.taxType === 'Roth') out = { ...out, values: { ...out.values, k401Roth: true } }; // Roth: after tax
    if (r === link.job && av.taxType === 'Both') { // Both: all traditional unless a Roth part is set
      const share = (av.rothSplitBy ?? 'Percent') === 'Amount' ? (av.rothPerPaycheck != null ? { perPaycheck: av.rothPerPaycheck } : null) : (av.rothPct != null ? { pct: av.rothPct } : null);
      if (share) out = { ...out, values: { ...out.values, k401RothShare: share } };
    }
    if (health && r.kind === 'income') out = { ...out, values: { ...out.values, premium: r === healthJob ? healthPerPay : 0 } };
    if (r === link.job) { // Benefits at work, a paycheck (answer to 58)
      const ben = doc.profile?.benefits || {}, n = PAYS[r.values.payFrequency] ?? 26;
      const per = k => (ben[k]?.have === 'Yes' && ben[k].amount != null ? (ben[k].per === 'Year' ? ben[k].amount / n : ben[k].amount) : 0);
      const pre = per('commuter') + per('healthFsa') + per('dependentFsa'), after = per('espp') + per('afterTax401k');
      if (pre || after) out = { ...out, values: { ...out.values, benefitPretax: pre, benefitAfterTax: after } };
    }
    return out;
  };
  const income = live.filter(r => r.kind === 'income').map(r => ({ r, ...incomeRow(withLink(r), { filingStatus, ref, place }) }));
  const takeHome = income.length
    ? income.reduce((s, x) => (s === null || x.takeHome.value === null ? null : s + x.takeHome.value), 0)
    : null;
  const grossAnnual = income.some(x => x.gross !== null) ? income.reduce((s, x) => s + (x.gross ?? 0), 0) : null;
  const debts = live.filter(r => r.kind === 'debt').map(r => {
    // A blank APR is a Guess until it is typed (answer to the APR question), not only when marked Not sure.
    const apr = read(r, 'apr', ref.typicalRates[r.type] ?? null, { blankIsGuess: true });
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
  // Enter once, show in both: each debt's payment is a line From Debt; a typed line that looks like a debt payment or
  // a premium already paid asks "Same as your ...?" and is left out only after Yes (js/math/linked.js).
  const payFrequency = income.find(i => i.r.values.payFrequency)?.r.values.payFrequency ?? null;
  const typedLines = live.filter(r => r.kind === 'bill').map(r => ({ ...r, ...r.values, amount: read(r, 'amount').v }));
  const autoLines = debtLines(debts);
  const premiums = premiumSources(live.filter(r => r.kind === 'coverage'), payFrequency);
  const { dupOf, askOf } = duplicates(typedLines, { debts, autos: autoLines, premiums, payFrequency });
  const lines = [...typedLines.filter(l => !dupOf[l.id]), ...autoLines];
  const allIn = live.find(r => r.kind === 'spending' && r.type === 'All in');
  const lineTotal = typedLines.length ? lines.reduce((s, l) => s + (myShare(l, { roommates: doc.profile.roommates ?? 0 }).value ?? 0), 0) : null;
  // Spending for the math: the Gut number until the lines are chosen on Budget (R131: the gut is a test kept to compare).
  const useLines = !allIn || (doc.spending?.source ?? 'gut') === 'lines' && lineTotal !== null;
  const spending = useLines ? lineTotal : read(allIn, 'amount').v;
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
  // Sinking funds on events: what is still to save, spread over the months left (yearly Budget costs are already spending).
  const ymNow = now.getFullYear() * 12 + now.getMonth();
  const sinkingMonthly = live.filter(r => r.kind === 'event' && r.values.sinking && r.amount != null && r.status !== 'Not for me').reduce((s, r) => {
    const acct = r.values.sinkingFund ? live.find(q => q.id === r.values.sinkingFund) : null;
    const tag = acct && r.values.fundTag ? (acct.values.tags || []).find(t => t.name === r.values.fundTag) : null;
    const saved = tag ? tag.dollars ?? 0 : r.values.saved ?? 0;
    const [y, mo] = /^\d{4}-\d{2}/.test(r.values.month || '') ? r.values.month.split('-').map(Number) : [null, null];
    const months = y ? Math.max(1, y * 12 + mo - 1 - ymNow) : null;
    return months ? s + Math.max(0, r.amount - saved) / months : s;
  }, 0);
  const a = doc.assumptions;
  return {
    place, link, sinkingMonthly, takeHome, spending, lines, debts, accounts, things, cash, invested, brokerage, housing, income, grossAnnual, gates, filingStatus, none,
    debtOrder: doc.settings?.debtOrder ?? 'avalanche',
    debtPaymentsOutsideSpending: spending === null ? null : ((!useLines && includesDebt) || useLines ? 0 : debtPayments), // the lines hold each payment, From Debt
    autoLines, dupOf, askOf, typedLines, premiums, payFrequency, health: health ? { id: health.id, perPaycheck: healthPerPay, fromPay: !!healthFromPay, jobId: healthJob?.id ?? null } : null,
    paycheckPremiums: premiums.filter(p => p.paidFrom === 'Paycheck').reduce((s, p) => s + (p.monthly ?? 0), 0),
    afterTaxSaving: afterTaxContributions(live.filter(r => r.kind === 'account'), { payFrequency, payrollHsa: gates.hsa && income.some(i => (i.r.values.hsaFsa ?? 0) > 0) }).total,
    spendingSource: useLines ? 'lines' : 'gut', lineTotal,
    guessLines: lines.filter(l => l.status === 'Not sure' && l.preset).length,
    guessTotal: lines.filter(l => l.status === 'Not sure' && l.preset).reduce((s, l) => s + (myShare(l, { roommates: doc.profile.roommates ?? 0 }).value ?? 0), 0), gutTotal: allIn ? read(allIn, 'amount').v : null,
    age: ageOf(doc.profile, now),
    realReturn: a.realReturn ?? ref.presets.realReturn.default,
    withdrawalRate: a.withdrawalRate ?? ref.presets.withdrawalRate.default,
    inflation: a.inflation ?? ref.presets.inflation.default,
    retireAge: a.fiAge ?? a.retireAge ?? ref.defaults.retireAge, // FI target age if set, else Retire by, else 65 (answer to 10)
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
  out.surplus = monthlySurplus({ takeHome: x.takeHome, spending: x.spending, debtPaymentsOutsideSpending: x.debtPaymentsOutsideSpending ?? 0, sinkingFunds: x.sinkingMonthly });
  // B6.9: money into the 401(k) and HSA from the paycheck is saving, not spending; premiums and commuter money are spending.
  const pretaxSaving = x.income.reduce((s, i) => {
    const v = i.r.values, n = PAYS[v.payFrequency] ?? 26, own = i.r === x.link.job;
    const pct = v.contributionPct ?? (own ? x.link.incomePct : null) ?? 0;
    const perPay = (v.contributionPct == null && own ? x.link.incomePerPaycheck ?? 0 : 0) + (x.gates.hsa ? v.hsaFsa ?? 0 : 0);
    return s + ((i.gross ?? 0) * pct + perPay * n) / 12;
  }, 0);
  // The employer match on the 401(k), a month (tiers from Income or the 401(k), whichever has them).
  const job = x.income.find(i => i.r === x.link.job);
  const jobGross = job?.gross ?? null, n = PAYS[job?.r.values.payFrequency] ?? 26;
  const pctIn = x.link.incomePct ?? (x.link.incomePerPaycheck != null && jobGross ? x.link.incomePerPaycheck * n / jobGross : null);
  const mt = job ? matchFromTiers({ contributionPct: pctIn, tiers: x.link.incomeTiers, gross: jobGross }) : null;
  const match = mt ? mt.dollars / 12 : 0;
  out.savingsRate = savingsRate({ takeHome: x.takeHome, surplus: out.surplus.value, pretaxSaving, match });
  out.pretaxSaving = pretaxSaving;
  out.flow = flowOf(x, { pretaxSaving });
  out.housingPct = housingPct({ housing: x.housing, takeHome: x.takeHome });
  out.supportReceived = supportReceived(x.lines, { roommates: x.roommates });
  const paidInFull = { id: 'M31', value: 1, needs: [], guess: false, unit: 'months', text: 'Paid in full each month: no interest, nothing carried over.' };
  out.debts = x.debts.map(d => (d.inFull ? { ...d, payoff: paidInFull, interest: { id: 'M32', value: 0, needs: [], unit: 'money', text: 'Paid in full each month, so no interest.' } }
    : { ...d, payoff: payoffMonths(d, { from: now }), interest: totalInterest(d) }));
  const r5 = ruleOf5({ age: x.age, spending: x.spending, emergencyCash: x.cash });
  out.ruleOf5 = r5;
  out.fiNumber = fiNumber({ annualSpending: x.retirementSpending === null ? null : x.retirementSpending * 12, withdrawalRate: x.withdrawalRate });
  // Answer to 11: the surplus stays surplus until you choose Invest my surplus. What already goes in counts either way:
  // the 401(k) and HSA from the paycheck and the match; after-tax contributions count unless the surplus (which pays them) is invested.
  const investSurplus = doc.assumptions?.investSurplus === true;
  const alreadyIn = pretaxSaving + match;
  const monthlyInvesting = out.surplus.value === null && !alreadyIn ? null
    : alreadyIn + (investSurplus ? out.surplus.value ?? 0 : x.afterTaxSaving ?? 0);
  out.investing = { investSurplus, alreadyIn, afterTax: investSurplus ? 0 : x.afterTaxSaving ?? 0, surplus: investSurplus ? out.surplus.value : 0, monthly: monthlyInvesting };
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

// Cash flow waterfall (reorganize pass): gross, minus taxes, minus before-tax savings, = take-home, minus fixed,
// minus variable, minus savings, = free. Taxes is what is left between gross and take-home once before-tax savings
// are out, so the rows always add up (it holds paycheck premiums too, and says so). Savings are Retirement-letter lines
// plus what x.afterTaxSaving and x.setAside add (after-tax contributions, savings goals, sinking funds).
export function flowOf(x, { pretaxSaving = 0, setAside = 0 } = {}) {
  const gross = x.grossAnnual === null ? null : x.grossAnnual / 12;
  const beforeTax = pretaxSaving || 0;
  const takeHome = x.takeHome;
  const premiums = x.paycheckPremiums ?? 0;
  const taxes = gross === null || takeHome === null ? null : Math.max(0, gross - beforeTax - takeHome);
  const mine = l => myShare(l, { roommates: x.roommates }).value ?? 0;
  const lines = x.spendingSource === 'lines' ? x.lines : [];
  const saveLines = lines.filter(l => l.draftt === 'Retirement').reduce((s, l) => s + mine(l), 0);
  const debtOut = x.debtPaymentsOutsideSpending ?? 0;
  let fixed = null, variable = null;
  if (x.spendingSource === 'lines' && x.spending !== null) {
    const rest = lines.filter(l => l.draftt !== 'Retirement');
    fixed = rest.filter(l => l.amountType === 'Fixed').reduce((s, l) => s + mine(l), 0) + debtOut;
    variable = rest.filter(l => l.amountType !== 'Fixed').reduce((s, l) => s + mine(l), 0);
  }
  const spending = x.spending === null ? null : x.spending + debtOut - saveLines; // gut: one number
  const savings = saveLines + (x.afterTaxSaving ?? 0) + setAside; // setAside: savings goals and sinking funds (js/payday.js)
  const free = takeHome === null || spending === null ? null : takeHome - spending - savings;
  return { gross, taxes, premiums, beforeTax, takeHome, fixed, variable, spending, savings, free, source: x.spendingSource };
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
