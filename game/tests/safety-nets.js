/* ============================================================================
   SLAM the Game, test: tests/safety-nets.js
   PURPOSE     Examine Safety nets (run Finish everything partly built, Part 15): medical leave, a move, a
               breakup and a new baby inside "Break in case of emergency", worked by hand; the tripwire
               picks; Plan B; How long at each level with the Rule of 5; the core copy is current.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/nets.js, core/safetynet.js, features/transit.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Rae",
      led: true,
      placed: true,
      take: 4000,
      spend: 3000,
      incs: [R0({ k: "A main job", amt: 4000 })],
      spends: [
        R0({ k: "Home", amt: 1500 }),
        R0({ k: "Food", amt: 500 }),
        R0({ k: "Getting around", amt: 300 }),
        R0({ k: "Fun and everything else", amt: 700 }),
      ],
      cashes: [R0({ k: "Checking", amt: 3000 }), R0({ k: "Savings", amt: 6000 })],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  const c = C(),
    set = (kind, k, v) => (kitStore(c, "nt_" + kind)[k] = { v, cf: 2 });
  /* by hand, medical leave of 12 weeks with no pay: 12 x 12 / 52 = 2.77 months with the $4,000 gone.
     Month 1: 9,000 - 3,000 = 6,000. Month 2: 3,000. Month 3: 0.77 of the month with no pay: in 4,000 x 0.23 = 923,
     out 3,000, so it ends at 923. The cash never runs out; the lowest point is in month 3. */
  set("medical", "weeks", 12);
  set("medical", "paid", "none");
  set("medical", "once", 0);
  let T = ntCalc(c, "medical");
  chk(
    "medical leave: the lowest point by hand",
    T.run.lasts && Math.abs(T.run.lowest - 4000 * (1 - (12 * 12) / 52 + 2)) < 1e-6 && T.run.lowestK === 3,
    JSON.stringify([T.run.lowest, T.run.lowestK])
  );
  chk("with real numbers and every tap given, the state is Close", T.st === "Close", T.st);
  /* NY state disability: half of a $923 week (take-home a week stands in) is over $170, so $170 a week from week 2 */
  set("medical", "paid", "ny");
  T = ntCalc(c, "medical");
  const paid = T.E.flows.find(f => f.id === "paid");
  chk("NY state disability is capped at $170 a week", paid && Math.abs((paid.monthly * 12) / 52 - 170) < 1e-9);
  /* a new baby with nothing tapped: the start picks, and a Guess */
  T = ntCalc(c, "baby");
  chk("a new baby with no taps is a Guess", T.st === "Guess" && T.E.guess);
  /* the breakup: $1,000 a month stops, $3,000 once. Month 1: 9,000 + 1,000 - 1,000 - 3,000 = 6,000; then 0 a month */
  set("breakup", "lost", 1000);
  set("breakup", "housing", 0);
  set("breakup", "once", 3000);
  T = ntCalc(c, "breakup");
  chk("a breakup: the steady month and the lowest point", T.run.steady === 0 && T.run.lowest === 6000, T.run.lowest);
  /* the basics: Home + Food + Getting around = 2,300. Tripwire at 3 months: 6,900, reached in month 1 */
  chk(
    "the tripwires sit at months of the basics",
    T.trips[0].level === 6900 && T.trips[0].k === 1 && T.trips[2].level === 2300,
    JSON.stringify(T.trips.map(t => [t.level, t.k]))
  );
  X("transit");
  X("ntkind", "breakup");
  chk(
    "the sheet shows the change, its tiles, tripwires, Plan B and the untangle button",
    ov().includes("Lowest point") &&
      ov().includes("Tripwires") &&
      ov().includes("Plan B") &&
      ov().includes('data-v="untangle"') &&
      clean(ov()),
    junk(ov())
  );
  X("nttrip", "Get a roommate", "breakup|2");
  chk("a tripwire pick is kept", c.x.ntTrip.breakup[2] === "Get a roommate" && ov().includes("Get a roommate"));
  X("ntkind", "move");
  chk("a move opens with its taps", ov().includes("Movers, truck and setting up") && clean(ov()), junk(ov()));
  X("ntkind", "layoff");
  chk(
    "the layoff Dip tab has How long at each level and the Rule of 5",
    ov().includes("How long at each level") &&
      ov().includes("Food and housing only") &&
      ov().includes("Rule of 5") &&
      clean(ov()),
    junk(ov())
  );
  /* the levels by hand: no income in the layoff, cash 9,000. Food and housing 2,000: 4.5 months */
  const L = ntLevelsOf(c, trCalc(c));
  chk(
    "the levels by hand",
    Math.abs(L.rows[3].months - 4.5) < 1e-9 && Math.abs(L.rows[0].months - 3) < 1e-9,
    JSON.stringify(L.rows.map(r => r.months))
  );
  chk("the spreadsheet section", ntBook(c) && ntBook(c).rows.some(r => r.id === "nt_once"));
  chk("built list", btRows().some(r => r.n.startsWith("Safety nets") && r.st === "b") && btCount(btRows()).x === 0);
  {
    const r = require("child_process").spawnSync(
      process.execPath,
      [GAME_DIR + "../tools/game_safety_build.mjs", "--check"],
      {
        encoding: "utf8",
      }
    );
    chk("core/safetynet.js is current", r.status === 0, r.stdout + r.stderr);
  }
  X("close");
  G.chars.length = n0;
  G.active = 0;
  save();
}
