/* ============================================================================
   SLAM the Game, test: tests/first-week.js
   PURPOSE     Examine Batch B, phase 5 (Nov 27 2026), a calmer first week: the rule (the later of 7 days or
               the reveal), the bar of a first-week player (the four allowed places and nothing else), that
               every place a player could reach before is still reachable in the first week (the tabs, each
               row of the menu, the buttons that leave the bars), the menu with its groups inside groups
               and the "i", the Tool library (every page at the top of the repository is in the list or has
               a reason), the return of the tabs with one line "New for you", and no change for an existing
               player or for a coach or admin account.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. Made-up players. The
               names of the pages at the top of the repository.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/firstweek.js, data/toollib.js, screens/ux.js (uxTabs,
               homeQuadTop, renderUxEnd), screens/planner.js (menuSheetBase, menuGroupHtml, menuFindPaint,
               topbarHTML), tools/game_toollib_build.mjs.
   ========================================================================= */
{
  const G0 = clone(G),
    fs = require("fs"),
    path = require("path"),
    ROOT = path.join(GAME_DIR, ".."),
    T = todayISO(),
    ago = n => addDays(T, -n),
    text = h =>
      h
        .replace(/<svg[\s\S]*?<\/svg>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " "),
    junk = h =>
      (text(h).match(/undefined|NaN|\bnull\b|\u2014/g) || [])
        .concat(text(h).match(/mistake|failed|\bbehind\b|off track|should|wasteful|too much|bad\b/gi) || [])
        .join(","),
    bare = h => (text(h).match(/undefined|NaN|\bnull\b|\u2014/g) || []).join(","),
    barTabs = h => (h.match(/data-a="tab" data-v="([a-z]+)"/g) || []).map(x => x.split('data-v="')[1].slice(0, -1)),
    /* the whole menu: this file examines the first week with "Show everything" on (run CC-1, item 13). The short
       menu has its own file, tests/progressive-menu.js */
    menu = () => {
      G.menuAll = true;
      X("menu");
      const h = ov();
      X("close");
      return h;
    },
    fresh = () => {
      G = clone(G0);
      G.demo = true;
      W = null;
      SH = null;
      X("start");
      X("wnskip"); /* What you want (run SLAM-ONBOARD-1): Skip for now */
      X("cbset", "", "", { q: "age", i: 1 });
      X("cbset", "", "", { q: "spend", i: 2 });
      X("cbset", "", "", { q: "inv", i: 3 });
      X("cbset", "", "", { q: "save", i: 3 });
      return C();
    },
    first = d => G.chars.forEach(c => (c.hist[0].d = d));

  /* ---- 1. the rule, by itself ---- */
  const D1 = "2026-03-01",
    day = n => addDays(D1, n - 1);
  let r = fwRule(D1, null, day(1), true);
  chk("the first day is calm, and it is day 1", r.calm && r.day === 1 && r.known, JSON.stringify(r));
  r = fwRule(D1, null, day(7), true);
  chk("day 7 is calm", r.calm && r.day === 7);
  r = fwRule(D1, null, day(8), true);
  chk("day 8 with no reveal stays calm: the reveal is the later of the two", r.calm && r.back === null && r.day === 8);
  r = fwRule(D1, day(8), day(8), true);
  chk("day 8 with the reveal seen that day: every tab is back", !r.calm && r.back === day(8));
  r = fwRule(D1, day(2), day(7), true);
  chk("the reveal on day 2 does not end the week early", r.calm && r.back === day(8), JSON.stringify(r));
  chk("the reveal on day 2: the tabs are back on day 8", !fwRule(D1, day(2), day(8), true).calm);
  r = fwRule(D1, day(12), day(11), true);
  chk("the reveal on day 12: calm on day 11, back on day 12", r.calm && !fwRule(D1, day(12), day(12), true).calm);
  chk(
    "a player who did not come through the flow has no reveal to wait for: 7 days",
    fwRule(D1, null, day(7), false).calm && !fwRule(D1, null, day(8), false).calm
  );
  r = fwRule(null, null, day(3), true);
  chk("no first day: an existing player, never calm", !r.calm && !r.known && r.day === null);
  chk("a first day that is not a day: never calm", !fwRule("soon", null, day(3), false).calm);
  chk("the week is 7 days", FW_DAYS === 7);

  /* ---- 2. a new player on the first day: the four allowed places and nothing else ---- */
  let c = fresh();
  X("gohome");
  let s = fwState(c);
  chk("a new player of the flow is in the first week, day 1", s.calm && s.day === 1, JSON.stringify(s));
  chk("the first day of the game is the first snapshot", fwFirst(G) === T, fwFirst(G));
  let bar = uxTabs(false);
  chk(
    "the bar has Home, Next Steps and My Money, in that order",
    barTabs(bar).join(",") === "home,plan,money",
    barTabs(bar).join(",")
  );
  chk(
    "the fourth place is the flow, and the bar has four buttons only",
    (bar.match(/<button/g) || []).length === 4 && /data-a="cbback"[^>]*>[\s\S]*My number/.test(bar)
  );
  chk("My Goals, Me and + Log are not in the bar", !/data-v="goals"|data-v="me"|data-a="flow"/.test(bar));
  let top = topbarHTML();
  chk(
    "the top bar keeps the menu, Back and Home, and leaves out Safe to spend and Where am I",
    /data-a="menu"/.test(top) &&
      /data-a="navback"/.test(top) &&
      /data-a="gohome"/.test(top) &&
      !/data-a="safe"/.test(top) &&
      !/data-a="quest"/.test(top)
  );
  X("cbback");
  chk("the fourth button opens the flow where the player left off", !!W && W.kind === "cb" && /What it is/.test(ov()));
  X("close");
  X("gohome");
  let home = app();
  chk("Home is clean in the first week", !junk(home) && /cb:home/.test(home), junk(home));
  chk("no note New for you in the first week", !/fw:new/.test(home) && homeFwNote() === "");
  chk("the game notes once that it had the calmer week", !!G.fw && G.fw.on === T && !G.fw.ok);

  /* ---- 3. hide, never delete: every place of before is reachable in the first week ---- */
  const R = fwReach();
  let mh = menu();
  chk("the registry walk is not empty", R.tabs.length === 5 && R.rows.length > 40, R.rows.length);
  const lostTabs = R.tabs.filter(
    t => !barTabs(bar).includes(t) && !new RegExp('data-a="menugo" data-k="tab" data-v="' + t + '"').test(mh)
  );
  chk("each tab is in the bar or is a row of the menu", lostTabs.length === 0, lostTabs.join(","));
  const lostRows = R.rows.filter(a => !new RegExp('data-a="menugo" data-k="(act|tab)" data-v="' + a + '"').test(mh));
  chk("each row of the menu of before is in the menu of the first week", lostRows.length === 0, lostRows.join(","));
  chk(
    "the buttons that left the bars have a row: Log money, Safe to spend, Where am I",
    /data-v="fwlog"/.test(mh) && /data-v="safe"/.test(mh) && /data-v="quest"/.test(mh)
  );
  /* the same walk on the menu of an existing player gives the same rows: nothing is in one menu only */
  first(ago(40));
  const mhOld = menu(),
    rowsOf = h => (h.match(/data-a="menugo" data-k="(?:act|tab)" data-v="[A-Za-z0-9_]+"/g) || []).sort(),
    onlyOld = rowsOf(mhOld).filter(x => !rowsOf(mh).includes(x));
  chk("no row of the menu of an existing player is missing in the first week", onlyOld.length === 0, onlyOld.join(" "));
  first(T);
  /* the rows work */
  X("menugo", "goals", "tab");
  chk("the menu row My Goals opens the tab", tab === "goals" && !junk(app()), junk(app()));
  chk(
    "on a hidden tab the bar is still the bar of the first week",
    barTabs(uxTabs(false)).join(",") === "home,plan,money"
  );
  X("menugo", "me", "tab");
  chk("the menu row Me opens the tab", tab === "me" && !junk(app()), junk(app()));
  X("menugo", "fwlog", "act");
  const logH = ov();
  X("close");
  X("flow", "");
  chk("the menu row Log money opens the sheet of + Log", !!logH && text(logH).slice(0, 60) === text(ov()).slice(0, 60));
  X("close");
  go("goals");
  chk("a link to a hidden tab still opens it", tab === "goals");
  go("home");

  /* ---- 4. the menu of the first week: groups inside groups, the "i", the search ---- */
  const grp = (h, id) => (h.split('data-g="' + id + '"')[1] || "").split(/<details class="mng" name="mng"/)[0];
  chk(
    "the top groups: what comes back, Everything else, Tool library, Settings",
    (mh.match(/<details class="mng" name="mng" data-g="([a-z]+)"/g) || [])
      .map(x => x.split('data-g="')[1].slice(0, -1))
      .join(",") === "later,more,lib,settings",
    (mh.match(/<details class="mng" name="mng" data-g="([a-z]+)"/g) || []).join(" ")
  );
  chk(
    "Everything else holds the groups of the menu, each one a group inside it",
    ["money", "people", "plans", "tools", "learn", "games"].every(g =>
      new RegExp('<details class="mng mng2" name="mng2" data-g="' + g + '"').test(grp(mh, "more"))
    )
  );
  chk("no group starts open", !/<details[^>]* open/.test(mh));
  chk(
    "the group that comes back has My Goals, Me and Log money",
    /My Goals/.test(grp(mh, "later")) && /Log money/.test(grp(mh, "later"))
  );
  chk(
    "the menu has the i that says where everything went",
    /data-fid="fw:where"/.test(mh) && /data-k="term:fwwhere"/.test(mh)
  );
  X("info", "", "term:fwwhere");
  const ih = ov();
  chk(
    "the i names the four places and says nothing was removed",
    /Home, Next Steps, My Money and My number/.test(ih) && /Nothing was removed/.test(ih) && !junk(ih),
    junk(ih)
  );
  X("close");
  /* the menu holds the names of old features (the Mistake audit), so the tone words are read on the new parts */
  chk(
    "the menu of the first week is clean",
    !bare(mh) && !junk(grp(mh, "later")) && !junk(mh.split("<details")[0]),
    bare(mh)
  );
  chk(
    "Find a tool finds what left the bar",
    menuFind("goals", menuItems().concat(fwMenuExtra())).some(m => m[1] === "goals") &&
      menuFind("log money", menuItems().concat(fwMenuExtra())).some(m => m[1] === "fwlog")
  );
  chk("no coach or admin row for a player", !/data-g="coach"|data-g="admin"|data-a="hat"/.test(mh));

  /* ---- 5. the Tool library: the pages at the top of the repository ---- */
  const pages = fs.readdirSync(ROOT).filter(f => /\.html$/.test(f)),
    listed = TOOL_LIB.map(x => x[0]),
    heldAll = JSON.parse(
      require("child_process").execFileSync("node", [path.join(ROOT, "tools", "game_toollib_build.mjs"), "--held"], {
        encoding: "utf8",
      })
    ),
    heldOut = heldAll.why,
    held = Object.keys(heldOut),
    lost = pages.filter(p => !listed.includes(p) && !TOOL_LIB_SKIP[p] && !heldOut[p]),
    gone = listed.filter(p => !pages.includes(p));
  chk("each page at the top of the repository is in the library or has a reason", lost.length === 0, lost.join(","));
  chk("each page of the library is there", gone.length === 0 && listed.length > 60, gone.join(","));
  chk(
    "no page is listed twice, and each has a name and a group",
    new Set(listed).size === listed.length && TOOL_LIB.every(x => x[1] && TOOL_LIB_GROUPS.some(g => g[0] === x[2]))
  );
  chk("the page for coaches is not in the library", !listed.includes("pro.html") && !!TOOL_LIB_SKIP["pro.html"]);
  /* Eli, Nov 27 2026: the pages of an add-on are off for standard players, like the other add-ons */
  const src = fs.readFileSync(path.join(GAME_DIR, "data", "toollib.js"), "utf8"),
    heldNames = Object.values(heldAll.names),
    X0 = clone(G),
    everyMenu = () => {
      X("menu");
      const a = ov();
      X("close");
      return a;
    };
  chk(
    "the pages of an add-on are held out with a reason: 10 pages, and the page that shows them to everyone",
    held.length === 11 &&
      held.filter(p => heldOut[p] === "add-on: off for standard players").length === 10 &&
      /shows an add-on fold/.test(heldOut["one.html"]) &&
      TOOL_LIB_HELD === 11,
    JSON.stringify(heldOut)
  );
  chk("each held page has a name on the web app's front door to look for", heldNames.length >= 10, heldNames.length);
  chk(
    "no held page is in the list, and the data file of the game does not name one",
    held.every(p => !listed.includes(p) && !src.includes(p)) &&
      !/LGBTQ/i.test(src) &&
      !TOOL_LIB_GROUPS.some(g => g[0] === "own"),
    held.filter(p => listed.includes(p) || src.includes(p)).join(",")
  );
  const mFirst = everyMenu();
  G.chars.forEach(x => x.hist && x.hist[0] && (x.hist[0].d = addDays(todayISO(), -40)));
  const mLater = everyMenu(),
    inMenu = m => held.filter(p => m.includes(p)).concat(heldNames.filter(n => m.includes(esc(n)))),
    finds = heldNames
      .concat(["LGBTQ", "transition", "chosen family", "marker", "every tool"])
      .filter(q => /fwlib/.test(fwLibFind(q)) && held.some(p => fwLibFind(q).includes(p)));
  chk(
    "a standard player's menu holds none of those pages, in the first week and after it",
    inMenu(mFirst).length === 0 && inMenu(mLater).length === 0 && !/LGBTQ/i.test(mFirst + mLater),
    inMenu(mFirst).concat(inMenu(mLater)).join(",")
  );
  chk("Find a tool finds none of them, by name or by word", finds.length === 0, finds.join(","));
  chk(
    "the words about where everything went do not name them",
    !/LGBTQ/i.test(JSON.stringify(GLOSS.fwwhere || "")) && !/LGBTQ/i.test(fwMenuInfo())
  );
  X("whatsnew");
  X("pnall");
  chk(
    "What's new in the game shows no entry about an add-on",
    !/LGBTQ/i.test(ov()) && PATCH_NOTES.some(e => e.ao) && ov().includes(esc(PATCH_NOTES.filter(e => !e.ao)[0].t))
  );
  X("close");
  G = X0;
  let stale = "";
  try {
    require("child_process").execFileSync("node", [path.join(ROOT, "tools", "game_toollib_build.mjs"), "--check"], {
      stdio: "pipe",
    });
  } catch (e) {
    stale = String((e.stderr || e.message || e) + "").slice(0, 200);
  }
  chk("the list is what the tool makes today", stale === "", stale);
  const lib = grp(mh, "lib");
  chk(
    "the Tool library is one group of the menu, with its groups inside it",
    TOOL_LIB_GROUPS.every(g => lib.includes('data-g="lib-' + g[0] + '"'))
  );
  const noLink = listed.filter(p => !lib.includes('href="../' + p + '" target="_blank" rel="noopener"'));
  chk("each page is a link that opens in a new tab", noLink.length === 0, noLink.join(","));
  chk("Find a tool finds a page of the library", /debt\.html/.test(fwLibFind("debt free")) && fwLibFind("") === "");

  /* ---- 6. a player with costly debt: the same bar, a clean Home, the flow still opens ---- */
  c = fresh();
  c.debts = [{ k: "Credit card", amt: 18000, apr: 24, high: true, s: true, cf: 3 }];
  syncAll(c);
  D = derive(c);
  let ok = true;
  try {
    X("cbgo", "next");
    X("cbgo", "stack");
    X("gohome");
    home = app();
    bar = uxTabs(false);
    mh = menu();
  } catch (e) {
    ok = false;
    report(e, "first-week.js: costly debt");
  }
  chk("a player with costly debt gets the first week with no error", ok && fwState(C()).calm);
  chk(
    "and a clean Home, bar and menu",
    !junk(home) && !bare(mh) && barTabs(bar).join(",") === "home,plan,money",
    junk(home) + bare(mh)
  );

  /* ---- 7. day 8: still calm with no reveal; with the reveal the tabs return, with one line ---- */
  c = fresh();
  X("gohome");
  first(ago(7));
  chk(
    "day 8, no reveal: the bar of the first week",
    fwState(C()).day === 8 && fwState(C()).calm && barTabs(uxTabs(false)).length === 3
  );
  X("cbback");
  X("cbgo", "next");
  X("cbgo", "stack");
  X("cbgo", "reveal");
  chk("the reveal is seen", C().x.cb.rev === T);
  X("gohome");
  s = fwState(C());
  chk("day 8 after the reveal: not calm, and the note is due", !s.calm && s.note && s.back === T, JSON.stringify(s));
  bar = uxTabs(false);
  chk(
    "every tab is back, and + Log",
    barTabs(bar).join(",") === "home,plan,money,goals,me" &&
      /class="logfab" data-a="flow"/.test(bar) &&
      !/cbback/.test(bar)
  );
  top = topbarHTML();
  chk("Safe to spend and Where am I are back in the top bar", /data-a="safe"/.test(top) && /data-a="quest"/.test(top));
  home = app();
  const note = (home.split('data-fid="fw:new"')[1] || "").split("</div>")[0];
  chk(
    "Home has one line: New for you",
    (home.match(/data-fid="fw:new"/g) || []).length === 1 &&
      /New for you:/.test(note) &&
      /My Goals, Me and \+ Log/.test(note)
  );
  chk(
    "the note does not pulse",
    !/pulse|class="[^"]*\bgo\b/.test((home.split('data-fid="fw:new"')[0].split("<div").pop() || "") + note)
  );
  chk(
    "the note sits above the cards of Home, and the tile of the two numbers stays first of the cards",
    home.indexOf("fw:new") < home.indexOf("cb:home") && home.indexOf("cb:home") > 0
  );
  chk("Home with the note is clean", !junk(home), junk(home));
  mh = menu();
  chk(
    "the menu is the menu of before, with the i and the Tool library",
    !/data-g="more"|data-g="later"/.test(mh) &&
      /fw:where/.test(mh) &&
      /Every tab is back/.test(mh) &&
      /data-g="lib"/.test(mh)
  );
  X("fwok");
  home = app();
  chk("Got it puts the note away for good", !/fw:new/.test(home) && G.fw.ok === T && !fwState(C()).note);
  /* the reveal on day 2 */
  c = fresh();
  first(ago(1));
  X("cbgo", "next");
  X("cbgo", "stack");
  X("cbgo", "reveal");
  X("gohome");
  chk(
    "the reveal on day 2: still the first week",
    fwState(C()).calm && fwState(C()).day === 2 && barTabs(uxTabs(false)).length === 3
  );
  first(ago(7));
  C().x.cb.rev = ago(6);
  render();
  chk("and on day 8 the tabs are back with the note", !fwState(C()).calm && fwState(C()).note && /fw:new/.test(app()));

  /* ---- 8. an existing player: no change ---- */
  c = fresh();
  first(ago(40));
  delete G.fw;
  delete C().x.cb.rev;
  /* an existing player of the flow who saw the reveal long ago */
  C().x.cb.rev = ago(30);
  render();
  s = fwState(C());
  chk("a game of 40 days ago is not calm and gets no note", !s.calm && !s.note && !G.fw);
  bar = uxTabs(false);
  chk("its bar is the bar of before", barTabs(bar).join(",") === "home,plan,money,goals,me" && /logfab/.test(bar));
  home = app();
  mh = menu();
  chk(
    "no note on Home, no line on the menu, no group Everything else",
    !/fw:new/.test(home) && !/fw:where/.test(mh) && !/data-g="more"|data-g="later"/.test(mh)
  );
  chk("the game does not note a calmer week it did not have", !G.fw);
  /* a player of before the flow (no c.x.cb), old */
  delete C().x.cb;
  render();
  chk("an old game with no flow: no change", !fwState(C()).calm && barTabs(uxTabs(false)).length === 5 && !G.fw);
  /* a saved game with no first day */
  c = fresh();
  G.chars.forEach(x => (x.hist = []));
  delete G.fw;
  render();
  chk(
    "a saved game with no first day is an existing game: no change",
    fwFirst(G) === null && !fwState(C()).calm && barTabs(uxTabs(false)).length === 5 && !G.fw
  );
  /* a second person added today to an old game */
  c = fresh();
  first(ago(40));
  C().x.cb.rev = ago(30);
  G.chars.push(Object.assign(clone(C()), { name: "Sam", hist: [Object.assign(clone(C().hist[0]), { d: T })], x: {} }));
  G.active = G.chars.length - 1;
  render();
  chk("a person added today to an old game does not start a first week", !fwState(C()).calm && fwFirst(G) === ago(40));
  /* the sample game */
  G = clone(G0);
  G.demo = true;
  chk("the sample game is not calmed", !fwState(C()).calm && fwBar() === null);

  /* ---- 9. coach and admin accounts do not change ---- */
  c = fresh();
  const R0 = Object.assign({}, ROLES);
  ROLES.coach = true;
  chk("an account with the coach role is never calmed", !fwState(C()).calm && barTabs(uxTabs(false)).length === 5);
  mh = menu();
  chk(
    "its menu has the coach group and no group Everything else",
    /data-g="coach"/.test(mh) && !/data-g="more"/.test(mh)
  );
  ROLES.coach = false;
  ROLES.admin = true;
  chk("an account with the admin role is never calmed", !fwState(C()).calm && fwBar() === null);
  Object.assign(ROLES, R0);
  chk("with no role the same player is calm again", fwState(C()).calm);

  /* ---- 10. the built list ---- */
  chk(
    "the built list says the calmer first week is there",
    WB.some(b => /calmer first week/i.test(b[1]) && b[3]() === true)
  );

  G = clone(G0);
  W = null;
  SH = null;
  render();
}
