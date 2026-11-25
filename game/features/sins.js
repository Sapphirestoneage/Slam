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
   OUTPUT      Functions: sngData, sngSt, sngRead, sngSeen, snSheet, snCheckSheet, snAfterLog, snCardRow,
               and Part 2: sngVoice (the add-on hook, SNG_VOICE), sngCard, sngFrame, sngFrameTile,
               sngCardPart, snShareSheet, sngPlainCard, sngRetakePart, sngHist, sngGrowthPart,
               sngMates, sngCouplePart, snDateSheet, sngGradStory (for the graduation story, not built).
               Parts of functions in other files: snAfterLog (the action fsave in ui.js), snCardRow
               (qzSheet in quizzes.js), rvSheetSins (rvSheet in reveal.js), snRetakeNudge (questNudge
               in questlog.js), snHistKeep and snRetakeKeep (the actions qzans and qzagain in
               quizzes.js), sngFrameTile (rcSheet in recalc.js), sngFrame (homeRcRow in recalc.js),
               fdSheetSins (fdSheet in drills.js). Actions (ACT): sins, snpush, snfix, snfixend,
               sncheck, snskip, snline, snshow, snshare, snsharecopy, snsharesend, snretake,
               snretakeskip, snmate, sndate, sndatestep. Menu: "Your money read".
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
    sngRetakePart(c, st, mine) +
    sngCardPart(c, { def, st, read }, mine) +
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
    sngGrowthPart(c) +
    sngCouplePart(c, mine) +
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
  let K = null;
  try {
    K = sngCard(C());
  } catch (e) {
    report(e, "sins.js: snCardRow");
  }
  return `<button class="rowbtn" data-a="sins"><span style="min-width:0"><b>${K ? "You are " + esc(K.arch.name) : "Your money read"}</b><div class="tiny muted">Your result card, why we think so, and one move to test for a month</div></span><span class="caret">›</span></button>`;
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
/* ---------- Part 2: results and growth ---------- */
/* THE ADD-ON HOOK. An add-on can push one entry: { pk: its own id, virtues: { traitId: name }, line: one extra line }.
   sngVoice() returns the first entry whose add-on is on for the person at the screen (adOn in account/gate.js), or
   null: the default names. The words of an add-on are in its private source, never in this repository. A share
   card never uses a voice. */
var SNG_VOICE = [];
function sngVoice() {
  try {
    if (typeof adOn !== "function") return null;
    return SNG_VOICE.find(v => v && v.pk && adOn(v.pk)) || null;
  } catch (e) {
    report(e, "sins.js: sngVoice");
    return null;
  }
}
/* The result card of a profile: the archetype, the two tops, the light sides, the virtues, and the move of the month
   with the next turn of Recalculating when a card shows. */
function sngCard(c, R) {
  const { def, read } = R || sngRead(c);
  let turn = null;
  try {
    const X = typeof rcgCalc === "function" ? rcgCalc(c, D || derive(c)) : null,
      k = X && X.cards.find(x => !x.words.win);
    turn = k ? k.words.next : null;
  } catch (e) {
    report(e, "sins.js: sngCard");
  }
  return snCard(def, read, { turn, voice: sngVoice() });
}
/* The framing line for a moment ('home', 'crash', 'hard'), or "" (no read, an Early read, or a read the person at the
   screen may not see). It never changes or hides a number: the caller adds this line under its own words. */
function sngFrame(c, moment) {
  try {
    const st = c && c.x && c.x.qz && c.x.qz.sins;
    if (!st || !st.at || !sngSeen(c) || G.demo) return "";
    const F = snFrame(qzSkin("sins"), sngRead(c).read, moment);
    return F.line ? `<div class="small snframe" data-frame="${moment}:${F.trait}">${esc(F.line)}</div>` : "";
  } catch (e) {
    report(e, "sins.js: sngFrame");
    return "";
  }
}
function sngPart(label, p) {
  return `<div class="tile stack" style="gap:4px"><div class="row between" style="gap:8px"><span class="dklabel">${esc(label)}</span>${dkPill(p.level + " · " + p.word)}</div><b>${esc(p.name)}</b>${p.second ? `<span class="tiny muted">Second: ${esc(p.second)}</span>` : ""}<div class="small">The light side: ${esc(p.light)}</div><div class="small"><b>The virtue that answers it: ${esc(p.virtue.name)}.</b> ${esc(p.virtue.line)}</div></div>`;
}
/* The result card, as HTML (the top of the read). mine: the owner is at the screen. */
function sngCardPart(c, R, mine) {
  const K = sngCard(c, R);
  if (!K) return "";
  const M = K.move;
  return dkCard(
    K.head,
    `<h2 style="margin:4px 0" data-fid="sn:arch">${esc(K.arch.name)}</h2><div class="small">${esc(K.arch.line)}</div>` +
      `<div class="stack" style="gap:8px">${sngPart("Main pull", K.sin)}${sngPart("Main way of refusing change", K.change)}</div>` +
      (K.extra ? `<div class="small">${esc(K.extra)}</div>` : "") +
      (M
        ? `<div class="tile stack" style="gap:4px"><span class="dklabel">${esc(M.title)}</span><b class="small">${esc(M.name)}</b><div class="small">${esc(M.how)}</div>${M.turn ? `<div class="small">Recalculating says: ${esc(M.turn)}</div>` : ""}<div class="tiny muted">${M.started ? "Started. Test the fix, below, keeps the month." : "Start it under Test the fix, below."}</div></div>`
        : "") +
      (mine
        ? `<button class="ghost wide" data-a="snshare">Make a share card</button><div class="tiny muted">Only the name and the plain words. No number, no check-in, nothing you told the game.</div>`
        : ""),
    {}
  );
}
/* The share card sheet. Made only when the player taps. No number, the standard look, no add-on words. */
function snShareSheet() {
  const c = C(),
    w = W || {},
    S = snShareCard(qzSkin("sins"), sngPlainCard(c)),
    can = typeof navigator !== "undefined" && typeof navigator.share === "function";
  if (!S) return head("Your money read", "A card to share") + `<div class="tile small">Take the quiz first.</div>`;
  return (
    head("Your money read", "A card to share") +
    `<div class="card stack snsharecard" style="gap:6px"><div class="eyebrow">The money sins</div><h2 style="margin:0">${esc(S.title)}</h2>${S.lines.map(l => `<div class="small">${esc(l)}</div>`).join("")}<div class="tiny muted">${esc(S.foot)}</div></div>` +
    `<button class="primary wide" data-a="snsharecopy">${w.copied ? "Copied ✓" : "Copy the words"}</button>` +
    (can ? `<button class="ghost wide" data-a="snsharesend">Send it with an app on this device</button>` : "") +
    (w.msg ? `<div class="small">${esc(w.msg)}</div>` : "") +
    `<div class="tiny muted">It carries no money number, no check-in and nothing you told the game. Nothing leaves until you send it.</div><button class="ghost wide slim" data-a="sins">Back to the read</button>`
  );
}
/* The card in the standard voice (for the share card): no add-on names. */
function sngPlainCard(c) {
  const R = sngRead(c);
  return snCard(R.def, R.read);
}
/* The retake each quarter, on the read. */
function sngRetakePart(c, st, mine) {
  const R = snRetakeDue(st, todayISO());
  if (!R.due || !mine) return "";
  return dkCard(
    "A quarter has passed",
    `<div class="small">${esc(R.why)} Retake the fifteen taps to see how your read has moved. Everything else in your read is kept.</div><div class="grid2"><button class="primary wide" data-a="snretake">Retake the quiz</button><button class="ghost wide" data-a="snretakeskip">Not this quarter</button></div>`
  );
}
/* The history of a profile, with the take of today when the history is still empty (a read from before Part 2). */
function sngHist(c) {
  const R = sngRead(c),
    sn = R.st.sn || {};
  return sn.hist && sn.hist.length ? sn.hist : R.st.at ? snHistAdd(sn, R.read, R.st.at).hist : [];
}
function sngGrowthPart(c) {
  const G2 = snGrowth(qzSkin("sins"), sngHist(c));
  if (!G2.length) return "";
  return `<details class="math sngrow"><summary>Over your retakes</summary><div class="inner stack" style="gap:8px">${G2.map(g => `<div class="stack" style="gap:2px"><div class="small">${esc(g.line)}</div>${g.series.length > 1 ? dkSpark(g.series.map(x => Math.round(x.share * 100))) : ""}</div>`).join("")}<div class="tiny muted">The share of each family's points held by the top of your first take, at each take.</div></div></details>`;
}
/* Part of rvSheet() in reveal.js. The sin weakening and the virtue growing, on the character sheet. Only on the
   owner's screen (or a coach's, once the player shows the read), and never in the copied text. */
function rvSheetSins(h) {
  try {
    const c = C();
    if (!c || G.demo || !sngSeen(c) || !(c.x && c.x.qz && c.x.qz.sins && c.x.qz.sins.at)) return h;
    const G2 = snGrowth(qzSkin("sins"), sngHist(c));
    if (!G2.length) return h;
    const part = `<div class="tile stack" style="gap:4px"><div class="tiny muted">Your money read, over the retakes (only on your screen)</div>${G2.map(g => `<div class="small">${esc(g.line)}</div>`).join("")}</div>`,
      at = '<div class="tiny muted">No dollar amounts on this sheet';
    return h.indexOf(at) >= 0 ? h.replace(at, () => part + at) : h + part;
  } catch (e) {
    report(e, "sins.js: rvSheetSins");
    return h;
  }
}
/* Part of questNudge() in questlog.js. The gentle reminder to retake each quarter. */
function snRetakeNudge(c) {
  try {
    const st = c && c.x && c.x.qz && c.x.qz.sins;
    if (!st || !st.at || G.demo || !qzMine()) return null;
    const R = snRetakeDue(st, todayISO());
    return R.due
      ? { id: "snretake" + R.q, t: "Your money read: a quarter has passed. Retake the quiz?", a: "sins", v: "" }
      : null;
  } catch (e) {
    report(e, "sins.js: snRetakeNudge");
    return null;
  }
}
/* Part of the action qzans in quizzes.js. A finished take is kept in the history of the read. */
function snHistKeep(c) {
  const st = sngSt(c);
  st.sn = snHistAdd(st.sn, sngRead(c).read, st.at);
}
/* Part of the action qzagain in quizzes.js. A retake keeps the old take in the history and the rest of the read. */
function snRetakeKeep(c, id) {
  if (id !== "sins") return null;
  const st = sngSt(c);
  return snRetake(st, sngRead(c).read);
}
/* The graduation story is not built yet (game/features/built.js: "Graduating: a win state and your story"). It will
   call this for the part the read gives: where the player started, how the pull moved, what the defenses did. */
function sngGradStory(c) {
  const st = c && c.x && c.x.qz && c.x.qz.sins;
  return st && sngSeen(c) ? snGradStory(qzSkin("sins"), { ...(st.sn || {}), hist: sngHist(c) }) : [];
}
/* Couples. The two parts of the household, when both turned on sharing their read with each other. */
function sngMates(c) {
  const st = c.x && c.x.qz && c.x.qz.sins,
    me = st && st.at ? snMatePart(sngRead(c).read, c.name || "You", st.sn && st.sn.mate) : null,
    others = (G.chars || []).filter(x => x && x !== c && x.x && x.x.qz && x.x.qz.sins && x.x.qz.sins.at);
  for (const o of others) {
    const b = snMatePart(sngRead(o).read, o.name || "Your partner", o.x.qz.sins.sn && o.x.qz.sins.sn.mate);
    if (snCoupleOk(me, b)) return { a: me, b, other: o };
  }
  return { a: me, b: null, other: others[0] || null };
}
function sngCouplePart(c, mine) {
  if (!mine || G.demo || (G.chars || []).length < 2) return "";
  const st = sngSt(c),
    P = sngMates(c),
    on = !!st.sn.mate,
    other = P.other ? P.other.name || "your partner" : "the others in your household",
    K = P.b ? snCouple(qzSkin("sins"), P.a, P.b) : null,
    sw = `<div class="row between" style="gap:8px"><span class="small"><b>Share my read with ${esc(other)}</b><div class="tiny muted">Only your two names go, and only once you both turn this on.</div></span>${onoff("snmate", on)}</div>`;
  if (!K)
    return dkCard(
      "The two of you",
      sw +
        (on ? `<div class="tiny muted">Waiting for ${esc(other)} to take the quiz and turn sharing on too.</div>` : "")
    );
  return dkCard(
    "The two of you",
    `<b>${esc(K.a.arch.name)} and ${esc(K.b.arch.name)}</b><div class="small"><b>The pulls:</b> ${esc(K.sin.line)}</div><div class="small"><b>Refusing change:</b> ${esc(K.change.line)}</div><button class="primary wide" data-a="sndate">Start a money date</button>` +
      sw
  );
}
/* The money date: the prompts to tap through together. */
function snDateSheet() {
  const c = C(),
    P = sngMates(c),
    L = P.b ? snDate(qzSkin("sins"), P.a, P.b) : null,
    w = W;
  if (!L)
    return head("Your money read", "A money date") + `<div class="tile small">Both of you turn on sharing first.</div>`;
  const i = Math.min(w.step || 0, L.length - 1),
    s = L[i];
  return (
    head("Your money read", "A money date") +
    dkCaption("A few prompts for the two of you. Tap through at your own pace.") +
    dkProgress(Math.round((s.n / s.of) * 100), { text: "Prompt " + s.n + " of " + s.of }) +
    `<div class="card stack" style="gap:6px">${s.who ? `<div class="eyebrow">${esc(s.who)}</div>` : ""}<div>${esc(s.line)}</div></div>` +
    `<div class="grid2">${i > 0 ? `<button class="ghost wide" data-a="sndatestep" data-v="${i - 1}">Back</button>` : "<span></span>"}${i < L.length - 1 ? `<button class="primary wide" data-a="sndatestep" data-v="${i + 1}">Next</button>` : `<button class="primary wide" data-a="sins">Done</button>`}</div>`
  );
}
/* Part of rcSheet() in recalc.js and of fdSheet() in drills.js: the framing line as a tile, or "". */
function sngFrameTile(c, moment) {
  const f = sngFrame(c, moment);
  return f ? `<div class="tile">${f}</div>` : "";
}
/* Part of fdSheet() in drills.js. On the crash drill, the line for the type, under the drill's own words. */
function fdSheetSins(h) {
  try {
    if (!W || W.id !== "crash") return h;
    const t = sngFrameTile(C(), "crash"),
      at = '<div class="tile stack" style="gap:6px"><div class="row between"><b class="small">Your rep</b>';
    return t && h.indexOf(at) >= 0 ? h.replace(at, () => t + at) : h;
  } catch (e) {
    report(e, "sins.js: fdSheetSins");
    return h;
  }
}
Object.assign(ACT, {
  snshare: () => {
    if (!qzMine()) return;
    W = { kind: "snshare" };
    sheet(snShareSheet);
  },
  snsharecopy: () => {
    const w = W,
      S = snShareCard(qzSkin("sins"), sngPlainCard(C())),
      done = ok => {
        if (W !== w) return;
        w.copied = ok;
        w.msg = ok ? "" : "This device did not let the game copy. Press and hold the words above to copy them.";
        drawSheet();
      };
    try {
      navigator.clipboard.writeText(S.text).then(
        () => done(true),
        e => {
          report(e, "sins.js: snsharecopy (1)");
          done(false);
        }
      );
    } catch (e) {
      report(e, "sins.js: snsharecopy (2)");
      done(false);
    }
  },
  snsharesend: () => {
    try {
      const S = snShareCard(qzSkin("sins"), sngPlainCard(C())),
        p = navigator.share({
          title: S.title,
          text: S.text,
          url: typeof fdLink === "function" ? fdLink(null) : undefined,
        });
      if (p && p.catch)
        p.catch(e => {
          if (!e || e.name !== "AbortError") report(e, "sins.js: snsharesend (1)");
        });
    } catch (e) {
      report(e, "sins.js: snsharesend (2)");
    }
  },
  snretake: () => {
    if (!qzMine()) return;
    const c = C();
    c.x.qz.sins = snRetakeKeep(c, "sins");
    save();
    W = { kind: "qzq", id: "sins" };
    sheet(qzSheet);
  },
  snretakeskip: () => {
    if (!qzMine()) return;
    const c = C(),
      st = sngSt(c);
    st.sn = snRetakeSkip(st.sn, st, todayISO());
    save();
    drawSheet();
  },
  snmate: t => {
    if (!qzMine()) return;
    sngSt(C()).sn.mate = t.dataset.v === "1";
    save();
    drawSheet();
  },
  sndate: () => {
    if (!qzMine()) return;
    W = { kind: "sndate", step: 0 };
    sheet(snDateSheet);
  },
  sndatestep: t => {
    if (!W || W.kind !== "sndate") return;
    W.step = +t.dataset.v || 0;
    drawSheet();
  },
});
