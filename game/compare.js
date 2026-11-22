/* ===== compare.js: Side by side. Two screens in one sheet. (1) Your plan as it is next to one or two moves, every column run by the same month-by-month plan the rest of the game uses (goalSim), so the dates match What if. (2) The fee X-ray: the same money at your fee and at a low fee, in dollars and in years of work. The fee screen is its own small sum (growth minus the fee, compounded yearly) and says so. Nothing here changes a number until the person taps to use it. ===== */
const CP_FEES = [0.05, 0.25, 0.5, 1, 1.5],
  CP_LOW = 0.05,
  CP_ADDS = [0, 100, 250, 500, 1000];
function cpCol(c, r) {
  const x = r ? r.mv.ap(c) : c,
    sim = goalSim(x, r ? r.mv.opt : undefined),
    d = derive(c),
    dx = derive(x),
    e = Math.min(8, d.era + 1),
    fr = dx.era >= 8 ? 0 : sim.eraAt[8],
    nx = dx.era >= e ? 0 : sim.eraAt[e];
  return { id: r ? r.id : "now", n: r ? r.mv.n : "As it is", left: Math.round(x.take - x.spend), free: fr, nx, e };
}
function cpPicks(c, ms) {
  const w = W;
  if (!w.picks) {
    const pins = ((c.x && c.x.pins) || []).filter(id => ms.some(r => r.id === id));
    w.picks = (pins.length ? pins : ms.map(r => r.id)).slice(0, 2);
  }
  return w.picks.map(id => ms.find(r => r.id === id)).filter(Boolean);
}
function cpWhen(c, mo) {
  return mo == null ? "Not on the calendar" : mo <= 0 ? "Already there" : "Age " + Math.round(c.age + mo / 12);
}
function cpCell(v, sub, best) {
  return `<div class="cpcell ${best ? "best" : ""}"><b>${v}</b>${sub ? `<div class="tiny muted">${sub}</div>` : ""}</div>`;
}
/* cpMoves(c) makes the list of moves in "Side by side". cpMovesBase(c) is the part from this file. */
function cpMoves(c) {
  let h = cpMovesBase(c);
  if (typeof cpMovesDoor === "function") h = cpMovesDoor(h); /* drills.js: the note "one-way door" */
  return h;
}
function cpMovesBase(c) {
  const ms = movesFor(c),
    ps = cpPicks(c, ms),
    cols = [cpCol(c, null)].concat(ps.map(r => cpCol(c, r))),
    n = cols.length,
    g = `style="grid-template-columns:repeat(${n},1fr)"`;
  if (!ms.length)
    return `<div class="small muted">No moves fit your situation yet. As your numbers fill in, they show up here.</div>`;
  const bestFree = cols.filter(x => x.free != null).reduce((a, x) => (a == null || x.free < a ? x.free : a), null),
    bestLeft = Math.max.apply(
      null,
      cols.map(x => x.left)
    ),
    bestNx = cols.filter(x => x.nx != null).reduce((a, x) => (a == null || x.nx < a ? x.nx : a), null),
    same = k => cols.every(x => x[k] === cols[0][k]);
  const row = (label, f, gl) =>
    `<div class="cplabel">${gl ? `<button class="term" data-a="info" data-k="gloss:${gl}">${label}</button>` : label}</div><div class="cpgrid" ${g}>${cols.map(f).join("")}</div>`;
  return `<div class="small muted">Tap up to two moves. Each column is your own numbers with that one change, run through the same plan.</div>
 <div class="chips">${ms
   .slice(0, 8)
   .map(
     r =>
       `<button class="chip sm ${W.picks.includes(r.id) ? "on" : ""}" data-a="cppick" data-v="${r.id}">${esc(r.mv.n)}</button>`
   )
   .join("")}</div>
 <div class="cpgrid cphead" ${g}>${cols.map(x => `<div class="cpcell"><b class="small">${esc(x.n)}</b></div>`).join("")}</div>
 ${row("Left over each month", x => cpCell(money(x.left), x.id === "now" ? "" : (x.left - cols[0].left >= 0 ? "+" : "-") + money(Math.abs(x.left - cols[0].left)), !same("left") && x.left === bestLeft))}
 ${row("Next era: " + esc(EP(cols[0].e)), x => cpCell(x.nx == null ? "Not yet" : x.nx <= 0 ? "There" : fmtDur(x.nx), x.nx != null && x.nx > 0 ? "Age " + Math.round(c.age + x.nx / 12) : "", !same("nx") && x.nx != null && x.nx === bestNx))}
 ${row("Work becomes optional", x => cpCell(cpWhen(c, x.free), x.free > 0 ? "in " + fmtDur(x.free) : "", !same("free") && x.free != null && x.free === bestFree))}
 ${ps.map(r => `<div class="tile small"><b>${esc(r.mv.n)}.</b> ${esc(r.mv.d)}</div>`).join("")}
 ${mathBox(["Each column copies your numbers, makes one change, and runs the same month-by-month plan again.", "Investments are assumed to grow 7% a year after inflation. A long-run average, not a promise.", "The outlined box in a row is the soonest date or the most left over. It is not a recommendation: some moves cost more than money."])}
 ${
   ps.length
     ? `<div class="row" style="gap:8px">${ps
         .map(r => {
           const on = (c.x.pins || []).includes(r.id);
           return `<button class="${on ? "ghost" : "gold"} slim" style="flex:1" data-a="mvpin" data-v="${r.id}">${on ? "Pinned ✓" : "Pin: " + esc(r.mv.n)}</button>`;
         })
         .join("")}</div>`
     : ""
 }`;
}
/* the fee X-ray: one pile, two fees */
function cpFv(inv, add, yrs, rate) {
  let v = inv;
  for (let y = 0; y < yrs; y++) v = v * (1 + rate) + add * 12;
  return v;
}
function cpFee(c, fee, add) {
  const yrs = Math.max(1, Math.round((c.ret || 65) - c.age)),
    hi = cpFv(c.inv || 0, add, yrs, R - fee / 100),
    lo = cpFv(c.inv || 0, add, yrs, R - CP_LOW / 100);
  let extra = 0,
    v = hi;
  while (v < lo - 0.5 && extra < 40) {
    v = v * (1 + R - fee / 100) + add * 12;
    extra++;
  }
  return {
    yrs,
    hi,
    lo,
    lost: Math.max(0, lo - hi),
    extra: lo - hi < 1 ? 0 : extra,
    spendYrs: c.spend > 0 ? Math.max(0, lo - hi) / (c.spend * 12) : null,
  };
}
function cpFeeBody(c) {
  const w = W,
    got = typeof knGot === "function" ? knGot(c, "fee") : null,
    fee = w.fee != null ? w.fee : got ? got.v : 1,
    left = Math.max(0, Math.round((c.take - c.spend) / 50) * 50),
    add = w.add != null ? w.add : left,
    adds = CP_ADDS.concat(left > 0 && !CP_ADDS.includes(left) ? [left] : []).sort((a, b) => a - b),
    X = cpFee(c, fee, add),
    age = Math.round(c.age + X.yrs);
  return `<div class="small muted">A fee looks small as a percent. This shows it as dollars and as years of work, on your own money.</div>
 ${q(`What your investments cost a year`, `<div class="chips">${CP_FEES.map(v => `<button class="chip sm ${fee === v ? "on" : ""}" data-a="cpfee" data-v="${v}">${v}%</button>`).join("")}</div>`, got ? "Yours is on file as " + got.v + "%." : 'Not sure? Most target-date and managed funds sit between 0.25% and 1%. An index fund is near 0.05%. <button class="term" data-a="info" data-k="gloss:feexray">Where to find it</button>')}
 ${q("Added each month from here", `<div class="chips">${adds.map(v => `<button class="chip sm ${add === v ? "on" : ""}" data-a="cpadd" data-v="${v}">${v ? money(v) : "Nothing more"}${v === left && left > 0 ? " (what you keep now)" : ""}</button>`).join("")}</div>`)}
 <div class="cpgrid cphead" style="grid-template-columns:1fr 1fr"><div class="cpcell"><b class="small">At ${fee}%</b></div><div class="cpcell"><b class="small">At ${CP_LOW}%</b></div></div>
 <div class="cplabel">Your pile at ${age}</div><div class="cpgrid" style="grid-template-columns:1fr 1fr">${cpCell(money(Math.round(X.hi)), "")}${cpCell(money(Math.round(X.lo)), "", X.lost >= 1)}</div>
 ${fee <= CP_LOW ? `<div class="tile small">You are already at the low end. Nothing to find here.</div>` : `<div class="tile stack" style="gap:4px;text-align:center"><div class="tiny muted">The fee takes, over ${X.yrs} years</div><div class="bignum" data-fid="cp:lost">${money(Math.round(X.lost))}</div><div class="small">${X.spendYrs != null && X.spendYrs >= 0.1 ? "That is about " + (X.spendYrs < 10 ? X.spendYrs.toFixed(1) : Math.round(X.spendYrs)) + " years of what you spend now. " : ""}${X.extra > 0 ? "To end up with the same pile at " + fee + "%, you would work about <b>" + X.extra + " more year" + (X.extra === 1 ? "" : "s") + "</b>." : "Under a year of extra work makes it up."}</div></div>`}
 ${mathBox(["Start with " + money(c.inv || 0) + " invested, add " + money(add) + " a month, for " + X.yrs + " years (to age " + age + ").", "One side grows 7% minus " + fee + "% a year. The other grows 7% minus " + CP_LOW + "%.", "Both are in today's dollars, compounded once a year. A long-run average, not a promise.", "This is its own small sum. It does not move your dates anywhere else in the game.", "The idea that costs compound just like returns do is John Bogle's (The Little Book of Common Sense Investing)."])}
 ${got && got.v === fee ? "" : `<button class="ghost wide slim" data-a="cpusefee" data-v="${fee}">My fee is about ${fee}%. Remember it</button>`}`;
}
function cpSheet() {
  const c = C(),
    w = W;
  return (
    head("What if", "Side by side") +
    `<div class="seg" style="align-self:flex-start"><button class="${w.tab !== "fee" ? "on" : ""}" data-a="cptab" data-v="moves">Moves</button><button class="${w.tab === "fee" ? "on" : ""}" data-a="cptab" data-v="fee">Fee X-ray</button></div>` +
    (w.tab === "fee" ? cpFeeBody(c) : cpMoves(c)) +
    `<button class="ghost wide slim" data-a="moves">All the moves, one at a time</button>`
  );
}
Object.assign(ACT, {
  compare: t => {
    W = { kind: "compare", tab: t && t.dataset && t.dataset.v === "fee" ? "fee" : "moves" };
    sheet(cpSheet);
  },
  cptab: t => {
    W.tab = t.dataset.v;
    drawSheet();
  },
  cppick: t => {
    const id = t.dataset.v,
      p = W.picks || [];
    W.picks = p.includes(id) ? p.filter(x => x !== id) : p.concat([id]).slice(-2);
    drawSheet();
  },
  cpfee: t => {
    W.fee = +t.dataset.v;
    drawSheet();
  },
  cpadd: t => {
    W.add = +t.dataset.v;
    drawSheet();
  },
  cpusefee: t => {
    const c = C();
    c.x = c.x || {};
    c.x.kin = c.x.kin || {};
    c.x.kin.fee = { v: +t.dataset.v, cf: 2, d: todayISO() };
    save();
    drawSheet();
  },
});
/* Part of movesSheet() in ui.js. On the list of moves, adds the button "Put two moves side by side". */
function movesSheetCompare(h) {
  if (W && W.tab && W.tab !== "moves") return h;
  const a = '<div class="small muted">Each one is run on your numbers';
  return h.indexOf(a) < 0
    ? h
    : h.replace(a, () => `<button class="ghost wide slim" data-a="compare">Put two moves side by side</button>` + a);
}

Object.assign(GLOSS, {
  feexray: [
    "Where to find your fee",
    "Look for the words expense ratio next to each fund in your account. If someone manages the account for you, add their yearly fee on top. A target-date fund in a work plan is often 0.1% to 0.6%.",
  ],
  sidebyside: [
    "Side by side",
    "Your plan as it is, next to the same plan with one thing changed. Same numbers, same rules, so the only difference you see is the change.",
  ],
});
if (typeof MENU !== "undefined" && Array.isArray(MENU)) {
  const m = MENU.find(x => x[1] === "moves");
  if (m) m[3] = "Try a move, put two side by side, or X-ray a fee";
}
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
