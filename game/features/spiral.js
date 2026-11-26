/* ============================================================================
   SLAM the Game: features/spiral.js
   PURPOSE     Setup as a spiral of five rounds, in the order of the letters D, A, I, T, E (features/know.js:
               Debts, Assets, Income, Taxes, Expenses). Each round asks a few taps, then shows ONE number for
               its letter (with its Guess tag and "Where's this from?"), links that number to the numbers of
               the rounds before it (a small chain), and moves a slim route strip of the eras with a "you are
               here" marker ("Recalculating route" when something moved). The round ends on a level change:
               what was entered, a short coaching summary, "Next" or "Stop here, I'll come back". After the
               last round: "Your first plan", written as a route.
   INPUT       The setup sheet (W.kind setup): W.step, W.o, W.sp (the screen between two rounds), W.spLast
               (the route of the round before), W.spBeat (the pick that shows for a beat). The profile, for
               the first plan. The taps of the player (the actions in OUTPUT).
   OUTPUT      Math: spPreview, spNumber, spFifty, spRoute, spDest, spMonthsTo, spDepends, spPlan, spiralBook.
               Views: spHead, spChecklist, spSetupSheet, spPlanSheet. Parts of functions in other files:
               spOn, spRoundEnd, spNextLabel, spBeatStart, spBeatOn (screens/smart.js and setupSheet() in
               ui.js), spPlanOpen (finishSetupReveal in element.js). Actions (ACT): spnext, spgo, spstop,
               spline, spplan2.
   DEPENDS ON  core/engine.js (applyTypical, derive, ERAS, yearsTo), core/recalc.js (rcRoute, rcWords),
               core/metrics.js (knSt, knNet), screens/ui.js, screens/smart.js (SM_ORDER, smQs, smAns,
               smTaxApply), features/know.js (KW_AREAS), features/kit.js (whereFromText, kitPill),
               features/look.js (lkRowRange, lkNwRange, lkK), features/debts.js (dbPlan),
               features/element.js (elOf, EL_SIDES, elStore).
   RULES       The numbers of a round come from a copy of the answers with the typical numbers filled in, so
               each one is a Guess until the player makes it real. No verdict words: the coaching summary
               compares with a common guide in plain words and never grades. Change "Change my answers"
               (edit mode) keeps the pages in this order, with no screens between the rounds.
   ========================================================================= */
const SP_ROUNDS = [
  { L: "", n: "About you", one: "Before the five questions", icon: "👋", pages: [0] },
  { L: "D", icon: "💳", pages: [9, 4, 10] },
  { L: "A", icon: "🏦", pages: [5, 11, 7] },
  { L: "I", icon: "💵", pages: [1, 12] },
  { L: "T", icon: "🧾", pages: [8] },
  { L: "E", icon: "🛒", pages: [2, 3, 13, 6] },
];
SP_ROUNDS.forEach(r => {
  const a = typeof KW_AREAS !== "undefined" ? KW_AREAS.find(x => x[0] === r.L) : null;
  if (a) {
    r.n = a[1];
    r.one = a[2];
  }
});
const SP_BEAT_MS = 650;
/* The answers that the preview fills in while a round has not asked them yet. */
const SP_FILL = { rel: "Single, seeking", deps: "None", share: "No one", steady: "Steady", payFreq: "Every 2 weeks" };
/* A new screen starts at its top, with its title in view. After the draw, so the new screen is there. */
function spUp() {
  try {
    const s = typeof document !== "undefined" && document.querySelector ? document.querySelector("#ov .sheet") : null;
    if (s) s.scrollTop = 0;
  } catch (e) {
    report(e, "spiral.js: spUp");
  }
}
function spUpSoon() {
  if (typeof setTimeout === "function") setTimeout(spUp, 0);
}
const spOn = w => !!(w && w.kind === "setup" && w.mode !== "edit");
/* The last page of round R that this player sees (a page with nothing to ask is passed over, smart.js smSkip). */
function spLastPage(w, R) {
  const live = R.pages.filter(p => !(typeof smSkip === "function" && smSkip(w, p)));
  return live.length ? live[live.length - 1] : R.pages[R.pages.length - 1];
}
function spRoundOf(step) {
  const i = SP_ROUNDS.findIndex(r => r.pages.includes(step));
  return i < 0 ? 0 : i;
}
/* THE MATH. A copy of the answers, with the typical numbers, gives the numbers of a round. */
function spPreview(w) {
  const o = clone(w.o);
  Object.keys(SP_FILL).forEach(k => {
    if (o[k] == null) o[k] = SP_FILL[k];
  });
  o.home = HOMEMAP[o.homeQ] || o.home || "Renting";
  if (o.age == null) o.age = 30;
  if (o.ret == null || o.ret <= o.age) o.ret = Math.max(60, o.age + 5);
  o.placed = false;
  o.confEra = null;
  if (typeof smTaxApply === "function") smTaxApply(o);
  if (typeof amApply === "function") amApply(o); /* amounts.js: the amounts of the rounds become rows */
  applyTypical(o);
  return { c: o, d: derive(o) };
}
const spSum = (rows, f) => (rows || []).reduce((t, r) => t + f(r), 0);
/* The ONE number of a letter: { big, short (for the chain), what, st, keys (for "Where's this from?") }. */
function spNumber(L, c, d) {
  const debts = (c.debts || []).filter(x => x.amt > 0);
  if (L === "D") {
    const t = spSum(debts, x => x.amt);
    return debts.length
      ? { big: money(t), short: lkK(t) + " owed", what: "What you owe", st: knSt(debts), keys: ["debt"], v: t }
      : { big: "$0", short: "$0 owed", what: "What you owe", st: "Close", keys: [], v: 0, none: true };
  }
  if (L === "A") {
    const own = [].concat(
        (c.cashes || []).filter(x => !x.hold).map(x => [x, "cashes"]),
        (c.invs || []).map(x => [x, "invs"])
      ),
      lo = spSum(own, z => lkRowRange(z[0], z[1])[0]),
      hi = spSum(own, z => lkRowRange(z[0], z[1])[1]),
      st = own.length ? knSt(own.map(z => z[0])) : "Guess",
      v = d.cash + (c.inv || 0);
    return {
      big: lo !== hi ? "about " + lkK(lo) + " to " + lkK(hi) : money(v),
      short: lo !== hi ? lkK(lo) + " to " + lkK(hi) + " own" : lkK(v) + " own",
      what: "What you have",
      st,
      keys: ["cash", "inv"],
      v,
      lo,
      hi,
    };
  }
  if (L === "I")
    return {
      big: money(c.take) + " a month",
      short: lkK(c.take) + "/mo in",
      what: "Money coming in",
      st: knSt(c.incs || []),
      keys: ["take"],
      v: c.take,
    };
  if (L === "T") {
    const n = knNet(c),
      off = Math.max(0, Math.round(n.gross - (c.take || 0)));
    return {
      big: money(off) + " a month",
      short: lkK(off) + "/mo off",
      what: "Taxes off the top, before your pay lands",
      st: n.known ? "Close" : "Guess",
      keys: [],
      v: off,
      gross: Math.round(n.gross),
      pct: Math.round((1 - n.f) * 100),
    };
  }
  return {
    big: money(c.spend) + " a month",
    short: lkK(c.spend) + "/mo out",
    what: "Money going out",
    st: knSt(c.spends || []),
    keys: ["spend"],
    v: c.spend,
  };
}
/* 50/30/20 in plain words: needs (home, food, getting around, bills), wants (the rest), what is left. */
const SP_NEEDS = /^(home|food|getting around|bills)/i;
function spFifty(c) {
  const rows = c.spends || [],
    take = Math.max(1, c.take || 0),
    needs = rows.length
      ? spSum(
          rows.filter(r => SP_NEEDS.test(r.k)),
          r => r.amt
        )
      : c.spend || 0,
    wants = rows.length
      ? spSum(
          rows.filter(r => !SP_NEEDS.test(r.k)),
          r => r.amt
        )
      : 0,
    save = take - needs - wants;
  return {
    take,
    needs,
    wants,
    save,
    pn: needs / take,
    pw: wants / take,
    ps: save / take,
    groups: rows.map(r => ({ k: r.k, amt: r.amt, pct: r.amt / take })).sort((a, b) => b.amt - a.amt),
  };
}
/* The route: each era not reached yet, in order, with the months to reach it from today (null: no date on
   today's numbers). The money left each month goes to one stop at a time: the $1,000 cushion, the match, the
   debt at 8% or more, the full emergency fund, a year of filling the tax-friendly accounts. The later eras
   (on track, coast, work optional) come from the money invested and the money saved a year. */
function spRoute(c, d) {
  d = d || derive(c);
  const left = Math.round((c.take || 0) - (c.spend || 0)),
    toRet = Math.max(0, c.ret - c.age),
    stops = [];
  let cum = 0;
  const run = mm => {
    if (cum == null || mm == null) cum = null;
    else cum += mm;
    return cum;
  };
  for (let i = Math.max(1, d.rawEra + 1); i <= 8; i++) {
    if (d.g[i]) continue;
    let m = null;
    if (i === 1) {
      const need = Math.max(0, 1000 - d.cash);
      m = run(need <= 0 ? 0 : left > 0 ? Math.ceil(need / left) : null);
    } else if (i === 2) m = run(1);
    else if (i === 3) {
      const hi = (c.debts || []).filter(x => x.high && x.amt > 0);
      const p = hi.length && left > 0 ? dbPlan(Object.assign({}, c, { debts: hi }), "avalanche", left) : null;
      m = run(!hi.length ? 0 : p ? p.months : null);
    } else if (i === 4) {
      const need = Math.max(0, d.target * (c.spend || 0) - Math.max(d.cash, 1000));
      m = run(need <= 0 ? 0 : left > 0 ? Math.ceil(need / left) : null);
    } else if (i === 5) m = run(12);
    else {
      const y =
        i === 6
          ? spOnTrackYears(c.inv || 0, d.save, toRet, d.fiRet)
          : yearsTo(c.inv || 0, d.save, i === 7 ? d.coastNum : d.fi);
      m = y == null || cum == null ? null : Math.max(cum, y * 12);
    }
    stops.push({ i, n: ERAS[i].n, p: ERAS[i].p, gate: ERAS[i].gate, m });
  }
  return { left, stops, era: d.rawEra };
}
/* On track (era 6): the years of saving until the money invested, with the yearly Roth amount on top until the
   retirement age, reaches what retirement needs. The same test as d.qq in derive(). */
function spOnTrackYears(inv, save, toRet, need) {
  for (let n = 0; n <= 80; n++) {
    if (grow(inv, Math.max(0, toRet - n), ROTH) >= need) return n;
    inv = inv * (1 + R) + save;
  }
  return null;
}
/* The destination: the first stop that money moves (not the match and not the yearly filling). */
function spDest(rt) {
  return rt.stops.find(s => s.i !== 2 && s.i !== 5) || rt.stops[0] || null;
}
/* The months to reach era i on these numbers: 0 when it is reached already, null with no date. */
function spMonthsTo(c, i) {
  const d = derive(c);
  if (d.g[i] && d.rawEra >= i) return 0;
  const s = spRoute(c, d).stops.find(x => x.i === i);
  return s ? s.m : 0;
}
const SP_INPUTS = [
  ["take", "incs", "Money coming in"],
  ["spend", "spends", "Money going out"],
  ["cash", "cashes", "Cash you can reach"],
  ["debt", "debts", "What you owe"],
  ["inv", "invs", "What you have invested"],
];
/* It depends on: each input that is still a Guess, nudged down and up by a fifth. The ones that move the date
   of the destination most come first. { k, n, months } with months Infinity when the nudge decides if there
   is a date at all. */
function spDepends(c, i) {
  if (i == null) return [];
  const base = spMonthsTo(c, i),
    out = [];
  SP_INPUTS.forEach(([k, sec, n]) => {
    const rows = c[sec] || [];
    if (!rows.length || isSharp(c, k)) return;
    let most = 0;
    [0.8, 1.2].forEach(f => {
      const p = clone(c);
      p[sec].forEach(x => (x.amt = Math.round(x.amt * f)));
      syncAll(p);
      const m = spMonthsTo(p, i),
        dm = m == null || base == null ? (m === base ? 0 : Infinity) : Math.abs(m - base);
      most = Math.max(most, dm);
    });
    if (most >= 1) out.push({ k, n, months: most });
  });
  return out.sort((a, b) => b.months - a.months).slice(0, 3);
}
const spWhen = m =>
  m == null
    ? "no date yet"
    : m <= 0
      ? "now"
      : "about " + rcMonthName(rcAddMonths(rcYm(todayISO()), m)) + " (" + rcSpan(m) + ")";
/* The first plan, as a route. */
function spPlan(c) {
  const d = derive(c),
    rt = spRoute(c, d),
    dest = spDest(rt),
    st = knSt(
      c.incs || [],
      c.spends || [],
      c.cashes || [],
      (c.debts || []).filter(x => x.amt > 0)
    ),
    ult = rt.stops.find(s => s.i === 8) || rt.stops[rt.stops.length - 1] || null,
    legs = [rt.stops[0], rt.stops[1], ult].filter((s, k, a) => s && a.indexOf(s) === k),
    deps = spDepends(c, dest ? dest.i : null),
    ns = typeof nextStep === "function" ? nextStep(c, d) : null,
    week = [];
  if (ns && ns.a) week.push({ t: ns.t, s: ns.s, a: ns.a, v: ns.v });
  deps.forEach(x => {
    if (week.length < 3 && !week.some(m => m.a === "sharp" && m.v === x.k))
      week.push({
        t: "Put in your real number: " + x.n.toLowerCase(),
        s: "A few taps. A guess is fine.",
        a: "sharp",
        v: x.k,
      });
  });
  return { d, rt, dest, st, legs, deps, week, el: typeof elOf === "function" ? elOf(c) : null };
}
/* The 50/30/20 split and the destination in the spreadsheet of the plan (book.js). */
function spiralBook(c) {
  const f = spFifty(c);
  return {
    title: "Your first plan: needs, wants and what is left",
    rows: [
      { id: "sp_take", label: "Take-home pay a month", v: f.take },
      { id: "sp_needs", label: "Needs a month", v: f.needs, note: "Home, food, getting around, bills" },
      { id: "sp_wants", label: "Wants a month", v: f.wants, note: "Fun and everything else" },
      { id: "sp_save", label: "Left to save a month", v: f.save, f: "={sp_take}-{sp_needs}-{sp_wants}" },
      { id: "sp_pn", label: "Needs, share of pay", v: f.pn, f: "={sp_needs}/{sp_take}" },
      { id: "sp_pw", label: "Wants, share of pay", v: f.pw, f: "={sp_wants}/{sp_take}" },
      { id: "sp_ps", label: "Left to save, share of pay", v: f.ps, f: "={sp_save}/{sp_take}" },
    ],
  };
}

/* THE VIEWS. */
const spPct = v => Math.round(v * 100) + "%";
function spLetterNo(r) {
  return SP_ROUNDS.slice(1).indexOf(SP_ROUNDS[r]) + 1;
}
/* The meter that fills, the big "Question 1 of 5" and the name of the step with its icon. */
function spTop(w, step, done) {
  const r = spRoundOf(step),
    R = SP_ROUNDS[r],
    L = typeof smLive === "function" ? smLive(w) : SM_ORDER,
    at = L.indexOf(step),
    n = L.length,
    fill = done ? (L.indexOf(spLastPage(w, R)) + 1) / n : at / n;
  return (
    head("Getting started · page " + (at + 1) + " of " + n, "") +
    `<div class="spmeter" role="progressbar" aria-label="Setup" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(fill * 100)}"><i style="width:${Math.max(3, Math.round(fill * 100))}%"></i></div>` +
    (R.L
      ? `<div class="spq">Question ${spLetterNo(r)} of 5</div><div class="spstep"><span aria-hidden="true">${R.icon}</span> <b>${esc(R.n)}</b>: ${esc(R.one)}</div>`
      : `<h2>About you</h2><div class="spstep"><span aria-hidden="true">${R.icon}</span> ${esc(R.one)}</div>`)
  );
}
/* What the round has so far: each answer as a short line you can tap to change, and what is still to come. */
function spChecklist(w, r) {
  const R = SP_ROUNDS[r],
    o = w.o,
    s = typeof smState === "function" ? smState(w) : { open: null },
    out = [];
  R.pages.forEach(p => {
    if (typeof amChecklist === "function" && amChecklist(w, p, out)) return; /* amounts.js: pages 9 to 13 */
    if (p === 4) {
      const ks = (o.debtKinds || []).concat(o.mort ? ["Mortgage"] : []);
      out.push({
        s: "Kinds of debt",
        v: ks.length ? ks.join(", ") : w.step !== 4 && spPassed(w, 4) ? "None" : null,
        p,
      });
    } else if (p === 5)
      out.push({
        s: "Accounts",
        v: (o.accts || []).length ? o.accts.join(", ") : w.step !== 5 && spPassed(w, 5) ? "None" : null,
        p,
      });
    else
      (smQs(w, p) || []).forEach(q => {
        const v = o[q.k];
        out.push({
          s: q.s,
          k: q.k,
          p,
          v: smAns(w, q)
            ? Array.isArray(v)
              ? v.map(x => (q.lab && q.lab[x]) || x).join(", ")
              : v || "Skipped"
            : q.opt && spPassed(w, p)
              ? "Skipped"
              : null,
          now: q.k === s.open,
        });
      });
  });
  return out;
}
const spPassed = (w, p) => SM_ORDER.indexOf(w.step) > SM_ORDER.indexOf(p) || !!w.sp;
function spChecklistHtml(w, r, all) {
  const L = spChecklist(w, r),
    got = L.filter(x => x.v != null),
    miss = L.filter(x => x.v == null);
  if (!L.length || (!got.length && !all)) return "";
  return `<div class="spcheck">${got.map(x => `<button class="spline" data-a="spline" data-v="${x.p}" data-k="${esc(x.k || "")}"><span>✓ <b>${esc(x.s)}:</b> ${esc(String(x.v).length > 40 ? String(x.v).slice(0, 38) + "…" : x.v)}</span><span class="caret">›</span></button>`).join("")}${miss.length ? `<div class="tiny muted">Still to come: ${esc(miss.map(x => x.s).join(", "))}</div>` : ""}</div>`;
}
/* Part of setupSheetBase() in ui.js: the top of a page of setup. Null in edit mode. */
function spHead(w) {
  if (!spOn(w)) return null;
  return spTop(w, w.step) + spChecklistHtml(w, spRoundOf(w.step));
}
/* Part of setupSheetBase() in ui.js: the label of Next. */
function spNextLabel(w) {
  if (!spOn(w)) return null;
  const R = SP_ROUNDS[spRoundOf(w.step)];
  return R.L && spLastPage(w, R) === w.step ? "See my " + R.n.toLowerCase() + " number" : "Next";
}
/* Part of smStepOn() in smart.js and ACT.wnext in ui.js. At the end of a letter round, opens the number of the
   round in place of the next page. Returns true when it did. */
function spRoundEnd(w) {
  if (!spOn(w)) return false;
  const r = spRoundOf(w.step),
    R = SP_ROUNDS[r];
  if (!R.L || spLastPage(w, R) !== w.step) return false;
  try {
    const P = spPreview(w),
      ds = spDest(spRoute(P.c, P.d));
    w.sp = { at: "reveal", r, was: w.spLast || null };
    w.spLast = { era: P.d.rawEra, dest: ds ? ds.i : null, m: ds ? ds.m : null };
    spUpSoon();
    return true;
  } catch (e) {
    report(e, "spiral.js: spRoundEnd");
    return false;
  }
}
/* The pick shows lit for a beat ("Home: I rent ✓"), then the next question comes. Only in a browser. */
function spBeatStart(w, k) {
  if (!spOn(w) || typeof requestAnimationFrame !== "function" || typeof setTimeout !== "function") return;
  const b = { k, step: w.step, t: Date.now() };
  w.spBeat = b;
  setTimeout(() => {
    if (W === w && w.spBeat === b) {
      w.spBeat = null;
      drawSheet();
    }
  }, SP_BEAT_MS);
}
const spBeatOn = w => !!(w && w.spBeat && Date.now() - w.spBeat.t < SP_BEAT_MS);
function spBeatSheet(w) {
  const b = w.spBeat,
    q = (smQs(w, b.step) || []).find(x => x.k === b.k);
  if (!q) return null;
  const v = w.o[q.k];
  return (
    spTop(w, b.step) +
    `<div class="field smopen spbeatbox"><div class="small"><b>${q.l}</b></div>${smChips(w, q)}<div class="spbeat pop" role="status">✓ <b>${esc(q.s)}:</b> ${esc(Array.isArray(v) ? v.join(", ") : v || "")}</div></div>`
  );
}
/* The chain: the number of each round so far, linked in order. The newest link comes in last. */
function spChain(r, c, d) {
  const items = SP_ROUNDS.slice(1, r + 1).map((R, k) => {
    const N = spNumber(R.L, c, d);
    return `<span class="spl ${k === r - 1 ? "spnew" : ""}"><b>${R.L}</b> ${esc(N.short)}</span>`;
  });
  return `<div class="spchain" aria-label="How your numbers link">${items.join('<i class="sparr" aria-hidden="true">›</i>')}</div>`;
}
/* One line that links the number of this round to the numbers before it. */
function spConnect(L, c, d, rt) {
  const N = spNumber(L, c, d),
    debt = spNumber("D", c, d).v,
    dest = spDest(rt);
  if (L === "D")
    return N.none
      ? "Nothing owed. Your route starts with a clear road."
      : "This is where your route starts. Next comes what you have.";
  if (L === "A") {
    const R = lkNwText(c, d);
    return "You have " + N.big + " and you owe about " + money(debt) + ". Together: a net worth of " + R.txt + ".";
  }
  if (L === "I")
    return debt > 0 && c.take > 0
      ? "What you owe is about " +
          (Math.round((debt / c.take) * 10) / 10).toLocaleString() +
          " months of what comes in."
      : "With nothing owed, all of the " + money(c.take) + " can work for your plan.";
  if (L === "T")
    return (
      "You earn about " + money(N.gross) + ", about " + N.pct + "% comes off the top, and " + money(c.take) + " lands."
    );
  const left = rt.left;
  if (left <= 0)
    return "Right now about " + money(-left) + " more goes out than comes in. The first stop is finding that room.";
  return (
    "Your " +
    money(left) +
    " left each month builds your cushion." +
    (dest ? " At this pace: " + dest.n + " " + spWhen(dest.m).replace(/ \(.*\)$/, "") + "." : "")
  );
}
/* The slim route strip: the eras, the marker "you are here", and the next stop. */
function spRouteStrip(c, d, rt, was) {
  const era = rt.era,
    dest = spDest(rt),
    movedEra = was && was.era !== era,
    route =
      was && dest && was.dest === dest.i && was.m != null
        ? rcRoute({ planAt: todayISO(), planMonths: was.m, nowAt: todayISO(), months: dest.m, open: true })
        : null,
    words = route ? rcWords(route, { what: dest.n }) : null,
    moved = movedEra || !!words || (was && dest && was.dest !== dest.i);
  return `<div class="sproute ${moved ? "moved" : ""}"><div class="tiny muted">${was ? (moved ? "Recalculating route" : "Your route") : "Your route starts here"}</div><div class="spsegs" aria-hidden="true">${ERAS.slice(
    0,
    9
  )
    .map((e, i) => `<i class="${i < era ? "done" : i === era ? "here" : ""}"></i>`)
    .join(
      ""
    )}</div><div class="small">You are here: <b>${esc(ERAS[era].n)}</b>${dest ? `. Next stop: <b>${esc(dest.n)}</b>, ${esc(spWhen(dest.m))}` : ""}.</div>${movedEra ? `<div class="tiny">You moved from ${esc(ERAS[was.era].n)} to ${esc(ERAS[era].n)}.</div>` : ""}${words ? `<div class="tiny">${esc(words.line)}</div>` : ""}</div>`;
}
function spRevealSheet(w) {
  const r = w.sp.r,
    R = SP_ROUNDS[r],
    P = spPreview(w),
    c = P.c,
    d = P.d,
    rt = spRoute(c, d),
    N = spNumber(R.L, c, d),
    why = N.keys.length
      ? whereFromText(c, N.keys)
      : R.L === "T"
        ? "A common share: about " + N.pct + "% of pay goes to taxes and other things taken out before it lands."
        : "",
    later = "After setup, tap any number to put in yours.";
  return (
    spTop(w, R.pages[R.pages.length - 1], true) +
    `<div class="spnum pop"><div class="eyebrow">${esc(N.what)}</div><div class="spbig ${N.st === "Guess" ? "guess" : ""}" data-fid="sp:big">${esc(N.big)}</div>${kitPill(N.st)}</div>` +
    `<div class="small">${esc(spConnect(R.L, c, d, rt))}</div>` +
    (N.st === "Guess" && why
      ? `<details class="wfrom"><summary class="tiny">Where's this from?</summary><div class="tiny muted" style="margin-top:4px">${esc(why)} ${later}</div></details>`
      : "") +
    spChain(r, c, d) +
    spRouteStrip(c, d, rt, w.sp.was) +
    `<button class="primary wide go" data-a="spnext">Next</button>`
  );
}
/* The short coaching summary at the end of a round. Plain words, no grade. */
function spCoach(L, c, d) {
  const debts = (c.debts || []).filter(x => x.amt > 0);
  if (L === "D") {
    if (!debts.length)
      return '<div class="small">Nothing owed. Every dollar left over can go to your cushion and your future.</div>';
    const hi = debts.filter(x => x.high).map(x => x.k.toLowerCase());
    return `<div class="small">${debts.length} ${debts.length === 1 ? "debt" : "debts"}, about ${money(spSum(debts, x => x.amt))} in all. ${hi.length ? "The kinds that often charge 8% or more usually go first: " + esc(hi.join(", ")) + "." : "None of these is usually the costly kind (8% or more)."}</div>`;
  }
  if (L === "A")
    return `<div class="small">Cash about ${money(d.cash)}: about ${(Math.round((d.cash / Math.max(1, c.spend)) * 10) / 10).toLocaleString()} months of spending. Invested about ${money(c.inv || 0)}.</div>`;
  if (L === "I")
    return `<div class="small">About ${money(c.take)} a month comes in, from ${esc((c.incs || []).map(x => x.k.toLowerCase()).join(", ") || "your work")}. ${c.steady === "Steady" ? "About the same each month." : "It moves around, so a cushion does more work for you."}</div>`;
  if (L === "T") {
    const n = knNet(c);
    return `<div class="small">About ${Math.round((1 - n.f) * 100)}% comes off the top${n.known ? "" : ", a common share for now"}. Your match: ${esc(c.match === "yes" ? "you get all of it" : c.match === "no match offered" ? "none offered" : "there may be more to get")}. Tax-friendly saving: ${esc(c.tax === "yes" ? "the most allowed" : c.tax === "some" ? "some" : "not yet")}.</div>`;
  }
  const f = spFifty(c),
    big = f.groups[0];
  return (
    `<div class="tile stack spfifty" style="gap:6px"><b class="small">Where your money goes, next to the 50/30/20 guide</b><div class="tiny muted">Each group, and its share of what comes in.</div>` +
    f.groups
      .map(
        g =>
          `<div class="row between small"><span>${esc(g.k)}</span><span>${money(g.amt)} · ${spPct(g.pct)}</span></div>`
      )
      .join("") +
    `<div class="small">Needs (home, food, getting around, bills): <b>${spPct(f.pn)}</b>. A common guide is about 50%.</div><div class="small">Wants (fun and everything else): <b>${spPct(f.pw)}</b>. A common guide is about 30%.</div><div class="small">Left to save: <b>${spPct(f.ps)}</b>. A common guide is about 20%.</div>` +
    (big
      ? `<div class="small"><b>One takeaway:</b> ${esc(big.k)} is your biggest group, ${money(big.amt)} a month. It is the one where a small change moves the most.</div>`
      : "") +
    mathBox([
      "Each share: the group ÷ take-home pay.",
      "Left to save: take-home pay less needs less wants.",
      "50/30/20 is a common rule of thumb, not a grade.",
    ]) +
    `</div>`
  );
}
function spLevelSheet(w) {
  const r = w.sp.r,
    R = SP_ROUNDS[r],
    nx = SP_ROUNDS[r + 1],
    P = spPreview(w);
  return (
    spTop(w, R.pages[R.pages.length - 1], true) +
    `<div class="levelup spdone"><div class="spburst" aria-hidden="true">✓</div><h2>${esc(R.n)} ✓, ${nx ? "now " + esc(nx.n) : "your first plan is next"}</h2><div class="small">${nx ? esc(nx.icon + " " + nx.one) : "A route from here to your next stops."}</div></div>` +
    `<div class="tiny muted">What you put in. Tap a line to change it.</div>` +
    spChecklistHtml(w, r, true) +
    spCoach(R.L, P.c, P.d) +
    `<button class="primary wide go" data-a="spgo">${nx ? "Next: " + esc(nx.n) : "Next: your first plan"}</button><button class="ghost wide" data-a="spstop">Stop here, I'll come back</button>`
  );
}
/* Part of setupSheet() in ui.js. The screens between the rounds, or null for a page of questions. */
function spSetupSheet(w) {
  if (!spOn(w)) return null;
  try {
    if (spBeatOn(w)) {
      const b = spBeatSheet(w);
      if (b) return b;
    }
    if (w.sp && w.sp.at === "reveal") return spRevealSheet(w);
    if (w.sp && w.sp.at === "level") return spLevelSheet(w);
  } catch (e) {
    report(e, "spiral.js: spSetupSheet");
  }
  return null;
}
/* YOUR FIRST PLAN, after the fifth round, written as a route. */
function spPlanOpen(c) {
  try {
    W = { kind: "firstplan" };
    sheet(spPlanSheet);
    spUpSoon();
    return true;
  } catch (e) {
    report(e, "spiral.js: spPlanOpen");
    return false;
  }
}
function spLeg(label, s) {
  return `<div class="tile spleg"><div class="tiny muted">${label}</div><div class="row between" style="gap:8px"><b>${esc(s.n)}</b><span class="small">${esc(spWhen(s.m))}</span></div><div class="small">${esc(s.gate)}</div></div>`;
}
function spPlanSheet() {
  const c = C(),
    P = spPlan(c),
    E = P.el,
    sd = E ? EL_SIDES[E.el] : null,
    X = elStore(c),
    dest = P.dest;
  return (
    head("Your first plan", "Your first plan") +
    (dest
      ? `<div class="spnum"><div class="eyebrow">Destination</div><div class="spbig ${P.st === "Guess" ? "guess" : ""}" data-fid="sp:dest">${esc(dest.n)}</div><div class="small">${esc(spWhen(dest.m))}</div>${kitPill(P.st)}</div><div class="small">${esc(dest.gate)}.</div>`
      : `<div class="spnum"><div class="eyebrow">Destination</div><div class="spbig">Past every stop</div></div>`) +
    `<b class="small">You are here</b>` +
    spRouteStrip(c, P.d, P.rt, null).replace("Your route starts here", "Your route") +
    (P.rt.left <= 0
      ? `<div class="banner small">Recalculating route: right now about ${money(-P.rt.left)} more goes out than comes in. The first stop is finding that room.<button class="ghost wide slim" style="margin-top:8px" data-a="csp">See where it goes</button></div>`
      : "") +
    P.legs.map((s, k) => spLeg(k === 0 ? "Next stop" : s.i === 8 || k === 2 ? "Ultimately" : "Then", s)).join("") +
    (P.week.length
      ? `<b class="small">In the meantime, this week</b><div class="stack" style="gap:6px">${P.week.map(m => `<button class="rowbtn" data-a="${esc(m.a)}"${m.v != null ? ` data-v="${esc(m.v)}"` : ""}><span><b>${esc(m.t)}</b>${m.s ? `<div class="tiny muted">${esc(m.s)}</div>` : ""}</span><span class="caret">›</span></button>`).join("")}</div>`
      : "") +
    (P.deps.length
      ? `<b class="small">It depends on</b><div class="stack" style="gap:6px">${P.deps.map(x => `<div class="tile row between" style="gap:8px"><span class="small"><b>${esc(x.n)}</b><div class="tiny muted">${x.months === Infinity ? "Could decide whether there is a date at all" : "Could move your date by about " + rcSpan(x.months)}</div></span><button class="ghost slim" data-a="sharp" data-v="${x.k}">Sharpen</button></div>`).join("")}</div>`
      : "") +
    (E && sd
      ? `<div class="tile stack" style="gap:6px"><div class="row between"><b class="small">Your element: ${esc(E.el)}</b>${kitPill(E.st)}</div>${X.planSeen ? "" : `<div class="tiny muted">Your money style: how you tend to handle money surprises.</div>`}<div class="small">For this plan: ${esc(sd.tip)}</div><details class="math"><summary>Strong against, weak to</summary><div class="inner tiny">Strong against: ${esc(sd.strong.join(", "))}. Weak to: ${esc(sd.weak.join(", "))}.</div></details></div>`
      : "") +
    mathBox([
      "Each date: the money left each month (take-home pay less spending) goes to one stop at a time, in the order of the route.",
      "$1,000 cushion: what is missing ÷ the money left each month.",
      "Costly debt: the payoff order with the highest rate first, with the money left each month on top of the payments.",
      "Full emergency fund: (your age ÷ 5) months of spending, less the cash you have, ÷ the money left each month.",
      "It depends on: each Guess number, made a fifth smaller and a fifth bigger. The ones that move the date most come first.",
    ]) +
    `<button class="primary wide go" data-a="spplan2">Next: two quick taps</button>`
  );
}
kitScreen(
  "firstplan",
  "Your first plan",
  "Your route from here: the destination, the next stops and their dates.",
  "Each date is a Guess until your numbers are real. Sharpen the ones it depends on most."
);
Object.assign(ACT, {
  spnext: () => {
    if (!W || !W.sp) return;
    W.sp.at = "level";
    drawSheet();
    spUpSoon();
  },
  spgo: () => {
    const w = W;
    if (!w || !w.sp) return;
    const r = w.sp.r,
      nx = SP_ROUNDS[r + 1];
    w.sp = null;
    if (!nx) {
      finishSetup();
      return;
    }
    w.step = nx.pages[0];
    w.err = false;
    if (w.sm) w.sm.open = null;
    drawSheet();
    spUpSoon();
  },
  spstop: () => {
    if (typeof closeSheet === "function") closeSheet();
  },
  spline: t => {
    const w = W;
    if (!w || w.kind !== "setup") return;
    w.sp = null;
    w.spBeat = null;
    w.step = +t.dataset.v;
    const k = t.dataset.k,
      s = smState(w);
    if (k) {
      s.open = k;
      s.md[k] = false;
    }
    drawSheet();
    spUpSoon();
  },
  spplan2: () => {
    const c = C();
    elStore(c).planSeen = todayISO();
    save();
    W = { kind: "elem", i: 2, plan: true };
    sheet(elSheet);
    spUpSoon();
  },
});
