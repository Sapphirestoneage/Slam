// SPDX-License-Identifier: AGPL-3.0-only
// Home (Phase 3): one screen for the program. The session strip (Session N of 12; Start session switches the session
// on, End session saves the snapshot), the path of twelve nodes with the current one open to its checklist, the
// Picture % with its pace, the three next small things, and money in one line with the FI date locked or unlocked.
// A card with nothing to say stays off the screen.
import { h, clear, icon } from './dom.js';
import { paydayOf } from '../payday.js';
import * as S from './staples.js';
import { firstLowDay } from './spending-ui.js';
import { homeworkItems, sendSummary, fiCard, netWorthChart } from './report-ui.js';
import { PUI } from './plan-ui.js';
import { soWhat } from '../sowhat.js';
import { changeSince } from '../records.js';
import { programOf, startSession, endSession, inSession, sessionOf, snapshotNumbers, day0Report } from '../program.js';
import { SESSIONS, MONEY_DATES, levelWord } from '../registry/program.js';
import { ratingTag } from './scorecard-ui.js';
import { money, pct } from '../format.js';

const head = (title, sub, ...right) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null), h('div.row-line', {}, ...right));
const isoDay = d => d.toISOString().slice(0, 10);
export const HUI = { open: null }; // the path node whose checklist is open (null: the current session)
// Where an auto checklist item is worked on (Accounts set up: About you first, until it says what applies).
const ITEM_ROUTE = { accountsSetUp: '#/net-worth/assets', topLine: null, moneyInOneLine: '#/cash-flow/income', day0: null, bigCategories: '#/cash-flow/budget', goalsNamed: '#/plan/goals', fooStep: '#/plan/foo', monthOfActuals: '#/cash-flow/close', keyNumbersLocked: null, picture90: null,
  shortGoals: '#/plan/goals', longGoals: '#/plan/goals', allRated: '#/plan/scorecard', holesRanked: '#/plan/scorecard', fooConfirmed: '#/plan/scorecard', top3Chosen: '#/plan/scorecard', holeFilled: '#/plan/scorecard', day0Compared: null, rescored: '#/plan/scorecard', nextChapter: null, planNotes: null, reviewDate: null, moneyDate: null };

export function homeScreen(app, ctx) {
  const doc = ctx.store.doc;
  const P = programOf(doc, ctx.ref, { now: ctx.now(), flags: app.flags });
  const open = P.sessions.find(s => s.id === HUI.open) || P.current;
  const low = firstLowDay(ctx);
  return [sessionStrip(app, ctx, P),
    endedLine(app, ctx, P),
    pathRow(app, P, open),
    checklistCard(app, ctx, P, open),
    pictureCard(ctx, P),
    P.afterIntake ? holesCard(app, ctx, P) : null,
    filledCard(ctx, P),
    P.afterIntake && P.scorecard.rated === P.scorecard.of && !P.scorecard.holes.length ? nextChapterCard(ctx) : null,
    nextThings(app, ctx, P),
    moneyInOneLine(app, ctx, P.m),
    P.inSession ? wrapUp(app, ctx, P) : null,
    paydayCard(app, ctx),
    openItems(app, ctx),
    low ? h('div.banner-inline', {}, '⚠ ', `Cash dips below ${money(low.low)} on ${low.label}: ${money(low.balance)}.`, S.button('Open the calendar', { iconName: 'right', onClick: () => app.go('#/cash-flow/calendar') })) : null, // R096
    ctx.gates().betweenJobs ? S.summaryStrip(ctx, [{ label: 'Runway (between jobs)', result: P.m.runwayMonths, render: r => `${r.value.toFixed(1)} months`, home: '#/net-worth/assets' }]) : null, // R006
    day0Card(ctx, P),
    netWorthOverTime(app, ctx)];
}

// ---------- The session strip ----------
function sessionStrip(app, ctx, P) {
  const doc = ctx.store.doc, s = sessionOf(doc);
  const next = h(`input${s.next ? '' : '.no-date'}`, { type: 'date', value: s.next || '', 'aria-label': 'Next session', 'data-focus': 'strip:next' });
  next.onchange = () => ctx.store.setIn('session', ['next'], next.value || undefined, 'Next session');
  const length = s.length || ctx.ref.defaults.sessionMinutes;
  const left = P.inSession ? Math.round(length - (Date.now() - Date.parse(s.startedAt)) / 60000) : null;
  const nextStep = () => { // Guide me (R076): the first open item of this session, else the next small thing
    const item = P.current.items.find(i => !i.done && ITEM_ROUTE[SESSIONS[P.n - 1].items.find(b => b.id === i.id)?.auto]);
    const target = (item ? ITEM_ROUTE[SESSIONS[P.n - 1].items.find(b => b.id === item.id).auto] : null) || P.next[0]?.route || '#/plan/goals';
    PUI.reveal = target === '#/plan/goals';
    app.go(target);
  };
  const start = () => { const r = startSession(ctx.store, ctx.ref, { now: ctx.now(), flags: app.flags }); HUI.open = null; if (r.target) S.toast(`This session's hole: ${P.scorecard.areas.find(a => a.id === r.target)?.name}.`); app.render(); };
  return h('div.card.session-strip', {},
    h('span.who', {}, doc.client.name || 'Client'),
    h('a', { href: '#/home/profile' }, 'About you ›'),
    h('span.tag.plain', {}, P.graduated ? 'Graduated · 12 of 12' : `Session ${P.n} of ${SESSIONS.length} · ${P.current.name}`),
    P.inSession ? h('span.tag.good', {}, '● Session on') : null,
    left != null ? h('span.time-left', {}, left >= 0 ? `${left} min left` : `${-left} min over`) : null,
    h('span.row-line', { style: { gap: '6px' } }, h('span.label', {}, 'Next:'), h(`label.field${s.next ? '.filled' : ''}`, { style: { width: '170px' } }, next)),
    S.select(['Active', 'Maintenance', 'Paused'], s.state || 'Active', v => ctx.store.setIn('session', ['state'], v || 'Active', 'Client status'), { label: 'Client status', hint: 'Active', width: 150 }),
    h('span.spacer'),
    // Answer 90: focus mode (core columns only) is on by default; this shows every field mid-session, and back.
    P.inSession && s.guide ? S.checkbox('Show all fields', !!s.allFields, v => ctx.store.setIn('session', ['allFields'], v, v ? 'Show all fields' : 'Focus mode'), { key: 'home:all-fields' }) : null,
    P.inSession ? [S.button('End session', { iconName: 'check', onClick: () => end(app, ctx, P) }), S.button('Next step', { kind: 'primary', size: 'big', iconName: 'right', onClick: nextStep })]
      : S.button('Start session', { kind: 'primary', size: 'big', onClick: start, disabled: P.graduated, why: P.graduated ? 'The program is complete' : null }));
}
// End (R181): snapshot (Day 0 the first time), homework, one-pager, next date, a backup file; then Send summary.
function end(app, ctx, P) {
  const hw = homeworkItems(ctx);
  const s = sessionOf(ctx.store.doc);
  const r = endSession(ctx.store, ctx.ref, { homework: hw.map(x => x.label), next: s.next || isoDay(new Date(Date.now() + 14 * 86400000)), now: ctx.now(), flags: app.flags });
  app.saveNow();
  try { app.exportNow({ quiet: true }); } catch { /* downloads can be blocked; the reminder stays */ } // R151
  HUI.open = null;
  S.toast(r.first ? 'Session 1 saved, with the Day 0 snapshot.' : `Session ${r.n} saved. Snapshot taken.`);
  app.render();
}
function endedLine(app, ctx, P) {
  const s = sessionOf(ctx.store.doc);
  if (P.inSession || !s.endedAt || !s.count) return null;
  const n = s.count;
  return h('div.banner-inline.good', {}, icon('check'), ` Session ${n} saved${n === 1 ? ' with the Day 0 snapshot' : ''}. A backup file was downloaded.`,
    S.button('Send summary', { kind: 'primary', iconName: 'mail', onClick: e => sendSummary(ctx, e.currentTarget) }),
    S.moreBlock('home:feeling', () => h('div.row-line', { style: { gap: '12px' } }, h('strong', {}, 'Money feeling, 1 to 10'),
      S.stepper(s.feelings?.[n] ?? null, v => ctx.store.setIn('session', ['feelings', String(n)], v, 'Money feeling'), { min: 1, max: 10, label: 'Money feeling', key: 'feeling' })), { label: 'Money feeling' }));
}

// ---------- The path and the open node's checklist ----------
function pathRow(app, P, open) {
  return h('div.path', { role: 'list', 'aria-label': 'The 12-session program' }, P.sessions.map(s => h(`button.node.${s.status}${s.id === open.id ? '.open' : ''}`, {
    type: 'button', role: 'listitem', 'aria-pressed': String(s.id === open.id), 'aria-label': `Session ${s.n}, ${s.name}: ${s.status === 'done' ? 'done' : s.status === 'current' ? 'this session' : 'next'}`,
    title: `${s.n}. ${s.name}`, onclick: () => { HUI.open = s.id; app.render(); } },
  h('span.n', {}, s.status === 'done' ? '✓' : String(s.n)), h('span.name', {}, s.name))));
}
function checklistCard(app, ctx, P, s) {
  const tick = (iid, v) => ctx.store.setIn('program', ['checks', s.id, iid], v || undefined, 'Checklist');
  const auto = id => SESSIONS[s.n - 1].items.find(b => b.id === id)?.auto ?? null;
  const routeOf = key => (key === 'accountsSetUp' && P.picture.items.find(it => it.id === 'areas')?.level === 0 ? '#/home/profile' : ITEM_ROUTE[key]);
  const items = s.items.map(i => h(`div.check-item${i.done ? '.done' : ''}`, {},
    i.auto ? h('span.box', { 'aria-hidden': 'true' }, i.done ? icon('check') : null) : h('input', { type: 'checkbox', checked: i.done, 'aria-label': i.label, onchange: e => tick(i.id, e.target.checked) }),
    h('div', { style: { flex: 1 } }, h('div.what', {}, i.label, i.detail ? h('span.muted', {}, ` · ${i.detail}`) : null), i.auto ? h('div.auto', {}, i.done ? 'From the numbers' : 'Ticks itself from the numbers') : null),
    i.key === 'fooConfirmed' && !i.done && P.scorecard.here != null ? S.button(`Confirm step ${P.scorecard.here}`, { size: 'small', iconName: 'check', onClick: () => { ctx.store.setIn('program', ['fooConfirmed'], P.scorecard.here, 'FOO step'); S.toast(`FOO step ${P.scorecard.here} confirmed.`); } }) : null,
    i.key === 'holeFilled' && s.target ? h('a', { href: s.target.route }, 'Open where it lives ›') : i.auto && !i.done && routeOf(auto(i.id)) ? h('a', { href: routeOf(i.key) }, 'Open ›') : null));
  const word = s.status === 'done' ? 'Done' : s.status === 'current' ? 'This session' : 'Up next';
  return h('div.card.session-card', {},
    h('div.row-line', { style: { gap: '10px' } }, h('h2', {}, `Session ${s.n} · ${s.name}`), h(`span.tag.${s.done ? 'good' : 'plain'}`, {}, s.done ? '✓ Done when met' : `${s.items.filter(i => i.done).length} of ${s.items.length}`), h('span.muted', {}, word)),
    h('div.checklist', { style: { marginTop: '10px', marginBottom: 0 } }, items),
    s.id === 'S12' ? gamePlan(ctx) : null,
    s.items.some(i => i.key === 'nextChapter') ? nextChapterCard(ctx, { inside: true }) : null,
    S.moreBlock(`home:edit:${s.id}`, () => editSession(ctx, s), { label: 'Edit this session' }),
    s.id === 'S9' && !P.day0 ? h('p.muted.small', { style: { marginTop: '8px' } }, 'The Day 0 vs now report appears here once session 1 has ended.') : null);
}
// A placeholder session: its name and checklist, kept in the client file.
function editSession(ctx, s) {
  const save = patch => ctx.store.setIn('program', ['sessions', s.id], { name: s.name, items: s.items.map(i => ({ id: i.id, label: i.label })), ...patch }, 'Session');
  const name = h('input', { value: s.name, 'aria-label': 'Session name' });
  name.onchange = () => save({ name: name.value.trim() || SESSIONS[s.n - 1].name });
  const add = h('input', { placeholder: 'Add an item', 'aria-label': 'Add an item' });
  const addIt = () => { const v = add.value.trim(); if (!v) return; save({ items: [...s.items.map(i => ({ id: i.id, label: i.label })), { id: `c${Date.now().toString(36)}`, label: v }] }); };
  add.onkeydown = e => { if (e.key === 'Enter') addIt(); };
  return h('div.card', { style: { marginTop: '8px' } }, h('div.stack', { style: { gap: '8px' } },
    h('div.row-line', {}, h('span.label', { style: { width: '90px' } }, 'Name'), h('label.field.filled', { style: { width: '260px' } }, name)),
    s.items.map(i => h('div.row-line', { style: { gap: '8px' } }, h('span', { style: { flex: 1 } }, i.label),
      S.iconButton('trash', `Remove ${i.label}`, () => save({ items: s.items.filter(x => x.id !== i.id).map(x => ({ id: x.id, label: x.label })) }), { tiny: true }))),
    h('div.row-line', { style: { gap: '8px' } }, h('label.field', { style: { width: '260px' } }, add), S.button('Add item', { iconName: 'plus', onClick: addIt }),
      ctx.store.doc.program?.sessions?.[s.id] ? S.button('Back to the usual', { onClick: () => ctx.store.setIn('program', ['sessions', s.id], undefined, 'Session') }) : null)));
}

// ---------- The picture and its pace; after intake, the areas Strong or OK ----------
const bar = (x, { wide = false, label = 'Picture filled in' } = {}) => h(`div.progress${wide ? '.wide' : ''}`, { role: 'progressbar', 'aria-valuenow': Math.round(x * 100), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': label }, h('span', { style: { width: `${Math.round(x * 100)}%` } }));
function pictureCard(ctx, P) {
  const pace = P.pace;
  const sc = P.scorecard;
  const paceTag = h(`span.tag.pace-tag.${pace.word === 'Ahead' ? 'ahead' : pace.word === 'On track' ? 'ontrack' : 'catchup'}`, {}, pace.word);
  if (P.afterIntake) { // the picture is in: now the areas count
    return h('div.card.picture-card', {},
      h('div.bar-row', {}, h('span.pct', {}, `${sc.okCount} of ${sc.of} areas Strong or OK`), bar(sc.of ? sc.okCount / sc.of : 0, { wide: true, label: 'Areas Strong or OK' }),
        h('span.muted', {}, P.day0Ok != null ? `Day 0: ${P.day0Ok}` : 'Day 0: not scored yet', sc.unrated.length ? ` · ${sc.unrated.length} not rated yet` : '', sc.holes.length ? ` · ${sc.holes.length} ${sc.holes.length === 1 ? 'hole' : 'holes'}` : ' · no hole left'),
        h('a', { href: '#/plan/scorecard' }, 'Scorecard ›')),
      h('div.row-line', { style: { gap: '10px', marginTop: '6px' } }, h('span.muted.small', {}, `Picture ${pace.points}%`), paceTag, h('span.muted.small', {}, pace.text)));
  }
  return h('div.card.picture-card', {},
    h('div.bar-row', {}, h('span.pct', {}, `Picture ${pace.points}%`), bar(P.picture.pct, { wide: true }),
      paceTag, h('span.muted', {}, pace.text)),
    S.moreBlock('home:sections', () => h('div.section-bars', {}, P.picture.sections.map(s => h('div.row-line', {}, h('span', { style: { minWidth: '80px', fontWeight: 600 } }, s.name), bar(s.pct ?? 0),
      h('span.muted.small', {}, `${Math.round((s.pct ?? 0) * 100)}% · ${s.items.length} ${s.items.length === 1 ? 'number' : 'numbers'}`),
      s.pct >= 1 ? h('span.tag.good', {}, '✓') : h('a', { href: s.route }, 'Open ›')))), { label: 'By section' }));
}

// ---------- The holes (after intake): the top three, ranked, each with its payoff in the money view ----------
function holesCard(app, ctx, P) {
  const sc = P.scorecard;
  if (!sc.holes.length) return null;
  const top = sc.holes.slice(0, 3);
  return h('div.card.holes-card', {}, h('div.row-line', { style: { gap: '10px' } }, h('h2', {}, 'Top holes'), h('span.muted', {}, 'Before your FOO step first, then best return'), h('span.spacer'), S.button('Open the Scorecard', { iconName: 'right', onClick: () => app.go('#/plan/scorecard') })),
    h('div.holes-list', {}, top.map(hl => h('div.hole-line', {}, h('span.rank', {}, `#${hl.rank}`), h('strong', {}, hl.name), hl.chosen ? h('span.tag.plain', {}, 'In the plan') : null,
      h('span.muted.small', {}, hl.reason),
      h('span.spacer'),
      hl.payoff ? h('span.row-line', { style: { gap: '6px' } }, S.amount(ctx, hl.payoff.value), h('span.muted.small', {}, `a year${hl.fiDays != null ? ` · ${hl.fiDays.toFixed(1)} FI days` : ''} · ${hl.effort} h`)) : h('span.muted.small', {}, 'Add a payoff on the Scorecard')))));
}
// Holes filled: before and after, and the FI days gained.
function filledCard(ctx, P) {
  if (!P.filled.length) return null;
  return h('div.card', {}, h('div.row-line', { style: { gap: '10px' } }, h('h2', {}, 'Holes filled'), h('span.muted', {}, 'Since the snapshot that still had them')),
    h('div.holes-list', {}, P.filled.map(f => h('div.hole-line', {}, h('strong', {}, f.name), ratingTag(f.from), h('span.muted', {}, '→'), ratingTag(f.to),
      h('span.muted.small', {}, `since ${f.since}`), h('span.spacer'),
      f.fiDays != null ? h('span.gain', {}, `+${f.fiDays.toFixed(1)} FI days`) : null, f.payoff != null ? h('span.muted.small', {}, `${money(f.payoff)} a year`) : null))));
}
// The next chapter: opens when no hole is left (and the S10 and S11 checklist once every area is rated).
function nextChapterCard(ctx, { inside = false } = {}) {
  const c = ctx.store.doc.scorecard?.nextChapter || {};
  const save = patch => ctx.store.setIn('scorecard', ['nextChapter'], { ...c, ...patch }, 'Next chapter');
  const d = h('input', { type: 'date', value: c.date || '', 'aria-label': 'Next chapter date' });
  d.onchange = () => save({ date: d.value || null });
  return h(`div.card${inside ? '.inner' : ''}`, { style: inside ? { marginTop: '10px' } : null }, h('div.row-line', { style: { gap: '10px' } }, h('h2', {}, 'Next chapter'), h('span.muted', {}, 'No hole left: what comes next (a home, kids, a career change)')),
    h('div.row-line', { style: { gap: '10px', marginTop: '10px', alignItems: 'flex-end' } },
      S.labelled('What it is', S.textInput(c.text ?? null, v => save({ text: v }), { hint: 'A home, kids, a career change', width: 320, key: 'chapter:text' })),
      S.labelled('Amount', S.moneyInput(c.amount ?? null, v => save({ amount: v }), { hint: 'Add amount', key: 'chapter:amount' })),
      S.labelled('By', h(`label.field${c.date ? '.filled' : ''}`, { style: { width: '170px' } }, d))));
}
// The game plan (S12): next-year notes, the yearly review date, the monthly money date.
function gamePlan(ctx) {
  const p = ctx.store.doc.program?.plan || {};
  const save = patch => ctx.store.setIn('program', ['plan'], { ...p, ...patch }, 'Game plan');
  const notes = h('textarea.notes-box', { placeholder: 'The plan for the next year, in a few lines', 'aria-label': 'Next-year plan notes', 'data-focus': 'plan:notes' }, p.notes || '');
  notes.onchange = () => save({ notes: notes.value.trim() || null });
  const d = h('input', { type: 'date', value: p.reviewDate || '', 'aria-label': 'Yearly review date' });
  d.onchange = () => save({ reviewDate: d.value || null });
  return h('div.card.inner', { style: { marginTop: '10px' } }, h('div.stack', { style: { gap: '10px' } },
    S.labelled('Next-year plan notes', notes),
    h('div.row-line', { style: { gap: '12px', alignItems: 'flex-end' } },
      S.labelled('Yearly review date', h(`label.field${p.reviewDate ? '.filled' : ''}`, { style: { width: '170px' } }, d)),
      S.labelled('Monthly money date', S.select(MONEY_DATES, p.moneyDate ?? null, v => save({ moneyDate: v }), { label: 'Monthly money date', hint: 'Pick a cadence', width: 230, key: 'plan:moneyDate' })))));
}

// ---------- The next small things ----------
function nextThings(app, ctx, P) {
  if (!P.next.length) return h('div.card', {}, h('p', { style: { margin: 0 } }, h('strong', {}, 'Every number is at Actual.'), ' Nothing left to sharpen.'));
  const open = it => {
    if (it.recId) { app.goFound({ kind: 'record', id: it.recId, route: it.route }); return; }
    app.go(it.route);
    if (it.focus) requestAnimationFrame(() => document.querySelector(`[data-focus="${it.focus}"]`)?.focus());
  };
  return h('section.section', {}, h('div.section-title', {}, h('h2', {}, 'Next small things'), h('span.muted', {}, 'What raises the picture most')),
    h('div.next-things', {}, P.next.map((it, i) => h('div.thing', {}, h('span.gain', {}, `+${Math.round(it.gain * 100)}%`),
      h('span.thing-name', {}, it.label), h('span.muted.small', {}, `${levelWord(it.level)} now · ${it.step}`),
      S.button(it.kind === 'category' ? 'Open the lines' : 'Open the field', { kind: i === 0 ? 'primary' : 'secondary', iconName: 'right', onClick: () => open(it) })))));
}

// ---------- Money in one line (Mockup: exactly four numbers) ----------
export function moneyInOneLine(app, ctx, m = ctx.metrics()) {
  const fi = fiCard(ctx, m);
  const when = m.monthsToFi.value;
  const sentence = fi.lock ? (m.surplus.value !== null ? `You keep ${money(m.surplus.value)} a month. The FI date ${fi.lock.reason.replace(/^Unlocks/, 'unlocks')}` : null)
    : m.surplus.value !== null && when !== null ? `You keep ${money(m.surplus.value)} a month and are on track for FI${m.inputs.age !== null ? ` at ${Math.floor(m.inputs.age + when / 12)}` : ` in ${(when / 12).toFixed(1)} years`}.`
      : m.surplus.value !== null && m.surplus.value < 0 ? `You spend ${money(-m.surplus.value)} a month more than comes in.` : null;
  return h('section.section', {}, h('div.section-title', {}, h('h2', {}, 'Money in one line')),
    sentence ? h('p', { style: { fontSize: '1.125rem', fontWeight: 600 } }, sentence) : null,
    S.summaryStrip(ctx, [
      { label: 'Net worth', result: m.netWorth, key: 'netWorth', home: '#/report/overview', so: soWhat('netWorth', m) },
      { label: 'Monthly surplus', result: m.surplus, key: 'surplus', home: '#/cash-flow/budget', so: soWhat('surplus', m, { lowDay: firstLowDay(ctx) }) },
      { label: 'Savings rate', result: m.savingsRate, key: 'savingsRate', home: '#/report/overview', note: m.savingsRate.second, so: soWhat('savingsRate', m) },
      { ...fi, home: '#/plan/goals', so: soWhat('fi', m) }]));
}

// ---------- In session: what End session does ----------
function wrapUp(app, ctx, P) {
  const s = sessionOf(ctx.store.doc);
  const hw = homeworkItems(ctx);
  const items = [
    [`Homework set (${hw.length})`, hw.length ? hw.map(x => x.label).join(', ') : "Nothing marked I'll find it later", S.button('Open the list', { size: 'small', onClick: () => app.go('#/tools/lists') })],
    [P.day0 ? `Snapshot saved (End of session ${P.n})` : 'Day 0 snapshot saved', 'Freezes today\'s numbers and the Picture %', null],
    ['One-pager ready', 'Key stats, to-dos, goals, strengths and struggles', S.button('Open one-pager', { size: 'small', onClick: () => app.go('#/report/one-pager') })],
    ['Next session booked', s.next ? `Set for ${s.next}` : 'Two weeks from today unless a date is picked above', null],
  ];
  return h('div.card', {}, h('div.row-line', { style: { gap: '10px' } }, h('h2', {}, 'End session does all four'), h('span.muted', {}, 'then shows Send summary')),
    h('div.checklist', { style: { marginTop: '10px', marginBottom: 0 } }, items.map(([what, detail, act]) => h('div.check-item', {}, h('span.box', { 'aria-hidden': 'true' }),
      h('div', { style: { flex: 1 } }, h('div.what', {}, what), h('div.muted.small', {}, detail)), act))));
}

// ---------- Cards that show only when they have something to say ----------
// B7: the next paycheck, what the fixed bills take, and what is free, per pay period and per month.
function paydayCard(app, ctx) {
  const d = paydayOf(ctx.store.doc, ctx.ref, ctx.now());
  if (d.needs) return null;
  const when = new Date(`${d.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const line = (k, v) => h('span.stack', { style: { gap: '2px' } }, h('span.label', {}, k), h('strong', {}, money(v)));
  return h('div.card.payday', {},
    h('p', { style: { fontSize: '1.0625rem', margin: 0 } }, `You get ${money(d.period.in)} on ${when}${d.guessDate ? ' (day not set yet)' : ''}. `,
      d.hasFixed ? `${money(d.period.fixed)} covers fixed bills. ` : '', d.setAside.total ? `${money(d.period.save)} goes to savings goals and sinking funds. ` : '',
      h('strong', {}, `${money(d.setAside.total ? d.period.afterSavings : d.period.free)} is free to spend.`)),
    !d.hasFixed ? h('span.muted.small', {}, 'Mark bills Fixed on the Budget to see what they take from each paycheck.') : null,
    h('div.row-line', { style: { gap: '24px', marginTop: '10px' } },
      h('span.muted.small', { style: { minWidth: '90px' } }, 'Each paycheck'), line('In', d.period.in), line('Fixed bills', d.period.fixed), line('Free', d.period.free),
      line('Savings goals and sinking funds', d.period.save), line('Free after savings', d.period.afterSavings)),
    h('div.row-line', { style: { gap: '24px', marginTop: '6px' } },
      h('span.muted.small', { style: { minWidth: '90px' } }, 'Each month'), line('In', d.month.in), line('Fixed bills', d.month.fixed), line('Free', d.month.free),
      line('Savings goals and sinking funds', d.month.save), line('Free after savings', d.month.afterSavings)));
}
// Open items (polish item 7): what changed, homework, due for a check and the parking lot, one line each; off when none.
function openItems(app, ctx) {
  const doc = ctx.store.doc;
  const snap = ctx.store.lastSnapshot();
  const now = snapshotNumbers(doc, ctx.ref, { now: ctx.now() });
  const changes = snap ? [['Net worth', 'netWorth'], ['Debt', 'debtTotal'], ['Savings rate', 'savingsRate'], ['Surplus', 'surplus'], ['Picture', 'picturePct']]
    .map(([label, k]) => ({ label, k, c: changeSince(now, snap, k) })).filter(x => x.c && x.c.direction !== 'same') : [];
  const fmt = (k, d) => (k === 'savingsRate' || k === 'picturePct' ? `${(Math.abs(d) * 100).toFixed(k === 'picturePct' ? 0 : 1)} pts` : money(Math.abs(d)));
  const homework = homeworkItems(ctx).length, due = app.dueForCheck().length, notes = doc.parking.filter(n => !n.filedTo).length;
  const total = homework + due + notes + (changes.length ? 1 : 0);
  if (!total) return null;
  const row = (label, detail, go, link) => h('div.open-row', {}, h('strong', {}, label), h('span.muted', {}, detail), h('a', { href: '#', onclick: e => { e.preventDefault(); go(); } }, `${link} ›`));
  return h('div.card.open-items', {},
    h('div.row-line', { style: { gap: '10px' } }, h('h2', {}, 'Open items'), h('span.tag.plain', {}, String(total))),
    changes.length ? row('What changed', `${changes.map(x => `${x.label} ${x.c.direction === 'up' ? '▲' : '▼'} ${fmt(x.k, x.c.diff)}`).join(' · ')} since ${snap.label}`, () => app.go('#/report/history'), 'History') : null,
    homework ? row('Homework', `${homework} ${homework === 1 ? 'number' : 'numbers'} to find later`, () => app.go('#/tools/lists'), 'Homework list') : null,
    due ? row('Due for a check', `${due} rough or aged ${due === 1 ? 'number' : 'numbers'}`, () => app.go('#/tools/lists'), 'Revisit list') : null,
    notes ? row('Parking lot', `${notes} ${notes === 1 ? 'note' : 'notes'} not filed yet`, () => app.openParking(), 'Parking lot') : null);
}
// Day 0 against now (the Revisit session's report, S9; a placeholder table this phase).
function day0Card(ctx, P) {
  const rep = day0Report(ctx.store.doc, ctx.ref, { now: ctx.now() });
  if (!rep) return null;
  const f = (r, v) => (v == null ? '' : r.unit === 'pct' ? pct(v) : r.unit === 'count' ? String(v) : money(v));
  const diff = r => (r.change == null || Math.abs(r.change) < 1e-9 ? '' : `${r.change > 0 ? '▲' : '▼'} ${r.unit === 'pct' ? `${(Math.abs(r.change) * 100).toFixed(r.key === 'picturePct' ? 0 : 1)} pts` : r.unit === 'count' ? String(Math.abs(r.change)) : money(Math.abs(r.change))}`);
  return h('div.card', {}, h('div.row-line', { style: { gap: '10px' } }, h('h2', {}, 'Day 0 vs now'), h('span.muted', {}, `Day 0: ${new Date(rep.at).toLocaleDateString()}`)),
    h('table.rows.compare', { style: { marginTop: '10px' } }, h('thead', {}, h('tr', {}, h('th', {}, ''), h('th.num', {}, 'Day 0'), h('th.num', {}, 'Now'), h('th.num', {}, 'Change'))),
      h('tbody', {}, rep.rows.map(r => h('tr', {}, h('td', {}, r.label), h('td.num', {}, f(r, r.then)), h('td.num', {}, f(r, r.now)), h('td.num', {}, diff(r)))))));
}
// M6: net worth over time, closed until asked; snapshots come from End session and month-end close.
function netWorthOverTime(app, ctx) {
  const snaps = ctx.store.doc.snapshots.filter(x => x.metrics && x.metrics.netWorth != null);
  if (!snaps.length) return null;
  return h('div.nw-time', {}, h('div.row-line', { style: { gap: '8px' } },
    S.moreBlock('home:nw', () => (snaps.length >= 2 ? netWorthChart(snaps, { height: 220 }) : h('p.muted', {}, 'One snapshot so far. The line starts with the second one.')),
      { label: `Net worth over time (${snaps.length} ${snaps.length === 1 ? 'snapshot' : 'snapshots'})` }),
    S.button('Save snapshot', { size: 'small', iconName: 'camera', onClick: () => { app.snapshot('Snapshot'); } })));
}
export { inSession };
