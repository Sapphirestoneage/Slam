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
import { missingFor, routeKey, MISSING, rowsOn } from '../completion.js';
import { openAround } from './sections.js';
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
  if (!keep.length) { closeToast(); S.toast(rowsOn(state.app.ctx, state.route) === 0 ? 'Nothing on this screen yet: add a row to start.' : 'All set on this screen.'); return; } // batch 8 (C14): empty is not all set
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
  openAround(field ?? row); // batch 13: a box inside a closed section opens the section first
  if (row?.hidden) document.querySelector(`tr.group[data-group="${CSS.escape(row.dataset.group)}"] button.fold`)?.click();
  if (field) return field.matches('input,select,button') ? field.closest('label.field, .seg') ?? field : field;
  return row ?? null;
}
function show({ scroll = true } = {}) {
  if (!state) return;
  const { list, i } = state, it = list[i];
  const at = place(it, { scroll, again: () => show({ scroll }) });
  if (at === 'wait') return;
  if (!at) state.app?.usage?.('deadEnd', { name: it.name }); // batch 14: Show me found no box
  const names = list.map(x => `${x.name}${x.word ? ` (${x.word})` : ''}`);
  const shown = names.length > 3 ? [...names.slice(0, 3), `+${names.length - 3} more`] : names;
  toastEl?.remove();
  // Batch 10 (5g): a slim bar docked at the top of the content, never over the table.
  toastEl = h('div.arrive-bar', { role: 'status' },
    h('span.stack', { style: { gap: '2px' } }, h('span', {}, h('strong', {}, 'On this screen: '), shown.join(' · ')),
      it.where ? h('span.small', { style: { opacity: .85 } }, `${it.name.split(': ').pop()}: look on ${it.where}`) : null),
    h('span.spacer', { style: { flex: 1 } }),
    h('button.btn.small', { type: 'button', onclick: () => show() }, 'Show me'),
    list.length > 1 ? h('button.btn.small', { type: 'button', onclick: () => { state.i = (state.i + 1) % state.list.length; show(); } }, `Next › (${i + 1} of ${list.length})`) : null,
    h('button.btn.small', { type: 'button', onclick: () => { const to = state.back; closeToast(); location.hash = to; } }, 'Back to the agenda'),
    h('button.icon-btn.tiny', { type: 'button', 'aria-label': 'Close', onclick: closeToast }, icon('x')));
  const main = document.getElementById('main');
  if (main) main.prepend(toastEl); else document.body.append(toastEl);
}
// Light up one item's box (batch 14: shared by arrive, Find and Walk me through): open its Budget category first when
// the line sits inside a closed one, open the row's Details when the box is inside, outline and focus it. Returns
// 'wait' when a category had to open first (again runs once it has).
export function place(it, { scroll = true, again = null } = {}) {
  unglow();
  // Batch 10 (5b): a line under a closed category: open the category first, then look again.
  if (it.parent && !document.querySelector(`tr[data-id="${CSS.escape(it.id)}"]`) && !document.querySelector(`[data-focus="${CSS.escape(it.focus ?? '')}"]`)) {
    const c = caretOf(document.querySelector(`tr[data-id="${CSS.escape(it.parent)}"]`));
    if (c) { c.click(); requestAnimationFrame(() => requestAnimationFrame(() => (again ?? (() => place(it, { scroll })))())); return 'wait'; }
  }
  let el = target(it);
  if (!el?.matches('label.field, .seg, .stack, .row-line, input, select, .picks') && it.focus) { // the box is inside a closed Details panel: open it, then look again
    const caret = caretOf(el) ?? caretOf(el?.closest?.('tr.row')); // batch 10 (5b): on the Budget the caret opens the side panel, where the day chips are
    if (caret) { caret.click(); requestAnimationFrame(() => { const inner = target(it); if (inner && inner !== el) { el.classList.remove('glow'); light(inner, scroll); } }); }
  }
  if (el) light(el, scroll);
  return el;
}
function light(el, scroll) {
  el.classList.add('glow');
  if (scroll) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  (el.matches('input,select,button') ? el : el.querySelector('input,select,button'))?.focus({ preventScroll: true });
}
// Find (batch 14): go to the screen and light up one box, no bar. it: { id, focus, parent, parentCat }; parentCat names
// the Budget category a line sits under (its row id is looked up here, since a category row is made on the screen).
export function land(app, route, it, { after = null } = {}) {
  closeToast();
  const run = () => {
    const parent = it.parent ?? (it.parentCat ? app.store?.records.find(r => r.kind === 'spending' && r.type === it.parentCat)?.id ?? null : null);
    const one = { ...it, parent };
    const done = () => { const el = target(one); after?.(el); };
    if (place(one, { again: () => { place(one); requestAnimationFrame(done); } }) !== 'wait') requestAnimationFrame(done);
    // A late redraw (a chart arriving, a refresh) can replace the box: look again once or twice so the outline stays.
    for (const ms of [300, 800]) setTimeout(() => { const el = target(one); if (el && !el.classList.contains('glow') && !document.querySelector('.glow')) place(one, { scroll: false }); }, ms);
  };
  const soon = () => requestAnimationFrame(() => requestAnimationFrame(run));
  if (route && location.hash !== route) { window.addEventListener('hashchange', soon, { once: true }); app.go(route); } else { app.render(); soon(); }
}
export { target as targetOf };
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
