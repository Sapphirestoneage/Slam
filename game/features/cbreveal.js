/* ============================================================================
   SLAM the Game: features/cbreveal.js
   PURPOSE     What it is / What it could be, Batch B, phase 4 (Nov 27 2026): the reveal, the card to share,
               Home, and the day after.
               (4a) The reveal: the two numbers side by side, the difference in dollars and in years, what
               was counted (each with the way to its deeper feature), and the finished chart with every
               switch. (4b) The words of "Keep my plan" and the card of "Share my card" for the last screen
               (cbEndView in couldbe.js). (4c) The top 3 moves as cards on Next Steps, each with "Add to my
               steps" (the plan items of the Strategy Engine). (4d) The first tile of Home: the two numbers
               and a small layer chart; a tap opens the flow where the player left off. (4e) On a later day
               the tile says what changed since last time, with the lines of the receipt.
   INPUT       The profile (c.x.cb: count, how, at, rev, seen, was) and what the flow's own functions return.
               The open sheet (W.kind cb, W.step reveal or end; W.msg: one line after a tap).
   OUTPUT      Math (compositions of the flow's functions, no formula of their own): cbIn, cbReveal,
               cbPlanCard, cbTopMoves, cbTopIds, cbSnap, cbSince, cbSeenKeep, cbSaveState, cbHomeData,
               cbFirstMove (the first move of the flow), cbFirstPick, cbResult (the result: cbEndView in
               couldbe.js), cbHomeFirst, cbRevealBookRows (part of cbBook in couldbe.js). Views:
               cbRevealView. Parts of functions in
               other files: homeCbTile and homeFirstCard (homeQuadTop in ux.js), cbTopRows (planTabCb in couldbe.js), cbTopIds
               (planTabStrat in strat.js). Actions (ACT): cbsave, cbshare, cbaddstep, cbfirstgo. A step of the flow, added
               with cbStepAdd("reveal", ...).
   DEPENDS ON  core/report.js, core/paylayers.js (lyReceipt, LY_SPENDING, LY_END), core/engine.js (derive,
               todayISO, daysBetween), features/couldbe.js (cbHas, cbStore, cbNumbers, cbChart, cbChartHtml,
               cbLayerToggles, cbGapLine, cbNeedsLine, cbCushionWords, cbTop, cbFoot, cbM, cbStepAdd, CB_STEPS,
               CB_COL), features/cbstack.js (cbStack, cbStackLine), features/cbmoves.js (cbMoves),
               features/cbyesbut.js (cbYbPick, cbYbImage: the one maker of an image), features/strat.js (stgYm,
               stgOf, stgAdded, stgAddSteps), features/receipt.js (rcpNums, rcpDiff, rcpHtml),
               features/results.js (rsFire), features/kit.js (kitPill, kitInfo, kitTerms), screens/dash.js
               (dkCard), account/door.js (doorGuest), account/supa.js (SUPA), account/trust.js (TRUST_LINE),
               screens/ui.js (head, mathBox, esc, save, render, drawSheet).
   RULES       A view shows what the math functions return. The difference between the two numbers is what
               the flow's one engine gives (lyReceipt). The moves before FI and the Yes, but card come from
               the month-by-month run of the plan: their months are on their own line, never added to the
               difference, and an "i" says so. The card to share has ages, names and time. It has no dollar
               amount. The tile of Home shows only to a player who has been in the flow (c.x.cb).
   COMPAT      New optional keys in c.x.cb: at (the screen of the flow the player left off on), rev (the day
               the reveal was first seen), seen and was ({ day, n }: the numbers the last time the player was
               here, and the time before that). An old saved game has none, and nothing here shows for it.
               Run 16: first ("cb" or "era"), set by the tap on "Start my first move" and removed when the
               player starts the move on Home. An old saved game has none: Home shows Your next win.
   STATE       None.
   ========================================================================= */
/* How many of the moves become cards on Next Steps. */
const CBR_TOP = 3;
/* The deeper feature of each way to shrink the number, and of each cost: the action that opens it, and its name.
   A move of the stack carries its own (cbMoves: open). */
const CBR_DEEP = {
  shape: { a: "odds", v: "", l: "Retirement odds" },
  ss: { a: "odds", v: "", l: "Retirement odds" },
  taxplan: { a: "taxv", v: "", l: "Your tax view" },
  flex: { a: "takeout", v: "guard", l: "Taking money out: guardrails" },
  later: { a: "life", v: "", l: "Make it exact" },
  health: { a: "takeout", v: "aca", l: "Taking money out: health cover" },
  wtax: { a: "taxv", v: "", l: "Your tax view" },
  yesbut: { a: "values", v: "", l: "Is my money going where I want?" },
};
/* The names of the screens of the flow, for "pick up where you left off". A way has its own title. */
const CBR_AT = {
  is: "What it is",
  chart: "The chart",
  stack: "The stack",
  yesbut: "Yes, but",
  reveal: "The reveal",
  end: "Your result",
};
/* True for a player who has been in the flow. */
function cbIn(c) {
  return !!(c && c.x && c.x.cb && cbHas(c));
}

/* ---------- THE MATH (compositions) ---------- */
/* THE REVEAL: the two numbers, the chart, the stack, the difference in dollars and in time, and what is counted.
   diff: { off (dollars, to the $1,000), months, years, money, time, words, card }. items: [{ id, kind (way, cost,
   move, card), name, words, deep ({ a, v, l }) }]. nodeep: the items with no deeper feature. */
function cbReveal(c) {
  const K = cbChart(c),
    N = K.N,
    R = lyReceipt(N.is, N.could),
    S = cbStack(c),
    Y = typeof cbYbPick === "function" ? cbYbPick(c) : null,
    off = R.off == null ? null : Math.round(R.off / 1000) * 1000,
    m = R.months,
    money2 = off == null ? "" : off > 0 ? cbM(off) + " less to reach" : off < 0 ? cbM(-off) + " more to reach" : "",
    time =
      m == null
        ? N.could.age != null
          ? "a date on the calendar: age " + N.could.age
          : "the date is still open"
        : m > 0
          ? stgYm(m) + " sooner"
          : m < 0
            ? stgYm(-m) + " later"
            : "at the same age",
    cap = s => s.replace(/^./, x => x.toUpperCase()),
    items = [];
  S.after
    .filter(w => w.stacked)
    .forEach(w =>
      items.push({
        id: w.id,
        kind: "way",
        name: w.title,
        words: (w.state.how === "did" ? "Already yours. " : "") + (w.words || "Counted"),
        deep: CBR_DEEP[w.id] || null,
      })
    );
  LY_SPENDING.filter(x => x.cost && K.cnt[x.id]).forEach(x =>
    items.push({
      id: x.id,
      kind: "cost",
      name: x.name,
      words: "A cost the 25 times rule leaves out. Counting it raises the number",
      deep: CBR_DEEP[x.id] || null,
    })
  );
  S.moves
    .filter(r => r.stacked)
    .forEach(r =>
      items.push({
        id: r.id,
        kind: "move",
        name: r.name,
        words: (r.how === "did" ? "Already yours. " : "") + r.words,
        deep: r.open
          ? {
              a: r.open.a,
              v: r.open.v,
              l: r.src === "stg" ? "its full card in Moves to try" : r.open.l.replace(/^Open /, ""),
            }
          : null,
      })
    );
  if (Y && Y.n)
    items.push({ id: "yesbut", kind: "card", name: "Your Yes, but card", words: Y.net.words, deep: CBR_DEEP.yesbut });
  return {
    K,
    N,
    S,
    st: N.st,
    diff: {
      off,
      months: m,
      years: m == null ? null : m / 12,
      money: money2,
      time,
      words: N.same
        ? "Nothing is counted yet, so the two numbers are equal."
        : cap((money2 ? money2 + ", " : "") + time) + ".",
      /* the middle of the card to share: time and counts, no dollars */
      card:
        m != null && m !== 0
          ? cap(time)
          : m == null && N.could.age != null
            ? "A date on the calendar"
            : S.stacked + " of " + S.of + " ways stacked",
    },
    items,
    nodeep: items.filter(x => !x.deep),
    movesSum: S.movesSum,
    yb: Y && Y.n ? Y : null,
  };
}
/* The words of the card to share. The same parts as the Yes, but card, so that the one painter draws it
   (cbYbPaint in cbyesbut.js). Ages, names and time: no dollar amount. V: cbReveal(). */
function cbPlanCard(V) {
  const age = x => (x.age == null ? "No date yet at today's pace" : x.years === 0 ? "There now" : "FI at age " + x.age),
    names = V.items.filter(x => x.kind !== "card").map(x => x.name);
  return {
    brand: "SLAM the Game",
    title: "My two numbers",
    yes: { label: "What it is", lines: ["The standard way:", "25 times a year of spending"], words: age(V.N.is) },
    mid: "The difference",
    net: V.diff.card,
    but: {
      label: "What it could be",
      lines: names.length
        ? names.slice(0, 3).concat(names.length > 3 ? ["and " + (names.length - 3) + " more"] : [])
        : ["Nothing counted yet"],
      words: age(V.N.could),
    },
    foot: "A what-if on my own numbers. " + (typeof TRUST_LINE === "string" ? TRUST_LINE : ""),
    file: "slam-my-two-numbers.png",
  };
}
/* THE TOP MOVES for Next Steps: the moves the player counted first, then the most days sooner. A move that is
   already theirs, or left out, is not a next step. [{ id, src, key, name, words, counted, added, canAdd, open }]. */
function cbTopMoves(c) {
  if (!cbIn(c) || !c.x.cb.rev || typeof cbMoves !== "function") return [];
  return cbMoves(c)
    .shown.filter(r => !r.already && r.how !== "did" && r.how !== "no")
    .sort((a, b) => (b.how === "count" ? 1 : 0) - (a.how === "count" ? 1 : 0) || b.days - a.days)
    .slice(0, CBR_TOP)
    .map(r => {
      const S = r.src === "stg" ? stgOf(r.key) : null,
        added = !!S && stgAdded(c, S);
      return {
        id: r.id,
        src: r.src,
        key: r.key,
        name: r.name,
        words: r.words,
        counted: r.how === "count",
        added,
        canAdd: !!S && !added && S.quests.length > 0,
        open: r.open,
        one: r.one || "",
        /* what the move is about, for "because you picked ..." (wants.js): the lever of a move of the Strategy
           Engine; trimming spending is the spending lever */
        lever: S ? S.lever : r.src === "lv" && r.key === "spend" ? "spending" : null,
        /* about how long: the minutes of its steps, as Next Steps counts them (stgAddSteps). A lever or a
           multiplier has no steps, so it has no time. */
        steps: S ? S.quests.length : 0,
        mins: S && S.quests.length ? S.quests.reduce((t, q) => t + (q.mins || 15), 0) : null,
      };
    });
}
/* THE FIRST MOVE of the last screen (run SLAM-ONBOARD-1): the #1 of the top moves of Next Steps. { key, name, why
   (tied to a want of the player when one matches: wants.js), want, words (its effect on the date), time (about how
   long, from the minutes of its steps; null when the move has no steps), canAdd, added, open }, or null. */
function cbFirstMove(c) {
  const T = cbTopMoves(c)[0];
  if (!T) return null;
  const want = typeof wnMatch === "function" ? wnMatch(c, (T.lever ? [T.lever] : []).concat(["fi"])) : null;
  return {
    key: T.key,
    src: T.src,
    name: T.name,
    want: want ? want.l : null,
    why: (want ? "Because you picked " + want.l + ". " : "") + T.one,
    words: T.words,
    time: T.mins ? "About " + T.mins + " min, in " + T.steps + (T.steps === 1 ? " step" : " steps") : null,
    canAdd: T.canAdd,
    added: T.added,
    open: T.open,
  };
}
/* THE ONE FIRST MOVE, for the result and for Home (run 16, A1 and A3). src "era": the player comes from the demo
   Find your era, and the move is the one the demo showed, the key step of the next era (erNext in erain.js). Else
   it is the first move of the flow (cbFirstMove) while it is not on the steps yet, and the key step of the next era
   when the flow has no move for this player. { src, name, why, words, key, canAdd, open ({ a, v }) }, or null. */
function cbFirstPick(c, d, src) {
  const M = src === "era" ? null : cbFirstMove(c);
  if (M && !M.added)
    return {
      src: "cb",
      name: M.name,
      why: M.why,
      words: M.words + (M.time ? ". " + M.time : ""),
      key: M.key,
      canAdd: M.canAdd,
      open: M.open,
    };
  const E = typeof erNext === "function" ? erNext(c, d || derive(c)) : null;
  return E
    ? {
        src: "era",
        name: E.t,
        why: E.why,
        words: "It opens your next era: " + E.opens,
        key: null,
        canAdd: false,
        open: E.kind === "step" ? { a: "node", v: E.id } : { a: "tab", v: "map" },
      }
    : null;
}
/* THE RESULT of the flow (cbEndView in couldbe.js): the name of the era and its one line (the game's own: eraName
   and eraOne), the first move, and where the answers are kept. kept: "Saved to your account." for a signed-in
   player; the line about no account only for a player who is signed out. */
function cbResult(c) {
  const d = derive(c),
    S = cbSaveState();
  return {
    era: eraName(d),
    why: eraOne(d),
    st: cbState(c),
    move: cbFirstPick(c, d, c.x && c.x.cb && c.x.cb.first === "era" ? "era" : "cb"),
    signed: S.signed,
    kept: S.kept,
  };
}
/* THE FIRST MOVE ON HOME: the move of the result, from the tap on "Start my first move" (c.x.cb.first) until the
   player starts it. Null for every other player: Home then shows Your next win. */
function cbHomeFirst(c, d) {
  const s = c && c.x && c.x.cb;
  if (!s || !s.first || G.demo || !cbHas(c)) return null;
  /* the move is on the steps already (Add to my steps on Next Steps): it is started */
  if (s.first !== "era") {
    const M = cbFirstMove(c);
    if (M && M.added) return null;
  }
  return cbFirstPick(c, d, s.first);
}
/* Part of planTabStrat() in strat.js. The ids of the moves of the Strategy Engine that have their own card on Next
   Steps, so that "Moves to try" shows the next ones. */
function cbTopIds(c) {
  try {
    return cbTopMoves(c)
      .filter(r => r.src === "stg")
      .map(r => r.key);
  } catch (e) {
    report(e, "cbreveal.js: cbTopIds");
    return [];
  }
}
/* The numbers that "since last time" compares: the numbers of a receipt (rcpNums), and the two numbers. */
function cbSnap(c) {
  const N = cbNumbers(c);
  return { r: rcpNums(c), is: N.is.shown, could: N.could.shown, isAge: N.is.age, couldAge: N.could.age };
}
/* Keep the numbers as they are now, as "the last time the player was here". Called when the page is put away, and
   when the player reaches the reveal or leaves the last screen. The snapshot of an earlier day moves to `was`. */
function cbSeenKeep() {
  try {
    const c = typeof C === "function" ? C() : null;
    if (!cbIn(c) || G.demo) return false;
    const s = cbStore(c),
      t = todayISO();
    if (s.seen && s.seen.day < t) s.was = s.seen;
    s.seen = { day: t, n: cbSnap(c) };
    save();
    return true;
  } catch (e) {
    report(e, "cbreveal.js: cbSeenKeep");
    return false;
  }
}
/* WHAT CHANGED SINCE LAST TIME: the numbers of the last day the player was here, next to the numbers now. Null on
   the first day. { day, days, lines (the lines of a receipt: rcpDiff, and one line for each of the two numbers
   that moved) }. No bars: the lines are read on Home, not played. */
function cbSince(c, today) {
  const s = (c.x && c.x.cb) || {},
    t = today || todayISO(),
    base = s.seen && s.seen.day < t ? s.seen : s.was && s.was.day < t ? s.was : null;
  if (!base || !base.n) return null;
  const a = base.n,
    b = cbSnap(c),
    lines = rcpDiff(a.r, b.r, rsFire(c)).map(x => ({ k: x.k, label: x.label, txt: x.txt, up: x.up, math: x.math })),
    num = (k, label, v0, v1, a0, a1) => {
      if (v0 === v1 && a0 === a1) return;
      /* closer: a smaller number, or the same number at a younger age (or an age where there was none) */
      const down = v1 != null && v0 != null && v1 !== v0 ? v1 < v0 : a1 != null && (a0 == null || a1 < a0),
        was = (v0 == null ? "no number" : cbM(v0)) + (a0 == null ? "" : ", age " + a0),
        now = (v1 == null ? "no number" : cbM(v1)) + (a1 == null ? "" : ", age " + a1);
      lines.push({
        k,
        label,
        txt: (down ? "" : "Recalculating route. ") + label + ": now " + now,
        up: down,
        math:
          label + " then: " + was + ". Now: " + now + ". The same math as the flow, with your numbers then and now.",
      });
    };
  num("cbis", "What it is", a.is, b.is, a.isAge, b.isAge);
  num("cbcould", "What it could be", a.could, b.could, a.couldAge, b.couldAge);
  return { day: base.day, days: daysBetween(base.day, t), lines };
}
/* Where the plan is kept now, and what "Keep my plan" does. { guest, signed, kept, words }. */
function cbSaveState() {
  const guest = typeof doorGuest === "function" && doorGuest(),
    signed = !guest && typeof SUPA !== "undefined" && !!SUPA.uid;
  return {
    guest,
    signed,
    /* run 16, A4: the short line of the result. The words about no account only when nobody is signed in. */
    kept: signed ? "Saved to your account." : "No account. Nothing is sent. Your answers stay on this device.",
    words: guest
      ? "Right now your plan is on this device only. A free account keeps it and takes it to your other devices."
      : signed
        ? "Your plan is in your account. It saves by itself after each tap."
        : "Your plan is saved on this device.",
  };
}
/* What the tile of Home shows: the two numbers, the chart, where the player left off, what changed since last
   time, and whether the rest of setup is still open. */
function cbHomeData(c) {
  const s = c.x.cb,
    K = cbChart(c),
    step = CB_STEPS.find(x => x.id === s.at),
    way = cbWays().find(w => w.id === s.at);
  return {
    K,
    N: K.N,
    at: s.at && (s.at === "stack" || step) ? s.at : "is",
    atName: CBR_AT[s.at] || (way && way.title) || CBR_AT.is,
    since: cbSince(c),
    rest: !!s.a && !s.setup,
  };
}
/* Part of cbBook() in couldbe.js. The spreadsheet of the plan: the second number and the difference. */
function cbRevealBookRows(c) {
  try {
    const N = cbNumbers(c);
    if (N.could.target == null || N.is.target == null) return [];
    return [
      { id: "cb_could", label: "What it could be: the number with what you counted", v: N.could.target },
      {
        id: "cb_diff",
        label: "The difference: What it is less What it could be",
        v: lyReceipt(N.is, N.could).off,
        f: "={cb_is}-{cb_could}",
      },
    ];
  } catch (e) {
    report(e, "cbreveal.js: cbRevealBookRows");
    return [];
  }
}

/* ---------- THE VIEWS ---------- */
/* THE REVEAL. */
function cbRevealView() {
  const c = C(),
    V = cbReveal(c),
    K = V.K,
    N = V.N,
    S = V.S,
    U = cbTypUsed(c) /* couldbe.js: the answers that are a typical value */,
    row = x =>
      x.deep
        ? `<button class="rowbtn" data-a="${esc(x.deep.a)}" data-v="${esc(x.deep.v)}" data-fid="cb:revitem"><span style="min-width:0"><b>${esc(x.name)}</b><div class="tiny muted">${esc(x.words)}. Go deeper: ${esc(x.deep.l)}.</div></span><span class="caret"><i class=chev aria-hidden=true></i></span></button>`
        : `<div class="tile small" data-fid="cb:revitem"><b>${esc(x.name)}</b><div class="tiny muted">${esc(x.words)}.</div></div>`,
    /* in the order of the flow, so that a chip stays in its place when it is tapped */
    ways = S.after
      .slice()
      .sort((a, b) => a.n - b.n)
      .map(
        w =>
          `<button class="chip cbcnt ${w.stacked ? "on" : ""}" data-a="cbquick" data-k="${w.id}" aria-pressed="${w.stacked ? "true" : "false"}">${esc(w.title)}${w.stacked ? " ✓" : ""}</button>`
      )
      .join(""),
    costs = LY_SPENDING.filter(x => x.cost)
      .map(
        x =>
          `<button class="chip cbcnt ${K.cnt[x.id] ? "on" : ""}" data-a="cbcount" data-v="${x.id}" aria-pressed="${K.cnt[x.id] ? "true" : "false"}">${esc(x.name)}${K.cnt[x.id] ? " ✓" : ""}</button>`
      )
      .join("");
  return (
    head("The reveal", "Your FI number, and what it could be") +
    cbTop(c) +
    `<div class="tile cbdrop cbrev" data-fid="cb:diff"><div class="row between" style="gap:8px"><span class="dklabel">The difference ${kitInfo("cbdiff")}</span>${kitPill(V.st)}</div><b class="cbdropn" data-fid="cb:diffn">${esc(V.diff.words)}</b><div class="tiny muted">${N.same ? "Count a way below, or on the stack, and What it could be moves." : N.above ? "It is above What it is because a cost the 25 times rule leaves out is counted: " + esc(N.raisedBy.map(k => LY_SPENDING.find(s => s.id === k).name.toLowerCase()).join(" and ")) + "." : "What it is stays where it is: it is the floor. What it could be follows what you count."}</div></div>` +
    (V.movesSum.n || V.yb
      ? `<div class="tile small" data-fid="cb:revmoves"><div class="row between" style="gap:8px;align-items:flex-start"><span>${V.movesSum.n ? `<b>${V.movesSum.n === 1 ? "The move you counted" : "The " + V.movesSum.n + " moves you counted"}: ${esc(V.movesSum.words.replace(/^./, x => x.toLowerCase()))}.</b> ` : ""}${V.yb ? `<b>Your Yes, but card: ${esc(V.yb.net.words.replace(/^./, x => x.toLowerCase()))}.</b>` : ""}</span>${kitInfo("cbtwo")}</div><div class="tiny muted">On their own line: these move the date you reach your number. They are not added to the difference above.</div></div>`
      : "") +
    (U.length
      ? `<div class="tile small cbtypbox" data-fid="cb:typ"><div class="row between" style="gap:8px"><b>${U.length === 1 ? "One answer is a typical value" : U.length + " answers are typical values"}</b>${kitPill("Guess")}</div><div class="tiny muted">Not yours yet: what is usual for your age. One tap makes it yours, and the numbers recalculate.</div>${U.map(u => `<div class="row between cbtyprow" style="gap:8px" data-fid="cb:typrow"><span class="small" style="min-width:0">${esc(u.name)}: <b class="guess">${u.q === "inv" ? lkK(u.v) : cbM(u.v)}</b>${esc(u.per)}, typical for ages ${esc(u.band)}</span><button class="ghost slim" data-a="cbmine" data-q="${u.q}">Make it mine</button></div>`).join("")}</div>`
      : "") +
    dkCard(
      "What you counted",
      (typeof cbStackLine === "function" ? cbStackLine(c, S) : "") +
        `<div class="stack" style="gap:6px;margin-top:6px" data-fid="cb:revlist">${V.items.map(row).join("") || `<div class="tiny muted">Nothing yet. The switches under the chart count a way with one tap.</div>`}</div>` +
        `<button class="ghost wide" data-a="cbgo" data-v="stack">Change what is counted</button>`,
      { cap: "Tap one to open its deeper feature in the game." }
    ) +
    dkCard(
      "The finished chart",
      cbChartHtml(K) +
        `<div class="cbkey tiny muted"><span><i class="cbln"></i>The line: what the year costs</span><span><i class="cbsq hatch"></i>Not covered yet</span></div>` +
        cbLayerToggles(K) +
        `<div class="stack" style="gap:6px;margin-top:8px"><b class="small">The ways to shrink the number: tap one to count it or take it out</b><div class="row cbgapbtn" data-fid="cb:revways">${ways || `<span class="tiny muted">None applies to your numbers yet.</span>`}</div><b class="small">The costs the 25 times rule leaves out</b><div class="row cbgapbtn" data-fid="cb:revcosts">${costs}</div></div>` +
        `<button class="ghost wide" data-a="cbgo" data-v="chart">Open the full chart</button>`,
      { cap: "From " + K.p.age + " to " + LY_END + ", 5 years a bar. Every switch is here." }
    ) +
    cbGapLine(K) +
    cbNeedsLine(K) +
    `<div class="tile small" data-fid="cb:cushion"><b>${esc(cbCushionWords(K.p))}</b><div class="tiny muted">${K.leftEnd > 0 && !K.gaps.length ? "On this chart about " + lkK(K.leftEnd) + " is still invested at " + LY_END + ". It is there in case the market goes down." : "The number is 25 times a year of spending for that reason: you take less than the growth."}</div></div>` +
    mathBox(
      [
        "What it is: " + cbM(K.p.spend) + " a year x 25 = " + cbM(N.is.target) + ".",
        "What it could be: what must be invested the day work stops, so that it pays each year's cost less the steady income you counted, to " +
          LY_END +
          " and beyond" +
          (N.could.target == null ? "." : ": " + cbM(N.could.target) + "."),
        "The difference: What it is less What it could be, to the nearest $1,000. The time is the age you reach each one at today's pace.",
        "The moves before FI and the Yes, but card are a different run (your plan month by month), so their months are on their own line.",
        V.st === "Guess"
          ? "This is a Guess: it stands on the ranges you tapped. Each real number you add recalculates it."
          : "",
        "Each way has its own Show the math, with its source.",
      ].concat(
        U.map(
          u =>
            "A typical value, " +
            u.name.toLowerCase() +
            ": " +
            (u.q === "inv" ? lkK(u.v) : cbM(u.v)) +
            u.per +
            ". Source: " +
            u.source +
            "."
        )
      )
    ) +
    `<button class="primary wide go" data-a="cbgo" data-v="end">Next: my result</button>` +
    `<button class="ghost wide" data-a="cbgo" data-v="stack">Back to the stack</button>` +
    /* run 16, A1: the three buttons of the old last screen live here now, quiet, under the way on */
    `<details class="math cbkeep" data-fid="cb:end3"${W && W.msg ? " open" : ""}><summary>Keep it, share it, or tell Eli</summary><div class="inner stack cbend3" style="gap:8px"><div class="tiny muted">${esc(cbSaveState().words)}</div><button class="ghost wide" data-a="cbsave">${cbSaveState().signed ? "Keep my plan" : "Keep my plan: make a free account"}</button><button class="ghost wide" data-a="cbshare">Share my card</button><button class="ghost wide" data-a="flag">Tell Eli what broke</button>${W && W.msg ? `<div class="small" data-fid="cb:endmsg" role="status">${esc(W.msg)}</div>` : ""}<div class="tiny muted">The card is an image: the two ages, what you counted, and the time between them. It has no dollar amount. Nothing leaves this device until you send it.</div></div></details>` +
    cbFoot()
  );
}
/* Part of homeQuadTop() in ux.js. The first tile of Home for a player of the flow: the two numbers and a small
   layer chart; a tap opens the flow where the player left off. On a later day: what changed since last time. */
function homeCbTile(c) {
  try {
    if (!c || G.demo || !cbIn(c)) return "";
    const H = cbHomeData(c),
      N = H.N,
      age = x => (x.age == null ? "not at this pace yet" : x.years === 0 ? "now" : "at age " + x.age),
      cell = (k, label, x) =>
        `<span class="cbnum ${k}"><span class="dklabel">${label}</span><b class="dknum">${x.shown == null ? "No number yet" : cbM(x.shown)}</b><span class="tiny">${esc(age(x))}</span></span>`,
      Sn = H.since;
    return (
      `<div class="card dkcard cbhome" data-fid="cb:home"><div class="row between dkhead"><span class="dklabel">Your two numbers</span>${kitPill(N.st)}</div>` +
      `<button class="cbhomego" data-a="cbback" data-fid="cb:homego" aria-label="Open What it is, What it could be at ${esc(H.atName)}"><span class="cbhnums">${cell("is", "What it is", N.is)}${cell("could", "What it could be", N.could)}</span>${cbChartHtml(H.K, { small: true })}<span class="row between cbhgo"><span class="tiny">Pick up where you left off: ${esc(H.atName)}</span><span class="caret"><i class=chev aria-hidden=true></i></span></span></button>` +
      (Sn
        ? `<div class="cbsince" data-fid="cb:since"><b class="small">Since last time, ${Sn.days === 1 ? "1 day ago" : Sn.days + " days ago"}</b>${Sn.lines.length ? rcpHtml({ lines: Sn.lines, teaser: null, next: null }) : `<div class="tiny muted">Nothing moved. Your numbers are where you left them.</div>`}</div>`
        : "") +
      mathBox([
        "What it is: 25 times what you spend in a year" + (N.is.target == null ? "." : ", " + cbM(N.is.target) + "."),
        "What it could be: what must be invested the day work stops, with what you counted" +
          (N.could.target == null ? "." : ", " + cbM(N.could.target) + "."),
        "The chart: what pays for each year from " +
          H.K.p.age +
          " to " +
          LY_END +
          ", 5 years a bar. The card opens the full math.",
      ]) +
      (H.rest
        ? `<button class="rowbtn" data-a="cbrest" data-fid="cb:homerest"><span><b>Finish setup: five short rounds</b><div class="tiny muted">Debts, what you have, income, taxes, spending. It turns the guesses into your real picture.</div></span><span class="caret"><i class=chev aria-hidden=true></i></span></button>`
        : "") +
      `</div>`
    );
  } catch (e) {
    report(e, "cbreveal.js: homeCbTile");
    return "";
  }
}
/* Part of homeQuadTop() in ux.js (run 16, A3). The one next-step card of Home while the first move of the result
   waits: its name, one line of why, and the one pulsing button of Home. "" for every other player. */
function homeFirstCard(c, d) {
  try {
    const F = cbHomeFirst(c, d);
    if (!F) return "";
    return `<div class="card dkcard rsq rswin hqfirst pulse" data-fid="cb:homefirst"><div class="row between dkhead"><span class="dklabel">Your first move</span></div><div class="hqfirstin"><div class="hqfirstt"><b class="rswint" data-fid="cb:homefirstname">${esc(F.name)}</b><div class="small" data-fid="cb:homefirstwhy">${esc(F.why)}</div><div class="tiny muted">${esc(F.words)}.</div></div><button class="primary wide" data-a="cbfirstgo">Start this move</button></div></div>`;
  } catch (e) {
    report(e, "cbreveal.js: homeFirstCard");
    return "";
  }
}
/* Part of planTabCb() in couldbe.js. Next Steps: the top moves of the flow as cards. A card opens the full card of
   the move; "Add to my steps" puts its steps on the plan (stgAddSteps in strat.js). */
function cbTopRows(c) {
  try {
    const T = cbTopMoves(c);
    if (!T.length) return "";
    return dkCard(
      T.length === 1 ? "Your top move" : "Your top " + T.length + " moves",
      `<div class="stack" style="gap:8px;margin-top:6px" data-fid="cb:topmoves">${T.map(
        r =>
          `<div class="cbstkrow" data-fid="cb:topmove"><button class="rowbtn" data-a="${esc(r.open.a)}" data-v="${esc(r.open.v)}"><span style="min-width:0"><b>${esc(r.name)}</b><div class="tiny muted">${esc(r.words)}${r.counted ? ". Counted in your stack" : ""}.</div></span><span class="caret"><i class=chev aria-hidden=true></i></span></button>${r.canAdd ? `<button class="chip cbcnt" data-a="cbaddstep" data-k="${esc(r.key)}">Add to my steps</button>` : r.added ? `<span class="pill okp">On your steps</span>` : ""}</div>`
      ).join("")}</div>`,
      { cap: "From What it could be: what you counted first, then the most days sooner. Tap one for its full card." }
    );
  } catch (e) {
    report(e, "cbreveal.js: cbTopRows");
    return "";
  }
}
Object.assign(ACT, {
  /* Keep my plan: a visitor with no account goes to the door of a free account; a signed-in player sees where the
     plan is kept */
  cbsave: () => {
    const S = cbSaveState();
    cbSeenKeep();
    if (S.guest && typeof ACT.doorsave === "function") return ACT.doorsave();
    if (W && W.kind === "cb") {
      W.msg = S.signed ? "Saved. " + S.words : S.words + " An account is made from the front door of the game.";
      drawSheet();
    }
  },
  /* Share my card: the image of the two numbers, by the share sheet of the device, else as a file */
  cbshare: () => {
    cbSeenKeep();
    cbYbImage("send", cbPlanCard(cbReveal(C())));
  },
  /* Home, the first move: its steps go on Next Steps (a move of the Strategy Engine), the card gives way to Your next
     win, and the move opens */
  cbfirstgo: () => {
    const c = C(),
      F = cbHomeFirst(c, derive(c));
    if (c.x && c.x.cb) delete c.x.cb.first;
    if (F && F.canAdd) stgAddSteps(c, F.key);
    save();
    render();
    if (F && ACT[F.open.a]) ACT[F.open.a]({ dataset: { v: String(F.open.v == null ? "" : F.open.v) } });
  },
  /* Next Steps: put the steps of a top move on the plan */
  cbaddstep: t => {
    if (stgAddSteps(C(), t.dataset.k)) {
      save();
      render();
      /* the last screen of the flow has the same button: its tile then says "On your steps" */
      if (SH && W && W.kind === "cb") drawSheet();
    }
  },
});
kitTerms({
  cbdiff: [
    "The difference",
    "What it is less What it could be: how much less has to be invested when what you counted goes right, and how much sooner you reach it at today's pace. What it is, the 25 times number, stays as the floor. If a way you counted does not work out, the game recalculates, and the floor is still there.",
  ],
  cbtwo: [
    "Why these months are on their own line",
    "The two numbers on top answer one question: how much must be invested the day work stops. The moves before FI and the Yes, but card answer another: how fast you get to your number, from a month-by-month run of your plan. The game does not add the two answers together yet, so the months of your moves are shown on their own line and the two numbers on top stay as they are.",
  ],
});
/* The page is put away (a tab closed, the phone locked): keep the numbers, for "since last time" on the next day. */
if (typeof document !== "undefined" && document.addEventListener)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") cbSeenKeep();
  });
cbStepAdd("reveal", () => cbRevealView());
