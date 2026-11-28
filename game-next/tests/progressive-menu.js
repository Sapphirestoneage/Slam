/* ============================================================================
   SLAM the Game, test: tests/progressive-menu.js
   PURPOSE     Examine the progressive menu (run CC-1, item 13, Nov 27 2026): a new player sees the short menu
               (the core rows, Settings and account whole, no Tool library); a row that is used from the menu
               or from any other screen stays; the reveal and the end of the first week unlock rows; "Show
               everything" gives the whole menu and "Show the short menu" goes back; Expert has the whole
               menu; a game from before the feature, the demo, a coach and the admin have the whole menu;
               a player never sees a row of a coach or of the admin in any state; Find a tool reaches each
               row. One function decides (fwRowRule).
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. Made-up players, one of
               them with costly debt (the door In debt).
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/firstweek.js (fwRowRule, fwMenuState, fwMenuPick,
               fwUsed, fwMenu, fwMenuInfo, the action fwall), screens/planner.js (menuItems, menuGroups,
               menuFind), account/roles.js (ROLES).
   ========================================================================= */
{
  const G0 = clone(G),
    FROM0 = FW_MENU.from,
    R0 = Object.assign({}, ROLES),
    T = todayISO(),
    rows = h =>
      (h.match(/data-a="menugo" data-k="(?:act|tab)" data-v="([A-Za-z0-9_]+)"/g) || []).map(x =>
        x.split('data-v="')[1].slice(0, -1)
      ),
    menu = () => {
      X("menu");
      const h = ov();
      X("close");
      return h;
    },
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
    },
    first = d => G.chars.forEach(c => (c.hist[0].d = d)),
    inSet = id => MENU_GROUPS.find(g => g[0] === "settings")[3].includes(id);

  /* ---- 1. the rule, by itself ---- */
  const S = { short: true, seen: {}, rev: false, weekOver: false };
  chk("with the short menu off each row shows", fwRowRule("xray", "tools", { short: false }) === "all");
  chk(
    "a core row shows from the first day",
    FW_CORE.every(id => fwRowRule(id, "money", S) === "core")
  );
  chk("each row of Settings and account shows", fwRowRule("flag", "settings", S) === "core");
  chk("another row waits", fwRowRule("xray", "tools", S) === "");
  chk("a row that was used shows", fwRowRule("xray", "tools", Object.assign({}, S, { seen: { xray: 1 } })) === "used");
  chk(
    "the reveal unlocks the rows it leads to, and no other",
    fwRowRule("odds", "plans", Object.assign({}, S, { rev: true })) === "unlocked" &&
      fwRowRule("stress", "plans", Object.assign({}, S, { rev: true })) === ""
  );
  chk(
    "the end of the first week unlocks My money and People and home, and no other group",
    fwRowRule("ledger", "money", Object.assign({}, S, { weekOver: true })) === "unlocked" &&
      fwRowRule("house", "people", Object.assign({}, S, { weekOver: true })) === "unlocked" &&
      fwRowRule("xray", "tools", Object.assign({}, S, { weekOver: true })) === ""
  );
  chk(
    "Report a bug or idea, What's new and Privacy are always in the short menu",
    ["flag", "whatsnew", "tuprivacy"].every(id => {
      const g = MENU_GROUPS.find(x => x[3].includes(id));
      return MENU.some(m => m[1] === id) && fwRowRule(id, g[0], S) === "core";
    })
  );

  /* ---- 2. a new player, and a new player with costly debt: the short menu ---- */
  [false, true].forEach(debt => {
    const who = debt ? "costly debt: " : "new player: ";
    let c = fresh(debt);
    chk(who + "the game has the two menus, and the short one is on", fwMenuState(c).can && fwMenuState(c).short);
    if (debt) chk(who + "the player has a credit card balance", c.debtKinds.includes("Credit card balance"));
    let mh = menu(),
      r = rows(mh);
    const all = menuItems().map(m => m[1]);
    chk(
      who + "the short menu has far fewer rows than the whole menu",
      r.length < all.length / 2 && r.length >= 8,
      r.length + " of " + all.length
    );
    chk(
      who + "each row is a core row, a row of Settings and account, or one that comes back to the bar",
      r.every(id => FW_CORE.includes(id) || inSet(id) || ["goals", "me", "fwlog", "addperson"].includes(id)),
      r.join(",")
    );
    chk(
      who + "Report a bug or idea, What's new, Privacy and Save my game are in reach",
      ["flag", "whatsnew", "tuprivacy", "backup"].every(id => r.includes(id))
    );
    chk(who + "no Tool library and no group Everything else in the short menu", !/data-g="lib"|data-g="more"/.test(mh));
    chk(
      who + "the line with the i says the menu is short, and one button shows everything with a count",
      /data-fid="fw:where"[\s\S]*short menu/.test(mh) &&
        /data-a="fwall" data-v="1">Show everything \(\d+ more\)</.test(mh)
    );
    chk(
      who + "no row and no group of a coach or of the admin",
      !/data-g="coach"|data-g="admin"|data-v="(session|built|testkit|thinkaloud)"/.test(mh)
    );
    chk(
      who + "Find a tool reaches a row that waits",
      menuFind("x-ray", menuItems()).length > 0 || menuFind("fee", menuItems()).length > 0
    );
    /* a row used from the menu stays */
    chk(who + "the X-ray row waits", !r.includes("xray") && all.includes("xray"));
    fwUsed("menugo", { dataset: { v: "xray" } });
    chk(
      who + "a row opened from the menu stays in the short menu",
      rows(menu()).includes("xray") && G.menuSeen.xray === 1
    );
    /* a row used from another screen stays */
    fwUsed("odds", { dataset: {} });
    chk(who + "a tool opened from another screen stays too", rows(menu()).includes("odds"));
    fwUsed("cbgo", { dataset: {} });
    chk(who + "a tap that is not a menu row is not kept", !G.menuSeen.cbgo);
    /* the reveal unlocks */
    chk(who + "before the reveal the row Your tax view waits", !rows(menu()).includes("taxv"));
    c.x.cb.rev = T;
    chk(
      who + "after the reveal the rows it leads to show",
      ["taxv", "takeout", "values"].every(id => rows(menu()).includes(id))
    );
    /* Show everything, and back */
    X("menu");
    X("fwall", "1");
    mh = ov();
    chk(
      who + "Show everything: each row of the whole menu, the Tool library, and the button back",
      all.every(id => rows(mh).includes(id)) &&
        /data-g="lib"/.test(mh) &&
        /data-a="fwall" data-v="0">Show the short menu</.test(mh) &&
        G.menuAll === true
    );
    chk(
      who + "Show everything: still no row of a coach or of the admin",
      !/data-g="coach"|data-g="admin"|data-v="(session|built|testkit|thinkaloud)"/.test(mh)
    );
    X("fwall", "0");
    chk(
      who + "Show the short menu goes back, and what was used is kept",
      rows(ov()).includes("xray") && !rows(ov()).includes("stress") && G.menuAll === false
    );
    X("close");
    /* Expert */
    G.expert = true;
    mh = menu();
    chk(
      who + "Expert has the whole menu, with no switch",
      all.every(id => rows(mh).includes(id)) && !/data-a="fwall"/.test(mh)
    );
    G.expert = false;
    /* the end of the first week (the day the feature starts moves back, so that this game is still a new one) */
    FW_MENU.from = addDays(T, -30);
    first(addDays(T, -8));
    c.x.cb.rev = addDays(T, -8);
    chk(
      who + "after the first week the short menu stays, with a new line",
      fwMenuState(c).short && fwMenuState(c).weekOver && /A short menu\./.test(menu())
    );
    const money = menuGroups(menuItems())
      .find(g => g.id === "money")
      .items.map(m => m[1]);
    chk(
      who + "after the first week My money shows whole",
      money.every(id => rows(menu()).includes(id))
    );
    chk(who + "after the first week a tool of another group still waits", !rows(menu()).includes("stress"));
    chk(who + "clean copy", !/undefined|NaN|\u2014/.test(menu().replace(/<svg[\s\S]*?<\/svg>/g, "")));
  });

  /* ---- 3. who keeps the whole menu ---- */
  FW_MENU.from = FROM0;
  let c = fresh(false);
  const all = menuItems().map(m => m[1]);
  first(addDays(FROM0, -20));
  chk(
    "a game that started before the feature has the whole menu and no switch",
    !fwMenuState(c).can && all.every(id => rows(menu()).includes(id)) && !/data-a="fwall"/.test(menu())
  );
  first(T);
  ROLES.coach = true;
  let mh = menu();
  chk(
    "a coach has the whole menu, with the group Coach",
    !fwMenuState(c).can && /data-g="coach"/.test(mh) && !/data-a="fwall"/.test(mh)
  );
  ROLES.coach = false;
  ROLES.admin = true;
  mh = menu();
  chk(
    "the admin has the whole menu, with the groups Coach and Admin",
    /data-g="coach"/.test(mh) && /data-g="admin"/.test(mh)
  );
  Object.assign(ROLES, R0);
  G = clone(G0);
  G.demo = true;
  chk("the demo game has the whole menu", !fwMenuState(C()).can);
  chk(
    "the built list has the row, and its probe passes",
    WB.some(r => /progressive menu/i.test(r[1]) && r[2] === "b" && r[3]() === true)
  );
  chk(
    "Me says what Expert does to the menu",
    /shows the whole menu/.test(require("fs").readFileSync(GAME_DIR + "screens/ux.js", "utf8"))
  );

  Object.assign(ROLES, R0);
  G = G0;
  W = null;
  SH = null;
}
