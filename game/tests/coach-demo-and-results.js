/* ============================================================================
   SLAM the Game, test: tests/coach-demo-and-results.js
   PURPOSE     Examine the four parts that account/coachplus.js adds to the coach page: the demo with
               made-up clients (nothing read from the database, nothing written to it), the milestones
               and the days to a first win, before and after with its report, the stages of the pipeline,
               and search and sort.
   INPUT       The game scripts, loaded by harness.cjs. account/coachpage.js and account/coachplus.js,
               loaded here, because only coach.html loads them. A stand-in for the database client that
               counts each call.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: account/coachplus.js and its parts in account/coachpage.js
               and coach.html.
   ========================================================================= */
{
  const fs = require("fs"),
    vm = require("vm"),
    read = f => fs.readFileSync(GAME_DIR + f, "utf8");
  if (typeof CP === "undefined")
    vm.runInThisContext(read("account/coachpage.js"), { filename: "account/coachpage.js" });
  vm.runInThisContext(read("account/coachplus.js"), { filename: "account/coachplus.js" });
  const calls = [];
  CP.sb = {
    from: t => (calls.push("from:" + t), { select: () => ({}), insert: () => ({}) }),
    rpc: n => (calls.push("rpc:" + n), Promise.resolve({ data: null })),
    auth: { signOut: async () => ({}) },
  };
  const page = { innerHTML: "" };
  document.getElementById = id => (id === "app" ? page : null);
  /* ---------- milestones, from the history only ---------- */
  const day = n => new Date(Date.UTC(2026, 0, 1 + n)).toISOString().slice(0, 10),
    S = (n, nw, debt, inv, cash, take, spend, era, real) => ({
      d: day(n),
      nw,
      debt,
      inv,
      cash,
      take,
      spend,
      era,
      verified: !!real,
    }),
    c1 = {
      hist: [
        S(0, -5000, 6000, 0, 200, 4000, 3900, 1, 0),
        S(3, -5000, 6000, 0, 300, 4000, 3800, 1, 1),
        S(20, -4200, 5500, 0, 1100, 4000, 3600, 1, 1),
        S(50, -1000, 2000, 500, 3700, 4000, 3600, 2, 1),
        S(90, 4200, 0, 500, 3700, 4000, 3600, 2, 1),
      ],
    },
    M = cpxMilestones(c1),
    at = k => M.find(m => m.k === k);
  chk("days between two dates", cpxDays("2026-01-01", "2026-01-21") === 20);
  chk("the start is the first day of the history", at("start").at === day(0) && at("start").days === 0);
  chk("numbers made real: the first verified day", at("real").at === day(3) && at("real").days === 3);
  chk("first $1,000 of cash, and debt down, on day 20", at("k1").days === 20 && at("debt").days === 20);
  chk(
    "one month of spending in cash, invested more, and an era up, on day 50",
    at("month").days === 50 && at("inv").days === 50 && at("era").days === 50
  );
  chk("no debt left on day 90", at("debt0").days === 90);
  chk("the first win is the earliest one after the start", cpxFirstWin(c1).k === "real" && cpxFirstWin(c1).days === 3);
  const none = cpxMilestones({ hist: [S(0, 0, 0, 0, 0, 3000, 3000, 1, 0)] });
  chk(
    "with one day of history, nothing has a date but the start",
    none.filter(m => m.at).length === 1 && cpxFirstWin({ hist: [S(0, 0, 0, 0, 0, 3000, 3000, 1, 0)] }) === null
  );
  chk(
    "with no history at all, there is no date, and no error",
    cpxMilestones({}).every(m => m.at === null) && cpxFirstWin({}) === null && cpxBeforeAfter({}) === null
  );
  chk(
    "a person who had no debt never gets Debt went down",
    cpxMilestones({ hist: [S(0, 100, 0, 0, 100, 1, 1, 1, 0), S(5, 200, 0, 0, 200, 1, 1, 1, 0)] }).find(
      m => m.k === "debt0"
    ).at === null
  );
  const rich = cpxMilestones({
    hist: [S(0, 9000, 0, 4000, 5000, 4000, 3000, 2, 1), S(9, 9500, 0, 4500, 5000, 4000, 3000, 2, 1)],
  });
  chk(
    "what a client already had on the first day is not a win",
    rich.find(m => m.k === "k1").had === true &&
      rich.find(m => m.k === "k1").at === null &&
      rich.find(m => m.k === "real").had === true &&
      cpxFirstWin({ hist: [S(0, 9000, 0, 4000, 5000, 4000, 3000, 2, 1), S(9, 9500, 0, 4500, 5000, 4000, 3000, 2, 1)] })
        .k === "inv"
  );
  /* ---------- before and after ---------- */
  const B = cpxBeforeAfter(c1),
    row = l => B.rows.find(r => r.label === l);
  chk(
    "before and after: the first day next to the last day",
    B.from === day(0) &&
      B.to === day(90) &&
      B.days === 90 &&
      row("Net worth").change === 9200 &&
      row("Debt").change === -6000 &&
      row("Cash").change === 3500 &&
      row("Left each month").before === 100 &&
      row("Left each month").after === 400
  );
  chk("one day of history is not enough for before and after", cpxBeforeAfter({ hist: [c1.hist[0]] }) === null);
  chk(
    "a base older than the history is the start",
    cpxMilestones({ base: { d: "2025-12-01", nw: -9000 }, hist: c1.hist }).find(m => m.k === "start").at ===
      "2025-12-01"
  );
  /* ---------- the demo ---------- */
  CPX.demo = true;
  chk(
    "the demo fills the roster and reads nothing from the database",
    cpxDemoLoad() === true && CP.list.length === 6 && calls.length === 0
  );
  chk(
    "each made-up client says (sample) in the name",
    CP.list.every(cl => cl.people.every(p => /\(sample\)/.test(p.name))) && CP.list.every(cl => /^demo-/.test(cl.owner))
  );
  const rows = cpxRows(),
    N = cpxCounts(rows),
    st = o => rows.find(r => r.cl.owner === o).stage;
  chk(
    "the made-up clients cover each stage",
    N.all === 6 &&
      N.setup >= 1 &&
      N.active >= 1 &&
      N.risk >= 1 &&
      N.grad === 1 &&
      N.setup + N.active + N.risk + N.grad === 6,
    JSON.stringify(N)
  );
  chk(
    "stages: not set up, quiet with a flag, and a tag from the coach",
    st("demo-3") === "setup" && st("demo-4") === "risk" && st("demo-5") === "grad"
  );
  chk(
    "a client with a tag is graduated even with a flag",
    cpxStage(
      CP.list[0],
      ["a flag"],
      [{ kind: "note", client: CP.list[0].owner, body: "#stage:grad", at: "2026-01-02" }]
    ) === "grad"
  );
  chk(
    "a later tag moves the client back",
    cpxStage(
      CP.list[0],
      [],
      [
        { kind: "note", client: CP.list[0].owner, body: "#stage:grad", at: "2026-01-02" },
        { kind: "note", client: CP.list[0].owner, body: "#stage:auto", at: "2026-01-03" },
      ]
    ) === "active"
  );
  const Sm = cpxSummary(CP.list, Date.now());
  chk(
    "the totals add the clients up",
    Sm.clients === 6 &&
      Sm.active7 >= 3 &&
      Sm.gain === CP.list.reduce((t, cl) => t + cpxGain(cl), 0) &&
      Sm.debtDown > 0 &&
      Sm.withWin >= 4 &&
      Sm.winDays > 0,
    JSON.stringify(Sm)
  );
  cpDraw();
  chk(
    "the page in the demo: it says the clients are made up, with totals, pipeline, search and six cards",
    page.innerHTML.includes("Made-up clients.") &&
      page.innerHTML.includes("Results so far") &&
      page.innerHTML.includes("Pipeline") &&
      page.innerHTML.includes('data-f="q"') &&
      (page.innerHTML.match(/<details class="card cl"/g) || []).length === 6 &&
      clean(page.innerHTML),
    junk(page.innerHTML)
  );
  chk(
    "a card has the first win, the milestones, before and after, and the report buttons",
    page.innerHTML.includes("First win:") &&
      page.innerHTML.includes('class="ba"') &&
      page.innerHTML.includes('data-a="report"') &&
      page.innerHTML.includes('data-a="print"') &&
      page.innerHTML.includes("Mark as graduated")
  );
  chk("a stage tag does not show as a session note", !page.innerHTML.includes("#stage:"));
  chk(
    "no em dash and no red on the page",
    !/\u2014/.test(page.innerHTML) && !/color:\s*red|#f00\b/i.test(read("coach.html"))
  );
  /* ---------- search, stage, sort ---------- */
  chk(
    "search by name",
    cpxFilter(rows, { q: "maya" }).length === 1 &&
      cpxFilter(rows, { q: "alex" })[0].cl.owner === "demo-2" &&
      cpxFilter(rows, { q: "zzz" }).length === 0
  );
  chk(
    "a tap on a stage shows only those clients",
    cpxFilter(rows, { stage: "grad" }).length === 1 && cpxFilter(rows, { stage: "all" }).length === 6
  );
  chk(
    "order: last active first",
    cpxFilter(rows, { sort: "active" })[0].cl.owner === "demo-1" &&
      cpxFilter(rows, { sort: "active" })[5].cl.owner === "demo-4"
  );
  chk("order: the biggest change in net worth first", cpxFilter(rows, { sort: "gain" })[0].cl.owner === "demo-5");
  chk("order: by name", cpxFilter(rows, { sort: "name" })[0].cl.names.indexOf("Dev") === 0);
  chk(
    "order: needs attention first",
    cpxFilter(rows, { sort: "risk" })[0].flags.length >= cpxFilter(rows, { sort: "risk" })[5].flags.length &&
      cpxFilter(rows, { sort: "risk" })[0].flags.length > 0
  );
  /* ---------- the report ---------- */
  const maya = CP.list.find(cl => cl.owner === "demo-1"),
    R = cpxReport(maya);
  chk(
    "the report: the name, the dates, each number before and now, the first win, and the note about guesses",
    R.includes("Maya (sample)") &&
      R.includes("Net worth: -$8,600 to -$4,900 (up $3,700)") &&
      R.includes("Debt: $9,400 to $7,100 (down $2,300)") &&
      R.includes("First win:") &&
      R.includes("can still be guesses") &&
      !/undefined|NaN/.test(R),
    R
  );
  chk(
    "the report of a client with no history says so",
    cpxReport(CP.list.find(cl => cl.owner === "demo-3")).includes("Not enough history yet")
  );
  /* ---------- in the demo no tap writes to the database ---------- */
  (async () => {
    const tap = (a, o, v) => cpClick({ dataset: { a, o, v } });
    await tap("open", "demo-1");
    chk("Open game in the demo says it is a made-up client", CP.msg.includes("made-up client"));
    await tap("quest", "demo-1", "0");
    await tap("seen", "demo-1");
    await tap("stage", "demo-1", "grad");
    await tap("invite");
    await tap("reload");
    chk(
      "a quest, seen, a stage and an invite in the demo make no call to the database",
      calls.length === 0,
      calls.join()
    );
    chk(
      "the stage from the tap shows on the page",
      cpxRows().find(r => r.cl.owner === "demo-1") && page.innerHTML.includes("Results")
    );
    await tap("stagef", "", "risk");
    chk(
      "the pipeline filter is kept and the list follows it",
      CPX.stage === "risk" &&
        (page.innerHTML.match(/<details class="card cl"/g) || []).length === cpxCounts(cpxRows()).risk
    );
    await tap("demooff");
    chk(
      "leaving the demo with no sign-in goes back to the sign-in screen, with the door to the demo",
      CPX.demo === false &&
        page.innerHTML.includes("Coach sign-in") &&
        page.innerHTML.includes('data-a="demoon"') &&
        CP.list === null
    );
    const html = read("coach.html");
    chk(
      "coach.html loads the file, listens for typing, and has the print rules",
      /account\/coachplus\.js/.test(html) && html.includes("cpxInput(") && html.includes("@media print")
    );
  })();
}
