/* ============================================================================
   SLAM the Game: features/sins.js
   PURPOSE     The money sins read. The quiz (the sins skin of Quizzes) is the first of four sources.
               This file reads the other three from the saved game: the ledger (c.moves, c.paydays,
               c.spends), the one-tap check-ins on a logged buy, and the reactions to the game
               (Recalculating kept or left waiting, fire drills run, the game left closed, numbers left
               at Guess, no buy logged). It shows the read: the top two of each family with the light
               side, the level, Why we think this, Is this really it?, Test the fix, and what is still
               being gathered.
   INPUT       The profile: c.x.qz.sins = { ans, at, show, sn } (sn: see core/sins.js). c.moves,
               c.paydays, c.spends, c.x.imp, c.x.wb, c.x.rc, c.x.drills. The open sheet (W.kind): sins,
               sncheck. The taps of the player (the actions in OUTPUT).
   OUTPUT      Functions: sngData, sngSt, sngRead, sngSeen, snSheet, snCheckSheet, snAfterLog, snCardRow.
               Parts of functions in other files: snAfterLog (the action fsave in ui.js), snCardRow
               (qzSheet in quizzes.js). Actions (ACT): sins, snpush, snfix, snfixend, sncheck, snskip,
               snline, snshow. Menu: "Your money read".
   DEPENDS ON  core/report.js, core/sins.js (the read, a copy of js/math/sins.js of the main app),
               core/quizcore.js (the engine), data/quizskins.js, core/engine.js, screens/ui.js,
               screens/dash.js (the kit), features/kit.js, features/quizzes.js (qzSkin, qzStore,
               qzMine), features/recalc.js (rcgCalc).
   RULES       A game lens, never a diagnosis. It roasts the sin, never the player. Private by default:
               a coach or an admin who opens this game sees the read only after the player turns "Show
               my read" on, and even then the check-ins stay out. The read never shows the cost of a
               pattern: that lives only in the Mistake audit (opt-in). A check-in is asked only when a
               buy passes the line or a pattern trips, at most 3 a week, and it can always be skipped.
               This file does no scoring: core/sins.js and the engine do.
   ========================================================================= */
const SNG_CAT = {
  Home: "home",
  Food: "food",
  "Getting around": "transport",
  "Bills and subscriptions": "bills",
  "Fun and everything else": "fun",
};
/* The ledger and the reactions of a profile, in the plain shape of core/sins.js. skip: a move to leave out. */
function sngData(c, skip) {
  if (!c || !c.led) return {};
  const moves = (c.moves || []).filter(m => m && m !== skip && m.d),
    incs = (c.incs || []).map(x => x.k),
    buys = moves
      .filter(m => m.t === "out" && m.amt > 0)
      .map(m => ({ d: m.d, amt: m.amt, cat: SNG_CAT[m.cat] || null })),
    pays = moves
      .filter(m => m.t === "in" && m.src && incs.includes(m.src))
      .map(m => m.d)
      .concat((c.paydays || []).map(p => p.d))
      .filter((d, i, a) => d && a.indexOf(d) === i)
      .map(d => ({ d })),
    plan = {},
    dates = moves
      .map(m => m.d)
      .concat((c.hist || []).map(h => h.d))
      .filter(Boolean)
      .sort();
  (c.spends || []).forEach(r => {
    const k = SNG_CAT[r.k];
    if (k && typeof r.amt === "number") plan[k] = (plan[k] || 0) + r.amt;
  });
  const wb = c.x && c.x.wb,
    away = wb && wb.pn && wb.pn.d && wb.d ? { days: snDays(wb.pn.d, wb.d), back: wb.d } : null,
    keys = ["take", "cash", "debt", "spend", "inv"];
  let rc = null;
  try {
    const X = typeof rcgCalc === "function" ? rcgCalc(c, derive(c)) : null,
      base = c.x && c.x.rc && c.x.rc.base;
    rc = { due: !!(X && X.cards.some(k => !k.words.win)), keptAt: base && base.at ? base.at : null };
  } catch (e) {
    report(e, "sins.js: sngData");
  }
  return {
    since: dates[0] || null,
    buys,
    pays,
    plan,
    imported: c.x && c.x.imp ? c.x.imp.d : null,
    away,
    guesses: { guess: keys.filter(k => !isSharp(c, k)).length, of: keys.length },
    rc,
    drills: Object.values((c.x && c.x.drills) || {}).filter(x => x && x.d),
  };
}
/* The kept state of the read (inside the quiz's own place). */
function sngSt(c) {
  const st = qzStore(c, "sins");
  st.sn = st.sn || { v: 1 };
  return st;
}
/* The read of a profile: core/sins.js on the one quiz engine. */
function sngRead(c) {
  const def = qzSkin("sins"),
    st = (c.x && c.x.qz && c.x.qz.sins) || { ans: {} };
  return { def, st, read: snRead({ qzResult, QZ_LEVELS }, def, st, sngData(c), todayISO()) };
}
/* May the person at the screen see the read? The owner, or a coach or an admin once the player turned it on. */
function sngSeen(c) {
  const st = c.x && c.x.qz && c.x.qz.sins;
  return qzMine() || !!(st && st.sn && st.sn.show);
}
function sngFamily(def, f, mine) {
  const others = def.traits.filter(t => t.group === f.id && t.id !== f.top.id),
    two = f.topTwo
      .map(
        (t, i) =>
          `<div class="tile stack" style="gap:4px"><div class="row between" style="gap:8px"><b class="small">${i + 1}. ${esc(t.name)}</b></div>${t.money ? `<div class="small">${esc(t.money)}</div>` : ""}<div class="tiny muted">The light side: ${esc(t.light)}</div></div>`
      )
      .join(""),
    why = f.lines.length
      ? f.lines
          .map(
            l =>
              `<div class="small">${esc(l.line)}${l.ago ? ` <span class="tiny muted">(${esc(l.ago)})</span>` : ""}</div>`
          )
          .join("")
      : `<div class="small">Nothing strong yet.</div>`,
    push = mine
      ? `<details class="math"><summary>Is this really it?</summary><div class="inner stack" style="gap:8px"><div class="tiny muted">Your answer counts as evidence, and it is kept on your read.</div><div class="grid2"><button class="ghost wide" data-a="snpush" data-k="${f.top.id}" data-v="yes">Yes, that is me</button><button class="ghost wide" data-a="snpush" data-k="${f.top.id}" data-v="no">Not really</button></div><div class="tiny muted">More like</div><div class="chips">${others.map(t => `<button class="chip" data-a="snpush" data-k="${f.top.id}" data-v="other" data-to="${t.id}">${esc(t.name)}</button>`).join("")}</div></div></details>`
      : "";
  return dkCard(
    f.name,
    `<div class="tiny muted">${esc(f.why)}</div><div class="stack" style="gap:6px">${two}</div><details class="math"><summary>Why we think this</summary><div class="inner stack" style="gap:6px">${why}</div></details>${push}`,
    { right: dkPill((f.level || "Guess") + " · " + (f.word || "Early read")) }
  );
}
function sngFix(read, mine) {
  const F = read.fix;
  if (!F || !F.name) return "";
  let body = `<b class="small">${esc(F.name)}${F.moved ? " (the next most likely read)" : ""}</b><div class="small">${esc(F.how)}</div><div class="tiny muted">The check: ${esc(F.check)}</div>`;
  if (!F.started) body += mine ? `<button class="primary wide go" data-a="snfix">Start the month</button>` : "";
  else if (!F.done)
    body +=
      dkProgress(F.pct, { text: F.daysLeft + " days left" }) +
      `<div class="tiny muted">So far: ${F.during} points of the pattern, against ${F.before} in the month before.</div>`;
  else
    body +=
      `<div class="tile small">${F.dropped === true ? "The pattern dropped. The read firms up." : F.dropped === false ? "The pattern held, so the read moves to the next most likely one." : "Nothing showed in the month before, so there is nothing to compare yet."}</div>` +
      (mine ? `<button class="primary wide go" data-a="snfixend">Keep the result</button>` : "");
  return dkCard("Test the fix", `<div class="stack" style="gap:6px">${body}</div>`, {
    cap: "One defense for a month.",
  });
}
/* The read. */
function snSheet() {
  const c = C(),
    mine = qzMine();
  if (!sngSeen(c)) return head("Me", "Your money read") + `<div class="tile small">Kept private by the player.</div>`;
  const { def, st, read } = sngRead(c),
    sn = st.sn || {},
    line = sn.line != null ? sn.line : SN_RULES.line,
    wk = snWeekCount(sn, todayISO());
  return (
    head("Me", esc(def.read.title)) +
    dkCaption("A game lens on your habits, from four sources. Not a diagnosis.") +
    dkStatRow([
      dkTile("Days of your money", read.enough ? String(read.days) : read.days + " of " + SN_RULES.labelDays, {
        sub: read.enough ? "enough for a label" : "before a label shows",
      }),
      dkTile("Sources", String(read.sources.length), { sub: read.sources.map(s => s.name).join(", ") || "none yet" }),
      dkTile("Check-ins this week", wk + " of " + SN_RULES.perWeek, { sub: "on buys over $" + line }),
    ]) +
    read.families.map(f => sngFamily(def, f, mine)).join("") +
    `<details class="math"><summary>Two kinds of pride</summary><div class="inner small">${esc(def.read.pride)}</div></details>` +
    sngFix(read, mine) +
    (read.gathering.length
      ? `<details class="math"><summary>Still being gathered</summary><div class="inner stack" style="gap:4px">${read.gathering.map(l => `<div class="small">${esc(l)}</div>`).join("")}</div></details>`
      : "") +
    mathBox([
      "The quiz counts " + Math.round(read.quizWeight * 100) + "% now: it shares out as other evidence comes in.",
      "Half-life " + SN_RULES.halfLife + " days: a piece a month old counts half.",
      "A label shows when " +
        SN_RULES.agree +
        " sources agree over about " +
        SN_RULES.labelDays +
        " days of your money.",
    ]) +
    (mine
      ? `<div class="tile stack" style="gap:8px"><b class="small">Ask me "what was this?" about buys over</b><div class="chips">${SN_RULES.lines.map(v => `<button class="chip ${v === line ? "on" : ""}" data-a="snline" data-v="${v}">$${v}</button>`).join("")}</div><div class="tiny muted">At most ${SN_RULES.perWeek} a week, and you can always skip.</div></div>` +
        `<div class="tile stack" style="gap:8px"><div class="row between" style="gap:8px"><span class="small"><b>Who sees this: ${sn.show ? "Me, and a coach I let in" : "Me only"}</b><div class="tiny muted">Show my read to a coach. Your check-ins stay with you.</div></span>${onoff("snshow", !!sn.show)}</div></div>` +
        `<button class="ghost wide slim" data-a="rcaudit">What a pattern costs: the Mistake audit (opt-in)</button>` +
        `<button class="ghost wide slim" data-a="qzopen" data-v="sins">The sins quiz</button>`
      : "") +
    `<button class="ghost wide slim" data-a="close">Done</button>`
  );
}
/* The one-tap check-in, after a buy is logged. */
function snCheckSheet() {
  const w = W;
  return (
    head("One quick thing", "What was this?") +
    `<div class="tile small">${esc(w.why)}</div>` +
    `<div class="stack" style="gap:6px">${SN_TAGS.map(t => `<button class="rowbtn" data-a="sncheck" data-v="${t.id}"><span>${esc(t.label)}</span><span class="caret">›</span></button>`).join("")}</div>` +
    `<button class="ghost wide" data-a="snskip">Skip this</button><div class="tiny muted">One tap. It stays with you and helps your money read. Never more than ${SN_RULES.perWeek} a week.</div>`
  );
}
/* Part of the action fsave in ui.js. After a buy is logged: ask "what was this?" when the rules say so, then go on
   with then(). Returns true when the check-in sheet took over. */
function snAfterLog(c, m, then) {
  try {
    if (!m || m.t !== "out" || G.demo || !qzMine() || !qzSkin("sins")) return false;
    const st = sngSt(c),
      buy = { d: m.d, amt: m.amt, cat: SNG_CAT[m.cat] || null },
      due = snCheckinDue(st.sn, buy, sngData(c, m), todayISO());
    if (!due.ask) return false;
    W = { kind: "sncheck", buy, why: due.why, then };
    sheet(snCheckSheet);
    return true;
  } catch (e) {
    report(e, "sins.js: snAfterLog");
    return false;
  }
}
/* Part of qzSheet() in quizzes.js. The row to the read under the card of the sins quiz. */
function snCardRow() {
  return `<button class="rowbtn" data-a="sins"><span style="min-width:0"><b>Your money read</b><div class="tiny muted">The top two of each family, why we think so, and one defense to test for a month</div></span><span class="caret">›</span></button>`;
}
kitScreen(
  "sins",
  "Your money read",
  "Your main pull and your main way of dodging change, read from the quiz, your buys, check-ins and taps.",
  "It is a game lens, not a diagnosis. It stays with you unless you show it."
);
kitMenu("Your money read", "sins", "The money sins: your top two, why, and a defense to test", "qz");
Object.assign(ACT, {
  sins: () => {
    W = { kind: "sins" };
    sheet(snSheet);
  },
  snpush: t => {
    if (!qzMine()) return;
    const c = C(),
      st = sngSt(c);
    st.sn = snPush(st.sn, t.dataset.k, t.dataset.v, t.dataset.to || null, new Date().toISOString());
    save();
    drawSheet();
  },
  snfix: () => {
    if (!qzMine()) return;
    const c = C(),
      st = sngSt(c),
      F = sngRead(c).read.fix;
    if (F && !F.started) st.sn = snFixStart(st.sn, F.trait, F.group, todayISO());
    save();
    drawSheet();
  },
  snfixend: () => {
    if (!qzMine()) return;
    const c = C(),
      st = sngSt(c);
    st.sn = snFixEnd(st.sn, sngRead(c).read.ev, todayISO());
    save();
    drawSheet();
  },
  sncheck: t => {
    const w = W;
    if (!w || w.kind !== "sncheck") return;
    const st = sngSt(C());
    st.sn = snCheckinAdd(st.sn, w.buy, t.dataset.v, new Date().toISOString());
    save();
    if (typeof w.then === "function") w.then();
    else ACT.close();
  },
  snskip: () => {
    const w = W;
    if (!w || w.kind !== "sncheck") return;
    const st = sngSt(C());
    st.sn = snCheckinSkip(st.sn, new Date().toISOString());
    save();
    if (typeof w.then === "function") w.then();
    else ACT.close();
  },
  snline: t => {
    if (!qzMine()) return;
    sngSt(C()).sn.line = +t.dataset.v;
    save();
    drawSheet();
  },
  snshow: t => {
    if (!qzMine()) return;
    sngSt(C()).sn.show = t.dataset.v === "1";
    save();
    drawSheet();
  },
});
