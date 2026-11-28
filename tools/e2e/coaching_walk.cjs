// The public page /coaching/, walked in a real browser (Chromium through Playwright).
// Serve the repository (python3 -m http.server 8431), then: node tools/e2e/coaching_walk.cjs
// Env: SLAM_URL (default http://localhost:8431), COACH_OUT (a folder for the screenshots; default: none).
// At 390 x 640, 390 x 844, 1280 and 1440 wide: no console error, no sideways scroll, no clipped button, each button at
// least 44 high, one filled button, the placeholders marked while the offer is empty, the chart drawn, a tap on an
// example value changes the numbers, the "i" opens, Show the math opens. Then the same page with a made-up offer
// filled in (a stand-in for game/data/offer.js, never saved): no placeholder is left, the flat line is drawn, and
// the button is a link. Exit code 1 when a check fails.
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); } catch { try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); } }
const BASE = process.env.SLAM_URL || 'http://localhost:8431';
const OUT = process.env.COACH_OUT || '';
let bad = 0;
const chk = (name, ok, info) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + name + (info === undefined || ok ? '' : ' ' + JSON.stringify(info))); };
const FILLED = `const COACH_OFFER = { what: "A made-up line for the walk.", fee: 2400, plan: "A made-up plan line.", guarantee: "A made-up line.", bookUrl: "https://example.org/book", cohort: "A made-up note." };`;

async function open(browser, w, h, filled) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
  if (filled) await ctx.route(/game\/data\/offer\.js/, r => r.fulfill({ contentType: 'application/javascript', body: FILLED }));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(BASE + '/coaching/', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  return { ctx, page, errs };
}
const facts = page => page.evaluate(() => {
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const btns = [...document.querySelectorAll('button, a.btn, summary')].filter(vis);
  return {
    sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    small: btns.filter(b => b.getBoundingClientRect().height < 43.5).map(b => b.textContent.trim().slice(0, 30)),
    clipped: btns.filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent.trim().slice(0, 30)),
    outside: [...document.querySelectorAll('main *')].filter(vis).filter(e => e.getBoundingClientRect().right > innerWidth + 1).length,
    primary: document.querySelectorAll('.primary').length,
    ph: [...document.querySelectorAll('.ph')].filter(vis).length,
    paths: document.querySelectorAll('#chart svg path').length,
    draft: !document.getElementById('draft').hidden,
    text: document.body.innerText,
    naum: (document.getElementById('naum') || {}).textContent,
    bookTag: document.getElementById('book').tagName, bookOff: document.getElementById('book').disabled === true,
  };
});

(async () => {
  const browser = await chromium.launch();
  for (const [w, h] of [[390, 640], [390, 844], [1280, 800], [1440, 900]]) {
    const { ctx, page, errs } = await open(browser, w, h, false);
    const tag = w + 'x' + h + ': ';
    let f = await facts(page);
    chk(tag + 'no console error', errs.length === 0, errs);
    chk(tag + 'no sideways scroll, nothing outside the page', !f.sideways && f.outside === 0, f.outside);
    chk(tag + 'each button is at least 44 high', f.small.length === 0, f.small);
    chk(tag + 'no clipped button', f.clipped.length === 0, f.clipped);
    chk(tag + 'one filled button, and it is off with its reason while there is no link', f.primary === 1 && f.bookTag === 'BUTTON' && f.bookOff && /This button is off for now/.test(f.text));
    chk(tag + 'the empty offer shows marked placeholders and the draft note', f.ph >= 6 && f.draft && /Placeholder: the price/.test(f.text) && /Placeholder: the guarantee/.test(f.text));
    chk(tag + 'the chart has two lines', f.paths === 2);
    chk(tag + 'no undefined and no NaN', !/undefined|NaN/.test(f.text));
    const before = f.naum;
    await page.click('#pstart button[data-v="500000"]');
    await page.waitForTimeout(150);
    f = await facts(page);
    chk(tag + 'a tap on an example value changes the numbers', f.naum !== before && /\$/.test(f.naum), [before, f.naum]);
    chk(tag + 'the picked value is marked', await page.getAttribute('#pstart button[data-v="500000"]', 'aria-pressed') === 'true');
    await page.click('#ibtn');
    chk(tag + 'the i opens its two lines', await page.isVisible('#itip'));
    await page.click('#chartcard summary');
    await page.waitForTimeout(100);
    f = await facts(page);
    chk(tag + 'Show the math opens and states the assumptions', /Assumptions: 30 years, 7% growth a year, a 1% yearly fee/.test(f.text) && /example values/.test(f.text));
    chk(tag + 'still no sideways scroll with everything open', !f.sideways && f.outside === 0);
    if (OUT) { fs.mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: path.join(OUT, 'coaching-' + w + 'x' + h + '.png'), fullPage: true }); }
    await ctx.close();
  }
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const { ctx, page, errs } = await open(browser, w, h, true);
    const tag = w + 'x' + h + ' filled: ';
    const f = await facts(page);
    chk(tag + 'no console error', errs.length === 0, errs);
    chk(tag + 'no placeholder is left, and no draft note', f.ph === 0 && !f.draft);
    chk(tag + 'the price shows, and the flat line is on the chart', /\$2,400/.test(f.text) && /One flat fee of \$2,400/.test(f.text) && f.paths === 2);
    chk(tag + 'the one filled button is a link to the booking page', f.primary === 1 && f.bookTag === 'A' && await page.getAttribute('#book', 'href') === 'https://example.org/book');
    chk(tag + 'no sideways scroll, no clipped button', !f.sideways && f.outside === 0 && f.clipped.length === 0 && f.small.length === 0, [f.clipped, f.small]);
    if (OUT) await page.screenshot({ path: path.join(OUT, 'coaching-filled-' + w + '.png'), fullPage: true });
    await ctx.close();
  }
  await browser.close();
  console.log(bad ? bad + ' checks did not pass.' : 'The coaching page: all checks pass.');
  process.exit(bad ? 1 : 0);
})();
