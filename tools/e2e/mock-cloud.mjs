// The stand-in server over HTTP, for the browser walk. It is the same code as practice mode (js/cloud-demo.js), which
// follows the rules in docs/cloud-schema.sql. makeCloud() gives { fetch, db } for unit tests and { listen(port) }.
import http from 'node:http';
import { demoServer } from '../../js/cloud-demo.js';
export function makeCloud(opts = {}) {
  let state = null; const srv = demoServer({ ...opts, store: { get: () => state, set: db => { state = db; } } });
  const listen = port => new Promise(done => { const s = http.createServer((req, res) => { let text = ''; req.on('data', c => { text += c; }); req.on('end', () => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
    const r = srv.handle(req.method, req.url, req.headers, text || null); res.writeHead(r.status, { ...cors, 'Content-Type': 'application/json' }); res.end(r.body == null ? '' : JSON.stringify(r.body)); }); }); s.listen(port, () => done(s)); });
  return { fetch: srv.fetch, listen, get db() { return srv.read(); } };
}
if (process.argv[1] && process.argv[1].endsWith('mock-cloud.mjs')) { const port = Number(process.argv[2] || 8898); makeCloud().listen(port).then(() => console.log(`mock cloud on ${port}`)); }
