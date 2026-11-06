// SPDX-License-Identifier: AGPL-3.0-only
// Batch 23: Can I afford it? (M83). The everyday coaching question ("a $2,000 trip in March", "a $400 a month car
// payment", "a $30,000 wedding next year") answered from the household's own plan. The same math runs twice, on the
// file and on a copy with the cost in (like Current vs Proposed, M76); the copy is never saved. A cost has to come
// from somewhere (YNAB: give every dollar a job), so the answer says from where: this month's free money, saving for it
// from now (a Fund the Future sinking fund, FOO step 8), or the cash layers when the month is already short.
// What it reads: the calendar's running balance and low-balance line (M60, the Buffer layer), the FOO step you are on
// and its date (M69), the FI date (M53), the cash layers (M68) and the free money a month (the Cash flow strip).
// Pure: no DOM.
import { metrics, flowOf } from './metrics.js';
import { foo } from './foo.js';
import { layersOf, dipFrom } from './layers.js';
import { gapOf } from './gap.js';
import { fmt } from './result.js';
import { STEP_NAMES } from '../registry/foo.js';
import { balances, ymOf, addMonths, monthsBetween, monthName, gutRecord } from '../month.js';
import { setAsideOf } from '../payday.js';
import { RULES } from '../registry/assumptions.js';

export const AFFORD_KINDS = ['once', 'monthly', 'goal'];
const KIND_WORDS = { once: 'a one-time cost', monthly: 'a monthly cost', goal: 'a big goal' };
const money = fmt.money;
const mon = ym => (ym ? monthName(ym, 'short') : null);
const clone = x => (typeof structuredClone === 'function' ? structuredClone(x) : JSON.parse(JSON.stringify(x)));
const bufferOf = L => { const t = L.layers.find(l => l.id === 'buffer')?.target; return t != null && t > 0 ? Math.round(t) : null; }; // the calendar's line (spending-ui bufferLine)
const freeOf = (doc, ref, m, now) => flowOf(m.inputs, { pretaxSaving: m.pretaxSaving, setAside: setAsideOf(doc, ref, now).total }).free; // the Cash flow strip's Free

// How long a monthly cost runs before anyone picks (QUESTIONS 273): a car payment ends (RULES.carPaymentYears, 5 years,
// a typical loan); every other monthly cost is For good (null), which also raises retirement spending.
export const defaultYears = name => (name === 'A car payment' ? RULES.carPaymentYears : null);

// The question, cleaned: { kind, amount, ym, years (a monthly cost: how long, null for good), name, draftt }.
export function askOf(ask = {}, now = new Date()) {
  const kind = AFFORD_KINDS.includes(ask.kind) ? ask.kind : 'once';
  const amount = Number(ask.amount) > 0 ? Number(ask.amount) : null;
  const here = ymOf(now);
  const ym = /^\d{4}-\d{2}$/.test(ask.ym || '') && ask.ym >= here ? ask.ym : kind === 'monthly' ? here : null;
  const years = kind === 'monthly' && Number(ask.years) > 0 ? Number(ask.years) : null;
  const name = String(ask.name || '').trim() || (kind === 'monthly' ? 'A monthly cost' : kind === 'goal' ? 'A big goal' : 'A one-time cost');
  return { kind, amount, ym, years, name, draftt: ask.draftt ?? null };
}

// The copy with the cost in. A one-time cost or a big goal is a Fund the Future goal (an event saved for each month
// until its month, exactly what Make it a goal adds); it also lands on the calendar on the 1st of its month. A monthly
// cost from this month raises the gut number (or adds a Budget line when the plan reads the lines); from a later month
// it is a Budget line that starts then; an end (years) comes back to the surplus as a known change.
export function affordDoc(doc, ref, ask, { now = new Date() } = {}) {
  const a = askOf(ask, now);
  const copy = clone(doc);
  if (!a.amount || !a.ym) return copy;
  const id = `afford-${a.kind}`;
  const rec = (kind, fields) => ({ id, kind, type: null, name: a.name, amount: null, per: 'month', owner: null, status: null, fieldStatus: {}, paidWith: null, linkedTo: null, source: 'manual', covers: null, values: {}, notes: null, privateNote: null, stress: null, createdAt: null, updatedAt: null, ...fields });
  if (a.kind !== 'monthly') { copy.records.push(rec('event', { amount: a.amount, values: { month: a.ym, sinking: true, ...(a.ym === ymOf(now) ? { day: now.getUTCDate() } : {}) } })); return copy; } // this month: it lands today
  const m = metrics(doc, ref, { now });
  const here = ymOf(now);
  const line = values => rec('bill', { amount: a.amount, per: 'month', values: { category: a.name, draftt: a.draftt ?? 'Other', amountType: 'Fixed', ...values } });
  if (a.ym > here) copy.records.push(line({ startsIn: a.ym }));
  else if (m.inputs.spendingSource === 'gut' && gutRecord(copy)) { const g = gutRecord(copy); g.amount = (g.amount ?? 0) + a.amount; }
  else copy.records.push(line({}));
  if (a.years) {
    const at = monthsBetween(here, a.ym) + Math.round(a.years * 12);
    copy.whatIf = { changes: [{ id, kind: 'ends', ym: addMonths(here, at), at, surplus: a.amount, spending: -a.amount, name: a.name }] };
  }
  return copy;
}

// The calendar in the cost's month: the tightest day, and whether it stays above the low-balance line.
function tightest(doc, ref, ym, L, now) {
  const b = balances(doc, ref, ym, 1, { now, low: bufferOf(L) });
  if (b.needs) return { needs: b.needs, low: b.low };
  const today = now.toISOString().slice(0, 10), rows = b.rows.filter(r => r.date >= today); // this month: from today on
  if (!rows.length) return { needs: ['a day still ahead'], low: b.low };
  const lowest = rows.reduce((p, r) => (r.balance < p.balance ? r : p), rows[0]);
  return { low: b.low, date: lowest.date, balance: lowest.balance, above: lowest.balance >= b.low };
}
const dayWords = d => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

// M83: the answer. { line (the calm one-liner), numbers (the three that matter, each a result with its math), from
// (where the money comes from), layers, foo, fi, calendar, sinking, free, gap }.
export function affordOf(doc, ref, ask, { now = new Date(), flags = [] } = {}) {
  const a = askOf(ask, now);
  const need = [!a.amount ? 'an amount' : null, !a.ym ? 'a month' : null].filter(Boolean);
  if (need.length) return { id: 'M83', ask: a, value: null, needs: need, text: `Needs ${need.join(' and ')}.` };
  const here = ymOf(now);
  const base = metrics(doc, ref, { now }), copy = affordDoc(doc, ref, a, { now }), after = metrics(copy, ref, { now });
  const f0 = foo(doc, ref, { now, flags }), f1 = foo(copy, ref, { now, flags });
  const L = layersOf(doc, ref, now);
  const free0 = freeOf(doc, ref, base, now);
  const free1 = a.kind === 'monthly' && a.ym > ymOf(now) && free0 != null ? free0 - a.amount : freeOf(copy, ref, after, now); // a later start: the month it starts
  const G0 = gapOf(doc, base), G1 = gapOf(copy, after);
  const k = Math.max(1, monthsBetween(here, a.ym));
  const label = a.name.toLowerCase().startsWith('a ') ? `the ${a.name.slice(2).toLowerCase()}` : a.name;

  // The FOO step you are on: its date with and without the cost.
  const id = f0.here, s0 = f0.steps.find(s => s.id === id), s1 = f1.steps.find(s => s.id === id);
  const stepName = id ? STEP_NAMES[id]?.name ?? s0?.name ?? id : null;
  const delay = s0?.date && s1?.date ? monthsBetween(s0.date, s1.date) : null;
  const fooR = { id: 'M83', unit: 'text', step: id, name: stepName, before: s0?.date ?? null, after: s1?.date ?? null, delay, needs: [],
    value: s1?.date ?? null, newHere: f1.here !== id ? f1.here : null,
    text: !id ? 'Every FOO step is done.' : s0?.date && s1?.date
      ? `Step ${id}, ${stepName}: done ${mon(s0.date)} on the plan as it is; with ${money(a.amount)}${a.kind === 'monthly' ? ' a month' : ''} going to ${label} first, ${mon(s1.date)} (${delay === 0 ? 'the same month' : `${Math.abs(delay)} ${Math.abs(delay) === 1 ? 'month' : 'months'} ${delay > 0 ? 'later' : 'sooner'}`}). The surplus works through the steps in order, so money that goes to ${label} reaches the step later.`
      : `Step ${id}, ${stepName}, has no date${G0 ? ' while the month is short' : ' yet'}.` };

  // The FI date with and without it.
  const fi0 = base.monthsToFi, fi1 = after.monthsToFi;
  const moved = fi0.value != null && fi1.value != null ? fi1.value - fi0.value : null;
  const fiR = { id: 'M83', unit: 'months', needs: [], before: fi0.value, after: fi1.value, moved, never: !!fi1.never, value: fi1.value,
    beforeYm: fi0.value != null ? addMonths(here, fi0.value) : null, afterYm: fi1.value != null ? addMonths(here, fi1.value) : null,
    text: fi0.value == null && fi1.value == null ? `The FI date is not on this path either way${G0 ? ': the month is short, so nothing goes in from the surplus' : ''}.`
      : fi1.value == null ? `FI ${mon(addMonths(here, fi0.value))} as it is; with ${label} the FI date is not on this path.`
        : `FI ${mon(addMonths(here, fi0.value ?? fi1.value))} as it is, ${mon(addMonths(here, fi1.value))} with ${label}: ${moved === 0 ? 'no change' : `${Math.abs(moved)} ${Math.abs(moved) === 1 ? 'month' : 'months'} ${moved > 0 ? 'later' : 'sooner'}`}. ${a.kind === 'monthly' ? `What goes in each month drops by ${money(a.amount)}${a.years ? ` for ${a.years} ${a.years === 1 ? 'year' : 'years'}` : ''}${a.years ? '' : ', and retirement spending carries it too'}.` : `The ${money(k > 1 ? a.amount / k : a.amount)} a month saved for it stops going in until ${mon(a.ym)}, then comes back.`}` };

  // The calendar in the cost's month (a one-time cost and a monthly cost's first month; a big goal is paid from its fund).
  const cal = a.kind === 'goal' ? null : tightest(copy, ref, a.ym, L, now);
  const calR = !cal || cal.needs ? null : { id: 'M83', unit: 'money', needs: [], value: cal.balance, date: cal.date, low: cal.low, above: cal.above,
    text: `Checking on the calendar in ${monthName(a.ym)} with ${label} on the 1st: the lowest day is ${dayWords(cal.date)} at ${money(cal.balance)}; your low-balance line is ${money(cal.low)} (blank: the Buffer layer, two weeks of spending). The calendar keeps every paycheck and bill on its day.` };

  // Saving for it from now (a one-time cost or a big goal): the Fund the Future option.
  const sink = a.kind === 'monthly' ? null : { monthly: a.amount / k, months: k, ym: a.ym };
  const sinkR = sink ? { id: 'M83', unit: 'money', needs: [], value: sink.monthly, text: `${money(a.amount)} over the ${k} ${k === 1 ? 'month' : 'months'} to ${monthName(a.ym)} = ${money(sink.monthly)} a month, set aside from the surplus (a Fund the Future goal, FOO step 8). big e and little e are not touched.` } : null;
  const freeR = { id: 'M83', unit: 'money', needs: [], value: free1, before: free0, text: `Free money a month (take-home minus spending minus savings, the Cash flow strip): ${money(free0)} now, ${money(free1)} with ${label}${a.kind === 'monthly' ? '' : ` while it is saved for, until ${mon(a.ym)}`}.` };

  // Saving more a month than the free money makes the month short: the date it is paid for at the free money instead.
  const over = sink && free0 != null && free0 > 0 ? sink.monthly - free0 : 0;
  const fullAt = over > 0.5 ? addMonths(here, Math.ceil(a.amount / free0 - 1e-9)) : null;
  // From where. A short month has no free money, so the cost comes out of the cash layers (Buffer, little e, big e).
  const monthlyOut = a.kind === 'monthly' ? a.amount : sink.monthly;
  const fromFree = free0 != null && free0 > 0 ? Math.min(free0, monthlyOut) : 0;
  const shortBy = Math.max(0, monthlyOut - Math.max(0, free0 ?? 0));
  const dip = dipFrom(L.layers, a.kind === 'monthly' ? shortBy : G0 ? a.amount : 0);
  const touched = new Set(dip.from.map(d => (d.layer.startsWith('big-e') ? 'big e' : d.layer === 'little-e' ? 'little e' : 'the Buffer')));
  const alt = a.kind === 'monthly' ? null : dipFrom(L.layers, a.amount); // paid from savings instead of saved for
  const altTouched = alt ? [...new Set(alt.from.map(d => (d.layer.startsWith('big-e') ? 'big e' : d.layer === 'little-e' ? 'little e' : 'the Buffer')))] : [];
  const dest = id && STEP_NAMES[id] ? STEP_NAMES[id].name : 'the plan';
  const from = G0
    ? `Your month is ${money(G0.short)} short already, so there is no free money for it yet. It would come out of what is saved${dip.from.length ? `: ${dip.from.map(d => `${money(d.amount)} of ${d.name}`).join(', ')}` : ''}${dip.uncovered > 0.5 ? `${dip.from.length ? ', and' : ':'} ${money(dip.uncovered)} that is not saved anywhere yet` : ''}.`
    : a.kind === 'monthly'
      ? `From your free money: ${money(fromFree)} of the ${money(free0)} a month that goes to ${dest} now${shortBy > 0.5 ? `; the other ${money(shortBy)} a month would come out of ${[...touched].join(' and ') || 'savings you do not have yet'}` : ''}.`
      : sink.monthly > (free0 ?? 0) + 0.5 ? `From your free money: all ${money(free0)} a month that goes to ${dest} now, and ${money(sink.monthly - free0)} a month more than that, ${mon(here)} to ${mon(addMonths(a.ym, -1))}.`
        : k === 1 ? `From this month's free money: ${money(sink.monthly)} of the ${money(free0)} that goes to ${dest} now.`
          : `From your free money: ${money(sink.monthly)} a month of the ${money(free0)} that goes to ${dest} now, ${mon(here)} to ${mon(addMonths(a.ym, -1))}.`;
  const layersWords = over > 0.5 ? `big e and little e are not touched when it is saved for at ${money(free0)} a month, paid for by ${mon(fullAt)}.`
    : G0 || shortBy > 0.5
    ? (touched.size ? `It touches ${[...touched].join(' and ')}.` : 'There is nothing saved to take it from.')
    : `big e and little e are not touched${alt && altTouched.length ? `. Paid from savings instead, it would come out of ${altTouched.join(' and ')}` : ''}.`;

  const waits = !G0 && !!G1; // the copy is short: its FOO and FI dates are not a plan to compare
  // The calm one-liner first.
  const fooBit = !id || delay == null ? '' : delay === 0 ? ` ${stepName} stays on ${mon(s0.date)}.` : ` ${stepName} done ${mon(s1.date)} instead of ${mon(s0.date)}.`;
  const line = G0
    ? `Your month is ${money(G0.short)} short today, so ${label} would come out of savings${dip.uncovered > 0.5 ? ' you do not have yet' : ''}. Closing the gap comes first; then it can be saved for.`
    : a.kind === 'monthly'
      ? (G1 ? `${money(a.amount)} a month is more than your ${money(free0)} of free money: the month would be ${money(G1.short)} short.`
        : `${a.ym > here ? `From ${mon(a.ym)}, ` : ''}${money(a.amount)} a month comes out of your ${money(free0)} of free money, leaving ${money(free1)}.${fiR.moved ? ` The FI date moves ${Math.abs(fiR.moved)} ${Math.abs(fiR.moved) === 1 ? 'month' : 'months'} ${fiR.moved > 0 ? 'later' : 'sooner'}.` : ''}`)
      : over > 0.5
        ? `Saving for ${label} by ${mon(a.ym)} takes ${money(sink.monthly)} a month, ${money(over)} more than your ${money(free0)} of free money. At ${money(free0)} a month it is paid for by ${mon(fullAt)}.`
      : k === 1 && free0 >= a.amount
        ? `This month's ${money(free0)} of free money covers ${label}.${calR && !calR.above ? ` Checking dips under your ${money(calR.low)} line on ${dayWords(calR.date)}.` : fooBit}`
        : `Save ${money(sink.monthly)} a month from now and ${label} is paid for by ${monthName(a.ym, 'long').replace(/ \d{4}$/, a.ym.slice(0, 4) === here.slice(0, 4) ? '' : ` ${a.ym.slice(0, 4)}`)}.${calR && !calR.above ? ` Checking dips under your ${money(calR.low)} line on ${dayWords(calR.date)}.` : fooBit}`;

  // The three numbers that matter.
  // Batch 37 (Rocket Surgery): "Waits for the gap" stopped both users; it is on hold while the cost takes all the free
  // money (and more), and the sub line says for how long and what it was.
  const holdFor = a.kind === 'monthly' ? `while ${label} is paid` : `while ${label} is saved for`;
  const fooNum = { label: id ? `${stepName} done` : 'FOO', result: fooR, show: waits ? 'On hold' : s1?.date ? mon(s1.date) : 'No date yet', sub: waits ? `${holdFor}${s0?.date ? `; was ${mon(s0.date)}` : ''}` : delay == null ? (s0?.date ? `was ${mon(s0.date)}` : G0 ? 'the gap comes first' : null) : delay === 0 ? 'no change' : `was ${mon(s0.date)}` };
  const fiNum = { label: 'FI date', result: fiR, show: waits ? 'On hold' : fi1.value != null ? mon(fiR.afterYm) : 'Not on this path', sub: waits ? `${holdFor}${fiR.beforeYm ? `; was ${mon(fiR.beforeYm)}` : ''}` : moved == null ? (G0 ? 'the gap comes first' : null) : moved === 0 ? 'no change' : `${Math.abs(moved)} ${Math.abs(moved) === 1 ? 'month' : 'months'} ${moved > 0 ? 'later' : 'sooner'}` };
  if (waits) { fooR.text = `With ${money(monthlyOut)} a month going to ${label}, the month would be ${money(G1.short)} short, so the FOO dates are on hold ${holdFor}. ${fooR.text}`; fiR.text = `With ${money(monthlyOut)} a month going to ${label}, the month would be ${money(G1.short)} short: nothing goes in from the surplus, so the FI date is on hold ${holdFor}.`; }
  const first = G0 ? { label: 'Your month is short by', result: { id: 'M81', unit: 'money', needs: [], value: G0.short, text: G0.text }, show: money(G0.short), sub: 'a month, today' }
    : a.kind === 'once' && calR ? { label: `Tightest day in ${mon(a.ym).replace(/ \d{4}$/, '')}`, result: calR, show: `${dayWords(cal.date)}: ${money(cal.balance)}`, sub: `${cal.above ? 'above' : 'under'} your ${money(cal.low)} line` }
      : a.kind === 'monthly' ? { label: 'Free money a month', result: freeR, show: money(free1), sub: `was ${money(free0)}` }
        : { label: 'Set aside a month', result: sinkR, show: money(sink.monthly), sub: over > 0.5 ? `${money(over)} more than your free money` : `${k} ${k === 1 ? 'month' : 'months'}, to ${mon(a.ym)}` };
  const numbers = [first, fooNum, fiNum];
  const text = `${KIND_WORDS[a.kind]} of ${money(a.amount)}${a.kind === 'monthly' ? ' a month' : ''} from ${monthName(a.ym)}: the plan run twice, as it is and with the cost in. ${from} ${layersWords}`;
  return { id: 'M83', ask: a, value: numbers.length, needs: [], unit: 'count', line, numbers, from, layers: layersWords, touched: [...touched], foo: fooR, fi: fiR, calendar: calR, sinking: sink, free: { before: free0, after: free1 }, gap: G0 ? G0.short : null, gapAfter: G1 ? G1.short : null, waits, over: over > 0.5 ? over : 0, fullAt, text };
}
