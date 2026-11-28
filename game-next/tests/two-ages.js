/* ============================================================================
   SLAM the Game, test: tests/two-ages.js
   PURPOSE     Examine "Your two ages": the age when work is optional (the freedom date of the plan), the
               first age when the money can be reached, the gap, one column for each person of a
               household, the sheet, the spreadsheet rows, the built row and the links from the skills.
   INPUT       The game scripts, loaded by harness.cjs. Three sample profiles.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/ages.js (and its use of features/takeout.js).
   ========================================================================= */
{
  const n0 = G.chars.length,
    coach0 = G.coach,
    R0 = r => Object.assign({ s: true }, r),
    make = (name, age, ret, invs, cash) =>
      Object.assign(newChar(), {
        name,
        led: true,
        placed: true,
        age,
        ret,
        take: 8000,
        spend: 4000,
        inv: invs.reduce((s, r) => s + r.amt, 0),
        incs: [R0({ k: "A main job", amt: 8000 })],
        spends: [R0({ k: "Home", amt: 2000 }), R0({ k: "Food", amt: 2000 })],
        cashes: [R0({ k: "Checking", amt: cash })],
        invs: invs.map(R0),
        debts: [],
      }),
    /* open money: a regular account and cash */
    open = make("Open", 40, 50, [{ k: "Other investments", amt: 600000 }], 20000),
    /* the same money, all in the plan at work */
    shut = make("Shut", 40, 50, [{ k: "Retirement plan at work", amt: 600000 }], 20000),
    /* a late start: the money is enough only after 59 and a half */
    late = make("Late", 58, 67, [{ k: "Retirement plan at work", amt: 200000 }], 5000);
  G.demo = false;
  G.tourSeen = true;
  G.coach = false;
  G.chars.push(open);
  G.active = n0;
  syncAll(open);
  syncAll(shut);
  syncAll(late);
  save();
  go("home");
  const c = C(),
    d = derive(c),
    m = goalSim(c).eraAt[8];
  /* ---------- work optional ---------- */
  chk(
    "work optional is the freedom date of the plan engine",
    d.era < 8 && m > 0 && Math.abs(agesOptional(c) - (c.age + m / 12)) < 1e-9 && agesOptional(c) < 59.5,
    agesOptional(c)
  );
  const A = agesFor(c),
    S = agesFor(shut);
  chk(
    "the same money and plan give the same first age",
    A.optional === S.optional && A.optional === Math.round(agesOptional(c) * 10) / 10
  );
  /* ---------- money reachable ---------- */
  const first = Math.ceil(agesOptional(c)),
    B = tkoBridge(c, first);
  chk(
    "open money: reachable at the first whole age, by bridge accounts, and the two ages count as the same",
    A.reach === first && A.same && A.path && A.path.id === "bridge" && B.paths[0].state !== "short" && A.gap < 1,
    JSON.stringify([A.optional, A.reach, A.path && A.path.id])
  );
  chk(
    "the same money in the plan at work: bridge accounts are short at that age",
    tkoBridge(shut, first).paths[0].state === "short" && S.reach >= A.reach && S.path && S.path.id !== "bridge",
    JSON.stringify([S.optional, S.reach, S.path && S.path.id])
  );
  chk(
    "the reachable age is the first age where one path pays each year",
    (() => {
      const P = tkoInputs(shut);
      for (let a = first; a < S.reach; a++)
        if (tkoBridge(shut, a, P).paths.some(p => p.ok && p.state !== "short")) return false;
      return tkoBridge(shut, S.reach, P).paths.some(p => p.ok && p.state !== "short" && p.id === S.path.id);
    })()
  );
  /* remove the early ways that need pre-tax rules: with no money at all in reach and a tiny plan, the age is 59.5 */
  const stuck = make("Stuck", 50, 52, [{ k: "IRA or Roth IRA", amt: 2500000 }], 0);
  syncAll(stuck);
  kitStore(stuck, "tko").roth = { v: 0.25, cf: 2 };
  const K = agesFor(stuck);
  chk(
    "a gap shows when the money is enough but not open: reachable is later than optional",
    K.optional != null &&
      K.reach > K.optional &&
      K.gap === Math.round((K.reach - K.optional) * 10) / 10 &&
      K.reach <= 59.5,
    JSON.stringify([K.optional, K.reach, K.gap])
  );
  const L = agesFor(late);
  chk(
    "after 59 and a half the two ages are the same and no path is needed",
    L.optional == null || (L.optional >= 59.5 && L.reach === L.optional && L.same && L.gap === 0 && !L.path),
    JSON.stringify([L.optional, L.reach])
  );
  chk(
    "a plan with no freedom date in sight gives no ages, and no crash",
    (() => {
      const z = make("Zero", 30, 60, [], 0);
      z.take = 3000;
      z.spend = 3000;
      z.incs[0].amt = 3000;
      z.spends = [R0({ k: "Home", amt: 3000 })];
      syncAll(z);
      const r = agesFor(z);
      return r.optional == null && r.reach == null && r.gap == null;
    })()
  );
  /* ---------- the sheet: one person, then a household ---------- */
  X("ages");
  chk(
    "the sheet for one person: both ages, an i on each label, clean, no typing",
    W.kind === "ages" &&
      ov().includes("Work optional at") &&
      ov().includes("Money reachable at") &&
      ov().includes('data-k="term:ag_opt"') &&
      ov().includes('data-k="term:ag_reach"') &&
      ov().includes("Show the math") &&
      !/<input|<textarea|<select/.test(ov()) &&
      !ov().includes("\u2014") &&
      clean(ov()),
    junk(ov())
  );
  const all = G.chars,
    act = G.active;
  G.chars = [c];
  G.active = 0;
  X("ages");
  chk(
    "one person has one column, titled You",
    agesPeople().length === 1 &&
      (ov().match(/kitcol /g) || []).length === 1 &&
      ov().includes('<b class="small">You</b>')
  );
  G.chars = all;
  G.active = act;
  G.chars.push(shut);
  X("ages");
  chk(
    "a household: one column for each person, each on their own numbers",
    agesPeople().length === G.chars.length &&
      (ov().match(/kitcol /g) || []).length === G.chars.length &&
      ov().includes('<b class="small">Open</b>') &&
      ov().includes('<b class="small">Shut</b>') &&
      ov().includes("What closes the gap") ===
        agesPeople()
          .map(agesFor)
          .some(a => a.gap > 0 && !a.same) &&
      clean(ov()),
    junk(ov())
  );
  G.coach = true;
  chk("people that a coach helps are not put side by side", agesPeople().length === 1 && agesPeople()[0] === C());
  G.coach = false;
  X("takeout", "bridge");
  chk("the sheet links to the years before 59 and a half", W.kind === "takeout" && W.tab === "bridge");
  X("navback");
  chk("Back returns to the two ages", W && W.kind === "ages" && NV_INFO.ages && NV_INFO.ages[0] === "Your two ages");
  /* ---------- the spreadsheet, the built list, the skills ---------- */
  const rows = agesBook(c).rows,
    v = id => rows.find(r => r.id === id).v;
  chk(
    "the spreadsheet rows agree with the game",
    v("ag_opt") === A.optional &&
      v("ag_reach") === A.reach &&
      Math.abs(v("ag_gap") - Math.max(0, v("ag_reach") - v("ag_opt"))) < 1e-9 &&
      Math.abs(v("ag_wait") - (v("ag_opt") - v("ag_now"))) < 1e-9 &&
      BOOK_PARTS.includes(agesBook)
  );
  const row = btRows().find(r => r.n.startsWith("Two ages"));
  chk("the built list: built, with the action", row && row.st === "b" && row.a === "ages");
  const links = [];
  ["withdrawal-decumulation", "pre-retirement-design"].forEach(t =>
    SKILLS[t].skills.forEach((s, i) => {
      const k = cxLink(t, i);
      if (k && k.a === "ages") links.push(t + ":" + i);
    })
  );
  chk(
    "real skills link to the sheet, in both tracks",
    links.includes("pre-retirement-design:22") && links.some(l => l.startsWith("withdrawal")),
    links.join()
  );
  X("cxdo", "", "ages");
  chk("the link opens the sheet", W.kind === "ages");
  chk(
    "the menu has it",
    MENU.some(x => x[1] === "ages")
  );
  chk("no error was recorded", ERRLOG.length === 0, JSON.stringify(ERRLOG.slice(-1)));
  X("close");
  G.chars.length = n0;
  G.active = 0;
  G.coach = coach0;
  save();
}
