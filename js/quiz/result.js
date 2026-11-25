// SPDX-License-Identifier: AGPL-3.0-only
// The money sins, Part 2 (results and growth), in the web app (quiz.html, above the read). Drawing only: every word
// comes from js/math/sins.js (snCard, snShareCard, snCouple, snDate, snGrowth, snRetakeDue) and the skin's `grow`
// block. Tap-only; the extra parts are collapsed until opened. Private by default: the share card is made only on a
// tap and carries no number; the couple part shows only when both people turned on sharing with each other.
import { h } from '../ui/dom.js';
import { snShareCard } from '../math/sins.js';

const btn = (label, onClick, kind = '') => h(`button.st-btn${kind ? '.' + kind.split(' ').join('.') : ''}`, { type: 'button', onClick }, label);
const chip = (label, on, onClick) => h('button.st-chip', { type: 'button', 'aria-pressed': on ? 'true' : 'false', onClick }, label);
const fold = (title, ...body) => h('details.st-fold', {}, h('summary', {}, title), ...body);

// One family on the card: the trait, its light side, the virtue that answers it.
const part = (label, p) => h('div.st-field', { 'data-sn': `card-${p.id}` },
  h('div.st-flabel', {}, label, ' ', h('span.st-tag', {}, p.level)),
  h('p', { style: { margin: '0 0 4px' } }, h('strong', {}, p.name), p.second ? h('span.st-small.st-soft', {}, `  (second: ${p.second})`) : null),
  h('p.st-small', { style: { margin: '0 0 4px' } }, `The light side: ${p.light}`),
  h('p.st-small', { style: { margin: 0 } }, h('strong', {}, `The virtue that answers it: ${p.virtue.name}. `), p.virtue.line));

// THE result card. o: { def, card, share (the share card, when made), on: { share, unshare, copy } }
export function sinsResultCard({ def, card, share = null, on }) {
  if (!card) return null;
  const M = card.move;
  return h('div.st-card.hero', { id: 'sins-card', 'data-sn': 'card' },
    h('div.st-eyebrow', {}, card.head),
    h('h2', { style: { margin: '0 0 4px' } }, card.arch.name),
    h('p', { style: { margin: '0 0 8px' } }, card.arch.line),
    h('p.st-small.st-soft', { style: { margin: '0 0 8px' } }, card.early ? 'A family marked Guess is an early read: your own months of money firm it up or change it.' : 'Both families have a label: two sources agree over about a month of your money.'),
    part('Main pull', card.sin), part('Main way of refusing change', card.change),
    M ? h('div.st-field', { 'data-sn': 'move' }, h('div.st-flabel', {}, M.title),
      h('p', { style: { margin: '0 0 4px' } }, h('strong', {}, M.name)), h('p.st-small', { style: { margin: '0 0 4px' } }, M.how),
      M.turn ? h('p.st-small', { style: { margin: '0 0 4px' } }, `Recalculating says: ${M.turn}`) : null,
      h('p.st-small.st-soft', { style: { margin: 0 } }, M.started ? 'Started. Test the fix, below, keeps the month.' : 'Start it under Test the fix, below.')) : null,
    h('div.st-field', {}, h('div.st-flabel', {}, 'A card to share'),
      share ? shareBox(share, on) : h('div', {}, btn('Make a share card', on.share, 'slim'),
        h('div.st-small.st-soft', { style: { marginTop: '4px' } }, 'Only the name and the plain words. No number, no check-in, nothing you told us. Nothing leaves until you send it.'))),
    fold('Show the math', h('ul.st-small', {},
      h('li', {}, 'The name is made of two parts: your way of dodging change, then your main pull. Seven pulls and twelve ways make 84 names.'),
      h('li', {}, 'The move is the defense of the month from your read. It is one move, for one month.'),
      h('li', {}, 'No number on this card is about money. What a pattern costs lives only in the Mistake audit (opt-in).'))));
}
// The share card itself, and the two ways to send it.
function shareBox(S, on) {
  return h('div', { 'data-sn': 'share' },
    h('div.st-card', { style: { margin: '0 0 8px', padding: '12px' }, 'aria-label': 'Share card' },
      h('div.st-eyebrow', {}, 'The money sins'), h('strong', {}, S.title),
      ...S.lines.map(l => h('p.st-small', { style: { margin: '4px 0 0' } }, l)), h('p.st-small.st-soft', { style: { margin: '6px 0 0' } }, S.foot)),
    h('div.st-row', {}, btn('Send it', on.send, 'primary slim'), btn('Copy the words', on.copy, 'slim'), btn('Put it away', on.unshare, 'slim')),
    h('p.st-small', { id: 'sins-sent', role: 'status', style: { margin: '6px 0 0' } }, ''));
}
// The share card's text, for the caller's send and copy.
export const sinsShareOf = (def, card) => snShareCard(def, card);

// The retake each quarter: a gentle line, and "Not this quarter".
export function sinsRetakeCard({ due, on }) {
  if (!due || !due.due) return null;
  return h('div.st-card', { 'data-sn': 'retake' }, h('div.st-flabel', {}, 'A quarter has passed'),
    h('p.st-small', { style: { margin: '0 0 6px' } }, `${due.why} Retake the fifteen taps to see how your read has moved. Your read keeps everything else.`),
    h('div.st-row', {}, btn('Retake the quiz', on.retake, 'primary slim'), btn('Not this quarter', on.skip, 'slim')));
}
// Over the retakes: the sin weakening and the virtue growing.
export function sinsGrowthPart(G) {
  if (!G || !G.length) return null;
  return h('div.st-card', { 'data-sn': 'grow' }, fold('Over your retakes', h('ul.st-small', {}, G.map(g => h('li', { 'data-sn': `grow-${g.family}` }, g.line,
    g.takes > 1 ? h('div.st-soft', {}, g.series.map(x => `${Math.round(x.share * 100)}%`).join(' then ')) : null))),
  h('p.st-small.st-soft', {}, 'The share of each family\'s points held by the top of your first take, at each take.')));
}
// Couples: the switch to share with the partner, and, when both turned it on, the collision and the money date.
// o: { mate (this read's switch), other (the partner's part or null), names, couple (snCouple), date (snDate), step, on }
export function sinsCouplePart({ mate, otherName, couple, date, step = 0, on }) {
  const head = h('div.st-field', {}, h('div.st-flabel', {}, `Share my read with ${otherName}`),
    h('div.st-chips', {}, chip('Not shared', !mate, () => on.mate(false)), chip(`Share with ${otherName}`, !!mate, () => on.mate(true))),
    h('div.st-small.st-soft', { style: { marginTop: '4px' } }, `Only your two names (your main pull and way of dodging change) go to ${otherName}, and only once you both turn this on.`));
  if (!couple) return h('div.st-card', { 'data-sn': 'couple' }, h('div.st-eyebrow', {}, 'The two of you'), head,
    mate ? h('p.st-small', {}, `Waiting for ${otherName} to take the quiz and turn sharing on too.`) : null);
  const s = date[Math.min(step, date.length - 1)];
  return h('div.st-card', { 'data-sn': 'couple' }, h('div.st-eyebrow', {}, 'The two of you'),
    h('h3', { style: { margin: '0 0 4px' } }, `${couple.a.arch.name} and ${couple.b.arch.name}`),
    h('p.st-small', { style: { margin: '0 0 6px' } }, h('strong', {}, 'The pulls: '), couple.sin.line),
    h('p.st-small', { style: { margin: '0 0 6px' } }, h('strong', {}, 'Refusing change: '), couple.change.line),
    h('div.st-field', { 'data-sn': 'date' }, h('div.st-flabel', {}, `Your money date: ${s.n} of ${s.of}`),
      h('p', { style: { margin: '0 0 6px' } }, s.who ? h('strong', {}, `${s.who}: `) : null, s.line),
      h('div.st-row', {}, step > 0 ? btn('Back', () => on.step(step - 1), 'slim') : null,
        step < date.length - 1 ? btn('Next', () => on.step(step + 1), 'primary slim') : btn('Start again', () => on.step(0), 'slim'))),
    head);
}
