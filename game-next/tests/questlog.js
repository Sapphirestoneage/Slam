/* ============================================================================
   SLAM the Game, test: tests/questlog.js
   PURPOSE     Examine the Quest Log ("Where am I"): the button on every tab and sheet, the trail and its cap
               of 10, Continue (lastOpen or the next unfinished part), one pin, the locked layers and their
               unlock line, the buttons of each tab, Back to the Quest Log after a jump, the new Home, the
               menu, the Layer 3 save point. Then a scripted walk for three players: open a screen, tap
               Where am I, tap Continue, and land on the right screen in 2 taps or fewer.
   INPUT       The game scripts, loaded by harness.cjs. Three sample profiles.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/questlog.js and its parts in ui.js, planner.js, nav.js,
               games.js, ask3.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    mk = o =>
      Object.assign(
        newChar(),
        {
          name: "Quest",
          led: true,
          placed: true,
          age: 30,
          ret: 60,
          take: 5000,
          spend: 4000,
          inv: 20000,
          incs: [R0({ k: "A main job", amt: 5000 })],
          spends: [R0({ k: "Home", amt: 2000 }), R0({ k: "Food", amt: 2000 })],
          cashes: [R0({ k: "Checking", amt: 3000 })],
          invs: [R0({ k: "IRA or Roth IRA", amt: 20000 })],
          debts: [],
        },
        o || {}
      ),
    use = a => {
      G.demo = false;
      G.tourSeen = true;
      G.chars.push(a);
      G.active = G.chars.length - 1;
      syncAll(a);
      save();
      go("home");
      return C();
    };
  /* ---------- the button, on each tab and each sheet ---------- */
  let c = use(mk());
  ["home", "plan", "money", "map", "me", "play"].forEach(t => {
    go(t);
    renderPlanBars();
  });
  chk(
    "the top bar has the button Where am I, with a map pin",
    topbarHTML().includes('data-a="quest"') && topbarHTML().includes("qpin") && topbarHTML().includes("Where am I")
  );
  X("taxv");
  chk("each sheet header has the button too", ov().includes('class="questbtn slim" data-a="quest"'));
  X("quest");
  chk(
    "tapping it opens the Quest Log from a sheet",
    W.kind === "quest" && ov().includes("Your quest log") && clean(ov()),
    junk(ov())
  );
  X("navback");
  chk("Back returns to the exact screen you came from", W && W.kind === "taxv");
  X("close");
  chk("the menu: Where am I first, and no second Me", MENU[0][1] === "quest" && !MENU.some(m => m[1] === "me"));
  /* ---------- the trail ---------- */
  ["taxv", "odds", "cover", "mix", "slept", "sims", "paths", "summary", "book", "quota", "know", "csp"].forEach(k =>
    X(k)
  );
  chk(
    "the trail records each sheet and keeps the last 10",
    c.x.trail.length === 10 && c.x.trail[0].kind === "csp" && c.x.trail.every(e => e.label && e.t)
  );
  X("taxv");
  chk(
    "a sheet opened again moves to the top, not twice",
    c.x.trail[0].kind === "taxv" && c.x.trail.filter(e => e.kind === "taxv").length === 1
  );
  /* ---------- Continue ---------- */
  c.x.lastOpen = null;
  const nx = questNext(c),
    K1 = questContinue(c);
  chk(
    "with nothing left open, Continue shows the next unfinished part",
    K1 && K1.from === "next" && K1.a === nx.part.a && K1.v === nx.part.v
  );
  X("tier");
  chk("an unfinished part becomes lastOpen", c.x.lastOpen && c.x.lastOpen.kind === "tier");
  const K2 = questContinue(c);
  chk(
    "Continue picks lastOpen and shows its progress",
    K2.from === "last" && K2.a === "tier" && /of \d+ done in Layer 2/.test(K2.progress)
  );
  GX(c).l2.tier = true;
  chk("when lastOpen is finished, Continue moves on to the next part", questContinue(c).from === "next");
  /* ---------- the pin ---------- */
  X("quest");
  const parts = questJourney(c).reduce((a, r) => a.concat(r.parts), []),
    p1 = parts[0],
    p2 = parts[1];
  X("questpin", "", p1.key);
  chk("a star pins one part as my focus", c.x.quest.pin && c.x.quest.pin.key === p1.key && ov().includes("My focus"));
  X("questpin", "", p2.key);
  chk("only one pin at a time", c.x.quest.pin.key === p2.key);
  X("questpin", "", p2.key);
  chk("one tap unpins", !c.x.quest.pin && !ov().includes("My focus"));
  /* ---------- part states ---------- */
  const open = parts.find(p => p.st === "open");
  X("questst", "na", open.key);
  chk(
    "a part can be marked Doesn't apply to me, and counts as done",
    questJourney(c)
      .reduce((a, r) => a.concat(r.parts), [])
      .find(p => p.key === open.key).st === "na"
  );
  X("questst", "na", open.key);
  /* ---------- locked layers ---------- */
  const rows = questJourney(c),
    locked = rows.filter(r => r.locked);
  chk(
    "a locked layer shows a lock and its unlock line",
    locked.length > 0 &&
      (X("questtab", "journey"), ov().includes("🔒 Locked")) &&
      ov().includes("Opens after " + locked[0].after + ". You'll get: ")
  );
  /* ---------- each tab's buttons go to a real screen ---------- */
  const acts = h => (h.match(/data-a="([a-z0-9]+)"/g) || []).map(s => s.slice(8, -1));
  ["journey", "areas", "questions", "time"].forEach(t => {
    X("questtab", t);
    chk(
      "tab " + t + ": each button names a real action",
      acts(ov()).every(a => typeof ACT[a] === "function"),
      acts(ov()).filter(a => typeof ACT[a] !== "function")
    );
  });
  X("questtab", "questions");
  chk(
    "the Questions tab has the four Ask buttons",
    FRONT_BTN.every(b => ov().includes('data-a="front" data-v="' + b[0] + '"'))
  );
  X("questtab", "areas");
  chk(
    "the Areas tab has the five D.A.I.T.E. letters with a percent",
    ["Debts", "Assets", "Income", "Taxes", "Expenses"].every(n => ov().includes(n)) && /\d+%/.test(ov())
  );
  X("questtab", "time");
  chk(
    "the Time tab has today, this week, this month and the check-ins",
    ov().includes("This week") &&
      ov().includes("This month") &&
      ov().includes('data-a="daily"') &&
      ov().includes('data-a="month"')
  );
  /* ---------- Back from a jump returns to the Quest Log ---------- */
  [
    ["questgo", "", "tier"],
    ["front", "safe"],
    ["kwgo", "", "sharp"],
  ].forEach(j => {
    X("quest");
    X(j[0], j[1], j[2]);
    const kind = W && W.kind;
    X("navback");
    chk("Back from a jump (" + kind + ") returns to the Quest Log", W && W.kind === "quest");
  });
  /* ---------- the recent list, the nudge, the big picture ---------- */
  X("quest");
  chk(
    "Recent shows the last 5 places as rows",
    (ov().match(/class="rowbtn bare" data-a="questgo"/g) || []).length === 5 &&
      ov().includes('data-a="tab" data-v="map"')
  );
  const N = questNudge(c);
  chk("one nudge at most, from the due list", N && (ov().match(/qnudge/g) || []).length === 1);
  X("questnudge", "", N.id);
  chk("Not now puts the nudge away for today", !questNudge(c) || questNudge(c).id !== N.id);
  /* ---------- Home ---------- */
  X("close");
  go("home");
  const h = app();
  chk(
    "Home: the top numbers, then one Continue card, then Where am I",
    h.indexOf('class="quad"') < h.indexOf("qhome") &&
      (h.match(/class="card next pulse qcont/g) || []).length === 1 &&
      h.indexOf("qhome") < h.indexOf('class="questbtn wide')
  );
  chk(
    "Home hides the Ask row, the layer strip and the path list by default",
    !h.includes("frontrow") &&
      /data-sec="camp" style="order:\d+;display:none"/.test(h) &&
      /data-sec="path" style="order:\d+;display:none"/.test(h)
  );
  X("dash");
  X("dashtog", "", "ask");
  go("home");
  chk("Rearrange Home can show them again", app().includes("frontrow"));
  X("dashtog", "", "ask");
  /* ---------- the Layer 3 save point ---------- */
  chk(
    "at Layer 3 the save point shows Your full plan is ready, with four plan tools",
    bonBody(c, 3).includes("Your full plan is ready") &&
      ["paths", "odds", "cover", "sims"].every(a => bonBody(c, 3).includes('data-a="' + a + '"')) &&
      !bonBody(c, 2).includes("Your full plan is ready")
  );
  /* ---------- the walk: three players, Where am I then Continue, 2 taps ---------- */
  const walk = (name, c2, expect) => {
    const pick = ["taxv", "odds", "cover", "glossary", "slept"][name.length % 5];
    X(pick);
    let taps = 0;
    X("quest");
    taps++;
    const m = ov().match(/data-a="questgo" data-k="([^"]*)" data-v="([^"]*)"/);
    if (m) {
      X("questgo", m[2], m[1]);
      taps++;
    }
    chk(
      name + ": Where am I, then Continue, lands on " + expect + " in " + taps + " taps",
      taps <= 2 && W && W.kind === expect,
      W && W.kind
    );
    X("close");
  };
  /* a brand-new player: setup is not done */
  use(mk({ name: "New", placed: false, led: false, incs: [], spends: [], cashes: [], invs: [] }));
  walk("A brand-new player", C(), "setup");
  /* halfway through Layer 2: the card draft was left open */
  let c2 = use(mk({ name: "Half" }));
  c2.l1 = { gear: true, party: true };
  X("draft");
  X("close");
  walk("A player halfway through Layer 2", c2, "draft");
  /* done with Layer 3: each part up to Layer 3 is done or does not apply */
  let c3 = use(mk({ name: "Three" }));
  questJourney(c3)
    .filter(r => !r.layer || r.layer <= 3)
    .forEach(r => r.parts.forEach(p => p.st === "open" && (questX(c3).st[p.key] = "na")));
  c3.x.lastOpen = null;
  const L4 = questJourney(c3).find(r => r.layer === 4),
    want = L4.parts.find(p => p.st === "open" || p.st === "work");
  walk("A player done with Layer 3", c3, want.a);
  G.chars.length = n0;
  G.active = 0;
  save();
  go("home");
}
