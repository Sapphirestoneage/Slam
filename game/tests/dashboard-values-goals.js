/* ============================================================================
   SLAM the Game, test: tests/dashboard-values-goals.js
   PURPOSE     Examine the UX pass, phase 5: the donut gives each part a slice you can see and tap, the money
               machine math (net, hours of work, invested to not need to work), the big three as a share of
               spending, "Is it safe to spend this?" waits for goals and bills, My Money starts with the four
               tiles and closed sections, the ranking and linking of values, and goals kept, ranked, top 3 now,
               the rest Someday and the next one moving up.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: screens/dash.js, features/tally.js, features/look.js,
               features/values.js, features/goalrank.js, screens/ui.js, core/metrics.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    tour0 = G.tourSeen;
  const mk = o => {
    const c = Object.assign(
      newChar(),
      {
        name: "Dee",
        age: 30,
        work: "Established",
        incKinds: ["A main job"],
        debtKinds: ["Credit card balance"],
        accts: ["Checking", "Savings", "Other investments"],
        can1k: "Yes",
        cover: "1 to 3 months",
        invest: "Sometimes",
        home: "Renting",
        payFreq: "Every 2 weeks",
        steady: "Steady",
        placed: true,
      },
      o || {}
    );
    applyTypical(c);
    G.chars.push(c);
    G.active = G.chars.length - 1;
    G.demo = false;
    G.tourSeen = true;
    save();
    D = derive(c);
    return c;
  };

  /* 25. the donut */
  const S = dkSlices(
    [
      { l: "Big", v: 9700 },
      { l: "Tiny", v: 10 },
      { l: "Small", v: 290 },
    ],
    0.04
  );
  const sum = S.reduce((t, s) => t + s.frac, 0);
  chk("the slices add up to the whole ring", Math.abs(sum - 1) < 1e-9, sum);
  chk("a tiny part gets at least 4% of the ring", S[1].frac >= 0.04 - 1e-9, S[1].frac);
  chk("its legend keeps the true share", Math.round(S[1].share * 1000) === 1, S[1].share);
  chk("the big part gives up the room", S[0].frac < 0.97 && S[0].frac > 0.9, S[0].frac);
  const dn = dkDonut(
    [
      { l: "Home", v: 1000, i: 0 },
      { l: "Fun", v: 5, i: 4 },
    ],
    { amt: true, act: p => ["rowedit", p.i, "spends"] }
  );
  chk(
    "each part of the donut is a button that opens its lines",
    (dn.match(/data-a="rowedit"/g) || []).length === 2,
    dn
  );
  chk("the legend shows the dollars and the share", /\$1,000 · 100%/.test(dn) && /Fun/.test(dn), dn);

  /* 27. the money machine */
  const c = mk();
  c.invs[0].amt = 30000;
  c.invs[0].s = true;
  syncAll(c);
  D = derive(c);
  const M = tlMachine(c, D),
    tl = timeLedger(c, D);
  chk("pays you: invested x 4% / 12", Math.abs(M.pays - (c.inv * 0.04) / 12) < 0.01, M.pays);
  chk("$30,000 invested pays $100 a month", Math.round(M.pays) === 100, M.pays);
  chk("the net is pays minus costs", Math.abs(M.net - (M.pays - tl.dy / 12)) < 0.01, M);
  chk(
    "the net in hours is the net over the real hourly wage",
    M.wage > 0 && Math.abs(M.hours - Math.abs(M.net) / M.wage) < 1e-9,
    M
  );
  chk("to not need to work: a year of spending / 4%", Math.abs(M.need - (c.spend * 12) / 0.04) < 0.01, M.need);
  const mc = tlMachineCard(c, D);
  chk(
    "the card leads with the net",
    mc.indexOf("a month</div>") < mc.indexOf("What you own pays you") &&
      /Your (money makes you|debts cost you)/.test(mc),
    mc
  );
  chk(
    "the card says what you would need invested",
    /you'd need about <b[^>]*>\$[\d,]+<\/b> invested to not need to work/.test(mc),
    mc
  );
  chk("the card keeps Show the math", /Show the math/.test(mc) && /÷ 4% =/.test(mc));

  /* 26. the big three */
  const B = tlBig3(c),
    home = c.spends.find(r => r.k === "Home").amt;
  chk("home's share is of spending", Math.abs(B.rows[0].ofSpend - home / c.spend) < 1e-9, B.rows[0]);
  const b3 = tlBig3Card(c);
  chk(
    "the big three card says share of what you spend and shows the math",
    /of what you spend/.test(b3) && /÷ \$[\d,]+ you spend =/.test(b3),
    b3
  );

  /* 24. My Money: four tiles first, the rest closed */
  go("money");
  const m = app();
  chk("My Money draws clean", clean(m), junk(m));
  const t1 = m.indexOf('class="dkstats"'),
    s1 = m.indexOf('class="card dksec"');
  chk("the four key tiles come before the closed sections", t1 >= 0 && s1 > t1, [t1, s1]);
  chk(
    "the four tiles are Net worth, Cash, Invested, You owe",
    /Net worth[\s\S]*Cash[\s\S]*Invested[\s\S]*You owe/.test(m.slice(t1, t1 + 3000))
  );
  const secs = m.match(/<details class="card dksec"[^>]*>/g) || [];
  chk(
    "the other parts are in sections that start closed",
    secs.length >= 6 && secs.every(x => !/\sopen/.test(x)),
    secs
  );
  chk(
    "each section has a one-line meaning",
    (m.match(/<span class="dkst"><b>[^<]+<\/b><span class="tiny muted">[^<]+<\/span>/g) || []).length === secs.length
  );
  chk("the Key numbers card is inside a section", m.indexOf("kncard") > m.indexOf('data-sec="keys"'));
  DK_OPEN.machine = true;
  go("money");
  chk("an opened section stays open after a redraw", /data-sec="machine"\s+open/.test(app()));
  DK_OPEN.machine = false;
  chk(
    "a key number with no info says Tap to unlock",
    knTile({ id: "x", n: "X", val: "-", num: null, need: ["a"], zone: ["", ""] }).indexOf("Tap to unlock") >= 0
  );

  /* safe to spend waits */
  c.goals = [];
  delete c.x.noGoals;
  chk(
    "safe to spend needs goals and bills first",
    safeNeed(c)
      .map(x => x[0])
      .join() === "goals,bills",
    safeNeed(c)
  );
  X("safe");
  X("safeamt", "50");
  chk(
    "the sheet says it needs a bit more info, and gives no answer yet",
    /needs a bit more info/.test(ov()) && !/class="verdict/.test(ov()),
    ov()
  );
  c.spends.forEach(r => (r.s = true));
  c.x.noGoals = true;
  chk("with bills put in and no goals for now, it can answer", safeNeed(c).length === 0);
  X("close");

  /* 28. values */
  X("values");
  X("vltop", "Family");
  X("vltop", "Health");
  X("vltop", "Fun");
  X("vltop", "Learning");
  X("vlpile", "1");
  X("vltop", "Faith");
  let V = vlGet(c);
  chk("tapping in order ranks", V.rank.join() === "Family,Health,Fun,Learning", V.rank);
  chk("the pile holds Not important", V.no.join() === "Faith", V.no);
  X("vldown", "0");
  V = vlGet(c);
  chk("move down swaps the order", V.rank.slice(0, 2).join() === "Health,Family", V.rank);
  vlRankMove(c, 3, 0);
  chk("a drag moves a value to its place", vlGet(c).rank[0] === "Learning", vlGet(c).rank);
  X("vlpile", "0");
  X("vlstep", "2");
  chk("one place on each screen, with its icon", /Place 1 of \d/.test(ov()) && /🏠/.test(ov()), ov());
  X("vlserve", "Family", "Home");
  X("vlserve", "Health", "Home");
  X("vlserve", "", "Food");
  X("vlmark", "less", "Fun and everything else");
  V = vlGet(c);
  chk("a place can serve two values", vlServes(V, "Home").join() === "Family,Health", V.serves);
  chk("None is an answer", vlServes(V, "Food").length === 0);
  const R = vlResult(c),
    h = c.spends.find(r => r.k === "Home").amt;
  chk(
    "a place serving two values splits its dollars",
    Math.abs(R.by.Family - h / 2) < 0.01 && Math.abs(R.by.Health - h / 2) < 0.01,
    R.by
  );
  const fun = c.spends.find(r => r.k === "Fun and everything else").amt;
  chk(
    "Less frees a tenth of the line a month",
    R.change === -vlStep(fun) && vlStep(fun) === Math.max(10, Math.round(fun / 100) * 10),
    R.change
  );
  chk(
    "an old save still reads: top becomes the ranking, ok becomes keep",
    (() => {
      const o = { x: { vals: { top: ["Home"], serves: { Food: "Home" }, marks: { Food: "ok" } } } },
        g = vlGet(o);
      return g.rank[0] === "Home" && vlServes(g, "Food")[0] === "Home" && g.marks.Food === "keep";
    })()
  );
  X("vlstep", "3");
  const e = ov();
  chk(
    "the end screen always shows a result, one idea and a next button",
    /Where it matches/.test(e) && /One idea:/.test(e) && /class="primary wide go"[^>]*>Next:/.test(e),
    e
  );
  chk("the end screen shows dollars a month for each value", /1\. Learning<\/span><b>\$[\d,]+ a month/.test(e), e);
  chk("the end screen draws clean", clean(e), junk(e));
  X("close");

  /* 29. goals */
  c.goals = [];
  X("draft");
  let d0 = ov();
  chk(
    "Keep is a button and the cap is gone",
    /<button class="ghost slim" data-a="grkeep"/.test(d0) && !/Keep up to 3/.test(d0),
    d0
  );
  chk("Next: rank them waits for a kept goal", /data-a="grnext" disabled/.test(d0));
  chk("None of these, for now is a plain link", /class="linkish" data-a="grnone">None of these, for now/.test(d0));
  const deal = draftDeal(c, 0);
  deal.forEach(k => X("grkeep", k));
  d0 = ov();
  chk("a kept goal flips to ✓ Kept", (d0.match(/✓ Kept/g) || []).length === deal.length, d0);
  chk("all five can be kept", deal.length === 5 && W.pick.length === 5);
  W.own = ["Pay off mom"];
  X("grnext");
  chk(
    "Next makes the goals, own one too",
    c.goals.length === 6 && c.goals.some(g => g.n === "Pay off mom"),
    c.goals.map(g => g.n)
  );
  chk("the rank step shows Working on now and Someday", /Working on now/.test(ov()) && /Someday/.test(ov()));
  X("grdown", "0");
  X("grdone");
  const L = grOrder(c);
  chk(
    "the order is the one ranked",
    L[0].n === deal[1] && L[1].n === deal[0],
    L.map(g => g.n)
  );
  chk(
    "the top 3 are placed, so money and dates go to them",
    L.slice(0, 3).every(g => g.era != null),
    L.map(g => g.era)
  );
  chk(
    "the rest wait on Someday",
    L.slice(3).every(g => g.era == null),
    L.map(g => g.era)
  );
  go("goals");
  chk(
    "My Goals shows Working on now, then Someday dimmed",
    /Working on now[\s\S]*Someday[\s\S]*opacity:\.6/.test(app()),
    ""
  );
  L[1].era = 4;
  grApply(c);
  const fourth = L[3];
  L[0].done = todayISO();
  grPromote(c);
  chk("when a top goal is done the next one moves up", fourth.era != null && grOrder(c).indexOf(fourth) === 2, [
    fourth.era,
    grOrder(c).map(g => g.n),
  ]);
  grMove(c, 0, 4);
  grApply(c);
  chk("a goal that moves down keeps its era for later", L[1].era == null && L[1].eraWas === 4, [L[1].era, L[1].eraWas]);
  grMove(c, 4, 0);
  grApply(c);
  chk("and gets it back when it moves up", L[1].era === 4, L[1].era);
  chk(
    "the book of the plan has the machine and the values",
    bookSections(c).some(s => /money machine/.test(s.title)) &&
      bookSections(c).some(s => /going where I want/.test(s.title))
  );

  /* put the game back */
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  G.tourSeen = tour0;
  save();
}
