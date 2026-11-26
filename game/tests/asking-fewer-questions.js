/* ============================================================================
   SLAM the Game, test: tests/asking-fewer-questions.js
   PURPOSE     Examine Asking fewer questions (run Finish everything partly built, Part 17): the copy of
               core/askrank.js is current; each open blank gets the dollars it could move your money a
               year from now, from derive at both ends of its range; the blanks are ranked by those
               dollars and the stopping rule leaves the ones that move little; Make your numbers real asks
               the rows in that order and offers to stop; the payoff reveal's "It depends on" ranks by
               dollars and names what can wait; Close numbers ranked; the spending groups of setup in that
               order with "You can stop here"; the count of setup's taps on the reveal; the spreadsheet
               rows; the built list rows; no undefined, NaN or null.
   INPUT       The game scripts, loaded by harness.cjs. Made-up profiles.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: core/askrank.js, features/fewer.js, features/ask.js,
               features/amounts.js, features/spiral.js, features/games.js (roughSheet), features/built.js.
   ========================================================================= */
{
  const fs = require("fs"),
    path = require("path"),
    crypto = require("crypto"),
    sha = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
  const src = fs.readFileSync(path.join(GAME_DIR, "..", "js", "math", "askrank.js"), "utf8"),
    copy = fs.readFileSync(path.join(GAME_DIR, "core", "askrank.js"), "utf8");
  chk(
    "the ranking of the game is a current copy of js/math/askrank.js (node tools/game_askrank_build.mjs)",
    copy.includes("SOURCE-HASH  " + sha(src)) && AR_RULES.stopShare === 0.8 && AR_RULES.tie === 0.02
  );

  const G0 = clone(G),
    R = r => Object.assign({ s: false }, r),
    a = Object.assign(newChar(), {
      name: "Rae",
      led: true,
      placed: false,
      age: 30,
      ret: 60,
      take: 4000,
      spend: 2800,
      inv: 0,
      debt: 3000,
      high: "no",
      incs: [R({ k: "A main job", amt: 4000 })],
      spends: [
        R({ k: "Home", amt: 1800 }),
        { k: "Food", amt: 400, s: true, cf: 2, rg: [300, 500, 400] },
        R({ k: "Fun and everything else", amt: 600 }),
      ],
      cashes: [R({ k: "Checking", amt: 900 })],
      invs: [],
      debts: [{ k: "Credit card balance", amt: 3000, s: true, cf: 3, high: true, was: 3000 }],
    });
  G.demo = false;
  G.chars.push(a);
  G.active = G.chars.length - 1;
  syncAll(a);
  save();
  go("home");
  const c = C();

  /* The cost of not knowing: derive at both ends of each blank's range. */
  const B = fqBlanks(c),
    by = n => B.find(b => b.n === n);
  chk(
    "each open blank gets the dollars it could move: a month's row 12 x its width, a balance its width",
    by("A main job").value === 48000 &&
      by("Home").value === 21600 &&
      by("Fun and everything else").value === 7200 &&
      by("Food").value === 2400 &&
      by("Checking").value === 900,
    B.map(b => b.n + " " + b.value)
  );
  chk("an Exact number is not a blank", !B.some(b => b.sec === "debts"));
  chk(
    "a range chip keeps its range, Close",
    by("Food").lo === 300 && by("Food").hi === 500 && by("Food").st === "Close"
  );
  chk(
    "ranked top first by the dollars",
    B.map(b => b.n).join("|") === "A main job|Home|Fun and everything else|Food|Checking",
    B.map(b => b.n)
  );
  const P = fqPlan(c);
  chk(
    "the stopping rule: income and Home cover 80% of what could move, the rest can wait",
    P.ask.map(b => b.n).join("|") === "A main job|Home" &&
      P.rest.length === 3 &&
      P.restValue === 10500 &&
      P.total === 80100,
    [P.ask.map(b => b.n), P.restValue, P.total]
  );
  const K = fqByKey(c);
  chk(
    "by question: money coming in and going out are asked, cash can wait",
    K.ask.map(g => g.k).join("|") === "take|spend" &&
      K.rest.map(g => g.k).join("|") === "cash" &&
      K.by.spend.value === 31200,
    K.ranked.map(g => g.k + " " + g.value)
  );
  chk(
    "your money a year from now is net worth + 12 x what is left",
    fqYearOn(c) === derive(c).nw + 12 * (c.take - c.spend)
  );

  /* Make your numbers real: one small question at a time, in the order of the dollars. */
  X("sharp", "spend");
  let h = ov();
  chk(
    "Sharpen asks Home first, with what not knowing it could move",
    W.i === 0 &&
      h.includes("Question 1 of 3") &&
      h.includes("Not knowing this could move your money a year from now by about $21,600") &&
      clean(h),
    junk(h)
  );
  X("askyes");
  h = ov();
  chk("then Fun (the second most), not Food", W.i === 2 && h.includes("Question 2 of 3") && h.includes("$7,200"), W.i);
  X("askback");
  chk("Back one goes back to Home", W.i === 0 && ov().includes("Question 1 of 3"), W.i);
  X("askyes");
  X("askyes");
  h = ov();
  chk(
    "before Food, which moves little: You can stop here, said plainly, with one button",
    W.i === 1 &&
      h.includes("You can stop here") &&
      h.includes("The rest (food) could move your money a year from now by about $2,400 in all") &&
      h.includes('data-a="fqaskstop"') &&
      clean(h),
    junk(h)
  );
  X("fqaskstop");
  chk(
    "Stop here ends on the Done screen; the answers are kept, the rest stays as it was",
    W.kind === "askdone" && C().spends[0].s === true && C().spends[2].s === true && C().spends[1].amt === 400,
    W.kind
  );
  X("close");

  /* The payoff reveal: It depends on, ranked by dollars, and what can wait. */
  const c2 = C();
  delete c2.spends[0].s;
  c2.spends[0].s = false;
  c2.spends[2].s = false;
  c2.x = c2.x || {};
  c2.x.setupTaps = { n: 54, d: todayISO() };
  save();
  spPlanOpen(c2);
  h = ov();
  chk(
    "the reveal: It depends on, by the dollars, and what can wait in plain words",
    h.includes("It depends on") &&
      h.includes("your money a year from now by about $48,000") &&
      h.includes("Cash you can reach could move your money a year from now by about $900 in all") &&
      h.includes("no need to ask about it now") &&
      clean(h),
    junk(h)
  );
  chk(
    "the reveal says how many taps setup took, a plain fact",
    h.includes("You set this up in 54 taps.") && !/score/i.test(h.slice(h.indexOf("fqtaps"))),
    h.slice(h.indexOf("fqtaps"), h.indexOf("fqtaps") + 200)
  );
  X("close");

  /* Close numbers: ranked by what they could move, the ones that move little folded away. */
  c2.x.rng = { take: { lo: 3000, hi: 5000, cf: 2 }, "spend:1": { lo: 350, hi: 450, cf: 2 } };
  save();
  W = { kind: "rough" };
  sheet(roughSheet);
  h = ov();
  chk(
    "Close numbers: money coming in first with its dollars, the rest under These move little",
    h.indexOf("Money coming in") < h.indexOf("These move little") &&
      h.includes("Could move your money a year from now by about $24,000") &&
      h.includes("These move little (1)") &&
      clean(h),
    junk(h)
  );
  X("close");

  /* Setup: the spending groups in the order of what they could move, and "You can stop here". */
  G = clone(G0);
  G.demo = true;
  openSetup("new");
  W.o.homeQ = "I rent";
  W.o.work = "First job";
  W.o.am = W.o.am || {};
  const SP = fqSpendOrder(W),
    order = amSteps(W, 13).map(s => s.id);
  chk(
    "setup asks the spending groups biggest first, by the dollars of their typical amounts",
    order.join("|") === SP.order.join("|") && order[0] === "s:home" && SP.restIds.length > 0,
    [order, SP.restIds]
  );
  W.step = 13;
  SP.order.filter(id => !SP.restIds.includes(id)).forEach(id => (W.o.am[id] = { v: 1, lab: "Done", all: true }));
  h = ov() || "";
  drawSheet();
  h = ov();
  chk(
    "when the groups left move little: You can stop here, with the main button",
    h.includes("You can stop here") && h.includes('data-a="fqstop"') && h.includes("primary go") && clean(h),
    junk(h)
  );
  X("fqstop");
  chk(
    "Stop here keeps a typical amount for the groups left, marked as a Guess",
    SP.restIds.every(id => W.o.am[id] && W.o.am[id].few) &&
      amGroupWords(
        W.o,
        AM_GROUPS.find(g => "s:" + amSlug(g[0]) === SP.restIds[0])
      ) === "Typical for now, a Guess",
    W.o.am
  );
  /* Inside a group: the lines left move little. */
  const home = AM_GROUPS.find(g => g[0] === "Home"),
    few = fqGroupFew(home, [
      { n: "Rent or mortgage", amt: 1250 },
      { n: "Utilities", amt: null },
    ]);
  chk(
    "inside Home, with the rent in: utilities move little, so That's all is offered",
    few && few.names.join() === "Utilities" && few.value === 4200 && few.html.includes("You can stop here."),
    few
  );
  chk(
    "nothing in yet: no stop inside a group",
    fqGroupFew(home, [
      { n: "Rent or mortgage", amt: null },
      { n: "Utilities", amt: null },
    ]) === null
  );

  /* The spreadsheet of the plan and the built list. */
  G = clone(G0);
  G.demo = false;
  G.chars.push(clone(a));
  G.active = G.chars.length - 1;
  const bk = fewerBook(C());
  chk(
    "the spreadsheet: your money a year from now and each blank's two ends and swing, with formulas",
    bk.rows.find(r => r.id === "fq_year").f === "={fq_nw}+12*({fq_in}-{fq_out})" &&
      bk.rows.find(r => r.id === "fq_b1").f === "=12*({fq_b1hi}-{fq_b1lo})" &&
      bk.rows.find(r => r.id === "fq_b1").v === 48000,
    bk.rows.slice(0, 7)
  );
  const rows = typeof WB !== "undefined" ? WB : [];
  const row = t => rows.find(r => r[1] === t);
  chk(
    "the built list: the cost of not knowing and the setup tap counter are built, their probes pass",
    ["The cost of not knowing: a dollar figure on each blank", "Setup tap counter"].every(
      t => row(t) && row(t)[2] === "b" && row(t)[3]()
    ),
    ["The cost of not knowing: a dollar figure on each blank", "Setup tap counter"].map(
      t => row(t) && row(t).slice(0, 3)
    )
  );
  G = G0;
  W = null;
  save();
}
