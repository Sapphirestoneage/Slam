/* ============================================================================
   SLAM the Game, test: tests/play-and-people.js
   PURPOSE     Examine Part 10b of the run Not built, groups 1 to 5: the copy of core/play.js is current;
               the daily challenge after the daily question (sized in days of the player's spending, three
               ways, practice only); roots and branches (the branches are yearsTo of the plan); proof on a
               done step; theme blends (a second voice's lines and step names); the book curator (each book
               names an idea whose "by" line holds the title); the credit score game (myFICO's shares and the
               two rounds); the first $1,000 bonus hunt and its calculator; the guild (private by default,
               no money number), mentors who finished, the monthly money date; the app lock (a salted hash,
               never the PIN) and passkeys off behind PASSKEY_READY; the menu rows; the built list rows; no
               undefined, NaN or null on the sheets.
   INPUT       The game scripts, loaded by harness.cjs. Made-up profiles.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: core/play.js, features/life.js, features/hunt.js,
               features/guild.js, account/lock.js, features/lockset.js.
   ========================================================================= */
{
  const fs = require("fs"),
    path = require("path"),
    crypto = require("crypto"),
    sha = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
  const src = fs.readFileSync(path.join(GAME_DIR, "..", "js", "math", "play.js"), "utf8"),
    copy = fs.readFileSync(path.join(GAME_DIR, "core", "play.js"), "utf8");
  chk(
    "core/play.js is a current copy of js/math/play.js (node tools/game_play_build.mjs)",
    copy.includes("SOURCE-HASH  " + sha(src))
  );

  const R0 = r => Object.assign({ s: true, cf: 3 }, r);
  const mk = (name, o) =>
    Object.assign(
      newChar(),
      {
        name,
        led: true,
        placed: true,
        age: 34,
        ret: 65,
        take: 5000,
        spend: 3000,
        inv: 40000,
        incs: [R0({ k: "A main job", amt: 5000 })],
        spends: [R0({ k: "Home", amt: 1800 }), R0({ k: "Food", amt: 1200 })],
        cashes: [R0({ k: "Savings", amt: 6000 })],
        debts: [R0({ k: "Credit card", amt: 1200, rate: 24, lim: 6000 })],
      },
      o || {}
    );
  const a = mk("Ari"),
    b = mk("Bea", { inv: 90000 });
  G.demo = false;
  G.chars = [a, b];
  G.active = 0;
  G.coach = false;
  const d = derive(a);

  /* (1) the daily challenge */
  const T = lsToday(a);
  chk("the challenge fits the level", T.lv >= T.x.from && T.lv <= T.x.to);
  chk(
    "its size is days of the player's own spending, to $10",
    T.cost === plChallengeCost(T.x.days, 3000) && T.cost % 10 === 0
  );
  chk("the card way uses the player's card rate (24%)", T.R.ready && Math.abs(T.R.cardApr - 0.24) < 1e-9);
  chk(
    "from the cushion: cash left = cash - cost",
    Math.abs(T.R.ways.cushion.cashLeft - Math.max(0, d.cash - T.cost)) < 0.01
  );
  chk("the same challenge all day", lsPick(a, d, "2026-11-26").id === lsPick(a, d, "2026-11-26").id);
  const before = JSON.stringify([a.cashes, a.debts, a.inv]);
  X("lsopen");
  chk("the challenge sheet draws clean", clean(ov()) && ov().includes("Daily challenge"), junk(ov()));
  X("lsway", "cushion");
  chk(
    "a pick is kept, and no number of the plan changes",
    a.x.ls.way === "cushion" && a.x.ls.n === 1 && JSON.stringify([a.cashes, a.debts, a.inv]) === before
  );
  chk("the pick shows what it left", ov().includes('data-fid="ls:picked"') && clean(ov()), junk(ov()));
  chk(
    "the daily question carries the challenge once answered",
    typeof lsDailyPart === "function" && lsDailyPart(a).includes("Daily challenge")
  );
  const noCard = mk("Cy", { debts: [] });
  chk(
    "no card: the card way needs a rate, never a guessed one",
    lsToday(noCard).R.cardApr === null && lsToday(noCard).R.ways.card.card === null
  );

  /* (2) roots and branches */
  a.hist = [
    { d: "2026-01-05", nw: 20000 },
    { d: "2026-06-05", nw: 30000 },
  ];
  const RB = rbData(a);
  chk("the first branch is the plan's own date", RB.branches[0].yrs === d.yrs);
  chk(
    "$100 more a month is yearsTo with 1,200 more a year",
    RB.branches[1].yrs === yearsTo(a.inv, d.save + 1200, d.fi)
  );
  chk("a year with no saving is one year later", d.yrs == null || RB.branches[3].yrs === d.yrs + 1);
  X("roots");
  chk("roots and branches draw clean", clean(ov()) && ov().includes("Branches") && ov().includes("Roots"), junk(ov()));

  /* (3) proof on steps */
  const sid = Object.keys(SKILLS)[0] + ":0";
  a.skills[sid] = "2026-11-20";
  X("pfkind", "num", sid);
  chk("a done step keeps a proof kind and the date", pfOf(a, sid) && pfOf(a, sid).k === "num" && pfCount(a) === 1);
  chk(
    "the proof shows on the step",
    pfStepPart(a, sid, true).includes('data-fid="pf:kept"') && clean(pfStepPart(a, sid, true))
  );
  chk("a step not done has no proof card", pfStepPart(a, Object.keys(SKILLS)[0] + ":3", false) === "");
  X("proofs");
  chk("the proof list draws clean", clean(ov()) && ov().includes("Proof you kept"), junk(ov()));

  /* (4) theme blends */
  const B2 = tbBlend(THEMES.fae, THEMES.tabletop);
  chk("a blend keeps the main voice's words", B2.daily === THEMES.fae.daily);
  chk(
    "and takes praise from both",
    B2.praise.includes(THEMES.fae.praise[0]) && B2.praise.includes(THEMES.tabletop.praise[0])
  );
  G.look = "rings";
  G.voice = "rings";
  G.voice2 = "tabletop";
  chk("the blended voice is used", VO().praise.includes(THEMES.tabletop.praise[0]));
  chk(
    "Rings has no step names: blended with Tabletop, the steps get Tabletop's",
    stepThemed("main-path:0") === SKILL_T.tabletop["main-path"][0]
  );
  X("tbmix", "");
  chk("No blend takes the second voice off", !G.voice2 && VO() === THEMES.rings);
  G.look = "sapphire";
  G.voice = "sapphire";
  chk("the theme card offers the blend", themeCard().includes('data-a="tbmix"'));

  /* (5) the book curator */
  chk(
    "each book names an idea of the library whose by line holds the title",
    BC_BOOKS.every(x => IG[x.idea] && IG[x.idea].by.includes(x.title)),
    BC_BOOKS.filter(x => !IG[x.idea] || !IG[x.idea].by.includes(x.title)).map(x => x.idea)
  );
  chk(
    "each book's tracks are real tracks",
    BC_BOOKS.every(x => x.trees.every(t => SKILLS[t]))
  );
  chk(
    "books for a step come from its track",
    bcFor("main-path:3").length > 0 && bcFor("main-path:3").every(x => x.trees.includes("main-path"))
  );
  X("books");
  chk("the books sheet draws clean", clean(ov()) && ov().includes("Books for your next step"), junk(ov()));

  /* the credit score game */
  chk(
    "myFICO's five shares add to 100%",
    Math.abs(PL_FICO.factors.reduce((t, f) => t + f.share, 0) - 1) < 1e-9 &&
      PL_FICO.source.includes("myFICO") &&
      PL_FICO.date
  );
  X("crg");
  ["pay", "owed", "length", "mix", "new"].forEach(v => X("crgtap", v));
  chk("the two 10% groups count in either order", a.x.crg.best === 5 && ov().includes("5 of 5"), junk(ov()));
  X("crgnext");
  X("crgmove", "pay", "autopay");
  X("crgmove", "pay", "closeold");
  chk("round 2 counts each move once", ov().includes("1 of 2") && clean(ov()), junk(ov()));
  chk("the player's own card use is Key numbers' number", crgUtil(a) && Math.abs(crgUtil(a).v - 1200 / 6000) < 1e-9);

  /* the first $1,000 bonus hunt */
  X("hunt");
  ["bonus:300", "months:3", "deposit:5000", "hysa:0.04", "tax:0.22"].forEach(p =>
    X("hudraft", p.split(":")[1], p.split(":")[0])
  );
  const one = plBonus({ bonus: 300, deposit: 5000, months: 3, hysaRate: 0.04, taxRate: 0.22 });
  chk(
    "the calculator: bonus - tax - the interest given up (after its tax) - fees",
    Math.abs(one.net - (300 - 66 - one.lostKept)) < 0.01 && one.lost > 49 && one.lost < 51
  );
  chk(
    "the interest given up is the HYSA switch's own growth",
    Math.abs(one.lost - (qcGrow(5000, 0, 0.04, 3) - 5000)) < 0.01
  );
  X("huadd");
  chk("added to the hunt as planned", a.x.hunt.list.length === 1 && a.x.hunt.list[0].state === "planned");
  X("hustate", "paid", "0");
  chk("paid counts as kept toward $1,000", Math.abs(huRead(a).banked - one.net) < 0.01 && huRead(a).goal === 1000);
  chk("the hunt sheet draws clean", clean(ov()) && ov().includes("bonus hunt"), junk(ov()));
  chk(
    "the hunt is on the plan's spreadsheet",
    (huBook(a) || { rows: [] }).rows.some(r => r.f && r.f.includes("hu0_b"))
  );

  /* the guild, mentors, the money date */
  chk("private by default: no one is in the guild", gdMembers().length === 0);
  X("guild");
  chk("the guild sheet draws clean", clean(ov()) && ov().includes("Join the guild"), junk(ov()));
  X("gdjoin", "1");
  chk("joined, still nothing shown", gdMembers().length === 1 && Object.keys(gdView(a)).sort().join() === "c,name");
  X("gdshow", "steps");
  X("gdshow", "win");
  const v = gdView(a);
  chk("only the switches turned on show", v.steps === 1 && v.win && v.era === undefined && v.next === undefined);
  chk(
    "no money number is in what a member shares",
    !/\$|\d{3,}/.test(JSON.stringify({ e: v.era, s: v.steps, w: v.win }))
  );
  /* Bea finishes a whole track and offers to be asked */
  const t0 = Object.keys(SKILLS)[1];
  for (let i = 0; i < treeSize(t0); i++) b.skills[t0 + ":" + i] = "2026-11-01";
  b.x = b.x || {};
  b.x.gd = { on: true, show: {}, mentor: true };
  chk(
    "a mentor is a member who finished a track and offered",
    gdMentors(a).length === 1 && gdMentors(a)[0].tracks.includes(t0)
  );
  chk("the step of that track says who to ask", gdMentorPart(a, t0 + ":2").includes("Ask Bea"));
  X("gdday", "15");
  chk("the next money date is the 15th", /-15$/.test(gdNext()));
  X("gddate");
  chk("the money date has five prompts", gdDateSteps().length === 5 && clean(ov()), junk(ov()));
  for (let i = 1; i < 5; i++) X("gdstep", String(i));
  X("gdheld");
  chk("held: counted, and the next date is after today", G.guild.held.length === 1 && gdNext() > todayISO());
  chk(
    "Me has the guild row (run 16, D12: the sheet People only switches people)",
    (() => {
      X("people");
      const none = !ov().includes('data-a="guild"');
      X("close");
      return none && meTab().includes('data-a="guild"');
    })()
  );
  chk(
    "the guild tables are a migration marked NOT APPLIED with grants",
    (() => {
      const f = path.join(GAME_DIR, "..", "supabase", "migrations", "20261126120000_guilds.sql");
      const s = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "";
      return /NOT APPLIED/.test(s) && /enable row level security/i.test(s) && /grant /i.test(s) && /revoke /i.test(s);
    })()
  );

  /* app lock and passkeys */
  chk("passkeys are off until Eli switches them on", PASSKEY_READY === false && lkPasskeyApi() === null);
  const lockSrc = fs.readFileSync(path.join(GAME_DIR, "account", "lock.js"), "utf8");
  chk("no secret key in the lock file", !/service_role|sb_secret|eyJ[A-Za-z0-9_-]{20,}/.test(lockSrc));
  (async () => {
    let store = {};
    global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => (store[k] = String(v)) };
    X("lock");
    ["1", "2", "3", "4", "ok", "1", "2", "3", "4"].forEach(k => X("lkpin", k));
    X("lkpin", "ok");
    await new Promise(r => setTimeout(r, 50));
    const L = lkRead();
    chk(
      "a PIN is kept only as a salted hash",
      L.on && L.pin && L.pin.hash && L.pin.salt && !JSON.stringify(L).includes('"1234"')
    );
    chk(
      "the hash checks the right PIN",
      (await lkHash("1234", L.pin.salt)) === L.pin.hash && (await lkHash("4321", L.pin.salt)) !== L.pin.hash
    );
    chk("the lock sheet draws clean", clean(ov()) && ov().includes("App lock"), junk(ov()));
    X("lkoff");
    chk("turned off", lkRead().on === false && !lkRead().pin);
  })().catch(e => chk("the lock checks ran", false, e && e.message));
  /* the menu and the built list */
  const M = menuItems().map(m => m[1]);
  chk(
    "the menu has each new row",
    ["lsopen", "roots", "proofs", "books", "crg", "hunt", "guild", "lock"].every(k => M.includes(k))
  );
  const rows = WB.filter(r =>
    /Daily life-sim|Roots and branches|Proof on steps|Theme blends|Book curator|credit score game|first \$1,000 bonus hunt|Guilds|mentors|group money date|App lock|passkeys/i.test(
      r[1]
    )
  );
  chk(
    "the built list rows have probes that pass",
    rows.length >= 10 && rows.filter(r => r[3]).every(r => r[3]()),
    rows.map(r => r[1] + ":" + r[2])
  );
}
