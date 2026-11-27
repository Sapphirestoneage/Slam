/* ============================================================================
   SLAM the Game: features/strat.js
   PURPOSE     The Strategy Engine: "Moves to try". One loop, with the same screen for each strategy
               of data/strategies.js: (1) a fit check by taps, (2) the rough impact from the profile,
               (3) sharpen with an area or a real listing, (4) a scenario dial, (5) the break-even line,
               (6) the verdict and "Add to my steps". The strategies are ranked, the top 3 show on
               Next Steps, and the menu has the full library. The facts about you (STG_FACTS) are
               asked once, one question at a time, the one that sorts the most moves first. The
               library shows what would open the most: each change of one fact and the moves it opens.
   INPUT       The profile. c.x.stg[id]: { fit: { check id: "y" or "n" }, already, dial, head, metro,
               listing, added }. c.x.about: the answers to the facts that have no other home (the score lives
               in c.caught.score, the home in c.home). c.x["stg_" + id]: the inputs of one strategy, as { v, cf } (kit.js).
               The open sheet (W.kind): strat (W.id, W.sec), stratlib.
   OUTPUT      Functions: stgFact, stgFactSet, stgOpenFacts, stgLevers, stgAskCard, stgLeverCard,
               stgAnswers, stgPmt, stgRun, stgInputs, stgCalc, stgImpact, stgVerdict, stgScore, stgRank,
               stgSheet, stgLibSheet, stgBook. Actions (ACT): strat, stratlib, stgsec, stgfit, stgalready,
               stgdial, stghead, stgmetro, stglisting, stgtyped, stgadd, stgfact, stglever. Parts of functions in other files:
               planTabStrat (planTab in planner.js), hrsSheetStrat (hrsSheet in ui.js). Menu: "Moves
               library".
   DEPENDS ON  core/report.js, core/engine.js (goalSim, derive, fiNeed, timeLedger, freeToSpend,
               hiDebt), screens/ui.js, screens/planner.js (plX), features/kit.js, data/metros.js,
               data/strategies.js.
   RULES       This file has the loop and the math helpers. A strategy is data: its checks, inputs,
               formula, dial, break-even line and verdict rules are in data/strategies.js. The impact
               is a Guess until each input is Close or Exact. A fit check with fact: never keeps its own
               answer: it reads the one answer of the fact. A strategy that is not a fit stays in
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
  const s = stgFact(c, "score");
  return s && STG_SCORE[s] != null ? STG_SCORE[s] : null;
}
/* ---------- the facts about you (STG_FACTS in data/strategies.js): one answer for every move ---------- */
/* STGF.sim: a what-if answer for a fact, only while stgLevers works out what a change would open. */
const STGF = { sim: null };
/* The answer to one fact: a what-if, the place the profile keeps it, the answer of this screen, an old
   answer inside one move, or null when the game does not know it. */
function stgFact(c, id) {
  if (STGF.sim && Object.prototype.hasOwnProperty.call(STGF.sim, id)) return STGF.sim[id];
  const F = STG_FACTS[id];
  if (!F) return null;
  let v = F.get ? F.get(c) : c.x && c.x.about ? c.x.about[id] : null;
  if (v != null) return v;
  if (typeof F.legacy === "function") v = F.legacy(c);
  else if (Array.isArray(F.legacy))
    F.legacy.forEach(([m, k]) => {
      const a = c.x && c.x.stg && c.x.stg[m] && c.x.stg[m].fit && c.x.stg[m].fit[k];
      if (v == null && a) v = a === "y" ? "yes" : "no";
    });
  return v == null ? null : v;
}
function stgFactSet(c, id, v) {
  const F = STG_FACTS[id];
  if (!F || F.readOnly) return;
  c.x = c.x || {};
  c.x.about = c.x.about || {};
  if (F.set) F.set(c, v);
  else if (v == null) delete c.x.about[id];
  else c.x.about[id] = v;
}
function stgFactLabel(id, v) {
  const o = (STG_FACTS[id].opts || []).find(x => x[0] === v);
  return o ? o[1] : String(v);
}
/* The moves that ask a fact. */
function stgFactMoves(id) {
  return STRATEGIES.filter(S => (S.fitChecks || []).some(k => k.fact === id));
}
/* THE QUESTIONS LEFT: each fact the game does not know yet that a move still waits on, the one that
   sorts the most moves first. A move that another answer already rules out does not count. */
function stgOpenFacts(c) {
  return Object.keys(STG_FACTS)
    .filter(id => {
      const F = STG_FACTS[id];
      return !F.readOnly && stgFact(c, id) == null;
    })
    .map(id => ({
      id,
      F: STG_FACTS[id],
      moves: stgFactMoves(id).filter(S => {
        const v = stgVerdict(c, S).v;
        return v !== "no" && v !== "already";
      }),
    }))
    .filter(r => r.moves.length)
    .sort((a, b) => b.moves.length - a.moves.length);
}
const STG_RANKV = { no: 0, notyet: 1, fits: 2, already: -1 };
/* THE LEVERS: for each fact, the one change that opens the most moves. A move opens when its verdict
   goes up (Not for you to Not yet, or Not yet to Fits you). For a fact in order (the score), the
   smallest change that opens the most. Returns [{ id, v, to, now, opens: [strategy], path }]. */
function stgLevers(c) {
  const base = {};
  STRATEGIES.forEach(S => (base[S.id] = stgVerdict(c, S).v));
  const out = [];
  Object.keys(STG_FACTS).forEach(id => {
    const F = STG_FACTS[id],
      now = stgFact(c, id),
      moves = stgFactMoves(id);
    if (!moves.length) return;
    let best = null;
    F.opts.forEach(([v]) => {
      if (v === now || v === "unsure") return;
      let opens = [];
      STGF.sim = { [id]: v };
      try {
        opens = moves.filter(S => base[S.id] !== "already" && STG_RANKV[stgVerdict(c, S).v] > STG_RANKV[base[S.id]]);
      } catch (e) {
        report(e, "strat.js: stgLevers");
      } finally {
        STGF.sim = null;
      }
      if (opens.length && (!best || opens.length > best.opens.length)) best = { v, opens };
    });
    if (!best) return;
    out.push({
      id,
      v: best.v,
      to: F.to ? F.to(best.v, stgFactLabel(id, best.v)) : stgFactLabel(id, best.v),
      now: now == null ? null : stgFactLabel(id, now),
      opens: best.opens,
      path: (now === "unsure" && F.pathUnsure) || F.path || null,
    });
  });
  return out.sort((a, b) => b.opens.length - a.opens.length);
}
/* The steps of a lever are on Next Steps. */
function stgLeverAdded(c, id) {
  return plX(c).plan.some(p => p.a === "stratlib" && p.v === "lever:" + id && p.st !== "done" && p.st !== "na");
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
      auto = false,
      fv = null,
      unsure = false;
    if (k.fact) {
      fv = stgFact(c, k.fact);
      unsure = fv === "unsure";
      ok = fv == null ? null : unsure ? false : !!k.test(fv);
    } else if (X.fit[k.id]) ok = X.fit[k.id] === "y";
    else if (k.auto) {
      ok = k.auto(c, I, F, d);
      auto = ok != null;
    }
    /* "I don't know it" is a soft roadblock: one thing to find out first. */
    const block = unsure ? "knowledge" : k.block,
      no = unsure ? STG_FACTS[k.fact].unsure || k.no : k.no;
    return { k, ok, auto, fv, hard: !!k.hard && !unsure, block, no };
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
  const hard = R.find(r => r.hard && r.ok === false);
  if (hard) return Object.assign(out, { v: "no", why: hard.no, fact: hard.k.fact || null });
  const P = stgPick(c, S, I, F),
    rule = S.verdictRules ? S.verdictRules(c, I, F, P) : null;
  if (rule) return Object.assign(out, { v: "no", why: rule });
  const soft = R.filter(r => !r.hard && r.ok === false);
  if (soft.length) {
    const first = soft.find(r => r.block === "mask") || soft[0];
    return Object.assign(out, {
      v: "notyet",
      why: first.no,
      block: first.block,
      fact: first.k.fact || null,
      masked: first.block === "mask",
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
/* ONE QUESTION FIRST: the open fact that sorts the most moves, with its answers as taps. */
function stgAskCard(c) {
  const open = stgOpenFacts(c);
  if (!open.length) return "";
  const r = open[0],
    n = r.moves.length;
  return `<div class="tile stack stgask" style="gap:8px"><div class="row between" style="gap:8px"><b class="small">One question first</b><span class="tiny muted">${open.length} ${open.length === 1 ? "question" : "questions"} left</span></div><div class="small">${esc(r.F.q)}</div><div class="chips">${r.F.opts.map(([v, l]) => `<button class="chip" data-a="stgfact" data-k="${r.id}" data-v="${esc(v)}">${esc(l)}</button>`).join("")}</div><div class="tiny muted">One answer sorts ${n} ${n === 1 ? "move" : "moves"}: ${esc(r.moves.map(S => S.name).join(", "))}.${r.F.help ? " " + esc(r.F.help) : ""}</div></div>`;
}
/* The answers so far, each one can change. */
function stgAnswers(c) {
  const ids = Object.keys(STG_FACTS).filter(
    id => !STG_FACTS[id].readOnly && stgFact(c, id) != null && stgFactMoves(id).length
  );
  if (!ids.length) return "";
  return `<details class="math stganswers"><summary>Your answers (${ids.length}). Change one</summary><div class="inner stack" style="gap:8px">${ids
    .map(id => {
      const F = STG_FACTS[id],
        v = stgFact(c, id);
      return F.profile
        ? `<div class="small">${esc(F.short)}: <b>${esc(stgFactLabel(id, v))}</b> <span class="tiny muted">from your setup</span></div>`
        : `<div class="stack" style="gap:4px"><span class="small">${esc(F.q)}</span><div class="chips">${F.opts.map(([o, l]) => `<button class="chip sm ${o === v ? "on" : ""}" data-a="stgfact" data-k="${id}" data-v="${esc(o)}">${esc(l)}</button>`).join("")}</div></div>`;
    })
    .join("")}</div></details>`;
}
/* WHAT WOULD OPEN THE MOST: each lever, with the moves it opens and the steps to get there. */
function stgLeverCard(c, max) {
  const L = stgLevers(c).slice(0, max || 4);
  if (!L.length) return "";
  return `<div class="card stack stglevers" style="gap:8px"><div class="row between"><h3>What would open the most</h3>${ib("term:stg_lever")}</div><div class="tiny muted">These moves wait on one thing. Change that one thing and they open.</div>${L.map(
    l =>
      `<div class="tile stack" style="gap:6px"><div class="row between" style="gap:8px"><b class="small">${esc(l.to)}</b><span class="pill">Opens ${l.opens.length}</span></div><div class="tiny muted">${l.now ? "Now: " + esc(l.now) + ". " : ""}Opens: ${esc(l.opens.map(S => S.name).join(", "))}.</div>${
        l.path
          ? `<details class="math"><summary>How to get there</summary><div class="inner stack" style="gap:4px">${l.path.map((q, i) => `<div class="small">${i + 1}. ${esc(q.t)}</div>`).join("")}</div></details>` +
            (stgLeverAdded(c, l.id)
              ? `<div class="tiny muted"><b>On your Next Steps ✓</b></div>`
              : `<button class="ghost wide slim" data-a="stglever" data-k="${l.id}">Add these steps to Next Steps</button>`)
          : ""
      }</div>`
  ).join("")}</div>`;
}
/* Part of planTab() in planner.js. The section "Moves to try": the top 3, the first one pulses. */
function planTabStrat(h) {
  try {
    const c = C();
    if (G.demo || !c || !c.placed || h.indexOf("<!--moveshere-->") < 0) return h.replace("<!--moveshere-->", "");
    /* cbreveal.js: the top moves of What it could be have their own cards on Next Steps; this card shows the next ones */
    const mine = typeof cbTopIds === "function" ? cbTopIds(c) : [],
      top = stgRank(c)
        .filter(r => (r.V.v === "fits" || r.V.v === "notyet") && !mine.includes(r.S.id))
        .slice(0, 3);
    return h.replace(
      "<!--moveshere-->",
      () =>
        `<div class="card stack stgcard" style="gap:8px"><div class="row between"><h3>Moves to try</h3>${ib("term:stg_move")}</div><div class="tiny muted">Bigger moves, ranked by how many days each one brings your goals closer. Each number is a Guess until you sharpen it.</div>${stgAskCard(c)}${top.length ? top.map((r, i) => stgRow(r, i === 0, false)).join("") : `<div class="small muted">No move fits right now. The library says why for each one.</div>`}<button class="ghost wide slim" data-a="stratlib">See all moves</button></div>`
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
    stgAskCard(c) +
    stgLeverCard(c) +
    stgAnswers(c) +
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
  /* Krug self-test (run Results-first Home, item 5): a move that fits can go on your steps from the top, in one tap.
     The fit check below stays; its taps are optional for this button. */
  if (V.v === "fits" && sec !== 6 && !stgAdded(c, S))
    b +=
      `<button class="primary wide go" data-a="stgadd">Add to my steps</button>` +
      (V.pending
        ? `<div class="tiny muted">Optional: ${V.pending} fit ${V.pending === 1 ? "tap" : "taps"} below make the date surer.</div>`
        : "");
  /* 1. the fit check */
  const firstOpen = R.findIndex(r => r.ok == null);
  b += stgSecHead(1, sec === 1, V.pending ? V.pending + (V.pending === 1 ? " tap left" : " taps left") : "Done");
  if (sec === 1)
    b +=
      `<div class="stack" style="gap:6px">${R.map((r, i) => {
        const ans = X.fit[r.k.id],
          Fx = r.k.fact ? STG_FACTS[r.k.fact] : null;
        return `<div class="tile stack" style="gap:6px"><div class="row between" style="gap:8px"><span class="small">${esc(r.k.q)}</span><span class="tiny muted" style="flex:none">${r.hard ? "Must have" : STG_BLOCK[r.block][0]}</span></div>${
          Fx
            ? Fx.readOnly
              ? `<span class="tiny muted">From your numbers: <b>${r.ok ? "yes" : "not yet"}</b></span>`
              : Fx.profile && r.fv != null
                ? `<span class="tiny muted">From your setup: <b>${esc(stgFactLabel(r.k.fact, r.fv))}</b></span>`
                : `<div class="chips">${Fx.opts.map(([v, l]) => `<button class="chip sm ${r.fv === v ? "on" : ""}" data-a="stgfact" data-k="${r.k.fact}" data-v="${esc(v)}">${esc(l)}</button>`).join("")}</div><span class="tiny muted">One answer for every move that asks this.</span>`
            : r.auto
              ? `<div class="row between" style="gap:8px"><span class="tiny muted">From your numbers: <b>${r.ok ? "yes" : "not yet"}</b></span><span class="row" style="gap:6px"><button class="chip sm" data-a="stgfit" data-k="${r.k.id}" data-v="y">Yes</button><button class="chip sm" data-a="stgfit" data-k="${r.k.id}" data-v="n">No</button></span></div>`
              : `<div class="chips"><button class="chip ${ans === "y" ? "on" : i === firstOpen ? "likely" : ""}" data-a="stgfit" data-k="${r.k.id}" data-v="y">Yes</button><button class="chip ${ans === "n" ? "on" : ""}" data-a="stgfit" data-k="${r.k.id}" data-v="n">No</button></div>`
        }${r.ok === false ? `<div class="tiny muted">${esc(r.no)}</div>` : ""}</div>`;
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
          ? `<div class="tile small"><b>On your Next Steps ✓</b> ${S.quests.length} ${S.quests.length === 1 ? "step" : "steps"} from this move.</div><button class="ghost wide" data-a="tab" data-v="plan">Go to Next Steps</button>` +
            (typeof rcpNextRow === "function"
              ? rcpNextRow()
              : "") /* receipt.js: the next win, so this is no dead end */
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
/* Put the steps of one move on Next Steps: one plan item for each of its quests, a day apart. A step that is already
   there and open is not added twice. The button "Add to my steps" of the full card, and of the top moves of What it
   could be (cbreveal.js). Returns false when there is no such move. */
function stgAddSteps(c, id) {
  const S = stgOf(id);
  if (!S) return false;
  const x = plX(c),
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
  return true;
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
  stg_lever: [
    "What would open the most",
    "Some moves wait on one fact about you: a credit score, a spare room, a debt. The game tries each change of that fact and counts the moves it would open. The biggest change is first.",
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
    const v = (t && t.dataset && t.dataset.v) || "";
    W = { kind: "stratlib", lever: STG_LEVER[v] ? v : "", o: {} };
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
  /* One answer to a fact, for every move that asks it. A tap on the answer it has takes it back. */
  stgfact: t => {
    const c = C(),
      id = t.dataset.k,
      v = t.dataset.v;
    if (!STG_FACTS[id]) return;
    stgFactSet(c, id, stgFact(c, id) === v && !STG_FACTS[id].profile ? null : v);
    if (W && W.kind === "strat") W.sec = stgVerdict(c, stgOf(W.id)).pending ? 1 : 2;
    kitRedraw();
  },
  /* The steps of a lever go to Next Steps. */
  stglever: t => {
    const c = C(),
      id = t.dataset.k,
      l = stgLevers(c).find(x => x.id === id),
      x = plX(c);
    if (!l || !l.path || stgLeverAdded(c, id)) return kitRedraw();
    l.path.forEach((q, i) =>
      x.plan.push({
        id: plId(),
        t: q.t,
        s: "To open: " + l.opens.map(S => S.name).join(", "),
        a: "stratlib",
        v: "lever:" + id,
        mins: q.mins || 15,
        when: addDays(todayISO(), i),
        slot: "Any",
        st: "todo",
        made: todayISO(),
      })
    );
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
    stgAddSteps(C(), W.id);
    W.sec = 6;
    kitRedraw();
  },
});
