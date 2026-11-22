/* ===== year.js: the year. Pluggable calendars, true-expense funds, the look-ahead, the Yearly Review, quiet windows, the chance test. Nothing resets except tax-year items. ===== */
/* ---------- tax-year facts (checked Nov 2026: IRS IR-2026-136, Rev. Proc. 2026-24 and 2026-35) ---------- */
const LIMITS = {
  2026: { ira: 7500, k401: 24500, hsa: [4400, 8750], fsa: [3400, 680] },
  2027: { ira: 7500, k401: 25500, hsa: [4500, 9000], fsa: [3500, 700] },
};
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dfmt = s => {
  const d = parseISO(s);
  return MON[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
};
function YX(c) {
  c.x = c.x || {};
  const X = c.x;
  X.cals = X.cals || {};
  X.funds = X.funds || [];
  X.rev = X.rev || { done: {}, pred: [], cards: [] };
  X.rev.done = X.rev.done || {};
  X.rev.pred = X.rev.pred || [];
  X.rev.cards = X.rev.cards || [];
  return X;
}
/* ---------- calendar engine: each calendar is a plug-in with events(from,days,opt) and seasons ---------- */
const CALS = {};
const nthDow = (y, m, dow, n) => {
  const d = new Date(y, m, 1),
    off = (dow - d.getDay() + 7) % 7;
  return iso(new Date(y, m, 1 + off + (n - 1) * 7));
};
CALS.us = {
  n: "General (US)",
  one: "Thanksgiving, the December holidays, summer and back to school.",
  seasons: [
    ["thanks", "Thanksgiving", 0.08],
    ["dec", "December holidays", 0.25],
    ["summer", "Summer trips", 0.3],
    ["school", "Back to school", 0.1],
  ],
  events(from, days) {
    const o = [],
      a = parseISO(from),
      end = addDays(from, days);
    [a.getFullYear(), a.getFullYear() + 1].forEach(y => {
      [
        ["thanks", "Thanksgiving", nthDow(y, 10, 4, 4)],
        ["dec", "December holidays", y + "-12-25"],
        ["summer", "Summer trips", y + "-07-01"],
        ["school", "Back to school", y + "-08-15"],
      ].forEach(e => {
        if (e[2] >= from && e[2] < end) o.push({ id: e[0], n: e[1], d: e[2], off: [], season: e[0] });
      });
    });
    return o.sort((x, y) => (x.d < y.d ? -1 : 1));
  },
};
const calOn = (c, id) => !!(CALS[id] && adOk(CALS[id]) && YX(c).cals[id] && YX(c).cals[id].on),
  calIds = () =>
    Object.keys(CALS)
      .filter(id => adOk(CALS[id]))
      .sort((a, b) => (CALS[a].ord || 5) - (CALS[b].ord || 5));
function offDays(c, from, days) {
  let o = [];
  Object.keys(CALS).forEach(id => {
    if (calOn(c, id) && CALS[id].off) o = o.concat(CALS[id].off(c, from, days));
  });
  return o;
}
function restWindow(c, now) {
  for (let i = 0; i < REST_X.length; i++) {
    const r = REST_X[i](c, now);
    if (r) return r;
  }
  return null;
}
function calCfg(c, id) {
  const X = YX(c);
  return (X.cals[id] = X.cals[id] || { on: false, cost: {} });
}
function seasonCost(c, id, sid) {
  const k = calCfg(c, id),
    s = CALS[id].seasons.find(x => x[0] === sid),
    real = k.cost && k.cost[sid] != null;
  return { amt: real ? k.cost[sid] : nice$(c.spend * s[2]), real, n: s[1] };
}
function calEvents(c, from, days) {
  let o = [];
  Object.keys(CALS).forEach(id => {
    if (calOn(c, id)) o = o.concat(CALS[id].events(from, days, calCfg(c, id)).map(e => Object.assign({ cal: id }, e)));
  });
  return o.sort((a, b) => (a.d < b.d ? -1 : 1));
}
/* ---------- true expenses: the irregular costs, turned into one steady monthly number ---------- */
const FUND_T = [
  ["Car repairs", 900],
  ["Gifts", 600],
  ["Travel", 1500],
  ["Medical and dental", 800],
  ["Home repairs", 1000],
  ["Yearly subscriptions", 300],
  ["Clothing", 600],
  ["Pets", 500],
  ["Tuition or camp", 3000],
];
const FUND_X = [],
  YEAR_X = [],
  REST_X = [];
const fundSum = c => YX(c).funds.reduce((a, f) => a + f.yr, 0);
const ageOfMoney = (c, d) => (c.spend > 0 ? Math.max(0, Math.round(d.cash / (c.spend / 30))) : 0);
/* ---------- the year ahead, month by month ---------- */
function yearAhead(c, d, today) {
  today = today || todayISO();
  const X = YX(c),
    a = parseISO(today),
    M = [],
    ix = s => {
      const p = parseISO(s);
      return (p.getFullYear() - a.getFullYear()) * 12 + p.getMonth() - a.getMonth();
    };
  for (let i = 0; i < 12; i++) {
    const dt = new Date(a.getFullYear(), a.getMonth() + i, 1);
    M.push({
      i,
      y: dt.getFullYear(),
      m: dt.getMonth(),
      n: MON[dt.getMonth()] + (dt.getMonth() === 0 || i === 0 ? " " + dt.getFullYear() : ""),
      extra: [],
      dip: [],
      note: [],
    });
  }
  const seen = {};
  calEvents(c, today, 366).forEach(e => {
    const k = ix(e.d);
    if (k < 0 || k > 11) return;
    if (e.season && !seen[e.cal + e.season + k]) {
      seen[e.cal + e.season + k] = 1;
      const sc = seasonCost(c, e.cal, e.season);
      M[k].extra.push({ n: e.n, amt: sc.amt, real: sc.real });
    } else if (!e.season) M[k].note.push(e.n + " starts " + dfmt(e.d));
  });
  YEAR_X.forEach(f => f(c, today, ix, M));
  X.funds.forEach(f => {
    if (f.m != null) {
      const k = (f.m - a.getMonth() + 12) % 12;
      M[k].extra.push({ n: f.n, amt: f.yr, real: !!f.s });
    }
  });
  endsOf(c).forEach(e => {
    const k = Math.round(e.yrs * 12);
    if (k >= 0 && k <= 11) M[k].note.push(e.k + " ends: " + money(e.amt) + " a month comes back");
  });
  (c.goals || []).forEach(g => {
    if (g.byDate && !g.done) {
      const k = ix(g.byDate);
      if (k >= 0 && k <= 11) M[k].note.push(g.n + " is due");
    }
  });
  if (X.rev.fee != null) {
    const k = (X.rev.fee - a.getMonth() + 12) % 12;
    M[k].note.push("Card yearly fee hits");
  }
  M.forEach(m => {
    if (m.m === 0) m.note.push("New tax year: limits and deductibles reset");
    if (m.m === 3) m.note.push("April 15: last day for last year's IRA and HSA money");
    if (m.m === 11) m.note.push("Dec 31: last day for this year's 401(k) money. Check your FSA date");
    m.x = m.extra.reduce((s, e) => s + e.amt, 0);
    m.dp = m.dip.reduce((s, e) => s + e.amt, 0);
    m.hit = m.x + m.dp;
  });
  const total = M.reduce((s, m) => s + m.hit, 0),
    spread = X.funds.filter(f => f.m == null).reduce((s, f) => s + f.yr, 0),
    top = M.slice().sort((p, q) => q.hit - p.hit)[0];
  return { M, total, spread, perMonth: Math.round((total + spread) / 12), top: top.hit > 0 ? top : null };
}
/* ---------- tax-year resets ---------- */
function resets(c, today) {
  today = today || todayISO();
  const X = YX(c),
    y = parseISO(today).getFullYear(),
    L = LIMITS[y],
    N = LIMITS[y + 1],
    o = [],
    f = (a, b) => (a ? money(a) + (b ? " · next year " + money(b) : "") : "not announced yet");
  o.push({
    n: "IRA or Roth IRA",
    v: f(L && L.ira, N && N.ira),
    one: "You can still add " + y + " money until Tax Day, April 15, " + (y + 1) + ".",
  });
  o.push({
    n: "401(k) or 403(b)",
    v: f(L && L.k401, N && N.k401),
    one: "Goes through your paycheck, so " + y + " closes on December 31.",
  });
  o.push({
    n: "HSA",
    v: L ? money(L.hsa[0]) + " just you · " + money(L.hsa[1]) + " family" : "not announced yet",
    one:
      "Needs a qualifying health plan. " +
      y +
      " money can go in until Tax Day." +
      (N ? " Next year: " + money(N.hsa[0]) + " and " + money(N.hsa[1]) + "." : ""),
  });
  o.push({
    n: "Health FSA",
    v: L ? money(L.fsa[0]) : "not announced yet",
    one:
      "Use it or lose it. Some plans let up to " +
      (L ? money(L.fsa[1]) : "a set amount") +
      " roll over or give extra weeks. Check your plan's date.",
  });
  o.push({
    n: "Insurance deductibles",
    v: "Reset to zero",
    one: "On most plans this happens January 1. If you've already hit this year's, care is cheapest before then.",
  });
  const cards = X.rev.cards
    .map(k => {
      const drop = new Date(k.y, k.m + 25, 1);
      return { open: MON[k.m] + " " + k.y, drop: iso(drop), live: iso(drop) > today };
    })
    .filter(k => k.live)
    .sort((p, q) => (p.drop < q.drop ? -1 : 1));
  return { y, rows: o, cards, n524: cards.length, next524: cards[0] || null, janNew: parseISO(today).getMonth() === 0 };
}
/* ---------- the reflection clock: January, a birthday, or a date a calendar brings ---------- */
const REV_W = { jan: "January", bday: "My birthday" },
  REV_ONE = { jan: "The calendar new year.", bday: "The first of your birthday month." },
  REV_D = {},
  REV_NOTE = {},
  REV_PK = {};
function revDate(c, today) {
  today = today || todayISO();
  const X = YX(c),
    w = X.rev.when,
    y = parseISO(today).getFullYear();
  if (!w) return null;
  const cand = REV_D[w]
    ? REV_D[w](today)
    : w === "bday"
      ? [y - 1, y, y + 1].map(k => iso(new Date(k, X.rev.bm || 0, 1)))
      : [y - 1, y, y + 1].map(k => k + "-01-01");
  const last = cand.filter(d => d <= today).pop(),
    next = cand.filter(d => d > today)[0];
  return { last, next, due: !!last && X.rev.done[last] == null && today <= addDays(last, 45) };
}
function lookBack(c, d, today) {
  today = today || todayISO();
  const from = addDays(today, -365),
    mv = (c.moves || []).filter(m => m.d >= from),
    paid = mv.filter(m => m.t === "pay").reduce((a, m) => a + (m.amt || 0), 0),
    hs = (c.hist || []).filter(s => s.d >= from),
    first = hs[0],
    tl = timeLedger(c, d),
    earned = c.inv * R;
  return {
    moves: mv.length,
    paid,
    beaten: Object.values((c.x || {}).boss || {}).filter(b => b.beat && b.beat >= from).length,
    nw: first ? Math.round(d.nw - first.nw) : null,
    since: first ? first.d : null,
    earned: Math.round(earned),
    hours: tl.wage > 0 ? Math.round(earned / tl.wage) : null,
    skills: Object.keys(c.skills || {}).length,
    checks: hs.length,
  };
}
/* ---------- the chance test: made-up futures, not history ---------- */
function rng32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function chance(c, d, opt) {
  opt = opt || {};
  d = d || derive(c);
  const at = d.era >= 8 ? 0 : goalSim(c).eraAt[8];
  if (at == null) return null;
  const age = c.age + at / 12,
    yrs = Math.max(1, Math.round(c.death - age)),
    pot0 = Math.max(1, d.era >= 8 ? c.inv : fiNeed(c, age)),
    draw0 = pot0 * SWR,
    rnd = rng32(Math.round(pot0) + yrs * 7919),
    N = opt.n || 600;
  let ok = 0;
  for (let k = 0; k < N; k++) {
    let pot = pot0,
      alive = true;
    for (let y = 0; y < yrs; y++) {
      const u = Math.max(1e-9, rnd()),
        v = rnd(),
        z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v),
        ret = 0.05 + 0.16 * z,
        draw = opt.flex && pot < pot0 * 0.8 ? draw0 * 0.9 : draw0;
      pot = (pot - draw) * (1 + ret);
      if (pot <= 0) {
        alive = false;
        break;
      }
    }
    if (alive) ok++;
  }
  return {
    pct: Math.round((ok / N) * 100),
    age: Math.round(age),
    yrs,
    pot: Math.round(pot0),
    draw: Math.round(draw0 / 12),
  };
}
/* ---------- screens ---------- */
Object.assign(GLOSS, {
  trueexp: [
    "True expenses",
    "Costs that are real but don't come every month: car repairs, gifts, holidays. Add them up for the year, divide by 12, and set that aside monthly. Then none of them is a surprise.",
  ],
  agemoney: [
    "Age of money",
    "How many days your cash would last at your normal spending. The higher it is, the further you are from living paycheck to paycheck.",
  ],
  chance: [
    "Chance test",
    "The game invents hundreds of possible futures for the market, some kind and some rough, and counts how often your money lasts. It's a bell curve, not history, so treat it as a feel and not a promise.",
  ],
  review: [
    "Yearly Review",
    "Once a year: look back, check what's still true, compare with what you expected, see what resets, and look ahead. Nothing in your game resets except tax-year limits.",
  ],
  five24: [
    "5/24",
    "Some card issuers turn you down if you opened 5 or more cards in the last 24 months. Each card drops off the count on the first of the month after it turns two.",
  ],
  seasons: [
    "Seasons of life",
    "Some things are worth more at certain ages. A window is the stretch of life you'd most want this to happen in.",
  ],
});
const tog2 = (a, k, on) =>
    `<div class="seg" style="flex:none"><button class="${on ? "" : "on"}" data-a="${a}" data-k="${k}" data-v="0">Off</button><button class="${on ? "on" : ""}" data-a="${a}" data-k="${k}" data-v="1">On</button></div>`,
  typB = (v, real) => `<b class="${real ? "" : "typ"}">${money(v)}</b>`,
  pmBtn = (a, k, v) =>
    `<span class="row" style="gap:6px"><button class="ghost slim" data-a="${a}" data-k="${k}" data-v="-1">−</button>${v}<button class="ghost slim" data-a="${a}" data-k="${k}" data-v="1">+</button></span>`,
  stepOf = v => (v < 200 ? 10 : v < 1000 ? 50 : v < 5000 ? 100 : 500);
function fundsSheet() {
  const c = C(),
    X = YX(c),
    has = n => X.funds.some(f => f.n === n),
    tot = fundSum(c),
    opts = FUND_T.concat(...FUND_X.map(f => f(c)));
  return (
    head("True expenses " + ib("term:trueexp"), "Costs that don't come monthly") +
    `<div class="small muted">Tap the ones you have. Amounts are per year, and guesses stay faded until you fix them.</div><div class="chips">${opts.map(f => `<button class="chip ${has(f[0]) ? "on" : ""}" data-a="fundtog" data-v="${f[0]}">${f[0]}</button>`).join("")}</div>
 ${X.funds
   .map(
     (f, i) =>
       `<div class="tile stack" style="gap:6px"><div class="row between small"><b>${esc(f.n)}</b>${pmBtn("fundamt", i, typB(f.yr, f.s))}</div><div class="chips">${[
         ["", "Any time"],
       ]
         .concat(MON.map((m, k) => [k, m]))
         .map(
           m =>
             `<button class="chip sm ${String(f.m == null ? "" : f.m) === String(m[0]) ? "on" : ""}" data-a="fundmon" data-k="${i}" data-v="${m[0]}">${m[1]}</button>`
         )
         .join("")}</div></div>`
   )
   .join("")}
 ${tot > 0 ? `<div class="tile"><div class="row between small"><span>All of it, per year</span><b>${money(tot)}</b></div><div class="row between"><span class="small">Set aside each month</span><b data-fid="v:fund">${money(tot / 12)}</b></div><div class="tiny muted">That is the whole trick. ${money(tot / 12)} a month, and none of these lands as a surprise.</div></div>${mathBox([money(tot) + " a year / 12 = " + money(tot / 12) + " a month"])}` : ""}` +
    `<button class="primary wide" data-a="yrdone">Save and close</button>`
  );
}
function aheadSheet() {
  const c = C(),
    ya = yearAhead(c, D),
    mx = Math.max(1, ...ya.M.map(m => m.hit));
  return (
    head("The year ahead", "Your next 12 months") +
    (ya.top
      ? `<div class="tile"><div class="row between small"><span>Biggest month</span><b>${ya.top.n}: about ${money(ya.top.hit)} extra</b></div><div class="row between small"><span>Set aside monthly to cover the year</span><b>${money(ya.perMonth)}</b></div></div>`
      : `<div class="tile small">Nothing extra is on your year yet. Turn on a calendar or add true expenses and the spikes show up here.</div>`) +
    `<div class="stack" style="gap:6px">${ya.M.map(m => `<div class="tile stack" style="gap:3px"><div class="row between small"><b>${m.n}</b><span>${m.hit > 0 ? "+" + money(m.hit) : "A normal month"}</span></div>${m.hit > 0 ? bar((m.hit / mx) * 100) : ""}${m.extra.map(e => `<div class="row between tiny"><span>${esc(e.n)}</span>${typB(e.amt, e.real)}</div>`).join("")}${m.dip.map(e => `<div class="row between tiny"><span>${esc(e.n)}</span><span>${money(e.amt)} less pay</span></div>`).join("")}${m.note.map(n => `<div class="tiny muted">${esc(n)}</div>`).join("")}</div>`).join("")}</div>
 <div class="row" style="gap:6px"><button class="ghost slim" style="flex:1" data-a="cals">Calendars</button><button class="ghost slim" style="flex:1" data-a="funds">True expenses</button></div><button class="primary wide" data-a="yrdone">Save and close</button>`
  );
}
function calsSheet() {
  const c = C(),
    X = YX(c),
    t = todayISO();
  const cal = id => {
    const k = calCfg(c, id),
      K = CALS[id];
    return `<div class="tile stack" style="gap:6px"><div class="row between"><b>${K.n}</b>${tog2("calon", id, k.on)}</div><div class="tiny muted">${K.one}</div>${
      k.on
        ? K.seasons
            .map(s => {
              const sc = seasonCost(c, id, s[0]);
              return `<div class="row between small"><span>${s[1]}</span>${pmBtn("calcost", id + ":" + s[0], typB(sc.amt, sc.real))}</div>`;
            })
            .join("") +
          `<div class="tiny muted">Faded amounts are guesses from your spending. Nudge them to what you really spend.</div>`
        : ""
    }</div>`;
  };
  return (
    head("Calendars", "Your year has seasons") +
    `<div class="small muted">Turn on the calendars your life runs on. Their costly seasons go onto your year, on the right dates, every year.</div>` +
    calIds()
      .map(id => cal(id) + (calCfg(c, id).on && CALS[id].extra ? CALS[id].extra(c, t) : ""))
      .join("") +
    `<button class="primary wide" data-a="yrdone">Save and close</button>`
  );
}
function chanceSheet() {
  const c = C(),
    a = chance(c, D),
    b = chance(c, D, { flex: true });
  if (!a)
    return (
      head("Chance test", "Not yet") +
      `<div class="tile small">The test needs a date for when work becomes optional. Right now nothing is left over each month, so there's no date yet. A move that opens a gap brings the test to life.</div><button class="primary wide" data-a="moves">Try a move</button>`
    );
  return (
    head("Chance test " + ib("term:chance"), "Would the money last?") +
    `<div class="tile"><div class="small muted">Stop needing a paycheck at ${a.age}, with about ${money(a.pot)}, drawing ${money(a.draw)} a month for ${a.yrs} years.</div><div class="bignum" data-fid="v:chance">${a.pct} in 100</div><div class="small muted" style="text-align:center">made-up futures where the money lasts</div>${bar(a.pct)}</div>
 <div class="tile"><div class="row between small"><span>If you spend 10% less in rough years</span><b>${b.pct} in 100</b></div>${bar(b.pct)}<div class="tiny muted">Being able to flex is worth ${Math.max(0, b.pct - a.pct)} more futures out of 100. Flexibility is a real asset.</div></div>
 ${mathBox(["600 invented futures, the same ones every time you look", "Each year's growth is drawn from a bell curve: 5% above inflation on average, swinging about 16%", "Each year you take out " + money(a.draw * 12) + " (4% of the starting pot)", "A future counts if the pot is above zero at " + c.death, "This is not market history. Real markets have longer bad streaks than a bell curve"])}` +
    `<button class="primary wide" data-a="yrdone">Save and close</button>`
  );
}
function yearCards(c, d) {
  const X = YX(c),
    tot = fundSum(c),
    ch = chance(c, d);
  return `<button class="card rowbtn" data-a="funds"><span><b>True expenses</b> <div class="tiny muted">${tot > 0 ? money(tot / 12) + " a month covers " + X.funds.length + " irregular cost" + (X.funds.length === 1 ? "" : "s") : "The costs that don't come monthly"} · your money is about ${ageOfMoney(c, d)} days old</div></span><span>›</span></button><button class="card rowbtn" data-a="chance"><span><b>Chance test</b><div class="tiny muted">${ch ? ch.pct + " in 100 made-up futures hold" : "Wakes up once you have a gap"}</div></span><span>›</span></button>`;
}
function calsCard(c) {
  const X = YX(c),
    on = Object.keys(CALS).filter(id => calOn(c, id)),
    rd = revDate(c);
  return `<div class="card stack" style="gap:6px"><div class="row between"><h3>Your year</h3>${ib("term:review")}</div><button class="rowbtn" data-a="ahead"><span>The year ahead</span><span>›</span></button><button class="rowbtn" data-a="cals"><span>Calendars<div class="tiny muted">${on.length ? on.map(id => CALS[id].n).join(", ") : "None on yet"}</div></span><span>›</span></button><button class="rowbtn" data-a="review"><span>Yearly Review<div class="tiny muted">${rd ? (rd.due ? "Ready when you are" : "Next: " + dfmt(rd.next)) : "Pick your date"}</div></span><span>›</span></button></div>`;
}
function seasonBlock(c, g, sim) {
  const at = sim.goalAt[g.id],
    age = at == null ? null : c.age + at / 12,
    decs = ["20s", "30s", "40s", "50s", "60s", "70s+"].filter((x, i) => (i + 3) * 10 > c.age),
    w = g.win || "",
    end = w ? (w === "70s+" ? 200 : parseInt(w) + 10) : null,
    late = w && age != null && age >= end;
  return `<div class="tile stack" style="gap:6px"><div class="row between small"><span><b>Best season for this</b> ${ib("term:seasons")}</span></div>${chipsRow("win", ["Any time"].concat(decs), w || "Any time", "gseason")}${late ? `<div class="small">On today's numbers this lands at about ${Math.floor(age)}, after your ${w}. Some things don't keep. <button class="ghost slim" data-a="moves">See what moves it up</button></div>` : w && age != null ? `<div class="tiny muted">On track for about age ${Math.floor(age)}, inside your ${w}.</div>` : ""}</div>`;
}
/* the Yearly Review */
const REV_S = ["Pick your date", "Look back", "Still true?", "Past you and now", "What resets", "Look ahead"];
function reviewSheet() {
  const c = C(),
    d = D,
    X = YX(c),
    w = W,
    st = w.step,
    t = todayISO(),
    nxt = l => `<button class="primary wide" data-a="revnext">${l || "Next"}</button>`,
    hd = n => head("Yearly Review · " + n + " of 5 " + ib("term:review"), REV_S[n]);
  if (st === 0)
    return (
      head("Yearly Review", X.rev.when ? "Your review date" : "When should your year turn over?") +
      `<div class="small muted">Tax years turn over on January 1 by themselves. This is your own date for looking back and ahead. Nothing in your game resets.</div><div class="stack" style="gap:6px">${Object.keys(
        REV_W
      )
        .filter(k => !REV_PK[k] || adOn(REV_PK[k]))
        .map(
          k =>
            `<button class="rowbtn ${X.rev.when === k ? "on" : ""}" data-a="revwhen" data-v="${k}"><span><b>${REV_W[k]}</b><div class="tiny muted">${REV_ONE[k] || ""}</div></span><span>${X.rev.when === k ? "✓" : ""}</span></button>`
        )
        .join(
          ""
        )}</div>${X.rev.when === "bday" ? `<div class="small">Which month?</div><div class="chips">${MON.map((m, i) => `<button class="chip sm ${X.rev.bm === i ? "on" : ""}" data-a="revbm" data-v="${i}">${m}</button>`).join("")}</div>` : ""}` +
      (X.rev.when ? nxt("Start the review") : "")
    );
  if (st === 1) {
    const lb = lookBack(c, d),
      row = (a, b) => `<div class="row between small"><span>${a}</span><b>${b}</b></div>`;
    return (
      hd(1) +
      `<div class="tile stack" style="gap:4px">${row("Money moves you logged", lb.moves)}${row("Paid toward debt", money(lb.paid))}${row("Bosses beaten", lb.beaten)}${row("Skills picked up", lb.skills)}${lb.nw != null ? row("Net worth since " + dfmt(lb.since), (lb.nw >= 0 ? "+" : "") + money(lb.nw)) : ""}${row("What your money earns in a year", money(lb.earned))}${lb.hours != null ? row("That is this many hours of your work", lb.hours) : ""}</div><div class="tiny muted">${REV_NOTE[X.rev.when] || "This is just what happened. No grade."}</div>` +
      nxt()
    );
  }
  if (st === 2) {
    const rows = [
      ["job", "Work", c.work, "life"],
      ["home", "Home", c.home, "life"],
      ["people", "Your people", (c.party || []).length + " on your list", "party"],
      ["goals", "Things you want", (c.goals || []).filter(g => !g.done).length + " on your list", "draft"],
    ];
    return (
      hd(2) +
      `<div class="small muted">A year changes things. Tap what's different and the game will take you there at the end.</div>${rows
        .map(
          r =>
            `<div class="stack" style="gap:4px"><div class="small"><b>${r[1]}</b> <span class="tiny muted">${esc(String(r[2]))}</span></div><div class="seg">${[
              ["keep", "Still true"],
              ["chg", "Changed"],
            ]
              .map(
                v =>
                  `<button class="${w.still[r[0]] === v[0] ? "on" : ""}" data-a="revstill" data-k="${r[0]}" data-v="${v[0]}">${v[1]}</button>`
              )
              .join("")}</div></div>`
        )
        .join("")}` +
      nxt()
    );
  }
  if (st === 3) {
    const last = X.rev.pred[X.rev.pred.length - 1],
      guess = Math.round(d.nw + (c.take - c.spend) * 12 + c.inv * R),
      opts = [
        ["Lower", -5000],
        ["About the same", 0],
        ["+$5,000", 5000],
        ["+$10,000", 10000],
        ["+$25,000", 25000],
        ["+$50,000", 50000],
      ];
    return (
      hd(3) +
      (last
        ? `<div class="tile stack" style="gap:4px"><div class="row between small"><span>On ${dfmt(last.d)} you expected</span><b>${money(last.nw)}</b></div><div class="row between small"><span>Net worth now</span><b>${money(d.nw)}</b></div><div class="tiny muted">${d.nw >= last.nw ? "You beat your own forecast by " + money(d.nw - last.nw) + "." : "You came in " + money(last.nw - d.nw) + " under what you expected. Forecasts are for learning, not for scoring."}</div></div>`
        : `<div class="tile small">This is your first review, so there's no forecast from past you yet. Make one now and next year's you gets to check it.</div>`) +
      `<div class="small">Net worth now: <b>${money(d.nw)}</b>. Where will it be a year from now?</div><div class="chips">${opts.map(o => `<button class="chip ${w.pred === o[1] ? "on" : ""}" data-a="revpred" data-v="${o[1]}">${o[0]}</button>`).join("")}</div><div class="tiny muted">If nothing changes, the game's math says about ${money(guess)}.</div>` +
      nxt()
    );
  }
  if (st === 4) {
    const rs = resets(c),
      yrs = [rs.y - 2, rs.y - 1, rs.y];
    return (
      hd(4) +
      `<div class="small muted">The only things that reset. Tax year ${rs.y}.</div>${rs.rows.map(r => `<div class="tile stack" style="gap:2px"><div class="row between small"><b>${r.n}</b><span>${r.v}</span></div><div class="tiny muted">${r.one}</div></div>`).join("")}
  <div class="tile stack" style="gap:6px"><div class="small"><b>A card with a yearly fee?</b> Tap the month it hits.</div><div class="chips">${[
    ["", "None"],
  ]
    .concat(MON.map((m, i) => [i, m]))
    .map(
      m =>
        `<button class="chip sm ${String(X.rev.fee == null ? "" : X.rev.fee) === String(m[0]) ? "on" : ""}" data-a="revfee" data-v="${m[0]}">${m[1]}</button>`
    )
    .join("")}</div></div>
  <div class="tile stack" style="gap:6px"><div class="row between small"><span><b>Cards opened in the last 2 years</b> ${ib("term:five24")}</span><b>${rs.n524}/24</b></div>${rs.cards.map(k => `<div class="row between tiny"><span>Opened ${k.open}</span><span>Drops off ${dfmt(k.drop)}</span></div>`).join("")}<div class="tiny muted">Add one: tap the year, then the month.</div><div class="seg">${yrs.map(y => `<button class="${w.cy === y ? "on" : ""}" data-a="revcy" data-v="${y}">${y}</button>`).join("")}</div>${w.cy ? `<div class="chips">${MON.map((m, i) => `<button class="chip sm" data-a="revcard" data-v="${i}">${m}</button>`).join("")}</div>` : ""}${X.rev.cards.length ? `<button class="ghost slim" data-a="revcardx">Remove the last one</button>` : ""}</div>` +
      nxt()
    );
  }
  const ya = yearAhead(c, d),
    chg = Object.keys(w.still).filter(k => w.still[k] === "chg");
  return (
    hd(5) +
    (ya.top
      ? `<div class="tile"><div class="row between small"><span>Biggest month coming</span><b>${ya.top.n}: +${money(ya.top.hit)}</b></div><div class="row between small"><span>Monthly set-aside that covers the year</span><b>${money(ya.perMonth)}</b></div></div>`
      : `<div class="tile small">No spikes on your year yet.</div>`) +
    `<button class="ghost wide slim" data-a="ahead">See all 12 months</button>${chg.length ? `<div class="small">You said these changed. Update them when you're ready:</div>${chg.map(k => `<button class="rowbtn" data-a="${{ job: "life", home: "life", people: "party", goals: "draft" }[k]}"><span>${{ job: "Work", home: "Home", people: "Your people", goals: "Things you want" }[k]}</span><span>Update ›</span></button>`).join("")}` : ""}` +
    `<button class="primary wide" data-a="revdone">Finish the review</button>`
  );
}
/* quiet windows on Home: a calendar can ask the game to go quiet for a while */
let REST_OPEN = 0;
const _home1 = home;
home = function () {
  const c = C(),
    rw = G.demo || Date.now() < REST_OPEN ? null : restWindow(c);
  if (!rw) return _home1();
  return `<div class="stack"><h1>${esc(c.name)}</h1><div class="card stack" style="gap:8px"><div class="eyebrow">${rw.n} mode</div><h2>Nothing here needs you right now.</h2><div class="small muted">The game is quiet until about ${new Date(rw.to).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}${new Date(rw.to).getDate() !== new Date(Date.now()).getDate() ? " tomorrow" : ""}. Your place is saved.</div><button class="ghost wide slim" data-a="restopen">Open the game anyway</button></div></div>`;
};
const _camp2 = campCard;
campCard = function (c, d) {
  const h = _camp2(c, d),
    rd = revDate(c);
  return rd && rd.due
    ? h.replace(
        /<\/div>$/,
        `<button class="ghost wide slim" style="margin-top:6px" data-a="review">Your Yearly Review is ready</button></div>`
      )
    : h;
};
const _games1 = gamesSheet;
gamesSheet = function () {
  return _games1().replace(
    /<button class="ghost wide" data-a="close">Close<\/button>$/,
    `<div class="stack" style="gap:4px"><div class="small"><b>The year</b></div>${[
      ["review", "Yearly Review"],
      ["ahead", "The year ahead"],
      ["funds", "True expenses"],
      ["cals", "Calendars"],
      ["chance", "Chance test"],
    ]
      .map(r => `<button class="rowbtn" data-a="${r[0]}"><span>${r[1]}</span><span>Open</span></button>`)
      .join("")}</div><button class="ghost wide" data-a="close">Close</button>`
  );
};
FOG_X.push((c, d, add) => {
  add("year", "Your year ahead", YX(c).funds.length > 0 || Object.keys(CALS).some(id => calOn(c, id)), "ahead");
});
Object.assign(ACT, {
  funds: () => {
    W = { kind: "funds" };
    sheet(fundsSheet);
  },
  fundtog: t => {
    const c = C(),
      X = YX(c),
      n = t.dataset.v,
      i = X.funds.findIndex(f => f.n === n);
    if (i >= 0) X.funds.splice(i, 1);
    else
      X.funds.push({
        n,
        yr: (FUND_T.concat(...FUND_X.map(f => f(c))).find(f => f[0] === n) || [0, 500])[1],
        m: null,
        s: false,
      });
    save();
    drawSheet();
  },
  fundamt: t => {
    const f = YX(C()).funds[+t.dataset.k];
    if (!f) return;
    f.yr = Math.max(50, f.yr + stepOf(f.yr) * +t.dataset.v);
    f.s = true;
    save();
    drawSheet();
  },
  fundmon: t => {
    const f = YX(C()).funds[+t.dataset.k];
    if (!f) return;
    f.m = t.dataset.v === "" ? null : +t.dataset.v;
    save();
    drawSheet();
  },
  ahead: () => {
    W = { kind: "ahead" };
    sheet(aheadSheet);
  },
  cals: () => {
    W = { kind: "cals" };
    sheet(calsSheet);
  },
  calon: t => {
    const c = C(),
      k = calCfg(c, t.dataset.k);
    k.on = t.dataset.v === "1";
    if (k.on && CALS[t.dataset.k] && CALS[t.dataset.k].onOn) CALS[t.dataset.k].onOn(k);
    save();
    render();
    drawSheet();
  },
  calcost: t => {
    const c = C(),
      p = t.dataset.k.split(":"),
      k = calCfg(c, p[0]),
      cur = seasonCost(c, p[0], p[1]).amt;
    k.cost = k.cost || {};
    k.cost[p[1]] = Math.max(0, cur + stepOf(cur) * +t.dataset.v);
    save();
    drawSheet();
  },
  chance: () => {
    W = { kind: "chance" };
    sheet(chanceSheet);
  },
  yrdone: () => {
    save();
    closeSheet();
    render();
  },
  restopen: () => {
    const rw = restWindow(C());
    REST_OPEN = rw ? rw.to : 0;
    render();
  },
  gseason: t => {
    const c = C(),
      g = c.goals.find(x => x.id === W.id);
    if (!g) return;
    g.win = t.dataset.v === "Any time" ? null : t.dataset.v;
    save();
    drawSheet();
  },
  review: () => {
    const X = YX(C());
    W = { kind: "review", step: X.rev.when ? 1 : 0, still: {}, pred: null, cy: null };
    sheet(reviewSheet);
  },
  revwhen: t => {
    const X = YX(C());
    X.rev.when = t.dataset.v;
    save();
    drawSheet();
  },
  revbm: t => {
    YX(C()).rev.bm = +t.dataset.v;
    save();
    drawSheet();
  },
  revnext: () => {
    W.step++;
    drawSheet();
  },
  revstill: t => {
    W.still[t.dataset.k] = t.dataset.v;
    drawSheet();
  },
  revpred: t => {
    W.pred = +t.dataset.v;
    drawSheet();
  },
  revfee: t => {
    YX(C()).rev.fee = t.dataset.v === "" ? null : +t.dataset.v;
    save();
    drawSheet();
  },
  revcy: t => {
    W.cy = +t.dataset.v;
    drawSheet();
  },
  revcard: t => {
    const X = YX(C());
    X.rev.cards.push({ y: W.cy, m: +t.dataset.v });
    W.cy = null;
    save();
    drawSheet();
  },
  revcardx: () => {
    YX(C()).rev.cards.pop();
    save();
    drawSheet();
  },
  revdone: () => {
    const c = C(),
      X = YX(c),
      rd = revDate(c),
      t = todayISO();
    if (W.pred != null) X.rev.pred.push({ d: t, nw: Math.round(D.nw + W.pred) });
    X.rev.done[rd && rd.last ? rd.last : t] = t;
    X.rev.still = W.still;
    save();
    celebrate(
      "Year reviewed",
      [
        "You looked back, checked what's still true, and looked ahead.",
        rd && rd.next ? "Next review: " + dfmt(rd.next) + "." : null,
      ],
      "Nothing reset. You just know more than you did.",
      "✦"
    );
  },
});
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
