/* ===== testkit.js: Test with a friend. A think-aloud usability test, Steve Krug style (Rocket Surgery Made Easy): one person tries five real tasks while the coach watches, says almost nothing, and notes how each one went with a tap. Tasks are picked from that person's own profile, so someone with debt gets a debt task and someone without gets a goal task. Results stay in the game and copy out as plain text. ===== */
const TK_WHERE = ["Home", "Next Steps", "My Money", "My Goals", "Me", "The menu", "A pop-up"];
const TK_WHY = [
  "Didn't see the button",
  "Didn't know a word",
  "Too many choices",
  "Looked in the wrong place",
  "Thought it was done",
  "Gave up",
];
function tkTasks(c) {
  const d = derive(c),
    hasDebt = (c.debts || []).some(x => x.amt > 0),
    guess = !c.placed || (c.incs || []).some(x => !x.s),
    T = [];
  T.push({ t: "Find out how much you can spend this week without hurting anything.", see: "Home or Safe to spend" });
  T.push(
    guess
      ? {
          t: "The game is guessing what you bring in each month. Fix it so it's right.",
          see: "Make your numbers real, or My Money",
        }
      : {
          t: "Something changed: you now bring in $200 more a month. Update the game.",
          see: "My Money, Money coming in",
        }
  );
  T.push(
    hasDebt
      ? { t: "Find out when you would be completely out of debt.", see: "My Money, Make a debt plan" }
      : { t: "There's something you want to buy. Add it and find out when you could have it.", see: "My Goals" }
  );
  T.push({
    t: "Find your savings rate, and decide whether it's something you want to work on.",
    see: "My Money, Key numbers",
  });
  T.push({
    t: "You get paid tomorrow. Find out what the game wants you to do with it.",
    see: "Next Steps, or the payday prompt on Home",
  });
  return T;
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
        (x.where ? " · where: " + x.where : "") +
        (x.why && x.why.length ? " · " + x.why.join(", ") : "")
    );
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
            `<div class="tile stack" style="gap:4px"><div class="small"><b>${i + 1}.</b> ${esc(x.t)}</div><div class="row" style="gap:6px;flex-wrap:wrap"><span class="pill ${x.o === "alone" ? "okp" : x.o === "stuck" ? "warn" : ""}">${tkLabel(x.o)}</span>${x.secs != null ? `<span class="pill">${x.secs < 90 ? x.secs + " sec" : Math.round(x.secs / 60) + " min"}</span>` : ""}${x.where ? `<span class="pill">${esc(x.where)}</span>` : ""}</div>${x.why && x.why.length ? `<div class="tiny muted">${x.why.map(esc).join(" · ")}</div>` : ""}</div>`
        )
        .join("") +
      `<div class="small muted">What to fix first: anything marked stuck, then anything two people needed a nudge on.</div><button class="primary wide" data-a="tkcopy" data-v="${w.view}">${w.copied ? "Copied. Paste it to Claude ✓" : "Copy these results"}</button><button class="ghost wide slim" data-a="testkit">Back to the list</button>`
    );
  }
  if (!s) {
    const past = G.tests || [];
    return (
      head("Menu", "Test with a friend") +
      `<div class="small muted">Watch one person try five things. You learn more from one quiet watch than from ten opinions.</div>
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
        )}</span><span class="pn"><b>${esc(c.name)}</b><div class="tiny muted">Five tasks picked from their own numbers</div></span><span class="pill">Start ›</span></button>`
    )
    .join("")}</div>` +
      (past.length
        ? `<b class="small">Past tests</b><div class="stack" style="gap:6px">${past.map((r, i) => `<button class="rowbtn prow" data-a="tkview" data-v="${i}"><span class="pn"><b>${esc(r.who)}</b><div class="tiny muted">${r.d} · alone ${r.tasks.filter(x => x.o === "alone").length}, nudge ${r.tasks.filter(x => x.o === "nudge").length}, stuck ${r.tasks.filter(x => x.o === "stuck").length}</div></span><span>›</span></button>`).join("")}</div>`
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
      `<div class="tile small">${esc(x.t)}</div>${r.o ? "" : `<div class="tiny muted">Coach: this part is yours. Take the phone back.</div>`}<div class="stack" style="gap:6px">${[
        ["alone", "Did it alone", "No help, no hints"],
        ["nudge", "Needed a nudge", "Got there after a hint or a long pause"],
        ["stuck", "Got stuck", "Gave up, or you had to show them"],
      ]
        .map(
          o =>
            `<button class="rowbtn ${r.o === o[0] ? "on" : ""}" data-a="tkout" data-v="${o[0]}"><span><b>${o[1]}</b><div class="tiny muted">${o[2]}</div></span><span>${r.o === o[0] ? "✓" : "›"}</span></button>`
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
    show = s && s.stage === "run" && !SH;
  if (!el) {
    if (!show) return;
    el = document.createElement("div");
    el.id = "tkchip";
    document.body.appendChild(el);
  }
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
    G.tk = { who: c.name, ci: i, back: G.active, i: 0, stage: "task", tasks: tkTasks(c), res: [] };
    save();
    tkOpen();
  },
  tkgo: () => {
    const s = G.tk;
    if (!s) return;
    if (G.chars[s.ci]) G.active = s.ci;
    s.stage = "run";
    s.t0 = Date.now();
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
      } catch (e) {}
    }, 140);
  },
  tkback: () => {
    const s = G.tk;
    if (!s) return;
    s.secs = Math.max(1, Math.round((Date.now() - (s.t0 || Date.now())) / 1000));
    s.stage = "note";
    save();
    tkOpen();
    tkChip();
  },
  tkout: t => {
    const s = G.tk;
    if (!s) return;
    const o = t.dataset.v;
    s.res[s.i] = Object.assign(s.res[s.i] || {}, { o, secs: s.secs });
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
      done();
    }
  },
});
/* Part of render(), closeSheet() and sheet() in ui.js. While a test task runs, the chip "done or stuck" stays on each screen. */
function tkChipSafe() {
  try {
    tkChip();
  } catch (e) {}
}
(() => {
  const _r = render;
  render = function () {
    const r = _r.apply(this, arguments);
    try {
      tkChip();
    } catch (e) {}
    return r;
  };
  const _s = sheet;
  sheet = function () {
    const r = _s.apply(this, arguments);
    try {
      tkChip();
    } catch (e) {}
    return r;
  };
})();
if (typeof MENU !== "undefined" && Array.isArray(MENU) && !MENU.some(m => m[1] === "testkit"))
  MENU.splice(Math.max(0, MENU.length - 1), 0, [
    "Test with a friend",
    "testkit",
    "act",
    "Watch someone try five tasks and note where they get stuck",
  ]);
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
