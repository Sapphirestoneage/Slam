/* ============================================================================
   SLAM the Game: features/cbtax.js
   PURPOSE     What it is / What it could be, Batch B phase 2a (Nov 27 2026): the way "Pay less tax on the
               way out". The tax on money taken out of traditional accounts is a cost the 25 times rule
               leaves out. This way counts it, with a plan for the years after work: each year, traditional
               money first up to a fill line (bracket filling); what is left of that line moves from
               traditional to Roth (a Roth conversion); the rest comes from the taxable account (inside the
               0% capital gains zone) and then from Roth. The screen shows the drop against the usual order
               (taxable, traditional, Roth), year by year, and which account each year draws from.
   INPUT       The profile, through features/couldbe.js (cbParams, cbCountedRaw, cbFiling). The filing
               status and the state: c.x.taxv, their one home (features/taxview.js), asked here by two taps
               with kitAsk. The open sheet (W.kind cb, W.step taxplan).
   OUTPUT      Math: cbTaxLines (the fill lines to try), cbTaxPlan (the plan and its receipt), cbTaxFill
               (the fill line that is counted; couldbe.js cbCounted reads it), cbTaxYears (the years after
               work, one row each, and 5 years a row), cbTaxDo (the answer of the player), cbTaxBookRows (part
               of cbBook in couldbe.js), cbTaxInfo (what the stack reads). View: cbTaxView.
               Actions (ACT): cbtaxdo. A step of the flow, added with cbStepAdd("taxplan", ...).
   DEPENDS ON  core/report.js, core/paylayers.js (lyTaxPlan, lyBars, LY_TAX_REF, LY_END),
               features/couldbe.js (cbParams, cbCountedRaw, cbFiling, cbState, cbStore, cbChart, cbTop,
               cbFoot, cbWayNo, cbWayState, cbReceiptWords, cbChartCard, cbStepAdd, cbM, CB_COL, cbWhyRow, cbWayNav),
               features/retire.js (retireTax), features/taxview.js (TAXV_FILING), features/kit.js (kitAsk,
               kitPill, kitInfo, kitTerms), features/look.js (lkK), screens/ui.js (head, mathBox, esc).
   RULES       A view shows what the math functions return. The tax is the game's one tax engine
               (retireTax). The fill lines are the engine's own lines (the standard deduction and the tops
               of its brackets); a game test fails when they differ from the dated reference data
               (LY_TAX_REF, from data/reference-2026.json). The plan is counted only with the tax itself:
               "What it could be" then is above the number with no tax, and the top of the screen says so.
               The profile holds no dollars of the plan: the fill line is found again for the player as
               they are now. A plan that does not beat the usual order is not offered: the screen says why.
               Education, not advice: the one line of account/trust.js is on the screen (cbFoot).
   COMPAT      One more optional key in c.x.cb.count: taxplan { cost (true when this way also brought the
               tax into the number) }, and c.x.cb.how.taxplan (count, did, no). An old saved game has none.
   STATE       CBT (the plans that were worked out, by their input).
   ========================================================================= */
const CBT = { memo: new Map() };
/* The fill lines to try, from the tables of the tax engine for this filing status and state: the 0% space (the
   standard deduction), then the deduction plus the top of each bracket up to 22%. fill is dollars of ordinary
   income a year. */
function cbTaxLines(c) {
  const F = cbFiling(c),
    X = retireTax(0, 0, F.filing, F.state, c.age),
    B = X.brackets,
    lines = [{ id: "std", fill: X.std, rate: 0, name: "the standard deduction: no federal tax on it" }];
  for (let k = 1; k < B.length && B[k - 1][1] <= 0.22 + 1e-9; k++)
    lines.push({
      id: "b" + Math.round(B[k - 1][1] * 100),
      fill: X.std + B[k][0],
      rate: B[k - 1][1],
      name: "the top of the " + Math.round(B[k - 1][1] * 100) + "% bracket",
    });
  return lines;
}
/* THE PLAN for this player (core/paylayers.js lyTaxPlan), with what the screen needs: applies (a line beats the
   usual order), why (when none does: none, onekind, nopre, nogain, notready), adds (what the tax adds to the number
   the usual way and with the plan), the filing status and the state, and Guess, Close or Exact. */
function cbTaxPlan(c) {
  const d = derive(c),
    p = cbParams(c, d),
    raw = Object.assign({}, cbCountedRaw(c)),
    F = cbFiling(c);
  delete raw.taxplan;
  delete raw.wtax;
  /* flexible withdrawals (cbflex.js): the plan is found at the rate that is counted */
  if (raw.flex) {
    const take = typeof cbFlexTake === "function" ? cbFlexTake(c) : null;
    if (take == null) delete raw.flex;
    else raw.flex = { take };
  }
  if (typeof p.tax !== "function")
    return {
      ok: false,
      applies: false,
      why: "notready",
      best: null,
      receipt: null,
      cost: null,
      adds: { plain: null, plan: null },
      F,
      st: "Guess",
      lines: [],
    };
  const lines = cbTaxLines(c),
    key = JSON.stringify([p, raw, lines]);
  if (!CBT.memo.has(key)) {
    if (CBT.memo.size > 30) CBT.memo.clear();
    CBT.memo.set(key, lyTaxPlan(p, raw, lines));
  }
  const P = clone(CBT.memo.get(key)),
    tot = p.bal.tax + p.bal.pre + p.bal.roth + p.bal.hsa,
    base = cbState(c),
    k = v => (v == null ? null : Math.round(v / 1000) * 1000);
  P.applies = !!P.best;
  P.why = P.best
    ? ""
    : !(tot > 0)
      ? "none"
      : !(p.bal.pre > 0)
        ? "nopre"
        : p.bal.pre >= tot - 0.5
          ? "onekind"
          : "nogain";
  /* the accounts are a guess while the profile has no row with its kind of account: all counts as traditional */
  P.acctGuess = !(c.invs || []).length || !!(c.x && c.x.cb && c.x.cb.a && !c.x.cb.setup);
  P.adds = {
    plain: P.cost && P.cost.off != null ? k(-P.cost.off) : null,
    plan: P.cost && P.cost.off != null && P.receipt.off != null ? k(-P.cost.off - P.receipt.off) : null,
  };
  P.F = F;
  P.lines = lines;
  P.line = P.best ? lines.find(l => l.id === P.best.id) : null;
  P.st = base === "Guess" || F.st === "Guess" ? "Guess" : base === "Exact" && F.st === "Exact" ? "Exact" : "Close";
  return P;
}
/* The fill line that is counted for this player now: the best line, or null when no line beats the usual order.
   Part of cbCounted() in couldbe.js. */
function cbTaxFill(c) {
  try {
    const P = cbTaxPlan(c);
    return P.best ? P.best.fill : null;
  } catch (e) {
    report(e, "cbtax.js: cbTaxFill");
    return null;
  }
}
/* YEAR BY YEAR, the years after work: which account each year draws from, what moves to Roth, the tax, the bracket
   the year ends in and the room that is left for long-term gains at 0%. fill: the fill line (null: the usual
   order). Returns { K (the chart, split by account), rows (one a year), bars (5 years a row: the averages, the
   highest bracket), conv, gains }. */
function cbTaxYears(c, fill) {
  const K = cbChart(c, null, { split: true, plan: fill == null ? null : fill }),
    F = cbFiling(c),
    after = K.rows.filter(r => !r.planWork),
    rows = after.map(r => {
      const X = retireTax(r.ord, 0, F.filing, F.state, c.age);
      return {
        age: r.age,
        pre: r.pre,
        conv: r.conv,
        tax: r.tax,
        roth: r.roth,
        hsa: r.hsa,
        wtax: r.wtax,
        ord: r.ord,
        top: X.taxable > 0 ? X.top : 0,
        room0: X.gainsRoom,
        gap: r.gap,
      };
    }),
    bars = lyBars(after, 5).map(b => {
      const g = rows.filter(r => r.age >= b.from && r.age <= b.to);
      return {
        label: b.from === b.to ? String(b.from) : b.from + " to " + b.to,
        pre: b.pre,
        conv: b.conv,
        tax: b.tax,
        roth: b.roth + b.hsa,
        wtax: b.wtax,
        top: Math.max.apply(
          null,
          g.map(r => r.top)
        ),
      };
    }),
    sold = rows.filter(r => r.tax > 0.5),
    X0 = retireTax(0, 0, F.filing, F.state, c.age);
  return {
    K,
    rows,
    bars,
    stop: K.p.stop,
    conv: K.sums.conv,
    taxTotal: rows.reduce((t, r) => t + r.wtax, 0),
    /* the years a taxable account is sold: the smallest room for 0% gains in them, and the 0% line itself */
    gains: {
      years: sold.length,
      from: sold.length ? sold[0].age : null,
      to: sold.length ? sold[sold.length - 1].age : null,
      min: sold.length
        ? Math.min.apply(
            null,
            sold.map(r => r.room0)
          )
        : null,
      line: X0.zero,
      /* true when no year that sells taxable investments uses any of the 0% room */
      all: sold.length > 0 && sold.every(r => r.room0 >= X0.zero),
    },
  };
}
/* The answer of the player. how: count (Count this), did (Already doing it: counted too), no (Not for me). Counting
   the plan counts the tax itself, because the plan is a plan for that cost. Not for me takes the plan out, and the
   tax too when this way brought it in. */
function cbTaxDo(how) {
  const c = C(),
    s = cbStore(c),
    P = cbTaxPlan(c);
  s.how = s.how || {};
  if (how === "no" || !P.applies) {
    if (s.count.taxplan && s.count.taxplan.cost) delete s.count.wtax;
    delete s.count.taxplan;
    s.how.taxplan = "no";
  } else {
    const brought = !s.count.wtax || !!(s.count.taxplan && s.count.taxplan.cost);
    s.count.taxplan = brought ? { cost: true } : {};
    s.count.wtax = s.count.wtax || {};
    s.how.taxplan = how === "did" ? "did" : "count";
  }
  save();
  return cbTaxPlan(c);
}
/* Part of cbBook() in couldbe.js. The spreadsheet of the plan: the tax on the way out, the usual order and the plan. */
function cbTaxBookRows(c) {
  try {
    const P = cbTaxPlan(c);
    if (!P.ok || P.plain.could.target == null) return [];
    return [
      {
        id: "cb_taxfill",
        label:
          "The tax plan: traditional money first, up to this much ordinary income a year (0: no plan beats the usual order)",
        v: P.best ? P.best.fill : 0,
      },
      {
        id: "cb_taxplain",
        label: "What it could be with the tax counted, the usual order (taxable, traditional, Roth)",
        v: P.plain.could.target,
      },
      { id: "cb_taxplan", label: "What it could be with the tax counted, with the tax plan", v: P.with.could.target },
      {
        id: "cb_taxdrop",
        label: "The drop of the tax plan: the usual order less the plan",
        v: P.receipt.off,
        f: "={cb_taxplain}-{cb_taxplan}",
      },
    ];
  } catch (e) {
    report(e, "cbtax.js: cbTaxBookRows");
    return [];
  }
}
/* The words of a filing status, from the tax view's own list. */
function cbTaxFilingWords(f) {
  const r = (typeof TAXV_FILING !== "undefined" ? TAXV_FILING : []).find(x => x[0] === f);
  return r ? r[1].toLowerCase() : f;
}
/* The reason no plan is offered, in the player's words. */
function cbTaxWhy(P) {
  return {
    none: "Nothing is invested yet, so there is no tax on the way out to plan. This screen recalculates when you add an account.",
    nopre:
      "None of your invested money is traditional, so the game counts no tax on the way out. There is nothing for this plan to lower.",
    onekind:
      "All of your invested money counts as traditional: it is taxed when it comes out, whatever the order. This way moves tax between kinds of account, so it needs some Roth or taxable money to work with.",
    nogain:
      "On your numbers the usual order already keeps this tax as low as the plan would. Nothing to count here right now.",
    notready: "The tax tables are still loading. Open this screen again in a moment.",
  }[P.why];
}
/* THE SCREEN of the way. */
function cbTaxView() {
  const c = C(),
    P = cbTaxPlan(c),
    St = cbWayState(c, "taxplan"),
    F = P.F,
    Y = P.ok ? cbTaxYears(c, P.best ? P.best.fill : null) : null,
    pct = v => Math.round(v * 100) + "%",
    setupDone = !!(c.x && c.x.cb && c.x.cb.setup) || !(c.x && c.x.cb && c.x.cb.a),
    btn = (v, label) =>
      `<button class="${!St.how && v === "count" ? "primary go cbnext" : "ghost"} wide ${St.how === v ? "on" : ""}" data-a="cbtaxdo" data-v="${v}" aria-pressed="${St.how === v ? "true" : "false"}">${label}${St.how === v ? " ✓" : ""}</button>`,
    asks =
      kitAsk(c, "taxv", "filing", "How do you file your taxes?", TAXV_FILING, F.filing, { term: "filing" }) +
      (F.stateGiven && !W.st
        ? `<div class="tile small row between cbtaxst" data-fid="cbtax:state"><span><b>State: ${esc(F.state || "Not sure")}</b><div class="tiny muted">${F.state ? "Its income tax is counted from its regular table." : "No state tax is counted."}</div></span><button class="ghost slim" data-a="cbtaxst">Change</button></div>`
        : kitAsk(
            c,
            "taxv",
            "state",
            "Which state will you live in?",
            [["", "Not sure"]].concat(RETIRE_STATES.map(s => [s, s])),
            F.state,
            { help: "Nine states tax no pay. Not sure counts no state tax." }
          )),
    said =
      St.how === "no"
        ? `<div class="banner small" data-fid="cb:receipt"><b>Left out.</b> What it could be does not count this. One tap on Count this puts it in.</div>`
        : St.counted
          ? `<div class="banner small cbrec" data-fid="cb:receipt"><b>${St.how === "did" ? "Already yours, and counted." : "Counted."}</b> ${esc(cbReceiptWords(P.receipt))}, against the usual order. The tax itself is in your number now${P.adds.plan > 0 ? ": it adds about " + cbM(P.adds.plan) : ""}. ${cbI("receipt")}</div>`
          : "",
    table = Y
      ? `<details class="math cbtaxy" data-fid="cbtax:years"><summary>Year by year, from age ${Y.stop == null ? c.age : Y.stop}</summary><div class="inner"><table class="cbtaxt"><thead><tr><th>Ages</th><th>Traditional</th><th>Moved to Roth</th><th>Taxable</th><th>Roth</th><th>Tax</th><th>Bracket</th></tr></thead><tbody>${Y.bars
          .map(
            b =>
              `<tr><th>${esc(b.label)}</th><td>${lkK(b.pre)}</td><td>${lkK(b.conv)}</td><td>${lkK(b.tax)}</td><td>${lkK(b.roth)}</td><td>${lkK(b.wtax)}</td><td>${pct(b.top)}</td></tr>`
          )
          .join(
            ""
          )}</tbody></table><div class="tiny muted">A year, on average, in each stretch of 5 years. Today's dollars. Moved to Roth is not spending: it changes which account the money sits in. Bracket is the highest federal bracket the stretch reaches.</div></div></details>`
      : "",
    planTile = P.applies
      ? `<div class="tile small" data-fid="cbtax:plan"><div class="row between" style="gap:8px"><b>The plan for your numbers</b>${cbI("plan")}</div><div>Each year after work: take traditional money first, up to ${cbM(P.best.fill)} (${esc(P.line.name)}). ${kitInfo("cbfill")}</div><div>${
          Y.conv.years
            ? "Move what is left of that space from traditional to Roth: about " +
              cbM(Y.conv.avg) +
              " a year, " +
              (Y.conv.from === Y.conv.to ? "at " + Y.conv.from : "ages " + Y.conv.from + " to " + Y.conv.to) +
              "."
            : "In a year that needs less than that, what is left of the space moves from traditional to Roth."
        } ${kitInfo("cbconv")}</div><div>Take the rest from your taxable account, then from Roth. ${
          Y.gains.years
            ? Y.gains.all
              ? "In the years you sell taxable investments, all of the 0% room for gains is open: " +
                cbM(Y.gains.line) +
                "."
              : "In the years you sell taxable investments, at least " +
                cbM(Y.gains.min) +
                " of room is left under the 0% line for gains (" +
                cbM(Y.gains.line) +
                ")."
            : ""
        } ${kitInfo("cbzero")}</div></div>`
      : "";
  return (
    head(cbWayNo("taxplan"), "Pay less tax on the way out") +
    cbTop(c) +
    `<div class="small">Money in a traditional 401(k) or IRA is taxed when you take it out. The order you take money out changes how much. The 25 times rule counts no tax at all.</div>` +
    cbWhyRow("taxplan", "cbtaxplan") +
    `<div class="stack" style="gap:6px" data-fid="cbtax:asks"><b class="small">Two taps: how you file, and your state</b>${asks}</div>` +
    /* cbguide.js: what the tax adds and the plan are behind one tap (run 14, item 2) */
    cbFold(
      "plan",
      "The plan for your numbers, and what the tax adds",
      (P.ok
        ? `<div class="tile small" data-fid="cbtax:adds"><div class="row between"><b>What the tax adds ${cbI("taxadds")}</b>${kitPill(P.st)}</div><div>The usual order (taxable, then traditional, then Roth): ${esc(cbReceiptWords(P.cost).replace(/^No change to the number$/, "nothing on your numbers"))}.</div>${P.applies ? `<div>With the plan: ${P.adds.plan > 0 ? "about " + cbM(P.adds.plan) + " more on the target" : "nothing more on the target"}.</div>` : ""}</div>`
        : "") + planTile
    ) +
    (P.applies
      ? `<div class="tile cbdrop" data-fid="cb:drop"><div class="row between"><span class="dklabel">The drop for you ${cbI("drop")}</span>${kitPill(P.st)}</div><b class="cbdropn">${esc(cbReceiptWords(P.receipt))}</b><div class="tiny muted">The plan against the usual order, both with the tax counted. ${St.counted ? "" : "Count this and the tax comes into your number, the lower way."}</div></div>` +
        `<div class="stack cbways" style="gap:8px">${btn("count", "Count this")}<div class="cbtwo">${btn("did", "Already doing it")}${btn("no", "Not for me")}</div></div>` +
        cbWayUnsure() +
        said
      : `<div class="tile cbdrop" data-fid="cb:drop"><div class="row between"><span class="dklabel">The drop for you ${cbI("drop")}</span>${kitPill(P.st)}</div><b class="cbdropn">No drop yet</b><div class="small" data-fid="cbtax:why">${esc(cbTaxWhy(P))}</div>${P.acctGuess && P.why === "onekind" ? `<div class="tiny muted">Until you list your accounts, the game counts all of it as a traditional plan at work.</div>` : ""}</div>` +
        (P.acctGuess && !setupDone
          ? `<button class="ghost wide" data-a="cbrest">Finish setup: five short rounds</button><div class="tiny muted">It asks which accounts you have. Then this screen recalculates.</div>`
          : "")) +
    (Y
      ? cbChartCard(
          Y.K,
          P.applies ? "Which account pays each year, with the plan" : "Which account pays each year",
          "Each color is one kind of account. " +
            (P.applies && Y.conv.years
              ? "Money moved to Roth is not spending, so it is not a color: it is in the table below."
              : "The usual order: taxable, then traditional, then Roth.")
        ) + table
      : "") +
    mathBox(
      (P.ok
        ? [
            "The tax of a year: the federal income tax on that year's traditional money (what you take out, and what you move to Roth), filing " +
              cbTaxFilingWords(F.filing) +
              ", with nothing else in the year's income. Tax year " +
              LY_TAX_REF.year +
              ".",
            F.state
              ? "State tax (" +
                F.state +
                "): from the state's regular income tax table. Many states tax retirement income more lightly. That is not counted, so the real state tax can be lower."
              : "State tax: none counted, because no state is picked.",
            "The lines that were tried: " +
              P.lines
                .map(
                  l =>
                    cbM(l.fill) +
                    " (" +
                    l.name +
                    ")" +
                    (P.tried.find(t => t.id === l.id) ? ", target " + cbM(P.tried.find(t => t.id === l.id).target) : "")
                )
                .join("; ") +
              ". The usual order: target " +
              cbM(P.plainAt) +
              ". All on the day work stops at " +
              P.at +
              ".",
            P.applies
              ? "The plan is the line with the lowest target. The drop is the number with the usual order less the number with the plan."
              : "No line beats the usual order by a dollar, so no plan is offered.",
            "The target with a tax: your investments are split over the kinds of account in the shares they have the day work stops. The tax of each year comes from the same year-by-year run as the chart.",
            "Not counted: tax on Social Security, tax on gains in a taxable account (the game does not know your gains yet), required withdrawals from age 73, the early-withdrawal charge before 59 and a half, and changes in the tax law.",
            "Sources: standard deduction and brackets, " +
              LY_TAX_REF.sources.standardDeduction.source +
              " (read " +
              LY_TAX_REF.sources.standardDeduction.date +
              "); head of household, read " +
              LY_TAX_REF.sources.standardDeductionHead.date +
              "; the 0% line for gains, IRS Rev. Proc. 2025-32 (read " +
              LY_TAX_REF.sources.zeroGainsTo.date +
              "). The game's tax engine has the same lines." +
              (F.state ? " State: the Tax Foundation table of the engine." : ""),
          ]
        : ["No number yet: the tax tables are still loading."]
      ).concat(
        P.st === "Guess"
          ? ["This is a Guess: it stands on ranges you tapped or on a filing status the game assumed."]
          : []
      )
    ) +
    cbWayNav(!!St.how || !P.applies) +
    cbFoot()
  );
}
Object.assign(ACT, {
  /* Count this, Already doing it, Not for me */
  cbtaxdo: t => {
    if (!W || W.kind !== "cb") return;
    cbTaxDo(t.dataset.v);
    drawSheet();
  },
  /* open the list of states again */
  cbtaxst: () => {
    if (!W || W.kind !== "cb") return;
    W.st = true;
    drawSheet();
  },
});
kitTerms({
  cbtaxplan: [
    "Tax on the way out",
    "What has to go right: the tax rules stay close to today's (the brackets change a little every year, and a law can change them more). You have money in more than one kind of account. Money you move to Roth stays there 5 years before you spend it. The gains you take from a taxable account fit in the 0% room. A bigger income in a year can also change other costs, like the help with the price of health insurance before 65. Backup if it doesn't: this is a choice you make again each year, so you can skip a year. The usual order still pays for every year, and What it is does not count on any of this.",
  ],
  cbfill: [
    "Bracket filling",
    "Income tax comes in steps called brackets. The first dollars of income each year are taxed at 0% (the standard deduction), the next at 10%, then 12%, and so on. Filling a bracket means taking traditional money out up to the top of a low step every year, so that less of it is left to come out later at a higher step.",
  ],
  cbconv: [
    "Roth conversion",
    "Moving money from a traditional account to a Roth account. The amount you move is taxed as income that year. After that it grows and comes out with no tax. It pays off when you move it in a year your tax rate is low.",
  ],
  cbzero: [
    "0% capital gains zone",
    "When you sell an investment in a taxable account for more than you paid, the difference is a gain. If you held it more than a year and your taxable income that year is under a line (" +
      money(LY_TAX_REF.zeroGainsTo.single) +
      " for a single person, " +
      money(LY_TAX_REF.zeroGainsTo.joint) +
      " for a married couple filing together, tax year " +
      LY_TAX_REF.year +
      "), the federal tax on that gain is 0%.",
  ],
});
/* What this way gives the stack (cbstack.js): whether a plan applies, the reason when none does, and the drop. */
function cbTaxInfo(c) {
  const P = cbTaxPlan(c);
  return {
    applies: !!P.applies,
    why: P.applies ? "" : cbTaxWhy(P),
    receipt: P.receipt,
    st: P.st,
    backup: { words: "The usual order still pays for every year. You choose again each year.", auto: true },
  };
}
cbStepAdd("taxplan", () => cbTaxView(), { title: "Pay less tax on the way out", info: cbTaxInfo, set: cbTaxDo });
