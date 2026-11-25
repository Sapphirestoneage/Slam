/* ============================================================================
   SLAM the Game: features/mycards.js
   PURPOSE     Credit cards as a list of cards, not one balance. Each card is its own debt line
               (a row of c.debts with k "Credit card balance" and the details in x.card). The
               game then checks 8% or more card by card, never on a blended total.
               A card can be paid in full each month (no debt), carry a balance at a rate, or
               be at 0% for now (a promo). A 0% card is not costly debt until the promo ends;
               then it takes the rate after the promo.
               One rough line "All my cards, not split yet" is allowed. It follows the rule of
               features/alloc.js: while the card lines add up to less than the rough total, the
               rest stays on the rough line; when they add up to more, the card lines win and the
               extra shows.
   INPUT       The profile c: c.debts. Today (todayISO). The card vault (window.CARDS2026) for an
               optional match: the yearly fee and the 0% offer of the card.
               The open sheet (W.kind): cards (the list), cardadd (add or change one card).
   OUTPUT      cardIs, cardSync, cardName, debtName, cardEndOf, cardMath, cardState, cardsBook,
               cardsSheet, cardAddSheet. Parts of functions in other files: syncDebt (cardSync),
               rowEdit (rowEditCard), rowaddk (rowAddCard), ledRowBase (debtName), dbPlan in
               debts.js (debtName, cardEndOf). Actions (ACT): cards, cdopen, cdadd, cdedit, cddel,
               cdiss, cdvault, cdfull, cdbal, cdbaluse, cdrate, cdrateuse, cdend, cdmonth, cdafter,
               cdrough, cdroughuse, cdback, cddone.
   DEPENDS ON  core/engine.js (todayISO, parseISO, syncAll), screens/ui.js (money, esc, head, sheet,
               drawSheet, render, keypad, RANGES, bandOf, afterMoney), features/kit.js (kitInfo,
               kitPill, kitTerms).
   RULES       From the owner, 2026-11-25:
               1. Each card is its own debt line. The 8% check runs per card.
               2. A 0% card is not costly debt until its end date. Then it flips to the rate after.
                  "Not sure" of the rate after means 25%, kept as a Guess.
               3. For each 0% card: pay the balance divided by the months left, to clear it in time.
               4. The order: highest rate first; 0% cards by the end date, the soonest first.
               5. An old single card line becomes "Card 1" with its status kept.
   ========================================================================= */
const CARD_K = "Credit card balance";
const CARD_ISS = [
  "Chase",
  "Amex",
  "Capital One",
  "Citi",
  "Discover",
  "Bank of America",
  "Wells Fargo",
  "Store card",
  "Other",
];
/* The name of the bank in the card vault, when it differs. */
const CARD_VBANK = { Amex: "American Express" };
/* The rate chips: [label, the band of the game, the middle rate]. "0% promo" is its own chip. */
const CARD_RATES = [
  ["Under 8%", "Under 8%", 5],
  ["8% to 15%", "8% to 15%", 11.5],
  ["15% to 25%", "15% to 25%", 20],
  ["Over 25%", "Over 25%", 28],
  ["0% promo", "No interest", 0],
];
/* When the 0% ends: [key, label, months from the day of the answer]. */
const CARD_END = [
  ["u3", "Under 3 months", 2],
  ["m3", "3 to 6 months", 4],
  ["m6", "6 to 12 months", 9],
  ["m12", "Over 12 months", 15],
  ["ns", "Not sure", null],
];
const CARD_AFTER_GUESS = 25;
const CARD_MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function cardIs(x) {
  return !!x && x.k === CARD_K;
}
/* The months from day a to the end of month ym ("2027-03"), at least 1. */
function cardMonthsTo(ym, a) {
  const t = parseISO(a),
    p = ym.split("-").map(Number);
  return Math.max(1, (p[0] - t.getFullYear()) * 12 + (p[1] - 1 - t.getMonth()) + (t.getDate() <= 1 ? 1 : 0));
}
function cardAddMonths(iso, n) {
  const t = parseISO(iso),
    m = t.getMonth() + n;
  return t.getFullYear() + Math.floor(m / 12) + "-" + String((m % 12) + 1).padStart(2, "0");
}
function cardMonthName(ym) {
  const p = ym.split("-").map(Number);
  return CARD_MON[p[1] - 1] + " " + p[0];
}
/* The month the 0% ends ("2027-03"), or null when the player is not sure. */
function cardEndYM(x) {
  const p = x && x.card && x.card.promo;
  if (!p) return null;
  if (p.ym) return p.ym;
  const e = CARD_END.find(r => r[0] === p.end);
  return e && e[2] != null && p.at ? cardAddMonths(p.at, e[2]) : null;
}
/* For the order of the payoff plan: the end of the 0% as a number (soonest first), else a large number. */
function cardEndOf(x) {
  const ym = cardIs(x) && x.card && x.card.promo && !x.card.promo.done ? cardEndYM(x) : null;
  return ym ? +ym.replace("-", "") : 999999;
}
/* KEEP THE CARD LINES TRUE. Called by syncDebt (engine.js) before the totals. */
function cardSync(c, today) {
  if (!c || !Array.isArray(c.debts)) return;
  const t = today || todayISO();
  let n = 0;
  c.debts.forEach(x => {
    if (!cardIs(x)) return;
    /* an old single line: it becomes Card 1, with its amount, rate and status kept */
    if (!x.card) x.card = {};
    if (!x.card.rough && !x.card.nm && !x.card.iss) x.card.nm = "Card " + ++n;
    else if (!x.card.rough) n++;
    if (x.card.full === "Yes") {
      x.amt = 0;
      x.s = true;
      x.high = false;
    }
    const p = x.card.promo;
    if (p && x.card.full !== "Yes") {
      const ym = cardEndYM(x),
        ended = ym != null && ym < t.slice(0, 7);
      if (ended) {
        const r = p.afterRate != null ? p.afterRate : CARD_AFTER_GUESS;
        x.rate = r;
        x.apr = bandOf(r);
        x.high = r >= 8;
        p.done = true;
      } else {
        x.rate = 0;
        x.apr = "No interest";
        x.high = false;
        p.done = false;
      }
    }
  });
  const rough = c.debts.find(x => cardIs(x) && x.card && x.card.rough);
  if (rough) {
    const lines = c.debts.filter(x => cardIs(x) && x !== rough).reduce((a, x) => a + (x.amt || 0), 0),
      total = rough.card.total || 0;
    rough.amt = Math.max(0, total - lines);
    rough.card.over = Math.max(0, lines - total);
  }
}
function cardName(x) {
  const k = x.card || {};
  if (k.rough) return "All my cards, not split yet";
  return k.nick || k.vn || k.iss || k.nm || "Card";
}
/* The name of a debt line on the screens. With one plain card it stays "Credit card balance". */
function debtName(x, c) {
  if (!cardIs(x)) return x.k;
  const k = x.card || {},
    rows = (c || (typeof C === "function" ? C() : null) || { debts: [] }).debts.filter(cardIs);
  if (k.rough) return cardName(x);
  return rows.length > 1 || k.iss || k.nick ? "Credit card: " + cardName(x) : x.k;
}
/* The status of one card: Guess, Close or Exact. */
function cardState(x) {
  const k = x.card || {};
  if (k.full === "Yes") return "Exact";
  if (!x.s) return "Guess";
  const rateTyped = x.rate != null && k.rt === "typed",
    afterGuess = k.promo && k.promo.afterRate == null;
  if (k.bt === "typed" && (rateTyped || (k.promo && !afterGuess && k.promo.ym))) return "Exact";
  return "Close";
}
/* THE MATH OF THE CARDS. One entry for each card line, the totals, and the order. */
function cardMath(c, today) {
  const t = today || todayISO(),
    rows = (c.debts || []).map((x, i) => ({ x, i })).filter(o => cardIs(o.x));
  const cards = rows.map(o => {
    const x = o.x,
      k = x.card || {},
      rate = x.rate != null ? +x.rate : typeof dbRate === "function" ? dbRate(x).v : 0,
      promoOn = !!(k.promo && !k.promo.done && k.full !== "Yes"),
      ym = promoOn ? cardEndYM(x) : null,
      left = ym ? cardMonthsTo(ym, t) : null;
    return {
      i: o.i,
      x,
      name: cardName(x),
      bal: x.amt || 0,
      rate,
      high: !!x.high && (x.amt || 0) > 0,
      full: k.full === "Yes",
      rough: !!k.rough,
      promo: promoOn
        ? {
            ym,
            left,
            pay: ym && x.amt > 0 ? Math.ceil(x.amt / left) : null,
            after: k.promo.afterRate != null ? k.promo.afterRate : CARD_AFTER_GUESS,
            afterGuess: k.promo.afterRate == null,
          }
        : null,
      st: cardState(x),
    };
  });
  const sum = f => cards.filter(f).reduce((a, o) => a + o.bal, 0),
    ends = cards
      .filter(o => o.promo && o.promo.ym && o.bal > 0)
      .map(o => o.promo.ym)
      .sort();
  const order = cards
    .filter(o => o.bal > 0)
    .slice()
    .sort((a, b) => b.rate - a.rate || cardEndOf(a.x) - cardEndOf(b.x) || a.bal - b.bal);
  return {
    cards,
    total: sum(() => true),
    high: sum(o => o.high),
    zero: sum(o => !!o.promo),
    soonest: ends.length ? ends[0] : null,
    order,
    over: (rows.find(o => o.x.card && o.x.card.rough) || { x: { card: {} } }).x.card.over || 0,
  };
}

/* ---------- the spreadsheet of the plan (book.js) ---------- */
function cardsBook(c) {
  const M = cardMath(c),
    rows = [],
    ids = [];
  if (!M.cards.length) return { title: "Credit cards", rows };
  M.cards.forEach((o, j) => {
    const id = "cd_b" + j;
    ids.push("{" + id + "}");
    rows.push({ id, label: "Credit card: " + o.name + ", balance", v: o.bal, note: o.st });
    if (o.promo && o.promo.pay != null) {
      rows.push({
        id: "cd_m" + j,
        label: "Credit card: " + o.name + ", months until the 0% ends",
        v: o.promo.left,
        note: "From the end month",
      });
      rows.push({
        id: "cd_p" + j,
        label: "Credit card: " + o.name + ", a month to clear it before the 0% ends",
        v: o.promo.pay,
        note: "The balance divided by the months left, rounded up",
      });
    }
  });
  rows.push({ id: "cd_tot", label: "Credit cards: total owed", v: M.total, f: "=" + ids.join("+") });
  rows.push({
    id: "cd_hi",
    label: "Credit cards: at 8% or more",
    v: M.high,
    note: "Card by card, never on a blended rate",
  });
  rows.push({
    id: "cd_zero",
    label: "Credit cards: at 0% for now",
    v: M.zero,
    note: "Not costly debt until the 0% ends",
  });
  return { title: "Credit cards", rows };
}

/* ---------- words ---------- */
if (typeof kitTerms === "function")
  kitTerms({
    cdapr: [
      "APR",
      "The yearly interest rate on a card balance. It is on your statement. 8% or more counts as expensive debt, and the game pays it down first.",
    ],
    cdpromo: [
      "0% promo",
      "Some cards charge no interest for a set number of months, often on a balance transfer or new purchases. After that, the normal rate starts on what is left.",
    ],
  });

/* ---------- the screens ---------- */
function cardVault(iss) {
  const L = (typeof window !== "undefined" && window.CARDS2026 && window.CARDS2026.offers) || [],
    b = CARD_VBANK[iss] || iss;
  return L.filter(o => o.bank === b);
}
function cardVaultOne(id) {
  const L = (typeof window !== "undefined" && window.CARDS2026 && window.CARDS2026.offers) || [];
  return L.find(o => o.id === id) || null;
}
function cardTag(o) {
  if (o.full) return "Paid in full";
  if (o.rough) return o.bal > 0 ? "Split it by card to sharpen it" : "Your cards cover it";
  if (o.promo) return "0% " + (o.promo.ym ? "until " + cardMonthName(o.promo.ym) : "for now, end not known");
  const x = o.x;
  if (x.apr && x.apr !== "?")
    return x.rate != null && x.card && x.card.rt === "typed" ? x.rate + "% a year" : x.apr + " a year";
  return "Rate not picked yet";
}
function cardTotals(M) {
  const row = (l, v) => `<div class="row between small"><span>${l}</span><b>${v}</b></div>`;
  return (
    `<div class="tile stack" style="gap:4px">` +
    row("Total owed", money(M.total)) +
    row(`At 8% or more ${kitInfo("cdapr")}`, money(M.high)) +
    row(`At 0% for now ${kitInfo("cdpromo")}`, money(M.zero)) +
    (M.soonest ? row("Soonest 0% end", cardMonthName(M.soonest)) : "") +
    `</div>`
  );
}
function cardOpenBody(o, c) {
  const x = o.x,
    k = x.card || {},
    v = k.vid ? cardVaultOne(k.vid) : null,
    line = t => `<div class="small">${t}</div>`;
  let h = "";
  if (o.full) h += line("You pay it off every month, so it adds no debt.");
  else if (o.rough)
    h +=
      line("Your first guess for all your cards: " + money(k.total || 0) + ".") +
      (M_over(c) > 0
        ? line("Your cards add up to " + money(M_over(c)) + " more than that guess. The cards count.")
        : "");
  else {
    h += line("Balance: " + money(o.bal));
    if (o.promo) {
      h += line(
        "0% now. After it ends: " + o.promo.after + "% a year" + (o.promo.afterGuess ? " (a guess)" : "") + "."
      );
      if (o.promo.pay != null)
        h += `<div class="tile small"><b>Pay ${money(o.promo.pay)} a month to clear it before the 0% ends.</b></div>`;
      else h += line("Look on your statement for the month the 0% ends. Then the game can work out a monthly amount.");
    } else if (!x.apr || x.apr === "?") h += line("For now the game assumes 8% or more. Tap a rate to change it.");
  }
  if (v) h += line("Matched to " + esc(v.bank + " " + v.n) + ". Yearly fee: " + (v.fee ? money(v.fee) : "none") + ".");
  return h;
}
function M_over(c) {
  return cardMath(c).over;
}
function cardsSheet() {
  W = { kind: "cards", open: null };
  sheet(() => {
    const c = C(),
      M = cardMath(c),
      w = W;
    const list = M.cards
      .map(o => {
        const on = w.open === o.i;
        return (
          `<div class="tile stack" style="gap:6px"><button class="rowbtn" data-a="cdopen" data-v="${o.i}" aria-expanded="${on}"><span>${esc(o.name)}<div class="tiny muted">${esc(cardTag(o))}</div></span><span class="row">${kitPill(o.st)}<b class="${o.st === "Guess" ? "guess" : ""}">${money(o.bal)}</b><span class="caret">${on ? "⌄" : "›"}</span></span></button>` +
          (on
            ? `<div class="stack" style="gap:6px">${cardOpenBody(o, c)}<button class="ghost wide" data-a="${o.rough ? "cdrough" : "cdedit"}" data-v="${o.i}">${o.rough ? "Change the total" : "Change this card"}</button><button class="ghost wide" data-a="cddel" data-v="${o.i}">Remove this card</button></div>`
            : "") +
          `</div>`
        );
      })
      .join("");
    const hasRough = M.cards.some(o => o.rough);
    return (
      head("Money · What you owe", "Your credit cards") +
      (M.cards.length
        ? cardTotals(M)
        : `<div class="small muted">No cards yet. Add each card you have, or tap one total for all of them.</div>`) +
      `<div class="stack" style="gap:8px">${list}</div>` +
      `<button class="primary wide go" data-a="cdadd">+ Add a card</button>` +
      (hasRough ? "" : `<button class="ghost wide" data-a="cdrough">Tap one total for all my cards</button>`) +
      `<div class="tiny muted">Each card counts on its own. A card at 8% or more gets paid down first. A 0% card waits until its 0% ends.</div>` +
      `<button class="ghost wide" data-a="cddone">Back to Money</button>`
    );
  });
}
/* ADD OR CHANGE ONE CARD, one question at a time. Steps: iss, vault, full, bal, rate, end, after. */
function cardAddSheet(i, st) {
  const c = C();
  W = { kind: "cardadd", i, st: st || "iss", o: { debts: c.debts }, sec: "debts", pad: null, rp: false, rs: "" };
  sheet(() => {
    const w = W,
      c2 = C(),
      x = c2.debts[w.i];
    if (!x)
      return (
        head("Money · Your credit cards", "This card is gone") +
        `<button class="primary wide" data-a="cards">Back to my cards</button>`
      );
    const k = x.card || (x.card = {}),
      step = w.st,
      back = `<button class="ghost slim" data-a="cdback">Back one</button>`,
      top = t =>
        head("Money · Your credit cards", esc(cardName(x))) + `<div class="tile"><h2 style="margin:0">${t}</h2></div>`,
      chip = (a, v, l, on) =>
        `<button class="chip ${on ? "on" : ""}" data-a="${a}" data-v="${esc(v)}">${esc(l)}</button>`;
    if (step === "iss")
      return (
        top("Who issued it?") +
        `<div class="chips">${CARD_ISS.map(b => chip("cdiss", b, b, k.iss === b)).join("")}</div>` +
        `<div class="tiny muted">The bank name is on the front of the card. You can add a nickname later.</div>`
      );
    if (step === "vault") {
      const L = cardVault(k.iss);
      return (
        top("Which " + esc(k.iss) + " card is it?") +
        `<div class="stack" style="gap:6px">${L.map(o => `<button class="rowbtn" data-a="cdvault" data-v="${esc(o.id)}"><span>${esc(o.n)}<div class="tiny muted">${o.fee ? money(o.fee) + " a year" : "No yearly fee"}</div></span><span class="caret">›</span></button>`).join("")}</div>` +
        `<button class="ghost wide" data-a="cdvault" data-v="">Skip this</button>` +
        `<div class="tiny muted">Optional. It fills in the yearly fee and the usual 0% offer.</div>` +
        back
      );
    }
    if (step === "full")
      return (
        top("Do you pay it off in full every month?") +
        `<div class="chips">${["Yes", "No", "Sometimes"].map(b => chip("cdfull", b, b, k.full === b)).join("")}</div>` +
        `<div class="tiny muted">Paid in full means no interest and no debt on this card.</div>` +
        back
      );
    if (step === "bal") {
      const pk = "d:" + w.i,
        open = w.pad === pk;
      return (
        top("What do you owe on it today?") +
        `<div class="val">${money(x.amt || 0)}</div>` +
        `<div class="chips">${RANGES.debt.map(r => chip("cdbal", r[0], r[1], x.s && k.bt === "range" && x.amt === r[0])).join("")}</div>` +
        (open
          ? keypad(pk) + `<button class="primary wide go" data-a="cdbaluse">Use ${money(x.amt || 0)}</button>`
          : `<button class="ghost wide" data-a="padopen" data-k="${pk}">Type the exact number</button>`) +
        `<div class="tiny muted">The statement balance is on your card app's home screen.</div>` +
        back
      );
    }
    if (step === "rate")
      return (
        top(`What rate does it charge a year? ${kitInfo("cdapr")}`) +
        `<div class="chips">${CARD_RATES.map(r => chip("cdrate", r[0], r[0], k.promo ? r[0] === "0% promo" : !!x.apr && x.apr === r[1] && k.rt === "band")).join("")}</div>` +
        (w.rp
          ? `<div class="numopen"><div style="font-size:26px;font-weight:700">${w.rs || "0"}%</div><div class="pad">${["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"].map(d => `<button class="key" data-a="rkey" data-v="${d}">${d === "del" ? "Delete" : d}</button>`).join("")}</div><button class="primary wide go" data-a="cdrateuse">Use ${w.rs || "0"}% a year</button></div>`
          : `<button class="ghost wide" data-a="ropen">Type the exact rate</button>`) +
        `<div class="tiny muted">It's called the APR, on your statement. Decimals are fine, like 6.66.</div>` +
        back
      );
    if (step === "end") {
      const v = k.vid ? cardVaultOne(k.vid) : null,
        months = Array.from({ length: 18 }, (_, j) => cardAddMonths(todayISO(), j + 1));
      return (
        top(`When does the 0% end? ${kitInfo("cdpromo")}`) +
        `<div class="chips">${CARD_END.map(r => chip("cdend", r[0], r[1], k.promo && k.promo.end === r[0] && !k.promo.ym)).join("")}</div>` +
        `<details class="math"${k.promo && k.promo.ym ? " open" : ""}><summary>Pick the month instead</summary><div class="chips" style="padding:8px 10px">${months.map(m => chip("cdmonth", m, cardMonthName(m), k.promo && k.promo.ym === m)).join("")}</div></details>` +
        (v && v.hasWords && v.hasWords.intro0
          ? `<div class="tiny muted">This card's 0% offer: ${esc(v.hasWords.intro0)}.</div>`
          : `<div class="tiny muted">The end date is on your statement, near the rate.</div>`) +
        back
      );
    }
    if (step === "after")
      return (
        top("What rate starts after the 0% ends?") +
        `<div class="chips">${CARD_RATES.slice(0, 4)
          .map(r => chip("cdafter", r[0], r[0], k.promo && k.promo.afterBand === r[0]))
          .concat([chip("cdafter", "ns", "Not sure", k.promo && k.promo.afterRate == null && k.promo.afterSet)])
          .join("")}</div>` +
        `<div class="tiny muted">Not sure? The game uses 25%, marked as a guess, until you know.</div>` +
        back
      );
    if (step === "rough") {
      const pk = "d:" + w.i,
        open = w.pad === pk;
      return (
        head("Money · Your credit cards", "All your cards together") +
        `<div class="tile"><h2 style="margin:0">About how much do you owe on all your cards?</h2></div>` +
        `<div class="val">${money(k.total || 0)}</div>` +
        `<div class="chips">${RANGES.debt.map(r => chip("cdrough", r[0], r[1], k.total === r[0])).join("")}</div>` +
        (open
          ? keypad(pk) + `<button class="primary wide go" data-a="cdroughuse">Use ${money(x.amt || 0)}</button>`
          : `<button class="ghost wide" data-a="padopen" data-k="${pk}">Type the exact number</button>`) +
        `<div class="tiny muted">A rough total is fine. Split it by card later to sharpen it.</div>` +
        `<button class="ghost wide" data-a="cards">Back to my cards</button>`
      );
    }
    return cardsSheetFallback();
  });
}
function cardsSheetFallback() {
  return (
    head("Money · Your credit cards", "") + `<button class="primary wide" data-a="cards">Back to my cards</button>`
  );
}
/* The step after this one. */
function cardNext(x, st) {
  const k = x.card || {};
  if (st === "iss") return cardVault(k.iss).length ? "vault" : "full";
  if (st === "vault") return "full";
  if (st === "full") return k.full === "Yes" ? null : "bal";
  if (st === "bal") return "rate";
  if (st === "rate") return k.promo ? "end" : null;
  if (st === "end") return "after";
  return null;
}
function cardPrev(x, st) {
  const k = x.card || {},
    o = ["iss", "vault", "full", "bal", "rate", "end", "after"],
    j = o.indexOf(st);
  if (j <= 0) return null;
  const p = o[j - 1];
  return p === "vault" && !cardVault(k.iss).length ? "iss" : p;
}
function cardStep(st) {
  const c = C(),
    x = c.debts[W.i];
  if (!st) {
    cardSave(c);
    cardsSheet();
    W.open = x ? c.debts.indexOf(x) : null;
    drawSheet();
    return;
  }
  W.st = st;
  W.pad = null;
  W.rp = false;
  drawSheet();
}
function cardSave(c) {
  syncAll(c);
  if (typeof afterMoney === "function") afterMoney(c, D.realm, false);
  else save();
  render();
}
function cardSetRate(x, band, rate, how) {
  const k = x.card || (x.card = {});
  if (band === "No interest" && how === "band") {
    k.promo = Object.assign({ at: todayISO() }, k.promo || {});
    x.apr = "No interest";
    x.rate = 0;
    x.high = false;
    delete k.rt;
  } else {
    delete k.promo;
    x.apr = band;
    x.high = rate >= 8;
    if (how === "typed") x.rate = rate;
    else delete x.rate;
    k.rt = how;
  }
  delete x.ratecf;
}

/* Part of syncDebt() in engine.js (it calls cardSync). Part of rowEdit() in ui.js: a card line opens the list. */
function rowEditCard(sec, i) {
  const c = C();
  if (sec !== "debts" || !cardIs(c.debts[i])) return false;
  cardsSheet();
  W.open = i;
  drawSheet();
  return true;
}
/* Part of the action rowaddk in ui.js: adding "Credit card balance" starts the card questions. */
function rowAddCard(sec, k) {
  if (sec !== "debts" || k !== CARD_K) return false;
  ACT.cdadd();
  return true;
}

Object.assign(ACT, {
  cards: () => cardsSheet(),
  cdopen: t => {
    const i = +t.dataset.v;
    W.open = W.open === i ? null : i;
    drawSheet();
  },
  cdadd: () => {
    const c = C();
    c.debts.push({
      k: CARD_K,
      amt: 0,
      high: true,
      s: false,
      was: 0,
      card: { nm: "Card " + (c.debts.filter(x => cardIs(x) && !(x.card && x.card.rough)).length + 1) },
    });
    if (Array.isArray(c.debtKinds) && !c.debtKinds.includes(CARD_K)) c.debtKinds.push(CARD_K);
    cardAddSheet(c.debts.length - 1, "iss");
  },
  cdedit: t => cardAddSheet(+t.dataset.v, "iss"),
  cddel: t => {
    const c = C(),
      i = +t.dataset.v;
    c.debts.splice(i, 1);
    if (!c.debts.some(cardIs) && Array.isArray(c.debtKinds)) c.debtKinds = c.debtKinds.filter(k => k !== CARD_K);
    cardSave(c);
    cardsSheet();
  },
  cdiss: t => {
    const x = C().debts[W.i];
    x.card.iss = t.dataset.v;
    if (
      x.card.vid &&
      cardVaultOne(x.card.vid) &&
      cardVaultOne(x.card.vid).bank !== (CARD_VBANK[x.card.iss] || x.card.iss)
    ) {
      delete x.card.vid;
      delete x.card.vn;
    }
    cardStep(cardNext(x, "iss"));
  },
  cdvault: t => {
    const x = C().debts[W.i],
      v = t.dataset.v ? cardVaultOne(t.dataset.v) : null;
    if (v) {
      x.card.vid = v.id;
      x.card.vn = (x.card.iss === "Other" || x.card.iss === "Store card" ? v.bank + " " : x.card.iss + " ") + v.n;
      x.card.fee = v.fee || 0;
    } else {
      delete x.card.vid;
      delete x.card.vn;
      delete x.card.fee;
    }
    cardStep("full");
  },
  cdfull: t => {
    const x = C().debts[W.i];
    x.card.full = t.dataset.v;
    if (t.dataset.v === "Yes") {
      x.amt = 0;
      x.s = true;
      x.high = false;
      delete x.card.promo;
    }
    cardStep(cardNext(x, "full"));
  },
  cdbal: t => {
    const x = C().debts[W.i];
    x.amt = +t.dataset.v;
    x.s = true;
    x.card.bt = "range";
    cardStep("rate");
  },
  cdbaluse: () => {
    const x = C().debts[W.i];
    x.s = true;
    x.card.bt = "typed";
    cardStep("rate");
  },
  cdrate: t => {
    const x = C().debts[W.i],
      r = CARD_RATES.find(b => b[0] === t.dataset.v);
    cardSetRate(x, r[1], r[2], "band");
    cardStep(cardNext(x, "rate"));
  },
  cdrateuse: () => {
    const x = C().debts[W.i],
      r = parseFloat(W.rs || "0") || 0;
    cardSetRate(x, bandOf(r), r, "typed");
    cardStep(null);
  },
  cdend: t => {
    const x = C().debts[W.i];
    x.card.promo = Object.assign(x.card.promo || {}, { end: t.dataset.v, at: todayISO() });
    delete x.card.promo.ym;
    cardStep("after");
  },
  cdmonth: t => {
    const x = C().debts[W.i];
    x.card.promo = Object.assign(x.card.promo || {}, { ym: t.dataset.v, at: todayISO() });
    delete x.card.promo.end;
    cardStep("after");
  },
  cdafter: t => {
    const x = C().debts[W.i],
      v = t.dataset.v,
      r = CARD_RATES.find(b => b[0] === v);
    x.card.promo = x.card.promo || { at: todayISO() };
    x.card.promo.afterSet = true;
    if (r) {
      x.card.promo.afterRate = r[2];
      x.card.promo.afterBand = r[0];
    } else {
      delete x.card.promo.afterRate;
      delete x.card.promo.afterBand;
    }
    cardStep(null);
  },
  cdrough: t => {
    const c = C();
    let i = c.debts.findIndex(x => cardIs(x) && x.card && x.card.rough);
    if (W && W.kind === "cardadd" && W.st === "rough" && t && t.dataset.v != null && t.dataset.v !== "" && i >= 0) {
      c.debts[i].card.total = +t.dataset.v;
      c.debts[i].s = false;
      cardSave(c);
      cardsSheet();
      return;
    }
    if (i < 0) {
      c.debts.push({ k: CARD_K, amt: 0, high: true, s: false, was: 0, card: { rough: true, total: 0 } });
      if (Array.isArray(c.debtKinds) && !c.debtKinds.includes(CARD_K)) c.debtKinds.push(CARD_K);
      i = c.debts.length - 1;
    }
    cardAddSheet(i, "rough");
  },
  cdroughuse: () => {
    const c = C(),
      x = c.debts[W.i];
    x.card.total = x.amt || 0;
    cardSave(c);
    cardsSheet();
  },
  cdback: () => {
    const x = C().debts[W.i],
      p = cardPrev(x, W.st);
    if (p) cardStep(p);
    else cardsSheet();
  },
  cddone: () => {
    cardSave(C());
    ACT.close();
  },
});
