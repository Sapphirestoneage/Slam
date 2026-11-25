/* ============================================================================
   SLAM the Game, test: tests/front-door.js
   PURPOSE     Examine the front door: a new visitor sees the landing screen, a person who is signed in
               does not, Start opens the setup by taps with "Am I okay?" first and ends on the answer,
               the offer to save by making an account, the link marks in the address stay, and the copy.
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
  chk("the first question is named", L.includes("Am I okay?"));
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
  chk("Start opens the setup by taps", W && W.kind === "setup" && W.door === true);
  let h = ov();
  chk("the first question is Am I okay?", /<h2>Am I okay\?<\/h2>/.test(h) && /Am I okay\? · page 1 of 7/.test(h));
  chk("page 1 has no typing that is required", /How old are you\?/.test(h));
  /* the taps of a person: 21 taps to the answer */
  let taps = 0;
  const T = (a, v, k) => {
    taps++;
    X(a, v, k);
  };
  /* A page that is full goes to the next page by itself. P(n) taps Next only when page n is still open. */
  const P = n => {
    if (W && W.kind === "setup" && W.step === n) T("wnext");
  };
  T("agedec", "30s", "ageDec");
  T("setn", "34", "age");
  P(0);
  T("set", "Established", "work");
  T("tog", "A main job", "incKinds");
  T("set", "Every 2 weeks", "payFreq");
  T("set", "Steady", "steady");
  P(1);
  T("set", Object.keys(HOMEMAP)[0], "homeQ");
  T("tog", "On my own", "live");
  P(2);
  T("set", "Single by choice", "rel");
  T("set", "None", "deps");
  T("set", "No one", "share");
  P(3);
  chk(
    "page 5 from the door has no fast finish (the answer needs the last page)",
    W.step === 4 && !/speedfin/.test(ov()),
    W.step
  );
  T("tog", "Credit card balance", "debtKinds");
  P(4);
  P(5);
  chk("the last page is the three gut checks", W.step === 6 && /A \$1,000 surprise bill/.test(ov()));
  T("set", "No", "can1k");
  T("set", "Less than a month", "cover");
  T("set", "No", "invest");
  P(6);
  h = ov();
  chk("the path ends on the answer", W && W.kind === "okay" && /<h2>Am I okay\?<\/h2>/.test(h), W && W.kind);
  chk("the path is short: at most 25 taps", taps <= 25, taps);
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
  doorSigned();
  chk("after the sign-in the game is not a guest game", !doorGuest() && !("slam_guest" in store));
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
  chk("and the visitor starts the first question on a new game", G.demo && W && W.kind === "setup" && W.door);
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
