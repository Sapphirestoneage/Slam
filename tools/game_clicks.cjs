/* ============================================================================
   tools/game_clicks.cjs
   PURPOSE     Count the clicks from the first screen of the game to the first plan, for two invented
               personas: a speedrun persona (the simplest answers) and the most complex persona (many
               income kinds, a household, many debts and accounts).
   USAGE       node tools/game_clicks.cjs [--trace]
   INPUT       The folder game/. No saved game.
   OUTPUT      One line for each persona: clicks to the end of setup, and clicks to the first plan
               (the Home tab with no open sheet: the one thing to do, and the count of next steps). With --trace, each click.
   DEPENDS ON  tools/game_walk/walk.cjs (the local server), the package "playwright".
   RULES       The walk taps what a person would tap: the answer of the persona when it is on the
               screen, else the button that pulses, else the main button. The count has no clicks on
               Back, on "i" or on the glossary.
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
  speedrun: ["20s", "27", "Yes", "1 to 3 months", "No", "First job", "A main job", "Steady", "I rent", "On my own", "Single by choice", "None", "No one"],
  complex: [
    "40s", "44", "No", "Less than a month", "Sometimes", "A few jobs or gigs", "A main job", "Side gigs", "My own business", "Help from family",
    "Changes month to month", "I own", "A partner", "Kids", "Parents or family", "Married", "Supporting a parent", "A partner",
    "Credit card balance", "Student loans", "Car loan", "Medical bills", "Mortgage", "Owed to family or friends",
    "Checking", "Savings", "Retirement plan at work", "IRA or Roth IRA", "HSA", "Brokerage account",
  ],
};
async function walk(browser, base, pref) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  await ctx.route("**/*", r => (r.request().url().startsWith(base) ? r.continue() : r.abort()));
  const page = await ctx.newPage(),
    used = {},
    trace = [];
  let clicks = 0,
    setupEnd = null;
  await page.goto(base + "index.html");
  for (let i = 0; i < 150; i++) {
    await page.waitForTimeout(80);
    const s = await page.evaluate(
      ([PREF, used]) => {
        const ov = document.getElementById("ov"),
          open = !!ov && ov.offsetParent !== null && ov.innerText.trim().length > 0,
          root = open ? ov : document.getElementById("app"),
          vis = e => e.offsetParent !== null && !e.disabled && !e.closest("details:not([open])"),
          q = sel => [...root.querySelectorAll(sel)].filter(vis),
          first = e => e.innerText.trim().split("\n")[0].replace(/ Likely$/, ""),
          pf = q("button").find(e => PREF.includes(first(e)) && !used[first(e)] && !/\b(on|sel)\b/.test(e.className)),
          el = pf || q(".chip.likely")[0] || q(".pulse")[0] || q("button.go")[0] || q("button.primary")[0];
        if (el) el.setAttribute("data-pick", "1");
        return {
          open,
          kind: (typeof W !== "undefined" && W && W.kind) || "",
          tab: typeof tab !== "undefined" ? tab : "",
          pf: pf ? first(pf) : null,
          text: el ? first(el) : null,
        };
      },
      [pref, used]
    );
    if (clicks > 0 && setupEnd === null && s.kind !== "setup") setupEnd = clicks;
    if (clicks > 1 && !s.open && (s.tab === "home" || s.tab === "plan")) break;
    if (!s.text) break;
    if (s.pf) used[s.pf] = 1;
    await page.click("[data-pick]");
    await page.evaluate(() => document.querySelectorAll("[data-pick]").forEach(e => e.removeAttribute("data-pick")));
    clicks++;
    trace.push(clicks + ". [" + (s.kind || s.tab) + "] " + s.text);
  }
  await ctx.close();
  return { clicks, setupEnd, trace, missed: pref.filter(x => !used[x]) };
}
(async () => {
  const srv = await serve(path.resolve(__dirname, "../game")),
    base = `http://127.0.0.1:${srv.address().port}/`,
    browser = await chromium.launch();
  for (const name of Object.keys(PERSONAS)) {
    const r = await walk(browser, base, PERSONAS[name]);
    console.log(name + ": " + r.setupEnd + " clicks to the end of setup, " + r.clicks + " clicks to the first plan" + (r.missed.length ? ". Answers that never came up: " + r.missed.join(", ") : ""));
    if (TRACE) console.log(r.trace.join("\n"));
  }
  await browser.close();
  srv.close();
})();
