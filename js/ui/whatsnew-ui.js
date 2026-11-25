// SPDX-License-Identifier: AGPL-3.0-only
// What's new: the patch notes, the newest first, in the More menu. The list is ONE file for the web app and the
// game: game/data/patchnotes.js (each run adds one entry at its end; CONTRIBUTING.md). That file is a classic
// script of the game, so it is read here as a module and puts the list on the global object.
import { h } from './dom.js';
import { popover, button } from './staples.js';
import { record } from './soon.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The newest first. For one date, the later entry of the file comes first.
export function notesSorted(list) {
  return (list || []).map((e, i) => ({ e, i })).filter(x => x.e && x.e.d && x.e.t)
    .sort((a, b) => (a.e.d === b.e.d ? b.i - a.i : a.e.d < b.e.d ? 1 : -1)).map(x => x.e);
}
// "2026-11-25" as "Nov 25, 2026". No clock and no time zone.
export function notesDay(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d ?? ''));
  return m && MONTHS[+m[2] - 1] ? `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}` : '';
}
export async function loadNotes() {
  if (!globalThis.PATCH_NOTES) await import('../../game/data/patchnotes.js');
  return notesSorted(globalThis.PATCH_NOTES);
}
// The content of the popover: the three newest, and one button for the older ones.
export function notesPanel(list, { all = false, onToggle = null } = {}) {
  const show = all ? list : list.slice(0, 3);
  return h('div.stack.whatsnew', { style: { gap: '10px', maxHeight: '70vh', overflowY: 'auto' } },
    h('strong', {}, "What's new"),
    list.length ? h('span.muted.small', {}, 'What changed in SLAM, the newest first.') : h('span.muted.small', {}, 'Nothing here yet.'),
    show.map(e => h('div.stack', { style: { gap: '2px' } },
      h('span.muted.small', {}, notesDay(e.d)), h('strong', {}, e.t),
      h('ul.small', { style: { margin: '0', paddingLeft: '18px' } }, (e.l || []).map(x => h('li', {}, x))))),
    list.length > 3 ? button(all ? 'Show only the newest' : `Show older updates (${list.length - 3})`, { size: 'small', onClick: onToggle }) : null);
}
// Opened from the More menu (anchor: the More button).
export async function whatsNew(anchor) {
  let list = [];
  try { list = await loadNotes(); } catch (e) { record(e, 'whatsnew-ui.js: loadNotes'); }
  const open = all => popover(anchor, notesPanel(list, { all, onToggle: () => open(!all) }), { width: 360 });
  open(false);
}
