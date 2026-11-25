/* ============================================================================
   SLAM the Game: features/reveal.js
   PURPOSE     Meet your character. Six cards, one tap each, change the numbers into a person: chapter,
               era, who the player is with money, the strongest number, and the first quest. Then one
               sheet with a copy button.
   INPUT       The game: G.demo, G.tourSeen. The profile: c.x.revSeen. The open sheet (W.kind): reveal.
               The taps of the player (the actions in OUTPUT).
   OUTPUT      8 functions. Parts of functions in other files: meTabReveal, homeRevealRow. Actions
               (ACT): reveal, rvnext, rvagain, rvcopy.
   DEPENDS ON  core/report.js, core/engine.js, screens/ui.js, screens/ux.js, core/metrics.js.
   USES LATER  Names from files that the browser loads later. Behind a typeof test, thus safe while the
               page loads: features/drills.js, account/addon.js.
   RULES       The sheet has no dollar amounts, thus the player can send it to a friend. A number from a
               guess is not ranked.
   ========================================================================= */
function rvData(c, d) {
  const now = identityNow(c, d),
    met = i => i.crit.every(k => k[1](d, c)),
    asked = IDENT.find(i => i.id === c.want),
    want =
      asked && !met(asked) && IDENT.indexOf(asked) > IDENT.indexOf(now)
        ? asked
        : IDENT[Math.min(IDENT.length - 1, IDENT.indexOf(now) + 1)] || now,
    left = want.crit.filter(k => !k[1](d, c)).map(k => k[0]);
  const M =
      typeof knMetrics === "function" && c.placed
        ? knMetrics(c, d).filter(m => m.num != null && m.st !== "Guess" && m.zone && m.id !== "dollar")
        : [],
    strong = M.find(m => m.zone[1] === "good") || null,
    watch = M.find(m => m.zone[1] === "ok") || null,
    ns = nextStep(c, d);
  return {
    name: String(c.name || "You"),
    chapter: chapterOf(c),
    era: d.era,
    eraN: eraName(d),
    eraOne: (ERAS[d.era] || {}).one || "",
    next: d.era < 9 ? EP(Math.min(9, d.era + 1)) : null,
    gate: d.era < 9 ? (ERAS[d.era + 1] || {}).gate || "" : "",
    now,
    want,
    left,
    strong,
    watch,
    quest: ns && ns.t ? ns.t : "Make one number real",
    real: M.length,
  };
}
/* rvText() returns the text of the character sheet, for copy. rvTextBase() is the part from this file. */
function rvText(c, d) {
  /* addon.js: a text for sharing has the standard look, with nothing from an add-on. */
  if (typeof adPlainText === "function") return adPlainText(() => rvTextBase(c, d));
  return rvTextBase(c, d);
}
function rvTextBase(c, d) {
  const R = rvData(c, d),
    L = [
      R.name + ", in SLAM the Game",
      "Chapter: " + R.chapter,
      "Era " + R.era + " of 9: " + R.eraN,
      "Right now: " + R.now.n + ". " + R.now.one,
    ];
  if (R.want.id !== R.now.id) L.push("Becoming: " + R.want.n);
  if (R.strong) L.push("Strongest number: " + R.strong.n);
  L.push("Current quest: " + R.quest);
  /* quizzes.js: the quiz results that the player chose to show */
  return typeof rvTextQuiz === "function" ? rvTextQuiz(L.join("\n"), c) : L.join("\n");
}
function rvCard(eyebrow, big, line, extra) {
  return `<div class="levelup pop" style="padding:8px 0"><div class="eyebrow">${eyebrow}</div><h2 style="margin:8px 0" data-fid="rv:big">${big}</h2><div class="small" style="margin:6px 0">${line}</div>${extra || ""}</div>`;
}
function rvSheet() {
  const c = C(),
    d = D || derive(c),
    w = W,
    R = rvData(c, d),
    N = 6,
    i = Math.min(w.i || 0, N),
    dots = `<div class="row" style="justify-content:center;gap:6px;margin:4px 0">${Array.from({ length: N }, (_, k) => `<span class="rvdot ${k <= i ? "on" : ""}"></span>`).join("")}</div>`;
  const nextBtn = l => `<button class="primary wide go" data-a="rvnext">${l || "Next"}</button>`;
  if (i === 0)
    return (
      head("Meet your character", "1 of " + N) +
      rvCard(
        "This is",
        esc(R.name),
        "Age " + c.age + ". Your chapter: <b>" + esc(R.chapter) + "</b>.",
        `<div class="tiny muted">A chapter is the stretch of life you are in. It changes what a good move looks like.</div>`
      ) +
      dots +
      nextBtn("Show me")
    );
  if (i === 1)
    return (
      head("Meet your character", "2 of " + N) +
      rvCard(
        "Your era",
        esc(R.eraN),
        esc(R.eraOne),
        `<div class="pill info" style="margin-top:6px">Era ${R.era} of 9</div>${R.next ? `<div class="tiny muted" style="margin-top:8px">Next: ${esc(R.next)}. ${esc(R.gate)}.</div>` : ""}`
      ) +
      dots +
      nextBtn()
    );
  if (i === 2)
    return (
      head("Meet your character", "3 of " + N) +
      rvCard(
        "With money, right now you are",
        esc(R.now.n),
        esc(R.now.one),
        R.want.id !== R.now.id
          ? `<div class="tile stack" style="gap:4px;text-align:left;margin-top:8px"><div class="tiny muted">You are becoming</div><b>${esc(R.want.n)}</b>${R.left
              .slice(0, 3)
              .map(l => `<div class="small">○ ${esc(l)}</div>`)
              .join("")}</div>`
          : `<div class="tiny muted">You are who you set out to be. Pick a new one under Me any time.</div>`
      ) +
      dots +
      nextBtn()
    );
  if (i === 3)
    return (
      head("Meet your character", "4 of " + N) +
      (R.strong
        ? rvCard(
            "Your strongest number",
            esc(R.strong.n),
            esc(R.strong.val) + " · " + esc(R.strong.zone[0]),
            `<div class="tiny muted">${esc(R.strong.what)}</div>`
          )
        : rvCard(
            "Your strongest number",
            R.real ? "Still forming" : "Not known yet",
            R.real
              ? "Nothing stands out yet, and that is fine. It shows up as your numbers move."
              : "Your numbers are still guesses, and a guess does not get ranked.",
            `<div class="tiny muted">Making one number real is how this card fills in.</div>`
          )) +
      dots +
      nextBtn()
    );
  if (i === 4)
    return (
      head("Meet your character", "5 of " + N) +
      (R.watch
        ? rvCard(
            "The one worth a look",
            esc(R.watch.n),
            esc(R.watch.val) + " · " + esc(R.watch.zone[0]),
            `<div class="tiny muted">Not a grade. Just the number with the most room in it.</div><button class="ghost wide slim" style="margin-top:8px" data-a="metric" data-v="${R.watch.id}">Open it</button>`
          )
        : rvCard(
            "The one worth a look",
            "Nothing flagged",
            "None of your real numbers is asking for attention right now.",
            ""
          )) +
      dots +
      nextBtn()
    );
  if (i === 5)
    return (
      head("Meet your character", "6 of " + N) +
      rvCard("Your quest", esc(R.quest), "One thing. That is all the game asks of you today.", "") +
      dots +
      nextBtn("See my whole sheet")
    );
  const sheetH =
    head("Me", "Your character sheet") +
    `<div class="tile stack" style="gap:8px"><div class="row between"><b style="font-size:18px">${esc(R.name)}</b><span class="pill info">Era ${R.era} of 9</span></div>
  ${[
    ["Chapter", R.chapter],
    ["Era", R.eraN],
    ["Right now", R.now.n],
    R.want.id !== R.now.id ? ["Becoming", R.want.n] : null,
    R.strong ? ["Strongest number", R.strong.n] : null,
    R.watch ? ["Worth a look", R.watch.n] : null,
    ["Quest", R.quest],
  ]
    .filter(Boolean)
    .map(
      x =>
        `<div class="row between" style="align-items:flex-start;gap:10px"><span class="tiny muted" style="flex:none">${x[0]}</span><b class="small" style="text-align:right">${esc(x[1])}</b></div>`
    )
    .join("")}</div>
  <div class="tiny muted">No dollar amounts on this sheet, so it is safe to send to a friend.</div>
  <button class="primary wide" data-a="rvcopy">${w.copied ? "Copied ✓" : "Copy my character sheet"}</button><button class="ghost wide slim" data-a="rvagain">Play the reveal again</button><button class="ghost wide slim" data-a="close">Done</button>`;
  /* element.js: the row "Strengths and your element" */
  const withEl = typeof rvSheetElement === "function" ? rvSheetElement(sheetH) : sheetH;
  /* quizzes.js: the quiz results that the player chose to show, and the row "Quizzes" */
  const withQz = typeof rvSheetQuiz === "function" ? rvSheetQuiz(withEl) : withEl;
  /* founding.js: the mark "Founding Tester" */
  return typeof rvSheetFounding === "function" ? rvSheetFounding(withQz) : withQz;
}
Object.assign(ACT, {
  reveal: () => {
    const c = C();
    W = { kind: "reveal", i: c.x && c.x.revSeen ? 6 : 0 };
    sheet(rvSheet);
  },
  rvnext: () => {
    if (!W || W.kind !== "reveal") return;
    W.i = (W.i || 0) + 1;
    if (W.i >= 6) {
      const c = C();
      if (!G.demo) {
        c.x = c.x || {};
        if (!c.x.revSeen) {
          c.x.revSeen = todayISO();
          save();
          render();
        }
      }
    }
    drawSheet();
  },
  rvagain: () => {
    W = { kind: "reveal", i: 0 };
    drawSheet();
  },
  rvcopy: () => {
    try {
      navigator.clipboard.writeText(rvText(C(), D || derive(C())));
    } catch (e) {
      report(e, "reveal.js: rvcopy");
    }
    W.copied = true;
    drawSheet();
  },
});
/* ways in: a slim row on Me, and once on Home until it has been seen. On Home the row sits under the four main tiles and carries the class homerow, because collapsed Home shows only its first two children: a row put above the tiles would push them out of sight. */
function homeRowAdd(h, row) {
  let qd = "";
  try {
    qd = typeof homeQuad === "function" ? homeQuad(C(), D) : "";
  } catch (e) {
    report(e, "reveal.js: homeRowAdd");
  }
  if (qd && h.indexOf(qd) >= 0) return h.replace(qd, () => qd + row);
  const th = typeof tabHead === "function" ? tabHead() : "";
  return th && h.indexOf(th) >= 0 ? h.replace(th, () => th + row) : h;
}
/* The row that opens the character sheet. It is on Me, and one time on Home. */
const rvRow = (seen, cls) =>
  `<button class="rowbtn${cls ? " " + cls : ""}" data-a="reveal"><span><b>${seen ? "My character sheet" : "Meet your character"}</b><div class="tiny muted">${seen ? "Chapter, era, who you are becoming, your quest" : "Thirty seconds. Who you are in this game right now."}</div></span>${seen ? `<span class="caret">›</span>` : `<span class="pill new">New</span>`}</button>`;
/* Part of meTab() in ui.js. Adds the row for the character sheet below the title. */
function meTabReveal(h) {
  const c = C();
  return h.replace(/(<h1>[^<]*<\/h1>)/, m => m + rvRow(!!(c.x && c.x.revSeen)));
}

/* Part of home() in ui.js. Adds the row "Meet your character" until the player opens it one time. It waits for the tour. */
function homeRevealRow(h) {
  const c = C();
  if (G.demo || !c.led || (c.x && c.x.revSeen) || (typeof TOUR !== "undefined" && !G.tourSeen)) return h;
  return homeRowAdd(h, rvRow(false, "homerow"));
}
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
