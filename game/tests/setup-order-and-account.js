/* ============================================================================
   SLAM the Game, test: tests/setup-order-and-account.js
   PURPOSE     Examine run SLAM-ONBOARD-1 (Nov 27 2026), the part of the second worker. THE ORDER OF THE
               PAGES: About you holds the pages 0, 1, 2, 3; then D (4, 9, 10), A (5, 11, 7), I (12), T (8),
               E (13, 6). The age of the four questions is not asked again and shows filled, with one tap
               to change it. "How money feels" is the last question of About you, and "I'd rather not look"
               turns the gentle words on for the rest of setup. Social Security is asked only when the
               flow did not answer it. "page X of N" and the meter stay correct. A copy of a round from the
               older order comes back on a page that still needs an answer. WHY A ROUND ASKS: the line
               that ties the next round to a want. THE ACCOUNT SCREEN: the one line, the Show / Hide
               button of the password box, and the row "Confirm your email to keep your plan" on Home.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. Made-up players. A
               stand-in for the sign-in service and for the browser storage, made here and removed at the
               end.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: screens/smart.js (SM_ORDER, smSkip, smLive, smSsDone, smSpotFix,
               smAgeRow), features/spiral.js (SP_ROUNDS, spWhy), features/couldbe.js (ACT.cbrest,
               finishSetupCb), account/supa.js (suGateTop, suPwBox, suPwToggle, suWaitKeep,
               homeConfirmRow, suAgain), features/okay.js (ACT.suagain).
   ========================================================================= */
(async () => {
  const G0 = clone(G),
    ls0 = global.localStorage,
    loc0 = global.location,
    store = {},
    N = () => {
      if (W && W.sm) W.sm.adv = 0;
      X("wnext");
    },
    fid = (h, id) => (h.split('data-fid="' + id + '"')[1] || "").split("data-fid=")[0],
    pageOf = h => {
      const m = /page (\d+) of (\d+)/.exec(h);
      return m ? [+m[1], +m[2]] : null;
    },
    /* a new player through What you want and the four questions */
    made = picks => {
      G = clone(G0);
      G.demo = true;
      W = null;
      SH = null;
      X("start");
      (picks || []).forEach(id => X("wnpick", id));
      X(picks && picks.length ? "wnnext" : "wnskip");
      X("cbset", "", "", { q: "age", i: 2 });
      X("cbset", "", "", { q: "spend", i: 2 });
      X("cbset", "", "", { q: "inv", i: 2 });
      X("cbset", "", "", { q: "save", i: 3 });
    };

  /* ---- 1. THE ORDER OF THE PAGES ---- */
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  chk("the order of the pages", same(SM_ORDER, [0, 1, 2, 3, 4, 9, 10, 5, 11, 7, 12, 8, 13, 6]), SM_ORDER);
  chk(
    "the rounds: About you, then D, A, I, T, E",
    same(
      SP_ROUNDS.map(r => r.L),
      ["", "D", "A", "I", "T", "E"]
    )
  );
  chk(
    "the pages of each round",
    same(
      SP_ROUNDS.map(r => r.pages),
      [[0, 1, 2, 3], [4, 9, 10], [5, 11, 7], [12], [8], [13, 6]]
    ),
    JSON.stringify(SP_ROUNDS.map(r => r.pages))
  );
  chk(
    "the rounds in a row are the order of the pages, and each page is in one round",
    same([].concat(...SP_ROUNDS.map(r => r.pages)), SM_ORDER) && new Set(SM_ORDER).size === SETUP.length,
    SETUP.length
  );
  chk("the credit cards (9) come after the kinds of debt (4)", SM_ORDER.indexOf(9) === SM_ORDER.indexOf(4) + 1);

  /* ---- 2. THE REST OF SETUP, AFTER THE FOUR QUESTIONS ---- */
  made(["debt", "travel"]);
  const age0 = C().age;
  cbWayDo("ss", "no"); /* Social Security answered in the flow: Not for me */
  X("gohome");
  X("cbrest");
  let h = ov();
  const seen = [];
  const note = () => {
    const p = pageOf(ov());
    if (p) seen.push(p);
    return p;
  };
  let p = note();
  chk("the rest of setup starts on your work: the age is not asked again", W.kind === "setup" && W.step === 1, W.step);
  chk(
    "the age shows filled, with one tap to change it",
    fid(h, "sm:age").includes("<b>" + age0 + "</b>") &&
      /data-a="smage"[^>]*>Change</.test(h) &&
      !/How old are you/.test(h)
  );
  chk(
    "the page count leaves the age page out, and counts the pages that a later answer can bring in",
    p && p[0] === 1 && p[1] === 13 && p[1] === smLive(W).length && !smLive(W).includes(0),
    p
  );
  chk("About you has no letter", /<h2>About you<\/h2>/.test(h) && !/Question \d of 5/.test(h));
  X("smage");
  h = ov();
  chk("Change opens the age question", W.step === 0 && /How old are you\?/.test(h), W.step);
  X("agedec", "40s", "ageDec");
  X("setn", "41", "age");
  chk("the new age is kept, and the next page is your work", W.o.age === 41 && W.step === 1, [W.o.age, W.step]);
  X("set", "Established", "work");
  X("tog", "A main job", "incKinds");
  X("smdone", null, "incKinds");
  X("set", "Steady", "steady");
  chk("then your home", W.step === 2, W.step);
  note();
  X("set", "I rent", "homeQ");
  X("tog", "On my own", "live");
  X("smdone", null, "live");
  chk("then your people", W.step === 3, W.step);
  note();
  X("set", "Single by choice", "rel");
  X("set", "None", "deps");
  X("set", "No one", "share");
  h = ov();
  chk(
    "the last question of About you is how money feels",
    W.step === 3 && /When you think about your money, what's closest\?/.test(h) && /I'd rather not look/.test(h),
    W.step
  );
  X("set", "I'd rather not look", "feel0");
  h = ov();
  chk("that answer turns the gentle words on at once", W.o.gentle === true);
  chk("round 1 is D, and it starts with the kinds of debt", W.step === 4 && /Question 1 of 5/.test(h), W.step);
  note();
  chk(
    "the first page of D says why it asks: the want that is about debts",
    fid(h, "sp:why").includes("Asking because you picked Get out of debt.")
  );
  X("tog", "Credit card balance", "debtKinds");
  N();
  chk("then the credit cards", W.step === 9, W.step);
  note();
  chk("the why line is on the first page of the round only", !/data-fid="sp:why"/.test(ov()));
  X("amset", "1", undefined, { q: "cards.n", lab: "1" });
  X("amset", "1", undefined, { q: "cards.carry", lab: "1" });
  chk("then each debt", W.step === 10, W.step);
  note();
  for (let i = 0; i < 6 && !W.sp; i++) N();
  h = ov();
  p = pageOf(h);
  chk("the number of the round keeps the page count of its last page", p && same(p, seen[seen.length - 1]), p);
  chk(
    "gentle: the debt number waits behind 'when you're ready', with the gentle line",
    W.sp &&
      W.sp.r === 1 &&
      /<summary>What you owe, when you're ready<\/summary>/.test(h) &&
      fid(h, "sp:soft").includes(GENTLE_ERA.one) &&
      /data-fid="sp:big"/.test(h),
    W.sp
  );
  chk("gentle: the first era has its gentle name on the route", !/Digging Out/.test(h) || /Getting Started/.test(h));
  X("spnext");
  h = ov();
  chk("gentle: the summary of D leads with the smallest debt", /Smallest first: credit card balance\./.test(h));
  chk(
    "no want is about what you have: the normal line of the next round",
    fid(h, "sp:next").includes("What you have") && !/Asking because/.test(fid(h, "sp:next")),
    fid(h, "sp:next")
  );
  X("spgo");
  chk("round 2 is A: where your money lives", W.step === 5, W.step);
  note();
  N();
  chk("then each account", W.step === 11, W.step);
  note();
  N();
  chk("then your cushion", W.step === 7, W.step);
  note();
  X("set", "No", "can1k");
  X("set", "Less than a month", "cover");
  X("set", "No", "invest");
  X("spnext");
  X("spgo");
  chk("round 3 is I: each source of money", W.step === 12 && /Question 3 of 5/.test(ov()), W.step);
  note();
  N();
  X("spnext");
  X("spgo");
  chk("round 4 is T", W.step === 8 && /Question 4 of 5/.test(ov()), W.step);
  note();
  X("set", "I don't know", "taxQ");
  X("set", "I don't know", "matchQ");
  if (W.step === 8 && !W.sp) N();
  X("spnext");
  h = ov();
  chk(
    "the screen before E says why: the want that is about spending",
    fid(h, "sp:next").includes("Next: your expenses. Asking because you picked Travel more."),
    fid(h, "sp:next")
  );
  X("spgo");
  chk("round 5 is E: spending group by group", W.step === 13 && /Question 5 of 5/.test(ov()), W.step);
  note();
  N();
  h = ov();
  p = note();
  chk("the last page", W.step === 6 && p && p[0] === p[1], p);
  chk(
    "Social Security is not asked again: the flow has the answer",
    smSsDone(W) && !/Social Security/.test(h) && !smQs(W, 6).some(q => q.k === "ssq")
  );
  chk("how money feels is not asked a second time", !/When you think about your money/.test(h));
  chk(
    "page X of N: X goes up by one on each page after the age, N never grows, and the last page is N of N",
    seen.every((x, i) => x[0] <= x[1] && (i < 2 || (x[0] === seen[i - 1][0] + 1 && x[1] <= seen[i - 1][1]))) &&
      seen[seen.length - 1][0] === seen[seen.length - 1][1],
    JSON.stringify(seen)
  );
  N();
  X("spnext");
  X("spgo");
  const c = C();
  chk(
    "setup is done, with the first plan",
    !G.demo && W && W.kind === "firstplan" && c.x.cb.setup === true,
    W && W.kind
  );
  chk(
    "the changed age reached the profile and the answer of the four questions",
    c.age === 41 && c.x.cb.a.age.v === 41
  );
  chk(
    "the wants are still goals",
    ["Get out of debt", "Travel more"].every(n => c.goals.some(g => g.n === n))
  );
  chk("the player is in gentle mode", c.gentle === true);
  chk(
    "gentle: the next step leads with the smallest one, a small win",
    nextStep(c, derive(c)).a === "gwin" && /One small win first/.test(nextStep(c, derive(c)).t)
  );
  chk("Not for me stays: no Social Security is counted", c.x.ss === 0 && !cbCounted(c).ss);
  X("close");

  /* a player who did not answer Social Security in the flow is asked, at the end */
  made([]);
  X("gohome");
  X("cbrest");
  chk(
    "with no answer in the flow, Social Security is asked on the last page",
    smQs(W, 6).some(q => q.k === "ssq")
  );
  chk("with no want, no why line", spWhy(W, SP_ROUNDS[1]) === null);
  W.step = 3;
  drawSheet();
  X("set", "Single by choice", "rel");
  X("set", "None", "deps");
  X("set", "No one", "share");
  chk("About you waits for how money feels", W.step === 3);
  X("smskip", null, "feel0");
  chk("Skip moves on, and the game stays in its normal words", W.step === 4 && !W.o.gentle, W.step);
  /* a copy of a round from the older order: no number of the order, left on a page of the old second round */
  const old = clone(W);
  delete old.ord;
  old.step = 11;
  old.o.work = null;
  smSpotFix(old);
  chk(
    "a copy from the older order comes back on your work, which it never asked",
    old.step === 1 && old.ord === SM_ORDER_V
  );
  const cur = clone(W);
  cur.step = 11;
  cur.o.work = null;
  smSpotFix(cur);
  chk("a copy of this order comes back on the page it left", cur.step === 11);
  X("close");

  /* ---- 3. THE ACCOUNT SCREEN ---- */
  const top = suGateTop("new", false);
  chk(
    "create account: the one line, word for word",
    top.includes("Your game saves to your account. Eli can see it to support you.")
  );
  chk(
    "the three older sentences are gone",
    !/follows you to any phone|person who runs SLAM|owner of this app/.test(top)
  );
  chk("coach sharing is one small line under it", top.includes(suShareLine(false)) && /font-size:13px/.test(top));
  chk("the privacy page link is still on the screen", tuGateFoot().includes('href="./privacy.html"'));
  chk(
    "sign in keeps its words",
    /Welcome back/.test(suGateTop("in", false)) && !suGateTop("in", false).includes(SU_NEW_LINE)
  );
  const box = suPwBox("new");
  chk(
    "the password box has a Show button, a real button with a name",
    /<input id="su-p" type="password"/.test(box) &&
      /<button type="button" class="su-show" data-show[^>]*>Show<\/button>/.test(box)
  );
  const supa = require("fs").readFileSync(GAME_DIR + "account/supa.js", "utf8");
  chk(
    "the Show button has a visible border and a 44px target",
    /\.su-show\{[^}]*min-height:44px[^}]*border:2px solid/.test(supa)
  );
  const inp = { type: "password" },
    attrs = {},
    btn = { textContent: "Show", setAttribute: (k, v) => (attrs[k] = v) };
  suPwToggle(inp, btn);
  chk("Show shows the password", inp.type === "text" && btn.textContent === "Hide" && attrs["aria-pressed"] === "true");
  suPwToggle(inp, btn);
  chk(
    "Hide hides it again",
    inp.type === "password" && btn.textContent === "Show" && attrs["aria-pressed"] === "false"
  );
  chk("passkeys stay off", typeof PASSKEY_READY === "undefined" || PASSKEY_READY === false);

  /* the email waits for its link: the visitor stays in the game, and Home has one slim row */
  global.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => (store[k] = String(v)),
    removeItem: k => delete store[k],
  };
  global.location = { origin: "https://x", pathname: "/game/", search: "", hash: "" };
  made([]);
  X("gohome");
  const guest0 = DOOR.guest,
    sb0 = SUPA.sb,
    uid0 = SUPA.uid;
  DOOR.guest = true;
  SUPA.uid = null;
  chk("a visitor in a game stays in it while the email waits", suWaitKeep({ state: "confirm" }) === true);
  chk("a person who is signed in at once is not held", suWaitKeep({ state: "in" }) === false);
  DOOR.guest = false;
  chk("a visitor with no game stays on the sign-up screen", suWaitKeep({ state: "confirm" }) === false);
  DOOR.guest = true;
  render();
  chk("no row before an account is made", !/data-fid="su:wait"/.test(app()));
  suWaitPut("a@example.com");
  render();
  h = app();
  const row = "<div" + (h.split('<div class="homerow rskeep suwait"')[1] || "").split("</button>")[0];
  chk(
    "Home has the row: Confirm your email to keep your plan, with Send again",
    /data-fid="su:wait"/.test(h) &&
      /<b>Confirm your email to keep your plan<\/b>/.test(row) &&
      /data-a="suagain"[^>]*>Send again/.test(row),
    row.slice(0, 200)
  );
  chk("the row does not pulse and is not a second primary button", !/pulse|primary|class="[^"]*\bgo\b/.test(row));
  chk("the row names the address", row.includes("a@example.com"));
  let sent = null;
  SUPA.sb = {
    auth: {
      resend: async o => {
        sent = o;
        return { data: {}, error: null };
      },
    },
  };
  chk("Send again is an action of the game", typeof ACT.suagain === "function");
  const ok = await suAgain();
  chk(
    "Send again uses the resend call of the sign-up screen, to the address of this page",
    ok === true &&
      sent &&
      sent.type === "signup" &&
      sent.email === "a@example.com" &&
      sent.options.emailRedirectTo === "https://x/game/",
    sent
  );
  chk("the row says it was sent", /Sent again to a@example\.com/.test(app()));
  SUPA.sb = {
    auth: { resend: async () => ({ data: {}, error: { message: "email rate limit exceeded", status: 429 } }) },
  };
  await suAgain();
  chk(
    "an answer of the service that is not ok shows in calm words",
    /too many emails/.test(app()) && !/rate limit exceeded/.test(app())
  );
  SUPA.uid = "u1";
  render();
  chk("a person who is signed in has no such row", !/data-fid="su:wait"/.test(app()));
  SUPA.uid = uid0;
  suWaitPut("");
  render();
  chk("with no address waiting, no row", !/data-fid="su:wait"/.test(app()));
  SUPA.sb = sb0;
  SUPA.waitMsg = "";
  DOOR.guest = guest0;
  global.localStorage = ls0;
  global.location = loc0;
  G = clone(G0);
  W = null;
  SH = null;
})();
