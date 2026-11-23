/* ============================================================================
   SLAM the Game, test: tests/simulators.js
   PURPOSE     Examine the simulator engine and the 12 simulators on one fixed test profile: each flip
               point is where the better option really changes (checked on both sides), four flip points
               against a formula worked out by hand, the chart that marks the flip, the 2 inputs that move
               the answer most, the menu row, the "i" line, and the links from related screens.
   INPUT       The game scripts, loaded by harness.cjs. One fixed test profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/sim.js, features/sims/*.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Sim",
      led: true,
      placed: true,
      age: 35,
      ret: 60,
      take: 6000,
      spend: 4000,
      inv: 150000,
      incs: [R0({ k: "A main job", amt: 6000 })],
      spends: [R0({ k: "Home", amt: 2000 }), R0({ k: "Food", amt: 2000 })],
      cashes: [R0({ k: "Checking", amt: 15000 })],
      invs: [R0({ k: "Retirement plan at work", amt: 150000 })],
      debts: [R0({ k: "Credit card balance", amt: 4000, high: true, apr: "15% to 25%", rate: 20, pay: 150 })],
      goals: [
        { id: "gc", k: "Car", n: "New car", cost: 15000, era: 5, fund: 0 },
        { id: "gt", k: "Trip", n: "Japan", cost: 6000, era: 4, fund: 0 },
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
    ids = ["rentbuy", "mortgage", "debt", "car", "roth", "job", "break", "side", "kid", "city", "spend", "stop"];
  chk("the 12 simulators are there, in order", JSON.stringify(SIM_ORDER) === JSON.stringify(ids));
  const flips = {};
  ids.forEach(id => {
    const def = SIMS[id],
      x = simInputs(c, def),
      r = simRun(c, def, x);
    (def.flips || []).forEach(F => {
      const A = F.a || r.opts[0].id,
        B = F.b || r.opts[1].id,
        f = simFlip(c, def, x, F, A, B);
      flips[id + "." + F.k] = f.at;
      if (f.at == null) {
        chk(
          id + " " + F.k + ": no flip in range, and the score keeps one sign",
          f.pts.every(p => p[1] >= 0) || f.pts.every(p => p[1] <= 0)
        );
        return;
      }
      const e = (F.hi - F.lo) / 400,
        lo = simScore(c, def, simWith(x, F.k, f.at - e), A, B),
        hi = simScore(c, def, simWith(x, F.k, f.at + e), A, B);
      chk(
        id + " " + F.k + ": the better option changes at the flip point (" + Math.round(f.at * 100) / 100 + ")",
        f.at > F.lo && f.at < F.hi && lo < 0 !== hi < 0,
        [lo, hi]
      );
    });
  });
  /* flip points against a formula worked out by hand */
  {
    const x = simInputs(c, SIMS.side),
      want = sideWage(c) / (1 - x.tax / 100);
    chk(
      "side income: the flip rate is your hourly wage ÷ (1 − the set-aside)",
      Math.abs(flips["side.rate"] - want) < 0.01,
      [flips["side.rate"], want]
    );
  }
  {
    const x = simInputs(c, SIMS.city),
      rr = R / 12,
      n = x.years * 12,
      g = Math.pow(1 + rr, n),
      gain = (x.move * g * rr) / (g - 1),
      want = ((gain + (c.spend * x.col) / 100) / c.take) * 100;
    chk(
      "moving city: the flip pay change pays back the move cost over the years",
      Math.abs(flips["city.pay"] - want) < 0.01,
      [flips["city.pay"], want]
    );
  }
  {
    const x = simInputs(c, SIMS.roth),
      g = Math.pow(1 + x.ret / 100, x.years),
      want = (((x.now / 100) * (g - 0.15 * (g - 1))) / g) * 100;
    chk(
      "pre-tax or Roth: the flip later rate is the rate now, less the tax on the invested savings",
      Math.abs(flips["roth.later"] - want) < 0.01,
      [flips["roth.later"], want]
    );
  }
  chk("a new job with no other change flips at a pay change of $0", Math.abs(flips["job.pay"]) < 1);
  {
    const x = simInputs(c, SIMS.rentbuy),
      at = flips["rentbuy.rate"],
      d = v => {
        const r = rentbuyRun(c, Object.assign({}, x, { rate: v })),
          m = Math.round(r.years * 12);
        return r.options[0].delta[m] - r.options[1].delta[m];
      };
    chk(
      "rent or buy: at a rate just below the flip, buying is ahead; just above, renting is",
      at != null && d(at - 0.05) > 0 && d(at + 0.05) < 0
    );
  }
  /* the screens */
  ids.forEach(id => {
    X("simopen", id);
    const o = ov();
    chk(
      id + ": the screen has the answer, the flip point, its chart, the movers and the math",
      W.kind === "sim" &&
        o.includes("If these assumptions hold") &&
        o.includes("Flip point") &&
        o.includes("<svg") &&
        (o.includes("move the answer most") || SIMS[id].inputs.length < 3) &&
        o.includes("Show the math") &&
        clean(o),
      junk(o)
    );
  });
  X("simopen", "rentbuy");
  chk("the flip chart marks the point", /<circle[^>]*r="4.5"/.test(ov()));
  X("sims");
  chk(
    "the list: one row for each simulator, with the line that says what it answers",
    ids.every(id => ov().includes('data-v="' + id + '"') && ov().includes(esc(SIMS[id].ask)))
  );
  chk(
    "the menu has a row Simulators",
    MENU.some(m => m[1] === "sims")
  );
  goalSheet("gc");
  chk("the car goal links to the car simulator", ov().includes('data-a="simopen" data-v="car"'));
  X("debtplan");
  chk("the debt plan links to the debt simulator", ov().includes('data-v="debt"'));
  W = { kind: "quick", id: "home", o: {} };
  chk("How much home fits links to rent or buy", qmSheet().includes('data-v="rentbuy"'));
  X("taxv");
  chk("the tax view links to pre-tax or Roth", ov().includes('data-v="roth"'));
  X("simopen", "rentbuy");
  X("kitset", "3", "sim_rentbuy|stay", { t: "n" });
  chk(
    "an input tap changes the answer and keeps it",
    c.x.sim_rentbuy.stay.v === 3 && ov().includes("If these assumptions hold")
  );
  G.chars.length = n0;
  G.active = 0;
  save();
}
