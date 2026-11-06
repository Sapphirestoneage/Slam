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
// $30,000, invested $410,000, owns a home, has a car, FI age 50.
const ALEXIS = { name: 'Alexis Gillmore', birthYear: '1998', takeHome: '1200', per: 'paycheck', freq: '2 weeks', gut: '2800', gutIncludesDebt: false, checking: '400', savings: '0', invested: '0',
  housing: 'Rent', car: false, cards: { bal: '4200', pay: '120' }, noOtherDebts: true, fiAge: null,
  taps: { kids: false, pets: false, work: 'Employed (W-2)', household: 'Solo', hsa: false, fsa: false, equity: false, state: 'NY', why: ['Debt feels out of control'], worry: ['Debt'], goal: ['Debt free'] } };
const TOM = { name: 'Tom Hutchinson', birthYear: '1988', takeHome: '9800', per: 'month', freq: null, gut: '6500', gutIncludesDebt: true, checking: '8000', savings: '30000', invested: '410000',
  housing: 'Own', car: true, cards: null, noOtherDebts: false, fiAge: '50',
  taps: { kids: false, pets: false, work: 'Employed (W-2)', household: 'Solo', hsa: true, fsa: false, equity: true, state: 'NY', why: ['Want FI or to retire early'], worry: ['Never being able to retire'], goal: ['FI or retire early'] } };

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

// Every click and keystroke, counted the way the QA effort table counts them: a click or a pick is 1, typing is one
// per character, Enter or Tab is 1.
function counter(page) {
  const c = { clicks: 0, keys: 0, get total() { return this.clicks + this.keys; } };
  c.click = async (loc, opts = {}) => { await loc.click({ timeout: 4000, ...opts }); c.clicks += 1; };
  c.type = async (loc, text) => { await loc.click({ timeout: 4000 }); await loc.fill(String(text)); c.keys += String(text).length; await loc.press('Tab'); c.keys += 1; };
  c.pick = async (loc, value) => { await loc.selectOption(value); c.clicks += 1; };
  c.press = async key => { await page.keyboard.press(key); c.keys += 1; };
  return c;
}
const byFocus = (page, key) => page.locator(`[data-focus="${key}"]`).first();
const has = async loc => (await loc.count()) > 0;

// New client (Home > New client > name > Create), counted.
async function newClient(page, client, c = counter(page)) {
  const btn = page.locator('button', { hasText: /^New client$/ }).first();
  if (!(await has(btn))) { await c.click(page.locator('.client-btn')); await settle(page, 200); }
  await c.click(page.locator('button', { hasText: /^New client$/ }).first()); await settle(page, 250);
  await page.locator('.new-client-pop input').fill(client.name); c.keys += client.name.length;
  await c.click(page.locator('.new-client-pop button', { hasText: 'Create' })); await settle(page, 700);
  return c;
}
// Fast Track with the client's numbers, every step; the tap step (batch 14) answers About you's switches and Why now.
async function fastTrack(page, client, c = counter(page)) {
  const start = page.locator('button', { hasText: /^(Start session 1|Start Fast Track|Redo Fast Track)$/ }).first();
  if (!(await has(start))) await page.evaluate(() => { location.hash = '#/net-worth/assets'; });
  await settle(page, 300);
  await c.click(page.locator('button', { hasText: /^(Start session 1|Start Fast Track|Redo Fast Track)$/ }).first()); await settle(page, 400);
  const seg = async (label, v) => { const b = byFocus(page, `seg:${label}:${v}`); if (await has(b) && (await b.getAttribute('aria-pressed')) !== 'true') await c.click(b); };
  const money = async (key, v) => { if (v == null) return; const b = byFocus(page, key); if (await has(b)) await c.type(b, v); };
  for (let s = 0; s < 14; s++) {
    if (!(await has(page.locator('.ft-box')))) break;
    const title = (await page.locator('.ft-box h2').first().innerText().catch(() => '')).trim();
    if (/done|Every lens|Almost/i.test(title)) break;
    if (/About you/.test(title) && !/switch|tap/i.test(title)) { await settle(page, 100); const by = byFocus(page, 'ft:by'); if (!(await by.inputValue())) await c.type(by, client.birthYear); await seg('Solo or couple', client.taps.household === 'Couple' ? 'Couple' : 'Solo'); }
    else if (/Take-home/.test(title)) { await money('ft:take', client.takeHome); await seg('Per', client.per); if (client.freq) await c.pick(byFocus(page, 'ft:freq'), client.freq); }
    else if (/Spending/.test(title)) { await money('ft:gut', client.gut); await seg('Includes debt payments', String(client.gutIncludesDebt)); }
    else if (/Cash/.test(title)) { await money('ft:chk', client.checking); await money('ft:sav', client.savings); }
    else if (/Investments/.test(title)) { await money('ft:inv', client.invested); }
    else if (/Home and car/.test(title)) { await seg('Housing', client.housing); await settle(page, 150); await seg('Has a car', String(client.car)); await settle(page, 150); }
    else if (/Debts/.test(title)) {
      if (client.cards) { await money('ft:Credit card:bal', client.cards.bal); await money('ft:Credit card:pay', client.cards.pay); }
      if (client.noOtherDebts) { const box = page.locator('.ft-box label.check input'); if (await has(box) && !(await box.isChecked())) await c.click(box); }
    } else if (/work be optional/.test(title)) { await money('ft:fi', client.fiAge); }
    else if (/switch|tap|What applies/i.test(title)) await tapStep(page, client.taps, c);
    await settle(page, 120);
    await c.click(page.locator('.ft-box .ft-foot button.primary')); await settle(page, 350);
  }
  // Done: the end screen's primary button (Done, or Walk me through when it is offered).
  const end = page.locator('.ft-box .row-line button.primary').first();
  return { c, end };
}
// The tap step: every About you switch and the Why now chips, one tap each.
async function tapStep(page, t, c) {
  const seg = async (label, v) => { const b = byFocus(page, `seg:${label}:${v}`); if (await has(b) && (await b.getAttribute('aria-pressed')) !== 'true') await c.click(b); };
  await seg('Has kids', String(t.kids)); await seg('Has pets', String(t.pets));
  await seg('HSA-eligible', String(t.hsa)); await seg('FSA', String(t.fsa)); await seg('Equity pay', String(t.equity));
  const work = byFocus(page, 'ft:work'); if (await has(work)) await c.pick(work, t.work);
  const mode = byFocus(page, 'ft:mode'); if (await has(mode) && !(await mode.inputValue())) await c.pick(mode, t.household);
  const st = byFocus(page, 'ft:state'); if (await has(st) && !(await st.inputValue())) await c.pick(st, t.state);
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

module.exports = { BASE, launch, settle, counter, newClient, fastTrack, tapStep, newClientFastTrack, byFocus, has, ALEXIS, TOM };
