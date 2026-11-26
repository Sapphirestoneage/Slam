/* ============================================================================
   SLAM the Game: features/meters.js
   PURPOSE     The canon rows that were partly built (run Finish everything partly built, Part 21), each
               on the player's own numbers: the F-You money meter (JL Collins), the Money Guy's nine
               steps with where you are, the hourly value of your time to decide what to hand off
               (Grant Sabatier), the noodle budget (Tiffany Aliche), pay yourself first (George S.
               Clason), Shockingly Simple Math (Mr. Money Mustache), and Your Money or Your Life steps
               1b (the balance sheet) and 3 (each month in hours of life).
   INPUT       The profile: c.spend, c.take, c.payFreq, c.cashes, c.invs, c.debts, c.spends, c.goals
               (g.wire), c.moves (the money log), c.tp.chores, c.x.mt (the taps of this file). The open
               sheet (W.kind): fyou, noodle, mtpay, simplemath, mthand, foonine, ym1b, ym3.
   OUTPUT      Math (the adapters to core/canonmath.js): mtX, mtFyouOf, mtNoodleOf, mtPayOf, mtSimpleOf,
               mtHandOf, mtNineOf, mtSheetOf, mtTabOf, mtSt. Views: mtFyouSheet, mtNoodleSheet,
               mtPaySheet, mtSimpleSheet, mtHandSheet, mtNineSheet, mtSheet1b, mtTabSheet, mtChips,
               mtDone. The spreadsheet of the plan: mtBook. Actions (ACT): fyou, noodle, mtpay,
               simplemath, mthand, foonine, ym1b, ym3, mtset, mtkeep. Rows on Famous money ideas.
   DEPENDS ON  core/canonmath.js, core/engine.js (derive, periods, R, SWR, todayISO), screens/ui.js
               (money, esc, head, mathBox, save, sheet, drawSheet), screens/dash.js (dkCaption, dkStatRow,
               dkTile, dkCard, dkBars, dkProgress, dkPill), features/canon.js (fwNow, fwX, fwStepOf,
               fwNextDollarLine, FW_STEP_HEAD), features/enough.js (enRows), features/rolemap.js (rmRate),
               features/goalwire.js (wireOf), features/roof.js (RF_LIST).
   RULES       The math is in core/canonmath.js, a copy of js/math/canonmath.js of the web app. The
               views show what it returns. Empty is not zero: a tap not given waits, and says so. Every
               number has one of three states: Guess, Close, Exact. No red, no verdict words.
   STORED      c.x.mt = { fy: { inv, work, health }, nd: { line name: true | false }, pf: { pre },
               hv: { task, cost, hours }, b1: { home, car } }. COMPATIBILITY: new optional field; an older
               save has no c.x.mt and every tap starts empty.
   ========================================================================= */
function mtX(c) {
  c.x = c.x || {};
  c.x.mt = c.x.mt || {};
  return c.x.mt;
}
const mtG = (c, k) => {
  const X = mtX(c);
  return (X[k] = X[k] || {});
};
/* Guess, Close or Exact: Guess while pay or spending is a guess; Close with real numbers and a tap missing. */
function mtSt(c, tapsGiven) {
  const N = fwNow(c);
  return !N.real ? "Guess" : tapsGiven ? "Exact" : "Close";
}
const mtMo = v => (v == null ? "No end" : v < 10 ? (Math.round(v * 10) / 10).toFixed(1) : String(Math.round(v)));
const mtYr = v => (v == null ? "Over 70 years" : (Math.round(v * 10) / 10).toFixed(1) + " years");
const mtPc = v => Math.round(v * 100) + "%";
/* Taxable accounts: the investments you could sell without a penalty (by the account's name). */
function mtTaxable(c) {
  return (c.invs || [])
    .filter(x => (+x.amt || 0) > 0 && /brokerage|taxable|individual|joint|crypto|stock/i.test(x.k || ""))
    .reduce((t, x) => t + (+x.amt || 0), 0);
}

/* ---------- the math adapters ---------- */
function mtNoodleOf(c) {
  const nd = mtG(c, "nd"),
    lines = c.led
      ? (c.spends || []).map(r => ({ k: r.k, amt: +r.amt || 0, keep: typeof nd[r.k] === "boolean" ? nd[r.k] : null }))
      : [];
  return cmNoodle({ lines, cash: derive(c).cash });
}
function mtFyouOf(c) {
  const d = derive(c),
    f = mtG(c, "fy"),
    inv = f.inv === "tax" ? mtTaxable(c) : typeof f.inv === "number" ? f.inv : null,
    Nd = mtNoodleOf(c),
    F = cmFyou({
      reach: d.cash + (inv || 0),
      spending: c.spend,
      workCosts: typeof f.work === "number" ? f.work : null,
      health: typeof f.health === "number" ? f.health : null,
      floor: Nd.ready ? Nd.noodle : null,
    });
  return Object.assign({}, F, {
    inv,
    cash: d.cash,
    st: mtSt(c, inv != null && typeof f.work === "number" && typeof f.health === "number"),
  });
}
function mtPayOf(c) {
  const pre = mtG(c, "pf").pre,
    parts = (c.goals || [])
      .filter(g => typeof wireOf === "function" && wireOf(g))
      .map(g => ({ name: g.n || g.name || "A goal", monthly: wireOf(g).amt }));
  if (typeof pre === "number" && pre > 0)
    parts.unshift({ name: "Out of your pay before it lands (401(k), HSA)", monthly: pre, pre: true });
  const P = cmPayFirst({
    parts,
    paysPerMonth: (c.payFreq && c.payFreq !== "It varies" ? periods(c.payFreq) : 12) / 12,
    takeHome: c.take,
    spending: c.spend,
  });
  return Object.assign({}, P, { st: mtSt(c, typeof pre === "number") });
}
function mtSimpleOf(c) {
  const d = derive(c);
  return Object.assign(cmSimpleCurve({ savingsRate: d.rate > 0 ? d.rate : null, realReturn: R, withdrawalRate: SWR }), {
    st: mtSt(c, true),
    own: d.yrs,
  });
}
function mtHandOf(c) {
  const v = mtG(c, "hv"),
    rate = typeof rmRate === "function" ? rmRate(c) : { rate: null, from: null },
    H = cmHandOff({ cost: v.cost, hoursSaved: v.hours, wage: rate.rate });
  return Object.assign({}, H, {
    rate,
    task: v.task || null,
    st: rate.from === "tp" || fwNow(c).real ? "Close" : "Guess",
  });
}
function mtNineOf(c) {
  const S = fwStepOf(c);
  return Object.assign({}, cmFooNine(S.step), {
    slam: S.step,
    line: typeof fwNextDollarLine === "function" ? fwNextDollarLine(c) : null,
  });
}
/* Step 1b. The net worth the game counts (cash, investments, what you owe), and the home and car you tap. */
function mtSheetOf(c) {
  const d = derive(c),
    b = mtG(c, "b1"),
    owns = c.led
      ? (c.cashes || [])
          .filter(x => !x.hold)
          .map(x => ({ k: x.k, v: +x.amt || 0, g: "cash" }))
          .concat((c.invs || []).map(x => ({ k: x.k, v: +x.amt || 0, g: "invest" })))
      : [
          { k: "Cash", v: d.cash, g: "cash" },
          { k: "Investments", v: c.inv || 0, g: "invest" },
        ],
    owes = c.led ? (c.debts || []).map(x => ({ k: x.k, v: +x.amt || 0 })) : [{ k: "What you owe", v: c.debt || 0 }],
    S = cmBalanceSheet({ owns, owes }),
    extra = [
      typeof b.home === "number" ? { k: "Your home", v: b.home, g: "home" } : null,
      typeof b.car === "number" ? { k: "Your car", v: b.car, g: "car" } : null,
    ].filter(Boolean),
    All = extra.length ? cmBalanceSheet({ owns: owns.concat(extra), owes }) : null;
  return { S, All, b, st: mtSt(c, true) };
}
/* Step 3. The money log, month by month, in hours of life at the real hourly wage. */
function mtTabOf(c) {
  const N = fwNow(c);
  return Object.assign(cmTabulate(typeof enRows === "function" ? enRows(c) : [], N.wage > 0 ? N.wage : null), {
    realWage: N.real,
  });
}

/* ---------- the views ---------- */
function mtChips(label, key, opts, cur, show) {
  return `<div class="small"><b>${esc(label)}</b></div><div class="chips">${opts
    .map(
      v =>
        `<button class="chip ${String(cur) === String(v) ? "on" : ""}" data-a="mtset" data-k="${key}" data-v="${v}" aria-pressed="${String(cur) === String(v)}">${esc(show(v))}</button>`
    )
    .join("")}</div>`;
}
const mtFrom = by =>
  `<div class="tiny muted">From: ${esc(by)}. Their idea, in the game's words. Nobody listed here made or backs this game.</div>`;
const mtBack = () => `<button class="ghost wide slim" data-a="roof">All famous money ideas</button>`;
function mtFyouSheet() {
  const c = C(),
    F = mtFyouOf(c),
    f = mtG(c, "fy"),
    tax = mtTaxable(c),
    g = F.st === "Guess";
  let h = head("Famous money ideas", "F-You money") + dkCaption("Months you could walk away from a job");
  if (!F.ready)
    return (
      h +
      dkCard("", `<div class="small muted">Add what you spend in a month in My Money and the meter fills in.</div>`) +
      mtBack()
    );
  h +=
    dkStatRow([
      dkTile("Months you could walk away", mtMo(F.months), { guess: g, sub: F.st }),
      dkTile("On a noodle budget", F.onFloor == null ? "Set it up" : mtMo(F.onFloor), {
        act: "noodle",
        sub: F.onFloor == null ? "Bare bones" : "months",
      }),
      dkTile("You could reach", money(F.reach), { sub: "without a penalty" }),
      dkTile("A month without the job", money(F.walk)),
    ]) +
    dkCard(
      "The meter",
      dkProgress(F.months == null ? 100 : Math.min(100, (F.months / 24) * 100), { text: "Toward 24 months" }) +
        `<div class="chips">${F.marks.map(m => dkPill(m.m + " months" + (m.at ? " ✓" : ""), m.at ? "good" : "")).join("")}</div>` +
        `<div class="small">${F.next == null ? "Every mark is reached." : money(Math.max(0, F.toNext)) + " more reaches " + F.next + " months."}</div>`,
      { cap: "JL Collins calls it F-You money: enough set aside that a job cannot hold you." }
    ) +
    dkCard(
      "Your answers",
      mtChips("Investments you could sell without a penalty", "fy.inv", [0, "tax", 5000, 25000, 100000], f.inv, v =>
        v === 0 ? "None" : v === "tax" ? "My taxable accounts, " + money(tax) : money(v)
      ) +
        mtChips("Work costs that stop with the job, a month", "fy.work", [0, 100, 250, 500, 1000], f.work, v =>
          v ? money(v) : "None"
        ) +
        mtChips("Health cover on your own, a month", "fy.health", [0, 300, 600, 900, 1500], f.health, v =>
          v ? money(v) : "Covered another way"
        )
    ) +
    mathBox([
      "Cash " + money(F.cash) + (F.inv ? " + investments " + money(F.inv) : "") + " = " + money(F.reach),
      "A month: " +
        money(F.spending) +
        (F.counted.workCosts ? " - work costs" : "") +
        (F.counted.health ? " + health cover" : "") +
        " = " +
        money(F.walk),
      F.months == null
        ? "Nothing goes out, so it has no end"
        : money(F.reach) + " / " + money(F.walk) + " = " + mtMo(F.months) + " months",
      !F.counted.workCosts || !F.counted.health ? "A tap not given counts as nothing for now" : "",
    ]) +
    mtFrom("JL Collins, The Simple Path to Wealth");
  return h + mtBack();
}
function mtNoodleSheet() {
  const c = C(),
    Nd = mtNoodleOf(c),
    g = mtSt(c, true) === "Guess";
  let h = head("Famous money ideas", "The noodle budget") + dkCaption("The bare-bones month, if the pay stopped");
  if (!Nd.ready)
    return (
      h +
      dkCard(
        "",
        `<div class="small muted">Add your spending lines in My Money and your noodle budget fills in.</div><button class="ghost wide slim" data-a="tab" data-v="money">Open My Money</button>`
      ) +
      mtBack()
    );
  h +=
    dkStatRow([
      dkTile("Noodle budget, a month", money(Nd.noodle), { guess: g, sub: mtPc(Nd.share) + " of today" }),
      dkTile("Set aside for now", money(Nd.cut), { sub: "a month" }),
      dkTile("Your cash lasts", Nd.months == null ? "Add cash" : mtMo(Nd.months) + " months", {
        sub: Nd.monthsFull == null ? "" : mtMo(Nd.monthsFull) + " at today's spending",
      }),
    ]) +
    dkCard(
      "Keep or set aside",
      `<div class="stack" style="gap:6px">${Nd.rows
        .map(
          (r, i) =>
            `<button class="rowbtn ${r.keep ? "on" : ""}" data-a="mtkeep" data-v="${i}" aria-pressed="${r.keep}"><span style="min-width:0"><b>${esc(r.k)}</b><div class="tiny muted">${money(r.amt)} a month${r.own ? "" : ", the usual pick"}</div></span><span class="fkgo">${r.keep ? "Keep" : "Set aside"}</span></button>`
        )
        .join("")}</div>`,
      {
        cap: "Keep what keeps a roof, the lights, food, a way to get around, insurance and the minimum on each debt. Tap a line to switch it.",
      }
    ) +
    mathBox([
      "Kept: " + Nd.kept + " of " + Nd.rows.length + " lines = " + money(Nd.noodle) + " a month",
      Nd.months == null
        ? ""
        : "Cash " + money(derive(c).cash) + " / " + money(Nd.noodle) + " = " + mtMo(Nd.months) + " months",
    ]) +
    `<button class="ghost wide slim" data-a="fyou">F-You money</button>` +
    mtFrom("Tiffany Aliche, Get Good with Money");
  return h + mtBack();
}
function mtPaySheet() {
  const c = C(),
    P = mtPayOf(c),
    pre = mtG(c, "pf").pre,
    g = P.st === "Guess";
  let h = head("Famous money ideas", "Pay yourself first") + dkCaption("Savings leave before any spending");
  h +=
    dkStatRow([
      dkTile("Paid to you first, a month", money(P.monthly), { guess: g, sub: P.st }),
      dkTile("A paycheck", money(P.perPaycheck), {
        sub: (Math.round(P.paysPerMonth * 100) / 100).toFixed(2) + " paychecks a month",
      }),
      dkTile("Of what lands", P.share == null ? "Add your pay" : mtPc(P.share)),
      dkTile("Left to live on", P.left == null ? "Add your pay" : money(P.left), {
        sub:
          P.room == null
            ? ""
            : P.room >= 0
              ? money(P.room) + " after spending"
              : "spending is " + money(-P.room) + " more",
      }),
    ]) +
    dkCard(
      "In this order, every payday",
      P.parts.length
        ? `<div class="stack" style="gap:4px">${P.parts.map((p, i) => `<div class="row between small"><span>${i + 1}. ${esc(p.name)}</span><b>${money(p.monthly)}</b></div>`).join("")}<div class="row between small"><span>${P.parts.length + 1}. Bills, then everything else</span><b>${P.left == null ? "" : money(P.left)}</b></div></div>`
        : `<div class="small muted">Nothing leaves on payday yet. Wire a goal to an account and it shows here first.</div><button class="ghost wide slim" data-a="tab" data-v="goals">Open My Goals</button>`,
      { cap: "Wired goals move on their own. A part that leaves before the pay lands is not taken from it twice." }
    ) +
    dkCard(
      "Your answer",
      mtChips("Out of your pay before it lands, a month (401(k), HSA)", "pf.pre", [0, 100, 250, 500, 1000], pre, v =>
        v ? money(v) : "None"
      )
    ) +
    mathBox([
      P.parts.map(p => p.name + " " + money(p.monthly)).join(" + ") + " = " + money(P.monthly) + " a month",
      money(P.monthly) +
        " / " +
        (Math.round(P.paysPerMonth * 100) / 100).toFixed(2) +
        " paychecks = " +
        money(P.perPaycheck),
    ]) +
    mtFrom("George S. Clason, The Richest Man in Babylon");
  return h + mtBack();
}
function mtSimpleSheet() {
  const c = C(),
    S = mtSimpleOf(c),
    g = S.st === "Guess";
  let h = head("Famous money ideas", "Shockingly Simple Math") + dkCaption("Your savings rate sets your working years");
  h +=
    dkStatRow([
      dkTile("Your savings rate", S.you ? mtPc(S.you.rate) : "Nothing kept yet", { guess: g }),
      dkTile("From $0, work is optional in", S.you ? mtYr(S.you.years) : "Open a gap", { guess: g }),
      dkTile("At " + mtPc(S.next.rate), mtYr(S.next.years), {
        sub: S.gain != null ? (Math.round(S.gain * 10) / 10).toFixed(1) + " years sooner" : "the next step",
      }),
      dkTile("On your own numbers", S.own == null ? "No date yet" : S.own + " years", {
        sub: "with what you have invested",
      }),
    ]) +
    dkCard(
      "Years to work optional, by savings rate",
      dkBars(
        S.curve.filter((p, i) => i % 2 === 1).map(p => ({ l: mtPc(p.rate), v: [p.years == null ? 70 : p.years] })),
        ["Years from $0"]
      ),
      { cap: "Each bar starts from $0. Keeping more of your pay shortens the years from both ends." }
    ) +
    mathBox([
      "Invest your savings rate of take-home each month, growing " +
        (Math.round(R * 1000) / 10).toFixed(1) +
        "% a year after inflation",
      "Until it reaches the rest of take-home x 12 / " + (SWR * 100).toFixed(1) + "%",
      "Take-home cancels out: only the rate, the return and the withdrawal rate matter",
    ]) +
    mtFrom("Mr. Money Mustache, The Shockingly Simple Math Behind Early Retirement (2012)");
  return h + mtBack();
}
function mtHandSheet() {
  const c = C(),
    H = mtHandOf(c),
    v = mtG(c, "hv"),
    g = H.st === "Guess";
  let h =
    head("Famous money ideas", "What an hour of your time is worth") + dkCaption("Use it to decide what to hand off");
  h += dkStatRow([
    dkTile("Your hour", H.rate.rate ? money(H.rate.rate) : "Add your hours", {
      guess: g,
      sub: H.rate.from === "tp" ? "your own price of an hour" : H.rate.from ? "your real hourly wage" : "",
    }),
    dkTile("The help, an hour", H.perHour != null ? money(H.perHour) : "Tap below"),
    dkTile("Hours back a year", H.ready ? String(Math.round(H.yearHours)) : "Tap below"),
  ]);
  h += dkCard(
    "One task",
    mtChips("The task", "hv.task", ["Cleaning", "Laundry", "Meals", "Yard", "Errands", "Taxes"], v.task, x => x) +
      mtChips("What the help costs, a month", "hv.cost", [25, 50, 100, 150, 250, 400], v.cost, x => money(x)) +
      mtChips(
        "Hours it gives back, a month",
        "hv.hours",
        [1, 2, 4, 6, 8, 12],
        v.hours,
        x => x + (x === 1 ? " hour" : " hours")
      ) +
      (H.ready
        ? `<div class="small">${H.under ? "The help costs less an hour than your own hour: " + money(H.gap) + " of your time a month." : "The help costs more an hour than your own hour, by " + money(-H.gap) + " a month. It can still be worth it for rest."}</div>`
        : `<div class="small muted">Tap what it costs and the hours it gives back.</div>`)
  );
  if (H.ready)
    h += mathBox([
      H.hoursSaved + " hours x " + money(H.wage) + " = " + money(H.worth) + " of your time",
      money(H.worth) + " - " + money(H.cost) + " = " + money(H.gap),
      "The help: " + money(H.cost) + " / " + H.hoursSaved + " hours = " + money(H.perHour) + " an hour",
    ]);
  return (
    h +
    `<button class="ghost wide slim" data-a="hrs">Your work hours</button>` +
    mtFrom("Grant Sabatier, Financial Freedom") +
    mtBack()
  );
}
function mtNineSheet() {
  const c = C(),
    N = mtNineOf(c);
  let h =
    head("Famous money ideas", "The Financial Order of Operations") +
    dkCaption("Which of the nine steps you are on, and the next dollar");
  if (!N.ready)
    return (
      h + dkCard("", `<div class="small muted">Add your numbers in My Money and your step shows.</div>`) + mtBack()
    );
  h +=
    dkStatRow([
      dkTile("You are on", "Step " + N.n + " of 9", { sub: N.name }),
      dkTile("The game's step", esc(FW_STEP_HEAD[N.slam] || ""), { sub: N.extra ? "a step the game adds" : "" }),
    ]) +
    (N.line ? dkCard("Your next dollar", `<div class="small"><b>${esc(N.line)}</b></div>`) : "") +
    dkCard(
      "The nine steps",
      `<div class="stack" style="gap:4px">${N.rows.map(r => `<div class="row between small"><span>${r.here ? "<b>" : ""}${r.n}. ${esc(r.name)}${r.here ? "</b>" : ""}</span>${r.here ? dkPill("You are here", "good") : r.done ? dkPill("Done ✓", "") : ""}</div>`).join("")}</div>`,
      { cap: "The game adds joy before step 1 and giving after step 5. Low-interest debt is paid as you go." }
    ) +
    `<button class="ghost wide slim" data-a="nxa">Which account next</button>` +
    mtFrom("Brian Preston and Bo Hanson, The Money Guy Show");
  return h + mtBack();
}
/* The two buttons at the end of a Your Money or Your Life step (the same as features/canon.js). */
function mtDone(id) {
  const done = !!(fwX(C()).ymDone || {})[id];
  return `<button class="${done ? "ghost" : "primary"} wide slim" data-a="fwdone" data-v="${id}">${done ? "Done ✓ (tap to undo)" : "I did this step"}</button><button class="ghost wide slim" data-a="ymoyl">All nine steps</button>`;
}
function mtSheet1b() {
  const c = C(),
    M = mtSheetOf(c),
    S = M.S,
    g = M.st === "Guess",
    G1 = { cash: "Cash", invest: "Investments", home: "Your home", car: "Your car" };
  let h =
    head("Your Money or Your Life", "Step 1b: What you have to show for it") +
    dkCaption("Everything you own, and everything you owe");
  if (!S.ready)
    return h + dkCard("", `<div class="small muted">Add your cash and debts in My Money.</div>`) + mtDone("1b");
  const sheetOf = B =>
    `<div class="stack" style="gap:4px">${B.groups.map(q => `<div class="row between small"><span>${esc(G1[q.g] || q.g)}</span><b>${money(q.v)}</b></div>`).join("")}<div class="row between small"><span><b>You own</b></span><b>${money(B.own)}</b></div>${B.owes.map(x => `<div class="row between small"><span>${esc(x.k)}</span><b>${money(-x.v)}</b></div>`).join("")}<div class="row between small"><span><b>Net worth</b></span><b>${money(B.net)}</b></div></div>`;
  h +=
    dkStatRow([
      dkTile("Net worth", money(S.net), { guess: g, sub: M.st }),
      dkTile("You own", money(S.own)),
      dkTile("You owe", money(S.owe)),
      M.All ? dkTile("With your home and car", money(M.All.net), { guess: true, sub: "your own taps" }) : "",
    ]) +
    dkCard("Your balance sheet", sheetOf(S), {
      cap: "The net worth the game counts: cash, investments, and what you owe.",
    }) +
    dkCard(
      "Things you own that the game does not count",
      mtChips(
        "Your home, what it would sell for",
        "b1.home",
        [0, 150000, 300000, 450000, 600000, 900000],
        M.b.home,
        v => (v ? money(v) : "No home")
      ) +
        mtChips("Your car, what it would sell for", "b1.car", [0, 3000, 8000, 15000, 25000, 40000], M.b.car, v =>
          v ? money(v) : "No car"
        ) +
        (M.All ? sheetOf(M.All) : ""),
      { cap: "The book counts these too. The game keeps them apart from your net worth, so a guess never moves it." }
    ) +
    mathBox(["You own " + money(S.own) + " - you owe " + money(S.owe) + " = " + money(S.net)]) +
    `<button class="ghost wide slim" data-a="tab" data-v="money">Open My Money</button>`;
  return h + mtDone("1b");
}
function mtTabSheet() {
  const c = C(),
    T = mtTabOf(c),
    L = T.last;
  let h =
    head("Your Money or Your Life", "Step 3: Where it all goes") +
    dkCaption("Each month, every category, in hours of your life");
  if (!T.ready)
    return (
      h +
      dkCard(
        "The monthly tally",
        `<div class="small muted">Log what comes in and goes out, and each month adds up here.</div><button class="primary wide slim" data-a="flow" data-v="">Log money</button>`
      ) +
      mtDone("3")
    );
  const hr = v => (v == null ? "Add your hours" : Math.round(v).toLocaleString("en-US") + " hours");
  h +=
    dkStatRow([
      dkTile("Money in, " + mtMonthName(L.m), money(L.in), { sub: L.hoursIn == null ? "" : hr(L.hoursIn) }),
      dkTile("Money out", money(L.out), {
        sub: L.hoursOut == null ? "" : hr(L.hoursOut) + " of your life",
        guess: !T.realWage,
      }),
      dkTile("Kept", money(L.kept)),
    ]) +
    dkCard(
      "Every category, " + mtMonthName(L.m),
      `<div class="stack" style="gap:4px">${L.cats.map(x => `<div class="row between small"><span>${esc(x.cat)} <span class="tiny muted">${mtPc(x.share)}</span></span><b>${money(x.amt)}${x.hours == null ? "" : " · " + hr(x.hours)}</b></div>`).join("")}</div>`,
      {
        cap: T.wage
          ? "At your real hourly wage, " + money(T.wage) + " an hour."
          : "Add your work hours and each line shows the hours of life it took.",
      }
    ) +
    (T.months.length > 1
      ? dkCard(
          "Month by month",
          dkBars(
            T.months.slice(-6).map(m => ({ l: m.m.slice(5), v: [m.in, m.out] })),
            ["Money in", "Money out"]
          )
        )
      : "") +
    mathBox([
      "Hours of life = dollars / your real hourly wage" + (T.wage ? " (" + money(T.wage) + ")" : ""),
      "A month with nothing logged is left out",
    ]) +
    `<button class="ghost wide slim" data-a="flow" data-v="">Log money</button>`;
  return h + mtDone("3");
}
/* "Nov 2026" from "2026-11". */
function mtMonthName(ym) {
  return DK_MON[+String(ym).slice(5, 7) - 1] + " " + String(ym).slice(0, 4);
}

/* ---------- the spreadsheet of the plan ---------- */
function mtBook(c) {
  const F = mtFyouOf(c),
    Nd = mtNoodleOf(c),
    P = mtPayOf(c),
    rows = [];
  if (F.ready && F.walk > 0) {
    rows.push({
      id: "mt_reach",
      label: "F-You money: what you could reach",
      v: F.reach,
      note: "Cash and the investments you tapped",
    });
    rows.push({
      id: "mt_walk",
      label: "F-You money: a month without the job",
      v: F.walk,
      note: "Spending, less work costs, plus health cover",
    });
    rows.push({
      id: "mt_months",
      label: "F-You money: months you could walk away",
      v: F.months,
      f: "={mt_reach}/{mt_walk}",
    });
  }
  if (Nd.ready && Nd.noodle > 0) {
    rows.push({ id: "mt_noodle", label: "The noodle budget, a month", v: Nd.noodle, note: "The lines you keep" });
    if (Nd.months != null) {
      rows.push({ id: "mt_cash", label: "Cash", v: derive(c).cash, note: "As the game counts it" });
      rows.push({
        id: "mt_nmonths",
        label: "Months the cash lasts on the noodle budget",
        v: Nd.months,
        f: "={mt_cash}/{mt_noodle}",
      });
    }
  }
  if (P.monthly > 0) {
    rows.push({
      id: "mt_pf",
      label: "Pay yourself first, a month",
      v: P.monthly,
      note: "Wired goals and what leaves before the pay lands",
    });
    rows.push({ id: "mt_ppm", label: "Paychecks a month", v: P.paysPerMonth, note: "Your pay schedule / 12" });
    rows.push({ id: "mt_pfpay", label: "Pay yourself first, a paycheck", v: P.perPaycheck, f: "={mt_pf}/{mt_ppm}" });
  }
  return { title: "Canon meters: F-You money, the noodle budget, pay yourself first", rows };
}

/* ---------- the actions ---------- */
Object.assign(ACT, {
  fyou: () => {
    W = { kind: "fyou" };
    sheet(mtFyouSheet);
  },
  noodle: () => {
    W = { kind: "noodle" };
    sheet(mtNoodleSheet);
  },
  mtpay: () => {
    W = { kind: "mtpay" };
    sheet(mtPaySheet);
  },
  simplemath: () => {
    W = { kind: "simplemath" };
    sheet(mtSimpleSheet);
  },
  mthand: () => {
    W = { kind: "mthand" };
    sheet(mtHandSheet);
  },
  foonine: () => {
    W = { kind: "foonine" };
    sheet(mtNineSheet);
  },
  ym1b: () => {
    W = { kind: "ym1b" };
    sheet(mtSheet1b);
  },
  ym3: () => {
    W = { kind: "ym3" };
    sheet(mtTabSheet);
  },
  /* one tap of an answer: the same tap again clears it */
  mtset: t => {
    const c = C(),
      p = String(t.dataset.k || "").split("."),
      raw = t.dataset.v,
      v = raw !== "" && isFinite(+raw) ? +raw : raw;
    if (p.length !== 2 || !["fy", "pf", "hv", "b1"].includes(p[0])) return;
    const o = mtG(c, p[0]);
    if (o[p[1]] === v) delete o[p[1]];
    else o[p[1]] = v;
    save();
    drawSheet();
  },
  /* keep a line of the noodle budget, or set it aside */
  mtkeep: t => {
    const c = C(),
      Nd = mtNoodleOf(c),
      r = Nd.ready ? Nd.rows[+t.dataset.v] : null;
    if (!r) return;
    mtG(c, "nd")[r.k] = !r.keep;
    save();
    drawSheet();
  },
});
/* The rows on Famous money ideas (features/roof.js). */
if (typeof RF_LIST !== "undefined")
  RF_LIST.push(
    {
      g: "spend",
      n: "F-You money",
      by: "JL Collins, The Simple Path to Wealth",
      one: "The months you could walk away from a job.",
      a: "fyou",
      val: c => {
        const F = mtFyouOf(c);
        return [F.ready ? mtMo(F.months) + " months" : "", F.st === "Guess"];
      },
    },
    {
      g: "spend",
      n: "The noodle budget",
      by: "Tiffany Aliche, Get Good with Money",
      one: "The bare-bones month you would switch to if the pay stopped.",
      a: "noodle",
      val: c => {
        const N = mtNoodleOf(c);
        return [N.ready ? money(N.noodle) + " a month" : "", mtSt(c, true) === "Guess"];
      },
    },
    {
      g: "spend",
      n: "Pay yourself first",
      by: "George S. Clason, The Richest Man in Babylon",
      one: "Savings leave your pay before any spending.",
      a: "mtpay",
      val: c => {
        const P = mtPayOf(c);
        return [P.monthly > 0 ? money(P.monthly) + " a month" : "", P.st === "Guess"];
      },
    },
    {
      g: "retire",
      n: "Shockingly Simple Math",
      by: "Mr. Money Mustache",
      one: "Your savings rate, from $0, as years until work is optional.",
      a: "simplemath",
      val: c => {
        const S = mtSimpleOf(c);
        return [S.you && S.you.years != null ? mtYr(S.you.years) : "", S.st === "Guess"];
      },
    },
    {
      g: "time",
      n: "What an hour of your time is worth",
      by: "Grant Sabatier, Financial Freedom",
      one: "Your hour next to what the help costs an hour, to decide what to hand off.",
      a: "mthand",
      val: c => {
        const H = mtHandOf(c);
        return [H.rate.rate ? money(H.rate.rate) + " an hour" : "", H.st === "Guess"];
      },
    },
    {
      g: "invest",
      n: "The Financial Order of Operations",
      by: "Brian Preston and Bo Hanson, The Money Guy Show",
      one: "Which of the nine steps you are on, and where the next dollar goes.",
      a: "foonine",
      val: c => {
        const N = mtNineOf(c);
        return [N.ready ? "Step " + N.n + " of 9" : "", false];
      },
    }
  );
