// The effort scoreboard (batch 14, item 8; QA.md "Effort targets"). Serve the app (python3 -m http.server 8767), then:
//   node tools/e2e/effort.cjs
// Runs Alexis and Tom (the build notes' numbers) through New client, Start session 1 (Fast Track with its tap step)
// and Walk me through, counting every action (a tap, a pick or a typed number is one action; keystrokes separately,
// QUESTIONS 232) and prints for each:
//   1. actions to a rough picture (New client to the end of the walk)
//   2. Answered and Solid after it (batch 57; the blended Picture % beside them), and core (every screen's core count) as a %
//   3. certainty after it: the FI date's range in years, or the debt-free date when FI is not on the path, or locked
//   4. an estimate of actions to 99%: every box still open on the counters (core and full detail, X of Y filled),
//      times the actions one box took in the walk
// The walk answers what the client knows (the build notes), keeps a rough or guessed number with Next, taps the usual
// insurance list and each Have it?, and presses Will get it for the rest. Env: SLAM_URL, ECHARTS; EFFORT_JSON=<file>
// also writes the numbers as JSON. Then, per client, every action in order with what it was for (EFFORT_QUIET=1 hides it).
const fs = require('fs');
const D = require('./drive.cjs');

// What each client says at a walk stop: a tap (a data-focus to click), a number to type, Next (keep), or later.
const HAVE = { Alexis: { Health: 'Have it', Life: "Don't", Disability: 'Not sure', 'Renters or home': "Don't", Car: "Don't", Umbrella: "Don't" },
  Tom: { Health: 'Have it', Life: 'Have it', Disability: 'Have it', 'Renters or home': 'Have it', Car: 'Have it', Umbrella: "Don't" } };
function answerFor(who, stop) {
  if (/\((rough|a guess)\)$/.test(stop.name)) return { keep: true };
  if (stop.typical) return { tap: 'walk:typical' }; // batch 18: the typical answer is the first tap (Use typical $X, the filing status)
  if (stop.key === 'tax:filing') return { pick: ['tax:filing', 'Single'] }; // before batch 18: no typical tap, pick it
  if (stop.key === 'add:usual-coverage') return { tap: 'add:usual-coverage', next: true };
  if (stop.field === 'have') { const type = stop.type; const v = (HAVE[who] ?? HAVE.Alexis)[type] ?? 'Not sure'; return { tap: `seg:Have it:${v}`, scoped: true }; }
  return { later: true };
}

async function walk(page, who, c) {
  let boxes = 0, landed = 0;
  const missed = [];
  const startActions = c.total;
  const where = () => page.locator('.walk-bar .walk-where').innerText().catch(() => '');
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
    c.step = `Walk "${stop.name}"`;
    if (process.env.EFFORT_DEBUG) console.log(who, i, stop.key, stop.name, JSON.stringify(a));
    const before = await where();
    boxes += 1;
    if (a.pick) { const loc = page.locator(`[data-focus="${a.pick[0]}"]`).first(); if (await D.has(loc)) { await c.pick(loc, a.pick[1]); await D.settle(page, 700); }
      if (!(await D.has(page.locator('.walk-bar'))) || (await where()) !== before) continue; }
    if (a.tap) {
      const sel = a.scoped ? `tr[data-id="${stop.id}"] [data-focus="${a.tap}"]` : `[data-focus="${a.tap}"]`;
      const loc = page.locator(sel).first();
      if (await D.has(loc)) { await c.click(loc); await D.settle(page, 700); } else if (process.env.EFFORT_DEBUG) console.log('no box for', a.tap);
      // A tap that answers the box moves the walk on by itself (batch 18); otherwise Next.
      if (!a.next && (!(await D.has(page.locator('.walk-bar'))) || (await where()) !== before)) continue;
    }
    const btn = a.later ? page.locator('.walk-bar button', { hasText: /Will get it/ }) : page.locator('.walk-bar button', { hasText: /^Next/ });
    if (a.later && !(await D.has(btn))) await c.click(page.locator('.walk-bar button', { hasText: /^Skip$/ }));
    else await c.click(btn.first());
    await D.settle(page, 700);
  }
  return { boxes, landed, missed, actions: c.total - startActions };
}

async function measure(page) {
  return page.evaluate(async (process_doc) => {
    const ref = await fetch('data/reference-2026.json').then(r => r.json());
    const [{ pictureOf, confidenceOf, fiWordsOf, unlockOf, nextSmallThings }, { metrics, debtHeroOf }, C, { profileCompletion }] = await Promise.all([import('/js/math/picture.js'), import('/js/math/metrics.js'), import('/js/completion.js'), import('/js/profile-completion.js')]);
    const { fillCounts } = C;
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
      certainty = w.high == null ? `FI ${yr(w.low)} or later (open-ended)` : `FI ${yr(w.low)} to ${yr(w.high)}: ${((w.high - w.low) / 12).toFixed(1)} years wide${w.wide ? ' (shown as "Firm up ... to see a date")' : ''}`;
    } else {
      const hero = debtHeroOf(doc, m);
      if (hero?.months != null) certainty = `debt free in ${hero.months} months (one date; FI ${m.monthsToFi.value == null ? 'not on this path yet' : 'locked'})`;
      else if (hero) certainty = 'debt free: not on this plan yet (FI locked)';
    }
    // Sensitivity (batch 18, item 4): how wide each rough input makes the headline date, moving one input at a time
    // with everything else as entered. FI: months to FI (years wide); debt free: months to debt free.
    const ofDoc = d => { const mm = metrics(d, ref, { now }); return { fi: mm.monthsToFi.value, debt: debtHeroOf(d, mm)?.months ?? null }; };
    const tweak = (fn) => { const d = structuredClone(doc); fn(d); return ofDoc(d); };
    const gutRec = d => d.records.find(r => r.kind === 'spending' && r.type === 'All in');
    const inv = d => d.records.filter(r => r.kind === 'account' && r.values.group === 'investment');
    const inc = d => d.records.filter(r => r.kind === 'income');
    const cards = d => d.records.filter(r => r.kind === 'debt');
    const rows = [];
    const row = (input, how, lo, hi) => rows.push({ input, how, lo, hi });
    const gl = gutRec(doc);
    for (const k of [0.15, 0.05]) if (gl) row(`Spending (${gl.values.pass === 'Statements' ? 'from statements' : 'gut'})`, `${k * 100}% either way`, tweak(d => { gutRec(d).amount *= 1 - k; }), tweak(d => { gutRec(d).amount *= 1 + k; }));
    if (inv(doc).some(r => (r.values.balance ?? 0) > 0)) row('Invested total (rough)', '15% either way', tweak(d => inv(d).forEach(r => { r.values.balance *= 1.15; })), tweak(d => inv(d).forEach(r => { r.values.balance *= 0.85; })));
    row('Take-home pay', '5% either way', tweak(d => inc(d).forEach(r => { r.amount *= 1.05; })), tweak(d => inc(d).forEach(r => { r.amount *= 0.95; })));
    if (cards(doc).some(r => r.values.apr == null)) row('Card APR (a guess at 25%)', '20% to 30%', tweak(d => cards(d).forEach(r => { if (r.values.apr == null) r.values.apr = 0.20; })), tweak(d => cards(d).forEach(r => { if (r.values.apr == null) r.values.apr = 0.30; })));
    const base = ofDoc(doc);
    const sens = rows.map(r => ({ ...r, fiYears: r.lo.fi != null && r.hi.fi != null ? Math.abs(r.hi.fi - r.lo.fi) / 12 : null, fiOpen: (r.lo.fi == null) !== (r.hi.fi == null), debtMonths: r.lo.debt != null && r.hi.debt != null ? Math.abs(r.hi.debt - r.lo.debt) : null, lo: undefined, hi: undefined, loD: r.lo.debt, hiD: r.hi.debt, loF: r.lo.fi, hiF: r.hi.fi }));
    const conf = confidenceOf('fi', pic, { now });
    // What is still open on the full counters, by screen (the cost of 99%), and what would raise the Picture most.
    const ctx = window.slam.ctx, debtCore = r => (C.paidInFull(r) ? ['balance'] : ['balance', 'apr']);
    const pc = profileCompletion(doc).full;
    const open = [['About you', pc.missing], ['Income', C.listCompletion(ctx, r => r.kind === 'income' || r.kind === 'benefit', ['amount']).full.missing], ['Budget', C.budgetCompletion(ctx).full.missing],
      ['Taxes', C.taxesCompletion(ctx).full.items.map(x => x.name)], ['Assets', C.listCompletion(ctx, r => r.kind === 'account' || r.kind === 'asset', r => [r.kind === 'asset' ? 'value' : 'balance']).full.missing],
      ['Debt', C.listCompletion(ctx, r => r.kind === 'debt' && r.type !== 'Credit card', debtCore).full.missing], ['Credit cards', C.listCompletion(ctx, r => r.kind === 'debt' && r.type === 'Credit card', debtCore).full.missing],
      ['Protection', C.protectionCompletion(ctx).full.missing ?? []], ['Goals', C.goalsCompletion(ctx).full.items.map(x => x.name)]].filter(([, l]) => l?.length).map(([k, l]) => `${k}: ${l.join('; ')}`);
    const gains = nextSmallThings(pic, 4).map(it => `${it.label} (${['Missing', 'Gut', 'Rough', 'Estimate', 'Actual'][[0, 25, 50, 75, 100].indexOf(it.level)] ?? it.level}, +${Math.round(it.full * 100)} points at Know it)`);
    return { open, gains, base, sens, confidence: conf ? `${conf.word} (inputs at ${Math.round(conf.avg)} of 100)` : null, picture: Math.round(pic.pct * 100), answered: Math.round(pic.answered * 100), solid: Math.round(pic.solid * 100), boxes: pic.counts, doc: process_doc ? doc : undefined, core: core.of ? Math.round(core.done / core.of * 100) : 100, coreDone: core.done, coreOf: core.of, fullLeft: full.of - full.done, fullOf: full.of, certainty, counts: counts.map(x => `${x.screen} ${x.full.done}/${x.full.of}`) };
  }, !!process.env.EFFORT_JSON);
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
  // Batch 18: a box the walk lands on takes one action (a tap, or a typed number that moves on by itself); some
  // full-detail boxes take a second (a picker, a premium's Paycheck or Month), so a box counts at least 1.5.
  const perBox = w.boxes ? Math.max(1.5, Math.round(w.actions / w.boxes * 10) / 10) : 1.5;
  const to99 = roughActions + Math.round(r.fullLeft * perBox);
  await browser.close();
  return { who, roughActions, clicks: c.clicks, typed: c.typed, keys: c.keys, log: c.log, walkBoxes: w.boxes, landed: w.landed, missed: w.missed, ...r, perBox, to99, errors: page.errors };
}

(async () => {
  const out = [];
  // EFFORT_CLIENTS=Alexis,Tom,Maya picks who runs (default Alexis and Tom, the scoreboard's two).
  const pick = (process.env.EFFORT_CLIENTS || 'Alexis,Tom').split(',').map(x => x.trim());
  for (const [who, client] of [['Alexis', D.ALEXIS], ['Tom', D.TOM], ['Maya', D.MAYA]].filter(([w]) => pick.includes(w))) out.push(await run(who, client));
  console.log('Effort scoreboard (New client, Start session 1 with Fast Track, Walk me through)');
  console.log('| Client | Actions to a rough picture | Answered and Solid after it | Core after it | Certainty after it | Actions to 99% (estimate) |');
  console.log('|---|---|---|---|---|---|');
  for (const r of out) console.log(`| ${r.who} | ${r.roughActions} (${r.clicks} taps, ${r.typed} typed; ${r.keys} keystrokes; ${r.walkBoxes} walk stops) | answered ${r.answered}% (${r.boxes.answered} of ${r.boxes.of}), solid ${r.solid}% (${r.boxes.solid} of ${r.boxes.answered}); blend ${r.picture}% | ${r.core}% (${r.coreDone} of ${r.coreOf}) | ${r.certainty} | about ${r.to99} (${r.fullLeft} of ${r.fullOf} boxes open x ${r.perBox} each) |`);
  console.log('\nSensitivity after the rough pass: one input moved at a time, everything else as entered');
  console.log('| Client | Input | Moved | FI date range | Debt-free range |');
  console.log('|---|---|---|---|---|');
  for (const r of out) for (const x of r.sens) console.log(`| ${r.who} | ${x.input} | ${x.how} | ${x.fiYears != null ? `${x.fiYears.toFixed(1)} years` : x.fiOpen ? 'open-ended' : 'n/a'} | ${x.debtMonths != null ? `${x.loD} to ${x.hiD} months (${x.debtMonths} wide)` : x.loD == null && x.hiD == null ? 'n/a' : `${x.loD ?? 'never'} to ${x.hiD ?? 'never'} months`} |`);
  for (const r of out) console.log(`  ${r.who}: what raises the Picture most now: ${r.gains.join('; ')}`);
  for (const r of out) console.log(`  ${r.who}: still open for 99%: ${r.open.join(' | ')}`);
  for (const r of out) console.log(`  ${r.who}: FI confidence ${r.confidence}; base FI ${r.base.fi ?? 'n/a'} months, debt free ${r.base.debt ?? 'n/a'} months`);
  for (const r of out) console.log(`  ${r.who}: the walk landed on a fillable box at ${r.landed} of ${r.walkBoxes} stops${r.missed.length ? ` (missed: ${r.missed.join('; ')})` : ''}. Counters: ${r.counts.join(', ')}${r.errors.length ? `; page errors: ${r.errors.join(' | ')}` : ''}`);
  if (!process.env.EFFORT_QUIET) for (const r of out) {
    console.log(`\n${r.who}: every action to a rough picture, in order`);
    for (const x of r.log) console.log(`  ${String(x.n).padStart(3)}. ${x.kind.padEnd(4)} ${x.what}${x.keys ? ` (${x.keys} keys)` : ''}`);
  }
  if (process.env.EFFORT_JSON) fs.writeFileSync(process.env.EFFORT_JSON, JSON.stringify(out, null, 2));
  process.exit(out.some(r => r.errors.length || r.missed.length) ? 1 : 0);
})();
