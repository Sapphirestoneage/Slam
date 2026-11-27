/* ============================================================================
   SLAM the Game, test: tests/usability-repairs.js
   PURPOSE     Examine the repairs from the usability audit: one question open at a time, the line that
               says where the player came from, a header on each sheet, and setup as a full screen.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: screens/tidy.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    R = r => Object.assign({ s: false }, r),
    a = Object.assign(newChar(), {
      name: "Tia",
      led: true,
      placed: false,
      age: 30,
      ret: 60,
      take: 4000,
      spend: 3000,
      inv: 5000,
      incs: [R({ k: "A main job", amt: 4000 })],
      spends: [R({ k: "Home", amt: 1800 }), R({ k: "Food", amt: 1200 })],
      cashes: [R({ k: "Checking", amt: 900 })],
      invs: [R({ k: "Retirement plan at work", amt: 5000 })],
      debts: [],
    });
  G.demo = false;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C();
  X("hrs");
  let o = ov();
  chk(
    "two questions on one screen fold to one open at a time",
    (o.match(/<details class="fld"/g) || []).length === 2 &&
      (o.match(/<details class="fld" name="fld" data-i="\d+" open>/g) || []).length === 1 &&
      o.includes("1 of 2") &&
      !o.includes('data-a="fldgo"')
  );
  chk("nothing is removed, only folded", o.includes('data-a="hrset"') || (o.match(/class="chip/g) || []).length >= 10);
  X("fldgo", "1");
  o = ov();
  chk(
    "Next opens the second one and folds the first",
    TDX.open.hrs === 1 &&
      /<details class="fld" name="fld" data-i="1" open>/.test(o) &&
      !/<details class="fld" name="fld" data-i="0" open>/.test(o)
  );
  X("navclose");
  X("lever");
  chk("a screen with no question blocks is left alone", !ov().includes('class="fld"'));
  X("lvopen", "two");
  chk("three knobs fold too", (ov().match(/<details class="fld"/g) || []).length === 3);
  X("lever");
  X("lvopen", "stretch");
  X("lvgo", "stretch");
  o = ov();
  chk(
    "a jump into another tool says where you came from",
    W.kind === "mult" && o.includes("You came here from Which lever matters most. Back takes you there.")
  );
  X("navback");
  chk("and Back does return there", W.kind === "lever");
  X("navclose");
  X("mult");
  chk("opening a tool directly shows no such line", !ov().includes("You came here from"));
  X("navclose");
  celebrate("A test win", ["one"]);
  drawSheet();
  o = ov();
  chk(
    "screens that had no header now get Back and the X",
    o.includes('data-a="navback"') && o.includes('data-a="navclose"') && o.indexOf("nvhead") < o.indexOf("A test win")
  );
  X("navclose");
  X("sharp", "take");
  o = ov();
  chk(
    "onboarding is its own full screen with one meter that fills",
    o.includes('<div class="overlay full">') &&
      o.includes('class="obtrack"') &&
      o.includes('class="spmeter"') &&
      o.includes("Step 3 of 4: <b>Make your numbers real</b>") &&
      o.includes("Then: Your first answer") &&
      !o.includes("obsegs")
  );
  X("navclose");
  X("lever");
  chk("other tools still open as a sheet", !ov().includes("overlay full") && !ov().includes("obtrack"));
  X("navclose");
  X("start");
  o = ov();
  chk(
    "Change my answers is full screen, step 1 of 4, on one meter",
    W.kind === "setup" &&
      W.mode === "edit" &&
      o.includes("overlay full") &&
      o.includes("Step 1 of 4: <b>About you</b>") &&
      o.includes('class="spmeter"') &&
      !o.includes("obsegs")
  );
  closeSheet();
  openSetup();
  o = ov();
  chk(
    "setup opens on one question, with no numbered circles",
    o.includes("How old are you?") &&
      !o.includes("Exactly how old?") &&
      !o.includes("field smopen") &&
      !o.includes('class="smdot ') &&
      /data-fid="su:taps">\d+ questions left/.test(o) === false
  );
  const left0 = smLeft(W);
  X("agedec", "30s", "ageDec");
  o = ov();
  chk(
    "the decade is not stacked above: only the exact age is asked",
    o.includes("Exactly how old?") && !o.includes('data-a="agedec"') && !o.includes("smans")
  );
  X("setn", "34", "age");
  o = ov();
  chk(
    "age moves on to your work (About you, run SLAM-ONBOARD-1), and the counter drops by one",
    W.o.age === 34 && W.step === 1 && o.includes("<h2>About you</h2>") && smLeft(W) === left0 - 1
  );
  W.step = 7;
  drawSheet();
  const len1 = ov().length,
    l7 = smLeft(W);
  X("set", "Yes", "can1k");
  o = ov();
  chk(
    "answering does not make the page much longer: the answer folds into one line",
    (o.match(/field smopen/g) || []).length === 1 && Math.abs(o.length - len1) < 600 && smLeft(W) === l7 - 1,
    [o.length - len1, smLeft(W) - l7]
  );
  X("spline", "7", "can1k");
  chk(
    "tapping the line of an answer reopens that question with its answer lit",
    /class="chip on[^"]*"[^>]*data-v="Yes"/.test(ov())
  );
  W.step = 0;
  X("smage");
  o = ov();
  chk("asking the age again", W.o.age === null && o.includes('data-a="agedec"'));
  X("navclose");
  openSetup();
  X("agedec", "20s", "ageDec");
  X("setn", "25", "age");
  W.step = 4;
  drawSheet();
  chk("page 5 has no fast finish now: each round shows its own number", !ov().includes('data-a="speedfin"'));
  closeSheet();
  X("mtype");
  o = ov();
  chk(
    "money type shows one statement at a time",
    (o.match(/<details class="fld"/g) || []).length === 3 && (o.match(/data-i="\d+" open>/g) || []).length === 1
  );
  X("mtans", "3", "0");
  o = ov();
  chk("and an answer opens the next statement by itself", /data-i="1" open>/.test(o) && /fldhint ok">[^<]+ ✓/.test(o));
  X("fldgo", "0");
  X("mtans", "2", "0");
  chk("changing an answer you already gave stays put", /data-i="0" open>/.test(ov()));
  chk(
    "an answered question offers Next by name, an unanswered one does not need it",
    ov().includes('data-a="fldgo" data-v="1"') && !ov().includes('data-a="fldgo" data-v="2"')
  );
  X("mtnext");
  chk("Next with one unanswered opens that one", W.err === true && /data-i="1" open>/.test(ov()));
  X("navclose");
  X("gadd");
  X("gkind", "Trip");
  o = ov();
  chk(
    "the optional name and date fold away on the goal screen",
    o.includes('<details class="math"><summary>Add a name or a date. You can skip this') && o.includes('data-a="gamt"')
  );
  X("navclose");
  X("l1");
  chk("the three quick games are step 2 of 4", ov().includes("Step 2 of 4: <b>Three quick games</b>"));
  X("navclose");
  X("fair");
  chk("one main button on the fair-split screen", (ov().match(/class="primary[^"]*"/g) || []).length <= 1);
  X("navclose");
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  save();
  go("home");
}
