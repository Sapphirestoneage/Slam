/* ============================================================================
   SLAM the Game, test: tests/live-review.js
   PURPOSE     Live Session Mode, Part 7: the review after End, and "Show plan". (1) The counts: "Heard X
               things. Y confirmed out loud. Z to check." (2) The groups by area, closed, what is not sure
               first, the source of each value. (3) "Approve all in this group": who and when, and no
               level goes up. (4) Fix one item three ways: a number they said, a typed number, "Leave it
               out" (the row goes back to before the call; the quote stays). (5) A value that the person
               entered stays protected through the review. (6) The what-ifs: a type, and a link to where
               it went. (7) Each tap of the coach saves the client's game through cpSaveGame, with the
               stamp. (8) The client's ended screen is calm. (9) Show plan on both ended screens: the
               top 3 moves, the era, the next payday task, each with its Guess mark. (10) A client on a
               phone that cannot listen: the review comes, with the coach's lines only. (11) With the
               switch off, the session page says Coming soon and the game loads none of this.
   INPUT       The game scripts (harness.cjs); the live files, loaded here. Stand-ins (livesim.js).
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: account/livereview.js, account/livescreen.js (lsPlan),
               account/livegame.js (lgCoach.act), account/coachpage.js (cpSaveGame).
   ========================================================================= */
(async () => {
  const fs = require("fs"),
    vm = require("vm");
  [
    "account/live.js",
    "account/liveio.js",
    "account/livefill.js",
    "account/liveland.js",
    "account/livesim.js",
    "account/coachpage.js",
    "account/liveroom.js",
    "account/livegame.js",
    "account/livescreen.js",
    "account/livereview.js",
  ].forEach(f => vm.runInThisContext(fs.readFileSync(GAME_DIR + f, "utf8"), { filename: f }));
  const settle = async () => {
      for (let i = 0; i < 40; i++) await Promise.resolve();
    },
    row = (c, sec, k) => (c[sec] || []).find(x => x.k === k),
    saved = sb => lgPerson(cpGame(sb.rows.filter(r => r.owner === "client1")).g);
  /* A whole call, then End. o.before(c): change the client's game before the call. o.lines: the script. */
  const ended = async o => {
    o = o || {};
    const clock = simClock(),
      db = simDb(clock),
      hub = simHub(clock, 100),
      sb = simSb(clock);
    db.coaches.coach1 = true;
    sb.coaches.coach1 = true;
    if (o.before) {
      const own = newChar({ name: "Sam" });
      own.goals = [];
      applyTypical(own);
      o.before(own);
      CP.sb = sb.as("client1");
      await cpSaveGame(
        "client1",
        g => g,
        () => Object.assign(lgFirst("Sam"), { chars: [own] })
      );
    }
    const made = await db.as("coach1").inviteMake("Sam", "Dana"),
      used = await db.as("client1").inviteUse(made.data.token),
      sid = used.data.session.id,
      P = simPair({ clock, db, hub, sid, coach: "coach1", client: "client1", sb, name: "Sam", clientCan: o.clientCan });
    await P.coach.R.join();
    await P.client.R.join();
    await P.client.R.game.ready;
    for (const s of ["coach", "client"]) {
      await P[s].R.act("ok");
      await P[s].R.act("headphones", true);
    }
    await clock.run(300);
    await P.coach.R.act("start");
    await clock.run(300);
    for (const l of o.lines || simScriptFill()) {
      await clock.run(l[0]);
      P[l[1]].speech.say(l[2]);
    }
    await clock.run(3000);
    await settle();
    await P.coach.R.act("end");
    await clock.run(3000);
    await settle();
    return { clock, db, hub, sb, sid, P, R: P.coach.R, RC: P.client.R };
  };
  const tap = async (R, a, v, k) => {
    await livePartClick(a, { dataset: { a, v, k } }, R);
    await settle();
  };

  const T = await ended(),
    R = T.R,
    c0 = () => R.game.get();
  /* ---------- 1. the counts ---------- */
  {
    const n = lrvCounts(c0(), T.sid),
      base = lfCounts(c0(), T.sid);
    chk(
      "the counts come from lfCounts: heard, confirmed out loud, to check",
      n.heard === base.heard &&
        n.confirmed === base.confirmed &&
        n.left === base.check - 1 /* the rent heard, then confirmed out loud: the confirmed item stands for it */ &&
        n.heard > 8 &&
        n.confirmed === 1,
      n
    );
    const h = livePartEnded(R);
    chk(
      "the review opens with the one line of the brief",
      h.includes("Heard " + n.heard + " things. 1 confirmed out loud. " + n.left + " to check.") && clean(h),
      junk(h)
    );
    chk("the review is the coach's: the client's device has none of it", !/data-a="rv/.test(livePartEnded(T.RC)));
  }
  /* ---------- 2. the groups ---------- */
  {
    const G1 = lrvGroups(c0(), T.sid);
    chk(
      "the groups are the areas of the brief, in order, what-ifs included",
      G1.map(g => g.area).join() === "income,housing,debts,accounts,bills,whatifs",
      G1.map(g => g.area)
    );
    const h = livePartEnded(R);
    chk(
      "each group is closed at first",
      (h.match(/<details class="lsgroup"[^>]*>/g) || []).every(t => !/ open/.test(t))
    );
    chk(
      "a confirmed-out-loud item is counted, not in the list to check, and can be opened",
      G1.find(g => g.area === "housing").said.length === 1 &&
        G1.find(g => g.area === "housing").check.length === 0 &&
        /1 confirmed out loud<\/summary>/.test(h)
    );
    const debts = G1.find(g => g.area === "debts").check;
    chk(
      "in a group, what is not sure comes first",
      debts.length > 1 && (debts[0].unsure || debts[0].st === "kept" || debts.every(x => !x.unsure && x.st !== "kept")),
      debts.map(x => x.st)
    );
    chk("the source of a value is said: their words", /From their words/.test(h));
    chk(
      "the source words for the later parts are ready: your words, the Samsung file, the AI pass",
      lrvSource({ side: "coach" }) === "your words" &&
        lrvSource({ src: "file" }) === "the Samsung file" &&
        lrvSource({ src: "ai" }) === "the AI pass"
    );
  }
  /* ---------- 3. approve all in a group; approve never raises a level ---------- */
  {
    const before = JSON.stringify(c0().spends.map(x => [x.k, x.amt, x.s, x.cf])),
      w0 = T.sb.writes,
      mod0 = saved(T.sb).mod;
    await tap(R, "rvall", "bills");
    const c = saved(T.sb),
      B = c.x.live.review,
      g = lrvGroups(c, T.sid).find(x => x.area === "bills");
    chk("approve all marks each item of the group as approved", g.check.length === 0 && g.done.length >= 1);
    chk(
      "each approval says who and when",
      g.done.every(x => B[x.id] && B[x.id].st === "ok" && B[x.id].by === "coach" && B[x.id].at > 0)
    );
    chk(
      "approve changes no amount and raises no level, and never sets Exact",
      JSON.stringify(c.spends.map(x => [x.k, x.amt, x.s, x.cf])) === before && c.spends.every(x => !(x.cf >= 3))
    );
    chk(
      "the coach's tap saved the client's game through cpSaveGame, with a new stamp and the coach's mark",
      T.sb.writes > w0 &&
        c.mod > mod0 &&
        saved(T.sb) &&
        cpGame(T.sb.rows.filter(r => r.owner === "client1")).g.coachEdit.by === "coach"
    );
    chk(
      "the audit log has one line for the coach's change",
      T.sb.audits.some(a => a.by === "coach1" && a.name === "audit_write")
    );
    const inc = lrvToCheck(c0(), T.sid).find(x => x.key === "inc:A main job");
    lrvApprove(c0(), inc.id, "coach", 1);
    chk(
      "approve one: the income stays a Guess with its mark",
      row(c0(), "incs", "A main job").s === false &&
        row(c0(), "incs", "A main job").h === 1 &&
        !row(c0(), "incs", "A main job").cf
    );
  }
  /* ---------- 4. fix one item three ways ---------- */
  {
    /* (a) a number they said: the card was 3,200, then 3,400 */
    const card = lrvToCheck(c0(), T.sid).find(x => x.key === "debt:Credit card balance" && x.st === "filled"),
      ch = lrvChoices(c0(), card);
    chk(
      "a tap on one item offers each number heard for it",
      ch.fix && ch.pick.map(p => p.v).join() === "3400,3200",
      ch
    );
    R.rv = { open: { [card.id]: true }, msg: "" };
    const h = livePartEnded(R);
    chk(
      "the open item shows the three ways: a number they said, a typed number, Leave it out (and This is right)",
      /data-a="rvpick"/.test(h) &&
        /data-a="rvtype"/.test(h) &&
        /data-a="rvout"/.test(h) &&
        /data-a="rvok"/.test(h) &&
        /<label for="rvin-/.test(h)
    );
    await tap(R, "rvpick", card.id, "3200");
    let c = saved(T.sb);
    chk(
      "pick: the card is 3,200, still a Guess, and the review says the coach set it",
      row(c, "debts", "Credit card balance").amt === 3200 &&
        row(c, "debts", "Credit card balance").s === false &&
        c.x.live.review[card.id].st === "fixed" &&
        c.x.live.review[card.id].v === 3200
    );
    /* (b) a typed number: groceries */
    const gro = lrvToCheck(c0(), T.sid).find(x => x.key === "spend:Food/groceries");
    global.document.getElementById = id => (id === "rvin-" + gro.id ? { value: "$480" } : null);
    await tap(R, "rvtype", gro.id);
    c = saved(T.sb);
    chk(
      "type: the typed 480 lands as a Guess, and the line is the sum of its pieces",
      c.x.live.marks["spend:Food/groceries"].v === 480 &&
        row(c, "spends", "Food").s === false &&
        c.x.live.review[gro.id].how === "type",
      [c.x.live.marks["spend:Food/groceries"], row(c, "spends", "Food")]
    );
    global.document.getElementById = id => (id === "rvin-" + gro.id ? { value: "lots" } : null);
    await tap(R, "rvtype", gro.id);
    chk("a box with no number changes nothing and says how to type it", /digits/.test(R.rv.msg));
    global.document.getElementById = () => null;
    /* (c) leave it out: groceries go back to the game's own guess from before the call */
    const base = c.x.live.rows["spends:Food"].base;
    await tap(R, "rvout", gro.id);
    c = saved(T.sb);
    /* before the call it was a guess of the game: it is again, with the amount from before the call; then the
       game's own fill (allocFillAll) keeps the guess of the area whole, as it does for each guess line */
    chk(
      "leave it out: the row is back to how it was before the call (a guess of the game), with no heard mark",
      c.x.live.review[gro.id].back === true &&
        c.x.live.review[gro.id].was.v >= 480 &&
        row(c, "spends", "Food").amt !== c.x.live.review[gro.id].was.v &&
        row(c, "spends", "Food").s === base.s &&
        !row(c, "spends", "Food").h &&
        !liveOurs(row(c, "spends", "Food"), c.x.live.rows["spends:Food"]),
      [row(c, "spends", "Food"), base, c.x.live.review[gro.id]]
    );
    chk(
      "leave it out keeps the quote in the review record, and nothing is deleted from the heard list",
      c.x.live.review[gro.id].st === "out" &&
        /400-ish/.test(c.x.live.review[gro.id].quote) &&
        c.x.live.heard.some(x => x.id === gro.id)
    );
    /* a row that the call added: savings */
    const sav = lrvToCheck(c0(), T.sid).find(x => x.key === "cash:Savings"),
      had = c.x.live.rows["cashes:Savings"].base.had;
    await tap(R, "rvout", sav.id);
    c = saved(T.sb);
    chk(
      "leave it out on a line the call added: the line is not there, as before the call; the words stay",
      had === false &&
        !row(c, "cashes", "Savings") &&
        c.x.live.review[sav.id].gone === true &&
        /3 and 4 thousand/.test(c.x.live.review[sav.id].quote)
    );
  }
  /* ---------- 5. a value the person entered stays protected ---------- */
  {
    const P = await ended({
      before: own => {
        const h = row(own, "spends", "Home");
        h.amt = 1600;
        h.s = true;
        own.mod = 1000;
      },
      lines: [
        [1500, "coach", "And what is your rent?"],
        [2500, "client", "Rent is eighteen fifty a month."],
      ],
    });
    const c = P.R.game.get(),
      it = lrvToCheck(c, P.sid).find(x => x.key === "spend:Home/rent"),
      ch = lrvChoices(c, it);
    chk(
      "the heard rent waits with the reason, and the review offers no fix",
      it.st === "kept" && !ch.fix && ch.why === LF_WHY.hand
    );
    chk(
      "a fix of a protected value is refused with the reason",
      lrvFix(c, P.sid, it.id, "type", 1900, "coach", 1).why === LF_WHY.hand
    );
    lrvOut(c, it.id, "coach", 2);
    chk(
      "leave it out changes nothing of a typed value",
      row(c, "spends", "Home").amt === 1600 && row(c, "spends", "Home").s === true
    );
    await tap(P.R, "rvok", it.id);
    const s = saved(P.sb);
    chk(
      "after the review the saved rent is still the person's own 1,600, Close, with no heard mark",
      row(s, "spends", "Home").amt === 1600 && row(s, "spends", "Home").s === true && !row(s, "spends", "Home").h
    );
    chk("a confirmed-out-loud value is protected too", lrvWhy(c0(), { key: "spend:Home/rent" }) === LF_WHY.voice);
  }
  /* ---------- 6. the what-ifs: a type, and where it went ---------- */
  {
    const W = lrvGroups(c0(), T.sid).find(g => g.area === "whatifs").check,
      q = x => lfWhatif(c0(), x.ref).quote;
    chk("the three what-ifs of the call wait for a type", W.length === 3);
    chk("a what-if with no type cannot be approved yet", lrvApprove(c0(), W[0].id, "coach", 1) === null);
    const trip = W.find(x => /Japan/.test(q(x))),
      job = W.find(x => /second job/.test(q(x))),
      sister = W.find(x => /sister/.test(q(x)));
    R.rv = { open: { [trip.id]: true }, msg: "" };
    chk(
      "an open what-if shows the five types to tap",
      LF_TYPES.every(t => livePartEnded(R).includes('data-k="' + t[0] + '"'))
    );
    await tap(R, "rvwtype", trip.id, "goal");
    let c = saved(T.sb);
    const goal = c.goals.find(g => g.live === trip.ref);
    chk(
      "Goal or wish: one goal on the bucket list, and the review links to it",
      !!goal && c.x.live.review[trip.id].link.to === "goals" && /Bucket list/.test(c.x.live.review[trip.id].link.text)
    );
    await tap(R, "rvwtype", job.id, "scenario");
    await tap(R, "rvwtype", sister.id, "life");
    c = saved(T.sb);
    chk(
      "Scenario links to What if; Life transition links to Break in case of emergency",
      /^sim/.test(c.x.live.review[job.id].link.to) && c.x.live.review[sister.id].link.act === "transit"
    );
    R.rv = { open: { [trip.id]: true }, msg: "" };
    chk("after the type the item says where it went", /Went to: Bucket list/.test(livePartEnded(R)));
    /* a Ceiling with no field in the quote: the coach picks the field and the number */
    lrvWhatif(c0(), job.id, "ceiling", "coach", 5);
    chk("a Ceiling with no field heard waits for the field and the number", lfWhatif(c0(), job.ref).link.open === true);
    lrvWhatif(c0(), job.id, "ceiling", "coach", 6, { key: "spend:Home/rent", v: 2000 });
    chk(
      "with the field and the number, the limit is kept next to the field",
      lfStore(c0()).limits["spend:Home/rent"].hi === 2000
    );
    chk("a what-if changes no amount", row(c0(), "spends", "Home").amt === 1850);
  }
  /* ---------- 7. the client's ended screen, and Show plan on both ---------- */
  {
    const h = livePartEnded(T.RC);
    chk(
      "the client's ended screen is calm: the coach is checking what was heard",
      /Your coach is checking what was heard/.test(h) && /Show plan/.test(h) && !/to check/.test(h) && clean(h)
    );
    lsClick("lsplan", {}, T.RC);
    const hp = livePartEnded(T.RC),
      plan = lsPlan(T.RC.game.get());
    chk(
      "Show plan: the era, the top 3 moves, the next payday task",
      /Your plan/.test(hp) &&
        hp.includes(lsEsc(plan.era)) &&
        /Top 3 moves/.test(hp) &&
        /Next payday/.test(hp) &&
        (hp.match(/<li><b>/g) || []).length === Math.min(3, plan.moves.length)
    );
    chk(
      "the plan comes from the game's own functions (derive, candidates)",
      plan.era === ERAS[derive(T.RC.game.get()).era].n &&
        plan.moves[0].title === candidates(T.RC.game.get(), derive(T.RC.game.get()), todayISO())[0].title
    );
    chk(
      "a plan that rests on a Guess shows the Guess mark on each line",
      plan.lv === "Guess" && (hp.match(/>Guess</g) || []).length >= 3
    );
    lsClick("lsplan", {}, R);
    chk("the coach has Show plan too", /'s plan/.test(livePartEnded(R)) && /Hide the plan/.test(livePartEnded(R)));
  }
  /* ---------- 8. a phone that cannot listen ---------- */
  {
    const P = await ended({ clientCan: false });
    const h = livePartEnded(P.R),
      mine = P.R.lines.filter(l => l.side === "coach").length;
    chk(
      "a client who cannot listen: the review still comes, with the coach's lines only, and nothing filled",
      P.R.room.client_listens === false &&
        /Only your side was heard/.test(h) &&
        h.includes("Your " + mine + " lines") &&
        P.R.lines.every(l => l.side === "coach") &&
        /0 confirmed out loud/.test(h) &&
        lfHeard(P.R.game.get(), P.sid).every(x => x.side === "coach" && x.st !== "filled") &&
        ["incs", "spends", "cashes", "debts"].every(k => P.R.game.get()[k].every(x => !x.h)) &&
        clean(h),
      junk(h)
    );
  }
  /* ---------- 9. the switch off ---------- */
  {
    LIVE_SESSION_READY = false;
    await lrBoot();
    chk("with the switch off the session page says Coming soon", LR.mode === "soon" && /Coming soon/.test(lrSoon()));
    const index = fs.readFileSync(GAME_DIR + "index.html", "utf8");
    chk(
      "the game itself loads none of the screens or the review",
      !/livescreen\.js|livereview\.js|livegame\.js|liveroom\.js/.test(index) && /account\/liveflag\.js/.test(index)
    );
    LIVE_SESSION_READY = true;
  }
  /* ---------- 10. the words ---------- */
  {
    const src =
      fs.readFileSync(GAME_DIR + "account/livereview.js", "utf8") +
      fs.readFileSync(GAME_DIR + "account/livescreen.js", "utf8");
    chk("no em dash in the new files", src.indexOf(String.fromCharCode(8212)) < 0);
    chk(
      "no blame words in the screens",
      !/\b(mistake|failed|behind|off track|wrong)\b/i.test(src.replace(/\/\*[\s\S]*?\*\//g, ""))
    );
  }
  T.R.leave();
  T.RC.leave();
})();
