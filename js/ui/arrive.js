// SPDX-License-Identifier: AGPL-3.0-only
// Arrive and highlight (batch 6, item 2): any jump (an agenda item, Open, What's missing, Fix it, a nudge, a counter)
// lands on the screen, scrolls to the first field that needs work, outlines and focuses it, and shows a toast at the
// top: On this screen: a · b · Show me, with Next › through each missing field and Back to the agenda. No toast when
// nothing needs fixing. The list comes from the same completion logic as What's missing (listCompletion).
// Batch 7, item 3: the toast says where to find the number; it closes when you leave the screen; it looks again after
// every save, so a filled or parked field drops off and the last one ends with "All set on this screen"; Show me
// opens the row's Details when the box is inside it and outlines the box, not the row.
import { h, icon } from './dom.js';
import * as S from './staples.js';
import { missingFor, routeKey, MISSING } from '../completion.js';
export { missingFor, routeKey, MISSING };

let toastEl = null, state = null;
const unglow = () => document.querySelectorAll('.glow').forEach(el => el.classList.remove('glow'));
const closeToast = () => { toastEl?.remove(); toastEl = null; state?.off?.(); state = null; unglow(); };
// Go to a route, then light up the first thing that needs work there. only: one item to light up instead of the list.
// items: a list of your own (a Next step reason), kept as given and not re-checked.
export function arrive(app, route, { from = null, only = null, items = null } = {}) {
  const back = from ?? (location.hash.startsWith('#/home/') ? location.hash : null);
  closeToast();
  if (route && location.hash !== route) app.go(route); else app.render();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const list = items ?? (only ? [only] : missingFor(app.ctx, route));
    if (!list.length) return;
    state = { app, route: route || location.hash, list, i: 0, back: back || '#/home/session', only, fixed: !!items, off: null };
    // After every save, look again (item 3): the list is what is still missing now.
    if (!items) state.off = app.store?.subscribe?.(() => { if (state) requestAnimationFrame(() => requestAnimationFrame(recheck)); }) ?? null;
    show();
  }));
}
function recheck() {
  if (!state || state.fixed) return;
  const was = state.list[state.i];
  const now = missingFor(state.app.ctx, state.route);
  const keep = state.only ? now.filter(it => it.id === state.only.id && it.field === state.only.field) : now;
  if (!keep.length) { closeToast(); S.toast('All set on this screen.'); return; }
  if (keep.length === state.list.length && keep.every((it, i) => it.id === state.list[i].id && it.field === state.list[i].field)) return;
  state.list = keep;
  const same = keep.findIndex(it => it.id === was?.id && it.field === was?.field);
  state.i = same >= 0 ? same : Math.min(state.i, keep.length - 1);
  show({ scroll: false });
}
// The row's Details caret, when the box is inside the panel that is still closed.
const caretOf = row => row?.querySelector('td.col-actions button.caret[aria-expanded="false"]') ?? null;
function target(it) {
  const field = it.focus ? document.querySelector(`[data-focus="${CSS.escape(it.focus)}"]`) : null;
  const row = it.id ? document.querySelector(`tr[data-id="${CSS.escape(it.id)}"]`) : null;
  if (row?.hidden) document.querySelector(`tr.group[data-group="${CSS.escape(row.dataset.group)}"] button.fold`)?.click();
  if (field) return field.matches('input,select,button') ? field.closest('label.field, .seg') ?? field : field;
  return row ?? null;
}
function show({ scroll = true } = {}) {
  if (!state) return;
  const { list, i } = state, it = list[i];
  unglow();
  let el = target(it);
  if (!el?.matches('label.field, .seg, .stack, .row-line, input, select') && it.focus) { // the box is inside a closed Details panel: open it, then look again
    const caret = caretOf(el);
    if (caret) { caret.click(); requestAnimationFrame(() => { const inner = target(it); if (inner && inner !== el) { el.classList.remove('glow'); light(inner, scroll); } }); }
  }
  if (el) light(el, scroll);
  const names = list.map(x => `${x.name}${x.word ? ` (${x.word})` : ''}`);
  const shown = names.length > 3 ? [...names.slice(0, 3), `+${names.length - 3} more`] : names;
  toastEl?.remove();
  toastEl = h('div.toast.arrive', { role: 'status' },
    h('span.stack', { style: { gap: '2px' } }, h('span', {}, h('strong', {}, 'On this screen: '), shown.join(' · ')),
      it.where ? h('span.small', { style: { opacity: .85 } }, `${it.name.split(': ').pop()}: look on ${it.where}`) : null),
    h('button.btn', { type: 'button', onclick: () => show() }, 'Show me'),
    list.length > 1 ? h('button.btn', { type: 'button', onclick: () => { state.i = (state.i + 1) % state.list.length; show(); } }, `Next › (${i + 1} of ${list.length})`) : null,
    h('button.btn', { type: 'button', onclick: () => { const to = state.back; closeToast(); location.hash = to; } }, 'Back to the agenda'),
    h('button.icon-btn.tiny', { type: 'button', 'aria-label': 'Close', onclick: closeToast }, icon('x')));
  document.body.append(toastEl);
}
function light(el, scroll) {
  el.classList.add('glow');
  if (scroll) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  (el.matches('input,select,button') ? el : el.querySelector('input,select,button'))?.focus({ preventScroll: true });
}
export const arriving = () => !!state;
export { closeToast as closeArrive };
// Leaving the screen closes the toast (item 3): "On this screen" is only ever about this screen.
if (typeof window !== 'undefined') window.addEventListener('hashchange', () => { if (state && location.hash !== state.route) closeToast(); });

// A counter that lists what is left (item 3): "N left: Phone (Rough) [Fix it]". items: [{ name, word, route, focus, id }].
export function leftPopover(app, anchor, items, { title = null } = {}) {
  if (!items.length) { S.toast('Nothing left here.'); return; }
  S.popover(anchor, h('div.stack', { style: { gap: '6px' } }, h('strong', {}, title ?? `${items.length} left`),
    ...items.slice(0, 12).map(it => h('div.row-line', { style: { gap: '8px' } }, h('span', { style: { flex: 1 } }, it.name, it.word ? h('span.muted.small', {}, ` (${it.word})`) : null),
      S.button('Fix it', { size: 'small', iconName: 'right', onClick: () => { S.closePop(); arrive(app, it.route ?? location.hash, { only: it }); } }))),
    items.length > 12 ? h('span.muted.small', {}, `and ${items.length - 12} more`) : null), { width: 340 });
}
