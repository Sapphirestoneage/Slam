/* ============================================================================
   SLAM the Game: features/roof.js
   PURPOSE     One list of the famous money ideas that are built in this game. A tap on a row opens the
               idea.
   INPUT       The open sheet (W.kind): roof. The taps of the player (the actions in OUTPUT).
   OUTPUT      7 functions. Parts of functions in other files: cspMoneyRowsRoof. Actions (ACT): roof,
               rfreg, metric. Menu: "Famous money ideas".
   DEPENDS ON  core/report.js, core/engine.js, account/gate.js, screens/ui.js, screens/planner.js,
               core/metrics.js, screens/nav.js, features/csp.js, features/ideas.js.
   USES LATER  Names from files that the browser loads later. Behind a typeof test, thus safe while the
               page loads: features/ideasz.js.
   RULES       Only an idea that is built gets a row. Each row names its source. No invented quotes. A
               number from a guess says so.
   ========================================================================= */
const RF_LIST = [
  {
    g: "spend",
    n: "Conscious Spending Plan",
    by: "Ramit Sethi, I Will Teach You To Be Rich",
    one: "Your month in four buckets, with money you are meant to spend with no guilt.",
    a: "csp",
    val: c => {
      const S = cspCalc(c),
        f = S.B[0];
      return [cspPct(f.pct) + " fixed costs", S.guess];
    },
  },
  {
    g: "spend",
    n: "A score out of 10",
    by: "The idea is Caleb Hammer's, from Financial Audit. The formula is SLAM's own.",
    one: "One number for how your money is set up, and the move that would raise it most.",
    a: "audit",
    val: c => {
      const A = audCalc(c);
      return [A.score != null ? A.score.toFixed(1) + " out of 10" : "No score yet", false];
    },
  },
  {
    g: "spend",
    n: "The 50/30/20 rule",
    by: "Elizabeth Warren, All Your Worth",
    one: "Half to needs, 30% to wants, 20% to saving and paying down debt.",
    m: "split",
  },
  {
    g: "spend",
    n: "Save 25% of your pay",
    by: "The Money Guy Show",
    one: "Their target for how much to keep, counted on pay before taxes.",
    m: "save",
  },
  {
    g: "invest",
    n: "The wealth multiplier",
    by: "The Money Guy Show",
    one: "What one dollar invested today could be worth at 65.",
    m: "dollar",
  },
  {
    g: "spend",
    n: "The 20/3/8 car rule",
    by: "The Money Guy Show",
    one: "20% down, paid off in 3 years, payments at 8% of pay or less.",
    m: "carpay",
  },
  {
    g: "retire",
    n: "Savings rate sets your freedom date",
    by: "Mr. Money Mustache",
    one: "The more of your pay you keep, the fewer years you have to work.",
    m: "yearsfi",
  },
  {
    g: "retire",
    n: "The 4% rule",
    by: "William Bengen, and the Trinity study after him",
    one: "About 25 times a year of spending, invested, can cover that spending.",
    m: "fi",
  },
  {
    g: "invest",
    n: "Wealth for your age and pay",
    by: "Thomas Stanley and William Danko, The Millionaire Next Door",
    one: "Your age times a year of pay, divided by 10. It runs harsh on the young.",
    m: "paw",
  },
  {
    g: "retire",
    n: "Salary saved by each age",
    by: "Fidelity",
    one: "1x your salary invested by 30, 3x by 40, up to 10x by 67.",
    m: "invx",
  },
  {
    g: "time",
    n: "Your real hourly wage",
    by: "Vicki Robin and Joe Dominguez, Your Money or Your Life",
    one: "What an hour of your life really earns once the hidden hours and costs are counted.",
    a: "hrs",
  },
  {
    g: "spend",
    n: "The debt snowball",
    by: "Made famous by Dave Ramsey",
    one: "Smallest debt first for a quick win. The game shows it next to highest rate first so you can pick.",
    a: "debtplan",
    show: c => (c.debts || []).some(x => (+x.amt || 0) > 0),
  },
  {
    g: "invest",
    n: "Keep fees low",
    by: "John Bogle, who started the index fund for everyday investors",
    one: "A fee comes out every year, up market or down, so a small one adds up to a lot.",
    m: "fee",
  },
  {
    g: "mind",
    n: "Fork Theory",
    by: "A Tumblr post by jenroses, building on Christine Miserandino's Spoon Theory",
    one: "Not a money idea, but it decides how much money work you can take on today.",
    a: "fork",
  },
];
const RF_REG = [
  ["retire", "Retirement"],
  ["invest", "Investing"],
  ["earn", "Earning"],
  ["spend", "Spending"],
  ["deals", "Deals"],
  ["home", "Real estate"],
  ["mind", "Mindset"],
  ["time", "Time"],
  ["family", "Family and giving"],
];
const RF_MAP = { stop: "retire", tax: "retire", build: "invest" };
function rfIdeaOn(s) {
  return !s.pk || (typeof adOn === "function" && adOn(s.pk));
}
/* every row that is really built, with its region. numbers are only worked out when asked for (one open region at a time) */
function rfAll(c) {
  const M = typeof knMetrics === "function" ? knMetrics(c, derive(c)) : [],
    out = RF_LIST.filter(
      r => (!r.show || r.show(c)) && (!r.a || typeof ACT[r.a] === "function") && (!r.m || M.find(x => x.id === r.m))
    ).map(r => ({ r, old: true }));
  if (typeof IG !== "undefined")
    IG_ORDER.forEach(id => {
      const s = IG[id];
      if (rfIdeaOn(s))
        out.push({ r: { g: RF_MAP[s.grp] || s.grp, n: s.n, by: s.by, one: s.one, a: "idea", v: id }, s });
    });
  return out;
}
function rfVal(c, x, M) {
  let v = "",
    g = false;
  try {
    if (x.s) {
      if (x.s.val) {
        const cx = igCtx(c, x.s.id);
        v = x.s.val(cx) || "";
        g = !cx.real;
      }
    } else if (x.r.val) {
      const o = x.r.val(c);
      v = o[0];
      g = o[1];
    } else if (x.r.m) {
      const m = M.find(q => q.id === x.r.m);
      if (m && m.num != null) {
        v = m.n + ": " + m.val;
        g = m.st === "Guess";
      }
    }
  } catch (e) {
    report(e, "roof.js: rfVal");
  }
  return { v, g };
}
function rfRows(c) {
  const M = typeof knMetrics === "function" ? knMetrics(c, derive(c)) : [];
  return rfAll(c).map(x => Object.assign(x, rfVal(c, x, M)));
}
function rfRow(x) {
  return `<button class="rowbtn rfrow" data-a="${x.r.m ? "metric" : x.r.a}" data-v="${x.r.m || x.r.v || ""}"><span style="min-width:0"><b>${esc(x.r.n)}</b><div class="tiny muted">${esc(x.r.one)}</div><div class="tiny muted rfby">From: ${esc(x.r.by)}</div>${x.v ? `<div class="tiny rfyou ${x.g ? "guess" : ""}">Yours: ${esc(x.v)}${x.g ? " (a guess so far)" : ""}</div>` : ""}</span><span class="fkgo">Open</span></button>`;
}
function rfSheet() {
  const c = C(),
    A = rfAll(c),
    open = W.reg || null,
    M = open && typeof knMetrics === "function" ? knMetrics(c, derive(c)) : [],
    fit = typeof igFits === "function" ? igFits(c) : [],
    first = fit[0] ? IG[fit[0]] : null;
  let h =
    head(
      "Famous money ideas",
      "All under one roof " + `<button class="term" data-a="info" data-k="gloss:roof">i</button>`
    ) +
    `<div class="small muted">${A.length} of the best-known ideas from well-known money teachers, each one run on your numbers. Pick a group, then tap an idea.</div>`;
  if (first)
    h += `<div class="banner small rffirst"><b>One that fits where you are:</b> ${esc(first.n)}.<div class="tiny muted">From: ${esc(first.by)}</div><button class="primary wide slim" style="margin-top:8px" data-a="idea" data-v="${first.id}">Open it</button></div>`;
  h += `<div class="stack" style="gap:6px">${RF_REG.map(g => {
    const L = A.filter(x => x.r.g === g[0]);
    if (!L.length) return "";
    const on = open === g[0];
    return (
      `<button class="rowbtn rfreg ${on ? "on" : ""}" data-a="rfreg" data-v="${g[0]}" aria-expanded="${on}"><span><b>${g[1]}</b> <span class="tiny muted">${L.length} ${L.length === 1 ? "idea" : "ideas"}</span></span><span class="fkgo">${on ? "Hide" : "Show"}</span></button>` +
      (on ? L.map(x => rfRow(Object.assign(x, rfVal(c, x, M)))).join("") : "")
    );
  }).join("")}</div>`;
  return (
    h +
    `<div class="tiny muted">These are their ideas, explained in the game's own words. Nobody listed here made or backs this game. These teachers disagree with each other, so treat each one as a guide and pick what fits you.</div>`
  );
}
Object.assign(ACT, {
  roof: () => {
    const keep = W && W.kind === "roof" ? W.reg : null;
    W = { kind: "roof", reg: keep };
    sheet(rfSheet);
    if (typeof cspUp === "function") cspUp();
  },
  rfreg: t => {
    if (W && W.kind === "roof") {
      W.reg = W.reg === t.dataset.v ? null : t.dataset.v;
      drawSheet();
    }
  },
});
(() => {
  const _m = ACT.metric;
  if (typeof _m !== "function") return;
  ACT.metric = t => {
    const from = W && W.kind === "roof";
    const r = _m(t);
    if (from && typeof cspUp === "function") cspUp();
    return r;
  };
})();
Object.assign(GLOSS, {
  roof: [
    "Famous money ideas",
    "A list of the best-known ideas in personal finance, each with who it comes from. Every one is already part of this game and uses your numbers. They are guides from different teachers, and they do not always agree with each other. That is fine: you pick what fits you.",
  ],
});
if (typeof NV_INFO !== "undefined") {
  NV_INFO.roof = [
    "Famous money ideas",
    "The best-known ideas from well-known money teachers, in one list.",
    "Tap one and it opens on your own numbers.",
  ];
  GLOSS.scr_roof = [NV_INFO.roof[0], NV_INFO.roof[1] + " " + NV_INFO.roof[2]];
}
if (typeof MENU !== "undefined")
  MENU.push([
    "Famous money ideas",
    "roof",
    "act",
    "Ramit's plan, the 50/30/20 rule, the 4% rule and more, on your numbers",
  ]);
/* a third slim door in My Money, under the two it already has */
/* Part of cspMoneyRows() in csp.js. Adds the row "Famous money ideas". */
function cspMoneyRowsRoof(h, c) {
  if (!h) return h;
  const n = rfAll(c).length,
    k = h.lastIndexOf("</div>");
  return (
    h.slice(0, k) +
    `<button class="rowbtn" data-a="roof"><span style="min-width:0"><b>Famous money ideas</b> <span class="tiny muted">${n} in one list</span></span><span class="fkgo">Open</span></button>` +
    h.slice(k)
  );
}
