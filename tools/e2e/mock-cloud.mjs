// A stand-in for the Supabase project, for tests: the same addresses, the same rules as docs/cloud-schema.sql
// (your account is yours; a space opens for its members only; anyone signed in can start one or join by id).
// makeCloud() gives { fetch } for unit tests and { listen(port) } for the browser walk. The sign-in code is always 123456.
import http from 'node:http';
export function makeCloud({ now = () => Date.now(), ttl = 3600 } = {}) {
  const db = { accounts: new Map(), spaces: new Map(), members: new Set(), codes: new Map(), sent: [] };
  const tokenOf = email => `tok.${Buffer.from(email).toString('base64url')}.${now()}`, emailOf = t => { const m = /^tok\.([^.]+)\.(\d+)$/.exec(t || ''); return m && now() - Number(m[2]) < ttl * 1000 ? Buffer.from(m[1], 'base64url').toString() : null; };
  const session = email => ({ access_token: tokenOf(email), refresh_token: `ref.${Buffer.from(email).toString('base64url')}`, expires_in: ttl, user: { id: `u-${email}`, email } });
  const json = (status, body) => ({ status, body });
  async function handle(method, url, headers, text) {
    const u = new URL(url, 'http://x'), path = u.pathname, body = text ? JSON.parse(text) : null;
    const bearer = (headers.authorization || headers.Authorization || '').replace(/^Bearer /, ''), who = emailOf(bearer);
    if (path === '/auth/v1/otp') { db.codes.set(body.email, '123456'); db.sent.push({ email: body.email, redirect: u.searchParams.get('redirect_to') }); return json(200, {}); }
    if (path === '/auth/v1/verify') return db.codes.get(body.email) === body.token ? json(200, session(body.email)) : json(403, { msg: 'Token has expired or is invalid' });
    if (path === '/auth/v1/token') { const m = /^ref\.(.+)$/.exec(body.refresh_token || ''); return m ? json(200, session(Buffer.from(m[1], 'base64url').toString())) : json(400, {}); }
    if (path === '/auth/v1/user') return who ? json(200, { id: `u-${who}`, email: who }) : json(401, {});
    if (!path.startsWith('/rest/v1/')) return json(404, {});
    if (!who) return json(401, { message: 'JWT expired' });
    const table = path.slice(9), member = id => db.members.has(`${id}|${who}`), eq = k => (u.searchParams.get(k) || '').replace(/^eq\./, '');
    if (table === 'accounts') { if (method === 'GET') return json(200, db.accounts.has(who) ? [{ data: db.accounts.get(who) }] : []); db.accounts.set(who, body.data); return json(201, null); }
    if (table === 'spaces') { const id = eq('id');
      if (method === 'GET') return json(200, member(id) && db.spaces.has(id) ? [db.spaces.get(id)] : []);
      if (method === 'PATCH') { if (!member(id) || !db.spaces.has(id)) return json(200, []); db.spaces.set(id, { ...db.spaces.get(id), ...body }); return json(200, [db.spaces.get(id)]); }
      if (db.spaces.has(body.id)) return json(409, { message: 'duplicate key' }); db.spaces.set(body.id, body); return json(201, null); }
    if (table === 'space_members') { if (method === 'GET') return json(200, [...db.members].filter(k => k.endsWith(`|${who}`)).map(k => ({ space_id: k.split('|')[0] }))); if (!db.spaces.has(body.space_id)) return json(409, { message: 'no such space' }); db.members.add(`${body.space_id}|${who}`); return json(201, null); }
    return json(404, {});
  }
  const fetch = async (url, init = {}) => { const r = await handle(init.method || 'GET', url, init.headers || {}, init.body); return { ok: r.status >= 200 && r.status < 300, status: r.status === 201 && r.body == null ? 201 : r.status, json: async () => r.body }; };
  const listen = port => new Promise(done => { const srv = http.createServer((req, res) => { let text = ''; req.on('data', c => { text += c; }); req.on('end', async () => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
    const r = await handle(req.method, req.url, req.headers, text); res.writeHead(r.status, { ...cors, 'Content-Type': 'application/json' }); res.end(r.body == null ? '' : JSON.stringify(r.body)); }); }); srv.listen(port, () => done(srv)); });
  return { db, fetch, listen };
}
if (process.argv[1] && process.argv[1].endsWith('mock-cloud.mjs')) { const port = Number(process.argv[2] || 8898); makeCloud().listen(port).then(() => console.log(`mock cloud on ${port}`)); }
