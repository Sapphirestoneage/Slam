// Your life timeline of SLAM the Game, walked in a real browser (Chromium through Playwright).
// Serve the repository (python3 -m http.server 8431), then: node tools/e2e/lifeline_walk.cjs
// Env: SLAM_URL (default http://localhost:8431), LL_OUT (a folder for the screenshots; default: none).
// One player with a costly card, at 390, 1280 and 1440 wide: the menu row opens the timeline; a marker opens its
// card; the age moves as a what-if, Keep it and Undo; a milestone of your own is added by taps, is a marker
// until its simulator has an answer, then counts; Back returns. No sideways scroll, no console error, tap targets
// of 44 pixels (the buttons of this screen; the top row of a sheet is the game's own). The sign-in script comes from a CDN the build machine cannot reach: a stand-in answers.
// Exit code 1 when a check fails.
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); } catch { try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); } }
const BASE = process.env.SLAM_URL || 'http://localhost:8431';
const OUT = process.env.LL_OUT || '';
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
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 ||
  [...document.querySelectorAll('#ov .sheet')].some(s => s.scrollWidth > s.clientWidth + 1));
const junk = page => page.evaluate(() => /undefined|NaN|\b0 of\b/.test((document.querySelector('#ov') || document.body).innerText));
const small = page => page.evaluate(() => [...document.querySelectorAll('#ov .sheet button')].filter(b => b.offsetParent && !b.classList.contains('i') && (/^ll/.test(b.dataset.a || '') || b.closest('.llcard')))
  .map(b => { const r = b.getBoundingClientRect(); return [b.dataset.a, Math.round(r.width), Math.round(r.height)]; }).filter(b => b[2] < 44 || b[1] < 44));

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

    // a new visitor, the opening, then Home; an older first day and the whole menu
    await tap('#door [data-door=start]');
    await tap('#ov [data-a=wnskip]');
    for (const [q, i] of [['age', 1], ['spend', 2], ['inv', 3], ['save', 3]]) await tap(`#ov [data-a=cbset][data-q=${q}][data-i="${i}"]`);
    await page.evaluate(() => { const c = C(); c.debts = [{ k: 'Credit card balance', amt: 8000, apr: '15% to 25%', rate: 22, pay: 200, high: true, s: true }]; syncAll(c);
      G.chars.forEach(x => (x.hist[0].d = addDays(todayISO(), -40))); G.menuAll = true; save(); });
    await tap('#ov [data-a=cbgo][data-v=next]');
    await tap('#ov [data-a=gohome]');
    await page.waitForTimeout(500);

    // the menu row
    await tap('#app .topbar [data-a=menu]');
    await page.locator('#ov input[type=search], #ov input').first().fill('life timeline');
    await page.waitForTimeout(700);
    chk(`${T}: Find reaches it with the words "life timeline"`, await page.locator('#ov [data-a=menugo][data-v=lifeline]').first().isVisible());
    await tap('#ov [data-a=menugo][data-v=lifeline]');
    chk(`${T}: the timeline opens`, /Your life timeline/.test(await page.locator('#ov').innerText()));
    chk(`${T}: the line has the debt marker and the FI marker`, (await page.locator('#ov [data-ll="debt"]').count()) === 1 && (await page.locator('#ov [data-ll="st:FI"]').count()) === 1);
    chk(`${T}: no sideways scroll on the line`, !(await sideways(page)));
    chk(`${T}: no undefined, NaN or "0 of"`, !(await junk(page)));
    chk(`${T}: each button is at least 44 by 44`, (await small(page)).length === 0, await small(page));
    await shot(page, `line-${w}`);

    // a marker opens its card
    await tap('#ov [data-a=llopen][data-v="st:FI"]');
    chk(`${T}: a tap opens the card with What for and Show the math`, /What for/.test(await page.locator('#ov [data-ll="card"]').innerText()) && (await page.locator('#ov [data-ll="card"] details.math').count()) >= 1);
    await page.locator('#ov [data-ll="card"] details.math summary').first().click();
    await page.waitForTimeout(300);
    chk(`${T}: Show the math ends with the assumptions line`, /Assumes/.test(await page.locator('#ov [data-ll="card"]').innerText()));
    chk(`${T}: no sideways scroll with a card open`, !(await sideways(page)));
    await shot(page, `card-${w}`);

    // the age: a what-if, Keep it, Undo
    const ret0 = await page.evaluate(() => C().ret);
    await tap('#ov [data-a=llopen][data-v=stop]');
    await tap('#ov [data-a=llret][data-v="-1"]');
    await tap('#ov [data-a=llret][data-v="-1"]');
    chk(`${T}: the what-if band shows, and the saved age did not move`, (await page.locator('#ov [data-ll="band"]').isVisible()) && (await page.evaluate(() => C().ret)) === ret0);
    chk(`${T}: the band says Recalculating`, /Recalculating/.test(await page.locator('#ov [data-ll="band"]').innerText()));
    chk(`${T}: no sideways scroll in a what-if`, !(await sideways(page)));
    chk(`${T}: each button of the what-if is at least 44 by 44`, (await small(page)).length === 0, await small(page));
    await shot(page, `whatif-${w}`);
    await tap('#ov [data-a=llkeep]');
    chk(`${T}: Keep it saves the age`, (await page.evaluate(() => C().ret)) === ret0 - 2);
    await tap('#ov [data-a=llundo]');
    chk(`${T}: Undo puts it back`, (await page.evaluate(() => C().ret)) === ret0);

    // a milestone of your own
    await tap('#ov [data-a=lladd]');
    chk(`${T}: the kinds are taps, no typing`, (await page.locator('#ov [data-a=llkind]').count()) === 5 && (await page.locator('#ov input').count()) === 0);
    chk(`${T}: no sideways scroll on Add`, !(await sideways(page)));
    await tap('#ov [data-a=llkind][data-v=baby]');
    chk(`${T}: each year chip is at least 44 high`, (await small(page)).length === 0, await small(page));
    await tap('#ov [data-a=llwhen][data-v="3"]');
    chk(`${T}: the baby is on the line as a marker that is not counted`, /Not counted yet/.test(await page.locator('#ov [data-ll="card"]').innerText()));
    await shot(page, `own-${w}`);
    await tap('#ov [data-a=simopen][data-v=kid]');
    chk(`${T}: the simulator opens from the card`, /Have a kid/.test(await page.locator('#ov').innerText()));
    await tap('#ov [data-a=navback]');
    chk(`${T}: Back returns to the timeline`, (await page.locator('#ov [data-ll="line"]').count()) === 1);
    await page.evaluate(() => { kitStore(C(), 'sim_kid').cost = { v: 12000, cf: 2 }; save(); drawSheet(); });
    await page.waitForTimeout(700);
    await tap('#ov [data-a=llcount]');
    chk(`${T}: with the player's own cost it counts as a what-if`, /What if/.test(await page.locator('#ov [data-ll="band"]').innerText()) && (await page.locator('#ov [data-a=llkeep]').count()) === 0);
    chk(`${T}: no sideways scroll at the end`, !(await sideways(page)));
    chk(`${T}: no undefined, NaN or "0 of" at the end`, !(await junk(page)));
    await tap('#ov [data-a=navclose]');
    chk(`${T}: no console error`, errs.length === 0, errs.slice(0, 3));
    await ctx.close();
  }
  await browser.close();
  console.log(bad ? `${bad} FAILED` : 'all ok');
  process.exit(bad ? 1 : 0);
})();
