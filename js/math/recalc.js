// SPDX-License-Identifier: AGPL-3.0-only
// Recalculating (Nov 25 2026). Eli's tone rule for the whole app: when real numbers drift from the plan, SLAM says
// "Recalculating" and shows the old date, the new date and the one next turn. It never says the person did
// something wrong. This file is the math of that route and of the tools around it: the triage when the bills are
// more than the income, the emergency fund refill, the safe-to-fail line, the state of the month, and the opt-in
// audit that looks back.
// Pure, and with no import on purpose: tools/game_recalc_build.mjs copies this file word for word into
// game/core/recalc.js, so the web app and the game work every one of these numbers out with the same function.
// Every name starts with rc or RC_ because the game has one global scope.
// Empty is not zero: a missing input gives null (nothing to show), never a number made from a guess of 0.

// ---------- months ----------
// A month as 'YYYY-MM', from a Date, an ISO date or a month string.
export function rcYm(d) {
  if (d == null) return null;
  if (typeof d === 'string') return /^\d{4}-\d{2}/.test(d) ? d.slice(0, 7) : null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
export function rcAddMonths(ym, n) {
  if (ym == null || n == null) return null;
  const t = Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1 + Math.round(n);
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}
// Whole months from month a to month b (positive when b is later).
export function rcMonthsBetween(a, b) {
  if (a == null || b == null) return null;
  return Number(b.slice(0, 4)) * 12 + Number(b.slice(5, 7)) - (Number(a.slice(0, 4)) * 12 + Number(a.slice(5, 7)));
}
const RC_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function rcMonthName(ym) {
  return ym == null ? null : `${RC_MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
}
export function rcSpan(n) {
  const m = Math.abs(Math.round(n)), y = Math.floor(m / 12), r = m % 12;
  const part = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
  return y && r ? `${part(y, 'year')} and ${part(r, 'month')}` : y ? part(y, 'year') : part(m, 'month');
}

// ---------- the route ----------
// The plan said a date on the day it was last kept (planAt, with planMonths to go). Today's numbers say another
// (nowAt, with months to go, worked out from where the person is today and never from where the plan said they
// would be). When the two months differ, the route recalculates. open: the goal is not reached yet; with open and
// no months, today's numbers give no date at all.
// Returns null when there is nothing to compare (no kept plan, or no date on either side and the goal is not open).
export function rcRoute({ planAt = null, planMonths = null, nowAt = null, months = null, open = true } = {}) {
  const from = rcYm(planAt), now = rcYm(nowAt);
  if (from == null || now == null || planMonths == null) return null;
  const oldYm = rcAddMonths(from, planMonths);
  if (months == null) return open ? { moved: true, later: true, noDate: true, oldYm, newYm: null, shift: null, since: from } : null;
  const newYm = rcAddMonths(now, months), shift = rcMonthsBetween(oldYm, newYm);
  return { moved: shift !== 0, later: shift > 0, noDate: false, oldYm, newYm, shift, since: from };
}
// The smallest extra amount a month that brings the old date back. run(extra) is the app's own plan (the one debt
// plan, or the FI date) and returns the months to go with that much more a month, or null when there is no date.
// Steps of `step` dollars up to `max`; null when no amount in that range does it.
export function rcHoldExtra(run, monthsWanted, { step = 25, max = 2000 } = {}) {
  if (typeof run !== 'function' || monthsWanted == null) return null;
  for (let extra = step; extra <= max; extra += step) {
    const m = run(extra);
    if (m != null && m <= monthsWanted) return extra;
  }
  return null;
}
// The words of the one calm card. what: 'Debt free' or 'Work optional' (the name of the date). The same words in
// the web app and in the game.
export function rcWords(route, { what = 'Your date', hold = null, turn = null } = {}) {
  if (!route || !route.moved) return null;
  const was = rcMonthName(route.oldYm), is = rcMonthName(route.newYm);
  // A date that moves sooner is a money win, and reads as one (Eli, Nov 25 2026). The calm words are for later.
  if (!route.noDate && !route.later) {
    const head = `New route: ${rcSpan(route.shift)} sooner`;
    return { title: 'New route', win: true, head, line: `${head}. ${what} was ${was}. From where you are today it is ${is}.`, next: turn ?? 'Nothing to change. Keep doing what you are doing.', was, is };
  }
  const line = route.noDate
    ? `${what} was ${was}. On today's numbers there is no date yet.`
    : `${what} was ${was}. From where you are today it is ${is}, ${rcSpan(route.shift)} ${route.later ? 'later' : 'sooner'}.`;
  const next = turn ?? (route.later || route.noDate
    ? (hold != null ? `$${hold.toLocaleString('en-US')} more a month brings ${was} back.` : 'Keep the usual payments this month. The new date is the plan now.')
    : 'Nothing to change. Keep doing what you are doing.');
  return { title: 'Recalculating', win: false, head: null, line, next, was, is };
}

// ---------- when it won't all get paid ----------
// The order to pay in when the bills are more than the income (Eli, Nov 25 2026, with Eli's answer to QUESTIONS 581
// the same day): a roof, the lights and water, food, then health insurance and medicine, then childcare if it lets
// you keep working (these five are the must-pay tier), then the way to get to work, the minimum payments, the rest.
export const RC_ORDER = [
  ['housing', 'Housing'], ['utilities', 'Utilities'], ['food', 'Food'], ['health', 'Health insurance and medicine'], ['childcare', 'Childcare, if it lets you keep working'],
  ['transport', 'Transport'], ['minimums', 'Minimum payments'], ['rest', 'The rest'],
];
export const RC_MUST = ['housing', 'utilities', 'food', 'health', 'childcare'];
// A Budget category (or a line's own name) to its place in the order.
const RC_CLASS = {
  housing: ['Rent or mortgage', 'Rent', 'Mortgage', 'Renters or home insurance', 'Renters insurance', 'Home insurance', 'Property tax', 'HOA'],
  utilities: ['Electric, gas, water', 'Internet, phone', 'Internet', 'Phone', 'Electric', 'Gas', 'Water', 'Heat'],
  food: ['Groceries', 'Groceries, dining out, coffee'],
  health: ['Health insurance', 'Health insurance (not through work)', 'Prescriptions', 'Medicine', 'Medication'],
  childcare: ['Childcare', 'Childcare and babysitting', 'Daycare', 'Day care', 'After-school care'],
  transport: ['Car insurance', 'Gas or charging, tolls, parking', 'Gas or charging', 'Tolls and parking', 'Car maintenance, registration', 'Transit, Uber', 'Transit', 'Car payment', 'Car loan'],
};
// name: the Budget category. line: the line's own name, looked at first (childcare is a line inside the Kids category).
export function rcClassOf(name, line = null) {
  for (const word of [line, name]) {
    const n = String(word ?? '').trim().toLowerCase();
    if (!n) continue;
    for (const cls of Object.keys(RC_CLASS)) if (RC_CLASS[cls].some(x => x.toLowerCase() === n)) return cls;
  }
  return 'rest';
}
// income: what comes in this month. bills: [{ name, cls, amount }] (cls from rcClassOf, or 'minimums' for a debt's
// minimum payment). The money goes down the order; each bill gets what is left, in full or in part.
// null when the income is not known (empty is not zero). A bill with no amount is listed as open and takes nothing.
export function rcTriage({ income = null, bills = [] } = {}) {
  if (income == null) return null;
  const idx = cls => { const i = RC_ORDER.findIndex(o => o[0] === cls); return i < 0 ? RC_ORDER.length - 1 : i; };
  const rows = bills.map((b, i) => ({ name: b.name, cls: RC_ORDER[idx(b.cls)][0], amount: b.amount ?? null, at: i }))
    .sort((a, b) => idx(a.cls) - idx(b.cls) || a.at - b.at);
  let left = Math.max(0, income), total = 0;
  for (const r of rows) {
    if (r.amount == null) { r.paid = null; r.unpaid = null; continue; }
    total += r.amount;
    r.paid = Math.min(r.amount, left); r.unpaid = r.amount - r.paid; left -= r.paid;
  }
  const groups = RC_ORDER.map(([cls, label]) => {
    const mine = rows.filter(r => r.cls === cls && r.amount != null);
    const amount = mine.reduce((s, r) => s + r.amount, 0), paid = mine.reduce((s, r) => s + r.paid, 0);
    return { cls, label, count: mine.length, amount, paid, unpaid: amount - paid };
  }).filter(g => g.count);
  const firstShort = groups.find(g => g.unpaid > 0) ?? null;
  return { income, total, short: Math.max(0, total - income), covered: total <= income, left: Math.max(0, income - total), rows: rows.map(({ at, ...r }) => r), groups,
    firstShort: firstShort ? firstShort.cls : null, open: rows.filter(r => r.amount == null).length };
}
// What to say on the phone. No phone numbers here: the number is on the bill or the back of the card.
// NOT REVIEWED. Eli has not read these words yet (QUESTIONS 581), so no screen shows them: while
// RC_SCRIPTS_REVIEWED is false, rcScriptsFor returns null and both apps show a "Coming soon" card in their place.
// To ship them: Eli reads RC_SCRIPTS below, then this one switch goes to true and the game copy is rebuilt.
export const RC_SCRIPTS_REVIEWED = false;
export const RC_SCRIPTS = {
  housing: { who: 'Your landlord or mortgage servicer', say: ['I want to stay current, and this month I can pay {pay} of the {due} by the due date.', 'Can I pay the other {gap} by a date we agree on, with no late fee?', 'Can you send me that in writing?'], note: 'Call before the due date. A plan agreed early is easier to get than one asked for after.' },
  utilities: { who: 'The utility (the number on the bill)', say: ['My income dropped this month and I can pay {pay} of the {due}.', 'Do you have a payment plan or a hardship program I can apply for?', 'Will my service stay on while the plan is in place?'], note: 'Ask for the hardship or payment-plan desk by name.' },
  health: { who: 'Your health insurer or pharmacy', say: ['I want to keep my cover. This month I can pay {pay} of the {due}.', 'Is there a grace period, and what date does it end?', 'Is there a lower-cost plan or a generic for this prescription?'], note: 'Ask what date cover would stop. That date is the one that matters.' },
  childcare: { who: 'Your childcare provider', say: ['I need this care to keep working. This month I can pay {pay} of the {due}.', 'Can I pay the other {gap} over the next few weeks?', 'Do you know of a subsidy or a sliding scale I could apply for?'], note: 'Providers hear this often. Ask early, before the bill is due.' },
  food: { who: 'Food comes before the calls below', say: ['Food is paid before any lender. There is no call to make for this one.'], note: 'A local food bank fills a gap for a month with no cost to the plan.' },
  transport: { who: 'Your car lender or insurer', say: ['I need the car to get to work. This month I can pay {pay} of the {due}.', 'Can you move the due date, or put this payment at the end of the loan?', 'Will this be reported as late if I pay on the new date?'], note: 'Lenders call it a deferral or an extension.' },
  minimums: { who: 'The card issuer or lender (the number on the back of the card)', say: ['I have had a drop in income. This month I can pay {pay} toward the minimum of {due}.', 'Do you have a hardship plan that lowers the payment or the rate for a few months?', 'Can the late fee be waived, and how will this month be reported?'], note: 'Ask for the hardship department. Write down the name, the date and what was agreed.' },
  rest: { who: 'Everything else', say: ['I am pausing this for now. Please cancel or hold it from today.', 'Is there a fee to pause, and what date does it start again?'], note: 'Subscriptions and extras pause first. They can come back in a month that has room.' },
};
const rcDollars = v => `$${Math.round(v).toLocaleString('en-US')}`;
// The script for one group of the triage, with the amounts filled in.
export function rcScript(group) {
  const s = RC_SCRIPTS[group?.cls] ?? RC_SCRIPTS.rest;
  const fill = t => t.replace('{pay}', rcDollars(group.paid)).replace('{due}', rcDollars(group.amount)).replace('{gap}', rcDollars(group.unpaid));
  return { who: s.who, say: s.say.map(fill), note: s.note };
}

// The scripts for the groups that come up short, or null while the words wait for Eli's review.
export function rcScriptsFor(triage, reviewed = RC_SCRIPTS_REVIEWED) {
  if (!reviewed || !triage) return null;
  return triage.groups.filter(g => g.unpaid > 0.5).map(g => ({ cls: g.cls, label: g.label, script: rcScript(g) }));
}

// ---------- the emergency fund refill ----------
// After money is used: what is missing, the months to put it back at `monthly`, and the month it is whole again.
// null when the target or the balance is not known. months is null when nothing goes back in yet.
export function rcRefill({ target = null, balance = null, monthly = null, nowAt = null } = {}) {
  if (target == null || balance == null) return null;
  const gap = Math.max(0, target - balance);
  if (gap === 0) return { target, balance, gap: 0, months: 0, ym: rcYm(nowAt), full: true, monthly };
  if (monthly == null || !(monthly > 0)) return { target, balance, gap, months: null, ym: null, full: false, monthly };
  const months = Math.ceil(gap / monthly);
  return { target, balance, gap, months, ym: rcAddMonths(rcYm(nowAt), months), full: false, monthly };
}

// ---------- the safe-to-fail line ----------
// A fun or experiment line. The plan counts its cap every month whether it is used or not, so it can run out with
// no effect on the plan. Spending past the cap is ordinary spending (over), and that part the plan does see.
export function rcSafeLine({ cap = null, spent = null } = {}) {
  if (cap == null) return null;
  const used = spent ?? 0;
  return { cap, spent, left: Math.max(0, cap - used), ranOut: spent != null && used >= cap, over: Math.max(0, used - cap), planCost: cap };
}

// ---------- the month ----------
// hard: a month to show the letter from the calm self in (the date moved later, the bills are more than the
// income, or the emergency fund was used and is not whole). done: nothing needs attention this month.
// open: how many things the app itself still asks for this month (payments to confirm, boxes to fill).
export function rcMonthState({ routes = [], triage = null, refill = null, open = 0 } = {}) {
  const moved = routes.filter(r => r && r.moved);
  const hard = moved.some(r => r.later || r.noDate) || !!(triage && triage.short > 0) || !!(refill && refill.gap > 0);
  const needs = [];
  if (triage && triage.short > 0) needs.push('triage');
  if (moved.length) needs.push('route');
  if (refill && refill.gap > 0) needs.push('refill');
  if (open > 0) needs.push('open');
  return { hard, done: needs.length === 0, needs };
}

// ---------- the audit that looks back (opt-in) ----------
// events: [{ id, what, kind, amount, tag ('mistake', 'unavoidable' or null), yearsAgo }].
// For each one: the cost then (amount); the cost over time (what that money would be worth by the end of the plan,
// `years` from today, at the plan's return after inflation, in today's dollars); FI days (the days of saving it
// took: the amount divided by what is put away in a day); and hours of work when the hourly pay is known. When a
// day of saving is zero or less there are no FI days, and the screens show hours of work in their place (measure).
// Totals by tag, the repeats (the same kind tagged mistake two times or more), and the mistake tax (the mistakes of
// the last 12 months as a share of a year of take-home pay).
export function rcAudit({ events = [], realReturn = null, years = null, perDay = null, hourly = null, yearIncome = null } = {}) {
  const grow = (amount, ago) => (realReturn == null || years == null ? null : amount * Math.pow(1 + realReturn, Math.max(0, years) + Math.max(0, ago ?? 0)));
  const rows = events.map(e => {
    const amount = e.amount ?? null;
    return { id: e.id, what: e.what, kind: e.kind ?? null, tag: e.tag ?? null, yearsAgo: e.yearsAgo ?? null, amount,
      later: amount == null ? null : grow(amount, e.yearsAgo),
      fiDays: amount == null || !(perDay > 0) ? null : amount / perDay, // no FI days when nothing is put away in a day (zero or less)
      hours: amount == null || !(hourly > 0) ? null : amount / hourly };
  });
  const sum = (list, k) => (list.some(r => r[k] == null) ? null : list.reduce((s, r) => s + r[k], 0));
  // a measure that cannot be worked out is empty for the total too, also when no event has the tag (empty is not zero)
  const can = { later: realReturn != null && years != null, fiDays: perDay > 0, hours: hourly > 0 };
  const total = tag => { const mine = rows.filter(r => r.tag === tag && r.amount != null); return { count: mine.length, cost: mine.reduce((s, r) => s + r.amount, 0), later: can.later ? sum(mine, 'later') : null, fiDays: can.fiDays ? sum(mine, 'fiDays') : null, hours: can.hours ? sum(mine, 'hours') : null }; };
  const kinds = new Map();
  for (const r of rows) if (r.tag === 'mistake' && r.amount != null && r.kind) { const k = kinds.get(r.kind) ?? { kind: r.kind, count: 0, cost: 0 }; k.count += 1; k.cost += r.amount; kinds.set(r.kind, k); }
  const lastYear = rows.filter(r => r.tag === 'mistake' && r.amount != null && r.yearsAgo != null && r.yearsAgo < 1).reduce((s, r) => s + r.amount, 0);
  return { rows, mistake: total('mistake'), unavoidable: total('unavoidable'), untagged: rows.filter(r => r.tag == null).length, open: rows.filter(r => r.amount == null).length,
    repeats: [...kinds.values()].filter(k => k.count >= 2).sort((a, b) => b.cost - a.cost),
    // which measure the screen shows next to the dollars: FI days, or hours of work when a day of saving is zero or less
    measure: perDay > 0 ? 'fiDays' : hourly > 0 ? 'hours' : null,
    tax: yearIncome > 0 ? lastYear / yearIncome : null, lastYear };
}
// The kinds of money event the audit offers by tap.
export const RC_KINDS = ['Late fee', 'Overdraft', 'Card interest', 'Impulse buy', 'Subscription not used', 'Car repair', 'Medical bill', 'Home repair', 'Lost income', 'Tax bill', 'Scam or fraud', 'Loan to someone', 'Other'];
