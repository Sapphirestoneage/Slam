// SPDX-License-Identifier: AGPL-3.0-only
// The shell of a standalone page: it opens the answers carried in the address (or starts empty), keeps the address up to
// date as answers change (so the address IS the save: refresh it, bookmark it, send it), and hands them to the next page.
import { h } from '../ui/dom.js';
import { trustFoot } from '../trust.js';
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

// A private page (run Not built, groups 1 to 5, Part 6, the tools of Your own path): nothing is kept unless the person
// chooses to. The answers live in the open page only: the address is not rewritten, nothing goes to the device or the
// server, and the tab shows a neutral title. api.keep(true) turns on the usual saving for this page (the answers then
// ride in the link and, with an account, in the plan); api.keep(false) takes this page's answers out of the plan and
// the link again, then stops keeping. A "Leave page" button in the top bar opens a neutral site in this tab.
export const PRIVATE_TITLE = 'Money tools: Stress Less About Money', LEAVE_TO = 'https://www.weather.gov/';
export async function boot(id, draw, { private: priv = false } = {}) {
  // a page off the path (cards.html) boots the same way: the plan in the address, no next step
  const me = soloOf(id) ?? { id, title: document.title.split(':')[0].trim(), next: null }, ref = await fetch('data/reference-2026.json').then(r => r.json());
  let doc = null;
  if (location.hash.startsWith(HERE)) { try { doc = await unpack(location.hash.slice(HERE.length)); } catch { doc = null; } }
  // with an account, a page opened bare picks up where you left off; without one, the address is the only save
  const acct = device.loadAccount(), space = activeSpace(acct);
  if (!doc && space) { const kept = device.loadSpace(space.id); if (kept) { try { doc = await unpack(kept); } catch { doc = null; } } }
  const store = new Store(doc ?? newHousehold({ name: 'My plan' }));
  const mine = () => store.doc.settings?.start || {}, remember = patch => store.setDoc('settings', { start: { ...mine(), ...patch } });
  let timer = null, packed = null, kept = !priv || mine()[`${id}_keep`] === true;
  // the address follows the answers, a beat behind the typing (a private page: only once the person keeps them)
  const write = async () => { packed = await pack(store.doc); history.replaceState(null, '', `${location.pathname}${location.search}${HERE}${packed}`); const sp = activeSpace(device.loadAccount()); if (sp) { device.saveSpace(sp.id, packed); up?.push(sp.id); } };
  const save = () => { if (!kept) return; clearTimeout(timer); timer = setTimeout(async () => { packed = await pack(store.doc); history.replaceState(null, '', `${location.pathname}${location.search}${HERE}${packed}`); const sp = activeSpace(device.loadAccount()); if (sp) { device.saveSpace(sp.id, packed); up?.push(sp.id); } }, 250); };
  const link = async () => { packed = await pack(store.doc); return `${location.origin}${location.pathname}${HERE}${packed}`; };
  const nextUrl = async () => carryUrl(me.next, await pack(store.doc));
  const keep = async on => {
    if (on) { kept = true; remember({ [`${id}_keep`]: true }); await write(); return; }
    const left = Object.fromEntries(Object.entries(mine()).filter(([k]) => !k.startsWith(`${id}_`)));
    store.setDoc('settings', { start: left }); clearTimeout(timer); await write(); kept = false;
  };
  const api = { store, ref, me, mine, remember, save, link, nextUrl, private: priv, kept: () => kept, keep, render: () => { draw(api); save(); } };
  store.subscribe?.(() => save());
  document.title = priv ? PRIVATE_TITLE : `${me.title}: Stress Less About Money`;
  if (priv) { const top = document.getElementById('top'); if (top && !top.querySelector('#leave')) top.append(h('button.st-btn.slim', { type: 'button', id: 'leave', title: 'Opens a weather page in this tab', style: { whiteSpace: 'nowrap', marginLeft: 'auto' }, onClick: () => location.replace(LEAVE_TO) }, 'Leave page')); }
  api.render();
  return api;
}
// "Copy my link": the page's own address with every answer in it. Falls back to showing the link when copying is blocked.
export function copyLink(api, label = 'Copy my link') {
  const out = h('span.st-small', { role: 'status', style: { marginLeft: '8px' } }, '');
  return h('span', {}, btn(label, async () => { const url = await api.link(); try { await navigator.clipboard.writeText(url); out.textContent = 'Copied. Anyone with the link sees these numbers.'; } catch { out.replaceChildren(h('input', { readonly: '', value: url, 'aria-label': 'Your link', style: { width: '100%' }, onFocus: e => e.target.select() })); } }, 'slim'), out);
}

// One number: a box, and amounts to tap under it. onSet(value or null) on every change; picks are plain numbers.
// unit: a box for a count, not money (hours, uses, square feet): no $ in front, the unit after, picks as plain numbers.
export function numBox(label, value, picks, onSet, { id = null, help = null, unit = null } = {}) {
  const show = v => (unit ? `${Number(v).toLocaleString('en-US')} ${v === 1 ? unit.replace(/s$/, '') : unit}` : money(v));
  const input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: '0', id, 'aria-label': label, value: value == null ? '' : Number(value).toLocaleString('en-US'),
    onInput: e => { const n = e.target.value.replace(/[^\d.]/g, ''); onSet(n === '' ? null : Number(n), true); }, onKeydown: e => { if (e.key === 'Enter') e.target.blur(); } });
  return h('div.st-field', {}, h('div.st-flabel', {}, label), h('div.st-box.narrow', {}, h('div.in', {}, unit ? null : h('span', {}, '$'), input, unit ? h('span', { style: { whiteSpace: 'nowrap', flexShrink: 0, fontSize: '15px' } }, unit) : null)),
    h('div.st-chips', { style: { marginTop: '8px' } }, picks.map(v => chip(show(v), value === v, () => onSet(v, false)))), help ? h('div.st-small.st-soft', { style: { marginTop: '4px' } }, help) : null);
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
// The last card of a private page, in place of the link card: nothing is kept until the person taps Keep. In a plan
// shared with a coach or a partner, the button says so before anything goes there.
export function keepCard(api) {
  const shared = activeSpace(device.loadAccount())?.kind === 'shared';
  return h('div.st-card', { id: 'carry' }, h('h2', { style: { marginTop: 0 } }, 'Kept only if you choose'),
    api.kept() ? [h('p.st-small', {}, `Your answers on this page are kept: they ride in this page's link${shared ? ' and in the plan you share, so the others in it can see them' : ', and with an account in your plan'}.`), h('div.st-row', {}, btn('Stop keeping them', async () => { await api.keep(false); api.render(); }, 'slim'))]
      : [h('p.st-small', {}, 'Nothing you put on this page is kept. Close or refresh it and it is gone. It goes to no coach, partner or shared plan.'), h('div.st-row', {}, btn(shared ? 'Keep them in the shared plan' : 'Keep my answers', async () => { await api.keep(true); api.render(); }, 'slim'))]);
}
export const foot = () => document.getElementById('foot').replaceChildren(trustFoot('Your answers stay in your browser and in the link you choose to share.'));
