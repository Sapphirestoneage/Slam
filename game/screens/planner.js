/* ============================================================================
   SLAM the Game: screens/planner.js
   PURPOSE     The navigation (a tab bar at the bottom, and a menu for all other screens), the plan (a
               calendar of money tasks, the tab "Next Steps"), the check-in before and after payday, and
               the fast setup that moves the last screens to week 1.
   INPUT       The game: G.active, G.chars, G.demo. The profile: c.x.later, c.x.plan, c.x.weekMins. The
               open sheet (W.kind): auto, pladd, plpost, plpre, plst, ready, routine. The taps of the
               player (the actions in OUTPUT).
   OUTPUT      55 functions. Parts of functions in other files: renderPlan, renderPlanBars,
               finishSetupPlanStart, finishSetupPlanEnd, setupSheetPlan, goNav, homePlanLine. Actions
               (ACT): menu, menugo, navback, navfwd, plview, plmon, plpick, plcap, plst, plgo, plset,
               plmode, plo, plwhen, and 19 more.
   DEPENDS ON  core/report.js, core/engine.js, account/gate.js, screens/ui.js, features/games.js,
               screens/profiles.js, screens/smart.js.
   USES LATER  Names from files that the browser loads later. Behind a typeof test, thus safe while the
               page loads: account/cloud.js, screens/ux.js, features/missions.js, features/fold.js,
               features/fork.js, features/ideasz.js, features/paths.js, features/questlog.js. With no typeof test, thus safe only after the page
               has loaded all files: features/missions.js (planTabMissions).
   ========================================================================= */

/* ---------- small helpers ---------- */
const PL_DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  PL_DOWL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const plDow = s => parseISO(s).getDay();
const plDay = s => {
  const t = todayISO();
  return s === t
    ? "Today"
    : s === addDays(t, 1)
      ? "Tomorrow"
      : s === addDays(t, -1)
        ? "Yesterday"
        : PL_DOW[plDow(s)] + " " + nice(s);
};
const PL_SLOTS = [
  ["Morning", "Morning"],
  ["Lunch", "Lunch"],
  ["After work", "After work"],
  ["Evening", "Evening"],
  ["Night", "Late night"],
  ["Any", "Any time"],
];
const plSlotN = k => (PL_SLOTS.find(x => x[0] === k) || [0, ""])[1];
const plSlotI = k => {
  const i = PL_SLOTS.findIndex(x => x[0] === k);
  return i < 0 ? 5 : i;
};
const PL_EFFM = { m: 5, h: 45, d: 90, w: 30, o: 10, M: 30 };
const PL_WHO = ["My job or HR", "The bank", "A company", "My partner", "Family", "Someone else"];
function plX(c) {
  c.x = c.x || {};
  if (!Array.isArray(c.x.plan)) c.x.plan = [];
  if (!c.x.weekMins) c.x.weekMins = 30;
  return c.x;
}
function plId() {
  return "pl" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
}
function nextDow(dow, from) {
  let s = from || todayISO();
  for (let i = 0; i < 7; i++) {
    if (plDow(s) === dow) return s;
    s = addDays(s, 1);
  }
  return s;
}
function plWeekEnd(t) {
  return addDays(t, 6);
}

/* is a task already taken care of somewhere else in the game? */
function plResolved(c, p) {
  try {
    if (p.a === "sharp") return isSharp(c, p.v) ? "done" : null;
    if (p.a === "l1") return c.placed || (c.bon && c.bon[1]) ? "done" : null;
    if (p.a === "plater") return (c.x.later || []).includes(p.v) ? null : "done";
    if (p.a === "node" || p.a === "skill") {
      if (c.na && c.na[p.v]) return "na";
      if (p.v.includes(":")) return skillDone(c, p.v) ? "done" : null;
      if (p.v[0] === "m") return null;
      const n = NODES.find(x => x.id === p.v);
      return n && nodeRankRaw(c, derive(c), p.v) >= n.r ? "done" : null;
    }
  } catch (e) {
    report(e, "planner.js: plResolved");
  }
  return null;
}
/* anything not finished rolls forward to today, so nothing ever falls off the plan */
function plTidy(c) {
  const x = plX(c),
    t = todayISO();
  let ch = false;
  x.plan.forEach(p => {
    if (p.st === "done" || p.st === "na") return;
    const r = plResolved(c, p);
    if (r) {
      p.st = r;
      p.doneOn = t;
      p.auto = true;
      ch = true;
      return;
    }
    if (p.when < t) {
      p.prev = p.when;
      p.when = t;
      p.moved = (p.moved || 0) + 1;
      ch = true;
    }
  });
  const old = x.plan.length;
  x.plan = x.plan.filter(p => !((p.st === "done" || p.st === "na") && p.doneOn && daysBetween(p.doneOn, t) > 45));
  if (old !== x.plan.length) ch = true;
  return ch;
}
function plOpen(p) {
  return p.st !== "done" && p.st !== "na";
}

/* payday dates */
function plPay(c) {
  if (!c.payKnown || !c.payNext || c.payNext >= "9999") return null;
  return { pay: c.payNext, pre: addDays(c.payNext, -1) };
}
function plPayPlan(c) {
  const x = plX(c),
    pd = plPay(c);
  return pd && x.payPlan && x.payPlan.for === pd.pay ? x.payPlan : null;
}

/* things the game puts on today by itself: the daily check, payday before and after, schedules, the monthly session */
function plAutoToday(c) {
  const t = todayISO(),
    out = [],
    pd = plPay(c),
    last = c.hist && c.hist[c.hist.length - 1];
  if (G.demo) return out;
  if (pd && t >= pd.pre && t < pd.pay && !plPayPlan(c))
    out.push({
      id: "v:pre",
      t: "Plan your next paycheck",
      s: "Payday is " + plDay(pd.pay).toLowerCase() + ". Decide what this one is for before it lands. Six taps.",
      a: "plpre",
      mins: 2,
      kind: "auto",
      tag: "Before payday",
    });
  if (pd && t >= pd.pay) {
    const pp = plPayPlan(c),
      rv = pp && pp.rev;
    out.push({
      id: "v:post",
      t: rv ? "Payday: log the real numbers" : pp ? "Payday: did it go to plan?" : "It's payday",
      s: rv
        ? "You checked the plan. Now tell the game what came in and where it went."
        : pp
          ? "Check each part of the plan, then log the real numbers."
          : "Tell the game what came in and where it goes. About 3 minutes.",
      a: pp && !rv ? "plpost" : "payday",
      mins: 3,
      kind: "auto",
      tag: "Payday",
    });
  }
  (typeof routineDue === "function" ? routineDue(c, t) : []).forEach(r =>
    out.push({
      id: "r:" + r.id,
      t: routineLabel(c, r),
      s: "On your schedule. " + (r.auto ? "Check it went through." : "Do it, then tap Did it."),
      a: "rdo",
      v: r.id,
      mins: 2,
      kind: "routine",
      tag: "Repeats",
    })
  );
  if (c.placed && last && daysBetween(last.d, t) >= 30)
    out.push({
      id: "v:month",
      t: "Monthly session",
      s: "Check your numbers against the real thing. About 5 minutes.",
      a: "month",
      mins: 5,
      kind: "auto",
      tag: "Monthly",
    });
  if (c.lastDaily !== t)
    out.push({
      id: "v:daily",
      t: "Today's one-minute check",
      s: "Guess your balance, say how money felt, log anything that moved.",
      a: "daily",
      mins: 1,
      kind: "auto",
      tag: "Daily",
    });
  return out;
}

/* what's ready to go on the plan but isn't on it yet */
/* plReady(c) returns the steps that are ready to plan. plReadyBase(c) is the part from this file. */
function plReady(c) {
  /* fold.js: the list is empty while the mission board shows the same steps. */
  if (typeof plReadyHidden === "function" && plReadyHidden()) return [];
  return plReadyBase(c);
}
function plReadyBase(c) {
  const x = plX(c),
    t = todayISO(),
    have = new Set(x.plan.filter(plOpen).map(p => p.v));
  let all = [];
  try {
    all = candidates(c, derive(c), t);
  } catch (e) {
    report(e, "planner.js: plReadyBase");
  }
  return all
    .filter(p => !have.has(p.id) && !(c.na && c.na[p.id]))
    .map(p => ({
      id: "c:" + p.id,
      t: p.title,
      s: (EFFT[p.eff] || "") + (p.tag ? " · " + p.tag : ""),
      a: p.kind === "node" ? "node" : "skill",
      v: p.id,
      mins: PL_EFFM[p.eff] || 15,
      hz: EFF_HZ[p.eff] || "month",
      kind: "ready",
    }));
}

/* the week 1 plan after setup: one or two short things a day, never a wall */
function plSeedWeek(c) {
  const x = plX(c),
    t = todayISO(),
    q = [],
    put = (p, day) =>
      x.plan.push(Object.assign({ id: plId(), when: addDays(t, day), slot: "Any", st: "todo", made: t, seed: 1 }, p));
  if (!c.placed && typeof l1Where === "function")
    put(
      {
        t: "Play the 2-minute picture",
        s: "Three quick tap games fill in your rough numbers.",
        a: "l1",
        v: "",
        mins: 2,
      },
      0
    );
  (x.later || []).forEach(k =>
    put(
      {
        t: k === "accts" ? "Tell the game where your money lives" : "Three gut checks about your money",
        s:
          k === "accts"
            ? "Tap the kinds of accounts you have. No amounts."
            : "Three taps. They set how big your cushion should be.",
        a: "plater",
        v: k,
        mins: 1,
      },
      1
    )
  );
  sharpList(c)
    .filter(k => !isSharp(c, k))
    .forEach(k =>
      q.push({
        t: "Make it real: " + SHARP_Q[k].toLowerCase(),
        s: "A few taps. A guess is fine.",
        a: "sharp",
        v: k,
        mins: 3,
      })
    );
  let day = (x.later || []).length ? 2 : 1;
  q.forEach((p, i) => {
    put(p, Math.min(day, 13));
    if (i % 2 === 1 || day > 2) day++;
  });
  save();
}
function plDemoSeed(c) {
  const x = plX(c);
  if (x.plan.length || x.demoSeeded) return;
  x.demoSeeded = 1;
  const t = todayISO(),
    r = plReady(c).slice(0, 4),
    when = [t, t, addDays(t, 1), nextDow(6, addDays(t, 1))],
    slot = ["Evening", "Any", "Lunch", "Night"];
  r.forEach((p, i) =>
    x.plan.push({
      id: plId(),
      t: p.t,
      s: p.s,
      a: p.a,
      v: p.v,
      mins: p.mins,
      when: when[i],
      slot: slot[i],
      st: i === 1 ? "doing" : "todo",
      made: t,
    })
  );
}

/* ---------- the Plan tab ---------- */
let PLV = "today",
  PLD = null,
  PLM = 0;
function plTasksOn(c, day) {
  return plX(c)
    .plan.filter(p => p.when === day)
    .sort((a, b) => plSlotI(a.slot) - plSlotI(b.slot));
}
function plMins(list) {
  return list.reduce((a, p) => a + (p.mins || 5), 0);
}
function plStateP(p) {
  return p.st === "doing"
    ? `<span class="pill info">Working on it</span>`
    : p.st === "wait"
      ? `<span class="pill warn">Waiting on ${esc((p.who || "someone").toLowerCase())}</span>`
      : p.st === "done"
        ? `<span class="pill okp">Done</span>`
        : p.st === "na"
          ? `<span class="pill">Doesn't apply</span>`
          : "";
}
function plRow(p, first, opts) {
  opts = opts || {};
  const open = plOpen(p),
    stored = !p.kind || p.kind === "ready";
  return `<div class="plrow ${open ? "" : "pldone"} ${first ? "plfirst" : ""}" data-fid="pl:${p.id}" data-fmove="1"><div class="grow"><div class="row wrap" style="gap:6px">${p.slot && p.slot !== "Any" && !opts.noslot ? `<span class="pill">${plSlotN(p.slot)}</span>` : ""}${p.tag ? `<span class="pill info">${esc(p.tag)}</span>` : ""}${plStateP(p)}${p.moved && open ? `<span class="tiny muted">Moved from ${plDay(p.prev || p.when)}</span>` : ""}</div>
 <b class="pltitle">${esc(p.t)}</b><div class="tiny muted">${esc(p.s || "")}${p.mins ? ` · about ${p.mins} min` : ""}</div>
 ${open ? `<div class="row wrap" style="margin-top:8px">${p.a && p.a !== "none" ? `<button class="${first ? "primary go" : "ghost"} slim" data-a="plgo" data-v="${p.id}">${first ? "Start" : "Do it"}</button>` : ""}${p.kind === "routine" ? `<button class="ghost slim" data-a="rskip" data-v="${p.v}">Skip this time</button>` : stored ? `<button class="ghost slim" data-a="plst" data-v="${p.id}">Update</button>` : ""}</div>` : ""}</div></div>`;
}
function plFind(c, id) {
  if (id.indexOf("c:") === 0) return plReady(c).find(p => p.id === id);
  if (id.indexOf("v:") === 0 || id.indexOf("r:") === 0) return plAutoToday(c).find(p => p.id === id);
  return plX(c).plan.find(p => p.id === id);
}

function plTodayView(c) {
  const t = todayISO(),
    auto = plAutoToday(c),
    mine = plTasksOn(c, t),
    open = auto.concat(mine.filter(plOpen)),
    closed = mine.filter(p => !plOpen(p)),
    tom = plTasksOn(c, addDays(t, 1)).filter(plOpen);
  let h = "";
  if (!open.length && closed.length)
    h += `<div class="levelup pop pldonecard"><div class="medal">✓</div><h2>All done for today</h2><div class="small" style="margin:6px 0">${closed.length} thing${closed.length === 1 ? "" : "s"} handled. That's the whole list.</div><div class="tile small" style="text-align:left"><div class="tiny muted">Tomorrow</div>${tom.length ? `<b>${tom.length} thing${tom.length === 1 ? "" : "s"}, about ${plMins(tom)} min</b><div class="tiny muted">${tom.map(p => esc(p.t)).join(" · ")}</div>` : `<b>Nothing planned yet</b>`}</div>${tom.length ? `<button class="ghost wide slim" style="margin-top:8px" data-a="plpull">Pull one from tomorrow</button>` : ""}</div>`;
  else if (!open.length)
    h += `<div class="card"><h3>Nothing planned for today</h3><div class="small muted">Pick one thing below and tap Plan it. Two minutes counts.</div></div>`;
  else
    h += `<div class="card next"><div class="row between"><div class="eyebrow">Today · ${open.length} thing${open.length === 1 ? "" : "s"}</div><span class="tiny">about ${plMins(open)} min</span></div><div class="stack" style="margin-top:8px">${open.map((p, i) => plRow(p, i === 0)).join("")}</div></div>`;
  if (closed.length && open.length)
    h += `<details><summary>Done today (${closed.length})</summary><div class="inner stack">${closed.map(p => plRow(p, false)).join("")}</div></details>`;
  return h;
}
function plDayBlock(c, day, withAuto) {
  const list = (withAuto ? plAutoToday(c) : []).concat(plTasksOn(c, day)),
    pd = plPay(c),
    flags = [pd && day === pd.pay ? "Payday" : null, pd && day === pd.pre ? "Day before payday" : null].filter(Boolean),
    open = list.filter(plOpen);
  return `<div class="plday ${day === todayISO() ? "pltoday" : ""}"><div class="row between"><b>${plDay(day)}</b><span class="row" style="gap:6px">${flags.map(f => `<span class="pill ${f === "Payday" ? "okp" : "info"}">${f}</span>`).join("")}<span class="tiny muted">${open.length ? "about " + plMins(open) + " min" : ""}</span></span></div>
 ${list.length ? `<div class="stack" style="margin-top:6px">${list.map(p => plRow(p, false)).join("")}</div>` : `<div class="tiny muted" style="margin-top:4px">Free</div>`}
 <button class="ghost slim pladd" data-a="pladdday" data-v="${day}">+ Add to ${plDay(day).toLowerCase() === "today" ? "today" : PL_DOWL[plDow(day)]}</button></div>`;
}
function plWeekView(c) {
  const t = todayISO();
  return `<div class="stack">${Array.from({ length: 7 }, (_, i) => plDayBlock(c, addDays(t, i), i === 0)).join("")}</div>`;
}
function plMonthView(c) {
  const t = todayISO(),
    base = parseISO(t);
  base.setDate(1);
  base.setMonth(base.getMonth() + PLM);
  const y = base.getFullYear(),
    m = base.getMonth(),
    first = iso(base),
    start = addDays(first, -base.getDay()),
    pd = plPay(c),
    x = plX(c),
    sel = PLD || t;
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i)).filter(
    (d, i) => i < 35 || parseISO(d).getMonth() === m
  );
  const routs = (c.routines || []).map(r => r.next);
  return `<div class="card"><div class="row between"><button class="ghost slim" data-a="plmon" data-v="-1" ${PLM <= 0 ? "disabled style='opacity:.35'" : ""} aria-label="Previous month">‹</button><h3>${base.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3><button class="ghost slim" data-a="plmon" data-v="1" aria-label="Next month">›</button></div>
 <div class="calgrid" style="margin-top:8px">${PL_DOW.map(d => `<div class="tiny muted" style="text-align:center">${d[0]}</div>`).join("")}${cells
   .map(d => {
     const inM = parseISO(d).getMonth() === m,
       n = x.plan.filter(p => p.when === d && plOpen(p)).length,
       dn = x.plan.filter(p => p.when === d && !plOpen(p)).length,
       isPay = pd && d === pd.pay,
       past = d < t;
     return `<button class="cald ${d === sel ? "on" : ""} ${past ? "plpast" : ""}" style="${inM ? "" : "opacity:.3"}" data-a="plpick" data-v="${d}" ${past ? "disabled" : ""}><b>${parseISO(d).getDate()}</b><span>${isPay ? `<i class="cdot c-pay"></i>` : ""}${n ? `<i class="cdot pln">${n}</i>` : ""}${dn && !n ? `<i class="cdot plk">✓</i>` : ""}${routs.includes(d) ? `<i class="cdot c-debt"></i>` : ""}</span></button>`;
   })
   .join("")}</div>
 <div class="tiny muted" style="margin-top:6px"><i class="cdot c-pay"></i> payday · <i class="cdot pln">2</i> things planned · <i class="cdot c-debt"></i> a payment that repeats</div></div>
 ${plDayBlock(c, sel, sel === t)}`;
}
const PL_SEASON = [
  [0, "New year reset", "Tax-year limits start over. Check your accounts are still right.", "yearly"],
  [0, "Tax season starts", "Collect your forms as they arrive (W-2, 1099s).", "tax"],
  [3, "Tax deadline", "File, or file for more time, by mid-April.", "tax"],
  [10, "Open enrollment", "Pick health insurance and an HSA if you can get one.", "benefits"],
  [11, "Last call for the tax year", "Put in what you can before December 31.", "tax"],
];
function plYearView(c) {
  const t = todayISO(),
    mo = parseISO(t).getMonth(),
    long = plReady(c)
      .filter(p => p.hz === "year" || p.hz === "month")
      .slice(0, 6),
    later = plX(c).plan.filter(p => plOpen(p) && daysBetween(t, p.when) > 30);
  const seas = PL_SEASON.map(s => Object.assign({}, { m: s[0], t: s[1], s: s[2] }, { in: (s[0] - mo + 12) % 12 })).sort(
    (a, b) => a.in - b.in
  );
  return `<div class="card"><h3>Seasons of the money year</h3><div class="tiny muted">These come around every year. Tap one to put it on your plan.</div><div class="stack" style="margin-top:8px">${seas.map(s => `<button class="rowbtn" data-a="plseason" data-v="${s.m}" data-t="${esc(s.t)}" data-s="${esc(s.s)}"><span><b>${esc(s.t)}</b><div class="tiny muted">${esc(s.s)}</div></span><span class="tiny">${s.in === 0 ? "This month" : "In " + s.in + " month" + (s.in === 1 ? "" : "s")}</span></button>`).join("")}</div></div>
 ${later.length ? `<div class="card"><h3>Planned further out</h3><div class="stack" style="margin-top:8px">${later.map(p => plRow(p, false)).join("")}</div></div>` : ""}
 <div class="card"><h3>The long ones</h3><div class="tiny muted">Steps that take weeks or months. Chip away at them.</div><div class="stack" style="margin-top:8px">${long.length ? long.map(p => plReadyRow(p)).join("") : `<div class="small muted">Nothing long right now.</div>`}</div></div>`;
}
function plReadyRow(p, hot) {
  return `<div class="plrow"><div class="grow"><b class="pltitle">${esc(p.t)}</b><div class="tiny muted">${esc(p.s)}</div><div class="row wrap" style="margin-top:8px"><button class="${hot ? "primary go" : "gold"} slim" data-a="plst" data-v="${p.id}">Plan it</button><button class="ghost slim" data-a="plgo" data-v="${p.id}">Do it now</button></div></div></div>`;
}

function plBudget(c) {
  const x = plX(c),
    t = todayISO(),
    e = plWeekEnd(t),
    wk = x.plan.filter(p => plOpen(p) && p.when >= t && p.when <= e),
    m = plMins(wk),
    cap = x.weekMins,
    pct = Math.min(100, (m / cap) * 100);
  return `<details class="plbudget"><summary><span class="grow"><span class="small">This week: <b data-fid="pl:wk">${m} of ${cap} min</b> planned</span>${bar(pct)}</span></summary><div class="inner stack"><div class="small">How much time can you give your money each week?</div><div class="chips">${[15, 30, 60, 120].map(v => `<button class="chip ${cap === v ? "on" : ""}" data-a="plcap" data-v="${v}">${v < 60 ? v + " min" : v / 60 + " hour" + (v > 60 ? "s" : "")}</button>`).join("")}</div><div class="tiny muted">${m > cap ? "You've planned more than that. That's fine, nothing breaks. Anything you don't get to rolls to the next day." : "Anything you don't get to rolls to the next day on its own. You'll never lose a task."}</div></div></details>`;
}
function plPayStrip(c) {
  const pd = plPay(c),
    t = todayISO();
  if (G.demo) return "";
  if (!pd)
    return `<div class="card"><h3>When's your next payday?</h3><div class="tiny muted">Your plan builds around it: a quick plan the day before, a check the day of.</div><div class="chips" style="margin-top:8px">${[
      0, 1, 2, 3, 4, 5, 6, 7, 10, 14,
    ]
      .map(n => {
        const d = addDays(t, n);
        return `<button class="chip" data-a="plpayset" data-v="${d}">${n === 0 ? "Today" : n === 1 ? "Tomorrow" : PL_DOW[plDow(d)] + " " + parseISO(d).getDate()}</button>`;
      })
      .join(
        ""
      )}</div><div class="tiny muted" style="margin-top:6px">${c.payFreq && c.payFreq !== "It varies" ? "You said you're paid " + c.payFreq.toLowerCase() + "." : "If it varies, pick the next one you expect."}</div></div>`;
  const pp = plPayPlan(c),
    dd = daysBetween(t, pd.pay);
  return `<button class="rowbtn plpaystrip" data-a="${pp ? "plpre" : "plpre"}"><span><span class="tiny muted">Next payday · ${dd <= 0 ? "today" : dd === 1 ? "tomorrow" : "in " + dd + " days"}</span><div><b>${pp ? "Planned: " + pp.jobs.map(j => j.k.toLowerCase()).join(", ") : "What's this paycheck for?"}</b></div></span><span class="tiny">${pp ? "Change" : "Plan it ›"}</span></button>`;
}
/* NEXT STEPS TAB (the plan).
   planTab() makes the full tab. It calls each part by name, in the load order of the files.
   planTabBase() is the part from this file. */
function planTab() {
  /* fork.js: at the fork limit, one short screen replaces the plan. */
  let h = typeof planTabForkFull === "function" ? planTabForkFull() : null;
  /* fold.js: while the plan is made, the list "ready to plan" is hidden when the mission board shows the same steps. */
  if (h === null) h = typeof planTabFold === "function" ? planTabFold(planTabMain) : planTabMain();
  if (typeof planTabIdeas === "function") h = planTabIdeas(h); /* ideasz.js: the block for the famous money ideas */
  if (typeof planTabPath === "function") h = planTabPath(h); /* paths.js: the path that the player picked */
  /* strat.js: the section "Moves to try". With no strat.js, the place mark is taken out. */
  h = typeof planTabStrat === "function" ? planTabStrat(h) : h.replace("<!--moveshere-->", "");
  return h;
}
function planTabMain() {
  /* missions.js, step 1 of 2: bring the missions up to date before the plan is made. */
  const ms = typeof planTabMissionsSync === "function" ? planTabMissionsSync() : null;
  let h = planTabBase();
  if (typeof planTabHead === "function") h = planTabHead(h); /* ux.js: the tab title, two more buttons */
  if (ms) h = planTabMissions(h, ms.c, ms.d); /* missions.js, step 2 of 2: the mission board */
  return h;
}
function planTabBase() {
  const c = C();
  if (G.demo) plDemoSeed(c);
  if (plTidy(c)) save();
  const t = todayISO(),
    ready = plReady(c),
    hz = PLV === "today" ? "today" : PLV === "week" ? "week" : null,
    rl = (hz ? ready.filter(p => p.hz === hz || (hz === "week" && p.hz === "today")) : [])
      .concat(ready)
      .filter((p, i, a) => a.indexOf(p) === i)
      .slice(0, PLV === "today" ? 3 : 4);
  const todayOpen = plAutoToday(c).length + plTasksOn(c, t).filter(plOpen).length;
  return `<div class="stack"><div class="row between"><h1>Your plan</h1><span class="tiny muted">${G.demo ? "Sample person" : esc(c.name)}</span></div>
 <div class="seg plseg">${[
   ["today", "Today"],
   ["week", "This week"],
   ["month", "Month"],
   ["year", "Year"],
 ]
   .map(v => `<button class="${PLV === v[0] ? "on" : ""}" data-a="plview" data-v="${v[0]}">${v[1]}</button>`)
   .join("")}</div>
 ${plPayStrip(c)}
 ${PLV === "today" ? plTodayView(c) : PLV === "week" ? plWeekView(c) : PLV === "month" ? plMonthView(c) : plYearView(c)}
 ${PLV !== "year" && rl.length ? `<div class="card"><div class="row between"><h3>Ready to plan</h3><span class="tiny muted">From your path</span></div><div class="tiny muted">Pick a day and a time, or say it's done or doesn't apply.</div><div class="stack" style="margin-top:8px">${rl.map((p, i) => plReadyRow(p, PLV === "today" && !todayOpen && i === 0)).join("")}</div></div>` : ""}
 <!--moveshere-->
 <!--boardhere-->
 ${plBudget(c)}
 <div class="tiny muted" style="text-align:center">Not done? It rolls to the next day by itself. Nothing falls off.</div>
 ${flagBtn()}</div>`;
}

/* ---------- the Update / Plan it sheet ---------- */
function plOpenSheet(id) {
  const c = C(),
    p = plFind(c, id);
  if (!p) return;
  const t = todayISO();
  W = {
    kind: "plst",
    id,
    o: {
      when: p.kind === "ready" ? null : p.when,
      slot: p.slot || null,
      who: p.who || null,
      back: null,
      pick: false,
      mode: null,
    },
    snap: p,
  };
  sheet(plSheet);
}
function plWhenOpts(c) {
  const t = todayISO(),
    pd = plPay(c),
    sat = nextDow(6),
    sun = nextDow(0, addDays(t, 1)),
    o = [
      ["today:Any", "Today"],
      ["today:Evening", "Tonight"],
      ["tom:Any", "Tomorrow"],
      ["sat:Night", "Saturday night"],
      ["sun:Any", "Sunday"],
    ];
  if (pd && pd.pre > t) o.push(["pre:Any", "Day before payday"]);
  if (pd && pd.pay >= t) o.push(["pay:Any", "Payday"]);
  o.push(["nextwk:Any", "Next week"]);
  return o;
}
function plWhenISO(k) {
  const c = C(),
    t = todayISO(),
    pd = plPay(c);
  return k === "today"
    ? t
    : k === "tom"
      ? addDays(t, 1)
      : k === "sat"
        ? nextDow(6)
        : k === "sun"
          ? nextDow(0, addDays(t, 1))
          : k === "pre" && pd
            ? pd.pre
            : k === "pay" && pd
              ? pd.pay
              : k === "nextwk"
                ? nextDow(1, addDays(t, 1))
                : k;
}
function plSheet() {
  const w = W,
    c = C(),
    p = w.snap,
    o = w.o,
    t = todayISO(),
    stored = p.kind !== "ready",
    wo = plWhenOpts(c);
  const qk = o.when
    ? (wo.find(x => plWhenISO(x[0].split(":")[0]) === o.when && x[0].split(":")[1] === (o.slot || "Any")) || [])[0]
    : null;
  let b = head(stored ? "Update" : "Plan it", esc(p.t)) + `<div class="tiny muted">${esc(p.s || "")}</div>`;
  b += `<div class="grid2 plstates">
  <button class="plstate ${p.st === "done" ? "on" : ""}" data-a="plset" data-v="done"><b>✓ Done</b><span>It's handled</span></button>
  <button class="plstate ${p.st === "doing" ? "on" : ""}" data-a="plset" data-v="doing"><b>Working on it</b><span>Keep it on my list</span></button>
  <button class="plstate ${o.mode === "wait" || p.st === "wait" ? "on" : ""}" data-a="plmode" data-v="wait"><b>Waiting on someone</b><span>I'll check back</span></button>
  <button class="plstate ${p.st === "na" ? "on" : ""}" data-a="plset" data-v="na"><b>Doesn't apply</b><span>Not for me</span></button></div>`;
  if (o.mode === "wait")
    b += `<div class="numopen stack">${q("Who are you waiting on?", `<div class="chips">${PL_WHO.map(x => `<button class="chip ${o.who === x ? "on" : ""}" data-a="plo" data-k="who" data-v="${x}">${x}</button>`).join("")}</div>`)}${q(
      "Check back in",
      `<div class="chips">${[
        [2, "2 days"],
        [7, "A week"],
        [14, "2 weeks"],
      ]
        .map(
          x =>
            `<button class="chip ${o.back === x[0] ? "on" : ""}" data-a="plo" data-k="back" data-v="${x[0]}">${x[1]}</button>`
        )
        .join("")}</div>`
    )}<button class="${o.who && o.back ? "primary go" : "ghost"} wide" data-a="plwait">Save: waiting${o.who ? " on " + esc(o.who.toLowerCase()) : ""}</button></div>`;
  b += `<div class="numopen stack"><div class="row between"><b>${stored ? "Move it" : "Plan it"}</b><span class="tiny muted">${o.when ? plDay(o.when) + (o.slot && o.slot !== "Any" ? ", " + plSlotN(o.slot).toLowerCase() : "") : "Pick a day"}</span></div>
  <div class="chips">${wo.map(x => `<button class="chip ${qk === x[0] ? "on" : ""}" data-a="plwhen" data-v="${x[0]}">${x[1]}</button>`).join("")}<button class="chip more ${o.pick ? "on" : ""}" data-a="plpickopen">Pick a day</button></div>
  ${
    o.pick
      ? `<div class="calgrid">${PL_DOW.map(d => `<div class="tiny muted" style="text-align:center">${d[0]}</div>`).join("")}${(() => {
          const s = addDays(t, -plDow(t));
          return Array.from({ length: 21 }, (_, i) => addDays(s, i))
            .map(
              d =>
                `<button class="cald ${o.when === d ? "on" : ""}" ${d < t ? "disabled style='opacity:.3'" : ""} data-a="plo" data-k="when" data-v="${d}"><b>${parseISO(d).getDate()}</b><span class="tiny">${PL_DOW[plDow(d)]}</span></button>`
            )
            .join("");
        })()}</div>`
      : ""
  }
  ${o.when ? q("What time?", `<div class="chips">${PL_SLOTS.map(x => `<button class="chip ${(o.slot || "Any") === x[0] ? "on" : ""}" data-a="plo" data-k="slot" data-v="${x[0]}">${x[1]}</button>`).join("")}</div>`) : ""}
  <button class="${o.when ? "primary go" : "ghost"} wide" data-a="plsave" ${o.when ? "" : "disabled"}>${o.when ? (stored ? "Move it to " : "Put it on ") + plDay(o.when).toLowerCase() : "Pick a day first"}</button>
  ${plOverBudget(c, o.when, p)}</div>`;
  b += `<div class="row wrap">${p.a && p.a !== "none" ? `<button class="ghost slim" data-a="plgo" data-v="${p.id}">Do it now</button>` : ""}${stored ? `<button class="ghost slim" data-a="plrm">Take it off my plan</button>` : ""}</div>`;
  return b;
}
function plOverBudget(c, when, p) {
  if (!when) return "";
  const x = plX(c),
    t = todayISO(),
    e = plWeekEnd(t);
  if (when > e) return "";
  const m = plMins(x.plan.filter(q => plOpen(q) && q.when >= t && q.when <= e && q.id !== p.id)) + (p.mins || 5);
  return m > x.weekMins
    ? `<div class="tiny muted">Heads up: that makes ${m} minutes this week, over your ${x.weekMins}. Still fine.</div>`
    : "";
}
function plStore(c, p) {
  const x = plX(c);
  let s = x.plan.find(q => q.id === p.id);
  if (!s) {
    s = {
      id: plId(),
      t: p.t,
      s: p.s,
      a: p.a,
      v: p.v,
      mins: p.mins,
      when: todayISO(),
      slot: "Any",
      st: "todo",
      made: todayISO(),
    };
    x.plan.push(s);
  }
  return s;
}
function plMark(c, p, st) {
  const t = todayISO();
  if (p.kind === "routine") {
    if (st === "done") doRoutine(p.v, false);
    else doRoutine(p.v, true);
    return;
  }
  if (p.kind === "auto") {
    if (st === "done" && p.a === "daily") {
      c.lastDaily = t;
      save();
    }
    return;
  }
  const s = plStore(c, p);
  s.st = st;
  s.doneOn = t;
  if ((p.a === "node" || p.a === "skill") && st === "done") {
    const id = p.v,
      pr = D.realm;
    if (id.includes(":")) {
      c.skills[id] = t;
      c.saved = c.saved.filter(x => x !== id);
    } else {
      c.nodes[id] = nodeMax(id);
      c.plate = c.plate.filter(x => x !== id);
    }
    settle(c, pr);
  }
  if ((p.a === "node" || p.a === "skill") && st === "na") {
    c.na[p.v] = true;
    c.plate = c.plate.filter(x => x !== p.v);
    c.saved = c.saved.filter(x => x !== p.v);
    settle(c, D.realm);
  }
  save();
}
function plRun(p) {
  const f = ACT[p.a];
  if (p.a === "plater") return plLater(p.v);
  if (f) f({ dataset: { v: p.v || "", k: "" } });
}
function plLater(k) {
  openSetup("edit");
  W.step = k === "accts" ? 5 : 6;
  W.later = k;
  drawSheet();
}

/* ---------- before and after payday ---------- */
const PAYJOBS = [
  ["Bills and rent", "The must-pays"],
  ["Pay down a debt", "Extra on top of minimums"],
  ["Build my cushion", "Savings for surprises"],
  ["Invest", "Future you"],
  ["A goal", "Something you're saving up for"],
  ["Fun money", "Guilt-free spending"],
  ["Help family", "Money that goes to people you support"],
];
const PAYSH = [
  [25, "A little"],
  [50, "Half"],
  [75, "Most"],
  [100, "All of what's left"],
];
function plPreSheet() {
  const w = W,
    o = w.o,
    c = C(),
    pd = plPay(c);
  return (
    head(
      "Before payday",
      !pd
        ? "Your next paycheck"
        : pd.pay === todayISO()
          ? "Today's paycheck"
          : pd.pay === addDays(todayISO(), 1)
            ? "Tomorrow's paycheck"
            : "Your " + plDay(pd.pay) + " paycheck"
    ) +
    `<div class="small">What's this paycheck going to do? Tap up to three.</div>
 <div class="stack">${PAYJOBS.map(j => {
   const on = o.jobs.find(x => x.k === j[0]);
   return `<div class="${on ? "numopen" : ""}"><button class="rowbtn ${on ? "sel" : ""}" data-a="plpj" data-v="${j[0]}"><span>${j[0]}<div class="tiny muted">${j[1]}</div></span><b>${on ? "✓" : ""}</b></button>${on && j[0] !== "Bills and rent" ? `<div class="chips" style="margin-top:8px">${PAYSH.map(s => `<button class="chip sm ${on.share === s[0] ? "on" : ""}" data-a="plpjs" data-k="${j[0]}" data-v="${s[0]}">${s[1]}</button>`).join("")}</div><div class="tiny muted" style="margin-top:4px">Of what's left after the must-pays.</div>` : ""}</div>`;
 }).join("")}</div>
 ${o.jobs.length >= 3 ? `<div class="tiny muted">Three is plenty. Tap one to swap it out.</div>` : ""}
 <button class="${o.jobs.length ? "primary go" : "ghost"} wide" data-a="plpresave" ${o.jobs.length ? "" : "disabled"}>${o.jobs.length ? "Lock in the plan" : "Tap at least one"}</button>
 <div class="tiny muted">On payday you'll check each part off, then log the real numbers. Nothing moves money for you.</div>`
  );
}
function plPostSheet() {
  const w = W,
    o = w.o,
    c = C(),
    pp = plPayPlan(c) || { jobs: [] },
    all = pp.jobs.every(j => o.rev[j.k]);
  return (
    head("Payday", "Did it go to plan?") +
    `<div class="small muted">One tap each. No guilt either way: the plan learns from this.</div>
 <div class="stack">${pp.jobs
   .map(
     j =>
       `<div class="numrow"><div class="small"><b>${esc(j.k)}</b>${j.share && j.k !== "Bills and rent" ? ` <span class="tiny muted">(${(PAYSH.find(s => s[0] === j.share) || [0, ""])[1].toLowerCase()})</span>` : ""}</div><div class="chips" style="margin-top:6px">${[
         ["yes", "Yes"],
         ["part", "Partly"],
         ["no", "Not this time"],
       ]
         .map(
           r =>
             `<button class="chip sm ${o.rev[j.k] === r[0] ? "on" : ""}" data-a="plrev" data-k="${esc(j.k)}" data-v="${r[0]}">${r[1]}</button>`
         )
         .join("")}</div></div>`
   )
   .join("")}</div>
 <button class="${all ? "primary go" : "ghost"} wide" data-a="plpostsave" ${all ? "" : "disabled"}>${all ? "Now log the real numbers" : "Answer each one"}</button>`
  );
}

/* ---------- navigation: a bottom bar for the main five, a menu for everything else ---------- */
const NAV = { back: [], fwd: [] };
const TAB_N = { home: "Home", plan: "Plan", money: "Money", map: "Skills", play: "Check in", me: "Me" };
const ICO = {
  home: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/></svg>`,
  plan: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4M7.5 13.5h3M7.5 17h6"/></svg>`,
  money: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6.5" width="18" height="12.5" rx="2.5"/><path d="M3 10.5h18"/><circle cx="16.5" cy="14.8" r="1.4"/></svg>`,
  map: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8.5" stroke-dasharray="3 3"/><circle cx="18.5" cy="6.5" r="1.8"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
};
const MENU = [
  ["Where am I", "quest", "act", "Where you are, where you left off, and every place you can go"],
  ["Switch person", "people", "act", "Flip between the people in this game, or add one"],
  ["Save my game", "backup", "act", "Copy your game as text so you never lose it. Paste it back to load"],
  ["Check in", "play", "tab", "Daily check, payday round, monthly session"],
  ["Safe to spend?", "safe", "act", "Ask before you buy. Always a trade-off, never a flat no"],
  ["What if", "moves", "act", "Try a move and see what changes"],
  ["Glossary", "glossary", "act", "Every money word in plain English"],
  ["Theme", "themes", "act", "Change the look and the voice"],
  ["Rearrange Home", "dash", "act", "Move cards up, down or out of the way"],
  ["Flag this screen", "flag", "act", "Tell Eli something's off here"],
];
/* menuSheet() makes the full menu. menuSheetBase() is the part from this file. */
function menuSheet() {
  let h = menuSheetBase();
  if (typeof menuSheetCloud === "function") h = menuSheetCloud(h); /* cloud.js: where the game is saved */
  return h;
}
function menuSheetBase() {
  const c = C(),
    t = todayISO(),
    due = c.lastDaily !== t || (c.payKnown && t >= c.payNext);
  return (
    head("Menu", "Everything else") +
    `<div class="stack">${MENU.filter(m => !m[4] || adOn(m[4]))
      .map(
        m =>
          `<button class="rowbtn menurow ${m[2] === "tab" && tab === m[1] ? "sel" : ""}" data-a="menugo" data-k="${m[2]}" data-v="${m[1]}"><span><b>${m[0]}</b>${m[1] === "play" && due && !G.demo ? ` <span class="pill new">Due</span>` : ""}<div class="tiny muted">${m[3]}</div></span><span class="caret">›</span></button>`
      )
      .join("")}</div>
 ${!G.demo ? `<button class="ghost wide slim" data-a="menugo" data-k="act" data-v="addperson">Add another person</button>` : ""}`
  );
}
function whoBtn() {
  const c = C(),
    nm = G.demo ? "Sample" : String(c.name || "You"),
    ini = nm
      .split(/\s+/)
      .map(w => w[0] || "")
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    n = G.demo ? 0 : G.chars.length;
  return `<button class="whobtn" data-a="people" aria-label="Switch person"><span class="ava">${esc(ini)}</span><span class="whonm">${esc(nm)}</span><span class="tiny muted">▾</span></button>`;
}
function topbarHTML() {
  const nb = NAV.back.length,
    nf = NAV.fwd.length;
  return `<span class="grp"><button class="iconbtn" data-a="menu" aria-label="Menu">${ICO.menu}</button><button class="iconbtn sm" data-a="navback" aria-label="Back" ${nb ? "" : "disabled"}>‹</button><button class="iconbtn sm" data-a="navfwd" aria-label="Forward" ${nf ? "" : "disabled"}>›</button></span>${whoBtn()}<button class="ghost slim safebtn" data-a="safe">Safe to spend?</button>${typeof topbarQuest === "function" ? topbarQuest() : ""}`; /* questlog.js: the button "Where am I" */
}
function tabsHTML() {
  const c = C(),
    t = todayISO(),
    open = G.demo ? 0 : plAutoToday(c).length + plTasksOn(c, t).filter(plOpen).length;
  const b = (k, n) =>
    `<button class="${tab === k ? "on" : ""}" data-a="tab" data-v="${k}">${ICO[k]}<span>${n}</span>${k === "plan" && open ? `<span class="dot plbadge">${open}</span>` : ""}</button>`;
  return (
    b("home", "Home") +
    b("plan", "Plan") +
    `<button class="logtab" data-a="flow" data-v="" aria-label="Log money"><span class="plus">+</span><span>Log</span></button>` +
    b("money", "Money") +
    b("map", "Skills")
  );
}

/* ---------- wiring into the existing game ---------- */
/* Part of render() in ui.js, step 1 of 2. Tidies the plan, and saves when it changed.
   On the tab "plan", it also draws the screen and returns true. On all other tabs it returns false. */
function renderPlan() {
  const c = C();
  if (!G.demo && c && c.x && Array.isArray(c.x.plan) && plTidy(c)) save();
  if (tab !== "plan") return false;
  applyLook();
  D = derive(c);
  if (typeof refreshDup === "function") refreshDup(c, D);
  const el = $("#app");
  el.innerHTML = `<div class="topbar"></div>` + (typeof profStrip === "function" ? profStrip() : "") + planTab();
  return true;
}
/* Part of render() in ui.js, step 2 of 2. Fills the top bar and the tab bar. */
function renderPlanBars() {
  const tb = document.querySelector("#app .topbar");
  if (tb) tb.innerHTML = topbarHTML();
  const tabs = $("#tabs");
  if (tabs) tabs.innerHTML = tabsHTML();
}
/* Part of finishSetup() in ui.js, step 1 of 2. Runs before the profile is made.
   In an edit that finishes a screen from "later", it removes that screen from the list. For a new profile, it makes the note for the celebration.
   Returns the setup state (w) and isNew. finishSetupPlanEnd() uses the two values. */
function finishSetupPlanStart() {
  const w = W,
    isNew = w && w.mode !== "edit",
    taps = (w && w.taps) || 0,
    later = w && w.later,
    speed = w && w.speed;
  if (w && w.o && w.mode === "edit" && later) {
    w.o.x = w.o.x || {};
    w.o.x.later = (w.o.x.later || []).filter(k => (later === "accts" ? false : k !== later));
  }
  if (isNew && taps)
    CEL_NOTE =
      "You got here in " +
      taps +
      " taps." +
      (speed ? " The last two screens are on your plan for tomorrow, so nothing's lost." : "") +
      " Your first week is laid out under Plan, a few minutes a day.";
  return { w, isNew };
}
/* Part of finishSetup() in ui.js, step 2 of 2. For a new profile, lays out the first week of the plan and draws the screen. */
function finishSetupPlanEnd(w, isNew) {
  if (isNew && !w.add) {
    const c = C();
    plSeedWeek(c);
    render();
  } else if (isNew && w.add) {
    plSeedWeek(C());
    render();
  }
}
(() => {
  if (typeof document !== "undefined" && document.addEventListener)
    document.addEventListener(
      "click",
      e => {
        const t = e.target && e.target.closest ? e.target.closest("[data-a]") : null;
        if (!t || !W || W.kind !== "setup") return;
        const ov = document.getElementById("ov");
        if (ov && ov.contains(t) && t.dataset.a !== "close") W.taps = (W.taps || 0) + 1;
      },
      true
    );
})();
/* Part of setupSheet() in ui.js. w is the setup state.
   Adds the count of questions left and the strip "what the game knows so far". After "What you owe", it offers the fast finish: see the plan now, do the last two screens later. */
function setupSheetPlan(h, w) {
  const st = w.step;
  const strip = w.mode === "edit" ? "" : plReveal(w);
  h =
    h.replace(
      /(<div class="tiny muted">All taps\. No numbers yet\.<\/div>)/,
      `<div class="row between"><span class="tiny muted">All taps. No numbers yet.</span>${w.mode === "edit" ? "" : `<span class="pill info" data-fid="su:taps">${(n => (n ? n + " question" + (n === 1 ? "" : "s") + " left" : "All answered"))(smLeft(w))}</span>`}</div>`
    ) + "";
  if (strip) {
    const k = h.lastIndexOf('<div class="row between">', h.lastIndexOf('data-a="wnext"'));
    if (k >= 0) h = h.slice(0, k) + strip + h.slice(k);
  }
  if (w.mode !== "edit" && st === 4)
    h = h.replace(
      /<div class="row between">(<button class="ghost" data-a="wback">[^<]*<\/button>)<button class="[^"]*" data-a="wnext">[^<]*<\/button><\/div>$/,
      `<div class="stack plspeed"><button class="primary wide go" data-a="speedfin">See my first plan</button><div class="row between">$1<button class="ghost" data-a="wnext">Keep going: 2 quick screens</button></div><div class="tiny muted">Skip ahead and the last two screens go on your plan for tomorrow. About 30 seconds either way.</div></div>`
    );
  if (w.mode === "edit" && w.later) h = h.replace(/Getting started · page \d+ of \d+/, "Finishing setup");
  if (w.mode === "edit" && w.later === "accts" && st === 5)
    h = h.replace(
      /(<div class="small muted">Tap every kind of account)/,
      `<div class="banner small">The ones already picked are guesses for people like you. Tap any that are wrong.</div>$1`
    );
  return h;
}

/* Part of go() in ui.js. Records the tab that the player leaves, for the button Back. */
function goNav(t) {
  if (t !== tab) {
    NAV.back.push(tab);
    if (NAV.back.length > 30) NAV.back.shift();
    NAV.fwd = [];
  }
}

/* what the game has figured out so far, so every few taps something visibly changes */
function plReveal(w) {
  const o = w.o,
    ls = [];
  if (o.age != null) ls.push("Age " + o.age + ". That alone gives a starting plan.");
  if (o.payFreq && !(w.sm && w.sm.pfg))
    ls.push(
      "Paid " +
        String(o.payFreq).toLowerCase() +
        (o.steady === "Changes month to month" ? ", and it moves around" : "") +
        ". Your plan builds around paydays."
    );
  else if ((o.incKinds || []).length)
    ls.push(
      "Money comes from " + o.incKinds.map(k => k.toLowerCase()).join(", ") + ". Your plan builds around paydays."
    );
  if (o.homeQ)
    ls.push(
      o.homeQ === "No cost"
        ? "No housing cost right now. That's a big head start."
        : "Housing noted. It's usually the biggest lever."
    );
  if (o.share)
    ls.push(o.share === "No one" ? "Planning for one person." : "Planning with " + String(o.share).toLowerCase() + ".");
  if (w.step >= 4 && o.age != null && o.work && o.homeQ) {
    try {
      const x = clone(o);
      x.home = HOMEMAP[x.homeQ];
      applyTypical(x);
      const d = derive(x);
      ls.push(
        "A guess for people like you: " + (d.era === 0 && d.realm === "Surface" ? "Ground Floor" : eraN(d.era)) + "."
      );
    } catch (e) {
      report(e, "planner.js: plReveal");
    }
  }
  if (!ls.length) return "";
  const last = ls[ls.length - 1];
  return `<details class="math plreveal"><summary><span class="plnew pop" data-fid="su:new">✓ ${esc(last)}</span></summary><div class="plk stack" style="gap:3px;padding:8px 10px"><div class="tiny muted">What the game knows so far</div>${ls.map(l => `<div class="tiny">✓ ${esc(l)}</div>`).join("")}</div></details>`;
}

/* Part of home() in ui.js. Adds one slim line that goes to the plan for today. */
function homePlanLine(h) {
  const c = C();
  if (G.demo) return h;
  const t = todayISO(),
    open = plAutoToday(c).concat(plTasksOn(c, t).filter(plOpen));
  const line = `<button class="rowbtn plhomeline" data-a="tab" data-v="plan"><span><span class="tiny muted">Today's plan</span><div><b>${open.length ? open.length + " thing" + (open.length === 1 ? "" : "s") + ", about " + plMins(open) + " min" : "All done for today ✓"}</b></div></span><span class="caret">›</span></button>`;
  return h.replace(/(<div class="card[^"]*"><div class="row between"><div class="eyebrow">)/, line + "$1");
}

Object.assign(ACT, {
  menu: () => {
    W = null;
    sheet(menuSheet);
  },
  menugo: t => {
    const k = t.dataset.k,
      v = t.dataset.v;
    closeSheet();
    if (k === "tab") go(v);
    else if (ACT[v]) ACT[v](t);
  },
  navback: () => {
    if (!NAV.back.length) return;
    NAV.fwd.push(tab);
    tab = NAV.back.pop();
    closeSheet();
    render();
    if (typeof scrollTo === "function") scrollTo(0, 0);
  },
  navfwd: () => {
    if (!NAV.fwd.length) return;
    NAV.back.push(tab);
    tab = NAV.fwd.pop();
    closeSheet();
    render();
    if (typeof scrollTo === "function") scrollTo(0, 0);
  },
  plview: t => {
    PLV = t.dataset.v;
    PLD = null;
    render();
  },
  plmon: t => {
    PLM = Math.max(0, PLM + +t.dataset.v);
    PLD = null;
    render();
  },
  plpick: t => {
    PLD = t.dataset.v;
    render();
  },
  plcap: t => {
    plX(C()).weekMins = +t.dataset.v;
    save();
    render();
  },
  plst: t => plOpenSheet(t.dataset.v),
  plgo: t => {
    const c = C(),
      p = plFind(c, t.dataset.v);
    if (!p) return;
    closeSheet();
    if (p.kind === "ready") {
      const s = plStore(c, p);
      s.st = "doing";
      save();
    } else if (!p.kind && p.st === "todo") {
      p.st = "doing";
      save();
    }
    render();
    plRun(p);
  },
  plset: t => {
    const c = C(),
      p = W.snap,
      st = t.dataset.v;
    closeSheet();
    plMark(c, p, st);
    render();
    if (st === "done") celebrate("Done", [p.t], "Checked off your plan.");
  },
  plmode: t => {
    W.o.mode = W.o.mode === t.dataset.v ? null : t.dataset.v;
    drawSheet();
  },
  plo: t => {
    const k = t.dataset.k,
      v = t.dataset.v;
    W.o[k] = k === "back" ? +v : v;
    if (k === "when" && !W.o.slot) W.o.slot = "Any";
    drawSheet();
  },
  plwhen: t => {
    const p = t.dataset.v.split(":");
    W.o.when = plWhenISO(p[0]);
    W.o.slot = p[1];
    W.o.pick = false;
    drawSheet();
  },
  plpickopen: () => {
    W.o.pick = !W.o.pick;
    drawSheet();
  },
  plsave: () => {
    const c = C(),
      w = W,
      s = plStore(c, w.snap);
    s.when = w.o.when;
    s.slot = w.o.slot || "Any";
    if (s.st === "wait" || s.st === "done" || s.st === "na") s.st = "todo";
    s.moved = 0;
    delete s.prev;
    save();
    closeSheet();
    render();
  },
  plwait: () => {
    const c = C(),
      w = W;
    if (!w.o.who || !w.o.back) return;
    const s = plStore(c, w.snap);
    s.st = "wait";
    s.who = w.o.who;
    s.when = addDays(todayISO(), w.o.back);
    s.slot = "Any";
    s.moved = 0;
    save();
    closeSheet();
    render();
  },
  plrm: () => {
    const c = C(),
      x = plX(c);
    x.plan = x.plan.filter(p => p.id !== W.id);
    save();
    closeSheet();
    render();
  },
  pladdday: t => {
    const c = C(),
      r = plReady(c);
    PLADD = t.dataset.v;
    W = { kind: "pladd" };
    sheet(
      () =>
        head("Add to " + plDay(PLADD).toLowerCase(), "Pick one") +
        `<div class="stack">${
          r
            .slice(0, 8)
            .map(
              p =>
                `<button class="rowbtn" data-a="pladdone" data-v="${p.id}"><span><b>${esc(p.t)}</b><div class="tiny muted">${esc(p.s)}</div></span><span class="caret">+</span></button>`
            )
            .join("") || `<div class="small muted">Nothing ready right now. You're caught up.</div>`
        }</div>`
    );
  },
  pladdone: t => {
    const c = C(),
      p = plFind(c, t.dataset.v);
    if (!p) return;
    const s = plStore(c, p);
    s.when = PLADD;
    s.slot = "Any";
    save();
    closeSheet();
    render();
  },
  plpull: () => {
    const c = C(),
      t = todayISO(),
      p = plTasksOn(c, addDays(t, 1)).filter(plOpen)[0];
    if (p) {
      p.when = t;
      save();
      render();
    }
  },
  plseason: t => {
    const m = +t.dataset.v,
      now = parseISO(todayISO());
    let d = new Date(now.getFullYear(), m, 1);
    if (m === now.getMonth()) d = now;
    else if (d < now) d = new Date(now.getFullYear() + 1, m, 1);
    const p = { id: "s:" + m, t: t.dataset.t, s: t.dataset.s, a: "none", mins: 30, kind: "ready" };
    plOpenSheet2(p, iso(d));
  },
  plpayset: t => {
    const c = C();
    c.payNext = t.dataset.v;
    c.payKnown = true;
    save();
    render();
    if (t.dataset.v === todayISO()) openPayday(false);
  },
  plpre: () => {
    const c = C(),
      pp = plPayPlan(c);
    W = { kind: "plpre", o: { jobs: pp ? clone(pp.jobs) : [] } };
    sheet(plPreSheet);
  },
  plpj: t => {
    const o = W.o,
      k = t.dataset.v,
      i = o.jobs.findIndex(j => j.k === k);
    if (i >= 0) o.jobs.splice(i, 1);
    else {
      if (o.jobs.length >= 3) o.jobs.shift();
      o.jobs.push({ k, share: k === "Bills and rent" ? 100 : 50 });
    }
    drawSheet();
  },
  plpjs: t => {
    const j = W.o.jobs.find(x => x.k === t.dataset.k);
    if (j) j.share = +t.dataset.v;
    drawSheet();
  },
  plpresave: () => {
    const c = C(),
      pd = plPay(c),
      x = plX(c);
    if (!W.o.jobs.length) return;
    x.payPlan = { for: pd ? pd.pay : todayISO(), jobs: W.o.jobs, made: todayISO() };
    save();
    closeSheet();
    render();
    celebrate(
      "Paycheck planned",
      W && W.o ? [] : x.payPlan.jobs.map(j => j.k),
      "On payday you'll check it off in one tap each."
    );
  },
  plpost: () => {
    const c = C();
    W = { kind: "plpost", o: { rev: {} } };
    sheet(plPostSheet);
  },
  plrev: t => {
    W.o.rev[t.dataset.k] = t.dataset.v;
    drawSheet();
  },
  plpostsave: () => {
    const c = C(),
      x = plX(c),
      pp = plPayPlan(c);
    if (pp) {
      pp.rev = W.o.rev;
      x.payHist = (x.payHist || []).concat([{ for: pp.for, jobs: pp.jobs, rev: W.o.rev }]).slice(-24);
    }
    save();
    closeSheet();
    openPayday(false);
  },
  speedfin: () => {
    const w = W,
      o = w.o;
    w.speed = true;
    try {
      const r = smRule("accts", o);
      o.accts = (r.first || []).filter(a => ACCT_KINDS.includes(a));
      if (!o.accts.length) o.accts = ["Checking"];
    } catch (e) {
      o.accts = ["Checking"];
    }
    o.x = o.x || {};
    o.x.later = ["accts", "gut"];
    finishSetup();
  },
  plater: t => plLater(t.dataset.v),
});
let PLADD = null;
function plOpenSheet2(p, when) {
  W = { kind: "plst", id: p.id, o: { when, slot: "Any", who: null, back: null, pick: false, mode: null }, snap: p };
  sheet(plSheet);
}
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
/* switching people keeps you on the same screen, so you can compare */
ACT.switch = t => {
  G.active = +t.dataset.v;
  save();
  closeSheet();
  render();
  if (typeof scrollTo === "function") scrollTo(0, 0);
};
