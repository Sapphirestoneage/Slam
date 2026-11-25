/* ============================================================================
   SLAM the Game: features/quizzes.js
   PURPOSE     Quizzes. One sheet draws each quiz skin from its definition: the first screen, one
               question for each tap, and one result card (a title, two or three lines, the light
               side, one next step, what it changes). The scoring is the one quiz engine
               (core/quizcore.js). A skin is data (data/quizskins.js).
   INPUT       The skins: QZ_SKINS, QZ_ROUTES. The profile: c.x.qz[skin id] = { ans, go, at, show, ok,
               kept }. The open sheet (W.kind): qz (the list), qzq (one quiz). The taps of the player
               (the actions in OUTPUT).
   OUTPUT      Functions: qzSkin, qzStore, qzMine, qzNow, qzElement, qzShown, qzAskPart, qzCardPart,
               qzListSheet, qzSheet. Parts of functions in other files: meTabQuiz (meTab in ui.js),
               rvSheetQuiz (rvSheet in reveal.js), rvTextQuiz (rvText in reveal.js). Actions (ACT):
               qz, qzopen, qzgo, qzans, qzback, qzagain, qzel, qzshow, qzok. Menu: "Quizzes".
   DEPENDS ON  core/report.js, core/quizcore.js, data/quizskins.js, core/engine.js, screens/ui.js,
               features/kit.js, features/element.js (elOf, elStore), features/exletter.js
               (exLetterMine), features/reveal.js.
   RULES       A quiz is a game lens, never a diagnosis. A result is private by default: it shows on
               the character sheet, and to a coach or an admin who opens this game, only after the
               player turns "Show it on my character sheet" on. A result never changes the element of
               the player without a tap. This file does no scoring: it shows what the engine returns.
               To add a quiz, add a skin (docs/QUIZ-ENGINE.md). Do not add a sheet.
   ========================================================================= */
function qzSkin(id) {
  return (typeof QZ_SKINS !== "undefined" ? QZ_SKINS : []).find(s => s.id === id) || null;
}
/* The kept answers of one quiz of a profile. */
function qzStore(c, id) {
  c.x = c.x || {};
  c.x.qz = c.x.qz || {};
  return (c.x.qz[id] = c.x.qz[id] || { ans: {} });
}
/* True when the person at the screen is the owner of the game. A coach or an admin who opened this game is not. */
function qzMine() {
  return typeof exLetterMine === "function" ? exLetterMine() : true;
}
/* The element the player has now, or null. */
function qzElement(c) {
  try {
    return typeof elOf === "function" ? elOf(c).el : null;
  } catch (e) {
    report(e, "quizzes.js: qzElement");
    return null;
  }
}
/* All that the screen shows for one quiz: the engine does the work. */
function qzNow(c, id) {
  const def = qzSkin(id),
    st = (c.x && c.x.qz && c.x.qz[id]) || { ans: {} },
    R = qzResult(def, st.ans || {}, null, { confirmed: !!st.ok }),
    /* The card shows when each question has its answer (a code quiz can be ready before that). */
    card = R.done ? qzCard(def, R) : null;
  return { def, st, R, card, feed: card ? qzFeed(def, R, qzElement(c)) : null, taps: qzTaps(def) };
}
/* The results that the player chose to show: [{ label, value }]. */
function qzShown(c) {
  const all = (c.x && c.x.qz) || {};
  return Object.keys(all)
    .filter(id => all[id] && all[id].show && qzSkin(id) && !qzSkin(id).soon)
    .map(id => {
      const N = qzNow(c, id);
      return N.card && N.feed && N.feed.sheet ? N.feed.sheet : null;
    })
    .filter(Boolean);
}
/* One question: the words, a bar, and one button for each answer. */
function qzAskPart(def, q, n, of, back) {
  const opts = q.options ? q.options.map(o => [o.id, o.label]) : (def.scale || []).map(s => [s[0], s[1]]);
  return (
    `<div class="tile"><div class="tiny muted">${q.options ? "Tap the one closest to you" : "How true is this for you?"}</div><h2 style="margin:6px 0 0" data-fid="qz:q">${esc(q.ask || q.text)}</h2></div>${bar((n / of) * 100)}` +
    `<div class="stack" style="gap:6px">${opts.map(o => `<button class="rowbtn" data-a="qzans" data-k="${esc(q.id)}" data-v="${esc(String(o[0]))}"><span>${esc(o[1])}</span><span class="caret">›</span></button>`).join("")}</div>` +
    (back ? `<button class="ghost wide slim" data-a="qzback">Back one</button>` : "")
  );
}
/* The next step of a card: a skill of the tree, a skill track, and the readings. */
function qzRoutePart(card) {
  const R = typeof QZ_ROUTES !== "undefined" ? QZ_ROUTES : { skills: {}, trees: {}, readings: {} },
    nx = card.next || {},
    sk = nx.skill && R.skills[nx.skill],
    more = card.skills.filter(id => id !== nx.skill && R.skills[id]),
    skillBtn = (id, cls, label) => {
      const s = R.skills[id],
        v = s.tree + ":" + (s.level - 1),
        name =
          (SKILLS[s.tree] && SKILLS[s.tree].skills[s.level - 1] && SKILLS[s.tree].skills[s.level - 1][0]) || s.name;
      return `<button class="${cls}" data-a="skill" data-v="${v}">${esc(label || name)}</button>`;
    };
  let h = `<b class="small">One next step</b>`;
  if (sk) h += skillBtn(nx.skill, "primary wide go", nx.label);
  else if (nx.tree && SKILLS[nx.tree])
    h += `<button class="primary wide go" data-a="connect" data-v="${nx.tree}">${esc(nx.label)}</button>`;
  const trees = card.trees.filter(t => t !== nx.tree && SKILLS[t]);
  if (more.length || trees.length || card.readings.length)
    h += `<details class="math"><summary>More for this result</summary><div class="inner stack" style="gap:8px">${more.map(id => skillBtn(id, "ghost wide slim")).join("")}${trees.map(t => `<button class="ghost wide slim" data-a="connect" data-v="${t}">${esc(SKILLS[t].name)}</button>`).join("")}${card.readings
      .filter(id => R.readings[id])
      .map(
        id =>
          `<div class="tile small"><div class="tiny muted">A short read. People say: "${esc(R.readings[id].advice)}"</div>${esc(R.readings[id].line)}</div>`
      )
      .join("")}</div></details>`;
  return h;
}
/* The result card. mine: the owner is at the screen. */
function qzCardPart(c, N, mine) {
  const { def, st, R, card, feed } = N,
    conf = R.confidence,
    also = card.also
      ? card.tie
        ? `A close call between this one and ${card.also.name}. Both are shown.`
        : `Second: ${card.also.name}.`
      : "",
    elPart = !feed
      ? ""
      : feed.ask && !mine
        ? ""
        : feed.ask && st.kept === feed.to
          ? `<div class="tile small">This leans toward ${esc(feed.to)}. You kept ${esc(feed.keep || "your element")}.</div>`
          : feed.ask
            ? `<div class="tile stack" style="gap:8px"><div class="small" data-fid="qz:el"><b>${esc(feed.line)}</b></div><div class="grid2"><button class="ghost wide" data-a="qzel" data-v="keep">${feed.keep ? "Keep " + esc(feed.keep) : "Not now"}</button><button class="ghost wide" data-a="qzel" data-v="switch">Switch to ${esc(feed.to)}</button></div><div class="tiny muted">Nothing changes until you tap.</div></div>`
            : `<div class="tile small" data-fid="qz:el">${esc(feed.line)}</div>`,
    math = mathBox([
      ...R.ranked.filter(r => r.score > 0).map(r => `${r.name}: ${r.score}`),
      def.core && def.core.how,
      conf ? `${conf.word} (${conf.level}): ${conf.why}` : "",
    ]);
  return (
    `<div class="levelup pop" style="padding:8px 0"><div class="eyebrow">${esc(def.name)}</div><h2 style="margin:8px 0" data-fid="qz:big">${esc(card.title)}</h2>${conf ? `<div class="row" style="justify-content:center;gap:6px">${kitPill(conf.level)}<span class="tiny muted">${esc(conf.word)}</span></div>` : ""}</div>` +
    (also ? `<div class="tiny muted" style="text-align:center">${esc(also)}</div>` : "") +
    `<div class="tile stack" style="gap:6px">${card.lines.map(l => `<div class="small">${esc(l)}</div>`).join("")}</div>` +
    `<div class="tile stack" style="gap:4px"><b class="small">The light side</b><div class="small">${esc(card.light)}</div></div>` +
    elPart +
    qzRoutePart(card) +
    math +
    `<div class="tiny muted">${esc(card.note)}</div>` +
    (mine
      ? `<div class="tile stack" style="gap:8px"><div class="row between" style="gap:8px"><span class="small"><b>Who sees this: ${st.show ? "Me, and whoever I show my character sheet" : "Me only"}</b><div class="tiny muted">Show it on my character sheet</div></span>${onoff("qzshow", !!st.show)}</div></div>` +
        (st.ok ? "" : `<button class="ghost wide slim" data-a="qzok">That is me</button>`) +
        `<button class="ghost wide slim" data-a="qzagain">Take it again</button>`
      : "") +
    `<button class="ghost wide slim" data-a="qz">All quizzes</button>`
  );
}
/* The list of quizzes. */
function qzListSheet() {
  const c = C(),
    mine = qzMine(),
    rows = (typeof QZ_SKINS !== "undefined" ? QZ_SKINS : [])
      .map(def => {
        if (def.soon)
          return `<div class="tile row between" style="gap:8px"><span style="min-width:0"><b class="small">${esc(def.name)}</b><div class="tiny muted">${esc(def.blurb)}</div></span><span class="pill info">Coming soon</span></div>`;
        const N = qzNow(c, def.id),
          seen = mine || N.st.show,
          sub = N.card && seen ? N.card.title : N.card ? "Kept private by the player" : def.blurb;
        if (!mine)
          return N.card
            ? `<div class="tile"><b class="small">${esc(def.name)}</b><div class="tiny muted">${esc(sub)}</div></div>`
            : "";
        return `<button class="rowbtn" data-a="qzopen" data-v="${def.id}"><span style="min-width:0"><b>${esc(def.name)}</b><div class="tiny muted">${esc(sub)}</div></span>${N.card ? `<span class="caret">›</span>` : `<span class="pill">${N.taps.max} taps</span>`}</button>`;
      })
      .join("");
  return (
    head("Me", "Quizzes") +
    `<div class="small muted">Each one is a game lens: a playful way to look at how you handle money. None is a test or a diagnosis. Your results stay with you unless you choose to show them.</div>` +
    (mine
      ? `<button class="rowbtn" data-a="chart"><span style="min-width:0"><b>The Money Chart</b><div class="tiny muted">Ten statements, five elements. It sets your money element.</div></span><span class="caret">›</span></button>`
      : "") +
    `<div class="stack" style="gap:8px">${rows || `<div class="tile small">No result is shared.</div>`}</div>` +
    `<button class="ghost wide slim" data-a="close">Done</button>`
  );
}
/* One quiz: the first screen, the questions, then the card. */
function qzSheet() {
  const c = C(),
    w = W,
    N = qzNow(c, w.id),
    def = N.def,
    mine = qzMine();
  if (!def || def.soon) return qzListSheet();
  if (!mine)
    return (
      head("Quizzes", def.name) +
      (N.card && N.st.show ? qzCardPart(c, N, false) : `<div class="tile small">Kept private by the player.</div>`)
    );
  if (N.card) return head("Quizzes", def.name) + qzCardPart(c, N, true);
  if (!N.st.go && !N.R.answered)
    return (
      head("Quizzes", def.name) +
      (def.playful ? `<div class="row"><span class="pill info">Playful: for fun</span></div>` : "") +
      `<div class="tile stack" style="gap:6px">${(def.intro || [def.blurb]).map(l => `<div class="small">${esc(l)}</div>`).join("")}</div>` +
      `<div class="tiny muted">${esc(def.note)}</div>` +
      `<button class="primary wide go" data-a="qzgo">Start: ${N.taps.max} taps</button><button class="ghost wide slim" data-a="qz">All quizzes</button>`
    );
  const q = N.R.next;
  return (
    head("Quizzes", def.name + " · " + (N.R.answered + 1) + " of " + N.R.of) +
    qzAskPart(def, q, N.R.answered, N.R.of, N.R.answered > 0)
  );
}
/* Part of meTab() in ui.js. Adds the row "Quizzes" below the row for the character sheet. */
function meTabQuiz(h) {
  const row = `<button class="rowbtn" data-a="qz"><span><b>Quizzes</b><div class="tiny muted">Money houses, a money code, an avatar and more. Each is a game lens.</div></span><span class="caret">›</span></button>`;
  return h.replace(/(<button class="rowbtn[^"]*" data-a="reveal">.*?<\/button>)/, m => m + row);
}
/* Part of rvSheet() in reveal.js. Adds the results that the player chose to show, and one row to the quizzes. */
function rvSheetQuiz(h) {
  const c = C(),
    L = qzShown(c),
    rows =
      (L.length
        ? `<div class="tile stack" style="gap:8px">${L.map(x => `<div class="row between" style="align-items:flex-start;gap:10px"><span class="tiny muted" style="flex:none">${esc(x.label)}</span><b class="small" style="text-align:right">${esc(x.value)}</b></div>`).join("")}</div>`
        : "") +
      (qzMine()
        ? `<button class="rowbtn" data-a="qz"><span><b>Quizzes</b><div class="tiny muted">A result shows here only when you turn it on</div></span><span class="caret">›</span></button>`
        : "");
  return h.replace(
    '<div class="tiny muted">No dollar amounts on this sheet',
    () => rows + '<div class="tiny muted">No dollar amounts on this sheet'
  );
}
/* Part of rvText() in reveal.js. Adds the shown results to the text for copy. */
function rvTextQuiz(text, c) {
  const L = qzShown(c);
  return L.length ? text + "\n" + L.map(x => x.label + ": " + x.value).join("\n") : text;
}
kitScreen(
  "qz",
  "Quizzes",
  "Short tap quizzes. Each one is a game lens on how you handle money.",
  "A result is private until you choose to show it, and it never changes your element without a tap."
);
kitScreen(
  "qzq",
  "One quiz",
  "Tap the answer closest to you. There is no wrong answer.",
  "The card at the end shows your result, its light side and one next step."
);
kitMenu("Quizzes", "qz", "Money houses, a money code, an avatar and more. Each is a game lens", "chart");
Object.assign(ACT, {
  qz: () => {
    W = { kind: "qz" };
    sheet(qzListSheet);
  },
  qzopen: t => {
    const def = qzSkin(t.dataset.v);
    if (!def || def.soon) return;
    W = { kind: "qzq", id: def.id };
    sheet(qzSheet);
  },
  qzgo: () => {
    if (!W || W.kind !== "qzq" || !qzMine()) return;
    qzStore(C(), W.id).go = true;
    save();
    drawSheet();
  },
  qzans: t => {
    if (!W || W.kind !== "qzq" || !qzMine()) return;
    const c = C(),
      def = qzSkin(W.id),
      st = qzStore(c, W.id),
      q = def.questions.find(x => x.id === t.dataset.k);
    if (!q) return;
    st.ans[q.id] = q.options ? t.dataset.v : +t.dataset.v;
    if (qzFlow(def, st.ans).done) st.at = todayISO();
    save();
    drawSheet();
  },
  qzback: () => {
    if (!W || W.kind !== "qzq" || !qzMine()) return;
    const st = qzStore(C(), W.id),
      last = qzLast(qzSkin(W.id), st.ans);
    if (last) delete st.ans[last];
    save();
    drawSheet();
  },
  qzagain: () => {
    if (!W || W.kind !== "qzq" || !qzMine()) return;
    const c = C(),
      show = !!qzStore(c, W.id).show;
    c.x.qz[W.id] = { ans: {}, go: true, show };
    save();
    drawSheet();
  },
  /* The one place where a quiz changes the element, and only by this tap. */
  qzel: t => {
    if (!W || W.kind !== "qzq" || !qzMine()) return;
    const c = C(),
      N = qzNow(c, W.id);
    if (!N.feed || !N.feed.ask) return;
    if (t.dataset.v === "switch") {
      const X = elStore(c);
      X.pick = N.feed.to;
      X.over = W.id;
      delete qzStore(c, W.id).kept;
    } else qzStore(c, W.id).kept = N.feed.to;
    save();
    render();
    drawSheet();
  },
  qzshow: t => {
    if (!W || W.kind !== "qzq" || !qzMine()) return;
    qzStore(C(), W.id).show = t.dataset.v === "1";
    save();
    drawSheet();
  },
  qzok: () => {
    if (!W || W.kind !== "qzq" || !qzMine()) return;
    qzStore(C(), W.id).ok = true;
    save();
    drawSheet();
  },
});
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
