// The leak test (batch 28, who sees this): opens the discreet couple (fixtures/personas/discreet-couple.json: Remy's fan
// page income and its payout account kept between Remy and the coach, Dana's private store card, a coach-only note
// and a coach-only Budget line) through Import, then looks at every place data leaves the coach's view and searches
// what it finds for the private names, notes and amounts:
//   client   Client view on, the household view (Ours): no private or coach-only row by name or amount
//   remy     Client view, Remy's view: Remy's own private rows show; Dana's and the coach's do not
//   dana     Client view, Dana's view: Dana's private card shows; Remy's private rows and the coach's do not
//   partner  the coach's screen on Dana's view (Whose numbers: Dana): none of Remy's private rows
//   share    the Life Transitions share view, the one-pager and Send summary: nothing private, nothing coach-only
//   export   the backup and the spreadsheet made Without private rows: nothing private by name, platform or note
// On every screen it searches the page's text and its tips, labels and box values, and the app's own numbers (every
// Show the math text) for the names; and checks every total equals the coach's for the same view.
// Serve the app, then: SLAM_URL=http://localhost:8928 node tools/e2e/privacy.cjs   (PRIVACY_WIDTHS=1280,390)
// Writes privacy.json and screenshots to PRIVACY_OUT (default <tmp>/slam-privacy). Exit 1 on any leak or total that differs.
const fs = require('fs');
const os = require('os');
const path = require('path');
let chromium;
try { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); } catch { ({ chromium } = require('playwright')); }
const { ROUTES } = require('./layout.cjs');

const BASE = process.env.SLAM_URL || 'http://localhost:8816';
const OUT = process.env.PRIVACY_OUT || path.join(os.tmpdir(), 'slam-privacy');
const ECHARTS = process.env.ECHARTS || '';
const EXCELJS = process.env.EXCELJS || path.join(__dirname, '..', '..', 'node_modules', 'exceljs', 'dist', 'exceljs.min.js');
const WIDTHS = (process.env.PRIVACY_WIDTHS || '1280,390').split(',').map(Number);
const FILE = path.join(__dirname, '..', '..', 'fixtures', 'personas', 'discreet-couple.json');

// What each audience must never see. Names are searched everywhere (also in the app's math texts); amounts in what is shown.
const REMY = { names: ['Velvet Room', 'OnlyFans', 'Wise payout', '7781'], amounts: ['2,975', '3,871'] };
const DANA = { names: ['Lantern'], amounts: ['1,373'] };
const COACH = { names: ['Discreet PO box', 'has not told family', 'Payouts every Friday'], amounts: [/\$37(?![\d,.])/] };
const join = (...xs) => ({ names: xs.flatMap(x => x.names), amounts: xs.flatMap(x => x.amounts) });
// never: names searched everywhere, amounts searched everywhere. rows: amounts searched in the lines of their own a
// row has (list rows, calendar chips, month-end lines, Overview rows). In the household view a private row may still
// show as a neutral line (Other savings $3,871: the combined line) and its amount sits in subtotals; a coach-only row has
// no line of its own in Client view. In one partner's view the other partner's private rows are left out entirely.
const names = (...xs) => ({ names: xs.flatMap(x => x.names), amounts: [] });
const VIEWS = [
  { id: 'client', clientView: true, person: 'all', never: names(REMY, DANA, COACH), rows: COACH.amounts },
  { id: 'remy', clientView: true, person: 'Me', never: join(DANA, names(COACH)), rows: COACH.amounts, shows: 'Velvet Room' },
  { id: 'dana', clientView: true, person: 'Partner', never: join(REMY, COACH), rows: [], shows: 'Lantern' },
  { id: 'partner', clientView: false, person: 'Partner', never: join(REMY), rows: [] },
];
function rowText() { // runs in the page: the lines a single row has (a Budget category row is a subtotal: it counts every line in it)
  const subtotal = e => window.slam.store.get(e.dataset?.id)?.kind === 'spending';
  return [...document.querySelectorAll('tr.row, .chip, .home-row, .review-table tr')].filter(e => !subtotal(e)).map(e => e.innerText).join('\n');
}

function pageText() { // runs in the page: what is shown, and what a tip, a label or a box holds
  const parts = [document.body.innerText];
  for (const el of document.querySelectorAll('*')) {
    for (const a of ['title', 'aria-label', 'data-tip', 'placeholder', 'alt']) { const v = el.getAttribute(a); if (v) parts.push(v); }
    if (typeof el.value === 'string' && el.value) parts.push(el.value);
  }
  return parts.join('\n');
}
const found = (text, list) => list.filter(x => (x instanceof RegExp ? x.test(text) : text.includes(x))).map(String);
const KEYS = ['netWorth', 'liquidNetWorth', 'surplus', 'savingsRate', 'debtTotal', 'debtPayments', 'monthsToFi', 'debtFreeMonths', 'fiNumber'];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const problems = [], results = [];
  for (const W of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: W, height: 1000 }, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
    if (ECHARTS && fs.existsSync(ECHARTS)) await ctx.route(/cdnjs\.cloudflare\.com.*echarts/, r => r.fulfill({ path: ECHARTS, contentType: 'application/javascript' }));
    if (fs.existsSync(EXCELJS)) await ctx.route(/cdn\.jsdelivr\.net.*exceljs/, r => r.fulfill({ path: EXCELJS, contentType: 'application/javascript' }));
    await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e).slice(0, 300)));
    page.on('console', m => { if (m.type() === 'error' && !/net::ERR|Failed to load resource|ERR_TUNNEL/.test(m.text())) errors.push(m.text().slice(0, 300)); });
    const go = async h => { await page.evaluate(x => window.slam.go(x), h); await page.waitForTimeout(450); };
    const set = (clientView, person) => page.evaluate(([cv, p]) => { window.slam.store.setDoc('settings', { person: p }); window.slam.setPref('clientView', cv); }, [clientView, person]);
    const numbers = () => page.evaluate(k => { const m = window.slam.ctx.metrics(); const n = { netWorth: m.netWorth.value, liquidNetWorth: m.liquidNetWorth.value, surplus: m.surplus.value, savingsRate: m.savingsRate.value, debtTotal: m.debtTotal?.value ?? null, monthsToFi: m.monthsToFi.value, fiNumber: m.fiNumber?.value ?? null, takeHome: m.inputs.takeHome }; return n; }, KEYS);
    const check = async (label, never, { math = true, rows = [] } = {}) => {
      const text = await page.evaluate(pageText);
      const mathText = math ? await page.evaluate(() => JSON.stringify(window.slam.ctx.metrics())) : '';
      const own = rows.length ? await page.evaluate(rowText) : '';
      const hits = [...found(text, never.names), ...found(text, never.amounts), ...found(mathText, never.names).map(x => `${x} (in the math)`), ...found(own, rows).map(x => `${x} (on a line of its own)`)];
      if (hits.length) problems.push(`${W} ${label}: ${hits.join(', ')}`);
      return hits;
    };

    await page.goto(`${BASE}/#/tools/data`, { waitUntil: 'load' }); await page.waitForTimeout(1800);
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('button', { hasText: /^Import$/ }).first().click()]);
    await chooser.setFiles(FILE); await page.waitForTimeout(1500);
    // The coach's own numbers for each person view: every other view must match them.
    const coach = {};
    for (const p of ['all', 'Me', 'Partner']) { await set(false, p); coach[p] = await numbers(); }
    await set(false, 'all'); await go('#/cash-flow/income');
    if (!(await page.evaluate(pageText)).includes('Velvet Room')) problems.push(`${W} coach: the coach does not see the private row`);
    await page.screenshot({ path: path.join(OUT, `coach-income-${W}.png`), fullPage: true });

    for (const v of VIEWS) {
      await set(v.clientView, v.person);
      const got = await numbers();
      for (const k of Object.keys(got)) if (JSON.stringify(got[k]) !== JSON.stringify(coach[v.person][k])) problems.push(`${W} ${v.id}: ${k} is ${got[k]}, the coach's is ${coach[v.person][k]}`);
      let saw = false;
      for (const r of ROUTES) {
        await go(r);
        const openAll = page.locator('a, button', { hasText: /^Open all$/ }).first();
        if (await openAll.count()) { await openAll.click().catch(() => {}); await page.waitForTimeout(250); }
        const hits = await check(`${v.id} ${r}`, v.never, { rows: v.rows });
        if (v.shows && (await page.evaluate(pageText)).includes(v.shows)) saw = true;
        if (W === 1280 && /income|budget|debt|assets/.test(r)) { // each row's Details, one at a time
          const n = await page.locator('tr.row button.caret').count();
          for (let i = 0; i < n; i++) { await page.locator('tr.row button.caret').nth(i).click().catch(() => {}); await page.waitForTimeout(150); await check(`${v.id} ${r} details ${i + 1}`, v.never, { math: false, rows: v.rows }); }
        }
        if (['#/cash-flow/income', '#/net-worth/debt', '#/net-worth/assets', '#/cash-flow/budget'].includes(r)) await page.screenshot({ path: path.join(OUT, `${v.id}-${r.split('/').pop()}-${W}.png`), fullPage: true });
        results.push({ W, view: v.id, route: r, hits });
      }
      if (v.shows && !saw) problems.push(`${W} ${v.id}: ${v.shows} should show in this view and did not`);
    }

    // Anything shared: the one-pager (coach and client view), Send summary, the Life Transitions share view.
    const never = join(REMY, DANA, COACH);
    for (const cv of [false, true]) {
      await set(cv, 'all'); await go('#/report/one-pager');
      await check(`one-pager${cv ? ' (client view)' : ''}`, never, { math: false });
      const shareNums = await page.evaluate(async () => { const S = await import('/js/ui/staples.js'); const m = S.shareCtx(window.slam.ctx).metrics(); return { netWorth: m.netWorth.value, surplus: m.surplus.value, monthsToFi: m.monthsToFi.value }; });
      for (const k of Object.keys(shareNums)) if (shareNums[k] !== coach.all[k]) problems.push(`${W} share: ${k} is ${shareNums[k]}, the coach's is ${coach.all[k]}`);
      const shareMath = await page.evaluate(async () => { const S = await import('/js/ui/staples.js'); return JSON.stringify(S.shareCtx(window.slam.ctx).metrics()); });
      const mh = found(shareMath, never.names); if (mh.length) problems.push(`${W} share math: ${mh.join(', ')}`);
      await page.screenshot({ path: path.join(OUT, `one-pager${cv ? '-client' : ''}-${W}.png`), fullPage: true });
    }
    await set(false, 'all');
    const summary = await page.evaluate(async () => { const R = await import('/js/ui/report-ui.js'); return R.summaryText(window.slam.ctx); });
    const sh = [...found(summary, never.names), ...found(summary, never.amounts)]; if (sh.length) problems.push(`${W} Send summary: ${sh.join(', ')}`);
    await go('#/plan/transitions');
    const pick = page.locator('.tr-start button').first();
    if (await pick.count()) { await pick.click(); await page.waitForTimeout(500); }
    await page.locator('button', { hasText: 'Share view' }).first().click(); await page.waitForTimeout(500);
    await check('transitions share view', never, { math: false });
    await page.screenshot({ path: path.join(OUT, `share-view-${W}.png`), fullPage: true });

    // The exports, made Without private rows.
    if (W === WIDTHS[0]) {
      await go('#/tools/data');
      await page.locator('.export-choice button', { hasText: 'Without private rows' }).first().click(); await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(OUT, `data-${W}.png`), fullPage: true });
      const save = async label => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.locator('button', { hasText: label }).first().click()]); const to = path.join(OUT, d.suggestedFilename()); await d.saveAs(to); return to; };
      const json = await save(/^Export( a backup)?$/);
      const jt = fs.readFileSync(json, 'utf8');
      const jh = [...found(jt, never.names), ...found(jt, COACH.names)]; if (jh.length) problems.push(`backup without private rows: ${jh.join(', ')}`);
      if (!/"sharedCopy": true/.test(jt)) problems.push('backup without private rows: not marked as a shared copy');
      if (fs.existsSync(EXCELJS)) {
        const xlsx = await save('Open in a spreadsheet');
        const { execSync } = require('child_process');
        const dir = path.join(OUT, 'xlsx'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
        execSync(`cd ${JSON.stringify(dir)} && python3 -c "import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall('.')" ${JSON.stringify(xlsx)}`);
        const all = execSync(`cat $(find ${JSON.stringify(dir)} -name '*.xml')`, { maxBuffer: 1 << 28 }).toString();
        // OnlyFans is on the Assumptions tab and in the Platform dropdown as part of the reference Platforms list, so the
        // platform name is not looked for here (test/privacy.test.js checks the household's own tabs for it).
        const xh = found(all, never.names.filter(x => x !== 'OnlyFans')); if (xh.length) problems.push(`spreadsheet without private rows: ${xh.join(', ')}`);
        if (!all.includes('Self-employment')) problems.push('spreadsheet without private rows: the neutral name is missing');
      } else console.log('(ExcelJS not found: the spreadsheet export was not checked)');
      // The full export still has everything (the choice is the only thing that changes it).
      await page.locator('.export-choice button', { hasText: 'Everything' }).first().click(); await page.waitForTimeout(200);
      const full = fs.readFileSync(await save(/^Export( a backup)?$/), 'utf8');
      if (!full.includes('Velvet Room')) problems.push('the full backup lost the private row');
    }
    if (errors.length) problems.push(...errors.map(e => `${W} error: ${e}`));
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'privacy.json'), JSON.stringify({ when: new Date().toISOString(), problems, results }, null, 1));
  console.log(problems.length ? `Leaks or differences:\n${problems.join('\n')}` : `No leaks: ${results.length} screen views at ${WIDTHS.join(' and ')}, the one-pager, Send summary, the share view and both exports; every total equals the coach's.`);
  process.exit(problems.length ? 1 : 0);
})();
