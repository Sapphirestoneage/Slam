/* ============================================================================
   SLAM the Game: features/strat.js
   PURPOSE     The Strategy Engine: "Moves to try". One loop, with the same screen for each strategy
               of data/strategies.js: (1) a fit check by taps, (2) the rough impact from the profile,
               (3) sharpen with an area or a real listing, (4) a scenario dial, (5) the break-even line,
               (6) the verdict and "Add to my steps". The strategies are ranked, the top 3 show on
               Next Steps, and the menu has the full library.
   INPUT       The profile. c.x.stg[id]: { fit: { check id: "y" or "n" }, already, dial, head, metro,
               listing, added }. c.x["stg_" + id]: the inputs of one strategy, as { v, cf } (kit.js).
               The open sheet (W.kind): strat (W.id, W.sec), stratlib.
   OUTPUT      Functions: stgPmt, stgRun, stgInputs, stgCalc, stgImpact, stgVerdict, stgScore, stgRank,
               stgSheet, stgLibSheet, stgBook. Actions (ACT): strat, stratlib, stgsec, stgfit, stgalready,
               stgdial, stghead, stgmetro, stglisting, stgtyped, stgadd. Parts of functions in other files:
               planTabStrat (planTab in planner.js), hrsSheetStrat (hrsSheet in ui.js). Menu: "Moves
               library".
   DEPENDS ON  core/report.js, core/engine.js (goalSim, derive, fiNeed, timeLedger, freeToSpend,
               hiDebt), screens/ui.js, screens/planner.js (plX), features/kit.js, data/metros.js,
               data/strategies.js.
   RULES       This file has the loop and the math helpers. A strategy is data: its checks, inputs,
               formula, dial, break-even line and verdict rules are in data/strategies.js. The impact
               is a Guess until each input is Close or Exact. A strategy that is not a fit stays in
               the library, faded, with the reason. No red. The existing sheet "What if" keeps the
               action name "moves", so this feature uses "strat".
   ========================================================================= */
const STG_LEVER = { housing: "Housing", income: "Income", interest: "Interest", taxes: "Taxes", spending: "Spending" };
/* The kinds of roadblock of a soft check. "mask" is the oxygen mask: costly debt comes first. */
const STG_BLOCK = {
  mask: ["Oxygen mask first", "Debt at 8% or more comes before this move."],
  money: ["Money", "The cash for it is not there yet."],
  credit: ["Credit", "Your credit score is not there yet."],
  rules: ["Rules", "A rule of a lender, a landlord or a job is in the way."],
  time: ["Time", "It needs hours you do not have now."],
  energy: ["Energy", "It needs more than you have to give now."],
  skill: ["Skill", "It needs a skill to build first."],
  knowledge: ["Knowledge", "One thing to find out first."],
  people: ["People", "Someone else has to say yes first."],
  fear: ["Fear", "Something about it scares you."],
};
const STG_VERDICT = { fits: "Fits you", notyet: "Not yet", no: "Not for you", already: "Already doing it" };
const STG_FITW = { fits: 1, notyet: 0.5, no: 0, already: 0 };
const STG_DIAL = [
  ["same", "Same as now", 0],
  ["25", "25%", 0.25],
  ["50", "50%", 0.5],
  ["75", "75%", 0.75],
  ["100", "100%", 1],
  ["pays", "It pays me", 1.1],
];
const STG_SEC = ["Fit check", "Rough impact", "Sharpen", "Scenario dial", "Break-even", "Verdict"];
const SGX = { memo: {}, n: 0 };
/* ---------- math helpers ---------- */
/* The level payment of a loan: P at the monthly rate r for n months. */
function stgPmt(P, r, n) {
  return Math.abs(r) < 1e-12 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n));
}
/* Pay a balance for some months: interest is added each month, then the payment comes off.
   Returns the interest paid, what is left, and the months used. */
function stgRun(bal, aprPct, pay, months) {
  let left = bal,
    interest = 0,
    m = 0;
  while (m < months && left > 0.005) {
    m++;
    const i = (left * aprPct) / 1200;
    interest += i;
    left += i;
    left -= Math.min(left, pay);
  }
  return { interest, left, months: m };
}
function stgM(v) {
  return money(Math.round(v));
}
/* "1 year 3 months", "5 months", "12 days". */
function stgYm(mo) {
  const a = Math.abs(mo);
  if (a < 1) {
    const dd = Math.round(a * 30.44);
    return dd + (dd === 1 ? " day" : " days");
  }
  const y = Math.floor((a + 0.5) / 12),
    m = Math.round(a - y * 12);
  return (
    (y ? y + (y === 1 ? " year" : " years") : "") +
    (y && m ? " " : "") +
    (m || !y ? m + (m === 1 ? " month" : " months") : "")
  );
}
/* ---------- the profile, as the strategies read it ---------- */
function stgHome(c) {
  const r = c.led ? (c.spends || []).find(x => x.k === "Home") : null;
  return r ? r.amt || 0 : Math.round((c.spend || 0) * 0.4);
}
/* The card balances at 8% or more: the total and the rate (by balance). */
function stgCards(c, all) {
  if (!c.led)
    return c.high === "yes" && c.debt > 0
      ? { bal: c.debt, apr: 22, pay: Math.round(c.debt * 0.03), n: 1 }
      : { bal: 0, apr: 0, pay: 0, n: 0 };
  const rows = (c.debts || []).filter(
      x => x.amt > 0 && (all ? !/mortgage|student/i.test(x.k) : /card/i.test(x.k)) && debtRate(x).r >= 8
    ),
    bal = rows.reduce((a, x) => a + x.amt, 0);
  return {
    bal,
    apr: bal > 0 ? rows.reduce((a, x) => a + x.amt * debtRate(x).r, 0) / bal : 0,
    pay: rows.reduce((a, x) => a + (x.pay || 0), 0),
    n: rows.length,
  };
}
const STG_SCORE = { "Under 580": 500, "580 to 669": 580, "670 to 739": 670, "740 to 799": 740, "800 or more": 800 };
/* The low end of the credit band of the player, or null when the game does not know it. */
function stgCredit(c) {
  const s = c.caught && c.caught.score;
  return s && STG_SCORE[s] != null ? STG_SCORE[s] : null;
}
function stgMetro(id) {
  return METROS.metros.find(m => m.id === id) || METROS.metros[0];
}
function stgOf(id) {
  return STRATEGIES.find(s => s.id === id) || null;
}
function stgX(c, id) {
  c.x = c.x || {};
  c.x.stg = c.x.stg || {};
  return (c.x.stg[id] = c.x.stg[id] || { fit: {} });
}
/* ---------- one strategy on one profile ---------- */
/* The inputs: the answer of the player, or the default as a Guess. */
function stgInputs(c, S) {
  const X = stgX(c, S.id),
    P = stgMetro(X.metro),
    d = derive(c),
    I = {},
    cf = [];
  (S.inputs || []).forEach(q => {
    const a = kitValue(c, "stg_" + S.id, q.k, q.def(c, P, d));
    I[q.k] = a.v;
    if (!q.opt) cf.push(a);
  });
  I._metro = P;
  I._st = kitState(cf);
  return I;
}
function stgCalc(c, S, I) {
  I = I || stgInputs(c, S);
  const F = S.formula(c, I, derive(c)) || {};
  F.save = F.save || 0;
  F.take = F.take || 0;
  F.equity = F.equity || 0;
  F.once = F.once || 0;
  F.hours = F.hours || 0;
  F.value = F.save + F.take + F.once / 12;
  return F;
}
/* THE IMPACT. How far the FI date and the next goal move.
   save lowers spending. take raises pay. equity (with the full headline) counts as money kept. A
   one-time gain goes to invested money (or, for an interest move, comes off the costly debt), and a
   one-time cost is paid from the next months. */
function stgImpact(c, F, head) {
  const eq = head === "cash" ? 0 : F.equity,
    key = [
      c.name,
      c.take,
      c.spend,
      c.inv,
      c.debt,
      (c.goals || []).length,
      c.age,
      F.save,
      F.take,
      eq,
      F.once,
      F.toDebt ? 1 : 0,
    ]
      .map(v => (typeof v === "number" ? Math.round(v * 100) / 100 : v))
      .join("|");
  if (SGX.memo[key]) return SGX.memo[key];
  const d = derive(c),
    gain = Math.max(0, F.once),
    c2 = Object.assign({}, c, { take: c.take + F.take + eq, inv: c.inv + (F.toDebt ? 0 : gain) }),
    opt = { monthly: -F.save, once: F.once < 0 ? -F.once : 0 },
    out = { fi: null, goal: null, days: 0 };
  /* A gain of an interest move lowers the costly debt, not the invested money. */
  if (F.toDebt && gain > 0) {
    let left = gain;
    c2.debt = Math.max(0, (c.debt || 0) - gain);
    c2.debts = (c.debts || []).map(x => {
      if (!x.high || !(x.amt > 0) || left <= 0) return x;
      const u = Math.min(x.amt, left);
      left -= u;
      return Object.assign({}, x, { amt: x.amt - u });
    });
  }
  try {
    const a = goalSim(c),
      b = goalSim(c2, opt);
    if (a.eraAt[8] != null && b.eraAt[8] != null) out.fi = a.eraAt[8] - b.eraAt[8];
    else {
      const y0 = yearsTo(c.inv, d.save, d.fi),
        y1 = yearsTo(c2.inv, Math.max(0, (c2.take - c.spend + F.save) * 12), fiNeed(c2, c.age, opt));
      if (y0 != null && y1 != null) out.fi = (y0 - y1) * 12;
      else if (y0 == null && y1 != null) out.fiNew = y1;
    }
    const gs = (c.goals || []).filter(
      g => !g.done && a.goalAt[g.id] != null && a.goalAt[g.id] > 0 && b.goalAt[g.id] != null
    );
    gs.sort((p, q) => a.goalAt[p.id] - a.goalAt[q.id]);
    if (gs.length) out.goal = { n: gs[0].n, days: (a.goalAt[gs[0].id] - b.goalAt[gs[0].id]) * 30.44 };
    else
      for (let e = d.era + 1; e <= 8; e++)
        if (a.eraAt[e] != null && a.eraAt[e] > 0 && b.eraAt[e] != null) {
          out.goal = { n: eraN(e), days: (a.eraAt[e] - b.eraAt[e]) * 30.44, era: true };
          break;
        }
  } catch (e) {
    report(e, "strat.js: stgImpact");
  }
  /* the number for the ranking: FI days, else the days of the next goal, else the value as days of saving */
  const M = Math.max(100, c.take - c.spend);
  out.days = out.fi != null ? out.fi * 30.44 : out.goal ? out.goal.days : ((F.value + eq) / M) * 30.44 * 12;
  if (out.fiNew != null) out.days = Math.max(out.days, 365);
  if (++SGX.n > 400) {
    SGX.memo = {};
    SGX.n = 0;
  }
  return (SGX.memo[key] = out);
}
/* The state of each fit check: true, false, or null when the player has to tap it. */
function stgChecks(c, S, I, F) {
  const X = stgX(c, S.id),
    d = derive(c);
  return (S.fitChecks || []).map(k => {
    let ok = null,
      auto = false;
    if (X.fit[k.id]) ok = X.fit[k.id] === "y";
    else if (k.auto) {
      ok = k.auto(c, I, F, d);
      auto = ok != null;
    }
    return { k, ok, auto };
  });
}
/* The dial row that the player picked. With no pick: the highest row that is within reach. */
function stgPick(c, S, I, F) {
  const rows = S.dial ? S.dial(c, I, F) : [],
    X = stgX(c, S.id);
  let pick = rows.find(r => r.k === X.dial) || null;
  if (!pick) pick = rows.filter(r => r.ok && r.k !== "same").pop() || null;
  return { rows, pick, chosen: !!rows.find(r => r.k === X.dial) };
}
/* THE VERDICT: Fits you, Not yet (with the one biggest roadblock), Not for you (with the reason), or
   Already doing it. */
function stgVerdict(c, S, I, F) {
  I = I || stgInputs(c, S);
  F = F || stgCalc(c, S, I);
  const X = stgX(c, S.id),
    R = stgChecks(c, S, I, F),
    pending = R.filter(r => r.ok == null).length,
    out = { v: "fits", why: "", block: null, pending, masked: false };
  if (X.already || (S.already && S.already(c, I, F)))
    return Object.assign(out, { v: "already", why: S.alreadyWhy || "You said you already do this." });
  const hard = R.find(r => r.k.hard && r.ok === false);
  if (hard) return Object.assign(out, { v: "no", why: hard.k.no });
  const P = stgPick(c, S, I, F),
    rule = S.verdictRules ? S.verdictRules(c, I, F, P) : null;
  if (rule) return Object.assign(out, { v: "no", why: rule });
  const soft = R.filter(r => !r.k.hard && r.ok === false);
  if (soft.length) {
    const first = soft.find(r => r.k.block === "mask") || soft[0];
    return Object.assign(out, {
      v: "notyet",
      why: first.k.no,
      block: first.k.block,
      masked: first.k.block === "mask",
      more: soft.length - 1,
    });
  }
  return out;
}
/* THE SCORE: days closer x fit / effort. */
function stgScore(c, S) {
  const I = stgInputs(c, S),
    F = stgCalc(c, S, I),
    X = stgX(c, S.id),
    V = stgVerdict(c, S, I, F),
    imp = stgImpact(c, F, X.head || "full"),
    days = Math.max(0, imp.days);
  return { S, I, F, V, imp, days, score: (days * STG_FITW[V.v]) / Math.max(1, S.effort || 3) };
}
/* All strategies, the best first. A strategy that the oxygen mask blocks ranks below the others, and
   so below each oxygen-mask step. Not for you and Already doing it come last. */
function stgRank(c) {
  const tier = r => (r.V.v === "no" ? 3 : r.V.v === "already" ? 2 : r.V.masked ? 1 : 0);
  return STRATEGIES.map(S => stgScore(c, S)).sort((a, b) => tier(a) - tier(b) || b.score - a.score || b.days - a.days);
}
function stgImpactWords(imp) {
  const fi =
      imp.fi == null
        ? imp.fiNew != null
          ? "FI comes onto the calendar"
          : "no FI date yet"
        : Math.abs(imp.fi) < 1 / 30.44
          ? "FI date: no change"
          : "FI date " + stgYm(imp.fi) + (imp.fi > 0 ? " closer" : " later"),
    g = imp.goal,
    gd = g ? Math.round(Math.abs(g.days)) : 0;
  return {
    fi,
    goal: g
      ? gd < 1
        ? g.n + ": no change"
        : g.n + " " + gd.toLocaleString() + (gd === 1 ? " day " : " days ") + (g.days > 0 ? "closer" : "later")
      : "",
  };
}
/* ---------- the screens ---------- */
function stgRow(r, hot, faded) {
  const w = stgImpactWords(r.imp),
    v = r.V.v;
  return `<button class="rowbtn stgrow ${hot ? "pulse" : ""}" style="${faded ? "opacity:.55" : ""}" data-a="strat" data-v="${r.S.id}"><span style="min-width:0"><b>${esc(r.S.name)}</b>${r.S.risky ? ` <span class="pill">Risk</span>` : ""}<div class="tiny muted">${v === "no" || v === "already" ? esc(STG_VERDICT[v] + ": " + r.V.why) : esc(w.fi) + (v === "notyet" ? " · Not yet: " + esc(STG_BLOCK[r.V.block][0].toLowerCase()) : "")}</div></span><span class="pill ${v === "fits" ? "okp" : ""}">${v === "fits" && r.V.pending ? "Check the fit" : STG_VERDICT[v]}</span></button>`;
}
/* Part of planTab() in planner.js. The section "Moves to try": the top 3, the first one pulses. */
function planTabStrat(h) {
  try {
    const c = C();
    if (G.demo || !c || !c.placed || h.indexOf("<!--moveshere-->") < 0) return h.replace("<!--moveshere-->", "");
    const top = stgRank(c)
      .filter(r => r.V.v === "fits" || r.V.v === "notyet")
      .slice(0, 3);
    return h.replace(
      "<!--moveshere-->",
      () =>
        `<div class="card stack stgcard" style="gap:8px"><div class="row between"><h3>Moves to try</h3>${ib("term:stg_move")}</div><div class="tiny muted">Bigger moves, ranked by how many days each one brings your goals closer. Each number is a Guess until you sharpen it.</div>${top.length ? top.map((r, i) => stgRow(r, i === 0, false)).join("") : `<div class="small muted">No move fits right now. The library says why for each one.</div>`}<button class="ghost wide slim" data-a="stratlib">See all moves</button></div>`
    );
  } catch (e) {
    report(e, "strat.js: planTabStrat");
    return h.replace("<!--moveshere-->", "");
  }
}
function stgLibSheet() {
  const c = C(),
    R = stgRank(c),
    lever = W.lever || "";
  return (
    head("Menu", "Moves library") +
    `<div class="small muted">Every move in the game, the best fit first. A move that does not fit stays here, faded, with the reason.</div>` +
    `<div class="chips"><button class="chip ${lever ? "" : "on"}" data-a="stratlib" data-v="">All</button>${Object.keys(
      STG_LEVER
    )
      .map(
        k => `<button class="chip ${lever === k ? "on" : ""}" data-a="stratlib" data-v="${k}">${STG_LEVER[k]}</button>`
      )
      .join("")}</div>` +
    `<div class="stack" style="gap:6px">${R.filter(r => !lever || r.S.lever === lever)
      .map(r => stgRow(r, false, r.V.v === "no" || r.V.v === "already"))
      .join("")}</div>`
  );
}
function stgSecHead(i, open, note) {
  return `<button class="kwhead stgsec" data-a="stgsec" data-v="${i}" aria-expanded="${open}"><span style="flex:1;text-align:left"><b>${i}. ${STG_SEC[i - 1]}</b>${note ? `<span class="tiny muted" style="display:block">${note}</span>` : ""}</span><span class="pill">${open ? "Hide" : "Show"}</span></button>`;
}
function stgAsk(c, S, q, I, typedAct) {
  const P = I._metro,
    h = kitAsk(c, "stg_" + S.id, q.k, q.l, q.opts, q.def(c, P, derive(c)), {
      typed: !!q.typed,
      term: q.term,
      help: q.help,
    });
  return typedAct ? h.replace(/data-a="kittyped"/g, 'data-a="stgtyped"') : h;
}
function stgSheet() {
  const c = C(),
    w = W,
    S = stgOf(w.id);
  if (!S) return head("Moves", "Not found");
  const X = stgX(c, S.id),
    I = stgInputs(c, S),
    F = stgCalc(c, S, I),
    V = stgVerdict(c, S, I, F),
    headK = X.head || "full",
    imp = stgImpact(c, F, headK),
    cash = stgImpact(c, F, "cash"),
    words = stgImpactWords(imp),
    R = stgChecks(c, S, I, F),
    P = stgPick(c, S, I, F),
    sec = w.sec || (V.pending ? 1 : 2),
    gs = I._st === "Guess";
  let b =
    head(STG_LEVER[S.lever] + " move", esc(S.name)) +
    `<div class="small muted">${esc(S.one)}</div>` +
    `<div class="tile row between" style="gap:8px"><span style="min-width:0"><span class="pill ${V.v === "fits" ? "okp" : ""}" data-fid="stg:v">${STG_VERDICT[V.v]}</span>${V.v === "notyet" ? ` <span class="pill">${STG_BLOCK[V.block][0]}</span>` : ""}<div class="small ${gs ? "guess" : ""}" style="margin-top:4px"><b>${esc(words.fi)}</b></div>${words.goal ? `<div class="tiny muted">${esc(words.goal)}</div>` : ""}</span>${kitPill(I._st)}</div>`;
  /* 1. the fit check */
  const firstOpen = R.findIndex(r => r.ok == null);
  b += stgSecHead(1, sec === 1, V.pending ? V.pending + (V.pending === 1 ? " tap left" : " taps left") : "Done");
  if (sec === 1)
    b +=
      `<div class="stack" style="gap:6px">${R.map((r, i) => {
        const ans = X.fit[r.k.id];
        return `<div class="tile stack" style="gap:6px"><div class="row between" style="gap:8px"><span class="small">${esc(r.k.q)}</span><span class="tiny muted" style="flex:none">${r.k.hard ? "Must have" : STG_BLOCK[r.k.block][0]}</span></div>${
          r.auto
            ? `<div class="row between" style="gap:8px"><span class="tiny muted">From your numbers: <b>${r.ok ? "yes" : "not yet"}</b></span><span class="row" style="gap:6px"><button class="chip sm" data-a="stgfit" data-k="${r.k.id}" data-v="y">Yes</button><button class="chip sm" data-a="stgfit" data-k="${r.k.id}" data-v="n">No</button></span></div>`
            : `<div class="chips"><button class="chip ${ans === "y" ? "on" : i === firstOpen ? "likely" : ""}" data-a="stgfit" data-k="${r.k.id}" data-v="y">Yes</button><button class="chip ${ans === "n" ? "on" : ""}" data-a="stgfit" data-k="${r.k.id}" data-v="n">No</button></div>`
        }${r.ok === false ? `<div class="tiny muted">${esc(r.k.no)}</div>` : ""}</div>`;
      }).join("")}</div>` +
      `<button class="chip ${X.already ? "on" : ""}" data-a="stgalready">I already do this</button>`;
  /* 2. the rough impact */
  b += stgSecHead(2, sec === 2, esc(words.fi));
  if (sec === 2)
    b +=
      `<div class="grid2">${kitTile("FI date", imp.fi == null ? "No date yet" : stgYm(imp.fi) + (imp.fi >= 0 ? " closer" : " later"), "work becomes optional", I._st, "stg_fi")}${kitTile(imp.goal ? imp.goal.n : "Next goal", imp.goal ? Math.round(Math.abs(imp.goal.days)).toLocaleString() + " days " + (imp.goal.days >= 0 ? "closer" : "later") : "No goal with a date", imp.goal && imp.goal.era ? "your next era" : "your next goal", I._st)}</div>` +
      (F.equity
        ? `<div class="seg" style="align-self:flex-start"><button class="${headK === "full" ? "on" : ""}" data-a="stghead" data-v="full">With equity</button><button class="${headK === "cash" ? "on" : ""}" data-a="stghead" data-v="cash">Cash only</button></div><div class="tiny muted">Cash only: ${esc(stgImpactWords(cash).fi)}. ${kitInfo("stg_equity")}</div>`
        : "") +
      (F.tiles && F.tiles.length
        ? `<div class="grid2">${F.tiles.map(t => kitTile(t[0], t[1], t[2] || "", I._st, t[3])).join("")}</div>`
        : "") +
      (F.hidden && F.hidden.length
        ? `<div class="tile stack" style="gap:4px"><b class="small">Hidden costs</b>${F.hidden.map(x => `<div class="row between small" style="gap:8px"><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join("")}</div>`
        : "") +
      (F.warn || []).map(x => `<div class="banner small">${esc(x)}</div>`).join("") +
      (F.alt ? `<div class="tile small"><b>The boring alternative.</b> ${esc(F.alt)}</div>` : "") +
      (F.notes || []).map(x => `<div class="tile small">${esc(x)}</div>`).join("") +
      (F.links || []).map(x => `<button class="ghost wide slim" data-a="${x[1]}">${esc(x[0])}</button>`).join("") +
      (gs
        ? `<div class="tiny muted">This comes from your profile and typical values, so it is a Guess. Sharpen it in step 3.</div>`
        : "") +
      mathBox(
        (F.math || []).concat([
          "FI date: the game runs your plan month by month two times, as it is and with this move, and compares the month when your invested money is enough.",
        ])
      );
  /* 3. sharpen */
  b += stgSecHead(
    3,
    sec === 3,
    kitState([{ cf: I._st === "Guess" ? 1 : I._st === "Close" ? 2 : 3 }]) +
      (X.metro ? " · " + esc(stgMetro(X.metro).name) : "")
  );
  if (sec === 3) {
    const ins = (S.inputs || []).filter(q => !q.when || q.when(I)),
      listing = ins.filter(q => q.listing),
      rest = ins.filter(q => !q.listing);
    b +=
      (S.metro
        ? `<details class="math"${X.metro ? "" : " open"}><summary>${X.metro ? "Area: " + esc(stgMetro(X.metro).name) + ". Change it" : "Tap an area"}</summary><div class="inner stack" style="gap:6px"><div class="chips">${METROS.metros.map(m => `<button class="chip sm ${X.metro === m.id ? "on" : ""}" data-a="stgmetro" data-v="${m.id}">${esc(m.name)}</button>`).join("")}</div><div class="tiny muted">${esc(METROS.note)}</div></div></details>`
        : "") +
      (listing.length
        ? `<button class="ghost wide slim" data-a="stglisting">${X.listing ? "Hide the real listing" : "Use a real listing"}</button>` +
          (X.listing
            ? `<div class="tiny muted">Type the numbers of one listing. A typed listing number counts as Close.</div>` +
              listing.map(q => stgAsk(c, S, q, I, true)).join("")
            : "")
        : "") +
      rest.map(q => stgAsk(c, S, q, I, false)).join("");
  }
  /* 4. the dial */
  b += stgSecHead(4, sec === 4, P.pick ? "Set to: " + esc(P.pick.label) : "Not within reach yet");
  if (sec === 4)
    b +=
      `<div class="small muted">${esc(S.dialAsk || "How far do you take it? Each row says what would need to be true.")}</div><div class="stack" style="gap:6px">${P.rows
        .map(
          r =>
            `<button class="rowbtn ${P.pick && P.pick.k === r.k ? "sel" : ""}" style="${r.ok ? "" : "opacity:.6"}" data-a="stgdial" data-v="${r.k}"><span style="min-width:0"><b>${esc(r.label)}</b><div class="tiny muted">${esc(r.need)}</div></span><b class="tiny" style="flex:none">${r.ok ? "Within reach" : "Not yet"}</b></button>`
        )
        .join("")}</div>` + mathBox(S.dialMath || F.math || []);
  /* 5. the break-even line */
  const be = S.breakEven ? S.breakEven(c, I, F) : "";
  b += stgSecHead(5, sec === 5, "");
  if (sec === 5)
    b +=
      `<div class="tile"><b data-fid="stg:be">${esc(be)}</b></div>` +
      mathBox(S.breakMath ? S.breakMath(c, I, F) : F.math || []);
  /* 6. the verdict */
  b += stgSecHead(6, sec === 6, STG_VERDICT[V.v]);
  if (sec === 6) {
    const has = stgAdded(c, S);
    b +=
      `<div class="verdict ${V.v === "fits" ? "green" : "yellow"}"><b>${STG_VERDICT[V.v]}</b>${V.pending && V.v === "fits" ? ` <span class="tiny muted">so far. ${V.pending} fit ${V.pending === 1 ? "tap" : "taps"} left.</span>` : ""}<div class="small" style="margin-top:4px">${
        V.v === "fits"
          ? esc(words.fi) + "." + (words.goal ? " " + esc(words.goal) + "." : "")
          : V.v === "notyet"
            ? `The one roadblock: <b>${STG_BLOCK[V.block][0]}</b>. ${esc(V.why)}${V.more ? ` <span class="tiny muted">(${V.more} more after it)</span>` : ""}`
            : esc(V.why)
      }</div></div>` +
      (S.risks && S.risks.length
        ? `<div class="tile stack small" style="gap:4px"><b>What can go wrong</b>${S.risks.map(x => `<div>${esc(x)}</div>`).join("")}</div>`
        : "") +
      `<div class="tiny muted">Who taught it: ${esc(S.credit)}</div>` +
      (V.v === "no" || V.v === "already"
        ? ""
        : has
          ? `<div class="tile small"><b>On your Next Steps ✓</b> ${S.quests.length} ${S.quests.length === 1 ? "step" : "steps"} from this move.</div><button class="ghost wide" data-a="tab" data-v="plan">Go to Next Steps</button>`
          : `<button class="primary wide go" data-a="stgadd">Add to my steps</button><div class="tiny muted">${S.quests.map(q => q.t).join(". ")}.</div>`);
  }
  return b + `<button class="ghost wide slim" data-a="stratlib">All moves</button>`;
}
/* The steps of a strategy that are in the plan now. */
function stgAdded(c, S) {
  return plX(c).plan.some(
    p => p.a === "strat" && String(p.v).split(":")[0] === S.id && p.st !== "done" && p.st !== "na"
  );
}
/* The landlord and side-work hours of the moves in the plan, for the time ledger. */
function stgHours(c) {
  const X = (c.x && c.x.stg) || {};
  return Object.keys(X).reduce((a, id) => a + ((X[id].added && X[id].hours) || 0), 0);
}
/* Part of hrsSheet() in ui.js. One line with the hours a month of the moves in the plan. */
function hrsSheetStrat(h) {
  try {
    const c = C(),
      n = stgHours(c),
      tl = timeLedger(c, D || derive(c));
    if (!(n > 0)) return h;
    return (
      h +
      `<div class="tile small stghours">The moves on your Next Steps take about <b>${Math.round(n * 10) / 10} hours a month</b>${tl.wage > 0 ? ". At your real hourly wage that is " + stgM(n * tl.wage) + " a month of your time" : ""}.</div>`
    );
  } catch (e) {
    report(e, "strat.js: hrsSheetStrat");
    return h;
  }
}
/* The spreadsheet: one section, with the two main strategies worked out in formulas. */
function stgBook(c) {
  const rows = [];
  STRATEGIES.forEach(S => {
    try {
      const I = stgInputs(c, S),
        F = stgCalc(c, S, I);
      if (S.book) S.book(c, I, F).forEach(r => rows.push(r));
      else
        rows.push({
          id: "stg_" + S.id,
          label: S.name + ": worth a month",
          v: F.value + F.equity,
          note: "Cash saved or earned a month, with a one-time gain spread over 12 months",
        });
    } catch (e) {
      report(e, "strat.js: stgBook");
    }
  });
  return { title: "Moves to try", rows };
}
kitTerms({
  stg_move: [
    "Move",
    "A bigger change to try: one that can move your goals by weeks or years. Each move has a fit check, a rough impact, and a list of steps.",
  ],
  stg_fi: [
    "FI date",
    "The month when your invested money is enough to live on, so work becomes optional. FI is short for financial independence.",
  ],
  stg_equity: [
    "Equity",
    "The part of a home that is yours: its value less what you owe on it. It grows when you pay down the loan and when the home gains value. It is real wealth, but you cannot spend it at the store.",
  ],
  stg_pi: [
    "Principal and interest",
    "The loan payment itself. Principal pays the loan down. Interest is the price of the loan.",
  ],
  stg_mip: [
    "FHA mortgage insurance",
    "A fee on an FHA loan: 1.75% of the loan at the start, added to the loan, and about 0.55% of the loan each year, paid monthly.",
  ],
  stg_reserves: [
    "Reserves",
    "Money set aside each month for an empty unit, repairs, and big items like a roof. Landlords use a percent of the rent for each.",
  ],
  stg_dti: [
    "Debt-to-income",
    "Your monthly debt payments, with the new home, divided by your monthly pay before taxes. Lenders want it under about 45%.",
  ],
  stg_promo: [
    "Promo months",
    "The months at 0% interest on a new card. After them, the card's normal rate starts on what is left.",
  ],
  stg_fee: [
    "Transfer fee",
    "What the new card charges to move a balance: 3% to 5% of the amount, added to the balance.",
  ],
  stg_deferred: [
    "Deferred interest",
    "A store-card offer where all the interest from day one is charged if any balance is left at the end. It is not the same as a true 0% card.",
  ],
  stg_match: [
    "Job match",
    "Money your job adds to your retirement plan when you put in your own. It is part of your pay.",
  ],
  stg_hsa: [
    "HSA",
    "A health savings account. With a high-deductible health plan, money goes in before tax, grows, and comes out tax-free for health costs.",
  ],
  stg_orig: ["Origination fee", "A fee some lenders take out of a new loan at the start, as a percent of the loan."],
});
kitScreen(
  "strat",
  "A move to try",
  "One bigger move, from the fit check to the verdict.",
  "Add it to your steps and it shows on Next Steps."
);
kitScreen(
  "stratlib",
  "Moves library",
  "Every move in the game, the best fit first.",
  "A move that does not fit stays visible, faded, with the reason."
);
kitMenu("Moves library", "stratlib", "Bigger moves to try, ranked for you, each with a fit check", "moves");
Object.assign(ACT, {
  strat: t => {
    const id = String((t && t.dataset && t.dataset.v) || "").split(":")[0];
    if (!stgOf(id)) return ACT.stratlib();
    W = { kind: "strat", id, sec: null, o: {} };
    sheet(stgSheet);
  },
  stratlib: t => {
    W = { kind: "stratlib", lever: (t && t.dataset && t.dataset.v) || "", o: {} };
    sheet(stgLibSheet);
  },
  stgsec: t => {
    if (!W) return;
    const n = +t.dataset.v,
      cur = W.sec || (stgVerdict(C(), stgOf(W.id)).pending ? 1 : 2);
    W.sec = cur === n ? -1 : n;
    W.pad = null;
    drawSheet();
  },
  stgfit: t => {
    const c = C(),
      X = stgX(c, W.id);
    X.fit[t.dataset.k] = X.fit[t.dataset.k] === t.dataset.v ? null : t.dataset.v;
    W.sec = 1;
    if (!stgVerdict(c, stgOf(W.id)).pending) W.sec = 2;
    kitRedraw();
  },
  stgalready: () => {
    const X = stgX(C(), W.id);
    X.already = !X.already;
    kitRedraw();
  },
  stgdial: t => {
    const X = stgX(C(), W.id);
    X.dial = X.dial === t.dataset.v ? null : t.dataset.v;
    kitRedraw();
  },
  stghead: t => {
    stgX(C(), W.id).head = t.dataset.v;
    kitRedraw();
  },
  stgmetro: t => {
    stgX(C(), W.id).metro = t.dataset.v;
    kitRedraw();
  },
  stglisting: () => {
    const X = stgX(C(), W.id);
    X.listing = !X.listing;
    kitRedraw();
  },
  /* A typed number of a real listing counts as Close. A tap on Exact makes it Exact. */
  stgtyped: t => {
    if (!W) return;
    const k = kitKey(t),
      pk = kitPadKey(k.area, k.key),
      v = +((W.o && W.o[pk]) || 0);
    if (!isFinite(v)) return;
    kitStore(C(), k.area)[k.key] = { v, cf: 2 };
    W.pad = null;
    kitRedraw();
  },
  stgadd: () => {
    const c = C(),
      S = stgOf(W.id),
      x = plX(c),
      X = stgX(c, S.id),
      F = stgCalc(c, S);
    S.quests.forEach((q, i) => {
      const v = S.id + ":" + i;
      if (x.plan.some(p => p.a === "strat" && p.v === v && p.st !== "done" && p.st !== "na")) return;
      x.plan.push({
        id: plId(),
        t: q.t,
        s: "From the move: " + S.name,
        a: "strat",
        v,
        mins: q.mins || 15,
        when: addDays(todayISO(), i),
        slot: "Any",
        st: "todo",
        made: todayISO(),
      });
    });
    X.added = todayISO();
    X.hours = F.hours || 0;
    W.sec = 6;
    kitRedraw();
  },
});
