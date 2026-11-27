// The layout walk of the opening of SLAM the Game (What it is / What it could be), run 14, items 8, 9 and 10.
// A real browser (Chromium through Playwright) opens every screen of the flow as a new visitor, at 390, 1280 and
// 1440 wide, and checks on each one: no sideways scroll (the page, the sheet, and no part past the right edge), and
// no count that reads "0 of". It also checks: a tap outside an open "i" closes it and the screen of the flow is
// there again; a tap outside a screen of the flow loses nothing; the reveal is four blocks, side by side on a wide
// screen (the two numbers top left and the widest) and one under the other on a phone, in the same order.
// Two made-up players: one who owes nothing, and one with costly debt (a card balance).
// Serve the repository (python3 -m http.server 8431), then: node tools/e2e/flow_walk.cjs
// Env: SLAM_URL (default http://localhost:8431), FLOW_W (the widths, default "390,1280,1440"),
// FLOW_SHOTS (a folder for a picture of each screen; default: none).
// Exit code 1 when a check does not hold.
let chromium;
try { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); } catch { try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); } }
const BASE = process.env.SLAM_URL || 'http://localhost:8431';
const WIDTHS = (process.env.FLOW_W || '390,1280,1440').split(',').map(Number);
const SHOTS = process.env.FLOW_SHOTS || '';
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
const bad = [];
let checks = 0;
const chk = (name, ok, more) => { checks++; if (!ok) { bad.push(name); console.log('NOT OK  ' + name + (more ? '  ' + JSON.stringify(more).slice(0, 300) : '')); } };

/* What one screen looks like: sideways scroll, a part past the right edge, a count that reads "0 of". */
const look = page => page.evaluate(() => {
  const sh = document.querySelector('#ov .sheet'), vw = document.documentElement.clientWidth;
  const past = [];
  if (sh) Array.prototype.forEach.call(sh.querySelectorAll('*'), el => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && (r.right > vw + 1 || r.left < -1) && past.length < 4) past.push((el.className || el.tagName) + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
  });
  return {
    step: typeof W !== 'undefined' && W && W.kind === 'cb' ? W.step + (W.step === 'entry' ? ' ' + ((W.q || 0) + 1) : '') + (W.id ? ' ' + W.id : '') : sh ? 'a sheet' : 'Home',
    page: document.documentElement.scrollWidth > vw + 1,
    sheet: !!sh && sh.scrollWidth > sh.clientWidth + 1,
    past,
    zero: sh ? (sh.innerText.match(/\b0 of\b[^\n]{0,30}/) || [''])[0] : '',
    junk: sh ? (sh.innerText.match(/undefined|NaN/) || [''])[0] : '',
  };
});

async function walk(browser, width, debt) {
  const who = (debt ? 'costly debt' : 'nothing owed') + ' at ' + width;
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 }, serviceWorkers: 'block' });
  await ctx.route(/cdn\.jsdelivr\.net/, r => r.fulfill({ contentType: 'application/javascript', body: stub }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + '/game/', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  let n = 0;
  const see = async name => {
    const L = await look(page);
    chk(`${who}, ${name}: no sideways scroll`, !L.page && !L.sheet && !L.past.length, L);
    chk(`${who}, ${name}: no count reads "0 of"`, !L.zero, L.zero);
    chk(`${who}, ${name}: no undefined and no NaN`, !L.junk, L.junk);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${width}-${debt ? 'debt' : 'plain'}-${String(++n).padStart(2, '0')}-${name.replace(/[^a-z0-9]+/gi, '-')}.png` });
    return L;
  };
  const tap = async sel => { const el = page.locator(sel).first(); await el.scrollIntoViewIfNeeded(); await el.click(); await page.waitForTimeout(450); };
  const go = async (v, k) => { await page.evaluate(([v, k]) => { ACT.cbgo({ dataset: k ? { v, k } : { v } }); }, [v, k]); await page.waitForTimeout(450); };
  /* a tap outside the sheet: the dark strip above it, or beside it on a wide screen */
  const outside = async () => { await page.mouse.click(Math.round(width / 2), 6); await page.waitForTimeout(450); };
  const state = () => page.evaluate(() => ({ kind: W && W.kind, step: W && W.step, q: W && W.q, flow: typeof SH !== 'undefined' && SH === cbSheet, picks: W && W.wp ? W.wp.slice() : null }));

  await tap('#door [data-door=start]');
  await see('What you want');
  /* item 10: the "i" opens as a sheet; a tap outside closes it, and the screen under it is there again */
  await tap('#ov [data-a=wnpick][data-v=' + (debt ? 'debt' : 'early') + ']');
  await tap('#ov [data-a=cbi][data-k=wants]');
  let S = await state();
  chk(`${who}: the "i" of What you want opens as a sheet of its own`, S.kind === 'cb' && !S.flow, S);
  await see('the i of What you want');
  await outside();
  S = await state();
  chk(`${who}: a tap outside the open "i" closes it, and What you want is there again with the pick`, S.flow && S.step === 'wants' && (S.picks || []).length === 1, S);
  await outside();
  S = await state();
  chk(`${who}: a tap outside a screen of the flow loses nothing`, S.flow && S.step === 'wants' && (S.picks || []).length === 1, S);
  await tap('#ov [data-a=wnnext]');
  const chips = debt ? { age: 1, spend: 2, inv: 1, save: 1 } : { age: 3, spend: 5, inv: 5, save: 4 };
  for (const q of ['age', 'spend', 'inv', 'save']) {
    await see('the question ' + q);
    if (q === 'spend') {
      /* a word of the glossary is a sheet too */
      await tap('#ov [data-a=cbi][data-k=answers]');
      await outside();
      S = await state();
      chk(`${who}: a tap outside the "i" of a question returns to the same question`, S.flow && S.step === 'entry' && S.q === 1, S);
    }
    await tap(`#ov [data-a=cbset][data-q=${q}][data-i="${chips[q]}"]`);
  }
  if (debt) await page.evaluate(() => { const c = C(); c.debts = [{ k: 'Credit card balance', amt: 18000, high: true, s: false, was: 18000 }]; c.debtKinds = ['Credit card balance']; c.high = 'yes'; save(); render(); drawSheet(); });
  await see('What it is');
  await tap('#ov summary[data-a=cbfold]');
  await see('What it is, the fold open');
  await tap('#ov [data-a=cbgo][data-v=next]');
  await see('the chart');
  for (const f of await page.locator('#ov summary[data-a=cbfold]').all()) await f.click();
  await page.waitForTimeout(300);
  await see('the chart, the folds open');
  await page.evaluate(() => ACT.cbzoom({ dataset: { v: String(C().age + 30) } }));
  await page.waitForTimeout(400);
  await see('the chart, single years');
  await page.evaluate(() => ACT.cblayer({ dataset: { v: 'health' } }));
  await page.waitForTimeout(400);
  await see('a layer, health');
  await go('chart');
  await tap('#ov [data-a=cbgo][data-v=stack]');
  const L0 = await see('the stack, nothing counted');
  chk(`${who}: the stack shows no counter and no meter before the first way is counted`, await page.evaluate(() => !document.querySelector('#ov [data-fid="cb:stackn"]') && !document.querySelector('#ov [data-fid="cb:backups"]') && !document.querySelector('#ov .cbstk .dkprog, #ov .cbstk progress')), L0);
  const ways = await page.evaluate(() => cbWays().map(w => w.id));
  for (const id of ways) {
    await go(id);
    await see('the way ' + id);
    for (const f of await page.locator('#ov summary[data-a=cbfold]').all()) await f.click();
    await page.waitForTimeout(250);
    await see('the way ' + id + ', the folds open');
    await go('stack');
  }
  /* count the first way of the list: the counter shows, and it does not read "0 of" */
  await tap('#ov [data-a=cbquick]');
  await see('the stack, one counted');
  chk(`${who}: after the first count the counter shows`, await page.evaluate(() => !!document.querySelector('#ov [data-fid="cb:stackn"]')));
  const move = await page.evaluate(() => (cbMoves(C()).shown[0] || {}).id || '');
  if (move) { await go('move', move); await see('a move'); await go('stack'); }
  await go('yesbut');
  await see('the Yes, but card');
  await go('stack');
  await tap('#ov [data-a=cbgo][data-v=reveal]');
  await see('the reveal');
  /* item 9: the four blocks, by priority */
  const B = await page.evaluate(() => [1, 2, 3, 4].map(i => { const el = document.querySelector('#ov [data-fid="cb:rev' + i + '"]'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), big: i === 1 ? parseFloat(getComputedStyle(el.querySelector('.dknum')).fontSize) : 0 }; }));
  const have = B.filter(Boolean);
  chk(`${who}: the reveal has the two numbers, the chart and the row Keep it as blocks`, !!B[0] && !!B[1] && !!B[3], B);
  if (B[0] && B[1] && B[3]) {
    if (width >= 900) {
      chk(`${who}: on a wide screen the two numbers are top left, the chart is beside them, and the first block is the widest`, B[0].x < B[1].x && Math.abs(B[0].y - B[1].y) < 3 && B[0].w > B[1].w, B);
      chk(`${who}: the next blocks are under the first two, in order`, have.slice(2).every(b => b.y > Math.min(B[0].y, B[1].y)) && (!B[2] || B[2].x < B[3].x || B[2].y < B[3].y), B);
    } else chk(`${who}: on a phone the blocks are one under the other, in the same order`, have.every((b, i) => i === 0 || (b.y > have[i - 1].y && b.x === have[0].x)), B);
    chk(`${who}: the first block has the biggest numbers of the flow`, B[0].big >= 26, B[0]);
  }
  for (const f of await page.locator('#ov summary').all()) await f.click();
  await page.waitForTimeout(300);
  await see('the reveal, everything open');
  await tap('#ov [data-a=cbgo][data-v=end]');
  await see('the result');
  await tap('#ov [data-a=cbfirst]');
  chk(`${who}: the walk ends on Home`, !(await page.locator('#ov .sheet').count()));
  chk(`${who}: no page error`, !errs.length, errs);
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  for (const w of WIDTHS) for (const debt of [false, true]) await walk(browser, w, debt);
  await browser.close();
  console.log(`flow_walk: ${checks} checks, ${bad.length} not ok.`);
  process.exit(bad.length ? 1 : 0);
})();
