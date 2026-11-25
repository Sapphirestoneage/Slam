/* ============================================================================
   SLAM the Game, test: tests/roles-and-navigation.js
   PURPOSE     Examine the UX pass, phase 2 (roles, navigation, never trapped): a player sees no coach or admin
               row in the menu, the route guard of the coach page and the admin page, the menu in groups with
               a search and the last 3 tools, the menu button on each sheet, the exact spot of a round that
               the player left, and the database file of the coach rules read as text.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. The database file as text.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: account/roles.js, screens/planner.js, screens/nav.js,
               features/questlog.js, coach.html (through account/coachpage.js), admin.html,
               supabase/migrations/20261125230000_ux_roles_rls.sql.
   ========================================================================= */
{
  const fs = require("fs"),
    read = f => fs.readFileSync(GAME_DIR + f, "utf8");
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    roles0 = Object.assign({}, ROLES),
    rec0 = G.menuRecent;

  /* 8. ROLES */
  const P = { admin: false, coach: false },
    CO = { admin: false, coach: true },
    AD = { admin: true, coach: false };
  chk("a player can use player parts", roCan("player", P) && roCan(null, P));
  chk("a player cannot use coach or admin parts", !roCan("coach", P) && !roCan("admin", P));
  chk("a coach uses coach parts, not admin parts", roCan("coach", CO) && !roCan("admin", CO));
  chk("the admin uses admin and coach parts", roCan("admin", AD) && roCan("coach", AD));
  chk("the route guard sends a player home from the coach page", roGuardTo("coach", P) === "./");
  chk("the route guard sends a coach home from the admin page", roGuardTo("admin", CO) === "./");
  chk("the route guard lets the admin stay", roGuardTo("admin", AD) === null && roGuardTo("coach", AD) === null);
  const pIt = menuItems(P).map(m => m[1]),
    aIt = menuItems(AD).map(m => m[1]);
  chk(
    "a player's menu has no coach or admin row",
    !pIt.some(a => RO_ONLY[a]),
    pIt.filter(a => RO_ONLY[a])
  );
  chk(
    "the admin's menu has the admin rows",
    aIt.includes("built") && aIt.includes("testkit") && aIt.includes("session")
  );
  chk("a player gets no Coach or Admin group", !menuGroups(menuItems(P), P).some(g => g.role));
  chk("the admin gets the Coach and Admin groups", menuGroups(menuItems(AD), AD).filter(g => g.role).length === 2);
  Object.assign(ROLES, P);
  ACT.menu();
  const mh = ov();
  chk(
    "the menu a player sees names no coach or admin page",
    !/data-v="session"|data-v="built"|data-v="testkit"|data-a="hat"|Coach page|admin page/i.test(mh)
  );
  closeSheet();
  /* the coach page itself goes home for a player (account/coachpage.js) and the admin page too (admin.html) */
  chk("the coach page uses the route guard", /roGuardTo\("coach"/.test(read("account/coachpage.js")));
  chk(
    "the admin page sends an account that is not the admin home, with no page of its own",
    /if\(!d\.admin\)\{[^}]*location\.replace\(\(typeof roGuardTo==="function"&&roGuardTo\("admin",d\)\)\|\|"\.\/"\);return\}/.test(
      read("admin.html")
    ) && !/Not the admin/.test(read("admin.html"))
  );

  /* 10. THE MENU */
  const all = menuItems(P),
    gs = menuGroups(all, P);
  chk("the menu has 6 to 8 groups for a player", gs.length >= 6 && gs.length <= 8, gs.length);
  chk(
    "each row is in exactly one group",
    all.every(m => gs.filter(g => g.items.includes(m)).length === 1)
  );
  chk(
    "the groups start closed and open one at a time",
    (mh.match(/<details class="mng" name="mng"/g) || []).length === gs.length &&
      !/class="mng" name="mng"[^>]* open/.test(mh)
  );
  chk(
    "each group shows its icon and its count",
    gs.every(g => mh.includes(g.ico) && mh.includes(`mncount">${g.items.length}`))
  );
  chk(
    "the search box is there with its label",
    /<label class="small" for="mnfind">Find a tool<\/label>/.test(mh) && /placeholder="Find a tool\.\.\."/.test(mh)
  );
  chk(
    "search finds a row by a word of its name",
    menuFind("glossary", all).some(m => m[1] === "glossary")
  );
  chk(
    "search finds a row by a word of the few words under it",
    menuFind("interest", all).some(m => m[1] === "owed")
  );
  chk("an empty search finds nothing (the groups show)", menuFind("  ", all).length === 0);
  chk("search finds no coach row for a player", menuFind("coaching", all).length === 0);
  G.menuRecent = ["owed", "session", "glossary", "quick", "mix"];
  chk(
    "Recently used shows the last 3 the player can see",
    menuRecent(all)
      .map(m => m[1])
      .join() === "owed,glossary,quick"
  );
  G.menuRecent = [];
  X("menugo", "glossary", "act");
  chk("a tool opened from the menu goes first in Recently used", G.menuRecent[0] === "glossary");
  closeSheet();
  X("menugo", "session", "act");
  chk("a coach row opened by a player lands on Home", tab === "home" && !SH && G.menuRecent[0] !== "session");

  /* 9. THE MENU BUTTON ON EACH SHEET, AND THE EXACT SPOT */
  X("glossary");
  chk("a sheet has the menu button", /data-a="menu" aria-label="Menu"/.test(ov()));
  closeSheet();
  const c = Object.assign(newChar(), {
    name: "Spot",
    age: 30,
    work: "Established",
    incKinds: ["A main job"],
    debtKinds: [],
    accts: ["Checking"],
    can1k: "Yes",
    cover: "1 to 3 months",
    invest: "Sometimes",
    home: "Renting",
    payFreq: "Every 2 weeks",
    steady: "Steady",
    placed: true,
  });
  applyTypical(c);
  G.demo = false;
  G.chars.push(c);
  G.active = G.chars.length - 1;
  save();
  X("sharp", "spend");
  const open = W && W.kind === "sharp";
  if (open) {
    W.i = 2;
    W.marker = "left here";
    drawSheet();
  }
  X("tab", "money");
  const S = c.x && c.x.spot;
  chk(
    "leaving a round by a tab keeps the exact spot",
    open && S && S.kind === "sharp" && S.w.i === 2 && S.w.marker === "left here",
    S
  );
  X("tab", "home");
  chk("going to another tab does not change the spot", c.x.spot && c.x.spot.w.i === 2);
  X("questgo", "spend", "sharp");
  chk(
    "Where am I takes the player back to the same spot",
    W && W.kind === "sharp" && W.i === 2 && W.marker === "left here",
    W && { k: W.kind, i: W.i }
  );
  closeSheet();
  chk(
    "a spot of a finished round is not used",
    (() => {
      c.x.spot = { kind: "nope", v: "", w: { kind: "nope", i: 9 }, d: todayISO() };
      return questSpotUse("sharp", "spend") === false;
    })()
  );

  /* SERVER SIDE: the file of the coach rules (not applied; the owner runs it) */
  const sql = fs.readFileSync(GAME_DIR + "../supabase/migrations/20261125230000_ux_roles_rls.sql", "utf8");
  chk("the file says it is not applied yet", /NOT APPLIED/.test(sql));
  chk(
    "a coach reads and changes only the games of their own players",
    /create policy "coach reads shared games"[\s\S]*?is_my_player\(owner\)/.test(sql) &&
      /create policy "coach edits shared games"[\s\S]*?with check \(share_with_coach and is_my_player\(owner\)\)/.test(
        sql
      )
  );
  chk(
    "each policy is dropped first, so the file is safe to run two times",
    (sql.match(/drop policy if exists/g) || []).length === (sql.match(/create policy/g) || []).length
  );
  chk("the file grants nothing to a visitor", !/grant [^;]* to anon/i.test(sql));

  /* put the game back */
  G.chars.splice(n0);
  G.active = act0;
  G.demo = demo0;
  G.menuRecent = rec0;
  Object.assign(ROLES, roles0);
  closeSheet();
}
