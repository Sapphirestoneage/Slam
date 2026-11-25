/* ============================================================================
   SLAM the Game, test: tests/money-sins-results.js
   PURPOSE     Examine the money sins, Part 2: the result card with its archetype on the read, the share
               card with no numbers, the framing line on Home and on the crash drill (no number
               changes), the add-on hook with and without a stand-in add-on, couples only with both
               opt-ins and the money date, the retake each quarter and the history (the sin on the
               character sheet), the part for the graduation story, privacy for a coach, the built row.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: core/sins.js, features/sins.js, features/quizzes.js,
               features/recalc.js, features/drills.js, features/reveal.js, features/questlog.js.
   ========================================================================= */
{
  const t = todayISO(),
    day = n => addDays(t, -n),
    n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    def = qzSkin("sins"),
    all = v => Object.fromEntries(def.questions.map(q => [q.id, v])),
    who = (name, extra) =>
      Object.assign(newChar(), {
        name,
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
        ...(extra || {}),
      });
  G.demo = false;
  const a = who("Sam"),
    b = who("Rin");
  G.chars.push(a, b);
  G.active = n0;
  save();
  go("home");
  const c = C();
  /* a made-up month: 40 days of ledger, eight fun buys, one "bored" check-in: two sources agree on Lust */
  c.moves.push({ d: day(40), t: "in", amt: 2000, src: "Job", k: "Checking" });
  [9, 8, 7, 6, 5, 4, 3, 2].forEach(n =>
    c.moves.push({ d: day(n), t: "out", amt: 12, cat: "Fun and everything else", k: "Checking" })
  );
  c.x.qz = {
    sins: {
      ans: all("a"),
      go: true,
      at: t,
      sn: { v: 1, checks: [{ at: day(3) + "T20:00:00Z", d: day(3), tag: "bored", amt: 12, cat: "fun" }] },
    },
  };
  save();
  const R = sngRead(c),
    K = sngCard(c);
  chk(
    "the read of the made-up month: Lust has a label",
    R.read.families[0].top.id === "lust" && R.read.families[0].level === "Close",
    JSON.stringify(R.read.families[0].agree)
  );
  chk(
    "the result card: the archetype from the two tops, the light sides, the virtues, the move of the month",
    K &&
      K.arch.name === snArchetype(def, "lust", R.read.families[1].top.id).name &&
      K.sin.virtue.name === "Patience" &&
      !!K.sin.light &&
      !!K.change.virtue &&
      K.move.title === "Your Recalculating move this month" &&
      !!K.move.name,
    JSON.stringify(K && K.arch)
  );
  X("sins");
  chk(
    "the read opens on the result card in the new look, with the share button",
    ov().includes(esc(K.arch.name)) &&
      ov().includes("dkcard") &&
      ov().includes('data-a="snshare"') &&
      ov().includes("The virtue that answers it: Patience") &&
      clean(ov()),
    junk(ov())
  );
  chk(
    "the quiz card names the archetype in its row to the read",
    (() => {
      W = { kind: "qzq", id: "sins" };
      return qzSheet().includes("You are " + esc(K.arch.name));
    })()
  );

  /* ---------- the share card: only on a tap, no number ---------- */
  X("snshare");
  const card = (ov().match(/<div class="card stack snsharecard"[\s\S]*?<\/div><\/div>/) || [""])[0];
  chk(
    "the share card: the name and the plain words, and no number, no check-in, no push-back",
    card.includes(esc(K.arch.name)) &&
      !/\d/.test(card.replace(/<[^>]*>/g, "").replace(/&#?\w+;/g, "")) &&
      !/check-in|You said/.test(card),
    card
  );
  chk(
    "the share card can be copied, with the line that it carries no number",
    ov().includes('data-a="snsharecopy"') && ov().includes("no money number")
  );

  /* ---------- the add-on hook: a stand-in add-on ---------- */
  SNG_VOICE.push({ pk: "standin", virtues: { lust: "Stand-in virtue" }, line: "A stand-in line." });
  chk("no add-on on: the default names", sngCard(c).sin.virtue.name === "Patience" && sngCard(c).extra === null);
  ADX.has.standin = true;
  const test0 = ADX.test;
  ADX.test = true;
  const KV = sngCard(c);
  chk(
    "the add-on on: its virtue name and its line",
    KV.sin.virtue.name === "Stand-in virtue" && KV.extra === "A stand-in line."
  );
  chk(
    "the share card never carries the add-on",
    !snShareCard(def, sngPlainCard(c)).text.includes("Stand-in") && (X("snshare"), !ov().includes("Stand-in"))
  );
  ADX.test = test0;
  delete ADX.has.standin;
  SNG_VOICE.splice(0, SNG_VOICE.length);

  /* ---------- the app talks to the type: a line, never a number ---------- */
  const home = sngFrame(c, "home");
  chk("Home has the line for Lust", home.includes("48 hours") && home.includes('data-frame="home:lust"'), home);
  go("home");
  const withRead = app();
  const keep = c.x.qz.sins;
  delete c.x.qz.sins;
  go("home");
  const without = app();
  c.x.qz.sins = keep;
  go("home");
  chk(
    "the line only adds: Home with the read, minus the line, is Home without it",
    withRead.includes("snframerow") &&
      withRead.replace(/<div class="homerow snframerow">[\s\S]*?<\/div><\/div>/, "") === without,
    withRead.length + " " + without.length
  );
  W = { kind: "drills", id: "crash" };
  chk("the crash drill has the line for the type", fdSheet().includes('data-frame="crash:lust"'));
  W = { kind: "rc" };
  chk(
    "an ordinary month check: the line for Home on Done for this month, or none",
    !/data-frame="hard/.test(rcSheet()) || rcgCalc(c, derive(c)).state.hard
  );

  /* ---------- couples: only with both opt-ins ---------- */
  b.x = b.x || {};
  b.x.qz = { sins: { ans: all("b"), go: true, at: t, sn: { v: 1 } } };
  chk(
    "an Early read (the quiz alone): no line, the default",
    sngFrame(b, "home") === "" && sngFrame(b, "crash") === "" && sngFrame(b, "hard") === ""
  );
  X("sins");
  chk(
    "one person: the switch only, no collision",
    ov().includes('data-a="snmate"') && !ov().includes('data-a="sndate"')
  );
  X("snmate", "1");
  chk("one opt-in is not enough", !ov().includes('data-a="sndate"') && ov().includes("Waiting for Rin"));
  b.x.qz.sins.sn.mate = true;
  X("sins");
  chk(
    "both opted in: how the reads collide, and the money date",
    ov().includes("The two of you") && ov().includes("One of you") && ov().includes('data-a="sndate"'),
    junk(ov())
  );
  X("sndate");
  const L = snDate(def, sngMates(c).a, sngMates(c).b);
  chk("the money date: prompt 1 of its length", ov().includes("Prompt 1 of " + L.length) && clean(ov()));
  X("sndatestep", String(L.length - 1));
  chk("the last prompt ends the date", ov().includes(esc(L[L.length - 1].line)) && ov().includes('data-a="sins"'));
  b.x.qz.sins.sn.mate = false;
  chk("one turns it off: gone again", !sngCouplePart(c, true).includes("sndate"));

  /* ---------- retake each quarter, and the history ---------- */
  c.x.qz.sins.at = day(100);
  chk("a quarter has passed: the reminder in the Quest Log list", (snRetakeNudge(c) || {}).a === "sins");
  X("sins");
  chk(
    "the read asks gently, and can be skipped",
    ov().includes("A quarter has passed") && ov().includes('data-a="snretakeskip"')
  );
  X("snretakeskip");
  chk("not this quarter", !ov().includes("A quarter has passed") && snRetakeNudge(c) === null);
  X("snretake");
  const st = c.x.qz.sins;
  chk(
    "the retake keeps the old take and the rest of the read",
    !Object.keys(st.ans).length &&
      st.sn.hist.length === 1 &&
      st.sn.hist[0].at === day(100) &&
      st.sn.checks.length === 1 &&
      W.kind === "qzq"
  );
  def.questions.forEach(q => X("qzans", "c", q.id));
  chk(
    "the new take goes into the history",
    c.x.qz.sins.sn.hist.length === 2 && c.x.qz.sins.sn.hist[1].at === t,
    JSON.stringify(c.x.qz.sins.sn.hist.map(e => e.at))
  );
  W = { kind: "qzq", id: "sins" };
  X("qzagain");
  chk(
    "Take it again also keeps the read and its history",
    c.x.qz.sins.sn.hist.length === 2 && c.x.qz.sins.sn.checks.length === 1
  );
  def.questions.forEach(q => X("qzans", "c", q.id));
  const sheetH = rvSheetSins(
    '<div class="tiny muted">No dollar amounts on this sheet, so it is safe to send to a friend.</div>'
  );
  chk(
    "the character sheet shows the read over the retakes",
    sheetH.includes("over the retakes") && sheetH.includes("Lust"),
    sheetH
  );
  chk(
    "the graduation story can call its part",
    sngGradStory(c)[0] === "You started as " + K.arch.name + ".",
    JSON.stringify(sngGradStory(c))
  );

  /* ---------- privacy: a coach or an admin who opens this game ---------- */
  const ss0 = global.sessionStorage;
  global.sessionStorage = { getItem: k => (k === "su_as" ? "1" : null), setItem() {}, removeItem() {} };
  X("sins");
  chk(
    "a coach sees no card, no name, no line, no couple part, no growth",
    ov().includes("Kept private by the player") &&
      !ov().includes(esc(K.arch.name)) &&
      sngFrame(c, "home") === "" &&
      sngCouplePart(c, qzMine()) === "" &&
      rvSheetSins("x") === "x"
  );
  global.sessionStorage = ss0;
  if (ss0 === undefined) delete global.sessionStorage;

  /* ---------- the built list ---------- */
  chk(
    "the built list has the row, and its probe passes",
    WB.some(r => /result card, the share card/i.test(r[1]) && r[2] === "b" && r[3]() === true)
  );
  chk(
    "What's new has the entry",
    PATCH_NOTES.some(p => /gets a name/i.test(p.t))
  );

  X("close");
  G.chars.splice(n0, 2);
  G.active = act0;
  G.demo = demo0;
  save();
  go("home");
}
