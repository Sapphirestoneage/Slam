/* ============================================================================
   SLAM the Game, test: tests/plan-summary.js
   PURPOSE     Examine the plan summary: the 7 steps with done / partial / missing, the ranked top 5 gaps
               with impact and a next step, the picked path at the top, what is still a guess, the estate
               checklist, print, and the spreadsheet buttons.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/plan.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Sum",
      led: true,
      placed: true,
      age: 40,
      ret: 60,
      take: 6000,
      spend: 4500,
      inv: 80000,
      deps: "Kids",
      rel: "Married",
      match: "no",
      incs: [R0({ k: "A main job", amt: 6000 })],
      spends: [R0({ k: "Home", amt: 2500 }), R0({ k: "Food", amt: 2000 })],
      cashes: [R0({ k: "Checking", amt: 2000 })],
      invs: [R0({ k: "Retirement plan at work", amt: 80000 })],
      debts: [R0({ k: "Credit card balance", amt: 9000, high: true, apr: "15% to 25%", rate: 22, pay: 250 })],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C(),
    S = summarySteps(c);
  chk(
    "seven steps, in the CFP Board's order, each done, partial or missing",
    S.length === 7 &&
      S[0].n === "Your situation" &&
      S[6].n === "Checking in" &&
      S.every(s => ["done", "partial", "missing"].includes(s.st))
  );
  chk("before a path is picked, The plan is missing", S[4].st === "missing");
  const G2 = summaryGaps(c);
  chk(
    "the gaps are ranked by their yearly dollar figure",
    G2.every((g, i) => i === 0 || G2[i - 1].score >= g.score)
  );
  chk(
    "the gaps cover debt, the cushion, insurance, the match and education",
    ["Debt", "Cushion", "Insurance", "Taxes", "Education"].every(k => G2.some(g => g.area === k))
  );
  chk(
    "each gap has an impact and one next step",
    G2.every(g => g.impact && g.go && ACT[g.go[1]])
  );
  X("summary");
  let o = ov();
  chk(
    "the screen: the steps, the top 5, the estate checklist, the guesses, print, the spreadsheet",
    o.includes("The 7 steps of a plan") &&
      (o.match(/summarygap/g) || []).length === Math.min(5, G2.length) &&
      o.includes("Estate checklist") &&
      o.includes("What is still a guess") &&
      o.includes('data-a="summaryprint"') &&
      o.includes('data-a="bookcopy"') &&
      clean(o),
    junk(o)
  );
  X("summaryestate", "will");
  chk("an estate item can be marked done", !!c.x.summary.estate.will && ov().includes("Done ✓"));
  X("pathspick", "money");
  X("summary");
  o = ov();
  chk(
    "the picked path is at the top",
    o.indexOf("Your path") < o.indexOf("The 7 steps") && o.includes("Most money") && summarySteps(c)[4].st === "done"
  );
  chk(
    "what is still a guess lists the open answers",
    summaryGuesses(c).some(g => /Pay before taxes/.test(g[0]))
  );
  chk(
    "the menu has it",
    MENU.some(m => m[1] === "summary")
  );
  G.chars.length = n0;
  G.active = 0;
  save();
}
