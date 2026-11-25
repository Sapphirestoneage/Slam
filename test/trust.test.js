// Trust (run Launch ready, Part 4): the one line "Education and tools, not financial advice." is the same in the web
// app and in the game, every footer of the web app shows it with the way to the privacy page, and the privacy page
// says only what the code does: the web app keeps its answers in the browser (data/cloud.json is empty, so no account
// on a server), and the game's page is game/privacy.html.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const read = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const LINE = 'Education and tools, not financial advice.';

test('the line is one sentence, the same in the web app and in the game', () => {
  assert.match(read('js/trust.js'), /export const TRUST_LINE = 'Education and tools, not financial advice\.';/);
  assert.match(read('game/account/trust.js'), /const TRUST_LINE = "Education and tools, not financial advice\.";/);
  for (const f of ['js/solo/shell.js', 'js/solo/hub.js', 'js/solo/debt.js', 'js/start/app.js'])
    assert.doesNotMatch(read(f), /Education, not advice|not personal financial advice/, `${f} has no second wording`);
});

test('every footer of the web app shows the line and links to the privacy page', () => {
  for (const f of ['js/solo/shell.js', 'js/solo/hub.js', 'js/solo/debt.js']) assert.match(read(f), /replaceChildren\(trustFoot\(/, f);
  const start = read('js/start/app.js');
  assert.ok(start.includes('${TRUST_LINE}') && start.includes("h('a', { href: PRIVACY_URL }, 'Privacy')"), 'the start page');
  for (const f of ['index.html', 'staples.html']) { const t = read(f); assert.ok(t.includes(LINE) && t.includes('href="game/privacy.html"'), f); }
  // each page with a footer slot gets it from one of the scripts above
  const pages = readdirSync(new URL('../', import.meta.url)).filter(f => /\.html$/.test(f));
  for (const f of pages) assert.ok(/id="foot"/.test(read(f)) || read(f).includes(LINE), `${f} has a footer with the line`);
  assert.match(read('js/trust.js'), /PRIVACY_URL = 'game\/privacy\.html'/);
});

test('what the privacy page says about the web app is true: no account on a server today', () => {
  const cloud = JSON.parse(read('data/cloud.json'));
  assert.equal(cloud.url, '', 'the web app has no server address. When this changes, game/privacy.html must say what the server stores.');
  assert.equal(cloud.key, '');
  const page = read('game/privacy.html');
  assert.match(page, /The web app has no accounts on a server today/);
  assert.match(page, /answers travel inside that link/);
});

test('the privacy page names each outside host that a page of either app loads from', () => {
  const page = read('game/privacy.html');
  const hosts = new Set();
  for (const f of ['index.html', 'start.html', 'game/index.html', 'game/privacy.html'])
    for (const m of read(f).matchAll(/(?:src|href)="https:\/\/([a-z0-9.-]+)\//g)) hosts.add(m[1]);
  const named = { 'fonts.googleapis.com': 'Google Fonts', 'fonts.gstatic.com': 'Google Fonts', 'cdn.jsdelivr.net': 'jsDelivr', 'cdnjs.cloudflare.com': 'cdnjs' };
  for (const h of hosts) assert.ok(named[h] && page.includes(named[h]), `${h} is named on the privacy page`);
  assert.ok(page.includes('GitHub') && page.includes('Supabase'));
  // and no tracking script in the pages or the scripts of the game
  for (const f of ['index.html', 'start.html', 'game/index.html', 'game/privacy.html', 'js/app.js'])
    assert.doesNotMatch(read(f), /gtag\(|google-analytics|googletagmanager|plausible|posthog|mixpanel|hotjar|sendBeacon/, f);
});
