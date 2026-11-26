/* ============================================================================
   SLAM the Game: features/sim.js
   PURPOSE     The simulator engine. One decision with 2 to 4 options. The inputs are chips. Each option
               runs month by month, and the engine compares the options on net worth over time, the cash
               cushion, free to spend, the goal dates and the freedom date (both from goalSim). Each
               simulator shows its FLIP POINT: the input value where the better option changes, with a
               small chart that marks it, and the 2 inputs that move the answer most.
   INPUT       The profile. The definitions of the simulators (features/sims/*.js call simAdd). The
               answers: c.x["sim_" + id]. The open sheet (W.kind): sim, simlist.
   OUTPUT      Functions: simAdd, simLoanPayment, simInputs, simBaseline, simRaw, simRun, simScore, simWith,
               simFlip, simMovers, simReach, simLinks, simListSheet, simSheet, simBook. Actions (ACT):
               sims, simopen. Parts of functions in other files: goalViewSim (goalView in ui.js),
               dbSheetSim (dbSheet in debts.js), qmSheetSim (qmSheet in quick.js), gxSheetSim (gxSheet in
               gig.js). Menu: "Simulators".
   DEPENDS ON  core/engine.js (goalSim, derive), screens/ui.js (freeAt), features/kit.js.
   RULES       A simulator definition gives, for each option, the change to net worth that the decision
               makes in each month (its "delta"), the extra spending a month next to today, and a cost
               paid one time now. The engine adds the delta to the same baseline for each option, so the
               options differ only by the decision. The words are "If these assumptions hold". No option
               is called wrong. A flip point outside the range of the chips says so.
   ========================================================================= */
const SIMS = {};
const SIM_ORDER = [];
/* A simulator: { id, n, ask, inputs: [{ k, label, opts, def, typed, term, help, more }], run(c, x), extra(c, x, r, st),
   flips: [{ k, lo, hi, say(v) }], math(c, x, r), links: [context words] }.
   run returns { years, options: [{ id, n, delta: [by month], extra, once, cash }], score, ref }.
   ref is the id of the option that is today's plan: the engine makes each delta relative to it. */
function simAdd(def) {
  if (!SIMS[def.id]) SIM_ORDER.push(def.id);
  SIMS[def.id] = def;
}
/* The monthly payment of a loan. */
function simLoanPayment(bal, ratePct, years) {
  const r = ratePct / 1200,
    n = Math.max(1, Math.round(years * 12));
  return r === 0 ? bal / n : (bal * r) / (1 - Math.pow(1 + r, -n));
}
/* The answers of one simulator: the value and the Guess / Close / Exact of each input. */
function simInputs(c, def, over) {
  const x = {},
    st = {};
  def.inputs.forEach(q => {
    const f = typeof q.def === "function" ? q.def(c) : q.def,
      v = kitValue(c, "sim_" + def.id, q.k, f);
    x[q.k] = v.v;
    st[q.k] = v;
  });
  return Object.assign(x, over || {}, { _st: st });
}
/* The net worth of the player month by month with no decision: the plan of today. */
function simBaseline(c, months) {
  const d = derive(c),
    kept = (c.take || 0) - (c.spend || 0),
    out = [];
  let inv = c.inv || 0,
    cash = d.cash,
    debt = c.debt || 0;
  out.push(cash + inv - debt);
  for (let m = 1; m <= months; m++) {
    let s = kept;
    if (s > 0 && debt > 0) {
      const u = Math.min(debt, s);
      debt -= u;
      s -= u;
    }
    if (s >= 0) inv = inv * (1 + RM) + s;
    else {
      cash += s;
      if (cash < 0) {
        debt -= cash;
        cash = 0;
      }
      inv *= 1 + RM;
    }
    out.push(cash + inv - debt);
  }
  return out;
}
/* RUN ONE SIMULATOR. Each option gets: net worth by year, the cushion, free to spend, goal dates, freedom date. */
/* The answer of def.run, with each delta made relative to the option "ref" (the option that is today's plan). */
function simRaw(c, def, x) {
  const r = def.run(c, x);
  const ref = r.ref && r.options.find(op => op.id === r.ref);
  if (ref) {
    const base = ref.delta.slice();
    r.options.forEach(op => {
      op.delta = op.delta.map((v, m) => v - (base[m] || 0));
    });
  }
  return r;
}
function simRun(c, def, x, o) {
  o = o || {};
  const r = simRaw(c, def, x),
    d = derive(c),
    months = Math.round(r.years * 12),
    base = simBaseline(c, months),
    free0 = freeToSpend(c, d).free,
    sp = Math.max(1, c.spend || 0),
    fi0 = o.fast ? null : freeAt(c);
  const opts = r.options.map(op => {
    const nw = [];
    for (let y = 0; y <= r.years; y++) {
      const m = Math.min(months, Math.round(y * 12));
      nw.push(base[m] + (op.delta[m] || 0));
    }
    const end = base[months] + (op.delta[months] || 0),
      cashLeft = d.cash - (op.cash || 0);
    let fi = null,
      goals = {};
    if (!o.fast) {
      const opt = { monthly: op.extra || 0, once: op.once || 0 };
      try {
        fi = freeAt(c, opt);
        goals = goalSim(c, opt).goalAt;
      } catch (e) {
        report(e, "sim.js: simRun");
      }
    }
    return Object.assign({}, op, {
      nw,
      end,
      cushion: cashLeft / sp,
      free: free0 - (op.extra || 0),
      fi,
      fiShift: fi != null && fi0 != null ? fi - fi0 : null,
      goals,
    });
  });
  const ranked = opts.slice().sort((a, b) => (r.score ? 0 : b.end - a.end));
  let best = ranked[0],
    next = ranked[1];
  if (r.score != null) {
    best = r.score >= 0 ? opts[0] : opts[1];
    next = r.score >= 0 ? opts[1] : opts[0];
  }
  return {
    years: r.years,
    months,
    opts,
    best,
    next,
    score: r.score,
    gap: r.score != null ? Math.abs(r.score) : best.end - next.end,
    fi0,
    raw: r,
  };
}
/* The number that decides between two options: above 0 the first one is better. */
function simScore(c, def, x, a, b) {
  const r = simRaw(c, def, x);
  if (r.score != null) return r.score;
  const m = Math.round(r.years * 12),
    A = r.options.find(o => o.id === a),
    B = r.options.find(o => o.id === b);
  return (A.delta[m] || 0) - (B.delta[m] || 0);
}
/* The same answers with one input changed. */
function simWith(x, k, v) {
  return Object.assign({}, x, { [k]: v });
}
/* THE FLIP POINT of one input: the value where the better option changes. Null when there is none in range. */
function simFlip(c, def, x, F, a, b) {
  /* F.score(c, x), when given, is the number of this flip point (above 0: the first option is better) */
  const sc = xx => (F.score ? F.score(c, xx) : simScore(c, def, xx, a, b)),
    steps = F.steps || 40,
    pts = [];
  for (let i = 0; i <= steps; i++) {
    const v = F.lo + ((F.hi - F.lo) * i) / steps;
    pts.push([v, sc(simWith(x, F.k, v))]);
  }
  let at = null;
  for (let i = 1; i < pts.length && at == null; i++) {
    const p = pts[i - 1],
      q = pts[i];
    if (p[1] === 0) at = p[0];
    else if (p[1] < 0 !== q[1] < 0) {
      let lo = p[0],
        hi = q[0],
        flo = p[1];
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2,
          fm = sc(simWith(x, F.k, mid));
        if (fm < 0 === flo < 0) {
          lo = mid;
          flo = fm;
        } else hi = mid;
      }
      at = (lo + hi) / 2;
    }
  }
  const above = at == null ? null : sc(simWith(x, F.k, Math.min(F.hi, at + (F.hi - F.lo) / 200)));
  return { k: F.k, at, pts, aAbove: above == null ? null : above >= 0, F };
}
/* The 2 inputs that move the answer most: each input one chip up and one chip down. */
function simMovers(c, def, x, a, b) {
  const s0 = simScore(c, def, x, a, b),
    rows = def.inputs
      .filter(q => q.opts.length > 1 && typeof q.opts[0][0] === "number")
      .map(q => {
        const vals = q.opts.map(o => o[0]),
          i = vals.reduce((bi, v, k) => (Math.abs(v - x[q.k]) < Math.abs(vals[bi] - x[q.k]) ? k : bi), 0),
          up = vals[Math.min(vals.length - 1, i + 1)],
          dn = vals[Math.max(0, i - 1)];
        const m = Math.max(
          Math.abs(simScore(c, def, simWith(x, q.k, up), a, b) - s0),
          Math.abs(simScore(c, def, simWith(x, q.k, dn), a, b) - s0)
        );
        return { k: q.k, label: q.label, move: m };
      })
      .sort((p, q) => q.move - p.move);
  return rows.slice(0, 2);
}
/* For the simulators that ask "does the plan still reach its number by the stop age": years to spare (or short). */
function simReach(c, opt) {
  let m = null;
  try {
    m = freeAt(c, opt);
  } catch (e) {
    report(e, "sim.js: simReach");
  }
  if (m == null) return -30;
  return Math.max(c.age, c.ret) - (c.age + m / 12);
}
/* Links to the simulators that fit a context word (housing, car, debt, mortgage, tax, gig, kids, trip). */
function simLinks(ctx) {
  const ids = SIM_ORDER.filter(id => (SIMS[id].links || []).indexOf(ctx) >= 0);
  if (!ids.length) return "";
  return `<div class="row wrap simlinks" style="gap:6px">${ids.map(id => `<button class="ghost slim" data-a="simopen" data-v="${id}">${esc(SIMS[id].n)}: run it</button>`).join("")}</div>`;
}
function simListSheet() {
  return (
    head("Plan", "Simulators") +
    `<div class="small muted">One decision at a time, run month by month on your own numbers. Each one shows where the answer flips.</div><div class="stack">${SIM_ORDER.map(
      id => {
        const s = SIMS[id];
        return `<button class="rowbtn simrow" data-a="simopen" data-v="${id}"><span><b>${esc(s.n)}</b><div class="tiny muted">${esc(s.ask)}</div></span><span class="caret">›</span></button>`;
      }
    ).join("")}</div>`
  );
}
function simFmt(def, k, v) {
  const q = def.inputs.find(z => z.k === k);
  return q && q.fmt ? q.fmt(v) : String(Math.round(v * 10) / 10);
}
function simSheet() {
  const c = C(),
    def = SIMS[W.id];
  if (!def) return head("Simulators", "Not found");
  const x = simInputs(c, def),
    R1 = simRun(c, def, x),
    st = kitState(
      Object.keys(x._st)
        .map(k => x._st[k])
        .concat([kitSharp(c, "take"), kitSharp(c, "spend")])
    ),
    a = R1.best.id,
    b = R1.next.id,
    flips = (def.flips || []).map(F => simFlip(c, def, x, F, F.a || R1.opts[0].id, F.b || R1.opts[1].id)),
    movers = simMovers(c, def, x, R1.opts[0].id, R1.opts[1].id),
    yrs = R1.years;
  const col = op => ({
    title: op.n,
    big: money(Math.round(op.end)),
    guess: st === "Guess",
    hot: op.id === a,
    rows: [
      ["Net worth after " + Math.round(yrs * 10) / 10 + (yrs === 1 ? " year" : " years"), money(Math.round(op.end))],
      ["Cash cushion", op.cushion < 0 ? "Not enough cash" : Math.round(op.cushion * 10) / 10 + " months"],
      ["Free to spend", money(Math.round(op.free)) + " a month"],
      [
        "Freedom date",
        op.fi == null ? "No date yet" : op.fiShift == null ? fmtDur(op.fi) : kitDayWords(kitDays(op.fiShift)),
      ],
    ],
  });
  const goalRows = (c.goals || [])
    .filter(g => !g.done && g.era != null)
    .slice(0, 3)
    .map(g => [
      esc(g.n),
      R1.opts
        .map(op => (op.goals[g.id] == null ? "No date" : op.goals[g.id] <= 0 ? "Ready" : fmtDur(op.goals[g.id])))
        .join(" · "),
    ]);
  const flipHTML = flips
    .map(f => {
      const nA = (R1.opts.find(o => o.id === (f.F.a || R1.opts[0].id)) || R1.opts[0]).n,
        nB = (R1.opts.find(o => o.id === (f.F.b || R1.opts[1].id)) || R1.opts[1]).n,
        say = f.at == null ? f.F.none(nA, nB, x) : f.F.say(f.at, f.aAbove, nA, nB);
      return `<div class="tile stack simflip" style="gap:6px"><div class="eyebrow">Flip point</div><b class="small">${esc(say)}</b>${kitChart(
        {
          label: "Where the answer flips",
          lines: [{ pts: f.pts, name: nA + " ahead (above the line)" }],
          zero: true,
          fx: v => simFmt(def, f.k, v),
          fy: v => (Math.abs(v) >= 1e6 ? "$" + Math.round(v / 1e5) / 10 + "M" : money(v)),
          mark: f.at == null ? null : { x: f.at, y: 0, label: simFmt(def, f.k, f.at) },
          caption: f.F.axis || "",
        }
      )}</div>`;
    })
    .join("");
  /* An input with more: true is in a group that is closed until the player opens it (W.o.more). */
  const ask = q =>
      kitAsk(c, "sim_" + def.id, q.k, q.label, q.opts, x[q.k], { typed: q.typed, term: q.term, help: q.help }),
    more = def.inputs.filter(q => q.more);
  const ans = def.answer
    ? def.answer(c, x, R1)
    : "If these assumptions hold, " +
      R1.best.n.toLowerCase() +
      " comes out ahead by about " +
      money(Math.round(R1.gap)) +
      (def.unit
        ? " " + def.unit
        : " of net worth after " + Math.round(yrs * 10) / 10 + (yrs === 1 ? " year." : " years."));
  return (
    head("Simulators", esc(def.n)) +
    `<div class="row" style="gap:6px"><div class="small muted">${esc(def.ask)}</div>${kitInfo("sim_" + def.id)}</div>` +
    def.inputs
      .filter(q => !q.more)
      .map(ask)
      .join("") +
    (more.length
      ? `<button class="ghost wide slim simmore" data-a="togb" data-k="more" aria-expanded="${W.o && W.o.more ? "true" : "false"}">${esc(def.moreLabel || "More inputs")} (${more.filter(q => x._st[q.k].given).length} of ${more.length} are yours) ${W.o && W.o.more ? "▴" : "▾"}</button>` +
        (W.o && W.o.more ? more.map(ask).join("") : "")
      : "") +
    `<div class="tile small simanswer"><b>${esc(ans)}</b> ${kitPill(st)}</div>` +
    (def.extra ? def.extra(c, x, R1, st) : "") +
    kitColumns(R1.opts.map(col)) +
    kitChart({
      label: "Net worth over time",
      lines: R1.opts.slice(0, 2).map(op => ({ pts: op.nw.map((v, y) => [y, v]), name: op.n })),
      fx: v => "Year " + Math.round(v),
      fy: v => (Math.abs(v) >= 1e6 ? "$" + Math.round(v / 1e5) / 10 + "M" : money(v)),
      caption: "Net worth year by year for " + R1.opts[0].n + " and " + R1.opts[1].n + ".",
    }) +
    (goalRows.length
      ? `<div class="tile stack" style="gap:4px"><div class="tiny muted">Goal dates: ${R1.opts.map(op => esc(op.n)).join(" · ")}</div>${igRows(goalRows)}</div>`
      : "") +
    flipHTML +
    (movers.length
      ? `<div class="tile small">The 2 inputs that move the answer most: <b>${movers.map(m => esc(m.label.toLowerCase())).join("</b> and <b>")}</b>.</div>`
      : "") +
    mathBox(
      (def.math ? def.math(c, x, R1) : []).concat([
        "Net worth: your plan of today month by month (what you keep goes to debt, then is invested at 7% a year after inflation), plus the change each option makes.",
        "Freedom date and goal dates: the game's own month-by-month plan (goalSim), run once for each option with its extra spending and its one-time cost.",
        "Flip point: the game moves one input across its range and finds where the two options trade places.",
      ])
    ) +
    `<button class="ghost wide slim" data-a="sims">All simulators</button>`
  );
}
/* Rows for the spreadsheet (book.js): the inputs and the result of each simulator. */
function simBook(c) {
  const rows = [];
  SIM_ORDER.forEach(id => {
    const def = SIMS[id];
    try {
      const x = simInputs(c, def),
        r = simRun(c, def, x, { fast: true });
      def.inputs.forEach(q =>
        rows.push({
          id: "sm_" + id + "_" + q.k,
          label: def.n + ": " + q.label,
          v: x[q.k],
          note: x._st[q.k].given ? "Your answer" : "Guess",
        })
      );
      /* An option can share its name with an input (Rent or buy: the input "rent" and the option "rent"):
         the option's row then gets "end_" so a formula that names the input finds the input. */
      r.opts.forEach(op =>
        rows.push({
          id: "sm_" + id + "_" + (def.inputs.some(q => q.k === op.id) ? "end_" : "") + op.id,
          label: def.n + ": " + op.n + ", net worth at the end",
          v: Math.round(op.end),
          note: "Worked out by the game: a month-by-month run",
        })
      );
      (def.book ? def.book(c, x) : []).forEach(b => rows.push(b));
    } catch (e) {
      report(e, "sim.js: simBook");
    }
  });
  return { title: "Simulators", rows };
}
kitScreen(
  "simlist",
  "Simulators",
  "One money decision at a time, run on your own numbers.",
  "Each one shows where the answer flips."
);
kitScreen(
  "sim",
  "A simulator",
  "Two or more choices, run month by month on your numbers.",
  "It shows where the better choice changes."
);
Object.assign(ACT, {
  sims: () => {
    W = { kind: "simlist", o: {} };
    sheet(simListSheet);
  },
  simopen: t => {
    const id = t.dataset.v;
    if (!SIMS[id]) return;
    W = { kind: "sim", id, o: {} };
    sheet(simSheet);
  },
});
kitMenu("Simulators", "sims", "Rent or buy, pay off or invest, a new job, a break, and more", "mix");
/* Part of goalView() in ui.js. The simulators that fit the kind of goal. */
function goalViewSim(h) {
  try {
    const g = W && W.kind === "goal" && C().goals.find(x => x.id === W.id),
      k = g ? (g.k || "") + " " + (g.n || "") : "",
      ctx = /home|house/i.test(k)
        ? "housing"
        : /car/i.test(k)
          ? "car"
          : /tuition|kid/i.test(k)
            ? "kids"
            : /sabbatical|quit/i.test(k)
              ? "break"
              : /trip|wedding|gift|help/i.test(k)
                ? "trip"
                : null;
    return ctx ? h + simLinks(ctx) : h;
  } catch (e) {
    report(e, "sim.js: goalViewSim");
    return h;
  }
}
/* Part of dbSheet() in debts.js. The simulators about debt. */
function dbSheetSim(h) {
  return h + simLinks("debt");
}
/* Part of qmSheet() in quick.js. Rent or buy next to "How much home fits?", the car next to "Does this car fit?". */
function qmSheetSim(h) {
  return W && W.id === "home" ? h + simLinks("housing") : W && W.id === "car" ? h + simLinks("car") : h;
}
/* Part of gxSheet() in gig.js. The simulator "Side income". */
function gxSheetSim(h) {
  return h + simLinks("gig");
}
