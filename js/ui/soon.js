// SPDX-License-Identifier: AGPL-3.0-only
// Coming soon: a screen that is not ready never shows as a broken or blank page. The router (js/app.js) draws each
// screen through guardScreen(). A route with no screen, and a screen that throws while it draws, both end in one
// calm card with a way back. The card hides nothing: the error is kept in ERRORS (type slam.errors in the console),
// and it is thrown again after the card is on the page, so the console and the test tools still see it.
import { h } from './dom.js';

export const ERRORS = []; // the last 100: { at, where, msg }
export function record(e, where) {
  ERRORS.push({ at: new Date().toISOString(), where: String(where), msg: String(e?.message ?? e) });
  if (ERRORS.length > 100) ERRORS.shift();
}

export function soonCard({ home = '#/home/session' } = {}) {
  return h('div.card', { role: 'status', 'data-soon': '1' }, h('div.empty.center', {},
    h('span.title', {}, 'Coming soon'),
    h('span.muted', {}, 'This screen is not ready yet. Nothing of yours changed, and the rest of the app works as before.'),
    h('a.btn.primary', { href: home, style: { textDecoration: 'none' } }, 'Go to Home')));
}

const later = e => setTimeout(() => { throw e; }, 0); // on purpose: the error stays visible

// screen: the function of the route (or nothing, when the route has none). draw: () => what it returns.
// Returns the screen, or the card. `card` and `after` can be given by a test.
export function guardScreen(screen, draw, where, { card = soonCard, after = later } = {}) {
  if (typeof screen !== 'function') { record(new Error('No screen for this route'), where); return card(); }
  try { return draw(); }
  catch (e) { record(e, where); after(e); return card(); }
}
