/* ============================================================================
   SLAM the Game, test: tests/coming-soon.js
   PURPOSE     Examine the card "Coming soon": a tap with no action, an action that throws, a sheet that
               throws while it draws, a main screen that throws, a menu row with no action, and a row of
               "What's built" whose probe fails. Each one must end in the card (or a calm row), never in
               a broken or blank screen. Each stopped error must be in ERRLOG, and the switch of the
               harness must still make a test fail on a real defect.
   INPUT       The game scripts, loaded by harness.cjs. The sample game.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: core/soon.js, and its use in screens/ui.js (the click
               handler, drawSheetBase, render), screens/planner.js (menugo, the menu) and
               features/built.js (the probes).
   ========================================================================= */
{
  const was = SOON_AFTER,
    tab0 = tab,
    isCard = h => /Coming soon/.test(h) && /data-a="soonclose"/.test(h) && clean(h),
    last = () => ERRLOG[ERRLOG.length - 1] || {},
    throws = f => {
      try {
        f();
        return false;
      } catch (e) {
        return true;
      }
    };
  go("home");
  X("close");

  /* 1. The harness is strict: the same defects throw, so each other test file still fails on them. */
  chk("the harness sets the strict switch", was === "now");
  chk(
    "strict: a tap with no action throws",
    throws(() => soonTap("no_such_action_1", {}))
  );
  ACT.soon_test_boom = () => {
    throw new Error("boom in an action");
  };
  chk(
    "strict: an action that throws still throws",
    throws(() => soonTap("soon_test_boom", {}))
  );
  chk(
    "strict: a sheet that throws still throws",
    throws(() =>
      sheet(function soonTestBadSheet() {
        throw new Error("boom in a sheet");
      })
    )
  );
  X("close");
  chk(
    "strict: the errors are recorded all the same",
    last().msg === "boom in a sheet" && /soonTestBadSheet/.test(last().where)
  );
  chk("strict: no card was counted", SOON_N === 0, SOON_N);

  /* 2. As the player has it (the card shows; "none" leaves out the second throw for the console). */
  SOON_AFTER = "none";
  let n = ERRLOG.length;
  chk("a tap with no action returns false", soonTap("no_such_action_2", {}) === false);
  chk("a tap with no action: the card", isCard(ov()), ov().slice(0, 200));
  chk(
    "a tap with no action: one record, with the name",
    ERRLOG.length === n + 1 && /no_such_action_2/.test(last().msg)
  );
  chk("the card has no error text", !/no_such_action_2|Error|undefined/.test(ov()));
  chk("the card has no verdict word", !/broken|failed|wrong|mistake|sorry|oops/i.test(ov()));
  soonTap("soonclose", {});
  chk(
    "the button of the card closes it and shows Home",
    ov() === "" && tab === "home" && app().length > 200 && !/Coming soon/.test(app())
  );

  n = ERRLOG.length;
  chk("an action that throws returns false", soonTap("soon_test_boom", {}) === false);
  chk("an action that throws: the card", isCard(ov()));
  chk(
    "an action that throws: the record names the action",
    ERRLOG.length === n + 1 && last().msg === "boom in an action" && /soon_test_boom/.test(last().where)
  );
  soonTap("soonclose", {});

  ACT.soon_test_ok = () => {
    W = { kind: "soon_test", o: {} };
    sheet(() => head("Test", "A fine sheet"));
  };
  n = ERRLOG.length;
  chk(
    "an action that works returns true, with no card and no record",
    soonTap("soon_test_ok", {}) === true &&
      /A fine sheet/.test(ov()) &&
      !/Coming soon/.test(ov()) &&
      ERRLOG.length === n
  );
  X("close");

  /* a sheet that throws while it draws */
  n = ERRLOG.length;
  sheet(function soonTestBadSheet2() {
    return C().no.such.thing;
  });
  chk("a sheet that throws while it draws: the card, inside the sheet", isCard(ov()) && /class="overlay"/.test(ov()));
  chk(
    "a sheet that throws: the record names the sheet",
    ERRLOG.length > n && /drawSheetBase soonTestBadSheet2/.test(last().where)
  );
  soonTap("soonclose", {});
  chk("the card of a sheet closes", ov() === "");

  /* a sheet that returns nothing */
  sheet(function soonTestEmptySheet() {});
  chk("a sheet that returns no HTML: the card, not the word undefined", isCard(ov()));
  soonTap("soonclose", {});

  /* a main screen that throws */
  const home0 = home;
  n = ERRLOG.length;
  home = () => {
    throw new Error("boom in Home");
  };
  go("home");
  chk("a main screen that throws: the card in the place of the screen", isCard(app()));
  chk(
    "a main screen that throws: recorded",
    ERRLOG.length > n && last().msg === "boom in Home" && /render/.test(last().where)
  );
  home = home0;
  soonTap("soonclose", {});
  chk("after the repair the screen draws again", !/Coming soon/.test(app()) && app().length > 200);

  /* the menu: a row with no action */
  MENU.push(["A part for later", "soon_test_not_built", "act", "A row whose action is not in this version"]);
  X("menu");
  const row = (ov().match(/<button[^>]*data-v="soon_test_not_built".*?<\/button>/) || [""])[0];
  chk("the menu marks a row with no action", /Coming soon/.test(row) && !/caret/.test(row), row);
  const good = (ov().match(/<button[^>]*data-v="glossary".*?<\/button>/) || [""])[0];
  chk("the menu leaves the other rows as they were", /caret/.test(good) && !/Coming soon/.test(good));
  n = ERRLOG.length;
  soonTap("menugo", { dataset: { a: "menugo", k: "act", v: "soon_test_not_built" } });
  chk("a tap on that row: the card", isCard(ov()));
  chk("a tap on that row: recorded", ERRLOG.length === n + 1 && /soon_test_not_built/.test(last().msg));
  soonTap("soonclose", {});
  MENU.pop();

  /* the built list: a probe that fails, and a probe that throws */
  WB.push(["feel", "Soon test: gone", "b", () => WB_HAS("soon_test_not_built"), "", "soon_test_not_built"]);
  WB.push([
    "feel",
    "Soon test: throws",
    "b",
    () => {
      throw new Error("probe");
    },
    "",
    "soon_test_not_built",
  ]);
  const R = btRows(),
    r1 = R.find(r => r.n === "Soon test: gone"),
    r2 = R.find(r => r.n === "Soon test: throws");
  chk(
    "the built list: a failed probe shows as missing, with no button",
    r1 && r1.st === "x" && r1.a === null && /Missing from this version/.test(r1.note)
  );
  chk("the built list: a probe that throws shows as missing, with no button", r2 && r2.st === "x" && r2.a === null);
  X("built");
  chk(
    "the built list draws with those rows",
    /Soon test: gone/.test(ov()) && !/data-a="soon_test_not_built"/.test(ov()) && clean(ov())
  );
  X("close");
  WB.pop();
  WB.pop();
  const mine = btRows().find(r => r.n.startsWith("Coming soon"));
  chk("the built list has the row of this feature, built", mine && mine.st === "b");

  /* "later" (the browser): the card, and the same error is thrown again after it, for the console */
  SOON_AFTER = "later";
  const st0 = setTimeout,
    later = [];
  setTimeout = f => later.push(f);
  soonTap("soon_test_boom", {});
  setTimeout = st0;
  let again = null;
  try {
    later.forEach(f => f());
  } catch (e) {
    again = e;
  }
  chk("in the browser the card shows", isCard(ov()));
  chk(
    "in the browser the same error is thrown again after the card",
    later.length === 1 && again && again.message === "boom in an action"
  );
  SOON_AFTER = "none";
  soonTap("soonclose", {});

  /* A Menu row closes the menu and opens its sheet in one tap. The game's own step back in the browser
     history (for the menu) arrives after that. It must not close the new sheet, and it must not undo a
     move to a different tab. Before 2026-11-25 it did both: each Menu row closed again at once. */
  {
    const h0 = typeof history === "undefined" ? undefined : history,
      pushed = [];
    history = { pushState: st => pushed.push(st), state: null };
    go("home");
    X("glossary");
    UX_BACKS = 1;
    uxPop({ state: { tab: "home" } });
    chk(
      "the game's own step back keeps the sheet that the Menu row opened",
      SH === glossarySheet && /class="overlay"/.test(ov())
    );
    chk("that sheet gets its entry in the history", pushed.length === 1 && pushed[0].sheet === 1 && UX_BACKS === 0);
    uxPop({ state: { tab: "home" } });
    chk("the Back button of the browser still closes the sheet", !SH && ov() === "");
    go("me");
    UX_BACKS = 1;
    uxPop({ state: { tab: "home" } });
    chk(
      "the game's own step back does not undo a Menu row that goes to a tab",
      tab === "me" && pushed.length === 2 && pushed[1].tab === "me"
    );
    uxPop({ state: { tab: "home" } });
    chk("the Back button of the browser still goes to the tab before", tab === "home");
    history = h0;
  }

  /* each tap of the game goes through soonTap */
  const src = require("fs").readFileSync(GAME_DIR + "screens/ui.js", "utf8");
  chk(
    "the click handler sends each tap through soonTap",
    /closest\("\[data-a\]"\);\s*if \(!t \|\| t\.disabled\) return;\s*\/\*[^*]*\*\/\s*soonTap\(t\.dataset\.a, t\);/.test(
      src
    )
  );
  chk("the keyboard handler too", /soonTap\(e\.target\.dataset\.a, e\.target\)/.test(src));

  delete ACT.soon_test_boom;
  delete ACT.soon_test_ok;
  SOON_AFTER = was;
  tab = tab0;
  render();
}
