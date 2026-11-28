/* ============================================================================
   SLAM the Game, test: tests/life-event-blocks.js
   PURPOSE     Examine the life event blocks: each block is one option of one simulator with the answers
               of the player, the stack adds the blocks on the plan as today, the screen, the rows of
               the spreadsheet, the built row and the link from a skill.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/blocks.js on top of features/sim.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Blocks",
      led: true,
      placed: true,
      age: 32,
      ret: 62,
      take: 7000,
      spend: 4500,
      inv: 60000,
      incs: [R0({ k: "A main job", amt: 7000 })],
      spends: [R0({ k: "Home", amt: 2500 }), R0({ k: "Food", amt: 2000 })],
      cashes: [R0({ k: "Checking", amt: 30000 })],
      invs: [R0({ k: "IRA or Roth IRA", amt: 60000 })],
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
  chk(
    "six blocks, each on a real simulator and a real option of it",
    LIFE_BLOCKS.length === 6 &&
      LIFE_BLOCKS.every(b => {
        const def = SIMS[b[2]];
        return def && def.run(c, simInputs(c, def)).options.some(o => o.id === b[3]);
      })
  );
  const E0 = blocksCalc(c),
    base = simBaseline(c, 120);
  chk(
    "an empty stack is the plan as today (10 years by default)",
    E0.ids.length === 0 && E0.years === 10 && E0.end === E0.endPlan && E0.endPlan === base[120] && E0.free === E0.free0
  );
  const kid = blocksOne(c, "kid"),
    kr = simRaw(c, SIMS.kid, simInputs(c, SIMS.kid)).options.find(o => o.id === "kid");
  chk(
    "the block of a child is the option of its simulator: the same delta and the same monthly spending",
    kid.delta.length === kr.delta.length && kid.delta[120] === kr.delta[120] && kid.extra === kr.extra
  );
  X("blocks");
  chk(
    "the screen with no stack: six blocks, each with a way to its simulator",
    W.kind === "blocks" &&
      (ov().match(/data-a="blockstog"/g) || []).length === 6 &&
      (ov().match(/data-a="simopen"/g) || []).length === 6 &&
      ov().includes("Your stack is empty") &&
      clean(ov()),
    junk(ov())
  );
  X("blockstog", "kid");
  X("blockstog", "move");
  const S = blocksCalc(c),
    mv = blocksOne(c, "move");
  chk(
    "two taps put two blocks in the stack, in order",
    S.ids.join() === "kid,move" && blocksStack(c).join() === "kid,move"
  );
  chk(
    "the stack adds: net worth at the end is the plan plus the delta of each block",
    Math.abs(S.end - (base[120] + blocksAt(kid, 120) + blocksAt(mv, 120))) < 1e-6
  );
  chk(
    "spending a month, the one-time cost and free to spend add too",
    Math.abs(S.extra - (kid.extra + mv.extra)) < 1e-9 &&
      Math.abs(S.once - (kid.once + mv.once)) < 1e-9 &&
      Math.abs(S.free - (S.free0 - S.extra)) < 1e-9
  );
  chk(
    "the freedom date comes from the game's own plan with the spending of the stack",
    S.fi === freeAt(c, { monthly: S.extra, once: S.once }) && S.fi0 === freeAt(c)
  );
  chk(
    "past the last month of its simulator, a block keeps its last value",
    blocksAt({ delta: [0, -5, -9] }, 40) === -9 && blocksAt({ delta: [] }, 3) === 0
  );
  chk(
    "the screen with a stack: both columns, the chart, the words, the math",
    ov().includes("Your stack: 2 blocks") &&
      ov().includes("Plan as today") &&
      ov().includes("With your stack") &&
      ov().includes("If these assumptions hold") &&
      ov().includes("kitchart") &&
      ov().includes("Show the math") &&
      clean(ov()),
    junk(ov())
  );
  chk(
    "each label has an i",
    ["bl_block", "bl_stack", "bl_networth", "bl_free", "bl_cushion", "bl_freedom", "bl_years"].every(
      k => GLOSS[k] && ov().includes("term:" + k)
    )
  );
  X("kitset", "20", "blocks|years", { t: "n" });
  const S20 = blocksCalc(c);
  chk(
    "the horizon is a tap: 20 years",
    S20.years === 20 && S20.plan.length === 21 && S20.endPlan === simBaseline(c, 240)[240]
  );
  X("kitset", "30", "sim_kid|when", { t: "n" });
  chk(
    "a change in the simulator changes the block (the answers are shared)",
    blocksOne(c, "kid").delta.length !== kid.delta.length || blocksOne(c, "kid").extra !== kid.extra
  );
  X("blockstog", "car");
  X("kitset", "lease", "blocks|car", { t: "s" });
  chk(
    "the car block follows the chosen car option",
    blocksOne(c, "car").opt === "Lease" && ov().includes("Which car block?")
  );
  X("blockstog", "kid");
  chk("a second tap removes a block", blocksStack(c).join() === "move,car");
  const B = blocksBook(c),
    end = B.rows.find(r => r.id === "bl_end"),
    val = id => B.rows.find(r => r.id === id).v;
  chk(
    "the spreadsheet: the end is a formula, the plan plus each block",
    end.f === "={bl_plan}+{bl_d_move}+{bl_d_car}" &&
      end.v === val("bl_plan") + val("bl_d_move") + val("bl_d_car") &&
      val("bl_free") === val("bl_free0") - val("bl_x_move") - val("bl_x_car") &&
      BOOK_PARTS.includes(blocksBook)
  );
  X("simopen", "city");
  X("navback");
  chk("Back from the simulator returns to the blocks", W && W.kind === "blocks");
  chk("the i of the screen, and the menu", !!NV_INFO.blocks && MENU.some(m => m[1] === "blocks"));
  const row = btRows().find(r => r.n.startsWith("Life event blocks"));
  chk("the built list has it as built, with its screen", row && row.st === "b" && row.a === "blocks");
  const L = cxLink("geo-arbitrage-location", 23);
  chk("a real skill (re-check where you live as life changes) opens it", L && L.a === "blocks");
  X("close");
  G.chars.length = n0;
  G.active = 0;
  save();
}
