/* ============================================================================
   SLAM the Game, test: tests/which-account-next.js
   PURPOSE     Examine "Which account next": the order, the 2026 limits, what goes in now, the room left,
               where the next dollar goes, the extra dollars, the sheet, the spreadsheet rows, the skill
               link and the built row.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/nextacct.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Next",
      led: true,
      placed: true,
      age: 30,
      ret: 60,
      take: 5000,
      spend: 4000,
      inv: 20000,
      match: "no",
      incs: [R0({ k: "A main job", amt: 5000 })],
      spends: [R0({ k: "Home", amt: 2000 }), R0({ k: "Food", amt: 2000 })],
      cashes: [R0({ k: "Checking", amt: 30000 })],
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
    K = nxaCalc(c),
    by = (R, k) => R.rows.find(r => r.k === k),
    B = pathsBase(c, pathsAssume(c)),
    roth = acRec(c, derive(c)).roth,
    keys = K.rows.map(r => r.k).join();
  chk(
    "the order: cushion, match, debt, cushion, HSA, then Roth and the plan at work by the tax lean, then a regular account",
    keys === "cushion1,match,debt,cushion2,hsa," + (roth ? "roth,k401" : "k401,roth") + ",taxable",
    keys
  );
  chk(
    "the limits are the 2026 limits",
    by(K, "k401").limit === 24500 && by(K, "roth").limit === 7500 && by(K, "taxable").limit === null
  );
  chk("the money to place is what the player keeps", K.kept === 1000 && K.money === 1000 && K.extra === 0);
  const m = by(K, "match");
  chk(
    "the match first: the amount that gets all of it",
    B.matchNeed > 0 && Math.abs(m.put - B.matchNeed) < 1e-9 && m.full && m.limit === B.matchNeed * 12
  );
  chk(
    "steps that are done take no money",
    by(K, "cushion1").put === 0 && by(K, "cushion1").full && by(K, "debt").full && by(K, "cushion2").full
  );
  chk(
    "with no HSA answer the HSA row is off and says why",
    by(K, "hsa").put === 0 && by(K, "hsa").full && /health plan/.test(by(K, "hsa").off)
  );
  const first = by(K, roth ? "roth" : "k401"),
    rest = 1000 - B.matchNeed;
  chk(
    "the rest goes to the first account, and it is where the next dollar goes",
    Math.abs(first.put - Math.min(rest, first.cap)) < 1e-9 && K.next.k === first.k && !first.full,
    first.put + " " + K.next.k
  );
  const p = by(K, "k401");
  chk(
    "the plan at work: going in a year = 12 x (the match + what is placed), and the room is the limit minus that",
    Math.abs(p.nowY - 12 * (B.matchNeed + p.put)) < 1e-6 && Math.abs(p.roomY - (24500 - p.nowY)) < 1e-6,
    p.nowY + " " + p.roomY
  );
  /* ---------- extra dollars fill each limit, then spill to the regular account ---------- */
  const E = nxaCalc(c, { extra: 2000 }),
    ek = by(E, "k401"),
    er = by(E, "roth"),
    et = by(E, "taxable");
  chk(
    "with $2,000 extra both accounts reach their limit",
    ek.full && er.full && Math.abs(ek.nowY - 24500) < 1e-6 && Math.abs(er.nowY - 7500) < 1e-6 && ek.roomY < 1e-6
  );
  chk(
    "the spill goes to the regular account, and the next dollar goes there",
    Math.abs(et.put - (3000 - 24500 / 12 - 7500 / 12)) < 1e-6 && E.next.k === "taxable",
    et.put
  );
  chk("the money placed adds up to the money to place", Math.abs(E.rows.reduce((s, r) => s + r.put, 0) - 3000) < 1e-6);
  /* ---------- pre-tax contributions from the paycheck use room of the plan ---------- */
  c.x.kin = c.x.kin || {};
  c.x.kin.pre = { v: 500, cf: 2 };
  const P = nxaCalc(c),
    pp = by(P, "k401");
  chk(
    "pre-tax contributions count as already in the plan",
    P.pre === 500 && Math.abs(pp.nowY - 12 * (500 + B.matchNeed + pp.put)) < 1e-6,
    P.pre + " " + pp.nowY
  );
  delete c.x.kin.pre;
  /* ---------- steps before the accounts ---------- */
  c.cashes[0].amt = 0;
  syncAll(c);
  const C0 = nxaCalc(c);
  chk(
    "with no cash this month's money goes to the small cushion first, and the dollar after it to the match",
    by(C0, "cushion1").put === 1000 &&
      by(C0, "match").put === 0 &&
      C0.next.k === "match" &&
      nxaCalc(c, { extra: -500 }).next.k === "cushion1"
  );
  c.cashes[0].amt = 30000;
  c.match = "yes";
  syncAll(c);
  chk(
    "a player who gets the full match has that row done",
    by(nxaCalc(c), "match").full && by(nxaCalc(c), "match").off === "You get all of it"
  );
  c.match = "no";
  syncAll(c);
  /* ---------- the sheet ---------- */
  X("nxa");
  chk(
    "the sheet: the next dollar, the rows with limits and room, the extra question, the math",
    W.kind === "nxa" &&
      ov().includes("Where your next dollar goes") &&
      ov().includes("Next dollar") &&
      ov().includes("of $24,500 a year") &&
      ov().includes("Room left this year") &&
      ov().includes("Try extra dollars a month") &&
      ov().includes('data-a="acwhy"') &&
      ov().includes("Show the math") &&
      clean(ov()),
    junk(ov())
  );
  chk(
    "each row has an i",
    (ov().match(/nxarow/g) || []).length === 8 &&
      ov()
        .split("nxarow")
        .slice(1)
        .every(x => x.slice(0, 400).includes("term:"))
  );
  X("kitset", "2000", "nextacct|extra", { t: "n" });
  chk(
    "a tap on extra dollars moves the next dollar to the regular account",
    nxaCalc(c).next.k === "taxable" && ov().includes("no limit") && clean(ov()),
    junk(ov())
  );
  /* ---------- the spreadsheet, the skill link, the built list ---------- */
  const Bk = nxaBook(c),
    v = id => Bk.rows.find(r => r.id === id).v;
  chk(
    "the spreadsheet rows: limit, going in and room for each account",
    v("nx_money") === 3000 &&
      v("nx_k401_lim") === 24500 &&
      Math.abs(v("nx_k401_room") - Math.max(0, 24500 - v("nx_k401_now"))) < 1e-6 &&
      Bk.rows.find(r => r.id === "nx_roth_room").f === "=MAX(0,{nx_roth_lim}-{nx_roth_now})"
  );
  chk(
    "the spreadsheet of the plan has the section",
    bookSections(c).some(s => s.title === "Which account next")
  );
  const L = cxLink("main-path", 5);
  chk("the skill 'Decide which account gets money first' opens it", L && L.a === "nxa", JSON.stringify(L));
  const row = btRows().find(r => r.n.startsWith("Which account next"));
  chk("the row in What's built is built and opens the sheet", row && row.st === "b" && row.a === "nxa");
  chk("the menu and the screen i have it", MENU.some(x => x[1] === "nxa") && !!NV_INFO.nxa && !!GLOSS.nxanext);
  X("close");
  G.chars.length = n0;
  G.active = 0;
  save();
}
