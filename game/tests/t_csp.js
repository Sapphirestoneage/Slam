// ---------- Conscious Spending Plan and the money audit score ----------
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    R = r => Object.assign({ s: true, cf: 2 }, r),
    mk = o => Object.assign(newChar(), { led: true, placed: true, age: 30, ret: 60 }, o);
  const a = mk({
    name: "Ada",
    take: 4000,
    incs: [R({ k: "A main job", amt: 4000 })],
    spends: [
      R({ k: "Home", amt: 1700 }),
      R({ k: "Food", amt: 500 }),
      R({ k: "Getting around", amt: 300 }),
      R({ k: "Bills and subscriptions", amt: 300 }),
      R({ k: "Fun and everything else", amt: 600 }),
    ],
    cashes: [R({ k: "Checking", amt: 900 })],
    invs: [R({ k: "401k", amt: 5000 })],
    debts: [R({ k: "Store card", amt: 120, high: true })],
  });
  G.demo = false;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("money");
  const c = C();
  chk(
    "My Money has two slim doors with buttons",
    app().includes('data-a="csp"') &&
      app().includes('data-a="audit"') &&
      app().includes("Spending plan") &&
      app().includes("Audit score") &&
      clean(app())
  );
  let S = cspCalc(c);
  chk(
    "buckets: fixed is needs, fun is fun, the rest is kept",
    S.B[0].amt === 2800 &&
      S.B[S.B.length - 1].amt === 600 &&
      S.k === 600 &&
      Math.round(S.B[0].pct) === 70 &&
      S.st === "Close" &&
      !S.guess
  );
  X("csp");
  let o = ov();
  chk(
    "opens with three rows until the split is known, a question with tap chips, and the credit",
    W.kind === "csp" &&
      (o.match(/data-a="cspopen"/g) || []).length >= 3 &&
      o.includes("Investing and saving goals") &&
      (o.match(/data-a="cspinv"/g) || []).length === 5 &&
      o.includes("Ramit Sethi's book I Will Teach You To Be Rich") &&
      !o.includes("<input") &&
      clean(o),
    junk(o)
  );
  chk(
    "one main button, and it points at the bucket to look at first",
    (o.match(/class="primary[^"]*"/g) || []).length === 1 &&
      o.includes("Look here first") &&
      o.includes("Open Fixed costs")
  );
  chk(
    "the guide shows as a range and a verdict in words",
    o.includes("Guide: 50 to 60%") && o.includes("A bit above the guide") && o.includes("gloss:csp")
  );
  X("cspinv", "0.5");
  o = ov();
  S = cspCalc(c);
  chk(
    "one tap splits kept into investments and savings goals",
    cspX(c).inv === 0.5 &&
      S.split &&
      S.B.length === 4 &&
      S.B[1].amt === 300 &&
      S.B[2].amt === 300 &&
      o.includes("Investments") &&
      o.includes("Savings goals") &&
      !(o.match(/data-a="cspinv"/g) || []).length
  );
  X("cspopen", "fixed");
  o = ov();
  chk(
    "a bucket opens to what is in it, the guide in dollars, why, and what a change does",
    W.open === "fixed" &&
      o.includes("The guide for you:") &&
      o.includes("$2,000 to $2,400") &&
      o.includes("Why it matters:") &&
      o.includes("What a change does:") &&
      o.includes("moves it from 70% to 68%") &&
      o.includes("Open my spending") &&
      o.includes("gloss:cspfixed") &&
      o.includes(">Home<")
  );
  X("cspopen", "inv");
  o = ov();
  chk(
    "only one bucket is open at a time",
    W.open === "inv" &&
      (o.match(/class="tile stack cpdet"/g) || []).length === 1 &&
      o.includes("Change how I split what I keep")
  );
  X("cspredo");
  o = ov();
  chk(
    "the split can be changed any time",
    (o.match(/data-a="cspinv"/g) || []).length === 5 && o.includes('class="chip on" data-a="cspinv" data-v="0.5"')
  );
  X("cspinv", "1");
  chk("changed", cspX(c).inv === 1 && cspCalc(c).B[2].amt === 0);
  X("cspopen", "inv");
  chk("tapping the open one closes it", W.open === null);
  // a guess gets no verdict
  const b = mk({ name: "Bo", led: false, take: 3000, spend: 2500, spends: [], incs: [] });
  G.chars.push(b);
  G.active = n0 + 1;
  save();
  X("csp");
  o = ov();
  chk(
    "a guess shows the picture with no verdict and one button to make it real",
    cspCalc(C()).guess &&
      o.includes("no verdict yet") &&
      o.includes("No verdict yet") &&
      !o.includes("Look here first") &&
      !o.includes("above the guide") &&
      o.includes("Make my numbers real") &&
      !(o.match(/data-a="cspinv"/g) || []).length &&
      o.includes("A guess so far") &&
      (o.match(/class="primary[^"]*"/g) || []).length === 1 &&
      clean(o),
    junk(o)
  );
  // more out than in
  const d2 = mk({
    name: "Cy",
    take: 3000,
    incs: [R({ k: "A main job", amt: 3000 })],
    spends: [R({ k: "Home", amt: 2000 }), R({ k: "Food", amt: 700 }), R({ k: "Fun and everything else", amt: 600 })],
    cashes: [R({ k: "Checking", amt: 100 })],
    invs: [],
    debts: [],
  });
  G.chars.push(d2);
  G.active = n0 + 2;
  syncAll(d2);
  save();
  X("csp");
  o = ov();
  chk(
    "more out than in: says so plainly, no split question, nothing red",
    cspCalc(C()).over === 300 &&
      o.includes("more goes out each month than comes in") &&
      !(o.match(/data-a="cspinv"/g) || []).length &&
      !/red|#f00|#e5|crimson/i.test(o.replace(/shared|covered|credit|hundred/gi, "")) &&
      clean(o)
  );
  // ----- audit score
  G.active = n0;
  save();
  const A = audCalc(C());
  chk(
    "score counts only real parts, 1 for looking plus 9 shared",
    A.cnt.length >= 3 &&
      A.score === Math.round((1 + (9 * A.got) / A.cnt.length) * 10) / 10 &&
      A.score >= 1 &&
      A.score <= 10 &&
      A.rows.length === 6,
    JSON.stringify([A.cnt.length, A.got, A.score])
  );
  chk(
    "parts that need an answer or are a guess are left out, not zeroed",
    A.rows.filter(r => r.pts == null).every(r => r.why) && A.rows.find(r => r.id === "dti").pts === null
  );
  X("audit");
  o = ov();
  chk(
    "audit sheet: big score, status, the first move with its result, six tappable parts",
    W.kind === "audit" &&
      o.includes("out of 10") &&
      o.includes("How to raise it the most") &&
      o.includes("Do this first:") &&
      /Your score goes from \d+\.\d to about \d+\.\d/.test(o) &&
      (o.match(/class="rowbtn aurow"/g) || []).length === 6 &&
      (o.match(/class="primary[^"]*"/g) || []).length === 1 &&
      o.includes("gloss:audit") &&
      clean(o),
    junk(o)
  );
  chk(
    "the status is spelled out, never a bare Close",
    o.includes("Close, not exact") && !o.includes('<span class="pill">Close</span>')
  );
  chk(
    "says whose idea it is and whose formula",
    o.includes("Caleb Hammer's show Financial Audit") &&
      o.includes("SLAM's own, not his") &&
      o.includes("Show the math") &&
      o.includes("never counts against you")
  );
  chk(
    "the score is remembered by day for the admin and for next time",
    cspX(C()).au.length === 1 && cspX(C()).au[0].s === A.score
  );
  chk("the lowest part comes first in the order that matters", A.low && A.next > A.score);
  {
    const MV = audMoves(C(), A);
    chk(
      "one move per part below full, biggest gain first, each with dollars and a new score",
      MV.length === A.cnt.filter(r => r.pts < 1).length &&
        MV.every((m, i) => i === 0 || MV[i - 1].gain >= m.gain) &&
        MV.every(m => m.to > A.score && m.to <= 10 && /\$/.test(m.t + m.sub)) &&
        MV[0].id === "highdebt" &&
        MV[0].delta === 1,
      JSON.stringify(MV.map(m => [m.id, m.gain, m.eff, m.t]))
    );
    chk(
      "the first move is the banner, the rest stay folded behind one button",
      o.includes("Pay off your high-interest debt") &&
        o.includes("See every move, biggest first") &&
        !o.includes('class="rowbtn audmove"')
    );
    X("audmore");
    o = ov();
    chk(
      "unfolded: numbered moves with their gain, the parts still to make real, and what all of it adds up to",
      (o.match(/class="rowbtn audmove"/g) || []).length === MV.length - 1 + A.rows.filter(r => r.pts == null).length &&
        o.includes("2. ") &&
        /\+\d\.\d/.test(o) &&
        o.includes("real</b>") &&
        o.includes("Do all " + MV.length) &&
        o.includes("Hide the other moves") &&
        (o.match(/class="primary[^"]*"/g) || []).length === 1 &&
        clean(o),
      junk(o)
    );
    // each dollar target really does lift its part one level
    const c0 = C(),
      sim = f => {
        const x = JSON.parse(JSON.stringify(c0));
        f(x);
        syncAll(x);
        return audCalc(x);
      },
      pt = (B, id) => B.rows.find(r => r.id === id).pts,
      num = t => +((t.match(/\$([\d,]+)/) || [])[1] || "0").replace(/,/g, "");
    MV.forEach(m => {
      const was = pt(A, m.id);
      let B = null;
      if (m.id === "highdebt")
        B = sim(x =>
          x.debts.forEach(r => {
            if (r.high) r.amt = 0;
          })
        );
      else if (m.id === "cushion")
        B = sim(x => {
          x.cashes[0].amt = num(m.t);
        });
      else if (m.id === "save")
        B = sim(x => {
          const r = x.spends.find(q => /Fun/.test(q.k));
          r.amt -= num(m.t);
        });
      else if (m.id === "home")
        B = sim(x => {
          const r = x.spends.find(q => q.k === "Home");
          r.amt -= num(m.t);
        });
      else if (m.id === "invx")
        B = sim(x => {
          x.invs[0].amt = num(m.t);
        });
      if (B) chk("the " + m.id + " target lifts that part", pt(B, m.id) > was, JSON.stringify([m.t, was, pt(B, m.id)]));
    });
    X("audmore");
    chk("folds again", !ov().includes('class="rowbtn audmove"'));
  }
  X("metric", A.low.id);
  chk("tapping a part opens that key number", W.kind === "metric" && W.id === A.low.id);
  G.active = n0 + 1;
  save();
  const A2 = audCalc(C());
  X("audit");
  o = ov();
  chk(
    "all guesses: no score, says why, one place to start",
    A2.score === null &&
      o.includes("No score yet") &&
      o.includes("A score built on guesses would not mean anything") &&
      o.includes("Make it real") &&
      (o.match(/class="primary[^"]*"/g) || []).length === 1 &&
      clean(o),
    junk(o)
  );
  // full marks
  const e = mk({
    name: "Di",
    age: 30,
    take: 6000,
    incs: [R({ k: "A main job", amt: 6000, cf: 3 })],
    spends: [
      R({ k: "Home", amt: 1500, cf: 3 }),
      R({ k: "Food", amt: 500, cf: 3 }),
      R({ k: "Fun and everything else", amt: 1500, cf: 3 }),
    ],
    cashes: [R({ k: "Savings", amt: 30000, cf: 3 })],
    invs: [R({ k: "401k", amt: 200000, cf: 3 })],
    debts: [],
  });
  G.chars.push(e);
  G.active = n0 + 3;
  syncAll(e);
  save();
  const A3 = audCalc(C());
  X("audit");
  o = ov();
  chk(
    "a strong picture scores high and gets no made-up to-do",
    A3.score >= 8 && (A3.low ? true : o.includes("Every counted part is at full points")),
    JSON.stringify([A3.score, A3.cnt.map(r => r.id + ":" + r.pts)])
  );
  X("csp");
  o = ov();
  chk("nothing above the guide means nothing to fix", !o.includes("above the guide") || o.includes("Look here first"));
  X("compare");
  chk("the Compare tool still opens its own screen", W.kind === "compare" && W.picks && W.picks.length === 2);
  X("close");
  // ----- one roof (the list itself is covered in t_ideas.js)
  G.active = n0;
  save();
  go("money");
  chk(
    "My Money has a third slim door to the list",
    app().includes('data-a="roof"') && app().includes("Famous money ideas")
  );
  {
    const L = rfRows(C()).filter(x => x.old);
    chk("the first rows are still there, each with a region", L.length >= 12 && L.every(x => x.r.g));
    chk(
      "rows show your own number where there is one",
      L.some(x => x.v === "Needs, fun, saving: 70 / 15 / 15") && L.some(x => /out of 10/.test(x.v))
    );
    L.forEach(x => {
      X("roof");
      let ok = true,
        why = "";
      try {
        if (x.r.m) X("metric", x.r.m);
        else X(x.r.a);
        const h = ov();
        ok = W && W.kind !== "roof" && h.length > 200 && clean(h);
        why = junk(h);
      } catch (e) {
        ok = false;
        why = String(e).slice(0, 80);
      }
      chk("roof row opens: " + x.r.n, ok, why);
    });
    G.active = n0 + 3;
    save();
    chk("no debts: the snowball row is left out, never shown locked", !rfAll(C()).some(x => x.r.a === "debtplan"));
    chk("no em dashes in the list", !/\u2014/.test(JSON.stringify(RF_LIST) + String(rfSheet)));
  }
  chk(
    "glossary and menu know both",
    GLOSS.csp &&
      GLOSS.audit &&
      GLOSS.cspfixed &&
      GLOSS.cspfun &&
      MENU.some(m => m[1] === "csp") &&
      MENU.some(m => m[1] === "audit") &&
      MENU.some(m => m[1] === "roof") &&
      GLOSS.roof &&
      GLOSS.audmoves
  );
  chk(
    "no em dashes in the new words",
    !/\u2014/.test(
      JSON.stringify(CSP_B) +
        JSON.stringify(GLOSS.csp) +
        JSON.stringify(GLOSS.audit) +
        String(cspSheet) +
        String(audSheet)
    )
  );
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  closeSheet();
  save();
  go("home");
}
