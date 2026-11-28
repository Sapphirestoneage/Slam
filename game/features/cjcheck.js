/* ============================================================================
   SLAM the Game: features/cjcheck.js
   PURPOSE     The Confidence and Joy check (run CC-1, item 18, Nov 28 2026), and what it adds to Your
               year (item 19). Two tap scales, 1 to 10: how sure you feel about your money, and how
               much joy your spending brings. One slim line on Home asks at the start (after the
               result of the opening, never before the first number) and then each month. The sheet
               shows the before and the after. Your year gets three lines: the money wins of the
               year, the change of the two scales, and the time ledger.
   INPUT       The profile: c.x.cj (the log and the day of "Later"), c.x.conf (the rating of the ratio
               Financial confidence: the same tap), c.wins, c.hist. derive(c), timeLedger(c, d),
               lookBack(c, d) of features/year.js. The open sheet (W.kind): cj.
   OUTPUT      Math: cjLog, cjSet, cjRead, cjBook, cjYearRead. Views: cjSheet, cjScale. Parts of
               functions in other files: homeCjNote (homeQuadTop in ux.js), wrappedMore
               (wrappedSheetBase in ui.js), cjFromRating (the action raconf in ratios.js). Actions
               (ACT): cj, cjset, cjlater. Menu: "Confidence and joy check".
   DEPENDS ON  core/cjcore.js (the math), core/report.js, core/engine.js (derive, timeLedger, todayISO),
               screens/ui.js (head, mathBox, ib, esc, money, save, sheet, drawSheet), screens/dash.js
               (dkCaption, dkCard, dkSpark, dkPill), features/kit.js (kitTerms, kitScreen, kitMenu,
               kitInfo), features/year.js (lookBack), features/cofill.js (cfCoach).
   RULES       The math is in core/cjcore.js. A lower number is shown plainly and is never judged. A
               scale with no tap is "no tap yet", never a 0. The check is never a blocking screen:
               "Later" puts the line away for a week, and "I'm not sure" leaves a scale open. One
               stored place: each tap goes through cjSet. The confidence tap is the same value as the
               rating of the ratio Financial confidence (c.x.conf), and cjSet writes both.
   COMPAT      One optional key: c.x.cj (core/cjcore.js). An old saved game has none.
   ========================================================================= */
kitTerms({
  cjconf: [
    "Confidence",
    "Your own tap, 1 to 10: how sure you feel about your money today. 1 is not sure at all, 10 is very sure. It is a feeling, so no number is the right one.",
  ],
  cjjoy: [
    "Joy",
    "Your own tap, 1 to 10: how much joy your spending brings you these days. 1 is very little, 10 is a lot. It is a feeling, so no number is the right one.",
  ],
  cjcheck: [
    "Confidence and joy check",
    "Two taps, once a month. The game keeps each check with its day, so you can see where you started and where you are now.",
  ],
});
kitScreen(
  "cj",
  "Confidence and joy",
  "Two taps, 1 to 10: how sure you feel about your money, and how much joy your spending brings.",
  "Once a month. You see where you started and where you are now."
);
const CJ_Q = [
  {
    k: "c",
    term: "cjconf",
    n: "Confidence",
    q: "How sure do you feel about your money today?",
    lo: "not sure at all",
    hi: "very sure",
  },
  {
    k: "j",
    term: "cjjoy",
    n: "Joy",
    q: "How much joy does your spending bring you these days?",
    lo: "very little",
    hi: "a lot",
  },
];
/* The log of the open profile. An older confidence rating (c.x.conf) with no check yet counts as the first check. */
function cjLog(c) {
  const X = (c && c.x) || {},
    L = cjClean(X.cj && X.cj.log);
  if (X.conf && X.conf.d && !L.some(e => e.c !== null)) return cjUpsert(L, X.conf.d, "c", X.conf.v);
  return L;
}
/* THE ONE WRITER. k: "c" or "j". v: 1 to 10, or null to clear the tap of today. */
function cjSet(c, k, v, today) {
  today = today || todayISO();
  c.x = c.x || {};
  const J = (c.x.cj = c.x.cj || { log: [] });
  J.log = cjUpsert(cjLog(c), today, k, v);
  if (k === "c") c.x.conf = Number.isInteger(v) ? { v, d: today } : null;
  delete J.later;
}
/* Part of the action raconf in ratios.js: the rating that was tapped there is the confidence of today's check. */
function cjFromRating(c) {
  try {
    const r = c.x && c.x.conf;
    cjSet(c, "c", r ? r.v : null, todayISO());
  } catch (e) {
    report(e, "cjcheck.js: cjFromRating");
  }
}
/* Everything the sheet and the line on Home show. */
function cjRead(c, today) {
  today = today || todayISO();
  const L = cjLog(c),
    now = L.find(e => e.d === today) || null;
  return {
    log: L,
    today: now,
    due: cjDue(L, today, c.x && c.x.cj && c.x.cj.later),
    conf: cjChange(L, "c"),
    joy: cjChange(L, "j"),
  };
}
/* The rows of the plan's spreadsheet (features/book.js). */
function cjBook(c) {
  const R = cjRead(c),
    rows = [];
  [
    ["conf", "Confidence", R.conf],
    ["joy", "Joy", R.joy],
  ].forEach(([id, n, P]) => {
    if (!P) return;
    rows.push({ id: "cj_" + id + "0", label: n + " at the first check (1 to 10)", v: P.first.v, note: P.first.d });
    if (P.change !== null) {
      rows.push({ id: "cj_" + id + "1", label: n + " at the latest check (1 to 10)", v: P.last.v, note: P.last.d });
      rows.push({
        id: "cj_" + id + "d",
        label: n + ": the change",
        v: P.change,
        f: "={cj_" + id + "1}-{cj_" + id + "0}",
      });
    }
  });
  return { title: "Confidence and joy check", rows };
}
const cjDate = s => (typeof dfmt === "function" ? dfmt(s) : s);
/* One scale: the question, ten chips, "I'm not sure", and the helper line under them. */
function cjScale(Q, cur) {
  return `<div class="stack cjscale" style="gap:6px" data-cj="${Q.k}"><div class="row between" style="gap:8px"><b class="small">${esc(Q.q)}</b>${kitInfo(Q.term)}</div><div class="row cjchips" style="gap:6px;flex-wrap:wrap" role="group" aria-label="${esc(Q.n)}, 1 to 10">${Array.from(
    { length: CJ_MAX },
    (x, i) => i + 1
  )
    .map(
      v =>
        `<button class="chip ${cur === v ? "on" : ""}" style="min-width:44px;min-height:44px" data-a="cjset" data-k="${Q.k}" data-v="${v}" aria-pressed="${cur === v}">${v}</button>`
    )
    .join(
      ""
    )}<button class="chip" style="min-height:44px" data-a="cjset" data-k="${Q.k}" data-v="ns" aria-pressed="false">${esc(typeof NOT_SURE === "string" ? NOT_SURE : "I'm not sure")}</button></div><div class="tiny muted">1 is ${esc(Q.lo)}. 10 is ${esc(Q.hi)}.${cur ? " Your tap today: " + cur + "." : ""}</div></div>`;
}
/* Before and after, for one scale. Plain numbers: no word says if a change is good. */
function cjPair(Q, P) {
  if (!P)
    return `<div class="tile small" data-cjp="${Q.k}"><b>${esc(Q.n)}</b><div class="muted">No tap yet.</div></div>`;
  const two = P.change !== null;
  return `<div class="tile small stack" style="gap:4px" data-cjp="${Q.k}"><div class="row between" style="gap:8px"><b>${esc(Q.n)}</b>${two && P.vals.length > 2 ? dkSpark(P.vals) : ""}</div><div>${
    two
      ? `<b>${P.first.v}</b> at the start <span class="muted">(${esc(cjDate(P.first.d))})</span>, <b>${P.last.v}</b> now <span class="muted">(${esc(cjDate(P.last.d))})</span>.`
      : `<b>${P.first.v}</b> at your first check <span class="muted">(${esc(cjDate(P.first.d))})</span>. The after shows at your next check.`
  }</div>${two ? `<div class="tiny muted">${P.change === 0 ? "The same as at the start." : (P.change > 0 ? "Up " : "Down ") + Math.abs(P.change) + (Math.abs(P.change) === 1 ? " point" : " points") + " since the start."} ${P.n} checks so far.</div>` : ""}</div>`;
}
function cjSheet() {
  const c = C(),
    R = cjRead(c),
    t = R.today || {};
  return (
    head("Me", "Confidence and joy") +
    dkCaption("Two taps, once a month. Your own record of how money feels.") +
    `<div class="card stack" style="gap:14px" data-fid="cj:ask">${CJ_Q.map(Q => cjScale(Q, t[Q.k] || null)).join("")}${
      R.today
        ? `<div class="banner small" role="status" data-fid="cj:saved"><b>Saved for today.</b> Tap a number again to change it. The next check is on or after ${esc(cjDate(cjDue(R.log, todayISO()).next))}.</div>`
        : `<div class="tiny muted">Each tap saves by itself. You can skip one: "${esc(typeof NOT_SURE === "string" ? NOT_SURE : "I'm not sure")}" leaves it open.</div>`
    }</div>` +
    dkCard(
      "Before and after",
      `<div class="stack" style="gap:8px" data-fid="cj:pair">${CJ_Q.map(Q => cjPair(Q, Q.k === "c" ? R.conf : R.joy)).join("")}<div class="tiny muted">Up or down, this is a record of how it felt. No number here is the right one.</div></div>`,
      { right: kitInfo("cjcheck") }
    ) +
    mathBox([
      "Each check keeps your two taps with the day.",
      "The start is your first check. Now is your latest check. The change is now minus the start.",
      "A scale you did not tap stays open. It is not counted as a number.",
    ]) +
    `<button class="primary wide" data-a="close">Done</button>`
  );
}
/* Part of homeQuadTop() in ux.js. One slim line when a check is due: at the start, then each month. No pulse. It
   never shows before the first number (the profile is not set up yet), on a sample profile, or to a coach. */
function homeCjNote() {
  try {
    const c = C();
    if (!c || c.demo || !c.led || (typeof cfCoach === "function" && cfCoach())) return "";
    const R = cjRead(c);
    if (!R.due.due) return "";
    return `<div class="tile small row between cjnote" style="gap:8px;flex-wrap:wrap" data-fid="cj:home"><span style="min-width:0;flex:1 1 200px"><b>${R.due.first ? "Two taps, 1 to 10." : "Your monthly check: two taps."}</b> How sure you feel about your money, and how much joy your spending brings.</span><span class="row" style="gap:8px"><button class="ghost slim" style="min-height:44px" data-a="cj">Answer</button><button class="ghost slim" style="min-height:44px" data-a="cjlater">Later</button></span></div>`;
  } catch (e) {
    report(e, "cjcheck.js: homeCjNote");
    return "";
  }
}
/* ---------- YOUR YEAR (run CC-1, item 19) ---------- */
/* The three parts that Your year did not have. Each one is null when the game has nothing to show for it. */
function cjYearRead(c, yr, today) {
  const d = derive(c),
    wins = (c.wins || []).filter(x => String(x.d || "").slice(0, 4) === yr),
    Y = cjYear(cjLog(c), yr),
    tl = timeLedger(c, d),
    lb = typeof lookBack === "function" ? lookBack(c, d, today) : null;
  return {
    wins: wins.length
      ? {
          n: wins.length,
          once: wins.filter(x => x.kind === "once").reduce((t, x) => t + (x.amt || 0), 0),
          month: wins.filter(x => x.kind !== "once").reduce((t, x) => t + (x.amt || 0), 0),
        }
      : null,
    conf: Y.conf && Y.conf.change !== null ? Y.conf : null,
    joy: Y.joy && Y.joy.change !== null ? Y.joy : null,
    checks: Y.n,
    time:
      tl.wage > 0
        ? { wage: tl.wage, earned: lb ? lb.earned : null, hours: lb ? lb.hours : null, guess: !(tl.rw && tl.rm) }
        : null,
  };
}
/* Part of wrappedSheetBase() in ui.js. The lines under the tiles of Your year. */
function wrappedMore(c, w) {
  try {
    const Y = cjYearRead(c, w.year, todayISO()),
      line = (id, n, body, wait) =>
        `<div class="tile small" data-wr="${id}"><b>${esc(n)}</b><div${body ? "" : ' class="muted"'}>${body || esc(wait)}</div></div>`,
      two = P => `${P.first.v} at the start of the year, ${P.last.v} now`;
    return (
      `<div class="stack" style="gap:8px" data-fid="wr:more">` +
      line(
        "wins",
        "Money wins this year",
        Y.wins
          ? `${Y.wins.n} ${Y.wins.n === 1 ? "win" : "wins"}${Y.wins.once ? ": " + money(Y.wins.once) + " one time" : ""}${Y.wins.month ? (Y.wins.once ? ", and " : ": ") + money(Y.wins.month) + " a month" : ""}.`
          : "",
        "No money win logged this year yet. Find some money adds one."
      ) +
      line(
        "cj",
        "Confidence and joy",
        Y.conf || Y.joy
          ? `${Y.conf ? "Confidence: " + two(Y.conf) + ". " : ""}${Y.joy ? "Joy: " + two(Y.joy) + "." : ""}`
          : "",
        "Needs two checks in the year. You have " + Y.checks + " so far."
      ) +
      line(
        "time",
        "The time ledger",
        Y.time
          ? `An hour of your work brings home ${money(Math.round(Y.time.wage))}.${Y.time.hours != null ? " Your investments earned about " + money(Y.time.earned) + " in a year at the game's 7%, about " + Y.time.hours.toLocaleString() + " hours of work you did not have to do." : ""}${Y.time.guess ? " " + dkPill("Guess") : ""}`
          : "",
        "Needs your pay and your work hours."
      ) +
      `</div>`
    );
  } catch (e) {
    report(e, "cjcheck.js: wrappedMore");
    return "";
  }
}
Object.assign(ACT, {
  cj: () => {
    W = { kind: "cj" };
    sheet(cjSheet);
  },
  /* One tap on a scale. "ns" (I'm not sure) clears the tap of today for that scale. */
  cjset: t => {
    const c = C(),
      k = t.dataset.k,
      v = t.dataset.v === "ns" ? null : Number(t.dataset.v);
    if (k !== "c" && k !== "j") return;
    if (v !== null && !(Number.isInteger(v) && v >= CJ_MIN && v <= CJ_MAX)) return;
    cjSet(c, k, v, todayISO());
    save();
    drawSheet();
  },
  /* Later: the line on Home stays away for a week. */
  cjlater: () => {
    const c = C();
    c.x = c.x || {};
    c.x.cj = c.x.cj || { log: [] };
    c.x.cj.later = todayISO();
    save();
    render();
  },
});
kitMenu(
  "Confidence and joy check",
  "cj",
  "Two taps, 1 to 10, once a month. See where you started and where you are now",
  "joy"
);
