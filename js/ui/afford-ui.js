// SPDX-License-Identifier: AGPL-3.0-only
// Batch 23: Can I afford it? A quick check on Plan › Goals (a caret section, closed until asked), reached from Home's
// slim "Can I afford…?" button and from Find ("afford", "can I", "trip", "buy"). Everything is a tap: what kind of
// cost, what for, how much (quick picks, or a box), when (month chips). The answer is the math's (js/math/afford.js):
// a calm one-liner, the three numbers that matter, where the money comes from, then Make it a goal (a Fund the Future
// goal) or Add to the budget, and Add to the calendar. Nothing is saved until one of those is tapped.
// Benchmarks (docs/BENCHMARK.md, Goals): Rocket Money's what's left, Monarch's Save Up goal (target, date, monthly),
// YNAB's give every dollar a job (a cost has to come from somewhere, so the answer says from where).
import { h, clear } from './dom.js';
import * as S from './staples.js';
import { affordOf } from '../math/afford.js';
import { addMonths, ymOf, monthName } from '../month.js';
import { money } from '../format.js';
import { rememberSection } from './sections.js';
import { land } from './arrive.js';

// What it is for, by kind: tap names (a monthly cost carries its Budget letter).
const WHAT = {
  once: [['A trip', 'Trip'], ['A laptop', 'Laptop'], ['A gift', 'Gift'], ['A repair', 'Repair'], ['A one-time cost', 'Other']],
  monthly: [['A car payment', 'Car payment'], ['A gym', 'Gym'], ['Childcare', 'Childcare'], ['A subscription', 'Subscription'], ['A monthly cost', 'Other']],
  goal: [['A wedding', 'Wedding'], ['A down payment', 'Down payment'], ['A car', 'Car'], ['A big goal', 'Other']],
};
const LETTER = { 'A car payment': 'Transportation', 'A gym': 'Therapy', 'A subscription': 'Bills', Childcare: 'Other', 'A monthly cost': 'Other' };
const PICKS = { once: [500, 1000, 2000, 5000], monthly: [100, 250, 400, 600], goal: [10000, 20000, 30000, 50000] };
const LONG = [[null, 'For good'], [1, '1 year'], [3, '3 years'], [5, '5 years']];
const GOAL_WHEN = [[6, '6 months'], [12, '1 year'], [18, '18 months'], [24, '2 years'], [36, '3 years'], [60, '5 years']];
export const AF = { kind: 'once', name: null, amount: null, ym: null, years: null, done: {} };
const short = v => (v >= 1000 && v % 1000 === 0 ? `$${v / 1000}k` : money(v));

const askNow = () => ({ kind: AF.kind, amount: AF.amount, ym: AF.ym, years: AF.years, name: AF.name, draftt: LETTER[AF.name] ?? null });
const keyOf = () => JSON.stringify(askNow());

// Home's slim line: one button that opens the check on Goals.
export function affordHomeLine(app) {
  return h('div.row-line.afford-home', {}, S.button('Can I afford…?', { size: 'small', iconName: 'search', onClick: () => openAfford(app), tip: 'A trip, a car payment, a wedding: what it moves in the plan' }),
    h('span.muted.small', {}, 'A trip, a car payment, a wedding: what it moves'));
}
export function openAfford(app, ask = null) {
  if (ask) Object.assign(AF, ask, { done: {} });
  rememberSection('goals:afford', true);
  land(app, '#/plan/goals', { focus: 'sec:goals:afford' });
}

// The section on Goals.
export function affordSection(app, ctx) {
  return S.sec('goals:afford', { title: 'Can I afford it?', area: 'goals', summary: 'A trip, a car payment, a wedding: what it moves', tip: 'Answered from the plan: the tightest day, the FOO step, the FI date' },
    () => { const host = h('div.card.afford'); const draw = () => S.keepPlace(() => clear(host, body(app, ctx, draw))); ctx.onRefresh(() => host.isConnected && draw()); draw(); return host; });
}

function body(app, ctx, draw) {
  const now = ctx.now(), here = ymOf(now);
  const pick = patch => { Object.assign(AF, patch, { done: {} }); draw(); }; // the question is view state, never saved
  const row = (label, control, tip = null) => h('div.af-q', {}, h(`span.label${tip ? '.has-tip' : ''}`, tip ? { title: tip } : {}, label), h('div.af-a', {}, control));
  const months = Array.from({ length: 12 }, (_, k) => addMonths(here, k));
  const monthChip = ym => [ym, k0(ym, here) === 0 ? 'This month' : ym.slice(0, 4) === here.slice(0, 4) ? monthName(ym, 'short').replace(/ \d{4}$/, '') : monthName(ym, 'short')];
  const amountBox = S.moneyInput(PICKS[AF.kind].includes(AF.amount) ? null : AF.amount, v => pick({ amount: v }), { hint: 'Other amount', key: 'af:amount', width: 140, cents: false });
  const form = h('div.af-form', {},
    row('What is it', S.toggle([['once', 'One-time'], ['monthly', 'A monthly cost'], ['goal', 'A big goal']], AF.kind, v => pick({ kind: v, name: null, amount: null, ym: v === 'monthly' ? here : null, years: null }), { label: 'What is it' })),
    row('What for', S.tapPick(WHAT[AF.kind], AF.name, v => pick({ name: v }), { label: 'What for' })),
    row(AF.kind === 'monthly' ? 'How much a month' : 'How much', h('div.row-line.af-amount', {}, S.tapPick(PICKS[AF.kind].map(v => [v, short(v)]), PICKS[AF.kind].includes(AF.amount) ? AF.amount : null, v => pick({ amount: v }), { label: 'How much' }), amountBox)),
    AF.kind === 'goal'
      ? row('When', S.tapPick(GOAL_WHEN.map(([n, t]) => [addMonths(here, n), t]), AF.ym, v => pick({ ym: v }), { label: 'When' }))
      : row(AF.kind === 'monthly' ? 'Starting' : 'When', S.tapPick(months.map(monthChip), AF.ym, v => pick({ ym: v }), { label: AF.kind === 'monthly' ? 'Starting' : 'When', clearable: AF.kind !== 'monthly' }), AF.kind === 'once' ? 'It lands on the 1st of that month (today, this month), the day it hits checking hardest' : null),
    AF.kind === 'monthly' ? row('For how long', S.toggle(LONG, AF.years, v => pick({ years: v }), { label: 'For how long' })) : null);
  return [form, answer(app, ctx, now, draw)];
}
const k0 = (ym, here) => (ym === here ? 0 : 1);

let memo = { key: null, rev: null, r: null };
const revOf = ctx => `${ctx.store.doc._rev ?? 0}|${ctx.store.doc.updatedAt}`;
function answer(app, ctx, now, draw) {
  const doc = ctx.store.doc;
  const rev = revOf(ctx);
  // Once the answer is acted on (a goal, the budget, the calendar), it stays as it was asked: the file now holds the
  // cost, so a rerun would count it twice. A new question (or Undo, which clears the done marks) asks again.
  const exists = rid => !!rid && doc.records.some(q => q.id === rid); // Undo takes the record away, and the answer asks again
  const acted = ['goal', 'cal', 'budget'].some(k => exists(AF.done[k]));
  if (!acted && (memo.key !== keyOf() || memo.rev !== rev)) memo = { key: keyOf(), rev, r: affordOf(doc, ctx.ref, askNow(), { now, flags: app.flags || [] }) };
  const r = memo.r;
  if (r.needs.length) return h('p.muted.af-wait', {}, `Pick ${r.needs.map(n => n.replace(/^an? /, 'the ')).join(' and ')} to see what it moves.`);
  const nums = h('div.af-nums', {}, r.numbers.map(n => h('div.af-num', {}, h('span.label', {}, n.label), h('div.af-big', {}, S.mathButton(n.result, n.show)), n.sub ? h('span.muted.small', {}, n.sub) : null)));
  const a = r.ask;
  const goalDone = exists(AF.done.goal), calDone = exists(AF.done.cal), budgetDone = exists(AF.done.budget);
  const addGoal = () => {
    const rec = ctx.store.add('event', { name: a.name, amount: a.amount, values: { month: a.ym, sinking: true, ...(a.ym === ymOf(now) ? { day: now.getUTCDate() } : {}) } });
    AF.done = { ...AF.done, goal: rec.id, cal: rec.id }; draw();
    S.toast(`${a.name} is a Fund the Future goal: ${money(r.sinking.monthly)} a month until ${monthName(a.ym, 'short')} (Plan › Next 12 months). It is on the calendar too.`, { undo: () => ctx.store.undo() });
  };
  const addCalendar = () => {
    let rec;
    if (a.kind === 'monthly') rec = ctx.store.add('entry', { name: a.name, amount: a.amount, values: { date: a.ym === ymOf(now) ? now.toISOString().slice(0, 10) : `${a.ym}-01`, direction: 'Out', repeats: 'Monthly', endsOn: a.years ? `${addMonths(a.ym, a.years * 12 - 1)}-28` : null } }, { type: 'Money out' });
    else rec = ctx.store.add('event', { name: a.name, amount: a.amount, values: { month: a.ym, ...(a.ym === ymOf(now) ? { day: now.getUTCDate() } : {}) } });
    AF.done = { ...AF.done, cal: rec.id }; draw();
    S.toast(a.kind === 'monthly' ? `${a.name} is on the calendar each month from ${monthName(a.ym, 'short')}. The plan counts it once it is on the budget.` : `${a.name} is on the calendar in ${monthName(a.ym, 'short')}.`, { undo: () => ctx.store.undo() });
  };
  const addBudget = () => {
    const x = ctx.metrics().inputs;
    ctx.store.transaction(`Add ${a.name}`, () => {
      const rec = ctx.store.add('bill', { name: a.name, amount: a.amount, per: 'month', values: { draftt: a.draftt ?? 'Other', amountType: 'Fixed', ...(a.ym > ymOf(now) ? { startsIn: a.ym } : {}) } });
      AF.done = { ...AF.done, budget: rec.id };
      const gut = ctx.store.doc.records.find(q => q.kind === 'spending' && q.type === 'All in');
      if (x.spendingSource === 'gut' && gut && !(a.ym > ymOf(now))) ctx.store.update(gut.id, { amount: (gut.amount ?? 0) + a.amount }); // the gut number carries it from today
    });
    draw();
    S.toast(`${a.name} is on the budget: ${money(a.amount)} a month${a.ym > ymOf(now) ? ` from ${monthName(a.ym, 'short')}` : ''}.`, { undo: () => ctx.store.undo() });
  };
  const doneBtn = text => S.button(text, { iconName: 'check', disabled: true, why: 'Done. Undo takes it back' });
  const buttons = h('div.row-line.af-actions', {},
    r.gap != null ? S.button('See the gap', { kind: 'primary', iconName: 'right', onClick: () => { const g = document.querySelector('.gap-card'); if (g) g.scrollIntoView({ block: 'center', behavior: 'smooth' }); else app.go('#/plan/foo'); } }) : null,
    a.kind === 'monthly'
      ? (budgetDone ? doneBtn('On the budget') : S.button('Add to the budget', { kind: r.gap != null ? 'secondary' : 'primary', iconName: 'plus', onClick: addBudget }))
      : (goalDone ? doneBtn('A goal now') : S.button('Make it a goal', { kind: r.gap != null ? 'secondary' : 'primary', iconName: 'plus', onClick: addGoal, tip: 'A Fund the Future goal: saved for each month until its month' })),
    calDone ? doneBtn('On the calendar') : S.button('Add to the calendar', { iconName: 'calendar', onClick: addCalendar }));
  return h('div.af-answer', { 'aria-live': 'polite' },
    h('p.af-line', {}, r.line),
    nums,
    h('p.af-from', {}, r.from, ' ', h('span.muted', {}, r.layers)),
    buttons);
}
