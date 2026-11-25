/* ============================================================================
   SLAM the Game, test: tests/your-unpaid-jobs.js
   PURPOSE     Examine the Job of Existing, features 1 to 3: the six jobs worked out from answers already
               given (three made-up profiles), the block on the character sheet and on Me, the next step
               of a job, the admin hours by hand (Guess, Close, Exact), Running it and Living it, the Home
               card, the time ledger tile, the four exits with undo (a schedule, a skill, a hand-off to a
               person), the household role map record, the spreadsheet rows, and the built list row.
   INPUT       The game scripts, loaded by harness.cjs. Three sample profiles.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: core/jobs.js, data/roles.js, features/jobs.js, and their calls
               in features/reveal.js, screens/ui.js and features/book.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    ids = rs => rs.map(r => r.id).join(","),
    base = o =>
      Object.assign(
        newChar(),
        {
          led: true,
          placed: true,
          incs: [R0({ k: "A main job", amt: 4000 })],
          spends: [R0({ k: "Home", amt: 1500 }), R0({ k: "Food", amt: 1500 })],
          cashes: [R0({ k: "Checking", amt: 3000 })],
          invs: [],
          debts: [],
          debt: 0,
          high: "no",
          take: 4000,
          spend: 3000,
          inv: 0,
        },
        o
      );

  /* ---------- 1. the six jobs, from answers already given ---------- */
  /* A solo renter with pay that moves, living with family, side gigs. */
  const solo = base({
    name: "Solo",
    age: 24,
    work: "A few jobs or gigs",
    incKinds: ["A main job", "Side gigs"],
    steady: "Changes month to month",
    home: "With family",
    live: ["Parents or family"],
    deps: "None",
    share: "No one",
    invest: "No",
    accts: ["Checking"],
  });
  /* A couple with kids, who own their home and invest. */
  const fam = base({
    name: "Family",
    age: 41,
    work: "Established",
    incKinds: ["A main job"],
    steady: "Steady",
    home: "Owning",
    live: ["A partner", "Kids"],
    deps: "Kids",
    share: "A partner",
    invest: "Every month",
    accts: ["Checking", "Savings", "Retirement plan at work", "HSA"],
    debtKinds: ["Car loan"],
    prot: { life: "Yes", health: "Through my job" },
    goals: [{ id: "g1", k: "Trip", n: "Trip", cost: 4000, era: 4, fund: 0 }],
  });
  /* Three people who share money, renting, with roommates and a credit card. */
  const poly = base({
    name: "Three",
    age: 33,
    work: "Self-employed",
    incKinds: ["My own business"],
    steady: "Changes month to month",
    home: "Renting",
    live: ["Roommates", "A partner"],
    deps: "None",
    share: "More than one partner",
    invest: "Sometimes",
    accts: ["Checking", "Savings"],
    cashes: [R0({ k: "Checking", amt: 3000 }), R0({ k: "Savings", amt: 2000 })],
    debts: [R0({ k: "Credit card balance", amt: 2000, high: true, apr: "15% to 25%", rate: 20, pay: 80 })],
    debt: 2000,
    party: [
      { id: "pA", k: "Partner", n: "Ash", links: [], amt: {} },
      { id: "pB", k: "Partner", n: "Bo", links: [], amt: {} },
    ],
  });
  const rSolo = jobRoles(jobAnswers(solo)),
    rFam = jobRoles(jobAnswers(fam)),
    rPoly = jobRoles(jobAnswers(poly));
  chk(
    "every player holds all six jobs",
    [rSolo, rFam, rPoly].every(r => r.length === 6 && r.every(x => x.score >= 1))
  );
  chk(
    "the solo renter: the Accountant (gigs, two kinds of pay) and the CFO (pay that moves) lead",
    rSolo[0].id === "accountant" && rSolo[1].id === "cfo" && rSolo[1].why.includes("Your pay changes month to month"),
    ids(rSolo)
  );
  chk(
    "the couple with kids: the Financial Planner leads, Health Care Admin counts the HSA and the kids",
    rFam[0].id === "planner" &&
      rFam.find(r => r.id === "health").why.includes("You have an HSA") &&
      rFam.find(r => r.id === "health").why.includes("Kids, and their doctor visits") &&
      rFam.find(r => r.id === "insurance").why.includes("A car to insure"),
    ids(rFam)
  );
  chk(
    "the three-person household: the CFO counts the shared money, the Deals Manager the card and the roommates",
    rPoly.find(r => r.id === "cfo").why.includes("You combine money with someone") &&
      rPoly.find(r => r.id === "deals").why.includes("Credit cards to manage") &&
      rPoly.find(r => r.id === "deals").why.includes("Bills split with roommates"),
    ids(rPoly)
  );
  chk(
    "a score is 1 plus the answers that count, and the shares add up to 1",
    rFam.every(r => r.score === 1 + r.why.length) && Math.abs(rFam.reduce((t, r) => t + r.share, 0) - 1) < 1e-9
  );
  chk("ties keep the order of the six", ids(jobRoles({})) === JOB_IDS.join(","));
  chk(
    "each job has a name, an i line, trees that exist, and tasks",
    JOB_IDS.every(
      id =>
        JOB_ROLES[id] &&
        JOB_ROLES[id].n &&
        JOB_ROLES[id].one &&
        JOB_ROLES[id].trees.every(t => SKILLS[t] && TREES[t]) &&
        JOB_ROLES[id].regions.every(r => REGIONS.some(x => x.id === r)) &&
        JOB_TASKS.some(t => t.role === id)
    )
  );
  chk(
    "each task's Do it screen and automation skill are real",
    JOB_TASKS.every(
      t =>
        (!t.a || typeof ACT[t.a] === "function") &&
        (!t.skill || (SKILLS[t.skill.split(":")[0]] && SKILLS[t.skill.split(":")[0]].skills[+t.skill.split(":")[1]])) &&
        (t.skill || t.auto)
    ),
    JOB_TASKS.filter(t => t.a && typeof ACT[t.a] !== "function").map(t => t.a)
  );

  /* ---------- 2. admin hours, by hand ---------- */
  const A0 = jobAdmin({});
  chk(
    "no taps: each job at its default, the total is a Guess (60+60+15+15+15+15 = 180 min)",
    A0.total === 180 && A0.st === "Guess" && A0.rows.every(r => !r.given && r.cf === 1)
  );
  const A1 = jobAdmin({ cfo: { v: 180, cf: 2 }, accountant: { v: 60, cf: 3 }, planner: { v: 0, cf: 2 } });
  chk("three taps: 180 + 60 + 0 + 15 + 15 + 15 = 285, still a Guess", A1.total === 285 && A1.st === "Guess");
  const all = {};
  JOB_IDS.forEach(id => (all[id] = { v: 15, cf: 3 }));
  chk("all six Exact: 90 min, Exact", jobAdmin(all).total === 90 && jobAdmin(all).st === "Exact");
  all.deals = { v: 300, cf: 2 };
  chk("one Close among Exact: Close", jobAdmin(all).st === "Close" && jobAdmin(all).total === 375);
  const T = [
    { id: "a", role: "cfo", per: 10, times: 26 },
    { id: "b", role: "cfo", per: 20, times: 12 },
    { id: "c", role: "health", per: 30, times: 1 },
  ];
  chk(
    "a task's minutes a month: 10 × 26 ÷ 12 = 21.67, 20 × 12 ÷ 12 = 20",
    Math.abs(jobTaskMonthly(T[0]) - 260 / 12) < 1e-9 && jobTaskMonthly(T[1]) === 20
  );
  const L1 = jobLiving(A0, T, { a: "auto", b: "do", c: "drop" });
  chk(
    "Living it: 21.67 (cfo, auto) + 2.5 (health, drop) = 24.17; do keeps b on the plate",
    Math.abs(L1.living - (260 / 12 + 2.5)) < 1e-9 &&
      Math.abs(L1.running - (180 - 260 / 12 - 2.5)) < 1e-9 &&
      L1.byRole.cfo.n === 1 &&
      L1.byRole.cfo.m === 2 &&
      L1.byRole.health.n === 1
  );
  chk("13% better (24.17 ÷ 180)", L1.better === 13 && jobBetterWords(L1).indexOf("13% better") === 0);
  const L2 = jobLiving(jobAdmin({ cfo: { v: 300, cf: 2 } }), [{ id: "x", role: "cfo", per: 1, times: 12 }], {
    x: "drop",
  });
  chk("one minute back of 405 is still shown as 1% better, never 0%", L2.living === 1 && L2.better === 1);
  chk(
    "nothing back: no percent, an invite",
    jobLiving(A0, T, {}).better === 0 && /1% better/.test(jobBetterWords(jobLiving(A0, T, {})))
  );
  const L3 = jobLiving(jobAdmin({ cfo: { v: 15, cf: 2 } }), T, { a: "auto", b: "hand" });
  chk("a job gives back at most its own time (41.67 capped at 15)", L3.byRole.cfo.saved === 15 && L3.living === 15);
  chk(
    "saves you ~X min/month, rounded, at least 1",
    jobSaveWords(260 / 12) === "saves you ~22 min/month" &&
      jobSaveWords(0.2) === "saves you ~1 min/month" &&
      jobSaveWords(0) === null
  );
  chk(
    "hours as words",
    jobHoursWords(45) === "45 min" && jobHoursWords(60) === "1 hr" && jobHoursWords(150) === "2.5 hrs"
  );

  /* ---------- the screens ---------- */
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(poly);
  G.active = n0;
  syncAll(poly);
  save();
  go("me");
  chk(
    "Me: the block, the top 3 cards, each with its i and its progress",
    app().includes("You already work 6 jobs nobody pays you for.") &&
      (app().match(/data-a="job" data-v="/g) || []).length === 3 &&
      app().includes('data-k="term:job_') &&
      app().includes("tasks off your plate") &&
      clean(app()),
    junk(app())
  );
  X("jobs");
  chk(
    "See all: the sheet with all 6, the hours a month as a Guess, the two bars, the math",
    W.kind === "jobs" &&
      (ov().match(/data-a="job" data-v="/g) || []).length === 6 &&
      ov().includes("Hours a month") &&
      ov().includes("Guess") &&
      ov().includes("Running it") &&
      ov().includes("Living it") &&
      ov().includes("Show the math") &&
      clean(ov()),
    junk(ov())
  );
  X("reveal");
  W.i = 6;
  drawSheet();
  chk(
    "the character sheet: the block with the top 3 and See all 6",
    ov().includes("You already work 6 jobs nobody pays you for.") &&
      (ov().match(/data-a="job" data-v="/g) || []).length === 3 &&
      ov().includes("See all 6"),
    junk(ov())
  );
  X("jball");
  chk(
    "See all 6 opens all six in place",
    (ov().match(/data-a="job" data-v="/g) || []).length === 6 && ov().includes("Show my top 3")
  );
  const top = rPoly[0].id;
  X("job", top);
  const nx = jobNext(C(), top);
  chk(
    "a tap on a job opens its sheet: the next step of its trees, its tasks, the hours question",
    W.kind === "job" &&
      nx &&
      ov().includes('data-a="skill" data-v="' + nx.id + '"') &&
      ov().includes("Next step: ") &&
      ov().includes("About how long a month does this job take?") &&
      ov().includes(">5+ hrs<") &&
      clean(ov()),
    junk(ov())
  );

  /* the hours question: a tap is Close, then Exact */
  X("job", "cfo");
  const ch = (ov().match(/<button class="chip[^"]*" data-a="kitset" data-k="jobmins\|cfo" data-v="180"[^>]*>/) ||
    [])[0];
  chk("the 3 hrs chip is there", !!ch);
  ACT.kitset({ dataset: { k: "jobmins|cfo", v: "180", t: "n" } });
  chk("a tap keeps 180 min as Close", C().x.jobmins.cfo.v === 180 && C().x.jobmins.cfo.cf === 2);
  ACT.kitsure({ dataset: { k: "jobmins|cfo", v: "3", t: "n", f: "60" } });
  chk("Exact on the same answer", C().x.jobmins.cfo.cf === 3 && jobAdmin(C().x.jobmins).total === 300);

  /* ---------- 3. the four exits ---------- */
  const tk = "cfo_review",
    tt = JOB_TASKS.find(t => t.id === tk);
  X("jbopen", tk);
  chk(
    "a task opens: saves you ~X min/month, Show the math, the four ways out",
    ov().includes("saves you ~10 min/month") &&
      ["Do it", "Automate it", "Hand it off", "Drop it"].every(l => ov().includes(">" + l + "<")) &&
      ov().includes("min a year"),
    junk(ov())
  );
  const before = jobNow(C()).L.byRole.cfo.n;
  X("jbexit", "drop", tk);
  chk(
    "Drop it: off the plate, the count moves, the banner says what moved",
    jobOf(C()).exits[tk].e === "drop" &&
      jobNow(C()).L.byRole.cfo.n === before + 1 &&
      ov().includes("Dropped: The yearly money review") &&
      ov().includes("jbmoved"),
    junk(ov())
  );
  X("jbundo", tk);
  chk(
    "Undo: back on the plate",
    !jobOf(C()).exits[tk] && jobNow(C()).L.byRole.cfo.n === before && ov().includes("Back on your plate")
  );
  X("jbexit", "auto", tk);
  chk(
    "Automate it: a money win, the badge, inline so the job stays open",
    jobOf(C()).exits[tk].e === "auto" &&
      W.kind === "job" &&
      ov().includes("A money win") &&
      ov().includes("On autopilot: The yearly money review") &&
      C().badges.some(b => b.id === "jobauto"),
    junk(ov())
  );
  X("jbexit", "do", tk);
  chk(
    "Do it: the task stays on the plate, on purpose",
    jobOf(C()).exits[tk].e === "do" && jobNow(C()).L.byRole.cfo.n === before
  );

  /* a schedule: Automate it is the schedule's own switch, and undo puts it back */
  C().routines = [
    { id: "r1", t: "move", amt: 100, from: "Checking", to: "Savings", every: "month", next: todayISO(), auto: false },
  ];
  const rt = jobTasks(C()).find(t => t.id === "r:r1");
  chk(
    "a schedule is a task of the Financial Planner, 5 min 12 times a year",
    rt && rt.role === "planner" && rt.times === 12
  );
  X("job", "planner");
  X("jbexit", "auto", "r:r1");
  chk(
    "Automate it turns the schedule to automatic",
    C().routines[0].auto === true && jobOf(C()).exits["r:r1"].was === false
  );
  X("jbundo", "r:r1");
  chk("undo turns it back to by hand", C().routines[0].auto === false && !jobOf(C()).exits["r:r1"]);
  C().routines[0].auto = true;
  chk(
    "a schedule set to automatic on Next Steps counts by itself",
    jobExit(C(), rt).e === "auto" && jobExit(C(), rt).from === "schedule"
  );
  C().routines = [];

  /* a done automation skill counts the task as automated */
  const sk = JOB_TASKS.find(t => t.id === "pl_invest").skill;
  C().skills[sk] = todayISO();
  chk(
    "the automation skill done: the task is automated (the level-up of the skill)",
    jobExit(
      C(),
      JOB_TASKS.find(t => t.id === "pl_invest")
    ).from === "skill"
  );
  delete C().skills[sk];

  /* Hand it off to a person writes the household role map */
  X("job", "deals");
  X("jbopen", "dl_bills");
  X("jbexit", "hand", "dl_bills");
  chk(
    "Hand it off asks who: each person by name, the coach, the tools; no partner 1 or partner 2",
    ov().includes("Who takes it?") &&
      ov().includes(">Ash<") &&
      ov().includes(">Bo<") &&
      ov().includes(">My coach<") &&
      ov().includes(">A bill-lowering service<") &&
      !/partner 1|partner 2/i.test(ov()),
    junk(ov())
  );
  X("jbhand", "p:pB", "dl_bills");
  const RM = C().x.roleMap;
  chk(
    "the record: role, task, who, when",
    RM.length === 1 &&
      RM[0].role === "deals" &&
      RM[0].task === "dl_bills" &&
      RM[0].who.k === "person" &&
      RM[0].who.n === "Bo" &&
      RM[0].who.p === "pB" &&
      RM[0].when === todayISO() &&
      jobOf(C()).exits.dl_bills.map === RM[0].id &&
      ov().includes("Bo has it now"),
    JSON.stringify(RM)
  );
  X("jbexit", "hand", "dl_bills");
  X("jbhand", "coach", "dl_bills");
  chk(
    "a second hand-off replaces the first (one record for the task)",
    C().x.roleMap.length === 1 && C().x.roleMap[0].who.k === "coach"
  );
  X("jbundo", "dl_bills");
  chk("undo removes the record", C().x.roleMap.length === 0 && !jobOf(C()).exits.dl_bills);

  /* ---------- Home, the time ledger, the spreadsheet ---------- */
  X("job", "cfo");
  X("jbexit", "drop", "cfo_month");
  closeSheet();
  go("home");
  chk(
    "Home: the card with two bars, Running it and Living it, and a percent better",
    app().includes("jbhome") &&
      app().includes("Running it") &&
      app().includes("Living it") &&
      app().includes("% better") &&
      clean(app()),
    junk(app())
  );
  chk(
    "the time ledger: the tile with its state",
    ledgerCard(C(), D).includes("Hours a month running your money") &&
      ledgerCard(C(), D).includes(">" + jobAdmin(C().x.jobmins).st + "<") &&
      jobAdmin(C().x.jobmins).st === "Guess"
  );
  const B = jobBook(C()),
    v = id => B.rows.find(r => r.id === id).v,
    N = jobNow(C());
  chk(
    "the spreadsheet rows: the total is the six added up, Running it is the total minus Living it",
    B.rows.length === 16 &&
      v("jb_total") === JOB_IDS.reduce((t, id) => t + v("jb_" + id), 0) &&
      Math.abs(v("jb_living") - JOB_IDS.reduce((t, id) => t + v("jb_saved_" + id), 0)) < 1e-9 &&
      Math.abs(v("jb_running") - (v("jb_total") - v("jb_living"))) < 1e-9 &&
      v("jb_saved_cfo") === 20 &&
      Math.abs(v("jb_living") - N.L.living) < 1e-9
  );
  chk(
    "the spreadsheet of the plan has the section",
    bookTable(C()).S.some(s => s.title.indexOf("Your unpaid jobs") === 0)
  );
  chk(
    "the menu has the row",
    MENU.some(m => m[1] === "jobs")
  );
  const row = WB.find(r => /unpaid jobs/i.test(r[1]));
  chk("the built list row, and its probe passes", row && row[2] === "b" && row[3]());

  G.chars.length = n0;
  G.active = 0;
  save();
}
