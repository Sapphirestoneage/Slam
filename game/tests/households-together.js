/* ============================================================================
   SLAM the Game, test: tests/households-together.js
   PURPOSE     Examine Households together (run Finish everything partly built, Part 12). A made-up
               household of three by their own names (two players of this game and a guest): Same
               question on one phone (the answers hidden until everyone is done, a second tap clears,
               the talk points the furthest apart first, no score), the answer code of two phones (there
               and back, a bad code says why), the talk points on the guild's money date; FI together
               (the game's own number and date, the year and month steps, the gap); a shared home (what
               each put in, the part from Sharing costs fairly, the equity by contributions and equally,
               no equity with no loan typed); when only two can marry (each pair on the game's 2026
               tables); Share by email (the picks of each person, an item not picked is never in the
               draft, the mailto link); the made-up household; the spreadsheet rows; the menu, the row
               on Our household and the built list; no undefined, NaN or null on the sheet.
   INPUT       The game scripts, loaded by harness.cjs. Made-up profiles.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: core/hhold.js, features/hhold.js, features/fair.js,
               features/house.js, features/guild.js, features/book.js, features/built.js.
   ========================================================================= */
{
  const R0 = r => Object.assign({ s: true }, r),
    mk = (name, take, spend, inv) => {
      const c = Object.assign(newChar(), {
        name,
        age: 34,
        led: true,
        placed: true,
        incs: [R0({ k: "A main job", amt: take })],
        spends: [R0({ k: "Home", amt: spend })],
        cashes: [R0({ k: "Checking", amt: 5000 })],
        invs: [],
        debts: [],
        debt: 0,
        take,
        spend,
        inv,
      });
      G.chars.push(c);
      syncAll(c);
      return c;
    };
  const a = mk("Ari", 6000, 3000, 80000),
    b = mk("Bex", 3500, 2500, 20000);
  G.active = G.chars.indexOf(a);
  G.demo = false;
  G.tourSeen = true;
  G.fair = {
    ppl: [
      { n: "Ari", from: G.chars.indexOf(a), inc: null, hrs: 5, nights: 7 },
      { n: "Bex", from: G.chars.indexOf(b), inc: null, hrs: 5, nights: 7 },
      { n: "Cyd", from: null, inc: 2200, hrs: 8, nights: 7 },
    ],
    total: 2400,
    pick: "income",
  };
  G.hhx = null;
  save();

  X("hhx");
  let h = ov();
  chk(
    "the sheet opens with its five parts",
    ["Same question", "FI together", "A shared home", "When only two can marry", "Share by email"].every(t =>
      h.includes(t)
    )
  );
  chk("people by their own names", ["Ari", "Bex", "Cyd"].every(n => h.includes(n)) && !/Partner [12]/.test(h));
  chk("the sheet is clean before any tap", clean(h), junk(h));
  chk("the new look: a stat row and a caption", h.includes("dkstats") && h.includes("dkcap"));

  /* 1. Same question, one phone */
  X("hxwho", "0");
  X("hxans", "0", "ask");
  X("hxans", "1", "cushion");
  X("hxans", "0", "split");
  X("hxwho", "1");
  X("hxans", "3", "ask");
  X("hxans", "2", "cushion");
  X("hxans", "1", "split");
  X("hxans", "1", "split");
  chk("a second tap clears an answer", G.hhx.sq.Bex.split == null);
  X("hxans", "1", "split");
  X("hxans", "9", "ask");
  chk("an answer out of range is ignored", G.hhx.sq.Bex.ask === 3);
  h = ov();
  chk("the answers stay hidden until everyone is done", h.includes("stay hidden") && !h.includes("Talk points</b>"));
  X("hxshow");
  let S = hxSq();
  chk("the talk points, the furthest apart first", S.K.talk.map(r => r.id).join() === "split,ask,cushion");
  h = ov();
  chk("the talk points show with each name and pick", h.includes("Talk points") && h.includes("Ari: <b>$25</b>"));
  chk("no score words", !/\bscore\b|wrong|failed|mistake/i.test(h));
  const step = gdDateSteps().find(x => x.t === "Talk points from Same question");
  chk("the talk points go on the guild's money date", step && step.l.length === 3 && /Ari/.test(step.l[0]));

  /* two phones: a code there and back */
  const code = hhCode("Dee", { ask: 1, stop: 2 });
  W.paste = "my answers " + code;
  X("hxpaste");
  chk(
    "a pasted code adds that person's answers",
    G.hhx.sq.Dee && G.hhx.sq.Dee.ask === 1 && G.hhx.codes.includes("Dee") && /Added Dee/.test(W.msgx)
  );
  W.paste = "hello";
  X("hxpaste");
  chk("a bad code says why", /starts with SLAM-SQ1/.test(W.msgx));
  W.paste = null;
  chk("the code of the one answering", ov().includes("SLAM-SQ1 Bex|"));

  /* 2. FI together */
  const ga = hxRead(a);
  chk("the game's own FI number and date", ga && ga.fi === Math.round(derive(a).fi) && /^\d{4}-\d{2}$/.test(ga.date));
  X("hxset", String(ga.fi), "fi:0");
  X("hxgame", null, "0");
  X("hxset", "1500000", "fi:1");
  X("hxstep", "12", "1");
  X("hxstep", "1", "1");
  const bd = G.hhx.fi.Bex.date,
    gb = hxRead(b);
  chk("a year and a month later, from the game's date", bd === hxAddYm(gb.date, 13));
  let F = hxFi();
  chk("the gap in the number", F.numbers.ready && F.numbers.gap === Math.abs(1500000 - ga.fi));
  chk("the gap in time", F.dates.ready && F.dates.gap === Math.abs(hhMonthsBetween(ga.date, bd)));
  chk("Cyd has no number yet, and is named", F.missing.includes("Cyd"));
  X("hxstep", "7", "1");
  chk("a step that is not a year or a month is ignored", G.hhx.fi.Bex.date === bd);

  /* 3. a shared home */
  X("hxset", "500000", "home:value");
  chk("no loan typed: no equity yet", hxHome().equity === null);
  X("hxset", "300000", "home:owed");
  X("hxset", "50000", "put:0");
  X("hxset", "10000", "put:1");
  X("hxset", "0", "put:2");
  X("hxfair");
  const pay = frCalc(frPpl(), 2400, frState().rate).income;
  chk(
    "each person's part from Sharing costs fairly, by income",
    ["Ari", "Bex", "Cyd"].every((n, i) => G.hhx.home.ppl[n].monthly === Math.round(pay[i]))
  );
  ["0", "1", "2"].forEach(i => X("hxset", "24", "months:" + i));
  let E = hxHome();
  chk("the equity", E.ready && E.equity === 200000);
  chk(
    "the parts add up to the equity",
    Math.abs(E.rows.reduce((s, r) => s + r.byPaid, 0) - 200000) < 1e-6 && E.rows[0].byPaid > E.rows[2].byPaid
  );
  X("hxset", "-5", "put:0");
  chk("a negative amount is ignored", G.hhx.home.ppl.Ari.put === 50000);
  /* the keypad */
  X("hxpad", null, "put:2");
  W.o["hxk_put_2"] = 1234;
  X("hxtyped", null, "put:2");
  chk("a typed amount", G.hhx.home.ppl.Cyd.put === 1234 && !W.pad);

  /* 4. when only two can marry */
  chk("no tax gap until every pay is in", !hxMarry().ready);
  X("hxset", "170000", "gross:0");
  X("hxset", "45000", "gross:1");
  X("hxset", "30000", "gross:2");
  const M = hxMarry(),
    t = (g, s) => retireTax(g, 0, s, "", 40).federal,
    all = t(170000, "single") + t(45000, "single") + t(30000, "single"),
    ab = M.pairs.find(x => x.names.join() === "Ari,Bex");
  chk("three pairs", M.ready && M.pairs.length === 3);
  chk(
    "a pair on one joint return, the others single, less everyone single",
    Math.abs(ab.gap - (t(215000, "joint") + t(30000, "single") - all)) < 0.01
  );
  h = ov();
  chk("the named place for domestic partnership", h.includes("Domestic partnership next to marriage"));

  /* 5. share by email */
  X("hxmto", "1");
  let D = hxDraftFor("Bex");
  chk("Bex sees the month, FI, the talk points and their own numbers at first", D.ids.join() === "month,p:Bex,fi,talk");
  chk(
    "Ari's own numbers are not in Bex's draft",
    !D.body.includes("Ari's own numbers") && !/Brings in \$6,000/.test(D.body)
  );
  X("hxpick", "fi");
  X("hxpick", "home");
  D = hxDraftFor("Bex");
  chk("a tap takes FI out and puts the home in", !D.ids.includes("fi") && D.ids.includes("home"));
  chk(
    "an item not picked never appears in the draft",
    !D.body.includes("FI together") && !decodeURIComponent(D.mailto).includes("FI together")
  );
  chk("the picks are per person", hxDraftFor("Ari").ids.includes("fi"));
  X("hxpick", "nothing");
  chk("an unknown item is ignored", !("nothing" in G.hhx.mail.Bex.picks));
  X("hxmail");
  chk(
    "Open the email draft makes a mailto link; nothing is sent",
    /^mailto:\?subject=/.test(W.mailto) && D.body.includes("SLAM sends nothing")
  );
  h = ov();
  chk("the sheet is clean with everything in", clean(h), junk(h));
  chk("money through the one formatter", h.includes(money(200000)));

  /* the made-up household */
  X("hxsample", "1");
  h = ov();
  chk(
    "the made-up household of three",
    ["Rin", "Sol", "Tay"].every(n => h.includes(n)) && h.includes("Made-up household")
  );
  chk("it changes no real profile", G.chars.indexOf(a) >= 0 && G.hhx.home.ppl.Ari.put === 50000);
  X("hxsample", "0");

  /* the spreadsheet, the menu, the row, the built list */
  const B = hxBook().rows,
    v = id => (B.find(r => r.id === id) || {}).v;
  chk(
    "the spreadsheet rows",
    v("hx_equity") === 200000 && v("hx_fi_gap") === F.numbers.gap && v("hx_paid") === hxHome().total
  );
  chk("the equity formula", (B.find(r => r.id === "hx_part0") || {}).f === "={hx_equity}*{hx_paid0}/{hx_paid}");
  chk(
    "in the plan's spreadsheet",
    bookSections(a).some(s => s.title === "Households together")
  );
  chk(
    "the menu row",
    MENU.some(m => m[1] === "hhx")
  );
  X("house");
  chk("the row on Our household", ov().includes('data-a="hhx"'));
  const row = WB.find(r => r[1] === "Share by email and pick what each person sees");
  chk("the built list row is built and its probe passes", row && row[2] === "b" && row[3]());
  chk(
    "the other built rows pass",
    WB.filter(r => r[5] === "hhx").length === 4 && WB.filter(r => r[5] === "hhx").every(r => r[3]())
  );
}
