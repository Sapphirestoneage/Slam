// The UX pass of SLAM the Game, walked in a real browser (Chromium through Playwright), with three fresh profiles.
// Serve the repository (python3 -m http.server 8765), then: node tools/e2e/ux_pass_walk.cjs
// Env: SLAM_URL (default http://localhost:8765), UX_OUT (a folder for screenshots; default: none), UX_W (widths, "1280,390").
// Each profile: the four taps of the opening (What it is), then Finish setup; rapid taps on one chip (counted once), all 5 rounds to "Your first plan", Guess tags and "Where's this
// from?", net worth as a range while it has guesses, every top tile opens, an answer edited with the numbers moving,
// leaving mid-round by a tab and coming back through Finish setup on Next Steps, the values ranking, the goals ranking with the top 3.
// Then a signed-in player: no coach or admin rows, and the coach and admin pages send the player Home.
// The walk answers each setup screen by itself: the answers of the profile first, then the second range, then Next.
// Exit code 1 when a check fails.
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); } catch { ({ chromium } = require('playwright')); }
const BASE = process.env.SLAM_URL || 'http://localhost:8765';
const OUT = process.env.UX_OUT || '';
const DBG = !!process.env.UX_DEBUG;
const WIDTHS = (process.env.UX_W || '1280,390').split(',').map(Number);
const ONLY = process.env.UX_ONLY || '';
let bad = 0;
const results = [];
const chk = (who, name, ok, info) => {
  if (!ok) bad++;
  results.push([who, name, !!ok]);
  console.log((ok ? 'ok   ' : 'FAIL ') + who + ': ' + name + (info === undefined || ok ? '' : ' ' + JSON.stringify(info).slice(0, 300)));
};
const q = (a, v, k) => `[data-a="${a}"]` + (v != null ? `[data-v="${v}"]` : '') + (k != null ? `[data-k="${k}"]` : '');

/* The answers of each profile: selectors tried in order, each one once. */
const PROFILES = [
  {
    id: 'P1 between jobs',
    rapid: '[data-a="amset"][data-q="cards.n"][data-v="3"]',
    leaveAt: 'I',
    prefs: [
      q('agedec', '20s'), q('setn', '26'),
      '[data-a="amset"][data-q="cards.n"][data-v="3"]', '[data-a="amset"][data-q="cards.carry"][data-v="2"]',
      q('tog', 'Student loans'),
      '[data-q="card.1.iss"][data-v="Chase"]', '[data-q="card.1.amt"][data-i="1"]', '[data-q="card.1.rate"][data-v="hi"]',
      '[data-q="card.2.iss"][data-v="Citi"]', '[data-q="card.2.amt"][data-i="2"]', '[data-q="card.2.rate"][data-v="promo"]',
      '[data-q="card.2.end"]',
      '[data-q="d:studentloans.n"][data-v="1"]', '[data-q="d:studentloans.1.amt"][data-i="2"]', '[data-q="d:studentloans.1.rate"][data-v="lo"]',
      q('tog', 'Checking'), q('tog', 'Savings'), q('amira', 'Roth IRA'),
      '[data-q="a:checking"][data-i="1"]', '[data-q="a:savings"][data-i="0"]',
      'details.amnot summary', '[data-a="amhave"][data-n="401(k) or work plan"][data-v="Rolled over"]',
      '[data-q="a:rothira"][data-i="3"]', '[data-q="roll:401korworkplan"][data-v="Roth IRA"]',
      '[data-a="set"][data-v="No"][data-k="can1k"]', '[data-a="set"][data-k="invest"][data-v="Sometimes"]',
      q('set', 'Between jobs'), q('tog', 'A main job'), q('tog', 'Help from family'),
      '[data-q="i:amainjob:f"][data-v="Weekly"]', 'KNOW:i:amainjob:amt:869',
      '[data-q="i:helpfromfamily:f"][data-v="Monthly"]', '[data-q="i:helpfromfamily:amt"][data-i="0"]',
      q('set', 'I rent'), q('tog', 'Roommates'), '[data-a="set"][data-k="roommateQ"][data-v="2"]',
      q('set', 'Single by choice'), '[data-a="set"][data-k="deps"][data-v="None"]', '[data-a="set"][data-k="share"][data-v="No one"]',
    ],
    expect: c => c.roommateCount === 2 && c.debts.filter(x => /card/i.test(x.k) && x.amt > 0).length === 2 && c.invs.some(x => /Roth/.test(x.nick || x.k)) && c.incs.some(x => x.amt === 3766),
  },
  {
    id: 'P2 first job with family',
    rapid: '[data-a="amset"][data-q="cards.n"][data-v="1"]',
    leaveAt: 'A',
    prefs: [
      q('agedec', '20s'), q('setn', '22'),
      '[data-a="amset"][data-q="cards.n"][data-v="1"]', '[data-a="amset"][data-q="cards.carry"][data-v="0"]',
      q('tog', 'Checking'),
      '[data-a="set"][data-v="Yes"][data-k="can1k"]',
      q('set', 'First job'), q('tog', 'A main job'),
      q('set', 'No cost'), q('tog', 'Parents or family'),
      q('set', 'Single by choice'), '[data-a="set"][data-k="deps"][data-v="None"]', '[data-a="set"][data-k="share"][data-v="No one"]',
    ],
    expect: c => c.home === 'With family' && c.debt === 0 && c.work === 'First job',
  },
  {
    id: 'P3 established, 2 kids',
    rapid: '[data-a="amset"][data-q="cards.n"][data-v="0"]',
    leaveAt: 'E',
    prefs: [
      q('agedec', '30s'), q('setn', '38'),
      '[data-a="amset"][data-q="cards.n"][data-v="0"]',
      q('tog', 'Car loan'),
      '[data-q="d:carloan.n"][data-v="1"]', '[data-q="d:carloan.1.amt"][data-i="2"]', '[data-q="d:carloan.1.rate"][data-v="lo"]',
      q('tog', 'Checking'), q('tog', 'Savings'), q('tog', 'Retirement plan at work'),
      q('set', 'Established'), q('tog', 'A main job'),
      '[data-q="i:amainjob:f"][data-v="Every 2 weeks"]',
      q('set', 'I own'), q('tog', 'A partner'), q('tog', 'Kids'), '[data-a="set"][data-k="kidQ"][data-v="2"]',
      q('set', 'Married'),
    ],
    expect: c => c.kidCount === 2 && c.debts.some(x => /Car/.test(x.k) && x.amt > 0) && c.work === 'Established',
  },
];
const ADVANCE = ['[data-a="spnext"]', '[data-a="spgo"]', '[data-a="smdone"]', '[data-a="amgrp"]', '[data-a="wnext"]:not([disabled])'];

async function open(browser, w, stubJs) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, serviceWorkers: 'block' });
  await ctx.route(/cdn\.jsdelivr\.net/, r => (stubJs ? r.fulfill({ contentType: 'application/javascript', body: stubJs }) : r.abort()));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errs.push(m.text()); });
  return { ctx, page, errs };
}
const shot = async (page, name) => { if (OUT) { fs.mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }); } };
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);

/* Answer the setup screens until "Your first plan". Returns what the walk saw on the way. */
async function setup(page, P, who) {
  const ev = (f, a) => page.evaluate(f, a);
  const used = new Set();
  const seen = { reveals: 0, tagged: 0, from: 0, guess: 0, rapid: null, left: null };
  /* The opening of a new player is the four taps of What it is / What it could be. The five rounds come after it,
     from "Finish setup: five short rounds" (cbrest). */
  await ev(() => ACT.start({ dataset: {} }));
  await page.waitForTimeout(600);
  for (let n = 0; n < 160; n++) {
    const st = await ev(() => ({ kind: W && W.kind, step: W && W.step, sp: W && W.sp && W.sp.at, txt: (document.querySelector('#ov') || document.body).innerText }));
    if (DBG) console.log('  ', n, st.kind, st.step, st.sp, JSON.stringify(st.txt.slice(0, 160)));
    if (st.kind === 'firstplan') return Object.assign(seen, { done: true });
    if (st.kind === 'cb' && st.step === 'is' && !seen.rest) {
      seen.rest = true;
      await ev(() => ACT.cbrest());
      await page.waitForTimeout(800);
      continue;
    }
    if (st.sp === 'reveal') {
      seen.reveals++;
      const tag = await ev(() => { const p = document.querySelector('#ov .spnum .pill, #ov .pill'); return p ? p.innerText : ''; });
      if (/^(Guess|Close|Exact)$/.test(tag.trim())) seen.tagged++;
      if (/Guess/.test(tag)) { seen.guess++; if (/Where's this from\?/.test(st.txt)) seen.from++; }
    }
    /* leave mid-round by a tab, then come back through Finish setup on Next Steps */
    const round = (st.txt.match(/(Debts|Assets|Income|Taxes|Expenses):/) || [])[1];
    const L = { D: 'Debts', A: 'Assets', I: 'Income', T: 'Taxes', E: 'Expenses' }[P.leaveAt];
    if (seen.left === null && round === L && st.sp !== 'reveal') {
      const before = st.step;
      const tab = await page.$('#nav [data-a="tab"][data-v="money"], [data-a="tab"][data-v="money"]');
      if (tab) {
        await tab.click(); await page.waitForTimeout(700);
        const out = await ev(() => !(W && W.kind === 'setup'));
        /* the way back for a player of the new opening: "Finish setup: five short rounds" on Next Steps */
        await ev(() => go('plan')); await page.waitForTimeout(600);
        const g = await page.$('#app [data-a="cbrest"]');
        const label = g ? await g.innerText() : '';
        if (g) { await g.click(); await page.waitForTimeout(800); }
        const back = await ev(() => ({ kind: W && W.kind, step: W && W.step }));
        seen.left = { out, label, ok: back.kind === 'setup' && back.step === before, before, back };
        continue;
      }
    }
    let clicked = false;
    if (P.rapid && seen.rapid === null) {
      const el = await page.$(P.rapid);
      if (el) {
        const s0 = await ev(() => W.step);
        await el.click(); await el.click({ timeout: 300 }).catch(() => {}); await el.click({ timeout: 300 }).catch(() => {});
        await page.waitForTimeout(900);
        const am = await ev(() => ({ am: W.o && W.o.am, step: W.step, toasts: document.querySelectorAll('.toast:not([hidden]), .uxtoast').length }));
        seen.rapid = { s0, am, ok: true };
        used.add(P.rapid);
        continue;
      }
    }
    for (const s of P.prefs) {
      if (used.has(s)) continue;
      if (s.startsWith('KNOW:')) {
        const [, qq, f, a, v] = s.split(':');
        const key = qq + ':' + f + ':' + a;
        const k = await page.$(`[data-a="amknow"][data-q="${key}"]`);
        if (!k) continue;
        await k.click(); await page.waitForTimeout(300);
        await page.fill('#amIn', v);
        await (await page.$('[data-a="amuse"]')).click(); await page.waitForTimeout(800);
        used.add(s); clicked = true; break;
      }
      const el = await page.$(s);
      if (!el || !(await el.isVisible())) continue;
      const on = await el.evaluate(e => e.classList.contains('on'));
      used.add(s);
      if (on) continue;
      if (DBG) console.log('    pref', s);
      await el.click(); await page.waitForTimeout(800); clicked = true; break;
    }
    if (clicked) continue;
    /* a question with no answer of the profile: the second range chip, else the first choice */
    const pick = await ev(() => {
      const r = document.querySelector('#ov') || document.body;
      const byQ = {};
      r.querySelectorAll('[data-q][data-i]').forEach(e => (byQ[e.dataset.q] = byQ[e.dataset.q] || []).push(e));
      const qk = Object.keys(byQ).find(k => !byQ[k].some(e => e.classList.contains('on')) && !(window.__uxTried || {})[k]);
      if (qk) { window.__uxTried = Object.assign(window.__uxTried || {}, { [qk]: 1 }); const e = byQ[qk][Math.min(1, byQ[qk].length - 1)]; e.click(); return 'range ' + qk + ' ' + e.innerText; }
      const set = [...r.querySelectorAll('[data-a="set"], [data-a="amset"], [data-a="amrate"]')].filter(e => !e.classList.contains('on') && !e.disabled);
      const qs = new Set();
      const unanswered = set.filter(e => { const k = e.dataset.k || e.dataset.q; if (qs.has(k)) return false; qs.add(k); return ![...r.querySelectorAll('[data-k="' + k + '"].on, [data-q="' + k + '"].on')].length; });
      if (unanswered.length) { unanswered[0].click(); return 'set ' + (unanswered[0].dataset.k || unanswered[0].dataset.q); }
      const tg = [...r.querySelectorAll('[data-a="tog"]')];
      if (tg.length && tg[0].dataset.k === 'live' && !tg.some(e => e.classList.contains('on')) && !(window.__uxTried || {})['tog:' + tg[0].dataset.k]) {
        window.__uxTried = Object.assign(window.__uxTried || {}, { ['tog:' + tg[0].dataset.k]: 1 });
        tg[0].click();
        return 'tog ' + tg[0].dataset.v;
      }
      return null;
    });
    if (DBG && pick) console.log('    pick', pick);
    if (pick) { await page.waitForTimeout(800); continue; }
    let moved = false;
    for (const s of ADVANCE) {
      const el = await page.$(s);
      if (el && (await el.isVisible())) { await el.click(); await page.waitForTimeout(800); moved = true; break; }
    }
    if (!moved) return Object.assign(seen, { done: false, stuck: st.txt.slice(0, 300), step: st.step });
  }
  return Object.assign(seen, { done: false, stuck: 'too many screens' });
}

async function afterSetup(page, P, who, seen) {
  const ev = (f, a) => page.evaluate(f, a);
  chk(who, 'all 5 rounds end on Your first plan', seen.done, seen.stuck);
  if (!seen.done) return;
  const rv = P.rapid.match(/data-v="(\d+)"/)[1],
    got = seen.rapid && seen.rapid.am && seen.rapid.am.am && seen.rapid.am.am['cards.n'];
  chk(who, 'rapid taps on one chip count once (no stacking)', got && String(got.v) === rv && seen.rapid.am.step - seen.rapid.s0 <= 1 && seen.rapid.am.toasts <= 1, seen.rapid);
  chk(who, 'each round shows its one number with a status tag', seen.reveals >= 5 && seen.tagged >= 5, seen);
  chk(who, "a Guess number has Where's this from?", seen.guess === seen.from, [seen.guess, seen.from]);
  chk(who, 'leaving mid-round by a tab and Finish setup on Next Steps comes back to the same page', seen.left && seen.left.ok, seen.left);
  await shot(page, who.replace(/\W+/g, '-') + '-firstplan');
  /* the two taps after the first plan */
  const n2 = await page.$('#ov [data-a="spplan2"]');
  if (n2) { await n2.click(); await page.waitForTimeout(800); }
  for (let i = 0; i < 4; i++) {
    const t = await ev(() => ({ k: W && W.kind, txt: (document.querySelector('#ov') || document.body).innerText.slice(0, 300), b: [...document.querySelectorAll('#ov [data-a]')].map(e => e.dataset.a + ':' + (e.dataset.v || '')).join(' ') }));
    if (DBG) console.log('  after plan', JSON.stringify(t));
    const b = await page.$('#ov [data-a="elacc"]:not(.on), #ov [data-a="elfocus"]:not(.on)');
    if (!b) break;
    await b.click(); await page.waitForTimeout(900);
  }
  await ev(() => { try { closeSheet(); } catch (e) {} go('home'); });
  await page.waitForTimeout(600);
  if (DBG) console.log('  home', JSON.stringify(await ev(() => ({ placed: C().placed, demo: G.demo, kind: W && W.kind, tiles: document.querySelectorAll('#app .dktile').length, txt: document.querySelector('#app').innerText.slice(0, 400) }))));
  const c = await ev(() => JSON.parse(JSON.stringify(C())));
  chk(who, 'the saved profile matches the answers', P.expect(c), { rc: c.roommateCount, kc: c.kidCount, debts: c.debts.map(x => [x.k, x.amt]), work: c.work, home: c.home, incs: c.incs.map(x => [x.k, x.amt]) });
  /* every top tile opens */
  for (const tab of ['home', 'money']) {
    await ev(t => go(t), tab); await page.waitForTimeout(500);
    const TILE = '#app .dktile[data-a], #app button.q[data-a]';
    const n = await page.$$eval(TILE, e => e.length);
    let opened = 0;
    for (let i = 0; i < n; i++) {
      const tiles = await page.$$(TILE);
      await tiles[i].click(); await page.waitForTimeout(600);
      const ok = await ev(t => !!(SH && W && W.kind) || tab !== t, tab);
      if (ok) opened++;
      await ev(t => { try { closeSheet(); } catch (e) {} go(t); }, tab); await page.waitForTimeout(400);
    }
    chk(who, 'every top tile on ' + tab + ' opens something (' + n + ')', n >= (tab === 'home' ? 3 : 4) && opened === n, [opened, n]);
  }
  /* net worth: a range while it has guesses */
  await ev(() => go('money')); await page.waitForTimeout(500);
  const nw = await page.$eval('#app .dkstats .dktile .dknum', e => e.innerText);
  const hasGuess = await ev(() => { const c = C(); return [c.cashes, c.invs, c.debts].some(a => (a || []).some(r => !r.s || (r.cf || 0) < 3)); });
  chk(who, 'net worth is a range while a piece is a guess or a range', !hasGuess || /to/.test(nw), nw);
  await shot(page, who.replace(/\W+/g, '-') + '-money');
  chk(who, 'My Money starts with 4 tiles and closed sections', (await page.$$('#app .dkstats .dktile')).length === 4 && (await page.$$('#app details.dksec:not([open])')).length >= 6);
  chk(who, 'nothing goes off the side', !(await sideways(page)));
  /* the donut: each part opens its lines */
  const part = await page.$('#app .dkpart');
  if (part) { await part.click(); await page.waitForTimeout(600); }
  chk(who, 'a part of the spending donut opens its lines', part && (await ev(() => W && W.kind)) != null, await ev(() => W && W.kind));
  await ev(() => { try { closeSheet(); } catch (e) {} });
  /* edit an earlier answer: the numbers move */
  await ev(() => go('money')); await page.waitForTimeout(400);
  const before = await ev(() => ({ left: C().take - C().spend, free: freeToSpend(C(), D).free }));
  await page.click('#app details.dksec[data-sec="flow"] > summary'); await page.waitForTimeout(400);
  await page.click('#app details.dksec[data-sec="flow"] [data-a="rowedit"][data-k="incs"]'); await page.waitForTimeout(600);
  if (DBG) console.log('  edit sheet', JSON.stringify(await ev(() => (document.querySelector('#ov') || document.body).innerText.slice(0, 600))));
  let changed = false;
  for (const label of ['$5,000 to $7,000', '$1,000 to $1,500']) {
    const ch = page.locator('#ov .chip', { hasText: label }).first();
    if (!(await ch.count()) || (await ch.evaluate(e => e.classList.contains('on')))) continue;
    await ch.click(); await page.waitForTimeout(600); changed = true; break;
  }
  const save = await page.$('#ov [data-a="rowsave"]');
  if (save) { await save.click(); await page.waitForTimeout(600); }
  const after = await ev(() => ({ left: C().take - C().spend, free: freeToSpend(C(), D).free }));
  chk(who, 'editing an answer recalculates at once', changed && after.left !== before.left, [before, after]);
  await ev(() => { try { closeSheet(); } catch (e) {} });
  /* values: rank, link, result */
  await ev(() => ACT.values()); await page.waitForTimeout(400);
  for (const v of ['Family', 'Health', 'Fun', 'Security']) { const b = await page.$(`#ov [data-a="vltop"][data-v="${v}"]`); if (b) { await b.click(); await page.waitForTimeout(300); } }
  await page.click('#ov [data-a="vldown"][data-v="0"]'); await page.waitForTimeout(300);
  const rank = await ev(() => vlGet(C()).rank);
  chk(who, 'values: tap in order ranks, and ↓ moves', rank.join() === 'Health,Family,Fun,Security', rank);
  await page.click('#ov [data-a="vlstep"][data-v="2"]'); await page.waitForTimeout(400);
  for (let i = 0; i < 8; i++) {
    const chip = await page.$('#ov [data-a="vlserve"]');
    if (!chip) break;
    await chip.click(); await page.waitForTimeout(250);
    const keep = await page.$('#ov [data-a="vlmark"][data-v="keep"]');
    if (keep) { await keep.click(); await page.waitForTimeout(250); }
    const nx = await page.$('#ov [data-a="vlgo"].primary, #ov [data-a="vlstep"][data-v="3"]');
    if (!nx) break;
    const last = await nx.evaluate(e => e.dataset.a === 'vlstep');
    await nx.click(); await page.waitForTimeout(350);
    if (last) break;
  }
  const res = await page.$eval('#ov', e => e.innerText);
  chk(who, 'values: the end screen shows a result, one idea and a next button', /Where it matches/.test(res) && /One idea/.test(res) && /Next:/.test(res), res.slice(0, 200));
  await ev(() => { try { closeSheet(); } catch (e) {} });
  /* goals: keep, rank, top 3 */
  await ev(() => ACT.draft()); await page.waitForTimeout(400);
  const keeps = (await page.$$('#ov [data-a="grkeep"]')).length;
  for (let i = 0; i < 5; i++) {
    const k = await page.$('#ov [data-a="grkeep"].ghost');
    if (!k) break;
    await k.click(); await page.waitForTimeout(350);
  }
  const kept = (await page.$eval('#ov', e => e.innerText)).match(/✓ Kept/g) || [];
  chk(who, 'goals: Keep flips to ✓ Kept, no cap', kept.length === Math.min(5, keeps) && keeps >= 4, [kept.length, keeps]);
  await page.click('#ov [data-a="grnext"]'); await page.waitForTimeout(400);
  await page.click('#ov [data-a="grdown"][data-v="0"]'); await page.waitForTimeout(300);
  await page.click('#ov [data-a="grdone"]'); await page.waitForTimeout(600);
  const G3 = await ev(() => grOrder(C()).map(g => [g.n, g.era]));
  chk(who, 'goals: top 3 are placed, the rest on Someday', G3.slice(0, 3).every(g => g[1] != null) && G3.slice(3).every(g => g[1] == null), G3);
  await ev(() => go('goals')); await page.waitForTimeout(400);
  chk(who, 'My Goals shows Working on now and Someday', /Working on now[\s\S]*Someday/.test(await page.$eval('#app', e => e.innerText)));
  await shot(page, who.replace(/\W+/g, '-') + '-goals');
}

(async () => {
  const browser = await chromium.launch();
  for (const w of WIDTHS)
    for (const P of PROFILES.filter(p => !ONLY || p.id.startsWith(ONLY))) {
      const who = P.id + ' @' + w;
      const { ctx, page, errs } = await open(browser, w);
      await page.goto(BASE + '/game/', { waitUntil: 'load' });
      await page.waitForTimeout(1200);
      let seen;
      try {
        seen = await setup(page, P, who);
        await afterSetup(page, P, who, seen);
      } catch (e) {
        chk(who, 'the walk runs', false, String(e).slice(0, 300));
        await shot(page, who.replace(/\W+/g, '-') + '-error');
      }
      chk(who, 'no console errors', errs.length === 0, errs);
      await ctx.close();
    }
  /* a signed-in player: no coach or admin rows, and the pages send the player Home */
  const stub = `(function(){const chain=()=>{const p=Promise.resolve({data:[],error:null});const o=new Proxy(function(){},{get:(t,k)=>(k==='then'?p.then.bind(p):k==='catch'?p.catch.bind(p):()=>o),apply:()=>o});return o;};
    const session={user:{id:'user-1',email:'player@example.com'}};window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session}}),onAuthStateChange:()=>{},signOut:async()=>({})},from:()=>chain(),rpc:()=>chain()})};})();`;
  for (const w of WIDTHS) {
    const { ctx, page } = await open(browser, w, stub);
    await page.goto(BASE + '/game/', { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.evaluate(() => ACT.menu && ACT.menu());
    await page.waitForTimeout(500);
    const menu = await page.evaluate(() => (document.querySelector('#ov') || document.body).innerText);
    chk('player @' + w, 'the menu has no Coach or Admin group', !/\bCoach\b[\s\S]{0,40}\d|\bAdmin\b/.test(menu) && !/Coaching session|What's built|Test with a friend/.test(menu), menu.slice(0, 200));
    for (const pg of ['coach.html', 'admin.html']) {
      await page.goto(BASE + '/game/' + pg, { waitUntil: 'load' });
      await page.waitForTimeout(1800);
      chk('player @' + w, pg + ' sends a player Home', !page.url().includes(pg), page.url());
    }
    await ctx.close();
  }
  await browser.close();
  const fails = results.filter(r => !r[2]);
  console.log('\n' + (results.length - fails.length) + ' of ' + results.length + ' checks ok');
  process.exit(bad ? 1 : 0);
})();
