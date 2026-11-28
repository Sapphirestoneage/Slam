/* ============================================================================
   SLAM the Game, test: tests/not-sure-and-profile-sheet.js
   PURPOSE     Examine run 16, sections C and D (Nov 27 2026). C: each question of the opening, of the ways,
               of setup and of the demo has the choice "I'm not sure" and the helper line "Tap one to keep
               going."; that choice is a Guess (a typical value where the game has one, else nothing is
               kept); the kept values of the questions did not change. D: the sheet "Who are you looking
               at?" has Back and Close only and only switches people; what it held is on the Me tab; one
               chevron icon, and no typed arrow character in a screen.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. Made-up answers: a
               player with a costly debt (a credit card) and student loans.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: core/engine.js (NOT_SURE, TAP_ONE), features/couldbe.js,
               features/cbflex.js, features/cbtax.js, features/cblater.js, features/cbmoves.js,
               features/wants.js, features/erain.js, era/era.js, screens/smart.js, features/amounts.js,
               screens/profiles.js, screens/nav.js, features/questlog.js, index.html.
   ========================================================================= */
{
  const G0 = clone(G),
    fs = require("fs"),
    path = require("path"),
    read = f => fs.readFileSync(path.join(GAME_DIR, f), "utf8"),
    has = h => h.includes(NOT_SURE) && h.includes(TAP_ONE),
    fresh0 = () => {
      G = clone(G0);
      G.demo = true;
      W = null;
      SH = null;
    };

  /* ---- C. the opening: What you want, then the four range questions ---- */
  chk("the two phrases", NOT_SURE === "I'm not sure" && TAP_ONE === "Tap one to keep going.");
  fresh0();
  X("start");
  chk("What you want has I'm not sure and the helper line", W.step === "wants" && has(ov()));
  X("wnskip");
  CB_QS.forEach((Q, i) => {
    const h = ov();
    chk(
      "range question " + (i + 1) + " (" + Q.id + ") has I'm not sure and the helper line",
      W.q === i && h.includes(esc(Q.l)) && has(h) && new RegExp('data-a="cbtyp" data-q="' + Q.id + '"').test(h)
    );
    X("cbset", "", "", { q: Q.id, i: 2 });
  });
  chk("four taps make the player", !G.demo && W && W.kind === "cb" && W.step === "is", W && W.step);
  chk(
    "the range questions keep the same values as before (the middle of the chip)",
    C().x.cb.a.spend.v === cbRng("spend", 2).v && C().x.cb.a.age.i === 2
  );

  /* ---- C. the ways: a fourth choice that keeps nothing ---- */
  const ways = cbWays();
  chk("there are five ways", ways.length === 5, ways.length);
  ways.forEach(w => {
    X("cbgo", w.id);
    const h = ov();
    /* a way with no drop for this player shows no choice at all: nothing to be unsure about */
    chk(
      "the way " + w.id + " has I'm not sure and the helper line where it has its three choices",
      W.step === w.id &&
        (!/data-a="cbdo"/.test(h) || (has(h) && /class="ghost wide cbunsure" data-a="cbgo" data-v="next"/.test(h))),
      W.step
    );
  });
  X("cbgo", "shape");
  X("cbgo", "next");
  chk("I'm not sure on a way keeps nothing and goes on", !cbWayState(C(), "shape").how && W.step !== "shape", W.step);
  chk(
    "each way file adds the one part",
    ["couldbe", "cbflex", "cbtax", "cblater", "cbmoves"].every(f =>
      /cbWayUnsure\(\)/.test(read("features/" + f + ".js"))
    )
  );
  closeSheet();

  /* ---- C. the demo: the same words, and I'm not sure as a typical value or as nothing ---- */
  const era = read("era/era.js");
  chk(
    "the demo page shows I'm not sure and the helper line on each question",
    /data-a="unsure"[^`]*\$\{esc\(NOT_SURE\)\}/.test(era) &&
      /\$\{esc\(TAP_ONE\)\}/.test(era) &&
      !/A rough answer is fine/.test(era)
  );
  chk(
    "the demo asks the tax question in the new words",
    ER_QS.find(q => q.id === "tax").l === "Do you put the max into your 401(k) or IRA each year?" &&
      ER_TAX.map(t => t[0]).join("|") === "Yes, the max|Some|Not yet" &&
      ER_TAX.map(t => t[1]).join("|") === "yes|some|no"
  );
  const typ = erCb({ age: 2, spend: ER_TYP, inv: ER_TYP, save: ER_TYP });
  chk(
    "I'm not sure on a range question of the demo is the typical value for the age, a Guess",
    typ.spend.typ === true &&
      typ.spend.v === cbTypical("spend", typ.age.v).v &&
      typ.inv.typ === true &&
      typ.save.cf === 1
  );
  chk("age has no typical value: nothing is kept", !("age" in erClean({ age: ER_TYP })) && !erCb({ age: ER_TYP }).age);
  const base = erBase({ age: 2, spend: 2, inv: 3, save: 3 });
  chk(
    "an answer of the demo that kept nothing is not named as filled",
    base && base.x.cb.era.length === 0 && base.can1k === newChar().can1k
  );
  chk(
    "the profile of the demo works with typical values",
    !!erResult({ age: 2, spend: ER_TYP, inv: ER_TYP, save: ER_TYP }) &&
      erAsked({ age: 2, inv: ER_TYP }).some(q => q.id === "tax")
  );

  /* ---- C. setup: every question of every page ---- */
  fresh0();
  openSetup("new");
  chk("the age page has I'm not sure and the helper line", W.step === 0 && has(ov()));
  X("smskip", null, "age");
  chk(
    "on age it keeps nothing and the page says why it waits",
    W.step === 0 && W.o.age == null && /Your age is the one answer the plan needs/.test(ov())
  );
  X("agedec", "30s", "ageDec");
  chk("the exact age has it too", has(ov()) && ov().includes("What is your exact age?"));
  X("setn", "31", "age");
  /* a player with a costly debt: a card that carries a balance, and student loans */
  Object.assign(W.o, {
    incKinds: ["A main job", "Side gigs"],
    live: ["Roommates", "Kids"],
    debtKinds: ["Credit card balance", "Student loans"],
    accts: ["Checking", "Retirement plan at work"],
  });
  smState(W).md.live = true;
  W.o.am = Object.assign(W.o.am || {}, {
    "cards.n": { v: 2, lab: "2", cf: 2 },
    "cards.carry": { v: 1, lab: "1", cf: 2 },
    "card.1.rate": { v: "promo", lab: "0% promo", cf: 2 },
  });
  const seen = [],
    miss = [];
  SM_ORDER.forEach(p => {
    W.step = p;
    const qs = smQs(W, p) || [],
      steps = [9, 10, 11, 12, 13].includes(p) ? amSteps(W, p) : [];
    if (p !== 0 && !qs.length && !steps.length) {
      drawSheet();
      seen.push("page " + p);
      if (!has(ov())) miss.push("page " + p);
    }
    qs.forEach(q => {
      smState(W).open = q.k;
      drawSheet();
      seen.push(q.k);
      if (!has(ov()) || !ov().includes(q.l)) miss.push(q.k);
    });
    steps.forEach(st => {
      smState(W).open = st.id;
      drawSheet();
      seen.push(st.id);
      if (!has(ov())) miss.push(st.id);
    });
  });
  smState(W).open = null;
  chk("setup was looked at question by question (30 or more)", seen.length >= 30, seen.length);
  chk("every setup question has I'm not sure and the helper line", miss.length === 0, miss.join(", "));
  chk(
    "the lists that had such a choice keep their kept value and show the new words",
    amRateOpts("Credit card balance").some(r => r[0] === NOT_SURE && r[1] === "dk") &&
      SM_Q[8].every(q => q.o.includes("I don't know") && smLab(q, "I don't know") === NOT_SURE) &&
      smLab(SM_Q[8][2], "Yes, the most I'm allowed") === "Yes, the max" &&
      CB_TAXQ.yes === "Yes, the most I'm allowed"
  );
  chk(
    "no question says No idea, I don't know, or Skip, keep a guess",
    (() => {
      const src = ["features/couldbe.js", "features/amounts.js", "features/wants.js", "era/era.js"].map(read).join("");
      return !/No idea, use typical|Skip, keep a guess|>Skip for now</.test(src);
    })()
  );

  /* I'm not sure on About you: the most likely answer stands in, as a Guess */
  W.step = 1;
  Object.assign(W.o, { work: null, incKinds: [], steady: null });
  smState(W).md = {};
  X("smskip", null, "work");
  chk(
    "I'm not sure on your work: the most likely answer stands in, and the screen says it is a Guess",
    typeof W.o.work === "string" && W.o.work.length > 0 && smState(W).sk.work === true
  );
  smState(W).open = "work";
  drawSheet();
  chk(
    "the chip is on, no answer chip is on, and one line names the Guess",
    /data-a="smskip" data-k="work" aria-pressed="true"/.test(ov()) &&
      !/class="chip on[^"]*" data-a="set" data-k="work"/.test(ov()) &&
      /For now the game uses/.test(ov())
  );
  smState(W).open = null;
  X("set", "Student", "work");
  chk("the player's own answer takes its place", W.o.work === "Student" && !smState(W).sk.work);
  X("smskip", null, "work");
  X("smskip", null, "incKinds");
  X("smskip", null, "steady");
  chk("a list question takes one stock choice", Array.isArray(W.o.incKinds) && W.o.incKinds.length === 1);
  W.o.live = [];
  W.o.homeQ = null;
  W.step = 2;
  X("smskip", null, "homeQ");
  X("smskip", null, "live");
  W.step = 3;
  ["rel", "deps", "share", "feel0"].forEach(k => X("smskip", null, k));
  chk(
    "About you can be passed with I'm not sure only",
    [1, 2, 3].every(p => SETUP[p].req(W))
  );
  /* the cushion: nothing is kept */
  W.step = 7;
  ["can1k", "cover", "invest"].forEach(k => {
    W.o[k] = null;
  });
  chk("the cushion page waits for its three answers", !SETUP[7].req(W));
  ["can1k", "cover", "invest"].forEach(k => X("smskip", null, k));
  chk(
    "I'm not sure on the cushion keeps nothing, and the page is full",
    W.o.can1k == null && W.o.cover == null && W.o.invest == null && smCushOk(W) && SETUP[6].req(W)
  );
  /* an amount: the count of the loans */
  W.o.am["d:studentloans.n"] = { v: null, skip: true, lab: "Skipped", cf: 0 };
  chk(
    "not sure how many loans: one line for all of them",
    amDebtLines(W.o).filter(L => L.k === "Student loans").length === 1
  );
  W.step = 6;
  finishSetup();
  const c = C();
  chk("setup ends, and the game has a player", !G.demo && c.placed !== undefined && !!derive(c));
  chk(
    "the profile names the answers that are a Guess of the game (c.x.unsure)",
    ["work", "homeQ", "rel", "can1k", "cover", "invest"].every(k => c.x.unsure.includes(k)) &&
      !c.x.unsure.includes("feel0"),
    (c.x.unsure || []).join()
  );
  chk("nothing made up for the cushion: the stock Guess stays", c.can1k == null && c.cover == null);
  if (SH) closeSheet();
  openSetup("edit");
  chk("Change my answers shows them as not sure still", smState(W).sk.work === true && smState(W).sk.can1k === true);
  closeSheet();

  /* ---- D. the sheet "Who are you looking at?" ---- */
  X("people");
  let h = ov();
  const head = (h.match(/<div class="row between nvhead nvtwo">([\s\S]*?)<\/div>/) || [])[1] || "",
    btns = head.match(/<button[^>]*>/g) || [];
  chk(
    "the sheet header has only Back and Close",
    btns.length === 2 && /data-a="navback"/.test(btns[0]) && /data-a="navclose"/.test(btns[1]),
    btns.join(" ")
  );
  chk(
    "no Home, Menu, Where am I or i in the sheet header, and no second header row",
    !/data-a="(gohome|menu|quest|info)"/.test(head) &&
      !/nvfrom|tdtrack/.test(h) &&
      (h.match(/nvhead/g) || []).length === 1
  );
  chk("with one person the helper line", G.chars.length === 1 && h.includes("Add a person to switch between people."));
  chk(
    "setup done in plain words, and Here now is plain words with a check mark",
    /\d+% of setup done/.test(h) &&
      !/% clear/.test(h) &&
      /<span class="tiny muted prhere">✓ Here now<\/span>/.test(h) &&
      !/class="pill[^"]*">[^<]*Here now/.test(h)
  );
  chk(
    "the sheet only switches people",
    !/Our household|Sharing costs fairly|Kids mode|Your guild|More options|data-a="(profmore|pmode|prm|handoff)"/.test(
      h
    ) && /data-a="addperson"/.test(h)
  );
  const supa0 = { on: SUPA.on, uid: SUPA.uid, email: SUPA.email };
  SUPA.on = true;
  SUPA.uid = null;
  drawSheet();
  chk("signed out: no Sign out button", !/data-a="suout"/.test(ov()));
  SUPA.uid = "user-1";
  SUPA.email = "demo@example.com";
  drawSheet();
  h = ov();
  chk(
    "signed in: Add a person is the one primary, Sign out is the quiet button next to it",
    /<button class="primary" style="flex:1" data-a="addperson">Add a person<\/button><button class="ghost prout" data-a="suout">Sign out<\/button>/.test(
      h
    )
  );
  Object.assign(SUPA, supa0);
  G.chars.push(clone(C()));
  G.chars[1].name = "Sam";
  drawSheet();
  h = ov();
  chk(
    "two people: the count, and Open with the chevron icon",
    h.includes("2 people. Tap a name to switch.") && /Open <i class=chev aria-hidden=true><\/i>/.test(h)
  );
  X("close");
  X("tab", "me");
  h = app();
  chk(
    "Me has Our household, Sharing costs fairly, Kids mode and Your guild",
    ["house", "fair", "kids", "guild"].every(a => h.includes('class="rowbtn" data-a="' + a + '"')) &&
      h.includes("Your people")
  );
  chk("People settings is closed until asked", !/data-a="pmode"/.test(h) && /data-a="ppmore"/.test(h));
  X("ppmore");
  h = app();
  chk(
    "People settings holds what More options held",
    ["pmode", "gh", "prm", "handoff", "pname"].every(a => h.includes('data-a="' + a + '"')) &&
      h.includes("Who you combine money with")
  );
  X("prm", "1");
  chk("Remove someone asks first, on the sheet", W.kind === "people" && W.rm === 1 && /Remove Sam\?/.test(ov()));
  X("prmyes");
  chk("and removes that person", G.chars.length === 1);
  X("close");
  X("ppmore");
  X("tab", "home");

  /* ---- D. styles, and the one chevron ---- */
  const page = read("index.html");
  chk(
    "the sheet covers the tab bar, the top bar is hidden behind it, and no tab is lit while a sheet is open",
    page.includes(".overlay:has(.nvtwo){bottom:0;z-index:40;background:var(--ink)}") &&
      page.includes("body:has(#ov .nvtwo) .topbar{visibility:hidden}") &&
      page.includes("body:has(#ov .overlay) nav.tabs button.on{color:var(--muted);box-shadow:none}")
  );
  chk(
    "the next-step line wraps to two lines",
    /\.prow \.pn \.tiny\{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden\}/.test(
      page
    )
  );
  chk(
    "Where am I has a plain border, and the highlight only as the next step",
    /\.questbtn\{[^}]*border:1px solid var\(--line\)/.test(page) &&
      page.includes(".questbtn.next{border:2px solid var(--a3)}") &&
      !/questbtn [^"]*next"/.test(questButton("slim"))
  );
  chk(
    "the admin row has a solid border",
    page.includes("details.math[data-ao]{border-style:solid;border-color:var(--line)}")
  );
  chk(
    "one chevron style on each page of the game",
    ["index.html", "admin.html", "coach.html", "session.html", "privacy.html", "era/gamelook.css"].every(f =>
      /\.chev,\.chevl[^{]*\{--cv:url\("data:image\/svg\+xml,/.test(read(f))
    )
  );
  const skip = /^(tests|registry|vendor)\/|data\/(skills|skillthemes|quizskins|cards2026)\.js$|CODE-MAP/,
    files = [],
    walk = d =>
      fs.readdirSync(path.join(GAME_DIR, d), { withFileTypes: true }).forEach(e => {
        const f = d ? d + "/" + e.name : e.name;
        if (e.isDirectory()) walk(f);
        else if (/\.(js|html|css)$/.test(f) && !skip.test(f)) files.push(f);
      });
  walk("");
  const typed = files.filter(f => /[‹›]|&lt; Back|&gt;<\/button>|>&lt;<\/button>|&[lr]saquo;/.test(read(f)));
  chk("no typed arrow character in a screen of the game", files.length > 150 && typed.length === 0, typed.join(", "));

  G = clone(G0);
  W = null;
  SH = null;
}
