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
import { yearItems, usualDates, sinkingOf, takingOver } from '../year.js';
import { TUITION_GOAL } from '../community.js';

export const PUI = { extra: 0, pace: null, bands: true, chart: 'FI timeline', extraDebt: 0, reveal: false };
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
// The FI card, Big deals and the ladder refresh in place when an assumption changes (the milestone list below
// keeps its own state, so the screen is not rebuilt).
// The FI reveal (polish item 5): opened from that agenda step, Goals puts the FI date, the Timeline's save-more
// slider and Big deals first, so all three show without scrolling at 1280px.
export function revealCard(app, ctx, m) {
  const fiWhen = m.monthsToFi.value;
  const slider = h('input', { type: 'range', min: -1000, max: 3000, step: 50, value: PUI.extra, 'aria-label': 'Save more or less a month', 'data-focus': 'reveal:save-more' });
  const out = h('strong'), result = h('span.fi-when');
  const paint = () => {
    const rr = m.fiNumber.value == null ? null : monthsTo(m, m.fiNumber.value, { realReturn: m.inputs.realReturn, extra: PUI.extra, now: ctx.now() });
    clear(out, `${PUI.extra >= 0 ? '+' : '−'}${money(Math.abs(PUI.extra))} a month`);
    clear(result, !rr ? '' : rr.reached ? 'Already there' : rr.value == null ? 'Not on this path' : `FI ${whenText(ctx, rr.value)}${ageAt(m, rr.value) != null ? `, at ${ageAt(m, rr.value)}` : ''}`);
  };
  slider.oninput = () => { PUI.extra = Number(slider.value); paint(); };
  paint();
  return h('div.card.reveal-card', {},
    h('div.row-line', { style: { gap: '24px', alignItems: 'baseline' } },
      h('div', {}, h('span.label', {}, 'FI date'), h('div.fi-big', {}, fiWhen != null ? S.mathButton(m.monthsToFi, monthName(addMonths(ymOf(ctx.now()), fiWhen))) : m.monthsToFi.never ? S.warnTag('Not on this path') : h('span.muted', { style: { fontSize: '1rem' } }, 'Locked: ', S.needLinks(ctx, m.monthsToFi.needs)))),
      h('div', {}, h('span.label', {}, 'FI number'), h('div', { style: { fontSize: '1.5rem', fontWeight: 700 } }, m.fiNumber.value != null ? S.mathButton(m.fiNumber, money(m.fiNumber.value)) : h('span.muted', { style: { fontSize: '1rem' } }, 'Needs ', S.needLinks(ctx, m.fiNumber.needs))))),
    m.fiNumber.value != null ? h('div.slider-row', { style: { marginTop: '12px' } }, h('span.label', {}, 'Save more'), slider, out, result) : null);
}
export function goalsScreen(app, ctx) {
  const reveal = PUI.reveal;
  const top = h('div', {}, goalsTop(app, ctx, { reveal }));
  ctx.onRefresh(() => S.keepPlace(() => clear(top, goalsTop(app, ctx))));
  return [head('Goals', 'FI target, assumptions, milestones'), top, S.recordList(ctx, milestoneList())];
}
function goalsTop(app, ctx, { reveal = false } = {}) {
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
  // One control sets the return: Pace, with each % beside it, plus Hopeful (fix pass item 6: Return and Pace did the same job).
  const rr = a.realReturn ?? ref.presets.realReturn.default;
  const HOPEFUL = 0.12;
  const paces = [...['Optimistic', 'Likely', 'Pessimistic'].map(k => [ref.presets.pace[k], `${k} ${Math.round(ref.presets.pace[k] * 100)}%`]), [HOPEFUL, `Hopeful ${Math.round(HOPEFUL * 100)}%`]];
  const inflation = a.inflation ?? ref.presets.inflation.default;
  const nominal = (ctx.store.doc.settings.dollars || 'real') === 'nominal';
  const right = h('div.stack', { style: { gap: '12px' } },
    h('div.preset-row', {}, h('span.label', {}, 'Pace'), S.toggle(paces, paces.find(([v]) => Math.abs(v - rr) < 1e-9)?.[0] ?? null, v => setA({ realReturn: v }), { label: 'Pace' }),
      h('span.muted.small', {}, Math.abs(rr - HOPEFUL) < 1e-9 ? 'Hopeful: no inflation taken out' : 'Return a year, after inflation')),
    // Inflation feeds no number in real dollars, so here it is plain text; it can be picked under More with Nominal.
    h('div.preset-row', {}, h('span.label', {}, 'Inflation'), h('span', {}, `${+(inflation * 100).toFixed(1)}% a year`), h('span.muted.small', {}, nominal ? 'Used for the nominal numbers (set under More)' : 'Display only; returns are already after inflation')),
    presetRow('Withdrawal', 'withdrawalRate', ref.presets.withdrawalRate.values, v => `${+(v * 100).toFixed(1)}%`),
    h('div.preset-row', {}, h('span.label', {}, 'Retirement spending'), S.moneyInput(a.retirementSpending ?? null, v => setA({ retirementSpending: v }), { hint: m.inputs.spending != null ? S.moneyText(m.inputs.spending) : 'Add a month', key: 'g:retSpend' }), h('span.muted.small', {}, 'A month. Blank uses today\'s spending')),
    S.moreBlock('goals:tertiary', () => h('div.stack', { style: { gap: '12px' } },
      h('div.preset-row', {}, h('span.label', {}, 'Show money as'), S.toggle([['real', 'Real'], ['nominal', 'Nominal']], ctx.store.doc.settings.dollars || 'real', v => { ctx.store.doc.settings.dollars = v; ctx.refresh(); app.render(); }, { label: 'Real or nominal' }),
        h('span.muted.small', {}, (ctx.store.doc.settings.dollars || 'real') === 'real' ? "Real: in today's dollars" : `Nominal: with ${pct(a.inflation ?? ref.presets.inflation.default)} inflation added${m.fiNumber.value != null && fiWhen != null ? `, the FI number is ${money(m.fiNumber.value * (1 + (a.inflation ?? ref.presets.inflation.default)) ** (fiWhen / 12))} then` : ''}`)),
      nominal ? presetRow('Inflation', 'inflation', ref.presets.inflation.values, v => `${Math.round(v * 100)}%`, 'Feeds the nominal numbers') : null,
      h('div.preset-row', {}, h('span.label', {}, 'Life expectancy'), S.textInput(a.lifeExpectancy ?? null, v => setA({ lifeExpectancy: v === null ? null : Number(v) }), { hint: String(ref.defaults.lifeExpectancy), width: 90 })),
      h('div.preset-row', {}, h('span.label', {}, 'Social Security'), S.select(['Full scheduled', 'Reduced %', 'None'], a.socialSecurity ?? null, v => setA({ socialSecurity: v }), { label: 'Social Security', hint: 'Pick one', width: 170 }))), { label: 'More: real or nominal, life expectancy, Social Security' }));
  const fiCard = h('div.card.fi-card', { style: { marginBottom: '16px' } }, left, right);
  return reveal ? [revealCard(app, ctx, m), bigDealsCard(ctx, m), fiCard, ladderCard(ctx, m)] : [fiCard, bigDealsCard(ctx, m), ladderCard(ctx, m)];
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
    picker: ctx => ({ top: ['Coast FI', 'Regular FI', 'Debt free', 'Lean FI'], other: ctx.store.doc.session?.community ? [...MILESTONES, TUITION_GOAL] : MILESTONES }),
    newValues: type => ({ name: type === 'Custom' ? null : type, values: { mode: type === 'Custom' || type === TUITION_GOAL ? 'date' : 'when' } }),
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
  if (!ds.length) return [head('Debt payoff', 'Each debt shrinking to zero'), h('div.card', {}, h('div.empty.center', {}, h('span.title', {}, ctx.gates().areas.debt === false ? 'No debt, per About you' : 'No debts to pay off'),
    S.button('Open Debt', { iconName: 'right', onClick: () => app.go('#/net-worth/debt') })))];
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
    picker: { top: ['Trip', 'Wedding', 'Move', 'Big purchase'], other: ['Trip home', 'Holiday gifts', 'Lease renewal', 'Insurance renewal', 'Open enrollment', 'Tax day', 'IRA deadline', 'Car repair', 'Medical', 'Education', 'Other'] },
    secondary: (ctx, r, up) => [
      r.type === 'Lease renewal' ? S.labelled('Rent goes up by, a month', S.moneyInput(r.values.rentIncrease ?? null, v => up({ rentIncrease: v }), { hint: 'Add increase' }),
        { note: 'Your landlord\'s renewal letter', ...S.park(ctx, r, 'rentIncrease') }) : null,
      S.labelled('Day of the month', S.textInput(r.values.day == null ? null : String(r.values.day), v => { const n = Number(v); up({ day: Number.isInteger(n) && n >= 1 && n <= 31 ? n : null }); }, { hint: 'Day, 1 to 31', width: 110 }))],
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
  const host = h('div');
  const draw = () => clear(host, yourYear(app, ctx), sinkingFunds(ctx), takingOverList(app, ctx));
  ctx.onRefresh(draw); draw();
  return [head('Next 12 months', 'Your year: known dates, what they cost, and what to set aside'), host, S.recordList(ctx, eventList())];
}

// ---------- Your year (M4): every known date and cost, month by month ----------
function yourYear(app, ctx) {
  const now = ctx.now();
  const y = yearItems(ctx.visible(() => true), now);
  const have = new Set(ctx.visible(r => r.kind === 'event').map(r => r.type));
  const addUsual = () => {
    const coverage = ctx.visible(r => r.kind === 'coverage' && r.values.have === 'Have it');
    const list = usualDates({ renting: ctx.gates().housing === 'Rent', coverage }, now).filter(d => !(d.type !== 'Insurance renewal' && have.has(d.type))
      && !ctx.visible(r => r.kind === 'event' && r.values.coverageId && r.values.coverageId === d.coverageId).length);
    if (!list.length) { S.toast('The usual dates are already here.'); return; }
    ctx.store.transaction('Add the usual dates', () => { for (const d of list) ctx.store.add('event', { name: d.name, values: { month: d.month, day: d.day ?? null, coverageId: d.coverageId ?? null } }, { type: d.type }); });
    S.toast(`Added ${list.length} dates. Costs are blank: add the ones that cost money.`, { undo: () => ctx.store.undo() });
  };
  const sink = x => S.button('Save for it', { size: 'small', iconName: 'plus', onClick: () => { ctx.store.update(x.id, { sinking: true }); S.toast(`${x.name} is now a sinking fund.`); } });
  const itemLine = x => h('div.year-item', {},
    h('span', { style: { fontWeight: 600 } }, x.name), h('span.tag.plain', {}, x.source),
    x.cost != null ? h('span.computed', {}, money(x.cost)) : h('span.muted.small', {}, 'No cost'),
    x.rentUp ? h('span.muted.small', {}, `Rent goes up ${money(x.rentUp)} a month`) : null,
    x.cost != null && !x.derived && !x.rec.values.sinking ? sink(x) : x.rec.values?.sinking ? h('span.tag.plain', {}, 'Sinking fund') : null);
  const months = y.months.filter(mo => mo.items.length);
  return h('section.section.area-goals', {}, h('div.section-title', {}, h('h2', {}, 'Your year'), h('span.spacer'),
    S.button('Add the usual dates', { size: 'small', iconName: 'calendar', onClick: addUsual })),
  h('div.card', {}, months.length || y.undated.length ? h('div.stack', { style: { gap: '12px' } },
    ...months.map(mo => h('div.year-month', {}, h('div.year-head', {}, h('strong', {}, monthName(mo.ym)), mo.cost != null ? h('span.muted', {}, money(mo.cost)) : null),
      h('div.stack', { style: { gap: '6px' } }, mo.items.map(itemLine)))),
    y.undated.length ? h('div.year-month', {}, h('div.year-head', {}, h('strong', {}, 'No month yet'), h('span.muted.small', {}, 'Pick a month below so it lands on the calendar')),
      h('div.stack', { style: { gap: '6px' } }, y.undated.map(itemLine))) : null)
    : h('div.empty', {}, h('span.title', {}, 'Nothing on your year yet'), h('span.muted', {}, 'Tax day, open enrollment, renewals, trips: tap Add the usual dates, or add your own below.'))));
}

// ---------- Taking over (M7.2): bills someone else covers today, and what each date adds a month ----------
function takingOverList(app, ctx) {
  const t = takingOver(ctx.visible(() => true));
  if (!t.items.length) return null;
  const line = x => h('div.year-item', {}, h('span', { style: { fontWeight: 600 } }, x.name), x.who ? h('span.tag.plain', {}, x.who) : null,
    x.monthly != null ? h('span.computed', {}, `${money(x.monthly)} a month`) : h('span.muted.small', {}, 'No amount yet'));
  return h('section.section.area-goals', {}, h('div.section-title', {}, h('h2', {}, 'Taking over'), h('span.muted', {}, `${money(t.total)} a month covered by others today`), h('span.spacer'),
    S.button('Open the budget', { size: 'small', onClick: () => app.go('#/cash-flow/budget') })),
  h('div.card', {}, h('div.stack', { style: { gap: '12px' } },
    ...t.steps.map(st => h('div.year-month', {}, h('div.year-head', {}, h('strong', {}, monthName(st.ym)), h('span.muted.small', {}, `+${money(st.added)} a month · ${money(st.total)} in all`)),
      h('div.stack', { style: { gap: '6px' } }, st.items.map(line)))),
    t.undated.length ? h('div.year-month', {}, h('div.year-head', {}, h('strong', {}, 'No date yet'), h('span.muted.small', {}, 'Set "You take it over" on the line in the budget')),
      h('div.stack', { style: { gap: '6px' } }, t.undated.map(line))) : null)));
}

// ---------- Sinking funds (M5): any yearly cost or event with a cost ----------
function sinkingFunds(ctx) {
  const now = ctx.now();
  const recs = ctx.visible(() => true);
  const items = yearItems(recs, now).all.filter(x => x.rec.values.sinking);
  const accounts = ctx.visible(r => r.kind === 'account');
  const rows = items.map(x => {
    const f = sinkingOf(x, { records: recs, now });
    const v = x.rec.values;
    const up = patch => ctx.store.update(x.id, patch);
    const acct = accounts.find(a => a.id === v.sinkingFund);
    const tags = (acct?.values.tags || []).map(t => t.name).filter(Boolean);
    return h('tr', {},
      h('td', {}, h('strong', {}, x.name), h('div.muted.small', {}, x.source),
        // A yearly cost from the Budget is already in spending as its monthly set-aside, so Free after savings leaves it out.
        x.rec.kind === 'bill' && x.rec.values.irregular ? h('div.muted.small', {}, 'Already counted in spending') : null),
      h('td.num', {}, f.target == null ? h('span.muted', {}, 'Needs a cost') : money(f.target)),
      h('td', {}, x.ym ? monthName(x.ym, 'short') : h('span.muted', {}, 'Needs a month')),
      h('td.num', {}, f.savedFrom && f.savedFrom !== 'typed' ? h('span.computed', { title: `From ${f.savedFrom}` }, money(f.saved))
        : S.moneyInput(v.saved ?? null, n => up({ saved: n }), { hint: 'Saved so far' })),
      h('td', {}, h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } },
        S.select(accounts.map(a => [a.id, a.name || a.type]), v.sinkingFund ?? null, id => up({ sinkingFund: id, fundTag: null }), { label: 'Account', hint: 'Which account', width: 160 }),
        acct ? S.select(tags, v.fundTag ?? null, t => up({ fundTag: t }), { label: 'Purpose tag', hint: tags.length ? 'Which goal' : 'No goals on it yet', width: 150 }) : null)),
      h('td.num', {}, f.monthly == null ? h('span.muted', {}, '–') : h('span.computed', {}, `${money(f.monthly)} a month`)),
      h('td.num', {}, f.funded == null ? h('span.muted', {}, '–') : h('span.computed', {}, pct(f.funded))),
      h('td', {}, S.iconButton('x', `Stop saving for ${x.name}`, () => up({ sinking: false }))));
  });
  const monthly = items.reduce((s, x) => s + (sinkingOf(x, { records: recs, now }).monthly ?? 0), 0);
  return h('section.section.area-goals', {}, h('div.section-title', {}, h('h2', {}, 'Sinking funds'), monthly ? h('span.muted', {}, `${money(monthly)} a month to set aside`) : null),
    items.length ? h('div.list', {}, h('div.list-scroll', {}, h('table.rows.mini', {},
      h('thead', {}, h('tr', {}, ['Saving for', 'Target', 'Due', 'Saved', 'Held in', 'Needed', 'Funded', ''].map(t => h('th', {}, t)))), h('tbody', {}, rows))))
      : h('div.card', {}, h('p.muted', {}, 'Tap Save for it on any cost in Your year (or on a yearly cost in Spending) to save for it a little each month.')));
}
export function scenariosScreen() {
  return [head('Scenarios', 'Life event blocks'), h('div.list', {}, h('div.empty', {}, h('span.title', {}, 'Scenario blocks come in a later phase'),
    h('span.muted', {}, 'Home, car, kid, job change, sabbatical, move, marriage, side hustle, inheritance. For now, add the next 12 months on its own tab.'),
    S.button('+ Add life event', { disabled: true, why: 'Scenarios are a later phase' })))];
}
