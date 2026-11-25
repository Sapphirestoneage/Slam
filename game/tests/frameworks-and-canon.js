/* ============================================================================
   SLAM the Game, test: tests/frameworks-and-canon.js
   PURPOSE     Examine Eli's frameworks and the canon: the eight famous money ideas of features/canon.js
               (SWAN, Second Mouse, Trust, the Advice translator, the Baby Steps, the wealth stages, Die
               With Zero, the net worth peak), Your Money or Your Life as one path of nine steps, the
               quick wins, the line of the next dollar on Home, the spreadsheet rows, and the copy of the
               math (core/frameworks.js) that the web app shares.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: core/frameworks.js, features/canon.js, features/ideas.js (gcc).
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    a = Object.assign(newChar(), {
      name: "Sam",
      led: true,
      placed: true,
      age: 34,
      ret: 60,
      take: 5000,
      spend: 3500,
      months: 2,
      inv: 40000,
      debt: 3000,
      deps: "None",
      spends: [
        { k: "Home", amt: 1600, s: true },
        { k: "Food", amt: 600, s: true },
        { k: "Fun and everything else", amt: 500, s: true },
      ],
      cashes: [{ k: "Savings", amt: 7000 }],
      debts: [{ k: "Credit card", amt: 3000, high: true, pay: 200, paycf: 3, rate: "15% to 25%" }],
    });
  G.chars.push(a);
  G.active = n0;
  save();
  const c = C();
  /* ---------- the shared math ---------- */
  chk(
    "core/frameworks.js is loaded with the unlearn list",
    typeof fwSwan === "function" && FW_UNLEARN.length >= 10 && FW_ORDER[0] === "0b"
  );
  chk(
    "the SWAN number is months of spending plus the worry",
    fwSwan({ monthly: 3500, months: 3, worry: 1000 }).number === 11500
  );
  chk(
    "0% tax in the old idea uses the shared formula",
    fwZeroTax({ std: IG_TAX.sd.one, gainTop: IG_TAX.gain.one }).incomeAtZero === IG_TAX.sd.one + IG_TAX.gain.one
  );
  /* ---------- the eight ideas open, clean, in the one list ---------- */
  const ids = ["swan", "mouse", "trust", "advice", "baby", "stages", "dwz", "peak"];
  ids.forEach(id => {
    chk("idea " + id + " is in the list of ideas", IG[id] && IG_ORDER.includes(id));
    X("idea", id);
    chk("idea " + id + " opens clean", ov().includes(esc(IG[id].n)) && clean(ov()), junk(ov()));
    X("close");
  });
  chk("Famous money ideas lists them", rfAll(c).some(x => x.r.v === "swan") && rfAll(c).some(x => x.r.a === "ymoyl"));
  X("idea", "swan");
  X("igset", "6", "months");
  chk("the SWAN number follows a tap", ov().includes(money(3500 * 6)), junk(ov()));
  X("close");
  X("idea", "mouse");
  X("igchk", "reports");
  chk("a Second Mouse step can be ticked", ov().includes("1 of 9"), junk(ov()));
  X("close");
  X("idea", "trust");
  X("igset", "yes", "done");
  X("igset", "paid", "gain");
  X("igset", "yes", "fit");
  chk(
    "the Trust read says what to ask, no verdict",
    ov().includes("2 of 3 check out") && ov().includes("How are you paid") && !/\b(bad|scam)\b/i.test(ov())
  );
  X("close");
  X("idea", "advice");
  chk(
    "the translator reads the step of the next dollar",
    ov().includes(esc(FW_STEP_HEAD[fwStepOf(c).step])),
    junk(ov())
  );
  X("close");
  X("idea", "baby");
  chk(
    "the Baby Steps place the player next to the game's order",
    /Baby Step [1-7]|Tap below/.test(ov()) && ov().includes("Which account next")
  );
  X("close");
  X("idea", "dwz");
  X("fwbk", String(Math.floor(c.age / 10) * 10));
  X("fwset", "trip", "bucket." + Math.floor(c.age / 10) * 10);
  X("fwset", "5000", "cost." + Math.floor(c.age / 10) * 10 + ".trip");
  chk("a decade holds an experience and its cost", ov().includes(money(5000)) && clean(ov()), junk(ov()));
  X("igtab", "week");
  X("fwset", "56", "week.sleep");
  chk("the designed week counts the hours placed", ov().includes("112 hours left to place"), junk(ov()));
  X("close");
  /* ---------- Your Money or Your Life ---------- */
  X("ymoyl");
  chk(
    "the path shows the nine steps in order",
    ["1a.", "1b.", "2.", "3.", "4.", "5.", "6.", "7.", "8.", "9."].every(s => ov().includes("<b>" + s)) && clean(ov()),
    junk(ov())
  );
  ["1a", "4", "5", "6", "7", "9"].forEach(id => {
    X("ymstep", id);
    chk("step " + id + " opens clean", ov().includes("Step " + id) && clean(ov()), junk(ov()));
  });
  X("ymstep", "1a");
  X("fwset", "10", "y1a.years");
  X("fwset", "50000", "y1a.pay");
  chk("step 1a adds up every dollar earned", ov().includes(money(500000)), junk(ov()));
  X("ymstep", "4");
  X("fwset", "Home", "ym4open");
  X("fwset", "-", "ym4.0.0");
  X("fwset", "+", "ym4.0.1");
  X("fwset", "0", "ym4.0.2");
  X("ymstep", "6");
  X("fwset", "100", "ym6.0");
  chk(
    "a minus in step 4 shows in step 6, with what it frees",
    ov().includes("Home") && ov().includes(money(100)),
    junk(ov())
  );
  X("fwdone", "4");
  X("ymoyl");
  chk("the path marks 1a and 4 done", fwPathOf(c).done === 2 && fwPathOf(c).next === "1b");
  X("close");
  /* ---------- the quick wins ---------- */
  X("fwwins");
  X("fwwin", "phone");
  X("fwsave", "25", "phone");
  X("fwwin", "subs");
  chk(
    "the wins stack only the tapped amounts",
    fwWinsOf(c).month === 25 && fwWinsOf(c).unpriced === 1 && ov().includes(money(300)),
    junk(ov())
  );
  X("close");
  /* ---------- Home and the spreadsheet ---------- */
  go("home");
  chk(
    "Home has one line of the next dollar at the top",
    (app().match(/Your next dollar:/g) || []).length === 1 &&
      app().indexOf("hqtop") < app().indexOf("fwnext") &&
      app().indexOf("fwnext") < app().indexOf("dkstats")
  );
  const B = fwBook(c);
  chk(
    "the spreadsheet has the SWAN number and the wins",
    B.rows.some(r => r.id === "fw_swan" && r.v === fwSwan({ monthly: 3500, months: 6, worry: 0 }).number) &&
      B.rows.some(r => r.id === "fw_winsy" && r.v === 300)
  );
  G.chars.splice(n0, 1);
  G.active = act0;
  save();
}
