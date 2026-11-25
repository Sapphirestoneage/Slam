/* ============================================================================
   SLAM the Game, test: tests/household-role-map.js
   PURPOSE     Examine the Job of Existing, feature 6: Who carries what (the household role map). Three
               made-up households: a solo renter alone, the same renter living with a parent, and a
               3-person poly household. The jobs tapped to one or more people, by name; a task handed to a
               person; the minutes of each person add up to the household; the value is hours x the time
               price; no rate gives no dollars; undo; the spreadsheet rows; the labor method of Sharing
               costs fairly adds the hours; the neutral words; the menu and the built list row.
   INPUT       The game scripts, loaded by harness.cjs. Made-up profiles.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: core/jobs.js, features/rolemap.js, features/jobs.js,
               features/fair.js, features/book.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    fair0 = G.fair,
    R0 = r => Object.assign({ s: true }, r),
    near = (a, b) => Math.abs(a - b) < 1e-6,
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
      ),
    use = c => {
      G.chars.push(c);
      G.active = G.chars.length - 1;
      syncAll(c);
      save();
    },
    blame = /\b(lazy|slack|not enough|unfair|fault|behind|should do more|partner 1|partner 2|person 1)\b/i;
  G.demo = false;
  G.tourSeen = true;

  /* ---------- 1. a solo renter, alone: just you ---------- */
  use(base({ name: "Rio", home: "Renting", steady: "Changes month to month", party: [] }));
  X("rolemap");
  chk(
    "alone: the sheet opens, says it is just you, and offers Add your people",
    W.kind === "rolemap" &&
      ov().includes("Who carries what") &&
      ov().includes("It is just you here for now") &&
      ov().includes('data-a="party"') &&
      clean(ov()),
    junk(ov())
  );
  const S1 = rmNow(C());
  chk(
    "alone: all the admin time is yours (180 min at the defaults)",
    S1.K.people.length === 1 && S1.K.total === 180 && S1.K.people[0].min === 180
  );
  chk(
    "no time price and no pay: no dollar value, a tap to set the time prices",
    S1.K.rate === null || S1.R.from === "wage"
  );
  chk("alone: no rows in the spreadsheet", rmBook(C()).rows.length === 0);
  closeSheet();

  /* ---------- 2. the solo renter living with a parent ---------- */
  use(
    base({
      name: "Rio",
      home: "With family",
      live: ["Parents or family"],
      party: [
        { id: "mom", k: "Parent", n: "Mama Lu", links: [], amt: {} },
        { id: "dog", k: "Pet", n: "Biscuit" },
      ],
      tp: { family: 40, rest: 20, chores: 18, commute: 15, work: 30 },
    })
  );
  X("rolemap");
  chk(
    "with a parent: two people by name, no pet, the jobs to tap",
    ov().includes("Mama Lu") &&
      !ov().includes("Biscuit") &&
      ov().includes("Each job and who holds it") &&
      (ov().match(/data-a="rmset"/g) || []).length === 12 &&
      clean(ov()),
    junk(ov())
  );
  X("rmset", "p:mom", "health");
  const S2 = rmNow(C());
  chk(
    "the parent holds the Health Care Admin: its 15 minutes are theirs, at $18 an hour (the time price)",
    S2.R.from === "tp" &&
      S2.K.rate === 18 &&
      S2.K.people[1].min === 15 &&
      near(S2.K.people[1].value, (15 / 60) * 18) &&
      ov().includes("Mama Lu holds Health Care Admin now")
  );
  closeSheet();

  /* ---------- 3. a 3-person poly household ---------- */
  use(
    base({
      name: "Cy",
      home: "Renting",
      live: ["A partner", "Roommates"],
      share: "More than one partner",
      party: [
        { id: "pA", k: "Partner", n: "Ash", links: [], amt: {} },
        { id: "pB", k: "Partner", n: "Bo", links: [], amt: {} },
      ],
      tp: { family: 60, rest: 30, chores: 24, commute: 20, work: 40 },
      x: { jobmins: { cfo: { v: 180, cf: 2 }, accountant: { v: 60, cf: 2 } } },
    })
  );
  X("rolemap");
  X("rmset", "me", "cfo");
  X("rmset", "p:pA", "cfo");
  X("rmset", "p:pB", "accountant");
  X("rmset", "p:pA", "deals");
  X("rmset", "p:pB", "deals");
  /* a task handed to Bo on the job's own sheet (jobs.js) */
  X("job", "deals");
  X("jbopen", "dl_bills");
  X("jbexit", "hand", "dl_bills");
  X("jbhand", "p:pB", "dl_bills");
  X("rolemap");
  const S3 = rmNow(C()),
    K = S3.K,
    p = k => K.people.find(x => x.key === k),
    L = S3.N.L,
    task = JOB_TASKS.find(t => t.id === "dl_bills"),
    dealsMin = S3.N.admin.rows.find(r => r.id === "deals").min,
    rawDeals = S3.N.tasks
      .filter(t => t.role === "deals" && jobIsOff(S3.N.exits[t.id]))
      .reduce((s, t) => s + jobTaskMonthly(t), 0),
    toBo = jobTaskMonthly(task) * Math.min(1, dealsMin / rawDeals);
  chk(
    "three people, by their own names; never partner 1 or partner 2",
    K.people.map(x => x.n).join() === "Cy,Ash,Bo" && !blame.test(ov()) && clean(ov()),
    junk(ov())
  );
  chk(
    "the CFO (180 min) is shared by Cy and Ash: 90 each",
    near(p("me").jobs.cfo, 90) && near(p("p:pA").jobs.cfo, 90) && !p("p:pB").jobs.cfo
  );
  chk("the Accountant is Bo's: 60", near(p("p:pB").jobs.accountant, 60));
  chk(
    "the Deals Manager: what is left, half each to Ash and Bo, and Bo also gets the task handed to them",
    near(p("p:pA").jobs.deals, K.byJob.deals.left / 2) &&
      near(p("p:pB").jobs.deals, K.byJob.deals.left / 2 + toBo) &&
      near(K.byJob.deals.handed["p:pB"], toBo)
  );
  chk(
    "the math adds up: the people sum to the household, and the household is Running it plus the tasks handed to people",
    near(
      K.people.reduce((s, x) => s + x.min, 0),
      K.total
    ) && near(K.total, L.running + toBo),
    [K.total, L.running, toBo]
  );
  chk(
    "the value: hours x $24 (the time price of chores), for each person and for all",
    K.rate === 24 &&
      K.people.every(x => near(x.value, (x.min / 60) * 24)) &&
      near(
        K.people.reduce((s, x) => s + x.value, 0),
        K.value
      ) &&
      near(K.value, (K.total / 60) * 24)
  );
  chk(
    "the view: the stat row, the donut, each person's hours and value",
    ov().includes("Household admin time") &&
      ov().includes("dkdonut") &&
      ov().includes(money(p("p:pB").value)) &&
      ov().includes("Show the math") &&
      ov().includes("Tasks handed to Bo"),
    junk(ov())
  );
  /* tap off and back */
  X("rmset", "p:pA", "cfo");
  chk(
    "a second tap takes Ash off the CFO: all 180 with Cy",
    near(rmNow(C()).K.people[0].jobs.cfo, 180) && ov().includes("now with Cy")
  );
  X("rmset", "p:pA", "cfo");
  const before = JSON.stringify(rmAssign(C()));
  X("rmclear");
  chk(
    "Give every job back to you: the map is empty, the task hand-off stays, Undo shows",
    Object.keys(rmAssign(C())).length === 0 &&
      C().x.roleMap.some(m => m.task === "dl_bills") &&
      ov().includes('data-a="rmundo"')
  );
  X("rmundo");
  chk("Undo puts the map back", JSON.stringify(rmAssign(C())) === before);

  /* ---------- the spreadsheet ---------- */
  const B = rmBook(C()),
    v = id => B.rows.find(r => r.id === id).v;
  chk(
    "the spreadsheet: the rate, each person's minutes and value, the household with its formula, who holds each job",
    v("rm_rate") === 24 &&
      near(v("rm_total"), v("rm_m0") + v("rm_m1") + v("rm_m2")) &&
      near(v("rm_v2"), (v("rm_m2") / 60) * 24) &&
      B.rows.find(r => r.id === "rm_total").f === "={rm_m0}+{rm_m1}+{rm_m2}" &&
      B.rows.find(r => r.id === "rm_v0").f === "={rm_m0}/60*{rm_rate}" &&
      v("rm_j_cfo") === "Cy, Ash" &&
      v("rm_j_insurance") === "Cy",
    JSON.stringify(B.rows.slice(0, 4))
  );
  chk(
    "the spreadsheet of the plan has the section",
    bookTable(C()).S.some(s => s.title.indexOf("Who carries what") === 0)
  );

  /* ---------- the labor method of Sharing costs fairly ---------- */
  /* the fair sheet as it starts for one profile: the player and a stand-in guest */
  G.fair = {
    ppl: [
      { n: "Cy", from: G.active, inc: null, hrs: 5, nights: 7 },
      { n: "Person 2", from: null, inc: 3000, hrs: 5, nights: 7 },
    ],
  };
  X("rmfair");
  const P = frPpl(),
    S = frState(),
    R = frCalc(P, 2000, S.rate),
    bo = P.findIndex(x => x.n === "Bo");
  chk(
    "Use these hours: Ash takes the stand-in's place, Bo joins, by name; the rate starts at the time price",
    W.kind === "fair" &&
      bo >= 0 &&
      P.length === 3 &&
      !P.some(x => x.n === "Person 2") &&
      P.some(x => x.n === "Ash") &&
      S.rate === 24 &&
      ov().includes("(your time price)"),
    JSON.stringify(P.map(x => x.n))
  );
  chk(
    "Labor counts adds each person's admin hours to their home work, and the split still adds up",
    near(P[bo].adm, p("p:pB").min / 60) &&
      near(R.val[bo], ((P[bo].hrs * 52) / 12 + P[bo].adm) * S.rate) &&
      near(
        R.labor.reduce((s, x) => s + x, 0),
        2000
      ) &&
      ov().includes("of money admin a month"),
    junk(ov())
  );
  closeSheet();

  /* ---------- the way in, the menu, the built list ---------- */
  X("jobs");
  chk("the jobs sheet has the row Who carries what", ov().includes('data-a="rolemap"') && ov().includes("2 people"));
  closeSheet();
  chk(
    "the menu has the row",
    MENU.some(m => m[1] === "rolemap")
  );
  const row = WB.find(r => /Who carries what/.test(r[1]));
  chk("the built list row, and its probe passes", row && row[2] === "b" && row[3]());

  G.chars.length = n0;
  G.active = 0;
  G.fair = fair0;
  save();
}
