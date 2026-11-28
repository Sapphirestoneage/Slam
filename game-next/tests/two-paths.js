/* ============================================================================
   SLAM the Game, test: tests/two-paths.js
   PURPOSE     Examine the two paths: the order of the steps, the oxygen mask rule, Most money and Best
               life and the blend, the bucket list by season, the assumptions box, the odds of each path,
               the wording, and "Pick this path" on Next Steps.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile with a bucket list.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/paths.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Path",
      led: true,
      placed: true,
      age: 32,
      ret: 60,
      take: 6500,
      spend: 4000,
      inv: 60000,
      match: "yes",
      incs: [R0({ k: "A main job", amt: 6500 })],
      spends: [R0({ k: "Home", amt: 2000 }), R0({ k: "Food", amt: 2000 })],
      cashes: [R0({ k: "Checking", amt: 3000 })],
      invs: [R0({ k: "Retirement plan at work", amt: 60000 })],
      debts: [R0({ k: "Credit card balance", amt: 4000, high: true, apr: "15% to 25%", rate: 20, pay: 150 })],
      goals: [
        { id: "g1", k: "Trip", n: "Japan", cost: 8000, era: 4, fund: 0 },
        { id: "g2", k: "Wedding", n: "Wedding", cost: 25000, era: 5, fund: 0 },
        { id: "g3", k: "Sabbatical", n: "Six months off", cost: 30000, era: 6, fund: 0 },
      ],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C(),
    P = pathsAll(c),
    M = P.list.money,
    L = P.list.life,
    B = P.list.both;
  chk(
    "month 1: all of what is kept goes to high-interest debt first",
    M.first.debt === 2500 && !M.first.roth && !M.first.memories
  );
  chk(
    "the oxygen mask rule: no memory money before the debt is gone and the cushion is full",
    L.done.every(g => g.age * 12 >= c.age * 12 + L.oxyAt) && !L.first.memories
  );
  chk("Most money puts nothing into memories", !Object.values(M.steady || {}).length || !M.steady.memories);
  chk(
    "the order after the oxygen mask: Roth, then the plan at work, then a regular account",
    Object.keys(M.steady).join(",") === "roth,k401,taxable" || Object.keys(M.steady).join(",") === "roth,k401"
  );
  chk(
    "Best life aims for the freedom number with the spending smile, plus the margin, no more",
    !L.short && P.B.smile < 1 && L.inv >= P.B.need * P.B.smile * 1.1 - 1 && L.inv < M.inv
  );
  chk("Best life does bucket list items, Most money does none", L.count === 3 && M.count === 0);
  chk("the blend sits between the two", B.inv <= M.inv + 1 && B.inv >= L.inv - 1 && B.cost > 0 && B.days > 0);
  chk(
    "each path has its market-history odds",
    [M, L, B].every(p => p.odds >= 0 && p.odds <= 100)
  );
  const seasons = pathsSeasons(L, c);
  chk("the bucket list is placed by life season", seasons.length >= 1 && /^Your \d0s$/.test(seasons[0].n));
  X("paths");
  const o = ov();
  chk(
    "the screen: side by side, the wording, Pick this path, the math",
    o.includes("Most money") &&
      o.includes("Best life") &&
      o.includes("If these assumptions hold, you reach") &&
      o.includes("Pick this path") &&
      o.includes("Show the math") &&
      clean(o),
    junk(o)
  );
  chk("never a promise", !/you will reach|guarantee/i.test(o));
  X("pathstab", "assume");
  chk(
    "the assumptions box: return, inflation, withdrawal, margin, tax year and data dates",
    ov().includes("Investment return a year") &&
      ov().includes("Inflation a year") &&
      ov().includes("Withdrawal rate") &&
      ov().includes("Tax year: 2026") &&
      ov().includes("fetched 2026-11-12") &&
      clean(ov())
  );
  X("kitset", "0.05", "paths|ret", { t: "n" });
  chk("a new return changes the plan", pathsAll(c).list.money.inv < M.inv);
  X("pathstab", "both");
  X("kitset", "25", "paths|split", { t: "n" });
  const b25 = pathsAll(c).list.both;
  X("kitset", "75", "paths|split", { t: "n" });
  chk("keeping more for memories costs more retirement money", pathsAll(c).list.both.cost > b25.cost);
  X("kitset", "keep", "paths|blend", { t: "s" });
  X("pathskeep", "g1");
  const kept = pathsAll(c).list.both;
  chk("keeping one item: only that item is done", kept.count === 1 && kept.done[0].id === "g1");
  X("pathspick", "life");
  const tasks = c.x.plan.filter(t => String(t.v).indexOf("path:") === 0);
  chk(
    "Pick this path sets Next Steps to that plan",
    c.x.paths.pick === "life" && tasks.length >= 1 && tasks.every(t => /^Put \$[\d,]+ a month toward /.test(t.t))
  );
  X("pathspick", "money");
  chk(
    "picking again replaces the open steps of the old path",
    c.x.plan.filter(t => String(t.v).indexOf("path:") === 0).every(t => /Most money/.test(t.s))
  );
  go("plan");
  chk("Next Steps shows the picked path at the top", app().includes("Your path: Most money"));
  const wait = (fn, done, n) => {
    const v = fn();
    if (v || (n || 0) > 600) done(v);
    else setTimeout(() => wait(fn, done, (n || 0) + 1), 25);
  };
  const Pl = pathsAll(c).list.life;
  wait(
    () => pathsSolve(c, Pl),
    sv => {
      chk(
        "his solver answers for a path: the stop age at 90 out of 100, and the money more a month",
        sv && !sv.error && (sv.age == null || sv.age >= c.age) && (sv.more == null || sv.more >= 0)
      );
      wait(
        () => pathsRandom(c, Pl),
        rnd => {
          chk("each path has its random markets from the engine", typeof rnd === "number" && rnd >= 0 && rnd <= 100);
          X("paths");
          chk(
            "the path columns show both odds and the solver answers",
            ov().includes("Random markets that work") &&
              ov().includes("Stop at 90 out of 100") &&
              ov().includes("more a month") &&
              clean(ov()),
            junk(ov())
          );
          G.chars.length = n0;
          G.active = 0;
          save();
        }
      );
    }
  );
}
