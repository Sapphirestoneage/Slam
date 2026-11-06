// SPDX-License-Identifier: AGPL-3.0-only
// The month model (build phase 6): what lands on the calendar, the budget passes for a month, and closing it.
// Pure: reads a household doc, never touches the DOM. Budget, calendar and close are views of these records (R117).
import { gatesOf, visible } from './gates.js';
import { weekdayDays, holidayInMonth, SHABBAT_SPEND_DAY } from './math/holidays.js';
import { myShare, withHome, categoryKeyOf, categoryName, CATEGORIES } from './math/spending.js';
import { payoffPlan } from './math/debt.js';
import { runningBalance, gutSpread } from './math/calendar.js';
import { inputsOf, metrics } from './math/metrics.js';
import { monthlyFrom, quarterlySetAside } from './math/income.js';
import { heldDates, seasonShifts } from './math/earnings.js';

// ---------- Dates (UTC, so a day is a day everywhere) ----------
export const ymOf = (d = new Date()) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
export const daysIn = ym => { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
export const dateOf = (ym, day) => `${ym}-${String(Math.min(Math.max(1, day), daysIn(ym))).padStart(2, '0')}`;
export function addMonths(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return ymOf(d);
}
export const monthName = (ym, style = 'long') => { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m - 1, 15)).toLocaleString('en-US', { month: style, year: 'numeric', timeZone: 'UTC' }); };
export const monthsBetween = (a, b) => { const [y1, m1] = a.split('-').map(Number); const [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); };
const dayMs = 86400000;
const toDay = s => Date.parse(`${s}T00:00:00Z`);
const isoOf = t => new Date(t).toISOString().slice(0, 10);
const weekday = s => new Date(toDay(s)).getUTCDay();

export const MARKS = ['Planned', 'Partial', 'Paid', "Didn't happen", 'Moved']; // R092 (Paid reads 'Got it' for money in)
export const GROUPS = ['Income', 'Bills', 'Debt', 'Savings', 'Maybe', 'Wins'];
const PAYS = { week: 52, '2 weeks': 26, 'twice a month': 24, month: 12 };
const ANCHOR = '2026-01-02'; // a Friday, used until a real payday is typed (marked as a guess)
const RISK = 200; // R142: a large amount on a variable date is a cash-flow risk

// Every day a repeating thing lands in a month.
function repeatDays(ym, { every, anchor = ANCHOR, days = null, day = 1 }) {
  const first = toDay(`${ym}-01`), last = toDay(dateOf(ym, 31));
  if (every === 'week' || every === '2 weeks') {
    const step = (every === 'week' ? 7 : 14) * dayMs;
    let t = toDay(anchor);
    if (t > first) t -= Math.ceil((t - first) / step) * step;
    else t += Math.floor((first - t) / step) * step;
    const out = [];
    for (; t <= last; t += step) if (t >= first) out.push(isoOf(t));
    return out;
  }
  if (every === 'twice a month') return [...new Set((days || [1, 15]).map(d => dateOf(ym, d)))]; // R097
  if (every === 'year') return [];
  return [dateOf(ym, day)];
}

// ---------- What lands on the calendar this month ----------
// B6.10: the Actual pass asks for the month's list once per row and column; build it once per change.
const CACHE = new WeakMap();
export function instances(doc, ref, ym, opts = {}) {
  const key = `${doc._rev ?? 0}|${doc.updatedAt}|${ym}|${ymOf(opts.now || new Date())}|${(opts.autoWins || []).length}`;
  let byDoc = CACHE.get(doc);
  const version = `${doc._rev ?? 0}|${doc.updatedAt}`;
  if (!byDoc || byDoc.version !== version) { byDoc = { version, lists: new Map() }; CACHE.set(doc, byDoc); }
  if (!byDoc.lists.has(key)) byDoc.lists.set(key, buildInstances(doc, ref, ym, opts));
  return byDoc.lists.get(key);
}
function buildInstances(doc, ref, ym, { now = new Date(), autoWins = [] } = {}) {
  const g = gatesOf(doc.profile, doc.client);
  const live = visible(doc.records, g, ref);
  const cal = doc.spending?.calendar || {};
  const marks = cal.marks || {};
  const out = [];
  const push = (rec, x) => {
    const key = `${rec.id}${x.keyTag ? `:${x.keyTag}` : ''}@${x.date}`; // batch 27: a row's cash tips are their own entries
    const mark = marks[key] || {};
    const status = mark.status || 'Planned';
    out.push({ ...x, key, recId: rec.id, origDate: x.date, date: status === 'Moved' && mark.date ? mark.date : x.date,
      status, paid: mark.paid ?? null, note: mark.note ?? null });
  };
  const roommates = doc.profile?.roommates ?? 0;
  const cards = new Map(live.filter(r => r.kind === 'debt' && r.type === 'Credit card').map(r => [r.id, r]));

  const inputs = inputsOf(doc, ref, now);
  // A month ahead is read as of that month (batch 15, item 6): a covered bill that becomes yours, a line that starts.
  const later = ym > ymOf(now) ? new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5)) - 1, 15, 12)) : now;
  // Paychecks (green), by pay frequency. Unemployment lands weekly until its end date (batch 15, item 13). Self-
  // employment pay lands before tax; its tax goes out on the quarterly due dates (batch 15, item 3).
  for (const x of inputs.income) {
    const r = x.r;
    const monthly = x.takeHome?.value;
    if (monthly == null) continue;
    const every = r.values.payFrequency || (x.benefit ? 'week' : 'month');
    const setAside = x.taxType === '1099' && x.tax ? x.tax.total / 12 : 0;
    // Batch 27: cash tips kept after the tip-out and fees land week by week, apart from the paycheck (a shortfall, when
    // the fees run over the cash, comes off the paycheck instead).
    const extra = x.extra ?? 0, cashWeekly = extra > 0.005;
    const season = (() => { const ss = seasonShifts(r.values); return ss && r.values.shiftsWeek ? ss[Number(ym.slice(5)) - 1] / r.values.shiftsWeek : 1; })(); // a slow or busy month scales the shift job
    const per = (monthly - (cashWeekly ? extra : 0) + setAside) * 12 / (PAYS[every] || 12) * season;
    const guessDate = !r.values.nextPayday && !r.values.payDays && !r.values.payDay;
    const anchor = r.values.nextPayday || (x.benefit && r.values.benefitStart) || ANCHOR;
    // A platform payout lands after its hold: each payout date moves later by the hold days (js/math/earnings.js).
    const hold = x.platform?.holdDays ?? 0;
    const dates = heldDates(ym, hold, m => repeatDays(m, { every, anchor, days: r.values.payDays, day: r.values.payDay || 1 }));
    for (const { date, earned } of dates) {
      if (x.benefit?.end && date > x.benefit.end) continue;
      if (x.benefit?.start && date < x.benefit.start) continue;
      push(r, { kind: 'income', group: 'Income', name: r.name || r.type || 'Paycheck', date, planned: per, guessDate: guessDate && !(x.benefit && r.values.benefitStart), ...(hold ? { hold, earned } : {}) });
    }
    if (cashWeekly) for (const date of repeatDays(ym, { every: 'week', anchor: ANCHOR })) {
      push(r, { kind: 'income', group: 'Income', name: `${r.name || r.type || 'Job'}: cash tips kept`, date, planned: extra * 12 / 52 * season, guessDate: true, cash: true, keyTag: 'cash' });
    }
  }
  const q = quarterlySetAside(inputs.householdTax, ref, { year: Number(ym.slice(0, 4)), paid: 0 });
  if (q?.quarterly > 0) {
    for (const md of ref.tax.quarterlyDue || []) {
      if (md.slice(0, 2) !== ym.slice(5)) continue;
      out.push({ key: `tax:quarterly@${ym}-${md.slice(3)}`, recId: null, kind: 'tax', group: 'Bills', name: 'Quarterly estimated tax', date: `${ym}-${md.slice(3)}`, origDate: `${ym}-${md.slice(3)}`, planned: -q.quarterly, status: marks[`tax:quarterly@${ym}-${md.slice(3)}`]?.status || 'Planned', paid: null, note: null });
    }
  }
  // Bills: fixed date on its day; variable date spread week by week (R140). On a card: shown on the card (R101).
  // A line flagged as the same payment as a debt or a paycheck premium stays off the calendar too (counted once).
  for (const r of live.filter(x => x.kind === 'bill' && !inputs.dupOf[x.id])) {
    if (r.status === 'Not for me') continue;
    const line = withHome({ ...r, ...r.values }, doc.profile);
    if (r.values.irregular) { // R051: the whole yearly cost in its month
      if (r.amount == null || !r.values.monthDue) continue;
      const mm = String(r.values.monthDue).padStart(2, '0');
      if (ym.slice(5) !== mm) continue;
      const share = r.values.myShare ?? r.amount;
      push(r, { kind: 'yearly', group: 'Bills', name: r.name || r.values.category || 'Yearly cost', date: dateOf(ym, r.values.dueDay || 1), planned: -share, lineId: r.id, guessDate: !r.values.dueDay, onCard: cards.get(r.paidWith)?.name ?? null });
      continue;
    }
    if (r.covers?.months) { // cash basis: the month it was paid (R122)
      if (!r.covers.datePaid?.startsWith(ym) || r.amount == null) continue;
      push(r, { kind: 'bill', group: 'Bills', name: r.name || 'Prepaid', date: r.covers.datePaid, planned: -r.amount, lineId: r.id, onCard: cards.get(r.paidWith)?.name ?? null });
      continue;
    }
    const monthly = myShare(line, { roommates, now: later }).value;
    if (!monthly) continue;
    const group = r.values.draftt === 'Retirement' || /saving/i.test(r.values.category || '') ? 'Savings' : 'Bills';
    const onCard = cards.get(r.paidWith)?.name ?? null;
    if (r.values.timing === 'Weekly') { // a weekly line lands on its weekday (Shabbat: bought Thursday, used Friday night and Saturday)
      const days = weekdayDays(ym, r.values.weekday ?? SHABBAT_SPEND_DAY);
      for (const d of days) push(r, { kind: 'bill', group, name: r.name || r.values.category, date: d, planned: -monthly / days.length, lineId: r.id, spread: true, onCard });
      continue;
    }
    if (r.values.timing === 'Variable date' || (!r.values.dueDay && r.values.amountType !== 'Fixed')) { // item 29: an undated variable line is spending money through the month, not a day-1 guess
      const weeks = [1, 8, 15, 22, 29].filter(d => d <= daysIn(ym));
      for (const d of weeks) push(r, { kind: 'bill', group, name: r.name || r.values.category, date: dateOf(ym, d), planned: -monthly / weeks.length, lineId: r.id, spread: true, onCard, risk: monthly >= RISK });
    } else {
      push(r, { kind: 'bill', group, name: r.name || r.values.category, date: dateOf(ym, Number(r.values.dueDay) || 1), planned: -monthly, lineId: r.id, guessDate: !r.values.dueDay, onCard });
    }
  }
  // Batch 12 (item 2): while spending is the gut number, the part no real line covers is spending money, week by week.
  const gs = gutSpread(inputs, myShare), allIn = live.find(r => r.kind === 'spending' && r.type === 'All in');
  if (gs?.left > 0 && allIn) {
    const weeks = [1, 8, 15, 22, 29].filter(d => d <= daysIn(ym));
    for (const d of weeks) push(allIn, { kind: 'gut', group: 'Bills', name: gs.name, date: dateOf(ym, d), planned: -gs.left / weeks.length, spread: true, gut: true });
  }
  // Debt payments on their due day, every month (R050). A card paid in full pulls the bills charged to it (R101).
  for (const d of inputs.debts) {
    const r = doc.records.find(x => x.id === d.id);
    let pay = d.inFull ? out.filter(i => i.onCard && cards.get(r.id)?.name === i.onCard).reduce((s, i) => s - i.planned, 0) || null : d.payment;
    if (!pay || !d.balance) continue;
    push(r, { kind: 'debt', group: 'Debt', name: `${d.name} payment`, date: dateOf(ym, Number(r.values.dueDay) || 1), planned: -pay, guessDate: !r.values.dueDay });
  }
  // Next 12 months events land in their month.
  // A holiday block (M78) lands on the eve of its holiday, whichever year is on screen; the rest on their day.
  for (const r of live.filter(x => x.kind === 'event' && x.amount != null)) {
    const hd = r.values.holiday ? holidayInMonth(r.values.holiday, ym) : null;
    const date = hd ? hd.eve : r.values.month === ym ? dateOf(ym, r.values.day || 1) : null;
    if (!date) continue;
    push(r, { kind: 'event', group: 'Bills', name: r.name || hd?.name || 'Event', date, planned: -r.amount });
  }
  // Entries typed on the calendar, with repeats.
  for (const r of live.filter(x => x.kind === 'entry' && x.values.date)) {
    const dir = r.values.direction || 'Out';
    const amt = r.amount ?? 0;
    const start = r.values.date;
    const ends = r.values.endsOn || null;
    const rep = r.values.repeats || 'Never';
    let dates = [];
    if (rep === 'Never') dates = start.startsWith(ym) ? [start] : [];
    else if (rep === 'Yearly') dates = start.slice(5, 7) === ym.slice(5) && start.slice(0, 7) <= ym ? [dateOf(ym, Number(start.slice(8)))] : [];
    else {
      const every = { Weekly: 'week', 'Every 2 weeks': '2 weeks', 'Twice a month': 'twice a month', Monthly: 'month' }[rep];
      dates = repeatDays(ym, { every, anchor: start, day: Number(start.slice(8)), days: r.values.payDays });
    }
    for (const date of dates.filter(x => x >= start && (!ends || x <= ends))) {
      push(r, { kind: 'entry', group: dir === 'Maybe' ? 'Maybe' : dir === 'In' ? 'Income' : r.values.category === 'Savings' ? 'Savings' : 'Bills',
        name: r.name || (dir === 'In' ? 'Money in' : 'Money out'), date, planned: dir === 'Out' ? -amt : amt, maybe: dir === 'Maybe' });
    }
  }
  // Wins: typed ones, then payoffs and milestones the projection reaches (R095).
  for (const r of live.filter(x => x.kind === 'win' && x.values.date?.startsWith(ym))) push(r, { kind: 'win', group: 'Wins', name: r.name || 'A win', date: r.values.date, planned: 0 });
  if (cal.autoWins !== false) {
    for (const w of [...debtWins(inputs, now, debtPlanOf(doc, ref, now)), ...autoWins]) if (w.date.startsWith(ym)) out.push({ key: `auto:${w.name}@${w.date}`, recId: null, kind: 'win', group: 'Wins', name: w.name, date: w.date, origDate: w.date, planned: 0, status: 'Planned', auto: true });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || b.planned - a.planned);
}

// Payoff dates from the plan become wins on the calendar.
// Batch 13 (answer to Q221): the wins read the one debt plan (m.debtPlan: the surplus, freed payments, FOO step 1
// first), so "Paid off" and "Debt-free" land on the same month as Home, Debt and the FOO. plan: m.debtPlan; without
// it (an older caller) the payments alone are used.
const PLANS = new WeakMap();
export function debtPlanOf(doc, ref, now = new Date()) {
  const k = `${doc._rev ?? 0}|${ymOf(now)}`, c = PLANS.get(doc);
  if (c?.k === k) return c.p;
  const p = metrics(doc, ref, { now }).debtPlan ?? null;
  PLANS.set(doc, { k, p });
  return p;
}
export function debtWins(inputs, now = new Date(), plan = null) {
  const ds = inputs.debts.filter(d => !d.inFull && d.balance > 0 && d.apr != null && d.payment != null);
  if (!ds.length) return [];
  const p = plan?.debts ? plan : payoffPlan(ds, { order: inputs.debtOrder });
  const base = ymOf(now);
  const wins = p.debts.filter(d => d.paidOffMonth).map(d => ({ name: `Paid off: ${d.name}`, date: dateOf(addMonths(base, d.paidOffMonth), 1) }));
  if (p.months) wins.push({ name: 'Debt-free', date: dateOf(addMonths(base, p.months), 1) });
  return wins;
}

// What an instance moves the checking balance by, and on which day.
export function moneyOf(i, { countMaybe = false } = {}) {
  if (i.onCard || i.kind === 'win') return [];
  if (i.maybe && !countMaybe) return [];
  if (i.status === "Didn't happen") return [];
  if (i.status === 'Paid') return [{ date: i.date, amount: i.paid ?? i.planned }];
  if (i.status === 'Partial' && i.paid != null) return [{ date: i.date, amount: i.paid }, { date: i.date, amount: i.planned - i.paid }];
  return [{ date: i.date, amount: i.planned }];
}

// The starting balance: what was typed, else checking, else all cash (Mockup: pulled from checking, editable).
export function startBalance(doc, ref, now = new Date()) {
  const cal = doc.spending?.calendar || {};
  if (cal.start != null) return { value: cal.start, ym: cal.startYm || ymOf(now), typed: true };
  const x = inputsOf(doc, ref, now);
  const checking = x.accounts.filter(a => /checking/i.test(a.type || '') && a.value != null);
  const v = checking.length ? checking.reduce((s, a) => s + a.value, 0) : x.cash;
  return { value: v, ym: ymOf(now), typed: false };
}

// Running balance for one or more months, chained from the start month (M60). Months before the start have none.
// low (overnight I): the line a day is flagged under; the calendar passes the Buffer layer's target when none is typed.
export function balances(doc, ref, ym, months = 1, { now = new Date(), autoWins = [], low: lowLine = null } = {}) {
  const st = startBalance(doc, ref, now);
  const cal = doc.spending?.calendar || {};
  const low = cal.low ?? lowLine ?? ref.defaults.lowBalanceLine;
  if (st.value == null) return { needs: ['a starting balance'], low };
  if (ym < st.ym) return { needs: [`a month from ${monthName(st.ym)} on`], low };
  let b = st.value;
  // Carry forward from the start month to the first month asked for.
  for (let m = st.ym; m < ym; m = addMonths(m, 1)) {
    const r = monthRun(doc, ref, m, b, { now, autoWins, countMaybe: cal.countMaybe, before: m === st.ym && !st.typed ? isoOf(now.getTime()) : null });
    b = r.rows[r.rows.length - 1].balance;
  }
  const rows = [];
  const insts = [];
  // Batch 20 (Rocket Surgery): a start balance read off today's checking already holds what left it earlier this
  // month, so days before today do not take it out again ("Cash dips on Sun, Nov 1" was a bill already paid).
  const already = st.typed ? null : isoOf(now.getTime());
  for (let k = 0; k < months; k++) {
    const m = addMonths(ym, k);
    const r = monthRun(doc, ref, m, b, { now, autoWins, countMaybe: cal.countMaybe, before: m === st.ym ? already : null });
    rows.push(...r.rows); insts.push(...r.list);
    b = r.rows[r.rows.length - 1].balance;
  }
  const lowDays = rows.filter(r => r.balance < low && (!already || r.date >= already)); // a day already gone is not a warning
  return { rows, list: insts, low, firstLow: lowDays[0] || null, lowest: rows.reduce((a, r) => (r.balance < a.balance ? r : a), rows[0]), start: st };
}
function monthRun(doc, ref, ym, start, opts) {
  const list = instances(doc, ref, ym, opts);
  const entries = list.flatMap(i => moneyOf(i, opts)).filter(e => !opts.before || e.date >= opts.before);
  const r = runningBalance({ start, from: `${ym}-01`, to: dateOf(ym, 31), entries });
  return { rows: r.value, list };
}

// R098: months where every-2-weeks pay lands three times.
export function bonusPaycheck(list) {
  const byRec = new Map();
  for (const i of list.filter(x => x.kind === 'income' && !x.cash)) byRec.set(i.recId, (byRec.get(i.recId) || 0) + 1);
  return [...byRec.values()].some(n => n === 3);
}

// ---------- Budget passes for a month (R130 to R136) ----------
export const PASSES = ['Gut', 'Basics', 'Rough', 'Estimate', 'Actual'];
const monthDoc = (doc, ym) => doc.spending?.months?.[ym] || {};

// Rough = the line's standing number (its monthly share). Estimate starts from Rough until confirmed (R136).
export function roughOf(doc, line) {
  if (line.status === 'Not for me') return 0;
  return myShare(withHome({ ...line, ...line.values }, doc.profile), { roommates: doc.profile?.roommates ?? 0 }).value;
}
export function estimateOf(doc, ym, line) {
  const e = monthDoc(doc, ym).lines?.[line.id]?.estimate;
  if (e != null) return { value: e, fromRough: false };
  const r = roughOf(doc, line);
  return { value: r, fromRough: r != null };
}
// Answer 89: the lines whose plan for this month differs from their usual monthly amount (a typed plan only).
export function planDiffs(doc, ym, lines, payFrequency = null) {
  const out = new Set();
  for (const r of lines) {
    const e = monthDoc(doc, ym).lines?.[r.id]?.estimate;
    if (e == null) continue;
    const usual = r.amount == null ? null : monthlyFrom(r.amount, r.per, payFrequency).value;
    if (usual == null || Math.abs(e - usual) > 0.5) out.add(r.id);
  }
  return out;
}
// Actual: what was typed at close, else what the calendar marked Paid (R052). Didn't happen counts as $0 (R094).
export function actualOf(doc, ym, line, list) {
  const typed = monthDoc(doc, ym).lines?.[line.id]?.actual;
  if (typed != null) return { value: typed, from: 'typed' };
  const mine = list.filter(i => i.lineId === line.id);
  const done = mine.filter(i => i.status === 'Paid' || i.status === 'Partial' || i.status === "Didn't happen");
  if (!done.length) return { value: null, from: null };
  const v = done.reduce((s, i) => s + (i.status === "Didn't happen" ? 0 : -(i.paid ?? i.planned)), 0);
  return { value: v, from: 'calendar', complete: done.length === mine.length };
}

// Everything the budget and close screens show for one month.
// gutCats (batch 33, Rocket Surgery finding 12): Month end also closes the categories that hold only the gut number,
// one row each (id cat:<key>): the plan is its gut split (or a plan typed or carried for the month), the actual is the
// one typed on Month end, else what its lines got (an import, the calendar). Its starter lines fold into it.
export function monthView(doc, ref, ym, { now = new Date(), gutCats = false } = {}) {
  const g = gatesOf(doc.profile, doc.client);
  const x = inputsOf(doc, ref, now);
  const dupOf = x.dupOf; // the same payment as a debt or a premium: counted there, once
  const md = monthDoc(doc, ym);
  const split = gutCats && (md.gut ?? gutOf(doc)) != null ? x.gutSplit ?? {} : {};
  const all = visible(doc.records, g, ref).filter(r => r.kind === 'bill' && !dupOf[r.id]);
  const folded = l => split[categoryKeyOf(l)] != null && md.lines?.[l.id]?.estimate == null && !(roughOf(doc, l) > 0); // a starter line of a gut-only category
  const lines = all.filter(l => !folded(l));
  const list = instances(doc, ref, ym, { now });
  const catRows = Object.entries(split).map(([key, plan]) => {
    const id = `cat:${key}`, own = all.filter(l => folded(l) && categoryKeyOf(l) === key && l.status !== 'Not for me');
    const e = md.lines?.[id]?.estimate, typed = md.lines?.[id]?.actual;
    const acts = own.map(l => actualOf(doc, ym, l, list)).filter(a => a.value != null);
    const actual = typed != null ? typed : acts.length ? acts.reduce((s2, a) => s2 + a.value, 0) : null;
    const estimate = e ?? plan;
    return { line: { id, name: categoryName(key), values: { category: categoryName(key), draftt: key, amountType: 'Variable' } }, gutCat: key, rough: plan, estimate, fromRough: false, fromGut: e == null,
      actual, actualFrom: typed != null ? 'typed' : own.some(l => md.lines?.[l.id]?.actualFrom === 'csv') ? 'csv' : acts.length ? 'calendar' : null,
      diff: actual == null ? null : actual - estimate, variable: true, priceUp: false };
  });
  const rows = [...lines.map(l => {
    const est = estimateOf(doc, ym, l);
    const act = actualOf(doc, ym, l, list);
    const diff = est.value != null && act.value != null ? act.value - est.value : null;
    return { line: l, rough: roughOf(doc, l), estimate: est.value, fromRough: est.fromRough, actual: act.value, actualFrom: act.from, diff,
      variable: l.values.amountType !== 'Fixed', priceUp: l.values.amountType === 'Fixed' && diff != null && diff > 0.5 }; // R141
  }).filter(r => r.line.status !== 'Not for me'), ...catRows];
  const sum = f => rows.reduce((s, r) => s + (f(r) ?? 0), 0);
  const gaps = rows.filter(r => r.actual == null && (r.estimate ?? 0) > 0);
  // R145: variable lines' misses first, then by size.
  const misses = rows.filter(r => r.diff != null && Math.abs(r.diff) >= 1)
    .sort((a, b) => (b.variable - a.variable) || Math.abs(b.diff) - Math.abs(a.diff));
  return {
    ym, rows, list, gaps, misses, closed: !!md.closed, closedAt: md.closedAt ?? null,
    gut: md.gut ?? gutOf(doc),
    totals: { rough: sum(r => r.rough), estimate: sum(r => r.estimate), actual: rows.some(r => r.actual != null) ? sum(r => r.actual) : null,
      fixed: rows.filter(r => !r.variable).reduce((s, r) => s + (r.estimate ?? 0), 0), variable: rows.filter(r => r.variable).reduce((s, r) => s + (r.estimate ?? 0), 0) },
  };
}

// Batch 22 (M25, by category): the month's plan and actual per Budget category (the category rows: Accommodation, Food,
// ...), each the sum of its lines. A category shows once a line in it has a plan or an actual; its actual is blank
// until one of its lines has one. Lines with a plan and no actual count their plan only.
export function byCategory(view) {
  const out = new Map();
  for (const r of view.rows) {
    if (!((r.estimate ?? 0) > 0) && r.actual == null) continue;
    const key = categoryKeyOf(r.line);
    const c = out.get(key) ?? { key, name: categoryName(key), plan: 0, actual: null, lines: 0, withActual: 0 };
    c.plan += r.estimate ?? 0; c.lines++;
    if (r.actual != null) { c.actual = (c.actual ?? 0) + r.actual; c.withActual++; }
    out.set(key, c);
  }
  const round = v => (v == null ? null : Math.round(v * 100) / 100);
  return [...out.values()].sort((a, b) => CATEGORIES.indexOf(a.key) - CATEGORIES.indexOf(b.key))
    .map(c => ({ ...c, plan: round(c.plan), actual: round(c.actual), diff: c.actual == null ? null : round(c.actual - c.plan) }));
}

// The Gut pass is the one all-in number (R131); Fast Track writes it too.
export const gutRecord = doc => doc.records.find(r => r.kind === 'spending' && r.type === 'All in') || null;
export const gutOf = doc => gutRecord(doc)?.amount ?? null;

// Close: lock the month, keep the gut vs actual for accuracy, and carry variable misses to next month (Mockup: Close row).
export function closeMonth(store, ref, ym, { now = new Date() } = {}) {
  const v = monthView(store.doc, ref, ym, { now, gutCats: true }); // batch 33: the gut-only categories close too
  const next = addMonths(ym, 1);
  return store.transaction(`Closed ${monthName(ym)}`, () => {
    for (const r of v.rows) {
      if (r.actual == null) store.setIn('spending', ['months', ym, 'lines', r.line.id, 'actual'], 0); // a gap closes as $0 so the miss shows
      if (r.variable && r.actual != null && store.getIn('spending', ['months', next, 'lines', r.line.id, 'estimate']) == null && Math.abs(r.actual - (r.estimate ?? 0)) >= 1) {
        store.setIn('spending', ['months', next, 'lines', r.line.id, 'estimate'], Math.round(r.actual));
      }
    }
    const after = monthView(store.doc, ref, ym, { now, gutCats: true });
    store.setIn('spending', ['months', ym, 'summary'], { gut: v.gut, estimate: after.totals.estimate, actual: after.totals.actual });
    store.setIn('spending', ['months', ym, 'closed'], true);
    store.setIn('spending', ['months', ym, 'closedAt'], now.toISOString());
  });
}
export function reopenMonth(store, ym) { return store.setIn('spending', ['months', ym, 'closed'], false, `Reopened ${monthName(ym)}`); }
export function carry(store, ym, lineId, amountValue) {
  return store.setIn('spending', ['months', addMonths(ym, 1), 'lines', lineId, 'estimate'], Math.round(amountValue), 'Carried to next month');
}

// Closed months for gut accuracy (M26) and history.
export function closedMonths(doc) {
  return Object.entries(doc.spending?.months || {}).filter(([, m]) => m.closed && m.summary)
    .map(([ym, m]) => ({ ym, guess: m.summary.gut, actual: m.summary.actual, estimate: m.summary.estimate })).sort((a, b) => a.ym.localeCompare(b.ym));
}

// L (overnight), answer 171: months closed in a row, counted back from last month (this month counts once closed),
// with one grace month per calendar year: a missed month inside the run is forgiven once in each year it falls in.
export function closeStreak(doc, now = new Date()) {
  const closed = new Set(closedMonths(doc).map(m => m.ym));
  const thisYm = ymOf(now);
  let ym = closed.has(thisYm) ? thisYm : addMonths(thisYm, -1);
  let months = 0, last = null, first = null;
  const graceYears = [];
  for (let i = 0; i < 240; i++) {
    const year = ym.slice(0, 4);
    if (closed.has(ym)) { months += 1; last ??= ym; first = ym; }
    else if (months > 0 && !graceYears.includes(year) && closed.has(addMonths(ym, -1))) { graceYears.push(year); }
    else break;
    ym = addMonths(ym, -1);
  }
  const grace = graceYears.length;
  return { months, graceUsed: grace, graceYears, first, last, words: months ? `${months} ${months === 1 ? 'month' : 'months'} in a row${grace ? ` (grace month used in ${graceYears.join(', ')})` : ''}` : 'No closed months yet' };
}

// Item 29: the week-by-week spread lines of a month fold into one bar per week ("Spending money: -$X this week"),
// expandable by category; dated bills keep their days. list: the month's instances. Returns the list with the spread
// items replaced by one bar per week (kind 'spread', parts: the lines behind it).
export function collapseSpread(list) {
  const out = [], weeks = new Map();
  for (const i of list) {
    if (!i.spread) { out.push(i); continue; }
    if (!weeks.has(i.date)) weeks.set(i.date, { kind: 'spread', group: i.group, name: 'Spending money', date: i.date, origDate: i.date, key: `spread:${i.date}`, status: 'Planned', planned: 0, parts: [], weekly: true });
    const w = weeks.get(i.date); w.planned += i.planned; w.parts.push(i);
  }
  for (const w of weeks.values()) { w.parts.sort((a, b) => a.planned - b.planned); out.push(w); }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
// A day's totals by type, for the month view's one-line summary: only the types with activity.
export function dayTotals(items) {
  const t = {};
  for (const i of items) { if (i.kind === 'win') continue; const k = i.group === 'Income' ? 'in' : i.group === 'Debt' ? 'debt' : i.group === 'Savings' ? 'save' : i.group === 'Maybe' ? 'maybe' : 'out'; t[k] = (t[k] ?? 0) + (i.status === 'Paid' && i.paid != null ? i.paid : i.planned); }
  return t;
}

// Calendar mark (R091 to R094).
export function mark(store, key, patch) {
  const cur = store.getIn('spending', ['calendar', 'marks', key]) || {};
  const next = { ...cur, ...patch };
  if (next.status === 'Planned') return store.setIn('spending', ['calendar', 'marks', key], next.bucket ? { bucket: next.bucket } : undefined, 'Back to planned'); // a chosen bucket stays
  return store.setIn('spending', ['calendar', 'marks', key], next, patch.status ? `Marked ${patch.status}` : 'Edit');
}

// ---------- The Bills list (batch 15, item 9; Monarch recurring, Rocket Money subscriptions) ----------
// One list of every repeating charge: Budget lines that repeat on a day or are fixed (bills, subscriptions), yearly
// costs, debt payments and insurance premiums paid from the budget. Each: amount, how often, the next date, paid with,
// and Keep or Try to cut (stored as decision Keep or Cancel, like the Budget's Looking for savings). By next date.
export function recurringBills(doc, ref, now = new Date()) {
  const x = inputsOf(doc, ref, now);
  const live = visible(doc.records, gatesOf(doc.profile, doc.client), ref);
  const byId = new Map(live.map(r => [r.id, r]));
  const today = now.toISOString().slice(0, 10), here = ymOf(now);
  const nextDay = day => { const d = dateOf(here, day); return d >= today ? d : dateOf(addMonths(here, 1), day); };
  const payer = r => { const p = r?.paidWith; if (!p) return null; const q = byId.get(p); return q ? q.name || q.type : p === 'card' ? 'Credit card' : p === 'checking' ? 'Checking' : null; };
  const out = [];
  for (const l of x.typedLines) {
    if (x.dupOf[l.id] || l.status === 'Not for me') continue;
    const r = byId.get(l.id);
    if (!r) continue;
    const monthly = myShare(l, { roommates: x.roommates, now }).value;
    if (r.values.irregular) {
      if (r.amount == null) continue;
      const mo = Number(r.values.monthDue) || null;
      const ym = mo ? `${now.getUTCFullYear()}-${String(mo).padStart(2, '0')}` : null;
      const next = ym ? (dateOf(ym, r.values.dueDay || 1) >= today ? dateOf(ym, r.values.dueDay || 1) : dateOf(`${now.getUTCFullYear() + 1}-${String(mo).padStart(2, '0')}`, r.values.dueDay || 1)) : null;
      out.push({ id: r.id, kind: 'bill', name: r.name || r.values.category || 'Yearly cost', amount: r.values.myShare ?? r.amount, often: 'Yearly', monthly: (r.values.myShare ?? r.amount) / 12, next, paidWith: payer(r), decision: r.values.decision ?? null, cut: true });
      continue;
    }
    const repeats = r.values.amountType === 'Fixed' || r.values.dueDay || r.values.category === 'Subscriptions' || r.values.draftt === 'Bills';
    if (!repeats || !monthly || r.values.timing === 'Variable date' || r.values.timing === 'Spread out') continue;
    if (r.values.timing === 'Weekly') { const days = weekdayDays(here, r.values.weekday ?? SHABBAT_SPEND_DAY).filter(d => d >= today); out.push({ id: r.id, kind: 'bill', name: r.name || r.values.category, amount: monthly * 12 / 52, often: 'Weekly', monthly, next: days[0] ?? null, paidWith: payer(r), decision: r.values.decision ?? null, cut: true }); continue; }
    const often = r.per === 'year' ? 'Yearly' : r.per === 'quarter' ? 'Every 3 months' : 'Monthly';
    out.push({ id: r.id, kind: 'bill', name: r.name || r.values.category || 'Bill', amount: often === 'Monthly' ? monthly : r.amount, often, monthly, next: r.values.dueDay ? nextDay(Number(r.values.dueDay)) : null, paidWith: payer(r), decision: r.values.decision ?? null, cut: true });
  }
  for (const d of x.debts) {
    if (d.inFull || !d.payment || !(d.balance > 0)) continue;
    const r = byId.get(d.id);
    out.push({ id: d.id, kind: 'debt', name: `${d.name} payment`, amount: d.payment, often: 'Monthly', monthly: d.payment, next: r?.values.dueDay ? nextDay(Number(r.values.dueDay)) : null, paidWith: payer(r), decision: null, cut: false });
  }
  for (const r of live.filter(q => q.kind === 'coverage' && q.amount != null && q.values.have !== "Don't")) {
    if ((r.values.paidFrom ?? (r.per === 'paycheck' ? 'Paycheck' : null)) === 'Paycheck') continue; // taken from the paycheck, not a bill
    const monthly = monthlyFrom(r.amount, r.per ?? 'month').value;
    out.push({ id: r.id, kind: 'coverage', name: `${r.name || r.type} premium`, amount: r.amount, often: r.per === 'year' ? 'Yearly' : 'Monthly', monthly, next: r.values.dueDay ? nextDay(Number(r.values.dueDay)) : null, paidWith: payer(r), decision: r.values.decision ?? null, cut: true });
  }
  out.sort((a, b) => (a.next ?? '9999').localeCompare(b.next ?? '9999') || b.monthly - a.monthly);
  return { items: out, monthly: out.reduce((s, i) => s + (i.monthly ?? 0), 0), toCut: out.filter(i => i.decision === 'Cancel').reduce((s, i) => s + (i.monthly ?? 0), 0) };
}
