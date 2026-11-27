/* ============================================================================
   SLAM the Game, test: tests/what-it-could-be.js
   PURPOSE     Examine What it is / What it could be (run A, Nov 27 2026), steps 0 to 3: the one opening of
               a new player (four answers by taps, the first number in 5 taps or fewer), "What it is" from
               the engine, the two pinned numbers that start equal, the count of a cost or an income, the
               layer chart (in every year the layers plus the gap equal the line; a layer that is off never
               raises what is covered; 5-year bars and single years), the rest of setup behind the flow, and
               a returning player on Home.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. Three made-up players.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: core/paylayers.js, features/couldbe.js, account/door.js,
               screens/ui.js (ACT.start, openSetup, finishSetupBase), screens/dash.js (dkBars, stacked).
   ========================================================================= */
{
  const fs = require("fs"),
    path = require("path"),
    crypto = require("crypto");
  const G0 = clone(G),
    text = h =>
      h
        .replace(/<svg[\s\S]*?<\/svg>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " "),
    near = (a, b, tol) => Math.abs(a - b) <= (tol || 0.01);
  const src = fs.readFileSync(path.join(GAME_DIR, "..", "js", "math", "paylayers.js"), "utf8"),
    copy = fs.readFileSync(path.join(GAME_DIR, "core", "paylayers.js"), "utf8");
  chk(
    "core/paylayers.js is a current copy of js/math/paylayers.js (node tools/game_paylayers_build.mjs)",
    copy.includes("SOURCE-HASH  " + crypto.createHash("sha256").update(src).digest("hex").slice(0, 16))
  );

  /* ---- 1. the one opening of a new player ---- */
  G = clone(G0);
  G.demo = true;
  W = null;
  X("start");
  let h = ov();
  chk(
    "a new player: Start opens the flow at its first question",
    W && W.kind === "cb" && W.step === "entry" && /How old are you\?/.test(h)
  );
  chk(
    "a new player sees only one opening: no setup round and no payoff reveal first",
    !/Question 1 of 5|Getting started|Am I okay\? · page|Here's where you stand/.test(h)
  );
  chk(
    "the entry asks by range chips, with I know it, and no box until it is asked for",
    /data-a="cbset"/.test(h) && /I know it/.test(h) && !/<input/.test(h)
  );
  chk(
    "Back and the line of trust.js are on the entry",
    h.includes(TRUST_LINE) && (h.match(/data-fid="cb:trust"/g) || []).length === 1
  );
  X("cbset", "", "", { q: "age", i: 1 });
  chk(
    "one question at a time: the second is spending",
    W.q === 1 && /spend in a month/.test(ov()) && /Back one question/.test(ov())
  );
  X("cbset", "", "", { q: "spend", i: 2 });
  /* an exact amount is optional: I know it opens the box in the same spot */
  X("cbknow", "", "", { q: "inv" });
  chk(
    "I know it opens a number box with a border and a label",
    /<input type="text" id="cbIn"/.test(ov()) && /The amount, in dollars/.test(ov())
  );
  W.o.cbIn = "60,000";
  X("cbuse", "", "", { q: "inv" });
  chk(
    "the typed amount is taken, and the fourth question is next",
    W.q === 3 && W.o.a.inv.v === 60000 && W.o.a.inv.cf === 3
  );
  chk("no profile is made before the fourth answer", G.demo === true);
  X("cbset", "", "", { q: "save", i: 4 });
  h = ov();
  chk("the first number comes in 5 taps or fewer, with the tap on Start", cbTaps() <= 5 && W.step === "is", cbTaps());
  chk("the profile is the player's own now", !G.demo && G.chars.length === 1);
  let c = C(),
    d = derive(c);
  chk(
    "the four answers are in the rows setup writes: age, income, spending, invested",
    c.age === 27 &&
      c.spend === 3500 &&
      c.take === 5000 &&
      c.inv === 60000 &&
      c.spends.length === SPEND_K.length &&
      c.invs.length === 1,
    [c.age, c.spend, c.take, c.inv]
  );
  chk(
    "a tapped range is a Guess and the typed amount is known",
    c.spends.every(r => !r.s) && !c.incs[0].s && c.invs[0].s && c.invs[0].cf === 3 && cbState(c) === "Guess"
  );
  let N = cbNumbers(c, d);
  chk(
    "What it is = spending x 25, the engine's own number",
    N.is.target === d.fiBase && near(N.is.target, c.spend * 12 * 25)
  );
  chk("its age is the engine's own (yearsTo at today's pace)", N.is.age === c.age + yearsTo(c.inv, d.save, d.fiBase), [
    N.is.age,
    yearsTo(c.inv, d.save, d.fiBase),
  ]);
  chk(
    "with nothing counted the two numbers are equal",
    N.could.target === N.is.target && N.could.age === N.is.age && N.same && !N.counted
  );
  chk(
    "the screen pins both numbers and says they are equal",
    (h.match(/data-cbn=/g) || []).length === 2 &&
      h.includes(money(N.is.shown)) &&
      /The two are equal until you count something/.test(h) &&
      h.includes(kitPill("Guess"))
  );
  chk(
    "What it is has Show the math and no verdict",
    /Show the math/.test(h) &&
      /x 25 =/.test(h) &&
      !/\b(good|bad|great|poor|behind|mistake|off track|failed)\b/i.test(text(h))
  );
  chk("the FI number is a term that can be tapped", /data-k="term:cbfi"/.test(h) && !!GLOSS.cbfi);
  chk(
    "What it is: clean, one trust line, no long dash",
    clean(h) && (h.match(/data-fid="cb:trust"/g) || []).length === 1 && !h.includes(String.fromCharCode(0x2014)),
    junk(h)
  );

  /* ---- 2. the chart ---- */
  X("cbgo", "next");
  h = ov();
  let K = cbChart(c);
  chk(
    "Next opens the chart with the two numbers still pinned",
    W.step === "chart" && (h.match(/data-cbn=/g) || []).length === 2
  );
  chk(
    "the chart is the kit's stacked bars, 5 years a bar",
    /<svg class="dkchart dkstack"/.test(h) && K.bars.length === Math.ceil((LY_END - c.age + 1) / 5) && K.bars[0].n === 5
  );
  chk("the ages run from today to 95", K.rows[0].age === c.age && K.rows[K.rows.length - 1].age === 95);
  chk(
    "four layers by default, each chip a color square and a name",
    K.layers.map(l => l.id).join() === "work,inv,ss,other" &&
      (h.match(/class="chip cbchip on"[^>]*>\s*<i class="cbsq"/g) || []).length === 4 &&
      />Social Security</.test(h)
  );
  const every = (rows, why) =>
    rows.every(
      r =>
        near(r.work + r.tax + r.pre + r.roth + r.hsa + r.ss + r.other + r.gap, r.line) &&
        near(r.needs + r.wants + r.health + r.wtax, r.line) &&
        r.gap >= 0
    );
  chk("for every year, the layers plus the gap equal the spending line", every(K.rows));
  chk(
    "the same holds for each 5-year bar",
    K.bars.every(b => near(b.work + b.inv + b.ss + b.other + b.gap, b.line))
  );
  chk(
    "the two costs are their own labeled parts of the line",
    K.sums.health.years > 0 &&
      K.sums.wtax.years > 0 &&
      /Health insurance before 65/.test(h) &&
      /Tax on traditional withdrawals/.test(h)
  );
  chk(
    "health insurance runs from the year work stops until 65",
    K.sums.health.from === K.p.stop && K.sums.health.to === 64,
    [K.sums.health.from, K.sums.health.to, K.p.stop]
  );
  chk(
    "its typical price is the dated benchmark row, marked a Guess",
    K.health.typ && K.health.year === BP_REF.cliff.aca.benchmarkUs * 12 && /Typical, a Guess/.test(h)
  );
  chk(
    "the needs are the FAT share of spending",
    near(K.p.needsShare, (1400 + 700 + 530) / 3500, 0.001),
    K.p.needsShare
  );
  chk(
    "one plain line when steady income covers the needs",
    K.needsAge === 67
      ? /From 67, your needs are covered without touching investments\./.test(h)
      : !/your needs are covered/.test(h),
    K.needsAge
  );
  chk(
    "the chart screen: clean, Show the math, one trust line",
    clean(h) && /Show the math/.test(h) && (h.match(/data-fid="cb:trust"/g) || []).length === 1,
    junk(h)
  );
  /* a bar opens into single years, with a visible Back */
  X("cbzoom", String(K.bars[5].from));
  h = ov();
  chk(
    "a tap on a bar opens its single years",
    W.step === "chart" && W.n === K.bars[5].from && h.includes("year by year") && cbChart(c, W.n).zoom.length === 5
  );
  chk(
    "the single years have a visible Back, and Earlier and Later",
    /‹ Back to all years/.test(h) && /Earlier/.test(h) && /Later/.test(h)
  );
  chk("a color in a single year opens its layer", /<rect[^>]*data-a="cblayer" data-v="inv"/.test(h));
  X("cbzoom", "");
  chk("Back shows all years again", W.n === undefined && /5 years a bar/.test(ov()));

  /* ---- 3. a layer that is off never raises what is covered ---- */
  const base = lyCoverage(K.rows);
  let never = true,
    ident = true;
  ["work", "inv", "tax", "pre", "roth", "hsa", "ss", "other"].forEach(id => {
    cbToggle(id);
    const K2 = cbChart(c),
      cov = lyCoverage(K2.rows);
    if (cov.share > base.share + 1e-9) never = false;
    if (K2.rows.some((r, i) => r.gap < K.rows[i].gap - 0.01)) never = false;
    if (!every(K2.rows)) ident = false;
    cbToggle(id);
  });
  chk("switching a layer off never raises coverage, for each layer", never);
  chk("with a layer off, the layers plus the gap still equal the line", ident);
  X("cbtog", "work");
  h = ov();
  K = cbChart(c);
  chk(
    "Work off: the chip reads Off, the layer is gone, and the gap has its dollars",
    /data-v="work" aria-pressed="false"/.test(h) &&
      K.sums.work.years === 0 &&
      K.gaps.length > 0 &&
      /Not covered yet<\/b> ages? \d+/.test(h) &&
      h.includes(money(Math.round(K.gaps[0].avg)))
  );
  chk("the gap is hatched on the chart", /class="dkgap"/.test(h) && /url\(#dkhatch\)/.test(h));
  X("cbtog", "work");
  X("cbsplit");
  K = cbChart(c);
  chk(
    "Split by account: taxable, traditional, Roth and HSA as layers",
    K.layers.map(l => l.id).join() === "work,tax,pre,roth,hsa,ss,other" &&
      />Traditional</.test(ov()) &&
      />Roth</.test(ov())
  );
  X("cbsplit");

  /* ---- 4. counting moves What it could be ---- */
  X("cblayer", "ss");
  h = ov();
  chk(
    "a layer's sheet: what it is, the years it pays for, which expenses it covers, Show the math",
    /What it is/.test(h) &&
      /The years it pays for/.test(h) &&
      /Ages 67 to 95/.test(h) &&
      /Which expenses it covers/.test(h) &&
      /Needs first/.test(h) &&
      /Show the math/.test(h)
  );
  chk(
    "the layer sheet keeps the two numbers and the trust line",
    (h.match(/data-cbn=/g) || []).length === 2 && (h.match(/data-fid="cb:trust"/g) || []).length === 1
  );
  const r1 = cbCount("ss", { share: 1 });
  chk(
    "counting Social Security lowers What it could be and brings the age closer",
    r1.after.could.target < r1.after.is.target &&
      r1.after.could.age <= r1.after.is.age &&
      r1.receipt.off > 0 &&
      r1.receipt.months >= 0,
    r1.receipt
  );
  chk("What it is does not move", r1.after.is.target === r1.before.is.target && r1.after.is.age === r1.before.is.age);
  cbToggle("ss");
  N = cbNumbers(c);
  chk(
    "a layer that is switched off is not counted: the two are equal again",
    N.could.target === N.is.target && N.could.age === N.is.age
  );
  cbToggle("ss");
  cbCount("ss", false);
  const r2 = cbCount("health", {});
  h = ov();
  chk(
    "a counted cost can raise What it could be above What it is",
    r2.after.could.target > r2.after.is.target && r2.after.above && r2.after.raisedBy.join() === "health"
  );
  X("cbgo", "chart");
  h = ov();
  chk(
    "and the screen then says which cost is the cause",
    /Above What it is, because you counted health insurance before 65\./.test(h)
  );
  cbCount("wtax", {});
  N = cbNumbers(c);
  chk(
    "both costs counted: both are named",
    N.raisedBy.join() === "health,wtax" &&
      /health insurance before 65 and tax on traditional withdrawals/.test(cbTop(c))
  );
  cbCount("health", false);
  cbCount("wtax", false);
  /* could-be is never above what-it-is unless a cost is the cause */
  let above = false;
  [
    {},
    { ss: { share: 1 } },
    { ss: { share: 0.5 } },
    { other: {} },
    { shape: { bands: [{ from: 75, f: 0.8 }] } },
    {
      ss: {},
      other: {},
      shape: {
        bands: [
          { from: 70, f: 0.9 },
          { from: 85, f: 0.7 },
        ],
      },
    },
  ].forEach(cnt => {
    cbStore(c).count = cnt;
    const n = cbNumbers(c);
    if (n.could.target > n.is.target + 0.5 || (n.could.age != null && n.is.age != null && n.could.age > n.is.age))
      above = true;
  });
  cbStore(c).count = {};
  chk("with no cost counted, What it could be is never above What it is", !above);
  /* the health price by taps */
  X("cblayer", "health");
  h = ov();
  chk(
    "the health sheet asks for the price by range chips, and names the dated source",
    /data-a="cbset" data-q="health"/.test(h) && /KFF, Marketplace Average Monthly Benchmark Premiums/.test(h)
  );
  X("cbset", "", "", { q: "health", i: 1 });
  chk(
    "a tapped price replaces the typical one",
    cbHealth(c).typ === false && cbHealth(c).year === 450 * 12 && cbHealth(c).st === "Close",
    cbHealth(c)
  );
  delete c.x.cb.health;

  /* ---- 5. the last screen, the rest of setup, Next Steps ---- */
  X("cbgo", "end");
  h = ov();
  chk(
    "the last screen has both numbers and no dead end",
    W.step === "end" &&
      (h.match(/data-cbn=/g) || []).length === 2 &&
      /data-a="cbsave"/.test(h) &&
      /data-a="cbshare"/.test(h) &&
      /data-a="flag"/.test(h) &&
      /data-a="gohome"/.test(h) &&
      h.includes(TRUST_LINE)
  );
  chk(
    "a later file can add a step before the last screen",
    (cbStepAdd("demo_step", () => head("x", "y") + cbTop(C()) + cbFoot()),
    CB_STEPS.findIndex(s => s.id === "demo_step") > 0 &&
      CB_STEPS.findIndex(s => s.id === "demo_step") < CB_STEPS.findIndex(s => s.id === "reveal") &&
      CB_STEPS[CB_STEPS.length - 1].id === "end")
  );
  CB_STEPS.splice(
    CB_STEPS.findIndex(s => s.id === "demo_step"),
    1
  );
  X("gohome");
  X("tab", "plan");
  chk(
    "Next Steps, after the flow, has the rest of setup",
    !SH && tab === "plan" && /data-a="cbrest"/.test(app()) && /Finish setup: five short rounds/.test(app())
  );
  X("cbrest");
  chk(
    "the rest of setup is the spiral rounds, with the age and the amounts kept",
    W &&
      W.kind === "setup" &&
      W.mode === "new" &&
      W.cbRest &&
      W.o.age === 27 &&
      W.o.invs[0].amt === 60000 &&
      W.o.x.cb.a.spend.v === 3500
  );
  closeSheet();
  chk("leaving the rest of setup keeps the profile", !G.demo && C().age === 27 && C().inv === 60000);

  /* ---- 6. a returning player ---- */
  chk("a returning player: the flow does not open by itself", cbStart() === false && !SH);
  X("start");
  chk("their Start is Change my answers, as before", W && W.kind === "setup" && W.mode === "edit");
  closeSheet();
  X("cb");
  chk(
    "from the Menu the flow skips the entry: the profile has the answers",
    W.kind === "cb" && W.step === "is" && MENU.some(m => m[1] === "cb")
  );
  X("cbgo", "entry");
  X("cbset", "", "", { q: "age", i: 2 });
  X("cbset", "", "", { q: "spend", i: 3 });
  X("cbset", "", "", { q: "inv", i: 0 });
  X("cbset", "", "", { q: "save", i: 0 });
  c = C();
  N = cbNumbers(c);
  chk(
    "Change my four answers rewrites the rows of this flow's profile",
    c.age === 32 && c.spend === 4500 && c.inv === 0 && c.take === 4500 && W.step === "is"
  );
  chk(
    "nothing saved a month: the age is open, said without blame",
    N.is.age === null && /date is still open/.test(ov()) && /not at this pace yet/.test(ov()) && clean(ov()),
    junk(ov())
  );
  closeSheet();

  /* ---- 7. three made-up players, on full profiles ---- */
  const R0 = r => Object.assign({ s: true, cf: 3 }, r),
    mk = o => {
      const p = Object.assign(
        newChar(),
        { led: true, placed: true, confEra: 9, peakEra: 0, muscles: {}, skills: {}, streak: 0, hist: [] },
        o
      );
      syncAll(p);
      return p;
    },
    sp = t => SPEND_K.map((k, i) => R0({ k, amt: Math.round(t * SPLIT[i]) }));
  const people = {
    "27, renting, $60K invested": mk({
      age: 27,
      home: "Renting",
      rel: "Single by choice",
      work: "Established",
      incs: [R0({ k: "A main job", amt: 4600 })],
      spends: sp(3400),
      cashes: [R0({ k: "Checking", amt: 4000 })],
      invs: [R0({ k: "Retirement plan at work", amt: 45000 }), R0({ k: "IRA or Roth IRA", amt: 15000 })],
    }),
    "38, a couple, a match and a mortgage": mk({
      age: 38,
      home: "Owning",
      rel: "Married",
      work: "Established",
      match: "yes",
      incs: [R0({ k: "A main job", amt: 6200 }), R0({ k: "A main job", amt: 4300, partner: true })],
      spends: sp(7400),
      cashes: [R0({ k: "Savings", amt: 22000 })],
      invs: [
        R0({ k: "Retirement plan at work", amt: 210000 }),
        R0({ k: "IRA or Roth IRA", amt: 40000 }),
        R0({ k: "Other investments", amt: 25000 }),
        R0({ k: "HSA", amt: 9000 }),
      ],
      x: { home: { pmt: 2300, yrs: 24 } },
    }),
    "31, self-employed, uneven income": mk({
      age: 31,
      home: "Renting",
      rel: "Single by choice",
      work: "Self-employed",
      steady: "It varies",
      incs: [R0({ k: "My own business", amt: 5200 })],
      low: 2600,
      spends: sp(3900),
      cashes: [R0({ k: "Savings", amt: 9000 })],
      invs: [R0({ k: "IRA or Roth IRA", amt: 28000 }), R0({ k: "Other investments", amt: 6000 })],
    }),
  };
  Object.keys(people).forEach(name => {
    G = Object.assign(clone(G0), { chars: [people[name]], active: 0, demo: false });
    const p = C(),
      dd = derive(p),
      n = cbNumbers(p, dd),
      k = cbChart(p);
    chk(
      name + ": What it is is the engine's number and age",
      n.is.target === dd.fiBase &&
        n.is.age === (yearsTo(p.inv, dd.save, dd.fiBase) == null ? null : p.age + yearsTo(p.inv, dd.save, dd.fiBase))
    );
    chk(name + ": with nothing counted the two are equal", n.could.target === n.is.target && n.could.age === n.is.age);
    chk(
      name + ": the layers plus the gap equal the line in every year",
      every(k.rows) && k.rows.length === 95 - p.age + 1
    );
    const b0 = lyCoverage(k.rows);
    let ok = true;
    ["work", "inv", "tax", "pre", "roth", "hsa", "ss", "other"].forEach(id => {
      cbToggle(id);
      const k2 = cbChart(p),
        cv = lyCoverage(k2.rows);
      if (cv.share > b0.share + 1e-9 || !every(k2.rows) || k2.rows.some((r, i) => r.gap < k.rows[i].gap - 0.01))
        ok = false;
      cbToggle(id);
    });
    chk(name + ": a layer off never raises coverage", ok);
    const rs = cbCount("ss", { share: 1 }),
      rh = cbCount("health", {});
    chk(
      name + ": Social Security counted lowers it, a cost counted raises it from there",
      rs.after.could.target < rs.before.could.target && rh.after.could.target > rh.before.could.target,
      [rs.receipt, rh.receipt]
    );
    cbCount("ss", false);
    cbCount("health", false);
    W = { kind: "cb", step: "chart", o: {} };
    sheet(cbSheet);
    chk(name + ": the chart screen is clean", clean(ov()) && /dkstack/.test(ov()), junk(ov()));
    closeSheet();
  });
  {
    G = Object.assign(clone(G0), { chars: [people["38, a couple, a match and a mortgage"]], active: 0, demo: false });
    const p = C(),
      k = cbChart(p);
    chk(
      "the accounts of a full profile are split by their kind",
      k.p.bal.pre === 210000 && k.p.bal.roth === 40000 && k.p.bal.tax === 25000 && k.p.bal.hsa === 9000
    );
    chk(
      "a couple gets the typical price of two adults",
      k.health.adults === 2 && k.health.year === BP_REF.cliff.aca.benchmarkUs * 24
    );
    const B = cbBook(p);
    chk(
      "the spreadsheet has the standard number with its formula",
      B.rows.find(r => r.id === "cb_is").f === "={cb_spend}/{cb_rate}" &&
        near(B.rows.find(r => r.id === "cb_is").v, derive(p).fiBase)
    );
  }
  /* the stacked option of the kit keeps the grouped bars as they were */
  chk(
    "dkBars without the option still draws grouped bars",
    /<svg class="dkchart" viewBox="0 0 320 120"/.test(dkBars([{ l: "Jan", v: [1, 2] }], ["In", "Out"]))
  );
  chk(
    "the built list has the feature, with a probe that passes",
    WB.some(b => /^What it is \/ What it could be/.test(b[1]) && typeof b[3] === "function" && b[3]() === true)
  );
  G = clone(G0);
  W = null;
  SH = null;
  render();
}
