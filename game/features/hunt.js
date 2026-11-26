/* ============================================================================
   SLAM the Game: features/hunt.js
   PURPOSE     Two games on real rules (run Not built, groups 1 to 5, Part 10b). (1) The credit score game:
               tap the five groups of a FICO Score from the biggest share down, then tap which group each
               everyday move touches. The shares are the ones myFICO publishes. No real score is fetched or
               shown; the one number of the player's own is their card use from Key numbers. (2) The first
               $1,000 bonus hunt, from the bank bonus queue (the famous idea "doc", ideas4.js): the bank bonus
               calculator (the bonus less the tax, the HYSA interest the deposit gives up while it waits, and
               the fees), then the bonuses lined up one at a time, each Planned, Open or Paid, toward $1,000
               kept.
   INPUT       The profile (c.x.crg, c.x.hunt), Key numbers (knMetrics: the card use).
   OUTPUT      Functions: crgX, crgUtil, crgSheet, huX, huRead, huSheet, huBook. Named functions Home can call
               later: huRead (the hunt's progress), crgX (the best round). Actions (ACT): crg, crgtap,
               crgreset, crgmove, crgnext, hunt, hudraft, huadd, hustate, hudel. Menu: "The credit
               score game", "The first $1,000 bonus hunt".
   DEPENDS ON  core/report.js, core/play.js (PL_FICO, plFicoRound, PL_MOVES, plMoveRound, plBonus, plHunt,
               PL_HUNT_GOAL), core/metrics.js (knMetrics), screens/ui.js (money, esc, head, sheet),
               screens/dash.js (the kit), features/ideas4.js (IG_BANKCK, the checks of the bank bonus queue).
   RULES       No real score. No bank is named and no offer is listed: the player taps the terms of the offer
               they read. A bank bonus is taxed as interest: with no tax rate tapped, the result says the tax
               is not in.
   ========================================================================= */

/* ---------- (1) The credit score game ---------- */
function crgX(c) {
  c.x = c.x || {};
  return (c.x.crg = c.x.crg || { best: null, plays: 0 });
}
/* The player's own card use, from Key numbers (the same number, never worked out twice). */
function crgUtil(c) {
  try {
    const m = (knMetrics(c, derive(c)) || []).find(x => x.id === "util");
    return m && m.num != null ? { v: m.num, st: m.st } : null;
  } catch (e) {
    report(e, "hunt.js: crgUtil");
    return null;
  }
}
function crgSheet() {
  const c = C(),
    w = W,
    F = PL_FICO.factors,
    order = w.order || [],
    R1 = order.length === F.length ? plFicoRound(order) : null,
    st = crgX(c),
    U = crgUtil(c),
    fname = id => F.find(f => f.id === id).n;
  let body;
  if (!R1) {
    body = dkCard(
      "Round 1: which weighs most?",
      `<div class="small">Tap the five groups from the biggest share of the score to the smallest.</div>` +
        (order.length
          ? `<div class="tiny muted">Your order so far: ${order.map((id, i) => i + 1 + ". " + esc(fname(id))).join(", ")}</div>`
          : "") +
        `<div class="stack" style="gap:6px">${F.filter(f => !order.includes(f.id))
          .map(
            f =>
              `<button class="ghost wide" data-a="crgtap" data-v="${f.id}">${esc(f.n)}<div class="tiny muted">${esc(f.what)}</div></button>`
          )
          .join("")}</div>` +
        (order.length ? `<button class="ghost wide slim" data-a="crgreset">Start the order again</button>` : ""),
      { right: dkPill(order.length + " of 5") }
    );
  } else if (!w.round2) {
    body = dkCard(
      "Round 1: the shares",
      `<div class="small" data-fid="crg:r1"><b>${R1.places} of 5 in their place.</b> That is ${Math.round(R1.points * 100)}% of the score's weight placed right.</div>` +
        dkDonut(
          F.map(f => ({ l: f.n, v: f.share })),
          { center: "FICO", label: "The five groups of a FICO Score" }
        ) +
        `<div class="stack" style="gap:4px">${order.map((id, i) => `<div class="row between small"><span>${i + 1}. ${esc(fname(id))}</span>${dkPill(R1.right[i] ? "In its place" : "Moves to " + (F.findIndex(f => f.id === id) + 1), R1.right[i] ? "okp" : "")}</div>`).join("")}</div>` +
        `<div class="tiny muted">${esc(PL_FICO.note)} Source: ${esc(PL_FICO.source)}, read ${esc(PL_FICO.date)}.</div>` +
        `<button class="primary wide" data-a="crgnext">Round 2: what each move touches</button>`
    );
  } else {
    const picks = w.picks || {},
      R2 = plMoveRound(picks);
    body = dkCard(
      "Round 2: what each move touches",
      `<div class="small">Tap the group each move touches most.</div>` +
        PL_MOVES.map(m => {
          const p = picks[m.id];
          return `<div class="tile stack" style="gap:4px"><b class="small">${esc(m.n)}</b>${
            p
              ? `<div class="tiny" data-fid="crg:m:${m.id}">${p === m.f ? "Yes: " + esc(fname(m.f)) + "." : "It touches " + esc(fname(m.f)) + " most."}</div>`
              : `<div class="chips">${F.map(f => `<button class="chip" data-a="crgmove" data-k="${m.id}" data-v="${f.id}">${esc(f.n)}</button>`).join("")}</div>`
          }</div>`;
        }).join("") +
        (R2.ready
          ? `<div class="small"><b>${R2.right} of ${R2.tapped}</b> tapped to the group they touch most.</div>`
          : ""),
      { right: dkPill((R2.ready ? R2.tapped : 0) + " of " + PL_MOVES.length) }
    );
  }
  const own = dkCard(
    "In your hand",
    U
      ? `<div class="small">Your card use is ${Math.round(U.v * 100)}% of your limits (${esc(U.st)}). It is part of Amounts owed, the second biggest group.</div><button class="ghost wide slim" data-a="metric" data-v="util">See it on Key numbers</button>`
      : `<div class="small">Add your card limits on Key numbers and your own card use shows here, next to the game.</div>`,
    { cap: "The game fetches no score. Your free credit reports are at AnnualCreditReport.com." }
  );
  return (
    head("The credit score game", "What moves a score") +
    dkCaption("Two short rounds on the five groups that make up a FICO Score.") +
    (st.best != null
      ? dkStatRow([dkTile("Best round 1", st.best + " of 5"), dkTile("Rounds played", String(st.plays))])
      : "") +
    body +
    own +
    `<button class="ghost wide slim" data-a="close">Done</button>`
  );
}

/* ---------- (2) The first $1,000 bonus hunt ---------- */
const HU_PICKS = {
  bonus: [100, 200, 300, 400, 500, 900],
  deposit: [0, 500, 1000, 5000, 10000, 25000],
  months: [2, 3, 4, 6, 12],
  fees: [0, 5, 15, 25, 60],
  hysa: [0, 0.01, 0.03, 0.035, 0.04, 0.045],
  bank: [0, 0.001, 0.01],
  tax: [null, 0.1, 0.12, 0.22, 0.24, 0.32],
};
function huX(c) {
  c.x = c.x || {};
  return (c.x.hunt = c.x.hunt || { list: [], hysa: null, tax: null });
}
/* The hunt on the player's bonuses: the result of plHunt, with the HYSA rate and the tax rate the player tapped
   once for all of them. Home can call this later (one line: kept so far, of $1,000). */
function huRead(c) {
  const H = huX(c),
    rows = H.list.map(b => Object.assign({ hysaRate: H.hysa, taxRate: H.tax }, b));
  return Object.assign(plHunt(rows), { list: H.list, hysa: H.hysa, tax: H.tax });
}
const huPct = v => (v == null ? "Leave it out" : Math.round(v * 1000) / 10 + "%");
function huChips(k, val, fmt) {
  return `<div class="chips">${HU_PICKS[k].map(v => `<button class="chip ${val === v ? "on" : ""}" data-a="hudraft" data-k="${k}" data-v="${v == null ? "" : v}">${fmt(v)}</button>`).join("")}</div>`;
}
function huSheet() {
  const c = C(),
    w = W,
    H = huX(c),
    R = huRead(c),
    dr = (w.draft = w.draft || { bonus: null, deposit: 0, months: null, fees: 0, bankRate: 0 }),
    B = plBonus(Object.assign({ hysaRate: H.hysa, taxRate: H.tax }, dr));
  const stats = dkStatRow([
    dkTile("Kept so far", money(R.banked), { sub: "of " + money(R.goal) }),
    dkTile("Lined up", money(R.lined), { sub: R.rows.length + (R.rows.length === 1 ? " bonus" : " bonuses") }),
    dkTile("Still to go", money(R.left)),
  ]);
  const calc = dkCard(
    "The bank bonus calculator",
    `<div class="tiny muted">Tap the terms of an offer you read. One time for all bonuses: the rate your money earns where it is now, and your tax rate.</div>` +
      q("The bonus", huChips("bonus", dr.bonus, money)) +
      q(
        "Money that must stay in the account",
        huChips("deposit", dr.deposit, money),
        "The direct deposit or the balance the offer asks for."
      ) +
      q(
        "For how long",
        huChips("months", dr.months, v => v + " months")
      ) +
      q("Fees you would pay", huChips("fees", dr.fees, money), "A monthly fee you cannot waive, times the months.") +
      q("What the bonus account pays", huChips("bank", dr.bankRate, huPct)) +
      q(
        "Where the money is now earns",
        huChips("hysa", H.hysa, huPct),
        "Your high-yield savings rate, or 0% for checking."
      ) +
      q("Your top tax rate", huChips("tax", H.tax, huPct), "A bank bonus is taxed as interest.") +
      (B.ready
        ? `<div class="tile stack" style="gap:2px" data-fid="hu:calc"><div class="small"><b>It keeps about ${money(B.net)}</b>${B.taxIn ? "" : " before tax"}.</div><div class="tiny muted">${money(B.bonus)} bonus${B.taxIn ? " - " + money(B.tax) + " tax" : ""} - ${money(B.lostKept)} of interest the deposit gives up - ${money(B.fees)} fees.${B.likeRate != null ? " Like " + Math.round(B.likeRate * 1000) / 10 + "% a year on the deposit." : ""}</div></div>` +
          `<details class="math"><summary>Show the math</summary><div class="inner tiny stack" style="gap:4px"><div>Interest given up: ${money(B.deposit)} grown ${B.months} months at ${huPct(B.hysaRate)} a year, less the same at ${huPct(B.bankRate)}, each month compounded (the HYSA switch's own math) = ${money(B.lost)}${B.taxIn ? ", " + money(B.lostKept) + " after its tax" : ""}</div><div>Kept: bonus - tax - interest given up - fees</div></div></details>` +
          `<button class="primary wide" data-a="huadd">Add it to the hunt</button>`
        : `<div class="tiny muted">Still needs ${esc(B.needs.join(" and "))}.</div>`)
  );
  const list = R.rows.length
    ? dkCard(
        "Your bonuses, one at a time",
        (R.open > 1
          ? `<div class="tile small">${R.open} are open at once. One at a time keeps the dates easy to meet.</div>`
          : "") +
          R.rows
            .map((o, i) => {
              const b = H.list[i];
              return `<div class="tile stack" style="gap:4px" data-fid="hu:row:${i}"><div class="row between small"><b>Bonus ${i + 1}: ${money(b.bonus)}</b>${dkPill(o.r.ready ? "Keeps " + money(o.r.net) : "Needs a term")}</div><div class="tiny muted">${b.deposit ? money(b.deposit) + " for " : ""}${b.months} months${b.opened ? ". Opened " + esc(nice(b.opened)) : ""}</div><div class="seg">${["planned", "open", "paid"].map(s => `<button class="${o.state === s ? "on" : ""}" data-a="hustate" data-k="${i}" data-v="${s}">${{ planned: "Planned", open: "Open", paid: "Paid" }[s]}</button>`).join("")}</div><button class="ghost slim" data-a="hudel" data-v="${i}">Take it off the list</button></div>`;
            })
            .join(""),
        {
          cap: R.there
            ? "You kept your first $1,000 from bonuses."
            : R.reach
              ? "The bonuses lined up reach $1,000."
              : "",
        }
      )
    : "";
  const checks =
    typeof IG_BANKCK !== "undefined"
      ? `<details class="math"><summary>The rules of the bank bonus queue</summary><div class="inner stack" style="gap:4px">${IG_BANKCK.map(k => `<div class="small"><b>${esc(k[1])}</b>${k[2] ? `<div class="tiny muted">${esc(k[2])}</div>` : ""}</div>`).join("")}<button class="ghost wide slim" data-a="idea" data-v="doc">Open the bank bonus queue idea</button></div></details>`
      : "";
  return (
    head("The first $1,000 bonus hunt", "Bank bonuses, one at a time") +
    dkCaption("While your cushion waits, it can earn bank bonuses on the way. Each one keeps less than its sticker.") +
    stats +
    dkProgress(Math.round((R.pct || 0) * 100), { text: money(R.banked) + " of " + money(R.goal) + " kept" }) +
    calc +
    list +
    checks +
    `<button class="ghost wide slim" data-a="close">Done</button>`
  );
}
/* ---------- the spreadsheet of the plan (book.js) ---------- */
function huBook(c) {
  try {
    const R = huRead(c),
      rows = [];
    R.rows.forEach((o, i) => {
      if (!o.r.ready) return;
      const k = "hu" + i;
      rows.push({ id: k + "_b", label: "Bonus " + (i + 1), v: o.r.bonus });
      rows.push({ id: k + "_t", label: "Bonus " + (i + 1) + ": tax", v: o.r.tax || 0 });
      rows.push({ id: k + "_l", label: "Bonus " + (i + 1) + ": interest given up, after tax", v: o.r.lostKept });
      rows.push({ id: k + "_f", label: "Bonus " + (i + 1) + ": fees", v: o.r.fees });
      rows.push({
        id: k,
        label: "Bonus " + (i + 1) + ": kept",
        v: o.r.net,
        f: "={" + k + "_b}-{" + k + "_t}-{" + k + "_l}-{" + k + "_f}",
        note: o.state,
      });
    });
    return rows.length ? { title: "The first $1,000 bonus hunt", rows } : null;
  } catch (e) {
    report(e, "hunt.js: huBook");
    return null;
  }
}

Object.assign(ACT, {
  crg: () => {
    W = { kind: "crg", order: [], picks: {} };
    sheet(crgSheet);
  },
  crgtap: t => {
    const w = W;
    if (!w || w.kind !== "crg") return;
    w.order = w.order || [];
    if (!w.order.includes(t.dataset.v)) w.order.push(t.dataset.v);
    if (w.order.length === PL_FICO.factors.length) {
      const R = plFicoRound(w.order),
        st = crgX(C());
      st.plays = (st.plays || 0) + 1;
      st.best = Math.max(st.best || 0, R.places);
      save();
    }
    drawSheet();
  },
  crgreset: () => {
    if (W && W.kind === "crg") W.order = [];
    drawSheet();
  },
  crgnext: () => {
    if (W && W.kind === "crg") W.round2 = true;
    drawSheet();
  },
  crgmove: t => {
    if (!W || W.kind !== "crg") return;
    W.picks = W.picks || {};
    W.picks[t.dataset.k] = t.dataset.v;
    drawSheet();
  },
  hunt: () => {
    W = { kind: "hunt" };
    sheet(huSheet);
  },
  hudraft: t => {
    const w = W,
      k = t.dataset.k,
      v = t.dataset.v === "" ? null : +t.dataset.v;
    if (!w || w.kind !== "hunt") return;
    const H = huX(C());
    w.draft = w.draft || {};
    if (k === "hysa") H.hysa = v;
    else if (k === "tax") H.tax = v;
    else if (k === "bank") w.draft.bankRate = v;
    else w.draft[k] = v;
    if (k === "hysa" || k === "tax") save();
    drawSheet();
  },
  huadd: () => {
    const w = W,
      H = huX(C());
    if (!w || !w.draft) return;
    const b = Object.assign({ state: "planned" }, w.draft);
    if (!plBonus(Object.assign({ hysaRate: H.hysa, taxRate: H.tax }, b)).ready) return;
    H.list.push(b);
    w.draft = null;
    save();
    drawSheet();
  },
  hustate: t => {
    const H = huX(C()),
      b = H.list[+t.dataset.k];
    if (!b) return;
    b.state = t.dataset.v;
    if (b.state === "open" && !b.opened) b.opened = todayISO();
    if (b.state === "paid" && !b.paid) b.paid = todayISO();
    save();
    drawSheet();
  },
  hudel: t => {
    const H = huX(C());
    H.list.splice(+t.dataset.v, 1);
    save();
    drawSheet();
  },
});
if (typeof MENU !== "undefined") {
  MENU.push(["The credit score game", "crg", "act", "Tap what weighs most in a score, and what each move touches"]);
  MENU.push([
    "The first $1,000 bonus hunt",
    "hunt",
    "act",
    "A bank bonus calculator, and bonuses lined up toward $1,000",
  ]);
}
