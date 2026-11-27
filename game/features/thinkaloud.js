/* ============================================================================
   SLAM the Game: features/thinkaloud.js
   PURPOSE     Think-aloud test mode, the tester drives. A tester uses the game alone and says out loud
               what they think. A panel stays pinned at the bottom of every screen: the task to try, a
               tap counter for that task, and "Report this", open, with the name of the screen filled in.
               A report goes where Report a bug or idea goes (features/fbreport.js). At the end, the
               results show each task with its taps, its time and the screen where the tester stopped, and the tester can copy them as text.
               "Test with a friend" (features/testkit.js) is the other way: a coach watches and notes.
   INPUT       The game: G.ta (the test that runs), G.taRuns (past tests). The address: ?think=1 turns the
               mode on, ?think=0 turns it off. The admin menu row "Tester drives". The taps of the player.
   OUTPUT      Functions: taNew, taTap, taStart, taEnd, taSummary, taText, taNoteFor, taDock, taDockSafe,
               taSheet, taResults. Actions (ACT): thinkaloud, tago, tadone, taskip, tareport, tatype, taquit,
               taview, tacopy. Menu: "Tester drives" (admin only, account/roles.js RO_ONLY).
   DEPENDS ON  core/report.js, features/fbreport.js (fbFacts, fbSendNow), screens/dash.js (dkCard,
               dkTile, dkStatRow, dkCaption), screens/ui.js, features/testkit.js (tkChipSafe calls taDockSafe).
   RULES       A player never sees the panel unless the mode is on. The panel counts taps by the name of
               the button only, never a value. A report carries no money number (fbreport.js rules).
               No new table: a report waits on the device until the report inbox is ready.
   STATE       G.ta = { tasks: [{ t, taps, secs, st, at }], i, t0, sent }, G.taRuns (the last 20).
   ========================================================================= */
/* The three tasks of Batch B, phase 7, in Eli's words: the same list as Test with a friend (testkit.js). */
const TA_TASKS = TK_TASKS.map(x => x.t);
const TA_RUNS_MAX = 20;

/* ---------- the pure part: no screen, no storage ---------- */
/* A new test. st: "wait" (not started), "run", "done" or "skip". */
function taNew(list) {
  return {
    tasks: (list && list.length ? list : TA_TASKS).map(t => ({ t: String(t), taps: 0, secs: null, st: "wait" })),
    i: 0,
    t0: null,
    sent: 0,
  };
}
/* One tap on the screen counts for the task that runs. Returns the new count, or null when no task runs. */
function taTap(s) {
  const x = s && s.tasks[s.i];
  if (!x || x.st !== "run") return null;
  x.taps++;
  return x.taps;
}
function taStart(s, now) {
  const x = s && s.tasks[s.i];
  if (!x) return s;
  x.st = "run";
  x.taps = 0;
  s.t0 = now;
  return s;
}
/* Ends the task that runs: "done" or "skip". The next task waits. */
function taEnd(s, how, now, at) {
  const x = s && s.tasks[s.i];
  if (!x) return s;
  x.st = how === "skip" ? "skip" : "done";
  if (at) x.at = String(at);
  x.secs = s.t0 != null && now != null ? Math.max(1, Math.round((now - s.t0) / 1000)) : null;
  s.t0 = null;
  s.i++;
  return s;
}
function taOver(s) {
  return !!s && s.i >= s.tasks.length;
}
/* The totals of a test. */
function taSummary(s) {
  const T = (s && s.tasks) || [];
  return {
    n: T.length,
    done: T.filter(x => x.st === "done").length,
    skip: T.filter(x => x.st === "skip").length,
    taps: T.reduce((a, x) => a + x.taps, 0),
    secs: T.reduce((a, x) => a + (x.secs || 0), 0),
    sent: (s && s.sent) || 0,
  };
}
function taSecs(n) {
  return n == null ? "" : n < 90 ? n + " sec" : Math.round(n / 60) + " min";
}
function taStLabel(st) {
  return st === "done" ? "Done" : st === "skip" ? "Skipped" : st === "run" ? "Trying now" : "Not started";
}
/* The results as plain text, to paste anywhere. */
function taText(r) {
  const S = taSummary(r),
    L = ["Think-aloud test, the tester drives: " + (r.d || "")];
  r.tasks.forEach((x, i) => {
    L.push(i + 1 + ". " + x.t);
    L.push(
      "   " +
        taStLabel(x.st) +
        " · " +
        x.taps +
        (x.taps === 1 ? " tap" : " taps") +
        (x.secs != null ? " · " + taSecs(x.secs) : "") +
        (x.at ? " · stopped on: " + x.at : "")
    );
  });
  L.push("");
  L.push(
    "Done " +
      S.done +
      " of " +
      S.n +
      ", " +
      S.taps +
      " taps in all, " +
      S.sent +
      (S.sent === 1 ? " report" : " reports")
  );
  return L.join("\n");
}
/* The words in front of the tester's note: which task, and how many taps so far. Names and counts only. */
function taNoteFor(s, note) {
  const x = s && s.tasks[s.i];
  const pre = x
    ? "Think-aloud, task " + (s.i + 1) + " (" + x.t + "), " + x.taps + (x.taps === 1 ? " tap" : " taps")
    : "";
  const n = String(note == null ? "" : note).trim();
  return pre ? pre + (n ? ": " + n : "") : n;
}

/* ---------- the panel ---------- */
const TA = { type: null, said: "", busy: false };
const taOn = () => typeof G !== "undefined" && !!G && !!G.ta;
function taHasDoc() {
  return typeof document !== "undefined" && !!document.body && typeof document.createElement === "function";
}
function taScreen() {
  return typeof fbScreen === "function" ? fbScreen() : typeof tab === "string" ? tab : "home";
}
/* The screen where the tester stopped a task: the plain name from testkit.js. */
function taAt() {
  return typeof tkAt === "function" ? tkAt() : taScreen();
}
/* The top part of the panel: the task, the counter and the task buttons. Drawn again on each change. */
function taTop(s) {
  if (taOver(s))
    return `<div class="ta-row"><b>All ${s.tasks.length} tasks are done.</b></div><div class="ta-row"><button class="primary slim" data-a="taview" data-v="now">See the results</button><button class="ghost slim" data-a="taquit">End the test</button></div>`;
  const x = s.tasks[s.i],
    run = x.st === "run";
  return `<div class="ta-row between"><span class="dklabel">Task ${s.i + 1} of ${s.tasks.length}</span><span class="ta-taps" aria-live="polite"><b id="ta-n">${x.taps}</b> ${x.taps === 1 ? "tap" : "taps"}</span></div><div class="ta-task">${esc(x.t)}</div><div class="ta-row">${
    run
      ? `<button class="primary slim" data-a="tadone">I'm done</button><button class="ghost slim" data-a="taskip">Skip this one</button>`
      : `<button class="primary slim" data-a="tago">Start this task</button><button class="ghost slim" data-a="taquit">End the test</button>`
  }</div>`;
}
/* The report part: open all the time. The note box is built once, so a redraw never clears what the tester typed. */
function taReportPart() {
  const types =
    typeof RP_TYPES !== "undefined"
      ? RP_TYPES
      : [
          ["bug", "Bug"],
          ["idea", "Idea"],
          ["confusing", "Confusing"],
        ];
  return `<div class="ta-rep"><div class="ta-row between"><b>Report this</b><span class="tiny muted">On: <span id="ta-at"></span></span></div><div class="ta-row" role="group" aria-label="What kind">${types
    .map(
      t => `<button class="chip ta-type" data-a="tatype" data-v="${t[0]}" aria-pressed="false">${esc(t[1])}</button>`
    )
    .join(
      ""
    )}</div><label class="tiny muted" for="ta-note">What are you thinking? (optional)</label><textarea id="ta-note" rows="2" maxlength="900" placeholder="Say it out loud, or type a few words"></textarea><div class="tiny muted">The screen name and the task go with it. No money numbers.</div><div class="ta-row"><button class="ghost slim" data-a="tareport" id="ta-send">Send report</button><span class="tiny muted" id="ta-said" aria-live="polite"></span></div></div>`;
}
/* Draws the panel, or takes it away when the mode is off. */
function taDock() {
  if (!taHasDoc()) return;
  let el = document.getElementById("tadock");
  if (!taOn()) {
    if (el) el.remove();
    if (document.body.classList.contains("ta-on")) document.body.style.paddingBottom = "";
    document.body.classList.remove("ta-on");
    return;
  }
  if (!el) {
    el = document.createElement("div");
    el.id = "tadock";
    el.setAttribute("role", "region");
    el.setAttribute("aria-label", "Think-aloud test");
    el.innerHTML = `<div class="ta-in"><div id="ta-top"></div>${taReportPart()}</div>`;
    document.body.appendChild(el);
  }
  document.body.classList.add("ta-on");
  /* The panel sits above the tab bar (nav.tabs, fixed at the bottom on a phone), and the page gets room under its
     last row, so nothing of the game hides behind the panel. */
  try {
    const nav = document.querySelector("nav.tabs"),
      tabH = nav && getComputedStyle(nav).display !== "none" ? nav.offsetHeight : 0;
    el.style.bottom = tabH + "px";
    document.body.style.paddingBottom = el.offsetHeight + tabH + 16 + "px";
    document.body.style.setProperty(
      "--ta-h",
      el.offsetHeight + tabH + "px"
    ); /* a sheet scrolls its last row above the panel */
  } catch (e) {
    report(e, "thinkaloud.js: taDock");
  }
  const top = document.getElementById("ta-top"),
    at = document.getElementById("ta-at"),
    said = document.getElementById("ta-said");
  if (top) top.innerHTML = taTop(G.ta);
  if (at) at.textContent = taScreen();
  if (said) said.textContent = TA.said || (TA.type ? "" : "Pick Bug, Idea or Confusing to send");
  Array.prototype.forEach.call(el.querySelectorAll(".ta-type"), b => {
    const on = b.dataset.v === TA.type;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  const send = document.getElementById("ta-send");
  if (send) {
    send.disabled = !TA.type || TA.busy;
    send.title = TA.type ? "" : "Pick Bug, Idea or Confusing first";
  }
}
/* Part of tkChipSafe() in testkit.js (called by render, sheet and closeSheet). The panel follows each screen. */
function taDockSafe() {
  try {
    taDock();
  } catch (e) {
    report(e, "thinkaloud.js: taDockSafe");
  }
}
/* The sheet before a test, and the results after it. */
function taSheet() {
  const w = W || {},
    runs = G.taRuns || [];
  if (w.view != null) {
    const r = w.view === "now" ? Object.assign({ d: todayISO() }, G.ta) : runs[w.view];
    if (r) return taResults(r, w);
  }
  return (
    head("Admin", "Tester drives") +
    dkCaption("A think-aloud test the tester runs alone") +
    dkCard(
      "How it works",
      `<div class="small">A panel stays at the bottom of every screen with one task at a time, a tap counter, and "Report this", already open. Ask the tester to say what they think out loud while they try.</div><div class="small">Or send this address to a tester: the game with <b>?think=1</b> at the end. <b>?think=0</b> turns it off.</div>`
    ) +
    dkCard(
      "The tasks",
      `<div class="stack" style="gap:4px">${TA_TASKS.map((t, i) => `<div class="small">${i + 1}. ${esc(t)}</div>`).join("")}</div>`
    ) +
    `<button class="primary wide" data-a="thinkaloud" data-v="on">${taOn() ? "The test is on" : "Turn on the test"}</button>` +
    (runs.length
      ? dkCard(
          "Past tests",
          `<div class="stack" style="gap:6px">${runs
            .map((r, i) => {
              const S = taSummary(r);
              return `<button class="rowbtn prow" data-a="taview" data-v="${i}"><span class="pn"><b>${esc(r.d)}</b><div class="tiny muted">Done ${S.done} of ${S.n} · ${S.taps} taps</div></span><span class="pill">View ›</span></button>`;
            })
            .join("")}</div>`
        )
      : "")
  );
}
function taResults(r, w) {
  const S = taSummary(r);
  return (
    head("Tester drives", "The results") +
    dkCaption("Each task, the taps it took, and the time") +
    dkStatRow([
      dkTile("Tasks done", S.done + " of " + S.n),
      dkTile("Taps in all", String(S.taps)),
      dkTile("Time", taSecs(S.secs) || "None yet"),
      dkTile("Reports", String(S.sent)),
    ]) +
    r.tasks
      .map(x =>
        dkCard(
          "",
          `<div class="small"><b>${esc(x.t)}</b></div><div class="row" style="gap:6px;flex-wrap:wrap">${dkPill(taStLabel(x.st), x.st === "done" ? "okp" : "")}${dkPill(x.taps + (x.taps === 1 ? " tap" : " taps"))}${x.secs != null ? dkPill(taSecs(x.secs)) : ""}</div>${x.at ? `<div class="tiny muted">Stopped on: ${esc(x.at)}</div>` : ""}`
        )
      )
      .join("") +
    `<div class="small muted">Look first at the task with the most taps: that is where the path is longest.</div><button class="primary wide" data-a="tacopy" data-v="${w.view}">${w.copied ? "Copied ✓" : "Copy these results"}</button>` +
    (w.view === "now"
      ? `<button class="ghost wide slim" data-a="taquit">End the test and keep the results</button>`
      : "")
  );
}
function taOpen(view) {
  W = { kind: "thinkaloud", view: view == null ? null : view };
  sheet(taSheet);
}
/* Turns the mode on or off, and keeps it. */
function taSet(on) {
  if (on && !G.ta) G.ta = taNew();
  if (!on && G.ta) {
    if (G.ta.tasks.some(x => x.st !== "wait"))
      G.taRuns = (G.taRuns || []).concat([Object.assign({ d: todayISO() }, G.ta)]).slice(-TA_RUNS_MAX);
    G.ta = null;
  }
  TA.type = null;
  TA.said = "";
  save();
  taDock();
}
Object.assign(ACT, {
  thinkaloud: t => {
    if (t && t.dataset && t.dataset.v === "on") {
      taSet(true);
      closeSheet();
      return;
    }
    taOpen();
  },
  tago: () => {
    if (!G.ta) return;
    taStart(G.ta, Date.now());
    save();
    taDock();
  },
  tadone: () => {
    if (!G.ta) return;
    taEnd(G.ta, "done", Date.now(), taAt());
    save();
    taDock();
  },
  taskip: () => {
    if (!G.ta) return;
    taEnd(G.ta, "skip", Date.now(), taAt());
    save();
    taDock();
  },
  tatype: t => {
    TA.type = TA.type === t.dataset.v ? null : t.dataset.v;
    TA.said = "";
    taDock();
  },
  tareport: () => {
    if (!G.ta || !TA.type || TA.busy || typeof fbSendNow !== "function") return;
    const box = taHasDoc() ? document.getElementById("ta-note") : null,
      note = taNoteFor(G.ta, box ? box.value : ""),
      facts = typeof fbFacts === "function" ? fbFacts() : null;
    TA.busy = true;
    TA.said = "Sending…";
    taDock();
    const done = st => {
      TA.busy = false;
      TA.type = null;
      TA.said = st === "sent" ? "Sent. Thank you." : "Saved on this device. It sends itself later.";
      if (G.ta) G.ta.sent++;
      if (box) box.value = "";
      save();
      taDock();
    };
    fbSendNow({ type: TA.type, note, facts }).then(done, e => {
      report(e, "thinkaloud.js: tareport");
      done("saved");
    });
  },
  taquit: () => {
    taSet(false);
    if (typeof SH !== "undefined" && SH) closeSheet();
    else if (typeof render === "function") render();
  },
  taview: t => {
    const v = t.dataset.v;
    taOpen(v === "now" ? "now" : +v);
  },
  tacopy: t => {
    const v = t.dataset.v,
      r = v === "now" ? Object.assign({ d: todayISO() }, G.ta) : (G.taRuns || [])[+v];
    if (!r) return;
    const done = () => {
      if (W && W.kind === "thinkaloud") {
        W.copied = true;
        drawSheet();
      }
    };
    try {
      navigator.clipboard.writeText(taText(r)).then(done, done);
    } catch (e) {
      report(e, "thinkaloud.js: tacopy");
      done();
    }
  },
});
if (typeof MENU !== "undefined" && Array.isArray(MENU) && !MENU.some(m => m[1] === "thinkaloud"))
  MENU.splice(Math.max(0, MENU.length - 1), 0, [
    "Tester drives",
    "thinkaloud",
    "act",
    "A think-aloud test: tasks, a tap counter and Report this on every screen",
  ]);
/* At page load: the address turns the mode on or off; each tap outside the panel counts for the task that runs. */
(() => {
  if (!taHasDoc()) return;
  try {
    const q = new URLSearchParams(location.search).get("think");
    if (q === "1") taSet(true);
    else if (q === "0") taSet(false);
  } catch (e) {
    report(e, "thinkaloud.js: page load");
  }
  document.addEventListener(
    "click",
    e => {
      if (!taOn()) return;
      const t = e.target && e.target.closest ? e.target.closest("button,a,summary,[data-a],input,select,label") : null;
      if (!t || (t.closest && t.closest("#tadock"))) return;
      if (taTap(G.ta) === null) return;
      save();
      taDock();
    },
    true
  );
  taDock();
})();
