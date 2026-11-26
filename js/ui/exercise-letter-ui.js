// SPDX-License-Identifier: AGPL-3.0-only
// The screen part of one exercise: Letter from your calm self (js/exercises/calm-letter.js). calmLetterExercise(ctx)
// is the whole exercise as one element (the prompt, lines to tap, a box for your own words with voice-to-text where
// the browser has it, who sees this, and Keep). The Exercises screen can list it as it is; Home opens it in a box.
import { h } from './dom.js';
import * as S from './staples.js';
import { CALM_LETTER, exerciseOf, keepExercise, letterText } from '../exercises/calm-letter.js';
import { EX_VOICE } from '../exercises/catalog.js';

const Speech = () => (typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null);
// Voice to text for one box, used by every exercise (the Exercises screen, js/ui/exercises-ui.js, too): the browser's
// own speech recognition, offered only where the browser has it; elsewhere a plain note. No sound is kept: the words
// said land at the end of the box. onWords: called after words land (the box keeps its own value).
export function speakControl(area, { onWords = null } = {}) {
  if (!Speech()) return h('span.muted.small.ex-voice-off', {}, EX_VOICE.off);
  let rec = null;
  return S.button('Speak it', { size: 'small', tip: EX_VOICE.on, onClick: e => {
    const b = e.currentTarget;
    if (rec) { rec.stop(); return; }
    rec = new (Speech())(); rec.lang = 'en-US'; rec.interimResults = false;
    rec.onresult = ev => { const said = [...ev.results].map(r => r[0].transcript).join(' ').trim(); if (said) { area.value = `${area.value.trim()} ${said}`.trim(); onWords?.(); } };
    rec.onend = () => { rec = null; b.lastChild.textContent = 'Speak it'; };
    rec.onerror = () => { rec = null; b.lastChild.textContent = 'Speak it'; };
    b.lastChild.textContent = 'Listening. Tap to stop'; rec.start();
  } });
}
export function calmLetterExercise(ctx, { onKept = null } = {}) {
  const E = CALM_LETTER, kept = exerciseOf(ctx.store.doc, E.id);
  const picked = new Set(E.starts.filter(s => kept?.text?.includes(s)));
  const area = h('textarea', { rows: 3, placeholder: 'Your own words, typed or spoken (optional)', 'aria-label': 'Your own words', 'data-focus': 'exercise:calm-letter:own' }, kept?.own ?? '');
  const chips = h('div.rc-chips', { role: 'group', 'aria-label': 'Lines to tap' }, E.starts.map(s => h('button.chip-btn', { type: 'button', 'aria-pressed': String(picked.has(s)), onclick: e => { picked.has(s) ? picked.delete(s) : picked.add(s); e.currentTarget.setAttribute('aria-pressed', String(picked.has(s))); } }, s)));
  const speak = speakControl(area);
  const keep = () => {
    const text = letterText([...picked], area.value);
    keepExercise(ctx.store, E.id, text ? { text, own: area.value.trim() || null } : null, ctx.now());
    S.toast(text ? 'Kept. It shows in a month that needs it.' : 'Letter cleared.', { undo: () => ctx.store.undo() });
    onKept?.();
  };
  return h('div.stack.exercise', { style: { gap: '10px' }, 'data-exercise': E.id },
    h('h3', {}, E.title), h('span.muted.small', {}, `${E.when} · about ${E.minutes} minutes`), h('p', { style: { margin: 0 } }, E.prompt),
    h('span.label', {}, 'Tap the lines that sound like you'), chips,
    h('label.field.rc-area', {}, area),
    h('div.row-line', { style: { gap: '8px' } }, speak, h('span.tag.plain', { title: 'Kept out of anything shared: the one-pager, Send summary, share views and shared copies' }, 'Who sees this: Me only')),
    h('div.row-line', { style: { gap: '8px' } }, S.button(kept ? 'Keep the changes' : 'Keep the letter', { kind: 'primary', onClick: keep })));
}
// The same exercise in a box, from a button, with a way to the other exercises (Home › Exercises).
export function openCalmLetter(ctx, anchor) {
  const all = h('a.ex-all', { href: '#/home/exercises', onclick: () => S.closePop() }, 'See all the money exercises');
  S.popover(anchor, h('div.stack', { style: { gap: '10px' } }, calmLetterExercise(ctx, { onKept: () => S.closePop() }), all), { width: 440 });
}
