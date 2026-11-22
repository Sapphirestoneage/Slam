/* ============================================================================
   tools/game_walk/walk.cjs
   PURPOSE     Prove that two copies of SLAM the Game behave the same (a golden-master check).
               The tool loads one copy in a real browser and taps buttons at random, with a fixed
               seed. After each tap it records one hash of the page text, the page marks, the
               saved data and the address. Two copies with the same behavior give the same record.
   USAGE       node tools/game_walk/walk.cjs --dir <game folder> --out <file.json>
                 [--seeds 1-14]            The walks to do. Each seed is one walk.
                 [--steps 150]             The number of taps in each walk.
                 [--variant plain|supa]    supa: with a stand-in for the Supabase library (sign-in, cloud save).
                 [--states <folder>]       Saved games for the start of the walks (tools/game_walk/states).
                 [--dump seed:step]        Write the full page text at that step to <out>.dump.html.
               Then compare two records: node tools/game_walk/cmp.cjs old.json new.json
   INPUT       One copy of the folder game/. The tool serves it on a local port.
   OUTPUT      One JSON file with the record of each walk.
   DEPENDS ON  The package "playwright" with its Chromium browser. It is not in package.json.
               Install it one time: npm install --no-save playwright && npx playwright install chromium
   RULES       The clock, the random numbers and the timers are fixed, so each run gives the same record.
               Requests to other hosts are stopped. Script tags are not part of the hash, so a new
               script file, a new folder or a version stamp does not change the record.
               README.md in this folder tells how to compare two commits.
   ========================================================================= */
const fs = require("fs"),
  path = require("path"),
  http = require("http");
let chromium;
try {
  ({ chromium } = require("/opt/npm-tools/node_modules/playwright"));
} catch {
  ({ chromium } = require("playwright"));
}

const arg = (k, d) => {
  const i = process.argv.indexOf("--" + k);
  return i < 0 ? d : process.argv[i + 1];
};
const DIR = path.resolve(arg("dir", "."));
const OUT = arg("out", path.join(require("os").tmpdir(), "walk.json"));
const VARIANT = arg("variant", "plain");
const STEPS = +arg("steps", 150);
const seedSpec = arg("seeds", "1-10");
const SEEDS = seedSpec.includes("-")
  ? (() => {
      const [a, b] = seedSpec.split("-").map(Number);
      return Array.from({ length: b - a + 1 }, (_, i) => a + i);
    })()
  : seedSpec.split(",").map(Number);
const DUMP = arg("dump", "");
const SHOTS = +arg("shots", 0);
const PAGE = arg("page", "index.html");
const NOW0 = Date.UTC(2026, 10, 22, 15, 0, 0);
const STATES = arg("states", "")
  ? fs
      .readdirSync(arg("states"))
      .filter(f => f.endsWith(".json"))
      .sort()
      .map(f => [f, fs.readFileSync(path.join(arg("states"), f), "utf8")])
  : [];
const HARVEST = arg("harvest", "");
const COVER = arg("cover", "");
const FINALE = arg("finale", "1") === "1";
const cover = {};

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".css": "text/css",
};
function serve(dir) {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split("?")[0]);
      if (p.endsWith("/")) p += "index.html";
      const f = path.join(dir, p);
      if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        r.writeHead(404);
        r.end("no");
        return;
      }
      r.writeHead(200, {
        "content-type": TYPES[path.extname(f)] || "application/octet-stream",
        "cache-control": "no-store",
      });
      r.end(fs.readFileSync(f));
    });
    srv.listen(0, "127.0.0.1", () => res(srv));
  });
}

/* Runs in the page before all page scripts. */
function prelude(SEED, NOW0) {
  if (window.__P) return;
  let carried = null;
  try {
    carried = JSON.parse(window.name || "null");
  } catch (e) {}
  const P = (window.__P = {
    now: carried && carried.now ? carried.now : NOW0,
    errors: [],
    timers: [],
    tid: 1,
    frames: [],
  });
  let s = (carried && carried.rs != null ? carried.rs : SEED * 2654435761) >>> 0;
  Math.random = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  P.rs = () => s;
  const RD = Date;
  class FD extends RD {
    constructor(...a) {
      if (a.length) super(...a);
      else super(P.now);
    }
    static now() {
      return P.now;
    }
  }
  window.Date = FD;
  if (window.performance) {
    try {
      window.performance.now = () => P.now - NOW0;
    } catch (e) {}
  }
  P.real = window.setTimeout.bind(window);
  window.setTimeout = (fn, ms, ...args) => {
    const id = P.tid++;
    if (typeof fn === "function") P.timers.push({ id, at: P.now + (+ms || 0), fn, args });
    return id;
  };
  window.clearTimeout = id => {
    P.timers = P.timers.filter(t => t.id !== id);
  };
  window.setInterval = (fn, ms, ...args) => {
    const id = P.tid++;
    P.timers.push({ id, at: P.now + (+ms || 0), fn, args, every: Math.max(50, +ms || 0) });
    return id;
  };
  window.clearInterval = window.clearTimeout;
  P.advance = ms => {
    const end = P.now + ms;
    let guard = 0;
    for (;;) {
      const due = P.timers.filter(t => t.at <= end).sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!due || ++guard > 400) break;
      P.now = Math.max(P.now, due.at);
      if (due.every) due.at = end + due.every;
      else P.timers = P.timers.filter(t => t !== due);
      try {
        due.fn(...due.args);
      } catch (e) {
        P.errors.push("timer: " + (e && e.message));
      }
    }
    P.now = end;
  };
  window.addEventListener("error", e => {
    P.errors.push("error: " + (e.message || ""));
  });
  window.addEventListener("unhandledrejection", e => {
    P.errors.push("reject: " + ((e.reason && e.reason.message) || e.reason));
  });
  try {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.resolve(), readText: () => Promise.resolve("") },
      configurable: true,
    });
  } catch (e) {}
  try {
    navigator.vibrate = () => true;
  } catch (e) {}
  window.prompt = () => null;
  window.confirm = () => true;
  window.alert = () => {};
  /* History: count the moves that are not finished, so the walk can wait for each one. */
  P.pend = 0;
  P.depth = 0;
  const hb = history.back.bind(history),
    hp = history.pushState.bind(history);
  history.pushState = (...a) => {
    P.depth++;
    return hp(...a);
  };
  history.back = () => {
    if (P.depth <= 0) return;
    P.depth--;
    P.pend++;
    hb();
  };
  history.go = () => {};
  history.forward = () => {};
  window.addEventListener(
    "popstate",
    () => {
      if (P.pend > 0) P.pend--;
    },
    true
  );
  /* A saved game for the start of the walk. */
  try {
    if (window.__STATE && !carried && !localStorage.getItem("__seeded")) {
      Object.keys(window.__STATE).forEach(k => localStorage.setItem(k, window.__STATE[k]));
      localStorage.setItem("__seeded", "1");
    }
  } catch (e) {}
  /* Record each change of the main screen while the page loads. */
  const h = str => {
    let h1 = 0xdeadbeef,
      h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  };
  P.hash = h;
  /* Record each write to the main parts of the screen while the page loads. */
  P.frames = [];
  P.loading = true;
  try {
    const desc = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
    Object.defineProperty(Element.prototype, "innerHTML", {
      configurable: true,
      enumerable: desc.enumerable,
      get: desc.get,
      set(v) {
        desc.set.call(this, v);
        if (P.loading && (this.id === "app" || this.id === "ov" || this.id === "tabs"))
          P.frames.push(this.id + ":" + h(String(v)));
      },
    });
    window.addEventListener("load", () => {
      P.loading = false;
    });
  } catch (e) {}
}

/* A stand-in for the Supabase library. It keeps its tables in localStorage, so a reload keeps the data. */
function fakeSupabase() {
  const KEYDB = "__fakedb";
  const load = () => {
    try {
      return JSON.parse(localStorage.getItem(KEYDB) || "{}");
    } catch (e) {
      return {};
    }
  };
  const store = db => {
    try {
      localStorage.setItem(KEYDB, JSON.stringify(db));
    } catch (e) {}
  };
  function builder(table) {
    const st = { op: "select", filters: [], payload: null, single: null, limit: null, order: null };
    const api = {
      select() {
        return api;
      },
      insert(o) {
        st.op = "insert";
        st.payload = o;
        return api;
      },
      update(o) {
        st.op = "update";
        st.payload = o;
        return api;
      },
      upsert(o) {
        st.op = "upsert";
        st.payload = o;
        return api;
      },
      delete() {
        st.op = "delete";
        return api;
      },
      eq(k, v) {
        st.filters.push(r => r[k] === v);
        return api;
      },
      neq(k, v) {
        st.filters.push(r => r[k] !== v);
        return api;
      },
      in(k, a) {
        st.filters.push(r => a.includes(r[k]));
        return api;
      },
      is(k, v) {
        st.filters.push(r => (r[k] == null ? null : r[k]) === v);
        return api;
      },
      gt(k, v) {
        st.filters.push(r => r[k] > v);
        return api;
      },
      gte(k, v) {
        st.filters.push(r => r[k] >= v);
        return api;
      },
      lt(k, v) {
        st.filters.push(r => r[k] < v);
        return api;
      },
      lte(k, v) {
        st.filters.push(r => r[k] <= v);
        return api;
      },
      match(o) {
        Object.keys(o).forEach(k => st.filters.push(r => r[k] === o[k]));
        return api;
      },
      not() {
        return api;
      },
      or() {
        return api;
      },
      filter() {
        return api;
      },
      order(k, o) {
        st.order = [k, !(o && o.ascending === false)];
        return api;
      },
      limit(n) {
        st.limit = n;
        return api;
      },
      range() {
        return api;
      },
      single() {
        st.single = "one";
        return api;
      },
      maybeSingle() {
        st.single = "maybe";
        return api;
      },
      then(res, rej) {
        return Promise.resolve().then(run).then(res, rej);
      },
    };
    function run() {
      const db = load();
      const rows = (db[table] = db[table] || []);
      const hit = r => st.filters.every(f => f(r));
      let out;
      if (st.op === "insert" || st.op === "upsert") {
        const list = Array.isArray(st.payload) ? st.payload : [st.payload];
        out = list.map(o => {
          const r = Object.assign({ id: table + "-" + (rows.length + 1) }, o);
          rows.push(r);
          return r;
        });
        store(db);
      } else if (st.op === "update") {
        out = rows.filter(hit);
        out.forEach(r => Object.assign(r, st.payload));
        store(db);
      } else if (st.op === "delete") {
        out = rows.filter(hit);
        db[table] = rows.filter(r => !hit(r));
        store(db);
      } else out = rows.filter(hit);
      out = out.map(r => JSON.parse(JSON.stringify(r)));
      if (st.order)
        out.sort(
          (a, b) =>
            (a[st.order[0]] < b[st.order[0]] ? -1 : a[st.order[0]] > b[st.order[0]] ? 1 : 0) * (st.order[1] ? 1 : -1)
        );
      if (st.limit != null) out = out.slice(0, st.limit);
      if (st.single)
        return out.length
          ? { data: out[0], error: null }
          : { data: null, error: st.single === "one" ? { message: "no rows" } : null };
      return { data: out, error: null };
    }
    return api;
  }
  const session = { user: { id: "user-1", email: "player@example.com" } };
  window.supabase = {
    createClient: () => ({
      auth: {
        getSession: () => Promise.resolve({ data: { session }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signOut: () => Promise.resolve({ error: null }),
        updateUser: () => Promise.resolve({ error: null }),
        resetPasswordForEmail: () => Promise.resolve({ error: null }),
        signUp: () => Promise.resolve({ data: { session }, error: null }),
        signInWithPassword: () => Promise.resolve({ data: { session }, error: null }),
        getUser: () => Promise.resolve({ data: { user: session.user }, error: null }),
      },
      from: builder,
      rpc: fn => Promise.resolve({ data: fn === "is_admin" ? false : null, error: null }),
      channel: () => {
        const c = { on: () => c, subscribe: () => c, unsubscribe: () => {} };
        return c;
      },
      removeChannel: () => {},
      functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    }),
  };
}

/* Runs in the page after it is loaded: one part of a walk. */
async function driver({ steps, seed, from, dumpAt, avoid, greedy, last, setup }) {
  const P = window.__P,
    hash = P.hash;
  let s = ((seed * 40503 + 977) ^ (from * 7919)) >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const settle = () =>
    new Promise(r => {
      const ch = new MessageChannel();
      ch.port1.onmessage = () => r();
      ch.port2.postMessage(0);
    });
  const realWait = ms => new Promise(r => P.real(r, ms));
  /* Wait until each move in the browser history is finished. */
  const drain = async () => {
    await settle();
    for (let t = 0; P.pend > 0 && t < 250; t++) await realWait(4);
    if (P.pend > 0) {
      P.errors.push("history move did not finish");
      P.pend = 0;
    }
    await settle();
  };
  const ls = () => {
    const o = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      o.push(k + "=" + localStorage.getItem(k));
    }
    return o.sort().join("\n");
  };
  /* The page text with no script tags: a new script file, a new folder or a version stamp must not change the record. */
  const body = () => document.body.innerHTML.replace(/<script\b[^>]*>[\s\S]*?<\/script>\s*/g, "");
  const snap = () =>
    hash(body()) +
    "." +
    hash(document.body.className + "|" + JSON.stringify(Object.assign({}, document.body.dataset))) +
    "." +
    hash(ls()) +
    "." +
    location.hash;
  const counts = (window.__counts = window.__counts || {});
  const out = [],
    seen = (window.__seen = window.__seen || {});
  const VALS = [
    "",
    "0",
    "7",
    "45",
    "300",
    "1200",
    "2500",
    "64000",
    "Sam",
    "Rent and food",
    "3.5",
    "-20",
    "2027-03-01",
    "abc",
  ];
  let dump = null;
  for (let i = 0; i < steps; i++) {
    const n = from + i,
      r = rnd();
    let desc = "";
    try {
      if (r < 0.03) {
        P.advance(7000);
        desc = "wait7s";
      } else if (r < 0.04) {
        P.advance(26 * 3600e3);
        desc = "wait26h";
      } else if (r < 0.055) {
        desc = "back" + (P.depth > 0 ? "" : " skipped");
        history.back();
      } else if (r < 0.13) {
        const els = [...document.querySelectorAll("input,textarea,select")].filter(
          e => !e.disabled && !e.closest("#su-gate")
        );
        if (els.length) {
          const el = els[Math.floor(rnd() * els.length)];
          if (el.tagName === "SELECT") {
            const o = el.options;
            if (o.length) el.selectedIndex = Math.floor(rnd() * o.length);
          } else if (el.type === "checkbox" || el.type === "radio") el.checked = !el.checked;
          else if (el.type === "range")
            el.value = String(Math.round((+el.min || 0) + rnd() * ((+el.max || 100) - (+el.min || 0))));
          else if (el.type === "file") {
          } else el.value = VALS[Math.floor(rnd() * VALS.length)];
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          desc = "input " + (el.id || el.dataset.k || el.dataset.a || el.name || el.type) + "=" + el.value;
        } else desc = "input none";
      } else if (
        setup &&
        n < 110 &&
        (() => {
          /* The setup style: in an open sheet, answer the first question that has no answer, else go on with the main button. */
          const sh = document.querySelector("#ov .sheet");
          if (!sh) {
            const st = document.querySelector('[data-a="start"]');
            if (st && rnd() < 0.9) {
              st.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
              desc = "setup tap start";
              return true;
            }
            return false;
          }
          const fields = [...sh.querySelectorAll(".field, details.fld[open]")];
          for (const f of fields) {
            const chips = [...f.querySelectorAll("button.chip, button.rowbtn, .seg button")].filter(
              b => !b.disabled && b.offsetParent !== null
            );
            if (chips.length && !chips.some(b => b.classList.contains("on") || b.classList.contains("sel"))) {
              const b = chips[Math.floor(rnd() * chips.length)];
              b.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
              desc = "setup pick " + (b.dataset.a || "") + ":" + String(b.dataset.v || "").slice(0, 20);
              return true;
            }
          }
          const go = [...sh.querySelectorAll('button.go, button.primary, [data-a="fldgo"], [data-a="wnext"]')].filter(
            b => !b.disabled && b.offsetParent !== null
          );
          if (go.length) {
            const b = go[Math.floor(rnd() * Math.min(2, go.length))];
            b.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            desc = "setup go " + (b.dataset.a || "") + ":" + String(b.dataset.v || "").slice(0, 20);
            return true;
          }
          return false;
        })()
      ) {
      } else {
        const els = [...document.querySelectorAll("[data-a],summary")].filter(
          e => !e.disabled && !(avoid || []).includes(e.dataset.a) && !e.closest("#su-gate")
        );
        if (els.length) {
          const w = els.map(e => {
            const k = e.dataset.a || "summary",
              c = e.classList;
            return (
              ((c.contains("go") ? (greedy ? 60 : 6) : c.contains("primary") ? (greedy ? 20 : 3) : 1) *
                (k === "close" || k === "navclose" || k === "navback" || k === "tab" || k === "menu"
                  ? greedy
                    ? 0.05
                    : 0.35
                  : 1)) /
              Math.pow(1 + (counts[k] || 0), greedy ? 0.5 : 1.5)
            );
          });
          const tot = w.reduce((a, b) => a + b, 0);
          let x = rnd() * tot,
            j = 0;
          for (; j < els.length - 1; j++) {
            x -= w[j];
            if (x <= 0) break;
          }
          const el = els[j],
            k = el.dataset.a || "summary";
          counts[k] = (counts[k] || 0) + 1;
          seen[k] = 1;
          desc =
            "tap " +
            k +
            (el.dataset.v != null ? ":" + String(el.dataset.v).slice(0, 24) : "") +
            (el.dataset.k != null ? ":" + String(el.dataset.k).slice(0, 16) : "");
          el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        } else desc = "tap none";
      }
    } catch (e) {
      desc += " THROW " + (e && e.message);
    }
    await settle();
    for (let t = 0; P.pend > 0 && t < 200; t++) await realWait(4);
    if (P.pend > 0) {
      P.errors.push("history move did not finish");
      P.pend = 0;
    }
    await settle();
    P.advance(300);
    await settle();
    for (let t = 0; P.pend > 0 && t < 200; t++) await realWait(4);
    await settle();
    const errs = P.errors.splice(0);
    out.push(n + " " + desc + " " + snap() + (errs.length ? " E:" + errs.join(";").slice(0, 300) : ""));
    if (dumpAt === n) dump = body() + "\n<!-- class: " + document.body.className + " -->\n<!-- ls:\n" + ls() + "\n-->";
  }
  if (last) {
    /* The end of the walk. Part 1: call each replaced function directly, for each profile. */
    const pr = (name, fn) => {
      let r;
      try {
        r = fn();
        r = typeof r === "string" ? r : JSON.stringify(r);
      } catch (e) {
        r = "THROW " + (e && e.message);
      }
      out.push("probe " + name + " " + hash(String(r)));
    };
    let n = 0,
      act0 = 0;
    try {
      n = G.chars.length;
      act0 = G.active;
    } catch (e) {}
    for (let i = 0; i < Math.min(n, 4); i++) {
      let c, d;
      pr("p" + i + " derive", () => {
        G.active = i;
        c = C();
        d = D = derive(c);
        return d;
      });
      if (!c || !d) continue;
      pr("nextStep", () => nextStep(c, d));
      pr("unfinished", () => unfinished(c, d));
      for (let e = 0; e <= 10; e++) pr("eraSteps" + e, () => eraSteps(c, d, e));
      pr("nodes", () =>
        NODES.map(x => x.id)
          .concat(typeof ES !== "undefined" ? ES.map(x => x.id) : [])
          .map(id => nodeTitle(id) + "|" + nodeMax(id) + "|" + nodeRankRaw(c, d, id))
          .join(";")
      );
      pr("fogPct", () => fogPct(c, d));
      pr("fogPct1", () => fogPct(c));
      pr("campCard", () => campCard(c, d));
      pr("msSide", () => msSide(c, d));
      pr("msBoard", () => msBoard(c, d));
      pr("monthsAhead", () => monthsAhead(c, d, todayISO(), 6));
      pr("monthsAhead0", () => monthsAhead(c, d));
      pr("cspMoneyRows", () => cspMoneyRows(c, d));
      pr("plReady", () => plReady(c));
      pr("ledRow", () =>
        ["incs", "spends", "cashes", "invs", "debts"]
          .map(sec => (c[sec] || []).map((x, j) => ledRow(sec, j, x)).join(""))
          .join("|")
      );
      pr("cpMoves", () => {
        W = { kind: "compare", picks: MOVES.slice(0, 6).map(m => m.id) };
        return cpMoves(c);
      });
      pr("rvText", () => rvText(c, d));
      pr("tgText", () => tgText(c));
      pr("bkText", () => bkText(c, bkSync(c, d)));
      pr("knAskBody", () =>
        Object.keys(KN_ASK)
          .map(k => {
            W = { kind: "metric", o: {} };
            return knAskBody(c, k);
          })
          .join("|")
      );
      pr("dbOneBody", () =>
        (c.debts || [])
          .map((x, j) =>
            [null, 0, 1, 2, 3, 9]
              .map(st => {
                W = { kind: "dbone", i: j, step: st };
                return dbOneBody(c, j);
              })
              .join("~")
          )
          .join("|")
      );
      pr(
        "q",
        () =>
          q("How well did you do with money today?", '<button class="chip on" data-a="tog">A</button>', "help") +
          q("Plain", "<i>x</i>")
      );
      pr("nv", () => nvRow("") + nvRow("x") + nvText('<div class="overlay"><div class="sheet stack">x</div></div>'));
      for (const t of ["home", "map", "play", "money", "goals", "me", "plan"])
        pr("tab " + t, () => {
          W = null;
          SH = null;
          tab = t;
          render();
          return body();
        });
      pr("tabfns", () => {
        tab = "home";
        return [home(), moneyTab(), planTab(), meTab(), playTab()].join("<!---->");
      });
      pr("sheets", () =>
        [
          "safeSheet",
          "flowSheet",
          "menuSheet",
          "movesSheet",
          "reviewSheet",
          "gamesSheet",
          "paySheet",
          "chartSheet",
          "dbSheet",
          "fdSheet",
          "l1Sheet",
          "partySheet",
          "sharpSheet",
          "bkSheet",
          "profSheet",
          "setupSheet",
          "knOne",
        ]
          .map(f => {
            for (const w of [
              null,
              {},
              { kind: "x", o: {}, tab: "moves", step: 0, q: "low", mode: "edit" },
              { kind: "drills", o: C(), step: "party", q: "match", mode: "new", just: 1 },
            ]) {
              W = w;
              try {
                return f + "=" + window.eval(f)();
              } catch (e) {}
            }
            return f + "=none";
          })
          .join("<!---->")
      );
      await settle();
    }
    try {
      G.active = act0;
      W = null;
      SH = null;
      tab = "home";
      render();
    } catch (e) {}
    await drain();
    P.advance(300);
    await drain();
    P.errors.splice(0);
    /* Part 1b: finish the setup directly, in five ways. */
    for (const [mode, extra] of [
      ["edit", {}],
      ["edit", { later: "accts" }],
      ["new", { taps: 9 }],
      ["new", { taps: 4, speed: true }],
      ["new", { taps: 2, add: true }],
    ]) {
      try {
        if (SH) closeSheet();
      } catch (e) {}
      await drain();
      P.advance(300);
      await drain();
      pr("setup " + mode + " " + JSON.stringify(extra), () => {
        openSetup(mode);
        Object.assign(W, extra);
        if (mode === "new")
          Object.assign(W.o, {
            name: "Zed" + G.chars.length,
            age: 33,
            ageDec: "30s",
            work: "First job",
            incKinds: ["A main job"],
            payFreq: "Every 2 weeks",
            steady: "Steady",
            homeQ: Object.keys(HOMEMAP)[0],
            live: ["On my own"],
            rel: "Single, seeking",
            deps: "None",
            share: "No one",
            accts: ["Checking"],
            can1k: "No",
            cover: "Less than a month",
            invest: "No",
          });
        let h = "";
        for (const st of [0, 1, 2, 3, 4, 5]) {
          W.step = st;
          try {
            h += setupSheet();
          } catch (e) {
            h += "THROW " + e.message;
          }
        }
        finishSetup();
        return h + body() + "|" + JSON.stringify(G);
      });
      await drain();
      P.advance(300);
      await drain();
      const er = P.errors.splice(0);
      if (er.length) out.push("probe setup errors " + er.join(";").slice(0, 200));
    }
    try {
      if (SH) closeSheet();
    } catch (e) {}
    await drain();
    P.advance(300);
    await drain();
    try {
      W = null;
      SH = null;
      tab = "home";
      render();
    } catch (e) {}
    await drain();
    P.advance(300);
    await drain();
    P.errors.splice(0);
    /* Part 2: send each action one time with an empty value, then one time with the value "0". */
    let names = [];
    try {
      names = Object.keys(ACT)
        .sort()
        .filter(a => !(avoid || []).includes(a) && a !== "reset");
    } catch (e) {}
    for (const v of ["", "0"])
      for (const a of names) {
        let r = "";
        try {
          ACT[a]({
            dataset: { a, v, k: v ? "spends" : "" },
            value: "5",
            disabled: false,
            closest: () => null,
            classList: { contains: () => false, add() {}, remove() {}, toggle() {} },
            getAttribute: () => null,
          });
        } catch (e) {
          r = " THROW " + (e && e.message);
        }
        await settle();
        for (let t = 0; P.pend > 0 && t < 200; t++) await realWait(4);
        P.pend = 0;
        P.advance(50);
        await settle();
        for (let t = 0; P.pend > 0 && t < 200; t++) await realWait(4);
        const errs = P.errors.splice(0);
        out.push(
          "act " +
            a +
            ":" +
            v +
            r.slice(0, 120) +
            " " +
            snap() +
            (errs.length ? " E:" + errs.join(";").slice(0, 200) : "")
        );
      }
  }
  window.name = JSON.stringify({ now: P.now + 1000, rs: P.rs() });
  let acts = [];
  try {
    acts = Object.keys(ACT);
  } catch (e) {}
  return { out, dump, seen: Object.keys(seen), acts };
}

module.exports = { prelude, serve, fakeSupabase };

if (require.main === module)
  (async () => {
    const srv = await serve(DIR),
      port = srv.address().port,
      base = `http://127.0.0.1:${port}/`;
    const browser = await chromium.launch({ headless: true });
    const result = { dir: DIR, variant: VARIANT, steps: STEPS, walks: {}, frames: {}, seen: {}, acts: {} };
    const fake = "(" + fakeSupabase.toString() + ")();";
    const [dSeed, dStep] = DUMP ? DUMP.split(":").map(Number) : [null, null];
    for (const seed of SEEDS) {
      const wide = seed % 3 === 0;
      const ctx = await browser.newContext({
        viewport: wide ? { width: 1440, height: 900 } : { width: 390, height: 844 },
        timezoneId: "America/New_York",
        locale: "en-US",
        serviceWorkers: "block",
      });
      /* A walk in the setup style starts with no saved game, or the sample game, or a person who did not finish setup. */
      const pickS = n => STATES.find(x => x[0].startsWith(n)) || null;
      const st = !STATES.length
        ? null
        : seed % 5 === 2
          ? [null, pickS("f0_demo"), pickS("d0_notplaced")][seed % 3]
          : STATES[seed % (STATES.length + 1)];
      if (st) await ctx.addInitScript("window.__STATE = " + st[1] + ";");
      await ctx.addInitScript("(" + prelude.toString() + ")(" + seed + "," + NOW0 + ");");
      await ctx.route("**/*", route => {
        const u = route.request().url();
        if (u.startsWith(base)) return route.continue();
        if (VARIANT === "supa" && /supabase-js/.test(u))
          return route.fulfill({ contentType: "text/javascript", body: fake });
        return route.abort();
      });
      const page = await ctx.newPage();
      if (COVER) await page.coverage.startJSCoverage({ resetOnNavigation: false, reportAnonymousScripts: false });
      const errs = [];
      page.on("pageerror", e => errs.push("pageerror: " + e.message));
      const trace = [];
      const load = async first => {
        if (first) await page.goto(base + PAGE, { waitUntil: "load" });
        else await page.reload({ waitUntil: "load" });
        await page.evaluate(async () => {
          const P = window.__P;
          const settle = () =>
            new Promise(r => {
              const ch = new MessageChannel();
              ch.port1.onmessage = () => r();
              ch.port2.postMessage(0);
            });
          for (let i = 0; i < 6; i++) {
            await settle();
            P.advance(i < 5 ? 0 : 3000);
          }
          await settle();
        });
        const h = await page.evaluate(
          () =>
            window.__P.hash(document.body.innerHTML.replace(/<script\b[^>]*>[\s\S]*?<\/script>\s*/g, "")) +
            " frames " +
            window.__P.frames.length +
            ":" +
            window.__P.hash(window.__P.frames.join(",")) +
            " E:" +
            window.__P.errors.splice(0).join(";").slice(0, 300)
        );
        trace.push("load " + h + (errs.length ? " " + errs.splice(0).join(";").slice(0, 300) : ""));
      };
      await load(true);
      const CH = 50;
      let done = 0,
        shot = 0;
      while (done < STEPS) {
        const n = Math.min(CH, STEPS - done);
        let r;
        try {
          r = await page.evaluate(driver, {
            steps: n,
            seed,
            from: done,
            dumpAt: seed === dSeed ? dStep : -1,
            avoid: ["suout"],
            greedy: seed % 4 === 1,
            setup: seed % 5 === 2,
            last: FINALE && done + n >= STEPS,
          });
        } catch (e) {
          trace.push("EVAL-FAIL at " + done + " " + String(e.message).split("\n")[0]);
          break;
        }
        trace.push(...r.out);
        r.seen.forEach(k => (result.seen[k] = 1));
        r.acts.forEach(k => (result.acts[k] = 1));
        if (r.dump) fs.writeFileSync(OUT + ".dump.html", r.dump);
        done += n;
        if (SHOTS && shot < SHOTS) {
          const buf = await page.screenshot({ animations: "disabled", caret: "hide", fullPage: false });
          trace.push("shot " + require("crypto").createHash("sha1").update(buf).digest("hex").slice(0, 16));
          if (arg("shotdir", "")) fs.writeFileSync(path.join(arg("shotdir"), `s${seed}_${done}.png`), buf);
          shot++;
        }
        if (done < STEPS) await load(false);
      }
      if (errs.length) trace.push("pageerrors " + errs.join(";").slice(0, 500));
      result.walks[seed] = trace;
      if (st) trace.unshift("state " + st[0]);
      if (HARVEST) {
        const ls = await page.evaluate(() => {
          const o = {};
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k !== "__seeded") o[k] = localStorage.getItem(k);
          }
          return o;
        });
        fs.writeFileSync(path.join(HARVEST, "h" + String(seed).padStart(3, "0") + ".json"), JSON.stringify(ls));
      }
      if (COVER) {
        for (const e of await page.coverage.stopJSCoverage()) {
          const name = e.url.replace(base, "").split("?")[0];
          if (!/\.js$/.test(name)) continue;
          const len = (e.source || "").length || 1;
          const cnt = new Uint8Array(len),
            hit = (cover[name] = cover[name] || new Uint8Array(len));
          /* Paint outer ranges first. An inner range gives the count of its own text. */
          for (const f of e.functions)
            for (const r of f.ranges) cnt.fill(r.count > 0 ? 1 : 0, r.startOffset, r.endOffset);
          for (let i = 0; i < len; i++) if (cnt[i]) hit[i] = 1;
        }
      }
      await ctx.close();
      process.stderr.write(".");
    }
    await browser.close();
    srv.close();
    result.seen = Object.keys(result.seen).sort();
    result.acts = Object.keys(result.acts).sort();
    if (COVER) {
      const o = {};
      for (const k in cover) o[k] = Buffer.from(cover[k]).toString("base64");
      fs.writeFileSync(COVER, JSON.stringify(o));
    }
    fs.writeFileSync(OUT, JSON.stringify(result, null, 0));
    process.stderr.write(
      `\n${SEEDS.length} walks, ${STEPS} steps, ${result.seen.length} of ${result.acts.length} actions tapped -> ${OUT}\n`
    );
  })().catch(e => {
    console.error(e);
    process.exit(1);
  });
