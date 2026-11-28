/* ============================================================================
   SLAM the Game, test: tests/live-fill-two-devices.js
   PURPOSE     Run whole calls of Live Session Mode with two simulated devices and scripted lines, with
               the live fill joined to the room (Parts 3, 4 and 5). (1) One scripted call fills a new
               profile, and the test compares the final profile with the expected one field by field.
               (2) The coach's device shows the same heard list, the same counter and the same pulse.
               (3) A line that the echo filter takes back is taken back on the profile too. (4) A
               "Confirming" with no answer ends by the timer of the room. (5) A client on a phone that
               cannot listen: nothing fills, and nothing breaks. (6) The client's page loads again in
               the middle of the call and keeps its list.
   INPUT       The game scripts (harness.cjs); account/live.js, liveio.js, livefill.js, liveland.js and
               livesim.js (the stand-ins), loaded here. No microphone, no network, no database.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: account/liveland.js (lfAttach), account/livefill.js,
               account/liveio.js (the hooks fill and hello), account/livesim.js (simGame, simScriptFill).
   ========================================================================= */
(async () => {
  const fs = require("fs"),
    vm = require("vm");
  ["account/live.js", "account/liveio.js", "account/livefill.js", "account/liveland.js", "account/livesim.js"].forEach(
    f => vm.runInThisContext(fs.readFileSync(GAME_DIR + f, "utf8"), { filename: f })
  );
  /* One coach, one new client with a new profile, one session, both tapped OK, Start pressed. */
  const live = async o => {
    const clock = simClock(),
      db = simDb(clock),
      hub = simHub(clock, 100);
    db.coaches.coach1 = true;
    const made = await db.as("coach1").inviteMake("Sam", "Dana"),
      used = await db.as("client1").inviteUse(made.data.token),
      sid = used.data.session.id,
      game = simGame(newChar({ name: "Sam" })),
      P = simPair(Object.assign({ clock, db, hub, sid, coach: "coach1", client: "client1", game }, o || {})),
      seen = { coach: [], client: [] };
    P.coach.R.hooks.fill.push(p => p.ev && seen.coach.push(p.ev.k));
    P.client.R.hooks.fill.push(p => p.ev && seen.client.push(p.ev.k));
    await P.coach.R.join();
    await P.client.R.join();
    await P.coach.R.act("ok");
    await P.client.R.act("ok");
    await P.coach.R.act("headphones", !(o && o.speakers));
    await P.client.R.act("headphones", !(o && o.speakers));
    await clock.run(300);
    await simReady(P);
    await P.coach.R.act("start");
    await clock.run(300);
    return { clock, db, hub, sid, P, game, c: game.c, seen };
  };
  const row = (c, sec, k) => (c[sec] || []).find(x => x.k === k);

  /* ---------- 1. the scripted call fills a new profile ---------- */
  {
    const { clock, db, sid, P, game, c, seen } = await live();
    chk(
      "before the first line the profile has no rows and no live data",
      c.led === false && c.incs.length === 0 && c.x.live.heard.length === 0
    );
    chk(
      "both devices have the live fill; only the client's device holds the game",
      P.client.R.fill.write === true && P.coach.R.fill.write === false
    );
    for (const l of simScriptFill()) {
      await clock.run(l[0]);
      P[l[1]].speech.say(l[2]);
    }
    await clock.run(6000);
    chk(
      "the call is 21 lines, each one saved as text (the live fill takes no line away)",
      db.lines.length === 21 && P.client.R.lines.length === 21
    );
    /* THE EXPECTED PROFILE, worked out by hand from the script.
       New profile: the game's first rows for "First job": in 3,600; out 1,250 / 600 / 450 / 300 / 450;
       Checking 300; no debt.
       "every two weeks, about two thousand one hundred each time": Every 2 weeks; 2,100 x 26 / 12 = 4,550.
       "Rent is eighteen fifty a month": Home 1,850; then "Confirming rent 1,850" + "Yes": Close.
       "400-ish, maybe 500" after groceries: the middle, 450, rough.
       "about three thousand two hundred" then "No wait, 3,400": the card is 3,400.
       "24.99 percent" after the rate on that card. "Between 3 and 4 thousand" in savings: 3,500.
       "Confirming the card balance 3,400" + "Actually it went up a little": no change, waiting.
       Three what-ifs: "If I moved ...", "What if you picked up ...", "Someday I want ...". */
    const want = [
      ["the pay rhythm", c.payFreq, "Every 2 weeks"],
      ["income, main job: amount", row(c, "incs", "A main job").amt, 4550],
      ["income, main job: a Guess", row(c, "incs", "A main job").s, false],
      ["income, main job: heard", row(c, "incs", "A main job").h, 1],
      ["income rows", c.incs.length, 1],
      ["money in each month", c.take, 4550],
      ["Home: amount", row(c, "spends", "Home").amt, 1850],
      ["Home: Close, confirmed out loud", row(c, "spends", "Home").s, true],
      ["Home: never Exact", row(c, "spends", "Home").cf, undefined],
      ["Food: amount", row(c, "spends", "Food").amt, 450],
      ["Food: a Guess", row(c, "spends", "Food").s, false],
      ["Getting around: the game's guess, not touched", row(c, "spends", "Getting around").amt, 450],
      ["Getting around: not heard", row(c, "spends", "Getting around").h, undefined],
      ["Bills and subscriptions: the game's guess", row(c, "spends", "Bills and subscriptions").amt, 300],
      ["Fun and everything else: the game's guess", row(c, "spends", "Fun and everything else").amt, 450],
      ["spending rows", c.spends.length, 5],
      ["money out each month: 1850 + 450 + 450 + 300 + 450", c.spend, 3500],
      ["Checking: the game's guess", row(c, "cashes", "Checking").amt, 300],
      ["Savings: amount", row(c, "cashes", "Savings").amt, 3500],
      ["Savings: a Guess", row(c, "cashes", "Savings").s, false],
      ["cash rows", c.cashes.length, 2],
      ["months of cushion: 3,800 / 3,500", Math.round(c.months * 1000), 1086],
      ["the card: amount", row(c, "debts", "Credit card balance").amt, 3400],
      ["the card: a Guess (the client said no to the Confirming)", row(c, "debts", "Credit card balance").s, false],
      ["the card: rate", row(c, "debts", "Credit card balance").rate, 24.99],
      ["the card: the rate is a Guess", row(c, "debts", "Credit card balance").ratecf, 0],
      ["the card: costly", row(c, "debts", "Credit card balance").high, true],
      ["debt rows", c.debts.length, 1],
      ["total debt", c.debt, 3400],
      ["costly debt", c.high, "yes"],
      ["invested rows", c.invs.length, 0],
      ["what-ifs", c.x.live.whatifs.length, 3],
      ["goals: a what-if adds none by itself", c.goals.length, 0],
      ["waiting for the next Confirming: the card", !!c.x.live.wait["debt:Credit card balance"], true],
      ["the first rows came from the call", c.x.live.fresh, true],
    ];
    want.forEach(w => chk("final profile, " + w[0] + ": " + w[2], w[1] === w[2], String(w[1])));
    const M = c.x.live.marks;
    chk(
      "each value that the call set has its record, and no other field has one",
      Object.keys(M).sort().join() ===
        "cash:Savings,debt:Credit card balance,inc:A main job,pay.freq,rate:Credit card balance,spend:Food/groceries,spend:Home/rent"
    );
    chk(
      "rough numbers are marked rough; the firm ones are not",
      M["inc:A main job"].rough &&
        M["spend:Food/groceries"].rough &&
        M["cash:Savings"].rough &&
        !M["debt:Credit card balance"].rough &&
        !M["rate:Credit card balance"].rough
    );
    chk("the correction kept both numbers", M["debt:Credit card balance"].all.map(a => a.v).join() === "3200,3400");
    chk(
      "the record of the rent is the spoken confirmation",
      M["spend:Home/rent"].lv === "close" &&
        M["spend:Home/rent"].by === "voice" &&
        M["spend:Home/rent"].yes.quote === "Yes."
    );
    chk(
      "the game works out its numbers from this profile with no defect",
      (() => {
        const d = derive(c);
        return isFinite(d.nw) && isFinite(d.era) && d.nw === 300 + 3500 - 3400;
      })()
    );
    const H = lfHeard(c, sid);
    chk(
      "the heard list, in order",
      H.map(x => x.st + ":" + (x.key || "")).join(" ") ===
        "filled:pay.freq filled:inc:A main job filled:spend:Home/rent filled:spend:Food/groceries corrected:debt:Credit card balance filled:debt:Credit card balance filled:rate:Credit card balance filled:cash:Savings confirmed:spend:Home/rent waiting:debt:Credit card balance whatif: whatif: whatif:",
      H.map(x => x.st + ":" + (x.key || "")).join(" ")
    );
    /* ---------- 2. the coach's device ---------- */
    chk(
      "the coach's device shows the same heard list",
      JSON.stringify(P.coach.R.fill.heard) === JSON.stringify(P.client.R.fill.heard) &&
        P.coach.R.fill.heard.length === 13
    );
    chk(
      'both devices show the same counter: "3 what-ifs heard"',
      P.coach.R.fill.n.line === "3 what-ifs heard" && P.client.R.fill.n.line === "3 what-ifs heard"
    );
    chk(
      "the event of the spoken confirmation reached both screens one time",
      seen.coach.filter(k => k === "confirmed").length === 1 && seen.client.filter(k => k === "confirmed").length === 1
    );
    chk(
      "both devices got the same events in the same order",
      seen.coach.join() === seen.client.join() && seen.coach.length === 15,
      seen.coach.join()
    );
    chk(
      "the device with the game saved after each line that changed something (14 lines)",
      game.saves === 14,
      String(game.saves)
    );
    chk(
      "the coach's device never got a copy of the profile: only the list",
      !("c" in P.coach.R.fill) && !P.coach.R.fill.S.last
    );
    const n = lfCounts(c, sid);
    chk(
      "the counts for the end of the call",
      n.heard === 12 && n.confirmed === 1 && n.whatifs === 3 && n.check === 11,
      JSON.stringify(n)
    );
    await P.coach.R.act("end");
    await clock.run(500);
    P.coach.R.leave();
    P.client.R.leave();
  }

  /* ---------- 3. a line that the echo filter takes back ---------- */
  {
    const { clock, P, c } = await live({ speakers: true });
    P.client.speech.say("I have 900 in checking.");
    await clock.run(6000);
    const before = JSON.stringify([c.incs, c.spends, c.cashes, c.debts]);
    /* the coach repeats a number; the client's microphone hears the speakers before the coach's line arrives */
    P.coach.speech.say("So your rent is 1,850 a month.");
    P.client.speech.say("So your rent is 1,850 a month.");
    chk("for a moment the client's device took the echo as the client's words", row(c, "spends", "Home").amt === 1850);
    await clock.run(500);
    chk(
      "the room took the echo back, and the profile is as it was before that line",
      JSON.stringify([c.incs, c.spends, c.cashes, c.debts]) === before &&
        row(c, "spends", "Home").amt === 1250 &&
        !row(c, "spends", "Home").h &&
        !c.x.live.marks["spend:Home/rent"]
    );
    const it = c.x.live.heard[c.x.live.heard.length - 1];
    chk(
      "the heard list says so",
      it.st === "kept" && it.why === "This line was an echo of the other side. Nothing changed." && it.echo === true
    );
    chk(
      "the value heard before the echo is still there",
      row(c, "cashes", "Checking").amt === 900 && !!c.x.live.marks["cash:Checking"]
    );
    chk(
      "the coach's device has the same list after that",
      JSON.stringify(P.coach.R.fill.heard) === JSON.stringify(P.client.R.fill.heard)
    );
    /* an echo that arrives after the coach's line never reaches the fill */
    P.coach.speech.say("And you owe 3,200 on the credit card.");
    await clock.run(300);
    P.client.speech.say("And you owe 3,200 on the credit card.");
    await clock.run(500);
    chk(
      "an echo that comes after the coach's line is dropped by the room before the fill reads it",
      c.debts.length === 0
    );
    P.coach.R.leave();
    P.client.R.leave();
  }

  /* ---------- 4. a Confirming with no answer ---------- */
  {
    const { clock, P, c, seen } = await live();
    P.client.speech.say("My rent is 1,850.");
    await clock.run(3000);
    P.coach.speech.say("Confirming rent 1,850.");
    await clock.run(9000);
    chk("9 seconds of silence: the question is still open", c.x.live.heard[1].st === "asked");
    await clock.run(2000);
    chk(
      "after 10 seconds the room closes it by itself: nothing changed, and the list says so",
      c.x.live.heard[1].st === "timeout" &&
        row(c, "spends", "Home").s === false &&
        row(c, "spends", "Home").amt === 1850
    );
    chk(
      "both screens got that",
      seen.coach.join() === "filled,asked,timeout" && P.coach.R.fill.heard[1].st === "timeout"
    );
    P.coach.R.leave();
    P.client.R.leave();
  }

  /* ---------- 5. the client's device cannot listen (a phone with a browser that has no recognizer) ---------- */
  {
    const { clock, db, P, c } = await live({ clientCan: false });
    for (const l of simScriptFill()) {
      await clock.run(l[0]);
      P[l[1]].speech.say(l[2]);
    }
    await clock.run(12000);
    chk("only the coach's lines exist", db.lines.length === 10 && db.lines.every(l => l.side === "coach"));
    chk(
      "no value is set from the coach's words: the profile has no rows",
      c.led === false && c.incs.length === 0 && Object.keys(c.x.live.marks).length === 0
    );
    chk(
      "the list has the coach's two Confirming lines with no answer, and the coach's what-if",
      c.x.live.heard.map(x => x.st).join() === "timeout,timeout,whatif",
      c.x.live.heard.map(x => x.st).join()
    );
    chk(
      "the coach's device shows the same",
      P.coach.R.fill.heard.map(x => x.st).join() === "timeout,timeout,whatif" &&
        P.coach.R.fill.n.line === "1 what-if heard"
    );
    P.coach.R.leave();
    P.client.R.leave();
  }

  /* ---------- 6. the client's page loads again ---------- */
  {
    const { clock, db, hub, sid, P, game, c } = await live();
    P.client.speech.say("My rent is 1,850.");
    await clock.run(3000);
    const store = P.client.store;
    P.client.R.leave();
    P.coach.R.leave();
    const P2 = simPair({
      clock,
      db,
      hub,
      sid,
      coach: "coach1",
      client: "client1",
      game,
      stores: { client: store },
      tag: "b",
    });
    await P2.client.R.join();
    await P2.coach.R.join();
    await clock.run(500);
    chk(
      "after a reload the client's device has its list from the profile",
      P2.client.R.fill.heard.length === 1 && P2.client.R.fill.heard[0].show === "$1,850"
    );
    chk(
      "a coach's device that joins late gets the whole list",
      P2.coach.R.fill.heard.length === 1 && P2.coach.R.fill.heard[0].key === "spend:Home/rent"
    );
    P2.client.speech.say("No wait, 1,900.");
    await clock.run(500);
    chk(
      "a reload ends the short memory of the call: a correction with no field named is not applied",
      row(c, "spends", "Home").amt === 1850
    );
    P2.client.speech.say("My rent is 1,900.");
    await clock.run(500);
    chk(
      "a line that names its field still lands, and both lists follow",
      row(c, "spends", "Home").amt === 1900 && P2.coach.R.fill.heard.map(x => x.st).join() === "corrected,filled"
    );
    P2.coach.R.leave();
    P2.client.R.leave();
  }
})();
