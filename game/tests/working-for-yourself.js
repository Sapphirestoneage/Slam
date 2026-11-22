/* ============================================================================
   SLAM the Game, test: tests/working-for-yourself.js
   PURPOSE     Examine Working for yourself: tax first, your unit, your floor.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/gig.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo;
  G.demo = false;
  const R3 = r => Object.assign({ s: true, cf: 3 }, r);
  const a = Object.assign(newChar(), {
    name: "Gia",
    led: true,
    placed: true,
    age: 28,
    take: 3600,
    spend: 3000,
    inv: 0,
    incs: [R3({ k: "A second job", amt: 1600 }), R3({ k: "Side gigs", amt: 2000 })],
    spends: [
      R3({ k: "Home", amt: 1400 }),
      R3({ k: "Food", amt: 500 }),
      R3({ k: "Getting around", amt: 300 }),
      R3({ k: "Bills and subscriptions", amt: 200 }),
      R3({ k: "Fun and everything else", amt: 600 }),
    ],
    cashes: [R3({ k: "Checking", amt: 700 }), R3({ k: "Savings", amt: 0 })],
    invs: [],
    debts: [],
    moves: [],
    x: {},
  });
  G.chars.push(a);
  G.active = n0;
  save();
  go("money");
  const c = C();
  chk(
    "side gigs count as untaxed by default, a job does not",
    gxIsUntaxed(c, "Side gigs") && !gxIsUntaxed(c, "A second job") && gxUntaxedMo(c) === 2000 && gxOn(c)
  );
  chk("My Money shows a tax card for them", app().includes("Tax money") && app().includes('data-a="gig"'));
  const S0 = gxState(c);
  chk(
    "25% is the starting guess, marked as a guess",
    S0.pct === 25 && !S0.known && S0.perMo === 500 && S0.perQ === 1500
  );
  chk(
    "the next date is one of the four, within about three months",
    S0.nx.days >= 0 && S0.nx.days <= 125 && [0, 3, 5, 8].includes(S0.nx.date.getMonth()) && S0.nx.date.getDate() === 15
  );
  chk(
    "date math by hand",
    gxNext("2026-11-19").txt.includes("15") &&
      gxNext("2026-11-19").date.getMonth() === 0 &&
      gxNext("2026-11-19").date.getFullYear() === 2027 &&
      gxNext("2026-04-15").days === 0 &&
      gxNext("2026-04-16").date.getMonth() === 5
  );
  chk(
    "the menu has it",
    MENU.some(m => m[1] === "gig")
  );
  X("gig");
  chk(
    "taxes tab: sources, rates, the quarter, a Guess tag, the math",
    W.kind === "gig" &&
      ov().includes("Which of these arrive with no taxes taken out?") &&
      ov().includes("$1,500") &&
      ov().includes("Guess") &&
      ov().includes("one question") &&
      clean(ov()),
    junk(ov())
  );
  X("gxset", "30", "pct");
  chk(
    "picking a rate makes it yours",
    gxGet(C()).pct === 30 && gxState(C()).perQ === 1800 && !ov().includes("<b>Guess</b>")
  );
  X("gxsrc", "A second job");
  chk("a source can be switched to untaxed", gxIsUntaxed(C(), "A second job") && gxUntaxedMo(C()) === 3600);
  X("gxsrc", "A second job");
  chk("and back", !gxIsUntaxed(C(), "A second job"));
  X("close");
  // logging untaxed money asks the one question
  W = { kind: "flow", o: { t: "in", amt: 600, to: "Checking", src: "Side gigs" } };
  X("fsave");
  chk(
    "logging gig money asks to set some aside",
    W.kind === "gxcatch" &&
      W.amt === 600 &&
      ov().includes("I moved $180 aside") &&
      ov().includes("Nobody took taxes out") &&
      clean(ov()),
    W.kind + " " + junk(ov())
  );
  X("gxcatch", "moved");
  chk("moved: counted on both sides", gxGet(C()).set === 180 && gxGet(C()).due === 180 && gxState(C()).behind === 0);
  W = { kind: "flow", o: { t: "in", amt: 400, to: "Checking", src: "Side gigs" } };
  X("fsave");
  X("gxcatch", "later");
  chk(
    "not yet: the game keeps count, no scolding",
    gxGet(C()).set === 180 && gxGet(C()).due === 300 && gxState(C()).behind === 120
  );
  W = { kind: "flow", o: { t: "in", amt: 500, to: "Checking", src: "Side gigs" } };
  X("fsave");
  X("gxcatch", "taxed");
  chk("already taxed: nothing added", gxGet(C()).due === 300);
  W = { kind: "flow", o: { t: "in", amt: 800, to: "Checking", src: "A second job" } };
  X("fsave");
  chk("a taxed paycheck gets no question", !W || W.kind !== "gxcatch");
  X("close");
  chk(
    "the engine totals were not touched by the bucket",
    derive(C()).cash === C().cashes.reduce((s, r) => s + r.amt, 0) && C().moves.length === 4,
    derive(C()).cash
  );
  go("money");
  chk(
    "the card says how much to catch up, in amber not red",
    app().includes("$120 to catch up") && app().includes("pill warn")
  );
  X("gig");
  chk("behind: a calm line and one button", ov().includes("No panic") && ov().includes("I moved $120 aside"));
  X("gxmove", "120");
  chk("caught up", gxState(C()).behind === 0 && ov().includes("has its tax money set aside"));
  X("gxpaid");
  chk(
    "paying the bill empties the bucket and keeps a record",
    gxGet(C()).set === 0 && gxGet(C()).due === 0 && gxGet(C()).paid.length === 1 && gxGet(C()).paid[0].amt === 300
  );
  const MA = monthsAhead(C(), D, "2026-11-19", 6),
    jan = MA.find(m => m.ym === "2027-01");
  chk(
    "the January date is in the next few months",
    !!jan && jan.items.some(i => i.t.includes("Tax date") && i.t.includes("$1,800")),
    JSON.stringify(jan && jan.items).slice(0, 200)
  );
  // your unit
  chk("no unit yet: gaps stay in dollars", unitTxt(C(), 150) === "" && gxUnit(C()) === null);
  X("gxtab", "pay");
  const g = gxGig(C()),
    P = gxPays(g, 30);
  chk(
    "one session by hand: 150 minus 20, minus 30%, over 2 hours",
    Math.abs(P.keep - 91) < 1e-9 &&
      Math.abs(P.perHr - 45.5) < 1e-9 &&
      P.paper === 150 &&
      ov().includes("$91") &&
      ov().includes("$45.50") &&
      clean(ov()),
    junk(ov())
  );
  X("gxset", "shift", "n");
  X("gxset", "200", "charge");
  X("gxset", "0", "cost");
  X("gxset", "4", "paid");
  X("gxset", "0", "unpaid");
  const P2 = gxPays(gxGig(C()), 30);
  chk(
    "chips change it",
    gxGig(C()).n === "shift" && P2.keep === 140 && P2.perHr === 35 && ov().includes("One shift leaves you")
  );
  X("gxuse");
  chk("use it as the unit", gxUnit(C()).n === "shift" && gxUnit(C()).v === 140 && ov().includes("This is your unit"));
  chk(
    "gaps now read in shifts",
    unitTxt(C(), 150) === "about 2 shifts" && unitTxt(C(), 100) === "about 1 shift" && unitTxt(C(), 0) === ""
  );
  X("gxset", "20", "pct");
  chk("changing the tax rate reprices the unit", gxUnit(C()).v === 160);
  X("gxset", "30", "pct");
  C().cashes[0].amt = 400;
  D = derive(C());
  const bill = fdList(C(), D).find(x => x.id === "bill");
  chk("a fire drill shows the gap in shifts", bill.line.includes("$600 (about 5 shifts)"), bill.line);
  chk(
    "the ladder does too",
    (() => {
      X("ladder");
      const ok = ov().includes("shifts");
      X("close");
      return ok;
    })()
  );
  go("money");
  chk("the card shows the unit", app().includes("1 shift = $140"));
  // your floor
  const F = gxFloor(C(), gxGig(C()), 30);
  chk(
    "floor by hand: 3,000 spend minus 1,600 taxed pay, over 12, grossed up",
    F.taxed === 1600 && F.need === 1400 && F.floor === Math.ceil(1400 / 12 / 0.7 / 5) * 5 && F.units === 10,
    JSON.stringify(F)
  );
  X("gig", "floor");
  chk(
    "floor tab: the line next to the price, no verdict",
    W.tab === "floor" &&
      ov().includes("your floor for one shift") &&
      ov().includes("what you charge now") &&
      ov().includes("10 shifts a month") &&
      !/too low|underpriced|should charge/i.test(ov()) &&
      clean(ov()),
    junk(ov())
  );
  X("gxset", "4", "per");
  chk("fewer a month raises the floor", gxFloor(C(), gxGig(C()), 30).floor === 500);
  chk(
    "the checklist has the three rows, all passing",
    btRows().filter(r => /Working for yourself|Your unit|What one gig/.test(r.n)).length === 3 &&
      btCount(btRows()).x === 0
  );
  const e = Object.assign(newChar(), {
    name: "Job",
    led: true,
    placed: true,
    take: 4000,
    spend: 3000,
    incs: [R3({ k: "A main job", amt: 4000 })],
    x: {},
  });
  G.chars.push(e);
  G.active = n0 + 1;
  save();
  go("money");
  chk("someone with only a paycheck never sees any of it", !gxOn(C()) && !app().includes("Tax money"));
  X("gig");
  chk("and the sheet still opens cleanly", clean(ov()), junk(ov()));
  X("close");
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  save();
  go("home");
}
// every tap-to-explain button in the new screens opens a real word (the crawler caught one that did not)
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo;
  G.demo = false;
  const R3 = r => Object.assign({ s: true, cf: 3 }, r);
  G.chars.push(
    Object.assign(newChar(), {
      name: "Wo",
      led: true,
      placed: true,
      age: 30,
      ret: 60,
      take: 3000,
      spend: 2500,
      inv: 5000,
      incs: [R3({ k: "Side gigs", amt: 3000 })],
      x: {},
    })
  );
  G.active = n0;
  save();
  go("money");
  const keys = h => (h.match(/data-a="info" data-k="[^"]*"/g) || []).map(s => s.match(/data-k="([^"]*)"/)[1]);
  X("gig");
  const k1 = keys(ov());
  X("compare");
  X("cptab", "fee");
  const k2 = keys(ov()),
    all = k1.concat(k2);
  chk(
    "the new screens have explain buttons, each with a kind and a word that exists",
    all.length >= 2 && all.every(k => k.indexOf(":") > 0 && !!GLOSS[k.split(":")[1]]),
    all.join()
  );
  all.forEach(k => {
    let ok = true;
    try {
      X("info", undefined, k);
    } catch (e) {
      ok = false;
    }
    chk("explain opens: " + k, ok && clean(ov()));
  });
  X("close");
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  save();
  go("home");
}
