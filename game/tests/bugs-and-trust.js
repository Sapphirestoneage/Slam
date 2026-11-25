/* ============================================================================
   SLAM the Game, test: tests/bugs-and-trust.js
   PURPOSE     Examine the UX pass, phase 1 (bugs and trust): a fast second tap is dropped, a tap sets a value,
               the plain choice when the lines pass the first guess, Guess and Close come from the rows, net
               worth is a range while it has guesses, the real hourly wage counts work income only, the Quest
               Log after setup, and every top tile opens a breakdown.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: screens/ux.js, screens/ui.js, features/alloc.js,
               features/element.js, features/kit.js, features/look.js, features/questlog.js, core/engine.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo;
  const mk = () => {
    const c = Object.assign(newChar(), {
      name: "Bea",
      age: 27,
      work: "Between jobs",
      incKinds: ["A main job", "Help from family"],
      debtKinds: ["Credit card balance", "Student loans"],
      accts: ["Checking", "Savings", "IRA or Roth IRA"],
      can1k: "No",
      cover: "Less than a month",
      invest: "Sometimes",
      home: "Renting",
      payFreq: "Weekly",
      steady: "Steady",
    });
    applyTypical(c);
    return c;
  };

  /* 1. the tap guard */
  chk("a tap right after a tap that moved on is dropped", uxTapDropRule({ at: 1000, moved: true }, 1200) === true);
  chk("a tap after the gap counts", uxTapDropRule({ at: 1000, moved: true }, 1600) === false);
  chk("a tap after a tap that did not move on counts", uxTapDropRule({ at: 1000, moved: false }, 1100) === false);
  chk("the first tap counts", uxTapDropRule(null, 5) === false);

  /* 1. a tap sets, never adds */
  const c = mk();
  G.demo = false;
  G.chars.push(c);
  G.active = G.chars.length - 1;
  save();
  X("sharp", "spend");
  if (W && W.kind === "sharp" && W.q === "spend" && !W.ask) {
    const i0 = W.i;
    X("rng", "300", "s:" + i0);
    chk("a range chip sets the amount of its line", W.o.spends[i0].amt === 300 && W.o.spends[i0].cf === 2);
  }
  /* the same chip twice: the amount stays the same */
  W = { kind: "sharp", q: "take", i: 0, t: {}, pad: null, o: moneyO(C()) };
  padSet("n:0", 2000);
  padSet("n:0", 2000);
  chk("the same value twice stays the value", W.o.incs[0].amt === 2000);
  closeSheet();

  /* 2. the plain choice */
  const p = mk();
  allocArea(p, "spend");
  p.spends.forEach(x => {
    x.s = true;
    x.amt = 1600;
  });
  const box = allocBar(p, "spend", null, {});
  chk(
    "lines over the guess: a plain choice, no warning",
    /add up to <b>\$8,000<\/b>\. Your first guess was <b>\$3,000<\/b>\. Which is closer\?/.test(box) &&
      box.includes('data-a="alpick"') &&
      !/over your guess/.test(box),
    box
  );
  chk(
    "the check finds the inflated total",
    allocInflated(p).some(x => x.k === "spend" && x.lines === 8000)
  );
  allocPick(p, "spend", "guess");
  syncAll(p);
  chk("'my first guess' shrinks the lines to the guess", rsum(p.spends) === 3000 && p.al.spend.done);
  const p2 = mk();
  allocArea(p2, "spend");
  p2.spends.forEach(x => {
    x.s = true;
    x.amt = 1600;
  });
  allocPick(p2, "spend", "lines");
  chk("'my categories' keeps the lines as the total", p2.al.spend.g === 8000 && p2.al.spend.done);

  /* 3. Guess until rows are entered */
  const g = mk(),
    S = elStats(g, derive(g));
  chk(
    "stock numbers of setup are Guess, never Close",
    S.every(s => s.st === "Guess"),
    S.map(s => s.id + ":" + s.st).join(",")
  );
  chk(
    "a Guess shows 'Where's this from?' with the typical numbers",
    /about \$1,500 coming in, \$3,000 going out/.test(whereFromText(g, ["take", "spend"]))
  );
  g.incs.forEach(x => (x.s = true));
  g.spends.forEach(x => (x.s = true));
  chk("entered rows make it Close", elStats(g, derive(g)).find(s => s.id === "left").st === "Close");

  /* 4. net worth is a range while it has guesses */
  const n = mk(),
    N = lkNwText(n, derive(n));
  chk("net worth with guesses is a range", N.range && /^about .+ to .+/.test(N.txt) && N.st === "Guess", N.txt);
  n.invs = [{ k: "IRA or Roth IRA", amt: 100000, s: true, cf: 2 }];
  n.cashes = [{ k: "Checking", amt: 1000, s: true, cf: 3 }];
  n.debts = [];
  syncAll(n);
  const N2 = lkNwRange(n, derive(n));
  chk("a range chip gives its range", N2.lo === 51000 && N2.hi === 151000, N2.lo + " " + N2.hi);
  n.invs[0].cf = 3;
  chk("typed numbers give one number", !lkNwText(n, derive(n)).range);

  /* 5. the real hourly wage: work income, $869 a week at 40 hours is about $21.70 */
  const w = mk();
  w.incs = [
    { k: "A main job", amt: Math.round((869 * 52) / 12), s: true },
    { k: "Help from family", amt: 200, s: true },
  ];
  w.hrs = { w: 40, cm: 0, s: true };
  syncAll(w);
  const tl = timeLedger(w, derive(w));
  chk("the real hourly wage counts work only", Math.abs(tl.wage - 21.73) < 0.05, tl.wage);
  const gap = (w.inv * SWR) / 12 - tl.dy / 12;
  chk("the money machine: pays minus charges, in dollars a month", isFinite(gap));

  /* 6. the Quest Log after setup */
  const q = mk(),
    J = questJourney(q, derive(q));
  chk("after setup, 'Make your character' is done", J[0].parts[0].st === "done" && J[0].done >= 1, J[0].done);
  const K = questContinue(q);
  chk(
    "Continue points at a letter of D.A.I.T.E., not Setup",
    K && K.label !== "Setup" && /: /.test(K.label),
    K && K.label
  );

  /* 7. every top tile opens */
  G.chars[G.active] = mk();
  save();
  go("money");
  const tiles = (app().match(/class="dktile"[^>]*>/g) || []).length,
    btns = (app().match(/<button class="dktile" data-a="lkbrk"/g) || []).length;
  chk("each tile of My Money is a button that opens a breakdown", btns === 4, tiles + " " + btns);
  ["nw", "cash", "inv", "debt"].forEach(v => {
    X("lkbrk", v);
    chk("the breakdown of " + v + " opens", W.kind === "lkbrk" && clean(ov()), junk(ov()));
  });
  X("lkbrk", "nw");
  chk("the IRA line says before taxes", ov().includes("Some of this goes to taxes when you take it out."));
  closeSheet();

  G.chars.splice(n0);
  G.active = act0;
  G.demo = demo0;
  save();
}
