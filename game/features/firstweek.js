/* ============================================================================
   SLAM the Game: features/firstweek.js
   PURPOSE     A calmer first week (Batch B, phase 5, Nov 27 2026). In the first 7 days of a game the bar at
               the bottom shows four places only: Home, Next Steps, My Money and the flow What it is / What
               it could be ("My number"). Everything else stays in the three-line menu, in groups inside
               groups (hide, never delete). The standalone tool pages of the web app are one menu group,
               "Tool library". The other tabs return after 7 days or after the reveal, whichever is later,
               with a one-line note "New for you" on Home. The menu has an "i" that says where everything
               went.
   INPUT       The game (G.chars: the first day of each profile, hist[0].d; G.fw: { on, ok }; G.demo), the
               open profile (c.x.cb: the flow, c.x.cb.rev: the day the reveal was first seen), the roles
               of the account (ROLES), and the list of pages (data/toollib.js).
   OUTPUT      The rule: fwRule. Reads: fwFirst, fwState, fwCalm, fwReach. Parts of functions in other
               files: fwBar (uxTabs in ux.js), fwKeep (renderUxEnd in ux.js), homeFwNote (homeQuadTop in
               ux.js), fwMenu, fwMenuInfo (menuSheetBase in planner.js), fwMenuExtra, fwLibFind
               (menuFindPaint in planner.js), fwUsed (the click handler in ui.js). The menu: fwRowRule,
               fwMenuState, fwMenuPick. Actions (ACT): fwlog, fwok, fwall.
   DEPENDS ON  core/report.js, core/engine.js (todayISO, addDays, daysBetween), account/roles.js (roCan,
               ROLES), screens/ui.js (esc, ib, GLOSS, save, saveQuiet, render), screens/ux.js (UX_TABS),
               screens/planner.js (menuRow), data/toollib.js (TOOL_LIB, TOOL_LIB_GROUPS).
   THE MENU    The progressive menu (run CC-1, item 13). A new player sees a short menu: the core rows, the
               rows the player used, and the rows that are unlocked. The button "Show everything" gives the
               whole menu, and "Show the short menu" goes back. ONE function decides each row: fwRowRule.
               How the three parts relate: (1) the first week (fwRule) decides the BAR at the bottom, by
               the day; (2) fwRowRule decides the ROWS of the menu, and it reads the first week (the end
               of the week unlocks the groups My money and People and home); (3) Beginner or Expert on Me
               (G.expert): Expert has the whole menu. A coach, the admin, a demo game and a game that
               started before FW_MENU.from have the whole menu, as before. Settings and account (Report a
               bug or idea, Privacy, Save my game, Theme), What's new and the tour are always in the short
               menu; Sign out is under the menu by cloud.js and never depends on this. "Find a tool"
               reaches every row in both menus. A row of a role never shows to a player (roMenuOk in
               roles.js filters the rows before this file sees them).
   COMPAT      New optional keys of G: menuSeen ({ id: 1 }: the menu rows the player has opened) and
               menuAll (true: the whole menu). An old saved game has none: its first day is before
               FW_MENU.from, so it has the whole menu, as before.
   RULES       The rule is in one function, fwRule. A view shows what fwState returns. Nothing is removed:
               each tab, each menu row and each action stays reachable in the first week (fwReach lists
               them; tests/first-week.js walks the registries). A game with no first day is the game of an
               existing player: no change. An account with the role coach or admin is never calmed. The 7
               days are the owner's rule of the program, not a rate from outside.
   ========================================================================= */
const FW_DAYS = 7;
/* The tabs of the bar in the first week. The flow is the fourth place: a button, not a tab. */
const FW_TABS = ["home", "plan", "money"];
const fwIso = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
/* THE RULE. first: the first day of the game. rev: the day the reveal was first seen, or null. today: an ISO day.
   inFlow: the player came through What it is / What it could be, so there is a reveal to wait for.
   Returns { known, calm, day, back }: day 1 is the first day; back is the first day with every tab (null while
   the reveal is not seen). With no first day the player is an existing player: never calm. */
function fwRule(first, rev, today, inFlow) {
  if (!fwIso(first) || !fwIso(today)) return { known: false, calm: false, day: null, back: null };
  const weekEnd = addDays(first, FW_DAYS),
    back = inFlow ? (fwIso(rev) ? (rev > weekEnd ? rev : weekEnd) : null) : weekEnd;
  return { known: true, calm: back === null || today < back, day: daysBetween(first, today) + 1, back };
}
/* The first day of the game: the earliest first snapshot of its profiles (hist[0].d, written when setup ends).
   A profile with no such day makes the answer null: a game from before the snapshots is an existing game. */
function fwFirst(g) {
  const cs = (g && g.chars) || [];
  let first = null;
  for (const c of cs) {
    const d = c && c.hist && c.hist[0] && c.hist[0].d;
    if (!fwIso(d)) return null;
    if (first === null || d < first) first = d;
  }
  return first;
}
/* What the screens read: the rule for the open profile today, and `note` (show "New for you"). */
function fwState(c) {
  const off = { known: false, calm: false, day: null, back: null, note: false };
  try {
    if (!c || G.demo) return off;
    if (typeof roCan === "function" && typeof ROLES !== "undefined" && roCan("coach", ROLES)) return off;
    const cb = (c.x && c.x.cb) || null,
      r = fwRule(fwFirst(G), cb && cb.rev, todayISO(), !!cb);
    r.note = !r.calm && !!(G.fw && G.fw.on && !G.fw.ok);
    return r;
  } catch (e) {
    report(e, "firstweek.js: fwState");
    return off;
  }
}
const fwCalm = () => fwState(C()).calm;
/* The three things that leave the bar in the first week, as menu rows. */
const FW_LATER = [
  ["My Goals", "goals", "tab", "Your bucket list and how long until each one"],
  ["Me", "me", "tab", "Your profile, yearly review, glossary and look"],
  ["Log money", "fwlog", "act", "Add money that came in or went out"],
];
/* Part of uxTabs() in ux.js. In the first week: the three tabs and the button of the flow. Else null. */
function fwBar() {
  if (!fwCalm()) return null;
  return {
    tabs: FW_TABS,
    more: `<button class="fwcb" data-a="cbback" data-fid="fw:number"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg><span>My number</span></button>`,
  };
}
/* Part of renderUxEnd() in ux.js. Notes once that this game had the calmer week, so the note "New for you" shows
   only to a player whose tabs did come back. */
function fwKeep() {
  try {
    if (G.fw && G.fw.on) return;
    if (!fwCalm()) return;
    G.fw = { on: todayISO() };
    if (typeof saveQuiet === "function") saveQuiet();
  } catch (e) {
    report(e, "firstweek.js: fwKeep");
  }
}
/* Part of homeQuadTop() in ux.js. One line, no pulse: the other tabs are back. */
function homeFwNote() {
  if (!fwState(C()).note) return "";
  return `<div class="tile small fwnew" data-fid="fw:new"><span><b>New for you:</b> My Goals, Me and + Log are in the bar at the bottom now. Everything is still in the menu too.</span> <button class="ghost slim" data-a="fwok">Got it</button></div>`;
}
/* ---------- THE PROGRESSIVE MENU (run CC-1, item 13) ---------- */
/* from: the first day of a game that gets the short menu. A game that started before it keeps the whole menu.
   (An object, so that a test can move the day.) */
const FW_MENU = { from: "2026-11-27" };
/* The core rows: in the short menu from the first day. */
const FW_CORE = ["quest", "play", "safe", "moves", "people", "glossary", "whatsnew", "tour"];
/* The group that is always whole: Report a bug or idea, Privacy, Save my game, Theme, Share. */
const FW_CORE_GROUP = "settings";
/* What unlocks rows. rev: the reveal was seen, so the rows it leads to show. week: the first week is over, so
   these groups show whole (the same day the other tabs come back to the bar). */
const FW_UNLOCK = { rev: ["odds", "taxv", "takeout", "values"], week: ["money", "people"] };
/* THE RULE OF ONE ROW. id: the action of the row. group: the id of its group. S: { short, seen, rev, weekOver }.
   Returns why the row shows ("all", "core", "used", "unlocked"), or "" when it waits. */
function fwRowRule(id, group, S) {
  if (!S || !S.short) return "all";
  if (FW_CORE.includes(id) || group === FW_CORE_GROUP) return "core";
  if (S.seen && S.seen[id]) return "used";
  if (S.rev && FW_UNLOCK.rev.includes(id)) return "unlocked";
  if (S.weekOver && FW_UNLOCK.week.includes(group)) return "unlocked";
  return "";
}
/* What the rule reads, for the open profile: can: this game has the two menus (a new player, not a coach, not the
   demo). short: the short menu is on. */
function fwMenuState(c) {
  const off = { can: false, short: false, seen: {}, rev: false, weekOver: false };
  try {
    const s = fwState(c),
      first = s.known ? fwFirst(G) : null;
    if (!s.known || !first || first < FW_MENU.from) return off;
    return {
      can: true,
      short: !G.expert && !G.menuAll,
      seen: G.menuSeen || {},
      rev: !!(c && c.x && c.x.cb && c.x.cb.rev),
      weekOver: !s.calm,
    };
  } catch (e) {
    report(e, "firstweek.js: fwMenuState");
    return off;
  }
}
/* The groups of the short menu: each group with the rows that show, and the count of rows that wait.
   groups: what menuGroups returns. Returns { S, groups, wait }. */
function fwMenuPick(groups) {
  const S = fwMenuState(C());
  let wait = 0;
  const out = groups
    .map(g => {
      const items = g.items.filter(m => fwRowRule(m[1], g.id, S));
      wait += g.items.length - items.length;
      return Object.assign({}, g, { items });
    })
    .filter(g => g.items.length || g.role);
  return { S, groups: out, wait };
}
/* Part of the click handler in ui.js. A tap on an action that is a row of the menu, from any screen: the row is
   used, and it stays in the short menu. name: the data-a of the button. t: the button. */
function fwUsed(name, t) {
  try {
    const id = name === "menugo" && t && t.dataset ? t.dataset.v : name;
    if (!id || G.demo || typeof MENU === "undefined" || (G.menuSeen && G.menuSeen[id])) return;
    if (!MENU.some(m => m[1] === id)) return;
    G.menuSeen = Object.assign({}, G.menuSeen, { [id]: 1 });
    if (typeof saveQuiet === "function") saveQuiet();
  } catch (e) {
    report(e, "firstweek.js: fwUsed");
  }
}
/* The button that switches between the two menus, with one line. wait: the count of rows that wait. */
function fwMenuSwitch(S, wait) {
  if (!S.can || G.expert) return "";
  return S.short
    ? `<div class="stack fwall" style="gap:6px" data-fid="fw:all"><button class="ghost wide" data-a="fwall" data-v="1">Show everything${wait ? " (" + wait + " more)" : ""}</button><div class="tiny muted">A tool you open stays in this menu. Find a tool reaches all of them.</div></div>`
    : `<div class="stack fwall" style="gap:6px" data-fid="fw:all"><button class="ghost wide" data-a="fwall" data-v="0">Show the short menu</button></div>`;
}
/* Part of menuSheetBase() in planner.js. The line with the "i" that says where everything went. */
function fwMenuInfo() {
  const s = fwState(C()),
    M = fwMenuState(C());
  if (M.short)
    return `<div class="row between fwwhere" data-fid="fw:where"><span class="small">${s.calm ? "Your first week: four places in the bar at the bottom, and a short menu here. Nothing was removed." : "A short menu. A tool shows here once you use it. Nothing was removed."}</span>${ib("term:fwwhere")}</div>`;
  if (!s.calm && !(G.fw && G.fw.on)) return "";
  return `<div class="row between fwwhere" data-fid="fw:where"><span class="small">${s.calm ? "Your first week: four places in the bar at the bottom. Everything else is here." : "Every tab is back in the bar at the bottom. Everything is still here too."}</span>${ib("term:fwwhere")}</div>`;
}
const fwCount = n => `<span class="pill mncount">${n}</span>`;
const fwGroup = (id, ico, name, n, inner, nest) =>
  `<details class="mng${nest ? " mng2" : ""}" name="${nest ? "mng2" : "mng"}" data-g="${id}"><summary><span class="mngh">${ico ? `<span class="mnico" aria-hidden="true">${ico}</span>` : ""}<b>${name}</b>${fwCount(n)}</span></summary><div class="stack mnrows">${inner}</div></details>`;
const fwLibRow = r =>
  `<a class="rowbtn menurow fwlib" href="../${r[0]}" target="_blank" rel="noopener" data-p="${r[0]}"><span><b>${esc(r[1])}</b></span><span class="caret"><i class=chev aria-hidden=true></i></span></a>`;
/* The group "Tool library": the standalone pages, each group of the web app's front door as a group inside it. */
function fwLibGroup() {
  if (typeof TOOL_LIB === "undefined" || !TOOL_LIB.length) return "";
  return fwGroup(
    "lib",
    "🧰",
    "Tool library",
    TOOL_LIB.length,
    `<div class="tiny muted">One question on one page. Each opens in a new tab, and what you enter there stays on that page.</div>` +
      TOOL_LIB_GROUPS.map(g => {
        const rows = TOOL_LIB.filter(r => r[2] === g[0]);
        return fwGroup("lib-" + g[0], "", esc(g[1]), rows.length, rows.map(fwLibRow).join(""), true);
      }).join("")
  );
}
/* Part of menuSheetBase() in planner.js. groups: what menuGroups returns. draw(g, nest): the HTML of one group.
   After the first week: the groups as they were, with the Tool library before Settings. In the first week: what
   comes back later, then "Everything else" with each group inside it, the Tool library, Settings. */
function fwMenu(groups, draw) {
  const calm = fwCalm(),
    last = g => g.id === "settings" || !!g.role,
    P = fwMenuPick(groups) /* the progressive menu: the rows that show, and the switch */,
    sw = fwMenuSwitch(P.S, P.wait + (typeof TOOL_LIB !== "undefined" ? TOOL_LIB.length : 0));
  /* the short menu: the groups with the rows that show, one level, no Tool library */
  if (P.S.short)
    return (
      (calm
        ? fwGroup(
            "later",
            "⏳",
            "Back in the bar after your first week",
            FW_LATER.length,
            FW_LATER.map(m => menuRow(m, false)).join("")
          )
        : "") +
      P.groups.map(g => draw(g)).join("") +
      sw
    );
  const lib = fwLibGroup();
  if (!calm)
    return (
      groups
        .filter(g => !last(g))
        .map(g => draw(g))
        .join("") +
      lib +
      groups
        .filter(last)
        .map(g => draw(g))
        .join("") +
      sw
    );
  const rest = groups.filter(g => !last(g));
  return (
    fwGroup(
      "later",
      "⏳",
      "Back in the bar after your first week",
      FW_LATER.length,
      FW_LATER.map(m => menuRow(m, false)).join("")
    ) +
    fwGroup(
      "more",
      "🗂️",
      "Everything else",
      rest.reduce((s, g) => s + g.items.length, 0),
      rest.map(g => draw(g, true)).join("")
    ) +
    lib +
    groups
      .filter(last)
      .map(g => draw(g))
      .join("") +
    sw
  );
}
/* Part of menuFindPaint() in planner.js. The rows of "Find a tool" that are not in MENU in the first week. */
function fwMenuExtra() {
  return fwCalm() ? FW_LATER : [];
}
/* Part of menuFindPaint() in planner.js. The pages of the Tool library that match the words. */
function fwLibFind(q) {
  const w = String(q || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!w.length || typeof TOOL_LIB === "undefined") return "";
  return TOOL_LIB.filter(r => w.every(x => r[1].toLowerCase().includes(x)))
    .slice(0, 12)
    .map(fwLibRow)
    .join("");
}
/* Every place of the game a player could reach before, for the test: the tabs, the rows of the menu the player
   may see, and the buttons that leave the bars in the first week. */
function fwReach() {
  return {
    tabs: UX_TABS.map(x => x[0]),
    rows: menuItems().map(m => m[1]),
    acts: ["flow", "safe", "quest"],
  };
}
kitTerms({
  fwwhere: [
    "Where everything went",
    "In your first week the bar at the bottom shows four places: Home, Next Steps, My Money and My number. Nothing was removed. My Goals, Me and Log money are in this menu under Back in the bar after your first week. The menu starts short: the tools most people use first, and Settings and account (Report a bug or idea, Privacy, Save my game). Safe to spend and Where am I are under My money. A tool shows in the menu once you open it, from any screen. After your reveal, the tools it leads to show. After your first week, My money and People and home show whole. Show everything, at the foot of the menu, gives the whole menu: every tool is then under Everything else, in its group, and the standalone pages are under Tool library. Show the short menu goes back. Find a tool reaches every tool in both menus. Expert, on Me, always has the whole menu. The other tabs come back after 7 days, or after you see your reveal in My number, whichever comes later.",
  ],
});
if (typeof ACT !== "undefined")
  Object.assign(ACT, {
    /* the menu row "Log money": the same sheet as the button + Log of the bar */
    fwlog: () => ACT.flow({ dataset: { v: "" } }),
    /* the menu: Show everything (v 1), or Show the short menu (v 0) */
    fwall: t => {
      G.menuAll = t.dataset.v === "1";
      save();
      if (typeof drawSheet === "function") drawSheet();
    },
    fwok: () => {
      G.fw = Object.assign({}, G.fw, { ok: todayISO() });
      save();
      render();
    },
  });
