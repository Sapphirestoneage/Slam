/* ============================================================================
   SLAM the Game, test: tests/fire-statuses.js
   PURPOSE     Examine the FIRE statuses (Eli, 2026-11-27): Coast, Lean, Barista, FI, Chubby and Fat are
               statuses on the one path, not goals. The list with its numbers and dates, the markers on
               the life map, on the route card and on the journey, the one-time card with "Options this
               opens", the next win that stays the same, and the quiet line when the invested money is
               under a status again.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: core/statuses.js, features/coast.js, features/lifemap.js,
               features/results.js, features/trip.js.
   ========================================================================= */
{
  const fs = require("fs"),
    path = require("path"),
    crypto = require("crypto");
  const src = fs.readFileSync(path.join(GAME_DIR, "..", "js", "math", "statuses.js"), "utf8"),
    data = JSON.parse(fs.readFileSync(path.join(GAME_DIR, "..", "data", "library", "status-options.json"), "utf8")),
    copy = fs.readFileSync(path.join(GAME_DIR, "core", "statuses.js"), "utf8"),
    hash = crypto.createHash("sha256").update(src).update(JSON.stringify(data)).digest("hex").slice(0, 16);
  chk(
    "core/statuses.js is a current copy of js/math/statuses.js and the options file (node tools/game_statuses_build.mjs)",
    copy.includes("SOURCE-HASH  " + hash) && ST_OPTIONS.draft === true
  );
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Marker",
      led: true,
      placed: true,
      age: 35,
      ret: 65,
      take: 5000,
      spend: 3000,
      inv: 30000,
      incs: [R0({ k: "A main job", amt: 5000 })],
      spends: [R0({ k: "Home", amt: 1500 }), R0({ k: "Food", amt: 1000 }), R0({ k: "Fun", amt: 500 })],
      cashes: [R0({ k: "Checking", amt: 9000 })],
      invs: [R0({ k: "IRA or Roth IRA", amt: 30000 })],
      debts: [],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  const c = C(),
    setInv = v => {
      c.invs[0].amt = v;
      syncAll(c);
      save();
    };
  /* the list: needs 2,500 a month of 3,000; Lean is the freedom number with only the needs to pay */
  const d0 = derive(c),
    K0 = stGame(c, d0),
    by = k => stGame(c).list.find(s => s.key === k);
  chk("the six statuses, in one order", K0.list.map(s => s.key).join() === ST_KEYS.join());
  chk("Coast is the Coast number of the game", Math.abs(by("Coast").value - d0.coastNum) < 1e-9);
  const lean = fiNeed(c, c.age, { passive: 500 });
  chk(
    "Lean is the freedom number with only the needs to pay",
    Math.abs(by("Lean").value - lean) < 1e-6 && lean < d0.fi,
    lean
  );
  chk("FI is the freedom number of the game", Math.abs(by("FI").value - d0.fi) < 1e-9);
  chk(
    "Barista, Chubby and Fat have no number in the game, and say so",
    ["Barista", "Chubby", "Fat"].every(k => by(k).value === null && by(k).needs.length === 1 && !by(k).reached)
  );
  chk(
    "each status with a number has a level and its math",
    K0.list.filter(s => s.value != null).every(s => ST_LEVELS.includes(s.level) && s.math.length >= 2)
  );
  chk(
    "a date at today's pace, in date order on the markers",
    K0.markers.length >= 2 && K0.markers.every((m, i) => i === 0 || m.months >= K0.markers[i - 1].months),
    JSON.stringify(K0.markers.map(m => [m.key, m.months]))
  );
  chk(
    "the Coast date is the month the saving closes the gap (rcCoast)",
    by("Coast").months ===
      rcCoast({
        invested: c.inv,
        coast: d0.coastNum,
        monthly: d0.save / 12,
        realReturn: R,
        nowAt: todayISO(),
        maxMonths: 360,
      }).months
  );
  chk(
    "the Lean date is the same run of the plan, with only the needs to pay",
    by("Lean").months === freeAt(c, { passive: 500 }) && by("Lean").months <= by("FI").months
  );
  chk("the FI date is the FI date of the game", by("FI").months === freeAt(c));
  chk("nothing reached: no card, no line", K0.card === null && K0.below === null);
  go("home");
  chk("Home has no status card", !app().includes("stcard"));
  /* the markers: the life map, the route card, the journey */
  const M0 = ltMap(c, d0);
  chk(
    "the life map keeps its ten eras, in order, and adds the Lean marker between them",
    M0.rows.filter(r => r.step).length === 10 &&
      M0.rows.filter(r => r.step).every((r, i) => r.step === M0.eras[i]) &&
      M0.rows.some(r => r.status && r.status.key === "Lean")
  );
  chk(
    "Coast and FI are eras of the map: no second marker for them",
    !M0.rows.some(r => r.status && (r.status.key === "Coast" || r.status.key === "FI"))
  );
  X("tab", "map");
  chk(
    "the map shows the marker and the row of six statuses",
    app().includes("ltmark") &&
      app().includes('data-a="ltstatus" data-v="Lean"') &&
      app().includes("ltsts") &&
      clean(app()),
    junk(app())
  );
  X("ltstatus", "Lean");
  chk(
    "the sheet of a status: the number, the date, the math, the options",
    ov().includes("Lean FI") && ov().includes("Options this opens") && ov().includes("Show the math") && clean(ov()),
    junk(ov())
  );
  X("close");
  X("ltstatus", "Fat");
  chk(
    "a status with no number says why, with no made-up number",
    ov().includes("does not work this number out yet") && clean(ov())
  );
  X("close");
  const J = tpgJourney(c).J,
    JR = tpgStatusRows(c, J);
  chk(
    "the journey keeps its stages, in order, and has the Lean marker",
    JR.filter(r => r.step).every((r, i) => r.step === J.stages[i]) &&
      JR.filter(r => r.step).length === J.stages.length &&
      JR.some(r => r.status && r.status.key === "Lean")
  );
  /* reaching Coast: the card, one time, and the next win stays */
  setInv(Math.ceil(d0.coastNum) + 1000);
  const K1 = stGame(c);
  chk(
    "at the Coast number: the Coast card",
    K1.card && K1.card.key === "Coast" && K1.card.title === "You can stop sprinting"
  );
  go("home");
  const card = (app().split('data-st="Coast"')[1] || "").split("Got it")[0];
  chk(
    "the card says what changed, the options and that the next step stays",
    card.includes("Options this opens") &&
      card.includes("Your next step stays the same. These are options.") &&
      card.includes("Show the math") &&
      card.includes("kitst"),
    card.slice(0, 200)
  );
  const opts = card.match(/class="rowbtn stopt" data-a="([a-z0-9]+)"/g) || [];
  chk(
    "2 to 4 options, each a tap to a tool that exists",
    opts.length >= 2 && opts.length <= 4 && K1.card.options.every(o => typeof ACT[o.game] === "function"),
    opts.length
  );
  chk(
    "every option of every status opens a tool of the game",
    ST_KEYS.every(k => ST_OPTIONS.statuses[k].options.every(o => typeof ACT[o.game] === "function"))
  );
  chk(
    "no red, no verdict word on the card",
    !/class="[^"]*(red|bad|warn)[^"]*"/.test(card) && !/behind|off track|fail|mistake/i.test(card)
  );
  chk(
    "the route card names the status reached",
    /Status reached: Coast\./.test(rsRouteStatus(c, derive(c))) && app().includes("rsst")
  );
  const w1 = JSON.stringify(rsNextWin(c, derive(c)));
  X("coastok");
  chk("one tap closes it, with the day", C().x.coast.seen === todayISO());
  chk("the card shows one time only", stGame(C()).card === null && !app().includes("stcard"));
  chk("the next win is the same after the card", JSON.stringify(rsNextWin(C(), derive(C()))) === w1);
  chk("the next win is a step, not a FIRE type", !/Lean|Barista|Chubby|Fat FI/.test(rsNextWin(C(), derive(C())).t));
  /* reaching Lean: its own card, its own tap */
  setInv(Math.ceil(lean) + 10000);
  const w2 = JSON.stringify(rsNextWin(c, derive(c)));
  const K2 = stGame(c);
  chk("at the Lean number: the Lean card", K2.card && K2.card.key === "Lean", K2.card && K2.card.key);
  go("home");
  chk("the card of Lean closes with its own tap", app().includes('data-a="stok" data-v="Lean"'));
  X("stok", "Lean");
  chk(
    "closed: kept with the day, the next win the same",
    C().x.coast.st.Lean === todayISO() &&
      JSON.stringify(rsNextWin(C(), derive(C()))) === w2 &&
      stGame(C()).card === null
  );
  /* back under Lean: the quiet line */
  setInv(Math.ceil(lean) - 10000);
  const K3 = stGame(c);
  chk(
    "under Lean again: Below Lean by the gap, with the new date",
    K3.below &&
      K3.below.key === "Lean" &&
      /^Below Lean by \$[\d,]+\. New Lean date: [A-Z][a-z]{2} \d{4}\.$/.test(K3.below.line) &&
      Math.abs(K3.below.by - (lean - c.inv)) < 1e-6,
    K3.below && K3.below.line
  );
  go("home");
  const below = (app().split("stbelow")[1] || "").split("Got it")[0];
  chk(
    "Home shows it as Recalculating, not as a warning",
    below.includes("Recalculating") &&
      !/class="[^"]*(red|bad|warn)[^"]*"/.test(below) &&
      !/warning|behind|off track|mistake|fail/i.test(below)
  );
  chk("the first card does not come back", !app().includes("stcard"));
  X("stbelowok", "Lean");
  chk("one tap closes the line for this month", stGame(C()).below === null && !app().includes("stbelow"));
  /* a guess gets no card */
  c.invs[0].s = false;
  delete c.x.coast;
  syncAll(c);
  chk("on a Guess: no card", stGame(c).st === "Guess" && stGame(c).card === null);
  c.invs[0].s = true;
  /* the spreadsheet */
  const row = id => cstBook(C()).rows.find(r => r.id === id);
  chk("the spreadsheet has the Lean number", row("fr_lean") && Math.abs(row("fr_lean").v - lean) < 1e-6);
  const files = ["features/coast.js", "features/lifemap.js", "core/statuses.js"].map(f =>
    fs.readFileSync(GAME_DIR + f, "utf8")
  );
  chk(
    "no em dash and no en dash in the files",
    !files.some(s => s.includes(String.fromCharCode(8212)) || s.includes(String.fromCharCode(8211)))
  );
  G.chars.splice(n0, 1);
  G.active = 0;
  save();
}
