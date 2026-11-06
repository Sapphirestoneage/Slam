// SPDX-License-Identifier: AGPL-3.0-only
// Batch 41 (M9R, docs/engines/ranges.md): the quiet line under a key number, "Likely Mar 2041, could be Aug 2039 to
// Jan 2044". The likely number stays the big one; the line shows only when the inputs not known yet move it a
// material amount (js/math/ranges.js decides, this file only places it). Coach view always; client view follows the
// typical-at-your-age switch (QUESTIONS 208: both, with a switch). In coach view the line is a button: a tap names the
// two inputs widening it most, each with a button to its box. Client view reads the line only (the drivers are the
// coach's, ranges.md).
import { h, icon } from './dom.js';
import { popover, closePop, button } from './staples.js';
import { typicalInClient } from './typical-ui.js';
import { rangeWordsOf, fooWordsOf } from '../math/ranges.js';

let APP = null;
export const startRanges = app => { APP = app; };

const shows = ctx => !!APP && (!APP.prefs?.clientView || typicalInClient(ctx.store.doc));

function open(d) {
  closePop();
  APP?.goFound({ kind: 'word', route: d.route, id: d.recId, focus: d.focus ?? `${d.recId}:${d.field}` });
}
function lineEl(w, label) {
  if (APP?.prefs?.clientView || !w.drivers.length) return h('span.range-line.muted.small', { 'data-range': label }, w.line);
  const b = h('button.range-line.link-btn.small', { type: 'button', 'data-range': label, 'aria-label': `${w.line}. What widens it`, title: 'What widens it' }, w.line, icon('info'));
  b.onclick = e => {
    e.stopPropagation();
    popover(b, h('div.stack.range-pop', { style: { gap: '8px' } }, h('strong', {}, 'Widening it most'),
      ...w.drivers.map(d => h('div.row-line.range-driver', { style: { gap: '10px' } }, h('span', { style: { flex: '1 1 auto' } }, d.words),
        button('Open the box', { size: 'small', iconName: 'right', onClick: () => open(d) }))),
      h('p.muted.small', { style: { margin: 0 } }, w.drivers.length === 1 ? 'Pinning this down narrows it.' : 'Pinning these down narrows it.')), { width: 380 });
  };
  return b;
}

// key: fi, debtFree, efMonths, surplus or netWorth. r: a range other than the household's own (rarely needed).
export function rangeLine(ctx, key, { r = null } = {}) {
  if (!shows(ctx)) return null;
  const R = ctx.ranges?.();
  const w = rangeWordsOf(key, r ?? R?.[key], { now: ctx.now() });
  return w ? lineEl(w, key) : null;
}
// The FOO step's line, when one input could move the step.
export function fooRangeLine(ctx) {
  if (!shows(ctx)) return null;
  const w = fooWordsOf(ctx.fooRange?.(APP?.flags ?? []));
  return w ? lineEl(w, 'foo') : null;
}
// The likely value's words for a sentence: "around Mar 2041" when a range shows, "in Mar 2041" when it does not.
export function rangeShown(ctx, key) {
  const R = ctx.ranges?.();
  return !!rangeWordsOf(key, R?.[key], { now: ctx.now() });
}
