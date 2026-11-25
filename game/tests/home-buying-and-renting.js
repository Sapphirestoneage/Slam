/* ============================================================================
   SLAM the Game, test: tests/home-buying-and-renting.js
   PURPOSE     Examine the simulator "Rent or buy" on the shared engine: the copy of the rules, the bank's
               payment as the first line, the true cost of owning line by line, a line that is not counted
               until the player taps it, PMI only under 20% down, the true cost of renting, the breakeven
               year, the price-to-rent ratio, the 5% rule, the closed group of inputs, the "i" of each term
               and the rows of the spreadsheet.
   INPUT       The game scripts, loaded by harness.cjs. One fixed test profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: core/homebuy.js, features/sims/rentbuy.js, features/sim.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Home",
      led: true,
      placed: true,
      age: 35,
      ret: 60,
      take: 6000,
      spend: 4000,
      inv: 150000,
      incs: [R0({ k: "A main job", amt: 6000 })],
      spends: [R0({ k: "Home", amt: 2000 }), R0({ k: "Food", amt: 2000 })],
      cashes: [R0({ k: "Checking", amt: 60000 })],
      invs: [R0({ k: "Retirement plan at work", amt: 150000 })],
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
      [GAME_DIR + "../tools/game_homebuy_build.mjs", "--check"],
      {
        encoding: "utf8",
      }
    );
  chk("core/homebuy.js is the same code as js/math/homebuy.js of the main app", cp.status === 0, cp.stdout);
  /* the engine: 400,000 with 10% down at 6.5% over 30 years is 2,275.44 a month */
  chk("the bank's payment: principal and interest", Math.abs(hbPayment(360000, 6.5, 30) - 2275.44) < 0.01);
  const def = SIMS.rentbuy,
    x0 = simInputs(c, def),
    A0 = rentbuyArgs(x0);
  chk(
    "with nothing tapped, the lines with no typical number are empty, not zero",
    A0.taxPct === null &&
      A0.insYear === null &&
      A0.pmiPct === null &&
      A0.hoa === null &&
      A0.repairsYear === null &&
      A0.rentIns === null
  );
  chk(
    "maintenance starts inside Eli's range of 1 to 2%",
    A0.maintPct >= HB_RULES.maintLow && A0.maintPct <= HB_RULES.maintHigh
  );
  chk("rent growth starts inside Eli's range of 3 to 4%", A0.rentGrowthPct >= 3 && A0.rentGrowthPct <= 4);
  chk("the rent starts from the home line of the player", x0.rent === 2000, x0.rent);
  const r0 = rentbuyRun(c, x0),
    H0 = r0.home;
  chk(
    "the simulator gets its numbers from hbRun",
    r0.options[0].delta === H0.dBuy && r0.options[1].delta === H0.dRent && r0.pmt === H0.pmt
  );
  chk(
    "not counted yet: property tax, insurance, PMI, HOA, big repairs, renter's insurance",
    H0.open.join() === "taxPct,insYear,pmiPct,hoa,repairsYear,rentIns",
    H0.open.join()
  );
  /* the screen */
  X("simopen", "rentbuy");
  let o = ov();
  chk(
    "the first card is What the bank shows, with principal and interest",
    o.includes("What the bank shows") &&
      o.indexOf("What the bank shows") < o.indexOf("The true cost of owning") &&
      o.includes(money(Math.round(H0.pmt)) + " a month")
  );
  chk(
    "the true cost of owning lists each line",
    ["Property tax", "Home insurance", "PMI", "HOA", "Maintenance", "Big repairs, spread out", "All of it"].every(w =>
      o.includes(w)
    )
  );
  chk(
    "the screen says which lines are not counted yet, and that they are the player's own",
    /Not counted yet: Property tax, Home insurance, PMI, HOA, Big repairs, spread out, Renter's insurance\. These are your own numbers/.test(
      o
    )
  );
  chk(
    "the true cost of renting is on the screen",
    o.includes("The true cost of renting") && o.includes("Renter's insurance")
  );
  chk(
    "the breakeven year, the price-to-rent ratio and the 5% rule are on the screen",
    o.includes("The breakeven year") && o.includes("Price-to-rent ratio") && o.includes("The 5% rule")
  );
  chk(
    "each number card says its level",
    (o.match(/rbcost[\s\S]{0,160}kitst/g) || []).length >= 2 && /rbeven[\s\S]{0,160}kitst/.test(o)
  );
  chk(
    "a guess gets no verdict word and no red",
    !/class="[^"]*(red|bad)[^"]*"/.test(o) && !/you should|wrong choice|mistake/i.test(o)
  );
  chk(
    "the other costs are in a closed group with one button",
    o.includes("simmore") && o.includes('aria-expanded="false"') && !o.includes("Property tax a year")
  );
  X("togb", null, "more");
  o = ov();
  chk(
    "one tap opens the group: the six lines of owning, renter's insurance and what the player assumes",
    o.includes('aria-expanded="true"') &&
      [
        "Property tax a year",
        "Home insurance a year",
        "PMI a year",
        "HOA a month",
        "Maintenance a year",
        "Big repairs, set aside a year",
        "Renter's insurance a month",
        "Rent growth a year",
      ].every(w => o.includes(w))
  );
  chk(
    "the lines with no source say the number is the player's own",
    (o.match(/Your own number\. It counts as nothing until you tap it\./g) || []).length === 6
  );
  chk(
    "maintenance and rent growth show their typical range",
    o.includes("Typical: 1 to 2% of the home") && o.includes("Typical: 3 to 4% a year.")
  );
  /* tap the lines: 1% tax, 1,800 insurance, 0.5% PMI, 0 HOA, 2,000 repairs, 15 renter's insurance */
  X("kitset", "1", "sim_rentbuy|tax", { t: "n" });
  X("kitset", "1800", "sim_rentbuy|ins", { t: "n" });
  X("kitset", "0.5", "sim_rentbuy|pmi", { t: "n" });
  X("kitset", "0", "sim_rentbuy|hoa", { t: "n" });
  X("kitset", "2000", "sim_rentbuy|repairs", { t: "n" });
  X("kitset", "15", "sim_rentbuy|rentIns", { t: "n" });
  chk("the group stays open after a tap", ov().includes('aria-expanded="true"'));
  const x1 = simInputs(C(), def),
    H1 = rentbuyRun(C(), x1).home,
    f = H1.first;
  chk("with each line tapped, nothing is open", H1.open.length === 0, H1.open.join());
  chk(
    "month 1 by hand: 2,275.44 + 333.33 + 150 + 150 + 0 + 500 + 166.67",
    Math.abs(f.total - (2275.44 + (400000 * 0.01) / 12 + 150 + 150 + 0 + 500 + 2000 / 12)) < 0.01,
    f.total
  );
  chk("a tapped $0 for HOA is an answer", x1._st.hoa.given && x1.hoa === 0 && H1.open.indexOf("hoa") < 0);
  chk("renting, month 1: 2,000 + 15", H1.firstRent.total === 2015);
  o = ov();
  chk("the screen no longer says Not counted yet", !o.includes("Not counted yet") && !o.includes("not counted yet"));
  chk("the screen shows the true cost of owning for month 1", o.includes(money(Math.round(f.total)) + " a month"));
  /* PMI: only under 20% down, and it ends */
  chk("PMI ends inside this stay or runs through it", H1.under20 && H1.pmiMonths > 0 && H1.pmiMonths <= H1.months);
  X("kitset", "20", "sim_rentbuy|down", { t: "n" });
  const H2 = rentbuyRun(C(), simInputs(C(), def)).home;
  chk(
    "with 20% down there is no PMI line",
    !H2.under20 &&
      H2.first.pmi === 0 &&
      !/>PMI</.test(ov().split("The true cost of owning")[1].split("The true cost of renting")[0])
  );
  X("kitset", "10", "sim_rentbuy|down", { t: "n" });
  /* the breakeven year is the first year buying is ahead */
  const A1 = rentbuyArgs(simInputs(C(), def)),
    B = hbBreakeven(A1),
    L = hbRun(Object.assign({}, A1, { stay: 30 }));
  chk(
    "the breakeven year: ahead that year and not the year before, or never in 30 years",
    B.never
      ? L.byYear.every(y => y.ahead < 0)
      : L.byYear[B.year - 1].ahead >= 0 && (B.year === 1 || L.byYear[B.year - 2].ahead < 0),
    B.year
  );
  chk("the screen says the breakeven in words", ov().includes(esc(hbBreakevenWords(B))));
  X("kitset", "1000", "sim_rentbuy|rent", { t: "n" });
  const Bn = hbBreakeven(rentbuyArgs(simInputs(C(), def)));
  chk(
    "with a low rent: renting is cheaper the whole time",
    Bn.never && ov().includes("Renting is cheaper the whole time, looking 30 years ahead.")
  );
  /* the two rules of thumb: 400,000 / (12 x 1,000) = 33.3; 400,000 x 5% / 12 = 1,667 */
  chk(
    "price-to-rent ratio: the price over a year of rent",
    Math.abs(hbPriceToRent(400000, 1000) - 33.33) < 0.01 && ov().includes("33.3")
  );
  chk(
    "the 5% rule: 5% of the price a year, as a month",
    ov().includes("$1,667 a month") && ov().includes("renting costs less")
  );
  X("kitset", "2000", "sim_rentbuy|rent", { t: "n" });
  /* the i of each term */
  chk(
    "each term has its words: mortgage rate, maintenance, property tax, PMI, HOA, the 5% rule, price-to-rent",
    ["mortgagerate", "upkeep", "proptax", "pmi", "hoa", "fivepct", "pricetorent"].every(
      k => GLOSS[k] && GLOSS[k][1].length > 40
    )
  );
  chk(
    "the i buttons are on the screen",
    ov().includes('data-k="term:proptax"') &&
      ov().includes('data-k="term:pmi"') &&
      ov().includes('data-k="term:fivepct"')
  );
  chk(
    "the math says the bank's payment and each line",
    ov().includes("Principal and interest: $360,000 over 30 years at 6.5%") && ov().includes("All the lines counted:")
  );
  /* the spreadsheet of the plan */
  const rows = simBook(C()).rows,
    row = id => rows.find(r => r.id === id);
  chk(
    "the spreadsheet has the loan, the payment, both true costs, the breakeven year and the two rules",
    ["rb_loan", "rb_pi", "rb_own1", "rb_rent1", "rb_even", "rb_ptr", "rb_five"].every(id => !!row(id))
  );
  chk(
    "its formulas give the game's numbers: loan, price-to-rent, the 5% rule",
    Math.abs(row("rb_loan").v - 400000 * 0.9) < 1e-6 &&
      Math.abs(row("rb_ptr").v - 400000 / (2000 * 12)) < 1e-9 &&
      Math.abs(row("rb_five").v - (400000 * 0.05) / 12) < 1e-9
  );
  const src = require("fs").readFileSync(GAME_DIR + "features/sims/rentbuy.js", "utf8");
  chk("no em dash and no en dash in the file", !/[—–]/.test(src));
  chk("the simulator file has no loan math of its own", !/Math\.pow|simLoanPayment/.test(src));
  X("close");
  G.chars.splice(n0, 1);
  G.active = 0;
  save();
}
