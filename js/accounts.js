// SPDX-License-Identifier: AGPL-3.0-only
// Accounts and spaces: who is using this, and which plans they hold. A space is one household file: "mine" belongs to
// one person, "shared" is held by two (a couple) and opened by both. This file is the pure model. Where it is kept is an
// adapter: today the browser (deviceAdapter), later a server (js/cloud.js) with the same four calls, so nothing above
// this line changes when sign-in arrives.
// long and unguessable: a shared space is joined by knowing its id
const uid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID().replace(/-/g, '') : `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`);
export const newAccount = (name = 'Me', now = new Date()) => { const id = uid(); return { id: uid(), name, since: now.toISOString().slice(0, 10), active: id, spaces: [{ id, kind: 'mine', name: 'Mine', members: [name] }] }; };
export const activeSpace = acct => acct?.spaces.find(s => s.id === acct.active) ?? acct?.spaces[0] ?? null;
// A shared space for two. `withName` is the other person; they join it from a link (or, with a server, by signing in).
export function addShared(acct, withName = 'My person') { const s = { id: uid(), kind: 'shared', name: 'Ours', members: [acct.name, withName] }; return { ...acct, spaces: [...acct.spaces, s], active: s.id }; }
export const switchTo = (acct, id) => (acct.spaces.some(s => s.id === id) ? { ...acct, active: id } : acct);
export const rename = (acct, name) => ({ ...acct, name: name || acct.name, spaces: acct.spaces.map(s => ({ ...s, members: s.members.map(m => (m === acct.name ? name || acct.name : m)) })) });
export function removeSpace(acct, id) { const s = acct.spaces.find(x => x.id === id); if (!s || s.kind === 'mine') return acct; const spaces = acct.spaces.filter(x => x.id !== id); return { ...acct, spaces, active: acct.active === id ? spaces[0].id : acct.active }; }
// Joining a shared space someone sent: it is added beside your own, never in place of it.
export function joinShared(acct, { id, name = 'Ours', members = [] }) { if (acct.spaces.some(s => s.id === id)) return switchTo(acct, id); return { ...acct, spaces: [...acct.spaces, { id, kind: 'shared', name, members: members.includes(acct.name) ? members : [...members, acct.name] }], active: id }; }
// Who can see what: your own space is yours alone; a shared one is open to both of its members and nobody else.
export const canOpen = (space, who) => !!space && (space.kind === 'mine' ? space.members[0] === who : space.members.includes(who));

// The adapter every store implements: { loadAccount(), saveAccount(acct), loadSpace(id), saveSpace(id, packed) }.
export function deviceAdapter(ls = globalThis.localStorage) {
  const get = k => { try { return ls.getItem(k); } catch { return null; } }, set = (k, v) => { try { ls.setItem(k, v); return true; } catch { return false; } };
  return { kind: 'device',
    loadAccount: () => { try { return JSON.parse(get('slam.account') || 'null'); } catch { return null; } }, saveAccount: acct => set('slam.account', JSON.stringify(acct)),
    loadSpace: id => get(`slam.space.${id}`), saveSpace: (id, packed) => set(`slam.space.${id}`, packed), signOut: () => { try { ls.removeItem('slam.account'); } catch { /* nothing kept */ } } };
}
export function memoryAdapter() { let acct = null; const spaces = new Map(); return { kind: 'memory', loadAccount: () => acct, saveAccount: a => { acct = a; return true; }, loadSpace: id => spaces.get(id) ?? null, saveSpace: (id, p) => { spaces.set(id, p); return true; }, signOut: () => { acct = null; } }; }
