// SPDX-License-Identifier: AGPL-3.0-only
// M30 to M37: minimums, payoff months, interest, fee APR, payoff order, utilization, DTI, promo.
import { ok, needs, missing, fmt } from './result.js';
import { duration } from '../format.js';
import { RULES, LISTS } from '../registry/assumptions.js';

const HEAVY_TYPES = new Set(LISTS.heavyDebt);
// Heavy debt (FOO step 3): a balance on a heavy type (cards, payday, personal, BNPL, medical, tax) or any APR at or over
// RULES.heavyApr (8%), unless it is on a forgiveness plan (PSLF). One definition for the FOO, the ladder, the Scorecard
// and the debt-first rule (batch 11).
export const isHeavyDebt = d => (d?.balance ?? 0) > 0 && !d.forgiven && (HEAVY_TYPES.has(d.type) || (d.apr ?? 0) >= RULES.heavyApr);

// M30: credit card minimum. A statement number overrides it (R036, R060).
export function cardMinimum({ balance, apr }) {
  const m = missing({ balance, APR: apr });
  if (m.length) return needs('M30', m);
  const interest = balance * apr / 12;
  const v = Math.min(balance, Math.max(RULES.cardMinimumFloor, balance * RULES.cardMinimumPct + interest));
  return ok('M30', v, `The larger of $25 or 1% of the ${fmt.money(balance)} balance plus one month's interest (${fmt.money(interest)}) = ${fmt.money(v)} a month.`, { parts: { interest } });
}

// The smallest whole-dollar payment that ever pays it off.
export const paymentNeeded = (balance, apr) => Math.floor(balance * apr / 12) + 1;

// M31: months to pay off. Never-pays-off gives the payment needed (Words: Payment too small).
export function payoffMonths({ balance, apr, payment }, { from = new Date() } = {}) {
  const m = missing({ balance, APR: apr, payment });
  if (m.length) return needs('M31', m, { unit: 'months' });
  if (balance <= 0) return ok('M31', 0, 'Nothing left to pay.', { unit: 'months' });
  const r = apr / 12;
  if (r === 0) {
    const n = Math.ceil(balance / payment - 1e-9);
    return { ...ok('M31', n, `${fmt.money(balance)} at 0% divided by ${fmt.money(payment)} a month = ${duration(n, from)}.`, { unit: 'months' }), exact: balance / payment };
  }
  if (payment <= r * balance) {
    const need = paymentNeeded(balance, apr);
    return { id: 'M31', value: null, needs: [], guess: false, unit: 'months', never: true, paymentNeeded: need,
      text: `This payment never pays it off. It needs at least ${fmt.money(need)} a month.` };
  }
  const exact = -Math.log(1 - r * balance / payment) / Math.log(1 + r);
  const n = Math.ceil(exact - 1e-9);
  return { ...ok('M31', n, `${fmt.money(balance)} at ${fmt.pct(apr)} paying ${fmt.money(payment)} a month: each month adds ${fmt.pct(apr)} / 12 interest and takes off the payment. It is paid off in ${duration(n, from)}.`, { unit: 'months' }), exact };
}

// Month-by-month simulation of one debt. Used for payoff order with extra payments (M34); M32 uses the formula.
export function simulateDebt({ balance, apr, payment }, maxMonths = 1200) {
  let b = balance, interest = 0, months = 0;
  const r = apr / 12;
  const path = [b];
  while (b > 0.005 && months < maxMonths) {
    const i = b * r;
    interest += i;
    b = b + i - Math.min(payment, b + i);
    months += 1;
    path.push(b);
  }
  return { months, interest, path, paidOff: b <= 0.005 };
}

// M32: total interest at this payment.
export function totalInterest({ balance, apr, payment }) {
  const p = payoffMonths({ balance, apr, payment });
  if (p.value === null) return { ...p, id: 'M32' };
  // The formula is the source of truth (spec M32). The simulation is kept for payoff order only and can
  // differ by a dollar or two on the last partial payment, so it is not shown to the client.
  const sim = simulateDebt({ balance, apr, payment });
  const v = (p.exact ?? p.value) * payment - balance;
  return { ...ok('M32', v, `${fmt.number(p.exact ?? p.value, 2)} months of ${fmt.money(payment)} payments (${fmt.money((p.exact ?? p.value) * payment)}) minus the ${fmt.money(balance)} owed = ${fmt.money(v)} of interest.`), simulated: sim.interest };
}

// M33: fee to APR (payday, cash advance).
export function feeApr({ fee, amount, periodsPerYear }) {
  const m = missing({ fee, 'amount borrowed': amount, 'how often': periodsPerYear });
  if (m.length) return needs('M33', m, { unit: 'pct' });
  const v = fee / amount * periodsPerYear;
  return ok('M33', v, `A ${fmt.money(fee)} fee on ${fmt.money(amount)}, ${periodsPerYear} times a year, is ${fmt.pct(v)} a year.`, { unit: 'pct' });
}

const ORDERS = {
  avalanche: (a, b) => b.apr - a.apr,
  snowball: (a, b) => a.balance - b.balance,
  // Stress: highest rating first, ties by APR; blank ratings go last (R062).
  stress: (a, b) => (b.stress ?? -1) - (a.stress ?? -1) || b.apr - a.apr,
  // Return on Hassle (F3, confirmed Nov 6): hassle score over balance, highest first; unscored debts last; ties by APR.
  hassle: (a, b) => hasslePerDollar(b) - hasslePerDollar(a) || b.apr - a.apr,
};
export const hasslePerDollar = d => (d.hassle != null && d.balance > 0 ? d.hassle / d.balance : -1);
// A custom order: the debts in the order of ids given (the rest after, as they came).
export function customOrder(debts, ids = []) { const rank = d => { const i = ids.indexOf(d.id); return i < 0 ? ids.length : i; }; return [...debts].sort((a, b) => rank(a) - rank(b)); }
// What an order costs against the optimal one (F3): extra interest and extra months against Avalanche with the same extra.
export function orderCost(debts, { order = 'custom', ids = [], extra = 0, against = 'avalanche' } = {}) {
  const mine = order === 'custom' ? payoffPlan(customOrder(debts, ids), { order: 'given', extra }) : payoffPlan(debts, { order, extra });
  const best = payoffPlan(debts, { order: against, extra });
  const extraInterest = mine.months == null || best.months == null ? null : mine.interest - best.interest;
  return { plan: mine, best, extraInterest, extraMonths: mine.months == null || best.months == null ? null : mine.months - best.months };
}

// M34: payoff order with an extra payment, rolling each cleared payment forward.
export function payoffPlan(debts, { extra = 0, order = 'avalanche', maxMonths = 1200 } = {}) {
  const usable = debts.filter(d => d.balance > 0 && d.apr !== null && d.apr !== undefined && d.payment !== null && d.payment !== undefined);
  const skipped = debts.filter(d => !usable.includes(d)).map(d => d.name);
  const list = usable.map(d => ({ ...d, left: d.balance, paidOffMonth: null, interest: 0 })).sort(ORDERS[order] || (() => 0)); // 'given': keep the order passed in (a promo ending soon goes first, R075)
  let month = 0, total = 0;
  const path = [list.map(d => d.left)];
  while (list.some(d => d.left > 0.005) && month < maxMonths) {
    month += 1;
    let pool = extra;
    for (const d of list) if (d.left <= 0.005) pool += d.payment; // rolled forward
    for (const d of list) {
      if (d.left <= 0.005) continue;
      const i = d.left * d.apr / 12;
      d.interest += i; total += i;
      d.left += i;
      const pay = Math.min(d.left, d.payment);
      d.left -= pay;
      pool += d.payment - pay;
    }
    for (const d of list) {
      if (d.left <= 0.005 || pool <= 0) continue;
      const pay = Math.min(d.left, pool);
      d.left -= pay; pool -= pay;
    }
    for (const d of list) if (d.left <= 0.005 && d.paidOffMonth === null) d.paidOffMonth = month;
    path.push(list.map(d => Math.max(0, d.left)));
  }
  const done = list.every(d => d.left <= 0.005);
  return { id: 'M34', order, months: done ? month : null, interest: total, debts: list.map(({ name, paidOffMonth, interest }) => ({ name, paidOffMonth, interest })), path, skipped,
    text: done ? `Paying the minimums and putting ${fmt.money(extra)} extra on ${list[0]?.name ?? 'the first debt'} first (${order}), every debt is gone in ${month} months with ${fmt.money(total)} interest.`
      : 'These payments never clear every debt.' };
}

// The debt rule (batch 11, RULES.surplusToHeavyDebt): while heavy debt is carried, the monthly surplus goes to it
// first, on top of every debt's own payment, in the payoff order (a promo ending soon first). Freed payments roll to
// the next heavy debt. Once the heavy debt is gone the surplus (and the freed heavy payments) go to investing, so
// low-rate debt keeps its own payment; an extra (a what-if, or settings.debtExtra) keeps rolling to it. This is the
// one plan every screen reads: each debt's payoff month, the heavy-debt-free month and the debt-free month.
// surplusFrom (batch 12 follow-up, question 217): the months the surplus first spends filling FOO step 1 (the buffer and
// little e) before it reaches heavy debt; each debt keeps its own payment meanwhile.
// changes (batch 15): known changes ahead, each { at, monthly }; the surplus to heavy debt moves by them from month at.
export function debtFirstPlan(debts, { order = 'avalanche', ids = [], first = [], surplus = 0, extra = 0, maxMonths = 1200, surplusFrom = 0, changes = null } = {}) {
  const usable = debts.filter(d => !d.inFull && (d.balance ?? 0) > 0 && d.apr != null && d.payment != null);
  const skipped = debts.filter(d => !d.inFull && (d.balance ?? 0) > 0 && !usable.includes(d)).map(d => d.name);
  const top = new Set(first);
  const sortGroup = list => { const s = order === 'custom' ? customOrder(list, ids) : order === 'given' ? [...list] : [...list].sort(ORDERS[order] || (() => 0)); return [...s.filter(d => top.has(d.id)), ...s.filter(d => !top.has(d.id))]; };
  const heavyList = sortGroup(usable.filter(isHeavyDebt)), lowList = sortGroup(usable.filter(d => !isHeavyDebt(d)));
  const list = [...heavyList.map(d => ({ ...d, heavy: true })), ...lowList.map(d => ({ ...d, heavy: false }))].map(d => ({ ...d, left: d.balance, paidOffMonth: null, interest: 0 }));
  const toDebt = Math.max(0, surplus || 0), more = Math.max(0, extra || 0);
  let month = 0, total = 0, heavyMonths = heavyList.length ? null : 0;
  const path = [list.map(d => d.left)];
  while (list.some(d => d.left > 0.005) && month < maxMonths) {
    month += 1;
    const heavyOpen = list.some(d => d.heavy && d.left > 0.005);
    let freedHeavy = 0, freedLow = 0;
    for (const d of list) {
      if (d.left <= 0.005) { if (d.heavy) freedHeavy += d.payment; else freedLow += d.payment; continue; }
      const i = d.left * d.apr / 12;
      d.interest += i; total += i; d.left += i;
      const pay = Math.min(d.left, d.payment);
      d.left -= pay;
      if (d.heavy) freedHeavy += d.payment - pay; else freedLow += d.payment - pay;
    }
    // The surplus and the freed heavy payments go only to heavy debt; an extra and freed low-rate payments to any, in order.
    const toDebtNow = changes?.length ? Math.max(0, (surplus || 0) + changes.reduce((s2, c) => s2 + (c.at <= month - 1 ? c.monthly : 0), 0)) : toDebt;
    let heavyPool = heavyOpen ? (month > surplusFrom ? toDebtNow : 0) + freedHeavy : 0, pool = more + freedLow;
    for (const d of list) {
      if (d.left <= 0.005 || !d.heavy || heavyPool <= 0) continue;
      const pay = Math.min(d.left, heavyPool);
      d.left -= pay; heavyPool -= pay;
    }
    for (const d of list) {
      if (d.left <= 0.005 || pool <= 0) continue;
      const pay = Math.min(d.left, pool);
      d.left -= pay; pool -= pay;
    }
    for (const d of list) if (d.left <= 0.005 && d.paidOffMonth === null) d.paidOffMonth = month;
    if (heavyMonths === null && !list.some(d => d.heavy && d.left > 0.005)) heavyMonths = month;
    path.push(list.map(d => Math.max(0, d.left)));
  }
  const done = list.every(d => d.left <= 0.005);
  const heavyPayments = heavyList.reduce((s, d) => s + d.payment, 0);
  const words = [toDebt ? `${fmt.money(toDebt)} of surplus` : null, more ? `${fmt.money(more)} extra` : null].filter(Boolean).join(' and ');
  return { id: 'M34', order, months: done ? month : null, heavyMonths, interest: total, surplus: toDebt, extra: more, heavyPayments, skipped, path, surplusFrom,
    debts: list.map(({ id, name, type, balance, payment, apr, aprGuess, heavy, paidOffMonth, interest }) => ({ id, name, type, balance, payment, apr, aprGuess: !!aprGuess, heavy, paidOffMonth, interest })),
    text: !list.length ? 'No debt with a balance, an APR and a payment.' : done
      ? `Every debt gets its own payment${words ? `, and ${words} a month goes to the heavy debt first (${order})` : ''}. ${heavyList.length ? `The heavy debt is gone in ${heavyMonths} ${heavyMonths === 1 ? 'month' : 'months'}; ` : ''}every debt is gone in ${month} months, with ${fmt.money(total)} of interest.`
      : 'These payments never clear every debt.' };
}
// A 0% promo ending within 60 days goes to the top of the order (R075). promoEnd: YYYY-MM or YYYY-MM-DD.
export function promoSoonIds(debts, now = new Date()) {
  return debts.filter(d => d.promoEnd).filter(d => {
    const end = Date.parse(`${String(d.promoEnd).length === 7 ? `${d.promoEnd}-01` : d.promoEnd}T00:00:00Z`);
    return end >= now.getTime() - 86400000 && end - now.getTime() <= 60 * 86400000;
  }).map(d => d.id);
}

// M35: utilization. No limits: hidden.
export function utilization(cards) {
  const withLimits = cards.filter(c => c.limit);
  if (!withLimits.length) return { ...needs('M35', ['credit limits'], { unit: 'pct' }), hidden: true };
  const bal = withLimits.reduce((s, c) => s + (c.balance || 0), 0);
  const lim = withLimits.reduce((s, c) => s + c.limit, 0);
  return ok('M35', bal / lim, `Card balances ${fmt.money(bal)} divided by limits ${fmt.money(lim)} = ${fmt.pct(bal / lim)}.`, { unit: 'pct' });
}

// M36: debt-to-income.
export function debtToIncome({ monthlyDebtPayments, grossMonthly }) {
  const m = missing({ 'debt payments': monthlyDebtPayments, 'gross pay': grossMonthly });
  if (m.length) return needs('M36', m, { unit: 'pct' });
  const v = monthlyDebtPayments / grossMonthly;
  return ok('M36', v, `${fmt.money(monthlyDebtPayments)} of debt payments a month divided by ${fmt.money(grossMonthly)} gross a month = ${fmt.pct(v)}.`, { unit: 'pct' });
}

// M37: payment to clear a 0% promo balance before it ends.
export function promoPayment({ balance, monthsLeft }) {
  const m = missing({ balance, 'promo end date': monthsLeft });
  if (m.length) return needs('M37', m);
  if (monthsLeft <= 0) return needs('M37', ['a promo end date in the future']);
  const v = balance / monthsLeft;
  return ok('M37', v, `${fmt.money(balance)} divided by the ${monthsLeft} months left on the promo = ${fmt.money(v)} a month.`);
}

// Batch 15, item 5: the promo line a card shows. A card with a 0% promo (rate 0 or blank) and an end month: the payment
// that clears it before the promo ends (M37), and the words "Pay $X a month to clear it before the promo ends (Mar 2027)".
export function promoPayoffOf(d, now = new Date()) {
  const end = d?.promoEnd ?? d?.values?.promoEnd ?? null, apr = d?.promoApr ?? d?.values?.promoApr ?? null, balance = d?.balance ?? d?.values?.balance ?? null;
  if (!end || !/^\d{4}-\d{2}/.test(String(end)) || (apr != null && apr > 0) || !(balance > 0)) return null;
  const [y, m] = String(end).split('-').map(Number);
  const r = promoPayment({ balance, monthsLeft: (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()) });
  if (r.value == null) return null;
  const ends = new Date(Date.UTC(y, m - 1, 15)).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const monthly = Math.ceil(r.value);
  return { monthly, ends, months: (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()), result: r, text: `Pay ${fmt.money(monthly)} a month to clear it before the promo ends (${ends})` };
}

// The debt-free card (batch 11, item 3; Undebt.it and Tally: one date, milestones). From the one plan: the debt-free
// month, what goes to debt a month (every payment plus the surplus on heavy debt), what-ifs for an extra a month
// (never saved), and the milestones: 25% and 50% of the debt gone, the first debt paid off, debt free, each with its
// month on the plan; the next one with the dollars still to go. start: the debt total at Day 0 when there is one.
export const HERO_EXTRAS = [50, 100, 250];
// Batch 12 (item 4, QUESTIONS 200): on a plan of RULES.shortPlanMonths (12) or fewer, $50 rarely moves the date, so the
// chips are +5%, +10% and +25% of what goes to debt a month, each rounded to $10 (never two the same, never under $10).
export const SHORT_PLAN_SHARES = [0.05, 0.1, 0.25];
export function heroExtras(plan) {
  if (!plan?.debts?.length || plan.months == null || plan.months > RULES.shortPlanMonths) return HERO_EXTRAS;
  const monthly = plan.debts.reduce((s, d) => s + (d.payment ?? 0), 0) + (plan.surplus ?? 0) + (plan.extra ?? 0);
  const out = [];
  for (const k of SHORT_PLAN_SHARES) { let v = Math.max(10, Math.round(monthly * k / 10) * 10); while (out.includes(v)) v += 10; out.push(v); }
  return out;
}
export function debtFreeCard(plan, { start = null, extras = HERO_EXTRAS, rerun = null } = {}) {
  if (!plan?.debts?.length) return null;
  const now = plan.path[0].reduce((s, v) => s + v, 0);
  const from = Math.max(start ?? 0, now);
  const totalAt = row => row.reduce((s, v) => s + v, 0);
  const monthWhen = goal => { const i = plan.path.findIndex(row => totalAt(row) <= goal + 0.005); return i < 0 ? null : i; };
  const paidSoFar = Math.max(0, from - now);
  const firstOff = plan.debts.filter(d => d.paidOffMonth != null).sort((a, b) => a.paidOffMonth - b.paidOffMonth)[0] ?? null;
  const one = plan.debts.length === 1;
  const marks = [
    { id: 'quarter', name: '25% gone', goal: from * 0.75 },
    { id: 'half', name: '50% gone', goal: from * 0.5 },
    ...(one ? [] : [{ id: 'first', name: firstOff ? `First debt paid off: ${firstOff.name}` : 'First debt paid off', goal: null, months: firstOff?.paidOffMonth ?? null, left: firstOff ? firstOff.balance : null }]),
    { id: 'free', name: 'Debt free', goal: 0 },
  ].map(k => {
    const done = k.goal != null ? now <= k.goal + 0.005 : false;
    const months = k.goal != null ? (done ? 0 : monthWhen(k.goal)) : k.months;
    const left = k.goal != null ? Math.max(0, now - k.goal) : k.left;
    return { id: k.id, name: k.name, done, months, left };
  });
  const next = marks.find(k => !k.done) ?? null;
  const monthly = plan.debts.reduce((s, d) => s + d.payment, 0) + (plan.surplus ?? 0) + (plan.extra ?? 0);
  const lastPay = p => (p.months ? p.path[p.months - 1].reduce((s, v) => s + v, 0) * (1 + Math.max(0, ...p.debts.map(d => d.apr ?? 0)) / 12) : 0); // about what the final month still owes
  const whatIf = rerun ? extras.map(x => { const q = rerun(x); return { extra: x, months: q.months, interestSaved: q.months == null || plan.months == null ? null : Math.max(0, plan.interest - q.interest), lastPayment: q.months == null ? null : Math.min(lastPay(q), monthly + x) }; }) : [];
  return { months: plan.months, heavyMonths: plan.heavyMonths, monthly, interest: plan.interest, lastPayment: plan.months == null ? null : Math.min(lastPay(plan), monthly), owed: now, start: from, paidSoFar, marks, next, whatIf,
    text: plan.months == null ? plan.text : `${fmt.money(monthly)} a month goes to debt: each debt's own payment${plan.surplus ? ` plus ${fmt.money(plan.surplus)} of surplus on the heavy debt first` : ''}${plan.extra ? ` plus ${fmt.money(plan.extra)} extra` : ''}. ${fmt.money(now)} owed is gone in ${plan.months} ${plan.months === 1 ? 'month' : 'months'}.` };
}

// Credit health (batch 11, item 6): utilization per card and overall, the oldest account's age and the average age
// (from each card's Opened month, YYYY-MM), hard inquiries in the last two years and the freeze at the three bureaus.
export const BUREAUS = ['Equifax', 'Experian', 'TransUnion'];
export function creditHealth(cards, { now = new Date(), inquiries = null, freeze = {} } = {}) {
  const ym = d => (/^\d{4}-\d{2}/.test(String(d || '')) ? String(d).slice(0, 7) : null);
  const ageMonths = d => { const v = ym(d); if (!v) return null; const [y, m] = v.split('-').map(Number); return Math.max(0, (now.getUTCFullYear() - y) * 12 + (now.getUTCMonth() + 1 - m)); };
  const per = cards.map(c => ({ id: c.id ?? null, name: c.name ?? 'Card', util: c.limit ? (c.balance ?? 0) / c.limit : null, ageMonths: ageMonths(c.opened) }));
  const overall = utilization(cards);
  const ages = per.map(p => p.ageMonths).filter(v => v != null);
  const oldest = ages.length ? Math.max(...ages) : null, average = ages.length ? ages.reduce((s, v) => s + v, 0) / ages.length : null;
  const frozen = BUREAUS.filter(b => freeze?.[b] === true), thawed = BUREAUS.filter(b => freeze?.[b] === false);
  return { id: 'M35', per, overall: overall.hidden ? null : overall.value, oldestMonths: oldest, averageMonths: average, inquiries: inquiries ?? null, frozen, thawed,
    text: [overall.hidden ? null : overall.text, ages.length ? `Oldest card ${(oldest / 12).toFixed(1)} years; average ${(average / 12).toFixed(1)} years across ${ages.length} ${ages.length === 1 ? 'card' : 'cards'} with an opened month.` : null].filter(Boolean).join(' ') };
}
export const yearsText = months => (months == null ? null : months < 12 ? `${months} ${months === 1 ? 'month' : 'months'}` : `${(months / 12).toFixed(1)} years`);
