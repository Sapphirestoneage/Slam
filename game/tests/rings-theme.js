/* ============================================================================
   SLAM the Game, test: tests/rings-theme.js
   PURPOSE     Examine the Rings theme (money sins, Part 3): the theme entry (look and voice), off until
               picked, the climb out on the read, the ruler of the main pull as the boss of the boss
               fights, the themed words (the fine print, the ward, the escape route) with the plain word
               next to each, the add-on voice hook with and without a stand-in add-on, the rule that an
               add-on can turn the theme off by default (with a stand-in), leaving the theme, privacy for
               a coach, the tone, the built row and What's new.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/rings.js, core/sins.js, features/sins.js,
               features/games2.js, features/recalc.js, screens/ui.js, account/gate.js.
   ========================================================================= */
{
  const t = todayISO(),
    day = n => addDays(t, -n),
    n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    look0 = G.look,
    voice0 = G.voice,
    def = qzSkin("sins"),
    all = v => Object.fromEntries(def.questions.map(q => [q.id, v])),
    blame = s =>
      /mistake|failed|\bbehind\b|off.track/i.test(
        String(s)
          .replace(/<[^>]*>/g, " ")
          .replace(/the Mistake audit \(opt-in\)/g, "")
      ); /* the opt-in Mistake audit button is the one allowed place */
  G.demo = false;
  const a = Object.assign(newChar(), {
    name: "Ash",
    led: true,
    placed: true,
    age: 33,
    ret: 60,
    take: 4000,
    spend: 3000,
    months: 2,
    inv: 5000,
    spends: [
      { k: "Home", amt: 1400, s: true },
      { k: "Food", amt: 500, s: true },
      { k: "Fun and everything else", amt: 80, s: true },
    ],
    cashes: [{ k: "Checking", amt: 6000, s: true }],
    incs: [{ k: "Job", amt: 4000, s: true }],
    debts: [{ k: "Card", amt: 2400, apr: 22, min: 60, s: true }],
  });
  G.chars.push(a);
  G.active = n0;
  G.look = "sapphire";
  G.voice = "sapphire";
  save();
  go("home");
  const c = C();
  c.moves.push({ d: day(40), t: "in", amt: 2000, src: "Job", k: "Checking" });
  [9, 8, 7, 6, 5, 4, 3, 2].forEach(n =>
    c.moves.push({ d: day(n), t: "out", amt: 12, cat: "Fun and everything else", k: "Checking" })
  );
  c.x.qz = {
    sins: {
      ans: all("a"),
      go: true,
      at: t,
      sn: {
        v: 1,
        checks: [{ at: day(3) + "T20:00:00Z", d: day(3), tag: "bored", amt: 12, cat: "fun" }],
        fixes: [{ trait: "lust", group: "sin", start: day(70), end: day(40), before: 4, during: 1, dropped: true }],
      },
    },
  };
  save();
  const R = sngRead(c),
    top = R.read.families[0].top.id,
    B = snBoss(def, R.read);

  /* ---------- the theme entry, off until picked ---------- */
  chk(
    "the Rings is one theme in THEMES: a name, a tag, a swatch, ten eras and the voice words",
    THEMES.rings &&
      THEMES.rings.n === "The Rings" &&
      THEMES.rings.eras.length === 10 &&
      THEMES.rings.sw.length === 2 &&
      ["next", "path", "done", "go", "upnext", "daily", "payday", "month", "move"].every(k => !!THEMES.rings[k]) &&
      THEMES.rings.praise.length &&
      THEMES.rings.whisper.length
  );
  chk("off by default: the game uses the plain look", LK() === "sapphire" && VC() === "sapphire" && !rgOn());
  chk(
    "the picker lists the Rings, and nothing themed shows until it is picked",
    themeCard().includes('data-a="theme" data-v="rings"') && rgT("escape", "Recalculating") === "Recalculating"
  );
  X("themes");
  chk(
    "the Theme button opens the picker as its own sheet (on Me it could sit under Show more)",
    W.kind === "themes" && ov().includes('data-a="theme" data-v="rings"')
  );
  X("theme", "fae");
  chk("a pick shows at once on the open sheet", ov().includes('class="rowbtn sel" data-a="theme" data-v="fae"'));
  X("theme", "sapphire");
  X("sins");
  chk(
    "with the Rings off, the read has one slim row to the theme and no ruler",
    ov().includes("See your read as the Rings") && !ov().includes(esc(B.name))
  );

  /* ---------- picked: the climb, the boss, the themed words ---------- */
  X("theme", "rings");
  chk("picked: the look and the voice are the Rings", LK() === "rings" && VC() === "rings" && rgOn());
  chk("the plain era name stays next to the themed one", eraN(0) === "The Bottom Ring (" + EP(0) + ")");
  X("sins");
  const K = rgRings(c);
  chk(
    "the read shows the climb out: the bottom ring is the main pull, one ward month climbed a ring",
    ov().includes("You start in " + esc(K.rings[0].ruler.ring)) &&
      K.rings[0].sin === top &&
      K.climbed === 1 &&
      ov().includes("Ring 6: ") &&
      ov().includes("(you are here)") &&
      ov().includes("1 of 7 rings climbed") &&
      ov().includes("Patience climbed you up a ring"),
    JSON.stringify({ top, climbed: K.climbed })
  );
  chk(
    "defenses read as wards, with the plain words next to them",
    ov().includes("Your ward (Test the fix)") && !ov().includes("undefined") && !ov().includes("NaN")
  );
  chk(
    "a leave button and a way to the boss fight",
    ov().includes('data-a="rgleave"') && ov().includes('data-a="boss"')
  );
  chk("no blame word on the read in the Rings voice", !blame(ov()), ov());
  X("boss");
  chk(
    "the boss fight: the ruler of the main pull stands over the debts, with its hold and its ward",
    B &&
      B.sin === top &&
      ov().includes(esc(B.name)) &&
      ov().includes('data-fid="rg:boss"') &&
      ov().includes(esc(B.holdLine)) &&
      ov().includes("Your ward (Test the fix): " + esc(B.ward)) &&
      ov().includes(esc("Card")),
    junk(ov())
  );
  chk("the boss fight keeps its own bosses: one boss game, not two", ov().includes('data-a="bossok"') && !blame(ov()));
  chk(
    "check-ins read as the fine print, Recalculating as the escape route",
    rgT("checkin", "What was this?") === "The fine print (What was this?)" &&
      rgT("escape", "Recalculating") === "The escape route (Recalculating)"
  );
  W = { kind: "sncheck", buy: { d: t, amt: 80, cat: "fun" }, why: "A buy over your line.", then: null };
  chk(
    "the check-in sheet says the fine print, with its plain words",
    snCheckSheet().includes("The fine print (What was this?)")
  );

  /* ---------- the add-on voice hook: a stand-in add-on ---------- */
  RG_VOICE.push({
    pk: "standin",
    words: { checkin: "Stand-in print" },
    rulers: { [top]: { roast: "A stand-in roast." } },
  });
  X("boss");
  chk("no add-on on: the default voice", !ov().includes("A stand-in roast.") && ov().includes(esc(B.roast)));
  ADX.has.standin = true;
  const test0 = ADX.test;
  ADX.test = true;
  X("boss");
  chk(
    "the add-on on: its second voice",
    ov().includes("A stand-in roast.") && rgT("checkin", "What was this?") === "Stand-in print (What was this?)"
  );
  ADX.test = test0;
  delete ADX.has.standin;
  RG_VOICE.splice(0, RG_VOICE.length);

  /* ---------- off by default for a player with an add-on that says so ---------- */
  ADX.has.standoff = true;
  ADX.meta.standoff = { themesOff: ["rings"] };
  ADX.test = true;
  chk(
    "an add-on that lists the theme in themesOff: the theme is off for this player, even if it was picked",
    adThemeOff("rings") && LK() === "sapphire" && VC() === "sapphire" && !rgOn()
  );
  const card0 = themeCard();
  chk(
    "the picker leaves it out and offers it under More themes",
    !card0.includes('data-a="theme" data-v="rings"') && card0.includes('data-a="thshow" data-v="rings"')
  );
  X("sins");
  chk("the read does not point to it either", !ov().includes("See your read as the Rings"));
  X("thshow", "rings");
  chk(
    "the player taps Show: it is in the list again, and in use",
    !adThemeOff("rings") && themeCard().includes('data-a="theme" data-v="rings"') && LK() === "rings"
  );
  delete c.x.thShow;
  ADX.test = test0;
  delete ADX.has.standoff;
  delete ADX.meta.standoff;
  chk("no add-on: the rule is off again", !adThemeOff("rings") && LK() === "rings");

  /* ---------- privacy: a coach or an admin who opens this game ---------- */
  const ss0 = global.sessionStorage;
  global.sessionStorage = { getItem: k => (k === "su_as" ? "1" : null), setItem() {}, removeItem() {} };
  chk("a coach sees no ruler in the boss fight", rgBossPart(c) === "");
  global.sessionStorage = ss0;
  if (ss0 === undefined) delete global.sessionStorage;

  /* ---------- removable ---------- */
  X("rgleave");
  chk("Leave the Rings: back to the plain look and voice", LK() === "sapphire" && VC() === "sapphire" && !rgOn());
  X("boss");
  chk("with the Rings left, the boss fight has no ruler", !ov().includes('data-fid="rg:boss"'));

  /* ---------- the built list and What's new ---------- */
  chk(
    "the built list has the row, and its probe passes",
    WB.some(r => /The Rings theme/.test(r[1]) && r[2] === "b" && r[3]() === true)
  );
  chk(
    "What's new has the entry",
    PATCH_NOTES.some(p => /The Rings/.test(p.t))
  );

  X("close");
  G.chars.splice(n0, 1);
  G.active = act0;
  G.demo = demo0;
  G.look = look0;
  G.voice = voice0;
  save();
  go("home");
}
