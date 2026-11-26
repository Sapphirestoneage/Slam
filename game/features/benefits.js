/* ============================================================================
   SLAM the Game: features/benefits.js
   PURPOSE     Benefits and health (run Finish everything partly built, Part 10). One sheet in the new
               look with four tabs: (1) Worth it: what each benefit is worth in dollars a year (the HSA
               as a retirement account, the dependent care FSA and the daycare years, the ESPP,
               commuter). (2) Your employer: tap a large employer to fill the match, the vesting and the
               ESPP discount, each from its own dated source. (3) Coverage: what you may qualify for at
               your income (Medicaid, the Essential Plan in New York, the marketplace credit), the lines
               in dollars, and what a raise does to your health coverage. (4) Plans: two or three plans
               side by side, premium after the credit, deductible, out-of-pocket max.
   INPUT       The profile: c.age, c.take, c.rel, the tax view (knNet), the account advice (acRec),
               hhSize(c, true), and the answers c.x.ben (kit answers, { v, cf }) and c.x.benplans (the
               plans). The open sheet (W.kind): benefits, with W.tab.
   OUTPUT      Math: bhRead, bhRate, bhEmployerFill. Functions: benefitsBook, benefitsSheet.
               Actions (ACT): benefits, bhtab, bhset, bhsetsure, bhemp, bhplanadd, bhplandel, bhplanset.
               Menu: "Benefits and health".
   DEPENDS ON  core/benefitsplan.js (the one engine, a copy of js/math/benefitsplan.js of the web app,
               with BP_REF), core/engine.js (derive, hhSize), core/metrics.js (knNet), features/eras.js
               (acRec), features/kit.js, screens/dash.js, screens/ui.js.
   RULES       The math is in core/benefitsplan.js. The views show what it returns. Every limit and
               line comes from BP_REF with its source and date. Each number has Guess, Close or Exact,
               and a guess gets no verdict. No plan is called good or bad: the least of each year is
               named. Home is not changed here.
   STORED      c.x.ben = { [key]: { v, cf } }. c.x.benplans = [{ name, premium, deductible, oop, market }].
               Picking an employer also sets c.x.career.vSchedule (the vesting of Career and education).
   ========================================================================= */
const BH_TABS = [
  ["worth", "Worth it"],
  ["employer", "Your employer"],
  ["cover", "Coverage"],
  ["plans", "Plans"],
];
const BH_OPTS = {
  rate: [15, 20, 25, 30, 35, 40],
  hsaYou: [1000, 2000, 3000, 4500, 9000],
  hsaEmp: [0, 500, 1000, 1500],
  hsaYears: [10, 20, 30],
  receipts: [0, 250, 500, 1000, 2000],
  care: [5000, 7500, 10000, 15000, 20000],
  youngest: [0, 1, 2, 3, 5, 8, 10, 12],
  esppPut: [1200, 3000, 6000, 12000, 21250],
  esppDisc: [5, 10, 15],
  commute: [0, 50, 100, 150, 250, 350],
  size: [1, 2, 3, 4, 5, 6],
  adults: [1, 2],
  magi: [20000, 30000, 45000, 60000, 80000, 120000],
  raise: [1000, 2500, 5000, 10000],
  premium: [0, 150, 300, 450, 600, 800],
  deductible: [0, 500, 1500, 3000, 5000, 7500],
  oop: [3000, 5000, 7500, 9000, 10600],
};
const BH_STATES = [
  ["NY", "New York"],
  ["CA", "California"],
  ["TX", "Texas"],
  ["FL", "Florida"],
  ["other", "Another state"],
];
/* One answer of the screen: the value and its Guess / Close / Exact. */
function bhVal(c, key, fallback) {
  return kitValue(c, "ben", key, fallback);
}
/* The rate one pre-tax dollar saves, in %: the player's tap, else the game's own income tax rate today
   (acRec) plus Social Security and Medicare (BP_REF.tax), as a Guess. */
function bhRate(c) {
  let now = 22;
  try {
    now = Math.round(acRec(c).rNow * 100);
  } catch (e) {
    report(e, "benefits.js: bhRate");
  }
  const fica = (BP_REF.tax.socialSecurityRate + BP_REF.tax.medicareRate) * 100;
  return { r: bhVal(c, "rate", Math.round((now + fica) * 10) / 10), fica };
}
/* Everything the sheet shows, from the one engine. */
function bhRead(c) {
  const Rr = bpRules(BP_REF),
    t = bhRate(c),
    rate = t.r.v / 100,
    v = k => bhVal(c, k, null),
    st = list => kitState(list),
    hsaIn = {
      cover: v("hsaCover"),
      you: v("hsaYou"),
      emp: bhVal(c, "hsaEmp", 0),
      years: v("hsaYears"),
      rec: bhVal(c, "receipts", 0),
    },
    hsa = bpHsa(
      {
        cover: hsaIn.cover.v,
        age: c.age,
        you: hsaIn.you.v,
        employer: hsaIn.emp.v,
        rate,
        years: hsaIn.years.v,
        growth: R,
        receipts: hsaIn.rec.v,
      },
      Rr
    ),
    dcIn = { care: v("care"), young: v("youngest") },
    dcfsa = bpDcfsa({ care: dcIn.care.v, ages: dcIn.young.v == null ? [] : [dcIn.young.v], rate, separate: false }, Rr),
    esIn = { put: v("esppPut"), disc: v("esppDisc") },
    espp = bpEspp(
      { put: esIn.put.v, discount: esIn.disc.v == null ? null : esIn.disc.v / 100, rate: rate - t.fica / 100 },
      Rr
    ),
    coIn = v("commute"),
    commuter = bpCommuter({ monthly: coIn.v, rate }, Rr),
    gross = Math.round((knNet(c).gross * 12) / 1000) * 1000,
    cv = {
      state: bhVal(c, "state", null),
      size: bhVal(c, "size", hhSize(c, true)),
      adults: bhVal(c, "adults", c.rel === "Married" ? 2 : 1),
      magi: bhVal(c, "magi", gross || null),
      raise: v("raise"),
    },
    cx = {
      state: cv.state.v === "other" ? null : cv.state.v,
      size: cv.size.v,
      adults: cv.adults.v,
      magi: cv.magi.v,
    },
    cover = bpEligible(cx, Rr),
    cliff = bpHealthCliff(Object.assign({ raise: cv.raise.v }, cx), Rr),
    plans = bpPlans((c.x && c.x.benplans) || [{}, {}], {
      help: cover.ready && cover.now.on === "aca" ? cover.now.help : null,
    });
  /* the four together: the engine adds up the ready ones */
  const sum = bpSum([hsa, dcfsa, espp, commuter]);
  return {
    t,
    rate,
    hsa,
    dcfsa,
    espp,
    commuter,
    sum,
    cover,
    cliff,
    plans,
    cv,
    st: {
      hsa: st([t.r, hsaIn.cover, hsaIn.you, hsaIn.emp]),
      dcfsa: st([t.r, dcIn.care, dcIn.young]),
      espp: st([t.r, esIn.put, esIn.disc]),
      commuter: st([t.r, coIn]),
      cover: st([cv.size, cv.adults, cv.magi]),
    },
  };
}
/* Tapping an employer: the ESPP discount and the vesting of Career and education, from the row's own fields.
   A field the row does not have is left as it was. */
function bhEmployerFill(c, id) {
  const e = bpEmployer(id, bpRules(BP_REF));
  if (!e) return null;
  const B = kitStore(c, "ben");
  B.employer = { v: id, cf: 2 };
  if (e.fills.esppDiscount != null) B.esppDisc = { v: Math.round(e.fills.esppDiscount * 100), cf: 2 };
  if (e.fills.vest) kitStore(c, "career").vSchedule = { v: e.fills.vest, cf: 2 };
  return e;
}
function benefitsBook(c) {
  const B = bhRead(c),
    rows = [];
  if (B.hsa.ready)
    rows.push(
      {
        id: "bh_hsa_put",
        label: "HSA: what you put in that counts, a year",
        v: B.hsa.put,
        note: "Your answer, up to the limit",
      },
      { id: "bh_rate", label: "Tax on a pre-tax dollar, %", v: B.t.r.v, note: "Your answer" },
      { id: "bh_hsa_emp", label: "HSA: what your employer puts in, a year", v: B.hsa.employer, note: "Your answer" },
      { id: "bh_hsa", label: "HSA: worth a year", v: B.hsa.yearly, f: "={bh_hsa_put}*{bh_rate}/100+{bh_hsa_emp}" }
    );
  if (B.dcfsa.ready)
    rows.push(
      {
        id: "bh_dc_put",
        label: "Dependent care FSA: care that counts, a year",
        v: B.dcfsa.put,
        note: "Your answer, up to the limit",
      },
      {
        id: "bh_dc",
        label: "Dependent care FSA: worth a year",
        v: B.dcfsa.yearly,
        f: "={bh_dc_put}*" + B.t.r.v + "/100",
      }
    );
  if (B.espp.ready)
    rows.push(
      { id: "bh_es_put", label: "ESPP: what you put in that counts, a year", v: B.espp.put, note: "Your answer" },
      {
        id: "bh_es_gain",
        label: "ESPP: the discount as a gain",
        v: B.espp.gain,
        note: "put in / (1 - discount) - put in",
      },
      { id: "bh_es", label: "ESPP: worth a year after tax", v: B.espp.yearly, note: "the gain less the tax on pay" }
    );
  if (B.commuter.ready)
    rows.push(
      {
        id: "bh_co_cov",
        label: "Commuter: paid before tax, a year",
        v: B.commuter.covered,
        note: "a month up to the limit x 12",
      },
      { id: "bh_co", label: "Commuter: worth a year", v: B.commuter.yearly, f: "={bh_co_cov}*" + B.t.r.v + "/100" }
    );
  return { title: "Benefits and health", rows };
}

/* ---------- views ---------- */
kitTerms({
  bhhsa: [
    "HSA as a retirement account",
    "A health savings account goes in before tax, grows tax free and comes out tax free for care. Invest it and pay care from your pocket now, keep the receipts, and you can take that money out tax free in any later year.",
  ],
  bhdcfsa: [
    "Dependent care FSA",
    "Pay for child care for a child under 13 with money taken from your pay before tax. The child care credit on your return cannot count the same dollars.",
  ],
  bhespp: [
    "ESPP",
    "An employee stock purchase plan: money from your pay buys your company's stock at a discount, at most 15% off. Sold right away, the discount is the gain.",
  ],
  bhcover: [
    "The coverage lines",
    "Medicaid covers adults up to 138% of the poverty line in the states that expanded it. In New York the Essential Plan is free up to 200%. The marketplace credit helps up to 400%.",
  ],
  bhoop: [
    "Out-of-pocket max",
    "The most you pay for covered care in a plan year, with the deductible in it. After that the plan pays all of it.",
  ],
});
kitScreen(
  "benefits",
  "Benefits and health",
  "What your benefits are worth, your employer's numbers, the coverage you may get, plans side by side.",
  "Each limit shows where it comes from. Nothing here changes your plan."
);
function bhAsk(c, key, label, opts, fallback, o) {
  return kitAsk(c, "ben", key, label, opts, fallback == null ? "" : fallback, Object.assign({ act: "bhset" }, o || {}));
}
const bhYr = v => money(v) + " a year";
function bhWorthTab(c, B) {
  const H = B.hsa,
    D = B.dcfsa,
    E = B.espp,
    M = B.commuter,
    need = P => `<div class="tiny muted">Tap ${esc(P.needs.join(", "))}.</div>`;
  let h = bhAsk(
    c,
    "rate",
    "Tax on your last dollar, with Social Security and Medicare",
    BH_OPTS.rate.map(v => [v, v + "%"]),
    B.t.r.v,
    {
      help: "A guess from your pay until you tap yours.",
    }
  );
  h += dkCard(
    "HSA as a retirement account",
    (H.ready
      ? `<div class="small">${money(H.taxSaved)} less tax and ${money(H.employer)} from your employer.${H.grows != null ? " Invested, " + money(H.each) + " a year grows to about " + money(H.grows) + " in " + H.years + " years, in today's money." : ""}${H.receiptsBank ? " Receipts you keep: " + money(H.receiptsBank) + " to take out tax free later." : ""}${H.over > 0 ? " Over your limit by " + money(H.over) + ": that part does not count." : ""}</div>`
      : need(H)) +
      bhAsk(c, "hsaCover", "Your cover", [
        ["self", "Just me"],
        ["family", "Me and family"],
      ]) +
      bhAsk(
        c,
        "hsaYou",
        "You put in a year",
        BH_OPTS.hsaYou.map(v => [v, money(v)]),
        null,
        { typed: true }
      ) +
      bhAsk(
        c,
        "hsaEmp",
        "Your employer puts in a year",
        BH_OPTS.hsaEmp.map(v => [v, money(v)]),
        0,
        { typed: true }
      ) +
      bhAsk(
        c,
        "hsaYears",
        "Left invested for",
        BH_OPTS.hsaYears.map(v => [v, v + " years"])
      ) +
      bhAsk(
        c,
        "receipts",
        "Care you pay yourself a year, receipts kept",
        BH_OPTS.receipts.map(v => [v, money(v)]),
        0
      ) +
      mathBox([
        "What you put in, up to the limit less your employer's part, x your tax rate, plus your employer's dollars.",
        "Limits for " +
          BP_REF.benefits.planYear +
          ": " +
          money(BP_REF.benefits.hsa.self) +
          " just you, " +
          money(BP_REF.benefits.hsa.family) +
          " family, " +
          money(BP_REF.benefits.hsa.catchUp55) +
          " more at 55.",
        "Invested: each year's money grows 7% a year after inflation. A long-run average, not a promise.",
        BP_REF.benefits.hsa.source + ".",
      ]),
    { right: kitPill(H.ready ? B.st.hsa : "Guess") + ib("term:bhhsa"), cap: H.ready ? bhYr(H.yearly) : null }
  );
  h += dkCard(
    "Dependent care FSA",
    (D.ready
      ? `<div class="small">${money(D.put)} of care before tax saves ${bhYr(D.yearly)}, for ${D.years} more years before your youngest turns ${D.ageUnder}: about ${money(D.total)} in all.</div>`
      : need(D)) +
      bhAsk(
        c,
        "care",
        "Child care a year",
        BH_OPTS.care.map(v => [v, money(v)]),
        null,
        { typed: true }
      ) +
      bhAsk(
        c,
        "youngest",
        "Your youngest child's age",
        BH_OPTS.youngest.map(v => [v, v === 0 ? "Under 1" : String(v)])
      ) +
      mathBox([
        "The care, up to " +
          money(BP_REF.benefits.dcfsa.limit) +
          ", x your tax rate, for each year until the youngest turns " +
          BP_REF.benefits.dcfsa.ageUnder +
          ".",
        "The child care credit on your return is not counted here, and the same dollar cannot count for both.",
        BP_REF.benefits.dcfsa.source + ".",
      ]),
    { right: kitPill(D.ready ? B.st.dcfsa : "Guess") + ib("term:bhdcfsa"), cap: D.ready ? bhYr(D.yearly) : null }
  );
  h += dkCard(
    "ESPP",
    (E.ready
      ? `<div class="small">${money(E.put)} buys stock worth ${money(E.stock)}: ${money(E.gain)} more, ${bhYr(E.yearly)} after tax if sold when you buy.${E.over > 0 ? " The law caps it at " + money(E.cap) + " of stock a year." : ""} Holding the stock is a bet on one company.</div>`
      : need(E)) +
      bhAsk(
        c,
        "esppPut",
        "You put in a year",
        BH_OPTS.esppPut.map(v => [v, money(v)]),
        null,
        { typed: true }
      ) +
      bhAsk(
        c,
        "esppDisc",
        "The discount",
        BH_OPTS.esppDisc.map(v => [v, v + "%"])
      ) +
      mathBox([
        "What you put in ÷ (1 - the discount) buys the stock. The gain is taxed as pay, with no Social Security or Medicare.",
        "At most " + money(BP_REF.benefits.espp.cap) + " of stock a year, and a discount of 15% at most.",
        BP_REF.benefits.espp.source + ".",
      ]),
    { right: kitPill(E.ready ? B.st.espp : "Guess") + ib("term:bhespp"), cap: E.ready ? bhYr(E.yearly) : null }
  );
  h += dkCard(
    "Commuter",
    (M.ready ? `<div class="small">${money(M.covered)} a year before tax saves ${bhYr(M.yearly)}.</div>` : need(M)) +
      bhAsk(
        c,
        "commute",
        "Transit or parking a month",
        BH_OPTS.commute.map(v => [v, money(v)]),
        null,
        { typed: true }
      ) +
      mathBox([
        "Up to " + money(BP_REF.benefits.commuterMonthly) + " a month x 12 x your tax rate.",
        BP_REF.benefits.commuterSource + ".",
      ]),
    { right: kitPill(M.ready ? B.st.commuter : "Guess"), cap: M.ready ? bhYr(M.yearly) : null }
  );
  return h;
}
function bhEmployerTab(c) {
  const Rr = bpRules(BP_REF),
    list = bpEmployers(Rr),
    cur = bhVal(c, "employer", null).v,
    e = cur ? bpEmployer(cur, Rr) : null;
  return (
    dkCard(
      "Tap your employer",
      `<div class="chips">${list.map(x => `<button class="chip ${cur === x.id ? "on" : ""}" data-a="bhemp" data-v="${esc(x.id)}">${esc(x.name)}</button>`).join("")}</div><div class="tiny muted">${list.length} large employers, each from its own benefits page or SEC filing. Not listed? Tap your own numbers on Worth it.</div>`
    ) +
    (e
      ? dkCard(
          e.name,
          `<div class="small"><b>Match:</b> ${esc(e.match)}.${e.fullAt > 0 && e.fullAt < 1 ? " Put in " + kitPct(e.fullAt) + " of pay to get all of it." : ""}</div>` +
            (e.empty.length
              ? `<div class="tiny muted">Not found in a dated source, so left for you: ${esc(e.empty.map(k => ({ tiers: "the match", vest: "the vesting", esppDiscount: "an ESPP", hsaEmployer: "an HSA contribution" })[k]).join(", "))}.</div>`
              : "") +
            `<div class="tiny muted">Filled: ${esc([e.fills.esppDiscount != null ? "the ESPP discount (Worth it)" : null, e.fills.vest ? "the vesting (Career and education)" : null].filter(Boolean).join(", ") || "nothing to fill")}.</div>` +
            mathBox(e.sources.map(s => s.what + ": " + s.source + (s.read ? " (read " + s.read + ")" : "") + "."))
        )
      : "")
  );
}
function bhCoverTab(c, B) {
  const E = B.cover,
    L = B.cliff;
  let h = dkCard(
    "What you may qualify for",
    (E.ready
      ? `<div class="small">At ${money(E.magi)} a year, you may qualify for <b>${esc(E.on)}</b>${E.now.on === "aca" ? ": the credit is about " + money(E.now.help) + " a year, so the benchmark plan costs you about " + money(E.now.cost) : ""}.</div>` +
        igRows(E.lines.map(l => [esc(l.name), "up to " + money(l.upTo) + " a year"])) +
        (E.next
          ? `<div class="tiny muted">${esc(E.next.name)} ends ${money(E.toNext)} above what you make now.</div>`
          : "") +
        `<div class="tiny muted">Plan year ${E.plan}. These are the income lines only; the program decides on your application.</div>`
      : `<div class="tiny muted">Tap ${esc(E.needs.join(", "))}.</div>`) +
      mathBox([
        "The poverty line for " +
          (E.ready ? E.h.size : "your household") +
          (E.ready ? ": " + money(E.fpl) + " a year (HHS 2026)." : "."),
        "Medicaid to 138% in states that expanded it, the Essential Plan to 200% in New York (free since July 1 2026), the marketplace credit to 400%.",
        "The credit: the benchmark plan less the share of income you pay at your multiple of the line (IRS table for 2027).",
      ]),
    { right: kitPill(E.ready ? B.st.cover : "Guess") + ib("term:bhcover") }
  );
  h += bhAsk(c, "state", "Where you live", BH_STATES, null, {
    help: "Another state counts as one that expanded Medicaid, at the US average price.",
  });
  h += bhAsk(
    c,
    "size",
    "People in your tax household",
    BH_OPTS.size.map(v => [v, String(v)]),
    B.cv.size.v
  );
  h += bhAsk(
    c,
    "adults",
    "Adults who need coverage",
    BH_OPTS.adults.map(v => [v, String(v)]),
    B.cv.adults.v
  );
  h += bhAsk(
    c,
    "magi",
    "What you make a year, before tax",
    BH_OPTS.magi.map(v => [v, money(v)]),
    B.cv.magi.v,
    { typed: true }
  );
  h += dkCard(
    "What a raise does to your coverage",
    (L.ready
      ? `<div class="small">${L.from === L.to ? "A " + money(L.raise) + " raise keeps you on " + esc(L.fromWords) + (L.extra > 0.5 ? ", and coverage costs " + money(L.extra) + " more a year" : "") + "." : "A " + money(L.raise) + " raise moves you from " + esc(L.fromWords) + " to " + esc(L.toWords) + (L.extra > 0.5 ? ", about " + money(L.extra) + " more a year" : "") + "."} ${L.net < -0.5 ? "After coverage you keep " + money(L.net) + " less" + (L.even ? ", until the raise is " + money(L.even) : "") + "." : "After coverage you keep " + money(L.net) + " more."}</div><div class="tiny muted">Coverage only, before tax. The web app's Raise and benefits adds food help, the EITC and child care.</div>`
      : `<div class="tiny muted">Tap ${esc(L.needs.join(", "))}.</div>`) +
      bhAsk(
        c,
        "raise",
        "A raise to test, a year",
        BH_OPTS.raise.map(v => [v, money(v)]),
        null,
        { typed: true }
      )
  );
  return h;
}
function bhPlansTab(c, B) {
  const P = B.plans,
    plans = (c.x && c.x.benplans) || [{}, {}],
    seg = (i, k, opts, cur) =>
      `<div class="chips">${opts.map(v => `<button class="chip ${cur === v ? "on" : ""}" data-a="bhplanset" data-k="${i}|${k}" data-v="${v}">${money(v)}</button>`).join("")}</div>`,
    col = (p, i) => {
      const r = P.rows[i] || {};
      return {
        title: p.name || "Plan " + (i + 1),
        big: r.ready ? money(r.year) + " a year" : "Tap yours",
        guess: !r.ready,
        rows: r.ready
          ? [
              ["Light year", money(r.light) + (P.cheapest.light === i ? " · least" : "")],
              ["Typical year", money(r.typical) + (P.cheapest.typical === i ? " · least" : "")],
              ["Heavy year", money(r.heavy) + (P.cheapest.heavy === i ? " · least" : "")],
            ]
          : null,
        html:
          `<div class="tiny muted">Premium a month, before any credit</div>${seg(i, "premium", BH_OPTS.premium, p.premium)}` +
          `<div class="tiny muted">Deductible</div>${seg(i, "deductible", BH_OPTS.deductible, p.deductible)}` +
          `<div class="tiny muted">Out-of-pocket max ${ib("term:bhoop")}</div>${seg(i, "oop", BH_OPTS.oop, p.oop)}` +
          `<div class="seg"><button class="${p.market === true ? "on" : ""}" data-a="bhplanset" data-k="${i}|market" data-v="1">Marketplace</button><button class="${p.market === false ? "on" : ""}" data-a="bhplanset" data-k="${i}|market" data-v="0">Through work</button></div>` +
          (plans.length > 2
            ? `<button class="ghost slim" data-a="bhplandel" data-v="${i}">Remove this plan</button>`
            : ""),
      };
    };
  return dkCard(
    "Plans side by side",
    `<div class="tiny muted">Tap the premium, deductible and out-of-pocket max of each plan. Your summary of benefits (SBC) has all three.${B.cover.ready && B.cover.now.on === "aca" ? " A marketplace plan counts your credit of " + money(B.cover.now.help) + " a year." : ""}</div>` +
      kitColumns(plans.map(col)) +
      (plans.length < 3 ? `<button class="ghost wide slim" data-a="bhplanadd">Add a third plan</button>` : "") +
      mathBox([
        "Premiums a year: the premium x 12, less the credit on a marketplace plan (never past the premium).",
        "Light year: premiums alone. Typical year: premiums and the deductible. Heavy year: premiums and the out-of-pocket max.",
        "Copays before the deductible are not counted.",
      ])
  );
}
function benefitsSheet() {
  const c = C(),
    tab = (W && W.tab) || "worth",
    B = bhRead(c),
    best = B.plans.ready ? B.plans.rows[B.plans.cheapest.typical] : null;
  let h =
    head("Money", "Benefits and health") +
    dkCaption("What your benefits are worth, and the coverage you may qualify for") +
    dkStatRow([
      dkTile("Benefits a year", B.sum.ready ? money(B.sum.yearly) : "Tap yours", {
        sub: B.sum.ready ? B.sum.of + " of 4 worked out" : "on Worth it",
        guess: true,
      }),
      dkTile(
        "Coverage",
        B.cover.ready ? esc(BP_ON[B.cover.now.on].replace(/^the /, "").replace(/^a /, "")) : "Tap yours",
        {
          sub: B.cover.ready ? "at " + money(B.cover.magi) + " a year" : "on Coverage",
          guess: B.st.cover === "Guess",
        }
      ),
      dkTile("Next line", B.cover.ready && B.cover.next ? money(B.cover.toNext) : "–", {
        sub: B.cover.ready && B.cover.next ? "more a year to " + B.cover.next.name.toLowerCase() : "no line ahead",
      }),
      dkTile("Least in a typical year", best ? money(best.typical) : "–", {
        sub: best ? best.name : "compare two plans",
      }),
    ]) +
    kitTabs("bhtab", tab, BH_TABS);
  if (tab === "worth") h += bhWorthTab(c, B);
  else if (tab === "employer") h += bhEmployerTab(c);
  else if (tab === "cover") h += bhCoverTab(c, B);
  else h += bhPlansTab(c, B);
  return h + `<button class="ghost wide slim" data-a="care">Health and insurance quests</button>`;
}
Object.assign(ACT, {
  benefits: t => {
    W = { kind: "benefits", tab: (t && t.dataset && t.dataset.v) || "worth", o: {} };
    sheet(benefitsSheet);
  },
  bhtab: t => {
    if (!W || W.kind !== "benefits") return;
    W.tab = t.dataset.v;
    W.pad = null;
    drawSheet();
  },
  bhset: t => {
    kitApply(t);
    kitRedraw();
  },
  bhsetsure: t => {
    kitApplySure(t);
    kitRedraw();
  },
  bhemp: t => {
    const c = C();
    if (!bhEmployerFill(c, t.dataset.v)) return;
    kitRedraw();
  },
  bhplanadd: () => {
    const c = C();
    c.x = c.x || {};
    const P = c.x.benplans || [{}, {}];
    if (P.length < 3) c.x.benplans = P.concat([{}]);
    kitRedraw();
  },
  bhplandel: t => {
    const c = C();
    c.x.benplans = ((c.x && c.x.benplans) || []).filter((p, i) => i !== +t.dataset.v);
    kitRedraw();
  },
  bhplanset: t => {
    const c = C(),
      p = String(t.dataset.k).split("|"),
      i = +p[0],
      k = p[1];
    c.x = c.x || {};
    const P = (c.x.benplans || [{}, {}]).map(x => Object.assign({}, x));
    if (!P[i] || !["premium", "deductible", "oop", "market"].includes(k)) return;
    const v = k === "market" ? t.dataset.v === "1" : +t.dataset.v;
    P[i][k] = P[i][k] === v ? null : v; /* a second tap clears it */
    c.x.benplans = P;
    kitRedraw();
  },
});
kitMenu(
  "Benefits and health",
  "benefits",
  "What your benefits are worth, your employer's numbers, the coverage you may qualify for, plans side by side",
  "care"
);
