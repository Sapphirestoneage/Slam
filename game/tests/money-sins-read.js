/* ============================================================================
   SLAM the Game, test: tests/money-sins-read.js
   PURPOSE     Examine the money sins read: the copy of core/sins.js is current, the read of a made-up
               ledger, the one-tap check-in after a logged buy (over the line, at most 3 a week,
               skippable), the push-back, Test the fix, the sheet in the new look with no cost on it,
               privacy for a coach, and the built list row.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: core/sins.js, features/sins.js, features/quizzes.js,
               screens/ui.js (the action fsave).
   ========================================================================= */
{
  const fs = require("fs"),
    path = require("path"),
    crypto = require("crypto"),
    sha = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
  const src = fs.readFileSync(path.join(GAME_DIR, "..", "js", "math", "sins.js"), "utf8"),
    copy = fs.readFileSync(path.join(GAME_DIR, "core", "sins.js"), "utf8");
  chk(
    "the read of the game is a current copy of js/math/sins.js (node tools/game_sins_build.mjs)",
    copy.includes("SOURCE-HASH  " + sha(src))
  );
  chk(
    "the sins quiz is real now: no placeholder, fifteen taps, two families",
    !qzSkin("sins").soon && qzTaps(qzSkin("sins")).max === 15 && qzSkin("sins").groups.length === 2
  );

  const t = todayISO(),
    day = n => addDays(t, -n),
    n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    a = Object.assign(newChar(), {
      name: "Sam",
      led: true,
      placed: true,
      age: 31,
      ret: 60,
      take: 4000,
      spend: 3000,
      months: 2,
      inv: 5000,
      spends: [
        { k: "Home", amt: 1400, s: true },
        { k: "Food", amt: 500, s: true },
        { k: "Getting around", amt: 300, s: true },
        { k: "Bills and subscriptions", amt: 200, s: true },
        { k: "Fun and everything else", amt: 80, s: true },
      ],
      cashes: [{ k: "Checking", amt: 6000, s: true }],
      incs: [{ k: "Job", amt: 4000, s: true }],
    });
  G.demo = false;
  G.chars.push(a);
  G.active = n0;
  save();
  go("home");
  const c = C();
  /* a made-up ledger: 40 days, a payday with three buys right after it, and eight fun buys this month */
  c.moves.push({ d: day(40), t: "in", amt: 2000, src: "Job", k: "Checking" });
  c.moves.push({ d: day(12), t: "in", amt: 2000, src: "Job", k: "Checking" });
  [12, 11, 10].forEach(n =>
    c.moves.push({ d: day(n), t: "out", amt: 15, cat: "Fun and everything else", k: "Checking" })
  );
  [9, 8, 7, 6, 5].forEach(n =>
    c.moves.push({ d: day(n), t: "out", amt: 12, cat: "Fun and everything else", k: "Checking" })
  );
  save();
  const D = sngData(c);
  chk(
    "the ledger in the plain shape: buys, paydays (logged pay and payday rounds), the plan by category",
    D.buys.length === 8 &&
      D.pays.length === 2 &&
      D.plan.fun === 80 &&
      D.plan.food === 500 &&
      D.since === day(40) &&
      D.guesses.of === 5,
    JSON.stringify(D)
  );
  const kinds = snLedgerEvidence(D, t).map(p => p.kind);
  chk(
    "the signals it supports: right after payday, eight fun buys in a month, and fun past its plan",
    kinds.includes("payday") && kinds.includes("fun") && kinds.includes("overFun"),
    kinds.join()
  );
  let N = sngRead(c).read;
  chk(
    "one source: the read leans to Lust, as an Early read with a top two",
    N.families[0].top.id === "lust" &&
      N.families[0].level === "Guess" &&
      N.families[0].word === "Early read" &&
      N.families[0].topTwo.length === 2,
    JSON.stringify(N.families[0].agree)
  );

  /* ---------- the check-in after a logged buy ---------- */
  W = { kind: "flow", o: { t: "out", amt: 80, cat: "Fun and everything else", from: "cash:0" } };
  X("fsave");
  chk(
    "a buy over the $50 line asks what was this, with the seven taps and Skip",
    W &&
      W.kind === "sncheck" &&
      ov().includes("What was this?") &&
      ov().includes("Keeping up") &&
      ov().includes('data-a="snskip"') &&
      clean(ov()),
    junk(ov())
  );
  X("sncheck", "bored");
  chk(
    "the tap is kept with its time, then the logged screen follows",
    c.x.qz.sins.sn.checks.length === 1 &&
      c.x.qz.sins.sn.checks[0].tag === "bored" &&
      /T/.test(c.x.qz.sins.sn.checks[0].at) &&
      ov().includes("Logged")
  );
  N = sngRead(c).read;
  chk(
    "two sources agree over 40 days: the label shows (Close read)",
    N.families[0].agree.join() === "ledger,checkin" &&
      N.families[0].level === "Close" &&
      N.families[0].word === "Close read",
    JSON.stringify([N.families[0].agree, N.families[0].why])
  );
  W = { kind: "flow", o: { t: "out", amt: 20, cat: "Home", from: "cash:0" } };
  X("fsave");
  chk("rent is never asked about", W === null || W.kind !== "sncheck");
  X("close");
  W = { kind: "flow", o: { t: "out", amt: 70, cat: "Food", from: "cash:0" } };
  X("fsave");
  X("snskip");
  W = { kind: "flow", o: { t: "out", amt: 70, cat: "Food", from: "cash:0" } };
  X("fsave");
  X("sncheck", "treat");
  W = { kind: "flow", o: { t: "out", amt: 90, cat: "Fun and everything else", from: "cash:0" } };
  X("fsave");
  chk(
    "three this week (two taps and a skip): the fourth is not asked",
    W === null || W.kind !== "sncheck",
    JSON.stringify(c.x.qz.sins.sn)
  );
  X("close");

  /* ---------- the sheet ---------- */
  X("sins");
  const h = ov();
  chk(
    "the read in the new look: a caption, a stat row, the two families with the light side, collapsed parts",
    W.kind === "sins" &&
      h.includes("dkcap") &&
      h.includes("dkstats") &&
      h.includes("Main pull") &&
      h.includes("Main way of refusing change") &&
      h.includes("The light side") &&
      h.includes("<summary>Why we think this</summary>") &&
      h.includes("<summary>Is this really it?</summary>") &&
      h.includes("Test the fix") &&
      h.includes("The cooling-off timer") &&
      h.includes("Mistake audit") &&
      clean(h),
    junk(h)
  );
  chk(
    "no cost of a pattern on the read: no dollar amount but the line to ask by",
    !/\$\d/.test(h.replace(/\$(25|50|100|200|500)\b/g, ""))
  );
  chk(
    "no blame word and no em dash",
    !/mistake|failed|behind|off track/i.test(h.replace(/Mistake audit/g, "")) &&
      !h.includes(String.fromCharCode(0x2014))
  );
  X("snpush", "yes", "lust");
  chk(
    "Is this really it?: Yes counts as evidence and is kept for the judge; the read is Confirmed by you",
    snJudgeLog(qzSkin("sins"), c.x.qz.sins.sn)[0].said === "yes" && sngRead(c).read.families[0].level === "Exact"
  );
  X("snfix");
  chk(
    "Test the fix: the month starts on the top's own defense",
    c.x.qz.sins.sn.fix.trait === "lust" && c.x.qz.sins.sn.fix.start === t
  );
  chk("and the sheet shows the days left", ov().includes("30 days left"));
  X("snline", "100");
  chk(
    "the line to ask by is a tap",
    c.x.qz.sins.sn.line === 100 && ov().includes('class="chip on" data-a="snline" data-v="100"')
  );

  /* ---------- privacy: a coach or an admin who opens this game ---------- */
  const ss0 = global.sessionStorage;
  global.sessionStorage = { getItem: k => (k === "su_as" ? "1" : null), setItem() {}, removeItem() {} };
  X("sins");
  chk(
    "a coach sees nothing until the player turns it on",
    ov().includes("Kept private by the player") && !ov().includes("Lust")
  );
  global.sessionStorage = ss0;
  if (ss0 === undefined) delete global.sessionStorage;
  X("sins");
  X("snshow", "1");
  global.sessionStorage = { getItem: k => (k === "su_as" ? "1" : null), setItem() {}, removeItem() {} };
  X("sins");
  chk(
    "turned on: the coach sees the read, with no button to change it and no line to set",
    ov().includes("Main pull") &&
      !ov().includes('data-a="snpush"') &&
      !ov().includes('data-a="snline"') &&
      !ov().includes('data-a="snfix"')
  );
  global.sessionStorage = ss0;
  if (ss0 === undefined) delete global.sessionStorage;
  chk(
    "the quiz card has the row to the read",
    (() => {
      W = { kind: "qzq", id: "sins" };
      c.x.qz.sins.ans = Object.fromEntries(qzSkin("sins").questions.map(q => [q.id, "a"]));
      return qzSheet().includes('data-a="sins"');
    })()
  );

  /* ---------- the built list ---------- */
  chk(
    "the built list has the row, and its probe passes",
    WB.some(r => /money sins read/i.test(r[1]) && r[2] === "b" && r[3]() === true)
  );
  chk(
    "What's new has the entry",
    PATCH_NOTES.some(p => /money read/i.test(p.t))
  );

  X("close");
  G.chars.splice(n0, 1);
  G.active = act0;
  G.demo = demo0;
  save();
  go("home");
}
