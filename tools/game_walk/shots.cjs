/* ============================================================================
   tools/game_walk/shots.cjs
   PURPOSE     Take a screenshot of each main screen of one copy of the game, at phone width (390),
               laptop width (1280) and desktop width (1440). Two copies with the same look give the
               same files, byte for byte.
   USAGE       node tools/game_walk/shots.cjs --dir <game folder> --out <folder> [--views phone390,desktop1440]
               Then compare two folders: node tools/game_walk/shotcmp.cjs old-folder new-folder
   INPUT       One copy of the folder game/. Three starts: a new player, a saved game, a household of three.
   OUTPUT      One PNG file for the first screen, for each tab, and for each sheet of the menu.
               _log.txt has one line for each file, and the errors of the page.
   DEPENDS ON  walk.cjs (the fixed clock and the local server), the package "playwright".
   RULES       The multipliers board has a coin that moves all the time. Its screenshot differs from run to run.
   ========================================================================= */
let chromium;
try {
  ({ chromium } = require("/opt/npm-tools/node_modules/playwright"));
} catch {
  ({ chromium } = require("playwright"));
}
const fs = require("fs"),
  path = require("path"),
  http = require("http");
const arg = (k, d) => {
  const i = process.argv.indexOf("--" + k);
  return i < 0 ? d : process.argv[i + 1];
};
const DIR = path.resolve(arg("dir")),
  OUT = path.resolve(arg("out"));
const { prelude } = require("./walk.cjs");
const NOW0 = Date.UTC(2026, 10, 18, 15, 0, 0);
const T = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
};
const STATES = [
  ["new", null],
  ["saved", fs.readFileSync(path.join(__dirname, "states/g_h2_h002.json"), "utf8")],
  ["house3", fs.readFileSync(path.join(__dirname, "states/c0_house3.json"), "utf8")],
];
const VIEWS = (arg("views", "") ? arg("views").split(",") : ["phone390", "desktop1440", "laptop1280"]).map(v => [
  v,
  {
    phone390: { width: 390, height: 844 },
    desktop1440: { width: 1440, height: 900 },
    laptop1280: { width: 1280, height: 800 },
  }[v],
]);
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    const f = path.join(DIR, p);
    if (!f.startsWith(DIR) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      r.writeHead(404);
      r.end("no");
      return;
    }
    r.writeHead(200, { "content-type": T[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" });
    r.end(fs.readFileSync(f));
  });
  await new Promise(res => srv.listen(0, "127.0.0.1", res));
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch({
    args: [
      "--font-render-hinting=none",
      "--disable-lcd-text",
      "--disable-font-subpixel-positioning",
      "--disable-gpu",
      "--force-color-profile=srgb",
      "--disable-partial-raster",
    ],
  });
  const log = [];
  for (const [vn, vp] of VIEWS)
    for (const [sn, st] of STATES) {
      const ctx = await browser.newContext({
        viewport: vp,
        timezoneId: "America/New_York",
        locale: "en-US",
        serviceWorkers: "block",
        deviceScaleFactor: 1,
      });
      if (st) await ctx.addInitScript("window.__STATE = " + st + ";");
      await ctx.addInitScript("(" + prelude.toString() + ")(7," + NOW0 + ");");
      await ctx.route("**/*", route => (route.request().url().startsWith(base) ? route.continue() : route.abort()));
      const page = await ctx.newPage();
      const errs = [];
      page.on("pageerror", e => errs.push(e.message));
      await page.goto(base + "index.html", { waitUntil: "load" });
      await page.addStyleTag({
        content:
          "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}",
      });
      const settle = () =>
        page.evaluate(() => {
          const P = window.__P;
          if (!P) return;
          for (let k = 0; k < 30; k++) {
            const due = P.timers.filter(t => !t.every && t.at <= P.now + 400).sort((a, b) => a.at - b.at);
            if (!due.length) break;
            for (const t of due) {
              P.timers = P.timers.filter(x => x !== t);
              P.now = Math.max(P.now, t.at);
              try {
                t.fn(...(t.args || []));
              } catch (e) {
                P.errors.push(String(e));
              }
            }
          }
        });
      let n = 0;
      const shot = async name => {
        await settle();
        await page.waitForTimeout(30);
        const file = `${vn}__${sn}__${String(n++).padStart(2, "0")}_${name}.png`;
        await page.screenshot({ path: path.join(OUT, file), fullPage: true, animations: "disabled", caret: "hide" });
        const text = await page.evaluate(() => {
          const b = document.body.cloneNode(true);
          b.querySelectorAll("script,style").forEach(x => x.remove());
          return b.innerText.length;
        });
        log.push(file + " text " + text);
      };
      await shot("load");
      const info = await page.evaluate(() => ({
        tabs: typeof UX_TABS !== "undefined" ? UX_TABS.map(x => x[0]) : [],
        menu: typeof MENU !== "undefined" ? MENU.map(m => m[1]) : [],
        demo: typeof G !== "undefined" ? !!G.demo : null,
      }));
      for (const t of info.tabs) {
        await page.evaluate(t => {
          try {
            ACT.tab({ dataset: { a: "tab", v: t } });
          } catch (e) {
            window.__P.errors.push("tab " + t + ": " + e.message);
          }
        }, t);
        await shot("tab-" + t);
      }
      for (const a of info.menu) {
        await page.evaluate(a => {
          try {
            if (typeof ACT[a] === "function") ACT[a]({ dataset: { a } });
          } catch (e) {
            window.__P.errors.push("menu " + a + ": " + e.message);
          }
        }, a);
        await shot("sheet-" + a);
        await page.evaluate(() => {
          try {
            closeSheet();
          } catch (e) {
            window.__P.errors.push("close: " + e.message);
          }
        });
        await settle();
      }
      const perr = await page.evaluate(() =>
        (window.__P ? window.__P.errors : []).concat(
          typeof ERRLOG !== "undefined" ? ERRLOG.map(r => "ERRLOG " + r.where + ": " + r.msg) : []
        )
      );
      log.push(
        `${vn} ${sn}: ${n} screens, tabs ${info.tabs.length}, menu ${info.menu.length}, demo ${info.demo}, page errors ${errs.length}, recorded errors ${perr.length}` +
          (errs.length ? " | " + errs.slice(0, 3).join(" | ") : "") +
          (perr.length ? " | " + perr.slice(0, 4).join(" | ") : "")
      );
      await ctx.close();
    }
  await browser.close();
  srv.close();
  fs.writeFileSync(path.join(OUT, "_log.txt"), log.join("\n") + "\n");
  console.log(log.filter(l => / screens, /.test(l)).join("\n"));
})();
