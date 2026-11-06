// Findability (batch 14, QA category 6): the everyday words a coach types into Find each land on the right screen and
// box as the top result. Serve the app (python3 -m http.server 8767), then: node tools/e2e/findability.cjs
// Runs every term on the Demo client and on a new client made through New client and Fast Track (Alexis's numbers),
// typing it into Find and pressing Enter, then checks the screen (the hash) and the box (the outlined or focused
// control's data-focus). Exit code 1 when a term misses. Env: SLAM_URL (default http://localhost:8767); ECHARTS: a
// local echarts.min.js when the CDN is blocked; FIND_ONLY=Demo or FIND_ONLY=New runs one client; FIND_TERMS=rent,APR runs those terms.
const { TERMS } = require('./find-terms.cjs');
const { launch, newClientFastTrack, ALEXIS, settle } = require('./drive.cjs');

async function findOne(page, term) {
  await page.evaluate(() => { document.querySelectorAll('.pop').forEach(p => p.remove()); location.hash = '#/home/session'; });
  await settle(page, 350);
  const box = page.locator('[data-focus="find-add"]');
  await box.click();
  await box.fill(term);
  await settle(page, 150);
  const top = await page.locator('.find-drop li').first().innerText().catch(() => '');
  await box.press('Enter');
  await settle(page, 1100);
  if (process.env.FIND_DEBUG) console.log(term, await page.evaluate(() => [document.querySelectorAll('.glow').length, document.activeElement?.outerHTML?.slice(0, 80)]));
  return page.evaluate(() => {
    const keys = new Set();
    const add = el => { if (!el) return; if (el.dataset?.focus) keys.add(el.dataset.focus); el.querySelectorAll?.('[data-focus]').forEach(x => keys.add(x.dataset.focus)); const c = el.closest?.('[data-focus]'); if (c) keys.add(c.dataset.focus); };
    document.querySelectorAll('.glow').forEach(add);
    const a = document.activeElement;
    if (a && a !== document.body) { if (a.dataset?.focus) keys.add(a.dataset.focus); const c = a.closest('[data-focus]'); if (c) keys.add(c.dataset.focus); }
    return { hash: location.hash, keys: [...keys] };
  }).then(r => ({ ...r, top: top.replace(/\s+/g, ' ').trim() }));
}

async function runClient(page, client) {
  const misses = [];
  for (const t of TERMS.filter(x => !process.env.FIND_TERMS || process.env.FIND_TERMS.split(',').includes(x.term))) {
    const r = await findOne(page, t.term);
    const routeOk = t.routes.includes(r.hash);
    const boxOk = r.keys.some(k => t.box.test(k));
    if (!routeOk || !boxOk) misses.push(`${client}: "${t.term}" landed on ${r.hash} [${r.keys.slice(0, 4).join(', ') || 'no box'}] (top result: ${r.top}); wanted ${t.routes.join(' or ')} with ${t.box}`);
  }
  return misses;
}

(async () => {
  const only = process.env.FIND_ONLY || null;
  const { browser, page } = await launch();
  const misses = [];
  if (!only || only === 'Demo') {
    await page.locator('button', { hasText: /example numbers/ }).first().click({ timeout: 4000 }); await settle(page, 900);
    misses.push(...await runClient(page, 'Demo'));
  }
  if (!only || only === 'New') {
    await newClientFastTrack(page, ALEXIS);
    misses.push(...await runClient(page, 'Fast Track client'));
  }
  await browser.close();
  const n = (process.env.FIND_TERMS ? process.env.FIND_TERMS.split(',').length : TERMS.length) * (only ? 1 : 2);
  console.log(`Findability: ${n - misses.length} of ${n} terms landed on the right screen and box.`);
  for (const m of misses) console.log(`  MISS ${m}`);
  process.exit(misses.length ? 1 : 0);
})();
