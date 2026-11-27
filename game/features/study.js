/* ============================================================================
   SLAM the Game: features/study.js
   PURPOSE     Student loan plans, side by side. One small question at a time, then the federal plans
               that are open in 2026 on the same balance: Standard, IBR and RAP, and the public service
               forms when they apply. A private loan has none of these plans, and the screen says what
               the player can do.
   INPUT       The game: G.demo. The profile: c.x.sl, c.x.taxPct. The open sheet (W.kind): study. The
               taps of the player (the actions in OUTPUT).
   OUTPUT      13 functions. Actions (ACT): study, slback, slset. Menu: "Student loan plans".
   DEPENDS ON  core/engine.js, screens/ui.js, screens/planner.js, core/metrics.js, features/debts.js,
               features/ask.js.
   RULES       Income is pay before taxes, at the value of today. The game has no tax engine, thus tax
               on a forgiven balance is named but has no price. No plan is named the winner.
   STATE       c.x.sl (the answers).
   SOURCE      The rules are from the main app, examined on 2026-11-06 (SL_REF in the code). One rule
               (RAP on a small payment) is not confirmed, and the result says so.
   ========================================================================= */
const SL_REF = {
  asOf: "2026-11-06",
  poverty: { base: 15960, per: 5680 },
  ibr: { newPct: 0.1, newYears: 20, oldPct: 0.15, oldYears: 25, mult: 1.5 },
  rap: {
    bands: [
      [0, 0],
      [10000, 0.01],
      [20000, 0.02],
      [30000, 0.03],
      [40000, 0.04],
      [50000, 0.05],
      [60000, 0.06],
      [70000, 0.07],
      [80000, 0.08],
      [90000, 0.09],
      [100000, 0.1],
    ],
    min: 10,
    perDep: 50,
    match: 50,
    years: 30,
  },
  pslf: 120,
  stdYears: 10,
  tiered: [
    [0, 10],
    [25000, 15],
    [50000, 20],
    [100000, 25],
  ],
};
const SL_FIRST = ["Before July 2014", "July 2014 to June 2026", "July 2026 or later"];
function slLevel(P, apr, n) {
  if (!(P > 0) || !(n > 0)) return 0;
  const r = apr / 12;
  return r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n));
}
function slPoverty(size) {
  return SL_REF.poverty.base + SL_REF.poverty.per * Math.max(0, (size || 1) - 1);
}
function slIbr(agi, size, old, cap) {
  const R = SL_REF.ibr,
    y = Math.max(0, (old ? R.oldPct : R.newPct) * (agi - R.mult * slPoverty(size)));
  return cap != null ? Math.min(cap, y / 12) : y / 12;
}
function slRapRate(agi) {
  let r = 0;
  SL_REF.rap.bands.forEach(b => {
    if (agi > b[0]) r = b[1];
  });
  return r;
}
function slRap(agi, dep) {
  return Math.max(SL_REF.rap.min, (agi * slRapRate(agi)) / 12 - SL_REF.rap.perDep * (dep || 0));
}
function slRepay(bal, apr, pay, months, rap) {
  const r = apr / 12,
    mt = SL_REF.rap.match;
  let P = bal,
    A = 0,
    paid = 0,
    n = 0;
  while (P + A > 0.005 && n < months) {
    n++;
    const i = P * r,
      p = Math.min(pay, P + A + i);
    paid += p;
    if (rap) {
      const ti = Math.min(p, i),
        tp = p - ti,
        ex = tp < mt ? Math.min(mt, ti) : 0;
      P = Math.max(0, P - tp - ex);
    } else {
      A += i;
      const ti = Math.min(p, A);
      A -= ti;
      P = Math.max(0, P - (p - ti));
    }
  }
  const owed = P + A;
  return { months: n, paid, forgiven: owed > 0.005 ? owed : 0, paidOff: owed <= 0.005 };
}
function slPlans(s) {
  const R = SL_REF,
    apr = s.apr / 100,
    newOnly = s.first === SL_FIRST[2],
    old = s.first === SL_FIRST[0],
    made = s.pslf === "yes" ? s.made || 0 : 0,
    left = Math.max(1, R.pslf - made),
    size = s.size > 0 ? s.size : 1 + (s.mar ? 1 : 0) + (s.dep || 0);
  const tier = R.tiered.filter(t => s.bal >= t[0]).pop()[1],
    stdY = newOnly ? tier : R.stdYears,
    std = slLevel(s.bal, apr, stdY * 12),
    cap = slLevel(s.bal, apr, R.stdYears * 12),
    ibr = slIbr(s.agi, size, old, cap),
    rap = slRap(s.agi, s.dep),
    idrY = old ? R.ibr.oldYears : R.ibr.newYears;
  const row = (id, name, one, pay, months, o) => {
    o = o || {};
    const r = slRepay(s.bal, apr, pay, months, !!o.rap);
    return {
      id,
      name,
      one,
      pay,
      months: r.months,
      paid: r.paid,
      forgiven: r.forgiven,
      paidOff: r.paidOff,
      pslf: !!o.pslf,
      note: o.note || null,
    };
  };
  const rows = [
    row(
      "standard",
      newOnly ? "Standard, " + stdY + " years" : "Standard, 10 years",
      "The same payment every month until it is gone.",
      std,
      stdY * 12,
      { note: newOnly ? "This longer version does not count toward public service forgiveness." : null }
    ),
  ];
  if (!newOnly)
    rows.push(
      row(
        "ibr",
        "IBR",
        "A share of your income. What is left after " + idrY + " years is forgiven.",
        ibr,
        Math.max(1, idrY * 12 - made),
        { note: (old ? 15 : 10) + "% of income above " + money(Math.round(R.ibr.mult * slPoverty(size))) + " a year." }
      )
    );
  rows.push(
    row(
      "rap",
      "RAP",
      "A share of your whole income. What is left after 30 years is forgiven.",
      rap,
      Math.max(1, R.rap.years * 12 - made),
      {
        rap: true,
        note:
          Math.round(slRapRate(s.agi) * 100) +
          "% of your income" +
          (s.dep ? ", less " + money(R.rap.perDep * s.dep) + " a month for the people you support." : "."),
      }
    )
  );
  if (s.pslf === "yes" || s.pslf === "idk") {
    if (!newOnly)
      rows.push(
        row(
          "ibr-pslf",
          "IBR with public service forgiveness",
          "Same payment as IBR. What is left after " + left + " more payments is forgiven, tax-free.",
          ibr,
          left,
          { pslf: true }
        )
      );
    rows.push(
      row(
        "rap-pslf",
        "RAP with public service forgiveness",
        "Same payment as RAP. What is left after " + left + " more payments is forgiven, tax-free.",
        rap,
        left,
        { rap: true, pslf: true }
      )
    );
  }
  return {
    rows,
    size,
    left,
    newOnly,
    words:
      s.pslf === "yes"
        ? "You are on the public service track: " +
          left +
          " more payments that count, then what is left is forgiven, tax-free. Paying more than the plan asks does not end it sooner. It only lowers what gets forgiven."
        : s.pslf === "idk"
          ? "If your job is full time for the government or a nonprofit, public service forgiveness clears what is left after 120 payments that count, tax-free. The public service rows assume that is you."
          : "IBR and RAP forgive what is left at the end. From 2026 on, that forgiven amount is taxed as income. Public service forgiveness is not.",
  };
}
/* Run "Finish everything partly built", Part 5 (Nov 25 2026). PSLF in one card, from the rows of slPlans:
   the payments counted, the payments and years left, and what the PSLF row that pays least in all forgives.
   The same rule as pslfOf in js/math/studentloan.js. */
function slPslf(P, s) {
  const rows = P.rows.filter(r => r.pslf);
  if (s.pslf !== "yes" && s.pslf !== "idk") return null;
  if (!rows.length) return null;
  const row = rows.reduce((a, r) => (r.paid < a.paid ? r : a), rows[0]);
  return {
    counted: s.pslf === "yes" ? s.made || 0 : null,
    left: P.left,
    years: P.left / 12,
    forgiven: row.forgiven,
    paid: row.paid,
    row,
  };
}
const SL_REFI_RATES = [4, 5, 6, 7, 8];
const SL_REFI_YEARS = [5, 7, 10, 15, 20];
/* A private refinance at the player's own rate (a tap, no default, no lender), next to the federal plans.
   A level payment over its years. The game has no tax engine, so the federal side is what is paid. The
   same rule as refiOf in js/math/studentloan.js. */
function slRefi(P, bal, rate, years) {
  if (!(rate > 0) || !(years > 0) || !(bal > 0)) return null;
  const n = years * 12,
    pay = slLevel(bal, rate / 100, n),
    r = slRepay(bal, rate / 100, pay, n, false),
    fed = P.rows.reduce((a, x) => (x.paid < a.paid ? x : a), P.rows[0]),
    pslf = P.rows.filter(x => x.pslf).reduce((a, x) => (!a || x.paid < a.paid ? x : a), null),
    idr = P.rows.filter(x => x.id !== "standard"),
    low = idr.length ? idr.reduce((a, x) => (x.pay < a.pay ? x : a), idr[0]) : null,
    most = P.rows.filter(x => x.forgiven > 0.5).reduce((a, x) => (!a || x.forgiven > a.forgiven ? x : a), null);
  const gives = [
    pslf
      ? "Public service forgiveness: " +
        money(Math.round(pslf.forgiven)) +
        " forgiven tax-free after " +
        P.left +
        " more payments. A private loan has none."
      : most
        ? "Forgiveness: " +
          most.name +
          " forgives " +
          money(Math.round(most.forgiven)) +
          " at the end. A private loan has none."
        : "Forgiveness: none of the federal plans forgives anything on your numbers.",
    low
      ? "A payment set by your income: " +
        low.name +
        " asks " +
        money(Math.round(low.pay)) +
        " a month now and goes down if your pay does. A private payment stays the same."
      : null,
    "The federal pauses and the discharge if you die or become totally and permanently disabled.",
    "It cannot be undone. A private loan never turns back into a federal one.",
  ].filter(Boolean);
  return { pay, paid: r.paid, interest: r.paid - bal, months: r.months, fed, diff: r.paid - fed.paid, gives };
}
/* The spreadsheet of the plan: the household size, the PSLF card and the refinance, as rows. */
function slBook(c) {
  const s = slGet(c),
    D0 = slFromDebts(c),
    rows = [];
  if (s.who !== "federal") return { title: "Student loans", rows };
  const bal = D0 ? D0.bal : s.bal,
    apr = D0 && D0.known ? D0.apr : s.apr;
  if (!(bal > 0) || apr == null) return { title: "Student loans", rows };
  const gross = (typeof knNet === "function" ? knNet(c).gross : (c.take || 0) / 0.8) * 12,
    P = slPlans({
      bal,
      apr,
      agi: gross,
      first: s.first,
      mar: s.mar,
      dep: s.dep,
      pslf: s.pslf,
      made: s.made,
      size: s.size,
    }),
    K = slPslf(P, s),
    F = slRefi(P, bal, s.refi, s.refiY);
  rows.push({
    id: "sl_size",
    label: "Household size the income plans use",
    v: P.size,
    note: s.size > 0 ? "The size you tapped" : "You, a spouse and the people you support",
  });
  rows.push({ id: "sl_bal", label: "Federal student loans", v: Math.round(bal) });
  if (K) {
    rows.push({ id: "sl_made", label: "PSLF payments counted", v: K.counted || 0 });
    rows.push({ id: "sl_left", label: "PSLF payments to go", v: K.left, f: "=" + SL_REF.pslf + "-{sl_made}" });
    rows.push({ id: "sl_years", label: "PSLF years left", v: K.years, f: "={sl_left}/12" });
    rows.push({
      id: "sl_forgiven",
      label: "PSLF forgiven, tax-free",
      v: Math.round(K.forgiven),
      note: "A month-by-month walk of " + K.row.name,
    });
  }
  if (F) {
    const n = s.refiY * 12;
    rows.push({ id: "sl_refi", label: "Private refinance rate (your tap)", v: s.refi / 100 });
    rows.push({ id: "sl_refiy", label: "Private refinance years", v: s.refiY });
    rows.push({
      id: "sl_refipay",
      label: "Private refinance a month",
      v: F.pay,
      f: "=PMT({sl_refi}/12,{sl_refiy}*12,-{sl_bal})",
    });
    rows.push({ id: "sl_refipaid", label: "Private refinance in all", v: F.pay * n, f: "={sl_refipay}*{sl_refiy}*12" });
  }
  return { title: "Student loans", rows };
}
function slGet(c) {
  return Object.assign(
    {
      who: null,
      bal: null,
      apr: null,
      aprG: false,
      first: null,
      firstG: false,
      mar: null,
      dep: null,
      pslf: null,
      made: null,
      size: null,
      refi: null,
      refiY: null,
    },
    (c.x && c.x.sl) || {}
  );
}
function slFromDebts(c) {
  const L = (c.debts || []).filter(x => /student/i.test(x.k) && x.amt > 0);
  if (!L.length) return null;
  const bal = L.reduce((a, x) => a + x.amt, 0),
    known = L.every(x => dbRate(x).cf > 0);
  return { bal, apr: Math.round((L.reduce((a, x) => a + x.amt * dbRate(x).v, 0) / bal) * 100) / 100, known };
}
function slQs(c, s) {
  const D0 = slFromDebts(c),
    q = ["who"];
  if (s.who === "private" || s.who === "idk") return q;
  if (!D0) q.push("bal");
  if (!D0 || !D0.known) q.push("apr");
  q.push("first", "mar", "dep", "pslf");
  if (s.pslf === "yes") q.push("made");
  return q;
}
function slChips(k, opts, cur, f) {
  return `<div class="chips">${opts.map(v => `<button class="chip ${cur === v ? "on" : ""}" data-a="slset" data-k="${k}" data-v="${v}">${f(v)}</button>`).join("")}</div>`;
}
function slRows(k, opts, cur) {
  return `<div class="stack" style="gap:6px">${opts.map(o => `<button class="rowbtn ${cur === o[0] ? "sel" : ""}" data-a="slset" data-k="${k}" data-v="${o[0]}"><span>${o[1]}</span><span class="caret"><i class=chev aria-hidden=true></i></span></button>`).join("")}</div>`;
}
function slSheet() {
  const c = C(),
    w = W,
    s = w.s,
    Q = slQs(c, s),
    D0 = slFromDebts(c),
    back = w.i > 0 ? askBtn("slback", "Back one", "ghost slim") : "";
  if (s.who === "idk" && w.i >= 1)
    return (
      head("Student loans", "Find out who the loan is from") +
      `<div class="tile"><b>Not sure? Here is how to tell.</b></div><div class="stack" style="gap:6px"><div class="tile small"><b>1.</b> Go to studentaid.gov and log in.</div><div class="tile small"><b>2.</b> Every loan listed there is a federal loan, from the government.</div><div class="tile small"><b>3.</b> A loan you pay that is not on that list is a private loan.</div></div>` +
      askBtn("slset", "They are federal", "ghost", "federal") +
      askBtn("slset", "They are private", "ghost", "private") +
      askBtn("close", "I'll check and come back", "ghost")
    );
  if (s.who === "private" && w.i >= 1)
    return (
      head("Student loans", "Private loans") +
      `<div class="tile small">Private student loans do not have income-based plans or forgiveness. They work like any other loan.</div><div class="tile stack" style="gap:6px"><b>What you can do</b><div class="small">1. Put it in your debt plan with your other debts, so the game can tell you which to pay first.</div><div class="small">2. Ask the lender if a lower rate is open to you. Getting a new loan at a lower rate to replace this one is called refinancing.</div><div class="small">3. If money is tight, ask the lender about a short pause before you miss a payment.</div></div>` +
      askBtn("debtplan", "Open my debt plan", "primary go") +
      askBtn("slback", "Back one", "ghost slim")
    );
  if (w.i < Q.length) {
    const k = Q[w.i],
      top = t =>
        head("Student loans", "Compare the plans") +
        `<div class="tiny muted">Question ${w.i + 1} of ${Q.length}</div><div class="tile"><h2 style="margin:0">${t}</h2></div>`;
    if (k === "who")
      return (
        top("Who are your student loans from?") +
        askParts({
          what: "Federal loans come from the government. Private loans come from a bank or a company.",
          body: slRows(
            "who",
            [
              ["federal", "The government (federal)"],
              ["private", "A bank or a company (private)"],
              ["idk", "I don't know"],
            ],
            s.who
          ),
          why: "Only federal loans have the plans this screen compares.",
          find: "Log in at studentaid.gov. Loans listed there are federal.",
        })
      );
    if (k === "bal")
      return (
        top("How much do you still owe on them, all together?") +
        askParts({
          what: "Add up every federal student loan. Close is fine.",
          body:
            slChips("bal", [5000, 10000, 20000, 30000, 50000, 80000, 120000], s.bal, money) +
            (w.pad === "sl_bal"
              ? `<div class="val">${money(w.o.sl_bal || 0)}</div>${keypad("sl_bal")}<button class="primary wide" data-a="slset" data-k="bal" data-v="typed">Use ${money(w.o.sl_bal || 0)}</button>`
              : `<button class="ghost slim" data-a="padopen" data-k="sl_bal">Type the exact number</button>`) +
            back,
          why: "Every plan's payment and length starts from what you owe.",
          find: "studentaid.gov shows your total balance.",
        })
      );
    if (k === "apr")
      return (
        top("What yearly rate do they charge?") +
        askParts({
          what: "The extra you pay for borrowing is called interest. The yearly rate is a percent.",
          body:
            slChips("apr", [3, 4, 5, 6, 7, 8], s.aprG ? null : s.apr, v => v + "%") +
            askBtn("slset", "I don't know yet", "ghost", "aprg") +
            back,
          why: "The rate decides how fast the balance grows between payments.",
          find: "studentaid.gov lists the rate on each loan. Use the one on your biggest loan.",
        })
      );
    if (k === "first")
      return (
        top("When did you first borrow for school?") +
        askParts({
          what: "The rules are different depending on when your first loan was paid out.",
          body:
            slRows(
              "first",
              SL_FIRST.map(x => [x, x]),
              s.firstG ? null : s.first
            ) +
            askBtn("slset", "I don't know", "ghost", "firstg") +
            back,
          why: "Older borrowers and newer borrowers get different plans.",
          find: "studentaid.gov shows the date on your oldest loan.",
        })
      );
    if (k === "mar")
      return (
        top("Are you married?") +
        askParts({
          what: null,
          body:
            slRows(
              "mar",
              [
                ["1", "Yes"],
                ["0", "No"],
              ],
              s.mar == null ? null : s.mar ? "1" : "0"
            ) + back,
          why: "Some plans count the size of your household.",
          find: "Nowhere to look.",
        })
      );
    if (k === "dep")
      return (
        top("How many children or other people do you support?") +
        askParts({
          what: "People who depend on your money. Do not count yourself or a spouse.",
          body:
            slChips("dep", [0, 1, 2, 3, 4], s.dep, v => (v === 0 ? "None" : v === 4 ? "4 or more" : String(v))) + back,
          why: "Supporting people lowers the payment on some plans.",
          find: "Nowhere to look.",
        })
      );
    if (k === "pslf")
      return (
        top("Do you work full time for the government or a nonprofit?") +
        askParts({
          what: "Teachers, nurses at nonprofit hospitals, city, state and federal workers often count. This is called public service.",
          body:
            slRows(
              "pslf",
              [
                ["yes", "Yes"],
                ["no", "No"],
                ["idk", "I'm not sure"],
              ],
              s.pslf
            ) + back,
          why: "Public service workers can have what is left forgiven after 120 payments, tax-free.",
          find: "Ask your employer's HR if they are a qualifying employer for PSLF.",
        })
      );
    return (
      top("How many payments have you made while working there?") +
      askParts({
        what: "Only payments made while you worked in public service count.",
        body:
          slChips("made", [0, 24, 48, 72, 96, 108], s.made, v =>
            v === 0 ? "None yet" : v + " (" + v / 12 + " years)"
          ) + back,
        why: "You need 120 in all. The ones you have made already count.",
        find: "studentaid.gov has a PSLF payment count.",
      })
    );
  }
  const bal = D0 ? D0.bal : s.bal,
    apr = D0 && D0.known ? D0.apr : s.apr,
    gross = (typeof knNet === "function" ? knNet(c).gross : (c.take || 0) / 0.8) * 12,
    incG = !(typeof isSharp === "function" && isSharp(c, "take")) || !(c.x && c.x.taxPct),
    gs = [];
  if (incG) gs.push("your pay before taxes");
  if (s.aprG && !(D0 && D0.known)) gs.push("the rate");
  if (s.firstG) gs.push("when you first borrowed");
  const P = slPlans({
      bal,
      apr,
      agi: gross,
      first: s.first,
      mar: s.mar,
      dep: s.dep,
      pslf: s.pslf,
      made: s.made,
      size: s.size,
    }),
    yrs = n => (n % 12 === 0 ? n / 12 + (n === 12 ? " year" : " years") : (n / 12).toFixed(1) + " years"),
    K = slPslf(P, s),
    F = slRefi(P, bal, s.refi, s.refiY),
    low = P.rows.reduce((a, r) => (r.pay < a.pay ? r : a), P.rows[0]),
    least = P.rows.reduce((a, r) => (r.paid < a.paid ? r : a), P.rows[0]),
    g = gs.length > 0;
  return (
    head("Student loans", "Your plans, side by side") +
    dkCaption("Each federal plan on your balance and your pay") +
    `<div class="small muted">${money(bal)} of federal student loans at ${apr}% a year. Your pay before taxes is about ${money(Math.round(gross))} a year. A household of ${P.size}.</div>` +
    dkStatRow([
      dkTile("Household", String(P.size), {
        sub: s.size > 0 ? "the size you tapped" : "you, a spouse, the people you support",
      }),
      dkTile("Lowest a month", money(Math.round(low.pay)), { sub: low.name, guess: g }),
      dkTile("Least paid in all", money(Math.round(least.paid)), { sub: least.name, guess: g }),
      K
        ? dkTile("Forgiven, tax-free", money(Math.round(K.forgiven)), {
            sub: "after " + K.left + " more payments",
            guess: g,
          })
        : dkTile("Plans compared", String(P.rows.length), { sub: "open to your loans" }),
    ]) +
    `<div class="stack" style="gap:6px">${P.rows.map(r => dkCard(r.name, `<div class="tiny muted">${r.one}</div><div class="row between" style="gap:8px"><span class="small">Each month</span><b class="${g ? "guess" : ""}">${money(Math.round(r.pay))}</b></div><div class="row between" style="gap:8px"><span class="small">For</span><b>${yrs(r.months)}</b></div><div class="row between" style="gap:8px"><span class="small">Paid in all</span><b>${money(Math.round(r.paid))}</b></div><div class="small">${r.paidOff ? "Paid off. Nothing forgiven." : "Then " + money(Math.round(r.forgiven)) + " is forgiven" + (r.pslf ? ", tax-free." : ", and taxed as income that year.")}</div>${r.note ? `<div class="tiny muted">${r.note}</div>` : ""}`, { cls: "slrow", right: g ? dkPill("Guess") : "" })).join("")}</div>` +
    `<div class="tile small">${P.words}</div><div class="tile small">The lowest payment is not always the cheapest plan. Look at what is paid in all, and remember the tax on a forgiven balance. The game does not pick one for you here.</div>` +
    (g
      ? `<div class="tile small">Some of this rests on a guess (${gs.join(", ")}), so read the payments as rough.</div>`
      : "") +
    slSizeCard(s, P) +
    slPslfCardHtml(K, s) +
    slRefiCardHtml(F, s, P) +
    `<div class="tile small askwhy"><b>How fresh are these rules:</b> checked on Nov 6, 2026. The SAVE plan ended in March 2026. PAYE and ICR close in June 2028 and are not shown. One RAP rule, how the balance drops when a payment is small, is read from the law's wording and has not been confirmed with a worked example. Check studentaid.gov or your loan servicer before you choose.</div>` +
    mathBox([
      "Standard: a level payment that clears the balance in the plan's years.",
      "IBR: 10% (15% if you first borrowed before July 2014) of your income above one and a half times the poverty line for your household, never more than the 10-year Standard payment.",
      "RAP: 1% to 10% of your whole income, by income band, less $50 a month for each person you support, never under $10.",
      "Income is your pay before taxes, held where it is today. A raise raises these payments.",
      "Federal loans charge simple interest: unpaid interest waits beside the balance and is not added to it.",
      "A private refinance: a level payment at the rate you tapped over the years you tapped.",
    ]) +
    `<div class="row" style="gap:8px"><button class="ghost" style="flex:1" data-a="slback">Change an answer</button><button class="ghost" style="flex:1" data-a="debtplan">My debt plan</button></div>`
  );
}
/* Part of slSheet(). The household size the income plans use, with a tap for the size on the loan papers. */
function slSizeCard(s, P) {
  return dkCard(
    "Your household",
    `<div class="small">${P.size} ${P.size === 1 ? "person" : "people"}. ${s.size > 0 ? "The size you tapped." : "You, a spouse and the people you support."} IBR sets its payment on it.</div>` +
      slChips("size", [1, 2, 3, 4, 5, 6], s.size, v => (v === 6 ? "6 or more" : String(v))) +
      `<div class="tiny muted">Tap the household size on your income-driven plan papers if it is different. Tap it again to go back.</div>`,
    { cap: "Household size on your loan papers" }
  );
}
/* Part of slSheet(). PSLF: the payments counted, the payments and years left, what is forgiven. */
function slPslfCardHtml(K, s) {
  if (!K)
    return s.pslf === "no"
      ? dkCard(
          "Public service forgiveness (PSLF)",
          `<div class="small">PSLF needs a government or nonprofit employer. If that changes, tap Change an answer.</div>`
        )
      : "";
  return dkCard(
    "Public service forgiveness (PSLF)",
    dkStatRow([
      dkTile("Payments counted", K.counted == null ? "Not told" : String(K.counted)),
      dkTile("Payments to go", String(K.left)),
      dkTile("Years left", "about " + K.years.toFixed(1).replace(/\.0$/, "")),
      dkTile("Forgiven", money(Math.round(K.forgiven)), { sub: "tax-free" }),
    ]) +
      dkProgress(((K.counted || 0) / SL_REF.pslf) * 100, {
        text: (K.counted || 0) + " of " + SL_REF.pslf + " payments",
      }) +
      `<div class="small">On ${K.row.name.replace(" with public service forgiveness", "")}: ${money(Math.round(K.paid))} paid, then ${money(Math.round(K.forgiven))} forgiven, tax-free.${s.pslf === "idk" ? " This assumes your employer counts." : ""}</div>` +
      `<div class="tiny muted">The PSLF Help Tool on studentaid.gov says if your employer counts. A rule from July 1, 2026 lets the Department drop some employers. A federal court set it aside in July 2026, and the case was still going in August 2026. Checked on Nov 25, 2026.</div>`
  );
}
/* Part of slSheet(). A private refinance rate next to the federal plans, and what it gives up. */
function slRefiCardHtml(F, s, P) {
  const body =
    `<div class="small">A private lender pays off your federal loans and you owe the lender instead. Tap the rate a lender offers you. There is no default rate.</div>` +
    `<div class="tiny muted">The private rate</div>` +
    slChips("refi", SL_REFI_RATES, s.refi, v => v + "%") +
    `<div class="tiny muted">Over how many years</div>` +
    slChips("refiy", SL_REFI_YEARS, s.refiY, v => v + " years");
  if (!F) return dkCard("Refinance with a private lender", body);
  return dkCard(
    "Refinance with a private lender",
    body +
      dkStatRow([
        dkTile("Private a month", money(Math.round(F.pay))),
        dkTile("Private in all", money(Math.round(F.paid)), { sub: money(Math.round(F.interest)) + " of interest" }),
        dkTile(F.diff > 0 ? "More in all" : "Less in all", money(Math.round(Math.abs(F.diff))), {
          sub: "than " + F.fed.name,
        }),
      ]) +
      `<div class="stack" style="gap:4px"><b class="small">What you give up</b>${F.gives.map(x => `<div class="small">${x}</div>`).join("")}</div>` +
      `<div class="tiny muted">From the Consumer Financial Protection Bureau, read on Nov 25, 2026.</div>`,
    { right: dkPill("Guess") }
  );
}
Object.assign(ACT, {
  study: () => {
    const c = C();
    W = { kind: "study", i: 0, s: slGet(c), o: {} };
    sheet(slSheet);
  },
  slback: () => {
    const w = W;
    if (!w || w.kind !== "study") return;
    w.pad = null;
    w.i = Math.max(0, Math.min(w.i, slQs(C(), w.s).length) - 1);
    if (w.s.who !== "federal" && w.i === 0) w.s.who = null;
    drawSheet();
  },
  slset: t => {
    const w = W,
      c = C();
    if (!w || w.kind !== "study") return;
    const s = w.s,
      k = t.dataset.k,
      v = t.dataset.v;
    if (v === "federal" || v === "private") {
      s.who = v;
      w.i = 1;
    } else if (v === "aprg") {
      s.apr = 6;
      s.aprG = true;
      w.i++;
    } else if (v === "firstg") {
      s.first = SL_FIRST[1];
      s.firstG = true;
      w.i++;
    } else if (k === "who") {
      s.who = v;
      w.i = 1;
    } else if (k === "bal") {
      const n = v === "typed" ? +(w.o.sl_bal || 0) : +v;
      if (!(n > 0)) return;
      s.bal = n;
      w.pad = null;
      w.i++;
    } else if (k === "apr") {
      s.apr = +v;
      s.aprG = false;
      w.i++;
    } else if (k === "first") {
      s.first = v;
      s.firstG = false;
      w.i++;
    } else if (k === "mar") {
      s.mar = v === "1";
      w.i++;
    } else if (k === "dep") {
      s.dep = +v;
      w.i++;
    } else if (k === "pslf") {
      s.pslf = v;
      if (v !== "yes") s.made = null;
      w.i++;
    } else if (k === "made") {
      s.made = +v;
      w.i++;
    } else if (k === "size") {
      s.size = s.size === +v ? null : +v;
    } else if (k === "refi") {
      s.refi = s.refi === +v ? null : +v;
    } else if (k === "refiy") {
      s.refiY = s.refiY === +v ? null : +v;
    } else return;
    if (!G.demo) {
      c.x = c.x || {};
      c.x.sl = Object.assign({}, s);
      save();
    }
    drawSheet();
  },
});
if (typeof MENU !== "undefined" && Array.isArray(MENU) && !MENU.some(m => m[1] === "study")) {
  const i = MENU.findIndex(m => m[1] === "owed");
  MENU.splice(i >= 0 ? i + 1 : MENU.length, 0, [
    "Student loan plans",
    "study",
    "act",
    "A few questions, then your plans side by side",
  ]);
}
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
