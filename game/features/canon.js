/* ============================================================================
   SLAM the Game: features/canon.js
   PURPOSE     Eli's frameworks and the canon (run "Not built, groups 1 to 5", Part 4). Eight famous money
               ideas in the frame of ideas.js: the SWAN number, the Second Mouse checklist, the Trust
               Framework, the Advice translator, the Baby Steps, the wealth stages, Die With Zero (time
               buckets and the designed week) and the net worth peak. Your Money or Your Life as one path
               of nine steps, with the steps 1a, 4, 5, 6, 7 and 9. The stackable quick wins as a list to
               tick. The one line of the next dollar at the top of Home.
   INPUT       The profile: c.spend, c.take, c.inv, c.debts, c.hist, c.spends, c.age, c.death, c.x.ig (the
               answers of the ideas), c.x.fw (the path, the steps, the wins, the buckets). The open sheet
               (W.kind): ymoyl, ymstep, fwwins.
   OUTPUT      Math readers: fwNow, fwBabyOf, fwStepOf, fwNextDollarLine, fwPathOf, fwWinsOf, fwBook. Parts of functions in
               other files: homeNextDollar (home in ui.js). Sheets: fwPathSheet, fwStepSheet, fwWinsSheet.
               Actions (ACT): ymoyl, ymstep, ym1a, ym4, ym5, ym6, ym7, ym9, fwset, fwdone, fwwins,
               fwwin, fwsave, fwbk. Menu: "Your Money or Your Life", "Quick wins".
   DEPENDS ON  core/frameworks.js (the math, one file with the web app), core/withdraw.js, core/trip.js,
               core/engine.js (derive, timeLedger, hoursOf, SWR, R), screens/ui.js, screens/dash.js (the
               kit), features/ideas.js (igAdd, igCtx, igM, igP, igI, igRows), features/nextacct.js
               (nxaCalc), features/roof.js (RF_LIST), features/slept.js, features/xray.js.
   RULES       Taps only. A number from a guess is grey and gets no verdict. No red. The named frameworks
               from books are told in the game's own words, with the source named. A missing step of the
               path says it comes soon; it never shows a broken screen.
   ========================================================================= */
/* ---------- the readers: the profile to the plain numbers of core/frameworks.js ---------- */
function fwX(c) {
  c.x = c.x || {};
  c.x.fw = c.x.fw || {};
  return c.x.fw;
}
/* The numbers every framework reads. cash and the debt the way derive() counts them. */
function fwNow(c, d) {
  d = d || derive(c);
  const debts = c.led ? (c.debts || []).filter(x => (+x.amt || 0) > 0) : [],
    home = debts.filter(x => /mortgage/i.test(x.k || "")),
    other = c.led
      ? debts.filter(x => !/mortgage/i.test(x.k || "")).reduce((t, x) => t + (+x.amt || 0), 0)
      : c.debt || 0;
  return {
    cash: d.cash || 0,
    debt: other,
    mortgage: home.length ? home.reduce((t, x) => t + (+x.amt || 0), 0) : c.home === "Owning" ? null : 0,
    monthly: c.spend || 0,
    kept: Math.max(0, (c.take || 0) - (c.spend || 0)),
    worth: d.nw,
    wage: timeLedger(c, d).wage,
    real: !!c.led && isSharp(c, "take") && isSharp(c, "spend"),
  };
}
function fwBabyOf(c, o) {
  const N = fwNow(c),
    kids = /kid/i.test(c.deps || "");
  return fwBabySteps({
    cash: N.cash,
    debt: N.debt,
    monthly: N.monthly,
    retireShare: o.retire != null ? +o.retire : null,
    kids,
    college: kids ? (o.college === "yes" ? true : o.college === "no" ? false : null) : null,
    mortgage: N.mortgage != null ? N.mortgage : o.paid === "yes" ? 0 : o.paid === "no" ? 1 : null,
  });
}
/* The FOO step of the game's next row (which account next). */
function fwStepOf(c) {
  try {
    const K = nxaCalc(c);
    return { step: FW_NEXT_STEP[K.next.k] || null, row: K.next, K };
  } catch (e) {
    report(e, "canon.js: fwStepOf");
    return { step: null, row: null, K: null };
  }
}
/* ---------- the one line of the next dollar ---------- */
/* The line "Your next dollar: ..." for this profile, or null. results.js shows it under "Why this one" of Your next
   win on Home. */
function fwNextDollarLine(c) {
  const S = fwStepOf(c);
  if (!S.row) return null;
  const r = S.row,
    m = S.K.rows.find(x => x.k === "match"),
    left = r.step ? r.need - r.put : r.cap === Infinity ? null : r.cap - r.put;
  return fwNextDollar({
    kind: r.k,
    left,
    perMonth: !r.step,
    matchLeft: m && !m.full && !m.off ? m.roomY : null,
    money,
  });
}
/* Part of home() in ui.js. Adds one line under the tab title: where the next dollar goes, the match included. With
   the four cards of results first (results.js) the line is inside Your next win, so this adds nothing. */
function homeNextDollar(h) {
  try {
    const c = C();
    if (!c || !(c.placed || G.demo)) return h;
    const line = fwNextDollarLine(c);
    if (!line) return h;
    const top = '<div class="hqtop">';
    if (h.indexOf(top) < 0) return h;
    const row = `<button class="rowbtn fwnext" data-a="nxa"><span style="min-width:0"><b>${esc(line)}</b></span><span class="fkgo">See the order</span></button>`;
    /* inside the top block of Home (ux.js), so "Show less" keeps it with the stat row */
    return h.replace(top, () => top + row);
  } catch (e) {
    report(e, "canon.js: homeNextDollar");
    return h;
  }
}
/* ---------- eight famous money ideas, in the frame of ideas.js ---------- */
igAdd({
  id: "swan",
  grp: "spend",
  n: "The SWAN number",
  by: "Eli, SLAM. SWAN: sleep well at night",
  one: "The cash that lets you sleep at night. Your own line, not a rule.",
  what: "Some cash is not about a rule of thumb. It is the amount that lets you stop checking the balance. Set it as months of what you must spend, plus the one big bill you worry about.",
  fit: (c, d) => d.era <= 6,
  body: x => {
    const S = fwSwan({ monthly: x.c.spend, months: x.v("months", 3), worry: x.v("worry", 0), cash: x.cash });
    if (!S.ready) return { cap: "Add what you spend in a month and this fills in." };
    return {
      big: igM(S.number),
      cap:
        S.gap > 0
          ? "You have " + igM(S.have) + ", " + igP(S.share) + " of it. " + igM(S.gap) + " more and you are there."
          : "Your cash covers it, with " + igM(S.have - S.number) + " on top.",
      html: igRows([
        [S.months + " months of " + igM(S.monthly), igM(S.monthly * S.months)],
        ["The bill you worry about", igM(S.worry)],
        ["Your number", `<b>${igM(S.number)}</b>`],
      ]),
      ins: [
        ["months", "How many months of spending let you sleep?", "", FW_SWAN_MONTHS.map(m => [m, String(m)]), 3],
        ["worry", "One big bill you worry about", "", [0, 500, 1000, 2500, 5000].map(v => [v, v ? igM(v) : "None"]), 0],
      ],
      math: [
        igM(S.monthly) + " a month x " + S.months + " = " + igM(S.monthly * S.months),
        "+ " + igM(S.worry) + " = " + igM(S.number),
        "Cash today: " + igM(S.have),
      ],
      note: "It does not change the cushion steps. It is how much calm costs you, and you choose it.",
      links: [["Which account next", "nxa", ""]],
    };
  },
  val: x => {
    const S = fwSwan({ monthly: x.c.spend, months: x.v("months", 3), worry: x.v("worry", 0), cash: x.cash });
    return S.ready ? igM(S.number) : "";
  },
});
igAdd({
  id: "mouse",
  grp: "deals",
  n: "The Second Mouse",
  by: "Eli, SLAM",
  one: "The second mouse gets the cheese. Let others find the catch in a bonus, then go in knowing it.",
  what: "Bank bonuses and card offers pay well and have traps: a missed date, a fee, a credit check at the wrong time. The informed player reads what others reported, reads the terms, and goes in with a checklist.",
  fit: (c, d) => d.era >= 1,
  body: x => {
    const T = fwTicks(FW_MOUSE, x.o.ck || {});
    return {
      big: T.all ? "Ready to play" : T.done + " of " + T.total,
      cap: T.all
        ? "Every step is ticked. Go in knowing the terms."
        : "Tick each step before you open the offer. A step can be undone.",
      checks: FW_MOUSE,
      math: [
        "Ticked: " + T.done + " of " + T.total,
        "Each step is a tap and can be undone. Nothing here is a number about you.",
      ],
      links: [
        ["The bank bonus queue", "idea", "doc"],
        ["What your points are really worth", "idea", "rrv"],
      ],
    };
  },
  val: x => fwTicks(FW_MOUSE, x.o.ck || {}).done + " of " + FW_MOUSE.length + " ticked",
});
igAdd({
  id: "trust",
  grp: "mind",
  n: "The Trust Framework",
  by: "Eli, SLAM",
  one: "Three questions before you follow money advice: done it, gain, fit.",
  what: "Has the person giving the advice done it themselves? What do they gain if you follow it? Does it fit you: your stage, your numbers, your values? Advice can be true and still not be right for you now.",
  fit: (c, d) => true,
  body: x => {
    const T = fwTrust({ done: x.o.done, gain: x.o.gain, fit: x.o.fit });
    return {
      big: T.ready ? T.ok + " of 3 check out" : T.answered + " of 3 answered",
      cap: fwTrustWords(T),
      ins: FW_TRUST.map(t => [t.id, t.q, "", t.opts, null]),
      html: T.open.length
        ? igRows(T.rows.filter(r => !r.ok).map(r => ["Ask: " + esc(r.ask), r.a == null ? "Not answered" : "Open"]))
        : "",
      math: [
        "Answers that check out: " + T.ok + " of 3",
        "Done it: yes. Gain: nothing, or a flat fee you pay. Fit: yes.",
        "Each other answer is a question to ask first.",
      ],
      note: "When the gain is a share of your money, fees decide a lot over the years. The Fee X-ray shows it.",
      links: [["Open the Fee X-ray", "xray", ""]],
    };
  },
  val: x => {
    const T = fwTrust({ done: x.o.done, gain: x.o.gain, fit: x.o.fit });
    return T.answered ? T.ok + " of 3 check out" : "";
  },
});
igAdd({
  id: "advice",
  grp: "mind",
  n: "The Advice translator",
  by: "Eli, SLAM",
  one: "Popular advice, sorted by where you are: what fits now, what fit before, what comes later.",
  what: "Most money advice is right at one stage and not at another. The translator reads the famous rules at your step: the ones for now, the ones you already passed, the ones for later, and the one to unlearn now.",
  fit: (c, d) => true,
  body: x => {
    const S = fwStepOf(x.c),
      T = S.step ? fwTranslate(S.step, FW_UNLEARN, FW_ORDER) : { ready: false };
    if (!T.ready) return { cap: "Add your numbers in My Money and this fills in." };
    const list = (t, L) =>
      L.length
        ? `<div class="small"><b>${t} (${L.length})</b></div>` +
          igRows(
            L.map(e => [
              '"' + esc(e.advice) + '"' + `<div class="tiny muted">It fits at ${esc(e.rightWords)}.</div>`,
              "",
            ])
          )
        : "";
    return {
      big: esc(FW_STEP_HEAD[T.step] || ""),
      cap: "Where your next dollar goes says where you are. " + T.now.length + " fit now.",
      html:
        (T.unlearn
          ? `<div class="banner small"><b>To unlearn now: "${esc(T.unlearn.advice)}"</b><div class="tiny">${esc(T.unlearn.line)}</div></div>`
          : "") +
        list("Fits you now", T.now) +
        list("Fit you before", T.before) +
        list("For later", T.later),
      math: [
        "Your next dollar goes to: " + S.row.n,
        "That is the step: " + (FW_STEP_HEAD[T.step] || ""),
        "Each piece of advice lists the steps where it fits. Before: every one of them is earlier. Later: every one is later.",
      ],
      links: [["Which account next", "nxa", ""]],
    };
  },
  val: x => {
    const S = fwStepOf(x.c);
    return S.step ? "Now: " + (FW_STEP_HEAD[S.step] || "") : "";
  },
});
igAdd({
  id: "baby",
  grp: "spend",
  n: "The Baby Steps",
  by: "Dave Ramsey, The Total Money Makeover",
  one: "Seven steps in order, next to the game's own order.",
  what: "His seven steps: $1,000 for a starter fund, every debt but the house, 3 to 6 months saved, 15% of income for retirement, college for the kids, the home paid off early, then build wealth and give. The game's order agrees on most and differs on the match, which debts come first, and the size of the fund.",
  fit: (c, d) => d.era <= 6,
  body: x => {
    const B = fwBabyOf(x.c, x.o),
      S = fwStepOf(x.c),
      kids = /kid/i.test(x.c.deps || "");
    const word = (s, i) =>
      s.skip
        ? "No kids"
        : s.done === true
          ? "Done"
          : s.done == null
            ? "Tap below"
            : i === B.here
              ? "You are here"
              : "Ahead";
    const ins = [
      [
        "retire",
        "Of your pay, how much goes to retirement?",
        "",
        [
          [0, "None"],
          [0.05, "5%"],
          [0.1, "10%"],
          [0.15, "15%"],
          [0.2, "20% or more"],
        ],
        null,
      ],
    ];
    if (kids)
      ins.push([
        "college",
        "Is college for the kids on track?",
        "",
        [
          ["yes", "Yes"],
          ["no", "Not yet"],
        ],
        null,
      ]);
    if (fwNow(x.c).mortgage == null)
      ins.push([
        "paid",
        "Is your home paid off?",
        "",
        [
          ["yes", "Yes"],
          ["no", "Not yet"],
        ],
        null,
      ]);
    return {
      big: B.here == null ? "Tap below" : B.here >= 6 ? "Step 7" : "Baby Step " + (B.here + 1),
      cap:
        B.here == null
          ? "A few taps place you."
          : "Next to the game's order: your next dollar goes to " +
            (S.row ? S.row.n.toLowerCase() : "your next step") +
            ".",
      html: igRows(
        B.steps.map((s, i) => [
          s.n + ". " + esc(s.name) + `<div class="tiny muted">${esc(s.slam)}</div>`,
          word(s, i),
          i === B.here,
        ])
      ),
      ins,
      math: [
        "Step 1: cash of " + igM(FW_BABY_RULES.starter) + " or more",
        "Step 2: every debt but the home at $0",
        "Step 3: cash of " + FW_BABY_RULES.monthsLow + " months of spending or more",
        "Step 4: " + igP(FW_BABY_RULES.retireShare) + " of pay to retirement or more",
        "The first step not done is where you are.",
      ],
      links: [["Which account next", "nxa", ""]],
    };
  },
  val: x => {
    const B = fwBabyOf(x.c, x.o);
    return B.here == null ? "" : B.here >= 6 ? "Step 7" : "Baby Step " + (B.here + 1);
  },
});
igAdd({
  id: "stages",
  grp: "build",
  n: "The wealth stages",
  by: "Scott Trench, Set for Life",
  one: "The first $25,000, then $100,000, then past it, and the moves that matter at each.",
  what: "Each stage has its own best moves. Early, cutting the three biggest costs matters most. In the middle, raising income does. Past $100,000, the money itself starts doing the heavy lifting.",
  fit: (c, d) => c.work !== "Retired",
  body: x => {
    const N = fwNow(x.c),
      S = fwWealthStage({ worth: N.worth, monthly: N.kept });
    if (!S.ready) return { cap: "Add your numbers in My Money and this fills in." };
    return {
      big: esc(S.stage.name),
      cap:
        S.to == null
          ? "You are past $100,000 of net worth."
          : igM(S.left) +
            " to " +
            igM(S.to) +
            (S.months != null ? ", about " + S.months + " months at what you keep." : "."),
      html:
        (S.to != null ? dkProgress(S.share * 100, { text: "Of " + igM(S.to) }) : "") +
        igRows(S.stage.moves.map(m => [esc(m), ""])),
      math: [
        "Net worth: " + igM(N.worth),
        "Lines: " + igM(FW_K25) + " and " + igM(TP_RULES.k100) + " (the $100k stage of the journey)",
        S.left != null && S.months != null ? igM(S.left) + " / " + igM(N.kept) + " a month, before growth" : "",
      ],
      links: [
        ["The first $25,000", "idea", "trench"],
        ["Trips and the journey", "trips", "journey"],
      ],
    };
  },
  val: x => {
    const S = fwWealthStage({ worth: fwNow(x.c).worth, monthly: 0 });
    return S.ready ? S.stage.name : "";
  },
});
igAdd({
  id: "dwz",
  grp: "time",
  n: "Time buckets and the designed week",
  by: "Bill Perkins, Die With Zero",
  one: "Put the experiences you want into the decades they fit, and the hours you want into your week.",
  what: "Some experiences have a window: a strong body, small kids, parents who can still travel. Plan them by decade instead of by someday. The designed week does the same for your 168 hours.",
  tabs: [
    ["buckets", "Time buckets"],
    ["week", "The designed week"],
  ],
  fit: (c, d) => true,
  body: (x, tab) => {
    const F = fwX(x.c);
    if (tab === "week") {
      const h = hoursOf(x.c),
        h168 =
          (x.c.x && x.c.x.ig && x.c.x.ig.hours168) ||
          {} /* the answers of 168 hours (ideas4.js), else its typical values */,
        have = {
          sleep: (h168.sleep != null ? +h168.sleep : 7) * 7,
          work: h.w + h.cm,
          care: h168.chores != null ? +h168.chores : 14,
          people: null,
          body: null,
          make: null,
        },
        want = F.week || {},
        Wk = fwWeek({ have, want });
      return {
        big: Wk.fits ? Wk.left + " hours left to place" : Wk.wanted - 168 + " hours over 168",
        cap: "The week you want, next to the week you have. Tap the hours for each.",
        html:
          `<div class="stack" style="gap:6px">` +
          Wk.rows
            .map(
              r =>
                `<div class="small"><b>${esc(r.n)}</b>${r.have != null ? ` <span class="tiny muted">now about ${r.have}</span>` : ""}</div><div class="chips">${[
                  0, 5, 10, 20, 40, 49,
                ]
                  .map(
                    v =>
                      `<button class="chip ${want[r.id] === v ? "on" : ""}" data-a="fwset" data-k="week.${r.id}" data-v="${v}" aria-pressed="${want[r.id] === v}">${v}</button>`
                  )
                  .join("")}</div>`
            )
            .join("") +
          `</div>`,
        math: ["A week: 168 hours", "Placed: " + Wk.wanted, "168 - " + Wk.wanted + " = " + Wk.left],
        note: "The week you have uses your work hours and the 168 hours idea. Change one thing at a time.",
        links: [["168 hours", "idea", "hours168"]],
      };
    }
    const B = fwBuckets({ age: x.c.age, endAge: x.c.death || 90, items: F.buckets || [] });
    if (!B.ready) return { cap: "Add your age and this fills in." };
    const open = F.bk != null ? F.bk : B.buckets[0].b;
    return {
      big: B.full + " of " + B.buckets.length + " decades planned",
      cap: B.total ? igM(B.total) + " of experiences, in today's dollars." : "Tap a decade, then what you want in it.",
      html:
        `<div class="stack" style="gap:6px">` +
        B.buckets
          .map(
            k =>
              `<button class="rowbtn ${k.b === open ? "on" : ""}" data-a="fwbk" data-v="${k.b}" aria-expanded="${k.b === open}"><span><b>Ages ${k.from} to ${k.to}</b> <span class="tiny muted">${k.items.length ? k.items.map(t => esc((FW_BUCKET_KINDS.find(q => q[0] === t.k) || [0, t.k])[1])).join(", ") : "Nothing yet"}</span></span><span class="fkgo">${k.total ? igM(k.total) : k.b === open ? "Hide" : "Plan"}</span></button>` +
              (k.b === open
                ? `<div class="chips">${FW_BUCKET_KINDS.map(q => {
                    const on = k.items.some(t => t.k === q[0]);
                    return `<button class="chip ${on ? "on" : ""}" data-a="fwset" data-k="bucket.${k.b}" data-v="${q[0]}" aria-pressed="${on}">${esc(q[1])}${on ? " ✕" : ""}</button>`;
                  }).join("")}</div>${k.items
                    .map(
                      t =>
                        `<div class="small">${esc((FW_BUCKET_KINDS.find(q => q[0] === t.k) || [0, t.k])[1])}: about how much?</div><div class="chips">${[
                          500, 2000, 5000, 15000,
                        ]
                          .map(
                            v =>
                              `<button class="chip ${t.cost === v ? "on" : ""}" data-a="fwset" data-k="cost.${k.b}.${t.k}" data-v="${v}" aria-pressed="${t.cost === v}">${igM(v)}</button>`
                          )
                          .join("")}</div>`
                    )
                    .join("")}`
                : "")
          )
          .join("") +
        `</div>`,
      math: [
        "A bucket is " + FW_BUCKET_YEARS + " years of your life, from your age to " + (x.c.death || 90),
        "Each cost is your own tap, in today's dollars",
        "Together: " + igM(B.total),
      ],
      links: [["When should my net worth peak?", "idea", "peak"]],
    };
  },
  val: x => {
    const B = fwBuckets({ age: x.c.age, endAge: x.c.death || 90, items: fwX(x.c).buckets || [] });
    return B.ready ? B.full + " of " + B.buckets.length + " decades planned" : "";
  },
});
igAdd({
  id: "peak",
  grp: "stop",
  n: "The net worth peak",
  by: "Bill Perkins, Die With Zero",
  one: "The age when what you have can pay for the rest of your life. From there, spend down on purpose.",
  what: "Saving forever leaves money you never got to use. Die With Zero asks you to plan the year your net worth stops growing, and to start using it on purpose from there.",
  fit: (c, d) => c.age >= 25,
  body: x => {
    const end = x.v("end", x.c.death || 90),
      leave = x.v("leave", 0),
      P = fwPeak({
        age: x.c.age,
        worth: Math.max(0, x.d.nw),
        saveYear: x.kept * 12,
        growth: R,
        spendYear: x.S,
        endAge: end,
        leave,
      });
    if (!P.ready) return { cap: "Add your age and what you spend, and this fills in." };
    return {
      big: P.peakAge == null ? "Not before " + end : P.now ? "Now" : "Age " + P.peakAge,
      cap:
        P.peakAge == null
          ? "On these numbers it never grows enough to pay the rest of your life by itself."
          : (P.now ? "What you have " : "At about " + igM(P.peak) + ", it ") +
            "can pay about " +
            igM(P.canSpend) +
            " a year until " +
            end +
            ".",
      html:
        P.path.length > 1
          ? dkArea(
              P.path.map(p => p.worth),
              { labels: ["Now", P.peakAge ? "Age " + P.peakAge : ""], label: "Net worth to the peak" }
            )
          : "",
      ins: [
        ["end", "Plan for it to last until", "", [85, 90, 95, 100].map(a => [a, String(a)]), x.c.death || 90],
        [
          "leave",
          "Leave to others at the end",
          "",
          [0, 100000, 250000, 500000].map(a => [a, a ? igM(a) : "Nothing"]),
          0,
        ],
      ],
      math: [
        "Each year: what you have x " + (1 + R) + " + " + igM(x.kept * 12) + " saved",
        "The peak: the first age when the spend-down payment to " + end + " covers " + igM(x.S) + " a year",
        "The payment is the Die With Zero spend-down of Compare the ways, at " + igP(R) + " after inflation",
      ],
      links: [["Compare the ways", "takeout", "compare"]],
    };
  },
  val: x => {
    const P = fwPeak({
      age: x.c.age,
      worth: Math.max(0, x.d.nw),
      saveYear: x.kept * 12,
      growth: R,
      spendYear: x.S,
      endAge: x.c.death || 90,
    });
    return P.ready && P.peakAge != null ? "Peak at about " + P.peakAge : "";
  },
});
["swan", "mouse", "trust", "advice", "baby", "stages", "dwz", "peak"].forEach(id => {
  GLOSS["ig_" + id] = [IG[id].n, IG[id].what + " From: " + IG[id].by + "."];
});
/* ---------- Your Money or Your Life, the nine steps as one path ---------- */
function fwPathOf(c) {
  const F = fwX(c),
    done = Object.assign({}, F.ymDone || {}),
    built = {};
  FW_YMOYL.forEach(s => {
    built[s.id] = s.act === "ym1b" || typeof ACT[s.act] === "function";
  });
  if (fwLifetime([F.y1a || {}]).ready) done["1a"] = true;
  return fwYmoylPath(done, built);
}
function fwPathSheet() {
  const c = C(),
    P = fwPathOf(c);
  return (
    head("Your Money or Your Life", "The nine steps") +
    dkCaption("Vicki Robin and Joe Dominguez's nine steps, in order, on your numbers") +
    dkStatRow([
      dkTile("Steps done", P.done + " of " + P.total, { sub: "Step 1 has two parts, 1a and 1b" }),
      dkTile("Next", P.next ? "Step " + P.next : "All done"),
    ]) +
    dkCard(
      "The path",
      `<div class="stack" style="gap:6px">${P.steps
        .map(
          s =>
            `<button class="rowbtn ${s.id === P.next ? "on" : ""}" data-a="${s.built ? "ymstep" : "ymsoon"}" data-v="${s.id}"><span style="min-width:0"><b>${s.id}. ${esc(s.n)}</b><div class="tiny muted">${esc(s.what)}</div></span><span class="fkgo">${s.done ? "Done ✓" : s.built ? (s.id === P.next ? "Next" : "Open") : "Soon"}</span></button>`
        )
        .join("")}</div>`,
      { cap: "Each step opens its own screen. Mark a step done when you have done it." }
    ) +
    `<div class="tiny muted">Their ideas, in the game's words. Nobody listed here made or backs this game.</div>`
  );
}
/* One step. Steps that live on a screen of their own (2, 8) open it. */
function fwStepSheet() {
  const c = C(),
    d = derive(c),
    F = fwX(c),
    id = W.id,
    s = FW_YMOYL.find(q => q.id === id) || FW_YMOYL[0],
    N = fwNow(c, d);
  let body = "";
  if (id === "1a") {
    const y = F.y1a || {},
      L = fwLifetime([{ years: y.years, pay: y.pay, hours: hoursOf(c).w }]);
    body =
      dkCard(
        "Your answers",
        fwChips("Years you have worked", "y1a.years", [1, 3, 5, 10, 15, 20, 30, 40], y.years, v => String(v)) +
          fwChips(
            "Your pay in an average year, before taxes",
            "y1a.pay",
            [20000, 35000, 50000, 75000, 100000, 150000],
            y.pay,
            v => money(v)
          )
      ) +
      (L.ready
        ? dkStatRow([
            dkTile("Every dollar you have earned", money(Math.round(L.total)), {
              guess: true,
              sub: "Over " + L.years + " years",
            }),
            dkTile(
              "Hours of your life",
              L.hours != null ? Math.round(L.hours).toLocaleString("en-US") : "Add your hours",
              {
                guess: true,
                sub: L.perHour != null ? money(Math.round(L.perHour)) + " an hour before taxes" : "",
              }
            ),
          ]) +
          mathBox([
            "Years x pay a year = " + money(Math.round(L.total)),
            "Hours: years x " + hoursOf(c).w + " a week x 52",
          ])
        : `<div class="small muted">Tap both and the total shows.</div>`) +
      `<div class="tiny muted">Next, the book asks what you have to show for it: your net worth (step 1b).</div>`;
  } else if (id === "4") {
    const cats = (c.spends || []).filter(x => (+x.amt || 0) > 0),
      A = F.ym4 || {},
      T = fwThreeQ(
        cats.map(x => ({ k: x.k, amt: +x.amt, a: A[x.k] || [] })),
        N.wage
      ),
      open = F.ym4open || (cats[0] && cats[0].k),
      Q = [
        "Did it bring joy for the life it cost?",
        "Does it fit your values?",
        "Would it change if you did not work?",
      ];
    body =
      dkStatRow([
        dkTile("Categories marked", T.marked + " of " + T.rows.length),
        dkTile("With a minus", T.minus.length ? money(Math.round(T.minusAmt)) + " a month" : "None yet"),
      ]) +
      dkCard(
        "Three questions for each category",
        `<div class="stack" style="gap:6px">${T.rows
          .map((r, i) => {
            const on = r.k === open,
              a = A[r.k] || [];
            return (
              `<button class="rowbtn ${on ? "on" : ""}" data-a="fwset" data-k="ym4open" data-v="${esc(r.k)}" aria-expanded="${on}"><span><b>${esc(r.k)}</b> <span class="tiny muted">${money(Math.round(r.amt))} a month${r.hours != null ? ", " + Math.round(r.hours) + " hours of work" : ""}</span></span><span class="fkgo">${r.marked === 3 ? a.join(" ") : r.marked + " of 3"}</span></button>` +
              (on
                ? Q.map(
                    (q, j) =>
                      `<div class="small">${esc(q)}</div><div class="chips">${FW_MARKS.map(m => `<button class="chip ${a[j] === m[0] ? "on" : ""}" data-a="fwset" data-k="ym4.${i}.${j}" data-v="${m[0]}" aria-pressed="${a[j] === m[0]}">${m[0]} ${m[1]}</button>`).join("")}</div>`
                  ).join("")
                : "")
            );
          })
          .join("")}</div>`,
        { cap: "Plus, minus, or even. There is no wrong answer." }
      );
  } else if (id === "5") {
    const Wl = fwWall(c.hist || []);
    body = Wl.ready
      ? dkCard(
          "Income and spending, month by month",
          dkBars(
            Wl.months.slice(-12).map(m => ({ l: m.m.slice(5), v: [Math.max(0, m.take), Math.max(0, m.spend)] })),
            ["Money in", "Money out"]
          ) + `<div class="small">Last month you kept ${money(Math.round(Wl.gapNow))}.</div>`,
          { cap: "The book's wall chart: watch the two lines move apart." }
        )
      : dkCard(
          "The wall chart",
          `<div class="small muted">It fills in as the months go by. Each month you check in adds a point.</div>`
        );
  } else if (id === "6") {
    const A = F.ym4 || {},
      cats = (c.spends || []).filter(x => (A[x.k] || []).includes("-")),
      cut = F.ym6 || {},
      tot = cats.reduce((t, x) => t + (+cut[x.k] || 0), 0),
      Fr = fwFreed(tot, N.wage);
    body =
      (Fr
        ? dkStatRow([
            dkTile("Freed a month", money(Fr.month)),
            dkTile("Hours of work freed", Fr.hours != null ? Math.round(Fr.hours) + " a month" : "Add your hours"),
          ])
        : "") +
      (cats.length
        ? cats
            .map((x, i) =>
              dkCard(
                x.k,
                igRows(FW_LOWER[fwLowerKind(x.k)].map(t => [esc(t), ""])) +
                  fwChips("A cut you could make, a month", "ym6." + i, [0, 25, 50, 100, 200], cut[x.k], v => money(v))
              )
            )
            .join("")
        : dkCard(
            "Lower your spending",
            `<div class="small muted">Mark the categories in step 4 first. The ones with a minus show here.</div><button class="ghost wide slim" data-a="ymstep" data-v="4">Open step 4</button>`
          ));
  } else if (id === "7") {
    const up = F.ym7 != null ? F.ym7 : null,
      h = hoursOf(c),
      Rz = fwRaise({ wage: N.wage, hoursMonth: ((h.w + h.cm) * 52) / 12, up });
    body =
      dkStatRow([
        dkTile("Your real hourly wage", N.wage > 0 ? money(Math.round(N.wage * 100) / 100) : "Add your hours", {
          guess: !N.real,
        }),
        dkTile("More a month", Rz.ready ? money(Math.round(Rz.month)) : "Tap below"),
      ]) +
      dkCard(
        "Value your hours",
        fwChips("Dollars more for each hour", "ym7", FW_RAISE_UPS, up, v => "+" + money(v)) +
          igRows(FW_RAISE_IDEAS.map(t => [esc(t), ""]))
      ) +
      `<button class="ghost wide slim" data-a="hrs">Your work hours</button>`;
  } else if (id === "9") {
    const S9 = fwStep9({ invested: c.inv || 0, cash: N.cash, monthly: c.spend, rate: SWR });
    body = S9.ready
      ? dkStatRow([
          dkTile("Capital pays a month", money(Math.round(S9.income)), {
            sub: igP(Math.min(9.99, S9.share)) + " of what life costs",
          }),
          dkTile("The cushion", S9.cushionLeft ? money(Math.round(S9.cushionLeft)) + " to go" : "Full", {
            sub: FW_CUSHION_MONTHS + " months of spending",
          }),
          dkTile("Cash for what wears out", money(Math.round(S9.cache || 0))),
        ]) +
        dkCard(
          "Capital, cushion, cash",
          dkProgress(Math.min(100, S9.share * 100), { text: "Your capital's income, next to what life costs" }) +
            mathBox([
              "Invested " +
                money(c.inv || 0) +
                " x " +
                igP(SWR, 1) +
                " / 12 = " +
                money(Math.round(S9.income)) +
                " a month",
              "Cushion: " + FW_CUSHION_MONTHS + " x " + money(c.spend) + " = " + money(S9.cushion),
            ])
        )
      : dkCard(
          "Managing your money",
          `<div class="small muted">Add what you spend and have invested in My Money.</div>`
        );
  }
  const done = !!(F.ymDone || {})[id];
  return (
    head("Your Money or Your Life", "Step " + s.id + ": " + esc(s.n)) +
    dkCaption(s.what) +
    body +
    `<button class="${done ? "ghost" : "primary"} wide slim" data-a="fwdone" data-v="${id}">${done ? "Done ✓ (tap to undo)" : "I did this step"}</button><button class="ghost wide slim" data-a="ymoyl">All nine steps</button>`
  );
}
function fwChips(label, key, opts, cur, show) {
  return `<div class="small"><b>${esc(label)}</b></div><div class="chips">${opts.map(v => `<button class="chip ${cur === v ? "on" : ""}" data-a="fwset" data-k="${key}" data-v="${v}" aria-pressed="${cur === v}">${esc(show(v))}</button>`).join("")}</div>`;
}
/* ---------- the stackable quick wins ---------- */
function fwWinsOf(c) {
  return fwWins(fwX(c).wins || {}, derive(c).fiSpend || null);
}
function fwWinsSheet() {
  const c = C(),
    w = fwX(c).wins || {},
    T = fwWinsOf(c);
  return (
    head("Quick wins", "Small fixes that stack") +
    dkCaption("Tick each one you do. Tap what it saved, and they add up.") +
    dkStatRow([
      dkTile("Done", T.done + " of " + T.total),
      dkTile("Saved a month", money(T.month)),
      dkTile("A year", money(T.year)),
      dkTile("Days of freedom a year", T.fiDays != null ? String(Math.round(T.fiDays)) : "Add your spending"),
    ]) +
    dkCard(
      "The list",
      `<div class="stack" style="gap:6px">${FW_WINS.map(([id, n]) => {
        const on = !!(w[id] && w[id].done);
        return (
          `<button class="rowbtn igck ${on ? "on" : ""}" data-a="fwwin" data-v="${id}" aria-pressed="${on}"><span><b>${esc(n)}</b></span><span class="fkgo">${on ? "Done ✓" : "Mark done"}</span></button>` +
          (on
            ? `<div class="chips">${FW_WIN_SAVES.map(v => `<button class="chip ${w[id].save === v ? "on" : ""}" data-a="fwsave" data-k="${id}" data-v="${v}" aria-pressed="${w[id].save === v}">${v ? money(v) + " a month" : "Nothing"}</button>`).join("")}</div>`
            : "")
        );
      }).join("")}</div>`,
      { cap: T.unpriced ? T.unpriced + " done with no amount yet: tap what each saved." : "" }
    ) +
    mathBox([
      "Each amount is your own tap",
      "A year: " + money(T.month) + " x 12 = " + money(T.year),
      "Days of freedom: a year saved / a day of spending",
    ]) +
    `<div class="tiny muted">Brad Barrett of ChooseFI calls these quick wins: small moves that each save a little and stack.</div>`
  );
}
/* ---------- the spreadsheet of the plan ---------- */
function fwBook(c) {
  const d = derive(c),
    N = fwNow(c, d),
    o = (c.x && c.x.ig && c.x.ig.swan) || {},
    mo = o.months != null ? +o.months : 3,
    wo = o.worry != null ? +o.worry : 0,
    T = fwWinsOf(c),
    rows = [
      { id: "fw_spend", label: "What you spend in a month", v: c.spend || 0, note: "Your number" },
      {
        id: "fw_months",
        label: "Months that let you sleep",
        v: mo,
        note: o.months != null ? "Your answer" : "Typical (3)",
      },
      { id: "fw_worry", label: "The one big bill you worry about", v: wo, note: "Your answer" },
      {
        id: "fw_swan",
        label: "The SWAN number",
        v: fwSwan({ monthly: c.spend || 0, months: mo, worry: wo }).number || 0,
        f: "={fw_spend}*{fw_months}+{fw_worry}",
      },
      { id: "fw_wins", label: "Quick wins: saved a month", v: T.month, note: "The amounts you tapped, added up" },
      { id: "fw_winsy", label: "Quick wins: saved a year", v: T.year, f: "={fw_wins}*12" },
    ];
  return { title: "Frameworks: the SWAN number and the quick wins", rows };
}
/* ---------- the actions ---------- */
Object.assign(ACT, {
  ymoyl: () => {
    W = { kind: "ymoyl" };
    sheet(fwPathSheet);
  },
  ymstep: t => {
    const id = t.dataset.v,
      s = FW_YMOYL.find(q => q.id === id);
    if (!s) return;
    if (["1b", "2", "3", "8"].includes(id) && typeof ACT[s.act] === "function")
      return ACT[s.act](t); /* meters.js: 1b and 3 */
    if (s.act === "ym1b") return go("money");
    W = { kind: "ymstep", id };
    sheet(fwStepSheet);
  },
  ymsoon: () => soonShow(),
  ym1a: () => ACT.ymstep({ dataset: { v: "1a" } }),
  ym4: () => ACT.ymstep({ dataset: { v: "4" } }),
  ym5: () => ACT.ymstep({ dataset: { v: "5" } }),
  ym6: () => ACT.ymstep({ dataset: { v: "6" } }),
  ym7: () => ACT.ymstep({ dataset: { v: "7" } }),
  ym9: () => ACT.ymstep({ dataset: { v: "9" } }),
  fwset: t => {
    const c = C(),
      F = fwX(c),
      k = t.dataset.k,
      raw = t.dataset.v,
      v = raw !== "" && isFinite(+raw) ? +raw : raw,
      p = k.split(".");
    const flip = (o, key) => {
      if (o[key] === v) delete o[key];
      else o[key] = v;
    };
    if (p[0] === "y1a") flip((F.y1a = F.y1a || {}), p[1]);
    else if (p[0] === "week") flip((F.week = F.week || {}), p[1]);
    else if (p[0] === "ym4open") F.ym4open = F.ym4open === v ? null : v;
    else if (p[0] === "ym4") {
      const cat = (c.spends || []).filter(x => (+x.amt || 0) > 0)[+p[1]];
      if (!cat) return;
      F.ym4 = F.ym4 || {};
      const a = (F.ym4[cat.k] = F.ym4[cat.k] || [null, null, null]);
      a[+p[2]] = a[+p[2]] === v ? null : v;
    } else if (p[0] === "ym6") {
      const A = F.ym4 || {},
        cat = (c.spends || []).filter(x => (A[x.k] || []).includes("-"))[+p[1]];
      if (!cat) return;
      flip((F.ym6 = F.ym6 || {}), cat.k);
    } else if (p[0] === "ym7") F.ym7 = F.ym7 === v ? null : v;
    else if (p[0] === "bucket") {
      const b = +p[1],
        L = (F.buckets = F.buckets || []),
        i = L.findIndex(q => q.b === b && q.k === v);
      if (i >= 0) L.splice(i, 1);
      else L.push({ b, k: v, cost: null });
    } else if (p[0] === "cost") {
      const it = (F.buckets || []).find(q => q.b === +p[1] && q.k === p[2]);
      if (it) it.cost = it.cost === v ? null : v;
    }
    save();
    drawSheet();
  },
  fwbk: t => {
    const F = fwX(C()),
      v = +t.dataset.v;
    F.bk = F.bk === v ? null : v;
    save();
    drawSheet();
  },
  fwdone: t => {
    const F = fwX(C()),
      id = t.dataset.v;
    F.ymDone = F.ymDone || {};
    if (F.ymDone[id]) delete F.ymDone[id];
    else F.ymDone[id] = todayISO();
    save();
    drawSheet();
  },
  fwwins: () => {
    W = { kind: "fwwins" };
    sheet(fwWinsSheet);
  },
  fwwin: t => {
    const F = fwX(C()),
      id = t.dataset.v;
    F.wins = F.wins || {};
    if (F.wins[id] && F.wins[id].done) delete F.wins[id];
    else F.wins[id] = { done: todayISO(), save: null };
    save();
    drawSheet();
  },
  fwsave: t => {
    const F = fwX(C()),
      w = (F.wins || {})[t.dataset.k],
      v = +t.dataset.v;
    if (!w) return;
    w.save = w.save === v ? null : v;
    save();
    drawSheet();
  },
});
if (typeof RF_LIST !== "undefined") {
  RF_LIST.push(
    {
      g: "time",
      n: "Your Money or Your Life, all nine steps",
      by: "Vicki Robin and Joe Dominguez, Your Money or Your Life",
      one: "The nine steps in order, as one path, on your numbers.",
      a: "ymoyl",
    },
    {
      g: "spend",
      n: "Stackable quick wins",
      by: "Brad Barrett, ChooseFI",
      one: "Small fixes that each save a little. Tick them and they add up.",
      a: "fwwins",
    }
  );
}
if (typeof MENU !== "undefined" && Array.isArray(MENU)) {
  if (!MENU.some(m => m[1] === "ymoyl"))
    MENU.push(["Your Money or Your Life", "ymoyl", "act", "The nine steps as one path, on your numbers"]);
  if (!MENU.some(m => m[1] === "fwwins"))
    MENU.push(["Quick wins", "fwwins", "act", "Small fixes that stack, as a list to tick"]);
}
Object.assign(GLOSS, {
  scr_ymoyl: [
    "Your Money or Your Life",
    "The nine steps of the book by Vicki Robin and Joe Dominguez, in order, each on your numbers.",
  ],
  scr_fwwins: ["Quick wins", "Small fixes that each save a little. Tick each one you do and tap what it saved."],
});
