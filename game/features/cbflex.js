/* ============================================================================
   SLAM the Game: features/cbflex.js
   PURPOSE     What it is / What it could be, Batch B phase 2b (Nov 27 2026): the way "Bend your spending
               when markets fall". The 25 times rule takes the same amount every year, whatever the market
               does. Guardrails (Guyton and Klinger) cut spending a little after a bad stretch and raise it
               after a good one. A player who can do that can start from a smaller pile. The way finds the
               highest starting rate at which guardrails held in the real start years of market history as
               often as the fixed 4% rule did, and sizes "What it could be" at that rate.
   INPUT       The profile, through features/couldbe.js (cbParams, cbCounted) and features/odds.js
               (oddsInputs: the share in stocks). The market history (data/market.js, through cmpReal of
               features/ways.js). The open sheet (W.kind cb, W.step flex).
   OUTPUT      Math: cbFlexFind (the rate for a stop age and a mix), cbFlexTake (the rate that is counted;
               couldbe.js cbCounted and cbtax.js cbTaxPlan read it), cbFlexPlan (the plan, the receipt and
               what the screen shows), cbFlexDo (the answer of the player), cbFlexInfo (what the stack
               reads), cbFlexBookRows (part of cbBook in couldbe.js). View: cbFlexView. Actions (ACT): cbflexdo. A step of the flow, added with
               cbStepAdd("flex", ...).
   DEPENDS ON  core/report.js, core/withdraw.js (wayById, wayHistory, wayTolerance: the rules), core/paylayers.js
               (lyReceipt, LY_END), core/engine.js (derive, R, SWR), features/ways.js (cmpPlan, cmpReal: each real
               start year through oddsRun), features/odds.js (oddsInputs), features/retire.js (retireReady),
               features/couldbe.js (cbParams, cbCounted, cbLy, cbState, cbStore, cbChart, cbTop, cbFoot, cbWayNo,
               cbWayState, cbReceiptWords, cbChartCard, cbStepAdd, cbM, cbWhyRow, cbWayNav), features/kit.js
               (kitPill, kitInfo, kitTerms), screens/ui.js (head, mathBox, esc).
   RULES       This file has no engine of its own: each run is cmpReal() of ways.js with a way of
               core/withdraw.js. The rate is found, never typed: the profile holds no rate. It is counted only
               when it is above the 4% of the standard way, so it can never raise the number. A view shows
               what the math functions return. The past is not a forecast, and the screen says so.
   COMPAT      One more optional key in c.x.cb.count: flex {}, and c.x.cb.how.flex (count, did, no).
   STATE       CBF (the rates that were found, by stop age and mix).
   ========================================================================= */
const CBF = { memo: {} };
/* The two ways that are compared, by their id in core/withdraw.js: the fixed 4% rule and guardrails with 20% bands. */
const CBF_FIXED = "steady-4",
  CBF_WAY = "guard",
  /* the rates that are tried: from the standard rate up, in steps of 0.1%, to 4 points above it at most */
  CBF_STEP = 0.001,
  CBF_TRIES = 40;
/* THE RATE for a stop age and a share in stocks. Each real start year of market history with enough years after it
   is run from the stop age to the end of the chart. The fixed 4% rule holds in some of them. The answer is the
   highest starting rate at which guardrails hold in at least as many (a start year holds when the money lasts and no
   year pays less than the share the way tolerates). Social Security and other income are left out, so both ways get
   the same test. Returns { rate (null: no rate above the standard one holds as often), n (start years), first, last,
   fixedOk, flexOk, deepest (the lowest share of the spending any year paid, at that rate), years, stock }. */
function cbFlexFind(stop, stock) {
  const key = stop + "|" + stock;
  if (CBF.memo[key]) return CBF.memo[key];
  const need = 40000 /* any amount: the test has no other income, so the answer is the same for each amount */,
    fixed = wayById(CBF_FIXED),
    guard = wayById(CBF_WAY),
    run = (way, rate) => {
      const P = {
        inv: need / rate,
        monthly: 0,
        age: stop,
        ret: stop,
        death: LY_END + 1,
        spend: need,
        ss: 0,
        pen: null,
        now: 0,
        stock,
        growth: R,
      };
      return { H: wayHistory(cmpReal(cmpPlan(P, way, stop)), wayTolerance(way)), P };
    },
    base = run(fixed, SWR).H,
    Y = oddsYears(),
    out = {
      rate: null,
      n: base.n,
      first: Y[0][0],
      last: base.n ? Y[base.n - 1][0] : null,
      fixedOk: base.ok,
      flexOk: null,
      deepest: null,
      years: LY_END + 1 - stop,
      stock,
      floor: wayTolerance(guard),
    };
  if (base.n)
    for (let k = 1; k <= CBF_TRIES; k++) {
      const rate = Math.round((SWR + k * CBF_STEP) * 10000) / 10000,
        H = run(guard, rate).H;
      if (!(H.ok >= base.ok)) break;
      out.rate = rate;
      out.flexOk = H.ok;
      out.deepest = H.deepest;
    }
  return (CBF.memo[key] = out);
}
/* The stop age and the mix of the test for this player: the age of "What it is" (the game's planned stop age when
   the pace does not reach the number), and the share in stocks of the retirement odds. null: not ready. */
function cbFlexAt(c) {
  if (
    typeof retireReady !== "function" ||
    !retireReady() ||
    typeof cmpReal !== "function" ||
    typeof MARKET_HISTORY === "undefined"
  )
    return null;
  const N = cbLy(cbParams(c), {}),
    stop = Math.min(LY_END - 1, N.is.age != null ? N.is.age : Math.max(c.age, c.ret || 65));
  return { stop, stock: oddsInputs(c).stock };
}
/* The rate that is counted for this player now, or null when none is above the standard rate. Part of cbCounted()
   in couldbe.js and of cbTaxPlan() in cbtax.js. It stands on the stop age and the mix only, not on what is counted. */
function cbFlexTake(c) {
  try {
    const A = cbFlexAt(c),
      F = A ? cbFlexFind(A.stop, A.stock) : null;
    return F && F.rate > SWR + 1e-9 ? F.rate : null;
  } catch (e) {
    report(e, "cbflex.js: cbFlexTake");
    return null;
  }
}
/* THE PLAN for this player, with what the screen needs: applies, why (notready, nogain), the rate and the test
   behind it (F), the two numbers without the way and with it, the receipt, the times of spending (25 and the new
   one), the deepest cut in dollars a year, and whether the needs fit inside that cut (the backup). */
function cbFlexPlan(c) {
  const d = derive(c),
    p = cbParams(c, d),
    cnt = Object.assign({}, cbCounted(c)),
    A = cbFlexAt(c),
    F = A ? cbFlexFind(A.stop, A.stock) : null,
    rate = F && F.rate > p.take + 1e-9 ? F.rate : null,
    pct = v => Math.round(v * 1000) / 10;
  delete cnt.flex;
  const before = cbLy(p, cnt),
    after = rate != null ? cbLy(p, Object.assign({}, cnt, { flex: { take: rate } })) : before;
  return {
    ok: !!A,
    applies: rate != null,
    why: !A ? "notready" : rate == null ? "nogain" : "",
    F,
    rate,
    ratePct: rate != null ? pct(rate) : null,
    isPct: pct(p.take),
    times: rate != null ? Math.round(10 / rate) / 10 : null,
    isTimes: Math.round(10 / p.take) / 10,
    stop: A ? A.stop : null,
    stockPct: A ? Math.round(A.stock * 100) : null,
    before,
    after,
    receipt: lyReceipt(before.could, after.could),
    /* the deepest cut of the years that held: the share that was still paid, and that in dollars a year */
    paidPct: F && F.deepest != null ? Math.round(F.deepest * 100) : null,
    paidYear: F && F.deepest != null ? p.spend * F.deepest : null,
    floorPct: F ? Math.round((F.floor + 0.001) * 100) : null,
    needsPct: Math.round(p.needsShare * 100),
    needsYear: p.spend * p.needsShare,
    /* the backup: the needs fit inside what the deepest cut the rule allows still pays */
    needsFit: !!F && p.needsShare <= F.floor + 0.001,
    st: cbState(c),
  };
}
/* The reason the way is not offered, in the player's words. */
function cbFlexWhy(P) {
  return {
    notready: "The market history is still loading. Open this screen again in a moment.",
    nogain:
      "For a plan as long as yours, guardrails did not hold more often than the fixed 4% rule at a higher starting rate. Nothing to count here right now.",
  }[P.why];
}
/* The answer of the player. how: count (Count this), did (Already doing it: counted too), no (Not for me). */
function cbFlexDo(how) {
  const c = C(),
    s = cbStore(c),
    P = cbFlexPlan(c);
  s.how = s.how || {};
  if (how === "no" || !P.applies) {
    delete s.count.flex;
    s.how.flex = "no";
  } else {
    s.count.flex = {};
    s.how.flex = how === "did" ? "did" : "count";
  }
  save();
  return cbFlexPlan(c);
}
/* Part of cbBook() in couldbe.js. The spreadsheet of the plan: the rate, and the standard number at that rate. */
function cbFlexBookRows(c) {
  try {
    const P = cbFlexPlan(c),
      d = derive(c);
    if (!P.applies) return [];
    return [
      {
        id: "cb_flexrate",
        label:
          "Flexible withdrawals: the highest starting rate at which guardrails held in market history as often as the fixed rule",
        v: P.rate,
      },
      {
        id: "cb_flexnum",
        label: "Spending a year divided by that rate (with nothing else counted)",
        v: d.fiSpend / P.rate,
        f: "={cb_spend}/{cb_flexrate}",
      },
    ];
  } catch (e) {
    report(e, "cbflex.js: cbFlexBookRows");
    return [];
  }
}
/* What this way gives the stack (cbstack.js). */
function cbFlexInfo(c) {
  const P = cbFlexPlan(c);
  return {
    applies: P.applies,
    why: P.applies ? "" : cbFlexWhy(P),
    receipt: P.receipt,
    st: P.st,
    backup: {
      words: "Your needs (food, a place to live, getting around) fit inside what the deepest cut still pays.",
      auto: P.needsFit,
    },
  };
}
/* THE SCREEN of the way. */
function cbFlexView() {
  const c = C(),
    P = cbFlexPlan(c),
    F = P.F,
    St = cbWayState(c, "flex"),
    K = cbChart(c),
    G = wayById(CBF_WAY),
    btn = (v, label) =>
      `<button class="${!St.how && v === "count" ? "primary go" : "ghost"} wide ${St.how === v ? "on" : ""}" data-a="cbflexdo" data-v="${v}" aria-pressed="${St.how === v ? "true" : "false"}">${label}${St.how === v ? " ✓" : ""}</button>`,
    said =
      St.how === "no"
        ? `<div class="banner small" data-fid="cb:receipt"><b>Left out.</b> What it could be does not count this. One tap on Count this puts it in.</div>`
        : St.counted
          ? `<div class="banner small cbrec" data-fid="cb:receipt"><b>${St.how === "did" ? "Already yours, and counted." : "Counted."}</b> ${esc(cbReceiptWords(P.receipt))}.</div>`
          : "";
  return (
    head(cbWayNo("flex"), "Bend your spending when markets fall") +
    cbTop(c) +
    `<div class="small">The 25 times rule takes the same amount every year, whatever the market does. If you can spend a little less after a bad stretch, you can start from a smaller pile. ${kitInfo("cbguard")}</div>` +
    cbWhyRow("flex", "cbflex") +
    (P.applies
      ? `<div class="tile small" data-fid="cbflex:rule"><b>The rule for your numbers</b><div>Start by taking ${P.ratePct}% of your investments in the first year, in place of ${P.isPct}%. That is ${P.times} times a year of spending, in place of ${P.isTimes}.</div><div>When the share you take drifts 20% above where it started, spend 10% less. When it drifts 20% below, spend 10% more. A cut never goes under ${P.floorPct}% of your spending.</div><div class="tiny muted">In ${F.n} real start years (${F.first} to ${F.last}), each with ${F.years} years after it: the fixed ${P.isPct}% rule held in ${F.fixedOk}, and this rule held in ${F.flexOk}. The past is not a forecast.</div></div>` +
        `<div class="tile small" data-fid="cbflex:cut"><b>What a cut looks like</b><div>The deepest cut in the years that held: to ${P.paidPct}% of your spending, ${cbM(P.paidYear)} a year. Your needs are ${P.needsPct}% of your spending, ${cbM(P.needsYear)} a year. ${P.needsFit ? "They fit inside it: a cut takes wants only." : "They do not fit inside it yet: a deep cut would reach your needs."}</div></div>` +
        `<div class="tile cbdrop" data-fid="cb:drop"><div class="row between"><span class="dklabel">The drop for you</span>${kitPill(P.st)}</div><b class="cbdropn">${esc(cbReceiptWords(P.receipt))}</b><div class="tiny muted">${St.counted ? "With this rule, against the fixed rule." : "If you count it."}</div></div>` +
        `<div class="stack cbways" style="gap:8px">${btn("count", "Count this")}<div class="cbtwo">${btn("did", "Already doing it")}${btn("no", "Not for me")}</div></div>` +
        cbWayUnsure() +
        said
      : `<div class="tile cbdrop" data-fid="cb:drop"><div class="row between"><span class="dklabel">The drop for you</span>${kitPill(P.st)}</div><b class="cbdropn">No drop yet</b><div class="small" data-fid="cbflex:why">${esc(cbFlexWhy(P))}</div></div>`) +
    cbChartCard(
      K,
      "The chart now",
      "The chart shows a smooth market. This rule is for a rough one: spending bends, so the pile you need at the start is smaller."
    ) +
    mathBox(
      P.applies
        ? [
            "The standard way: take " +
              P.isPct +
              "% of your investments in the first year, then the same amount every year. Your number is a year of spending divided by that rate: " +
              P.isTimes +
              " times.",
            "Guardrails: " + G.plain + " " + G.by + ".",
            "The test: each real start year from " +
              F.first +
              " to " +
              F.last +
              " (" +
              F.n +
              " start years), with the " +
              F.years +
              " years of real markets after it, " +
              P.stockPct +
              "% in stocks, after inflation. Work stops at " +
              P.stop +
              ", the age of What it is. Social Security and other income are left out, so both rules get the same test.",
            "The fixed " + P.isPct + "% rule held in " + F.fixedOk + " of " + F.n + " start years.",
            "The highest starting rate, in steps of 0.1%, at which guardrails held in at least as many: " +
              P.ratePct +
              "%, in " +
              F.flexOk +
              " of " +
              F.n +
              ". A start year holds when the money lasts and no year pays less than " +
              P.floorPct +
              "% of your spending.",
            "What it could be: a year of spending divided by " +
              P.ratePct +
              "% (" +
              P.times +
              " times), with everything else you counted.",
            "Market history: " + MARKET_HISTORY.source + ". The past is not a forecast.",
            P.st === "Guess" ? "This is a Guess: it stands on the ranges you tapped." : "",
          ]
        : [cbFlexWhy(P)]
    ) +
    cbWayNav(!!St.how || !P.applies) +
    cbFoot()
  );
}
Object.assign(ACT, {
  /* Count this, Already doing it, Not for me */
  cbflexdo: t => {
    if (!W || W.kind !== "cb") return;
    cbFlexDo(t.dataset.v);
    drawSheet();
  },
});
kitTerms({
  cbflex: [
    "Flexible withdrawals",
    "What has to go right: you can live on less for a while. In the hardest start years of market history this rule cut spending by up to 30%, for years at a time, and your needs have to fit inside what is left. You also have to make the cut when the rule says so. Backup if it doesn't: keep your needs (food, a place to live, getting around) under 70% of your spending, so a cut takes wants only. Or take this out again with one tap. What it is, the 25 times number, does not count on it.",
  ],
  cbguard: [
    "Guardrails",
    "A way to take money out that follows the market a little. You start at a set share of your investments. Each year you look at the share you are taking now. If it has drifted well above where it started (the market fell), you spend a little less. If it has drifted well below (the market rose), you spend a little more. The two lines are the guardrails. Jonathan Guyton and William Klinger described it in 2006.",
  ],
});
cbStepAdd("flex", () => cbFlexView(), {
  title: "Bend your spending when markets fall",
  info: cbFlexInfo,
  set: cbFlexDo,
});
