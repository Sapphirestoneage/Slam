/* ============================================================================
   SLAM the Game, test: tests/live-session-invite.js
   PURPOSE     Examine Part 1 of Live Session Mode and the things around it: the one switch (off: the
               coach page and the session page show "Coming soon", and nothing runs), the invite link
               (one time, 7 days, the states for the coach, the calm words for a link that cannot be
               used), the invite screen (name, email, password only), the sign-up through the same calm
               path as the game, the coach's card, "Start session" for a person of the roster, the
               screens of the room as HTML, what each screen says before the database file has run,
               the database file read as text (rights, row rules, one time, 7 days), and that no new
               file records or keeps audio.
   INPUT       The game scripts, loaded by harness.cjs. account/live.js, liveio.js, livesim.js,
               liveroom.js, coachpage.js and livecoach.js, loaded here. The database file and the pages
               as text. No database: a stand-in.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: account/liveflag.js, account/live.js, account/liveio.js,
               account/livesim.js, account/liveroom.js, account/livecoach.js, coach.html,
               session.html, index.html, supabase/migrations/20261125210000_live_sessions.sql.
   ========================================================================= */
(async () => {
  const fs = require("fs"),
    vm = require("vm"),
    read = f => fs.readFileSync(GAME_DIR + f, "utf8"),
    dash = String.fromCharCode(8212),
    blame = /\b(mistak(?:e|es|en)|failed|behind|off[ -]track|wrong|invalid|error|sorry)\b/i;
  [
    "account/live.js",
    "account/liveio.js",
    "account/livesim.js",
    "account/coachpage.js",
    "account/livecoach.js",
    "account/liveroom.js",
  ].forEach(f => vm.runInThisContext(read(f), { filename: f }));
  /* a small page for the functions that draw */
  const page = { app: { innerHTML: "" }, vals: {} },
    oldGet = document.getElementById,
    oldLs = global.localStorage,
    ls = simStore();
  document.getElementById = id =>
    id === "app"
      ? page.app
      : id in page.vals
        ? { value: page.vals[id], focus() {} }
        : id === "lrmsg"
          ? (page.msg = page.msg || { innerHTML: "" })
          : null;
  global.localStorage = { getItem: k => ls.get(k), setItem: (k, v) => ls.set(k, v), removeItem: k => ls.del(k) };
  global.location = { origin: "https://example.test", pathname: "/game/coach.html", search: "", hash: "", href: "" };
  let made = 0;
  window.supabase = { createClient: () => (made++, {}) };

  /* ---------- THE SWITCH IS OFF ---------- */
  chk("the switch is off in the code", LIVE_SESSION_READY === false && liveOn() === false);
  chk(
    "the switch is in one file, and that file is the only part that the game loads",
    /let LIVE_SESSION_READY = false;/.test(read("account/liveflag.js")) &&
      /<script src="account\/liveflag\.js/.test(read("index.html")) &&
      !/account\/live(io|sim|room|coach)?\.js/.test(read("index.html").replace(/account\/liveflag\.js/g, ""))
  );
  const off = lcCard();
  chk(
    "off: the coach page shows the two buttons as one calm Coming soon card",
    off.includes("Coming soon") &&
      off.includes("Start session with a new client") &&
      off.includes("Start session") &&
      !off.includes("data-a=") &&
      !off.includes("<button"),
    off
  );
  chk("off: no Start session button in the card of a client", lcClientRow({ owner: "u1" }) === "");
  let calls = 0;
  const spy = new Proxy({}, { get: () => (calls++, async () => ({ ok: false })) });
  LC.db = spy;
  await lcLoad();
  chk(
    "off: a tap of the feature does nothing and reaches no database",
    (await lcClick({ dataset: { a: "lcmake" } })) === true &&
      (await lcClick({ dataset: { a: "lcstart", o: "u1" } })) === true &&
      calls === 0 &&
      LC.made === null
  );
  chk(
    "off: a tap that is not of this file is left to the coach page",
    (await lcClick({ dataset: { a: "note" } })) === false
  );
  global.location.search = "?invite=" + "a".repeat(64);
  await lrBoot();
  chk(
    "off: the session page shows Coming soon, even with an invite in the address",
    page.app.innerHTML.includes("Coming soon") && page.app.innerHTML.includes("Back to the game") && LR.mode === "soon"
  );
  chk(
    "off: it makes no sign-in client, keeps no token, and opens no room",
    made === 0 && Object.keys(ls.m).length === 0 && LR.R === null && LR.sb === null
  );
  chk(
    "off: the token of a link is not read and not kept",
    liveTokenKeep("?invite=" + "a".repeat(64), global.localStorage) === "" && liveToken(global.localStorage) === ""
  );
  chk(
    "off: the game does not send a visitor to the session page",
    liveBack({ pathname: "/game/", search: "", hash: "", replace() {} }, { getItem: () => "a".repeat(64) }) === ""
  );
  const sess = read("session.html"),
    coachPage = read("coach.html");
  chk(
    "the session page starts through lrBoot and nothing else, and each tap asks the switch first",
    /lrBoot\(\)/.test(sess) && (sess.match(/liveOn\(\)/g) || []).length >= 2 && !/createClient/.test(sess)
  );
  chk("the session page is not for search engines", /<meta name="robots" content="noindex">/.test(sess));
  chk(
    "the coach page loads the part, after the roster",
    /account\/coachplus\.js[^]*account\/liveflag\.js[^]*account\/live\.js[^]*account\/liveio\.js[^]*account\/livecoach\.js/.test(
      coachPage
    ) && /core\/soon\.js/.test(coachPage)
  );
  chk(
    "the built list says Partly, behind the switch",
    /Live Session Mode/.test(read("features/built.js")) &&
      btRows().some(r => /Live Session Mode/.test(r.n) && r.st === "p")
  );

  /* ---------- THE SWITCH IS ON (the tests set it) ---------- */
  LIVE_SESSION_READY = true;
  const clock = simClock(Date.UTC(2026, 10, 25, 15)),
    db = simDb(clock),
    DAY = 864e5;
  db.coaches.coach1 = true;

  /* THE INVITE RULES, through the stand-in for the database functions */
  chk(
    "an account with no coach role cannot make a link",
    (await db.as("player9").inviteMake("Sam", "X")).ok === false && db.invites.length === 0
  );
  const mk = await db.as("coach1").inviteMake("Sam", "Dana"),
    tok = mk.data.token;
  chk(
    "a coach makes a link: a token of 64 letters and digits, 7 days",
    mk.ok &&
      /^[a-f0-9]{64}$/.test(tok) &&
      liveTokenClean(tok) === tok &&
      mk.data.expires_at - mk.data.made_at === 7 * DAY
  );
  clock.t += 1000;
  chk("two links have two tokens", (await db.as("coach1").inviteMake("Riley", "Dana")).data.token !== tok);
  const c0 = await db.as(null).inviteCheck(tok);
  chk(
    "a visitor who is not signed in can check a link, and gets the two names and nothing else",
    c0.ok &&
      c0.data.state === "open" &&
      c0.data.coach_name === "Dana" &&
      c0.data.client_name === "Sam" &&
      Object.keys(c0.data).sort().join() === "client_name,coach_name,state"
  );
  chk(
    "a visitor who is not signed in cannot use a link",
    (await db.as(null).inviteUse(tok)).ok === false && db.invites[0].used_at === null
  );
  chk(
    "a visitor reads no invite and no session",
    (await db.as(null).invites()).data.length === 0 && (await db.as("player9").invites()).data.length === 0
  );
  chk(
    "a made-up token opens nothing",
    (await db.as(null).inviteCheck("b".repeat(64))).data.state === "none" &&
      (await db.as("client1").inviteUse("b".repeat(64))).data.state === "none"
  );
  chk(
    "the coach cannot use the coach's own link",
    (await db.as("coach1").inviteUse(tok)).data.state === "own" && db.invites[0].used_at === null
  );
  clock.t += 2 * DAY;
  const use = await db.as("client1").inviteUse(tok);
  chk(
    "the new account uses the link: it is tagged as that coach's client and gets the session room",
    use.data.state === "ok" &&
      use.data.session.coach === "coach1" &&
      use.data.session.client === "client1" &&
      use.data.session.state === "waiting" &&
      use.data.coach_name === "Dana" &&
      db.tags.length === 1 &&
      db.tags[0].coach === "coach1" &&
      db.tags[0].client === "client1"
  );
  chk("who used it and when is kept", db.invites[0].used_by === "client1" && db.invites[0].used_at === clock.t);
  chk(
    "one time: a second account gets a calm no, and nothing changes",
    (await db.as("client2").inviteUse(tok)).data.state === "used" &&
      db.tags.length === 1 &&
      db.sessions.length === 1 &&
      (await db.as(null).inviteCheck(tok)).data.state === "used"
  );
  chk(
    "the same account can open the link again (a reload) and gets the same room",
    (await db.as("client1").inviteUse(tok)).data.session.id === use.data.session.id &&
      db.sessions.length === 1 &&
      (await db.as("client1").inviteCheck(tok)).data.state === "mine"
  );
  const tok2 = db.invites[1].token;
  clock.t += 5 * DAY - 1000;
  chk(
    "a link still works one second before its 7 days end",
    (await db.as(null).inviteCheck(tok2)).data.state === "open"
  );
  clock.t += 1000;
  chk(
    "after 7 days it is expired: a check says so and a use changes nothing",
    (await db.as(null).inviteCheck(tok2)).data.state === "expired" &&
      (await db.as("client3").inviteUse(tok2)).data.state === "expired" &&
      db.invites[1].used_at === null &&
      db.tags.length === 1
  );
  chk(
    "the session and the invite are for that coach, that client and the admin only",
    (await db.as("coach2").sessions()).data.length === 0 &&
      (await db.as("client2").session(use.data.session.id)).data === null &&
      (await db.as("coach1").sessions()).data.length === 1 &&
      (await db.as("client1").sessions()).data.length === 1 &&
      ((db.admins.boss = true),
      (await db.as("boss").sessions()).data.length === 1 && (await db.as("boss").invites()).data.length === 2)
  );
  db.coaches.coach2 = true;
  chk(
    "a second coach account cannot open a room with that client",
    (await db.as("coach2").sessionOpen("client1")).ok === false
  );

  /* THE STATES FOR THE COACH */
  const t = clock.t,
    rows0 = lvInviteRows(db.invites, db.sessions, t);
  chk(
    "the coach's list: the newest first, each with its state",
    rows0.length === 2 &&
      rows0[0].name === "Riley" &&
      rows0[0].state === "expired" &&
      rows0[1].name === "Sam" &&
      rows0[1].state === "signed" &&
      rows0[1].word === "Signed up"
  );
  await db.as("client1").set(use.data.session.id, "seen");
  chk(
    "when the client is in the room the state says so",
    lvInviteState(db.invites[0], db.sessions, clock.t) === "room" && LV_INVITE_WORD.room === "In the room"
  );
  chk(
    "90 seconds after the client left it is 'signed up' again",
    lvInviteState(db.invites[0], db.sessions, clock.t + 91000) === "signed"
  );
  const fresh = (await db.as("coach1").inviteMake("", "Dana")).data;
  chk(
    "a link that nobody used yet is 'sent', and a link with no name still has a row",
    lvInviteState(db.invites[2], db.sessions, clock.t) === "sent" &&
      lvInviteRows(db.invites, db.sessions, clock.t)[0].name === "A new client" &&
      LV_INVITE_WORD.sent === "Sent"
  );
  chk(
    "the address of a link is the session page with the token",
    lvInviteUrl("https://example.test/game/coach.html", fresh.token) ===
      "https://example.test/game/session.html?invite=" + fresh.token
  );
  chk(
    "the coach's name: what the coach typed, or the first part of the email",
    lvCoachName(" Dana ", "x@y.z") === "Dana" &&
      lvCoachName("", "dana.lee42@example.com") === "Dana Lee" &&
      lvCoachName("", "") === "Your coach"
  );

  /* THE TOKEN ON THE DEVICE */
  chk(
    "a token is letters and digits only",
    liveTokenClean("abc") === "" &&
      liveTokenClean("a".repeat(64) + "<script>") === "" &&
      liveTokenClean(" " + tok + " ") === tok
  );
  chk(
    "the token of the address is kept on the device, like ?coach=1 and ?ref=",
    liveTokenKeep("?invite=" + tok, global.localStorage) === tok &&
      ls.m.slam_live_invite === tok &&
      liveToken(global.localStorage) === tok
  );
  let went = "";
  chk(
    "after the confirmation email the game sends the person to the session page, with the sign-in part of the address",
    liveBack(
      { pathname: "/Slam/game/", search: "", hash: "#access_token=x", replace: u => (went = u) },
      global.localStorage
    ) === "/Slam/game/session.html#access_token=x" && went === "/Slam/game/session.html#access_token=x"
  );
  chk(
    "not from the session page itself, and not with no token",
    liveBack({ pathname: "/Slam/game/session.html", search: "", hash: "", replace() {} }, global.localStorage) === "" &&
      liveBack(
        { pathname: "/Slam/game/", search: "", hash: "", replace() {} },
        simStore() && { getItem: () => null }
      ) === ""
  );
  liveTokenDone(global.localStorage);
  chk("a used token leaves the device", liveToken(global.localStorage) === "" && !("slam_live_invite" in ls.m));

  /* THE INVITE SCREEN */
  const inv = lrInviteHTML({ state: "open", coach_name: "Dana", client_name: "Sam" }, "new", "");
  chk(
    "the title has the coach's name from the invite, not a fixed name",
    inv.includes("<h1>Dana invited you to SLAM</h1>") &&
      !/Eli/.test(inv) &&
      lrInviteHTML({ coach_name: "" }, "new", "").includes("Your coach invited you to SLAM")
  );
  chk(
    "name, email, password, and nothing else to fill in",
    (inv.match(/<input /g) || []).length === 3 &&
      inv.includes('id="lrn"') &&
      inv.includes('type="email"') &&
      inv.includes('type="password"') &&
      !/<select|<textarea/.test(inv)
  );
  chk(
    "each box has its label above it, and the name from the invite is filled in",
    (inv.match(/<label for=/g) || []).length === 3 && inv.includes('value="Sam"')
  );
  chk(
    "the line about the laptop and the headphones is the line of the brief",
    inv.includes("Join the call from a laptop with Chrome, and use headphones if you can.")
  );
  chk(
    "it says in one line that Share with my coach starts on",
    inv.includes(suShareLine(true)) && /Share with my coach starts on/.test(inv)
  );
  chk(
    "the privacy link and the advice line come from trust.js",
    inv.includes(TRUST_LINE) && inv.includes(TRUST_PAGE) && inv.includes(tuGateFoot())
  );
  chk(
    "one primary button, and a way in for a person who has an account",
    (inv.match(/class="primary/g) || []).length === 1 &&
      inv.includes("Create my account and join") &&
      inv.includes("I already have an account. Sign in")
  );
  chk(
    "a name with code in it is shown as text",
    lrInviteHTML({ coach_name: '<img src=x onerror="1">' }, "new", "").includes("&lt;img") &&
      !lrInviteHTML({ coach_name: "<b>x" }, "new", "").includes("<b>x")
  );
  for (const st of ["used", "expired", "none"]) {
    const d = lrDeadHTML(st, "Dana", false);
    chk(
      "a link that is " + st + ": calm words, and Ask your coach for a new link",
      d.includes("Ask your coach for a new link") &&
        !blame.test(d.replace(/<[^>]+>/g, " ")) &&
        d.includes("Back to the game") &&
        d.includes("I already have an account. Sign in"),
      d
    );
  }
  chk(
    "the words say which it is",
    /already used/.test(lrDeadHTML("used", "Dana", false)) &&
      /7 days/.test(lrDeadHTML("expired", "", false)) &&
      /Dana can send a new one/.test(lrDeadHTML("used", "Dana", false)) &&
      /Your coach can send a new one/.test(lrDeadHTML("expired", "", false))
  );
  chk(
    "a signed-in person with such a link can look for their session",
    lrDeadHTML("used", "", true).includes("Look for my session")
  );

  /* THE SIGN-UP: the same calm path as the game (tuAuth) */
  const svc = over => ({
    auth: Object.assign(
      {
        signUp: async a => (
          (svc.sent = a),
          { data: { user: { id: "new1", identities: [{}] }, session: null }, error: null }
        ),
        signInWithPassword: async () => ({ data: { session: { user: { id: "client5" } } }, error: null }),
        resend: async () => ({ data: {}, error: null }),
      },
      over || {}
    ),
  });
  const formEl = { querySelector: () => ({ textContent: "Create my account and join", disabled: false }) };
  const tok3 = (await db.as("coach1").inviteMake("Lee", "Dana")).data.token;
  Object.assign(LR, {
    sb: svc(),
    db: db.as(null),
    tok: tok3,
    mode: "invite",
    form: "new",
    user: null,
    inv: { state: "open", coach_name: "Dana" },
  });
  page.vals = { lrn: "", lre: "lee@example.com", lrp: "secret1" };
  page.msg = { innerHTML: "" };
  await lrSubmit(formEl);
  chk(
    "an empty box: one calm line, and nothing is sent",
    page.msg.innerHTML === "Fill in the three boxes." && !svc.sent
  );
  page.vals.lrn = "Lee";
  liveTokenKeep("?invite=" + tok3, global.localStorage);
  await lrSubmit(formEl);
  chk(
    "with email confirmation on, it says Check your email",
    /<b>Check your email\.<\/b>/.test(page.msg.innerHTML) &&
      page.msg.innerHTML.includes("lee@example.com") &&
      page.msg.innerHTML.includes("Send the email again")
  );
  chk(
    "the token stays on the device through the confirmation, and travels with the account too",
    liveToken(global.localStorage) === tok3 &&
      svc.sent.options.data.live_invite === tok3 &&
      svc.sent.options.data.name === "Lee" &&
      svc.sent.options.emailRedirectTo === "https://example.test/game/coach.html"
  );
  chk(
    "the new account starts with Share with my coach on: the same mark as the link ?coach=1",
    ls.m.su_coach === "1" && suInvited("", global.localStorage) === true
  );
  LR.sb = svc({
    signUp: async () => ({
      data: null,
      error: { message: "Error sending confirmation email", status: 500, code: "unexpected_failure" },
    }),
  });
  await lrSubmit(formEl);
  chk(
    "an answer of the sign-in service is shown in calm words, never raw",
    /The email could not be sent\. This is on our side/.test(page.msg.innerHTML) &&
      !/Error sending/.test(page.msg.innerHTML)
  );
  LR.sb = svc({ signUp: async () => ({ data: { user: { id: "x", identities: [] }, session: null }, error: null }) });
  await lrSubmit(formEl);
  chk(
    "an email that has an account: the way to sign in is named",
    /already has an account/.test(page.msg.innerHTML) && /I already have an account\. Sign in/.test(page.msg.innerHTML)
  );
  /* sign-up with a session at once: the link is used and the room opens */
  LR.sb = svc({
    signUp: async () => ({ data: { user: { id: "client5" }, session: { user: { id: "client5" } } }, error: null }),
  });
  LR.db = db.as("client5");
  await lrSubmit(formEl);
  chk(
    "with a session at once: the link is used, the account is tagged, the room opens, the token leaves the device",
    LR.mode === "room" &&
      LR.side === "client" &&
      db.tags.some(x => x.coach === "coach1" && x.client === "client5") &&
      db.invites.find(x => x.token === tok3).used_by === "client5" &&
      liveToken(global.localStorage) === "" &&
      LR.R &&
      LR.R.room &&
      LR.R.room.state === "waiting"
  );
  const lobby = page.app.innerHTML;
  chk(
    "the room opens on the consent, with the exact words",
    lobby.includes(
      "This session is transcribed. Text only, no audio is saved. After the call it is processed by AI to fill in your profile."
    ) &&
      lobby.includes('data-a="lrok"') &&
      lobby.includes(">OK</button>")
  );
  chk(
    "the phone or Safari case shows at once: this browser cannot listen",
    LR.R.mic.status === "cannot" && lobby.includes("This browser can't listen")
  );
  chk(
    "the client reads who is still to tap, and has no Start button",
    lobby.includes("Still to tap OK: you and your coach.") &&
      !lobby.includes('data-a="lrstart"') &&
      lobby.includes("your coach presses Start")
  );
  chk(
    "the headphones question has Yes and No",
    lobby.includes("Using headphones?") &&
      lobby.includes('data-a="lrhp" data-v="1"') &&
      lobby.includes('data-a="lrhp" data-v="0"')
  );
  await lrClick({ dataset: { a: "lrok" } });
  await lrClick({ dataset: { a: "lrhp", v: "0" } });
  chk(
    "a tap on OK is kept with its time, and No turns on the stronger echo filter",
    !!db.sessions.find(s => s.client === "client5").client_ok_at &&
      page.app.innerHTML.includes("You tapped OK.") &&
      page.app.innerHTML.includes("stronger echo filter is on") &&
      !page.app.innerHTML.includes('data-a="lrok"')
  );
  chk("the screen of the room has no undefined and no NaN", clean(page.app.innerHTML), junk(page.app.innerHTML));
  LR.R.leave();
  clearInterval(LR.tick);
  LR.tick = null;

  /* THE ROOM AS HTML, each stage, for the coach */
  {
    const hub = simHub(clock, 0),
      sid = db.sessions.find(s => s.client === "client1").id,
      P = simPair({ clock, db, hub, sid, coach: "coach1", client: "client1" });
    await P.coach.R.join();
    await P.client.R.join();
    await clock.run(50);
    const now = clock.now();
    let h = lrRoomHTML(P.coach.R, now, false);
    chk(
      "coach, before the taps: Start is there and disabled, with the reason",
      /data-a="lrstart" disabled/.test(h) &&
        h.includes("Start works when both of you tapped OK.") &&
        h.includes("Still to tap OK: you and your client.") &&
        h.includes("Your client is in the room")
    );
    chk(
      "the pill says Not started yet, and the lights name You and Them",
      h.includes("Not started yet") && h.includes("You: <b>") && h.includes("Them: <b>")
    );
    await P.coach.R.act("ok");
    h = lrRoomHTML(P.coach.R, now, false);
    chk(
      "coach tapped: Start is still disabled, and the line names the client",
      /data-a="lrstart" disabled/.test(h) && h.includes("Still to tap OK: your client. You tapped already.")
    );
    await P.client.R.act("ok");
    await clock.run(50);
    h = lrRoomHTML(P.coach.R, now, false);
    chk(
      "both tapped: Start is on, and it is the one primary button",
      /data-a="lrstart">Start/.test(h) &&
        !/data-a="lrstart" disabled/.test(h) &&
        (h.match(/class="primary/g) || []).length === 1 &&
        h.includes("One Start for the whole call.")
    );
    P.coach.R.micCheck();
    chk(
      "the microphone step says when it is ready",
      lrRoomHTML(P.coach.R, now, false).includes("The microphone is ready.")
    );
    await P.coach.R.act("start");
    await clock.run(50);
    P.client.speech.say("Rent is fourteen hundred a month.");
    await clock.run(50);
    h = lrRoomHTML(P.coach.R, clock.now(), false);
    chk(
      "live: the pill and two green lights",
      /class="pillbig live" id="lrpill">Listening 0:00/.test(h) &&
        (h.match(/class="light green"/g) || []).length === 2 &&
        h.includes("You: <b>Working</b>") &&
        h.includes("Them: <b>Working</b>")
    );
    chk(
      "live: Pause and End, and nothing else to press",
      (h.match(/<button/g) || []).length === 2 &&
        h.includes('data-a="lrpause"') &&
        h.includes('data-a="lrend"') &&
        !/<a /.test(h) &&
        !/<input/.test(h),
      h
    );
    chk(
      "live: the line is labeled by the device that heard it",
      h.includes("<b>Them</b> Rent is fourteen hundred a month.") &&
        lrRoomHTML(P.client.R, clock.now(), false).includes("<b>You</b> Rent is fourteen hundred a month.")
    );
    chk(
      "End asks one time first, and can be kept going",
      lrRoomHTML(P.coach.R, clock.now(), true).includes("End the session for both of you?") &&
        lrRoomHTML(P.coach.R, clock.now(), true).includes("Keep going") &&
        lrRoomHTML(P.coach.R, clock.now(), true).includes("Yes, end the session")
    );
    P.client.speech.deny = true;
    P.client.speech.drop();
    await clock.run(50);
    h = lrRoomHTML(P.client.R, clock.now(), false);
    chk(
      "stopped: no red, a plain outline with the word, and one tap on Reconnect",
      h.includes('class="light outline"') &&
        h.includes("You: <b>Stopped</b>") &&
        h.includes('data-a="lrre"') &&
        h.includes(">Reconnect</button>") &&
        !/\bred\b|#f00\b|#ff0000|crimson/i.test(read("session.html").match(/<style>[^]*<\/style>/)[0])
    );
    chk(
      "the coach sees it on the light Them",
      lrRoomHTML(P.coach.R, clock.now(), false).includes("Them: <b>Stopped</b>")
    );
    await P.coach.R.act("pause");
    h = lrRoomHTML(P.coach.R, clock.now(), false);
    chk(
      "paused: the pill says Paused, and the button says Resume",
      /class="pillbig paused" id="lrpill">Paused/.test(h) &&
        h.includes('data-a="lrresume"') &&
        h.includes(">Resume</button>")
    );
    /* the parts for the later parts of the build */
    window.livePartCoach = R => `<div id="part6">${R.lines.length} lines for Part 6</div>`;
    chk(
      "a later part replaces the plain body by a named part, and Pause and End stay",
      lrRoomHTML(P.coach.R, clock.now(), false).includes('<div id="part6">1 lines for Part 6</div>') &&
        lrRoomHTML(P.coach.R, clock.now(), false).includes('data-a="lrend"') &&
        !lrRoomHTML(P.coach.R, clock.now(), false).includes("Heard so far")
    );
    delete window.livePartCoach;
    await P.coach.R.act("end");
    await clock.run(3000);
    h = lrRoomHTML(P.coach.R, clock.now(), false);
    chk(
      "ended: it says what was kept, and that no audio was saved",
      h.includes("The session has ended") &&
        h.includes("Heard 1 line, as text. No audio was saved.") &&
        h.includes("Each line is saved.") &&
        !h.includes('data-a="lrpause"')
    );
    chk("each stage of the room has no undefined and no NaN, no long dash", clean(h) && !h.includes(dash));
    P.coach.R.leave();
    P.client.R.leave();
  }

  /* THE COACH'S CARD */
  Object.assign(LC, {
    db: db.as("coach1"),
    invites: null,
    sessions: [],
    wait: false,
    open: false,
    made: null,
    msg: "",
  });
  CP.sb = { rpc: async () => ({ error: null }) };
  CP.session = { user: { email: "dana@example.com" } };
  let card = lcCard();
  chk(
    "on: the button Start session with a new client, as the primary button",
    /class="primary wide" data-a="lcnew">Start session with a new client/.test(card) && !card.includes("Coming soon")
  );
  chk("the note is there", card.includes("Sending the link before the call is best."));
  await lcClick({ dataset: { a: "lcnew" } });
  card = lcCard();
  chk(
    "one tap opens two boxes: the client's name (optional), and the coach's name already filled in",
    card.includes("Their first name (optional)") &&
      card.includes('id="lcme" type="text" autocomplete="off" value="Dana"') &&
      card.includes('data-a="lcmake"')
  );
  page.vals = { lcn: "Jo", lcme: "Dana" };
  const before = db.invites.length;
  await lcClick({ dataset: { a: "lcmake" } });
  LC.invites = (await db.as("coach1").invites()).data;
  LC.sessions = (await db.as("coach1").sessions()).data;
  card = lcCard();
  const newest = db.invites[db.invites.length - 1];
  chk(
    "Make the link makes one invite, with the two names",
    db.invites.length === before + 1 &&
      newest.client_name === "Jo" &&
      newest.coach_name === "Dana" &&
      LC.made &&
      LC.made.token === newest.token
  );
  chk(
    "the card shows the whole link, Copy the link, and the mail button",
    card.includes("https://example.test/game/session.html?invite=" + newest.token) &&
      card.includes('data-a="lccopy"') &&
      card.includes('data-a="lcmail"') &&
      card.includes("It works one time, for 7 days.")
  );
  chk(
    "the list shows each invite with its state, the newest first",
    card.indexOf("<b>Jo</b>") > 0 &&
      card.indexOf("<b>Jo</b>") < card.indexOf("<b>Sam</b>") &&
      />Sent</.test(card) &&
      />Signed up</.test(card) &&
      />In the room</.test(card),
    card
  );
  chk(
    "an invite whose client signed up has the way into the room",
    card.includes("./session.html?s=") && card.includes("Open the room")
  );
  const mail = decodeURIComponent(lcMail("Jo", "https://example.test/game/session.html?invite=abc", "Dana"));
  chk(
    "the email draft has the link, the line about the laptop, one time and 7 days, text only",
    mail.includes("Hi Jo,") &&
      mail.includes("session.html?invite=abc") &&
      mail.includes(LV_JOIN_LINE) &&
      mail.includes("one time, for 7 days") &&
      mail.includes("No audio is saved") &&
      !mail.includes(dash)
  );
  chk(
    "Start session is in the card of each person of the roster",
    /data-a="lcstart" data-o="client1">Start session<\/button>/.test(lcClientRow({ owner: "client1" }))
  );
  await lcClick({ dataset: { a: "lcstart", o: "client1" } });
  chk(
    "Start session for a client of this coach opens the room of the two",
    /^\.\/session\.html\?s=sess-/.test(global.location.href) &&
      db.sessions.filter(s => s.client === "client1" && s.state !== "ended").length === 1
  );
  global.location.href = "";
  await lcClick({ dataset: { a: "lcstart", o: "stranger" } });
  chk(
    "for a person who is not this coach's client, no room opens and the page says so calmly",
    global.location.href === "" && /did not open for this person/.test(CP.msg) && !blame.test(CP.msg)
  );
  db.shared.old1 = true;
  await lcClick({ dataset: { a: "lcstart", o: "old1" } });
  chk(
    "a person of the roster who shares their game can be started too, and is tagged only when they join",
    /^\.\/session\.html\?s=/.test(global.location.href) &&
      !db.tags.some(x => x.client === "old1") &&
      (await db.as("old1").set(db.sessions.find(s => s.client === "old1").id, "seen"),
      db.tags.some(x => x.client === "old1" && x.coach === "coach1"))
  );
  chk(
    "in the demo the invites are made up, and each one says (sample)",
    lcDemoRows(clock.now()).invites.every(i => /\(sample\)/.test(i.client_name) && i.token === "") &&
      lvInviteRows(lcDemoRows(clock.now()).invites, lcDemoRows(clock.now()).sessions, clock.now())
        .map(r => r.state)
        .join() === "room,signed,sent"
  );

  /* BEFORE THE DATABASE FILE HAS RUN */
  const empty = simDb(clock, { missing: true });
  Object.assign(LC, {
    db: empty.as("coach1"),
    invites: [],
    sessions: [],
    wait: false,
    open: true,
    made: null,
    msg: "",
  });
  page.vals = { lcn: "Jo", lcme: "Dana" };
  await lcClick({ dataset: { a: "lcmake" } });
  card = lcCard();
  chk(
    "coach page: it says calmly which file waits, and the button is off with the reason",
    LC.wait === true &&
      card.includes("wait for one database file") &&
      card.includes("20261125210000_live_sessions.sql") &&
      /data-a="lcnew" disabled/.test(card) &&
      card.includes("This button works after the database file has run.") &&
      !blame.test(card.replace(/<[^>]+>/g, " "))
  );
  chk(
    "the Start session button of a client is off too, with the reason",
    /disabled/.test(lcClientRow({ owner: "u1" })) && /works after the database file/.test(lcClientRow({ owner: "u1" }))
  );
  Object.assign(LR, { sb: {}, db: empty.as("client1"), user: { id: "client1" }, tok: tok, mode: "load", R: null });
  await lrUse();
  chk(
    "session page: the same calm line, and a way back",
    LR.mode === "wait" &&
      page.app.innerHTML.includes("waits for one database file") &&
      page.app.innerHTML.includes("Nothing of yours changed.") &&
      page.app.innerHTML.includes("Back to the game")
  );
  await lrMine();
  chk("looking for a session says the same", LR.mode === "wait");
  chk(
    "the real adapter reads 'no such table' and 'no such function' as: it waits",
    lioAnswer({
      error: { code: "PGRST205", message: "Could not find the table 'public.live_sessions' in the schema cache" },
    }).wait === true &&
      lioAnswer({ error: { code: "PGRST202", message: "Could not find the function public.live_invite_check" } })
        .wait === true &&
      lioAnswer({ error: { message: "TypeError: Failed to fetch" } }).net === true &&
      lioAnswer({ data: 5, error: null }).data === 5 &&
      lioAnswer({ error: { message: "not your client" } }).why === "not your client"
  );

  /* THE ADAPTERS OF THE BROWSER, with small stand-ins for the browser */
  {
    const made2 = [];
    function Rec() {
      made2.push(this);
      this.start = () => this.onstart && this.onstart();
      this.abort = () => this.onend && this.onend();
    }
    const sp = lioSpeech({ webkitSpeechRecognition: Rec, navigator: { language: "en-US" } }),
      got = [];
    sp.on = {
      start: () => got.push("start"),
      final: x => got.push("final:" + x),
      interim: x => got.push("soft:" + x),
      end: () => got.push("end"),
      error: c => got.push("error:" + c),
    };
    sp.start();
    made2[0].onresult({ resultIndex: 0, results: [Object.assign([{ transcript: "rent is" }], { isFinal: false })] });
    made2[0].onresult({
      resultIndex: 0,
      results: [Object.assign([{ transcript: "Rent is fourteen hundred." }], { isFinal: true })],
    });
    made2[0].onerror({ error: "no-speech" });
    sp.stop();
    chk(
      "speech: it listens without end, only a final result is a line, and words that are not final are apart",
      sp.can &&
        made2[0].continuous === true &&
        made2[0].interimResults === true &&
        got.join("|") === "start|soft:rent is|final:Rent is fourteen hundred.|soft:|error:no-speech|end",
      got.join("|")
    );
    chk(
      "a browser with no speech recognition: the adapter says so and start does nothing",
      lioSpeech({}).can === false && lioSpeech({}).start() === undefined
    );
    let asks = 0,
      vis = null;
    const doc = { visibilityState: "visible", addEventListener: (k, f) => (vis = f) },
      wk = lioWake({ wakeLock: { request: async () => (asks++, { release() {} }) } }, doc);
    await wk.on();
    doc.visibilityState = "hidden";
    vis();
    doc.visibilityState = "visible";
    vis();
    await Promise.resolve();
    chk("wake lock: asked for at Start, and again when the page shows again", asks === 2);
    wk.off();
    vis();
    await Promise.resolve();
    chk("after End it is not asked for again", asks === 2);
    const quiet = lioWake({}, doc);
    chk(
      "where the browser has no wake lock, nothing is said and nothing throws",
      (await quiet.on()) === undefined && quiet.lock === null
    );
    chk(
      "an id made on the device looks like a uuid, and two are different",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(lioId()) && lioId() !== lioId()
    );
    const sent = [],
      fake = {
        channel: (name, cfg) => (
          (fake.name = name),
          (fake.cfg = cfg),
          {
            on: () => {},
            subscribe: f => f("SUBSCRIBED"),
            track: p => sent.push(["track", p]),
            send: m => sent.push(["send", m]),
            presenceState: () => ({}),
          }
        ),
        removeChannel: () => (fake.closed = true),
      },
      ch = lioChan(fake, "abc", "coach"),
      evs = [];
    ch.open(e => evs.push(e.k + ":" + e.ok));
    ch.send({ k: "room" });
    ch.close();
    chk(
      "the channel is named by the id of the session, sends small signals, and closes",
      fake.name === "live:abc" &&
        fake.cfg.config.broadcast.self === false &&
        evs[0] === "link:true" &&
        sent[0][0] === "track" &&
        sent[1][1].event === "sig" &&
        sent[1][1].payload.k === "room" &&
        fake.closed === true
    );
  }

  /* NO AUDIO IS RECORDED OR STORED */
  const files = [
      "account/liveflag.js",
      "account/live.js",
      "account/liveio.js",
      "account/livesim.js",
      "account/liveroom.js",
      "account/livecoach.js",
      "session.html",
    ],
    banned =
      /MediaRecorder|getUserMedia|mediaDevices|AudioContext|createMediaStreamSource|MediaStream|AudioWorklet|ScriptProcessor|audio\/|\.wav\b|\.webm\b|\.mp3\b|\.ogg\b|new Blob|<audio|captureStream|recordrtc/i;
  files.forEach(f => {
    const hit = read(f).match(banned);
    chk("no recording and no audio data in " + f, !hit, hit && hit[0]);
  });
  chk(
    "the transcript table has text columns only, and no file store is used",
    !/bytea|storage\.|bucket/i.test(
      fs
        .readFileSync(GAME_DIR + "../supabase/migrations/20261125210000_live_sessions.sql", "utf8")
        .replace(/--.*$/gm, "")
    )
  );
  chk(
    "the rule is written at the top of the adapter file",
    /NO AUDIO IS RECORDED OR STORED/.test(read("account/liveio.js"))
  );
  files.forEach(f => chk("no long dash in " + f, !read(f).includes(dash)));

  /* THE DATABASE FILE, read as text */
  const sql = fs.readFileSync(GAME_DIR + "../supabase/migrations/20261125210000_live_sessions.sql", "utf8"),
    code = sql.replace(/--.*$/gm, ""),
    tables = ["live_invites", "coach_clients", "live_sessions", "live_lines"],
    fns = code.split(/create or replace function public\./).slice(1),
    fname = f => f.split("(")[0],
    body = n => (fns.find(f => f.startsWith(n + "(")) || "").split(/\$\$;?/)[1] || "",
    policies = code.match(/create policy [^;]+;/g) || [];
  chk(
    "the file says that it is not applied, and that it is safe to run two times",
    /^-- NOT APPLIED\./m.test(sql) && /safe to run two times/.test(sql)
  );
  chk(
    "it has the four tables",
    tables.every(tb => new RegExp("create table if not exists public\\." + tb + " \\(").test(code))
  );
  chk(
    "safe to run two times: tables and indexes 'if not exists', functions 'or replace', each policy dropped first",
    !/create table (?!if not exists)/.test(code) &&
      !/create index (?!if not exists)/.test(code) &&
      !/create function/.test(code) &&
      policies.length === 5 &&
      policies.every(p =>
        code.includes(
          'drop policy if exists "' + p.match(/"([^"]+)"/)[1] + '" on public.' + p.match(/on public\.(\w+)/)[1] + ";"
        )
      )
  );
  chk(
    "each table has row level security on",
    tables.every(tb => code.includes("alter table public." + tb + " enable row level security;"))
  );
  chk(
    "each table starts with no rights for anyone",
    tables.every(tb => code.includes("revoke all on public." + tb + " from public, anon, authenticated;"))
  );
  const grants = code.match(/grant [^;]+ on public\.\w+ to [^;]+;/g) || [];
  chk(
    "the explicit grants to the signed-in role: read only, and read plus add for the lines",
    grants.sort().join("|") ===
      [
        "grant select on public.coach_clients to authenticated;",
        "grant select on public.live_invites to authenticated;",
        "grant select on public.live_sessions to authenticated;",
        "grant select, insert on public.live_lines to authenticated;",
      ]
        .sort()
        .join("|"),
    grants.join("|")
  );
  chk(
    "no table right for a visitor, and no update or delete right for anyone",
    !/grant [^;]*on public\.\w+ to [^;]*anon/.test(code) &&
      !/grant [^;]*(update|delete|all)[^;]* on public\./.test(code)
  );
  chk(
    "each policy is for the signed-in role",
    policies.every(p => / to authenticated\b/.test(p))
  );
  chk(
    "no row rule uses 'any coach': a session, its invite and its lines are for that coach, that client and the admin",
    policies.every(p => !/is_coach\(\)/.test(p)) &&
      !/is_coach\(\)/.test(body("live_member")) &&
      !/is_coach\(\)/.test(body("live_can_write")),
    policies.filter(p => /is_coach/.test(p)).join()
  );
  const pol = n => policies.find(p => p.includes('"' + n + '"')) || "";
  chk(
    "an invite: read by the coach who made it, or the admin",
    /using \(coach = auth\.uid\(\) or is_admin\(\)\)/.test(pol("a coach reads own invites"))
  );
  chk(
    "the tag and a session: that coach, that client, the admin",
    /using \(coach = auth\.uid\(\) or client = auth\.uid\(\) or is_admin\(\)\)/.test(
      pol("the coach, the client and the admin read the tag")
    ) &&
      /using \(coach = auth\.uid\(\) or client = auth\.uid\(\) or is_admin\(\)\)/.test(
        pol("the two members and the admin read a session")
      )
  );
  chk(
    "the lines: read by the members and the admin",
    /for select to authenticated\s+using \(live_member\(session\)\)/.test(
      pol("the two members and the admin read the lines")
    ) && /s\.coach = auth\.uid\(\) or s\.client = auth\.uid\(\)/.test(body("live_member"))
  );
  chk(
    "the lines: added by a member only, as that member's own side, in a session that started",
    /for insert to authenticated\s+with check \(by = auth\.uid\(\) and live_can_write\(session, side\)\)/.test(
      pol("a member adds own lines")
    ) &&
      /sd = 'coach' and s\.coach = auth\.uid\(\)/.test(body("live_can_write")) &&
      /sd = 'client' and s\.client = auth\.uid\(\)/.test(body("live_can_write")) &&
      /s\.state in \('live', 'paused'\)/.test(body("live_can_write"))
  );
  chk(
    "a line is text, with an id that the device makes, the side, the session and the time",
    /id uuid primary key,\s+session uuid not null references public\.live_sessions \(id\) on delete cascade,\s+side text not null check \(side in \('coach', 'client'\)\)/.test(
      code
    ) && /body text not null check \(char_length\(body\) between 1 and 2000\)/.test(code)
  );
  chk(
    "the file has the functions",
    [
      "live_can_write",
      "live_member",
      "live_invite_make",
      "live_invite_check",
      "live_invite_use",
      "live_session_open",
      "live_session_set",
    ].every(n => fns.some(f => fname(f) === n)),
    fns.map(fname).join()
  );
  chk(
    "each function is security definer with search_path set",
    fns.every(f => /security definer set search_path = public as/.test(f.split("$$")[0])),
    fns
      .filter(f => !/security definer set search_path = public as/.test(f.split("$$")[0]))
      .map(fname)
      .join()
  );
  chk(
    "each function is closed to the public role first",
    fns.every(f => new RegExp("revoke all on function public\\." + fname(f) + "\\([^)]*\\) from public").test(code))
  );
  const anonFns = (code.match(/grant execute on function public\.(\w+)\([^)]*\) to [^;]*anon[^;]*;/g) || []).map(
    g => g.match(/public\.(\w+)/)[1]
  );
  chk(
    "a visitor who is not signed in can call one function only: the check of a link",
    anonFns.join() === "live_invite_check" &&
      fns
        .filter(f => fname(f) !== "live_invite_check")
        .every(f =>
          new RegExp("revoke all on function public\\." + fname(f) + "\\([^)]*\\) from public, anon;").test(code)
        ),
    anonFns.join()
  );
  chk(
    "each function is granted to the signed-in role",
    fns.every(f =>
      new RegExp("grant execute on function public\\." + fname(f) + "\\([^)]*\\) to (anon, )?authenticated;").test(code)
    )
  );
  chk(
    "the check of a link gives the state and the two names, and no id, no email, no token",
    /jsonb_build_object\(\s*'state'/.test(body("live_invite_check")) &&
      /'coach_name', r\.coach_name, 'client_name', r\.client_name\)/.test(body("live_invite_check")) &&
      !/r\.id|r\.coach\b[^_]|email|r\.token/.test(body("live_invite_check").replace(/token = tok/, ""))
  );
  chk(
    "the token is random and cannot be guessed: two random uuids, 64 characters, and it is unique",
    /replace\(gen_random_uuid\(\)::text \|\| gen_random_uuid\(\)::text, '-', ''\)/.test(body("live_invite_make")) &&
      /token text not null unique/.test(code)
  );
  chk(
    "only a coach or the admin makes a link",
    /\bbegin\s+if not \(is_coach\(\) or is_admin\(\)\) then raise exception 'coach or admin only'; end if;/.test(
      body("live_invite_make")
    )
  );
  chk(
    "an invite keeps: the coach, made-at, the end after 7 days, used-at, the account that used it",
    /coach uuid not null references auth\.users \(id\) on delete cascade/.test(code) &&
      /made_at timestamptz not null default now\(\)/.test(code) &&
      /expires_at timestamptz not null default \(now\(\) \+ interval '7 days'\)/.test(code) &&
      /used_at timestamptz,/.test(code) &&
      /used_by uuid references auth\.users/.test(code)
  );
  const use2 = body("live_invite_use");
  chk(
    "the use of a link needs a sign-in",
    /if auth\.uid\(\) is null then raise exception 'sign in first'; end if;/.test(use2)
  );
  chk(
    "one time: the row is locked, and a link that a different account used gives 'used'",
    /where token = tok for update;/.test(use2) &&
      /if r\.used_at is not null and r\.used_by is distinct from auth\.uid\(\) then return jsonb_build_object\('state', 'used'\); end if;/.test(
        use2
      )
  );
  chk(
    "7 days: an expired link gives 'expired' and changes nothing, before any write",
    /if r\.expires_at <= now\(\) then return jsonb_build_object\('state', 'expired'\); end if;\s+update live_invites set used_at = now\(\), used_by = auth\.uid\(\)/.test(
      use2
    ) && use2.indexOf("expires_at <= now()") < use2.indexOf("update live_invites")
  );
  chk(
    "the use tags the account as that coach's client and opens the session of the two",
    /insert into coach_clients \(coach, client, invite\) values \(r\.coach, auth\.uid\(\), r\.id\) on conflict do nothing;/.test(
      use2
    ) && /insert into live_sessions \(coach, client, invite\) values \(r\.coach, auth\.uid\(\), r\.id\)/.test(use2)
  );
  chk(
    "the coach cannot use the coach's own link",
    /if r\.coach = auth\.uid\(\) then return jsonb_build_object\('state', 'own'\); end if;/.test(use2)
  );
  const setb = body("live_session_set");
  chk(
    "a session keeps the state, the times, who tapped OK and when, and the headphones answer of each side",
    /state text not null default 'waiting' check \(state in \('waiting', 'live', 'paused', 'ended'\)\)/.test(code) &&
      [
        "started_at",
        "ended_at",
        "coach_ok_at",
        "client_ok_at",
        "coach_headphones boolean",
        "client_headphones boolean",
        "coach_listens",
        "client_listens",
      ].every(k => code.includes(k))
  );
  chk(
    "a step of a session is for its two members only",
    /if s\.coach = auth\.uid\(\) then me := 'coach'; elsif s\.client = auth\.uid\(\) then me := 'client'; else raise exception 'not a member'; end if;/.test(
      setb
    )
  );
  chk(
    "Start: the coach only, from waiting, and only when both tapped OK; the first start time stays",
    /if me = 'coach' and s\.state = 'waiting' and s\.coach_ok_at is not null and s\.client_ok_at is not null then\s+update live_sessions set state = 'live', started_at = coalesce\(started_at, now\(\)\)/.test(
      setb
    )
  );
  chk(
    "an OK keeps its first time",
    /coach_ok_at = coalesce\(coach_ok_at, now\(\)\)/.test(setb) &&
      /client_ok_at = coalesce\(client_ok_at, now\(\)\)/.test(setb)
  );
  chk(
    "the database knows the same steps as the rules in live.js",
    ["seen", "ok", "headphones", "listens", "start", "pause", "resume", "end"].every(
      w => setb.includes("'" + w + "'") && read("account/live.js").includes('"' + w + '"')
    )
  );
  chk(
    "Start session for a person of the roster: a coach or the admin, with their own client or a person who shares their game",
    /if not \(is_coach\(\) or is_admin\(\)\) then raise exception 'coach or admin only'; end if;/.test(
      body("live_session_open")
    ) &&
      /from coach_clients where coach = auth\.uid\(\) and client = target/.test(body("live_session_open")) &&
      /from games where owner = target and share_with_coach/.test(body("live_session_open")) &&
      /raise exception 'not your client'/.test(body("live_session_open"))
  );
  chk(
    "Delete my account takes these rows too: each table points at the account with on delete cascade",
    (code.match(/references auth\.users \(id\) on delete cascade/g) || []).length >= 6
  );
  chk(
    "no table is added to a realtime publication, and nothing older is widened",
    !/alter publication/i.test(code) &&
      !/alter table public\.games|on public\.games\b/.test(code) &&
      !/create policy [^;]* on public\.(games|coach_notes)/.test(code)
  );
  chk(
    "the file says what to look at in the dashboard for realtime, and what it assumed about the free plan",
    /REALTIME: WHAT ELI MUST SWITCH ON/.test(sql) &&
      /Allow public access/.test(sql) &&
      /Broadcast and Presence/.test(sql) &&
      /Assumed limits of the Free plan/.test(sql)
  );
  chk(
    "the names in the adapter are the names in the file",
    ["live_invite_make", "live_invite_check", "live_invite_use", "live_session_open", "live_session_set"].every(n =>
      read("account/liveio.js").includes('"' + n + '"')
    ) && ["live_invites", "live_sessions", "live_lines"].every(n => read("account/liveio.js").includes('"' + n + '"'))
  );

  /* put the page back */
  LIVE_SESSION_READY = false;
  document.getElementById = oldGet;
  global.localStorage = oldLs;
  delete global.location;
  delete window.supabase;
})().catch(e => {
  LIVE_SESSION_READY = false;
  chk("the test ran to its end", false, e && e.stack);
});
