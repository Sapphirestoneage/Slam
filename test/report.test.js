// Report a bug or idea (run "Launch ready", Part 2): one core for the web app and the game (js/report/core.js), the
// page module of the web app (js/report/page.js), the button on every page, what a report may carry, and the
// database file read as text. The game's own test is game/tests/report-a-bug-or-idea.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as C from '../js/report/core.js';
import { tapName, screenName, settingsFrom } from '../js/report/page.js';

const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const el = (attrs, text = '', tag = 'BUTTON', cls = []) => ({ getAttribute: k => attrs[k] ?? null, id: attrs.id || '', tagName: tag, classList: cls, textContent: text });

test('the game\'s copy of the core is made from js/report/core.js and is current (node tools/game_report_build.mjs)', () => {
  const src = read('js/report/core.js'), copy = read('game/core/reportcore.js');
  const hash = createHash('sha256').update(src).digest('hex').slice(0, 16);
  assert.match(copy, new RegExp(`SOURCE-HASH  ${hash}`), 'js/report/core.js changed: run node tools/game_report_build.mjs, then the game steps (prettier, stamp, code map)');
  assert.doesNotMatch(copy, /^export /m);
});

test('every page of the web app has the Report button: the shell in its top bar, each other page through js/report/page.js', () => {
  const pages = readdirSync(new URL('..', import.meta.url)).filter(f => f.endsWith('.html'));
  assert.ok(pages.length >= 30, `${pages.length} pages`);
  for (const f of pages.filter(f => f !== 'index.html')) assert.match(read(f), /<script type="module" src="js\/report\/page\.js"><\/script>/, f);
  const app = read('js/app.js');
  assert.match(app, /import \{ openReport \} from '\.\/report\/page\.js'/);
  assert.match(app, /'data-focus': 'report'[^\n]*'Report a bug or idea'/, 'the button of the top bar');
  assert.match(app, /item\('Report a bug or idea', 'flag', \(\) => openReport\(\)\)/, 'the More menu opens the same sheet: one Report, not two');
  assert.doesNotMatch(app, /reportThis/);
  assert.match(read('js/ui/report-this.js'), /export function feedbackCard/, 'the notes saved before stay readable in Coach tools');
});

test('the button is a real button, at least 44 by 44, outlined (never the primary), and sits in the flow', () => {
  assert.match(C.RP_CSS, /\.rp-btn\{[^}]*min-height:44px;min-width:44px[^}]*border:2px solid[^}]*background:transparent/);
  assert.match(C.RP_CSS, /\.rp-solorow\{display:flex/);
  assert.doesNotMatch(C.RP_CSS.match(/\.rp-btn\{[^}]*\}/)[0], /position:\s*(fixed|absolute)/, 'it never floats over content');
  assert.match(read('js/report/page.js'), /insertBefore\(row, main\)/);
  assert.deepEqual(C.RP_TYPES.map(t => t[1]), ['Bug', 'Idea', 'Confusing']);
});

test('a report carries the screen, the last 3 taps, the device, the width, the browser and the version', () => {
  const ua = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
  let taps = [];
  for (const n of ['A trip', 'One time', 'Next', 'Copy my link']) taps = C.rpTap(taps, n);
  const r = C.rpMake({ type: 'bug', note: ' The button did nothing ', app: 'web', screen: 'afford.html', taps, ua, width: 412, version: C.rpWebVersion('11/25/2026 10:00:00'), now: '2026-11-25T10:00:00.000Z', id: 'x' });
  assert.deepEqual(r, { id: 'x', type: 'bug', note: 'The button did nothing', app: 'web', screen: 'afford.html', taps: ['One time', 'Next', 'Copy my link'], width: 412, device: 'phone, Android', browser: 'Chrome 120', version: 'web-2026-11-25', shot: null, made_at: '2026-11-25T10:00:00.000Z' });
  assert.equal(C.rpMake({ type: 'nope' }), null, 'a type must be picked');
  assert.equal(C.rpWebVersion('not a date'), 'web');
});

test('privacy: names only. No answer, no amount and no client name rides along', () => {
  // a self-serve page keeps the answers in the address after #/d/: the screen name leaves that part out
  assert.equal(screenName({ pathname: '/Slam/afford.html', hash: '#/d/eJyrVkrLz1eyUlAqSS0uUaoFAC2bBVk' }), 'afford.html');
  assert.equal(screenName({ pathname: '/Slam/', hash: '#/net-worth/debt' }), 'index.html /net-worth/debt');
  assert.equal(screenName({ pathname: '/Slam/index.html', hash: '#/home/session?x=$5,000' }), 'index.html');
  // a tap is the name of the button; an amount chip loses its digits
  assert.equal(tapName(el({}, '$1,250'), false), '');
  assert.equal(tapName(el({}, 'Use $400 a month'), false), 'Use a month');
  assert.equal(tapName(el({ 'data-focus': 'more' }, 'More'), true), 'more');
  // in the app shell a button can show a client's name: only its code name is kept
  assert.equal(tapName(el({ 'aria-label': 'Client: Alexis Rivera. Switch client' }, 'Alexis Rivera', 'BUTTON', ['client-btn']), true), 'button.client-btn');
  assert.equal(C.rpTap([], '$4,000').length, 1);
  assert.equal(C.rpTap([], '$4,000')[0], '4 000', 'a dollar sign never survives in a name');
  assert.equal(C.rpLabel('$4,000'), '');
  const r = C.rpMake({ type: 'idea', screen: 'home > debts $9,999', taps: ['pay\n$50'] });
  assert.doesNotMatch(JSON.stringify([r.screen, r.taps]), /\$|\n/);
  // the picture is chosen by the person: a file box, and nothing reads the screen
  const src = read('js/report/core.js') + read('js/report/page.js');
  assert.match(src, /type: 'file', accept: 'image\/\*'/);
  assert.doesNotMatch(src, /getDisplayMedia|html2canvas|captureStream/);
  assert.ok(C.rpShotOk('data:image/jpeg;base64,AAAA') && !C.rpShotOk('data:text/html;base64,AAAA') && !C.rpShotOk('data:image/jpeg;base64,' + 'A'.repeat(C.RP_SHOT_MAX)));
});

test('until the table exists a report stays on the device and says so; then it sends itself', async () => {
  const calls = [], net = (status, body = {}) => ({ url: 'https://db.test', key: 'pub', fetch: async (u, o) => { calls.push({ u, o }); return { ok: status < 300, status, json: async () => body }; } });
  let q = C.rpQueueAdd([], C.rpMake({ type: 'bug', id: 'a', note: 'one' }));
  q = C.rpQueueAdd(q, C.rpMake({ type: 'idea', id: 'b', note: 'two' }));
  let r = await C.rpFlush(q, net(404, { code: 'PGRST205' }));
  assert.equal(r.state, 'wait'); assert.equal(C.rpPending(r.q).length, 2); assert.equal(calls.length, 1, 'it stops at the first one that cannot go');
  assert.match(C.RP_SAID.saved, /^Saved on this device\./);
  r = await C.rpFlush(q, { url: 'https://db.test', key: 'pub', fetch: async () => { throw new Error('no network'); } });
  assert.equal(r.state, 'offline');
  assert.equal(await C.rpSend(q[0].row, null), 'wait', 'no settings: it waits');
  calls.length = 0;
  r = await C.rpFlush(q, net(201));
  assert.equal(r.state, 'sent'); assert.equal(r.sent, 2); assert.equal(C.rpPending(r.q).length, 0);
  assert.deepEqual(calls.map(c => JSON.parse(c.o.body).id), ['a', 'b'], 'the oldest first');
  assert.equal(calls[0].u, 'https://db.test/rest/v1/reports');
  assert.equal(calls[0].o.headers.Authorization, 'Bearer pub', 'a visitor sends with the public key');
  assert.equal(calls[0].o.headers.Prefer, 'return=minimal', 'a visitor cannot read, so nothing is asked back');
  assert.ok(!('owner' in JSON.parse(calls[0].o.body)) && !('status' in JSON.parse(calls[0].o.body)));
  assert.equal(await C.rpSend(q[0].row, net(409)), 'sent', 'the same report twice is one report');
  assert.equal(await C.rpSend(q[0].row, net(403, { code: '42501' })), 'later');
  // the list on the device
  const store = {}, ls = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  C.rpKeep(ls, r.q);
  assert.deepEqual(C.rpLoad(ls).map(x => x.state), ['sent', 'sent']);
  assert.deepEqual(C.rpLoad({ getItem: () => '{broken' }), []);
});

test('the web app reads the two public settings the game already has: no second copy of a key', () => {
  const s = settingsFrom(read('game/account/supa.js'));
  assert.match(s.url, /^https:\/\/[a-z0-9]+\.supabase\.co$/);
  assert.match(s.key, /^sb_publishable_/);
  assert.equal(settingsFrom('nothing here'), null);
  for (const f of ['js/report/core.js', 'js/report/page.js', 'tools/game_report_build.mjs']) assert.doesNotMatch(read(f), /sb_publishable_|supabase\.co|eyJ[A-Za-z0-9]{10}/, f);
});

test('the admin inbox rows: the newest first, a filter by type, the link to the screen, what is fixed', () => {
  const rows = [{ id: 1, type: 'bug', made_at: '2026-11-25T10:00:00Z', status: 'open' }, { id: 2, type: 'idea', made_at: '2026-11-25T12:00:00Z', status: 'fixed' }, { id: 3, type: 'bug', made_at: '2026-11-24T10:00:00Z', status: 'open' }];
  assert.deepEqual(C.rpInbox(rows, 'all', false).map(r => r.id), [2, 1, 3]);
  assert.deepEqual(C.rpInbox(rows, 'bug', false).map(r => r.id), [1, 3]);
  assert.deepEqual(C.rpInbox(rows, 'all', true).map(r => r.id), [1, 3]);
  assert.deepEqual(C.rpCounts(rows), { all: 3, bug: 2, idea: 1, confusing: 0, open: 2 });
  assert.equal(C.rpOpenHref({ app: 'game', owner: 'u1', screen: 'money > debts' }), './?as=u1&at=money%20%3E%20debts');
  assert.equal(C.rpOpenHref({ app: 'web', owner: null, screen: 'index.html /plan/goals' }), '../index.html');
  assert.equal(C.rpOpenHref({ app: 'game', owner: null, screen: 'sign-in' }), '', 'a visitor has no game to open');
  assert.deepEqual(C.rpWhere('money > debts'), { tab: 'money', kind: 'debts' });
  assert.deepEqual(C.rpFixedNew([{ id: 'a' }, { id: 'b' }], ['a']).map(r => r.id), ['b'], 'the note shows one time');
  assert.equal(C.RP_SAID.fixed, "You reported this. It's fixed.");
});

test('the database file: NOT APPLIED, safe to run twice, the rights and the rows rules', () => {
  const sql = read('supabase/migrations/' + C.RP_FILE);
  assert.match(sql, /^-- NOT APPLIED\./m);
  assert.match(sql, /create table if not exists public\.reports/);
  assert.match(sql, /alter table public\.reports enable row level security;/);
  assert.match(sql, /revoke all on public\.reports from public, anon, authenticated;/);
  assert.match(sql, /grant insert \(id, made_at, type, note, app, screen, taps, width, device, browser, version, shot\)\s+on public\.reports to anon, authenticated;/);
  assert.match(sql, /grant select on public\.reports to authenticated;/);
  assert.match(sql, /grant update \(status, fixed_at\) on public\.reports to authenticated;/);
  assert.doesNotMatch(sql, /grant select[^;]*anon|grant[^;]*delete|grant all|using \(true\)|with check \(true\)/, 'a visitor reads nothing, nobody deletes, no rule is open to all');
  assert.match(sql, /for insert to anon\s+with check \(owner is null and status = 'open' and fixed_at is null\)/);
  assert.match(sql, /for insert to authenticated\s+with check \(owner = auth\.uid\(\) and status = 'open' and fixed_at is null\)/);
  assert.match(sql, /for select to authenticated\s+using \(owner = auth\.uid\(\) or is_admin\(\)\)/);
  assert.match(sql, /for update to authenticated\s+using \(is_admin\(\)\) with check \(is_admin\(\)\)/);
  assert.equal((sql.match(/create policy/g) || []).length, (sql.match(/drop policy if exists/g) || []).length);
  assert.ok(sql.includes(`char_length(note) <= ${C.RP_NOTE_MAX}`) && sql.includes(`char_length(shot) <= ${C.RP_SHOT_MAX}`) && sql.includes(`jsonb_array_length(taps) <= ${C.RP_TAPS}`), 'the caps match the app');
  // the columns the app sends are the columns a visitor may add
  const cols = /grant insert \(([^)]+)\)/.exec(sql)[1].split(',').map(s => s.trim()).sort();
  assert.deepEqual(Object.keys(C.rpMake({ type: 'bug' })).sort(), cols);
});
