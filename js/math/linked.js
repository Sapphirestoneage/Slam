// Enter once, show in both (reorganize pass item 2). An item that is a balance and a flow is typed in one place
// and shows on both tabs: a debt's payment becomes a Cash flow line "From Debt"; a premium taken from the
// paycheck is already out of take-home; a contribution to an account is savings in the waterfall.
// A typed Budget line that looks like one of these is flagged once ("Looks like the same payment: keep one")
// and left out of every total until someone picks. Pure: no DOM, so Node tests drive it.
import { monthlyFrom } from './income.js';

const STOP = new Set(['payment', 'payments', 'loan', 'loans', 'the', 'my', 'and', 'bill', 'bills', 'monthly', 'month', 'for', 'not', 'through',
  'work', 'insurance', 'premium', 'premiums', 'plan', 'from', 'with', 'fees', 'fee']);
const words = (...t) => new Set(t.filter(Boolean).join(' ').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !STOP.has(w)));
const shares = (a, b) => [...a].some(w => b.has(w));
const near = (a, b) => a != null && b != null && Math.abs(a - b) < 1;
const COVER_WORDS = { 'Renters or home': ['renters', 'home', 'homeowners'], Car: ['car', 'auto'] };

export const autoId = sourceId => `auto:${sourceId}`;
export const isAuto = r => typeof r?.id === 'string' && r.id.startsWith('auto:');

// debts: from inputsOf (name, type, payment, inFull, balance). Returns lines shaped like spending lines.
export function debtLines(debts) {
  return debts.filter(d => !d.inFull && d.payment > 0 && d.balance !== 0).map(d => ({
    id: autoId(d.id), kind: 'bill', auto: { from: 'Debt', sourceId: d.id, route: '#/net-worth/debt' },
    name: `${d.name} payment`, amount: d.payment, per: 'month', status: null,
    draftt: 'Debt', amountType: 'Fixed', timing: 'Fixed date', category: 'Debt payments',
    values: { draftt: 'Debt', amountType: 'Fixed', timing: 'Fixed date', category: 'Debt payments' } }));
}

// Premiums paid from the paycheck (already out of take-home) and premiums with their own linked Budget line.
export const paidFromOf = r => r.values?.paidFrom ?? (r.per === 'paycheck' ? 'Paycheck' : null);
export function premiumSources(coverages, payFrequency = null) {
  return coverages.filter(c => c.amount != null && c.values?.have !== "Don't").map(c => ({
    sourceId: c.id, from: c.type, type: c.type, route: '#/net-worth/protection', paidFrom: paidFromOf(c),
    monthly: c.per === 'paycheck' ? monthlyFrom(c.amount, 'paycheck', payFrequency).value : c.amount }));
}

// lines: typed spending lines (name, category, draftt, amount, per, status, linkedTo, values.notSame).
// Returns { dupOf: { lineId: { sourceId, from, name } } }: each flagged line counts as $0 until someone picks.
export function duplicates(lines, { debts = [], autos = [], premiums = [], payFrequency = null } = {}) {
  const dupOf = {};
  const monthly = l => (l.amount == null ? null : monthlyFrom(l.amount, l.per, payFrequency).value);
  for (const l of lines) {
    if (l.status === 'Not for me' || l.irregular || isAuto(l)) continue;
    // Its own linked line, while the coverage now says the paycheck pays it: out of take-home already.
    const own = premiums.find(p => l.linkedTo === p.sourceId && p.paidFrom === 'Paycheck');
    if (own) { dupOf[l.id] = { sourceId: own.sourceId, from: own.from, name: own.from }; continue; }
    const notSame = new Set(l.notSame ?? l.values?.notSame ?? []);
    const lw = words(l.name, l.category);
    const text = `${l.name ?? ''} ${l.category ?? ''}`;
    // A debt payment typed as a line: the Debt letter, or a payment-sounding name that shares a word or the amount.
    const debtLike = l.draftt === 'Debt' || /payment|loan|mortgage/i.test(text);
    if (debtLike) {
      const hit = autos.find(a => !notSame.has(a.auto.sourceId) && (shares(lw, words(a.name, debts.find(d => d.id === a.auto.sourceId)?.type)) || near(monthly(l), a.amount)))
        ?? (l.draftt === 'Debt' ? autos.find(a => !notSame.has(a.auto.sourceId)) : null); // the Debt letter is the debts, now on Debt
      if (hit) { dupOf[l.id] = { sourceId: hit.auto.sourceId, from: 'Debt', name: hit.name.replace(/ payment$/, '') }; continue; }
    }
    // A premium typed as a line while the coverage already pays it (from the paycheck, or its own linked line).
    if (/insurance|premium/i.test(text)) {
      const hit = premiums.find(p => !notSame.has(p.sourceId) && l.linkedTo !== p.sourceId && (p.paidFrom === 'Paycheck' || lines.some(x => x.linkedTo === p.sourceId))
        && (shares(lw, new Set([p.type.toLowerCase(), ...(COVER_WORDS[p.type] || [])])) || near(monthly(l), p.monthly)));
      if (hit) dupOf[l.id] = { sourceId: hit.sourceId, from: hit.from, name: hit.from };
    }
  }
  return { dupOf };
}

// After-tax savings into accounts (IRA, Roth IRA, brokerage, 529, an HSA paid on its own), a month. 401(k)-type
// accounts and an HSA paid through the paycheck are before-tax savings, already counted from Income.
const PAYROLL = new Set(['401(k)', '403(b)', '457', 'TSP', 'Solo 401(k)']);
const PAYS = { week: 52, '2 weeks': 26, 'twice a month': 24, month: 12 };
export function afterTaxContributions(accounts, { payFrequency = null, payrollHsa = false } = {}) {
  const parts = accounts.filter(a => a.values?.group === 'investment' && a.values.contribution != null && !PAYROLL.has(a.type) && !(a.type === 'HSA' && payrollHsa))
    .map(a => ({ id: a.id, name: a.name || a.type, monthly: (a.values.contributionPer === 'Paycheck' ? a.values.contribution * (PAYS[payFrequency] ?? 26) : a.values.contribution) / 12 }));
  return { total: parts.reduce((s, p) => s + p.monthly, 0), parts };
}
