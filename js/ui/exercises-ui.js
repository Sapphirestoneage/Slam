// SPDX-License-Identifier: AGPL-3.0-only
// Home › Exercises (run "Finish everything partly built", Part 7, Money psychology, Nov 26 2026): one screen for every
// money exercise. First the letter from your calm self (js/ui/exercise-letter-ui.js, listed as it is), then the ten
// money exercises, then three prompts for life after work. The list and the prompts are js/exercises/catalog.js (the
// game reads a copy of the same file). Each exercise is a closed section; opening one builds it once (LIVE-FORM: built
// once): the prompt, lines to tap that go into the box, the box (typed, or spoken where the browser has voice to text),
// who sees this (Me only by default), Keep and Clear. Answers are kept under settings.exercises[id], like the letter;
// js/privacy.js takes a Me only answer out of anything shared. No number is worked out here.
import { h } from './dom.js';
import * as S from './staples.js';
import { calmLetterExercise, speakControl } from './exercise-letter-ui.js';
import { CALM_LETTER, exerciseOf, keepExercise } from '../exercises/calm-letter.js';
import { EX_GROUPS, EX_LIST, EX_ME_ONLY, EX_SHARED, exOfGroup, exAddStart, exAnswer, exCount } from '../exercises/catalog.js';

export const EX_ROUTE = '#/home/exercises';
// The two answers to "Who sees this" in the web app. Shared: the answer goes along in what the person shares.
export const EX_SEEN_WORDS = [[EX_ME_ONLY, 'Me only'], [EX_SHARED, 'Me and the people I share with']];
// The screens an exercise talks about, so the numbers are one tap away (never worked out again here).
const TOOLS = {
  values: { route: '#/cash-flow/budget', label: 'Open Joy by category on the Budget' },
  enough: { route: '#/plan/goals', label: 'Open your enough number on Goals' },
};
const whenOf = iso => (iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null);
const seenWord = s => (EX_SEEN_WORDS.find(([v]) => v === s) ?? EX_SEEN_WORDS[0])[1];
const summaryOf = (kept, E) => (kept?.text ? `Written ${whenOf(kept.at)} · ${seenWord(kept.seen)}` : `About ${E.minutes} minutes`);

// One exercise, opened: built once, so nothing typed is lost while it is open.
export function exerciseBody(app, ctx, E) {
  const kept = exerciseOf(ctx.store.doc, E.id);
  let seen = kept?.seen === EX_SHARED ? EX_SHARED : EX_ME_ONLY;
  const area = h('textarea', { rows: 6, placeholder: 'Your words, typed or spoken', 'aria-label': `${E.title}: your words`, 'data-focus': `exercise:${E.id}:text` }, kept?.text ?? '');
  const starts = h('div.rc-chips', { role: 'group', 'aria-label': 'Lines to start with' }, E.starts.map(s => h('button.chip-btn', { type: 'button', onclick: () => { area.value = exAddStart(area.value, s); area.focus(); } }, s)));
  const keep = () => {
    const a = exAnswer(area.value, seen, ctx.now().toISOString());
    keepExercise(ctx.store, E.id, a ? { text: a.text, own: null, seen: a.seen } : null, ctx.now());
    S.toast(a ? `Kept. ${seenWord(a.seen)} ${a.seen === EX_SHARED ? 'can read it' : 'reads it'}.` : 'Nothing to keep: the box is empty.', { undo: a ? () => ctx.store.undo() : null });
  };
  const clearIt = () => { area.value = ''; keepExercise(ctx.store, E.id, null, ctx.now()); S.toast('Cleared.', { undo: () => ctx.store.undo() }); };
  const tool = E.tool && TOOLS[E.tool];
  return h('div.stack.exercise', { style: { gap: '10px' }, 'data-exercise': E.id },
    h('p', { style: { margin: 0 } }, E.prompt),
    h('span.label', {}, 'Tap a line to start with'), starts,
    h('label.field.rc-area', {}, area),
    h('div.row-line', { style: { gap: '8px' } }, speakControl(area)),
    h('span.label', {}, 'Who sees this'),
    S.toggle(EX_SEEN_WORDS, seen, v => { seen = v ?? EX_ME_ONLY; }, { label: `Who sees ${E.title}` }),
    h('span.muted.small', {}, seen === EX_SHARED ? 'Goes along in what you share.' : 'Kept out of anything shared: the one-pager, Send summary, share views and shared copies.'),
    h('div.row-line', { style: { gap: '8px' } },
      S.button(kept?.text ? 'Keep the changes' : 'Keep it', { kind: 'primary', onClick: keep }),
      kept?.text ? S.button('Clear it', { kind: 'danger', onClick: clearIt }) : null,
      tool ? S.button(tool.label, { iconName: 'right', onClick: () => app.go(tool.route) }) : null));
}

export function exercisesScreen(app, ctx) {
  const all = ctx.store.doc.settings?.exercises || {};
  const n = exCount(all, [CALM_LETTER.id, ...EX_LIST.map(e => e.id)]);
  const letter = exerciseOf(ctx.store.doc, CALM_LETTER.id);
  const group = g => {
    const G = EX_GROUPS.find(x => x.id === g);
    return h('section.ex-group', { 'data-ex-group': g, 'aria-label': G.title },
      h('h2', {}, G.title), h('p.muted.small', { style: { margin: '0 0 8px' } }, G.cap),
      g === 'calm'
        ? S.sec('ex:calm-letter', { title: CALM_LETTER.title, summary: letter?.text ? `Written ${whenOf(letter.at)} · Me only` : `About ${CALM_LETTER.minutes} minutes`, card: true, level: 'h3' }, () => calmLetterExercise(ctx))
        : exOfGroup(g).map(E => S.sec(`ex:${E.id}`, { title: E.title, summary: summaryOf(all[E.id], E), tip: E.line, card: true, level: 'h3' }, () => exerciseBody(app, ctx, E))));
  };
  return [
    h('div.page-head.ex-head', {}, h('div', {}, h('h1', {}, 'Money exercises'), h('p', {}, 'Short writing about you and money. Private to you unless you share it.'))),
    h('div.card.ex-intro', {}, h('div.row-line', { style: { gap: '10px', alignItems: 'baseline' } },
      h('span.label', {}, 'Written'), h('strong', {}, `${n.done} of ${n.of}`),
      h('span.muted.small', {}, 'Any order, any length. Open one, tap a line to start, and keep what you write.'))),
    group('calm'), group('write'), group('after'),
  ];
}
