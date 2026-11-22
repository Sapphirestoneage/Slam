/* ===== back.js: The welcome-back card. Coming back should start with what is already done, not with a list of demands. On the first look of a new day the game keeps the picture from the last visit and shows one slim row on Home: what you did last time, what moved while you were away, and the one place to pick up. Opening it once puts it away for the day. It never counts days missed and never asks why you were gone. State: c.x.wb={d,b,n,pb,pn,seen}, where b and n are small pictures of the start and the latest moment of the current visit day, and pb and pn are the same two for the visit before. Pictures hold counts and totals only. ===== */
function bkSnap(c, d) {
  let k = 0,
    kt = 0;
  try {
    if (typeof kwAll === "function") {
      const K = kwAll(c, d);
      k = K.known;
      kt = K.total;
    }
  } catch (e) {}
  return {
    d: todayISO(),
    k,
    kt,
    nw: Math.round(d.nw || 0),
    debt: Math.round(c.debt || 0),
    cash: Math.round(d.cash || 0),
    inv: Math.round(c.inv || 0),
    sk: Object.keys(c.skills || {}).length,
    mv: (c.moves || []).length,
    ms: ((c.x && c.x.ms && c.x.ms.done) || []).length,
    gl: (c.goals || []).length,
    era: d.era || 0,
  };
}
function bkSync(c, d) {
  if (G.demo || !c || !c.led) return null;
  c.x = c.x || {};
  const t = todayISO(),
    s = bkSnap(c, d),
    w = c.x.wb;
  if (!w || !w.d) {
    c.x.wb = { d: t, b: s, n: s, pb: null, pn: null, seen: null };
    return c.x.wb;
  }
  if (w.d !== t) {
    w.pb = w.b || w.n;
    w.pn = w.n || w.b;
    w.b = s;
    w.n = s;
    w.d = t;
    w.seen = null;
  } else w.n = s;
  return w;
}
function bkSkillName(id) {
  try {
    const p = String(id).split(":"),
      t = window.SKILLS && window.SKILLS[p[0]],
      s = t && t.skills && t.skills[+p[1]];
    return s ? s[0] : null;
  } catch (e) {
    return null;
  }
}
function bkOn(c, day) {
  const sk = Object.keys(c.skills || {})
      .filter(id => c.skills[id] === day)
      .map(bkSkillName)
      .filter(Boolean),
    mv = (c.moves || []).filter(m => m.d === day),
    paid = mv.filter(m => m.t === "pay").reduce((s, m) => s + (m.amt || 0), 0),
    inn = mv.filter(m => m.t === "in").reduce((s, m) => s + (m.amt || 0), 0);
  return { sk, mv, paid, inn };
}
function bkData(c, d) {
  const w = c.x && c.x.wb;
  if (!w || !w.pn || !w.pb) return null;
  const a = w.pb,
    z = w.pn,
    now = w.b || bkSnap(c, d),
    day = z.d,
    did = [],
    since = [],
    O = bkOn(c, day),
    days = Math.max(0, daysBetween(day, todayISO())),
    plural = (n, s) => n + " " + s + (n === 1 ? "" : "s");
  if (z.k > a.k)
    did.push(
      "You nailed down " +
        plural(z.k - a.k, "more thing") +
        " about your money. You now know " +
        z.k +
        " of " +
        z.kt +
        "."
    );
  if (O.sk.length)
    did.push(
      "You finished " +
        (O.sk.length === 1 ? "a skill: " : plural(O.sk.length, "skill") + ": ") +
        O.sk.slice(0, 3).join(", ") +
        (O.sk.length > 3 ? ", and more" : "") +
        "."
    );
  else if (z.sk > a.sk) did.push("You finished " + plural(z.sk - a.sk, "skill") + ".");
  if (O.paid > 0) did.push("You paid " + money(Math.round(O.paid)) + " toward debt.");
  if (O.mv.length)
    did.push(
      "You logged " +
        plural(O.mv.length, "money move") +
        (O.inn > 0 ? ", with " + money(Math.round(O.inn)) + " coming in" : "") +
        "."
    );
  else if (z.mv > a.mv) did.push("You logged " + plural(z.mv - a.mv, "money move") + ".");
  if (z.ms > a.ms) did.push("You closed " + plural(z.ms - a.ms, "mission") + ".");
  if (z.gl > a.gl) did.push("You added " + plural(z.gl - a.gl, "goal") + ".");
  if (z.era > a.era && typeof eraName === "function") did.push("You moved up an era.");
  if (now.k !== z.k && now.kt === z.kt)
    since.push("What you know for sure went from " + z.k + " to " + now.k + " of " + now.kt + ".");
  if (now.debt < z.debt) since.push("What you owe is " + money(z.debt - now.debt) + " lower.");
  else if (now.debt > z.debt) since.push("What you owe is " + money(now.debt - z.debt) + " higher than last time.");
  if (now.cash !== z.cash)
    since.push("Your cash is " + money(Math.abs(now.cash - z.cash)) + (now.cash > z.cash ? " higher." : " lower."));
  if (now.sk > z.sk) since.push(plural(now.sk - z.sk, "skill") + " got marked done.");
  try {
    if (typeof gxOn === "function" && gxOn(c)) {
      const n = gxNext(todayISO());
      if (n && n.days >= 0 && n.days <= 45)
        since.push("The next tax date for money you earn on your own is " + nice(iso(n.date)) + ".");
    }
  } catch (e) {}
  let ns = null;
  try {
    ns = nextStep(c, d);
  } catch (e) {}
  return { day, days, did, since, ns, known: now.k, total: now.kt };
}
function bkLine(B) {
  const n = B.did.length;
  return (
    "Last time, " +
    nice(B.day) +
    ": " +
    (n
      ? B.did[0].replace(/^You /, "you ").replace(/\.$/, "") + (n > 1 ? ", and " + (n - 1) + " more" : "")
      : "you looked things over") +
    "."
  );
}
function bkRow(c, d) {
  const w = c.x && c.x.wb;
  if (!w || !w.pn || w.seen === todayISO()) return "";
  const B = bkData(c, d);
  if (!B) return "";
  return `<button class="rowbtn homerow bkrow" data-a="since" aria-label="Welcome back"><span style="min-width:0;flex:1"><b class="small">Welcome back${c.name && c.name !== "You" ? ", " + esc(c.name) : ""}</b><div class="tiny muted">${esc(bkLine(B))}</div></span><span class="pill new">New</span></button>`;
}
function bkText(c, B) {
  return ["Since last time (" + nice(B.day) + ")"]
    .concat(
      B.did.length ? ["Last time:"].concat(B.did.map(x => "- " + x)) : ["Last time: looked things over."],
      B.since.length ? ["Since then:"].concat(B.since.map(x => "- " + x)) : [],
      ["You know " + B.known + " of " + B.total + " things about your money."]
    )
    .join("\n");
}
function bkSheet() {
  const c = C(),
    d = D || derive(c),
    B = bkData(c, d);
  if (!B)
    return (
      head("Menu", "Since last time") +
      `<div class="tile small">This is your first visit on this device, so there is no last time yet. Next time you open the game, this page shows what you did and what moved while you were away.</div><button class="primary wide" data-a="know">See what I already know</button>`
    );
  const ns = B.ns;
  return (
    head("Welcome back", "Since last time") +
    `<div class="tile stack" style="gap:4px"><div class="tiny muted">Last time, ${nice(B.day)}</div>${B.did.length ? B.did.map(x => `<div class="small bkdid"><span class="bktick">✓</span><span>${esc(x)}</span></div>`).join("") : `<div class="small">You looked things over. Nothing was changed.</div>`}</div>` +
    (B.since.length
      ? `<div class="tile stack" style="gap:4px"><div class="tiny muted">Since then</div>${B.since.map(x => `<div class="small">${esc(x)}</div>`).join("")}</div>`
      : `<div class="tile small">Nothing moved while you were away. Everything is where you left it.</div>`) +
    `<div class="tile small">You already know <b>${B.known} of ${B.total}</b> things about your money. That part is done and stays done.</div>` +
    (ns && ns.a ? `<button class="primary wide" data-a="bkgo">Pick up here: ${esc(ns.t)}</button>` : "") +
    `<div class="row" style="gap:8px"><button class="ghost" style="flex:1" data-a="know">What I already know</button><button class="ghost" style="flex:1" data-a="bkcopy">${W && W.copied ? "Copied" : "Copy this"}</button></div>`
  );
}
Object.assign(ACT, {
  since: () => {
    const c = C();
    if (!G.demo && c.x && c.x.wb && c.x.wb.pn && c.x.wb.seen !== todayISO()) {
      c.x.wb.seen = todayISO();
      save();
      render();
    }
    W = { kind: "since" };
    sheet(bkSheet);
  },
  bkgo: () => {
    const c = C(),
      ns = nextStep(c, D || derive(c));
    if (!ns || typeof ACT[ns.a] !== "function") return;
    closeSheet();
    ACT[ns.a]({ dataset: { v: ns.v == null ? "" : ns.v, l: ns.l || "", k: ns.k || "", id: ns.id || "" } });
  },
  bkcopy: () => {
    const c = C(),
      B = bkData(c, D || derive(c));
    if (!B) return;
    try {
      navigator.clipboard.writeText(bkText(c, B));
    } catch (e) {}
    W.copied = true;
    drawSheet();
  },
});
/* Part of home() in ui.js, step 1 of 2. Compares the game with the last visit, before Home is made.
   Returns the profile (c) and the result (w). homeBackRow() uses the two values. */
function homeBackSync() {
  const c = C();
  let w = null;
  try {
    w = bkSync(c, D || derive(c));
  } catch (e) {}
  return { c, w };
}
/* Part of home() in ui.js, step 2 of 2. Adds the welcome-back row when there is something to show. */
function homeBackRow(h, c, w) {
  if (!w || G.demo || !c.led || (typeof TOUR !== "undefined" && !G.tourSeen)) return h;
  const row = bkRow(c, D || derive(c));
  return row && typeof homeRowAdd === "function" ? homeRowAdd(h, row) : h;
}
/* Part of save() in ui.js. On a day with a welcome-back card, keeps the numbers of now. The card compares them with the numbers of the last visit. */
function saveBackSnap() {
  try {
    const c = typeof C === "function" ? C() : null;
    if (c && c.led && !G.demo && c.x && c.x.wb && c.x.wb.d === todayISO()) c.x.wb.n = bkSnap(c, derive(c));
  } catch (e) {}
}

if (typeof MENU !== "undefined" && Array.isArray(MENU) && !MENU.some(m => m[1] === "since")) {
  const i = MENU.findIndex(m => m[1] === "know");
  MENU.splice(i >= 0 ? i + 1 : 0, 0, [
    "Since last time",
    "since",
    "act",
    "What you did last visit, and what moved while you were away",
  ]);
}
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
