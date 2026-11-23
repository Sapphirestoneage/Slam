/* ============================================================================
   SLAM the Game: data/cardtemplate.js
   PURPOSE     The template of one card of the card library. It names each field, each yes / no switch
               (toggle), the spending categories, and the free list "What is unique". The card vault
               (features/vault.js) and the admin page (admin.html, "Add a card") both read it, so a
               card that the admin adds has the same shape as a card of data/cards2026.js.
   INPUT       Nothing.
   OUTPUT      window.CARD_TEMPLATE, and the functions cardBlank, cardSlug, cardNum, cardClean, cardCheck,
               cardToggles, cardMerge, cardEarnYear.
   DEPENDS ON  Nothing. The file has no game code, because admin.html loads it without the game.
   SHAPE       { id, bank, n, network, fee, fee1, amt, unit, spend, months, min, ends, biz, upTo,
                 has: { key: true }, hasWords: { key: "the detail" },
                 earn: { base, rates: [{ cat, x, cap, per, then }], picks: [{ x, count, from, cap, per, then }], words },
                 A limit can be shared: rows with the same letter in "share" use one limit together.
                 A rate can have a limit: x on the first "cap" dollars of each "per" (year, quarter or
                 month), then the rate "then" (the base when it is not given). A pick is a rate on
                 "count" categories that the player picks from the list "from".
                 credits: [{ name, value, words }], unique: [{ label, words, value }],
                 brand: { airline, hotel, store } (the one brand that the rate of that name is for),
                 source, checked, hidden }
               id, bank, n, fee, amt, unit, spend, months, min, biz and upTo are the keys of
               data/cards2026.js. Do not change them: saved games name a card by its id.
   RULES       A card must name its source and the date that a person looked at it. A switch says
               that the card has a thing. The detail of the thing is one optional line. A thing that
               only this card has goes in "What is unique". No red and no verdict words in the labels.
   ========================================================================= */
window.CARD_TEMPLATE = {
  version: 1,
  networks: ["Visa", "Mastercard", "American Express", "Discover"],
  bands: [
    ["none", "No credit history needed"],
    ["fair", "Fair credit (from 580)"],
    ["good", "Good credit (from 670)"],
    ["excellent", "Excellent credit (from 740)"],
  ],
  /* The yes / no switches. g is the group on the form. */
  toggles: [
    {
      k: "biz",
      g: "The card",
      l: "Business card",
      help: "A card for a business. Most banks do not count it toward 5/24.",
    },
    { k: "upTo", g: "The card", l: 'The offer is "up to"', help: "Not each person gets the full amount." },
    { k: "secured", g: "The card", l: "Secured card", help: "It needs a deposit." },
    { k: "store", g: "The card", l: "Store card", help: "It works best, or only, at one store." },
    { k: "starter", g: "The card", l: "A first card", help: "People with a short credit history can get it." },
    { k: "intro0", g: "Money", l: "0% interest at the start", help: "Say for how many months in the detail." },
    { k: "noForeignFee", g: "Money", l: "No foreign transaction fee", help: "" },
    { k: "transfer", g: "Points", l: "Points move to airlines or hotels", help: "Transfer partners." },
    { k: "pool", g: "Points", l: "Points combine with other cards of the bank", help: "" },
    { k: "lounge", g: "Travel", l: "Airport lounges", help: "" },
    { k: "bag", g: "Travel", l: "Free checked bag", help: "" },
    { k: "night", g: "Travel", l: "Free hotel night each year", help: "" },
    { k: "status", g: "Travel", l: "Airline or hotel status", help: "" },
    { k: "trusted", g: "Travel", l: "Global Entry or TSA PreCheck credit", help: "" },
    { k: "rental", g: "Cover", l: "Rental car cover", help: "Say primary or secondary in the detail." },
    { k: "tripCancel", g: "Cover", l: "Trip cancellation cover", help: "" },
    { k: "tripDelay", g: "Cover", l: "Trip delay cover", help: "" },
    { k: "baggage", g: "Cover", l: "Baggage cover", help: "" },
    { k: "cellPhone", g: "Cover", l: "Cell phone protection", help: "" },
    { k: "purchase", g: "Cover", l: "Purchase protection", help: "" },
    { k: "warranty", g: "Cover", l: "Extended warranty", help: "" },
  ],
  /* A limit on a rate counts for each of these. */
  pers: [
    ["year", "each year"],
    ["quarter", "each quarter"],
    ["month", "each month"],
  ],
  /* The spending categories of the earn rates. */
  cats: [
    ["dining", "Dining and takeout"],
    ["groceries", "Groceries"],
    ["gas", "Gas and EV charging"],
    ["transit", "Transit, rideshare, tolls"],
    ["travel", "Travel"],
    ["travelPortal", "Travel booked with the bank"],
    ["hotelPortal", "Hotels booked with the bank"],
    ["airline", "One airline, booked direct"],
    ["hotel", "One hotel brand, booked direct"],
    ["streaming", "Streaming"],
    ["drugstore", "Drugstores"],
    ["phone", "Phone plan"],
    ["entertainment", "Entertainment"],
    ["home", "Home improvement"],
    ["online", "Online shopping"],
    ["amazon", "Amazon and Whole Foods"],
    ["delivery", "Delivery apps"],
    ["rotating", "Categories that change each quarter"],
    ["pick", "A category you pick"],
    ["store", "At the store of the card"],
  ],
};
/* A new, empty card. */
function cardBlank() {
  return {
    id: "",
    bank: "",
    n: "",
    network: "",
    fee: null,
    fee1: null,
    amt: null,
    unit: "cash",
    spend: null,
    months: 3,
    min: "good",
    ends: "",
    has: {},
    hasWords: {},
    earn: { base: 1, rates: [], picks: [], words: "" },
    credits: [],
    unique: [],
    source: "",
    checked: "",
  };
}
/* The id of a card from its bank and its name: "Chase" + "Sapphire Preferred" is "chase-sapphire-preferred". */
function cardSlug(bank, n) {
  return (String(bank || "") + " " + String(n || ""))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
/* A number, or null when the text is empty or is not a number. Empty is not zero. */
function cardNum(v) {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = +String(v).replace(/[$,\s]/g, "");
  return isFinite(n) ? n : null;
}
/* One clean record from what a form or a file holds: numbers are numbers, texts are trimmed, an empty
   row is dropped, and the keys biz and upTo of data/cards2026.js follow their switches. */
function cardClean(raw) {
  const c = Object.assign(cardBlank(), raw || {}),
    T = window.CARD_TEMPLATE,
    txt = v => String(v == null ? "" : v).trim(),
    out = {
      id: txt(c.id) || cardSlug(c.bank, c.n),
      bank: txt(c.bank),
      n: txt(c.n),
      network: txt(c.network),
      fee: cardNum(c.fee),
      amt: cardNum(c.amt),
      unit: txt(c.unit) || "cash",
      spend: cardNum(c.spend),
      months: cardNum(c.months),
      min: txt(c.min) || "good",
      has: {},
      hasWords: {},
      earn: { base: 1, rates: [], words: "" },
      credits: [],
      unique: [],
      source: txt(c.source),
      checked: txt(c.checked),
    },
    has = Object.assign({}, c.has || {});
  if (c.biz) has.biz = true;
  if (c.upTo) has.upTo = true;
  T.toggles.forEach(t => {
    if (has[t.k]) {
      out.has[t.k] = true;
      const w = txt((c.hasWords || {})[t.k]);
      if (w) out.hasWords[t.k] = w;
    }
  });
  if (out.has.biz) out.biz = 1;
  if (out.has.upTo) out.upTo = 1;
  if (cardNum(c.fee1) !== null) out.fee1 = cardNum(c.fee1);
  if (txt(c.ends)) out.ends = txt(c.ends);
  if (c.spendKnown === false) out.spendKnown = false;
  if (c.hidden) out.hidden = true;
  const e = c.earn || {};
  out.earn.base = cardNum(e.base) === null ? 1 : cardNum(e.base);
  out.earn.words = txt(e.words);
  const isCat = k => T.cats.some(c => c[0] === k),
    /* the limit of a rate: only on the first "cap" dollars of each "per", then the rate "then" */
    limit = (row, r) => {
      const cap = cardNum(r.cap);
      if (cap !== null && cap > 0) {
        row.cap = cap;
        row.per = T.pers.some(q => q[0] === r.per) ? r.per : "year";
        if (cardNum(r.then) !== null) row.then = cardNum(r.then);
        /* rows with the same letter share one limit */
        if (txt(r.share)) row.share = txt(r.share).toUpperCase().slice(0, 4);
      }
      return row;
    };
  (e.rates || []).forEach(r => {
    const x = cardNum(r && r.x);
    if (r && isCat(r.cat) && x !== null && x > 0) out.earn.rates.push(limit({ cat: r.cat, x }, r));
  });
  out.earn.picks = [];
  (e.picks || []).forEach(r => {
    const x = cardNum(r && r.x),
      from = ((r && r.from) || []).filter(isCat);
    if (x !== null && x > 0 && from.length)
      out.earn.picks.push(limit({ x, count: Math.max(1, Math.min(from.length, cardNum(r.count) || 1)), from }, r));
  });
  /* the brand of the rates "airline", "hotel" and "store", when the rate is for one brand only */
  ["airline", "hotel", "store"].forEach(k => {
    const b = txt((c.brand || {})[k]);
    if (b) (out.brand = out.brand || {})[k] = b;
  });
  (c.credits || []).forEach(r => {
    if (r && txt(r.name)) out.credits.push({ name: txt(r.name), value: cardNum(r.value) || 0, words: txt(r.words) });
  });
  (c.unique || []).forEach(r => {
    if (r && (txt(r.label) || txt(r.words))) {
      const row = { label: txt(r.label), words: txt(r.words) };
      if (cardNum(r.value) !== null) row.value = cardNum(r.value);
      out.unique.push(row);
    }
  });
  return out;
}
/* What a card still needs before it can go in the library, in plain words. An empty list: it is ready. */
function cardCheck(raw, units) {
  const c = cardClean(raw),
    T = window.CARD_TEMPLATE,
    need = [];
  if (!c.bank) need.push("The bank");
  if (!c.n) need.push("The name of the card");
  if (c.fee === null || c.fee < 0) need.push("The yearly fee (type 0 for no fee)");
  if (c.amt !== null && c.amt < 0) need.push("A welcome offer of 0 or more");
  if (c.amt !== null && c.amt > 0 && (c.spend === null || c.spend < 0))
    need.push("The spending that the welcome offer needs (type 0 for none)");
  if (c.amt !== null && c.amt > 0 && !(c.months > 0)) need.push("The months to do that spending");
  if (units && !units[c.unit]) need.push("The kind of points");
  if (!T.bands.some(b => b[0] === c.min)) need.push("The credit it usually needs");
  if (!c.source) need.push("Where you read this (a page or a link)");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.checked)) need.push("The date you looked at it");
  return need;
}
/* The switches that are on for a card, with the label and the detail: [{ k, l, g, words }]. */
function cardToggles(card) {
  const has = Object.assign({}, (card && card.has) || {});
  if (card && card.biz) has.biz = true;
  if (card && card.upTo) has.upTo = true;
  return window.CARD_TEMPLATE.toggles
    .filter(t => has[t.k])
    .map(t => ({ k: t.k, l: t.l, g: t.g, words: ((card.hasWords || {})[t.k] || "").trim() }));
}
/* One library from the cards of the file and the cards that the admin added. A card of the admin with
   the same id takes the place of the card of the file. A card marked hidden is left out. */
function cardMerge(base, extra) {
  const by = {},
    order = [];
  (base || []).concat(extra || []).forEach(c => {
    if (!c || !c.id) return;
    if (!(c.id in by)) order.push(c.id);
    by[c.id] = c;
  });
  return order.map(id => by[id]).filter(c => !c.hidden);
}
/* WHAT A CARD EARNS IN A YEAR. spend is { category: dollars a month }, and other is the dollars a month
   in no category. Returns { sum, rows: [{ cat, year, x, capped, earned }] }. "earned" is dollars times the
   rate: for a cash card it is cents (3 means 3%), for a points card it is points. A limit counts: the rate
   x on the first dollars, then the rate after it. A pick goes to the categories of its list where the
   player spends most and the card has no better rate. */
function cardEarnYear(card, spend, other) {
  const e = (card && card.earn) || {},
    base = cardNum(e.base) === null ? 1 : cardNum(e.base),
    times = { year: 1, quarter: 4, month: 12 },
    fixed = {},
    rows = [];
  (e.rates || []).forEach(r => (fixed[r.cat] = r));
  const cats = Object.keys(spend || {}).filter(k => (spend[k] || 0) > 0),
    picked = {};
  (e.picks || []).forEach(p => {
    cats
      .filter(k => p.from.includes(k) && !picked[k] && !(fixed[k] && fixed[k].x >= p.x))
      .sort((a, b) => spend[b] - spend[a])
      .slice(0, p.count)
      .forEach(k => (picked[k] = p));
  });
  /* The dollars that a limit has left. Rows with the same letter in "share" use one limit together, and
     so do the categories of one pick. The category with the highest rate uses the limit first. */
  const left = new Map(),
    rule = k => picked[k] || fixed[k] || null,
    done = {};
  cats
    .slice()
    .sort((a, b) => ((rule(b) || {}).x || 0) - ((rule(a) || {}).x || 0))
    .forEach(k => {
      const r = rule(k),
        year = spend[k] * 12;
      let earned = year * base,
        x = base,
        capped = false;
      if (r) {
        x = r.x;
        const key = r.cap && r.share ? "share:" + r.share : r,
          room = r.cap ? (left.has(key) ? left.get(key) : r.cap * times[r.per || "year"]) : Infinity,
          at = Math.min(year, room),
          after = r.then === undefined || r.then === null ? base : r.then;
        if (r.cap) left.set(key, room - at);
        capped = at < year;
        earned = at * r.x + (year - at) * after;
      }
      done[k] = { cat: k, year, x, capped, earned };
    });
  cats.forEach(k => rows.push(done[k]));
  if (other > 0) rows.push({ cat: "", year: other * 12, x: base, capped: false, earned: other * 12 * base });
  return { sum: rows.reduce((t, r) => t + r.earned, 0), rows };
}
