/* ============================================================================
   SLAM the Game, test: tests/one-question-debts-and-key-numbers.js
   PURPOSE     Examine the one-question screens for the details of one debt, for Key numbers, and for
               the job match and the tax accounts.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/ask2.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    R = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Dee",
      led: true,
      placed: true,
      age: 30,
      ret: 60,
      take: 4000,
      spend: 3000,
      inv: 5000,
      match: "no",
      tax: "no",
      work: "First job",
      incs: [R({ k: "A main job", amt: 4000 })],
      spends: [R({ k: "Home", amt: 1800 }), R({ k: "Food", amt: 1200 })],
      cashes: [R({ k: "Checking", amt: 900 })],
      invs: [R({ k: "Retirement plan at work", amt: 5000 })],
      debts: [R({ k: "Credit card balance", amt: 2500, high: true }), R({ k: "Car loan", amt: 9000, high: false })],
    });
  a.sharp = Object.assign({}, a.sharp, { match: false, tax: false });
  G.demo = false;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C();
  X("debtplan");
  X("dbone", "0");
  let o = ov();
  chk(
    "debt details: the first question alone, with the five parts",
    W.kind === "dbone" &&
      W.step === 0 &&
      o.includes("Question 1 of 4") &&
      o.includes("you owe $2,500 on this") &&
      o.includes("What yearly rate does this debt charge?") &&
      o.includes("The extra is called interest") &&
      o.includes("APR") &&
      o.includes("Why we ask") &&
      o.includes("Where to look") &&
      o.includes("I don't know yet") &&
      !o.includes("How much do you pay on this each month?") &&
      !o.includes("bug you") &&
      clean(o),
    junk(o)
  );
  X("dbset", "15% to 25%", "apr", { l: "0" });
  chk(
    "an answer saves and moves to the next question",
    c.debts[0].apr === "15% to 25%" &&
      W.step === 1 &&
      ov().includes("Question 2 of 4") &&
      ov().includes("How much do you pay on this each month?")
  );
  X("akprev");
  chk("back one shows the answer kept, with a way to keep it", W.step === 0 && ov().includes("Keep this answer, next"));
  X("akskip");
  X("akskip");
  chk(
    "I do not know yet moves on and saves nothing",
    W.step === 2 &&
      c.debts[0].pay == null &&
      ov().includes("What is the most this card lets you borrow?") &&
      ov().includes("credit limit")
  );
  X("dbset", "5000", "lim", { l: "0" });
  chk(
    "the bother question says there is nowhere to look",
    W.step === 3 &&
      ov().includes("How much does this debt bother you?") &&
      ov().includes("Go with your gut") &&
      ov().includes("Skip this one")
  );
  X("dbset", "4", "hassle", { l: "0" });
  o = ov();
  chk(
    "after the last one: what you did, what is still a guess, what changed, what is next",
    W.step === 4 &&
      o.includes("What you just did") &&
      o.includes("Rate: 15% to 25%") &&
      o.includes("Limit: $5,000") &&
      o.includes("It bothers you 4 out of 5") &&
      o.includes("Still a guess: the payment") &&
      o.includes("What that changed") &&
      o.includes("Your debt plan is now") &&
      o.includes("Next debt: Car loan") &&
      clean(o),
    junk(o)
  );
  X("dbone", "1");
  chk(
    "the next debt starts at its first missing answer, three questions for a loan",
    W.i === 1 && W.step === 0 && ov().includes("Question 1 of 3")
  );
  X("dbset", "Under 8%", "apr", { l: "1" });
  X("dbset", "200", "pay", { l: "1" });
  X("akskip");
  chk(
    "when every debt is filled the button goes to the plan",
    ov().includes("gone by") && ov().includes('data-a="debtplan"') && c.debts[1].pay === 200
  );
  X("debtplan");
  chk("the plan screen still opens", W.kind === "dbplan" && ov().includes("Debt plan"));
  X("metric", "dti");
  o = ov();
  chk(
    "a key number asks one plain question with why and where to look",
    o.includes("<h2") &&
      o.includes("Why we ask") &&
      o.includes("Where to look") &&
      o.includes("I don't know yet") &&
      clean(o),
    junk(o)
  );
  Object.keys(KN_ASK).forEach(k => {
    chk(
      "key number question " + k + " has plain words, a why and a where",
      !!AK_KN[k] && AK_KN[k].q.endsWith("?") && AK_KN[k].why.length > 20 && AK_KN[k].find.length > 10
    );
    X("knask", k);
    const h = ov();
    chk(
      "key number question " + k + " renders",
      h.includes(AK_KN[k].q) && h.includes('data-a="knans"') && clean(h),
      junk(h)
    );
  });
  X("knask", "tax");
  chk(
    "the tax question is in dollars out of a hundred",
    ov().includes("Out of every $100 you earn") && ov().includes(">$20<")
  );
  X("knans", "20", "tax");
  chk("an answer says it was saved", c.x.taxPct === 20 && ov().includes("Saved.") && ov().includes("not on a guess"));
  X("metric", "dti");
  chk("the saved note does not follow you to the next number", !ov().includes("Saved."));
  X("close");
  X("sharp", "match");
  o = ov();
  chk(
    "match: thing, question, the word explained, full-sentence answers",
    o.includes("Does your job add money to your retirement plan when you do?") &&
      o.includes("It is called a match") &&
      o.includes("No, my job has no match") &&
      o.includes("I'm not sure") &&
      o.includes("Why we ask") &&
      !o.includes(">Save<") &&
      clean(o),
    junk(o)
  );
  X("set", "Yes, but I don't get all of it", "match");
  o = ov();
  chk(
    "match answer: a result screen says what changed",
    c.match === "no" &&
      c.sharp.match === true &&
      W.kind === "askdone" &&
      o.includes("What you just did") &&
      o.includes("There is a match you are not fully getting") &&
      clean(o),
    junk(o)
  );
  X("askmore");
  chk(
    "keep going moves to the tax accounts question",
    W &&
      W.kind === "sharp" &&
      W.q === "tax" &&
      ov().includes("Do you put money in accounts that lower your taxes?") &&
      ov().includes("Yes, as much as the rules allow") &&
      ov().includes("I'm not sure")
  );
  X("set", "I put in some", "tax");
  chk(
    "tax answer: saved with its own result",
    c.tax === "some" && W.kind === "askdone" && ov().includes("with room left")
  );
  X("close");
  c.debts[0].pay = null;
  const S = msSide(c, derive(c)).filter(m => String(m.id).indexOf("know:") === 0);
  chk(
    "side missions from the know list read as plain actions",
    S.length > 0 && S.every(m => !/^Nail down/.test(m.t) && !!Object.values(AK_MS).includes(m.t)),
    S.map(m => m.t).join("|")
  );
  chk(
    "every fact in the know list has a plain action",
    (() => {
      const F = kwFacts(c, derive(c));
      return Object.keys(F).every(k => F[k].every(f => !!AK_MS[f.t] || f.t === "You owe nothing"));
    })()
  );
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  save();
  go("home");
}
