/* ============================================================================
   SLAM the Game: features/feel.js
   PURPOSE     Game feel (run Finish everything partly built, Part 20). (1) Start at the finish line:
               what you need once work is optional, by when, and back to what today has to look like
               (the web page end.html, ported on the same engine). (2) The bottleneck finder: the eight
               kinds of thing in the way (money, time, energy, skill, knowledge, people, fear, rules),
               ranked from your numbers and your taps, each with "Is this really it?"; the call and
               each answer go to the judge of Quest mode. (3) The rival race: your past self from your
               own snapshots, and a typical path on the country's saving rate. Never a real person.
               (4) Made-up composite stories, labeled as such. (5) Every answer shows what it unlocked:
               a slim strip at the top of the open sheet when an answer moved a number, made by the one
               receipt of receipt.js.
   INPUT       The profile: c.take, c.spend, c.inv, c.hist, c.caught, c.x.gfend (the finish-line answers,
               { v, cf } by kitAsk), c.x.gf (the bottleneck taps and pick). derive(c), goalSim(c) (left over
               a month). PE_PRIORS (the saving rate row). The open sheet (W.kind): fline, bneck.
   OUTPUT      Math (compositions of the engines): gflEnd, bnFacts, bnRead, bnCall, gfTypicalRival.
               Views: flineSheet, bneckSheet, bnWhy, rivalPastPart (part of rivalCard in ui.js),
               gfStoriesPart (part of the People tab of What if in ui.js), sheetRippleStart (part of
               sheet() in ui.js), sheetRippleRow (part of drawSheetBase() in ui.js), bnQuestCall (part of
               qgCalls in quest.js). Actions (ACT): fline, gfper, gfpersure, bneck, bntap, bnreal, bnpick, bnauto. Menu:
               "Start at the finish line", "What's in the way".
   DEPENDS ON  core/feel.js (gfBackwards, gfPastSelf, gfBottleneck, gfStories, GF_*), core/peers.js
               (PE_PRIORS, peRow), core/engine.js (derive, goalSim, BLOCKS, BLOCK_STEP, RIVALS), core/quest.js
               (qsJudgeAdd), features/quest.js (qgSt), features/receipt.js (rcpNums, rcpDiff, rcpTeaser,
               rcpHtml), features/results.js (rsFire), features/kit.js (kitAsk, kitValue, kitPill, kitMenu),
               screens/dash.js (dkCaption, dkStatRow, dkTile, dkCard, dkPill), screens/ui.js (money, esc,
               head, mathBox, signed, save, drawSheet, todayISO).
   RULES       The math is in core/feel.js. A number from a value you did not give is a Guess. The
               ranking never overrules your own "Is this really it?" answer. No verdict words: a slower
               stretch is "Recalculating". Stories are made up and say so on screen.
   STORED      c.x.gfend = { per, need, years } as { v, cf } (kitAsk). c.x.gf = { taps: { kind: v }, pick }.
               The judge's record: c.x.qs.log (features/quest.js), entries with id "bottleneck".
   ========================================================================= */
const GFL_SURE = ["", "Guess", "Close", "Exact"];
const GFL_PER = [
  ["month", "A month"],
  ["year", "A year"],
  ["total", "A total"],
];
/* The bottleneck state of the profile. */
function gflX(c) {
  c.x = c.x || {};
  const X = (c.x.gf = c.x.gf || {});
  X.taps = X.taps || {};
  if (X.pick === undefined) X.pick = null;
  return X;
}
/* The quick picks of the need, by how you say it. */
function gflPicks(per) {
  if (per === "year") return GF_NEED_MONTH.map(v => [v * 12, money(v * 12)]);
  if (per === "total") return [500000, 750000, 1000000, 1500000, 2000000, 3000000].map(v => [v, money(v)]);
  return GF_NEED_MONTH.map(v => [v, money(v)]);
}
/* The finish line on your numbers: your answers (or a Guess: what you spend today, 15 years), what you have invested,
   what comes in and goes out. B is gfBackwards of core/feel.js, the same function as end.html of the web app. */
function gflEnd(c) {
  const per = kitValue(c, "gfend", "per", "month"),
    need = kitValue(c, "gfend", "need", per.v === "month" && c.spend > 0 ? c.spend : null),
    yrs = kitValue(c, "gfend", "years", 15),
    st = x => (x.given ? GFL_SURE[x.cf] || "Close" : "Guess");
  const B = gfBackwards({
    need: need.v,
    per: per.v,
    years: yrs.v,
    have: c.inv == null ? null : c.inv,
    takeHome: c.take == null ? null : c.take,
    spending: c.spend == null ? null : c.spend,
    wr: GF_PRESETS.withdrawalRate,
    r: GF_PRESETS.realReturn,
  });
  return { B, per: per.v, need, yrs, st: { need: st(need), years: st(yrs) }, guess: !need.given || !yrs.given };
}
/* What your numbers say about the bottleneck. */
function bnFacts(c) {
  let left = null;
  try {
    left = goalSim(c).M;
  } catch (e) {
    report(e, "feel.js: bnFacts");
  }
  const E = gflEnd(c),
    B = E.B,
    sc = c.caught && c.caught.score;
  return {
    left,
    need: B.step >= 4 ? B.needed : null,
    late: B.step === 5 ? !B.onTrack && (B.onPaceYear == null || B.onPaceYear > B.byYear) : null,
    rules: sc === "Under 580" || sc === "580 to 669" ? true : null,
  };
}
function bnRead(c) {
  const X = gflX(c);
  return gfBottleneck({ facts: bnFacts(c), taps: X.taps, pick: X.pick });
}
/* One reason, in words. */
function bnWhy(w) {
  if (w.k === "left0") return "Your numbers: nothing is left over each month (" + money(w.left) + ").";
  if (w.k === "short")
    return (
      "Your numbers: " + money(w.left) + " left over a month, and the finish line needs " + money(w.need) + " a month."
    );
  if (w.k === "late") return "Your numbers: at today's pace the finish line lands after the year you picked.";
  if (w.k === "rules") return "Your numbers: the credit score band you gave is one a lender reads.";
  if (w.k === "tap") return "You said: " + (w.v === "yes" ? "Yes" : w.v === "some" ? "A little" : "No") + ".";
  return "";
}
/* Part of qgCalls() in quest.js: the bottleneck call for the judge. Null until there is a call. */
function bnQuestCall(c) {
  try {
    const R = bnRead(c);
    if (!R.ready) return null;
    const row = R.ranked.find(x => x.id === R.top);
    return {
      id: "bottleneck",
      label: "What is in the way",
      said: BLOCKS[R.top][0],
      evidence: R.picked ? ["You picked it with Is this really it?"] : row.why.map(bnWhy),
      change: 'Your answer to "Is this really it?" counts as evidence and moves the call.',
    };
  } catch (e) {
    report(e, "feel.js: bnQuestCall");
    return null;
  }
}
/* Keep one answer to the judge: the same record as the challenges of Quest mode. */
function bnJudge(c, tap, why) {
  const call = bnQuestCall(c);
  if (!call || typeof qgSt !== "function") return;
  const s = qgSt(c);
  s.log = qsJudgeAdd(s.log, call, tap, why, new Date().toISOString());
}
/* The typical path in the rival race: the country's personal saving rate (BEA, data/priors-2026.json) as a rival of
   rivalState() in engine.js. Not a person. Null when the row is missing. */
function gfTypicalRival() {
  try {
    const R = typeof PE_PRIORS !== "undefined" ? peRow(PE_PRIORS.rows, "savingRate") : null,
      row = R && R.row;
    if (!row || !(row.share > 0)) return null;
    const src = PE_PRIORS.sources[row.source] || {};
    return {
      n: "A typical path",
      r: row.share,
      d:
        "Not a person: the country's saving rate, " +
        Math.round(row.share * 1000) / 10 +
        "% of take-home (" +
        (src.publisher || "") +
        ", " +
        (row.period || row.year) +
        ").",
    };
  } catch (e) {
    report(e, "feel.js: gfTypicalRival");
    return null;
  }
}
if (typeof RIVALS !== "undefined" && !RIVALS.typical) {
  const T = gfTypicalRival();
  if (T) RIVALS.typical = T;
}

/* ---------- views ---------- */
function flineSheet() {
  const c = C(),
    E = gflEnd(c),
    B = E.B,
    g = E.guess ? "guess" : "";
  let res = "";
  if (B.step >= 4) {
    const big = B.alreadyThere
      ? "You are already there"
      : B.growsThere
        ? "It grows there on its own"
        : money(B.needed) + " a month";
    const line = B.alreadyThere
      ? "What you have covers " + money(B.aMonth) + " a month from here on."
      : B.growsThere
        ? "Left alone, what you have grows to about " + money(B.grown) + " by " + B.byYear + "."
        : B.step === 5
          ? B.onTrack
            ? "You have " + money(B.left) + " a month left over. That covers it, with " + money(-B.gap) + " to spare."
            : "You have " + money(B.left) + " a month left over. The gap is " + money(B.gap) + " a month."
          : "Your take-home and spending show whether today covers it.";
    const ways =
      B.step === 5 && !B.alreadyThere && !B.growsThere
        ? `<div class="stack" style="gap:6px">${[
            [
              "At today's pace",
              B.onPaceYear != null ? "About " + B.onPaceYear : "No date yet",
              B.onPaceYear != null
                ? "Putting in the " + money(Math.max(0, B.left)) + " you have left over"
                : "Nothing is left over to put in yet",
            ],
          ]
            .concat(
              B.onTrack
                ? []
                : [
                    [
                      "Close it by spending",
                      money(B.spendToClose) + " a month",
                      "Spending less also lowers what you need later",
                    ],
                    ["Or close it by earning", money(B.earnToClose) + " a month", "Take-home pay that would cover it"],
                    ["Or give it more time", "Tap a later year", "Watch the number fall"],
                  ]
            )
            .map(
              r =>
                `<div class="row between tile" style="gap:8px"><span class="small"><b>${esc(r[0])}</b><div class="tiny muted">${esc(r[2])}</div></span><b class="small ${g}">${esc(r[1])}</b></div>`
            )
            .join("")}</div>`
        : "";
    res = dkCard(
      "Working backwards, here is today",
      `<div class="big ${g}" data-fid="gf:need" style="font-size:28px">${esc(big)}</div>${B.alreadyThere || B.growsThere ? "" : `<div class="tiny muted">To have ${money(B.total)} by ${B.byYear}, you put in this much.</div>`}<div class="small"><b>${esc(line)}</b></div>${ways}`,
      { right: kitPill(E.guess ? "Guess" : "Close") }
    );
  }
  const more =
    B.step === 5 && !B.onTrack && !B.alreadyThere && !B.growsThere
      ? `<button class="ghost wide" data-a="hunt">Close a little of it: the first ${money(PL_HUNT_GOAL)} bonus hunt</button>`
      : "";
  return (
    head("Plan", "Start at the finish line") +
    dkCaption("Begin with the end. Say what you need, then when, and work back to today.") +
    dkStatRow([
      dkTile("Invested at the end", B.step >= 2 ? money(B.total) : "–", {
        sub: B.step >= 2 ? "pays " + money(B.aMonth) + " a month" : "tap what you need",
        guess: E.st.need === "Guess",
      }),
      dkTile("By", B.step >= 3 ? String(B.byYear) : "–", {
        sub: B.step >= 3 ? B.years + " years" : "tap a year",
        guess: E.st.years === "Guess",
      }),
      dkTile("You are", B.step >= 4 ? Math.round(B.share * 100) + "% there" : "–", {
        sub: B.step >= 4 ? money(B.have) + " invested" : "needs what you have",
      }),
      dkTile("Left over now", B.step === 5 ? money(B.left) : "–", {
        sub: B.step === 5 ? "a month" : "needs pay and spending",
      }),
    ]) +
    dkCard(
      "1. What you need, once work is optional",
      kitAsk(c, "gfend", "per", "Say it as", GFL_PER, "month", { act: "gfper" }) +
        kitAsk(
          c,
          "gfend",
          "need",
          E.per === "total"
            ? "The total you want invested"
            : "What you need " + (E.per === "year" ? "a year" : "a month"),
          gflPicks(E.per),
          E.need.v == null ? "" : E.need.v,
          {
            typed: true,
            help: "In today's dollars. Until you tap one, the game uses what you spend today, as a Guess.",
          }
        )
    ) +
    dkCard(
      "2. By when",
      kitAsk(
        c,
        "gfend",
        "years",
        "In how many years",
        GF_WHEN_YEARS.map(y => [y, y + " years"]),
        15,
        { help: "Until you tap one, the game uses 15 years, as a Guess." }
      )
    ) +
    dkCard(
      "3 and 4. What you have, what comes in and goes out",
      `<div class="small">${money(c.inv || 0)} invested, ${money(c.take || 0)} take-home and ${money(c.spend || 0)} spending a month, from your Key numbers.</div><button class="ghost slim" data-a="tab" data-v="money">Change them in My money</button>`
    ) +
    res +
    more +
    `<button class="primary wide" data-a="bneck">What's in the way of it?</button>` +
    mathBox([
      "What you need a year divided by " +
        Math.round(B.withdrawalRate * 1000) / 10 +
        "% (the share you can take out each year) is what has to be invested.",
      "Growth of " +
        Math.round(B.realReturn * 1000) / 10 +
        "% a year after inflation, month by month, the same as the web app's Start at the finish line.",
      "A month to put in: the level amount that grows what you have to the total by the year you picked.",
      "In today's dollars. Tax on what you take out later is not counted here.",
    ])
  );
}
function bneckSheet() {
  const c = C(),
    X = gflX(c),
    R = bnRead(c),
    F = bnFacts(c),
    w = W || {},
    top = R.top,
    row = top ? R.ranked.find(x => x.id === top) : null;
  let call = "";
  if (top) {
    const others = GF_KINDS.filter(k => k !== top);
    call = dkCard(
      "Your bottleneck",
      `<h2 data-fid="gf:bn" style="margin:0">${esc(BLOCKS[top][0])}</h2><div class="small">${esc(BLOCKS[top][1])}</div>` +
        (R.picked
          ? `<div class="tiny muted">You picked it with Is this really it?</div>`
          : row.why.map(x => `<div class="tiny muted">${esc(bnWhy(x))}</div>`).join("")) +
        `<div class="small"><b>First move:</b> ${esc(BLOCK_STEP[top])}</div>` +
        `<details class="math" ${w.real ? "open" : ""}><summary>Is this really it?</summary><div class="inner stack" style="gap:8px"><div class="small">${esc(GF_REAL[top])}</div><div class="tiny muted">Your answer counts as evidence, and the judge in Quest mode keeps it.</div><div class="grid2"><button class="ghost wide" data-a="bnreal" data-v="yes">Yes, that is it</button><button class="ghost wide" data-a="bnreal" data-v="no">No, something else</button></div>${
          w.real === "no"
            ? `<div class="tiny muted">More like</div><div class="chips">${others.map(k => `<button class="chip" data-a="bnpick" data-v="${k}">${esc(BLOCKS[k][0])}</button>`).join("")}</div>`
            : ""
        }${X.pick ? `<button class="ghost wide slim" data-a="bnauto">Let the game decide again</button>` : ""}</div></details>` +
        (top === "money"
          ? `<button class="ghost wide" data-a="hunt">A quick win: the first ${money(PL_HUNT_GOAL)} bonus hunt</button>`
          : "")
    );
  } else
    call = dkCard(
      "Your bottleneck",
      `<div class="small">Answer a few of the checks below. Your numbers do the rest.</div>`
    );
  const checks = dkCard(
    "The eight checks",
    GF_KINDS.map(
      k =>
        `<div class="field"><div class="row between" style="gap:8px"><span class="small"><b>${esc(BLOCKS[k][0])}</b></span>${X.taps[k] ? dkPill("Answered") : ""}</div><div class="tiny muted">${esc(GF_CHECKS[k])}</div><div class="chips">${GF_TAPS.map(t => `<button class="chip ${X.taps[k] === t[0] ? "on" : ""}" data-a="bntap" data-k="${k}" data-v="${t[0]}">${t[1]}</button>`).join("")}</div></div>`
    ).join(""),
    { cap: "Tap what fits. A tap again on the same answer clears it." }
  );
  const st = gfStories(top, 1)[0];
  const story = st
    ? dkCard(
        "Someone who got past it",
        `<div class="row wrap" style="gap:6px">${dkPill("Made-up story")}</div><b class="small">${esc(st.name)}: ${esc(st.title)}</b><div class="small">${esc(st.story)}</div><div class="tiny muted">${esc(GF_STORY_LABEL)}</div>`
      )
    : "";
  return (
    head("Plan", "What's in the way") +
    dkCaption("Eight kinds of thing can hold a plan up. Find yours, then test it.") +
    dkStatRow([
      dkTile("The bottleneck", top ? esc(BLOCKS[top][0]) : "–", { sub: top ? "for now" : "tap a check" }),
      dkTile("Left over a month", F.left == null ? "–" : money(F.left), { sub: "from your numbers" }),
      dkTile("Checks answered", R.asked + " of " + R.of, { sub: "taps, no typing" }),
    ]) +
    call +
    checks +
    story +
    `<button class="ghost wide" data-a="fline">Start at the finish line</button>` +
    mathBox([
      "From your numbers: nothing left over each month counts " +
        GF_RULES.bn.left0 +
        " points for Money; less left over than the finish line needs counts " +
        GF_RULES.bn.short +
        ".",
      "A finish line that lands after the year you picked counts " +
        GF_RULES.bn.late +
        " for Time. A low credit score band counts " +
        GF_RULES.bn.rules +
        " for Rules.",
      "Each tap: Yes " + GF_RULES.bn.yes + ", A little " + GF_RULES.bn.some + ", No takes 1 away.",
      "The most points is the call; a tie goes to the kind higher on the list. Your answer to Is this really it? always wins.",
    ])
  );
}
/* Part of rivalCard() in ui.js: your past self in the race, from your own snapshots. */
function rivalPastPart(c, d) {
  try {
    const P = gfPastSelf(c.hist || [], todayISO(), d.nw);
    if (!P.ready)
      return `<div class="tile" style="margin-top:8px"><div class="eyebrow">Past you · the rival who knows your life</div><div class="small" style="margin-top:4px">Past you joins the race in ${P.daysToGo == null ? "a few" : P.daysToGo} day${P.daysToGo === 1 ? "" : "s"}, once your saved check-ins cover two stretches of ${P.win} days.</div></div>`;
    const say =
      P.lead === "tie"
        ? "Neck and neck with past you."
        : P.lead === "now"
          ? "You are moving " + money(P.gap) + " a month faster than past you."
          : "Recalculating: past you moved " + money(-P.gap) + " a month faster. One good month brings you level.";
    return `<div class="tile" style="margin-top:8px" data-fid="gf:past"><div class="eyebrow">Past you · the rival who knows your life</div><div class="grid2" style="margin-top:8px"><div class="tile"><div class="tiny muted">You, the last ${P.now.days} days</div><div class="big">${signed(P.now.pace)}</div><div class="tiny muted">a month</div></div><div class="tile"><div class="tiny muted">Past you, the ${P.then.days} days before</div><div class="big">${signed(P.then.pace)}</div><div class="tiny muted">a month</div></div></div><div class="small" style="margin-top:6px">${esc(say)}</div>${mathBox(["Your net worth on your saved check-ins: " + money(P.then.gain + P.now.gain) + " moved since " + P.then.from + ".", "Each pace is the change in net worth divided by the days, times " + GF_RULES.month + " days.", "Never a real person: both sides are you."])}</div>`;
  } catch (e) {
    report(e, "feel.js: rivalPastPart");
    return "";
  }
}
/* Part of the People tab of What if (ui.js): the made-up composite stories, first the one for your bottleneck. */
function gfStoriesPart(c) {
  try {
    const R = bnRead(c);
    return (
      `<div class="tile stack" style="gap:6px"><div class="row wrap" style="gap:6px">${dkPill("Made-up stories")}</div><div class="small">${esc(GF_STORY_LABEL)}</div></div>` +
      gfStories(R.top, 3)
        .map(
          s =>
            `<div class="tile stack" style="gap:4px"><b class="small">${esc(s.name)}: ${esc(s.title)}</b><div class="tiny muted">Stuck on: ${esc(BLOCKS[s.kind][0])}</div><div class="small">${esc(s.story)}</div><div class="tiny"><b>The move:</b> ${esc(s.move)}</div></div>`
        )
        .join("") +
      `<button class="ghost wide slim" data-a="bneck">Find what is in the way for you</button>`
    );
  } catch (e) {
    report(e, "feel.js: gfStoriesPart");
    return "";
  }
}

/* ---------- every answer shows what it unlocked ---------- */
let GFR_BASE = null,
  GFR_MEMO = null;
/* Part of sheet() in ui.js: a sheet that opens (with no sheet open, or a different sheet in its place) keeps the
   profile as it is now. A redraw of the same sheet keeps the profile it opened with. */
function sheetRippleStart(was) {
  try {
    if (was && GFR_BASE && GFR_BASE.fn === SH) return;
    const c = C();
    GFR_BASE = c ? { at: G.active, fn: SH, json: JSON.stringify(c) } : null;
  } catch (e) {
    report(e, "feel.js: sheetRippleStart");
  }
}
/* Part of drawSheetBase() in ui.js: when an answer in this sheet moved a number, a slim strip at the top says what it
   moved and what it unlocked, with the one receipt of receipt.js. html: the sheet; a sheet with its own receipt is left
   alone. Not during setup, which shows its own level change. */
function sheetRippleRow(html) {
  try {
    const c = C();
    if (!c || !c.placed || !GFR_BASE || GFR_BASE.at !== G.active || String(html).indexOf("rcp:card") >= 0) return "";
    const now = JSON.stringify(c),
      key = GFR_BASE.json + "|" + now;
    if (now === GFR_BASE.json) return "";
    if (!GFR_MEMO || GFR_MEMO.key !== key) {
      const a = JSON.parse(GFR_BASE.json),
        lines = rcpDiff(rcpNums(a), rcpNums(c), rsFire(c)),
        t0 = rcpTeaser(a),
        t1 = rcpTeaser(c);
      if (t0 && t1 && t1.era === t0.era && t1.done > t0.done)
        lines.push({
          k: "unl",
          label: "Unlocked",
          txt: "Unlocked a step: " + t1.txt,
          up: true,
          math: "The steps of " + t1.n + " done: " + t0.done + " before, " + t1.done + " now.",
        });
      GFR_MEMO = { key, lines };
    }
    const L = GFR_MEMO.lines;
    if (!L.length) return "";
    return `<div class="gfrip" data-fid="gf:rip"><div class="tiny muted">What this answer moved</div>${rcpHtml({ lines: L, teaser: null, next: null })}</div>`;
  } catch (e) {
    report(e, "feel.js: sheetRippleRow");
    return "";
  }
}
/* Part of qgCalls() in quest.js is bnQuestCall (above). */

Object.assign(ACT, {
  fline: () => {
    W = { kind: "fline" };
    sheet(flineSheet);
  },
  gfper: t => {
    const c = C(),
      S = kitStore(c, "gfend"),
      was = S.per && S.per.v;
    kitApply(t);
    if (S.per && S.per.v !== was) delete S.need;
    kitRedraw();
  },
  gfpersure: t => {
    kitApplySure(t);
    kitRedraw();
  },
  bneck: () => {
    W = { kind: "bneck", real: null };
    sheet(bneckSheet);
  },
  bntap: t => {
    const c = C(),
      X = gflX(c),
      k = t.dataset.k,
      v = t.dataset.v;
    if (!GF_KINDS.includes(k) || !["yes", "some", "no"].includes(v)) return;
    if (X.taps[k] === v) delete X.taps[k];
    else X.taps[k] = v;
    save();
    drawSheet();
  },
  bnreal: t => {
    const c = C(),
      v = t.dataset.v;
    if (v === "yes") {
      bnJudge(c, "fits", "You said " + (bnRead(c).top ? BLOCKS[bnRead(c).top][0] : "it") + " is it");
      if (W) W.real = "yes";
      save();
    } else if (W) W.real = "no";
    drawSheet();
  },
  bnpick: t => {
    const c = C(),
      X = gflX(c),
      k = t.dataset.v,
      was = bnRead(c).top;
    if (!GF_KINDS.includes(k)) return;
    bnJudge(c, "not", "You said " + BLOCKS[k][0] + " fits better than " + (was ? BLOCKS[was][0] : "the call"));
    X.pick = k;
    if (W) W.real = null;
    save();
    drawSheet();
  },
  bnauto: () => {
    gflX(C()).pick = null;
    if (W) W.real = null;
    save();
    drawSheet();
  },
});
kitMenu("Start at the finish line", "fline", "What you need at the end, worked back to today", "qmode");
kitMenu("What's in the way", "bneck", "The bottleneck finder: eight kinds, and Is this really it?", "fline");
