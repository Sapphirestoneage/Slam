// SPDX-License-Identifier: AGPL-3.0-only
// Report (build phase 8): Overview (donuts, metrics shelf, Sankey), One-pager, History. Read only:
// every number links to its home, where it is typed.
import { h, clear, icon } from './dom.js';
import { simpleMathSection } from './simple-math-ui.js';
import { ratiosSection } from './ratios-ui.js';
import { changeLog } from '../capture.js';
import { saferFi } from '../math/fi.js';
import { flowWords } from '../math/flow.js';
import { nextMoves } from '../math/moves.js';
import { homeworkList } from '../homework.js';
import * as S from './staples.js';
import { auditSection } from './audit-ui.js';
import { statementsScreen } from './statements-ui.js';
import { saveFile, saveWords } from './save-file.js';
import { fooScreen } from './foo-ui.js';
import { cardPlanNote } from './cards-ui.js';
import { sheetButtons } from './sheet-ui.js';
import { soWhat } from '../sowhat.js';
import { debtRatios } from './lists.js';
import { taxRates, householdRates, monthlyFrom } from '../math/income.js';
import { drafttShares } from '../math/spending.js';
import { gutAccuracy } from '../math/spending.js';
import { fiTargets, ladder, agenda } from '../plan.js';
import { pictureOf, unlockOf, confidenceOf, fiWordsOf } from '../math/picture.js';
import { rangeLine } from './range-ui.js';
import { rangeWordsOf } from '../math/ranges.js';
import { homeworkAll, sessionOf } from '../program.js';
import { sessionRecap, recapText } from '../math/recap.js';
import { closedMonths, monthName, ymOf, monthsBetween, addMonths } from '../month.js';
import { money, pct } from '../format.js';
import { keyNumbers } from '../math/metrics.js';
import { whyText } from '../whynow.js';
import { identityLine } from './identity-ui.js';
import { adultsOf } from '../registry/couples.js';
import { overviewNotFor } from '../gates.js';
import { PRIVATE_LINE, ownLineHidden, emailDraft, seenOf, shareSees } from '../privacy.js';

export const RUI = { liquid: false, tab: 'Savings' };
const head = (title, sub, ...right) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null), h('div.row-line', {}, ...right));
const short = v => (Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1000 ? `$${Math.round(v / 1000)}k` : money(v));
const sum = (list, f) => list.reduce((s, x) => s + (f(x) ?? 0), 0);
const CONSUMER = new Set(['Credit card', 'Personal loan', 'Buy now, pay later', 'Payday or cash advance', 'Medical', 'Family or friend']);
const HOME = { netWorth: '#/net-worth/assets', surplus: '#/cash-flow/budget', savingsRate: '#/cash-flow/budget', fi: '#/plan/goals', debt: '#/net-worth/debt', taxes: '#/cash-flow/taxes', assets: '#/net-worth/assets', budget: '#/cash-flow/budget', income: '#/cash-flow/income', profile: '#/home/profile' };

// ---------- Overview ----------
export function overviewScreen(app, ctx) {
  const m = ctx.metrics();
  const x = m.inputs;
  const ratios = debtRatios(ctx, m);
  // Batch 24 (item 6): the household's rates, the same as the Taxes tab, so a household whose only income is
  // unemployment gets its rate from the benefit's taxes (the job-loss persona read locked here).
  const tax = x.householdTax?.total?.gross ? householdRates(x.householdTax, ctx.ref)
    : x.grossAnnual ? taxRates({ gross: x.grossAnnual, filingStatus: x.filingStatus, place: x.place }, ctx.ref) : { id: 'M14', value: null, needs: ['gross pay'], unit: 'pct' };
  const shares = drafttShares(x.lines, x.takeHome, { roommates: x.roommates });
  const topLetter = shares.value ? Object.entries(shares.value).sort((a, b) => b[1] - a[1]).find(([, v]) => v > 0) : null;
  const l = ladder(m, ctx.store.doc);
  const r5 = m.ruleOf5;
  // Batch 11 (item 1): the one debt-free date, the same as Home, FOO and Debt.
  const P = m.debtPlan, freeAt = P?.debts.length && P.months != null ? monthName(addMonths(ymOf(ctx.now()), P.months), 'short') : null;
  const debtFree = P?.debts.length ? { label: 'Debt free', result: P.months == null ? { id: 'M34', value: null, never: true, needs: [] } : { id: 'M34', value: P.months, needs: [], unit: 'months', text: P.text }, render: () => freeAt, home: '#/plan/debt-payoff',
    note: m.debtRule?.on ? 'The surplus goes to heavy debt first' : null, range: rangeLine(ctx, 'debtFree') } : null;
  const shelf = [
    ...(debtFree ? [debtFree] : []),
    { label: 'Savings rate', result: m.savingsRate, key: 'savingsRate', home: HOME.savingsRate, note: m.savingsRate.second, so: soWhat('savingsRate', m) },
    { id: 'draftt', label: 'Biggest share of take-home', tip: 'The biggest DRAFTT letter (Debt, Retirement, Accommodation, Food, Transportation, Therapy): the spending group that takes the most of take-home', result: topLetter ? { id: 'M29', value: topLetter[1], needs: [], unit: 'pct', text: shares.text } : { ...shares, value: null, needs: shares.needs?.length ? shares.needs : ['a tagged spending line'] },
      home: HOME.budget, note: topLetter ? `${topLetter[0]}, share of take-home` : 'Share of take-home', so: soWhat('drafttTop', m, { top: topLetter }),
      // Batch 45 (QUESTIONS 349): a gut-only client keeps the lock, with the one tap that lights it.
      lock: !topLetter && x.takeHome != null && x.spendingSource !== 'lines' ? { reason: 'Spending is one gut number. Split it into Budget lines to see which group takes the most.', route: HOME.budget, label: 'Add Budget lines' } : null },
    { id: 'dti', label: 'Debt-to-income', result: ratios.dti, home: HOME.debt, so: soWhat('dti', m, ratios.dti), note: ctx.store.doc.settings?.phase4 === true && ratios.dti.value != null ? 'What you pay, over gross pay. A lender\'s read: Report › Lender\'s view' : null }, // batch 42: the two DTIs say how they differ
    { id: 'housing', label: 'Housing %', result: m.housingPct, home: HOME.budget, so: soWhat('housing', m) },
    { label: 'Job-loss fund target (big e)', tip: 'The Rule of 5: about one month of spending for every 5 years of age, the fund that carries you through a job loss', result: r5, home: HOME.assets, so: soWhat('ruleOf5', m) },
    { label: 'Tax rate', result: tax, home: HOME.taxes, note: tax.marginal != null ? h('span.has-tip', { title: 'Your marginal bracket: the rate on the next dollar you earn' }, `Tax on your next dollar ${pct(tax.marginal)}`) : null, so: soWhat('taxRate', m, tax) },
    { id: 'util', label: 'Utilization', result: ratios.util, home: HOME.debt, render: ratios.util.none ? () => 'No cards' : null, so: ratios.util.none ? null : soWhat('util', m, ratios.util) },
    { label: 'Of the way to FI', result: l.value === null ? l : { id: 'M55', value: l.value['Regular FI'], needs: l.value['Regular FI'] == null ? ['an FI number'] : [], unit: 'pct', text: l.text }, home: HOME.fi,
      note: l.value?.['Coast FI'] != null ? h('span', {}, h('span.has-tip', { title: 'Coast FI: enough invested that growth alone reaches FI by the FI age, so you could stop saving' }, `Can stop saving ${pct(Math.min(1, l.value['Coast FI']))}`), ' · ', h('span.has-tip', { title: 'Lean FI: enough to cover a bare-bones budget for good' }, `Bare-bones FI ${pct(Math.min(1, l.value['Lean FI'] ?? 0))}`)) : null, so: soWhat('ofFi', m, { value: l.value?.['Regular FI'] ?? null }) },
  ];
  // Batch 40 (QUESTIONS 330): a card this household cannot light is hidden, with one quiet line saying why; a card a
  // number on file would light keeps its lock and its one-click unlock.
  const notFor = overviewNotFor(x, { ratios, topLetter });
  const shown = shelf.filter(i => !notFor.some(n => n.key === i.id));
  return [head('Overview', 'Read only. Every number links to its home'),
    S.summaryStrip(ctx, [
      { label: 'Net worth', result: m.netWorth, key: 'netWorth', home: HOME.netWorth, so: soWhat('netWorth', m), range: rangeLine(ctx, 'netWorth') },
      { label: 'Liquid net worth', result: m.liquidNetWorth, home: HOME.assets, so: soWhat('liquid', m) },
      { label: 'Monthly surplus', result: m.surplus, key: 'surplus', home: HOME.surplus, so: soWhat('surplus', m), range: rangeLine(ctx, 'surplus') },
      { label: 'Runway', result: m.runwayMonths, key: 'runway', render: r => `${r.value.toFixed(1)} months`, home: HOME.assets, so: soWhat('runway', m), range: rangeLine(ctx, 'efMonths') }]),
    // Batch 13 (item 1): Metrics is the core (open); the charts and fixed vs variable are caret sections, closed.
    S.sec('overview:metrics', { title: 'Metrics', open: true, summary: `${shown.filter(i => i.result?.value != null).length} of ${shown.length} lit` }, h('p.muted.small', { style: { margin: '0 0 8px' } }, 'Lit when the numbers behind them exist'), h('div.shelf', {}, shown.map(i => S.metricCard(ctx, i.label, i.result, i))),
      notFor.length ? h('div.not-for', {}, notFor.map(n => h('p.muted.small', { 'data-not-for': n.key }, h('strong', {}, n.label), `: not for this household. ${n.why[0].toUpperCase()}${n.why.slice(1)}.`))) : null),
    simpleMathSection(ctx), // batch 23: Your Shockingly Simple Math
    ratiosSection(ctx), // run Not built, groups 1 to 5, Part 9: the ratios in groups, one line each
    S.sec('overview:charts', { title: 'Where the money goes', summary: 'Spending by group and the cash flow chart' }, () => h('div.report-grid', {}, donutCard(app, ctx, m), sankeyCard(ctx, m))),
    (() => { const fv = fixedVariable(ctx, m); return fv ? S.sec('overview:fixed', { title: 'Fixed and variable', summary: 'What you pay no matter what, and what moves' }, fv) : null; })()];
}

function donutCard(app, ctx, m) {
  const x = m.inputs;
  const liquid = RUI.liquid;
  const groups = [
    ['Savings', x.accounts.filter(a => a.group === 'cash')],
    ['Investments', x.accounts.filter(a => a.group === 'investment' && (!liquid || a.type === 'Brokerage'))],
    ['Real assets', liquid ? [] : x.things],
  ];
  const debts = x.debts.filter(d => !liquid || CONSUMER.has(d.type));
  const assets = groups.map(([k, rows]) => [k, sum(rows, a => a.value)]).filter(([, v]) => v > 0);
  const debtRows = debts.filter(d => d.balance > 0).map(d => [d.name, d.balance]);
  const total = sum(assets, a => a[1]) - sum(debtRows, d => d[1]);
  const host = h('div.chart', { style: { height: '260px' } });
  const tabs = ['Savings', 'Investments', 'Real assets', 'Debts', 'About you'];
  const own = x => !ownLineHidden(ctx.store.doc, x.id); // batch 28: a coach-only row has no line of its own in Client view
  const rows = RUI.tab === 'Debts' ? debts.filter(own).map(d => [d.name, d.balance, HOME.debt])
    : RUI.tab === 'About you' ? aboutRows(ctx)
      : (groups.find(g => g[0] === RUI.tab)?.[1] || []).filter(own).map(a => [a.name, a.value, HOME.assets]);
  queueMicrotask(() => {
    if (!window.echarts || !host.isConnected || (!assets.length && !debtRows.length)) return;
    const t = S.chartTheme('assets');
    const tc = S.chartTheme('debt');
    const c = window.echarts.init(host, null, { renderer: 'svg' });
    const palette = [t.area, S.chartTheme('income').area, S.chartTheme('needs').area];
    c.setOption({
      textStyle: { fontFamily: t.font, color: t.text }, tooltip: { trigger: 'item', valueFormatter: v => money(v) },
      title: [{ text: short(total), subtext: liquid ? 'Liquid net worth' : 'Net worth', left: '50%', top: '42%', textAlign: 'center', textStyle: { color: t.text, fontSize: 22, fontWeight: 800 }, subtextStyle: { color: t.text2 } }],
      series: [
        { name: 'Assets', type: 'pie', radius: ['58%', '78%'], center: ['50%', '52%'], label: { show: false }, data: assets.map(([k, v], i) => ({ name: k, value: Math.round(v), itemStyle: { color: palette[i % 3], borderColor: t.card, borderWidth: 2 } })) },
        { name: 'Debts', type: 'pie', radius: ['44%', '54%'], center: ['50%', '52%'], label: { show: false }, data: debtRows.map(([k, v], i) => ({ name: k, value: Math.round(v), itemStyle: { color: tc.area, opacity: 1 - i * 0.2, borderColor: t.card, borderWidth: 2 } })) },
      ],
    });
    c.on('click', p => app.go(p.seriesName === 'Debts' ? HOME.debt : HOME.assets));
    new ResizeObserver(() => c.resize()).observe(host);
  });
  return h('div.card', {},
    h('div.row-line', {}, h('strong', {}, 'Net worth'), h('span', { style: { flex: 1 } }), S.toggle([[false, 'Total'], [true, 'Liquid']], liquid, v => { RUI.liquid = v; app.render(); }, { label: 'Liquid or total' })),
    assets.length || debtRows.length ? host : S.chartEmpty(ctx, ['an account or a debt']),
    h('p.muted.small', {}, 'Outer ring: what you own. Inner ring: what you owe. Click a ring to open it.'),
    h('div.tab-list', { role: 'tablist' }, tabs.map(k => h('button.btn.small', { type: 'button', role: 'tab', 'aria-selected': String(RUI.tab === k), 'aria-pressed': String(RUI.tab === k), onclick: () => { RUI.tab = k; app.render(); } }, k))),
    h('div.home-rows', {}, rows.length ? rows.map(([name, v, href]) => h('div.home-row', {}, h('a', { href }, name), h('span', {}, typeof v === 'number' ? money(v) : v ?? ''))) : h('p.muted', {}, 'Nothing here yet.')));
}
function aboutRows(ctx) {
  const p = ctx.store.doc.profile;
  const g = ctx.gates();
  return [['Age', ctx.metrics().inputs.age ?? null], ['Household', g.couple ? 'Couple' : 'Solo'], ['Work', g.work], ['Housing', g.housing], ['Why now', whyText(p, 'whyNow')]]
    .filter(([, v]) => v != null).map(([k, v]) => [k, String(v), HOME.profile]);
}

// Cash flow Sankey: income on the left, taxes, needs, wants, debt and saving on the right.
function sankeyCard(ctx, m) {
  const x = m.inputs;
  const host = h('div.chart', { style: { height: '300px' } });
  if (x.takeHome == null || x.spending == null) return h('div.card', {}, h('strong', {}, 'Cash flow'), S.chartEmpty(ctx, [...new Set([...(x.takeHome == null ? ['take-home'] : []), ...(x.spending == null ? ['spending'] : [])])]));
  const lines = x.spendingSource === 'lines' ? x.lines.filter(l => l.status !== 'Not for me') : [];
  const wants = sum(lines.filter(l => l.draftt === 'Wants'), l => l.amount);
  const debtPay = x.debtPaymentsOutsideSpending ?? 0;
  const spend = x.spending;
  const needs = lines.length ? Math.max(0, spend - wants) : spend;
  const taxes = m.flow?.gross ? Math.max(0, m.flow.gross - x.takeHome) : 0; // every income before tax (QUESTIONS 228), so untaxed money is not read as tax saved
  const saving = Math.max(0, m.surplus.value ?? 0);
  const short2 = Math.max(0, -(m.surplus.value ?? 0));
  const src = taxes ? 'Gross, all income' : 'Take-home';
  const links = [
    taxes ? { source: 'Gross, all income', target: 'Taxes', value: taxes } : null,
    taxes ? { source: 'Gross, all income', target: 'Take-home', value: x.takeHome } : null,
    { source: 'Take-home', target: lines.length ? 'Needs' : 'Spending', value: needs },
    lines.length && wants ? { source: 'Take-home', target: 'Wants', value: wants } : null,
    debtPay ? { source: 'Take-home', target: 'Debt payments', value: debtPay } : null,
    saving ? { source: 'Take-home', target: 'Saving', value: saving } : null,
    short2 ? { source: 'Shortfall', target: 'Take-home', value: short2 } : null,
  ].filter(Boolean).map(l => ({ ...l, value: Math.round(l.value) })).filter(l => l.value > 0);
  const names = [...new Set(links.flatMap(l => [l.source, l.target]))];
  queueMicrotask(() => {
    if (!window.echarts || !host.isConnected) return;
    const t = S.chartTheme('income');
    const col = { 'Gross, all income': t.area, 'Take-home': t.area, Taxes: S.chartTheme('taxes').area, Needs: S.chartTheme('needs').area, Spending: S.chartTheme('needs').area, Wants: S.chartTheme('goals').area, 'Debt payments': S.chartTheme('debt').area, Saving: S.chartTheme('assets').area, Shortfall: t.text2 };
    const c = window.echarts.init(host, null, { renderer: 'svg' });
    c.setOption({
      textStyle: { fontFamily: t.font, color: t.text }, tooltip: { trigger: 'item', valueFormatter: v => `${money(v)} a month` },
      animation: false, series: [{ type: 'sankey', left: 8, right: 170, top: 12, bottom: 12, nodeGap: 18, nodeWidth: 16, nodeAlign: 'right', draggable: false, emphasis: { focus: 'adjacency' },
        data: names.map(n => ({ name: n, itemStyle: { color: col[n] || t.area, borderWidth: 0 } })), links,
        lineStyle: { color: 'gradient', opacity: 0.35, curveness: 0.5 }, label: { position: 'right', color: t.text, fontWeight: 600, formatter: p => `${p.name} ${short(sumNode(links, p.name))}` } }],
    });
    new ResizeObserver(() => c.resize()).observe(host);
  });
  return h('div.card', {}, h('strong', {}, `Cash flow, a month (${src.toLowerCase()} in)`), host,
    x.spendingSource === 'gut' ? h('p.muted.small', {}, 'Spending is the gut number. Switch Budget to use the lines to split needs and wants.') : null);
}
const sumNode = (links, n) => Math.max(sum(links.filter(l => l.source === n), l => l.value), sum(links.filter(l => l.target === n), l => l.value));

// R146: fixed and variable side by side, with % of take-home; support others give (Support received).
function fixedVariable(ctx, m) {
  const x = m.inputs;
  const lines = x.lines.filter(l => l.status !== 'Not for me' && !l.irregular);
  const mine = l => (l.amount == null ? 0 : monthlyFrom(l.amount, l.per).value);
  const fixed = sum(lines.filter(l => l.amountType === 'Fixed'), mine), variable = sum(lines.filter(l => l.amountType !== 'Fixed'), mine);
  const share = v => (x.takeHome ? `${pct(v / x.takeHome)} of take-home` : null);
  if (!lines.length) return null;
  return h('div', { style: { marginTop: '16px' } }, S.summaryStrip(ctx, [
    { label: 'Fixed a month', result: { id: 'M23', value: fixed, needs: [], unit: 'money', text: `Lines with a fixed amount: ${money(fixed)}.` }, note: share(fixed), home: HOME.budget },
    { label: 'Variable a month', result: { id: 'M23', value: variable, needs: [], unit: 'money', text: `Lines with a variable amount: ${money(variable)}.` }, note: share(variable), home: HOME.budget },
    { label: 'Support received', result: m.supportReceived, home: HOME.budget, note: 'What others cover each month' },
    { label: 'Fixed floor', result: { id: 'M23', value: fixed, needs: [], unit: 'money', text: 'What you pay no matter what; it feeds runway and Lean FI.' }, home: HOME.budget, note: 'Paid no matter what' }]));
}

// ---------- One-pager ----------
export function homeworkItems(ctx) { return homeworkAll(ctx.store.doc, ctx.visible(() => true)).filter(x => x.status !== 'Confirmed'); }
// The summary in parts (run Finish everything partly built, Part 12): Send summary joins them into one text, and Share
// by email turns them into items so each person gets only what is picked for them. Always the shared view.
export function summaryParts(ctx) {
  if (!ctx.shared) ctx = S.shareCtx(ctx); // batch 28: a summary leaves the session, so private rows read as neutral words
  const m = ctx.metrics();
  const doc = ctx.store.doc;
  const op = doc.session.onePager || {};
  const gate = fiGate(ctx);
  const fiWords = gate.unlocked && m.monthsToFi.value != null ? fiWordsOf(m, null, { now: ctx.now() }) : null; // locked by the program: no date yet
  const fiRange = fiWords && !fiWords.past ? rangeWordsOf('fi', ctx.ranges?.()?.fi, { now: ctx.now() }) : null; // batch 41: the same range as the screens (M9R)
  const hw = homeworkItems(ctx);
  const nums = [
    ['netWorth', 'Net worth', m.netWorth.value == null ? null : money(m.netWorth.value)],
    ['surplus', 'Monthly surplus', m.surplus.value == null ? null : money(m.surplus.value)],
    ['savingsRate', 'Savings rate', m.savingsRate.value == null ? null : pct(m.savingsRate.value)],
    ['debtFree', 'Debt free', m.debtRule?.heavy && m.debtPlan?.months != null ? `${monthName(addMonths(ymOf(ctx.now()), m.debtPlan.months), 'short')}${m.debtRule.on ? ' (the surplus goes to heavy debt first)' : ''}` : null], // batch 11
    ['fi', 'FI date', fiWords == null ? null : `${fiWords.past ? 'reached' : fiWords.text}${fiRange ? ` (could be ${fiRange.low}${fiRange.high ? ` to ${fiRange.high}` : ' or later'})` : ''}`],
  ].filter(x => x[2] != null && x[2] !== '');
  return {
    title: `${doc.client.name || 'Client'}: session summary, ${new Date(ctx.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
    nums,
    moves: nextMoves(doc, ctx.ref, { now: ctx.now() }).map(x => x.text), // batch 12 (item 6)
    todo: hw.map(x => `${x.label}${x.where ? ` (look on: ${x.where})` : ''}`),
    notes: [['Strengths', op.strengths], ['Struggles', op.struggles], ['Do more', op.doMore], ['Do less', op.doLess]].filter(x => x[1]),
    next: doc.session.next || null,
  };
}
export function summaryText(ctx) {
  const P = summaryParts(ctx);
  const note = k => { const x = P.notes.find(n => n[0] === k); return x ? `${k === 'Strengths' ? '\n' : ''}${k}: ${x[1]}` : null; };
  return [
    P.title,
    '',
    ...P.nums.map(x => `${x[1]}: ${x[2]}`),
    '',
    ...(P.moves.length ? ['Your next moves:', ...P.moves.map((t, i) => `${i + 1}. ${t}`), ''] : []),
    P.todo.length ? 'To do:' : null, ...P.todo.map(t => `- ${t}`),
    note('Strengths'), note('Struggles'), note('Do more'), note('Do less'),
    P.next ? `\nNext session: ${P.next}` : null,
    '',
    'Coach, not a licensed financial advisor.',
  ].filter(x => x !== null).join('\n');
}
// Share by email: the summary as items (each number on its own, the moves, the to-dos, the notes, the next session).
// Every item is from the shared view, so each says it is for everyone; js/privacy.js emailDraft keeps the rule.
export function summaryItems(ctx) {
  const P = summaryParts(ctx);
  return [
    ...P.nums.map(x => ({ id: x[0], label: x[1], lines: [x[2]], seen: 'Everyone' })),
    P.moves.length ? { id: 'moves', label: 'Your next moves', lines: P.moves, seen: 'Everyone' } : null,
    P.todo.length ? { id: 'todo', label: 'To do', lines: P.todo, seen: 'Everyone' } : null,
    P.notes.length ? { id: 'notes', label: 'Strengths, struggles, do more, do less', lines: P.notes.map(n => `${n[0]}: ${n[1]}`), seen: 'Everyone' } : null,
    P.next ? { id: 'next', label: 'Next session', lines: [P.next], seen: 'Everyone' } : null,
  ].filter(Boolean);
}
// What each person sees, until it is changed on screen: every number and the next moves; the to-dos and the notes for the
// client alone. Kept on the screen only (not saved), so a draft never goes out with yesterday's picks by surprise.
export const shareDefaultPicks = (items, who) => Object.fromEntries(items.filter(it => who === 'Me' || !['todo', 'notes'].includes(it.id)).map(it => [it.id, true]));
const SHARE_PICKS = new Map();
export function shareByEmail(ctx, anchor) {
  const doc = ctx.store.doc, items = summaryItems(ctx);
  const people = [...adultsOf(doc).map(a => ({ id: a.id, name: a.name })), { id: 'other', name: 'Someone else' }];
  let who = (people.find(x => x.id === 'Partner') ?? people[0]).id; // a partner first, when there is one
  const to = {};
  const picksOf = id => { if (!SHARE_PICKS.has(id)) SHARE_PICKS.set(id, shareDefaultPicks(items, id)); return SHARE_PICKS.get(id); };
  const box = h('div.stack', { style: { gap: '10px' } });
  const draw = () => {
    const p = people.find(x => x.id === who), picks = picksOf(who);
    const D = emailDraft(items, picks, { to: to[who] || '', who: p.id === 'other' ? '' : p.name });
    const addr = h('input', { type: 'email', placeholder: 'name@example.com', 'aria-label': `${p.name}'s email`, value: to[who] || '' });
    addr.onchange = () => { to[who] = addr.value.trim(); draw(); };
    const preview = h('textarea.notes-box', { readonly: true, 'aria-label': 'The draft', style: { minHeight: '160px' } }, D.body);
    const open = h('a.btn.primary', { href: D.mailto, role: 'button' }, icon('mail'), 'Open the email draft');
    clear(box).append(
      h('strong', {}, 'Share by email'),
      h('p.muted.small', {}, 'Pick what each person sees. The draft opens in your own mail app, and you send it. SLAM sends nothing. Private rows read as neutral words.'),
      S.labelled('Who is it for?', S.toggle(people.map(x => [x.id, x.name]), who, v => { if (v) { who = v; draw(); } }, { label: 'Who is it for?' })),
      S.labelled('Their email', h('label.field', {}, addr), { note: 'Optional: you can add it in your mail app.' }),
      h('div.stack', { style: { gap: '4px' } }, h('span.label', {}, `What ${p.name === 'Someone else' ? 'they' : p.name} sees`),
        items.map(it => S.checkbox(it.label, picks[it.id] === true, on => { if (on) picks[it.id] = true; else delete picks[it.id]; draw(); }))),
      S.labelled('The draft', preview),
      h('div.row-line', { style: { gap: '8px', flexWrap: 'wrap' } }, open,
        S.button('Copy the text', { onClick: () => { try { navigator.clipboard.writeText(D.body).then(() => S.toast('Copied. Paste it into an email.')); } catch { preview.select(); } } })));
  };
  draw();
  S.popover(anchor, box, { width: 460 });
}
// Batch 8 (C15): inside the artifact the page cannot print, so a printable copy goes to the download door (open it, then
// print or save as PDF); on the site it prints as it is. The One-pager's Export PDF and the Plan report both use it.
const canPrintHere = () => { try { return window.self === window.top; } catch { return false; } }; // a framed page cannot print
async function printOrSave(selector, file, title, what) {
  if (canPrintHere()) { window.print(); return; }
  const page = document.querySelector(selector);
  const css = [...document.querySelectorAll('style')].map(x => x.textContent).join('\n');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${css}\nbody{padding:24px;background:#fff}.btn,.caret,.icon-btn,textarea,.no-print{display:none}</style></head><body><div class="${page?.className ?? ''}">${page?.innerHTML ?? ''}</div><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`;
  const r = await saveFile(new Blob([html], { type: 'text/html' }), file);
  S.toast(saveWords(r, what) ?? 'Saved: open the file and print or save it as a PDF.');
}

// ---------- The plan report (run Finish everything partly built, Part 18) ----------
// One printout (the browser saves it as a PDF): the one-pager, the next steps, the statements and the FOO, in that
// order, each from its own screen in the shared view, so private rows read as neutral words and every total still counts
// them. A guess keeps its Guess or Rough tag. No PDF library: the page and the print stylesheet (css/app.css).
export function planReportScreen(app, ctx) {
  const sc = S.shareCtx(ctx), doc = sc.store.doc;
  const one = onePagerScreen(app, ctx)[1];
  const D = recapDraft(ctx);
  const part = (id, title, ...kids) => h(`section.report-part.report-${id}`, {}, h('h2.report-part-title', {}, title), ...kids);
  const steps = D.recap.steps.length ? h('div.card', {}, h('ol.op-moves-list', {}, D.recap.steps.map(t => h('li', {}, t)))) : h('p.muted', {}, 'No next steps yet. They come from the next moves and the to-dos.');
  const takeaways = D.recap.takeaways.length ? h('div.card', { style: { marginTop: '12px' } }, h('h3', {}, 'Top takeaways'), h('ol.op-list', {}, D.recap.takeaways.map(t => h('li', {}, t.text)))) : null;
  const name = doc.client.name || 'Client';
  return [head('Plan report', 'The one-pager, the next steps, the statements and the FOO, as one printout',
      S.button('Back to the One-pager', { iconName: 'left', onClick: () => app.go('#/report/one-pager') }),
      S.button('Print or save as PDF', { kind: 'primary', iconName: 'printer', onClick: () => printOrSave('.plan-report', `${name.replace(/\s+/g, '-').toLowerCase()}-plan-report.html`, `${name}: plan report`, 'The plan report'), tip: canPrintHere() ? 'Print, or pick Save as PDF in the print box' : 'Saves a printable copy; open it and save as PDF' })),
    h('div.plan-report', {},
      h('p.muted.small.report-note', {}, `${name}, ${new Date(ctx.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. A number marked Guess or Rough is still an estimate. Rows kept private show as neutral words; every total still counts them.`),
      part('one-pager', 'One-pager', one),
      part('steps', 'Next steps', steps, takeaways),
      part('statements', 'Statements', ...statementsScreen(app, sc).slice(1)),
      part('foo', 'FOO, the order of operations', ...fooScreen(app, sc, { flags: app.flags }).slice(1)),
      h('p.disclaimer', {}, 'Coach, not a licensed financial advisor.'))];
}

// ---------- The auto session summary (run Finish everything partly built, Part 18; M8R) ----------
// What this session changed, from the shared view (private rows never show, not even by name), the key numbers then
// (the last snapshot before the session started) and now, the next moves and the client's to-dos. js/math/recap.js
// drafts it (M8R); the coach edits the text on the One-pager, and Send summary sends what the box holds.
const RECAP_SKIP = new Set(['settings', 'session', 'snapshots', 'usage']);
export function recapOf(ctx) {
  if (!ctx.shared) ctx = S.shareCtx(ctx);
  const doc = ctx.store.doc, s = sessionOf(doc), snaps = (doc.snapshots || []).filter(x => x.metrics);
  const since = s.startedAt || snaps.at(-1)?.at || null;
  const beforeSnap = since ? [...snaps].reverse().find(x => x.at < since) ?? null : null;
  const recOf = id => doc.records.find(r => r.id === id) ?? null;
  const changes = (doc.history || []).filter(e => (!since || e.at >= since) && !RECAP_SKIP.has(e.part) && !['coachNote', 'privateNote', 'notes'].includes(e.field)).map(e => {
    const op = String(e.op || '').split(':').at(-1), r = e.id ? recOf(e.id) ?? e.was ?? null : null;
    const open = r && !r.folded && shareSees(seenOf(r));
    return { op, rowId: e.id ?? null, kind: e.kind ?? r?.kind ?? null, part: e.part ?? null, name: open ? r.name || r.type || null : null };
  }).filter(c => c.rowId || c.part);
  const P = summaryParts(ctx), gate = fiGate(ctx);
  const recap = sessionRecap({ before: beforeSnap?.metrics ?? null, now: keyNumbers(ctx.metrics()), changes, moves: P.moves, todo: homeworkItems(ctx).filter(x => x.owner !== 'coach').map(x => x.label) },
    { at: ymOf(ctx.now()), beforeAt: beforeSnap ? ymOf(new Date(beforeSnap.at)) : null, fiOk: gate.unlocked });
  const key = s.startedAt || since || 'first';
  return { recap, key, text: recapText(recap, { title: P.title, next: P.next, notes: P.notes }) };
}
// The text Send summary sends: the coach's edit when it is for this session, else the draft.
export function recapDraft(ctx) {
  const R = recapOf(ctx), own = sessionOf(ctx.store.doc).recap;
  return { ...R, edited: !!(own?.text && own.for === R.key), value: own?.text && own.for === R.key ? own.text : R.text };
}
function recapCard(ctx) {
  const D = recapDraft(ctx);
  const ta = h('textarea.notes-box.recap-box', { 'aria-label': 'The session summary', 'data-focus': 'op:recap', style: { minHeight: '260px' } }, D.value);
  ta.onchange = () => ctx.store.setIn('session', ['recap'], ta.value.trim() && ta.value !== D.text ? { text: ta.value, for: D.key, at: new Date(ctx.now()).toISOString() } : undefined, 'Session summary');
  const n = D.recap.takeaways.length, k = D.recap.steps.length;
  return h('div.no-print.recap-wrap', {}, S.sec('one-pager:recap', { title: 'Session summary, drafted for you', level: 'h3', open: true, summary: `${n} ${n === 1 ? 'takeaway' : 'takeaways'}, ${k} next ${k === 1 ? 'step' : 'steps'}${D.edited ? ', edited' : ''}` },
    h('div.stack', { style: { gap: '8px', marginTop: '8px' } },
      h('p.muted.small', { style: { margin: 0 } }, D.recap.firstSession ? 'From this first session: the numbers as they are today, what was added, and the next steps. Edit anything, then Send summary sends this text.' : 'From this session: what moved since the last one, what was added or changed, and the next steps. Edit anything, then Send summary sends this text.'),
      ta,
      D.edited ? h('div.row-line', {}, S.button('Draft it again from the session', { iconName: 'undo', onClick: () => ctx.store.setIn('session', ['recap'], undefined, 'Session summary'), tip: 'Puts back the draft from what the session changed. Undo brings your edit back' })) : null)));
}
export function sendSummary(ctx, anchor) {
  const text = recapDraft(ctx).value;
  const fallback = () => {
    const ta = h('textarea.notes-box', { readonly: true, style: { minHeight: '260px' } }, text);
    S.popover(anchor, h('div.stack', { style: { gap: '8px' } }, h('strong', {}, 'Copy this and paste it into an email'), ta), { width: 460 });
    setTimeout(() => { ta.focus(); ta.select(); });
  };
  try {
    navigator.clipboard.writeText(text).then(() => S.toast('Summary copied. Paste it into an email.'), fallback);
  } catch { fallback(); }
  ctx.store.setIn('session', ['summarySentAt'], new Date(ctx.now()).toISOString(), 'Summary sent');
}
export function onePagerScreen(app, ctx) {
  ctx = S.shareCtx(ctx); // batch 28: the one-pager is what leaves the session: private rows fold into neutral words, totals the same
  const m = ctx.metrics();
  const doc = ctx.store.doc;
  const op = doc.session.onePager || {};
  const box = (k, label, hint) => {
    const ta = h('textarea', { placeholder: hint, 'aria-label': label, 'data-focus': `op:${k}` }, op[k] || '');
    ta.onchange = () => ctx.store.setIn('session', ['onePager', k], ta.value.trim() || undefined, label);
    return S.labelled(label, ta);
  };
  const hw = homeworkItems(ctx);
  const goals = ctx.visible(r => r.kind === 'milestone');
  const exportPdf = () => printOrSave('.one-pager', `${(doc.client.name || 'client').replace(/\s+/g, '-').toLowerCase()}-one-pager.html`, `${doc.client.name || 'Client'}: one-pager`, 'The one-pager');
  return [head('One-pager', 'Session summary, ready to send',
    S.button('Export PDF', { iconName: 'printer', onClick: exportPdf, tip: canPrintHere() ? 'Print, or save as PDF' : 'Saves a printable copy; open it and save as PDF' }),
    S.button('Plan report', { iconName: 'printer', onClick: () => app.go('#/report/plan-report'), tip: 'The one-pager, the statements, the FOO and the next steps, as one printout or PDF' }), // run Finish everything partly built, Part 18
    sheetButtons(app, { choice: false }), // batch 28: What the files hold is on Coach tools › Data (the header stays slim)
    S.button('Share by email', { iconName: 'mail', onClick: e => shareByEmail(ctx, e.currentTarget), tip: 'Pick what each person sees; a draft you send yourself' }), // run Finish everything partly built, Part 12
    S.button('Send summary', { kind: 'primary', iconName: 'mail', onClick: e => sendSummary(ctx, e.currentTarget) })),
  h('div.card.one-pager', {},
    h('h2', {}, `${doc.client.name || 'Client'}, ${new Date(ctx.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`),
    doc.records.some(r => r.folded) ? h('p.private-line.muted.small.no-print', { title: 'Rows kept between a person and the coach show here as neutral words (Other income, Other spending). Every total still counts them' }, icon('eye-off'), `${PRIVATE_LINE}: shown as neutral words`) : null,
    identityLine(ctx), // batch 25 (Phase 4): who they are with money, one line, and the wording it leads with
    recapCard(ctx), // run Finish everything partly built, Part 18: the auto session summary, editable before Send summary
    movesBlock(app, ctx), // batch 12 (item 6): Your next 3 moves, then the tiles
    cardPlanNote(ctx, { link: false }), // the card plan's one sentence, the same call cards.html makes
    S.summaryStrip(ctx, [
      { label: 'Net worth', result: m.netWorth, key: 'netWorth', home: HOME.netWorth, so: soWhat('netWorth', m) },
      { label: 'Monthly surplus', result: m.surplus, key: 'surplus', home: HOME.surplus, so: soWhat('surplus', m) },
      { label: 'Savings rate', result: m.savingsRate, key: 'savingsRate', home: HOME.savingsRate, note: m.savingsRate.second, so: soWhat('savingsRate', m) },
      fiCard(ctx, m)]),
    h('div.op-grid', {},
      h('div', {}, h('h3', {}, 'To-dos'), hw.filter(x => x.owner !== 'coach').length ? h('ul.op-list', {}, hw.filter(x => x.owner !== 'coach').map(x => h('li', {}, x.label, x.where ? h('span.muted.small', {}, ` · ${x.where}`) : null))) : h('p.muted', {}, "No homework yet. Tap Will get it on any number to add it.")), // the client's own items; the coach's stay on Coach tools (batch 7, item 9)
      h('div', {}, h('h3', {}, 'Goals'), h('ul.op-list', {},
        m.debtRule?.heavy && m.debtPlan?.months != null ? h('li', {}, `Debt free ${monthName(addMonths(ymOf(ctx.now()), m.debtPlan.months), 'short')}${m.debtRule.on ? ': the surplus goes to heavy debt first' : ''}`) : null, // batch 11
        m.monthsToFi.value != null && fiGate(ctx).unlocked ? h('li', {}, `FI ${fiWordsOf(m, null, { now: ctx.now() })?.past ? 'reached' : fiWordsOf(m, null, { now: ctx.now() })?.text ?? ''}${doc.assumptions.fiAge ? `, target age ${doc.assumptions.fiAge}` : ''}`) : null,
        goals.map(g => h('li', {}, g.name || g.type)), !goals.length && (m.monthsToFi.value == null || !fiGate(ctx).unlocked) ? h('li.muted', {}, fiGate(ctx).unlocked ? 'Set an FI target on Plan' : `FI date: ${fiGate(ctx).reason}`) : null))),
    S.sec('one-pager:notes', { title: 'Strengths, struggles, do more, do less', level: 'h3', summary: `${['strengths', 'struggles', 'doMore', 'doLess'].filter(k => op[k]).length} of 4 written` }, // batch 13: the coach's four boxes fold
      h('div.op-grid', { style: { marginTop: '8px' } }, box('strengths', 'Strengths', 'What is going well'), box('struggles', 'Struggles', 'What is hard right now')),
      h('div.op-grid', { style: { marginTop: '16px' } }, box('doMore', 'Do more', 'Keep doing'), box('doLess', 'Do less', 'Ease off'))),
    h('p.disclaimer', {}, 'Coach, not a licensed financial advisor.'))]; // R182
}

// Batch 12 (item 6, M82): Your next 3 moves, each with dollars and a month, each a link to its screen (RightCapital's
// Snapshot tiles link to the detail the same way).
function movesBlock(app, ctx) {
  const moves = nextMoves(ctx.store.doc, ctx.ref, { now: ctx.now(), flags: app.flags });
  if (!moves.length) return null;
  return h('section.op-moves', { 'aria-label': 'Your next 3 moves' }, h('h3', {}, moves.length === 3 ? 'Your next 3 moves' : `Your next ${moves.length === 1 ? 'move' : `${moves.length} moves`}`),
    h('ol.op-moves-list', {}, moves.map(mv => h('li', {}, h('a', { href: mv.route }, mv.text)))));
}

// The FI date as a month, with how far off it is (fits a narrow card). Locked by the program until income and
// spending reach Estimate and an invested balance is in (Phase 3); once unlocked, a confidence label.
export function fiGate(ctx) {
  const pic = pictureOf(ctx.store.doc, ctx.ref, { now: ctx.now() });
  const u = unlockOf('fi', pic);
  return { ...u, confidence: u.unlocked ? confidenceOf('fi', pic, { now: ctx.now() }) : null, payoff: unlockOf('payoff', pic) };
}
export function fiCard(ctx, m) {
  const v = m.monthsToFi.value;
  const g = fiGate(ctx);
  const words = g.unlocked && v != null ? fiWordsOf(m, null, { now: ctx.now() }) : null; // batch 41: the likely month; the range is the quiet line under it (M9R)
  // Answer 123: line 1 is the path the FI date assumes; line 2 the other path, only when the two differ.
  const iv = m.investing, alt = iv?.investSurplus ? m.fiPaths?.idle : m.fiPaths?.invested;
  const altWords = words && alt?.value != null ? fiWordsOf({ ...m, monthsToFi: alt, investing: { ...iv, investSurplus: !iv.investSurplus, monthly: iv.investSurplus ? iv.idle : iv.invested } }, null, { now: ctx.now() }) : null;
  const safer = words ? saferFi(m, { from: ctx.now() }) : null; // batch 5 C: a second, smaller line under 45
  const lines = !words ? null : words.past ? h('span.stack.fi-lines', {}, h('strong', {}, 'FI reached')) : h('span.stack.fi-lines', {},
    h('span', {}, iv?.debtFirst ? 'Heavy debt first: ' : m.fooFlow?.waitMonths ? 'big e first: ' : iv?.investSurplus ? 'Invest your surplus: ' : 'Surplus sits in checking: ', h('strong', {}, words.past ? 'FI reached' : `FI ${words.kind === 'month' ? 'in' : 'around'} ${words.text}`)),
    h('span.muted.small', {}, m.fooFlow ? `assumes the surplus ${flowWords(m.fooFlow, ctx.now(), { invested: iv.investSurplus })}` : iv?.debtFirst ? `assumes the surplus pays heavy debt until ${monthName(addMonths(ymOf(ctx.now()), m.debtPlan.heavyMonths ?? 0), 'short')}, then ${iv.investSurplus ? 'is invested' : 'stays in checking'}` : iv?.investSurplus ? 'assumes your surplus gets invested' : 'assumes the surplus is not invested', ` · ${words.years}`),
    safer ? h('span.muted.small.fi-safer', { title: safer.words }, safer.text) : null,
    altWords && altWords.text !== words.text ? h('span.muted.small', {}, `${iv?.investSurplus ? 'If it sits in checking' : 'If invested'}: ${altWords.text}`) : alt?.never && words ? h('span.muted.small', {}, `${iv?.investSurplus ? 'If it sits in checking' : 'If invested'}: not on this path`) : null);
  return { label: 'FI date', result: m.monthsToFi, key: 'monthsToFi', home: HOME.fi, lock: g.unlocked ? null : { reason: g.reason, route: g.route }, // batch 43 (QUESTIONS 341): no confidence tag; the range line says it
    render: words ? () => words.text : null, note: lines ?? (v == null ? null : `${(v / 12).toFixed(1)} years from now`), range: words && !words.past ? rangeLine(ctx, 'fi') : null };
}

// ---------- History ----------
// Total and liquid net worth over time, from the snapshots (M6.2: also on Home, collapsed).
export function netWorthChart(snaps, { height = 280 } = {}) {
  const host = h('div.chart', { style: { height: `${height}px` } });
  queueMicrotask(() => {
    if (!window.echarts || !host.isConnected) return;
    const t = S.chartTheme('assets');
    const c = window.echarts.init(host, null, { renderer: 'svg' });
    c.setOption({
      textStyle: { fontFamily: t.font, color: t.text }, grid: { left: 64, right: 24, top: 32, bottom: 32 }, legend: { top: 0, textStyle: { color: t.text2 } }, tooltip: { trigger: 'axis', valueFormatter: v => money(v) },
      xAxis: { type: 'category', data: snaps.map(s => new Date(s.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })), axisLabel: { color: t.text2 } },
      yAxis: { type: 'value', axisLabel: { color: t.text2, formatter: v => short(v) }, splitLine: { lineStyle: { color: t.line } } },
      series: [{ name: 'Net worth', type: 'line', data: snaps.map(s => s.metrics.netWorth), symbolSize: 9, lineStyle: { color: t.area, width: 3 }, itemStyle: { color: t.area } },
        { name: 'Liquid net worth', type: 'line', data: snaps.map(s => s.metrics.liquidNetWorth ?? null), symbolSize: 6, lineStyle: { color: t.text2, type: 'dashed' }, itemStyle: { color: t.text2 } }],
    });
    new ResizeObserver(() => c.resize()).observe(host);
  });
  return host;
}
export function historyScreen(app, ctx) {
  const doc = ctx.store.doc;
  const snaps = doc.snapshots.filter(s => s.metrics);
  const months = closedMonths(doc);
  const acc = gutAccuracy(months);
  const since = monthsBetween(ymOf(new Date(doc.createdAt || ctx.now())), ymOf(ctx.now()));
  if (!snaps.length) return [head('History', 'Snapshots over time'), h('div.list', {}, h('div.empty', {}, h('span.title', {}, 'No snapshots yet'),
    h('span.muted', {}, 'End session saves one, so next time shows what changed.'), S.button('Save snapshot', { iconName: 'camera', onClick: () => app.snapshot('Snapshot') })))];
  const host = netWorthChart(snaps);
  // Batch 34 (Rocket Surgery): "what changed since last time" is the last snapshot against today, not the first
  // snapshot against the last (with one snapshot that was always $0, and today's edits were never in it).
  const first = snaps[0].metrics, lastSnap = snaps[snaps.length - 1], last = lastSnap.metrics, now = keyNumbers(ctx.metrics());
  const day = at => new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const sinceWords = `since ${day(lastSnap.at)}`;
  const longer = (k, f) => (snaps.length > 1 && first[k] != null && now[k] != null ? ` Since the first snapshot (${day(snaps[0].at)}): ${f(first[k], now[k])}.` : '');
  const signed = v => `${v < 0 ? '−' : '+'}${money(Math.abs(v))}`;
  const strip = S.summaryStrip(ctx, [
      { label: `Net worth ${sinceWords}`, result: { id: 'M40', value: last.netWorth == null || now.netWorth == null ? null : now.netWorth - last.netWorth, needs: [], unit: 'money', text: `From the snapshot on ${day(lastSnap.at)} (${lastSnap.label}) to now.${longer('netWorth', (a, b) => signed(b - a))}` }, so: soWhat('netWorthChange', ctx.metrics(), { first, last: now }) },
      { label: `Debt paid down ${sinceWords}`, result: { id: 'M30', value: last.debtTotal == null || now.debtTotal == null ? null : last.debtTotal - now.debtTotal, needs: [], unit: 'money', text: `Total debt at the snapshot on ${day(lastSnap.at)} minus total debt now.${longer('debtTotal', (a, b) => money(a - b))}` }, so: soWhat('debtPaid', ctx.metrics(), { first, last: now }) },
      { label: 'Gut accuracy', result: acc, note: acc.hidden ? 'After the first closed month' : 'Average miss of the first guess' },
      { label: 'Snapshots', result: { id: 'M00', value: snaps.length, needs: [], unit: 'count', text: 'Saved at the end of sessions and before imports or resets.' }, render: r => String(r.value) }]);
  strip.setAttribute('data-focus', 'history:since'); // batch 34: Find's "what changed" lands here
  return [head('History', 'Snapshots over time'), strip,
    S.sec('history:net-worth', { title: 'Net worth over time', open: true }, () => h('div.card', {}, host)), // batch 13: caret sections
    h('div.card', { style: { marginTop: '16px' } }, h('div.list-scroll', {}, h('table.rows', {},
      h('thead', {}, h('tr', {}, ['Snapshot', 'When', 'Net worth', 'Debt', 'Savings rate', 'Surplus'].map((k, i) => h(`th${i > 1 ? '.num' : ''}`, {}, k)))),
      h('tbody', {}, [{ label: 'Now', at: null, metrics: now }, ...[...snaps].reverse()].map(s => h(`tr.row${s.at ? '' : '.now-row'}`, {}, h('td.col-first', {}, s.at ? s.label : h('strong', {}, 'Now')), h('td', {}, s.at ? new Date(s.at).toLocaleString() : 'Today'),
        h('td.num', {}, money(s.metrics.netWorth)), h('td.num', {}, money(s.metrics.debtTotal)), h('td.num', {}, s.metrics.savingsRate == null ? '' : pct(s.metrics.savingsRate)), h('td.num', {}, money(s.metrics.surplus)))))))),
    S.sec('history:wrapped', { title: 'Wrapped, your year in review' }, () => wrapped(ctx, snaps, months, since)),
    auditSection(app, ctx), // Nov 25 2026: opt-in, closed, opened from here or not at all
    S.sec('history:log', { title: 'Change log' }, () => changeLogTable(ctx))]; // F6: every edit with who
}
// F6: the change log, newest first: when, what, field, from, to, who (Coach or Client).
function changeLogTable(ctx) {
  const rows = changeLog(ctx.store.doc, { limit: 100 });
  if (!rows.length) return h('p.muted', {}, 'No changes logged yet.');
  return h('div.card', {}, h('table.rows', {}, h('thead', {}, h('tr', {}, ['When', 'What', 'Field', 'From', 'To', 'Who'].map(x => h('th', {}, x)))),
    h('tbody', {}, rows.map(e => h('tr', {}, h('td', {}, new Date(e.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })), h('td', {}, `${e.op}: ${e.what}`), h('td', {}, e.field), h('td.muted', {}, e.from), h('td', {}, e.to), h('td', {}, h('span.tag.plain', {}, e.who)))))),
    h('p.muted.small', { style: { margin: '6px 0 0' } }, 'The last 100. The Captured tab of the spreadsheet carries up to 600.'));
}
// Year in review (R126): unlocks with 12 months of history.
function wrapped(ctx, snaps, months, since) {
  if (since < 12) return h('div.card', { style: { marginTop: '16px' } }, h('strong', {}, 'Wrapped, your year in review'), h('p.muted', {}, `Unlocks after 12 months of history (${Math.max(0, since)} of 12).`));
  const first = snaps[0].metrics, last = snaps[snaps.length - 1].metrics;
  const bestRate = Math.max(...snaps.map(s => s.metrics.savingsRate ?? -1));
  const cards = [
    ['Debt paid', first.debtTotal != null && last.debtTotal != null ? money(first.debtTotal - last.debtTotal) : 'Not tracked'],
    ['Net worth grew', first.netWorth != null && last.netWorth != null ? money(last.netWorth - first.netWorth) : 'Not tracked'],
    ['Best savings rate', bestRate >= 0 ? pct(bestRate) : 'Not tracked'],
    ['Months closed', String(months.length)],
  ];
  return h('div.card', { style: { marginTop: '16px' } }, h('strong', {}, 'Wrapped, your year in review'), h('div.shelf', { style: { marginTop: '12px' } }, cards.map(([k, v]) => h('div.metric', {}, h('span.label', {}, k), h('div.big', {}, v)))));
}
