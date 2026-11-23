/* ============================================================================
   SLAM the Game: tools/game_cards_build.mjs
   PURPOSE     Make game/data/cards2026.js again: the card library of the card vault. One full
               template record (game/data/cardtemplate.js) for each card.
   USAGE       node tools/game_cards_build.mjs
               npx prettier --write game/data/cards2026.js
   INPUT       tools/game_cards_more.json, when it is there (the researched fields of the cards that
               have the offer only, keyed by the id of the card).
               data/library/card-offers.json (the dated offers of the Slam web app: 93 cards) and
               data/library/cards.json (its rewards layer: fees, earn rates, credits, benefits of 67
               of those cards).
   OUTPUT      game/data/cards2026.js (window.CARDS2026).
   RULES       The keys id, bank, n, fee, amt, unit, spend, months, min, fee1, ends, biz, upTo and
               spendKnown come from the offers layer and keep their meaning: saved games name a card
               by its id. A thing with no switch in the template goes in "unique". Each card names its
               source and the date that a person looked at it.
   ========================================================================= */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = f => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
const O = read("data/library/card-offers.json");
const LIB = read("data/library/cards.json");
const byId = Object.fromEntries(LIB.cards.map(c => [c.id, c]));

/* The categories that the template has. A rate in a different category goes in "unique". */
const CATS = [
  "dining", "groceries", "gas", "transit", "travel", "travelPortal", "hotelPortal", "airline", "hotel", "streaming",
  "drugstore", "phone", "entertainment", "home", "online", "amazon", "delivery", "rotating", "pick", "store",
];
const CAT_WORDS = { applePay: "paid with Apple Pay" };
/* THE LIMITS AND THE PICKS OF ONE CARD, where the rewards layer has them as words only, or as a yearly number
   that is a limit for each quarter or month. Each number comes from the words of the card in the rewards layer.
     limit: { category: [dollars, "year" | "quarter" | "month"] }   the limit of a rate, or of a pick ("pick")
     count: { pick: n }                                             how many categories the player picks
     share: { x, from, cap, per }                                   categories with one limit together
     add:   [{ cat, cap, per }]                                     a limit that the words give and the data does not
     words: [label, words]                                          a thing that still fits no field */
const RULES = {
  "chase-freedom-flex": { limit: { rotating: [1500, "quarter"] } },
  "discover-it-cash-back": { limit: { rotating: [1500, "quarter"] } },
  "chase-marriott-boundless": { share: { x: 3, from: ["groceries", "gas", "dining"], cap: 6000, per: "year" } },
  "discover-it-chrome": { share: { x: 2, from: ["gas", "dining"], cap: 1000, per: "quarter" } },
  "discover-it-secured": { share: { x: 2, from: ["gas", "dining"], cap: 1000, per: "quarter" } },
  "citi-custom-cash": { limit: { pick: [500, "month"] } },
  "bofa-customized-cash": {
    limit: { pick: [2500, "quarter"], groceries: [2500, "quarter"] },
    words: ["One limit for two rates", "The 3% and the 2% share one limit of $2,500 a quarter. The game counts a limit for each rate, so it can count a little too much."],
  },
  "bofa-customized-cash-secured": {
    limit: { pick: [2500, "quarter"], groceries: [2500, "quarter"] },
    words: ["One limit for two rates", "The 3% and the 2% share one limit of $2,500 a quarter. The game counts a limit for each rate, so it can count a little too much."],
  },
  "usb-cash-plus": { limit: { pick: [2000, "quarter"] }, count: { pick: 2 } },
  "usb-altitude-go": { limit: { dining: [2000, "quarter"] } },
  "usb-altitude-connect": { limit: { gas: [1000, "quarter"] } },
  "amex-platinum": { add: [{ cat: "airline", cap: 500000, per: "year" }] },
  "citi-strata": { words: ["A category you pick", "3x in one category you pick (streaming by default). The list of choices is on the page of the bank."] },
  "usb-smartly": { words: ["A higher rate with savings", "Up to 4% with qualifying US Bank savings balances, on the first $10,000 of a billing cycle. The game counts 2%."] },
};
/* THE BRAND OF A RATE. The rate "airline", "hotel" or "store" of these cards is for one brand only. A card
   with such a rate and no brand here earns it at each airline or hotel (for example "flights booked direct"). */
const BRAND_LIST = {
  airline: {
    United: ["chase-united-explorer", "chase-united-quest", "United Gateway", "United Club", "United Business", "United Club Business"],
    Southwest: ["chase-southwest-plus", "chase-southwest-priority", "Southwest Premier", "Southwest Premier Business", "Southwest Performance Business"],
    "Air Canada": ["Aeroplan"],
    "British Airways, Iberia or Aer Lingus": ["British Airways Visa Signature", "Iberia Visa Signature", "Aer Lingus Visa Signature"],
    Delta: ["amex-delta-gold"],
    "American Airlines": ["citi-aadvantage-platinum"],
  },
  hotel: {
    Marriott: ["chase-marriott-boundless", "Marriott Bonvoy Bold", "Marriott Bonvoy Bountiful"],
    IHG: ["chase-ihg-premier", "IHG One Rewards Traveler", "IHG One Rewards Premier Select", "IHG One Rewards Business"],
    Hyatt: ["chase-world-of-hyatt", "World of Hyatt Business"],
    Hilton: ["amex-hilton-honors"],
  },
  store: {
    Disney: ["Disney Premier Visa", "Disney Inspire Visa"],
    Instacart: ["Instacart Mastercard"],
    "Kohl's": ["capone-kohls"],
    Costco: ["citi-costco"],
    "Best Buy": ["citi-best-buy"],
    Target: ["td-target-circle"],
    "Lowe's": ["synchrony-lowes"],
  },
};
const MORE_FILE = "tools/game_cards_more.json";
const MORE = fs.existsSync(path.join(root, MORE_FILE)) ? read(MORE_FILE) : {};
const NETWORK = { Amex: "American Express", Store: "" };
const BENEFITS = ["rental", "tripCancel", "tripDelay", "baggage", "cellPhone", "purchase", "warranty", "lounge"];
const CREDIT_SWITCH = { trusted: "trusted", bag: "bag", bags: "bag", night: "night" };
const CHASE_READ = "2026-11-14"; /* the offers layer: "Review sites read on 2026-11-14 (Chase)" */
const dollars = n => "$" + Number(n).toLocaleString("en-US");

function record(x) {
  const b = x.bonus || {},
    lib = x.cardId ? byId[x.cardId] : null,
    d = {
      id: x.cardId || x.name,
      bank: x.issuer,
      n: x.name,
      network: lib ? (lib.network in NETWORK ? NETWORK[lib.network] : lib.network) : "",
      fee: x.annualFee || 0,
      amt: b.amount == null ? null : b.amount,
      unit: b.unit,
      spend: x.spend || 0,
      months: x.months || 3,
      min: x.minScore,
    };
  if (x.business) d.biz = 1;
  if (x.firstYearFee != null) d.fee1 = x.firstYearFee;
  if (x.ends) d.ends = x.ends;
  if (x.upTo) d.upTo = 1;
  if (x.spendKnown === false) d.spendKnown = false;
  const has = {},
    words = {},
    unique = [],
    on = (k, w) => {
      has[k] = true;
      if (w) words[k] = w;
    };
  d.earn = { base: 1, rates: [], picks: [], words: x.earnWords || "" };
  d.credits = [];
  if (b.words) unique.push({ label: "The welcome offer in words", words: b.words });
  if (x.conflict) unique.push({ label: "Where the sources differ", words: x.conflict });
  if (x.skip) unique.push({ label: "Why no dollar value", words: x.skip });
  if (O.unlocksTransfers.includes(d.id)) on("transfer", "Holding this card lets Chase points move to airlines and hotels");
  if (lib) {
    const r = lib.rewards || {};
    d.earn.base = r.base == null ? 1 : r.base;
    d.earn.words = r.words || "";
    const rule = RULES[d.id] || {},
      base = d.earn.base,
      shared = rule.share || null;
    (r.rates || []).forEach(t => {
      const lim = (rule.limit && rule.limit[t.cat]) || (t.capYear ? [t.capYear, "year"] : null), /* t.cat is "pick" or "pick2" for a pick */
        cap = lim ? { cap: lim[0], per: lim[1], then: base } : {};
      if (shared && shared.from.includes(t.cat)) return; /* these categories share one limit: one pick below */
      if (t.oneOf) d.earn.picks.push(Object.assign({ x: t.x, count: (rule.count && rule.count[t.cat]) || 1, from: t.oneOf.filter(k => CATS.includes(k)) }, cap));
      else if (CATS.includes(t.cat)) d.earn.rates.push(Object.assign({ cat: t.cat, x: t.x }, cap));
      else unique.push({ label: t.x + "x " + (CAT_WORDS[t.cat] || t.cat), words: "", value: t.x });
    });
    if (shared) d.earn.picks.push({ x: shared.x, count: shared.from.length, from: shared.from, cap: shared.cap, per: shared.per, then: base });
    if (r.rotating) {
      const lim = (rule.limit && rule.limit.rotating) || [r.rotating.capYear, "year"];
      d.earn.rates.push({ cat: "rotating", x: r.rotating.x, cap: lim[0], per: lim[1], then: base });
    }
    (rule.add || []).forEach(a => {
      const row = d.earn.rates.find(q => q.cat === a.cat);
      if (row) Object.assign(row, { cap: a.cap, per: a.per, then: base });
    });
    if (rule.words) unique.push({ label: rule.words[0], words: rule.words[1] });
    if (r.kind) unique.push({ label: "What it earns", words: r.kind });
    if (r.note) unique.push({ label: "About the points", words: r.note });
    if (/transfer partners/i.test(r.note || "")) on("transfer", words.transfer || "Transfer partners can be worth more than the floor value");
    BENEFITS.forEach(k => {
      const v = lib.benefits && lib.benefits[k];
      /* a benefit is one line of words, or an object with its words and its limits */
      if (v) on(k, typeof v === "string" ? v : v.words || "");
    });
    if (lib.foreignFee === 0) on("noForeignFee");
    else if (lib.foreignFee > 0) unique.push({ label: "Foreign transaction fee", words: Math.round(lib.foreignFee * 1000) / 10 + "% of each purchase abroad" });
    if (lib.intro)
      on(
        "intro0",
        [
          lib.intro.purchases ? lib.intro.purchases + " months on purchases" : "",
          lib.intro.transfers ? lib.intro.transfers + " months on balance transfers" : "",
        ]
          .filter(Boolean)
          .join(", ")
      );
    if (lib.secured) on("secured", lib.deposit || "");
    if (lib.store) on("store", lib.store);
    if (lib.starter) on("starter");
    (lib.credits || []).forEach(k => {
      d.credits.push({ name: k.name, value: k.value || 0, words: k.words || "" });
      if (CREDIT_SWITCH[k.id]) on(CREDIT_SWITCH[k.id], k.words || "");
    });
    if (lib.network === "Store") unique.push({ label: "Where it works", words: "A store card: it works at " + (lib.store || "its store") + " only" });
    if (Array.isArray(lib.apr)) unique.push({ label: "Usual interest rate (APR)", words: lib.apr[0] + "% to " + lib.apr[1] + "% a year, as a hint. Your own rate is on your statement" });
    if (lib.aprNote) unique.push({ label: "Paying it off", words: lib.aprNote });
    if (lib.note) unique.push({ label: "Note", words: lib.note });
    if ((lib.unverified || []).length) unique.push({ label: "Not read again on the bank's page", words: lib.unverified.join("; ") });
    d.source = "The card: " + lib.source + " (" + lib.verified + "). The offer: " + (x.sources || []).join("; ");
    d.checked = lib.checked;
  } else {
    d.source = "The offer: " + (x.sources || []).join("; ") + " (" + x.verified + ")";
    d.checked = x.read || (x.issuer === "Chase" ? CHASE_READ : O.asOf);
  }
  d.has = has;
  d.hasWords = words;
  d.unique = unique;
  /* the cards with the offer only: the researched fields of tools/game_cards_more.json, when the file is there */
  const m = MORE[d.id];
  if (m) {
    if (m.network != null) d.network = m.network;
    if (m.has) d.has = Object.assign({}, d.has, m.has);
    if (m.hasWords) d.hasWords = Object.assign({}, d.hasWords, m.hasWords);
    if (m.earn) d.earn = Object.assign({ base: 1, rates: [], picks: [], words: d.earn.words }, m.earn);
    if (m.credits) d.credits = m.credits;
    if (m.unique) d.unique = d.unique.concat(m.unique);
    if (m.source) d.source = "The card: " + m.source + ". " + d.source;
    if (m.checked) d.checked = m.checked;
  }
  /* the brand of the rates "airline", "hotel" and "store", where the rate is for one brand */
  const brand = {};
  Object.keys(BRAND_LIST).forEach(kind =>
    Object.keys(BRAND_LIST[kind]).forEach(name => {
      if (BRAND_LIST[kind][name].includes(d.id) && d.earn.rates.some(q => q.cat === kind)) brand[kind] = name;
    })
  );
  if (Object.keys(brand).length) d.brand = brand;
  return d;
}

const units = Object.fromEntries(
  Object.entries(O.units).map(([k, v]) => [k, { n: v.name, v: v.value, cash: !!(k === "cash" || v.cashable) }])
);
const R = O.rules.chase524;
const offers = O.offers.map(record);
const ids = offers.map(o => o.id);
if (new Set(ids).size !== ids.length) throw new Error("two cards have the same id");
const data = {
  asOf: O.asOf,
  source: O.source,
  cardsAsOf: LIB.asOf,
  cardsSource: LIB.source,
  note: "Welcome offers change each month. Each offer here came from a review site, not from an application page. Look at the offer on the bank's own page before you apply.",
  rule: { issuer: R.issuer, slots: R.slots, months: R.months, words: R.words, businessCardsCount: false, source: R.source, date: R.date },
  scoreBands: { good: O.scoreBands.good, excellent: O.scoreBands.excellent, source: O.scoreBands.source },
  units,
  offers,
};
const header = `/* ============================================================================
   SLAM the Game: data/cards2026.js
   PURPOSE     Data only. The card library of the card vault (features/vault.js): ${offers.length} cards at 12 US
               banks. Each card is one full record of the template (data/cardtemplate.js): the yearly
               fee, the welcome offer, the spending it needs, the months, the credit it usually needs,
               the network, the switches (has) with their details, the earn rates by category, the
               yearly credits, "What is unique", and its source with the date a person looked at it.
               Also: a floor value for each kind of point, the 5/24 rule of Chase, the score bands.
               No logic.
   INPUT       Nothing.
   OUTPUT      window.CARDS2026.
   SOURCE      The offers layer of the Slam web app (data/library/card-offers.json, version ${O.version},
               as of ${O.asOf}): review sites read on 2026-11-14 (Chase) and 2026-11-15 (the other
               banks). No offer was confirmed on an application page. The rewards layer of the Slam
               web app (data/library/cards.json, version ${LIB.version}, as of ${LIB.asOf}): the pages of the
               banks first, for ${LIB.cards.length} of the cards. The other ${offers.length - LIB.cards.length} cards have the offer only. The 5/24
               rule is reported by cardholders and review sites. Chase does not publish it (read
               2026-11-14). The point values are floor assumptions of SLAM.
   RULES       This file is generated. Do not edit it. Run: node tools/game_cards_build.mjs, then
               npx prettier --write game/data/cards2026.js. Offers change each month. The screen shows
               the date of this file, and tells the player to look at the page of the bank before they
               apply. amt null: the sources do not agree, and no dollar value is counted. A card that
               the admin adds (the table card_library) takes the place of a card here with the same id.
   ========================================================================= */
window.CARDS2026 = `;
fs.writeFileSync(path.join(root, "game/data/cards2026.js"), header + JSON.stringify(data, null, 1) + ";\n");
console.log(Object.keys(MORE).length ? MORE_FILE + ": " + Object.keys(MORE).filter(k => ids.includes(k)).length + " cards merged." : MORE_FILE + ": not there, nothing merged.");
console.log(offers.length + " cards, " + offers.filter(o => byId[o.id]).length + " with the rewards layer.");
