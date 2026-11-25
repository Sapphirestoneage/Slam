/* ============================================================================
   SLAM the Game: features/jobs.js
   PURPOSE     The Job of Existing (run JOE-1). (1) Your unpaid jobs: the six jobs of running your money,
               from answers the player already gave, on the character sheet and on Me ("You already
               work 6 jobs nobody pays you for."). A tap on a job opens its sheet: the next step of its
               trees, its hours, and its tasks. (2) Admin hours: "Hours a month running your money" in
               the time ledger, with Guess / Close / Exact, and the Home card Running it and Living it.
               (3) The four exits of each recurring task: Do it, Automate it, Hand it off, Drop it. Each
               one is undoable. A hand-off to a person, the coach or a tool writes one record of the
               household role map.
   INPUT       The profile: the answers of setup (work, incKinds, steady, home, live, deps, share,
               invest, accts, debtKinds, prot), c.debts, c.goals, c.cashes, c.party, c.routines,
               c.x.vault, c.x.kids, c.x.jobmins (the hours of each job, as { v, cf }), c.x.jobs (the
               exits), c.x.roleMap (the hand-offs). SEASONS (core/engine.js). The open sheet (W.kind):
               jobs, job, reveal.
   OUTPUT      Math: jobAnswers, jobOf, jobTasks, jobExit, jobExits, jobNow, jobNext, jobRoleLine,
               jobBook. Views: jobCard, jobsBlock, jobsSheet, jobSheet, jobTaskRow. Parts of functions in
               other files: rvSheetJobs (rvSheet in reveal.js), meTabJobs (meTab in ui.js), homeJobsRow
               (home in ui.js), ledgerCardJobs (ledgerCard in ui.js). Actions (ACT): jobs, job, jball,
               jbopen, jbexit, jbhand, jbundo. Menu: "Your unpaid jobs".
   DEPENDS ON  core/jobs.js (the math), data/roles.js (the jobs and tasks), core/engine.js, screens/ui.js,
               screens/dash.js, features/kit.js, features/reveal.js (homeRowAdd), features/people.js
               (ppName).
   RULES       The math is in core/jobs.js (a copy of js/math/jobs.js). The views show what it returns.
               A job with no tapped hours counts at its default as a Guess. "1% better", never "0%".
               Every exit can be undone. No verdict words. Hand it off never says "partner 1".
   STORED      c.x.jobmins = { cfo: { v: 60, cf: 2 }, ... }  (minutes a month; cf 1 Guess, 2 Close,
               3 Exact; kept by the kit's kitset and kitsure).
               c.x.jobs = { v: 1, exits: { taskId: { e: "do" | "auto" | "hand" | "drop", d: "YYYY-MM-DD",
               was: the auto switch of a schedule before (for undo), map: the id of a roleMap record } },
               last: { t: taskId, e, d } }.
               c.x.roleMap = [ { id, role, task, who: { k: "person" | "coach" | "tool", n: name, p: id of
               the person in c.party or null }, when: "YYYY-MM-DD" } ]  (any number of people).
   ========================================================================= */

/* ---------- math (the adapter from the profile to core/jobs.js) ---------- */
/* The answers that count, read from the profile. No new question. */
function jobAnswers(c) {
  const X = c.x || {},
    vault = X.vault && Array.isArray(X.vault.cards) ? X.vault.cards.length : 0;
  return {
    work: c.work,
    incKinds: c.incKinds || [],
    steady: c.steady,
    home: c.home,
    live: c.live || [],
    rel: c.rel,
    deps: c.deps,
    share: c.share,
    invest: c.invest,
    accts: c.accts || [],
    debtKinds: (c.debtKinds || []).concat((c.debts || []).map(x => x.k)),
    prot: c.prot || {},
    debts: (c.debts || []).filter(x => x.amt > 0).length || (c.debt > 0 ? 1 : 0),
    goals: (c.goals || []).filter(g => !g.done).length,
    kids: X.kids || 0,
    cards: vault + (c.debts || []).filter(x => /card/i.test(x.k || "")).length,
    banks: (c.cashes || []).filter(x => x.k !== "Cash at home").length,
    age: c.age,
  };
}
/* The store of the exits. */
function jobOf(c) {
  c.x = c.x || {};
  const J = (c.x.jobs = c.x.jobs || { v: 1, exits: {} });
  J.exits = J.exits || {};
  return J;
}
/* Every recurring task: the tasks of data/roles.js, the player's own schedules, each seasonal item that is not
   already one of those tasks, the two tasks of each wired goal (goalwire.js) and each policy date (careq.js). */
function jobTasks(c) {
  const out = JOB_TASKS.map(t => Object.assign({ src: "task" }, t)),
    inTask = {};
  JOB_TASKS.forEach(t => (t.season || []).forEach(s => (inTask[s] = t.id)));
  (c.routines || []).forEach(r => {
    const n = { week: 52, "2weeks": 26, "1and15": 24, month: 12 }[r.every] || 12;
    out.push({
      id: "r:" + r.id,
      role: r.t === "pay" ? "cfo" : "planner",
      n: typeof routineLabel === "function" ? routineLabel(c, Object.assign({}, r, { auto: false })) : "A schedule",
      per: 5,
      times: n,
      src: "routine",
      rid: r.id,
      auto: "Set it up in your bank as a repeating payment, then confirm it went through.",
    });
  });
  (typeof SEASONS !== "undefined" ? SEASONS : []).forEach(S =>
    S.items.forEach(it => {
      const key = S.k + ":" + it[0];
      if (inTask[key]) return;
      const role = it[3] && JOB_ROLES[it[3]] ? it[3] : JOB_SEASON_ROLE[S.k] || "cfo";
      out.push({ id: "s:" + key, role, n: it[1], per: 30, times: 1, src: "season", line: it[2] });
    })
  );
  if (typeof wireTasks === "function") wireTasks(c).forEach(t => out.push(t)); /* goalwire.js: each wired goal */
  if (typeof careTasks === "function") careTasks(c).forEach(t => out.push(t)); /* careq.js: each policy date */
  return out;
}
/* The exit of one task: the player's choice, or what the game already knows (a schedule set to automatic, or the
   automation skill of the task done). from: "you", "schedule" or "skill". */
function jobExit(c, t) {
  const rec = jobOf(c).exits[t.id];
  if (rec && rec.e) return { e: rec.e, from: "you", rec };
  if (t.src === "routine") {
    const r = (c.routines || []).find(x => x.id === t.rid);
    if (r && r.auto) return { e: "auto", from: "schedule", rec: null };
  }
  if (t.skill && typeof skillDone === "function" && skillDone(c, t.skill))
    return { e: "auto", from: "skill", rec: null };
  return { e: null, from: null, rec: null };
}
function jobExits(c, tasks) {
  const o = {};
  (tasks || jobTasks(c)).forEach(t => {
    const x = jobExit(c, t);
    if (x.e) o[t.id] = x.e;
  });
  return o;
}
/* Everything the screens show, from one place. */
function jobNow(c) {
  const tasks = jobTasks(c),
    exits = jobExits(c, tasks),
    admin = jobAdmin((c.x || {}).jobmins),
    roles = jobRoles(jobAnswers(c));
  return { roles, admin, tasks, exits, L: jobLiving(admin, tasks, exits) };
}
/* The next step of a job: the next skill of the first of its trees that has one. */
function jobNext(c, id) {
  const R = JOB_ROLES[id];
  if (!R || typeof SKILLS === "undefined") return null;
  for (const t of R.trees) {
    if (!SKILLS[t]) continue;
    const i = nextSkill(c, t);
    if (i >= 0) return { id: t + ":" + i, n: SKILLS[t].skills[i][0], tree: t };
  }
  return null;
}
/* "Insurance Coordinator: 2 of 4 tasks off your plate" */
function jobRoleLine(N, id) {
  const b = N.L.byRole[id] || { n: 0, m: 0 };
  return b.n + " of " + b.m + " tasks off your plate";
}
/* The spreadsheet of the plan: the hours of each job, the minutes given back, Running it and Living it. */
function jobBook(c) {
  const N = jobNow(c),
    rows = [];
  N.admin.rows.forEach(r =>
    rows.push({
      id: "jb_" + r.id,
      label: JOB_ROLES[r.id].n + ": minutes a month",
      v: r.min,
      note: r.given ? ["", "Guess", "Close", "Exact"][r.cf] : "Guess (SLAM's default)",
    })
  );
  rows.push({
    id: "jb_total",
    label: "Hours a month running your money, in minutes",
    v: N.admin.total,
    f: "=" + N.admin.rows.map(r => "{jb_" + r.id + "}").join("+"),
    note: N.admin.st,
  });
  N.admin.rows.forEach(r => {
    const b = N.L.byRole[r.id];
    rows.push({
      id: "jb_saved_" + r.id,
      label: JOB_ROLES[r.id].n + ": minutes a month given back (" + b.n + " of " + b.m + " tasks)",
      v: b.saved,
      note: "Each task off the plate: minutes each time × times a year ÷ 12, at most the minutes of the job",
    });
  });
  rows.push({
    id: "jb_living",
    label: "Living it: minutes a month given back",
    v: N.L.living,
    f: "=" + N.admin.rows.map(r => "{jb_saved_" + r.id + "}").join("+"),
  });
  rows.push({
    id: "jb_running",
    label: "Running it: minutes a month left",
    v: N.L.running,
    f: "={jb_total}-{jb_living}",
  });
  rows.push({
    id: "jb_pct",
    label: "Share given back",
    v: N.admin.total > 0 ? N.L.living / N.admin.total : 0,
    f: "={jb_living}/MAX({jb_total},1)",
  });
  return { title: "Your unpaid jobs (admin hours)", rows };
}

/* ---------- views ---------- */
kitTerms({
  job_cfo: ["CFO", JOB_ROLES.cfo.one],
  job_accountant: ["Accountant", JOB_ROLES.accountant.one],
  job_planner: ["Financial Planner", JOB_ROLES.planner.one],
  job_insurance: ["Insurance Coordinator", JOB_ROLES.insurance.one],
  job_health: ["Health Care Admin", JOB_ROLES.health.one],
  job_deals: ["Deals Manager", JOB_ROLES.deals.one],
  adminhours: [
    "Hours a month running your money",
    "The time the six unpaid jobs take you each month: the bills, the tracking, the taxes, the policies, the health papers and the deals. SLAM's job is to make it go down.",
  ],
  livingit: [
    "Running it and Living it",
    "Running it is the time your money still takes each month. Living it is the time you got back by moving tasks off your plate.",
  ],
  fourexits: [
    "The four ways out",
    "Do it: you keep the task. Automate it: it runs by itself. Hand it off: a person, your coach or a tool does it. Drop it: you stop doing it. Each one can be undone.",
  ],
});
kitScreen(
  "jobs",
  "Your unpaid jobs",
  "The six jobs of running your money, from your own answers.",
  "Move tasks off your plate to get time back."
);
kitScreen(
  "job",
  "One unpaid job",
  "Its next step, its hours a month, and its tasks.",
  "Each task has four ways out, and each one can be undone."
);
/* One job as a card: the name, the reason, the progress, and its "i". */
function jobCard(c, N, r) {
  const R = JOB_ROLES[r.id],
    b = N.L.byRole[r.id] || { n: 0, m: 0 };
  return `<div class="row jbrow" style="gap:6px;align-items:center"><button class="rowbtn jbrole" data-a="job" data-v="${r.id}" style="flex:1;min-width:0"><span style="min-width:0;flex:1"><b>${esc(R.n)}</b><div class="tiny muted">${esc(r.why[0] || "Everyone holds this job a little")}</div><div class="tiny"><b data-fid="jb:${r.id}">${b.n} of ${b.m}</b> tasks off your plate</div>${dkProgress(b.m ? (b.n / b.m) * 100 : 0)}</span><span class="caret">›</span></button>${ib("term:job_" + r.id)}</div>`;
}
/* The block "You already work 6 jobs nobody pays you for.": the top 3, and See all. */
function jobsBlock(c, all, seeAct) {
  const N = jobNow(c),
    list = all ? N.roles : N.roles.slice(0, 3);
  return `<div class="card stack jbblock" style="gap:8px"><div class="row between" style="gap:8px"><b>You already work 6 jobs nobody pays you for.</b>${ib("term:adminhours")}</div><div class="tiny muted">From your own answers. ${all ? "All six, the biggest first." : "Your top 3."}</div>${list.map(r => jobCard(c, N, r)).join("")}${seeAct === "close" ? "" : `<button class="ghost wide slim" data-a="${seeAct || "jball"}">${all ? "Show my top 3" : "See all 6"}</button>`}</div>`;
}
/* The two bars: Running it and Living it. */
function jobBars(N) {
  const tot = N.L.running + N.L.living || 1,
    g = N.admin.st === "Guess";
  return `<div class="stack" style="gap:6px"><div class="row between small"><span>Running it</span><b class="${g ? "guess" : ""}" data-fid="jb:run">${jobHoursWords(N.L.running)} a month</b></div><div class="jbrun">${dkProgress((N.L.running / tot) * 100)}</div><div class="row between small"><span>Living it</span><b data-fid="jb:live">${jobHoursWords(N.L.living)} a month back</b></div>${dkProgress((N.L.living / tot) * 100)}<div class="small jbbetter" data-fid="jb:better">${esc(jobBetterWords(N.L))}</div></div>`;
}
function jobMath(N) {
  return mathBox([
    "Each job: the time you tapped, or SLAM's guess until you tap: " +
      N.admin.rows.map(r => JOB_ROLES[r.id].n + " " + jobHoursWords(r.min)).join(", ") +
      ".",
    "Hours a month running your money: all six added up = " + jobHoursWords(N.admin.total) + " (" + N.admin.st + ").",
    "Living it: each task you moved off your plate gives back its minutes a month (minutes each time × times a year ÷ 12), at most the time of its job = " +
      jobHoursWords(N.L.living) +
      ".",
    "Running it: " +
      jobHoursWords(N.admin.total) +
      " − " +
      jobHoursWords(N.L.living) +
      " = " +
      jobHoursWords(N.L.running) +
      ".",
    "Better: Living it ÷ the hours a month, as a percent. Once one minute comes back it shows at least 1%.",
  ]);
}
/* The sheet of all six jobs. */
function jobsSheet() {
  const c = C(),
    N = jobNow(c);
  return (
    head("Me", "Your unpaid jobs") +
    dkCaption("SLAM does the job of existing for you. Less time running your money, more time living.") +
    dkStatRow([
      dkTile("Hours a month", jobHoursWords(N.admin.total), {
        sub: "running your money · " + N.admin.st,
        guess: N.admin.st === "Guess",
      }),
      dkTile("Given back", jobHoursWords(N.L.living), { sub: N.L.living > 0 ? N.L.better + "% better" : "a month" }),
    ]) +
    dkCard("Running it and Living it", jobBars(N) + jobMath(N), { right: ib("term:livingit") }) +
    jobsBlock(c, true, "close")
  );
}
/* The question "About how long a month?" of one job, by the kit (tap a preset, then Guess / Close / Exact). */
function jobMinsAsk(c, id) {
  return kitAsk(c, "jobmins", id, "About how long a month does this job take?", JOB_PRESETS, JOB_DEFAULT[id], {
    term: "adminhours",
    help: "Count every task as if you did it yourself. Tasks you move off your plate come off it.",
  });
}
/* One task row: collapsed, it shows the name, the minutes and the exit; open, the four exits. */
function jobTaskRow(c, t, w) {
  const x = jobExit(c, t),
    open = w.open === t.id,
    mo = jobTaskMonthly(t),
    words = jobSaveWords(mo),
    pill = { do: "You do it", auto: "Automated", hand: "Handed off", drop: "Dropped" }[x.e] || "On your plate",
    rec = x.rec,
    mapRec = rec && rec.map ? ((c.x || {}).roleMap || []).find(m => m.id === rec.map) : null,
    sub =
      x.e === "hand" && mapRec
        ? "Handed to " + mapRec.who.n
        : x.from === "schedule"
          ? "Your schedule runs by itself"
          : x.from === "skill"
            ? "Automated by a skill you did"
            : words || "";
  let h = `<button class="rowbtn jbtask ${x.e && x.e !== "do" ? "jboff" : ""}" data-a="jbopen" data-v="${esc(t.id)}"><span style="min-width:0"><b class="small">${esc(t.n)}</b><div class="tiny muted">${esc(sub)}</div></span><span class="pill ${x.e && x.e !== "do" ? "okp" : ""}" style="flex:none">${pill}</span></button>`;
  if (!open) return h;
  const hand = w.hand === t.id;
  h += `<div class="tile stack jbexits" style="gap:8px">${words ? `<div class="small">Moving it off your plate ${esc(words)}.</div>` : ""}${mathBox(jobTaskMath(t))}<div class="row between"><span class="tiny muted">Four ways out</span>${ib("term:fourexits")}</div><div class="grid2">${JOB_EXITS.map(e => `<button class="${x.e === e[0] || (e[0] === "hand" && hand) ? "primary" : "ghost"} slim" data-a="jbexit" data-k="${esc(t.id)}" data-v="${e[0]}" ${x.from && x.from !== "you" ? "disabled" : ""}>${e[1]}</button>`).join("")}</div>`;
  if (x.from && x.from !== "you")
    h += `<div class="tiny muted">${x.from === "schedule" ? "Turn the schedule back to by hand on Next Steps to change this." : "Undo the skill to change this."}</div>`;
  if (hand) {
    const P = (c.party || []).map((p, i) => [p, i]).filter(z => z[0].k !== "Pet"),
      tools = JOB_TOOLS[t.role] || [];
    h += `<div class="stack" style="gap:6px"><div class="small"><b>Who takes it?</b></div><div class="chips">${P.map(z => `<button class="chip" data-a="jbhand" data-k="${esc(t.id)}" data-v="p:${esc(z[0].id || String(z[1]))}">${esc(ppName(c, z[1]))}</button>`).join("")}${P.length ? "" : `<button class="chip" data-a="jbhand" data-k="${esc(t.id)}" data-v="home">Someone at home</button>`}<button class="chip" data-a="jbhand" data-k="${esc(t.id)}" data-v="coach">My coach</button>${tools.map((n, i) => `<button class="chip" data-a="jbhand" data-k="${esc(t.id)}" data-v="t:${i}">${esc(n)}</button>`).join("")}</div><div class="tiny muted">Tap who takes it. You can undo it any time.</div></div>`;
  }
  if (x.from === "you") h += `<button class="ghost slim" data-a="jbundo" data-v="${esc(t.id)}">Undo</button>`;
  if (x.e === "auto" && x.from === "you" && t.skill && !skillDone(c, t.skill) && typeof SKILLS !== "undefined") {
    const s = t.skill.split(":");
    h += `<button class="ghost slim" data-a="skill" data-v="${esc(t.skill)}">Set it up: ${esc(SKILLS[s[0]].skills[+s[1]][0])}</button>`;
  } else if (x.e === "auto" && x.from === "you" && t.auto) h += `<div class="tiny muted">${esc(t.auto)}</div>`;
  if (t.a && !hand && (x.e === "do" || !x.e) && !(w.kind === t.a && w.here === t.v))
    h += `<button class="ghost slim" data-a="${t.a}"${t.v ? ` data-v="${esc(t.v)}"` : ""}>Open it now</button>`;
  return h + `</div>`;
}
/* The sheet of one job. */
function jobSheet() {
  const c = C(),
    w = W,
    id = w.role,
    R = JOB_ROLES[id],
    N = jobNow(c),
    r = N.roles.find(x => x.id === id),
    nx = jobNext(c, id),
    tasks = N.tasks.filter(t => t.role === id),
    b = N.L.byRole[id],
    mv = w.moved;
  const moved =
    (w.win
      ? `<div class="levelup pop jbwin"><div class="eyebrow">A money win</div><div class="medal">+1</div><h2>${esc(w.win.title)}</h2>${w.win.lines.map(l => `<div class="small">${esc(l)}</div>`).join("")}<div class="tiny muted" style="margin-top:6px">You can undo it any time, below.</div></div>`
      : "") + (mv && !w.win ? `<div class="banner small jbmoved" data-fid="jb:moved">${esc(mv.text)}</div>` : "");
  const first = tasks.slice(0, 3),
    rest = tasks.slice(3);
  return (
    head("Your unpaid jobs", esc(R.n) + " " + ib("term:job_" + id)) +
    dkCaption(R.one) +
    moved +
    dkStatRow([
      dkTile("Off your plate", `<span data-fid="jbs:n">${b.n} of ${b.m}</span>`, { sub: "tasks" }),
      dkTile("Given back", `<span data-fid="jbs:s">${Math.round(b.saved)} min</span>`, { sub: "a month" }),
    ]) +
    (r && r.why.length
      ? `<div class="tiny muted">Why you: ${esc(r.why.slice(0, 3).join(". "))}.</div>`
      : `<div class="tiny muted">Everyone holds this job a little.</div>`) +
    (nx
      ? `<button class="primary wide" data-a="skill" data-v="${esc(nx.id)}">Next step: ${esc(nx.n)}</button>`
      : `<div class="tile small">Every skill of this job is done.</div>`) +
    `<div class="row between"><b class="small">Tasks of this job</b>${ib("term:fourexits")}</div>` +
    first.map(t => jobTaskRow(c, t, w)).join("") +
    (rest.length
      ? `<details ${rest.some(t => t.id === w.open) ? "open" : ""}><summary>More tasks (${rest.length})</summary><div class="inner stack">${rest.map(t => jobTaskRow(c, t, w)).join("")}</div></details>`
      : "") +
    jobMinsAsk(c, id)
  );
}
/* Part of rvSheet() in reveal.js. The jobs block on the character sheet, under the name. */
function rvSheetJobs(h) {
  try {
    const c = C(),
      blk = jobsBlock(c, !!(W && W.jball));
    const at = h.indexOf('<div class="tiny muted">No dollar amounts');
    return at >= 0 ? h.slice(0, at) + blk + h.slice(at) : h + blk;
  } catch (e) {
    report(e, "jobs.js: rvSheetJobs");
    return h;
  }
}
/* Part of meTab() in ui.js. The jobs block, under the row of the character sheet. */
function meTabJobs(h) {
  try {
    const c = C(),
      blk = jobsBlock(c, false, "jobs"),
      m = h.match(/<button class="rowbtn" data-a="reveal">[\s\S]*?<\/button>/);
    if (m) return h.replace(m[0], () => m[0] + blk);
    return h.replace(/(<h1>[^<]*<\/h1>)/, x => x + blk);
  } catch (e) {
    report(e, "jobs.js: meTabJobs");
    return h;
  }
}
/* Part of home() in ui.js. The card Running it and Living it, under the four tiles. */
function homeJobsRow(h) {
  try {
    const c = C();
    if (!c || !(c.placed || G.demo) || typeof homeRowAdd !== "function") return h;
    const N = jobNow(c);
    return homeRowAdd(
      h,
      `<div class="homerow jbhome">${dkCard("Your money's admin time", jobBars(N) + `<button class="ghost wide slim" data-a="jobs">See your 6 unpaid jobs ›</button>`, { right: ib("term:livingit"), cap: "Hours a month running your money, and the time you got back" })}</div>`
    );
  } catch (e) {
    report(e, "jobs.js: homeJobsRow");
    return h;
  }
}
/* Part of ledgerCard() in ui.js. The tile "Hours a month running your money". */
function ledgerCardJobs(c) {
  try {
    const N = jobNow(c);
    return `<div class="tile" style="margin-top:8px"><div class="row between" style="gap:6px"><span class="tiny muted">Hours a month running your money</span><span class="row" style="gap:6px">${kitPill(N.admin.st)}${ib("term:adminhours")}</span></div><div class="big ${N.admin.st === "Guess" ? "guess" : ""}" data-fid="v:admin">${jobHoursWords(N.admin.total)}</div><div class="tiny muted">${N.L.living > 0 ? jobHoursWords(N.L.living) + " a month back for living · " + N.L.better + "% better" : "The six unpaid jobs of running your money"}</div><button class="ghost wide slim" style="margin-top:6px" data-a="jobs">Set the hours of each job</button></div>`;
  } catch (e) {
    report(e, "jobs.js: ledgerCardJobs");
    return "";
  }
}

/* ---------- actions ---------- */
function jobTask(c, id) {
  return jobTasks(c).find(t => t.id === id) || null;
}
/* The line of the banner after a change: what moved and why. */
function jobMovedText(c, t, e) {
  const N = jobNow(c),
    nm = JOB_ROLES[t.role].n,
    w = jobSaveWords(jobTaskMonthly(t));
  if (!e) return "Back on your plate: " + t.n + ". " + nm + ": " + jobRoleLine(N, t.role) + ".";
  if (e === "do") return "You keep this one: " + t.n + ". It stays on your plate, on purpose.";
  const verb = { auto: "Automated", hand: "Handed off", drop: "Dropped" }[e];
  return verb + ": " + t.n + ". " + nm + ": " + jobRoleLine(N, t.role) + "." + (w ? " It " + w + "." : "");
}
function jobSet(c, t, e, extra) {
  const J = jobOf(c),
    old = J.exits[t.id];
  /* undo the side effects of the old choice first */
  if (old) jobClear(c, t, old);
  const rec = Object.assign({ e, d: todayISO() }, extra || {});
  if (e === "auto" && t.src === "routine") {
    const r = (c.routines || []).find(x => x.id === t.rid);
    if (r) {
      rec.was = !!r.auto;
      r.auto = true;
    }
  }
  J.exits[t.id] = rec;
  J.last = { t: t.id, e, d: rec.d };
}
function jobClear(c, t, old) {
  if (old.was != null && t.src === "routine") {
    const r = (c.routines || []).find(x => x.id === t.rid);
    if (r) r.auto = old.was;
  }
  if (old.map && c.x && Array.isArray(c.x.roleMap)) c.x.roleMap = c.x.roleMap.filter(m => m.id !== old.map);
}
Object.assign(ACT, {
  jobs: () => {
    W = { kind: "jobs" };
    sheet(jobsSheet);
  },
  job: t => {
    const id = t.dataset.v;
    if (!JOB_ROLES[id]) return;
    W = { kind: "job", role: id, open: null, hand: null, moved: null };
    sheet(jobSheet);
  },
  jball: () => {
    if (!W) return;
    W.jball = !W.jball;
    drawSheet();
  },
  jbopen: t => {
    if (!W || W.kind !== "job") return;
    W.open = W.open === t.dataset.v ? null : t.dataset.v;
    W.hand = null;
    drawSheet();
  },
  jbexit: t => {
    const c = C(),
      w = W,
      task = jobTask(c, t.dataset.k),
      e = t.dataset.v;
    if (!w || !task || !JOB_EXITS.some(x => x[0] === e)) return;
    const x = jobExit(c, task);
    if (x.from && x.from !== "you") return;
    if (e === "hand") {
      w.hand = w.hand === task.id ? null : task.id;
      drawSheet();
      return;
    }
    jobSet(c, task, e);
    w.hand = null;
    w.moved = { text: jobMovedText(c, task, e) };
    save();
    render();
    if (e === "auto") {
      /* The win path of the game: the badge, the buzz, and the level-up card (inline, so the job stays open). */
      const N = jobNow(c),
        badge = addBadge(c, "jobauto", "First task on autopilot"),
        lines = [JOB_ROLES[task.role].n + ": " + jobRoleLine(N, task.role), jobBetterWords(N.L), badge].filter(Boolean);
      if (badge) save();
      if (typeof celebrateBuzz === "function") celebrateBuzz();
      LASTWIN = { title: "On autopilot: " + task.n, lines };
      w.win = { title: "On autopilot: " + task.n, lines };
    } else w.win = null;
    drawSheet();
  },
  jbhand: t => {
    const c = C(),
      w = W,
      task = jobTask(c, t.dataset.k),
      v = String(t.dataset.v || "");
    if (!w || !task) return;
    let who = null;
    if (v === "coach") who = { k: "coach", n: "My coach", p: null };
    else if (v === "home") who = { k: "person", n: "Someone at home", p: null };
    else if (v.indexOf("t:") === 0) {
      const n = (JOB_TOOLS[task.role] || [])[+v.slice(2)];
      if (n) who = { k: "tool", n, p: null };
    } else if (v.indexOf("p:") === 0) {
      const pid = v.slice(2),
        P = c.party || [],
        i = P.findIndex((p, k) => (p.id || String(k)) === pid);
      if (i >= 0) who = { k: "person", n: ppName(c, i), p: P[i].id || null };
    }
    if (!who) return;
    c.x = c.x || {};
    c.x.roleMap = Array.isArray(c.x.roleMap) ? c.x.roleMap : [];
    const id = "rm" + Date.now().toString(36) + c.x.roleMap.length;
    jobSet(c, task, "hand", { map: id });
    c.x.roleMap.push({ id, role: task.role, task: task.id, who, when: todayISO() });
    w.hand = null;
    w.win = null;
    w.moved = { text: jobMovedText(c, task, "hand") + " " + who.n + " has it now." };
    save();
    render();
    drawSheet();
  },
  jbundo: t => {
    const c = C(),
      w = W,
      task = jobTask(c, t.dataset.v),
      J = jobOf(c);
    if (!w || !task || !J.exits[task.id]) return;
    jobClear(c, task, J.exits[task.id]);
    delete J.exits[task.id];
    J.last = { t: task.id, e: null, d: todayISO() };
    w.hand = null;
    w.win = null;
    w.moved = { text: jobMovedText(c, task, null) };
    save();
    render();
    drawSheet();
  },
});
kitMenu("Your unpaid jobs", "jobs", "The six jobs of running your money, and the time you get back", "fair");
