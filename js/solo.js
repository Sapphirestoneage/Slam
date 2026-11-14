// SPDX-License-Identifier: AGPL-3.0-only
// The standalone pages (js/solo): one easy thing each, done right, with the answers carried to the next page in a link.
// This file is the pure part: the order of the pages, and what each one works out from the household file. The payoff
// itself is the engine's own (js/math/debt.js payoffPlan, M34), so a standalone and the full plan can never disagree.
import { payoffPlan, cardMinimum } from './math/debt.js';
import { collapseOf } from './collapse.js';
import { quizOf } from './quiz.js';
import { answeredOf } from './math/agestart.js';

// The path: each page names the next. The last one is the whole plan (start.html), which opens a carried link.
export const SOLO = [
  { id: 'first', page: 'first.html', title: 'What is my first move?', blurb: 'Five taps or fewer. Every answer rules plans out until one is left.', next: 'end', nextLabel: 'Start at the finish line' },
  { id: 'end', page: 'end.html', title: 'Start at the finish line', blurb: 'What you need, by when. Then work backwards to today.', next: 'quiz', nextLabel: 'How do I handle money?' },
  { id: 'quiz', page: 'quiz.html', title: 'How do I handle money?', blurb: 'Ten taps. See your five money muscles.', next: 'debt', nextLabel: 'When am I debt free?' },
  { id: 'debt', page: 'debt.html', title: 'When am I debt free?', blurb: 'List what you owe. Get the month it is gone.', next: 'runway', nextLabel: 'How long would my money last?' },
  { id: 'runway', page: 'runway.html', title: 'How long would my money last?', blurb: 'If the pay stopped tomorrow: your months, and what stretches them.', next: 'skills', nextLabel: 'Where am I on the skill tree?' },
  { id: 'skills', page: 'skills.html', title: 'Where am I on the skill tree?', blurb: 'The 625 skills in 25 trees. A few taps a tree places you and names your next unlock.', next: 'plan', nextLabel: 'See when work becomes optional' },
  { id: 'plan', page: 'start.html', title: 'Your whole plan', blurb: 'Everything together: your date, your next step, your levels.', next: null },
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

// How long the money lasts if the pay stops: cash on hand against what goes out, less anything still coming in.
// cut: a share of spending trimmed (0.1 = 10% less). Months are whole months fully covered.
export const CUTS = [0, 0.1, 0.2, 0.3], STILL_IN = [0, 500, 1000, 1500, 2000];
export function runwayOf({ cash, spending, stillIn = 0, cut = 0, now = new Date() } = {}) {
  if (!(cash >= 0) || !(spending > 0)) return { ready: false };
  const out = spending * (1 - cut), gap = out - stillIn;
  if (gap <= 0) return { ready: true, covered: true, out, gap, months: null, date: null, cash };
  const months = cash / gap, whole = Math.floor(months), base = cash / Math.max(1e-9, spending - stillIn);
  return { ready: true, covered: false, out, gap, months, whole, date: monthLabel(whole, now), cash, extraMonths: cut > 0 && spending - stillIn > 0 ? months - base : 0, perThousand: 1000 / gap * 30.44 };
}

// ---------- Start at the finish line: the end first, then backwards to today ----------
// 1 what you need (a month, a year, or a total) -> 2 by when -> 3 what you have -> 4 what comes in and goes out.
// The total is the yearly need divided by the withdrawal rate; growth is the plan's own return after inflation
// (ref.presets), so every figure is in today's dollars. needed: the level monthly amount that gets `have` to `total`
// in `years` (a savings annuity). onPace: the year today's left-over money gets there instead.
export const NEED_MONTH = [2000, 3000, 4000, 5000, 6500, 8000, 10000], WHEN_YEARS = [5, 10, 15, 20, 25, 30];
export function backwardsOf({ need = null, per = 'month', years = null, have = null, takeHome = null, spending = null, ref, now = new Date() } = {}) {
  const wr = ref.presets.withdrawalRate.default, r = ref.presets.realReturn.default, i = r / 12;
  const out = { step: 1, withdrawalRate: wr, realReturn: r };
  if (!(need > 0)) return out;
  const total = per === 'total' ? need : (per === 'year' ? need : need * 12) / wr;
  Object.assign(out, { step: 2, total, aYear: total * wr, aMonth: total * wr / 12 });
  if (!(years > 0)) return out;
  Object.assign(out, { step: 3, years, byYear: now.getFullYear() + years });
  if (have == null) return out;
  const n = years * 12, grown = have * (1 + i) ** n, short = Math.max(0, total - grown);
  const needed = short <= 0 ? 0 : short * i / ((1 + i) ** n - 1);
  Object.assign(out, { step: 4, have, grown, alreadyThere: have >= total, growsThere: short <= 0, needed, share: Math.min(1, have / total) });
  if (takeHome == null || spending == null) return out;
  const left = takeHome - spending, gap = needed - left;
  // months until today's left-over money gets there: solve have(1+i)^m + left((1+i)^m - 1)/i = total
  let months = null; if (out.alreadyThere) months = 0; else if (left > 0 || have * i > 0) { const k = left / i, x = (total + k) / (have + k); months = x > 0 && have + k > 0 ? Math.log(x) / Math.log(1 + i) : null; if (!(months >= 0) || months > 1200) months = null; }
  return Object.assign(out, { step: 5, takeHome, spending, left, gap, onTrack: gap <= 0, months, onPaceYear: months == null ? null : now.getFullYear() + Math.floor((now.getMonth() + months) / 12), savingsRateNeeded: takeHome > 0 ? needed / takeHome : null,
    // the two honest ways to close a gap: spend less (which also lowers the need) or earn more
    spendToClose: gap > 0 ? Math.max(0, spending - gap) : null, earnToClose: gap > 0 ? takeHome + gap : null });
}

// ---------- What is done, and what carrying answers forward saved ----------
// Each page uses some of the plan's five answers. An answer given once and used by three pages was typed once, not
// three times: that is the time saved. SECONDS_EACH is a plain estimate of finding and typing one number.
export const USES = { first: [], end: ['invested', 'income', 'spending'], quiz: [], debt: ['card'], runway: ['cash', 'spending'], skills: [], plan: ['income', 'spending', 'cash', 'invested', 'card'] };
export const SECONDS_EACH = 30;
export function soloProgress(doc, ref, { planDone = false } = {}) {
  const st = doc.settings?.start || {}, ans = answeredOf(doc, ref), g = st.goal || {};
  const done = { first: collapseOf(st.collapse || {}).done, end: g.need > 0 && g.years > 0 && ans.invested && ans.income && ans.spending,
    quiz: (() => { const q = quizOf(st.quiz || {}, st.quizDepth || 'ten'); return q.ready && q.done >= 10; })(), skills: Object.keys(st.treeAsked || {}).length >= 25, debt: !!ans.card, runway: !!ans.cash && !!ans.spending, plan: !!planDone };
  const started = { first: Object.keys(st.collapse || {}).length > 0, end: g.need > 0, quiz: Object.keys(st.quiz || {}).length > 0, skills: Object.keys(st.treeAsked || {}).length > 0, debt: !!ans.card, runway: !!ans.cash || !!ans.spending, plan: Object.values(ans).some(Boolean) && doc.profile?.birthYear != null };
  const keys = ['income', 'spending', 'cash', 'invested', 'card'].filter(k => ans[k]);
  const reused = keys.reduce((n, k) => n + Math.max(0, SOLO.filter(s => USES[s.id].includes(k)).length - 1), 0);
  const steps = SOLO.map(s => ({ ...s, done: !!done[s.id], started: !!started[s.id] && !done[s.id], ready: USES[s.id].filter(k => ans[k]).length, needs: USES[s.id].length }));
  return { steps, done: steps.filter(s => s.done).length, of: steps.length, next: steps.find(s => !s.done) ?? null, answers: keys.length, reused, minutesSaved: Math.round(reused * SECONDS_EACH / 60) };
}
