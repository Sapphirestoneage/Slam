// SPDX-License-Identifier: AGPL-3.0-only
// The shell of a standalone page: it opens the answers carried in the address (or starts empty), keeps the address up to
// date as answers change (so the address IS the save: refresh it, bookmark it, send it), and hands them to the next page.
import { h } from '../ui/dom.js';
import { fmt } from '../math/result.js';
import { Store, newHousehold } from '../records.js';
import { pack, unpack } from '../start/link.js';
import { soloOf, carryUrl, SOLO } from '../solo.js';
import { deviceAdapter, activeSpace } from '../accounts.js';
import { cloudConfig, cloudOf } from '../cloud.js';
import { pusher } from '../sync.js';
export const device = deviceAdapter();
// signed in: every save on the device follows to the server a beat later
let up = null; cloudConfig().then(cfg => { const cloud = cloudOf(cfg); if (cloud?.signedIn()) up = pusher(device, cloud); }).catch(() => {});

export { h };
export const money = v => fmt.money(v);
export const btn = (label, onClick, kind = '') => h(`button.st-btn${kind ? '.' + kind.split(' ').join('.') : ''}`, { type: 'button', onClick }, label);
export const chip = (label, on, onClick) => h('button.st-chip', { type: 'button', 'aria-pressed': on ? 'true' : 'false', onClick }, label);
const HERE = '#/d/';

export async function boot(id, draw) {
  const me = soloOf(id), ref = await fetch('data/reference-2026.json').then(r => r.json());
  let doc = null;
  if (location.hash.startsWith(HERE)) { try { doc = await unpack(location.hash.slice(HERE.length)); } catch { doc = null; } }
  // with an account, a page opened bare picks up where you left off; without one, the address is the only save
  const acct = device.loadAccount(), space = activeSpace(acct);
  if (!doc && space) { const kept = device.loadSpace(space.id); if (kept) { try { doc = await unpack(kept); } catch { doc = null; } } }
  const store = new Store(doc ?? newHousehold({ name: 'My plan' }));
  const mine = () => store.doc.settings?.start || {}, remember = patch => store.setDoc('settings', { start: { ...mine(), ...patch } });
  let timer = null, packed = null;
  // the address follows the answers, a beat behind the typing
  const save = () => { clearTimeout(timer); timer = setTimeout(async () => { packed = await pack(store.doc); history.replaceState(null, '', `${location.pathname}${location.search}${HERE}${packed}`); const sp = activeSpace(device.loadAccount()); if (sp) { device.saveSpace(sp.id, packed); up?.push(sp.id); } }, 250); };
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

// One number: a box, and amounts to tap under it. onSet(value or null) on every change; picks are plain numbers.
export function numBox(label, value, picks, onSet, { id = null, help = null } = {}) {
  const input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: '0', id, 'aria-label': label, value: value == null ? '' : Number(value).toLocaleString('en-US'),
    onInput: e => { const n = e.target.value.replace(/[^\d.]/g, ''); onSet(n === '' ? null : Number(n), true); }, onKeydown: e => { if (e.key === 'Enter') e.target.blur(); } });
  return h('div.st-field', {}, h('div.st-flabel', {}, label), h('div.st-box.narrow', {}, h('div.in', {}, h('span', {}, '$'), input)),
    h('div.st-chips', { style: { marginTop: '8px' } }, picks.map(v => chip(money(v), value === v, () => onSet(v, false)))), help ? h('div.st-small.st-soft', { style: { marginTop: '4px' } }, help) : null);
}
export function stepLine(api) { const at = SOLO.findIndex(s => s.id === api.me.id), el = document.getElementById('step'); if (el) el.textContent = `Step ${at + 1} of ${SOLO.length}`; }
// The last card on every page: one button to the next page with the answers in it, and the page's own link.
export function carryCard(api, { ready = true, pulse = true } = {}) {
  const next = btn(`Next: ${api.me.nextLabel} ›`, async () => { location.href = await api.nextUrl(); }, 'primary big');
  next.disabled = !ready; if (ready && pulse) next.classList.add('st-pulse');
  const card = h('div.st-card', { id: 'carry' }, h('h2', { style: { marginTop: 0 } }, 'Take it with you'), h('p.st-small', {}, 'The next step opens with these answers already in it. Nothing to type twice.'),
    h('div.st-row', {}, next), h('div.st-row', { style: { marginTop: '10px' } }, copyLink(api), btn('All the steps', async () => { location.href = `one.html${HERE}${await pack(api.store.doc)}`; }, 'slim')));
  card.setReady = on => { next.disabled = !on; next.classList.toggle('st-pulse', on && pulse); };
  return card;
}
export const foot = () => document.getElementById('foot').replaceChildren(h('p.st-small', {}, 'Education, not advice. Your answers stay in your browser and in the link you choose to share.'));
