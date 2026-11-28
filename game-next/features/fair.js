/* ============================================================================
   SLAM the Game: features/fair.js
   PURPOSE     Share costs fairly. For two or more persons: five ways to divide the shared costs, side
               by side. The five ways: Equal, By income, Labor counts (unpaid work at home has a price),
               Same left over, and By use (nights at home).
   INPUT       The game: G.chars, G.demo, G.fair. The open sheet (W.kind): fair. The taps of the player
               (the actions in OUTPUT).
   OUTPUT      11 functions. Parts of functions in other files: mePeopleFair. Actions (ACT): fair,
               fred, frset, fradd, frdel, frtotal, frrate, frpick, frpayer, frcopy. Menu: "Sharing costs
               fairly".
   DEPENDS ON  core/report.js, screens/ui.js, screens/planner.js, features/compare.js.
   RULES       No method is marked as the best. Nothing here moves money or changes a profile. A person
               comes from a profile of this game, or is a guest with only the three numbers that the
               math needs.
   ========================================================================= */
const FR_METHODS = [
  ["equal", "Equal", "Everyone pays the same."],
  ["income", "By income", "Everyone pays the same share of what they bring in."],
  ["labor", "Labor counts", "Unpaid work at home is priced, and counts as paying in."],
  ["left", "Same left over", "Everyone ends the month with the same amount after shared bills."],
  ["use", "By use", "Split by how many nights each person is here."],
];
function frState() {
  const f = G.fair || {};
  return {
    ppl: Array.isArray(f.ppl) ? f.ppl : null,
    total: f.total == null ? null : f.total,
    rate: f.rate || frRateDefault(),
    payer: f.payer == null ? 0 : f.payer,
    pick: f.pick || null,
  };
}
/* The rate until one is tapped: the value of an hour of Who carries what (rolemap.js), rounded to a dollar,
   else $20. */
function frRateDefault() {
  return frRateFrom().v;
}
/* The same value of an hour as Who carries what (rmRate in rolemap.js): the time price of chores, else the pay
   per hour. from: "tp", "wage" or null (then $20). */
function frRateFrom() {
  const c = typeof C === "function" && !G.demo ? C() : null,
    R = c && typeof rmRate === "function" ? rmRate(c) : { rate: null, from: null },
    v = R.rate > 0 ? Math.round(R.rate) : 0;
  return v > 0 ? { v, from: R.from } : { v: 20, from: null };
}
function frSeed() {
  const out = [];
  (G.demo ? [] : G.chars).forEach((c, i) => {
    if (c.led) out.push({ n: String(c.name), from: i, inc: null, hrs: 5, nights: 7 });
  });
  while (out.length < 2) out.push({ n: "Person " + (out.length + 1), from: null, inc: 3000, hrs: 5, nights: 7 });
  return out.slice(0, 6);
}
function frPut(patch) {
  G.fair = Object.assign(frState(), patch);
  if (!G.fair.ppl) G.fair.ppl = frSeed();
  save();
}
function frPpl() {
  const S = frState(),
    /* rolemap.js: the admin hours a month of each person, from Who carries what, by name */
    adm = typeof rmFairHours === "function" && !G.demo ? rmFairHours(C()) : {};
  return (S.ppl || frSeed()).map(p => {
    const c = p.from != null ? G.chars[p.from] : null,
      linked = !!(c && String(c.name) === p.n);
    return Object.assign({}, p, {
      linked,
      inc: linked ? c.take || 0 : p.inc || 0,
      adm: adm[String(p.n).trim().toLowerCase()] || 0,
    });
  });
}
function frDefaultTotal() {
  const c = C();
  if (!c.led) return 2000;
  const t = (c.spends || [])
    .filter(r => ["Home", "Food", "Bills and subscriptions"].includes(r.k))
    .reduce((a, r) => a + (r.amt || 0), 0);
  return t > 0 ? Math.round(t / 50) * 50 : 2000;
}
/* give each person "want", never below zero; whatever the floor absorbs is spread over the rest */
function frFloor(want, T) {
  const n = want.length,
    pay = want.slice(),
    fixed = want.map(() => false);
  for (let k = 0; k < n; k++) {
    let neg = false;
    pay.forEach((v, i) => {
      if (!fixed[i] && v < 0) {
        fixed[i] = true;
        pay[i] = 0;
        neg = true;
      }
    });
    const free = pay.map((v, i) => (fixed[i] ? null : v)).filter(v => v != null),
      sum = pay.reduce((a, v) => a + v, 0),
      gap = T - sum;
    if (!free.length) {
      break;
    }
    if (Math.abs(gap) > 1e-9)
      pay.forEach((v, i) => {
        if (!fixed[i]) pay[i] = v + gap / free.length;
      });
    if (!neg && pay.every(v => v >= -1e-9)) break;
  }
  return pay.map(v => Math.max(0, v));
}
function frCalc(P, T, rate) {
  const n = P.length,
    sumInc = P.reduce((a, p) => a + p.inc, 0),
    sumN = P.reduce((a, p) => a + p.nights, 0),
    val = P.map(p => ((p.hrs * 52) / 12 + (p.adm || 0)) * rate),
    sumVal = val.reduce((a, v) => a + v, 0),
    eq = P.map(() => T / n);
  return {
    equal: eq,
    income: sumInc > 0 ? P.map(p => (T * p.inc) / sumInc) : eq,
    labor: frFloor(
      val.map(v => (T + sumVal) / n - v),
      T
    ),
    left: frFloor(
      P.map(p => p.inc - (sumInc - T) / n),
      T
    ),
    use: sumN > 0 ? P.map(p => (T * p.nights) / sumN) : eq,
    val,
    sumVal,
  };
}
function frChips(a, i, k, opts, cur, f) {
  return `<div class="chips">${opts.map(v => `<button class="chip sm ${cur === v ? "on" : ""}" data-a="${a}" data-k="${k}" data-v="${i}:${v}">${f(v)}</button>`).join("")}</div>`;
}
function frSheet() {
  const w = W,
    S = frState(),
    P = frPpl(),
    T = S.total == null ? frDefaultTotal() : S.total,
    R = frCalc(P, T, S.rate),
    ed = w.ed,
    opts = [1000, 1500, 2000, 3000, 4000, 6000],
    dT = frDefaultTotal(),
    tot = opts.includes(dT) ? opts : opts.concat([dT]).sort((a, b) => a - b);
  const person = (p, i) => {
    const on = ed === i;
    return `<div class="tile stack" style="gap:6px"><button class="kwhead" data-a="fred" data-v="${i}" aria-expanded="${on}"><span class="ava2">${esc(p.n.trim().charAt(0).toUpperCase())}</span><span style="flex:1;min-width:0;text-align:left"><b>${esc(p.n)}</b><span class="tiny muted" style="display:block">${money(p.inc)} a month${p.linked ? " (from their profile)" : ""} · ${p.hrs} hrs of home work a week${p.adm > 0 ? " · " + jobHoursWords(p.adm * 60) + " of money admin a month" : ""} · ${p.nights} nights</span></span><span class="caret">${on ? "⌄" : "<i class=chev aria-hidden=true></i>"}</span></button>
  ${
    on
      ? `${
          p.linked
            ? ""
            : q(
                "What they bring in a month",
                frChips("frset", i, "inc", [0, 1500, 3000, 4500, 6000, 9000], p.inc, v => money(v))
              )
        }${q(
          "Unpaid work at home, hours a week",
          frChips("frset", i, "hrs", [0, 5, 10, 15, 25, 40], p.hrs, v => v),
          "Cooking, cleaning, child care, running the house."
        )}${q(
          "Nights a week here",
          frChips("frset", i, "nights", [1, 2, 3, 5, 7], p.nights, v => v)
        )}${!p.linked && P.length > 2 ? `<button class="ghost wide slim" data-a="frdel" data-v="${i}">Take ${esc(p.n)} out</button>` : ""}`
      : ""
  }</div>`;
  };
  const meth = m => {
    const pay = R[m[0]],
      on = S.pick === m[0];
    return `<div class="tile stack" style="gap:6px${on ? ";border-color:var(--good)" : ""}"><div class="row between" style="gap:8px;align-items:flex-start"><span style="min-width:0"><b>${m[1]}</b><div class="tiny muted">${m[2]}</div></span><button class="${on ? "primary" : "ghost"} slim" style="flex:none" data-a="frpick" data-v="${m[0]}">${on ? "Ours ✓" : "Use this"}</button></div><div class="cpgrid" style="grid-template-columns:repeat(${Math.min(3, P.length)},1fr)">${P.map((p, i) => cpCell(money(Math.round(pay[i])), esc(p.n) + (p.inc > 0 ? " · " + Math.round((pay[i] / p.inc) * 100) + "% of pay" : "") + (m[0] === "labor" ? " · plus " + money(Math.round(R.val[i])) + " of work" : ""))).join("")}</div>${(m[0] === "left" || m[0] === "labor") && pay.some(v => v < 0.5) ? `<div class="tiny muted">${m[0] === "left" ? "The incomes are far enough apart that they cannot be evened out, so the smallest pays nothing here." : "Someone's work at home is already worth more than an equal share, so they pay no cash here."}</div>` : ""}</div>`;
  };
  const pk = S.pick && R[S.pick],
    payer = Math.min(S.payer, P.length - 1);
  return (
    head("People", "Sharing costs fairly") +
    `<div class="small muted">Five ways to split what you share, on your own numbers. Look at them together and pick the one that feels fair to everyone. None of them is the right answer.</div>
 <b class="small">Who is sharing</b><div class="stack" style="gap:6px">${P.map(person).join("")}</div>${P.length < 6 ? `<button class="ghost wide slim" data-a="fradd">Add a person</button>` : ""}
 ${q("What you share each month", `<div class="chips">${tot.map(v => `<button class="chip sm ${T === v ? "on" : ""}" data-a="frtotal" data-v="${v}">${money(v)}${v === dT && C().led ? " (home, food, bills now)" : ""}</button>`).join("")}</div>`)}
 ${q(
   "An hour of home work is worth",
   `<div class="chips">${[15, 20, 25, 35]
     .concat([15, 20, 25, 35].includes(frRateDefault()) ? [] : [frRateDefault()])
     .sort((x, y) => x - y)
     .map(
       v =>
         `<button class="chip sm ${S.rate === v ? "on" : ""}" data-a="frrate" data-v="${v}">${money(v)}${v === frRateDefault() && frRateFrom().from ? (frRateFrom().from === "tp" ? " (your time price)" : " (your pay per hour)") : ""}</button>`
     )
     .join("")}</div>`,
   "About what it would cost to pay someone else to do it. Only the Labor counts method uses this."
 )}
 <b class="small">Five ways to split ${money(T)}</b><div class="stack" style="gap:6px">${FR_METHODS.map(meth).join("")}</div>
 ${pk ? `<div class="tile stack" style="gap:6px"><b class="small">Who sends what, with ${esc(FR_METHODS.find(m => m[0] === S.pick)[1])}</b>${q("Who pays the shared bills now?", `<div class="chips">${P.map((p, i) => `<button class="chip sm ${payer === i ? "on" : ""}" data-a="frpayer" data-v="${i}">${esc(p.n)}</button>`).join("")}</div>`)}${P.map((p, i) => (i === payer ? "" : `<div class="row between small"><span>${esc(p.n)} sends ${esc(P[payer].n)}</span><b>${money(Math.round(pk[i]))} a month</b></div>`)).join("")}<div class="tiny muted">${esc(P[payer].n)}'s own share is ${money(Math.round(pk[payer]))}.</div><button class="ghost wide slim" data-a="frcopy">${w.copied ? "Copied ✓" : "Copy this to send"}</button></div>` : ""}
 <details class="math"><summary>Other ways people do it</summary><div class="inner stack small" style="gap:6px"><div><b>Mix two.</b> Rent and bills by income, groceries equal.</div><div><b>A ceiling.</b> Nobody pays more than a set share of their pay, say 30%, and the rest is split among the others.</div><div><b>Yours, mine and ours.</b> One shared account everyone feeds by an agreed rule, and everything else stays separate.</div><div><b>Take turns.</b> Rotate who covers what by month. Simple, and only fair when incomes are close.</div><div><b>By room.</b> The bigger room or the private bathroom pays more of the rent.</div></div></details>
 ${mathBox(["Equal: " + money(T) + " divided by " + P.length + ".", "By income: your share of the bills equals your share of the pay coming in.", "Labor counts: home hours times 52 weeks over 12 months, plus the money admin hours a month of Who carries what, times " + money(S.rate) + " an hour. That value is added to the pot, the pot is split equally, and each person's work is taken off what they owe in cash.", "Same left over: add up everyone's pay, take off the shared bills, split what remains equally. Each person pays the difference.", "By use: by nights a week. Nobody is ever asked to pay less than zero: when a method would, the others share that part.", "Counting unpaid work as a real contribution is the idea behind Eve Rodsky's Fair Play and decades of household economics."])}`
  );
}
function frText() {
  const S = frState(),
    P = frPpl(),
    T = S.total == null ? frDefaultTotal() : S.total,
    R = frCalc(P, T, S.rate);
  if (!S.pick) return "";
  const m = FR_METHODS.find(x => x[0] === S.pick);
  return ["How we share " + money(T) + " a month: " + m[1] + ". " + m[2]]
    .concat(P.map((p, i) => p.n + ": " + money(Math.round(R[S.pick][i])) + " a month"))
    .join("\n");
}
Object.assign(ACT, {
  fair: () => {
    if (!frState().ppl) frPut({});
    W = { kind: "fair", ed: null };
    sheet(frSheet);
  },
  fred: t => {
    const i = +t.dataset.v;
    W.ed = W.ed === i ? null : i;
    drawSheet();
  },
  frset: t => {
    const k = t.dataset.k,
      pr = String(t.dataset.v).split(":"),
      i = +pr[0],
      v = +pr[1],
      ppl = frState().ppl.map(p => Object.assign({}, p));
    if (!ppl[i] || !["inc", "hrs", "nights"].includes(k)) return;
    ppl[i][k] = v;
    frPut({ ppl });
    W.copied = false;
    drawSheet();
  },
  fradd: () => {
    const ppl = frState().ppl.slice();
    if (ppl.length >= 6) return;
    let k = ppl.length + 1;
    while (ppl.some(p => p.n === "Person " + k)) k++;
    ppl.push({ n: "Person " + k, from: null, inc: 3000, hrs: 5, nights: 7 });
    frPut({ ppl });
    W.ed = ppl.length - 1;
    drawSheet();
  },
  frdel: t => {
    const i = +t.dataset.v,
      S = frState(),
      ppl = S.ppl.slice();
    if (ppl.length <= 2 || !ppl[i]) return;
    ppl.splice(i, 1);
    frPut({ ppl, payer: Math.min(S.payer, ppl.length - 1) });
    W.ed = null;
    drawSheet();
  },
  frtotal: t => {
    frPut({ total: +t.dataset.v });
    W.copied = false;
    drawSheet();
  },
  frrate: t => {
    frPut({ rate: +t.dataset.v });
    drawSheet();
  },
  frpick: t => {
    frPut({ pick: t.dataset.v });
    W.copied = false;
    drawSheet();
  },
  frpayer: t => {
    frPut({ payer: +t.dataset.v });
    drawSheet();
  },
  frcopy: () => {
    try {
      navigator.clipboard.writeText(frText());
    } catch (e) {
      report(e, "fair.js: frcopy");
    }
    W.copied = true;
    drawSheet();
  },
});
/* Part of meTabPeople() in profiles.js. Adds the row "Sharing costs fairly" to the card "Your people" of Me. */
function mePeopleFair(h) {
  const row = `<button class="rowbtn" data-a="fair"><span><b>Sharing costs fairly</b><div class="tiny muted">Two people or six: five ways to split what you share</div></span><span class="caret"><i class=chev aria-hidden=true></i></span></button>`;
  return h + row;
}

if (typeof MENU !== "undefined" && Array.isArray(MENU) && !MENU.some(m => m[1] === "fair")) {
  const i = MENU.findIndex(m => m[1] === "people");
  MENU.splice(i >= 0 ? i + 1 : MENU.length, 0, [
    "Sharing costs fairly",
    "fair",
    "act",
    "Equal, by income, labor counts, and two more",
  ]);
}
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
