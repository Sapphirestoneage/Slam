/* ===== debts.js: finish the debt picture by tap (rate, monthly payment, card limit, how much it bugs you), then three payoff plans side by side. The plan math is ported from the SLAM repo (js/math/debt.js, payoffPlan): every debt gets its own payment, and the extra plus every freed payment rolls to the first debt in the order. Return on Hassle orders by hassle score ÷ balance (Eli, Nov 5 2026). ===== */
const DB_MID = { "Under 8%": 5, "8% to 15%": 11.5, "15% to 25%": 20, "Over 25%": 28, "No interest": 0 };
const DB_ORD = [
  ["avalanche", "Highest rate first", "Costs the least"],
  ["snowball", "Smallest first", "Quickest first win"],
  ["hassle", "Most annoying first", "Clears your head"],
];
function dbRate(x) {
  if (x.rate != null && isFinite(+x.rate)) return { v: +x.rate, cf: 3 };
  if (x.apr && DB_MID[x.apr] != null) return { v: DB_MID[x.apr], cf: x.apr === "No interest" ? 3 : 2 };
  return { v: x.high ? 20 : 5, cf: 0 };
}
function dbEst(x) {
  const r = dbRate(x).v / 100 / 12,
    b = x.amt || 0;
  if (b <= 0) return 0;
  if (/card/i.test(x.k)) return Math.round(Math.min(b, Math.max(25, b * 0.01 + b * r)));
  const n = /student/i.test(x.k)
    ? 120
    : /car/i.test(x.k)
      ? 60
      : /famil|friend/i.test(x.k)
        ? 24
        : /later/i.test(x.k)
          ? 4
          : 36;
  return Math.max(1, Math.round(r > 0 ? (b * r) / (1 - Math.pow(1 + r, -n)) : b / n));
}
function dbPay(x) {
  return x.pay != null ? { v: +x.pay, cf: x.paycf || 2 } : { v: dbEst(x), cf: 0 };
}
function dbLive(c) {
  return (c.debts || []).map((x, i) => ({ x, i })).filter(o => o.x.amt > 0);
}
/* sums for Key numbers: only when every debt (or every card) has the answer, so nothing is half-counted */
function dbSum(c, what) {
  const L = dbLive(c);
  if (what === "pay") {
    if (!L.length) return { v: 0, cf: 3 };
    if (L.some(o => o.x.pay == null)) return null;
    return {
      v: L.reduce((t, o) => t + +o.x.pay, 0),
      cf: Math.min.apply(
        null,
        L.map(o => o.x.paycf || 2)
      ),
    };
  }
  const cards = (c.debts || []).filter(x => /card/i.test(x.k));
  if (!cards.length || cards.some(x => x.lim == null)) return null;
  return {
    v: cards.reduce((t, x) => t + +x.lim, 0),
    cf: Math.min.apply(
      null,
      cards.map(x => x.limcf || 2)
    ),
  };
}
function dbMonth(n, today) {
  const d = parseISO(today || todayISO()),
    t = new Date(d.getFullYear(), d.getMonth() + n, 1);
  return (
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][t.getMonth()] +
    " " +
    t.getFullYear()
  );
}
function dbPlan(c, order, extra) {
  const list = dbLive(c).map(o => {
    const x = o.x;
    return {
      i: o.i,
      name: x.k,
      bal: x.amt,
      apr: dbRate(x).v / 100,
      pay: dbPay(x).v,
      hassle: x.hassle,
      left: x.amt,
      interest: 0,
      off: null,
    };
  });
  const hp = d => (d.hassle != null && d.bal > 0 ? d.hassle / d.bal : -1),
    ORD = {
      avalanche: (a, b) => b.apr - a.apr || a.bal - b.bal,
      snowball: (a, b) => a.bal - b.bal || b.apr - a.apr,
      hassle: (a, b) => hp(b) - hp(a) || b.apr - a.apr,
    };
  list.sort(ORD[order] || ORD.avalanche);
  let month = 0,
    total = 0;
  while (list.some(d => d.left > 0.005) && month < 1200) {
    month++;
    let pool = extra || 0;
    for (const d of list) if (d.left <= 0.005) pool += d.pay;
    for (const d of list) {
      if (d.left <= 0.005) continue;
      const i = (d.left * d.apr) / 12;
      d.interest += i;
      total += i;
      d.left += i;
      const p = Math.min(d.left, d.pay);
      d.left -= p;
      pool += d.pay - p;
    }
    for (const d of list) {
      if (d.left <= 0.005 || pool <= 0) continue;
      const p = Math.min(d.left, pool);
      d.left -= p;
      pool -= p;
    }
    for (const d of list) if (d.left <= 0.005 && d.off === null) d.off = month;
  }
  const done = list.every(d => d.left <= 0.005);
  return {
    order,
    extra: extra || 0,
    months: done ? month : null,
    interest: total,
    debts: list,
    first: list[0] || null,
    paying: list.reduce((t, d) => t + d.pay, 0) + (extra || 0),
  };
}
function dbStatus(c) {
  const L = dbLive(c);
  if (!L.length) return "Exact";
  const cf = Math.min.apply(
    null,
    L.map(o => Math.min(dbRate(o.x).cf, dbPay(o.x).cf, o.x.s ? o.x.cf || 2 : 0))
  );
  return cf <= 0 ? "Guess" : cf >= 3 ? "Exact" : "Close";
}
function dbMissing(x) {
  const m = [];
  if (dbRate(x).cf === 0) m.push("rate");
  if (x.pay == null) m.push("payment");
  if (/card/i.test(x.k) && x.lim == null) m.push("limit");
  return m;
}
function dbChips(key, i, opts, cur, fmt) {
  return `<div class="chips">${opts.map(v => `<button class="chip ${cur === v ? "on" : ""}" data-a="dbset" data-k="${key}" data-l="${i}" data-v="${v}">${fmt ? fmt(v) : money(v)}</button>`).join("")}</div>`;
}
function dbNice(v) {
  const s = v < 100 ? 5 : v < 500 ? 25 : v < 2000 ? 50 : 250;
  return Math.max(s, Math.round(v / s) * s);
}
/* dbOneBody(c, i) makes the sheet for one debt. dbOneBodyBase() is the part from this file. */
function dbOneBody(c, i) {
  const ask =
    typeof dbOneBodyAsk === "function" ? dbOneBodyAsk(c, i) : null; /* ask2.js: one small question at a time */
  return ask !== null ? ask : dbOneBodyBase(c, i);
}
function dbOneBodyBase(c, i) {
  const x = c.debts[i],
    w = W,
    est = dbEst(x),
    isCard = /card/i.test(x.k),
    po = [est]
      .concat([0.5, 1.5, 2, 3, 5].map(f => dbNice(est * f)))
      .filter((v, k, a) => v > 0 && a.indexOf(v) === k)
      .sort((a, b) => a - b),
    pad = k =>
      w.pad === k
        ? `<div class="val">${money((w.o || {})[k] || 0)}</div>${keypad(k)}<button class="primary wide" data-a="dbset" data-k="${k.split("_")[1]}" data-l="${i}" data-v="typed">Use ${money((w.o || {})[k] || 0)}</button>`
        : `<button class="ghost slim" data-a="padopen" data-k="${k}">Type the exact number</button>`,
    r = dbRate(x);
  return (
    head("What you owe", esc(x.k)) +
    `<div class="row between tile"><span class="small">You owe</span><span class="row" style="gap:8px"><b>${money(x.amt)}</b><button class="ghost slim" data-a="rowedit" data-k="debts" data-v="${i}">Change</button></span></div>` +
    q(
      "What rate does it charge a year?",
      dbChips("apr", i, APR_BANDS.concat(["No interest"]), x.apr, v => v),
      (x.rate != null ? "You entered " + x.rate + "%. " : "It's called the APR and it's on your statement. ") +
        (r.cf === 0 ? "Until you pick, the game guesses " + r.v + "%." : "")
    ) +
    `<button class="ghost slim" data-a="rowedit" data-k="debts" data-v="${i}">Type the exact rate</button>` +
    q(
      "What do you pay on it each month?",
      dbChips("pay", i, po, x.pay),
      x.pay == null
        ? "The game's guess is about " + money(est) + " a month" + (isCard ? " (a typical card minimum)." : ".")
        : ""
    ) +
    pad("db_pay") +
    (isCard
      ? q(
          "What is this card's limit?",
          dbChips("lim", i, [500, 1000, 2500, 5000, 10000, 20000, 40000], x.lim),
          "It's in the card's app or on a statement."
        ) + pad("db_lim")
      : "") +
    q(
      "How much does this one bug you?",
      dbChips("hassle", i, [1, 2, 3, 4, 5], x.hassle, v =>
        v === 1 ? "1 · barely" : v === 5 ? "5 · a lot" : String(v)
      ),
      "This is for the Most annoying first plan. Skip it if none of them bug you."
    ) +
    `<button class="primary wide" data-a="debtplan">${dbMissing(x).length ? "Back to the plan" : "Done"}</button>`
  );
}
/* dbSheet() makes the full sheet of the debt plan. dbSheetBase() is the part from this file. */
function dbSheet() {
  let h = dbSheetBase();
  if (typeof dbSheetOwed === "function") h = dbSheetOwed(h); /* owed.js: the button "What each debt costs you" */
  return h;
}
function dbSheetBase() {
  const c = C(),
    w = W,
    L = dbLive(c),
    P = (c.x && c.x.dplan) || {},
    extra = w.extra != null ? w.extra : P.extra || 0,
    ft = typeof freeToSpend === "function" ? freeToSpend(c, D) : null;
  if (!L.length)
    return (
      head("My Money", "Debt plan") +
      `<div class="tile stack" style="text-align:center"><div class="bignum">$0</div><div class="small">You don't owe anything the game knows about. Keeping it that way is the plan.</div></div><button class="ghost wide" data-a="rowadd" data-v="debts">Add a debt</button>`
    );
  const plans = DB_ORD.map(o => dbPlan(c, o[0], extra)),
    ok = plans.filter(p => p.months != null),
    best = ok.length ? ok.slice().sort((a, b) => a.interest - b.interest || a.months - b.months)[0] : null,
    sel = w.order || P.order || "avalanche",
    cur = plans.find(p => p.order === sel) || plans[0],
    st = dbStatus(c),
    anyH = L.some(o => o.x.hassle != null),
    same = ok.length === 3 && ok.every(p => Math.abs(p.interest - ok[0].interest) < 1 && p.months === ok[0].months);
  return (
    head("My Money", "Debt plan") +
    `<div class="small muted">Fill in each debt, pick how hard to push, and compare three ways to clear them.</div>` +
    `<div class="stack" style="gap:6px">${L.map(o => {
      const x = o.x,
        m = dbMissing(x),
        r = dbRate(x),
        p = dbPay(x);
      return `<button class="rowbtn prow" data-a="dbone" data-v="${o.i}"><span class="pn"><b>${esc(x.k)}</b><div class="tiny muted">${money(x.amt)} · ${r.cf === 0 ? "rate?" : x.apr === "No interest" ? "no interest" : x.rate != null ? x.rate + "%" : x.apr} · ${p.cf === 0 ? "payment?" : money(p.v) + " a month"}</div></span><span class="pill ${m.length ? "warn" : "okp"}">${m.length ? "Add " + m[0] : "Set ✓"}</span></button>`;
    }).join("")}</div>` +
    q(
      "Extra you can add each month",
      `<div class="chips">${[0, 50, 100, 200, 300, 500].map(v => `<button class="chip ${extra === v ? "on" : ""}" data-a="dbextra" data-v="${v}">${v ? "+" + money(v) : "Nothing extra"}</button>`).join("")}</div>`,
      ft && ft.free > 0
        ? "Your free-to-spend is about " + money(ft.free) + " a month, so anything up to that is yours to aim."
        : ""
    ) +
    (st === "Guess"
      ? `<div class="banner small">Parts of this are a guess. Tap a debt above to add what's missing and the dates firm up.</div>`
      : "") +
    `<div class="dbcols">${plans
      .map((p, k) => {
        const o = DB_ORD[k],
          on = p.order === sel,
          dim = o[0] === "hassle" && !anyH;
        return `<button class="dbcol ${on ? "on" : ""}" data-a="dborder" data-v="${o[0]}"><b>${o[1]}</b><span class="tiny muted">${o[2]}</span><span class="dbd ${st === "Guess" ? "guess" : ""}">${p.months == null ? "Never clears" : dbMonth(p.months)}</span><span class="tiny">${p.months == null ? "at these payments" : money(p.interest) + " interest"}</span>${best && p === best && !same ? `<span class="pill okp">Saves the most</span>` : dim ? `<span class="tiny muted">Rate each debt 1 to 5 first</span>` : ""}</button>`;
      })
      .join("")}</div>` +
    (same ? `<div class="tiny muted">All three come out the same here, so pick the one that feels best.</div>` : "") +
    (cur.months == null
      ? `<div class="banner small">These payments never clear every debt. Add more each month, or raise a payment, and a date appears.</div>`
      : `<div class="tile stack" style="gap:6px"><div class="row between"><b class="small">${DB_ORD.find(o => o[0] === sel)[1]}</b><span class="pill">${st}</span></div>${cur.debts.map((d, k) => `<div class="small mrow k-${k === 0 ? "goal" : "note"}">${k + 1}. ${esc(d.name)}: gone by <b>${dbMonth(d.off)}</b>, ${money(d.interest)} interest</div>`).join("")}<div class="small">Debt free by <b>${dbMonth(cur.months)}</b> (${cur.months < 12 ? cur.months + " months" : knN1(cur.months / 12) + " years"}), paying ${money(cur.paying)} a month in all.</div>${best && cur !== best && cur.interest - best.interest >= 1 ? `<div class="tiny muted">This costs ${money(cur.interest - best.interest)} more than ${DB_ORD.find(o => o[0] === best.order)[1].toLowerCase()}${cur.months - best.months > 0 ? " and takes " + (cur.months - best.months) + " more months" : ""}. If it keeps you going, that can be worth it.</div>` : ""}</div>` +
        mathBox([
          "Every debt gets its own payment each month.",
          "The extra goes to debt 1. When a debt is gone, its payment rolls to the next one.",
          "Interest is the balance × the yearly rate ÷ 12, added each month.",
          st !== "Exact" ? "A rate picked from a range uses the middle of it (15% to 25% counts as 20%)." : null,
        ])) +
    (cur.months != null
      ? `<button class="primary wide" data-a="dbpick">${P.order === sel && (P.extra || 0) === extra ? "This is my plan ✓" : "Make this my plan"}</button>`
      : "") +
    (P.order
      ? `<div class="tiny muted">Your plan: ${DB_ORD.find(o => o[0] === P.order)[1].toLowerCase()}, ${P.extra ? "+" + money(P.extra) + " a month" : "nothing extra"}.</div>`
      : "")
  );
}
Object.assign(ACT, {
  debtplan: () => {
    const keep = W && (W.kind === "dbplan" || W.kind === "dbone") ? { extra: W.extra, order: W.order } : {};
    W = Object.assign({ kind: "dbplan" }, keep);
    sheet(dbSheet);
  },
  dbone: t => {
    const i = +t.dataset.v,
      keep = { extra: W && W.extra, order: W && W.order };
    W = Object.assign({ kind: "dbone", i, o: {} }, keep);
    sheet(() => dbOneBody(C(), W.i));
  },
  dbset: t => {
    const c = C(),
      i = +t.dataset.l,
      x = c.debts[i],
      k = t.dataset.k;
    if (!x) return;
    const typed = t.dataset.v === "typed";
    if (k === "apr") {
      const v = t.dataset.v,
        pr = D.realm;
      x.apr = v;
      x.high = !(v === "Under 8%" || v === "No interest");
      if (x.rate != null && (typeof bandOf !== "function" || bandOf(x.rate) !== v)) delete x.rate;
      if (v === "No interest") x.rate = 0;
      afterMoney(c, pr, false);
    } else {
      const v = typed ? +((W.o || {})["db_" + k] || 0) : +t.dataset.v;
      if (!isFinite(v)) return;
      if (k === "pay") {
        x.pay = v;
        x.paycf = typed ? 3 : 2;
      } else if (k === "lim") {
        x.lim = v;
        x.limcf = typed ? 3 : 2;
      } else if (k === "hassle") x.hassle = x.hassle === v ? null : v;
      if (x.hassle === null) delete x.hassle;
    }
    if (W) W.pad = null;
    save();
    render();
    drawSheet();
  },
  dbextra: t => {
    if (W) {
      W.extra = +t.dataset.v;
      drawSheet();
    }
  },
  dborder: t => {
    if (W) {
      W.order = t.dataset.v;
      drawSheet();
    }
  },
  dbpick: () => {
    const c = C(),
      w = W,
      P = c.x.dplan || {},
      order = w.order || P.order || "avalanche",
      extra = w.extra != null ? w.extra : P.extra || 0,
      p = dbPlan(c, order, extra);
    if (p.months == null) return;
    c.x.dplan = { order, extra, d: todayISO() };
    if (typeof plX === "function") {
      const x = plX(c);
      x.plan = x.plan.filter(q => !(q.dbp && q.st !== "done"));
      if (extra > 0 && p.first)
        x.plan.push({
          id: plId(),
          when: todayISO(),
          slot: "Any",
          st: "todo",
          made: todayISO(),
          t: "Send " + money(extra) + " extra to your " + p.first.name.toLowerCase(),
          s: "Your debt plan's first target. Log it when it's paid.",
          a: "flow",
          v: "pay",
          mins: 3,
          dbp: 1,
        });
    }
    save();
    render();
    celebrate(
      "You have a debt plan",
      ["Debt free by " + dbMonth(p.months), "First target: " + (p.first ? p.first.name : "")],
      "You can change it any time from My Money."
    );
  },
});
/* Part of moneyTab() in ui.js. When there is a debt, the button "Log a debt payment" becomes two buttons: the debt plan, and the payment. */
function moneyTabDebtPlan(h) {
  const c = C(),
    btn = '<button class="ghost wide" data-a="flow" data-v="pay">Log a debt payment</button>';
  if (!dbLive(c).length || h.indexOf(btn) < 0) return h;
  const P = c.x && c.x.dplan;
  return h.replace(
    btn,
    () =>
      `<div class="row" style="gap:8px"><button class="${P ? "ghost" : "primary"} slim" style="flex:1" data-a="debtplan">${P ? "Debt plan ✓" : "Make a debt plan"}</button><button class="ghost slim" style="flex:1" data-a="flow" data-v="pay">Log a payment</button></div>`
  );
}

Object.assign(GLOSS, {
  avalanche: [
    "Highest rate first",
    "Put every extra dollar on the debt with the highest rate. It costs the least interest. Often called the avalanche.",
  ],
  snowball: [
    "Smallest first",
    "Put every extra dollar on the smallest balance. You clear a whole debt sooner, which keeps a lot of people going. Often called the snowball.",
  ],
  hasslefirst: [
    "Most annoying first",
    "Clear the debt that bugs you most for its size first. It is about getting your head back, not the math.",
  ],
});
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
