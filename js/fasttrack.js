// Fast Track (X011, R068, R132): the Basics pass in about 5 minutes, totals by area rather than line items.
// Writes into the same records the full screens use, as one undo step, so every lens turns on and the coach can
// keep going in full detail from there. Pure: no DOM.
import { LOAN_FOR } from './gates.js';

export const FT_DEBTS = [['Credit card', 'Credit cards'], ['Student loan', 'Student loans'], ['Personal loan', 'Other debts']];
const has = v => v !== null && v !== undefined && v !== '';

// What is already on file, so running Fast Track again starts from it.
export function fastTrackAnswers(doc) {
  const p = doc.profile || {};
  const recs = doc.records;
  const one = pred => recs.find(pred) || null;
  const income = one(r => r.kind === 'income');
  const gut = one(r => r.kind === 'spending' && r.type === 'All in');
  const bal = type => one(r => r.kind === 'account' && r.type === type)?.values.balance ?? null;
  const invested = recs.filter(r => r.kind === 'account' && r.values.group === 'investment');
  const home = one(r => r.kind === 'asset' && r.type === 'Home');
  const car = one(r => r.kind === 'asset' && r.type === 'Car');
  const loan = a => (a ? one(r => r.kind === 'debt' && r.linkedTo === a.id) : null);
  const debts = {};
  for (const [t] of FT_DEBTS) {
    const rows = recs.filter(r => r.kind === 'debt' && (t === 'Personal loan' ? !['Credit card', 'Student loan', 'Car loan', 'Mortgage'].includes(r.type) : r.type === t));
    debts[t] = rows.length ? { balance: rows.reduce((s, r) => s + (r.values.balance ?? 0), 0), payment: rows.some(r => r.values.payment != null) ? rows.reduce((s, r) => s + (r.values.payment ?? 0), 0) : null, rows: rows.length } : { balance: null, payment: null, rows: 0 };
  }
  return {
    firstName: p.firstName ?? doc.client?.name ?? null, birthMonth: p.birthMonth ?? null, birthYear: p.birthYear ?? null, household: p.household ?? (doc.client?.couple ? 'Couple' : null),
    takeHome: income?.values.basis === 'Gross' ? null : income?.amount ?? null, takePer: income?.per ?? 'month', payFrequency: income?.values.payFrequency ?? null,
    gut: gut?.amount ?? null, gutIncludesDebt: gut ? gut.values.includesDebtPayments !== false : true,
    checking: bal('Checking'), savings: bal('Savings or HYSA'),
    invested: invested.length ? invested.reduce((s, r) => s + (r.values.balance ?? 0), 0) : null, investedRows: invested.length,
    housing: p.housing ?? null, homeValue: home?.values.value ?? null, mortgageBalance: loan(home)?.values.balance ?? null, mortgagePayment: loan(home)?.values.payment ?? null,
    hasCar: p.hasCar ?? (car ? true : null), carValue: car?.values.value ?? null, carLoanBalance: loan(car)?.values.balance ?? null, carLoanPayment: loan(car)?.values.payment ?? null,
    debts, noDebts: p.areas?.debt === false,
    fiAge: doc.assumptions?.fiAge ?? null,
  };
}

export function applyFastTrack(store, a, { seconds = null, now = new Date().toISOString() } = {}) {
  const recs = () => store.doc.records;
  const find = pred => recs().find(pred) || null;
  const put = (pred, kind, type, fields) => {
    const r = find(pred);
    if (r) { const { values = {}, ...top } = fields; store.update(r.id, { ...top, ...values }); return r; }
    return store.add(kind, fields, { type });
  };
  return store.transaction('Fast Track', () => {
    // About you
    const prof = {};
    if (has(a.firstName)) prof.firstName = a.firstName;
    if (has(a.birthMonth)) prof.birthMonth = a.birthMonth;
    if (has(a.birthYear)) prof.birthYear = a.birthYear;
    if (has(a.household)) { prof.household = a.household; store.setDoc('client', { couple: a.household === 'Couple' }); }
    if (has(a.housing)) prof.housing = a.housing;
    if (a.hasCar === true || a.hasCar === false) prof.hasCar = a.hasCar;

    // Take-home (F019, F020)
    if (has(a.takeHome)) put(r => r.kind === 'income', 'income', 'Job', { name: find(r => r.kind === 'income')?.name ?? 'Take-home pay', amount: a.takeHome, per: a.takePer || 'month', values: { basis: 'Take-home', payFrequency: a.payFrequency ?? null } });
    // Gut spending (F043): one all-in number, kept to compare later (R131)
    if (has(a.gut)) put(r => r.kind === 'spending' && r.type === 'All in', 'spending', 'All in', { name: 'Monthly spending, all in', amount: a.gut, status: 'Roughly', values: { includesDebtPayments: a.gutIncludesDebt !== false, pass: 'Gut' } });

    // Cash (F184, F185)
    if (has(a.checking)) put(r => r.kind === 'account' && r.type === 'Checking', 'account', 'Checking', { name: find(r => r.kind === 'account' && r.type === 'Checking')?.name ?? 'Checking', values: { group: 'cash', balance: a.checking } });
    if (has(a.savings)) put(r => r.kind === 'account' && r.type === 'Savings or HYSA', 'account', 'Savings or HYSA', { name: find(r => r.kind === 'account' && r.type === 'Savings or HYSA')?.name ?? 'Savings', values: { group: 'cash', balance: a.savings } });
    // Investments (F189, F190): one total, unless the accounts are already listed one by one
    if (has(a.invested)) {
      const rows = recs().filter(r => r.kind === 'account' && r.values.group === 'investment');
      if (rows.length <= 1) put(r => r.kind === 'account' && r.values.group === 'investment', 'account', 'All investments', { name: rows[0]?.name ?? 'Investments (all accounts)', status: rows[0] ? rows[0].status : 'Roughly', values: { group: 'investment', balance: a.invested } });
    }
    // Home and car (F202, F204), each with its loan on the same record as Debt (R049)
    const thing = (type, value, loanBal, loanPay) => {
      if (!has(value) && !has(loanBal)) return;
      const asset = put(r => r.kind === 'asset' && r.type === type, 'asset', type, { name: find(r => r.kind === 'asset' && r.type === type)?.name ?? type, values: { value: value ?? null } });
      if (has(loanBal) || has(loanPay)) {
        put(r => r.kind === 'debt' && r.linkedTo === asset.id, 'debt', LOAN_FOR[type], { name: find(r => r.kind === 'debt' && r.linkedTo === asset.id)?.name ?? `${type} loan`, linkedTo: asset.id, values: { balance: loanBal ?? null, payment: loanPay ?? null } });
        store.update(asset.id, { financed: 'Financed' });
      }
    };
    if (a.housing === 'Own') thing('Home', a.homeValue, a.mortgageBalance, a.mortgagePayment);
    if (a.hasCar) thing('Car', a.carValue, a.carLoanBalance, a.carLoanPayment);
    // Debts by type, as totals (R132). A type already listed row by row is left alone.
    for (const [type, label] of FT_DEBTS) {
      const d = a.debts?.[type];
      if (!d || (!has(d.balance) && !has(d.payment))) continue;
      const rows = recs().filter(r => r.kind === 'debt' && r.type === type);
      if (rows.length > 1) continue;
      const r = put(x => x.kind === 'debt' && x.type === type, 'debt', type, { name: rows[0]?.name ?? `${label} (total)`, values: { balance: d.balance ?? null, payment: d.payment ?? null } });
      if (r.values.apr == null && !r.fieldStatus.apr) store.setFieldStatus(r.id, 'apr', 'Not sure'); // a typical rate fills in, marked Guess (R055)
    }
    // Which areas they have (R001): from what was given; a skipped step leaves its area unanswered
    const areas = { ...(store.doc.profile.areas || {}) };
    if (has(a.checking) || has(a.savings)) areas.cash = (a.checking ?? 0) + (a.savings ?? 0) > 0 || areas.cash === true;
    if (has(a.invested)) areas.investments = a.invested > 0 || areas.investments === true;
    if (a.hasCar === true || a.housing === 'Own') areas.real = true; else if (a.hasCar === false && has(a.housing)) areas.real = areas.real === true;
    const anyDebt = FT_DEBTS.some(([t]) => has(a.debts?.[t]?.balance) && a.debts[t].balance > 0) || has(a.carLoanBalance) || has(a.mortgageBalance);
    if (a.noDebts) areas.debt = anyDebt; else if (anyDebt) areas.debt = true;
    prof.areas = areas;
    store.setDoc('profile', prof);
    // FI age or 'just show me' (F214)
    if (has(a.fiAge)) store.setDoc('assumptions', { fiAge: a.fiAge });
    store.setDoc('settings', { fastTrack: { at: now, seconds } });
  });
}
