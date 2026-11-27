/* ============================================================================
   tools/game_clicks.cjs
   PURPOSE     Count the taps from the first screen of the game to the first number (What it is, the one
               opening since run A) and on through the rest of setup to the payoff reveal ("Here's where
               you stand"), for two invented personas: a speedrun persona (the simplest answers) and the most
               complex persona (many income kinds, a household, many debts and accounts).
   USAGE       node tools/game_clicks.cjs [--trace]
   INPUT       The folder game/. No saved game.
   OUTPUT      One line for each persona: taps to the reveal, and the answers that never came up.
               With --trace, each tap.
   DEPENDS ON  tools/game_walk/walk.cjs (the local server), the package "playwright".
   RULES       Today's setup asks one question at a time and fills in what the earlier taps already say,
               so the walk looks at the screen as a person does (the same robot as tools/e2e/door_walk.cjs):
               it taps its answer to the open question (data-k, data-v), or "That's all", or Next. A key
               with a list taps every value on the list. The count has no taps on Back, on "i" or on the
               glossary. Exit code 1 when a persona does not reach the reveal.
   ========================================================================= */
let chromium;
try {
  ({ chromium } = require("/opt/npm-tools/node_modules/playwright"));
} catch {
  ({ chromium } = require("playwright"));
}
const path = require("path");
const { serve } = require("./game_walk/walk.cjs");
const TRACE = process.argv.includes("--trace");
const PERSONAS = {
  speedrun: {
    ageDec: "20s", age: "27", work: "First job", incKinds: ["A main job"], payFreq: "Every 2 weeks", steady: "Steady",
    homeQ: "I rent", live: "On my own", rel: "Single by choice", deps: "None", share: "No one",
    debtKinds: [], accts: ["Checking"], can1k: "Yes", cover: "1 to 3 months", invest: "No",
  },
  complex: {
    ageDec: "40s", age: "44", work: "Established", incKinds: ["A main job", "Side gigs", "My own business"],
    payFreq: "Every 2 weeks", steady: "Changes month to month", homeQ: "I own", live: "A partner",
    rel: "Married", deps: "Kids", share: "A partner",
    debtKinds: ["Credit card balance", "Student loans", "Car loan", "Medical bills"],
    accts: ["Checking", "Savings", "Retirement plan at work", "IRA or Roth IRA", "HSA", "Brokerage account"],
    can1k: "No", cover: "Less than a month", invest: "Sometimes",
  },
};
async function walk(browser, base, want) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  await ctx.route("**/*", r => (r.request().url().startsWith(base) ? r.continue() : r.abort()));
  const page = await ctx.newPage(),
    trace = [],
    errs = [];
  page.on("pageerror", e => errs.push(String(e)));
  let taps = 0,
    stuck = 0,
    lastFp = null,
    reveal = false;
  await page.goto(base + "index.html");
  await page.waitForTimeout(500);
  // the landing (account/door.js) when it shows, else the welcome box's "Start my game" (no account reachable)
  const start = page.locator('#door [data-door=start], [data-a="start"].primary');
  if (await start.count()) {
    await start.first().click();
    taps++;
    trace.push("1. Start");
    await page.waitForTimeout(700);
  }
  // Run A (Nov 27 2026): the one opening of a new player, What it is / What it could be: four range chips, then the
  // first number; then its screens to the last one, and from there the rest of setup.
  let first = null,
    home = null;
  // Run SLAM-ONBOARD-1 (Nov 27 2026): What you want comes first. The fastest path is one tap: Skip for now.
  if (await page.locator("#ov [data-a=wnskip]").count()) {
    await page.locator("#ov [data-a=wnskip]").click();
    taps++;
    trace.push(taps + ". Skip for now (What you want)");
    await page.waitForTimeout(650);
  }
  if (await page.locator("#ov [data-a=cbset]").count()) {
    for (const [q, i] of want.cb || [["age", 2], ["spend", 2], ["inv", 2], ["save", 3]]) {
      await page.locator(`#ov [data-a=cbset][data-q=${q}][data-i="${i}"]`).click();
      taps++;
      trace.push(taps + ". " + q + " chip " + i);
      await page.waitForTimeout(650);
    }
    if (await page.locator("#ov [data-cbn=is]").count()) first = taps;
    /* Batch B, phase 4, and run 16: What it is, the chart, the stack, the reveal, the result (one button: Start my
       first move), then Home, where the rest of setup is (the tile of the two numbers). */
    for (const [sel, name] of [
      ["#ov [data-a=cbgo][data-v=next]", "See what it could be"],
      ["#ov [data-a=cbgo][data-v=stack]", "Next (the chart)"],
      ["#ov [data-a=cbgo][data-v=reveal]", "See where this leaves you"],
      ["#ov [data-a=cbgo][data-v=end]", "Next (the reveal)"],
      ["#ov [data-a=cbfirst]", "Start my first move (the result): Home"],
    ]) {
      await page.locator(sel).first().click();
      taps++;
      trace.push(taps + ". " + name);
      await page.waitForTimeout(1000);
    }
    home = taps;
    await page.locator('#app [data-fid="cb:homerest"]').click();
    taps++;
    trace.push(taps + ". Finish setup: five short rounds");
    await page.waitForTimeout(650);
  }
  for (let i = 0; i < 120; i++) {
    const pick = await page.evaluate(want => {
      if (typeof W === "undefined" || !W || W.kind !== "setup") return null;
      const vis = [...document.querySelectorAll("#ov .sheet button")].filter(b => b.offsetParent && !b.disabled);
      const on = b => /(^| )(on|sel)( |$)/.test(b.className);
      const mark = (b, why) => (b.setAttribute("data-robot", "1"), why);
      W.robot = W.robot || {};
      for (const b of vis) {
        const k = b.dataset.k,
          a = b.dataset.a;
        if (!k || !(k in want) || !["set", "setn", "tog", "agedec"].includes(a)) continue;
        const list = Array.isArray(want[k]) ? want[k] : null;
        if (list) {
          if (!list.includes(b.dataset.v) || on(b) || W.robot[k + "=" + b.dataset.v]) continue;
          W.robot[k + "=" + b.dataset.v] = 1;
          return mark(b, k + " + " + b.dataset.v);
        }
        const answered = vis.some(x => x.dataset.k === k && on(x)) || (W.o[k] != null && !Array.isArray(W.o[k]) && k !== "ageDec" && k !== "age") || W.robot[k];
        if (answered) continue;
        if (b.dataset.v === want[k]) {
          W.robot[k] = 1;
          return mark(b, k + " = " + b.dataset.v);
        }
      }
      const all = vis.find(b => /^That's all$/.test(b.innerText.trim()));
      if (all) return mark(all, "That's all");
      const nx = vis.find(b => ["wnext", "spnext", "spgo"].includes(b.dataset.a));
      return nx ? mark(nx, "Next (page " + (W.step + 1) + ")") : "STUCK";
    }, want);
    if (pick === null) break;
    if (pick === "STUCK") break;
    // a busy machine can draw a question late, and a Next with the question still open does nothing: when two
    // Nexts in a row leave the screen as it was, forget the robot's notes and look again
    const fp = await page.evaluate(() => (document.getElementById("ov") || document.body).innerText);
    if (/^Next/.test(pick) && fp === lastFp && /^\d+\. Next/.test(trace[trace.length - 1] || "")) {
      await page.evaluate(() => {
        document.querySelectorAll("[data-robot]").forEach(b => b.removeAttribute("data-robot"));
        W.robot = {};
      });
      await page.waitForTimeout(800);
      lastFp = null;
      if (++stuck > 6) break;
      continue;
    }
    await page.click('#ov [data-robot="1"]');
    taps++;
    trace.push(taps + ". " + pick);
    lastFp = fp;
    await page.evaluate(() => document.querySelectorAll("[data-robot]").forEach(b => b.removeAttribute("data-robot")));
    // the game ignores a second Next that comes at once, and an answer draws the next question after a moment
    await page.waitForTimeout(650);
  }
  await page.waitForTimeout(400);
  const txt = await page.evaluate(() => (document.getElementById("ov") || document.body).innerText);
  reveal = /Here's where you stand/.test(txt);
  const used = {};
  trace.forEach(t => {
    const m = /^\d+\. (\w+) [=+] (.+)$/.exec(t);
    if (m) used[m[1] + "=" + m[2]] = used[m[1]] = 1;
  });
  const missed = Object.entries(want).flatMap(([k, v]) =>
    Array.isArray(v) ? v.filter(x => !used[k + "=" + x]).map(x => k + " " + x) : used[k] ? [] : [k + " " + v]
  );
  await ctx.close();
  return { taps, first, home, reveal, trace, missed, errs };
}
(async () => {
  const srv = await serve(path.resolve(__dirname, "../game")),
    base = `http://127.0.0.1:${srv.address().port}/`,
    browser = await chromium.launch();
  let bad = 0;
  for (const name of Object.keys(PERSONAS)) {
    const r = await walk(browser, base, PERSONAS[name]);
    // Run SLAM-ONBOARD-1: 6 taps to the first number (Start, What you want, the four range chips); 5 before it.
    if (!r.reveal || r.first == null || r.first > 6) bad++;
    console.log(
      name +
        ": " +
        (r.first != null ? r.first + " taps from Start to the first number (What it is). " : "The first number did not show. ") +
        (r.home != null ? r.home + " taps from Start to Home (the result's one button). " : "") +
        (r.reveal ? r.taps + " taps from Start, through the flow and the rest of setup, to \"Here's where you stand\"" : "did not reach the reveal after " + r.taps + " taps") +
        (r.missed.length ? ". Not asked (filled in from earlier taps, or not on the setup): " + r.missed.join(", ") : "") +
        (r.errs.length ? ". Page errors: " + r.errs.slice(0, 2).join(" | ") : "")
    );
    if (TRACE) console.log(r.trace.join("\n"));
  }
  await browser.close();
  srv.close();
  process.exit(bad ? 1 : 0);
})();
