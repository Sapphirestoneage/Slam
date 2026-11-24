/* ============================================================================
   SLAM the Game, test: tests/gear-slots.js
   PURPOSE     Examine the states of a gear slot that the player does not have (want it, need it, not
               interested, can't have it), the inactive state, and the explanation of a slot.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: core/engine2.js (gearWish, gearInactive, gearWants),
               features/games.js (gearWishRows).
   ========================================================================= */
{
  const n0 = G.chars.length,
    a = Object.assign(newChar(), { name: "Gia", led: true, placed: true, work: "Established" });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  save();
  const c = C();
  gearSet(c, "will", "none");
  gearSet(c, "savings", "none");
  gearSet(c, "retire", "none");
  X("gear");
  chk("the sheet explains what a slot is", ov().includes("What is a gear slot?"));
  chk(
    "an empty slot offers the four answers",
    ["Want it", "Need it", "Not interested", "Can't have it"].every(t => ov().includes(t)) && clean(ov()),
    junk(ov())
  );
  X("gearwish", "want", "will");
  X("gearwish", "need", "savings");
  X("gearwish", "no", "retire");
  chk(
    "the answers are kept",
    gearWish(c, "will") === "want" && gearWish(c, "savings") === "need" && gearWish(c, "retire") === "no"
  );
  const w = gearWants(c, derive(c)).map(x => x.g.id);
  chk("needs come first, then wants, and not interested stays out", w.join() === "savings,will", w.join());
  chk(
    "the sheet lists them, needs first",
    ov().includes("On your list, needs first:") && ov().indexOf("Savings account, A will") > 0,
    ""
  );
  X("gearwish", "want", "will");
  chk("a second tap on the same answer clears it", gearWish(c, "will") === null);
  c.work = "Between jobs";
  c.invs = [];
  const g = GEAR.find(x => x.id === "retire");
  chk("between jobs, the retirement slot is inactive, with the reason", /between jobs/.test(gearInactive(c, g) || ""));
  X("gear");
  chk("the sheet shows Inactive", ov().includes("Inactive") && clean(ov()), junk(ov()));
  c.work = "Established";
  chk("with a job again, the slot is active again", gearInactive(c, g) === null);
  G.chars.length = n0;
  G.active = 0;
  save();
}
