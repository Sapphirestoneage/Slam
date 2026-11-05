// SPDX-License-Identifier: AGPL-3.0-only
// Report (build phase 8): Overview (donuts, metrics shelf, Sankey), One-pager, History. Read only:
// every number links to its home, where it is typed.
import { h, clear, icon } from './dom.js';
import { changeLog } from '../capture.js';
import { homeworkList } from '../homework.js';
import * as S from './staples.js';
import { sheetButtons } from './sheet-ui.js';
import { soWhat } from '../sowhat.js';
import { debtRatios } from './lists.js';
import { taxRates, monthlyFrom } from '../math/income.js';
import { drafttShares } from '../math/spending.js';
import { gutAccuracy } from '../math/spending.js';
import { fiTargets, ladder, agenda } from '../plan.js';
import { pictureOf, unlockOf, confidenceOf, fiWordsOf } from '../math/picture.js';
import { homeworkAll } from '../program.js';
import { closedMonths, monthName, ymOf, monthsBetween } from '../month.js';
import { money, pct } from '../format.js';

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
  const tax = x.grossAnnual ? taxRates({ gross: x.grossAnnual, filingStatus: x.filingStatus, place: x.place }, ctx.ref) : { id: 'M14', value: null, needs: ['gross pay'], unit: 'pct' };
  const shares = drafttShares(x.lines, x.takeHome, { roommates: x.roommates });
  const topLetter = shares.value ? Object.entries(shares.value).sort((a, b) => b[1] - a[1]).find(([, v]) => v > 0) : null;
  const l = ladder(m, ctx.store.doc);
  const r5 = m.ruleOf5;
  const shelf = [
    { label: 'Savings rate', result: m.savingsRate, key: 'savingsRate', home: HOME.savingsRate, note: m.savingsRate.second, so: soWhat('savingsRate', m) },
    { label: 'Biggest DRAFTT letter', result: topLetter ? { id: 'M29', value: topLetter[1], needs: [], unit: 'pct', text: shares.text } : { ...shares, value: null, needs: shares.needs?.length ? shares.needs : ['a tagged spending line'] },
      home: HOME.budget, note: topLetter ? `${topLetter[0]}, share of take-home` : 'Share of take-home', so: soWhat('drafttTop', m, { top: topLetter }) },
    { label: 'Debt-to-income', result: ratios.dti, home: HOME.debt, so: soWhat('dti', m, ratios.dti) },
    { label: 'Housing %', result: m.housingPct, home: HOME.budget, so: soWhat('housing', m) },
    { label: 'Rule of 5 cushion', result: r5, home: HOME.assets, so: soWhat('ruleOf5', m) },
    { label: 'Tax rate', result: tax, home: HOME.taxes, note: tax.marginal != null ? `Last dollar ${pct(tax.marginal)}` : null, so: soWhat('taxRate', m, tax) },
    { label: 'Utilization', result: ratios.util, home: HOME.debt, so: soWhat('util', m, ratios.util) },
    { label: 'Of the way to FI', result: l.value === null ? l : { id: 'M55', value: l.value['Regular FI'], needs: l.value['Regular FI'] == null ? ['an FI number'] : [], unit: 'pct', text: l.text }, home: HOME.fi,
      note: l.value?.['Coast FI'] != null ? `Coast ${pct(Math.min(1, l.value['Coast FI']))} · Lean ${pct(Math.min(1, l.value['Lean FI'] ?? 0))}` : null, so: soWhat('ofFi', m, { value: l.value?.['Regular FI'] ?? null }) },
  ];
  return [head('Overview', 'Read only. Every number links to its home'),
    S.summaryStrip(ctx, [
      { label: 'Net worth', result: m.netWorth, key: 'netWorth', home: HOME.netWorth, so: soWhat('netWorth', m) },
      { label: 'Liquid net worth', result: m.liquidNetWorth, home: HOME.assets, so: soWhat('liquid', m) },
      { label: 'Monthly surplus', result: m.surplus, key: 'surplus', home: HOME.surplus, so: soWhat('surplus', m) },
      { label: 'Runway', result: m.runwayMonths, render: r => `${r.value.toFixed(1)} months`, home: HOME.assets, so: soWhat('runway', m) }]),
    h('div.section-title', {}, h('h2', {}, 'Metrics'), h('span.muted', {}, 'Lit when the numbers behind them exist')),
    h('div.shelf', {}, shelf.map(i => S.metricCard(ctx, i.label, i.result, i))),
    h('div.report-grid', {}, donutCard(app, ctx, m), sankeyCard(ctx, m)),
    fixedVariable(ctx, m)];
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
  const rows = RUI.tab === 'Debts' ? debts.map(d => [d.name, d.balance, HOME.debt])
    : RUI.tab === 'About you' ? aboutRows(ctx)
      : (groups.find(g => g[0] === RUI.tab)?.[1] || []).map(a => [a.name, a.value, HOME.assets]);
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
  return [['Age', ctx.metrics().inputs.age ?? null], ['Household', g.couple ? 'Couple' : 'Solo'], ['Work', g.work], ['Housing', g.housing], ['Why now', p.whyNow]]
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
  const taxes = x.grossAnnual ? Math.max(0, x.grossAnnual / 12 - x.takeHome) : 0;
  const saving = Math.max(0, m.surplus.value ?? 0);
  const short2 = Math.max(0, -(m.surplus.value ?? 0));
  const src = taxes ? 'Gross pay' : 'Take-home';
  const links = [
    taxes ? { source: 'Gross pay', target: 'Taxes', value: taxes } : null,
    taxes ? { source: 'Gross pay', target: 'Take-home', value: x.takeHome } : null,
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
    const col = { 'Gross pay': t.area, 'Take-home': t.area, Taxes: S.chartTheme('taxes').area, Needs: S.chartTheme('needs').area, Spending: S.chartTheme('needs').area, Wants: S.chartTheme('goals').area, 'Debt payments': S.chartTheme('debt').area, Saving: S.chartTheme('assets').area, Shortfall: t.text2 };
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
export function summaryText(ctx) {
  const m = ctx.metrics();
  const doc = ctx.store.doc;
  const op = doc.session.onePager || {};
  const gate = fiGate(ctx);
  const fiWords = gate.unlocked && m.monthsToFi.value != null ? fiWordsOf(m, gate.confidence, { now: ctx.now() }) : null; // locked by the program: no date yet
  const line = (k, v) => (v == null || v === '' ? null : `${k}: ${v}`);
  const hw = homeworkItems(ctx);
  return [
    `${doc.client.name || 'Client'}: session summary, ${new Date(ctx.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
    '',
    line('Net worth', m.netWorth.value == null ? null : money(m.netWorth.value)),
    line('Monthly surplus', m.surplus.value == null ? null : money(m.surplus.value)),
    line('Savings rate', m.savingsRate.value == null ? null : pct(m.savingsRate.value)),
    line('FI date', fiWords == null ? null : `${fiWords.text}${fiWords.kind === 'month' ? '' : ` (${gate.confidence?.label ?? 'a range'})`}`),
    '',
    hw.length ? 'To do:' : null, ...hw.map(x => `- ${x.label}${x.where ? ` (look on: ${x.where})` : ''}`),
    op.strengths ? `\nStrengths: ${op.strengths}` : null, op.struggles ? `Struggles: ${op.struggles}` : null,
    op.doMore ? `Do more: ${op.doMore}` : null, op.doLess ? `Do less: ${op.doLess}` : null,
    doc.session.next ? `\nNext session: ${doc.session.next}` : null,
    '',
    'Coach, not a licensed financial advisor.',
  ].filter(x => x !== null).join('\n');
}
export function sendSummary(ctx, anchor) {
  const text = summaryText(ctx);
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
  const canPrint = (() => { try { return window.self === window.top; } catch { return false; } })(); // a framed page cannot print
  return [head('One-pager', 'Session summary, ready to send',
    canPrint ? S.button('Export PDF', { iconName: 'printer', onClick: () => window.print(), tip: 'Print, or save as PDF' }) : null,
    sheetButtons(app),
    S.button('Send summary', { kind: 'primary', iconName: 'mail', onClick: e => sendSummary(ctx, e.currentTarget) })),
  h('div.card.one-pager', {},
    h('h2', {}, `${doc.client.name || 'Client'}, ${new Date(ctx.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`),
    S.summaryStrip(ctx, [
      { label: 'Net worth', result: m.netWorth, key: 'netWorth', home: HOME.netWorth, so: soWhat('netWorth', m) },
      { label: 'Monthly surplus', result: m.surplus, key: 'surplus', home: HOME.surplus, so: soWhat('surplus', m) },
      { label: 'Savings rate', result: m.savingsRate, key: 'savingsRate', home: HOME.savingsRate, note: m.savingsRate.second, so: soWhat('savingsRate', m) },
      fiCard(ctx, m)]),
    h('div.op-grid', {},
      h('div', {}, h('h3', {}, 'To-dos'), hw.length ? h('ul.op-list', {}, hw.map(x => h('li', {}, x.label))) : h('p.muted', {}, "No homework yet. Tap I'll find it later on any number to add it.")),
      h('div', {}, h('h3', {}, 'Goals'), h('ul.op-list', {},
        m.monthsToFi.value != null && fiGate(ctx).unlocked ? h('li', {}, `FI ${fiWordsOf(m, fiGate(ctx).confidence, { now: ctx.now() })?.text ?? ''}${doc.assumptions.fiAge ? `, target age ${doc.assumptions.fiAge}` : ''}`) : null,
        goals.map(g => h('li', {}, g.name || g.type)), !goals.length && (m.monthsToFi.value == null || !fiGate(ctx).unlocked) ? h('li.muted', {}, fiGate(ctx).unlocked ? 'Set an FI target on Plan' : `FI date: ${fiGate(ctx).reason}`) : null))),
    h('div.op-grid', { style: { marginTop: '16px' } }, box('strengths', 'Strengths', 'What is going well'), box('struggles', 'Struggles', 'What is hard right now')),
    h('div.op-grid', { style: { marginTop: '16px' } }, box('doMore', 'Do more', 'Keep doing'), box('doLess', 'Do less', 'Ease off')),
    h('p.disclaimer', {}, 'Coach, not a licensed financial advisor.'))]; // R182
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
  const words = g.unlocked && v != null ? fiWordsOf(m, g.confidence, { now: ctx.now() }) : null;
  // Answer 123: line 1 is the path the FI date assumes; line 2 the other path, only when the two differ.
  const iv = m.investing, alt = iv?.investSurplus ? m.fiPaths?.idle : m.fiPaths?.invested;
  const altWords = words && alt?.value != null ? fiWordsOf({ ...m, monthsToFi: alt, investing: { ...iv, investSurplus: !iv.investSurplus, monthly: iv.investSurplus ? iv.idle : iv.invested } }, g.confidence, { now: ctx.now() }) : null;
  const lines = !words ? null : h('span.stack.fi-lines', {},
    h('span', {}, iv?.investSurplus ? 'Invest your surplus: ' : 'Surplus sits in checking: ', h('strong', {}, `FI ${words.kind === 'month' ? 'in' : 'around'} ${words.text}`)),
    h('span.muted.small', {}, iv?.investSurplus ? 'assumes your surplus gets invested' : 'assumes the surplus is not invested', ` · ${words.years}`),
    altWords && altWords.text !== words.text ? h('span.muted.small', {}, `${iv?.investSurplus ? 'If it sits in checking' : 'If invested'}: ${altWords.text}`) : alt?.never && words ? h('span.muted.small', {}, `${iv?.investSurplus ? 'If it sits in checking' : 'If invested'}: not on this path`) : null);
  return { label: 'FI date', result: m.monthsToFi, key: 'monthsToFi', home: HOME.fi, lock: g.unlocked ? null : { reason: g.reason, route: g.route }, confidence: g.confidence,
    render: words ? () => words.text : null, note: lines ?? (v == null ? null : `${(v / 12).toFixed(1)} years from now`) };
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
  const first = snaps[0].metrics, last = snaps[snaps.length - 1].metrics;
  return [head('History', 'Snapshots over time'),
    S.summaryStrip(ctx, [
      { label: 'Net worth change', result: { id: 'M40', value: first.netWorth == null || last.netWorth == null ? null : last.netWorth - first.netWorth, needs: [], unit: 'money', text: `From the first snapshot (${new Date(snaps[0].at).toLocaleDateString()}) to the last.` }, so: soWhat('netWorthChange', ctx.metrics(), { first, last }) },
      { label: 'Debt paid down', result: { id: 'M30', value: first.debtTotal == null || last.debtTotal == null ? null : first.debtTotal - last.debtTotal, needs: [], unit: 'money', text: 'Total debt at the first snapshot minus total debt now.' }, so: soWhat('debtPaid', ctx.metrics(), { first, last }) },
      { label: 'Gut accuracy', result: acc, note: acc.hidden ? 'After the first closed month' : 'Average miss of the first guess' },
      { label: 'Snapshots', result: { id: 'M00', value: snaps.length, needs: [], unit: 'count', text: 'Saved at the end of sessions and before imports or resets.' }, render: r => String(r.value) }]),
    S.moreBlock('history:net-worth', () => h('div.card', {}, host), { label: 'Net worth over time' }),
    h('div.card', { style: { marginTop: '16px' } }, h('div.list-scroll', {}, h('table.rows', {},
      h('thead', {}, h('tr', {}, ['Snapshot', 'When', 'Net worth', 'Debt', 'Savings rate', 'Surplus'].map((k, i) => h(`th${i > 1 ? '.num' : ''}`, {}, k)))),
      h('tbody', {}, [...snaps].reverse().map(s => h('tr.row', {}, h('td.col-first', {}, s.label), h('td', {}, new Date(s.at).toLocaleString()),
        h('td.num', {}, money(s.metrics.netWorth)), h('td.num', {}, money(s.metrics.debtTotal)), h('td.num', {}, s.metrics.savingsRate == null ? '' : pct(s.metrics.savingsRate)), h('td.num', {}, money(s.metrics.surplus)))))))),
    S.moreBlock('history:wrapped', () => wrapped(ctx, snaps, months, since), { label: 'Wrapped, your year in review' }),
    S.moreBlock('history:log', () => changeLogTable(ctx), { label: 'Change log' })]; // F6: every edit with who
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
