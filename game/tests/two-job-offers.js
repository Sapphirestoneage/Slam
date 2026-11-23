/* ============================================================================
   SLAM the Game, test: tests/two-job-offers.js
   PURPOSE     Examine "Two job offers": what a year and an hour of each offer are worth, the gap, the
               part that makes it, the sheet, the spreadsheet rows, the skill link and the built row.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/offers.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Offer",
      led: true,
      placed: true,
      age: 30,
      ret: 60,
      take: 5000,
      spend: 4000,
      inv: 20000,
      match: "yes",
      incs: [R0({ k: "A main job", amt: 5000 })],
      spends: [R0({ k: "Home", amt: 2000 }), R0({ k: "Food", amt: 2000 })],
      cashes: [R0({ k: "Checking", amt: 8000 })],
      invs: [R0({ k: "IRA or Roth IRA", amt: 20000 })],
      debts: [],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C(),
    S = kitStore(c, "offers"),
    gross = taxvInputs(c).gross.v,
    A0 = offerPrice(c, "a");
  chk(
    "offer A starts as the job of the player, as a Guess",
    A0.I.base.v === gross && A0.st === "Guess" && A0.I.match.v === 3
  );
  chk("offer B starts 10% above it", offerInputs(c, "b").base.v === Math.round((gross * 1.1) / 1000) * 1000);
  const set = (id, o) => Object.keys(o).forEach(k => (S[id + "_" + k] = { v: o[k], cf: 2 }));
  set("a", { base: 80000, bonus: 0, match: 4, stock: 0, health: 150, commute: 100, minutes: 60, remote: 0, pto: 15 });
  set("b", {
    base: 90000,
    bonus: 5000,
    match: 0,
    stock: 10000,
    health: 500,
    commute: 0,
    minutes: 0,
    remote: 5,
    pto: 25,
  });
  const K = offerCalc(c),
    netA = taxvCalc(c, { gross: 80000 }).net,
    netB = taxvCalc(c, { gross: 95000 }).net;
  chk(
    "take-home pay comes from the tax view tables",
    Math.abs(K.A.net - netA) < 1e-9 && Math.abs(K.B.net - netB) < 1e-9 && netB > netA && netA < 80000
  );
  chk(
    "a year of offer A: take-home + 4% match - health - commute",
    Math.abs(K.A.value - (netA + 3200 - 1800 - 1200)) < 1e-6,
    K.A.value
  );
  chk("a year of offer B: take-home + stock - health", Math.abs(K.B.value - (netB + 10000 - 6000)) < 1e-6, K.B.value);
  chk(
    "hours: (52 - days off / 5) x (40 + the commute on the days you go in)",
    Math.abs(K.A.hours - 49 * (40 + 5)) < 1e-9 &&
      Math.abs(K.B.hours - 47 * 40) < 1e-9 &&
      Math.abs(K.A.commuteHours - 245) < 1e-9
  );
  chk(
    "an hour: the year divided by the hours",
    Math.abs(K.A.perHour - K.A.value / 2205) < 1e-9 && Math.abs(K.B.perHour - K.B.value / 1880) < 1e-9
  );
  chk(
    "the gap and who is ahead",
    K.top === "b" && Math.abs(K.gap - (K.B.value - K.A.value)) < 1e-9 && K.topHour === "b" && K.hoursGap === 1880 - 2205
  );
  chk(
    "the largest difference is named",
    K.decider &&
      K.decider.k === (netB - netA > 10000 ? "net" : "stock") &&
      K.decider.diff === Math.max(netB - netA, 10000),
    JSON.stringify(K.decider)
  );
  chk("answers by taps make it Close", K.st === "Close");
  X("offers");
  chk(
    "the sheet: two columns, the gap in plain words, the questions of offer B, the math",
    W.kind === "offers" &&
      ov().includes("Offer A") &&
      ov().includes("Offer B") &&
      ov().includes("is ahead by") &&
      ov().includes("If these assumptions hold") &&
      ov().includes("One hour is worth") &&
      ov().includes('data-k="offers|b_base"') &&
      ov().includes("Show the math") &&
      clean(ov()),
    junk(ov())
  );
  chk("no verdict words", !/\b(best|better|worse|wrong|bad)\b/i.test(ov().replace(/<[^>]+>/g, " ")));
  chk(
    "each question has an i",
    ov().split('class="field kitask"').slice(1).length === 9 &&
      ov()
        .split('class="field kitask"')
        .slice(1)
        .every(p => p.slice(0, 600).includes("term:"))
  );
  X("offerstab", "a");
  chk(
    "the other tab asks for offer A",
    W.tab === "a" && ov().includes('data-k="offers|a_base"') && !ov().includes('data-k="offers|b_base"')
  );
  X("kitset", "100000", "offers|a_base", { t: "n" });
  chk("a tap changes the offer", offerCalc(c).A.I.base.v === 100000 && clean(ov()), junk(ov()));
  set("b", { base: 100000, bonus: 0, match: 4, stock: 0, health: 150, commute: 100, minutes: 60, remote: 0, pto: 15 });
  set("a", { base: 100000 });
  X("offers");
  chk(
    "two equal offers: no gap, and the screen says so",
    offerCalc(c).gap === 0 && offerCalc(c).decider === null && ov().includes("worth the same") && clean(ov()),
    junk(ov())
  );
  const B = offerBook(c),
    v = id => B.rows.find(r => r.id === id).v;
  chk(
    "the spreadsheet rows: the value is a formula on its parts",
    B.rows.length === 23 &&
      B.rows.find(r => r.id === "ofa_value").f.includes("{ofa_net}+{ofa_match}+{ofa_stock}") &&
      Math.abs(
        v("ofa_value") - (v("ofa_net") + v("ofa_match") + v("ofa_stock") - v("ofa_health") * 12 - v("ofa_commute") * 12)
      ) < 1e-6
  );
  chk(
    "the spreadsheet of the plan has the section",
    bookSections(c).some(s => s.title === "Two job offers")
  );
  const L = cxLink("income-career", 3);
  chk("the skill 'Add up everything an offer is worth' opens it", L && L.a === "offers", JSON.stringify(L));
  const row = btRows().find(r => r.n.startsWith("Two job offers"));
  chk("the row in What's built is built and opens the sheet", row && row.st === "b" && row.a === "offers");
  chk("the menu and the screen i have it", MENU.some(m => m[1] === "offers") && !!NV_INFO.offers && !!GLOSS.offvalue);
  X("close");
  G.chars.length = n0;
  G.active = 0;
  save();
}
