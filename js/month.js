// The month model (build phase 6): what lands on the calendar, the budget passes for a month, and closing it.
// Pure: reads a household doc, never touches the DOM. Budget, calendar and close are views of these records (R117).
import { gatesOf, visible } from './gates.js';
import { myShare } from './math/spending.js';
import { payoffPlan } from './math/debt.js';
import { runningBalance } from './math/calendar.js';
import { inputsOf } from './math/metrics.js';

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
export function instances(doc, ref, ym, { now = new Date(), autoWins = [] } = {}) {
  const g = gatesOf(doc.profile, doc.client);
  const live = visible(doc.records, g, ref);
  const cal = doc.spending?.calendar || {};
  const marks = cal.marks || {};
  const out = [];
  const push = (rec, x) => {
    const key = `${rec.id}@${x.date}`;
    const mark = marks[key] || {};
    const status = mark.status || 'Planned';
    out.push({ ...x, key, recId: rec.id, origDate: x.date, date: status === 'Moved' && mark.date ? mark.date : x.date,
      status, paid: mark.paid ?? null, note: mark.note ?? null });
  };
  const roommates = doc.profile?.roommates ?? 0;
  const cards = new Map(live.filter(r => r.kind === 'debt' && r.type === 'Credit card').map(r => [r.id, r]));

  const inputs = inputsOf(doc, ref, now);
  // Paychecks (green), by pay frequency.
  for (const x of inputs.income) {
    const r = x.r;
    const monthly = x.takeHome?.value;
    if (monthly == null) continue;
    const every = r.values.payFrequency || 'month';
    const per = monthly * 12 / (PAYS[every] || 12);
    const guessDate = !r.values.nextPayday && !r.values.payDays && !r.values.payDay;
    for (const date of repeatDays(ym, { every, anchor: r.values.nextPayday || ANCHOR, days: r.values.payDays, day: r.values.payDay || 1 })) {
      push(r, { kind: 'income', group: 'Income', name: r.name || r.type || 'Paycheck', date, planned: per, guessDate });
    }
  }
  // Bills: fixed date on its day; variable date spread week by week (R140). On a card: shown on the card (R101).
  for (const r of live.filter(x => x.kind === 'bill')) {
    if (r.status === 'Not for me') continue;
    const line = { ...r, ...r.values };
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
    const monthly = myShare(line, { roommates }).value;
    if (!monthly) continue;
    const group = r.values.draftt === 'Retirement' || /saving/i.test(r.values.category || '') ? 'Savings' : 'Bills';
    const onCard = cards.get(r.paidWith)?.name ?? null;
    if (r.values.timing === 'Variable date') {
      const weeks = [1, 8, 15, 22, 29].filter(d => d <= daysIn(ym));
      for (const d of weeks) push(r, { kind: 'bill', group, name: r.name || r.values.category, date: dateOf(ym, d), planned: -monthly / weeks.length, lineId: r.id, spread: true, onCard, risk: monthly >= RISK });
    } else {
      push(r, { kind: 'bill', group, name: r.name || r.values.category, date: dateOf(ym, Number(r.values.dueDay) || 1), planned: -monthly, lineId: r.id, guessDate: !r.values.dueDay, onCard });
    }
  }
  // Debt payments on their due day, every month (R050). A card paid in full pulls the bills charged to it (R101).
  for (const d of inputs.debts) {
    const r = doc.records.find(x => x.id === d.id);
    let pay = d.inFull ? out.filter(i => i.onCard && cards.get(r.id)?.name === i.onCard).reduce((s, i) => s - i.planned, 0) || null : d.payment;
    if (!pay || !d.balance) continue;
    push(r, { kind: 'debt', group: 'Debt', name: `${d.name} payment`, date: dateOf(ym, Number(r.values.dueDay) || 1), planned: -pay, guessDate: !r.values.dueDay });
  }
  // Next 12 months events land in their month.
  for (const r of live.filter(x => x.kind === 'event' && x.values.month === ym && x.amount != null)) {
    push(r, { kind: 'event', group: 'Bills', name: r.name || 'Event', date: dateOf(ym, r.values.day || 1), planned: -r.amount });
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
    for (const w of [...debtWins(inputs, now), ...autoWins]) if (w.date.startsWith(ym)) out.push({ key: `auto:${w.name}@${w.date}`, recId: null, kind: 'win', group: 'Wins', name: w.name, date: w.date, origDate: w.date, planned: 0, status: 'Planned', auto: true });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || b.planned - a.planned);
}

// Payoff dates from the plan become wins on the calendar.
export function debtWins(inputs, now = new Date()) {
  const ds = inputs.debts.filter(d => !d.inFull && d.balance > 0 && d.apr != null && d.payment != null);
  if (!ds.length) return [];
  const p = payoffPlan(ds, { order: inputs.debtOrder });
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
export function balances(doc, ref, ym, months = 1, { now = new Date(), autoWins = [] } = {}) {
  const st = startBalance(doc, ref, now);
  const cal = doc.spending?.calendar || {};
  const low = cal.low ?? ref.defaults.lowBalanceLine;
  if (st.value == null) return { needs: ['a starting balance'], low };
  if (ym < st.ym) return { needs: [`a month from ${monthName(st.ym)} on`], low };
  let b = st.value;
  // Carry forward from the start month to the first month asked for.
  for (let m = st.ym; m < ym; m = addMonths(m, 1)) {
    const r = monthRun(doc, ref, m, b, { now, autoWins, countMaybe: cal.countMaybe });
    b = r.rows[r.rows.length - 1].balance;
  }
  const rows = [];
  const insts = [];
  for (let k = 0; k < months; k++) {
    const m = addMonths(ym, k);
    const r = monthRun(doc, ref, m, b, { now, autoWins, countMaybe: cal.countMaybe });
    rows.push(...r.rows); insts.push(...r.list);
    b = r.rows[r.rows.length - 1].balance;
  }
  const lowDays = rows.filter(r => r.balance < low);
  return { rows, list: insts, low, firstLow: lowDays[0] || null, lowest: rows.reduce((a, r) => (r.balance < a.balance ? r : a), rows[0]), start: st };
}
function monthRun(doc, ref, ym, start, opts) {
  const list = instances(doc, ref, ym, opts);
  const entries = list.flatMap(i => moneyOf(i, opts));
  const r = runningBalance({ start, from: `${ym}-01`, to: dateOf(ym, 31), entries });
  return { rows: r.value, list };
}

// R098: months where every-2-weeks pay lands three times.
export function bonusPaycheck(list) {
  const byRec = new Map();
  for (const i of list.filter(x => x.kind === 'income')) byRec.set(i.recId, (byRec.get(i.recId) || 0) + 1);
  return [...byRec.values()].some(n => n === 3);
}

// ---------- Budget passes for a month (R130 to R136) ----------
export const PASSES = ['Gut', 'Basics', 'Rough', 'Estimate', 'Actual'];
const monthDoc = (doc, ym) => doc.spending?.months?.[ym] || {};

// Rough = the line's standing number (its monthly share). Estimate starts from Rough until confirmed (R136).
export function roughOf(doc, line) {
  if (line.status === 'Not for me') return 0;
  return myShare({ ...line, ...line.values }, { roommates: doc.profile?.roommates ?? 0 }).value;
}
export function estimateOf(doc, ym, line) {
  const e = monthDoc(doc, ym).lines?.[line.id]?.estimate;
  if (e != null) return { value: e, fromRough: false };
  const r = roughOf(doc, line);
  return { value: r, fromRough: r != null };
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
export function monthView(doc, ref, ym, { now = new Date() } = {}) {
  const g = gatesOf(doc.profile, doc.client);
  const lines = visible(doc.records, g, ref).filter(r => r.kind === 'bill');
  const list = instances(doc, ref, ym, { now });
  const md = monthDoc(doc, ym);
  const rows = lines.map(l => {
    const est = estimateOf(doc, ym, l);
    const act = actualOf(doc, ym, l, list);
    const diff = est.value != null && act.value != null ? act.value - est.value : null;
    return { line: l, rough: roughOf(doc, l), estimate: est.value, fromRough: est.fromRough, actual: act.value, actualFrom: act.from, diff,
      variable: l.values.amountType !== 'Fixed', priceUp: l.values.amountType === 'Fixed' && diff != null && diff > 0.5 }; // R141
  }).filter(r => r.line.status !== 'Not for me');
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

// The Gut pass is the one all-in number (R131); Fast Track writes it too.
export const gutRecord = doc => doc.records.find(r => r.kind === 'spending' && r.type === 'All in') || null;
export const gutOf = doc => gutRecord(doc)?.amount ?? null;

// Close: lock the month, keep the gut vs actual for accuracy, and carry variable misses to next month (Mockup: Close row).
export function closeMonth(store, ref, ym, { now = new Date() } = {}) {
  const v = monthView(store.doc, ref, ym, { now });
  const next = addMonths(ym, 1);
  return store.transaction(`Closed ${monthName(ym)}`, () => {
    for (const r of v.rows) {
      if (r.actual == null) store.setIn('spending', ['months', ym, 'lines', r.line.id, 'actual'], 0); // a gap closes as $0 so the miss shows
      if (r.variable && r.actual != null && store.getIn('spending', ['months', next, 'lines', r.line.id, 'estimate']) == null && Math.abs(r.actual - (r.estimate ?? 0)) >= 1) {
        store.setIn('spending', ['months', next, 'lines', r.line.id, 'estimate'], Math.round(r.actual));
      }
    }
    const after = monthView(store.doc, ref, ym, { now });
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

// Calendar mark (R091 to R094).
export function mark(store, key, patch) {
  const cur = store.getIn('spending', ['calendar', 'marks', key]) || {};
  const next = { ...cur, ...patch };
  if (next.status === 'Planned') return store.setIn('spending', ['calendar', 'marks', key], undefined, 'Back to planned');
  return store.setIn('spending', ['calendar', 'marks', key], next, patch.status ? `Marked ${patch.status}` : 'Edit');
}
