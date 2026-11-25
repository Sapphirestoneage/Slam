// The walk of Live Session Mode in Chromium, as a first-time client and as the coach, at 1280 and 390 wide.
// It opens game/session.html?sim=coach and ?sim=client (a made-up call: a script plays the other side, with
// stand-ins for the database, the live link, the microphone and the AI pass). Both switches (LIVE_SESSION_READY
// and AI_PASS_READY) are turned on IN THIS TEST PAGE ONLY: the walk changes account/liveflag.js as the browser
// gets it, never the file. Nothing is sent anywhere.
// Each step checks: no console error, no sideways scroll, no "undefined" or "NaN" on the screen. It writes a
// screenshot of each step and walk.json to LIVE_WALK_OUT (default: <tmp>/slam-live-walk, never the repo).
// Run from the repository root: node tools/game_walk/live.cjs   (it serves the folder itself on a free port)
// Env: LIVE_WALK_WIDTHS=1280,390  LIVE_WALK_SIDES=coach,client
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
let chromium;
try {
  ({ chromium } = require("/opt/npm-tools/node_modules/playwright"));
} catch {
  ({ chromium } = require("playwright"));
}
const ROOT = path.join(__dirname, "..", "..");
const OUT = process.env.LIVE_WALK_OUT || path.join(os.tmpdir(), "slam-live-walk");
const WIDTHS = (process.env.LIVE_WALK_WIDTHS || "1280,390").split(",").map(Number);
const SIDES = (process.env.LIVE_WALK_SIDES || "coach,client").split(",");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
fs.mkdirSync(OUT, { recursive: true });

/* a small static server for the repository */
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
});

/* the recorder's text file of the made-up call: the lines of simScriptFill, Speaker 1 is the client */
const FILE = [
  ["Speaker 2", "Thanks for joining. How often do you get paid?"],
  ["Speaker 1", "I get paid every two weeks, about two thousand one hundred each time."],
  ["Speaker 2", "And what is your rent?"],
  ["Speaker 1", "Rent is eighteen fifty a month."],
  ["Speaker 2", "What about groceries?"],
  ["Speaker 1", "Four hundred ish, maybe 500."],
  ["Speaker 2", "Any cards with a balance?"],
  ["Speaker 1", "One card, about three thousand two hundred on it."],
  ["Speaker 1", "Checking has about twelve hundred."],
  ["Speaker 1", "Car insurance is 140 a month."],
  ["Speaker 2", "How much is in savings?"],
  ["Speaker 1", "Between 3 and 4 thousand."],
]
  .map((l, i) => l[0] + "  00:" + String(10 + i * 4).padStart(2, "0") + "\n" + l[1])
  .join("\n");

async function walk(browser, base, side, width, steps) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  page.on("console", m => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", e => errors.push(String(e)));
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: "text/javascript", body: "/* stand-in */" }));
  await page.route(/account\/liveflag\.js/, async r => {
    const body = fs
      .readFileSync(path.join(ROOT, "game/account/liveflag.js"), "utf8")
      .replace("let LIVE_SESSION_READY = false;", "let LIVE_SESSION_READY = true;")
      .replace("let AI_PASS_READY = false;", "let AI_PASS_READY = true;");
    r.fulfill({ contentType: "text/javascript", body });
  });
  const step = async (name, note) => {
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => {
      const d = document.documentElement,
        t = document.body.innerText;
      return {
        sideways: d.scrollWidth > d.clientWidth + 1,
        junk: (t.match(/.{0,30}\b(undefined|NaN)\b.{0,30}/) || [""])[0],
        small: [...document.querySelectorAll("button:not([disabled]),a.btn,label.btn")]
          .filter(b => b.offsetParent)
          .filter(b => {
            const q = b.getBoundingClientRect();
            return q.height < 43.5;
          })
          .map(b => b.textContent.trim().slice(0, 40)),
        text: t.slice(0, 4000),
      };
    });
    const file = `${side}-${width}-${String(steps.length + 1).padStart(2, "0")}-${name}.png`;
    await page.screenshot({ path: path.join(OUT, file), fullPage: true });
    steps.push({ name, note: note || "", file, sideways: r.sideways, junk: r.junk, small: r.small, errors: errors.splice(0), text: r.text });
    return r;
  };
  const tap = async (sel, opt) => {
    const el = page.locator(sel).first();
    await el.waitFor({ state: "visible", timeout: (opt && opt.timeout) || 20000 });
    await el.click();
  };
  const wait = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms || 120000 });

  await page.goto(`${base}/game/session.html?sim=${side}`);
  await wait(() => /Before you start/.test(document.body.innerText), 20000);
  await step("lobby", "the first screen of the room");
  await tap('[data-a="lrok"]');
  await tap('[data-a="lrmic"]');
  await tap('[data-a="lrhp"][data-v="1"]');
  if (side === "coach") {
    await wait(() => {
      const b = document.querySelector('[data-a="lrstart"]');
      return b && !b.disabled;
    }, 20000);
    await step("ready", "the client finished their steps: Start is on");
    await tap('[data-a="lrstart"]');
  } else await step("set", "the client's steps are done: waiting for the coach's Start");
  await wait(() => /Listening/.test((document.getElementById("lrpill") || {}).textContent || ""), 30000);
  await step("live", "the call has started");
  await page.waitForTimeout(30000);
  await step("mid-call", "half way through the made-up call");
  await page.waitForTimeout(42000);
  await step("late-call", "the end of the made-up call");
  await tap('[data-a="lrend"]');
  await step("end-ask", "End asks one time");
  await tap('[data-a="lrendyes"]');
  if (side === "coach") {
    await wait(() => /Check what was heard/.test(document.body.innerText) && /Heard \d+ things/.test(document.body.innerText), 20000);
    await step("review", "the review after End");
    await page.setInputFiles("#laifile", { name: "Voice 001.txt", mimeType: "text/plain", buffer: Buffer.from(FILE) });
    await wait(() => /is you/.test(document.body.innerText), 10000);
    await step("file", "the recorder's file is matched to the call");
    await tap('[data-a="lairun"]');
    await wait(() => /Pass 1/.test(document.body.innerText), 20000);
    await step("ai-pass", "after the AI pass (a stand-in answers)");
    const n = await page.locator("details.lsgroup").count();
    for (let i = 0; i < n; i++) {
      await page.locator("details.lsgroup > summary").nth(i).click();
      await page.waitForTimeout(150);
    }
    await step("groups-open", "each group opened");
    const all = page.locator('[data-a="rvall"]');
    while ((await all.count()) > 0) {
      const before = await page.evaluate(() => document.body.innerText.length);
      await all.first().click();
      await page.waitForTimeout(400);
      const after = await page.evaluate(() => document.body.innerText.length);
      if (before === after) break;
    }
    await step("approved", "Approve all in each group");
    await page.fill("#lai-notes", "My own words about the call.");
    await tap('[data-a="laisave"]');
    await step("notes-saved", "the notes are saved");
  } else {
    await wait(() => /Thank you for the call/.test(document.body.innerText), 20000);
    await step("thanks", "the client's screen after End");
    await tap('[data-a="lsplan"]');
    await step("plan", "Show plan");
  }
  await tap('[data-a="lvfask"]');
  await step("delete-ask", "Delete this transcript asks one time");
  await tap('[data-a="lvfyes"]');
  await wait(() => /Transcript deleted on/.test(document.body.innerText), 15000);
  await step("deleted", "the transcript is deleted");
  await page.close();
}

(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch();
  const all = [];
  let bad = 0;
  for (const side of SIDES)
    for (const width of WIDTHS) {
      const steps = [];
      try {
        await walk(browser, base, side, width, steps);
      } catch (e) {
        steps.push({ name: "STALLED", note: String(e).split("\n")[0], errors: [] });
      }
      for (const s of steps) {
        const issues = [
          s.name === "STALLED" ? "stalled: " + s.note : "",
          s.sideways ? "sideways scroll" : "",
          s.junk ? "junk: " + s.junk : "",
          (s.errors || []).length ? "console: " + s.errors.join(" | ") : "",
          (s.small || []).length ? "small taps: " + s.small.join(", ") : "",
        ].filter(Boolean);
        if (issues.length && !(issues.length === 1 && issues[0].startsWith("small taps"))) bad++;
        console.log(`${side} ${width} ${s.name.padEnd(12)} ${issues.length ? issues.join("; ") : "ok"}`);
      }
      all.push({ side, width, steps });
    }
  fs.writeFileSync(path.join(OUT, "walk.json"), JSON.stringify(all, null, 1));
  await browser.close();
  server.close();
  console.log(bad ? bad + " steps with a problem. Screenshots: " + OUT : "Each step is clean. Screenshots: " + OUT);
  process.exit(bad ? 1 : 0);
})();
