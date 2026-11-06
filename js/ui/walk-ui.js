// SPDX-License-Identifier: AGPL-3.0-only
// Walk me through (batch 14, item 5): one box at a time, TurboTax style. A slim bar at the bottom of the window says
// "3 of 14: Rent's due day" with Skip, Will get it and Next; the box is on screen, outlined and focused, and typing or
// tapping in it works as usual. Next saves what was typed and moves on; Esc or the x leaves. The stops come from
// js/walk.js and are worked out again at every step, so anything filled along the way drops off.
import { h, clear, icon } from './dom.js';
import * as S from './staples.js';
import { walkStops, parkStop, useStopTypical, makeStopRows, askStopOf } from '../walk.js';
import { ensureCategories } from '../presets.js';
import { land } from './arrive.js';
import { fastTrackDone } from '../fasttrack.js';
import { startFastTrack } from './fasttrack-ui.js';
import { startSession, inSession } from '../program.js';

const W = { on: false, passed: [], made: [], cur: null, bar: null, app: null, keys: null, off: null, soon: false, quiet: false, ask: null };
export const walking = () => W.on;

// Start: Fast Track first when it has not been finished, then the walk.
export function walkMeThrough(app, ctx) {
  if (!fastTrackDone(ctx.store.doc)) { startFastTrack(app, ctx, { then: () => walkMeThrough(app, ctx) }); return; }
  stopWalk({ quiet: true });
  Object.assign(W, { on: true, passed: [], made: [], cur: null, app });
  ensureCategories(ctx.store); // the Budget's category rows, so a category stop can offer Use typical from the first one
  // Batch 48 (QUESTIONS 373): the first stop is Ask next's question, as Home shows it now; then the walk as before.
  W.ask = askStopOf(ctx.askNext?.(app.flags ?? [])?.top ?? null);
  // Batch 18: a tap that answers the box (Have it?, a pick, Use typical) or a typed number moves on by itself; Next
  // stays for keeping what is there. Only a change that fills the current box moves on.
  // Eli, Nov 6 ("when I click on a cell it knocks me back up"): only a change made in the walk's own box moves the
  // walk on. A tap somewhere else on the page (another chip on About you, say) leaves the walk, and the page, where they are.
  W.off = ctx.store.subscribe(() => { if (W.on && W.cur && !W.quiet && !W.soon && inCurrentBox(W.last)) { W.soon = true; requestAnimationFrame(() => requestAnimationFrame(() => { W.soon = false; filledNow(app); })); } });
  W.tapTrack = e => { W.last = e.target; };
  document.addEventListener('pointerdown', W.tapTrack, true); document.addEventListener('focusin', W.tapTrack, true);
  W.keys = e => { if (e.key === 'Escape' && W.on && !document.querySelector('.pop, .ft-overlay')) { e.preventDefault(); stopWalk(); } };
  document.addEventListener('keydown', W.keys);
  document.body.classList.add('walking');
  app.usage?.('walk', { step: 'start' });
  next(app);
}
function stopWalk({ quiet = false } = {}) {
  if (!W.on) return;
  const n = W.passed.length;
  W.on = false; W.bar?.remove(); W.bar = null; W.cur = null; W.off?.(); W.off = null;
  document.removeEventListener('keydown', W.keys);
  if (W.tapTrack) { document.removeEventListener('pointerdown', W.tapTrack, true); document.removeEventListener('focusin', W.tapTrack, true); }
  document.body.classList.remove('walking'); document.body.style.removeProperty('--walk-room');
  if (!quiet) S.toast(n ? `Walk ended after ${n} ${n === 1 ? 'box' : 'boxes'}. Walk me through picks up where it left off.` : 'Walk ended.');
}
export { stopWalk };
// The next stop not passed yet (filled, skipped or parked ones drop off), landed on.
function next(app) {
  const stops = walkStops(app.ctx, { ask: W.ask });
  const left = stops.filter(s => !W.passed.includes(s.key) && !W.made.includes(s.key));
  if (!left.length) {
    stopWalk({ quiet: true });
    S.toast(W.passed.length ? `That is every box for now: ${W.passed.length} done or set aside.` : 'Nothing left to walk through: every core box has a number.', { action: { label: 'Back to Home', run: () => app.go('#/home/session') } });
    return;
  }
  // Session 1's Health and Life rows are made here (no tap), then the walk lands on the first one's Have it?.
  if (left[0].make) { W.quiet = true; const n = makeStopRows(app.store, left[0]); W.quiet = false; // the stop drops off by itself once the rows exist
    if (n) S.toast('Added Health and Life insurance; the rest of the usual list comes later.', { undo: () => app.store.undo() });
    W.made.push(left[0].key); // once per walk, even if Undo takes the rows back
    next(app); return; }
  W.cur = left[0];
  if (W.cur.open) S.openBlock(W.cur.open);
  land(app, W.cur.route, { id: W.cur.id, focus: W.cur.focus, parentCat: W.cur.parentCat ?? null });
  draw(app, W.passed.length + 1, W.passed.length + left.reduce((n, x) => n + (x.make ? x.make.length : 1), 0)); // rows the walk makes count as the boxes they become
}
// Was the last tap or focus inside the walk's current box (its control, the walk bar, or the row it sits in)?
function inCurrentBox(el) {
  if (!el || !W.cur) return false;
  if (W.bar?.contains?.(el)) return true;
  const box = W.cur.focus ? document.querySelector(`[data-focus="${CSS.escape(W.cur.focus)}"]`) : null;
  const scope = box?.closest?.('label.field, .seg, .picks, .stack, tr.row, .row-line') ?? box;
  if (scope?.contains?.(el)) return true;
  const row = W.cur.id ? document.querySelector(`tr[data-id="${CSS.escape(W.cur.id)}"]`) : null;
  return !!row?.contains?.(el) || !!el.closest?.('.glow');
}
// The current box got its answer (it dropped off the list): count it and go on.
function filledNow(app) {
  if (!W.on || !W.cur) return;
  if (walkStops(app.ctx, { ask: W.ask }).some(x => x.key === W.cur.key)) return;
  W.passed.push(W.cur.key);
  app.usage?.('walk', { step: 'filled' });
  next(app);
}
function move(app, how) {
  const s = W.cur;
  if (!s) return;
  W.quiet = true; // a button press moves on once, here
  if (how === 'later') { if (parkStop(app.store, s)) S.toast(`${s.name}: on the homework list, with where to look.`, { undo: () => app.store.undo() }); }
  else if (how === 'typical') useStopTypical(app.store, s);
  else document.activeElement?.dispatchEvent?.(new Event('change', { bubbles: true })); // Next keeps what was typed
  app.usage?.('walk', { step: how });
  W.quiet = false;
  W.passed.push(s.key);
  requestAnimationFrame(() => next(app));
}
function draw(app, n, of) {
  const s = W.cur;
  W.bar?.remove();
  W.bar = h('div.walk-bar', { role: 'region', 'aria-label': 'Walk me through' },
    h('span.walk-where', {}, h('strong', {}, `${n} of ${of}: `), s.ask ? h('span.tag.plain.walk-ask', { title: 'The one answer that narrows the plan most right now (Home, Ask next)' }, 'Ask next') : null, s.ask ? ' ' : null, s.name,
      h('span.muted.small', {}, ` · ${s.why ? `${s.why} · ` : ''}${s.screen}`)),
    h('span.spacer'),
    // Batch 18: the typical answer is the first tap (Use typical $X, or the filing status the household implies).
    s.typical ? h('button.btn.small.primary', { type: 'button', 'data-focus': 'walk:typical', title: s.typical.why, onclick: () => move(app, 'typical') }, s.typical.label) : null,
    h('button.btn.small', { type: 'button', onclick: () => move(app, 'skip'), title: 'Leave it empty for now; it stays on the list for next time' }, 'Skip'),
    s.park ? h('button.btn.small', { type: 'button', onclick: () => move(app, 'later'), title: 'Marks it Getting it and puts "Find: this" on the homework list' }, icon('clock'), 'Will get it') : null,
    h(`button.btn.small${s.typical ? '' : '.primary'}`, { type: 'button', onclick: () => move(app, 'next') }, 'Next', icon('right')),
    h('button.icon-btn.tiny', { type: 'button', 'aria-label': 'Leave the walk (Esc)', 'data-tip': 'Leave the walk (Esc)', onclick: () => stopWalk() }, icon('x')));
  document.body.append(W.bar);
  // Sit just above the docked agenda bar (and the phone tab bar), so neither covers the other; a toast sits above the
  // walk bar (S.toast measures the same stack). Batch 18, item 6.
  const below = S.dockedHeight({ without: W.bar });
  W.bar.style.bottom = `${below + 10}px`;
  document.body.style.setProperty('--walk-room', `${Math.round(below + W.bar.getBoundingClientRect().height + 24)}px`);
  const t = document.querySelector('.toast:not(.arrive)');
  if (t) t.style.setProperty('bottom', `${S.dockedHeight() + 10}px`, 'important');
}
// Start session 1 (batch 14, item 6): starts the session, runs Fast Track, then Walk me through. Batch 18: also the
// New client popup's first button, so a new client is one tap from Fast Track.
export function startSessionOne(app, ctx) {
  if (!inSession(ctx.store.doc)) startSession(ctx.store, ctx.ref, { now: ctx.now(), flags: app.flags });
  app.usage?.('start', { session: 1 });
  startFastTrack(app, ctx, { then: () => walkMeThrough(app, ctx) });
}
// The button, on Home and in the docked agenda bar.
export function walkButton(app, ctx, { size = null, kind = 'secondary' } = {}) {
  const left = walkStops(ctx).length;
  return S.button(left ? `Walk me through (${left})` : 'Walk me through', { size, kind, iconName: 'right', tip: 'Every empty or rough box, one at a time', onClick: () => walkMeThrough(app, ctx) });
}
