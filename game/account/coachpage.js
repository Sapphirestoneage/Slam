/* ============================================================================
   SLAM the Game: account/coachpage.js
   PURPOSE     The coach page (coach.html). A roster of the clients who share their game with their
               coach: when each one was last active, the era, four top numbers, and an amber flag when
               one needs attention. For each client: what changed since last time, Open game, assign a
               quest into their Next Steps, session notes. For the roster: invite a client by email, and
               export to a sheet.
   INPUT       The Supabase client of the page (CP.sb). The table games (the rows that are shared),
               the table coach_notes and the function audit_write
               (supabase/migrations/20261124170000_roles_audit_coach.sql).
   OUTPUT      Functions that only work out values: cpGame, cpNums, cpFlags, cpSnap, cpDiff, cpAssign,
               cpPack, cpCsv, cpInvite, cpInviteUrl. Functions of the page: cpLoad, cpDraw, cpClick.
   PARTS       account/livecoach.js adds Live Session Mode by four named parts: lcLoad (cpLoad), lcCard
               (cpDraw), lcClientRow (cpClientCard), lcClick (cpClick).
   DEPENDS ON  core/report.js, account/supa.js (the two public settings), account/roles.js. With
               core/engine.js on the page, the era comes from derive(). Only coach.html loads this file.
   RULES       The database decides what a coach can read: only games with "Share with my coach" on.
               A coach's notes are the coach's. The client cannot read them. Each open of a game and
               each change writes a line in the audit log. Amber means "needs attention". No red.
   ========================================================================= */
const CP_PART = 180000; /* the size of one saved piece, the same as CL_PART in cloud.js */
const CP_STALE = 14; /* days with no save before the flag "quiet" */
const CP_QUESTS = [
  { t: "Bring your last pay stub to our next session", mins: 5 },
  { t: "List each debt with its balance and its rate", mins: 15 },
  { t: "Check your credit score, and tap the band in the game", mins: 10 },
  { t: "Set autopay for the minimum on each card", mins: 10 },
  { t: "Log what you spend for 7 days", mins: 5 },
  { t: "Open a savings account for your cushion and give it a name", mins: 20 },
  { t: "Do the fire drill: your pay stops tomorrow", mins: 10 },
  { t: "Log one debt payment in the game", mins: 2 },
  { t: "Make one number real: tap through Money coming in", mins: 5 },
  { t: "Pick one move to try, and run its fit check", mins: 10 },
];
const CP = {
  sb: null,
  session: null,
  roles: null,
  list: null,
  notes: [],
  notesOk: true,
  msg: "",
  busy: false,
  open: null,
};
const cpEsc = s =>
  String(s == null ? "" : s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]);
const cpUsd = n => (n < 0 ? "-" : "") + "$" + Math.round(Math.abs(+n || 0)).toLocaleString();
const cpDay = d => (d ? new Date(d).toLocaleDateString() : "never");
const cpSum = (a, f) => (a || []).reduce((t, x) => t + (f ? (f(x) ? +x.amt || 0 : 0) : +x.amt || 0), 0);
/* ---------- values only ---------- */
/* A saved game is stored in pieces. Put the pieces of one account back together. */
function cpGame(rows) {
  const by = {};
  (rows || []).forEach(r => (by[r.name] = r));
  const m = by.slam_meta;
  if (!m || !m.data) return null;
  let s = "";
  for (let i = 0; i < (m.data.n || 0); i++) {
    const p = by["slam_part_" + i];
    if (!p) return null;
    s += (p.data && p.data.s) || "";
  }
  try {
    return { g: JSON.parse(s), at: m.updated_at || null, n: m.data.n || 0, share: !!m.share_with_coach };
  } catch (e) {
    report(e, "coachpage.js: cpGame");
    return null;
  }
}
/* The four top numbers of one person, and the era. */
function cpNums(c) {
  const led = !!c.led,
    cash = led ? cpSum(c.cashes, x => !x.hold) : (c.months || 0) * (c.spend || 0),
    debt = led ? cpSum(c.debts) : c.debt || 0,
    costly = led ? cpSum(c.debts, x => x.high) : c.high === "yes" ? c.debt || 0 : 0,
    inv = led ? cpSum(c.invs) : c.inv || 0,
    spend = c.spend || 0;
  let era = null;
  try {
    if (typeof derive === "function") era = derive(c).era;
  } catch (e) {
    report(e, "coachpage.js: cpNums");
  }
  return {
    worth: cash + inv - debt,
    left: (c.take || 0) - spend,
    cushion: spend > 0 ? cash / spend : 0,
    costly,
    era,
    eraName: era != null && typeof ERAS !== "undefined" && ERAS[era] ? ERAS[era].n : "",
    real: led,
  };
}
/* Why a client needs attention now. An empty list means no flag. */
function cpFlags(cl, now, prev) {
  const out = [],
    days = cl.at ? Math.floor((now - new Date(cl.at).getTime()) / 864e5) : null;
  if (days != null && days >= CP_STALE) out.push("Quiet for " + days + " days");
  cl.people.forEach(p => {
    const who = cl.people.length > 1 ? p.name + ": " : "";
    if (!p.placed) out.push(who + "setup is not finished");
    else {
      if (p.n.left < 0) out.push(who + "spending is over pay by " + cpUsd(-p.n.left) + " a month");
      if (p.n.cushion < 1) out.push(who + "under one month of cushion");
      const was = prev && prev.people ? prev.people.find(q => q.name === p.name) : null;
      if (was && p.n.costly > was.costly + 50) out.push(who + "costly debt is up by " + cpUsd(p.n.costly - was.costly));
    }
  });
  return out;
}
/* What a coach saw: kept when the coach taps "Mark as seen". */
function cpSnap(cl) {
  return {
    at: cl.at,
    people: cl.people.map(p => ({
      name: p.name,
      worth: Math.round(p.n.worth),
      left: Math.round(p.n.left),
      cushion: Math.round(p.n.cushion * 10) / 10,
      costly: Math.round(p.n.costly),
      era: p.n.era,
      done: p.done,
    })),
  };
}
/* What changed since the snapshot, in plain lines. */
function cpDiff(prev, cl) {
  if (!prev || !prev.people) return ["First look: nothing to compare with yet."];
  const out = [];
  cl.people.forEach(p => {
    const w = prev.people.find(q => q.name === p.name),
      who = cl.people.length > 1 ? p.name + ": " : "";
    if (!w) {
      out.push(who + "new person in this game");
      return;
    }
    const d = (label, a, b, fmt, min) => {
      if (Math.abs(b - a) >= min)
        out.push(who + label + " " + (b > a ? "up" : "down") + " " + fmt(Math.abs(b - a)) + " (now " + fmt(b) + ")");
    };
    d("net worth", w.worth, p.n.worth, cpUsd, 50);
    d("left each month", w.left, p.n.left, cpUsd, 25);
    d("cushion", w.cushion, p.n.cushion, v => Math.round(v * 10) / 10 + " months", 0.2);
    d("costly debt", w.costly, p.n.costly, cpUsd, 50);
    if (w.era != null && p.n.era != null && w.era !== p.n.era)
      out.push(who + "era " + w.era + " to era " + p.n.era + (p.n.eraName ? " (" + p.n.eraName + ")" : ""));
    if (p.done > (w.done || 0)) out.push(who + (p.done - (w.done || 0)) + " more steps done");
  });
  return out.length ? out : ["No change in the numbers since you last looked."];
}
/* One client of the roster, from the game of the account. */
function cpClient(owner, G0) {
  const people = (G0.g.chars || [])
    .filter(c => c && !c.demo)
    .map((c, i) => ({
      i: (G0.g.chars || []).indexOf(c),
      name: c.name || "Someone",
      c /* the saved profile itself: coachplus.js reads its history for the milestones */,
      placed: !!c.placed,
      n: cpNums(c),
      done: ((c.x && c.x.plan) || []).filter(p => p.st === "done").length,
      open: ((c.x && c.x.plan) || []).filter(p => p.st !== "done" && p.st !== "na").length,
    }));
  return { owner, at: G0.at, people, names: people.map(p => p.name).join(", ") || "No one set up yet" };
}
/* Put one quest in the Next Steps of one person of a game. Returns the task, or null when it is there already. */
function cpAssign(g, ci, quest, todayStr, nowMs) {
  const c = g.chars && g.chars[ci];
  if (!c) return null;
  c.x = c.x || {};
  if (!Array.isArray(c.x.plan)) c.x.plan = [];
  if (c.x.plan.some(p => p.t === quest.t && p.st !== "done" && p.st !== "na")) return null;
  const task = {
    id: "plc" + nowMs.toString(36) + c.x.plan.length,
    t: quest.t,
    s: "From your coach",
    a: "",
    v: "",
    mins: quest.mins || 10,
    when: todayStr,
    slot: "Any",
    st: "todo",
    made: todayStr,
    coach: true,
  };
  c.x.plan.push(task);
  g.coachEdit = { at: nowMs, by: "coach" };
  g.savedAt = nowMs;
  return task;
}
/* A game as the rows to save: the pieces, then the row that says how many pieces. */
function cpPack(g, nowMs) {
  const s = JSON.stringify(g),
    n = Math.max(1, Math.ceil(s.length / CP_PART)),
    rows = [];
  for (let i = 0; i < n; i++)
    rows.push({ name: "slam_part_" + i, data: { s: s.slice(i * CP_PART, (i + 1) * CP_PART) } });
  rows.push({ name: "slam_meta", data: { n, at: nowMs, dev: "coach", len: s.length } });
  return rows;
}
/* The roster as CSV text, one row for each person. */
function cpCsv(list, now) {
  const q = v => {
      const t = String(v == null ? "" : v);
      return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    },
    rows = [
      [
        "Client",
        "Last active",
        "Era",
        "Net worth",
        "Left each month",
        "Months of cushion",
        "Costly debt",
        "Open steps",
        "Needs attention",
      ],
    ];
  (list || []).forEach(cl =>
    cl.people.forEach(p =>
      rows.push([
        p.name,
        cl.at ? new Date(cl.at).toISOString().slice(0, 10) : "",
        p.n.era == null ? "" : p.n.era,
        Math.round(p.n.worth),
        Math.round(p.n.left),
        Math.round(p.n.cushion * 10) / 10,
        Math.round(p.n.costly),
        p.open,
        cpFlags(cl, now).join("; "),
      ])
    )
  );
  return rows.map(r => r.map(q).join(",")).join("\n");
}
/* The link of the invite: the game, with the mark ?coach=1. A new account that arrives through it starts with
   "Share with my coach" on (suInvited in supa.js). An account from any other link starts with it off. */
function cpInviteUrl(page) {
  return String(page).replace(/coach\.html$/, "") + "?coach=1";
}
/* The invite: an email that the coach sends from their own mail app. */
function cpInvite(email, url) {
  const subject = "Your invite to SLAM the Game",
    body =
      "Hi,\n\nI use SLAM the Game with the people I coach. It is a money game: all taps, a few minutes at a time.\n\n1. Open " +
      url +
      "\n2. Tap Create an account and use this email address.\n3. This link turns on Share with my coach for your new account, so I can see your game and help you with it. You can turn it off under Menu, then My account.\n\nSee you there.";
  return (
    "mailto:" +
    encodeURIComponent(String(email || "").trim()) +
    "?subject=" +
    encodeURIComponent(subject) +
    "&body=" +
    encodeURIComponent(body)
  );
}
/* ---------- the page ---------- */
function cpLastSeen(owner) {
  const n = CP.notes.filter(x => x.kind === "seen" && x.client === owner).sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  if (!n) return null;
  try {
    return JSON.parse(n.body);
  } catch (e) {
    return null;
  }
}
async function cpNote(kind, client, body) {
  const row = { kind, client: client || null, body: String(body || "").slice(0, 4000) };
  if (CP.notesOk) {
    const r = await CP.sb.from("coach_notes").insert(row).select("id,at,client,kind,body").single();
    if (!r.error && r.data) {
      CP.notes.push(r.data);
      return true;
    }
    CP.notesOk = false;
  }
  /* before the migration: the notes stay on this device */
  const local = Object.assign({ id: "l" + Date.now(), at: new Date().toISOString() }, row);
  CP.notes.push(local);
  try {
    localStorage.setItem("slam_coach_notes", JSON.stringify(CP.notes.filter(x => String(x.id)[0] === "l")));
  } catch (e) {
    report(e, "coachpage.js: cpNote");
  }
  return true;
}
async function cpLoad() {
  /* coachplus.js: in the demo the roster is made-up clients, and nothing is read from the database */
  if (typeof cpxDemoLoad === "function" && cpxDemoLoad()) return cpDraw();
  cpDraw();
  CP.roles = await roLoad(CP.sb);
  if (!CP.roles.coach && !CP.roles.admin) {
    CP.list = [];
    cpDraw();
    return;
  }
  const me = CP.session.user.id,
    q = await CP.sb
      .from("games")
      .select("owner,name,data,updated_at,share_with_coach")
      .eq("share_with_coach", true)
      .neq("owner", me);
  const by = {};
  (q.data || []).forEach(r => (by[r.owner] = by[r.owner] || []).push(r));
  CP.list = Object.keys(by)
    .map(o => {
      const g = cpGame(by[o]);
      return g ? cpClient(o, g) : null;
    })
    .filter(Boolean)
    .sort((a, b) => (a.at < b.at ? 1 : -1));
  if (q.error) CP.msg = "The roster did not load. Check your internet and try again.";
  const n = await CP.sb
    .from("coach_notes")
    .select("id,at,client,kind,body")
    .order("at", { ascending: false })
    .limit(500);
  CP.notesOk = !n.error;
  CP.notes = n.error ? [] : n.data || [];
  if (n.error)
    try {
      CP.notes = JSON.parse(localStorage.getItem("slam_coach_notes") || "[]");
    } catch (e) {
      report(e, "coachpage.js: cpLoad");
    }
  roAudit(CP.sb, "view_roster", null, CP.list.length + " clients");
  if (typeof lcLoad === "function")
    await lcLoad(); /* livecoach.js: the invites and the sessions of Live Session Mode */
  cpDraw();
}
function cpClientCard(cl) {
  const now = Date.now(),
    prev = cpLastSeen(cl.owner),
    flags = cpFlags(cl, now, prev),
    notes = CP.notes
      .filter(x => x.kind === "note" && x.client === cl.owner && String(x.body).indexOf("#stage:") !== 0)
      .sort((a, b) => (a.at < b.at ? 1 : -1)),
    quests = CP.notes.filter(x => x.kind === "quest" && x.client === cl.owner),
    first = cl.people[0],
    who = CP.who && CP.who[cl.owner] != null ? CP.who[cl.owner] : first ? first.i : 0;
  return `<details class="card cl" data-o="${cl.owner}"${CP.open === cl.owner ? " open" : ""}><summary><span class="clsum"><b>${cpEsc(cl.names)}</b>${flags.length ? ` <span class="pill amber">Needs attention</span>` : ""}<span class="muted">Last active ${cpDay(cl.at)}${first && first.n.era != null ? " · Era " + first.n.era + (first.n.eraName ? ", " + cpEsc(first.n.eraName) : "") : ""}</span></span></summary><div class="inner">
  ${flags.length ? `<div class="flag">${flags.map(f => `<div>${cpEsc(f)}</div>`).join("")}</div>` : ""}
  ${cl.people
    .map(
      p =>
        `<div class="who"><b>${cpEsc(p.name)}</b> <span class="pill">${p.placed ? (p.n.real ? "Real numbers" : "Guesses so far") : "Not set up"}</span><div class="nums"><span>Net worth <b>${cpUsd(p.n.worth)}</b></span><span>Left each month <b>${cpUsd(p.n.left)}</b></span><span>Cushion <b>${Math.round(p.n.cushion * 10) / 10} months</b></span><span>Costly debt <b>${cpUsd(p.n.costly)}</b></span></div><div class="muted">${p.open} open ${p.open === 1 ? "step" : "steps"}, ${p.done} done</div></div>`
    )
    .join("")}
  <div class="who"><b>What changed since last time</b>${prev ? ` <span class="muted">You last looked on ${cpDay(prev.seenAt || prev.at)}</span>` : ""}<ul>${cpDiff(
    prev,
    cl
  )
    .map(l => `<li>${cpEsc(l)}</li>`)
    .join("")}</ul><button data-a="seen" data-o="${cl.owner}">Mark as seen</button></div>
  ${typeof cpxCard === "function" ? cpxCard(cl) : "" /* coachplus.js: the stage, the milestones, before and after */}
  ${typeof lcClientRow === "function" ? lcClientRow(cl) : "" /* livecoach.js: Start session */}
  <button class="primary wide" data-a="open" data-o="${cl.owner}" data-k="${cpEsc(cl.names)}">Open game</button><p class="muted">What you change there saves to their game, and they see a note that their coach made a change.</p>
  <div class="who"><b>Assign a quest</b><p class="muted">One tap puts it in their Next Steps, marked "From your coach".</p>${
    cl.people.length > 1
      ? `<div class="chips">${cl.people.map(p => `<button class="chip ${who === p.i ? "on" : ""}" data-a="who" data-o="${cl.owner}" data-v="${p.i}">${cpEsc(p.name)}</button>`).join("")}</div>`
      : ""
  }<div class="chips">${CP_QUESTS.map((qq, i) => `<button class="chip" data-a="quest" data-o="${cl.owner}" data-v="${i}">${cpEsc(qq.t)}</button>`).join("")}</div>${quests.length ? `<p class="muted">Assigned so far: ${quests.length}. Last: ${cpEsc(quests[quests.length - 1].body)}</p>` : ""}</div>
  <div class="who"><b>Session notes</b><p class="muted">Only you and the app owner can read these. Your client cannot.</p><label for="n-${cl.owner}">A note from this session</label><textarea id="n-${cl.owner}" rows="3"></textarea><button data-a="note" data-o="${cl.owner}">Save the note</button>${notes.length ? `<ul>${notes.map(x => `<li><span class="muted">${cpDay(x.at)}</span> ${cpEsc(x.body)}</li>`).join("")}</ul>` : `<p class="muted">No notes yet.</p>`}</div>
  </div></details>`;
}
function cpDraw() {
  const el = document.getElementById("app"),
    me = CP.session && CP.session.user ? CP.session.user.email : "";
  if (!CP.session && !(typeof CPX !== "undefined" && CPX.demo)) {
    el.innerHTML = `<h1>Coach sign-in</h1><p class="muted">For coaches of SLAM the Game. It is the same login as the game.</p><form class="card" id="f"><div><label for="e">Email</label><input id="e" type="email" autocomplete="email" required></div><div><label for="p">Password</label><input id="p" type="password" autocomplete="current-password" required></div><button class="primary wide" type="submit">Sign in</button>${CP.msg ? `<p class="muted">${cpEsc(CP.msg)}</p>` : ""}</form><a class="back" href="./">Back to the game</a>`;
    if (typeof cpxSignIn === "function") el.innerHTML += cpxSignIn(); /* coachplus.js: the door to the demo */
    return;
  }
  if (!CP.list || !CP.roles) {
    el.innerHTML = `<p class="muted">Checking…</p>`;
    return;
  }
  const top = `<div class="row"><a class="back btn" href="./">‹ Back to the game</a><button data-a="out">Sign out</button></div>${roHatsHTML("coach", CP.roles, true)}`;
  if (!CP.roles.coach && !CP.roles.admin) {
    el.innerHTML =
      top +
      `<h1>Not a coach</h1><div class="card"><p>You are signed in as <b>${cpEsc(me)}</b>. This page works for an account with the coach role. The app owner turns that role on.</p></div>`;
    return;
  }
  const flagged = CP.list.filter(cl => cpFlags(cl, Date.now(), cpLastSeen(cl.owner)).length).length;
  el.innerHTML =
    top +
    `<h1>Coach</h1><p class="muted">${me ? "Signed in as " + cpEsc(me) + ". " : ""}${CP.list.length} ${CP.list.length === 1 ? "client shares" : "clients share"} a game with you${flagged ? `, ${flagged} with a flag` : ""}.</p>` +
    (CP.msg ? `<p class="ok">${cpEsc(CP.msg)}</p>` : "") +
    (CP.notesOk
      ? ""
      : `<p class="flag">Notes, quests and "seen" marks stay on this device for now. They move to your account when the app owner runs the database file of 2026-11-24.</p>`) +
    (typeof cpxBar === "function" ? cpxBar() : "") /* coachplus.js: the demo line, totals, pipeline, search */ +
    (typeof lcCard === "function" ? lcCard() : "") /* livecoach.js: Start session with a new client, the invites */ +
    (CP.list.length
      ? typeof cpxList === "function"
        ? cpxList() /* coachplus.js: the roster after the search, the stage and the sort */
        : CP.list.map(cpClientCard).join("")
      : `<div class="card"><p>No one shares a game with you yet. A client shows up here when they sign in with "Share with my coach" on, which is the default.</p></div>`) +
    `<details class="card"><summary>Invite a client by email</summary><div class="inner"><label for="inv">Their email address</label><input id="inv" type="email" autocomplete="off"><button class="wide" data-a="invite">Write the invite in my mail app</button><p class="muted">It opens an email, ready to send, with the link and three steps. Nothing is sent until you send it.</p></div></details>` +
    `<details class="card"><summary>Export to a sheet</summary><div class="inner"><button class="wide" data-a="csv">Save the roster as a CSV file</button><p class="muted">One row for each person: last active, era, the four numbers, open steps, flags. Open it in Google Sheets or Excel.</p></div></details>` +
    `<button class="wide" data-a="reload">Check again</button>`;
}
async function cpSaveGame(owner, mutate) {
  const q = await CP.sb.from("games").select("id,name,data,updated_at,share_with_coach").eq("owner", owner);
  if (q.error) throw q.error;
  const G0 = cpGame(q.data);
  if (!G0) throw new Error("no saved game");
  const out = mutate(G0.g);
  if (out === null) return null;
  const ids = {},
    now = Date.now();
  q.data.forEach(r => (ids[r.name] = r.id));
  for (const row of cpPack(G0.g, now)) {
    const stamp = new Date(now).toISOString(),
      r = ids[row.name]
        ? await CP.sb.from("games").update({ data: row.data, updated_at: stamp }).eq("id", ids[row.name])
        : await CP.sb
            .from("games")
            .insert({ owner, name: row.name, data: row.data, updated_at: stamp, share_with_coach: true });
    if (r.error) throw r.error;
  }
  return out;
}
async function cpClick(t) {
  const a = t.dataset.a,
    o = t.dataset.o,
    cl = CP.list ? CP.list.find(x => x.owner === o) : null;
  if (o) CP.open = o;
  CP.msg = "";
  /* coachplus.js: the demo, the stages, the report. In the demo no tap writes to the database. */
  if (typeof lcClick === "function" && (await lcClick(t))) return; /* livecoach.js: the taps of Live Session Mode */
  if (typeof cpxClick === "function" && (await cpxClick(t, cl))) return;
  if (a === "out") {
    await CP.sb.auth.signOut();
    CP.session = null;
    CP.list = null;
    return cpDraw();
  }
  if (a === "reload") return cpLoad();
  if (a === "who") {
    CP.who = CP.who || {};
    CP.who[o] = +t.dataset.v;
    return cpDraw();
  }
  if (a === "open") {
    try {
      sessionStorage.setItem("su_as", o);
      sessionStorage.setItem("su_as_n", t.dataset.k || "");
    } catch (e) {
      report(e, "coachpage.js: open");
    }
    location.href = "./?as=" + encodeURIComponent(o);
    return;
  }
  if (a === "seen" && cl) {
    await cpNote("seen", o, JSON.stringify(Object.assign(cpSnap(cl), { seenAt: new Date().toISOString() })));
    CP.msg = "Marked as seen. The next changes are counted from now.";
    return cpDraw();
  }
  if (a === "note" && cl) {
    const el = document.getElementById("n-" + o),
      txt = el ? el.value.trim() : "";
    if (!txt) {
      CP.msg = "Type the note first.";
      return cpDraw();
    }
    await cpNote("note", o, txt);
    roAudit(CP.sb, "session_note", o, null);
    CP.msg = "Note saved.";
    return cpDraw();
  }
  if (a === "quest" && cl) {
    const quest = CP_QUESTS[+t.dataset.v],
      ci = CP.who && CP.who[o] != null ? CP.who[o] : cl.people[0] ? cl.people[0].i : 0;
    try {
      const task = await cpSaveGame(o, g => cpAssign(g, ci, quest, new Date().toISOString().slice(0, 10), Date.now()));
      if (task) {
        await cpNote("quest", o, quest.t);
        roAudit(CP.sb, "assign_quest", o, quest.t);
        CP.msg = "Added to their Next Steps: " + quest.t;
      } else CP.msg = "That quest is already on their list.";
    } catch (e) {
      report(e, "coachpage.js: quest");
      CP.msg =
        "That did not save. Their game may have grown by one piece, which needs the database file of 2026-11-24.";
    }
    return cpDraw();
  }
  if (a === "invite") {
    const el = document.getElementById("inv"),
      em = el ? el.value.trim() : "";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) {
      CP.msg = "Type their email address first.";
      return cpDraw();
    }
    await cpNote("invite", null, em);
    roAudit(CP.sb, "invite", null, em);
    location.href = cpInvite(em, cpInviteUrl(location.origin + location.pathname));
    return;
  }
  if (a === "csv") {
    const url = URL.createObjectURL(new Blob([cpCsv(CP.list, Date.now())], { type: "text/csv" })),
      el = document.createElement("a");
    el.href = url;
    el.download = "slam-roster-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(el);
    el.click();
    el.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    roAudit(CP.sb, "export", null, CP.list.length + " clients");
    CP.msg = "Saved the roster as a CSV file.";
    return cpDraw();
  }
}
