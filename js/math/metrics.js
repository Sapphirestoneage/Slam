// SPDX-License-Identifier: AGPL-3.0-only
// Reads a household's records and works out every headline number with the Math functions.
// One place maps records to formula inputs, so every screen shows the same answer.
import { statusOf } from '../records.js';
import { isBlank, needs } from './result.js';
import { monthlyFrom, incomeRow, defaultFilingStatus, householdTax } from './income.js';
import { fmt } from './result.js';
import { datedChanges } from './changes.js';
import { gatesOf, visible } from '../gates.js';
import { inView, modeOf, MODES, ownerOf, forPerson } from '../registry/couples.js';
import { bigEMultiplierOf } from '../registry/assumptions.js';
import { myShare, withHome, partnerSplits, supportReceived, monthlySurplus, savingsRate, housingPct, fixedFloor, categoryTotals, isCategoryRecord, typicalScaleOf, gutSplitOf } from './spending.js';
import { cardMinimum, payoffMonths, totalInterest, payoffPlan, debtFirstPlan, isHeavyDebt, promoSoonIds, debtFreeCard, heroExtras } from './debt.js';
import { netWorth, liquidNetWorth, runway, ruleOf5 } from './assets.js';
import { link401k, matchFromTiers } from './portfolio.js';
import { fiNumber, fiDate, coastFi, bigDeals } from './fi.js';
import { hourlyRate } from './time.js';
import { debtLines, premiumSources, duplicates, afterTaxContributions } from './linked.js';
import { LISTS, RULES } from '../registry/assumptions.js';
import { FI_RANGE } from '../registry/program.js';
import { cashLayers, layerOptions } from './layers.js';
import { freedFlow, taxFreeRoom } from './flow.js';

const PAYS = { week: 52, '2 weeks': 26, 'twice a month': 24, month: 12 };
const HOUSING = new Set(LISTS.housing);
const CONSUMER = new Set(LISTS.consumerDebt);
// Batch 24 (QUESTIONS 244, 245): a balance marked Roughly or Not sure is rough; the debt-free and FI ranges move it.
const ROUGH = new Set(['Roughly', 'Not sure']);
const roughAt = (r, field) => ROUGH.has(statusOf(r, field));

// A value as the math should see it: Not for me is zero (R058); Not sure with nothing typed is a Guess (R055).
function read(record, field, guessValue = null, { blankIsGuess = false } = {}) {
  const v = field in record && field !== 'values' ? record[field] : record.values?.[field];
  const status = statusOf(record, field);
  if (status === 'Not for me') return { v: 0 };
  if (isBlank(v) && (status === 'Not sure' || blankIsGuess) && guessValue !== null) return { v: guessValue, guess: true };
  return { v: isBlank(v) ? null : v };
}

// Batch 15, item 2: a couple keeping money apart (a mode with a split). A bill both pay (tagged Joint, or Split with
// the partner) is one cost for the couple: the household counts it once, whole; each person's view counts their share
// of it (By income or a typed share, else half). A payment to the partner (Paid to my partner) and money from the
// partner (From partner) move money between the two: each person's view keeps them, the household leaves both out.
export function coupleBills(bills, { person = null, mode, profile, share = 0.5, roommates = 0, now = new Date() }) {
  const together = !person || person === 'all';
  const out = [];
  for (const r of bills) {
    const owner = ownerOf(r, mode);
    if (r.values?.toPartner === 'Yes') { if (!together && owner === person) out.push(r); continue; }
    const amount = read(r, 'amount').v;
    const line = withHome({ ...r, ...r.values, amount }, profile);
    const split = line.whoPays === 'Split' && partnerSplits(profile);
    if (owner !== 'Joint' && !split) { if (together || owner === person) out.push(r); continue; }
    const mineNow = myShare(line, { roommates, now }).value;
    if (mineNow == null) { if (together || owner === person || owner === 'Joint') out.push(r); continue; }
    const p = line.whoPays === 'Split' && line.sharePct != null ? line.sharePct : share; // this client's part of the couple's cost
    const couple = line.whoPays !== 'Split' ? mineNow : line.sharePct != null ? (line.sharePct > 0 ? mineNow / line.sharePct : mineNow) : mineNow * 2;
    const mine = person === 'Partner' ? 1 - p : p;
    const amt = together ? couple : couple * mine;
    out.push({ ...r, owner: 'Joint', amount: amt, per: 'month', coupleShared: { couple, share: together ? 1 : mine },
      values: { ...r.values, whoPays: 'Me', amountIs: null, splitBy: null, sharePct: null, myShare: null, coveredAmount: null, reimbursed: null, takeover: null, startsIn: null, coveredBy: null } });
  }
  return out;
}

export const placeOf = p => (p?.state === 'NY' ? { state: 'NY', nyc: p.nyc === true } : null);
export function ageOf(profile, now = new Date()) {
  if (!isBlank(profile.age)) return profile.age;
  if (isBlank(profile.birthYear)) return null;
  const m = profile.birthMonth ?? 1;
  return now.getFullYear() - profile.birthYear - (now.getMonth() + 1 < m ? 1 : 0);
}

export function inputsOf(doc, ref, now = new Date(), { person = null } = {}) {
  const gates = gatesOf(doc.profile, doc.client);
  const mode = modeOf(doc.profile);
  const liveAll = visible(doc.records, gates, ref); // gated-out rows count nowhere (R001, R066)
  const together = !person || person === 'all';
  const transfer = r => r.kind === 'income' && r.type === 'From partner' && !!MODES[mode]?.couple; // batch 15: money between the two
  const live = liveAll.filter(r => inView(r, person, mode) && !(together && transfer(r))).map(r => forPerson(r, person, mode)); // a person view keeps theirs and the Joint ones at half (F2, answer 157)
  const filingStatus = doc.profile.filingStatus ?? defaultFilingStatus(doc.profile); // answer 174: Single, or Married jointly once the stage is Married; a Guess until typed
  const filingGuess = doc.profile.filingStatus == null;
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
  const income = live.filter(r => r.kind === 'income').map(r => ({ r, ...incomeRow(withLink(r), { filingStatus, ref, place, now }) }));
  // Batch 15, item 1: income tax once per return (one for Married jointly, else one per person), FICA per person.
  // Worked out on every income row of the household (a person's view takes its rows' shares, a Joint row at half).
  // A row given as gross takes home its gross less its share; a row given as take-home keeps what was typed, and the
  // difference between its share and what its paychecks hold back is what is still due (two jobs, a side hustle).
  const hhIncome = liveAll.filter(r => r.kind === 'income').map(r => ({ r, ...incomeRow(withLink(r), { filingStatus, ref, place, now }) }));
  const hh = householdTax(hhIncome.map(i => ({ id: i.r.id, person: ownerOf(i.r, mode) === 'Partner' ? 'Partner' : 'Me', gross: i.benefit ? i.benefit.thisYear : i.gross, pretax: i.pretax, taxType: i.benefit ? 'Unemployment' : i.taxType, tips: i.tipsYear ?? 0 })), { filingStatus, place, year: now.getFullYear() }, ref); // batch 35: reported tips, for the tips deduction
  for (const i of income) {
    const sh = hh.rows[i.r.id];
    if (!sh) continue;
    const k = i.r.halved ? 0.5 : 1;
    const tax = Object.fromEntries(['federal', 'state', 'local', 'fica', 'socialSecurity', 'medicare', 'total'].map(f => [f, sh[f] * k]));
    i.tax = tax;
    if (i.benefit) { i.withheld = i.benefit.withheld; i.due = Math.max(0, tax.total - i.withheld); continue; }
    // Batch 27: the paycheck part is what the tax is worked out on; tips and fees paid in cash ride on top (i.extra).
    const extra = i.extra ?? 0, paid = i.takeHome.value == null ? null : i.takeHome.value - extra;
    if (i.computed === 'takeHome') {
      const v = (i.gross - tax.total - i.pretax - (i.roth ?? 0) - (i.afterTax ?? 0)) / 12;
      if (Math.abs(v * 12 - paid * 12) > 0.5) {
        i.paycheck = v;
        i.takeHome = { ...i.takeHome, value: v + extra, text: `${i.platform ? `${i.platform.text} ` : ''}${fmt.money(i.gross)} ${i.platform ? 'paid out a year' : 'gross'} minus its share of the household's tax (${fmt.money(tax.total)}: federal ${fmt.money(tax.federal)}, FICA ${fmt.money(tax.fica)}${tax.state + tax.local ? `, state and city ${fmt.money(tax.state + tax.local)}` : ''})${i.pretax + (i.roth ?? 0) + (i.afterTax ?? 0) ? ` minus ${fmt.money(i.pretax + (i.roth ?? 0) + (i.afterTax ?? 0))} taken from the paycheck` : ''} = ${fmt.money(v * 12)} a year (${fmt.money(v)} a month)${extra ? `, plus ${fmt.money(extra)} a month in cash tips after the tip-out and fees = ${fmt.money(v + extra)}` : ''}.` };
      }
      i.withheld = i.taxType === '1099' ? 0 : tax.total; // nothing is held back from self-employment pay: it is set aside (quarterly)
    } else i.withheld = i.taxType === '1099' ? 0 : Math.max(0, i.gross - paid * 12 - i.pretax - (i.roth ?? 0) - (i.afterTax ?? 0));
    i.due = Math.max(0, tax.total - i.withheld);
  }
  // F2: shared bills split by income. This client's share of the two take-homes, used as the split when About you says By income and no share is typed.
  const splitShare = (() => {
    if (!mode || !MODES[mode].split || doc.profile.splitMethod !== 'By income') return null;
    const rows = liveAll.filter(r => r.kind === 'income').map(r => ({ who: ownerOf(r, mode), v: incomeRow(withLink(r), { filingStatus, ref, place }).takeHome.value }));
    const me = rows.filter(x => x.who === 'Me').reduce((s, x) => s + (x.v ?? 0), 0), partner = rows.filter(x => x.who === 'Partner').reduce((s, x) => s + (x.v ?? 0), 0);
    return me + partner > 0 ? me / (me + partner) : null;
  })();
  const profile = splitShare != null && doc.profile.splitMine == null ? { ...doc.profile, splitMine: splitShare } : doc.profile;
  const takeHome = income.length
    ? income.reduce((s, x) => (s === null || x.takeHome.value === null ? null : s + x.takeHome.value), 0)
    : null;
  const grossAnnual = income.some(x => x.gross !== null) ? income.reduce((s, x) => s + (x.gross ?? 0), 0) : null;
  // QUESTIONS 228: the Cash flow strip's and the Statements' Gross is every income before tax: a paycheck's gross, a
  // benefit before its withholding, and money that is not taxed (family help, gifts) as it lands, so it never reads
  // below take-home. grossAnnual stays jobs only (the tax rates, the match, the Roth limit read it).
  const grossOfRow = i => { const g = i.benefit ? i.benefit.monthly * 12 : i.gross ?? (!i.taxType && i.takeHome.value != null ? i.takeHome.value * 12 : null); return g === null ? null : g + (i.taxType ? i.grossExtra ?? 0 : 0); }; // batch 27: cash tips not in the paycheck's gross
  const grossAllAnnual = income.some(i => grossOfRow(i) !== null) ? income.reduce((s, i) => s + (grossOfRow(i) ?? 0), 0) : null;
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
    return { id: r.id, name: r.name ?? r.type, type: r.type, balance, balanceRough: balance != null && roughAt(r, 'balance'), apr: apr.v, aprGuess: !!apr.guess, payment, paymentIsMinimum, inFull, choice, stress: r.stress, hassle: r.values.hassle ?? null, linkedTo: r.linkedTo,
      promoEnd: r.values.promoEnd ?? null, forgiven: r.values?.pslf === 'Yes' || r.values?.forgiveness === true || r.values?.forgiveness === 'Yes' };
  }).map(d => { // batch 29: a forgiveness loan with its payments left typed ends there on the one plan (the rest is forgiven)
    const left = live.find(r => r.id === d.id)?.values?.paymentsLeft;
    const rec = live.find(r => r.id === d.id);
    const e = rec?.values?.noRoll ? { ...d, noRoll: true } : d; // a what-if copy's new loan (js/math/truecost.js), never a client's row
    return e.forgiven && Number(left) > 0 ? { ...e, forgiveAt: Math.round(Number(left)) } : e;
  });
  // Enter once, show in both: each debt's payment is a line From Debt; a typed line that looks like a debt payment or
  // a premium already paid asks "Same as your ...?" and is left out only after Yes (js/math/linked.js).
  const payFrequency = income.find(i => i.r.values.payFrequency)?.r.values.payFrequency ?? null;
  const coupleApart = !!(mode && MODES[mode].couple && MODES[mode].split);
  const billRows = coupleApart ? coupleBills(liveAll.filter(r => r.kind === 'bill'), { person, mode, profile, share: profile.splitMine ?? 0.5, roommates: doc.profile.roommates ?? 0, now }) : live.filter(r => r.kind === 'bill');
  const typedLines = billRows.map(r => withHome({ ...r, ...r.values, amount: read(r, 'amount').v }, profile)); // About you › Home fills the blanks; the by-income split when chosen (F2)
  const autoLines = debtLines(debts);
  const premiums = premiumSources(live.filter(r => r.kind === 'coverage'), payFrequency);
  const { dupOf, askOf } = duplicates(typedLines, { debts, autos: autoLines, premiums, payFrequency });
  const lines = [...typedLines.filter(l => !dupOf[l.id]), ...autoLines];
  const allIns = live.filter(r => r.kind === 'spending' && r.type === 'All in');
  const allIn = allIns[0] ?? null;
  // Batch 15, item 2: each person can have their own gut number; a view adds up the ones in it.
  const gutOf = () => (allIns.length > 1 ? (allIns.every(r => read(r, 'amount').v == null) ? null : allIns.reduce((s2, r) => s2 + (read(r, 'amount').v ?? 0), 0)) : allIn ? read(allIn, 'amount').v : null);
  // Answer 125 (batch 2): a line tagged Retirement is investing, not spending. It leaves spending and the FI target and
  // joins what goes into investments each month (and so the savings rate, through a bigger surplus).
  const mine = l => myShare(l, { roommates: doc.profile.roommates ?? 0 }).value ?? 0;
  // Batch 7 (A): the categories carry the spending. A category's amount is what was typed on its row, or its lines'
  // total when that is higher or nothing was typed; the line total is the categories added up (Retirement apart).
  const categories = categoryTotals(live.filter(isCategoryRecord), lines, mine);
  const anyTyped = typedLines.some(l => l.amount != null) || categories.some(c => c.typed != null || c.else?.bucket != null); // batch 10: a faded starter line (no real amount) is not a line yet
  const lineTotal = anyTyped ? categories.filter(c => c.key !== 'Retirement').reduce((s, c) => s + (c.amount ?? 0), 0) : null;
  const retirementLines = categories.find(c => c.key === 'Retirement')?.amount ?? 0;
  // Spending for the math: the Gut number until the lines are chosen on Budget (R131: the gut is a test kept to compare).
  const useLines = !allIn || (doc.spending?.source ?? 'gut') === 'lines' && lineTotal !== null;
  const spending = useLines ? lineTotal : gutOf();
  const debtPayments = debts.reduce((s, d) => s + (d.inFull ? 0 : d.payment ?? 0), 0);
  const includesDebt = allIn ? allIn.values.includesDebtPayments !== false : false;
  const accounts = live.filter(r => r.kind === 'account').map(r => ({ id: r.id, name: r.name ?? r.type, group: r.values.group, type: r.type, value: read(r, 'balance').v, rough: roughAt(r, 'balance'), unvested: r.values.unvested ?? null, ...(r.values.group === 'cash' && r.values.purpose === 'Taxes' ? { forTaxes: true } : {}) }));
  const things = live.filter(r => r.kind === 'asset').map(r => ({ id: r.id, name: r.name ?? r.type, type: r.type, value: read(r, 'value').v }));
  const none = gates.none; // R002: 'None of these' counts as done, with zeros
  // Batch 11 (item 9): an area answered "none" (About you, or a 0 typed in Fast Track) is a real $0, not a missing number.
  // Batch 27: money set aside for quarterly taxes (Purpose: Taxes) is owed, not emergency cash. It stays in net worth and
  // leaves the cash the layers, the runway, the Rule of 5 and the FOO read; taxSetAside shows it on its own.
  const cash = accounts.some(a => a.group === 'cash') ? accounts.filter(a => a.group === 'cash' && !a.forTaxes).reduce((s, a) => s + (a.value ?? 0), 0) : none || gates.areas.cash === false ? 0 : null;
  const taxSetAside = accounts.filter(a => a.forTaxes).reduce((s, a) => s + (a.value ?? 0), 0);
  // Question 214 (batch 15): a 529 or an account set to Purpose: Goal is earmarked money, not FI money. It stays in net
  // worth and leaves the invested balance the FI date grows from (and its contributions leave what goes in).
  const earmarked = a => a.type === '529' || live.find(r => r.id === a.id)?.values?.purpose === 'Goal';
  const invested = accounts.some(a => a.group === 'investment') ? accounts.filter(a => a.group === 'investment' && !earmarked(a)).reduce((s, a) => s + (a.value ?? 0), 0) : none || gates.areas.investments === false ? 0 : null;
  // Batch 15 (item 8 follow-up): a win needs real numbers. Invested is known when every investment balance is typed
  // (or the area is answered none); a blank balance is not known yet, not $0.
  const investedKnown = accounts.some(a => a.group === 'investment') ? accounts.filter(a => a.group === 'investment').every(a => a.value != null) : invested === 0;
  const earmarkedTotal = accounts.filter(a => a.group === 'investment' && earmarked(a)).reduce((s, a) => s + (a.value ?? 0), 0);
  const investedRough = accounts.filter(a => a.group === 'investment' && !earmarked(a) && a.rough).reduce((s, a) => s + (a.value ?? 0), 0); // QUESTIONS 245
  const brokerage = accounts.filter(a => a.type === 'Brokerage').reduce((s, a) => s + (a.value ?? 0), 0);
  const housingLines = lines.filter(l => HOUSING.has(l.category));
  // Batch 13: a homeowner pays the mortgage on Debt (From Debt), not as a Rent or mortgage line, so with no rent line the
  // mortgage payment is the housing cost (plus any utilities lines). The sheet's M2A does the same.
  const rentLine = housingLines.some(l => l.category === 'Rent or mortgage' && l.amount !== null);
  const mortgagePay = debts.filter(d => d.type === 'Mortgage' && d.payment != null).reduce((s, d) => s + d.payment, 0);
  const housing = rentLine || mortgagePay > 0
    ? housingLines.reduce((s, l) => s + (myShare(l, { roommates: doc.profile.roommates ?? 0 }).value ?? 0), 0) + (rentLine ? 0 : mortgagePay) : null;
  // Sinking funds on events: what is still to save, spread over the months left (yearly Budget costs are already spending).
  const ymNow = now.getFullYear() * 12 + now.getMonth();
  const sinkingEnds = []; // batch 23: each set-aside stops at its month, and the surplus has that money back from then on
  const sinkingMonthly = live.filter(r => r.kind === 'event' && r.values.sinking && r.amount != null && r.status !== 'Not for me').reduce((s, r) => {
    const acct = r.values.sinkingFund ? live.find(q => q.id === r.values.sinkingFund) : null;
    const tag = acct && r.values.fundTag ? (acct.values.tags || []).find(t => t.name === r.values.fundTag) : null;
    const saved = tag ? tag.dollars ?? 0 : r.values.saved ?? 0;
    const [y, mo] = /^\d{4}-\d{2}/.test(r.values.month || '') ? r.values.month.split('-').map(Number) : [null, null];
    const months = y ? Math.max(1, y * 12 + mo - 1 - ymNow) : null;
    const each = months ? Math.max(0, r.amount - saved) / months : 0;
    if (each > 0.005) sinkingEnds.push({ id: r.id, kind: 'sinkingEnd', ym: r.values.month.slice(0, 7), at: months, surplus: each, spending: 0, name: r.name || r.type || 'A goal' });
    return months ? s + each : s;
  }, 0);
  const a = doc.assumptions;
  const out = {
    place, link, sinkingMonthly, householdTax: hh, takeHome, spending, lines, debts, accounts, things, cash, invested, brokerage, housing, income, grossAnnual, grossAllAnnual, taxSetAside, gates, filingStatus, filingGuess, none, mode, person, splitShare,
    debtOrder: doc.settings?.debtOrder ?? 'avalanche', debtCustomOrder: doc.settings?.debtCustomOrder ?? [], debtExtra: doc.settings?.debtExtra ?? 0,
    debtPaymentsOutsideSpending: spending === null ? null : ((!useLines && includesDebt) || useLines ? 0 : debtPayments), // the lines hold each payment, From Debt
    typicalScale: typicalScaleOf({ gut: gutOf(), includesDebt, debtPayments, categories, lines: typedLines }), // QUESTIONS 241
    gutSplit: gutSplitOf({ gut: gutOf(), includesDebt, debtPayments, categories, lines: typedLines }), // batch 33: Month end's plan for the gut-only categories
    autoLines, dupOf, askOf, typedLines, premiums, payFrequency, health: health ? { id: health.id, perPaycheck: healthPerPay, fromPay: !!healthFromPay, jobId: healthJob?.id ?? null } : null,
    paycheckPremiums: premiums.filter(p => p.paidFrom === 'Paycheck').reduce((s, p) => s + (p.monthly ?? 0), 0),
    afterTaxSaving: afterTaxContributions(live.filter(r => r.kind === 'account'), { payFrequency, payrollHsa: gates.hsa && income.some(i => (i.r.values.hsaFsa ?? 0) > 0) }).total,
    goalSaving: afterTaxContributions(live.filter(r => r.kind === 'account' && (r.type === '529' || r.values?.purpose === 'Goal')), { payFrequency }).total, earmarked: earmarkedTotal, investedKnown, investedRough,
    // QUESTIONS 244: how far the spending number may be off, for the debt-free range: a gut number 15% (the FI range at
    // Low), a total from statements or Budget lines with a guess among them 5% (Medium), lines all typed 0.
    spendingShare: !useLines ? (allIn?.values?.pass === 'Statements' ? FI_RANGE.Medium : FI_RANGE.Low) : lines.some(l => l.amount != null && ROUGH.has(statusOf(l, 'amount'))) ? FI_RANGE.Medium : 0,
    spendingSource: useLines ? 'lines' : 'gut', lineTotal, retirementLines: useLines ? retirementLines : 0, categories,
    guessLines: lines.filter(l => l.status === 'Not sure' && l.preset).length,
    guessTotal: lines.filter(l => l.status === 'Not sure' && l.preset).reduce((s, l) => s + (myShare(l, { roommates: doc.profile.roommates ?? 0 }).value ?? 0), 0), gutTotal: allIn ? gutOf() : null,
    age: ageOf(doc.profile, now),
    bigEMultiplier: bigEMultiplierOf(doc.profile), // answer 172: Steady 1, Varies 1.25, Unpredictable 1.5, or the coach's number
    realReturn: a.realReturn ?? ref.presets.realReturn.default,
    withdrawalRate: a.withdrawalRate ?? ref.presets.withdrawalRate.default,
    inflation: a.inflation ?? ref.presets.inflation.default,
    retireAge: a.fiAge ?? a.retireAge ?? ref.defaults.retireAge, // FI target age if set, else Retire by, else 65 (answer to 10)
    retirementSpending: a.retirementSpending ?? spending, // R030 (known costs ahead are added in metrics, batch 15)
    hours: doc.profile.hours ?? {},
    roommates: doc.profile.roommates ?? 0,
  };
  // Batch 15, items 6 and 13: known changes ahead (a covered bill that becomes yours, a line that starts on a date,
  // benefits that end). Today's spending leaves them out; the projections and retirement spending put them in.
  out.changes = datedChanges(out, { now });
  // Batch 23: a sinking fund's saving ends at its month, so the FI date and the debt plan see it end. A what-if copy
  // (Can I afford it?, js/math/afford.js) can carry changes of its own in doc.whatIf; a client's file never has one.
  const extraChanges = [...sinkingEnds, ...(Array.isArray(doc.whatIf?.changes) ? doc.whatIf.changes : [])];
  if (extraChanges.length) out.changes = [...out.changes, ...extraChanges].sort((p, q) => p.at - q.at);
  out.laterSpending = out.changes.reduce((s, c) => s + (c.spending ?? 0), 0);
  if (a.retirementSpending == null && spending !== null && out.laterSpending) out.retirementSpending = spending + out.laterSpending;
  return out;
}

export function metrics(doc, ref, { now = new Date(), person = null } = {}) {
  const x = inputsOf(doc, ref, now, { person });
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
  const r5 = ruleOf5({ age: x.age, spending: x.spending, emergencyCash: x.cash, multiplier: x.bigEMultiplier, stability: doc.profile.bigEMultiplier != null ? null : doc.profile.incomeStability ?? null });
  out.ruleOf5 = r5;
  out.fiNumber = fiNumber({ annualSpending: x.retirementSpending === null ? null : x.retirementSpending * 12, withdrawalRate: x.withdrawalRate });
  // Answers 123 to 125 (batch 2, superseding the Nov 3 answer to 11): the surplus is invested unless Invest my surplus is
  // turned off (0 in the spreadsheet). What already goes in counts either way: the 401(k) and HSA from the paycheck and
  // the match. After-tax contributions set on an account and Retirement lines on the Budget are paid out of the surplus,
  // so they count when the surplus sits in checking and are already inside it when it is invested (no double count).
  const investSurplus = !(doc.assumptions?.investSurplus === false || doc.assumptions?.investSurplus === 0);
  const alreadyIn = pretaxSaving + match;
  const goalSaving = x.goalSaving ?? 0; // question 214: paid out of the surplus into a 529 or a goal account, not FI money
  const contributions = (x.afterTaxSaving ?? 0) - goalSaving + (x.retirementLines ?? 0);
  const surplus = out.surplus.value;
  // Batch 11, the debt rule (debtRuleOf): while heavy debt is carried the surplus goes to it first, by default. The
  // one debt plan every screen reads is built here; the FI path invests only what the paycheck already puts in until
  // the heavy debt is gone, then the surplus plus the freed heavy payments (or, with Surplus stays surplus, only the
  // contributions).
  const rule = debtRuleOf(doc, x.debts);
  const toDebt = rule.on && surplus !== null ? Math.max(0, surplus - contributions - goalSaving) : 0;
  const surplusChanges = x.changes.filter(c => c.surplus).map(c => ({ at: c.at, monthly: c.surplus, name: c.name }));
  // Question 217 (follows Eli's "freed money follows the FOO"): FOO step 1 (the buffer and little e) fills from the
  // surplus before heavy debt gets it, so the money matches the step order.
  const lay1 = cashLayers(x, layerOptions(doc, ref, x, now));
  const firstLeft = RULES.freedFollowsFoo ? lay1.layers.filter(l => l.step === 1).reduce((s, l) => s + (l.left ?? 0), 0) : 0;
  const firstMonths = toDebt > 0 && firstLeft > 0.5 ? Math.ceil(firstLeft / toDebt - 1e-9) : 0;
  out.debtPlan = debtFirstPlan(x.debts, { order: x.debtOrder, ids: x.debtCustomOrder, first: promoSoonIds(x.debts, now), surplus: toDebt, extra: x.debtExtra, surplusFrom: firstMonths, changes: rule.on ? surplusChanges : null, inflation: x.inflation });
  out.debtPlanMinimum = rule.on || x.debtExtra ? debtFirstPlan(x.debts, { order: x.debtOrder, ids: x.debtCustomOrder, first: promoSoonIds(x.debts, now) }) : out.debtPlan; // each debt at its own payment only
  out.debtRule = { ...rule, toDebt, toDebtRaw: rule.on && surplus !== null ? surplus - contributions - goalSaving : null, firstLeft, heavyMonths: out.debtPlan.heavyMonths, first: promoSoonIds(x.debts, now), changes: rule.on ? surplusChanges : null };
  for (const d of [...x.debts, ...out.debts]) { const p = out.debtPlan.debts.find(q => q.id === d.id); d.planMonths = d.inFull ? null : p?.paidOffMonth ?? null; d.minimumMonths = d.inFull ? null : out.debtPlanMinimum.debts.find(q => q.id === d.id)?.paidOffMonth ?? null; d.heavy = isHeavyDebt(d); }
  const freed = rule.on ? out.debtPlan.heavyPayments : 0;
  const invested = surplus === null ? null : alreadyIn + surplus - goalSaving + freed; // the surplus invested (and, after the heavy debt, its freed payments), less what goes to a 529 or a goal
  const idle = surplus === null ? null : alreadyIn + contributions; // the surplus sits in checking
  const monthlyInvesting = investSurplus ? invested : idle;
  const H = out.debtPlan.heavyMonths;
  // Batch 12 (M79, RULES.freedFollowsFoo): freed money follows the FOO. After the heavy debt the surplus and the freed
  // payments fill big e (the Rule of 5 target less the cash already in the layers), then Tax-Free Growth (invested),
  // then the rest is invested. Off when Invest from today is picked or the surplus is not invested.
  const flowOn = !!RULES.freedFollowsFoo && rule.wanted && investSurplus && surplus !== null && surplus >= 0; // a gap (M81) comes first
  if (flowOn) {
    const lay = cashLayers(x, layerOptions(doc, ref, x, now));
    const bigELeft = lay.needsAge ? 0 : lay.layers.filter(l => l.id.startsWith('big-e')).reduce((s, l) => s + (l.left ?? 0), 0);
    const room = taxFreeRoom(doc, x, ref, now);
    out.fooFlow = { ...freedFlow({ surplus: Math.max(0, surplus - contributions - goalSaving), heavyMonths: rule.on ? H : 0, freed, bigELeft, taxFreeLeft: room.left, firstMonths: rule.on ? firstMonths : 0, firstLeft, changes: surplusChanges }), room, bigELeft, bigETarget: lay.needsAge ? null : lay.layers.filter(l => l.id.startsWith('big-e')).reduce((s, l) => s + (l.target ?? 0), 0) };
  } else out.fooFlow = null;
  const wait = out.fooFlow ? (out.fooFlow.waitMonths ?? RULES.maxMonths) : rule.on ? (H ?? RULES.maxMonths) : 0;
  const before = surplus !== null && wait > 0 ? { months: wait, monthly: alreadyIn + contributions, heavyMonths: rule.on ? (H ?? RULES.maxMonths) : 0 } : null; // while the surplus pays heavy debt, then fills big e
  const changes = investSurplus && surplus !== null ? surplusChanges : [];
  out.investing = { investSurplus, debtFirst: rule.on, alreadyIn, contributions, surplus: investSurplus ? surplus : 0, monthly: monthlyInvesting, invested, idle, before, freed, followsFoo: !!out.fooFlow, changes };
  const fi = (m$, b = before, ch = changes) => fiDate({ invested: x.invested, monthlyInvesting: m$, realReturn: x.realReturn, target: out.fiNumber.value }, { from: now, before: b, changes: ch });
  out.monthsToFi = fi(monthlyInvesting);
  // The paths, for the FI card: the one in use, with the surplus invested from today, and if it sits in checking.
  out.fiPaths = { invested: fi(surplus === null ? null : alreadyIn + surplus - goalSaving, null, surplusChanges), idle: fi(idle, null, []), debtFirst: rule.heavy ? fi(monthlyInvesting, { months: H ?? RULES.maxMonths, monthly: alreadyIn + contributions }) : null, followsFoo: out.fooFlow ? out.monthsToFi : null };
  if (out.monthsToFi.value === null && !out.monthsToFi.never) { // say what to type, not which result is missing
    const root = [...new Set([...out.surplus.needs, ...out.fiNumber.needs, ...(x.invested === null ? ['invested'] : [])])];
    if (root.length) out.monthsToFi = needs('M53', root, { unit: 'months' });
  }
  out.coastFi = coastFi({ fiNumber: out.fiNumber.value, realReturn: x.realReturn, age: x.age, retireAge: x.retireAge });
  out.bigDeals = bigDeals({ invested: x.invested, monthlyInvesting, annualSpending: x.retirementSpending === null ? null : x.retirementSpending * 12 }, ref, { before, changes });
  out.hourly = hourlyRate({ takeHome: x.takeHome, ...x.hours }, ref);
  out.annualSpending = x.spending === null ? null : x.spending * 12;
  return out;
}

// Cash flow waterfall (reorganize pass): gross, minus taxes, minus before-tax savings, = take-home, minus fixed,
// minus variable, minus savings, = free. Taxes is what is left between gross and take-home once before-tax savings
// are out, so the rows always add up (it holds paycheck premiums too, and says so). Savings are Retirement-letter lines
// plus what x.afterTaxSaving and x.setAside add (after-tax contributions, savings goals, sinking funds).
export function flowOf(x, { pretaxSaving = 0, setAside = 0 } = {}) {
  const gross = (x.grossAllAnnual ?? x.grossAnnual) == null ? null : (x.grossAllAnnual ?? x.grossAnnual) / 12; // every income (QUESTIONS 228)
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
  const spending = x.spending === null ? null : x.spending + debtOut; // the lines already leave Retirement lines out (answer 125); gut: one number
  const savings = saveLines + (x.afterTaxSaving ?? 0) + setAside; // setAside: savings goals and sinking funds (js/payday.js)
  const free = takeHome === null || spending === null ? null : takeHome - spending - savings;
  return { gross, taxes, premiums, beforeTax, takeHome, fixed, variable, spending, savings, free, source: x.spendingSource };
}

// The key numbers a snapshot keeps for 'change since last session' (R167).
export function keyNumbers(m) {
  const ds = m.inputs.debts;
  const debtTotal = ds.length ? ds.reduce((s, d) => s + (d.balance ?? 0), 0) : null;
  const debtPayments = ds.some(d => d.payment != null) ? ds.reduce((s, d) => s + (d.payment ?? 0), 0) : null;
  const plan = ds.length ? m.debtPlan ?? payoffPlan(ds.filter(d => !d.inFull && d.balance > 0 && d.apr != null && d.payment != null), { order: m.inputs.debtOrder }) : null; // the one debt plan (batch 11)
  return { netWorth: m.netWorth.value, liquidNetWorth: m.liquidNetWorth.value, fiNumber: m.fiNumber.value, surplus: m.surplus.value, savingsRate: m.savingsRate.value, debtTotal, debtPayments,
    debtFreeMonths: plan?.months ?? null, debtInterest: plan && plan.months !== null ? Math.round(plan.interest) : null, monthsToFi: m.monthsToFi.value };
}

export const firstDebt = (m, type) => m.debts.find(d => d.type === type) || { payoff: needs('M31', [`a ${type.toLowerCase()}`]), interest: needs('M32', [`a ${type.toLowerCase()}`]) };

// The debt rule (batch 11, RULES.debtFirst): is the surplus going to heavy debt first? On by default while any heavy
// debt (APR at or over RULES.heavyApr, or a heavy type) is carried; a client can turn it off (assumptions.debtFirst 0,
// the toggle on Plan › Goals). With no heavy debt it is off by itself and Invest my surplus takes over.
export function debtRuleOf(doc, debts) {
  const heavy = (debts || []).filter(isHeavyDebt);
  const own = doc.assumptions?.debtFirst;
  const wanted = own == null ? !!RULES.debtFirst : !(own === false || own === 0);
  return { heavy: heavy.length > 0, heavyDebts: heavy.map(d => d.id), wanted, on: wanted && heavy.length > 0, chosen: own != null };
}
// The debt-free card for Home (batch 11, item 3): the one plan, Day 0's debt total as the start, and the what-ifs
// (+$50, +$100, +$250 a month) run on the same plan. A what-if is never saved.
export function debtHeroOf(doc, m) {
  const x = m.inputs;
  if (!m.debtRule?.heavy || !m.debtPlan?.debts.length) return null;
  const day0 = (doc.snapshots || []).find(s => s.day0) ?? null;
  const start = day0 ? (day0.records || []).filter(r => r.kind === 'debt' && r.values?.payChoice !== 'In full').reduce((s, r) => s + (r.values?.balance ?? 0), 0) : null;
  const rerun = extra => debtFirstPlan(x.debts, { order: x.debtOrder, ids: x.debtCustomOrder, first: m.debtRule.first ?? [], surplus: m.debtRule.toDebt, extra: (x.debtExtra ?? 0) + extra, surplusFrom: m.debtPlan?.surplusFrom ?? 0, changes: m.debtRule.changes ?? null });
  const card = debtFreeCard(m.debtPlan, { start, rerun, extras: heroExtras(m.debtPlan) });
  return card && { ...card, short: m.debtPlan.months != null && m.debtPlan.months <= RULES.shortPlanMonths, then: m.fooFlow?.bigEMonths ? { monthly: m.fooFlow.monthly, months: m.fooFlow.bigEEnd, taxFree: m.fooFlow.taxFreeEnd } : null }; // batch 12: what the money does next (M79)
}

// Batch 24 (QUESTIONS 244): the debt-free date as a range when its inputs are rough, by the ranges engine's method
// (docs/engines/ranges.md): the one debt plan run again with each rough input at its low and its high, the rest as
// entered, and the swings combined as the root of the sum of their squares. The rough inputs: a guessed APR (RULES.
// aprGuessSwing points either way), a balance marked Roughly or Not sure (RULES.roughBalanceShare either way) and the
// spending number (x.spendingShare: 15% for a gut number, 5% from statements), which moves what goes to debt each
// month while the surplus pays heavy debt first. A card paid its minimum gets the minimum of the moved balance and APR.
// null when nothing is rough (the date stands as one month) or there is no date. high is null when an end never pays off.
export function debtRangeOf(m) {
  const x = m.inputs, P = m.debtPlan, rule = m.debtRule || {};
  if (!P?.debts?.length || P.months == null) return null;
  const live = d => (d.balance ?? 0) > 0 && !d.inFull;
  const fix = d => (d.paymentIsMinimum ? { ...d, payment: cardMinimum({ balance: d.balance, apr: d.apr }).value ?? d.payment } : d);
  const run = ({ debts = x.debts, toDebt = rule.toDebt ?? 0 } = {}) => {
    const from = toDebt > 0 && (rule.firstLeft ?? 0) > 0.5 ? Math.ceil(rule.firstLeft / toDebt - 1e-9) : 0;
    return debtFirstPlan(debts, { order: x.debtOrder, ids: x.debtCustomOrder, first: rule.first ?? [], surplus: toDebt, extra: x.debtExtra, surplusFrom: from, changes: rule.changes ?? null }).months;
  };
  const base = run();
  const swings = [];
  const guessed = x.debts.filter(d => live(d) && d.aprGuess);
  if (guessed.length) {
    const at = s => x.debts.map(d => (live(d) && d.aprGuess ? fix({ ...d, apr: Math.max(0, d.apr + s) }) : d));
    swings.push({ input: 'apr', label: guessed.length === 1 ? `the ${guessed[0].type === 'Credit card' ? 'card' : guessed[0].name} APR` : 'the APRs', low: run({ debts: at(-RULES.aprGuessSwing) }), high: run({ debts: at(RULES.aprGuessSwing) }) });
  }
  const rough = x.debts.filter(d => live(d) && d.balanceRough);
  if (rough.length) {
    const at = k => x.debts.map(d => (live(d) && d.balanceRough ? fix({ ...d, balance: d.balance * k }) : d));
    swings.push({ input: 'balance', label: rough.length === 1 ? `the ${rough[0].type === 'Credit card' ? 'card' : rough[0].name} balance` : 'the debt balances', low: run({ debts: at(1 - RULES.roughBalanceShare) }), high: run({ debts: at(1 + RULES.roughBalanceShare) }) });
  }
  if (rule.on && rule.toDebtRaw != null && x.spending != null && x.spendingShare) {
    const d$ = x.spending * x.spendingShare;
    swings.push({ input: 'spending', label: 'monthly spending', low: run({ toDebt: Math.max(0, rule.toDebtRaw + d$) }), high: run({ toDebt: Math.max(0, rule.toDebtRaw - d$) }) });
  }
  const moving = swings.filter(s => s.low !== base || s.high !== base);
  if (!moving.length) return null;
  const never = moving.some(s => s.low == null || s.high == null);
  const lows = moving.map(s => Math.min(...[s.low, s.high].filter(v => v != null), base));
  const highs = moving.map(s => Math.max(...[s.low, s.high].filter(v => v != null), base));
  const down = Math.sqrt(lows.reduce((t, v) => t + (base - v) ** 2, 0)), up = Math.sqrt(highs.reduce((t, v) => t + (v - base) ** 2, 0));
  const drivers = moving.map((s, i) => ({ input: s.input, label: s.label, low: s.low, high: s.high, width: s.low == null || s.high == null ? Infinity : highs[i] - lows[i] })).sort((a, b) => b.width - a.width);
  const low = Math.max(0, Math.round(base - down)), high = never ? null : Math.round(base + up);
  const each = drivers.map(d => `${d.label} alone moves it ${d.low ?? 'never'} to ${d.high ?? 'never'} months`).join('; ');
  return { base, low, high, highNever: never, drivers,
    text: `Likely ${base} months. Rough numbers move it: ${each}. Together (the root of the sum of the squares): ${low} to ${high ?? 'never'} months.` };
}
