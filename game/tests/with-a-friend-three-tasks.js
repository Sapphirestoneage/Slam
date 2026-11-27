/* ============================================================================
   SLAM the Game, test: tests/with-a-friend-three-tasks.js
   PURPOSE     Examine Batch B, phase 7a (Nov 27 2026), Test with a friend with the three tasks of Eli: the
               three tasks in his words (the same list in Tester drives), the tap counter (it counts only
               while a task runs), the names of the screens, the screen where the person stopped, the
               results and the text to copy, that the record holds names and counts only (no value of a
               field, no sound, no picture), that each task can be done by a first-week player (the
               number that could be, Social Security off moves the number, Home and the next move are in
               the bar), and who can see it (the admin menu only).
   INPUT       The game scripts, loaded by harness.cjs. A made-up player from the four taps.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/testkit.js, features/thinkaloud.js, features/couldbe.js,
               features/firstweek.js, account/roles.js.
   ========================================================================= */
{
  const G0 = clone(G),
    text = h =>
      h
        .replace(/<svg[\s\S]*?<\/svg>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " "),
    junk = h =>
      (text(h).match(/undefined|NaN|\bnull\b|\u2014/g) || [])
        .concat(text(h).match(/mistake|failed|\bbehind\b|off track/gi) || [])
        .join(",");

  /* ---- 1. the three tasks ---- */
  chk(
    "the three tasks are Eli's, in his order",
    TK_TASKS.map(x => x.t).join("|") ===
      "Find out what your number could be.|Switch Social Security off and say what changed.|Get back Home and find your next move."
  );
  chk(
    "Tester drives has the same three tasks",
    TA_TASKS.join("|") === TK_TASKS.map(x => x.t).join("|") && taNew().tasks.length === 3
  );
  chk("each task has a place for the coach to look", tkTasks().length === 3 && tkTasks().every(x => x.t && x.see));
  chk("the list of tasks is a copy: a test cannot change the tasks", tkTasks()[0] !== TK_TASKS[0]);

  /* ---- 2. the pure part: taps, the path, the stop ---- */
  const s = { stage: "task" };
  chk("no task runs: a tap counts for nothing", tkTapAdd(s, "Home") === null && !s.taps);
  s.stage = "run";
  s.t0 = 1000;
  tkTapAdd(s, "Home");
  tkTapAdd(s, "Home");
  tkTapAdd(s, "Home > My number: What it is");
  chk(
    "three taps on two screens: 3 taps, and each screen once in the path",
    s.taps === 3 && s.path.join("|") === "Home|Home > My number: What it is"
  );
  for (let i = 0; i < 200; i++) tkTapAdd(s, "S" + i);
  chk("the path has an end: 40 names at most, the count goes on", s.path.length === 40 && s.taps === 203);
  tkStop(s, 46000, "Home > My number: All the ways");
  chk(
    "the stop: 45 seconds, the screen, and the coach's part comes next",
    s.secs === 45 && s.at === "Home > My number: All the ways" && s.stage === "note"
  );
  chk("after the stop a tap counts for nothing", tkTapAdd(s, "Home") === null && s.taps === 203);
  chk("the shortest time is 1 second", tkStop({ t0: 5 }, 5, "").secs === 1);

  /* ---- 3. a first-week player, from the four taps ---- */
  G = clone(G0);
  G.demo = true;
  W = null;
  X("start");
  X("cbset", "", "", { q: "age", i: 1 });
  X("cbset", "", "", { q: "spend", i: 2 });
  X("cbset", "", "", { q: "inv", i: 3 });
  X("cbset", "", "", { q: "save", i: 3 });
  X("close");
  const c = C();
  chk("the player is in the first week: a bar of four places", fwCalm() && !!fwBar());
  chk(
    "a player sees no row of the test: the admin menu only",
    RO_ONLY.testkit === "admin" &&
      !menuItems({ admin: false, coach: true }).some(m => m[1] === "testkit") &&
      menuItems({ admin: true, coach: false }).some(m => m[1] === "testkit")
  );

  /* ---- 4. the sheet before a test ---- */
  X("testkit");
  let h = ov();
  chk(
    "the sheet names the three tasks and says what is recorded",
    TK_TASKS.every(x => h.includes(esc(x.t))) &&
      /counts the taps/.test(h) &&
      /no sound and no picture of the screen/.test(h) &&
      !junk(h),
    junk(h)
  );
  chk("the old five tasks are gone", !/five/i.test(text(h)) && /Three tasks/.test(h));
  X("tkstart", String(G.active));
  h = ov();
  chk(
    "task 1 of 3 shows, with Start the test and where it lives for the coach",
    /Task 1 of 3/.test(h) && h.includes(esc(TK_TASKS[0].t)) && h.includes('data-a="tkgo"') && !junk(h),
    junk(h)
  );

  /* ---- 5. task 1: the number that could be ---- */
  X("tkgo");
  chk(
    "Start the test: Home, the task runs, the counter is at 0",
    tab === "home" && G.tk.stage === "run" && G.tk.taps === 0
  );
  chk("the name of the screen is Home", tkAt() === "Home");
  tkTapAdd(G.tk, tkAt());
  X("cbback");
  chk("My number in the bar opens the flow", !!SH && W.kind === "cb");
  chk("the name of the screen says My number and the step", /^Home > My number: /.test(tkAt()), tkAt());
  tkTapAdd(G.tk, tkAt());
  const N1 = cbNumbers(c);
  chk("task 1 can be done: the flow has a number that could be", N1.could.target > 0 && /What it could be/.test(ov()));
  const at1 = tkAt();
  X("tkback");
  chk(
    "done or stuck: the game notes 2 taps and the screen where the person stopped",
    G.tk.stage === "note" && G.tk.taps === 2 && G.tk.at === at1 && G.tk.secs >= 1
  );
  h = ov();
  chk(
    "the coach sees the taps and the stop before the tap on how it went",
    /2 taps · stopped on: /.test(text(h)),
    text(h).slice(0, 200)
  );
  X("tkout", "alone");
  chk(
    "Did it alone: the record of task 1 has the outcome, the taps, the stop and the path",
    G.tk.res[0].o === "alone" && G.tk.res[0].taps === 2 && G.tk.res[0].at === at1 && G.tk.res[0].path.length === 2
  );
  chk("task 2 waits, with a new counter", G.tk.i === 1 && G.tk.stage === "task" && G.tk.taps === 0 && !G.tk.at);

  /* ---- 6. task 2: Social Security off ---- */
  X("tkgo");
  cbWayDo("ss", "count", cbWaySets("ss", c)[2].v);
  const on = cbNumbers(c).could.target;
  X("cbback");
  X("cbgo", "ss");
  chk(
    "the Social Security step opens, and its name is in the screen name",
    W.step === "ss" && /Social Security/.test(tkAt())
  );
  tkTapAdd(G.tk, tkAt());
  X("cbpick", "0");
  const off = cbNumbers(c).could.target;
  chk("task 2 can be done: Not counting on it moves the number", c.x.ss === 0 && off > on, [on, off]);
  X("tkback");
  X("tkout", "nudge");
  chk(
    "Needed a nudge: the coach can tap where and what happened",
    /Where did they get lost/.test(ov()) && ov().includes("My number")
  );
  X("tkwhere", "My number");
  X("tkwhy", "Didn't see the button");
  X("tknext");

  /* ---- 7. task 3: back Home, the next move ---- */
  X("tkgo");
  const bar = fwBar();
  chk(
    "task 3 can be done in the first week: Home and Next Steps are in the bar",
    bar.tabs.includes("home") && bar.tabs.includes("plan")
  );
  go("plan");
  tkTapAdd(G.tk, tkAt());
  chk("the name of the tab is the name on the bar", tkAt() === "Next Steps");
  X("tkback");
  X("tkout", "stuck");
  X("tkwhere", "Next Steps");
  X("tknext");

  /* ---- 8. the results ---- */
  const r = G.tests[G.tests.length - 1];
  chk("the test is kept in the saved game and no test runs", !G.tk && !!r && r.tasks.length === 3);
  h = ov();
  chk(
    "the results show each task with its taps and where the person stopped",
    (h.match(/Stopped on: /g) || []).length === 3 && /2 taps/.test(h) && /1 tap\b/.test(h) && !junk(h),
    junk(h)
  );
  const txt = tkText(r);
  chk(
    "the text to copy has the taps, the stop, where they got lost and the screens",
    txt.includes("1. Find out what your number could be.") &&
      /Did it alone · \d+ sec · 2 taps · stopped on: Home > My number: /.test(txt) &&
      txt.includes("stopped on: Next Steps · got lost: Next Steps") &&
      txt.includes("   Screens: ") &&
      txt.includes("Alone 1, nudge 1, stuck 1."),
    txt
  );
  const keys = Object.keys(r.tasks.reduce((a, x) => Object.assign(a, x), {})).sort();
  chk(
    "the record holds names and counts only: no sound, no picture, no field value",
    keys.join() === "at,o,path,secs,t,taps,where,why" && !/\$|\d{3,}/.test(JSON.stringify(r.tasks)),
    keys.join()
  );
  X("close");

  /* ---- 9. Tester drives keeps the stop too ---- */
  const t = taNew();
  taStart(t, 0);
  taTap(t);
  taEnd(t, "done", 30000, "Home > My number: the reveal");
  chk(
    "Tester drives: the task keeps the screen where the tester stopped",
    t.tasks[0].at === "Home > My number: the reveal"
  );
  chk(
    "and the text to copy says it",
    taText(Object.assign({ d: "2026-11-27" }, t)).includes(
      "Done · 1 tap · 30 sec · stopped on: Home > My number: the reveal"
    )
  );

  /* ---- 10. Finish setup comes back to the page the player left ---- */
  G = clone(G0);
  G.demo = true;
  W = null;
  X("start");
  X("cbset", "", "", { q: "age", i: 1 });
  X("cbset", "", "", { q: "spend", i: 2 });
  X("cbset", "", "", { q: "inv", i: 3 });
  X("cbset", "", "", { q: "save", i: 3 });
  X("cbrest");
  chk("Finish setup opens the rest of setup at its first page", W.kind === "setup" && W.cbRest && W.step === 0);
  chk("with no page left before, nothing is put back", cbRestSpot() === false);
  const c2 = C();
  c2.x.spot = { kind: "setup", v: "", w: Object.assign(clone(W), { step: 4, mark: "kept" }), d: todayISO() };
  X("close");
  c2.x.spot = { kind: "setup", v: "", w: Object.assign(clone(c2.x.spot.w), { step: 4, mark: "kept" }), d: todayISO() };
  X("cbrest");
  chk(
    "a player who left a round comes back to the same page with the answers so far",
    W.kind === "setup" && W.cbRest && W.step === 4 && W.mark === "kept"
  );
  X("close");
  c2.x.spot = { kind: "setup", v: "", w: Object.assign(clone(c2.x.spot.w), { step: 4 }), d: addDays(todayISO(), -8) };
  X("cbrest");
  chk("a copy older than 7 days is not used", W.kind === "setup" && W.step === 0);
  X("close");
  c2.x.spot = { kind: "setup", v: "", w: { kind: "setup", mode: "edit", step: 4, o: {} }, d: todayISO() };
  X("cbrest");
  chk("a copy of another kind of setup is not used", W.kind === "setup" && W.step === 0 && W.mode === "new");
  X("close");
  G = clone(G0);
  W = null;
}
