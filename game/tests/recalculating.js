/* ============================================================================
   SLAM the Game, test: tests/recalculating.js
   PURPOSE     Examine Recalculating: the kept plan and the new date, the one calm card, the order to
               pay in when a month is short, the cushion refill, the safe-to-fail line, the letter from
               the calm self (one exercise), "Done for this month", and the optional Mistake audit.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: core/recalc.js, features/recalc.js, features/exletter.js,
               features/audit.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    a = Object.assign(newChar(), {
      name: "Rae",
      led: true,
      placed: true,
      age: 30,
      ret: 60,
      take: 4000,
      spend: 3000,
      months: 2,
      inv: 10000,
      debt: 6000,
      spends: [
        { k: "Home", amt: 1400, s: true },
        { k: "Food", amt: 500, s: true },
        { k: "Getting around", amt: 300, s: true },
        { k: "Bills and subscriptions", amt: 200, s: true },
        { k: "Fun and everything else", amt: 600, s: true },
      ],
      cashes: [{ k: "Checking", amt: 6000 }],
      debts: [{ k: "Credit card", amt: 6000, high: true, pay: 300, paycf: 3, rate: "15% to 25%" }],
    });
  G.chars.push(a);
  G.active = n0;
  save();
  go("home");
  const c = C(),
    BLAME = /mistake|failed|behind|off track/i;
  chk(
    "the menu has the month check",
    MENU.some(m => m[1] === "rc")
  );
  /* ---------- nothing moved ---------- */
  let X0 = rcgCalc(c, derive(c));
  chk("the first look keeps the numbers of today as the plan", !!c.x.rc.base && c.x.rc.base.df === X0.now.df);
  chk("nothing moved: no card, and no row on Home", X0.cards.length === 0 && !app().includes("rcrow"));
  chk("nothing needs attention: the month is done", X0.state.done === true && X0.state.hard === false);
  X("rc");
  chk(
    "the sheet says Done for this month, and offers the letter",
    ov().includes("Done for this month.") && ov().includes('data-a="exletter"') && clean(ov()),
    junk(ov())
  );
  X("close");
  /* ---------- the letter, one exercise ---------- */
  X("exletter");
  chk(
    "the exercise: a prompt, lines to tap, a box for own words, who sees it",
    W.kind === "exletter" &&
      ov().includes(EX_LETTER.prompt.slice(0, 30)) &&
      ov().includes('data-a="exlpick"') &&
      ov().includes("<textarea") &&
      ov().includes("Who sees this: Me only") &&
      clean(ov()),
    junk(ov())
  );
  X("exlpick", "2");
  W.o.own = "Breathe.";
  X("exlkeep");
  const L = exLetterGet(c);
  chk(
    "the letter is kept in c.x.ex, private",
    !!L && L.text === EX_LETTER.starts[2] + " Breathe." && L.seen === "Me only",
    JSON.stringify(L)
  );
  chk(
    "the body of the exercise stands alone (for an Exercises screen)",
    exLetterBody(c, { picks: [], own: "" }).includes("exlkeep")
  );
  /* ---------- a date moves ---------- */
  const dfWas = X0.now.df;
  c.debts[0].amt = 9000;
  c.debt = 9000;
  D = derive(c);
  let X1 = rcgCalc(c, D);
  const card = X1.cards.find(k => k.id === "debt");
  chk(
    "a higher balance moves the debt-free date later",
    !!card && card.route.later === true && X1.now.df > dfWas,
    JSON.stringify(X1.debt)
  );
  chk(
    "the words: was, now, later, and no blame",
    !!card &&
      /^Debt free was [A-Z][a-z]{2} \d{4}\. From where you are today it is [A-Z][a-z]{2} \d{4}, .+ later\.$/.test(
        card.words.line
      ) &&
      !BLAME.test(card.words.line + card.words.next),
    card && card.words.line
  );
  chk(
    "the next turn is the extra amount that brings the old date back",
    X1.hold > 0 && card.words.next.includes("more a month brings")
  );
  chk(
    "that amount works in the debt plan of the game",
    dbPlan(c, "avalanche", X1.hold).months <= rcMonthsBetween(rcYm(todayISO()), X1.debt.oldYm) &&
      (X1.hold === 25 || dbPlan(c, "avalanche", X1.hold - 25).months > rcMonthsBetween(rcYm(todayISO()), X1.debt.oldYm))
  );
  go("home");
  chk(
    "Home shows one calm row",
    app().includes("rcrow") && app().includes("Recalculating") && !BLAME.test(rcgRow(c, D))
  );
  go("money");
  chk("the Money tab shows the same row", app().includes("rcrow"));
  X("debtplan");
  chk("the debt plan shows the same row", ov().includes("rcrow"), W && W.kind);
  X("close");
  X("rc");
  chk(
    "the sheet: the card, the hard month shows the letter",
    ov().includes("rccard") &&
      ov().includes("Debt free was") &&
      ov().includes("rcletter") &&
      ov().includes("Breathe.") &&
      clean(ov()) &&
      !BLAME.test(ov()),
    junk(ov())
  );
  X("rchold", String(X1.hold));
  chk(
    "adding the amount brings the old date back: the debt card goes",
    !rcgCalc(c, derive(c)).cards.some(k => k.id === "debt"),
    JSON.stringify(rcgCalc(c, derive(c)).debt)
  );
  c.x.dplan = null;
  X("rckeep");
  chk(
    "keeping the new date ends the card",
    rcgCalc(c, derive(c)).cards.length === 0 && c.x.rc.base.df === rcgNow(c, derive(c)).df
  );
  /* ---------- a date moves sooner: a win ---------- */
  c.debts[0].amt = 5000;
  c.debt = 5000;
  D = derive(c);
  let Xw = rcgCalc(c, D);
  const wc = Xw.cards.find(k => k.id === "debt");
  chk(
    "a lower balance moves the date sooner, with win words",
    !!wc && wc.words.win === true && /^New route: .+ sooner$/.test(wc.words.head) && wc.words.title === "New route",
    wc && wc.words.head
  );
  go("home");
  chk(
    "Home shows the row with the win words",
    app().includes("rcrow") && app().includes("New route:") && !app().includes("<b>Recalculating</b>")
  );
  X("rc");
  chk(
    "the sheet: New route, and the button to celebrate",
    ov().includes("rcwin") &&
      ov().includes("New route") &&
      ov().includes('data-a="rcwin"') &&
      !ov().includes(">Recalculating</div>")
  );
  X("rcwin");
  chk(
    "the game celebrates it as a win, and the new date is the plan",
    !!LASTWIN && /^New route: /.test(LASTWIN.title) && rcgCalc(c, derive(c)).cards.length === 0,
    JSON.stringify(LASTWIN)
  );
  X("close");
  c.debts[0].amt = 9000;
  c.debt = 9000;
  X("rckeep");
  X("rc");
  /* ---------- a short month ---------- */
  c.take = 2600;
  D = derive(c);
  let X2 = rcgCalc(c, D);
  chk(
    "the pay is less than the spending: the triage is on",
    !!X2.triage && X2.triage.short === 400 && X2.triage.total === c.spend,
    JSON.stringify(X2.triage && X2.triage.short)
  );
  chk(
    "the order: home, bills, food, getting around, debt payments, the rest",
    !!X2.triage && X2.triage.groups.map(g => g.cls).join() === "housing,utilities,food,transport,minimums,rest",
    X2.triage && X2.triage.groups.map(g => g.cls).join()
  );
  chk(
    "the debt payments come out of Fun and everything else, and the total is the spending",
    !!X2.triage &&
      X2.triage.groups.find(g => g.cls === "minimums").amount === 300 &&
      X2.triage.groups.find(g => g.cls === "rest").amount === 300
  );
  chk("no extra payment is asked for in a short month", X2.hold === null);
  drawSheet();
  chk(
    "the sheet: the order and what to arrange",
    ov().includes("When it won't all get paid") && ov().includes("to arrange") && clean(ov()) && !BLAME.test(ov()),
    junk(ov())
  );
  const scriptText = Object.keys(RC_SCRIPTS).reduce((a, k) => a.concat(RC_SCRIPTS[k].say, [RC_SCRIPTS[k].note]), []);
  chk(
    "the phone scripts wait for the review of the owner: the switch is off",
    RC_SCRIPTS_REVIEWED === false && rcScriptsFor(X2.triage) === null
  );
  chk(
    "the player sees a calm Coming soon card, and no script text is on the page",
    ov().includes("soonpart") &&
      ov().includes("Coming soon") &&
      ov().includes("What to say on the phone") &&
      !scriptText.some(t => ov().includes(t.split("{")[0].slice(0, 28))) &&
      !/hardship/i.test(ov())
  );
  chk(
    "with the switch on, the scripts come back (for the day the owner approves them)",
    (rcScriptsFor(X2.triage, true) || []).length >= 1
  );
  /* health cover, medicine and childcare are in the must-pay tier */
  X("kitset", "100", "rct|health", { t: "n" });
  X("kitset", "200", "rct|care", { t: "n" });
  let X2b = rcgCalc(c, derive(c));
  chk(
    "health and childcare move up: right after home, bills and food, and the total is the same",
    !!X2b.triage &&
      X2b.triage.groups.map(g => g.cls).join() === "housing,utilities,food,health,childcare,transport,minimums,rest" &&
      X2b.triage.total === c.spend,
    X2b.triage && X2b.triage.groups.map(g => g.cls + ":" + g.amount).join()
  );
  chk("the label of childcare says when it counts", ov().includes("Childcare, if it lets you keep working"));
  delete c.x.rct;
  c.take = 4000;
  /* ---------- the cushion refill ---------- */
  X("rckeep");
  c.cashes[0].amt = 4800;
  D = derive(c);
  let X3 = rcgCalc(c, D);
  chk(
    "cash was used: a refill plan with a gap, months and a month",
    !!X3.refill && X3.refill.gap === 1200 && X3.refill.months === 2 && !!X3.refill.ym,
    JSON.stringify(X3.refill)
  );
  drawSheet();
  chk(
    "the sheet shows the refill, calmly",
    ov().includes("Cushion refill") &&
      ov().includes("Whole again by") &&
      ov().includes("That is what it is for") &&
      !BLAME.test(ov())
  );
  c.cashes[0].amt = 6000;
  chk("the cash is back: no refill", rcgCalc(c, derive(c)).refill === null);
  /* ---------- the safe-to-fail line ---------- */
  X("kitset", "100", "rcs|cap", { t: "n" });
  let X4 = rcgCalc(c, derive(c));
  chk(
    "a line of $100 for fun",
    !!X4.safe && X4.safe.cap === 100 && X4.safe.ranOut === false && X4.safe.planCost === 100,
    JSON.stringify(X4.safe)
  );
  const spendWas = c.spend;
  X("rcspent", "50");
  X("rcspent", "50");
  X4 = rcgCalc(c, derive(c));
  chk(
    "it runs out, and the plan is the same",
    X4.safe.ranOut === true && X4.safe.left === 0 && c.spend === spendWas && X4.cards.length === 0
  );
  chk("the sheet says so", ov().includes("used up") && ov().includes("Nothing in the plan moves"));
  X("rcsafeoff");
  chk("the line can go", rcgCalc(c, derive(c)).safe === null);
  X("close");
  /* ---------- the spreadsheet ---------- */
  const B = rcBook(c);
  chk(
    "the spreadsheet part has the short month and the refill",
    B.rows.some(r => r.id === "rc_short") && B.rows.some(r => r.id === "rc_gap")
  );
  /* ---------- the optional audit ---------- */
  chk(
    "the menu has the audit, and Home and the month check do not show it",
    MENU.some(m => m[1] === "rcaudit") && !app().includes("rcaudit") && !rcSheet().includes("rcaudit")
  );
  chk("the Yearly Review has the button", reviewSheetAudit("").includes('data-a="rcaudit"'));
  X("rcaudit");
  chk(
    "it starts off",
    W.kind === "rcaudit" && ov().includes("Turn the audit on") && !ov().includes("Add a money event")
  );
  X("mauon");
  X("maukind", String(RC_KINDS.indexOf("Late fee")));
  X("kitset", "50", "rca|amt", { t: "n" });
  X("mauadd");
  X("maukind", String(RC_KINDS.indexOf("Late fee")));
  X("kitset", "25", "rca|amt", { t: "n" });
  X("mauadd");
  X("maukind", String(RC_KINDS.indexOf("Car repair")));
  X("kitset", "1000", "rca|amt", { t: "n" });
  X("mauadd");
  const ev = c.x.rc.audit.events;
  chk(
    "three events, with no tag at first",
    ev.length === 3 && ev.every(e => e.tag === null) && mauCalc(c).untagged === 3
  );
  X("mautag", "mistake", ev[0].id);
  X("mautag", "mistake", ev[1].id);
  X("mautag", "unavoidable", ev[2].id);
  const A = mauCalc(c),
    d5 = derive(c),
    perDay = ((c.take - c.spend) * 12) / 365;
  chk(
    "the totals by tag",
    A.mistake.cost === 75 && A.mistake.count === 2 && A.unavoidable.cost === 1000 && A.untagged === 0,
    JSON.stringify(A.mistake)
  );
  chk("FI days: the cost divided by a day of saving", Math.abs(A.rows[0].fiDays - 50 / perDay) < 1e-9);
  chk(
    "over time: grown at the return of the plan until work is optional",
    Math.abs(A.rows[0].later - 50 * Math.pow(1 + sleptRate(c), d5.yrs + 0.5)) < 0.01,
    A.rows[0].later
  );
  chk(
    "the repeat, and the mistake tax",
    A.repeats.length === 1 &&
      A.repeats[0].kind === "Late fee" &&
      A.repeats[0].count === 2 &&
      Math.abs(A.tax - 75 / (c.take * 12)) < 1e-12
  );
  chk(
    "the sheet: tags, totals, repeats, the math",
    ov().includes("Tagged mistake") &&
      ov().includes("Tagged unavoidable") &&
      ov().includes("Repeats") &&
      ov().includes("FI days") &&
      ov().includes("Show the math") &&
      clean(ov()),
    junk(ov())
  );
  chk(
    "with saving above zero the measure is FI days, with its own Show the math, and one for the mistake tax",
    A.measure === "fiDays" && ov().includes("Show the math: FI days") && ov().includes("Show the math: mistake tax")
  );
  const takeWas = c.take;
  c.take = c.spend;
  D = derive(c);
  const A0 = mauCalc(c);
  drawSheet();
  chk(
    "the guard: a day of saving is zero, so no FI days, and hours of work show in their place",
    A0.rows[0].fiDays === null &&
      A0.mistake.fiDays === null &&
      (A0.measure === "hours" || A0.measure === null) &&
      !/\d FI days/.test(ov()) &&
      (A0.measure !== "hours" || (ov().includes("hours of work") && ov().includes("Show the math: hours of work"))) &&
      clean(ov()),
    A0.measure + " " + junk(ov())
  );
  c.take = takeWas;
  D = derive(c);
  drawSheet();
  chk("the spreadsheet part of the audit", mauBook(c).rows.find(r => r.id === "au_all").v === 1075);
  X("maudel", "", ev[2].id);
  chk("an event can go", c.x.rc.audit.events.length === 2);
  X("mauoff");
  chk(
    "off again: the list is kept and the screen is closed",
    ov().includes("Turn the audit on") && c.x.rc.audit.events.length === 2 && mauBook(c) === null
  );
  X("close");
  G.chars.length = n0;
  G.active = act0;
  save();
  go("home");
}
