/* ============================================================================
   SLAM the Game, test: tests/front-door.js
   PURPOSE     Examine the front door: a new visitor sees the landing screen, a person who is signed in
               does not, Start opens the setup by taps with "Am I okay?" first and ends on the payoff
               reveal (results.js), with the answer one tap away in the Menu, the offer to save by making an account, the link marks in the address stay, and the copy.
   INPUT       The game scripts, loaded by harness.cjs. A stand-in for the page (one element list) and for
               the browser storage, made here and removed at the end.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: account/door.js, features/okay.js, and the calls in
               account/supa.js, screens/ui.js, screens/ux.js, screens/planner.js, account/cloud.js.
   ========================================================================= */
{
  const fs = require("fs"),
    G0 = G,
    tab0 = tab,
    doc0 = { ce: document.createElement, body: document.body },
    ls0 = global.localStorage,
    loc0 = global.location,
    store = {},
    all = [],
    kids = {
      get length() {
        return all.filter(e => e.id === "door").length;
      },
      get 0() {
        return all.filter(e => e.id === "door")[0];
      },
    };
  global.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => (store[k] = String(v)),
    removeItem: k => delete store[k],
    key: i => Object.keys(store)[i],
    get length() {
      return Object.keys(store).length;
    },
  };
  global.location = { search: "?ref=abc123&as=someone", hash: "", href: "https://x/Slam/game/?ref=abc123&as=someone" };
  document.createElement = () => {
    const el = {
      innerHTML: "",
      id: "",
      remove: () => all.splice(all.indexOf(el), 1),
      querySelector: () => null,
      querySelectorAll: () => [],
      style: {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {} },
      setAttribute: () => {},
      appendChild: () => {},
    };
    return el;
  };
  document.body = {
    appendChild: el => all.push(el),
    removeChild: el => all.splice(all.indexOf(el), 1),
    classList: { toggle: () => {} },
    dataset: {},
  };
  const reset = () => {
    all.length = 0;
    Object.keys(store).forEach(k => delete store[k]);
    Object.assign(DOOR, { done: null, want: "", el: null, guest: false, shown: false });
  };
  let gate = null;
  const suGate0 = suGate;
  suGate = (done, mode) => (gate = { done, mode });

  /* 1. A new visitor sees the landing screen */
  reset();
  let ready = 0;
  const done = () => ready++;
  doorGate(done);
  chk("a new visitor: the landing screen is on the page", kids.length === 1 && kids[0].id === "door" && DOOR.shown);
  const L = kids[0].innerHTML;
  chk("the one line", L.includes("Find out if you're okay with money in 2 minutes, no typing, free."));
  chk("the first step is named: four taps, then the number", L.includes("First: four taps, then your freedom number."));
  chk("one Start button", (L.match(/data-door="start"/g) || []).length === 1 && />Start<\/button>/.test(L));
  chk(
    "Sign in is there, and it is not the primary button",
    /class="door-in2" data-door="in">I have an account\. Sign in</.test(L)
  );
  chk(
    "What is this? is closed by default",
    /<details><summary>What is this\?<\/summary>/.test(L) && !/<details open/.test(L)
  );
  chk(
    "it is free, nothing typed, nothing saved until you choose",
    /It is free\./.test(L) && /Nothing is typed\. Nothing is saved to an account until you choose/.test(L)
  );
  chk("the line: Education and tools, not financial advice.", L.includes("Education and tools, not financial advice."));
  chk(
    "the blank FIRE sheet button is the shared one (firelink.js), with the template copy link",
    L.includes(doorFireBtn()) &&
      doorFireBtn() === fireBlankButton({ button: "door-sheet", line: "door-tiny" }) &&
      doorFireBtn().includes('href="' + FIRE_BLANK_URL + '"') &&
      /\/d\/1HZBHzEeDgQRmGcqwzaXW1jgd2N3SPSddZkhS7svZhHY\/copy$/.test(FIRE_BLANK_URL)
  );
  chk(
    "the button says that the sheet stands alone and that the export is the full plan",
    /stands alone/.test(doorFireBtn()) && /export here is your full plan/.test(doorFireBtn())
  );
  chk("the landing asks for no typing: no input box", !/<input|<textarea/.test(L));
  chk("no account is ready yet: the game was not told to load one", ready === 0);
  chk("clean copy", clean(L) && !L.includes(String.fromCharCode(8212)), junk(L));

  /* 2. A person who is signed in does not see it */
  doorSigned();
  chk("signed in: the landing screen is gone", kids.length === 0 && !DOOR.shown && !doorGuest());
  const supa = fs.readFileSync(GAME_DIR + "account/supa.js", "utf8");
  chk("supa.js opens the door only when nobody is signed in", /if \(!s\) \{[^}]*doorGate\(done\)/.test(supa));
  chk("supa.js closes the door on each sign-in", /function suSet[\s\S]{0,400}doorSigned\(\)/.test(supa));
  reset();
  store["sb-twuxggigsfsdczsyvupk-auth-token"] = "{}";
  global.supabase = { createClient: () => ({}) };
  const claude0 = global.claude;
  delete global.claude;
  doorEarly();
  chk("a sign-in token on this device: the landing does not flash before the check", kids.length === 0);
  delete store["sb-twuxggigsfsdczsyvupk-auth-token"];
  location.hash = "#access_token=abc&type=signup";
  doorEarly();
  chk("back from the email link: no landing", kids.length === 0);
  location.hash = "";
  doorEarly();
  chk("a new visitor: the landing shows at once, before the sign-in check", kids.length === 1);
  delete global.supabase;
  if (claude0 !== undefined) global.claude = claude0;
  chk("the address is not changed: the link marks stay", location.search === "?ref=abc123&as=someone");
  const srcs =
    fs.readFileSync(GAME_DIR + "account/door.js", "utf8") + fs.readFileSync(GAME_DIR + "features/okay.js", "utf8");
  chk(
    "the door never changes the address",
    !/location\.(href|search|hash)\s*=|location\.(replace|assign)|replaceState|pushState/.test(srcs)
  );

  /* 3. Start: no account, no typing, "Am I okay?" first */
  reset();
  G = fresh();
  doorGate(done);
  doorStart();
  chk("Start: the landing is gone and no sign-in screen opened", kids.length === 0 && gate === null && ready === 0, [
    kids.length,
    gate,
    ready,
  ]);
  chk("Start: the visitor plays with no account", doorGuest() && store.slam_guest === "1");
  /* the one opening of a new player: What it is / What it could be (features/couldbe.js) */
  chk("Start opens the one opening: four questions by taps", W && W.kind === "cb" && W.step === "entry", W && W.kind);
  let h = ov();
  chk("the old opening is not shown first", !/Am I okay\? · page|Question 1 of 5|Here's where you stand/.test(h));
  chk(
    "the first question asks the age, with range chips and no box to type in",
    /How old are you\?/.test(h) && !/<input/.test(h)
  );
  X("cbset", "", "", { q: "age", i: 2 });
  X("cbset", "", "", { q: "spend", i: 2 });
  X("cbset", "", "", { q: "inv", i: 2 });
  chk("no number before the fourth answer", W.step === "entry" && G.demo);
  X("cbset", "", "", { q: "save", i: 3 });
  h = ov();
  chk(
    "the first number comes at the fifth tap, with the tap on Start",
    cbTaps() === 5 && W.kind === "cb" && W.step === "is" && /What it is/.test(h) && /data-cbn="is"/.test(h),
    cbTaps()
  );
  chk(
    "the game is the visitor's own after the four answers",
    !G.demo && G.chars.length === 1 && store.slam_guest === "2"
  );
  /* the rest of setup: the last screen has three buttons only (Batch B, phase 4b), so it is on Home */
  X("cbgo", "end");
  chk(
    "the last screen saves the plan with a free account, and has no rest of setup",
    /data-a="cbsave"/.test(ov()) && !/data-a="cbrest"/.test(ov())
  );
  X("gohome");
  chk("the first tile of Home opens the rest of setup", !SH && /data-fid="cb:homerest"/.test(app()));
  X("cbrest");
  chk("the rest of setup is the setup by taps", W && W.kind === "setup" && W.door === true && W.cbRest === true);
  h = ov();
  chk("its first question is Am I okay?", /<h2>Am I okay\?<\/h2>/.test(h) && /Am I okay\? · page 1 of \d+/.test(h));
  chk("it keeps the age of the four answers", W.o.age === 32 && W.o.ageDec === "30s", [W.o.age, W.o.ageDec]);
  /* the taps of a person, through the five rounds (spiral.js) to the answer */
  let taps = 0;
  const T = (a, v, k) => {
    taps++;
    if (W && W.sm) W.sm.adv = 0;
    X(a, v, k);
  };
  /* A page that is full goes on by itself. P(n) taps Next only when page n is still open. R() taps through
     the number of a round and its level change. */
  const P = n => {
      if (W && W.kind === "setup" && W.step === n && !W.sp) T("wnext");
    },
    R = () => {
      if (W && W.sp && W.sp.at === "reveal") T("spnext");
      if (W && W.sp && W.sp.at === "level") T("spgo");
    };
  P(0);
  P(9); /* amounts.js: the cards, Next leaves them a guess */
  chk("page 5 from the door has no fast finish", W.step === 4 && !/speedfin/.test(ov()), W.step);
  T("tog", "Credit card balance", "debtKinds");
  P(4);
  R();
  P(5);
  P(11);
  chk("the gut checks are in round 2 (Assets)", W.step === 7 && /A \$1,000 surprise bill/.test(ov()));
  T("set", "No", "can1k");
  T("set", "Less than a month", "cover");
  T("set", "No", "invest");
  R();
  T("set", "Established", "work");
  T("tog", "A main job", "incKinds");
  P(1);
  T("set", "Steady", "steady");
  P(1);
  P(12);
  R();
  T("set", "I don't know", "taxQ");
  T("set", "I don't know", "matchQ");
  P(8);
  R();
  T("set", Object.keys(HOMEMAP)[0], "homeQ");
  T("tog", "On my own", "live");
  P(2);
  T("set", "Single by choice", "rel");
  T("set", "None", "deps");
  T("set", "No one", "share");
  P(3);
  P(13);
  P(6);
  R();
  h = ov();
  /* results first: the path ends on the one payoff reveal, with the offer to keep the game; the answer to
     "Am I okay?" is one tap away in the Menu */
  chk(
    "the path ends on the one reveal, Here's where you stand",
    W && W.kind === "firstplan" && h.includes("Here's where you stand"),
    W && W.kind
  );
  chk(
    "the reveal offers to keep the game, with one primary button",
    /data-a="doorsave">Keep this game: make a free account</.test(h) && (h.match(/class="primary/g) || []).length === 1
  );
  X("okay");
  h = ov();
  chk(
    "the answer to Am I okay? opens from there",
    W && W.kind === "okay" && /<h2>Am I okay\?<\/h2>/.test(h),
    W && W.kind
  );
  chk("the path stays short: at most 40 taps, with the five round screens", taps <= 40, taps);
  chk("the game is the visitor's own now", !G.demo && G.chars.length === 1);
  chk("the device remembers the game, so the landing does not come back", store.slam_guest === "2" && doorHasGame());
  const c = C(),
    o = okCalc(c, derive(c));
  chk(
    "the answer is a Guess and says so",
    o.state === "Guess" && /This is a Guess/.test(h) && h.includes(kitPill("Guess"))
  );
  chk(
    "no grade and no verdict word",
    /No grade/.test(h) &&
      !/\b(good|bad|great|poor|excellent|terrible|fail|failed|behind|mistake|off track|should have)\b/i.test(
        h.replace(/<[^>]+>/g, " ")
      ),
    h
      .replace(/<[^>]+>/g, " ")
      .match(/\b(good|bad|great|poor|excellent|terrible|fail|failed|behind|mistake|off track|should have)\b/i)
  );
  chk("the Recalculating tone", /recalculates it/.test(h));
  chk(
    "the first sentence repeats the taps",
    /a \$1,000 surprise would mean borrowing/.test(h) && /It has a first step|it has a first step/.test(h)
  );
  chk(
    "the numbers are the numbers of the game",
    o.months === c.months && o.left === derive(c).left && o.era === eraName(derive(c))
  );
  chk(
    "the cushion line uses the months of the profile",
    h.includes("Your bills are covered for " + o.monthWords + ".")
  );
  chk("the debt line names what was tapped", /Credit card balance/.test(h) && o.high === (c.high === "yes"));
  chk("the one next step is the next step of the game", h.includes(esc(nextStep(c, derive(c)).t)));
  chk(
    "it says what it uses, closed by default",
    /<details class="math"><summary>What this answer uses<\/summary>/.test(h)
  );
  chk("the offer: save it by making an account", /data-a="doorsave">Save my answer: make a free account</.test(h));
  chk("one primary button on the answer", (h.match(/class="primary/g) || []).length === 1);
  chk("the answer is clean", clean(h) && !h.includes(String.fromCharCode(8212)), junk(h));

  /* 4. The offer opens the sign-in screen on "Create your account"; Back keeps the game */
  X("doorsave");
  chk("Save opens the account screen in the mode Create", gate && gate.mode === "new" && gate.done === done);
  chk("Back says the game stays on this device", /Not now\. Keep playing on this device/.test(doorGateBack()));
  doorBack();
  chk("Back for a visitor with a game: no landing", kids.length === 0);
  closeSheet();
  chk("Home has the row: keep this game", /data-a="doorsave"><span><b>Keep this game: make a free account/.test(app()));
  chk(
    "My account for a visitor: no account yet, and how to make one",
    /No account yet/.test(doorAcctSheet()) &&
      /data-a="doorsave"/.test(doorAcctSheet()) &&
      /data-a="doorin"/.test(doorAcctSheet()) &&
      /doorGuest\(\) && typeof doorAcctSheet === "function"\) return doorAcctSheet\(\)/.test(supa)
  );
  chk("the status of the save is plain", clStatus() === "Saved on this device only");
  X("okay");
  chk(
    "the Menu has Am I okay?, and it opens the same answer",
    MENU.some(m => m[1] === "okay" && m[0] === "Am I okay?") && /<h2>Am I okay\?<\/h2>/.test(ov())
  );
  closeSheet();

  /* 5. The visitor comes back: straight to the game. Then signs in: no more a guest. */
  Object.assign(DOOR, { done: null, want: "", el: null, guest: false, shown: false });
  doorGate(done);
  chk("a visitor with a game on this device goes straight to the game", kids.length === 0 && doorGuest());
  X("okay");
  chk("before the account: the open answer offers to save", /data-a="doorsave"/.test(ov()));
  doorSigned();
  chk("after the sign-in the game is not a guest game", !doorGuest() && !("slam_guest" in store));
  chk(
    "at once, with no other tap: Home and the open answer no longer offer an account",
    !/data-a="doorsave"/.test(app()) && !/data-a="doorsave"/.test(ov())
  );
  chk(
    "the open answer says that the game is kept in the account",
    /Your account is made, and this game is now kept in it\./.test(ov()) && doorJustSaved()
  );
  closeSheet();
  chk(
    "after the sign-in Home has no row about this device",
    !/Keep this game: make a free account/.test((render(), app()))
  );

  /* 6. Sign in from the landing, before and after the sign-in check came back */
  reset();
  gate = null;
  doorShow();
  doorSignIn("in");
  chk(
    "Sign in before the check came back: it waits, and says so",
    gate === null && DOOR.want === "in" && /One moment/.test(kids[0].innerHTML)
  );
  doorGate(done);
  chk("then the sign-in screen opens on Sign in", gate && gate.mode === "in" && kids.length === 0);
  doorBack();
  chk("Back from Sign in for a new visitor: the landing again", kids.length === 1);
  chk("Back is a plain Back", />Back<\/button>/.test(doorGateBack()));

  /* 7. A game of an account that is still on this device is put away, not shown and not lost */
  reset();
  store.su_uid = "user-1";
  store[KEY] = "the game of user-1";
  G.demo = false;
  doorGate(done);
  doorStart();
  chk("the copy of the account is put away", store[KEY + ".was"] === "the game of user-1" && !("su_uid" in store));
  chk("and the visitor starts the first question on a new game", G.demo && W && W.kind === "cb" && W.step === "entry");
  closeSheet();
  UX_NOSAMPLE = true; /* the harness turns the welcome screen off; this check needs it */
  render();
  chk(
    "a visitor who closed the first question sees Start again, not an account message",
    /data-a="doorgo">Start</.test(app()) && !/check your account/i.test(app())
  );

  UX_NOSAMPLE = false;

  /* 8. The link for the slide */
  chk(
    "the link for the slide is the address of the game",
    DOOR_LINK === "https://sapphirestoneage.github.io/Slam/game/"
  );
  const idx = fs.readFileSync(GAME_DIR + "index.html", "utf8");
  chk(
    "What is this? links the privacy page, with the words of the trust file",
    L.includes('<a class="door-link" href="' + TRUST_PAGE + '">Privacy: what is stored and who sees it</a>') &&
      L.includes("<b>" + TRUST_LINE + "</b>") &&
      idx.indexOf("account/trust.js") < idx.indexOf("account/door.js")
  );
  chk(
    "index.html loads firelink.js, then door.js, then supa.js",
    idx.indexOf("features/firelink.js") > 0 &&
      idx.indexOf("features/firelink.js") < idx.indexOf("account/door.js") &&
      idx.indexOf("account/door.js") < idx.indexOf("account/supa.js")
  );
  chk(
    "the admin page and the coach page do not load the door",
    !/door\.js/.test(
      fs.readFileSync(GAME_DIR + "admin.html", "utf8") + fs.readFileSync(GAME_DIR + "coach.html", "utf8")
    )
  );
  chk(
    "the built list has the row, and its probe passes",
    WB.some(r => /front door/i.test(r[1]) && r[2] === "b" && r[3]() === true)
  );

  suGate = suGate0;
  document.createElement = doc0.ce;
  document.body = doc0.body;
  global.localStorage = ls0;
  if (loc0 === undefined) delete global.location;
  else global.location = loc0;
  Object.assign(DOOR, { done: null, want: "", el: null, guest: false, shown: false });
  G = G0;
  tab = tab0;
  W = null;
  SH = null;
}
