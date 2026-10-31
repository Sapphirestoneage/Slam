// Home (build phase 9): the session cockpit. Prep before the call, Live during, Wrap-up after, each with one
// main button. Answers: where is this client now, what are we doing today, what is the one next thing.
import { h, clear, icon } from './dom.js';
import * as S from './staples.js';
import { quickFill, canQuickFill } from './quickfill.js';
import { listCompletion } from './money-lists.js';
import { profileCompletion } from './profile.js';
import { firstLowDay } from './spending-ui.js';
import { homeworkItems, sendSummary, fiCard } from './report-ui.js';
import { next3, agenda } from '../plan.js';
import { keyNumbers } from '../math/metrics.js';
import { changeSince, statusOf, countsAsDone } from '../records.js';
import { money, pct } from '../format.js';

const head = (title, sub, ...right) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null), h('div.row-line', {}, ...right));
const ses = ctx => ctx.store.doc.session || {};
export const inSession = ctx => !!ses(ctx).startedAt && !(ses(ctx).endedAt > ses(ctx).startedAt);
const sessionNo = ctx => (ses(ctx).count || 0) + 1;
const isoDay = d => d.toISOString().slice(0, 10);

// Client strip: package tracking on every Home screen.
// One line; the next date and status are edited in a small box so they do not take a row of fields.
function clientStrip(app, ctx) {
  const s = ses(ctx);
  const nextText = s.next ? new Date(`${s.next}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'not set';
  const edit = S.iconButton('edit', 'Edit next session and status', () => {
    const next = h('input', { type: 'date', value: s.next || '', 'aria-label': 'Next session' });
    next.onchange = () => ctx.store.setIn('session', ['next'], next.value || undefined, 'Next session');
    S.popover(edit, h('div.stack', { style: { gap: '12px' } }, h('strong', {}, 'This client'),
      S.labelled('Next session', h(`label.field${s.next ? '.filled' : ''}`, { style: { width: '190px' } }, next)),
      S.labelled('Status', S.select(['Active', 'Maintenance', 'Paused'], s.state || 'Active', v => ctx.store.setIn('session', ['state'], v || 'Active', 'Client status'), { label: 'Client status', hint: 'Active', width: 190 })),
      S.button('Done', { kind: 'primary', onClick: S.closePop })), { width: 300 });
  }, { tiny: true });
  return h('div.client-strip', {},
    h('span.who', {}, ctx.store.doc.client.name || 'Client'),
    h('span.tag.plain', {}, `Session ${sessionNo(ctx)} of ${s.planned || 6}`),
    h('span.muted', {}, `Next: ${nextText}`), h('span.muted', {}, s.state || 'Active'),
    inSession(ctx) ? h('span.tag.good', {}, '● Session on') : null, edit);
}

// Exactly four numbers, one plain sentence (Mockup: Money in one line). Each opens its home.
export function moneyInOneLine(app, ctx) {
  const m = ctx.metrics();
  const fi = m.monthsToFi.value;
  const sentence = m.surplus.value !== null && fi !== null
    ? `You keep ${money(m.surplus.value)} a month and are on track for FI${m.inputs.age !== null ? ` at ${Math.floor(m.inputs.age + fi / 12)}` : ` in ${(fi / 12).toFixed(1)} years`}.`
    : m.surplus.value !== null && m.surplus.value < 0 ? `You spend ${money(-m.surplus.value)} a month more than comes in.` : null;
  return h('section.section', {}, h('div.section-title', {}, h('h2', {}, 'Money in one line')),
    sentence ? h('p', { style: { fontSize: '1.125rem', fontWeight: 600 } }, sentence) : null,
    m.inputs.spendingSource === 'lines' && m.inputs.guessLines ? h('div.banner-inline.soft', {}, `Spending includes ${m.inputs.guessLines} starter ${m.inputs.guessLines === 1 ? 'guess' : 'guesses'} at the high end (${money(m.inputs.guessTotal)} a month), so the surplus looks low until they are reviewed.`,
      S.button('Review on Budget', { iconName: 'right', onClick: () => app.go('#/spending/budget') })) : null,
    S.summaryStrip(ctx, [
      { label: 'Net worth', result: m.netWorth, key: 'netWorth', home: '#/report/overview' },
      { label: 'Monthly surplus', result: m.surplus, key: 'surplus', home: '#/spending/budget' },
      { label: 'Savings rate', result: m.savingsRate, key: 'savingsRate', home: '#/report/overview' },
      fiCard(ctx, m) && { ...fiCard(ctx, m), home: '#/plan/goals' }]));
}

// ---------- Prep ----------
export function prepScreen(app, ctx) {
  const doc = ctx.store.doc;
  const snap = ctx.store.lastSnapshot();
  const now = keyNumbers(ctx.metrics());
  const changes = snap ? [['Net worth', 'netWorth', false], ['Debt', 'debtTotal', true], ['Savings rate', 'savingsRate', false], ['Surplus', 'surplus', false]]
    .map(([label, k, lowerGood]) => ({ label, k, lowerGood, c: changeSince(now, snap, k) })).filter(x => x.c && x.c.direction !== 'same') : [];
  const fmt = (k, d) => (k === 'savingsRate' ? `${(Math.abs(d) * 100).toFixed(1)} pts` : money(Math.abs(d)));
  const homework = homeworkItems(ctx).length;
  const due = app.dueForCheck().length;
  const notes = doc.parking.filter(n => !n.filedTo).length;
  const low = firstLowDay(ctx);
  const card = (label, big, sub, onClick, linkText) => h('div.metric', {}, h('span.label', {}, label), h('div.big', { style: { fontSize: String(big).length > 6 ? '1.0625rem' : '2rem' } }, big),
    sub ? h('span.muted.small', {}, sub) : null, onClick ? h('a', { href: '#', onclick: e => { e.preventDefault(); onClick(); } }, linkText) : null);
  return [clientStrip(app, ctx),
    inSession(ctx) ? h('div.banner-inline.good', {}, 'The session is on.', S.button('Back to Live', { iconName: 'right', onClick: () => app.go('#/home/live') })) : null,
    head('Home', `Prep for ${doc.client.name || 'this client'}`, S.button(inSession(ctx) ? 'Back to Live' : 'Start session', { kind: 'primary', size: 'big', onClick: () => startSession(app, ctx) })),
    moneyInOneLine(app, ctx),
    h('div.strip', {},
      card('What changed since last time', !snap ? 'Nothing yet' : changes.length ? `${changes.length} ${changes.length === 1 ? 'number' : 'numbers'}` : 'No change',
        !snap ? 'No snapshot to compare with' : changes.map(x => `${x.label} ${x.c.direction === 'up' ? '▲' : '▼'} ${fmt(x.k, x.c.diff)}`).join(' · ') || `Since ${new Date(snap.at).toLocaleDateString()}`, snap ? () => app.go('#/report/history') : null, 'Open history'),
      card('Open homework', homework || 'None', homework ? 'Numbers marked Will email' : null, () => app.go('#/tools/lists'), 'Open the list'),
      card('Due for a check', due || 'None', due ? 'Rough or aged numbers' : null, () => app.go('#/tools/lists'), 'Open the list'),
      card('Parking lot notes', notes || 'None', notes ? 'Not filed yet' : null, () => app.openParking(), 'Open the parking lot')),
    low ? h('div.banner-inline', {}, '⚠ ', `Cash dips below ${money(low.low)} on ${low.label}: ${money(low.balance)}.`, S.button('Open the calendar', { iconName: 'right', onClick: () => app.go('#/spending/calendar') })) : null, // R096
    ctx.gates().betweenJobs ? S.summaryStrip(ctx, [{ label: 'Runway (between jobs)', result: ctx.metrics().runwayMonths, render: r => `${r.value.toFixed(1)} months`, home: '#/my-money/assets' }]) : null, // R006
    S.moreBlock('home:agenda', () => agendaEditor(ctx), { label: "Edit today's agenda" }),
    completionSlim(app, ctx)];
}
function startSession(app, ctx) {
  if (!inSession(ctx)) {
    ctx.store.transaction('Start session', () => {
      ctx.store.setIn('session', ['startedAt'], new Date().toISOString());
      ctx.store.setIn('session', ['guide'], true); // Guide me turns on (R076)
    });
  }
  app.go('#/home/live');
}
function agendaEditor(ctx) {
  const steps = agenda(ctx.store.doc, ctx.ref, { now: ctx.now() }).steps;
  const save = list => ctx.store.setIn('session', ['agenda'], list.map(s => ({ id: s.id, name: s.name, route: s.route })), 'Agenda');
  const name = h('input', { placeholder: 'Add a step', 'aria-label': 'Add a step' });
  const add = () => { const v = name.value.trim(); if (!v) return; save([...steps, { id: `c${Date.now().toString(36)}`, name: v, route: '#/home/live' }]); };
  name.onkeydown = e => { if (e.key === 'Enter') add(); };
  return h('div.card', { style: { marginTop: '8px' } }, h('div.stack', { style: { gap: '6px' } },
    steps.map((s, i) => h('div.row-line', { style: { gap: '8px' } }, h('strong', { style: { minWidth: '24px' } }, `${i + 1}.`), h('span', { style: { flex: 1 } }, s.name),
      S.iconButton('left', 'Move up', () => { const l = [...steps]; if (i) { [l[i - 1], l[i]] = [l[i], l[i - 1]]; save(l); } }, { tiny: true, disabled: !i }),
      S.iconButton('trash', 'Remove step', () => save(steps.filter((_, k) => k !== i)), { tiny: true }))),
    h('div.row-line', { style: { gap: '8px' } }, h('label.field', { style: { width: '260px' } }, name), S.button('Add step', { iconName: 'plus', onClick: add }),
      ctx.store.doc.session.agenda ? S.button('Back to the usual four', { onClick: () => ctx.store.setIn('session', ['agenda'], undefined, 'Agenda') }) : null)));
}

// One slim bar so Home stays calm; By section opens the two bars per section.
export function completionParts(ctx) {
  const doc = ctx.store.doc;
  const m = ctx.metrics();
  const p = profileCompletion(doc);
  const parts = [
    ['Profile', p.core, '#/my-money/profile'],
    ['Income', listCompletion(ctx, r => r.kind === 'income', ['amount']).core, '#/my-money/income'],
    ['Debt', ctx.gates().areas.debt === false ? { done: 1, of: 1 } : listCompletion(ctx, r => r.kind === 'debt', ['balance', 'apr']).core, '#/my-money/debt'],
    ['Assets', listCompletion(ctx, r => r.kind === 'account' || r.kind === 'asset', r => [r.kind === 'asset' ? 'value' : 'balance']).core, '#/my-money/assets'],
    ['Spending', (() => { const rows = ctx.visible(r => r.kind === 'bill' && r.status !== 'Not for me'); return { done: rows.filter(r => countsAsDone(statusOf(r, 'amount')) && r.status !== 'Not sure').length, of: rows.length }; })(), '#/spending/budget'],
    ['Plan', { done: [m.fiNumber.value != null, m.monthsToFi.value != null || m.monthsToFi.never, ctx.visible(r => r.kind === 'milestone').length > 0].filter(Boolean).length, of: 3 }, '#/plan/goals'],
  ];
  const tot = parts.reduce((a, [, c]) => ({ done: a.done + (c.of ? c.done / c.of : 0), of: a.of + 1 }), { done: 0, of: 0 });
  return { parts, pct: tot.of ? tot.done / tot.of : 0 };
}
function completionSlim(app, ctx) {
  const c = completionParts(ctx);
  const bar = (x, w) => h('div.progress', { style: w ? { width: w } : null, role: 'progressbar', 'aria-valuenow': Math.round(x * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('span', { style: { width: `${Math.round(x * 100)}%` } }));
  return h('div.card.completion-slim', {}, h('div.slim-bar', {}, h('strong', {}, `Picture filled in: ${Math.round(c.pct * 100)}%`), bar(c.pct)),
    S.moreBlock('home:completion', () => h('div.section-bars', {}, c.parts.map(([name, x, href]) => h('div.row-line', {}, h('span', { style: { minWidth: '80px', fontWeight: 600 } }, name), bar(x.of ? x.done / x.of : 0),
      h('span.muted.small', {}, x.of ? `${x.done} of ${x.of}` : 'Nothing yet'), x.of && x.done >= x.of ? h('span.tag.good', {}, '✓') : h('a', { href }, "What's next ›")))), { label: 'By section' }));
}

// ---------- Live ----------
export function liveScreen(app, ctx) {
  const doc = ctx.store.doc;
  const a = agenda(doc, ctx.ref, { now: ctx.now() });
  const length = doc.session.length || ctx.ref.defaults.sessionMinutes;
  const started = doc.session.startedAt ? Date.parse(doc.session.startedAt) : null;
  const left = started && inSession(ctx) ? Math.round(length - (Date.now() - started) / 60000) : null;
  const n3 = next3(doc, ctx.ref, { now: ctx.now() }).top;
  const nextStep = () => {
    // Guide me (R076): the next field to ask, in curriculum order.
    const target = a.current?.route || n3[0]?.route || '#/plan/goals';
    app.go(target);
  };
  return [clientStrip(app, ctx),
    head('Home', inSession(ctx) ? 'Live: the session is on' : 'Live: start the session from Prep',
      left != null ? h('span.time-left', {}, left >= 0 ? `${left} min left` : `${-left} min over`) : null,
      S.button('Next step', { kind: 'primary', size: 'big', iconName: 'right', onClick: nextStep })),
    h('div.agenda', {}, a.steps.map((s, i) => h(`button.step${s.done ? '.done' : ''}${a.current?.id === s.id ? '.current' : ''}`, { type: 'button', onclick: () => app.go(s.route) },
      h('span.step-n', {}, `${i + 1}`), h('span.step-name', {}, s.name), h('span.muted.small', {}, s.done ? 'Done' : a.current?.id === s.id ? 'Now' : 'Up next')))),
    h('div.section-title', {}, h('h2', {}, 'Next 3 numbers'), h('span.muted', {}, 'Ranked by how much they move the FI date')),
    n3.length ? h('div.next3', {}, n3.map((c, i) => next3Card(app, ctx, c, i))) : h('div.card', {}, h('p.muted', {}, 'Every number that moves the FI date is in. Nice.')),
    moneyInOneLine(app, ctx),
    h('div.row-line', { style: { marginTop: '8px' } }, S.button('End session', { iconName: 'check', onClick: () => app.go('#/home/wrap-up') }), S.button('Open the parking lot', { iconName: 'note', onClick: () => app.openParking() }))];
}
function next3Card(app, ctx, c, i) {
  const big = i === 0;
  let fill = null;
  if (c.recId) {
    const r = ctx.store.get(c.recId);
    const save = v => ctx.store.update(c.recId, { [c.field]: v, ...(r.status === 'Not sure' || r.status === 'Not now' || r.status === 'Will email' ? { status: null } : {}) });
    const cur = c.field in r && c.field !== 'values' ? r[c.field] : r.values[c.field];
    fill = c.kind === 'pct' ? S.pctInput(cur ?? null, save, { hint: 'Add APR', key: `n3:${c.recId}:${c.field}` }) : S.moneyInput(cur ?? null, save, { hint: cur != null ? 'Confirm' : 'Add amount', key: `n3:${c.recId}:${c.field}` });
  } else if (c.quick && canQuickFill(c.quick)) {
    fill = S.button('Fill it here', { kind: big ? 'primary' : 'secondary', iconName: 'plus', onClick: e => quickFill(ctx, e.currentTarget, c.quick) });
  }
  return h(`div.n3${big ? '.big' : ''}`, {}, h('span.n3-rank', {}, `#${i + 1}`), h('span.n3-name', {}, c.label),
    h('span.why', {}, c.why || (c.moves != null ? `Moves the FI date by about ${Math.round(c.moves)} months` : c.status === 'Not sure' ? 'A guess for now' : 'Still open')),
    fill, h('a', { href: c.route }, 'Open where it lives'));
}

// ---------- Wrap-up ----------
export function wrapScreen(app, ctx) {
  const doc = ctx.store.doc;
  const s = doc.session;
  const started = s.startedAt || null;
  const ended = s.endedAt && (!started || s.endedAt > started);
  const snap = ctx.store.lastSnapshot();
  const hw = homeworkItems(ctx);
  const suggested = s.next || isoDay(new Date(Date.now() + 14 * 86400000));
  const next = h('input', { type: 'date', value: suggested, 'aria-label': 'Next session date' });
  next.onchange = () => ctx.store.setIn('session', ['next'], next.value || undefined, 'Next session');
  const items = [
    { what: `Homework set (${hw.length})`, done: !!s.homeworkAt && (!started || s.homeworkAt >= started), detail: hw.length ? hw.map(x => x.label).join(', ') : 'Nothing marked Will email', act: S.button('Open the list', { onClick: () => app.go('#/tools/lists') }) },
    { what: 'Snapshot saved', done: !!snap && (!started || snap.at >= started), detail: snap ? `Last: ${snap.label}, ${new Date(snap.at).toLocaleString()}` : 'Freezes today\'s numbers', act: S.button('Save snapshot', { iconName: 'camera', onClick: () => app.snapshot(`Session ${sessionNo(ctx)}`) }) },
    { what: 'One-pager ready', done: !!s.onePagerAt && (!started || s.onePagerAt >= started), detail: 'Key stats, to-dos, goals, strengths and struggles', act: S.button('Open one-pager', { onClick: () => app.go('#/report/one-pager') }) },
    { what: 'Next session booked', done: !!s.next && s.next >= isoDay(new Date()), detail: null, act: h(`label.field${s.next ? '.filled' : ''}`, { style: { width: '170px' } }, next) },
  ];
  const end = () => {
    ctx.store.transaction('End session', () => {
      const at = new Date().toISOString();
      ctx.store.setIn('session', ['homework'], hw.map(x => x.label));
      ctx.store.setIn('session', ['homeworkAt'], at);
      ctx.store.setIn('session', ['onePagerAt'], at);
      ctx.store.setIn('session', ['next'], next.value || suggested);
      ctx.store.setIn('session', ['endedAt'], at);
      ctx.store.setIn('session', ['guide'], false);
      ctx.store.setIn('session', ['count'], (s.count || 0) + 1);
    });
    app.snapshot(`End of session ${s.count || 0}`); // R181: snapshot saved, one-pager filled, homework built
    try { app.exportNow(); } catch { /* downloads can be blocked; the reminder stays */ } // R151
  };
  return [clientStrip(app, ctx), head('Home', ended ? 'Wrap-up: done' : 'Wrap-up',
    ended ? S.button('Send summary', { kind: 'primary', size: 'big', iconName: 'mail', onClick: e => sendSummary(ctx, e.currentTarget) })
      : S.button('End session', { kind: 'primary', size: 'big', iconName: 'check', onClick: end })),
  ended ? h('div.banner-inline.good', {}, icon('check'), ` Session ${s.count} saved. A backup file was downloaded. Send the summary when ready.`) : h('p.muted', {}, 'End session does all four at once, then shows Send summary.'),
  h('div.checklist', {}, items.map(i => h(`div.check-item${i.done || ended ? '.done' : ''}`, {}, h('span.box', {}, i.done || ended ? icon('check') : null),
    h('div', { style: { flex: 1 } }, h('div.what', {}, i.what), i.detail ? h('div.muted.small', {}, i.detail) : null), i.act))),
  h('div.card', {}, h('div.row-line', { style: { gap: '12px' } }, h('strong', {}, 'Money feeling, 1 to 10'),
    S.stepper(s.feelings?.[s.count || 0] ?? null, v => ctx.store.setIn('session', ['feelings', String(s.count || 0)], v, 'Money feeling'), { min: 1, max: 10, label: 'Money feeling', key: 'feeling' }),
    h('span.muted.small', {}, 'Asked at the end of each session'))),
  ];
}
