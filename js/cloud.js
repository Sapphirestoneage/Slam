// SPDX-License-Identifier: AGPL-3.0-only
// The server side of accounts (Supabase), behind the same calls as the browser store (js/accounts.js). It is OFF until
// data/cloud.json holds a project address and its public key: with none, cloudConfig returns null and everything stays
// on the device. Sign-in is by email (a link, or the code in the same email): no passwords. The database rules are in
// docs/cloud-schema.sql: your account is yours, a shared space opens for its members and nobody else.
import { browserDemo } from './cloud-demo.js';
export async function cloudConfig(fetcher = globalThis.fetch, ls = globalThis.localStorage) {
  try { const t = ls?.getItem('slam.cloud'); if (t) { const c = JSON.parse(t); if (c?.url && c?.key) return c; } } catch { /* no override */ }
  try { const r = await fetcher('data/cloud.json', { cache: 'no-store' }); if (!r.ok) return null; const c = await r.json(); return c?.url && c?.key ? c : null; } catch { return null; }
}
// A sign-in link lands back on the page with the session in the address (#access_token=...&refresh_token=...).
export function sessionFromHash(hash = '') {
  if (!/access_token=/.test(hash)) return null;
  const q = new URLSearchParams(hash.replace(/^#/, '')), access_token = q.get('access_token'), refresh_token = q.get('refresh_token');
  return access_token ? { access_token, refresh_token, expires_at: Number(q.get('expires_at')) || Math.floor(Date.now() / 1000) + (Number(q.get('expires_in')) || 3600) } : null;
}
export function cloudOf(config, { fetcher = null, ls = globalThis.localStorage, now = () => Date.now() } = {}) {
  if (!config?.url || !config?.key) return null;
  fetcher = fetcher ?? (config.demo ? browserDemo(ls).fetch : globalThis.fetch); // practice mode talks to a stand-in kept in this browser
  const KEY = 'slam.session';
  let session = (() => { try { return JSON.parse(ls?.getItem(KEY) || 'null'); } catch { return null; } })();
  const keep = s => { session = s; try { if (s) ls?.setItem(KEY, JSON.stringify(s)); else ls?.removeItem(KEY); } catch { /* kept in memory only */ } return s; };
  const head = (auth = true) => ({ apikey: config.key, 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${session?.access_token ?? config.key}` } : {}) });
  const auth = (path, body) => fetcher(`${config.url}/auth/v1/${path}`, { method: 'POST', headers: head(false), body: JSON.stringify(body) });
  const taken = async r => { if (!r.ok) return null; const j = await r.json(); return j?.access_token ? keep({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at ?? Math.floor(now() / 1000) + (j.expires_in ?? 3600), email: j.user?.email ?? session?.email ?? null, user: j.user?.id ?? session?.user ?? null }) : null; };
  const refresh = async () => (session?.refresh_token ? taken(await auth('token?grant_type=refresh_token', { refresh_token: session.refresh_token })) : null);
  // one retry after a refresh when the session has run out
  const rest = async (path, init = {}, again = true) => {
    if (session?.expires_at && session.expires_at * 1000 < now() + 30000) await refresh();
    const r = await fetcher(`${config.url}/rest/v1/${path}`, { ...init, headers: { ...head(), ...(init.headers || {}) } });
    if (r.status === 401 && again && await refresh()) return rest(path, init, false);
    if (!r.ok) throw new Error(`cloud ${r.status}`);
    return r.status === 204 ? null : r.json().catch(() => null);
  };
  const up = (table, row, conflict) => rest(`${table}${conflict ? `?on_conflict=${conflict}` : ''}`, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(row) });
  return { kind: 'cloud', demo: !!config.demo,
    signedIn: () => !!session?.access_token, email: () => session?.email ?? null,
    // the email holds a link back to `redirect` and (when the template shows it) a six-digit code
    sendLink: async (email, redirect) => (await auth(`otp${redirect ? `?redirect_to=${encodeURIComponent(redirect)}` : ''}`, { email, create_user: true })).ok,
    verifyCode: async (email, code) => !!(await taken(await auth('verify', { type: 'email', email, token: String(code).trim() }))),
    takeSession: async s => { keep(s); try { const r = await fetcher(`${config.url}/auth/v1/user`, { headers: head() }); if (r.ok) { const u = await r.json(); keep({ ...session, email: u.email ?? null, user: u.id ?? null }); return true; } } catch { /* falls through */ } keep(null); return false; },
    signOut: () => { keep(null); },
    loadAccount: () => rest('accounts?select=data&limit=1').then(rows => rows?.[0]?.data ?? null),
    saveAccount: acct => up('accounts', { data: acct, updated_at: new Date(now()).toISOString() }, 'owner').then(() => true),
    loadSpace: id => rest(`spaces?id=eq.${encodeURIComponent(id)}&select=packed,updated_at`).then(rows => (rows?.[0] ? { packed: rows[0].packed, at: Date.parse(rows[0].updated_at) || 0 } : null)),
    // a new space is made and joined in one go; after that only its members can write it
    saveSpace: async (id, packed) => { const row = { id, packed, updated_at: new Date(now()).toISOString() };
      try { await rest(`spaces?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ packed: row.packed, updated_at: row.updated_at }) }).then(rows => { if (!rows?.length) throw new Error('new'); }); }
      catch { await rest('spaces', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) }); await up('space_members', { space_id: id }, 'space_id,member'); }
      return true; },
    joinSpace: id => up('space_members', { space_id: id }, 'space_id,member').then(() => true) };
}
