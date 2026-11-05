// SPDX-License-Identifier: AGPL-3.0-only
// Coach tools behind the gear (build phase 10): revisit and homework lists, snapshots with compare, notes and
// settings, and the discovery table that turns a sales call into a client file.
import { h, clear, icon } from './dom.js';
import { debtRoute } from '../nav.js';
import * as S from './staples.js';
import { checksOf, defaultsInUse } from '../checks.js';
import { homeworkItems } from './report-ui.js';
import { homeworkText } from '../homework.js';
import { communityLinesToAdd } from '../community.js';
import { TIMER_MARKS, duration } from '../timer.js';
import { feedbackCard } from './report-this.js';
import { keyNumbers } from '../math/metrics.js';
import { statusOf } from '../records.js';
import { money, pct } from '../format.js';
import { setHomeworkStatus, setHomeworkPerson, setHomeworkOwner, joyOf, confidenceOf } from '../program.js';
import { HOMEWORK_STATUSES } from '../registry/program.js';
import { PERSONS, personLabels } from '../registry/couples.js';
import { JOY, CONFIDENCE } from '../registry/joy.js';

const head = (title, sub, ...right) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null), h('div.row-line', {}, ...right));
const ROUTE = { income: '#/cash-flow/income', benefit: '#/cash-flow/income', debt: '#/net-worth/debt', account: '#/net-worth/assets', asset: '#/net-worth/assets', coverage: '#/net-worth/protection', bill: '#/cash-flow/budget', milestone: '#/plan/goals', event: '#/plan/next-12-months' };
const DAY = 86400000;

// R061, F244: the next check date for every rough or aged number, from js/checks.js.
export function revisitList(ctx) {
  return checksOf(ctx.store.doc, ctx.ref, { now: ctx.now() }).map(c => ({ r: c.rec ?? { id: null }, label: c.label, status: c.status, next: c.next, due: c.due, why: c.why,
    route: c.guesses ? '#/cash-flow/budget' : c.rec.kind === 'debt' ? debtRoute(c.rec) : ROUTE[c.rec.kind] || '#/home/profile' }));
}

export function listsScreen(app, ctx) {
  const revisit = revisitList(ctx);
  const hw = homeworkItems(ctx);
  const fix = x => { app.go(x.route); requestAnimationFrame(() => { const row = document.querySelector(`tr[data-id="${x.r.id}"]`); row?.classList.add('highlight'); row?.querySelector('input')?.focus(); }); };
  const copyHomework = e => {
    const text = homeworkText(ctx.store.doc.client.name, hw);
    const fallback = () => { const ta = h('textarea.notes-box', { readonly: true }, text); S.popover(e.currentTarget, h('div.stack', {}, h('strong', {}, 'Copy and send'), ta), { width: 420 }); setTimeout(() => ta.select()); };
    try { navigator.clipboard.writeText(text).then(() => S.toast('Homework copied. Paste it into a message.'), fallback); } catch { fallback(); }
  };
  return [head('Coach tools', 'Lists'), h('div.grid2', {},
    h('div.section', {}, h('div.section-title', {}, h('h2', {}, 'Revisit list'), h('span.muted', {}, `${revisit.length}`)), revisit.length
      ? h('div.card.tool-list', {}, revisit.slice(0, 40).map(x => h('div.row-line', { style: { gap: '10px' } },
        h('span', { style: { flex: 1, fontWeight: 600 } }, x.label), S.statusTag(x.status),
        h('span.muted.small', { style: { minWidth: '92px' }, title: x.why }, x.due ? 'Due now' : `Check ${new Date(`${x.next}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`),
        S.button('Fix now', { size: 'small', onClick: () => fix(x) }))))
      : h('div.list', {}, h('div.empty', {}, h('span.title', {}, 'Nothing to revisit yet'), h('span.muted', {}, 'Rough and not-sure numbers land here.')))),
    h('div.section', {}, h('div.section-title', {}, h('h2', {}, 'Homework list'), h('span.spacer'), hw.some(x => x.owner !== 'coach') ? S.button('Send to client', { size: 'small', iconName: 'mail', onClick: copyHomework }) : null), hw.length
      ? h('div.card.tool-list', {}, homeworkGroups(app, ctx, hw, fix))
      : h('div.list', {}, h('div.empty', {}, h('span.title', {}, 'No homework yet'), h('span.muted', {}, "Tap I'll find it later on any number and it lands here, with where to look.")))),
    defaultsSection(app, ctx, fix))];
}
// Batch 7, item 9: two groups, the client's and the coach's. A coach item is "no field for this yet: make one and
// enter it"; it never goes out with Send to client. Items the coach made can be moved between the two.
function homeworkGroups(app, ctx, hw, fix) {
  const row = x => {
    const d = h('input', { type: 'date', value: x.due || '', 'aria-label': `Due date for ${x.label}` });
    const p = ctx.store.doc.profile;
    d.onchange = () => (x.r ? ctx.store.update(x.r.id, { homeworkDue: d.value || null }) : ctx.store.setDoc('profile', { laterDue: { ...(p.laterDue || {}), [x.profileKey ?? x.lifeKey]: d.value || null } }));
    return h('div.row-line', { style: { gap: '10px' } },
      h('span.stack', { style: { flex: 1, gap: '2px' } }, h('span', { style: { fontWeight: 600 } }, x.label), x.where ? h('span.muted.small', {}, `Where to find it: ${x.where}`) : null, x.from ? h('span.muted.small', {}, `From session ${Number(x.from.slice(1))}${x.program?.noteId ? ', from a parking-lot note' : ''}`) : null),
      // The status: the coach sets Client says done for now; a client's own I did this can set it later. Confirm happens in the review gate too.
      S.toggle(HOMEWORK_STATUSES.map(s => [s, s]), x.status, v => setHomeworkStatus(ctx.store, x.key, v || 'To do', { by: 'coach' }), { label: `${x.label} status` }),
      x.program ? S.toggle([['client', 'Client'], ['coach', 'Me']], x.owner, v => setHomeworkOwner(ctx.store, x.key, v), { label: `${x.label}: whose job` }) : null,
      x.program ? null : h('label.field', { style: { width: '160px' } }, d),
      x.program && ctx.couple ? S.toggle(PERSONS.map(p => [p, personLabels(ctx.store.doc)[p]]), x.person, v => setHomeworkPerson(ctx.store, x.key, v), { label: `${x.label} whose`, clearable: true }) : null, // F2
      x.program && !x.r ? null : S.button('Open', { size: 'small', onClick: () => (x.r ? fix({ ...x, route: x.r.kind === 'debt' ? debtRoute(x.r) : ROUTE[x.r.kind] || '#/home/profile' }) : app.go(x.lifeKey ? '#/net-worth/protection' : '#/home/profile')) }));
  };
  const theirs = hw.filter(x => x.owner !== 'coach'), mine = hw.filter(x => x.owner === 'coach');
  return [h('h3', {}, `For the client (${theirs.length})`), theirs.length ? theirs.map(row) : h('p.muted.small', {}, 'Nothing for the client.'),
    h('h3', { style: { marginTop: '12px' } }, `Mine (${mine.length})`), h('p.muted.small', {}, 'No field for these yet: make one and enter it. Never sent to the client.'), mine.length ? mine.map(row) : h('p.muted.small', {}, 'Nothing for me.')];
}
// Batch 7, item 12: every number the app filled in with a typical value, so a 25% card APR or a starter spending
// guess is never mistaken for a typed one. Fix now lands on the row; a typed number takes it off the list.
function defaultsSection(app, ctx, fix) {
  const list = defaultsInUse(ctx.store.doc, ctx.ref).map(x => ({ ...x, r: x.rec, route: x.rec.kind === 'debt' ? debtRoute(x.rec) : ROUTE[x.rec.kind] || '#/home/profile' }));
  const shown = x => (x.unit === 'pct' ? pct(x.value) : money(x.value));
  return h('div.section', {}, h('div.section-title', {}, h('h2', {}, 'Defaults in use'), h('span.muted', {}, `${list.length}`)), list.length
    ? h('div.card.tool-list', {}, list.slice(0, 40).map(x => h('div.row-line', { style: { gap: '10px' } },
      h('span', { style: { flex: 1, fontWeight: 600 } }, x.label), h('span.tag.guess', {}, `? ${shown(x)}`), h('span.muted.small', { style: { minWidth: '150px' } }, x.from),
      S.button('Fix now', { size: 'small', onClick: () => fix(x) }))), list.length > 40 ? h('p.muted.small', {}, `and ${list.length - 40} more`) : null)
    : h('div.list', {}, h('div.empty', {}, h('span.title', {}, 'No defaults in use'), h('span.muted', {}, 'Every number in the math was typed in or marked.'))));
}

// M10: how long onboarding took, for usability testing. Also in the export (session.timer).
function timerCard(ctx) {
  const t = ctx.store.doc.session?.timer || {};
  return h('div.card', {}, h('h3', {}, 'Onboarding timer'), h('p.muted.small', {}, 'For testing. Times are from the first Profile answer; the export includes them.'),
    h('table.rows.mini', {}, h('tbody', {}, TIMER_MARKS.map(([k, label]) => h('tr', {}, h('td', {}, label),
      h('td', {}, t[k] ? new Date(t[k]).toLocaleString() : h('span.muted', {}, 'Not yet')),
      h('td.num', {}, k === 'profileStarted' ? '' : duration(t.seconds?.[k])))))));
}
function setCommunity(ctx, on) {
  ctx.store.transaction('Community presets', () => {
    ctx.store.setIn('session', ['community'], on, 'Community presets');
    if (on) for (const l of communityLinesToAdd(ctx.store.records)) ctx.store.add('bill', l, { type: 'Yearly cost' });
  });
  S.toast(on ? 'Yom tov and Pesach are under yearly costs on the Budget, with blank amounts.' : 'Off. The lines it added stay; delete them on the Budget if not needed.', { undo: () => ctx.store.undo() });
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
      h('div.row-line', {}, h('span.label', { style: { width: '150px' } }, 'Client view'), S.toggle([[false, 'Off'], [true, 'On']], !!app.prefs.clientView, v => app.setPref('clientView', v), { label: 'Client view' }), h('span.muted.small', {}, 'Hides coach-only items')),
      h('div.row-line', {}, h('span.label', { style: { width: '150px' } }, 'Confidence and Joy'), (() => { const c = confidenceOf(ctx.store.doc), j = joyOf(ctx.store.doc); const w = (M, v) => (v.value != null ? `${M.label} ${v.value} of ${M.max}${v.partner != null ? ` (partner ${v.partner})` : ''}` : `${M.label} not asked yet`); return h('span', {}, `${w(CONFIDENCE, c)} · ${w(JOY, j)}`); })(), h('span.muted.small', {}, 'Asked on Home at the start of each session')), // F4, answer 164
      // Answer to 49: the one-holding-over-25% flag, on unless the coach turns it off for this client.
      h('div.row-line', {}, h('span.label', { style: { width: '150px' } }, 'Concentration flag'), S.toggle([[true, 'On'], [false, 'Off']], !s.concentrationOff, v => ctx.store.setIn('session', ['concentrationOff'], !v, 'Concentration flag'), { label: 'Concentration flag' }),
        h('span.muted.small', {}, 'Flags one holding or theme over 25% of an account')),
      // M9: community presets, off unless turned on for this client.
      h('div.row-line', {}, h('span.label', { style: { width: '150px' } }, 'Community presets'), S.toggle([[false, 'Off'], [true, 'On']], !!s.community, v => setCommunity(ctx, v), { label: 'Community presets' }),
        h('span.muted.small', {}, 'Yom tov and Pesach lines, a kosher grocery note, future tuition goals, maaser')),
      s.community ? h('div.row-line', {}, h('span.label', { style: { width: '150px' } }, 'Maaser'),
        S.toggle(['Take-home', 'Gross'], s.maaser?.basis ?? 'Take-home', v => ctx.store.setIn('session', ['maaser'], { ...(s.maaser || {}), basis: v }, 'Maaser'), { label: 'Maaser on' }),
        S.pctInput(s.maaser?.pct ?? null, v => ctx.store.setIn('session', ['maaser'], { ...(s.maaser || {}), pct: v }, 'Maaser'), { hint: 'Blank: 10' }),
        h('span.muted.small', {}, 'Shown on the Budget')) : null)),
    fastTrackGap(ctx),
    timerCard(ctx),
    feedbackCard(ctx),
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
      h('span.muted', {}, 'Creates the client and opens Home.')),
    h('p.muted.small', { style: { marginTop: '16px' } }, 'The pre-call form the client fills from a link needs a server to receive answers, so it is a later phase.'))];
}
