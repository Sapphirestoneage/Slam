/* ============================================================================
   SLAM the Game, test: tests/live-checklist.js
   PURPOSE     Live Session Mode, "Tests and checks" of the build, as one list: one direct check for each line of
               the brief, so each is covered in one place (the other live-*.js files test each rule in depth):
               rough numbers, corrections, hypotheticals, the confirm handshake (yes, no, timeout), the echo
               filter, never overwriting a confirmed or a hand-entered value, grouped approve-all, Start that
               waits for the client's microphone step, and a phone or Safari that cannot listen.
   INPUT       The game scripts (harness.cjs); the live files, loaded here. Stand-ins (livesim.js).
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: account/live.js, account/livefill.js, account/liveland.js,
               account/livereview.js, account/liveio.js, account/livesim.js.
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
    "account/liveroom.js",
    "account/livegame.js",
    "account/livescreen.js",
    "account/livereview.js",
  ].forEach(f => vm.runInThisContext(fs.readFileSync(GAME_DIR + f, "utf8"), { filename: f }));
  const call = c => {
      const S = lfStateNew("s1");
      let t = 1000000,
        n = 0;
      return {
        S,
        say: (side, text, gap) => {
          t += gap == null ? 3000 : gap;
          return lfLine(S, c, { id: "s1-L" + ++n, side, text, at: t }, t);
        },
        wait: ms => (t += ms),
        tick: () => lfTick(S, c, t),
      };
    },
    row = (c, sec, k) => (c[sec] || []).find(x => x.k === k),
    ks = r => r.events.map(e => e.k).join(","),
    fresh = () => newChar({ name: "Sam" });

  /* rough numbers: the middle, as a Guess, marked rough */
  {
    const c = fresh(),
      K = call(c);
    K.say("coach", "What about groceries?");
    K.say("client", "400-ish, maybe 500.");
    const m = c.x.live.marks["spend:Food/groceries"];
    chk(
      "rough: 400-ish, maybe 500 lands as 450, a Guess, marked rough",
      m && m.v === 450 && m.rough && m.lv === "guess",
      m
    );
  }
  /* corrections: the last one wins, both kept */
  {
    const c = fresh(),
      K = call(c);
    K.say("coach", "Any cards with a balance?");
    K.say("client", "One card, about three thousand two hundred on it.");
    const r = K.say("client", "No wait, 3,400.");
    const m = c.x.live.marks["debt:Credit card balance"];
    chk(
      "correction: the last number stays, and both are kept for the review",
      ks(r) === "corrected" &&
        row(c, "debts", "Credit card balance").amt === 3400 &&
        m.all.map(a => a.v).join() === "3200,3400",
      m && m.all
    );
  }
  /* hypotheticals: a what-if, no value */
  {
    const c = fresh(),
      K = call(c);
    K.say("client", "Rent is 1,850 a month.");
    const before = JSON.stringify(c.spends),
      r = K.say("client", "If I moved in with my sister, rent would be 900.");
    chk(
      "hypothetical: an if-line is a what-if and changes no value",
      ks(r) === "whatif" && JSON.stringify(c.spends) === before && c.x.live.whatifs.length === 1
    );
  }
  /* the handshake: yes, no, timeout */
  {
    const c = fresh(),
      K = call(c);
    K.say("client", "Rent is 1,800 a month.");
    K.say("coach", "Confirming rent 1,850.");
    const y = K.say("client", "Yes.");
    chk(
      "handshake yes: the value is set and Close",
      ks(y) === "confirmed" && row(c, "spends", "Home").amt === 1850 && row(c, "spends", "Home").s === true
    );
    K.say("coach", "Confirming groceries 450.");
    const no = K.say("client", "No, not quite.");
    chk(
      "handshake no: nothing changes, and the field waits for the next Confirming",
      ks(no).includes("waiting") && !c.x.live.marks["spend:Food/groceries"] && lfTag(c, "spend:Food/groceries", 0).wait
    );
    K.say("coach", "Confirming checking 1,200.");
    K.wait(LF.ASK_MS + 500);
    const to = K.tick();
    chk(
      "handshake timeout: no answer in 10 seconds changes nothing",
      ks(to) === "timeout" && !c.x.live.marks["cash:Checking"],
      ks(to)
    );
  }
  /* the echo filter */
  {
    const set = LV_ECHO.normal;
    chk(
      "echo: nearly the same words from the other device in 2 seconds are dropped; later, or different, they stay",
      !!lvEchoOf(
        "my rent is eighteen fifty",
        10000,
        [{ text: "My rent is 1850, eighteen fifty.", t: 9000 }],
        LV_ECHO.strong
      ) &&
        !!lvEchoOf("what is your rent", 10000, [{ text: "What is your rent?", t: 8500 }], set) &&
        !lvEchoOf("what is your rent", 10000, [{ text: "What is your rent?", t: 7000 }], set) &&
        !lvEchoOf("my car payment is 400", 10000, [{ text: "What is your rent?", t: 9500 }], set) &&
        !lvEchoOf("yes", 10000, [{ text: "yes", t: 9900 }], set)
    );
  }
  /* never overwrite a confirmed or a hand-entered value */
  {
    const c = fresh(),
      K = call(c);
    K.say("client", "Rent is 1,800 a month.");
    K.say("coach", "Confirming rent 1,800.");
    K.say("client", "Yes.");
    const r = K.say("client", "Rent is 2,000 a month.", 20000);
    chk(
      "a value confirmed out loud is not changed by plain speech",
      row(c, "spends", "Home").amt === 1800 && ks(r) === "kept"
    );
    const d = newChar({ name: "Dee" });
    applyTypical(d);
    d.placed = true;
    d.spends.forEach(x => (x.s = true));
    syncAll(d);
    const home = row(d, "spends", "Home").amt,
      K2 = call(d),
      r2 = K2.say("client", "Rent is 2,400 a month.");
    chk(
      "a value the person entered by hand is never changed: kept for the review with the reason",
      row(d, "spends", "Home").amt === home &&
        ks(r2) === "kept" &&
        /You already entered this/.test(d.x.live.heard[d.x.live.heard.length - 1].why)
    );
  }
  /* grouped approve-all, Start that waits, and a phone that cannot listen: a whole simulated call */
  {
    const clock = simClock(),
      db = simDb(clock),
      hub = simHub(clock, 100),
      sb = simSb(clock);
    db.coaches.coach1 = true;
    sb.coaches.coach1 = true;
    const made = await db.as("coach1").inviteMake("Sam", "Dana"),
      used = await db.as("client1").inviteUse(made.data.token),
      sid = used.data.session.id,
      P = simPair({ clock, db, hub, sid, coach: "coach1", client: "client1", sb, name: "Sam" });
    await P.coach.R.join();
    await P.client.R.join();
    await P.client.R.game.ready;
    for (const s of ["coach", "client"]) await P[s].R.act("ok");
    await clock.run(200);
    chk(
      "Start waits for the client's microphone and headphones steps, and offers the coach's side only",
      (await P.coach.R.act("start")) === false && lvCanStart(P.coach.R.room, "coach", true)
    );
    await simReady(P);
    await clock.run(200);
    await P.coach.R.act("start");
    await clock.run(300);
    for (const l of simScriptFill()) {
      await clock.run(l[0]);
      P[l[1]].speech.say(l[2]);
    }
    await clock.run(3000);
    await P.coach.R.act("end");
    await clock.run(3000);
    for (let i = 0; i < 40; i++) await Promise.resolve();
    const c = P.coach.R.game.get(),
      g = lrvGroups(c, sid).find(x => x.area === "debts"),
      n = g.check.length,
      levels = JSON.stringify(c.debts.map(d => [d.s, d.cf || 0, d.ratecf]));
    const done = lrvApproveGroup(c, sid, "debts", "coach", 5);
    chk(
      "grouped approve-all: each open item of the group is approved, and no level changes",
      n > 0 &&
        done === n &&
        lrvGroups(c, sid).find(x => x.area === "debts").check.length === 0 &&
        JSON.stringify(c.debts.map(d => [d.s, d.cf || 0, d.ratecf])) === levels
    );
    P.coach.R.leave();
    P.client.R.leave();
    /* a phone or Safari: the client's browser has no speech recognition */
    const db2 = simDb(clock),
      hub2 = simHub(clock, 100);
    db2.coaches.coach1 = true;
    const m2 = await db2.as("coach1").inviteMake("Sam", "Dana"),
      u2 = await db2.as("client1").inviteUse(m2.data.token),
      Q = simPair({
        clock,
        db: db2,
        hub: hub2,
        sid: u2.data.session.id,
        coach: "coach1",
        client: "client1",
        clientCan: false,
      });
    await Q.coach.R.join();
    await Q.client.R.join();
    for (const s of ["coach", "client"]) await Q[s].R.act("ok");
    await Q.client.R.act("headphones", false);
    await clock.run(200);
    chk("a phone that cannot listen needs no microphone step: Start works", lvCanStart(Q.coach.R.room, "coach"));
    await Q.coach.R.act("start");
    await clock.run(200);
    Q.coach.speech.say("What is your rent?");
    await clock.run(3000);
    chk(
      "the phone fallback: the coach's side goes on alone, with the plain line",
      Q.coach.R.room.state === "live" &&
        lvFallbackLine(Q.coach.R.room, "coach") ===
          "Their side can't listen in this browser. The session goes on with your side only." &&
        Q.coach.R.lines.length === 1
    );
    Q.coach.R.leave();
    Q.client.R.leave();
  }
})();
