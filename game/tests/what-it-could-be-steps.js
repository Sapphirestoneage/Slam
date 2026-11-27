/* ============================================================================
   SLAM the Game, test: tests/what-it-could-be-steps.js
   PURPOSE     Examine What it is / What it could be (run A, Nov 27 2026), step 4 and the last screen: the
               two strategy steps (the spending shape and Social Security) with Count this, Already doing
               it and Not for me; the drop for this player and the receipt; the presets; the "i" with what
               has to go right and the backup; the dated source of the default shape; the share of Social
               Security in its one home (c.x.ss); the last screen with both numbers, the chart and the
               ways on. The four rules of the run: could-be is never above what-it-is unless a cost is the
               cause, and the screen then says so; with nothing counted the two are equal; in every year
               the layers plus the gap equal the line; a layer that is off never raises coverage.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. Three made-up players.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: core/paylayers.js (lyShapeBands, LY_SHAPE_REF, LY_SS_REF),
               features/couldbe.js (cbWaySets, cbWayPick, cbPreview, cbWayDo, cbWayState, cbWayView,
               cbEndView).
   ========================================================================= */
{
  const G0 = clone(G),
    text = h =>
      h
        .replace(/<svg[\s\S]*?<\/svg>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " "),
    junk = h =>
      (text(h).match(/undefined|NaN|\bnull\b|\u2014/g) || [])
        .concat(text(h).match(/mistake|failed|\bbehind\b|off track/gi) || [])
        .join(","),
    clean = h => !junk(h),
    every = rows =>
      rows.every(
        r =>
          Math.abs(r.work + r.tax + r.pre + r.roth + r.hsa + r.ss + r.other + r.gap - r.line) < 0.01 &&
          Math.abs(r.needs + r.wants + r.health + r.wtax - r.line) < 0.01
      ),
    go = v => X("cbgo", v);

  /* ---- 1. a new player reaches the two steps after the chart ---- */
  G = clone(G0);
  G.demo = true;
  W = null;
  X("start");
  X("cbset", "", "", { q: "age", i: 1 });
  X("cbset", "", "", { q: "spend", i: 2 });
  X("cbset", "", "", { q: "inv", i: 3 });
  X("cbset", "", "", { q: "save", i: 3 });
  chk("the four answers lead to What it is", W.kind === "cb" && W.step === "is" && !G.demo);
  chk(
    "the order of the flow: What it is, the chart, the spending shape, Social Security, the last screen",
    CB_STEPS.map(s => s.id).join() === "is,chart,shape,ss,end"
  );
  let c = C(),
    N = cbNumbers(c);
  chk("with nothing counted the two numbers are equal", N.same && N.could.target === N.is.target && !N.counted);
  go("next");
  go("next");
  let h = ov();
  chk("the first strategy step is the spending shape", W.step === "shape" && /Spending eases as you age/.test(h));
  chk(
    "the step has the three buttons, by their words",
    />Count this</.test(h) &&
      />Already doing it</.test(h) &&
      />Not for me</.test(h) &&
      (h.match(/data-a="cbdo"/g) || []).length === 3
  );
  chk(
    "one line of why, the drop for this player, the two pinned numbers and the line of trust.js",
    /The 25 times rule counts today's spending for every year/.test(h) &&
      /data-fid="cb:drop"/.test(h) &&
      /data-fid="cb:top"/.test(h) &&
      h.includes(TRUST_LINE) &&
      (h.match(/data-fid="cb:trust"/g) || []).length === 1
  );
  chk(
    'the "i" has What has to go right and Backup if it doesn\'t',
    /data-k="term:cbshape"/.test(h) &&
      /What has to go right:/.test(GLOSS.cbshape[1]) &&
      /Backup if it doesn't:/.test(GLOSS.cbshape[1]) &&
      /What has to go right:/.test(GLOSS.cbss[1]) &&
      /Backup if it doesn't:/.test(GLOSS.cbss[1])
  );
  chk(
    "Show the math credits the dated source of the default shape",
    /Show the math/.test(h) &&
      /BLS Consumer Expenditure Survey 2024/.test(text(h)) &&
      /read Nov 6 2026/.test(text(h)) &&
      /Michael Stein/.test(text(h))
  );
  chk("the step is clean: no blame, no long dash, no missing number", clean(h), junk(h));
  chk("Back and Next are on the step", /data-a="cbgo" data-v="prev"/.test(h) && /data-a="cbgo" data-v="next"/.test(h));
  chk("the chart is on the step", /dkstack/.test(h) && /Open the full chart/.test(h));

  /* ---- 2. the default shape is the reference data ---- */
  const sets = cbWaySets("shape");
  chk(
    "the typical shape is the shares of the reference data: 85% from 75, 75% from 85",
    JSON.stringify(sets[0].bands) ===
      JSON.stringify([
        { from: LY_SHAPE_REF.slowGoAge, f: LY_SHAPE_REF.slowGo },
        { from: LY_SHAPE_REF.noGoAge, f: LY_SHAPE_REF.noGo },
      ]) &&
      LY_SHAPE_REF.slowGo === 0.85 &&
      LY_SHAPE_REF.noGo === 0.75 &&
      LY_SHAPE_REF.slowGoAge === 75 &&
      LY_SHAPE_REF.noGoAge === 85
  );
  chk(
    "half as much easing is the middle between the typical shape and no change",
    Math.abs(sets[1].bands[0].f - 0.925) < 1e-9 && Math.abs(sets[1].bands[1].f - 0.875) < 1e-9
  );

  /* ---- 3. the drop, a preset, Count this, the receipt ---- */
  let V = cbPreview(c, "shape");
  chk(
    "the drop for this player is worked out before anything is counted, and nothing is saved",
    V.receipt.off > 0 && V.after.could.target < V.before.could.target && !cbCounted(c).shape,
    V.receipt
  );
  chk("the drop is on the screen in the words of the receipt", text(h).includes(cbReceiptWords(V.receipt)));
  X("cbpick", "0.5");
  const Vh = cbPreview(c, "shape", "0.5");
  chk(
    "a tap on a preset changes the drop and counts nothing yet",
    W.pick === "0.5" && Vh.receipt.off > 0 && Vh.receipt.off < V.receipt.off && !cbCounted(c).shape
  );
  X("cbpick", "1");
  const top0 = (ov().match(/data-cbn="could" data-to="(\d+)"/) || [])[1];
  X("cbdo", "count", "shape");
  h = ov();
  N = cbNumbers(c);
  chk(
    "Count this: the shape is counted, and What it could be is below What it is",
    !!cbCounted(c).shape && cbCounted(c).shape.pre === "1" && N.could.target < N.is.target && !N.above
  );
  chk(
    "the top number changed, and the receipt has the dollars off the target and the months sooner",
    (h.match(/data-cbn="could" data-to="(\d+)"/) || [])[1] !== top0 &&
      /data-fid="cb:receipt"/.test(h) &&
      /Counted\./.test(text(h)) &&
      /off the target/.test(text(h)) &&
      /(months sooner|at the same age|date is still open)/.test(text(h))
  );
  chk(
    "the receipt is the math's: the target without the step less the target with it",
    Math.abs(cbPreview(c, "shape").receipt.off - (N.is.target - N.could.target)) < 0.01
  );
  let K = cbChart(c);
  const at = a => K.rows.find(r => r.age === a);
  chk(
    "the chart follows: the line of a year at 80 is 85% of today's, at 90 it is 75%",
    Math.abs(at(80).needs + at(80).wants - K.p.spend * 0.85) < 0.01 &&
      Math.abs(at(90).needs + at(90).wants - K.p.spend * 0.75) < 0.01 &&
      Math.abs(at(70).needs + at(70).wants - K.p.spend) < 0.01
  );
  chk("with the shape counted, in every year the layers plus the gap equal the line", every(K.rows));
  chk("after an answer, Next is the main button", /class="primary go wide" data-a="cbgo" data-v="next"/.test(h));
  X("cbdo", "no", "shape");
  N = cbNumbers(c);
  chk(
    "Not for me takes it out: the two numbers are equal again, and the screen says Left out",
    !cbCounted(c).shape && N.same && cbWayState(c, "shape").how === "no" && /Left out\./.test(text(ov()))
  );
  X("cbdo", "did", "shape");
  chk(
    "Already doing it counts it too, and says so",
    !!cbCounted(c).shape && cbWayState(c, "shape").how === "did" && /Already yours, and counted\./.test(text(ov()))
  );

  /* ---- 4. Social Security ---- */
  go("next");
  h = ov();
  chk("the second step is Social Security", W.step === "ss" && /Social Security pays part of it/.test(h));
  chk(
    "the estimate is marked Guess, and the screen says where the real figure is",
    /<span class="pill kitst">Guess<\/span>/.test(h) && /statement at ssa\.gov/.test(text(h))
  );
  chk(
    "the presets are three, in this order: Not counting on it, Count part of it, Count all of it",
    (h.match(/data-a="cbpick"/g) || []).length === 3 &&
      (h.match(/data-a="cbpick"[^>]*>([^<]+)</g) || []).map(x => x.replace(/^.*>([^<]+)<$/, "$1")).join("|") ===
        "Not counting on it|Count part of it|Count all of it" &&
      LY_SS_REF.payable === 0.83
  );
  chk(
    "Show the math names the dated source of the 83%",
    /2026 OASDI Trustees Report/.test(text(h)) && /term:cbss/.test(h)
  );
  chk("the step is clean", clean(h), junk(h));
  const before = cbNumbers(c).could.target;
  X("cbpick", "0.83");
  X("cbdo", "count", "ss");
  const t83 = cbNumbers(c).could.target;
  chk(
    "Count part of it: the share is in its one home (c.x.ss), and the number drops",
    c.x.ss === 0.83 && !!cbCounted(c).ss && cbCounted(c).ss.share == null && t83 < before,
    [c.x.ss, before, t83]
  );
  chk("the game's own Social Security reads the same share", passives(c).sh === 0.83);
  X("cbpick", "1");
  const t100 = cbNumbers(c).could.target;
  chk("a new preset on a counted step counts the new share: all of it drops it more", c.x.ss === 1 && t100 < t83);
  K = cbChart(c);
  chk(
    "the chart has the Social Security that is counted, from 67, and every year still adds up",
    K.rows.find(r => r.age === 70).ss > 0 && K.rows.find(r => r.age === 66).ss === 0 && every(K.rows)
  );
  X("cbpick", "0");
  chk(
    "Not counting on it: nothing of it is counted, here or in the rest of the game",
    c.x.ss === 0 && !cbCounted(c).ss && cbWayState(c, "ss").how === "no" && cbNumbers(c).could.target === before
  );
  X("cbdo", "count", "ss");
  chk("Count this with Not counting on it chosen counts nothing", !cbCounted(c).ss && c.x.ss === 0);
  /* a player who chose 75% in setup: Count part of it keeps that share (c.x.ss is its one home) */
  c.x.ss = 0.75;
  chk("a part share from setup is the share of Count part of it", cbWaySets("ss", c)[1].share === 0.75);
  X("cbpick", "0.75");
  X("cbdo", "count", "ss");
  chk("75%, the careful choice of setup, stays and is counted", c.x.ss === 0.75 && !!cbCounted(c).ss);
  /* a layer that is off: Count this switches it on again */
  cbToggle("ss");
  chk("Social Security switched off on the chart is not counted", cbNumbers(c).could.target === before);
  X("cbdo", "count", "ss");
  chk("Count this switches the layer on again", !cbStore(c).off.ss && cbNumbers(c).could.target < before);

  /* ---- 5. the rules of the run, over every preset ---- */
  let above = false,
    sums = true,
    cover = true;
  const sh = cbWaySets("shape"),
    ssS = cbWaySets("ss", c);
  [null].concat(sh).forEach(a => {
    ssS.forEach(b => {
      if (a) cbWayDo("shape", "count", a.v);
      else cbWayDo("shape", "no");
      cbWayDo("ss", "count", b.v);
      const n = cbNumbers(c),
        k = cbChart(c),
        base = lyCoverage(k.rows).share;
      if (n.could.target > n.is.target + 0.5 || (n.could.age != null && n.is.age != null && n.could.age > n.is.age))
        above = true;
      if (!every(k.rows)) sums = false;
      /* at the same age work stops: one layer off, in the math of the chart */
      ["work", "tax", "pre", "roth", "hsa", "ss", "other"].forEach(id => {
        const rows2 = lyYears(Object.assign({}, k.p, { off: Object.assign({}, k.p.off, { [id]: true }) }));
        if (
          lyCoverage(rows2).share > base + 1e-9 ||
          !every(rows2) ||
          rows2.some((r, i) => r.gap < k.rows[i].gap - 0.01)
        )
          cover = false;
      });
      /* in the flow: a layer that is not counted in the number (work, the accounts) keeps the age work stops */
      ["work", "inv"].forEach(id => {
        cbToggle(id);
        const k2 = cbChart(c);
        if (lyCoverage(k2.rows).share > base + 1e-9 || !every(k2.rows)) cover = false;
        cbToggle(id);
      });
    });
  });
  chk("over every preset, with no cost counted, What it could be is never above What it is", !above);
  chk("over every preset, in every year the layers plus the gap equal the line", sums);
  chk("over every preset, a layer that is off never raises coverage", cover);
  cbWayDo("shape", "count", "1");
  cbWayDo("ss", "count", "1");
  cbCount("health", {});
  cbCount("wtax", {});
  N = cbNumbers(c);
  W = { kind: "cb", step: "end", o: {} };
  sheet(cbSheet);
  h = ov();
  chk(
    "a counted cost is named on the screen as the cause, when it is one",
    N.raisedBy.join() === "health,wtax" &&
      (!N.above || /because you counted health insurance before 65 and tax on traditional withdrawals/.test(h))
  );
  cbStore(c).count = { health: {}, wtax: {} };
  N = cbNumbers(c);
  sheet(cbSheet);
  h = ov();
  chk(
    "only the costs counted: What it could be is above What it is, and the screen says which costs",
    N.above &&
      /Above What it is, because you counted health insurance before 65 and tax on traditional withdrawals\./.test(h) &&
      /more on the target/.test(text(h)),
    [N.is.target, N.could.target]
  );
  cbStore(c).count = {};
  cbStore(c).how = {};
  c.x.ss = 1;

  /* ---- 6. the last screen ---- */
  cbWayDo("shape", "count", "1");
  sheet(cbSheet);
  h = ov();
  chk(
    "the last screen has both numbers, the chart and the words of the run",
    W.step === "end" &&
      /data-cbn="is"/.test(h) &&
      /data-cbn="could"/.test(h) &&
      /dkstack/.test(h) &&
      /data-fid="cb:ways"/.test(h) &&
      !/coming/i.test(text(h))
  );
  chk(
    "no dead end: the rest of setup, Next Steps and Home are buttons",
    /data-a="cbrest"/.test(h) && /data-a="cbsteps"/.test(h) && /data-a="gohome"/.test(h)
  );
  chk(
    "it says what is counted, and each step is one tap away",
    /data-a="cbgo" data-v="shape"/.test(h) &&
      /data-a="cbgo" data-v="ss"/.test(h) &&
      /Counted\. Tap to change/.test(text(h)) &&
      /Not counted yet\. Tap to change/.test(text(h)) &&
      /What you counted: .* off the target/.test(text(h))
  );
  chk(
    "the last screen is clean, with Show the math and the line of trust.js",
    clean(h) && /Show the math/.test(h) && h.includes(TRUST_LINE),
    junk(h)
  );
  chk(
    "growth is one rate for the whole chart, the 4% is what is taken out, and the screen says the rest is cushion",
    K.p.grow === R &&
      K.p.take === SWR &&
      K.p.draw === undefined &&
      /Grows 7% a year, for the whole chart\. You take 4%\. The rest is cushion for years the market goes down\./.test(
        text(h)
      ) &&
      /data-fid="cb:cushion"/.test(h)
  );
  {
    const k = cbChart(c),
      i = k.rows.findIndex(r => !r.planWork);
    chk(
      "after work stops the pile grows 7% and pays the year: it ends higher than it started",
      i > 0 &&
        Math.abs(k.rows[i].left - (k.rows[i - 1].left * (1 + R) - k.rows[i].inv)) < 0.01 &&
        k.leftEnd > k.rows[i - 1].left &&
        /is still invested at 95/.test(text(h)),
      [k.rows[i - 1].left, k.rows[i].left, k.leftEnd]
    );
  }
  X("cbgo", "shape");
  chk("a row of the last screen opens its step", W.step === "shape");
  go("end");
  X("cbsteps");
  chk("Next Steps opens from the last screen", !SH && /cbplan/.test(app()));
  const B = cbBook(c);
  chk(
    "the spreadsheet has the shares of the shape and of Social Security",
    B.rows.find(r => r.id === "cb_slow").v === 0.85 &&
      B.rows.find(r => r.id === "cb_nogo").v === 0.75 &&
      B.rows.find(r => r.id === "cb_sspay").v === 0.83
  );

  /* ---- 7. three made-up players ---- */
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
      n0 = cbNumbers(p);
    chk(name + ": nothing counted, the two are equal", n0.same);
    const a = cbPreview(p, "shape"),
      b = cbPreview(p, "ss", "1");
    chk(
      name + ": each step has a drop for this player",
      a.receipt.off > 0 && b.has && b.receipt.off > 0 && (a.receipt.months == null || a.receipt.months >= 0),
      [a.receipt, b.receipt]
    );
    ["shape", "ss"].forEach(id => {
      W = { kind: "cb", step: id, o: {} };
      sheet(cbSheet);
      X("cbdo", "count", id);
      chk(
        name + ": the step " + id + " is clean after Count this",
        clean(ov()) && /Counted\./.test(text(ov())),
        junk(ov())
      );
    });
    const n1 = cbNumbers(p),
      k = cbChart(p);
    chk(
      name + ": both counted, What it could be is lower and never later",
      n1.could.target < n1.is.target && (n1.could.age == null || n1.is.age == null || n1.could.age <= n1.is.age),
      [n1.is, n1.could]
    );
    chk(name + ": every year adds up", every(k.rows));
    W = { kind: "cb", step: "end", o: {} };
    sheet(cbSheet);
    chk(name + ": the last screen is clean", clean(ov()) && /dkstack/.test(ov()), junk(ov()));
    closeSheet();
  });
  chk(
    "the built list says the two steps and the last screen are there",
    WB.some(b => /^What it is \/ What it could be/.test(b[1]) && !/Missing:/.test(b[4]) && b[3]() === true)
  );
  G = clone(G0);
  W = null;
  SH = null;
  render();
}
