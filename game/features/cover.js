/* ============================================================================
   SLAM the Game: features/cover.js
   PURPOSE     Insurance needs. In place of the yes / no checks, each kind of cover gets a needs
               calculation, the gap in dollars, and one next step: disability (about 60% of pay, and how
               long the cushion lasts without it), life (only when someone depends on the player),
               renters or home and auto (have it, and the deductible next to the small cushion), umbrella
               (a flag past a net worth or an income line), long-term care (a flag only, at 50 and up).
   INPUT       The profile: c.prot, c.deps, c.rel, c.age, c.debt, c.goals, c.x.cover (the answers). The
               open sheet (W.kind): cover. The taps of the player.
   OUTPUT      Functions: coverInputs, coverCalc, coverSync, coverRows, coverSheet, coverBook. Actions
               (ACT): cover, coverset, coversetsure. Parts of functions in other files: coverRows
               (moneyTabBase in ui.js). Menu: "Insurance needs".
   DEPENDS ON  core/engine.js, screens/ui.js, core/metrics.js (knNet), features/kit.js.
   RULES       The 60% of pay for disability is a common planning rule: most group plans pay 50% to 70%.
               The umbrella line is $500,000 of net worth or $150,000 of pay a year, a common planner
               rule of thumb. Long-term care is a flag only, with no dollar gap. A gap from a guess shows
               Guess. No red, no verdict words.
   ========================================================================= */
const COVER_DISAB = [
  ["work", "Through work"],
  ["own", "My own policy"],
  ["none", "None"],
  ["unsure", "Not sure"],
];
const COVER_SHARE = [
  [0.4, "40% of pay"],
  [0.5, "50%"],
  [0.6, "60%"],
  [0.7, "70%"],
];
const COVER_DEPS = [
  ["none", "No one"],
  ["partner", "A partner"],
  ["kids", "Kids"],
  ["both", "Partner and kids"],
  ["other", "A parent or someone else"],
];
const COVER_YEARS = [5, 10, 15, 20, 25];
const COVER_LIFE = [0, 100000, 250000, 500000, 1000000, 2000000];
const COVER_HAVE = [
  ["yes", "Yes"],
  ["no", "No"],
  ["na", "Don't need it"],
];
const COVER_DED_HOME = [250, 500, 1000, 2500, 5000];
const COVER_DED_CAR = [250, 500, 1000, 2000];
const COVER_UMBRELLA_NW = 500000;
const COVER_UMBRELLA_PAY = 150000;
const COVER_LIABILITY = 300000; /* a common liability limit on an auto or home policy */
function coverInputs(c) {
  const P = c.prot || {},
    deps0 = c.deps === "Kids" ? (c.rel === "Married" ? "both" : "kids") : c.rel === "Married" ? "partner" : "none",
    yn = (v, na) => (v === "Yes" ? "yes" : v === "No" ? "no" : v && na.test(v) ? "na" : "no");
  return {
    disab: kitValue(c, "cover", "disab", P.disab === "Yes" ? "work" : P.disab === "No" ? "none" : "unsure"),
    share: kitValue(c, "cover", "share", 0.6),
    deps: kitValue(c, "cover", "deps", P.life === "No one depends on me" ? "none" : deps0),
    years: kitValue(c, "cover", "years", c.deps === "Kids" ? 20 : 10),
    life: kitValue(c, "cover", "life", 0),
    home: kitValue(c, "cover", "home", yn(P.renters, /need/i)),
    homeDed: kitValue(c, "cover", "homeDed", 1000),
    car: kitValue(c, "cover", "car", yn(P.car, /car/i)),
    carDed: kitValue(c, "cover", "carDed", 500),
    umbrella: kitValue(c, "cover", "umbrella", "no"),
  };
}
/* THE NEEDS. Each row: { id, n, need, have, gap, st, why, next: [label, action, value], flag } */
function coverCalc(c) {
  const I = coverInputs(c),
    d = derive(c),
    gross = knNet(c).gross * 12,
    grossM = gross / 12,
    cash = d.cash,
    own = d.cash + (c.inv || 0),
    sp = Math.max(1, c.spend || 0),
    tuition = (c.goals || [])
      .filter(g => !g.done && /tuition|college|school/i.test((g.k || "") + " " + (g.n || "")))
      .reduce((a, g) => a + Math.max(0, (g.cost || 0) - (g.fund || 0)), 0),
    rows = [],
    payRow = { cf: knNet(c).known ? 2 : 1 };
  /* disability */
  {
    const has = I.disab.v === "work" || I.disab.v === "own",
      need = grossM * 0.6,
      have = has ? grossM * I.share.v : 0,
      gap = Math.max(0, need - have);
    rows.push({
      id: "disab",
      n: "Disability",
      need,
      have,
      gap,
      per: "a month",
      months: cash / sp,
      st: kitState([I.disab, has ? I.share : null, payRow].filter(Boolean)),
      why:
        "About 60% of your pay is " +
        money(Math.round(need)) +
        " a month. Without it, your cushion of " +
        money(Math.round(cash)) +
        " lasts about " +
        (cash / sp < 1 ? "less than a month" : Math.round((cash / sp) * 10) / 10 + " months") +
        ".",
      next:
        I.disab.v === "unsure"
          ? ["Ask HR for the disability plan summary", "cover", ""]
          : gap > 0
            ? ["Ask for a quote on long-term disability cover", "cover", ""]
            : ["Check that it covers your own job", "cover", ""],
    });
  }
  /* life: only when someone depends on the player */
  if (I.deps.v !== "none") {
    const need = gross * I.years.v + (c.debt || 0) + tuition,
      net = Math.max(0, need - own),
      gap = Math.max(0, net - I.life.v);
    rows.push({
      id: "life",
      n: "Life",
      need: net,
      have: I.life.v,
      gap,
      per: "",
      st: kitState([I.deps, I.years, I.life, payRow, kitSharp(c, "debt")]),
      why:
        money(Math.round(gross)) +
        " a year × " +
        I.years.v +
        " years + " +
        money(c.debt || 0) +
        " debt + " +
        money(tuition) +
        " tuition − " +
        money(Math.round(own)) +
        " you have = " +
        money(Math.round(net)) +
        ".",
      next:
        gap > 0
          ? ["Get a quote for term life of about " + money(Math.ceil(gap / 50000) * 50000), "cover", ""]
          : ["Check who is named on the policy", "cover", ""],
    });
  }
  /* renters or home, and auto: have it, and the deductible next to the small cushion */
  const dedHome = I.home.v === "yes" ? I.homeDed.v : 0,
    dedCar = I.car.v === "yes" ? I.carDed.v : 0,
    ded = dedHome + dedCar;
  if (I.home.v !== "na")
    rows.push({
      id: "home",
      n: c.home === "Own" || c.mort ? "Home" : "Renters or home",
      need: dedHome,
      have: I.home.v === "yes" ? 1 : 0,
      gap: I.home.v === "yes" ? Math.max(0, ded - cash) : 0,
      per: "",
      missing: I.home.v !== "yes",
      st: kitState([I.home, I.home.v === "yes" ? I.homeDed : null, kitSharp(c, "cash")].filter(Boolean)),
      why:
        I.home.v === "yes"
          ? "Your deductible is " +
            money(dedHome) +
            ". Your cash of " +
            money(Math.round(cash)) +
            (cash >= ded ? " covers it." : " does not cover all your deductibles yet.")
          : "No policy yet. Renters cover is often about $15 a month.",
      next:
        I.home.v === "yes"
          ? cash >= ded
            ? ["Keep your deductibles in your small cushion", "cover", ""]
            : ["Build your small cushion to " + money(ded), "node", "sf_buffer"]
          : ["Get a renters or home quote", "cover", ""],
    });
  if (I.car.v !== "na")
    rows.push({
      id: "car",
      n: "Auto",
      need: dedCar,
      have: I.car.v === "yes" ? 1 : 0,
      gap: I.car.v === "yes" ? Math.max(0, ded - cash) : 0,
      per: "",
      missing: I.car.v !== "yes",
      st: kitState([I.car, I.car.v === "yes" ? I.carDed : null, kitSharp(c, "cash")].filter(Boolean)),
      why:
        I.car.v === "yes"
          ? "Your deductible is " + money(dedCar) + ", next to " + money(Math.round(cash)) + " of cash."
          : "Auto cover is required to drive in most states.",
      next:
        I.car.v === "yes"
          ? ["Match your deductible to your cushion", "cover", ""]
          : ["Get an auto quote before you drive", "cover", ""],
    });
  /* umbrella: a flag past the net worth or pay line */
  if (d.nw >= COVER_UMBRELLA_NW || gross >= COVER_UMBRELLA_PAY) {
    const gap = I.umbrella.v === "yes" ? 0 : Math.max(0, d.nw - COVER_LIABILITY);
    rows.push({
      id: "umbrella",
      n: "Umbrella",
      need: Math.max(1000000, Math.ceil(d.nw / 1000000) * 1000000),
      have: I.umbrella.v === "yes" ? 1 : 0,
      gap,
      per: "",
      flag: true,
      st: kitState([I.umbrella, kitSharp(c, "inv")]),
      why:
        "Past " +
        money(COVER_UMBRELLA_NW) +
        " of net worth or " +
        money(COVER_UMBRELLA_PAY) +
        " of pay, a lawsuit can reach more than a usual policy limit of " +
        money(COVER_LIABILITY) +
        ".",
      next:
        I.umbrella.v === "yes"
          ? ["Check that it sits on top of your auto and home limits", "cover", ""]
          : ["Ask your auto or home insurer for a $1,000,000 umbrella quote", "cover", ""],
    });
  }
  /* long-term care: a flag only, at 50 and up */
  if ((c.age || 0) >= 50)
    rows.push({
      id: "ltc",
      n: "Long-term care",
      need: 0,
      have: 0,
      gap: 0,
      per: "",
      flag: true,
      st: "Guess",
      why: "At 50 and up, this is worth a look. The game shows no dollar gap for it.",
      next: ["Look at long-term care cover, or plan to pay from savings", "cover", ""],
    });
  return { I, rows, gross, cash, own, tuition, ded, total: rows.reduce((a, r) => a + (r.per ? r.gap * 12 : r.gap), 0) };
}
/* Keep the old protection answers in step, so the levels of the picture still count them. */
function coverSync(c) {
  const I = coverInputs(c),
    P = (c.prot = c.prot || {}),
    S = kitStore(c, "cover");
  if (S.disab)
    P.disab = I.disab.v === "work" || I.disab.v === "own" ? "Yes" : I.disab.v === "none" ? "No" : "I'll find out";
  if (S.deps && I.deps.v === "none") P.life = "No one depends on me";
  else if (S.life) P.life = I.life.v > 0 ? "Yes" : "No";
  if (S.home) P.renters = I.home.v === "yes" ? "Yes" : I.home.v === "na" ? "Don't need it" : "No";
  if (S.car) P.car = I.car.v === "yes" ? "Yes" : I.car.v === "na" ? "No car" : "No";
}
function coverGapText(r) {
  if (r.id === "ltc") return "A flag to look at";
  if (r.missing) return "No policy yet";
  if (r.id === "umbrella" && r.have) return "Covered";
  return r.gap > 0 ? money(Math.round(r.gap)) + (r.per ? " " + r.per : "") + " gap" : "No gap";
}
/* Part of moneyTabBase() in ui.js. The insurance rows: health keeps its question, each other kind shows its gap. */
function coverRows(c, prow) {
  let C2 = null;
  try {
    C2 = coverCalc(c);
  } catch (e) {
    report(e, "cover.js: coverRows");
  }
  if (!C2)
    return Object.keys(PROT_Q)
      .map(k => prow(PROT_Q[k][0], c.prot[k], "prot:" + k))
      .join("");
  return (
    prow(PROT_Q.health[0], c.prot.health, "prot:health") +
    C2.rows
      .map(
        r =>
          `<button class="rowbtn" data-a="cover"><span>${esc(r.n)} cover<div class="tiny muted">${esc(r.next[0])}</div></span><span class="row"><b class="${r.st === "Guess" ? "guess" : ""}">${coverGapText(r)}</b><span class="caret">›</span></span></button>`
      )
      .join("")
  );
}
function coverBook(c) {
  const K = coverCalc(c),
    I = K.I,
    rows = [
      { id: "cv_gross", label: "Pay before taxes, a year", v: K.gross, note: "From your key numbers" },
      { id: "cv_cash", label: "Cash you can reach", v: K.cash },
      { id: "cv_disneed", label: "Disability need, a month (60% of pay)", v: K.gross * 0.05, f: "={cv_gross}/12*0.6" },
      {
        id: "cv_cushion",
        label: "Months the cushion lasts with no pay",
        v: K.cash / Math.max(1, c.spend || 0),
        f: "={cv_cash}/" + Math.max(1, c.spend || 0),
      },
    ];
  const life = K.rows.find(r => r.id === "life");
  if (life)
    rows.push(
      { id: "cv_years", label: "Years of pay to replace", v: I.years.v },
      { id: "cv_debt", label: "Debts", v: c.debt || 0 },
      { id: "cv_tuition", label: "Tuition goals still to fund", v: K.tuition },
      { id: "cv_own", label: "Cash and investments", v: K.own },
      {
        id: "cv_lifeneed",
        label: "Life cover need",
        v: life.need,
        f: "=MAX(0,{cv_gross}*{cv_years}+{cv_debt}+{cv_tuition}-{cv_own})",
      },
      { id: "cv_lifehave", label: "Life cover you have", v: I.life.v },
      { id: "cv_lifegap", label: "Life cover gap", v: life.gap, f: "=MAX(0,{cv_lifeneed}-{cv_lifehave})" }
    );
  return { title: "Insurance needs", rows };
}
function coverSheet() {
  const c = C(),
    K = coverCalc(c),
    I = K.I;
  const ask = (key, label, opts, cur, o) =>
    kitAsk(c, "cover", key, label, opts, cur, Object.assign({ act: "coverset" }, o || {}));
  const card = r =>
    `<div class="tile stack" style="gap:4px"><div class="row between" style="gap:8px"><b>${esc(r.n)}</b><span class="row" style="gap:6px">${kitPill(r.st)}${kitInfo("cv_" + r.id)}</span></div><div class="big ${r.st === "Guess" ? "guess" : ""}">${coverGapText(r)}</div><div class="small">${esc(r.why)}</div><div class="small"><b>Next step:</b> ${r.next[1] === "cover" ? esc(r.next[0]) : `<button class="linkish" data-a="${r.next[1]}" data-v="${esc(r.next[2])}">${esc(r.next[0])}</button>`}</div></div>`;
  const by = id => K.rows.find(r => r.id === id);
  let h =
    head("Plan", "Insurance needs") +
    `<div class="small muted">What each kind of cover should do for you, and the gap in dollars. Tap what fits. A guess is fine.</div>`;
  h += card(by("disab")) + ask("disab", "Disability cover", COVER_DISAB, I.disab.v, { term: "cv_disab" });
  if (I.disab.v === "work" || I.disab.v === "own")
    h += ask("share", "How much of your pay does it pay?", COVER_SHARE, I.share.v);
  h += ask("deps", "Who depends on your income?", COVER_DEPS, I.deps.v);
  if (by("life"))
    h +=
      card(by("life")) +
      ask(
        "years",
        "Years of your pay they would need",
        COVER_YEARS.map(v => [v, v + " years"]),
        I.years.v
      ) +
      ask(
        "life",
        "Life cover you have now",
        COVER_LIFE.map(v => [v, v ? money(v) : "None"]),
        I.life.v,
        { typed: true }
      );
  else
    h += `<div class="tile small">No one depends on your income, so the game shows no life cover need. ${kitPill(kitState([I.deps]))}</div>`;
  if (by("home")) h += card(by("home"));
  h += ask("home", "Renters or home cover", COVER_HAVE, I.home.v);
  if (I.home.v === "yes")
    h += ask(
      "homeDed",
      "Its deductible",
      COVER_DED_HOME.map(v => [v, money(v)]),
      I.homeDed.v,
      { term: "deductible" }
    );
  if (by("car")) h += card(by("car"));
  h += ask(
    "car",
    "Auto cover",
    COVER_HAVE.map(x => (x[0] === "na" ? ["na", "No car"] : x)),
    I.car.v
  );
  if (I.car.v === "yes")
    h += ask(
      "carDed",
      "Its deductible",
      COVER_DED_CAR.map(v => [v, money(v)]),
      I.carDed.v,
      { term: "deductible" }
    );
  if (by("umbrella"))
    h +=
      card(by("umbrella")) +
      ask(
        "umbrella",
        "An umbrella policy",
        [
          ["yes", "I have one"],
          ["no", "Not yet"],
        ],
        I.umbrella.v,
        { term: "cv_umbrella" }
      );
  if (by("ltc")) h += card(by("ltc"));
  h += mathBox([
    "Pay before taxes: " + money(Math.round(K.gross)) + " a year, from your key numbers.",
    "Disability: 60% of pay a month, minus what your cover pays. Most group plans pay 50% to 70% of pay.",
    "Cushion with no pay: cash of " + money(Math.round(K.cash)) + " ÷ spending of " + money(c.spend || 0) + " a month.",
    by("life")
      ? "Life: pay a year × years needed + debts + tuition goals − cash and investments, minus the cover you have."
      : "Life: no one depends on your income, so there is no need.",
    "Renters or home and auto: your deductibles added up, " + money(K.ded) + ", next to your cash.",
    "Umbrella: a flag past " +
      money(COVER_UMBRELLA_NW) +
      " of net worth or " +
      money(COVER_UMBRELLA_PAY) +
      " of pay. The gap is net worth above a usual " +
      money(COVER_LIABILITY) +
      " policy limit.",
    "Long-term care: a flag only, at 50 and up.",
  ]);
  return h;
}
kitTerms({
  cv_disab: [
    "Disability cover",
    "Pays part of your pay if you get sick or hurt and cannot work. Many jobs offer it. Long-term cover is the kind that protects a career.",
  ],
  cv_life: [
    "Life cover",
    "Pays the people who depend on you if you die. Term life covers a set number of years and costs the least.",
  ],
  cv_home: [
    "Renters or home cover",
    "Pays to replace your things after a fire or theft, and covers you if someone gets hurt at your place.",
  ],
  cv_car: ["Auto cover", "Pays for damage and injuries after a crash. Most states require it."],
  cv_umbrella: [
    "Umbrella policy",
    "Extra liability cover that sits on top of your auto and home policies. It protects what you own from a large lawsuit.",
  ],
  cv_ltc: [
    "Long-term care",
    "Help with daily life for a long time, at home or in a care home. Health insurance and Medicare pay for little of it.",
  ],
  deductible: [
    "Deductible",
    "What you pay yourself before the insurance pays. A higher deductible lowers the price, so keep that much cash at hand.",
  ],
});
kitScreen(
  "cover",
  "Insurance needs",
  "What each kind of cover should do for you, in dollars.",
  "It shows the gap and one next step for each."
);
Object.assign(ACT, {
  cover: () => {
    W = { kind: "cover", o: {} };
    sheet(coverSheet);
  },
  coverset: t => {
    kitApply(t);
    coverSync(C());
    kitRedraw();
  },
  coversetsure: t => {
    kitApplySure(t);
    coverSync(C());
    kitRedraw();
  },
});
kitMenu("Insurance needs", "cover", "The gap in dollars for each kind of cover", "odds");
