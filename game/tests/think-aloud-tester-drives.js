/* ============================================================================
   SLAM the Game, test: tests/think-aloud-tester-drives.js
   PURPOSE     Examine the think-aloud test mode where the tester drives: the three default tasks, the tap
               counter of each task (it counts only while a task runs), done and skip, the totals and the
               text to copy, the words in front of a note (the task and the taps, no money number), the
               panel parts (the task, the counter, "Report this" open with the screen name), a report sent
               through Report a bug or idea, the results in the dashboard look, and who can see it (the
               admin menu only; a player sees nothing unless the mode is on).
   INPUT       The game scripts, loaded by harness.cjs. A sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/thinkaloud.js, features/fbreport.js, account/roles.js,
               screens/planner.js.
   ========================================================================= */
{
  const R0 = r => Object.assign({ s: true }, r),
    me = Object.assign(newChar(), {
      name: "Tess",
      led: true,
      placed: true,
      age: 31,
      ret: 60,
      take: 5200,
      spend: 4100,
      incs: [R0({ k: "A main job", amt: 5200 })],
      spends: [R0({ k: "Home", amt: 4100 })],
      cashes: [R0({ k: "Checking", amt: 3000 })],
      invs: [],
      debts: [],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(me);
  G.active = G.chars.length - 1;
  syncAll(me);
  G.ta = null;
  save();
  go("home");

  /* THE PURE PART */
  const s = taNew();
  chk(
    "the default tasks are Eli's three",
    s.tasks.map(x => x.t).join("|") === "Find out how close you are to FI|Do your next win|Get back Home"
  );
  chk("no task runs at the start, so a tap counts for nothing", taTap(s) === null && s.tasks[0].taps === 0);
  taStart(s, 1000);
  taTap(s);
  taTap(s);
  chk("two taps while task 1 runs: 2", s.tasks[0].taps === 2 && taTap(s) === 3);
  taEnd(s, "done", 46000);
  chk(
    "done after 45 seconds: Done, 45 sec, and task 2 waits",
    s.tasks[0].st === "done" && s.tasks[0].secs === 45 && s.i === 1
  );
  chk("a tap between tasks counts for nothing", taTap(s) === null && s.tasks[1].taps === 0);
  taStart(s, 0);
  taTap(s);
  taEnd(s, "skip", 200000);
  taStart(s, 0);
  taEnd(s, "done", 0);
  chk("the shortest time is 1 second, never 0", s.tasks[2].secs === 1);
  const S = taSummary(s);
  chk(
    "the totals: 2 done, 1 skipped, 4 taps, 246 seconds",
    S.n === 3 && S.done === 2 && S.skip === 1 && S.taps === 4 && S.secs === 246,
    JSON.stringify(S)
  );
  chk("the test is over after the last task", taOver(s) && taTap(s) === null);
  const txt = taText(Object.assign({ d: "2026-11-26" }, s));
  chk(
    "the text to copy names each task with its taps and time",
    txt.includes("1. Find out how close you are to FI\n   Done · 3 taps · 45 sec") &&
      txt.includes("   Skipped · 1 tap · 3 min") &&
      txt.includes("Done 2 of 3, 4 taps in all, 0 reports"),
    txt
  );
  const t2 = taStart(taNew(["One task"]), 0);
  taTap(t2);
  chk(
    "a note starts with the task and the taps so far",
    taNoteFor(t2, "  where is it ") === "Think-aloud, task 1 (One task), 1 tap: where is it" &&
      taNoteFor(t2, "") === "Think-aloud, task 1 (One task), 1 tap"
  );
  chk("custom tasks are kept", taNew(["A", "B"]).tasks.length === 2 && taNew([]).tasks.length === 3);

  /* WHO SEES IT */
  chk("a player sees no panel: the mode is off", !G.ta && !taOn());
  chk(
    "the menu row is for the admin only",
    RO_ONLY.thinkaloud === "admin" &&
      !menuItems({ admin: false, coach: true }).some(m => m[1] === "thinkaloud") &&
      menuItems({ admin: true, coach: false }).some(m => m[1] === "thinkaloud")
  );
  chk(
    "it sits in the Admin group, next to Test with a friend",
    MENU_GROUPS.find(g => g[0] === "admin")[3].join() === "built,testkit,thinkaloud"
  );

  /* THE SHEET BEFORE A TEST */
  X("thinkaloud");
  const sh = ov();
  chk(
    "the sheet: a title, one caption, the tasks, the address flag and one primary button",
    sh.includes("Tester drives") &&
      sh.includes('class="dkcap"') &&
      sh.includes("?think=1") &&
      sh.includes("Get back Home") &&
      (sh.match(/class="primary/g) || []).length === 1 &&
      clean(sh),
    junk(sh)
  );
  X("thinkaloud", "on");
  chk("Turn on the test: the mode is on, the sheet closes, task 1 waits", taOn() && G.ta.i === 0 && !SH);

  /* THE PANEL PARTS */
  const top = taTop(G.ta);
  chk(
    "the panel top: Task 1 of 3, the counter at 0, and Start this task",
    top.includes("Task 1 of 3") && /id="ta-n">0<\/b> taps/.test(top) && top.includes('data-a="tago"') && clean(top)
  );
  const rep = taReportPart();
  chk(
    "Report this is open: Bug, Idea, Confusing as buttons, a bordered note box with its label, Send",
    rep.includes("Report this") &&
      (rep.match(/data-a="tatype"/g) || []).length === 3 &&
      rep.includes('<label class="tiny muted" for="ta-note">') &&
      rep.includes('id="ta-note"') &&
      rep.includes('data-a="tareport"') &&
      rep.includes('id="ta-at"')
  );
  X("tago");
  chk("Start this task: task 1 runs", G.ta.tasks[0].st === "run");
  chk(
    "while it runs: I'm done and Skip this one",
    taTop(G.ta).includes('data-a="tadone"') && taTop(G.ta).includes('data-a="taskip"')
  );
  taTap(G.ta);
  taTap(G.ta);

  /* A REPORT, THROUGH REPORT A BUG OR IDEA */
  go("money");
  const before = fbQueue().length;
  X("tatype", "confusing");
  chk("a tap on Confusing picks it; a second tap would clear it", TA.type === "confusing");
  ACT.tareport();
  setTimeout(() => {
    const q = fbQueue(),
      row = q[0] && q[0].row;
    chk("the report is in the same list as Report a bug or idea", q.length === before + 1, q.length);
    chk(
      "it carries the screen name and the task, with the taps",
      row &&
        row.screen === "money" &&
        row.type === "confusing" &&
        row.note === "Think-aloud, task 1 (Find out how close you are to FI), 2 taps",
      row && JSON.stringify([row.screen, row.note])
    );
    chk("the count of reports goes up, and the type is cleared", G.ta.sent === 1 && TA.type === null);

    /* THE RESULTS */
    X("tadone");
    X("taskip");
    chk("done and skip move on: task 3 waits", G.ta.i === 2 && G.ta.tasks[1].st === "skip");
    X("tago");
    X("tadone");
    chk(
      "the panel says all tasks are done",
      taTop(G.ta).includes("All 3 tasks are done") && taTop(G.ta).includes('data-v="now"')
    );
    X("taview", "now");
    const res = ov();
    chk(
      "the results: a stat row (tasks done, taps, time, reports) and a card for each task",
      res.includes('class="dkstats"') &&
        res.includes("2 of 3") &&
        res.includes("Taps in all") &&
        (res.match(/class="card dkcard/g) || []).length === 3 &&
        clean(res),
      junk(res)
    );
    chk(
      "no verdict words, no red: Done and Skipped only",
      !/fail|wrong|bad\b/i.test(res.replace(/data-[a-z]+="[^"]*"/g, ""))
    );
    X("taquit");
    chk(
      "End the test: the mode is off and the run is kept",
      !G.ta && G.taRuns.length >= 1 && G.taRuns.slice(-1)[0].sent === 1
    );
    X("thinkaloud");
    chk("the past test shows in the sheet", ov().includes("Past tests") && ov().includes("Done 2 of 3"));
    X("close");
  }, 300);
}
