/* ============================================================================
   SLAM the Game: features/rolemap.js
   PURPOSE     The Job of Existing (run JOE-1), feature 6: the household role map, "Who carries what".
               In a shared home (a couple, a poly or ENM household, roommates, family), each of the six
               unpaid jobs can go to one or more people, with taps. The view shows the admin time of the
               household, who carries which part, and its value (hours x the value of an hour). The
               labor method of "Sharing costs fairly" (fair.js) adds these hours to each person's work.
   INPUT       The profile: c.name, c.party (the people, pets left out), c.tp.chores (the time price of
               chores), the time ledger (timeLedger: the pay per hour), c.x.roleMap (the hand-offs of
               jobs.js and goalwire.js, and the jobs held here), and jobNow() of jobs.js. The open sheet
               (W.kind): rolemap.
   OUTPUT      Math (the adapter to core/jobs.js): rmPeople, rmKeyOf, rmAssign, rmHands, rmRate, rmNow,
               rmFairHours, rmBook. Views: rmSheet, rmJobRow. Parts of functions in other files:
               jobsSheetRoleMap (jobsSheet in jobs.js). Actions (ACT): rolemap, rmset, rmclear, rmundo,
               rmfair. Menu: "Who carries what".
   DEPENDS ON  core/jobs.js (jobCarry, jobHourValue), data/roles.js, features/jobs.js (jobNow), core/engine.js
               (timeLedger), screens/dash.js, features/kit.js, features/people.js (ppName),
               features/fair.js (frState, frPut: called at run time).
   RULES       Neutral words: no blame, no score, no "fair share" verdict. People by their own names, any
               number of people, never "partner 1". The math is in core/jobs.js (a copy of
               js/math/jobs.js). Every tap saves at once and can be undone. A job nobody tapped stays with
               the player.
   STORED      c.x.roleMap: the records of jobs.js keep { id, role, task, who, when }. This file adds records
               with task: null, one for each person who holds a job: { id, role, task: null, who: { k: "me"
               | "person", n: name, p: id of the person in c.party or null }, when: "YYYY-MM-DD" }.
               Compatibility: old records all have a task; readers of a task record are unchanged. A record
               with task: null has no exit, so jobClear and the undo of jobs.js never touch it.
   ========================================================================= */

/* ---------- math (the adapter from the profile to core/jobs.js) ---------- */
/* The household: the player first, then each person of "Your people" (not pets). Any number of people. */
function rmPeople(c) {
  const out = [{ key: "me", n: String(c.name || "You"), me: true }];
  (c.party || []).forEach((p, i) => {
    if (p.k === "Pet") return;
    out.push({ key: p.id ? "p:" + p.id : "n:" + ppName(c, i), n: ppName(c, i), p: p.id || null });
  });
  return out;
}
/* The key of the person of a record (who). */
function rmKeyOf(who) {
  if (!who) return null;
  if (who.k === "me") return "me";
  if (who.k !== "person") return null;
  return who.p ? "p:" + who.p : "n:" + who.n;
}
function rmList(c) {
  c.x = c.x || {};
  return (c.x.roleMap = Array.isArray(c.x.roleMap) ? c.x.roleMap : []);
}
/* Who holds each job: { jobId: [keys] }, from the records with no task. */
function rmAssign(c) {
  const o = {};
  rmList(c).forEach(m => {
    if (m.task != null || !JOB_ROLES[m.role]) return;
    const k = rmKeyOf(m.who);
    if (!k) return;
    o[m.role] = o[m.role] || [];
    if (!o[m.role].includes(k)) o[m.role].push(k);
  });
  return o;
}
/* The tasks handed to a person of the household: { taskId: key }. A person of a hand-off who is not in the
   list (for example "Someone at home") joins the household. */
function rmHands(c, N, P) {
  const o = {},
    J = jobOf(c);
  N.tasks.forEach(t => {
    const rec = J.exits[t.id];
    if (!rec || rec.e !== "hand" || !rec.map) return;
    const m = rmList(c).find(x => x.id === rec.map),
      k = m && rmKeyOf(m.who);
    if (!k) return;
    if (!P.some(p => p.key === k)) P.push({ key: k, n: m.who.n, p: m.who.p || null });
    o[t.id] = k;
  });
  return o;
}
/* The value of an hour of admin work: the time price of chores, else the pay per hour. */
function rmRate(c) {
  let wage = 0;
  try {
    wage = typeof timeLedger === "function" ? timeLedger(c).wage : 0;
  } catch (e) {
    report(e, "rolemap.js: rmRate");
  }
  return jobHourValue(c.tp && c.tp.chores, wage);
}
/* Everything the sheet shows, from one place. */
function rmNow(c) {
  const N = jobNow(c),
    P = rmPeople(c),
    hands = rmHands(c, N, P),
    assign = rmAssign(c),
    R = rmRate(c);
  return { N, P, assign, R, K: jobCarry(N.admin, N.tasks, N.exits, hands, assign, P, R.rate) };
}
/* For fair.js: each person's admin hours a month, by name (lower case). The player is under their own name. */
function rmFairHours(c) {
  const o = {};
  if (!c) return o;
  rmNow(c).K.people.forEach(p => {
    if (p.min > 0) o[String(p.n).trim().toLowerCase()] = p.min / 60;
  });
  return o;
}
/* The spreadsheet of the plan: the value of an hour, each person's minutes and value, who holds each job. */
function rmBook(c) {
  const S = rmNow(c),
    K = S.K,
    rows = [];
  if (S.P.length < 2) return { title: "Who carries what (household role map)", rows };
  const ok = K.rate != null;
  if (ok)
    rows.push({
      id: "rm_rate",
      label: "An hour of admin work is worth",
      v: K.rate,
      note: S.R.from === "tp" ? "Your time price for chores" : "Your pay per hour (the time ledger)",
    });
  K.people.forEach((p, i) => {
    rows.push({
      id: "rm_m" + i,
      label: p.n + ": admin minutes a month",
      v: p.min,
      note: "Each job's time left, split equally between its holders, plus the tasks handed to them",
    });
    if (ok)
      rows.push({ id: "rm_v" + i, label: p.n + ": its value a month", v: p.value, f: "={rm_m" + i + "}/60*{rm_rate}" });
  });
  rows.push({
    id: "rm_total",
    label: "The household: admin minutes a month",
    v: K.total,
    f: "=" + K.people.map((p, i) => "{rm_m" + i + "}").join("+"),
  });
  if (ok)
    rows.push({ id: "rm_value", label: "The household: its value a month", v: K.value, f: "={rm_total}/60*{rm_rate}" });
  JOB_IDS.forEach(id => {
    const b = K.byJob[id],
      names = b.holders.map(k => (K.people.find(p => p.key === k) || { n: k }).n);
    rows.push({
      id: "rm_j_" + id,
      label: JOB_ROLES[id].n + ": who holds it",
      v: names.join(", "),
      note: S.assign[id] && S.assign[id].length ? "Your taps" : "Nobody tapped yet, so it stays with you",
    });
  });
  return { title: "Who carries what (household role map)", rows };
}

/* ---------- views ---------- */
kitTerms({
  rolemap: [
    "Who carries what",
    "The six unpaid jobs of running your money, and who in your home does each one. One job can have more than one person. The time of a job is shared equally by the people who hold it.",
  ],
  laborcounts: [
    "Labor counts",
    "A way to split shared costs in Sharing costs fairly. Unpaid work at home gets a dollar value, and that value counts as money paid in.",
  ],
  householdadmin: [
    "Household admin time",
    "The time a month that everyone in your home spends on the six unpaid jobs, added up.",
  ],
  hourvalue: [
    "The value of an hour",
    "What one hour of this work is worth to you. SLAM uses your time price for chores. If you have not set it, SLAM uses your pay per hour.",
  ],
});
kitScreen(
  "rolemap",
  "Who carries what",
  "The unpaid jobs of your home, and who does each one.",
  "Tap people onto a job. Each tap saves, and each one can be undone."
);
/* One job: its name, the people as chips (tap to add or take off), and the time it takes. */
function rmJobRow(S, id) {
  const K = S.K,
    b = K.byJob[id],
    tapped = (S.assign[id] || []).length > 0,
    handed = Object.keys(b.handed).filter(k => b.handed[k] > 0);
  const sub =
    jobHoursWords(b.left) +
    " a month" +
    (b.holders.length > 1 ? ", shared by " + b.holders.length : tapped ? "" : " (with you until you tap)");
  return `<div class="tile stack rmjob" style="gap:6px"><div class="row between" style="gap:6px"><b class="small">${esc(JOB_ROLES[id].n)}</b>${ib("term:job_" + id)}</div><div class="chips">${S.P.map(
    p => {
      const on = b.holders.includes(p.key);
      return `<button class="chip ${on ? "on" : ""}" data-a="rmset" data-k="${id}" data-v="${esc(p.key)}" aria-pressed="${on}">${on ? "✓ " : ""}${esc(p.n)}</button>`;
    }
  ).join(
    ""
  )}</div><div class="tiny muted">${esc(sub)}${handed.length ? " Tasks handed to " + handed.map(k => esc((K.people.find(p => p.key === k) || { n: k }).n) + " (" + jobHoursWords(b.handed[k]) + ")").join(", ") + "." : ""}</div></div>`;
}
/* The sheet "Who carries what". */
function rmSheet() {
  const c = C(),
    w = W,
    S = rmNow(c),
    K = S.K,
    guess = S.N.admin.st === "Guess",
    ok = K.rate != null,
    alone = S.P.length < 2;
  const parts = K.people.map(p => ({ l: p.n, v: p.min }));
  const people = K.people
    .map(
      p =>
        `<div class="row between small rmperson" style="gap:8px"><span style="min-width:0">${esc(p.n)}${S.P.find(x => x.key === p.key && x.me) ? ' <span class="tiny muted">(you)</span>' : ""}</span><b data-fid="rm:${esc(p.key)}">${p.min > 0 ? jobHoursWords(p.min) + " a month" + (ok ? " · " + money(p.value) : "") : '<span class="muted">No job yet</span>'}</b></div>`
    )
    .join("");
  const rateLine = ok
    ? "At " +
      money(K.rate) +
      " an hour (" +
      (S.R.from === "tp" ? "your time price for chores" : "your pay per hour") +
      ")"
    : "Set your time prices to see a dollar value";
  return (
    head("Your unpaid jobs", "Who carries what " + ib("term:rolemap")) +
    dkCaption("The unpaid work of running your money, and who in your home does each part. Every part counts.") +
    (w.moved ? `<div class="banner small jbmoved" data-fid="rm:moved">${esc(w.moved)}</div>` : "") +
    dkStatRow([
      dkTile("Household admin time", jobHoursWords(K.total), { sub: "a month · " + S.N.admin.st, guess }),
      ok
        ? dkTile("Its value", money(K.value), { sub: "a month" })
        : dkTile("Its value", "Not set", { sub: "tap to set your time prices", act: "tp" }),
      dkTile("People", String(K.people.length), { sub: alone ? "just you for now" : "in your home" }),
    ]) +
    (alone
      ? dkCard(
          "It is just you here for now",
          `<div class="small">Add the people you share money or a home with. Then you can give each job to one or more of them.</div><button class="primary wide" data-a="party">Add your people</button>`
        )
      : "") +
    dkCard(
      "Who carries what",
      dkDonut(parts, { center: jobHoursWords(K.total), label: "Admin time by person" }) +
        `<div class="stack" style="gap:4px">${people}</div><div class="tiny muted">${esc(rateLine)}${ok ? "" : ` <button class="ghost slim" data-a="tp">Set my time prices</button>`}</div>`,
      { right: ib("term:hourvalue"), cap: "Time a month, and what it is worth" }
    ) +
    (alone
      ? ""
      : `<details class="rmjobs" ${w.open ? "open" : ""}><summary>Each job and who holds it</summary><div class="inner stack" style="gap:6px"><div class="tiny muted">Tap a name to give them the job. Tap again to take it off. A job can have more than one person. A job nobody tapped stays with you.</div>${JOB_IDS.map(id => rmJobRow(S, id)).join("")}</div></details>`) +
    (alone
      ? ""
      : `<div class="row" style="gap:6px;align-items:center"><button class="ghost wide" data-a="rmfair" style="flex:1">Use these hours in Sharing costs fairly</button>${ib("term:laborcounts")}</div>`) +
    (w.undo
      ? `<button class="ghost wide slim" data-a="rmundo">Undo</button>`
      : Object.keys(S.assign).length
        ? `<button class="ghost wide slim rmclear" data-a="rmclear">Give every job back to you</button>`
        : "") +
    mathBox([
      "Each job: the time you tapped on its sheet, or SLAM's guess until you tap. All six = " +
        jobHoursWords(S.N.admin.total) +
        " (" +
        S.N.admin.st +
        ").",
      "A task off the plate leaves the job. A task handed to a person of your home goes to that person.",
      "What is left of a job is shared equally by the people who hold it. A job nobody tapped stays with you.",
      "The household: everyone's time added up = " + jobHoursWords(K.total) + " a month.",
      ok
        ? "Value: hours × " +
          money(K.rate) +
          " an hour. " +
          jobHoursWords(K.total) +
          " = " +
          money(K.value) +
          " a month."
        : "Value: hours × the value of an hour. Set your time prices to see it.",
      "Sharing costs fairly, Labor counts: these hours are added to each person's work at home, by name.",
    ])
  );
}
/* Part of jobsSheet() in jobs.js. The row "Who carries what", under the two bars. */
function jobsSheetRoleMap(h) {
  try {
    const c = C(),
      n = rmPeople(c).length;
    return (
      h +
      `<button class="rowbtn" data-a="rolemap"><span><b>Who carries what</b><div class="tiny muted">${n > 1 ? "Share the six jobs with the " + (n - 1) + (n === 2 ? " person" : " people") + " in your home" : "Share the jobs with the people in your home"}</div></span><span class="caret"><i class=chev aria-hidden=true></i></span></button>`
    );
  } catch (e) {
    report(e, "rolemap.js: jobsSheetRoleMap");
    return h;
  }
}

/* ---------- actions ---------- */
function rmMoved(c, id, key, on) {
  const P = rmPeople(c),
    p = P.find(x => x.key === key),
    nm = p ? p.n : "Someone",
    holders = (rmAssign(c)[id] || []).map(k => (P.find(x => x.key === k) || { n: k }).n);
  return on
    ? nm +
        " holds " +
        JOB_ROLES[id].n +
        " now" +
        (holders.length > 1 ? ", with " + holders.filter(n => n !== nm).join(", ") : "") +
        "."
    : JOB_ROLES[id].n + ": " + (holders.length ? "now with " + holders.join(", ") : "back with you") + ".";
}
Object.assign(ACT, {
  rolemap: () => {
    W = { kind: "rolemap", open: true, undo: null, moved: null };
    sheet(rmSheet);
  },
  rmset: t => {
    const c = C(),
      id = t.dataset.k,
      key = String(t.dataset.v || ""),
      p = rmPeople(c).find(x => x.key === key);
    if (!JOB_ROLES[id] || !p) return;
    const L = rmList(c),
      mine = L.filter(m => m.task == null && m.role === id),
      has = mine.find(m => rmKeyOf(m.who) === key);
    let on;
    if (has) {
      c.x.roleMap = L.filter(m => m !== has);
      on = false;
    } else {
      L.push({
        id: "rm" + Date.now().toString(36) + L.length,
        role: id,
        task: null,
        who: p.me ? { k: "me", n: p.n, p: null } : { k: "person", n: p.n, p: p.p || null },
        when: todayISO(),
      });
      on = true;
    }
    if (W) {
      W.moved = rmMoved(c, id, key, on);
      W.undo = null;
    }
    save();
    drawSheet();
  },
  rmclear: () => {
    const c = C(),
      L = rmList(c);
    if (W) W.undo = L.filter(m => m.task == null).map(m => Object.assign({}, m));
    c.x.roleMap = L.filter(m => m.task != null);
    if (W) W.moved = "Every job is back with you. Undo puts the map back.";
    save();
    drawSheet();
  },
  rmundo: () => {
    const c = C();
    if (!W || !W.undo) return;
    rmList(c);
    W.undo.forEach(m => c.x.roleMap.push(m));
    W.undo = null;
    W.moved = "The map is back as it was.";
    save();
    drawSheet();
  },
  rmfair: () => {
    const c = C(),
      K = rmNow(c).K;
    if (typeof frState !== "function" || typeof ACT.fair !== "function") return;
    /* a first visit: the household of this map, not every profile of the game */
    if (!frState().ppl)
      frPut({
        ppl: [
          { n: String(c.name || "You"), from: c.led ? G.active : null, inc: c.led ? null : 3000, hrs: 5, nights: 7 },
        ],
      });
    const ppl = frState().ppl.slice(),
      has = n => ppl.some(p => String(p.n).trim().toLowerCase() === String(n).trim().toLowerCase());
    K.people.forEach(p => {
      if (!(p.min > 0) || has(p.n)) return;
      /* a stand-in guest of fair.js ("Person 2") takes the name first, and keeps its numbers */
      const i = ppl.findIndex(x => x.from == null && /^Person \d+$/.test(String(x.n)));
      if (i >= 0) ppl[i] = Object.assign({}, ppl[i], { n: p.n });
      else if (ppl.length < 6) ppl.push({ n: p.n, from: null, inc: 3000, hrs: 5, nights: 7 });
    });
    if (ppl.length < 2) ppl.push({ n: "Person 2", from: null, inc: 3000, hrs: 5, nights: 7 });
    frPut({ ppl });
    ACT.fair();
  },
});
kitMenu("Who carries what", "rolemap", "The six unpaid jobs of your home, and who holds each one", "jobs");
