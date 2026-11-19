// SPDX-License-Identifier: AGPL-3.0-only
// The standalone pages (js/solo): one easy thing each, done right, with the answers carried to the next page in a link.
// This file is the pure part: the order of the pages, and what each one works out from the household file. The payoff
// itself is the engine's own (js/math/debt.js payoffPlan, M34), so a standalone and the full plan can never disagree.
import { fiDate } from './math/fi.js';
import { payoffPlan, cardMinimum } from './math/debt.js';
import { loanPayment, loanSchedule } from './math/truecost.js';
import { transitionOf } from './math/transitions.js';
import { collapseOf } from './collapse.js';
import { quizOf } from './quiz.js';
import { answeredOf } from './math/agestart.js';
import { coastFi } from './math/fi.js';
import { yearsAtRate, MMM } from './math/simple.js';
import { realHourlyWage } from './math/income.js';
import { maxHomePayment, loanFromPayment } from './math/lender.js';
import { RULES } from './registry/assumptions.js';

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
// "Debt free" leaves the mortgage out unless asked (Eli, Nov 14): a home loan is a different kind of debt, paid on its own clock.
export function debtFreeOf(doc, ref, { extra = 0, order = 'avalanche', withMortgage = false, now = new Date() } = {}) {
  const owed = (doc.records || []).filter(r => r.kind === 'debt' && (r.values?.balance ?? 0) > 0), home = owed.filter(r => r.type === 'Mortgage');
  const rows = withMortgage ? owed : owed.filter(r => r.type !== 'Mortgage'), mortgage = { count: home.length, total: home.reduce((t, r) => t + r.values.balance, 0), counted: withMortgage && home.length > 0 };
  if (!rows.length) return { ready: false, count: 0, total: 0, ...(home.length ? { mortgage } : {}) };
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
  return { ready: true, mortgage, count: debts.length, total: debts.reduce((s, d) => s + d.balance, 0), payments: debts.reduce((s, d) => s + d.payment, 0), extra, order,
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
  const wr = ref.presets.withdrawalRate.default, r = ref.presets.realReturn.default, i = (1 + r) ** (1 / 12) - 1; // a month at the plan's own pace (M53): 7% a year is 7% a year, not 7% / 12 compounded
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

// What a trip really costs (trip.html; Eli, Nov 14 2026: "pays for a FIRE event/retreat", the true cost by age: it matters
// less for someone older and a great deal for someone young). The price today, what that money would be at 65 if it
// stayed invested at the plan's own return (today's dollars), the yearly spending that would pay for from then on, the
// same trip at other ages, and, with the plan's numbers on file, how far it moves the month work becomes optional.
export const TRIP_COSTS = [500, 1500, 3000, 5000, 8000], TRIP_AGES = [22, 30, 40, 50, 60], TRIP_AGE_PICKS = [22, 25, 30, 35, 40, 50, 60];
export function tripCostOf({ cost = null, age = null, invested = null, monthly = null, spending = null, toAge = 65, ref } = {}) {
  if (!(cost > 0) || age == null) return { ready: false };
  const r = ref.presets.realReturn.default, wr = ref.presets.withdrawalRate.default;
  const at = a => cost * (1 + r) ** Math.max(0, toAge - a), grown = at(age);
  const out = { ready: true, cost, age, toAge, years: Math.max(0, toAge - age), grown, multiple: grown / cost, aYear: grown * wr, realReturn: r, withdrawalRate: wr,
    byAge: TRIP_AGES.map(a => ({ age: a, grown: at(a), multiple: at(a) / cost })),
    share: invested > 0 ? cost / invested : null, monthsOfSaving: monthly > 0 ? cost / monthly : null, delay: null, before: null, after: null };
  if (monthly > 0 && spending > 0 && invested != null) {
    const target = spending * 12 / wr, go = b => fiDate({ invested: b, monthlyInvesting: monthly, realReturn: r, target }).value;
    out.before = go(invested); out.after = go(invested - cost); // the trip comes out of what is invested, or out of the saving that would have gone in
    out.delay = out.before == null || out.after == null ? null : out.after - out.before;
  }
  return out;
}

// What a habit costs (habit.html): two of the FIRE canon's most quoted shortcuts on one page, at the plan's own pace.
// Mr. Money Mustache's rules of 752 and 173 (ten years of a weekly or monthly cost, left invested instead), and the
// "$100 a month is $30,000" rule (what has to be invested to pay for it forever, 25 times its year at 4%).
// The printed 752 and 173 compound 7% a year in weekly and monthly pieces; here a year is the plan's return and no more,
// so they come out near 743 and 171 at 7% (tools/canon/replicate.mjs, docs/CANON.md).
export const HABIT_PER = [['week', 'A week', 52], ['month', 'A month', 12]], HABIT_PICKS = { week: [10, 25, 50, 100, 200], month: [15, 50, 100, 250, 500] }, HABIT_YEARS = [5, 10, 20, 30];
export function habitCostOf({ amount = null, per = 'month', years = 10, ref } = {}) {
  if (!(amount > 0)) return { ready: false };
  const r = ref.presets.realReturn.default, wr = ref.presets.withdrawalRate.default, n = (HABIT_PER.find(p => p[0] === per) ?? HABIT_PER[1])[2];
  const g = (1 + r) ** (1 / n), times = (g ** (n * years) - 1) / (g - 1), aYear = amount * n;
  return { ready: true, amount, per, years, aYear, spent: aYear * years, times, grown: amount * times, growth: amount * times - aYear * years, needs: aYear / wr, realReturn: r, withdrawalRate: wr,
    byYears: HABIT_YEARS.map(y => ({ years: y, grown: amount * (g ** (n * y) - 1) / (g - 1) })) };
}

// What a loan really costs (loan.html): the payment, the interest over its whole life (and in today's dollars), what the
// same payment would have become invested at the plan's pace, and the FIRE view (a payment is spending, so while it is
// owed it adds 25 times its year to the FI number). The payment and the schedule are the plan's own (js/math/truecost.js).
export const LOAN_AMOUNTS = [5000, 15000, 30000, 60000, 300000], LOAN_RATES = [0, 0.04, 0.07, 0.1, 0.15, 0.25], LOAN_YEARS = [2, 3, 5, 7, 10, 30];
export function loanCostOf({ amount = null, apr = null, years = null, ref } = {}) {
  if (!(amount > 0) || apr == null || !(years > 0)) return { ready: false };
  const n = years * 12, payment = loanPayment(amount, apr, n), infl = ref.presets.inflation.default, r = ref.presets.realReturn.default, wr = ref.presets.withdrawalRate.default;
  const s = loanSchedule({ amount, apr, payment, n, inflation: infl }), g = (1 + r) ** (1 / 12);
  return { ready: true, amount, apr, years, months: n, payment, paid: s.paid, interest: s.interest, interestToday: s.interestToday, perDollar: s.paid / amount,
    invested: payment * (g ** n - 1) / (g - 1), fiNumber: payment * 12 / wr, inflation: infl, realReturn: r, withdrawalRate: wr };
}

// If the pay stopped (ladder.html): Life Transitions' own ladder and dip (js/math/transitions.js, M90) run on a copy of
// the plan with every income row taken out. Nothing is saved: the person's plan still has its pay. Only the person's
// own answers count (a typical stand-in is never a rung). Returns the words, the months, the month it runs out, and
// each rung in the order it would be used, with what it holds, what it costs and the month it is first reached.
export function stoppedPayOf(doc, ref, { now = new Date() } = {}) {
  const have = answeredOf(doc, ref);
  if (!have.spending || !have.cash) return { ready: false };
  const copy = JSON.parse(JSON.stringify(doc)); copy.records = (copy.records || []).filter(r => r.kind !== 'income');
  const T = transitionOf(copy, ref, { now }), reach = T.dip.reached || {};
  const rung = r => ({ id: r.id, name: r.plain ?? r.name, amount: r.amount ?? null, cost: r.costText ?? null, note: r.note ?? null, on: !!r.on, month: reach[r.id] ?? null });
  return { ready: true, text: T.text, runway: T.runway, floorYm: T.floorYm, total: T.total, costs: T.costs, burn: T.levels[0]?.burn ?? null,
    used: T.ladder.rungs.filter(r => r.on).map(rung), unused: T.ladder.rungs.filter(r => !r.on).map(rung) };
}

// ---------- The canon pack (Run 5): eight small calculators, each one rule the FIRE canon repeats, at the plan's pace ----------
// Each takes plain numbers and returns { ready } until it has what it needs. Pages: js/solo/canon.js.
const presets = ref => ({ r: ref.presets.realReturn.default, wr: ref.presets.withdrawalRate.default });

// How many working years is my savings rate? (years.html) The Shockingly Simple Math (Mr. Money Mustache, 2012) and
// the savings-rate ladder (Jacob Lund Fisker, Early Retirement Extreme): years from $0 at this share of take-home kept,
// what five more points buys, and the table at the plan's return next to the one as printed (5% real, 4%).
export const RATE_STEP = 0.05, RATE_LADDER = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7];
export function workYearsOf({ takeHome = null, spending = null, ref } = {}) {
  if (!(takeHome > 0) || spending == null || spending < 0) return { ready: false };
  const { r, wr } = presets(ref), A = { realReturn: r, withdrawalRate: wr }, kept = takeHome - spending, rate = kept / takeHome;
  const ladder = RATE_LADDER.map(s => ({ rate: s, years: yearsAtRate(s, A), printed: yearsAtRate(s, MMM) }));
  if (!(rate > 0)) return { ready: true, none: true, takeHome, spending, kept, rate, ladder, realReturn: r, withdrawalRate: wr };
  const up = Math.min(0.95, rate + RATE_STEP), years = yearsAtRate(rate, A), yearsUp = yearsAtRate(up, A);
  return { ready: true, none: false, takeHome, spending, kept, rate, years, up, yearsUp, gain: years != null && yearsUp != null ? years - yearsUp : null, moreAMonth: (up - rate) * takeHome,
    printed: yearsAtRate(rate, MMM), ladder, realReturn: r, withdrawalRate: wr };
}

// Could I stop saving and still get there? (coast.html) Coast FI (M54): the amount that, left alone, grows to the FI
// number by the age picked. The FI number is a year of spending over the withdrawal rate (M50).
export const COAST_AGES = [55, 60, 65, 67];
export function coastOf({ invested = null, spending = null, age = null, retireAge = 65, ref } = {}) {
  if (invested == null || !(spending > 0) || !(age > 0)) return { ready: false };
  const { r, wr } = presets(ref), fi = spending * 12 / wr, years = Math.max(0, retireAge - age), coast = coastFi({ fiNumber: fi, realReturn: r, age, retireAge }).value;
  return { ready: true, invested, spending, age, retireAge, years, fi, coast, there: invested >= coast, share: coast > 0 ? invested / coast : 1, gap: Math.max(0, coast - invested), grown: invested * (1 + r) ** years, realReturn: r, withdrawalRate: wr };
}

// What is a dollar today worth at 65? (dollar.html) The idea is The Money Guy Show's wealth multiplier; their table
// uses their own return for each age. Here a year grows by the plan's return and no more.
export const DOLLAR_AGES = [20, 30, 40, 50];
export function dollarLaterOf({ age = null, amount = 100, to = 65, ref } = {}) {
  if (!(age > 0)) return { ready: false };
  const { r } = presets(ref), at = a => (1 + r) ** Math.max(0, to - a), times = at(age);
  return { ready: true, age, to, years: Math.max(0, to - age), amount, times, grown: amount * times, realReturn: r, byAge: DOLLAR_AGES.map(a => ({ age: a, times: at(a) })) };
}

// How much car fits my pay? (car.html) The Money Guy Show's 20/3/8: 20% down, paid off in 3 years, payments at 8% of
// pay before taxes or less. From the pay alone: the most payment, loan and price. With a price: its own payment.
export const CAR_RULE = { down: 0.2, years: 3, share: 0.08 }, CAR_RATES = [0, 0.04, 0.07, 0.1, 0.14];
export function carFitsOf({ grossMonthly = null, price = null, apr = 0.07 } = {}) {
  if (!(grossMonthly > 0)) return { ready: false };
  const n = CAR_RULE.years * 12, r = apr / 12, maxPayment = grossMonthly * CAR_RULE.share;
  const maxLoan = r === 0 ? maxPayment * n : maxPayment * (1 - (1 + r) ** -n) / r, maxPrice = maxLoan / (1 - CAR_RULE.down);
  const out = { ready: true, grossMonthly, apr, months: n, maxPayment, maxLoan, maxPrice, maxDown: maxPrice * CAR_RULE.down, price: null };
  if (price > 0) { const loan = price * (1 - CAR_RULE.down), payment = loanPayment(loan, apr, n); Object.assign(out, { price, down: price * CAR_RULE.down, loan, payment, share: payment / grossMonthly, fits: payment <= maxPayment + 0.005, payFor: payment / CAR_RULE.share }); }
  return out;
}

// Is my net worth keeping up with my pay? (worth.html) The Millionaire Next Door (Stanley and Danko): expected net
// worth = age x pay before taxes / 10, and twice that is what the book calls a prodigious accumulator of wealth. Under
// 40 the formula runs hard on people who have had little time, so The Money Guy Show's version is shown beside it:
// age x pay / (10 + the years until 40), doubled for the same mark.
export function expectedWorthOf({ age = null, grossYear = null, netWorth = null } = {}) {
  if (!(age > 0) || !(grossYear > 0) || netWorth == null) return { ready: false };
  const expected = age * grossYear / 10, toForty = Math.max(0, 40 - age), adjusted = age * grossYear / (10 + toForty);
  return { ready: true, age, grossYear, netWorth, expected, twice: expected * 2, ratio: netWorth / expected, young: age < 40, toForty, adjusted, adjustedTwice: adjusted * 2, adjustedRatio: netWorth / adjusted };
}

// What do I really make an hour? (wage.html) Your Money or Your Life, step 2 (Vicki Robin and Joe Dominguez): take-home
// less what the job costs, over every hour the job takes (M17). Hours are a week; a month is 52 / 12 weeks.
export const WEEKS_A_MONTH = 52 / 12;
export function realWageOf({ takeHome = null, hoursWeek = null, commuteWeek = 0, costs = 0 } = {}) {
  if (!(takeHome > 0) || !(hoursWeek > 0)) return { ready: false };
  const paid = hoursWeek * WEEKS_A_MONTH, commute = (commuteWeek ?? 0) * WEEKS_A_MONTH, work = costs ?? 0;
  const real = realHourlyWage({ takeHome, workCosts: work, paidHours: paid, commuteHours: commute }).value, stated = takeHome / paid;
  return { ready: true, takeHome, hoursWeek, commuteWeek: commuteWeek ?? 0, costs: work, hours: paid + commute, real, stated, share: real / stated, hoursPer100: real > 0 ? 100 / real : null };
}

// Where does each dollar go? (split.html) The 50/30/20 rule (Elizabeth Warren and Amelia Warren Tyagi, All Your Worth):
// of take-home, half to needs, 30% to wants, 20% to saving and paying down debt.
export const SPLIT_RULE = { needs: 0.5, wants: 0.3, left: 0.2 };
export function splitOf({ takeHome = null, needs = null, wants = null } = {}) {
  if (!(takeHome > 0) || needs == null || wants == null) return { ready: false };
  const left = takeHome - needs - wants, of = v => v / takeHome;
  return { ready: true, takeHome, needs, wants, left, shares: { needs: of(needs), wants: of(wants), left: of(left) }, marks: { needs: takeHome * SPLIT_RULE.needs, wants: takeHome * SPLIT_RULE.wants, left: takeHome * SPLIT_RULE.left } };
}

// How much home would a lender say fits? (home.html) The 28/36 lines a conventional lender starts from (RULES.lenderFront
// and lenderBack): the home payment at 28% of pay before taxes, and it plus every other debt payment at 36%. The lower
// of the two is the payment; the loan it carries is the plan's own (js/math/lender.js loanFromPayment).
export function homeFitsOf({ grossMonthly = null, otherDebt = 0 } = {}) {
  if (!(grossMonthly > 0)) return { ready: false };
  const other = otherDebt ?? 0, front = RULES.lenderFront * grossMonthly, back = Math.max(0, RULES.lenderBack * grossMonthly - other), payment = maxHomePayment(grossMonthly, other);
  return { ready: true, grossMonthly, otherDebt: other, front, back, payment, by: back < front ? 'back' : 'front', loan: loanFromPayment(payment), rate: RULES.lenderMortgageRate, years: RULES.lenderMortgageYears, taxIns: RULES.lenderTaxInsShare, frontLine: RULES.lenderFront, backLine: RULES.lenderBack };
}
