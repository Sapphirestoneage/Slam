// SPDX-License-Identifier: AGPL-3.0-only
// Keeping the device and the server in step. The device is always the working copy; the server is where a second phone
// (or another person) finds it. The newest save wins, whole plan at a time: people typing in the same minute on a
// shared plan will see the later one. `device` and `cloud` are the adapters from js/accounts.js and js/cloud.js.
export const stampKey = id => `slam.space.${id}.at`;
// After sign-in, and whenever a page opens signed in: take the account and any newer spaces from the server, and send
// up anything the server has never seen. Returns what changed so the page can redraw.
export async function pullAll(device, cloud, { ls = globalThis.localStorage, mergeAccounts = defaultMerge } = {}) {
  const out = { account: false, pulled: [], pushed: [] };
  const mine = device.loadAccount(), theirs = await cloud.loadAccount();
  const acct = theirs && mine ? mergeAccounts(mine, theirs, id => !!device.loadSpace(id)) : theirs ?? mine;
  if (!acct) return out;
  if (JSON.stringify(acct) !== JSON.stringify(mine)) { device.saveAccount(acct); out.account = true; }
  if (JSON.stringify(acct) !== JSON.stringify(theirs)) await cloud.saveAccount(acct);
  for (const s of acct.spaces) {
    const remote = await cloud.loadSpace(s.id), local = device.loadSpace(s.id), at = Number(ls?.getItem(stampKey(s.id)) || 0);
    if (remote && (!local || remote.at > at)) { device.saveSpace(s.id, remote.packed); ls?.setItem(stampKey(s.id), String(remote.at)); out.pulled.push(s.id); }
    else if (local && (!remote || remote.packed !== local)) { await cloud.saveSpace(s.id, local); ls?.setItem(stampKey(s.id), String(Date.now())); out.pushed.push(s.id); }
  }
  return out;
}
// One account from two copies: every space either side knows. Signing in on a phone that already holds its own plan
// keeps that plan beside the account's, named "From this device", so nothing typed before sign-in is lost.
export function defaultMerge(mine, theirs, hasData = () => false) {
  const spaces = [...theirs.spaces];
  for (const s of mine.spaces) { if (spaces.some(x => x.id === s.id)) continue; if (s.kind !== 'mine') spaces.push(s); else if (hasData(s.id)) spaces.push({ ...s, kind: 'extra', name: 'From this device' }); }
  const wanted = mine.active, active = spaces.some(s => s.id === wanted) ? wanted : spaces.some(s => s.id === theirs.active) ? theirs.active : spaces[0].id;
  return { ...theirs, name: theirs.name ?? mine.name, spaces, active };
}
// After a save on the device: send it up, a beat later, and remember when.
export function pusher(device, cloud, { ls = globalThis.localStorage, wait = 1200, timers = globalThis } = {}) {
  let t = null, pending = null;
  const flush = async () => { const id = pending; pending = null; t = null; if (!id || !cloud?.signedIn()) return false; const packed = device.loadSpace(id); if (!packed) return false; try { await cloud.saveSpace(id, packed); ls?.setItem(stampKey(id), String(Date.now())); return true; } catch { return false; } };
  return { push: id => { pending = id; if (t) timers.clearTimeout(t); t = timers.setTimeout(flush, wait); }, flush };
}
