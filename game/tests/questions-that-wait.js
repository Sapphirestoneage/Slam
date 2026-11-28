/* ============================================================================
   SLAM the Game, test: tests/questions-that-wait.js
   PURPOSE     Examine run CC-1, item 9 (Nov 27 2026): the questions that can wait. Setup does not ask who
               the player shares money with, or how many roommates live with the player. Each one is a
               quest of Next Steps with one question. The answer goes to the key that setup wrote. Nothing
               is asked twice. A player with roommates or a partner gets the quest of the split of shared
               bills and subscriptions. "Change my answers" still has the questions. A copy of a round
               that already has an answer keeps it. For a player who owes nothing and one with costly debt.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. Made-up players.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/waitq.js (WQ_LIST, wqWaits, wqFill, wqTask, wqSeed,
               wqSheet, ACT.wqset, ACT.wqunsure), screens/smart.js (smQs, SETUP[3].req, smLive),
               features/amounts.js (amHouseQs), screens/planner.js (plLater, plTidy, plSeedWeek).
   ========================================================================= */
(async () => {
  const G0 = clone(G),
    made = () => {
      G = clone(G0);
      G.demo = true;
      W = null;
      SH = null;
      X("start");
      X("wnskip");
      X("cbset", "", "", { q: "age", i: 2 });
      X("cbset", "", "", { q: "spend", i: 2 });
      X("cbset", "", "", { q: "inv", i: 2 });
      X("cbset", "", "", { q: "save", i: 3 });
      X("gohome");
      X("cbrest");
    },
    fill = o =>
      Object.assign(
        W.o,
        { work: "Established", incKinds: ["A main job"], steady: "Steady", homeQ: "I rent", deps: "None" },
        { can1k: "Yes", cover: "1 to 3 months", invest: "Every month" },
        o
      ),
    ks = (w, p) => smQs(w, p).map(q => q.k),
    tasks = c => (c.x.plan || []).filter(p => p.a === "plater" || p.v === "wq:split");

  for (const debt of [false, true]) {
    const who = debt ? "costly debt: " : "owes nothing: ";
    made();
    fill({ live: ["Roommates", "A partner"], rel: "Partnered", debtKinds: debt ? ["Credit card balance"] : [] });
    smState(W).md.live = true;
    chk(who + "the rest of setup is open", W.kind === "setup" && W.mode === "new" && W.cbRest === true, W.kind);
    chk(who + "Your people does not ask about shared money", !ks(W, 3).includes("share") && ks(W, 3).includes("rel"));
    chk(who + "Your people is complete without it", SETUP[3].req(W) === true && W.o.share == null);
    chk(
      who + "Your home does not ask how many roommates",
      !ks(W, 2).includes("roommateQ") && ks(W, 2).includes("live")
    );
    W.step = 3;
    drawSheet();
    const m = /page (\d+) of (\d+)/.exec(ov());
    chk(who + "page X of N is the number of pages", !m || +m[2] === smLive(W).length, m && m[0]);
    chk(who + "the screen has no question about shared money", !/Do you share your money/.test(ov()));
    finishSetup();
    const c = C();
    chk(who + "setup made the profile", !!c && !G.demo && c.x.cb.setup === true);
    chk(
      who + "shared money is the Guess of the game",
      c.share === "No one" && (c.x.unsure || []).includes("share"),
      c.share
    );
    chk(who + "the number of roommates is empty, not zero", c.roommateCount === null);
    chk(
      who + "two questions wait",
      JSON.stringify((c.x.later || []).slice().sort()) === '["mates","share"]',
      c.x.later
    );
    chk(
      who + "three quests: two questions and the split",
      tasks(c).length === 3,
      tasks(c).map(p => p.t)
    );
    chk(
      who + "the quest of the split opens Sharing costs fairly",
      tasks(c).some(p => p.a === "fair" && /subscriptions/.test(p.t)) && typeof ACT.fair === "function"
    );
    chk(who + "a second look adds no quest", wqSeed(c) === 0 && tasks(c).length === 3);
    /* the quest of shared money */
    ACT.plater({ dataset: { v: "share" } });
    let h = ov();
    chk(
      who + "the quest opens one question, with the words of setup",
      W.kind === "waitq" && h.includes("Do you share your money with anyone")
    );
    chk(who + "it has I'm not sure and the line under the choices", h.includes(NOT_SURE) && h.includes(TAP_ONE));
    chk(who + "no em dash, no verdict word", !/\u2014|mistake|failed|behind|off track/i.test(h));
    X("wqset", "A partner");
    chk(
      who + "the answer goes to the keys of setup",
      c.share === "A partner" && G.house.share === "A partner" && !(c.x.unsure || []).includes("share"),
      c.share
    );
    chk(who + "the sheet is closed, and the question waits no more", !W && !(c.x.later || []).includes("share"));
    plTidy(c);
    chk(who + "its quest is done", c.x.plan.find(p => p.v === "share").st === "done");
    /* the quest of the roommates: I'm not sure keeps the Guess */
    ACT.plater({ dataset: { v: "mates" } });
    chk(who + "the second quest asks how many roommates", ov().includes("How many roommates live with you?"));
    X("wqunsure");
    chk(who + "I'm not sure keeps it empty and ends the wait", c.roommateCount === null && !c.x.later);
    /* Change my answers still has both questions, and an answer there is the player's own */
    openSetup("edit");
    chk(who + "Change my answers has the two questions", ks(W, 3).includes("share") && W.o.share === "A partner");
    smState(W).md.live = true;
    chk(who + "and how many roommates", ks(W, 2).includes("roommateQ"));
    closeSheet();
  }

  /* a single player: no quest about shared money */
  made();
  fill({ live: ["On my own"], rel: "Single by choice", debtKinds: [] });
  finishSetup();
  chk("single: No one, and no quest", C().share === "No one" && !C().x.later && tasks(C()).length === 0, C().x.later);

  /* a copy of a round that already has the answers keeps them (a saved game in the middle of setup) */
  made();
  fill({ live: ["Roommates"], rel: "Dating", debtKinds: [], share: "Family", roommateQ: "3" });
  chk("a copy with an answer: the page is complete", SETUP[3].req(W) === true);
  finishSetup();
  chk(
    "a copy with the answers keeps them, and nothing waits",
    C().share === "Family" &&
      C().roommateCount === 3 &&
      !(C().x.later || []).length &&
      !(C().x.unsure || []).includes("share"),
    [C().share, C().roommateCount, C().x.later]
  );
  chk("it gets the quest of the split only", tasks(C()).length === 1 && tasks(C())[0].a === "fair");
  G = G0;
})();
