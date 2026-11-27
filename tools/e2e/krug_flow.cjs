// The Krug self-check of the opening of SLAM the Game (What it is / What it could be), walked in a real browser
// (Chromium through Playwright) by four made-up first-time players. It counts the taps of each one from the landing
// to the first number, to the result screen and to Home, and it notes on each screen: how many controls pulse, how
// tall the screen is against the window, where the screen stands after the tap, and sideways scroll.
// Serve the repository (python3 -m http.server 8431), then: node tools/e2e/krug_flow.cjs
// Env: SLAM_URL (default http://localhost:8431), KRUG_OUT (a file for the numbers as JSON; default: none),
// KRUG_W (the widths, default "390,1280,1440").
// The players (the same four each time, so a later run can be compared with an earlier one):
//   1. 27, renting, $60K invested           2. 38, a couple, a 401(k) match and a mortgage
//   3. 31, self-employed, uneven income     4. 29, with $18K of card debt
// Each one taps what such a person wants, Next, the four range chips, and then the one main button of each screen.
// The sign-in script comes from a CDN the build machine cannot reach: a stand-in answers (nobody signed in).
// Exit code 1 when a player does not reach Home.
const fs = require('fs');
let chromium;
try { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); } catch { try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); } }
const BASE = process.env.SLAM_URL || 'http://localhost:8431';
const OUT = process.env.KRUG_OUT || '';
const WIDTHS = (process.env.KRUG_W || '390,1280,1440').split(',').map(Number);
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
/* wants: the chips of What you want. taps: the chip of each of the four questions (its place in CB_RNG). */
const PLAYERS = [
  { who: '27, renting, $60K invested', wants: ['early'], taps: { age: 1, spend: 2, inv: 3, save: 3 } },
  { who: '38, a couple, a 401(k) match and a mortgage', wants: ['ontime', 'kids'], taps: { age: 3, spend: 5, inv: 5, save: 4 } },
  { who: '31, self-employed, uneven income', wants: ['cushion', 'business'], taps: { age: 2, spend: 2, inv: 2, save: 2 } },
  { who: '29, with $18K of card debt', wants: ['debt'], taps: { age: 1, spend: 2, inv: 1, save: 1 } },
];
/* What one screen looks like now: the controls that pulse, the height, the place, sideways scroll. */
const look = page => page.evaluate(() => {
  const sh = document.querySelector('#ov .sheet'), root = sh || document.documentElement;
  const seen = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const pulse = Array.prototype.filter.call((sh || document).querySelectorAll('button, .pulse, .cbnext'), el => seen(el) && /pulse/.test(getComputedStyle(el).animationName));
  return {
    step: typeof W !== 'undefined' && W && W.kind === 'cb' ? W.step + (W.step === 'entry' ? ' ' + ((W.q || 0) + 1) : '') : sh ? 'a sheet' : 'Home',
    pulses: pulse.length,
    pulseWords: pulse.map(el => (el.innerText || el.className).replace(/\s+/g, ' ').trim().slice(0, 40)),
    tall: Math.round((root.scrollHeight / innerHeight) * 10) / 10,
    at: Math.round(root.scrollTop),
    sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
});

async function walk(browser, P, width) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 }, serviceWorkers: 'block' });
  await ctx.route(/cdn\.jsdelivr\.net/, r => r.fulfill({ contentType: 'application/javascript', body: stub }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + '/game/', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const R = { who: P.who, width, taps: 0, first: null, result: null, home: null, screens: [], errs };
  const tap = async sel => {
    const el = page.locator(sel).first();
    await el.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => { const s = document.querySelector('#ov .sheet'); return s ? Math.round(s.scrollTop) : 0; });
    await el.click();
    R.taps++;
    await page.waitForTimeout(700);
    const L = await look(page);
    L.tap = R.taps;
    L.wasAt = before;
    R.screens.push(L);
    return L;
  };
  await tap('#door [data-door=start]');
  for (const id of P.wants) await tap(`#ov [data-a=wnpick][data-v=${id}]`);
  await tap('#ov [data-a=wnnext]');
  for (const q of ['age', 'spend', 'inv', 'save']) await tap(`#ov [data-a=cbset][data-q=${q}][data-i="${P.taps[q]}"]`);
  if (await page.locator('#ov [data-cbn=is]').count()) R.first = R.taps;
  /* the one main button of each screen, to the result */
  for (const sel of ['#ov [data-a=cbgo][data-v=next]', '#ov [data-a=cbgo][data-v=stack]', '#ov [data-a=cbgo][data-v=reveal]', '#ov [data-a=cbgo][data-v=end]']) {
    if (!(await page.locator(sel).count())) break;
    await tap(sel);
  }
  if (await page.locator('#ov [data-a=cbfirst]').count()) R.result = R.taps;
  if (R.result != null) {
    await tap('#ov [data-a=cbfirst]');
    if (!(await page.locator('#ov .sheet').count())) R.home = R.taps;
  }
  await ctx.close();
  return R;
}

(async () => {
  const browser = await chromium.launch();
  const all = [];
  let bad = 0;
  for (const P of PLAYERS)
    for (const w of WIDTHS) {
      const R = await walk(browser, P, w);
      all.push(R);
      if (R.home == null || R.errs.length) bad++;
      const many = R.screens.filter(s => s.pulses !== 1).map(s => s.step + ': ' + s.pulses);
      const jumps = R.screens.filter(s => s.wasAt > 0 && s.at === 0 && s.tall > 1).map(s => s.step);
      console.log(`${R.who} at ${w}: first number ${R.first}, result ${R.result}, Home ${R.home}. Tallest screen of the flow ${Math.max(...R.screens.filter(s => s.step !== 'Home').map(s => s.tall))} windows (${R.screens.filter(s => /^(is|chart|stack|reveal)$/.test(s.step)).map(s => s.step + ' ' + s.tall).join(', ')}). ` +
        `Screens with no pulse or more than one: ${many.length ? many.join('; ') : 'none'}. Jumped to the top: ${jumps.length ? jumps.join(', ') : 'none'}. ` +
        `Sideways scroll: ${R.screens.filter(s => s.sideways).map(s => s.step).join(', ') || 'none'}.` + (R.errs.length ? ' Errors: ' + R.errs.join(' | ') : ''));
    }
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(all, null, 1));
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
