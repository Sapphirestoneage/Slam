/* ============================================================================
   SLAM the Game, test: tests/starter-situations.js
   PURPOSE     Examine run CC-1, item 10 (Nov 27 2026): the ten starting points. The table has ten rows
               with stable ids. What you want has the way to the list, and a player who passes it has
               no more taps than before. A starting point fills the answers of the four questions with
               the typical value for the age (the same value as "I'm not sure"), each a Guess; a
               question with no typical figure for the situation stays empty and is asked. The player
               confirms on one screen. The profile keeps the id, the quests are on Next Steps, and the
               rest of setup shows the setup answers filled. Each screen has exactly one pulse.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. Made-up players.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/starter.js (SIT_LIST, sitApply, sitFill, sitEmpty,
               sitLeft, sitRows, sitView, sitOkView, sitBase, sitSetup, the actions), features/couldbe.js
               (cbAnswer, cbMake, cbTypical), features/cbguide.js (cbLeft), features/wants.js (wnView).
   ========================================================================= */
(async () => {
  const G0 = clone(G),
    fresh0 = () => {
      G = clone(G0);
      G.demo = true;
      W = null;
      SH = null;
    },
    pulses = h => (h.match(/class="[^"]*\bcbnext\b[^"]*"/g) || []).length,
    bad = h => /\u2014|mistake|failed|behind|off track|\b0 of\b|undefined/i.test(h) || /\bNaN\b/.test(h),
    AGE_I = 2,
    age = cbRng("age", AGE_I).v;

  /* ---- 1. THE TABLE ---- */
  chk(
    "ten starting points, with the stable ids",
    JSON.stringify(SIT_LIST.map(T => T.id)) ===
      '["laidoff","newjob","married","carddebt","parents","selfemp","student","firstapt","newbaby","nearfi"]',
    SIT_LIST.map(T => T.id)
  );
  chk(
    "each row is data: a name, a line, typical questions, setup answers, quests that the game has",
    SIT_LIST.every(
      T =>
        T.l &&
        T.one &&
        Array.isArray(T.typ) &&
        T.typ.every(q => ["spend", "inv", "save"].includes(q)) &&
        T.quests.length > 0 &&
        T.quests.every(q => typeof ACT[q.a] === "function" && q.t && q.s) &&
        T.wants.every(k => WN_LIST.some(x => x.id === k)) &&
        Object.keys(T.set).every(k => SIT_KEYS[k])
    )
  );
  chk(
    "each question that stays empty says why",
    SIT_LIST.every(T => sitEmpty(T.id).every(e => e.why)),
    SIT_LIST.filter(T => sitEmpty(T.id).some(e => !e.why)).map(T => T.id)
  );
  chk("no row holds an amount of money", !/\$\s?\d|\d{3,}/.test(JSON.stringify(SIT_LIST)));
  const opts = k =>
    k === "debtKinds"
      ? DEBT_KINDS.map(d => d[0])
      : [].concat(...Object.values(SM_Q).map(L => L.filter(q => q.k === k).map(q => q.o)));
  chk(
    "each setup answer is a choice of setup",
    SIT_LIST.every(T => Object.keys(T.set).every(k => [].concat(T.set[k]).every(v => opts(k).flat().includes(v)))),
    SIT_LIST.filter(
      T => !Object.keys(T.set).every(k => [].concat(T.set[k]).every(v => opts(k).flat().includes(v)))
    ).map(T => T.id)
  );

  /* ---- 2. A PLAYER WHO PASSES IT ---- */
  fresh0();
  X("start");
  let h = ov();
  chk("What you want has the way to the list", h.includes('data-a="sitopen"') && h.includes("situation like yours"));
  chk("What you want still has one pulse", pulses(h) === 1, pulses(h));
  X("wnskip");
  ["age", "spend", "inv", "save"].forEach((q, k) => X("cbset", "", "", { q, i: k === 3 ? 3 : 2 }));
  chk("without a starting point: 6 taps to the number, as before", W.step === "is" && CB.taps === 6, CB.taps);
  chk("and the profile has no starting point", C().x.cb.st === undefined);

  /* ---- 3. THE LIST ---- */
  fresh0();
  X("start");
  X("sitopen");
  h = ov();
  chk("the list shows ten rows", W.step === "starter" && (h.match(/data-a="sitpick"/g) || []).length === 10);
  chk(
    "the list has I'm not sure, the line under it, Back and one pulse",
    h.includes(NOT_SURE) && h.includes(TAP_ONE) && h.includes('data-a="sitback"') && pulses(h) === 1,
    pulses(h)
  );
  chk("the list has an i and clean words", h.includes('data-k="starter"') && !bad(h));
  X("sitback");
  chk("Back returns to What you want", W.step === "wants");
  X("sitopen");
  X("sitskip");
  chk("I'm not sure goes on with no starting point", W.step === "entry" && !W.o.st && W.q === 0);

  /* ---- 4. EACH STARTING POINT ---- */
  for (const T of SIT_LIST) {
    const n = T.id + ": ";
    fresh0();
    X("start");
    X("sitopen");
    X("sitpick", T.id);
    h = ov();
    chk(
      n + "the age is asked first",
      W.step === "entry" && W.q === 0 && W.o.st === T.id && h.includes("Your start: " + T.l)
    );
    chk(
      n + "the age screen has one pulse and a countdown that is not 0",
      pulses(h) === 1 && cbLeft().n >= 2 && !bad(h),
      cbLeft()
    );
    X("cbset", "", "", { q: "age", i: AGE_I });
    const empty = sitEmpty(T.id).map(e => e.q);
    T.typ.forEach(q => {
      const V = cbTypical(q, age),
        a = W.o.a[q];
      chk(
        n + q + " is the typical value for the age, as a Guess",
        !!V && a && a.v === V.v && a.typ === true && a.cf === 1,
        a
      );
    });
    chk(
      n + "a question with no typical figure stays empty",
      empty.every(q => !W.o.a[q]),
      empty
    );
    let asked = 0;
    while (W.step === "entry" && asked < 4) {
      const Q = CB_QS[W.q];
      chk(n + "an open question is asked: " + Q.id, empty.includes(Q.id) && pulses(ov()) === 1, Q.id);
      X("cbset", "", "", { q: Q.id, i: 2 });
      asked++;
    }
    chk(n + "only the empty ones were asked", asked === empty.length, asked);
    h = ov();
    chk(n + "then the screen to confirm", W.step === "stok" && h.includes("Looks right: show my number"));
    chk(
      n + "it has one pulse, an i, Back, and clean words",
      pulses(h) === 1 && h.includes('data-k="stok"') && h.includes("cbnav") && !bad(h),
      pulses(h)
    );
    chk(
      n + "each typical value is greyed and marked Guess, with Change",
      T.typ.every(q =>
        new RegExp(
          'data-q="' +
            q +
            '"[^>]*><span class="small muted">[\\s\\S]*?Guess[\\s\\S]*?data-a="sitchg" data-q="' +
            q +
            '"'
        ).test(h)
      )
    );
    chk(
      n + "it names the setup answers and the quests",
      T.quests.every(q => h.includes(esc(q.t))) && sitSetupWords(T.id).every(wd => h.includes(esc(wd)))
    );
    chk(n + "the countdown says 1 tap", cbLeft().n === 1);
    const taps = CB.taps;
    X("sitok");
    const c = C();
    chk(
      n + "Looks right makes the profile and shows What it is",
      !G.demo && W && W.step === "is" && c.x.cb.st === T.id,
      W && W.step
    );
    chk(n + "taps to the first number", taps + 1 === 5 + empty.length && CB.taps === taps + 1, CB.taps);
    chk(
      n + "the typical answers stay marked on the profile",
      T.typ.every(q => c.x.cb.a[q].typ === true) && empty.every(q => !c.x.cb.a[q].typ)
    );
    chk(n + "the number is a Guess", cbNumbers(c, derive(c)).st === "Guess");
    chk(
      n + "the quests are on Next Steps",
      T.quests.every(q => c.x.plan.some(p => p.a === q.a && p.v === "st:" + T.id && p.st === "todo")),
      c.x.plan.map(p => p.a)
    );
    chk(
      n + "the wants are goals",
      T.wants.every(k => c.goals.some(g => g.n === WN_LIST.find(x => x.id === k).l))
    );
    if (T.set.debtKinds) chk(n + "the kind of debt is on the profile", c.debtKinds.includes("Credit card balance"));
    X("gohome");
    X("cbrest");
    const s = smState(W);
    chk(
      n + "the rest of setup shows the setup answers filled",
      W.kind === "setup" &&
        Object.keys(T.set).every(
          k =>
            JSON.stringify(W.o[k]) === JSON.stringify(T.set[k]) &&
            (!Array.isArray(T.set[k]) || k === "debtKinds" || s.md[k])
        ),
      Object.keys(T.set).map(k => W.o[k])
    );
    closeSheet();
  }

  /* ---- 5. CHANGE ONE, AND AN AGE WITH NO ROW ---- */
  fresh0();
  X("start");
  X("sitopen");
  X("sitpick", "newjob");
  X("cbset", "", "", { q: "age", i: AGE_I });
  X("sitchg", "", "", { q: "spend" });
  chk("Change opens that one question", W.step === "entry" && CB_QS[W.q].id === "spend");
  X("cbset", "", "", { q: "spend", i: 1 });
  chk(
    "its answer comes back to the check, and is the player's own",
    W.step === "stok" && !W.o.a.spend.typ && W.o.a.spend.i === 1
  );
  X("sitchg", "", "", { q: "age" });
  const last = CB_RNG.age.length - 1,
    old = cbRng("age", last).v;
  X("cbset", "", "", { q: "age", i: last });
  const noRow = !cbTypical("inv", old);
  chk(
    "an age with no row for a value: the value is empty and asked, not made up",
    noRow ? W.step === "entry" && CB_QS[W.q].id === "inv" && !W.o.a.inv : W.step === "stok",
    [old, W.step]
  );

  /* ---- 6. THE ONE FUNCTION, FOR THE DOORS ---- */
  fresh0();
  chk(
    "sitApply opens the opening and applies the starting point",
    sitApply("carddebt") === true && W.kind === "cb" && W.o.st === "carddebt" && W.step === "entry"
  );
  chk(
    "the want of the starting point is a pick",
    W.o.wants.some(x => x.n === "Get out of debt")
  );
  chk("an id that is not on the table is refused", sitApply("nothing") === false);
  X("cbset", "", "", { q: "age", i: AGE_I });
  X("sitok");
  chk("the costly-debt player is made", !G.demo && C().debtKinds.includes("Credit card balance"));
  chk("a player who has a game gets no starting point", sitApply("student") === false && C().x.cb.st === "carddebt");
  G = G0;
})();
