// SPDX-License-Identifier: AGPL-3.0-only
// The Mistake audit (Nov 25 2026). Opt-in, and the only place in SLAM that looks back at mistakes: it sits closed
// under Year in review on History, it is never pushed, and nothing else in the app uses its words. The person lists
// past money events, tags each one mistake or unavoidable, and sees the cost then and over time, in dollars, in days
// of saving (FI days) and in hours of work, with the ones that repeat. It covers the mistake cost tracker, the
// mistake tax, and "Mistake or unavoidable". Formatting only: auditOf (js/recalc.js) and rcAudit (js/math/recalc.js).
import { h } from './dom.js';
import * as S from './staples.js';
import { auditOf, notesOf } from '../recalc.js';
import { rcMonthName } from '../math/recalc.js';
import { money } from '../format.js';

const AUI = { kind: null, amount: null, ym: null };
const TAGS = [['mistake', 'Mistake'], ['unavoidable', 'Unavoidable']];
const days = v => (v == null ? null : `${v < 10 ? v.toFixed(1) : Math.round(v)} FI ${Math.round(v) === 1 ? 'day' : 'days'}`);
const hours = v => (v == null ? null : `${v < 10 ? v.toFixed(1) : Math.round(v)} hours of work`);
const pct1 = v => `${(v * 100).toFixed(1)}%`;

export function auditSection(app, ctx) {
  return S.sec('history:audit', { title: 'Mistake audit (opt-in)', summary: 'Closed unless you open it. A look back at past money events, by your own tags' }, () => S.live(ctx, () => auditBody(ctx)));
}
function auditBody(ctx) {
  const doc = ctx.store.doc, N = notesOf(doc), cur = N.audit ?? {};
  const put = patch => ctx.store.setDoc('settings', { recalc: { ...N, audit: { ...cur, ...patch } } });
  if (!cur.on) return h('div.card.audit', { 'data-rc': 'audit-off' },
    h('p', { style: { marginTop: 0 } }, 'Everywhere else, SLAM only looks forward: a date moves and the route recalculates. This one page looks back, and only if you want it to.'),
    h('p.muted.small', {}, 'You list past money events and tag each one yourself. Nothing here changes the plan, and nothing here shows anywhere else or in anything shared.'),
    S.button('Turn the audit on', { onClick: () => put({ on: true }) }));
  const A = auditOf(doc, ctx.metrics(), { now: ctx.now() });
  const events = cur.events || [];
  const setEvent = (id, patch) => put({ events: events.map(e => (e.id === id ? { ...e, ...patch } : e)) });
  const month = h('input', { type: 'month', value: AUI.ym ?? '', 'aria-label': 'Month it happened', 'data-focus': 'audit:ym', max: ctx.now().toISOString().slice(0, 7) });
  month.onchange = () => { AUI.ym = month.value || null; };
  const add = () => {
    if (!AUI.kind || AUI.amount == null) { S.toast('Pick what it was and its amount first.'); return; }
    put({ events: [...events, { id: ctx.store.makeId(), kind: AUI.kind, what: AUI.kind, amount: AUI.amount, ym: AUI.ym ?? ctx.now().toISOString().slice(0, 7), tag: null }] });
    AUI.kind = null; AUI.amount = null; AUI.ym = null;
  };
  const form = h('div.audit-add', {},
    S.labelled('What it was', S.select(A.kinds, AUI.kind, v => { AUI.kind = v; }, { label: 'What it was', hint: 'Pick one', width: 200, key: 'audit:kind' })),
    S.labelled('What it cost', S.moneyInput(AUI.amount, v => { AUI.amount = v; }, { hint: 'Add amount', key: 'audit:amount' })),
    S.labelled('Month', h('label.field', { style: { width: '170px' } }, month), { note: 'Empty means this month' }),
    h('div.audit-add-btn', {}, S.button('Add it', { iconName: 'plus', onClick: add })));
  const row = r => h('li.audit-row', { 'data-id': r.id },
    h('div.audit-what', {}, h('strong', {}, r.what || r.kind || 'An event'), h('span.muted.small', {}, r.yearsAgo == null ? '' : ` · ${rcMonthName(events.find(e => e.id === r.id)?.ym)}`)),
    h('div.audit-cost', {}, r.amount == null ? h('span.muted', {}, 'No amount yet') : money(r.amount)),
    S.toggle(TAGS, r.tag, v => setEvent(r.id, { tag: v }), { label: `Tag for ${r.what || r.kind}`, clearable: true }),
    h('div.audit-later.muted.small', {}, [r.later != null ? `${money(Math.round(r.later))} over time` : null, days(r.fiDays), hours(r.hours)].filter(Boolean).join(' · ') || 'Over time shows once the plan has a date'),
    S.iconButton('trash', `Remove ${r.what || r.kind}`, () => { put({ events: events.filter(e => e.id !== r.id) }); S.toast('Removed.', { undo: () => ctx.store.undo() }); }, { tiny: true }));
  const tile = (label, t, note) => h('div.metric', {}, h('span.label', {}, label), h('div.big', {}, money(t.cost)),
    h('span.muted.small', {}, [`${t.count} ${t.count === 1 ? 'event' : 'events'}`, t.later != null ? `${money(Math.round(t.later))} over time` : null, days(t.fiDays), hours(t.hours)].filter(Boolean).join(' · ')), note ? h('span.muted.small', {}, note) : null);
  return h('div.card.audit', { 'data-rc': 'audit' },
    h('p.muted.small', { style: { marginTop: 0 } }, 'Tag each one yourself. Unavoidable is a real answer: a transmission is not a choice. Untagged ones are counted in neither total.'),
    form,
    A.rows.length ? h('ul.audit-list', {}, A.rows.map(row)) : h('p.muted', {}, 'Nothing listed yet.'),
    A.rows.length ? h('div.shelf', { style: { marginTop: '12px' } }, tile('Tagged mistake', A.mistake, A.tax != null ? `Mistake tax: ${pct1(A.tax)} of a year of take-home (the last 12 months, ${money(A.lastYear)})` : null), tile('Tagged unavoidable', A.unavoidable, 'What a cushion is for')) : null,
    A.repeats.length ? h('div.audit-repeats', {}, h('span.label', {}, 'Repeats'), h('ul', {}, A.repeats.map(k => h('li', {}, `${k.kind}: ${k.count} times, ${money(k.cost)}. One fix here pays more than once.`)))) : null,
    S.moreBlock('audit:math', () => h('div.stack.small', { style: { gap: '4px' } },
      h('span', {}, 'Cost then: the amount you typed.'),
      h('span', {}, A.years != null && A.realReturn != null ? `Over time: that amount grown at the plan's ${pct1(A.realReturn)} a year after inflation, from the month it happened to the month work becomes optional (${A.years.toFixed(1)} years from today). Today's dollars.` : 'Over time: the amount grown at the plan\'s return until work becomes optional. It shows once the plan has that date.'),
      h('span', {}, A.saved != null ? `FI days: the amount divided by what you put away in a day (${money(A.saved)} a month x 12 / 365). It is the days of saving the event took.` : 'FI days: the amount divided by what you put away in a day. It shows once the month has money left over.'),
      h('span', {}, 'Hours of work: the amount divided by your real hourly pay, when Income has the hours.'),
      h('span', {}, 'Mistake tax: the events tagged mistake in the last 12 months, divided by 12 months of take-home pay.'),
      h('span', {}, 'Repeats: the same kind tagged mistake two times or more.')), { label: 'Show the math' }),
    h('div.row-line', { style: { marginTop: '10px' } }, S.button('Turn the audit off', { size: 'small', onClick: () => { put({ on: false }); S.toast('The audit is off. Your list is kept.', { undo: () => ctx.store.undo() }); } })));
}
