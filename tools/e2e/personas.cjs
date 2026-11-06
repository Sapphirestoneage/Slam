// The persona run (batch 16): opens each made-up household in fixtures/personas through the app's own Import
// (Coach tools › Data › Import), visits every screen at 1280 wide, and records for each persona and screen:
//   errors   console errors and page errors
//   missing  how many What's missing items the screen lists (js/completion.js missingFor)
//   layout   the layout checker's own checks (tools/e2e/layout.cjs scan: level, clipped, overflow, covered, and since
//            batch 19 column, sticky (at the top of the screen), unlabeled and cramped)
//   story    whether the screen tells a sensible story: no "no debt" words with debts on file, no lock on a date
//            whose inputs are all there, no NaN or undefined, and one answer per number across every screen
//            (net worth, surplus, savings rate, the debt-free month, the FI month), checked against the app's own math
// Serve the app (python3 -m http.server 8816), then: node tools/e2e/personas.cjs [id ...]
// Writes personas.json, report.md and one Home screenshot per persona to PERSONAS_OUT (default: <tmp>/slam-personas,
// never the repo). Exit code 1 when a persona fails to load or a screen throws. Env: SLAM_URL (default
// http://localhost:8816), ECHARTS (the local echarts.min.js, for when the CDN is blocked), PERSONAS_WIDTH (default 1280).
const fs = require('fs');
const os = require('os');
const path = require('path');
let chromium;
try { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); } catch { ({ chromium } = require('playwright')); }
const { scan, ROUTES } = require('./layout.cjs');

const BASE = process.env.SLAM_URL || 'http://localhost:8816';
const OUT = process.env.PERSONAS_OUT || path.join(os.tmpdir(), 'slam-personas');
const ECHARTS = process.env.ECHARTS || '/tmp/claude-0/-home-claude/5ae6d13c-3802-502b-b29a-86ed1541b542/scratchpad/ut/node_modules/echarts/dist/echarts.min.js';
const WIDTH = Number(process.env.PERSONAS_WIDTH || 1280);
const DIR = path.join(__dirname, '..', '..', 'fixtures', 'personas');
const only = process.argv.slice(2);
const ids = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, '')).filter(id => !only.length || only.includes(id));
// The screens where a date or a headline number is the point: a lock there with every input on file is a story problem.
const CORE = ['#/home/session', '#/plan/goals', '#/plan/foo', '#/plan/timeline', '#/plan/debt-payoff', '#/report/overview', '#/report/one-pager'];
const settle = (page, ms = 250) => page.waitForTimeout(ms);

// Reads the headline numbers off a screen's text, by their labels. Runs in the page.
function readNumbers() {
  const t = document.querySelector('main')?.innerText || '';
  const money = String.raw`[−-]?\$[\d,]+(?:\.\d+)?[KM]?`;
  const grab = (re, k) => [...t.matchAll(re)].map(m => ({ key: k, raw: m[1], at: t.slice(Math.max(0, m.index - 30), m.index + m[0].length + 10).replace(/\s+/g, ' ') }));
  return [
    ...grab(new RegExp(String.raw`(?<!Liquid )(?<!liquid )Net worth\s*[:\n]\s*(${money})`, 'g'), 'netWorth'),
    ...grab(new RegExp(String.raw`(?:Surplus|Left over|Monthly surplus)\s*[:\n]\s*(${money})`, 'g'), 'surplus'),
    ...grab(/Savings rate\s*[:\n]\s*([−-]?\d+(?:\.\d+)?%)/g, 'savingsRate'),
    ...grab(/[Dd]ebt[- ]free\s*(?:in |by |date\s*[:\n]\s*|\n\s*)?((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4})/g, 'debtFree')
      .filter(n => !/own payment is paid/.test(n.at)), // "If only each debt's own payment is paid: debt free ..." is a labelled comparison, not a second answer
    ...grab(/FI date\s*[:\n]\s*(?:[^\n]*?)((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4})/g, 'fiDate'),
    // Batch 33: the month the heavy debt is gone, as Goals, Home and the one-pager's moves say it (the FOO's step 3).
    ...grab(/(?:the cards paid off|pays heavy debt until) ((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4})/g, 'heavyOff'),
  ];
}
// The app's own answers, from the open client. Runs in the page.
async function appAnswers() {
  const m = window.slam.ctx.metrics();
  const debts = m.inputs.debts.filter(d => (d.balance ?? 0) > 0 && !d.inFull);
  const mon = n => { if (n == null) return null; const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + n); return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); };
  return { name: window.slam.store.doc.client.name, netWorth: m.netWorth.value, surplus: m.surplus.value, savingsRate: m.savingsRate.value, debts: debts.length,
    debtFreeMonths: debts.length ? m.debtPlan.months : null, debtFree: debts.length && m.debtPlan.months != null ? mon(m.debtPlan.months) : null,
    fiMonths: m.monthsToFi.value, fiNever: !!m.monthsToFi.never, fiDate: m.monthsToFi.value != null ? mon(m.monthsToFi.value) : null,
    takeHome: m.inputs.takeHome, invested: m.inputs.invested, couple: !!m.inputs.gates.couple,
    cards: debts.filter(d => d.type === 'Credit card').length, owns: window.slam.store.doc.profile.housing === 'Own' };
}
const toNum = raw => {
  if (raw == null) return null;
  const s = String(raw).replace('−', '-');
  if (/%$/.test(s)) return Number(s.replace('%', '')) / 100;
  const k = /K$/.test(s) ? 1e3 : /M$/.test(s) ? 1e6 : 1;
  return Number(s.replace(/[$,KM]/g, '')) * k;
};
const sameMoney = (a, b) => Math.abs(a - b) <= Math.max(1, Math.abs(b) * 0.006); // a rounded $1.2M still matches

async function runPersona(browser, id) {
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 1000 } });
  if (fs.existsSync(ECHARTS)) await ctx.route(/cdnjs\.cloudflare\.com.*echarts/, r => r.fulfill({ path: ECHARTS, contentType: 'application/javascript' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  let route = 'load';
  page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|net::ERR|Failed to load resource/.test(m.text())) errors.push({ route, text: m.text().slice(0, 300) }); });
  page.on('pageerror', e => errors.push({ route, text: String(e).slice(0, 300) }));
  const out = { id, loaded: false, errors, screens: [], numbers: [], story: [], app: null };
  try {
    await page.goto(`${BASE}/#/tools/data`, { waitUntil: 'load' }); await settle(page, 1500);
    route = 'import';
    const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 5000 }), page.locator('button', { hasText: /^Import$/ }).first().click()]);
    await chooser.setFiles(path.join(DIR, `${id}.json`));
    await settle(page, 1200);
    await page.evaluate(() => document.querySelectorAll('.toast button[aria-label="Close"]').forEach(b => b.click())); // the Imported toast would sit over every screen
    await page.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove()));
    out.app = await page.evaluate(appAnswers);
    out.loaded = !!out.app?.name;
  } catch (e) { out.story.push({ severity: 'blocker', route: 'import', what: `the backup did not open through Import: ${e.message.split('\n')[0]}` }); }
  if (!out.loaded) { await ctx.close(); return out; }
  for (const r of ROUTES) {
    route = r;
    const before = errors.length;
    try {
      await page.evaluate(h => { document.querySelectorAll('.pop').forEach(p => p.remove()); location.hash = h; }, r); await settle(page, 450);
      await page.evaluate(() => scrollTo(0, 0));
      const missing = await page.evaluate(async rt => { const m = await import('/js/ui/arrive.js'); return m.missingFor(window.slam.ctx, rt).length; }, r).catch(() => null);
      const lay = await page.evaluate(scan, { checks: ['level', 'clipped', 'overflow', 'covered', 'column', 'sticky', 'unlabeled', 'cramped'] }); // batch 19: column, sticky, unlabeled, cramped
      const text = await page.evaluate(() => document.querySelector('main')?.innerText || '');
      const nums = await page.evaluate(readNumbers);
      out.numbers.push(...nums.map(n => ({ ...n, route: r })));
      const story = [];
      const ctxOf = (re, n = 70) => { const m = re.exec(text); return m ? text.slice(Math.max(0, m.index - n), m.index + m[0].length + n).replace(/\s+/g, ' ').trim() : ''; };
      if (out.app.debts && /No debts? (yet|on file|to show)|You have no debt|no debt at all|Nothing owed/i.test(text)) story.push({ severity: 'blocker', what: `says there is no debt with ${out.app.debts} on file: "${ctxOf(/No debts? (yet|on file|to show)|You have no debt|no debt at all|Nothing owed/i)}"` });
      if (/\bNaN\b|\bundefined\b|\bInfinity\b|\[object Object\]/.test(text)) story.push({ severity: 'blocker', what: `shows a broken value: "${ctxOf(/\bNaN\b|\bundefined\b|\bInfinity\b|\[object Object\]/)}"` });
      // A locked number or date (a FOO step waiting for the one before it is by design, so those are left out).
      const locks = await page.evaluate(() => [...document.querySelectorAll('main *')].filter(el => el.children.length <= 3 && /^\s*Locked/.test(el.textContent) && !el.closest('.foo-step, .foo-lock') && el.checkVisibility())
        .filter((el, i, all) => !all.some(o => o !== el && el.contains(o))).map(el => { const box = el.closest('.metric, .card, section, div.row-line') || el.parentElement; const label = box?.querySelector('.label, h3, h2, strong')?.textContent?.trim() || ''; return `${label}: ${el.textContent.replace(/\s+/g, ' ').trim()}`.slice(0, 120); }));
      // Each lock on a core screen, judged by what it asks for: a number this household cannot have is a story problem.
      if (CORE.includes(r)) for (const l of locks) {
        const what = /^Utilization/.test(l) ? (out.app.cards ? null : ['minor', 'asks for credit limits with no card on file'])
          : /^Debt-to-income/.test(l) ? (out.app.debts ? null : ['minor', 'locked with no debt, where it is 0%'])
          : /^Housing/.test(l) ? (out.app.owns ? ['major', 'asks for rent or a mortgage line from a homeowner'] : null)
          : /DRAFTT|^Biggest share/.test(l) ? null // needs Budget lines, one tap away (batch 45, QUESTIONS 349); a gut number alone cannot fill it
          : out.app.takeHome != null && out.app.invested != null ? ['major', 'locked with take-home, spending and investments on file'] : null;
        if (what) story.push({ severity: what[0], what: `"${l}": ${what[1]}` });
      }
      const neg = /−\$[\d,]+ is free to spend/.exec(text);
      if (neg) story.push({ severity: 'blocker', what: `the paycheck line says "${ctxOf(/−\$[\d,]+ is free to spend/, 120)}" with a surplus of ${Math.round(out.app.surplus)}` });
      else if (out.app.surplus != null && out.app.surplus < 0 && /\$[\d,]+ is free to spend/.test(text)) story.push({ severity: 'major', what: `money free to spend with a gap of ${out.app.surplus} a month: "${ctxOf(/\$[\d,]+ is free to spend/, 90)}"` });
      if (out.app.surplus != null && out.app.surplus < 0 && /even with money left over/.test(text)) story.push({ severity: 'major', what: `says "even with money left over" with a gap of ${out.app.surplus} a month` });
      if (out.app.fiMonths === 0 && /about 0 years from now|on track for FI around/.test(text)) story.push({ severity: 'major', what: `already past the FI number, and it reads "${ctxOf(/about 0 years from now|on track for FI around \d{4}/, 40)}"` });
      if (out.app.debts && out.app.debtFreeMonths != null && /never pays (it )?off/i.test(text)) story.push({ severity: 'major', what: `says a payment never pays it off, while the plan has a debt-free month (${out.app.debtFree}): "${ctxOf(/never pays (it )?off/i)}"` });
      if (out.app.surplus != null && out.app.surplus < 0 && /\bon track\b|\bsurplus of \$/i.test(text)) story.push({ severity: 'major', what: `reads like money is left over with a gap of ${out.app.surplus}: "${ctxOf(/\bon track\b|\bsurplus of \$/i)}"` });
      out.screens.push({ route: r, missing, layout: lay.list.map(f => ({ check: f.check, text: f.text, detail: f.detail, selector: f.selector })), errors: errors.length - before, story });
      out.story.push(...story.map(s => ({ ...s, route: r })));
      if (r === '#/home/session') await page.screenshot({ path: path.join(OUT, `${id}-home.png`), fullPage: false }).catch(() => {});
    } catch (e) { out.screens.push({ route: r, crash: e.message.split('\n')[0] }); out.story.push({ severity: 'blocker', route: r, what: `the screen could not be checked: ${e.message.split('\n')[0]}` }); }
  }
  // One answer per number: every value read off any screen against the app's own math, and against each other.
  const want = { netWorth: out.app.netWorth, surplus: out.app.surplus, savingsRate: out.app.savingsRate };
  for (const k of ['netWorth', 'surplus', 'savingsRate']) {
    const seen = out.numbers.filter(n => n.key === k);
    const off = seen.filter(n => want[k] != null && !(k === 'savingsRate' ? Math.abs(toNum(n.raw) - want[k]) < 0.006 : sameMoney(toNum(n.raw), want[k])));
    if (off.length) out.story.push({ severity: 'blocker', route: [...new Set(off.map(o => o.route))].join(', '), what: `${k} shows ${[...new Set(off.map(o => o.raw))].join(', ')} where the math says ${want[k]} ("${off[0].at}")` });
  }
  for (const [k, appSays] of [['debtFree', out.app.debtFree], ['fiDate', out.app.fiDate], ['heavyOff', null]]) {
    const seen = [...new Set(out.numbers.filter(n => n.key === k).map(n => n.raw.replace(/^(\w{3})\w*/, '$1')))];
    if (seen.length > 1) out.story.push({ severity: 'blocker', route: [...new Set(out.numbers.filter(n => n.key === k).map(n => n.route))].join(', '), what: `two answers for the ${k === 'fiDate' ? 'FI date' : k === 'heavyOff' ? 'month the heavy debt is paid off' : 'debt-free month'}: ${seen.join(' and ')}${appSays ? ` (the math: ${appSays})` : ''}` });
  }
  await ctx.close();
  return out;
}

(async () => {
  const t0 = Date.now();
  fs.mkdirSync(OUT, { recursive: true });
  console.log(`Persona run: ${ids.length} personas x ${ROUTES.length} screens at ${WIDTH}`);
  const browser = await chromium.launch();
  const results = [];
  for (const id of ids) { process.stdout.write(`  ${id}... `); const r = await runPersona(browser, id); results.push(r); console.log(r.loaded ? `${r.errors.length} errors, ${r.story.length} story notes` : 'did not load'); }
  await browser.close();
  const secs = Math.round((Date.now() - t0) / 1000);
  fs.writeFileSync(path.join(OUT, 'personas.json'), JSON.stringify({ when: new Date().toISOString(), base: BASE, width: WIDTH, seconds: secs, results }, null, 1));
  const sum = (r, f) => r.screens.reduce((s, x) => s + (f(x) || 0), 0);
  const md = ['# Persona run', '', `${new Date().toISOString().slice(0, 16)} · ${secs} s · ${ids.length} personas x ${ROUTES.length} screens at ${WIDTH} wide. Rules: QA.md, DESIGN.md.`, '',
    '| Persona | Loaded | Console errors | What\'s missing (all screens) | Layout findings | Story: blocker / major | Home |', '|---|---|---|---|---|---|---|',
    ...results.map(r => `| ${r.id} | ${r.loaded ? 'yes' : '**no**'} | ${r.errors.length} | ${sum(r, s => s.missing)} | ${sum(r, s => s.layout?.length)} | ${r.story.filter(s => s.severity === 'blocker').length} / ${r.story.filter(s => s.severity === 'major').length} | ${path.join(OUT, `${r.id}-home.png`)} |`), ''];
  for (const r of results) {
    md.push(`## ${r.id}`, '');
    if (r.app) md.push(`The math: net worth ${Math.round(r.app.netWorth ?? NaN)}, surplus ${Math.round(r.app.surplus ?? NaN)}, savings rate ${r.app.savingsRate == null ? 'n/a' : (r.app.savingsRate * 100).toFixed(1) + '%'}, debt-free ${r.app.debts ? r.app.debtFree ?? 'never' : 'no debt'}, FI ${r.app.fiNever ? 'not on this path' : r.app.fiDate ?? 'locked'}.`, '');
    for (const s of r.story) md.push(`- **${s.severity}** ${s.route}: ${s.what}`);
    for (const e of r.errors.slice(0, 8)) md.push(`- **error** ${e.route}: ${e.text}`);
    const lay = r.screens.flatMap(s => (s.layout || []).map(f => `${s.route} ${f.check}: ${f.text ? `"${f.text}" ` : ''}${f.detail}`));
    if (lay.length) md.push(`- layout (${lay.length}): ${[...new Set(lay)].slice(0, 6).join('; ')}`);
    md.push(`- What's missing by screen: ${r.screens.filter(s => s.missing).map(s => `${s.route.replace('#/', '')} ${s.missing}`).join(', ') || 'none'}`, '');
  }
  fs.writeFileSync(path.join(OUT, 'report.md'), md.join('\n'));
  console.log(`Report: ${path.join(OUT, 'report.md')} · ${secs} s`);
  const bad = results.filter(r => !r.loaded || r.errors.length || r.screens.some(s => s.crash));
  process.exit(bad.length ? 1 : 0);
})();
