/* ============================================================================
   SLAM the Game: account/coachplus.js
   PURPOSE     Four more parts of the coach page (coach.html). (1) A demo with made-up clients, so a
               coach can show the page to other coaches and no real person's money is on the screen.
               (2) Results: the milestones of each client with their dates, the days to the first win,
               and a before / after report to copy or print. (3) A pipeline: each client is in one
               stage (getting set up, active, needs attention, graduated), and a tap on a stage shows
               only those clients. (4) Search and sort for the roster, and one row of totals.
   INPUT       The roster of coachpage.js (CP.list, CP.notes). The saved profile of each person
               (c.hist: one snapshot for each day with a change; c.base; c.placed; c.led).
   OUTPUT      Functions that only work out values: cpxDays, cpxMilestones, cpxFirstWin, cpxBeforeAfter,
               cpxStage, cpxCounts, cpxFilter, cpxSummary, cpxReport, cpxDemoGames, cpxDemoNotes.
               Parts of functions in coachpage.js: cpxDemoLoad (cpLoad), cpxSignIn and cpxBar and
               cpxList (cpDraw), cpxCard (cpClientCard), cpxClick (cpClick). Also cpxInput.
   DEPENDS ON  core/report.js, core/engine.js (newChar), account/coachpage.js. Only coach.html loads
               this file.
   RULES       In the demo nothing is read from the database and nothing is written to it: a note, a
               quest and "seen" stay in the memory of the page. Each made-up client has "(sample)" in
               the name, and the page says that the clients are made up. A date of a milestone comes
               from the history of the client, never from a guess: with no history, there is no date.
               A stage that the coach sets is a tag in the coach's notes. No red. No verdict words.
   ========================================================================= */
const CPX = { demo: false, q: "", stage: "all", sort: "active" };
const CPX_STAGES = [
  ["setup", "Getting set up"],
  ["active", "Active"],
  ["risk", "Needs attention"],
  ["grad", "Graduated"],
];
const CPX_SORTS = [
  ["active", "Last active"],
  ["risk", "Needs attention first"],
  ["gain", "Biggest change in net worth"],
  ["name", "Name"],
];
const CPX_TAG = "#stage:";
/* ---------- values only ---------- */
/* Whole days from one date to a later date. */
function cpxDays(a, b) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 864e5);
}
/* The history of one person, the oldest first, with c.base in front when it is older. */
function cpxHist(c) {
  const h = ((c && c.hist) || []).filter(s => s && s.d).slice();
  h.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  if (c && c.base && c.base.d && (!h.length || c.base.d < h[0].d)) h.unshift({ d: c.base.d, nw: c.base.nw });
  return h;
}
/* THE MILESTONES of one person: [{ k, n, at, days }]. at is the date of the first snapshot where the thing
   is true, or null. days counts from the start. The first row is the start. had: it was true on the first
   day, so it is not a win of the coaching. */
function cpxMilestones(c) {
  const h = cpxHist(c),
    first = h[0] || null,
    ok = (x, test) => {
      try {
        return !!test(x);
      } catch (e) {
        return false;
      }
    },
    /* the date of the first later day where the thing is true. "had" when it was true on the first day:
       that is where the person started, not a win */
    when = test => {
      if (first && ok(first, test)) return "had";
      const s = h.find(x => ok(x, test));
      return s ? s.d : null;
    },
    num = v => (typeof v === "number" && isFinite(v) ? v : null),
    f = {
      debt: first ? num(first.debt) : null,
      inv: first ? num(first.inv) : null,
      era: first ? num(first.era) : null,
    },
    rows = [
      ["start", "Started", first ? first.d : null],
      ["real", "Made the numbers real", when(x => x.verified)],
      ["k1", "First $1,000 of cash", when(x => num(x.cash) !== null && x.cash >= 1000)],
      ["debt", "Debt went down", when(x => f.debt !== null && num(x.debt) !== null && x.debt < f.debt - 1)],
      ["debt0", "No debt left", when(x => f.debt > 0 && num(x.debt) !== null && x.debt <= 0)],
      [
        "month",
        "One month of spending in cash",
        when(x => x.spend > 0 && num(x.cash) !== null && x.cash / x.spend >= 1),
      ],
      ["inv", "Invested more", when(x => f.inv !== null && num(x.inv) !== null && x.inv > f.inv + 1)],
      ["era", "Moved up an era", when(x => f.era !== null && num(x.era) !== null && x.era > f.era)],
    ];
  return rows.map(r => {
    const had = r[2] === "had",
      at = had ? null : r[2];
    return { k: r[0], n: r[1], at, had, days: at && first ? cpxDays(first.d, at) : null };
  });
}
/* The first win: the first milestone after the start. Null when there is none yet. */
function cpxFirstWin(c) {
  const M = cpxMilestones(c)
    .filter(m => m.k !== "start" && m.at)
    .sort((a, b) => a.days - b.days);
  return M[0] || null;
}
/* BEFORE AND AFTER: the first snapshot next to the latest one. Null with fewer than two snapshots. */
function cpxBeforeAfter(c) {
  const h = cpxHist(c).filter(s => typeof s.nw === "number");
  if (h.length < 2) return null;
  const a = h[0],
    b = h[h.length - 1],
    row = (label, x, y, kind) =>
      typeof x === "number" && typeof y === "number" ? { label, before: x, after: y, change: y - x, kind } : null,
    left = s => (typeof s.take === "number" && typeof s.spend === "number" ? s.take - s.spend : undefined);
  return {
    from: a.d,
    to: b.d,
    days: cpxDays(a.d, b.d),
    rows: [
      row("Net worth", a.nw, b.nw, "usd"),
      row("Debt", a.debt, b.debt, "usd"),
      row("Cash", a.cash, b.cash, "usd"),
      row("Invested", a.inv, b.inv, "usd"),
      row("Left each month", left(a), left(b), "usd"),
    ].filter(Boolean),
  };
}
/* THE STAGE of one client. A tag that the coach set wins. Else: getting set up (nobody finished setup),
   needs attention (a flag), or active. */
function cpxStage(cl, flags, notes) {
  const tag = (notes || [])
    .filter(x => x.kind === "note" && x.client === cl.owner && String(x.body).indexOf(CPX_TAG) === 0)
    .sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  if (tag) {
    const k = String(tag.body).slice(CPX_TAG.length);
    if (k === "grad") return "grad";
  }
  if (!cl.people.some(p => p.placed)) return "setup";
  return flags && flags.length ? "risk" : "active";
}
/* The count of clients in each stage. rows is [{ cl, stage }]. */
function cpxCounts(rows) {
  const out = { all: rows.length };
  CPX_STAGES.forEach(s => (out[s[0]] = rows.filter(r => r.stage === s[0]).length));
  return out;
}
/* The change in net worth of a client since the start, all persons together. */
function cpxGain(cl) {
  return cl.people.reduce((t, p) => {
    const B = p.c ? cpxBeforeAfter(p.c) : null,
      r = B && B.rows.find(x => x.label === "Net worth");
    return t + (r ? r.change : 0);
  }, 0);
}
/* The roster after the search, the stage and the sort. rows is [{ cl, stage, flags }]. */
function cpxFilter(rows, o) {
  const q = String((o && o.q) || "")
      .trim()
      .toLowerCase(),
    st = (o && o.stage) || "all",
    sort = (o && o.sort) || "active",
    out = rows.filter(r => (st === "all" || r.stage === st) && (!q || r.cl.names.toLowerCase().indexOf(q) >= 0));
  const by = {
    active: (a, b) => (String(a.cl.at) < String(b.cl.at) ? 1 : -1),
    risk: (a, b) => b.flags.length - a.flags.length || (String(a.cl.at) < String(b.cl.at) ? 1 : -1),
    gain: (a, b) => cpxGain(b.cl) - cpxGain(a.cl),
    name: (a, b) => (a.cl.names.toLowerCase() < b.cl.names.toLowerCase() ? -1 : 1),
  };
  return out.sort(by[sort] || by.active);
}
/* ONE ROW OF TOTALS for the roster: clients, active in 7 days, the middle number of days to a first win,
   the change in net worth, and the debt paid down. */
function cpxSummary(list, now) {
  const wins = [],
    out = { clients: list.length, active7: 0, gain: 0, debtDown: 0, winDays: null, withWin: 0 };
  list.forEach(cl => {
    if (cl.at && (now - new Date(cl.at).getTime()) / 864e5 <= 7) out.active7++;
    cl.people.forEach(p => {
      if (!p.c) return;
      const W = cpxFirstWin(p.c),
        B = cpxBeforeAfter(p.c);
      if (W) wins.push(W.days);
      if (B) {
        const nw = B.rows.find(r => r.label === "Net worth"),
          db = B.rows.find(r => r.label === "Debt");
        if (nw) out.gain += nw.change;
        if (db && db.change < 0) out.debtDown += -db.change;
      }
    });
  });
  wins.sort((a, b) => a - b);
  out.withWin = wins.length;
  if (wins.length) out.winDays = wins[Math.floor((wins.length - 1) / 2)];
  return out;
}
/* THE REPORT of one client as plain text, to copy. */
function cpxReport(cl) {
  const usd = n => (n < 0 ? "-" : "") + "$" + Math.round(Math.abs(n)).toLocaleString(),
    L = ["Before and after: " + cl.names, ""];
  cl.people.forEach(p => {
    const B = p.c ? cpxBeforeAfter(p.c) : null,
      W = p.c ? cpxFirstWin(p.c) : null,
      M = p.c ? cpxMilestones(p.c).filter(m => m.k !== "start" && m.at) : [];
    if (cl.people.length > 1) L.push(p.name);
    if (!B) L.push("Not enough history yet: the game needs two days with a change.");
    else {
      L.push("From " + B.from + " to " + B.to + " (" + B.days + " days)");
      B.rows.forEach(r =>
        L.push(
          "  " +
            r.label +
            ": " +
            usd(r.before) +
            " to " +
            usd(r.after) +
            " (" +
            (r.change === 0 ? "no change" : (r.change > 0 ? "up " : "down ") + usd(Math.abs(r.change))) +
            ")"
        )
      );
    }
    if (W) L.push("First win: " + W.n + ", after " + W.days + (W.days === 1 ? " day" : " days"));
    M.forEach(m => L.push("  " + m.at + "  " + m.n));
    L.push("");
  });
  L.push("Numbers from the client's own answers in SLAM the Game. Some can still be guesses.");
  return L.join("\n");
}
/* ---------- the demo ---------- */
/* A date, n days before now, as "2026-11-25". */
function cpxAgo(now, n) {
  return new Date(now - n * 864e5).toISOString().slice(0, 10);
}
/* One made-up person. steps is a list of [days ago, net worth, debt, invested, cash, take, spend, era, real]. */
function cpxPerson(now, name, o, steps) {
  const last = steps[steps.length - 1],
    R = r => Object.assign({ s: true }, r),
    c = Object.assign(typeof newChar === "function" ? newChar() : {}, {
      name,
      placed: o.placed !== false,
      led: !!o.led,
      age: o.age || 31,
      take: last[5],
      spend: last[6],
      debt: last[2],
      inv: last[3],
      months: last[6] > 0 ? last[4] / last[6] : 0,
      high: o.costly ? "yes" : "no",
      cashes: [R({ k: "Checking", amt: last[4] })],
      invs: last[3] > 0 ? [R({ k: "IRA or Roth IRA", amt: last[3] })] : [],
      debts:
        last[2] > 0
          ? [R({ k: o.costly ? "Credit card balance" : "Student loan", amt: last[2], high: !!o.costly })]
          : [],
      incs: [R({ k: "A main job", amt: last[5] })],
      spends: [R({ k: "Home", amt: Math.round(last[6] * 0.45) }), R({ k: "Food", amt: Math.round(last[6] * 0.55) })],
      hist: steps.map(s => ({
        d: cpxAgo(now, s[0]),
        nw: s[1],
        debt: s[2],
        inv: s[3],
        cash: s[4],
        take: s[5],
        spend: s[6],
        era: s[7],
        verified: !!s[8],
      })),
    });
  c.x = Object.assign({}, c.x, { plan: o.plan || [] });
  c.base = { d: c.hist[0].d, nw: c.hist[0].nw };
  return c;
}
/* THE MADE-UP CLIENTS: [{ owner, at, g }], each one at a different stage. */
function cpxDemoGames(now) {
  const P = (n, o, s) => cpxPerson(now, n, o, s),
    done = n => Array.from({ length: n }, () => ({ st: "done" })).concat([{ st: "todo" }, { st: "todo" }]),
    G = (id, days, chars) => ({ owner: "demo-" + id, at: new Date(now - days * 864e5).toISOString(), g: { chars } });
  return [
    G(1, 1, [
      P("Maya (sample)", { led: true, costly: true, plan: done(6) }, [
        [63, -8600, 9400, 600, 200, 4100, 3900, 1, 0],
        [60, -8500, 9400, 600, 300, 4100, 3700, 1, 1],
        [41, -7300, 8600, 600, 700, 4100, 3500, 1, 1],
        [22, -6100, 7900, 700, 1100, 4100, 3400, 2, 1],
        [1, -4900, 7100, 800, 1400, 4300, 3400, 2, 1],
      ]),
    ]),
    G(2, 3, [
      P("Jordan (sample)", { led: true, plan: done(4) }, [
        [120, 12400, 18000, 21000, 9400, 5600, 4700, 3, 0],
        [112, 12600, 18000, 21000, 9600, 5600, 4600, 3, 1],
        [70, 15900, 16500, 22600, 9800, 5600, 4500, 3, 1],
        [3, 21800, 14200, 25400, 10600, 5900, 4500, 4, 1],
      ]),
      P("Alex (sample)", { led: true, plan: done(3) }, [
        [120, 3100, 0, 2600, 500, 3900, 3700, 2, 0],
        [70, 4400, 0, 3200, 1200, 3900, 3500, 2, 1],
        [3, 7900, 0, 4100, 3800, 4000, 3400, 3, 1],
      ]),
    ]),
    G(3, 4, [P("Priya (sample)", { placed: false }, [[5, -2200, 6000, 2000, 1800, 4200, 3600, 1, 0]])]),
    G(4, 23, [
      P("Dev (sample)", { led: true, costly: true, plan: done(1) }, [
        [58, -14800, 16200, 0, 1400, 3600, 3500, 1, 0],
        [51, -14900, 16300, 0, 1400, 3600, 3800, 1, 1],
        [23, -15700, 16900, 0, 1200, 3600, 3900, 1, 1],
      ]),
    ]),
    G(5, 6, [
      P("Rosa (sample)", { led: true, plan: done(14) }, [
        [246, 4200, 11800, 9000, 7000, 6100, 4900, 2, 0],
        [240, 4300, 11800, 9000, 7100, 6100, 4800, 2, 1],
        [170, 13900, 6400, 12300, 8000, 6100, 4500, 3, 1],
        [95, 24700, 0, 15700, 9000, 6400, 4500, 4, 1],
        [6, 41800, 0, 27300, 14500, 6800, 4600, 5, 1],
      ]),
    ]),
    G(6, 2, [
      P("Theo (sample)", { led: true, costly: true, plan: done(2) }, [
        [16, -3900, 5200, 300, 1000, 4800, 4300, 1, 0],
        [14, -3900, 5200, 300, 1000, 4800, 4200, 1, 1],
        [2, -4500, 6000, 300, 1200, 4800, 4400, 1, 1],
      ]),
    ]),
  ];
}
/* The made-up notes of the demo: one session note, one quest, one "seen" mark and one stage tag. */
function cpxDemoNotes(now, list) {
  const at = d => new Date(now - d * 864e5).toISOString(),
    theo = list.find(cl => cl.owner === "demo-6"),
    seen = theo ? Object.assign(cpSnap(theo), { seenAt: at(10) }) : null;
  if (seen) seen.people[0].costly = 5200;
  return [
    {
      id: "d1",
      at: at(8),
      client: "demo-1",
      kind: "note",
      body: "Paid off the store card. Next: move the freed $90 a month to the cushion.",
    },
    {
      id: "d2",
      at: at(8),
      client: "demo-1",
      kind: "quest",
      body: "Open a savings account for your cushion and give it a name",
    },
    { id: "d3", at: at(40), client: "demo-5", kind: "note", body: CPX_TAG + "grad" },
    { id: "d4", at: at(40), client: "demo-5", kind: "note", body: "Last session. Check in again in six months." },
  ].concat(seen ? [{ id: "d5", at: at(10), client: "demo-6", kind: "seen", body: JSON.stringify(seen) }] : []);
}
/* Part of cpLoad() in coachpage.js. In the demo, fill the roster with the made-up clients and read nothing
   from the database. Returns true when it did. */
function cpxDemoLoad() {
  if (!CPX.demo) return false;
  const now = Date.now();
  CP.roles = CP.roles && (CP.roles.coach || CP.roles.admin) ? CP.roles : { coach: true, admin: false };
  CP.list = cpxDemoGames(now)
    .map(G => cpClient(G.owner, { g: G.g, at: G.at }))
    .sort((a, b) => (a.at < b.at ? 1 : -1));
  CP.notes = cpxDemoNotes(now, CP.list);
  CP.notesOk = true;
  return true;
}
/* ---------- the page ---------- */
const cpxUsd = n => (n < 0 ? "-" : "") + "$" + Math.round(Math.abs(+n || 0)).toLocaleString();
/* The rows of the roster with stage and flags, before the filter. */
function cpxRows() {
  const now = Date.now();
  return (CP.list || []).map(cl => {
    const flags = cpFlags(cl, now, cpLastSeen(cl.owner));
    return { cl, flags, stage: cpxStage(cl, flags, CP.notes) };
  });
}
/* Part of cpDraw() in coachpage.js. On the sign-in screen: the door to the demo. */
function cpxSignIn() {
  return `<div class="card"><b>Only want to look?</b><p class="muted">See the coach page with six made-up clients. No sign-in, and no real person's money.</p><button class="wide" data-a="demoon">Show it with made-up clients</button></div>`;
}
/* Part of cpDraw() in coachpage.js. Above the roster: the demo line, the totals, the stages, search and sort. */
function cpxBar() {
  const rows = cpxRows(),
    N = cpxCounts(rows),
    S = cpxSummary(CP.list || [], Date.now()),
    demo = CPX.demo
      ? `<div class="flag demo"><b>Made-up clients.</b> No real person's money is on this screen. What you tap here is not saved.<br><button data-a="demooff">${CP.session ? "Show my real clients" : "Leave the demo"}</button></div>`
      : `<button class="wide" data-a="demoon">Show it with made-up clients (to show another coach)</button>`;
  return (
    demo +
    `<div class="card"><b>Results so far</b><div class="nums"><span>Clients <b>${S.clients}</b></span><span>Active in the last 7 days <b>${S.active7}</b></span><span>Days to a first win, the middle client <b>${S.winDays == null ? "none yet" : S.winDays}</b></span><span>Net worth, all clients <b>${S.gain === 0 ? "no change" : (S.gain > 0 ? "up " : "down ") + cpxUsd(Math.abs(S.gain))}</b></span><span>Debt paid down <b>${cpxUsd(S.debtDown)}</b></span><span>Clients with a first win <b>${S.withWin}</b></span></div><p class="muted">From each client's own history in the game, since their first day. Some numbers can still be guesses.</p></div>` +
    `<div class="card"><b>Pipeline</b><div class="chips"><button class="chip ${CPX.stage === "all" ? "on" : ""}" data-a="stagef" data-v="all" aria-pressed="${CPX.stage === "all"}">Everyone ${N.all}</button>${CPX_STAGES.map(s => `<button class="chip ${CPX.stage === s[0] ? "on" : ""}" data-a="stagef" data-v="${s[0]}" aria-pressed="${CPX.stage === s[0]}">${s[1]} ${N[s[0]]}</button>`).join("")}</div>` +
    `<div><label for="cpxq">Find a client by name</label><input id="cpxq" data-f="q" type="search" autocomplete="off" value="${cpEsc(CPX.q)}"></div><div><label for="cpxs">Order</label><select id="cpxs" data-f="sort">${CPX_SORTS.map(s => `<option value="${s[0]}"${CPX.sort === s[0] ? " selected" : ""}>${s[1]}</option>`).join("")}</select></div></div>`
  );
}
/* Part of cpDraw() in coachpage.js. The cards of the roster, after the search, the stage and the sort. */
function cpxList() {
  const rows = cpxFilter(cpxRows(), CPX);
  return `<div id="cpxlist">${
    rows.length
      ? rows.map(r => cpClientCard(r.cl)).join("")
      : `<div class="card"><p>No client fits. Tap "Everyone", or clear the name.</p></div>`
  }</div>`;
}
/* Part of cpClientCard() in coachpage.js. For one client: the stage, the milestones, before and after. */
function cpxCard(cl) {
  const flags = cpFlags(cl, Date.now(), cpLastSeen(cl.owner)),
    stage = cpxStage(cl, flags, CP.notes),
    name = (CPX_STAGES.find(s => s[0] === stage) || ["", ""])[1],
    people = cl.people
      .map(p => {
        if (!p.c) return "";
        const M = cpxMilestones(p.c),
          W = cpxFirstWin(p.c),
          B = cpxBeforeAfter(p.c),
          who = cl.people.length > 1 ? `<b>${cpEsc(p.name)}</b>` : "";
        return (
          who +
          (W
            ? `<p>First win: <b>${cpEsc(W.n)}</b>, after ${W.days} ${W.days === 1 ? "day" : "days"}.</p>`
            : `<p class="muted">No first win yet.</p>`) +
          `<ul>${M.map(m => `<li>${m.at || m.had ? "✓" : "○"} ${cpEsc(m.n)}${m.at ? ` <span class="muted">${cpEsc(m.at)}${m.k === "start" ? "" : ", day " + m.days}</span>` : m.had ? ` <span class="muted">already there at the start</span>` : ""}</li>`).join("")}</ul>` +
          (B
            ? `<table class="ba"><tr><th scope="col">Since ${cpEsc(B.from)} (${B.days} days)</th><th scope="col">Before</th><th scope="col">Now</th><th scope="col">Change</th></tr>${B.rows.map(r => `<tr><th scope="row">${cpEsc(r.label)}</th><td>${cpxUsd(r.before)}</td><td>${cpxUsd(r.after)}</td><td>${r.change === 0 ? "none" : (r.change > 0 ? "up " : "down ") + cpxUsd(Math.abs(r.change))}</td></tr>`).join("")}</table>`
            : `<p class="muted">Before and after shows when the game has two days with a change.</p>`)
        );
      })
      .join("");
  return `<div class="who"><b>Results</b> <span class="pill">${cpEsc(name)}</span>${people}<div class="row"><button data-a="report" data-o="${cl.owner}">Copy the report</button><button data-a="print" data-o="${cl.owner}">Print or save as PDF</button></div><div class="row">${
    stage === "grad"
      ? `<button data-a="stage" data-o="${cl.owner}" data-v="auto">Move back to the working stages</button>`
      : `<button data-a="stage" data-o="${cl.owner}" data-v="grad">Mark as graduated</button>`
  }</div></div>`;
}
/* The report of one client as a page to print. */
function cpxPrintHTML(cl) {
  return `<h1>${cpEsc(cl.names)}</h1><pre>${cpEsc(cpxReport(cl))}</pre>`;
}
/* Part of cpClick() in coachpage.js. Returns true when it did the tap. In the demo, a tap that would
   write to the database stays in the memory of the page. */
async function cpxClick(t, cl) {
  const a = t.dataset.a,
    o = t.dataset.o,
    mem = (kind, body) =>
      CP.notes.push({
        id: "m" + Date.now() + Math.random(),
        at: new Date().toISOString(),
        client: o || null,
        kind,
        body,
      });
  if (a === "demoon" || a === "demooff") {
    CPX.demo = a === "demoon";
    CPX.q = "";
    CPX.stage = "all";
    CP.open = null;
    CP.msg = "";
    CP.list = null;
    CP.notes = [];
    if (CPX.demo) cpxDemoLoad();
    else if (CP.session) {
      await cpLoad();
      return true;
    }
    cpDraw();
    return true;
  }
  if (a === "stagef") {
    CPX.stage = t.dataset.v;
    cpDraw();
    return true;
  }
  if (a === "report" && cl) {
    try {
      await navigator.clipboard.writeText(cpxReport(cl));
      CP.msg = "Copied the report. Paste it in an email or a note.";
    } catch (e) {
      report(e, "coachplus.js: report");
      CP.msg = "Copy did not work in this browser. Use Print or save as PDF.";
    }
    cpDraw();
    return true;
  }
  if (a === "print" && cl) {
    let el = document.getElementById("cpxprint");
    if (!el) {
      el = document.createElement("div");
      el.id = "cpxprint";
      document.body.appendChild(el);
    }
    el.innerHTML = cpxPrintHTML(cl);
    if (typeof print === "function") print();
    return true;
  }
  if (a === "stage" && cl) {
    const body = CPX_TAG + t.dataset.v;
    if (CPX.demo) mem("note", body);
    else await cpNote("note", o, body);
    CP.msg = t.dataset.v === "grad" ? "Marked as graduated." : "Back in the working stages.";
    cpDraw();
    return true;
  }
  if (!CPX.demo) return false;
  /* the demo: nothing goes to the database */
  if (a === "open") CP.msg = "This is a made-up client. With a real client, this opens their game.";
  else if (a === "seen" && cl) {
    mem("seen", JSON.stringify(Object.assign(cpSnap(cl), { seenAt: new Date().toISOString() })));
    CP.msg = "Marked as seen (in the demo only).";
  } else if (a === "note" && cl) {
    const el = document.getElementById("n-" + o),
      txt = el ? el.value.trim() : "";
    if (txt) mem("note", txt);
    CP.msg = txt ? "Note kept (in the demo only)." : "Type the note first.";
  } else if (a === "quest" && cl) {
    mem("quest", CP_QUESTS[+t.dataset.v].t);
    CP.msg = "With a real client, this goes to their Next Steps: " + CP_QUESTS[+t.dataset.v].t;
  } else if (a === "invite") CP.msg = "With your own account, this writes the invite in your mail app.";
  else if (a === "reload") cpxDemoLoad();
  else if (a === "out") {
    CPX.demo = false;
    return false;
  } else return false;
  cpDraw();
  return true;
}
/* Typing in the search box, or a new order: draw only the list again, so the box keeps the cursor. */
function cpxInput(el) {
  const f = el && el.dataset && el.dataset.f;
  if (f !== "q" && f !== "sort") return;
  CPX[f] = el.value;
  const box = document.getElementById("cpxlist");
  if (box) box.outerHTML = cpxList();
}
