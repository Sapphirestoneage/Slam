// SPDX-License-Identifier: AGPL-3.0-only
// Batch 43 (M9Q, docs/engines/next-best.md): Ask me next and the certainty meter on Home. The math is
// js/math/nextbest.js; this file only places it. Ask next is one slim card for the coach: the question in plain words,
// why it matters in one line, one button that lands on the box (arrive.js, through the app's Find landing, so the box
// lights up and is never left under a sticky header), and the runner-up in one quiet line. Answering it changes the
// numbers, so the card names the next question by itself.
import { h } from './dom.js';
import * as S from './staples.js';
import { arrive } from './arrive.js';

// Land on the question's box: the box itself when there is one, else the screen's first missing box.
export function openQuestion(app, q) {
  app.trackerBack?.(location.hash);
  if (!q.recId && !q.focus) { arrive(app, q.route, { from: location.hash }); return; }
  app.goFound({ kind: 'word', route: q.route, id: q.recId, focus: q.focus });
}

export function askNextCard(app, ctx) {
  const A = ctx.askNext(app.flags ?? []);
  const q = A?.top;
  if (!q) return null;
  const then = A.runnerUp;
  return h('section.card.ask-next.coach-only', { 'aria-label': 'Ask next' },
    h('div.row-line.ask-top', {},
      h('span.label', {}, 'Ask next'),
      h('strong.ask-q', {}, q.question),
      h('span.spacer'),
      S.button('Open the box', { kind: 'primary', size: 'small', iconName: 'right', onClick: () => openQuestion(app, q) })),
    q.why ? h('p.muted.small.ask-why', {}, q.why) : null,
    then ? h('div.row-line.ask-then', {}, h('span.muted.small', {}, 'Then: ', then.question),
      S.button('Open', { size: 'small', iconName: 'right', onClick: () => openQuestion(app, then) })) : null);
}

// The certainty meter: how narrow the key ranges are (0 to 100), and a calm word for it.
export const meterWord = v => (v < 0.4 ? 'Still wide' : v < 0.75 ? 'Narrowing' : 'Narrow');
export function certaintyPoints(ctx, app) {
  const M = ctx.askNext(app?.flags ?? [])?.meter;
  return M ? Math.round(M.value * 100) : 0;
}
