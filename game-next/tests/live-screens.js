/* ============================================================================
   SLAM the Game, test: tests/live-screens.js
   PURPOSE     Live Session Mode, Part 6: the two screens during the call. (1) The card "Next question
               to ask" follows the intake order of the game (sharpList) with the words of "one small
               question at a time" (ASK, ASK_NONE), and skips what is known or heard. (2) The handshake
               phrase for a Guess ("Confirming rent 1,850"), read back by the reader of the call itself.
               (3) The coach's screen: the profile by area, each value with its mark, the heard tag, the
               glow and the pulse; only the group that just changed is open; the heard list shows the
               last 3 and a count; the what-if counter. (4) The client's calm screen: only the four top
               numbers, each from the game's functions with its mark, a Recalculating line when one
               moves, "Show details" for the profile, and nothing else to press but Pause and End.
               (5) The styles: the tag, the glow (4 seconds), the pulse, a plain mark with reduced
               motion, the columns that stack at 390, no red.
   INPUT       The game scripts (harness.cjs); the live files, loaded here. Stand-ins for the database,
               the channel, the microphone and the saved games (livesim.js).
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: account/livescreen.js (lsAskOrder, lsNext, lsConfirmSay,
               lsNums, lsRecalc, lsProfile, livePartCoach, livePartClient, lsClick), account/liveroom.js
               (lrRoomHTML), session.html (the styles).
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
      for (let i = 0; i < 30; i++) await Promise.resolve();
    },
    row = (c, sec, k) => (c[sec] || []).find(x => x.k === k),
    buttons = h => (h.match(/data-a="([a-z]+)"/g) || []).map(s => s.slice(8, -1));
  const call = async o => {
    o = o || {};
    const clock = simClock(),
      db = simDb(clock),
      hub = simHub(clock, 100),
      sb = simSb(clock);
    db.coaches.coach1 = true;
    sb.coaches.coach1 = true;
    const made = await db.as("coach1").inviteMake("Sam", "Dana"),
      used = await db.as("client1").inviteUse(made.data.token),
      sid = used.data.session.id,
      P = simPair({ clock, db, hub, sid, coach: "coach1", client: "client1", sb, name: "Sam", clientCan: o.clientCan });
    await P.coach.R.join();
    await P.client.R.join();
    await P.client.R.game.ready;
    await P.coach.R.game.ready;
    for (const s of ["coach", "client"]) {
      await P[s].R.act("ok");
      await P[s].R.act("headphones", true);
    }
    await clock.run(300);
    await simReady(P);
    await P.coach.R.act("start");
    await clock.run(1500);
    await settle();
    return { clock, db, hub, sb, sid, P };
  };
  const say = async (T, side, text, ms) => {
    T.P[side].speech.say(text);
    await T.clock.run(ms == null ? 2500 : ms);
    await settle();
  };

  /* ---------- 1. the next question: the order and the words of the game ---------- */
  {
    const c = newChar({ name: "Sam" }),
      N0 = lsNext(c, "s1");
    chk(
      "on a new profile the first question is the first one of the game: income, with the words of ASK",
      N0.q && N0.q.k === "take" && N0.q.row === "A main job" && N0.q.say === ASK.take.q({ k: "A main job" }),
      N0.q
    );
    const t = JSON.parse(JSON.stringify(c));
    t.goals = [];
    applyTypical(t);
    chk(
      "the order is sharpList of the game, with the plain first question for debt and investing when there are none",
      JSON.stringify(lsAskOrder(t)) ===
        JSON.stringify(
          sharpList(t)
            .filter(k => ASK[k])
            .concat(["debt", "inv"])
        ),
      lsAskOrder(t)
    );
    const g = JSON.parse(JSON.stringify(t));
    g.gentle = true;
    g.debts = [{ k: "Credit card balance", amt: 900, s: false, high: true }];
    chk("a gentle profile hears about debt last, as in the game", lsAskOrder(g).slice(-1)[0] === "debt", lsAskOrder(g));
    /* each line known: the questions move on, in the order of the game */
    t.incs.forEach(x => (x.s = true));
    chk("a known income is skipped: the next question is the first spending line", lsNext(t, "s1").q.k === "spend");
    t.spends.forEach(x => (x.s = true));
    t.cashes.forEach(x => (x.s = true));
    const N1 = lsNext(t, "s1");
    chk(
      "with no debt rows, the plain first question of the game comes next",
      N1.q.k === "debt" && N1.q.say === ASK_NONE.debt.q && N1.q.row === "",
      N1.q
    );
    t.x = t.x || {};
    t.x.none = { debt: true };
    chk("after a plain no, the next question is the one about investing", lsNext(t, "s1").q.say === ASK_NONE.inv.q);
    t.x.none.inv = true;
    chk("when each one is known, there is no question left", lsNext(t, "s1").q === null && lsNext(t, "s1").left === 0);
  }

  /* ---------- 2. the call: the next question skips what was heard; the handshake phrase ---------- */
  const T = await call(),
    R = T.P.coach.R,
    RC = T.P.client.R;
  {
    await say(T, "coach", "How often do you get paid?");
    await say(T, "client", "I get paid every two weeks, two thousand one hundred each time.");
    await say(T, "coach", "And what is your rent?");
    await say(T, "client", "My rent is 1,850 a month.");
    const c = RC.game.get(),
      N = lsNext(c, T.sid);
    chk(
      "after income and rent were heard, the next question is a spending line that was not heard",
      N.q && N.q.k === "spend" && N.q.row !== "Home",
      N.q
    );
    chk(
      "the handshake phrase for the oldest firm Guess is the coach's words, read back by the reader of the call",
      !!N.confirm && /^Confirming /.test(N.confirm.say) && lfAskOf(N.confirm.say, null).id === N.confirm.id,
      N.confirm
    );
    chk(
      "the phrase for rent reads like the brief: Confirming rent 1,850",
      lsConfirmSay("spend:Home/rent", 1850) === "Confirming rent 1,850"
    );
    const h = livePartCoach(R);
    chk(
      "the coach's screen: the profile on the left, the next question and the heard list on the right",
      /class="lscols"/.test(h) &&
        /Sam's profile/.test(h) &&
        /Next question to ask/.test(h) &&
        /Heard/.test(h) &&
        clean(h),
      junk(h)
    );
    chk(
      "the card says the words of the game and the handshake phrase",
      h.includes(lsEsc(N.q.say)) && h.includes(N.confirm.say)
    );
    chk(
      "each value has its mark and the heard tag",
      /Housing/.test(h) &&
        /\$1,850/.test(h) &&
        /class="pill lv guess">Guess</.test(h) &&
        /class="lf-heard[^"]*">heard</.test(h)
    );
    chk(
      "only the group that just changed is open (housing, after the rent)",
      /data-g="housing" data-d="1" open/.test(h) &&
        !/data-g="income"[^>]* open/.test(h) &&
        !/data-g="debts"[^>]* open/.test(h)
    );
    chk("a value that just landed glows (lf-glow)", /class="lsrow lf-glow"/.test(h));
    await T.clock.run(LF.GLOW_MS + 500);
    chk("after 4 seconds the glow is gone", !/lf-glow/.test(livePartCoach(R)));
    /* a group that the coach opened stays open */
    lsToggle({ dataset: { g: "income" }, open: true }, R);
    chk("a group the coach opened stays open through a redraw", /data-g="income"[^>]* open/.test(livePartCoach(R)));
    lsToggle({ dataset: { g: "bills", d: "1" }, open: true }, R);
    chk(
      "the toggle the browser sends for a group drawn open is not taken as the coach's choice",
      R.ls.open.bills === undefined
    );
    /* confirmed out loud: the check and the pulse */
    await say(T, "coach", "Confirming rent 1,850.", 2000);
    await say(T, "client", "Yes.", 500);
    const h2 = livePartCoach(R);
    chk(
      "confirmed out loud: Close, the check and the pulse on the coach's screen",
      /✓ confirmed out loud/.test(h2) && /lf-pulse/.test(h2) && /class="pill lv ">Close</.test(h2),
      h2.slice(0, 400)
    );
    chk("the client's screen pulses too (it shows it in Show details)", RC.ls.pulse["spend:Home/rent"] > 0);
  }

  /* ---------- 3. the heard list: the last 3 and a count; the what-if counter ---------- */
  {
    await say(T, "coach", "What about groceries?");
    await say(T, "client", "About 450.");
    await say(T, "coach", "Any cards with a balance?");
    await say(T, "client", "One card, 3,200 on it.");
    await say(T, "client", "If I moved in with my sister, rent would be 900.");
    await say(T, "client", "Someday I want to take a trip to Japan.");
    const h = livePartCoach(R),
      list = h.slice(h.indexOf("lsheard"));
    chk(
      "the heard list shows the last 3, and the older ones are closed under Show the N before",
      (list.split("</ul>")[0].match(/<li/g) || []).length === 3 && /Show the \d+ before/.test(h)
    );
    chk("during the call the what-ifs are a counter only", /2 what-ifs heard/.test(h) && !/trip to Japan/.test(h));
    chk("the heard pill counts each thing heard", /\d+ things<\/span>/.test(h));
  }

  /* ---------- 4. the client's calm screen ---------- */
  {
    const h = livePartClient(RC);
    chk(
      "calm mode: four stat tiles of the kit, and no profile",
      (h.match(/class="dktile/g) || []).length === 4 && !/lsgroup/.test(h) && /Just talk/.test(h) && clean(h),
      junk(h)
    );
    chk(
      "the four numbers: free to spend, next goal date, net worth, high-interest debt-free",
      ["Free to spend", "Next goal date", "Net worth", "High-interest debt-free"].every(l => h.includes(l))
    );
    const c = RC.game.get(),
      d = derive(c),
      f = freeToSpend(c, d),
      o = debtOutlook(c, d),
      nums = lsNums(c);
    chk(
      "each number comes from the game's own functions (freeToSpend, derive, debtOutlook)",
      nums[0].n === (f.free <= 0 || f.short > 0 ? 0 : f.week) &&
        nums[2].n === Math.round(d.nw) &&
        (!o || o.grow || nums[3].n === o.mo)
    );
    chk(
      "each number has its mark (a Guess here)",
      nums.filter(n => n.lv).every(n => /Guess|Close|Exact/.test(n.lv)) && /Guess/.test(h)
    );
    const live = lrRoomHTML(RC, T.clock.now(), false);
    chk(
      "during the call the client can press only Show details, Pause and End",
      JSON.stringify(buttons(live).sort()) === JSON.stringify(["lrend", "lrpause", "lsdetails"]),
      buttons(live)
    );
    chk(
      "the coach can press only Pause and End",
      JSON.stringify(buttons(lrRoomHTML(R, T.clock.now(), false)).sort()) === JSON.stringify(["lrend", "lrpause"])
    );
    chk(
      "Pause and End are big buttons (64px), and End asks one time",
      /button\.big\{min-height:64px/.test(fs.readFileSync(GAME_DIR + "session.html", "utf8")) &&
        /End the session for both of you\?/.test(lrRoomHTML(RC, T.clock.now(), true))
    );
    lsClick("lsdetails", {}, RC);
    const hd = livePartClient(RC);
    chk(
      "Show details shows the full profile",
      /Your profile/.test(hd) && /lsgroup/.test(hd) && /Hide details/.test(hd)
    );
    lsClick("lsdetails", {}, RC);
    /* a number moves: the Recalculating line */
    await say(T, "coach", "What is the rate on that card?");
    await say(T, "client", "24.99 percent.");
    await say(T, "coach", "How much is in savings?");
    await say(T, "client", "About 3,000.", 500);
    const hr = livePartClient(RC);
    chk(
      "when a top number moves, one Recalculating line says what changed, in calm words",
      !!RC.ls.recalc &&
        /lsrecalc/.test(hr) &&
        /(Recalculating|New route)/.test(hr) &&
        !/mistake|failed|behind|off track/i.test(hr),
      RC.ls.recalc
    );
    chk("the tile that moved glows", /class="dktile lf-glow"/.test(hr));
    await T.clock.run(LS_RECALC_MS + 1000);
    chk("the Recalculating line goes away after a while", !/lsrecalc/.test(livePartClient(RC)));
  }

  /* ---------- 5. Recalculating words: sooner is a win, later is calm ---------- */
  {
    const was = [{ id: "debt", label: "High-interest debt-free", show: "Mar 2027", kind: "date", n: 10 }],
      sooner = lsRecalc(
        was,
        [{ id: "debt", label: "High-interest debt-free", show: "Jan 2027", kind: "date", n: 6 }],
        "2026-11-25"
      ),
      later = lsRecalc(
        was,
        [{ id: "debt", label: "High-interest debt-free", show: "Jun 2027", kind: "date", n: 14 }],
        "2026-11-25"
      );
    chk(
      "a date that moves sooner reads as a win",
      sooner && sooner.win === true && sooner.title === "New route",
      sooner
    );
    chk(
      "a date that moves later reads calm: Recalculating",
      later && later.win === false && later.title === "Recalculating",
      later
    );
    chk("nothing moved: no line", lsRecalc(was, was, "2026-11-25") === null);
  }

  /* ---------- 6. the styles ---------- */
  {
    const page = fs.readFileSync(GAME_DIR + "session.html", "utf8"),
      css = page.match(/<style>[^]*<\/style>/)[0];
    chk(
      "the heard tag, the glow and the pulse have styles",
      /\.lf-heard\{/.test(css) && /\.lf-glow\{animation:lfglow 4s/.test(css) && /\.lf-pulse\{/.test(css)
    );
    chk(
      "with reduced motion the glow and the pulse are a plain mark",
      /@media \(prefers-reduced-motion:reduce\)\{\.lf-glow\{animation:none;outline/.test(css)
    );
    chk(
      "the two columns stack on a phone",
      /@media \(max-width:760px\)\{\.lscols\{grid-template-columns:minmax\(0,1fr\)\}\}/.test(css)
    );
    chk("the kit's stat tiles are styled on this page too", /\.dktile\{/.test(css) && /\.dkstats\{/.test(css));
    chk("no red on the page", !/\bred\b|#f00\b|#ff0000|crimson/i.test(css));
    chk(
      "the stopped light is a neutral outline with the word",
      lvLight({ status: "stopped" }).look === "outline" && lvLight({ status: "stopped" }).word === "Stopped"
    );
  }
  R.leave();
  RC.leave();
})();
