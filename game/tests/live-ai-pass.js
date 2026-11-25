/* ============================================================================
   SLAM the Game, test: tests/live-ai-pass.js
   PURPOSE     Live Session Mode, Parts 8 and 9: the AI pass after the call (behind its own switch) and
               "Delete this transcript". (1) The switch AI_PASS_READY is off in the code, and with it off the
               review has no AI button and still works. (2) The recorder's text file: read with and without
               "Speaker 1 / Speaker 2", with named speakers, with times; a size cap. (3) Which speaker is the
               coach: labels in the right order, swapped labels, no labels, a file of another call, and the
               coach's tap. (4) The parser of the answer: a good answer, junk dropped, a refusal. (5) The merge:
               the proposals enter the SAME review as kept items from "the AI pass" or "the Samsung file", not
               sure first, nothing applied before Approve; Approve lands the number as a Guess; a value the
               person entered stays; "Approve all" leaves the not-sure ones; what-if types are suggestions
               until Approve. (6) A whole pass with a stand-in for the Edge Function (never the real API): what
               is sent (no transcript words, only the optional file), the save through cpSaveGame, the token
               count, the reminder, the draft notes saved into coach_notes only on Save. (7) Delete this
               transcript, for the coach and for the client: the lines go from the database (only the two
               members, only after End), the quotes go from the profile, the values and records stay, and the
               line "Transcript deleted on". (8) No API key anywhere in the repository; the Edge Function reads
               its key from its own secret. (9) The consent screen's added line.
   INPUT       The game scripts (harness.cjs); the live files, loaded here. Stand-ins (livesim.js: simDb, simHub,
               simSb, simAi).
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: account/liveai.js, account/liveforget.js, account/livereview.js,
               account/livegame.js (act of each side), account/liveio.js (R.forget), supabase/functions/
               live-ai-pass/index.ts, supabase/migrations/20261125210000_live_sessions.sql.
   ========================================================================= */
(async () => {
  const fs = require("fs"),
    path = require("path"),
    vm = require("vm"),
    { execSync } = require("child_process");
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
    "account/liveai.js",
    "account/liveforget.js",
  ].forEach(f => vm.runInThisContext(fs.readFileSync(GAME_DIR + f, "utf8"), { filename: f }));
  const ROOT = path.join(GAME_DIR, ".."),
    read = f => fs.readFileSync(path.join(ROOT, f), "utf8"),
    settle = async () => {
      for (let i = 0; i < 40; i++) await Promise.resolve();
    },
    row = (c, sec, k) => (c[sec] || []).find(x => x.k === k);

  /* ---------- 1. the switch ---------- */
  chk(
    "the switch of the AI pass is off in the code, next to the switch of Live Session Mode",
    /let LIVE_SESSION_READY = false;[\s\S]{0,600}let AI_PASS_READY = false;/.test(read("game/account/liveflag.js")) &&
      AI_PASS_READY === false &&
      aiOn() === false
  );
  LIVE_SESSION_READY = true;
  chk("with Live Session Mode on and the AI switch off, aiOn is false", aiOn() === false);

  /* A whole call, then End (the same steps as tests/live-review.js). */
  const ended = async o => {
    o = o || {};
    const clock = simClock(),
      db = simDb(clock),
      hub = simHub(clock, 100),
      sb = simSb(clock);
    db.coaches.coach1 = true;
    sb.coaches.coach1 = true;
    if (o.before) {
      const own = newChar({ name: "Sam" });
      own.goals = [];
      applyTypical(own);
      o.before(own);
      CP.sb = sb.as("client1");
      await cpSaveGame(
        "client1",
        g => g,
        () => Object.assign(lgFirst("Sam"), { chars: [own] })
      );
    }
    const made = await db.as("coach1").inviteMake("Sam", "Dana"),
      used = await db.as("client1").inviteUse(made.data.token),
      sid = used.data.session.id,
      P = simPair({ clock, db, hub, sid, coach: "coach1", client: "client1", sb, name: "Sam" });
    await P.coach.R.join();
    await P.client.R.join();
    await P.client.R.game.ready;
    for (const s of ["coach", "client"]) {
      await P[s].R.act("ok");
      await P[s].R.act("headphones", true);
    }
    await simReady(P);
    await clock.run(300);
    await P.coach.R.act("start");
    await clock.run(300);
    for (const l of simScriptFill()) {
      await clock.run(l[0]);
      P[l[1]].speech.say(l[2]);
    }
    await clock.run(3000);
    await settle();
    await P.coach.R.act("end");
    await clock.run(3000);
    await settle();
    return { clock, db, hub, sb, sid, P, R: P.coach.R, RC: P.client.R };
  };
  const tap = async (R, a, v, k) => {
    await livePartClick(a, { dataset: { a, v, k } }, R);
    await settle();
  };

  {
    const T = await ended(),
      h = livePartEnded(T.R);
    chk(
      "switch off: the review has no AI button and no drop-in, and the rest of the review is there",
      !/data-a="lai|laifile|Drop in your recording/.test(h) &&
        /Check what was heard/.test(h) &&
        /data-a="rvall"/.test(h)
    );
    chk("switch off: no draft notes card", laiNotesHTML(T.R) === "" && laiCardHTML(T.R, T.R.game.get()) === "");
    T.R.leave();
    T.RC.leave();
  }

  /* ---------- 2. the recorder's text file ---------- */
  const app = [
    { side: "coach", text: "Thanks for joining. How often do you get paid?" },
    { side: "client", text: "I get paid every two weeks, about two thousand one hundred each time." },
    { side: "coach", text: "And what is your rent?" },
    { side: "client", text: "Rent is eighteen fifty a month." },
    { side: "coach", text: "What about groceries?" },
    { side: "client", text: "400-ish, maybe 500." },
    { side: "coach", text: "Any cards with a balance?" },
    { side: "client", text: "One card, about three thousand two hundred on it." },
    { side: "coach", text: "How much is in savings?" },
    { side: "client", text: "Between 3 and 4 thousand." },
  ];
  const labeled = (first, second) =>
    [
      first + "  00:01",
      "Thanks for joining. How often do you get paid?",
      "",
      second + "  00:05",
      "I get paid every two weeks, about two thousand one hundred each time.",
      first + "  00:12",
      "And what is your rent?",
      second + "  00:15",
      "Rent is eighteen fifty a month.",
      first + "  00:20",
      "What about groceries?",
      second + "  00:22",
      "Four hundred ish, maybe 500.",
      first + "  00:30",
      "Any cards with a balance?",
      second + "  00:33",
      "One card, about three thousand two hundred on it.",
      second + "  00:40",
      "Checking has about twelve hundred.",
      first + "  00:45",
      "How much is in savings?",
      second + "  00:48",
      "Between 3 and 4 thousand.",
    ].join("\r\n");
  {
    const F = laiFileRead("﻿" + labeled("Speaker 1", "Speaker 2"));
    chk(
      "a file with labels on their own lines: each line with its speaker, the times left out",
      F.ok &&
        F.labeled &&
        F.labels.join() === "Speaker 1,Speaker 2" &&
        F.lines.length === 11 &&
        F.lines[0].spk === "Speaker 1" &&
        F.lines[1].spk === "Speaker 2" &&
        !F.lines.some(l => /00:/.test(l.text)),
      F
    );
    const G = laiFileRead(
      "Speaker 1: Thanks for joining.\nSpeaker 2 (00:04): I get paid every two weeks.\nspeaker 2 - And more."
    );
    chk(
      "labels in front of the words, with or without a time, any letter case",
      G.ok &&
        G.lines.length === 3 &&
        G.lines[1].spk === "Speaker 2" &&
        G.lines[2].spk === "Speaker 2" &&
        G.labels.length === 2,
      G
    );
    const N = laiFileRead("Eli 00:01\nThanks for joining.\nSam 00:04\nI get paid every two weeks.");
    chk(
      "speakers with names given in the recorder",
      N.ok && N.labels.join() === "Eli,Sam" && N.lines[1].spk === "Sam",
      N
    );
    const U = laiFileRead(app.map(l => l.text).join("\n"));
    chk(
      "a file with no labels: each line is a line, with no speaker",
      U.ok && !U.labeled && U.lines.length === 10 && U.lines.every(l => l.spk === null)
    );
    chk("an empty file says so", !laiFileRead("\n\n  \n").ok && /No words/.test(laiFileRead("").why));
    chk(
      "a file over the cap is not read",
      !laiFileRead("a".repeat(LAI.FILE_MAX + 1)).ok && /300 KB/.test(laiFileRead("a".repeat(LAI.FILE_MAX + 1)).why)
    );
    chk("a file that is not text is not read", !laiFileRead("\u0000\u0001\u0002PK").ok);
  }

  /* ---------- 3. who is who ---------- */
  {
    const M = laiMatch(laiFileRead(labeled("Speaker 1", "Speaker 2")).lines, app);
    chk(
      "Speaker 1 is the coach: the mapping is found, and it is sure",
      M.fits &&
        M.sure &&
        M.map["Speaker 1"] === "coach" &&
        M.map["Speaker 2"] === "client" &&
        M.conf === 1 &&
        M.matched >= 8,
      M
    );
    const S = laiMatch(laiFileRead(labeled("Speaker 2", "Speaker 1")).lines, app);
    chk(
      "swapped labels (the recorder called the coach Speaker 2): the mapping turns round",
      S.sure && S.map["Speaker 2"] === "coach" && S.map["Speaker 1"] === "client",
      S.map
    );
    chk(
      "a line only the file has (Checking) gets the side of its speaker",
      M.lines.find(l => /Checking/.test(l.text)).side === "client" && !M.lines.find(l => /Checking/.test(l.text)).hit
    );
    const U = laiMatch(laiFileRead(app.map(l => l.text).join("\n")).lines, app);
    chk(
      "no labels: each line that matches gets the side of the call, and there is no mapping to set",
      !U.labeled && U.map === null && U.fits && U.lines.filter(l => l.hit).every((l, i) => l.side === app[l.n].side),
      U
    );
    const X = laiMatch(
      laiFileRead(
        "Speaker 1 00:01\nWelcome to the cooking show, today we bake bread.\nSpeaker 2 00:05\nFirst we mix the flour and the water slowly.\nSpeaker 1 00:09\nThen the dough rests for one full hour."
      ).lines,
      app
    );
    chk(
      "a file of another recording: it does not fit, and the mapping is not sure",
      !X.fits && !X.sure && X.matched === 0,
      X
    );
    const H = laiMapSet(X, "Speaker 2");
    chk(
      "the coach taps which speaker they are: that one is the coach, the other the client",
      H.sure &&
        H.byHand &&
        H.map["Speaker 2"] === "coach" &&
        H.map["Speaker 1"] === "client" &&
        H.lines[0].side === "client"
    );
    const half = laiMatch(
      laiFileRead(labeled("Speaker 1", "Speaker 2")).lines.map(l =>
        l.spk === "Speaker 2" && /groceries|savings|Checking/.test(l.text) ? l : l
      ),
      app.slice(0, 4)
    );
    chk(
      "a call heard only in part still maps the speakers it saw",
      half.map && half.map["Speaker 1"] === "coach",
      half
    );
    const t = laiFileText(M);
    chk(
      "the text that goes to the pass names Coach and Client, not the recorder's labels",
      /^Coach: Thanks for joining/.test(t.text) &&
        /\nClient: Rent is eighteen fifty/.test(t.text) &&
        !/Speaker 1/.test(t.text)
    );
    chk(
      "the file text is never cut silently: too long says so",
      !!laiFileText({ lines: [{ side: "client", text: "x".repeat(LAI.SEND_MAX) }] }).why
    );
  }

  /* ---------- 4. the parser of the answer ---------- */
  {
    const P = laiParse({
      ok: true,
      model: "m",
      usage: { input_tokens: 15840, output_tokens: 2310 },
      result: {
        fields: [
          {
            field: "spend:Home/rent",
            value: "$1,850",
            rough: false,
            per: "month",
            quote: "Rent is 1,850.",
            speaker: "client",
            source: "app",
          },
          {
            field: "no:such field",
            value: "5",
            rough: false,
            per: "none",
            quote: "",
            speaker: "client",
            source: "app",
          },
          {
            field: "rate:Credit card balance",
            value: "99",
            rough: false,
            per: "none",
            quote: "",
            speaker: "client",
            source: "app",
          },
          {
            field: "pay.freq",
            value: "every 2 weeks",
            rough: false,
            per: "none",
            quote: "every two weeks",
            speaker: "client",
            source: "app",
          },
          {
            field: "names:Credit card balance",
            value: "Chase",
            rough: false,
            per: "none",
            quote: "",
            speaker: "client",
            source: "app",
          },
          {
            field: "cash:Savings",
            value: "about a lot",
            rough: true,
            per: "none",
            quote: "",
            speaker: "client",
            source: "app",
          },
        ],
        whatif_types: [
          { id: "w1", type: "goal" },
          { id: "w2", type: "dream" },
        ],
        notes: "Rent is 1,850 " + String.fromCharCode(8212) + " firm.",
        agenda: { changed: ["a"], problems: ["1", "2", "3", "4"], ask_next: ["q"] },
      },
    });
    chk(
      "a good answer: each value checked, junk dropped, the token counts kept",
      P.ok &&
        P.fields.length === 2 &&
        P.fields[0].v === 1850 &&
        P.fields[1].v === "Every 2 weeks" &&
        P.bad === 5 &&
        P.whatifs.length === 1 &&
        P.tokens.in === 15840 &&
        P.tokens.out === 2310,
      P
    );
    chk(
      "the notes lose an em dash, and the agenda keeps at most 3 problems",
      P.notes.indexOf(String.fromCharCode(8212)) < 0 && P.agenda.problems.length === 3
    );
    const N = laiParse({
      ok: false,
      error: "refusal",
      message: "The AI declined this call. Nothing was changed.",
      usage: { input_tokens: 9 },
    });
    chk(
      "an answer that is not ok: its calm words, and nothing to merge",
      !N.ok && N.code === "refusal" && /Nothing was changed/.test(N.why) && N.tokens.in === 9
    );
    chk("no answer at all", !laiParse(null).ok && !laiParse("text").ok);
    chk(
      "the tokens line rounds to the hundred",
      laiTokensLine({ in: 15840, out: 2310 }) === "About 18,200 tokens (15,800 in, 2,300 out)"
    );
  }

  /* ---------- 5 and 6. a whole pass, with a stand-in for the Edge Function ---------- */
  AI_PASS_READY = true;
  chk("with both switches on, aiOn is true", aiOn() === true);
  {
    const T = await ended({
        before: own => {
          /* the phone bill was entered by the person: the AI pass never changes it */
          const r = row(own, "spends", "Bills and subscriptions");
          if (r) {
            r.amt = 95;
            r.s = true;
          }
        },
      }),
      R = T.R,
      c0 = () => R.game.get(),
      G = simAi(simAiReply);
    R.aiFn = G.fn;
    let h = livePartEnded(R);
    chk(
      "switch on: the AI card with the drop-in button under the summary, before the groups",
      /Drop in your recording's text file/.test(h) &&
        /type="file" accept=".txt,text\/plain"/.test(h) &&
        h.indexOf("Drop in your recording") > h.indexOf("to check.") &&
        h.indexOf("Drop in your recording") < h.indexOf("By area") &&
        /data-a="lairun">Run the AI pass</.test(h) &&
        clean(h),
      junk(h)
    );
    /* the coach drops in the recorder's file */
    await laiFileTake(R, { name: "Voice 001.txt", size: 900, text: async () => labeled("Speaker 2", "Speaker 1") });
    h = livePartEnded(R);
    chk(
      "the file is read on this device and the speakers are matched to the call",
      R.ai.match.sure &&
        R.ai.match.map["Speaker 2"] === "coach" &&
        /<b>Speaker 2<\/b> is you/.test(h) &&
        /data-a="laiout"/.test(h),
      R.ai.match && R.ai.match.map
    );
    await laiFileTake(R, { name: "big.txt", size: LAI.FILE_MAX + 5, text: async () => "" });
    chk(
      "a file over the cap is refused before it is read",
      R.ai.file && !R.ai.file.ok && /300 KB/.test(livePartEnded(R))
    );
    await laiFileTake(R, { name: "Voice 001.txt", size: 900, text: async () => labeled("Speaker 2", "Speaker 1") });

    const before = JSON.stringify(c0().spends),
      saves = T.sb.writes;
    await tap(R, "lairun");
    chk("one request for one pass", G.calls === 1);
    const body = G.last,
      said = simScriptFill().map(l => l[2]);
    chk(
      "the request names the session, the fields and the what-ifs by id; the words of the call are NOT sent (the function reads them itself)",
      body.sid === T.sid &&
        body.fields.length > 20 &&
        !body.fields.some(f => f.kind === "names") &&
        body.whatifs.length === lfWhatifs(c0(), T.sid).length &&
        body.whatifs.every(w => Object.keys(w).join() === "id,line") &&
        !said.some(s => JSON.stringify(Object.assign({}, body, { file: "" })).includes(s)),
      Object.keys(body)
    );
    chk(
      "the file goes with its speakers set by the match",
      /^Coach: Thanks for joining/.test(body.file) && /Client: Checking has about twelve hundred\./.test(body.file)
    );
    chk("the proposals were saved into the client's game through cpSaveGame", T.sb.writes > saves);
    const L = lfStore(c0()),
      ai = L.heard.filter(x => x.src);
    chk(
      "the proposals are kept items of the heard list, from the AI pass or the Samsung file, and nothing was applied",
      ai.length >= 3 &&
        ai.every(x => x.st === "kept" && x.sid === T.sid) &&
        ai.some(x => x.src === "file") &&
        ai.some(x => x.src === "ai") &&
        JSON.stringify(c0().spends) === before,
      ai.map(x => [x.key, x.src, x.st])
    );
    chk(
      "a proposal the profile already holds adds nothing (the rent 1,850 heard live)",
      !ai.some(x => x.key === "spend:Home/rent") && laiPasses(c0(), T.sid)[0].same >= 1
    );
    const phone = ai.find(x => x.key === "spend:Bills and subscriptions/phone");
    chk(
      "a number that only the coach said, on a line the person entered: not sure, protected, with the reason",
      phone &&
        phone.unsure &&
        /You already entered this\./.test(phone.why) &&
        /Only you said this number\./.test(phone.why),
      phone
    );
    h = livePartEnded(R);
    chk(
      "the review shows where each came from: the AI pass and the Samsung file",
      /From the AI pass/.test(h) &&
        /From the Samsung file/.test(h) &&
        /The AI pass proposed \d+ things?\./.test(h) &&
        clean(h),
      junk(h)
    );
    chk(
      "the coach view shows the rough token count of the pass, and the reminder about the phone",
      /Pass 1, [^<]*<\/b> About 18,200 tokens \(15,800 in, 2,300 out\)/.test(h) &&
        /Delete the recording from your phone\./.test(h),
      (h.match(/Pass 1[^<]*<\/b>[^<]*/) || [""])[0]
    );
    const acc = lrvGroups(c0(), T.sid).find(g => g.area === "accounts").check;
    chk(
      "in a group the proposals that are not sure come first",
      acc.length > 0 && acc[0].unsure && acc.findIndex(x => !x.unsure) < 0
        ? true
        : acc.findIndex(x => x.unsure) <= acc.findIndex(x => !x.unsure) || acc.every(x => x.unsure),
      acc.map(x => [x.key, !!x.unsure])
    );
    /* Approve one: the number lands as a Guess */
    const ins = ai.find(x => x.key === "spend:Getting around/car insurance");
    chk(
      "before Approve, the car insurance is not on the profile",
      !(lfStore(c0()).rows["spends:Getting around"] || { parts: {} }).parts["car insurance"]
    );
    await tap(R, "rvok", ins.id);
    const ga = row(c0(), "spends", "Getting around"),
      rec = lrvBook(c0())[ins.id];
    chk(
      "Approve a proposal: its number lands as a Guess, never Close or Exact, with who and when",
      rec &&
        rec.st === "fixed" &&
        rec.how === "ai" &&
        rec.v === 140 &&
        ga &&
        ga.s === false &&
        (ga.cf || 0) < 3 &&
        lfStore(c0()).rows["spends:Getting around"].parts["car insurance"] === 140,
      rec
    );
    chk(
      "the review says it used the AI's number",
      /You used the number of the AI pass, \$140 \(a Guess\)/.test(livePartEnded(R))
    );
    /* Approve all in the accounts group: the not-sure checking balance waits for its own tap */
    const chk1 = lfStore(c0()).heard.find(x => x.src && x.key === "cash:Checking");
    await tap(R, "rvall", "accounts");
    chk("Approve all leaves a not-sure proposal for its own tap", chk1 && chk1.unsure && !lrvBook(c0())[chk1.id], chk1);
    /* the protected phone bill: approving it changes nothing */
    await tap(R, "rvok", phone.id);
    chk(
      "approving a proposal on a value the person entered changes nothing",
      row(c0(), "spends", "Bills and subscriptions").amt === 95 &&
        row(c0(), "spends", "Bills and subscriptions").s === true &&
        lrvBook(c0())[phone.id].st === "ok"
    );
    /* the what-ifs: types suggested by the AI pass, set only on Approve */
    const wg = lrvGroups(c0(), T.sid).find(g => g.area === "whatifs");
    chk(
      "the AI pass suggests a type for each what-if, and sets none",
      lfWhatifs(c0(), T.sid).every(w => w.sug && !w.type && w.sugBy === "ai") && /Suggested: /.test(livePartEnded(R)),
      lfWhatifs(c0(), T.sid)
    );
    await tap(R, "rvall", "whatifs");
    chk(
      "Approve all in the What-ifs group now sets each suggested type",
      wg.check.length > 0 && lfWhatifs(c0(), T.sid).every(w => w.type && w.type === w.sug)
    );
    /* the draft notes and agenda */
    h = livePartEnded(R);
    chk(
      "the drafted session notes and the next-call agenda are on the coach's side, editable",
      /Session notes and the next call/.test(h) &&
        /<textarea id="lai-notes" data-lai="notes"/.test(h) &&
        /Top 3 problems/.test(h) &&
        /What to ask next/.test(h) &&
        /data-a="laisave">Save to my notes/.test(h)
    );
    chk(
      "the notes are not on the client's profile",
      !JSON.stringify(c0()).includes("They want a trip to Japan someday")
    );
    laiInput({ dataset: { lai: "notes" }, value: "My own words about the call." }, R);
    const n0 = CP.notes.length;
    chk("nothing goes to the coach's notes before Save", CP.notes.length === n0 && !R.ai.saved);
    await tap(R, "laisave");
    const note = CP.notes[CP.notes.length - 1];
    chk(
      "Save puts the edited notes and the agenda into the coach's notes (the note path of the coach page)",
      CP.notes.length === n0 + 1 &&
        note.kind === "note" &&
        note.client === "client1" &&
        /My own words about the call\./.test(note.body) &&
        /Top 3 problems\n- /.test(note.body) &&
        R.ai.saved,
      note
    );
    /* a second pass: the earlier proposals that nobody reviewed give way */
    const left = lfStore(c0()).heard.filter(x => x.src && x.st === "kept" && !lrvBook(c0())[x.id]).length;
    await tap(R, "lairun");
    chk(
      "a second pass: a second token line, and the old unreviewed proposals give way to the new ones",
      laiPasses(c0(), T.sid).length === 2 &&
        /Pass 2, /.test(livePartEnded(R)) &&
        lfStore(c0()).heard.filter(x => x.src && x.st === "corrected").length === left,
      left
    );
    /* an answer that fails changes nothing */
    const snap = JSON.stringify(c0());
    R.aiFn = simAi({
      ok: false,
      error: "busy",
      message: "The AI service is busy. Try again in a minute.",
      usage: {},
    }).fn;
    await tap(R, "lairun");
    chk(
      "a failed pass changes nothing and says so calmly",
      JSON.stringify(c0()) === snap && /busy/.test(livePartEnded(R))
    );
    R.aiFn = simAi(() => {
      throw new Error("offline");
    }).fn;
    await tap(R, "lairun");
    chk("a pass that throws changes nothing", JSON.stringify(c0()) === snap && /did not answer/.test(livePartEnded(R)));

    /* ---------- 7. Delete this transcript ---------- */
    const quotes = c => JSON.stringify(c.x.live).match(/"quote":"[^"]+"/g) || [];
    const vals = JSON.stringify([c0().incs, c0().spends, c0().debts, c0().cashes]),
      lines0 = T.db.lines.filter(l => l.session === T.sid).length;
    chk(
      "before the delete there are lines in the database and quotes on the profile",
      lines0 > 10 && quotes(c0()).length > 10
    );
    h = livePartEnded(R);
    chk("the coach sees Delete this transcript after the review", /data-a="lvfask">Delete this transcript/.test(h));
    await tap(R, "lvfask");
    h = livePartEnded(R);
    chk(
      "one confirm before anything goes",
      /Delete the words of this call for good\?/.test(h) &&
        /data-a="lvfyes"/.test(h) &&
        /data-a="lvfno"/.test(h) &&
        T.db.lines.length === lines0
    );
    await tap(R, "lvfno");
    chk(
      "Keep it keeps everything",
      T.db.lines.filter(l => l.session === T.sid).length === lines0 && !/lvfyes/.test(livePartEnded(R))
    );
    /* another coach cannot delete the lines */
    T.db.coaches.coach2 = true;
    await T.db.as("coach2").forget(T.sid);
    chk(
      "a second coach account cannot delete the lines",
      T.db.lines.filter(l => l.session === T.sid).length === lines0
    );
    await tap(R, "lvfask");
    await tap(R, "lvfyes");
    const c1 = c0();
    chk("the lines are gone from the database", T.db.lines.filter(l => l.session === T.sid).length === 0);
    chk("the lines are gone from this page", R.lines.length === 0);
    chk("the quotes are gone from the profile", quotes(c1).length === 0, quotes(c1).slice(0, 3));
    chk(
      "the approved values, their levels and the records stay",
      JSON.stringify([c1.incs, c1.spends, c1.debts, c1.cashes]) === vals &&
        lrvBook(c1)[ins.id].st === "fixed" &&
        lrvBook(c1)[ins.id].v === 140 &&
        lfStore(c1).heard.length > 10 &&
        lfStore(c1).marks["spend:Home/rent"].v === 1850
    );
    h = livePartEnded(R);
    chk(
      "the line Transcript deleted on <date>",
      /Transcript deleted on [A-Z][a-z]+ \d{1,2}, \d{4}\./.test(h) && clean(h),
      junk(h)
    );
    chk(
      "the quotes are gone from the client's saved game too",
      !JSON.stringify(T.sb.rows.filter(r => r.owner === "client1").map(r => r.data)).includes("eighteen fifty")
    );
    T.R.leave();
    T.RC.leave();
  }
  {
    /* the client deletes; and the rules: not before End */
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
    await simReady(P);
    await clock.run(300);
    await P.coach.R.act("start");
    await clock.run(300);
    for (const l of simScriptFill().slice(0, 6)) {
      await clock.run(l[0]);
      P[l[1]].speech.say(l[2]);
    }
    await clock.run(3000);
    await settle();
    const live = await P.client.R.forget();
    chk("the transcript cannot be deleted before End", !live.ok && db.lines.length > 0);
    await db.as("client1").forget(sid);
    chk("the database rule: no line goes before End", db.lines.length > 0);
    await P.coach.R.act("end");
    await clock.run(3000);
    await settle();
    const RC = P.client.R;
    let h = livePartEnded(RC);
    chk(
      "the client sees Delete this transcript on their calm screen",
      /data-a="lvfask">Delete this transcript/.test(h) && /Thank you for the call/.test(h)
    );
    await tap(RC, "lvfask");
    chk(
      "the client is told the coach may still be checking",
      /Your coach may still be checking the numbers\./.test(livePartEnded(RC))
    );
    RC.buf.lines.push({ id: "x", side: "client", text: "left on the device", at: 1 });
    await tap(RC, "lvfyes");
    const c = RC.game.get();
    chk(
      "the client's delete: the lines are gone from the database",
      db.lines.filter(l => l.session === sid).length === 0
    );
    chk(
      "the client's delete: no line waits on the device",
      RC.buf.lines.length === 0 && !P.client.store.get(lvBufKey(sid, "client"))
    );
    chk(
      "the client's delete: the quotes are gone, the values stay, and the line says when",
      !(JSON.stringify(c.x.live).match(/"quote":"[^"]+"/g) || []).length &&
        lfStore(c).marks["spend:Home/rent"].v === 1850 &&
        /Transcript deleted on /.test(livePartEnded(RC)) &&
        lvfGone(c, sid).by === "client"
    );
    chk("the copy of the profile on the device is gone too", !P.client.store.get(LG_KEY + "client1"));
    P.coach.R.leave();
    RC.leave();
  }
  {
    /* lvfForget, values only: the four kinds of quotes, another session's quotes stay */
    const c = newChar({ name: "Q" });
    c.x = {
      live: {
        v: 1,
        heard: [
          { id: "h1", sid: "s1", line: "l1", quote: "rent is 1,850", st: "confirmed", answer: { quote: "yes" } },
          { id: "h2", sid: "s2", line: "l9", quote: "keep me", st: "filled" },
        ],
        marks: {
          "spend:Home/rent": {
            sid: "s1",
            quote: "rent is 1,850",
            all: [{ line: "l1", quote: "rent is 1,850" }],
            yes: { quote: "yes" },
          },
          "cash:Savings": { sid: "s2", quote: "keep me", all: [{ line: "l9", quote: "keep me" }] },
        },
        whatifs: [{ id: "w1", sid: "s1", quote: "if I moved" }],
        review: { h1: { st: "ok", quote: "rent is 1,850" } },
        rows: {},
      },
    };
    const r = lvfForget(c, "s1", "coach", 1700000000000),
      s = JSON.stringify(c.x.live);
    chk(
      "the quotes of one session go from the four places; another session keeps its words",
      r.n === 7 &&
        !/1,850|"quote":"yes"|if I moved/.test(s) &&
        (s.match(/keep me/g) || []).length === 3 &&
        c.x.live.forgot.s1.at === 1700000000000,
      r
    );
  }

  /* ---------- 8. no key anywhere, and the function's own rules ---------- */
  {
    let files = [];
    try {
      files = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
    } catch (e) {
      files = [];
    }
    const pat = "sk-" + "ant-",
      hits = files.filter(f => {
        try {
          const st = fs.statSync(path.join(ROOT, f));
          return st.isFile() && st.size < 5e6 && fs.readFileSync(path.join(ROOT, f), "latin1").includes(pat);
        } catch (e) {
          return false;
        }
      });
    chk("the repository has files to look at", files.length > 100, files.length);
    chk("no Anthropic API key pattern in any file of the repository", hits.length === 0, hits);
    const fn = read("supabase/functions/live-ai-pass/index.ts");
    chk("the Edge Function is marked NOT DEPLOYED", /^\/\/ NOT DEPLOYED\./m.test(fn));
    chk(
      "the key comes only from the function's secret, never from the request",
      /Deno\.env\.get\("ANTHROPIC_API_KEY"\)/.test(fn) && !/body\.(api_?key|key)|headers\.get\("x-api-key"\)/i.test(fn)
    );
    chk(
      "it checks the caller with their own sign-in, the coach (or the admin), and reads the lines itself",
      /global: \{ headers: \{ Authorization: auth \} \}/.test(fn) &&
        /sess\.data\.coach !== user\.id/.test(fn) &&
        /rpc\("is_admin"\)/.test(fn) &&
        /from\("live_lines"\)/.test(fn) &&
        !/body\.lines/.test(fn)
    );
    chk(
      "one request, structured output by a strict tool, caps in and out, a time limit, CORS for the site only",
      (fn.match(/messages\.create\(/g) || []).length === 1 &&
        /strict: true/.test(fn) &&
        /MAX_OUTPUT_TOKENS = \d+/.test(fn) &&
        /MAX_APP_CHARS = \d+/.test(fn) &&
        /MAX_FILE_CHARS = \d+/.test(fn) &&
        /TIMEOUT_MS = \d+/.test(fn) &&
        /"Access-Control-Allow-Origin": SITE_ORIGIN/.test(fn) &&
        /https:\/\/sapphirestoneage\.github\.io/.test(fn) &&
        /model: MODEL/.test(fn) &&
        /const MODEL = "claude-opus-5-5"/.test(fn)
    );
    chk("it stores nothing: no insert, update or upsert", !/\.(insert|update|upsert|delete)\(/.test(fn));
    chk(
      "no em dash in the new files",
      ![fn, read("game/account/liveai.js"), read("game/account/liveforget.js"), read("docs/AI-PASS-SETUP.md")].some(t =>
        t.includes(String.fromCharCode(8212))
      )
    );
    const words = (read("game/account/liveai.js") + read("game/account/liveforget.js")).replace(
      /\/\*[\s\S]*?\*\//g,
      ""
    );
    chk("no blame words in the new screens", !/\b(mistake|failed|behind|off track|wrong)\b/i.test(words));
    const page = read("game/session.html");
    chk(
      "the session page loads the two new files",
      /account\/liveai\.js\?v=/.test(page) && /account\/liveforget\.js\?v=/.test(page)
    );
    chk("the game itself loads neither", !/liveai\.js|liveforget\.js/.test(read("game/index.html")));
  }

  /* ---------- 9. the consent screen ---------- */
  {
    const clock = simClock(),
      db = simDb(clock),
      hub = simHub(clock, 100);
    db.coaches.coach1 = true;
    const made = await db.as("coach1").inviteMake("Sam", "Dana"),
      used = await db.as("client1").inviteUse(made.data.token),
      P = simPair({ clock, db, hub, sid: used.data.session.id, coach: "coach1", client: "client1" });
    await P.client.R.join();
    const h = lrRoomHTML(P.client.R, clock.now(), false);
    chk(
      "the consent keeps the words of the brief, with one plain line under them: Google, Anthropic, and the privacy page",
      h.includes(LV_CONSENT) &&
        h.includes("Chrome sends the sound to Google") &&
        h.includes("sends the words to Anthropic") &&
        /privacy\.html#live/.test(h)
    );
    P.client.R.leave();
  }
  {
    const pv = read("game/privacy.html"),
      card = (pv.match(/<div class="card" id="live">[\s\S]*?<\/div>/) || [""])[0];
    chk(
      "the privacy page says it plainly: text only, Google for the speech, Anthropic only for the AI pass, who sees it, kept until deleted",
      /SLAM records no audio and saves no audio/.test(card) &&
        /sends the sound of your microphone to Google/.test(card) &&
        /Only when your coach taps "Run the AI pass"/.test(card) &&
        /Anthropic/.test(card) &&
        /you, the coach of that session, and the admin/.test(card) &&
        /Not other coaches/.test(card) &&
        /until someone deletes them/.test(card) &&
        /Delete this transcript/.test(card)
    );
  }
  AI_PASS_READY = false;
  LIVE_SESSION_READY = false;
})();
