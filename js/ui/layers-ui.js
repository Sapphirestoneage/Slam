// Net worth › Assets › Cash layers (Phase 3.5 section 3). Formatting only: js/math/layers.js does the math.
import { h } from './dom.js';
import * as S from './staples.js';
import { layersOf } from '../math/layers.js';
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
    h('div.row-line', { style: { justifyContent: 'space-between' } }, h('span.muted', {}, 'Your cash, filled in order. The FOO reads these.'),
      S.toggle([['virtual', 'One account, layers inside'], ['accounts', 'One account per layer']], mode, v => setSetting({ layerMode: v }), { label: 'How the layers are held' })),
    h('div.layer-list', {}, rows),
    L.extra > 0.5 ? h('p.muted', { style: { margin: '8px 0 0' } }, `${money(L.extra)} of cash sits above every layer.`) : null,
    S.moreBlock('layers:gaps', () => h('div.stack', { style: { gap: '8px' } }, h('span.muted.small', {}, 'A known stretch with less or no pay (a summer off, leave, a contract ending). Spending times months; within 12 months it moves to FOO step 1.'),
      ...gaps.map(gapRow), S.button('Add a gap', { size: 'small', iconName: 'plus', onClick: () => setGaps([...gaps, { id: `g${Date.now().toString(36)}`, name: null, start: null, months: 1 }]) })), { label: `Income gaps (${gaps.length})` }),
    S.moreBlock('layers:backups', () => h('div.stack', { style: { gap: '8px' } }, h('span.muted.small', {}, 'Backups of the backups add months of runway. They are never counted as a fund.'),
      ...BACKUP_KINDS.map(backupRow),
      L.backups.months != null && L.backups.total ? h('span', {}, `Adds about ${L.backups.months.toFixed(1)} months to your runway${L.runwayWithBackups != null ? ` (${L.runway.toFixed(1)} now, ${L.runwayWithBackups.toFixed(1)} with them)` : ''}.`) : null), { label: 'Backups of the backups' }));
}
