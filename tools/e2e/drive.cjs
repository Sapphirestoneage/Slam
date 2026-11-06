// Shared helpers for the batch 14 browser scripts (findability.cjs, effort.cjs): launch with the blocked CDN and
// fonts stood in, make a new client through the UI and run Fast Track with a standard client's numbers, counting every
// click and keystroke. Standard clients from the build notes: Alexis (avoids money) and Tom (CPA).
const fs = require('fs');
let chromium;
try { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); } catch { ({ chromium } = require('playwright')); }

const BASE = process.env.SLAM_URL || 'http://localhost:8767';
const ECHARTS = process.env.ECHARTS || '/tmp/claude-0/-home-claude/5ae6d13c-3802-502b-b29a-86ed1541b542/scratchpad/ut/node_modules/echarts/dist/echarts.min.js';
const settle = (page, ms = 300) => page.waitForTimeout(ms);

// Alexis: born 1998, $1,200 every 2 weeks, gut $2,800 (not incl debt), checking $400, nothing invested, cards $4,200
// paying $120, rents, no car. Tom: born 1988, $9,800 a month, spending $6,500 incl debt, checking $8,000, savings
// $30,000, invested $410,000, owns a home, has a car, FI age 50. Batch 18: the build notes give Tom's spending as a
// number, not a gut (Alexis's and Maya's are "gut"), and Tom is a CPA, so his $6,500 is read off his statements
// (Fast Track's "Where is it from?" tap), and he knows what his home and car are worth (about $650,000 and $22,000,
// typed in Fast Track's Home and car step; no loan numbers, as the notes give none). Alexis's spending stays a gut.
const ALEXIS = { name: 'Alexis Gillmore', birthYear: '1998', takeHome: '1200', per: 'paycheck', freq: '2 weeks', gut: '2800', gutIncludesDebt: false, checking: '400', savings: '0', invested: '0',
  housing: 'Rent', car: false, cards: { bal: '4200', pay: '120' }, noOtherDebts: true, fiAge: null,
  taps: { kids: false, pets: false, work: 'Employed (W-2)', household: 'Solo', hsa: false, fsa: false, equity: false, state: 'NY', why: ['Debt feels out of control'], worry: ['Debt'], goal: ['Debt free'] } };
const TOM = { name: 'Tom Hutchinson', birthYear: '1988', takeHome: '9800', per: 'month', freq: null, gut: '6500', gutIncludesDebt: true, gutFrom: 'Statements', checking: '8000', savings: '30000', invested: '410000',
  housing: 'Own', car: true, homeValue: '650000', carValue: '22000', cards: null, noOtherDebts: false, fiAge: '50',
  taps: { kids: false, pets: false, work: 'Employed (W-2)', household: 'Solo', hsa: true, fsa: false, equity: true, state: 'NY', why: ['Want FI or to retire early'], worry: ['Never being able to retire'], goal: ['FI or retire early'] } };

// Maya (batch 57, the build notes): born 1996, $2,400 every 2 weeks, gut $3,500 (not incl debt), checking $1,200,
// savings $4,000, invested $15,000, cards $6,000 paying $200 (the APR a guess), rents, no car.
const MAYA = { name: 'Maya Test', birthYear: '1996', takeHome: '2400', per: 'paycheck', freq: '2 weeks', gut: '3500', gutIncludesDebt: false, checking: '1200', savings: '4000', invested: '15000',
  housing: 'Rent', car: false, cards: { bal: '6000', pay: '200' }, noOtherDebts: true, fiAge: null,
  taps: { kids: false, pets: false, work: 'Employed (W-2)', household: 'Solo', hsa: false, fsa: false, equity: false, state: 'NY', why: ['Debt feels out of control'], worry: ['Debt'], goal: ['Debt free'] } };
async function launch({ width = 1440, height = 1000 } = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width, height } });
  if (fs.existsSync(ECHARTS)) await ctx.route(/cdnjs\.cloudflare\.com.*echarts/, r => r.fulfill({ path: ECHARTS, contentType: 'application/javascript' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e).slice(0, 200)));
  await page.goto(`${BASE}/#/home/session`, { waitUntil: 'load' });
  await settle(page, 1500);
  return { browser, ctx, page };
}

// Every action, counted the way the QA effort table counts them (QUESTIONS 232, batch 18): a click, a pick or a typed
// number (or name) is one action; keystrokes are counted separately (one per character, plus the Tab or Enter after
// typing). c.log keeps every action in order with what it was for, so waste is visible.
function counter(page) {
  const c = { clicks: 0, typed: 0, keys: 0, log: [], step: '', get total() { return this.clicks + this.typed; } };
  const note = (kind, what, keys = 0) => c.log.push({ n: c.log.length + 1, kind, what: `${c.step ? `${c.step}: ` : ''}${what || '?'}`, keys });
  c.click = async (loc, what = null, opts = {}) => { if (what && typeof what === 'object') { opts = what; what = null; } const w = what || (await loc.innerText({ timeout: 1000 }).catch(() => '')).trim().split('\n')[0].slice(0, 40) || (await loc.getAttribute('data-focus').catch(() => '')) || 'click'; await loc.click({ timeout: 4000, ...opts }); c.clicks += 1; note('tap', w); };
  c.type = async (loc, text, what = null) => { const w = what || (await loc.getAttribute('data-focus').catch(() => '')) || 'a box'; await loc.click({ timeout: 4000 }); await loc.fill(String(text)); await loc.press('Tab'); c.typed += 1; c.keys += String(text).length + 1; note('type', `${w} = ${text}`, String(text).length + 1); };
  c.typeOnly = (what, text) => { c.typed += 1; c.keys += String(text).length; note('type', `${what} = ${text}`, String(text).length); };
  // A pick from a list: a select, or (batch 13) a row of tap chips (the chip whose words hold the value).
  c.pick = async (loc, value, what = null) => { const w = what || (await loc.getAttribute('data-focus').catch(() => '')) || 'a list'; const tag = await loc.evaluate(el => el.tagName);
    if (tag === 'SELECT') await loc.selectOption(value); else await loc.locator('button.pick', { hasText: value }).first().click({ timeout: 4000 }); c.clicks += 1; note('pick', `${w} = ${value}`); };
  c.press = async key => { await page.keyboard.press(key); c.keys += 1; };
  return c;
}
const byFocus = (page, key) => page.locator(`[data-focus="${key}"]`).first();
// The value a select or a row of tap chips holds now (the pressed chip's words for chips).
const valueOf = loc => loc.evaluate(el => (el.tagName === 'SELECT' ? el.value : el.querySelector('button.pick[aria-pressed="true"]')?.textContent?.trim() ?? ''));
const has = async loc => (await loc.count()) > 0;

// New client (Home > New client > name > Create and start session 1), counted. start: false clicks Create alone.
async function newClient(page, client, c = counter(page), { start = true } = {}) {
  c.step = 'New client';
  const btn = page.locator('button', { hasText: /^New client$/ }).first();
  if (!(await has(btn))) { await c.click(page.locator('.client-btn')); await settle(page, 200); }
  await c.click(page.locator('button', { hasText: /^New client$/ }).first()); await settle(page, 250);
  await page.locator('.new-client-pop input').fill(client.name); c.typeOnly('client name', client.name);
  const go = page.locator('.new-client-pop button', { hasText: start ? 'Create and start session 1' : /^Create$/ });
  await c.click(await has(go) ? go : page.locator('.new-client-pop button', { hasText: 'Create' }).first()); await settle(page, 900);
  return c;
}
// Fast Track with the client's numbers, every step; About you carries the switches and Why now (batch 14's tap step,
// on one screen since batch 18).
async function fastTrack(page, client, c = counter(page)) {
  if (!(await has(page.locator('.ft-box')))) {
    const start = page.locator('button', { hasText: /^(Start session 1|Start Fast Track|Redo Fast Track)$/ }).first();
    if (!(await has(start))) await page.evaluate(() => { location.hash = '#/net-worth/assets'; });
    await settle(page, 300);
    c.step = 'Home';
    await c.click(page.locator('button', { hasText: /^(Start session 1|Start Fast Track|Redo Fast Track)$/ }).first()); await settle(page, 400);
  }
  // Scoped to the Fast Track box: About you on the page under it has the same buttons (batch 57).
  const seg = async (label, v) => { const b = page.locator(`.ft-box [data-focus="${`seg:${label}:${v}`}"]`).first(); if (await has(b) && (await b.getAttribute('aria-pressed')) !== 'true') await c.click(b); };
  const money = async (key, v) => { if (v == null) return; const b = byFocus(page, key); if (await has(b)) await c.type(b, v); };
  for (let s = 0; s < 14; s++) {
    if (!(await has(page.locator('.ft-box')))) break;
    const title = (await page.locator('.ft-box h2').first().innerText().catch(() => '')).trim();
    c.step = `Fast Track ${title}`;
    if (/done|Every lens|Almost|first picture/i.test(title)) break; // batch 20: the end screen says "The first picture"
    if (/About you/.test(title)) { await settle(page, 100); const by = byFocus(page, 'ft:by'); if (!(await by.inputValue())) await c.type(by, client.birthYear); await seg('Solo or couple', client.taps.household === 'Couple' ? 'Couple' : 'Solo'); await settle(page, 150); }
    if (/About you|switch|tap|What applies/i.test(title)) await tapStep(page, client, c);
    else if (/Take-home/.test(title)) { await money('ft:take', client.takeHome); await seg('Per', client.per); await settle(page, 150); if (client.freq) { const f = byFocus(page, 'ft:freq'); const v = await valueOf(f); if (v !== client.freq && !v.endsWith(client.freq)) await c.pick(f, client.freq); } }
    else if (/Spending/.test(title)) { await money('ft:gut', client.gut); await seg('Includes debt payments', String(client.gutIncludesDebt)); if (client.gutFrom) await seg('Where the spending number is from', client.gutFrom); }
    else if (/Cash|Investments/.test(title)) { await money('ft:chk', client.checking); await money('ft:sav', client.savings); await money('ft:inv', client.invested); }
    else if (/Home and car/.test(title)) { await seg('Housing', client.housing); await settle(page, 150); await seg('Has a car', String(client.car)); await settle(page, 150); await money('ft:home', client.homeValue); await money('ft:car', client.carValue); }
    else if (/Debts/.test(title)) {
      if (client.cards) { await money('ft:Credit card:bal', client.cards.bal); await money('ft:Credit card:pay', client.cards.pay); }
      // No other debts only answers something when no debt was typed (a typed balance already says the area is on).
      if (client.noOtherDebts && !client.cards) { const box = page.locator('.ft-box label.check input'); if (await has(box) && !(await box.isChecked())) await c.click(box, 'No other debts'); }
    } else if (/work be optional/.test(title)) { await money('ft:fi', client.fiAge); }
    await settle(page, 120);
    await c.click(page.locator('.ft-box .ft-foot button.primary')); await settle(page, 350);
  }
  c.step = 'Fast Track end';
  // Done: the end screen's primary button (Done, or Walk me through when it is offered).
  const end = page.locator('.ft-box .row-line button.primary').first();
  return { c, end };
}
// About you's switches and the Why now chips, one tap each: the yes answers, then No to the rest for the blanks.
async function tapStep(page, client, c) {
  const t = client.taps;
  const seg = async (label, v) => { const b = byFocus(page, `seg:${label}:${v}`); if (await has(b) && (await b.getAttribute('aria-pressed')) !== 'true') { await c.click(b); await settle(page, 60); } };
  if (client.housing) await seg('Housing', client.housing);
  const yn = [['Has kids', t.kids], ['Has pets', t.pets], ['Has a car', client.car], ['HSA-eligible', t.hsa], ['FSA', t.fsa], ['Equity pay', t.equity]];
  for (const [label, v] of yn) if (v === true) await seg(label, 'true');
  const rest = byFocus(page, 'ft:no-rest');
  if (await has(rest)) { await c.click(rest); await settle(page, 150); } else for (const [label, v] of yn) if (v === false) await seg(label, 'false');
  const work = byFocus(page, 'ft:work'); if (await has(work) && (await valueOf(work)) !== t.work) await c.pick(work, t.work);
  const mode = byFocus(page, 'ft:mode'); if (await has(mode) && !(await valueOf(mode))) await c.pick(mode, t.household);
  const st = byFocus(page, 'ft:state'); if (await has(st) && !(await valueOf(st))) await c.pick(st, t.state);
  for (const [key, chips] of [['whyNow', t.why], ['worry', t.worry], ['goalWords', t.goal]]) for (const chip of chips) {
    const b = page.locator(`.ft-box [data-why="${key}"] button.why-chip`, { hasText: chip }).first();
    if (await has(b) && (await b.getAttribute('aria-pressed')) !== 'true') await c.click(b);
  }
}
async function newClientFastTrack(page, client) {
  const c = await newClient(page, client);
  const { end } = await fastTrack(page, client, c);
  const done = page.locator('.ft-box button', { hasText: /^Done$/ });
  if (await has(done)) await c.click(done); else if (await has(end)) await c.click(end);
  await settle(page, 500);
  if (await has(page.locator('.ft-overlay'))) await page.keyboard.press('Escape');
  return c;
}

module.exports = { BASE, launch, settle, counter, newClient, fastTrack, tapStep, newClientFastTrack, byFocus, has, ALEXIS, TOM, MAYA };
