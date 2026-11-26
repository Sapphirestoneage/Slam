/* ============================================================================
   SLAM the Game, test: tests/family-money.js
   PURPOSE     Examine Family money (run Not built, groups 1 to 5, Part 8).
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/family.js, core/family.js, core/engine.js (goalTypical).
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    a = Object.assign(newChar(), {
      name: "Fam",
      led: true,
      placed: true,
      age: 40,
      ret: 65,
      take: 7000,
      spend: 4500,
      inv: 60000,
    });
  G.chars.push(a);
  G.active = n0;
  save();
  go("home");
  const c = C(),
    set = (k, v, n) => X("kitset", String(v), "fam|" + k, { t: n === false ? "s" : "n" });
  const fb = require("child_process").spawnSync(
    process.execPath,
    [GAME_DIR + "../tools/game_family_build.mjs", "--check"],
    { encoding: "utf8" }
  );
  chk("core/family.js is the same code as js/math/family.js of the main app", fb.status === 0, fb.stdout);
  chk(
    "the menu has Family money",
    MENU.some(m => m[1] === "family")
  );
  chk("the dated NY rows are in the copy", FM_REF.childcare.NY.infant > 0 && FM_REF.ny529.joint > FM_REF.ny529.single);
  X("family");
  chk(
    "both ends: empty waits for a tap",
    W.kind === "family" && ov().includes("$0 is an answer") && clean(ov()),
    junk(ov())
  );
  set("parents", 800);
  set("parentsYears", 5);
  set("kids", 1200);
  set("kidsYears", 10);
  const S = famSand(C()),
    a0 = freeAt(C()),
    a1 = freeAt(C(), { flows: S.R.flows });
  chk(
    "both ends: $2,000 a month, both at once for 5 years, the freedom date from goalSim with the flows",
    S.R.peak === 2000 && S.R.both === 60 && S.fi && S.fi.a === a0 && S.fi.b === a1 && a1 > a0,
    JSON.stringify(S.fi)
  );
  chk(
    "both ends screen: the month, what is left, the date in days, no verdict",
    ov().includes(money(2000)) &&
      ov().includes(money(500)) &&
      ov().includes(kitDayWords(crDays(a0, a1))) &&
      !/burden|mistake|failed|behind|off track/i.test(ov()) &&
      clean(ov()),
    junk(ov())
  );
  set("inSpending", "yes", false);
  chk(
    "already in the spending: the dates have it in already",
    ov().includes("In already") && famSand(C()).R.flows.length === 0
  );
  X("famtab", "home");
  set("rent", 1800);
  set("payHome", 300);
  set("months", 12);
  set("target", 6000);
  chk(
    "living at home: $1,500 a month saved, the goal in 4 months",
    ov().includes(money(1500)) && ov().includes("4 months") && clean(ov()),
    junk(ov())
  );
  X("famtab", "kids");
  set("kind", "care", false);
  const K = famKids(C());
  chk(
    "childcare in New York: the dated row, untapped, as the year's amount",
    K.R.ready === false &&
      K.row &&
      K.row.yearly === FM_REF.childcare.NY.infant &&
      ov().includes(money(FM_REF.childcare.NY.infant))
  );
  set("years", 2);
  chk(
    "two years of NY infant care",
    famKids(C()).R.total === 2 * FM_REF.childcare.NY.infant &&
      ov().includes(money(2 * FM_REF.childcare.NY.infant)) &&
      ov().includes("State Comptroller") &&
      clean(ov()),
    junk(ov())
  );
  set("state", "other", false);
  chk(
    "another state: the player's own number",
    ov().includes("No dated number for this state") && famKids(C()).R.ready === false
  );
  set("kind", "yeshiva", false);
  set("yearly", 15000);
  set("nKids", 2);
  set("years", 9);
  set("startIn", 3);
  set("plan529", "joint", false);
  set("nyRate", 0.06);
  const Y = famKids(C()).R;
  chk(
    "yeshiva tuition: the years, half put away ahead, the NY 529 deduction and the K-12 rule",
    Y.total === 15000 * 2 * 9 &&
      Y.share === 0.5 &&
      Y.p529.deducted === 10000 &&
      Y.p529.recapture &&
      ov().includes("TSB-M-18(6)I") &&
      clean(ov()),
    junk(ov())
  );
  chk(
    "the goal type is on the list, with no guessed amount while the presets are empty",
    GOAL_K.some(g => g[0] === "Yeshiva tuition") && fmPresetRows(FM_COMMUNITY).length === 0
  );
  chk("its usual amount is the player's own first year", goalTypical(C(), "Yeshiva tuition") === Math.round(Y.first));
  X("famgoal");
  chk(
    "Make it a goal opens the goal list's own last step",
    W.kind === "gadd" && W.step === 2 && W.o.k === "Yeshiva tuition" && W.o.cost === Math.round(Y.want)
  );
  const ng = C().goals.length;
  X("gplace", "");
  chk("the goal is placed in Someday", C().goals.length === ng + 1 && C().goals.at(-1).k === "Yeshiva tuition");
  X("close");
  G.chars.length = n0;
  G.active = act0;
  save();
  go("home");
}
