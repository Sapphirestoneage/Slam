// SPDX-License-Identifier: AGPL-3.0-only
// Plan › Transitions (batch 21, Phase 4): Life Transitions, a session that turns panic into a number. Calm by design
// (YNAB's "a number to cover", Monarch's clean chart, RightCapital's what-if taps): one headline number, then the
// burn, the options ladder, the dip, tripwires and Plan B and C, each a caret section. The math is js/math/transitions.js;
// this file only shows it and saves the taps (program.transition). The share view is one clean page for parents or a
// partner: no coach notes, and the costly rungs' dollars can be hidden with one switch.
import { h, icon } from './dom.js';
import * as S from './staples.js';
import { sec } from './sections.js';
import { money, pct } from '../format.js';
import { addMonths, ymOf, monthName } from '../month.js';
import { transitionOf, setTransition, monthsText, LEVELS, RUNGS } from '../math/transitions.js';

export const TUI = { share: false, hash: null };
const head = (title, sub, ...right) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null), h('div.row-line', {}, ...right));
const mon = ym => (ym ? monthName(ym, 'short') : '');
const levelName = id => LEVELS.find(l => l.id === id)?.name ?? id;
const put = (ctx, patch) => setTransition(ctx.store, patch); // every tap is one undo step
const putRung = (ctx, id, patch) => { const p = ctx.store.doc.program?.transition || {}; put(ctx, { rungs: { ...(p.rungs || {}), [id]: { ...(p.rungs?.[id] || {}), ...patch } } }); };
const chips = (vals, cur, onPick, { label, fmt = v => money(v) } = {}) => S.tapPick(vals.map(v => [v, fmt(v)]), cur, onPick, { label });

export function transitionsScreen(app, ctx) {
  if (location.hash !== TUI.hash) { TUI.hash = location.hash; TUI.share = /[?&]view=share/.test(location.hash); }
  const doc = ctx.store.doc;
  if (doc.settings?.phase4 !== true) {
    return [head('Life Transitions'), h('div.card', {}, h('div.empty.center', {}, h('span.title', {}, 'Life Transitions is a Phase 4 preview, off for this client'),
      S.button('Turn it on', { kind: 'primary', onClick: () => ctx.store.setDoc('settings', { phase4: true }) }), h('span.muted.small', {}, 'Coach tools › Session has the same switch')))];
  }
  const T = transitionOf(doc, ctx.ref, { now: ctx.now() });
  if (!T.plan) return [head('Life Transitions', 'How long the money lasts, and what you would do, in order'), pickTemplate(ctx)];
  if (TUI.share) return shareView(app, ctx, T);
  return [head('Life Transitions', 'How long the money lasts, and what you would do, in order',
    S.button('Share view', { iconName: 'user', onClick: () => { TUI.share = true; app.render(); } })),
  headline(ctx, T), hereThere(ctx, T), burnSection(ctx, T), ladderSection(ctx, T), dipSection(ctx, T), tripwireSection(ctx, T), plansSection(ctx, T)];
}

// ---------- Start: what is changing (taps) ----------
function templateDefaults(ctx, t) {
  const here = ymOf(ctx.now());
  return { template: t.id, from: t.from[0], to: t.to[0], start: here, rungs: {}, stops: {}, plans: [],
    tripwires: (t.tripwires || []).map((w, i) => ({ id: `tw${i + 1}`, if: w.if.kind === 'date' ? { kind: 'date', ym: addMonths(here, w.if.in ?? 3) } : w.if, then: w.then })) };
}
function pickTemplate(ctx) {
  const list = ctx.ref.transitions?.templates || [];
  return h('div.card.tr-start', {}, h('h2', {}, 'What is changing?'),
    h('p.muted', {}, 'Pick the one closest. Everything after it is read from the numbers already here.'),
    S.tapPick(list.map(t => [t.id, t.label]), null, id => { const t = list.find(x => x.id === id); if (t) { S.clearToast(); put(ctx, templateDefaults(ctx, t)); } }, { label: 'What is changing', clearable: false })); // batch 37: the Cleared toast is done once a template is picked
}

// ---------- The headline: one calm number ----------
function headline(ctx, T) {
  const p = T.plan, lad = T.ladder, cut = lad.rungs.find(r => r.id === 'cut');
  const months = T.runway;
  const ben = lad.rungs.find(r => r.id === 'benefits' && r.on);
  return h('div.card.tr-hero', {},
    h('div.tr-hero-num', {}, h('span.label', {}, 'The money lasts'), h('strong.tr-big', { 'data-focus': 'transitions' }, months == null ? 'Past 10 years' : monthsText(months)),
      h('span.muted', {}, months == null ? 'What comes in covers the burn.' : `From ${mon(lad.start)} to ${mon(T.floorYm)}, using every rung that is on.`)),
    h('div.tr-hero-side', {},
      h('span.tag.plain', {}, `${p.tpl.label}: ${p.from} to ${p.to}`),
      cut?.on ? h('span.muted.small', {}, `At ${levelName(cut.level)}, ${money(cut.burn)} a month${cut.when === 'reached' ? ' once it is reached' : ''}`) : null, // batch 37: no brackets of its own, so the plain meaning can pair with the term
      ben ? h('span.muted.small', {}, `Unemployment ${money(ben.amount)} a month until ${mon(ben.until)}`) : null,
      T.tripwires.length ? h('span.muted.small', {}, `${T.tripwires.length} ${T.tripwires.length === 1 ? 'tripwire' : 'tripwires'} set, the first in ${mon(T.tripwires.filter(t => t.ym).sort((a, b) => a.k - b.k)[0]?.ym) || 'time'}`) : null));
}

// ---------- Here and there ----------
function hereThere(ctx, T) {
  const p = T.plan, t = p.tpl, list = ctx.ref.transitions?.templates || [];
  const here = ymOf(ctx.now());
  const months = Array.from({ length: 6 }, (_, k) => addMonths(here, k));
  const startPick = S.tapPick(months.map(ym => [ym, ym === here ? 'This month' : mon(ym)]), p.start, v => v && put(ctx, { start: v }), { label: 'Starts', clearable: false });
  const other = h('input', { type: 'month', value: months.includes(p.start) ? '' : p.start, 'aria-label': 'Another start month' });
  other.onchange = () => other.value && put(ctx, { start: other.value });
  return sec('tr:here', { title: 'Here and there', summary: `${t.label}: ${p.from} to ${p.to}, from ${mon(p.start)}`, card: true },
    h('div.tr-form', {},
      S.labelled('What is changing', S.tapPick(list.map(x => [x.id, x.label]), p.template, id => { const x = list.find(y => y.id === id); if (x && id !== p.template) put(ctx, { ...templateDefaults(ctx, x), start: p.start }); }, { label: 'What is changing', clearable: false })),
      S.labelled('From', S.tapPick(t.from.map(x => [x, x]), p.from, v => v && put(ctx, { from: v }), { label: 'From', clearable: false })),
      S.labelled('To', S.tapPick(t.to.map(x => [x, x]), p.to, v => v && put(ctx, { to: v }), { label: 'To', clearable: false })),
      S.labelled('Starts', h('div.row-line', { style: { gap: '8px' } }, startPick, h(`label.field${months.includes(p.start) ? '' : '.filled'}`, { style: { width: '170px' } }, other))),
      T.ladder.incomes.length ? S.labelled('Income during it', h('div.picks', {}, T.ladder.incomes.map(i => h('button.pick', { type: 'button', 'aria-pressed': String(!i.stops), title: i.stops ? 'Stops at the start: tap to keep it' : 'Keeps coming: tap if it stops',
        onclick: () => put(ctx, { stops: { ...(p.stops || {}), [i.id]: !i.stops } }) }, `${i.name}: ${i.stops ? 'stops' : `keeps coming, ${money(i.monthly)}`}`)))) : null,
      h('div.row-line', {}, S.button('Start over', { size: 'small', onClick: () => { put(ctx, { template: null }); S.toast('Cleared. Pick what is changing to start again.', { undo: () => ctx.store.undo() }); } }))));
}

// ---------- The burn: four levels, each with its runway ----------
function burnSection(ctx, T) {
  const lad = T.ladder;
  const tiles = T.levels.map(l => h('div.tr-level', { title: l.tip },
    h('span.label', {}, l.name),
    l.burn == null ? h('span.muted', {}, `Needs ${l.needs}`) : h('strong', {}, `${money(l.burn)} a month`),
    l.burn == null ? (l.id !== 'full' ? h('a.small', { href: '#/cash-flow/budget' }, 'Add Budget lines ›') : null) : h('span.muted.small', {}, l.lasts ? 'Lasts past 10 years' : `Lasts ${monthsText(l.runway)}`)));
  const inc = [lad.after > 0 ? `${money(lad.after)} a month keeps coming (${lad.keeps.map(i => i.name).join(', ')})` : null,
    lad.benefits.monthly > 0 ? `benefits ${money(lad.benefits.monthly)} a month${lad.benefits.end ? ` until ${mon(lad.benefits.end)}` : ''}` : null,
    lad.stops.length ? `${lad.stops.map(i => i.name).join(', ')} stops from ${mon(lad.start)}` : null].filter(Boolean);
  return sec('tr:burn', { title: 'The burn', summary: T.levels[0].burn == null ? 'Needs spending' : `${money(T.levels[0].burn)} a month at full spending`, open: true, card: true },
    h('div.tr-levels', {}, tiles),
    inc.length ? h('p.muted.small', { style: { marginTop: '8px' } }, `Coming in: ${inc.join('; ')}.`) : h('p.muted.small', { style: { marginTop: '8px' } }, 'Nothing comes in during it.'));
}

// ---------- The options ladder ----------
function ladderSection(ctx, T) {
  const rows = T.ladder.rungs.map((r, i) => rungRow(ctx, T, r, i));
  const on = T.ladder.rungs.filter(r => r.on).length;
  return sec('tr:ladder', { title: 'The options ladder', summary: `${on} of ${T.ladder.rungs.length} on, cheapest first`, open: true, card: true,
    tip: 'Every source of money, cheapest first. Each one is on or off; the total is how long it lasts.' },
  h('div.tr-ladder', {}, rows),
  h('p.muted.small', { style: { marginTop: '8px' } }, T.costs > 0.5 ? `Used as set, the costly rungs cost about ${money(Math.round(T.costs))} in interest, penalty and tax by ${mon(T.floorYm) || 'the end'}.` : 'Used as set, nothing on the ladder costs interest or penalties.'));
}
function rungRow(ctx, T, r, i) {
  const toggle = h('input', { type: 'checkbox', checked: r.on, disabled: !r.usable, 'aria-label': `${r.name}: ${r.on ? 'on' : 'off'}` });
  toggle.onchange = () => putRung(ctx, r.id, { on: toggle.checked });
  const reached = T.dip.reached[r.id];
  const amount = r.kind === 'cut' ? (r.burn == null ? h('span.muted', {}, 'Needs Budget lines') : h('strong', {}, `${money(r.amount)} a month less`))
    : r.id === 'benefits' ? (r.amount == null ? h('span.muted', {}, 'None on file') : h('strong', {}, `${money(r.amount)} a month`))
      : r.amount == null ? h('span.muted', {}, r.needs ? `Needs ${r.needs}` : 'None')
        : h('strong', {}, `${money(Math.round(r.amount))}${r.per === 'month' ? ' a month' : r.per === 'once' ? ' once' : ''}`);
  const from = r.amount == null && r.kind !== 'cut' ? null : r.from === 'household' ? h('span.tag.plain.tr-from', { title: 'Read from the numbers already here' }, 'From your numbers') : r.from === 'typed' ? h('span.tag.roughly.tr-from', {}, 'Typed here') : null;
  return h(`div.tr-rung${r.on ? '' : '.off'}${r.expensive ? '.costly' : ''}`, { 'data-rung': r.id },
    h('label.tr-on', {}, toggle, h('span.tr-n', {}, String(i + 1))),
    h('div.tr-what', {}, h('span.tr-name', {}, r.name), r.note ? h('span.muted.small', {}, r.note) : null,
      r.on && reached != null ? h('span.muted.small', {}, r.kind === 'cut' ? `From ${mon(addMonths(T.ladder.here, reached))}` : `Reached ${mon(addMonths(T.ladder.here, reached))}`) : null),
    h('div.tr-amt', {}, amount, from),
    h('div.tr-cost', {}, h('span.small', {}, r.costText), r.on && T.dip.costs[r.id] > 0.5 ? h('span.muted.small', {}, `About ${money(Math.round(T.dip.costs[r.id]))} by ${mon(T.floorYm) || 'the end'}`) : null),
    rungControls(ctx, T, r));
}
function rungControls(ctx, T, r) {
  const tx = ctx.store.doc.program?.transition?.rungs?.[r.id] || {};
  const box = (hint, quick) => h('div.row-line.tr-controls', { style: { gap: '8px' } },
    chips(quick, tx.amount ?? null, v => putRung(ctx, r.id, { amount: v, on: v != null })),
    S.moneyInput(tx.amount ?? null, v => putRung(ctx, r.id, { amount: v, on: v != null }), { hint, key: `tr:${r.id}`, width: 140 }));
  if (r.id === 'cut') return r.burn == null ? null : h('div.row-line.tr-controls', { style: { gap: '12px' } },
    S.toggle(['draftt', 'fat', 'food'].map(k => [k, levelName(k)]), r.level, v => putRung(ctx, 'cut', { level: v, on: true }), { label: 'Cut to' }),
    S.toggle([['start', 'From the start'], ['reached', 'When I reach it']], r.when, v => putRung(ctx, 'cut', { when: v, on: true }), { label: 'Cut starts' }));
  if (r.id === 'side') return h('div.tr-controls.stack', { style: { gap: '6px' } },
    h('div.row-line', { style: { gap: '8px' } }, S.toggle([['month', 'A month'], ['once', 'Once (selling things)']], r.per, v => putRung(ctx, 'side', { per: v }), { label: 'Side income per' })),
    box('Add amount', r.per === 'once' ? [500, 1000, 2500] : [200, 500, 1000]),
    S.moreBlock('tr:earn', () => h('ul.tr-earn', {}, (ctx.ref.transitions?.earn || []).map(w => h('li', {}, w))), { label: 'Ways to earn quickly' }));
  if (r.id === 'family') return box('Add amount', [1000, 2500, 5000]);
  if (r.id === 'card0' && (r.from === 'typed' || r.needs)) return box('Room on the card', [1000, 2500, 5000]);
  if (r.id === 'card' && (r.from !== 'household' || r.amount == null)) return box('Room on the card', [1000, 2500, 5000]);
  if (r.id === 'benefits') {
    if (r.rows?.length) return h('div.row-line.tr-controls', {}, h('a.small', { href: '#/cash-flow/income' }, 'Change it on Income ›'));
    const max = ctx.ref.limits?.unemployment?.NY;
    const add = weekly => {
      const start = `${T.ladder.start}-01`, end = new Date(`${start}T12:00:00Z`); end.setUTCDate(end.getUTCDate() + (max?.weeks ?? 26) * 7 - 1);
      ctx.store.add('income', { name: 'Unemployment benefits', amount: weekly, per: 'week', status: weekly ? 'Roughly' : null, values: { payFrequency: 'week', benefitStart: start, benefitEnd: end.toISOString().slice(0, 10) } }, { type: 'Unemployment' });
      S.toast(weekly ? `Unemployment added on Income: ${money(weekly)} a week, marked Roughly.` : 'Unemployment added on Income: add the weekly amount there.', { undo: () => ctx.store.undo() });
    };
    return h('div.row-line.tr-controls', { style: { gap: '8px' } },
      ctx.store.doc.profile.state === 'NY' && max?.maxWeekly ? S.button(`Add NY's most, ${money(max.maxWeekly)} a week`, { size: 'small', iconName: 'plus', onClick: () => add(max.maxWeekly) }) : null,
      S.button('Add on Income', { size: 'small', iconName: 'plus', onClick: () => add(null) }));
  }
  return null;
}

// ---------- The dip ----------
function dipSection(ctx, T) {
  const host = h('div.chart.tr-chart', { style: { height: '320px' } });
  const lad = T.ladder, ben = lad.rungs.find(r => r.id === 'benefits' && r.on);
  queueMicrotask(() => drawDip(ctx, host, T));
  const notes = dipMarks(T).sort((a, b) => a.k - b.k).map(x => h('li', {}, h('strong', {}, x.short), `: ${x.long}`));
  return sec('tr:dip', { title: 'The dip', summary: T.floorYm ? `Floor ${mon(T.floorYm)}` : 'No floor', open: true, card: true, tip: 'The money left on every rung that is on, month by month from today' },
    host, h('ul.tr-marks.muted.small', {}, notes, T.floorYm ? null : h('li', {}, 'No floor in 10 years: what comes in covers the burn')));
}
// The lines on the dip: today, the start, the end of benefits, each tripwire and the floor. A short name on the chart,
// the whole sentence under it.
function dipMarks(T) {
  const lad = T.ladder, out = [{ k: 0, short: 'Today', long: `you are here, ${mon(lad.here)}` }];
  if (lad.startK > 0) out.push({ k: lad.startK, short: 'Starts', long: mon(lad.start) });
  if (lad.rungs.find(r => r.id === 'benefits' && r.on) && lad.benefits.endK != null) out.push({ k: lad.benefits.endK, short: 'Benefits end', long: mon(lad.benefits.end) });
  T.tripwires.filter(w => w.k != null).forEach((w, i) => out.push({ k: Math.floor(w.k), short: `Tripwire ${i + 1}`, long: `${w.text} (${mon(w.ym)})`, wire: true }));
  if (T.dip.floorK != null) out.push({ k: T.dip.floorK, short: 'Floor', long: `${mon(T.floorYm)}, when the last rung runs out`, floor: true });
  return out;
}
function drawDip(ctx, host, T) {
  if (!window.echarts || !host.isConnected) return;
  const t = S.chartTheme('goals');
  const lad = T.ladder, path = T.dip.path;
  const longest = Math.max(path.length, ...T.plans.map(p => p.dip.path.length));
  const n = Math.min(Math.max(longest + 1, 13), 121);
  const labels = Array.from({ length: n }, (_, k) => monthName(addMonths(lad.here, k), 'short'));
  const lumps = lad.rungs.filter(r => r.on && path[0]?.by?.[r.id] != null);
  const at = (p, k, f) => (k < p.length ? f(p[k]) : 0);
  const series = [...lumps].reverse().map((r, i) => ({ name: r.name, type: 'line', stack: 'left', showSymbol: false, smooth: false, lineStyle: { width: 0 }, emphasis: { focus: 'series' },
    areaStyle: { color: t.area, opacity: Math.max(0.12, 0.85 - i * 0.08) }, data: labels.map((_, k) => Math.round(at(path, k, p => p.by[r.id] ?? 0))) }));
  const marks = dipMarks(T).filter(x => x.k < n).sort((a, b) => a.k - b.k).map((x, i) => ({ xAxis: Math.min(n - 1, Math.round(x.k)), name: x.short,
    label: { distance: i % 2 ? 16 : 3, show: x.floor || host.clientWidth >= 700 }, lineStyle: x.floor ? { type: 'solid', width: 2, color: t.text } : x.wire ? { type: 'dotted' } : undefined }));
  series.push({ name: 'Money left', type: 'line', showSymbol: false, lineStyle: { width: 2, color: t.text }, itemStyle: { color: t.text }, data: labels.map((_, k) => Math.round(at(path, k, p => p.left))),
    markLine: { symbol: 'none', silent: true, lineStyle: { color: t.text2, type: 'dashed' }, label: { color: t.text2, formatter: '{b}', position: 'end', fontSize: 11 }, data: marks } });
  T.plans.forEach((p, i) => series.push({ name: p.name, type: 'line', showSymbol: false, lineStyle: { width: 2, type: i ? 'dotted' : 'dashed', color: t.text2 }, itemStyle: { color: t.text2 },
    data: labels.map((_, k) => Math.round(at(p.dip.path, k, q => q.left))) }));
  const short = v => (Math.abs(v) >= 1000 ? `$${Math.round(v / 1000)}k` : money(v));
  const c = window.echarts.getInstanceByDom(host) || window.echarts.init(host, null, { renderer: 'svg' });
  c.setOption({
    textStyle: { fontFamily: t.font, color: t.text }, animation: false,
    grid: { left: 56, right: 24, top: 64, bottom: 28 }, legend: { top: 0, type: 'scroll', textStyle: { color: t.text2 }, data: ['Money left', ...T.plans.map(p => p.name)] },
    tooltip: { trigger: 'axis', valueFormatter: v => money(v) },
    xAxis: { type: 'category', boundaryGap: false, data: labels, axisLabel: { color: t.text2 } },
    yAxis: { type: 'value', min: 0, axisLabel: { color: t.text2, formatter: short }, splitLine: { lineStyle: { color: t.line } } },
    series,
  }, true);
  new ResizeObserver(() => c.resize()).observe(host);
}

// ---------- Tripwires ----------
function tripwireSection(ctx, T) {
  const p = ctx.store.doc.program?.transition || {};
  const list = T.tripwires.map(w => h('div.row-line.tr-wire', { style: { gap: '10px' } },
    icon('flag'), h('span', { style: { flex: 1 } }, w.text), h('span.muted.small', {}, w.ym ? mon(w.ym) : 'Not reached in this plan'),
    S.iconButton('trash', `Remove: ${w.text}`, () => { put(ctx, { tripwires: (p.tripwires || []).filter(x => x.id !== w.id) }); S.toast('Tripwire removed.', { undo: () => ctx.store.undo() }); }, { tiny: true })));
  const add = e => tripwirePop(ctx, T, e.currentTarget);
  return sec('tr:wires', { title: 'Tripwires', summary: T.tripwires.length ? `${T.tripwires.length} set` : 'None yet', card: true, tip: 'Decide now, calmly: if this happens, then I do that' },
    list.length ? list : h('p.muted', {}, 'None yet. A tripwire is a decision made now, so the hard moment already has an answer.'),
    h('div.row-line', { style: { marginTop: '8px' } }, S.addButton('tripwire', add)));
}
function tripwirePop(ctx, T, anchor) {
  const here = ymOf(ctx.now());
  const draft = { kind: null, rung: null, ym: null, then: null };
  const ifs = [...T.ladder.rungs.filter(r => r.on && r.kind === 'lump' && !['buffer'].includes(r.id)).map(r => [`rung:${r.id}`, `I reach ${r.short}`]), ['date', 'No offer by a month'], ['left', 'Money left under 3 months']];
  const months = Array.from({ length: 12 }, (_, k) => addMonths(here, k + 1));
  const monthRow = h('div', { hidden: true }, S.labelled('By', S.tapPick(months.map(ym => [ym, mon(ym)]), null, v => { draft.ym = v; }, { label: 'By month' })));
  const save = () => {
    if (!draft.kind || !draft.then || (draft.kind === 'date' && !draft.ym)) { S.toast('Pick an If and a Then.'); return; }
    const p = ctx.store.doc.program?.transition || {};
    const cond = draft.kind === 'rung' ? { kind: 'rung', rung: draft.rung } : draft.kind === 'date' ? { kind: 'date', ym: draft.ym } : { kind: 'left', months: 3 };
    S.closePop();
    put(ctx, { tripwires: [...(p.tripwires || []), { id: ctx.store.makeId(), if: cond, then: draft.then }] });
  };
  S.popover(anchor, h('div.stack.tr-pop', { style: { gap: '10px' } }, h('h3', {}, 'Add a tripwire'),
    S.labelled('If', S.tapPick(ifs, null, v => { const [k, id] = String(v || '').split(':'); draft.kind = v ? k : null; draft.rung = id ?? null; monthRow.hidden = k !== 'date'; }, { label: 'If' })),
    monthRow,
    S.labelled('Then', S.tapPick((ctx.ref.transitions?.then || []).map(x => [x, x]), null, v => { draft.then = v; }, { label: 'Then' })),
    h('div.row-line', {}, S.button('Add', { kind: 'primary', onClick: save }), S.button('Cancel', { onClick: S.closePop }))), { width: 420 });
}

// ---------- Plan B and C ----------
function plansSection(ctx, T) {
  const p = ctx.store.doc.program?.transition || {};
  const stored = p.plans || [];
  const save = (i, patch) => put(ctx, { plans: stored.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const rows = T.plans.map((pl, i) => h('div.tr-plan', {},
    h('div.row-line', { style: { gap: '10px' } }, h('span.tag.plain', {}, pl.name), h('span', { style: { flex: 1 } }, pl.line),
      S.iconButton('trash', `Remove ${pl.name}`, () => { put(ctx, { plans: stored.filter((_, j) => j !== i).map((x, j) => ({ ...x, id: ['B', 'C'][j], name: x.name === `Plan ${['B', 'C'][i]}` ? `Plan ${['B', 'C'][j]}` : x.name })) }); S.toast(`${pl.name} removed.`, { undo: () => ctx.store.undo() }); }, { tiny: true })),
    S.moreBlock(`tr:plan:${i}`, () => h('div.tr-form', {},
      S.labelled('Extra income a month', chips([0, 500, 1000, 1500, 2000], pl.extra ?? 0, v => save(i, { extra: v || null }), { fmt: v => (v ? money(v) : 'None') })),
      S.labelled('Starting', S.tapPick([0, 1, 2, 3, 6].map(k => [k, k === 0 ? 'At the start' : `Month ${k + 1}`]), pl.from ?? 0, v => save(i, { from: v ?? 0 }), { label: 'Starting', clearable: false })),
      S.labelled('Use first', S.tapPick(T.ladder.rungs.filter(r => r.on && r.kind === 'lump').map(r => [r.id, r.name]), pl.first ?? null, v => save(i, { first: v }), { label: 'Use first' })),
      S.labelled('Leave out', h('div.picks', {}, T.ladder.rungs.filter(r => r.on && r.kind === 'lump').map(r => { const off = (pl.skip || []).includes(r.id); return h('button.pick', { type: 'button', 'aria-pressed': String(off), onclick: () => save(i, { skip: off ? (pl.skip || []).filter(x => x !== r.id) : [...(pl.skip || []), r.id] }) }, r.name); }))),
      S.labelled('Cut to', S.tapPick(['draftt', 'fat', 'food'].map(k => [k, levelName(k)]), pl.level ?? null, v => save(i, { level: v }), { label: 'Plan cut to' }))), { label: `Change ${pl.name}` })));
  const addPlan = () => { const id = ['B', 'C'][stored.length]; put(ctx, { plans: [...stored, { id, name: `Plan ${id}`, extra: 1000, from: 0 }] }); S.openBlock(`tr:plan:${stored.length}`); };
  return sec('tr:plans', { title: 'Plan B and C', summary: T.plans.length ? T.plans.map(x => `${x.name}: ${x.months == null ? 'lasts' : monthsText(x.months)}`).join(' · ') : 'None yet', card: true, tip: 'Other paths: a rung first, rungs left out, extra income or a deeper cut' },
    rows.length ? rows : h('p.muted', {}, 'Another path, drawn on the dip beside the plan.'),
    stored.length < 2 ? h('div.row-line', { style: { marginTop: '8px' } }, S.button(`Add Plan ${['B', 'C'][stored.length]}`, { iconName: 'plus', onClick: addPlan })) : null);
}

// ---------- The share view: one page for parents or a partner ----------
function shareView(app, ctx, T) {
  // Batch 28: a page for parents or a partner: private and coach-only rows fold into neutral words, the runway is the same.
  ctx = S.shareCtx(ctx);
  T = transitionOf(ctx.store.doc, ctx.ref, { now: ctx.now() });
  const p = T.plan, lad = T.ladder, hide = !!p.share?.hideCosts;
  const first = ctx.store.doc.profile.firstName || ctx.store.doc.client.name || 'The';
  const on = lad.rungs.filter(r => r.on);
  const amt = r => (hide && r.expensive ? 'Kept for last' : r.kind === 'cut' ? `${money(r.burn)} a month instead of ${money(T.levels[0].burn)}` : r.id === 'benefits' ? `${money(r.amount)} a month until ${mon(r.until)}` : `${money(Math.round(r.amount ?? 0))}${r.per === 'month' ? ' a month' : ''}`);
  const wires = T.tripwires.filter(w => w.ym).sort((a, b) => a.k - b.k);
  return [h('div.row-line.tr-share-bar.no-print', { style: { gap: '10px' } },
    S.button('Back to the plan', { iconName: 'left', onClick: () => { TUI.share = false; app.render(); } }),
    S.toggle([[false, 'Show all dollars'], [true, 'Hide costly dollars']], hide, v => put(ctx, { share: { ...(p.share || {}), hideCosts: v } }), { label: 'Dollars on the costly rungs' }),
    S.button('Print', { iconName: 'printer', onClick: () => window.print() })),
  h('article.card.tr-share', {},
    h('h1', {}, `${first === 'The' ? 'The' : `${first}'s`} plan: ${p.from} to ${p.to}`),
    h('h2', {}, 'The situation'),
    h('p', {}, `${p.tpl.label}, from ${mon(lad.start)}. ${T.levels[0].burn != null ? `A month costs ${money(T.levels[0].burn)} at full spending` : ''}${lad.rungs.find(r => r.id === 'cut' && r.on) ? `, and ${money(lad.rungs.find(r => r.id === 'cut').burn)} with the cut` : ''}.`),
    h('h2', {}, 'The plan, in order'),
    h('ol.tr-share-list', {}, on.map(r => h('li', {}, h('strong', {}, RUNGS.find(x => x.id === r.id)?.plain ?? r.name), ` · ${amt(r)}`))), // batch 20: plain names for parents
    wires.length ? [h('h2', {}, 'Decided ahead'), h('ul', {}, wires.map(w => h('li', {}, `${w.plainText ?? w.text} (${mon(w.ym)})`)))] : null, // batch 37: plain rung names, as in The plan, in order
    h('h2', {}, 'The worst case'),
    h('p', {}, T.floorYm ? `If nothing changes at all, the last of the money runs out in ${mon(T.floorYm)}, ${monthsText(T.runway)} from the start.${wires.length ? ` The first decision comes well before that, in ${mon(wires[0].ym)}.` : ''}` : 'What comes in covers the burn: there is no floor in sight.'),
    T.plans.length ? h('p', {}, T.plans.map(x => x.text).join(' ')) : null,
    h('h2', {}, 'It is handled'),
    h('p', {}, `There is a number, an order and a decision ready for each step. ${first === 'The' ? 'The plan' : first} will check in on it at each session.`))];
}
