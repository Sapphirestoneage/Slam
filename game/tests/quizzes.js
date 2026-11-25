/* ============================================================================
   SLAM the Game, test: tests/quizzes.js
   PURPOSE     Examine Quizzes: the copy of the one quiz engine and of the skins is current, the Money
               Chart gives the same results as before it moved to the engine, each skin loads and each
               path through it ends on one card, the card routes to real skills, a result changes the
               element only by a tap, a result is private until the player shows it, the placeholder
               "Coming soon", and the built list row.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: core/quizcore.js, data/quizskins.js, features/quizzes.js,
               features/chart.js (mcOf), features/element.js (elOf), features/reveal.js.
   ========================================================================= */
{
  const fs = require("fs"),
    path = require("path"),
    crypto = require("crypto"),
    { spawnSync } = require("child_process"),
    sha = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16),
    rng = seed => () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  /* ---------- the copies are current ---------- */
  const src = fs.readFileSync(path.join(GAME_DIR, "..", "js", "math", "quizcore.js"), "utf8"),
    copy = fs.readFileSync(path.join(GAME_DIR, "core", "quizcore.js"), "utf8");
  chk(
    "the engine of the game is a current copy of js/math/quizcore.js (node tools/game_quiz_build.mjs)",
    copy.includes("SOURCE-HASH  " + sha(src))
  );
  const built = spawnSync(process.execPath, [path.join(GAME_DIR, "..", "tools", "game_quiz_build.mjs"), "--check"], {
    encoding: "utf8",
  });
  chk("the skins and the routes are current copies too", built.status === 0, built.stdout + built.stderr);
  chk("the engine has no import and reads no profile", !/^import |\bC\(\)|\bG\.|document\.|localStorage/m.test(src));

  /* ---------- the Money Chart: the same results as before the move ---------- */
  {
    const r = rng(11),
      out = [];
    for (let k = 0; k < 240; k++) {
      const depth = ["ten", "std", "full"][k % 3],
        fill = [0.3, 0.7, 1, 1][k % 4],
        a = {};
      for (const i of MC_BANK)
        if ((depth === "full" || i[depth] || r() < 0.1) && r() < fill) a[i.id] = 1 + Math.floor(r() * 5);
      out.push(JSON.stringify(mcOf(a, depth)));
    }
    chk(
      "240 answer sets of the Money Chart give the results they gave before the engine (a kept digest)",
      sha(out.join("\n")) === "7670b92abaff49ef",
      sha(out.join("\n"))
    );
    const a = {};
    for (const i of MC_BANK.filter(x => x.ten)) a[i.id] = i.el === "fire" ? 5 : i.el === "water" ? 1 : 3;
    const q = mcOf(a);
    chk(
      "one result by hand: the scores, the top, the Sun",
      q.scores.map(s => s.score).join() === "0,50,50,50,50" && q.top.id === "earth" && q.sun.name === "Freedom",
      JSON.stringify(q.scores.map(s => s.score))
    );
  }

  /* ---------- each skin ---------- */
  const real = QZ_SKINS.filter(s => !s.soon);
  chk(
    "nine skins: eight to play and the placeholder of the sins",
    QZ_SKINS.length === 9 && real.length === 8 && QZ_SKINS.find(s => s.id === "sins").soon === true
  );
  chk(
    "each skin is sound (qzCheck), and takes 7 to 15 taps",
    real.every(s => qzCheck(s).length === 0 && qzTaps(s).max >= 7 && qzTaps(s).max <= 15),
    real.map(s => s.id + ": " + qzCheck(s).join("; ")).join(" | ")
  );
  const walk = (def, pick) => {
      const a = {};
      for (let n = 0; n < 40; n++) {
        const f = qzFlow(def, a);
        if (f.done) break;
        const q = f.next,
          opts = q.options ? q.options.map(o => o.id) : def.scale.map(s => s[0]);
        a[q.id] = opts[pick(opts.length, n)];
      }
      return a;
    },
    cardOk = c =>
      !!c && !!c.title && c.lines.length >= 2 && c.lines.length <= 3 && !!c.light && !!c.next && !!c.next.label;
  for (const def of real) {
    const r = rng(5),
      seen = new Set();
    let bad = 0;
    for (let k = 0; k < 400; k++) {
      const a = k < 6 ? walk(def, n => Math.min(k, n - 1)) : walk(def, n => Math.floor(r() * n)),
        R = qzResult(def, a),
        c = qzCard(def, R);
      if (!R.ready || !cardOk(c) || !R.confidence || R.topTwo.length !== 2) bad++;
      else seen.add(R.id);
    }
    chk(def.id + ": 400 paths, each ends on one card with a top two and a confidence level", bad === 0, bad);
    if (!def.result || def.result.by !== "axes")
      chk(
        def.id + ": each result can be reached",
        def.traits.every(t => seen.has(t.id)),
        [...seen].join()
      );
  }
  chk(
    "each card routes to a skill, a track or a reading of this game",
    real.every(def => {
      const ids = qzIds(def);
      return (
        ids.skills.every(id => {
          const s = QZ_ROUTES.skills[id];
          return s && SKILLS[s.tree] && SKILLS[s.tree].skills[s.level - 1];
        }) &&
        ids.trees.every(id => SKILLS[id]) &&
        ids.readings.every(id => QZ_ROUTES.readings[id] && QZ_ROUTES.readings[id].line)
      );
    })
  );

  /* ---------- the screens ---------- */
  const n0 = G.chars.length,
    act0 = G.active,
    a = Object.assign(newChar(), { name: "Rae", led: true, placed: true, age: 30, take: 4000, spend: 3000 });
  G.chars.push(a);
  G.active = n0;
  save();
  go("home");
  const c = C(),
    BLAME = /mistake|failed|behind|off track/i,
    DASH = String.fromCharCode(0x2014);
  chk("the menu has Quizzes, and Me has the row", MENU.some(m => m[1] === "qz") && meTab().includes('data-a="qz"'));
  X("qz");
  chk(
    "the list: each skin to play, the Money Chart, and the sins as Coming soon with no button",
    W.kind === "qz" &&
      real.every(s => ov().includes('data-a="qzopen" data-v="' + s.id + '"')) &&
      ov().includes('data-a="chart"') &&
      ov().includes("Coming soon") &&
      !ov().includes('data-v="sins"') &&
      ov().includes("None is a test or a diagnosis") &&
      clean(ov()),
    junk(ov())
  );
  X("qzopen", "sins");
  chk("the placeholder does not open", W.kind === "qz");
  X("qzopen", "stars");
  chk(
    "the playful skin says so on its first screen",
    W.kind === "qzq" && ov().includes("Playful: for fun") && ov().includes("Not a forecast") && ov().includes("qzgo")
  );
  X("qz");
  /* Each skin by taps: the first answer each time. */
  for (const def of real) {
    X("qzopen", def.id);
    X("qzgo");
    let taps = 0,
      okQ = true;
    for (; taps < 40; taps++) {
      const N = qzNow(c, def.id);
      if (N.card) break;
      const q = N.R.next,
        v = q.options ? q.options[0].id : def.scale[0][0];
      okQ = okQ && ov().includes('data-a="qzans"') && ov().includes(esc(q.ask || q.text)) && clean(ov());
      X("qzans", String(v), q.id);
    }
    const h = ov(),
      N = qzNow(c, def.id);
    chk(
      def.id + ": " + taps + " taps end on one card: title, lines, the light side, one next step, the note",
      okQ &&
        taps === qzTaps(def).max &&
        !!N.card &&
        h.includes(esc(N.card.title)) &&
        h.includes("The light side") &&
        h.includes("One next step") &&
        /data-a="(skill|connect)"/.test(h) &&
        h.includes(esc(def.note)) &&
        h.includes("Who sees this: Me only") &&
        clean(h) &&
        !BLAME.test(h) &&
        !h.includes(DASH),
      junk(h)
    );
  }
  /* Back one, and take it again. */
  X("qzopen", "houses");
  X("qzagain");
  chk("take it again: the first question", qzNow(c, "houses").R.answered === 0 && ov().includes("1 of 9"));
  X("qzans", "c", "h1");
  X("qzans", "c", "h2");
  X("qzback");
  chk("back one takes the last answer away", Object.keys(c.x.qz.houses.ans).join() === "h1" && ov().includes("2 of 9"));

  /* ---------- the element changes only by a tap ---------- */
  elStore(c).pick = "Fire";
  for (const q of qzSkin("houses").questions) if (!c.x.qz.houses.ans[q.id]) X("qzans", "a", q.id);
  let N = qzNow(c, "houses");
  chk(
    "a result that leans to a different element asks: keep or switch",
    N.R.id === "hearth" &&
      N.feed.ask &&
      N.feed.to === "Earth" &&
      ov().includes("This leans you toward Earth: keep Fire or switch?") &&
      ov().includes('data-a="qzel" data-v="keep"') &&
      ov().includes('data-a="qzel" data-v="switch"'),
    N.feed.line
  );
  chk("before the tap the element is the same", elOf(c).el === "Fire");
  chk(
    "the top two and the level show: a second house, and Close",
    N.R.topTwo.length === 2 &&
      N.R.confidence.level === "Close" &&
      ov().includes("Close read") &&
      ov().includes("Second: ")
  );
  X("qzel", "keep");
  chk(
    "Keep: the element stays, and the card stops asking",
    elOf(c).el === "Fire" && ov().includes("You kept Fire") && !ov().includes('data-v="switch"')
  );
  X("qzagain");
  for (const q of qzSkin("houses").questions) X("qzans", "a", q.id);
  X("qzel", "switch");
  chk(
    "Switch: the element is the new one, and the card says it stays",
    elOf(c).el === "Earth" && c.x.el.over === "houses" && ov().includes("Your element stays Earth.")
  );
  X("qzok");
  chk(
    "That is me: the level is Exact, in the words Confirmed by you",
    qzNow(c, "houses").R.confidence.level === "Exact" && ov().includes("Confirmed by you")
  );
  /* A skin with no element: the FI Address. */
  N = qzNow(c, "address");
  chk(
    "the FI Address gives a four-character code and does not ask about the element",
    !!N.card && [...N.R.code].length === 4 && N.feed.ask === false && N.feed.sheet.label === "FI Address",
    N.R.code
  );

  /* ---------- private by default ---------- */
  X("close");
  X("reveal");
  W.i = 6;
  drawSheet();
  chk(
    "the character sheet has the row Quizzes and no result, and the text for copy has none",
    ov().includes('data-a="qz"') && !ov().includes("Money house") && !rvText(c, derive(c)).includes("Money house")
  );
  X("qzopen", "houses");
  const ss0 = global.sessionStorage;
  global.sessionStorage = { getItem: k => (k === "su_as" ? "coach" : null), setItem() {}, removeItem() {} };
  chk("a coach who opens this game does not see the card", qzMine() === false && ov.call && true);
  drawSheet();
  chk(
    "the coach sees: kept private",
    ov().includes("Kept private by the player") && !ov().includes("Hearthstone") && !ov().includes("qzagain")
  );
  X("qz");
  chk(
    "the list of the coach names no result and has no button to play",
    !ov().includes("Hearthstone") && !ov().includes("qzopen") && ov().includes("Kept private by the player")
  );
  X("qzans", "b", "h1");
  chk("a tap of the coach changes nothing", c.x.qz.houses.ans.h1 === "a");
  global.sessionStorage = ss0;
  if (ss0 === undefined) delete global.sessionStorage;
  X("qzopen", "houses");
  X("qzshow", "1");
  chk(
    "the player turns it on: the card says who sees it",
    c.x.qz.houses.show === true && ov().includes("whoever I show my character sheet")
  );
  X("reveal");
  W.i = 6;
  drawSheet();
  chk(
    "then the character sheet and the text for copy have the line",
    ov().includes("Money house") &&
      ov().includes("House Hearthstone") &&
      rvText(c, derive(c)).includes("Money house: House Hearthstone")
  );
  global.sessionStorage = { getItem: k => (k === "su_as" ? "coach" : null), setItem() {}, removeItem() {} };
  X("qzopen", "houses");
  chk(
    "and the coach sees that one card, with no button to change it",
    ov().includes("House Hearthstone") && !ov().includes("qzagain") && !ov().includes("qzel")
  );
  global.sessionStorage = ss0;
  if (ss0 === undefined) delete global.sessionStorage;

  /* ---------- scores from outside (for the sins quiz) ---------- */
  {
    const def = qzSkin("houses"),
      ans = c.x.qz.houses.ans,
      R0 = qzResult(def, ans),
      R1 = qzResult(def, ans, [{ source: "spending", scores: { quickfire: 30 } }]);
    chk(
      "scores from outside are an input: they change the result, and the answers stay the same",
      R0.id === "hearth" &&
        R1.id === "quickfire" &&
        R1.second === "hearth" &&
        R1.sources.join() === "quiz,spending" &&
        qzResult(def, ans).id === "hearth"
    );
  }

  /* ---------- the built list ---------- */
  chk(
    "the built list has the row, and its probe passes",
    WB.some(r => /Quizzes/.test(r[1]) && r[2] === "b" && r[3]() === true)
  );
  chk(
    "What's new has the entry",
    PATCH_NOTES.some(p => /quiz/i.test(p.t))
  );

  X("close");
  G.chars.splice(n0, 1);
  G.active = act0;
  save();
  go("home");
}
