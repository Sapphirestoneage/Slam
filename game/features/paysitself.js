/* ============================================================================
   SLAM the Game: features/paysitself.js
   PURPOSE     "Pays for itself", for a coach only (run CC-1, item 21, Nov 28 2026). One headline
               number for a first call: the fees the fee X-ray found, the bonuses open to this client,
               and the interest the debt plan saves, added up next to the one fee of the coach.
   INPUT       The profile of the open game. mixCalc (features/mix.js: the fee X-ray), stgRank
               (features/strat.js: the moves "bank" and "welcome"), dbLive and dbPlan (features/debts.js),
               c.x.dplan (the extra a month and the order of the debt plan). COACH_OFFER.fee
               (data/offer.js: null until the owner sets it). The open sheet (W.kind): pfi.
   OUTPUT      Math: pfiCan, pfiParts, pfiRead. Views: pfiSheet. Parts of functions in other files:
               homePfiRow (home in ui.js). Actions (ACT): pfi. Menu (coach only): "Pays for itself".
   DEPENDS ON  core/coachfee.js (coFeesAbove, coPaysForItself), core/report.js, core/engine.js,
               screens/ui.js (head, mathBox, esc, money, sheet), screens/dash.js (dkCaption, dkCard,
               dkPill), features/kit.js (kitTerms, kitScreen, kitMenu, kitInfo), features/cofill.js
               (cfCoach), account/roles.js (roCan, RO_ONLY), features/reveal.js (homeRowAdd).
   RULES       A player never sees this: the row, the menu line and the action each test pfiCan(). Each
               part comes from the engine that already works it out. This file adds nothing by itself:
               the sum and the comparison are coPaysForItself of core/coachfee.js. A part that was not
               found is "Not found yet" and is not counted as $0. With no fee set there is no headline
               number. The words do not promise a result: each part is what the game found on the
               numbers it has, and a Guess is marked.
   ========================================================================= */
kitTerms({
  pfifees: [
    "Fees found",
    "From Investment mix and fees (the fee X-ray): the fees a year on this client's investments, less what the same money would cost in a low-cost fund. It counts only after the client gave at least one real answer there.",
  ],
  pfibonus: [
    "Bonuses available",
    "From Moves to try: a bank bonus and a card welcome offer, for one year, when the move fits this client. A client with debt at 8% or more gets none: the interest costs more than a bonus pays.",
  ],
  pfiinterest: [
    "Interest saved",
    "From the Debt plan: the interest still to come with today's payments, less the interest with the extra a month the plan holds. It needs the debts listed and an extra amount picked.",
  ],
  pfifee: [
    "Your fee",
    "The one price of the coaching offer. It is a setting the owner fills in one place (data/offer.js). Until then there is no headline number.",
  ],
});
kitScreen(
  "pfi",
  "Pays for itself",
  "For the coach: what the game found for this client, added up next to your fee.",
  "One number for the first call. A part that was not found is not counted."
);
if (typeof RO_ONLY !== "undefined") RO_ONLY.pfi = "coach";
/* Who may see it: a coach or the admin, in their own game or in the game of a client. Never a player. */
function pfiCan() {
  return (
    (typeof cfCoach === "function" && cfCoach()) ||
    (typeof roCan === "function" &&
      typeof ROLES !== "undefined" &&
      roCan("coach", ROLES) &&
      (ROLES.coach || ROLES.admin))
  );
}
/* THE THREE PARTS, each from its own engine. amount: dollars, or null when it was not found yet. note: why. */
function pfiParts(c) {
  const out = [];
  /* 1. the fee X-ray */
  const M = mixCalc(c),
    feesOk = M.total > 0 && M.st !== "Guess";
  out.push({
    id: "fees",
    term: "pfifees",
    name: "Fees found (X-ray)",
    span: "a year",
    amount: feesOk ? coFeesAbove({ year: M.feeYear, total: M.total, low: MIX_LOW / 100 }) : null,
    note: feesOk
      ? money(Math.round(M.feeYear)) + " a year in fees now, on " + money(Math.round(M.total)) + " invested."
      : M.total > 0
        ? "The fees are still a guess from typical funds. One real answer on Investment mix and fees makes it count."
        : "Nothing invested is listed yet.",
    st: feesOk ? M.st : null,
    open: ["mix", "", "Open Investment mix and fees"],
  });
  /* 2. the two bonus moves of the Strategy Engine */
  const rk = stgRank(c),
    rows = ["bank", "welcome"].map(id => rk.find(r => r.S.id === id)).filter(Boolean),
    fit = rows.filter(r => r.V.v === "fits"),
    wait = rows.filter(r => r.V.v !== "fits");
  out.push({
    id: "bonus",
    term: "pfibonus",
    name: "Bonuses available (bank and card)",
    span: "in one year",
    amount: rows.length ? fit.reduce((t, r) => t + Math.max(0, r.F.value || 0) * 12, 0) : null,
    note: rows.length
      ? (fit.length
          ? fit.map(r => r.S.name + ": " + money(Math.round(Math.max(0, r.F.value || 0) * 12))).join(". ") + ". "
          : "") +
        wait
          .map(
            r =>
              r.S.name + ": " + (r.V.v === "already" ? "already doing it" : "waits") + (r.V.why ? ". " + r.V.why : "")
          )
          .join(" ")
      : "The moves are not loaded.",
    st: fit.length ? "Guess" : null,
    open: ["strat", "bank", "Open the bank bonus move"],
  });
  /* 3. the debt plan, with the extra a month and without it */
  const L = dbLive(c),
    P = (c.x && c.x.dplan) || {},
    extra = P.extra || 0,
    order = P.order || "avalanche";
  let amt = null,
    note = "";
  if (!c.led) note = "The debts are not listed one by one yet.";
  else if (!L.length) {
    amt = 0;
    note = "No debt is listed, so there is no interest to save.";
  } else if (!(extra > 0)) note = "The Debt plan has no extra amount a month yet. Pick one there with the client.";
  else {
    const p0 = dbPlan(c, order, 0),
      p1 = dbPlan(c, order, extra);
    if (p0.months == null || p1.months == null)
      note = "Today's payments do not clear the debt, so there is no total to compare yet.";
    else {
      amt = Math.max(0, p0.interest - p1.interest);
      note =
        money(extra) +
        " more a month: " +
        money(Math.round(p1.interest)) +
        " of interest in place of " +
        money(Math.round(p0.interest)) +
        ".";
    }
  }
  out.push({
    id: "interest",
    term: "pfiinterest",
    name: "Interest saved (debt plan)",
    span: "over the whole payoff",
    amount: amt,
    note,
    st: amt != null && L.length ? dbStatus(c) : null,
    open: ["debtplan", "", "Open the Debt plan"],
  });
  return out;
}
/* Everything the sheet shows: the parts, and the sum next to the fee (core/coachfee.js). */
function pfiRead(c) {
  const parts = pfiParts(c),
    fee = typeof COACH_OFFER !== "undefined" && COACH_OFFER ? COACH_OFFER.fee : null;
  return { parts, R: coPaysForItself({ parts, fee }) };
}
function pfiSheet() {
  const c = C(),
    X1 = pfiRead(c),
    R = X1.R,
    least = R.missing.length ? "At least " : "",
    one = v => String(Math.round(v * 10) / 10);
  return (
    head("Coach", "Pays for itself") +
    dkCaption("For your first call: what the game found for this client, next to your fee.") +
    dkCard(
      "The headline",
      R.ready
        ? `<div class="stack" style="gap:4px" data-fid="pfi:head"><b class="bignum" data-pfi="total">${least ? "At least " : ""}${money(Math.round(R.total))}</b><div class="small">found so far, next to your fee of <b>${money(R.fee)}</b>: ${R.net >= 0 ? money(Math.round(R.net)) + " more than the fee" : money(Math.round(-R.net)) + " less than the fee"}, or ${one(R.times)} times the fee.</div>${R.missing.length ? `<div class="tiny muted">${R.missing.length} ${R.missing.length === 1 ? "part is" : "parts are"} not found yet and not counted: ${esc(R.missing.join(", "))}.</div>` : ""}</div>`
        : `<div class="stack" style="gap:4px" data-fid="pfi:wait"><b>No headline number yet.</b><div class="small">It needs ${esc(R.needs.join(" and "))}.${R.fee === null ? " The fee is a placeholder until Eli sets it (one setting, data/offer.js)." : ""}</div>${R.total !== null ? `<div class="small">Found so far: <b data-pfi="total">${least}${money(Math.round(R.total))}</b>.</div>` : ""}</div>`,
      { right: kitInfo("pfifee") }
    ) +
    `<div class="stack" style="gap:8px" data-fid="pfi:parts">${X1.parts
      .map(
        p =>
          `<div class="tile stack" style="gap:6px" data-pfp="${p.id}"><div class="row between" style="gap:8px"><b class="small">${esc(p.name)}</b>${kitInfo(p.term)}</div><div class="row between" style="gap:8px"><span>${p.amount === null ? `<b>Not found yet</b>` : `<b>${money(Math.round(p.amount))}</b> <span class="tiny muted">${esc(p.span)}</span>`}</span>${p.st ? dkPill(p.st, p.st === "Guess" ? "" : "okp") : ""}</div><div class="tiny muted">${esc(p.note)}</div><button class="ghost slim" style="min-height:44px" data-a="${p.open[0]}" data-v="${p.open[1]}">${esc(p.open[2])}</button></div>`
      )
      .join("")}</div>` +
    mathBox([
      "Found so far = fees found + bonuses available + interest saved, for the parts that were found.",
      "A part that was not found yet is left out. It is not counted as $0.",
      "Next to the fee: found so far minus the fee, and found so far divided by the fee.",
      "The parts cover different stretches of time: the fees are for one year, the bonuses for one year, the interest for the whole payoff.",
      "Each part is what the game found on the numbers it has today. It is not a promise of a result.",
    ]) +
    `<div class="tiny muted">Only a coach sees this screen. The client does not.</div>` +
    `<button class="primary wide" data-a="close">Done</button>`
  );
}
/* Part of home() in ui.js. For a coach in the game of a client: one row that opens the screen. */
function homePfiRow(h) {
  try {
    if (!(typeof cfCoach === "function" && cfCoach()) || typeof homeRowAdd !== "function") return h;
    return homeRowAdd(
      h,
      `<button class="rowbtn homerow" data-a="pfi" data-fid="pfi:coach"><span><b>Pays for itself</b><div class="tiny muted">For your first call: what the game found for this client, next to your fee. Only you see this.</div></span><span class="caret"><i class=chev aria-hidden=true></i></span></button>`
    );
  } catch (e) {
    report(e, "paysitself.js: homePfiRow");
    return h;
  }
}
Object.assign(ACT, {
  pfi: () => {
    if (!pfiCan()) return;
    W = { kind: "pfi" };
    sheet(pfiSheet);
  },
});
if (typeof MENU_GROUPS !== "undefined") {
  const g = MENU_GROUPS.find(x => x[0] === "coach");
  if (g && !g[3].includes("pfi")) g[3].push("pfi");
}
kitMenu("Pays for itself", "pfi", "For a coach: what the game found for this client, next to your fee", "session");
