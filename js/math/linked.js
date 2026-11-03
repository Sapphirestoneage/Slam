// Enter once, show in both (reorganize pass item 2). An item that is a balance and a flow is typed in one place
// and shows on both tabs: a debt's payment becomes a Cash flow line "From Debt"; a premium taken from the
// paycheck is already out of take-home; a contribution to an account is savings in the waterfall.
// A typed Budget line that looks like one of these asks once ("Same as your Car loan? Yes / No"); only Yes
// leaves it out of the totals. Pure: no DOM, so Node tests drive it.
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

// lines: typed spending lines (name, draftt, amount, per, status, linkedTo, values.sameAs, values.notSame).
// Evidence is the line's own name, never its group's (a payment, loan, mortgage, insurance or premium word plus a word
// shared with the debt or coverage), an exact amount match, or sitting in the Debt group. Nothing merges silently:
// a match is a question ("Same as your Car loan?") in askOf; only a Yes (values.sameAs) leaves the line out, in dupOf.
// A premium's own linked line, once the coverage says the paycheck pays it, is the same item by construction: dupOf.
export function duplicates(lines, { debts = [], autos = [], premiums = [], payFrequency = null } = {}) {
  const dupOf = {}, askOf = {};
  const monthly = l => (l.amount == null ? null : monthlyFrom(l.amount, l.per, payFrequency).value);
  const exact = (a, b) => a != null && b != null && Math.abs(a - b) < 0.005;
  const sources = [
    ...autos.map(a => ({ sourceId: a.auto.sourceId, from: 'Debt', name: a.name.replace(/ payment$/, ''), amount: a.amount, debt: true,
      words: words(a.name, debts.find(d => d.id === a.auto.sourceId)?.type) })),
    ...premiums.filter(p => p.paidFrom === 'Paycheck' || lines.some(x => x.linkedTo === p.sourceId))
      .map(p => ({ sourceId: p.sourceId, from: p.from, name: p.from, amount: p.monthly, debt: false, words: new Set([p.type.toLowerCase(), ...(COVER_WORDS[p.type] || [])]) })),
  ];
  for (const l of lines) {
    if (l.status === 'Not for me' || l.irregular || isAuto(l)) continue;
    const own = premiums.find(p => l.linkedTo === p.sourceId && p.paidFrom === 'Paycheck');
    if (own) { dupOf[l.id] = { sourceId: own.sourceId, from: own.from, name: own.from, own: true }; continue; }
    const sameAs = l.sameAs ?? l.values?.sameAs ?? null;
    const confirmed = sameAs && sources.find(x => x.sourceId === sameAs);
    if (confirmed) { dupOf[l.id] = { sourceId: confirmed.sourceId, from: confirmed.from, name: confirmed.name }; continue; }
    const notSame = new Set(l.notSame ?? l.values?.notSame ?? []);
    const open = sources.filter(x => !notSame.has(x.sourceId) && l.linkedTo !== x.sourceId);
    const lw = words(l.name);
    const name = l.name ?? '';
    const byName = x => (x.debt ? /payment|loan|mortgage/i : /insurance|premium/i).test(name) && shares(lw, x.words);
    const hit = open.find(byName) ?? open.find(x => exact(monthly(l), x.amount))
      ?? (l.draftt === 'Debt' ? open.find(x => x.debt) : null); // sitting in the Debt group still counts
    if (hit) askOf[l.id] = { sourceId: hit.sourceId, from: hit.from, name: hit.name };
  }
  return { dupOf, askOf };
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
