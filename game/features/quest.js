/* ============================================================================
   SLAM the Game: features/quest.js
   PURPOSE     Quest mode (run Not built, groups 1 to 5, Part 10a). One screen with nine parts, each
               from the plan's own numbers: (1) Character: health (the cushion), armor (the
               protections) and six stats, each with its math and Guess / Close / Exact. (2) Room and
               weak spots: how much you can take on now, how this plan fails, and the three moves that
               stop it. (3) Hidden costs your life charges you. (4) Where you think you rank, next to
               where you are (SCF 2025, by age). (5) Opponents that test your values, and the ones you
               beat. (6) The judge: a record of the game's calls about you, with the evidence and a
               "Challenge this" tap; the money read's "Is this really it?" writes into it. (7) Ask the
               game a question: tap a question, the answer comes from your plan and the library, with no
               outside AI and no network. (8) Path packs: guided routes through the skills. (9)
               Graduating: your finish line, the win state and your story.
   INPUT       The profile (derive, c.hist, c.debts, c.skills, c.x.vals, c.x.qz.sins), the answers
               c.x.qs (the state of this screen) and c.x.qsk (kit answers, { v, cf }). The open sheet
               (W.kind): qmode, with W.tab.
   OUTPUT      Math of the feature: qgSt, qgNums, qgStats, qgCap, qgFails, qgHidden, qgRank, qgCalls,
               qgJudge, qgAsk, qgSkills, qgPacks, qgGrad, qvBook. Views: qvSheet and one body for each
               part. Parts of functions in other files: rvSheetQuest (rvSheet in reveal.js). Where you rank links to
               You and people like you (features/peers.js); qsRank is peNetWorth of core/peers.js. Named
               parts for later callers (Home is being rebuilt by another run): qgHomeLine. Actions
               (ACT): qmode, qxtab, qxset, qxjudge, qxduel, qxprice. Menu: "Quest mode".
   DEPENDS ON  core/quest.js (the one engine, a copy of js/math/quest.js of the web app, with QS_PRIORS),
               core/trip.js (TP_STAGES), core/enough.js (EN_CPI), core/sins.js (snJudgeLog),
               core/engine.js (derive, hiDebt, isSharp, debtRate, nodeRankRaw, nodeTitle, skillDone,
               goalSim), screens/ui.js (freeAt, money, head, mathBox, sheet), screens/dash.js (dkStatRow,
               dkTile, dkCard, dkProgress, dkPill), features/kit.js, features/trip.js (tpgJourney),
               features/mix.js (mixCalc), features/enough.js (enGameRead), features/jobs.js (jobNow),
               features/rolemap.js (rmRate), features/values.js (vlGet), features/sins.js (sngRead,
               sngSeen, sngGradStory).
   RULES       The math is in core/quest.js. This file reads the numbers from the game's own engines
               and hands them in. Calm words: weak spots and moves, Recalculating, never a verdict.
               The money read shows in the story only when the player turns on "Show my read".
   STORED      c.x.qs = { v: 1, log: [judge entries], felt, plate, rank, finish, showRead, topic,
               ask, pack, price: { oppId: amount }, duels: { oppId: { choice, at, beaten } } }.
   ========================================================================= */
const QG_TABS = [
  ["sheet", "Character"],
  ["room", "Room and weak spots"],
  ["costs", "Hidden costs"],
  ["rank", "Where you rank"],
  ["rivals", "Opponents"],
  ["judge", "The judge"],
  ["ask", "Ask the game"],
  ["packs", "Path packs"],
  ["grad", "Graduating"],
];
const QG_WHY = { less: "less room", more: "more room", old: "a number is old", feel: "it does not feel like me" };
const QG_KEYS = ["take", "spend", "cash", "debt", "inv"];
/* The state of this screen, in the profile. */
function qgSt(c) {
  c.x = c.x || {};
  c.x.qs = c.x.qs || { v: 1 };
  const s = c.x.qs;
  s.log = s.log || [];
  s.duels = s.duels || {};
  s.price = s.price || {};
  return s;
}
/* The plain numbers the engine reads, all from the game's own engines. */
function qgNums(c, d) {
  d = d || derive(c);
  const real = {};
  QG_KEYS.forEach(k => (real[k] = !!(c.led && isSharp(c, k))));
  const next = (d.prot || []).find(n => nodeRankRaw(c, d, n.id) < n.r);
  return {
    take: c.take,
    spend: c.spend,
    cash: d.cash,
    hiDebt: hiDebt(c),
    inv: c.inv || 0,
    nw: d.nw,
    fi: d.fi,
    coast: d.coastNum,
    target: d.target,
    protDone: d.acDone,
    protMax: d.acMax,
    protNext: next ? nodeTitle(next.id) : null,
    sharp: QG_KEYS.filter(k => real[k]).length,
    sharpOf: QG_KEYS.length,
    streak: c.streak || 0,
    real,
    incomes: c.led ? (c.incs || []).filter(x => x.amt > 0).length : null,
    lowGap: d.lowGap,
    cushionMonths: c.spend > 0 ? d.cash / c.spend : null,
  };
}
function qgStats(c) {
  return qsStats(qgNums(c), money);
}
function qgCap(c) {
  const N = qgNums(c),
    s = qgSt(c);
  return qsCapacity(
    { take: N.take, spend: N.spend, cushionMonths: N.cushionMonths, plate: s.plate, felt: s.felt },
    money
  );
}
/* The debts, each with the game's own rate (debtRate: the tapped rate, else its guess). */
function qgDebts(c) {
  const rows = c.led
    ? (c.debts || []).filter(x => x.amt > 0)
    : c.debt > 0
      ? [{ amt: c.debt, high: c.high === "yes" }]
      : [];
  return rows.map(x => {
    const r = debtRate(x);
    return { amt: x.amt, apr: r.r, real: r.real && !!c.led, high: !!x.high || (!c.led && c.high === "yes") };
  });
}
function qgFails(c) {
  const N = qgNums(c),
    hi = qgDebts(c).filter(x => x.high),
    I = qsInterest(hi);
  return qsFails(Object.assign({}, N, { interest: I == null ? null : I / 12 }), money);
}
/* Hidden costs: each piece from its own engine. */
function qgHidden(c) {
  const d = derive(c),
    items = [],
    D = qgDebts(c);
  const I = qsInterest(D);
  if (D.length)
    items.push({
      id: "interest",
      name: "Interest on what you owe",
      year: I,
      st: D.every(x => x.real) ? "Close" : "Guess",
      math: D.map(x => money(x.amt) + " at " + x.apr + "%").join(", ") + " a year",
    });
  try {
    const M = mixCalc(c);
    if (M.total > 0)
      items.push({
        id: "fees",
        name: "Fees on your investments",
        year: M.feeYear,
        st: M.A.every(a => a.st !== "Guess") ? "Close" : "Guess",
        math: money(M.total) + " invested at about " + Math.round(M.avg * 100) / 100 + "% a year in fees",
      });
  } catch (e) {
    report(e, "quest.js: qgHidden");
  }
  const earns = kitValue(c, "qsk", "earns", 0),
    keep = d.target * c.spend,
    drag = qsCashDrag(d.cash, keep, EN_CPI.value, earns.v);
  if (drag != null)
    items.push({
      id: "drag",
      name: "Prices on cash above your cushion",
      year: drag,
      st: earns.given ? "Close" : "Guess",
      math:
        money(Math.max(0, d.cash - keep)) +
        " above a " +
        Math.round(d.target * 10) / 10 +
        "-month cushion, prices up " +
        Math.round(EN_CPI.value * 1000) / 10 +
        "% (" +
        EN_CPI.period +
        "), the cash earning " +
        Math.round(earns.v * 1000) / 10 +
        "%",
    });
  try {
    const R = enGameRead(c).creep;
    if (R.ready && R.mutants.length) {
      const m = R.mutants.reduce((s, x) => s + x.overInflation, 0);
      items.push({
        id: "creep",
        name: "Lifestyle creep past prices",
        year: m * 12,
        st: R.level,
        math: R.mutants.map(x => x.cat + " " + money(x.overInflation) + " a month").join(", "),
      });
    }
  } catch (e) {
    report(e, "quest.js: qgHidden");
  }
  try {
    const A = jobNow(c).admin,
      rt = rmRate(c).rate,
      t = qsTimeCost(A.total, rt);
    items.push({
      id: "time",
      name: "Your hours running your money",
      year: t,
      st: A.st,
      math:
        Math.round((A.total / 60) * 10) / 10 +
        " hours a month" +
        (rt == null ? ", with no value of an hour yet" : " at " + money(rt) + " an hour"),
      needs: rt == null ? "Your pay or the price of an hour of chores (Time ledger)" : null,
    });
  } catch (e) {
    report(e, "quest.js: qgHidden");
  }
  return Object.assign(qsHidden(items, c.spend), { items });
}
function qgRank(c) {
  const d = derive(c);
  return qsRank({ guess: qgSt(c).rank || null, nw: d.nw, age: c.age, rows: QS_PRIORS.rows }, money);
}
/* THE JUDGE. The game's calls about the player, each with its evidence. */
function qgCalls(c) {
  const d = derive(c),
    S = qgStats(c),
    K = qgCap(c),
    out = [];
  if (typeof ERAS !== "undefined" && ERAS[d.era])
    out.push({
      id: "era",
      label: "Your era",
      said: ERAS[d.era].n,
      evidence: [
        "Net worth " + money(d.nw),
        "Cushion " +
          (c.spend > 0 ? Math.round((d.cash / c.spend) * 10) / 10 : 0) +
          " months, of " +
          Math.round(d.target * 10) / 10,
        "Costly debt " + money(hiDebt(c)),
      ],
      change: "The era follows your numbers: bring a number up to date and the call moves with it.",
    });
  if (S.best) {
    const b = S.stats.find(s => s.id === S.best);
    out.push({
      id: "strong",
      label: "Your strongest stat",
      said: b.name,
      evidence: [b.math],
      change: "Stats follow your numbers. A Guess turns Close when you put in your own number.",
    });
  }
  if (K.ready)
    out.push({
      id: "capacity",
      label: "How much you can take on",
      said: K.words,
      evidence: K.why,
      change: "Tell the judge you have less or more room: it moves the call one step.",
    });
  try {
    if (typeof sngRead === "function" && sngSeen(c)) {
      const R = sngRead(c).read,
        f = R.families && R.families[0];
      if (R.ready && f && f.top)
        out.push({
          id: "read",
          label: "Your money read",
          said: f.top.name,
          trait: f.top.id,
          evidence: (f.lines || []).map(l => l.line),
          change: 'Your answer to "Is this really it?" counts as evidence and can move the read.',
        });
    }
  } catch (e) {
    report(e, "quest.js: qgCalls");
  }
  const Rk = qgRank(c);
  if (Rk.ready)
    out.push({
      id: "rank",
      label: "Where you are next to households your age",
      said: Rk.where === "near" ? "About the middle" : Rk.where === "above" ? "Above the middle" : "Below the middle",
      evidence: [Rk.line],
      change: "The call follows your net worth. An old number makes an old call.",
    });
  if (typeof bnQuestCall === "function") {
    const bn = bnQuestCall(c); /* feel.js: the bottleneck call */
    if (bn) out.push(bn);
  }
  return out;
}
/* The record: the taps on this screen, and the push-backs of the money read, in the order they came. */
function qgJudge(c) {
  const s = qgSt(c);
  let push = [];
  try {
    const st = c.x && c.x.qz && c.x.qz.sins;
    if (st && st.sn && typeof snJudgeLog === "function") push = qsFromPush(snJudgeLog(qzSkin("sins"), st.sn));
  } catch (e) {
    report(e, "quest.js: qgJudge");
  }
  const log = s.log.concat(push).sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return qsJudge(qgCalls(c), log);
}
/* The library, flat: every skill with its id, its name and its words. */
function qgSkills() {
  const out = [];
  if (typeof SKILLS === "undefined") return out;
  Object.keys(SKILLS).forEach(t =>
    SKILLS[t].skills.forEach((s, i) => out.push({ id: t + ":" + i, name: s[0], text: [s[1], s[3]].join(" ") }))
  );
  return out;
}
function qgAsk(c, kind) {
  let months = null;
  try {
    months = freeAt(c);
  } catch (e) {
    report(e, "quest.js: qgAsk");
  }
  const d = derive(c);
  return qsAsk(
    kind,
    { age: c.age, freeMonths: months, cash: d.cash, spend: c.spend, take: c.take, moves: qgFails(c).moves },
    money
  );
}
function qgPacks(c) {
  const N = qgNums(c),
    fit = qsPackFit(N),
    done = qgSkills()
      .map(s => s.id)
      .filter(id => skillDone(c, id));
  return { fit, rows: QS_PACKS.map(p => Object.assign({ pack: p }, qsPack(p, done))) };
}
function qgGrad(c) {
  const d = derive(c),
    s = qgSt(c),
    J = tpgJourney(c).J,
    G2 = qsGraduate(J.stages, s.finish || "fi");
  let read = [];
  try {
    read = typeof sngGradStory === "function" ? sngGradStory(c) : [];
  } catch (e) {
    report(e, "quest.js: qgGrad");
  }
  const story = qsStory(
    c.hist || [],
    TP_STAGES,
    { targets: { coast: d.coastNum, fi: d.fi }, read, showRead: !!s.showRead },
    money
  );
  return { J, G: G2, story, showRead: !!s.showRead };
}
/* A named part for a later caller (Home is being rebuilt by another run; it may call this). One line, or "". */
function qgHomeLine(c) {
  const F = qgFails(c);
  return F.ready && F.moves.length ? F.moves[0].t : "";
}
/* The spreadsheet of the plan: the stats' numbers and the hidden costs, each with its formula. */
function qvBook(c) {
  const rows = [],
    d = derive(c);
  if (!(c.spend > 0) || !(c.take > 0)) return { title: "Quest mode", rows };
  rows.push({ id: "qm_take", label: "Comes in a month", v: c.take });
  rows.push({ id: "qm_spend", label: "Goes out a month", v: c.spend });
  rows.push({ id: "qm_cash", label: "Cash", v: d.cash });
  rows.push({ id: "qm_health", label: "Health: months of cushion", v: d.cash / c.spend, f: "={qm_cash}/{qm_spend}" });
  rows.push({
    id: "qm_margin",
    label: "Margin: the share kept",
    v: (c.take - c.spend) / c.take,
    f: "=({qm_take}-{qm_spend})/{qm_take}",
  });
  const H = qgHidden(c);
  H.rows.forEach(r => rows.push({ id: "qm_h_" + r.id, label: "Hidden cost a year: " + r.name, v: r.year, note: r.st }));
  if (H.rows.length)
    rows.push({
      id: "qm_hidden",
      label: "Hidden costs a year, in all",
      v: H.total,
      f: "=" + H.rows.map(r => "{qm_h_" + r.id + "}").join("+"),
    });
  return { title: "Quest mode", rows };
}

/* ---------- the views ---------- */
function qvLevel(st) {
  return st ? dkPill(st, st === "Guess" ? "warn" : "") : "";
}
function qvStatRow(s) {
  return `<div class="stack" style="gap:4px"><div class="row between small" style="gap:8px"><span><b>${esc(s.name)}</b> <span class="tiny muted">${esc(s.what)}</span></span><span class="row" style="gap:6px;flex:none">${qvLevel(s.level)}<b style="white-space:nowrap">${s.shown == null ? "Not yet" : esc(s.shown)}</b></span></div>${s.score == null ? `<div class="tiny muted">${esc(s.math)}</div>` : dkProgress(s.score) + `<div class="tiny muted">Score ${s.score} of 100</div>`}</div>`;
}
function qvSheetBody(c) {
  const S = qgStats(c);
  if (!S.ready) return `<div class="small muted">Put in what comes in and what goes out to see your character.</div>`;
  const H = S.health,
    A = S.armor,
    best = S.stats.find(s => s.id === S.best),
    train = S.stats.find(s => s.id === S.train);
  return (
    dkStatRow([
      dkTile("Health", H.score == null ? "Not yet" : H.score + " of 100", {
        guess: H.level === "Guess",
        sub: H.shown || "",
      }),
      dkTile("Armor", A.score == null ? "Not yet" : A.score + " of 100", { sub: A.shown || "" }),
      best ? dkTile("Strongest", esc(best.name), { sub: best.shown || "" }) : "",
      train ? dkTile("To train", esc(train.name), { sub: train.shown || "" }) : "",
    ]) +
    dkCard("Health and armor", qvStatRow(H) + qvStatRow(A)) +
    dkCard("Six stats", `<div class="stack" style="gap:10px">${S.stats.map(qvStatRow).join("")}</div>`, {
      cap: "Each one is a real number from your plan, scored 0 to 100.",
    }) +
    mathBox([H.math, A.math].concat(S.stats.map(s => s.name + ": " + s.math)))
  );
}
function qvRoomBody(c) {
  const K = qgCap(c),
    F = qgFails(c),
    s = qgSt(c);
  if (!K.ready || !F.ready) return `<div class="small muted">Put in your cash, what comes in and what goes out.</div>`;
  const plate = [
    ["light", "Light"],
    ["normal", "Normal"],
    ["full", "Full"],
  ];
  return (
    dkStatRow([
      dkTile("New steps now", String(K.slots), {
        sub: K.slots ? money(Math.round(K.perStep)) + " a month each" : "Hold for now",
      }),
      dkTile("Free a month", money(Math.round(K.free)), { sub: Math.round(K.share * 100) + "% of what comes in" }),
      dkTile("Weak spots", String(F.spots.length), { sub: F.spots.length ? "closest first" : "none in these numbers" }),
    ]) +
    dkCard(
      "How much you can take on",
      `<div class="small"><b>${esc(K.words)}</b></div><div class="field"><span class="small">How full is your plate right now?</span><div class="chips">${plate.map(p => `<button class="chip ${s.plate === p[0] ? "on" : ""}" data-a="qxset" data-k="plate" data-v="${p[0]}">${p[1]}</button>`).join("")}</div></div>`
    ) +
    dkCard(
      "How this plan fails",
      F.spots.length
        ? `<div class="stack" style="gap:8px">${F.spots.map(p => `<div class="tile stack" style="gap:2px"><b class="small">${esc(p.name)}</b><div class="small">${esc(p.line)}</div></div>`).join("")}</div>`
        : `<div class="small">No weak spot shows in these numbers.</div>`,
      { cap: "Imagine the plan has bent a year from now. These are the likeliest places." }
    ) +
    (F.moves.length
      ? dkCard(
          F.moves.length === 1 ? "The move that stops it" : "The " + F.moves.length + " moves that stop it",
          `<ol class="small" style="margin:0;padding-left:20px">${F.moves.map(m => `<li>${esc(m.t)}</li>`).join("")}</ol>`
        )
      : "") +
    (F.steady.length ? `<div class="tiny muted">Steady: ${esc(F.steady.join(", "))}.</div>` : "") +
    mathBox(K.why.concat(F.spots.map(p => p.name + ": " + p.line)).concat([QS_SOURCES.premortem]))
  );
}
function qvCostsBody(c) {
  const H = qgHidden(c);
  const earn = kitAsk(
    c,
    "qsk",
    "earns",
    "What your cash earns a year",
    [
      [0, "Nothing"],
      [0.01, "1%"],
      [0.02, "2%"],
      [0.03, "3%"],
      [0.04, "4%"],
    ],
    0,
    { help: "Your bank app shows the rate. Prices rise; cash that earns less loses ground." }
  );
  const guess = H.rows.some(r => r.st === "Guess");
  return (
    dkStatRow([
      dkTile("A year", H.total == null ? "None found" : money(Math.round(H.total)), { guess }),
      dkTile("A month", H.total == null ? "None found" : money(Math.round(H.total / 12)), { guess }),
      dkTile("Days of your life", H.days == null ? "Not yet" : String(Math.round(H.days)), {
        guess,
        sub: "of your spending, each year",
      }),
    ]) +
    dkCard(
      "What your life charges you",
      H.rows.length
        ? `<div class="stack" style="gap:8px">${H.rows.map(r => `<div class="tile stack" style="gap:2px"><div class="row between small" style="gap:8px"><b>${esc(r.name)}</b><span class="row" style="gap:6px">${qvLevel(r.st)}<b>${money(Math.round(r.year))}</b></span></div><div class="tiny muted">${esc(r.math)}${r.days != null ? ". About " + Math.round(r.days) + " days of your spending" : ""}</div></div>`).join("")}</div>`
        : `<div class="small">Nothing shows yet. Each one appears when its number is in.</div>`,
      { cap: "Costs that do not show up as a bill. A year of each." }
    ) +
    (H.open.length
      ? `<div class="tiny muted">Not counted yet: ${esc(H.open.map(r => r.name + (r.needs ? " (needs " + r.needs.toLowerCase() + ")" : "")).join("; "))}.</div>`
      : "") +
    earn +
    mathBox(H.rows.map(r => r.name + ": " + r.math).concat(["Days: a year of the cost / your spending a day"]))
  );
}
function qvRankBody(c) {
  const s = qgSt(c),
    R = qgRank(c);
  const chips = `<div class="field"><span class="small">First, a guess: where do you think your net worth ranks among households your age?</span><div class="chips">${QS_RANK_GUESS.map(g => `<button class="chip ${s.rank === g[0] ? "on" : ""}" data-a="qxset" data-k="rank" data-v="${g[0]}">${g[1]}</button>`).join("")}</div></div>`;
  if (!s.rank) return chips + `<div class="small muted">Tap your guess. The numbers show after it.</div>`;
  if (!R.ready) return chips + `<div class="small muted">Put in your age and your numbers to see where you are.</div>`;
  const real = qgNums(c).real,
    g = !(real.cash && real.inv && real.debt),
    Q = ["Under the 25th", "25th to the middle", "Middle to the 75th", "Over the 75th"];
  return (
    chips +
    dkStatRow([
      dkTile("Your guess", esc(QS_RANK_GUESS.find(x => x[0] === s.rank)[1])),
      dkTile(
        "Where you are",
        R.where === "near" ? "About the middle" : R.where === "above" ? "Above the middle" : "Below the middle",
        { guess: g }
      ),
      dkTile("The middle at your age", money(R.median), { sub: R.band.who }),
    ]) +
    dkCard(
      R.match ? "Your guess matches" : "Your guess and the numbers",
      `<div class="small">${esc(R.line)}</div><div class="small">${esc(R.vs)}</div>${
        R.quarter
          ? `<div class="grid2" style="margin-top:8px">${Q.map((q, i) => `<div class="tile tiny ${R.quarter === i + 1 ? "on" : "muted"}">${R.quarter === i + 1 ? "<b>You: </b>" : ""}${q} of all households</div>`).join("")}</div>`
          : ""
      }`,
      { cap: "A rank is not a verdict: it shows where you start from." }
    ) +
    mathBox(R.math.concat([QS_SOURCES.rank])) +
    `<button class="ghost wide slim" data-a="peers">You and people like you: savings rate, pay and more</button>`
  );
}
function qvRivalsBody(c) {
  const s = qgSt(c),
    V = typeof vlGet === "function" ? vlGet(c).top : [],
    beat = QS_OPPONENTS.filter(o => s.duels[o.id] && s.duels[o.id].beaten);
  if (!V.length)
    return `<div class="small">Each opponent tests what matters most to you. Pick those first.</div><button class="primary wide" data-a="values">Pick the three things that matter most</button>`;
  const cards = QS_OPPONENTS.map(o => {
    const price = s.price[o.id],
      cost = price == null ? null : qsCost(price, c.spend, c.take - c.spend),
      R = s.duels[o.id];
    let fi = null;
    if (price != null)
      try {
        const a = freeAt(c),
          b = freeAt(c, { once: price });
        fi = a == null || b == null ? null : kitDays(b - a);
      } catch (e) {
        report(e, "quest.js: qvRivalsBody");
      }
    const D = R ? qsDuel(o, R.choice, V) : null;
    return dkCard(
      o.name,
      `<div class="small">${esc(o.tempt)}</div><div class="tiny muted">It pulls on ${esc(o.pull)} and tests ${esc(o.test)}.</div><div class="field"><span class="small">What would it cost you?</span><div class="chips">${o.prices.map(p => `<button class="chip ${price === p ? "on" : ""}" data-a="qxprice" data-k="${o.id}" data-v="${p}">${money(p)}</button>`).join("")}</div></div>${
        cost
          ? `<div class="small">${cost.days == null ? "" : "About " + Math.round(cost.days) + " days of your spending"}${cost.months == null ? "" : ", " + Math.round(cost.months * 10) / 10 + " months of what you keep"}${fi == null ? "" : ". Freedom date: " + esc(kitDayWords(fi).toLowerCase())}.</div><div class="chips">${QS_CHOICES.map(x => `<button class="chip ${R && R.choice === x[0] ? "on" : ""}" data-a="qxduel" data-k="${o.id}" data-v="${x[0]}">${x[1]}</button>`).join("")}</div>`
          : ""
      }${D ? `<div class="small"><b>${D.beaten ? "Beaten." : "Round over."}</b> ${esc(D.line)}</div>` : ""}`,
      { right: R && R.beaten ? dkPill("Beaten", "okp") : "" }
    );
  }).join("");
  return (
    dkStatRow([
      dkTile("Beaten", beat.length + " of " + QS_OPPONENTS.length),
      dkTile("Your values", esc(V.join(", "))),
    ]) +
    (beat.length
      ? `<div class="chips">${beat.map(o => `<span class="pill okp">${esc(o.name)}</span>`).join("")}</div>`
      : "") +
    cards +
    mathBox([
      "Days: the price / your spending a day (" + money(Math.round((c.spend * 12) / 365)) + ").",
      "Months: the price / what you keep a month (" + money(Math.round(c.take - c.spend)) + ").",
      "Freedom date: the game's plan run again with the price paid today.",
      "Beaten: your choice fits the values you picked. When both sides are yours, any choice is a real one.",
    ])
  );
}
function qvJudgeBody(c) {
  const J = qgJudge(c);
  if (!J.length) return `<div class="small muted">The judge has no call yet. Put in your numbers first.</div>`;
  const W2 = W || {};
  return (
    `<div class="small muted">Every call the game makes about you, with its evidence. Tap "This fits" or "Challenge this". Each tap is kept, so you can come back to it.</div>` +
    J.map(j => {
      const open = W2.jopen === j.id,
        btns =
          j.id === "read"
            ? `<button class="ghost slim" data-a="snpush" data-k="${esc(j.trait)}" data-v="yes">This fits</button><button class="ghost slim" data-a="snpush" data-k="${esc(j.trait)}" data-v="no">Challenge this</button>`
            : `<button class="ghost slim" data-a="qxjudge" data-k="${j.id}" data-v="fits">This fits</button><button class="ghost slim" data-a="qxjudge" data-k="${j.id}" data-v="not">Challenge this</button>`,
        why =
          j.id === "capacity" && open
            ? `<div class="chips"><button class="chip" data-a="qxjudge" data-k="capacity" data-v="not" data-w="less">I have less room</button><button class="chip" data-a="qxjudge" data-k="capacity" data-v="not" data-w="more">I have more room</button></div>`
            : open
              ? `<div class="chips"><button class="chip" data-a="qxjudge" data-k="${j.id}" data-v="not" data-w="old">A number is old</button><button class="chip" data-a="qxjudge" data-k="${j.id}" data-v="not" data-w="feel">It does not feel like me</button></div>`
              : "";
      return dkCard(
        j.label,
        `<div class="small"><b>${esc(j.said)}</b>${j.changed ? ` <span class="tiny muted">(it said ${esc(j.first)} on ${esc(qsMonth(j.since) || "")})</span>` : ""}</div><details><summary class="tiny">The evidence</summary><div class="stack" style="gap:2px;margin-top:4px">${j.evidence.map(e => `<div class="tiny">${esc(e)}</div>`).join("")}</div></details><div class="tiny muted">${esc(j.change)}</div><div class="row wrap" style="gap:8px">${btns}</div>${why}${
          j.entries.length
            ? `<details><summary class="tiny">The record (${j.entries.length})</summary><div class="stack" style="gap:2px;margin-top:4px">${j.entries
                .slice(-6)
                .reverse()
                .map(
                  e =>
                    `<div class="tiny">${esc(String(e.at).slice(0, 10))}: ${e.tap === "fits" ? "You said it fits" : "You challenged it"}${e.why ? " (" + esc(QG_WHY[e.why] || e.why) + ")" : ""}. The call was ${esc(e.said)}.</div>`
                )
                .join("")}</div></details>`
            : ""
        }`,
        { right: j.challenged ? dkPill("Challenged", "warn") : j.entries.length ? dkPill("On record") : "" }
      );
    }).join("")
  );
}
function qvAskBody(c) {
  const s = qgSt(c),
    k = s.ask || null;
  let ans = "";
  if (k === "learn") {
    const T = s.topic,
      L = T ? qsLearn(T, qgSkills()) : [];
    ans =
      `<div class="chips">${QS_TOPICS.map(t => `<button class="chip ${T === t[0] ? "on" : ""}" data-a="qxset" data-k="topic" data-v="${t[0]}">${t[1]}</button>`).join("")}</div>` +
      (T
        ? L.length
          ? L.map(
              x =>
                `<button class="rowbtn" data-a="skill" data-v="${esc(x.id)}"><span><b class="small">${esc(x.name)}</b><div class="tiny muted">${esc(x.text)}</div></span><span class="caret">›</span></button>`
            ).join("")
          : `<div class="small muted">Nothing in the library on this yet.</div>`
        : "");
  } else if (k) {
    const A = qgAsk(c, k);
    ans = A
      ? dkCard(
          A.q,
          A.lines.map((l, i) => `<div class="small">${i ? "" : "<b>"}${esc(l)}${i ? "" : "</b>"}</div>`).join("")
        )
      : "";
  }
  return (
    `<div class="small muted">Tap a question. The answer comes from your own plan and the game's library. Nothing leaves this device.</div>` +
    `<div class="stack" style="gap:6px">${QS_ASK.map(a => `<button class="rowbtn ${k === a[0] ? "on" : ""}" data-a="qxset" data-k="ask" data-v="${a[0]}"><span class="small">${esc(a[1])}</span><span class="caret">›</span></button>`).join("")}</div>` +
    ans
  );
}
function qvPacksBody(c) {
  const P = qgPacks(c),
    s = qgSt(c),
    open = s.pack || P.fit;
  return (
    `<div class="small muted">A pack is a short route through the skills, in an order that works.</div>` +
    P.rows
      .map(r => {
        const on = r.id === open;
        return dkCard(
          r.pack.name,
          `<div class="small">${esc(r.pack.why)}</div>${dkProgress(r.pct, { text: r.done + " of " + r.total + " steps" })}${
            on
              ? `<div class="stack" style="gap:6px">${r.pack.steps
                  .map(id => {
                    const p = id.split(":"),
                      sk = SKILLS[p[0]] && SKILLS[p[0]].skills[+p[1]];
                    return sk
                      ? `<button class="rowbtn" data-a="skill" data-v="${esc(id)}"><span class="small">${skillDone(c, id) ? "Done: " : id === r.next ? "Next: " : ""}${esc(sk[0])}</span><span class="caret">›</span></button>`
                      : "";
                  })
                  .join("")}</div>`
              : `<button class="ghost slim" data-a="qxset" data-k="pack" data-v="${r.id}">Show the steps</button>`
          }`,
          { right: r.id === P.fit ? dkPill("Fits now", "okp") : r.finished ? dkPill("Done", "okp") : "" }
        );
      })
      .join("")
  );
}
function qvGradBody(c) {
  const R = qgGrad(c),
    s = qgSt(c),
    G2 = R.G,
    names = QS_FINISH.map(id => [id, (TP_STAGES.find(t => t.id === id) || {}).name || id]);
  const finish = `<div class="field"><span class="small">Your finish line</span><div class="chips">${names.map(n => `<button class="chip ${G2.finish === n[0] ? "on" : ""}" data-a="qxset" data-k="finish" data-v="${n[0]}">${esc(n[1])}</button>`).join("")}</div></div>`;
  const story = R.story.chapters.length
    ? `<div class="stack" style="gap:6px">${R.story.chapters.map(ch => `<div class="small">${esc(ch.t)}</div>`).join("")}${R.story.read.map(l => `<div class="small">${esc(l)}</div>`).join("")}</div>`
    : `<div class="small muted">Your story starts with your first saved numbers.</div>`;
  const readBtn = `<div class="field"><span class="small">Your money read in the story</span><div class="chips"><button class="chip ${s.showRead ? "" : "on"}" data-a="qxset" data-k="showRead" data-v="">Keep it out</button><button class="chip ${s.showRead ? "on" : ""}" data-a="qxset" data-k="showRead" data-v="1">Show my read</button></div><div class="tiny muted">Off unless you turn it on. The story shows only what you choose.</div></div>`;
  return (
    finish +
    (G2.done
      ? `<div class="levelup pop" style="padding:8px 0"><div class="eyebrow">You graduated</div><h2 style="margin:8px 0">${esc(G2.name)}</h2><div class="small">You reached the finish line you picked. The game keeps going for what comes next.</div></div>`
      : dkStatRow([
          dkTile("Finish line", esc(G2.name || "")),
          dkTile("Of the way", G2.pct == null ? "Not yet" : G2.pct + "%"),
          dkTile("To go", G2.left == null ? "Not yet" : money(Math.round(G2.left))),
        ]) + (G2.pct != null ? dkProgress(G2.pct, { text: "Toward " + G2.name }) : "")) +
    dkCard(G2.done ? "Your story" : "Your story so far", story, { cap: "From the numbers you saved along the way." }) +
    (R.story.read.length || R.story.readHidden || s.showRead ? readBtn : "") +
    mathBox(
      R.J.stages
        .map(
          t =>
            t.name +
            ": " +
            (t.done == null ? "needs a number" : t.done ? "reached" : money(Math.round(t.left || 0)) + " to go")
        )
        .concat([
          "Story dates: the first saved snapshot that met each stage, at today's Coast and FI numbers. Debt free reads all debt in a snapshot.",
        ])
    )
  );
}
function qvSheet() {
  const c = C(),
    tab = (W && W.tab) || "sheet",
    B = {
      sheet: qvSheetBody,
      room: qvRoomBody,
      costs: qvCostsBody,
      rank: qvRankBody,
      rivals: qvRivalsBody,
      judge: qvJudgeBody,
      ask: qvAskBody,
      packs: qvPacksBody,
      grad: qvGradBody,
    };
  return (
    head("Menu", "Quest mode") +
    dkCaption("Your character, your room, your rivals and your finish line, from your own numbers") +
    `<div class="chips qmtabs">${QG_TABS.map(t => `<button class="chip ${t[0] === tab ? "on" : ""}" data-a="qxtab" data-v="${t[0]}">${t[1]}</button>`).join("")}</div>` +
    `<div class="stack" style="gap:10px">${(B[tab] || qvSheetBody)(c)}</div>`
  );
}
/* Part of rvSheet() in reveal.js. Adds the row "Quest mode" over the copy button of the character sheet. */
function rvSheetQuest(h) {
  const row = `<button class="rowbtn" data-a="qmode"><span><b>Quest mode</b><div class="tiny muted">Health, armor, six stats, rivals, the judge and graduating</div></span><span class="caret">›</span></button>`;
  const i = h.indexOf('<button class="primary wide" data-a="rvcopy"');
  return i < 0 ? h : h.slice(0, i) + row + h.slice(i);
}
kitScreen(
  "qmode",
  "Quest mode",
  "Your character with health, armor and six stats, your room, weak spots, rivals, the judge and graduating.",
  "Every number comes from your plan and shows its math. Nothing leaves this device."
);
Object.assign(ACT, {
  qmode: t => {
    const v = t && t.dataset && t.dataset.v; // the menu row passes its own data-v ("qmode"): only a real tab counts
    W = { kind: "qmode", tab: QG_TABS.some(x => x[0] === v) ? v : "sheet", o: {} };
    sheet(qvSheet);
  },
  qxtab: t => {
    if (!W || W.kind !== "qmode") return;
    W.tab = t.dataset.v;
    W.pad = null;
    W.jopen = null;
    drawSheet();
  },
  qxset: t => {
    const s = qgSt(C()),
      k = t.dataset.k,
      v = t.dataset.v;
    if (!["plate", "rank", "finish", "showRead", "topic", "ask", "pack"].includes(k)) return;
    s[k] = k === "showRead" ? !!v : s[k] === v && k === "ask" ? null : v;
    save();
    drawSheet();
  },
  qxjudge: t => {
    const c = C(),
      s = qgSt(c),
      id = t.dataset.k,
      tap = t.dataset.v,
      why = t.dataset.w || null,
      call = qgCalls(c).find(x => x.id === id);
    if (!call) return;
    if (tap === "not" && !why) {
      if (W) W.jopen = id;
      drawSheet();
      return;
    }
    s.log = qsJudgeAdd(s.log, call, tap, why, new Date().toISOString());
    if (id === "capacity" && (why === "less" || why === "more")) s.felt = why;
    if (W) W.jopen = null;
    save();
    drawSheet();
  },
  qxprice: t => {
    const s = qgSt(C());
    s.price[t.dataset.k] = +t.dataset.v;
    save();
    drawSheet();
  },
  qxduel: t => {
    const c = C(),
      s = qgSt(c),
      o = QS_OPPONENTS.find(x => x.id === t.dataset.k),
      D = o ? qsDuel(o, t.dataset.v, typeof vlGet === "function" ? vlGet(c).top : []) : null;
    if (!D) return;
    const was = s.duels[o.id];
    s.duels[o.id] = { choice: D.choice, at: todayISO(), beaten: D.beaten || !!(was && was.beaten) };
    save();
    drawSheet();
  },
});
kitMenu("Quest mode", "qmode", "Your character sheet, your room, weak spots, rivals, the judge and graduating", "qz");
