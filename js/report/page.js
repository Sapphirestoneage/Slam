// SPDX-License-Identifier: AGPL-3.0-only
// Report a bug or idea, on every page of the web app. The sheet, the list on the device and the sending are in
// core.js (the game uses the same core). This file finds the screen name and the last 3 taps of this page, and puts
// the button "Report" in a slim row at the top of a page that stands alone (the app shell puts its own, in js/app.js).
// What a report carries from here: the page (and the tab of the app shell), the names of the last 3 buttons, the
// device, the width and the day the page was published. Never the answers: they live in the address after "#/d/",
// and that part is left out.
import { rpTap, rpLabel, rpName, rpDevice, rpWebVersion, rpMake, rpLoad, rpKeep, rpQueueAdd, rpPending, rpFlush, rpStyle, rpButton, rpDialog } from './core.js';

let taps = [], cfgP = null;

// The name of one tap. In the app shell a button can show a client's name, so only its code name is kept there.
export function tapName(el, shell) {
  if (!el) return '';
  const code = el.getAttribute('data-focus') || el.getAttribute('data-a') || el.getAttribute('data-rp') || el.id || '';
  if (code) return rpName(code.replace(/^icon:/, ''), 40);
  if (shell) return rpName(el.tagName.toLowerCase() + (el.classList[0] ? '.' + el.classList[0] : ''), 40);
  return rpLabel(el.getAttribute('aria-label') || el.textContent);
}
// The page, and for the app shell its tab. A link that carries answers ("#/d/...") gives the page only.
export function screenName(loc) {
  const page = (loc.pathname || '').split('/').pop() || 'index.html';
  const route = /^#\/[a-z0-9/_-]*$/i.test(loc.hash || '') && !/^#\/d\//.test(loc.hash) ? ' ' + loc.hash.slice(1) : '';
  return rpName(page + route, 120);
}
// The address and the public key of the database: the two public settings the game already has, read from its file.
export function settingsFrom(text) {
  const url = /SUPA_URL = "([^"]+)"/.exec(text || ''), key = /SUPA_KEY = "([^"]+)"/.exec(text || '');
  return url && key ? { url: url[1], key: key[1] } : null;
}
function cfg() {
  cfgP = cfgP || fetch('game/account/supa.js').then(r => (r.ok ? r.text() : '')).then(settingsFrom).catch(() => null);
  return cfgP.then(c => (c ? { ...c, fetch: (u, o) => fetch(u, o), token: null } : null));
}
const ls = () => { try { return globalThis.localStorage; } catch { return null; } };
export function facts() {
  const d = rpDevice(navigator.userAgent, innerWidth);
  return { screen: screenName(location), taps: taps.slice(), width: d.width, device: d.device, browser: d.browser, version: rpWebVersion(document.lastModified) };
}
async function flush() {
  const q = rpLoad(ls());
  if (!rpPending(q).length) return 'sent';
  const r = await rpFlush(q, await cfg());
  if (r.sent) rpKeep(ls(), r.q);
  return r.state;
}
async function send(f, o) {
  const row = rpMake({ ...f, ...o, app: 'web', ua: navigator.userAgent });
  if (!row) return 'none';
  rpKeep(ls() || { setItem() {} }, rpQueueAdd(rpLoad(ls()), row));
  return flush();
}
export function openReport() {
  const f = facts();
  rpDialog(document, { ...f, send: o => send(f, o) });
}

if (typeof document !== 'undefined') {
  const shell = !!document.getElementById('topbar');
  rpStyle(document, { bg: 'var(--card, #fff)', text: 'var(--text, #111)', line: 'var(--border-input, #5b6b9a)', a: 'var(--primary, #1746a2)', muted: 'var(--text-2, #5a6480)', in: 'var(--computed, transparent)' });
  document.addEventListener('click', e => {
    const el = e.target?.closest?.('button, a, summary, select, [role="button"], input[type="checkbox"], input[type="radio"]');
    if (!el || el.closest('#rp-dialog') || el.matches('[data-rp="open"], [data-focus="report"]')) return;
    taps = rpTap(taps, tapName(el, shell));
  }, true);
  // a page that stands alone: the button has its own slim row above the page, in the flow, so it covers nothing and
  // the page's own top bar (which some pages draw again) cannot drop it
  if (!shell) {
    const row = document.createElement('div'), main = document.querySelector('main');
    row.className = 'rp-solorow';
    row.appendChild(rpButton(document, 'Report', openReport));
    if (main) main.parentNode.insertBefore(row, main); else document.body.prepend(row);
  }
  addEventListener('online', () => { flush(); });
  flush();
}
