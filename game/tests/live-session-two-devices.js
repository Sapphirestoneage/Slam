/* ============================================================================
   SLAM the Game, test: tests/live-session-two-devices.js
   PURPOSE     Run whole sessions of Live Session Mode with two simulated devices and scripted lines,
               from the invite to End: the consent of both sides before Start, one Start, the lines of
               both devices saved as text with the right side, the echo filter (both settings, and two
               devices that cross), a crashed tab that loses nothing, a reload that joins the same
               session again and sends no line two times, speech recognition that the browser ends, a
               refused microphone with Reconnect, Pause, the wake lock, and a client on a phone with
               Safari that cannot listen.
   INPUT       account/live.js, account/liveio.js and account/livesim.js (the stand-ins), loaded here.
               No microphone, no network, no database: a clock that the test moves by hand.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: account/live.js, account/liveio.js, account/livesim.js.
   ========================================================================= */
(async () => {
  const fs = require("fs"),
    vm = require("vm");
  ["account/live.js", "account/liveio.js", "account/livesim.js"].forEach(f =>
    vm.runInThisContext(fs.readFileSync(GAME_DIR + f, "utf8"), { filename: f })
  );
  /* One coach, one new client, one invite, one session. */
  const setup = async o => {
    const clock = simClock(),
      db = simDb(clock),
      hub = simHub(clock, 100);
    db.coaches.coach1 = true;
    const made = await db.as("coach1").inviteMake("Sam", "Dana"),
      used = await db.as("client1").inviteUse(made.data.token),
      sid = used.data.session.id,
      P = simPair(Object.assign({ clock, db, hub, sid, coach: "coach1", client: "client1" }, o || {}));
    return { clock, db, hub, sid, P, token: made.data.token };
  };
  const texts = db => db.lines.map(l => l.side + ": " + l.body);

  /* ---------- 1. a whole call, both sides listen, headphones on ---------- */
  {
    const { clock, db, hub, sid, P } = await setup();
    await P.coach.R.join();
    await P.client.R.join();
    await clock.run(200);
    chk(
      "both devices are in the room",
      P.coach.R.here.client === true && P.client.R.here.coach === true && lvHere(P.coach.R.room, "client", clock.now())
    );
    chk(
      "the client who joined is tagged as the client of that coach",
      db.tags.length === 1 && db.tags[0].coach === "coach1" && db.tags[0].client === "client1"
    );
    chk(
      "before any OK the coach cannot start",
      (await P.coach.R.act("start")) === false && P.coach.R.room.state === "waiting"
    );
    await P.coach.R.act("ok");
    await clock.run(200);
    chk(
      "the client's device knows that the coach tapped OK, and Start is still off",
      lvOk(P.client.R.room, "coach") && !lvOk(P.client.R.room, "client") && (await P.coach.R.act("start")) === false
    );
    chk("the client cannot press Start", (await P.client.R.act("start")) === false);
    await P.client.R.act("ok");
    await P.client.R.act("headphones", true);
    await P.coach.R.act("headphones", true);
    await clock.run(200);
    chk(
      "both tapped OK: both devices show the stage ready",
      lvStage(P.coach.R.room) === "ready" && lvStage(P.client.R.room) === "ready"
    );
    chk(
      "nothing listens before Start",
      !P.coach.speech.running && !P.client.speech.running && P.coach.R.mic.status === "off"
    );
    P.coach.R.micCheck();
    chk(
      "the microphone step asks the browser one time and stops at once",
      P.coach.R.ready === "yes" && !P.coach.speech.running && P.coach.speech.starts === 1
    );
    P.coach.speech.running = true;
    P.coach.speech.say("words said during the check");
    P.coach.speech.running = false;
    chk("no word is kept before Start", P.coach.R.lines.length === 0 && db.lines.length === 0);
    const t0 = clock.now();
    await P.coach.R.act("start");
    await clock.run(200);
    chk(
      "one Start, and both devices listen",
      P.coach.R.room.state === "live" &&
        P.client.R.room.state === "live" &&
        P.coach.speech.running &&
        P.client.speech.running
    );
    chk(
      "both lights are green on both devices",
      P.coach.R.mic.status === "working" &&
        P.client.R.mic.status === "working" &&
        P.coach.R.their.status === "working" &&
        P.client.R.their.status === "working"
    );
    chk("the screen stays awake on both", P.coach.wake.held && P.client.wake.held);
    chk("a second Start does nothing", (await P.coach.R.act("start")) === false && P.coach.R.room.started_at === t0);
    const seen = [];
    P.coach.R.hooks.line.push(l => seen.push(l.side + ":" + l.text));
    for (const l of simScript()) {
      await clock.run(l[0]);
      P[l[1]].speech.say(l[2]);
    }
    await clock.run(200);
    P.client.speech.soft("words that are not final");
    chk(
      "words that are not final show faintly and are not a line",
      P.client.R.interim === "words that are not final" && P.client.R.lines.length === 7
    );
    await clock.run(6000);
    chk(
      "each line of both devices is in the database, as text, with the side of the device that heard it",
      db.lines.length === 7 &&
        db.lines.filter(l => l.side === "coach").length === 4 &&
        db.lines.filter(l => l.side === "client").length === 3 &&
        db.lines.every(
          l => typeof l.body === "string" && Object.keys(l).sort().join() === "at,body,by,id,session,side"
        ),
      texts(db).join(" | ")
    );
    chk(
      "each side wrote only its own lines",
      db.lines.every(l => l.by === (l.side === "coach" ? "coach1" : "client1"))
    );
    chk(
      "each device has all 7 lines, in the order they were said",
      P.coach.R.lines.length === 7 &&
        P.client.R.lines.length === 7 &&
        P.coach.R.lines.map(l => l.id).join() === P.client.R.lines.map(l => l.id).join()
    );
    chk(
      "the labels: the coach reads You for its own lines and Them for the client's",
      lvLabel(P.coach.R.lines[0].side, "coach") === "You" &&
        lvLabel(P.coach.R.lines[1].side, "coach") === "Them" &&
        lvLabel(P.client.R.lines[1].side, "client") === "You"
    );
    chk(
      "a later part gets each line through the hook, of both sides",
      seen.length === 7 && /^client:Rent is fourteen hundred/.test(seen[3])
    );
    chk(
      "nothing waits on a device after the save",
      P.coach.R.buf.lines.length === 0 && P.client.R.buf.lines.length === 0
    );
    chk(
      "the pill counts on both devices",
      /^Listening 0:2\d$/.test(lvPill(P.coach.R.room, clock.now())),
      lvPill(P.coach.R.room, clock.now())
    );
    /* the browser ends speech recognition by itself */
    const starts = P.client.speech.starts;
    P.client.speech.drop();
    chk("the browser ended listening: amber, and the coach sees it", P.client.R.mic.status === "restarting");
    await clock.run(150);
    chk(
      "it starts again by itself at once, and both lights are green again",
      P.client.speech.running &&
        P.client.speech.starts === starts + 1 &&
        P.client.R.mic.status === "working" &&
        P.coach.R.their.status === "working"
    );
    P.client.speech.drop("network");
    await clock.run(100);
    chk(
      "after an error it waits before the restart",
      !P.client.speech.running && P.client.R.mic.status === "restarting"
    );
    await clock.run(300);
    chk("then it listens again", P.client.speech.running && P.client.R.mic.status === "working");
    /* a refused microphone */
    P.client.speech.deny = true;
    P.client.speech.drop();
    await clock.run(600); /* no word was heard since the last error, so this restart waits 250 ms first */
    chk(
      "a refused microphone: stopped, no more tries, and the coach's screen shows it",
      P.client.R.mic.status === "stopped" && P.coach.R.their.status === "stopped" && !P.client.speech.running
    );
    const tries = P.client.speech.starts;
    await clock.run(20000);
    chk("stopped stays stopped until the person taps", P.client.speech.starts === tries);
    P.client.speech.deny = false;
    P.client.R.reconnect();
    await clock.run(200);
    chk(
      "one tap on Reconnect and it listens again",
      P.client.R.mic.status === "working" && P.client.speech.running && P.coach.R.their.status === "working"
    );
    /* pause, resume, end */
    await P.client.R.act("pause");
    await clock.run(200);
    chk(
      "Pause from the client stops listening on both devices",
      P.coach.R.room.state === "paused" &&
        !P.coach.speech.running &&
        !P.client.speech.running &&
        P.coach.R.mic.status === "off"
    );
    P.coach.speech.running = true;
    P.coach.speech.say("said while paused");
    P.coach.speech.running = false;
    chk("a word during the pause is not a line", P.coach.R.lines.length === 7);
    await clock.run(60000);
    await P.coach.R.act("resume");
    await clock.run(200);
    chk(
      "Resume: both listen again, with no second Start",
      P.client.R.room.state === "live" &&
        P.coach.speech.running &&
        P.client.speech.running &&
        P.coach.R.room.started_at === t0
    );
    P.client.speech.say("That is all for today.");
    await clock.run(500);
    await P.coach.R.act("end");
    await clock.run(4000);
    chk(
      "End: the session is ended for both, nothing listens, the screens can sleep",
      P.coach.R.room.state === "ended" &&
        P.client.R.room.state === "ended" &&
        !P.coach.speech.running &&
        !P.client.speech.running &&
        !P.coach.wake.held &&
        !P.client.wake.held
    );
    chk(
      "the last line, said just before End, is saved too",
      db.lines.length === 8 && db.lines[7].body === "That is all for today." && P.client.R.buf.lines.length === 0
    );
    chk(
      "after End nothing more can be done",
      (await P.coach.R.act("resume")) === false && (await P.client.R.act("start")) === false
    );
    chk(
      "the paused minute is not in the time of the call",
      /^Ended 0:\d\d$/.test(lvPill(P.coach.R.room, clock.now())),
      lvPill(P.coach.R.room, clock.now())
    );
    chk(
      "a person outside the session reads nothing of it",
      (await db.as("someone").session(sid)).data === null &&
        (await db.as("someone").lines(sid)).data.length === 0 &&
        (await db.as("coach2").sessions()).data.length === 0
    );
    chk(
      "a person outside cannot add a line, and a member cannot add a line as the other side",
      (
        await db
          .as("someone")
          .addLines([{ id: "x1", session: sid, side: "client", body: "x", at: "2026-01-01T00:00:00Z" }])
      ).ok === false &&
        (
          await db
            .as("coach1")
            .addLines([{ id: "x2", session: sid, side: "client", body: "x", at: "2026-01-01T00:00:00Z" }])
        ).ok === false &&
        db.lines.length === 8
    );
    chk("the signals carried no audio: each one is small text", hub.sent > 10);
    P.coach.R.leave();
    P.client.R.leave();
  }

  /* ---------- 2. the echo filter in a call ---------- */
  {
    const { clock, db, P } = await setup();
    await P.coach.R.join();
    await P.client.R.join();
    await P.coach.R.act("ok");
    await P.client.R.act("ok");
    await P.coach.R.act("headphones", true);
    await P.client.R.act("headphones", true);
    await P.coach.R.act("start");
    await clock.run(300);
    /* the client's speakers play the coach's voice: the client's device hears the same sentence 600 ms later */
    P.coach.speech.say("And what is your rent each month?");
    await clock.run(600);
    P.client.speech.say("and what is your rent each month");
    await clock.run(5000);
    chk(
      "normal setting: the sentence that both devices heard is kept one time, for the device that heard it first",
      db.lines.length === 1 &&
        db.lines[0].side === "coach" &&
        P.client.R.dropped === 1 &&
        P.client.R.lines.length === 1 &&
        P.coach.R.lines.length === 1,
      texts(db).join(" | ")
    );
    /* the real answer comes right after: different words, it stays */
    P.client.speech.say("Fourteen hundred a month.");
    await clock.run(5000);
    chk("the real answer right after it stays", db.lines.length === 2 && db.lines[1].side === "client");
    /* the same words after the window are a new line */
    P.coach.speech.say("So fourteen hundred a month.");
    await clock.run(2600);
    P.client.speech.say("So fourteen hundred a month.");
    await clock.run(5000);
    chk("the same words 2.6 seconds later are a line of their own", db.lines.length === 4);
    /* two people say a short word at the same time: both stay */
    P.coach.speech.say("Okay.");
    await clock.run(300);
    P.client.speech.say("Okay.");
    await clock.run(5000);
    chk("a short answer of both people is never dropped", db.lines.length === 6);
    /* the two devices cross: each sends its line before the line of the other arrives (100 ms on the way) */
    P.coach.speech.say("Any cards with a balance on them right now?");
    await clock.run(40);
    P.client.speech.say("any cards with a balance on them");
    await clock.run(5000);
    chk(
      "two devices that cross agree: the fuller line stays, the other one is taken back before it is saved",
      db.lines.length === 7 &&
        db.lines[6].side === "coach" &&
        /right now/.test(db.lines[6].body) &&
        P.client.R.lines.length === 7 &&
        P.coach.R.lines.length === 7,
      texts(db).slice(6).join(" | ")
    );
    /* a weak echo: with headphones on it is kept (2 of 5 words differ) */
    P.coach.speech.say("my rent is fourteen hundred");
    await clock.run(500);
    P.client.speech.say("my debt is fourteen thousand");
    await clock.run(5000);
    chk("normal setting: a line with 2 of 5 words different is kept", db.lines.length === 9);
    /* a side says: no headphones */
    await P.client.R.act("headphones", false);
    await clock.run(300);
    chk(
      "No headphones on one side turns on the stronger filter on both devices",
      lvEchoSet(P.coach.R.room) === LV_ECHO.strong && lvEchoSet(P.client.R.room) === LV_ECHO.strong
    );
    P.coach.speech.say("my rent is fourteen hundred");
    await clock.run(500);
    P.client.speech.say("my debt is fourteen thousand");
    await clock.run(6000);
    chk("strong setting: the same pair is one line now", db.lines.length === 10, texts(db).slice(9).join(" | "));
    P.coach.speech.say("I get paid every two weeks about two thousand");
    await clock.run(3000);
    P.client.speech.say("paid every two weeks");
    await clock.run(6000);
    chk("strong setting: half a sentence 3 seconds later is dropped too", db.lines.length === 11);
    P.client.speech.say("Yes.");
    await clock.run(300);
    P.coach.speech.say("Yes.");
    await clock.run(6000);
    chk("strong setting: one word of each person still stays", db.lines.length === 13);
    P.coach.R.leave();
    P.client.R.leave();
  }

  /* ---------- 3. a crash in the middle of the call, and a reload ---------- */
  {
    const { clock, db, hub, sid, P } = await setup();
    await P.coach.R.join();
    await P.client.R.join();
    await P.coach.R.act("ok");
    await P.client.R.act("ok");
    await P.coach.R.act("start");
    await clock.run(300);
    P.client.speech.say("I get paid every two weeks.");
    await clock.run(4000);
    chk("the first line is saved", db.lines.length === 1);
    /* the internet drops: the lines stay on the device */
    db.down = true;
    P.client.speech.say("About two thousand one hundred each time.");
    await clock.run(4000);
    P.client.speech.say("Rent is fourteen hundred.");
    await clock.run(4000);
    chk(
      "with no internet the lines wait on the device, in its storage, and the screen says so",
      db.lines.length === 1 &&
        P.client.R.buf.lines.length === 2 &&
        lvBufUnpack(P.client.store.get(lvBufKey(sid, "client")), sid, "client").lines.length === 2 &&
        /wait on this device/.test(P.client.R.msg)
    );
    /* the tab crashes: the controller is gone, the storage of the device stays */
    P.client.R.leave();
    const kept = P.client.store;
    db.down = false;
    const P2 = simPair({ clock, db, hub, sid, coach: "coach1", client: "client1", stores: { client: kept }, tag: "b" });
    await P2.client.R.join();
    await clock.run(500);
    chk(
      "after the reload the page is in the same session, and it is still live",
      P2.client.R.room.id === sid && P2.client.R.room.state === "live" && P2.client.speech.running
    );
    chk(
      "the lines that waited are sent: a crash in the middle of the call loses nothing",
      db.lines.length === 3 && P2.client.R.buf.lines.length === 0,
      texts(db).join(" | ")
    );
    chk("the reloaded page has each line of the session", P2.client.R.lines.length === 3);
    chk("there is still one Start", P2.client.R.room.started_at === P.coach.R.room.started_at);
    /* the database confirmed, and the answer was lost on the way: the device sends the same lines again */
    const writes = db.writes,
      again = P2.client.R.lines.map(l => lvLineRow(l, sid));
    await db.as("client1").addLines(again);
    chk(
      "no line is in the database two times: an id is taken one time",
      db.lines.length === 3 && db.writes === writes && new Set(db.lines.map(l => l.id)).size === 3
    );
    /* a save that is cut off: the lines stay until the database confirms */
    P2.client.speech.say("One card with three thousand two hundred on it.");
    db.down = true;
    await clock.run(4000);
    db.down = false;
    await clock.run(4000);
    chk(
      "a save that did not go through is sent again by itself",
      db.lines.length === 4 && P2.client.R.buf.lines.length === 0
    );
    /* End while a line still waits */
    db.down = true;
    P2.client.speech.say("That is everything.");
    await clock.run(100);
    db.down = false;
    await P.coach.R.act("end");
    await clock.run(4000);
    chk(
      "a line said just before End is saved after End",
      db.lines.length === 5 && P2.client.R.room.state === "ended" && P2.client.R.buf.lines.length === 0
    );
    /* the realtime link is off: the room still follows the database */
    P.coach.R.leave();
    P2.client.R.leave();
  }
  {
    const { clock, db, hub, P } = await setup();
    hub.down = true;
    await P.coach.R.join();
    await P.client.R.join();
    chk("with the live link off each screen knows it", P.coach.R.link === false && P.client.R.link === false);
    await P.coach.R.act("ok");
    await P.client.R.act("ok");
    await P.coach.R.act("start");
    chk("the client's device has not heard of Start yet", P.client.R.room.state === "waiting");
    await clock.run(31000);
    chk(
      "in 30 seconds it reads the room from the database and listens",
      P.client.R.room.state === "live" && P.client.speech.running
    );
    P.client.speech.say("Each side still saves its own lines.");
    await clock.run(6000);
    chk("and its lines are saved", db.lines.length === 1);
    P.coach.R.leave();
    P.client.R.leave();
  }

  /* ---------- 4. a client on a phone with Safari: that side cannot listen ---------- */
  {
    const { clock, db, P } = await setup({ clientCan: false });
    await P.coach.R.join();
    await P.client.R.join();
    await clock.run(300);
    chk(
      "the room knows that the client's browser cannot listen",
      P.coach.R.room.client_listens === false && P.coach.R.room.coach_listens === true
    );
    chk(
      "the coach reads: Their side can't listen in this browser",
      lvFallbackLine(P.coach.R.room, "coach").indexOf("Their side can't listen in this browser") === 0
    );
    chk(
      "the client reads a calm line too",
      /This browser can't listen/.test(lvFallbackLine(P.client.R.room, "client")) && P.client.R.mic.status === "cannot"
    );
    P.client.R.micCheck();
    chk("the microphone step does nothing on that device", P.client.speech.starts === 0 && P.client.R.ready === "");
    await P.client.R.act("ok");
    await P.coach.R.act("ok");
    await P.coach.R.act("headphones", false);
    await P.coach.R.act("start");
    await clock.run(300);
    chk(
      "the session starts and goes on with the coach's side only",
      P.coach.R.room.state === "live" &&
        P.client.R.room.state === "live" &&
        P.coach.speech.running &&
        P.client.speech.starts === 0 &&
        P.client.R.mic.status === "cannot"
    );
    P.coach.speech.say("What is your rent?");
    await clock.run(1000);
    P.coach.speech.say("Fourteen hundred, got it.");
    await clock.run(6000);
    chk(
      "the coach's lines are saved, and the client's screen has them",
      db.lines.length === 2 &&
        db.lines.every(l => l.side === "coach") &&
        P.client.R.lines.length === 2 &&
        lvLabel(P.client.R.lines[0].side, "client") === "Them"
    );
    chk("the client can still pause and end", (await P.client.R.act("pause")) === true);
    await clock.run(300);
    chk("and the coach's device stops listening", !P.coach.speech.running && P.coach.R.room.state === "paused");
    await P.client.R.act("end");
    await clock.run(4000);
    chk("End from the phone ends it for both", P.coach.R.room.state === "ended" && db.lines.length === 2);
    P.coach.R.leave();
    P.client.R.leave();
  }

  /* ---------- 5. before the database file has run ---------- */
  {
    const clock = simClock(),
      db = simDb(clock, { missing: true }),
      hub = simHub(clock, 100),
      P = simPair({ clock, db, hub, sid: "none", coach: "coach1", client: "client1" });
    const ok = await P.coach.R.join();
    chk(
      "with no tables the room does not open, says that it waits, and nothing throws",
      ok === false && P.coach.R.wait === true && P.coach.R.room === null && !P.coach.speech.running
    );
    chk("each step is a calm no", (await P.coach.R.act("ok")) === false && (await P.coach.R.flush(0)) === 0);
    P.coach.R.leave();
  }
})().catch(e => chk("the test ran to its end", false, e && e.stack));
