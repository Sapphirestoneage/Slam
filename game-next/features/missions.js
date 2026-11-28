/* ============================================================================
   SLAM the Game: features/missions.js
   PURPOSE     The mission board. The same next steps, shown as missions: why now, how long, the reward,
               and what it opens. Three kinds: the story mission, side missions, and heists (a chain of
               small stages).
   INPUT       The game: G.chars, G.demo. The profile: c.x.dplan, c.x.drills, c.x.ms. The open sheet
               (W.kind): side, story. The taps of the player (the actions in OUTPUT).
   OUTPUT      11 functions. Parts of functions in other files: planTabMissionsSync, planTabMissions.
               Actions (ACT): msgo, msheist.
   DEPENDS ON  core/engine.js, screens/ui.js, screens/ux.js, core/metrics.js, features/debts.js,
               features/drills.js, features/gig.js, features/know.js, features/fair.js,
               features/values.js.
   USES LATER  Names from files that the browser loads later. Behind a typeof test, thus safe while the
               page loads: features/connect.js, features/lever.js, features/ask2.js, features/fold.js.
   RULES       A reward is always a real thing: a number that becomes known, a fear that the player
               practiced, a balance that moved. No streaks. No random prizes. A stage that the player
               completed before the game existed counts. Completed missions stay in a list.
   ========================================================================= */
const MS_MIN = { sharp: 2, month: 10, gwin: 1, cross: 3, l1: 2, daily: 1, flow: 1 };
function msGet(c) {
  const m = (c.x && c.x.ms) || {};
  return { seen: m.seen || {}, done: m.done || [] };
}
function msStory(c, d) {
  const ns = nextStep(c, d);
  if (!ns || !ns.t) return null;
  const nx = d.era < 9 ? EP(Math.min(9, d.era + 1)) : null;
  return {
    id: "story:" + ns.a + ":" + (ns.v == null ? "" : ns.v),
    kind: "story",
    t: ns.t,
    why: ns.s || "",
    a: ns.a,
    v: ns.v == null ? "" : ns.v,
    l: ns.l || "Start",
    mins: MS_MIN[ns.a] || 3,
    pay: nx ? "One step toward " + nx : "Keeps what you built",
    unl: "The next story mission",
  };
}
/* THE SIDE MISSIONS.
   msSide(c, d) returns the full list. It calls each part by name. msSideBase(c, d) is the part from this file. */
function msSide(c, d) {
  let out = msSideBase(c, d);
  if (typeof msSideLever === "function") out = msSideLever(out, c); /* lever.js: the mission "Guess which lever wins" */
  if (typeof msSideAsk === "function") out = msSideAsk(out); /* ask2.js: plain titles for the missions "know" */
  return out;
}
function msSideBase(c, d) {
  const out = [],
    add = o => out.push(Object.assign({ kind: "side" }, o)),
    has = n => typeof ACT[n] === "function";
  if (typeof kwAll === "function") {
    const K = kwAll(c, d),
      a = K.next,
      f = a && a.next;
    if (f && has(f.a)) {
      const after = Math.round(((a.facts.reduce((s, x) => s + x.v, 0) - f.v + 1) / a.facts.length) * 100);
      add({
        id: "know:" + a.k + ":" + f.t,
        t: "Nail down: " + f.t.charAt(0).toLowerCase() + f.t.slice(1),
        why: "One more thing you know for sure, instead of guessing.",
        mins: 2,
        pay: a.n + " goes from " + a.pct + "% to " + after + "% known",
        unl: "Sharper numbers everywhere",
        a: "kwgo",
        v: f.av || "",
        k: f.a,
      });
    }
  }
  if (typeof gxOn === "function" && gxOn(c)) {
    const S = gxState(c);
    if (S.behind > 0)
      add({
        id: "tax:catchup",
        t: "Catch up your tax money",
        why: "You logged money nobody took taxes out of.",
        mins: 3,
        pay: money(S.behind) + " set aside, and off your mind",
        unl: "A calm tax date",
        a: "gig",
        v: "tax",
      });
    if (!gxUnit(c))
      add({
        id: "gig:unit",
        t: "Price one unit of your work",
        why: "What one session, shift or gig really leaves you.",
        mins: 2,
        pay: "Every gap can be read in your own units",
        unl: "Your floor price",
        a: "gig",
        v: "pay",
      });
  }
  if (typeof fdList === "function" && c.led) {
    const done = (c.x && c.x.drills) || {},
      x = fdList(c, d).find(o => !done[o.id]);
    if (x)
      add({
        id: "drill:" + x.id,
        t: "Fire drill: " + x.fear.charAt(0).toLowerCase() + x.fear.slice(1),
        why: "Practice the scary thing on a calm day, on your own numbers.",
        mins: x.mins || 5,
        pay: "One money fear made smaller",
        unl: "The next drill",
        a: "fdopen",
        v: x.id,
      });
  }
  if (typeof vlResult === "function" && c.led && !vlResult(c).complete)
    add({
      id: "values:check",
      t: "See if your money matches what matters",
      why: "Three things you care about, next to where the money goes.",
      mins: 2,
      pay: "The percent of your month that lands on what matters",
      unl: "One line worth changing",
      a: "values",
      v: "",
    });
  if (c.led && (c.invs || []).length && typeof knGot === "function" && !knGot(c, "fee"))
    add({
      id: "fee:xray",
      t: "X-ray what your investments cost",
      why: "A fee looks small as a percent. See it in dollars and years.",
      mins: 2,
      pay: "Your fee, in years of work",
      unl: "The fee line in Key numbers",
      a: "compare",
      v: "fee",
    });
  if (c.led && !(c.moves || []).some(m => m.d && m.d.slice(0, 7) === todayISO().slice(0, 7)))
    add({
      id: "log:" + todayISO().slice(0, 7),
      t: "Log one thing that moved this month",
      why: "Money in, money out, a payment. One is enough to start.",
      mins: 1,
      pay: "Your money log for the month begins",
      unl: "Where it went, by month",
      a: "flow",
      v: "",
    });
  if (typeof frState === "function" && !G.demo && G.chars.filter(x => x.led).length >= 2 && !frState().pick)
    add({
      id: "fair:pick",
      t: "Pick how you share costs",
      why: "Five fair ways, side by side, on your numbers.",
      mins: 3,
      pay: "Who sends whom, settled",
      unl: "A line you can copy and send",
      a: "fair",
      v: "",
    });
  return out;
}
/* Plain words for all players. The game words show only with the gamer switch (Me, "Show game terms"). */
function msW(plain, game) {
  return typeof G !== "undefined" && G && G.gamer ? game : plain;
}
function msHeists(c, d) {
  const H = [],
    st = (t, ok, a, v) => ({ t, ok: !!ok, a, v: v == null ? "" : v }),
    cashOK = c.led && (c.cashes || []).length > 0 && c.cashes.every(r => r.s),
    cash = d.cash || 0;
  H.push({
    id: "h1000",
    n: "The first $1,000",
    why: "The gap between a surprise bill and a credit card.",
    pay: "A $1,000 bill stops being an emergency",
    stages: [
      st("Know your cash for sure", cashOK, "sharp", "cash"),
      st("Reach $250", cashOK && cash >= 250, "flow"),
      st("Reach $500", cashOK && cash >= 500, "flow"),
      st("Reach $1,000", cashOK && cash >= 1000, "flow"),
      st("Run the $1,000 bill drill", !!((c.x && c.x.drills) || {}).bill, "fdopen", "bill"),
    ],
  });
  const cards = (c.debts || []).filter(x => /card/i.test(x.k)),
    owed = cards.reduce((a, x) => a + (x.amt || 0), 0),
    hadCard = cards.length > 0 || (c.moves || []).some(m => m.t === "pay" && /card/i.test(m.k || ""));
  if (hadCard) {
    const known = cards.every(x => x.s),
      rated =
        typeof dbRate === "function"
          ? cards.filter(x => x.amt > 0).every(x => dbRate(x).cf > 0 && dbPay(x).cf > 0)
          : false;
    H.push({
      id: "hcard",
      n: "Kill the card",
      why: "Card interest is the most expensive money most people ever borrow.",
      pay: "The interest stops, and that payment becomes yours",
      stages: [
        st("Know the balance for sure", known, "sharp", "debt"),
        st("Know the rate and the payment", owed <= 0 || rated, "debtplan"),
        st("Pick which debt goes first", owed <= 0 || !!(c.x && c.x.dplan), "debtplan"),
        st("Make one payment above the minimum", owed <= 0 || (c.moves || []).some(m => m.t === "pay"), "flow"),
        st("Balance at zero", known && owed <= 0, "flow"),
      ],
    });
  }
  if (typeof kwAreas === "function") {
    const A = kwAreas(c, d);
    H.push({
      id: "hpicture",
      n: "See the whole picture",
      why: "Five letters. Know them and every plan gets easier.",
      pay: "Every number in the game is real, not a guess",
      stages: A.map(a => st(a.n + " fully known", a.pct >= 100, "know")),
    });
  }
  if (typeof gxOn === "function" && gxOn(c)) {
    const T = gxGet(c),
      S = gxState(c);
    H.push({
      id: "htax",
      n: "Taxes handled",
      why: "When nobody takes taxes out for you, the surprise comes in April.",
      pay: "No tax surprise, ever again",
      stages: [
        st("Pick how much to set aside", T.pct != null, "gig", "tax"),
        st("Set aside from one payment", T.set > 0 || T.paid.length > 0, "flow"),
        st("Caught up on everything logged", (T.due > 0 || T.paid.length > 0) && S.behind === 0, "gig", "tax"),
        st("Pay one quarterly bill from it", T.paid.length > 0, "gig", "tax"),
      ],
    });
  }
  return H.map(h => {
    const n = h.stages.filter(s => s.ok).length,
      next = h.stages.find(s => !s.ok) || null;
    return Object.assign(h, { n1: n, total: h.stages.length, next, done: !next });
  });
}
/* remember what was offered, and notice when it is no longer needed because it got done */
function msSync(c, d) {
  if (G.demo || !c.led) return false;
  const M = msGet(c),
    open = [msStory(c, d)].concat(msSide(c, d)).filter(Boolean),
    ids = {},
    seen = {},
    t = todayISO();
  let ch = false;
  open.forEach(m => {
    ids[m.id] = 1;
    seen[m.id] = M.seen[m.id] || m.t;
    if (!M.seen[m.id]) ch = true;
  });
  const done = M.done.slice();
  Object.keys(M.seen).forEach(id => {
    if (!ids[id]) {
      done.push({ id, t: M.seen[id], d: t });
      ch = true;
    }
  });
  msHeists(c, d).forEach(h => {
    if (h.done && !done.some(x => x.id === h.id)) {
      done.push({ id: h.id, t: "Heist: " + h.n, d: t, h: 1 });
      ch = true;
    }
  });
  if (ch) {
    c.x = c.x || {};
    c.x.ms = { seen, done: done.slice(-40) };
  }
  return ch;
}
function msPills(m) {
  return `<div class="row" style="gap:6px;flex-wrap:wrap"><span class="pill">About ${m.mins} min</span><span class="pill okp">${msW("You get", "Payout")}: ${esc(m.pay)}</span><span class="pill info">${msW("Opens", "Unlocks")}: ${esc(m.unl)}</span></div>`;
}
/* THE MISSION BOARD.
   msBoard(c, d) makes the full board. It calls each part by name. msBoardBase(c, d) is the part from this file. */
function msBoard(c, d) {
  let h = msBoardBase(c, d);
  /* connect.js: the button "See how it all connects" */
  if (typeof msBoardConnect === "function") h = msBoardConnect(h);
  if (typeof msBoardMore === "function") h = msBoardMore(h, c, d); /* fold.js: the list "More steps from your path" */
  return h;
}
function msBoardBase(c, d) {
  const S = msStory(c, d),
    side = msSide(c, d).slice(0, 3),
    H = msHeists(c, d),
    M = msGet(c),
    openH = H.filter(h => !h.done),
    doneH = H.filter(h => h.done),
    w = typeof MSX !== "undefined" ? MSX : {};
  return `<div class="stack msboard" style="gap:8px">
 ${S ? `<div class="tile stack mscard" style="gap:8px"><div class="row between"><span class="eyebrow">${msW("Do this first", "Story mission")}</span><span class="tiny muted">${M.done.length} done so far</span></div><b style="font-size:18px" data-fid="ms:story">${esc(S.t)}</b>${S.why ? `<div class="small">${esc(S.why)}</div>` : ""}${msPills(S)}<button class="primary wide go" data-a="${S.a}" data-v="${esc(String(S.v))}">${esc(S.l)}</button></div>` : ""}
 ${side.length ? `<b class="small">${msW("Also worth doing", "Side missions")} <span class="tiny muted">optional, any order</span></b><div class="stack" style="gap:6px">${side.map(m => `<button class="rowbtn" data-a="msgo" data-k="${m.a}" data-v="${esc(String(m.v))}" data-l="${m.k || ""}" style="gap:8px"><span style="min-width:0"><b>${esc(m.t)}</b><div class="tiny muted">${m.mins} min · ${esc(m.pay)}</div></span><span class="caret"><i class=chev aria-hidden=true></i></span></button>`).join("")}</div>` : ""}
 ${
   openH.length
     ? `<b class="small">${msW("Bigger projects", "Heists")} <span class="tiny muted">a stage at a time</span></b><div class="stack" style="gap:6px">${openH
         .map(h => {
           const on = w.h === h.id;
           return `<div class="tile stack" style="gap:6px"><button class="kwhead" data-a="msheist" data-v="${h.id}" aria-expanded="${on}"><span style="flex:1;min-width:0;text-align:left"><b>${esc(h.n)}</b><span class="tiny muted" style="display:block">${msW("You get", "Payout")}: ${esc(h.pay)}</span><span class="row" style="gap:4px;margin-top:5px">${h.stages.map(s => `<span class="msdot ${s.ok ? "on" : ""}"></span>`).join("")}</span></span><b style="flex:none">${h.n1} of ${h.total}</b></button>${on ? `<div class="small muted">${esc(h.why)}</div><div class="stack" style="gap:4px">${h.stages.map(s => `<div class="small ${s.ok ? "" : s === h.next ? "" : "muted"}">${s.ok ? "✓" : s === h.next ? "➤" : "○"} ${esc(s.t)}</div>`).join("")}</div><button class="primary wide slim" data-a="msgo" data-k="${h.next.a}" data-v="${esc(String(h.next.v))}" data-l="">Next stage: ${esc(h.next.t)}</button>` : ""}</div>`;
         })
         .join("")}</div>`
     : ""
 }
 ${
   M.done.length || doneH.length
     ? `<details class="math"><summary>Done (${M.done.length})</summary><div class="inner stack" style="gap:4px">${doneH.map(h => `<div class="small">✓ <b>${esc(h.n)}</b> · ${esc(h.pay)}</div>`).join("")}${M.done
         .filter(x => !x.h)
         .slice()
         .reverse()
         .slice(0, 15)
         .map(
           x =>
             `<div class="row between small" style="gap:8px"><span>✓ ${esc(x.t)}</span><span class="tiny muted" style="flex:none">${nice(x.d)}</span></div>`
         )
         .join("")}</div></details>`
     : ""
 }</div>`;
}
var MSX = { h: null };
Object.assign(ACT, {
  msgo: t => {
    const a = t.dataset.k,
      v = t.dataset.v,
      l = t.dataset.l;
    if (typeof ACT[a] !== "function") return;
    if (a === "kwgo") return ACT.kwgo({ dataset: { k: l, v } });
    ACT[a]({ dataset: { a, v, k: v } });
  },
  msheist: t => {
    MSX.h = MSX.h === t.dataset.v ? null : t.dataset.v;
    render();
  },
});
/* Part of planTab() in planner.js, step 1 of 2. Brings the missions up to date, and saves when something changed.
   Returns the profile (c) and its numbers (d). planTabMissions() uses the two values. */
function planTabMissionsSync() {
  const c = C(),
    d = D || derive(c);
  if (msSync(c, d)) save();
  return { c, d };
}
/* Part of planTab() in planner.js, step 2 of 2. Adds the mission board below the tab title. */
function planTabMissions(h, c, d) {
  if (G.demo || !c.led) return h;
  const th = typeof tabHead === "function" ? tabHead() : "",
    b = msBoard(c, d);
  /* The plan by time (Today, This week, Month, Year) comes first. The board sits under it. */
  if (h.indexOf("<!--boardhere-->") >= 0) return h.replace("<!--boardhere-->", () => b);
  if (th && h.indexOf(th) >= 0) return h.replace(th, () => th + b);
  return h.replace('<div class="stack">', () => '<div class="stack">' + b);
}

Object.assign(GLOSS, {
  mission: [
    "Mission",
    "One thing to do, with the reason, the time it takes, and what you get for it, all shown before you start.",
  ],
  heist: [
    "Heist",
    "A big goal broken into small stages. Each stage is a mission. The payout comes at the end, and stages you already cleared count.",
  ],
});
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
