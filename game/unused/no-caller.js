/* ============================================================================
   SLAM the Game: unused/no-caller.js
   PURPOSE     Keep five functions that nothing in the game calls. The game does not load this file.
   INPUT       Nothing.
   OUTPUT      Nothing.
   DEPENDS ON  Nothing.
   RULES       Do not add new code here. Each function has a note with the file that it came from.
               To put a function back: move it to the file in its note, then run "npm run test:game".
   SOURCE      Moved out of the game files on 2026-11-22 (KNOWN-WEAK.md, section D).
   ========================================================================= */

/* From ask.js. */
function askNoneOk(c, k) {
  return !!(c.x && c.x.none && c.x.none[k]);
}

/* From compare.js. */
function cpAge(c, mo) {
  return mo == null ? null : Math.round((c.age + mo / 12) * 10) / 10;
}

/* From ux.js. */
function freeLine(c, d) {
  if (G.demo) return "";
  const f = freeToSpend(c, d),
    tight = f.free <= 0 || f.short > 0;
  return `<button class="rowbtn keep freeline" data-a="safe"><span><span class="tiny muted">Free to spend</span><div><b data-fid="v:freewk">${tight ? "Nothing free right now" : money(f.week) + " a week"}</b> <span class="pill ${tight ? "warn" : ""}">${tight ? "Tight" : f.real ? "Close" : "Guess"}</span></div><div class="tiny muted">${tight ? "Tap to see what a spend would move." : money(f.free) + " a month after bills and goals. Tap to check a purchase."}</div></span><span>›</span></button>`;
}

/* From ui.js. */
function moveSheet() {
  const w = W,
    o = w.o,
    c = C();
  if (!o.t)
    return (
      head("Log a money move", "What happened?") +
      `<div class="stack">${Object.keys(MOVE_T)
        .map(
          k =>
            `<button class="rowbtn" data-a="mvtype" data-v="${k}"><span>${MOVE_T[k]}</span><span class="caret">›</span></button>`
        )
        .join("")}</div>`
    );
  const rs = moveRows(c, o.t),
    lab = {
      paid: "Which debt?",
      extra: "Where did it land?",
      saved: "Where did you put it?",
      cost: "Where did it come from?",
    }[o.t];
  if (!rs.length)
    return (
      head("Log a money move", MOVE_T[o.t]) +
      `<div class="small">${o.t === "paid" ? "You have no debts listed. Add one under Money first." : "Add an account under Money first."}</div><button class="primary wide" data-a="tab" data-v="money">Open Money</button>`
    );
  return (
    head("Log a money move" + (MQ.length ? " · " + MQ.length + " more after this" : ""), MOVE_T[o.t]) +
    q(
      lab,
      `<div class="stack">${rs.map(r => `<button class="rowbtn ${o.row === r.key ? "sel" : ""}" data-a="set" data-k="row" data-v="${r.key}"><span>${esc(r.k)}</span><b>${money(r.amt)}</b></button>`).join("")}</div>`
    ) +
    numq("amt", "How much?", "") +
    (w.err ? `<div class="err">${w.err}</div>` : "") +
    `<button class="primary wide go" data-a="mvsave">Log it</button>`
  );
}

/* From ui.js. */
function payOrder(c, d) {
  return W && W.o && W.o.ord ? W.o.ord : BUCKETS;
}
