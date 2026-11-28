/* ============================================================================
   SLAM the Game, test: tests/what-depends-on-what.js
   PURPOSE     Examine What depends on what: the chains, the one-line replay, the off switch, and the
               second title from an add-on.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/dep.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    R2 = r => Object.assign({ s: true, cf: 2 }, r),
    G0 = r => Object.assign({ s: false }, r);
  const a = Object.assign(newChar(), {
    led: true,
    placed: true,
    name: "Eli",
    age: 25,
    ret: 50,
    take: 5200,
    incs: [R2({ k: "A main job", amt: 5200 })],
    spends: [G0({ k: "Home", amt: 1500 }), G0({ k: "Fun and everything else", amt: 700 })],
    cashes: [R2({ k: "Checking", amt: 6000 })],
    invs: [R2({ k: "Brokerage", amt: 9000 })],
    debts: [],
  });
  const hadPk = typeof PKSET === "function";
  if (hadPk) PKSET(PK1, false);
  G.demo = false;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  DEPX.line = null;
  go("home");
  const c = C();
  chk(
    "first look stores what is filled and replays nothing",
    depX(c).f &&
      depX(c).f.take === true &&
      depX(c).f.spend === false &&
      !DEPX.line &&
      !app().includes('class="depline"')
  );
  X("dep");
  let o = ov();
  chk(
    "the view: four chains, plain title, an i, a Fill it in button on what is missing",
    W.kind === "dep" &&
      (o.match(/class="tile stack depchain"/g) || []).length === 4 &&
      o.includes("What depends on what") &&
      o.includes("gloss:dep") &&
      o.includes('data-a="sharp" data-v="spend"') &&
      o.includes("Fill it in") &&
      clean(o),
    junk(o)
  );
  chk("everyone without the add-on sees only the plain name", depTitle() === null && !o.includes("muted deppl"));
  chk(
    "each chain says itself in one line",
    o.includes("Your budget") &&
      o.includes(", which sets </span>") &&
      depLine(DEP_C[0], "spend").txt ===
        "Your budget sets your retirement spending, which sets your account mix, which sets your taxes, which sets your number."
  );
  X("depplay", "0");
  chk("Replay this chain walks the path", (ov().match(/class="depw"/g) || []).length === 5);
  X("close");
  c.spends.forEach(r => (r.s = true));
  save();
  render();
  let h = app();
  chk(
    "when a part fills in, the chain replays from that part in one line",
    !!DEPX.line &&
      DEPX.line.txt.indexOf("Your budget sets your retirement spending") === 0 &&
      h.includes('class="depline"') &&
      (h.match(/class="depw"/g) || []).length === 5 &&
      h.includes("Don't show this again") &&
      h.includes("Got it")
  );
  chk(
    "one line only, and only one banner",
    (h.match(/class="depline"/g) || []).length === 1 && DEPX.line.txt.split(".").length === 2
  );
  X("depok");
  chk("Got it puts it away", !DEPX.line && !app().includes('class="depline"'));
  c.x.taxPct = 22;
  save();
  render();
  chk(
    "a part in the middle replays from there up",
    (!!DEPX.line && DEPX.line.txt === "Your taxes sets your number.".replace("taxes sets", "taxes sets")) ||
      DEPX.line.txt === "Your taxes sets your number."
  );
  X("depoff");
  chk("the off switch is remembered", depX(c).off === true && !DEPX.line);
  delete c.x.taxPct;
  save();
  render();
  c.x.taxPct = 22;
  save();
  render();
  chk("and nothing replays while it is off", !DEPX.line && !app().includes('class="depline"'));
  X("dep");
  chk("the switch can be turned back on from the view", ov().includes('data-a="deptog"') && ov().includes(">Off<"));
  X("deptog");
  chk("back on", depX(c).off === false);
  X("close");
  if (hadPk) PKSET(PK1, true);
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  DEPX.line = null;
  closeSheet();
  save();
  go("home");
}
