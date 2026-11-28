/* ============================================================================
   SLAM the Game, test: tests/confidence-and-joy-check.js
   PURPOSE     Examine the Confidence and Joy check (run CC-1, item 18) and what it adds to Your year
               (item 19): the math of the log, when a check is due, the line on Home (after the first
               number, never before it), the sheet with its two scales and the before and after, the
               one stored place shared with the ratio Financial confidence, the averages of the admin
               page (nothing under five players, no name), and the three lines of Your year.
   INPUT       The game scripts, loaded by harness.cjs. The sample game.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: core/cjcore.js, features/cjcheck.js, amCjHTML of
               account/adminmore.js, wrappedSheetBase of screens/ui.js.
   ========================================================================= */
{
  const fs = require("fs"),
    G0 = G;
  require("vm").runInThisContext(fs.readFileSync(GAME_DIR + "account/adminmore.js", "utf8"), {
    filename: "adminmore.js",
  });
  const fresh1 = costly => {
    G = clone(G0);
    G.demo = true;
    W = null;
    SH = null;
    X("start");
    X("wnskip");
    X("cbset", "", "", { q: "age", i: 1 });
    const before = ov();
    X("cbset", "", "", { q: "spend", i: 2 });
    X("cbset", "", "", { q: "inv", i: 3 });
    X("cbset", "", "", { q: "save", i: 3 });
    const c = C();
    if (costly)
      c.debts.push({ k: "Credit card balance", amt: 8000, high: true, apr: "15% to 25%", rate: 22, pay: 200, s: true });
    return { c, before, first: ov() };
  };

  /* 1. THE MATH */
  let L = cjUpsert([], "2026-11-28", "c", 4);
  chk("one tap makes one entry, and the other scale stays open", L.length === 1 && L[0].c === 4 && L[0].j === null);
  L = cjUpsert(L, "2026-11-28", "j", 7);
  chk("the second scale on the same day joins the same entry", L.length === 1 && L[0].j === 7);
  L = cjUpsert(L, "2026-11-28", "c", 5);
  chk("a second tap on the same day changes the entry", L.length === 1 && L[0].c === 5);
  chk("a number outside 1 to 10 is not kept", cjUpsert([], "2026-11-28", "c", 11).length === 0);
  chk("an entry with no tap is not kept: empty is not zero", cjUpsert(L, "2026-12-01", "c", null).length === 1);
  chk("one check: a first value and no change yet", cjChange(L, "c").change === null && cjChange(L, "c").first.v === 5);
  chk("no tap on a scale: nothing, not a 0", cjChange([{ d: "2026-11-28", c: 3, j: null }], "j") === null);
  L = cjUpsert(L, "2026-12-29", "c", 3);
  L = cjUpsert(L, "2026-12-29", "j", 9);
  chk(
    "two checks: the change is the latest minus the first",
    cjChange(L, "c").change === -2 && cjChange(L, "j").change === 2
  );
  let D = cjDue([], "2026-11-28", null);
  chk("no check yet: due at the start", D.due && D.first);
  D = cjDue(L, "2027-01-27", null);
  chk("29 days after the last check: not due", !D.due && D.next === "2027-01-28");
  chk("30 days after: due, the monthly check", cjDue(L, "2027-01-28", null).due && !cjDue(L, "2027-01-28", null).first);
  chk(
    "Later keeps it away for a week",
    !cjDue([], "2026-11-30", "2026-11-28").due && cjDue([], "2026-12-05", "2026-11-28").due
  );
  chk(
    "a check with one scale still open stays due that day",
    cjDue([{ d: "2026-11-28", c: 4 }], "2026-11-28", null).due
  );
  chk("the year: only the checks of that year", cjYear(L, "2026").conf.change === -2 && cjYear(L, "2027").n === 0);

  /* 2. THE OPENING IS NOT LONGER: no question before the first number */
  let P = fresh1(false);
  chk(
    "no screen of the opening asks the two scales",
    !/data-a="cjset"/.test(P.before) && !/data-a="cjset"/.test(P.first)
  );
  chk("the first number shows after the same four taps", /What it is/.test(P.first));

  /* 3. THE LINE ON HOME */
  const home = () => {
    X("close");
    W = null;
    tab = "home";
    G.tourSeen = true;
    render();
    return app();
  };
  let h = home();
  chk(
    "first Home has the line, with Answer and Later",
    /cjnote/.test(h) && /data-a="cj"[^>]*>Answer</.test(h) && /data-a="cjlater"[^>]*>Later</.test(h)
  );
  chk("the line says it is two taps", /Two taps, 1 to 10\./.test(h));
  chk("the line has no pulse: Home keeps its one pulse", !/cjnote[^>]*\b(cbnext|pulse)\b/.test(h));
  chk("the line shows no defect", clean(h), junk(h));
  X("cjlater");
  chk("Later: the line goes, and nothing is stored as a number", !/cjnote/.test(app()) && cjLog(C()).length === 0);
  delete C().x.cj.later;

  /* 4. THE SHEET */
  X("cj");
  h = ov();
  chk(
    "the sheet has two scales of ten chips",
    (h.match(/data-a="cjset" data-k="c"/g) || []).length === 11 &&
      (h.match(/data-a="cjset" data-k="j"/g) || []).length === 11
  );
  chk(
    "each scale has an i, and I'm not sure",
    (h.match(/term:cjconf|term:cjjoy/g) || []).length === 2 && (h.match(/I'm not sure/g) || []).length >= 2
  );
  chk("before any tap, the before and after says No tap yet", (h.match(/No tap yet\./g) || []).length === 2);
  chk("Show the math is there, closed", /<details class="math"/.test(h) && !/<details class="math" open/.test(h));
  X("cjset", "6", "c");
  X("cjset", "8", "j");
  const c = C(),
    t = todayISO();
  chk(
    "the taps are kept with the day",
    cjLog(c).length === 1 && cjLog(c)[0].c === 6 && cjLog(c)[0].j === 8 && cjLog(c)[0].d === t
  );
  chk("the confidence tap is the rating of the ratio Financial confidence", c.x.conf && c.x.conf.v === 6);
  h = ov();
  chk(
    "the sheet says Saved for today, and names the next check",
    /Saved for today\./.test(h) && /next check is on or after/.test(h)
  );
  chk("one check: the after waits for the next check", /The after shows at your next check/.test(h));
  X("cjset", "ns", "j");
  chk("I'm not sure leaves that scale open", cjLog(c)[0].j === null && cjLog(c)[0].c === 6);
  X("cjset", "8", "j");
  X("close");
  chk("after the check the line is gone from Home", !/cjnote/.test(home()));

  /* 5. A MONTH LATER, AND A LOWER NUMBER */
  c.x.cj.log = [{ d: addDays(t, -31), c: 7, j: 5 }];
  c.x.conf = { v: 7, d: addDays(t, -31) };
  chk(
    "31 days after the last check the line is back, as the monthly check",
    /Your monthly check: two taps\./.test(home())
  );
  X("cj");
  X("cjset", "4", "c");
  X("cjset", "6", "j");
  h = ov();
  chk("before and after: 7 at the start, 4 now", /<b>7<\/b> at the start/.test(h) && /<b>4<\/b> now/.test(h));
  chk(
    "a lower number is said plainly",
    /Down 3 points since the start\./.test(h) && /Up 1 point since the start\./.test(h)
  );
  chk(
    "no word judges it",
    !/\b(worse|bad|poor|low score|declin|mistake|failed|behind|off track)\b/i.test(h.replace(/<[^>]+>/g, " "))
  );
  chk("no red, and no amber, on the sheet", !/#(f00|ff0000|e5484d|d33)|var\(--(bad|warn)\)/i.test(h));
  chk("the sheet shows no defect", clean(h), junk(h));
  const B = cjBook(c);
  chk(
    "the plan's spreadsheet has the change as a formula",
    B.rows.some(r => r.id === "cj_confd" && r.v === -3 && /cj_conf1/.test(r.f))
  );
  X("close");

  /* 6. THE RATING ON THE RATIOS SHEET IS THE SAME TAP */
  c.x.cj.log = [];
  c.x.conf = null;
  X("keynums");
  X("raconf", "9");
  chk(
    "a rating tapped on Ratios is today's confidence check",
    cjLog(c).length === 1 && cjLog(c)[0].c === 9 && c.x.conf.v === 9
  );
  X("raconf", "9");
  chk("a second tap clears both", !c.x.conf && cjLog(c).length === 0);
  X("close");

  /* 7. A PLAYER WITH COSTLY DEBT GETS THE SAME CHECK, AND A SAMPLE PROFILE AND A COACH DO NOT */
  P = fresh1(true);
  chk("a player with costly debt gets the line too", /cjnote/.test(home()));
  C().demo = true;
  chk("a sample profile has no line", !/cjnote/.test(home()));
  C().demo = false;
  const as0 = SUPA.as,
    demo0 = G.demo;
  SUPA.as = "made-up-client";
  G.demo = false;
  chk("a coach in the game of a client has no line", !/cjnote/.test(home()));
  SUPA.as = as0;
  G.demo = demo0;

  /* 8. THE ADMIN PAGE: COUNTS AND AVERAGES, NOTHING UNDER FIVE PLAYERS */
  const game = (c0, c1, j0, j1, name) => ({
    chars: [
      {
        name,
        x: {
          cj: {
            log: [{ d: "2026-10-01", c: c0, j: j0 }].concat(c1 == null ? [] : [{ d: "2026-11-01", c: c1, j: j1 }]),
          },
        },
      },
    ],
  });
  const four = {
    a: game(2, 4, 5, 5, "Zelda Quux"),
    b: game(4, 6, 6, 7, "B"),
    c: game(6, 8, 7, 9, "C"),
    d: game(8, 8, 8, 7, "D"),
  };
  let T = cjStats(cjRows(four));
  chk("four players: nothing is shown", T.n === 4 && !T.show && T.conf.first === null && T.joy.change === null);
  let a = amCjHTML(four);
  chk(
    "the admin page says why, and shows no average",
    /Fewer than 5 players answered/.test(a) && !/at the first check/.test(a)
  );
  const six = Object.assign(
    {
      e: game(5, 4, 4, 6, "E"),
      f: game(5, null, 6, null, "F"),
      s: { chars: [{ demo: true, x: { cj: { log: [{ d: "2026-10-01", c: 1, j: 1 }] } } }] },
    },
    four
  );
  T = cjStats(cjRows(six));
  chk(
    "six players (a sample profile is not one): the averages",
    T.n === 6 && T.show && T.conf.first === 5 && Math.abs(T.conf.last - 35 / 6) < 1e-9
  );
  chk(
    "the change is the average of the players with two checks",
    T.conf.n2 === 5 && Math.abs(T.conf.change - 1) < 1e-9 && Math.abs(T.joy.change - 0.8) < 1e-9
  );
  a = amCjHTML(six);
  chk(
    "the admin page shows counts and averages",
    /Players who answered <b>6<\/b>/.test(a) &&
      /Confidence at the first check <b>5<\/b>/.test(a) &&
      /their average change <b>\+1<\/b>/.test(a)
  );
  chk("and no name of a player", !/Zelda|Quux/.test(a) && !/Zelda/.test(JSON.stringify(cjRows(six))));
  chk(
    "the rows hold numbers only",
    cjRows(six).every(r => Object.keys(r).join() === "c0,c1,cd,j0,j1,jd")
  );
  chk("the admin page loads the math", /core\/cjcore\.js/.test(fs.readFileSync(GAME_DIR + "admin.html", "utf8")));

  /* 9. YOUR YEAR (item 19) */
  P = fresh1(false);
  const y = P.c,
    yr = todayISO().slice(0, 4);
  y.hist = y.hist.slice(0, 1);
  y.wins = [];
  X("wrapped");
  h = ov();
  chk(
    "one saved check-in: the change of net worth says Not yet, not $0",
    /Own minus owe<\/div><div class="big">Not yet</.test(h) && /Needs two saved check-ins this year/.test(h)
  );
  chk("no win this year: the line says so", /data-wr="wins"[\s\S]*?No money win logged this year yet/.test(h));
  chk("no two checks: the line says what it needs", /Needs two checks in the year\. You have 0 so far\./.test(h));
  chk("the three lines are there", /data-wr="wins"/.test(h) && /data-wr="cj"/.test(h) && /data-wr="time"/.test(h));
  X("close");
  y.wins = [
    { d: yr + "-02-03", id: "a", kind: "once", amt: 240 },
    { d: yr + "-03-04", id: "b", kind: "month", amt: 85 },
    { d: "2019-03-04", id: "c", kind: "month", amt: 999 },
  ];
  y.x.cj = {
    log: [
      { d: yr + "-01-05", c: 3, j: 6 },
      { d: yr + "-06-05", c: 6, j: 5 },
    ],
  };
  const s1 = Object.assign({}, y.hist[0], { d: yr + "-01-02", nw: 1000, debt: 5000 }),
    s2 = Object.assign({}, y.hist[0], { d: yr + "-06-02", nw: 4000, debt: 3000 });
  y.hist = [s1, s2];
  const R = cjYearRead(y, yr, todayISO());
  chk("the wins of this year only", R.wins.n === 2 && R.wins.once === 240 && R.wins.month === 85);
  X("wrapped");
  h = ov();
  chk("the money wins line", /2 wins: \$240 one time, and \$85 a month\./.test(h));
  chk(
    "confidence and joy: the start of the year and now, in plain numbers",
    /Confidence: 3 at the start of the year, 6 now\. Joy: 6 at the start of the year, 5 now\./.test(h)
  );
  chk(
    "two check-ins: net worth change and debt paid are numbers",
    /Own minus owe<\/div><div class="big">\+?\$3,000/.test(h) && /Debt paid off<\/div><div class="big">\$2,000/.test(h)
  );
  const tl = timeLedger(y, derive(y));
  chk(
    "the time ledger: the hourly pay of the engine, or what it needs",
    tl.wage > 0
      ? h.includes("An hour of your work brings home " + money(Math.round(tl.wage)))
      : /Needs your pay and your work hours/.test(h)
  );
  chk("Your year shows no defect", clean(h), junk(h));
  X("close");
  G = G0;
}
