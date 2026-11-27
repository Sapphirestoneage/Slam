/* ============================================================================
   SLAM the Game: features/cbstack.js
   PURPOSE     What it is / What it could be, Batch B phases 2e and 2f (Nov 27 2026): the stack. One screen
               after the chart lists every way of the flow in two groups: the ways to shrink the number
               (after work) and the ways to get there sooner (before FI). Inside a group the biggest effect
               for this player is first. A way that cannot apply is not in the list: it is behind an "i"
               with the reason. A counter shows how many are stacked, and a meter shows how many of the
               counted ways have their backup in place. The player opens a way by choice, or counts it
               with one tap in the list, so the flow is not a long march.
   INPUT       The profile, through features/couldbe.js (cbWays, cbStepInfo, cbWayState, CB_STEPS: each way
               gives info(c) and set(how)) and features/cbmoves.js (cbMoves). c.x.cb.bk (the backups the
               player ticked). The open sheet (W.kind cb, W.step stack, W.all: the whole list of moves).
   OUTPUT      Math: cbStack (the two groups, sorted, what is hidden and why, the counter, the backups).
               Views: cbStackView, cbStackLine (the counter and the meter, also on the last screen),
               cbBackupRow (the backup of a way, on its screen). Actions (ACT): cbquick, cbbk, cbstkall.
   DEPENDS ON  core/report.js, features/couldbe.js (cbWays, cbStepInfo, cbWayState, cbStore, cbReceiptWords,
               cbTop, cbFoot, CB_STEPS), features/cbmoves.js (cbMoves, cbMoveDo), screens/dash.js (dkCard,
               dkProgress), features/kit.js (kitPill), screens/ui.js (head, mathBox, esc).
   RULES       "What it could be" is never made smaller for caution: the backups are a meter beside the
               number, and they change no number. "What it is" stays as the floor. A view shows what cbStack
               returns. No verdict on a way that is not counted, and none on a backup that is not in place.
   COMPAT      One more optional key: c.x.cb.bk { <way id>: true } (a backup the player ticked).
   STATE       None.
   ========================================================================= */
/* The first moves of the second group that show before "Show all". */
const CBS_FIRST = 3;
/* THE STACK. after: the ways that can apply (or are counted), the biggest drop first: [{ id, title, n, applies, why,
   receipt, words, st, state, stacked, backup, backupOn }]. afterHidden: the ways that cannot apply, with why. moves,
   movesHidden, movesSum: the same from cbMoves(). stacked and of: the counter. backups: { n, m }: the counted ways
   with a backup, and how many of those backups are in place. */
function cbStack(c) {
  const bk = (c.x && c.x.cb && c.x.cb.bk) || {},
    ways = cbWays().map(w => {
      const I = cbStepInfo(c, w.id),
        St = cbWayState(c, w.id),
        B = I.backup || null;
      return Object.assign({}, w, {
        applies: !!I.applies,
        why: I.why || "",
        receipt: I.receipt || null,
        words: I.receipt ? cbReceiptWords(I.receipt) : "",
        st: I.st || null,
        state: St,
        stacked: !!St.counted,
        backup: B,
        backupOn: !!B && (B.auto === true || (B.auto == null && !!bk[w.id])),
      });
    }),
    size = w => [
      w.receipt && w.receipt.months != null ? w.receipt.months : -1e9,
      w.receipt && w.receipt.off != null ? w.receipt.off : -1e15,
    ],
    after = ways
      .filter(w => w.applies || w.stacked)
      .sort((a, b) => size(b)[0] - size(a)[0] || size(b)[1] - size(a)[1] || a.n - b.n),
    afterHidden = ways.filter(w => !w.applies && !w.stacked),
    M = typeof cbMoves === "function" ? cbMoves(c) : { shown: [], hidden: [], stacked: 0, sum: { n: 0, words: "" } },
    counted = after.filter(w => w.stacked),
    withBk = counted.filter(w => w.backup);
  return {
    after,
    afterHidden,
    moves: M.shown,
    movesHidden: M.hidden,
    movesSum: M.sum,
    stacked: counted.length + M.stacked,
    of: after.length + M.shown.length,
    pct: after.length + M.shown.length ? (100 * (counted.length + M.stacked)) / (after.length + M.shown.length) : 0,
    backups: { n: withBk.filter(w => w.backupOn).length, m: withBk.length },
  };
}
/* The counter and the meter: "3 of 12 stacked" and "Backups in place: 2 of 3". Also on the last screen. */
function cbStackLine(c, S) {
  S = S || cbStack(c);
  return `<div class="tile small cbstk" data-fid="cb:stack"><div class="row between"><b data-fid="cb:stackn">${S.stacked} of ${S.of} stacked</b><span class="tiny muted">Tap a way to add it</span></div>${dkProgress(S.pct)}<div class="row between" style="gap:8px"><span data-fid="cb:backups">Backups in place: ${S.backups.n} of ${S.backups.m}</span><button class="i" data-a="info" data-k="term:cbbackups" aria-label="What is a backup?">i</button></div><div class="tiny muted">${S.backups.m ? "One for each way you counted to shrink the number. " : "Count a way to shrink the number, and its backup shows here. "}A backup changes no number.</div></div>`;
}
/* The backup of one way, on the screen of that way: its words, and whether it is in place. A backup the game can
   read from the choice shows by itself; the others have one tap. */
function cbBackupRow(c, id) {
  const w = cbStack(c)
    .after.concat(cbStack(c).afterHidden)
    .find(x => x.id === id);
  if (!w || !w.backup) return "";
  return `<div class="tile small cbbk" data-fid="cb:backup"><div class="row between" style="gap:8px"><b>Backup</b><span class="pill ${w.backupOn ? "okp" : ""}">${w.backupOn ? "In place" : "Not in place yet"}</span></div><div>${esc(w.backup.words)}</div>${w.backup.auto == null ? `<button class="chip ${w.backupOn ? "on" : ""}" data-a="cbbk" data-k="${id}" aria-pressed="${w.backupOn ? "true" : "false"}">${w.backupOn ? "I have this ✓" : "I have this"}</button>` : ""}</div>`;
}
/* THE SCREEN of the stack. */
function cbStackView() {
  const c = C(),
    S = cbStack(c),
    chip = (id, on) =>
      `<button class="chip cbcnt ${on ? "on" : ""}" data-a="cbquick" data-k="${id}" aria-pressed="${on ? "true" : "false"}">${on ? "Counted ✓" : "Count this"}</button>`,
    /* the chip beside a row says counted or not; the row adds only what the chip cannot say */
    state = w => (w.state.how === "did" ? ". Already yours" : w.state.how === "no" ? ". Left out" : ""),
    wayRow = w =>
      `<div class="cbstkrow" data-fid="cb:stkway"><button class="rowbtn" data-a="cbgo" data-v="${w.id}"><span><b>${esc(w.title)}</b><div class="tiny muted">${esc(w.words || "Open it to see the drop")}${state(w)}.</div></span><span class="caret"><i class=chev aria-hidden=true></i></span></button>${chip(w.id, w.stacked)}</div>`,
    moveRow = r =>
      `<div class="cbstkrow" data-fid="cb:stkmove"><button class="rowbtn" data-a="cbgo" data-v="move" data-k="${r.id}"><span><b>${esc(r.name)}</b><div class="tiny muted">${esc(r.words)}${r.notyet ? ". Not yet: " + esc(r.notyet.block.toLowerCase()) : ""}${r.how === "did" ? ". Already yours" : r.how === "no" ? ". Left out" : ""}.</div></span><span class="caret"><i class=chev aria-hidden=true></i></span></button>${chip(r.id, r.stacked)}</div>`,
    hid = (list, open, name) =>
      list.length
        ? `<details class="math cbhid" data-fid="cb:hidden"><summary><span class="i" aria-hidden="true">i</span> ${list.length} ${list.length === 1 ? "way" : "ways"} that cannot apply to you yet, and why</summary><div class="inner stack" style="gap:6px">${list.map(x => `<button class="rowbtn" data-a="cbgo" ${open(x)}><span><b>${esc(name(x))}</b><div class="tiny muted">${esc(x.why)}</div></span><span class="caret"><i class=chev aria-hidden=true></i></span></button>`).join("")}</div></details>`
        : "",
    first = W.all ? S.moves : S.moves.slice(0, CBS_FIRST);
  return (
    head("The stack", "Every way to move your number") +
    cbTop(c) +
    `<div class="small">Count what fits you. Each way you add moves What it could be, or the date you get there. What it is stays where it is: it is the floor.</div>` +
    cbStackLine(c, S) +
    dkCard(
      "After work: ways to shrink the number",
      `<div class="stack" style="gap:8px;margin-top:6px" data-fid="cb:after">${S.after.map(wayRow).join("") || `<div class="tiny muted">None applies to your numbers yet.</div>`}</div>` +
        hid(
          S.afterHidden,
          x => `data-v="${x.id}"`,
          x => x.title
        ),
      { cap: "The biggest drop for you is first." }
    ) +
    (typeof cbYbStackRow === "function"
      ? cbYbStackRow(c)
      : "") /* cbyesbut.js: the Yes, but card, between the groups */ +
    dkCard(
      "Before FI: ways to get there sooner",
      `<div class="stack" style="gap:8px;margin-top:6px" data-fid="cb:moves">${first.map(moveRow).join("")}</div>` +
        (S.moves.length > CBS_FIRST
          ? `<button class="ghost wide" data-a="cbstkall" aria-expanded="${W.all ? "true" : "false"}">${W.all ? "Show the first " + CBS_FIRST : "Show all " + S.moves.length}</button>`
          : "") +
        (S.movesSum.n
          ? `<div class="banner small" data-fid="cb:movesum"><b>${S.movesSum.n === 1 ? "The move you counted" : "The " + S.movesSum.n + " moves you counted, together"}: ${esc(S.movesSum.words.replace(/^./, m => m.toLowerCase()))}.</b> These move the date, not the target, so the two numbers on top stay.</div>`
          : "") +
        hid(
          S.movesHidden,
          x => `data-v="move" data-k="${x.id}"`,
          x => x.name
        ),
      { cap: "The most months sooner for you is first. Each one keeps its own full card." }
    ) +
    `<button class="primary wide go" data-a="cbgo" data-v="${CB_STEPS.some(s => s.id === "reveal") ? "reveal" : "end"}">See where this leaves you</button>` +
    `<button class="ghost wide" data-a="cbgo" data-v="chart">Back to the chart</button>` +
    mathBox([
      "Stacked: the ways you counted, or already do, out of the ways that can apply to you (" + S.of + ").",
      "After work, each drop is What it could be with that one way against the same numbers without it: dollars off the target, and months sooner.",
      "Before FI, months sooner comes from the game's month-by-month run of your plan (the same engine as Moves to try). It moves the date. The two numbers on top are about the target, so a counted move does not change them.",
      "Backups in place: of the ways you counted to shrink the number, how many have their backup. A backup never makes What it could be smaller, and What it is does not count on any of this.",
    ]) +
    cbFoot()
  );
}
Object.assign(ACT, {
  /* one tap in the list: count a way, or take it out again */
  cbquick: t => {
    if (!W || W.kind !== "cb") return;
    const id = t.dataset.k,
      c = C(),
      st = CB_STEPS.find(s => s.id === id);
    try {
      if (st && typeof st.set === "function") st.set(cbWayState(c, id).counted ? "no" : "count");
      else if (typeof cbMoveDo === "function") {
        const r = cbMoves(c).shown.find(x => x.id === id);
        cbMoveDo(id, r && r.stacked ? "no" : "count");
      }
    } catch (e) {
      report(e, "cbstack.js: cbquick");
    }
    drawSheet();
  },
  /* tick or untick the backup of a way */
  cbbk: t => {
    if (!W || W.kind !== "cb") return;
    const s = cbStore(C());
    s.bk = s.bk || {};
    if (s.bk[t.dataset.k]) delete s.bk[t.dataset.k];
    else s.bk[t.dataset.k] = true;
    save();
    drawSheet();
  },
  /* show all the moves of the second group, or the first ones */
  cbstkall: () => {
    if (!W || W.kind !== "cb") return;
    W.all = !W.all;
    drawSheet();
  },
});
kitTerms({
  cbbackups: [
    "Backups in place",
    "Each way to shrink your number counts on something going right. Its backup is what you fall back on if it does not: counting only part of Social Security, keeping your needs small enough to bend, a pension estimate in writing. The meter shows how many of the ways you counted have their backup in place. It is there to show you, not to grade you. A backup never makes What it could be smaller, and What it is, the 25 times number, stays as the floor under all of it.",
  ],
});
