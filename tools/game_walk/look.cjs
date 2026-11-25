/* tools/game_walk/look.cjs: screenshots of chosen screens of the game, for a look review.
   USAGE  node tools/game_walk/look.cjs --dir game --out /tmp/look --state saved --views phone390,desktop1440
          --steps steps.json   (a list of [name, "javascript run in the page before the shot"])
   The page runs with the same fixed clock and seed as shots.cjs. Nothing is written to the repository. */
let chromium;
try {
  ({ chromium } = require("/opt/npm-tools/node_modules/playwright"));
} catch (e) {
  ({ chromium } = require("playwright"));
}
const fs = require("fs"),
  path = require("path"),
  http = require("http");
const arg = (k, d) => {
  const i = process.argv.indexOf("--" + k);
  return i < 0 ? d : process.argv[i + 1];
};
const DIR = path.resolve(arg("dir", "game")),
  OUT = path.resolve(arg("out", "/tmp/look"));
const { prelude } = require("./walk.cjs");
const NOW0 = Date.UTC(2026, 10, 18, 15, 0, 0);
const ST = { saved: "states/g_h2_h002.json", house3: "states/c0_house3.json" };
const stName = arg("state", "saved");
const state = ST[stName] ? fs.readFileSync(path.join(__dirname, ST[stName]), "utf8") : null;
const steps = JSON.parse(fs.readFileSync(arg("steps"), "utf8"));
const SIZES = { phone390: [390, 844], laptop1280: [1280, 800], desktop1440: [1440, 900] };
const T = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".css": "text/css", ".png": "image/png" };
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    const f = path.join(DIR, p);
    if (!f.startsWith(DIR) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.writeHead(404), r.end("no");
    r.writeHead(200, { "content-type": T[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" });
    r.end(fs.readFileSync(f));
  });
  await new Promise(res => srv.listen(0, "127.0.0.1", res));
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch({ args: ["--disable-gpu", "--force-color-profile=srgb"] });
  const errs = [];
  for (const vn of arg("views", "phone390").split(",")) {
    const [w, h] = SIZES[vn];
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, timezoneId: "America/New_York", locale: "en-US", serviceWorkers: "block" });
    if (state) await ctx.addInitScript("window.__STATE = " + state + ";");
    await ctx.addInitScript("(" + prelude.toString() + ")(7," + NOW0 + ");");
    await ctx.route("**/*", route => (route.request().url().startsWith(base) ? route.continue() : route.abort()));
    const page = await ctx.newPage();
    page.on("pageerror", e => errs.push(vn + ": " + e.message));
    await page.goto(base + "index.html", { waitUntil: "load" });
    await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" });
    for (const [name, js] of steps) {
      try {
        await page.evaluate(js);
      } catch (e) {
        errs.push(vn + " " + name + ": " + e.message);
      }
      await page.waitForTimeout(60);
      await page.screenshot({ path: path.join(OUT, `${vn}__${name}.png`), fullPage: true });
    }
    await ctx.close();
  }
  await browser.close();
  srv.close();
  console.log(errs.length ? "ERRORS\n" + errs.join("\n") : "no page errors");
})();
