/* ============================================================================
   SLAM the Game, test: tests/time-to-first-number.js
   PURPOSE     Examine run CC-1, item 8 (Nov 27 2026): the time to the first number. The seconds leave out
               the time the page was out of view. One record for a new player, made when What it is
               shows, with four facts and nothing about the person. It is kept on the profile and sent
               to the table; with no table it stays on the device and nothing shows. The admin section
               gives the median and the longest one, with the target as a plain line, amber when over.
               For a player who owes nothing and one with costly debt.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html, and account/adminmore.js
               (the admin page loads it; this test loads it by hand). Made-up players and made-up rows.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: core/firstnum.js (fnSecs, fnMake, fnRows, fnStats, fnWords,
               fnDone, fnSend), features/couldbe.js (finishSetupCb), account/adminmore.js (amFirstHTML).
   ========================================================================= */
(async () => {
  const fs = require("fs"),
    path = require("path"),
    G0 = clone(G);
  /* ---- 1. THE MATH ---- */
  chk("seconds: the time out of view does not count", fnSecs(1000, 91000, 30000) === 60);
  chk("seconds are never under 0, and at most a day", fnSecs(5000, 1000, 0) === 0 && fnSecs(0, 9e9, 0) === 86400);
  const rec = fnMake({ id: "a1", t0: 0, now: 75400, hidden: 0, taps: 6, version: "game-12345678", signed: false });
  chk(
    "one record holds four facts and an id",
    JSON.stringify(Object.keys(rec)) === '["id","s","t","v","in"]' && rec.s === 75 && rec.t === 6,
    rec
  );
  chk(
    "a record with no taps or no id is not made",
    fnMake({ id: "a", t0: 0, now: 1, taps: 0 }) === null && fnMake({ t0: 0, now: 1, taps: 3 }) === null
  );
  const rows = fnRows(
    [
      { id: "t1", secs: 40, taps: 6, version: "v", signed: false },
      { id: "t2", secs: 200, taps: 9, version: "v", signed: true },
    ],
    {
      o1: { chars: [{ x: { fn: { id: "t2", s: 200, t: 9, v: "v", in: true } } }, { x: {} }] },
      o2: { chars: [{ x: { fn: { id: "g3", s: 90, t: 5, v: "v", in: true } } }] },
    }
  );
  chk("the table and the saved games count each record one time", rows.length === 3, rows.length);
  const T = fnStats(rows);
  chk(
    "the median and the longest one",
    T.n === 3 && T.medS === 90 && T.medT === 6 && T.maxS === 200 && T.maxT === 9 && T.over === 1 && T.late === false,
    T
  );
  chk("an even count: the middle of the two", fnStats(rows.concat([{ id: "x", s: 100, t: 7 }])).medS === 95);
  chk("nothing yet", fnStats([]).n === 0 && fnStats(fnRows(null, {})).late === false);
  chk("the words of seconds", fnWords(72) === "1 min 12 s" && fnWords(48) === "48 s");
  chk("the target is 2 minutes", FN_TARGET === 120);

  /* ---- 2. IN THE GAME ---- */
  for (const debt of [false, true]) {
    const who = debt ? "costly debt: " : "owes nothing: ";
    G = clone(G0);
    G.demo = true;
    W = null;
    SH = null;
    FN.t0 = Date.now() - 50000;
    FN.hid = 20000;
    if (debt) sitApply("carddebt");
    else {
      X("start");
      X("wnskip");
    }
    chk(who + "no record before the number", !C().x || !C().x.fn);
    X("cbset", "", "", { q: "age", i: 2 });
    if (debt) X("sitok");
    else ["spend", "inv", "save"].forEach(q => X("cbset", "", "", { q, i: 2 }));
    const c = C(),
      f = c.x.fn;
    chk(who + "What it is shows, and the record is made", W.step === "is" && !!f, W.step);
    chk(who + "the seconds leave out the hidden time", f && f.s >= 29 && f.s <= 32, f && f.s);
    chk(who + "the taps are the taps of the opening", f && f.t === CB.taps && f.t === (debt ? 4 : 6), f && f.t);
    chk(
      who + "signed in is false here, and nothing personal is kept",
      f && f.in === false && Object.keys(f).every(k => ["id", "s", "t", "v", "in", "sent"].includes(k)),
      f && Object.keys(f)
    );
    chk(who + "the screen says nothing about it", !/first number|seconds/i.test(ov()));
    const id = f.id;
    chk(who + "a second look makes no second record", fnDone() === null && c.x.fn.id === id);
    chk(who + "with no address the record stays on the device", (await fnSend(c)) === "wait" && !c.x.fn.sent);
    if (debt) chk(who + "the costly-debt player has the debt kind", c.debtKinds.includes("Credit card balance"));
  }
  /* the table: sent, not there yet, refused */
  const c = C(),
    cfg0 = global.fbCfg;
  let got = null;
  const net = st => {
    global.fbCfg = async () => ({
      url: "https://db.test",
      key: "k",
      token: null,
      fetch: async (u, o) => ((got = { u, o }), { ok: st < 300, status: st }),
    });
  };
  const on0 = SUPA.on;
  SUPA.on = true;
  net(404);
  chk("the table is not there yet: it waits, quietly", (await fnSend(c)) === "wait" && !c.x.fn.sent);
  net(500);
  chk("any other answer: later", (await fnSend(c)) === "later" && !c.x.fn.sent);
  net(201);
  chk("the table takes it: sent", (await fnSend(c)) === "sent" && c.x.fn.sent === true);
  const body = JSON.parse(got.o.body);
  chk(
    "the row has only the four facts and the id",
    JSON.stringify(Object.keys(body).sort()) === '["id","secs","signed","taps","version"]' &&
      /first_numbers$/.test(got.u),
    Object.keys(body)
  );
  got = null;
  chk("a sent record is not sent again", (await fnSend(c)) === "wait" && got === null);
  SUPA.on = false;
  delete c.x.fn.sent;
  chk("off the website nothing is sent", (await fnSend(c)) === "wait" && got === null);
  SUPA.on = on0;
  global.fbCfg = cfg0;

  /* ---- 3. THE ADMIN SECTION ---- */
  global.AM = undefined;
  (0, eval)(
    fs.readFileSync(path.join(GAME_DIR, "account", "adminmore.js"), "utf8").replace(/^const AM = /m, "var AM = ")
  );
  AM.first = null;
  let h = amFirstHTML({});
  chk("nothing yet: the target shows as a plain line", /No new player/.test(h) && /Target: under 2 minutes\./.test(h));
  chk("it says what waits for the database file", h.includes(FN_FILE) && /Players with an account are counted/.test(h));
  AM.first = [
    { id: "a", secs: 60, taps: 6, version: "v", signed: false },
    { id: "b", secs: 80, taps: 6, version: "v", signed: false },
    { id: "c", secs: 400, taps: 12, version: "v", signed: true },
  ];
  h = amFirstHTML({});
  chk(
    "the median and the longest one show",
    h.includes("1 min 20 s") && h.includes("6 min 40 s") && />3</.test(h),
    h.slice(0, 200)
  );
  chk("under the target: no amber", !/ffb648/.test(h) && !h.includes(FN_FILE));
  AM.first = AM.first.concat([
    { id: "d", secs: 300, taps: 9, version: "v", signed: false },
    { id: "e", secs: 500, taps: 9, version: "v", signed: false },
  ]);
  h = amFirstHTML({});
  chk("over the target: amber, and a plain line", /ffb648/.test(h) && /The median is over it now\./.test(h));
  chk("no red and no verdict word", !/#f00|red\b|mistake|failed|behind|off track|too slow|bad/i.test(h));
  /* the SQL file is marked NOT APPLIED and holds no personal column */
  const sql = fs.readFileSync(path.join(GAME_DIR, "..", "supabase", "migrations", FN_FILE), "utf8");
  chk(
    "the database file is marked NOT APPLIED",
    /^-- NOT APPLIED\./m.test(sql) && /create table if not exists public\.first_numbers/.test(sql)
  );
  chk(
    "the table has no owner, email or device column",
    !/owner|email|device|browser/.test(sql.split("-- ---------- 1.")[1].split("-- ---------- 2.")[0])
  );
  G = G0;
})();
