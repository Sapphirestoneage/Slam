/* ============================================================================
   SLAM the Game, test: tests/pre-call-intake.js
   PURPOSE     Examine run CC-1, item 11 (Nov 27 2026): the form before a first call (intake/). The page
               asks the questions of the demo Find your era with one script (era/era.js), has the look
               of the game, the TEST BUILD strip and Home, holds no account code, no name and no code of
               a coach, and passes the invite mark ?coach=1 on. The answers come into the game with the
               mark of a lead: the profile keeps c.x.lead, and the sign-up screen is asked for. The
               coach page shows the flag "New lead" until the coach marks the client as seen, and gives
               the link of the form. For a lead who owes nothing and one with costly debt.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. intake/intake.js and
               account/coachpage.js, loaded here. A stand-in for the browser storage. Made-up leads.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/erain.js (erPack, erLead, erUnpack, erIn),
               intake/index.html, intake/intake.js (inInvited, inTo, ERA_PAGE), era/era.js (ERA_P),
               account/coachpage.js (cpClient, cpLead, cpClientCard, cpIntakeUrl), account/door.js (DOOR).
   ========================================================================= */
(async () => {
  const fs = require("fs"),
    vm = require("vm"),
    read = f => fs.readFileSync(GAME_DIR + f, "utf8"),
    G0 = clone(G),
    ls0 = global.localStorage,
    box = {},
    store = {
      getItem: k => (k in box ? box[k] : null),
      setItem: (k, v) => (box[k] = String(v)),
      removeItem: k => delete box[k],
      key: i => Object.keys(box)[i] || null,
      get length() {
        return Object.keys(box).length;
      },
    },
    day = todayISO(),
    FULL = { age: 2, spend: 2, inv: 3, save: 3, cush: "1 to 3 months", debts: [], tax: "some" },
    DEBT = Object.assign({}, FULL, { cush: "no1k", debts: ["Credit card balance"] });

  /* ---- 1. THE TEXT WITH THE MARK OF A LEAD ---- */
  const plain = erPack(FULL, day),
    lead = erPack(FULL, day, true);
  chk("the demo writes no mark", !/lead/.test(plain) && erLead(plain, day) === false);
  chk(
    "the form writes the mark, and nothing else changes",
    JSON.parse(lead).lead === 1 &&
      erLead(lead, day) === true &&
      JSON.stringify(erUnpack(lead, day)) === JSON.stringify(erUnpack(plain, day))
  );
  chk("an old text is no lead", erLead(erPack(FULL, "2026-01-01", true), day) === false && erLead("x", day) === false);
  chk("the text holds no amount of money and no name", !/\$|name|email/.test(lead));

  /* ---- 2. THE PAGE ---- */
  const page = read("intake/index.html"),
    js = read("intake/intake.js"),
    era = read("era/era.js"),
    scripts = (page.match(/<script src="[^"]+"/g) || []).map(s => s.slice(13, -1));
  chk(
    "the page asks with the script of the demo: no second copy of the questions",
    scripts.includes("../era/era.js") && scripts.includes("../features/erain.js") && !/ER_QS\s*=|CB_RNG\s*=/.test(js)
  );
  chk(
    "intake.js loads before era.js",
    scripts.indexOf("intake.js") >= 0 && scripts.indexOf("intake.js") < scripts.indexOf("../era/era.js")
  );
  chk(
    "the page has the look of the game and the TEST BUILD strip",
    page.includes('href="../era/gamelook.css"') &&
      scripts.includes("../core/testbuild.js") &&
      scripts.indexOf("../core/report.js") < scripts.indexOf("../core/testbuild.js")
  );
  chk(
    "the page has no account code and makes no request of its own",
    !/supabase|supa\.js|fetch\(|XMLHttpRequest/.test(page + js.replace(/\/\*[\s\S]*?\*\//g, ""))
  );
  chk(
    "the page holds no name and no code of a coach",
    !/eli|coach_id|invite_code|@/i.test(js.replace(/\/\*[\s\S]*?\*\//g, ""))
  );
  chk("search engines are asked to pass it over", /<meta name="robots" content="noindex">/.test(page));
  chk(
    "Home is on each screen: the top row of the demo",
    /id="exit" href="\.\.\/"/.test(era) && /eraTop\(\) \+/.test(js)
  );
  chk(
    "each file every script names is there",
    scripts.every(s => fs.existsSync(require("path").join(GAME_DIR, "intake", s))),
    scripts
  );
  global.location = global.location || { search: "" };
  vm.runInThisContext(js, { filename: "intake/intake.js" });
  chk(
    "the invite mark is read from the address",
    inInvited("?coach=1") === true && inInvited("?coach=0") === false && inInvited("") === false
  );
  chk(
    "the last button opens the game, and passes the invite mark on",
    inTo("?coach=1") === "../?coach=1" && inTo("?x=1") === "../"
  );
  chk(
    "the page tells era.js its words, its last screen and the mark",
    ERA_PAGE.lead === true &&
      typeof ERA_PAGE.result === "function" &&
      ERA_PAGE.hero.length === 2 &&
      /Nothing is sent/.test(ERA_PAGE.foot)
  );
  chk(
    "era.js is the demo when no page sets it",
    /ERA_P\.result \? ERA_P\.result\(list\) : eraResult\(list\)/.test(era) &&
      /ERA_P\.to \? ERA_P\.to\(\) : "\.\.\/"/.test(era) &&
      /erPack\(ERA\.A, undefined, !!ERA_P\.lead\)/.test(era)
  );
  chk("the words of the form: no em dash, no verdict word", !/\u2014|mistake|failed|behind|off track/i.test(js));

  /* ---- 3. INTO THE GAME ---- */
  global.localStorage = store;
  for (const [who, A] of [
    ["owes nothing: ", FULL],
    ["costly debt: ", DEBT],
  ]) {
    G = clone(G0);
    G.demo = true;
    W = null;
    SH = null;
    DOOR.want = "";
    box[ER_KEY] = erPack(A, day, true);
    X("start");
    const c = C();
    chk(
      who + "the profile is made from the answers, with no question asked again",
      !G.demo && c.x.cb && !W,
      W && W.kind
    );
    chk(
      who + "the profile keeps the mark of a lead",
      c.x.lead && c.x.lead.d === day && c.x.lead.from === "intake",
      c.x.lead
    );
    chk(who + "the sign-up screen is asked for", DOOR.want === "new", DOOR.want);
    chk(who + "the text is used one time", !(ER_KEY in box));
    if (A.debts.length) chk(who + "the debt kind came in", c.debtKinds.includes("Credit card balance"));
  }
  /* the demo makes no lead and asks for no sign-up */
  G = clone(G0);
  G.demo = true;
  W = null;
  SH = null;
  DOOR.want = "";
  box[ER_KEY] = erPack(FULL, day);
  X("start");
  chk("the demo: no mark, no sign-up screen", !G.demo && !C().x.lead && DOOR.want === "");
  const leadGame = (() => {
    G = clone(G0);
    G.demo = true;
    W = null;
    SH = null;
    box[ER_KEY] = erPack(DEBT, day, true);
    X("start");
    return clone(G);
  })();
  DOOR.want = "";
  global.localStorage = ls0;

  /* ---- 4. THE COACH PAGE ---- */
  if (typeof CP === "undefined")
    vm.runInThisContext(read("account/coachpage.js"), { filename: "account/coachpage.js" });
  const cl = cpClient("owner-1", { g: leadGame, at: new Date().toISOString() }),
    old = cpClient("owner-2", {
      g: clone(
        G0.demo
          ? Object.assign(clone(leadGame), { chars: leadGame.chars.map(c => Object.assign(clone(c), { x: {} })) })
          : G0
      ),
      at: null,
    });
  chk("the client of the roster carries the day of the form", cl.people[0].lead === day);
  chk("a new lead: the flag shows", cpLead(cl, null) === day);
  chk("after Mark as seen: no flag", cpLead(cl, { seenAt: "2026-11-27" }) === "");
  chk("a client with no form: no flag", cpLead(old, null) === "");
  CP.notes = [];
  CP.open = null;
  let h = cpClientCard(cl);
  chk(
    "the card says New lead, in amber, and how to take it off",
    /<span class="pill amber" data-lead="1">New lead<\/span>/.test(h) &&
      /<div class="flag" data-lead="1">New lead: filled the form before your call/.test(h) &&
      /Mark as seen/.test(h)
  );
  CP.notes = [{ kind: "seen", client: "owner-1", at: "2026-11-27T10:00:00Z", body: "{}" }];
  h = cpClientCard(cl);
  chk("the coach looked: the card has no flag of a lead", !/data-lead/.test(h));
  CP.notes = [];
  chk("a card with no lead has no such flag", !/data-lead/.test(cpClientCard(old)));
  chk("no red, no verdict word on the card", !/mistake|failed|behind|off track/i.test(cpClientCard(cl)));
  chk(
    "the link of the form is the game's page intake/ with the invite mark",
    cpIntakeUrl("https://play.example/game/coach.html") === "https://play.example/game/intake/?coach=1"
  );
  chk(
    "the coach page shows the link, closed by default",
    /<details class="card" data-intake="1"><summary>Form before a first call<\/summary>/.test(
      read("account/coachpage.js")
    )
  );
  /* a player never sees it: the game has no word of the flag */
  chk(
    "the game's own screens have no New lead",
    !/New lead/.test(read("features/erain.js").replace(/\/\*[\s\S]*?\*\//g, "")) &&
      !/New lead/.test(read("screens/ui.js"))
  );
  G = G0;
})();
