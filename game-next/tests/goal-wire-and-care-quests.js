/* ============================================================================
   SLAM the Game, test: tests/goal-wire-and-care-quests.js
   PURPOSE     Examine the Job of Existing, features 4 and 5. Feature 4: a goal wired in three taps (the
               account, the amount, the day), the amount equal to the reverse of the Time-Money dial,
               payday as the default day, "Set once. Check in: quarterly." on the goal, the check-in
               quest with the four exits, I set it up as Automate it, the count of the Financial
               Planner, unwire and its undo, "I need one" in its fixed order with no default and no fee
               number, and the spreadsheet rows. Feature 5: each new quest in its season, its job, its
               four exits, each term in the glossary, the dates the person taps, the reminders on
               Today, the doctor visit, the yearly reset rows, and the built list rows.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: core/jobs.js, data/roles.js, features/goalwire.js,
               features/careq.js, and their calls in screens/ui.js, features/look.js, features/year.js,
               features/jobs.js and features/book.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Wire",
      led: true,
      placed: true,
      age: 33,
      take: 5000,
      spend: 3500,
      inv: 0,
      payFreq: "Every 2 weeks",
      payKnown: true,
      payNext: addDays(todayISO(), 4),
      incs: [R0({ k: "A main job", amt: 5000 })],
      spends: [R0({ k: "Home", amt: 2000 }), R0({ k: "Food", amt: 1500 })],
      cashes: [R0({ k: "Checking", amt: 3000 }), R0({ k: "Savings", amt: 1000 })],
      invs: [],
      debts: [],
      debt: 0,
      high: "no",
      goals: [{ id: "g1", k: "Trip", n: "Trip", cost: 3600, s: true, era: 0, fund: 0, d: todayISO() }],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C(),
    g = c.goals[0];

  /* ---------- math ---------- */
  chk(
    "deposits a year: payday follows the paycheck (26), the 1st is 12, the 1st and 15th is 24, a varied payday 12",
    jobWireTimes("pay", 26) === 26 &&
      jobWireTimes("d1", 26) === 12 &&
      jobWireTimes("1and15", 52) === 24 &&
      jobWireTimes("pay", 0) === 12
  );
  chk(
    "each deposit: $300 a month × 12 ÷ 26 = 138.46, rounded up to $139; empty is not zero",
    jobWirePer(300, 26) === 139 && jobWirePer(300, 12) === 300 && jobWirePer(null, 26) === null
  );
  chk(
    "the quarterly check-in: 3 months after the wiring, or after the last check-in; Nov 30 + 3 months is Feb 28",
    jobCheckNext("2026-11-25", null, "2026-12-01").next === "2027-02-25" &&
      !jobCheckNext("2026-11-25", null, "2026-12-01").due &&
      jobCheckNext("2026-11-25", null, "2027-02-25").due &&
      jobCheckNext("2026-11-25", "2027-03-01", "2027-04-01").next === "2027-06-01" &&
      jobAddMonths("2026-11-30", 3) === "2027-02-28"
  );
  const dn = jobDateNext("12-15", "2026-11-25", 30),
    dn2 = jobDateNext("03-01", "2026-11-25", 30);
  chk(
    "a date the person taps: Dec 15 is 20 days away, inside 30 days; Mar 1 comes next year, outside",
    dn.date === "2026-12-15" && dn.days === 20 && dn.open && dn2.date === "2027-03-01" && !dn2.open,
    [dn, dn2]
  );
  chk("a date that is not a date gives nothing", jobDateNext("", "2026-11-25") === null);

  /* ---------- feature 4: the goal view has the button ---------- */
  X("goal", "g1");
  chk(
    "the goal sheet offers Wire it up",
    ov().includes('data-a="wire" data-v="g1"') && ov().includes("Wire it up") && clean(ov()),
    junk(ov())
  );
  X("wire", "g1");
  chk(
    "step 1: the accounts by name, and I need one",
    ov().includes("1 of 3") &&
      ov().includes(">Checking<") &&
      ov().includes(">Savings<") &&
      ov().includes('data-a="wneed"') &&
      clean(ov()),
    junk(ov())
  );
  /* I need one: the fixed order, no default, no fee number */
  X("wneed");
  const need = ov(),
    order = WIRE_OPTIONS.map(x => x.n),
    at = order.map(n => need.indexOf(n));
  chk(
    "I need one: five kinds side by side, in the fixed order, said on the screen",
    order.join("|") === "A high-yield savings account|Fidelity|Schwab|Vanguard|Betterment" &&
      at.every((p, i) => p > 0 && (i === 0 || p > at[i - 1])) &&
      need.includes("Nothing here is picked for you") &&
      need.includes("A to Z"),
    at
  );
  chk(
    "the robo-advisor is not first, and nothing is marked as the default or picked",
    WIRE_OPTIONS[0].kind.indexOf("Robo") < 0 &&
      !/\b(recommended|best|default)\b/i.test(need.replace(/data-[a-z]+="[^"]*"/g, "")) &&
      !/class="[^"]*\b(on|primary)\b[^"]*" data-a="wpick"/.test(need)
  );
  chk(
    "no fee number without a source: each says Check the fee on their page, and no percent is shown",
    (need.match(/Check the fee on their page/g) || []).length === 5 && !/\d(\.\d+)?%/.test(need)
  );
  chk("the Fee X-ray is one tap away", need.includes('data-a="compare" data-v="fee"'));
  X("navback");
  chk("Back from I need one goes to step 1", ov().includes("1 of 3") && ov().includes('data-a="wneed"'));

  /* the three taps */
  const taps0 = jobNow(c).L.byRole.planner;
  X("wacct", "cash:1");
  chk("tap 1: the account; step 2 asks how much", ov().includes("2 of 3") && ov().includes("How much a month?"));
  const A = wireAmts(c, g),
    first = A.list[0];
  chk(
    "the amounts come from the dial's reverse: each one is goalExtraFor(what is left, 0, months)",
    A.need === 3600 &&
      A.list.length >= 3 &&
      A.list.every(x => x.amt === goalExtraFor(3600, 0, x.m).extra) &&
      A.list.some(x => x.m === 12 && x.amt === 300) &&
      ov().includes("$300 a month"),
    A.list
  );
  const twelve = A.list.find(x => x.m === 12);
  X("wamt", String(twelve.amt), String(twelve.m));
  chk(
    "tap 2: the amount; step 3 has payday first, as the default",
    ov().includes("3 of 3") &&
      /class="primary wide" data-a="wday" data-v="pay"/.test(ov()) &&
      ov().includes("(the default)") &&
      ov().includes("$139 each time") &&
      ov().includes("every 2 weeks"),
    junk(ov())
  );
  X("wday", "pay");
  const W1 = g.wire;
  chk(
    "tap 3: saved on the goal, in its stored shape",
    W1 &&
      W1.v === 1 &&
      W1.acct.n === "Savings" &&
      W1.acct.key === "cash:1" &&
      W1.amt === 300 &&
      W1.from === "m" &&
      W1.m === 12 &&
      W1.day === "pay" &&
      W1.d === todayISO(),
    W1
  );
  chk(
    "the countdown takes the same monthly amount (one number for one thing)",
    kitValue(c, "countdown", "g1:monthly", 0).v === 300
  );
  chk(
    "the set card: Set once. Check in: quarterly., the bank line, I set it up, and no money moved",
    ov().includes("Set once. Check in: quarterly.") &&
      ov().includes("SLAM does not move money") &&
      ov().includes("repeating transfer of $139") &&
      ov().includes('data-a="jbexit" data-k="w:g1" data-v="auto"') &&
      c.cashes[1].amt === 1000 &&
      clean(ov()),
    junk(ov())
  );
  /* the check-in quest */
  const T = jobTasks(c),
    q = T.find(t => t.id === "q:g1"),
    dep = T.find(t => t.id === "w:g1");
  chk(
    "the check-in quest exists: the Financial Planner's, 4 times a year, and the deposit task beside it",
    q && q.role === "planner" && q.times === 4 && dep && dep.role === "planner" && dep.times === 26
  );
  chk(
    "the check-in quest shows its four exits on the goal",
    JOB_EXITS.every(e => ov().includes('data-k="q:g1" data-v="' + e[0] + '"')),
    junk(ov())
  );
  chk(
    "the planner job counts both new tasks",
    jobNow(c).L.byRole.planner.m === taps0.m + 2 && jobNow(c).L.byRole.planner.n === taps0.n
  );
  X("jbexit", "auto", "w:g1");
  chk(
    "I set it up is Automate it: a task off the plate, with the money win",
    jobExit(c, dep).e === "auto" &&
      jobNow(c).L.byRole.planner.n === taps0.n + 1 &&
      ov().includes("On autopilot") &&
      ov().includes("A money win"),
    junk(ov())
  );
  X("jbexit", "hand", "q:g1");
  X("jbhand", "coach", "q:g1");
  chk(
    "the check-in can be handed off: the role map record",
    jobExit(c, q).e === "hand" && c.x.roleMap.some(m => m.task === "q:g1" && m.who.k === "coach")
  );
  /* the goal card on My Goals */
  closeSheet();
  chk("the goal card shows the line", goalsCard(c, D, "open").includes("Set once. Check in: quarterly."));
  /* the spreadsheet rows */
  const B = wireBook(c),
    bv = id => (B.rows.find(r => r.id === id) || {}).v;
  chk(
    "the spreadsheet: the goal, the account, the monthly amount with its formula, the day",
    bv("wg0_acct") === "Savings" &&
      bv("wg0_amt") === 300 &&
      bv("wg0_per") === 139 &&
      B.rows.find(r => r.id === "wg0_per").f === "=ROUNDUP({wg0_amt}*12/{wg0_times},0)" &&
      bv("wg0_need") === goalExtraFor(bv("wg0_left"), 0, bv("wg0_months")).extra &&
      B.rows.find(r => r.id === "wg0_need").f.indexOf("ROUNDUP") > 0 &&
      bv("wg0_day") === "Each payday" &&
      bookTable(c).S.some(s => s.title.indexOf("Wired goals") === 0),
    B.rows
  );
  /* a check-in that is due lands on Today */
  const saved = g.wire.d;
  g.wire.d = addDays(todayISO(), -100);
  chk(
    "a due check-in is on Today and opens the goal's wire",
    todayExtras(c, todayISO()).some(x => x.a === "wcheck" && x.id === "g1")
  );
  X("wcheck", "g1");
  chk("Open it shows I checked in", ov().includes('data-a="wchecked"'));
  X("wchecked", "g1");
  chk("I checked in moves the next check-in 3 months on", g.wire.chk === todayISO() && !wireNow(c, g).chk.due);
  g.wire.d = saved;
  /* unwire, and undo */
  X("wunwire", "g1");
  chk(
    "unwire: no wire, no tasks, no exits, no role map record, the countdown amount back out, an Undo",
    !g.wire &&
      !jobTasks(c).some(t => t.id === "q:g1") &&
      !jobOf(c).exits["w:g1"] &&
      !c.x.roleMap.some(m => m.task === "q:g1") &&
      kitValue(c, "countdown", "g1:monthly", 0).given === false &&
      ov().includes('data-a="wundo"'),
    junk(ov())
  );
  X("wundo", "g1");
  chk(
    "undo puts it all back",
    g.wire &&
      g.wire.amt === 300 &&
      jobOf(c).exits["w:g1"].e === "auto" &&
      c.x.roleMap.some(m => m.task === "q:g1") &&
      kitValue(c, "countdown", "g1:monthly", 0).v === 300
  );
  /* a typed amount */
  X("wredo", "g1");
  X("wacct", "cash:0");
  X("padopen", null, "wamt");
  W.o.wamt = 175;
  X("wtyped");
  X("wday", "d15");
  chk(
    "a typed amount on the 15th: 12 deposits of $175, the wiring day kept",
    g.wire.amt === 175 && g.wire.from === "typed" && wireNow(c, g).per === 175 && g.wire.d === saved
  );
  closeSheet();

  /* ---------- feature 5: the quests ---------- */
  const keyOf = (S, it) => S.k + ":" + it[0],
    oe = SEASONS.find(S => S.k === "oe");
  chk(
    "the November season: open enrollment and the coverage review, each naming its job",
    oe &&
      oe.from === "11-01" &&
      oe.to === "11-30" &&
      oe.items.find(i => i[0] === "enroll")[3] === "health" &&
      oe.items.find(i => i[0] === "cover")[3] === "insurance"
  );
  chk(
    "HSA receipts are in tax season, next to the forms",
    SEASONS.find(S => S.k === "tax").items.some(i => i[0] === "hsa" && i[3] === "health")
  );
  const careTask = qq => JOB_TASKS.find(t => t.id === qq.task);
  chk(
    "each quest is a task of its job, with the job of the quest",
    CARE_QUESTS.length === 6 &&
      CARE_QUESTS.every(qq => careTask(qq) && careTask(qq).role === qq.role && JOB_ROLES[qq.role])
  );
  chk(
    "the seasonal quests are the same task as their seasonal item (no second copy)",
    careTask(careQuest("oe")).season.includes("oe:enroll") &&
      careTask(careQuest("review")).season.includes("oe:cover") &&
      careTask(careQuest("fsa")).season.includes("ye:fsa") &&
      careTask(careQuest("hsa")).season.includes("tax:hsa") &&
      !jobTasks(c).some(t => /^s:(oe|tax:hsa)/.test(t.id))
  );
  chk(
    "every term of every quest has a glossary entry",
    CARE_QUESTS.every(qq => qq.terms.every(k => GLOSS[k] && GLOSS[k][0] && GLOSS[k][1])) &&
      ["eob", "deductible", "oopmax", "hsa", "fsa", "openenroll", "premium", "beneficiary"].every(k => GLOSS[k]),
    CARE_QUESTS.map(qq => qq.terms.filter(k => !GLOSS[k]))
  );
  /* each quest's sheet: the steps, the terms as taps, the four exits */
  CARE_QUESTS.forEach(qq => {
    X("care", qq.id);
    const h = ov();
    chk(
      "quest " + qq.id + ": its job, its steps, its terms as taps, its four exits",
      h.includes(JOB_ROLES[qq.role].n + " quest") &&
        qq.terms.every(k => h.includes('data-a="info" data-k="term:' + k + '"')) &&
        JOB_EXITS.every(e => h.includes('data-k="' + qq.task + '" data-v="' + e[0] + '"')) &&
        clean(h),
      junk(h)
    );
  });
  /* in November, the season lists and Today */
  const nov = todayISO().slice(0, 4) + "-11-10",
    tx = todayExtras(c, nov);
  chk(
    "in November, Today has the open enrollment check and the coverage review, and they open their quests",
    tx.some(x => /:oe:enroll$/.test(x.id) && x.a === "cqopen") &&
      tx.some(x => /:oe:cover$/.test(x.id) && x.a === "cqopen"),
    tx
  );
  X("cqopen", todayISO().slice(0, 4) + ":oe:cover");
  chk(
    "the coverage review opens Insurance needs",
    W.q === "review" && ov().includes('data-a="cover"') && ov().includes("Open Insurance needs")
  );
  /* a date the person taps once */
  X("care", "oe");
  chk("no general date is shown: it asks for the person's own", ov().includes("Tap your date"));
  X("cqmon", "12", "oe");
  X("cqday", "15", "oe");
  chk("the window's last day is saved as the person's tap", careOf(c).dates.oe === "12-15");
  const due = careDue(c, todayISO().slice(0, 4) + "-11-30");
  chk(
    "21 days before, the reminder is on Today; not before",
    due.some(x => x.id.indexOf("care:oe@") === 0) &&
      !careDue(c, todayISO().slice(0, 4) + "-11-20").some(x => x.q === "oe"),
    due
  );
  /* the policy renewals: one date each, a task each */
  X("care", "renew");
  X("cqmon", "03", "renew:auto");
  X("cqday", "01", "renew:auto");
  X("cqmon", "07", "renew:renters");
  X("cqday", "31", "renew:renters");
  chk(
    "two policy dates: each one a task of the Insurance Coordinator, with the four exits",
    jobTasks(c).filter(t => t.id.indexOf("c:renew:") === 0 && t.role === "insurance").length === 2 &&
      careDates(c)
        .find(x => x.k === "renew:renters")
        .date.slice(5) === "07-31"
  );
  X("cqclear", null, "renew:renters");
  chk("a date can be cleared", !careOf(c).dates["renew:renters"]);
  /* the doctor visit */
  X("care", "eob");
  X("cqvisit");
  chk(
    "after I saw a doctor, Today has Check the bill against the EOB",
    todayExtras(c, todayISO()).some(x => x.t === "Check the bill against the EOB" && x.a === "cqopen")
  );
  X("cqvisitdone", careOf(c).visits[0].id);
  chk("The bill matched takes it off Today", !careDue(c, todayISO()).some(x => x.q === "eob"));
  /* the yearly reset */
  const rs = resets(c, todayISO());
  chk(
    "the yearly reset has the person's open enrollment date and policy renewals",
    rs.rows.some(r => r.n === "Open enrollment" && /Closes/.test(r.v)) &&
      rs.rows.some(r => r.n === "Policy renewals" && /1 date/.test(r.v))
  );
  chk(
    "the list sheet shows both jobs",
    (X("care"), ov().includes("Health Care Admin") && ov().includes("Insurance Coordinator") && clean(ov()))
  );
  chk(
    "the menu has the row",
    MENU.some(m => m[1] === "care")
  );
  chk(
    "the spreadsheet has the dates",
    careBook(c).rows.length === 2 && bookTable(c).S.some(s => /Health and insurance dates/.test(s.title))
  );
  ["Goal to account", "Health and insurance quests"].forEach(n => {
    const row = WB.find(r => r[1].indexOf(n) === 0);
    chk("the built list row " + n + ", and its probe passes", row && row[2] === "b" && row[3]());
  });
  closeSheet();
  G.chars.length = n0;
  G.active = 0;
  save();
}
