/* ============================================================================
   SLAM the Game, test: tests/career-and-education.js
   PURPOSE     Examine the screen "Career and education" on the shared engine: the copy of the engine,
               a course priced (the payback years, the lifetime value, the freedom date change), a
               preset that is a sample, empty answers that wait, two paths side by side, the credential
               stack with an overlap, the match that stays with the job on each schedule, the three moves of the
               launch window in days, the link from Two job offers, and the rows of the spreadsheet.
   INPUT       The game scripts, loaded by harness.cjs. One fixed test profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: core/career.js, features/career.js, core/engine.js (goalSim).
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Career",
      led: true,
      placed: true,
      age: 28,
      ret: 65,
      take: 4200,
      spend: 3000,
      inv: 20000,
      incs: [R0({ k: "A main job", amt: 4200 })],
      spends: [R0({ k: "Home", amt: 1800 }), R0({ k: "Food", amt: 1200 })],
      cashes: [R0({ k: "Checking", amt: 15000 })],
      invs: [R0({ k: "Retirement plan at work", amt: 20000 })],
      debts: [],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  const c = C(),
    cp = require("child_process").spawnSync(
      process.execPath,
      [GAME_DIR + "../tools/game_career_build.mjs", "--check"],
      {
        encoding: "utf8",
      }
    );
  chk("core/career.js is the same code as js/math/career.js of the main app", cp.status === 0, cp.stdout);
  /* the engine: 20,000 of tuition, a year out on 40,000, a raise to 55,000 at 22% */
  const R = crRoi({
    cost: 20000,
    months: 12,
    keepPct: 0,
    payBefore: 40000,
    payAfter: 55000,
    taxPct: 22,
    age: 30,
    endAge: 65,
  });
  chk("the whole price counts the pay given up after tax", Math.abs(R.total - (20000 + 40000 * 0.78)) < 0.01);
  chk("payback: the price over the raise after tax", Math.abs(R.paybackYears - 51200 / 11700) < 1e-9);
  chk("lifetime value to the age you work until", Math.abs(R.lifetime - (11700 * 34 - 51200)) < 0.01);
  chk(
    "an answer not given waits, it is not zero",
    crRoi({ cost: 1000, months: 0, payBefore: 40000, taxPct: 22 }).needs.join() === "payAfter"
  );
  /* the freedom date: a raise brings it closer */
  const F = crgFi(c, crHop({ raise: 10000, taxPct: 22 }));
  chk("a job hop moves the freedom date sooner", F && F.days < 0, F);
  chk("a move with nothing in it leaves the date", crgFi(c, { once: 0, changes: [] }).days === 0);
  /* the screen */
  X("career");
  let h = ov();
  chk(
    "the screen opens with a stat row and five tabs",
    /dkstats/.test(h) && /Launch window/.test(h) && /Pays back/.test(h),
    h.slice(0, 300)
  );
  chk("with nothing tapped it waits for taps", /Tap yours/.test(h) && clean(h), junk(h));
  X("crset", "trade", "career|path", { t: "s" });
  h = ov();
  chk("a preset says it is a sample", /A sample/.test(h));
  X("crset", "15000", "career|trade_cost", { t: "n" });
  X("crset", "65000", "career|trade_payAfter", { t: "n" });
  h = ov();
  chk(
    "the answer shows the payback and its math",
    /covers the price/.test(h) && /Show the math|mathbox|Payback:/.test(h) && clean(h),
    junk(h)
  );
  chk("a tapped answer is not Exact", !/kitst">Exact/.test(h));
  X("crtab", "side");
  h = ov();
  chk("side by side shows both paths", /Trade school/.test(h) && /A 4-year degree/.test(h) && clean(h), junk(h));
  /* the stack */
  X("crtab", "stack");
  X("crstackadd");
  X("crstackadd");
  X("crstackset", "12", "1|len");
  X("crstackset", "5000", "0|raise");
  h = ov();
  chk("two credentials that run at the same time are flagged", /at the same time/.test(h) && clean(h), junk(h));
  const S = crStack([
    { name: "A", from: "2027-01", to: "2027-06" },
    { name: "B", from: "2027-07", to: "2027-09" },
  ]);
  chk("back to back is no overlap", S.overlaps.length === 0 && S.busy === 9);
  /* vesting */
  chk("graded: 20% after 2 years, 40% after 3", crVested("graded6", 2) === 20 && crVested("graded6", 3.5) === 40);
  chk("cliff: nothing before 3 years, all after", crVested("cliff3", 2.9) === 0 && crVested("cliff3", 3) === 100);
  const V = crVestLeft({ match: 10000, years: 2, schedule: "graded6" });
  chk(
    "the dollars that stay with the job and the next step",
    V.left === 8000 && V.next.years === 3 && V.next.more === 2000 && V.next.months === 12
  );
  X("crtab", "vest");
  X("crset", "10000", "career|vMatch", { t: "n" });
  X("crset", "2", "career|vYears", { t: "n" });
  X("crset", "cliff3", "career|vSchedule", { t: "s" });
  h = ov();
  chk(
    "the vesting tab says what stays with the job",
    /\$10,000 of the match stays with the job/.test(h) && clean(h),
    junk(h)
  );
  chk("a match from a chip is a Guess", /kitst">Guess/.test(h));
  /* the launch window */
  X("crtab", "launch");
  X("crset", "10000", "career|hRaise", { t: "n" });
  X("crset", "6000", "career|rYearly", { t: "n" });
  X("crset", "1200", "career|kRent", { t: "n" });
  X("crset", "100", "career|kCosts", { t: "n" });
  X("crset", "2", "career|kYears", { t: "n" });
  h = ov();
  chk(
    "each move is days on the freedom date",
    (h.match(/days (sooner|later)|No change/g) || []).length >= 3 && clean(h),
    junk(h)
  );
  chk("the hop counts the match that stays with the job", /stays with the job/.test(h));
  const T = crRothTrad({ yearly: 12000, nowPct: 22, laterPct: 12 });
  chk("traditional at a higher rate now leaves more to invest", T.lead === "trad" && Math.abs(T.monthly - 100) < 1e-9);
  /* Two job offers links to vesting */
  X("offers");
  chk("Two job offers opens the match that stays with the job", /data-a="career" data-v="vest"/.test(ov()));
  /* the spreadsheet */
  const B = careerBook(c);
  chk(
    "the spreadsheet has the rows of the path",
    B.rows.some(r => r.id === "cr_payback"),
    B.rows.map(r => r.id)
  );
  chk(
    "What's built lists it",
    WB.some(r => r[5] === "career")
  );
  X("close");
  G.chars.splice(n0, 1);
  G.active = 0;
  save();
}
