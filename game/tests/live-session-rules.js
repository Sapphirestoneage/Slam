/* ============================================================================
   SLAM the Game, test: tests/live-session-rules.js
   PURPOSE     Examine the rules of Live Session Mode that only work out values: the room (waiting, both
               tapped OK, live, paused, ended; Start only when both tapped OK; one Start for the whole
               call), the pill "Listening 23:14", the listening status and the restart of speech
               recognition, the lines kept on the device until the database confirms them, the labels
               You and Them, the echo filter with its two settings, and what a side says when its
               browser cannot listen.
   INPUT       account/live.js, loaded here, because only coach.html and session.html load it.
               No microphone, no network, no database.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: account/live.js.
   ========================================================================= */
{
  const fs = require("fs"),
    vm = require("vm");
  vm.runInThisContext(fs.readFileSync(GAME_DIR + "account/live.js", "utf8"), { filename: "account/live.js" });
  const T0 = 1700000000000,
    step = (room, side, what, at, flag) => lvRoomDo(room, side, what, at, flag);

  /* THE ROOM */
  let r = lvRoomNew("s1", "coachA", "clientB", T0);
  chk("a new room waits, and its stage is the consent", r.state === "waiting" && lvStage(r) === "consent");
  chk("Start is not possible before any OK", !lvCanStart(r, "coach") && !step(r, "coach", "start", T0).changed);
  chk("the line names both when nobody tapped", lvWaitLine(r, "coach") === "Still to tap OK: you and your client.");
  r = step(r, "coach", "ok", T0 + 1000).room;
  chk(
    "one OK is not enough: Start stays off, and the line says who is still to tap",
    !lvCanStart(r, "coach") &&
      !step(r, "coach", "start", T0 + 1500).changed &&
      lvWaitLine(r, "coach") === "Still to tap OK: your client. You tapped already." &&
      lvWaitLine(r, "client") === "Still to tap OK: you. Your coach tapped already."
  );
  chk(
    "the OK keeps its time and cannot be tapped two times",
    r.coach_ok_at === T0 + 1000 && !step(r, "coach", "ok", T0 + 9000).changed
  );
  r = step(r, "client", "ok", T0 + 2000).room;
  chk(
    "both tapped, but the client's microphone step is not done: Start waits, and the line says why",
    lvStage(r) === "ready" &&
      !lvCanStart(r, "coach") &&
      !step(r, "coach", "start", T0 + 2100).changed &&
      lvWaitLine(r, "coach") === "Both of you tapped OK. Waiting for them to allow the microphone."
  );
  chk(
    "the coach can go on with their side only",
    lvCanStart(r, "coach", true) && step(r, "coach", "start", T0 + 2100, true).room.state === "live"
  );
  r = step(r, "client", "mic", T0 + 2200, true).room;
  chk(
    "the microphone step is in the room; then the headphones question waits",
    r.client_mic === true && !lvCanStart(r, "coach") && /Using headphones/.test(lvClientWait(r))
  );
  r = step(r, "client", "headphones", T0 + 2300, true).room;
  chk(
    "a client whose browser cannot listen needs no microphone step",
    lvSetDone(Object.assign({}, r, { client_mic: null, client_listens: false }), "client") &&
      !lvSetDone(Object.assign({}, r, { client_mic: null, client_listens: true }), "client")
  );
  chk("both tapped: the stage is ready and the coach can start", lvStage(r) === "ready" && lvCanStart(r, "coach"));
  chk("the client cannot start", !lvCanStart(r, "client") && !step(r, "client", "start", T0 + 2500).changed);
  chk(
    "the line says so to each side",
    /Press Start/.test(lvWaitLine(r, "coach")) && /Your coach presses Start/.test(lvWaitLine(r, "client"))
  );
  chk("who tapped OK and when is in the room", r.coach_ok_at === T0 + 1000 && r.client_ok_at === T0 + 2000);
  r = step(r, "coach", "start", T0 + 3000).room;
  chk("Start makes the room live and keeps the time", r.state === "live" && r.started_at === T0 + 3000);
  chk(
    "there is one Start for the whole call",
    !step(r, "coach", "start", T0 + 4000).changed && !lvCanStart(r, "coach")
  );
  chk("the pill counts", lvPill(r, T0 + 3000 + 1394000) === "Listening 23:14", lvPill(r, T0 + 3000 + 1394000));
  const p1 = step(r, "client", "pause", T0 + 63000).room;
  chk("each side can pause", p1.state === "paused" && p1.paused_at === T0 + 63000);
  chk("the clock stands still while paused", lvPill(p1, T0 + 500000) === "Paused 1:00", lvPill(p1, T0 + 500000));
  chk("a pause of a paused room changes nothing", !step(p1, "coach", "pause", T0 + 70000).changed);
  const p2 = step(p1, "coach", "resume", T0 + 123000).room;
  chk(
    "resume goes on, and the paused minute does not count",
    p2.state === "live" && p2.paused_ms === 60000 && lvPill(p2, T0 + 183000) === "Listening 2:00"
  );
  chk(
    "Start does not run a second time after a pause",
    !step(p2, "coach", "start", T0 + 190000).changed && p2.started_at === T0 + 3000
  );
  const e1 = step(p2, "client", "end", T0 + 243000).room;
  chk(
    "each side can end",
    e1.state === "ended" && e1.ended_at === T0 + 243000 && lvPill(e1, T0 + 999000) === "Ended 3:00"
  );
  chk(
    "an ended room takes no step but 'seen'",
    ["ok", "start", "pause", "resume", "end", "headphones"].every(
      w => !step(e1, "coach", w, T0 + 300000, true).changed
    ) && step(e1, "coach", "seen", T0 + 300000).changed
  );
  const e2 = step(p1, "coach", "end", T0 + 93000).room;
  chk(
    "End from a pause counts the pause",
    e2.state === "ended" && e2.paused_ms === 30000 && lvElapsed(e2, T0 + 999999) === 60000
  );
  chk(
    "a person who is not a member changes nothing",
    !step(r, "visitor", "end", T0).changed && !step(null, "coach", "ok", T0).changed
  );
  chk("an unknown step changes nothing", !step(r, "coach", "delete", T0).changed);
  chk(
    "the clock: seconds, minutes, hours",
    lvClock(0) === "0:00" && lvClock(59999) === "0:59" && lvClock(3725000) === "1:02:05"
  );
  chk("before Start the pill says so", lvPill(lvRoomNew("s", "a", "b", T0), T0) === "Not started yet");
  chk(
    "in the room: 90 seconds after the last sign",
    lvHere(step(r, "client", "seen", T0).room, "client", T0 + 89000) &&
      !lvHere(step(r, "client", "seen", T0).room, "client", T0 + 91000) &&
      !lvHere(r, "client", T0)
  );
  chk(
    "a time can be a number or the text of a date",
    lvMs("2026-11-25T10:00:00Z") === Date.UTC(2026, 10, 25, 10) &&
      lvMs(5) === 5 &&
      lvMs(null) === null &&
      lvMs("x") === null
  );

  /* THE HEADPHONES AND THE ECHO SETTING */
  let h = lvRoomNew("s2", "a", "b", T0);
  chk("with no answer the echo filter is the normal one", lvEchoSet(h) === LV_ECHO.normal);
  h = step(h, "coach", "headphones", T0, true).room;
  chk("Yes keeps the normal one", h.coach_headphones === true && lvEchoSet(h) === LV_ECHO.normal);
  h = step(h, "client", "headphones", T0, false).room;
  chk("a No from one side turns on the stronger one", h.client_headphones === false && lvEchoSet(h) === LV_ECHO.strong);
  chk(
    "the numbers of the two settings",
    LV_ECHO.normal.ms === 2000 &&
      LV_ECHO.normal.share === 0.8 &&
      LV_ECHO.normal.minWords === 3 &&
      LV_ECHO.strong.ms === 4000 &&
      LV_ECHO.strong.share === 0.6 &&
      LV_ECHO.strong.minWords === 2 &&
      LV_ECHO.strong.inside === 0.8
  );

  /* THE LISTENING STATUS AND THE RESTART */
  let m = lvMicNew(true),
    o = lvMicOn(m, "begin");
  chk("before the room listens the light is off", lvLight(m).look === "off");
  chk("begin: start at once", o.mic.status === "restarting" && o.wait === 0);
  o = lvMicOn(o.mic, "start");
  chk(
    "the browser listens: working, green",
    o.mic.status === "working" && lvLight(o.mic).look === "green" && lvLight(o.mic).word === "Working"
  );
  o = lvMicOn(o.mic, "end");
  chk(
    "the browser ended it with no error: restart at once, amber",
    o.mic.status === "restarting" && o.wait === 0 && lvLight(o.mic).look === "amber"
  );
  const waits = [];
  let mm = lvMicOn(lvMicOn(lvMicNew(true), "begin").mic, "start").mic;
  for (let i = 0; i < 7; i++) {
    mm = lvMicOn(mm, "error", "network").mic;
    const e = lvMicOn(mm, "end");
    waits.push(e.wait);
    mm = lvMicOn(e.mic, "start").mic;
  }
  chk(
    "after each error in a row the wait grows, to 8 seconds at most",
    waits.join() === "250,500,1000,2000,4000,8000,8000",
    waits.join()
  );
  chk(
    "a heard word puts the count back to zero",
    lvMicOn(mm, "result").mic.errors === 0 && lvMicOn(lvMicOn(mm, "result").mic, "end").wait === 0
  );
  mm = lvMicOn(mm, "error", "no-speech").mic;
  const st = lvMicOn(mm, "end");
  chk(
    "after 8 errors in a row it stops, and no restart is planned",
    st.mic.status === "stopped" && st.wait === null && st.mic.why === "tries"
  );
  chk(
    "stopped has no red: a plain outline with the word",
    lvLight(st.mic).look === "outline" && lvLight(st.mic).word === "Stopped"
  );
  const deny = lvMicOn(lvMicOn(lvMicNew(true), "begin").mic, "error", "not-allowed");
  chk(
    "a refused microphone stops at once",
    deny.mic.status === "stopped" &&
      deny.wait === null &&
      /permission/.test(lvStopLine(deny.mic)) &&
      /Reconnect/.test(lvStopLine(deny.mic))
  );
  chk(
    "the end event after a stop plans no restart",
    lvMicOn(deny.mic, "end").wait === null && lvMicOn(deny.mic, "end").mic.status === "stopped"
  );
  const re = lvMicOn(deny.mic, "begin");
  chk(
    "Reconnect is one step: begin again",
    re.mic.status === "restarting" && re.wait === 0 && re.mic.errors === 0 && re.mic.why === ""
  );
  const halted = lvMicOn(lvMicOn(lvMicOn(lvMicNew(true), "begin").mic, "start").mic, "halt");
  chk(
    "Pause and End stop listening, and a late end event does not restart it",
    halted.mic.status === "off" &&
      lvMicOn(halted.mic, "end").wait === null &&
      lvMicOn(halted.mic, "end").mic.status === "off"
  );
  chk(
    "no microphone found is a real stop too",
    lvMicOn(lvMicOn(lvMicNew(true), "begin").mic, "error", "audio-capture").mic.status === "stopped"
  );
  chk(
    "the restart wait as numbers",
    lvRestartWait(0) === 0 && lvRestartWait(1) === 250 && lvRestartWait(3) === 1000 && lvRestartWait(20) === 8000
  );

  /* THE FALLBACK */
  const none = lvMicNew(false);
  chk(
    "a browser with no speech recognition cannot listen, whatever happens",
    none.status === "cannot" &&
      lvMicOn(none, "begin").wait === null &&
      lvMicOn(none, "begin").mic.status === "cannot" &&
      lvLight(none).word === "Can't listen"
  );
  chk(
    "lvCanListen reads the window",
    lvCanListen({ webkitSpeechRecognition: function () {} }) &&
      lvCanListen({ SpeechRecognition: function () {} }) &&
      !lvCanListen({}) &&
      !lvCanListen(null)
  );
  let f = step(
    step(lvRoomNew("s3", "a", "b", T0), "coach", "listens", T0, true).room,
    "client",
    "listens",
    T0,
    false
  ).room;
  chk(
    "the coach reads the exact line of the brief",
    lvFallbackLine(f, "coach").indexOf("Their side can't listen in this browser") === 0,
    lvFallbackLine(f, "coach")
  );
  chk(
    "the client reads that the session goes on with the coach's side",
    /This browser can't listen/.test(lvFallbackLine(f, "client")) &&
      /your coach's side only/.test(lvFallbackLine(f, "client"))
  );
  chk(
    "when both can listen there is no line",
    lvFallbackLine(step(f, "client", "listens", T0, true).room, "coach") === "" &&
      lvFallbackLine(lvRoomNew("s", "a", "b"), "coach") === ""
  );
  f = step(
    step(
      step(step(step(f, "coach", "ok", T0).room, "client", "ok", T0).room, "client", "headphones", T0, true).room,
      "coach",
      "start",
      T0
    ).room,
    "coach",
    "pause",
    T0 + 5
  ).room;
  chk(
    "the session goes on with one side: it starts and pauses as before",
    f.state === "paused" && f.client_listens === false
  );

  /* THE LINES ON THE DEVICE */
  const b = lvBufNew("s1", "client"),
    l1 = lvBufAdd(b, "id-1", "  Rent is   fourteen hundred. ", T0),
    l2 = lvBufAdd(b, "id-2", "One card.", T0 + 1000);
  chk(
    "a line is trimmed and gets the side of the device",
    l1.text === "Rent is fourteen hundred." && l1.side === "client" && l1.id === "id-1" && l1.at === T0
  );
  chk(
    "an empty line and a line with no id are not kept",
    lvBufAdd(b, "id-3", "   ", T0) === null && lvBufAdd(b, "", "words", T0) === null && b.lines.length === 2
  );
  chk(
    "the same id is one line",
    lvBufAdd(b, "id-1", "Rent is fourteen hundred.", T0 + 5) === l1 && b.lines.length === 2
  );
  chk(
    "a line waits for the echo window before it is due",
    lvBufDue(b, T0 + 2000, 2000)
      .map(l => l.id)
      .join() === "id-1" && lvBufDue(b, T0 + 3000, 2000).length === 2
  );
  chk("with no hold each line is due", lvBufDue(b, T0 + 1000, 0).length === 2);
  const packed = lvBufPack(b),
    back = lvBufUnpack(packed, "s1", "client");
  chk(
    "the buffer goes to the storage of the device and back",
    back.lines.length === 2 &&
      back.lines[0].id === "id-1" &&
      back.lines[1].text === "One card." &&
      back.side === "client"
  );
  chk(
    "the text of a different session, a different side, or a damaged text gives an empty buffer",
    lvBufUnpack(packed, "s2", "client").lines.length === 0 &&
      lvBufUnpack(packed, "s1", "coach").lines.length === 0 &&
      lvBufUnpack("{oops", "s1", "client").lines.length === 0 &&
      lvBufUnpack(null, "s1", "client").lines.length === 0
  );
  chk(
    "a confirmed line leaves the buffer, the others stay",
    lvBufConfirm(b, ["id-1", "id-9"]) === 1 && b.lines.length === 1 && b.lines[0].id === "id-2"
  );
  chk(
    "the echo filter can take a waiting line back",
    lvBufDrop(b, "id-2") === true && lvBufDrop(b, "id-2") === false && b.lines.length === 0
  );
  const row = lvLineRow(l1, "s1");
  chk(
    "a line as a database row: its own id, the session, the side, the text, the time",
    row.id === "id-1" &&
      row.session === "s1" &&
      row.side === "client" &&
      row.body === "Rent is fourteen hundred." &&
      row.at === new Date(T0).toISOString() &&
      Object.keys(row).length === 5
  );
  chk("and back", lvRowLine(row).text === l1.text && lvRowLine(row).at === T0 && lvRowLine(row).side === "client");
  chk("the storage key has the session and the side", lvBufKey("s1", "coach") === "slam_live_buf_s1_coach");
  chk(
    "a long line is cut at 2000 letters",
    lvBufAdd(lvBufNew("s", "coach"), "x", "a".repeat(3000), T0).text.length === 2000
  );

  /* YOU AND THEM */
  chk(
    "the label comes from the device that heard the line",
    lvLabel("coach", "coach") === "You" &&
      lvLabel("client", "coach") === "Them" &&
      lvLabel("coach", "client") === "Them" &&
      lvLabel("client", "client") === "You"
  );
  const merged = lvMerge(
    [{ id: "b", side: "coach", text: "two", at: 2 }],
    [
      { id: "a", side: "client", text: "one", at: 1 },
      { id: "b", side: "coach", text: "two", at: 2 },
    ]
  );
  chk("lines merge with no id two times, the oldest first", merged.map(l => l.id).join() === "a,b");
  chk(
    "how a side names a side",
    lvWho("coach", "coach") === "You" &&
      lvWho("coach", "client") === "Your coach" &&
      lvWho("client", "coach") === "Your client" &&
      lvOther("coach") === "client"
  );

  /* THE ECHO FILTER */
  const N = LV_ECHO.normal,
    S = LV_ECHO.strong;
  chk(
    "words: small letters, no punctuation",
    lvWords("What's your RENT, again?").join(" ") === "whats your rent again" && lvWords("  ").length === 0
  );
  chk(
    "the same words after that are the same line",
    lvAlike("What's your rent?", "whats your rent").same === true &&
      lvAlike("What's your rent?", "whats your rent").share === 1
  );
  chk(
    "the share of shared words, as a number",
    lvAlike("one two three four five", "one two three four six").share === 0.8 &&
      lvAlike("a b c d", "e f g h").share === 0
  );
  chk("a word counts as often as it is in both lines", lvAlike("no no no", "no").share === 0.5);
  chk("normal: the same sentence is an echo", lvNear("What is your rent?", "what is your rent", N));
  chk(
    "normal: one different word in five is still an echo (0.8)",
    lvNear("my rent is fourteen hundred", "my rent is fourteen thousand", N)
  );
  chk(
    "normal: two different words in five is not (0.6)",
    !lvNear("my rent is fourteen hundred", "my debt is fourteen thousand", N)
  );
  chk(
    "normal: a short answer is never dropped, even when both say it",
    !lvNear("Yes.", "yes", N) && !lvNear("okay then", "Okay then", N)
  );
  chk("strong: 0.6 is enough", lvNear("my rent is fourteen hundred", "my debt is fourteen thousand", S));
  chk(
    "strong: two same words are an echo, one word is not",
    lvNear("okay then", "Okay then", S) && !lvNear("Yes.", "yes", S)
  );
  chk(
    "strong: half a sentence inside the whole sentence is an echo",
    lvNear("I get paid every two weeks about two thousand", "paid every two weeks", S) &&
      !lvNear("I get paid every two weeks about two thousand", "paid every two weeks", N)
  );
  chk("strong: different sentences stay", !lvNear("I get paid every two weeks", "what about your car loan", S));
  const others = [{ id: "r1", side: "coach", text: "And what is your rent?", t: T0 }];
  chk(
    "a line is an echo when nearly the same words arrived in the last 2 seconds",
    lvEchoOf("and what is your rent", T0 + 1900, others, N) === others[0]
  );
  chk("after 2 seconds it is a new line", lvEchoOf("and what is your rent", T0 + 2100, others, N) === null);
  chk(
    "the strong setting looks back 4 seconds",
    lvEchoOf("and what is your rent", T0 + 3900, others, S) === others[0] &&
      lvEchoOf("and what is your rent", T0 + 4100, others, S) === null
  );
  chk(
    "different words in the window are not an echo",
    lvEchoOf("fourteen hundred a month", T0 + 500, others, N) === null && lvEchoOf("x", T0, [], N) === null
  );
  const A = { id: "a", side: "coach", text: "What is your rent each month?", at: T0 + 300 },
    B = { id: "b", side: "client", text: "what is your rent", at: T0 + 100 };
  chk(
    "two devices crossed: the line with more words stays, for both",
    lvEchoKeep(A, B) === A && lvEchoKeep(B, A) === A
  );
  const C = { id: "c", side: "client", text: "what is your rent each month", at: T0 + 100 };
  chk("the same number of words: the line heard first stays", lvEchoKeep(A, C) === C && lvEchoKeep(C, A) === C);
  chk("the same time too: the coach's line stays", lvEchoKeep(A, Object.assign({}, C, { at: A.at })) === A);

  /* THE WORDS OF THE BRIEF */
  chk(
    "the consent text is the text of the brief",
    LV_CONSENT ===
      "This session is transcribed. Text only, no audio is saved. After the call it is processed by AI to fill in your profile."
  );
  chk(
    "the line of the invite screen is the line of the brief",
    LV_JOIN_LINE === "Join the call from a laptop with Chrome, and use headphones if you can."
  );
  chk("the lines go to the database each 3 seconds", LV_FLUSH_MS === 3000 && LV_INVITE_DAYS === 7);
}
