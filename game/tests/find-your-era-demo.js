/* ============================================================================
   SLAM the Game, test: tests/find-your-era-demo.js
   PURPOSE     Examine the 60-second demo Find your era (run CC-1, item 7, Nov 27 2026): the era of the
               demo is the era of derive(), the one rule of the game, and it equals the era that the
               game shows after the answers came in; the text under the one storage key; erIn() (the
               part of cbStart that fills the answers in); a costly-debt answer set; the eras that the
               taps can reach; the page files (no dollar amount written by hand, nothing sent, relative
               links); the generated copy era/gamecopy.js.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. Made-up answers.
               The files of game/era/.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/erain.js, features/couldbe.js (cbStart), era/era.js,
               era/index.html, era/print.html, era/gamecopy.js, tools/game_era_build.mjs.
   ========================================================================= */
{
  const G0 = clone(G),
    fs = require("fs"),
    path = require("path"),
    vm = require("vm"),
    cp = require("child_process"),
    ROOT = path.join(GAME_DIR, ".."),
    read = f => fs.readFileSync(path.join(GAME_DIR, f), "utf8"),
    T = todayISO(),
    /* a stand-in for the device storage that keeps what it gets */
    box = {},
    store = {
      getItem: k => (k in box ? box[k] : null),
      setItem: (k, v) => (box[k] = String(v)),
      removeItem: k => delete box[k],
    },
    newGame = () => {
      G = clone(G0);
      G.demo = true;
      W = null;
      SH = null;
    },
    /* a new player arrives with these answers of the demo and taps Start */
    arrive = A => {
      newGame();
      box[ER_KEY] = erPack(A);
      X("start");
      X("wnskip"); /* What you want (run SLAM-ONBOARD-1) comes first: Skip for now */
      return C();
    },
    FULL = { age: 2, spend: 2, inv: 3, save: 3, cush: "1 to 3 months", debts: ["Credit card balance"], tax: "some" };
  localStorage = store;

  /* ---- 1. one era rule ---- */
  const src = read("features/erain.js"),
    code = src.replace(/\/\*[\s\S]*?\*\//g, "");
  chk("erain.js works the era out with derive()", /const d = derive\(c\)/.test(code));
  chk(
    "erain.js has no gate of its own (no d.g, no rawEra, no 1000 in a comparison)",
    !/\bd\.g\b|rawEra|[<>]=?\s*1000/.test(code)
  );
  let R = erResult(FULL);
  chk("the era of the demo is derive() on the profile of the demo", R.era === derive(erProfile(FULL)).era, R.era);
  chk("the result is a Guess, with no verdict", R.st === "Guess");

  /* ---- 2. the demo and the game give the same era, for many answer sets ---- */
  const sets = [];
  [0, 4, 9].forEach(age =>
    [0, 3, 6].forEach(spend =>
      [0, 1, 4, 7].forEach(inv =>
        ["no1k", "Less than a month", "Longer than 6 months"].forEach(cush =>
          [[], ["Credit card balance"], ["Student loans", "Car loan"]].forEach(debts =>
            sets.push({
              age,
              spend,
              inv,
              save: (age + spend + inv) % 7,
              cush,
              debts,
              tax: ["yes", "some", "no"][inv % 3],
            })
          )
        )
      )
    )
  );
  let diff = [],
    names = [];
  sets.forEach(A => {
    const r = erResult(A),
      c = arrive(A),
      d = derive(c);
    if (d.era !== r.era || eraName(d) !== r.name)
      diff.push(JSON.stringify(A) + " demo " + r.name + " game " + eraName(d));
    if (!names.includes(r.name)) names.push(r.name);
  });
  chk(
    sets.length + " answer sets: the game shows the era that the demo showed",
    diff.length === 0,
    diff.slice(0, 3).join(" | ")
  );
  chk(
    "the eras that the taps reach in these sets",
    ["Ground Floor", "Digging Out", "Buffer", "Free Money", "Debt Free", "Fortress"].every(n => names.includes(n)),
    names.join(", ")
  );
  /* a long way in: a lot invested, low spending, a full cushion, full tax-friendly accounts */
  R = erResult({ age: 2, spend: 0, inv: 7, save: 4, cush: "Longer than 6 months", debts: [], tax: "yes" });
  chk("much invested and low spending: a late era, from the same rule", R.era >= 7, R.name);
  chk("the last era that a tap reaches has a next move, or none at the end", R.next === null || !!R.next.t);
  let c = arrive({ age: 2, spend: 0, inv: 7, save: 4, cush: "Longer than 6 months", debts: [], tax: "yes" });
  chk("and the game shows that late era too", derive(c).era === R.era, derive(c).era + " " + R.era);

  /* ---- 3. the same demo math with no game around it: engine.js, the copy, erain.js ---- */
  const ctx = vm.createContext({ console });
  vm.runInContext(
    ["core/engine.js", "era/gamecopy.js", "features/erain.js"].map(read).join("\n") +
      "\n;globalThis.OUT = A => { const r = erResult(A); return { era: r.era, name: r.name, next: r.next && r.next.t, labels: CB_QS.map(Q => CB_RNG[Q.id].map((x, i) => cbLab(Q.id, i))) }; };",
    ctx
  );
  diff = sets.filter(A => {
    const a = ctx.OUT(A),
      b = erResult(A);
    return a.era !== b.era || a.name !== b.name || a.next !== (b.next && b.next.t);
  });
  chk(
    "the page (three scripts, no game) gives the same era and move as inside the game",
    diff.length === 0,
    diff.length
  );
  chk(
    "the chips of the page have the labels of the game's entry",
    JSON.stringify(ctx.OUT(FULL).labels) === JSON.stringify(CB_QS.map(Q => CB_RNG[Q.id].map((x, i) => cbLab(Q.id, i))))
  );

  /* ---- 4. the one storage key ---- */
  const P = JSON.parse(erPack(FULL));
  chk("the key is slam.era, version 1", ER_KEY === "slam.era" && ER_V === 1 && P.v === 1);
  chk("the text has v, at and a, and nothing else", Object.keys(P).sort().join() === "a,at,v" && P.at === T);
  chk(
    "a holds the seven answers as taps: chip numbers, one id, names",
    JSON.stringify(P.a) === JSON.stringify(FULL),
    JSON.stringify(P.a)
  );
  chk("no amount of money is in the text", !/\$|"v":\s*\d{3,}/.test(erPack(FULL)));
  chk(
    "unknown parts are left out",
    JSON.stringify(
      erClean({ age: 1, spend: 99, inv: "2", cush: "nope", debts: ["Yacht loan", "Car loan"], tax: "maybe", name: "x" })
    ) === JSON.stringify({ age: 1, debts: ["Car loan"] })
  );
  chk("the same day is read", JSON.stringify(erUnpack(erPack(FULL))) === JSON.stringify(FULL));
  chk("the day after is read", !!erUnpack(erPack(FULL, addDays(T, -1))));
  chk("an old text is passed over", erUnpack(erPack(FULL, addDays(T, -3))) === null);
  chk("a text of a later version is passed over", erUnpack(JSON.stringify({ v: 2, at: T, a: FULL })) === null);
  chk("a text that is not JSON is passed over", erUnpack("hello") === null && erUnpack(null) === null);

  /* ---- 5. erIn(): the answers come into the game ---- */
  newGame();
  X("start");
  X("wnskip"); /* What you want (run SLAM-ONBOARD-1) comes first: Skip for now */
  X("cbset", "", "", { q: "age", i: 2 });
  X("cbset", "", "", { q: "spend", i: 2 });
  X("cbset", "", "", { q: "inv", i: 3 });
  X("cbset", "", "", { q: "save", i: 3 });
  const tapped = JSON.stringify(C());
  c = arrive({ age: 2, spend: 2, inv: 3, save: 3 });
  /* the ids of the first week's steps are random, and two fields hold the time of the clock */
  const same = t =>
    t
      .replace(/"id":"pl[a-z0-9]+"/g, '"id":""')
      .replace(/"mod":\d+/, '"mod":0')
      .replace(/"t":"[^"]*Z"/g, '"t":""');
  chk(
    "four answers from the demo make the profile that four taps in the entry make",
    same(JSON.stringify(c)) === same(tapped)
  );
  chk(
    "the game is a real game now, and the flow goes on at What it is",
    !G.demo && W && W.kind === "cb" && W.step === "is",
    W && W.kind + " " + W.step
  );
  chk("the entry is not asked again", !/Question 1 of/.test(ov()) && /What it is/.test(ov()));
  chk("the key is removed after one use", !(ER_KEY in box));
  /* run SLAM-ONBOARD-1: a demo visitor sees What you want first, and the picks become goals */
  newGame();
  box[ER_KEY] = erPack({ age: 2, spend: 2, inv: 3, save: 3 });
  X("start");
  chk("a demo visitor sees What you want first, and the key waits", G.demo && W.step === "wants" && ER_KEY in box);
  X("wnpick", "home");
  X("wnnext");
  chk(
    "after it the four questions are passed over, and the pick is a goal",
    !G.demo &&
      W.kind === "cb" &&
      W.step === "is" &&
      C()
        .goals.map(g => g.n)
        .join() === "Buy a home" &&
      !(ER_KEY in box),
    W.kind + " " + W.step
  );
  c = arrive(FULL);
  chk(
    "the setup answers of the demo are on the profile",
    c.can1k === "Yes" &&
      c.cover === "1 to 3 months" &&
      c.debtKinds.join() === "Credit card balance" &&
      c.tax === "some",
    [c.can1k, c.cover, c.debtKinds, c.tax].join("|")
  );
  chk(
    "the four answers of the flow are on the profile",
    [2, 2, 3, 3].join() === CB_QS.map(Q => c.x.cb.a[Q.id].i).join()
  );
  chk("the sheet has no undefined and no NaN", clean(ov()), junk(ov()));
  /* a part only: the entry opens at the first open question */
  newGame();
  box[ER_KEY] = erPack({ age: 4, spend: 1 });
  X("start");
  X("wnskip"); /* What you want (run SLAM-ONBOARD-1) comes first: Skip for now */
  chk(
    "two answers: the entry opens at question 3, and the game is still new",
    G.demo && W.kind === "cb" && W.q === 2 && /Question 3 of/.test(ov()),
    W.q
  );
  chk("the two answers are filled in", W.o.a.age.i === 4 && W.o.a.spend.i === 1 && W.o.a.age.cf === 1);
  /* nothing to carry: the entry starts at question 1 */
  newGame();
  X("start");
  X("wnskip"); /* What you want (run SLAM-ONBOARD-1) comes first: Skip for now */
  chk("no key: the entry starts at question 1", W.kind === "cb" && W.step === "entry" && /Question 1 of/.test(ov()));
  /* a player with a game is left alone */
  c = arrive(FULL);
  const mine = JSON.stringify(C());
  box[ER_KEY] = erPack({ age: 9, spend: 6, inv: 7, save: 6 });
  chk("an existing game: erIn does nothing", erIn() === false && JSON.stringify(C()) === mine && ER_KEY in box);
  delete box[ER_KEY];

  /* ---- 6. costly debt ---- */
  R = erResult({ age: 2, spend: 2, inv: 2, save: 2, cush: "1 to 3 months", debts: ["Credit card balance"], tax: "no" });
  chk(
    "a card balance is costly debt on the profile",
    R.c.high === "yes" && R.c.debts[0].high === true && R.c.debts[0].s === false
  );
  chk("costly debt: the era is Free Money", R.name === "Free Money" && R.era === 2, R.name);
  chk(
    "costly debt: the move is the key step of Debt Free",
    R.next.id === "cd_gone" && R.next.t === NODES.find(n => n.id === "cd_gone").n && R.next.opens === "Debt Free",
    JSON.stringify(R.next)
  );
  R = erResult({ age: 2, spend: 2, inv: 2, save: 2, cush: "1 to 3 months", debts: ["Student loans"], tax: "no" });
  chk(
    "a student loan alone is not costly debt: the era is Debt Free",
    R.c.high === "no" && R.name === "Debt Free",
    R.name
  );
  R = erResult({
    age: 2,
    spend: 2,
    inv: 0,
    save: 0,
    cush: "no1k",
    debts: ["Credit card balance", "Payday loan or cash advance"],
  });
  chk(
    "below zero with no cushion: Digging Out, and the move is the first cushion",
    R.name === "Digging Out" && R.next.id === "sf_little",
    R.name
  );
  R = erResult({ age: 2, spend: 2, inv: 0, save: 0, cush: "no1k", debts: [] });
  chk(
    "nothing owed and no cushion: Ground Floor, with no line about owing",
    R.name === "Ground Floor" && R.one === "" && R.is.length === 0
  );
  chk("no answer of the entry: no result", erResult({ age: 1 }) === null);
  chk(
    "the tax question is asked only with something invested",
    erAsked({ inv: 0 }).length === 6 && erAsked({ inv: 2 }).length === 7 && erAsked({}).length === 6
  );

  /* ---- 7. the files of the page ---- */
  const page = read("era/index.html"),
    view = read("era/era.js"),
    print = read("era/print.html"),
    mineFiles = {
      "era/index.html": page,
      "era/era.js": view,
      "era/print.html": print.replace(/<svg[\s\S]*?<\/svg>/g, ""),
      "features/erain.js": src,
    };
  Object.keys(mineFiles).forEach(f => {
    const s = mineFiles[f];
    chk(f + ": no dollar amount written by hand", !/\$\s?\d/.test(s), (s.match(/.{20}\$\s?\d.{10}/) || [""])[0]);
    chk(f + ": no em dash", !s.includes(String.fromCharCode(0x2014)));
    chk(
      f + ": nothing is sent (no fetch, no beacon, no form, no tracker)",
      !/fetch\(|XMLHttpRequest|sendBeacon|<form|gtag|analytics|WebSocket/i.test(s.replace(/\/\*[\s\S]*?\*\//g, ""))
    );
  });
  chk(
    "the page loads its scripts and links by relative addresses only",
    !/(src|href)="(https?:)?\/\//.test(page) && !/(src|href)="\//.test(page)
  );
  chk(
    "the page loads the engine of the game, not a copy of it",
    /<script src="\.\.\/core\/engine\.js"><\/script>/.test(page) &&
      /<script src="\.\.\/features\/erain\.js"><\/script>/.test(page)
  );
  chk("the button goes to the game by a relative address", /location\.href = "\.\.\/"/.test(view));
  chk(
    "the line Education, not advice is the one line of trust.js",
    /TRUST_LINE/.test(view) && !/not financial advice/i.test(view + page)
  );
  chk("a tap, not a typed answer: the page has no input field", !/<input|<textarea|<select/i.test(page + view));
  const r = cp.spawnSync(process.execPath, [path.join(ROOT, "tools", "game_era_build.mjs"), "--check"], {
    encoding: "utf8",
  });
  chk("era/gamecopy.js is current (node tools/game_era_build.mjs)", r.status === 0, (r.stderr || "").trim());
  chk(
    "the print page names the demo's address in words and holds one QR picture",
    /play\.stresslessaboutmoney\.com\/game\/era\//.test(print) && (print.match(/<svg/g) || []).length === 1
  );

  G = clone(G0);
  W = null;
  SH = null;
}
