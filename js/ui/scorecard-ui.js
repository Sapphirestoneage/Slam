// SPDX-License-Identifier: AGPL-3.0-only
// Plan › Scorecard (Phase 3, batch 2): eleven areas, each Strong, OK or Hole from the numbers or by the coach's
// call; the holes ranked (before the client's FOO step first, then payoff over effort), each with its payoff in the
// current money view, its effort in hours (editable), its best-return score, a pick for the plan, and How we got
// this behind a caret; OK areas as rows and Strong ones as slim rows, so strengths show too.
import { h, icon } from './dom.js';
import * as S from './staples.js';
import { scorecardOf } from '../math/scorecard.js';
import { RATINGS } from '../registry/scorecard.js';
import { money } from '../format.js';

const head = (title, sub, ...right) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null), h('div.row-line', {}, ...right));
const TAG = { Strong: 'good', OK: 'plain', Hole: 'warn' };
export const ratingTag = rating => (rating ? h(`span.tag.${TAG[rating]}`, {}, rating) : h('span.tag.plain', {}, 'Not rated'));
const fiDaysText = d => (d == null ? null : `${d.toFixed(1)} FI days`);

export function scorecardScreen(app, ctx) {
  const doc = ctx.store.doc;
  const sc = scorecardOf(doc, ctx.ref, { now: ctx.now(), flags: app.flags });
  const setArea = (id, patch) => ctx.store.setIn('scorecard', ['areas', id], { ...(doc.scorecard?.areas?.[id] || {}), ...patch }, 'Scorecard');
  const clearArea = (id, keys) => { const cur = { ...(doc.scorecard?.areas?.[id] || {}) }; for (const k of keys) delete cur[k]; ctx.store.setIn('scorecard', ['areas', id], Object.keys(cur).length ? cur : undefined, 'Scorecard'); };
  const choose = (id, on) => ctx.store.setIn('scorecard', ['chosen'], on ? [...(doc.scorecard?.chosen || []), id] : (doc.scorecard?.chosen || []).filter(x => x !== id), 'Top holes');
  // The rating: the coach's call wins; Auto puts the numbers' call back.
  const picker = a => h('div.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } },
    S.toggle(RATINGS.map(r => [r, r]), a.rating, v => (v ? setArea(a.id, { rating: v }) : clearArea(a.id, ['rating', 'reason'])), { label: `${a.name} rating` }),
    a.override ? S.button('Auto', { size: 'small', tip: a.auto ? `Back to the numbers' call: ${a.auto.rating}` : 'The numbers cannot rate this one', onClick: () => clearArea(a.id, ['rating', 'reason']) }) : null);
  const reasonBox = a => (a.override
    ? S.textInput(a.coachReason, v => setArea(a.id, { reason: v }), { hint: 'Why, in a few words', width: 320, key: `score:${a.id}:reason` })
    : h('span.reason', {}, a.reason));
  const source = a => h('span.muted.small', {}, a.source === 'coach' ? "The coach's call" : a.source === 'auto' ? 'From the numbers' : 'Not rated yet');
  const how = a => S.moreBlock(`score:how:${a.id}`, () => h('ul.how-list', {}, a.math.map(t => h('li', {}, t))), { label: 'How we got this' });
  // A hole: rank, name, the rating picker, the reason, payoff (in the money view), effort, score, in the plan, how.
  const holeRow = a => h('div.card.hole-row', {},
    h('div.hole-head', {}, h('span.rank', {}, `#${a.rank}`), h('strong.hole-name', {}, a.name), a.beforeHere ? h('span.tag.plain', {}, `Before FOO step ${sc.here}`) : null, h('span.spacer'), picker(a)),
    h('div.hole-body', {},
      h('div.stack', { style: { gap: '4px', minWidth: 0, flex: '1 1 260px' } }, reasonBox(a), source(a)),
      h('div.hole-num', {}, h('span.label', {}, 'Payoff a year'), a.payoff ? [S.amount(ctx, a.payoff.value), h('span.muted.small', {}, fiDaysText(a.fiDays) ?? '')]
        : h('span.row-line', { style: { gap: '6px' } }, S.moneyInput(null, v => setArea(a.id, { payoff: v }), { hint: 'Add a year', key: `score:${a.id}:payoff` }), h('span.muted.small', {}, 'No rule: your estimate'))),
      a.payoff?.typed ? h('div.hole-num', {}, h('span.label', {}, 'Your payoff'), h('span.row-line', { style: { gap: '6px' } }, S.moneyInput(a.payoff.value, v => (v == null ? clearArea(a.id, ['payoff']) : setArea(a.id, { payoff: v })), { hint: 'A year', key: `score:${a.id}:payoff` }))) : null,
      h('div.hole-num', {}, h('span.label', {}, 'Effort, hours'), S.textInput(a.effort == null ? null : String(a.effort), v => { const n = v == null ? null : Number(v); n == null || Number.isNaN(n) ? clearArea(a.id, ['effort']) : setArea(a.id, { effort: n }); }, { hint: 'Hours', width: 90, key: `score:${a.id}:effort` })),
      h('div.hole-num', {}, h('span.label', {}, 'Best return'), a.score != null ? h('strong', {}, `${money(a.score)} a year per hour`) : h('span.muted', {}, 'Needs a payoff')),
      h('div.hole-num', {}, S.checkbox('In the plan (top 3)', a.chosen, v => choose(a.id, v), { key: `score:${a.id}:chosen` })),
      h('a', { href: a.route }, 'Open where it lives ›')),
    how(a));
  const okRow = a => h('div.card.ok-row', {}, h('div.hole-head', {}, h('strong.hole-name', {}, a.name), h('span.spacer'), picker(a)),
    h('div.row-line', { style: { gap: '12px' } }, reasonBox(a), source(a), h('a', { href: a.route }, 'Open ›')), how(a));
  const strongRow = a => h('div.strong-row', {}, ratingTag(a.rating), h('strong', {}, a.name), h('span.reason.muted', {}, a.override ? (a.coachReason || "The coach's call") : a.reason),
    h('span.spacer'), S.button('Change', { size: 'small', onClick: e => S.popover(e.currentTarget, h('div.stack', { style: { gap: '10px' } }, h('strong', {}, a.name), picker(a), a.override ? S.textInput(a.coachReason, v => setArea(a.id, { reason: v }), { hint: 'Why, in a few words', width: 280 }) : null), { width: 360 }) }));
  const unratedRow = a => h('div.card.ok-row', {}, h('div.hole-head', {}, h('strong.hole-name', {}, a.name), ratingTag(null), h('span.spacer'), picker(a)),
    h('div.row-line', { style: { gap: '12px' } }, h('span.reason.muted', {}, a.reason), h('a', { href: a.route }, 'Open ›')));
  const section = (title, list, row, note = null) => (list.length ? h('section.section', {}, h('div.section-title.area-goals', {}, h('h2', {}, title), h('span.muted', {}, note ?? `${list.length}`)), list.map(row)) : null);
  const rescore = () => { ctx.store.setIn('scorecard', ['reviewedAt'], ctx.now().toISOString(), 'Re-scored'); S.toast('Marked as re-scored today.'); };
  const confirm = () => { ctx.store.setIn('program', ['fooConfirmed'], sc.here, 'FOO step'); S.toast(`FOO step ${sc.here} confirmed.`); };
  return [head('Scorecard', 'Eleven areas: Strong, OK or Hole; the holes ranked by what filling them pays for the effort',
      S.button('Re-scored today', { iconName: 'check', tip: 'Marks the Revisit session\'s re-score', onClick: rescore })),
    S.summaryStrip(ctx, [
      { label: 'Areas Strong or OK', result: { id: 'M74', value: sc.okCount, needs: [], unit: 'count', text: `${sc.okCount} of ${sc.of} areas rated Strong or OK; ${sc.holes.length} ${sc.holes.length === 1 ? 'hole' : 'holes'}; ${sc.unrated.length} not rated yet.` }, render: r => `${r.value} of ${sc.of}` },
      { label: 'Holes', result: { id: 'M74', value: sc.holes.length, needs: [], unit: 'count', text: 'The areas rated Hole, ranked below.' }, render: r => String(r.value) },
      { label: 'In the plan', result: { id: 'M74', value: sc.chosen.length, needs: [], unit: 'count', text: 'Holes picked for the top 3.' }, render: r => `${r.value} of ${Math.min(3, sc.holes.length)}` },
      { label: 'FOO step', result: { id: 'M69', value: sc.here == null ? null : Number(sc.here) || 0, needs: sc.here == null ? ['a surplus'] : [], unit: 'count', text: 'The step you are on (Plan › FOO). Holes before it rank first.' }, render: () => `${sc.here}`,
        note: doc.program?.fooConfirmed === sc.here ? 'Confirmed' : null }]),
    sc.here != null && doc.program?.fooConfirmed !== sc.here ? h('div.row-line', { style: { marginBottom: '16px', gap: '10px' } }, S.button(`Confirm FOO step ${sc.here}`, { iconName: 'check', onClick: confirm }), h('span.muted.small', {}, 'Session 5 asks for it; the step comes from Plan › FOO.')) : null,
    section('Holes, ranked', sc.holes, holeRow, sc.holes.length ? `${sc.holes.length} · before your FOO step first, then best return` : 'None'),
    section('Not rated yet', sc.unrated, unratedRow),
    section('OK', sc.ok, okRow),
    section('Strong', sc.strong, strongRow),
    !sc.holes.length && sc.rated === sc.of ? h('div.card', {}, h('strong', {}, 'No hole left.'), h('span.muted', {}, ' The next chapter opens on Home.')) : null];
}
