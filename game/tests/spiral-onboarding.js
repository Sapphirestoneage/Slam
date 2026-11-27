/* ============================================================================
   SLAM the Game, test: tests/spiral-onboarding.js
   PURPOSE     Examine the rest of setup (it comes after What it is / What it could be) as a spiral: the five rounds in the order D, A, I, T, E, one number for each
               round with its Guess tag, the chain and the route strip, the level change with "Next" and
               "Stop here", the checklist of the round, the 50/30/20 summary, and "Your first plan" (now the
               payoff reveal of results.js, with the route and the inputs it depends on most inside it).
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/spiral.js, screens/smart.js, screens/ui.js (setupSheet).
   ========================================================================= */
{
  const G0 = clone(G);
  G.demo = true;
  /* Next, as a person taps it: not within a moment of a page that moved on by itself (smart.js) */
  const N = () => {
    if (W && W.sm) W.sm.adv = 0;
    X("wnext");
  };
  /* Run A (Nov 27 2026): the spiral rounds are the rest of setup now. A new player's Start opens What it is /
     What it could be (features/couldbe.js); its last screen and Next Steps open these rounds. */
  X("start");
  chk(
    "Start of a new player opens the one opening, not the rounds",
    W && W.kind === "cb" && W.step === "wants" && !/Question 1 of 5/.test(ov()),
    W && W.kind
  );
  closeSheet();
  openSetup("new");
  let h = ov();
  chk(
    "setup starts on About you with one meter, no numbered circles",
    /<h2>About you<\/h2>/.test(h) && h.includes('class="spmeter"') && !h.includes("smdot")
  );
  X("agedec", "30s", "ageDec");
  X("setn", "31", "age");
  h = ov();
  /* Run SLAM-ONBOARD-1 (Nov 27 2026): About you holds the four pages of taps, before the first letter */
  chk(
    "after age, About you goes on with your work: no letter yet",
    W.step === 1 && /<h2>About you<\/h2>/.test(h) && !h.includes("Question 1 of 5"),
    W.step
  );
  X("set", "Between jobs", "work");
  X("tog", "Unemployment or benefits", "incKinds");
  X("tog", "Help from family", "incKinds");
  X("smdone", null, "incKinds");
  X("set", "Changes month to month", "steady");
  chk("then your home", W.step === 2 && /<h2>About you<\/h2>/.test(ov()), W.step);
  X("set", "I rent", "homeQ");
  X("tog", "Roommates", "live");
  X("smdone", null, "live");
  chk("roommates: how many (amounts.js)", ov().includes("How many roommates live with you?"));
  X("set", "2", "roommateQ");
  chk("then your people", W.step === 3, W.step);
  X("set", "Single by choice", "rel");
  X("set", "None", "deps");
  X("set", "No one", "share");
  h = ov();
  chk(
    "About you ends on how money feels: the page waits for it",
    W.step === 3 && h.includes("How do you feel when you think about money?") && h.includes('data-a="smskip"'),
    W.step
  );
  X("set", "Mostly fine", "feel0");
  h = ov();
  chk(
    "round 1 is D: Debts, and it starts with the kinds of debt",
    W.step === 4 && h.includes("Question 1 of 5") && h.includes("<b>Debts</b>: What you owe"),
    W.step
  );
  chk("the kinds of debt have the credit card balance", h.includes('data-v="Credit card balance"'));
  X("tog", "Credit card balance", "debtKinds");
  X("tog", "Student loans", "debtKinds");
  N();
  chk("then the credit cards, after the kinds (amounts.js)", W.step === 9, W.step);
  N();
  chk("the last page of a round names its number", W.step === 10 && ov().includes("See my debts number"), W.step);
  N();
  h = ov();
  chk(
    "the round ends on ONE number for D, a Guess",
    W.sp && W.sp.at === "reveal" && /data-fid="sp:big">\$34,000</.test(h) && h.includes(kitPill("Guess")),
    W.sp
  );
  chk(
    "the number says where it is from",
    h.includes("Where's this from?") && /credit card balance about \$6,000/.test(h)
  );
  chk(
    "the route strip starts",
    h.includes('class="sproute') && h.includes("Your route starts here") && h.includes("You are here")
  );
  chk("one link in the chain so far", (h.match(/class="spl /g) || []).length === 1);
  X("spnext");
  h = ov();
  chk(
    "the level change: Debts done, now Assets",
    /Debts ✓, now Assets/.test(h) && h.includes('data-a="spgo"') && h.includes("Stop here, I'll come back")
  );
  chk(
    "the level change shows what was put in, tappable",
    h.includes('data-a="spline"') && h.includes("Credit card balance, Student loans")
  );
  X("spgo");
  chk("round 2 is A: where your money lives", W.step === 5 && ov().includes("Question 2 of 5"));
  X("tog", "Checking", "accts");
  X("tog", "IRA or Roth IRA", "accts");
  N();
  chk("A asks each account next (amounts.js)", W.step === 11, W.step);
  N();
  chk("A has a second page: your cushion", W.step === 7 && /A surprise \$1,000 bill/.test(ov()));
  X("set", "No", "can1k");
  chk("the checklist shows the answer as a line above", ov().includes("✓ <b>A $1,000 surprise:</b> No"));
  X("set", "Less than a month", "cover");
  X("set", "Sometimes", "invest");
  h = ov();
  chk(
    "A ends on what you have, as a range",
    W.sp && W.sp.r === 2 && /data-fid="sp:big">about \$/.test(h) && h.includes("net worth of"),
    W.sp
  );
  chk(
    "two links in the chain now, the new one marked",
    (h.match(/class="spl /g) || []).length === 2 && h.includes("spl spnew")
  );
  X("spnext");
  X("spgo");
  chk("round 3 is I: each source of money (amounts.js)", W.step === 12 && ov().includes("Question 3 of 5"), W.step);
  N();
  h = ov();
  chk("I ends on money coming in", W.sp && W.sp.r === 3 && /\$1,500 a month/.test(h), W.sp);
  chk("the I line links it to what you owe", h.includes("months of what comes in"));
  X("spnext");
  X("spgo");
  h = ov();
  chk(
    "round 4 is T, and the match question is gone for a player between jobs",
    W.step === 8 && h.includes("Question 4 of 5") && !/a match\)/.test(h)
  );
  X("set", "About 15%", "taxQ");
  X("set", "Yes, some", "taxAcctQ");
  h = ov();
  chk(
    "T ends on taxes off the top, Close after a tap",
    W.sp && W.sp.r === 4 && h.includes(kitPill("Close")) && /about 15% comes off the top/.test(h),
    W.sp
  );
  X("spnext");
  X("spgo");
  chk("round 5 is E: spending group by group (amounts.js)", W.step === 13 && ov().includes("Question 5 of 5"), W.step);
  N();
  h = ov();
  chk(
    "E has a last page with one optional tap: Social Security",
    W.step === 6 && h.includes("Social Security") && !h.includes("How do you feel when you think about money?"),
    W.step
  );
  X("set", "Yes, in full", "ssq");
  N();
  h = ov();
  chk(
    "E ends on money going out, and the money left links to the route",
    W.sp && W.sp.r === 5 && /\$3,000 a month/.test(h) && /more goes out than comes in/.test(h),
    W.sp
  );
  chk("the route strip recalculates from round to round", h.includes("Your route") && !h.includes("starts here"));
  chk("five links in the chain", (h.match(/class="spl /g) || []).length === 5);
  X("spnext");
  h = ov();
  chk(
    "the last level change sums up the spending next to 50/30/20, with no grade",
    h.includes("50/30/20") &&
      /Needs .*: <b>\d+%<\/b>/.test(h) &&
      h.includes("One takeaway") &&
      !/too much|bad|failed/i.test(h)
  );
  chk("the last level change goes to the first plan", h.includes("Next: your first plan"));
  /* change an earlier answer from the checklist: the same question comes back with the answer lit */
  X("spline", "6", "ssq");
  chk(
    "a checklist line opens the same question with its answer lit",
    W.step === 6 && /class="chip on[^"]*"[^>]*data-v="Yes, in full"/.test(ov())
  );
  X("set", "No, leave it out", "ssq");
  chk("the change is kept", W.o.ssq === "No, leave it out");
  for (let i = 0; i < 6 && W.kind === "setup" && !W.sp; i++) N();
  chk("the round shows its number again, recalculated", W.sp && W.sp.r === 5, W.sp);
  X("spnext");
  X("spgo");
  h = ov();
  chk("the first plan opens after the fifth round", W && W.kind === "firstplan" && !G.demo, W && W.kind);
  chk(
    "the first plan is the one payoff reveal, with the route inside it (results.js)",
    h.includes("Here's where you stand") && h.includes("<summary>Your route, stop by stop</summary>")
  );
  chk(
    "the route: destination, you are here, next stop, then",
    ["Destination", "You are here", "Next stop", "Then"].every(t => h.includes(t))
  );
  chk(
    "it says what it depends on, with Sharpen",
    h.includes("It depends on") && h.includes('data-a="sharp"') && h.includes("Sharpen")
  );
  chk("it ends on one button: Start my first win", h.includes('data-a="rsfirst">Start my first win'));
  chk("the first plan is clean", clean(h), junk(h));
  /* the accuracy and focus taps stay on Me > Strengths and your element */
  W = { kind: "elem", i: 2, plan: true };
  sheet(elSheet);
  chk(
    "accuracy as a tap, on the element screens",
    W.kind === "elem" && W.i === 2 && ov().includes("Does this feel accurate?") && ov().includes("tap 1 of 2")
  );
  X("elacc", "Mostly");
  chk("then focus as a tap", W.i === 3 && ov().includes("tap 2 of 2"));
  const c = C();
  chk(
    "the taxes round landed on the profile",
    c.x.taxPct === 15 && c.tax === "some" && c.sharp.tax === true && c.taxQ === undefined
  );

  /* the math of the route and of what it depends on */
  const p = clone(c);
  p.incs = [{ k: "A main job", amt: 4000, s: false }];
  p.spends = [
    { k: "Home", amt: 1500, s: false },
    { k: "Food", amt: 500, s: false },
    { k: "Fun and everything else", amt: 500, s: false },
  ];
  p.cashes = [{ k: "Checking", amt: 200, s: false }];
  p.debts = [];
  p.invs = [];
  p.led = true;
  syncAll(p);
  const rt = spRoute(p, derive(p)),
    b = rt.stops.find(s => s.i === 1);
  chk("the route: the $1,000 cushion in (1000 - 200) / 1500 months, rounded up", b && b.m === 1, b);
  const f = spFifty(p);
  chk(
    "50/30/20: needs, wants and what is left, as shares of pay",
    f.needs === 2000 &&
      f.wants === 500 &&
      f.save === 1500 &&
      Math.abs(f.pn - 0.5) < 1e-9 &&
      Math.abs(f.ps - 0.375) < 1e-9
  );
  const dep = spDepends(p, spDest(rt).i);
  chk(
    "it depends on: ranked, the biggest move first",
    dep.length > 0 && dep.every((x, k) => k === 0 || dep[k - 1].months >= x.months),
    dep
  );
  p.incs[0].s = true;
  p.incs[0].cf = 3;
  chk("a number made real is not on the list", !spDepends(p, spDest(rt).i).some(x => x.k === "take"));
  const bk = spiralBook(p);
  chk("the spreadsheet rows add up", bk.rows.find(r => r.id === "sp_save").v === 4000 - 2000 - 500);

  /* the old order of rounds is kept for "Change my answers": no screens between the rounds */
  openSetup("edit");
  chk("edit mode has no round screens", !spOn(W) && !ov().includes("Question 1 of 5"));
  closeSheet();
  G = G0;
}
