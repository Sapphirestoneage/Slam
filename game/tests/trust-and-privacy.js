/* ============================================================================
   SLAM the Game, test: tests/trust-and-privacy.js
   PURPOSE     Examine the trust part: the one line "Education and tools, not financial advice.", the
               privacy page and its links, the calm words for each answer of the sign-in service (with a
               stand-in for the service), the switch EMAIL_READY in its two states, how "Share with my
               coach" starts for the two arrivals (a public link, the invite of a coach), "Delete my
               account" (with a stand-in for the database), and the database file of
               delete_my_account() read as text.
   INPUT       The game scripts, loaded by harness.cjs. account/coachpage.js, loaded here. privacy.html
               and the database files as text. No database: the test does not sign in.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: account/trust.js, account/supa.js, account/coachpage.js,
               privacy.html, supabase/migrations/20261125200000_delete_my_account.sql.
   ========================================================================= */
(async () => {
  const fs = require("fs"),
    vm = require("vm"),
    read = f => fs.readFileSync(GAME_DIR + f, "utf8"),
    dash = String.fromCharCode(0x2014),
    blame = /mistake|failed|behind|off.track/i;
  vm.runInThisContext(read("account/coachpage.js"), { filename: "account/coachpage.js" });
  const supa = read("account/supa.js"),
    page = read("privacy.html");

  /* THE LINE AND THE LINKS */
  chk("the line is the exact one", TRUST_LINE === "Education and tools, not financial advice.");
  chk("the line under the sheets starts with it: one line, not two", EDU.indexOf(TRUST_LINE) === 0);
  chk(
    "the game has no second wording of the line",
    !/not personal financial advice|Education and practice/.test(read("screens/ui.js") + read("screens/ux.js"))
  );
  chk(
    "the sign-up screen has the line and the link to the privacy page",
    tuGateFoot().includes(TRUST_LINE) && tuGateFoot().includes('href="./privacy.html"') && supa.includes("tuGateFoot()")
  );
  tuWire();
  tuWire();
  chk(
    "the menu has Privacy, one time, with an action",
    MENU.filter(m => m[1] === "tuprivacy").length === 1 && typeof ACT.tuprivacy === "function"
  );
  X("menu");
  chk("the open menu shows Privacy", ov().includes("<b>Privacy</b>"));
  X("close");
  render();
  chk(
    "each main screen ends with the line and the link",
    app().includes(TRUST_LINE) && app().includes('href="./privacy.html"')
  );
  W = { kind: "suacct" };
  const acct = suAcctSheet();
  chk(
    "My account has the way to the privacy page and to Delete my account",
    acct.includes('href="./privacy.html"') &&
      acct.includes('href="./privacy.html#delete"') &&
      acct.includes("asks two times")
  );

  /* THE SIGN-IN SERVICE, WITH A STAND-IN */
  const svc = over => ({
    auth: Object.assign(
      {
        signUp: async () => ({ data: { user: { id: "u1", identities: [{}] }, session: null }, error: null }),
        signInWithPassword: async () => ({ data: { session: { user: { id: "u1" } } }, error: null }),
        resend: async () => ({ data: {}, error: null }),
        resetPasswordForEmail: async () => ({ data: {}, error: null }),
      },
      over
    ),
  });
  const err = (message, status, code) => async () => ({
    data: { user: null, session: null },
    error: { message, status, code },
  });
  const raw = "Error sending confirmation email";
  let r = await tuAuth(svc(), "new", "a@example.com", "secret1", "https://x/");
  chk(
    "confirmation on: the game says Check your email, and what to do if nothing arrives",
    r.state === "confirm" &&
      r.msg.includes("Check your email") &&
      r.msg.includes("a@example.com") &&
      /Spam/.test(r.msg) &&
      r.again === true
  );
  r = await tuAuth(
    svc({ signUp: async () => ({ data: { user: { id: "u1" }, session: { user: { id: "u1" } } }, error: null }) }),
    "new",
    "a@example.com",
    "secret1",
    ""
  );
  chk("confirmation off: sign-up signs the person straight in, with no email message", r.state === "in" && !r.msg);
  r = await tuAuth(svc({ signUp: err(raw, 500, "unexpected_failure") }), "new", "a@example.com", "secret1", "");
  chk(
    "the email could not be sent: what happened, whose side, and what to do. Not the raw error",
    r.state === "msg" &&
      r.kind === "mailsend" &&
      /could not be sent/.test(r.msg) &&
      /on our side, not yours/.test(r.msg) &&
      /try again/.test(r.msg) &&
      !r.msg.includes(raw),
    r.msg
  );
  r = await tuAuth(
    svc({ signUp: err("email rate limit exceeded", 429, "over_email_send_rate_limit") }),
    "new",
    "a@example.com",
    "secret1",
    ""
  );
  chk(
    "the sender is over its limit: the words say so, and when to try again",
    r.kind === "mailrate" && /too many emails/.test(r.msg) && /in an hour/.test(r.msg) && !/rate limit/.test(r.msg),
    r.msg
  );
  r = await tuAuth(
    svc({ signUp: err("Email address not authorized", 400, "email_address_not_authorized") }),
    "new",
    "a@example.com",
    "secret1",
    ""
  );
  chk(
    "the built-in sender refuses an outside address: the words say whom to write",
    r.kind === "mailclosed" && r.msg.includes(TRUST_MAIL)
  );
  r = await tuAuth(
    svc({ signUp: async () => ({ data: { user: { id: "x", identities: [] }, session: null }, error: null }) }),
    "new",
    "a@example.com",
    "secret1",
    ""
  );
  chk(
    "an email that already has an account gets no false Check your email",
    r.kind === "exists" && !/Check your email/.test(r.msg) && r.again === true
  );
  r = await tuAuth(
    svc({ signInWithPassword: err("Email not confirmed", 400, "email_not_confirmed") }),
    "in",
    "a@example.com",
    "secret1",
    ""
  );
  chk(
    "sign-in before the link was tapped: says so and offers Send the email again",
    r.kind === "unconfirmed" && r.again === true
  );
  r = await tuAuth(
    svc({ signInWithPassword: err("Invalid login credentials", 400, "invalid_credentials") }),
    "in",
    "a@example.com",
    "x",
    ""
  );
  chk("a wrong password keeps its words", r.kind === "nomatch" && /don't match/.test(r.msg));
  r = await tuAuth(
    svc({
      signUp: async () => {
        throw new TypeError("Failed to fetch");
      },
    }),
    "new",
    "a@example.com",
    "secret1",
    ""
  );
  chk(
    "no connection: the words say to check the internet",
    r.kind === "net" && /internet/.test(r.msg) && !/fetch/i.test(r.msg)
  );
  r = await tuAuth(
    svc({ signUp: err("pq: relation 42 exploded", 500, "weird_code") }),
    "new",
    "a@example.com",
    "secret1",
    ""
  );
  chk(
    "an answer with no words yet never shows the raw error",
    r.kind === "other" && !/pq:|42|weird/.test(r.msg) && r.msg.includes(TRUST_MAIL)
  );
  r = await tuResend(svc(), "a@example.com", "");
  chk("Send the email again: says it was sent", r.ok && /Sent again/.test(r.msg));
  r = await tuResend(
    svc({
      resend: err(
        "For security purposes, you can only request this after 52 seconds.",
        429,
        "over_email_send_rate_limit"
      ),
    }),
    "a@example.com",
    ""
  );
  chk("Send the email again, too soon: calm words", !r.ok && !/security purposes/.test(r.msg));
  r = await tuReset(
    svc({ resetPasswordForEmail: err("Error sending recovery email", 500, "unexpected_failure") }),
    "a@example.com",
    ""
  );
  chk(
    "the reset email could not be sent: the same calm words",
    !r.ok && r.kind === "mailsend" && !/recovery/.test(r.msg)
  );
  const kinds = [
    ["Error sending confirmation email", 500, "unexpected_failure"],
    ["email rate limit exceeded", 429, "over_email_send_rate_limit"],
    ["Email address not authorized", 400, ""],
    ["Email not confirmed", 400, ""],
    ["User already registered", 422, ""],
    ["Invalid login credentials", 400, ""],
    ["Password should be at least 6 characters", 422, "weak_password"],
    ["New password should be different from the old password.", 422, "same_password"],
    ["Unable to validate email address: invalid format", 400, ""],
    ["Signups not allowed for this instance", 422, "signup_disabled"],
    ["User is banned", 400, "user_banned"],
    ["Too many requests", 429, ""],
    ["Failed to fetch", 0, ""],
    ["anything else", 500, ""],
  ];
  const said = kinds.flatMap(k =>
    ["up", "in", "reset", "pw", "again"].map(w => tuAuthMsg({ message: k[0], status: k[1], code: k[2] }, w))
  );
  chk(
    "each kind of answer has its own words",
    new Set(kinds.map(k => tuAuthKind({ message: k[0], status: k[1], code: k[2] }))).size === kinds.length
  );
  chk(
    "the words never blame the person, have no long dash, and never show the raw answer",
    said.every(m => m && !blame.test(m) && !m.includes(dash) && !kinds.some(k => m.includes(k[0]))),
    said.find(m => blame.test(m))
  );
  chk(
    "the sign-up screen takes its words from these functions",
    supa.includes("tuAuth(SUPA.sb, mode") &&
      supa.includes("tuReset(SUPA.sb") &&
      !/esc2\(r\.error\.message\)|esc2\(m\)/.test(supa)
  );

  /* THE SWITCH EMAIL_READY, IN ITS TWO STATES */
  const off = suForgotHTML(false),
    on = suForgotHTML(true);
  chk("the switch is off until the email works", EMAIL_READY === false && supa.includes("suForgotHTML(EMAIL_READY)"));
  chk(
    "off: the line Forgot your password? Contact Eli. with an email draft, and no reset button",
    off.includes("Forgot your password? Contact Eli.") &&
      off.includes('href="mailto:stresslessaboutmoney@gmail.com?subject=') &&
      !off.includes("data-forgot")
  );
  chk(
    "on: the button Forgot my password, and no contact line",
    on.includes("data-forgot") && on.includes("Forgot my password") && !on.includes("Contact Eli")
  );

  /* HOW SHARE WITH MY COACH STARTS: THE TWO ARRIVALS */
  const store = () => {
    const m = {};
    return {
      m,
      getItem: k => (k in m ? m[k] : null),
      setItem: (k, v) => (m[k] = String(v)),
      removeItem: k => delete m[k],
    };
  };
  const pub = store(),
    inv = store();
  chk(
    "an arrival from a public link is not invited, and the game starts with sharing off",
    suInvited("?ref=abc", pub) === false && SUPA.share === false && SUPA.invited === false
  );
  chk("an arrival from the invite of a coach is invited", suInvited("?coach=1", inv) === true);
  chk(
    "the invite stays on the device through the confirmation email, whose link has no mark",
    suInvited("", inv) === true
  );
  suInviteDone(inv);
  chk("after the first save the mark is gone", suInvited("", inv) === false);
  chk(
    "the invite link of the coach page has the mark",
    cpInviteUrl("https://example.org/game/coach.html") === "https://example.org/game/?coach=1"
  );
  chk(
    "the first screen says how sharing starts, for each arrival",
    /starts on/.test(suShareLine(true)) &&
      /your coach's invite/.test(suShareLine(true)) &&
      /starts off/.test(suShareLine(false)) &&
      supa.includes("suShareLine(SUPA.invited)")
  );
  chk(
    "the game sends the value with each save, and a new account takes it from the arrival",
    (supa.match(/share_with_coach: SUPA\.share/g) || []).length === 3 && supa.includes("SUPA.share = SUPA.invited;")
  );
  chk(
    "a game that the admin or a coach starts for a client is shared",
    /SUPA\.as = asq;[\s\S]{0,400}SUPA\.share = true;/.test(supa)
  );
  chk("the sign-up screen no longer says that coach mode is on for everyone", !/Coach mode is on/.test(supa));

  /* DELETE MY ACCOUNT, WITH A STAND-IN FOR THE DATABASE */
  const db = (fn, rows) => {
    const log = [];
    const q = (t, op) => {
      const o = {
        eq: () => o,
        select: () => o,
        then: (ok, no) => {
          log.push(op + " " + t);
          if (rows === "net") return Promise.reject(new TypeError("Failed to fetch")).then(ok, no);
          if (op === "delete") {
            const gone = rows.splice(0);
            return Promise.resolve({ data: gone, error: null }).then(ok, no);
          }
          return Promise.resolve({ data: rows.slice(), error: null }).then(ok, no);
        },
      };
      return o;
    };
    return {
      log,
      rpc: async n => (log.push("rpc " + n), fn()),
      from: t => ({ delete: () => q(t, "delete"), select: () => q(t, "select") }),
      auth: { signOut: async () => (log.push("signOut"), { error: null }) },
    };
  };
  const dev = () => {
    const m = {
      slamgame4: "{}",
      su_uid: "u1",
      slam_first_u1: "1",
      "sb-abc-auth-token": "t",
      "slam.account": "web",
      other: "x",
    };
    return {
      m,
      get length() {
        return Object.keys(m).length;
      },
      key: i => Object.keys(m)[i],
      removeItem: k => delete m[k],
    };
  };
  const missing = () => ({
    data: null,
    error: {
      code: "PGRST202",
      message: "Could not find the function public.delete_my_account without parameters in the schema cache",
    },
  });
  let d = db(missing, [{ id: 1 }, { id: 2 }, { id: 3 }]),
    ls = dev();
  let res = await tuDelete(d, "u1", [ls]);
  chk(
    "before the database step: the saved game is removed with the player's own rights, then checked",
    !res.stop &&
      !res.full &&
      res.games === 3 &&
      res.left === 0 &&
      d.log.join() === "rpc delete_my_account,delete games,select games,signOut",
    d.log.join()
  );
  chk(
    "the copy on the device and the sign-in on the device are removed, and the web app's answers are not touched",
    res.device === 4 && Object.keys(ls.m).join() === "slam.account,other" && res.out === true
  );
  let w = tuDeleteSays(res, "a@example.com");
  chk(
    "it says exactly what is gone and that the sign-in stays",
    w.title === "Your saved game is deleted" &&
      w.gone.join(" ").includes("3 saved pieces") &&
      w.stays.join(" ").includes("Your sign-in (a@example.com and the password) is still there") &&
      w.stays.join(" ").includes(TRUST_MAIL)
  );
  d = db(() => ({ data: { games: 3, account: true }, error: null }), []);
  ls = dev();
  res = await tuDelete(d, "u1", [ls]);
  w = tuDeleteSays(res, "a@example.com");
  chk(
    "after the database step: one call removes all of it",
    res.full && res.games === 3 && d.log.join() === "rpc delete_my_account,signOut" && res.device === 4
  );
  chk(
    "and it says that the sign-in is gone too",
    w.title === "Your account is deleted" && w.gone.join(" ").includes("Your sign-in: a@example.com")
  );
  d = db(async () => {
    throw new TypeError("Failed to fetch");
  }, "net");
  ls = dev();
  res = await tuDelete(d, "u1", [ls]);
  chk(
    "no connection: nothing is removed, on the server or on the device, and the person stays signed in",
    res.stop === "net" && Object.keys(ls.m).length === 6 && !d.log.includes("signOut")
  );
  chk("and it says so", tuDeleteSays(res, "").title === "Nothing was removed");
  d = db(
    () => ({ data: null, error: { code: "P0001", message: "the admin account is not deleted from the app" } }),
    [{ id: 1 }]
  );
  res = await tuDelete(d, "u1", [dev()]);
  chk(
    "the admin account is refused, and nothing is removed",
    res.stop === "admin" && d.log.join() === "rpc delete_my_account"
  );
  res = await tuDelete(null, null, []);
  chk("with no sign-in it does nothing", res.stop === "nouser");
  chk(
    "the words of each result have no blame and no long dash",
    [
      { stop: "net" },
      { stop: "admin" },
      { stop: "nouser" },
      { full: true, games: 1 },
      { games: 0, left: 0, out: true },
      { games: null, left: null },
      { games: 2, left: 1 },
    ]
      .map(x =>
        JSON.stringify(
          tuDeleteSays(
            Object.assign({ stop: "", full: false, games: null, left: null, device: 0, out: false }, x),
            "a@example.com"
          )
        )
      )
      .every(t => !t.includes(dash) && !/mistake|behind|off.track|undefined|NaN/.test(t))
  );

  /* THE DATABASE FILE, READ AS TEXT */
  const sql = fs.readFileSync(GAME_DIR + "../supabase/migrations/20261125200000_delete_my_account.sql", "utf8"),
    body = sql.slice(sql.indexOf("create or replace function"));
  chk("the file says that it is not applied yet", /^-- NOT APPLIED\./m.test(sql));
  chk(
    "the function has no argument, so it can only delete the account that calls it",
    /create or replace function public\.delete_my_account\(\) returns jsonb/.test(body) &&
      /me uuid := auth\.uid\(\);/.test(body) &&
      /if me is null then raise exception/.test(body)
  );
  chk("it runs with fixed rights and a fixed search path", /security definer set search_path = public/.test(body));
  chk("the admin account is refused", /if is_admin\(\) then raise exception/.test(body));
  /* each table of the game that holds rows of a player, from the two other database files */
  const other =
    fs.readFileSync(GAME_DIR + "../docs/game-addons.sql", "utf8") +
    fs.readFileSync(GAME_DIR + "../supabase/migrations/20261124170000_roles_audit_coach.sql", "utf8");
  const mine = {
    games: "owner",
    player_entitlements: "user_id",
    coaches: "user_id",
    coach_notes: "coach",
    save_failures: "user_id",
  };
  chk(
    "each table with rows of a player is in the other database files, and the function removes those rows",
    Object.keys(mine).every(
      t => other.includes(t) && new RegExp("delete from " + t + " where [^;]*" + mine[t] + " = me").test(body)
    ),
    Object.keys(mine)
      .filter(t => !new RegExp("delete from " + t + " where [^;]*" + mine[t] + " = me").test(body))
      .join()
  );
  chk("a coach's notes about the person go too", /delete from coach_notes where coach = me or client = me;/.test(body));
  chk("the sign-in is removed last", /delete from auth\.users where id = me;\s*return/.test(body));
  chk(
    "the log keeps its lines with the email taken out",
    /update admin_audit set actor_email = null where actor = me;/.test(body) &&
      /update admin_audit set target_email = null where target = me;/.test(body)
  );
  chk(
    "the required rights: closed to everyone, then open to signed-in accounts only",
    /revoke all on function public\.delete_my_account\(\) from public, anon;/.test(sql) &&
      /grant execute on function public\.delete_my_account\(\) to authenticated;/.test(sql) &&
      !/to [^;]*anon;/.test(sql.replace(/from public, anon;/g, ""))
  );
  chk("the button calls the function by this name", read("account/trust.js").includes('rpc("delete_my_account")'));

  /* THE PRIVACY PAGE, READ AS TEXT */
  const txt = page.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
  chk(
    "it says where: Supabase, and the browser of the device",
    /Supabase/.test(txt) && /storage of this browser/.test(txt)
  );
  chk(
    "it says who: the person, the admin for any game, a coach only while the switch is on",
    /Eli can open any game and change it/.test(txt) &&
      /only while "Share with my coach" is on/.test(txt) &&
      /each account that Eli gave the coach role/.test(txt)
  );
  chk(
    "it says the real start of the switch for each arrival, and where the switch is",
    /public link starts with "Share with my coach"\s+off/.test(txt) &&
      /coach's invite link starts with it\s+on/.test(txt) &&
      /Menu, then My account, then Share with my coach/.test(txt)
  );
  chk("it covers the web app", /web app/.test(txt) && /travel inside that link/.test(txt));
  chk(
    "the delete button asks two times, in calm words",
    page.includes("First ask.") &&
      page.includes("Second ask.") &&
      page.includes("Keep my account") &&
      page.includes("tuDelete(sb, S.uid")
  );
  chk(
    "the page loads the same code as the game",
    /<script src="account\/trust\.js(\?v=[0-9a-f]+)?"><\/script>/.test(page)
  );
  chk(
    "the page has no long dash and no blame word",
    !page.includes(dash) && !blame.test(txt.replace(/does not go through/g, ""))
  );
})().catch(e => chk("the test ran to its end", false, e && e.stack));
