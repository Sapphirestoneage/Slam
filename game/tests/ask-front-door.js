/* ============================================================================
   SLAM the Game, test: tests/ask-front-door.js
   PURPOSE     Examine the Ask front door: the row on Home under the top numbers, and its four sheets.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile with a payday on file.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/ask3.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    t = todayISO(),
    a = Object.assign(newChar(), {
      name: "Ask",
      led: true,
      placed: true,
      age: 30,
      ret: 60,
      take: 5000,
      spend: 4000,
      inv: 30000,
      payKnown: true,
      payNext: addDays(t, 10),
      incs: [R0({ k: "A main job", amt: 5000 })],
      spends: [
        R0({ k: "Home", amt: 2000 }),
        R0({ k: "Bills and subscriptions", amt: 300 }),
        R0({ k: "Food", amt: 1000 }),
        R0({ k: "Fun and everything else", amt: 700 }),
      ],
      cashes: [R0({ k: "Checking", amt: 3000 })],
      invs: [R0({ k: "IRA or Roth IRA", amt: 30000 })],
      debts: [],
      goals: [{ id: "g1", k: "Trip", n: "Lisbon", cost: 4000, era: 4, fund: 0 }],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C(),
    h = app();
  chk(
    "one row on Home right under the top numbers, with four big buttons",
    h.includes("frontrow") &&
      (h.match(/class="frontbtn"/g) || []).length === 4 &&
      h.indexOf("frontrow") > h.indexOf('class="quad"')
  );
  const S = frontSafeCalc(c, 50, t),
    room = derive(c).cash - (2300 * 10) / 30.44 - 4000 / 4.345;
  chk(
    "safe to spend: cash minus bills before payday minus a week of buffer",
    Math.abs(S.room - room) < 1e-6 && S.days === 10
  );
  chk("a small amount is a yes", frontSafeCalc(c, 50, t).ans === "yes");
  chk("an amount past free to spend but inside the room is yes, but", frontSafeCalc(c, 700, t).ans === "yesbut");
  chk(
    "an amount past the room is wait until payday, never a flat no",
    frontSafeCalc(c, 2500, t).ans === "wait" && frontSafeCalc(c, 2500, t).light !== "red"
  );
  X("front", "safe");
  X("frontamt", "2500");
  chk(
    "the sheet says wait until a date, the cushion left, the trade-off, the math",
    ov().includes("Wait until") &&
      ov().includes("months</b> of cushion") &&
      ov().includes("Show the math") &&
      clean(ov()),
    junk(ov())
  );
  const F = frontSpendCalc(c),
    fs = freeToSpend(c, derive(c));
  chk(
    "how much can I spend: today, week, month, year from free to spend",
    Math.abs(F.month - fs.free) < 1e-9 &&
      Math.abs(F.today - fs.free / 30.44) < 1e-9 &&
      F.week === fs.week &&
      F.year === fs.free * 12
  );
  X("front", "spend");
  chk(
    "the sheet has the four numbers and the guilt-free number",
    ov().includes("This week") && ov().includes("This year") && ov().includes("guilt-free") && clean(ov())
  );
  X("front", "do");
  chk("what should I be doing: the top gap and the next 2", ov().includes("See my plan on one page") && clean(ov()));
  const Gx = frontGoalsCalc(c, 1000, false);
  chk(
    "how does this change my goals: each goal, the hours, the freedom date",
    Gx.goals.length === 1 && Gx.goals[0].days != null && Gx.goals[0].days >= 0 && Gx.hours > 0 && Gx.fiDays >= 0
  );
  X("front", "goals");
  X("frontamt", "1000");
  chk(
    "the sheet shows the goal, the hours of work, and a simulator link",
    ov().includes("Lisbon") && ov().includes("Hours of work") && ov().includes('data-a="simopen"') && clean(ov()),
    junk(ov())
  );
  G.chars.length = n0;
  G.active = 0;
  save();
}
