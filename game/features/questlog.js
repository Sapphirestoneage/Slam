/* ============================================================================
   SLAM the Game: features/questlog.js
   PURPOSE     The Quest Log ("Where am I"). One button, on every tab and on every sheet, opens one sheet
               that shows where the player is: a Continue card (back to where they left off), one pinned
               focus, one nudge, four tabs that are four doors to the same screens (Journey, Areas,
               Questions, Time), the last places they went, and a link to the big picture. The game also
               records the trail of the last 10 screens of each profile.
   INPUT       The profile: c.x.trail (the last 10 screens), c.x.lastOpen (the last screen opened and not
               finished), c.x.quest (the pin, the states of the parts, the nudges put away). The layers
               (layers() in core/engine2.js), the setup questions (sharpList), D.A.I.T.E. (know.js), the due
               list (plAutoToday in planner.js), the four questions (FRONT_BTN in ask3.js). The open sheet
               (W.kind): quest.
   OUTPUT      Functions: questX, questIcon, questButton, questLabel, questRecord, questJourney, questFinished,
               questIsWork, questProgress, questNext, questContinue, questNudge, questContinueCard,
               questJourneyTab, questAreasTab, questQuestionsTab, questTimeTab, questSheet. Parts of
               functions in other files: sheetQuest (sheet in ui.js), topbarQuest (topbarHTML in
               planner.js), nvRowQuest (nvRowBase in nav.js), homeQuestRow (home in ui.js), bonBodyQuest
               (bonBody in games.js). Actions (ACT): quest, questtab, questgo, questpin, questst,
               questnudge, questbon, questplan. Menu: "Where am I" (planner.js).
   DEPENDS ON  core/engine.js, core/engine2.js, screens/ui.js, screens/planner.js, screens/nav.js,
               features/games.js, features/games2.js, features/know.js, features/reveal.js (homeRowAdd),
               features/ask3.js, features/kit.js.
   RULES       A part is Done when the game's own check says so. The player can mark a part "Working on it"
               or "Doesn't apply to me". A part that does not apply counts as done for "x of y". A layer is
               locked until the one before it is done (Layer 1 until setup). Only one pin and only one nudge.
               A jump from the Quest Log opens the screen on top of it, so Back returns to the Quest Log.
   ========================================================================= */
const QUEST = { snap: {} };
const QUEST_TRAIL = 10;
const QUEST_SKIP = { quest: 1, info: 1, menu: 1, dash: 1, glossary: 1, built: 1 };
const QUEST_TABS = [
  ["journey", "Journey"],
  ["areas", "Areas"],
  ["questions", "Questions"],
  ["time", "Time"],
];
function questX(c) {
  c.x = c.x || {};
  c.x.quest = c.x.quest || {};
  c.x.quest.st = c.x.quest.st || {};
  c.x.quest.off = c.x.quest.off || {};
  if (!Array.isArray(c.x.trail)) c.x.trail = [];
  return c.x.quest;
}
/* A map pin. */
function questIcon() {
  return `<svg class="qpin" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/></svg>`;
}
/* The button "Where am I". cls is "slim" for the sheet header. */
function questButton(cls) {
  return `<button class="questbtn ${cls || ""}" data-a="quest" aria-label="Where am I">${questIcon()}<span>Where am I</span></button>`;
}
/* The name of a screen: the "i" registry of nav.js, a part of the journey, or the kind. */
function questLabel(c, kind, v) {
  if (kind === "setup") return "Setup";
  if (kind === "sharp" && v && typeof SHARP_Q !== "undefined" && SHARP_Q[v]) return SHARP_Q[v];
  const part = questJourney(c)
    .reduce((a, r) => a.concat(r.parts), [])
    .find(p => p.a === kind);
  if (part) return part.n;
  if (typeof NV_INFO !== "undefined" && NV_INFO[kind]) return NV_INFO[kind][0];
  if (typeof GLOSS !== "undefined" && GLOSS["scr_" + kind]) return GLOSS["scr_" + kind][0];
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}
/* THE JOURNEY: Setup and the four layers, each with its parts. Each part: { key, n, ok, a, v, st }.
   st is done, na (does not apply), work (working on it) or open. */
function questJourney(c, d) {
  d = d || D || derive(c);
  const S = (c.x && c.x.quest && c.x.quest.st) || {},
    part = (n, ok, a, v) => {
      const key = a + (v ? ":" + v : "");
      return {
        key,
        n,
        ok: !!ok,
        a,
        v: v || "",
        st: ok ? "done" : S[key] === "na" ? "na" : S[key] === "work" ? "work" : "open",
      };
    },
    rows = [
      {
        id: "setup",
        n: "Setup",
        parts: [part("Make your character", c.placed, "start")].concat(
          (typeof sharpList === "function" ? sharpList(c) : []).map(k => part(SHARP_Q[k], isSharp(c, k), "sharp", k))
        ),
      },
    ];
  let L = [];
  try {
    L = layers(c, d);
  } catch (e) {
    report(e, "questlog.js: questJourney");
  }
  L.filter(l => l.parts.length).forEach(l =>
    rows.push({
      id: "L" + l.n,
      n: "Layer " + l.n + ": " + l.name,
      layer: l.n,
      parts: l.parts.map(p => part(p.n, p.ok, p.a, p.v)),
    })
  );
  rows.forEach((r, i) => {
    r.done = r.parts.filter(p => p.st === "done" || p.st === "na").length;
    r.total = r.parts.length;
    r.complete = r.done === r.total;
    const prev = rows[i - 1];
    r.locked = r.layer === 1 ? !c.placed : !!(prev && r.layer && !prev.complete);
    r.after = prev ? prev.n : "";
    /* what finishing the row before gives, without the line that names this layer */
    r.unlock = !r.layer
      ? []
      : r.layer === 1
        ? ["Your era, from your own answers", "Layer 1: " + LAYER_N[1].toLowerCase()]
        : ((typeof UNLOCK !== "undefined" && UNLOCK[r.layer - 1]) || []).filter(u => !/^Layer \d/.test(u));
  });
  return rows;
}
/* A screen kind is "work" when it is a part of the journey, or D.A.I.T.E. */
function questIsWork(c, kind) {
  return (
    kind === "know" ||
    kind === "setup" ||
    questJourney(c).some(r => r.parts.some(p => p.a === kind || (kind === "setup" && p.a === "start")))
  );
}
/* Finished: the game's own check for that part (layers, setup, D.A.I.T.E.). */
function questFinished(c, kind, v) {
  if (kind === "know") return typeof kwAll === "function" && kwAll(c, D || derive(c)).pct >= 100;
  const a = kind === "setup" ? "start" : kind,
    ps = questJourney(c)
      .reduce((x, r) => x.concat(r.parts), [])
      .filter(p => p.a === a && (!v || !p.v || p.v === v));
  return ps.length > 0 && ps.every(p => p.st === "done" || p.st === "na");
}
/* "2 of 4 done in Layer 2: Sorting", for the row of a part. */
function questProgress(c, kind) {
  if (kind === "know" && typeof kwAll === "function") {
    const K = kwAll(c, D || derive(c));
    return K.known + " of " + K.total + " things you know";
  }
  const a = kind === "setup" ? "start" : kind,
    r = questJourney(c).find(x => x.parts.some(p => p.a === a));
  return r ? r.done + " of " + r.total + " done in " + r.n : "";
}
/* Part of sheet() in ui.js. Records the screen in the trail, and keeps it as lastOpen when it is work that is
   not finished. */
function sheetQuest(fn) {
  try {
    const c = C();
    if (!c || !W || !W.kind || QUEST_SKIP[W.kind] || G.demo) return;
    questRecord(c, W.kind, W.v != null ? W.v : W.q != null ? W.q : W.id != null ? W.id : "", fn, W);
  } catch (e) {
    report(e, "questlog.js: sheetQuest");
  }
}
function questRecord(c, kind, v, fn, w) {
  questX(c);
  const vv = typeof v === "string" || typeof v === "number" ? String(v) : "",
    e = { kind, v: vv, label: questLabel(c, kind, vv), t: new Date().toISOString() },
    key = kind + "|" + vv;
  if (fn && w) QUEST.snap[key] = { SH: fn, W: Object.assign({}, w) };
  const tr = c.x.trail.filter(x => x.kind + "|" + x.v !== key);
  tr.unshift(e);
  c.x.trail = tr.slice(0, QUEST_TRAIL);
  if (questIsWork(c, kind) && !questFinished(c, kind, vv)) c.x.lastOpen = e;
  save();
}
/* The next part to do: the first open part (or one in progress) in the first row that is not locked. */
function questNext(c) {
  const rows = questJourney(c);
  for (const r of rows) {
    if (r.locked) continue;
    const p = r.parts.find(x => x.st === "work") || r.parts.find(x => x.st === "open");
    if (p) return { row: r, part: p };
  }
  return null;
}
/* THE CONTINUE CARD: the last unfinished screen, or the next part. { label, progress, a, v } or null. */
function questContinue(c) {
  const lo = c.x && c.x.lastOpen;
  if (lo && questIsWork(c, lo.kind) && !questFinished(c, lo.kind, lo.v))
    return {
      label: lo.label,
      progress: questProgress(c, lo.kind),
      a: lo.kind === "setup" ? "start" : lo.kind,
      v: lo.v,
      from: "last",
    };
  const N = questNext(c);
  return N
    ? {
        label: N.part.n,
        progress: N.row.done + " of " + N.row.total + " done in " + N.row.n,
        a: N.part.a,
        v: N.part.v,
        from: "next",
      }
    : null;
}
/* ONE NUDGE: a save point that is ready, then the first due item (payday, the monthly session, the daily
   check). None after the player put it away today. */
function questNudge(c) {
  const X = questX(c),
    t = todayISO(),
    list = [];
  try {
    const n = typeof bonfireDue === "function" ? bonfireDue(c, D || derive(c)) : null;
    if (n)
      list.push({ id: "bon" + n, t: "A save point is ready: Layer " + n + " is done", a: "questbon", v: String(n) });
    (typeof plAutoToday === "function" ? plAutoToday(c) : []).forEach(p =>
      list.push({ id: p.id, t: p.t, a: p.a, v: p.v || "" })
    );
  } catch (e) {
    report(e, "questlog.js: questNudge");
  }
  return list.find(x => X.off[x.id] !== t) || null;
}
function questContinueCard(c, small) {
  const K = questContinue(c);
  if (!K)
    return `<div class="card qcont ${small ? "qsmall" : ""}"><div class="row between"><div class="eyebrow">Continue</div>${kitInfo("q_continue")}</div><div class="small">Every part of the journey is done. The big picture shows what is next.</div></div>`;
  return `<div class="row between qconthead"><span class="eyebrow">Continue</span>${kitInfo("q_continue")}</div><button class="card next pulse qcont ${small ? "qsmall" : ""}" data-a="questgo" data-k="${esc(K.a)}" data-v="${esc(K.v)}"><b class="${small ? "" : "big"} qlabel">${K.from === "last" ? "Pick up where you left off" : "Next up"}: ${esc(K.label)}</b>${K.progress ? `<span class="tiny muted">${esc(K.progress)}</span>` : ""}</button>`;
}
const QUEST_ST = { done: "Done ✓", work: "Working on it", na: "Doesn't apply to me", open: "Not started" };
function questJourneyTab(c) {
  const X = questX(c),
    pin = X.pin && X.pin.key;
  return questJourney(c)
    .map(r => {
      const status = r.locked ? "🔒 Locked" : r.complete ? "Done ✓" : r.done ? "In progress" : "Not started";
      const body = r.locked
        ? `<div class="small muted qlock">Opens after ${esc(r.after)}. You'll get: ${esc(r.unlock.join(", "))}.</div>`
        : r.parts
            .map(
              p =>
                `<div class="qpart"><div class="row between" style="gap:8px"><button class="linkish grow" data-a="questgo" data-k="${esc(p.a)}" data-v="${esc(p.v)}">${esc(p.n)}</button><span class="row" style="gap:6px;flex:none"><span class="pill ${p.st === "done" ? "okp" : p.st === "work" ? "info" : ""}">${QUEST_ST[p.st]}</span><button class="qstar ${pin === p.key ? "on" : ""}" data-a="questpin" data-k="${esc(p.key)}" aria-label="${pin === p.key ? "Unpin my focus" : "Pin as my focus"}">${pin === p.key ? "★" : "☆"}</button></span></div>${
                  p.st === "done"
                    ? ""
                    : `<div class="seg qseg"><button class="${p.st === "work" ? "on" : ""}" data-a="questst" data-k="${esc(p.key)}" data-v="work">Working on it</button><button class="${p.st === "na" ? "on" : ""}" data-a="questst" data-k="${esc(p.key)}" data-v="na">Doesn't apply to me</button></div>`
                }</div>`
            )
            .join("");
      return `<details class="qrow ${r.locked ? "qlocked" : ""}"><summary><span><b>${esc(r.n)}</b><span class="tiny muted"> · ${r.done} of ${r.total}</span></span><span class="pill">${status}</span></summary><div class="inner stack" style="gap:6px">${body}</div></details>`;
    })
    .join("");
}
function questAreasTab(c) {
  if (typeof kwAreas !== "function") return "";
  return kwAreas(c, D || derive(c))
    .map(
      a =>
        `<button class="rowbtn qarea" ${a.next ? `data-a="kwgo" data-k="${esc(a.next.a)}" data-v="${esc(a.next.av || "")}"` : `data-a="know"`}><span><b>${a.k} · ${esc(a.n)}</b><div class="tiny muted">${a.next ? "Next: " + esc(a.next.t) : "All known ✓"}</div></span><span class="row" style="gap:6px"><b>${a.pct}%</b><span class="caret">›</span></span></button>`
    )
    .join("");
}
function questQuestionsTab() {
  if (typeof FRONT_BTN === "undefined") return "";
  return `<div class="grid2 frontgrid">${FRONT_BTN.map(b => `<button class="frontbtn" data-a="front" data-v="${b[0]}">${esc(b[1])}</button>`).join("")}</div>`;
}
function questTimeTab(c) {
  const t = todayISO(),
    auto = typeof plAutoToday === "function" ? plAutoToday(c) : [],
    tasks = typeof plTasksOn === "function" ? plTasksOn(c, t).filter(plOpen) : [],
    plan = typeof plX === "function" ? plX(c).plan.filter(plOpen) : [],
    wk = plan.filter(p => p.when > t && p.when <= addDays(t, 7)).length,
    mo = plan.filter(p => p.when > addDays(t, 7) && p.when <= addDays(t, 31)).length,
    today = auto
      .map(
        p =>
          `<button class="rowbtn" data-a="${esc(p.a)}" data-v="${esc(p.v || "")}"><span>${esc(p.t)}</span><span class="caret">›</span></button>`
      )
      .concat(
        tasks.map(
          p =>
            `<button class="rowbtn" data-a="plgo" data-v="${esc(p.id)}"><span>${esc(p.t)}</span><span class="caret">›</span></button>`
        )
      );
  return (
    `<div class="small"><b>Today</b> ${kitInfo("q_today")}</div>` +
    (today.length ? today.slice(0, 5).join("") : `<div class="small muted">Nothing is due today.</div>`) +
    `<button class="rowbtn" data-a="questplan" data-v="week"><span><b>This week</b><div class="tiny muted">${wk} more on Next Steps</div></span><span class="caret">›</span></button>` +
    `<button class="rowbtn" data-a="questplan" data-v="month"><span><b>This month</b><div class="tiny muted">${mo} more on Next Steps</div></span><span class="caret">›</span></button>` +
    `<div class="small" style="margin-top:6px"><b>Check in</b></div><div class="row wrap" style="gap:6px"><button class="ghost slim" data-a="daily">Daily check</button><button class="ghost slim" data-a="payday">Payday</button><button class="ghost slim" data-a="month">Monthly session</button></div>`
  );
}
function questSheet() {
  const c = C(),
    X = questX(c),
    tab = (W && W.tab) || "journey",
    N = questNudge(c),
    recent = c.x.trail.slice(0, 5);
  let h = head("Where am I", "Your quest log") + questContinueCard(c, false);
  if (X.pin)
    h += `<div class="tile row between qfocus" style="gap:8px"><span><span class="tiny muted">My focus ${kitInfo("q_focus")}</span><br><button class="linkish" data-a="questgo" data-k="${esc(X.pin.a)}" data-v="${esc(X.pin.v || "")}"><b>${esc(X.pin.n)}</b></button></span><button class="ghost slim" data-a="questpin" data-k="${esc(X.pin.key)}">Unpin</button></div>`;
  if (N)
    h += `<div class="tile row between qnudge" style="gap:8px"><button class="linkish grow" data-a="${esc(N.a)}" data-v="${esc(N.v)}">${esc(N.t)}</button><span class="row" style="gap:6px;flex:none">${kitInfo("q_nudge")}<button class="ghost slim" data-a="questnudge" data-k="${esc(N.id)}" aria-label="Put this away for today">Not now</button></span></div>`;
  h += `<div class="row between" style="gap:8px">${kitTabs("questtab", tab, QUEST_TABS)}${kitInfo("q_" + tab)}</div>`;
  h += `<div class="stack qtab" style="gap:6px">${tab === "areas" ? questAreasTab(c) : tab === "questions" ? questQuestionsTab() : tab === "time" ? questTimeTab(c) : questJourneyTab(c)}</div>`;
  if (recent.length)
    h += `<div class="stack qrecent" style="gap:2px"><div class="tiny muted">Recent ${kitInfo("q_recent")}</div>${recent.map(e => `<button class="rowbtn bare" data-a="questgo" data-k="${esc(e.kind === "setup" ? "start" : e.kind)}" data-v="${esc(e.v)}"><span class="small">${esc(e.label)}</span><span class="caret">›</span></button>`).join("")}</div>`;
  h += `<button class="linkish" data-a="tab" data-v="map">See the big picture</button>`;
  return h;
}
/* Part of topbarHTML() in planner.js. The button "Where am I" in the top bar, on each tab. */
function topbarQuest() {
  return questButton("");
}
/* Part of nvRowBase() in nav.js. The button "Where am I" in the header of each sheet. */
function nvRowQuest() {
  return W && W.kind === "quest" ? "" : questButton("slim");
}
/* Part of home() in ui.js. Under the top numbers: one Continue card and the button "Where am I". */
function homeQuestRow(h) {
  try {
    const c = C();
    if (!c || !(c.placed || G.demo) || typeof homeRowAdd !== "function") return h;
    return homeRowAdd(
      h,
      `<div class="homerow qhome">${questContinueCard(c, true)}<div class="row" style="gap:8px">${questButton("wide grow")}${kitInfo("q_where")}</div></div>`
    );
  } catch (e) {
    report(e, "questlog.js: homeQuestRow");
    return h;
  }
}
/* Part of bonBody() in games.js. At the Layer 3 save point: the full plan is ready, with its four tools. */
function bonBodyQuest(h, n) {
  if (n !== 3) return h;
  const card = `<div class="tile stack qplanready" style="text-align:left;gap:6px"><b>Your full plan is ready</b><div class="small muted">Your numbers are exact enough for the plan tools.</div><div class="grid2"><button class="ghost slim" data-a="paths">Two paths</button><button class="ghost slim" data-a="odds">Retirement odds</button><button class="ghost slim" data-a="cover">Insurance needs</button><button class="ghost slim" data-a="sims">Simulators</button></div></div>`;
  return h.replace(/(<button class="primary wide go" data-a="bonok")/, m => card + m);
}
kitTerms({
  q_where: [
    "Where am I",
    "One button on every screen. It shows where you are, where you left off, and every place you can go.",
  ],
  q_continue: ["Continue", "The last thing you opened and did not finish, or else the next part of your journey."],
  q_focus: ["My focus", "One part you pinned with a star, so it stays at the top. Tap Unpin to clear it."],
  q_nudge: [
    "One nudge",
    "The one thing that is due now, like payday or a check-in. Not now puts it away until tomorrow.",
  ],
  q_journey: [
    "Journey",
    "Setup and the four layers, in order. Each part is done, working on it, or does not apply to you.",
  ],
  q_areas: [
    "Areas",
    "The five things to know about your money: Debts, Assets, Income, Taxes, Expenses. Tap one to fill in its next piece.",
  ],
  q_questions: ["Questions", "The four plain questions you can ask about your money at any time."],
  q_time: ["Time", "What is due today, this week and this month, and your check-ins."],
  q_today: ["Today", "The things due today from Next Steps. Tap one to do it."],
  q_recent: ["Recent", "The last places you went. Tap one to go back."],
});
kitScreen(
  "quest",
  "Where am I",
  "Where you are, where you left off, and every place you can go.",
  "Each tab is a different door to the same screens."
);
Object.assign(ACT, {
  quest: () => {
    W = { kind: "quest", tab: "journey", o: {} };
    sheet(questSheet);
  },
  questtab: t => {
    if (!W || W.kind !== "quest") return;
    W.tab = t.dataset.v;
    drawSheet();
  },
  /* Jump to a screen. The screen opens on top of the Quest Log, so Back returns here. */
  questgo: t => {
    const a = t.dataset.k,
      v = t.dataset.v || "",
      snap = QUEST.snap[a + "|" + v];
    if (typeof ACT[a] === "function") ACT[a]({ dataset: { a, v, k: v } });
    else if (snap) {
      W = Object.assign({}, snap.W);
      sheet(snap.SH);
    } else go("home");
  },
  questpin: t => {
    const c = C(),
      X = questX(c),
      k = t.dataset.k;
    if (X.pin && X.pin.key === k) X.pin = null;
    else {
      const p = questJourney(c)
        .reduce((a, r) => a.concat(r.parts), [])
        .find(x => x.key === k);
      if (p) X.pin = { key: p.key, a: p.a, v: p.v, n: p.n };
    }
    save();
    drawSheet();
  },
  questst: t => {
    const X = questX(C()),
      k = t.dataset.k,
      v = t.dataset.v;
    X.st[k] = X.st[k] === v ? null : v;
    save();
    drawSheet();
  },
  questnudge: t => {
    questX(C()).off[t.dataset.k] = todayISO();
    save();
    drawSheet();
  },
  questbon: t => {
    if (typeof bonfire === "function") bonfire(+t.dataset.v);
  },
  questplan: t => {
    if (typeof PLV !== "undefined") PLV = t.dataset.v;
    go("plan");
  },
});
/* "Where am I" is the first row of the menu (planner.js), also after other files put a row first. */
if (typeof MENU !== "undefined" && Array.isArray(MENU)) {
  const i = MENU.findIndex(m => m[1] === "quest");
  if (i > 0) MENU.unshift(MENU.splice(i, 1)[0]);
}
