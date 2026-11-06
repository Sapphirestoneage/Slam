// SPDX-License-Identifier: AGPL-3.0-only
// Walk me through (batch 14, item 5): one box at a time, TurboTax style. A slim bar at the bottom of the window says
// "3 of 14: Rent's due day" with Skip, Will get it and Next; the box is on screen, outlined and focused, and typing or
// tapping in it works as usual. Next saves what was typed and moves on; Esc or the x leaves. The stops come from
// js/walk.js and are worked out again at every step, so anything filled along the way drops off.
import { h, clear, icon } from './dom.js';
import * as S from './staples.js';
import { walkStops, parkStop } from '../walk.js';
import { land } from './arrive.js';
import { fastTrackDone } from '../fasttrack.js';
import { startFastTrack } from './fasttrack-ui.js';

const W = { on: false, passed: [], cur: null, bar: null, app: null, keys: null };
export const walking = () => W.on;

// Start: Fast Track first when it has not been finished, then the walk.
export function walkMeThrough(app, ctx) {
  if (!fastTrackDone(ctx.store.doc)) { startFastTrack(app, ctx, { then: () => walkMeThrough(app, ctx) }); return; }
  stopWalk({ quiet: true });
  Object.assign(W, { on: true, passed: [], cur: null, app });
  W.keys = e => { if (e.key === 'Escape' && W.on && !document.querySelector('.pop, .ft-overlay')) { e.preventDefault(); stopWalk(); } };
  document.addEventListener('keydown', W.keys);
  document.body.classList.add('walking');
  app.usage?.('walk', { step: 'start' });
  next(app);
}
function stopWalk({ quiet = false } = {}) {
  if (!W.on) return;
  const n = W.passed.length;
  W.on = false; W.bar?.remove(); W.bar = null; W.cur = null;
  document.removeEventListener('keydown', W.keys);
  document.body.classList.remove('walking'); document.body.style.removeProperty('--walk-room');
  if (!quiet) S.toast(n ? `Walk ended after ${n} ${n === 1 ? 'box' : 'boxes'}. Walk me through picks up where it left off.` : 'Walk ended.');
}
export { stopWalk };
// The next stop not passed yet (filled, skipped or parked ones drop off), landed on.
function next(app) {
  const stops = walkStops(app.ctx);
  const left = stops.filter(s => !W.passed.includes(s.key));
  if (!left.length) {
    stopWalk({ quiet: true });
    S.toast(W.passed.length ? `That is every box for now: ${W.passed.length} done or set aside.` : 'Nothing left to walk through: every core box has a number.', { action: { label: 'Back to Home', run: () => app.go('#/home/session') } });
    return;
  }
  W.cur = left[0];
  if (W.cur.open) S.openBlock(W.cur.open);
  land(app, W.cur.route, { id: W.cur.id, focus: W.cur.focus, parentCat: W.cur.parentCat ?? null });
  draw(app, W.passed.length + 1, W.passed.length + left.length);
}
function move(app, how) {
  const s = W.cur;
  if (!s) return;
  if (how === 'later') { if (parkStop(app.store, s)) S.toast(`${s.name}: on the homework list, with where to look.`, { undo: () => app.store.undo() }); }
  else document.activeElement?.dispatchEvent?.(new Event('change', { bubbles: true })); // Next keeps what was typed
  app.usage?.('walk', { step: how });
  W.passed.push(s.key);
  requestAnimationFrame(() => next(app));
}
function draw(app, n, of) {
  const s = W.cur;
  W.bar?.remove();
  W.bar = h('div.walk-bar', { role: 'region', 'aria-label': 'Walk me through' },
    h('span.walk-where', {}, h('strong', {}, `${n} of ${of}: `), s.name, h('span.muted.small', {}, ` · ${s.screen}`)),
    h('span.spacer'),
    h('button.btn.small', { type: 'button', onclick: () => move(app, 'skip'), title: 'Leave it empty for now; it stays on the list for next time' }, 'Skip'),
    s.park ? h('button.btn.small', { type: 'button', onclick: () => move(app, 'later'), title: 'Marks it Getting it and puts "Find: this" on the homework list' }, icon('clock'), 'Will get it') : null,
    h('button.btn.small.primary', { type: 'button', onclick: () => move(app, 'next') }, 'Next', icon('right')),
    h('button.icon-btn.tiny', { type: 'button', 'aria-label': 'Leave the walk (Esc)', 'data-tip': 'Leave the walk (Esc)', onclick: () => stopWalk() }, icon('x')));
  document.body.append(W.bar);
  // Sit just above the docked agenda bar when a session runs, so neither covers the other.
  const t = document.getElementById('tracker');
  const below = t && !t.hidden ? t.getBoundingClientRect().height : 0;
  W.bar.style.bottom = `${Math.round(below) + 10}px`;
  document.body.style.setProperty('--walk-room', `${Math.round(below + W.bar.getBoundingClientRect().height + 24)}px`);
}
// The button, on Home and in the docked agenda bar.
export function walkButton(app, ctx, { size = null, kind = 'secondary' } = {}) {
  const left = walkStops(ctx).length;
  return S.button(left ? `Walk me through (${left})` : 'Walk me through', { size, kind, iconName: 'right', tip: 'Every empty or rough box, one at a time', onClick: () => walkMeThrough(app, ctx) });
}
