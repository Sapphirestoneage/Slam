/* ============================================================================
   SLAM the Game: features/vault.js
   PURPOSE     The card vault ("Is this card right for me?" of the Slam web app, in the game). The cards
               of the player with the month each one was opened, the 5/24 count (new cards in the last
               24 months), the dates worth knowing (an offer deadline, the next yearly fee, a slot
               that comes back), and the welcome offers that fit: the credit band, and the spending an
               offer needs next to the monthly spending of the budget that can go on a card.
   INPUT       data/cards2026.js (window.CARDS2026: the offers, the point values, the 5/24 rule). The
               profile: c.spends, c.spend, c.high, c.caught.score, c.incs, c.work, c.x.vault (the cards
               and the answers). The open sheet (W.kind): vault.
   OUTPUT      Functions: vaultStore, vaultOffer, vaultYm, vaultMonthWords, vaultSlots, vaultCarPay, vaultSpend,
               vaultScore, vaultMe, vaultValue, vaultNet, vaultMonths, vaultFit, vaultMoves, vaultDates,
               vaultCalc, vaultBook, vaultAddHtml, vaultSheet. Actions (ACT): vault, vaultadd,
               vaultpick, vaultdel, vaultundo, vaultmore. Menu: "Card vault".
   DEPENDS ON  data/cards2026.js, core/engine.js, screens/ui.js, features/kit.js.
   RULES       The math is the card plan of the Slam web app (js/math/cardplan.js), with the same words.
               A point is worth its floor value: the lift from moving points to airlines is not counted.
               Airline and hotel points count only when the player says so. While the player has
               high-interest debt, the offers wait (the same rule as treeGate in engine.js): interest
               costs more than an offer pays. The offers are dated, and the screen shows the date and
               says to look at the page of the bank. No card is called good or bad. The player taps.
   ========================================================================= */
const VAULT_SCORE = { none: 0, fair: 1, good: 2, excellent: 3 };
const VAULT_SCORE_OPTS = [
  ["none", "Under 580"],
  ["fair", "580 to 669"],
  ["good", "670 to 739"],
  ["excellent", "740 or more"],
];
const VAULT_BAND = {
  "Under 580": "none",
  "580 to 669": "fair",
  "670 to 739": "good",
  "740 to 799": "excellent",
  "800 or more": "excellent",
};
const VAULT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const VAULT_SPEND = [250, 500, 1000, 1500, 2000, 3000, 4500, 6000];
const VAULT_SHOW = 5;
/* The answers and the cards of the player: c.x.vault.cards is a list of { id, n, bank, ym, fee, biz, months }. */
function vaultStore(c) {
  const S = kitStore(c, "vault");
  if (!Array.isArray(S.cards)) S.cards = [];
  return S;
}
function vaultLib() {
  return typeof CARDS2026 !== "undefined" && CARDS2026
    ? CARDS2026
    : { offers: [], units: {}, rule: { slots: 5, months: 24 } };
}
function vaultOffer(id) {
  return vaultLib().offers.find(o => o.id === id) || null;
}
/* "2025-03" as a count of months, and back to words. */
function vaultYm(s) {
  const p = String(s).split("-").map(Number);
  return p[0] * 12 + (p[1] - 1);
}
function vaultMonthWords(n) {
  return VAULT_MONTHS[((n % 12) + 12) % 12] + " " + Math.floor(n / 12);
}
/* THE 5/24 COUNT, from the months the cards were opened: how many count today, how many slots are left,
   and the month the next slot comes back. Business cards do not count (the rule says so). */
function vaultSlots(cards, today, rule) {
  rule = rule || vaultLib().rule;
  const at = vaultYm((today || todayISO()).slice(0, 7)),
    live = (cards || [])
      .filter(x => x.ym && !(x.biz && rule.businessCardsCount === false))
      .map(x => vaultYm(x.ym))
      .filter(n => n <= at && at - n < rule.months)
      .sort((a, b) => a - b),
    need = live.length - rule.slots + 1,
    key = need > 0 ? live[need - 1] : live[0];
  return {
    used: live.length,
    left: Math.max(0, rule.slots - live.length),
    frees: key == null ? null : vaultMonthWords(key + rule.months),
    freesIn: key == null ? null : key + rule.months - at,
  };
}
/* The spending of one month that can go on a card: each line of the budget but the home (rent or a
   mortgage is seldom paid by card). Before the player has lines, the usual share of the total. */
/* The car loan payments of a month. A card cannot pay a loan, so they are not card spending. The rest of
   "Getting around" (gas, insurance, transit, rides) stays in. */
function vaultCarPay(c) {
  return (c.debts || [])
    .filter(d => d.amt > 0 && /\b(car|auto|truck|vehicle)\b/i.test(d.k || ""))
    .reduce((t, d) => t + (+d.pay || 0), 0);
}
function vaultSpend(c) {
  const rows = c.led && (c.spends || []).length ? c.spends : null,
    all = rows
      ? rsum(rows.filter(r => !/^home$|rent|mortgage/i.test(r.k || "")))
      : Math.round((c.spend || 0) * (1 - SPLIT[0])),
    car = vaultCarPay(c),
    budget = Math.max(0, all - car),
    a = kitValue(c, "vault", "spend", budget);
  return { v: a.v, cf: a.given ? a.cf : rows && isSharp(c, "spend") ? 2 : 1, budget, car, given: a.given };
}
/* The credit band: the answer the game has (c.caught.score), or the answer on this screen. Null: not known. */
function vaultScore(c) {
  const have = c.caught && VAULT_BAND[c.caught.score],
    a = kitValue(c, "vault", "score", null);
  return a.given ? { v: a.v, cf: a.cf } : have ? { v: have, cf: 2, known: true } : { v: null, cf: 1 };
}
/* The player, as the card plan reads them. */
function vaultMe(c, today) {
  const S = vaultStore(c);
  return {
    opened: vaultSlots(S.cards, today).used,
    score: vaultScore(c).v,
    monthlySpend: vaultSpend(c).v,
    heavyDebt: c.high === "yes",
    business:
      c.work === "Self-employed" || (c.incs || []).some(r => /side gigs|my own business/i.test(r.k || "") && r.amt > 0),
    held: S.cards.map(x => x.id),
    programs: kitValue(c, "vault", "programs", "no").v === "yes",
  };
}
/* Dollars an offer is worth, at the floor value of its points. Null when the sources do not agree. */
function vaultValue(o) {
  const u = o && vaultLib().units[o.unit];
  return o && o.amt != null && u ? o.amt * u.v : null;
}
/* The value of the offer less the fee of the first year. */
function vaultNet(o) {
  const v = vaultValue(o);
  return v == null ? null : v - Math.max(0, o.fee1 != null ? o.fee1 : o.fee || 0);
}
/* Whole months of usual card spending to earn the offer. Null when it cannot be reached in its window. */
function vaultMonths(o, monthly) {
  if (!o.spend) return 1;
  if (!(monthly > 0)) return null;
  const need = Math.ceil(o.spend / monthly);
  return need > o.months ? null : need;
}
/* DOES THIS CARD FIT TODAY? level is "fits", "maybe" or "later". reasons are plain sentences. */
function vaultFit(o, me, rule) {
  rule = rule || vaultLib().rule;
  const order = ["later", "maybe", "fits"],
    reasons = [],
    ruled = !rule.issuer || o.bank === rule.issuer;
  let level = 2;
  const cap = (n, text) => {
    level = Math.min(level, n);
    reasons.push(text);
  };
  if (me.heavyDebt) cap(0, "Interest on the debt costs more than any welcome offer pays. Clear that first.");
  if (o.biz && me.business === false) cap(0, "A business card: it needs a business or side income.");
  if (me.opened != null) {
    const left = Math.max(0, rule.slots - me.opened),
      who = rule.issuer || "The issuer";
    if (!ruled)
      reasons.push(
        left <= 0
          ? who + "'s limit does not apply at this bank."
          : "Opening it uses one of your " + left + " " + who + " slots."
      );
    else if (left <= 0) cap(0, (rule.words || "The issuer usually declines") + ".");
    else if (left === 1) reasons.push("This would use your last slot, so the biggest offer you can reach goes first.");
    else reasons.push(left + " slots left.");
  }
  if (o.upTo) reasons.push("This is the most anyone is shown. The offer you see when you apply can be lower.");
  if (o.spendKnown === 0) cap(1, "Today's sources did not say what it needs you to spend.");
  if (me.score != null && o.min != null) {
    const have = VAULT_SCORE[me.score] || 0,
      want = VAULT_SCORE[o.min] || 0;
    if (have < want) cap(0, "Usually needs " + o.min + " credit.");
    else if (want === 0 && have >= 2)
      cap(1, "A starter card: your credit likely qualifies for a card with a bigger offer.");
  }
  if (me.monthlySpend != null && o.spend) {
    const n = vaultMonths(o, me.monthlySpend),
      per = Math.round(o.spend / o.months);
    if (n == null && me.monthlySpend < per / 2)
      cap(
        0,
        "The offer needs about " +
          money(per) +
          " a month for " +
          o.months +
          " months. Spending extra to reach it gives the offer back."
      );
    else if (n == null)
      cap(
        1,
        "The offer needs about " +
          money(per) +
          " a month for " +
          o.months +
          " months, more than your usual. It works only next to a planned big bill."
      );
    else reasons.push("Your usual spending covers the offer.");
  }
  if (vaultNet(o) == null) cap(1, "The offer is not settled between sources, so no dollar value is counted.");
  return { level: order[level], reasons, net: vaultNet(o) };
}
/* THE OFFERS OPEN FROM HERE, the biggest first-year value first. Empty while high-interest debt is there. */
function vaultMoves(c, today) {
  today = today || todayISO();
  const L = vaultLib(),
    me = vaultMe(c, today),
    slots = Math.max(0, L.rule.slots - me.opened);
  if (me.heavyDebt) return [];
  return L.offers
    .filter(o => {
      const u = L.units[o.unit];
      if (me.held.includes(o.id) || !(o.amt > 0) || (o.ends && o.ends < today)) return false;
      if (slots <= 0 && o.bank === L.rule.issuer) return false;
      return !!u && (u.cash || me.programs);
    })
    .map(o => ({ o, fit: vaultFit(o, me), months: vaultMonths(o, me.monthlySpend), net: vaultNet(o) }))
    .filter(m => m.fit.level !== "later" && m.months != null)
    .sort((a, b) => b.net - a.net);
}
/* The dates worth knowing for the cards in hand, the soonest first. */
function vaultDates(cards, today, rule) {
  rule = rule || vaultLib().rule;
  const at = vaultYm((today || todayISO()).slice(0, 7)),
    out = [];
  (cards || []).forEach(x => {
    if (!x.ym) return;
    const o = vaultYm(x.ym);
    if (x.months && o + x.months >= at)
      out.push({ kind: "offer", n: o + x.months, text: x.n + ": finish the spending of the welcome offer" });
    if (x.fee > 0) {
      let n = o + 12;
      while (n < at) n += 12;
      out.push({
        kind: "fee",
        n,
        text: x.n + ": the " + money(x.fee) + " yearly fee posts. Look the month before at what the card gave back",
      });
    }
    if (o + rule.months > at && !(x.biz && rule.businessCardsCount === false))
      out.push({
        kind: "slot",
        n: o + rule.months,
        text: x.n + " stops counting toward the " + rule.slots + " card limit",
      });
  });
  return out.sort((a, b) => a.n - b.n).map(d => Object.assign(d, { when: vaultMonthWords(d.n) }));
}
function vaultCalc(c, today) {
  const S = vaultStore(c),
    moves = vaultMoves(c, today),
    spend = vaultSpend(c),
    score = vaultScore(c);
  return {
    cards: S.cards,
    slots: vaultSlots(S.cards, today),
    dates: vaultDates(S.cards, today),
    fees: S.cards.reduce((a, x) => a + (x.fee || 0), 0),
    spend,
    score,
    me: vaultMe(c, today),
    moves,
    best: moves[0] || null,
    st: kitState([spend, score]),
  };
}
function vaultBook(c) {
  const V = vaultCalc(c),
    L = vaultLib(),
    b = V.best,
    rows = [
      {
        id: "vt_spend",
        label: "Spending a month that can go on a card",
        v: V.spend.v,
        note: "Your budget without the home line and car loan payments, or your answer",
      },
      {
        id: "vt_used",
        label: "Cards opened in the last 24 months",
        v: V.slots.used,
        note: "From your card vault. Business cards do not count",
      },
      {
        id: "vt_limit",
        label: "The limit of the 5/24 rule",
        v: L.rule.slots,
        note: L.rule.source + " (" + L.rule.date + ")",
      },
      { id: "vt_left", label: "Slots left", v: V.slots.left, f: "=MAX(0,{vt_limit}-{vt_used})" },
      { id: "vt_fees", label: "Yearly fees of your cards", v: V.fees, note: "From your card vault" },
    ];
  if (b)
    rows.push(
      {
        id: "vt_value",
        label: "Biggest offer that fits: its value",
        v: vaultValue(b.o),
        note: b.o.bank + " " + b.o.n + ", as of " + L.asOf + ". Points at their floor value",
      },
      { id: "vt_fee1", label: "Its fee in the first year", v: b.o.fee1 != null ? b.o.fee1 : b.o.fee || 0 },
      { id: "vt_net", label: "Its first-year value after the fee", v: b.net, f: "={vt_value}-{vt_fee1}" },
      { id: "vt_need", label: "Spending the offer needs", v: b.o.spend },
      {
        id: "vt_per",
        label: "That spending for each month of its window",
        v: Math.round(b.o.spend / b.o.months),
        f: "=ROUND({vt_need}/" + b.o.months + ",0)",
      }
    );
  return { title: "Card vault", rows };
}
/* The steps to add a card, all taps: the bank, the card, the year, the month. */
function vaultAddHtml(c) {
  const A = W.o.add,
    L = vaultLib(),
    y0 = +todayISO().slice(0, 4),
    held = vaultStore(c).cards.map(x => x.id),
    chip = (k, v, label) =>
      `<button class="chip" data-a="vaultpick" data-k="${k}" data-v="${esc(String(v))}">${esc(label)}</button>`;
  let body;
  if (!A.bank)
    body = `<div class="small"><b>Which bank?</b></div><div class="chips">${L.offers
      .map(o => o.bank)
      .filter((b, i, a) => a.indexOf(b) === i)
      .map(b => chip("bank", b, b))
      .join("")}</div>`;
  else if (!A.id)
    body = `<div class="small"><b>Which card?</b></div><div class="stack" style="gap:6px">${L.offers
      .filter(o => o.bank === A.bank && !held.includes(o.id))
      .map(
        o =>
          `<button class="rowbtn" data-a="vaultpick" data-k="id" data-v="${esc(o.id)}"><span class="small">${esc(o.n)}${o.biz ? " (business)" : ""}</span><span class="tiny muted">${o.fee ? money(o.fee) + " a year" : "No yearly fee"} ›</span></button>`
      )
      .join(
        ""
      )}<button class="rowbtn" data-a="vaultpick" data-k="id" data-v="other"><span class="small">A different ${esc(A.bank)} card</span><span class="caret">›</span></button></div>`;
  else if (!A.y)
    body = `<div class="small"><b>Which year did you open it?</b></div><div class="chips">${[y0, y0 - 1, y0 - 2].map(y => chip("y", y, String(y))).join("")}${chip("y", "old", "Before " + (y0 - 2))}</div>`;
  else
    body = `<div class="small"><b>Which month of ${A.y}?</b></div><div class="chips">${VAULT_MONTHS.map((m, i) => chip("m", i + 1, m)).join("")}</div>`;
  return `<div class="tile stack vaultadd" style="gap:8px"><div class="row between"><b class="small">Add a card you have ${kitInfo("vt_open")}</b><button class="ghost slim" data-a="vaultadd" data-v="stop">Cancel</button></div>${body}</div>`;
}
function vaultSheet() {
  const c = C(),
    L = vaultLib(),
    V = vaultCalc(c),
    o = W.o || {},
    R = L.rule,
    scoreAns = kitValue(c, "vault", "score", V.score.v || "good");
  let h =
    head("Money", "Card vault") +
    `<div class="small muted">Your cards, the dates worth knowing, and the welcome offers that fit your credit and your budget. ${kitInfo("vt_vault")}</div>`;
  h += kitColumns([
    {
      title: "New cards in 24 months",
      big: V.slots.used + " of " + R.slots,
      rows: [
        ["Slots left " + kitInfo("vt_524"), String(V.slots.left)],
        V.slots.frees ? ["Next slot comes back", V.slots.frees] : null,
      ],
      foot: "Cards you opened at any bank. Business cards do not count.",
    },
    {
      title: "Spending that can go on a card",
      big: money(V.spend.v) + " a month",
      guess: V.spend.cf <= 1,
      rows: [["From your budget " + kitInfo("vt_spend"), money(V.spend.budget)]],
      foot: "Your budget without the home line and car loan payments. Gas, insurance and rides stay in.",
    },
  ]);
  /* the cards in hand */
  h += `<div class="row between small"><b>Your cards (${V.cards.length})</b>${kitInfo("vt_open")}</div>`;
  h += V.cards.length
    ? `<div class="stack" style="gap:6px">${V.cards
        .map(
          (x, i) =>
            `<div class="tile row between" style="gap:8px"><span style="min-width:0"><b class="small">${esc(x.bank + " " + x.n)}</b><div class="tiny muted">${x.ym ? "Opened " + vaultMonthWords(vaultYm(x.ym)) : "Opened more than 2 years ago"}${x.fee ? " · " + money(x.fee) + " a year" : " · no yearly fee"}</div></span><button class="ghost slim" data-a="vaultdel" data-v="${i}">Remove</button></div>`
        )
        .join("")}</div>`
    : `<div class="tile small muted">No cards here yet. Add the cards you have, so the count and the dates are yours.</div>`;
  if (o.gone)
    h += `<div class="tile row between small" style="gap:8px"><span>Removed ${esc(o.gone.x.n)}.</span><button class="ghost slim" data-a="vaultundo">Put it back</button></div>`;
  h += o.add
    ? vaultAddHtml(c)
    : `<button class="ghost wide" data-a="vaultadd" data-v="go">Add a card you have</button>`;
  if (V.dates.length)
    h += `<details class="ledg" open><summary>Dates worth knowing (${V.dates.length})</summary><div class="inner">${igRows(V.dates.map(d => [esc(d.text), d.when]))}</div></details>`;
  /* the offers */
  h += `<div class="row between small" style="margin-top:4px"><b>Welcome offers that fit</b><span class="row" style="gap:6px">${kitPill(V.st)}${kitInfo("vt_offer")}</span></div>`;
  if (V.me.heavyDebt)
    h += `<div class="tile small vaultwait"><b>Offers wait for now.</b> Interest on your high-interest debt costs more than any welcome offer pays. The offers open when that debt is gone.<button class="ghost wide slim" style="margin-top:8px" data-a="debtplan">Open the debt plan</button></div>`;
  else if (!V.moves.length)
    h += `<div class="tile small muted">No offer fits your credit, your slots and your usual spending today. That can change when a slot comes back or an answer below changes.</div>`;
  else
    h +=
      `<div class="stack" style="gap:6px">${V.moves
        .slice(0, o.more ? 40 : VAULT_SHOW)
        .map(
          m =>
            `<details class="ledg vaultoffer"><summary><span class="row between" style="gap:8px;flex:1;min-width:0"><span style="min-width:0"><b class="small">${esc(m.o.bank + " " + m.o.n)}</b><div class="tiny muted">${m.fit.level === "fits" ? "Fits today" : "Maybe"} · spend ${money(m.o.spend)} in ${m.o.months} months</div></span><b class="${V.st === "Guess" ? "guess" : ""}">${money(m.net)}</b></span></summary><div class="inner stack" style="gap:4px">${igRows(
              [
                ["The offer " + kitInfo("vt_offer"), esc(m.o.amt.toLocaleString() + " " + L.units[m.o.unit].n)],
                ["Its value " + kitInfo("vt_floor"), money(vaultValue(m.o))],
                ["Fee in the first year", money(m.o.fee1 != null ? m.o.fee1 : m.o.fee || 0)],
                ["First-year value after the fee " + kitInfo("vt_net"), money(m.net)],
                ["Months of your usual spending", String(m.months)],
              ]
            )}${m.fit.reasons.map(r => `<div class="tiny muted">${esc(r)}</div>`).join("")}</div></details>`
        )
        .join("")}</div>` +
      (V.moves.length > VAULT_SHOW && !o.more
        ? `<button class="ghost wide slim" data-a="vaultmore">Show all ${V.moves.length} offers</button>`
        : "");
  h += `<div class="tiny muted">Offers as of ${esc(L.asOf)}, from review sites. Offers change each month: look at the page of the bank before you apply.</div>`;
  /* the answers, all taps */
  h += kitAsk(c, "vault", "score", "Your credit score", VAULT_SCORE_OPTS, scoreAns.v, {
    term: "vt_score",
    help: V.score.known ? "From your answer in the game. Tap to change it here." : "Free in most bank and card apps.",
  });
  h += kitAsk(
    c,
    "vault",
    "spend",
    "How much can you put on a card each month?",
    VAULT_SPEND.map(v => [v, money(v)]),
    V.spend.budget,
    {
      term: "vt_spend",
      typed: true,
      help: "The game starts from your budget: " + money(V.spend.budget) + " a month without the home line.",
    }
  );
  h += kitAsk(
    c,
    "vault",
    "programs",
    "Count airline and hotel points too?",
    [
      ["no", "No, cash and bank points only"],
      ["yes", "Yes, I would use them"],
    ],
    "no",
    { term: "vt_program" }
  );
  h += mathBox([
    "5/24: " + R.words + ". Source: " + R.source + " (" + R.date + ").",
    "You opened " +
      V.slots.used +
      " in the last " +
      R.months +
      " months, so " +
      V.slots.left +
      " of " +
      R.slots +
      " slots are left.",
    "The value of an offer = the points times the floor value of one point (1 cent for cash and for most bank points). The lift from moving points to an airline is not counted.",
    "First-year value = the value of the offer - the fee of the first year.",
    "An offer fits your budget when its spending divides into your monthly card spending within its months: " +
      money(V.spend.v) +
      " a month.",
    "Score bands: good from " +
      L.scoreBands.good +
      ", excellent from " +
      L.scoreBands.excellent +
      ". " +
      L.scoreBands.source +
      ".",
    "Offers: " + L.source,
  ]);
  return h;
}
kitTerms({
  vt_vault: [
    "Card vault",
    "One place for the cards you have: when each was opened, when its fee posts, and what a new card would mean for your slots and your budget.",
  ],
  vt_524: [
    "5/24",
    "A rule that Chase is widely reported to use: it usually declines a person who opened 5 or more cards, at any bank, in the last 24 months. Chase does not publish it.",
  ],
  vt_open: [
    "Month opened",
    "The month you were approved for the card. It is on your first statement and in your credit report.",
  ],
  vt_offer: [
    "Welcome offer",
    "Points or cash that a bank gives a new cardholder who spends a set amount in the first months. It is also called a sign-up bonus.",
  ],
  vt_floor: ["Floor value", "The least a point is worth: what you get when you take it as cash or a statement credit."],
  vt_net: ["First-year value", "The value of the welcome offer minus the yearly fee you pay in the first year."],
  vt_spend: [
    "Card spending",
    "The part of your monthly spending that a card can pay for: food, getting around, bills, fun. Rent or a mortgage is usually not paid by card.",
  ],
  vt_score: [
    "Credit score",
    "A number from 300 to 850 that lenders use. Most cards with a welcome offer look for 670 or more.",
  ],
  vt_program: [
    "Airline and hotel points",
    "Points that only one airline or hotel takes. They are worth something only when you would fly or stay with that company.",
  ],
});
kitScreen(
  "vault",
  "Card vault",
  "Your cards with their dates, your 5/24 count, and the welcome offers that fit your credit and your budget.",
  "Nothing here is advice to open a card. Offers wait while you have high-interest debt."
);
Object.assign(ACT, {
  vault: () => {
    W = { kind: "vault", o: {} };
    sheet(vaultSheet);
  },
  vaultadd: t => {
    if (!W || W.kind !== "vault") return;
    W.o.add = t.dataset.v === "go" ? {} : null;
    drawSheet();
  },
  /* One tap of the steps: the bank, the card, the year, the month. The last tap keeps the card. */
  vaultpick: t => {
    if (!W || W.kind !== "vault" || !W.o.add) return;
    const A = W.o.add,
      k = t.dataset.k,
      v = t.dataset.v;
    A[k] = v;
    if ((k === "y" && v === "old") || k === "m") {
      const c = C(),
        lib = vaultOffer(A.id),
        ym = A.y === "old" ? null : A.y + "-" + String(A.m).padStart(2, "0");
      vaultStore(c).cards.push({
        id: lib ? lib.id : A.bank + " other " + Date.now(),
        n: lib ? lib.n : "card",
        bank: A.bank,
        ym,
        fee: lib ? lib.fee || 0 : 0,
        biz: lib && lib.biz ? 1 : 0,
        months: lib ? lib.months : 0,
      });
      W.o.add = null;
      W.o.gone = null;
      kitRedraw();
      return;
    }
    drawSheet();
  },
  vaultdel: t => {
    if (!W || W.kind !== "vault") return;
    const S = vaultStore(C()),
      i = +t.dataset.v;
    if (!S.cards[i]) return;
    W.o.gone = { i, x: S.cards.splice(i, 1)[0] };
    kitRedraw();
  },
  vaultundo: () => {
    if (!W || W.kind !== "vault" || !W.o.gone) return;
    vaultStore(C()).cards.splice(W.o.gone.i, 0, W.o.gone.x);
    W.o.gone = null;
    kitRedraw();
  },
  vaultmore: () => {
    if (!W || W.kind !== "vault") return;
    W.o.more = true;
    drawSheet();
  },
});
kitMenu("Card vault", "vault", "Your cards, your 5/24 count, and the offers that fit your budget", "ledger");
