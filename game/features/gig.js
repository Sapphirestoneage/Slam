/* ============================================================================
   SLAM the Game: features/gig.js
   PURPOSE     Work for yourself. For income with no tax taken out. (1) Tax comes off first: a tax
               bucket and the next quarterly date. (2) Your unit: the thing that the player sells, and
               what one unit leaves. (3) Your floor: the lowest price that pays for the life of the
               player.
   INPUT       The game: G.demo. The profile: c.x.gig, c.x.tax, c.x.unit. The open sheet (W.kind): gig,
               gxcatch. The taps of the player (the actions in OUTPUT).
   OUTPUT      23 functions. Parts of functions in other files: monthsAheadTax, moneyTabTaxRow. Actions
               (ACT): gig, gxtab, gxsrc, gxset, gxuse, gxmove, gxpaid, gxcatch, fsave. Menu: "Working
               for yourself".
   DEPENDS ON  core/engine.js, screens/ui.js, screens/planner.js, screens/ux.js, features/compare.js.
   USES LATER  Names from files that the browser loads later. Behind a typeof test, thus safe while the
               page loads: features/sim.js (gxSheetSim).
   RULES       The three parts feed each other: the tax rate prices the unit, the unit prices the floor,
               and the same unit shows in the fire drills, the ladder and Quick math. These tools do not
               change the totals of the engine. The tax money is a label on cash that the player already
               has.
   ========================================================================= */
const GX_DEF = ["Side gigs", "My own business"],
  GX_PCTS = [15, 20, 25, 30, 35],
  GX_DUE = [
    [0, 15],
    [3, 15],
    [5, 15],
    [8, 15],
  ],
  GX_NAMES = ["session", "shift", "gig", "client", "job", "sale"];
function gxGet(c) {
  const t = (c.x && c.x.tax) || {};
  return { pct: t.pct == null ? null : t.pct, src: t.src || {}, set: t.set || 0, due: t.due || 0, paid: t.paid || [] };
}
function gxPut(c, patch) {
  c.x = c.x || {};
  c.x.tax = Object.assign(gxGet(c), patch);
  save();
}
function gxIsUntaxed(c, k) {
  const s = gxGet(c).src;
  return s[k] === true || (s[k] === undefined && GX_DEF.includes(k));
}
function gxRows(c) {
  return (c.incs || []).filter(r => (r.amt || 0) > 0);
}
function gxUntaxedMo(c) {
  return gxRows(c)
    .filter(r => gxIsUntaxed(c, r.k))
    .reduce((a, r) => a + r.amt, 0);
}
function gxOn(c) {
  return !!c.led && gxUntaxedMo(c) > 0;
}
function gxPct(c) {
  const p = gxGet(c).pct;
  return p == null ? 25 : p;
}
function gxNext(today) {
  const a = parseISO(today || todayISO()),
    y = a.getFullYear(),
    c = [];
  [y, y + 1].forEach(yy => GX_DUE.forEach(d => c.push(new Date(yy, d[0], d[1]))));
  const n = c.find(d => d >= new Date(a.getFullYear(), a.getMonth(), a.getDate()));
  return {
    date: n,
    days: Math.round((n - a) / 864e5),
    txt: n.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  };
}
function gxState(c) {
  const T = gxGet(c),
    mo = gxUntaxedMo(c),
    pct = gxPct(c),
    nx = gxNext(),
    behind = Math.max(0, Math.round(T.due - T.set));
  return {
    T,
    mo,
    pct,
    nx,
    behind,
    perMo: Math.round((mo * pct) / 100),
    perQ: Math.round((mo * 3 * pct) / 100),
    known: T.pct != null,
  };
}
/* your unit */
function gxUnit(c) {
  const u = c.x && c.x.unit;
  return u && u.v > 0 ? u : null;
}
function gxPlural(n, k) {
  return k === 1 ? n : n + "s";
}
function unitTxt(c, amt) {
  const u = gxUnit(c);
  if (!u || !(amt > 0)) return "";
  const k = Math.max(1, Math.ceil(amt / u.v));
  return "about " + k + " " + gxPlural(u.n, k);
}
function gxGig(c) {
  const g = (c.x && c.x.gig) || {};
  return {
    n: g.n || "session",
    charge: g.charge == null ? 150 : g.charge,
    cost: g.cost == null ? 20 : g.cost,
    paid: g.paid == null ? 1 : g.paid,
    unpaid: g.unpaid == null ? 1 : g.unpaid,
    per: g.per == null ? 12 : g.per,
  };
}
function gxPays(g, pct) {
  const afterCost = Math.max(0, g.charge - g.cost),
    tax = (afterCost * pct) / 100,
    keep = afterCost - tax,
    hrs = g.paid + g.unpaid;
  return { afterCost, tax, keep, hrs, perHr: hrs > 0 ? keep / hrs : 0, paper: g.paid > 0 ? g.charge / g.paid : 0 };
}
function gxFloor(c, g, pct) {
  const taxed = gxRows(c)
      .filter(r => !gxIsUntaxed(c, r.k))
      .reduce((a, r) => a + r.amt, 0),
    need = Math.max(0, (c.spend || 0) - taxed),
    P = gxPays(g, pct),
    floor = g.per > 0 ? need / g.per / (1 - pct / 100) + g.cost : 0,
    units = P.keep > 0 ? Math.ceil(need / P.keep) : null;
  return { taxed, need, floor: Math.ceil((floor - 1e-6) / 5) * 5, units };
}
function gxChips(k, opts, cur, f) {
  return `<div class="chips">${opts.map(v => `<button class="chip sm ${cur === v ? "on" : ""}" data-a="gxset" data-k="${k}" data-v="${v}">${f(v)}</button>`).join("")}</div>`;
}
function gxTaxBody(c) {
  const S = gxState(c),
    rows = gxRows(c);
  return `<div class="small muted">A paycheck has taxes taken out before you see it. Money you earn on your own does not, so part of every payment is not yours. This keeps that part in view.</div>
 ${q("Which of these arrive with no taxes taken out?", rows.length ? `<div class="chips">${rows.map(r => `<button class="chip sm ${gxIsUntaxed(c, r.k) ? "on" : ""}" data-a="gxsrc" data-v="${esc(r.k)}">${esc(r.k)} · ${money(r.amt)}</button>`).join("")}</div>` : `<div class="tiny muted">Add your income in My Money first.</div>`)}
 ${q(
   "How much to set aside from each payment",
   gxChips("pct", GX_PCTS, S.T.pct, v => v + "%"),
   S.known
     ? ""
     : 'Not sure? 25% is a common starting point. In a high-tax city like New York, 30% is safer. <button class="term" data-a="info" data-k="gloss:setaside">Why so much</button>'
 )}
 ${
   S.mo > 0
     ? `<div class="cpgrid" style="grid-template-columns:1fr 1fr">${cpCell(money(Math.round(S.T.set)), "set aside so far")}${cpCell(money(Math.round(S.T.due)), "from what you logged")}</div>
 <div class="tile stack" style="gap:4px;text-align:center"><div class="tiny muted">Next date: around ${S.nx.txt}${S.known ? "" : " · <b>Guess</b>"}</div><div class="bignum" data-fid="gx:q">${money(S.perQ)}</div><div class="small">is about what three months like now would owe. That is ${money(S.perMo)} a month${unitTxt(c, S.perMo) ? ", " + unitTxt(c, S.perMo) + " a month just for taxes" : ""}.</div></div>
 ${S.behind > 0 ? `<div class="banner small">You have logged ${money(S.behind)} more in tax money than you have set aside. No panic: it is a number to catch up on, not a bill today.</div><button class="primary wide" data-a="gxmove" data-v="${S.behind}">I moved ${money(S.behind)} aside</button>` : S.T.due > 0 ? `<div class="tile small" style="text-align:center">Everything you logged has its tax money set aside. ✓</div>` : `<div class="tile small">Next time you log money in from one of these, the game asks one question: set some aside?</div>`}
 ${S.T.set > 0 ? `<button class="ghost wide slim" data-a="gxpaid">I paid a tax bill with it (${money(Math.round(S.T.set))})</button>` : ""}`
     : ""
 }
 ${mathBox(["Money with no taxes taken out: " + money(S.mo) + " a month.", "Times " + S.pct + "% is " + money(S.perMo) + " a month, " + money(S.perQ) + " a quarter.", "Each time you log untaxed money, " + S.pct + "% of it is added to what should be set aside.", "The dates are around Apr 15, Jun 15, Sep 15 and Jan 15. This is a planning number, not a tax return. Your real bill depends on your costs and the rest of your year.", "Tax money is still in your accounts, so your totals do not change. It is just spoken for."])}`;
}
function gxPayBody(c) {
  const g = gxGig(c),
    pct = gxPct(c),
    P = gxPays(g, pct),
    u = gxUnit(c),
    same = u && u.n === g.n && Math.round(u.v) === Math.round(P.keep);
  return `<div class="small muted">What one ${esc(g.n)} really leaves you, after what it costs, the tax on it, and the hours nobody pays for.</div>
 ${q("What do you call one unit of your work?", `<div class="chips">${GX_NAMES.map(n => `<button class="chip sm ${g.n === n ? "on" : ""}" data-a="gxset" data-k="n" data-v="${n}">${n}</button>`).join("")}</div>`)}
 ${q(
   "What you charge for one",
   gxChips("charge", [50, 100, 150, 200, 300, 500], g.charge, v => money(v))
 )}
 ${q(
   "What one costs you",
   gxChips("cost", [0, 10, 20, 50, 100], g.cost, v => (v ? money(v) : "Nothing")),
   "Supplies, a room, travel, the platform's cut."
 )}
 ${q(
   "Paid hours in one",
   gxChips("paid", [0.5, 1, 2, 3, 4], g.paid, v => v)
 )}
 ${q(
   "Unpaid hours around it",
   gxChips("unpaid", [0, 0.5, 1, 2, 4], g.unpaid, v => v),
   "Messages, prep, getting there, cleanup."
 )}
 <div class="tile stack" style="gap:4px;text-align:center"><div class="tiny muted">One ${esc(g.n)} leaves you</div><div class="bignum" data-fid="gx:keep">${money(Math.round(P.keep))}</div><div class="small">That is <b>$${P.perHr.toFixed(2)}</b> for each hour it really takes. On paper it looked like $${P.paper.toFixed(2)} an hour.</div></div>
 ${mathBox([money(g.charge) + " charged, minus " + money(g.cost) + " in costs, is " + money(Math.round(P.afterCost)) + ".", "Minus " + pct + "% set aside for taxes (" + money(Math.round(P.tax)) + ") leaves " + money(Math.round(P.keep)) + ".", "Divided by " + P.hrs + " hours: " + g.paid + " paid and " + g.unpaid + " unpaid.", "Pricing things in hours of your life is from Your Money or Your Life (Vicki Robin and Joe Dominguez)."])}
 ${same ? `<div class="tile small" style="text-align:center">This is your unit. Gaps across the game also show in ${esc(gxPlural(g.n, 2))}. ✓</div>` : `<button class="primary wide" data-a="gxuse">Use 1 ${esc(g.n)} = ${money(Math.round(P.keep))} across the game</button>`}`;
}
function gxFloorBody(c) {
  const g = gxGig(c),
    pct = gxPct(c),
    F = gxFloor(c, g, pct),
    P = gxPays(g, pct);
  return `<div class="small muted">Your floor is the lowest price that still pays for your life. Below it you are busy and going backwards.</div>
 ${q(
   "How many " + esc(gxPlural(g.n, 2)) + " can you really do in a month?",
   gxChips("per", [4, 8, 12, 16, 20, 30], g.per, v => v)
 )}
 <div class="cpgrid" style="grid-template-columns:1fr 1fr">${cpCell(money(F.floor), "your floor for one " + esc(g.n))}${cpCell(money(g.charge), "what you charge now")}</div>
 <div class="tile small" style="text-align:center">${F.need <= 0 ? "Your other income already covers your spending, so every " + esc(g.n) + " is extra." : F.units == null ? "At this price nothing is left after costs and tax." : "At " + money(g.charge) + ", it takes <b>" + F.units + " " + esc(gxPlural(g.n, F.units)) + " a month</b> to cover what your other income does not."}</div>
 ${mathBox(["You spend " + money(c.spend || 0) + " a month." + (F.taxed > 0 ? " Income that is already taxed covers " + money(F.taxed) + " of it." : ""), "That leaves " + money(Math.round(F.need)) + " for this work to cover, across " + g.per + " a month.", "Each one has to clear that share after " + pct + "% tax and " + money(g.cost) + " in costs. Rounded up to the next $5.", "A floor is not a price. It is the line you price above."])}
 <button class="ghost wide slim" data-a="gxtab" data-v="pay">Change what one ${esc(g.n)} costs or takes</button>`;
}
/* gxSheet() makes the full sheet "Working for yourself". gxSheetBase() is the part from this file. */
function gxSheet() {
  let h = gxSheetBase();
  if (typeof gxSheetSim === "function") h = gxSheetSim(h); /* sim.js: the simulator "Side income" */
  return h;
}
function gxSheetBase() {
  const c = C(),
    w = W,
    t = w.tab || "tax";
  return (
    head("Menu", "Working for yourself") +
    `<div class="seg" style="align-self:flex-start">${[
      ["tax", "Taxes first"],
      ["pay", "What one pays"],
      ["floor", "My floor"],
    ]
      .map(x => `<button class="${t === x[0] ? "on" : ""}" data-a="gxtab" data-v="${x[0]}">${x[1]}</button>`)
      .join("")}</div>` +
    (t === "pay" ? gxPayBody(c) : t === "floor" ? gxFloorBody(c) : gxTaxBody(c))
  );
}
function gxCatchSheet() {
  const c = C(),
    w = W,
    pct = gxPct(c),
    amt = Math.round((w.amt * pct) / 100);
  return (
    head("Logged", money(w.amt) + " from " + esc(w.src)) +
    `<div class="small">Nobody took taxes out of this one. About <b>${money(amt)}</b> of it (${pct}%) is not yours to spend.</div>
 <button class="primary wide go" data-a="gxcatch" data-v="moved">I moved ${money(amt)} aside</button><button class="ghost wide" data-a="gxcatch" data-v="later">Not yet. Keep count for me</button><button class="ghost wide slim" data-a="gxcatch" data-v="taxed">This one already had taxes out</button>
 <div class="tiny muted">A separate savings account just for taxes makes this one tap at your bank. <button class="term" data-a="gig">Change the ${pct}%</button></div>`
  );
}
Object.assign(ACT, {
  gig: t => {
    W = { kind: "gig", tab: t && t.dataset && ["pay", "floor"].includes(t.dataset.v) ? t.dataset.v : "tax" };
    sheet(gxSheet);
  },
  gxtab: t => {
    W.tab = t.dataset.v;
    drawSheet();
  },
  gxsrc: t => {
    const c = C(),
      k = t.dataset.v,
      s = Object.assign({}, gxGet(c).src);
    s[k] = !gxIsUntaxed(c, k);
    gxPut(c, { src: s });
    render();
    drawSheet();
  },
  gxset: t => {
    const c = C(),
      k = t.dataset.k,
      v = t.dataset.v;
    if (k === "pct") {
      gxPut(c, { pct: +v });
      const u = gxUnit(c);
      if (u && u.auto) {
        const g = gxGig(c);
        c.x.unit = Object.assign({}, u, { v: Math.round(gxPays(g, +v).keep) });
        save();
      }
    } else {
      c.x = c.x || {};
      c.x.gig = Object.assign(gxGig(c), { [k]: k === "n" ? v : +v });
      save();
    }
    render();
    drawSheet();
  },
  gxuse: () => {
    const c = C(),
      g = gxGig(c),
      P = gxPays(g, gxPct(c));
    if (!(P.keep > 0)) return drawSheet();
    c.x = c.x || {};
    c.x.gig = g;
    c.x.unit = { n: g.n, v: Math.round(P.keep), cf: 2, auto: true, d: todayISO() };
    save();
    render();
    drawSheet();
  },
  gxmove: t => {
    const c = C(),
      T = gxGet(c);
    gxPut(c, { set: T.set + (+t.dataset.v || 0) });
    render();
    drawSheet();
  },
  gxpaid: () => {
    const c = C(),
      T = gxGet(c);
    if (!(T.set > 0)) return;
    gxPut(c, {
      paid: T.paid.concat([{ d: todayISO(), amt: Math.round(T.set) }]).slice(-12),
      due: Math.max(0, T.due - T.set),
      set: 0,
    });
    render();
    drawSheet();
  },
  gxcatch: t => {
    const c = C(),
      w = W,
      T = gxGet(c),
      amt = Math.round((w.amt * gxPct(c)) / 100),
      how = t.dataset.v;
    if (how === "moved") gxPut(c, { set: T.set + amt, due: T.due + amt });
    else if (how === "later") gxPut(c, { due: T.due + amt });
    closeSheet();
    render();
  },
});
(() => {
  /* logging untaxed money asks the one question */
  const _fs = ACT.fsave;
  ACT.fsave = function (t) {
    const c = C(),
      n0 = (c.moves || []).length;
    _fs(t);
    const m = (c.moves || [])[n0];
    if (
      G.demo ||
      !m ||
      (c.moves || []).length !== n0 + 1 ||
      m.t !== "in" ||
      !m.src ||
      !gxIsUntaxed(c, m.src) ||
      !(m.amt > 0)
    )
      return;
    W = { kind: "gxcatch", amt: m.amt, src: m.src };
    sheet(gxCatchSheet);
  };
  /* the quarterly date shows up in the next few months */
})();
/* Part of monthsAhead() in ux.js. For a player with income that has no tax taken out, adds the quarterly tax dates to the months. */
function monthsAheadTax(out, c, today) {
  if (!gxOn(c)) return out;
  const S = gxState(c),
    a = parseISO(today || todayISO());
  [a.getFullYear(), a.getFullYear() + 1].forEach(y =>
    GX_DUE.forEach(x => {
      const dt = new Date(y, x[0], x[1]),
        ym = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0"),
        mo = out.find(o => o.ym === ym);
      if (mo && dt >= new Date(a.getFullYear(), a.getMonth(), a.getDate()))
        mo.items.push({
          t:
            "Tax date around the 15th: about " +
            money(S.perQ) +
            " for three months like now" +
            (S.known ? "" : " (guess)"),
          k: "cost",
        });
    })
  );
  return out;
}

/* Part of moneyTab() in ui.js. Adds a slim row "Tax money". Only a player with income that has no tax taken out sees it. */
function moneyTabTaxRow(h) {
  const c = C();
  if (!gxOn(c)) return h;
  const S = gxState(c),
    u = gxUnit(c),
    row = `<button class="rowbtn" data-a="gig"><span style="min-width:0"><b>Tax money</b><div class="tiny muted">${money(Math.round(S.T.set))} set aside · next date around ${S.nx.txt}${u ? " · 1 " + esc(u.n) + " = " + money(u.v) : ""}</div></span>${S.behind > 0 ? `<span class="pill warn" style="flex:none">${money(S.behind)} to catch up</span>` : `<span class="caret">›</span>`}</button>`,
    th = typeof tabHead === "function" ? tabHead() : "";
  return th && h.indexOf(th) >= 0
    ? h.replace(th, () => th + row)
    : h.replace('<div class="stack">', () => '<div class="stack">' + row);
}

Object.assign(GLOSS, {
  setaside: [
    "Why set aside so much",
    "When you work for yourself you pay both halves of Social Security and Medicare, about 15% of what you keep after costs, and then regular income tax on top. A job hides most of this from you. Your costs lower the bill, so track them.",
  ],
  unit: [
    "Your unit",
    "The thing you sell: a session, a shift, a gig. Once the game knows what one really leaves you, it can turn any dollar gap into how many more of them it would take.",
  ],
  floor: [
    "Your floor",
    "The lowest price for your work that still pays for your life after costs and taxes. It is a line to price above, not a price.",
  ],
});
if (typeof MENU !== "undefined" && Array.isArray(MENU) && !MENU.some(m => m[1] === "gig")) {
  const i = MENU.findIndex(m => m[1] === "quick");
  MENU.splice(i >= 0 ? i : MENU.length, 0, [
    "Working for yourself",
    "gig",
    "act",
    "Taxes set aside, what one gig really pays, your floor",
  ]);
}
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
