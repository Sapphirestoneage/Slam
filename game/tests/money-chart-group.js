/* ============================================================================
   SLAM the Game, test: tests/money-chart-group.js
   PURPOSE     Examine the Money Chart for more than two persons.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. One sample profile
               that this file makes (the same profile in the six files that came from one older file).
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/together.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    tour0 = G.tourSeen,
    R = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Kai",
      led: true,
      placed: true,
      age: 30,
      ret: 60,
      take: 4000,
      spend: 3000,
      inv: 20000,
      match: "yes",
      tax: "no",
      work: "First job",
      incs: [R({ k: "A main job", amt: 4000 })],
      spends: [R({ k: "Home", amt: 1800 }), R({ k: "Food", amt: 1200 })],
      cashes: [R({ k: "Checking", amt: 12000 })],
      invs: [R({ k: "Retirement plan at work", amt: 20000 })],
      debts: [
        R({ k: "Credit card balance", amt: 3000, high: true, apr: "15% to 25%", rate: 20, pay: 150 }),
        R({ k: "Car loan", amt: 9000, high: false, apr: "Under 8%", rate: 5, pay: 250 }),
      ],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C();
  let o;
  const m = MCX(c),
    fill = (id, v) => {
      m[id] = {};
      mcItems("ten").forEach((it, k) => (m[id][it.id] = typeof v === "function" ? v(k) : v));
    };
  X("together");
  chk("group chart: your own 10 come first", W.kind === "together" && ov().includes("First, your own 10"));
  fill("ans", 5);
  X("together");
  chk(
    "one person is not a group yet",
    ov().includes("Add at least one more person") && ov().includes("+ Add a person on this phone")
  );
  X("tgadd");
  chk("pass the phone", W.pass === true && ov().includes("Hand the phone to the next person"));
  X("tgcancel");
  chk("back one from pass the phone", !W.pass);
  X("tgadd");
  X("tgstart");
  chk(
    "the guest answers the same 10 for themselves",
    W.kind === "mcq" && W.who === "g1" && ov().includes("How true is this for you?")
  );
  mcItems("ten").forEach(it => X("mcans", "1", it.id));
  chk("after the last answer the group view opens", W.kind === "together" && mcOf(m.g1).ready);
  fill("g2", k => (k % 2 ? 5 : 1));
  m.grp.push({ id: "g2" });
  X("together");
  const In = tgIn(c),
    Gp = mcGroup(In.map(p => p.ans));
  o = ov();
  chk(
    "three people: one bar each per element and a plain line, no ranking",
    In.length === 3 &&
      Gp.size === 3 &&
      (o.match(/class="tgbar"/g) || []).length === 15 &&
      o.includes("The widest gap is in") &&
      !/winner|best|worst|rank/i.test(o.replace(/Nobody is ranked\./, "")) &&
      clean(o),
    junk(o)
  );
  chk("every added person can be removed", (o.match(/data-a="tgdel"/g) || []).length === 2);
  X("tgdel", "g2");
  chk("remove takes them and their answers out", m.grp.length === 1 && m.g2 === undefined && tgIn(c).length === 2);
  chk(
    "a tie at the top names everyone who carries it",
    tgLine({ kind: "cover", scores: [100, 0, 100], strongest: 0 }, ["A", "B", "C"]) ===
      "A and C carry this one for the group." &&
      tgLine({ kind: "cover", scores: [90, 10], strongest: 0 }, ["A", "B"]) === "A carries this one for the group."
  );
  X("tgcopy");
  chk("copy", W.copied === true && tgText(c).split("\n").length === 6);
  X("chart");
  chk("the chart links to the group view", ov().includes('data-a="together"'));
  X("close");
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  G.tourSeen = tour0;
  save();
  go("home");
}
