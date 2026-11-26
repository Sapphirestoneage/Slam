/* ============================================================================
   SLAM the Game: features/joy.js
   PURPOSE     Joy and enough (run Finish everything partly built, Part 8). One sheet in the new look:
               (1) Joy per dollar: a joy tap (1 to 5) on each spending line, its share of the joy, joy
               per $100, the hours of work it costs and its joy per hour of work. (2) The fulfillment
               curve: each line placed on survival, comforts, luxuries or past enough, and the Enough
               meter from that (with one tap it sets the life you call enough, on Lifestyle creep and
               enough). (3) The rich-life list: things with a price and a joy, memory dividends, the
               regret view. (4) Every subscription as days added to the day work becomes optional.
   INPUT       The profile: c.spends, c.x.joy, c.x.enough (curve, share), c.x.rich, c.x.subs, c.age,
               c.death. derive(c), timeLedger(c, d) (the real hourly wage), freeAt(c, opt) (the free
               date). The open sheet (W.kind): joy.
   OUTPUT      Math: jyRead, joyBook, joyHomeLine. Views: joySheet, jyJoyCard, jyCurveCard,
               jyRichCard, jySubsCard. Actions (ACT): joy, jyrate, jycurve, jyshare, jyadd, jyown,
               jyset, jydel, jyback. Menu: "Joy and enough".
   DEPENDS ON  core/enough.js (the math: enJoy, enCurve, enRich, enSubs, enDays), core/engine.js
               (derive, timeLedger, goalSim), screens/ui.js (money, esc, head, mathBox, ib, save,
               freeAt), screens/dash.js (dkCaption, dkStatRow, dkTile, dkCard, dkProgress, dkPill),
               features/kit.js (kitMenu, kitScreen, kitTerms), features/games2.js (subsOf).
   RULES       The math is in core/enough.js. The views show what it returns. The joy, the curve and
               the regret are the player's own taps: no verdict on what anyone enjoys. A line with no
               joy tapped is left out of the joy, never counted as no joy. Home is not changed here:
               joyHomeLine(c) gives Home one line to show later.
   STORED      c.x.joy = { [spending line]: 1..5 }. c.x.enough.curve = { [spending line]: "survival" |
               "comforts" | "luxuries" | "past" }. c.x.rich = [{ id, name, price, joy, kind, done,
               regret }].
   ========================================================================= */
const JY_PICKS = [
  "A trip",
  "A concert or a show",
  "A class",
  "A visit to family",
  "A dinner with friends",
  "A good chair",
  "A new bike",
  "Time off work",
];
const JY_PRICES = [50, 100, 250, 500, 1000, 2500, 5000, 10000];
/* Everything the sheet shows, from the one engine. */
function jyRead(c) {
  const d = derive(c),
    X = c.x || {},
    J = X.joy || {},
    ch = (X.enough && typeof X.enough === "object" && X.enough) || {},
    tl = timeLedger(c, d),
    wage = tl.wage > 0 ? tl.wage : null,
    lines = (c.spends || []).filter(r => r && r.amt > 0),
    joy = enJoy(
      lines.map(r => ({ name: r.k, amt: r.amt, joy: J[r.k] == null ? null : J[r.k] })),
      { wage }
    ),
    curve = enCurve(
      lines.map(r => ({ cat: r.k, amt: r.amt })),
      ch.curve || {}
    ),
    base = freeAt(c),
    rich = enRich(X.rich || [], {
      age: c.age == null ? null : c.age,
      lifeTo: c.death == null ? null : c.death,
      days: p => {
        const a = enDays(freeAt(c, { once: p }), base);
        return a == null ? null : Math.round(a);
      },
    }),
    S = (typeof subsOf === "function" ? subsOf(c) : []).map(s => ({ name: s.n, amt: s.amt })),
    total = S.reduce((a, s) => a + (s.amt > 0 ? s.amt : 0), 0),
    subs = enSubs(S, total > 0 ? enDays(base, freeAt(c, { monthly: -total })) : null, { wage });
  return {
    joy,
    curve,
    rich,
    subs,
    share: typeof ch.share === "number" ? ch.share : 1,
    wageGuess: !tl.rw,
    guess: !(c.spends || []).every(r => r.s),
  };
}
const jyOne = v => (v == null ? "–" : String(Math.round(v * 10) / 10));
const jyDays = n =>
  n == null
    ? "–"
    : n === 0
      ? "under a day"
      : Math.abs(n).toLocaleString("en-US") + (Math.abs(n) === 1 ? " day" : " days");
/* One line for Home, for later (another lane is rebuilding Home): the subscriptions in days, or the joy of a dollar. */
function joyHomeLine(c) {
  const R = jyRead(c);
  if (R.subs.ready && R.subs.days > 0)
    return "Your subscriptions add about " + jyDays(R.subs.days) + " to the day work becomes optional.";
  if (R.joy.ready) return "A dollar of your spending brings " + jyOne(R.joy.dollarJoy) + " of 5 joy.";
  return null;
}
/* The spreadsheet of the plan: the joy of a dollar and the Enough meter, each with its formula. */
function joyBook(c) {
  const R = jyRead(c),
    J = R.joy,
    K = R.curve,
    rows = [];
  if (J.ready) {
    rows.push({ id: "jy_rated", label: "Spending on lines with a joy tap, a month", v: J.ratedTotal });
    rows.push({
      id: "jy_weighted",
      label: "Joy x spending, added up",
      v: J.dollarJoy * J.ratedTotal,
      note: "each line's joy x its month",
    });
    rows.push({ id: "jy_dollar", label: "A dollar's joy (1 to 5)", v: J.dollarJoy, f: "={jy_weighted}/{jy_rated}" });
  }
  if (K.ready) {
    rows.push({ id: "jy_placed", label: "Spending placed on the curve, a month", v: K.placedTotal });
    rows.push({ id: "jy_past", label: "Spending past enough, a month", v: K.past });
    rows.push({ id: "jy_meter", label: "Enough meter", v: K.meter, f: "=({jy_placed}-{jy_past})/{jy_placed}" });
  }
  return { title: "Joy and enough", rows };
}

/* ---------- views ---------- */
kitTerms({
  joydollar: [
    "Joy per dollar",
    "Your own tap of how much joy a line brings, next to what it costs. Share of joy is a line's joy out of all the joy you tapped.",
  ],
  fulfil: [
    "The fulfillment curve",
    "From Your Money or Your Life. Spending first keeps you going (survival), then makes life easier (comforts), then fun (luxuries). Past enough, more adds nothing for you.",
  ],
  memdiv: [
    "Memory dividends",
    "From Die With Zero. An experience pays you back every year you remember it, so the same trip earlier pays back for more years.",
  ],
  richlife: ["A rich life", "From Ramit Sethi: spend a lot on what you love, and cut costs on what you do not."],
});
kitScreen(
  "joy",
  "Joy and enough",
  "Joy per dollar, where more stops adding, your rich-life list, and each subscription in days.",
  "The joy and the curve are your own taps. Nothing here changes your plan."
);
const jySeg = (act, k, opts, cur, f) =>
  `<div class="seg">${opts.map(([v, l]) => `<button class="${cur === v ? "on" : ""}" data-a="${act}" data-k="${esc(String(k))}"${f ? ` data-f="${f}"` : ""} data-v="${esc(String(v))}" aria-pressed="${cur === v}">${esc(l)}</button>`).join("")}</div>`;
function jyJoyCard(R) {
  const J = R.joy,
    X = C().x || {},
    tap = X.joy || {};
  if (!J.of)
    return dkCard(
      "Joy per dollar",
      `<div class="small muted">Add your spending lines in the Money tab and each one shows up here to tap.</div>`,
      { right: ib("term:joydollar") }
    );
  const rows = (C().spends || [])
    .filter(r => r && r.amt > 0)
    .map(r => {
      const x = J.rows.find(y => y.name === r.k) || {};
      return `<div class="stack" style="gap:4px;margin-top:8px" data-joy="${esc(r.k)}"><div class="row between small"><b>${esc(r.k)}</b><span>${money(r.amt)} a month</span></div>${jySeg(
        "jyrate",
        r.k,
        EN_JOY.map(([v]) => [v, String(v)]),
        tap[r.k] == null ? null : tap[r.k]
      )}${x.joy != null ? `<div class="tiny muted">${Math.round((x.joyShare || 0) * 100)}% of your joy · ${jyOne(x.per100)} joy per $100${x.hours != null ? " · " + jyOne(x.hours) + " hours of work · " + (Math.round((x.perHour || 0) * 100) / 100).toString() + " joy an hour" : ""}</div>` : ""}</div>`;
    })
    .join("");
  return dkCard(
    "Joy per dollar",
    `<div class="tiny muted">Tap how much joy each line brings you: 1 a little, 5 you love it. Your taps, your call.</div>` +
      (J.ready && J.most
        ? `<div class="small" style="margin-top:6px">Most joy per dollar: <b>${esc(J.most.name)}</b>${J.least ? ". Least: " + esc(J.least.name) : ""}.</div>`
        : "") +
      rows +
      mathBox([
        "Share of joy: a line's joy ÷ the joy of every tapped line added up.",
        "Joy per $100: a line's joy ÷ (its month ÷ $100). A dollar's joy: each line's joy weighted by its month.",
        J.wage == null
          ? "Hours of work need your pay and your hours (Me)."
          : "Hours of work: a line's month ÷ " +
            money(J.wage) +
            " an hour, your real hourly wage" +
            (R.wageGuess ? " (a guess until your hours are exact)" : "") +
            ". Joy an hour: its joy ÷ those hours.",
        "A line with no tap is left out of the joy, never counted as no joy.",
        EN_SOURCES.sethi + ".",
      ]),
    { right: ib("term:joydollar"), cap: J.ready ? J.rated + " of " + J.of + " lines tapped" : null }
  );
}
function jyCurveCard(R) {
  const K = R.curve,
    X = C().x || {},
    cur = (X.enough && X.enough.curve) || {},
    rows = K.cats
      .map(
        c =>
          `<div class="stack" style="gap:4px;margin-top:8px" data-curve="${esc(c.cat)}"><div class="row between small"><b>${esc(c.cat)}</b><span>${money(c.amt)} a month</span></div>${jySeg("jycurve", c.cat, EN_CURVE, cur[c.cat] || null)}</div>`
      )
      .join("");
  if (!K.of)
    return dkCard(
      "The fulfillment curve",
      `<div class="small muted">Add your spending lines in the Money tab and each one shows up here to place.</div>`,
      { right: ib("term:fulfil") }
    );
  const meter = K.ready
    ? `<div class="small" style="margin-top:10px">Enough meter: <b>${Math.round(K.meter * 100)}%</b> of what you placed still adds to the life you want. ${money(K.past)} a month is past enough, by your own taps.</div>` +
      dkProgress(K.meter * 100, { text: "Still adds" }) +
      K.levels
        .map(
          l =>
            `<div class="row between tiny" style="margin-top:4px"><span>${esc(l.label)}</span><span>${money(l.amt)}</span></div>${dkProgress(K.placedTotal > 0 ? (l.amt / K.placedTotal) * 100 : 0)}`
        )
        .join("") +
      (K.past > 0 && K.share != null
        ? `<div class="small" style="margin-top:8px">Your curve calls ${Math.round(K.share * 100)}% of today's life enough.</div>` +
          (R.share === K.share
            ? dkPill("Used for your enough number")
            : `<button class="ghost wide slim" data-a="jyshare" data-v="${K.share}">Use it for my enough number</button>`)
        : "")
    : "";
  return dkCard(
    "The fulfillment curve",
    `<div class="tiny muted">Place each line where it sits for you: survival keeps you going, comforts make life easier, luxuries make it fun, past enough adds nothing for you.</div>` +
      rows +
      meter +
      mathBox([
        "Enough meter: the spending on survival, comforts and luxuries ÷ all the spending you placed.",
        "Your curve's enough: 1 − the spending past enough ÷ all your spending. Used, it scales your enough number on Lifestyle creep and enough.",
        EN_SOURCES.ymoyl + ".",
      ]),
    { right: ib("term:fulfil"), cap: K.ready ? K.placed + " of " + K.of + " placed" : null }
  );
}
function jyRichCard(R) {
  const L = R.rich,
    X = C().x || {},
    list = X.rich || [],
    by = {};
  L.items.forEach(i => {
    by[i.id] = i;
  });
  const item = i => {
    const r = by[i.id] || {};
    return `<div class="tile stack" style="gap:6px" data-rich="${esc(i.name)}"><div class="row between"><b>${esc(i.name)}</b><button class="ghost slim" data-a="jydel" data-k="${esc(i.id)}" aria-label="Remove ${esc(i.name)}">Remove</button></div>
<div class="tiny muted">Price</div><div class="chips">${JY_PRICES.map(p => `<button class="chip ${i.price === p ? "on" : ""}" data-a="jyset" data-k="${esc(i.id)}" data-f="price" data-v="${p}">${money(p)}</button>`).join("")}</div>
<div class="tiny muted">Joy</div>${jySeg(
      "jyset",
      i.id,
      EN_JOY.map(([v]) => [v, String(v)]),
      i.joy == null ? null : i.joy,
      "joy"
    )}
<div class="tiny muted">It is</div>${jySeg("jyset", i.id, EN_KIND, i.kind || null, "kind")}
<div class="tiny muted">Would you regret missing it?</div>${jySeg("jyset", i.id, EN_REGRET, i.regret || null, "regret")}
${jySeg(
  "jyset",
  i.id,
  [
    ["no", "Not yet"],
    ["yes", "Done"],
  ],
  i.done ? "yes" : "no",
  "done"
)}
<div class="tiny muted">${[r.per100 != null ? jyOne(r.per100) + " joy per $100" : null, r.memYears != null ? "memory dividends for " + r.memYears + " years (" + r.laterYears + " if it waits " + EN_RULES.later + " years)" : null, r.days != null ? "adds " + jyDays(r.days) + " to your free date" : null].filter(Boolean).join(" · ")}</div></div>`;
  };
  const regret = L.regret.filter(i => i.regret);
  return dkCard(
    "Rich-life list",
    `<div class="tiny muted">The things that make your life rich, with what they cost. Spend a lot on what you love.</div>` +
      (L.count
        ? `<div class="small" style="margin-top:6px">${L.planned} still to do: <b>${money(L.plannedTotal)}</b>${L.done ? ". " + L.done + " done: " + money(L.doneTotal) : ""}.</div>`
        : "") +
      `<div class="stack" style="gap:8px;margin-top:8px">${list.map(item).join("")}</div>` +
      (W && W.gone ? `<button class="ghost wide slim" data-a="jyback">Put ${esc(W.gone.name)} back</button>` : "") +
      `<div class="tiny muted" style="margin-top:8px">Add one</div><div class="chips">${JY_PICKS.map(p => `<button class="chip" data-a="jyadd" data-v="${esc(p)}">${esc(p)}</button>`).join("")}</div>` +
      `<div class="row" style="gap:8px;margin-top:6px"><input id="jyown" class="mnfind" type="text" maxlength="40" placeholder="Or your own, in a few words" aria-label="Your own" style="flex:1;min-height:44px"><button class="ghost slim" data-a="jyown">Add</button></div>` +
      (regret.length
        ? `<div class="tiny muted" style="margin-top:10px">The regret view</div><div class="small">${L.alot ? "You would regret missing " + L.alot + " a lot: " + money(L.alotTotal) + (L.alotDays != null ? ", " + jyDays(L.alotDays) + " on your free date" : "") + "." : "What you would regret missing, most first."}</div>` +
          regret
            .map(
              i =>
                `<div class="row between small" data-regret="${esc(i.name)}"><span>${dkPill(EN_REGRET.find(x => x[0] === i.regret)[1])} ${esc(i.name)}</span><span>${i.price == null ? "No price yet" : money(i.price)}${i.done ? " · done" : ""}</span></div>`
            )
            .join("")
        : "") +
      mathBox([
        "Joy per $100: its joy ÷ (its price ÷ $100).",
        "Memory dividends: an experience pays back each year you remember it, here the years from your age to the age the game plans to (" +
          (L.memYears == null ? "needs your age" : L.memYears + " years") +
          "). Waiting " +
          EN_RULES.later +
          " years leaves " +
          EN_RULES.later +
          " fewer.",
        "Days on your free date: the game's path run again with the price paid now.",
        EN_SOURCES.perkins + ". " + EN_SOURCES.sethi + ".",
      ]),
    { right: ib("term:memdiv") }
  );
}
function jySubsCard(R) {
  const P = R.subs;
  if (!P.of)
    return dkCard(
      "Subscriptions in days",
      `<div class="small muted">Tap the subscriptions you pay for, and each one shows the days it adds to the day work becomes optional.</div><button class="ghost wide slim" data-a="subs">Find your subscriptions</button>`
    );
  if (!P.ready)
    return dkCard(
      "Subscriptions in days",
      `<div class="small muted">This needs a date when work becomes optional: what comes in, what goes out and what you invest.</div>`
    );
  return dkCard(
    "Subscriptions in days",
    `<div class="small">Together they add about <b>${jyDays(P.days)}</b> to the day work becomes optional: ${money(P.total)} a month, ${money(P.year)} a year.</div>` +
      P.rows
        .map(
          r =>
            `<div class="row between small" style="margin-top:4px" data-sub="${esc(r.name)}"><span>${esc(r.name)} · ${money(r.amt)}</span><b>${jyDays(r.days)}</b></div>`
        )
        .join("") +
      `<button class="ghost wide slim" style="margin-top:8px" data-a="subs">Change your subscriptions</button>` +
      mathBox([
        "The game's path runs twice: as it is, and with every subscription cancelled (that much less going out each month, and a smaller freedom number).",
        "The gap is " +
          jyDays(P.days) +
          ". Each one's part is its share of the " +
          money(P.total) +
          " a month: the date moves in a near straight line for amounts this size.",
        P.hoursYear != null ? "Hours of work a year, all of them: " + jyOne(P.hoursYear) + "." : null,
      ])
  );
}
function joySheet() {
  const c = C(),
    R = jyRead(c),
    J = R.joy,
    K = R.curve,
    L = R.rich,
    P = R.subs;
  return (
    head("Money", "Joy and enough") +
    dkCaption("What your spending gives you back, and where enough is.") +
    dkStatRow([
      dkTile("A dollar's joy", J.ready ? jyOne(J.dollarJoy) + " of 5" : "–", {
        sub: J.ready ? J.rated + " of " + J.of + " lines tapped" : "tap a line",
        guess: J.ready && R.guess,
      }),
      dkTile("Enough meter", K.ready ? Math.round(K.meter * 100) + "%" : "–", {
        sub: K.ready ? "still adds" : "place a line",
      }),
      dkTile("Rich-life list", L.count ? money(L.plannedTotal) : "–", {
        sub: L.count ? L.planned + " to do" : "add one",
      }),
      dkTile("Subscriptions", P.ready ? jyDays(P.days) : "–", {
        sub: P.ready ? "on your free date" : P.of ? "needs a free date" : "none yet",
      }),
    ]) +
    jyJoyCard(R) +
    jyCurveCard(R) +
    jyRichCard(R) +
    jySubsCard(R) +
    `<button class="ghost wide slim" data-a="enough">Lifestyle creep and enough</button>`
  );
}
const jyRich = c => {
  c.x = c.x || {};
  c.x.rich = Array.isArray(c.x.rich) ? c.x.rich : [];
  return c.x.rich;
};
const jyNew = name => ({
  id: "rl" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
  name: String(name).slice(0, 40),
  price: null,
  joy: null,
  kind: null,
  done: false,
  regret: null,
});
Object.assign(ACT, {
  joy: () => {
    W = { kind: "joy" };
    sheet(joySheet);
  },
  jyrate: t => {
    const c = C(),
      k = t.dataset.k,
      v = Number(t.dataset.v);
    if (!enJoyOk(v) || !(c.spends || []).some(r => r.k === k)) return;
    c.x = c.x || {};
    c.x.joy = Object.assign({}, c.x.joy || {});
    if (c.x.joy[k] === v) delete c.x.joy[k]; /* a second tap clears it */
    else c.x.joy[k] = v;
    save();
    drawSheet();
  },
  jycurve: t => {
    const c = C(),
      k = t.dataset.k,
      v = t.dataset.v;
    if (!EN_CURVE.some(x => x[0] === v) || !(c.spends || []).some(r => r.k === k)) return;
    c.x = c.x || {};
    const ch = Object.assign({}, c.x.enough || {}),
      cu = Object.assign({}, ch.curve || {});
    if (cu[k] === v) delete cu[k];
    else cu[k] = v;
    ch.curve = cu;
    c.x.enough = ch;
    save();
    drawSheet();
  },
  jyshare: t => {
    const c = C(),
      v = Number(t.dataset.v);
    if (!(v > 0 && v <= 1)) return;
    c.x = c.x || {};
    c.x.enough = Object.assign({}, c.x.enough || {}, { share: v });
    save();
    drawSheet();
  },
  jyadd: t => {
    const c = C(),
      v = String(t.dataset.v || "").trim();
    if (!v) return;
    jyRich(c).push(jyNew(v));
    save();
    drawSheet();
  },
  jyown: () => {
    const el = typeof document !== "undefined" && document.getElementById ? document.getElementById("jyown") : null,
      v = String((el && el.value) || "")
        .trim()
        .slice(0, 40);
    if (!v) return;
    jyRich(C()).push(jyNew(v));
    save();
    drawSheet();
  },
  jyset: t => {
    const c = C(),
      L = jyRich(c),
      i = L.find(x => x.id === t.dataset.k),
      f = t.dataset.f,
      raw = t.dataset.v;
    if (!i) return;
    if (f === "price") {
      const p = Number(raw);
      if (!(p >= 0)) return;
      i.price = i.price === p ? null : p;
    } else if (f === "joy") {
      const j = Number(raw);
      if (!enJoyOk(j)) return;
      i.joy = i.joy === j ? null : j;
    } else if (f === "kind") {
      if (!EN_KIND.some(x => x[0] === raw)) return;
      i.kind = i.kind === raw ? null : raw;
    } else if (f === "regret") {
      if (!EN_REGRET.some(x => x[0] === raw)) return;
      i.regret = i.regret === raw ? null : raw;
    } else if (f === "done") i.done = raw === "yes";
    else return;
    save();
    drawSheet();
  },
  jydel: t => {
    const c = C(),
      L = jyRich(c),
      k = L.findIndex(x => x.id === t.dataset.k);
    if (k < 0) return;
    W.gone = L[k];
    W.goneAt = k;
    L.splice(k, 1);
    save();
    drawSheet();
  },
  jyback: () => {
    if (!W || !W.gone) return;
    const L = jyRich(C());
    L.splice(Math.min(W.goneAt || 0, L.length), 0, W.gone);
    W.gone = null;
    save();
    drawSheet();
  },
});
kitMenu(
  "Joy and enough",
  "joy",
  "Joy per dollar, the fulfillment curve, your rich-life list, subscriptions in days",
  "enough"
);
