/* ============================================================================
   SLAM the Game, test: tests/kids-mode.js
   PURPOSE     Examine Kids mode: a kid profile apart from the players, the lessons, one lesson from the
               idea to the end, and the run that forgives one missed day.
   INPUT       The game scripts, loaded by harness.cjs.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/kids.js, data/kidlessons.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    kids0 = G.kids,
    a = Object.assign(newChar(), { name: "Pat", led: true, placed: true });
  G.demo = false;
  G.tourSeen = true;
  G.kids = [];
  G.chars.push(a);
  G.active = n0;
  save();
  chk(
    "20 lessons, each with one idea and two questions",
    KID_LESSONS.length === 20 && KID_LESSONS.every(l => l.idea.length > 40 && l.q.length === 2)
  );
  chk(
    "each question has three answers, a right one, and a reason",
    KID_LESSONS.every(l => l.q.every(q => q[1].length === 3 && q[2] >= 0 && q[2] < 3 && q[3].length > 10))
  );
  chk("no lesson id is used twice", new Set(KID_LESSONS.map(l => l.id)).size === 20);
  /* the numbers of the questions, by hand */
  const Q = (id, i) => {
    const q = KID_LESSONS.find(l => l.id === id).q[i];
    return q[1][q[2]];
  };
  chk(
    "the worked answers are right",
    Q("pay", 0) === "$170" &&
      Q("hours", 0) === "5 hours" &&
      Q("plan", 0) === "$200" &&
      Q("first", 1) === "$650" &&
      Q("interest", 0) === "$4" &&
      Q("compound", 0) === "9 years" &&
      Q("cardcost", 0) === "$20" &&
      Q("fees", 0) === "$10" &&
      Q("insure", 1) === "$700"
  );
  chk("the run: the first lesson is 1", kidRunNext(0, "", "2026-11-24") === 1);
  chk("the run: the next day adds 1", kidRunNext(3, "2026-11-23", "2026-11-24") === 4);
  chk("the run: one missed day is forgiven", kidRunNext(3, "2026-11-22", "2026-11-24") === 4);
  chk("the run: two missed days start again at 1", kidRunNext(3, "2026-11-21", "2026-11-24") === 1);
  chk("the run: a second lesson on the same day does not add", kidRunNext(3, "2026-11-24", "2026-11-24") === 3);
  X("kids");
  chk(
    "the sheet offers to add a kid, by a tap",
    ov().includes("Add a kid") && ov().includes("My teen") && clean(ov()),
    junk(ov())
  );
  X("kidadd", "My teen");
  chk("a kid is not a player", G.kids.length === 1 && G.chars.length === n0 + 1);
  chk(
    "the lesson of today is marked, and no lesson is locked",
    ov().includes("Today's lesson") && !ov().includes("disabled") && clean(ov()),
    junk(ov())
  );
  X("kidlesson", "0");
  chk("a lesson starts with the idea", ov().includes("The idea") && ov().includes("gross pay"));
  X("kidgo");
  chk("then a question with three answers", ov().includes("Question 1 of 2") && ov().includes("$170"));
  X("kidpick", "0");
  chk(
    "a wrong answer gets the reason, with no verdict word",
    ov().includes("Not this one") && ov().includes("Here is why") && !/wrong|incorrect|fail/i.test(ov())
  );
  X("kidgo");
  X("kidpick", "1");
  chk("a right answer says yes", ov().includes("Yes."));
  X("kidgo");
  const k = G.kids[0];
  chk(
    "the lesson is done, with the right answers of the first try",
    !!k.done.pay && k.right.pay === 1 && k.run === 1 && ov().includes("Lesson done") && clean(ov()),
    junk(ov())
  );
  X("kidlesson", "");
  chk(
    "after the lesson of today, the screen says to come back tomorrow",
    ov().includes("today's lesson, done") && kidNext(k).id === "hours"
  );
  const S = kidStats(k, todayISO());
  chk("the stats", S.done === 1 && S.asked === 2 && S.right === 1 && S.today);
  X("close");
  X("people");
  chk("People has the row", ov().includes("Kids mode"));
  X("close");
  chk("built list", btRows().some(r => r.n.startsWith("Kids mode") && r.st === "b") && btCount(btRows()).x === 0);
  G.chars.length = n0;
  G.active = 0;
  G.kids = kids0;
  save();
}
