/* ============================================================================
   SLAM the Game: tools/game_cards_build.mjs
   PURPOSE     Make game/data/cards2026.js again: the card library of the card vault. One full
               template record (game/data/cardtemplate.js) for each card.
   USAGE       node tools/game_cards_build.mjs
               npx prettier --write game/data/cards2026.js
   INPUT       data/library/card-offers.json (the dated offers of the Slam web app: 93 cards) and
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
const CAT_WORDS = { applePay: "paid with Apple Pay", pick2: "in a second category you pick" };
const NETWORK = { Amex: "American Express", Store: "" };
const BENEFITS = ["rental", "tripCancel", "tripDelay", "baggage", "cellPhone", "purchase", "warranty", "lounge"];
const CREDIT_SWITCH = { trusted: "trusted", bag: "bag", bags: "bag", night: "night" };
const CHASE_READ = "2026-11-14"; /* the offers layer: "Review sites read on 2026-11-14 (Chase)" */
const dollars = n => "$" + Number(n).toLocaleString("en-US");
const cents = v => {
  const n = Math.round(v * 10000) / 100;
  return n + (n === 1 ? " cent" : " cents");
};

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
  d.earn = { base: 1, rates: [], words: x.earnWords || "" };
  d.credits = [];
  if (b.words) unique.push({ label: "The welcome offer in words", words: b.words });
  if (x.conflict) unique.push({ label: "Where the sources differ", words: x.conflict });
  if (x.skip) unique.push({ label: "Why no dollar value", words: x.skip });
  if (O.unlocksTransfers.includes(d.id)) on("transfer", "Holding this card lets Chase points move to airlines and hotels");
  if (lib) {
    const r = lib.rewards || {};
    d.earn.base = r.base == null ? 1 : r.base;
    d.earn.words = r.words || "";
    (r.rates || []).forEach(t => {
      const cap = t.capYear ? ", on up to " + dollars(t.capYear) + " a year" : "",
        list = t.oneOf ? " (one of: " + t.oneOf.join(", ") + ")" : "";
      if (CATS.includes(t.cat)) d.earn.rates.push({ cat: t.cat, x: t.x });
      else unique.push({ label: t.x + "x " + (CAT_WORDS[t.cat] || t.cat), words: (list + cap).replace(/^[, ]+/, ""), value: t.x });
      if (CATS.includes(t.cat) && (cap || list))
        unique.push({ label: "A limit on the " + t.x + "x rate", words: (list + cap).replace(/^[, ]+/, "").trim() });
    });
    if (r.rotating) {
      d.earn.rates.push({ cat: "rotating", x: r.rotating.x });
      if (r.rotating.capYear)
        unique.push({ label: "A limit on the " + r.rotating.x + "x rate", words: "on up to " + dollars(r.rotating.capYear) + " a year" });
    }
    if (r.kind) unique.push({ label: "What it earns", words: r.kind + (r.pointValue != null ? ", counted at " + cents(r.pointValue) + " each" : "") });
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
console.log(offers.length + " cards, " + offers.filter(o => byId[o.id]).length + " with the rewards layer.");
