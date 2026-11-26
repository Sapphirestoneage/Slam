/* ============================================================================
   SLAM the Game: features/careq.js
   PURPOSE     The Job of Existing, feature 5: the quests of the Health Care Admin and the Insurance
               Coordinator. The open enrollment check (November), saving HSA receipts (tax season), the
               FSA use-it-or-lose-it deadline (before the year ends), the EOB against the bill after a
               doctor visit, the renewal date of each policy (renters, auto, life, disability), and the
               yearly "Is my coverage still right?" (November, it opens Insurance needs). Each quest is a
               task of its job (data/roles.js), so the job cards count it and the four exits apply. Each
               date that is a rule of a plan is the person's own tap: SLAM shows no general date.
   INPUT       The profile: c.x.care (the dates and the visits), c.season (the seasonal items done),
               c.x.jobs (the exits, features/jobs.js). SEASONS and seasonItems (core/engine.js). The
               open sheet (W.kind): care (W.q: the quest, W.pick: the date being tapped).
   OUTPUT      Math: careOf, careDates, careDue, careTasks, careQuestOf, careBook. Views: careSheet,
               careTerms. Parts of functions in other files: todayExtrasCare (todayExtras in ui.js),
               resetsCare (resets in year.js). Actions (ACT): care, cqopen, cqmon, cqday, cqclear,
               cqdone, cqvisit, cqvisitdone. Menu: "Health and insurance quests".
   DEPENDS ON  core/jobs.js (jobDateNext), data/roles.js (CARE_QUESTS, JOB_TASKS, JOB_ROLES),
               core/engine.js (SEASONS, todayISO), screens/ui.js (GLOSS, head, esc), screens/dash.js,
               features/kit.js, features/jobs.js (jobTask, jobTaskRow, jobRoleLine, jobNow),
               features/year.js (dfmt), features/cover.js (the action cover).
   RULES       No rule date is guessed: an open enrollment window and an FSA deadline differ by employer
               and plan, so the person taps their own. Every term is a tap to the glossary. No red, no
               verdict words. Every date can be cleared, every Done is for this date only.
   STORED      c.x.care = { v: 1, dates: { oe: "MM-DD", fsa: "MM-DD", "renew:renters": "MM-DD",
               "renew:auto", "renew:life", "renew:disab" }, done: { "<key>@YYYY-MM-DD": "YYYY-MM-DD" },
               visits: [ { id, d: "YYYY-MM-DD", done: "YYYY-MM-DD" | null } ] }.
               COMPATIBILITY: a new optional field; an older save has none and shows every date as
               "Tap your date". The new seasonal items (tax:hsa, oe:enroll, oe:cover) use c.season
               like the others.
   ========================================================================= */

/* ---------- math ---------- */
function careOf(c) {
  c.x = c.x || {};
  const X = (c.x.care = c.x.care || { v: 1 });
  X.dates = X.dates || {};
  X.done = X.done || {};
  X.visits = X.visits || [];
  return X;
}
function careQuest(id) {
  return CARE_QUESTS.find(q => q.id === id) || null;
}
/* The date keys of one quest: its own date, or one for each policy. */
function careKeys(q) {
  return q.date ? [[q.date, q.n]] : (q.policies || []).map(p => ["renew:" + p[0], p[1] + " policy renews"]);
}
/* Each date the person tapped, with its next day and whether its reminder shows. */
function careDates(c, today) {
  today = today || todayISO();
  const X = careOf(c),
    out = [];
  CARE_QUESTS.forEach(q =>
    careKeys(q).forEach(([k, n]) => {
      const md = X.dates[k];
      if (!md) return;
      const N = jobDateNext(md, today, q.lead || 30);
      if (!N) return;
      out.push({ k, n, q: q.id, md, date: N.date, days: N.days, open: N.open, done: !!X.done[k + "@" + N.date] });
    })
  );
  return out;
}
/* The reminders that show today: a date in its window that is not done, and each doctor visit with its bill to check. */
function careDue(c, today) {
  today = today || todayISO();
  const out = careDates(c, today)
    .filter(x => x.open && !x.done)
    .map(x => ({
      id: "care:" + x.k + "@" + x.date,
      q: x.q,
      t: x.n + ": " + dfmt(x.date),
      d: (x.days === 0 ? "Today" : "In " + x.days + " day" + (x.days === 1 ? "" : "s")) + " · " + careQuest(x.q).n,
    }));
  careOf(c)
    .visits.filter(v => !v.done)
    .forEach(v =>
      out.push({
        id: "care:visit:" + v.id,
        q: "eob",
        t: "Check the bill against the EOB",
        d: "After your visit on " + dfmt(v.d),
      })
    );
  return out;
}
/* The quest of a seasonal item ("2026:oe:enroll" or "oe:enroll"), from the season list of its task. */
function careQuestOf(sid) {
  const key = String(sid).split(":").slice(-2).join(":");
  return (
    CARE_QUESTS.find(q => {
      const t = JOB_TASKS.find(x => x.id === q.task);
      return t && (t.season || []).includes(key);
    }) || null
  );
}
/* A task for each policy date the person tapped, for the four exits (features/jobs.js). */
function careTasks(c) {
  const X = careOf(c),
    q = careQuest("renew");
  return q.policies
    .filter(p => X.dates["renew:" + p[0]])
    .map(p => ({
      id: "c:renew:" + p[0],
      role: "insurance",
      n: p[1] + " policy renewal",
      per: 30,
      times: 1,
      src: "care",
      a: "care",
      v: "renew",
      auto: "Set the policy to renew by itself. SLAM reminds you a month before.",
    }));
}
/* The spreadsheet of the plan: each date the person tapped, and the reminder day. */
function careBook(c) {
  const rows = careDates(c).map((x, i) => ({
    id: "cq" + i,
    label: x.n + " (next)",
    v: x.date,
    note: "Your date. The reminder shows " + (careQuest(x.q).lead || 30) + " days before",
  }));
  return { title: "Health and insurance dates", rows };
}

/* ---------- views ---------- */
kitTerms({
  eob: [
    "EOB (explanation of benefits)",
    "A paper from your health plan after a visit. It shows what the plan paid and what you may owe. It is not a bill.",
  ],
  oopmax: [
    "Out-of-pocket max",
    "The most you pay for covered care in a plan year. After that, the plan pays the rest of covered care.",
  ],
  fsa: [
    "FSA (flexible spending account)",
    "Money from your pay, before tax, for health costs. Most of it must be used by your plan's deadline, or it is lost.",
  ],
  openenroll: [
    "Open enrollment",
    "The window each year when you pick or change your health plan. Your employer or the Marketplace sets the dates.",
  ],
  premium: ["Premium", "What you pay for a policy each month or each year, to keep it."],
  beneficiary: [
    "Beneficiary",
    "The person who gets the money of a life policy or an account when you die. You name them on a form.",
  ],
  renewal: [
    "Renewal date",
    "The day a policy ends and a new term starts. The price can change then, so it is a good day to compare.",
  ],
});
kitScreen(
  "care",
  "Health and insurance quests",
  "The yearly and seasonal tasks of the Health Care Admin and the Insurance Coordinator.",
  "Tap your own dates once. SLAM puts a reminder on Today before each one."
);
/* The words of a quest, each a tap to the glossary. */
function careTerms(list) {
  return `<div class="stack" style="gap:4px"><span class="dklabel">Words on this page</span><div class="chips">${list
    .filter(k => GLOSS[k])
    .map(
      k =>
        `<button class="chip cqterm" data-a="info" data-k="term:${k}">${esc(GLOSS[k][0].replace(/ \(.*\)$/, ""))} <span aria-hidden="true">ⓘ</span></button>`
    )
    .join("")}</div></div>`;
}
const CQ_DAYS = [1, 5, 10, 15, 20, 25, 31];
/* The two taps of a date: the month, then the day. */
function carePicker(c, k, w) {
  const md = careOf(c).dates[k],
    mm = w.pick && w.pick.k === k ? w.pick.mm : null;
  return `<div class="stack" style="gap:6px"><div class="chips">${DK_MON.map((m, i) => {
    const v = String(i + 1).padStart(2, "0");
    return `<button class="chip sm ${(mm || (md && md.slice(0, 2))) === v ? "on" : ""}" data-a="cqmon" data-k="${k}" data-v="${v}">${m}</button>`;
  }).join("")}</div>${
    mm
      ? `<div class="chips">${CQ_DAYS.map(d => `<button class="chip sm" data-a="cqday" data-k="${k}" data-v="${String(d).padStart(2, "0")}">${d === 31 ? "Last day" : d}</button>`).join("")}</div><div class="tiny muted">Tap the closest day.</div>`
      : `<div class="tiny muted">Tap the month, then the day.</div>`
  }</div>`;
}
/* One date row: the date, or "Tap your date", with its reminder line. */
function careDateRow(c, k, label, ask, w, lead) {
  const md = careOf(c).dates[k],
    N = md ? jobDateNext(md, todayISO(), lead) : null,
    open = (w.pick && w.pick.k === k) || !md;
  return `<div class="tile stack cqdate" style="gap:6px"><div class="row between" style="gap:8px"><span class="small"><b>${esc(label)}</b></span><b class="small" data-fid="cq:${k}">${N ? esc(dfmt(N.date)) : "Tap your date"}</b></div>${N ? `<div class="tiny muted">SLAM reminds you on Today from ${lead} days before.${N.open ? " That is now." : ""}</div>` : `<div class="tiny muted">Each plan sets its own date. It is on your benefits page or your policy.</div>`}${open ? carePicker(c, k, w) : `<div class="row" style="gap:8px"><button class="ghost slim" data-a="cqmon" data-k="${k}" data-v="${md.slice(0, 2)}">Change the date</button><button class="ghost slim" data-a="cqclear" data-k="${k}">Clear it</button></div>`}</div>`;
}
/* The sheet: the list of quests, or one quest. */
function careSheet() {
  const c = C(),
    w = W,
    t = todayISO();
  if (!w.q) {
    const due = careDue(c, t),
      dates = careDates(c, t),
      season = (typeof seasonItems === "function" ? seasonItems(c, t) : []).filter(x => careQuestOf(x.id));
    return (
      head("Me", "Health and insurance quests") +
      dkCaption("The yearly tasks of two of your unpaid jobs.") +
      dkStatRow([
        dkTile("Due now", String(due.length + season.length), { sub: "on Today" }),
        dkTile("Your dates", String(dates.length), { sub: "tapped once" }),
      ]) +
      ["health", "insurance"]
        .map(r =>
          dkCard(
            JOB_ROLES[r].n,
            `<div class="tiny muted">${esc(jobRoleLine(jobNow(c), r))}</div>` +
              CARE_QUESTS.filter(q => q.role === r)
                .map(q => {
                  const S = careKeys(q).filter(([k]) => careOf(c).dates[k]).length,
                    isDue = due.some(x => x.q === q.id) || season.some(x => careQuestOf(x.id) === q);
                  return `<button class="rowbtn cqrow" data-a="care" data-v="${q.id}"><span style="min-width:0"><b class="small">${esc(q.n)}</b><div class="tiny muted">${esc(q.steps[0])}</div></span><span class="row" style="gap:6px;flex:none">${isDue ? dkPill("Due") : S ? dkPill("Date set") : ""}<span class="caret">›</span></span></button>`;
                })
                .join(""),
            { right: ib("term:job_" + r) }
          )
        )
        .join("")
    );
  }
  const q = careQuest(w.q),
    task = jobTask(c, q.task);
  let b =
    head("Health and insurance", esc(q.n)) +
    dkCaption("Your " + JOB_ROLES[q.role].n + " quest. " + jobRoleLine(jobNow(c), q.role) + ".") +
    (w.win
      ? `<div class="levelup pop jbwin"><div class="eyebrow">A money win</div><div class="medal">+1</div><h2>${esc(w.win.title)}</h2>${w.win.lines.map(l => `<div class="small">${esc(l)}</div>`).join("")}</div>${typeof rcpInline === "function" ? rcpInline() : ""}`
      : w.moved
        ? `<div class="banner small jbmoved">${esc(w.moved.text)}</div>`
        : "");
  const due = careDue(c, t).filter(x => x.q === q.id && x.id.indexOf("care:visit:") !== 0),
    season = (typeof seasonItems === "function" ? seasonItems(c, t) : []).filter(x => careQuestOf(x.id) === q);
  due.concat(season).forEach(x => {
    b += `<div class="tile row between cqdue" style="gap:8px"><span class="small"><b>${esc(x.t)}</b><div class="tiny muted">${esc(x.d || x.s || "")}</div></span><button class="ghost slim" style="flex:none;white-space:nowrap" data-a="cqdone" data-v="${esc(x.id)}">Done for now</button></div>`;
  });
  b += dkCard("The steps", `<ol class="small cqsteps">${q.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>`);
  b += careTerms(q.terms);
  if (q.date) b += careDateRow(c, q.date, q.ask, "", w, q.lead);
  if (q.policies)
    b += q.policies
      .map(p => careDateRow(c, "renew:" + p[0], p[1] + " policy renews", "When does it renew?", w, q.lead))
      .join("");
  if (q.visit) {
    const V = careOf(c).visits.filter(v => !v.done);
    b +=
      `<button class="primary wide" data-a="cqvisit">I saw a doctor</button><div class="tiny muted">Tap it after a visit. SLAM puts "Check the bill against the EOB" on Today until you tap Done.</div>` +
      V.map(
        v =>
          `<div class="tile row between" style="gap:8px"><span class="small">Visit on ${esc(dfmt(v.d))}</span><button class="ghost slim" data-a="cqvisitdone" data-v="${esc(v.id)}">The bill matched</button></div>`
      ).join("");
  }
  if (q.go) b += `<button class="primary wide" data-a="${q.go}">Open Insurance needs</button>`;
  if (task)
    b +=
      `<div class="row between"><b class="small">Four ways out</b>${ib("term:fourexits")}</div>` +
      jobTaskRow(c, task, Object.assign({}, w, { open: task.id }));
  return b;
}
/* Part of todayExtras() in ui.js: the seasonal quests open their quest, and the dates and visits of the person. */
function todayExtrasCare(c, t, out) {
  try {
    out.forEach(x => {
      if (x.a === "sdone" && careQuestOf(x.id)) {
        x.a = "cqopen";
        x.l = "Open it";
      }
    });
    careDue(c, t).forEach(x => out.push({ id: x.id, t: x.t, d: x.d, a: "cqopen", l: "Open it" }));
  } catch (e) {
    report(e, "careq.js: todayExtrasCare");
  }
  return out;
}
/* Part of resets() in year.js: the dates of the person next to the things that reset each year. */
function resetsCare(c, today, rows) {
  try {
    const D2 = careDates(c, today),
      f = k => D2.find(x => x.k === k);
    const fsa = rows.find(r => r.n === "Health FSA");
    if (fsa && f("fsa")) fsa.one += " Yours: " + dfmt(f("fsa").date) + ".";
    rows.push({
      n: "Open enrollment",
      v: f("oe") ? "Closes " + dfmt(f("oe").date) : "Tap your date",
      one: "Your plan's window to pick next year's health plan. Health and insurance quests has the check.",
    });
    const pol = D2.filter(x => x.k.indexOf("renew:") === 0);
    rows.push({
      n: "Policy renewals",
      v: pol.length ? pol.length + " date" + (pol.length === 1 ? "" : "s") + " set" : "Tap your dates",
      one: pol.length
        ? pol.map(x => x.n.replace(" policy renews", "") + " " + dfmt(x.date)).join(", ") + "."
        : "Renters, auto, life, disability: tap the day each one renews.",
    });
  } catch (e) {
    report(e, "careq.js: resetsCare");
  }
  return rows;
}

/* ---------- actions ---------- */
Object.assign(ACT, {
  care: t => {
    const v = t && t.dataset ? t.dataset.v : null,
      q = v && careQuest(v);
    W = { kind: "care", q: q ? q.id : null, pick: null, here: q ? q.id : null };
    sheet(careSheet);
  },
  cqopen: t => {
    const id = String(t.dataset.v || "");
    let q = null;
    if (id.indexOf("care:visit:") === 0) q = careQuest("eob");
    else if (id.indexOf("care:") === 0) {
      const k = id.slice(5).split("@")[0];
      q = CARE_QUESTS.find(x => careKeys(x).some(z => z[0] === k));
    } else q = careQuestOf(id);
    ACT.care({ dataset: { v: q ? q.id : "" } });
  },
  cqmon: t => {
    if (!W) return;
    W.pick = { k: t.dataset.k, mm: t.dataset.v };
    drawSheet();
  },
  cqday: t => {
    const c = C(),
      w = W;
    if (!w || !w.pick || w.pick.k !== t.dataset.k) return;
    careOf(c).dates[t.dataset.k] = w.pick.mm + "-" + t.dataset.v;
    w.pick = null;
    w.moved = { text: "Saved. SLAM reminds you on Today before it." };
    w.win = null;
    save();
    render();
    drawSheet();
  },
  cqclear: t => {
    const c = C();
    delete careOf(c).dates[t.dataset.k];
    if (W) {
      W.pick = null;
      W.moved = { text: "Cleared. Tap a date again any time." };
    }
    save();
    render();
    drawSheet();
  },
  cqdone: t => {
    const c = C(),
      id = String(t.dataset.v || "");
    if (id.indexOf("care:") === 0) careOf(c).done[id.slice(5)] = todayISO();
    else {
      c.season = c.season || {};
      c.season[id] = true;
    }
    if (W) W.moved = { text: "Done for now. It comes back next time." };
    save();
    render();
    drawSheet();
  },
  cqvisit: () => {
    const c = C(),
      X = careOf(c);
    X.visits.push({ id: "v" + Date.now().toString(36) + X.visits.length, d: todayISO(), done: null });
    if (W) W.moved = { text: "Saved. Check the bill against the EOB is on Today now." };
    save();
    render();
    drawSheet();
  },
  cqvisitdone: t => {
    const c = C(),
      v = careOf(c).visits.find(x => x.id === t.dataset.v);
    if (!v) return;
    v.done = todayISO();
    if (W) W.moved = { text: "Done. That visit is checked." };
    save();
    render();
    drawSheet();
  },
});
kitMenu("Health and insurance quests", "care", "Open enrollment, HSA, FSA, the EOB, renewals", "jobs");
