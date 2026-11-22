// ---------- the multipliers board ----------
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    a = Object.assign(newChar(), {
      name: "Mo",
      led: true,
      placed: true,
      age: 25,
      ret: 65,
      take: 4000,
      spend: 3000,
      inv: 10000,
      high: "no",
      match: "no",
      tax: "no",
      work: "First job",
    });
  G.demo = false;
  G.chars.push(a);
  G.active = n0;
  save();
  go("home");
  const c = C(),
    d = derive(c);
  chk(
    "the menu has it",
    MENU.some(m => m[1] === "mult")
  );
  X("mult");
  chk(
    "board: seven pegs, two slots, a total, no peg on at first",
    W.kind === "mult" &&
      (ov().match(/class="mupeg/g) || []).length === 7 &&
      ov().includes("Market only") &&
      ov().includes("Your path") &&
      ov().includes("No pegs on yet") &&
      ov().includes(money(Math.round(12000 * 0.07))) &&
      clean(ov()),
    junk(ov())
  );
  chk(
    "the coin follows a drawn path, nothing random",
    ov().includes("<animateMotion") && !/Math\.random/.test(muBoard.toString() + muAll.toString() + muVal.toString())
  );
  const m0 = muStart(c);
  chk(
    "values by hand",
    Math.abs(muVal(c, d, "match", m0).yr - 5000 * 12 * 0.03) < 1e-6 &&
      Math.abs(muVal(c, d, "card", m0).yr - 432) < 1e-6 &&
      muVal(c, d, "bank", m0).yr === 600 &&
      muVal(c, d, "ahead", m0).yr === 0 &&
      Math.abs(muVal(c, d, "acct", m0).yr - Math.min(12000, ROTH) * 0.2) < 1e-6 &&
      muVal(c, d, "hsa", m0).yr === 0 &&
      muVal(c, d, "lev", m0).risk === true
  );
  X("mutog", "card");
  X("mutog", "bank");
  const A = muAll(c, d);
  chk(
    "two pegs on: the total is their sum, saved",
    c.x.mu.on.card === 1 &&
      c.x.mu.on.bank === 1 &&
      Math.abs(A.extra - 1032) < 1e-6 &&
      ov().includes(money(1032)) &&
      ov().includes("Like a 2.1% raise") &&
      ov().includes("still guesses")
  );
  X("mutog", "card");
  chk("a second tap takes a peg off", !c.x.mu.on.card && Math.abs(muAll(c, d).extra - 600) < 1e-6);
  X("mutog", "lev");
  chk(
    "borrowing shows but never counts",
    c.x.mu.on.lev === 1 &&
      Math.abs(muAll(c, d).extra - 600) < 1e-6 &&
      ov().includes("It is not in the total") &&
      !ov().includes("var(--bad)")
  );
  X("muopen", "ahead");
  chk(
    "buying ahead asks if you would buy it anyway",
    W.v === "ahead" && ov().includes("Would you buy these anyway?") && ov().includes("not a saving")
  );
  X("muset", "1", "any");
  chk(
    "yes counts it and switches it on",
    c.x.mu.any === true && c.x.mu.on.ahead === 1 && muVal(c, d, "ahead", muStart(c)).yr === 240
  );
  X("muset", "200", "ahead");
  chk("amount chips", muVal(c, d, "ahead", muStart(c)).yr === 480);
  X("muset", "0", "any");
  chk("not sure counts nothing", muVal(c, d, "ahead", muStart(c)).yr === 0);
  X("muopen", "hsa");
  X("muset", "2000", "hsa");
  chk(
    "health account: an amount switches it on at your tax rate",
    c.x.mu.on.hsa === 1 && muVal(c, d, "hsa", muStart(c)).yr === 400
  );
  X("muopen", "bank");
  X("muset", "4", "bank");
  chk("bank bonuses by count", muVal(c, d, "bank", muStart(c)).yr === 1200 && ov().includes("taxable income"));
  MU.forEach(p => {
    X("muopen", p.k);
    chk(
      "peg " + p.k + " opens with when it matters and math",
      W.v === p.k && ov().includes("When it matters most") && clean(ov()),
      junk(ov())
    );
  });
  X("muopen", "match");
  X("mutog", "match", "stay");
  chk("add from a peg page returns to the board", W.v === null && c.x.mu.on.match === 1);
  c.high = "yes";
  X("mult");
  X("mutog", "card");
  chk(
    "card rewards wait behind card debt",
    !c.x.mu.on.card && W.v === "card" && ov().includes("Not yet") && ov().includes("paid off first")
  );
  c.high = "no";
  c.match = "no match offered";
  chk(
    "no match offered: the peg says so and counts nothing",
    !!muVal(c, d, "match", muStart(c)).lock && !muAll(c, d).live.some(p => p.k === "match")
  );
  c.match = "no";
  const X0 = muCross(c, d, muStart(c));
  chk(
    "crossover by hand: deals flat, taxes are growth times 15%",
    X0.pts[0].a === 25 &&
      X0.pts[X0.pts.length - 1].a === 65 &&
      Math.abs(X0.pts[0].tax - 10000 * 0.07 * 0.15) < 1e-6 &&
      Math.abs(X0.pts[1].bal - (10000 * 1.07 + 12000)) < 1e-6 &&
      X0.pts.every(p => p.deal === X0.deal) &&
      X0.cross &&
      X0.cross.a > 25 &&
      X0.pts.find(p => p.a === X0.cross.a).tax > X0.deal &&
      X0.pts.find(p => p.a === X0.cross.a - 1).tax <= X0.deal,
    JSON.stringify(X0.cross)
  );
  X("muopen", "cross");
  chk(
    "crossover screen: two labelled lines, the age, and the finish line both ways",
    W.v === "cross" &&
      ov().includes("Deals (flat, dashed)") &&
      ov().includes("Taxes (rising)") &&
      ov().includes("Around age " + X0.cross.a) &&
      ov().includes("if it comes out tax-free") &&
      ov().includes("if it comes out taxed") &&
      clean(ov()),
    junk(ov())
  );
  const T = muTop(c, d);
  chk("finish line by hand", Math.abs(T.fi - d.fiBase) < 1e-6 && Math.abs(T.taxed - d.fiBase / 0.88) < 1e-3);
  c.x.taxPct = 25;
  chk(
    "a known tax rate makes the tax pegs Close",
    muVal(c, d, "acct", muStart(c)).cf === 2 &&
      Math.abs(muVal(c, d, "acct", muStart(c)).yr - Math.min(12000, ROTH) * 0.25) < 1e-6
  );
  X("mult");
  X("info", null, "gloss:multiplier");
  chk("the explain button opens", ov().includes("In plain words") && ov().includes("Multiplier"));
  G.demo = true;
  const b = JSON.stringify(G.chars.map(x => x.name));
  X("mult");
  chk("opens in the sample game too", W.kind === "mult" && clean(ov()));
  G.demo = false;
  X("close");
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  save();
  go("home");
}
