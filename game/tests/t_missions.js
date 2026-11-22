// ---------- the mission board ----------
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    tour0 = G.tourSeen;
  G.demo = false;
  G.tourSeen = "2026-01-01";
  const R = (r, s, cf) => Object.assign({ s: s, cf: cf }, r);
  const a = Object.assign(newChar(), {
    name: "Mo",
    led: true,
    placed: true,
    age: 30,
    take: 4000,
    spend: 3500,
    inv: 0,
    incs: [R({ k: "A main job", amt: 4000 }, true, 3)],
    spends: [R({ k: "Home", amt: 2000 }, true, 3), R({ k: "Food", amt: 1500 }, true, 3)],
    cashes: [R({ k: "Checking", amt: 300 }, true, 3)],
    invs: [],
    debts: [R({ k: "Credit card balance", amt: 2500, high: true }, true, 3)],
    moves: [],
    x: { revSeen: "x" },
  });
  G.chars.push(a);
  G.active = n0;
  save();
  go("plan");
  const c = C();
  const S = msStory(c, D);
  chk(
    "the story mission is the engine's own next step, with all five parts",
    !!S && S.t === nextStep(c, D).t && S.mins > 0 && S.pay.length > 5 && S.unl.length > 5 && S.why.length > 5,
    JSON.stringify(S)
  );
  chk(
    "Next Steps opens with the board: story, side missions, heists",
    app().includes("Story mission") &&
      app().includes("Payout:") &&
      app().includes("Unlocks:") &&
      app().includes("About ") &&
      app().includes("Side missions") &&
      app().includes("Heists") &&
      app().indexOf("msboard") < app().indexOf("plseg") &&
      clean(app()),
    junk(app())
  );
  const side = msSide(c, D);
  chk(
    "side missions are real, undone things, each with a payout and a working action",
    side.length >= 3 &&
      side.every(m => m.pay && m.mins > 0 && typeof ACT[m.a] === "function") &&
      side.some(m => m.id.startsWith("drill:")) &&
      side.some(m => m.id === "values:check") &&
      side.some(m => m.id.startsWith("know:")),
    side.map(m => m.id).join()
  );
  const kn = side.find(m => m.id.startsWith("know:"));
  chk("the payout of a know mission is the real change in that letter", /goes from \d+% to \d+% known/.test(kn.pay));
  const H = msHeists(c, D),
    h1 = H.find(h => h.id === "h1000"),
    hc = H.find(h => h.id === "hcard"),
    hp = H.find(h => h.id === "hpicture");
  chk(
    "first $1,000: cash known and $250 reached already count",
    h1.n1 === 2 && h1.next.t === "Reach $500" && !h1.done,
    JSON.stringify(h1.stages.map(s => s.ok))
  );
  chk("kill the card: balance known, rate next", hc.stages[0].ok && !hc.done && hc.next.a === "debtplan");
  chk(
    "see the whole picture has one stage per letter",
    hp.total === 5 && hp.stages.map(s => s.t[0]).join("") === "DAITE"
  );
  chk("no tax heist for someone on a paycheck", !H.some(h => h.id === "htax"));
  X("msheist", "h1000");
  chk(
    "a heist opens to its stages, with the next one marked",
    app().includes("➤ Reach $500") &&
      app().includes("✓ Know your cash for sure") &&
      app().includes("Next stage: Reach $500")
  );
  X("msheist", "h1000");
  chk("and closes", !app().includes("Next stage: Reach $500"));
  X("msgo", "values", "values");
  chk("a side mission goes straight to its screen", W.kind === "values");
  X("close");
  X("msgo", kn.v, "kwgo", { l: kn.k });
  chk(
    "a know mission goes to where that fact is filled in",
    !!W &&
      (W.kind === "sharp" ||
        W.kind === "metric" ||
        W.kind === "debtplan" ||
        W.kind === "gig" ||
        W.kind === "compare" ||
        W.kind === "import"),
    W && W.kind
  );
  X("close");
  go("plan");
  const seen0 = Object.keys(msGet(C()).seen).length;
  chk("what was offered is remembered", seen0 >= 3 && msGet(C()).done.length === 0);
  C().x.drills = {
    bill: { n: 1, d: todayISO() },
    job: { n: 1, d: todayISO() },
    cut: { n: 1, d: todayISO() },
    miss: { n: 1, d: todayISO() },
  };
  save();
  go("home");
  go("plan");
  chk(
    "doing a mission moves it to Done, and the next one of its kind appears",
    msGet(C()).done.some(x => x.id === "drill:bill") &&
      app().includes("Done (") &&
      !msSide(C(), D).some(m => m.id === "drill:bill"),
    JSON.stringify(msGet(C()).done.map(x => x.id))
  );
  C().cashes[0].amt = 1200;
  save();
  go("home");
  go("plan");
  const h1b = msHeists(C(), D).find(h => h.id === "h1000");
  chk(
    "reaching $1,000 with the drill done finishes the heist and it is kept",
    h1b.done && msGet(C()).done.some(x => x.id === "h1000" && x.h) && app().includes("✓ <b>The first $1,000</b>"),
    JSON.stringify(h1b.stages.map(s => s.ok))
  );
  chk("no streaks, no prizes", !/streak|in a row|jackpot|loot|spin/i.test(app().replace(/<[^>]+>/g, " ")));
  const g = Object.assign(newChar(), {
    name: "Gi",
    led: true,
    placed: true,
    take: 3000,
    spend: 2500,
    incs: [R({ k: "Side gigs", amt: 3000 }, true, 3)],
    x: { revSeen: "x" },
  });
  G.chars.push(g);
  G.active = n0 + 1;
  save();
  go("plan");
  chk(
    "someone with gig income gets the tax heist and the unit mission",
    msHeists(C(), D).some(h => h.id === "htax") && msSide(C(), D).some(m => m.id === "gig:unit") && clean(app()),
    junk(app())
  );
  const e = Object.assign(newChar(), { name: "No", led: false, placed: false, x: {} });
  G.chars.push(e);
  G.active = n0 + 2;
  save();
  go("plan");
  chk("someone who has entered nothing sees the plain plan, no board", !app().includes("msboard"));
  chk(
    "the checklist row passes",
    btRows().some(r => r.n.startsWith("The mission board") && r.st === "b") && btCount(btRows()).x === 0
  );
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  if (tour0) G.tourSeen = tour0;
  else delete G.tourSeen;
  save();
  go("home");
}
