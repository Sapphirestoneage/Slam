/* ===== lever.js: Which lever matters most. Six levers (Earn, Spend, Protect, Grow, Stretch, Keep), each one priced in the same unit, dollars a year, on the player's own numbers, so they can be put side by side. The headline names a biggest lever only when the numbers under it are not guesses: a lever sitting on a guess shows its number with the word Guess and gets no call. Two Paths puts the same money into investing or into a skill. The guessing game asks which of three changes adds the most at the player's own age, then flips the age and adds twists; nothing is random and nothing is won or lost. State: c.x.lvq={n,of,d} once the game has been played. All taps. ===== */
const LV_BASE = 300,
  LV_END = 65,
  LV_TIE = 0.03;
function lvFv(m, r, y) {
  const i = r / 12,
    n = Math.round(y * 12);
  return i ? (m * (Math.pow(1 + i, n) - 1)) / i : m * n;
}
function lvYears(age) {
  return Math.max(5, LV_END - (age || 30));
}
function lvAt(age, add) {
  const y = lvYears(age),
    b = lvFv(LV_BASE, R, y),
    o = {
      y,
      base: b,
      time: lvFv(LV_BASE, R, y + 3) - b,
      ret: lvFv(LV_BASE, R + 0.01, y) - b,
      money: lvFv(LV_BASE + (add || 100), R, y) - b,
    };
  const ks = ["time", "ret", "money"].sort((a, b2) => o[b2] - o[a]);
  o.win = ks[0];
  o.tie = o[ks[0]] > 0 && (o[ks[0]] - o[ks[1]]) / o[ks[0]] <= LV_TIE ? ks[1] : null;
  return o;
}
const LV_OPT = { time: "Work 3 more years", ret: "1% more growth a year", money: "$100 more a month" };
function lvRounds(c) {
  const age = c.age || 30,
    other = age < 40 ? 55 : 25,
    y = lvYears(age),
    b = lvFv(LV_BASE, R, y),
    wait = y > 12 ? 10 : 5,
    three = r =>
      ["time", "ret", "money"].map(k => ({
        k,
        n: k === "money" && r.add ? "$" + r.add + " more a month" : LV_OPT[k],
        v: r.o[k],
      }));
  const A = lvAt(age),
    B = lvAt(other),
    T = lvAt(age, 200),
    fee = b - lvFv(LV_BASE, R - 0.01, y),
    more = lvFv(LV_BASE, R + 0.03, y) - b,
    late = b - lvFv(LV_BASE, R, y - wait);
  return [
    {
      t: "You are " + age + ".",
      ask: "$300 a month goes in until 65. Which one change adds the most?",
      opts: three({ o: A }),
      ok: [A.win].concat(A.tie ? [A.tie] : []),
      why: A.tie
        ? "At " + age + " the top two land almost together."
        : "At " + age + ", " + LV_OPT[A.win].toLowerCase() + " wins.",
      math: [
        "$300 a month for " + A.y + " years at 7% a year after inflation grows to about " + money(Math.round(b)) + ".",
        "Each choice is run alone, and what it adds on top is shown.",
      ],
    },
    {
      t: "Now someone who is " + other + ".",
      ask: "Same $300 a month, same three choices. Which adds the most for them?",
      opts: three({ o: B }),
      ok: [B.win].concat(B.tie ? [B.tie] : []),
      why: "The winner moved. No lever is always the biggest. It depends where you are.",
      math: [other + " to 65 is " + B.y + " years. Time left changes what each lever is worth."],
    },
    {
      t: "Two of you, one home.",
      ask: "You are " + age + " again, and two people can each add $100. Is $200 a month still behind, or ahead?",
      opts: three({ o: T, add: 200 }),
      ok: [T.win].concat(T.tie ? [T.tie] : []),
      why: "More hands on the money lever makes it bigger. The other two do not change.",
      math: ["Only the money choice changed: $200 a month instead of $100."],
    },
    {
      t: "Which one can you choose?",
      ask: "One of these is in your hands today. Which?",
      opts: [
        { k: "more", n: "3% more growth a year from the market", v: more },
        { k: "fee", n: "Stop paying a 1% yearly fee", v: fee },
        { k: "wait", n: "Wait for a better time to start", v: -late },
      ],
      ok: ["fee"],
      why: "Nobody can order 3% more from the market. A fee is the part of growth you do get to choose.",
      math: [
        "3% more a year would add about " +
          money(Math.round(more)) +
          ", if it could be ordered. Reaching for it means taking more risk, and risk cuts both ways.",
        "A 1% fee for " + y + " years costs about " + money(Math.round(fee)) + ".",
        "Waiting " + wait + " years costs about " + money(Math.round(late)) + ".",
      ],
    },
    {
      t: "Which costs more?",
      ask: "Two quiet costs, at your age. Which one is bigger?",
      opts: [
        { k: "late", n: "Starting " + wait + " years later", v: -late },
        { k: "fee", n: "A 1% yearly fee the whole way", v: -fee },
      ],
      ok: [late >= fee ? "late" : "fee"],
      why:
        late >= fee
          ? "The years you do not have back cost the most."
          : "The fee costs more, because it is charged on every dollar, every year.",
      math: [
        "Starting " + wait + " years later: about " + money(Math.round(late)) + " less.",
        "A 1% fee the whole way: about " + money(Math.round(fee)) + " less.",
      ],
    },
  ];
}
function lvCf(c, k) {
  try {
    return typeof isSharp === "function" && isSharp(c, k) ? 2 : 0;
  } catch (e) {
    return 0;
  }
}
function lvLevers(c, d) {
  const T = (c.take || 0) * 12,
    S = (c.spend || 0) * 12,
    age = c.age || 30,
    L = [],
    gross = typeof knNet === "function" ? knNet(c).gross * 12 : T / 0.8,
    rate = c.x && c.x.taxPct ? c.x.taxPct / 100 : 0.2,
    rateKnown = !!(c.x && c.x.taxPct);
  L.push({
    k: "earn",
    n: "Earn",
    what: "A raise, a better job, or side income worth 10% of your pay",
    yr: T * 0.1,
    cf: lvCf(c, "take"),
    sure: "Not promised",
    effort: "Months",
    peaks: "Biggest in your 20s to 40s",
    prime: age < 45,
    worst: "The time you put in, and no raise this year.",
    a: "mp",
    l: "r",
    id: "earn",
    go: "Open Earning",
    math: ["10% of " + money(Math.round(T)) + " a year of take-home pay.", "A raise also lifts every raise after it."],
  });
  L.push({
    k: "spend",
    n: "Spend",
    what: "Trimming a tenth of what you spend",
    yr: S * 0.1,
    cf: lvCf(c, "spend"),
    sure: "Yours to choose",
    effort: "Weeks",
    peaks: "Works at every age",
    prime: true,
    dbl: (S * 0.1) / SWR,
    worst: "A cut that makes life worse and does not last.",
    a: "values",
    go: "Where is my money going?",
    math: [
      "10% of " + money(Math.round(S)) + " a year of spending.",
      "It counts twice: you keep the money, and the pile you need gets smaller by 25 times that, about " +
        money(Math.round((S * 0.1) / SWR)) +
        ".",
    ],
  });
  let cost = 0,
    dcf = 3,
    nd = 0;
  (c.debts || []).forEach(x => {
    if (!(x.amt > 0)) return;
    const r = typeof dbRate === "function" ? dbRate(x) : { v: x.high ? 20 : 5, cf: 0 };
    if (r.v >= 8) {
      cost += (x.amt * r.v) / 100;
      nd++;
      dcf = Math.min(dcf, r.cf, x.s ? 3 : 0);
    }
  });
  L.push({
    k: "protect",
    n: "Protect",
    what: nd ? "The interest on your costly debt (8% a year and up)" : "No costly debt on file",
    yr: cost,
    cf: nd ? dcf : 3,
    done: !nd,
    sure: "Guaranteed",
    effort: "Months",
    peaks: "First, then it fades",
    prime: nd > 0,
    worst: "None. Interest you stop paying is money kept.",
    a: "debtplan",
    go: "Open my debt plan",
    math: nd
      ? [
          nd +
            " debt" +
            (nd > 1 ? "s" : "") +
            " at 8% or more. Balance times rate, added up, is about " +
            money(Math.round(cost)) +
            " a year in interest.",
          "Paying them off is the only return in money that is guaranteed.",
        ]
      : ["Nothing you owe costs 8% a year or more."],
  });
  const fee = c.x && c.x.kin && c.x.kin.fee ? +c.x.kin.fee.v : null,
    feeYr = fee != null && fee > 0.05 ? ((c.inv || 0) * (fee - 0.05)) / 100 : 0,
    want = (d.target || 3) * (c.spend || 0),
    idle = Math.max(0, (d.cash || 0) - want * 1.5) * 0.03,
    miss = c.match === "no" ? gross * 0.03 : 0,
    g = feeYr + idle + miss,
    gm = [];
  if (feeYr)
    gm.push(
      "Your fee of " +
        fee +
        "% on " +
        money(Math.round(c.inv)) +
        " invested, next to a low-cost fund at 0.05%: about " +
        money(Math.round(feeYr)) +
        " a year."
    );
  if (idle)
    gm.push(
      "Cash past one and a half times your cushion, earning 3% more than it does now: about " +
        money(Math.round(idle)) +
        " a year. The 3% is an assumption."
    );
  if (miss)
    gm.push(
      "A match at work you are not getting. A common match is 3% of pay: about " +
        money(Math.round(miss)) +
        " a year. Your plan's real match may differ."
    );
  if (!gm.length)
    gm.push(
      fee == null && (c.inv || 0) > 0
        ? "No fee on file yet. The Fee X-ray finds it."
        : "Nothing found to fix here on today's numbers."
    );
  L.push({
    k: "grow",
    n: "Grow",
    what: "Fees, idle cash and a match you are missing",
    yr: g,
    cf: miss || idle ? 0 : fee != null ? 2 : 0,
    done: !g && fee != null,
    sure: "Mostly guaranteed",
    effort: "An afternoon",
    peaks: "Gets bigger as your money does",
    prime: age >= 40,
    worst: "None for a fee cut. A match needs you to put money in too.",
    a: "compare",
    v: "fee",
    go: "Open the Fee X-ray",
    math: gm,
  });
  const lock = c.high && c.high !== "no";
  L.push({
    k: "stretch",
    n: "Stretch",
    what: "Card rewards and bank bonuses on what you already spend",
    yr: lock ? 0 : S * 0.6 * 0.02 + 600,
    cf: 0,
    lock: lock ? "Not yet. Card rewards lose to card interest, so Protect comes first." : null,
    sure: "Guaranteed if you follow the rules",
    effort: "An hour each",
    peaks: "Biggest in your 20s and 30s",
    prime: age < 40,
    cap: true,
    worst: "A fee or a missed rule that eats the bonus.",
    a: "mult",
    go: "Open the multipliers board",
    math: [
      "2% back on the part of spending that can go on a card, taken as 60% of " + money(Math.round(S)) + ".",
      "Plus two bank bonuses a year at $300 each.",
      "Capped by what you spend, so it does not grow with your money. Paid in full every month, always.",
    ],
  });
  const room = Math.min(d.save || 0, typeof ROTH === "number" ? ROTH : 7000),
    kept = c.tax === "yes";
  L.push({
    k: "keep",
    n: "Keep",
    what: kept ? "You already use a tax-favored account" : "Putting your savings in a tax-favored account first",
    yr: kept ? 0 : room * rate,
    cf: kept ? 3 : rateKnown && lvCf(c, "take") && lvCf(c, "spend") ? 2 : 0,
    done: kept,
    sure: "Set by law",
    effort: "An afternoon",
    peaks: "Small now, the biggest lever later",
    prime: age >= 45,
    worst: "Rules on taking money out early.",
    a: "mult",
    go: "Open the multipliers board",
    math: kept
      ? ["Marked as done in your setup."]
      : [
          "Up to " +
            money(room) +
            " of what you save a year, times a tax rate of " +
            Math.round(rate * 100) +
            "%" +
            (rateKnown ? "." : ", which is a guess until your tax rate is in Key numbers."),
          "This is the first account only. The tax lever keeps growing as your money grows.",
        ],
  });
  return L;
}
function lvRank(c, d) {
  const L = lvLevers(c, d),
    open = L.filter(x => !x.lock && !x.done && x.yr > 0).sort((a, b) => b.yr - a.yr),
    top = open[0] || null,
    own = open.filter(x => x.k !== "earn"),
    sure = own[0] || null,
    swing = open.find(x => x.k === "earn") || null;
  return {
    L,
    open,
    top,
    sure,
    swing,
    sureGuess: !!sure && (sure.cf < 2 || (!!own[1] && own[1].cf < 2 && own[1].yr > sure.yr * 0.6)),
    swingGuess: !!swing && swing.cf < 2,
    max: top ? top.yr : 0,
  };
}
function lvHead(R0) {
  const cell = (x, label, gs) =>
    x
      ? `<div class="cpcell ${gs ? "" : "best"}"><div class="tiny muted">${label}</div><b class="lvbig">${x.n}</b><div class="small">${money(Math.round(x.yr))} a year</div><div class="tiny muted">${gs ? "On a guess, so no call yet" : x.sure}</div></div>`
      : "";
  if (!R0.sure && !R0.swing)
    return `<div class="tile small">Every lever here is pulled or waiting on another one. That is a good place to be.</div>`;
  return `<div class="cpgrid" style="grid-template-columns:${R0.sure && R0.swing ? "1fr 1fr" : "1fr"}">${cell(R0.sure, "Biggest one in your hands", R0.sureGuess)}${cell(R0.swing, "Biggest if it lands", R0.swingGuess)}</div>`;
}
function lvPill(x) {
  return x.done
    ? `<span class="pill okp">Done</span>`
    : x.lock
      ? `<span class="pill">Not yet</span>`
      : x.cf >= 3
        ? `<span class="pill okp">Exact</span>`
        : x.cf >= 2
          ? `<span class="pill">Close</span>`
          : `<span class="pill">Guess</span>`;
}
function lvRow(x, max) {
  const w = x.yr > 0 && max > 0 ? Math.max(4, Math.round((x.yr / max) * 100)) : 0;
  return `<button class="rowbtn lvrow" data-a="lvopen" data-v="${x.k}"><span style="min-width:0;flex:1"><span class="row between" style="gap:8px"><b>${x.n}</b><b style="white-space:nowrap">${x.lock || x.done ? "" : money(Math.round(x.yr)) + " a year"}</b></span><div class="tiny muted">${x.lock || x.what}</div><div class="bar" style="margin-top:5px"><i style="width:${w}%"></i></div></span><span class="stack" style="gap:4px;align-items:flex-end">${lvPill(x)}<span class="caret">›</span></span></button>`;
}
function lvTwo(c, o) {
  const y = Math.max(1, LV_END - (c.age || 30)),
    T = (c.take || 0) * 12,
    inv = o.amt * Math.pow(1 + R, y),
    e = ((T * o.lift) / 100) * o.odds,
    sum = e * y,
    even = T > 0 && o.odds > 0 ? ((o.amt * Math.pow(1 + R, y)) / (T * o.odds * y)) * 100 : null;
  return { y, inv, e, sum, even, ahead: sum > inv ? "skill" : "inv" };
}
function lvChips(k, opts, cur, f) {
  return `<div class="chips">${opts.map(v => `<button class="chip sm ${cur === v ? "on" : ""}" data-a="lvset" data-k="${k}" data-v="${v}">${f(v)}</button>`).join("")}</div>`;
}
function lvSheet() {
  const c = C(),
    d = D || derive(c),
    w = W,
    R0 = lvRank(c, d);
  if (w.v === "two") {
    const o = w.o,
      r = lvTwo(c, o),
      gs = lvCf(c, "take") < 2;
    return (
      head("Which lever", "Two paths for the same money") +
      `<div class="small muted">The same dollars, sent two ways. One buys a piece of the market. The other buys a skill.</div>` +
      q(
        "How much",
        lvChips("amt", [300, 1000, 3000, 10000], o.amt, v => money(v))
      ) +
      q(
        "The skill lifts your pay by",
        lvChips("lift", [2, 5, 10, 20], o.lift, v => v + "%")
      ) +
      q(
        "How likely is it to work",
        lvChips("odds", [0.25, 0.5, 0.75, 1], o.odds, v =>
          v === 1 ? "Sure" : v === 0.5 ? "Half" : v === 0.25 ? "1 in 4" : "3 in 4"
        )
      ) +
      `<div class="cpgrid" style="grid-template-columns:1fr 1fr">${cpCell(money(Math.round(r.inv)), "invested, by 65", !gs && r.ahead === "inv")}${cpCell(money(Math.round(r.sum)), "extra pay over " + r.y + " years, on average", !gs && r.ahead === "skill")}</div>` +
      `<div class="tile small">${gs ? "Your pay is still a guess, so this shows both numbers and makes no call. " : ""}${r.even == null ? "" : "The two paths meet when the skill lifts your pay by about " + (r.even < 0.1 ? "0.1" : r.even.toFixed(1)) + "%."} A skill pays only if you use it, and it can keep paying on every raise after.</div>` +
      (gs ? `<button class="primary wide slim" data-a="sharp" data-v="take">Make my pay real</button>` : "") +
      mathBox([
        money(o.amt) +
          " left alone for " +
          r.y +
          " years at 7% a year after inflation: " +
          money(Math.round(r.inv)) +
          ".",
        o.lift +
          "% of " +
          money(Math.round((c.take || 0) * 12)) +
          " take-home is " +
          money(Math.round(((c.take || 0) * 12 * o.lift) / 100)) +
          " a year. Times the chance it works (" +
          Math.round(o.odds * 100) +
          "%): " +
          money(Math.round(r.e)) +
          " a year on average.",
        "Over " + r.y + " working years that is " + money(Math.round(r.sum)) + ", in today's dollars, not invested.",
        "Worst case for the skill: the money and the hours are gone. Worst case for investing: a bad stretch in the market.",
      ]) +
      `<button class="ghost wide slim" data-a="lever">Back to the levers</button>`
    );
  }
  if (w.v) {
    const x = R0.L.find(o => o.k === w.v);
    if (x)
      return (
        head("Which lever", x.n) +
        `<div class="tile stack" style="gap:4px;text-align:center"><div class="tiny muted">${x.what}</div><div class="bignum">${x.lock ? "Not yet" : x.done ? "Done" : money(Math.round(x.yr)) + " a year"}</div><div>${lvPill(x)}</div></div>` +
        (x.lock ? `<div class="tile small">${x.lock}</div>` : "") +
        `<div class="cpgrid" style="grid-template-columns:1fr 1fr">${cpCell(x.effort, "to set up")}${cpCell(x.sure, "how sure")}</div><div class="tile small"><b>When it matters most:</b> ${x.peaks}.${x.prime && !x.done && !x.lock ? " That is where you are now." : ""}<br><b>Worst case:</b> ${x.worst}${x.cap ? "<br><b>Capped:</b> yes, by what you spend." : ""}</div>` +
        mathBox(x.math) +
        `<div class="row" style="gap:8px"><button class="primary" style="flex:1" data-a="lvgo" data-v="${x.k}">${x.go}</button><button class="ghost" style="flex:1" data-a="lever">All six levers</button></div>`
      );
  }
  const played = c.x && c.x.lvq;
  return (
    head("Menu", "Which lever matters most") +
    `<div class="small muted">Six ways to move your money forward, all in the same unit: dollars a year. Earning more is the biggest swing for most people, and it is not promised, so it sits apart from the ones fully in your hands.</div>` +
    lvHead(R0) +
    `<div class="stack" style="gap:6px">${R0.L.slice()
      .sort((a, b) => (b.lock || b.done ? -1 : b.yr) - (a.lock || a.done ? -1 : a.yr))
      .map(x => lvRow(x, R0.max))
      .join("")}</div>` +
    `<div class="row" style="gap:8px"><button class="ghost" style="flex:1" data-a="lvopen" data-v="two">Two paths: invest or learn</button><button class="${played ? "ghost" : "primary"}" style="flex:1" data-a="lvquiz">${played ? "Play the guessing game again" : "Guess which one wins"}</button></div>` +
    `<button class="term" data-a="info" data-k="gloss:lever">What is a lever?</button>`
  );
}
function lvQuizSheet() {
  const c = C(),
    w = W,
    Rs = lvRounds(c);
  if (w.i >= Rs.length)
    return (
      head("Which lever", "What you saw") +
      `<div class="tile stack" style="gap:4px;text-align:center"><div class="bignum">${w.right} of ${Rs.length}</div><div class="small">Most people miss the first one. The point is the rule, not the score.</div></div><div class="tile small"><b>The rule:</b> no lever always wins. Time is strongest late, money and growth are strongest early, and the only growth you can choose is the part you stop paying away in fees.</div><div class="row" style="gap:8px"><button class="primary" style="flex:1" data-a="lever">See my own levers</button><button class="ghost" style="flex:1" data-a="mult">The multipliers board</button></div>`
    );
  const r = Rs[w.i],
    shown = w.pick != null,
    mx =
      Math.max.apply(
        null,
        r.opts.map(o => Math.abs(o.v))
      ) || 1;
  return (
    head("Guess which one wins", w.i + 1 + " of " + Rs.length) +
    `<div class="tile"><b>${r.t}</b><div class="small">${r.ask}</div></div><div class="stack" style="gap:6px">${r.opts.map(o => (shown ? `<div class="tile lvans ${r.ok.includes(o.k) ? "win" : ""}"><div class="row between" style="gap:8px"><b class="small">${o.n}${w.pick === o.k ? " (your pick)" : ""}</b><b>${o.v < 0 ? "costs " + money(Math.round(-o.v)) : "+" + money(Math.round(o.v))}</b></div><div class="bar" style="margin-top:5px"><i style="width:${Math.max(4, Math.round((Math.abs(o.v) / mx) * 100))}%"></i></div>${r.ok.includes(o.k) ? `<div class="tiny">${r.ok.length > 1 ? "A tie at the top" : "The biggest"}</div>` : ""}</div>` : `<button class="rowbtn" data-a="lvpick" data-v="${o.k}"><span><b>${o.n}</b></span><span class="caret">›</span></button>`)).join("")}</div>` +
    (shown
      ? `<div class="tile small"><b>${r.ok.includes(w.pick) ? "You called it." : "Most people guess that one."}</b> ${r.why}</div>` +
        mathBox(r.math.concat(["In today's dollars. A long-run average, not a promise."])) +
        `<button class="primary wide" data-a="lvnext">${w.i + 1 < Rs.length ? "Next" : "See what you saw"}</button>`
      : `<div class="tiny muted">Tap your guess. Nothing is lost for a miss.</div>`)
  );
}
Object.assign(ACT, {
  lever: () => {
    W = { kind: "lever", v: null };
    sheet(lvSheet);
  },
  lvopen: t => {
    const v = t.dataset.v;
    W = { kind: "lever", v, o: { amt: 300, lift: 5, odds: 0.5 } };
    sheet(lvSheet);
  },
  lvset: t => {
    if (!W || W.kind !== "lever" || !W.o) return;
    W.o[t.dataset.k] = +t.dataset.v;
    drawSheet();
  },
  lvgo: t => {
    const x = lvLevers(C(), D || derive(C())).find(o => o.k === t.dataset.v);
    if (!x || typeof ACT[x.a] !== "function") return;
    if (x.a === "mp") {
      closeSheet();
      MP = { r: x.id, t: null };
      go("map");
      return;
    }
    ACT[x.a]({ dataset: { v: x.v || "", l: x.l || "", id: x.id || "", k: "" } });
  },
  lvquiz: () => {
    W = { kind: "lvq", i: 0, pick: null, right: 0 };
    sheet(lvQuizSheet);
  },
  lvpick: t => {
    if (!W || W.kind !== "lvq" || W.pick != null) return;
    const r = lvRounds(C())[W.i];
    if (!r) return;
    W.pick = t.dataset.v;
    if (r.ok.includes(W.pick)) W.right++;
    drawSheet();
  },
  lvnext: () => {
    if (!W || W.kind !== "lvq") return;
    W.i++;
    W.pick = null;
    if (W.i >= lvRounds(C()).length && !G.demo) {
      const c = C();
      c.x = c.x || {};
      c.x.lvq = { n: W.right, of: W.i, d: todayISO() };
      save();
    }
    drawSheet();
  },
});
Object.assign(GLOSS, {
  lever: [
    "Lever",
    "One of the few big things you can change about your money: what you earn, what you spend, what debt costs you, how your money grows, the deals you take, and what you keep after taxes. Pulling the right one first moves everything else faster.",
  ],
});
if (typeof MENU !== "undefined" && Array.isArray(MENU) && !MENU.some(m => m[1] === "lever")) {
  const i = MENU.findIndex(m => m[1] === "quick");
  MENU.splice(i >= 0 ? i + 1 : MENU.length, 0, [
    "Which lever matters most",
    "lever",
    "act",
    "Earn, spend, debt, growth, deals, taxes: each in dollars a year",
  ]);
}
/* Part of msSide() in missions.js. Adds the mission "Guess which lever wins" until the player does the quiz. */
function msSideLever(out, c) {
  if (c.led && !(c.x && c.x.lvq))
    out.push({
      kind: "side",
      id: "lever:quiz",
      t: "Guess which lever wins",
      why: "Five quick guesses at your own age. Most people miss the first.",
      mins: 2,
      pay: "You will know which change is worth the most to you",
      unl: "Your own six levers, in dollars a year",
      a: "lvquiz",
      v: "",
    });
  return out;
}

if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
