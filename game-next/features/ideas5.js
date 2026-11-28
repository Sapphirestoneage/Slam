/* ============================================================================
   SLAM the Game: features/ideas5.js
   PURPOSE     Famous money ideas 46 to 63: mindset, time, family and giving. The same frame and rules
               as ideas.js.
   INPUT       The game: G.chars, G.demo. The taps of the player (the actions in OUTPUT).
   OUTPUT      2 functions. Actions (ACT): ighabit, igduke, igdate.
   DEPENDS ON  core/engine.js, screens/ui.js, core/metrics.js, features/people.js, features/csp.js,
               features/ideas.js, features/ideas3.js, features/ideas4.js.
   ========================================================================= */
function igBars(rows) {
  return rows
    .map(
      r =>
        `<div class="small row between"><span>${esc(r[0])}</span><span class="${r[3] ? "fkhot" : "muted"}">${esc(r[2])}</span></div><span class="cpbar"><i class="fill ${r[3] ? "hot" : ""}" style="width:${Math.max(4, Math.min(100, r[1] * 100))}%"></i></span>`
    )
    .join("");
}
/* ---------- 46. Brad Klontz ---------- */
const IG_SCRIPTS = [
  ["I would rather not look at my accounts.", "Avoidance"],
  ["People who have a lot of money probably did something wrong to get it.", "Avoidance"],
  ["I feel uneasy when I have more than I need.", "Avoidance"],
  ["More money would fix most of what worries me.", "Worship"],
  ["There will never be quite enough.", "Worship"],
  ["Buying something is how I cheer myself up.", "Worship"],
  ["What I own shows how well I am doing.", "Status"],
  ["I would rather look like I have money than talk about not having it.", "Status"],
  ["I feel left out when friends buy things I cannot.", "Status"],
  ["I always know what is in my accounts.", "Vigilance"],
  ["Spending on myself makes me a little anxious, even when I can afford it.", "Vigilance"],
  ["I do not tell people what I earn or have.", "Vigilance"],
];
const IG_SCRIPT_SAY = {
  Avoidance:
    "You may steer away from money, or feel you do not deserve it. A small weekly look at your numbers is the gentlest fix.",
  Worship:
    "You may be waiting for a number to make things feel okay. Name what the money is for, and check if some of it is available now.",
  Status:
    "What you have may be tied to how you see yourself. Try one month of spending only on what no one else will see.",
  Vigilance:
    "You are careful, and it has served you well. The risk is never enjoying it. Give yourself a fun amount that must be spent.",
};
igAdd({
  id: "klontz",
  grp: "mind",
  n: "Your money scripts",
  by: "Brad Klontz and Ted Klontz (the four money scripts)",
  one: "Beliefs about money you picked up as a kid still steer you. Find which one is loudest.",
  what: "His research groups our hidden money beliefs into four scripts: money avoidance, money worship, money status and money vigilance. Most people carry some of each. Knowing your loudest one explains a lot of your choices.",
  fit: (c, d) => true,
  body: x => {
    const q = { qs: IG_SCRIPTS, opts: IG_Q3 },
      z = igQz(x, q),
      top = z.all ? igTop(z.sc) : null;
    return {
      big: z.all ? "Loudest: money " + top.toLowerCase() : null,
      cap: z.all ? IG_SCRIPT_SAY[top] + " " + igI("ig_klontz") : "",
      html: z.all
        ? igBars(
            ["Avoidance", "Worship", "Status", "Vigilance"].map(k => [
              "Money " + k.toLowerCase(),
              z.sc[k] / 6,
              z.sc[k] + " of 6",
              false,
            ])
          )
        : `<div class="small">Twelve quick taps. No right answers, and nobody sees them but you.</div>`,
      quiz: q,
      math: z.all
        ? [
            "Three statements for each script",
            "Each answer scores 0, 1 or 2, so each script is out of 6",
            "The highest is your loudest. Ties go to the first one listed.",
          ]
        : null,
      note: "These twelve statements are the game's own. His research inventory is a different, longer set of questions.",
    };
  },
  val: x => {
    const z = igQz(x, { qs: IG_SCRIPTS });
    return z.all ? "Loudest: money " + igTop(z.sc).toLowerCase() : "";
  },
});
/* ---------- 47. Richard Thaler ---------- */
igAdd({
  id: "smart",
  grp: "mind",
  n: "Save More Tomorrow",
  by: "Richard Thaler and Shlomo Benartzi",
  one: "Promise today to save part of every future raise. Your paycheck never shrinks, and your savings rate climbs by itself.",
  what: "Their plan gets around the pain of saving more now: you agree in advance that each time you get a raise, part of it goes to savings. Take-home pay still goes up every time, just by a little less.",
  fit: (c, d) => c.work !== "Retired" && d.rate < 0.2,
  body: x => {
    const g = x.v("raise", 0.03),
      sh = x.v("share", 0.5),
      take = x.take,
      r0 = take > 0 ? x.kept / take : 0;
    let inc = take,
      sv = x.kept,
      r5 = 0,
      r10 = 0;
    for (let y = 1; y <= 10; y++) {
      const up = inc * g;
      inc += up;
      sv += up * sh;
      if (y === 5) r5 = sv / inc;
      if (y === 10) r10 = sv / inc;
    }
    return {
      big: igP(Math.max(0.01, r0)) + " → " + igP(r10) + " in 10 years",
      cap:
        "Your savings rate, if " +
        igP(sh) +
        " of every raise goes to savings. Your take-home pay to spend still rises every year. " +
        igI("ig_smart"),
      html: igRows([
        ["Today", igP(Math.max(0.01, r0))],
        ["In 5 years", igP(r5)],
        ["In 10 years", igP(r10)],
      ]),
      ins: [
        [
          "raise",
          "How big is a normal yearly raise for you?",
          "ig_smart",
          [
            [0.02, "2%"],
            [0.03, "3%"],
            [0.04, "4%"],
            [0.06, "6%"],
          ],
          0.03,
        ],
        [
          "share",
          "How much of each raise goes to savings?",
          "ig_smart",
          [
            [0.25, "A quarter"],
            [0.5, "Half"],
            [1, "All of it"],
          ],
          0.5,
        ],
      ],
      math: [
        "Today: you keep " + igM(x.kept) + " of " + igM(take) + " a month",
        "Each year: pay rises " + igP(g) + ", and " + igP(sh) + " of that raise is added to savings",
        "After 10 years: saving " + igM(sv) + " of " + igM(inc) + " a month = " + igP(r10),
      ],
      note: "It works best when it is automatic. If your job's retirement plan has an auto-increase setting, that is this idea with one switch.",
    };
  },
  val: x => "Half of every raise, saved",
});
/* ---------- 48. James Clear ---------- */
const IG_HABITS = [
  ["look", "Look at my accounts"],
  ["log", "Log what I spent"],
  ["cook", "Cook at home"],
  ["nospend", "Spend nothing extra"],
  ["move", "Move $5 to savings"],
  ["learn", "Learn one money thing"],
];
function igStreak(days, today) {
  let n = 0,
    miss = 0,
    d = today,
    first = true;
  for (let i = 0; i < 400; i++) {
    if (days[d]) {
      n++;
      miss = 0;
    } else if (first) {
    } else {
      miss++;
      if (miss >= 2) break;
    }
    first = false;
    d = igAddDays(d, -1);
  }
  return n;
}
igAdd({
  id: "clear",
  grp: "mind",
  n: "Never miss twice",
  by: "James Clear, Atomic Habits",
  one: "Missing one day is an accident. Missing two is the start of a new habit. So one miss does not break your streak here.",
  what: "His rule for keeping a habit alive: everyone slips, so the goal is never to slip twice in a row. This is a streak that forgives one missed day and only resets after two.",
  fit: (c, d) => true,
  body: x => {
    const h = (x.o.habit || [])[0],
      lab = h ? (IG_HABITS.find(r => r[0] === h) || ["", ""])[1] : "",
      days = x.o.days || {},
      t = todayISO(),
      n = igStreak(days, t),
      did = !!days[t];
    return {
      big: h ? Math.max(did ? 1 : 0, n) + (n === 1 ? " day" : " days") + (n > 0 ? " going" : "") : null,
      cap: h
        ? "Your habit: " +
          lab.toLowerCase() +
          ". One missed day keeps the streak. Two in a row starts it fresh, which is fine too. " +
          igI("ig_clear")
        : "",
      picks: ["habit", "Pick one small money habit.", "ig_clear", IG_HABITS, 1],
      after: h
        ? `<button class="${did ? "ghost" : "primary"} wide" data-a="ighabit">${did ? "Done today ✓ (tap to undo)" : "I did it today"}</button>`
        : "",
      math: h
        ? [
            "Count back from today, one day at a time",
            "A day you did it adds 1",
            "One missed day is skipped over",
            "Two missed days in a row end the count",
            "Today does not count as missed until it is over",
          ]
        : null,
      note: "The streak rule is the idea. The habit list is the game's own.",
    };
  },
  val: x => {
    const n = igStreak(x.o.days || {}, todayISO());
    return n ? n + " days going" : "";
  },
});
Object.assign(ACT, {
  ighabit: () => {
    if (!W || W.kind !== "ig") return;
    const o = igO(C(), W.id),
      t = todayISO();
    o.days = o.days || {};
    if (o.days[t]) delete o.days[t];
    else o.days[t] = true;
    save();
    render();
    drawSheet();
  },
});
/* ---------- 49. Hal Hershfield ---------- */
const IG_LETTER = [
  ["thanks", "Thank you for the money you set aside when it was hard."],
  ["sorry", "I am sorry for the years I did not think about you."],
  ["promise", "I promise to keep a little for you out of every paycheck."],
  ["ask", "Tell me what you wish I had started sooner."],
  ["hope", "I hope you are doing work you like, or none at all."],
  ["people", "I hope the people I love are still close to you."],
];
igAdd({
  id: "future",
  grp: "mind",
  n: "A letter to your future self",
  by: "Hal Hershfield, Your Future Self",
  one: "Most of us treat our future self like a stranger. Meet them, and saving for them gets easier.",
  what: "His research found that people who feel close to their future selves save more and choose better. Two of his tools: looking at an older version of yourself, and writing them a letter.",
  fit: (c, d) => c.work !== "Retired",
  body: x => {
    const at = x.v("at", 70),
      yrs = Math.max(0, at - x.age),
      fv = grow(x.inv, yrs, x.d.save),
      ini = String(x.c.name || "You")
        .split(/\s+/)
        .map(w => w[0] || "")
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      lines = (x.o.say || []).map(k => (IG_LETTER.find(r => r[0] === k) || ["", ""])[1]).filter(Boolean);
    return {
      big: "You, at " + at,
      cap:
        "The year is " +
        (new Date().getFullYear() + yrs) +
        ". On today's habits, you have about " +
        igM(fv) +
        " in today's dollars. " +
        igI("ig_future"),
      html: `<div class="igold"><span class="ava igava">${esc(ini)}</span><div class="small">${yrs} years from now. Same person. They are counting on what you do this year.</div></div>`,
      ins: [
        [
          "at",
          "Which you do you want to meet?",
          "ig_future",
          [
            [60, "At 60"],
            [70, "At 70"],
            [80, "At 80"],
          ],
          70,
        ],
      ],
      picks: ["say", "Your letter. Tap up to three lines to send.", "ig_future", IG_LETTER.map(r => [r[0], r[1]]), 3],
      after: lines.length
        ? `<div class="tile small"><b>Dear me at ${at},</b><br>${lines.map(esc).join("<br>")}<br><b>From me, today</b></div>`
        : "",
      math: [
        "Invested today: " + igM(x.inv),
        "Plus " + igM(x.d.save) + " kept each year, for " + yrs + " years, at 7% a year after inflation",
        "= " + igM(fv),
      ],
      note: "The letter lines are the game's own, so there is nothing to type.",
    };
  },
  val: x => "At 70 you could have about " + igM(grow(x.inv, Math.max(0, 70 - x.age), x.d.save)),
});
/* ---------- 50. Annie Duke ---------- */
igAdd({
  id: "duke",
  grp: "mind",
  n: "Was it a good decision, or a good result?",
  by: "Annie Duke, Thinking in Bets",
  one: "Judging a choice by how it turned out is called resulting. Separate the decision from the luck.",
  what: "She points out that good decisions can turn out badly and bad ones can turn out well. If you judge choices only by results, you learn the wrong lessons. Log how sure you were before, and how it went after.",
  fit: (c, d) => true,
  body: x => {
    const pr = x.o.proc,
      od = x.o.odds,
      rs = x.o.res,
      log = x.o.log || [],
      lab =
        pr && rs
          ? pr === "care"
            ? rs === "good"
              ? "Skill. A careful choice that worked."
              : "Bad luck. The choice was sound and it still went wrong."
            : rs === "good"
              ? "Good luck. It worked, but not because of how you chose."
              : "A lesson. The choice was rushed and it showed."
          : null,
      cnt = k => log.filter(l => l.k === k).length,
      called = log.filter(l => l.o >= 70),
      hit = called.filter(l => l.r === "good").length;
    return {
      big: lab ? lab.split(".")[0] : log.length ? log.length + " decisions logged" : null,
      cap: lab
        ? lab.split(". ").slice(1).join(". ") + " " + igI("resulting")
        : log.length
          ? "Skill " +
            cnt("skill") +
            " · bad luck " +
            cnt("badluck") +
            " · good luck " +
            cnt("luck") +
            " · lessons " +
            cnt("lesson") +
            ". " +
            igI("resulting")
          : "",
      html: !lab && !log.length ? `<div class="small">Think of one money choice you made. Three taps.</div>` : "",
      ins: [
        [
          "proc",
          "How did you make the choice?",
          "resulting",
          [
            ["care", "Carefully, with the facts I had"],
            ["rush", "In a hurry, or on a feeling"],
          ],
          null,
        ],
        [
          "odds",
          "How sure were you that it would work?",
          "resulting",
          [
            [50, "A coin flip"],
            [70, "Fairly sure"],
            [90, "Very sure"],
          ],
          null,
        ],
        [
          "res",
          "How did it turn out?",
          "resulting",
          [
            ["good", "Well"],
            ["bad", "Badly"],
          ],
          null,
        ],
      ],
      after:
        (lab && od ? `<button class="primary wide slim" data-a="igduke">Log this one and start another</button>` : "") +
        (called.length >= 3
          ? `<div class="tile small">When you were fairly or very sure, you were right ${hit} of ${called.length} times. If that is far below 7 in 10, be a little less sure next time. If it is far above, you can afford to be bolder.</div>`
          : ""),
      math: lab
        ? [
            "Careful + went well = skill",
            "Careful + went badly = bad luck",
            "Rushed + went well = good luck",
            "Rushed + went badly = a lesson",
          ]
        : null,
      note: "The four boxes are the game's wording for her idea.",
    };
  },
  val: x => ((x.o.log || []).length ? (x.o.log || []).length + " decisions logged" : ""),
});
Object.assign(ACT, {
  igduke: () => {
    if (!W || W.kind !== "ig") return;
    const o = igO(C(), W.id);
    if (!o.proc || !o.res || !o.odds) return;
    o.log = (o.log || [])
      .concat({
        d: todayISO(),
        o: o.odds,
        r: o.res,
        k: o.proc === "care" ? (o.res === "good" ? "skill" : "badluck") : o.res === "good" ? "luck" : "lesson",
      })
      .slice(-20);
    delete o.proc;
    delete o.odds;
    delete o.res;
    save();
    drawSheet();
  },
});
/* ---------- 51. Charlie Munger ---------- */
const IG_RUIN = [
  ["card", "Carry a balance on credit cards", "Pay the full statement every month, on autopay."],
  ["nocush", "Keep no cash for emergencies", "Hold a starter cushion before anything else."],
  ["onestock", "Put most of my money in one stock", "Own the whole market in an index fund."],
  ["cosign", "Co-sign a loan for someone", "Give what you can afford to lose, and sign nothing."],
  [
    "noins",
    "Skip insurance I cannot afford to go without",
    "Cover the things that would wipe you out: health, home, the car, your income.",
  ],
  ["creep", "Spend every raise", "Save part of each raise before it reaches your account."],
  ["hide", "Hide money problems from my partner", "A regular money date."],
  ["quick", "Chase something that promises to make me rich fast", "If you cannot explain how it makes money, pass."],
  ["nowill", "Leave no will and no named beneficiaries", "An afternoon of paperwork."],
  ["lev", "Borrow to invest", "Invest only money you own."],
];
igAdd({
  id: "munger",
  grp: "mind",
  n: "Inversion: how would I ruin myself?",
  by: "Charlie Munger",
  one: "Instead of asking how to get rich, ask what would wreck you, and do not do that.",
  what: "His habit of inverting a problem: list everything that would guarantee failure, then avoid those things. In money, avoiding the big losses matters more than finding the clever moves. Here it is a fire drill.",
  fit: (c, d) => true,
  body: x => {
    const c = x.c,
      picks = (x.o.ruin || []).map(k => IG_RUIN.find(r => r[0] === k)).filter(Boolean),
      live = [];
    if (c.high === "yes") live.push("card");
    if (x.cash < 1000) live.push("nocush");
    return {
      big: picks.length ? picks.length + (picks.length === 1 ? " way" : " ways") + " to ruin, flipped" : null,
      cap: picks.length ? "Each one turned around into a guard. " + igI("inversion") : "",
      picks: [
        "ruin",
        "If you wanted to wreck your finances, what would you do? Pick up to four.",
        "inversion",
        IG_RUIN.map(r => [r[0], r[1]]),
        4,
      ],
      html: picks.length
        ? igRows(
            picks.map(r => [
              "<b>" + esc(r[1]) + '</b><div class="tiny muted">The guard: ' + esc(r[2]) + "</div>",
              live.indexOf(r[0]) >= 0 ? "Live for you now" : "",
              live.indexOf(r[0]) >= 0,
            ])
          )
        : `<div class="small">A fire drill, backwards. Pick the surest ways to ruin yourself and the game turns each one into a guard.</div>`,
      math: picks.length
        ? [
            "Live for you now: the game sees high-interest debt, or less than $1,000 in cash, in your numbers",
            "Everything else is yours to judge",
          ]
        : null,
      note: "The list and the guards are the game's own.",
      links: [["Open the fire drills", "drills", ""]],
    };
  },
  val: x => ((x.o.ruin || []).length ? (x.o.ruin || []).length + " guards set" : ""),
});
/* ---------- 52. Tim Ferriss, fear-setting ---------- */
const IG_FEARS = {
  job: [
    "Losing my job",
    "A few months with no paycheck, cutting back hard, and feeling awful about it.",
    [
      ["cush", "Build cash for a few months of basics"],
      ["net", "Keep in touch with five people in my field"],
      ["skill", "Keep one skill current"],
    ],
    "Unemployment pay, a bridge job, a smaller budget for a while, and the people from the list above.",
  ],
  ask: [
    "Asking for a raise",
    "They say no and it is awkward for a week.",
    [
      ["facts", "Write down three things I did that made or saved money"],
      ["mkt", "Look up what the job pays elsewhere"],
      ["time", "Pick a moment right after a win"],
    ],
    "Ask what would get a yes in six months, and write it down. Nothing is lost.",
  ],
  quit: [
    "Leaving to start something",
    "It does not work, the savings run down, and I go back to a job.",
    [
      ["run", "Save a set number of months of costs first"],
      ["test", "Get one paying customer before I leave"],
      ["date", "Set a date to stop if it is not working"],
    ],
    "Go back to work with a better story than when I left. Most people can.",
  ],
  bill: [
    "A huge surprise bill",
    "Debt for a year or two, and a tight budget.",
    [
      ["cush", "A starter cushion"],
      ["ins", "Check what my insurance covers"],
      ["ask", "Know that most big bills can be negotiated or paid over time"],
    ],
    "A payment plan, asking for a lower total, and cutting back for a while.",
  ],
};
igAdd({
  id: "fearset",
  grp: "mind",
  n: "Fear-setting",
  by: "Tim Ferriss",
  one: "Write down the worst that could happen, how you would prevent it, and how you would recover. The fear usually shrinks.",
  what: "His exercise for decisions you keep putting off: define the worst case, list what would prevent it, list how you would repair it, then ask what doing nothing costs. Here it is a fire drill with four common money fears.",
  fit: (c, d) => true,
  body: x => {
    const k = x.o.fear,
      f = k ? IG_FEARS[k] : null,
      ck = x.o.ck || {},
      wait = x.o.wait;
    return {
      big: f ? esc(f[0]) : null,
      cap: f ? "The worst case, in plain words: " + esc(f[1]) + " " + igI("ig_fearset") : "",
      html: f ? "" : `<div class="small">Pick the one you have been putting off thinking about.</div>`,
      ins: [["fear", "Which fear?", "ig_fearset", Object.keys(IG_FEARS).map(q => [q, IG_FEARS[q][0]]), null]].concat(
        f
          ? [
              [
                "wait",
                "What does doing nothing cost you over the next six months?",
                "ig_fearset",
                [
                  ["none", "Nothing much"],
                  ["some", "Some money or sleep"],
                  ["lot", "A lot"],
                ],
                null,
              ],
            ]
          : []
      ),
      checks: f ? f[2].map(p => [k + "_" + p[0], "Prevent: " + p[1], ""]) : null,
      after: f
        ? `<div class="tile small"><b>Repair:</b> ${esc(f[3])}</div>${wait ? `<div class="tile small">${wait === "none" ? "Then there is no rush. You have looked at it, which is the point." : "Then waiting has a price too. Tick one prevent step this week."}</div>` : ""}`
        : "",
      math: f
        ? [
            "Define: the worst case, written down",
            "Prevent: what lowers the odds",
            "Repair: what you would do if it happened anyway",
            "Then: the cost of doing nothing",
          ]
        : null,
      note: "The fears, steps and wording are the game's own.",
      links: [["Open the fire drills", "drills", ""]],
    };
  },
});
/* ---------- 53. Sahil Bloom ---------- */
const IG_FIVE = [
  ["time", "Time: I decide how most of my hours are spent."],
  ["social", "Social: I have people I can call at 2 a.m."],
  ["mental", "Mental: I am learning, and I have room to think."],
  ["physical", "Physical: I move, sleep and eat in a way I would keep up."],
  ["money", "Financial: I have enough, and I know what enough is."],
];
igAdd({
  id: "bloom",
  grp: "mind",
  n: "Five types of wealth",
  by: "Sahil Bloom, The 5 Types of Wealth",
  one: "Money is one kind of wealth out of five. A life can be rich in one and broke in another.",
  what: "His scoreboard has five columns: time, social, mental, physical and financial wealth. The point is to stop measuring life by the one that is easiest to count.",
  fit: (c, d) => true,
  body: x => {
    const o = [
        [1, "1"],
        [2, "2"],
        [3, "3"],
        [4, "4"],
        [5, "5"],
      ],
      vals = IG_FIVE.map(r => [r, x.o[r[0]]]),
      done = vals.every(v => v[1] != null),
      low = done ? vals.slice().sort((a, b) => a[1] - b[1])[0][0] : null;
    return {
      big: done ? "Thinnest: " + low[1].split(":")[0].toLowerCase() : null,
      cap: done ? "That is where one more hour or dollar would do the most. " + igI("ig_bloom") : "",
      html: done
        ? igBars(vals.map(v => [v[0][1].split(":")[0], v[1] / 5, v[1] + " of 5", v[0] === low]))
        : `<div class="small">Five taps, 1 to 5. A 1 is "not at all" and a 5 is "fully".</div>`,
      ins: IG_FIVE.map(r => [r[0], r[1], "ig_bloom", o, null]),
      math: done ? ["Each one is your own 1 to 5", "The lowest is the one to feed first"] : null,
      note: "The five statements are the game's own.",
    };
  },
  val: x => "",
});
/* ---------- 54. Tony Robbins ---------- */
igAdd({
  id: "robbins",
  grp: "mind",
  n: "Five levels of financial dreams",
  by: "Tony Robbins, Money: Master the Game",
  one: "Freedom is not one number. There are five, and the first is closer than you think.",
  what: "He splits the goal into five levels: security (the basics covered for life), vitality (the basics plus half your fun), independence (your whole life today), freedom (today's life plus a few luxuries) and absolute freedom. Each one is a goal tier you can reach in turn.",
  fit: (c, d) => true,
  body: x => {
    const rows = cspRows(x.c),
      sum = f => rows.filter(f).reduce((t, r) => t + (+r.amt || 0), 0) * 12,
      need = sum(r => !/fun|everything else/i.test(r.k)),
      fun = sum(r => /fun|everything else/i.test(r.k)),
      lux = x.v("lux", 12000),
      T = [
        ["Security", "The basics, covered for life", need / SWR],
        ["Vitality", "Basics plus half your fun", (need + fun / 2) / SWR],
        ["Independence", "Your whole life as it is today", (need + fun) / SWR],
        ["Freedom", "Today's life plus a few luxuries", (need + fun + lux) / SWR],
        ["Absolute freedom", "Anything you want, when you want", ((need + fun + lux * 3) * 1.5) / SWR],
      ],
      have = x.inv,
      at = T.filter(t => have >= t[2]).length,
      nx = T[at];
    return {
      big: nx ? "Next: " + nx[0].toLowerCase() : "All five reached",
      cap:
        (nx
          ? "You need " + igM(nx[2]) + " invested for it, and you have " + igM(have) + "."
          : "You have passed every level.") +
        " " +
        igI("ig_robbins"),
      html: igRows(
        T.map((t, i) => [
          (i === at ? "<b>" : "") +
            (i + 1) +
            ". " +
            t[0] +
            (i === at ? "</b>" : "") +
            `<div class="tiny muted">${t[1]}</div>`,
          igM(t[2]) + (i < at ? " ✓" : ""),
        ])
      ),
      ins: [
        [
          "lux",
          "What would a few luxuries cost a year?",
          "ig_robbins",
          [
            [6000, "$6,000"],
            [12000, "$12,000"],
            [25000, "$25,000"],
            [50000, "$50,000"],
          ],
          12000,
        ],
      ],
      math: [
        "Basics a year: " + igM(need) + ". Fun a year: " + igM(fun),
        "Each level: the yearly cost ÷ 4%",
        "Security: " + igM(need) + " ÷ 4% = " + igM(need / SWR),
        "Independence: " + igM(need + fun) + " ÷ 4% = " + igM((need + fun) / SWR),
        "Absolute freedom is a rough stand-in: one and a half times the cost of today's life with three times the luxuries",
      ],
      note: "His levels are worked out line by line in the book. This uses your spending lines and the 4% rule to place them.",
    };
  },
  val: x => "Five goal tiers from your own spending",
});
/* ---------- 55. Buffett's two lists ---------- */
const IG_GOALS25 = [
  "Pay off all debt",
  "A full emergency fund",
  "Buy a home",
  "Max out retirement saving",
  "Start a business",
  "Change careers",
  "A big trip",
  "Go back to school",
  "Work fewer hours",
  "Have or adopt a child",
  "Help my parents",
  "Pay for a kid's college",
  "Move to a new city",
  "Give more away",
  "Get fit",
  "Learn a language",
  "Write or make something",
  "A newer car",
  "Fix up my home",
  "Retire early",
  "Take a sabbatical",
  "Build a side income",
  "Learn to invest",
  "Spend more time with friends",
  "Volunteer",
];
igAdd({
  id: "twolists",
  grp: "mind",
  n: "The two lists",
  by: "A story often told about Warren Buffett. Whether it happened is not confirmed.",
  one: "Pick your top five goals. The other twenty are not second place. They are the list to stay away from.",
  what: "As the story goes: write down 25 goals, circle the five that matter most, and treat the remaining 20 as things to avoid until the five are done, because they are the distractions most likely to steal your time.",
  fit: (c, d) => true,
  body: x => {
    const mine = (x.c.goals || []).map(g => g.n).filter(Boolean),
      all = mine.concat(IG_GOALS25.filter(g => mine.indexOf(g) < 0)).slice(0, 25),
      top = (x.o.top || []).filter(g => all.indexOf(g) >= 0);
    return {
      big: top.length ? top.length + " of 5 picked" : null,
      cap: top.length
        ? (top.length >= 5 ? "These five get your time and money. Everything else waits. " : "Keep going to five. ") +
          igI("ig_twolists")
        : "",
      picks: ["top", "Tap your five. Only five.", "ig_twolists", all.map(g => [g, g]), 5],
      after:
        top.length >= 5
          ? `<div class="tile small"><b>Your five:</b> ${top.map(esc).join(", ")}.<br><b>Stay away from, for now:</b> the other ${all.length - 5}. They are good things. That is what makes them dangerous.</div>`
          : "",
      math: top.length
        ? ["Your own goals come first in the list, then common ones, up to 25", "Picking a sixth drops your first pick"]
        : null,
      note: "Your goals from My Goals are in the list.",
      links: [["Open My Goals", "tab", "goals"]],
    };
  },
  val: x => ((x.o.top || []).length ? (x.o.top || []).length + " of 5 picked" : ""),
});
/* ---------- 56. Lynne Twist ---------- */
const IG_TWIST = [
  ["When I get more, the goalposts move.", "sc"],
  ["I compare what I have with what others have.", "sc"],
  ["I hold on tight to money in case it runs out.", "sc"],
  ["I can name three things I have enough of right now.", "su"],
  ["I use what I already have before I look for more.", "su"],
  ["Money I give or spend on what matters feels good, not scary.", "su"],
];
igAdd({
  id: "twist",
  grp: "mind",
  n: "Scarcity or sufficiency",
  by: "Lynne Twist, The Soul of Money",
  one: '"There is not enough" is a habit of mind, and so is "I have enough". Check which one is running today.',
  what: "She describes three myths of scarcity: there is not enough, more is better, and that is just the way it is. Her answer is sufficiency: noticing what is already enough and putting your attention there.",
  fit: (c, d) => true,
  body: x => {
    const q = { qs: IG_TWIST, opts: IG_Q3 },
      z = igQz(x, q),
      sc = z.sc.sc || 0,
      su = z.sc.su || 0;
    return {
      big: z.all
        ? su > sc
          ? "Leaning toward enough"
          : sc > su
            ? "Leaning toward not enough"
            : "Right in the middle"
        : null,
      cap: z.all
        ? (sc > su
            ? "That is normal, and it is loud for most people. One thing to try today: name one thing you have enough of."
            : "Good. Keep feeding it: name one thing you have enough of today.") +
          " " +
          igI("ig_twist")
        : "",
      html: z.all
        ? igBars([
            ["Not enough", sc / 6, sc + " of 6", false],
            ["Enough", su / 6, su + " of 6", false],
          ])
        : `<div class="small">A six-tap check-in. Do it whenever money feels tight in your head.</div>`,
      quiz: q,
      math: z.all
        ? ["Three statements lean toward not enough, three toward enough", "Each answer scores 0, 1 or 2"]
        : null,
      note: "The six statements are the game's own. This is a check-in, so the answer can change day to day.",
    };
  },
});
/* ---------- 57. Oliver Burkeman ---------- */
igAdd({
  id: "weeks",
  grp: "time",
  n: "Four thousand weeks",
  by: "Oliver Burkeman, Four Thousand Weeks",
  one: "A long life is about four thousand weeks. You will not get to everything, so choose.",
  what: "His starting point: if you live to 80 you get roughly 4,000 weeks. You cannot do it all, and trying to is the trap. Seeing the number is meant to free you to pick what matters, not to scare you.",
  fit: (c, d) => true,
  body: x => {
    const to = x.v("to", x.c.death || 90),
      age = x.age,
      left = Math.max(0, (to - age) * 52),
      lived = age * 52;
    return {
      big: left.toLocaleString() + " weeks left",
      cap:
        "If you live to " +
        to +
        ". You have lived about " +
        lived.toLocaleString() +
        ". Each square below is one year. " +
        igI("ig_weeks"),
      html: `<div class="wkgrid">${Array.from({ length: to }, (_, i) => `<i class="${i < age ? "d" : i === age ? "n" : ""}"></i>`).join("")}</div><div class="row between tiny muted"><span>Filled: lived</span><span>Outlined: this year</span><span>Empty: ahead</span></div>`,
      ins: [
        [
          "to",
          "Live to what age?",
          "ig_weeks",
          [
            [80, "80"],
            [90, "90"],
            [100, "100"],
          ],
          x.c.death || 90,
        ],
      ],
      math: [
        "Weeks in a year: 52",
        "Lived: " + age + " × 52 = " + lived.toLocaleString(),
        "Left: (" + to + " − " + age + ") × 52 = " + left.toLocaleString(),
        "80 years × 52 = 4,160, which is where the title comes from",
      ],
      note: "Nobody knows their number. This is here to help you choose, not to rush you.",
      links: [["See what your hours are worth", "hrs", ""]],
    };
  },
  val: x => Math.max(0, ((x.c.death || 90) - x.age) * 52).toLocaleString() + " weeks to " + (x.c.death || 90),
});
/* ---------- 58. Tim Urban ---------- */
igAdd({
  id: "tailend",
  grp: "time",
  n: "The tail end",
  by: "Tim Urban, Wait But Why",
  one: "You may have already had most of your time with the people you love. Count the visits that are left.",
  what: "His essay counts life in events instead of years. If you see your parents a few times a year, the number of visits left is small enough to count. Seeing the number changes what a visit is worth.",
  fit: (c, d) => true,
  body: x => {
    const P = (x.c.party || [])
        .map((p, i) => [String(i), typeof ppName === "function" ? ppName(x.c, i) : p.n || p.k])
        .slice(0, 8),
      who = x.o.who,
      name =
        who != null && P.find(p => p[0] === String(who)) ? P.find(p => p[0] === String(who))[1] : "Someone you love",
      their = x.v("their", 65),
      per = x.v("per", 4),
      left = Math.max(0, (90 - their) * per),
      more = x.v("more", 2),
      cost = x.v("trip", 300);
    return {
      big: left + " visits left",
      cap:
        "With " +
        esc(name) +
        ", if they live to 90 and you keep seeing them " +
        per +
        " times a year. " +
        more +
        " more visits a year would make it " +
        (90 - their) * (per + more) +
        ", for about " +
        igM(more * cost) +
        " a year. " +
        igI("ig_tailend"),
      ins: (P.length ? [["who", "Who?", "ig_tailend", P, null]] : []).concat([
        [
          "their",
          "How old are they?",
          "ig_tailend",
          [
            [50, "50"],
            [60, "60"],
            [65, "65"],
            [70, "70"],
            [75, "75"],
            [80, "80"],
            [85, "85"],
          ],
          65,
        ],
        [
          "per",
          "How many times a year do you see them?",
          "ig_tailend",
          [
            [1, "Once"],
            [2, "Twice"],
            [4, "4 times"],
            [12, "Monthly"],
            [52, "Weekly"],
          ],
          4,
        ],
        [
          "more",
          "How many more visits a year could you add?",
          "ig_tailend",
          [
            [1, "1"],
            [2, "2"],
            [4, "4"],
          ],
          2,
        ],
        [
          "trip",
          "What does one visit cost you?",
          "ig_tailend",
          [
            [0, "Nothing"],
            [100, "$100"],
            [300, "$300"],
            [800, "$800"],
          ],
          300,
        ],
      ]),
      math: [
        "Years left with them: 90 − " + their + " = " + Math.max(0, 90 - their),
        "× " + per + " visits a year = " + left,
        "With " + more + " more a year: " + Math.max(0, 90 - their) * (per + more),
        "Cost: " +
          more +
          " × " +
          igM(cost) +
          " = " +
          igM(more * cost) +
          " a year, which is " +
          igM((more * cost) / 12) +
          " a month",
      ],
      note: "90 is a round number, not a prediction. The people come from Your people when you have added them.",
      links: [["Safe to spend?", "safe", ""]],
    };
  },
  val: x => "Count the visits left with someone you love",
});
/* ---------- 59. Ron Lieber ---------- */
const IG_KIDTALK = [
  ["why", "Tell them one thing you chose not to buy this week, and why", ""],
  ["want", "Ask what they are saving for, and help them find the price", ""],
  ["give", "Let them pick where the Give jar goes", ""],
  ["wait", 'When they ask for something, say "that is a Spend jar thing" instead of yes or no', ""],
  ["ask", 'Answer one money question honestly, including "how much do you make" in a way that fits their age', ""],
];
igAdd({
  id: "lieber",
  grp: "family",
  n: "Allowance in three jars",
  by: "Ron Lieber, The Opposite of Spoiled",
  one: "Allowance is for practice with money, not pay for chores. Split it into Spend, Save and Give.",
  what: "His approach: give kids a regular allowance so they can practice choosing, keep it separate from chores, split it three ways, and answer their money questions honestly. Kids who talk about money at home grow up better with it.",
  fit: (c, d) => c.deps === "Kids",
  body: x => {
    const age = x.v("age", 8),
      rate = x.v("rate", 1),
      split = String(x.v("split", "40-40-20")).split("-").map(Number),
      wk = age * rate,
      j = split.map(p => (wk * p) / 100);
    return {
      big: "$" + wk.toFixed(2) + " a week",
      cap:
        "For a " +
        age +
        "-year-old. Spend $" +
        j[0].toFixed(2) +
        ", Save $" +
        j[1].toFixed(2) +
        ", Give $" +
        j[2].toFixed(2) +
        ". That is " +
        igM(wk * 52) +
        " a year. " +
        igI("ig_lieber"),
      html: `<div class="igthree">${["Spend", "Save", "Give"].map((n, i) => `<div class="tile"><div class="tiny muted">${n}</div><b>$${j[i].toFixed(2)}</b><div class="tiny muted">${split[i]}%</div></div>`).join("")}</div><div class="small"><b>Five talks to have</b></div>`,
      checks: IG_KIDTALK,
      ins: [
        ["age", "How old is the kid?", "ig_lieber", [4, 6, 8, 10, 12, 14, 16].map(a => [a, String(a)]), 8],
        [
          "rate",
          "How much for each year of age, a week?",
          "ig_lieber",
          [
            [0.5, "50 cents"],
            [1, "$1"],
            [2, "$2"],
          ],
          1,
        ],
        [
          "split",
          "How is it split?",
          "ig_lieber",
          [
            ["40-40-20", "40 · 40 · 20"],
            ["50-40-10", "50 · 40 · 10"],
            ["34-33-33", "Even thirds"],
          ],
          "40-40-20",
        ],
      ],
      math: [
        age + " years × $" + rate + " = $" + wk.toFixed(2) + " a week",
        "× 52 = " + igM(wk * 52) + " a year",
        "Split " + split.join(" · "),
      ],
      note: "Fifty cents to a dollar a week for each year of age is a common starting point. The five talks are the game's own wording. The game has no kids mode yet, so this lives here for parents.",
    };
  },
  val: x => "An 8-year-old at $1 a year of age: $8 a week",
});
/* ---------- 60. Money dates ---------- */
const IG_DATE = [
  ["good", "Each person says one money thing that went well", ""],
  ["look", "Look at the numbers together: what came in, what went out", ""],
  ["one", "Pick one thing to change before next time", ""],
  ["dream", "Spend five minutes on something you are saving for", ""],
  ["fun", "End with something nice. That is why it is called a date", ""],
];
igAdd({
  id: "moneydate",
  grp: "family",
  n: "Money dates",
  by: "A long-standing practice, made popular by Tori Dunlap (Her First $100K) and others",
  one: "A regular, short, pleasant meeting about money with the people you share it with. Or with yourself.",
  what: "A money date is a set time to look at your money together, with snacks. Short, regular and friendly beats long, rare and tense. It works for couples, for households of three or more, and solo.",
  fit: (c, d) => true,
  due: (c, o) => !!o.next && o.next <= todayISO(),
  body: x => {
    const n = x.o.n || 0,
      next = x.o.next,
      t = todayISO(),
      ppl = G.demo ? 1 : G.chars.length,
      due = next && next <= t;
    return {
      big: next ? (due ? "Your money date is due" : "Next one: " + next) : "No date set yet",
      cap:
        (n ? "You have had " + n + ". " : "") +
        (ppl > 1 ? "There are " + ppl + " people in this game, so everyone gets a turn on step 1. " : "") +
        "About 20 minutes. " +
        igI("ig_moneydate"),
      checks: IG_DATE,
      after: `<div class="small"><b>${next ? "Finished this one? Set the next." : "When is the first one?"}</b></div><div class="chips">${[
        [7, "In a week"],
        [14, "In two weeks"],
        [30, "In a month"],
      ]
        .map(o => `<button class="chip" data-a="igdate" data-v="${o[0]}">${o[1]}</button>`)
        .join(
          ""
        )}</div>${next ? `<button class="ghost wide slim" data-a="igclear" data-k="next">Stop reminding me</button>` : ""}`,
      math: [
        "The next date is today plus the number of days you tap",
        "When it comes due it shows on Next Steps",
        "Setting the next one clears the five ticks",
      ],
      note: "The five steps are the game's own.",
    };
  },
  val: x => (x.o.next ? "Next one: " + x.o.next : ""),
});
Object.assign(ACT, {
  igdate: t => {
    if (!W || W.kind !== "ig") return;
    const o = igO(C(), W.id);
    if (o.next) o.n = (o.n || 0) + 1;
    o.next = igAddDays(todayISO(), +t.dataset.v || 14);
    delete o.ck;
    save();
    render();
    drawSheet();
  },
});
/* ---------- 62. Donor-advised fund bunching ---------- */
igAdd({
  id: "daf",
  grp: "family",
  n: "Bunching your giving",
  by: "A tax-planning approach used by many advisors, built on the donor-advised fund",
  one: "Give two years of donations in one year, so that year's deductions clear the standard deduction.",
  what: "Most people take the standard deduction, so their giving does not lower their tax. Bunching puts two or more years of giving into one year, often through a donor-advised fund that pays the charities out over time. You itemize in the big year and take the standard deduction in the others.",
  fit: (c, d) => d.era >= 5,
  body: x => {
    const two = x.v("who", x.two ? "two" : "one") === "two",
      sd = two ? IG_TAX.sd.two : IG_TAX.sd.one,
      small = two ? 2000 : 1000,
      give = x.v("give", 5000),
      other = x.v("other", 10000),
      tr = x.v("tax", 0.22),
      agi = knNet(x.c).gross * 12,
      floor = agi * 0.005,
      item = g => other + Math.max(0, g - floor),
      yearly = Math.max(sd + Math.min(give, small), item(give)),
      A = yearly * 2,
      B = Math.max(sd, item(give * 2)) + sd,
      gain = Math.max(0, B - A),
      save = gain * tr;
    return {
      big: save > 0 ? igM(save) + " less tax over two years" : "No gain from bunching here",
      cap:
        "Giving " +
        igM(give) +
        " a year, next to giving " +
        igM(give * 2) +
        " every other year. " +
        igI("bunching") +
        (save <= 0 ? " Your other deductions are too small, or already big enough, for it to matter." : ""),
      html: igRows([
        ["Give every year: deductions over 2 years", igM(A)],
        ["Bunch: deductions over 2 years", igM(B)],
        ["Extra deducted", igM(gain)],
      ]),
      ins: [
        [
          "who",
          "Who files?",
          "stdded",
          [
            ["one", "Just me"],
            ["two", "Married, filing together"],
          ],
          x.two ? "two" : "one",
        ],
        [
          "give",
          "How much do you give in a year?",
          "bunching",
          [
            [2000, "$2,000"],
            [5000, "$5,000"],
            [10000, "$10,000"],
            [20000, "$20,000"],
          ],
          5000,
        ],
        [
          "other",
          "Other deductions you could itemize (state and local tax, mortgage interest)",
          "bunching",
          [
            [5000, "$5,000"],
            [10000, "$10,000"],
            [15000, "$15,000"],
            [25000, "$25,000"],
            [40000, "$40,000"],
          ],
          10000,
        ],
        [
          "tax",
          "Your top tax rate",
          "taxrate",
          [
            [0.12, "12%"],
            [0.22, "22%"],
            [0.24, "24%"],
            [0.32, "32%"],
          ],
          0.22,
        ],
      ],
      math: [
        "2026 standard deduction: " + igM(sd),
        "New for 2026: without itemizing you can still deduct up to " +
          igM(small) +
          " of cash gifts made straight to charities",
        "New for 2026: when you itemize, only giving above 0.5% of your income counts. For you that is " + igM(floor),
        "Every year: the better of " +
          igM(sd + Math.min(give, small)) +
          " or " +
          igM(item(give)) +
          ", twice = " +
          igM(A),
        "Bunched: the better of " +
          igM(sd) +
          " or " +
          igM(item(give * 2)) +
          ", plus " +
          igM(sd) +
          " the next year = " +
          igM(B),
        "Extra × " + igP(tr) + " = " + igM(save),
      ],
      note: "A rough comparison. Gifts into a donor-advised fund do not count for the small no-itemizing deduction, which this allows for. Talk to a tax pro before moving real money.",
    };
  },
  val: x => "See if giving every other year would lower your tax",
});
/* ---------- 63. Custodial Roth IRA ---------- */
igAdd({
  id: "kidroth",
  grp: "family",
  n: "A kid's first job, at 65",
  by: "The custodial Roth IRA, a long-standing favorite of the FIRE community",
  one: "Money a teenager earns can go into a Roth IRA and grow untaxed for fifty years.",
  what: "A child with earned income can have a Roth IRA that a parent or guardian manages for them. The amount is small. The time is enormous. This shows what a few summers of work could be worth when the kid is 65.",
  fit: (c, d) => c.deps === "Kids",
  body: x => {
    const start = x.v("start", 14),
      per = x.v("per", 3000),
      n = x.v("yrs", 4),
      put = per * n,
      at = grow(0, n, per),
      fv = at * Math.pow(1 + R, Math.max(0, 65 - start - n));
    return {
      big: igM(fv) + " at 65",
      cap:
        igM(per) +
        " a year for " +
        n +
        " years, starting at " +
        start +
        ". Only " +
        igM(put) +
        " goes in. In today's dollars. " +
        igI("ig_kidroth"),
      html: igRows([
        ["Put in", igM(put)],
        ["Worth when the last dollar goes in, at " + (start + n), igM(at)],
        ["Worth at 65", `<b>${igM(fv)}</b>`],
        fv >= 1000000
          ? ["A million by 65", "<b>Yes</b>"]
          : ["To reach a million by 65", "about " + igM((per * 1000000) / fv) + " a year"],
      ]),
      ins: [
        [
          "start",
          "How old when they start?",
          "ig_kidroth",
          [
            [10, "10"],
            [12, "12"],
            [14, "14"],
            [16, "16"],
          ],
          14,
        ],
        [
          "per",
          "How much goes in each year?",
          "ig_kidroth",
          [
            [1000, "$1,000"],
            [3000, "$3,000"],
            [5000, "$5,000"],
            [7500, "$7,500"],
          ],
          3000,
        ],
        [
          "yrs",
          "For how many years?",
          "ig_kidroth",
          [
            [2, "2"],
            [4, "4"],
            [6, "6"],
            [8, "8"],
          ],
          4,
        ],
      ],
      math: [
        igM(per) + " × " + n + " years = " + igM(put) + " put in",
        "Growing 7% a year after inflation while it goes in: " + igM(at),
        "Then left alone for " + Math.max(0, 65 - start - n) + " more years: " + igM(fv),
        "The kid can only put in as much as they earned from work that year, up to the yearly limit (" +
          igM(ROTH) +
          " in 2026)",
      ],
      note: "The money has to come from real work with a record of it: a job, babysitting, mowing lawns. A parent can give them the money to put in, as long as the kid earned at least that much. The game has no kids mode yet, so this lives here for parents.",
    };
  },
  val: x => "$3,000 a year for 4 summers could be " + igM(grow(0, 4, 3000) * Math.pow(1 + R, 47)) + " at 65",
});
Object.assign(GLOSS, {
  resulting: [
    "Resulting",
    "Judging a decision by how it turned out, instead of by how well it was made with what you knew then.",
  ],
  inversion: ["Inversion", "Solving a problem backwards: work out what would cause failure, then avoid it."],
  bunching: [
    "Bunching",
    "Grouping two or more years of a deductible cost, like giving, into one tax year, so that year's total clears the standard deduction.",
  ],
});
