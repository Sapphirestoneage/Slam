// Coach tools behind the gear (build phase 10): revisit and homework lists, snapshots with compare, notes and
// settings, and the discovery table that turns a sales call into a client file.
import { h, clear, icon } from './dom.js';
import * as S from './staples.js';
import { homeworkItems } from './report-ui.js';
import { keyNumbers } from '../math/metrics.js';
import { statusOf } from '../records.js';
import { money, pct } from '../format.js';

const head = (title, sub, ...right) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null), h('div.row-line', {}, ...right));
const ROUTE = { income: '#/my-money/income', benefit: '#/my-money/income', debt: '#/my-money/debt', account: '#/my-money/assets', asset: '#/my-money/assets', coverage: '#/my-money/protection', bill: '#/spending/budget', milestone: '#/plan/goals', event: '#/plan/next-12-months' };
const DAY = 86400000;

// R061: Roughly is checked after 30 days, anything after 90; Not now and Not sure go on the list at once.
export function revisitList(ctx) {
  const out = [];
  for (const r of ctx.visible(x => !['entry', 'win'].includes(x.kind))) {
    const st = r.status || Object.values(r.fieldStatus || {})[0] || statusOf(r, 'amount') || statusOf(r, 'balance');
    if (!st || st === 'Not for me' || st === 'Computed') continue;
    if (r.values?.preset && st === 'Not sure') continue; // starter guesses are reviewed on Budget, summed in one row below
    const updated = Date.parse(r.updatedAt || r.createdAt || Date.now());
    const wait = st === 'Roughly' ? 30 : ['Not sure', 'Not now'].includes(st) ? 0 : 90;
    const next = updated + wait * DAY;
    if (st === 'Know it' && next > Date.now()) continue;
    out.push({ r, label: r.name || r.values?.category || r.type || 'Item', status: st, next, route: ROUTE[r.kind] || '#/my-money/profile' });
  }
  out.sort((a, b) => a.next - b.next);
  const guesses = ctx.visible(x => x.kind === 'bill' && x.values?.preset && x.status === 'Not sure').length;
  if (guesses) out.unshift({ r: { id: null }, label: `${guesses} starter spending ${guesses === 1 ? 'guess' : 'guesses'} to review`, status: 'Not sure', next: Date.now(), route: '#/spending/budget' });
  return out;
}

export function listsScreen(app, ctx) {
  const revisit = revisitList(ctx);
  const hw = homeworkItems(ctx);
  const fix = x => { app.go(x.route); requestAnimationFrame(() => { const row = document.querySelector(`tr[data-id="${x.r.id}"]`); row?.classList.add('highlight'); row?.querySelector('input')?.focus(); }); };
  const copyHomework = e => {
    const text = [`Homework for ${ctx.store.doc.client.name || 'you'}:`, ...hw.map(x => `- ${x.label}${x.r.values?.homeworkDue ? ` (by ${x.r.values.homeworkDue})` : ''}`)].join('\n');
    const fallback = () => { const ta = h('textarea.notes-box', { readonly: true }, text); S.popover(e.currentTarget, h('div.stack', {}, h('strong', {}, 'Copy and send'), ta), { width: 420 }); setTimeout(() => ta.select()); };
    try { navigator.clipboard.writeText(text).then(() => S.toast('Homework copied. Paste it into a message.'), fallback); } catch { fallback(); }
  };
  return [head('Coach tools', 'Lists'), h('div.grid2', {},
    h('div.section', {}, h('div.section-title', {}, h('h2', {}, 'Revisit list'), h('span.muted', {}, `${revisit.length}`)), revisit.length
      ? h('div.card.tool-list', {}, revisit.slice(0, 40).map(x => h('div.row-line', { style: { gap: '10px' } },
        h('span', { style: { flex: 1, fontWeight: 600 } }, x.label), S.statusTag(x.status),
        h('span.muted.small', { style: { minWidth: '92px' } }, x.next <= Date.now() ? 'Due now' : `Check ${new Date(x.next).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`),
        S.button('Fix now', { size: 'small', onClick: () => fix(x) }))))
      : h('div.list', {}, h('div.empty', {}, h('span.title', {}, 'Nothing to revisit yet'), h('span.muted', {}, 'Rough and not-sure numbers land here.')))),
    h('div.section', {}, h('div.section-title', {}, h('h2', {}, 'Homework list'), h('span.spacer'), hw.length ? S.button('Send to client', { size: 'small', iconName: 'mail', onClick: copyHomework }) : null), hw.length
      ? h('div.card.tool-list', {}, hw.map(x => {
        const d = h('input', { type: 'date', value: x.r.values?.homeworkDue || '', 'aria-label': `Due date for ${x.label}` });
        d.onchange = () => ctx.store.update(x.r.id, { homeworkDue: d.value || null });
        return h('div.row-line', { style: { gap: '10px' } }, h('span', { style: { flex: 1, fontWeight: 600 } }, x.label), h('label.field', { style: { width: '160px' } }, d), S.button('Open', { size: 'small', onClick: () => fix({ ...x, route: ROUTE[x.r.kind] || '#/my-money/profile' }) }));
      }))
      : h('div.list', {}, h('div.empty', {}, h('span.title', {}, 'No homework yet'), h('span.muted', {}, 'Mark any number Will email and it lands here.')))))];
}

// Snapshots with compare, notes, session settings, Fast Track accuracy and the look.
export const TUI = { compare: null };
export function sessionScreen(app, ctx, { fastTrackGap }) {
  const doc = ctx.store.doc;
  const s = doc.session;
  const snaps = doc.snapshots.filter(x => x.metrics);
  const pick = snaps.find(x => x.id === TUI.compare) || snaps[snaps.length - 1] || null;
  const now = keyNumbers(ctx.metrics());
  const rows = [['Net worth', 'netWorth', money], ['Liquid net worth', 'liquidNetWorth', money], ['Total debt', 'debtTotal', money], ['Monthly surplus', 'surplus', money], ['Savings rate', 'savingsRate', v => pct(v)], ['Months to FI', 'monthsToFi', v => `${v}`]];
  const note = (k, label, hint) => {
    const ta = h('textarea.notes-box', { placeholder: hint, 'aria-label': label, 'data-focus': `notes:${k}` }, s[k] || '');
    ta.onchange = () => ctx.store.setIn('session', [k], ta.value.trim() || undefined, label);
    return S.labelled(label, ta);
  };
  return [head('Coach tools', 'Session and settings'), h('div.grid2', {},
    h('div.card', {}, h('h3', {}, 'Snapshots'),
      h('div.row-line', { style: { gap: '8px' } }, S.button('Save snapshot', { kind: 'primary', iconName: 'camera', disabled: !app.hasClient, why: 'No client open', onClick: () => app.snapshot('Snapshot') }),
        snaps.length ? S.select(snaps.map(x => [x.id, `${x.label}, ${new Date(x.at).toLocaleDateString()}`]), pick?.id ?? null, v => { TUI.compare = v; app.render(); }, { label: 'Compare to', hint: 'Compare to', width: 240 }) : null),
      pick ? h('table.rows.compare', { style: { marginTop: '12px' } }, h('thead', {}, h('tr', {}, h('th', {}, ''), h('th.num', {}, 'Then'), h('th.num', {}, 'Now'), h('th.num', {}, 'Change'))),
        h('tbody', {}, rows.map(([label, k, f]) => {
          const a = pick.metrics[k], b = now[k];
          const d = a == null || b == null ? null : b - a;
          return h('tr', {}, h('td', {}, label), h('td.num', {}, a == null ? '' : f(a)), h('td.num', {}, b == null ? '' : f(b)),
            h('td.num', {}, d == null || Math.abs(d) < 1e-9 ? '' : `${d > 0 ? '▲' : '▼'} ${k === 'savingsRate' ? `${(Math.abs(d) * 100).toFixed(1)} pts` : k === 'monthsToFi' ? `${Math.abs(d)}` : money(Math.abs(d))}`));
        }))) : h('p.muted', { style: { marginTop: '12px' } }, 'No snapshot yet. End session saves one.')),
    h('div.card', {}, h('h3', {}, 'Notes'), h('div.stack', { style: { gap: '12px' } },
      note('privateNotes', 'Private notes', 'Only you see these'), note('sharedNotes', 'Shared notes', 'The client sees these'))),
    h('div.card', {}, h('h3', {}, 'This client'), h('div.stack', { style: { gap: '12px' } },
      h('div.row-line', {}, h('span.label', { style: { width: '150px' } }, 'Session length'), S.textInput(s.length ?? null, v => ctx.store.setIn('session', ['length'], v === null ? undefined : Number(v), 'Session length'), { hint: `${ctx.ref.defaults.sessionMinutes} min`, width: 110 })),
      h('div.row-line', {}, h('span.label', { style: { width: '150px' } }, 'Sessions planned'), S.stepper(s.planned ?? 6, v => ctx.store.setIn('session', ['planned'], v, 'Sessions planned'), { min: 1, max: 24, label: 'Sessions planned' })),
      h('div.row-line', {}, h('span.label', { style: { width: '150px' } }, 'Client view'), S.toggle([[false, 'Off'], [true, 'On']], !!app.prefs.clientView, v => app.setPref('clientView', v), { label: 'Client view' }), h('span.muted.small', {}, 'Hides coach-only items')),
      h('div.row-line', {}, h('span.label', { style: { width: '150px' } }, 'Satisfaction'), S.stepper(s.satisfaction ?? null, v => ctx.store.setIn('session', ['satisfaction'], v, 'Satisfaction'), { min: 1, max: 10, label: 'Satisfaction 1 to 10' })))),
    fastTrackGap(ctx),
    h('div.card', {}, h('h3', {}, 'Look'), h('div.stack', { style: { gap: '12px' } },
      h('div.row-line', {}, h('span.label', { style: { width: '90px' } }, 'Theme'), S.toggle(['System', 'Light', 'Dark'], app.prefs.theme === 'light' ? 'Light' : app.prefs.theme === 'dark' ? 'Dark' : 'System', v => app.setPref('theme', v.toLowerCase()), { label: 'Theme' })),
      h('div.row-line', {}, h('span.label', { style: { width: '90px' } }, 'Density'), S.toggle(['Comfortable', 'Compact'], app.prefs.density === 'compact' ? 'Compact' : 'Comfortable', v => app.setPref('density', v.toLowerCase()), { label: 'Density' })),
      h('div.row-line', {}, h('span.label', { style: { width: '90px' } }, 'Font'), S.toggle([['inter', 'Inter'], ['plex', 'IBM Plex Sans'], ['source', 'Source Sans 3']], app.prefs.font || 'inter', v => app.setPref('font', v), { label: 'Font' })))))];
}

// Discovery table (Mockup: DISCOVERY): each box fills its field as Roughly; Send to client file creates the client (R180).
export function discoveryScreen(app) {
  const vals = {};
  const money = (k, label) => h('div.discovery-row', { style: { display: 'contents' } }, h('span.label', {}, label), S.moneyInput(null, v => { vals[k] = v; }, { hint: 'Add amount', key: `disc:${k}` }));
  const text = (k, label, hint) => h('div.discovery-row', { style: { display: 'contents' } }, h('span.label', {}, label), S.textInput(null, v => { vals[k] = v; }, { hint, width: 360, key: `disc:${k}` }));
  const send = () => {
    document.querySelectorAll('.discovery input').forEach(i => i.dispatchEvent(new Event('change')));
    if (!vals.name) { S.toast('Add the client\'s name first.'); document.querySelector('[data-focus="disc:name"]')?.focus(); return; }
    app.newClientFromDiscovery(vals);
  };
  return [head('Discovery', 'The sales call table. Each box fills the matching field, marked Roughly'),
    h('div.card.discovery', {}, h('div.discovery-grid', {},
      text('name', 'Client name', 'First and last'),
      money('takeHome', 'Take-home a month'), money('rent', 'Rent a month'), money('debt', 'Total debt'), money('savings', 'Savings'),
      text('goal', 'Goal', 'In their words'), text('why', 'Why now', 'What prompted the call')),
    h('div.row-line', { style: { marginTop: '16px', gap: '10px' } }, S.button('Send to client file', { kind: 'primary', size: 'big', iconName: 'right', onClick: send }),
      h('span.muted', {}, 'Creates the client and opens Home in Prep.')),
    h('p.muted.small', { style: { marginTop: '16px' } }, 'The pre-call form the client fills from a link needs a server to receive answers, so it is a later phase.'))];
}
