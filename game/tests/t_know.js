// ---------- what you already know (D.A.I.T.E.) ----------
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    tour0 = G.tourSeen;
  G.demo = false;
  G.tourSeen = "2026-01-01";
  const R = (r, s, cf) => Object.assign({ s: s, cf: cf }, r);
  const a = Object.assign(newChar(), {
    name: "Kay",
    led: true,
    placed: true,
    work: "Self-employed",
    age: 30,
    take: 3000,
    spend: 2500,
    inv: 0,
    incs: [R({ k: "Side gigs", amt: 3000 }, true, 3)],
    spends: [R({ k: "Home", amt: 1500 }, false, 0), R({ k: "Food", amt: 1000 }, false, 0)],
    cashes: [R({ k: "Checking", amt: 900 }, true, 2), R({ k: "Savings", amt: 100 }, true, 3)],
    invs: [],
    debts: [],
    moves: [],
    x: { revSeen: "x" },
  });
  a.sharp = Object.assign({}, a.sharp, { low: false });
  G.chars.push(a);
  G.active = n0;
  save();
  go("home");
  const c = C();
  const K = kwAll(c, D),
    by = k => K.A.find(x => x.k === k);
  chk("five areas in the D.A.I.T.E. order", K.A.map(x => x.k).join("") === "DAITE");
  chk(
    "no debts is a known fact: D is 100%",
    by("D").pct === 100 && by("D").facts.length === 1 && by("D").next === null
  );
  chk(
    "A: one close and one exact cash row is 0.875, and nothing invested is known",
    by("A").facts[0].v === 0.875 && by("A").facts[1].v === 1 && by("A").pct === 94,
    JSON.stringify(by("A").facts.map(f => f.v))
  );
  chk(
    "I: income exact, lowest month and unit not yet, so a third",
    by("I").pct === 33 && by("I").next.t === "Your lowest normal month",
    by("I").pct + " " + JSON.stringify(by("I").facts.map(f => [f.t, f.v]))
  );
  chk("T: nothing known yet", by("T").pct === 0 && by("T").facts.length === 2);
  chk("E: guesses count zero", by("E").pct === 0 && by("E").next.a === "sharp" && by("E").next.av === "spend");
  chk(
    "the next area is the emptiest one, and the total is the average of every fact",
    K.next.pct === 0 &&
      K.total === K.A.reduce((s, x) => s + x.facts.length, 0) &&
      K.pct === Math.round((K.A.reduce((s, x) => s + x.facts.reduce((t, f) => t + f.v, 0), 0) / K.total) * 100)
  );
  chk(
    "Home leads with what is known, under the four tiles, and it shows collapsed",
    app().includes("You already know " + K.known + " of " + K.total + " things") &&
      app().includes('class="rowbtn homerow kwstrip"') &&
      app().indexOf('class="quad"') < app().indexOf("kwstrip") &&
      ["D", "A", "I", "T", "E"].every(l => app().includes("<b>" + l + "</b>"))
  );
  chk(
    "the Home tile uses the same number",
    fogPct(c, D) === K.pct && app().includes('<b class="qt">' + K.pct + "%</b>")
  );
  X("know");
  chk(
    "the sheet: the big number, five areas, the emptiest one open, a next button",
    W.kind === "know" &&
      ov().includes(K.pct + "%") &&
      ov().includes("Debts") &&
      ov().includes("Expenses") &&
      ov().includes("All known") &&
      ov().includes("Next: ") &&
      ov().includes('data-a="kwgo"') &&
      clean(ov()),
    junk(ov())
  );
  chk(
    "known facts are listed as known, missing ones as taps",
    (() => {
      X("kwopen", "A");
      return (
        ov().includes("✓ Whether you have anything invested") &&
        ov().includes("○ Cash you can reach") &&
        ov().includes("Close ›")
      );
    })()
  );
  X("kwopen", "A");
  chk("tapping an open area closes it", W.open === null);
  X("kwopen", "E");
  X("kwgo", "spend", "sharp");
  chk("a missing fact goes straight to where it is filled in", W.kind === "sharp" && W.q === "spend");
  X("close");
  X("kwgo", "tax", "gig");
  chk("the set-aside fact opens the tax screen", W.kind === "gig" && W.tab === "tax");
  X("gxset", "30", "pct");
  X("close");
  chk("answering moves the number", kwAll(C(), derive(C())).A.find(x => x.k === "T").pct === 50);
  C().spends.forEach(r => {
    r.s = true;
    r.cf = 3;
  });
  save();
  go("home");
  chk("making expenses exact fills E", kwAll(C(), D).A.find(x => x.k === "E").pct === 50 && kwAll(C(), D).pct > K.pct);
  X("fog");
  chk('the old "your picture" tile opens this now', W.kind === "know");
  X("close");
  const e = Object.assign(newChar(), { name: "New", led: false, placed: false, x: {} });
  G.chars.push(e);
  G.active = n0 + 1;
  save();
  go("home");
  const K0 = kwAll(C(), D);
  chk(
    "someone who has entered nothing is at 0, with no junk",
    K0.pct === 0 && K0.known === 0 && !app().includes("kwstrip")
  );
  X("know");
  chk("and the sheet still reads cleanly", clean(ov()), junk(ov()));
  chk(
    "the checklist has the row and every probe still passes",
    btRows().some(r => r.n.startsWith("What you already know") && r.st === "b") && btCount(btRows()).x === 0
  );
  X("close");
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  if (tour0) G.tourSeen = tour0;
  else delete G.tourSeen;
  save();
  go("home");
}
