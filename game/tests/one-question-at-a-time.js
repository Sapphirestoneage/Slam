/* ============================================================================
   SLAM the Game, test: tests/one-question-at-a-time.js
   PURPOSE     Examine "Make your numbers real" with one small question on each screen.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/ask.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    R = r => Object.assign({ s: false }, r),
    a = Object.assign(newChar(), {
      name: "Ana",
      led: true,
      placed: false,
      age: 30,
      ret: 60,
      take: 4000,
      spend: 3000,
      inv: 0,
      debt: 0,
      high: "no",
      incs: [R({ k: "A main job", amt: 4000 })],
      spends: [R({ k: "Home", amt: 1800 }), R({ k: "Food", amt: 1200 })],
      cashes: [R({ k: "Checking", amt: 900 })],
      invs: [],
      debts: [],
    });
  G.demo = false;
  G.chars.push(a);
  G.active = n0;
  save();
  go("home");
  const c = C();
  const F = () => kwFacts(c, derive(c)).D[0];
  chk(
    "with no debts on file the list asks whether, not states it",
    F().t === "Whether you owe anything" && F().v === 0
  );
  X("sharp", "debt");
  chk(
    "no debts: a plain question with examples, never an empty list",
    W.kind === "sharp" &&
      ov().includes("Do you owe money to anyone right now?") &&
      ov().includes("Things like:") &&
      ov().includes("A credit card you did not pay all the way off") &&
      ov().includes("No, I owe nothing") &&
      ov().includes("Yes, I owe something") &&
      ov().includes("I'm not sure") &&
      ov().includes("Why we ask") &&
      !ov().includes("That's about right") &&
      !ov().includes("faded numbers") &&
      clean(ov()),
    junk(ov())
  );
  X("asknone", "idk");
  chk(
    "not sure: three places to check, by number",
    W.st === "look" &&
      ov().includes("Not sure? That is okay.") &&
      ov().includes("<b>1.</b>") &&
      ov().includes("<b>3.</b>") &&
      clean(ov()),
    junk(ov())
  );
  X("asknone", "no");
  chk(
    "no: it is saved, and the screen says what happened and what changed",
    W.kind === "askdone" &&
      c.x.none.debt === todayISO() &&
      ov().includes("What you just did") &&
      ov().includes("You owe nothing. That is a real answer") &&
      ov().includes("What that changed") &&
      clean(ov()),
    junk(ov())
  );
  chk("now it counts as known", F().t === "You owe nothing" && F().v === 1);
  X("close");
  X("sharp", "inv");
  chk(
    "nothing invested: the same kind of plain question",
    ov().includes("Do you have any money invested?") && ov().includes("No, nothing yet")
  );
  X("asknone", "yes");
  chk("yes goes to the add list", W && W.kind === "rowadd" && W.sec === "invs");
  X("close");
  delete c.x.none;
  c.debts = [
    R({ k: "Credit card balance", amt: 2500, high: true, was: 2500 }),
    R({ k: "Car loan", amt: 9000, high: false, was: 9000 }),
  ];
  syncAll(c);
  X("sharp", "debt");
  let o = ov();
  chk(
    "each debt is its own screen with the five parts in order",
    o.includes("Question 1 of 2") &&
      o.includes("Credit card balance") &&
      o.includes("How much do you still owe on this?") &&
      o.includes("Our guess, from people like you") &&
      o.includes("Yes, about $2,500") &&
      o.includes("Or tap the closest amount") &&
      o.includes('data-a="rng" data-k="d:0"') &&
      o.includes("Type the exact amount") &&
      o.includes("I don't know yet") &&
      o.indexOf("How much do you still owe") < o.indexOf("Yes, about") &&
      o.indexOf("Yes, about") < o.indexOf("Why we ask") &&
      o.indexOf("Why we ask") < o.indexOf("Where to look") &&
      o.includes("Open the card's app") &&
      !o.includes("Car loan") &&
      clean(o),
    junk(o)
  );
  chk("money words are explained where they appear", o.includes("Not the monthly payment"));
  X("askyes");
  o = ov();
  chk(
    "then one question about the rate, with interest and APR explained",
    W.st === "rate" &&
      W.o.debts[0].s === true &&
      o.includes("Does this one charge 8% or more a year?") &&
      o.includes("The extra is called interest") &&
      o.includes("APR") &&
      o.includes("almost always charges more than 8%") &&
      o.includes("Yes, 8% or more") &&
      o.includes("No, less than 8%") &&
      o.includes("I don't know") &&
      clean(o),
    junk(o)
  );
  X("askrate", "1");
  chk(
    "on to the second debt",
    W.i === 1 &&
      W.st === "amt" &&
      ov().includes("Question 2 of 2") &&
      ov().includes("Car loan") &&
      ov().includes("Yes, about $9,000")
  );
  {
    const r1 = RANGES.debt.find(r => r[0] !== 9000)[0];
    X("rng", String(r1), "d:1");
    chk(
      "one tap on an amount right under the guess answers it and moves on",
      W.o.debts[1].amt === r1 && W.o.debts[1].s === true && (r1 > 0 ? W.st === "rate" : true)
    );
    X("askback");
    if (W.st === "rate") X("askback");
    W.o.debts[1].amt = 9000;
    W.o.debts[1].s = false;
    delete W.t["d:1"];
  }
  X("askback");
  chk("back one goes to the debt before", W.i === 0 && ov().includes("Credit card balance"));
  X("askyes");
  X("askrate", "idk");
  chk("not knowing the rate keeps the starting guess", W.o.debts[0].high === true && W.i === 1);
  X("askchg");
  chk(
    "a different amount: tap the closest, or type it",
    W.st === "chg" &&
      ov().includes("Tap the closest amount") &&
      ov().includes('data-a="rng"') &&
      ov().includes('data-a="padopen"') &&
      !ov().includes("That's the amount")
  );
  const r0 = RANGES.debt[2][0];
  X("rng", String(r0), "d:1");
  chk(
    "one tap on a range answers it and moves to the rate",
    W.o.debts[1].amt === r0 && W.o.debts[1].s === true && (r0 > 0 ? W.st === "rate" : true)
  );
  if (W.st === "rate") X("askrate", "0");
  chk(
    "after the last one: what you did, what changed, what comes next",
    W.kind === "askdone" &&
      ov().includes("2 of 2 numbers here are real now") &&
      ov().includes("What that changed") &&
      ov().includes("What comes next") &&
      isSharp(c, "debt") &&
      c.debts[1].amt === r0 &&
      c.debts[1].high === false &&
      clean(ov()),
    junk(ov())
  );
  X("askmore");
  chk(
    "keep going opens the next thing, one question at a time",
    W && W.kind === "sharp" && W.q !== "debt" && ov().includes("Question 1 of")
  );
  X("close");
  c.cashes = [R({ k: "Checking", amt: 900 }), R({ k: "Savings", amt: 400 })];
  X("sharp", "cash");
  X("askyes");
  X("askidk");
  chk(
    "I do not know yet leaves that one a guess and says so kindly",
    W.kind === "askdone" &&
      c.cashes[0].s === true &&
      c.cashes[1].s === false &&
      ov().includes("1 of 2 numbers here is real now") &&
      ov().includes("Still a guess: Savings") &&
      ov().includes("That is fine") &&
      !isSharp(c, "cash") &&
      !/wrong|fail|missing|must|should have/i.test(ov())
  );
  X("close");
  X("sharp", "spend");
  chk(
    "spending explains what counts",
    ov().includes("How much do you spend on this in one month?") && ov().includes("Rent or what you pay at home")
  );
  X("close");
  X("sharp", "match");
  chk(
    "the match question is one plain question with why and where to look",
    W.q === "match" &&
      ov().includes("Does your job add money to your retirement plan when you do?") &&
      ov().includes("It is called a match") &&
      ov().includes("Why we ask") &&
      ov().includes("Where to look")
  );
  X("close");
  ["take", "spend", "cash", "debt"].forEach(k => {
    X("sharp", k);
    let n = 0;
    while (W && W.kind === "sharp" && n++ < 20) {
      const h = ov();
      chk(
        "ask " + k + " screen " + n + ": exactly one question, one primary button, a why line",
        (h.match(/<h2 style="margin/g) || []).length === 1 &&
          (h.match(/class="primary go wide"/g) || []).length <= 1 &&
          h.includes("Why we ask") &&
          clean(h),
        junk(h)
      );
      if (W.st === "rate") X("askrate", "idk");
      else if (W.st === "low") X("asklow", "idk");
      else X("askidk");
    }
    X("close");
  });
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  save();
  go("home");
}
