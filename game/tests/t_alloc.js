// ---------- Placed and not placed yet: the first guess stays the total until real lines fill it ----------
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    G0 = r => Object.assign({ s: false }, r),
    R = r => Object.assign({ s: true }, r);
  const mk = () => {
    const c = Object.assign(newChar(), {
      led: true,
      placed: true,
      name: "Al",
      age: 30,
      ret: 60,
      take: 4000,
      spend: 3000,
      incs: [G0({ k: "A main job", amt: 3000 }), G0({ k: "A side gig", amt: 1000 })],
      spends: [
        G0({ k: "Home", amt: 1500 }),
        G0({ k: "Food", amt: 600 }),
        G0({ k: "Getting around", amt: 300 }),
        G0({ k: "Bills and subscriptions", amt: 300 }),
        G0({ k: "Fun and everything else", amt: 300 }),
      ],
      cashes: [G0({ k: "Checking", amt: 2000 })],
      invs: [G0({ k: "401k", amt: 10000 })],
      debts: [G0({ k: "Credit card", amt: 3000, high: true, was: 3000 })],
    });
    syncAll(c);
    return c;
  };
  G.demo = false;
  const c = mk();
  G.chars.push(c);
  G.active = n0;
  save();
  let s = allocSplit(c, "take");
  chk("the first guess is kept", s.guess === 4000 && s.placed === 0 && s.left === 4000 && !s.done);
  c.incs[0].amt = 2500;
  c.incs[0].s = true;
  afterMoney(c, null, false);
  s = allocSplit(c, "take");
  chk(
    "less than the guess: the guess stays the total, the rest is not placed yet",
    c.take === 4000 && s.placed === 2500 && s.left === 1500 && c.incs[1].amt === 1500 && !c.incs[1].s,
    JSON.stringify([c.take, s, c.incs])
  );
  go("money");
  let h = app();
  chk(
    "My Money shows the bar with placed, not placed yet, and the way out",
    h.includes('class="allocbar"') &&
      h.includes("Your income guess: <b>$4,000</b>") &&
      h.includes("Placed $2,500 (63%)") &&
      h.includes("Not placed yet $1,500") &&
      h.includes('data-a="allocall" data-v="take"') &&
      h.includes("gloss:alloc") &&
      clean(h),
    junk(h)
  );
  X("allocall", "take");
  s = allocSplit(c, "take");
  chk(
    "That's all of it: the rest goes, the real lines are the total",
    c.take === 2500 &&
      c.incs.length === 1 &&
      s.done &&
      s.left === 0 &&
      !app().includes('data-a="allocall" data-v="take"')
  );
  c.incs.push(R({ k: "A side gig", amt: 300 }));
  afterMoney(c, null, false);
  chk("after done, the lines alone are the total", c.take === 2800 && allocSplit(c, "take").left === 0);
  // spending over the guess
  c.spends.forEach((x, i) => {
    x.s = true;
    x.amt = [2000, 700, 400, 300, 200][i];
  });
  afterMoney(c, null, false);
  s = allocSplit(c, "spend");
  chk(
    "more than the guess: the lines are the total and the extra shows",
    c.spend === 3600 && s.done && s.over === 600,
    JSON.stringify(s)
  );
  go("money");
  h = app();
  chk(
    "spending over the guess shows in amber, with no red",
    h.includes("$600 over your guess of $3,000") && /fkhot[^>]*>\$600 over your guess/.test(h)
  );
  // debt: a guessed line is not hidden when the real lines pass the guess
  const d = mk();
  d.debts.push(G0({ k: "Student loan", amt: 5000, was: 5000 }));
  d.al = null;
  G.chars.push(d);
  G.active = n0 + 1;
  syncAll(d);
  chk("debt guess", allocSplit(d, "debt").guess === 8000);
  d.debts[0].s = true;
  d.debts[0].amt = 9000;
  afterMoney(d, null, false);
  chk(
    "debt over the guess: the guessed loan keeps its amount",
    d.debts.length === 2 && d.debts[1].amt === 5000 && d.debt === 14000
  );
  // cash: a guessed account is removed when the real lines pass the guess
  d.cashes.push(G0({ k: "Savings", amt: 500 }));
  d.al.cash = null;
  syncAll(d);
  allocArea(d, "cash");
  d.cashes[0].s = true;
  d.cashes[0].amt = 4000;
  afterMoney(d, null, false);
  chk(
    "cash over the guess: the guessed account is not counted twice",
    d.cashes.length === 1 && allocSplit(d, "cash").done,
    JSON.stringify([d.cashes, d.al.cash])
  );
  // a debt payment after done does not bring the guess back
  const e = mk();
  G.chars.push(e);
  G.active = n0 + 2;
  e.debts[0].s = true;
  afterMoney(e, null, false);
  e.debts[0].amt = 1000;
  afterMoney(e, null, false);
  chk(
    "a payment after done does not bring back a guessed part",
    e.debts.length === 1 && e.debt === 1000 && allocSplit(e, "debt").left === 0
  );
  // the question screen
  const f = mk();
  G.chars.push(f);
  G.active = n0 + 3;
  save();
  openSharp("take");
  let o = ov();
  chk(
    "the question screen shows the bar on top",
    o.includes('class="allocbar"') && o.includes("Nothing placed yet") && !o.includes("0%)"),
    o.slice(0, 300)
  );
  X("askyes");
  o = ov();
  chk("confirming one line moves it to placed", o.includes("Placed $3,000 (75%)"));
  X("close");
  chk(
    "My Money stays quiet for an area with nothing placed, and never offers to wipe it",
    !allocBar(f, "cash", null, { slim: true, end: true }) &&
      !allocBar(f, "take", null, { end: true }).includes("allocall")
  );
  chk("the bar never says 0%", !/\(0%\)/.test(allocBar(f, "take")));
  chk("the glossary has the term", !!GLOSS.alloc);
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  closeSheet();
  save();
  go("home");
}
