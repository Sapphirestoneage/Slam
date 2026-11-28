// The walk of the guided tour of SLAM the Game (run CC-1, item 17), in a real browser.
// Serve the repository (python3 -m http.server 8537), then: node tools/e2e/tour_walk.cjs
// Env: SLAM_URL (default http://localhost:8537), WALK_OUT (a folder for the screenshots; default: none).
// A new player (the four questions by taps of the game's own actions), then Home. At 390 and 1280 wide the walk
// starts the tour from the row of Home, and at each stop it checks: ONE element pulses and it is the place of the
// stop, the card does not cover that place, the card is inside the window, its buttons are 44 pixels high or more,
// no sideways scroll, no error of the page. Then: Back, Skip, the other pulse of Home is back, and the menu row
// starts the tour again. The Supabase script is not loaded (the game then runs on the device only).
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); } catch { ({ chromium } = require('playwright')); }
const BASE = process.env.SLAM_URL || 'http://localhost:8537';
const OUT = process.env.WALK_OUT || '';
let bad = 0;
const chk = (name, ok, info) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + name + (info === undefined || ok ? '' : ' ' + JSON.stringify(info))); };
// What pulses now, and where the card is.
const look = () => {
  const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const pulsing = [...document.querySelectorAll('*')].filter(e => vis(e) && getComputedStyle(e).animationName.split(',').some(n => n.trim() === 'pulse'));
  const card = document.querySelector('#tourcard .tourin');
  const at = document.querySelector('.tourpulse');
  const r = el => { const b = el.getBoundingClientRect(); return { t: b.top, b: b.bottom, l: b.left, r: b.right }; };
  const C = card ? r(card) : null, A = at ? r(at) : null;
  return {
    n: pulsing.length,
    same: pulsing.length === 1 && pulsing[0] === at,
    stop: card ? card.dataset.stop : null,
    count: card ? card.querySelector('[data-fid="tour:count"]').textContent : '',
    inWin: !!C && C.t >= 0 && C.b <= innerHeight && C.l >= 0 && C.r <= innerWidth,
    clear: !!C && !!A && (C.b <= A.t || C.t >= A.b || C.r <= A.l || C.l >= A.r),
    atIn: !!A && A.b > 0 && A.t < innerHeight,
    tall: card ? [...card.querySelectorAll('button')].every(b => b.getBoundingClientRect().height >= 44) : false,
    side: document.documentElement.scrollWidth > innerWidth + 1,
    junk: card ? /undefined|NaN|null|\[object/.test(card.textContent) : false,
  };
};
(async () => {
  const browser = await chromium.launch();
  for (const [w, h] of [[390, 844], [390, 640], [1280, 800], [1440, 900]]) {
    const tag = `${w}x${h}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await ctx.route(/supabase/, r => r.abort());
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(BASE + '/game/', { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      const X = (a, v, k, x) => ACT[a]({ dataset: Object.assign({ a, v, k }, x || {}) });
      if (typeof doorStart === 'function' && DOOR.el) doorStart(); else X('start');
      X('wnskip'); X('cbset', '', '', { q: 'age', i: 1 }); X('cbset', '', '', { q: 'spend', i: 2 }); X('cbset', '', '', { q: 'inv', i: 3 }); X('cbset', '', '', { q: 'save', i: 3 });
      X('close'); C().led = true; delete G.tourSeen; X('gohome');
    });
    await page.waitForTimeout(900);
    const before = await page.evaluate(look);
    chk(`${tag}: before the tour Home has one pulse`, before.n === 1, before.n);
    // the row of Home is under the fold "below" of Home: the walk taps it where it is
    chk(`${tag}: Home has the row that offers the tour`, (await page.locator('#app [data-a=tour]').count()) === 1);
    await page.evaluate(() => document.querySelector('#app [data-a=tour]').click());
    await page.waitForTimeout(700);
    const total = await page.evaluate(() => tourStops().length);
    chk(`${tag}: the tour has under ten stops on this screen`, total >= 5 && total < 10, total);
    const seen = [];
    for (let i = 0; i < total; i++) {
      const L = await page.evaluate(look);
      seen.push(L.stop);
      chk(`${tag}: stop ${i + 1} (${L.stop}): one pulse, on the place of the stop`, L.n === 1 && L.same, L);
      chk(`${tag}: stop ${i + 1}: the card is in the window, off the place, with tall buttons, and the place is in view`, L.inWin && L.clear && L.atIn && L.tall && !L.side && !L.junk, L);
      chk(`${tag}: stop ${i + 1}: the count is true`, L.count === `Stop ${i + 1} of ${total}`, L.count);
      if (OUT) { fs.mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: path.join(OUT, `${tag}-tour-${String(i + 1).padStart(2, '0')}-${L.stop}.png`) }); }
      if (i === 1) {
        await page.locator('#tourcard [data-a=tourback]').click();
        await page.waitForTimeout(650);
        chk(`${tag}: Back goes to stop 1`, (await page.evaluate(look)).count === `Stop 1 of ${total}`);
        await page.locator('#tourcard [data-a=tournext]').click();
        await page.waitForTimeout(650);
      }
      if (i < total - 1) { await page.locator('#tourcard [data-a=tournext]').click(); await page.waitForTimeout(650); }
    }
    chk(`${tag}: no stop shows twice`, new Set(seen).size === seen.length, seen);
    await page.locator('#tourcard [data-a=tourdone]').click();
    await page.waitForTimeout(700);
    const after = await page.evaluate(look);
    chk(`${tag}: Done: the card is gone and the pulse of Home is back, alone`, !after.stop && after.n === 1 && !(await page.locator('body.touring').count()), after);
    chk(`${tag}: Home does not offer the tour again`, !(await page.locator('#app [data-a=tour]').count()));
    // again from the menu, then a sheet over it, then Skip
    await page.locator('.topbar [data-a=menu]').click();
    await page.waitForTimeout(700);
    const row = page.locator('#ov [data-a=menugo][data-v=tour]');
    chk(`${tag}: the menu has the row Take the tour`, (await row.count()) === 1);
    await row.evaluate(el => { const d = el.closest('details'); if (d) d.open = true; });
    await row.scrollIntoViewIfNeeded();
    await row.click();
    await page.waitForTimeout(700);
    const again = await page.evaluate(look);
    chk(`${tag}: the menu row starts the tour again at stop 1`, again.count === `Stop 1 of ${total}` && again.n === 1 && again.same, again);
    await page.locator('#tourcard [data-a=tourdone]').click();
    await page.waitForTimeout(600);
    chk(`${tag}: Skip the tour ends it`, !(await page.locator('#tourcard').count()));
    chk(`${tag}: no error of the page`, errs.length === 0, errs);
    await ctx.close();
  }
  await browser.close();
  console.log(bad ? `${bad} FAILED` : 'all ok');
  process.exit(bad ? 1 : 0);
})();
