/* ============================================================================
   SLAM the Game, test: tests/what-it-could-be-flex-later.js
   PURPOSE     Examine Batch B, phases 2b and 2c (Nov 27 2026), two ways of What it is / What it could be.
               Flexible withdrawals: the rate is the highest one at which guardrails held in the real start
               years as often as the fixed 4% rule; the drop is the number of its own math function; the
               profile holds no rate; a rate that is not above the standard one moves nothing. Money that
               shows up later: a pension and a home loan that is paid off are asked by taps and go to their
               one home (c.x.pen, c.x.home); the drop is the number of its own math function; a counted
               payment that ends lowers the line of the chart from the age it ends. Both have the pattern
               of a strategy step. What it could be is above What it is only when a cost is counted, and
               the screen then says which.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. Made-up players.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: core/paylayers.js (lyNumbers, lyYears, lyReceipt, lyFlex,
               lyEndsAt), features/cbflex.js, features/cblater.js, features/couldbe.js (cbParams, cbCounted,
               cbNumbers, cbChart, cbWays, cbWayState, cbBook), features/ways.js (cmpReal, cmpPlan),
               core/withdraw.js (wayById, wayHistory, wayTolerance), core/engine.js (endsOf, passives).
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
    go = v => X("cbgo", v),
    near = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 0.01 : tol),
    pattern = (h, term) =>
      /data-fid="cb:top"/.test(h) &&
      new RegExp('data-k="term:' + term + '"').test(h) &&
      /data-fid="cb:drop"/.test(h) &&
      /Show the math/.test(h) &&
      /data-a="cbgo" data-v="next"/.test(h) &&
      /data-a="cbgo" data-v="prev"/.test(h) &&
      /data-a="cbgo" data-v="stack"/.test(h) &&
      /data-fid="cb:trust"/.test(h) &&
      text(h).includes(TRUST_LINE);

  /* a new player: the four taps */
  G = clone(G0);
  G.demo = true;
  W = null;
  X("start");
  X("wnskip"); /* What you want (run SLAM-ONBOARD-1): Skip for now */
  X("cbset", "", "", { q: "age", i: 1 });
  X("cbset", "", "", { q: "spend", i: 2 });
  X("cbset", "", "", { q: "inv", i: 3 });
  X("cbset", "", "", { q: "save", i: 3 });
  let c = C();
  const is0 = cbNumbers(c).is;

  /* ---- 1. flexible withdrawals (phase 2b) ---- */
  chk(
    "the two ways are steps of the flow after the tax way, numbered with the others",
    cbWays()
      .map(w => w.id)
      .join()
      .indexOf("taxplan,flex,later") > 0 &&
      /^Way \d+ of \d+$/.test(cbWayNo("flex")) &&
      /^Way \d+ of \d+$/.test(cbWayNo("later"))
  );
  let P = cbFlexPlan(c);
  chk("a new player has a rate above the standard 4%", P.ok && P.applies && P.rate > SWR && P.rate < 0.08, P.rate);
  /* the rate, worked out again here from the rules of core/withdraw.js and the real start years */
  const hist = (id, rate) => {
      const way = wayById(id),
        Q = {
          inv: 50000 / rate,
          monthly: 0,
          age: P.stop,
          ret: P.stop,
          death: LY_END + 1,
          spend: 50000,
          ss: 0,
          pen: null,
          now: 0,
          stock: oddsInputs(c).stock,
          growth: R,
        };
      return wayHistory(cmpReal(cmpPlan(Q, way, P.stop)), wayTolerance(way));
    },
    fixed = hist("steady-4", SWR);
  chk(
    "the test is each real start year from the stop age of What it is to the end of the chart",
    P.stop === is0.age && P.F.n === fixed.n && P.F.fixedOk === fixed.ok && P.F.years === LY_END + 1 - P.stop
  );
  chk(
    "the rate is the highest one, in steps of 0.1%, at which guardrails held in at least as many start years as the fixed rule",
    hist("guard", P.rate).ok >= fixed.ok &&
      hist("guard", Math.round((P.rate + 0.001) * 10000) / 10000).ok < fixed.ok &&
      P.F.flexOk === hist("guard", P.rate).ok
  );
  const p = cbParams(c),
    with0 = lyNumbers(p, { flex: { take: P.rate } });
  chk(
    "the drop is the number of its own math function (lyNumbers with the rate against the same numbers without it)",
    near(P.receipt.off, lyReceipt(lyNumbers(p, {}).could, with0.could).off) &&
      P.receipt.months === lyReceipt(lyNumbers(p, {}).could, with0.could).months &&
      P.receipt.off > 0
  );
  chk(
    "with nothing else counted, What it could be is a year of spending divided by the rate",
    near(with0.could.target, p.spend / P.rate, 0.5) && near(with0.is.target, p.spend / SWR, 0.5)
  );
  chk(
    "a rate that is not above the standard rate moves nothing, so the way can never raise the number",
    lyFlex(p, { flex: { take: 0.035 } }) === null &&
      lyNumbers(p, { flex: { take: 0.035 } }).counted === false &&
      near(lyNumbers(p, { flex: { take: SWR } }).could.target, p.spend / SWR, 0.5)
  );
  go("flex");
  let h = ov();
  chk("the screen is clean: no undefined, no long dash, no verdict word", junk(h) === "", junk(h));
  chk("it has the pattern of a strategy step, with the way back to all the ways", pattern(h, "cbflex"));
  chk(
    "it shows the rule for this player, the test behind it and what a cut looks like",
    /data-fid="cbflex:rule"/.test(h) &&
      text(h).includes(P.ratePct + "% of your investments") &&
      text(h).includes(P.F.n + " real start years") &&
      /data-fid="cbflex:cut"/.test(h) &&
      /The past is not a forecast/.test(text(h))
  );
  chk(
    "the i has what has to go right and the backup, and guardrails has its own explanation",
    /What has to go right/.test(GLOSS.cbflex[1]) &&
      /Backup if it doesn't/.test(GLOSS.cbflex[1]) &&
      GLOSS.cbguard[1].length > 80
  );
  chk(
    "three buttons: Count this, Already doing it, Not for me",
    ["count", "did", "no"].every(v => new RegExp('data-a="cbflexdo" data-v="' + v + '"').test(h))
  );
  X("cbflexdo", "count");
  h = ov();
  let N = cbNumbers(c);
  chk(
    "Count this moves What it could be down by the receipt, and What it is stays",
    cbWayState(c, "flex").counted &&
      near(N.is.target - N.could.target, P.receipt.off, 1) &&
      N.is.target === is0.target &&
      N.is.age === is0.age &&
      !N.above
  );
  chk(
    "the profile holds no rate: it is found again from the history",
    JSON.stringify(c.x.cb.count.flex) === "{}" && cbCounted(c).flex.take === P.rate && cbFlexTake(c) === P.rate
  );
  chk(
    "the receipt says what was counted: dollars off your number and months sooner",
    /data-fid="cb:receipt"/.test(h) && /Counted\./.test(text(h)) && text(h).includes(cbReceiptWords(P.receipt))
  );
  X("cbflexdo", "did");
  chk(
    "Already doing it counts it too",
    cbWayState(c, "flex").how === "did" && /Already yours, and counted/.test(text(ov()))
  );
  X("cbflexdo", "no");
  N = cbNumbers(c);
  chk(
    "Not for me takes it out: the two numbers are equal again",
    !c.x.cb.count.flex && N.same && cbWayState(c, "flex").how === "no"
  );
  chk(
    "the spreadsheet of the plan has the rate and its formula",
    cbBook(c).rows.some(r => r.id === "cb_flexrate" && r.v === P.rate) &&
      cbBook(c).rows.some(r => r.id === "cb_flexnum" && near(r.v, p.spend / P.rate, 0.5))
  );

  /* ---- 2. money that shows up later (phase 2c) ---- */
  let L = cbLaterPlan(c);
  chk("a new player has no pension and no payment that ends: the way cannot apply yet", !L.applies && L.why === "none");
  go("later");
  h = ov();
  chk("the screen is clean", junk(h) === "", junk(h));
  chk("it has the pattern of a strategy step", pattern(h, "cblater"));
  chk(
    "with nothing to count it says why, asks by taps, and has no button that counts nothing",
    /No drop yet/.test(text(h)) &&
      /data-fid="cblater:why"/.test(h) &&
      /data-a="cblaterset" data-k="pension"/.test(h) &&
      /data-a="cblaterset" data-k="homepmt" data-i="-1"/.test(h) &&
      !/data-a="cblaterset" data-k="homeyrs"/.test(h) &&
      !/data-a="cblaterdo"/.test(h)
  );
  X("cblaterset", "", "", { k: "pension", i: 2 });
  chk(
    "one tap on the pension goes to its one home (c.x.pen), the key the rest of the game reads",
    c.x.pen.amt === 2000 &&
      passives(c).pen.amt === 2000 &&
      cbParams(c).other.some(o => o.year === 24000 && o.from === 65)
  );
  X("cblaterset", "", "", { k: "homepmt", i: 0 });
  h = ov();
  chk("a home loan payment opens the question of its years", c.x.home.pmt === 1000 && /data-k="homeyrs"/.test(h));
  X("cblaterset", "", "", { k: "homeyrs", i: 3 });
  chk(
    "the payment and its years go to their one home (c.x.home), and the game's own list of payments that end has it",
    c.x.home.yrs === 20 &&
      endsOf(c).some(e => e.k === "Mortgage" && e.amt === 1000 && e.yrs === 20) &&
      cbParams(c).ends.some(e => e.year === 12000 && e.from === c.age + 20)
  );
  L = cbLaterPlan(c);
  const p2 = cbParams(c),
    with2 = lyNumbers(p2, { other: {}, ends: {} });
  chk(
    "the drop is the number of its own math function (lyNumbers with the income and the payment that ends)",
    L.applies &&
      L.parts.length === 2 &&
      near(L.receipt.off, lyReceipt(lyNumbers(p2, {}).could, with2.could).off) &&
      L.receipt.months === lyReceipt(lyNumbers(p2, {}).could, with2.could).months &&
      L.receipt.off > 0
  );
  h = ov();
  chk(
    "the screen names each part with its dollars and its age, and has the three buttons",
    /data-fid="cblater:parts"/.test(h) &&
      /A pension/.test(text(h)) &&
      /Your home loan is paid off/.test(text(h)) &&
      ["count", "did", "no"].every(v => new RegExp('data-a="cblaterdo" data-v="' + v + '"').test(h))
  );
  X("cblaterdo", "count");
  N = cbNumbers(c);
  chk(
    "Count this counts what the math reads, and What it could be drops by the receipt",
    !!c.x.cb.count.later &&
      !!c.x.cb.count.other &&
      !!c.x.cb.count.ends &&
      near(N.is.target - N.could.target, L.receipt.off, 1) &&
      N.is.target === is0.target &&
      !N.above
  );
  const K = cbChart(c),
    from = c.age + 20,
    row = a => K.rows.find(r => r.age === a);
  chk(
    "on the chart the year costs less by the payment from the age it ends, and no less before",
    near(row(from - 1).needs + row(from - 1).wants, p2.spend, 0.01) &&
      near(row(from).needs + row(from).wants, p2.spend - 12000, 0.01)
  );
  chk(
    "in every year the layers and the gap still equal the line",
    K.rows.every(r => near(r.work + r.inv + r.ss + r.other + r.gap, r.line, 0.02))
  );
  chk(
    "a payment that ends comes off the needs first",
    near(row(from).needs, row(from - 1).needs - 12000, 0.01) && near(row(from).wants, row(from - 1).wants, 0.01)
  );
  X("cblaterset", "", "", { k: "homepmt", i: -1 });
  chk(
    "No home loan takes the payment out, and a counted way follows the answer",
    c.x.home.pmt === 0 && !endsOf(c).length && !c.x.cb.count.ends && !!c.x.cb.count.other
  );
  chk(
    "the spreadsheet of the plan has the income that starts later",
    cbBook(c).rows.some(r => r.id === "cb_laterinc" && r.v === 24000)
  );
  X("cblaterdo", "no");
  chk("Not for me takes it out", !c.x.cb.count.later && !c.x.cb.count.other && cbNumbers(c).same);

  /* ---- 3. above What it is only when a cost is the cause, and the screen says so ---- */
  X("cblaterdo", "count");
  X("cbflexdo", "count");
  cbWayDo("shape", "count", "1");
  cbWayDo("ss", "count", "1");
  N = cbNumbers(c);
  chk(
    "with every way to shrink the number counted and no cost, What it could be is not above What it is",
    !N.above && N.could.target < N.is.target
  );
  G = clone(G0);
  G.demo = true;
  W = null;
  X("start");
  X("wnskip"); /* What you want (run SLAM-ONBOARD-1): Skip for now */
  X("cbset", "", "", { q: "age", i: 1 });
  X("cbset", "", "", { q: "spend", i: 2 });
  X("cbset", "", "", { q: "inv", i: 3 });
  X("cbset", "", "", { q: "save", i: 3 });
  c = C();
  cbCount("health", {});
  N = cbNumbers(c);
  go("flex");
  h = ov();
  chk(
    "with only a cost counted it is above, the cost is named as the cause, and the screen says so",
    N.above &&
      N.raisedBy.join() === "health" &&
      /Above What it is, because you counted health insurance before 65/.test(text(h))
  );
  G = clone(G0);
}
