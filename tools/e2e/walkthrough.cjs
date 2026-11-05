// Overnight G: the browser walkthrough. Serve the app (python3 -m http.server 8765), then: node tools/e2e/walkthrough.cjs
// Loads the Demo client, runs a session (Start, Joy, the agenda, End session through the gate with Move on anyway),
// then opens every screen at 1440, 1280 and 390 wide, light and dark, and fails on any console error. Playwright is
// pre-installed on the build machine; it is not a dependency of SLAM.
const { chromium } = require('playwright');
const BASE = process.env.SLAM_URL || 'http://localhost:8765';
const ROUTES = ['#/home/session', '#/home/profile', '#/net-worth/assets', '#/net-worth/debt', '#/net-worth/credit-cards', '#/net-worth/protection', '#/cash-flow/income', '#/cash-flow/taxes', '#/cash-flow/budget', '#/cash-flow/calendar', '#/cash-flow/close',
  '#/plan/goals', '#/plan/foo', '#/plan/scorecard', '#/plan/timeline', '#/plan/debt-payoff', '#/plan/next-12-months', '#/plan/scenarios', '#/report/overview', '#/report/one-pager', '#/report/history', '#/tools/lists', '#/tools/session'];
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|net::ERR/.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  const step = async (name, fn) => { try { await fn(); } catch (e) { problems.push(`${name}: ${e.message.split('\n')[0]}`); } };
  await page.goto(`${BASE}/#/home/session`); await page.waitForTimeout(700);
  await step('load the Demo client', async () => { const b = page.locator('button', { hasText: /example numbers|Demo/i }).first(); if (await b.count()) { await b.click({ timeout: 3000 }); await page.waitForTimeout(700); } });
  // A session: start, answer Joy, add a suggestion, end through the gate.
  await step('Start session', () => page.locator('button', { hasText: /^Start session$/ }).first().click({ timeout: 3000 }));
  await page.waitForTimeout(500);
  await step('Joy asked', async () => { if (!(await page.locator('.joy-ask').count())) throw new Error('no Joy ask'); });
  await step('answer Confidence and Joy', async () => { for (const label of ['Confidence', 'Joy']) { const box = page.locator(`.joy-ask input[aria-label^="${label}"]`).first(); if (!(await box.count())) continue; await box.fill('7', { timeout: 3000 }); await box.press('Tab').catch(() => {}); await page.waitForTimeout(500); } if (await page.locator('.joy-ask').count()) throw new Error('the ask stayed after answering both'); });
  await step('agenda suggestion', async () => { const more = page.locator('button', { hasText: /Suggested for today/ }).first(); if (await more.count()) { await more.click({ timeout: 2000 }); await page.waitForTimeout(300); const plus = page.locator('.suggest-row button', { hasText: /^\+$/ }).first(); if (await plus.count()) await plus.click({ timeout: 2000 }); } });
  await step('ladder on Home', async () => { if (!(await page.locator('.ladder-card').count())) throw new Error('no ladder card'); });
  await step('End session through the gate', async () => { await page.locator('button', { hasText: /^End session$/ }).first().click({ timeout: 3000 }); await page.waitForTimeout(600); const go = page.locator('button', { hasText: /Move on anyway|^End session$|Move to the next session/ }).last(); await go.click({ timeout: 3000 }); await page.waitForTimeout(900); });
  await step('session saved', async () => { const t = await page.locator('body').innerText(); if (!/Session 1 saved/.test(t)) throw new Error('no saved banner'); });
  await step('Joy card after the snapshot', async () => { if (!(await page.locator('.joy-card').count())) throw new Error('no Joy card'); });
  await step('the Rule of 5 reads age / 5 on the Assets tab', async () => { await page.evaluate(() => { location.hash = '#/net-worth/assets'; }); await page.waitForTimeout(400); const more = page.locator('button', { hasText: /Cash layers/ }).first(); if (await more.count()) { await more.click({ timeout: 2000 }); await page.waitForTimeout(400); } const t = await page.locator('body').innerText(); if (!/5\.8 months|Add your age to set big e/.test(t)) throw new Error('no age / 5 months on Assets'); });
  await step('About you: the per-bill share toggle and Split N ways', async () => { await page.evaluate(() => { location.hash = '#/home/profile'; }); await page.waitForTimeout(400); const t = await page.locator('body').innerText(); if (!/Split \d+ ways?/.test(t)) throw new Error('no Split N ways'); });
  // Every screen at three widths, light and dark.
  for (const width of [1440, 1280, 390]) {
    console.log(`screens at ${width}...`);
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
    for (const theme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: theme });
      for (const r of ROUTES) {
        const before = errs.length;
        await page.evaluate(hash => { location.hash = hash; }, r); await page.waitForTimeout(220); // a hash route: no reload
        const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
        if (wide) problems.push(`${r} at ${width} ${theme}: the page scrolls sideways`);
        if (errs.length > before) problems.push(`${r} at ${width} ${theme}: ${errs.slice(before).join(' | ')}`);
      }
    }
  }
  await browser.close();
  console.log(problems.length ? `PROBLEMS (${problems.length}):\n- ${problems.join('\n- ')}` : 'Walkthrough: every screen at 1440, 1280 and 390, light and dark, no console errors; the session ran through the gate.');
  process.exit(problems.length ? 1 : 0);
})();
