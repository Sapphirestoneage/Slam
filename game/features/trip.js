/* ============================================================================
   SLAM the Game: features/trip.js
   PURPOSE     Trips and the journey. Four tabs on one screen: (1) The trip: flights, lodging a night,
               the days away, food a day, the card's fee on other currencies, visa fees, travel
               insurance and everything else, added up. (2) Points: cash or redeem, from the cents a
               point next to the player's own value of a point. (3) Group split: the trip among people,
               by share or by item, in one currency. (4) Journey: the FIRE journey map (digging out, the
               first $1k, debt free, $100k, Coast, FI), where the player is, and how the trip moves them.
   INPUT       The profile: c.inv, c.take, c.spend, the high-rate debt (hiDebt), derive (cash, the Coast
               number, the freedom number), the answers c.x.trip (kit answers, { v, cf }), c.x.tpppl
               (the people) and c.x.tpamong (who is in on each line). The open sheet (W.kind): trips,
               with W.tab.
   OUTPUT      Math: tpgLines, tpgPoints, tpgSplit, tpgJourney. Functions: tripBook, tripSheet.
               Actions (ACT): trips, tptab, tpset, tpsetsure, tpfx, tppadd, tppdel, tppname, tppshare,
               tpamong. Menu: "Trips and the journey".
   DEPENDS ON  core/trip.js (the one engine, a copy of js/math/trip.js of the web app, with the
               household split engine), core/engine.js (goalSim through freeAt, derive, hiDebt),
               features/kit.js, screens/dash.js, screens/ui.js.
   RULES       The math is in core/trip.js. The stage dates and the freedom date are the game's own
               (goalSim), run with the trip in as a cost paid first from what is left each month. The
               amounts are the player's taps: the chips are taps, not prices, and say so. A trip in
               another currency stays out of the plan: no exchange rate is guessed.
   ========================================================================= */
const TPG_TABS = [
  ["trip", "The trip"],
  ["points", "Points"],
  ["group", "Group split"],
  ["journey", "Journey"],
];
const TPG_ERA = { k1: 1, debt: 3, coast: 7, fi: 8 };
/* One answer of the screen: the value and its Guess / Close / Exact. */
function tpgVal(c, key, fallback) {
  return kitValue(c, "trip", key, fallback);
}
function tpgCur(c) {
  return tpgVal(c, "cur", "USD").v || "USD";
}
/* (1) THE TRIP, LINE BY LINE (with the points off when the player pays with points). */
function tpgLines(c) {
  const I = {};
  ["flights", "lodging", "days", "food", "fxPct", "visa", "insurance", "other"].forEach(
    k => (I[k] = tpgVal(c, k, null))
  );
  const P = tpgPoints(c),
    use = tpgVal(c, "usePoints", null).v === "yes" && !(P.P.needs && P.P.needs.length),
    x = {
      flights: I.flights.v,
      lodging: I.lodging.v,
      days: I.days.v,
      food: I.food.v,
      fxPct: I.fxPct.v,
      visa: I.visa.v,
      insurance: I.insurance.v,
      other: I.other.v,
      fxOn: (c.x && c.x.tpfx) || TP_FX_START,
      pointsOff: use ? P.P.cashOff : null,
    },
    T = tpCost(x),
    st = T.complete ? kitState(Object.values(I)) : "Guess";
  return { I, x, T, st, use, cur: tpgCur(c) };
}
/* (2) POINTS: cash or redeem. */
function tpgPoints(c) {
  const I = {
      cash: tpgVal(c, "pCash", null),
      points: tpgVal(c, "pPoints", null),
      fees: tpgVal(c, "pFees", null),
      cpp: tpgVal(c, "pCpp", null),
    },
    x = { cash: I.cash.v, points: I.points.v, fees: I.fees.v, cpp: I.cpp.v },
    P = tpPoints(x);
  return { I, x, P, st: kitState(Object.values(I)) };
}
/* (3) THE GROUP SPLIT: the people of the trip, by share or by item. */
function tpgSplit(c) {
  const L = tpgLines(c),
    ppl = (c.x && c.x.tpppl) || [],
    among = (c.x && c.x.tpamong) || {},
    how = tpgVal(c, "how", "share").v || "share",
    items = L.T.lines
      .filter(l => l.amount != null && l.amount > 0)
      .map(l => ({ id: l.id, name: l.name, amount: l.amount, among: among[l.id] || null }));
  return { L, ppl, how, items, among, S: tpSplit({ people: ppl, how, items, total: L.T.ready ? L.T.total : null }) };
}
/* (4) THE JOURNEY: the game's own numbers into the engine; the stage dates and the freedom date from goalSim. */
function tpgJourney(c) {
  const L = tpgLines(c),
    d = derive(c),
    trip = L.T.ready && L.cur === "USD" ? L.T.total : null,
    at = sim => {
      const o = {};
      Object.keys(TPG_ERA).forEach(k => {
        const v = sim.eraAt[TPG_ERA[k]];
        if (v != null) o[k] = v;
      });
      return o;
    };
  let when = {},
    whenAfter = {},
    fiDays = null;
  try {
    when = at(goalSim(c));
    if (trip) {
      whenAfter = at(goalSim(c, { once: trip }));
      const a = freeAt(c),
        b = freeAt(c, { once: trip });
      fiDays = a == null || b == null ? null : tpDays(b - a);
    }
  } catch (e) {
    report(e, "trip.js: tpgJourney");
  }
  const J = tpJourney({
    cash: d.cash,
    debt: hiDebt(c),
    invested: c.inv || 0,
    coast: d.coastNum > 0 ? d.coastNum : null,
    fi: d.fi > 0 ? d.fi : null,
    monthly: c.take - c.spend,
    trip,
    when,
    whenAfter,
    fiDays,
  });
  return { L, J, st: L.cur === "USD" ? kitState([kitSharp(c, "take"), kitSharp(c, "spend")]) : "Guess" };
}
function tripBook(c) {
  const L = tpgLines(c),
    T = L.T,
    rows = [];
  if (!T.ready || L.cur !== "USD") return { title: "Trips", rows };
  const ln = id => T.lines.find(l => l.id === id).amount;
  [
    ["tp_flights", "Trip: flights", ln("flights")],
    ["tp_lodging", "Trip: lodging", ln("lodging")],
    ["tp_food", "Trip: food", ln("food")],
    ["tp_visa", "Trip: visa fees", ln("visa")],
    ["tp_ins", "Trip: travel insurance", ln("insurance")],
    ["tp_other", "Trip: everything else", ln("other")],
    ["tp_fx", "Trip: card fee on other currencies", ln("fx")],
  ].forEach(r =>
    rows.push({
      id: r[0],
      label: r[1],
      v: r[2] == null ? 0 : r[2],
      note: r[2] == null ? "Not tapped yet" : "Your answer",
    })
  );
  rows.push({ id: "tp_pts", label: "Trip: paid with points", v: T.pointsOff, note: "Your answer" });
  rows.push({
    id: "tp_total",
    label: "The trip, in all",
    v: T.total,
    f: "={tp_flights}+{tp_lodging}+{tp_food}+{tp_visa}+{tp_ins}+{tp_other}+{tp_fx}-{tp_pts}",
  });
  return { title: "Trips", rows };
}
/* ---------- the screen ---------- */
function tpgAsk(c, key, label, opts, o) {
  return kitAsk(c, "trip", key, label, opts, "", Object.assign({ act: "tpset" }, o || {}));
}
function tripSheet() {
  const c = C(),
    tab = (W && W.tab) || "trip",
    L = tpgLines(c),
    T = L.T,
    cur = L.cur,
    M = v => tpMoney(Math.round(v), cur),
    Q = tpgJourney(c),
    J = Q.J,
    S = tpgSplit(c).S,
    hereName = J.here == null ? "Tap yours" : J.here >= J.stages.length ? "Past FI" : J.stages[J.here].name;
  const top = dkStatRow([
    dkTile("The trip", T.ready ? M(T.total) : "Tap yours", {
      guess: L.st === "Guess",
      sub: T.open.length ? "so far" : "all in",
    }),
    dkTile("You are at", esc(hereName), { guess: Q.st === "Guess", sub: "on the journey" }),
    dkTile("Freedom date", J.fiDays == null ? "Tap yours" : tpDayWords(J.fiDays), {
      guess: true,
      sub: "with the trip",
    }),
    dkTile("Each person", S.needs && S.needs.length ? "Tap yours" : esc(S.parts.map(p => M(p.amount)).join(" / ")), {
      guess: L.st === "Guess",
      sub: S.needs && S.needs.length ? "add the people" : S.how === "item" ? "by item" : "by share",
    }),
  ]);
  let h =
    head("Plan", "Trips and the journey") +
    dkCaption("What a trip costs and how it moves you") +
    top +
    kitTabs("tptab", tab, TPG_TABS);
  if (tab === "trip") {
    const fxOn = L.x.fxOn;
    h += dkCard(
      "The trip, line by line",
      `<div class="row between"><span class="small">${esc(tpCostWords(T, cur) || "Tap the lines you know. A line not tapped is not counted yet.")}</span>${kitPill(L.st)}</div>` +
        (T.ready ? mathBox(tpCostMath(T, L.x, cur)) : "") +
        `<div class="tiny muted">${esc(TP_TAPS_NOTE)}</div>`
    );
    h += tpgAsk(
      c,
      "cur",
      "The trip's currency, one for everyone",
      TP_CURRENCIES.map(x => [x[0], x[2]])
    );
    h += tpgAsk(
      c,
      "flights",
      "Flights, every ticket",
      TP_OPTS.flights.map(v => [v, M(v)]),
      { typed: true }
    );
    h += tpgAsk(
      c,
      "days",
      "Days away",
      TP_OPTS.days.map(v => [v, v + " days"]),
      {
        help: T.days != null ? T.nights + " nights of lodging: the days less one." : "",
      }
    );
    h += tpgAsk(
      c,
      "lodging",
      "Lodging, a night",
      TP_OPTS.lodging.map(v => [v, M(v)]),
      { typed: true }
    );
    h += tpgAsk(
      c,
      "food",
      "Food, a day",
      TP_OPTS.food.map(v => [v, M(v)])
    );
    h += tpgAsk(
      c,
      "fxPct",
      "Your card's fee on other currencies",
      TP_OPTS.fxPct.map(v => [v, v + "%"]),
      {
        term: "tpfx",
        help: "Your card's terms show it as a foreign transaction fee.",
      }
    );
    h += `<div class="field"><span class="small">Paid in another currency</span><div class="chips">${TP_FX_CAN.map(id => `<button class="chip ${fxOn.includes(id) ? "on" : ""}" data-a="tpfx" data-v="${id}">${esc(TP_LINES.find(l => l.id === id).name)}</button>`).join("")}</div></div>`;
    h += tpgAsk(
      c,
      "visa",
      "Visa fees",
      TP_OPTS.visa.map(v => [v, M(v)]),
      { help: "The country's own site shows the fee." }
    );
    h += tpgAsk(
      c,
      "insurance",
      "Travel insurance",
      TP_OPTS.insurance.map(v => [v, M(v)]),
      { help: "The policy's quote shows it." }
    );
    h += tpgAsk(
      c,
      "other",
      "Everything else",
      TP_OPTS.other.map(v => [v, M(v)]),
      { help: "Getting around, tickets, gifts." }
    );
  } else if (tab === "points") {
    const P = tpgPoints(c);
    h += dkCard(
      "Pay cash or redeem?",
      `<div class="row between"><span class="small">${esc(tpPointsWords(P.P, cur) || "Tap the cash price, the points, the fees and what a point is worth to you.")}</span>${kitPill(P.st)}</div>` +
        (P.P.needs && P.P.needs.length ? "" : mathBox(tpPointsMath(P.P, P.x, cur))) +
        ((P.P.needs && P.P.needs.length) || !T.ready
          ? ""
          : `<button class="${L.use ? "primary" : "ghost"} wide slim" data-a="tpset" data-k="trip|usePoints" data-v="${L.use ? "no" : "yes"}" data-t="s">${L.use ? "Paying with points: " + M(T.pointsOff) + " off the trip" : "Pay with points on this trip"}</button>`)
    );
    h += tpgAsk(
      c,
      "pCash",
      "The cash price",
      TP_OPTS.cash.map(v => [v, M(v)]),
      { typed: true }
    );
    h += tpgAsk(
      c,
      "pPoints",
      "The points it asks for",
      TP_OPTS.points.map(v => [v, v.toLocaleString()])
    );
    h += tpgAsk(
      c,
      "pFees",
      "Fees still due in cash",
      TP_OPTS.fees.map(v => [v, v ? M(v) : "None"])
    );
    h += tpgAsk(
      c,
      "pCpp",
      "What a point is worth to you",
      TP_OPTS.cpp.map(v => [v, v + (v === 1 ? " cent" : " cents")]),
      {
        term: "tpcpp",
      }
    );
  } else if (tab === "group") {
    const G2 = tpgSplit(c),
      ppl = G2.ppl;
    h += dkCard(
      "Who is going",
      (ppl.length
        ? ppl
            .map(
              (p, i) =>
                `<div class="tile stack" style="gap:6px"><div class="row between"><b class="small">${esc(p.name)}</b><button class="ghost slim" data-a="tppdel" data-v="${i}">Remove</button></div><div class="tiny muted">Name</div><div class="chips">${["Me", "Partner", "Friend", "Sibling", "Parent", "Kid"].map(n => `<button class="chip sm ${p.name === n ? "on" : ""}" data-a="tppname" data-k="${i}" data-v="${n}">${n}</button>`).join("")}</div>${G2.how === "share" ? `<div class="tiny muted">Shares</div><div class="chips">${TP_OPTS.shares.map(n => `<button class="chip sm ${(p.shares || 1) === n ? "on" : ""}" data-a="tppshare" data-k="${i}" data-v="${n}">${n}</button>`).join("")}</div>` : ""}</div>`
            )
            .join("")
        : `<div class="small muted">Add each person on the trip. Everyone pays in ${esc(TP_CURRENCIES.find(x => x[0] === cur)[1])}.</div>`) +
        `<button class="${ppl.length >= 2 ? "ghost" : "primary"} wide slim" data-a="tppadd">Add a person</button>`,
      { cap: "One currency for everyone, so nobody is paid back at a rate." }
    );
    if (ppl.length >= 2) {
      h += tpgAsk(c, "how", "Split it", [
        ["share", "By share"],
        ["item", "By item"],
      ]);
      if (G2.how === "item")
        h += G2.items.length
          ? G2.items
              .map(it => {
                const list = G2.among[it.id] || ppl.map(p => p.id);
                return `<div class="field"><span class="small">${esc(it.name)}, ${M(it.amount)}: who is in on it</span><div class="chips">${ppl.map(p => `<button class="chip ${list.includes(p.id) ? "on" : ""}" data-a="tpamong" data-k="${it.id}" data-v="${esc(p.id)}">${esc(p.name)}</button>`).join("")}</div></div>`;
              })
              .join("")
          : `<div class="small muted">Tap the lines on The trip, and each one shows here.</div>`;
      h += dkCard(
        "Each person's part",
        G2.S.needs && G2.S.needs.length
          ? `<div class="small muted">Tap the lines on The trip first.</div>`
          : igRows(G2.S.parts.map(p => [esc(p.name), M(p.amount)])) +
              `<div class="small">${esc(tpSplitWords(G2.S, cur))}</div>` +
              mathBox(tpSplitMath(G2.S, cur)),
        { right: kitPill(L.st) }
      );
    }
  } else {
    const st = J.stages,
      here = J.here;
    h += dkCard(
      "Your FIRE journey",
      dkDayStrip(st.map((s, i) => ({ d: s.name, on: i === here, mark: s.done ? "Done" : i === here ? "Here" : "" }))) +
        st
          .map((s, i) => {
            if (i !== here || s.pct == null) return "";
            const a = s.after;
            return (
              dkProgress(s.pct * 100, { text: s.name + ": now" }) +
              (a && a.pct != null && a.pct < s.pct
                ? dkProgress(a.pct * 100, { text: s.name + ": after the trip" })
                : "")
            );
          })
          .join("") +
        `<div class="small">${esc(tpJourneyWords(J, cur) || "Tap your numbers on Home to place yourself.")}</div>` +
        (L.cur === "USD"
          ? ""
          : `<div class="tiny muted">The trip is in ${esc(TP_CURRENCIES.find(x => x[0] === cur)[1])}. Your plan is in US dollars, so the trip stays out of it: no exchange rate is guessed.</div>`) +
        mathBox(tpJourneyMath(J, cur)),
      { cap: "Digging out, the first $1k, debt free, $100k, Coast, FI.", right: kitPill(Q.st) }
    );
    h += dkCard(
      "Stage by stage",
      st
        .map(
          s =>
            `<div class="small"><b>${esc(s.name)}</b>: ${esc(
              s.done
                ? s.after && s.after.back
                  ? "Done. The trip takes you back under it for a while"
                  : "Done"
                : s.done == null
                  ? "Tap yours"
                  : s.months == null
                    ? "Ahead"
                    : "About " +
                      fmtDur(s.months) +
                      (s.after && s.after.months != null && s.after.months > s.months
                        ? ", with the trip " + fmtDur(s.after.months)
                        : "")
            )}</div>`
        )
        .join("")
    );
  }
  return h;
}
kitTerms({
  tpfx: [
    "Foreign transaction fee",
    "What a card charges on a purchase in another currency, as a percent of it. Your card's terms say what yours is. Some cards charge none.",
  ],
  tpcpp: [
    "What a point is worth to you",
    "The cents you would usually get for one point. A redemption that gets more than that is a good use of points for you.",
  ],
});
kitScreen(
  "trips",
  "Trips and the journey",
  "What a trip costs line by line, points or cash, a group split, and where you are on the FIRE journey.",
  "Each number shows its math. The amounts are yours to tap."
);
Object.assign(ACT, {
  trips: t => {
    W = { kind: "trips", tab: (t && t.dataset && t.dataset.v) || "trip", o: {} };
    sheet(tripSheet);
  },
  tptab: t => {
    if (!W || W.kind !== "trips") return;
    W.tab = t.dataset.v;
    W.pad = null;
    drawSheet();
  },
  tpset: t => {
    kitApply(t);
    kitRedraw();
  },
  tpsetsure: t => {
    kitApplySure(t);
    kitRedraw();
  },
  tpfx: t => {
    const c = C(),
      now = (c.x && c.x.tpfx) || TP_FX_START.slice(),
      id = t.dataset.v;
    c.x = c.x || {};
    c.x.tpfx = now.includes(id) ? now.filter(x => x !== id) : now.concat([id]);
    kitRedraw();
  },
  tppadd: () => {
    const c = C(),
      list = (c.x && c.x.tpppl) || [],
      id = "p" + (list.reduce((n, p) => Math.max(n, +String(p.id).slice(1) || 0), 0) + 1);
    c.x = c.x || {};
    c.x.tpppl = list.concat([{ id, name: list.length ? "Friend " + list.length : "Me", shares: 1 }]);
    kitRedraw();
  },
  tppdel: t => {
    const c = C();
    c.x.tpppl = (c.x.tpppl || []).filter((p, i) => i !== +t.dataset.v);
    kitRedraw();
  },
  tppname: t => {
    const c = C(),
      p = ((c.x && c.x.tpppl) || [])[+t.dataset.k];
    if (!p) return;
    p.name = t.dataset.v;
    kitRedraw();
  },
  tppshare: t => {
    const c = C(),
      p = ((c.x && c.x.tpppl) || [])[+t.dataset.k];
    if (!p) return;
    p.shares = +t.dataset.v;
    kitRedraw();
  },
  tpamong: t => {
    const c = C(),
      ppl = (c.x && c.x.tpppl) || [],
      A = (c.x.tpamong = c.x.tpamong || {}),
      list = A[t.dataset.k] || ppl.map(p => p.id),
      id = t.dataset.v,
      next = list.includes(id) ? list.filter(x => x !== id) : list.concat([id]);
    A[t.dataset.k] = next.length && next.length < ppl.length ? next : null;
    kitRedraw();
  },
});
kitMenu(
  "Trips and the journey",
  "trips",
  "A trip line by line, points or cash, a group split, and the FIRE journey map",
  "career"
);
