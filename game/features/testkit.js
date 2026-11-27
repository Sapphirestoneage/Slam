/* ============================================================================
   SLAM the Game: features/testkit.js
   PURPOSE     Test with a friend. A think-aloud usability test: one person tries three tasks, and the
               coach records how each task went with one tap. The three tasks are Eli's (Batch B, phase 7):
               the number that could be, Social Security off, back Home. While a task runs the game counts
               the taps and keeps the names of the screens, and it notes the screen where the person
               stopped. No sound and no picture of the screen is recorded, and no value of a field. The
               results stay in the saved game, and the coach can copy them as plain text.
   INPUT       The game: G.active, G.chars, G.tests, G.tk. The open sheet (W.kind): testkit. The taps of
               the player (the actions in OUTPUT).
   OUTPUT      Functions: tkTasks, tkAt, tkTapAdd, tkStop, tkText, tkSheet and more. Parts of functions in
               other files: tkChipSafe. Actions (ACT): testkit,
               tkstart, tkgo, tkback, tkout, tkwhere, tkwhy, tknext, tkquit, tkview, tkcopy. Menu: "Test
               with a friend".
   DEPENDS ON  core/report.js, core/engine.js, screens/ui.js, screens/planner.js.
   SOURCE      The method is from Rocket Surgery Made Easy (Steve Krug).
   ========================================================================= */
const TK_WHERE = ["Home", "Next Steps", "My Money", "My number", "My Goals", "Me", "The menu", "A pop-up"];
/* The three tasks, in Eli's words (Batch B, phase 7). thinkaloud.js uses the same list. */
const TK_TASKS = [
  { t: "Find out what your number could be.", see: "My number in the bar, or Your two numbers on Home" },
  {
    t: "Switch Social Security off and say what changed.",
    see: "My number, All the ways, Social Security, Not counting on it. Both numbers at the top move",
  },
  { t: "Get back Home and find your next move.", see: "Home in the bar, then the next move on Home or on Next Steps" },
];
const TK_PATH_MAX = 40;
const TK_TABS = {
  home: "Home",
  plan: "Next Steps",
  next: "Next Steps",
  money: "My Money",
  goals: "My Goals",
  me: "Me",
};
const TK_CB = {
  entry: "the four questions",
  is: "What it is",
  chart: "the chart",
  layer: "one layer of the chart",
  stack: "All the ways",
  move: "one move",
  ss: "Social Security",
  reveal: "the reveal",
  end: "the last screen",
};
const TK_WHY = [
  "Didn't see the button",
  "Didn't know a word",
  "Too many choices",
  "Looked in the wrong place",
  "Thought it was done",
  "Gave up",
];
function tkTasks() {
  return TK_TASKS.map(x => ({ t: x.t, see: x.see }));
}
/* The name of the screen that is open now: the tab, and the sheet over it. Names only, never a value. */
function tkAt() {
  const t = typeof tab === "string" ? tab : "home",
    w = typeof W !== "undefined" && typeof SH !== "undefined" && SH ? W : null,
    base = TK_TABS[t] || t;
  if (!w || !w.kind) return base;
  if (w.kind === "cb") return base + " > My number: " + (TK_CB[w.step] || String(w.step || ""));
  return base + " > " + (w.kind === "menu" ? "The menu" : w.kind);
}
/* One tap while a task runs: the count goes up by one, and the screen joins the path when it is a new one. */
function tkTapAdd(s, at) {
  if (!s || s.stage !== "run") return null;
  s.taps = (s.taps || 0) + 1;
  const P = (s.path = s.path || []);
  if (at && P[P.length - 1] !== at && P.length < TK_PATH_MAX) P.push(at);
  return s.taps;
}
/* The person stopped: the time, and the screen they were on. */
function tkStop(s, now, at) {
  if (!s) return s;
  s.secs = Math.max(1, Math.round((now - (s.t0 || now)) / 1000));
  s.at = at || "";
  s.taps = s.taps || 0;
  s.path = s.path || [];
  s.stage = "note";
  return s;
}
function tkTapsLabel(n) {
  return n + (n === 1 ? " tap" : " taps");
}
function tkS() {
  return G.tk || null;
}
function tkLabel(o) {
  return o === "alone" ? "Did it alone" : o === "nudge" ? "Needed a nudge" : o === "stuck" ? "Got stuck" : "Skipped";
}
function tkText(r) {
  const L = ["Think-aloud test: " + r.who + ", " + r.d, ""];
  r.tasks.forEach((x, i) => {
    L.push(i + 1 + ". " + x.t);
    L.push(
      "   " +
        tkLabel(x.o) +
        (x.secs != null ? " · " + (x.secs < 90 ? x.secs + " sec" : Math.round(x.secs / 60) + " min") : "") +
        (x.taps != null ? " · " + tkTapsLabel(x.taps) : "") +
        (x.at ? " · stopped on: " + x.at : "") +
        (x.where ? " · got lost: " + x.where : "") +
        (x.why && x.why.length ? " · " + x.why.join(", ") : "")
    );
    if (x.path && x.path.length) L.push("   Screens: " + x.path.join(", "));
  });
  const n = k => r.tasks.filter(x => x.o === k).length;
  L.push("");
  L.push("Alone " + n("alone") + ", nudge " + n("nudge") + ", stuck " + n("stuck") + ".");
  return L.join("\n");
}
function tkSheet() {
  const s = tkS(),
    w = W;
  if (w.view != null && (G.tests || [])[w.view]) {
    const r = G.tests[w.view],
      n = k => r.tasks.filter(x => x.o === k).length;
    return (
      head("Test with a friend", esc(r.who) + " · " + r.d) +
      `<div class="kgrid" style="grid-template-columns:1fr 1fr 1fr"><div class="tile" style="text-align:center"><div class="bignum">${n("alone")}</div><div class="tiny">alone</div></div><div class="tile" style="text-align:center"><div class="bignum">${n("nudge")}</div><div class="tiny">nudge</div></div><div class="tile" style="text-align:center"><div class="bignum">${n("stuck")}</div><div class="tiny">stuck</div></div></div>` +
      r.tasks
        .map(
          (x, i) =>
            `<div class="tile stack" style="gap:4px"><div class="small"><b>${i + 1}.</b> ${esc(x.t)}</div><div class="row" style="gap:6px;flex-wrap:wrap"><span class="pill ${x.o === "alone" ? "okp" : x.o === "stuck" ? "warn" : ""}">${tkLabel(x.o)}</span>${x.secs != null ? `<span class="pill">${x.secs < 90 ? x.secs + " sec" : Math.round(x.secs / 60) + " min"}</span>` : ""}${x.taps != null ? `<span class="pill">${tkTapsLabel(x.taps)}</span>` : ""}${x.where ? `<span class="pill">${esc(x.where)}</span>` : ""}</div>${x.at ? `<div class="tiny muted">Stopped on: ${esc(x.at)}</div>` : ""}${x.path && x.path.length ? `<div class="tiny muted">Screens: ${x.path.map(esc).join(", ")}</div>` : ""}${x.why && x.why.length ? `<div class="tiny muted">${x.why.map(esc).join(" · ")}</div>` : ""}</div>`
        )
        .join("") +
      `<div class="small muted">What to fix first: anything marked stuck, then anything two people needed a nudge on.</div><button class="primary wide" data-a="tkcopy" data-v="${w.view}">${w.copied ? "Copied. Paste it to Claude ✓" : "Copy these results"}</button><button class="ghost wide slim" data-a="testkit">Back to the list</button>`
    );
  }
  if (!s) {
    const past = G.tests || [];
    return (
      head("Menu", "Test with a friend") +
      `<div class="small muted">Watch one person try three things. You learn more from one quiet watch than from ten opinions.</div>
  <div class="tile stack" style="gap:4px"><b class="small">The three tasks</b>${TK_TASKS.map((x, i) => `<div class="small">${i + 1}. ${esc(x.t)}</div>`).join("")}<div class="tiny muted">The game counts the taps of each task and notes the screen where the person stopped. It records no sound and no picture of the screen.</div></div>
  <div class="tile stack" style="gap:6px"><b class="small">Read this to them</b><div class="small mrow k-note">"I'm testing the app, not you. You can't do anything wrong."</div><div class="small mrow k-note">"Say what you're thinking out loud as you go: what you're looking for, what you expect."</div><div class="small mrow k-note">"I can't answer questions while you try. I'll answer everything after."</div></div>
  <div class="tile stack" style="gap:6px"><b class="small">Your job</b><div class="small mrow">Hand them the phone. Say nothing. Count to ten before any hint.</div><div class="small mrow">If they ask what to do: "What would you do if I weren't here?"</div><div class="small mrow">After each task, take the phone back and tap how it went.</div></div>
  <b class="small">Who is trying it?</b><div class="stack" style="gap:6px">${G.chars
    .map(
      (c, i) =>
        `<button class="rowbtn prow" data-a="tkstart" data-v="${i}"><span class="ava2">${esc(
          String(c.name || "?")
            .trim()
            .charAt(0)
            .toUpperCase()
        )}</span><span class="pn"><b>${esc(c.name)}</b><div class="tiny muted">Three tasks, on their own numbers</div></span><span class="pill">Start <i class=chev aria-hidden=true></i></span></button>`
    )
    .join("")}</div>` +
      (past.length
        ? `<b class="small">Past tests</b><div class="stack" style="gap:6px">${past.map((r, i) => `<button class="rowbtn prow" data-a="tkview" data-v="${i}"><span class="pn"><b>${esc(r.who)}</b><div class="tiny muted">${r.d} · alone ${r.tasks.filter(x => x.o === "alone").length}, nudge ${r.tasks.filter(x => x.o === "nudge").length}, stuck ${r.tasks.filter(x => x.o === "stuck").length}</div></span><span><i class=chev aria-hidden=true></i></span></button>`).join("")}</div>`
        : "")
    );
  }
  const T = s.tasks,
    i = s.i,
    x = T[i];
  if (s.stage === "note") {
    const r = s.res[i] || {};
    return (
      head("Task " + (i + 1) + " of " + T.length, "How did it go?") +
      `<div class="tile small">${esc(x.t)}</div><div class="tiny muted">${tkTapsLabel(s.taps || 0)}${s.at ? " · stopped on: " + esc(s.at) : ""}</div>${r.o ? "" : `<div class="tiny muted">Coach: this part is yours. Take the phone back.</div>`}<div class="stack" style="gap:6px">${[
        ["alone", "Did it alone", "No help, no hints"],
        ["nudge", "Needed a nudge", "Got there after a hint or a long pause"],
        ["stuck", "Got stuck", "Gave up, or you had to show them"],
      ]
        .map(
          o =>
            `<button class="rowbtn ${r.o === o[0] ? "on" : ""}" data-a="tkout" data-v="${o[0]}"><span><b>${o[1]}</b><div class="tiny muted">${o[2]}</div></span><span>${r.o === o[0] ? "✓" : "<i class=chev aria-hidden=true></i>"}</span></button>`
        )
        .join("")}</div>` +
      (r.o && r.o !== "alone"
        ? q(
            "Where did they get lost?",
            `<div class="chips">${TK_WHERE.map(v => `<button class="chip ${r.where === v ? "on" : ""}" data-a="tkwhere" data-v="${v}">${v}</button>`).join("")}</div>`
          ) +
          q(
            "What happened? Tap any that fit.",
            `<div class="chips">${TK_WHY.map(v => `<button class="chip ${(r.why || []).includes(v) ? "on" : ""}" data-a="tkwhy" data-v="${v}">${v}</button>`).join("")}</div>`
          ) +
          `<button class="primary wide" data-a="tknext">${i + 1 < T.length ? "Next task" : "See the results"}</button>`
        : "") +
      `<button class="ghost wide slim" data-a="tkout" data-v="skip">Skip this task</button>`
    );
  }
  return (
    head("Task " + (i + 1) + " of " + T.length, esc(s.who) + ", your task") +
    `<div class="tile" style="font-size:17px;line-height:1.4"><b>${esc(x.t)}</b></div><div class="small muted">Say what you're thinking out loud. When you're done, or stuck, tap the <b>Task ${i + 1}</b> button at the top of the screen.</div><button class="primary wide" data-a="tkgo">Start the test</button><details class="math"><summary>Coach only: where it lives</summary><div class="inner tiny">${esc(x.see)}. Don't say it.</div></details><button class="ghost wide slim" data-a="tkquit">Stop the test</button>`
  );
}
function tkChip() {
  if (typeof document === "undefined" || !document.body || !document.createElement) return;
  let el = document.getElementById("tkchip");
  const s = tkS(),
    /* over a sheet too: the flow of the three tasks is a sheet, and the stop must be noted where the person is */
    show = s && s.stage === "run" && !(SH && W && W.kind === "testkit");
  if (!el) {
    if (!show) return;
    el = document.createElement("div");
    el.id = "tkchip";
    document.body.appendChild(el);
  }
  /* over a sheet the chip sits at the bottom, clear of the top row of the sheet (Back, Home, the menu, Close) */
  if (el.classList) el.classList.toggle("low", !!SH);
  /* the sheet gets room under its last row, so nothing stays behind the chip */
  if (document.body.classList) document.body.classList.toggle("tk-low", !!show && !!SH);
  el.innerHTML = show ? `<button data-a="tkback">Task ${s.i + 1} · done or stuck</button>` : "";
}
function tkOpen() {
  W = { kind: "testkit" };
  sheet(tkSheet);
}
function tkFinish() {
  const s = G.tk;
  if (!s) return;
  const r = {
    who: s.who,
    d: todayISO(),
    tasks: s.tasks.map((x, i) => Object.assign({ t: x.t }, s.res[i] || { o: "skip" })),
  };
  G.tests = (G.tests || []).concat([r]).slice(-20);
  if (s.back != null && G.chars[s.back]) G.active = s.back;
  G.tk = null;
  save();
  render();
  W = { kind: "testkit", view: G.tests.length - 1 };
  sheet(tkSheet);
}
Object.assign(ACT, {
  testkit: () => {
    tkOpen();
  },
  tkstart: t => {
    const i = +t.dataset.v,
      c = G.chars[i];
    if (!c) return;
    G.tk = { who: c.name, ci: i, back: G.active, i: 0, stage: "task", tasks: tkTasks(), res: [] };
    save();
    tkOpen();
  },
  tkgo: () => {
    const s = G.tk;
    if (!s) return;
    if (G.chars[s.ci]) G.active = s.ci;
    s.stage = "run";
    s.t0 = Date.now();
    s.taps = 0;
    s.path = [];
    s.at = "";
    save();
    closeSheet();
    go("home");
    tkChip();
    setTimeout(() => {
      try {
        if (G.tk && G.tk.stage === "run" && !SH) {
          if (tab !== "home") go("home");
          if (typeof scrollTo === "function") scrollTo(0, 0);
          tkChip();
        }
      } catch (e) {
        report(e, "testkit.js: tkgo");
      }
    }, 140);
  },
  tkback: () => {
    const s = G.tk;
    if (!s) return;
    tkStop(s, Date.now(), tkAt());
    save();
    tkOpen();
    tkChip();
  },
  tkout: t => {
    const s = G.tk;
    if (!s) return;
    const o = t.dataset.v;
    s.res[s.i] = Object.assign(s.res[s.i] || {}, {
      o,
      secs: s.secs,
      taps: s.taps || 0,
      at: s.at || "",
      path: (s.path || []).slice(),
    });
    if (o === "alone" || o === "skip") {
      ACT.tknext();
      return;
    }
    save();
    drawSheet();
  },
  tkwhere: t => {
    const s = G.tk;
    if (!s || !s.res[s.i]) return;
    s.res[s.i].where = s.res[s.i].where === t.dataset.v ? null : t.dataset.v;
    save();
    drawSheet();
  },
  tkwhy: t => {
    const s = G.tk;
    if (!s || !s.res[s.i]) return;
    const a = (s.res[s.i].why = s.res[s.i].why || []),
      v = t.dataset.v,
      k = a.indexOf(v);
    if (k >= 0) a.splice(k, 1);
    else a.push(v);
    save();
    drawSheet();
  },
  tknext: () => {
    const s = G.tk;
    if (!s) return;
    if (s.i + 1 >= s.tasks.length) {
      tkFinish();
      return;
    }
    s.i++;
    s.stage = "task";
    s.secs = null;
    s.taps = 0;
    s.path = [];
    s.at = "";
    save();
    tkOpen();
  },
  tkquit: () => {
    const s = G.tk;
    if (!s) return;
    if (s.res.some(r => r && r.o)) {
      tkFinish();
      return;
    }
    if (s.back != null && G.chars[s.back]) G.active = s.back;
    G.tk = null;
    save();
    render();
    tkOpen();
  },
  tkview: t => {
    W = { kind: "testkit", view: +t.dataset.v };
    sheet(tkSheet);
  },
  tkcopy: t => {
    const r = (G.tests || [])[+t.dataset.v];
    if (!r) return;
    const done = () => {
      if (W && W.kind === "testkit") {
        W.copied = true;
        drawSheet();
      }
    };
    try {
      navigator.clipboard.writeText(tkText(r)).then(done, done);
    } catch (e) {
      report(e, "testkit.js: tkcopy");
      done();
    }
  },
});
/* Part of render(), closeSheet() and sheet() in ui.js. While a test task runs, the chip "done or stuck" stays on each screen. */
function tkChipSafe() {
  try {
    tkChip();
    if (typeof taDockSafe === "function") taDockSafe(); /* thinkaloud.js: the panel of the tester-drives test */
  } catch (e) {
    report(e, "testkit.js: tkChipSafe");
  }
}
if (typeof MENU !== "undefined" && Array.isArray(MENU) && !MENU.some(m => m[1] === "testkit"))
  MENU.splice(Math.max(0, MENU.length - 1), 0, [
    "Test with a friend",
    "testkit",
    "act",
    "Watch someone try three tasks: it counts the taps and notes where they stopped",
  ]);
/* At page load: each tap outside the chip counts for the task that runs. The name of the screen only. */
if (typeof document !== "undefined" && document.addEventListener)
  document.addEventListener(
    "click",
    e => {
      try {
        const s = G && G.tk;
        if (!s || s.stage !== "run") return;
        const t =
          e.target && e.target.closest ? e.target.closest("button,a,summary,[data-a],input,select,label") : null;
        if (!t || (t.closest && t.closest("#tkchip,#tadock"))) return;
        tkTapAdd(s, tkAt());
        saveQuiet();
      } catch (err) {
        report(err, "testkit.js: tap counter");
      }
    },
    true
  );
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
