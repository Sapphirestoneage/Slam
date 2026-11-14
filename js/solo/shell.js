// SPDX-License-Identifier: AGPL-3.0-only
// The shell of a standalone page: it opens the answers carried in the address (or starts empty), keeps the address up to
// date as answers change (so the address IS the save: refresh it, bookmark it, send it), and hands them to the next page.
import { h } from '../ui/dom.js';
import { fmt } from '../math/result.js';
import { Store, newHousehold } from '../records.js';
import { pack, unpack } from '../start/link.js';
import { soloOf, carryUrl } from '../solo.js';

export { h };
export const money = v => fmt.money(v);
export const btn = (label, onClick, kind = '') => h(`button.st-btn${kind ? '.' + kind.split(' ').join('.') : ''}`, { type: 'button', onClick }, label);
export const chip = (label, on, onClick) => h('button.st-chip', { type: 'button', 'aria-pressed': on ? 'true' : 'false', onClick }, label);
const HERE = '#/d/';

export async function boot(id, draw) {
  const me = soloOf(id), ref = await fetch('data/reference-2026.json').then(r => r.json());
  let doc = null;
  if (location.hash.startsWith(HERE)) { try { doc = await unpack(location.hash.slice(HERE.length)); } catch { doc = null; } }
  const store = new Store(doc ?? newHousehold({ name: 'My plan' }));
  const mine = () => store.doc.settings?.start || {}, remember = patch => store.setDoc('settings', { start: { ...mine(), ...patch } });
  let timer = null, packed = null;
  // the address follows the answers, a beat behind the typing
  const save = () => { clearTimeout(timer); timer = setTimeout(async () => { packed = await pack(store.doc); history.replaceState(null, '', `${location.pathname}${location.search}${HERE}${packed}`); }, 250); };
  const link = async () => { packed = await pack(store.doc); return `${location.origin}${location.pathname}${HERE}${packed}`; };
  const nextUrl = async () => carryUrl(me.next, await pack(store.doc));
  const api = { store, ref, me, mine, remember, save, link, nextUrl, render: () => { draw(api); save(); } };
  store.subscribe?.(() => save());
  document.title = `${me.title}: Stress Less About Money`;
  api.render();
  return api;
}
// "Copy my link": the page's own address with every answer in it. Falls back to showing the link when copying is blocked.
export function copyLink(api, label = 'Copy my link') {
  const out = h('span.st-small', { role: 'status', style: { marginLeft: '8px' } }, '');
  return h('span', {}, btn(label, async () => { const url = await api.link(); try { await navigator.clipboard.writeText(url); out.textContent = 'Copied. Anyone with the link sees these numbers.'; } catch { out.replaceChildren(h('input', { readonly: '', value: url, 'aria-label': 'Your link', style: { width: '100%' }, onFocus: e => e.target.select() })); } }, 'slim'), out);
}
