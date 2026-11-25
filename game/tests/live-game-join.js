/* ============================================================================
   SLAM the Game, test: tests/live-game-join.js
   PURPOSE     Live Session Mode, the join of the live fill to the REAL saved game (Part 6). (1) A new
               client has no game: the first one is made with newChar and the typed name, with the
               sharing mark of a coach's client, in the shape of fresh(). (2) A scripted call on two
               devices ends with the values in the SAVED game (the pieces that the game reads). (3) The
               coach's device reads the client's profile from the same saved game. (4) A reload of the
               client's page in the middle of the call loses no value, and the heard list is whole again.
               (5) A save that does not go through waits on the device and goes out later. (6) The normal
               game opens that saved game and shows each heard value as Guess with the heard tag.
               (7) A client who already has a game: the call fills that game, and the person's own
               numbers stay as they were. (8) The stamp: a change of the call stamps the person, so the
               other device and the coach lose no change.
   INPUT       The game scripts (harness.cjs); the live files, coachpage.js and livegame.js, loaded here.
               simSb stands in for the table of saved games, simDb for the session tables.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: account/livegame.js (lgFirst, lgPerson, lgClient, lgCoach,
               lgAttach), account/coachpage.js (cpGame, cpSaveGame), account/cloud.js (clSig,
               clMergePerson), account/liveflag.js (ledRowHeard), account/livesim.js (simSb, simPair).
   ========================================================================= */
(async () => {
  const fs = require("fs"),
    vm = require("vm");
  [
    "account/live.js",
    "account/liveio.js",
    "account/livefill.js",
    "account/liveland.js",
    "account/livesim.js",
    "account/coachpage.js",
    "account/livegame.js",
    "account/livescreen.js",
    "account/livereview.js",
  ].forEach(f => vm.runInThisContext(fs.readFileSync(GAME_DIR + f, "utf8"), { filename: f }));
  const settle = async () => {
    for (let i = 0; i < 30; i++) await Promise.resolve();
  };
  /* A call: one coach, one client, one session; the stand-ins of the database and of the saved games. */
  const call = async o => {
    o = o || {};
    const clock = o.clock || simClock(),
      db = o.db || simDb(clock),
      hub = o.hub || simHub(clock, 100),
      sb = o.sb || simSb(clock);
    db.coaches.coach1 = true;
    sb.coaches.coach1 = true;
    let sid = o.sid;
    if (!sid) {
      const made = await db.as("coach1").inviteMake("Sam", "Dana"),
        used = await db.as("client1").inviteUse(made.data.token);
      sid = used.data.session.id;
    }
    const P = simPair({
      clock,
      db,
      hub,
      sid,
      coach: "coach1",
      client: "client1",
      sb,
      name: "Sam",
      stores: o.stores,
      tag: o.tag,
    });
    await P.coach.R.join();
    await P.client.R.join();
    await P.client.R.game.ready;
    await P.coach.R.game.ready;
    if (!o.sid) {
      for (const s of ["coach", "client"]) {
        await P[s].R.act("ok");
        await P[s].R.act("headphones", true);
      }
      await clock.run(300);
      await P.coach.R.act("start");
      await clock.run(300);
    }
    return { clock, db, hub, sb, sid, P };
  };
  const saved = (sb, owner) => {
      const G0 = cpGame(sb.rows.filter(r => r.owner === (owner || "client1")));
      return G0 ? G0.g : null;
    },
    row = (c, sec, k) => (c[sec] || []).find(x => x.k === k),
    play = async (T, lines) => {
      for (const l of lines) {
        await T.clock.run(l[0]);
        T.P[l[1]].speech.say(l[2]);
      }
      await T.clock.run(3000);
      await settle();
    };

  /* ---------- 1. a new client: the first game ---------- */
  {
    const g = lgFirst("  Sam  "),
      f = fresh();
    chk(
      "the first game has the keys of fresh(), so the game reads it like its own",
      JSON.stringify(Object.keys(g).sort()) === JSON.stringify(Object.keys(f).sort()),
      Object.keys(g)
    );
    chk(
      "the first game holds one person made by newChar with the typed name, and no sample people",
      g.chars.length === 1 && g.chars[0].name === "Sam" && g.demo === false && g.active === 0 && !g.chars[0].demo
    );
    chk("a name that was not typed gives You", lgFirst("").chars[0].name === "You");
    const T = await call();
    const g1 = saved(T.sb);
    chk(
      "a new client's device saves the first game at once, as the pieces that the game reads (slam_part_N, slam_meta)",
      !!g1 && T.sb.rows.some(r => r.name === "slam_meta") && T.sb.rows.some(r => r.name === "slam_part_0")
    );
    chk(
      "the first game has the sharing mark of a coach's client (Share with my coach on)",
      T.sb.rows.filter(r => r.owner === "client1").every(r => r.share_with_coach === true)
    );
    chk(
      "the client's device says it is saved",
      T.P.client.R.game.st === "on" && /Saved/.test(T.P.client.R.game.says())
    );
    chk(
      "only the client's device writes values; the coach's device reads",
      T.P.client.R.fill.write === true && T.P.coach.R.fill.write === false && T.P.coach.R.game.side === "coach"
    );

    /* ---------- 2. a scripted call: the values land in the SAVED game ---------- */
    await play(T, simScriptFill());
    await T.P.coach.R.act("end");
    await T.clock.run(2500);
    await settle();
    const c = lgPerson(saved(T.sb));
    chk(
      "after the call the saved game holds the values heard (pay rhythm, income, rent, groceries, card, rate, savings)",
      c.payFreq === "Every 2 weeks" &&
        row(c, "incs", "A main job").amt === 4550 &&
        row(c, "spends", "Home").amt === 1850 &&
        row(c, "spends", "Food").amt >= 450 &&
        row(c, "debts", "Credit card balance").amt === 3400 &&
        row(c, "debts", "Credit card balance").rate === 24.99 &&
        row(c, "cashes", "Savings").amt === 3500,
      JSON.stringify([c.payFreq, c.incs, c.spends.map(x => [x.k, x.amt]), c.debts, c.cashes])
    );
    chk(
      "each heard value is a Guess with the mark h; rent, confirmed out loud, is Close and never Exact",
      row(c, "incs", "A main job").s === false &&
        row(c, "incs", "A main job").h === 1 &&
        row(c, "spends", "Home").s === true &&
        !(row(c, "spends", "Home").cf >= 3) &&
        row(c, "debts", "Credit card balance").ratecf === 0
    );
    chk(
      "the saved game has the heard list and the three what-ifs of the call",
      c.x.live.heard.length >= 12 && c.x.live.whatifs.length === 3 && c.x.live.heard.every(h => h.sid === T.sid)
    );
    chk("the change of the call stamped the person (c.mod)", c.mod > 0);

    /* ---------- 3. the coach's device reads the same profile ---------- */
    const cc = T.P.coach.R.game.get();
    chk(
      "after End the coach's device reads the client's profile from the saved game",
      !!cc && row(cc, "spends", "Home").amt === 1850 && cc.x.live.heard.length === c.x.live.heard.length
    );
    chk(
      "during the call the coach's screen showed the view that the client's device sent",
      !!T.P.coach.R.ls.view && T.P.coach.R.ls.view.nums.length === 4
    );

    /* ---------- 6. the normal game opens it: Guess with the heard tag ---------- */
    const G1 = G,
      tab1 = tab;
    G = saved(T.sb);
    G.chars = G.chars.map(migrate);
    tab = "money";
    render();
    const i = C().incs.findIndex(x => x.k === "A main job"),
      inc = ledRow("incs", i, C().incs[i]),
      home = ledRow(
        "spends",
        C().spends.findIndex(x => x.k === "Home"),
        row(C(), "spends", "Home")
      );
    chk(
      "the normal game shows a heard income as Guess with the heard tag",
      /Guess · <span class="lf-heard">heard in your session<\/span>/.test(inc) && /class="guess"/.test(inc),
      inc
    );
    chk(
      "the normal game shows rent as confirmed out loud, with no Guess",
      /confirmed out loud in your session/.test(home) && !/Guess ·/.test(home),
      home
    );
    chk("the money screen of the game draws with no undefined or NaN", clean(app()) && app().length > 500);
    G = G1;
    tab = tab1;
    render();
  }

  /* ---------- 4. a reload in the middle of the call ---------- */
  {
    const T = await call(),
      half = simScriptFill().slice(0, 8);
    await play(T, half);
    const before = lgPerson(saved(T.sb)),
      n0 = T.P.client.R.fill.heard.length;
    chk("half way, the saved game has the values so far", row(before, "spends", "Home").amt === 1850 && n0 >= 4);
    /* the page loads again: a new controller on the same store (the device) and the same saved game */
    T.P.client.R.leave();
    T.P.coach.R.leave();
    const T2 = await call({
      /* reload */ clock: T.clock,
      db: T.db,
      hub: T.hub,
      sb: T.sb,
      sid: T.sid,
      stores: { coach: T.P.coach.store, client: T.P.client.store },
      tag: "b" /* the ids of the lines of a new page */,
    });
    await T2.clock.run(1500);
    await settle();
    chk(
      "after the reload the heard list is whole again, on both devices",
      T2.P.client.R.fill.heard.length === n0 && T2.P.coach.R.fill.heard.length === n0,
      [n0, T2.P.client.R.fill.heard.length, T2.P.coach.R.fill.heard.length]
    );
    chk(
      "after the reload the profile still holds each value",
      row(T2.P.client.R.game.get(), "spends", "Home").amt === 1850 &&
        row(T2.P.client.R.game.get(), "debts", "Credit card balance").amt === 3200
    );
    await play(T2, simScriptFill().slice(8));
    const after = lgPerson(saved(T.sb));
    chk(
      "the rest of the call lands on the same profile (the rate, the savings)",
      row(after, "debts", "Credit card balance").rate === 24.99 && row(after, "cashes", "Savings").amt === 3500
    );
  }

  /* ---------- 5. a save that does not go through ---------- */
  {
    const T = await call();
    T.sb.down = true;
    await play(T, simScriptFill().slice(0, 4));
    const A = T.P.client.R.game;
    chk(
      "with the server out of reach the value is on the device, and the screen says so in calm words",
      A.st === "off" && /kept on this device/.test(A.says()) && !!T.P.client.store.get(LG_KEY + "client1")
    );
    chk(
      "nothing reached the saved game yet",
      !row(lgPerson(saved(T.sb)), "spends", "Home") || row(lgPerson(saved(T.sb)), "spends", "Home").amt !== 1850
    );
    T.sb.down = false;
    await T.clock.run(LG_RETRY_MS + 500);
    await settle();
    chk(
      "when the server is back the change goes out by itself, and the copy on the device is cleared",
      row(lgPerson(saved(T.sb)), "spends", "Home").amt === 1850 &&
        A.st === "on" &&
        !T.P.client.store.get(LG_KEY + "client1")
    );
  }

  /* ---------- 7. a client who already has a game ---------- */
  {
    const clock = simClock(),
      sb = simSb(clock),
      own = newChar({ name: "Sam" });
    own.goals = [];
    applyTypical(own);
    const rent = row(own, "spends", "Home");
    rent.amt = 1600;
    rent.s = true; /* typed by the person */
    own.mod = 1000;
    CP.sb = sb.as("client1");
    await cpSaveGame(
      "client1",
      g => g,
      () => Object.assign(lgFirst("Sam"), { chars: [own] })
    );
    const T = await call({ clock, sb });
    await play(T, simScriptFill().slice(0, 6));
    const c = lgPerson(saved(sb));
    chk(
      "the call fills the client's own game: one person, the same name",
      saved(sb).chars.filter(x => !x.demo).length === 1 && c.name === "Sam"
    );
    chk(
      "the rent the person typed stays as it was; the heard rent waits for the review with the reason",
      row(c, "spends", "Home").amt === 1600 &&
        row(c, "spends", "Home").s === true &&
        c.x.live.heard.some(h => h.key === "spend:Home/rent" && h.st === "kept" && h.why === LF_WHY.hand)
    );
  }

  /* ---------- 8. the stamp, with a second copy of the person ---------- */
  {
    const T = await call();
    await play(T, simScriptFill().slice(0, 4));
    const mine = lgPerson(saved(T.sb)),
      old = JSON.parse(JSON.stringify(mine));
    old.mod = mine.mod - 5000;
    old.x = old.x || {};
    old.x.plan = [{ id: "q1", t: "A step from the coach", st: "todo" }];
    const out = clMergePerson(mine, old);
    chk(
      "the copy of the call is the later one and wins, and an open step of the older copy is kept",
      !!out && out.x.plan.some(p => p.id === "q1") && row(out, "spends", "Home").amt === 1850
    );
  }

  /* ---------- the page loads the game's own scripts, not a copy ---------- */
  {
    const page = fs.readFileSync(GAME_DIR + "session.html", "utf8"),
      js = f => new RegExp('<script src="' + f.replace(/[./]/g, m => "\\" + m) + "\\?v=").test(page);
    chk(
      "session.html loads the game's own engine, recalc, question words, fill, kit, cloud and coach page files",
      [
        "core/engine.js",
        "core/recalc.js",
        "data/askwords.js",
        "features/alloc.js",
        "screens/dash.js",
        "account/cloud.js",
        "account/coachpage.js",
        "account/livegame.js",
        "account/livescreen.js",
        "account/livereview.js",
      ].every(js)
    );
    chk(
      "session.html defines no function of its own beyond the page listeners",
      !/function\s+[a-z]/i.test(page.replace(/<style>[\s\S]*?<\/style>/, ""))
    );
    const lg = fs.readFileSync(GAME_DIR + "account/livegame.js", "utf8");
    chk(
      "the client's device saves only through cpSaveGame (no second saver)",
      /cpSaveGame\(/.test(lg) && !/from\("games"\)\.(update|insert)/.test(lg)
    );
  }
})();
