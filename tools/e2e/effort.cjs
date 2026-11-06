// The effort scoreboard (batch 14, item 8; QA.md "Effort targets"). Serve the app (python3 -m http.server 8767), then:
//   node tools/e2e/effort.cjs
// Runs Alexis and Tom (the build notes' numbers) through New client, Start session 1 (Fast Track with its tap step)
// and Walk me through, counting every click and keystroke, and prints for each:
//   1. actions to a rough picture (New client to the end of the walk)
//   2. the Picture % after it, and core (every screen's core count) as a %
//   3. certainty after it: the FI date's range in years, or the debt-free date when FI is not on the path, or locked
//   4. an estimate of actions to 99%: every box still open on the counters (core and full detail, X of Y filled),
//      times the actions one box took in the walk
// The walk answers what the client knows (the build notes), keeps a rough or guessed number with Next, taps the usual
// insurance list and each Have it?, and presses Will get it for the rest. Env: SLAM_URL, ECHARTS; EFFORT_JSON=<file>
// also writes the numbers as JSON.
const fs = require('fs');
const D = require('./drive.cjs');

// What each client says at a walk stop: a tap (a data-focus to click), a number to type, Next (keep), or later.
const HAVE = { Alexis: { Health: 'Have it', Life: "Don't", Disability: 'Not sure', 'Renters or home': "Don't", Car: "Don't", Umbrella: "Don't" },
  Tom: { Health: 'Have it', Life: 'Have it', Disability: 'Have it', 'Renters or home': 'Have it', Car: 'Have it', Umbrella: "Don't" } };
function answerFor(who, stop) {
  if (/\((rough|a guess)\)$/.test(stop.name)) return { keep: true };
  if (stop.key === 'add:usual-coverage') return { tap: 'add:usual-coverage' };
  if (stop.key === 'tax:filing') return { pick: ['tax:filing', 'Single'] };
  if (stop.field === 'have') { const type = stop.type; const v = HAVE[who][type] ?? 'Not sure'; return { tap: `seg:Have it:${v}`, scoped: true }; }
  return { later: true };
}

async function walk(page, who, c) {
  let boxes = 0, landed = 0;
  const missed = [];
  const startActions = c.total;
  for (let i = 0; i < 80; i++) {
    const bar = page.locator('.walk-bar');
    if (!(await D.has(bar))) break;
    const stop = await page.evaluate(async () => { const m = await import('/js/walk.js'); const all = m.walkStops(window.slam.ctx); const cur = document.querySelector('.walk-bar .walk-where')?.textContent || '';
      const s = all.find(x => cur.includes(x.name)) || all[0]; const r = s?.id ? window.slam.store.doc.records.find(x => x.id === s.id) : null; return s ? { ...s, type: r?.type ?? null } : null; });
    if (!stop) break;
    // Item 5's Done means: every stop lands on a fillable control (outlined or focused, enabled).
    const on = await page.evaluate(f => { const el = document.querySelector(`[data-focus="${CSS.escape(f)}"]`); const g = document.querySelector('.glow');
      return !!el && !el.disabled && (el === document.activeElement || el.contains(document.activeElement) || !!(g && (g === el || g.contains(el) || el.contains(g)))); }, stop.focus);
    if (on) landed += 1; else missed.push(stop.name);
    const a = answerFor(who, stop);
    if (process.env.EFFORT_DEBUG) console.log(who, i, stop.key, stop.name, JSON.stringify(a));
    if (a.tap) {
      const sel = a.scoped ? `tr[data-id="${stop.id}"] [data-focus="${a.tap}"]` : `[data-focus="${a.tap}"]`;
      const loc = page.locator(sel).first();
      if (await D.has(loc)) { await c.click(loc); await D.settle(page, 250); } else if (process.env.EFFORT_DEBUG) console.log("no box for", a.tap);
      if (process.env.EFFORT_DEBUG) console.log(who, stop.name, JSON.stringify(a));
    }
    if (a.pick) { const loc = page.locator(`[data-focus="${a.pick[0]}"]`).first(); if (await D.has(loc)) { await c.pick(loc, a.pick[1]); await D.settle(page, 250); } }
    boxes += 1;
    const btn = a.later ? page.locator('.walk-bar button', { hasText: /Will get it/ }) : page.locator('.walk-bar button', { hasText: /^Next/ });
    if (a.later && !(await D.has(btn))) await c.click(page.locator('.walk-bar button', { hasText: /^Skip$/ }));
    else await c.click(btn.first());
    await D.settle(page, 700);
  }
  return { boxes, landed, missed, actions: c.total - startActions };
}

async function measure(page) {
  return page.evaluate(async () => {
    const ref = await fetch('data/reference-2026.json').then(r => r.json());
    const [{ pictureOf, confidenceOf, fiWordsOf, unlockOf }, { metrics, debtHeroOf }, { fillCounts }] = await Promise.all([import('/js/math/picture.js'), import('/js/math/metrics.js'), import('/js/completion.js')]);
    const doc = window.slam.store.doc, now = new Date();
    const pic = pictureOf(doc, ref, { now });
    const m = metrics(doc, ref, { now });
    const counts = fillCounts(window.slam.ctx);
    const core = counts.reduce((s, x) => ({ done: s.done + x.core.done, of: s.of + x.core.of }), { done: 0, of: 0 });
    const full = counts.reduce((s, x) => ({ done: s.done + x.full.done, of: s.of + x.full.of }), { done: 0, of: 0 });
    let certainty = 'locked';
    if (unlockOf('fi', pic).unlocked && m.monthsToFi.value != null) {
      const w = fiWordsOf(m, confidenceOf('fi', pic, { now }), { now });
      const yr = mo => new Date(now.getFullYear(), now.getMonth() + mo, 1).getFullYear();
      certainty = w.high == null ? `FI ${yr(w.low)} or later (open-ended)` : `FI ${yr(w.low)} to ${yr(w.high)}: ${((w.high - w.low) / 12).toFixed(1)} years wide${w.wide ? ' (shown as "Add ... to see a date")' : ''}`;
    } else {
      const hero = debtHeroOf(doc, m);
      if (hero?.months != null) certainty = `debt free in ${hero.months} months (one date; FI ${m.monthsToFi.value == null ? 'not on this path yet' : 'locked'})`;
      else if (hero) certainty = 'debt free: not on this plan yet (FI locked)';
    }
    return { picture: Math.round(pic.pct * 100), core: core.of ? Math.round(core.done / core.of * 100) : 100, coreDone: core.done, coreOf: core.of, fullLeft: full.of - full.done, fullOf: full.of, certainty, counts: counts.map(x => `${x.screen} ${x.full.done}/${x.full.of}`) };
  });
}

async function run(who, client) {
  const { browser, page } = await D.launch();
  const c = D.counter(page);
  await D.newClient(page, client, c);
  const { c: c2 } = await D.fastTrack(page, client, c);
  const walkBtn = page.locator('.ft-box button', { hasText: /Walk me through/ });
  await c2.click(walkBtn); await D.settle(page, 1200);
  const w = await walk(page, who, c);
  const roughActions = c.total;
  const r = await measure(page);
  const perBox = w.boxes ? Math.max(2, Math.round(w.actions / w.boxes * 10) / 10) : 2;
  const to99 = roughActions + Math.round(r.fullLeft * perBox);
  await browser.close();
  return { who, roughActions, clicks: c.clicks, keys: c.keys, walkBoxes: w.boxes, landed: w.landed, missed: w.missed, ...r, perBox, to99, errors: page.errors };
}

(async () => {
  const out = [];
  for (const [who, client] of [['Alexis', D.ALEXIS], ['Tom', D.TOM]]) out.push(await run(who, client));
  console.log('Effort scoreboard (New client, Start session 1 with Fast Track, Walk me through)');
  console.log('| Client | Actions to a rough picture | Picture after it | Core after it | Certainty after it | Actions to 99% (estimate) |');
  console.log('|---|---|---|---|---|---|');
  for (const r of out) console.log(`| ${r.who} | ${r.roughActions} (${r.clicks} clicks, ${r.keys} keys; ${r.walkBoxes} walk stops) | ${r.picture}% | ${r.core}% (${r.coreDone} of ${r.coreOf}) | ${r.certainty} | about ${r.to99} (${r.fullLeft} of ${r.fullOf} boxes open x ${r.perBox} each) |`);
  for (const r of out) console.log(`  ${r.who}: the walk landed on a fillable box at ${r.landed} of ${r.walkBoxes} stops${r.missed.length ? ` (missed: ${r.missed.join('; ')})` : ''}. Counters: ${r.counts.join(', ')}${r.errors.length ? `; page errors: ${r.errors.join(' | ')}` : ''}`);
  if (process.env.EFFORT_JSON) fs.writeFileSync(process.env.EFFORT_JSON, JSON.stringify(out, null, 2));
  process.exit(out.some(r => r.errors.length || r.missed.length) ? 1 : 0);
})();
