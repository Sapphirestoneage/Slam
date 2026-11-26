// The launch walk of SLAM the Game: a brand-new visitor on a phone, from the slide link to a Report, then an account.
// Serve the repository (python3 -m http.server 8537), then: node tools/e2e/launch_walk.cjs
// Env: SLAM_URL (default http://localhost:8537), WALK_OUT (a folder for the screenshots and walk.json; default: none),
// WALK_SIZES (default "390x640,390x844").
// Like door_walk.cjs, a stand-in answers in place of the Supabase script (the CDN is not reachable from the build
// machine, and a walk must not touch the real database). This stand-in also lets the visitor "make an account".
// Each call to the database address is answered here as the real one answers before the database file of the
// reports has run: "no such table".
// Walk 1, the visitor of the slide link (?ref=abc123): the landing, What is this? open and closed, Start, each tap of
// the setup to the payoff reveal ("Here's where you stand"), the offer to save, Report (Confusing, a note, Send, what the person is
// told), the sign-up screen, Sign in ("Forgot your password? Contact Eli."), a new account, Home, the Menu rows
// What's new, Share SLAM, Privacy, Export, Am I okay?.
// Walk 2, a client with a coach's invite link (?coach=1): the sign-up line says that sharing starts on.
// At each step it records: errors of the console and of the page, sideways scroll, "undefined" / "NaN" / "null" /
// "[object" in the words, a main button under 44 pixels high, a blame word, an em dash.
// Exit code 1 when a check fails or a step has a finding.
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); } catch { ({ chromium } = require('playwright')); }
const BASE = process.env.SLAM_URL || 'http://localhost:8537';
const OUT = process.env.WALK_OUT || '';
const SIZES = (process.env.WALK_SIZES || '390x640,390x844').split(',').map(s => s.split('x').map(Number));
const DASH = String.fromCharCode(0x2014);
const stub = `
  (function () {
    const chain = () => { const p = Promise.resolve({ data: [], error: null }); const o = new Proxy(function () {}, {
      get: (t, k) => (k === 'then' ? p.then.bind(p) : k === 'catch' ? p.catch.bind(p) : () => o), apply: () => o }); return o; };
    // The sign-in is kept as the real library keeps it (one entry in the storage of the browser), so a reload
    // of the page finds the same person.
    const KEYS = 'sb-standin-auth-token';
    let session = null;
    try { session = JSON.parse(localStorage.getItem(KEYS) || 'null'); } catch (e) { session = null; }
    const make = email => { session = { access_token: 'stand-in', user: { id: '11111111-2222-4333-8444-555555555555', email } }; localStorage.setItem(KEYS, JSON.stringify(session)); };
    window.supabase = { createClient: () => ({
      auth: { getSession: async () => ({ data: { session } }), onAuthStateChange: () => {},
        signUp: async o => { make(o.email); return { data: { session, user: session.user }, error: null }; },
        signInWithPassword: async () => ({ data: {}, error: { message: 'Invalid login credentials' } }),
        signOut: async () => { session = null; localStorage.removeItem(KEYS); return {}; } },
      from: () => chain(), rpc: () => chain() }) };
  })();`;
let bad = 0;
const log = [];
const chk = (name, ok, info) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + name + (info === undefined || ok ? '' : ' ' + JSON.stringify(info))); };

// What a person sees on the top layer of the screen, and its main buttons.
const look = () => {
  const top = document.querySelector('#rp-dialog') || document.querySelector('#su-gate') || document.querySelector('#door') ||
    [...document.querySelectorAll('#ov')].find(e => e.offsetParent || e.getClientRects().length) || document.body;
  const text = top.innerText || '';
  // The main buttons: what a person taps to answer or to go on. The small buttons of the frame of a sheet (Back,
  // Close, the page dots) and the slim buttons (the game's own slim style: Look up a word, Show more) are listed apart, as "frame".
  const MAIN = '.primary, .ghost.wide:not(.slim), .go, .chip, .rowbtn, .door-go, .door-in2, .door-sheet, .su-go, .su-other, .rp-btn, [data-a=doorsave]';
  const low = [...top.querySelectorAll('button, a.ghost, a.primary, summary, a.door-sheet')]
    .filter(b => b.getClientRects().length && getComputedStyle(b).visibility !== 'hidden')
    .map(b => ({ t: (b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 40), h: Math.round(b.getBoundingClientRect().height), main: b.matches(MAIN) }))
    .filter(b => b.h > 0 && b.h < 44);
  const small = low.filter(b => b.main).map(b => b.t + ' ' + b.h), frame = low.filter(b => !b.main).map(b => b.t + ' ' + b.h);
  return { text, small, frame, wide: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
};

async function walk(browser, w, h, query, tag) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block', isMobile: true, hasTouch: true });
  await ctx.route(/cdn\.jsdelivr\.net/, r => r.fulfill({ contentType: 'application/javascript', body: stub }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route(/supabase\.co\//, r => r.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST205', message: "Could not find the table 'public.reports' in the schema cache" }) }));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('page: ' + String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errs.push('console: ' + m.text()); });
  let n = 0;
  const step = async (name, opt = {}) => {
    await page.waitForTimeout(250);
    const s = await page.evaluate(look);
    const found = [];
    if (errs.length) found.push({ errors: errs.splice(0) });
    if (s.wide) found.push('sideways scroll');
    const j = s.text.match(/undefined|NaN|\bnull\b|\[object/);
    if (j) found.push('the word ' + j[0]);
    const bl = s.text.match(/\b(mistakes?|failed|behind|off track)\b/i);
    if (bl && !opt.blameOk) found.push('blame word: ' + bl[0] + ' in "' + s.text.slice(Math.max(0, bl.index - 40), bl.index + 40).replace(/\n/g, ' ') + '"');
    if (s.text.includes(DASH)) found.push('an em dash');
    if (s.small.length && !opt.smallOk) found.push({ under44: s.small });
    const file = `${tag}-${String(++n).padStart(2, '0')}-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    if (OUT) { fs.mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: path.join(OUT, file + '.png') }); }
    log.push({ walk: tag, step: name, found, frame: s.frame, words: s.text.replace(/\s+/g, ' ').slice(0, 400) });
    chk(`${tag}: ${name}: nothing to stumble on`, found.length === 0, found);
    return s.text;
  };
  const tap = async sel => { await page.locator(sel).first().click(); await page.waitForTimeout(150); };
  await page.goto(BASE + '/game/' + query, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  return { ctx, page, step, tap };
}

// The taps of a person through the setup: the answer to the open question, or "That's all", or Next.
const WANT = { ageDec: '30s', age: '34', work: 'Established', incKinds: 'A main job', payFreq: 'Every 2 weeks', steady: 'Steady', homeQ: '', live: 'On my own', rel: 'Single by choice', deps: 'None', share: 'No one', debtKinds: 'Credit card balance', accts: 'Checking', can1k: 'No', cover: 'Less than a month', invest: 'No' };
async function setup(page, tap, step) {
  let taps = 0, pageNo = -1;
  for (let i = 0; i < 60; i++) {
    const cur = await page.evaluate(() => (W && W.kind === 'setup' ? W.step : null));
    if (cur === null) break;
    if (cur !== pageNo) { pageNo = cur; await step('setup page ' + (cur + 1)); }
    const pick = await page.evaluate(want => {
      const vis = [...document.querySelectorAll('#ov .sheet button')].filter(b => b.offsetParent && !b.disabled);
      const on = b => /(^| )(on|sel)( |$)/.test(b.className);
      const mark = (b, why) => { b.setAttribute('data-robot', '1'); return why; };
      for (const b of vis) {
        const k = b.dataset.k, a = b.dataset.a;
        if (!k || !(k in want) || !['set', 'setn', 'tog', 'agedec'].includes(a)) continue;
        const answered = vis.some(x => x.dataset.k === k && on(x)) || (W.o[k] != null && !Array.isArray(W.o[k]) && k !== 'ageDec' && k !== 'age') || (W.robot || {})[k];
        if (answered) continue;
        if (want[k] === '' || b.dataset.v === want[k]) { W.robot = Object.assign(W.robot || {}, { [k]: 1 }); return mark(b, k); }
      }
      const all = vis.find(b => /^That's all$/.test(b.innerText.trim()));
      if (all) return mark(all, "That's all");
      // the spiral (game/features/spiral.js) moves on with spnext and spgo between the rounds
      const nx = vis.find(b => ['wnext', 'spnext', 'spgo'].includes(b.dataset.a));
      return nx ? mark(nx, 'Next') : 'STUCK';
    }, WANT);
    if (pick === 'STUCK') { chk('the setup always has a next tap', false); break; }
    await tap('#ov [data-robot="1"]');
    taps++;
    await page.evaluate(() => document.querySelectorAll('[data-robot]').forEach(b => b.removeAttribute('data-robot')));
    // the game ignores a second Next that comes at once, and an answer draws the next question after a moment
    await page.waitForTimeout(650);
  }
  return taps;
}

(async () => {
  const browser = await chromium.launch();
  for (const [w, h] of SIZES) {
    const tag = `${w}x${h}`;
    // Walk 1: the visitor of the slide link
    let { ctx, page, step, tap } = await walk(browser, w, h, '?ref=abc123', tag);
    chk(`${tag}: a new visitor sees the landing screen`, await page.locator('#door').isVisible());
    await step('landing');
    chk(`${tag}: one filled button on the landing (Start)`, (await page.locator('#door .door-go').count()) === 1);
    await tap('#door summary');
    const what = await step('what is this open');
    chk(`${tag}: What is this? has the advice line, the privacy link and the blank FIRE sheet button`,
      /Education and tools, not financial advice\./.test(what) && /Privacy: what is stored and who sees it/.test(what) &&
      (await page.locator('#door a.door-link').getAttribute('href')) === './privacy.html' && (await page.locator('#door a.door-sheet').count()) === 1);
    await tap('#door summary');
    chk(`${tag}: What is this? closes again`, !(await page.locator('#door details').evaluate(d => d.open)));
    await tap('#door [data-door=start]');
    chk(`${tag}: the first question is "Am I okay?", with no typing`, /Am I okay\?/.test(await page.locator('#ov h2').first().innerText()) && !(await page.locator('#ov input:visible').count()));
    const taps = await setup(page, tap, step);
    await page.waitForTimeout(400);
    const ans = await step('the answer');
    chk(`${tag}: the payoff reveal after ${taps} taps, as a Guess with no grade`, /Here's where you stand/.test(ans) && /Guess/.test(ans) && /typical/.test(ans));
    chk(`${tag}: one filled button (Start my first win), and the offer to save`, (await page.locator('#ov button.primary:visible').count()) === 1 && (await page.locator('#ov [data-a=doorsave]').isVisible()));
    chk(`${tag}: the answer has a Report button`, await page.locator('#ov [data-a=flag]').isVisible());
    // Report from the answer
    await page.locator('#ov [data-a=flag]').scrollIntoViewIfNeeded();
    await tap('#ov [data-a=flag]');
    const sheet = await step('report sheet');
    chk(`${tag}: the Report sheet names its three kinds and has Close`, /Bug/.test(sheet) && /Idea/.test(sheet) && /Confusing/.test(sheet) && (await page.locator('#rp-dialog [data-rp=close]').isVisible()));
    chk(`${tag}: Send waits for a kind and says why`, (await page.locator('#rp-dialog [data-rp=send]').isDisabled()) && /Pick one of the three first/.test(sheet));
    await page.locator('#rp-dialog [data-rp=type]', { hasText: 'Confusing' }).click();
    await page.locator('#rp-note').fill('I did not know what a cushion is.');
    await step('report filled');
    await tap('#rp-dialog [data-rp=send]');
    await page.waitForTimeout(500);
    const said = await step('report sent');
    chk(`${tag}: before the database file runs, the person is told "Saved on this device"`, /Saved on this device\. It sends itself when the report inbox is ready\./.test(said), said.slice(0, 200));
    await tap('#rp-dialog [data-rp=done]');
    chk(`${tag}: Done returns to the answer`, !(await page.locator('#rp-dialog').count()) && /Here's where you stand/.test(await page.locator('#ov').innerText()));
    chk(`${tag}: the address still has ?ref=abc123`, /\?ref=abc123/.test(page.url()));
    // The account
    await page.locator('#ov [data-a=doorsave]').scrollIntoViewIfNeeded();
    await tap('#ov [data-a=doorsave]');
    const up = await step('sign-up');
    chk(`${tag}: sign-up: sharing starts off for a public link`, /Share with my coach starts off/i.test(up), up.slice(0, 600));
    chk(`${tag}: sign-up: the advice line and the privacy link`, /Education and tools, not financial advice\./.test(up) && (await page.locator('#su-gate a[href="./privacy.html"]').count()) >= 1);
    chk(`${tag}: sign-up: one filled button, and a way back`, (await page.locator('#su-gate .su-go').count()) === 1 && (await page.locator('#su-gate [data-door-back]').isVisible()));
    await tap('#su-gate [data-m=in]');
    const inn = await step('sign-in');
    chk(`${tag}: sign-in says "Forgot your password? Contact Eli."`, /Forgot your password\? Contact Eli\./.test(inn), inn.slice(0, 400));
    await tap('#su-gate [data-m=new]');
    await page.locator('#su-e').fill('new.person@example.com');
    await page.locator('#su-p').fill('demo-pass-1');
    await tap('#su-gate .su-go');
    await page.waitForTimeout(900);
    chk(`${tag}: the account is made: no sign-up screen, no landing`, !(await page.locator('#su-gate').count()) && !(await page.locator('#door').count()));
    if (await page.evaluate(() => typeof SH !== 'undefined' && !!SH)) { await page.evaluate(() => closeSheet()); await page.waitForTimeout(300); }
    const home = await step('home', { smallOk: true });
    chk(`${tag}: Home keeps the game of the visitor (no demo), with a Report button on the first screen`, (await page.evaluate(() => !G.demo)) && (await page.locator('#app [data-a=flag], .topbar [data-a=flag]').first().isVisible()), home.slice(0, 200));
    chk(`${tag}: Home no longer asks to make an account`, !(await page.locator('#app [data-a=doorsave]').count()));
    // The Menu rows
    for (const [row, want] of [["What's new", /What's new/], ['Share SLAM', /ref=/], ['Privacy', null], ['Export', /Excel or Google Sheets/], ['Am I okay?', /From your taps/]]) {
      await tap('[data-a=menu]');
      // the Menu is in groups (UX pass, phase 2): the robot finds the row with "Find a tool", as a person can
      await page.waitForTimeout(400);
      await page.locator('#ov #mnfind').fill(row);
      await page.waitForTimeout(400);
      const btn = page.locator('#ov #mnres .menurow', { hasText: row }).first();
      const there = await btn.count();
      chk(`${tag}: the Menu has the row "${row}"`, there > 0);
      if (!there) { await page.evaluate(() => closeSheet()); continue; }
      await page.waitForTimeout(400);
      if (row === 'Privacy') {
        await Promise.all([page.waitForURL(/privacy\.html/), btn.click()]);
        await page.waitForTimeout(400);
        const pv = await step('privacy page', { smallOk: false });
        chk(`${tag}: the privacy page says what is stored, and has Delete my account and a way back`, /Delete my account/.test(pv) && /Supabase/.test(pv) && (await page.locator('a', { hasText: /Back to/ }).count()) > 0, pv.slice(0, 200));
        await page.goBack({ waitUntil: 'load' });
        await page.waitForTimeout(700);
        continue;
      }
      await btn.click();
      await page.waitForTimeout(400);
      const t = await step('menu ' + row);
      chk(`${tag}: "${row}" opens its screen`, want.test(t), t.slice(0, 160));
      chk(`${tag}: "${row}" has a way back`, (await page.locator('#ov [data-a=close]:visible, #ov [data-a=navback]:visible, #ov [data-a=back]:visible').count()) > 0);
      await page.evaluate(() => closeSheet());
      await page.waitForTimeout(250);
    }
    await ctx.close();
    // Walk 2: a client with a coach's invite link
    ({ ctx, page, step, tap } = await walk(browser, w, h, '?coach=1', tag + '-invite'));
    await step('landing');
    await tap('#door [data-door=in]');
    await tap('#su-gate [data-m=new]');
    const inv = await step('sign-up');
    chk(`${tag}: invite: the sign-up line says that sharing starts on`, /starts on/i.test(inv) && !/starts off/i.test(inv), inv.slice(0, 600));
    await ctx.close();
  }
  await browser.close();
  if (OUT) fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify(log, null, 1));
  console.log(bad ? `${bad} FAILED` : 'all ok');
  process.exit(bad ? 1 : 0);
})();
