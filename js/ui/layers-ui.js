// SPDX-License-Identifier: AGPL-3.0-only
// Net worth › Assets › Cash layers (Phase 3.5 section 3). Formatting only: js/math/layers.js does the math.
import { h } from './dom.js';
import * as S from './staples.js';
import { layersOf, recordDip, layerHistory } from '../math/layers.js';
import { money } from '../format.js';

export const BACKUP_KINDS = ['Unemployment benefits', 'Disability coverage', 'Available credit', 'What you could cut', 'Family help'];

export function layersCard(ctx) {
  const doc = ctx.store.doc;
  const L = layersOf(doc, ctx.ref, ctx.now());
  const mode = doc.settings.layerMode || 'virtual';
  const cash = ctx.metrics().inputs.accounts.filter(a => a.group === 'cash');
  const setSetting = patch => ctx.store.setDoc('settings', patch);
  const bar = l => h('div.layer-bar', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': l.target ? Math.round(l.filled / l.target * 100) : 0, 'aria-label': l.name },
    h('span', { style: { width: `${l.target ? Math.min(100, l.filled / l.target * 100) : 0}%` } }));
  const rows = L.layers.map(l => h(`div.layer-row${l.full ? '.full' : ''}`, {},
    h('div.stack', { style: { gap: '2px' } }, h('strong', {}, l.name, l.guess ? [' ', S.guessTag()] : null), h('span.muted.small', {}, l.note)),
    bar(l),
    h('span.num', {}, l.target == null ? h('span.muted', {}, 'Needs your age') : S.mathButton({ id: 'M68', value: l.filled, needs: [], text: `${l.name}: ${money(l.filled)} of ${money(l.target)}. ${l.note}.` }, `${money(l.filled)} of ${money(l.target)}`)),
    h('span.tag.plain', {}, `FOO step ${l.step}`),
    mode === 'accounts' ? S.select(cash.map(a => [a.id, a.name]), (doc.settings.layerAccounts || {})[l.id] ?? null,
      v => setSetting({ layerAccounts: { ...(doc.settings.layerAccounts || {}), [l.id]: v ?? undefined } }), { label: `Account for ${l.name}`, hint: 'Which account', width: 170 }) : null));
  const gaps = doc.profile.incomeGaps || [];
  const setGaps = list => ctx.store.setDoc('profile', { incomeGaps: list });
  const gapRow = (g, i) => h('div.row-line.gap-row', { style: { gap: '8px' } },
    S.textInput(g.name, v => setGaps(gaps.map((x, j) => (j === i ? { ...x, name: v } : x))), { hint: 'What is the gap', width: 180, key: `gap:${g.id}:name` }),
    h('label.field', { style: { width: '160px' } }, (() => { const d = h('input', { type: 'month', value: g.start || '', 'aria-label': 'Starts' }); d.onchange = () => setGaps(gaps.map((x, j) => (j === i ? { ...x, start: d.value || null } : x))); return d; })()),
    S.stepper(g.months ?? null, n => setGaps(gaps.map((x, j) => (j === i ? { ...x, months: n } : x))), { min: 1, max: 24, label: 'Months', key: `gap:${g.id}:months` }), h('span.muted.small', {}, 'months'),
    S.iconButton('trash', 'Remove this gap', () => setGaps(gaps.filter((_, j) => j !== i)), { tiny: true }));
  const backups = doc.profile.backups || [];
  const setBackups = list => ctx.store.setDoc('profile', { backups: list });
  const backupRow = kind => {
    const b = backups.find(x => x.kind === kind);
    return h('div.row-line', { style: { gap: '8px' } }, h('span', { style: { minWidth: '190px' } }, kind),
      S.moneyInput(b?.amount ?? null, v => setBackups(v == null ? backups.filter(x => x.kind !== kind) : [...backups.filter(x => x.kind !== kind), { kind, amount: v }]), { hint: 'Dollars you could lean on', key: `backup:${kind}` }));
  };
  return h('div.card.layers-card', {},
    h('div.row-line', { style: { justifyContent: 'space-between' } }, h('span.muted', {}, 'Your cash fills these buckets in order: Buffer, little e, then big e. An emergency dips the Buffer first and big e last.'),
      S.button('Record a dip', { size: 'small', onClick: e => dipBox(e.currentTarget, ctx, L, cash) }),
      S.toggle([['virtual', 'One account, layers inside'], ['accounts', 'One account per layer']], mode, v => setSetting({ layerMode: v }), { label: 'How the layers are held' })),
    h('div.layer-list', {}, rows),
    L.extra > 0.5 ? h('p.muted', { style: { margin: '8px 0 0' } }, `${money(L.extra)} of cash sits above every layer.`) : null,
    S.moreBlock('layers:history', () => historyBlock(ctx), { label: 'History' }),
    (doc.spending?.dips || []).length ? S.moreBlock('layers:dips', () => h('ul.op-list', {}, [...doc.spending.dips].reverse().map(d => h('li', {}, `${new Date(d.at).toLocaleDateString()}: ${money(d.amount)}${d.note ? ` (${d.note})` : ''} from ${d.from.map(f => `${f.name} ${money(f.amount)}`).join(', ')}${d.uncovered ? `; ${money(d.uncovered)} not covered` : ''}`))), { label: `Dips (${doc.spending.dips.length})` }) : null,
    S.moreBlock('layers:gaps', () => h('div.stack', { style: { gap: '8px' } }, h('span.muted.small', {}, 'A known stretch with less or no pay (a summer off, leave, a contract ending). Spending times months; within 12 months it moves to FOO step 1.'),
      ...gaps.map(gapRow), S.button('Add a gap', { size: 'small', iconName: 'plus', onClick: () => setGaps([...gaps, { id: `g${Date.now().toString(36)}`, name: null, start: null, months: 1 }]) })), { label: `Income gaps (${gaps.length})` }),
    S.moreBlock('layers:backups', () => h('div.stack', { style: { gap: '8px' } }, h('span.muted.small', {}, 'Backups of the backups add months of runway. They are never counted as a fund.'),
      ...BACKUP_KINDS.map(backupRow),
      L.backups.months != null && L.backups.total ? h('span', {}, `Adds about ${L.backups.months.toFixed(1)} months to your runway${L.runwayWithBackups != null ? ` (${L.runway.toFixed(1)} now, ${L.runwayWithBackups.toFixed(1)} with them)` : ''}.`) : null), { label: 'Backups of the backups' }));
}

// The history (A9): a stacked area, one color per layer, from the snapshots; each dip marked; the stats line.
function historyBlock(ctx) {
  const H = layerHistory(ctx.store.doc, ctx.ref, ctx.now());
  const st = H.stats;
  const words = [`${st.dips} ${st.dips === 1 ? 'dip' : 'dips'}`,
    st.deepest ? `deepest: ${st.deepest.name}, ${st.deepest.pctLeft == null ? 'what was left not recorded' : `${Math.round(st.deepest.pctLeft * 100)}% left`}, ${monthWords(st.deepest.month)}` : null,
    st.dips ? (st.refillMonths != null ? `months to refill: ${st.refillMonths}` : 'not refilled yet') : null].filter(Boolean).join(' · ');
  const stats = h('p.muted.small', { style: { margin: '0 0 6px' } }, words);
  if (H.points.length < 2) return h('div.stack', {}, stats, h('p.muted', { style: { margin: 0 } }, 'The chart starts with the second snapshot (End session and Save snapshot both keep the layers).'));
  const ids = [...new Set(H.points.flatMap(p => p.layers.map(l => l.id)))].filter(id => !id.startsWith('sink:'));
  const host = h('div.chart', { style: { height: '220px' } });
  queueMicrotask(() => {
    if (!window.echarts || !host.isConnected) return;
    const t = S.chartTheme('assets');
    const c = window.echarts.init(host, null, { renderer: 'svg' });
    const x = H.points.map(p => new Date(p.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const series = ids.map((id, i) => ({ name: H.points.find(p => p.layers.some(l => l.id === id))?.layers.find(l => l.id === id)?.name ?? id, type: 'line', stack: 'layers', areaStyle: {}, smooth: false, symbolSize: 5, lineStyle: { width: 1.5 },
      data: H.points.map(p => Math.round(p.layers.find(l => l.id === id)?.filled ?? 0)) }));
    if (H.dips.length) series.push({ name: 'Dips', type: 'scatter', symbol: 'triangle', symbolSize: 12, itemStyle: { color: t.text },
      data: H.dips.map(d => { const i = H.points.findIndex(p => p.at >= d.at); const total = H.points[i < 0 ? H.points.length - 1 : i].layers.reduce((s, l) => s + (l.filled ?? 0), 0); return { value: [x[i < 0 ? x.length - 1 : i], Math.round(total)], name: `Dip ${money(d.amount)}` }; }) });
    c.setOption({ textStyle: { fontFamily: t.font, color: t.text }, grid: { left: 56, right: 16, top: 32, bottom: 28 }, legend: { top: 0, textStyle: { color: t.text2 } }, tooltip: { trigger: 'axis', valueFormatter: v => money(v) },
      xAxis: { type: 'category', data: x, axisLabel: { color: t.text2 } }, yAxis: { type: 'value', axisLabel: { color: t.text2, formatter: v => money(v) }, splitLine: { lineStyle: { color: t.line } } }, series });
    new ResizeObserver(() => c.resize()).observe(host);
  });
  return h('div.stack', {}, stats, host);
}
const monthWords = ym => (ym ? new Date(`${ym}-15T12:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '');
// An emergency paid from cash: how much, a note, which account; the layers say what it came out of.
function dipBox(anchor, ctx, L, cash) {
  const amt = S.moneyInput(null, () => {}, { hint: 'How much', key: 'dip:amount' });
  const note = h('input', { placeholder: 'What happened (optional)', 'aria-label': 'What happened' });
  let acct = cash[0]?.id ?? null;
  S.popover(anchor, h('div.stack', { style: { gap: '8px' } }, h('strong', {}, 'Record a dip'), h('span.muted.small', {}, 'It comes out of the Buffer first, then little e, then big e.'), amt, h('label.field', { style: { width: '280px' } }, note),
    cash.length > 1 ? S.select(cash.map(a => [a.id, a.name]), acct, v => { acct = v; }, { label: 'From which account', hint: 'Account', width: 220 }) : null,
    h('div.row-line', {}, S.button('Record it', { kind: 'primary', onClick: () => {
      const v = S.parseNum(amt.querySelector('input').value);
      if (v == null || v <= 0) { S.toast('How much?'); return; }
      S.closePop();
      const d = recordDip(ctx.store, { amount: v, note: note.value.trim() || null, now: ctx.now().toISOString(), layers: L.layers, accountId: acct });
      S.toast(`Dip recorded: ${d.from.map(f => `${f.name} ${money(f.amount)}`).join(', ')}${d.uncovered ? `; ${money(d.uncovered)} not covered` : ''}.`, { undo: () => ctx.store.undo() });
    } }), S.button('Cancel', { onClick: S.closePop }))), { width: 340 });
}
