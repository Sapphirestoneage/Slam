// Plan (build phase 7): Goals with presets and solvers, These are big deals, milestones, the FI timeline,
// debt payoff, next 12 months. Scenarios stay a later phase.
import { h, clear, icon } from './dom.js';
import * as S from './staples.js';
import { MILESTONES, fiTargets, monthsTo, projection, ladder, solveFor } from '../plan.js';
import { fiDate } from '../math/fi.js';
import { payoffPlan } from '../math/debt.js';
import { addMonths, ymOf, monthName, dateOf, monthsBetween } from '../month.js';
import { winSources } from './spending-ui.js';
import { money, pct } from '../format.js';

export const PUI = { extra: 0, pace: null, bands: true, chart: 'FI timeline', extraDebt: 0 };
const head = (title, sub, ...right) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null), h('div.row-line', {}, ...right));
const short = v => (Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1000 ? `$${Math.round(v / 1000)}k` : money(v));
const whenText = (ctx, months) => (months == null ? null : months === 0 ? 'Now' : `${monthName(addMonths(ymOf(ctx.now()), months))} (${months < 24 ? `${months} months` : `${(months / 12).toFixed(1)} years`})`);
const ageAt = (m, months) => (m.inputs.age == null || months == null ? null : Math.floor(m.inputs.age + months / 12));
const paceOf = (ref, r) => Object.entries(ref.presets.pace).find(([, v]) => Math.abs(v - r) < 1e-9)?.[0] ?? null;

// Milestone dates become wins on the calendar (R095).
winSources.push(ctx => {
  const m = ctx.metrics();
  return ctx.visible(r => r.kind === 'milestone').map(r => ({ r, p: projection(m, ctx.store.doc, r, ctx.now()) }))
    .filter(x => x.p.date && !x.p.reached).map(x => ({ name: x.r.name || x.r.type, date: x.p.date }));
});

// ---------- Goals ----------
export function goalsScreen(app, ctx) {
  const m = ctx.metrics();
  const a = ctx.store.doc.assumptions;
  const ref = ctx.ref;
  const setA = patch => ctx.store.setDoc('assumptions', patch);
  const fiAge = a.fiAge ?? null;
  const solve = solveFor(m, fiAge);
  const fiWhen = m.monthsToFi.value;
  const left = h('div.stack', { style: { gap: '12px' } },
    h('div.row-line', { style: { gap: '10px', alignItems: 'flex-end' } },
      S.labelled('FI age', S.textInput(fiAge, v => setA({ fiAge: v === null ? null : Number(v) }), { hint: 'Age', width: 100, key: 'g:fiAge' })),
      S.button('Just show me', { onClick: () => setA({ fiAge: null }), tip: 'Skip the age and show the earliest date' })),
    h('div', {}, h('span.label', {}, 'FI date'),
      h('div.fi-big', {}, fiWhen != null ? S.mathButton(m.monthsToFi, monthName(addMonths(ymOf(ctx.now()), fiWhen))) : m.monthsToFi.never ? S.warnTag('Not on this path') : h('span.muted', { style: { fontSize: '1rem' } }, 'Locked: ', S.needLinks(ctx, m.monthsToFi.needs))),
      fiWhen != null ? h('span.muted', {}, `${ageAt(m, fiWhen) != null ? `At ${ageAt(m, fiWhen)} · ` : ''}${(fiWhen / 12).toFixed(1)} years from now`) : null),
    h('div', {}, h('span.label', {}, 'FI number'), h('div', { style: { fontSize: '1.5rem', fontWeight: 700 } }, m.fiNumber.value != null ? S.mathButton(m.fiNumber, money(m.fiNumber.value)) : h('span.muted', { style: { fontSize: '1rem' } }, 'Needs ', S.needLinks(ctx, m.fiNumber.needs)))),
    solve ? h('div.solver', {}, h('strong', {}, `To reach FI at ${fiAge}:`),
      h('ul.op-list', {},
        h('li', {}, solve.save.value == null ? `Investing: needs ${solve.save.needs.join(' and ')}` : solve.extra != null && solve.extra <= 0 ? `On track: you already invest ${money(m.surplus.value)} a month (needs ${money(solve.save.value)}).` : `Invest ${money(solve.save.value)} a month${solve.extra != null ? `, ${money(solve.extra)} more than now` : ''}.`),
        h('li', {}, solve.spend.value == null ? `Or spending: ${solve.spend.needs.join(' and ')}` : `Or spend no more than ${money(solve.spend.value)} a month.`))) : null);
  const presetRow = (label, key, values, fmt, note) => h('div.preset-row', {}, h('span.label', {}, label),
    S.toggle(values.map(v => [v, fmt(v)]), a[key] ?? ref.presets[key]?.default ?? null, v => setA({ [key]: v }), { label }), note ? h('span.muted.small', {}, note) : null);
  const pace = paceOf(ref, a.realReturn ?? ref.presets.realReturn.default);
  const right = h('div.stack', { style: { gap: '12px' } },
    presetRow('Return', 'realReturn', ref.presets.realReturn.values, v => `${Math.round(v * 100)}%`, (a.realReturn ?? 0.07) === 0.12 ? 'Hopeful: no inflation taken out' : 'After inflation'),
    presetRow('Inflation', 'inflation', ref.presets.inflation.values, v => `${Math.round(v * 100)}%`, 'Display only; returns are already after inflation'),
    presetRow('Withdrawal', 'withdrawalRate', ref.presets.withdrawalRate.values, v => `${+(v * 100).toFixed(1)}%`),
    h('div.preset-row', {}, h('span.label', {}, 'Pace'), S.toggle(['Optimistic', 'Likely', 'Pessimistic'], pace, v => setA({ realReturn: ref.presets.pace[v] }), { label: 'Pace' }), h('span.muted.small', {}, 'Optimistic 8%, Likely 7%, Pessimistic 6%')),
    h('div.preset-row', {}, h('span.label', {}, 'Retirement spending'), S.moneyInput(a.retirementSpending ?? null, v => setA({ retirementSpending: v }), { hint: m.inputs.spending != null ? S.moneyText(m.inputs.spending) : 'Add a month', key: 'g:retSpend' }), h('span.muted.small', {}, 'A month. Blank uses today\'s spending')),
    S.moreBlock('goals:tertiary', () => h('div.stack', { style: { gap: '12px' } },
      h('div.preset-row', {}, h('span.label', {}, 'Show money as'), S.toggle([['real', 'Real'], ['nominal', 'Nominal']], ctx.store.doc.settings.dollars || 'real', v => { ctx.store.doc.settings.dollars = v; ctx.refresh(); app.render(); }, { label: 'Real or nominal' }),
        h('span.muted.small', {}, (ctx.store.doc.settings.dollars || 'real') === 'real' ? "Real: in today's dollars" : `Nominal: with ${pct(a.inflation ?? ref.presets.inflation.default)} inflation added${m.fiNumber.value != null && fiWhen != null ? `, the FI number is ${money(m.fiNumber.value * (1 + (a.inflation ?? ref.presets.inflation.default)) ** (fiWhen / 12))} then` : ''}`)),
      h('div.preset-row', {}, h('span.label', {}, 'Life expectancy'), S.textInput(a.lifeExpectancy ?? null, v => setA({ lifeExpectancy: v === null ? null : Number(v) }), { hint: String(ref.defaults.lifeExpectancy), width: 90 })),
      h('div.preset-row', {}, h('span.label', {}, 'Social Security'), S.select(['Full scheduled', 'Reduced %', 'None'], a.socialSecurity ?? null, v => setA({ socialSecurity: v }), { label: 'Social Security', hint: 'Pick one', width: 170 }))), { label: 'More: real or nominal, life expectancy, Social Security' }));
  return [head('Goals', 'FI target, assumptions, milestones'),
    h('div.card.fi-card', { style: { marginBottom: '16px' } }, left, right),
    bigDealsCard(ctx, m),
    ladderCard(ctx, m),
    S.recordList(ctx, milestoneList())];
}

// These are big deals (M56): one assumption at a time; click an option to use it.
function bigDealsCard(ctx, m) {
  const bd = m.bigDeals;
  const a = ctx.store.doc.assumptions;
  if (bd.value === null) return h('div.card', { style: { marginBottom: '16px' } }, h('h2', {}, 'These are big deals'), h('p.muted', {}, 'Needs invested, monthly investing and spending to compare FI dates.'));
  const maxSpread = Math.max(1, ...bd.rows.map(r => r.spread ?? 0));
  const cur = { Return: a.realReturn ?? ctx.ref.presets.realReturn.default, 'Withdrawal rate': a.withdrawalRate ?? ctx.ref.presets.withdrawalRate.default, Spending: 1 };
  const key = { Return: 'realReturn', 'Withdrawal rate': 'withdrawalRate' };
  return h('div.card', { style: { marginBottom: '16px' } },
    h('div.section-title.area-goals', {}, h('h2', {}, 'These are big deals')),
    h('p', {}, h('span.mover', {}, `${bd.value} moves the FI date the most`), h('span.muted', {}, `: ${bd.rows[0].spread} months between its options.`)),
    h('div.deals', {}, bd.rows.map(row => h('div.deal', {},
      h('div', {}, h('strong', {}, row.assumption), h('div.rung-bar', { style: { marginTop: '6px' }, title: `${row.spread ?? 0} months apart` }, h('span', { style: { width: `${((row.spread ?? 0) / maxSpread) * 100}%` } }))),
      h('div.deal-opts', {}, row.presets.map(p => h('button.deal-opt', { type: 'button', 'aria-pressed': String(Math.abs(p.preset - cur[row.assumption]) < 1e-9),
        disabled: !key[row.assumption], title: key[row.assumption] ? 'Use this' : 'Spending is changed on Budget',
        onclick: () => key[row.assumption] && ctx.store.setDoc('assumptions', { [key[row.assumption]]: p.preset }) },
      p.label || (row.assumption === 'Return' || row.assumption === 'Withdrawal rate' ? `${+(p.preset * 100).toFixed(1)}%` : p.preset),
      h('small', {}, p.months == null ? 'never' : whenText(ctx, p.months)?.replace(/ \(.*/, '') ?? ''))))))));
}

// Milestone ladder (M55): each FI step filled by %.
function ladderCard(ctx, m) {
  const doc = ctx.store.doc;
  const t = fiTargets(m, doc);
  const l = ladder(m, doc);
  return h('div.card', { style: { marginBottom: '16px' } }, h('div.section-title.area-goals', {}, h('h2', {}, 'The FI ladder')),
    l.value === null ? h('p.muted', {}, 'Needs ', S.needLinks(ctx, ['invested'])) :
      h('div.ladder', {}, ['Lean FI', 'Coast FI', 'Barista FI', 'Regular FI', 'Fat FI'].map(k => {
        const v = l.value[k];
        const when = t[k]?.value != null ? monthsTo(m, t[k].value, { now: ctx.now() }) : null;
        return h('div.rung', {}, h('strong', {}, k), h('div.rung-bar', { title: v == null ? 'Needs numbers' : pct(Math.min(1, v)) }, h('span', { style: { width: `${v == null ? 0 : Math.min(100, v * 100)}%` } })),
          h('span.muted.small', {}, v == null ? (k === 'Barista FI' ? 'Add part-time income' : 'Needs numbers') : when?.reached ? `${pct(Math.min(1, v))} · reached` : `${pct(Math.min(1, v))}${when?.value != null ? ` · ${monthName(addMonths(ymOf(ctx.now()), when.value), 'short')}` : ''}`));
      })));
}

function milestoneList() {
  return {
    kind: 'milestone', area: 'goals', title: 'Milestones', thing: { one: 'milestone', plural: 'milestones' },
    filter: r => r.kind === 'milestone',
    picker: { top: ['Coast FI', 'Regular FI', 'Debt free', 'Lean FI'], other: MILESTONES },
    newValues: type => ({ name: type === 'Custom' ? null : type, values: { mode: type === 'Custom' ? 'date' : 'when' } }),
    coreFields: ['name'],
    columns: [
      { label: 'Milestone', render: (ctx, r, m, up) => S.textInput(r.name, v => up({ name: v }), { hint: r.type || 'Name it', width: 170, key: `${r.id}:name` }) },
      { label: 'At a date or when true', render: (ctx, r, m, up) => S.toggle([['date', 'At a date'], ['when', 'When true']], r.values.mode || 'when', v => up({ mode: v }), { label: 'At a date or when true' }) },
      { label: 'Date or condition', render: (ctx, r, m, up) => {
        if ((r.values.mode || 'when') === 'date') {
          const d = h('input', { type: 'date', value: r.values.date || '', 'aria-label': 'Date' });
          d.onchange = () => up({ date: d.value || null });
          return h(`label.field${r.values.date ? '.filled' : ''}`, { style: { width: '170px' } }, d);
        }
        return r.type === 'Custom' ? S.textInput(r.values.condition, v => up({ condition: v }), { hint: 'When this is true', width: 220 })
          : h('span.muted', {}, r.type === 'Debt free' ? 'When every debt is paid' : `When investments reach ${r.type}`);
      } },
      { label: 'Projected', render: (ctx, r) => { const p = projection(ctx.metrics(), ctx.store.doc, r, ctx.now()); return h(`span${p.reached ? '.tag.good' : p.date ? '.computed' : '.muted'}`, {}, p.reached ? '✓ Reached' : p.text); } },
    ],
    secondary: (ctx, r) => [
      r.type === 'Barista FI' ? S.labelled('Part-time income a month', S.moneyInput(ctx.store.doc.assumptions.partTimeIncome ?? null, v => ctx.store.setDoc('assumptions', { partTimeIncome: v }), { hint: 'Add income' }), { note: 'Barista FI only' }) : null,
      fiTargets(ctx.metrics(), ctx.store.doc)[r.type]?.value != null ? S.labelled('Target', h('span.computed', {}, money(fiTargets(ctx.metrics(), ctx.store.doc)[r.type].value))) : null],
  };
}

// ---------- Timeline ----------
export function timelineScreen(app, ctx) {
  const m = ctx.metrics();
  const ref = ctx.ref;
  if (m.fiNumber.value === null || m.inputs.invested === null || m.surplus.value === null) {
    const needs = [...new Set([...m.fiNumber.needs, ...m.surplus.needs, ...(m.inputs.invested === null ? ['invested'] : [])])];
    return [head('Timeline', 'Invested balance rising to your FI number'), h('div.card', {}, S.chartEmpty(ctx, needs.length ? needs : ['a plan that reaches FI']))];
  }
  const pace = PUI.pace || paceOf(ref, m.inputs.realReturn) || 'Likely';
  const r = ref.presets.pace[pace] ?? m.inputs.realReturn;
  const res = monthsTo(m, m.fiNumber.value, { realReturn: r, extra: PUI.extra, now: ctx.now() });
  const sr = m.inputs.takeHome ? (m.surplus.value + PUI.extra) / m.inputs.takeHome : null;
  const slider = h('input', { type: 'range', min: -1000, max: 3000, step: 50, value: PUI.extra, 'aria-label': 'Save more or less a month' });
  const out = h('strong', {}, `${PUI.extra >= 0 ? '+' : '−'}${money(Math.abs(PUI.extra))} a month`);
  const result = h('span.fi-when');
  const host = h('div.chart', { style: { height: '340px' } });
  const paint = () => {
    const rr = monthsTo(m, m.fiNumber.value, { realReturn: r, extra: PUI.extra, now: ctx.now() });
    clear(out, `${PUI.extra >= 0 ? '+' : '−'}${money(Math.abs(PUI.extra))} a month`);
    clear(result, rr.reached ? 'Already there' : rr.value == null ? 'Not on this path' : `FI ${whenText(ctx, rr.value)}${ageAt(m, rr.value) != null ? `, at ${ageAt(m, rr.value)}` : ''}`);
    drawTimeline(host, ctx, m, r);
  };
  slider.oninput = () => { PUI.extra = Number(slider.value); paint(); };
  slider.onchange = () => app.render();
  queueMicrotask(paint);
  return [head('Timeline', 'Invested balance rising to your FI number'),
    h('div.card', { style: { marginBottom: '16px' } },
      h('div.slider-row', {}, h('span.label', {}, 'Save more'), slider, out, PUI.extra ? S.button('Reset', { size: 'small', onClick: () => { PUI.extra = 0; app.render(); } }) : null),
      h('div.slider-row', { style: { marginTop: '10px' } }, h('span.label', {}, 'Pace'), S.toggle(['Optimistic', 'Likely', 'Pessimistic'], pace, v => { PUI.pace = v; app.render(); }, { label: 'Pace' }),
        S.checkbox('Show all three paces', PUI.bands, v => { PUI.bands = v; app.render(); }),
        h('span', { style: { flex: 1 } }), S.select(['FI timeline', 'Savings rate to years', 'Crossover point'], PUI.chart, v => { PUI.chart = v || 'FI timeline'; app.render(); }, { label: 'Chart', hint: 'FI timeline', width: 210 })),
      h('p', { style: { marginTop: '12px', fontSize: '1.125rem' } }, result, sr != null ? h('span.muted', {}, ` · savings rate ${pct(Math.max(0, sr))}`) : null)),
    h('div.card', {}, host)];
}
function drawTimeline(host, ctx, m, r) {
  if (!window.echarts || !host.isConnected) { queueMicrotask(() => host.isConnected && drawTimeline(host, ctx, m, r)); return; }
  const t = S.chartTheme('goals');
  const inv = m.inputs.invested, save = m.surplus.value + PUI.extra, target = m.fiNumber.value;
  const yearsOut = n => { const pts = [inv]; let b = inv; const g = (1 + n) ** (1 / 12); for (let k = 1; k <= 12 * 50; k++) { b = b * g + save; if (k % 12 === 0) pts.push(b); } return pts; };
  const hit = monthsTo(m, target, { realReturn: r, extra: PUI.extra }).value;
  const years = Math.min(50, Math.max(5, Math.ceil(((hit ?? 30 * 12) / 12) * 1.25)));
  const xs = Array.from({ length: years + 1 }, (_, k) => k);
  let option;
  if (PUI.chart === 'Savings rate to years') {
    const th = m.inputs.takeHome || 1, w = m.inputs.withdrawalRate;
    const pts = [];
    for (let s = 5; s <= 90; s += 5) {
      const f = fiDate({ invested: 0, monthlyInvesting: th * s / 100, realReturn: r, target: th * (1 - s / 100) * 12 / w });
      pts.push([s, f.value == null ? null : +(f.value / 12).toFixed(1)]);
    }
    const mine = m.savingsRate.value != null && hit != null ? [[Math.round(Math.max(0, (m.surplus.value + PUI.extra) / th) * 100), +(hit / 12).toFixed(1)]] : [];
    option = {
      textStyle: { fontFamily: t.font, color: t.text }, grid: { left: 56, right: 24, top: 24, bottom: 40 }, tooltip: { trigger: 'item', formatter: p => `${p.value[0]}% saved → ${p.value[1]} years` },
      xAxis: { type: 'value', name: 'Savings rate %', nameLocation: 'middle', nameGap: 28, min: 0, max: 90, axisLabel: { color: t.text2 } },
      yAxis: { type: 'value', name: 'Years to FI', axisLabel: { color: t.text2 }, splitLine: { lineStyle: { color: t.line } } },
      series: [{ type: 'line', data: pts, smooth: true, showSymbol: false, lineStyle: { color: t.area, width: 3 } },
        { type: 'scatter', data: mine, symbolSize: 16, itemStyle: { color: t.text }, label: { show: true, formatter: 'You', position: 'top', color: t.text, fontWeight: 700 } }],
    };
  } else if (PUI.chart === 'Crossover point') {
    const bal = yearsOut(r).slice(0, years + 1);
    const spend = m.inputs.retirementSpending;
    option = {
      textStyle: { fontFamily: t.font, color: t.text }, grid: { left: 64, right: 24, top: 32, bottom: 32 }, legend: { top: 0, textStyle: { color: t.text2 } }, tooltip: { trigger: 'axis', valueFormatter: v => money(v) },
      xAxis: { type: 'category', data: xs.map(x => `${x}y`), axisLabel: { color: t.text2 } },
      yAxis: { type: 'value', axisLabel: { color: t.text2, formatter: v => short(v) }, splitLine: { lineStyle: { color: t.line } } },
      series: [{ name: 'Investment income a month', type: 'line', data: bal.map(b => Math.round(b * m.inputs.withdrawalRate / 12)), showSymbol: false, lineStyle: { color: t.area, width: 3 } },
        { name: 'Spending a month', type: 'line', data: xs.map(() => Math.round(spend)), showSymbol: false, lineStyle: { color: t.text2, type: 'dashed', width: 2 } }],
    };
  } else {
    const main = yearsOut(r).slice(0, years + 1);
    const lo = yearsOut(ctx.ref.presets.pace.Pessimistic).slice(0, years + 1), hi = yearsOut(ctx.ref.presets.pace.Optimistic).slice(0, years + 1);
    const flags = ctx.visible(x => x.kind === 'milestone').map(x => ({ x, p: projection(m, ctx.store.doc, x, ctx.now()) })).filter(o => o.p.months != null && o.p.months / 12 <= years);
    option = {
      textStyle: { fontFamily: t.font, color: t.text }, grid: { left: 64, right: 24, top: 32, bottom: 32 }, tooltip: { trigger: 'axis', valueFormatter: v => money(v) },
      xAxis: { type: 'category', data: xs.map(x => (m.inputs.age != null ? `${Math.floor(m.inputs.age + x)}` : `${x}y`)), axisLabel: { color: t.text2 } },
      yAxis: { type: 'value', axisLabel: { color: t.text2, formatter: v => short(v) }, splitLine: { lineStyle: { color: t.line } } },
      series: [
        ...(PUI.bands ? [{ name: 'Pessimistic', type: 'line', data: lo.map(Math.round), stack: 'band', showSymbol: false, lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 } },
          { name: 'Optimistic', type: 'line', data: hi.map((v, k) => Math.round(v - lo[k])), stack: 'band', showSymbol: false, lineStyle: { opacity: 0 }, areaStyle: { color: t.area, opacity: 0.14 }, tooltip: { show: false } }] : []),
        { name: 'Invested', type: 'line', data: main.map(Math.round), showSymbol: false, lineStyle: { color: t.area, width: 3 },
          markLine: { symbol: 'none', silent: true, data: [{ yAxis: Math.round(target), lineStyle: { color: t.text, type: 'dashed' }, label: { formatter: `FI ${short(target)}`, color: t.text, position: 'insideEndTop' } },
            ...flags.map(o => ({ xAxis: String(m.inputs.age != null ? Math.floor(m.inputs.age + Math.round(o.p.months / 12)) : `${Math.round(o.p.months / 12)}y`), lineStyle: { color: t.text2, type: 'dotted' }, label: { formatter: o.x.name || o.x.type, color: t.text2, position: 'insideEndTop' } }))] } }],
    };
  }
  const c = window.echarts.getInstanceByDom(host) || window.echarts.init(host, null, { renderer: 'svg' });
  c.setOption(option, true);
  if (!host._ro) { host._ro = new ResizeObserver(() => c.resize()); host._ro.observe(host); }
}

// ---------- Debt payoff ----------
const ORDER_NAMES = [['avalanche', 'Avalanche'], ['snowball', 'Snowball'], ['stress', 'Stress']];
// R075: a 0% promo ending within 60 days jumps to the top and warns.
export function promoSoon(ctx) {
  const now = ctx.now();
  return ctx.visible(r => r.kind === 'debt' && r.values.promoEnd).filter(r => {
    const end = Date.parse(`${r.values.promoEnd.length === 7 ? `${r.values.promoEnd}-01` : r.values.promoEnd}T00:00:00Z`);
    return end >= now.getTime() - 86400000 && end - now.getTime() <= 60 * 86400000;
  });
}
export function planDebts(ctx, { order, extra = 0 } = {}) {
  const m = ctx.metrics();
  const ds = m.inputs.debts.filter(d => !d.inFull && d.balance > 0 && d.apr != null && d.payment != null);
  const soon = new Set(promoSoon(ctx).map(r => r.id));
  const o = order || m.inputs.debtOrder;
  if (!soon.size) return payoffPlan(ds, { order: o, extra });
  const rest = payoffPlan(ds.filter(d => !soon.has(d.id)), { order: o }).debts.map(x => ds.find(d => d.name === x.name)).filter(Boolean);
  return payoffPlan([...ds.filter(d => soon.has(d.id)), ...rest], { order: 'given', extra });
}
export function payoffScreen(app, ctx) {
  const m = ctx.metrics();
  const ds = m.inputs.debts.filter(d => !d.inFull && d.balance > 0);
  if (!ds.length) return [head('Debt payoff', 'Each debt shrinking to zero'), h('div.card', {}, h('div.empty.center', {}, h('span.title', {}, ctx.gates().areas.debt === false ? 'No debt, per the Profile' : 'No debts to pay off'),
    S.button('Open Debt', { iconName: 'right', onClick: () => app.go('#/my-money/debt') })))];
  const usable = ds.filter(d => d.apr != null && d.payment != null);
  if (!usable.length) return [head('Debt payoff', 'Each debt shrinking to zero'), h('div.card', {}, S.chartEmpty(ctx, ['a balance, APR and payment']))];
  const order = m.inputs.debtOrder;
  const setOrder = v => { ctx.store.doc.settings.debtOrder = v; ctx.store._emit({ type: 'settings' }); app.render(); };
  const soon = promoSoon(ctx);
  const plans = Object.fromEntries(ORDER_NAMES.map(([k]) => [k, planDebts(ctx, { order: k, extra: PUI.extraDebt })]));
  const p = plans[order];
  const slider = h('input', { type: 'range', min: 0, max: 2000, step: 25, value: PUI.extraDebt, 'aria-label': 'Extra a month' });
  const out = h('strong', {}, `${money(PUI.extraDebt)} extra a month`);
  slider.oninput = () => { PUI.extraDebt = Number(slider.value); clear(out, `${money(PUI.extraDebt)} extra a month`); };
  slider.onchange = () => app.render();
  const at = months => (months == null ? 'Never' : monthName(addMonths(ymOf(ctx.now()), months)));
  return [head('Debt payoff', 'Each debt shrinking to zero'),
    ...soon.map(r => h('div.banner-inline', {}, '⚠ ', `${r.name || r.type}: the 0% promo ends ${r.values.promoEnd}. It moved to the top of the order.`)),
    h('div.card', { style: { marginBottom: '16px' } },
      h('div.slider-row', {}, h('span.label', {}, 'Order'), S.toggle(ORDER_NAMES, order, setOrder, { label: 'Payoff order' }),
        h('span.muted.small', {}, { avalanche: 'Highest APR first', snowball: 'Smallest balance first', stress: 'Highest stress first, ties by APR' }[order])),
      h('div.slider-row', { style: { marginTop: '10px' } }, h('span.label', {}, 'Extra'), slider, out)),
    S.summaryStrip(ctx, [
      { label: 'Debt-free', result: p.months == null ? { id: 'M34', value: null, never: true, needs: [] } : { id: 'M34', value: p.months, needs: [], unit: 'months', text: p.text }, render: () => at(p.months) },
      { label: 'Interest still to pay', result: { id: 'M34', value: p.months == null ? null : p.interest, needs: p.months == null ? ['payments that clear every debt'] : [], unit: 'money', text: p.text } },
      { label: 'Months', result: { id: 'M34', value: p.months, needs: [], unit: 'count', text: p.text }, render: r => `${r.value}` },
      { label: `vs ${order === 'avalanche' ? 'snowball' : 'avalanche'}`, result: (() => { const o = plans[order === 'avalanche' ? 'snowball' : 'avalanche']; const d = o.months == null || p.months == null ? null : o.interest - p.interest; return { id: 'M34', value: d, needs: d == null ? ['both plans to finish'] : [], unit: 'money', text: `Interest with ${order === 'avalanche' ? 'snowball' : 'avalanche'} minus interest with ${order}.` }; })(), note: 'Interest saved by this order' }]),
    h('div.report-grid', {}, h('div.card', {}, h('strong', {}, 'Balance per debt'), payoffChart(ctx, p)), h('div.card', {}, h('strong', {}, 'Order compared'), compareChart(ctx, plans)))];
}
function payoffChart(ctx, p) {
  const host = h('div.chart', { style: { height: '300px' } });
  queueMicrotask(() => {
    if (!window.echarts || !host.isConnected) return;
    const t = S.chartTheme('debt');
    const names = p.debts.map(d => d.name);
    const c = window.echarts.init(host, null, { renderer: 'svg' });
    c.setOption({
      textStyle: { fontFamily: t.font, color: t.text }, grid: { left: 60, right: 16, top: 32, bottom: 28 }, legend: { top: 0, textStyle: { color: t.text2 } }, tooltip: { trigger: 'axis', valueFormatter: v => money(v) },
      xAxis: { type: 'category', data: p.path.map((_, k) => monthName(addMonths(ymOf(ctx.now()), k), 'short')), axisLabel: { color: t.text2 } },
      yAxis: { type: 'value', axisLabel: { color: t.text2, formatter: v => short(v) }, splitLine: { lineStyle: { color: t.line } } },
      series: names.map((n, i) => ({ name: n, type: 'line', stack: 'all', showSymbol: false, areaStyle: { opacity: Math.max(0.25, 0.85 - i * 0.2) }, lineStyle: { width: 1 }, itemStyle: { color: t.area },
        data: p.path.map(row => Math.round(row[i])),
        markPoint: p.debts[i].paidOffMonth ? { symbol: 'pin', symbolSize: 34, itemStyle: { color: t.text }, label: { formatter: '✓', color: t.card }, data: [{ coord: [p.debts[i].paidOffMonth, 0], name: `${n} paid off` }] } : undefined })),
    });
    new ResizeObserver(() => c.resize()).observe(host);
  });
  return host;
}
function compareChart(ctx, plans) {
  const host = h('div.chart', { style: { height: '300px' } });
  queueMicrotask(() => {
    if (!window.echarts || !host.isConnected) return;
    const t = S.chartTheme('debt');
    const c = window.echarts.init(host, null, { renderer: 'svg' });
    const ks = ORDER_NAMES;
    c.setOption({
      textStyle: { fontFamily: t.font, color: t.text }, grid: { left: 60, right: 60, top: 32, bottom: 28 }, legend: { top: 0, textStyle: { color: t.text2 } }, tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ks.map(k => k[1]), axisLabel: { color: t.text, fontWeight: 600 } },
      yAxis: [{ type: 'value', name: 'months', axisLabel: { color: t.text2 }, splitLine: { lineStyle: { color: t.line } } }, { type: 'value', name: 'interest', axisLabel: { color: t.text2, formatter: v => short(v) }, splitLine: { show: false } }],
      series: [{ name: 'Months', type: 'bar', data: ks.map(([k]) => plans[k].months), itemStyle: { color: t.area, borderRadius: 4 }, barWidth: 22 },
        { name: 'Interest', type: 'bar', yAxisIndex: 1, data: ks.map(([k]) => Math.round(plans[k].interest)), itemStyle: { color: t.text2, opacity: 0.5, borderRadius: 4 }, barWidth: 22, tooltip: { valueFormatter: v => money(v) } }],
    });
    new ResizeObserver(() => c.resize()).observe(host);
  });
  return host;
}

// ---------- Next 12 months ----------
export function eventList() {
  return {
    kind: 'event', area: 'goals', title: 'Upcoming events', thing: { one: 'event', plural: 'events' },
    filter: r => r.kind === 'event',
    picker: { top: ['Trip', 'Wedding', 'Move', 'Big purchase'], other: ['Holiday gifts', 'Car repair', 'Medical', 'Education', 'Other'] },
    newValues: type => ({ name: type }),
    coreFields: ['amount'],
    columns: [
      { label: 'Event', render: (ctx, r, m, up) => S.textInput(r.name, v => up({ name: v }), { hint: r.type || 'Name it', width: 190, key: `${r.id}:name` }) },
      { label: 'Rough cost', num: true, render: (ctx, r, m, up) => S.moneyInput(r.amount, v => up({ amount: v }), { hint: 'Add cost', key: `${r.id}:amount` }) },
      { label: 'Month', render: (ctx, r, m, up) => {
        const base = ymOf(ctx.now());
        const months = Array.from({ length: 13 }, (_, k) => addMonths(base, k)).map(ym => [ym, monthName(ym, 'short')]);
        return S.select(months, r.values.month ?? null, v => up({ month: v }), { label: 'Month', hint: 'Pick a month', width: 150 });
      } },
      { label: 'Set aside a month', num: true, render: (ctx, r) => {
        if (r.amount == null || !r.values.month) return h('span.muted', {}, 'Needs cost and month');
        const left = Math.max(1, monthsBetween(ymOf(ctx.now()), r.values.month));
        return h('span.computed', { title: `${money(r.amount)} over ${left} ${left === 1 ? 'month' : 'months'}` }, money(r.amount / left));
      } },
    ],
    footerTotal: (ctx, recs) => h('span', {}, S.amount(ctx, recs.reduce((s, r) => s + (r.amount && r.values.month ? r.amount / Math.max(1, monthsBetween(ymOf(ctx.now()), r.values.month)) : 0), 0)), h('span.muted', {}, ' a month to set aside')),
  };
}
export function nextYearScreen(app, ctx) {
  return [head('Next 12 months', 'Upcoming events. Each lands on the calendar in its month'), S.recordList(ctx, eventList())];
}
export function scenariosScreen() {
  return [head('Scenarios', 'Life event blocks'), h('div.list', {}, h('div.empty', {}, h('span.title', {}, 'Scenario blocks come in a later phase'),
    h('span.muted', {}, 'Home, car, kid, job change, sabbatical, move, marriage, side hustle, inheritance. For now, add the next 12 months on its own tab.'),
    S.button('+ Add life event', { disabled: true, why: 'Scenarios are a later phase' })))];
}
