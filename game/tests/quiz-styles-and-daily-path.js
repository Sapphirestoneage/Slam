/* ============================================================================
   SLAM the Game, test: tests/quiz-styles-and-daily-path.js
   PURPOSE     Examine Part 6 of the run "Finish everything partly built" (Quizzes): the new skins
               (Money Scripts, the Enneagram solo, the FIRE Community Quiz, the picture quiz, the trait
               percents, Quantum Collapse) on the one engine, the percent bars and the spectrums on the
               card, the picture tiles, the meter and the measured order of Quantum Collapse, the daily
               question that routes by the latest quiz result, the daily lesson path for the player
               (Duolingo mode) ordered by that result, privacy for a coach, and the built list row.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: core/quizcore.js, data/quizskins.js, features/quizzes.js,
               features/kids.js, data/kidlessons.js, features/games2.js (dqSheet).
   ========================================================================= */
{
  const fs = require("fs"),
    path = require("path"),
    lib = JSON.parse(fs.readFileSync(path.join(GAME_DIR, "..", "data", "library", "skills.json"), "utf8")),
    n0 = G.chars.length,
    act0 = G.active,
    a = Object.assign(newChar(), { name: "Sol", led: true, placed: true, age: 34, take: 4200, spend: 3100 });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  save();
  go("home");
  const c = C(),
    DASH = String.fromCharCode(0x2014),
    BLAME = /mistake|failed|behind|off track/i,
    every = (def, v) => Object.fromEntries(def.questions.map(q => [q.id, v])),
    take = (id, v) => {
      X("qzopen", id);
      X("qzgo");
      const def = qzSkin(id);
      for (let n = 0; n < 40 && !qzNow(C(), id).card; n++) {
        const q = qzNow(C(), id).R.next;
        X("qzans", String(typeof v === "function" ? v(q) : v), q.id);
      }
      return def;
    };

  /* ---------- the skins ---------- */
  chk(
    "the six new skins are in the game: scripts, enneagram, fire, snack, traits, collapse",
    ["scripts", "enneagram", "fire", "snack", "traits", "collapse"].every(id => qzSkin(id) && !qzSkin(id).soon)
  );
  const S = qzSkin("scripts");
  chk(
    "Money Scripts: the four names from the research, and its source on the first screen",
    S.traits.map(t => t.name).join() === "Money avoidance,Money worship,Money status,Money vigilance" &&
      /Klontz/.test(S.note)
  );
  chk(
    "the Enneagram: nine numbered types",
    qzSkin("enneagram").traits.length === 9 && /^Nine:/.test(qzSkin("enneagram").traits[8].name)
  );
  chk(
    "a percent for each trait: all vigilance answers give 100% vigilance and 0% for the rest",
    qzBars(S, every(S, "v"))
      .map(b => b.pct)
      .join() === "0,0,0,100"
  );
  const P = qzSkin("traits");
  chk(
    "the percent style: 24 quick taps, eight traits, each one 0 to 100 on its own",
    qzTaps(P).max === 24 && qzBars(P, every(P, 3)).every(b => b.pct === 50) && qzBars(P, every(P, 3)).length === 8
  );
  const F = qzSkin("fire"),
    fa = Object.assign(every(F, 3), { f2: 5, f9: 1, f5: 5, f12: 1 });
  chk(
    "the FIRE quiz: the card is the top flavor, never a preference",
    qzResult(F, fa).id === "fat" && ["lean", "coast", "barista"].includes(qzResult(F, fa).second)
  );
  chk(
    "the FIRE quiz: three spectrums, each a mark between two words",
    qzSpectrums(F, fa)
      .map(x => x.id + x.pos)
      .join() === "earn100,hands50,move50"
  );

  /* ---------- the screens ---------- */
  X("qz");
  chk(
    "the list has the new quizzes",
    ["scripts", "enneagram", "fire", "snack", "traits", "collapse"].every(id =>
      ov().includes('data-a="qzopen" data-v="' + id + '"')
    )
  );
  take("scripts", "v");
  chk(
    "Money Scripts ends on one card with a percent for each script, in the dashboard look",
    ov().includes("Money vigilance") &&
      ov().includes("A percent for each") &&
      ov().includes("dkprog") &&
      ov().includes("100%") &&
      clean(ov()),
    junk(ov())
  );
  chk("the card routes to a skill of the tree", /data-a="skill" data-v="money-psychology:\d+"/.test(ov()));
  X("qzopen", "fire");
  X("qzgo");
  chk("a statement quiz asks by the agree scale", ov().includes("Strongly agree") && ov().includes("1 of 14"));
  take("fire", q => (q.id === "f2" || q.id === "f5" ? 5 : q.id === "f9" || q.id === "f12" ? 1 : 3));
  chk(
    "the FIRE card: Fat FIRE, bars for the four flavors, and the preferences",
    ov().includes("Fat FIRE") && ov().includes("Your preferences") && ov().includes("Earn more") && clean(ov()),
    junk(ov())
  );
  X("qzopen", "snack");
  X("qzgo");
  chk(
    "the picture quiz: a grid of tiles, each with its picture, and Playful on the card",
    ov().includes('class="qzcards"') && (ov().match(/class="qzcard"/g) || []).length === 4
  );
  take("snack", "a");
  chk("the picture quiz ends on its card", ov().includes("The Slow Cooker") && clean(ov()), junk(ov()));
  X("qzopen", "collapse");
  X("qzgo");
  const m0 = ov();
  chk(
    "Quantum Collapse shows the plans still possible from the engine, before the first tap",
    m0.includes("Plans still possible") && m0.includes(String(qzPaths(qzSkin("collapse"), {}).left)) && clean(m0),
    junk(m0)
  );
  X("qzans", "job", "work");
  chk(
    "each tap cuts the plans still possible",
    ov().includes(String(qzPaths(qzSkin("collapse"), { work: "job" }).left)) &&
      qzPaths(qzSkin("collapse"), { work: "job" }).left < qzPaths(qzSkin("collapse"), {}).left
  );
  X("qzans", "behind", "press");
  chk(
    "an early rule ends it: one first move, and the five numbers to give next in the measured order",
    ov().includes("Steady the month first") &&
      ov().includes("The numbers to give next") &&
      ov().indexOf("What you spend in a month") < ov().indexOf("What lands in your account") &&
      clean(ov()),
    junk(ov())
  );
  chk(
    "the measured order is the order of the main app (spending, income, what is owed, cash, invested)",
    qzSkin("collapse")
      .measured.map(m => m.key)
      .join() === "spending,income,card,cash,invested"
  );
  chk(
    "no em dash and no blame word on the new cards",
    !ov().includes(DASH) && !BLAME.test(ov().replace(/<[^>]+>/g, ""))
  );

  /* ---------- Duolingo mode: the daily question routes by the quiz result ---------- */
  c.x.qz.snack.at = "2026-11-01";
  c.x.qz.scripts.at = "2026-11-20";
  c.x.qz.fire.at = "2026-11-10";
  c.x.qz.collapse.at = "2026-11-02";
  chk("the latest quiz result is the one taken last", qzLatest(c).id === "scripts");
  X("dq");
  const q = dailyOf(),
    right = q.opts.findIndex(o => o.ok);
  chk("before the answer, no route yet", !ov().includes("For you today"));
  X("dailyans", String(right));
  chk(
    "after the answer: a skill and a short read from the latest quiz result, and the way into the lessons",
    ov().includes("For you today") &&
      ov().includes("Your latest quiz, Money Scripts") &&
      ov().includes('data-a="skill" data-v="money-psychology:') &&
      ov().includes("A short read") &&
      ov().includes('data-a="lp"') &&
      clean(ov()),
    junk(ov())
  );

  /* ---------- Duolingo mode: the adult lesson path ---------- */
  chk(
    "12 adult lessons, each with one idea, two questions and a skill that exists in the library at its level",
    ADULT_LESSONS.length === 12 &&
      ADULT_LESSONS.every(l => {
        const s = lib.skills.find(x => x.id === l.skill);
        return l.q.length === 2 && s && s.tree === l.tree && s.level === l.lv && SKILLS[l.tree];
      })
  );
  chk(
    "the worked answers are right",
    ADULT_LESSONS.find(l => l.id === "payday").q[0][1][1] === "$200" &&
      ADULT_LESSONS.find(l => l.id === "match").q[0][1][0] === "$1,500" &&
      ADULT_LESSONS.find(l => l.id === "times25").q[0][1][1] === "$1,000,000"
  );
  chk(
    "the path puts first the lessons of the trees of the latest result (Money Scripts: money psychology)",
    lpLessons(c)[0].tree === "money-psychology" && lpLessons(c).length === 12
  );
  chk(
    "the menu has Daily lessons, next to Kids mode",
    MENU.some(m => m[1] === "lp") && MENU.some(m => m[1] === "kids")
  );
  X("lp");
  chk(
    "the path: one sheet with Kids mode, today's lesson marked, the reason for the order",
    W.kind === "lp" &&
      ov().includes("Your lesson path") &&
      ov().includes("Today's lesson") &&
      ov().includes("come first"),
    junk(ov())
  );
  X("kidlesson", "0");
  chk("a lesson opens on its idea", ov().includes("The idea") && ov().includes("Got it"));
  X("kidgo");
  const l0 = lpLessons(c)[0];
  X("kidpick", String(l0.q[0][2]));
  X("kidgo");
  X("kidpick", String((l0.q[1][2] + 1) % 3));
  chk("a miss gets the reason, with no red", ov().includes("Close. Here is why.") && !/red/.test(ov()));
  X("kidgo");
  chk(
    "the end: the lesson is kept on the player, the run starts, and the button opens the skill",
    !!c.x.lp.done[l0.id] &&
      c.x.lp.right[l0.id] === 1 &&
      c.x.lp.run === 1 &&
      ov().includes('data-a="skill" data-v="' + l0.tree + ":" + (l0.lv - 1) + '"'),
    JSON.stringify(c.x.lp)
  );
  chk(
    "a kid profile is not touched",
    (G.kids || []).every(k => !k.done || !k.done[l0.id] || k.adult !== true)
  );

  /* ---------- privacy ---------- */
  chk("a new result is private by default", !c.x.qz.scripts.show && !qzShown(c).length);

  /* ---------- the built list ---------- */
  chk(
    "the built list has the row for the new quizzes and Duolingo mode, and its probe passes",
    WB.some(r => /Quantum Collapse/.test(r[1]) && r[2] === "b" && typeof r[3] === "function" && r[3]() === true)
  );
  chk(
    "What's new has the entry",
    PATCH_NOTES.some(p => /Money Scripts/.test(p.t + (p.d || "") + JSON.stringify(p)))
  );

  X("close");
  G.chars.splice(n0, 1);
  G.active = act0;
  save();
  go("home");
}
