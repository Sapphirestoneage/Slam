/* ============================================================================
   SLAM the Game: screens/ux.js
   PURPOSE     The interface rules for a new player: five plain tabs, one clear title on each screen,
               Guess / Close / Exact, a Back button that works, and Undo in the place of "are you sure".
               Many parts of the functions in ui.js are here.
   INPUT       The game: G.color, G.demo, G.expert, G.last, G.tips. The open sheet (W.kind): months. The
               taps of the player (the actions in OUTPUT).
   OUTPUT      35 functions. Parts of functions in other files: nextStepPayday, homeWelcome,
               homeQuadTop, safeSheetFree, flowSheetLog, playTabHead, moneyTabHead, meTabHead,
               planTabHead, setupSheetRead, goUxStart, goUxEnd, sheetUx, closeSheetUx, drawSheetUx,
               saveFlash, celebrateBuzz, renderUxStart, renderUxEnd. Actions (ACT): bigpic, homemore,
               memore, tipok, expert, whatdo, months, color, clretry, retx, uxresume, pmusnext, uxpaid,
               uxundo, and 3 more.
   DEPENDS ON  core/report.js, core/engine.js, core/engine2.js, screens/ui.js, features/games2.js,
               features/year.js, screens/planner.js, account/cloud.js.
   USES LATER  Names from files that the browser loads later. Behind a typeof test, thus safe while the
               page loads: features/gig.js.
   ========================================================================= */
const UX_TABS = [
  [
    "home",
    "Home",
    "Your money at a glance and the one thing to do next",
    '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  ],
  [
    "plan",
    "Next Steps",
    "Your to-do list in order: today, this week, this month, this year",
    '<path d="M4 6h3M4 12h3M4 18h3M10 6h10M10 12h10M10 18h10"/>',
  ],
  [
    "money",
    "My Money",
    "Everything you have and everything you owe, in one place",
    '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>',
  ],
  ["goals", "My Goals", "Your bucket list and how long until each one", '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>'],
  [
    "me",
    "Me",
    "Your profile, yearly review, glossary and look",
    '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  ],
];
const uxTabOf = t => (t === "play" ? "home" : t === "map" ? "plan" : t),
  uxT = t => UX_TABS.find(x => x[0] === uxTabOf(t)) || UX_TABS[0];
let BIG = false,
  HOME_MORE = false,
  ME_MORE = false,
  UX_HINT = "",
  UX_RET = null,
  UX_UNDO = null,
  UX_SCR = {};
function uxTabs(dot) {
  const cur = uxTabOf(tab);
  return (
    UX_TABS.map(
      x =>
        `<button class="${cur === x[0] ? "on" : ""}" data-a="tab" data-v="${x[0]}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${x[3]}</svg><span>${typeof VT === "function" && x[0] === "map" ? x[1] : x[1]}</span>${x[0] === "home" && dot ? `<span class="dot"></span>` : ""}${x[0] === "plan" && uxOpen() ? `<span class="dot plbadge">${uxOpen()}</span>` : ""}</button>`
    ).join("") + `<button class="logfab" data-a="flow" data-v="" aria-label="Log money">+ Log</button>`
  );
}
function uxOpen() {
  try {
    const c = C();
    return G.demo ? 0 : plAutoToday(c).length + plTasksOn(c, todayISO()).filter(plOpen).length;
  } catch (e) {
    return 0;
  }
}
const COACH = {
  plan: "Soonest first. Do the top one and the list reorders itself.",
  home: "The glowing card is always the one thing to do next.",
  map: "Soonest first. Do the top one and the list reorders itself.",
  money: "Tap any line to change it. Faded numbers are guesses.",
  goals: "Every goal gets a date. Tap one to see what moves it.",
  me: "Your look, your chart, your year and your profiles live here.",
};
function tabHead() {
  const x = uxT(tab),
    k = x[0],
    tips = G.tips || {};
  return `<div class="tabhead"><div class="row between"><b class="tabtitle">${tab === "play" ? `<button class="crumb" data-a="tab" data-v="home">Home</button> › Check in` : tab === "map" ? `<button class="crumb" data-a="tab" data-v="plan">Next Steps</button> › The big picture` : x[1]}</b><button class="ghost slim whatdo" data-a="whatdo" aria-label="What do I do here?" title="What do I do here?">?</button></div><div class="tabdesc">${tab === "play" ? "Payday and your one-minute check" : tab === "map" ? "The map, the eras and the skill trees. Optional." : x[2]}</div>${UX_HINT ? `<div class="tile small hint">${esc(UX_HINT)}</div>` : ""}</div>`;
}
const uxLess = (h, more, n, act) =>
  more
    ? h
    : h
        .replace('<div class="stack">', '<div class="stack less' + n + '">')
        .replace(/<\/div>\s*$/, `<button class="ghost wide morebtn" data-a="${act}">Show more</button></div>`);
const withHead = h => {
  const th = tabHead();
  return h.replace('<div class="stack">', () => '<div class="stack">' + th);
};
/* Part of nextStep() in ui.js. On payday, the next step is the paycheck split. Returns null on all other days. */
function nextStepPayday(c) {
  if (!G.demo && c.placed && c.payKnown && todayISO() >= c.payNext && !(c.gentle && !c.gwin))
    return { t: "It's payday", s: "Split it in a few taps.", a: "payday", l: "Split my paycheck" };
  return null;
}
var UX_NOSAMPLE = true;
function homeQuad(c, d) {
  const ns = nextStep(c, d),
    f = freeToSpend(c, d),
    open = uxOpen(),
    fp = typeof fogPct === "function" ? fogPct(c, d) : 0,
    tight = f.free <= 0 || f.short > 0;
  return `<div class="quad"><div class="q q1"><span class="qn">1</span><div class="eyebrow">Do this</div><b class="qt">${esc(ns.t)}</b><button class="primary go" data-a="${ns.a}" data-v="${ns.v == null ? "" : ns.v}">${esc(ns.l || "Start")}</button></div>
 <button class="q q2" data-a="safe"><span class="qn">2</span><span class="eyebrow">Free to spend</span><b class="qt" data-fid="v:freewk">${tight ? "$0" : money(f.week)}</b><span class="tiny muted">${tight ? "tight right now" : "a week · " + (f.real ? "Close" : "Guess")}</span></button>
 <button class="q q3" data-a="tab" data-v="plan"><span class="qn">3</span><span class="eyebrow">Next steps</span><b class="qt">${open ? open + " to do" : "All clear"}</b><span class="tiny muted">today</span></button>
 <button class="q q4" data-a="fog"><span class="qn">4</span><span class="eyebrow">Your picture</span><b class="qt">${fp}%</b><span class="tiny muted">clear</span></button></div>`;
}
function welcome() {
  const st = typeof CLOUD !== "undefined" ? CLOUD.st : "off",
    err = typeof CLOUD !== "undefined" ? CLOUD.err : "";
  /* okay.js: a visitor with no account (the front door) gets the words for a game on this device */
  if (typeof welcomeDoor === "function" && typeof doorGuest === "function" && doorGuest()) return welcomeDoor();
  return `<div class="stack welcomebox"><h1>SLAM the Game</h1><div class="small muted">Your money, one small step at a time.</div><div class="card stack" style="gap:10px">${st === "connecting" ? `<div class="small"><b>Looking for your saved game…</b></div><div class="tiny muted">If you've played on another device, it will show up here in a moment.</div><button class="ghost wide" data-a="start">Start a new game instead</button>` : `<div class="small">${st === "on" ? "No saved game on your account yet." : "Couldn't check your account" + (err ? " (" + esc(err) + ")" : "") + ". A new game will save on this device."}</div><button class="primary go wide" data-a="start">Start my game</button>${st === "on" ? "" : `<button class="ghost wide slim" data-a="clretry">Check my account again</button>`}`}<div class="tiny muted">About 15 taps. No numbers, no typing. Free. ${TRUST_LINE}</div></div>${typeof welcomeReport === "function" ? welcomeReport() : "" /* fbreport.js: the button "Report" */}</div>`;
}
/* Part of home() in ui.js. A new player (the sample game) sees the welcome screen. Returns null for all other players. */
function homeWelcome() {
  return G.demo && UX_NOSAMPLE ? welcome() : null;
}
/* Part of home() in ui.js. Adds the tab title and the four tiles at the top, and the button "Show more" at the bottom. */
function homeQuadTop(h) {
  if (h.indexOf('class="stack"') < 0 || /Nothing here needs you/.test(h)) return h;
  const top =
    tabHead() +
    /* look.js: the stat row, kept with the four boxes in one block so "Show less" keeps both */
    '<div class="hqtop">' +
    (typeof homeStatRow === "function" ? homeStatRow(C(), D) : "") +
    homeQuad(C(), D) +
    "</div>";
  return h
    .replace('<div class="stack">', () => '<div class="stack hq' + (HOME_MORE ? "" : " less2") + '">' + top)
    .replace(
      /<\/div>\s*$/,
      () => (HOME_MORE ? "" : '<button class="ghost wide morebtn" data-a="homemore">Show more</button>') + "</div>"
    );
}
/* Part of safeSheet() in ui.js. Adds the tile "Free to spend" below the title. */
function safeSheetFree(h) {
  const c = C(),
    f = freeToSpend(c, D);
  const tile = `<div class="tile small">Free to spend: <b>${f.free > 0 ? money(f.week) + " a week" : "nothing right now"}</b>${f.free > 0 ? " (" + money(f.free) + " a month)" : ""} <span class="pill">${f.real ? "Close" : "Guess"}</span></div>`;
  return h.replace(/<h2[^>]*>[\s\S]*?<\/h2>/, m => m + tile);
}
/* Part of flowSheet() in ui.js. The title becomes "Log money". Each question with no answer gets a mark. The row "I got paid" comes first. */
function flowSheetLog(h) {
  h = h.replace(">Cash flow<", ">Log money<");
  h = h
    .split('<div class="field">')
    .map((seg, i) =>
      i && seg.indexOf('data-a="fset"') >= 0 && seg.split("</div></div>")[0].indexOf('class="chip on"') < 0
        ? '<div class="field need">' + seg
        : (i ? '<div class="field">' : "") + seg
    )
    .join("");
  if (W && W.o && !W.o.t && !G.demo)
    h = h.replace(
      /(<button class="rowbtn)/,
      `<button class="rowbtn" data-a="uxpaid"><span><b>I got paid</b><div class="tiny muted">Split this paycheck in a few taps</div></span><span class="caret">›</span></button>$1`
    );
  return h;
}
const UX_COLORS = [
  ["midnight", "Midnight"],
  ["ocean", "Ocean"],
  ["forest", "Forest"],
  ["violet", "Violet"],
  ["wine", "Wine"],
  ["", "Theme's own"],
];
/* Part of playTab() in ui.js. Adds the tab title. Removes the line for a streak of 0 days. */
function playTabHead(h) {
  return withHead(h).replace(/\s*Streak: <b>0<\/b> days/, "");
}
/* Part of moneyTab() in ui.js. Puts the tab title at the top. Removes the old title and the old first line. */
function moneyTabHead(h) {
  return withHead(h)
    .replace("<h1>Money</h1>", "")
    .replace(/<div class="small muted">Every number the game uses lives here[^<]*<\/div>/, "");
}
/* Part of meTab() in ui.js. Adds the tab title, the switch Beginner / Expert, the colors and the glossary row. Then it hides the lower cards behind "Show more". */
function meTabHead(h) {
  const c = C();
  h = withHead(h).replace(
    /(<h1>[^<]*<\/h1>)/,
    `$1<div class="card row between"><span><b>Beginner or Expert</b><div class="tiny muted">Expert hides the helper lines and hints.</div></span><div class="seg" style="flex:none"><button class="${G.expert ? "" : "on"}" data-a="expert" data-v="0">Beginner</button><button class="${G.expert ? "on" : ""}" data-a="expert" data-v="1">Expert</button></div></div><div class="card stack" style="gap:6px"><div class="row between"><b>Color</b><span class="tiny muted">Changes the look only. Your theme's words stay.</span></div><div class="swatches">${UX_COLORS.map(x => `<button class="sw sw-${x[0]} ${(G.color == null ? "midnight" : G.color) === x[0] ? "on" : ""}" data-a="color" data-v="${x[0]}"><i></i><span>${x[1]}</span></button>`).join("")}</div></div><button class="card rowbtn" data-a="glossary"><span><b>Glossary</b><div class="tiny muted">Every word the game uses, in plain English</div></span><span>›</span></button>`
  );
  return uxLess(h, ME_MORE, 9, "memore");
}
function nextTab() {
  return withHead(mapTab());
}
/* Part of planTab() in planner.js. Adds the tab title, the button "The next few months" and the button "See the big picture". */
function planTabHead(h) {
  return withHead(
    h.replace(
      /(<div class="seg plseg">[\s\S]*?<\/div>)/,
      m => m + `<button class="ghost slim wide" data-a="months">The next few months ›</button>`
    )
  ).replace(
    /<\/div>\s*$/,
    `<button class="ghost wide" data-a="tab" data-v="map">See the big picture</button><div class="tiny muted" style="text-align:center">The map, the eras and the skill trees. Optional.</div></div>`
  );
}
/* goalsTab() is the full tab My Goals. It calls each part by name. goalsTabBase() is the part from this file. */
function goalsTab() {
  let h = goalsTabBase();
  if (typeof goalsTabCountdown === "function") h = goalsTabCountdown(h); /* countdown.js: the button "Countdowns" */
  if (typeof goalsTabTransit === "function")
    h = goalsTabTransit(h); /* transit.js: the row "Break in case of emergency" */
  return h;
}
function goalsTabBase() {
  const c = C(),
    d = D,
    gs = (c.goals || []).filter(g => !g.done);
  return `<div class="stack">${tabHead()}${gs.length ? goalsCard(c, d, "open") : `<div class="card stack"><h3>Nothing on your list yet</h3><div class="small muted"><b>What goes here:</b> the things you want, big or small. <b>Why:</b> each one gets a date, so "someday" turns into a month and a year. <b>How long:</b> about a minute.</div><button class="primary go wide" data-a="draft">Pick my first goals</button></div>`}
 ${gs.length ? `<div class="row" style="gap:6px"><button class="ghost" style="flex:1" data-a="gadd">Add a goal</button><button class="ghost" style="flex:1" data-a="draft">Deal me ideas</button></div>` : `<button class="ghost wide" data-a="gadd">Or add one of my own</button>`}</div>`;
}
const MUS_HINT = [
  "In your card's app, look for Lock or Freeze card. Finding the switch counts.",
  "Know the number on the back of the card, and that you can ask for a no-fee version instead of cancelling.",
  "Each of the three credit bureaus (Equifax, Experian, TransUnion) has a free freeze on its own website. Knowing where counts.",
  "In your card or bank app, tap any charge and look for Dispute or Report a problem. You don't need a bad charge. Finding the button counts.",
  "In your investing account, find Trade or Buy and see what it asks for. You don't have to place an order.",
  "In your investing account, find Sell and see what it asks for. You don't have to place an order.",
  "Find Transfer in your bank app and check that your other bank is linked.",
  "Could you get into every money account today? A password manager, or a written list somewhere safe, counts.",
  "Find your latest pay stub and spot three things: pay before tax, what was taken out, and what landed.",
  "The official free site is AnnualCreditReport.com. Pulling one report counts.",
  "Pick one bill, call or chat, and ask if there's a lower rate or a promotion. Asking once counts.",
  "In any bill's account, find Autopay. Turning it on for at least the minimum counts.",
  "Which company holds it, and can you log in? If you don't have one, tap Show me a different one.",
  "Software, a preparer, or a free filing program? Knowing which, and where last year's return is, counts.",
  "Routing and account numbers are in your bank app, usually under account details.",
  "Open your bank app and look. That's the whole thing.",
];
/* the next few months: what's coming, in order, so nothing is a surprise */
/* monthsAhead(c, d, today, n) returns the list of the next months with what comes in each one. monthsAheadBase() is the part from this file. */
function monthsAhead(c, d, today, n) {
  let out = monthsAheadBase(c, d, today, n);
  if (typeof monthsAheadTax === "function") out = monthsAheadTax(out, c, today); /* gig.js: the quarterly tax dates */
  return out;
}
function monthsAheadBase(c, d, today, n) {
  today = today || todayISO();
  n = n || 6;
  const a = parseISO(today),
    ya = typeof yearAhead === "function" ? yearAhead(c, d, today) : null,
    cal = typeof calOf === "function" ? calOf(c) : null,
    plan = ((c.x || {}).plan || []).filter(p => p.st !== "done" && p.when),
    rv0 = typeof revDate === "function" ? revDate(c, today) : null,
    rv = rv0 && rv0.next ? rv0.next : null,
    out = [];
  for (let i = 0; i < n; i++) {
    const dt = new Date(a.getFullYear(), a.getMonth() + i, 1),
      ym = iso(dt).slice(0, 7),
      items = [];
    plan
      .filter(p => p.when.slice(0, 7) === ym && (i > 0 || p.when >= today))
      .forEach(p => items.push({ t: p.t, k: "todo" }));
    (c.goals || [])
      .filter(g => !g.done && g.byDate && g.byDate.slice(0, 7) === ym)
      .forEach(g => items.push({ t: "Goal date: " + g.n + (g.cost ? " (" + money(g.cost) + ")" : ""), k: "goal" }));
    if (ya && ya.M[i]) {
      ya.M[i].extra.forEach(e =>
        items.push({ t: e.n + ": about " + money(e.amt) + (e.real ? "" : " (guess)"), k: "cost" })
      );
      ya.M[i].dip.forEach(e => items.push({ t: e.n + ": about " + money(e.amt) + " less pay", k: "cost" }));
      ya.M[i].note.forEach(x => items.push({ t: x, k: "note" }));
    }
    if (rv && rv.slice(0, 7) === ym) items.push({ t: "Your yearly look back", k: "goal" });
    out.push({
      ym,
      n:
        [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ][dt.getMonth()] +
        " " +
        dt.getFullYear(),
      now: i === 0,
      items,
    });
  }
  out.every = [
    cal && cal.pay.length
      ? "Money lands about " +
        cal.pay.length +
        " time" +
        (cal.pay.length === 1 ? "" : "s") +
        (cal.s ? "" : " (a guess until you paint your month)")
      : null,
    "One 10-minute check-in",
  ].filter(Boolean);
  return out;
}
function monthsSheet() {
  const c = C(),
    ms = monthsAhead(c, D);
  return (
    head("Next Steps", "The next few months") +
    `<div class="tile stack" style="gap:4px"><b>Every month</b>${ms.every.map(x => `<div class="small mrow k-note">${esc(x)}</div>`).join("")}</div>` +
    ms
      .map(
        m =>
          `<div class="tile stack" style="gap:4px"><div class="row between"><b>${m.n}</b>${m.now ? `<span class="pill">Now</span>` : ""}</div>${m.items.length ? m.items.map(x => `<div class="small mrow k-${x.k}">${esc(x.t)}</div>`).join("") : `<div class="tiny muted">Just the usual.</div>`}</div>`
      )
      .join("") +
    `<div class="tiny muted">It fills in as you add goals, calendars and true expenses.</div><div class="row" style="gap:6px"><button class="ghost slim" style="flex:1" data-a="gadd">Add a goal</button><button class="ghost slim" style="flex:1" data-a="cals">Calendars</button><button class="ghost slim" style="flex:1" data-a="funds">True expenses</button></div>`
  );
}
const EMPTY = {
  cashes: ["your checking, savings and cash", "it shows how long you could last without a paycheck"],
  invs: ["retirement and investing accounts", "it's the money that works while you sleep"],
  debts: ["cards, loans and anything you owe", "every debt gets a payoff date"],
  incs: ["each way money comes in", "it's what everything else is measured against"],
  spends: ["where your money goes each month", "it sets what's free to spend"],
};
function emptyState(k) {
  const e = EMPTY[k];
  return e
    ? `<div class="small muted"><b>What goes here:</b> ${e[0]}. <b>Why:</b> ${e[1]}. <b>How long:</b> under a minute.</div>`
    : `<div class="small muted">Nothing here yet.</div>`;
}
/* first read: a real answer about you inside the first minute of setup */
function firstRead(o) {
  try {
    const p = clone(o);
    if (p.age == null) return null;
    if (!p.work) p.work = "First job";
    if (!p.incKinds || !p.incKinds.length) p.incKinds = ["A main job"];
    p.payFreq = p.payFreq || "Every 2 weeks";
    p.steady = p.steady || "Steady";
    p.home = HOMEMAP[p.homeQ] || "Renting";
    if (!p.live || !p.live.length) p.live = ["On my own"];
    p.rel = p.rel || "Single, seeking";
    p.deps = p.deps || "None";
    p.share = p.share || "No one";
    if (!p.accts || !p.accts.length) p.accts = ["Checking"];
    p.can1k = p.can1k || "No";
    p.cover = p.cover || "Less than a month";
    p.invest = p.invest || "No";
    p.placed = false;
    applyTypical(p);
    const d = derive(p);
    return {
      era: eraN(d.rawEra),
      left: Math.round(p.take - p.spend),
      known: ["can1k", "cover", "invest"].every(k => o[k]),
    };
  } catch (e) {
    return null;
  }
}
/* Part of setupSheet() in ui.js. w is the setup state. After the first three answers, it adds the line "Your first read" with the era for a person like the player. */
function setupSheetRead(h, w) {
  const fr = w.mode !== "edit" && w.step >= 1 && w.step < 4 ? firstRead(w.o) : null;
  return fr && fr.known
    ? h.replace(
        '<div class="plk stack" style="gap:3px;padding:8px 10px">',
        () =>
          `<div class="plk stack" style="gap:3px;padding:8px 10px"><div class="firstread"><div class="row between"><span class="small">Your first read: <b>${esc(fr.era)}</b></span><span class="pill">Guess</span></div><div class="tiny muted">For someone your age with those three answers. Each tap from here makes it closer.</div></div>`
      )
    : h;
}
/* back that works: tabs and sheets go through the browser history */
const uxHist =
  typeof history !== "undefined" && typeof history.pushState === "function" && typeof addEventListener === "function";
let UX_POP = false,
  UX_BACKS = 0; /* the game's own steps back in the browser history that have not arrived yet */
/* Part of go() in ui.js, step 1 of 2. "prev" is the tab that the player leaves.
   Keeps the scroll position of that tab. Keeps the open sheet, so the chip "Back to ..." can open it again. */
function goUxStart(t, prev) {
  if (typeof scrollY === "number") UX_SCR[prev] = scrollY;
  if (SH && W && W.kind && t !== prev && !UX_POP) uxKeep(prev);
  UX_HINT = "";
}
/* Part of go() in ui.js, step 2 of 2. Adds one step to the browser history. Goes to the scroll position that the new tab had. */
function goUxEnd(t, prev) {
  if (uxHist && !UX_POP && t !== prev) {
    try {
      history.pushState({ tab: t }, "", "#/" + t);
    } catch (e) {
      report(e, "ux.js: goUxEnd");
    }
  }
  if (UX_SCR[t] && typeof scrollTo === "function") scrollTo(0, UX_SCR[t]);
}
let UX_LAST = null,
  UX_RESUME = null;
const UX_NORES = [
  "start",
  "addperson",
  "edit",
  "reset",
  "uxundo",
  "retgo",
  "uxresume",
  "close",
  "tab",
  "glossary",
  "info",
  "menu",
  "people",
];
/* Part of sheet() in ui.js. "was" is true when a sheet was open before.
   Records the action for "pick up where you left off", adds one step to the browser history, and draws the chips again. */
function sheetUx(fn, was) {
  if (!was && UX_LAST && !G.demo && !UX_NORES.includes(UX_LAST.a) && ACT[UX_LAST.a]) {
    G.last = {
      tab,
      a: UX_LAST.a,
      v: UX_LAST.v,
      k: UX_LAST.k,
      title: uxTitle(fn) || "what you were doing",
      d: todayISO(),
      open: true,
    };
    saveQuiet();
  }
  if (uxHist && !was && !UX_POP) {
    try {
      history.pushState({ tab, sheet: 1 }, "", "#/" + tab + "/open");
    } catch (e) {
      report(e, "ux.js: sheetUx");
    }
  }
  uxChip();
}
/* Part of closeSheet() in ui.js. "was" is true when a sheet was open.
   Clears the note "pick up where you left off", goes one step back in the browser history, and draws the chips again. */
function closeSheetUx(was) {
  if (was && G.last && G.last.open) {
    G.last.open = false;
    saveQuiet();
  }
  if (uxHist && was && !UX_POP && history.state && history.state.sheet) {
    UX_POP = true;
    UX_BACKS++;
    try {
      history.back();
    } catch (e) {
      UX_BACKS = 0;
      report(e, "ux.js: closeSheetUx");
    }
    setTimeout(() => {
      UX_POP = false;
    }, 60);
    setTimeout(() => {
      UX_BACKS = 0; /* a step back that never arrived must not count for ever */
    }, 1500);
  }
  uxChip();
}
/* THE BROWSER WENT ONE STEP BACK (the Back button of the browser, or the game's own step in closeSheetUx).
   A Menu row closes the menu and opens its sheet, or goes to its tab, in one tap. The game's own step back
   for the menu arrives after that. It must not close the new sheet or go back to the old tab: the game
   stays where the tap put it, and that place gets its entry in the history. */
function uxPop(e) {
  const own = UX_BACKS > 0;
  if (own) UX_BACKS--;
  if (own) {
    /* The game is where the player's tap put it. The history follows the game, not the other way round. */
    const was = (e && e.state && e.state.tab) || "";
    try {
      if (SH) history.pushState({ tab, sheet: 1 }, "", "#/" + tab + "/open");
      else if (was && was !== tab) history.pushState({ tab }, "", "#/" + tab); /* a Menu row that goes to a tab */
    } catch (x) {
      report(x, "ux.js: uxPop");
    }
    uxChip();
    return;
  }
  UX_POP = true;
  try {
    if (SH) {
      closeSheetQuiet();
      render();
    } else {
      const t = (e.state && e.state.tab) || (location.hash.match(/^#\/([a-z]+)/) || [])[1] || "home";
      if (UX_TABS.some(x => x[0] === t) || t === "play" || t === "map") {
        tab = t;
        render();
      }
    }
  } finally {
    UX_POP = false;
  }
  uxChip();
}
if (uxHist) {
  addEventListener("popstate", uxPop);
  try {
    const t = (location.hash.match(/^#\/([a-z]+)/) || [])[1];
    if (t && (UX_TABS.some(x => x[0] === t) || t === "play" || t === "map")) tab = t;
    history.replaceState({ tab }, "", "#/" + tab);
  } catch (e) {
    report(e, "ux.js: page load (1)");
  }
}
/* back to where you were */
function uxTitle(fn) {
  try {
    const m = String(fn()).match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    return m
      ? m[1]
          .replace(/<[^>]+>/g, "")
          .trim()
          .slice(0, 28)
      : "";
  } catch (e) {
    return "";
  }
}
function uxKeep(fromTab) {
  const el = typeof document !== "undefined" && document.querySelector ? document.querySelector(".sheet") : null;
  const keepW = W,
    keepSH = SH;
  UX_RET = { SH: keepSH, W: keepW, tab: fromTab, sc: (el && el.scrollTop) || 0, title: "" };
  const cur = W;
  W = keepW;
  UX_RET.title = uxTitle(keepSH) || "what you were doing";
  W = cur;
}
function uxChip() {
  if (typeof document === "undefined" || !document.body || !document.createElement) return;
  let el = document.getElementById("uxchip");
  if (!el) {
    el = document.createElement("div");
    el.id = "uxchip";
    document.body.appendChild(el);
  }
  const r = UX_RET,
    u = UX_UNDO;
  const z = UX_RESUME;
  el.innerHTML =
    (z && !SH
      ? `<div class="retwrap"><button class="retchip" data-a="uxresume">← Pick up where you left off: ${esc(z.title)}</button><button class="retx" data-a="retx" aria-label="Dismiss">✕</button></div>`
      : "") +
    (u ? `<div class="toast"><span>${esc(u.msg)}</span><button data-a="uxundo">Undo</button></div>` : "") +
    (r && SH !== r.SH
      ? `<div class="retwrap"><button class="retchip" data-a="retgo">← Back to ${esc(r.title)}</button><button class="retx" data-a="retx" aria-label="Dismiss">✕</button></div>`
      : "");
}
/* undo instead of "are you sure" */
function uxUndoable(name, msg) {
  const f = ACT[name];
  if (!f) return;
  ACT[name] = t => {
    const snap = JSON.stringify(G),
      m = msg(t);
    f(t);
    if (JSON.stringify(G) !== snap) {
      UX_UNDO = { snap, msg: m, at: Date.now() };
      uxChip();
      if (typeof setTimeout === "function")
        setTimeout(() => {
          if (UX_UNDO && Date.now() - UX_UNDO.at >= 5900) {
            UX_UNDO = null;
            uxChip();
          }
        }, 6000);
    }
  };
}
uxUndoable("fsave", () => "Logged " + money((W && W.o && W.o.amt) || 0));
uxUndoable("rowdel", () => "Removed");
uxUndoable("gdel", () => "Goal removed");
uxUndoable("rdel", () => "Removed");
uxUndoable("swcut", () => "Taken off your bills");
/* Part of drawSheetOnce() in ui.js. The button "Close" at the top becomes "Back". Adds the button "Look up a word" at the bottom. */
function drawSheetUx() {
  if (typeof document === "undefined" || !document.querySelector) return;
  const sh = document.querySelector("#ov .sheet");
  if (sh) {
    const cb = sh.querySelector('.row.between>[data-a="close"]');
    if (cb && cb.textContent.trim() === "Close") {
      cb.textContent = "‹ Back";
      cb.classList.add("backbtn");
      cb.parentNode.classList.add("backrow");
    }
  }
  if (
    sh &&
    SH &&
    sh.insertAdjacentHTML &&
    !(UX_RET && SH !== UX_RET.SH) &&
    !sh.querySelector(".lookup") &&
    !/^\s*(Glossary|What it means)/.test(sh.innerText || "")
  )
    sh.insertAdjacentHTML(
      "beforeend",
      '<button class="ghost wide slim lookup" data-a="glossary">Look up a word</button>'
    );
}
/* Part of save() in ui.js. Shows the mark "Saved" for a moment. */
function saveFlash() {
  if (typeof document !== "undefined" && document.getElementById) {
    const el = document.getElementById("uxsaved");
    if (el) {
      el.className = "show";
      clearTimeout(save.t);
      save.t = setTimeout(() => {
        el.className = "";
      }, 1200);
    }
  }
}
/* Part of celebrate() in ui.js. Makes a short vibration on a phone. */
function celebrateBuzz() {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(12);
  } catch (e) {
    report(e, "ux.js: celebrateBuzz");
  }
}
/* Part of render() in ui.js, step 1 of 2. A new player (the sample game) stays on Home. Returns true for a new player. */
function renderUxStart() {
  const wel = G.demo && UX_NOSAMPLE;
  if (wel && tab !== "home") tab = "home";
  return wel;
}
/* Part of render() in ui.js, step 2 of 2. Sets the page marks (welcome, color, expert), fills the tab bar, makes the mark "Saved", and draws the chips. */
function renderUxEnd(wel) {
  if (typeof document !== "undefined" && document.body && document.body.classList) {
    document.body.classList.toggle("welcome", !!wel);
    if (document.body.dataset) document.body.dataset.color = G.color == null ? "midnight" : G.color;
  }
  try {
    const c = C(),
      t = todayISO(),
      tb = $("#tabs");
    if (tb) tb.innerHTML = uxTabs(!G.demo && (c.lastDaily !== t || (c.payKnown && t >= c.payNext)));
  } catch (e) {
    report(e, "ux.js: renderUxEnd");
  }
  if (typeof document !== "undefined" && document.body && document.body.classList) {
    document.body.classList.toggle("expert", !!G.expert);
    if (!document.getElementById("uxsaved")) {
      const s = document.createElement("div");
      s.id = "uxsaved";
      document.body.appendChild(s);
    }
    /* the sample game is not saved, so the chip must not say "Saved" */
    const sv = document.getElementById("uxsaved");
    if (sv) sv.textContent = G.demo ? "Sample · not saved" : "Saved ✓";
  }
  uxChip();
}
Object.assign(GLOSS, {
  bige: [
    "Big E",
    "A big emergency: losing a job, a medical emergency, replacing the car. Well over $1,000, and it can run for months. Your full cushion, the months of spending you set aside, is what covers a Big E.",
  ],
  littlee: [
    "Little e",
    "A small emergency, under about $1,000: a flat tire, a vet visit, a broken phone. Your first $1,000 is there so a little e never has to go on a card.",
  ],
  gce: [
    "Guess, Close, Exact",
    "Every number is one of three things. A Guess is the game's starting point for someone like you. Close is what you told it by tapping. Exact is a number you typed or one from a statement.",
  ],
  bigpic: [
    "The big picture",
    "The map of eras, regions and skill trees. It's the same list as Next Steps, drawn as a journey. You never need it to play.",
  ],
});
Object.assign(ACT, {
  bigpic: () => {
    go(tab === "map" ? "plan" : "map");
  },
  homemore: () => {
    HOME_MORE = true;
    render();
  },
  memore: () => {
    ME_MORE = true;
    render();
  },
  tipok: t => {
    G.tips = G.tips || {};
    G.tips[t.dataset.v] = 1;
    save();
    render();
  },
  expert: t => {
    G.expert = t.dataset.v === "1";
    save();
    render();
  },
  whatdo: () => {
    const c = C(),
      ns = nextStep(c, D);
    UX_HINT = SH
      ? "Tap the bright button at the bottom of this card."
      : tab === "plan"
        ? "Do the first thing on the list. Tap it to open it."
        : tab === "map"
          ? "Nothing you have to do here. Tap a place to look around."
          : tab === "home"
            ? "Tap the glowing button: " + (ns.l || ns.t) + "."
            : tab === "money"
              ? "Tap any line to change it. Start with a faded one."
              : tab === "goals"
                ? "Tap a goal to see its date, or add one."
                : tab === "play"
                  ? "If you got paid, tap the payday card. If not, do the one-minute check."
                  : "Nothing you have to do here. This is where your look and your profile live.";
    render();
    if (typeof document !== "undefined" && document.querySelector) {
      const el = document.querySelector("#app .primary, #app .go");
      if (el && el.classList) {
        el.classList.remove("hey");
        void el.offsetWidth;
        el.classList.add("hey");
        if (el.scrollIntoView) el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  },
  months: () => {
    W = { kind: "months" };
    sheet(monthsSheet);
  },
  color: t => {
    G.color = t.dataset.v;
    save();
    render();
  },
  clretry: () => {
    if (typeof clStart === "function") {
      CLOUD.st = "connecting";
      render();
      clStart();
    }
  },
  retx: () => {
    UX_RET = null;
    UX_RESUME = null;
    uxChip();
  },
  uxresume: () => {
    const z = UX_RESUME;
    UX_RESUME = null;
    if (!z || !ACT[z.a]) return;
    if (z.tab && z.tab !== tab) go(z.tab);
    ACT[z.a]({ dataset: { a: z.a, v: z.v, k: z.k } });
    if (typeof questSpotUse === "function") questSpotUse(z.a, z.v); /* questlog.js: the exact spot */
    uxChip();
  },
  pmusnext: () => {
    const c = C(),
      o = W && W.o;
    if (!o) return;
    const un = MUSCLES.map((m, i) => i).filter(i => !c.muscles[i]);
    if (un.length) {
      o.muscle = un[(un.indexOf(o.muscle) + 1) % un.length];
      o.mdone = false;
    }
    drawSheet();
  },
  uxpaid: () => {
    const c = C();
    closeSheetQuiet();
    if (c.payKnown && todayISO() >= c.payNext) ACT.payday({ dataset: { v: "" } });
    else ACT.paidtoday({ dataset: {} });
  },
  uxundo: () => {
    const u = UX_UNDO;
    if (!u) return;
    G = JSON.parse(u.snap);
    UX_UNDO = null;
    saveQuiet();
    if (SH) closeSheetQuiet();
    render();
  },
  retgo: () => {
    const r = UX_RET;
    if (!r) return;
    UX_RET = null;
    UX_POP = true;
    try {
      tab = r.tab;
      W = r.W;
      sheetBase(r.SH);
      render();
    } finally {
      UX_POP = false;
    }
    if (typeof document !== "undefined" && document.querySelector) {
      const el = document.querySelector(".sheet");
      if (el) el.scrollTop = r.sc;
    }
    uxChip();
  },
});
(() => {
  const _info = ACT.info,
    _gl = ACT.glossary,
    keep = f => t => {
      if (SH && !(W && W.kind === "info") && !(UX_RET && SH !== UX_RET.SH)) uxKeep(tab);
      return f(t);
    };
  if (_info) ACT.info = keep(_info);
  if (_gl) ACT.glossary = keep(_gl);
})();
if (typeof document !== "undefined" && document.addEventListener)
  document.addEventListener(
    "click",
    e => {
      const t = e.target && e.target.closest ? e.target.closest("[data-a]") : null;
      if (t && !SH) UX_LAST = { a: t.dataset.a, v: t.dataset.v, k: t.dataset.k };
    },
    true
  );
try {
  const L = G.last;
  if (L && L.open && !G.demo && ACT[L.a] && daysBetween(L.d, todayISO()) <= 2) UX_RESUME = L;
} catch (e) {
  report(e, "ux.js: page load (2)");
}
if (typeof setInterval === "function" && typeof document !== "undefined" && document.body && document.body.classList) {
  let lastSt = null;
  setInterval(() => {
    if (typeof CLOUD === "undefined" || CLOUD.st === lastSt) return;
    lastSt = CLOUD.st;
    if (G.demo && UX_NOSAMPLE && !SH) render();
  }, 400);
}
var UX_ON = true;
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();

/* ONE TAP, ONE ANSWER (UX pass, item 1). A tap on an answer that moves the sheet on (a range chip, "Yes, about")
   drew the next question under the same finger. A fast second tap then answered the next question with the same
   amount, so a guess of $3,000 could become $8,000 of categories. Two rules:
   1. A tap that arrives soon after a tap that moved the screen on is dropped (uxTapDrop).
   2. A tap that changes the money gets Undo (uxTapUndoStart, uxTapUndoEnd). */
const UX_TAP_GAP = 450;
const UX_TAP_UNDO = {
  sharpdone: "Answer saved",
  askyes: "Answer saved",
  askset: "Answer saved",
  allocall: "Total changed",
  alpick: "Total changed",
  rowsave: "Changed",
};
let UX_TAP = null;
/* The place of the open screen: a tap that changes it "moved on". */
function uxTapSpot() {
  const w = typeof W !== "undefined" && W ? W : {};
  return [typeof SH !== "undefined" && SH ? SH.name : "", w.kind, w.q, w.i, w.st, w.step, w.sti].join("|");
}
/* Pure rule: drop the tap when the last tap moved the screen on less than gap ms ago. */
function uxTapDropRule(last, now, gap) {
  return !!last && last.moved && now - last.at < (gap || UX_TAP_GAP);
}
/* Part of the click handler in ui.js. True: drop this tap. */
function uxTapDrop() {
  return uxTapDropRule(UX_TAP, Date.now());
}
/* Part of the click handler in ui.js, before the action. */
function uxTapStart(name) {
  return { name, spot: uxTapSpot(), snap: UX_TAP_UNDO[name] && typeof G !== "undefined" ? JSON.stringify(G) : null };
}
/* Part of the click handler in ui.js, after the action: record if the screen moved on, offer Undo. */
function uxTapEnd(s) {
  try {
    UX_TAP = { at: Date.now(), moved: uxTapSpot() !== s.spot };
    if (s.snap && JSON.stringify(G) !== s.snap) {
      UX_UNDO = { snap: s.snap, msg: UX_TAP_UNDO[s.name], at: Date.now() };
      uxChip();
      if (typeof setTimeout === "function")
        setTimeout(() => {
          if (UX_UNDO && Date.now() - UX_UNDO.at >= 5900) {
            UX_UNDO = null;
            uxChip();
          }
        }, 6000);
    }
  } catch (e) {
    report(e, "ux.js: uxTapEnd");
  }
}
