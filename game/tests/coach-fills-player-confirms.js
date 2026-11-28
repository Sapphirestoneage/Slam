/* ============================================================================
   SLAM the Game, test: tests/coach-fills-player-confirms.js
   PURPOSE     Examine done-for-you setup (run CC-1, item 16, Nov 27 2026): a coach in the game of a client
               reads a made-up CSV file (tests/fixtures/coach-fill-made-up.csv) with the reader of the
               game; Send changes no number of the client and leaves a list; the client sees one line on
               Home and the list "Your coach filled this in. Please confirm."; Confirm, Change (the
               client's own amount, or Keep what I had) and Undo; a confirmed total is Close, never Exact;
               nothing is confirmed without the client's tap; the coach sees no list to confirm; a
               client with costly debt; the test sends nothing to a network address.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. A made-up client. The
               coach is a stand-in: SUPA.as and SUPA.asRole are set by the test, with no sign-in.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/cofill.js, features/import.js (imSheet, imPut,
               ACT.imapply, lootTextImport), features/games2.js (csvRows), screens/ux.js (homeQuadTop),
               account/coachpage.js (the words of the coach page).
   ========================================================================= */
{
  const G0 = clone(G),
    fs = require("fs"),
    as0 = SUPA.as,
    role0 = SUPA.asRole,
    csv = fs.readFileSync(GAME_DIR + "tests/fixtures/coach-fill-made-up.csv", "utf8"),
    text = h =>
      h
        .replace(/<svg[\s\S]*?<\/svg>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " "),
    line = (h, k) => (h.split('data-cf="' + k + '"')[1] || "").split('data-cf="')[0].split('data-fid="cf:did"')[0],
    spend = (c, k) => c.spends.find(s => s.k === k),
    fresh = debt => {
      G = clone(G0);
      G.demo = true;
      W = null;
      SH = null;
      X("start");
      if (debt) {
        sitApply("carddebt");
        X("cbset", "", "", { q: "age", i: 1 });
        X("sitok");
      } else {
        X("wnskip");
        X("cbset", "", "", { q: "age", i: 1 });
        X("cbset", "", "", { q: "spend", i: 2 });
        X("cbset", "", "", { q: "inv", i: 3 });
        X("cbset", "", "", { q: "save", i: 3 });
      }
      X("close");
      X("gohome");
      return C();
    };
  /* no network: a call to fetch from this file is a failed check */
  const fetch0 = global.fetch;
  let sent = 0;
  global.fetch = () => {
    sent++;
    return Promise.reject(new Error("the test sends nothing"));
  };

  /* ---- 1. the made-up file, read by the reader of the game ---- */
  const rows = csvRows(csv),
    R = imRead(rows, {});
  chk("the made-up file reads as 18 lines over 3 months", rows.length === 18 && R.months === 3, [
    rows.length,
    R.months,
  ]);
  chk(
    "the totals of a month: the rent, the food, the transit, the bills; the card payment stays out; the pay is money in",
    R.avg.Home === 1500 &&
      R.avg.Food === 320 &&
      R.avg["Getting around"] === 130 &&
      R.avg["Bills and subscriptions"] === 20 &&
      R.move > 0 &&
      R.income === 3200,
    JSON.stringify(R.avg) + " " + R.move + " " + R.income
  );
  chk("the file has made-up names only", /SAMPLE|QQ MARKET|ZZ TRANSIT/.test(csv) && !/@|\d{9,}/.test(csv));

  [false, true].forEach(debt => {
    const who = debt ? "costly debt: " : "client: ";
    const c = fresh(debt);
    if (debt) chk(who + "the client has a credit card balance", c.debtKinds.includes("Credit card balance"));
    const before = JSON.stringify([c.spends, c.incs]);

    /* ---- 2. the coach, in the game of the client ---- */
    SUPA.as = "made-up-client";
    SUPA.asRole = "coach";
    chk(who + "the coach is in the game of the client", cfCoach());
    go("home");
    chk(
      who + "Home of the coach has the row Fill in from a CSV file",
      /data-a="import2" data-fid="cf:coach"/.test(app()) && !/data-fid="cf:home"/.test(app())
    );
    X("import2");
    chk(who + "the reader takes the file", lootTextImport(csv) === true && W.rows.length === 18);
    Object.keys(W.use).forEach(k => (W.use[k] = true));
    let h = ov();
    chk(
      who + "the button of the coach says Send to confirm, and the line says where the file goes",
      /data-a="imapply">Send to [^<]+ to confirm</.test(h) &&
        /sent nowhere/.test(h) &&
        /No number changes until they tap/.test(h) &&
        !/>Use these numbers</.test(h)
    );
    X("imapply");
    h = ov();
    chk(
      who + "after Send the coach sees what was sent",
      /Sent to confirm/.test(h) && /data-fid="cf:sent"/.test(h) && /Nothing changed in the numbers/.test(h)
    );
    chk(who + "Send changed no number of the client", JSON.stringify([c.spends, c.incs]) === before);
    chk(
      who + "the list waits in the game, marked as the coach's, with the day",
      c.x.cofill &&
        c.x.cofill.by === "coach" &&
        c.x.cofill.d === todayISO() &&
        c.x.cofill.rows.length >= 3 &&
        c.x.cofill.rows.every(r => r.amt > 0 && r.k)
    );
    chk(
      who + "the list holds totals only: no line of the file, no name of a shop",
      !/SAMPLE|QQ MARKET|ZZ TRANSIT|NETFLIX/.test(JSON.stringify(c.x.cofill))
    );
    chk(who + "the coach cannot open the list of the client", (X("close"), X("cfopen"), !W || W.kind !== "cofill"));

    /* ---- 3. the client ---- */
    SUPA.as = null;
    SUPA.asRole = null;
    go("home");
    const n = cfPending(c).length;
    h = app();
    chk(
      who + "Home has one line at the top: Your coach filled this in. Please confirm.",
      (h.match(/data-fid="cf:home"/g) || []).length === 1 &&
        /<b>Your coach filled this in\.<\/b> Please confirm\. \d+ lines wait\./.test(h) &&
        h.indexOf('data-fid="cf:home"') < h.indexOf("<!--homerows-->")
    );
    chk(
      who + "the line of Home does not pulse, and Home has no row for a coach",
      !/class="[^"]*\b(go|cbnext|pulse)\b[^"]*" data-a="cfopen"/.test(h) && !/data-fid="cf:coach"/.test(h)
    );
    X("cfopen");
    h = ov();
    chk(
      who + "the list opens with its title",
      W.kind === "cofill" &&
        /Your coach filled this in\. Please confirm\./.test(text(h)) &&
        /Nothing changes until you tap/.test(h)
    );
    chk(
      who + "each line: the amount of the coach, marked From your coach, what the client has now, Confirm and Change",
      cfPending(c).every(r => {
        const L = line(h, r.k);
        return (
          L.includes(money(r.amt)) &&
          />From your coach</.test(L) &&
          L.includes("You have " + money(r.was) + " now") &&
          /data-a="cfyes"/.test(L) &&
          /data-a="cfchg"/.test(L)
        );
      })
    );
    chk(
      who + "no line says Exact, and the words are clean",
      !/Exact/.test(text(h)) && !/undefined|NaN|\bnull\b|\u2014|mistake|failed|\bbehind\b|off track/.test(text(h))
    );
    chk(who + "opening the list changed no number", JSON.stringify([c.spends, c.incs]) === before);
    /* Confirm one line */
    const food0 = Object.assign({}, spend(c, "Food"));
    X("cfyes", "", "Food");
    chk(
      who + "Confirm writes the total as a Close number (the level of a file), not Exact",
      spend(c, "Food").amt === 320 && spend(c, "Food").s === true && spend(c, "Food").cf === 2
    );
    chk(
      who + "the line is off the list, and the other lines still wait",
      cfPending(c).length === n - 1 && !cfPending(c).some(r => r.k === "Food")
    );
    chk(
      who + "the other numbers did not change",
      spend(c, "Home").amt === JSON.parse(before)[0].find(s => s.k === "Home").amt
    );
    /* Undo */
    chk(
      who + "the sheet offers Undo for the tap",
      /data-fid="cf:did"[\s\S]*data-a="cfundo" data-v="0">Undo</.test(ov())
    );
    X("cfundo", "0");
    chk(
      who + "Undo: the number of before is back, and the line waits again",
      spend(c, "Food").amt === food0.amt && spend(c, "Food").cf === food0.cf && cfPending(c).length === n
    );
    /* Change: my own amount */
    X("cfchg", "", "Home");
    h = ov();
    chk(
      who + "Change opens a box with its label above and the helper line below, and two buttons",
      /<label class="small" for="cfamt">Your own amount, a month<\/label><input id="cfamt" type="text" inputmode="decimal"/.test(
        h
      ) &&
        /data-a="cfmine" data-k="Home">Use my amount</.test(h) &&
        /data-a="cfkeep" data-k="Home">Keep what I had</.test(h)
    );
    X("cfmine", "", "Home");
    chk(
      who + "an empty box is not zero: nothing is written",
      cfPending(c).some(r => r.k === "Home") &&
        spend(c, "Home").amt === JSON.parse(before)[0].find(s => s.k === "Home").amt
    );
    W.o.amt = "1450";
    X("cfmine", "", "Home");
    chk(
      who + "Use my amount writes the client's own amount",
      spend(c, "Home").amt === 1450 && spend(c, "Home").cf === 2 && !cfPending(c).some(r => r.k === "Home")
    );
    /* Keep what I had */
    const ga0 = spend(c, "Getting around").amt;
    X("cfchg", "", "Getting around");
    X("cfkeep", "", "Getting around");
    chk(
      who + "Keep what I had: the line goes, and the number stays",
      spend(c, "Getting around").amt === ga0 && !cfPending(c).some(r => r.k === "Getting around")
    );
    /* the rest */
    cfPending(c)
      .map(r => r.k)
      .forEach(k => X("cfyes", "", k));
    h = ov();
    chk(
      who + "with every line done the list is gone from the game, and the sheet says Recalculating",
      !c.x.cofill &&
        /That is every line\. Recalculating/.test(h) &&
        /class="primary wide" data-a="cfdone">Done</.test(h)
    );
    X("cfdone");
    go("home");
    chk(who + "Home no longer has the line", !/data-fid="cf:home"/.test(app()));
    chk(
      who + "the engine uses the confirmed numbers",
      Number.isFinite(derive(c).fiSpend) && spend(c, "Food").amt === 320
    );
  });

  /* ---- 4. the admin as the sender, and a second file ---- */
  const c = fresh(false);
  SUPA.as = "made-up-client";
  SUPA.asRole = "admin";
  X("import2");
  lootTextImport(csv);
  Object.keys(W.use).forEach(k => (W.use[k] = true));
  W.use.Food = false;
  X("imapply");
  chk(
    "a line the sender switched off is not sent",
    !c.x.cofill.rows.some(r => r.k === "Food") && c.x.cofill.by === "admin"
  );
  X("close");
  X("import2");
  lootTextImport(csv);
  Object.keys(W.use).forEach(k => (W.use[k] = true));
  X("imapply");
  chk(
    "a second file replaces a line that waits, and adds the new one",
    c.x.cofill.rows.filter(r => r.k === "Home").length === 1 && c.x.cofill.rows.some(r => r.k === "Food")
  );
  X("close");
  SUPA.as = null;
  SUPA.asRole = null;
  go("home");
  chk(
    "sent by the admin, the line of Home names the person who runs SLAM",
    /The person who runs SLAM filled this in\./.test(app())
  );

  /* ---- 5. the words of the coach page, the built list, no network ---- */
  const cp = fs.readFileSync(GAME_DIR + "account/coachpage.js", "utf8");
  chk(
    "the coach page says how, and that PDF files are not read yet",
    /Done-for-you setup\./.test(cp) && /Fill in from a CSV file/.test(cp) && /\(PDF\) are not read yet/.test(cp)
  );
  chk(
    "the built list has the row, marked partly, and its probe passes",
    WB.some(r => /^Done-for-you setup/i.test(r[1]) && r[2] === "p" && r[3]() === true)
  );
  chk(
    "the file of the feature calls no network address",
    !/fetch\(|XMLHttpRequest|\.rpc\(|supabase\.co/.test(fs.readFileSync(GAME_DIR + "features/cofill.js", "utf8"))
  );
  chk("the test sent nothing", sent === 0, sent);

  global.fetch = fetch0;
  SUPA.as = as0;
  SUPA.asRole = role0;
  G = G0;
  W = null;
  SH = null;
}
