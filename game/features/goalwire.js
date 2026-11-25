/* ============================================================================
   SLAM the Game: features/goalwire.js
   PURPOSE     The Job of Existing, feature 4: a goal, its account and its automatic deposit, in one
               move of three taps. (1) Where the money lives: an account of the player, by name, or "I
               need one" (the kinds of account side by side, with their trade-offs, next to the Fee
               X-ray). (2) The amount: tap presets from the goal's own math (the reverse of the
               Time-Money dial, goalExtraFor in screens/dash.js), or a typed number. (3) The day it
               moves: each payday by default. Then the goal says "Set once. Check in: quarterly.", and
               the goal has two recurring tasks with the four exits: the deposit (Automate it is "I set
               it up") and the quarterly check-in. SLAM moves no money: the person sets the transfer at
               their bank.
   INPUT       The profile: c.goals (each goal's wire), c.cashes, c.invs, c.payFreq, c.payNext,
               c.payKnown, c.x.jobs (the exits, features/jobs.js), c.x.countdown (the monthly answer of
               a countdown). The open sheet (W.kind): wire.
   OUTPUT      Math: wireOf, wireAccts, wireAmts, wireNow, wireTasks, wireBook. Views: wireSheet,
               wireCard. Parts of functions in other files: goalViewWire (goalView in ui.js),
               goalCardWire (goalCardLook in look.js), todayExtrasWire (todayExtras in ui.js). Actions
               (ACT): wire, wacct, wneed, wpick, wamt, wtyped, wday, wcheck, wchecked, wunwire,
               wundo, wredo.
   DEPENDS ON  core/jobs.js (jobWireTimes, jobWirePer, jobCheckNext, jobAddMonths, JOB_WIRE_DAYS),
               data/roles.js (WIRE_OPTIONS), screens/dash.js (goalExtraFor, dkMonth, dkCard, dkStatRow,
               dkTile, dkCaption), screens/ui.js, core/engine.js (periods, monthsUntil, todayISO),
               features/jobs.js (jobTaskRow, jobSet, jobClear, jobOf), features/look.js (lkGoal),
               features/kit.js, features/compare.js (the Fee X-ray, the action compare).
   RULES       One way to work out the amount: goalExtraFor(what is left, 0, months), the same reverse
               as the dial. The math is in core/jobs.js and dash.js; the views show what it returns.
               No account kind is a default. The order of "I need one" is fixed and said on the
               screen. No fee is shown without a source: each option says "Check the fee on their
               page". Every step can be undone; unwire keeps an Undo.
   STORED      g.wire = { v: 1, acct: { n: name, key: "cash:0" | "inv:1" | null, need: id of
               WIRE_OPTIONS or null }, amt: dollars a month, from: "m" (a preset) | "typed", m: months
               of the preset, by: "YYYY-MM-DD" (the date of the preset), day: "pay" | "d1" | "d15" |
               "1and15", d: "YYYY-MM-DD" (the day it was wired), chk: "YYYY-MM-DD" (the last check-in)
               }. A goal with no wire has no field. The tasks are "w:<goal id>" (the deposit) and
               "q:<goal id>" (the check-in), in c.x.jobs.exits like every other task.
               COMPATIBILITY: new optional field; an older save has no g.wire and shows the button
               "Wire it up". The countdown's monthly answer ("<goal id>:monthly") takes the amount,
               marked wire: true, and goes back when the goal is unwired.
   ========================================================================= */

/* ---------- math (the adapter from the profile to core/jobs.js and the dial) ---------- */
function wireOf(g) {
  return g && g.wire && g.wire.v === 1 ? g.wire : null;
}
/* The accounts of the player, by name: cash first, then investments. "Cash at home" cannot take a transfer. */
function wireAccts(c) {
  return flowOpts(c, ["cash", "inv"])
    .filter(x => flowRow(c, x[0]) && flowRow(c, x[0]).k !== "Cash at home")
    .map(x => ({ key: x[0], n: x[1] }));
}
/* The amount presets, from the reverse of the Time-Money dial: what is left ÷ the months, rounded up. The goal's own
   date first, then its current pace, then the marks of the dial (6 mo, 1 yr, 2 yr, 3 yr). */
function wireAmts(c, g, today) {
  today = today || todayISO();
  const L = lkGoal(c, D, g, goalSim(c), goalSim(c, { all: true })),
    need = L.need,
    out = [],
    seen = {};
  if (!(need > 0)) return { need, list: out };
  const add = (m, l) => {
    m = Math.max(1, Math.round(m));
    if (seen[m]) return;
    seen[m] = 1;
    const r = goalExtraFor(need, 0, m);
    out.push({ m, amt: r.extra, by: jobAddMonths(today, m), l });
  };
  if (g.byDate) add(Math.max(1, Math.ceil(monthsUntil(g.byDate, today))), "By your date");
  if (L.gi.fit && L.at > 0 && L.at <= 360) add(L.at, "At your current pace");
  [6, 12, 24, 36].forEach(m => add(m, m < 12 ? m + " months" : m / 12 + (m === 12 ? " year" : " years")));
  return { need, list: out.slice(0, 5) };
}
/* Everything the screens show about one wired goal. */
function wireNow(c, g, today) {
  today = today || todayISO();
  const w = wireOf(g);
  if (!w) return null;
  const payYear = c.payFreq && c.payFreq !== "It varies" ? periods(c.payFreq) : 12,
    times = jobWireTimes(w.day, payYear),
    per = jobWirePer(w.amt, times),
    chk = jobCheckNext(w.d, w.chk, today),
    dayN = (JOB_WIRE_DAYS.find(x => x[0] === w.day) || JOB_WIRE_DAYS[0])[1],
    left = Math.max(0, (g.cost || 0) - (g.fund || 0)),
    mNow = w.from === "m" && w.by ? Math.max(1, Math.round(monthsUntil(w.by, today))) : null;
  return {
    w,
    times,
    per,
    dayN,
    chk,
    left,
    mNow,
    needNow: mNow ? goalExtraFor(left, 0, mNow).extra : null,
    payWord:
      w.day === "pay" ? (c.payFreq && c.payFreq !== "It varies" ? c.payFreq.toLowerCase() : "when you get paid") : null,
  };
}
/* The two recurring tasks of each wired goal, for the four exits (features/jobs.js). Both are the Financial
   Planner's: the goals and the accounts are that job. */
function wireTasks(c) {
  const out = [];
  (c.goals || []).forEach(g => {
    if (g.done || !wireOf(g)) return;
    const N = wireNow(c, g);
    out.push({
      id: "w:" + g.id,
      role: "planner",
      n: "Move " + money(N.per || 0) + " to " + g.n + " " + N.dayN.toLowerCase(),
      per: 5,
      times: N.times,
      src: "wire",
      gid: g.id,
      a: "wire",
      v: g.id,
      auto: "Set a repeating transfer at your bank. Then tap I set it up.",
    });
    out.push({
      id: "q:" + g.id,
      role: "planner",
      n: "Check in on " + g.n + ": quarterly",
      per: 10,
      times: 4,
      src: "wire",
      gid: g.id,
      a: "wire",
      v: g.id,
      auto: "SLAM puts the check-in on Today every 3 months.",
    });
  });
  return out;
}
/* The spreadsheet of the plan: each wired goal, its account, the monthly amount with its formula, the day. */
function wireBook(c) {
  const rows = [];
  (c.goals || [])
    .filter(g => !g.done && wireOf(g))
    .forEach((g, i) => {
      const N = wireNow(c, g),
        p = "wg" + i + "_";
      rows.push({
        id: p + "acct",
        label: g.n + ": the money lives in",
        v: N.w.acct.n,
        note: N.w.acct.need ? "An account to open (your pick)" : "Your account",
      });
      if (N.mNow) {
        rows.push(
          { id: p + "left", label: g.n + ": still to save", v: N.left, note: "The price minus what is saved" },
          { id: p + "months", label: g.n + ": months to the date you picked", v: N.mNow, note: "From " + N.w.by },
          {
            id: p + "need",
            label: g.n + ": a month to make that date now",
            v: N.needNow,
            f: "=ROUNDUP({" + p + "left}/MAX(1,{" + p + "months}),0)",
            note: "The reverse of the Time-Money dial",
          }
        );
      }
      rows.push(
        {
          id: p + "amt",
          label: g.n + ": the monthly amount you set",
          v: N.w.amt,
          note: N.w.from === "typed" ? "You typed it" : "Your pick on " + N.w.d,
        },
        {
          id: p + "times",
          label: g.n + ": deposits a year (" + N.dayN + ")",
          v: N.times,
          note: "From the day it moves",
        },
        {
          id: p + "per",
          label: g.n + ": each deposit",
          v: N.per,
          f: "=ROUNDUP({" + p + "amt}*12/{" + p + "times},0)",
        },
        { id: p + "day", label: g.n + ": the day it moves", v: N.dayN, note: "Your pick" },
        { id: p + "check", label: g.n + ": next check-in", v: N.chk.next, note: "Every 3 months" }
      );
    });
  return { title: "Wired goals (goal, account, automatic deposit)", rows };
}

/* ---------- views ---------- */
kitTerms({
  wired: [
    "Wire up a goal",
    "Three taps: where the money lives, how much, and the day it moves. Then your bank moves it each time by itself, and you check in every 3 months.",
  ],
  autoxfer: [
    "Automatic transfer",
    "A transfer your bank makes by itself on the days you pick. You set it once in your bank's app, under Transfers.",
  ],
  hysa: [
    "High-yield savings account",
    "A savings account that pays more interest than a regular one. Banks insure it (FDIC) up to a limit. Good for money you need soon.",
  ],
  brokerage: [
    "Brokerage account",
    "An account to buy funds and stocks. Its value goes up and down. Good for goals that are years away.",
  ],
  robo: [
    "Robo-advisor",
    "A service that picks and rebalances funds for you by a set plan. It charges a yearly fee on top of the funds' own fees.",
  ],
});
kitScreen(
  "wire",
  "Wire up a goal",
  "Where the money lives, how much, and the day it moves, in three taps.",
  "SLAM moves no money. You set the transfer once at your bank."
);
function wireHead(n, t) {
  return head("Wire up a goal · " + n + " of 3", t);
}
/* The words of the account: its name, and "to open" when the person still needs one. */
function wireAcctWords(a) {
  return a ? a.n + (a.need ? " (to open)" : "") : "";
}
/* The card of a wired goal: Set once. Check in: quarterly. The bank line, I set it up, the check-in, unwire. */
function wireCard(c, g, wv) {
  const N = wireNow(c, g),
    dep = jobTask(c, "w:" + g.id),
    chk = jobTask(c, "q:" + g.id),
    x = dep ? jobExit(c, dep) : { e: null },
    autoOn = x.e === "auto",
    from = (wireAccts(c).find(a => a.key !== (N.w.acct && N.w.acct.key)) || { n: "your checking" }).n;
  const bank = `SLAM does not move money. At your bank, set a repeating transfer of ${money(N.per || 0)} from ${esc(from)} into ${esc(wireAcctWords(N.w.acct))}, ${esc(N.dayN.toLowerCase())}.`;
  return dkCard(
    "",
    `<div class="stack" style="gap:8px"><div class="row between" style="gap:8px"><b class="wiredone" data-fid="wr:set">Set once. Check in: quarterly.</b>${ib("term:wired")}</div>` +
      dkStatRow([
        dkTile("A month", money(N.w.amt), { sub: money(N.per || 0) + " each time" }),
        dkTile("Next check-in", esc(dfmt(N.chk.next)), { sub: N.chk.due ? "Due now" : "Every 3 months" }),
      ]) +
      `<div class="row between small"><span>The money lives in</span><b>${esc(wireAcctWords(N.w.acct))}</b></div><div class="row between small"><span>The day it moves</span><b>${esc(N.dayN)}</b></div>` +
      mathBox(
        [
          N.w.from === "typed"
            ? "You typed " + money(N.w.amt) + " a month."
            : "What is left to save ÷ the months to the date you picked, rounded up = " +
              money(N.w.amt) +
              " a month (the same sum as the Time-Money dial).",
          N.mNow
            ? "Today it is " + money(N.left) + " ÷ " + N.mNow + " months = " + money(N.needNow) + " a month."
            : null,
          money(N.w.amt) +
            " × 12 ÷ " +
            N.times +
            " deposits a year, rounded up = " +
            money(N.per || 0) +
            " each time" +
            (N.payWord ? " (you are paid " + N.payWord + ")" : "") +
            ".",
        ].filter(Boolean)
      ) +
      `<div class="tile small wirebank">${bank}<div class="tiny muted" style="margin-top:4px">How: in your bank's app, open Transfers, pick Repeating (some banks say Recurring), then the accounts, the amount and the day. ${ib("term:autoxfer")}</div></div>` +
      (autoOn
        ? `<div class="banner small" data-fid="wr:auto">On autopilot at your bank. It counts as a task off your plate for the Financial Planner.</div>`
        : `<button class="primary wide" data-a="jbexit" data-k="w:${esc(g.id)}" data-v="auto">I set it up</button>`) +
      (N.chk.due
        ? `<button class="${autoOn ? "primary" : "ghost"} wide" data-a="wchecked" data-v="${esc(g.id)}">I checked in</button>`
        : "") +
      `<div class="small"><b>The check-in quest</b></div>` +
      (chk ? jobTaskRow(c, chk, wv) : "") +
      (dep
        ? `<details><summary>The deposit, and its four ways out</summary><div class="inner stack">${jobTaskRow(c, dep, Object.assign({}, wv, { open: dep.id }))}</div></details>`
        : "") +
      `<div class="row wrap" style="gap:8px"><button class="ghost slim" data-a="wredo" data-v="${esc(g.id)}">Change it</button><button class="ghost slim" data-a="wunwire" data-v="${esc(g.id)}">Unwire this goal</button></div></div>`
  );
}
/* The sheet: the three steps, the "I need one" list, and the card once it is set. */
function wireSheet() {
  const c = C(),
    w = W,
    g = (c.goals || []).find(x => x.id === w.id);
  if (!g)
    return head("Wire up a goal", "This goal is gone") + `<button class="primary wide" data-a="close">Close</button>`;
  const o = w.o;
  if (w.undo)
    return (
      head("My Goals", esc(g.n)) +
      `<div class="banner small" data-fid="wr:unwired">Unwired. ${esc(g.n)} has no automatic deposit now. If you set a transfer at your bank, stop it there too.</div><button class="primary wide" data-a="wundo" data-v="${esc(g.id)}">Undo</button><button class="ghost wide" data-a="close">Close</button>`
    );
  if (w.step === "set" && wireOf(g))
    return (
      head("My Goals", esc(g.n)) +
      dkCaption("Wired up: the account, the amount and the day.") +
      (w.win
        ? `<div class="levelup pop jbwin"><div class="eyebrow">A money win</div><div class="medal">+1</div><h2>${esc(w.win.title)}</h2>${w.win.lines.map(l => `<div class="small">${esc(l)}</div>`).join("")}</div>`
        : w.moved
          ? `<div class="banner small jbmoved">${esc(w.moved.text)}</div>`
          : "") +
      wireCard(c, g, w) +
      `<button class="ghost wide" data-a="close">Done</button>`
    );
  if (w.step === 1)
    return (
      wireHead(1, "Where will the money live?") +
      dkCaption(esc(g.n) + ": one move, three taps.") +
      `<div class="chips">${wireAccts(c)
        .map(
          a =>
            `<button class="chip ${o.acct && o.acct.key === a.key ? "on" : ""}" data-a="wacct" data-v="${esc(a.key)}">${esc(a.n)}</button>`
        )
        .join(
          ""
        )}<button class="chip ${o.acct && o.acct.need ? "on" : ""}" data-a="wneed">I need one</button></div><div class="tiny muted">Tap one of your accounts. No account for it yet? Tap I need one to see some kinds side by side.</div>`
    );
  if (w.step === "need")
    return (
      wireHead(1, "Kinds of account, side by side") +
      dkCaption(WIRE_OPTIONS_ORDER) +
      kitColumns(
        WIRE_OPTIONS.map(x => ({
          title: x.n,
          rows: [
            ["Kind", x.kind],
            ["Fee", "Check the fee on their page"],
          ],
          html: `<div class="tiny">${esc(x.good)}</div><div class="tiny muted">${esc(x.trade)}</div><div class="row" style="gap:6px">${ib("term:" + x.term)}<button class="ghost slim" data-a="wpick" data-v="${x.id}">Pick this one</button></div>`,
        }))
      ) +
      `<div class="tiny muted">SLAM could not check each company's fees from here, so it shows none. A fee looks small as a percent. The Fee X-ray shows it in dollars, on your own money.</div><button class="ghost wide slim" data-a="compare" data-v="fee">Open the Fee X-ray</button>`
    );
  if (w.step === 2) {
    const A = wireAmts(c, g),
      pk = "wamt";
    return (
      wireHead(2, "How much a month?") +
      dkCaption(
        "Into " +
          wireAcctWords(o.acct) +
          ". " +
          (A.need > 0 ? money(A.need) + " is left to save." : "This goal has its money.")
      ) +
      `<div class="chips">${A.list
        .map(
          x =>
            `<button class="chip" data-a="wamt" data-v="${x.amt}" data-k="${x.m}">${money(x.amt)} a month, done by ${esc(dkMonth(x.m))}${x.l === "By your date" ? " (your date)" : ""}</button>`
        )
        .join("")}</div>` +
      (w.pad === pk
        ? `<div class="val">${money(o[pk] || 0)}</div>${keypad(pk)}<div class="row" style="gap:8px"><button class="primary slim" data-a="wtyped">Use ${money(o[pk] || 0)} a month</button><button class="ghost slim" data-a="padclose">Cancel</button></div>`
        : `<button class="ghost slim" data-a="padopen" data-k="${pk}">Type my own amount</button>`) +
      (A.list.length
        ? mathBox([
            "Each amount: what is left to save ÷ the months to that date, rounded up to a dollar.",
            "It is the same sum as the Time-Money dial of this goal.",
            "It counts no interest, so the money may arrive a little early.",
          ])
        : "") +
      `<div class="tiny muted">Tap one. You can change it any time.</div>`
    );
  }
  /* step 3: the day */
  const payYear = c.payFreq && c.payFreq !== "It varies" ? periods(c.payFreq) : 12;
  return (
    wireHead(3, "Which day does it move?") +
    dkCaption(money(o.amt || 0) + " a month into " + wireAcctWords(o.acct) + ".") +
    `<div class="stack" style="gap:8px">${JOB_WIRE_DAYS.map((d, i) => {
      const t = jobWireTimes(d[0], payYear),
        per = jobWirePer(o.amt, t);
      return `<button class="${i === 0 ? "primary" : "ghost"} wide" data-a="wday" data-v="${d[0]}">${esc(d[1])}${i === 0 ? " (the default)" : ""} · ${money(per || 0)} each time</button>`;
    }).join(
      ""
    )}</div><div class="tiny muted">${c.payFreq && c.payFreq !== "It varies" ? "You said you are paid " + esc(c.payFreq.toLowerCase()) + ", so each payday is " + payYear + " times a year." : "Your pay varies, so each payday counts as once a month."} Money that moves on payday is gone before it gets spent.</div>`
  );
}
/* Part of goalView() in ui.js: the wire of this goal, under the countdown. */
function goalViewWire(h) {
  try {
    const c = C(),
      g = (c.goals || []).find(x => W && x.id === W.id);
    if (!g || g.done) return h;
    const card = wireOf(g)
      ? `<button class="rowbtn wirerow" data-a="wire" data-v="${esc(g.id)}"><span><b>Set once. Check in: quarterly.</b><div class="tiny muted">${money(g.wire.amt)} a month into ${esc(wireAcctWords(g.wire.acct))}</div></span><span class="caret">View ›</span></button>`
      : dkCard(
          "Wire it up",
          `<div class="small">One move: where the money lives, how much, and the day it moves. Three taps.</div><button class="primary wide" data-a="wire" data-v="${esc(g.id)}">Wire it up</button>`,
          { right: ib("term:wired") }
        );
    const at = h.indexOf('<div class="row between numrow">');
    return at >= 0 ? h.slice(0, at) + card + h.slice(at) : h + card;
  } catch (e) {
    report(e, "goalwire.js: goalViewWire");
    return h;
  }
}
/* Part of goalCardLook() in look.js: the strategy line of a wired goal (its own amount), and Set once. */
function goalCardWire(c, g) {
  try {
    return wireOf(g)
      ? `<div class="tiny muted">Strategy: ${money(g.wire.amt)} a month, automatic</div><div class="tiny wireline" data-fid="wr:card:${esc(g.id)}">Set once. Check in: quarterly.</div>`
      : "";
  } catch (e) {
    report(e, "goalwire.js: goalCardWire");
    return "";
  }
}
/* Part of todayExtras() in ui.js: a check-in that is due. */
function todayExtrasWire(c, t, out) {
  try {
    (c.goals || []).forEach(g => {
      const N = !g.done && wireOf(g) ? wireNow(c, g, t) : null;
      if (N && N.chk.due)
        out.push({
          id: g.id,
          t: "Check in on " + g.n,
          d: "Every 3 months · " + money(N.w.amt) + " a month into " + wireAcctWords(N.w.acct),
          a: "wcheck",
          l: "Open it",
        });
    });
  } catch (e) {
    report(e, "goalwire.js: todayExtrasWire");
  }
  return out;
}

/* ---------- actions ---------- */
function wireGoal(id) {
  return (C().goals || []).find(x => x.id === id) || null;
}
/* Put the amount in the countdown's monthly answer (one number for one thing), or take it back out. */
function wireCountdown(c, g, amt) {
  const S = kitStore(c, "countdown"),
    k = g.id + ":monthly";
  if (amt != null) S[k] = { v: amt, cf: 2, wire: true };
  else if (S[k] && S[k].wire) delete S[k];
}
function wireSave(c, g, o) {
  g.wire = {
    v: 1,
    acct: o.acct,
    amt: o.amt,
    from: o.from,
    m: o.m || null,
    by: o.by || null,
    day: o.day,
    d: (g.wire && g.wire.d) || todayISO(),
    chk: (g.wire && g.wire.chk) || null,
  };
  wireCountdown(c, g, o.amt);
}
Object.assign(ACT, {
  wire: t => {
    const g = wireGoal(t.dataset.v);
    if (!g) return;
    W = {
      kind: "wire",
      id: g.id,
      step: wireOf(g) ? "set" : 1,
      o: { acct: null, amt: 0 },
      pad: null,
      open: "q:" + g.id,
      here: g.id,
    };
    sheet(wireSheet);
  },
  wacct: t => {
    const a = wireAccts(C()).find(x => x.key === t.dataset.v);
    if (!a || !W) return;
    W.o.acct = { n: a.n, key: a.key, need: null };
    W.step = 2;
    drawSheet();
  },
  wneed: () => {
    if (!W) return;
    W.step = "need";
    drawSheet();
  },
  wpick: t => {
    const x = WIRE_OPTIONS.find(k => k.id === t.dataset.v);
    if (!x || !W) return;
    W.o.acct = { n: x.n, key: null, need: x.id };
    W.step = 2;
    drawSheet();
  },
  wamt: t => {
    if (!W) return;
    const m = +t.dataset.k;
    W.o.amt = Math.max(1, Math.round(+t.dataset.v));
    W.o.from = "m";
    W.o.m = m;
    W.o.by = jobAddMonths(todayISO(), m);
    W.pad = null;
    W.step = 3;
    drawSheet();
  },
  wtyped: () => {
    if (!W) return;
    const v = Math.round(+(W.o.wamt || 0));
    if (!(v > 0)) return;
    W.o.amt = v;
    W.o.from = "typed";
    W.o.m = null;
    W.o.by = null;
    W.pad = null;
    W.step = 3;
    drawSheet();
  },
  wday: t => {
    const c = C(),
      w = W,
      g = w && wireGoal(w.id),
      d = t.dataset.v;
    if (!g || !w.o.acct || !(w.o.amt > 0) || !JOB_WIRE_DAYS.some(x => x[0] === d)) return;
    w.o.day = d;
    wireSave(c, g, w.o);
    w.step = "set";
    w.moved = { text: "Wired: " + g.n + ". The deposit and the check-in are on the Financial Planner's tasks now." };
    save();
    render();
    drawSheet();
  },
  wcheck: t => ACT.wire(t),
  wchecked: t => {
    const c = C(),
      g = wireGoal(t.dataset.v);
    if (!g || !wireOf(g)) return;
    g.wire.chk = todayISO();
    if (W)
      W.moved = {
        text: "Checked in. The next one is " + dfmt(jobCheckNext(g.wire.d, g.wire.chk, todayISO()).next) + ".",
      };
    save();
    render();
    drawSheet();
  },
  wunwire: t => {
    const c = C(),
      g = wireGoal(t.dataset.v);
    if (!g || !wireOf(g)) return;
    const J = jobOf(c),
      ex = {};
    ["w:", "q:"].forEach(p => {
      const id = p + g.id,
        task = jobTask(c, id);
      if (J.exits[id]) {
        ex[id] = J.exits[id];
        const map = J.exits[id].map ? ((c.x || {}).roleMap || []).find(m => m.id === J.exits[id].map) : null;
        if (map) ex[id] = Object.assign({}, ex[id], { mapRec: map });
        if (task) jobClear(c, task, J.exits[id]);
        delete J.exits[id];
      }
    });
    W.undo = { wire: g.wire, exits: ex };
    delete g.wire;
    wireCountdown(c, g, null);
    save();
    render();
    drawSheet();
  },
  wundo: t => {
    const c = C(),
      g = wireGoal(t.dataset.v),
      u = W && W.undo;
    if (!g || !u) return;
    g.wire = u.wire;
    wireCountdown(c, g, u.wire.amt);
    const J = jobOf(c);
    Object.keys(u.exits).forEach(id => {
      const r = Object.assign({}, u.exits[id]),
        map = r.mapRec;
      delete r.mapRec;
      J.exits[id] = r;
      if (map) {
        c.x.roleMap = Array.isArray(c.x.roleMap) ? c.x.roleMap : [];
        c.x.roleMap.push(map);
      }
    });
    W.undo = null;
    W.step = "set";
    W.moved = { text: "Back as it was: " + g.n + " is wired again." };
    save();
    render();
    drawSheet();
  },
  wredo: t => {
    const g = wireGoal(t.dataset.v);
    if (!g || !W) return;
    W.step = 1;
    W.o = { acct: g.wire ? g.wire.acct : null, amt: 0 };
    drawSheet();
  },
});
