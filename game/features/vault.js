/* ============================================================================
   SLAM the Game: features/vault.js
   PURPOSE     The card vault ("Is this card right for me?" of the Slam web app, in the game). The cards
               of the player with the month each one was opened, the 5/24 count (new cards in the last
               24 months), the dates worth knowing (an offer deadline, the next yearly fee, a slot
               that comes back), and the welcome offers that fit: the credit band, and the spending an
               offer needs next to the monthly spending of the budget that can go on a card.
   INPUT       data/cardtemplate.js (the shape of one card). data/cards2026.js (window.CARDS2026: the
               cards, the point values, the 5/24 rule). window.CARDS_EXTRA (the cards that the admin
               added: the database table card_library, with a copy in the browser). The
               profile: c.spends, c.spend, c.high, c.caught.score, c.incs, c.work, c.x.vault (the cards
               and the answers). The open sheet (W.kind): vault, vaultcard.
   OUTPUT      Functions: vaultStore, vaultOffer, vaultYm, vaultMonthWords, vaultSlots, vaultCarPay, vaultSpend,
               vaultScore, vaultMe, vaultValue, vaultNet, vaultMonths, vaultFit, vaultMoves, vaultDates,
               vaultCalc, vaultBook, vaultAddHtml, vaultSheet, vaultLib, vaultExtraSet, vaultLoadExtra,
               vaultCredits, vaultCred, vaultCreditsUsed, vaultFee1, vaultCatName, vaultCardParts,
               vaultCardSheet, vaultCatLabel, vaultCatStart, vaultCats, vaultPct, vaultPointValue,
               vaultBrands, vaultSpendFor, vaultShareWords, vaultMoreHtml, vaultEarn, vaultBest, vaultBestHtml, vaultRateWords, vaultPickWords. Actions (ACT):
               vault, vaultadd, vaultpick, vaultdel, vaultundo, vaultmore, vaultcard, vaulthave,
               vaultcred, vaultcredall, vaultcats.
               Menu: "Card vault".
   DEPENDS ON  data/cardtemplate.js, data/cards2026.js, core/engine.js, screens/ui.js, features/kit.js,
               account/supa.js (SUPA.sb, only to read the table).
   RULES       The math is the card plan of the Slam web app (js/math/cardplan.js), with the same words.
               A point is worth its floor value: the lift from moving points to airlines is not counted.
               Airline and hotel points count only when the player says so. While the player has
               high-interest debt, the offers wait (the same rule as treeGate in engine.js): interest
               costs more than an offer pays. The offers are dated, and the screen shows the date and
               says to look at the page of the bank. No card is called good or bad. The player taps.
               A yearly credit of a card counts only when the player marked it Yes (c.x.vault.cred).
               The best card for each line uses cardEarnYear of cardtemplate.js and no welcome offer. A missing table or an
               error of the database leaves the library of the file in place.
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
/* The cards that the admin added (the table card_library). vaultLoadExtra() fills it. */
window.CARDS_EXTRA = window.CARDS_EXTRA || { cards: [], at: null };
const VAULT = { lib: null, src: null, n: -1, at: null, asked: false };
const VAULT_TABLE = "card_library";
const VAULT_CACHE = "slam_cards_extra";
/* THE LIBRARY: the cards of the file, with the cards of the admin on top (cardMerge in cardtemplate.js: the
   same id takes the place of the file card, and a hidden card is left out). */
function vaultLib() {
  const base =
      typeof CARDS2026 !== "undefined" && CARDS2026
        ? CARDS2026
        : { offers: [], units: {}, rule: { slots: 5, months: 24 }, scoreBands: {} },
    X = window.CARDS_EXTRA || { cards: [] },
    ex = X.cards || [];
  if (!ex.length || typeof cardMerge !== "function") return base;
  if (VAULT.lib && VAULT.src === ex && VAULT.n === ex.length && VAULT.at === X.at) return VAULT.lib;
  VAULT.src = ex;
  VAULT.n = ex.length;
  VAULT.at = X.at;
  VAULT.lib = Object.assign({}, base, { offers: cardMerge(base.offers, ex) });
  return VAULT.lib;
}
/* Keep the rows of the table ({ id, data }) as clean cards. */
function vaultExtraSet(rows, at) {
  window.CARDS_EXTRA.cards = (rows || [])
    .filter(r => r && r.id && r.data && typeof r.data === "object")
    .map(r => cardClean(Object.assign({}, r.data, { id: r.id })));
  window.CARDS_EXTRA.at = at || null;
  VAULT.lib = null;
}
/* READ THE CARDS OF THE ADMIN. First the copy in the browser (it works with no connection), then the table.
   A missing table or an error changes nothing: the game keeps the library of the file. With no database
   client (the tests, the demo) this function reads the copy only. */
function vaultLoadExtra() {
  try {
    const raw = typeof localStorage !== "undefined" && localStorage.getItem ? localStorage.getItem(VAULT_CACHE) : null,
      old = raw ? JSON.parse(raw) : null;
    if (old && Array.isArray(old.rows) && !window.CARDS_EXTRA.at) vaultExtraSet(old.rows, old.at);
  } catch (e) {
    report(e, "vault.js: vaultLoadExtra (the copy)");
  }
  if (typeof SUPA === "undefined" || !SUPA || !SUPA.sb || typeof SUPA.sb.from !== "function") return null;
  VAULT.asked = true;
  try {
    return Promise.resolve(SUPA.sb.from(VAULT_TABLE).select("id,data"))
      .then(r => {
        if (!r || r.error || !Array.isArray(r.data)) {
          if (r && r.error) report(r.error, "vault.js: vaultLoadExtra (the table)");
          return;
        }
        const at = new Date().toISOString();
        vaultExtraSet(r.data, at);
        try {
          localStorage.setItem(VAULT_CACHE, JSON.stringify({ at, rows: r.data }));
        } catch (e) {
          report(e, "vault.js: vaultLoadExtra (keep the copy)");
        }
        if (W && (W.kind === "vault" || W.kind === "vaultcard")) drawSheet();
      })
      .catch(e => report(e, "vault.js: vaultLoadExtra (the table)"));
  } catch (e) {
    report(e, "vault.js: vaultLoadExtra");
    return null;
  }
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
    cred: vaultCred(c),
  };
}
/* Dollars an offer is worth, at the floor value of its points. Null when the sources do not agree. */
function vaultValue(o) {
  const u = o && vaultLib().units[o.unit];
  return o && o.amt != null && u ? o.amt * u.v : null;
}
/* The yearly credits of a card, in dollars, when the player uses each one. */
function vaultCredits(o) {
  return ((o && o.credits) || []).reduce((t, k) => t + (+k.value || 0), 0);
}
/* The credits that the player would use: c.x.vault.cred[card id][number of the credit] is true. */
function vaultCred(c) {
  const S = vaultStore(c);
  if (!S.cred || typeof S.cred !== "object") S.cred = {};
  return S.cred;
}
/* The dollars a year of the credits of one card that the player marked "Yes". cred is vaultCred(c). */
function vaultCreditsUsed(cred, o) {
  const m = (cred && o && cred[o.id]) || {};
  return ((o && o.credits) || []).reduce((t, k, i) => t + (m[i] ? +k.value || 0 : 0), 0);
}
/* The fee of the first year. used is the dollars of credits that come off it (true: all the credits). The
   fee does not go under 0. */
function vaultFee1(o, used) {
  const off = used === true ? vaultCredits(o) : +used || 0;
  return Math.max(0, (o.fee1 != null ? o.fee1 : o.fee || 0) - off);
}
/* The value of the offer less the fee of the first year. Credits count only when the player marked them. */
function vaultNet(o, used) {
  const v = vaultValue(o);
  return v == null ? null : v - vaultFee1(o, used);
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
  if (o.spendKnown === 0 || o.spendKnown === false) cap(1, "Today's sources did not say what it needs you to spend.");
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
  return { level: order[level], reasons, net: vaultNet(o, vaultCreditsUsed(me.cred, o)) };
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
    .map(o => ({
      o,
      fit: vaultFit(o, me),
      months: vaultMonths(o, me.monthlySpend),
      net: vaultNet(o, vaultCreditsUsed(me.cred, o)),
    }))
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
      { id: "vt_fee1", label: "Its fee in the first year", v: vaultFee1(b.o, false) },
      {
        id: "vt_credit",
        label: "Its yearly credits that you count",
        v: vaultCreditsUsed(V.me.cred, b.o),
        note: "0 until you mark a credit of the card with Yes",
      },
      {
        id: "vt_net",
        label: "Its first-year value after the fee",
        v: b.net,
        f: "={vt_value}-MAX(0,{vt_fee1}-{vt_credit})",
      },
      { id: "vt_need", label: "Spending the offer needs", v: b.o.spend },
      {
        id: "vt_per",
        label: "That spending for each month of its window",
        v: Math.round(b.o.spend / b.o.months),
        f: "=ROUND({vt_need}/" + b.o.months + ",0)",
      }
    );
  const B = vaultBest(c);
  B.K.rows.forEach(r =>
    rows.push({
      id: "vt_c_" + r.k,
      label: "Card spending a month: " + r.label,
      v: r.v,
      note: r.given ? "Your answer" : "A guess from your budget",
    })
  );
  B.K.more.forEach(m =>
    rows.push({
      id: "vt_x_" + m.k,
      label: "Card spending a month: " + m.label + (m.brand ? " (" + m.brand + ")" : ""),
      v: m.v,
      note: "Part of " + VAULT_POOL[VAULT_MORE.find(x => x.k === m.k).pool] + ", not added to the sum",
    })
  );
  rows.push(
    {
      id: "vt_csum",
      label: "Card spending a month in all categories",
      v: B.K.sum,
      f: "=" + B.K.rows.map(r => "{vt_c_" + r.k + "}").join("+"),
    },
    {
      id: "vt_gross",
      label: "What your cards earn a year on this spending",
      v: Math.round(B.gross * 100) / 100,
      note: "Worked out by the game: each category on your card that earns most there, with its limits",
    },
    { id: "vt_heldfees", label: "Yearly fees of those cards, less the credits you count", v: B.fees },
    {
      id: "vt_yours",
      label: "What your cards earn a year after fees",
      v: Math.round(B.gross * 100) / 100 - B.fees,
      f: "={vt_gross}-{vt_heldfees}",
    }
  );
  if (B.single)
    rows.push({
      id: "vt_single",
      label: "The best single card you do not hold: a year after its fee",
      v: Math.round(B.single.net * 100) / 100,
      note: B.single.o.bank + " " + B.single.o.n + ". Worked out by the game",
    });
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
          `<button class="rowbtn" data-a="vaultpick" data-k="id" data-v="${esc(o.id)}"><span class="small">${esc(o.n)}${o.biz ? " (business)" : ""}</span><span class="tiny muted">${o.fee ? money(o.fee) + " a year" : "No yearly fee"} <i class=chev aria-hidden=true></i></span></button>`
      )
      .join(
        ""
      )}<button class="rowbtn" data-a="vaultpick" data-k="id" data-v="other"><span class="small">A different ${esc(A.bank)} card</span><span class="caret"><i class=chev aria-hidden=true></i></span></button></div>`;
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
            `<div class="tile row between" style="gap:8px"><span style="min-width:0"><b class="small">${esc(x.bank + " " + x.n)}</b><div class="tiny muted">${x.ym ? "Opened " + vaultMonthWords(vaultYm(x.ym)) : "Opened more than 2 years ago"}${x.fee ? " · " + money(x.fee) + " a year" : " · no yearly fee"}</div></span><span class="row" style="gap:6px;flex:none">${vaultOffer(x.id) ? `<button class="ghost slim" data-a="vaultcard" data-v="${esc(x.id)}">Details <i class=chev aria-hidden=true></i></button>` : ""}<button class="ghost slim" data-a="vaultdel" data-v="${i}">Remove</button></span></div>`
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
                ["Fee in the first year", money(vaultFee1(m.o, false))],
                vaultCredits(m.o) > 0
                  ? [
                      "Yearly credits you count " + kitInfo("vt_credit"),
                      money(vaultCreditsUsed(V.me.cred, m.o)) + " of " + money(vaultCredits(m.o)),
                    ]
                  : null,
                ["First-year value after the fee " + kitInfo("vt_net"), money(m.net)],
                ["Months of your usual spending", String(m.months)],
              ]
            )}${m.fit.reasons.map(r => `<div class="tiny muted">${esc(r)}</div>`).join("")}<button class="ghost slim" data-a="vaultcard" data-v="${esc(m.o.id)}">See the whole card <i class=chev aria-hidden=true></i></button></div></details>`
        )
        .join("")}</div>` +
      (V.moves.length > VAULT_SHOW && !o.more
        ? `<button class="ghost wide slim" data-a="vaultmore">Show all ${V.moves.length} offers</button>`
        : "");
  h += `<div class="tiny muted">Offers as of ${esc(L.asOf)}, from review sites. Offers change each month: look at the page of the bank before you apply.</div>`;
  h += vaultBestHtml(c);
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
    "First-year value = the value of the offer - the fee of the first year. A yearly credit comes off the fee only when you marked it Yes on the sheet of the card, and the fee does not go under $0.",
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
    "Fees, earn rates, credits and cover: " + (L.cardsSource || "each card names its source") + ".",
    "Best card for each line: a year of your spending in each category times the rate of the card, with its limits and its picks. One point counts at its floor value, and 1% is 1 cent for each dollar. Your cards: each line goes on your card that earns most there, less the yearly fees. One card you do not hold: all lines on that card, less its yearly fee. Rates for one airline, one hotel brand, one store or the travel site of a bank are not counted, because your lines do not say where you buy.",
    "Amazon and Whole Foods comes out of Online shopping, and delivery apps out of Dining (then out of Everything else). Entertainment and home improvement come out of Everything else. A card with no rate for such a line earns its rate for the line it came from.",
    "One limit for several categories: when a card says a limit is combined, the game counts one limit for those categories together. The category with the highest rate uses the limit first.",
    "Travel brands, stores and bonus categories: each amount is part of a line you already have, so the total does not change. Flights with one airline, stays with one hotel brand and travel booked with the bank come out of Travel (and out of Everything else when Travel is not enough). One store and the bonus categories come out of Everything else. The rate of an airline card, a hotel card or a store card counts only for the brand you picked. On each other card that spending earns the travel rate of the card, or its rate for everything else.",
    "Bonus categories of a quarter: a card with such a rate earns it on your amount, up to its limit for each quarter. The categories change each quarter and you must turn them on with the bank, so this number is a guess of how much of your spending fits.",
    "Where the categories start: your card spending, split by your own lines. Food is 60% groceries and 40% dining. Getting around, less car loan payments, is 50% gas and 15% transit. Bills is 25% phone and 10% streaming. Fun is 25% online shopping, 15% travel and 5% drugstores. The rest is Everything else. These shares are guesses until you tap your own numbers.",
  ]);
  return h;
}
/* ---------- the best card for each spending line ---------- */
const VAULT_CATS = [
  "dining",
  "groceries",
  "gas",
  "transit",
  "travel",
  "streaming",
  "online",
  "drugstore",
  "phone",
  "other",
];
const VAULT_CAT_CHIPS = [0, 50, 100, 200, 300, 500, 800, 1200];
/* The shares of each line of the profile that go to a card category. The rest of a line is "other". */
const VAULT_SHARE = {
  food: { groceries: 0.6, dining: 0.4 },
  around: { gas: 0.5, transit: 0.15 },
  bills: { phone: 0.25, streaming: 0.1 },
  fun: { online: 0.25, travel: 0.15, drugstore: 0.05 },
};
function vaultCatLabel(k) {
  return k === "other" ? "Everything else" : vaultCatName(k);
}
/* WHERE THE CATEGORIES START: the card spending of a month (vaultSpend), split by the lines of the profile.
   Each amount is rounded to $10, and "other" takes the rest, so the start adds up to the card spending. */
function vaultCatStart(c) {
  const sp = vaultSpend(c),
    rows = c.led && (c.spends || []).length ? c.spends : null,
    line = (re, i) => (rows ? rsum(rows.filter(r => re.test(r.k || ""))) : (c.spend || 0) * SPLIT[i]),
    L = {
      food: line(/^food$/i, 1),
      around: Math.max(0, line(/^getting around$/i, 2) - sp.car),
      bills: line(/^bills/i, 3),
      fun: line(/^fun/i, 4),
    },
    all = rows
      ? Math.max(0, rsum(rows.filter(r => !/^home$|rent|mortgage/i.test(r.k || ""))) - sp.car)
      : L.food + L.around + L.bills + L.fun,
    k = all > 0 ? sp.v / all : 0,
    out = {};
  let named = 0;
  Object.keys(VAULT_SHARE).forEach(g =>
    Object.keys(VAULT_SHARE[g]).forEach(cat => {
      out[cat] = Math.round((L[g] * VAULT_SHARE[g][cat] * k) / 10) * 10;
      named += out[cat];
    })
  );
  out.other = Math.max(0, Math.round(sp.v - named));
  return out;
}
/* THE SECOND GROUP OF LINES: travel brands, stores and bonus categories. Each line is part of one line of
   the first group (pool), so the total does not change: flights, hotels and travel booked with the bank
   come out of Travel, and a store and the bonus categories of a quarter come out of Everything else. */
const VAULT_POOL = {
  travel: "Travel",
  online: "Online shopping",
  dining: "Dining and takeout",
  other: "Everything else",
};
const VAULT_MORE = [
  {
    k: "airline",
    pool: "travel",
    brand: "Which airline?",
    label: "One airline, booked direct",
    chips: [0, 50, 100, 200, 400, 800],
  },
  {
    k: "hotel",
    pool: "travel",
    brand: "Which hotel brand?",
    label: "One hotel brand, booked direct",
    chips: [0, 50, 100, 200, 400, 800],
  },
  { k: "travelPortal", pool: "travel", label: "Travel booked with the bank", chips: [0, 50, 100, 200, 400, 800] },
  { k: "hotelPortal", pool: "travel", label: "Hotels booked with the bank", chips: [0, 50, 100, 200, 400, 800] },
  {
    k: "store",
    pool: "other",
    brand: "Which store?",
    label: "One store with its own card",
    chips: [0, 50, 100, 200, 400, 800],
  },
  { k: "rotating", pool: "other", label: "The bonus categories of a quarter", chips: [0, 100, 250, 500] },
  { k: "amazon", pool: "online", label: "Amazon and Whole Foods", chips: [0, 50, 100, 200, 400, 800] },
  { k: "delivery", pool: "dining", label: "Delivery apps", chips: [0, 50, 100, 200, 400, 800] },
  { k: "entertainment", pool: "other", label: "Entertainment", chips: [0, 50, 100, 200, 400, 800] },
  { k: "home", pool: "other", label: "Home improvement", chips: [0, 50, 100, 200, 400, 800] },
];
/* The brands that the cards of the library have a rate for: kind is airline, hotel or store. */
function vaultBrands(kind) {
  const out = [];
  vaultLib().offers.forEach(o => {
    const b = o.brand && o.brand[kind];
    if (b && !out.includes(b) && (o.earn.rates || []).some(r => r.cat === kind)) out.push(b);
  });
  return out.sort();
}
/* The card spending by category: the answers of the player, or the start as a Guess. sum is shown next to
   the card spending of the budget. spend is { category: dollars a month } for cardEarnYear, with the lines of
   the second group taken out of their pool (more: [{ k, v, want, brand }]). lines is each line to show. */
function vaultCats(c) {
  const start = vaultCatStart(c),
    sp = vaultSpend(c),
    rows = VAULT_CATS.map(k => {
      const a = kitValue(c, "vault", "cat_" + k, start[k] || 0);
      return { k, label: vaultCatLabel(k), v: +a.v || 0, cf: a.given ? a.cf : 1, given: a.given, start: start[k] || 0 };
    }),
    sum = rows.reduce((t, r) => t + r.v, 0),
    spend = {},
    pool = {};
  Object.keys(VAULT_POOL).forEach(k => (pool[k] = rows.find(r => r.k === k).v));
  /* a line takes its dollars from its pool. What Travel cannot give comes from Everything else. A line
     cannot take more than the two hold. */
  const more = VAULT_MORE.map(m => {
    const a = kitValue(c, "vault", "cat_" + m.k, 0),
      want = Math.max(0, +a.v || 0),
      first = Math.min(want, pool[m.pool]);
    pool[m.pool] -= first;
    const second = m.pool !== "other" ? Math.min(want - first, pool.other) : 0;
    pool.other -= second;
    return {
      k: m.k,
      label: m.label,
      v: first + second,
      want,
      cf: a.given ? a.cf : 1,
      given: a.given,
      brand: m.brand ? String(kitValue(c, "vault", "brand_" + m.k, "").v || "") : "",
    };
  });
  rows.forEach(r => {
    const v = r.k in pool ? pool[r.k] : r.v;
    if (r.k !== "other" && v > 0) spend[r.k] = v;
  });
  const lines = rows
    .map(r => ({ k: r.k, label: r.label, v: r.k in pool ? pool[r.k] : r.v }))
    .concat(more.filter(m => m.v > 0).map(m => ({ k: m.k, label: m.label + (m.brand ? ": " + m.brand : ""), v: m.v })));
  return {
    rows,
    sum,
    budget: sp.v,
    diff: sum - sp.v,
    spend,
    other: pool.other,
    more,
    lines,
    st: kitState(rows.concat(more.filter(m => m.given && m.want > 0))),
  };
}
/* Does the card earn a percent (cash back), or points? A unit worth $1 or more is dollars: a percent. */
function vaultPct(o) {
  const u = o && vaultLib().units[o.unit];
  return !u || o.unit === "cash" || u.v >= 1;
}
/* The dollars of one earned unit: 1 cent for 1% of a dollar, or the floor value of one point. */
function vaultPointValue(o) {
  return vaultPct(o) ? 0.01 : vaultLib().units[o.unit].v;
}
/* THE SPENDING AS ONE CARD SEES IT. A line of the second group keeps its own rate only on a card that has
   that rate, and for an airline, a hotel brand or a store only on the card of the brand the player picked
   (a card with the rate and no brand earns it at each brand). On each other card the line is plain travel,
   or plain "everything else". fold says where each such line went. */
function vaultSpendFor(o, K) {
  const spend = Object.assign({}, K.spend),
    fold = {},
    has = cat => ((o.earn && o.earn.rates) || []).some(r => r.cat === cat),
    /* a rate for the category, or a pick that has the category in its list */
    any = cat => has(cat) || ((o.earn && o.earn.picks) || []).some(q => q.from.includes(cat)),
    plain = { amazon: "online", delivery: "dining", entertainment: "other", home: "other" },
    mine = (k, brand) => has(k) && (!(o.brand && o.brand[k]) || o.brand[k] === brand);
  let other = K.other;
  (K.more || []).forEach(m => {
    if (!(m.v > 0)) return;
    const to = plain[m.k]
      ? any(m.k)
        ? m.k
        : plain[m.k]
      : m.k === "airline" || m.k === "hotel"
        ? mine(m.k, m.brand)
          ? m.k
          : "travel"
        : m.k === "store"
          ? mine("store", m.brand)
            ? "store"
            : "other"
          : m.k === "hotelPortal"
            ? has("hotelPortal")
              ? "hotelPortal"
              : has("travelPortal")
                ? "travelPortal"
                : "travel"
            : m.k === "travelPortal"
              ? has("travelPortal")
                ? "travelPortal"
                : "travel"
              : has("rotating")
                ? "rotating"
                : "other";
    if (to === "other") other += m.v;
    else spend[to] = (spend[to] || 0) + m.v;
    if (to !== m.k) fold[m.k] = { to, v: m.v };
  });
  return { spend, other, fold };
}
/* WHAT ONE CARD EARNS IN A YEAR on the categories K (vaultCats), in dollars: cardEarnYear (cardtemplate.js)
   times the value of one unit. fee is the yearly fee less the credits the player counts. net = dollars - fee.
   by is the dollars of each line: a line that this card sees as travel or as "everything else" gets its
   share of that row. */
function vaultEarn(o, K, used) {
  const S = vaultSpendFor(o, K),
    E = cardEarnYear(o, S.spend, S.other),
    pv = vaultPointValue(o),
    by = {};
  E.rows.forEach(r => (by[r.cat || "other"] = r.earned * pv));
  Object.keys(S.fold).forEach(k => {
    const f = S.fold[k],
      row = E.rows.find(r => (r.cat || "other") === f.to),
      part = row && row.year > 0 ? (f.v * 12 * row.earned * pv) / row.year : 0;
    by[k] = part;
    by[f.to] -= part;
  });
  const dollars = E.sum * pv,
    fee = Math.max(0, (o.fee || 0) - (+used || 0));
  return { o, dollars, by, fee, net: dollars - fee };
}
/* THE BEST CARD FOR EACH LINE. For each category: the card of the player that earns most, and the card of
   the library that earns most. yours: each line on the best card of the player, less the fees of those
   cards. single: the one card the player does not hold that earns most on all lines, less its fee. With
   high-interest debt, no card of the library is named. */
function vaultBest(c, today) {
  const K = vaultCats(c),
    L = vaultLib(),
    me = vaultMe(c, today),
    cred = me.cred,
    heldIds = me.held.filter((id, i, a) => a.indexOf(id) === i),
    held = heldIds.map(id => vaultOffer(id)).filter(Boolean),
    suggest = !me.heavyDebt,
    open = suggest
      ? L.offers.filter(o => {
          const u = L.units[o.unit];
          if (heldIds.includes(o.id) || (o.biz && !me.business) || !u || !(u.cash || me.programs)) return false;
          return me.score == null || !o.min || (VAULT_SCORE[me.score] || 0) >= (VAULT_SCORE[o.min] || 0);
        })
      : [],
    mine = held.map(o => vaultEarn(o, K, vaultCreditsUsed(cred, o))),
    lib = open.map(o => vaultEarn(o, K, vaultCreditsUsed(cred, o))),
    top = (list, cat) => list.reduce((b, e) => (!b || (e.by[cat] || 0) > (b.by[cat] || 0) ? e : b), null),
    rows = (K.lines || K.rows)
      .filter(r => r.v > 0)
      .map(r => {
        const a = top(mine, r.k),
          b = top(lib, r.k);
        return {
          k: r.k,
          label: r.label,
          month: r.v,
          mine: a ? { o: a.o, year: a.by[r.k] || 0 } : null,
          lib: b ? { o: b.o, year: b.by[r.k] || 0 } : null,
        };
      }),
    gross = rows.reduce((t, r) => t + (r.mine ? r.mine.year : 0), 0),
    fees = mine.reduce((t, e) => t + e.fee, 0),
    single = lib.reduce((b, e) => (!b || e.net > b.net ? e : b), null);
  return {
    K,
    rows,
    held,
    gross,
    fees,
    yours: held.length ? gross - fees : null,
    single,
    suggest,
    st: kitState(K.rows.concat([vaultSpend(c)])),
  };
}
/* The block on the vault: the tile, one row for each category, the meter, and the questions when open. */
function vaultBestHtml(c) {
  const B = vaultBest(c),
    K = B.K,
    o = W.o || {},
    g = B.st === "Guess" ? "guess" : "",
    name = x => esc(x.bank + " " + x.n);
  let h = `<div class="row between small" style="margin-top:4px"><b>Best card for each spending line</b><span class="row" style="gap:6px">${kitPill(B.st)}${kitInfo("vt_best")}</span></div>`;
  h += `<div class="tile stack vaultbest" style="gap:4px"><div class="small">${
    B.yours == null
      ? "Add the cards you have, and this shows what they earn on your spending."
      : `Your cards earn about <b class="${g}">${money(B.yours)}</b> a year on this spending${B.fees > 0 ? ", after " + money(B.fees) + " of yearly fees" : ""}.`
  }</div>${
    !B.suggest
      ? `<div class="small muted">New cards wait while you have high-interest debt, so no other card is named here.</div>`
      : B.single
        ? `<div class="small">The best single card you do not hold, ${name(B.single.o)}, would earn about <b class="${g}">${money(B.single.net)}</b> a year${B.single.fee > 0 ? ", after its " + money(B.single.fee) + " yearly fee" : ""}.</div><button class="ghost slim" data-a="vaultcard" data-v="${esc(B.single.o.id)}">See the whole card <i class=chev aria-hidden=true></i></button>`
        : ""
  }</div>`;
  h += `<div class="stack vaultlines" style="gap:6px">${B.rows
    .map(
      r =>
        `<div class="small"><div class="row between" style="gap:8px"><b>${esc(r.label)}</b><span class="muted" style="white-space:nowrap">${money(r.month)} a month</span></div><div class="tiny muted">${r.mine ? "Yours: " + name(r.mine.o) + ", " + money(r.mine.year) + " a year" : "Yours: no card yet"}${r.lib ? " · In the library: " + name(r.lib.o) + ", " + money(r.lib.year) + " a year" : ""}</div></div>`
    )
    .join("")}</div>`;
  h += `<div class="tile stack" style="gap:4px"><div class="row between small" style="gap:8px"><span>Your categories add up to <b>${money(K.sum)}</b> a month. Your card spending is ${money(K.budget)}.</span>${kitInfo("vt_cats")}</div>${bar(K.budget > 0 ? Math.min(100, (K.sum / K.budget) * 100) : 0)}<div class="tiny muted">${
    Math.abs(K.diff) < 1
      ? "They match."
      : K.diff > 0
        ? money(K.diff) + " more than your card spending."
        : money(-K.diff) + " of your card spending is in no category yet."
  }</div></div>`;
  h += vaultMoreHtml(c, K);
  h += o.cats
    ? `<div class="stack vaultcats" style="gap:8px">${K.rows
        .map(r =>
          kitAsk(
            c,
            "vault",
            "cat_" + r.k,
            r.label + " each month",
            VAULT_CAT_CHIPS.map(v => [v, money(v)]),
            r.start,
            {
              term: "vt_cats",
              typed: true,
              help: r.given ? "" : "The game starts at " + money(r.start) + ", a guess from your budget.",
            }
          )
        )
        .join("")}<button class="ghost wide slim" data-a="vaultcats" data-v="0">Hide the categories</button></div>`
    : `<button class="ghost wide" data-a="vaultcats" data-v="1">Set my spending by category</button>`;
  return h;
}
/* The fold "Travel brands, stores and bonus categories": the second group of questions, all taps. */
function vaultMoreHtml(c, K) {
  if (!(W.o || {}).cats2)
    return `<button class="ghost wide" data-a="vaultcats" data-k="2" data-v="1">Travel brands, stores and bonus categories</button><div class="tiny muted" style="text-align:center">Optional. For a card of one airline, one hotel brand or one store, and for categories that change each quarter.</div>`;
  const ask = {
    airline: "Flights you book direct with one airline, each month",
    hotel: "Stays you book direct with one hotel brand, each month",
    travelPortal: "Travel you book on the travel site of your bank, each month",
    hotelPortal: "Hotels you book on the travel site of your bank, each month",
    store: "What you spend at one store that has its own card, each month",
    rotating: "How much of your spending lands in the bonus categories of a quarter?",
    amazon: "What you spend at Amazon and Whole Foods, each month",
    delivery: "What you spend in food delivery apps, each month",
    entertainment: "Entertainment (tickets, movies, events), each month",
    home: "Home improvement stores, each month",
  };
  return `<div class="stack vaultmore" style="gap:8px"><div class="small"><b>Travel brands, stores and bonus categories</b></div><div class="tiny muted">Each amount here is part of a line above: travel lines come out of Travel, Amazon out of Online shopping, delivery apps out of Dining, and the others out of Everything else. Your total stays the same.</div>${VAULT_MORE.map(
    m => {
      const row = K.more.find(x => x.k === m.k),
        brands = m.brand ? vaultBrands(m.k) : [];
      return (
        kitAsk(
          c,
          "vault",
          "cat_" + m.k,
          ask[m.k],
          m.chips.map(v => [v, money(v)]),
          0,
          {
            term: "vt_" + m.k,
            typed: true,
            help:
              row.want > row.v
                ? "Only " +
                  money(row.v) +
                  " fits: " +
                  (m.pool === "other" ? "Everything else" : VAULT_POOL[m.pool] + " and Everything else") +
                  " hold no more."
                : m.k === "rotating"
                  ? "The categories change each quarter, and you must turn them on with the bank."
                  : "",
          }
        ) +
        (brands.length
          ? kitAsk(
              c,
              "vault",
              "brand_" + m.k,
              m.brand,
              brands.map(b => [b, b]),
              "",
              {
                term: "vt_brand",
                help: "The rate of a brand card counts only for this brand.",
              }
            )
          : "")
      );
    }
  ).join("")}<button class="ghost wide slim" data-a="vaultcats" data-k="2" data-v="0">Hide these lines</button></div>`;
}
/* ---------- the sheet of one card ---------- */
/* A rate in plain words: "6% on the first $6,000 each year, then 1%". */
function vaultRateWords(o, r) {
  const sym = vaultPct(o) ? "%" : "x",
    base = o.earn && o.earn.base != null ? o.earn.base : 1;
  return (
    r.x +
    sym +
    (r.cap
      ? " on the first " +
        money(r.cap) +
        " each " +
        (r.per || "year") +
        ", then " +
        (r.then != null ? r.then : base) +
        sym
      : "")
  );
}
/* THE LIMITS THAT SEVERAL RATES SHARE, each group one time in plain words: "3x on Groceries, Gas and EV
   charging, Dining and takeout together, on the first $6,000 each year, then 2x". A group with a pick:
   "3% on the 1 category you pick from: ..., and 2% on Groceries: together on the first $2,500 each quarter,
   then 1%". */
function vaultShareWords(o) {
  const e = o.earn || {},
    sym = vaultPct(o) ? "%" : "x",
    base = e.base != null ? e.base : 1,
    groups = {};
  (e.rates || []).forEach(r => {
    if (r.cap && r.share) (groups[r.share] = groups[r.share] || { rates: [], picks: [] }).rates.push(r);
  });
  (e.picks || []).forEach(q => {
    if (q.cap && q.share) (groups[q.share] = groups[q.share] || { rates: [], picks: [] }).picks.push(q);
  });
  return Object.keys(groups)
    .sort()
    .map(k => {
      const g = groups[k],
        f = g.rates[0] || g.picks[0],
        lim =
          "on the first " +
          money(f.cap) +
          " each " +
          (f.per || "year") +
          ", then " +
          (f.then != null ? f.then : base) +
          sym;
      if (!g.picks.length && g.rates.every(r => r.x === f.x))
        return (
          f.x +
          sym +
          " on " +
          g.rates.map(r => vaultCatName(r.cat)).join(", ") +
          (g.rates.length > 1 ? " together" : "") +
          ", " +
          lim
        );
      return (
        g.picks
          .map(
            q =>
              q.x +
              sym +
              " on the " +
              q.count +
              (q.count === 1 ? " category" : " categories") +
              " you pick from: " +
              q.from.map(vaultCatName).join(", ")
          )
          .concat(g.rates.map(r => r.x + sym + " on " + vaultCatName(r.cat)))
          .join(", and ") +
        ": together " +
        lim
      );
    });
}
/* A pick in plain words: "5% on the 2 categories you pick from: ...". Categories that share one limit:
   "3x on Groceries, Gas and Dining together, on the first $6,000 each year, then 2x". */
function vaultPickWords(o, q) {
  const list = q.from.map(vaultCatName).join(", "),
    sym = vaultPct(o) ? "%" : "x",
    lim = q.cap
      ? "on the first " + money(q.cap) + " each " + (q.per || "year") + ", then " + (q.then != null ? q.then : 1) + sym
      : "";
  if (q.count >= q.from.length) return q.x + sym + " on " + list + " together" + (lim ? ", " + lim : "");
  return (
    q.x +
    sym +
    " on the " +
    q.count +
    (q.count === 1 ? " category" : " categories") +
    " you pick from: " +
    list +
    (lim ? " (" + lim + ")" : "")
  );
}

function vaultCatName(k) {
  const r = CARD_TEMPLATE.cats.find(x => x[0] === k);
  return r ? r[1] : k;
}
/* The parts of one card, ready to show: the switches by group, the earn rows, the credits and their total. */
function vaultCardParts(o) {
  const tg = typeof cardToggles === "function" ? cardToggles(o) : [],
    e = o.earn || { base: 1, rates: [], words: "" },
    band = CARD_TEMPLATE.bands.find(b => b[0] === o.min),
    X = window.CARDS_EXTRA || { cards: [] };
  return {
    toggles: tg,
    rates: (e.rates || []).slice().sort((a, b) => b.x - a.x),
    picks: e.picks || [],
    shares: vaultShareWords(o),
    sym: vaultPct(o) ? "%" : "x",
    base: e.base == null ? 1 : e.base,
    earnWords: e.words || "",
    credits: o.credits || [],
    creditSum: vaultCredits(o),
    unique: o.unique || [],
    band: band ? band[1] : "",
    fromAdmin: (X.cards || []).some(x => x.id === o.id),
  };
}
function vaultCardSheet() {
  const c = C(),
    L = vaultLib(),
    o = vaultOffer(W.id);
  if (!o)
    return (
      head("Card vault", "This card") +
      `<div class="tile small">This card is not in the library now.</div><button class="ghost wide" data-a="vault">Open the card vault</button>`
    );
  const P = vaultCardParts(o),
    u = L.units[o.unit],
    v = vaultValue(o),
    held = vaultStore(c).cards.some(x => x.id === o.id),
    sec = (title, term) =>
      `<div class="row between small" style="margin-top:4px"><b>${esc(title)}</b>${kitInfo(term)}</div>`;
  let h =
    head("Card vault", esc(o.bank + " " + o.n)) +
    igRows([
      ["Yearly fee " + kitInfo("vt_fee"), o.fee ? money(o.fee) : "No yearly fee"],
      o.fee1 != null ? ["Fee in the first year", money(o.fee1)] : null,
      o.network ? ["Network " + kitInfo("vt_network"), esc(o.network)] : null,
      P.band ? ["Credit it usually needs " + kitInfo("vt_score"), esc(P.band)] : null,
      [
        "Welcome offer " + kitInfo("vt_offer"),
        o.amt > 0 && u ? esc(o.amt.toLocaleString() + " " + u.n) : "No dollar value counted",
      ],
      v != null && o.amt > 0 ? ["Its value at the floor " + kitInfo("vt_floor"), money(v)] : null,
      o.amt > 0 ? ["Spending it needs", money(o.spend || 0) + " in " + (o.months || 3) + " months"] : null,
      o.ends ? ["The offer ends", esc(o.ends)] : null,
    ]);
  h += sec("What this card has", "vt_has");
  h += P.toggles.length
    ? `<div class="stack vaulthas" style="gap:6px">${P.toggles
        .map(
          t =>
            `<div class="tile stack" style="gap:2px"><div class="row between" style="gap:8px"><span class="pill kitst">${esc(t.l)}</span>${kitInfo("vtsw_" + t.k)}</div>${t.words ? `<div class="tiny muted">${esc(t.words)}</div>` : ""}</div>`
        )
        .join("")}</div>`
    : `<div class="tile small muted">No switch is on for this card in the library.</div>`;
  h += sec("What it earns", "vt_earn");
  h +=
    igRows(
      P.rates
        .filter(r => !(r.cap && r.share))
        .map(r => [esc(vaultCatName(r.cat)), esc(vaultRateWords(o, r))])
        .concat([[P.rates.length || P.picks.length ? "Everything else" : "Each purchase", P.base + P.sym]])
    ) +
    P.shares.map(w => `<div class="small vaultsharerow">${esc(w)} ${kitInfo("vt_share")}</div>`).join("") +
    P.picks
      .filter(q => !(q.cap && q.share))
      .map(q => `<div class="small vaultpickrow">${esc(vaultPickWords(o, q))}</div>`)
      .join("") +
    (P.earnWords ? `<div class="tiny muted">${esc(P.earnWords)}</div>` : "");
  h += sec("Yearly credits", "vt_credit");
  const mine = vaultCred(c)[o.id] || {},
    used = vaultCreditsUsed(vaultCred(c), o);
  h += P.credits.length
    ? `<div class="stack vaultcreds" style="gap:8px">${P.credits
        .map(
          (k, i) =>
            `<div class="small"><div class="row between" style="gap:8px"><span style="min-width:0">${esc(k.name)}</span><span class="muted" style="white-space:nowrap">${k.value > 0 ? money(k.value) : "no dollar value"}</span></div>${k.words ? `<div class="tiny muted">${esc(k.words)}</div>` : ""}${
              k.value > 0
                ? `<div class="row between" style="gap:8px;margin-top:2px"><span class="tiny muted">Would you use this?</span><div class="seg" role="group" aria-label="Would you use this credit"><button class="${mine[i] ? "on" : ""}" data-a="vaultcred" data-v="${esc(o.id)}" data-k="${i}" data-t="1">Yes</button><button class="${mine[i] ? "" : "on"}" data-a="vaultcred" data-v="${esc(o.id)}" data-k="${i}" data-t="0">No</button></div></div>`
                : ""
            }</div>`
        )
        .join(
          ""
        )}</div><div class="small">You count <b>${money(used)}</b> of ${money(P.creditSum)} a year.${o.fee ? " The yearly fee is " + money(o.fee) + "." : ""}</div><div class="row" style="gap:8px"><button class="ghost slim" style="flex:1" data-a="vaultcredall" data-v="${esc(o.id)}" data-k="1">Count all</button><button class="ghost slim" style="flex:1" data-a="vaultcredall" data-v="${esc(o.id)}" data-k="0">Count none</button></div>`
    : `<div class="tile small muted">No yearly credits in the library for this card.</div>`;
  if (P.unique.length) {
    h += sec("What is unique", "vt_unique");
    h += `<div class="stack vaultuniq" style="gap:4px">${P.unique
      .map(
        r =>
          `<div class="small"><b>${esc(r.label)}</b>${r.words ? `<div class="tiny muted">${esc(r.words)}</div>` : ""}</div>`
      )
      .join("")}</div>`;
  }
  h += sec("Where this comes from", "vt_source");
  h += `<div class="tiny muted vaultsrc">${esc(o.source || "No source named.")}</div><div class="small">Looked at on <b>${esc(o.checked || "no date")}</b>${P.fromAdmin ? " · added by the SLAM team" : ""}. Cards change: look at the page of the bank before you apply.</div>`;
  h += held
    ? `<div class="tile small">This card is in your vault.</div>`
    : `<button class="ghost wide" data-a="vaulthave" data-v="${esc(o.id)}">I have this card: add it to my vault</button>`;
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
/* An "i" for each switch of the template, and for each part of the sheet of one card. */
if (typeof CARD_TEMPLATE !== "undefined") {
  const terms = {};
  CARD_TEMPLATE.toggles.forEach(t => {
    terms["vtsw_" + t.k] = [
      t.l,
      (t.help ? t.help + " " : "") + "The line under the label says what this card gives, when the library has it.",
    ];
  });
  kitTerms(terms);
}
kitTerms({
  vt_credit: [
    "Yearly credits",
    "Money a card gives back each year for one named thing, for example a hotel site or a membership. A credit is worth its dollars only when you would buy that thing anyway.",
  ],
  vt_best: [
    "Best card for each line",
    "For each kind of spending, the card that gives most back in a year: among your cards, and among all cards of the library. It counts rates, limits and yearly fees. It does not count a welcome offer.",
  ],
  vt_airline: [
    "One airline, booked direct",
    "Tickets you buy on the website of the airline, not on a travel site. An airline card pays its high rate only there.",
  ],
  vt_hotel: [
    "One hotel brand, booked direct",
    "Nights you book on the website of the hotel company. A hotel card pays its high rate only at its own brand.",
  ],
  vt_travelPortal: [
    "Travel booked with the bank",
    "Flights, hotels or cars that you book on the travel site of the bank of your card. Some cards pay much more there.",
  ],
  vt_hotelPortal: [
    "Hotels booked with the bank",
    "Hotel nights that you book and pay ahead on the travel site of the bank of your card.",
  ],
  vt_store: [
    "Store card",
    "A card of one store. It pays its high rate at that store, and little or nothing elsewhere.",
  ],
  vt_rotating: [
    "Bonus categories",
    "Some cards pay 5% on a few kinds of purchase that change each quarter, up to a limit. You must turn them on with the bank each quarter.",
  ],
  vt_amazon: [
    "Amazon and Whole Foods",
    "What you buy at Amazon and at Whole Foods. Some cards pay a higher rate only there.",
  ],
  vt_delivery: [
    "Delivery apps",
    "Food and grocery delivery that you order in an app. A few cards pay more for it than for dining.",
  ],
  vt_entertainment: [
    "Entertainment",
    "Tickets for movies, concerts, sports and events. A few cards have a rate for it.",
  ],
  vt_home: [
    "Home improvement",
    "Hardware and home improvement stores. A few cards have a rate for it, or let you pick it.",
  ],
  vt_brand: [
    "Brand",
    "The one airline, hotel company or store that you use most. The list comes from the cards in the library.",
  ],
  vt_cats: [
    "Card categories",
    "Banks pay different rates for different kinds of purchase: dining, groceries, gas and more. Your amounts here start as a guess from your budget. Tap a number to make it yours.",
  ],
  vt_share: [
    "One limit together",
    "The bank counts the spending of these categories in one total. When the total passes the limit, each of them earns the lower rate.",
  ],
  vt_fee: [
    "Yearly fee",
    "What the bank charges each year to keep the card open. It posts in the month you opened the card.",
  ],
  vt_network: [
    "Network",
    "The company that carries the payment: Visa, Mastercard, American Express or Discover. A store takes a card only when it takes its network.",
  ],
  vt_has: [
    "What this card has",
    "The yes / no features of the card: cover for travel and purchases, fees it does not charge, and what its points can do.",
  ],
  vt_earn: [
    "Earn rate",
    "The points or the percent you get for each dollar. 3x means 3 points, or 3% back, for each dollar in that category.",
  ],
  vt_unique: [
    "What is unique",
    "Things about this card that fit no switch: a limit on a rate, a note, the usual interest rate.",
  ],
  vt_source: [
    "Source",
    "The page where a person read these facts, and the date they looked. Banks change cards often.",
  ],
});
kitScreen(
  "vaultcard",
  "One card",
  "All that the library knows about one card: what it has, what it earns, its credits, and what is unique.",
  "Each fact has a source and a date. Look at the page of the bank before you apply."
);
kitScreen(
  "vault",
  "Card vault",
  "Your cards with their dates, your 5/24 count, and the welcome offers that fit your credit and your budget.",
  "Nothing here is advice to open a card. Offers wait while you have high-interest debt."
);
Object.assign(ACT, {
  vault: () => {
    if (!VAULT.asked) vaultLoadExtra();
    W = { kind: "vault", o: {} };
    sheet(vaultSheet);
  },
  /* The sheet of one card. It opens on top of the vault, so Back returns to the vault. */
  vaultcard: t => {
    W = { kind: "vaultcard", id: t.dataset.v, o: {} };
    sheet(vaultCardSheet);
  },
  /* One yearly credit of one card: would the player use it? */
  vaultcred: t => {
    const m = vaultCred(C()),
      id = t.dataset.v;
    m[id] = m[id] || {};
    if (t.dataset.t === "1") m[id][t.dataset.k] = true;
    else delete m[id][t.dataset.k];
    kitRedraw();
  },
  /* Count all the credits of one card, or none. */
  vaultcredall: t => {
    const m = vaultCred(C()),
      o = vaultOffer(t.dataset.v);
    if (!o) return;
    m[o.id] = {};
    if (t.dataset.k === "1")
      (o.credits || []).forEach((k, i) => {
        if (k.value > 0) m[o.id][i] = true;
      });
    kitRedraw();
  },
  /* Show or hide the questions of the categories. */
  vaultcats: t => {
    if (!W || W.kind !== "vault") return;
    W.o[t.dataset.k === "2" ? "cats2" : "cats"] = t.dataset.v === "1";
    drawSheet();
  },
  /* "I have this card": the vault opens at the step that asks the year. */
  vaulthave: t => {
    const o = vaultOffer(t.dataset.v);
    if (!o) return;
    W = { kind: "vault", o: { add: { bank: o.bank, id: o.id } } };
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
/* Read the cards of the admin one time, after the account is ready. With no account system it reads the copy only. */
if (typeof SUPA !== "undefined" && SUPA && SUPA.ready && typeof SUPA.ready.then === "function")
  SUPA.ready.then(vaultLoadExtra).catch(e => report(e, "vault.js: the first read of the cards"));
else vaultLoadExtra();
