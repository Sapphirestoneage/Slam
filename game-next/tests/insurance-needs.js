/* ============================================================================
   SLAM the Game, test: tests/insurance-needs.js
   PURPOSE     Examine the insurance needs: disability at 60% of pay and the cushion, life only with
               dependents, the deductibles next to the cushion, the umbrella flag, the long-term care flag,
               and the rows on the Money tab that replace the yes / no checks.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile, changed step by step.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/cover.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Cov",
      led: true,
      placed: true,
      age: 40,
      ret: 62,
      take: 6000,
      spend: 4000,
      inv: 100000,
      deps: "None",
      rel: "Single, seeking",
      incs: [R0({ k: "A main job", amt: 6000 })],
      spends: [R0({ k: "Home", amt: 2000 }), R0({ k: "Food", amt: 2000 })],
      cashes: [R0({ k: "Checking", amt: 8000 })],
      invs: [R0({ k: "Retirement plan at work", amt: 100000 })],
      debts: [],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C();
  let K = coverCalc(c);
  const gross = knNet(c).gross * 12,
    dis = K.rows.find(r => r.id === "disab");
  chk(
    "disability: 60% of pay a month, the gap with no cover, the cushion in months",
    Math.abs(dis.need - (gross / 12) * 0.6) < 1e-6 &&
      Math.abs(dis.gap - dis.need) < 1e-6 &&
      Math.abs(dis.months - 8000 / 4000) < 1e-9
  );
  chk("no one depends on the player: no life row", !K.rows.some(r => r.id === "life"));
  X("cover");
  X("coverset", "kids", "cover|deps", { t: "s" });
  X("coverset", "10", "cover|years", { t: "n" });
  X("coverset", "250000", "cover|life", { t: "n" });
  K = coverCalc(c);
  const life = K.rows.find(r => r.id === "life");
  chk(
    "life: pay × years + debts + tuition − what you have, minus the cover",
    life &&
      Math.abs(life.need - Math.max(0, gross * 10 - (8000 + 100000))) < 1 &&
      Math.abs(life.gap - Math.max(0, life.need - 250000)) < 1
  );
  chk("the old protection answer follows: life is Yes", c.prot.life === "Yes");
  X("coverset", "work", "cover|disab", { t: "s" });
  X("coverset", "0.6", "cover|share", { t: "n" });
  chk(
    "with 60% cover through work, the disability gap is 0",
    coverCalc(c).rows.find(r => r.id === "disab").gap < 1e-6 && c.prot.disab === "Yes"
  );
  X("coverset", "yes", "cover|home", { t: "s" });
  X("coverset", "5000", "cover|homeDed", { t: "n" });
  X("coverset", "yes", "cover|car", { t: "s" });
  X("coverset", "2000", "cover|carDed", { t: "n" });
  const hm = coverCalc(c).rows.find(r => r.id === "home");
  chk(
    "deductibles next to the small cushion: $7,000 against $8,000 of cash is no gap",
    hm.gap === 0 && c.prot.renters === "Yes"
  );
  c.cashes[0].amt = 3000;
  syncAll(c);
  chk("with $3,000 of cash the gap is $4,000", coverCalc(c).rows.find(r => r.id === "home").gap === 4000);
  chk("no umbrella flag below the lines", !coverCalc(c).rows.some(r => r.id === "umbrella"));
  c.invs[0].amt = 900000;
  syncAll(c);
  const um = coverCalc(c).rows.find(r => r.id === "umbrella");
  chk(
    "past $500,000 of net worth: the umbrella flag and its gap",
    um && um.flag && Math.abs(um.gap - (derive(c).nw - 300000)) < 1
  );
  chk("no long-term care flag under 50", !coverCalc(c).rows.some(r => r.id === "ltc"));
  c.age = 55;
  chk(
    "at 55 the long-term care flag shows, with no dollar gap",
    coverCalc(c).rows.some(r => r.id === "ltc" && r.flag && r.gap === 0)
  );
  X("cover");
  chk(
    "the screen: each gap in dollars and one next step, no red",
    ov().includes("Next step:") && ov().includes("gap") && !/var\(--bad\)|#ff4d6a/.test(ov()) && clean(ov()),
    junk(ov())
  );
  go("money");
  chk(
    "the Money tab shows the needs rows in place of yes / no",
    app().includes("Disability cover") && app().includes('data-a="cover"') && !app().includes('data-v="prot:disab"')
  );
  G.chars.length = n0;
  G.active = 0;
  save();
}
