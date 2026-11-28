/* ============================================================================
   SLAM the Game: features/blocks.js
   PURPOSE     Life event blocks that the player stacks: a home, a car, a child, a job change, a
               sabbatical, a move. Each block is one option of one simulator, with the answers that the
               player already gave in that simulator. The screen adds the blocks of the stack and shows
               the plan as today next to the plan with the stack: net worth over time, free to spend, the
               cash cushion and the freedom date.
   INPUT       The profile. The simulators (SIMS in features/sim.js) and their answers (c.x.sim_*). The
               stack and the horizon: c.x.blocks. The open sheet (W.kind): blocks.
   OUTPUT      Functions: blocksStack, blocksOne, blocksAt, blocksCalc, blocksBook, blocksSheet. Actions
               (ACT): blocks, blockstog. Menu: "Life event blocks".
   DEPENDS ON  core/engine.js (derive, freeToSpend), screens/ui.js (freeAt), features/sim.js (simInputs,
               simRaw, simBaseline), features/sims/*.js, features/kit.js.
   RULES       This file has no simulator of its own. A block uses the change to net worth by month
               (the "delta") that its simulator returns, next to the same plan of today. The blocks add:
               one block does not change the numbers of a different block. Past the last month of a
               simulator, a block keeps its last value. Each block starts now, unless its simulator asks
               when. The words are "If these assumptions hold". No stack is called wrong.
   ========================================================================= */
/* A block: [id, name, the simulator, the option of the simulator, one line]. */
const LIFE_BLOCKS = [
  ["home", "Buy a home", "rentbuy", "buy", "Buy in place of renting"],
  ["car", "A different car", "car", "used", "A used car, a new car or a lease, in place of the car you have"],
  ["kid", "A child", "kid", "kid", "A child or a new dependent"],
  ["job", "A job change", "job", "new", "A new job or a raise"],
  ["break", "A sabbatical", "break", "break", "Time away from work"],
  ["move", "A move", "city", "move", "A cheaper or a pricier city"],
];
const LIFE_BLOCKS_YEARS = [
  [5, "5 years"],
  [10, "10 years"],
  [20, "20 years"],
  [30, "30 years"],
];
const LIFE_BLOCKS_CAR = [
  ["used", "Buy used"],
  ["new", "Buy new"],
  ["lease", "Lease"],
];
/* The ids of the blocks in the stack, in the order that the player added them. */
function blocksStack(c) {
  const s = kitStore(c, "blocks").stack,
    list = s && Array.isArray(s.v) ? s.v : [];
  return list.filter(id => LIFE_BLOCKS.some(b => b[0] === id));
}
/* ONE BLOCK: its simulator, the answers of the player there, and the option that the block stands for. */
function blocksOne(c, id) {
  const b = LIFE_BLOCKS.find(z => z[0] === id),
    def = b && SIMS[b[2]];
  if (!def) return null;
  const x = simInputs(c, def),
    r = simRaw(c, def, x),
    pick = id === "car" ? kitValue(c, "blocks", "car", "used").v : b[3],
    op = r.options.find(o => o.id === pick) || r.options[0];
  return {
    id,
    n: b[1],
    one: b[4],
    sim: b[2],
    opt: op.n,
    delta: op.delta,
    extra: op.extra || 0,
    once: op.once || 0,
    cash: op.cash || 0,
    st: Object.keys(x._st).map(k => x._st[k]),
  };
}
/* The change to net worth of one block in month m. Past its last month, the block keeps its last value. */
function blocksAt(B, m) {
  const d = B.delta;
  return d.length ? d[Math.min(m, d.length - 1)] || 0 : 0;
}
/* THE STACK. o.ids replaces the stack of the profile, o.years the horizon. */
function blocksCalc(c, o) {
  o = o || {};
  const d = derive(c),
    ids = o.ids || blocksStack(c),
    Y = kitValue(c, "blocks", "years", 10),
    years = o.years || Y.v,
    months = Math.round(years * 12),
    base = simBaseline(c, months),
    rows = ids.map(id => blocksOne(c, id)).filter(Boolean),
    sum = k => rows.reduce((a, r) => a + r[k], 0),
    extra = sum("extra"),
    once = sum("once"),
    cash = sum("cash"),
    sp = Math.max(1, c.spend || 0),
    free0 = freeToSpend(c, d).free,
    plan = [],
    stack = [];
  for (let y = 0; y <= years; y++) {
    const m = Math.min(months, y * 12);
    plan.push([y, base[m]]);
    stack.push([y, base[m] + rows.reduce((a, r) => a + blocksAt(r, m), 0)]);
  }
  let fi0 = null,
    fi = null;
  if (!o.fast) {
    try {
      fi0 = freeAt(c);
      fi = rows.length ? freeAt(c, { monthly: extra, once }) : fi0;
    } catch (e) {
      report(e, "blocks.js: blocksCalc");
    }
  }
  rows.forEach(r => {
    r.end = blocksAt(r, months);
  });
  return {
    ids,
    rows,
    years,
    months,
    plan,
    stack,
    endPlan: base[months],
    end: stack[stack.length - 1][1],
    extra,
    once,
    cash,
    free0,
    free: free0 - extra,
    cushion0: d.cash / sp,
    cushion: (d.cash - cash) / sp,
    fi0,
    fi,
    st: kitState(
      [kitSharp(c, "take"), kitSharp(c, "spend"), kitSharp(c, "inv")].concat(
        [].concat.apply(
          [],
          rows.map(r => r.st)
        )
      )
    ),
  };
}
function blocksBook(c) {
  const S = blocksCalc(c, { fast: true }),
    rows = [
      { id: "bl_years", label: "Years ahead", v: S.years, note: "Your choice" },
      {
        id: "bl_plan",
        label: "Net worth at the end, plan as today",
        v: Math.round(S.endPlan),
        note: "Worked out by the game: a month-by-month run",
      },
    ];
  S.rows.forEach(r => {
    rows.push({
      id: "bl_d_" + r.id,
      label: r.n + " (" + r.opt + "): change to net worth at the end",
      v: Math.round(r.end),
      note: "From its simulator: a month-by-month run",
    });
    rows.push({ id: "bl_x_" + r.id, label: r.n + ": change to spending a month", v: Math.round(r.extra) });
  });
  rows.push({
    id: "bl_end",
    label: "Net worth at the end, with your stack",
    v: Math.round(S.endPlan) + S.rows.reduce((a, r) => a + Math.round(r.end), 0),
    f: "={bl_plan}" + S.rows.map(r => "+{bl_d_" + r.id + "}").join(""),
  });
  rows.push({ id: "bl_free0", label: "Free to spend a month, plan as today", v: Math.round(S.free0) });
  rows.push({
    id: "bl_free",
    label: "Free to spend a month, with your stack",
    v: Math.round(S.free0) - S.rows.reduce((a, r) => a + Math.round(r.extra), 0),
    f: "={bl_free0}" + S.rows.map(r => "-{bl_x_" + r.id + "}").join(""),
  });
  return { title: "Life event blocks", rows };
}
/* Words for a freedom date in months from now. */
function blocksWhen(m) {
  return m == null ? "No date yet" : m <= 0 ? "Reached" : fmtDur(m);
}
function blocksSheet() {
  const c = C(),
    S = blocksCalc(c),
    on = S.ids,
    yrs = S.years + (S.years === 1 ? " year" : " years"),
    big = v => (Math.abs(v) >= 1e6 ? "$" + Math.round(v / 1e5) / 10 + "M" : money(v));
  let h =
    head("Plan", "Life event blocks") +
    `<div class="small muted">Stack the life events you see coming. Each block uses your answers from its simulator ${kitInfo("bl_block")}.</div><div class="stack" style="gap:6px">`;
  LIFE_BLOCKS.forEach(b => {
    const r = S.rows.find(z => z.id === b[0]) || blocksOne(c, b[0]),
      isOn = on.indexOf(b[0]) >= 0;
    if (!r) return;
    const end = blocksAt(r, S.months);
    h += `<div class="tile stack blrow ${isOn ? "kithot" : ""}" style="gap:6px"><div class="row between" style="gap:8px"><span style="min-width:0"><b class="small">${esc(b[1])}</b><div class="tiny muted">${esc(b[4])}. Now: ${esc(r.opt)}.</div></span><button class="ghost slim" style="flex:none" data-a="blockstog" data-v="${b[0]}">${isOn ? "In the stack ✓ Remove" : "Add to the stack"}</button></div><div class="row between small" style="gap:8px"><span>${signed(Math.round(end))} net worth after ${yrs}, ${signed(Math.round(-r.extra))} a month</span><button class="ghost slim" style="flex:none" data-a="simopen" data-v="${b[2]}">Change its numbers <i class=chev aria-hidden=true></i></button></div></div>`;
  });
  h += `</div>`;
  if (on.indexOf("car") >= 0)
    h += kitAsk(c, "blocks", "car", "Which car block?", LIFE_BLOCKS_CAR, "used", { term: "bl_block" });
  const col = (title, end, free, cushion, fi, hot) => ({
    title,
    big: big(Math.round(end)),
    guess: S.st === "Guess",
    hot,
    rows: [
      ["Net worth after " + yrs + " " + kitInfo("bl_networth"), big(Math.round(end))],
      ["Free to spend " + kitInfo("bl_free"), money(Math.round(free)) + " a month"],
      [
        "Cash cushion " + kitInfo("bl_cushion"),
        cushion < 0 ? "Not enough cash" : Math.round(cushion * 10) / 10 + " months",
      ],
      ["Freedom date " + kitInfo("bl_freedom"), fi],
    ],
  });
  h +=
    `<div class="row between" style="gap:6px"><b class="small">${on.length ? "Your stack: " + on.length + (on.length === 1 ? " block" : " blocks") : "Your stack is empty"} ${kitInfo("bl_stack")}</b>${kitPill(S.st)}</div>` +
    kitColumns([
      col("Plan as today", S.endPlan, S.free0, S.cushion0, blocksWhen(S.fi0), false),
      col(
        "With your stack",
        S.end,
        S.free,
        S.cushion,
        S.fi == null || S.fi0 == null
          ? blocksWhen(S.fi)
          : blocksWhen(S.fi) + (on.length ? " (" + kitDayWords(kitDays(S.fi - S.fi0)) + ")" : ""),
        true
      ),
    ]);
  if (on.length)
    h +=
      `<div class="small">If these assumptions hold, your stack changes your net worth after ${yrs} by <b>${signed(Math.round(S.end - S.endPlan))}</b>${S.once > 0 ? ", with " + money(Math.round(S.once)) + " paid at the start" : ""}.</div>` +
      kitChart({
        label: "Net worth over time, plan as today and with your stack",
        lines: [
          { pts: S.stack, name: "With your stack" },
          { pts: S.plan, name: "Plan as today" },
        ],
        zero: true,
        fx: v => "Year " + Math.round(v),
        fy: big,
        caption: "Across: years from now. Up: net worth in today's dollars.",
      });
  else h += `<div class="tile small">Add a block to see the plan with it next to the plan as today.</div>`;
  h += kitAsk(c, "blocks", "years", "How far ahead?", LIFE_BLOCKS_YEARS, 10, { term: "bl_years" });
  h += mathBox(
    [
      "Plan as today: your net worth month by month with no change, at " +
        kitPct(R) +
        " a year after inflation (the same line as the simulators).",
    ]
      .concat(
        S.rows.map(
          r =>
            r.n +
            " (" +
            r.opt.toLowerCase() +
            "): " +
            signed(Math.round(r.end)) +
            " net worth after " +
            yrs +
            ", " +
            signed(Math.round(r.extra)) +
            " spending a month, " +
            money(Math.round(r.once)) +
            " at the start. From the simulator, with your answers there."
        )
      )
      .concat([
        "With your stack: the plan as today plus the change of each block. The blocks add. One block does not change the numbers of a different block.",
        "Past the last month of its simulator, a block keeps its last value.",
        "Free to spend and the freedom date: the game's own month-by-month plan, with the spending and the one-time costs of all blocks.",
      ])
  );
  h += `<button class="ghost wide slim" data-a="sims">All simulators</button>`;
  return h;
}
kitTerms({
  bl_block: [
    "Block",
    "One life event, for example a child or a move. It carries the numbers you gave in its simulator. Tap Change its numbers to open that simulator.",
  ],
  bl_stack: [
    "Stack",
    "The blocks you added. The game adds their effects, so you see several life events at one time and not one by one.",
  ],
  bl_networth: ["Net worth", "What you own minus what you owe, here at the end of the years you picked."],
  bl_free: [
    "Free to spend",
    "The money left each month after your fixed costs and your savings goal. A block with new monthly costs lowers it.",
  ],
  bl_cushion: [
    "Cash cushion",
    "How many months of spending your cash covers, after the cash that the blocks need at the start.",
  ],
  bl_freedom: [
    "Freedom date",
    "When your investments can pay for your spending. More monthly spending or a one-time cost moves it later.",
  ],
  bl_years: ["Years ahead", "How far the comparison runs. Long horizons show what compounding does to each block."],
});
kitScreen(
  "blocks",
  "Life event blocks",
  "Stack a home, a car, a child, a job change, a sabbatical and a move.",
  "It shows your plan as today next to your plan with all of them."
);
Object.assign(ACT, {
  blocks: () => {
    W = { kind: "blocks", o: {} };
    sheet(blocksSheet);
  },
  blockstog: t => {
    const c = C(),
      id = t.dataset.v,
      S = kitStore(c, "blocks"),
      list = blocksStack(c);
    if (!LIFE_BLOCKS.some(b => b[0] === id)) return;
    S.stack = { v: list.indexOf(id) >= 0 ? list.filter(x => x !== id) : list.concat([id]), cf: 3 };
    kitRedraw();
  },
});
kitMenu("Life event blocks", "blocks", "Stack a home, a car, a kid, a job change, a break and a move", "sims");
