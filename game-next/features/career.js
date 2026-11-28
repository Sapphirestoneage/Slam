/* ============================================================================
   SLAM the Game: features/career.js
   PURPOSE     Career and education. Five tabs on one screen: (1) Pays back: what a course or a degree
               costs with the time it takes, the raise after tax, the payback years, the lifetime value
               and the change of the freedom date, with the presets (a 4-year degree, trade school, a
               certificate, one skill). (2) Side by side: trade school and a 4-year degree. (3) Stack:
               several credentials with their dates, and the ones that overlap. (4) Vesting: the dollars
               of the match that stays with the job when a job ends early. (5) Launch window: a job hop, Roth or
               traditional now and a house hack, each as days on the freedom date.
   INPUT       The profile: c.age, c.ret, c.take, the tax view (knNet), the account advice (acRec), and the
               answers c.x.career (kit answers, { v, cf }) and c.x.crstack (the stack). The open sheet
               (W.kind): career, with W.tab.
   OUTPUT      Math: crgPath, crgFi, crgStack, crgVest, crgLaunch. Functions: careerBook, careerSheet.
               Actions (ACT): career, crtab, crset, crsetsure, crstackadd, crstackdel, crstackset.
               Menu: "Career and education".
   DEPENDS ON  core/career.js (the one engine, a copy of js/math/career.js of the web app), core/engine.js
               (goalSim through freeAt, derive), core/metrics.js (knNet), features/eras.js (acRec),
               features/kit.js, screens/dash.js, screens/ui.js.
   RULES       The math is in core/career.js. The freedom date is the game's own (freeAt), run with the
               move that the engine returns. The cost and the pay are the player's own taps: a preset is
               a sample of the time a path takes and says so. Vesting comes from the player's own match
               and schedule. Each number has Guess, Close or Exact, and a guess gets no verdict.
   ========================================================================= */
const CRG_TABS = [
  ["roi", "Pays back"],
  ["side", "Side by side"],
  ["stack", "Stack"],
  ["vest", "Vesting"],
  ["launch", "Launch window"],
];
const CRG_KINDS = ["A course", "A certificate", "A license", "A bootcamp", "A degree"];
const CRG_STARTS = [0, 3, 6, 12, 24];
const CRG_LENGTHS = [3, 6, 12, 24];
/* One answer of the screen: the value and its Guess / Close / Exact. */
function crgVal(c, key, fallback) {
  return kitValue(c, "career", key, fallback);
}
/* The rate a raise is taxed at: the player's answer, else the game's own rate today (acRec), as a Guess. */
function crgTax(c) {
  let now = 22;
  try {
    now = Math.round(acRec(c).rNow * 100);
  } catch (e) {
    report(e, "career.js: crgTax");
  }
  return crgVal(c, "taxPct", now);
}
/* (1) ONE PATH: the answers of a preset (or "own") into the engine. */
function crgPath(c, pid) {
  const P = CR_PRESETS.find(p => p.id === pid) || null,
    k = key => crgVal(c, pid + "_" + key, null),
    gross = Math.round((knNet(c).gross * 12) / 1000) * 1000,
    I = {
      cost: k("cost"),
      months: crgVal(c, pid + "_months", P ? P.months : null),
      keepPct: crgVal(c, pid + "_keepPct", P ? P.keepPct : null),
      payBefore: crgVal(c, pid + "_payBefore", gross || null),
      payAfter: k("payAfter"),
      taxPct: crgTax(c),
    },
    x = {
      cost: I.cost.v,
      months: I.months.v,
      keepPct: I.keepPct.v,
      payBefore: I.payBefore.v,
      payAfter: I.payAfter.v,
      taxPct: I.taxPct.v,
      age: c.age,
      endAge: c.ret,
    },
    R = crRoi(x),
    st = R.needs && R.needs.length ? "Guess" : kitState([I.cost, I.payBefore, I.payAfter, I.taxPct]);
  return { P, I, x, R, st, words: crRoiWords(R, x), math: crRoiMath(R, x) };
}
/* The freedom date with a move in, next to the plan's own: the change in days (negative is sooner). */
function crgFi(c, mv) {
  if (!mv || (mv.needs && mv.needs.length)) return null;
  const a = freeAt(c),
    b = freeAt(c, { flows: mv.changes || [], once: mv.once || 0 });
  return { a, b, days: crDays(a, b) };
}
/* (3) THE STACK: each credential with its months as dates from this month. */
function crgStack(c) {
  const list = (c.x && c.x.crstack) || [],
    now = todayISO().slice(0, 7),
    at = n => {
      const y = +now.slice(0, 4),
        m = +now.slice(5, 7) - 1 + n;
      return y + Math.floor(m / 12) + "-" + String((m % 12) + 1).padStart(2, "0");
    },
    items = list.map((s, i) => ({
      name: s.name + (list.filter(o => o.name === s.name).length > 1 ? " " + (i + 1) : ""),
      from: at(s.start),
      to: at(s.start + s.len - 1),
      cost: s.cost,
      raise: s.raise,
    })),
    S = crStack(items),
    tax = crgTax(c),
    P = S.raise > 0 ? crRoi({ cost: S.cost, months: 0, payBefore: 0, payAfter: S.raise, taxPct: tax.v }) : null;
  return { list, S, P, words: crStackWords(S), st: kitState([tax, { cf: list.length ? 2 : 1 }]) };
}
/* (4) VESTING: the dollars of the match that stay with the job. */
function crgVest(c) {
  const I = {
      match: crgVal(c, "vMatch", null),
      years: crgVal(c, "vYears", null),
      schedule: crgVal(c, "vSchedule", null),
      ownPct: crgVal(c, "vOwnPct", null),
    },
    x = { match: I.match.v, years: I.years.v, schedule: I.schedule.v, ownPct: I.ownPct.v },
    V = crVestLeft(x);
  return {
    I,
    x,
    V,
    st: crVestLevel(V, { matchTyped: I.match.cf >= 3, schedule: x.schedule }),
    words: crVestWords(V),
    math: crVestMath(V, x),
  };
}
/* (5) THE LAUNCH WINDOW: three moves, each as days on the freedom date. */
function crgLaunch(c) {
  const tax = crgTax(c),
    V = crgVest(c).V,
    left = V.needs && V.needs.length ? 0 : V.left;
  let later = 12;
  try {
    later = Math.round(acRec(c).rLater * 100);
  } catch (e) {
    report(e, "career.js: crgLaunch");
  }
  const I = {
      raise: crgVal(c, "hRaise", null),
      yearly: crgVal(c, "rYearly", null),
      later: crgVal(c, "rLater", later),
      rent: crgVal(c, "kRent", null),
      costs: crgVal(c, "kCosts", null),
      years: crgVal(c, "kYears", null),
    },
    hx = { raise: I.raise.v, taxPct: tax.v, left },
    rx = { yearly: I.yearly.v, nowPct: tax.v, laterPct: I.later.v },
    kx = { rent: I.rent.v, costs: I.costs.v, years: I.years.v },
    hop = crHop(hx),
    roth = crRothTrad(rx),
    hack = crHack(kx);
  return {
    I,
    tax,
    left,
    rows: [
      {
        k: "hop",
        n: "A job hop",
        M: hop,
        fi: crgFi(c, hop),
        math: crLaunchMath("hop", hop, hx),
        st: kitState([I.raise, tax]),
      },
      {
        k: "roth",
        n: "Traditional now, next to Roth",
        M: roth,
        fi: crgFi(c, roth),
        math: crLaunchMath("roth", roth, rx),
        st: kitState([I.yearly, tax, I.later]),
      },
      {
        k: "hack",
        n: "A house hack",
        M: hack,
        fi: crgFi(c, hack),
        math: crLaunchMath("hack", hack, kx),
        st: kitState([I.rent, I.costs, I.years]),
      },
    ],
  };
}
function careerBook(c) {
  const A = crgPath(c, (c.x && c.x.career && c.x.career.path && c.x.career.path.v) || "four"),
    R = A.R,
    rows = [];
  if (R.needs && R.needs.length) return { title: "Career and education", rows };
  rows.push(
    { id: "cr_yours", label: "Course or degree: what you pay", v: R.yours, note: "Your answer, less what a job pays" },
    {
      id: "cr_lost",
      label: "Pay given up while you learn, after tax",
      v: R.lostNet,
      note: "Worked out by the game (core/career.js)",
    },
    { id: "cr_total", label: "The whole price", v: R.total, f: "={cr_yours}+{cr_lost}" },
    { id: "cr_before", label: "Pay now, a year", v: A.x.payBefore, note: "Your answer" },
    { id: "cr_after", label: "Pay after it, a year", v: A.x.payAfter, note: "Your answer" },
    { id: "cr_tax", label: "Tax rate on the raise, %", v: A.x.taxPct, note: "Your answer" },
    {
      id: "cr_gain",
      label: "The raise after tax, a year",
      v: R.gainNet,
      f: "=({cr_after}-{cr_before})*(1-{cr_tax}/100)",
    }
  );
  if (R.paybackYears != null)
    rows.push({
      id: "cr_payback",
      label: "Pays back, years after you finish",
      v: R.paybackYears,
      f: "={cr_total}/{cr_gain}",
    });
  return { title: "Career and education", rows };
}
/* ---------- the screen ---------- */
function crgAsk(c, key, label, opts, fallback, o) {
  /* no fallback: an empty one, so the sure tap waits for an answer */
  return kitAsk(
    c,
    "career",
    key,
    label,
    opts,
    fallback == null ? "" : fallback,
    Object.assign({ act: "crset" }, o || {})
  );
}
function crgDays(f) {
  return f ? kitDayWords(f.days) : "Tap yours";
}
function careerSheet() {
  const c = C(),
    tab = (W && W.tab) || "roi",
    pathV = crgVal(c, "path", null).v,
    pid = pathV || "own",
    A = crgPath(c, pid),
    top = dkStatRow([
      dkTile("Pays back", A.R.paybackYears != null ? Math.round(A.R.paybackYears * 10) / 10 + " yrs" : "Tap yours", {
        guess: A.st === "Guess",
        sub: "after you finish",
      }),
      dkTile("Whole price", A.R.total != null ? money(Math.round(A.R.total)) : "Tap yours", {
        guess: A.st === "Guess",
      }),
      dkTile("Lifetime value", A.R.lifetime != null ? money(Math.round(A.R.lifetime)) : "Tap yours", {
        guess: A.st === "Guess",
        sub: "to age " + c.ret,
      }),
      dkTile("Freedom date", A.R.needs && A.R.needs.length ? "Tap yours" : crgDays(crgFi(c, A.R)), { guess: true }),
    ]);
  let h =
    head("Plan", "Career and education") +
    dkCaption("What a course or a degree pays back") +
    top +
    kitTabs("crtab", tab, CRG_TABS);
  if (tab === "roi") {
    h += dkCard(
      "What are you weighing?",
      `<div class="chips">${CR_PRESETS.map(p => `<button class="chip ${pathV === p.id ? "on" : ""}" data-a="crset" data-k="career|path" data-v="${p.id}" data-t="s">${esc(p.name)}</button>`).join("")}</div><div class="tiny muted">${esc(A.P ? A.P.sub + ". " + CR_SAMPLE : "Tap one to start from its usual length, or tap your own below.")}</div>`
    );
    h += dkCard(
      "Your answer",
      `<div class="row between"><span class="small">${esc(A.words || "Tap what it costs and the pay after it.")}</span>${kitPill(A.st)}</div>` +
        (A.math.length ? mathBox(A.math) : ""),
      {}
    );
    h += crgAsk(
      c,
      pid + "_cost",
      "What it costs, in all",
      CR_OPTS.cost.map(v => [v, money(v)]),
      null,
      { typed: true, help: "Tuition, fees, books and tools." }
    );
    h += crgAsk(
      c,
      pid + "_months",
      "How long it takes",
      CR_OPTS.months.map(v => [v, v ? v + " months" : "None"]),
      A.P ? A.P.months : null
    );
    if (A.x.months > 0)
      h += crgAsk(
        c,
        pid + "_keepPct",
        "Pay you keep while you learn",
        CR_OPTS.keepPct.map(v => [v, v === 0 ? "None, full time" : v === 100 ? "All of it" : "About half"]),
        A.P ? A.P.keepPct : null
      );
    h += crgAsk(
      c,
      pid + "_payBefore",
      "Your pay now, before taxes, a year",
      CR_OPTS.pay.map(v => [v, money(v)]),
      A.I.payBefore.v,
      { typed: true }
    );
    h += crgAsk(
      c,
      pid + "_payAfter",
      "Your pay after it, before taxes, a year",
      CR_OPTS.pay.map(v => [v, money(v)]),
      null,
      { typed: true, help: "Your own number: a job posting or an offer shows it." }
    );
    h += crgAsk(
      c,
      "taxPct",
      "The tax rate on a raise",
      CR_OPTS.taxPct.map(v => [v, v + "%"]),
      A.I.taxPct.v,
      { term: "crtax" }
    );
  } else if (tab === "side") {
    const T = crgPath(c, "trade"),
      F = crgPath(c, "four"),
      K = crCompare(T.R, F.R),
      col = (n, X) => ({
        title: n,
        big:
          X.R.paybackYears != null
            ? Math.round(X.R.paybackYears * 10) / 10 + " years"
            : X.R.needs && X.R.needs.length
              ? "Tap yours"
              : "No payback",
        guess: X.st === "Guess",
        rows:
          X.R.needs && X.R.needs.length
            ? [["Still needed", esc(X.R.needs.length + " answers")]]
            : [
                ["The whole price", money(Math.round(X.R.total))],
                ["The raise after tax", money(Math.round(X.R.gainNet)) + " a year"],
                ["Lifetime value", X.R.lifetime == null ? "Tap yours" : money(Math.round(X.R.lifetime))],
              ],
        foot: "Pays back after you finish.",
      });
    h += kitColumns([col("Trade school", T), col("A 4-year degree", F)]);
    h += `<div class="tile small">${K && K.top ? "The biggest difference is " + esc(K.top.n) + ": " + money(Math.round(K.top.diff)) + "." : "Tap Trade school, then A 4-year degree, on Pays back. Each keeps its own answers."}</div>`;
  } else if (tab === "stack") {
    const S = crgStack(c);
    h += dkCard(
      "Your credential stack",
      (S.list.length
        ? S.list
            .map(
              (s, i) =>
                `<div class="tile stack" style="gap:6px"><div class="row between"><b class="small">${esc(s.name)}</b><button class="ghost slim" data-a="crstackdel" data-v="${i}">Remove</button></div>${[
                  ["name", "What it is", CRG_KINDS.map(v => [v, v])],
                  ["start", "Starts", CRG_STARTS.map(v => [v, v ? "In " + v + " months" : "Now"])],
                  ["len", "Takes", CRG_LENGTHS.map(v => [v, v + " months"])],
                  ["cost", "Costs", CR_OPTS.cost.slice(0, 5).map(v => [v, money(v)])],
                  ["raise", "Raise a year", CR_OPTS.raise.map(v => [v, money(v)])],
                ]
                  .map(
                    q =>
                      `<div class="tiny muted">${q[1]}</div><div class="chips">${q[2].map(o => `<button class="chip sm ${s[q[0]] === o[0] ? "on" : ""}" data-a="crstackset" data-k="${i}|${q[0]}" data-v="${esc(String(o[0]))}">${esc(o[1])}</button>`).join("")}</div>`
                  )
                  .join("")}</div>`
            )
            .join("")
        : `<div class="small muted">Add each credential you plan, with its months. Two that run at the same time are flagged.</div>`) +
        `<button class="${S.list.length ? "ghost" : "primary"} wide slim" data-a="crstackadd">Add a credential</button>` +
        (S.words ? `<div class="tile small">${esc(S.words)}</div>` : "") +
        (S.list.length
          ? igRows([
              ["Months from first start to last end", String(S.S.span)],
              ["Months with learning going on", String(S.S.busy)],
              ["What they cost", money(S.S.cost)],
              ["The raises, a year", money(S.S.raise)],
              [
                "Pays back in",
                S.P && S.P.paybackYears != null ? Math.round(S.P.paybackYears * 10) / 10 + " years" : "Tap a raise",
              ],
            ])
          : ""),
      { right: kitPill(S.st) }
    );
  } else if (tab === "vest") {
    const Q = crgVest(c);
    h += dkCard(
      "Leaving before the match is yours",
      `<div class="small">${esc(Q.words || "Tap the match in your account, your years at the job and your plan's schedule.")}</div>` +
        (Q.math.length ? mathBox(Q.math) : ""),
      { right: kitPill(Q.st) }
    );
    h += crgAsk(
      c,
      "vMatch",
      "The job's match in your account now",
      CR_OPTS.match.map(v => [v, money(v)]),
      null,
      { typed: true, help: "Your statement shows it as employer or match money." }
    );
    h += crgAsk(
      c,
      "vYears",
      "Years at this job when you leave",
      CR_OPTS.years.map(v => [v, v === 0.5 ? "6 months" : v + (v === 1 ? " year" : " years")]),
      null
    );
    h += crgAsk(
      c,
      "vSchedule",
      "Your plan's vesting schedule",
      CR_VEST.map(v => [v.id, v.name]),
      null,
      { term: "crvest" }
    );
    if (Q.x.schedule === "own")
      h += crgAsk(
        c,
        "vOwnPct",
        "What your statement says is vested",
        CR_OPTS.ownPct.map(v => [v, v + "%"]),
        null
      );
  } else {
    const L = crgLaunch(c);
    h += dkCard(
      "The launch window",
      igRows(
        L.rows.map(r => [
          `${esc(r.n)} ${kitPill(r.M.needs && r.M.needs.length ? "Guess" : r.st)}`,
          r.M.needs && r.M.needs.length ? "Tap yours" : crgDays(r.fi),
        ])
      ) +
        mathBox(
          [].concat
            .apply(
              [],
              L.rows.map(r => r.math)
            )
            .concat(["Each line runs your freedom date again with that move in, next to the date you have now."])
        ),
      { cap: "Three moves early in a career, as days on the freedom date." }
    );
    h += crgAsk(
      c,
      "hRaise",
      "A job hop: the raise, before taxes, a year",
      CR_OPTS.raise.map(v => [v, money(v)]),
      null,
      { help: L.left ? "Less " + money(Math.round(L.left)) + " of the match that stays with the job (Vesting)." : "" }
    );
    h += crgAsk(
      c,
      "rYearly",
      "Roth or traditional: put in a year",
      CR_OPTS.yearly.map(v => [v, money(v)]),
      null
    );
    h += crgAsk(
      c,
      "rLater",
      "Your tax rate when you take it out",
      [0].concat(CR_OPTS.taxPct).map(v => [v, v + "%"]),
      L.I.later.v,
      { help: "Your rate now is the tax rate on Pays back." }
    );
    h += crgAsk(
      c,
      "kRent",
      "A house hack: rent coming in, a month",
      CR_OPTS.rent.map(v => [v, money(v)]),
      null
    );
    h += crgAsk(
      c,
      "kCosts",
      "What it adds to your costs, a month",
      CR_OPTS.costs.map(v => [v, money(v)]),
      null
    );
    h += crgAsk(
      c,
      "kYears",
      "For how long",
      CR_OPTS.hackYears.map(v => [v, v + (v === 1 ? " year" : " years")]),
      null
    );
  }
  return h;
}
kitTerms({
  crtax: [
    "The tax rate on a raise",
    "The share of each extra dollar of pay that goes to tax. The game starts from its own estimate of your top rate today.",
  ],
  crvest: [
    "Vesting schedule",
    "When the job's match becomes yours. A 3-year cliff gives all of it after 3 years. A 6-year graded schedule gives 20% after 2 years, then 20% more each year. Some plans give it right away.",
  ],
});
kitScreen(
  "career",
  "Career and education",
  "What a course or degree pays back, a credential stack, the match you keep, and three early moves.",
  "Each number shows its math. The cost and the pay are yours to tap."
);
Object.assign(ACT, {
  career: t => {
    W = { kind: "career", tab: (t && t.dataset && t.dataset.v) || "roi", o: {} };
    sheet(careerSheet);
  },
  crtab: t => {
    if (!W || W.kind !== "career") return;
    W.tab = t.dataset.v;
    W.pad = null;
    drawSheet();
  },
  crset: t => {
    kitApply(t);
    kitRedraw();
  },
  crsetsure: t => {
    kitApplySure(t);
    kitRedraw();
  },
  crstackadd: () => {
    const c = C();
    c.x = c.x || {};
    c.x.crstack = (c.x.crstack || []).concat([{ name: "A course", start: 0, len: 3, cost: null, raise: null }]);
    kitRedraw();
  },
  crstackdel: t => {
    const c = C();
    c.x.crstack = (c.x.crstack || []).filter((s, i) => i !== +t.dataset.v);
    kitRedraw();
  },
  crstackset: t => {
    const c = C(),
      p = String(t.dataset.k).split("|"),
      s = ((c.x && c.x.crstack) || [])[+p[0]];
    if (!s) return;
    s[p[1]] = p[1] === "name" ? t.dataset.v : +t.dataset.v;
    kitRedraw();
  },
});
kitMenu(
  "Career and education",
  "career",
  "A course or degree, a credential stack, the match that stays with the job, three early moves",
  "offers"
);
