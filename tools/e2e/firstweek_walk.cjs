// A calmer first week (Batch B, phase 5) of SLAM the Game, walked in a real browser (Chromium through Playwright).
// Serve the repository (python3 -m http.server 8431), then: node tools/e2e/firstweek_walk.cjs
// Env: SLAM_URL (default http://localhost:8431), FW_OUT (a folder for the screenshots; default: none).
// Three players at 390, 1280 and 1440 wide: (1) day 1: the bar has four places, the menu has everything else in
// groups inside groups, the "i", the Tool library; (2) day 8 after the reveal: every tab is back and Home has one
// line "New for you" that does not pulse; (3) an existing player (a game of 40 days ago): no change.
// The sign-in script comes from a CDN the build machine cannot reach: a stand-in answers (nobody signed in).
// Exit code 1 when a check fails.
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); } catch { try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); } }
const BASE = process.env.SLAM_URL || 'http://localhost:8431';
const OUT = process.env.FW_OUT || '';
const stub = `
  (function () {
    const chain = () => { const p = Promise.resolve({ data: [], error: null }); const o = new Proxy(function () {}, {
      get: (t, k) => (k === 'then' ? p.then.bind(p) : k === 'catch' ? p.catch.bind(p) : () => o), apply: () => o }); return o; };
    window.supabase = { createClient: () => ({
      auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => {},
        signUp: async () => ({ data: {}, error: null }), signInWithPassword: async () => ({ data: {}, error: { message: 'stand-in' } }),
        signOut: async () => ({}) },
      from: () => chain(), rpc: () => chain() }) };
  })();`;
let bad = 0;
const chk = (name, ok, info) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + name + (info === undefined || ok ? '' : ' ' + JSON.stringify(info))); };
const shot = async (page, name) => { if (OUT) { fs.mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: path.join(OUT, name + '.png') }); } };
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
const junk = (page, sel) => page.evaluate(s => /undefined|NaN/.test((document.querySelector(s) || document.body).innerText), sel);
const barText = page => page.locator('#tabs button').allInnerTexts().then(a => a.map(t => t.replace(/\s+/g, ' ').trim().replace(/ \d+$/, '')));
const pulsing = page => page.evaluate(() => [...document.querySelectorAll('#app *')].filter(e => e.offsetParent && getComputedStyle(e).animationName !== 'none' && getComputedStyle(e).animationIterationCount === 'infinite').map(e => (e.getAttribute('data-a') || e.className || e.tagName) + ''));

(async () => {
  const browser = await chromium.launch();
  for (const w of [390, 1280, 1440]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w === 390 ? 760 : 900 }, serviceWorkers: 'block' });
    await ctx.route(/cdn\.jsdelivr\.net/, r => r.fulfill({ contentType: 'application/javascript', body: stub }));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errs.push(m.text()); });
    await page.goto(BASE + '/game/', { waitUntil: 'load' });
    await page.waitForTimeout(700);
    const tap = async sel => { await page.locator(sel).first().click(); await page.waitForTimeout(700); };
    const T = `at ${w}`;

    // ---- 1. day 1: a new visitor, the flow to Home (a player with a costly card: the save answer is the lowest)
    await tap('#door [data-door=start]');
    await tap('#ov [data-a=wnskip]'); // What you want (run SLAM-ONBOARD-1): Skip for now
    for (const [q, i] of [['age', 2], ['spend', 2], ['inv', 2], ['save', 3]]) await tap(`#ov [data-a=cbset][data-q=${q}][data-i="${i}"]`);
    await page.evaluate(() => { const c = C(); c.debts = [{ k: 'Credit card', amt: 18000, apr: 24, high: true, s: true, cf: 3 }]; syncAll(c); save(); });
    await tap('#ov [data-a=cbgo][data-v=next]');
    await tap('#ov [data-a=gohome]');
    await page.waitForTimeout(500);
    let bar = await barText(page);
    chk(`day 1 ${T}: the bar has four places: Home, Next Steps, My Money, My number`, bar.join('|') === 'Home|Next Steps|My Money|My number', bar);
    const boxes = await page.locator('#tabs button').evaluateAll(a => a.map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
    chk(`day 1 ${T}: each place of the bar is at least 44 by 44`, boxes.every(b => b[0] >= 44 && b[1] >= 44), boxes);
    chk(`day 1 ${T}: the top bar has the menu, Back and Home, and not Safe to spend or Where am I`, (await page.locator('#app .topbar [data-a=menu]').isVisible()) && (await page.locator('#app .topbar [data-a=navback]').count()) === 1 && (await page.locator('#app .topbar [data-a=gohome]').isVisible()) && !(await page.locator('#app .topbar [data-a=safe]').count()) && !(await page.locator('#app .topbar [data-a=quest]').count()));
    chk(`day 1 ${T}: Home has no sideways scroll, no undefined, no note`, !(await sideways(page)) && !(await junk(page, '#app')) && !(await page.locator('[data-fid="fw:new"]').count()));
    await shot(page, `1-day1-home-${w}`);
    await tap('#tabs [data-a=cbback]');
    chk(`day 1 ${T}: My number opens the flow`, /What it is/i.test(await page.locator('#ov').innerText()));
    await tap('#ov [data-a=gohome]');
    await tap('#app .topbar [data-a=menu]'); await page.waitForTimeout(1000);
    const tops = await page.locator('#ov details.mng:not(.mng2)').evaluateAll(a => a.map(d => d.dataset.g));
    chk(`day 1 ${T}: the menu has four groups: later, more, lib, settings`, tops.join(',') === 'later,more,lib,settings', tops);
    chk(`day 1 ${T}: every group starts closed, and the i is there`, !(await page.locator('#ov details[open]').count()) && (await page.locator('#ov [data-fid="fw:where"] [data-a=info]').isVisible()));
    await shot(page, `2-day1-menu-${w}`);
    await tap('#ov details[data-g=later] > summary');
    chk(`day 1 ${T}: My Goals, Me and Log money are rows of the first group`, (await page.locator('#ov details[data-g=later] .menurow').count()) === 3 && (await page.locator('#ov details[data-g=later] [data-v=goals]').isVisible()));
    await tap('#ov details[data-g=more] > summary');
    chk(`day 1 ${T}: Everything else opens and shows its six groups, closed`, (await page.locator('#ov details[data-g=more] > .mnrows > details.mng2').count()) >= 6 && (await page.locator('#ov details[data-g=more] details.mng2[data-g=plans] > summary').isVisible()) && !(await page.locator('#ov details.mng2[open]').count()));
    await tap('#ov details.mng2[data-g=plans] > summary');
    chk(`day 1 ${T}: a group inside opens and the outer group stays open`, (await page.locator('#ov details[data-g=more][open] details.mng2[data-g=plans][open] .menurow').first().isVisible()));
    const rb = await page.locator('#ov details.mng2[data-g=plans] .menurow').first().boundingBox();
    chk(`day 1 ${T}: a row inside is at least 44 high and inside the screen`, rb && rb.height >= 44 && rb.x >= 0 && rb.x + rb.width <= w, rb);
    chk(`day 1 ${T}: the open menu has no sideways scroll, no undefined`, !(await sideways(page)) && !(await junk(page, '#ov')));
    await shot(page, `3-day1-menu-open-${w}`);
    await tap('#ov details[data-g=lib] > summary');
    await tap('#ov details.mng2[data-g=lib-path] > summary');
    const a = page.locator('#ov details.mng2[data-g=lib-path] a.fwlib').first();
    const ab = await a.boundingBox();
    chk(`day 1 ${T}: the Tool library opens, and a page is a link to a new tab, at least 44 high`, (await a.isVisible()) && (await a.getAttribute('target')) === '_blank' && /^\.\.\/[a-z0-9]+\.html$/.test(await a.getAttribute('href')) && ab.height >= 44 && ab.x + ab.width <= w, ab);
    const st = await page.request.get(new URL(await a.getAttribute('href'), BASE + '/game/').href);
    chk(`day 1 ${T}: the page of the link is there`, st.ok(), st.status());
    chk(`day 1 ${T}: the library has no sideways scroll, no undefined`, !(await sideways(page)) && !(await junk(page, '#ov')));
    await shot(page, `4-day1-library-${w}`);
    await page.locator('#mnfind').fill('goals');
    await page.waitForTimeout(300);
    chk(`day 1 ${T}: Find a tool finds My Goals`, (await page.locator('#mnres [data-v=goals]').isVisible()));
    await page.locator('#mnfind').fill('');
    await page.waitForTimeout(200);
    await tap('#ov [data-fid="fw:where"] [data-a=info]');
    chk(`day 1 ${T}: the i says where everything went`, /Nothing was removed/.test(await page.locator('#ov').innerText()) && !(await sideways(page)));
    await shot(page, `5-day1-info-${w}`);
    await page.evaluate(() => { closeSheet(); ACT.menu(); });
    await page.waitForTimeout(1200);
    await tap('#ov details[data-g=later] > summary');
    await tap('#ov details[data-g=later] [data-v=goals]');
    chk(`day 1 ${T}: the row My Goals opens the tab, and the bar stays the bar of the first week`, (await page.evaluate(() => tab)) === 'goals' && (await barText(page)).length === 4 && !(await junk(page, '#app')) && !(await sideways(page)));
    await page.evaluate(() => { location.hash = '#/me'; });
    await page.waitForTimeout(300);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(900);
    chk(`day 1 ${T}: a link to the tab Me still opens it after a reload`, (await page.evaluate(() => tab)) === 'me' && (await barText(page)).length === 4, await page.evaluate(() => tab));
    await tap('#app .topbar [data-a=gohome]');

    // ---- 2. day 8, after the reveal
    await page.evaluate(() => { G.chars.forEach(c => (c.hist[0].d = addDays(todayISO(), -7))); save(); render(); });
    await page.waitForTimeout(400);
    chk(`day 8 ${T}: with no reveal the bar still has four places`, (await barText(page)).length === 4);
    await tap('#tabs [data-a=cbback]');
    await page.evaluate(() => { ACT.cbgo({ dataset: { v: 'stack' } }); });
    await page.waitForTimeout(1000);
    await tap('#ov [data-a=cbgo][data-v=reveal]');
    await page.waitForTimeout(500);
    await tap('#ov [data-a=gohome]');
    await page.waitForTimeout(500);
    bar = await barText(page);
    chk(`day 8 ${T}: after the reveal every tab is back, and + Log`, bar.join('|') === 'Home|Next Steps|My Money|My Goals|Me|+ Log', bar);
    const note = page.locator('#app [data-fid="fw:new"]');
    chk(`day 8 ${T}: Home has one line New for you, with a button Got it`, (await note.count()) === 1 && /New for you:/.test(await note.innerText()) && (await note.locator('[data-a=fwok]').isVisible()));
    const nb = await note.boundingBox(), gb = await note.locator('[data-a=fwok]').boundingBox();
    chk(`day 8 ${T}: the note is inside the screen and Got it is at least 44 high`, nb.x >= 0 && nb.x + nb.width <= w && gb.height >= 44, [nb, gb]);
    const pu = await pulsing(page);
    chk(`day 8 ${T}: nothing in the note pulses, and one thing at most pulses on Home`, pu.length <= 1 && !(await note.evaluate(n => [n, ...n.querySelectorAll('*')].some(e => getComputedStyle(e).animationName !== 'none'))), pu);
    chk(`day 8 ${T}: Safe to spend and Where am I are back`, (await page.locator('#app .topbar [data-a=safe]').count()) === 1 && (await page.locator('#app .topbar [data-a=quest]').count()) >= 1);
    chk(`day 8 ${T}: Home has no sideways scroll, no undefined`, !(await sideways(page)) && !(await junk(page, '#app')));
    await shot(page, `6-day8-home-${w}`);
    await tap('#app .topbar [data-a=menu]'); await page.waitForTimeout(1000);
    const tops8 = await page.locator('#ov details.mng:not(.mng2)').evaluateAll(a => a.map(d => d.dataset.g));
    chk(`day 8 ${T}: the menu is the menu of before, with the Tool library`, tops8.join(',') === 'money,people,plans,tools,learn,games,lib,settings', tops8);
    await shot(page, `7-day8-menu-${w}`);
    await page.evaluate(() => closeSheet());
    await tap('#app [data-a=fwok]');
    chk(`day 8 ${T}: Got it puts the note away, and it stays away after a reload`, !(await page.locator('[data-fid="fw:new"]').count()));
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(900);
    chk(`day 8 ${T}: after a reload: no note, every tab`, !(await page.locator('[data-fid="fw:new"]').count()) && (await barText(page)).length === 6);

    // ---- 3. an existing player: a game of 40 days ago that never had the calmer week
    await page.evaluate(() => { G.chars.forEach(c => { c.hist[0].d = addDays(todayISO(), -40); c.x.cb.rev = addDays(todayISO(), -30); }); delete G.fw; save(); render(); });
    await page.waitForTimeout(400);
    bar = await barText(page);
    chk(`existing ${T}: the bar of before`, bar.join('|') === 'Home|Next Steps|My Money|My Goals|Me|+ Log', bar);
    chk(`existing ${T}: no note, no mark of a calmer week`, !(await page.locator('[data-fid="fw:new"]').count()) && (await page.evaluate(() => !G.fw)));
    await tap('#app .topbar [data-a=menu]'); await page.waitForTimeout(1000);
    chk(`existing ${T}: the menu has no line about a first week and no group Everything else`, !(await page.locator('#ov [data-fid="fw:where"]').count()) && !(await page.locator('#ov details[data-g=more]').count()) && (await page.locator('#ov details[data-g=lib]').count()) === 1);
    chk(`existing ${T}: no sideways scroll, no undefined`, !(await sideways(page)) && !(await junk(page, '#ov')));
    await shot(page, `8-existing-menu-${w}`);
    await page.evaluate(() => closeSheet());
    await shot(page, `9-existing-home-${w}`);
    chk(`${T}: no error in the console`, errs.length === 0, errs.slice(0, 3));
    await ctx.close();
  }
  await browser.close();
  console.log(bad ? `\n${bad} check(s) failed.` : '\nAll checks passed.');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
