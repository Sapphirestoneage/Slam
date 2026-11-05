// SPDX-License-Identifier: AGPL-3.0-only
// Arrive and highlight (batch 6, item 2): any jump (an agenda item, Open, What's missing, Fix it, a nudge, a counter)
// lands on the screen, scrolls to the first field that needs work, outlines and focuses it, and shows a toast at the
// top: On this screen: a · b · Show me, with Next › through each missing field and Back to the agenda. No toast when
// nothing needs fixing. The list comes from the same completion logic as What's missing (listCompletion).
import { h, icon } from './dom.js';
import * as S from './staples.js';
import { missingFor, routeKey, MISSING } from '../completion.js';
export { missingFor, routeKey, MISSING };

let toastEl = null, state = null;
const closeToast = () => { toastEl?.remove(); toastEl = null; state = null; document.querySelectorAll('.glow').forEach(el => el.classList.remove('glow')); };
// Go to a route, then light up the first thing that needs work there. only: one item to light up instead of the list.
export function arrive(app, route, { from = null, only = null, items = null } = {}) {
  const back = from ?? (location.hash.startsWith('#/home/') ? location.hash : null);
  if (route && location.hash !== route) app.go(route); else app.render();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const list = items ?? (only ? [only] : missingFor(app.ctx, route));
    if (!list.length) { closeToast(); return; }
    state = { app, list, i: 0, back: back || '#/home/session' };
    show();
  }));
}
function target(it) {
  const field = it.focus ? document.querySelector(`[data-focus="${CSS.escape(it.focus)}"]`) : null;
  const row = it.id ? document.querySelector(`tr[data-id="${CSS.escape(it.id)}"]`) : null;
  if (row?.hidden) document.querySelector(`tr.group[data-group="${CSS.escape(row.dataset.group)}"] button.fold`)?.click();
  return field?.closest('label.field, .seg, td') ?? field ?? row ?? null;
}
function show() {
  if (!state) return;
  const { list, i } = state, it = list[i];
  document.querySelectorAll('.glow').forEach(el => el.classList.remove('glow'));
  const el = target(it);
  if (el) { el.classList.add('glow'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); (el.matches('input,select,button') ? el : el.querySelector('input,select,button'))?.focus({ preventScroll: true }); }
  const names = list.map(x => `${x.name}${x.word ? ` (${x.word})` : ''}`);
  const shown = names.length > 3 ? [...names.slice(0, 3), `+${names.length - 3} more`] : names;
  toastEl?.remove();
  toastEl = h('div.toast.arrive', { role: 'status' },
    h('span', {}, h('strong', {}, 'On this screen: '), shown.join(' · ')),
    h('button.btn', { type: 'button', onclick: show }, 'Show me'),
    list.length > 1 ? h('button.btn', { type: 'button', onclick: () => { state.i = (state.i + 1) % state.list.length; show(); } }, `Next › (${i + 1} of ${list.length})`) : null,
    h('button.btn', { type: 'button', onclick: () => { const to = state.back; closeToast(); state = null; location.hash = to; } }, 'Back to the agenda'),
    h('button.icon-btn.tiny', { type: 'button', 'aria-label': 'Close', onclick: closeToast }, icon('x')));
  document.body.append(toastEl);
}
export const arriving = () => !!state;
export { closeToast as closeArrive };

// A counter that lists what is left (item 3): "N left: Phone (Rough) [Fix it]". items: [{ name, word, route, focus, id }].
export function leftPopover(app, anchor, items, { title = null } = {}) {
  if (!items.length) { S.toast('Nothing left here.'); return; }
  S.popover(anchor, h('div.stack', { style: { gap: '6px' } }, h('strong', {}, title ?? `${items.length} left`),
    ...items.slice(0, 12).map(it => h('div.row-line', { style: { gap: '8px' } }, h('span', { style: { flex: 1 } }, it.name, it.word ? h('span.muted.small', {}, ` (${it.word})`) : null),
      S.button('Fix it', { size: 'small', iconName: 'right', onClick: () => { S.closePop(); arrive(app, it.route ?? location.hash, { only: it }); } }))),
    items.length > 12 ? h('span.muted.small', {}, `and ${items.length - 12} more`) : null), { width: 340 });
}
