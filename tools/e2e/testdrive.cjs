// Test Drive in a browser. Serve the app (python3 -m http.server 8830), then: node tools/e2e/testdrive.cjs
// At 1280 and 390 wide: the bar is absent without ?dev=1 and present with it; every made-up person is walked step by
// step, and on every step the card is there, exactly one thing pulses, it sits above the dock (nothing covered), the
// page has no sideways scroll and the console is clean. Then: a flag lands on the issue list, a snapshot saves and
// opens, Jump to a level lands on that level, and Back to my own plan leaves no made-up file behind.
// Env: SLAM_URL (default http://localhost:8830), TD_OUT (a folder for screenshots, never the repo).
const fs = require('fs'); const os = require('os'); const path = require('path');
let chromium;
try { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); } catch { ({ chromium } = require('playwright')); }
const BASE = process.env.SLAM_URL || 'http://localhost:8830', OUT = process.env.TD_OUT || path.join(os.tmpdir(), 'slam-testdrive');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch(), problems = [];
  const bad = (w, m) => problems.push(`${w}px: ${m}`);
  for (const width of [1280, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 780 : 900 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    const page = await ctx.newPage(), errs = [];
    page.on('console', m => { if (m.type() === 'error' && !/ERR_|net::|Failed to load resource/.test(m.text())) errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    await page.goto(`${BASE}/start.html`); await page.waitForSelector('#main *');
    if (await page.locator('#td').count()) bad(width, 'the bar shows without ?dev=1');
    await page.goto(`${BASE}/start.html?dev=1`); await page.waitForSelector('#td .td-toggle');
    const people = await page.evaluate(async () => (await import('./js/testdrive.js')).PERSONAS.map(p => ({ id: p.id, name: p.name, short: p.short, steps: p.steps.length })));
    for (const p of people) {
      await page.locator('#td .td-toggle').click();
      await page.locator('#td .st-chip', { hasText: new RegExp(`^${p.name}$`) }).click();
      await page.locator('#td button', { hasText: 'Walk me through' }).click();
      for (let i = 0; i < p.steps; i++) {
        await page.waitForTimeout(460);
        const s = await page.evaluate(() => {
          const dock = document.getElementById('td'), pulses = [...document.querySelectorAll('#main .st-pulse')], t = pulses[0]?.getBoundingClientRect();
          return { title: dock.querySelector('.td-top strong')?.textContent ?? '', pulses: pulses.length, target: !!document.querySelector('#main .td-target.st-pulse'), top: t?.top ?? null, dockTop: dock.getBoundingClientRect().top,
            wide: document.documentElement.scrollWidth > innerWidth + 1, dockWide: dock.scrollWidth > dock.clientWidth + 1, secs: [...dock.querySelectorAll('.td-h')].map(x => x.textContent), off: [...dock.querySelectorAll('.td-move.off')].map(x => x.textContent) };
        });
        const at = `${p.id} step ${i + 1}`;
        if (!s.title.includes(`Step ${i + 1} of ${p.steps}`)) bad(width, `${at}: the card says "${s.title}"`);
        if (s.pulses !== 1 || !s.target) bad(width, `${at}: ${s.pulses} things pulse (want exactly one, the thing that changed)`);
        else if (s.top == null || s.top < 0 || s.top > s.dockTop - 24) bad(width, `${at}: the pulsing thing is not in view above the dock (top ${Math.round(s.top)}, dock ${Math.round(s.dockTop)})`);
        if (s.wide || s.dockWide) bad(width, `${at}: sideways scroll`);
        for (const need of ['What happened', 'What changed', 'Why']) if (!s.secs.includes(need)) bad(width, `${at}: no "${need}"`);
        for (const o of s.off) bad(width, `${at}: a check differs: ${o}`);
        if (p.id === 'deep-debt' && i === 7) await page.screenshot({ path: path.join(OUT, `walk-${width}.png`) });
        if (p.id === 'deep-debt' && i === 5) await page.screenshot({ path: path.join(OUT, `check-${width}.png`) });
        if (p.id === 'deep-debt' && i === 3 && width === 1280) { // flag one step
          await page.locator('#td button', { hasText: 'Flag this' }).click();
          await page.locator('#td .st-chip', { hasText: 'Confusing wording' }).click();
          await page.locator('#td .st-chip', { hasText: 'Breaks the task' }).click();
          await page.screenshot({ path: path.join(OUT, `flag-${width}.png`) });
          await page.locator('#td button', { hasText: 'Save flag' }).click();
        }
        if (p.id === 'homeowner' && i === 4) { await page.locator('#td button', { hasText: 'Back' }).first().click(); await page.waitForTimeout(140); const t = await page.locator('#td .td-top strong').textContent(); if (!t.includes('Step 4 of')) bad(width, `Back did not go to step 4: "${t}"`); await page.locator('#td-next').click(); await page.waitForTimeout(140); }
        await page.locator('#td-next').click();
      }
      await page.waitForTimeout(140);
      const done = await page.locator('#td .td-top strong').textContent();
      if (!done.includes(`all ${p.steps} steps done`)) bad(width, `${p.id}: no finish card ("${done}")`);
      if (p.id === 'deep-debt') await page.screenshot({ path: path.join(OUT, `done-${width}.png`) });
      await page.locator('#td button', { hasText: 'Look around this plan' }).click();
    }
    // Instant load, jump, snapshot, issues, and home again.
    await page.locator('#td .td-toggle').click();
    await page.screenshot({ path: path.join(OUT, `panel-${width}.png`) });
    await page.locator('#td .st-chip', { hasText: /^Sam$/ }).click();
    await page.locator('#td button[aria-label="Jump to level 3"]').click(); await page.waitForTimeout(200);
    if (!(await page.locator('#level-ahead').count())) bad(width, 'Jump to level 3 between jobs did not land on The job ahead');
    await page.locator('#td .td-toggle').click();
    await page.locator('#td .st-chip', { hasText: /^Snapshots/ }).click();
    await page.locator('#td button', { hasText: 'Save a snapshot' }).click();
    if (!(await page.locator('#td .st-chip', { hasText: /^Snapshots \(1\)/ }).count())) bad(width, 'the snapshot was not saved');
    await page.locator('#td button', { hasText: 'Open a copy' }).click(); await page.waitForTimeout(200);
    await page.locator('#td .td-toggle').click();
    await page.locator('#td .st-chip', { hasText: /^Issues/ }).click();
    if (width === 1280) { if (!(await page.locator('#td .td-issues li').count())) bad(width, 'the flag is not on the issue list'); await page.screenshot({ path: path.join(OUT, `issues-${width}.png`) }); }
    await page.locator('#td button', { hasText: 'Back to my own plan' }).click(); await page.waitForTimeout(200);
    const left = await page.evaluate(() => JSON.parse(localStorage.getItem('slam.clients') || '[]').map(c => c.name));
    if (left.some(n => /^Test drive|^Snapshot/.test(n))) bad(width, `made-up files left behind: ${left.join(', ')}`);
    if (left.length !== 1) bad(width, `expected one plan left, found ${left.length}: ${left.join(', ')}`);
    for (const e of errs) bad(width, `console: ${e}`);
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : 'Test Drive: every person walked at 1280 and 390, nothing covered, nothing left behind.');
  console.log(`Screenshots: ${OUT}`);
  process.exit(problems.length ? 1 : 0);
})();
