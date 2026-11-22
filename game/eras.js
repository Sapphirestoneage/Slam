/* ===== eras.js: real steps for the later eras, and one account line that feeds back into the early ones.
   1. Future You (era 5) gets steps you can do: open and fill a Roth IRA, open and fill an HSA, set the workplace plan. Its key moment is "Future you gets paid first".
   2. Eras 6 to 9 each get steps and a starred key moment. The gates still come from the numbers. Steps can be done early. An era cannot be entered without its starred step.
   3. The retirement chain in "What depends on what" works out which accounts to fill first, shown as one line with Guess / Close / Exact and a why.
   Rules kept: tap only, an "i" on every term, each step can be done, working on it, already done or doesn't apply, Show the math on numbers, credits on famous ideas.
   Nobody loses ground: a player's era on the day this arrives is kept, and a key moment once reached stays reached. Yearly steps start fresh each January. ===== */
var ES_GIVE_X = [];
const ES_BR = {
  one: [
    [0, 0.1],
    [12400, 0.12],
    [50400, 0.22],
    [105700, 0.24],
    [201775, 0.32],
  ],
  two: [
    [0, 0.1],
    [24800, 0.12],
    [100800, 0.22],
    [211400, 0.24],
    [403550, 0.32],
  ],
};
function esX(c) {
  c.x = c.x || {};
  c.x.es = c.x.es || {};
  const X = c.x.es;
  X.s = X.s || {};
  X.a = X.a || {};
  X.star = X.star || {};
  return X;
}
function esYear() {
  return todayISO().slice(0, 4);
}
function esI(k) {
  return `<button class="term" data-a="info" data-k="gloss:${k}">i</button>`;
}
function esBr(taxable, two) {
  const B = two ? ES_BR.two : ES_BR.one;
  let r = B[0][1];
  B.forEach(b => {
    if (taxable > b[0]) r = b[1];
  });
  return taxable <= 0 ? 0 : r;
}
const ES = [
  /* ---- Future You ---- */
  {
    id: "fy_rothopen",
    era: 5,
    n: "Open a Roth IRA",
    r: 1,
    g: "roth",
    why: "It is the account where your money grows and comes out with no tax, and you can open one yourself in about 15 minutes.",
    how: [
      "Pick a low-cost broker (Fidelity, Schwab and Vanguard are the usual three).",
      "Choose Roth IRA, and link your bank.",
      "Pick a broad index fund or a target-date fund, so the money is invested and not sitting in cash.",
    ],
  },
  {
    id: "fy_rothfill",
    era: 5,
    n: "Fill your Roth IRA this year",
    r: 4,
    rl: ["25%", "50%", "75%", "100%"],
    yearly: true,
    g: "roth",
    why: "Each year has its own limit, and a year you skip never comes back.",
    how: ["Set an automatic transfer for the day after payday.", "Raise it when you get a raise."],
    calc: (c, d) => {
      const m = ROTH / 12;
      return [
        "The limit for " + esYear() + ": " + money(ROTH),
        money(ROTH) + " ÷ 12 = " + money(Math.round(m)) + " a month fills it",
        "Each quarter of the way is " + money(Math.round(ROTH / 4)),
        "You keep " + money(Math.max(0, c.take - c.spend)) + " a month right now",
      ];
    },
  },
  {
    id: "fy_hsaopen",
    era: 5,
    n: "Open an HSA",
    r: 1,
    g: "hsa",
    ok: (c, d, X) => X.a.hsa !== "no",
    ask: [
      "hsa",
      "Does your health plan allow an HSA?",
      [
        ["yes", "Yes"],
        ["no", "No"],
        ["unsure", "Not sure"],
      ],
    ],
    why: "If your health plan allows one, it is the only account that skips tax going in, growing and coming out.",
    how: [
      'Check your plan papers for the words "HSA-eligible" or "high-deductible health plan".',
      "Open it through your job if they offer one. If not, any HSA provider works.",
    ],
  },
  {
    id: "fy_hsafill",
    era: 5,
    n: "Fill your HSA this year",
    r: 4,
    rl: ["25%", "50%", "75%", "100%"],
    yearly: true,
    g: "hsa",
    ok: (c, d, X) => X.a.hsa !== "no",
    why: "The limit resets every year, like the Roth.",
    how: [
      "Have it come out of your paycheck if your job allows. That skips payroll tax too.",
      "Invest it once the balance covers your deductible.",
    ],
    calc: (c, d) => {
      const lim = c.rel === "Married" || c.deps === "Kids" ? IG_TAX.hsa.fam : IG_TAX.hsa.one;
      return [
        "The limit for " +
          esYear() +
          ": " +
          money(lim) +
          " (" +
          money(IG_TAX.hsa.one) +
          " for just you, " +
          money(IG_TAX.hsa.fam) +
          " for a family)",
        money(lim) + " ÷ 12 = " + money(Math.round(lim / 12)) + " a month fills it",
      ];
    },
  },
  {
    id: "fy_work",
    era: 5,
    n: "Set your workplace plan to your target",
    r: 1,
    g: "wplan",
    ok: c => c.work !== "Retired" && c.match !== "no match offered",
    why: "The plan at your job takes the most money of any account, straight from your paycheck.",
    how: [
      "Log in to your plan, find the contribution percent, and set it.",
      "Turn on the yearly auto-increase if there is one.",
    ],
    go: ["See which account to fill first", "acwhy", ""],
  },
  {
    id: "fy_star",
    era: 5,
    star: true,
    auto: true,
    n: "Future you gets paid first",
    r: 1,
    g: "fystar",
    why: "This is the key moment of Future You: your Roth IRA is filled for the year and your workplace plan is at your target. From here, saving for later happens before you can spend it.",
    how: [
      "Fill your Roth IRA this year (or mark it as not for you).",
      "Set your workplace plan to your target (or mark it as not for you).",
    ],
  },
  /* ---- Quiet Quitting FI ---- */
  {
    id: "q_bare",
    era: 6,
    n: "See your bare-minimum plan",
    r: 1,
    g: "qqfi",
    why: "It shows that doing only the smallest thing from here still gets you there. That is what gives you room to choose.",
    how: ["Read the numbers below.", "Tap done once it makes sense."],
    calc: (c, d) => {
      const fv = grow(c.inv, d.toRet, ROTH);
      return [
        "Invested today: " + money(Math.round(c.inv)),
        "Adding only a Roth IRA each year (" +
          money(ROTH) +
          ") for " +
          d.toRet +
          " years, at 7% a year after inflation: " +
          money(Math.round(fv)),
        "What you need at " + Math.max(c.age, c.ret) + ": " + money(Math.round(d.fiRet)),
        fv >= d.fiRet
          ? "The bare minimum gets you there"
          : "Short by " + money(Math.round(d.fiRet - fv)) + " on the bare minimum",
      ];
    },
  },
  {
    id: "q_ss",
    era: 6,
    n: "Check Social Security for each person",
    r: 1,
    g: "ssclaim",
    by: "Mike Piper, Oblivious Investor",
    why: "It is a paycheck for life that most plans leave out. Seeing each person's number changes how much your savings have to do.",
    how: [
      "Open the claiming screen and look at 62, 67 and 70 for everyone in the game.",
      "For your real figures, sign in at ssa.gov.",
    ],
    go: ["Open when to claim", "idea", "piper"],
  },
  {
    id: "q_spend",
    era: 6,
    n: "Set your retirement spending",
    r: 1,
    g: "needswants",
    ask: [
      "rs",
      "Next to today, what will life cost when you stop?",
      [
        ["0.7", "About 70%"],
        ["0.85", "About 85%"],
        ["1", "The same"],
        ["1.15", "A bit more"],
      ],
    ],
    why: "Your number is built on this one figure. Splitting needs from wants shows how much of it is fixed.",
    how: ["Look at your needs and wants below.", "Tap the answer that fits, then tap done."],
    calc: (c, d) => {
      const rows = cspRows(c),
        w = rows.filter(r => /fun|everything else/i.test(r.k)).reduce((t, r) => t + (+r.amt || 0), 0),
        n = rows.reduce((t, r) => t + (+r.amt || 0), 0) - w,
        a = +esX(c).a.rs || 1;
      return [
        "Needs today: " + money(Math.round(n)) + " a month. Wants: " + money(Math.round(w)),
        "At " +
          Math.round(a * 100) +
          "% of today: " +
          money(Math.round((n + w) * a)) +
          " a month, or " +
          money(Math.round((n + w) * a * 12)) +
          " a year",
        "÷ 4% = " + money(Math.round(((n + w) * a * 12) / SWR)) + " to cover it",
      ];
    },
  },
  {
    id: "q_star",
    era: 6,
    star: true,
    n: "The reevaluation moment",
    r: 1,
    g: "reeval",
    ask: [
      "re1",
      "Now that the bare minimum is enough, what do you want to do with the room?",
      [
        ["same", "Keep going as I am"],
        ["ease", "Ease off a little"],
        ["change", "Change the work I do"],
        ["unsure", "Not sure yet"],
      ],
    ],
    why: "This is the key moment of Quiet Quitting FI. The numbers say you have choices. Stop and pick one on purpose, so the next years are chosen and not just continued.",
    how: ["Tap the answer that is true today.", "You can change it any time."],
  },
  /* ---- Coast ---- */
  {
    id: "c_bridge",
    era: 7,
    n: "See your bridge years",
    r: 1,
    g: "bridge",
    why: "Most retirement money opens at 59½. If you stop sooner, something else has to pay for the years in between.",
    how: ["Read the numbers below.", "Tap done once you know your gap."],
    calc: (c, d) => {
      const yrs = Math.max(0, 59.5 - c.ret),
        need = yrs * d.fiSpend,
        lock = (c.invs || [])
          .filter(r => /retirement|ira|hsa|401|403/i.test(r.k))
          .reduce((t, r) => t + (+r.amt || 0), 0),
        reach = d.cash + Math.max(0, c.inv - lock);
      return [
        "You stop at " + c.ret + ". Bridge years to 59½: " + Math.round(yrs * 10) / 10,
        "× " + money(Math.round(d.fiSpend)) + " a year = " + money(Math.round(need)) + " to bridge",
        "Money you can reach today: " + money(Math.round(reach)),
        reach >= need ? "Your bridge is covered" : "Still to build: " + money(Math.round(need - reach)),
      ];
    },
  },
  {
    id: "c_access",
    era: 7,
    n: "Map your early access",
    r: 1,
    g: "rule55",
    by: "IRS rules, the Mad Fientist's Roth ladder",
    why: "Each account has its own way in before 59½. Knowing them turns locked money into a plan.",
    how: ["Open the map and find the lines that fit your accounts.", "Look at the Roth ladder if you stop before 55."],
    go: ["Open the early access map", "idea", "early"],
  },
  {
    id: "c_trap",
    era: 7,
    n: "Check the middle-class trap meter",
    r: 1,
    g: "mctrap",
    by: "Scott Trench and Mindy Jensen, BiggerPockets Money",
    why: "Being on track on paper is not the same as having money you can live on. This shows how much of yours is within reach.",
    how: ["Open the meter.", "If most of it is locked, the bridge step above matters more."],
    go: ["Open the trap meter", "idea", "trench"],
  },
  {
    id: "c_shape",
    era: 7,
    n: "Pick your shape from here",
    r: 1,
    g: "shape",
    ask: [
      "shape",
      "Enough is already saved. How do you want to spend the working years left?",
      [
        ["spark", "Spark: a hard push, then ease off"],
        ["seasons", "Seasons: work some, rest some"],
        ["barbell", "Barbell: mostly safe, a few bold bets"],
        ["keep", "Keep going as I am"],
      ],
    ],
    why: "Coast means your paycheck only has to cover your life. That opens shapes of work that were too risky before.",
    how: ["Tap the one that pulls at you.", "Try it in What if before you change anything real."],
    go: ["Try shapes in What if", "moves", ""],
  },
  {
    id: "c_star",
    era: 7,
    star: true,
    n: "The second reevaluation",
    r: 1,
    g: "reeval",
    ask: [
      "re2",
      "You could stop saving for retirement today. What is work for now?",
      [
        ["life", "Paying for my life, nothing more"],
        ["faster", "Getting to freedom sooner"],
        ["mean", "Something I care about"],
        ["unsure", "Not sure yet"],
      ],
    ],
    why: "This is the key moment of Coast. Saving for retirement has become optional, so the reason you work can change.",
    how: ["Tap the answer that is true today.", "One more year is on the famous ideas list for when you get close."],
    go: ["Open One more year", "idea", "omy"],
  },
  /* ---- Freedom ---- */
  {
    id: "f_method",
    era: 8,
    n: "Pick how you will take money out",
    r: 1,
    g: "wrate",
    ask: [
      "wm",
      "Which method fits you?",
      [
        ["four", "The 4% rule"],
        ["gk", "Guardrails"],
        ["vpw", "A percent that rises with age"],
        ["benz", "Buckets"],
      ],
    ],
    by: "Bengen, Guyton and Klinger, the Bogleheads, Christine Benz",
    why: "Living off investments needs a rule you trust in a bad year. Pick one before you need it.",
    how: ["Tap a method, and open it to see it on your numbers.", "Your income style quiz can help you choose."],
    go: ["Take the income style quiz", "idea", "pfau"],
  },
  {
    id: "f_tax",
    era: 8,
    n: "Set up bracket filling and your health insurance target",
    r: 1,
    g: "fill",
    by: "Go Curry Cracker, Root of Good",
    why: "Once you choose your own income each year, you can keep taxes near zero and keep health insurance help.",
    how: ["See how much income fits at 0% tax.", "See the income band that keeps marketplace help."],
    go: ["Open 0% tax", "idea", "gcc"],
  },
  {
    id: "f_pay",
    era: 8,
    n: "Plan your first year's paycheck",
    r: 1,
    g: "wrate",
    why: "A number per month, from a named account, on a set day, is what makes it feel like a paycheck.",
    how: ["Read the numbers below.", "Pick the account it comes from and the day of the month, then tap done."],
    calc: (c, d) => {
      const m = esX(c).a.wm || "four",
        rate = m === "gk" ? 0.05 : m === "vpw" ? 0.045 : 0.04,
        P = Math.max(c.inv, 0);
      return [
        "Invested: " + money(Math.round(P)),
        "Your method: " +
          {
            four: "the 4% rule",
            gk: "guardrails, starting at 5%",
            vpw: "a rising percent, about 4.5% to start",
            benz: "buckets, drawing 4%",
          }[m],
        money(Math.round(P)) + " × " + rate * 100 + "% = " + money(Math.round(P * rate)) + " a year",
        "That is " +
          money(Math.round((P * rate) / 12)) +
          " a month. You spend " +
          money(Math.round(c.spend)) +
          " a month today",
      ];
    },
  },
  {
    id: "f_won",
    era: 8,
    n: 'The "won the game" risk check',
    r: 1,
    g: "wongame",
    by: "William Bernstein",
    why: "Once you have enough, a big loss can only hurt you. Check how much risk you still need.",
    how: ["Open the check and see your safe pile.", "Decide if anything should move."],
    go: ["Open the check", "idea", "bernstein"],
  },
  {
    id: "f_star",
    era: 8,
    star: true,
    auto: true,
    n: "Your first year of the drawdown plan is written",
    r: 1,
    g: "drawdown",
    why: "This is the key moment of Freedom: you have picked a method and planned the first year's paycheck. Work is now a choice.",
    how: ["Pick how you will take money out.", "Plan your first year's paycheck."],
  },
  /* ---- Legacy ---- */
  {
    id: "l_benef",
    era: 9,
    n: "Review who inherits each account",
    r: 1,
    g: "benef",
    why: "The name on the account form beats what your will says. Old forms are the most common mistake.",
    how: ["Log in to each retirement account and insurance policy.", "Check the name listed, and a backup name."],
  },
  {
    id: "l_give",
    era: 9,
    n: "Make a giving plan",
    r: 1,
    g: "giveplan",
    ask: [
      "give",
      "How do you want to give?",
      [
        ["pct", "A set share of what comes in"],
        ["amt", "A set amount each year"],
        ["bunch", "In bunches, every other year"],
        ["time", "Time more than money"],
        ["later", "Mostly later, through my will"],
      ],
    ],
    why: "Giving that is planned gets done. Giving that is left for later mostly does not.",
    how: ["Tap the way that fits.", "Bunching can lower your tax. It is on the famous ideas list."],
    go: ["Open bunching your giving", "idea", "daf"],
  },
  {
    id: "l_estate",
    era: 9,
    n: "Estate basics: a will, and who decides",
    r: 3,
    rl: ["1 of 3", "2 of 3", "All 3"],
    g: "estate",
    why: "Three papers cover most families: a will, someone to make money decisions if you cannot, and someone to make health decisions.",
    how: ["A will.", "A power of attorney for money.", "A health care proxy."],
  },
  {
    id: "l_family",
    era: 9,
    n: "Make a family money plan",
    r: 1,
    g: "famplan",
    by: "Money dates, made popular by Tori Dunlap and others",
    why: "The people who will inherit, or who you will support, should hear the plan from you.",
    how: ["Set one money date with the people involved.", "Cover what exists, where it is, and what you hope it does."],
    go: ["Open money dates", "idea", "moneydate"],
  },
  {
    id: "l_star",
    era: 9,
    star: true,
    n: "Your graduation choice",
    r: 1,
    g: "grad",
    ask: [
      "grad",
      "Your own life is covered. What is next?",
      [
        ["build", "Keep building for others"],
        ["teach", "Teach someone else to do this"],
        ["enjoy", "Spend more of it, on purpose"],
        ["quiet", "Play less often. I am set"],
      ],
    ],
    why: "This is the key moment of Legacy. The game has taken you as far as money goes. What comes next is yours to name.",
    how: ["Tap the answer that fits today."],
  },
];
const ES_BY = {};
ES.forEach(s => {
  ES_BY[s.id] = s;
});
function esApplies(c, d, s) {
  const X = esX(c),
    t = X.s[s.id];
  if (t && t.st === "na") return false;
  try {
    return !s.ok || !!s.ok(c, d, X);
  } catch (e) {
    return true;
  }
}
function esLegacy(c, X, id) {
  return (
    (id === "fy_rothopen" || id === "fy_rothfill" || id === "fy_work") &&
    c.tax === "yes" &&
    !X.s[id] &&
    X.taxY === esYear()
  );
}
function esRank(c, d, id) {
  const s = ES_BY[id],
    X = esX(c);
  if (!s) return 0;
  if (s.auto) return esStarNow(c, d, s.era) || X.star[s.era] ? 1 : 0;
  if (esLegacy(c, X, id)) return s.r;
  const t = X.s[id];
  if (!t) return 0;
  if (s.yearly && t.y !== esYear()) return 0;
  if (t.st === "done" || t.st === "already") return Math.min(s.r, t.r || s.r);
  if (t.st === "work") return Math.min(s.r - 1, t.r || 0);
  return 0;
}
function esOk(c, d, id) {
  const s = ES_BY[id];
  return !esApplies(c, d, s) || esRank(c, d, id) >= s.r;
}
function esStarNow(c, d, i) {
  if (i === 5) return esOk(c, d, "fy_rothfill") && esOk(c, d, "fy_work");
  if (i === 8) {
    const X = esX(c);
    return !!X.a.wm && esRank(c, d, "f_pay") >= 1;
  }
  const s = ES.find(q => q.era === i && q.star);
  return !!s && !s.auto && esRank(c, d, s.id) >= 1;
}
/* the gates stay numbers. the key moment is added on top, and never taken away once reached */
function esHold(c, d) {
  const X = esX(c);
  if (X.grand == null) X.grand = d.rawEra || 0;
  if (c.tax === "yes" && !X.taxY) X.taxY = esYear();
  for (let i = 5; i <= 9; i++) if (!X.star[i] && esStarNow(c, d, i)) X.star[i] = todayISO();
  const star = i => i <= X.grand || !!X.star[i],
    g = d.g.slice(),
    rtd = c.work === "Retired";
  g[5] = rtd || star(5);
  d.g = g;
  const gs = g.map((v, i) => (i >= 6 ? !!v && star(i) : !!v));
  let e = 0;
  for (let i = 1; i < 10; i++) {
    if (gs[i]) e = i;
    else break;
  }
  d.gs = gs;
  d.starWait = null;
  for (let i = 5; i <= 9; i++) {
    if (i === e + 1 && (i === 5 ? !g[5] : g[i] && !gs[i])) {
      d.starWait = i;
      break;
    }
  }
  d.rawEra = e;
  d.era = c.confEra === null || c.confEra === undefined ? e : Math.min(e, c.confEra);
  d.pending = e > d.era;
}
(() => {
  const _d = derive;
  derive = function (c) {
    const d = _d(c);
    try {
      esHold(c, d);
    } catch (e) {}
    return d;
  };
  const _es = eraSteps;
  eraSteps = function (c, d, e) {
    const base = _es(c, d, e) || [];
    return base.concat(
      ES.filter(s => s.era === e && esApplies(c, d, s)).map(s => ({
        id: s.id,
        title: (s.star ? "★ " : "") + s.n,
        done: esRank(c, d, s.id) >= s.r,
        star: !!s.star,
      }))
    );
  };
  const _nt = nodeTitle;
  nodeTitle = function (id) {
    return ES_BY[id] ? ES_BY[id].n : _nt(id);
  };
  const _nm = nodeMax;
  nodeMax = function (id) {
    return ES_BY[id] ? ES_BY[id].r : _nm(id);
  };
  const _nr = nodeRankRaw;
  nodeRankRaw = function (c, d, id) {
    return ES_BY[id] ? esRank(c, d, id) : _nr(c, d, id);
  };
  unfinished = function (c, d) {
    const out = [];
    let weak = false;
    for (let e = 1; e <= Math.min(d.era, 9); e++) {
      const s = eraSteps(c, d, e);
      if (!s.length) continue;
      const dn = s.filter(x => x.done).length;
      if (dn / s.length < 0.85) weak = true;
      s.filter(x => !x.done).forEach(x => out.push({ era: e, id: x.id, title: x.title }));
    }
    return { list: out, weak };
  };
  const _node = ACT.node;
  ACT.node = t => {
    if (ES_BY[t.dataset.v]) {
      W = { kind: "estep", id: t.dataset.v };
      sheet(esSheet);
      try {
        const s = document.querySelector("#ov .sheet");
        if (s) s.scrollTop = 0;
      } catch (e) {}
    } else _node(t);
  };
})();
/* ---------- one step ---------- */
function esSheet() {
  const c = C(),
    d = derive(c),
    s = ES_BY[W.id],
    X = esX(c),
    t = X.s[s.id] || {},
    rk = esRank(c, d, s.id),
    done = rk >= s.r,
    na = t.st === "na",
    steps = eraSteps(c, d, s.era),
    dn = steps.filter(x => x.done).length,
    ans = s.ask ? X.a[s.ask[0]] : null;
  let h =
    head(ERAS[s.era].n + (s.star ? " · key moment" : ""), (s.star ? "★ " : "") + esc(s.n) + " " + esI("es_" + s.g)) +
    `<div class="small">${esc(s.why)}</div>` +
    (s.by ? `<div class="tiny muted">From: ${esc(s.by)}</div>` : "");
  if (s.ask)
    h += `<div class="stack" style="gap:6px"><div class="small"><b>${esc(s.ask[1])}</b></div><div class="chips">${s.ask[2]
      .concat(s.id === "l_give" ? ES_GIVE_X.filter(o => typeof adOn !== "function" || adOn(o[2])) : [])
      .map(
        o =>
          `<button class="chip ${String(ans) === String(o[0]) ? "on" : ""}" data-a="esans" data-k="${s.ask[0]}" data-v="${o[0]}" aria-pressed="${String(ans) === String(o[0])}">${esc(o[1])}${String(ans) === String(o[0]) ? " ✕" : ""}</button>`
      )
      .join("")}</div></div>`;
  if (s.id === "f_method" && ans)
    h += `<button class="ghost wide slim" data-a="idea" data-v="${ans === "four" ? "ern" : ans}">See ${{ four: "the 4% rule and the order of returns", gk: "guardrails", vpw: "the rising percent", benz: "buckets" }[ans]} on your numbers</button>`;
  if (s.id === "f_tax")
    h += `<button class="ghost wide slim" data-a="idea" data-v="rog">Open the health insurance income target</button>`;
  h += `<div class="tile"><div class="small"><b>How to do it</b></div>${s.how.map((x, i) => `<div class="small">${i + 1}. ${esc(x)}</div>`).join("")}</div>`;
  if (s.calc) {
    let L = [];
    try {
      L = s.calc(c, d);
    } catch (e) {}
    const st = c.led && isSharp(c, "take") && isSharp(c, "spend") ? (isSharp(c, "inv") ? "Exact" : "Close") : "Guess";
    if (L.length)
      h +=
        `<div class="tile stack" style="gap:4px"><div class="row between tiny muted"><span>The numbers</span><span class="pill">${typeof cspSt === "function" ? cspSt(st) : st}</span></div><div class="small ${st === "Guess" ? "guess" : ""}"><b>${esc(L[L.length - 1])}</b></div></div>` +
        mathBox(L);
  }
  if ((s.id === "fy_rothfill" || s.id === "fy_work" || s.id === "fy_star") && typeof acLine === "function")
    h += acLine(c, d, true);
  if (s.go && !done)
    h += `<button class="primary wide go" data-a="${s.go[1]}" data-v="${s.go[2]}">${esc(s.go[0])}</button>`;
  if (s.auto) {
    const parts = s.era === 5 ? ["fy_rothfill", "fy_work"] : ["f_method", "f_pay"];
    h += `<div class="stack" style="gap:6px">${parts
      .map(id => {
        const q = ES_BY[id],
          ok = id === "f_method" ? !!X.a.wm : esOk(c, d, id);
        return `<button class="rowbtn" data-a="node" data-v="${id}"><span style="min-width:0"><b>${esc(q.n)}</b></span><span class="fkgo">${ok ? "Done ✓" : "Open"}</span></button>`;
      })
      .join(
        ""
      )}</div><div class="tile small">${done ? "<b>Reached.</b> A key moment stays reached, even when the yearly steps start fresh." : "This one ticks itself when both steps above are done."}</div>`;
  } else if (na)
    h += `<div class="tile small">Marked as not for you.</div><button class="ghost wide slim" data-a="esundo" data-v="${s.id}">Bring it back</button>`;
  else if (done)
    h +=
      `<div class="row between"><span class="pill buff">Done${s.yearly ? " for " + esYear() : ""}</span><button class="ghost slim" data-a="esundo" data-v="${s.id}">Undo</button></div>` +
      (esLegacy(c, X, s.id)
        ? `<div class="tiny muted">Counted as already done, because you told the game your tax-friendly accounts are filled.</div>`
        : "");
  else {
    h +=
      s.r > 1
        ? `<div class="small"><b>How far along are you${s.yearly ? " this year" : ""}?</b></div><div class="chips">${s.rl.map((l, i) => `<button class="chip ${rk === i + 1 ? "on" : ""}" data-a="esdone" data-v="${s.id}" data-k="${i + 1}">${l}</button>`).join("")}</div>`
        : `<button class="${s.go ? "ghost" : "primary"} wide" data-a="esdone" data-v="${s.id}" data-k="${s.r}">I did this</button>`;
    h += `<div class="row wrap" style="gap:6px"><button class="ghost slim ${t.st === "work" ? "on" : ""}" data-a="eswork" data-v="${s.id}">${t.st === "work" ? "Working on it ✓" : "Working on it"}</button><button class="ghost slim" data-a="esalready" data-v="${s.id}">I already did this</button><button class="ghost slim" data-a="esna" data-v="${s.id}">Doesn't apply to me</button></div>`;
  }
  return (
    h +
    `<div class="tiny muted">${ERAS[s.era].n}: ${dn} of ${steps.length} steps done. An era opens when its numbers are there and its ★ key moment is reached. 85% of the steps is the mark for calling an era solid.</div>`
  );
}
Object.assign(ACT, {
  esdone: t => {
    const c = C(),
      s = ES_BY[t.dataset.v],
      X = esX(c),
      r = +t.dataset.k || s.r;
    X.s[s.id] = { st: r >= s.r ? "done" : "work", r, y: esYear(), d: todayISO() };
    save();
    render();
    drawSheet();
    if (r >= s.r && s.star && typeof celebrate === "function")
      celebrate("Key moment: " + s.n, [ERAS[s.era].n + " opens when its numbers are there too"]);
  },
  eswork: t => {
    const c = C(),
      X = esX(c),
      id = t.dataset.v,
      cur = X.s[id];
    if (cur && cur.st === "work" && !(cur.r > 0)) delete X.s[id];
    else X.s[id] = { st: "work", r: (cur && cur.r) || 0, y: esYear(), d: todayISO() };
    save();
    render();
    drawSheet();
  },
  esalready: t => {
    const c = C(),
      s = ES_BY[t.dataset.v];
    esX(c).s[s.id] = { st: "already", r: s.r, y: esYear(), d: todayISO() };
    save();
    render();
    drawSheet();
  },
  esna: t => {
    const c = C();
    esX(c).s[t.dataset.v] = { st: "na", y: esYear(), d: todayISO() };
    save();
    render();
    drawSheet();
  },
  esundo: t => {
    const c = C(),
      X = esX(c),
      id = t.dataset.v;
    if (esLegacy(c, X, id)) X.s[id] = { st: "work", r: 0, y: esYear(), d: todayISO() };
    else delete X.s[id];
    save();
    render();
    drawSheet();
  },
  esans: t => {
    const c = C(),
      X = esX(c),
      k = t.dataset.k,
      v = t.dataset.v;
    if (String(X.a[k]) === String(v)) delete X.a[k];
    else X.a[k] = v;
    save();
    render();
    if (SH) drawSheet();
  },
});
/* ---------- the account line: which accounts to fill first, worked out from the retirement chain ---------- */
function acRec(c, d, o) {
  o = o || {};
  d = d || derive(c);
  const X = esX(c),
    two = c.rel === "Married",
    sd = two ? IG_TAX.sd.two : IG_TAX.sd.one,
    N = knNet(c),
    grossY = (o.gross || N.gross) * 12,
    S = o.S || d.fiSpend,
    ss = (() => {
      try {
        return ssEst(ownTake(c) || c.take, c.ret >= 62 ? 67 : c.ret) * 12;
      } catch (e) {
        return 0;
      }
    })();
  const ssUse = c.ret >= 62 ? ss : 0,
    rNow = esBr(grossY - sd, two),
    rLater = esBr(Math.max(0, S - ssUse) - sd, two),
    hsa = X.a.hsa === "yes",
    early = c.ret < 59.5 && c.work !== "Retired",
    roth = rNow <= 0.12 || rNow <= rLater,
    kept = Math.max(0, c.take - c.spend);
  const order = [];
  if (c.match === "no") order.push(["match", "Get your job's full match"]);
  if (hsa) order.push(["hsa", "HSA"]);
  order.push(roth ? ["roth", "Your Roth IRA"] : ["trad", "Your workplace plan, as traditional"]);
  order.push(roth ? ["trad", "Your workplace plan"] : ["roth", "Your Roth IRA"]);
  if (early) order.push(["tax", "a regular account for the years before 59½"]);
  const P = v => Math.round(v * 100) + "%",
    why = roth
      ? rNow <= 0.12
        ? "your tax rate today, about " + P(rNow) + ", is low"
        : "your tax rate today, about " +
          P(rNow) +
          ", is no higher than the " +
          P(rLater) +
          " you are likely to pay in retirement"
      : "your tax rate today, about " +
        P(rNow) +
        ", is higher than the " +
        P(rLater) +
        " you are likely to pay in retirement";
  const main = roth
      ? "your Roth IRA, then your workplace plan"
      : "your workplace plan as traditional, then your Roth IRA",
    lead =
      (c.match === "no" ? "Match first, then " : "") +
      (hsa ? (c.match === "no" ? "HSA, then " : "HSA first, then ") : "") +
      main,
    line = lead.charAt(0).toUpperCase() + lead.slice(1) + ": " + why + ".";
  let left = kept;
  const amt = [],
    take = (n, v) => {
      const a = Math.max(0, Math.min(left, v));
      left -= a;
      amt.push([n, a]);
    };
  if (hsa) take("HSA", (two ? IG_TAX.hsa.fam : IG_TAX.hsa.one) / 12);
  take(roth ? "Roth IRA" : "Workplace plan, traditional", roth ? ROTH / 12 : left * 0.7);
  take(roth ? "Workplace plan" : "Roth IRA", roth ? left * (early ? 0.5 : 1) : ROTH / 12);
  if (early) take("Regular account, for the bridge", left);
  else if (left > 0) take("Regular account", left);
  const parts = [
      ["Your budget", !!c.led && isSharp(c, "spend"), ["sharp", "spend"]],
      ["Your pay", !!c.led && isSharp(c, "take"), ["sharp", "take"]],
      ["Your taxes", !!(c.x && c.x.taxPct), ["knask", "tax"]],
      ["Your account mix", !!c.led && (c.invs || []).length > 0 && isSharp(c, "inv"), ["sharp", "inv"]],
      ["Whether your plan allows an HSA", X.a.hsa === "yes" || X.a.hsa === "no", ["node", "fy_hsaopen"]],
    ],
    real = parts.filter(p => p[1]).length,
    st = real === parts.length ? "Exact" : real >= 3 ? "Close" : "Guess";
  return { roth, rNow, rLater, line, order, amt, parts, st, hsa, early, ss, S, grossY, sd, kept };
}
/* the parts list rule: ask next for the missing part that could change the answer */
function acAsk(c, d, R) {
  const X = esX(c);
  if (X.a.hsa !== "yes" && X.a.hsa !== "no") return ["Does your health plan allow an HSA?", "node", "fy_hsaopen"];
  if (!(c.x && c.x.taxPct)) {
    const a = acRec(c, d, { gross: c.take / 0.9 }).roth,
      b = acRec(c, d, { gross: c.take / 0.65 }).roth;
    if (a !== b) return ["Your tax rate could change this. Answer it", "knask", "tax"];
  }
  if (!(c.led && isSharp(c, "spend"))) {
    const a = acRec(c, d, { S: d.fiSpend * 0.7 }).roth,
      b = acRec(c, d, { S: d.fiSpend * 1.3 }).roth;
    if (a !== b) return ["Your spending could change this. Make it real", "sharp", "spend"];
  }
  return null;
}
function acLine(c, d, slim) {
  try {
    const R = acRec(c, d),
      ask = slim ? null : acAsk(c, d, R),
      st = typeof cspSt === "function" ? cspSt(R.st) : R.st;
    return `<div class="tile stack acline" style="gap:6px"><div class="small ${R.st === "Guess" ? "guess" : ""}"><span class="tiny muted">Which account first · ${st}</span><br><b>${esc(R.line)}</b></div><div class="row wrap" style="gap:6px"><button class="ghost slim" data-a="acwhy">Why?</button>${ask ? `<button class="ghost slim" data-a="${ask[1]}" data-v="${ask[2]}">${esc(ask[0])}</button>` : ""}</div></div>`;
  } catch (e) {
    return "";
  }
}
function acSheet() {
  const c = C(),
    d = derive(c),
    R = acRec(c, d),
    ask = acAsk(c, d, R),
    L = depLine(DEP_C[0], "spend"),
    P = v => Math.round(v * 100) + "%";
  return (
    head("Which account first", "The order, and why " + esI("acfirst")) +
    `<div class="tile stack" style="gap:6px"><div class="row between"><b class="${R.st === "Guess" ? "guess" : ""}">${esc(R.line)}</b></div><div class="row between tiny muted"><span>Built from ${R.parts.filter(p => p[1]).length} of ${R.parts.length} real parts</span><span class="pill">${cspSt(R.st)}</span></div></div>
 <div class="small"><b>The chain behind it</b></div><div class="tile small depsay">${depSpans(L, true)}</div>
 <div class="small"><b>The order</b></div>${igRows(R.order.map((o, i) => [i + 1 + ". " + esc(o[1].charAt(0).toUpperCase() + o[1].slice(1)), ""]))}${R.early ? `<div class="tiny muted">You stop before 59½, so part of what you keep goes where you can reach it. That is your bridge.</div>` : ""}
 <div class="small"><b>Roughly how much, from the ${money(Math.round(R.kept))} you keep each month</b></div>${igRows(R.amt.filter(a => a[1] > 0).map(a => [esc(a[0]), money(Math.round(a[1])) + " a month"])) || `<div class="tiny muted">Nothing is left over each month yet, so there are no amounts to show.</div>`}
 <div class="small"><b>The parts it is built on</b></div>${R.parts.map(p => `<div class="row between small" style="gap:8px"><span>${esc(p[0])}</span>${p[1] ? `<span class="tiny muted">Real ✓</span>` : `<button class="ghost slim" data-a="${p[2][0]}" data-v="${p[2][1]}">Fill it in</button>`}</div>`).join("")}
 ${ask ? `<button class="primary wide slim" data-a="${ask[1]}" data-v="${ask[2]}">${esc(ask[0])}</button>` : ""}` +
    mathBox([
      "Pay before taxes: about " + money(Math.round(R.grossY)) + " a year. Standard deduction: " + money(R.sd),
      "Your top federal rate today: about " + P(R.rNow),
      "Spending when you stop: " +
        money(Math.round(R.S)) +
        " a year. Social Security could cover about " +
        money(Math.round(R.ss)),
      (c.ret >= 62
        ? "What savings would have to pay after Social Security"
        : "You stop before Social Security starts, so savings pay for all of it. That") +
        ", less the standard deduction, lands in the " +
        P(R.rLater) +
        " bracket",
      "Today at or under 12%, or no higher than later: Roth first. Higher than later: traditional first",
      R.early
        ? "You stop before 59½, so some money goes where you can reach it"
        : "You stop after 59½, so a bridge is not needed",
    ]) +
    `<div class="tiny muted">A rule of thumb from 2026 federal brackets. It leaves out state tax, the size of your match and income limits on Roth accounts. Other teachers on the famous ideas list would order these differently.</div><button class="ghost wide slim" data-a="dep">Open What depends on what</button>`
  );
}
Object.assign(ACT, {
  acwhy: () => {
    W = { kind: "acwhy" };
    DEPX.play = 0;
    sheet(acSheet);
    try {
      const s = document.querySelector("#ov .sheet");
      if (s) s.scrollTop = 0;
    } catch (e) {}
  },
});
/* the line shows on Home while Free Money or Future You is next, and on the payday split */
(() => {
  if (typeof home === "function") {
    const _h = home;
    home = function () {
      const h = _h();
      try {
        const c = C(),
          d = D || derive(c),
          nx = d.era + 1;
        if (
          c &&
          (c.placed || G.demo) &&
          (nx === 2 || nx === 5) &&
          typeof homeRowAdd === "function" &&
          !(typeof fkFull === "function" && fkFull(c))
        )
          return homeRowAdd(h, `<div class="homerow">${acLine(c, d)}</div>`);
      } catch (e) {}
      return h;
    };
  }
  if (typeof paySheet === "function") {
    const _p = paySheet;
    paySheet = function () {
      const h = _p();
      try {
        return h + acLine(C(), derive(C()));
      } catch (e) {
        return h;
      }
    };
  }
  if (typeof reviewSheet === "function") {
    const _r = reviewSheet;
    reviewSheet = function () {
      const h = _r();
      try {
        return (
          h +
          `<div class="tile tiny esyear">A new year starts the yearly steps fresh: fill your Roth IRA (${money(ROTH)} for ${esYear()}) and your HSA (${money(IG_TAX.hsa.one)}, or ${money(IG_TAX.hsa.fam)} for a family). Key moments you have reached stay reached.</div>`
        );
      } catch (e) {
        return h;
      }
    };
  }
})();
Object.assign(GLOSS, {
  es_roth: [
    "Roth IRA",
    "A retirement account you open yourself. You put in money you have already paid tax on, and it grows and comes out with no tax. There is a yearly limit.",
  ],
  es_hsa: GLOSS.hsa || ["HSA", "A health savings account."],
  es_wplan: [
    "Workplace plan",
    "A retirement plan through your job, like a 401(k) or 403(b). Money goes in straight from your paycheck.",
  ],
  es_fystar: [
    "Future you gets paid first",
    "The key moment of Future You: your Roth IRA is filled for the year and your workplace plan is at your target.",
  ],
  es_qqfi: [
    "Quiet Quitting FI",
    "The point where adding only a Roth IRA each year would still get you to your number on time.",
  ],
  es_ssclaim: GLOSS.ssclaim,
  es_needswants: [
    "Needs and wants",
    "Needs are what it costs to keep your life running. Wants are everything else. In retirement, needs are the part that has to be covered no matter what.",
  ],
  es_reeval: [
    "Reevaluation moment",
    "A planned stop to ask what you want now that the numbers have changed. The game has two: when the bare minimum is enough, and when enough is already saved.",
  ],
  es_bridge: [
    "Bridge years",
    "The years between when you stop working and 59½, when most retirement accounts open without a penalty.",
  ],
  es_rule55: GLOSS.rule55,
  es_mctrap: GLOSS.mctrap,
  es_shape: [
    "Shape",
    "The pattern of your working years. Spark is a hard push early. Seasons is on and off. Barbell is mostly safe with a few bold bets.",
  ],
  es_wrate: GLOSS.wrate,
  es_fill: GLOSS.fill,
  es_wongame: GLOSS.wongame,
  es_drawdown: [
    "Drawdown plan",
    "Your plan for living off your investments: which method, how much a month, from which account.",
  ],
  es_benef: [
    "Beneficiary",
    "The person named on an account or policy to receive it when you die. The form beats your will.",
  ],
  es_giveplan: ["Giving plan", "Deciding ahead of time how, how much and when you give."],
  es_estate: [
    "Estate basics",
    "The papers that say who gets what and who decides for you: a will, a power of attorney, and a health care proxy.",
  ],
  es_famplan: ["Family money plan", "Telling the people involved what exists, where it is, and what you hope it does."],
  es_grad: ["Graduation choice", "Naming what comes after your own life is covered."],
  acfirst: [
    "Which account first",
    "A rule of thumb for the order to fill your accounts: the match, an HSA if you can have one, then Roth or traditional depending on whether your tax rate is lower now or later. It is worked out from the retirement chain: your budget sets your retirement spending, which sets your taxes later.",
  ],
});
if (typeof NV_INFO !== "undefined") {
  NV_INFO.estep = [
    "One step",
    "A step in an era: why it matters, how to do it, and where you are with it.",
    "Tap done, working on it, already done, or doesn't apply. The ★ step is the era's key moment.",
  ];
  NV_INFO.acwhy = [
    "Which account first",
    "The order to fill your accounts, and the chain it comes from.",
    "Fill in a missing part and the answer gets firmer.",
  ];
  GLOSS.scr_estep = [NV_INFO.estep[0], NV_INFO.estep[1] + " " + NV_INFO.estep[2]];
  GLOSS.scr_acwhy = [NV_INFO.acwhy[0], NV_INFO.acwhy[1] + " " + NV_INFO.acwhy[2]];
}
if (typeof MENU !== "undefined")
  MENU.push(["Which account first", "acwhy", "act", "Roth, traditional, HSA or a regular account, and why"]);
/* when the numbers for the next era are there and only its key moment is missing, that is the one thing to do */
(() => {
  if (typeof nextStep !== "function") return;
  const _ns = nextStep;
  nextStep = function (c, d) {
    const r = _ns(c, d);
    try {
      if (d && d.starWait >= 6 && !(typeof fkFull === "function" && fkFull(c))) {
        const s = ES.find(q => q.era === d.starWait && q.star);
        if (s)
          return {
            t: "★ " + s.n,
            s: "Your numbers are there. This key moment opens " + ERAS[s.era].n + ".",
            a: "node",
            v: s.auto ? (s.era === 8 ? (esX(c).a.wm ? "f_pay" : "f_method") : s.id) : s.id,
            l: "Open it",
          };
      }
    } catch (e) {}
    return r;
  };
})();
