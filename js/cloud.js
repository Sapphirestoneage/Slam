// SPDX-License-Identifier: AGPL-3.0-only
// The server side of accounts, behind the same adapter as the browser (js/accounts.js). It is OFF until data/cloud.json
// holds a project address and its public key; with none, cloudOf returns null and everything stays on the device.
// Written against Supabase's REST interface (email-link sign-in, one row per space, row rules in docs/cloud-schema.sql).
// NOT yet run against a live project: it needs Eli's project and keys first (QUESTIONS 529).
export async function cloudConfig(fetcher = globalThis.fetch) { try { const r = await fetcher('data/cloud.json'); if (!r.ok) return null; const c = await r.json(); return c?.url && c?.key ? c : null; } catch { return null; } }
export function cloudOf(config, { fetcher = globalThis.fetch, session = null } = {}) {
  if (!config?.url || !config?.key) return null;
  const head = () => ({ apikey: config.key, Authorization: `Bearer ${session?.access_token ?? config.key}`, 'Content-Type': 'application/json' });
  const rest = (path, init = {}) => fetcher(`${config.url}/rest/v1/${path}`, { ...init, headers: { ...head(), ...(init.headers || {}) } }).then(r => (r.ok ? r.json().catch(() => null) : Promise.reject(new Error(`cloud ${r.status}`))));
  return { kind: 'cloud',
    // a sign-in link by email: no password to keep
    sendLink: email => fetcher(`${config.url}/auth/v1/otp`, { method: 'POST', headers: head(), body: JSON.stringify({ email, create_user: true }) }).then(r => r.ok),
    loadAccount: () => rest('accounts?select=*&limit=1').then(rows => rows?.[0]?.data ?? null),
    saveAccount: acct => rest('accounts', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ data: acct }) }).then(() => true),
    loadSpace: id => rest(`spaces?id=eq.${encodeURIComponent(id)}&select=packed`).then(rows => rows?.[0]?.packed ?? null),
    saveSpace: (id, packed) => rest('spaces', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ id, packed }) }).then(() => true) };
}
