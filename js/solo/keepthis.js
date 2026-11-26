// SPDX-License-Identifier: AGPL-3.0-only
// The private pages' two shared parts (moved here from js/solo/hard.js, run Not built, groups 1 to 5, Parts 6 and 7):
// Leave this page (the quick exit) and Keep this (the card in place of the link card). Used by the hard moments
// (js/solo/hard.js) and by Your own path (js/solo/ownpath.js, js/solo/kin.js). The private mode itself is boot's
// (js/solo/shell.js, opts.private) and keptOnly / hardForAudience (js/hard.js). The exit's words and address are in
// data/sources/hard-2026.json (exit), with the pattern's source; withExit() loads them once for a page that has no
// other reason to read that file.
import { h, chip, copyLink } from './shell.js';

// ---------- Leave this page (the quick exit) ----------
// The GOV.UK Design System's Exit this page pattern: one button, always in the same place, and Shift pressed three
// times. The page is blanked at once, then replaced by a neutral site with location.replace, so Back does not return to
// it. What it cannot do (clear the browser's history) is said on the page in plain words.
export function quickExit(D) {
  try { document.body.replaceChildren(); document.title = 'Weather'; } catch { /* the page is leaving anyway */ }
  location.replace(D.exit.to);
}
let exitWired = false;
export function exitButton(D) {
  const top = document.getElementById('top'); if (!top || top.querySelector('.st-exit')) return;
  const b = h('button.st-btn.st-exit', { type: 'button', id: 'exit', title: D.exit.keys, onClick: () => quickExit(D) }, D.exit.label);
  top.append(b);
  if (exitWired) return; exitWired = true;
  let n = 0, at = 0;
  addEventListener('keydown', e => {
    if (e.key !== 'Shift' || e.repeat || e.ctrlKey || e.altKey || e.metaKey) { n = 0; return; }
    const now = Date.now(); n = now - at > 5000 ? 1 : n + 1; at = now;
    if (n >= 3) quickExit(D);
  });
}

let exitData = null;
export const loadExit = () => (exitData ??= fetch('data/sources/hard-2026.json').then(r => r.json()).then(D => ({ exit: D.exit })));
// The tab title of a page that should not say what it is about (Your own path), and the exit, once the data is in.
export const NEUTRAL_TITLE = 'Money tools: Stress Less About Money';
export function withExit({ neutral = false } = {}) {
  if (neutral) document.title = NEUTRAL_TITLE;
  loadExit().then(D => exitButton(D)).catch(() => { /* no exit data: the page still works, without the button */ });
}

// Keep this: off by default. On: saved in this browser and in the link. Off again: the kept copy is taken away.
export function keepCard(api) {
  const M = api.mine(), on = M.keep === true;
  const change = patch => { api.remember(patch); api.render(); };
  return h('div.st-card', { id: 'carry' }, h('h2', { style: { marginTop: 0 } }, 'Keep this?'),
    h('div.st-field', {}, h('div.st-flabel', {}, 'Keep this on this device and in my link'),
      h('div.st-chips', {}, chip('Off', !on, () => change({ keep: false, coach: false })), chip('On', on, () => change({ keep: true }))),
      h('div.st-small.st-soft', { style: { marginTop: '4px' } }, on ? 'Kept in this browser and in your link. Anyone who opens this device or the link can read it. Turn it off to take it away again.' : 'Off: nothing on this page is saved anywhere. Close the page and it is gone.')),
    on ? h('div.st-field', {}, h('div.st-flabel', {}, 'Let my coach see this'), h('div.st-chips', {}, chip('Off', M.coach !== true, () => change({ coach: false })), chip('On', M.coach === true, () => change({ coach: true }))),
      h('div.st-small.st-soft', { style: { marginTop: '4px' } }, 'Off: kept for you alone. A partner\'s view and anything shared never show it.')) : null,
    on ? h('div.st-row', {}, copyLink(api)) : null);
}
