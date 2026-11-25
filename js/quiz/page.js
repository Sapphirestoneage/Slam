// SPDX-License-Identifier: AGPL-3.0-only
// THE renderer of a quiz in the web app (quiz.html). It draws any quiz definition of the one engine
// (js/math/quizcore.js): the list, the first screen, one question for each tap, and the result card. It works nothing
// out: every word and number comes from the engine (through js/quiz/store.js lensNow).
// A QUESTION STYLE is one function in QUIZ_STYLES: (def, q, answer, pick) -> an element with the taps. A question
// names its style with `style`; with none, a tap question is 'rows' and a statement is 'scale'. To add a style, add
// one function here and name it in the skin (docs/QUIZ-ENGINE.md).
import { h } from '../ui/dom.js';

const btn = (label, onClick, kind = '') => h(`button.st-btn${kind ? '.' + kind.split(' ').join('.') : ''}`, { type: 'button', onClick }, label);
const chip = (label, on, onClick) => h('button.st-chip', { type: 'button', 'aria-pressed': on ? 'true' : 'false', onClick }, label);

export const QUIZ_STYLES = {
  // one wide button for each answer, stacked: the default for a tap question
  rows: (def, q, answer, pick) => h('div.st-quizrows.st-pulse', { role: 'group', 'aria-label': 'Tap the one closest to you' },
    q.options.map(o => h('button.st-btn.st-collapseopt', { type: 'button', 'aria-pressed': String(answer) === String(o.id) ? 'true' : 'false', onClick: () => pick(o.id) }, o.label))),
  // the taps of a statement side by side (stacked on a phone): the default for a statement
  scale: (def, q, answer, pick) => h(`div.st-quizscale.st-pulse${def.scale.length === 3 ? '.three' : ''}`, { role: 'group', 'aria-label': 'How much do you agree?' },
    def.scale.map(([v, l]) => chip(l, answer === v, () => pick(v)))),
};
export const styleOf = q => (QUIZ_STYLES[q.style] ? q.style : q.options ? 'rows' : 'scale');

// One question. o: { def, q, n (0-based), of, answer, onPick, onBack?, eyebrow?, progress? (an element), extra? (buttons) }
export function askCard(o) {
  const { def, q, n, of } = o;
  return h('div.st-card', { id: 'ask' }, h('div.st-eyebrow', {}, o.eyebrow ?? `${def.name}: ${n + 1} of ${of}`),
    o.progress ?? h('div.st-collapse', { 'aria-hidden': 'true' }, h('b', { style: { width: `${n / of * 100}%` } })),
    h('h2.st-quizq', {}, q.ask ?? q.text), QUIZ_STYLES[styleOf(q)](def, q, o.answer, o.onPick),
    h('div.st-row', { style: { marginTop: '12px' } }, n > 0 && o.onBack ? btn('‹ Back one', o.onBack, 'slim') : null, o.extra ?? null));
}
// The first screen of a skin: what it is, the note that it is a game lens, and Start.
export function introCard({ def, taps, onStart, onList }) {
  return h('div.st-card.hero', { id: 'ask' }, h('div.st-eyebrow', {}, def.playful ? 'Playful: for fun' : 'A game lens'), h('h2', { style: { margin: '0 0 6px' } }, def.name),
    (def.intro || [def.blurb]).map(l => h('p', { style: { margin: '0 0 6px' } }, l)), h('p.st-small.st-soft', {}, def.note),
    h('div.st-row', {}, btn(`Start: ${taps.max} taps`, onStart, 'primary big'), btn('All quizzes', onList, 'slim')));
}
const LEVEL_TAG = { Guess: 'st-tag', Close: 'st-tag', Exact: 'st-tag.yours' };
// The result card. N: lensNow(...). routes: data/quiz/routes.json (the names of the skills and readings). on: the taps.
export function resultCard({ N, routes, on }) {
  const { def, R, card, feed, st, mineOnly } = N, conf = R.confidence, nx = card.next || {}, RT = routes || { skills: {}, trees: {}, readings: {} };
  const sk = nx.skill && RT.skills[nx.skill], tree = nx.tree && RT.trees[nx.tree];
  const more = card.skills.filter(id => id !== nx.skill && RT.skills[id]), trees = card.trees.filter(t => t !== nx.tree && RT.trees[t]), reads = card.readings.filter(id => RT.readings[id]);
  const element = !feed ? null : feed.ask && st.kept === feed.to ? h('p.st-readout', { role: 'status' }, `This leans toward ${feed.to}. You kept ${feed.keep ?? 'what you had'}.`)
    : feed.ask ? h('div.st-field', { id: 'element' }, h('div.st-flabel', {}, feed.line), h('div.st-row', {}, btn(feed.keep ? `Keep ${feed.keep}` : 'Not now', on.keep, 'slim'), btn(`Switch to ${feed.to}`, on.switch, 'slim')),
      h('div.st-small.st-soft', { style: { marginTop: '4px' } }, 'Nothing changes until you tap.'))
      : h('p.st-readout', { role: 'status', id: 'element' }, feed.line);
  return h('div.st-card.hero', { id: 'answer' }, h('div.st-eyebrow', {}, def.playful ? `${def.name}: for fun` : def.name), h('h2', { style: { margin: '0 0 6px' } }, card.title),
    conf ? h('p.st-small', { style: { margin: '0 0 8px' } }, h(`span.${LEVEL_TAG[conf.level]}`, { title: conf.why }, conf.level), ` ${conf.word}. `, card.also ? (card.tie ? `A close call between this one and ${card.also.name}. Both are shown.` : `Second: ${card.also.name}.`) : '') : null,
    card.lines.map(l => h('p', { style: { margin: '0 0 6px' } }, l)),
    h('div.st-readout', {}, h('strong', {}, 'The light side'), h('div', {}, card.light)),
    element,
    h('div.st-field', {}, h('div.st-flabel', {}, 'One next step'),
      sk ? h('div', {}, h('div', {}, h('strong', {}, nx.label)), h('div.st-small.st-soft', {}, `Skill: ${sk.name} (${sk.treeName}, level ${sk.level}). ${sk.what ?? ''}`)) : tree ? h('div', {}, h('strong', {}, nx.label)) : h('div', {}, nx.label),
      h('div.st-row', { style: { marginTop: '8px' } }, btn('Open the skill tree', on.skills, 'primary'))),
    more.length || trees.length || reads.length ? h('details.st-fold', {}, h('summary', {}, 'More for this result'),
      more.length || trees.length ? h('ul', {}, more.map(id => h('li', {}, `Skill: ${RT.skills[id].name} (${RT.skills[id].treeName})`)), trees.map(t => h('li', {}, `Skill tree: ${RT.trees[t].name}`))) : null,
      reads.map(id => h('p.st-small', {}, h('strong', {}, `A short read. People say: "${RT.readings[id].advice}" `), RT.readings[id].line))) : null,
    h('details.st-fold', {}, h('summary', {}, 'Show the math'), h('ul.st-small', {}, R.ranked.filter(r => r.score > 0).map(r => h('li', {}, `${r.name}: ${r.score}`)), h('li', {}, def.core.how), conf ? h('li', {}, `${conf.word} (${conf.level}): ${conf.why}`) : null)),
    h('p.st-small.st-soft', {}, card.note),
    h('div.st-field', {}, h('div.st-flabel', {}, `Who sees this: ${mineOnly ? 'Me only' : 'Me, and anyone I send a shared copy'}`),
      h('div.st-row', {}, chip('Me only', mineOnly, () => on.show(false)), chip('Show it in shared copies', !mineOnly, () => on.show(true))),
      h('div.st-small.st-soft', { style: { marginTop: '4px' } }, 'Me only keeps it out of every shared copy. It stays in your own save link, like your numbers.')),
    h('div.st-row', { style: { marginTop: '10px' } }, st.ok ? null : btn('That is me', on.confirm, 'slim'), btn('Take it again', on.again, 'slim'), btn('All quizzes', on.list, 'slim')));
}
// The list of skins. rows: [{ def, N }]. A placeholder shows as "Coming soon" with no button.
export function listCard({ rows, element, elementFrom, onOpen, onChart, open = false }) {
  return h('div.st-card', { id: 'lenses' }, h('details.st-lenses', open ? { open: '' } : {}, h('summary', {}, h('strong', {}, `More quizzes (${rows.filter(r => !r.def.soon).length})`), h('span.st-small.st-soft', {}, ' Each one is a game lens, not a test.')),
    element ? h('p.st-small', { id: 'element-now' }, `Your element: ${element} (${elementFrom}).`) : null,
    h('ul.st-hub', { style: { marginTop: '10px' } },
      onChart ? h('li', {}, h('button.st-hubcard', { type: 'button', onClick: onChart, style: { width: '100%', textAlign: 'left', font: 'inherit', cursor: 'pointer' } }, h('span.st-hubnum', { 'aria-hidden': 'true' }, '☉'), h('span', {}, h('strong', {}, 'The Money Chart'), h('small', {}, 'Ten taps. Your five money muscles.')), h('span.st-hubword', {}, 'View'))) : null,
      rows.map(({ def, N }, i) => h('li', {}, def.soon
        ? h('div.st-hubcard.soon', { 'aria-disabled': 'true' }, h('span.st-hubnum', { 'aria-hidden': 'true' }, String(i + 1)), h('span', {}, h('strong', {}, def.name), h('small', {}, def.blurb)), h('span.st-hubword', {}, 'Coming soon'))
        : h('button.st-hubcard', { type: 'button', onClick: () => onOpen(def.id), style: { width: '100%', textAlign: 'left', font: 'inherit', cursor: 'pointer' } }, h('span.st-hubnum', { 'aria-hidden': 'true' }, String(i + 1)),
          h('span', {}, h('strong', {}, def.name), h('small', {}, N.card ? N.card.title : def.blurb)), h('span.st-hubword', {}, N.card ? 'View' : `${N.taps.max} taps`)))))));
}
