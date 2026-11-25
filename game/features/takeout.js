/* ============================================================================
   SLAM the Game: features/takeout.js
   PURPOSE     Taking money out. Four answers on one sheet, each from the numbers the game already has,
               and a fifth tab, "Compare the ways" (features/ways.js).
               (1) The order: which account to take from first, by the cost of one dollar. (2) Guardrails:
               the rate at the stop age, and the two lines where spending moves down or up by 10%.
               (3) Before 59 and a half: four ways to cover the years from the stop age to 59 and a half
               (bridge accounts, a Roth ladder, 72(t) payments, the Rule of 55), year by year.
               (4) Health cover until 65: the cost of a marketplace plan after the credit, and what a
               Roth conversion adds to it.
   INPUT       The profile: c.age, c.ret, c.take, c.spend, c.inv, c.invs (with the tax kind of each
               account), c.cashes, c.x.taxv (filing status, pay, state), c.x.tko (the answers of this
               sheet), c.x.takeout (the typed deposits of each Roth account, dep_<number>). data/takeout2026.js. The open sheet (W.kind): takeout.
   OUTPUT      Functions: tkoInputs, tkoRoths, tkoChecked, tkoRothAsk, tkoOrdTax, tkoGainsTax, tkoOrder,
               tkoGrow, tkoSepp, tkoPath, tkoBridge, tkoGuard, tkoPremium, tkoAcaRun, tkoAca, tkoBook, tkoSheet. Actions (ACT):
               takeout, tkotab, tkodepclear. Menu: "Taking money out".
   DEPENDS ON  data/takeout2026.js, core/engine.js (derive, txSplit, passives), screens/ui.js,
               features/retire.js (retireTax, retireSafeSpend, RETIRE_METHODS), features/taxview.js
               (taxvInputs), features/slept.js (sleptRate), features/kit.js.
   RULES       The math is the math of the older tools (the waterfall, the Middle Class Trap, the price
               of cover). All amounts are in today's dollars, and growth is the return of the plan after
               inflation. Money saved until the stop age goes to a regular account. Cash does not grow.
               Tax on a withdrawal is the federal and state tax of the retirement engine's 2026 tables
               on that year's ordinary income. Gains above the 0% room pay 15%. A path gets a plain
               state (covers each year, covers with little left, short in some years), not a verdict.
               The words are "If these assumptions hold". This is arithmetic, not advice.
   ========================================================================= */
const TKO_TABS = [
  ["order", "The order"],
  ["guard", "Guardrails"],
  ["bridge", "Before 59½"],
  ["aca", "Health cover"],
  ["compare", "Compare the ways"],
];
const TKO_ROTH = [
  [0.25, "About a quarter"],
  [0.5, "About half"],
  [0.75, "Most of it"],
  [1, "All of it"],
];
const TKO_PREM = [400, 600, 800, 1000, 1400, 1800];
const TKO_OTHER = [0, 10000, 20000, 40000, 60000];
const TKO_CONV = [0, 10000, 20000, 40000, 60000];
const TKO_SIZE = [1, 2, 3, 4, 5];
const TKO_PATHS = [
  [
    "bridge",
    "Bridge accounts",
    "Spend cash, regular accounts and Roth deposits. Leave pre-tax money alone until 59 and a half.",
  ],
  [
    "ladder",
    "Roth ladder",
    "Convert one year of spending each year and pay the tax then. Spend each conversion 5 years later. The bridge accounts carry the first 5 years.",
  ],
  [
    "sepp",
    "72(t) payments",
    "Take one fixed payment a year from pre-tax money by the IRS method. It is taxed as income, with no 10% extra tax.",
  ],
  [
    "rule55",
    "Rule of 55",
    "Leave that job in or after the year you turn 55, and its plan can be spent. It is taxed as income, with no 10% extra tax.",
  ],
];
const TKO_STATE = { covers: "Covers each year", thin: "Covers, with little left", short: "Short in some years" };
const TKO_TAX = {};
/* THE NUMBERS OF THE PLAYER that all four answers use. */
function tkoInputs(c) {
  const d = derive(c),
    I = taxvInputs(c),
    s = c.led && (c.invs || []).length ? txSplit(c) : { pre: c.inv || 0, roth: 0, tax: 0, hsa: 0 },
    share = kitValue(c, "tko", "roth", 0.5),
    E = TAKEOUT_2026.early,
    roths = tkoRoths(c, share.v),
    dep = roths.reduce((a, r) => a + r.dep, 0),
    allTyped = roths.length > 0 && roths.every(r => r.typed);
  return {
    age: c.age,
    stop: Math.max(c.age, c.ret),
    spend: d.fiSpend,
    save: Math.max(0, (c.take || 0) - (c.spend || 0)) * 12,
    r: typeof sleptRate === "function" ? sleptRate(c) : R,
    filing: I.filing.v,
    state: I.state.v,
    gross: I.gross.v,
    pre: I.pre.v * 12,
    share,
    roths,
    piles: {
      cash: d.cash || 0,
      tax: s.tax,
      taxBasis: s.tax * E.basisShare,
      rothBasis: dep,
      rothEarn: Math.max(0, s.roth - dep),
      pre: s.pre + s.hsa,
    },
    st: kitState([kitSharp(c, "inv"), kitSharp(c, "spend"), allTyped ? { cf: 3 } : share]),
  };
}
/* The Roth accounts, each with its deposits: the amount the player typed (Exact, never more than the
   balance), or else the share of the balance from the chips. The typed amounts are in c.x.takeout. */
function tkoRoths(c, share) {
  if (!c.led) return [];
  const T = kitStore(c, "takeout");
  return (c.invs || [])
    .map((r, i) => ({ r, i }))
    .filter(x => txOf(x.r) === "roth" && x.r.amt > 0)
    .map(x => {
      const t = T["dep_" + x.i],
        typed = !!(t && t.v != null);
      return {
        i: x.i,
        k: x.r.k,
        amt: x.r.amt,
        typed,
        dep: typed ? Math.min(Math.max(0, +t.v), x.r.amt) : x.r.amt * share,
      };
    });
}
/* The check of the reference tables, in words for the screen (data/takeout2026.js has the full record). */
function tkoChecked(part) {
  const X = TAKEOUT_2026,
    L = X.checks[part],
    q = L.filter(r => r[2] === "quoted"),
    a = L.filter(r => r[2] !== "quoted"),
    say = list => list.map(r => r[0].charAt(0).toLowerCase() + r[0].slice(1) + " (" + r[1] + ")").join("; ");
  return (
    "Checked on " +
    X.checked +
    ": " +
    say(q) +
    "." +
    (a.length
      ? " Checked against copies that agree, because the official page could not be opened that day: " + say(a) + "."
      : "") +
    " Arithmetic on your numbers, not advice."
  );
}
/* THE QUESTION ABOUT ROTH DEPOSITS: the share by chips, and for each Roth account the exact amount by the
   keypad. A typed amount wins and is Exact. */
function tkoRothAsk(c, P) {
  if (!P.roths.length) return "";
  let h = P.roths.every(r => r.typed)
    ? ""
    : kitAsk(c, "tko", "roth", "How much of your Roth is money you put in?", TKO_ROTH, 0.5, {
        term: "tko_basis",
        help: "The rest is growth. Form 5498 of each year shows what you put in.",
      });
  P.roths.forEach(r => {
    const k = "takeout|dep_" + r.i,
      pk = kitPadKey("takeout", "dep_" + r.i),
      open = W && W.pad === pk;
    h +=
      `<div class="field kitask tkodep"><div class="row between" style="gap:8px"><span class="small">Exact deposits in ${esc(r.k)} (${money(r.amt)})</span><span class="row" style="gap:6px">${r.typed ? kitPill("Exact") : ""}${kitInfo("tko_basis")}</span></div>` +
      (r.typed
        ? `<div class="small">You put in <b>${money(r.dep)}</b>. This number is used, not the share.</div>`
        : "") +
      (open
        ? `<div class="val">${money((W.o && W.o[pk]) || 0)}</div>${keypad(pk)}<div class="row" style="gap:8px"><button class="primary slim" data-a="kittyped" data-k="${k}">Use this number</button><button class="ghost slim" data-a="padclose">Cancel</button></div>`
        : `<div class="row wrap" style="gap:6px"><button class="ghost slim" data-a="kitpad" data-k="${k}">${r.typed ? "Change the number" : "Type the exact number"}</button>${r.typed ? `<button class="ghost slim" data-a="tkodepclear" data-v="${r.i}">Use the share again</button>` : ""}</div>`) +
      `</div>`;
  });
  return h;
}
/* The federal and state tax on one year of ordinary income, with no pay from work. */
function tkoOrdTax(P, income) {
  const v = Math.round(Math.max(0, income) / 100) * 100,
    k = P.filing + "|" + P.state + "|" + v;
  if (TKO_TAX[k] == null) {
    const T = retireTax(v, 0, P.filing, P.state, Math.max(P.stop, 40));
    TKO_TAX[k] = { tax: T.federal + T.state, room: T.gainsRoom };
  }
  return TKO_TAX[k];
}
/* The tax on gains: the gains above the 0% room pay 15%. */
function tkoGainsTax(P, gains, ordinary) {
  return Math.max(0, gains - tkoOrdTax(P, ordinary).room) * 0.15;
}
/* (1) THE ORDER. Each kind of money, the cost of one dollar today, cheapest first. With an amount, the
   pulls that cover it. The rates are today's: the top bracket, the state share, 10% under 59 and a half. */
function tkoOrder(c, amount) {
  const P = tkoInputs(c),
    E = TAKEOUT_2026.early,
    T = retireTax(P.gross, P.pre, P.filing, P.state, c.age),
    under = c.age < E.accessAge,
    stateRate = T.taxable > 0 ? T.state / T.taxable : 0,
    cg = T.taxable >= T.zero ? 0.15 : 0,
    preRate = T.top + stateRate + (under ? E.penaltyRate : 0),
    p = P.piles,
    gainShare = p.tax > 0 ? Math.max(0, 1 - p.taxBasis / p.tax) : 0,
    tiers = [
      { id: "cash", n: "Cash", amt: p.cash, rate: 0, why: "It is already money. No tax." },
      {
        id: "rothBasis",
        n: "Roth deposits",
        amt: p.rothBasis,
        rate: 0,
        why: "What you put in comes out at any age, with no tax.",
      },
      {
        id: "taxable",
        n: "Regular accounts",
        amt: p.tax,
        rate: gainShare * cg,
        why: "Tax on the growth only: " + kitPct(cg, 0) + " on about " + kitPct(gainShare, 0) + " of each dollar.",
      },
      {
        id: "pretax",
        n: "Pre-tax accounts (401k, IRA, HSA)",
        amt: p.pre,
        rate: preRate,
        why:
          "Each dollar is income: " +
          kitPct(T.top, 0) +
          " federal" +
          (stateRate > 0 ? ", " + kitPct(stateRate) + " state" : "") +
          (under ? ", and 10% extra before 59 and a half." : "."),
      },
      {
        id: "rothEarn",
        n: "Roth growth",
        amt: p.rothEarn,
        rate: under ? preRate : 0,
        why: under ? "The growth is taxed as income, plus 10%, until 59 and a half." : "No tax from 59 and a half.",
      },
    ]
      .filter(t => t.amt > 0)
      .map((t, i) => Object.assign(t, { i, cost: t.amt * t.rate }))
      .sort((a, b) => a.rate - b.rate || a.i - b.i);
  let left = amount == null ? 0 : amount,
    pullCost = 0;
  const pulls = [];
  tiers.forEach(t => {
    if (left <= 0) return;
    const take = Math.min(left, t.amt);
    pulls.push({ id: t.id, n: t.n, amt: take, cost: take * t.rate });
    pullCost += take * t.rate;
    left -= take;
  });
  const reach = tiers.reduce((a, t) => a + t.amt, 0),
    cost = tiers.reduce((a, t) => a + t.cost, 0);
  return {
    P,
    tiers,
    pulls,
    reach,
    cost,
    net: reach - cost,
    amount,
    pullCost,
    short: Math.max(0, left),
    under,
    top: T.top,
  };
}
/* The piles at a stop age: the invested piles grow, and what the player saves goes to a regular account. */
function tkoGrow(P, stop) {
  const s = Object.assign({}, P.piles),
    n = Math.max(0, Math.round(stop - P.age));
  for (let y = 0; y < n; y++) {
    s.tax = s.tax * (1 + P.r) + P.save;
    s.taxBasis += P.save;
    s.rothEarn *= 1 + P.r;
    s.pre *= 1 + P.r;
  }
  return s;
}
/* The 72(t) payment a year: a level payment on the pre-tax money at 5%, over the IRS life expectancy. */
function tkoSepp(pre, age) {
  const E = TAKEOUT_2026.early,
    a = Math.max(40, Math.min(65, Math.round(age))),
    N = Math.round(E.life[a] * 12),
    m = E.seppMaxRate / 12;
  return pre > 0 ? ((pre * m) / (1 - Math.pow(1 + m, -N))) * 12 : 0;
}
/* (3) ONE PATH from the stop age to 59 and a half, year by year. */
function tkoPath(id, P, stop) {
  const E = TAKEOUT_2026.early,
    def = TKO_PATHS.find(x => x[0] === id),
    out = { id, n: def[1], words: def[2], ok: true, why: "", rows: [], tax: 0, short: 0, shortAges: [], sepp: 0 },
    s = tkoGrow(P, stop),
    H = Math.max(0, Math.ceil(E.accessAge - stop)),
    spend = P.spend;
  if (id === "rule55" && stop < E.rule55Age) {
    out.ok = false;
    out.why = "Only from 55: you would leave at " + stop + ".";
  } else if (id !== "bridge" && s.pre <= 0) {
    out.ok = false;
    out.why = "No pre-tax money to reach.";
  }
  if (!out.ok) return out;
  const queue = [];
  if (id === "sepp") out.sepp = tkoSepp(s.pre, stop);
  for (let y = 0; y < H; y++) {
    let ordinary = 0,
      conv = 0,
      fromPre = 0,
      take;
    if (id === "ladder") {
      queue.forEach(q => {
        if (q.at === y) s.rothBasis += q.amt;
      });
      conv = Math.min(spend, s.pre);
      if (conv > 0) {
        s.pre -= conv;
        queue.push({ at: y + E.seasoningYears, amt: conv });
        ordinary += conv;
      }
    }
    if (id === "sepp") {
      fromPre = Math.min(out.sepp, s.pre);
      s.pre -= fromPre;
      s.cash += fromPre;
      ordinary += fromPre;
    }
    let ordTax = tkoOrdTax(P, ordinary).tax,
      need = spend + ordTax,
      gains = 0;
    take = Math.min(need, s.cash);
    s.cash -= take;
    need -= take;
    if (need > 0 && s.tax > 0) {
      take = Math.min(need, s.tax);
      const gs = Math.max(0, 1 - s.taxBasis / s.tax);
      gains = take * gs;
      s.taxBasis -= take * (1 - gs);
      s.tax -= take;
      need -= take;
    }
    if (need > 0 && s.rothBasis > 0) {
      take = Math.min(need, s.rothBasis);
      s.rothBasis -= take;
      need -= take;
    }
    if (id === "rule55" && need > 0 && s.pre > 0) {
      take = Math.min(need, s.pre);
      s.pre -= take;
      fromPre += take;
      need -= take;
      ordinary += take;
      const extra = tkoOrdTax(P, ordinary).tax - ordTax;
      ordTax += extra;
      need += extra;
      if (need > 0 && s.pre > 0) {
        take = Math.min(need, s.pre);
        s.pre -= take;
        fromPre += take;
        need -= take;
      }
    }
    const cgTax = gains > 0 ? tkoGainsTax(P, gains, ordinary) : 0;
    if (cgTax > 0) {
      take = Math.min(cgTax, s.cash);
      s.cash -= take;
      let left = cgTax - take;
      if (left > 0 && s.rothBasis > 0) {
        take = Math.min(left, s.rothBasis);
        s.rothBasis -= take;
        left -= take;
      }
      need += left;
    }
    out.tax += ordTax + cgTax;
    if (need > 0.5) {
      out.short += need;
      out.shortAges.push(stop + y);
    }
    out.rows.push({
      age: stop + y,
      tax: ordTax + cgTax,
      conv,
      fromPre,
      short: Math.max(0, need),
      left: s.cash + s.tax + s.rothBasis,
    });
    s.tax *= 1 + P.r;
    s.rothEarn *= 1 + P.r;
    s.pre *= 1 + P.r;
  }
  out.left = out.rows.length ? out.rows[out.rows.length - 1].left : s.cash + s.tax + s.rothBasis;
  out.preLeft = s.pre;
  out.state = out.shortAges.length ? "short" : out.left < E.thinYears * spend ? "thin" : "covers";
  out.penalty = out.short * E.penaltyRate;
  return out;
}
/* (3) ALL FOUR PATHS at a stop age (the stop age of the plan when none is given). */
function tkoBridge(c, stop, P) {
  P = P || tkoInputs(c);
  stop = stop == null ? P.stop : stop;
  const E = TAKEOUT_2026.early,
    at = tkoGrow(P, stop),
    yrs = Math.max(0, E.accessAge - stop),
    paths = TKO_PATHS.map(x => tkoPath(x[0], P, stop)),
    rank = { covers: 2, thin: 1, short: 0 },
    live = paths.filter(p => p.ok),
    best = live.slice().sort((a, b) => rank[b.state] - rank[a.state] || a.tax - b.tax)[0] || null,
    have = at.cash + at.tax + at.rothBasis;
  return {
    P,
    stop,
    yrs,
    needed: yrs > 0,
    need: yrs * P.spend,
    have,
    gap: Math.max(0, yrs * P.spend - have),
    years: P.spend > 0 ? have / P.spend : null,
    at,
    paths,
    best,
  };
}
/* (2) GUARDRAILS at the stop age. The rate is the need divided by the invested money. Spending moves down
   10% when the rate is 20% above the start, and up 10% when it is 20% below (Guyton and Klinger). */
function tkoGuard(c) {
  const P = tkoInputs(c),
    at = tkoGrow(P, P.stop),
    p = passives(c),
    bal = at.tax + at.rothBasis + at.rothEarn + at.pre,
    need = Math.max(0, P.spend - (p.now || 0) * 12),
    safe = retireSafeSpend(bal, RETIRE_METHODS[0][0], P.stop);
  return {
    P,
    bal,
    need,
    rate: bal > 0 ? need / bal : null,
    cutAt: bal / 1.2,
    raiseAt: bal / 0.8,
    cutTo: need * 0.9,
    raiseTo: need * 1.1,
    safe: safe.year,
    safeRate: safe.rate,
    ss: (p.ss || 0) * 12,
  };
}
/* (4) The premium of one year after the credit. cliff: the credit stops above 4 times the poverty line. */
function tkoPremium(magi, size, full, cliff) {
  const A = TAKEOUT_2026.aca,
    fpl = A.fplBase + A.fplPerPerson * (Math.max(1, size) - 1),
    mult = magi / fpl,
    over = mult > A.cliffMultiple,
    row = A.percent.find(r => mult < r[1]) || A.percent[A.percent.length - 1],
    share = row[2] + (row[3] - row[2]) * Math.min(1, Math.max(0, (mult - row[0]) / (row[1] - row[0]))),
    expected = !over ? magi * share : cliff ? full : magi * A.capNoCliff;
  return {
    pay: Math.min(full, Math.max(0, expected)),
    over,
    share: over ? null : share,
    mult,
    fpl,
    line: fpl * A.cliffMultiple,
    room: Math.max(0, fpl * A.cliffMultiple - magi),
  };
}
/* The years from the stop age to 65 with one conversion amount a year. */
function tkoAcaRun(P, o, conv) {
  let bal = o.pre,
    tax = 0,
    on = 0,
    off = 0,
    done = 0;
  const rows = [];
  for (let age = o.start; age < TAKEOUT_2026.aca.medicareAge; age++) {
    const cv = Math.max(0, Math.min(conv, bal)),
      magi = o.other + cv,
      t = tkoOrdTax(P, magi).tax,
      a = tkoPremium(magi, o.size, o.full, true),
      b = tkoPremium(magi, o.size, o.full, false);
    rows.push({ age, conv: cv, magi, tax: t, on: a.pay, off: b.pay, over: a.over });
    tax += t;
    on += a.pay;
    off += b.pay;
    done += cv;
    bal = (bal - cv) * (1 + P.r);
  }
  return { rows, tax, on, off, totalOn: tax + on, totalOff: tax + off, done, left: bal };
}
/* (4) HEALTH COVER UNTIL 65: the cost with a conversion a year, next to no conversion, under both rules. */
function tkoAca(c) {
  const P = tkoInputs(c),
    A = TAKEOUT_2026.aca,
    I = {
      prem: kitValue(c, "tko", "prem", 600),
      size: kitValue(c, "tko", "size", P.filing === "joint" ? 2 : 1),
      other: kitValue(c, "tko", "other", 0),
      conv: kitValue(c, "tko", "conv", 0),
    },
    start = Math.floor(P.stop);
  if (start >= A.medicareAge) return { P, I, none: true, start };
  const o = { start, size: I.size.v, full: I.prem.v * 12, other: I.other.v, pre: tkoGrow(P, P.stop).pre },
    w = tkoAcaRun(P, o, I.conv.v),
    base = tkoAcaRun(P, o, 0),
    first = tkoPremium(o.other, o.size, o.full, true);
  return {
    P,
    I,
    start,
    years: w.rows.length,
    full: o.full,
    pre: o.pre,
    w,
    base,
    low: Math.min(w.totalOn, w.totalOff),
    high: Math.max(w.totalOn, w.totalOff),
    extraOn: w.totalOn - base.totalOn,
    extraOff: w.totalOff - base.totalOff,
    overYears: w.rows.filter(r => r.over).length,
    room: first.room,
    below: first.mult < 1,
    line: first.line,
    fpl: first.fpl,
    st: kitState([I.prem, I.size, I.other, I.conv, kitSharp(c, "inv")]),
  };
}
/* The rows for the spreadsheet of the plan (book.js). */
function tkoBook(c) {
  const G0 = tkoGuard(c),
    B = tkoBridge(c),
    A = tkoAca(c),
    O = tkoOrder(c, G0.P.spend),
    X = TAKEOUT_2026,
    rows = [
      { id: "tk_spend", label: "Spending a year after work", v: G0.P.spend, note: "Your number, today's dollars" },
      { id: "tk_need", label: "Needed from investments a year", v: G0.need, note: "Spending less income that goes on" },
      {
        id: "tk_bal",
        label: "Invested at the stop age",
        v: Math.round(G0.bal),
        note: "Worked out by the game: your accounts grown year by year at the return of the plan, plus what you save.",
      },
      {
        id: "tk_rate",
        label: "Starting rate",
        v: G0.bal > 0 ? G0.need / Math.round(G0.bal) : 0,
        f: "={tk_need}/{tk_bal}",
      },
      { id: "tk_cut", label: "Spending goes down 10% below", v: Math.round(G0.bal) / 1.2, f: "={tk_bal}/1.2" },
      { id: "tk_raise", label: "Spending goes up 10% above", v: Math.round(G0.bal) / 0.8, f: "={tk_bal}/0.8" },
      { id: "tk_cutto", label: "Spending after one cut", v: G0.need * 0.9, f: "={tk_need}*0.9" },
      { id: "tk_stop", label: "Stop age", v: B.stop, note: "Your plan" },
      { id: "tk_access", label: "Age when pre-tax accounts open", v: X.early.accessAge, note: "IRC 72(t)" },
      { id: "tk_yrs", label: "Years to cover before then", v: B.yrs, f: "=MAX(0,{tk_access}-{tk_stop})" },
      { id: "tk_bneed", label: "Cost of those years", v: B.need, f: "={tk_yrs}*{tk_spend}" },
      {
        id: "tk_have",
        label: "Reachable at the stop age (cash, regular accounts, Roth deposits)",
        v: Math.round(B.have),
        note: "Worked out by the game",
      },
      {
        id: "tk_gap",
        label: "Not covered by reachable money",
        v: Math.max(0, B.need - Math.round(B.have)),
        f: "=MAX(0,{tk_bneed}-{tk_have})",
      },
      {
        id: "tk_roth",
        label: "In Roth accounts now",
        v: G0.P.piles.rothBasis + G0.P.piles.rothEarn,
        note: "Your accounts",
      },
      G0.P.roths.some(r => r.typed)
        ? {
            id: "tk_rothdep",
            label: "Roth deposits (what you put in)",
            v: G0.P.piles.rothBasis,
            note: G0.P.roths.every(r => r.typed)
              ? "Exact: the amounts you typed for each Roth account"
              : "The amounts you typed, and your share answer for the other Roth accounts",
          }
        : {
            id: "tk_rothdep",
            label: "Roth deposits (what you put in)",
            v: G0.P.piles.rothBasis,
            f: "={tk_roth}*" + G0.P.share.v,
            note: "Your share answer. Type the exact amount in the game to replace it.",
          },
      {
        id: "tk_rothgrow",
        label: "Roth growth (waits until 59 and a half)",
        v: G0.P.piles.rothEarn,
        f: "=MAX(0,{tk_roth}-{tk_rothdep})",
      },
      {
        id: "tk_order",
        label: "Tax cost of one year of spending taken today, cheapest order",
        v: Math.round(O.pullCost),
        note: "Worked out by the game: each kind of money at its own rate",
      },
    ];
  if (!A.none)
    rows.push(
      { id: "tk_size", label: "People on the health plan", v: A.I.size.v, note: "Your answer" },
      {
        id: "tk_fpl",
        label: "Poverty line for that household",
        v: A.fpl,
        f: "=" + X.aca.fplBase + "+" + X.aca.fplPerPerson + "*({tk_size}-1)",
      },
      { id: "tk_line", label: "Income where the credit can stop", v: A.line, f: "={tk_fpl}*" + X.aca.cliffMultiple },
      { id: "tk_prem", label: "Full price of the benchmark plan a year", v: A.full, note: "Your answer, times 12" },
      {
        id: "tk_aca",
        label: "Tax and premiums to 65, lower end",
        v: Math.round(A.low),
        note: "Worked out by the game, year by year",
      }
    );
  return { title: "Taking money out", rows };
}
/* ---------- the sheet ---------- */
function tkoOrderTab(c) {
  const O = tkoOrder(c, tkoInputs(c).spend),
    P = O.P;
  let h =
    kitTile(
      "Reachable today, after tax",
      money(O.net),
      money(O.reach) + " in all, less about " + money(O.cost) + " of tax if you took all of it now.",
      P.st,
      "tko_reach"
    ) +
    `<div class="small"><b>Cheapest dollar first</b> ${kitInfo("tko_order")}</div>` +
    igRows(
      O.tiers.map((t, i) => [
        `<b>${i + 1}. ${esc(t.n)}</b> · ${money(t.amt)}<div class="tiny muted">${esc(t.why)}</div>`,
        t.rate > 0 ? "costs " + kitPct(t.rate, 0) : "no tax",
      ])
    );
  if (O.pulls.length)
    h +=
      `<div class="tile stack" style="gap:4px"><div class="small"><b>One year of spending, ${money(O.amount)}, taken today</b> ${kitInfo("tko_pull")}</div>` +
      igRows(O.pulls.map(p => [esc(p.n), money(p.amt) + (p.cost > 0 ? ", tax " + money(p.cost) : "")])) +
      `<div class="small">Tax cost: <b>${money(O.pullCost)}</b>.${O.short > 0 ? " " + money(O.short) + " is not covered." : ""}</div></div>`;
  h += tkoRothAsk(c, P);
  return (
    h +
    mathBox([
      "Rates today: top federal bracket " +
        kitPct(O.top, 0) +
        " (your tax view), your state at its average share, and 10% extra on pre-tax money and Roth growth before 59 and a half.",
      "Regular accounts: the growth is taken as " +
        kitPct(1 - TAKEOUT_2026.early.basisShare, 0) +
        " of the value, and it pays 15% above the 0% room.",
      "A home is not counted. Each kind of money is sorted by the cost of one dollar.",
    ])
  );
}
function tkoGuardTab(c) {
  const g = tkoGuard(c),
    P = g.P;
  if (!(g.bal > 0))
    return `<div class="tile small">Add your investments, and the guardrails show here.</div><button class="ghost wide" data-a="tab" data-v="money">Open My Money</button>`;
  return (
    kitTile(
      "Rate at the stop age",
      kitPct(g.rate),
      "If these assumptions hold, about " +
        money(g.bal) +
        " is invested at " +
        P.stop +
        ", and " +
        money(g.need) +
        " a year comes out.",
      P.st,
      "tko_rate"
    ) +
    kitColumns([
      {
        title: "Lower guardrail",
        big: money(g.cutAt),
        rows: [
          ["Below this, spending goes down 10% " + kitInfo("tko_guard"), ""],
          ["Spending then", money(g.cutTo) + " a year"],
        ],
      },
      {
        title: "Upper guardrail",
        big: money(g.raiseAt),
        rows: [
          ["Above this, spending goes up 10% " + kitInfo("tko_guard"), ""],
          ["Spending then", money(g.raiseTo) + " a year"],
        ],
      },
    ]) +
    `<div class="small">Guardrails with their own starting rate of ${kitPct(g.safeRate, 0)} give about <b>${money(g.safe)}</b> a year from that money ${kitInfo("tko_safe")}.${g.ss > 0 ? " Social Security adds about " + money(g.ss) + " a year from 67." : ""}</div>` +
    `<div class="row" style="gap:8px"><button class="ghost" style="flex:1" data-a="odds">Test it in 1,000 markets</button><button class="ghost" style="flex:1" data-a="simopen" data-v="stop">Stop earlier or later</button></div>` +
    mathBox([
      "Invested at " +
        P.stop +
        ": your accounts grown at " +
        kitPct(P.r) +
        " a year after inflation, plus " +
        money(P.save) +
        " a year saved.",
      "Rate: " + money(g.need) + " ÷ " + money(g.bal) + " = " + kitPct(g.rate) + ".",
      "Lower guardrail: the money ÷ 1.2. Upper guardrail: the money ÷ 0.8. Each step is 10% of spending (Guyton and Klinger).",
      "The random markets of the retirement odds use the same rule each year.",
    ])
  );
}
function tkoBridgeTab(c) {
  const B = tkoBridge(c),
    P = B.P;
  if (!B.needed)
    return (
      kitTile(
        "Years to cover before 59½",
        "None",
        "Your stop age is " + B.stop + ". The pre-tax accounts are open by then.",
        P.st,
        "tko_access"
      ) + `<button class="ghost wide" data-a="simopen" data-v="stop">Try an earlier stop age</button>`
    );
  let h =
    kitTile(
      "Years to cover before 59½",
      String(B.yrs),
      "From " + B.stop + " to 59 and a half, at " + money(P.spend) + " a year: " + money(B.need) + ".",
      P.st,
      "tko_access"
    ) +
    kitTile(
      "Reachable at " + B.stop,
      money(B.have),
      "Cash, regular accounts and Roth deposits. That is about " +
        Math.round(B.years * 10) / 10 +
        " years of spending.",
      P.st,
      "tko_bridge"
    ) +
    `<div class="small"><b>Four ways to cover those years</b> ${kitInfo("tko_paths")}</div>` +
    kitColumns(
      B.paths.map(p => ({
        title: p.n,
        hot: B.best && B.best.id === p.id,
        big: p.ok ? TKO_STATE[p.state] : "Does not fit",
        guess: P.st === "Guess",
        rows: p.ok
          ? [
              ["Tax in those years", money(p.tax)],
              ["Bridge money left at 59½", money(p.left)],
              p.id === "sepp" ? ["The payment a year " + kitInfo("tko_sepp"), money(p.sepp)] : null,
              p.id === "ladder"
                ? ["Converted each year " + kitInfo("tko_ladder"), money(p.rows[0] ? p.rows[0].conv : 0)]
                : null,
              p.short > 0
                ? [
                    "Not covered",
                    money(p.short) + " (ages " + p.shortAges[0] + " to " + p.shortAges[p.shortAges.length - 1] + ")",
                  ]
                : null,
              p.short > 0 ? ["10% extra tax to fill it early " + kitInfo("tko_pen"), money(p.penalty)] : null,
            ]
          : [[esc(p.why), ""]],
        foot: esc(p.words),
      }))
    );
  const lad = B.paths.find(p => p.id === "ladder");
  if (lad && lad.ok)
    h += `<details class="math"><summary>The Roth ladder, year by year</summary><div class="inner">${igRows(lad.rows.map(r => ["Age " + r.age + ": convert " + money(r.conv), "tax " + money(r.tax) + (r.short > 0 ? ", short " + money(r.short) : "")]))}</div></details>`;
  h += tkoRothAsk(c, P);
  return (
    h +
    `<div class="row" style="gap:8px"><button class="ghost" style="flex:1" data-a="ages">See your two ages</button><button class="ghost" style="flex:1" data-a="simopen" data-v="stop">Stop earlier or later</button></div>` +
    mathBox([
      "Each year: spending plus that year's tax comes from cash, then regular accounts, then Roth deposits.",
      "Roth ladder: one year of spending is converted each year, taxed as income that year, and spendable " +
        TAKEOUT_2026.early.seasoningYears +
        " years later.",
      "72(t): a level payment at 5% over the IRS single life expectancy at the stop age. It must go on for 5 years or to 59 and a half, the longer of the two.",
      "Rule of 55: only for the plan of the job you leave at 55 or later. Money moved to an IRA loses it.",
      "Growth: " +
        kitPct(P.r) +
        " a year after inflation. Cash does not grow. What you save until " +
        B.stop +
        " goes to a regular account.",
      tkoChecked("early"),
    ])
  );
}
function tkoAcaTab(c) {
  const A = tkoAca(c);
  if (A.none)
    return kitTile(
      "Years on a marketplace plan",
      "None",
      "Your stop age is " + A.start + ". Medicare starts at 65.",
      A.P.st,
      "tko_aca"
    );
  const dollars = l => l.map(v => [v, v ? money(v) : "None"]);
  return (
    kitTile(
      "Tax and premiums from " + A.start + " to 65",
      A.low === A.high ? money(A.low) : money(A.low) + " to " + money(A.high),
      A.years + " years. The range is the two rules for the credit.",
      A.st,
      "tko_aca"
    ) +
    kitColumns([
      {
        title: "The 2026 rule: the credit stops at the line",
        big: money(A.w.totalOn),
        rows: [
          ["Premiums " + kitInfo("tko_credit"), money(A.w.on)],
          ["Tax", money(A.w.tax)],
          ["Converting adds", money(A.extraOn)],
        ],
        foot: A.overYears
          ? A.overYears + " of " + A.years + " years are above the line."
          : "No year is above the line.",
      },
      {
        title: "If Congress renews the larger credit",
        big: money(A.w.totalOff),
        rows: [
          ["Premiums " + kitInfo("tko_credit"), money(A.w.off)],
          ["Tax", money(A.w.tax)],
          ["Converting adds", money(A.extraOff)],
        ],
        foot: "Above the line, the plan would cost no more than 8.5% of income. This is not the law now.",
      },
    ]) +
    `<div class="small">The line for ${A.I.size.v} ${A.I.size.v === 1 ? "person" : "people"} is <b>${money(A.line)}</b> of income a year ${kitInfo("tko_cliff")}. Room under it in year one: <b>${money(A.room)}</b>.</div>` +
    (A.below
      ? `<div class="tile small">With this income, year one is below the poverty line (${money(A.fpl)}). The credit does not apply there. In most states Medicaid covers that income.</div>`
      : "") +
    kitAsk(
      c,
      "tko",
      "prem",
      "The benchmark plan a month, at full price",
      TKO_PREM.map(v => [v, money(v)]),
      600,
      {
        term: "tko_bench",
        typed: true,
        help: "Healthcare.gov shows it for your zip code and ages: the second-cheapest silver plan.",
      }
    ) +
    kitAsk(
      c,
      "tko",
      "size",
      "People on the plan",
      TKO_SIZE.map(v => [v, String(v)]),
      A.I.size.v,
      { term: "tko_size" }
    ) +
    kitAsk(c, "tko", "conv", "Roth conversion each year", dollars(TKO_CONV), 0, { term: "tko_ladder", typed: true }) +
    kitAsk(c, "tko", "other", "Other taxable income each year", dollars(TKO_OTHER), 0, {
      term: "tko_magi",
      typed: true,
      help: "Part-time pay, a pension, interest. Money from cash or Roth deposits does not count.",
    }) +
    mathBox([
      "Each year to 65: income is the other income plus the conversion. The tax is the federal and state tax on it.",
      "Below the line, the household pays a share of income that rises with income, from 2.10% to 9.96% (the 2026 table), and never more than the full price.",
      "Above the line in 2026: the full price. The larger credit of 2021 to 2025 ended on December 31, 2025. The second column shows a renewal of its limit of 8.5% of income above the line. Below the line it uses the same 2026 table, so it understates what a full renewal would save.",
      "Pre-tax money at " +
        A.start +
        ": about " +
        money(A.pre) +
        ". What is not converted grows at the return of the plan.",
      "Poverty line: " +
        money(TAKEOUT_2026.aca.fplBase) +
        " for one person plus " +
        money(TAKEOUT_2026.aca.fplPerPerson) +
        " for each more (48 states and DC, the 2025 guidelines, which 2026 cover uses).",
      tkoChecked("aca"),
    ])
  );
}
function tkoSheet() {
  const c = C(),
    tab = (W && W.tab) || "order";
  return (
    head("Plan", "Taking money out") +
    kitTabs("tkotab", tab, TKO_TABS) +
    (tab === "guard"
      ? tkoGuardTab(c)
      : tab === "bridge"
        ? tkoBridgeTab(c)
        : tab === "aca"
          ? tkoAcaTab(c)
          : tab === "compare" && typeof cmpTab === "function"
            ? cmpTab(c) /* ways.js: the same plan through each way to take money out */
            : tkoOrderTab(c)) +
    `<div class="tiny muted">If these assumptions hold. All amounts are in today's dollars.</div>`
  );
}
kitTerms({
  tko_reach: [
    "Reachable today",
    "All your cash and investments, less the tax and the 10% extra tax you would pay to take all of it out now.",
  ],
  tko_order: [
    "Withdrawal order",
    "Which account to take from first. The game sorts each kind of money by what one dollar costs you in tax today.",
  ],
  tko_pull: [
    "One year, taken today",
    "One year of your spending, taken from the cheapest money first, with the tax it costs.",
  ],
  tko_basis: [
    "Roth deposits",
    "The money you put into a Roth, not its growth. You can take deposits out at any age with no tax. The growth waits until 59 and a half.",
  ],
  tko_rate: [
    "Withdrawal rate",
    "The money you take out in a year, divided by the money invested. 4% is the usual rule of thumb for 30 years.",
  ],
  tko_guard: [
    "Guardrails",
    "A rule for spending in retirement: when the markets fall far enough, spend 10% less. When they rise far enough, spend 10% more. Small changes keep the plan working.",
  ],
  tko_safe: [
    "Guardrails spending",
    "What the guardrails method lets you spend in year one. It starts higher than the 4% rule because it agrees to cut in bad years.",
  ],
  tko_access: [
    "59 and a half",
    "The age when pre-tax retirement accounts and Roth growth can be taken with no 10% extra tax.",
  ],
  tko_bridge: [
    "Bridge accounts",
    "Money you can reach at any age: cash, regular investing accounts, and the deposits you made to a Roth.",
  ],
  tko_paths: [
    "Ways to reach money early",
    "Four legal ways to live on your money before 59 and a half. Each one is run year by year on your numbers.",
  ],
  tko_ladder: [
    "Roth conversion (the Roth ladder)",
    "Moving pre-tax money into a Roth. You pay income tax on it that year. Five years later you can take that amount out with no tax. One conversion each year makes a ladder.",
  ],
  tko_sepp: [
    "72(t) payments",
    "Equal yearly payments from a pre-tax account, by an IRS formula. No 10% extra tax, but you must go on for 5 years or until 59 and a half, the longer of the two.",
  ],
  tko_pen: [
    "The 10% extra tax",
    "The extra tax on money taken from a retirement account before 59 and a half, on top of income tax.",
  ],
  tko_aca: [
    "Health cover until 65",
    "Between leaving work and Medicare at 65, most people buy a marketplace (ACA) plan. Its price depends on your income.",
  ],
  tko_credit: [
    "Premium credit",
    "Help with the price of a marketplace plan. With lower income, you pay a smaller share of your income, and the credit pays the rest.",
  ],
  tko_cliff: [
    "The line (the subsidy cliff)",
    "4 times the poverty line. In 2026, one dollar of income above it ends the whole credit. From 2021 to 2025 a larger credit had no such line. It ended on December 31, 2025. The game shows the 2026 rule, and next to it what a renewal would change.",
  ],
  tko_bench: [
    "Benchmark plan",
    "The second-cheapest silver plan where you live. The credit is measured against its full price.",
  ],
  tko_size: ["People on the plan", "The people in your tax household. The poverty line goes up with each person."],
  tko_magi: [
    "Taxable income for the credit",
    "The income the marketplace counts: pay, pensions, interest, gains and Roth conversions. Money from cash or Roth deposits does not count.",
  ],
});
kitScreen(
  "takeout",
  "Taking money out",
  "Which account to take from first, your guardrails, the years before 59 and a half, and health cover until 65.",
  "It uses the numbers you already gave. It is arithmetic, not advice."
);
Object.assign(ACT, {
  takeout: t => {
    const v = t && t.dataset && t.dataset.v;
    W = { kind: "takeout", tab: TKO_TABS.some(x => x[0] === v) ? v : "order", o: {} };
    sheet(tkoSheet);
  },
  tkotab: t => {
    if (!W || W.kind !== "takeout") return;
    W.tab = t.dataset.v;
    W.pad = null;
    drawSheet();
  },
  /* Remove the typed deposits of one Roth account. The share from the chips counts again. */
  tkodepclear: t => {
    const c = C();
    delete kitStore(c, "takeout")["dep_" + t.dataset.v];
    if (W) W.pad = null;
    kitRedraw();
  },
});
kitMenu(
  "Taking money out",
  "takeout",
  "The order, guardrails, the years before 59½, health cover, compare the ways",
  "odds"
);
