/* ============================================================================
   SLAM the Game: features/family.js
   PURPOSE     Family money (run Not built, groups 1 to 5, Part 8). Three tabs on one screen:
               (1) Both ends: money to parents and to kids at the same time, for as long as each lasts,
               next to the freedom date and the first goal's date. (2) Living at home: the rent saved
               each month next to the time to a moving-out goal. (3) Kids and tuition: childcare (New
               York from a dated source, else the player's own number), school or yeshiva tuition, what
               to put away a month before it starts, the New York 529 deduction and the New York rule on
               K-12 tuition, and "Make it a goal". The goal type "Yeshiva tuition" (with its community
               presets, data/community-tuition.json of the web app) is added to the goal list.
   INPUT       The profile: c.take, c.spend, c.goals, the answers c.x.fam (kit answers, { v, cf }). The
               open sheet (W.kind): family, with W.tab.
   OUTPUT      Functions: famVal, famSand, famHome, famKids, famGoalTypical, familySheet. Actions (ACT):
               family, famtab, famgoal. Menu: "Family money". Goal kind: "Yeshiva tuition".
   DEPENDS ON  core/family.js (the one engine, a copy of js/math/family.js of the web app, with FM_REF
               and FM_COMMUNITY), core/career.js (crDays), core/engine.js (goalSim, GOAL_K, GOAL_ONE),
               screens/ui.js (freeAt, money, head, mathBox, sheet), screens/dash.js (dkStatRow, dkTile,
               dkCard), features/kit.js (kitAsk, kitValue, kitTabs, kitDayWords, kitState, kitMenu).
   RULES       The math is in core/family.js. The freedom date and the goal dates are the game's own
               (goalSim), run with the flows the engine returns. Every amount is the player's own tap,
               except the New York childcare row (dated, with its source) and the community presets
               (empty until Eli fills them in). Calm words: no blame, no verdict on a guess.
   ========================================================================= */
const FAM_TABS = [
  ["sand", "Both ends"],
  ["home", "Living at home"],
  ["kids", "Kids and tuition"],
];
const FAM_LONG = [
  [1, "1 year"],
  [3, "3 years"],
  [5, "5 years"],
  [10, "10 years"],
  [0, "No end in sight"],
];
const FAM_YESHIVA = "Yeshiva tuition";
/* One answer of the screen: the value and its Guess / Close / Exact. */
function famVal(c, key, fallback) {
  return kitValue(c, "fam", key, fallback);
}
function famAsk(c, key, label, opts, fallback, o) {
  return kitAsk(c, "fam", key, label, opts, fallback == null ? "" : fallback, o);
}
const famMoney = list => list.map(v => [v, money(v)]);
const famMos = m => (m >= 24 && m % 12 === 0 ? m / 12 + " years" : m + (m === 1 ? " month" : " months"));
/* (1) BOTH ENDS: the engine's answer, then the freedom date and the first placed goal with the flows in. */
function famSand(c) {
  const I = {
      parents: famVal(c, "parents", null),
      parentsYears: famVal(c, "parentsYears", 0),
      kids: famVal(c, "kids", null),
      kidsYears: famVal(c, "kidsYears", 0),
      inSpending: famVal(c, "inSpending", "no"),
    },
    R = fmSandwich({
      parents: I.parents.v,
      kids: I.kids.v,
      parentsYears: I.parentsYears.v,
      kidsYears: I.kidsYears.v,
      inSpending: I.inSpending.v === "yes",
      takeHome: c.take,
      spending: c.spend,
    });
  let fi = null,
    goal = null;
  if (R.ready && !R.inSpending) {
    try {
      const a = freeAt(c),
        b = freeAt(c, { flows: R.flows }),
        g0 = goalSim(c),
        g1 = goalSim(c, { flows: R.flows }),
        first = (c.goals || []).find(g => !g.done && g.era != null && g0.goalAt[g.id] != null);
      fi = { a, b, days: crDays(a, b) };
      if (first) goal = { n: first.n, days: crDays(g0.goalAt[first.id], g1.goalAt[first.id]) };
    } catch (e) {
      report(e, "family.js: famSand");
    }
  }
  return { I, R, fi, goal, st: kitState([I.parents, I.kids]) };
}
/* (2) LIVING AT HOME. */
function famHome(c) {
  const I = {
      rent: famVal(c, "rent", null),
      payHome: famVal(c, "payHome", 0),
      savePct: famVal(c, "savePct", 1),
      months: famVal(c, "months", null),
      target: famVal(c, "target", null),
      have: famVal(c, "have", 0),
    },
    R = fmBoomerang({
      rent: I.rent.v,
      payHome: I.payHome.v,
      savePct: I.savePct.v,
      months: I.months.v,
      target: I.target.v,
      have: I.have.v,
    });
  return { I, R, st: kitState([I.rent, I.months]) };
}
/* (3) KIDS AND TUITION. The amounts to tap: the dated childcare row, the community presets, or round amounts. */
function famYearOpts(kind, row) {
  const P = kind === "yeshiva" ? fmPresetRows(FM_COMMUNITY).flatMap(r => [r.low, r.high]) : [];
  if (row) return [row.yearly, 10000, 15000, 25000];
  if (P.length) return P.filter((v, i) => P.indexOf(v) === i);
  return kind === "college" ? [10000, 25000, 40000, 60000, 85000] : [5000, 10000, 15000, 20000, 30000];
}
function famKids(c) {
  const I = {
    kind: famVal(c, "kind", null),
    state: famVal(c, "state", "NY"),
    careAge: famVal(c, "careAge", "infant"),
    yearly: famVal(c, "yearly", null),
    nKids: famVal(c, "nKids", 1),
    years: famVal(c, "years", null),
    startIn: famVal(c, "startIn", 0),
    share: famVal(c, "share", 0.5),
    plan529: famVal(c, "plan529", "none"),
    nyRate: famVal(c, "nyRate", null),
  };
  const row = I.kind.v === "care" ? fmCareRow(FM_REF.childcare, I.state.v, I.careAge.v) : null,
    T = fmSchool({
      kind: I.kind.v,
      state: I.state.v,
      careAge: I.careAge.v,
      yearly: I.yearly.v,
      kids: I.nKids.v,
      years: I.years.v,
      startIn: I.startIn.v,
      share: I.share.v,
      plan529: I.plan529.v,
      nyRate: I.nyRate.v,
      ret: R,
      rules: FM_REF,
    });
  return { I, R: T, row, ret: R, st: kitState([I.yearly.given ? I.yearly : row ? { cf: 2 } : I.yearly, I.years]) };
}
/* The usual amount of a goal kind of this file, for the goal list's chips (engine.js goalTypical asks first). The
   Yeshiva tuition goal: the middle of the community presets when Eli has filled them in, else the player's own
   amount from Kids and tuition; with neither, no chips (the player types it). */
function famGoalTypical(c, k) {
  if (k !== FAM_YESHIVA) return undefined;
  const P = fmPresetRows(FM_COMMUNITY);
  if (P.length) return Math.round((P[0].low + P[0].high) / 2);
  const K = famKids(c);
  return K.R.ready && K.R.kind.id === "yeshiva" ? Math.round(K.R.first) : null;
}
if (typeof GOAL_K !== "undefined" && !GOAL_K.some(g => g[0] === FAM_YESHIVA)) {
  GOAL_K.push([FAM_YESHIVA, null, 5]);
  GOAL_ONE[FAM_YESHIVA] = "Yeshiva or day school tuition, a year at a time.";
}
/* ---------- the screen ---------- */
function famSandBody(c) {
  const S = famSand(c),
    R = S.R;
  let h =
    famAsk(c, "parents", "To your parents, a month", famMoney([0, 200, 500, 1000, 2000]), null, {
      typed: true,
      help: "Cash, a bill you pay for them, their rent, care or help at home.",
    }) +
    (S.I.parents.v > 0 ? famAsk(c, "parentsYears", "For how long", FAM_LONG, 0) : "") +
    famAsk(c, "kids", "To your kids, a month", famMoney([0, 300, 600, 1200, 2500]), null, {
      typed: true,
      help: "Childcare, tuition, help for a grown child.",
    }) +
    (S.I.kids.v > 0 ? famAsk(c, "kidsYears", "For how long", FAM_LONG, 0) : "") +
    famAsk(
      c,
      "inSpending",
      "Is it already in your monthly spending?",
      [
        ["no", "On top of it"],
        ["yes", "Already in it"],
      ],
      "no"
    );
  if (!R.ready)
    return h + `<div class="small muted">Tap what goes to your parents and to your kids. $0 is an answer.</div>`;
  const g = S.st === "Guess";
  h +=
    dkStatRow([
      dkTile("A month, both ends", money(Math.round(R.peak)), { guess: g, sub: money(Math.round(R.year)) + " a year" }),
      dkTile("Left for your goals", R.leftAfter == null ? "Tap yours" : money(Math.round(R.leftAfter)), {
        guess: g,
        sub: "a month, after it",
      }),
      dkTile("Freedom date", R.inSpending ? "In already" : S.fi ? kitDayWords(S.fi.days) : "Tap yours", { guess: g }),
      S.goal ? dkTile(S.goal.n, kitDayWords(S.goal.days), { guess: g, sub: "your first goal" }) : "",
    ]) +
    dkCard(
      "Both at once",
      `<div class="small">${
        R.inSpending
          ? "This money is already in your spending, so your dates have it in already."
          : S.fi && S.fi.b == null
            ? "With this much going to family for these years, the plan does not reach freedom on this path. Recalculating: a shorter stretch or a smaller amount brings a date back."
            : "When a stretch ends, that money goes back to your own goals, and the dates move back with it."
      }${R.both ? " Both run at once for " + famMos(R.both) + "." : ""}</div>`
    ) +
    mathBox([
      R.sides
        .filter(s => s.monthly > 0)
        .map(
          s =>
            (s.id === "parents" ? "Parents: " : "Kids: ") +
            money(s.monthly) +
            " a month, " +
            (s.years ? "for " + s.years + (s.years === 1 ? " year" : " years") : "with no end in sight")
        )
        .join(". ") + ".",
      R.leftAfter != null ? "Left after spending: " + money(Math.round(R.left)) + " a month, less this." : null,
      R.inSpending
        ? null
        : "The dates: the game's own plan, run again with less left each month while each part lasts.",
    ]);
  return h;
}
function famHomeBody(c) {
  const S = famHome(c),
    R = S.R;
  let h =
    famAsk(c, "rent", "A place of your own would cost, a month", famMoney([1000, 1500, 2000, 2500, 3000]), null, {
      typed: true,
    }) +
    famAsk(c, "payHome", "What you pay at home, a month", famMoney([0, 200, 400, 700, 1000]), 0, { typed: true }) +
    famAsk(
      c,
      "savePct",
      "Of the rent saved, what goes to savings",
      [
        [1, "All of it"],
        [0.75, "Most of it"],
        [0.5, "Half"],
        [0.25, "A quarter"],
      ],
      1
    ) +
    famAsk(
      c,
      "months",
      "How long you plan to stay",
      [6, 12, 18, 24, 36].map(m => [m, famMos(m)]),
      null
    ) +
    famAsk(c, "target", "Your moving-out goal", famMoney([3000, 6000, 10000, 20000, 50000]), null, {
      typed: true,
      help: "The cash to get the keys (deposit, first month, the move), or a down payment.",
    });
  if (!R.ready) return h + `<div class="small muted">Tap the rent and how long you plan to stay.</div>`;
  const g = S.st === "Guess";
  h +=
    dkStatRow([
      dkTile("Saved a month", money(Math.round(R.saving)), {
        guess: g,
        sub: money(Math.round(R.saved)) + " of rent not paid",
      }),
      dkTile("By the end of the stay", money(Math.round(R.byPlan)), { guess: g, sub: famMos(R.months) }),
      dkTile("Goal reached in", R.target == null ? "Tap yours" : R.reach == null ? "No date yet" : famMos(R.reach), {
        guess: g,
      }),
    ]) +
    (R.target != null && R.target > 0
      ? dkCard(
          "Your goal",
          dkProgress(R.target ? (Math.min(R.target, R.byPlan) / R.target) * 100 : 0, {
            text:
              money(Math.round(Math.min(R.target, R.byPlan))) + " of " + money(R.target) + " by the end of the stay",
          }) +
            `<div class="small">${
              R.never
                ? "Nothing goes to savings at this split yet. Recalculating: a bigger share saved brings a date."
                : R.extra > 0
                  ? "It is there " +
                    famMos(R.extra) +
                    " after the time you planned. " +
                    money(Math.round(R.perMonthFor)) +
                    " a month gets there in time."
                  : "It is there in the time you planned."
            }</div>`
        )
      : "") +
    mathBox([
      money(R.rent) +
        " rent less the " +
        money(R.payHome) +
        " you pay at home = " +
        money(R.saved) +
        " a month not paid.",
      "Saved: " +
        Math.round(R.savePct * 100) +
        "% of it, " +
        money(Math.round(R.saving)) +
        " a month, in today's dollars.",
    ]);
  return h;
}
function famKidsBody(c) {
  const S = famKids(c),
    R = S.R,
    kind = S.I.kind.v;
  let h = famAsk(
    c,
    "kind",
    "What it is for",
    FM_KINDS.map(k => [k.id, k.name]),
    null
  );
  if (kind === "care")
    h += famAsk(
      c,
      "state",
      "Where you live",
      [
        ["NY", "New York"],
        ["other", "Another state"],
      ],
      "NY"
    );
  if (kind === "care" && S.I.state.v === "NY")
    h += famAsk(
      c,
      "careAge",
      "The age of care",
      [
        ["infant", "Infant"],
        ["toddler", "Toddler"],
      ],
      "infant"
    );
  if (kind)
    h +=
      famAsk(c, "yearly", "A year, for one child", famMoney(famYearOpts(kind, S.row)), null, {
        typed: true,
        help: S.row
          ? "The first amount is the " +
            S.row.dataYear +
            " median for a center in New York State (the State Comptroller, Feb 2025). Left untapped, the screen uses it."
          : kind === "care"
            ? "No dated number for this state yet: a quote from a center or a sitter near you."
            : "Your school's tuition sheet, after any discount or help.",
      }) +
      famAsk(
        c,
        "nKids",
        "How many children",
        [1, 2, 3, 4, 5, 6].map(v => [v, String(v)]),
        1
      ) +
      famAsk(
        c,
        "years",
        "How many years",
        [1, 2, 3, 4, 5, 9, 13].map(v => [v, v + (v === 1 ? " year" : " years")]),
        null
      ) +
      famAsk(
        c,
        "startIn",
        "When it starts",
        [
          [0, "Now"],
          [1, "In 1 year"],
          [3, "In 3 years"],
          [5, "In 5 years"],
          [10, "In 10 years"],
          [15, "In 15 years"],
        ],
        0
      ) +
      (S.I.startIn.v > 0
        ? famAsk(
            c,
            "share",
            "Put away ahead of time",
            [
              [1, "All of it"],
              [0.5, "Half"],
              [0, "None, pay as it comes"],
            ],
            0.5
          )
        : "") +
      (kind !== "care" && S.I.startIn.v > 0
        ? famAsk(
            c,
            "plan529",
            "A New York 529",
            [
              ["none", "No 529"],
              ["single", "Yes, I file single"],
              ["joint", "Yes, we file jointly"],
            ],
            "none"
          )
        : "") +
      (kind !== "care" && S.I.startIn.v > 0 && S.I.plan529.v !== "none"
        ? famAsk(
            c,
            "nyRate",
            "Your top New York tax rate",
            [
              [0.04, "4%"],
              [0.05, "5%"],
              [0.06, "6%"],
              [0.07, "7%"],
            ],
            null,
            { help: "Your last New York return shows it." }
          )
        : "");
  if (!R.ready) return h + `<div class="small muted">Tap what it is for, a year's cost and how many years.</div>`;
  const g = S.st === "Guess";
  h +=
    dkStatRow([
      dkTile("All the years", money(Math.round(R.total)), {
        guess: g,
        sub: R.kids + (R.kids === 1 ? " child" : " children"),
      }),
      dkTile("The first year", money(Math.round(R.first)), {
        guess: g,
        sub: money(Math.round(R.firstMonth)) + " a month",
      }),
      R.monthly != null && R.share > 0
        ? dkTile("Put away a month", money(Math.round(R.monthly)), { guess: g, sub: "until it starts" })
        : dkTile("Pay as it comes", money(Math.round(R.payGo)), { guess: g, sub: "a month" }),
      R.p529 && R.p529.saved != null
        ? dkTile("NY 529 deduction", money(Math.round(R.p529.saved)), {
            guess: g,
            sub: R.p529.recapture ? "taken back if it pays K-12" : "a year off your NY tax",
          })
        : "",
    ]) +
    (R.kind.k12 && R.p529
      ? dkCard(
          "A 529 and K-12 in New York",
          `<div class="small">New York counts a 529 withdrawal for K-12 tuition as not qualified: it takes back the deductions on that money and taxes the earnings (NY Tax Department, TSB-M-18(6)I). A 529 is a place for college money; tuition before then is a goal of its own.</div>`
        )
      : "") +
    `<button class="primary wide" data-a="famgoal">Make it a goal</button>` +
    mathBox([
      money(R.yearly) +
        " a year × " +
        R.kids +
        (R.kids === 1 ? " child" : " children") +
        " × " +
        R.years +
        " years" +
        (R.rise ? ", going up " + Math.round(R.rise * 100) + "% a year faster than prices" : ", in today's dollars") +
        ".",
      R.monthly != null && R.share > 0
        ? Math.round(R.share * 100) +
          "% of it put away over " +
          R.months +
          " months, growing at the game's " +
          Math.round(S.ret * 100) +
          "% after inflation."
        : null,
      S.row
        ? "Childcare: New York State Comptroller (Feb 2025), the statewide median market rate for a center, OCFS 2023 survey."
        : null,
      R.p529
        ? "NY 529: up to " +
          money(R.p529.limit) +
          " a year off New York income (NY Tax Law 612(c)(32)), times your NY rate."
        : null,
    ]);
  return h;
}
function familySheet() {
  const c = C(),
    tab = (W && W.tab) || "sand";
  const body = tab === "home" ? famHomeBody(c) : tab === "kids" ? famKidsBody(c) : famSandBody(c);
  return (
    head("Menu", "Family money") +
    `<div class="small muted">Money for the people above you and below you, next to your own dates.</div>` +
    kitTabs("famtab", tab, FAM_TABS) +
    `<div class="stack" style="gap:10px">${body}</div>`
  );
}
kitTerms({
  fam529: [
    "529 plan",
    "An account for school costs. The money grows without tax and comes out without tax for school costs the law counts. New York also takes what you put into its own plan off New York income, up to a yearly limit.",
  ],
});
kitScreen(
  "family",
  "Family money",
  "Money to parents and kids at once, living at home, and kids and tuition.",
  "Each number shows its math. The amounts are yours to tap; New York childcare comes from a dated source."
);
Object.assign(ACT, {
  family: t => {
    const v = t && t.dataset && t.dataset.v; // the menu row passes its own data-v ("family"): only a real tab counts
    W = { kind: "family", tab: FAM_TABS.some(x => x[0] === v) ? v : "sand", o: {} };
    sheet(familySheet);
  },
  famtab: t => {
    if (!W || W.kind !== "family") return;
    W.tab = t.dataset.v;
    W.pad = null;
    drawSheet();
  },
  /* the goal list's own add flow, at its last step, with the kind, the name and the amount in */
  famgoal: () => {
    const c = C(),
      K = famKids(c);
    if (!K.R.ready) return;
    const k = K.R.kind.id === "yeshiva" ? FAM_YESHIVA : "Kids' tuition",
      cost = Math.max(1, Math.round(!K.R.now && K.R.share > 0 ? K.R.want : K.R.first));
    W = { kind: "gadd", step: 2, pad: null, o: { k, n: k.slice(0, 18), cost, s: true } };
    sheet(goalAddSheet);
  },
});
kitMenu("Family money", "family", "Parents and kids at once, living at home, kids and tuition", "career");
