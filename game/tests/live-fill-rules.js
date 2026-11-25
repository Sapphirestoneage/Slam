/* ============================================================================
   SLAM the Game, test: tests/live-fill-rules.js
   PURPOSE     Examine the rules of Live Session Mode, Parts 3, 4 and 5, with scripted lines on a real
               profile of the game: the topic of the coach and the value of the client (only the
               client's words fill; a coach's number never fills), where a value lands (the rows of the
               game, as a Guess with a record), corrections (the last one stays, both are kept), values
               that the person entered or confirmed (never changed, never deleted, kept for the review
               with the reason), the spoken confirmation (yes, no, the time limit, an echo of the
               coach's yes, "Confirming" from the client's side, a protected field, never Exact), the
               what-ifs (each cue word, the false hits, the types and where each one goes), the heard
               list, and the small changes in the game that keep a heard Guess as it is.
   INPUT       The game scripts (harness.cjs), and account/live.js, livefill.js, liveland.js loaded here.
               No microphone: each line is text with a side and a time that the test sets by hand.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: account/livefill.js, account/liveland.js, and the lines for
               x.h and x.ratecf in features/alloc.js, core/engine.js, features/debts.js, screens/ui.js.
   ========================================================================= */
{
  const fs = require("fs"),
    vm = require("vm");
  ["account/live.js", "account/livefill.js", "account/liveland.js"].forEach(f =>
    vm.runInThisContext(fs.readFileSync(GAME_DIR + f, "utf8"), { filename: f })
  );
  /* One call on one profile. say(side, text, gap): the line comes "gap" ms after the line before (3 s). */
  const call = (c, sid) => {
      const S = lfStateNew(sid || "s1");
      let t = 1000000,
        n = 0;
      return {
        S,
        say: (side, text, gap) => {
          t += gap == null ? 3000 : gap;
          return lfLine(S, c, { id: (sid || "s1") + "-L" + ++n, side, text, at: t }, t);
        },
        wait: ms => (t += ms),
        tick: () => lfTick(S, c, t),
        now: () => t,
      };
    },
    row = (c, sec, k) => (c[sec] || []).find(x => x.k === k),
    ks = r => r.events.map(e => e.k).join(","),
    last = c => c.x.live.heard[c.x.live.heard.length - 1],
    fresh = () => newChar({ name: "Sam" }),
    /* a profile whose setup is done by hand: each row is the person's own number */
    done = () => {
      const c = newChar({ name: "Dee" });
      applyTypical(c);
      c.placed = true;
      ["incs", "spends", "cashes"].forEach(sec => c[sec].forEach(x => (x.s = true)));
      syncAll(c);
      return c;
    },
    rowsOf = c => JSON.stringify([c.incs, c.spends, c.cashes, c.invs, c.debts, c.payFreq]);

  /* ---------- A. the topic of the coach, the value of the client ---------- */
  {
    const c = fresh(),
      K = call(c);
    let r = K.say("coach", "And what is your rent?");
    chk(
      "a coach's question sets the topic and changes nothing",
      ks(r) === "" && K.S.topic.id === "spend:Home/rent" && !c.led
    );
    r = K.say("client", "1,850");
    const x = row(c, "spends", "Home"),
      m = c.x.live.marks["spend:Home/rent"],
      it = last(c);
    chk("the client's next line gives the value: Home is $1,850", ks(r) === "filled" && x.amt === 1850);
    chk("it lands as a Guess (s false), marked as heard (h 1), never Exact", x.s === false && x.h === 1 && !x.cf);
    chk("the game's own sureness says Guess", isSharp(c, "spend") === false && kwRow(x) === 0);
    chk("the game's total follows: money going out is 1850 + 600 + 450 + 300 + 450", c.spend === 3650, String(c.spend));
    chk(
      "the record of the value: the quote, the side, the time, the line, not rough, a Guess that was heard",
      m.v === 1850 &&
        m.quote === "1,850" &&
        m.side === "client" &&
        m.at === K.now() &&
        m.line === "s1-L2" &&
        m.rough === false &&
        m.lv === "guess" &&
        m.by === "heard" &&
        m.sid === "s1"
    );
    chk(
      "the heard list has the item, with the class of the tag",
      it.st === "filled" &&
        it.key === "spend:Home/rent" &&
        it.show === "$1,850" &&
        it.area === "housing" &&
        it.cls === LF.TAG &&
        it.side === "client"
    );
    chk(
      "the first rows of a new profile came from the call: fresh is marked",
      c.x.live.fresh === true && c.led === true
    );
    chk(
      "the topic is used one time: a second number changes nothing",
      ks(K.say("client", "200", 10000)) === "" && x.amt === 1850
    );
    const tag = lfTag(c, "spend:Home/rent", m.t + 1000);
    chk(
      'the tag says "heard" and glows for 4 seconds',
      tag.text === "heard" && tag.glow === true && lfTag(c, "spend:Home/rent", m.t + 4001).glow === false
    );
    chk("a field that no call set has no tag", lfTag(c, "cash:Checking", K.now()) === null);
  }
  {
    const c = fresh(),
      K = call(c),
      r1 = K.say("coach", "So your rent is 1,850 and you owe 3,200 on the credit card."),
      r2 = K.say("coach", "Rent 1,850.", 500),
      r3 = K.say("coach", "My rent is 2,400 a month.", 500);
    chk(
      "a coach's number never fills, with a field named or not",
      ks(r1) + ks(r2) + ks(r3) === "" && !c.led && !c.x.live.heard.length
    );
  }
  {
    const c = fresh(),
      K = call(c);
    chk(
      '"my rent is 1,850" fills with no topic',
      ks(K.say("client", "My rent is 1,850.")) === "filled" && row(c, "spends", "Home").amt === 1850
    );
    chk(
      '"I owe about 3,200 on the credit card" adds the debt row the way the game does, as a rough Guess',
      ks(K.say("client", "I owe about 3,200 on the credit card.")) === "filled" &&
        row(c, "debts", "Credit card balance").amt === 3200 &&
        row(c, "debts", "Credit card balance").s === false &&
        row(c, "debts", "Credit card balance").high === true &&
        c.debtKinds.includes("Credit card balance") &&
        c.x.live.marks["debt:Credit card balance"].rough === true &&
        c.debt === 3200
    );
    chk(
      '"2,000 in savings" fills Savings',
      ks(K.say("client", "I have 2,000 in savings.")) === "filled" && row(c, "cashes", "Savings").amt === 2000
    );
    chk(
      '"my 401k has 12,000" adds the retirement row, and the k of 401(k) is not a thousand',
      ks(K.say("client", "My 401k has 12,000.")) === "filled" &&
        row(c, "invs", "Retirement plan at work").amt === 12000 &&
        c.accts.includes("Retirement plan at work") &&
        c.inv === 12000
    );
    chk(
      "a debt is never named by a debit card",
      ks(K.say("client", "My debit card has 500 on it.")) === "" && row(c, "debts", "Credit card balance").amt === 3200
    );
    chk(
      "two fields with two numbers in one line fill both: rent and utilities add up in Home",
      ks(K.say("client", "Rent is 1,900 and utilities are 150.", 60000)) === "corrected,filled" &&
        row(c, "spends", "Home").amt === 2050,
      String(row(c, "spends", "Home").amt)
    );
  }
  {
    const c = fresh(),
      K = call(c);
    K.say("coach", "What is your rent?");
    chk("a topic ends after 20 seconds", ks(K.say("client", "1850", 20001)) === "" && !c.led);
    K.say("coach", "What is your rent?");
    K.say("coach", "And how old are your kids now?");
    chk(
      "a coach's line of 4 words or more that names no field ends the topic",
      ks(K.say("client", "1850")) === "" && !c.led
    );
    K.say("coach", "What is your rent?");
    K.say("coach", "Okay.", 1000);
    K.say("coach", "And the car payment?", 1000);
    chk(
      "the coach's new topic takes the place of the old one: 400 is the car payment, not the rent",
      ks(K.say("client", "400")) === "filled" &&
        row(c, "spends", "Getting around").amt === 400 &&
        row(c, "spends", "Home").amt === 1250,
      JSON.stringify(c.spends)
    );
    K.say("coach", "What is your rent?");
    const before = rowsOf(c);
    let r = K.say("client", "It was 1,700 and then 1,850.");
    chk(
      "two numbers that are not one range: nothing is set, the line is kept for the review",
      ks(r) === "kept" && rowsOf(c) === before && last(c).why === "More than one number in this line."
    );
    K.say("coach", "What is your rent?");
    r = K.say("client", "It went up 200 last year.");
    chk(
      '"it went up 200" is not the amount: kept, nothing set',
      ks(r) === "kept" && rowsOf(c) === before && last(c).unsure === true
    );
    K.say("coach", "What is your rent?");
    r = K.say("client", "5");
    chk(
      "a number below 10 is too small to be money: kept, nothing set",
      ks(r) === "kept" && rowsOf(c) === before && last(c).why === LF_WHY.small
    );
    K.say("coach", "Which cards do you have?");
    r = K.say("client", "A Chase and a Discover.");
    chk(
      "card names are kept for the review, and no row is added for them",
      ks(r) === "kept" &&
        c.x.live.names.join() === "chase,discover" &&
        last(c).why === LF_WHY.names &&
        rowsOf(c) === before
    );
  }
  /* income: one month, one paycheck, one year */
  {
    const c = fresh(),
      K = call(c);
    K.say("coach", "What do you take home each month?");
    chk(
      "an amount for a month is the row",
      ks(K.say("client", "About 4,200.")) === "filled" &&
        row(c, "incs", "A main job").amt === 4200 &&
        c.take === 4200 &&
        c.x.live.marks["inc:A main job"].rough === true
    );
    const d = fresh(),
      D2 = call(d);
    D2.say("coach", "What is your income?");
    let r = D2.say("client", "Sixty thousand a year.");
    chk(
      "an amount for a year is not set (the game needs the month after tax): kept with the reason",
      ks(r) === "kept" && last(d).why === LF_WHY.year && row(d, "incs", "A main job").amt === 3600
    );
    D2.say("coach", "What is your income?");
    r = D2.say("client", "2,100.");
    chk(
      "an amount with no month and no paycheck is not set: kept with the reason",
      ks(r) === "kept" && last(d).why === LF_WHY.per && row(d, "incs", "A main job").amt === 3600
    );
    D2.say("coach", "How much is each paycheck?");
    r = D2.say("client", "2,100.");
    chk(
      "one paycheck on a new profile waits until the rhythm is heard (the default rhythm was said by nobody)",
      ks(r) === "kept" && last(d).why === LF_WHY.rhythm && row(d, "incs", "A main job").amt === 3600
    );
    const waitId = last(d).id;
    r = D2.say("client", "I get paid twice a month.");
    chk(
      "when the rhythm is heard, the paycheck lands: 2,100 x 24 / 12 = 4,200 a month",
      ks(r) === "filled,filled" &&
        d.payFreq === "Twice a month" &&
        row(d, "incs", "A main job").amt === 4200 &&
        d.x.live.heard.find(x => x.id === waitId).st === "corrected",
      ks(r) + " " + row(d, "incs", "A main job").amt
    );
    const e = fresh(),
      E = call(e);
    r = E.say("client", "I get paid every two weeks, about two thousand one hundred each time.");
    chk(
      "rhythm and paycheck in one line: every 2 weeks, 2,100 x 26 / 12 = 4,550 a month, rough",
      ks(r) === "filled,filled" &&
        e.payFreq === "Every 2 weeks" &&
        row(e, "incs", "A main job").amt === 4550 &&
        e.take === 4550
    );
    r = E.say("client", "I get paid 900 a week from my second job.", 60000);
    chk("a line that names two fields with one number is kept, not guessed", ks(r) === "kept" && e.incs.length === 1);
  }
  /* rates */
  {
    const c = fresh(),
      K = call(c);
    K.say("coach", "Any credit cards with a balance?");
    K.say("client", "Yes, 3,200.");
    let r = K.say("coach", "And what is the rate on that?");
    chk('"the rate on that" is the rate of the debt named before', K.S.topic.id === "rate:Credit card balance");
    r = K.say("client", "About 25.");
    const x = row(c, "debts", "Credit card balance");
    chk(
      "the rate lands with its own mark of a Guess (ratecf 0)",
      ks(r) === "filled" && x.rate === 25 && x.ratecf === 0 && x.amt === 3200
    );
    chk(
      "the game reads it as a Guess with the heard value, and the debt plan says Guess",
      dbRate(x).v === 25 && dbRate(x).cf === 0 && dbStatus(c) === "Guess"
    );
    r = K.say("client", "The card is at 24.99 percent.", 30000);
    chk(
      "a client's line with the debt and a percent sets the rate",
      ks(r) === "corrected" && x.rate === 24.99 && x.amt === 3200
    );
    r = K.say("client", "My student loans are around 28,000 at 6 percent.", 30000);
    chk(
      "a balance and a rate in one line are kept apart only when each has its own field: this line is kept",
      ks(r) === "kept" && !row(c, "debts", "Student loans")
    );
  }

  /* ---------- B. corrections ---------- */
  {
    const c = fresh(),
      K = call(c);
    K.say("client", "My rent is 1,850.");
    const first = last(c).id;
    let r = K.say("client", "No wait, 1,900.", 4000);
    const m = c.x.live.marks["spend:Home/rent"],
      it = last(c);
    chk(
      "a new number in 8 seconds takes the place of the last one",
      ks(r) === "corrected" && row(c, "spends", "Home").amt === 1900
    );
    chk(
      "both are kept: the record has 1,850 and 1,900, and the first item points at the second",
      m.all.map(a => a.v).join() === "1850,1900" &&
        c.x.live.heard.find(x => x.id === first).st === "corrected" &&
        c.x.live.heard.find(x => x.id === first).by === it.id &&
        it.fixes === first &&
        it.was === 1850 &&
        !it.unsure
    );
    chk(
      '"sorry", "I mean" and "actually" before a number also correct',
      ks(K.say("client", "Sorry, I mean 1,950.", 3000)) === "corrected" &&
        ks(K.say("client", "Actually 1,975.", 3000)) === "corrected" &&
        row(c, "spends", "Home").amt === 1975
    );
    chk(
      "a line that is only a number, in 8 seconds, corrects too",
      ks(K.say("client", "2,000.", 7000)) === "corrected" && row(c, "spends", "Home").amt === 2000
    );
    chk(
      "after 8 seconds a number alone is not a correction",
      ks(K.say("client", "2,100.", 8001)) === "" && row(c, "spends", "Home").amt === 2000
    );
    chk(
      "in 8 seconds, a line with other words and no correction word is not a correction",
      ks(K.say("client", "My rent is 2,000.", 60000)) === "" &&
        ks(K.say("client", "And 200 for parking.", 3000)) === "" &&
        row(c, "spends", "Home").amt === 2000
    );
    r = K.say("client", "My rent is 2,200.", 60000);
    chk(
      "a different number much later still takes the place (the last one stays), and the item is flagged for the review",
      ks(r) === "corrected" &&
        row(c, "spends", "Home").amt === 2200 &&
        last(c).unsure === true &&
        last(c).why === LF_WHY.twice
    );
    chk(
      "each value that was ever heard for the field is in the record, in order",
      m.all.map(a => a.v).join() === "1850,1900,1950,1975,2000,2200"
    );
    chk(
      "the same value a second time adds nothing",
      ks(K.say("client", "My rent is 2,200.", 60000)) === "" && m.all.length === 6
    );
  }

  /* ---------- C. never change what the person entered or confirmed; never delete ---------- */
  {
    const c = done(),
      K = call(c),
      before = rowsOf(c);
    c.spends.forEach(x => chk("setup by hand: " + x.k + " is the person's own number", x.s === true && !x.h));
    let r = K.say("client", "My rent is 1,850.");
    chk("a value that the person entered is not changed", ks(r) === "kept" && rowsOf(c) === before);
    chk(
      'the heard value is kept for the review with the reason "You already entered this."',
      last(c).why === "You already entered this." && last(c).v === 1850 && last(c).st === "kept"
    );
    r = K.say("client", "My rent is 1,250.");
    chk(
      "the same value as the profile: nothing to review",
      ks(r) === "same" && last(c).skip === true && rowsOf(c) === before
    );
    r = K.say("client", "I get paid every week.");
    chk(
      "the pay rhythm of a finished setup is the person's answer: not changed, kept with the reason",
      ks(r) === "kept" && c.payFreq === "Every 2 weeks" && last(c).why === LF_WHY.hand
    );
    row(c, "cashes", "Checking").cf = 3;
    r = K.say("client", "I have 9,000 in checking.");
    chk(
      "an Exact value is not changed, and the reason says it was checked against a statement",
      ks(r) === "kept" && last(c).why === LF_WHY.exact && row(c, "cashes", "Checking").amt === 300
    );
    c.debts.push({ k: "Car loan", amt: 9000, high: false, s: true, was: 9000, apr: "8% to 15%" });
    c.debtKinds.push("Car loan");
    r = K.say("client", "The car loan is at 6 percent.");
    chk(
      "a rate band that the person tapped is not changed",
      ks(r) === "kept" && row(c, "debts", "Car loan").rate == null && row(c, "debts", "Car loan").apr === "8% to 15%"
    );
    chk(
      "no row was deleted and none was added",
      c.incs.length === 1 && c.spends.length === 5 && c.cashes.length === 1 && c.debts.length === 1
    );
    chk(
      "a guess of the game is open: a debt row with no real number takes the heard value",
      (() => {
        c.debts.push({ k: "Medical bills", amt: 2000, high: false, s: false, was: 2000 });
        return (
          ks(K.say("client", "I owe 1,400 in medical bills.")) === "filled" &&
          row(c, "debts", "Medical bills").amt === 1400 &&
          row(c, "debts", "Medical bills").h === 1
        );
      })()
    );
    /* the person changes a Guess of the call by hand: the call does not touch it again */
    row(c, "debts", "Medical bills").amt = 1500;
    r = K.say("client", "I owe 1,600 in medical bills.", 60000);
    chk(
      "a Guess of the call that the person changed by hand is the person's now",
      ks(r) === "kept" && row(c, "debts", "Medical bills").amt === 1500 && last(c).why === LF_WHY.hand
    );
    row(c, "debts", "Medical bills").amt = 1400;
    Object.assign(row(c, "debts", "Medical bills"), { amt: 1450, s: true });
    r = K.say("client", "I owe 1,600 in medical bills.", 60000);
    chk(
      "a Guess of the call that the person saved as a real number is not changed",
      ks(r) === "kept" && row(c, "debts", "Medical bills").amt === 1450
    );
  }

  /* ---------- D. Part 4: "Confirming" and the answer ---------- */
  {
    const a = (t, kind) => lfAskOf(t, kind || null);
    chk(
      '"Confirming rent 1,850"',
      a("Confirming rent 1,850").id === "spend:Home/rent" && a("Confirming rent 1,850").v === 1850
    );
    chk('"confirming your rent at 1,850"', a("Okay, confirming your rent at 1,850.").v === 1850);
    chk(
      '"confirm rent eighteen fifty"',
      a("confirm rent eighteen fifty").v === 1850 && a("confirm rent eighteen fifty").id === "spend:Home/rent"
    );
    chk(
      '"Confirming the card balance 3,400"',
      a("Confirming the card balance 3,400").id === "debt:Credit card balance"
    );
    chk(
      '"Confirming the card rate 24.99 percent" is the rate',
      a("Confirming the card rate 24.99 percent").id === "rate:Credit card balance" &&
        a("Confirming the card rate 24.99 percent").v === 24.99
    );
    chk(
      '"Confirming you get paid every two weeks" is the rhythm',
      a("Confirming you get paid every two weeks").rhythm === "Every 2 weeks"
    );
    chk('"Confirming take home 4,200 a month"', a("Confirming take home 4,200 a month").per === "month");
    chk(
      "no field, or no number: nothing opens, and the reason says what to say",
      !!a("Confirming 1,850").bad && !!a("Confirming your rent").bad && a("What is your rent?") === null
    );
    [
      "confirmed",
      "Yes.",
      "yep",
      "yeah",
      "Correct.",
      "That's right.",
      "right",
      "Yes, that's correct.",
      "Confirmed, yes.",
    ].forEach(w => chk('"' + w + '" is a yes', lfYesNo(w) === "yes"));
    ["No.", "nope", "Actually it is more.", "Not quite.", "wait", "No, that's not right.", "Hold on."].forEach(w =>
      chk('"' + w + '" is a no', lfYesNo(w) === "no")
    );
    ["okay", "sure", "uh huh", "yes but it went up to 1,900", "I think so", "rent"].forEach(w =>
      chk('"' + w + '" is not a clean yes and not a no', lfYesNo(w) === null)
    );
  }
  {
    const c = fresh(),
      K = call(c);
    K.say("client", "My rent is about 1,800.");
    let r = K.say("coach", "Confirming rent 1,850.", 20000);
    chk(
      "the coach's Confirming opens the question and changes nothing",
      ks(r) === "asked" && row(c, "spends", "Home").amt === 1800 && K.S.ask.v === 1850 && last(c).st === "asked"
    );
    r = K.say("client", "Yes.", 2000);
    const x = row(c, "spends", "Home"),
      m = c.x.live.marks["spend:Home/rent"],
      it = last(c);
    chk(
      "yes: the field is that number, raised from Guess to Close the game's way (s true)",
      ks(r) === "confirmed" && x.amt === 1850 && x.s === true && kwRow(x) === 0.75
    );
    chk("spoken confirmation never sets Exact", !x.cf && kwWord(kwRow(x)) === "Close");
    chk(
      "the record says \"confirmed out loud\": the coach's line, the client's yes, both kept with the Guess before",
      m.lv === "close" &&
        m.by === "voice" &&
        m.side === "coach" &&
        m.yes.quote === "Yes." &&
        m.all.map(a => a.v + a.how).join() === "1800heard,1850voice"
    );
    chk(
      "the item is flagged so the review can skip it, and carries the class of the pulse",
      it.st === "confirmed" && it.skip === true && it.cls === LF.PULSE && it.answer.side === "client" && it.was === 1800
    );
    chk(
      "the tag of the field",
      lfTag(c, "spend:Home/rent", K.now()).text === "confirmed out loud" &&
        lfTag(c, "spend:Home/rent", K.now()).pulse === true
    );
    r = K.say("client", "My rent is 1,900.", 30000);
    chk(
      "after that, plain speech does not change it: kept, with the way to change it",
      ks(r) === "kept" && x.amt === 1850 && last(c).why === LF_WHY.voice
    );
    K.say("coach", "Confirming rent 1,900.", 5000);
    r = K.say("client", "Confirmed.", 2000);
    chk(
      "a new Confirming with a yes changes a value that was confirmed out loud",
      ks(r) === "confirmed" && x.amt === 1900 && x.s === true
    );
    /* no */
    K.say("client", "I have 2,000 in savings.", 30000);
    K.say("coach", "Confirming savings 2,000.", 5000);
    r = K.say("client", "Not quite.", 2000);
    const sv = row(c, "cashes", "Savings");
    chk(
      'no: nothing changes, and the field shows "waiting for your next Confirming"',
      ks(r) === "waiting" &&
        sv.amt === 2000 &&
        sv.s === false &&
        last(c).st === "waiting" &&
        last(c).why === "Waiting for your next Confirming." &&
        lfTag(c, "cash:Savings", K.now()).text === "waiting for your next Confirming"
    );
    chk(
      "a yes after the no does nothing: the question is closed",
      ks(K.say("client", "Yes.", 2000)) === "" && sv.s === false
    );
    K.say("coach", "Confirming savings 2,300.", 5000);
    r = K.say("client", "Yes.", 2000);
    chk(
      "the next Confirming with a yes sets it and ends the waiting",
      sv.amt === 2300 &&
        sv.s === true &&
        lfTag(c, "cash:Savings", K.now()).text === "confirmed out loud" &&
        !c.x.live.wait["cash:Savings"]
    );
    /* "no, it is ..." */
    K.say("client", "I have 500 in checking.", 30000);
    K.say("coach", "Confirming checking 500.", 5000);
    r = K.say("client", "No, it is 650.", 2000);
    chk(
      "a no with a number: still waiting, and the number lands as a Guess",
      ks(r) === "waiting,corrected" &&
        row(c, "cashes", "Checking").amt === 650 &&
        row(c, "cashes", "Checking").s === false
    );
    /* the time limit */
    K.say("coach", "Confirming checking 650.", 5000);
    K.wait(10001);
    r = K.tick();
    chk(
      "silence for 10 seconds: nothing changes, and the heard list says so",
      ks(r) === "timeout" &&
        last(c).st === "timeout" &&
        last(c).why === "No answer was heard in 10 seconds. Nothing changed." &&
        row(c, "cashes", "Checking").s === false
    );
    chk(
      "a yes after the time limit does nothing",
      ks(K.say("client", "Yes.", 500)) === "" && row(c, "cashes", "Checking").s === false
    );
    K.say("coach", "Confirming checking 650.", 5000);
    r = K.say("client", "Yes.", 9999);
    chk("a yes at 9.999 seconds counts", ks(r) === "confirmed" && row(c, "cashes", "Checking").s === true);
    chk(
      "after all of this, no row is Exact",
      [c.incs, c.spends, c.cashes, c.invs, c.debts].every(rows => rows.every(x => !x.cf))
    );
  }
  {
    /* echoes and the wrong side */
    const c = fresh(),
      K = call(c);
    K.say("client", "My rent is 1,850.");
    K.say("coach", "Confirming rent 1,850.", 5000);
    K.say("coach", "Right?", 1000);
    let r = K.say("client", "Right.", 300);
    chk(
      "the coach's own word, heard by the client's microphone in 3 seconds, is an echo: not a yes",
      ks(r) === "" && row(c, "spends", "Home").s === false && !!K.S.ask
    );
    r = K.say("client", "Yes.", 1500);
    chk(
      "the client's own yes, a word the coach did not say, still counts",
      ks(r) === "confirmed" && row(c, "spends", "Home").s === true
    );
    const d = fresh(),
      D2 = call(d);
    D2.say("client", "My rent is 1,850.");
    D2.say("coach", "Confirming rent 1,850, is that right?", 5000);
    r = D2.say("client", "That's right.", 1500);
    chk(
      'the words of the Confirming line itself are not an echo: "that\'s right" after "is that right?" counts',
      ks(r) === "confirmed"
    );
    const e = fresh(),
      E = call(e);
    E.say("client", "My rent is 1,850.");
    r = E.say("client", "Confirming rent 1,850.", 5000);
    chk('a "Confirming" heard on the client\'s side opens nothing', ks(r) === "" && !E.S.ask);
    chk(
      "so a yes after it does nothing",
      ks(E.say("client", "Yes.", 1000)) === "" && row(e, "spends", "Home").s === false
    );
    E.say("coach", "Confirming rent 1,850.", 5000);
    r = E.say("coach", "Yes.", 1000);
    chk("the coach's own yes is never the answer", ks(r) === "" && row(e, "spends", "Home").s === false && !!E.S.ask);
    r = E.say("client", "Okay.", 1000);
    chk('"okay" is not a yes: the question stays open', ks(r) === "" && !!E.S.ask);
    E.say("coach", "Confirming rent 1,900.", 1000);
    chk(
      "a new Confirming closes the open one, and says that nothing changed",
      e.x.live.heard.filter(x => x.st === "timeout" && x.why === LF_WHY.newer).length === 1 && E.S.ask.v === 1900
    );
    r = E.say("coach", "Confirming your rent.", 20000);
    chk(
      "a Confirming with no number opens nothing and says what to say",
      ks(r) === "timeout,waiting" && !E.S.ask && last(e).why === "Say the field and one number after Confirming."
    );
  }
  {
    /* protected fields, the rough number, a rate, the rhythm */
    const c = done(),
      K = call(c),
      before = rowsOf(c);
    K.say("coach", "Confirming rent 1,850.");
    let r = K.say("client", "Yes.", 2000);
    chk(
      "a field that the person entered: the confirmation changes nothing and says why",
      ks(r) === "kept" && rowsOf(c) === before && last(c).why === "You already entered this." && !last(c).skip
    );
    row(c, "cashes", "Checking").cf = 3;
    K.say("coach", "Confirming checking 9,000.");
    r = K.say("client", "Yes.", 2000);
    chk(
      "an Exact field: the confirmation changes nothing and says why",
      ks(r) === "kept" &&
        row(c, "cashes", "Checking").amt === 300 &&
        row(c, "cashes", "Checking").cf === 3 &&
        last(c).why === LF_WHY.exact
    );
    const d = fresh(),
      D2 = call(d);
    D2.say("coach", "What about groceries?");
    D2.say("client", "400-ish, maybe 500.");
    D2.say("coach", "Confirming groceries 450.");
    r = D2.say("client", "Yes.", 2000);
    chk(
      "the middle of a rough number, confirmed out loud, stays a Guess and stays in the review",
      ks(r) === "confirmed" &&
        row(d, "spends", "Food").amt === 450 &&
        row(d, "spends", "Food").s === false &&
        last(d).lv === "guess" &&
        !last(d).skip &&
        last(d).why === LF_WHY.rough
    );
    D2.say("coach", "Confirming groceries 480.");
    r = D2.say("client", "Yes.", 2000);
    chk(
      "a firm number that the client confirms makes it Close",
      row(d, "spends", "Food").amt === 480 && row(d, "spends", "Food").s === true && last(d).skip === true
    );
    D2.say("client", "I owe 3,400 on the credit card.");
    D2.say("coach", "Confirming the card rate 24.99 percent.");
    r = D2.say("client", "Correct.", 2000);
    const x = row(d, "debts", "Credit card balance");
    chk(
      "a confirmed rate is Close for the game (ratecf 2), not Exact",
      ks(r) === "confirmed" && x.rate === 24.99 && x.ratecf === 2 && dbRate(x).cf === 2 && x.s === false
    );
    D2.say("coach", "Confirming you get paid every two weeks.");
    r = D2.say("client", "Yep.", 2000);
    chk(
      "the pay rhythm can be confirmed",
      ks(r) === "confirmed" && d.payFreq === "Every 2 weeks" && d.x.live.marks["pay.freq"].lv === "close"
    );
    D2.say("coach", "Confirming take home 4,200 a month.");
    r = D2.say("client", "That is right.", 2000);
    chk(
      "income for a month can be confirmed",
      ks(r) === "confirmed" &&
        row(d, "incs", "A main job").amt === 4200 &&
        row(d, "incs", "A main job").s === true &&
        isSharp(d, "take")
    );
    D2.say("client", "Utilities are about 150.", 30000);
    chk(
      "a new part of a confirmed row is a Guess, so the row is a Guess again: 480 stays, the sum is honest",
      (() => {
        D2.say("client", "Eating out is about 200.", 30000);
        const f = row(d, "spends", "Food");
        return f.amt === 680 && f.s === false && d.x.live.marks["spend:Food/groceries"].lv === "close";
      })()
    );
  }

  /* ---------- E. Part 5: what-ifs ---------- */
  {
    [
      "What if I moved to a cheaper place?",
      "If I got the raise it would be 5,000.",
      "Maybe we sell the car.",
      "The rent would be 2,000 there.",
      "Worst case I pick up weekend shifts.",
      "I could move back home.",
      "I am thinking about going back to school.",
      "We might have a baby next year.",
      "Suppose the car breaks down.",
      "Let's say I lose the job.",
      "Someday I want to buy a house.",
      "I wish I could travel more.",
      "Best case the loan is forgiven.",
      "I am hoping to retire early.",
    ].forEach(t => chk('a what-if: "' + t + '"', lfCue(t, false).whatif === true, JSON.stringify(lfCue(t, false))));
    [
      "My rent is 1,850.",
      "Let me see if I can find it.",
      "I do not know if that is right.",
      "If I remember right it is 1,850.",
      "Could you tell me your rent?",
      "What would you say your rent is?",
      "Can you walk me through your bills?",
      "Maybe.",
      "I could.",
      "It is 1,850 if that makes sense.",
    ].forEach(t =>
      chk('not a what-if: "' + t + '"', lfCue(t, false).whatif === false, JSON.stringify(lfCue(t, false)))
    );
    chk(
      '"maybe 500" in the answer to a direct question is a rough number, not a what-if',
      lfCue("400-ish, maybe 500.", true).whatif === false && lfCue("400-ish, maybe 500.", true).rough === true
    );
    chk(
      '"it would be about 1,850" in an answer is rough too',
      lfCue("It would be about 1,850.", true).whatif === false && lfCue("Could be 400.", true).rough === true
    );
    chk(
      "the same words with no question open are a what-if",
      lfCue("400-ish, maybe 500.", false).whatif === true && lfCue("It would be about 1,850.", false).whatif === true
    );
    chk('"if" is a what-if in an answer too', lfCue("If I moved it would be 900.", true).whatif === true);

    const c = fresh(),
      K = call(c);
    K.say("client", "My rent is 1,850.");
    const before = rowsOf(c);
    let r = K.say("client", "If I moved in with my sister, rent would be 900.");
    const w = c.x.live.whatifs[0];
    chk("a what-if is not a fact: no value changes", ks(r) === "whatif" && rowsOf(c) === before);
    chk(
      "it is on the What-ifs list with the quote, the speaker and the time",
      w.quote === "If I moved in with my sister, rent would be 900." &&
        w.side === "client" &&
        w.at === K.now() &&
        w.sid === "s1" &&
        w.type === null
    );
    chk(
      "it has a place for a suggested type and for who set the type",
      w.sug === null && w.sugBy === null && w.by === null && w.ok === false && w.link === null
    );
    r = K.say("coach", "What if you picked up a second job?");
    chk("a coach's line can be a what-if", ks(r) === "whatif" && c.x.live.whatifs[1].side === "coach");
    r = K.say("client", "Then my income is 5,000 a month.");
    chk(
      "after the coach's what-if, the client's number is a what-if too, not a fact",
      ks(r) === "whatif" && row(c, "incs", "A main job").amt === 3600 && c.x.live.whatifs.length === 3
    );
    K.say("coach", "Okay, back to today. What is in checking?");
    r = K.say("client", "About 900.");
    chk(
      "the coach's next plain question ends that: 900 is a fact",
      ks(r) === "filled" && row(c, "cashes", "Checking").amt === 900
    );
    K.say("coach", "How much do you spend on groceries?");
    r = K.say("client", "Maybe 500.");
    chk(
      '"maybe 500" after a direct question fills as a rough Guess',
      ks(r) === "filled" &&
        row(c, "spends", "Food").amt === 500 &&
        c.x.live.marks["spend:Food/groceries"].rough === true &&
        c.x.live.whatifs.length === 3
    );
    K.say("client", "Someday I want to take a trip to Japan, maybe 4,000.", 30000);
    K.say("client", "Worst case rent goes to 2,100.", 30000);
    K.say("client", "We might have a baby next year.", 30000);
    chk(
      "the counter for the screen",
      lfWhatifLine(lfWhatifs(c, "s1").length) === "6 what-ifs heard" &&
        lfWhatifLine(1) === "1 what-if heard" &&
        lfCounts(c, "s1").whatifs === 6 &&
        lfCounts(c, "s1").line === "6 what-ifs heard"
    );
    chk("the five types", LF_TYPES.map(t => t[1]).join() === "Ceiling,Floor,Scenario,Life transition,Goal or wish");

    const W = c.x.live.whatifs,
      rows2 = rowsOf(c);
    chk(
      "the AI pass can suggest a type; that approves nothing",
      lfWhatifSuggest(c, W[0].id, "scenario", "ai").sug === "scenario" &&
        W[0].sugBy === "ai" &&
        W[0].ok === false &&
        W[0].type === null &&
        W[0].link === null
    );
    chk(
      "a type that does not exist is refused",
      lfWhatifSet(c, W[0].id, "nonsense", "coach") === null && lfWhatifSuggest(c, "w999", "goal") === null
    );
    lfWhatifSet(c, W[0].id, "floor", "coach");
    chk(
      "Floor: the lower limit of the number in the quote, kept with the field; the value of the profile does not change",
      W[0].type === "floor" &&
        W[0].by === "coach" &&
        W[0].ok === true &&
        W[0].link.to === "limit" &&
        W[0].link.key === "spend:Home/rent" &&
        W[0].link.v === 900 &&
        c.x.live.limits["spend:Home/rent"].lo === 900 &&
        W[0].link.text === "Floor for Rent or housing: $900" &&
        rowsOf(c) === rows2
    );
    lfWhatifSet(c, W[4].id, "ceiling", "coach");
    chk(
      "Ceiling: the upper limit, next to the lower one",
      c.x.live.limits["spend:Home/rent"].hi === 2100 &&
        c.x.live.limits["spend:Home/rent"].lo === 900 &&
        W[4].link.side === "hi"
    );
    lfWhatifSet(c, W[1].id, "ceiling", "coach");
    chk("a limit with no number in the quote stays open for the review", W[1].link.open === true && W[1].ok === true);
    lfWhatifSet(c, W[1].id, "scenario", "coach");
    chk(
      "Scenario: the link opens the simulator that fits (a side job), which the game has",
      W[1].link.act === "simopen" && W[1].link.v === "side" && !!SIMS[W[1].link.v] && typeof ACT.simopen === "function"
    );
    lfWhatifSet(c, W[2].id, "scenario", "coach");
    chk(
      "Scenario with no fitting simulator: the link opens the list of simulators",
      W[2].link.act === "sims" && typeof ACT.sims === "function"
    );
    lfWhatifSet(c, W[5].id, "life", "coach");
    chk(
      'Life transition: the link opens "Break in case of emergency"',
      W[5].link.act === "transit" &&
        typeof ACT.transit === "function" &&
        W[5].link.text === "Break in case of emergency"
    );
    const g0 = c.goals.length;
    lfWhatifSet(c, W[3].id, "goal", "coach");
    const g = c.goals[c.goals.length - 1];
    chk(
      "Goal or wish: one goal on the bucket list with the shape of the game, the cost from the quote, not marked sure",
      c.goals.length === g0 + 1 &&
        g.k === "Trip" &&
        g.n === "Trip" &&
        g.cost === 4000 &&
        g.s === false &&
        g.fund === 0 &&
        g.era === null &&
        g.blk === null &&
        !!g.id &&
        g.d === todayISO() &&
        W[3].link.v === g.id &&
        W[3].link.text === "Bucket list: Trip"
    );
    lfWhatifSet(c, W[3].id, "goal", "coach");
    chk("a second tap adds no second goal", c.goals.length === g0 + 1);
    chk(
      "the game reads the new goal with no defect",
      (() => {
        const d = derive(c);
        return isFinite(d.nw) && c.goals.every(x => x.cost > 0);
      })()
    );
    chk(
      "a what-if with a type links to where it went, each one",
      W.filter(x => x.ok).every(x => x.link && typeof x.link.text === "string" && x.link.text.length > 0)
    );
    chk(
      "a wish with no number takes the typical cost of the game for that kind",
      (() => {
        K.say("client", "I wish I could buy a house.", 30000);
        const w2 = c.x.live.whatifs[c.x.live.whatifs.length - 1];
        lfWhatifSet(c, w2.id, "goal", "coach");
        return c.goals[c.goals.length - 1].k === "Home" && c.goals[c.goals.length - 1].cost === goalTypical(c, "Home");
      })()
    );
  }

  /* ---------- F. the heard list, the counts, the groups ---------- */
  {
    const c = fresh(),
      K = call(c);
    K.say("client", "My rent is 1,850.");
    K.say("client", "No wait, 1,900.");
    K.say("client", "I owe 3,200 on the credit card.", 20000);
    K.say("coach", "Confirming rent 1,900.");
    K.say("client", "Yes.", 1000);
    K.say("coach", "Confirming the card balance 3,200.");
    K.say("client", "No.", 1000);
    K.say("client", "If I moved it would be 900.");
    K.say("coach", "What is your rent?");
    K.say("client", "It went up 50.");
    const H = lfHeard(c, "s1"),
      n = lfCounts(c, "s1"),
      G2 = lfGroups(c, "s1");
    chk(
      "the heard list is in the order of the call",
      H.map(x => x.st).join() === "corrected,filled,filled,confirmed,waiting,whatif,kept",
      H.map(x => x.st).join()
    );
    chk(
      "each item has its quote, its side and its time",
      H.every(
        x =>
          typeof x.quote === "string" &&
          x.quote.length > 0 &&
          (x.side === "coach" || x.side === "client") &&
          x.at > 0 &&
          x.sid === "s1"
      )
    );
    chk(
      "the counts for the end of the call: 6 heard, 1 confirmed out loud, 5 to check, 1 what-if",
      n.heard === 6 &&
        n.confirmed === 1 &&
        n.check === 5 &&
        n.whatifs === 1 &&
        n.waiting === 1 &&
        n.kept === 1 &&
        n.filled === 2,
      JSON.stringify(n)
    );
    chk(
      "the groups by area, in the order of the review",
      G2.map(g => g.area).join() === "housing,debts,whatifs",
      G2.map(g => g.area).join()
    );
    chk("in a group, what is not sure comes first", G2[0].items[0].st === "kept" && G2[0].skip === 1);
    chk(
      "another session of the same profile has its own list",
      lfHeard(c, "s2").length === 0 && lfCounts(c, "s2").heard === 0
    );
    chk(
      "the stored shape is plain data that survives a save",
      JSON.stringify(JSON.parse(JSON.stringify(c.x.live))) === JSON.stringify(c.x.live) && c.x.live.v === 1
    );
    chk(
      "a profile that never had a session reads as empty, with no defect",
      lfHeard(newChar(), "s1").length === 0 &&
        lfCounts(newChar()).check === 0 &&
        lfTag(newChar(), "spend:Home/rent", 5) === null
    );
  }

  /* ---------- G. the game keeps a heard Guess as it is ---------- */
  {
    const c = fresh(),
      K = call(c);
    K.say("client", "My rent is 1,837.");
    K.say("client", "I have 2,211 in savings.");
    chk(
      "the fill of the game does not round or re-scale a heard Guess",
      row(c, "spends", "Home").amt === 1837 && row(c, "cashes", "Savings").amt === 2211
    );
    /* the person makes Food real: the game spreads the rest over its own guesses only */
    Object.assign(row(c, "spends", "Food"), { amt: 900, s: true });
    allocFillAll(c);
    chk(
      "after the person sets one line, the heard line still holds 1,837 and stays",
      row(c, "spends", "Home").amt === 1837 && c.spends.length === 5 && row(c, "spends", "Home").h === 1
    );
    Object.assign(row(c, "cashes", "Checking"), { amt: 9000, s: true });
    allocFillAll(c);
    chk(
      "a heard line is not removed when the real lines pass the first guess (cash)",
      !!row(c, "cashes", "Savings") && row(c, "cashes", "Savings").amt === 2211
    );
    c.spends.forEach(x => {
      if (!x.h) x.s = false;
    });
    applyTypical(c);
    chk(
      "setup run again keeps the heard line of Money going out",
      row(c, "spends", "Home").amt === 1837 && row(c, "spends", "Home").h === 1
    );
    const plain = newChar();
    applyTypical(plain);
    const p0 = JSON.stringify(plain.spends);
    allocFillAll(plain);
    chk(
      "a profile with no heard line is filled the same as before",
      JSON.stringify(plain.spends) === p0 && !plain.x.live
    );
    chk(
      "a typed rate is Exact as before; a heard one is a Guess; a confirmed one is Close",
      dbRate({ rate: 20 }).cf === 3 &&
        dbRate({ rate: 20, ratecf: 0 }).cf === 0 &&
        dbRate({ rate: 20, ratecf: 2 }).cf === 2 &&
        dbRate({ apr: "15% to 25%" }).cf === 2
    );
  }
  {
    /* the person taps a band on a debt whose rate was heard */
    const n0 = G.chars.length,
      act0 = G.active,
      demo0 = G.demo,
      a = newChar({ name: "Dee" });
    G.demo = false;
    G.chars.push(a);
    G.active = n0;
    const c = C(),
      K = call(c);
    K.say("client", "I owe 3,200 on the credit card.");
    K.say("client", "The card is at 24.99 percent.");
    save();
    go("home");
    chk("before the tap: a heard rate", c.debts[0].rate === 24.99 && c.debts[0].ratecf === 0);
    X("debtplan");
    X("dbone", "0");
    X("dbset", "15% to 25%", "apr", { l: "0" });
    chk(
      "the band that the person taps takes the place of the heard rate, and is Close",
      c.debts[0].rate === undefined &&
        c.debts[0].ratecf === undefined &&
        c.debts[0].apr === "15% to 25%" &&
        dbRate(c.debts[0]).cf === 2
    );
    chk(
      "the call does not change that answer of the person",
      (() => {
        const r = K.say("client", "The card is at 26 percent.", 60000);
        return ks(r) === "kept" && c.debts[0].rate === undefined && last(c).why === LF_WHY.hand;
      })()
    );
    chk(
      "the screens of the game draw a profile with heard values with no defect",
      clean(app()) && (X("close"), go("money"), clean(app())),
      junk(app())
    );
    G.chars.length = n0;
    G.active = act0;
    G.demo = demo0;
    save();
    go("home");
  }
}
