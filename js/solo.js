// SPDX-License-Identifier: AGPL-3.0-only
// The standalone pages (js/solo): one easy thing each, done right, with the answers carried to the next page in a link.
// This file is the pure part: the order of the pages, and what each one works out from the household file. The payoff
// itself is the engine's own (js/math/debt.js payoffPlan, M34), so a standalone and the full plan can never disagree.
import { payoffPlan, cardMinimum } from './math/debt.js';

// The path: each page names the next. The last one is the whole plan (start.html), which opens a carried link.
export const SOLO = [
  { id: 'debt', page: 'debt.html', title: 'When am I debt free?', next: 'plan', nextLabel: 'See when work becomes optional' },
  { id: 'plan', page: 'start.html', title: 'Your whole plan', next: null },
];
export const soloOf = id => SOLO.find(s => s.id === id) ?? null;
// Where a carried link opens: the whole plan takes #/open/, a standalone takes #/d/.
export const carryUrl = (id, packed) => { const s = soloOf(id); return s ? `${s.page}${id === 'plan' ? '#/open/' : '#/d/'}${packed}` : null; };

const monthLabel = (k, now) => { const d = new Date(now.getFullYear(), now.getMonth() + k, 1); return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]} ${d.getFullYear()}`; };
// A level payment that clears a loan in ten years: the stand-in when a loan's payment is not given yet.
const tenYear = (balance, apr) => { const r = apr / 12; return r > 0 ? balance * r / (1 - (1 + r) ** -120) : balance / 120; };

export const EXTRAS = [0, 50, 100, 250, 500], ORDERS = [['avalanche', 'Highest rate first', 'Costs the least interest'], ['snowball', 'Smallest balance first', 'The first one is gone soonest']];
// Debt free by: every debt on file with something owed, paid in the chosen order with the extra on top.
// A rate marked "Not sure" (or left blank) takes the typical rate for its kind (ref.typicalRates); a missing payment takes
// the card minimum, or a ten-year payment on a loan. Both are named in `standIns` so the page can say so.
export function debtFreeOf(doc, ref, { extra = 0, order = 'avalanche', now = new Date() } = {}) {
  const rows = (doc.records || []).filter(r => r.kind === 'debt' && (r.values?.balance ?? 0) > 0);
  if (!rows.length) return { ready: false, count: 0, total: 0 };
  const standIns = [];
  const debts = rows.map(r => {
    const balance = r.values.balance, known = r.values.apr != null, apr = known ? r.values.apr : ref.typicalRates?.[r.type] ?? 0.1;
    if (!known) standIns.push({ name: r.name, what: 'rate', value: apr });
    let payment = r.values.payment;
    if (payment == null) { payment = r.type === 'Credit card' ? cardMinimum({ balance, apr }).value : tenYear(balance, apr); standIns.push({ name: r.name, what: 'payment', value: payment }); }
    return { id: r.id, name: r.name, type: r.type, balance, apr, payment, promoApr: r.values.promoApr ?? null, promoEnd: r.values.promoEnd ?? null };
  });
  const run = (o, x) => payoffPlan(debts, { extra: x, order: o, now });
  const plan = run(order, extra), plain = extra > 0 ? run(order, 0) : null, otherId = order === 'avalanche' ? 'snowball' : 'avalanche', alt = debts.length > 1 ? run(otherId, extra) : null;
  const firstWin = p => (p?.months == null ? null : Math.min(...p.debts.map(d => d.paidOffMonth)));
  const list = plan.debts.map((d, i) => ({ name: d.name, month: d.paidOffMonth, date: d.paidOffMonth == null ? null : monthLabel(d.paidOffMonth, now), interest: d.interest, first: i === 0 }));
  return { ready: true, count: debts.length, total: debts.reduce((s, d) => s + d.balance, 0), payments: debts.reduce((s, d) => s + d.payment, 0), extra, order,
    never: plan.months == null, months: plan.months, date: plan.months == null ? null : monthLabel(plan.months, now), interest: plan.interest, first: plan.debts[0]?.name ?? null, firstWin: firstWin(plan),
    debts: list.sort((a, b) => (a.month ?? Infinity) - (b.month ?? Infinity)), standIns,
    saved: plain && plain.months != null && plan.months != null ? { months: plain.months - plan.months, interest: plain.interest - plan.interest } : null,
    other: alt && alt.months != null && plan.months != null ? { order: otherId, months: alt.months, interest: alt.interest, moreInterest: alt.interest - plan.interest, firstWin: firstWin(alt) } : null };
}
