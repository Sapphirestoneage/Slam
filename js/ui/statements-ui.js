// SPDX-License-Identifier: AGPL-3.0-only
// Report › Statements (Phase 3.5 section 2): the three statements for a month or a year, this period vs last, and a
// slim tie-out. Everything here is formatting: the numbers come from js/math/statements.js.
import { h, clear, icon } from './dom.js';
import * as S from './staples.js';
import { statements, statementRows, periodOf, previous, periodMonths } from '../math/statements.js';
import { addMonths, monthName } from '../month.js';
import { money } from '../format.js';
import { inView } from '../math/time.js';
import { payYourselfFirst } from '../math/simple.js';

export const SUI = { kind: 'month', ym: null, year: null, hours: false };
const head = (title, sub, ...right) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null), h('div.row-line', {}, ...right));

function periodNow(ctx) {
  const now = ctx.now();
  if (SUI.kind === 'year') return { kind: 'year', year: SUI.year ?? now.getUTCFullYear() };
  return { kind: 'month', ym: SUI.ym ?? periodOf('month', now).ym };
}
const label = p => (p.kind === 'year' ? String(p.year) : monthName(p.ym));

export function statementsScreen(app, ctx) {
  const p = periodNow(ctx);
  const st = statements(ctx.store.doc, ctx.ref, p, { now: ctx.now() });
  const last = statements(ctx.store.doc, ctx.ref, previous(p), { now: ctx.now() });
  const rows = statementRows(st, last);
  const m = ctx.metrics();
  // Money, or hours of life energy (YMOYL step 3) on the income and spending statement.
  const fmt = (v, { hours = false } = {}) => (v == null ? '–' : hours ? inView(v, 'Hours', { rate: m.hourly }).text : money(v));
  const step = n => { if (p.kind === 'year') SUI.year = p.year + n; else SUI.ym = addMonths(p.ym, n); app.render(); };
  const picker = h('div.card.statement-bar', {}, h('div.row-line', { style: { gap: '12px' } },
    S.toggle([['month', 'Month'], ['year', 'Year']], SUI.kind, v => { SUI.kind = v; app.render(); }, { label: 'Period' }),
    h('span.row-line.month-step', { style: { gap: '6px', flexWrap: 'nowrap' } }, S.iconButton('left', 'Previous period', () => step(-1)), h('strong', { style: { minWidth: '130px', textAlign: 'center' } }, label(p)), S.iconButton('right', 'Next period', () => step(1))),
    h('span.muted', {}, `vs ${label(previous(p))}`), h('span', { style: { flex: 1 } }),
    S.button('Print the set', { iconName: 'printer', onClick: () => printSet() })));
  // Pay yourself first: what comes off the top before any spending, a month and a paycheck.
  const pyf = payYourselfFirst(ctx.store.doc, ctx.ref, { now: ctx.now() });
  const offTop = h('p.st-offtop', {}, h('strong', {}, 'Pay yourself first: '), pyf.monthly > 0.5
    ? [S.mathButton({ id: 'Pay yourself first', value: pyf.monthly, needs: [], text: pyf.text }, `${fmt(pyf.monthly, { hours: SUI.hours })} a month`), ` comes off the top, about ${fmt(pyf.perPaycheck, { hours: SUI.hours })} a paycheck.`]
    : 'nothing comes off the top yet. A 401(k), HSA or an automatic transfer on payday would.');
  const table = (title, tip, list, { hours = false, below = [], key }) => h('section.card.statement', { 'data-statement': key },
    h('div.row-line', { style: { justifyContent: 'space-between' } }, h('h2', {}, h('span.has-tip', { title: tip }, title)),
      key === 'income' ? S.toggle([['money', '$'], ['hours', 'Hours']], SUI.hours ? 'hours' : 'money', v => { SUI.hours = v === 'hours'; app.render(); }, { label: 'Show as' }) : null),
    key === 'income' ? offTop : null,
    h('div.st-head', {}, h('span'), h('span.num', {}, label(p)), h('span.num', {}, label(previous(p))), h('span.num', {}, 'Change')),
    [...list, ...below].map((r, i) => statementLine(ctx, r, `${key}:${i}`, v => fmt(v, { hours: hours && SUI.hours }))));
  return [head('Statements', 'Net worth, income and spending, and cash flow, tied out'),
    picker,
    table('Net worth statement', 'The balance sheet: what you own and owe on the last day', rows.netWorth, { below: rows.below, key: 'nw' }),
    table('Income and spending statement', 'The income statement, accrual: spending counts when it happens, a card swipe included', rows.income, { hours: true, key: 'income' }),
    table('Cash flow statement', 'The statement of cash flows, cash basis: money counts when it moves', rows.cash, { key: 'cash' }),
    tiePanel(app, ctx, st)];
}

// One line: label (a link to its home), this, last, change; tap to see the records behind it.
function statementLine(ctx, r, id, fmt) {
  // Money in or out (±) shows its own sign; a deduction (−) or addition (+) shows the sign before the amount.
  const face = r.sign === '±' ? `${r.now < 0 ? '−' : r.now > 0 ? '+' : ''}${fmt(Math.abs(r.now))}` : `${r.sign === '−' || r.sign === '+' ? `${r.sign} ` : ''}${fmt(r.now)}`;
  const nums = [h('span.num', {}, r.now == null ? '–' : S.mathButton({ id: 'Statements', value: r.now, needs: [], text: r.text }, face)),
    h('span.num.muted', {}, r.sign === '±' && r.last != null ? `${r.last < 0 ? '−' : r.last > 0 ? '+' : ''}${fmt(Math.abs(r.last))}` : fmt(r.last)), h('span.num', {}, r.change == null ? '' : `${r.change > 0 ? '+' : r.change < 0 ? '−' : ''}${fmt(Math.abs(r.change))}`)];
  const name = r.home ? h('a', { href: r.home }, r.label) : h('span', {}, r.label);
  if (!r.lines.length) return h(`div.st-line${r.total ? '.total' : ''}`, {}, h('span', {}, r.tip ? h('span.has-tip', { title: r.tip }, name) : name), ...nums);
  return h(`div.st-group${r.total ? '.total' : ''}`, {},
    S.moreBlock(`statement:${id}`, () => h('div.st-records', {}, r.lines.map(l => h('div.st-record', {},
      l.home ? h('a', { href: l.home }, l.name) : h('span', {}, l.name), l.date ? h('span.muted.small', {}, l.date.slice(5)) : null, h('span.num', {}, fmt(l.value))))),
    { label: `${r.label} (${r.lines.length})` }), ...nums);
}

// The tie-out, slim: one line each, Find it when cash does not tie.
function tiePanel(app, ctx, st) {
  const t = st.tie;
  const gap = t.unexplainedCash;
  const findIt = e => S.popover(e.currentTarget, h('div.stack', { style: { gap: '8px' } }, h('strong', {}, 'Days with unmarked items'),
    st.cash.unmarked.length ? h('ul.find-days', {}, [...new Set(st.cash.unmarked.map(u => u.date))].slice(0, 12).map(d => h('li', {}, h('a', { href: '#/cash-flow/calendar', onclick: () => S.closePop() }, d),
      ` ${st.cash.unmarked.filter(u => u.date === d).map(u => u.name).join(', ')}`))) : h('span.muted', {}, 'Every item this period is marked. Check for spending that is not on the calendar.')), { width: 380 });
  const b = t.bridge, a = t.accrualVsCash;
  const line = (k, v, text) => h('div.tie-line', {}, h('span', {}, k), h('span.num', {}, S.mathButton({ id: 'Tie-out', value: v, needs: [], text }, `${v <= -0.5 ? '−' : ''}${money(Math.abs(v))}`)));
  return h('section.card.tie-out', {}, h('h2', {}, 'Tie-out'),
    h('div.tie-line', {}, h('span', {}, Math.abs(gap) < 1 ? 'Cash ties out' : 'Unexplained cash'),
      h('span.num', {}, S.mathButton({ id: 'M65', value: gap, needs: [], text: `In your accounts ${money(t.cashInAccounts)}; the cash flow statement says ${money(t.cashOnStatement)}.` }, `${gap <= -0.5 ? '−' : ''}${money(Math.abs(gap))}`)),
      Math.abs(gap) >= 1 ? S.button('Find it', { size: 'small', iconName: 'search', onClick: findIt }) : null),
    S.moreBlock('tie:bridge', () => h('div.stack', {}, line('Surplus', b.surplus, 'From the income and spending statement.'), line('Saved from paycheck', b.saved, '401(k), HSA and the match went straight to investments.'),
      line('Debt paid down', b.debtPaidDown, 'The principal part of debt payments: spending on the statement, but it lowers what you owe.'), line('Market change', b.market, 'Invested balance change minus contributions plus withdrawals.'),
      line('Other changes', b.other, 'Home and car value updates, gifts, write-offs.'), line('Unexplained', b.unexplained, 'What is left after everything above.')), { label: `Change in net worth: ${b.change <= -0.5 ? '−' : ''}${money(Math.abs(b.change))}` }),
    S.moreBlock('tie:accrual', () => h('div.stack', {}, a.lines.map(l => line(l.name, l.value, l.name))), { label: `Accrual vs cash surplus: ${a.difference <= -0.5 ? '−' : ''}${money(Math.abs(a.difference))}` }));
}

// Print the set: a one-page client version of the three statements.
function printSet() {
  document.body.classList.add('print-statements');
  const done = () => { document.body.classList.remove('print-statements'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
}
export { periodMonths };
