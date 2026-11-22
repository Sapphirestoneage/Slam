/* ===== engine2: game mechanics that ARE the data entry. Pure logic, no screen code. ===== */
const nice$ = x => {
  const s = x < 200 ? 10 : x < 1000 ? 50 : x < 5000 ? 100 : x < 20000 ? 500 : x < 100000 ? 1000 : 5000;
  return Math.max(0, Math.round(x / s) * s);
};
/* Higher or Lower: find a number in 3 or 4 taps, and keep the range, not a fake exact figure */
function hlNew(typ) {
  const a = nice$(Math.max(20, typ || 0)) || 20;
  return { lo: 0, hi: null, n: 0, b: 0, ask: a, done: false };
}
function hlStep(h, ans) {
  const a = h.ask;
  if (ans === "about") {
    const st = a < 200 ? 10 : a < 1000 ? 50 : a < 5000 ? 100 : a < 20000 ? 500 : a < 100000 ? 1000 : 5000;
    h.lo = Math.max(0, Math.floor((a * 0.9) / st) * st);
    h.hi = Math.ceil((a * 1.1) / st) * st;
    if (h.hi <= h.lo) h.hi = h.lo + st;
    h.done = true;
    return h;
  }
  if (ans === "less") h.hi = a;
  else h.lo = a;
  h.n++;
  if (h.hi != null) h.b++;
  const nxt = h.hi == null ? nice$(h.lo * (h.n >= 3 ? 4 : 2)) : nice$((h.lo + h.hi) / 2);
  if (
    h.n >= 9 ||
    (h.hi != null && (h.b >= 4 || h.hi - h.lo <= Math.max(20, (0.3 * (h.lo + h.hi)) / 2))) ||
    nxt <= h.lo ||
    (h.hi != null && nxt >= h.hi)
  ) {
    if (h.hi == null) h.hi = nice$(h.lo * 1.5);
    h.done = true;
  } else h.ask = nxt;
  return h;
}
function l1Numbers(c) {
  const o = [],
    add = (k, n, q, per, typ, ok, zero) =>
      o.push({ k, n, q, per, typ: Math.max(0, Math.round(typ)), ok: !!ok, zero: !!zero });
  add(
    "take",
    "Money coming in",
    "Everything that lands in a normal month, after taxes.",
    "a month",
    rsum(c.incs.filter(r => !r.partner)),
    isSharp(c, "take")
  );
  c.spends.forEach((r, i) =>
    add("spend:" + i, r.k, "What goes to " + r.k.toLowerCase() + " in a normal month.", "a month", r.amt, r.s, true)
  );
  add(
    "cash",
    "Cash you could reach today",
    "Checking, savings and cash on hand, all together.",
    "in total",
    rsum(c.cashes.filter(r => !r.hold)),
    isSharp(c, "cash"),
    true
  );
  if (c.debts.length)
    add(
      "debt",
      "What you owe",
      "Cards, loans and money owed to people. Not a mortgage.",
      "in total",
      rsum(c.debts),
      isSharp(c, "debt"),
      true
    );
  if (c.invs.length)
    add(
      "inv",
      "What you have invested",
      "Retirement accounts and investments, all together.",
      "in total",
      rsum(c.invs),
      isSharp(c, "inv"),
      true
    );
  return o;
}
function l1Apply(c, k, lo, hi, cf) {
  const X = (c.x = c.x || {}),
    mid = lo === hi ? lo : nice$((lo + hi) / 2);
  X.rng = X.rng || {};
  X.rng[k] = { lo, hi, cf, d: todayISO() };
  const scale = (rows, tot) => {
    const s = rsum(rows);
    rows.forEach((r, i) => {
      r.amt = s > 0 ? Math.round((r.amt / s) * tot) : i === 0 ? tot : 0;
      r.s = true;
      r.cf = cf;
    });
  };
  if (k === "take")
    scale(
      c.incs.filter(r => !r.partner),
      mid
    );
  else if (k === "cash")
    scale(
      c.cashes.filter(r => !r.hold),
      mid
    );
  else if (k === "debt") scale(c.debts, mid);
  else if (k === "inv") scale(c.invs, mid);
  else {
    const r = c.spends[+k.split(":")[1]];
    if (r) {
      r.amt = mid;
      r.s = true;
      r.cf = cf;
    }
  }
  syncAll(c);
  return mid;
}
function roughOnes(c) {
  const R0 = (c.x || {}).rng || {},
    ns = l1Numbers(c);
  return Object.keys(R0)
    .filter(k => R0[k].cf < 3)
    .map(k => Object.assign({ k, n: (ns.find(x => x.k === k) || {}).n || k }, R0[k]));
}
const CF_N = { 1: "Close", 2: "Close", 3: "Exact" };
/* Inventory: the gear a money life runs on */
const GEAR = [
  {
    id: "income",
    n: "Income",
    d: "Money coming in on a regular basis.",
    have: c => (c.take > 0 && c.work !== "Between jobs" ? true : null),
  },
  {
    id: "checking",
    n: "Checking account",
    d: "Where money lands and bills get paid.",
    have: c => c.cashes.some(r => /Checking/i.test(r.k)) || null,
  },
  {
    id: "savings",
    n: "Savings account",
    d: "A separate place for money you aren't spending.",
    have: c => c.cashes.some(r => /Saving/i.test(r.k)) || null,
  },
  {
    id: "efund",
    n: "Emergency fund",
    d: "At least $1,000 you could reach today.",
    have: (c, d) => (c.placed ? d.cash >= 1000 : null),
  },
  {
    id: "health",
    n: "Health insurance",
    d: "Any plan that covers you right now.",
    have: c => (c.prot && c.prot.health ? c.prot.health !== "None right now" : null),
  },
  {
    id: "retire",
    n: "Retirement account",
    d: "A 401k, IRA or anything like them.",
    have: c => c.invs.some(r => /Retirement|IRA/i.test(r.k)) || null,
  },
  {
    id: "card",
    n: "Credit card",
    d: "Any card in your name, paid off or not.",
    have: c => c.debts.some(r => /card/i.test(r.k)) || null,
  },
  {
    id: "score",
    n: "Credit score",
    d: "You know roughly what yours is.",
    have: c => (c.caught && c.caught.score ? true : null),
  },
  {
    id: "renters",
    n: "Renters or home insurance",
    d: "Covers your stuff and your place.",
    p: "renters",
    have: c =>
      c.prot && c.prot.renters ? (c.prot.renters === "Yes" ? true : c.prot.renters === "No" ? false : null) : null,
  },
  {
    id: "car",
    n: "Car insurance",
    d: "If you drive.",
    p: "car",
    when: c => !(c.prot && c.prot.car === "No car"),
    have: c => (c.prot && c.prot.car ? (c.prot.car === "Yes" ? true : c.prot.car === "No" ? false : null) : null),
  },
  {
    id: "disab",
    n: "Disability insurance",
    d: "Pays you if you can't work for a while.",
    p: "disab",
    when: c => c.work !== "Retired" && c.work !== "Student",
    have: c => (c.prot && c.prot.disab ? (c.prot.disab === "Yes" ? true : c.prot.disab === "No" ? false : null) : null),
  },
  {
    id: "life",
    n: "Life insurance",
    d: "If anyone depends on your income.",
    p: "life",
    when: c => c.deps && c.deps !== "None",
    have: c => (c.prot && c.prot.life ? (c.prot.life === "Yes" ? true : c.prot.life === "No" ? false : null) : null),
  },
  { id: "will", n: "A will or named beneficiaries", d: "Who gets what if something happens to you." },
  { id: "vault", n: "Accounts and papers in one place", d: "Someone you trust could find everything." },
];
function gearState(c, d) {
  c.gear = c.gear || {};
  return GEAR.filter(g => !g.when || g.when(c)).map(g => {
    let v = c.gear[g.id];
    if (v == null && g.have) {
      const h = g.have(c, d || derive(c));
      if (h === true) v = "have";
      else if (h === false) v = "none";
    }
    return { g, v: v || null };
  });
}
function gearScore(c, d) {
  const s = gearState(c, d),
    have = s.filter(x => x.v === "have").length;
  return {
    have,
    total: s.length,
    unknown: s.filter(x => x.v == null).length,
    unsure: s.filter(x => x.v === "?").length,
    empty: s.filter(x => x.v === "none"),
    pct: Math.round((have / Math.max(1, s.length)) * 100),
    all: s,
  };
}
function gearSet(c, id, v) {
  c.gear = c.gear || {};
  c.gear[id] = v;
  const g = GEAR.find(x => x.id === id);
  c.prot = c.prot || {};
  if (g && g.p && v !== "?") c.prot[g.p] = v === "have" ? "Yes" : "No";
  if (id === "health" && v === "none") c.prot.health = "None right now";
}
/* Party: the people in your money world, and how money moves between you */
const PARTY_K = ["Partner", "Roommate", "Parent", "Kid", "Sibling", "Friend", "Pet", "Someone else"],
  PARTY_DEP = { Kid: 1, Pet: 1 };
const PARTY_L = [
  ["split", "We split bills"],
  ["theypay", "They cover some of my costs"],
  ["ipay", "I cover some of theirs"],
  ["iowe", "I owe them money"],
  ["theyowe", "They owe me money"],
  ["joint", "We share an account"],
  ["none", "No money moves between us"],
];
const PARTY_LN = {
  split: "Split bills",
  theypay: "Covers some of yours",
  ipay: "You cover some of theirs",
  iowe: "You owe them",
  theyowe: "They owe you",
  joint: "Shared account",
  none: "No money between you",
  cost: "Costs about",
};
const PARTY_AMT = {
    theypay: "About how much do they cover each month?",
    ipay: "About how much do you cover for them each month?",
    iowe: "About how much do you owe them?",
    theyowe: "About how much do they owe you?",
  },
  PARTY_MO = { theypay: 1, ipay: 1, cost: 1 };
function partyApply(c) {
  const P = c.party || [],
    X = (c.x = c.x || {}),
    sum = k => P.reduce((a, p) => a + ((p.amt || {})[k] || 0), 0);
  X.help = sum("theypay");
  X.owedMe = sum("theyowe");
  const sup = sum("ipay");
  if (sup > 0 || X.fixedParty) {
    X.fixed = Math.min(c.spend, Math.max(0, (X.fixed || 0) - (X.fixedParty || 0) + sup));
    X.fixedParty = sup;
  }
  const kids = P.filter(p => p.k === "Kid").length;
  if (kids && !(X.done && X.done.kids)) X.kids = kids;
  const owe = sum("iowe");
  let r = c.debts.find(x => x.party) || c.debts.find(x => /famil|friend/i.test(x.k));
  if (owe > 0) {
    if (!r) {
      r = { k: "Owed to family or friends", amt: 0, s: true, high: false, apr: "No interest", rate: 0, party: true };
      c.debts.push(r);
    }
    r.amt = owe;
    r.s = true;
  } else if (r && r.party) c.debts = c.debts.filter(x => !x.party);
  syncAll(c);
}
function partyLean(c) {
  const X = c.x || {},
    M = c.take - c.spend;
  return X.help > 0 ? { help: X.help, without: M - X.help } : null;
}
/* Fog of war: how much of the picture is known. Every patch is cleared by an answer. */
const FOG_X = [];
function fogPatches(c, d) {
  d = d || derive(c);
  const X = c.x || {},
    gs = gearScore(c, d),
    P = [],
    add = (id, n, ok, a, v) => P.push({ id, n, ok: !!ok, a: a || null, v: v == null ? "" : v });
  add("you", "You", true);
  add("take", "Money in", isSharp(c, "take"), "hl", "take");
  c.spends.forEach((r, i) => add("sp" + i, r.k, r.s, "hl", "spend:" + i));
  add("cash", "Cash", isSharp(c, "cash"), "hl", "cash");
  if (c.debts.length) add("debt", "What you owe", isSharp(c, "debt"), "hl", "debt");
  if (c.invs.length) add("inv", "Investments", isSharp(c, "inv"), "hl", "inv");
  add("gear", "Your gear", gs.unknown === 0, "gear");
  add("party", "Your people", !!(c.l1 && c.l1.party), "party");
  if (isEmployee(c)) add("match", "Work match", !!c.sharp.match, "sharp", "match");
  if (c.invs.length) add("tax", "Tax-smart accounts", !!c.sharp.tax, "sharp", "tax");
  add("pay", "When you get paid", c.payKnown, "payday");
  add("life", "Life details", lifeQs(c).length === 0, "life");
  add("hours", "Your hours", !!(c.hrs && c.hrs.s), "hrs");
  add("tprice", "Your time prices", !!c.tp, "tp");
  add("goals", "Things you want", (c.goals || []).length > 0, "gadd");
  FOG_X.forEach(f => f(c, d, add));
  add("solid", "Close numbers made exact", Object.keys(X.rng || {}).length > 0 && roughOnes(c).length === 0, "rough");
  return P;
}
function fogPct(c, d) {
  const p = fogPatches(c, d);
  return Math.round((p.filter(x => x.ok).length / p.length) * 100);
}
/* Layers and bonfires: finishing a layer is a save point */
const LAYER_N = { 1: "Broad", 2: "Sorting", 3: "Make it exact", 4: "Coming back" },
  LAYER_X = { 2: [], 3: [], 4: [] };
const UNLOCK = {
  1: [
    "Your era, on real numbers",
    "Dates for every goal and era",
    "Try a move, on your own numbers",
    "Layer 2: the sorting games",
  ],
  2: ["Your Joy score", "Your cash-flow calendar", "Your top three priorities", "Layer 3: make it exact"],
  3: ["Exact numbers everywhere", "Subscriptions you chose on purpose", "Layer 4: the games that bring you back"],
  4: ["The Yearly Review", "Your ghost: last month's you to race"],
};
function layers(c, d) {
  d = d || derive(c);
  const gs = gearScore(c, d),
    ns = l1Numbers(c),
    L = [];
  L.push({
    n: 1,
    parts: [
      { n: "Your gear", ok: !!(c.l1 && c.l1.gear), a: "l1" },
      { n: "Your people", ok: !!(c.l1 && c.l1.party), a: "l1" },
      {
        n: "Higher or lower",
        ok: ns.every(x => x.ok) && (!isEmployee(c) || !!c.sharp.match) && (!c.invs.length || !!c.sharp.tax),
        a: "l1",
      },
    ],
  });
  [2, 3, 4].forEach(n => L.push({ n, parts: LAYER_X[n].map(f => f(c, d)) }));
  L.forEach(l => {
    l.name = LAYER_N[l.n];
    l.done = l.parts.length > 0 && l.parts.every(p => p.ok);
  });
  return L;
}
function bonfireDue(c, d) {
  c.bon = c.bon || {};
  const l = layers(c, d).find(x => x.done && !c.bon[x.n]);
  return l ? l.n : null;
}
