/* ============================================================================
   SLAM the Game: features/giving.js
   PURPOSE     Giving (run Finish everything partly built, Part 16). One sheet in the new look:
               (1) your giving rate on the base you pick (gross, take-home, or after work costs) and
               the target your share comes to (maaser is commonly 10%: the share and the base are
               your own taps); (2) one gift, the charity calc: hours of work, days on the day work
               becomes optional, what it would have grown to; (3) bunching two or three years of
               giving into one on the 2026 federal rules; (4) envelopes inside one account (maaser,
               fun money, your own), each a bar that fills and then empties; (5) the maaser credit:
               a running balance where giving ahead counts toward later months, by your own rule.
   INPUT       The profile: c.take, c.spends, c.x.kin.give (the key number "What you give away
               each month"), c.x.give. derive(c) (cash), knNet(c) (pay before taxes),
               timeLedger(c, d) (the real hourly wage), freeAt(c, opt) (the free date). The open
               sheet (W.kind): giving.
   OUTPUT      Math: gvRead, givingBook. Views: givingSheet, gvRateCard, gvGiftCard, gvBunchCard,
               gvEnvCard, gvCreditCard. Actions (ACT): giving, gvset, gvgiven, gvenvadd, gvenvset,
               gvenvdel, gvenvback, gvlog. Menu: "Giving".
   DEPENDS ON  core/giving.js (the math: gvRate, gvTarget, gvGift, gvBunch, gvEnvelopes, gvCredit,
               gvIsGiving, GV_TAX), core/enough.js (enDays), core/metrics.js (knIn, knNet),
               core/engine.js (derive, timeLedger, R), screens/ui.js (money, esc, head, mathBox,
               ib, save, freeAt), screens/dash.js (dkCaption, dkStatRow, dkTile, dkCard,
               dkProgress, dkPill), features/kit.js (kitMenu, kitScreen, kitTerms).
   RULES       The math is in core/giving.js. The views show what it returns. The share, the base
               and the rule for giving ahead are the player's own taps, not a ruling. Envelopes are
               labels on cash the player already has: no new account. Home is not changed here.
   STORED      c.x.give = { base, pct, gift, every, filing, other, years, daf, bal, ahead,
               env: [{ id, name, put, used }], log: { "YYYY-MM": given } }. What you give a month
               is the key number c.x.kin.give ({ v, cf, d }), the same one Key numbers asks.
   ========================================================================= */
const GVG_GIVEN = [0, 25, 50, 100, 250, 500, 1000],
  GVG_GIFT = [18, 36, 100, 180, 500, 1000, 5000],
  GVG_OTHER = [0, 5000, 10000, 20000, 40000],
  GVG_PUT = [0, 50, 100, 250, 500, 1000],
  GVG_BAL = [500, 1000, 2500, 5000, 10000],
  GVG_FILING = [
    ["single", "Single"],
    ["joint", "Married, one return"],
    ["head", "Head of household"],
  ],
  GVG_ENV = ["Maaser", "Fun money", "Gifts", "Holidays", "Tzedakah box"];
const gvgX = c => {
  c.x = c.x || {};
  c.x.give = c.x.give && typeof c.x.give === "object" ? c.x.give : {};
  return c.x.give;
};
/* The two envelopes a new player starts with: open until something is put in. */
const gvgStart = () => [
  { id: "maaser", name: "Maaser", put: null, used: null },
  { id: "fun", name: "Fun money", put: null, used: null },
];
const gvgYm = (y, m) => y + "-" + String(m + 1).padStart(2, "0");
/* The last six months, oldest first, as "YYYY-MM". */
function gvgMonths() {
  const t = parseISO(todayISO()),
    out = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(t.getFullYear(), t.getMonth() - i, 1);
    out.push(gvgYm(d.getFullYear(), d.getMonth()));
  }
  return out;
}
/* Everything the sheet shows, from the one engine. */
function gvRead(c) {
  const d = derive(c),
    X = gvgX(c),
    kin = (c.x && c.x.kin && c.x.kin.give) || null,
    lines = (c.spends || []).filter(r => r && r.amt > 0 && gvIsGiving(r.k)),
    fromLines = lines.length ? lines.reduce((a, r) => a + r.amt, 0) : null,
    given = fromLines != null ? fromLines : kin && kin.v != null ? kin.v : null,
    givenSt =
      fromLines != null ? (lines.every(r => r.s) ? "Close" : "Guess") : kin ? (kin.cf >= 3 ? "Exact" : "Close") : null,
    net = knNet(c),
    gross = c.take > 0 ? net.gross : null,
    base = X.base || "net",
    B = { base, gross, takeHome: c.take > 0 ? c.take : null, costs: X.costs == null ? null : X.costs },
    rate = gvRate(Object.assign({ given }, B)),
    target = gvTarget(Object.assign({ pct: X.pct == null ? null : X.pct, given }, B)),
    tl = timeLedger(c, d),
    wage = tl.wage > 0 ? tl.wage : null,
    monthly = X.every === "month",
    base0 = freeAt(c),
    withGift = X.gift == null ? null : monthly ? freeAt(c, { monthly: X.gift }) : freeAt(c, { once: X.gift }),
    days = X.gift == null ? null : enDays(withGift, base0),
    gift = gvGift({
      amount: X.gift == null ? null : X.gift,
      monthly,
      wage,
      days,
      realReturn: R,
      years: base0 == null ? null : base0 / 12,
    }),
    filing = X.filing || "single",
    give = X.yearGive != null ? X.yearGive : given != null ? Math.round(given * 12) : null,
    bunch = gvBunch(
      {
        give,
        agi: gross == null ? null : Math.round(gross * 12),
        other: X.other == null ? null : X.other,
        filing,
        years: X.years || 2,
        cash: X.daf !== true,
      },
      GV_TAX
    ),
    list = Array.isArray(X.env) ? X.env : gvgStart(),
    bal = X.bal != null ? X.bal : d.cash > 0 ? Math.round(d.cash) : null,
    env = gvEnvelopes({ balance: bal, list }),
    months = gvgMonths(),
    log = X.log || {},
    first = months.findIndex(m => log[m] != null),
    owed = target.ready ? Math.round(target.value) : null,
    credit = gvCredit({
      months: months.map((m, i) => ({
        m,
        owed: first < 0 || i < first ? null : owed,
        given: log[m] == null ? null : log[m],
      })),
      ahead: X.ahead !== false,
    });
  return {
    X,
    lines,
    given,
    givenSt,
    rate,
    target,
    wage,
    wageGuess: !tl.rw,
    gift,
    monthly,
    free: base0,
    bunch,
    filing,
    give,
    agi: gross == null ? null : Math.round(gross * 12),
    list,
    env,
    balFromCash: X.bal == null && bal != null,
    months,
    log,
    owed,
    credit,
    grossGuess: !net.known,
  };
}
const gvgPct = v => (v == null ? "–" : Math.round(v * 1000) / 10 + "%");
const gvgOne = v => (v == null ? "–" : String(Math.round(v * 10) / 10));
const gvgDays = n =>
  n == null
    ? "No free date yet"
    : n === 0
      ? "No change"
      : Math.abs(n).toLocaleString("en-US") + (Math.abs(n) === 1 ? " day" : " days") + (n > 0 ? " later" : " sooner");
const gvgMon = ym => {
  const p = ym.split("-");
  return new Date(+p[0], +p[1] - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
};
/* The spreadsheet of the plan: the giving rate, the target and bunching, each with its formula. */
function givingBook(c) {
  const g = gvRead(c),
    rows = [];
  if (g.rate.ready && g.rate.of > 0) {
    rows.push({ id: "gv_given", label: "Given a month", v: g.rate.given });
    rows.push({ id: "gv_base", label: "The base a month (" + g.rate.base + ")", v: g.rate.of });
    rows.push({ id: "gv_rate", label: "Giving rate", v: g.rate.rate, f: "={gv_given}/{gv_base}" });
  }
  if (g.target.ready) {
    if (!rows.some(r => r.id === "gv_base"))
      rows.push({ id: "gv_base", label: "The base a month (" + g.target.base + ")", v: g.target.of });
    rows.push({ id: "gv_share", label: "Your share", v: g.target.share });
    rows.push({ id: "gv_target", label: "Your share a month", v: g.target.value, f: "={gv_base}*{gv_share}" });
  }
  if (g.bunch.ready) {
    rows.push({
      id: "gv_taxevery",
      label: "Federal tax, giving every year, " + g.bunch.years + " years",
      v: g.bunch.taxEvery,
    });
    rows.push({ id: "gv_taxbunch", label: "Federal tax, " + g.bunch.years + " years in one", v: g.bunch.taxBunched });
    rows.push({ id: "gv_kept", label: "Kept by bunching", v: g.bunch.saved, f: "={gv_taxevery}-{gv_taxbunch}" });
  }
  return { title: "Giving", rows };
}

/* ---------- views ---------- */
kitTerms({
  maaser: [
    "Maaser",
    "Giving a set share of income, commonly 10%. Which income counts (gross, take-home, after the costs of earning it) is your own call and your community's.",
  ],
  bunching: [
    "Bunching",
    "Giving two or three years' worth in one year so that year's deductions pass the standard deduction, then taking the standard deduction in the years between.",
  ],
  envelope: [
    "Envelopes",
    "Labels on money in an account you already have. Each one fills when you set money aside and empties as you use it. No new bank account.",
  ],
  daf: [
    "Donor-advised fund",
    "An account you give to now and grant from to charities later. Gifts to it do not count for the 2026 deduction for people who do not itemize.",
  ],
});
kitScreen(
  "giving",
  "Giving",
  "Your giving rate, one gift in time, bunching for taxes, envelopes in one account, and a running maaser count.",
  "The share, the base and how you count are your own taps. Nothing here changes your plan."
);
const gvgSeg = (f, opts, cur) =>
  `<div class="seg">${opts.map(([v, l]) => `<button class="${cur === v ? "on" : ""}" data-a="gvset" data-f="${f}" data-v="${esc(String(v))}" aria-pressed="${cur === v}">${esc(l)}</button>`).join("")}</div>`;
const gvgChips = (act, f, list, cur, k) =>
  `<div class="chips">${list.map(v => `<button class="chip ${cur === v ? "on" : ""}" data-a="${act}" data-f="${f}"${k ? ` data-k="${esc(k)}"` : ""} data-v="${v}">${money(v)}</button>`).join("")}</div>`;
function gvRateCard(g) {
  const X = g.X,
    T = g.target,
    Rt = g.rate;
  return dkCard(
    "Your giving rate",
    `<div class="tiny muted">A share of</div>${gvgSeg("base", GV_BASES, X.base || "net")}<div class="tiny muted">Your own pick. Some take maaser from gross pay, some from take-home, some after the costs of earning it.</div>` +
      ((X.base || "net") === "after"
        ? `<div class="tiny muted" style="margin-top:6px">What earning it costs you, a month</div>${gvgChips("gvset", "costs", [0, 100, 250, 500, 1000], X.costs)}`
        : "") +
      (g.lines.length
        ? `<div class="small" style="margin-top:6px">From your spending lines: ${money(g.given)} a month (${g.lines.map(r => esc(r.k)).join(", ")}).</div>`
        : `<div class="tiny muted" style="margin-top:6px">What you give a month</div>${gvgChips("gvgiven", "given", GVG_GIVEN, g.given)}`) +
      `<div class="tiny muted" style="margin-top:6px">The share you aim for</div>${gvgSeg(
        "pct",
        GV_RULES.shares.map(v => [v, gvgPct(v)]),
        X.pct == null ? null : X.pct
      )}<div class="tiny muted">Maaser is commonly 10%. Tap your own share.</div>` +
      (T.ready
        ? `<div class="small" style="margin-top:8px">Your share comes to <b>${money(T.value)}</b> a month${T.gap != null ? (T.gap > 0 ? ", " + money(T.gap) + " more than you give now" : ", and you give that or more") : ""}.</div>` +
          (Rt.ready && Rt.rate != null
            ? dkProgress(Math.min(100, (Rt.rate / T.share) * 100), { text: "Of your share" })
            : "")
        : `<div class="small muted" style="margin-top:8px">This needs ${esc((Rt.needs.length ? Rt.needs : T.needs).join(" and "))}.</div>`) +
      mathBox([
        Rt.ready && Rt.rate != null
          ? "Giving rate: " + money(Rt.given) + " a month ÷ " + money(Rt.of) + " = " + gvgPct(Rt.rate) + "."
          : null,
        T.ready
          ? "Your share: " +
            money(T.of) +
            " × " +
            gvgPct(T.share) +
            (T.own ? "" : " (10% until you tap your own)") +
            " = " +
            money(T.value) +
            " a month."
          : null,
        (X.base || "net") === "gross" && g.grossGuess
          ? "Gross pay is a guess from your take-home until your tax is set (Me)."
          : null,
      ]),
    { right: ib("term:maaser"), cap: g.givenSt ? g.givenSt : null }
  );
}
function gvGiftCard(g) {
  const X = g.X,
    G = g.gift;
  return dkCard(
    "One gift, in time",
    `<div class="tiny muted">What a gift costs you in hours of work and in days on the day work becomes optional.</div><div class="tiny muted" style="margin-top:6px">The gift</div>${gvgChips("gvset", "gift", GVG_GIFT, X.gift)}${gvgSeg(
      "every",
      [
        ["once", "Once"],
        ["month", "Every month"],
      ],
      X.every || "once"
    )}` +
      (G.ready
        ? dkStatRow([
            dkTile("Hours of work", G.hours == null ? "–" : gvgOne(G.hours), {
              sub: g.monthly ? "a month" : "at your wage",
              guess: g.wageGuess,
            }),
            dkTile("Free date", G.days == null ? "–" : gvgDays(G.days), {
              sub: g.monthly ? "giving it every month" : "giving it once",
            }),
            dkTile("Could have grown to", G.grown == null ? "–" : money(G.grown), { sub: "by your free date" }),
          ]) +
          mathBox([
            G.hours == null
              ? "Hours of work need your pay and your hours (Me)."
              : "Hours: " +
                money(G.amount) +
                " ÷ " +
                money(g.wage) +
                " an hour, your real hourly wage = " +
                gvgOne(G.hours) +
                (g.monthly ? " a month" : "") +
                ".",
            G.days == null
              ? "Days need a free date: what comes in, what goes out and what you invest."
              : "Days: the game's path runs twice, as it is and with the gift " +
                (g.monthly ? "going out every month" : "paid now") +
                ".",
            G.grown == null
              ? null
              : "Grown: at " + gvgPct(R) + " a year after inflation for " + gvgOne(G.years) + " years.",
          ])
        : ""),
    {}
  );
}
function gvBunchCard(g) {
  const X = g.X,
    K = g.bunch;
  const wy = w => (w === "itemize" ? "Itemize" : "Standard");
  return dkCard(
    "Bunching",
    `<div class="tiny muted">Give two or three years' worth in one year and itemize it, then the standard deduction in between. 2026 federal rules, federal tax only.</div>` +
      `<div class="tiny muted" style="margin-top:6px">Your other deductions a year (mortgage interest, state and local tax)</div>${gvgChips("gvset", "other", GVG_OTHER, X.other)}` +
      `<div class="tiny muted">How you file</div>${gvgSeg("filing", GVG_FILING, g.filing)}` +
      `<div class="tiny muted">Bunch</div>${gvgSeg(
        "years",
        GV_RULES.bunchYears.map(n => [n, n + " years in one"]),
        X.years || 2
      )}` +
      `<div class="tiny muted">Where the gifts go</div>${gvgSeg(
        "daf",
        [
          ["cash", "To charities, in cash"],
          ["daf", "A donor-advised fund"],
        ],
        X.daf === true ? "daf" : "cash"
      )}` +
      (K.ready
        ? dkStatRow([
            dkTile("Every year", money(K.taxEvery), { sub: "tax, " + K.years + " years", guess: true }),
            dkTile(K.years + " years in one", money(K.taxBunched), { sub: "tax, " + K.years + " years", guess: true }),
            dkTile("Bunching keeps", K.saved > 0.5 ? money(K.saved) : "Nothing more", {
              sub: K.saved > 0.5 ? "over " + K.years + " years" : "every year does as well",
            }),
          ]) +
          K.bunched
            .map(
              r =>
                `<div class="row between tiny" style="margin-top:4px"><span>Bunched, year ${r.year}: give ${money(r.give)}</span><span>${wy(r.way)} ${money(r.deduction)}</span></div>`
            )
            .join("") +
          mathBox([
            "Each year takes the larger: the standard deduction (" +
              money(GV_TAX.std[g.filing]) +
              ")" +
              (X.daf === true ? "" : " plus up to " + money(K.cap) + " of cash gifts (new in 2026)") +
              ", or your other deductions plus the gifts above " +
              gvgPct(GV_TAX.charity.floor) +
              " of income (" +
              money(K.floor) +
              ").",
            "Income: your pay before taxes, a year (" + money(g.agi) + "), a guess at your adjusted gross income.",
            K.topRate >= 0.37
              ? "In the 37% bracket the tax saved by itemizing is held to 35% from 2026. Not taken off here yet."
              : null,
            "Rules: IRS IR-2026-135 (Nov 10 2026), Publication 6196; P.L. 119-21 sec. 70425. Read Nov 26 2026. Your tax preparer has the last word.",
          ])
        : `<div class="small muted" style="margin-top:8px">This needs ${esc(K.needs.join(" and "))}.</div>`),
    { right: ib("term:bunching") }
  );
}
function gvEnvCard(g) {
  const X = g.X,
    E = g.env;
  const row = r =>
    `<div class="tile stack" style="gap:6px" data-env="${esc(r.name)}"><div class="row between"><b>${esc(r.name)}</b><button class="ghost slim" data-a="gvenvdel" data-k="${esc(r.id)}" aria-label="Remove ${esc(r.name)}">Remove</button></div>` +
    (r.open
      ? `<div class="tiny muted">Tap what you put in to start the bar.</div>`
      : dkProgress(r.full * 100) +
        `<div class="tiny">${r.empty ? (r.past > 0 ? "Empty, " + money(r.past) + " past what you put in" : "Empty: time to fill it again") : money(r.left) + " of " + money(r.put) + " left"}</div>`) +
    `<div class="tiny muted">Put in so far</div>${gvgChips("gvenvset", "put", GVG_PUT, r.put, r.id)}<div class="tiny muted">Used so far</div>${gvgChips("gvenvset", "used", GVG_PUT, r.used, r.id)}</div>`;
  return dkCard(
    "Envelopes in one account",
    `<div class="tiny muted">Labels on money you already have. Each fills when you set money aside and empties as you use it.</div><div class="tiny muted" style="margin-top:6px">What the account holds${g.balFromCash ? " (your cash, " + money(E.balance) + ")" : ""}</div>${gvgChips("gvset", "bal", GVG_BAL, X.bal)}` +
      (E.balance != null && E.ready
        ? `<div class="small" style="margin-top:6px">${E.more > 0 ? "The envelopes hold " + money(E.more) + " more than the account. Recalculating: lower one, or update the balance." : "Labeled: " + money(E.held) + ". Not in an envelope yet: " + money(E.free) + "."}</div>`
        : "") +
      `<div class="stack" style="gap:8px;margin-top:8px">${E.rows.map(row).join("")}</div>` +
      (W && W.gvgone
        ? `<button class="ghost wide slim" data-a="gvenvback">Put ${esc(W.gvgone.name)} back</button>`
        : "") +
      `<div class="tiny muted" style="margin-top:8px">Add one</div><div class="chips">${GVG_ENV.filter(
        n => !g.list.some(e => e.name === n)
      )
        .map(n => `<button class="chip" data-a="gvenvadd" data-v="${esc(n)}">${esc(n)}</button>`)
        .join("")}</div>`,
    { right: ib("term:envelope") }
  );
}
function gvCreditCard(g) {
  const X = g.X,
    Cr = g.credit;
  if (g.owed == null)
    return dkCard("Maaser credit", `<div class="small muted">Set your share above and each month shows here.</div>`);
  const opts = [...new Set([0, g.owed, g.owed * 2])];
  return dkCard(
    "Maaser credit",
    `<div class="tiny muted">What your share comes to each month next to what you gave. Giving ahead can count toward later months.</div><div class="tiny muted" style="margin-top:6px">Giving ahead counts toward later months</div>${gvgSeg(
      "ahead",
      [
        ["yes", "Yes"],
        ["no", "No"],
      ],
      X.ahead === false ? "no" : "yes"
    )}<div class="tiny muted">Many keep a running count like this. How you count it is your own rule.</div>` +
      `<div class="small" style="margin-top:8px">${!Cr.ready ? "Log a month and the count starts there." : Cr.credit > 0 ? "Given ahead: <b>" + money(Cr.credit) + "</b>, toward next month." : Cr.toGive > 0 ? "Still to give since " + gvgMon(Cr.rows[0].m) + ": <b>" + money(Cr.toGive) + "</b>." : "Even: given what your share came to."}</div>` +
      g.months
        .map(m => {
          const r = Cr.rows.find(x => x.m === m);
          return `<div class="stack" style="gap:4px;margin-top:8px" data-month="${m}"><div class="row between small"><b>${gvgMon(m)}</b><span class="tiny muted">${r ? (r.after > 0 ? money(r.after) + " ahead" : r.after < 0 ? money(-r.after) + " to give" : "even") : "before the count"}</span></div>${gvgChips("gvlog", "log", opts, g.log[m] == null ? null : g.log[m], m)}</div>`;
        })
        .join("") +
      mathBox([
        "Each month: the balance before, plus what you gave, less your share (" + money(g.owed) + ").",
        X.ahead === false
          ? "Giving ahead does not carry: the balance stops at zero."
          : "Above zero is credit and carries to the next month.",
      ]),
    { right: ib("term:maaser") }
  );
}
function givingSheet() {
  const c = C(),
    g = gvRead(c);
  return (
    head("Money", "Giving") +
    dkCaption("What you give, what it costs in time, and how to plan it.") +
    dkStatRow([
      dkTile("Giving rate", g.rate.ready && g.rate.rate != null ? gvgPct(g.rate.rate) : "–", {
        sub: g.rate.ready
          ? "of " + (GV_BASES.find(b => b[0] === g.rate.base) || [0, ""])[1].toLowerCase()
          : "tap what you give",
        guess: g.givenSt === "Guess",
      }),
      dkTile("Your share", g.target.ready ? money(g.target.value) : "–", {
        sub: g.target.ready ? gvgPct(g.target.share) + " a month" : "needs your pay",
      }),
      dkTile("Bunching keeps", g.bunch.ready ? (g.bunch.saved > 0.5 ? money(g.bunch.saved) : "Nothing more") : "–", {
        sub: g.bunch.ready ? "over " + g.bunch.years + " years" : "tap below",
        guess: g.bunch.ready,
      }),
      dkTile(
        "Maaser count",
        g.credit.ready ? (g.credit.credit > 0 ? money(g.credit.credit) : money(g.credit.toGive)) : "–",
        {
          sub: g.credit.ready ? (g.credit.credit > 0 ? "given ahead" : "still to give") : "log a month",
        }
      ),
    ]) +
    gvRateCard(g) +
    gvGiftCard(g) +
    gvBunchCard(g) +
    gvEnvCard(g) +
    gvCreditCard(g)
  );
}
const GVG_FIELDS = {
  base: v => (GV_BASES.some(b => b[0] === v) ? v : undefined),
  pct: v => (GV_RULES.shares.includes(+v) ? +v : undefined),
  costs: v => (+v >= 0 ? +v : undefined),
  gift: v => (+v > 0 ? +v : undefined),
  every: v => (v === "once" || v === "month" ? v : undefined),
  other: v => (+v >= 0 ? +v : undefined),
  filing: v => (GVG_FILING.some(f => f[0] === v) ? v : undefined),
  years: v => (GV_RULES.bunchYears.includes(+v) ? +v : undefined),
  daf: v => (v === "daf" ? true : v === "cash" ? false : undefined),
  bal: v => (+v >= 0 ? +v : undefined),
  ahead: v => (v === "no" ? false : v === "yes" ? true : undefined),
};
const gvgEnv = c => {
  const X = gvgX(c);
  if (!Array.isArray(X.env)) X.env = gvgStart();
  return X.env;
};
Object.assign(ACT, {
  giving: () => {
    W = { kind: "giving" };
    sheet(givingSheet);
  },
  gvset: t => {
    const c = C(),
      f = t.dataset.f,
      ok = GVG_FIELDS[f],
      v = ok ? ok(t.dataset.v) : undefined;
    if (v === undefined) return;
    const X = gvgX(c);
    if (X[f] === v) delete X[f]; /* a second tap clears it */
    else X[f] = v;
    save();
    drawSheet();
  },
  gvgiven: t => {
    const c = C(),
      v = Number(t.dataset.v);
    if (!(v >= 0)) return;
    c.x = c.x || {};
    c.x.kin = c.x.kin || {};
    c.x.kin.give = { v, cf: 2, d: todayISO() }; /* the key number "What you give away each month" */
    save();
    drawSheet();
  },
  gvenvadd: t => {
    const c = C(),
      v = String(t.dataset.v || "")
        .trim()
        .slice(0, 30);
    if (!v) return;
    gvgEnv(c).push({
      id: "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      name: v,
      put: null,
      used: null,
    });
    save();
    drawSheet();
  },
  gvenvset: t => {
    const c = C(),
      e = gvgEnv(c).find(x => x.id === t.dataset.k),
      f = t.dataset.f,
      v = Number(t.dataset.v);
    if (!e || (f !== "put" && f !== "used") || !(v >= 0)) return;
    e[f] = e[f] === v ? null : v;
    save();
    drawSheet();
  },
  gvenvdel: t => {
    const L = gvgEnv(C()),
      k = L.findIndex(x => x.id === t.dataset.k);
    if (k < 0) return;
    W.gvgone = L[k];
    W.gvgoneAt = k;
    L.splice(k, 1);
    save();
    drawSheet();
  },
  gvenvback: () => {
    if (!W || !W.gvgone) return;
    const L = gvgEnv(C());
    L.splice(Math.min(W.gvgoneAt || 0, L.length), 0, W.gvgone);
    W.gvgone = null;
    save();
    drawSheet();
  },
  gvlog: t => {
    const c = C(),
      m = t.dataset.k,
      v = Number(t.dataset.v);
    if (!/^\d{4}-\d{2}$/.test(m || "") || !(v >= 0)) return;
    const X = gvgX(c);
    X.log = Object.assign({}, X.log || {});
    if (X.log[m] === v) delete X.log[m];
    else X.log[m] = v;
    save();
    drawSheet();
  },
});
kitMenu("Giving", "giving", "Your giving rate, one gift in time, bunching, envelopes, maaser credit", "values");
