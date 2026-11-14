// SPDX-License-Identifier: AGPL-3.0-only
// A stand-in for the server, for practice mode and for tests: the same addresses and the same rules as
// docs/cloud-schema.sql (your account is yours; a shared space opens for its members only; anyone signed in can start one
// or join by its id). In practice mode it lives in this browser's storage, so nothing leaves the device and the sign-in
// code is always 123456. `store` is { get(), set(db) } for a plain object.
const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), unb64 = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
export const DEMO_CODE = '123456';
export function demoServer({ store, now = () => Date.now(), ttl = 3600 } = {}) {
  const blank = () => ({ accounts: {}, spaces: {}, members: [], codes: {}, sent: [] });
  const read = () => ({ ...blank(), ...(store.get() || {}) });
  const tokenOf = email => `tok.${b64(email)}.${now()}`, emailOf = t => { const m = /^tok\.([^.]+)\.(\d+)$/.exec(t || ''); try { return m && now() - Number(m[2]) < ttl * 1000 ? unb64(m[1]) : null; } catch { return null; } };
  const session = email => ({ access_token: tokenOf(email), refresh_token: `ref.${b64(email)}`, expires_in: ttl, user: { id: `u-${email}`, email } });
  function handle(method, url, headers = {}, text = null) {
    const db = read(), done = (status, body) => { store.set(db); return { status, body }; };
    const u = new URL(url, 'http://x'), path = u.pathname.replace(/^.*?(\/(auth|rest)\/v1\/)/, '/$2/v1/'), body = text ? JSON.parse(text) : null;
    const bearer = String(headers.authorization || headers.Authorization || '').replace(/^Bearer /, ''), who = emailOf(bearer);
    if (path === '/auth/v1/otp') { db.codes[body.email] = DEMO_CODE; db.sent.push({ email: body.email, redirect: u.searchParams.get('redirect_to') }); return done(200, {}); }
    if (path === '/auth/v1/verify') return db.codes[body.email] === body.token ? done(200, session(body.email)) : done(403, { msg: 'Token has expired or is invalid' });
    if (path === '/auth/v1/token') { const m = /^ref\.(.+)$/.exec(body.refresh_token || ''); return m ? done(200, session(unb64(m[1]))) : done(400, {}); }
    if (path === '/auth/v1/user') return who ? done(200, { id: `u-${who}`, email: who }) : done(401, {});
    if (!path.startsWith('/rest/v1/')) return done(404, {});
    if (!who) return done(401, { message: 'JWT expired' });
    const table = path.slice(9), member = id => db.members.includes(`${id}|${who}`), eq = k => (u.searchParams.get(k) || '').replace(/^eq\./, '');
    if (table === 'accounts') { if (method === 'GET') return done(200, db.accounts[who] ? [{ data: db.accounts[who] }] : []); db.accounts[who] = body.data; return done(201, null); }
    if (table === 'spaces') { const id = eq('id');
      if (method === 'GET') return done(200, member(id) && db.spaces[id] ? [db.spaces[id]] : []);
      if (method === 'PATCH') { if (!member(id) || !db.spaces[id]) return done(200, []); db.spaces[id] = { ...db.spaces[id], ...body }; return done(200, [db.spaces[id]]); }
      if (db.spaces[body.id]) return done(409, { message: 'duplicate key' }); db.spaces[body.id] = body; return done(201, null); }
    if (table === 'space_members') { if (method === 'GET') return done(200, db.members.filter(k => k.endsWith(`|${who}`)).map(k => ({ space_id: k.split('|')[0] }))); if (!db.spaces[body.space_id]) return done(409, { message: 'no such space' }); if (!member(body.space_id)) db.members.push(`${body.space_id}|${who}`); return done(201, null); }
    return done(404, {});
  }
  const fetch = async (url, init = {}) => { const r = handle(init.method || 'GET', url, init.headers || {}, init.body ?? null); return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body }; };
  return { handle, fetch, read };
}
// Practice mode in the browser: the stand-in server kept in this browser's storage.
export function browserDemo(ls = globalThis.localStorage) { return demoServer({ store: { get: () => { try { return JSON.parse(ls.getItem('slam.demo.db') || 'null'); } catch { return null; } }, set: db => { try { ls.setItem('slam.demo.db', JSON.stringify(db)); } catch { /* storage full or blocked */ } } } }); }
export const DEMO_CONFIG = { url: 'https://practice.invalid', key: 'practice', demo: true };
