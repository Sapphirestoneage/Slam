// SPDX-License-Identifier: AGPL-3.0-only
// Plan › FIRE (run Finish everything partly built, Part 18): the FIRE dashboard. One row of stat tiles, the pace taps
// (more a month into investing, and the return), every FIRE type with its number, its date at that pace and the share
// already invested, Coast, the FIRE type explainer (closed) and the FIRE flavor from the FIRE Community Quiz when the
// person took it. Formatting only: fireBoardOf (js/math/destinations.js) works every number out, on destinationsOf
// (M9G) and coastReachedOf (M54). The taps are what-ifs on this screen, never saved.
import { h } from './dom.js';
import * as S from './staples.js';
import { money, pct } from '../format.js';
import { monthName } from '../month.js';
import { fireBoardOf } from '../math/destinations.js';
import { fiGate } from './report-ui.js';
import { levelTag } from './destinations-ui.js';
import { FIRE_PACES, FIRE_EXPLAIN } from '../registry/destinations.js';
import { FIRE } from '../quiz/skins/fire.js';
import { lensOf } from '../quiz/store.js';
import { qzResult } from '../math/quizcore.js';

export const FUI = { extra: 0, pace: null };
const head = (title, sub, ...right) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null), h('div.row-line', {}, ...right));
const span = n => (n == null ? null : n === 0 ? 'now' : n < 24 ? `${n} ${n === 1 ? 'month' : 'months'}` : `${(n / 12).toFixed(1)} years`);

// The FIRE flavor the person leans to, from the FIRE Community Quiz (kept with the quiz answers), or null.
export function fireFlavorOf(doc) {
  const L = lensOf(doc.settings?.start, FIRE.id);
  if (!L?.ans || !Object.keys(L.ans).length) return null;
  const R = qzResult(FIRE, L.ans);
  const t = R.ready && R.id ? FIRE.traits.find(x => x.id === R.id) : null;
  return t ? { id: t.id, name: t.name, tie: !!R.tie } : null;
}
const FLAVOR_KEY = { lean: 'Lean FI', fat: 'Fat FI', coast: 'Coast', barista: 'Barista FI' };

export function fireScreen(app, ctx) {
  const m = ctx.metrics(), doc = ctx.store.doc, gate = fiGate(ctx);
  const paces = ctx.ref.presets.pace;
  const B = fireBoardOf(m, doc, { now: ctx.now(), extra: FUI.extra, realReturn: FUI.pace == null ? null : paces[FUI.pace] });
  const flavor = fireFlavorOf(doc), mine = flavor ? FLAVOR_KEY[flavor.id] : null;
  const when = v => (!gate.unlocked ? null : v.reached ? 'Reached' : v.months != null ? monthName(v.ym, 'short') : v.never ? 'Not on this path yet' : null);
  const R = B.regular;
  const nearest = B.nearest;
  const strip = S.summaryStrip(ctx, [
    { label: 'Invested toward FI', result: { id: 'M41', value: B.invested, needs: B.invested == null ? ['investments'] : [], unit: 'money', text: 'What is invested toward FI today (Invested toward FI on Net worth).' }, note: R?.share != null ? `${pct(Math.min(1, R.share))} of your FI number` : null, home: '#/net-worth/assets' },
    { label: 'FI number', result: R?.number ?? m.fiNumber, note: R?.spending != null ? `${money(R.spending)} a month for good` : null, home: '#/plan/goals' },
    { label: 'Nearest finish line', result: nearest ? { id: 'M53', value: nearest.months, needs: [], unit: 'months', text: nearest.date?.text ?? `${nearest.short} FIRE on the plan's own path.` } : { id: 'M53', value: null, needs: R?.needs?.length ? R.needs : ['spending'], unit: 'months', text: '' },
      render: () => when(nearest), note: nearest ? `${nearest.short === 'Regular' ? 'FIRE' : `${nearest.short} FIRE`}, in ${span(nearest.months)}` : null, lock: gate.unlocked ? null : { reason: gate.reason, route: gate.route } },
    { label: 'Coast number', result: m.coastFi, note: B.coast.reached ? 'Reached: growth alone gets you there' : B.coast.gap != null ? `${money(B.coast.gap)} more to coast` : null },
  ]);
  const going = B.going;
  const paceRow = h('div.card.fire-pace', {},
    h('h2', {}, 'Pace'),
    S.labelled('More a month into investing', S.tapPick(FIRE_PACES.map(x => [x, x ? `+${money(x)}` : 'Today\'s pace']), FUI.extra, v => { FUI.extra = v ?? 0; app.render(); }, { label: 'More a month into investing', key: 'fire:extra', clearable: false }),
      { note: going == null ? 'Today\'s pace needs your take-home and spending' : `Today ${money(going)} a month goes in${FUI.extra ? `; this shows ${money(going + FUI.extra)}` : ''}` }),
    S.labelled('How fast money grows (after inflation)', S.tapPick([[null, `Your plan's ${+((m.inputs.realReturn ?? 0) * 100).toFixed(1)}%`], ...['Pessimistic', 'Likely', 'Optimistic'].map(k => [k, `${k} ${Math.round(paces[k] * 100)}%`])], FUI.pace, v => { FUI.pace = v; app.render(); }, { label: 'How fast money grows', key: 'fire:pace', clearable: false }),
      { note: 'A what-if on this screen. Plan › Goals sets the plan\'s own' }));
  const row = v => {
    const date = v.value == null ? h('span.muted', {}, 'Needs ', S.needLinks(ctx, v.needs.length ? v.needs : ['spending'])) : !gate.unlocked ? h('span.muted.small', {}, gate.reason) : h('strong', {}, when(v) ?? h('span.muted', {}, 'Needs ', S.needLinks(ctx, v.needs)));
    const moved = gate.unlocked && v.sooner ? h('span.muted.small', {}, v.sooner > 0 ? `${span(v.sooner)} sooner than today's pace (${v.baseWhen})` : `Recalculating: ${span(-v.sooner)} later than today's pace`) : null;
    return h(`div.fire-row${mine === v.key ? '.fire-mine' : ''}`, { 'data-fire': v.short },
      h('div.fire-name', {}, h('strong', {}, v.short === 'Regular' ? 'FIRE' : `${v.short} FIRE`), mine === v.key ? h('span.tag.plain', { title: 'From your FIRE Community Quiz' }, 'Your flavor') : null, h('span.muted.small', {}, v.what)),
      h('div.fire-cell', {}, h('span.label', {}, 'The number'), v.value == null ? h('span.muted', {}, '–') : S.mathButton(v.number, money(v.value))),
      h('div.fire-cell', {}, h('span.label', {}, 'At this pace'), date, moved, v.value != null && gate.unlocked ? levelTag(gate) : null),
      h('div.fire-cell', {}, h('span.label', {}, 'So far'), v.share == null ? h('span.muted', {}, 'Needs invested') : h('span', {}, pct(Math.min(1, v.share))), v.share != null ? h('div.rung-bar', { title: pct(Math.min(1, v.share)) }, h('span', { style: { width: `${Math.min(100, v.share * 100)}%` } })) : null));
  };
  const board = h('div.card.fire-board', {}, h('h2', {}, 'Every FIRE type at this pace'), h('div.fire-rows', {}, B.views.map(row)),
    h('div.fire-row.fire-coast', { 'data-fire': 'Coast' },
      h('div.fire-name', {}, h('strong', {}, 'Coast FIRE'), mine === 'Coast' ? h('span.tag.plain', { title: 'From your FIRE Community Quiz' }, 'Your flavor') : null, h('span.muted.small', {}, 'Growth alone gets you to your FI number by the age you set.')),
      h('div.fire-cell', {}, h('span.label', {}, 'The number'), B.coast.value == null ? h('span.muted', {}, '–') : S.mathButton({ id: 'M54', value: B.coast.value, needs: [], text: B.coast.text ?? '' }, money(B.coast.value))),
      h('div.fire-cell', {}, h('span.label', {}, 'Where you are'), B.coast.value == null ? h('span.muted', {}, 'Needs your age and the age to stop') : h('strong', {}, B.coast.reached ? 'Reached' : B.coast.gap != null ? `${money(B.coast.gap)} to go` : 'Needs invested')),
      h('div.fire-cell', {}, h('span.label', {}, 'So far'), B.coast.value && B.invested != null ? h('span', {}, pct(Math.min(1, B.invested / B.coast.value))) : h('span.muted', {}, '–'))),
    h('p.muted.small', { style: { marginBottom: 0 } }, 'Each date runs on the plan\'s own path: the debt-first months come first, then the pace you tapped. The numbers do not change with the pace; only the dates move.'));
  const explain = S.sec('fire:explain', { title: 'The FIRE types, in plain words', summary: 'Lean, Coast, Barista, FIRE, Chubby and Fat' },
    () => h('div.card.fire-explain', {}, FIRE_EXPLAIN.map(x => h('div.fire-ex', {}, h('strong', {}, x.name, mine === x.key ? ' (your flavor)' : ''), h('p', {}, x.what), h('p.muted.small', {}, `Fits when: ${x.fits} It asks: ${x.asks}`))),
      h('p.muted.small', { style: { marginBottom: 0 } }, 'The names are the ones the FIRE community uses. Your numbers and dates are above; the Fat list and part-time pay are set on Plan › Goals, FI destinations.')));
  const quiz = h('p.muted.small.fire-quiz', {}, flavor ? `Your FIRE Community Quiz leans ${flavor.name}${flavor.tie ? ' (a close call)' : ''}. A game lens, not a forecast.` : 'Not sure which fits? The FIRE Community Quiz is on the quiz page, under More quizzes: fourteen taps.', ' ', h('a', { href: 'quiz.html' }, flavor ? 'Take it again' : 'Open the quiz page'));
  return [head('FIRE', 'Every way to financial independence, at the pace you pick'), strip, paceRow, board, quiz, explain];
}
