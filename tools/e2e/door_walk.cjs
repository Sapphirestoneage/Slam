// The front door of SLAM the Game, walked in a real browser (Chromium through Playwright).
// Serve the repository (python3 -m http.server 8431), then: node tools/e2e/door_walk.cjs
// Env: SLAM_URL (default http://localhost:8431), DOOR_OUT (a folder for the screenshots; default: none).
// The Supabase script comes from a CDN that the build machine cannot reach, and a walk must not touch the real
// database, so a stand-in answers in its place: nobody signed in (a new visitor), or one signed-in person.
// The walk: (1) a new visitor from the link with ?ref= at 390 x 640: the landing, all of it on the first screen,
// one primary button; (2) Start, the one opening (What it is / What it could be: four taps to the first number, the
// chart, the last screen), then the rest of setup with the taps of a person, to the payoff reveal ("Here's where you stand"), with the count of taps and
// the time; (3) the address still has ?ref=; (4) the offer to save opens "Create your account", and Back returns to
// the game; (5) the same visitor again: straight to the game; (6) a signed-in person: no landing; (7) 1280 wide.
// Exit code 1 when a check fails.
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); } catch { ({ chromium } = require('playwright')); }
const BASE = process.env.SLAM_URL || 'http://localhost:8431';
const OUT = process.env.DOOR_OUT || '';
const stub = signedIn => `
  (function () {
    const chain = () => { const p = Promise.resolve({ data: [], error: null }); const o = new Proxy(function () {}, {
      get: (t, k) => (k === 'then' ? p.then.bind(p) : k === 'catch' ? p.catch.bind(p) : () => o), apply: () => o }); return o; };
    const session = ${signedIn ? `{ user: { id: 'user-1', email: 'demo@example.com' } }` : 'null'};
    window.supabase = { createClient: () => ({
      auth: { getSession: async () => ({ data: { session } }), onAuthStateChange: () => {},
        signUp: async () => ({ data: {}, error: null }), signInWithPassword: async () => ({ data: {}, error: { message: 'stand-in' } }),
        signOut: async () => ({}) },
      from: () => chain(), rpc: () => chain() }) };
  })();`;
let bad = 0;
const chk = (name, ok, info) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + name + (info === undefined || ok ? '' : ' ' + JSON.stringify(info))); };

async function open(browser, signedIn, w, h, storage) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, storageState: storage, serviceWorkers: 'block' });
  await ctx.route(/cdn\.jsdelivr\.net/, r => r.fulfill({ contentType: 'application/javascript', body: stub(signedIn) }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errs.push(m.text()); });
  await page.goto(BASE + '/game/?ref=abc123', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  return { ctx, page, errs };
}
const shot = async (page, name) => { if (OUT) { fs.mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: path.join(OUT, name + '.png') }); } };
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
const junk = page => page.evaluate(() => /undefined|NaN/.test((document.querySelector('#door') || document.querySelector('#ov') || document.body).innerText));

(async () => {
  const browser = await chromium.launch();
  // 1. a new visitor at 390 x 640
  let { ctx, page, errs } = await open(browser, false, 390, 640);
  chk('a new visitor sees the landing screen', await page.locator('#door').isVisible());
  const box = async sel => page.locator(sel).first().boundingBox();
  for (const [name, sel] of [['the one line', '#door h1'], ['Start', '#door [data-door=start]'], ['Sign in', '#door [data-door=in]'], ['the trust line', '#door .door-by'], ['What is this?', '#door summary'], ['Report', '#door [data-a=flag]']]) {
    const b = await box(sel);
    chk(name + ' is on the first screen at 390 x 640, with no scroll', b && b.y >= 0 && b.y + b.height <= 640 && b.x >= 0 && b.x + b.width <= 390, b);
  }
  const st = await box('#door [data-door=start]');
  chk('Start is a big button (at least 300 x 60)', st.width >= 300 && st.height >= 60, st);
  chk('each tap target is at least 44 high', (await box('#door [data-door=in]')).height >= 44 && (await box('#door summary')).height >= 44);
  chk('What is this? is closed', !(await page.locator('#door details').evaluate(d => d.open)));
  chk('no sideways scroll on the landing', !(await sideways(page)));
  await shot(page, '1-landing-390');
  await page.locator('#door summary').click();
  chk('What is this? opens in place', await page.locator('#door .door-what').isVisible());
  chk('it shows the advice line and the blank FIRE sheet button', /Education and tools, not financial advice\./.test(await page.locator('#door').innerText()) && (await page.locator('#door a.door-sheet').getAttribute('href')).endsWith('/copy'));
  chk('open: no sideways scroll, no undefined', !(await sideways(page)) && !(await junk(page)));
  await shot(page, '2-landing-open-390');
  await page.locator('#door summary').click();
  // 2. Start, and the taps of a person
  const t0 = Date.now();
  let taps = 0;
  const tap = async sel => { await page.locator(sel).first().click(); taps++; await page.waitForTimeout(120); };
  // The setup asks one question at a time and fills in what your earlier taps already say, so a question that is
  // not on the screen needs no tap.
  const chip = async (k, v) => {
    const sel = `#ov [data-k="${k}"][data-v="${v}"]`;
    if (await page.locator(sel).first().isVisible()) await tap(sel);
    else console.log(`     (no tap needed for ${k})`);
  };
  await tap('#door [data-door=start]');
  chk('Start: no sign-in screen, no landing', !(await page.locator('#su-gate').count()) && !(await page.locator('#door').count()));
  // Run A (Nov 27 2026): the one opening of a new player is What it is / What it could be (game/features/couldbe.js):
  // four answers by range chips, then the first number. The setup rounds come after it, from its last screen.
  // Run SLAM-ONBOARD-1 (Nov 27 2026): the first screen is What you want (game/features/wants.js): chips, no typing.
  chk('the first screen is What you want: chips, no typing', /What do you want\?/.test(await page.locator('#ov').innerText()) && (await page.locator('#ov [data-a=wnpick]').count()) === 11 && !(await page.locator('#ov input:visible').count()));
  chk('What you want: no sideways scroll, no undefined', !(await sideways(page)) && !(await junk(page)));
  await shot(page, '2b-what-you-want-390');
  await tap('#ov [data-a=wnskip]'); await page.waitForTimeout(400);
  chk('then the first of four questions, not the setup rounds', /Question 1 of 4/.test(await page.locator('#ov').innerText()) && /How old are you\?/.test(await page.locator('#ov').innerText()) && !/Am I okay\?|Question 1 of 5|Here's where you stand/.test(await page.locator('#ov').innerText()));
  chk('the first question asks for no typing', !(await page.locator('#ov input:visible').count()));
  await shot(page, '3-first-question-390');
  for (const [q, i] of [['age', 2], ['spend', 2], ['inv', 2], ['save', 3]]) { await tap(`#ov [data-a=cbset][data-q=${q}][data-i="${i}"]`); await page.waitForTimeout(550); }
  const top = await page.locator('#ov .cbtop').innerText();
  chk('the first number shows after 6 taps or fewer from the landing (Start, What you want, four answers)', taps <= 6 && /What it is/i.test(top) && /\$[\d,]+/.test(top), [taps, top]);
  console.log(`     taps from the landing to the first number: ${taps}`);
  chk('the two numbers start equal', (await page.locator('#ov [data-cbn=is]').innerText()) === (await page.locator('#ov [data-cbn=could]').innerText()) && /equal until you count something/.test(await page.locator('#ov').innerText()));
  chk('What it is: no sideways scroll, no undefined', !(await sideways(page)) && !(await junk(page)));
  await shot(page, '3a-what-it-is-390');
  await tap('#ov [data-a=cbgo][data-v=next]'); await page.waitForTimeout(550);
  chk('the chart shows, stacked, with the two numbers still on top', (await page.locator('#ov svg.dkstack').isVisible()) && (await page.locator('#ov .cbtop').isVisible()));
  const cw = await page.locator('#ov svg.dkstack').boundingBox();
  chk('the chart fits 390 wide', cw && cw.x >= 0 && cw.x + cw.width <= 390 && !(await sideways(page)) && !(await junk(page)), cw);
  await shot(page, '3c-chart-390');
  // the stack, the reveal, the last screen (three buttons only), then Home, where the rest of setup is
  await tap('#ov [data-a=cbgo][data-v=stack]'); await page.waitForTimeout(1000);
  await tap('#ov [data-a=cbgo][data-v=reveal]'); await page.waitForTimeout(1000);
  chk('the reveal comes at the ninth tap, with the difference and the finished chart', taps === 9 && (await page.locator('#ov [data-fid="cb:diff"]').isVisible()) && (await page.locator('#ov svg.dkstack').count()) === 1 && !(await sideways(page)) && !(await junk(page)), taps);
  await shot(page, '3d-reveal-390');
  await tap('#ov [data-a=cbgo][data-v=end]'); await page.waitForTimeout(1000);
  console.log(`     taps from the landing to the last screen of the flow: ${taps}`);
  chk('the last screen has three buttons only: Keep my plan: make a free account, Share my card, Tell Eli what broke', /Keep my plan: make a free account/.test(await page.locator('#ov [data-a=cbsave]').innerText()) && (await page.locator('#ov [data-fid="cb:end3"] button').count()) === 3 && (await page.locator('#ov [data-a=cbsave]').isVisible()) && (await page.locator('#ov [data-a=cbshare]').isVisible()) && (await page.locator('#ov [data-fid="cb:end3"] [data-a=flag]').isVisible()) && !(await page.locator('#ov [data-a=cbrest]').count()) && (await page.locator('#ov [data-a=gohome]').first().isVisible()));
  await shot(page, '3e-last-screen-390');
  await tap('#ov [data-a=gohome]'); await page.waitForTimeout(1000);
  chk('Home starts with the two numbers and the small chart, and has the rest of setup', (await page.locator('#app [data-fid="cb:home"] svg.dkstack').isVisible()) && (await page.locator('#app [data-fid="cb:homerest"]').isVisible()) && !(await sideways(page)) && !(await junk(page)));
  await shot(page, '3f-home-390');
  await tap('#app [data-fid="cb:homerest"]'); await page.waitForTimeout(550);
  chk('the rest of setup opens under "Am I okay?"', /Am I okay\?/.test(await page.locator('#ov').innerText()) && (await page.evaluate(() => W && W.kind === 'setup' && W.cbRest === true)));
  // The setup asks one question at a time and fills in what the earlier taps already say. So the robot looks at the
  // screen as a person does: it taps its answer to the open question, or "That's all", or Next.
  const WANT = { ageDec: '30s', age: '34', work: 'Established', incKinds: 'A main job', payFreq: 'Every 2 weeks', steady: 'Steady', homeQ: '', live: 'On my own', rel: 'Single by choice', deps: 'None', share: 'No one', debtKinds: 'Credit card balance', accts: 'Checking', can1k: 'No', cover: 'Less than a month', invest: 'No' };
  const path2 = [];
  for (let i = 0; i < 60; i++) {
    const pick = await page.evaluate(want => {
      if (!W || W.kind !== 'setup') return null;
      const vis = [...document.querySelectorAll('#ov .sheet button')].filter(b => b.offsetParent && !b.disabled);
      const on = b => /(^| )(on|sel)( |$)/.test(b.className);
      const mark = (b, why) => { b.setAttribute('data-robot', '1'); return why; };
      for (const b of vis) {
        const k = b.dataset.k, a = b.dataset.a;
        if (!k || !(k in want) || !['set', 'setn', 'tog', 'agedec'].includes(a)) continue;
        const answered = vis.some(x => x.dataset.k === k && on(x)) || (W.o[k] != null && !Array.isArray(W.o[k]) && k !== 'ageDec' && k !== 'age') || (W.robot || {})[k];
        if (answered) continue;
        if (want[k] === '' || b.dataset.v === want[k]) { W.robot = Object.assign(W.robot || {}, { [k]: 1 }); return mark(b, k + ' = ' + b.dataset.v); }
      }
      const all = vis.find(b => /^That's all$/.test(b.innerText.trim()));
      if (all) return mark(all, "That's all");
      // the spiral (game/features/spiral.js) moves on with spnext and spgo between the rounds
      const nx = vis.find(b => ['wnext', 'spnext', 'spgo'].includes(b.dataset.a));
      return nx ? mark(nx, 'Next (page ' + (W.step + 1) + ')') : 'STUCK';
    }, WANT);
    if (pick === null) break;
    if (pick === 'STUCK') { chk('the robot always finds a next tap', false, path2); break; }
    await tap('#ov [data-robot="1"]');
    path2.push(pick);
    await page.evaluate(() => document.querySelectorAll('[data-robot]').forEach(b => b.removeAttribute('data-robot')));
    // the game ignores a second Next that comes at once, and an answer draws the next question after a moment
    await page.waitForTimeout(650);
    if (path2.length === 6) await shot(page, '3b-setup-390');
  }
  console.log('     the taps: Start, ' + path2.join(', '));
  await page.waitForTimeout(400);
  const secs = Math.round((Date.now() - t0) / 1000);
  const txt = await page.locator('#ov').innerText();
  // results first (game/features/results.js): the path ends on the one payoff reveal, with the offer to keep the game
  chk('the path ends on the payoff reveal', /Here's where you stand/.test(txt) && /Start my first win/.test(txt), txt.slice(0, 200));
  chk('the reveal marks typical numbers as a Guess', /Guess/.test(txt) && /typical/.test(txt));
  chk('the reveal offers to save by making an account', await page.locator('#ov [data-a=doorsave]').isVisible());
  chk('the answer: no sideways scroll, no undefined', !(await sideways(page)) && !(await junk(page)));
  console.log(`     taps from the landing through the flow and the rest of setup to the answer: ${taps} (the robot waits 0.65 s after each tap: ${secs} s in all)`);
  await shot(page, '4-answer-390');
  // 3. the mark in the link is still there
  chk('the address still has ?ref=abc123', /\?ref=abc123/.test(page.url()), page.url());
  // 4. the offer
  await tap('#ov [data-a=doorsave]');
  chk('Save opens "Create your account"', /Create your account/.test(await page.locator('#su-gate h1').innerText()));
  chk('the account screen fits 390 wide', !(await sideways(page)));
  await shot(page, '5-create-account-390');
  await page.locator('#su-gate [data-door-back]').click();
  chk('Back returns to the game on this device', !(await page.locator('#su-gate').count()) && !(await page.locator('#door').count()));
  await page.evaluate(() => closeSheet());
  await page.waitForTimeout(200);
  chk('Home has the row "Keep this game"', await page.locator('#app [data-a=doorsave]').isVisible());
  chk('Home: no sideways scroll', !(await sideways(page)));
  await shot(page, '6-home-guest-390');
  chk('no error in the console (new visitor)', errs.length === 0, errs.slice(0, 3));
  // 5. the same visitor again
  const state = await ctx.storageState();
  await ctx.close();
  ({ ctx, page, errs } = await open(browser, false, 390, 640, state));
  chk('the same visitor again: straight to the game, no landing, no sign-in screen', !(await page.locator('#door').count()) && !(await page.locator('#su-gate').count()) && (await page.evaluate(() => !G.demo)));
  chk('no error in the console (visitor again)', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
  // 6. a signed-in person
  ({ ctx, page, errs } = await open(browser, true, 390, 640));
  chk('a signed-in person does not see the landing', !(await page.locator('#door').count()) && !(await page.locator('#su-gate').count()));
  chk('no error in the console (signed in)', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
  // 7. 1280 wide
  ({ ctx, page, errs } = await open(browser, false, 1280, 800));
  chk('1280 wide: the landing shows, with no sideways scroll', (await page.locator('#door').isVisible()) && !(await sideways(page)));
  await shot(page, '7-landing-1280');
  await ctx.close();
  await browser.close();
  console.log(bad ? `${bad} FAILED` : 'all ok');
  process.exit(bad ? 1 : 0);
})();
