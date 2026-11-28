/* ============================================================================
   SLAM the Game: features/tour.js
   PURPOSE     The guided tour (run CC-1, item 17, Nov 27 2026). About 90 seconds, on Home, with no video: a
               small card names one place of the screen in one line, that place pulses, and the player taps
               Next. Nine stops. Skip the tour ends it at any stop. Home offers it one time to a new
               player, and the menu row "Take the tour" starts it again at any time. It takes the place of
               the three-card tour that was in features/drills.js.
   INPUT       The page (the parts of Home, of the top bar and of the bar at the bottom), G.tourSeen (the
               day the tour was finished or skipped), the open profile (c.led: setup is done).
   OUTPUT      Data: TOUR (the stops). Functions: tourStops, tourFind, tourHtml, tourPaint, tourEnd.
               Parts of functions in other files: homeTourRow (home in ui.js), tourKeep (renderUxEnd in
               ux.js, closeSheet in ui.js), tourPause (sheet in ui.js). Actions (ACT): tour, tournext,
               tourback, tourdone. The menu row "Take the tour". State: TOUR_ST.
   DEPENDS ON  core/report.js, core/engine.js (todayISO), screens/ui.js (ACT, G, C, esc, save, render, go,
               closeSheet, homeRowAdd, GLOSS), screens/planner.js (MENU).
   RULES       ONE PULSE. While the tour runs, the body has the class "touring": the style sheet of
               index.html stops every other pulse (.go, .pulse, .cbnext), and only the place of the stop
               (class "tourpulse") pulses. The button Next does not pulse. The tour changes no number and
               asks nothing. A stop whose place is not on the screen (for example My number after the
               first week) is left out, so the count is always true. A sheet that opens hides the card
               until it closes. The tour keeps nothing but the day it ended (G.tourSeen, as before).
   STATE       TOUR_ST { on, i, el }: not saved.
   ========================================================================= */
/* The stops. sel: the place on the page (a CSS selector; the first match). t: the name. l: one line. */
const TOUR = [
  {
    id: "nums",
    sel: "#app .dkstats",
    t: "Your four numbers",
    l: "Your money at a glance. Tap a number to open it, or its i to read what it means.",
  },
  {
    id: "math",
    sel: "#app details.math > summary",
    t: "Show the math",
    l: "Every number opens to its math. The rates the game assumes are in there, and you can change them.",
  },
  {
    id: "win",
    sel: '#app [data-fid="rs:win"] .dkhead',
    t: "Your next win",
    l: "One thing to do next. This card always holds it.",
  },
  {
    id: "plan",
    sel: '#tabs [data-v="plan"]',
    t: "Next Steps",
    l: "Your moves, in order. The badge counts what is open today.",
  },
  {
    id: "money",
    sel: '#tabs [data-v="money"]',
    t: "My Money",
    l: "Every number the game uses lives here. Change one, and the game recalculates.",
  },
  {
    id: "number",
    sel: '#tabs [data-fid="fw:number"]',
    t: "My number",
    l: "Your FI number, and how much smaller it could be.",
  },
  {
    id: "menu",
    sel: '.topbar [data-a="menu"]',
    t: "The menu",
    l: "Everything else. It starts short, and a tool stays in it once you use it.",
  },
  {
    id: "back",
    sel: '.topbar [data-a="navback"]',
    t: "Back and forward",
    l: "They work on every screen. Your game saves by itself as you go.",
  },
  {
    id: "report",
    sel: ".topbar .rp-open",
    t: "Report",
    l: "Something looks off, or you have an idea? This tells Eli, with the name of the screen.",
  },
];
const TOUR_ST = { on: false, i: 0, el: null };
const tourDoc = () => typeof document !== "undefined" && typeof document.querySelector === "function";
/* The place of one stop on the page, or null. */
function tourFind(S) {
  try {
    return tourDoc() && S ? document.querySelector(S.sel) : null;
  } catch (e) {
    report(e, "tour.js: tourFind");
    return null;
  }
}
/* The stops of this player, now: each stop whose place is on the page. With no page (the tests), every stop. */
function tourStops() {
  if (!tourDoc()) return TOUR.slice();
  const L = TOUR.filter(S => tourFind(S));
  return L.length ? L : TOUR.slice();
}
/* The card of one stop, as HTML. i: the stop, from 0. L: tourStops(). */
function tourHtml(i, L) {
  const S = L[i],
    last = i === L.length - 1;
  return `<div class="tourin" role="dialog" aria-label="The tour" data-fid="tour:card" data-stop="${S.id}"><div class="row between" style="gap:8px"><b>${esc(S.t)}</b><span class="tiny muted" data-fid="tour:count">Stop ${i + 1} of ${L.length}</span></div><div class="small" data-fid="tour:line">${esc(S.l)}</div>${last ? `<div class="tiny muted">That is the tour. To see it again: the menu, Take the tour.</div>` : ""}<div class="row tourbtns" style="gap:8px">${last ? "" : `<button class="ghost slim" data-a="tourdone">Skip the tour</button>`}${i > 0 ? `<button class="ghost slim" data-a="tourback">Back</button>` : ""}<button class="primary tournext" data-a="${last ? "tourdone" : "tournext"}">${last ? "Done" : "Next"}</button></div></div>`;
}
/* Draw the stop: the card, and the pulse on its place. move: true brings the place into view. */
function tourPaint(move) {
  if (!TOUR_ST.on || !tourDoc() || !document.body || !document.createElement) return;
  try {
    const L = tourStops(),
      i = Math.max(0, Math.min(TOUR_ST.i, L.length - 1)),
      at = tourFind(L[i]);
    TOUR_ST.i = i;
    if (document.querySelectorAll)
      document.querySelectorAll(".tourpulse").forEach(e => e.classList.remove("tourpulse"));
    if (!TOUR_ST.el) {
      TOUR_ST.el = document.createElement("div");
      TOUR_ST.el.id = "tourcard";
      document.body.appendChild(TOUR_ST.el);
    }
    document.body.classList.add("touring");
    let up = false;
    if (at) {
      at.classList.add("tourpulse");
      if (move && at.scrollIntoView) at.scrollIntoView({ block: "center" });
      const r = at.getBoundingClientRect ? at.getBoundingClientRect() : null;
      /* the card goes to the half of the window that the place is not in */
      up = !!r && typeof innerHeight === "number" && r.top + r.height / 2 > innerHeight / 2;
    }
    TOUR_ST.el.className = up ? "up" : "down";
    TOUR_ST.el.hidden = !!SH;
    TOUR_ST.el.innerHTML = tourHtml(i, L);
  } catch (e) {
    report(e, "tour.js: tourPaint");
  }
}
/* Part of renderUxEnd() in ux.js and of closeSheet() in ui.js. A screen that was drawn again lost the pulse: put
   it back. */
function tourKeep() {
  if (TOUR_ST.on) tourPaint(false);
}
/* Part of sheet() in ui.js. A sheet is open: the card waits. */
function tourPause() {
  if (TOUR_ST.on && TOUR_ST.el) TOUR_ST.el.hidden = true;
}
/* End the tour: the card goes, every other pulse is back. */
function tourEnd() {
  TOUR_ST.on = false;
  TOUR_ST.i = 0;
  try {
    if (tourDoc() && document.body) {
      if (document.querySelectorAll)
        document.querySelectorAll(".tourpulse").forEach(e => e.classList.remove("tourpulse"));
      if (document.body.classList) document.body.classList.remove("touring");
    }
    if (TOUR_ST.el && TOUR_ST.el.remove) TOUR_ST.el.remove();
  } catch (e) {
    report(e, "tour.js: tourEnd");
  }
  TOUR_ST.el = null;
}
Object.assign(ACT, {
  /* start the tour, from Home or from the menu: Home is the screen of every stop */
  tour: () => {
    if (SH) closeSheet();
    TOUR_ST.on = true;
    TOUR_ST.i = 0;
    if (tab !== "home") go("home");
    else render();
    if (typeof scrollTo === "function") scrollTo(0, 0);
    tourPaint(true);
  },
  tournext: () => {
    if (!TOUR_ST.on) return;
    if (TOUR_ST.i >= tourStops().length - 1) return ACT.tourdone();
    TOUR_ST.i++;
    tourPaint(true);
  },
  tourback: () => {
    if (!TOUR_ST.on || TOUR_ST.i < 1) return;
    TOUR_ST.i--;
    tourPaint(true);
  },
  /* Skip the tour, or Done on the last stop */
  tourdone: () => {
    tourEnd();
    G.tourSeen = todayISO();
    save();
    render();
  },
});
/* Part of home() in ui.js. Offers the tour one time, below the main tiles.
   The character row waits until the player sees or skips the tour. Thus Home gets only one new row at a time. */
function homeTourRow(h) {
  const c = C();
  if (G.demo || G.tourSeen || !c.led || TOUR_ST.on) return h;
  return homeRowAdd(
    h,
    `<button class="rowbtn homerow" data-a="tour"><span><b>New here? Take the 90-second tour</b><div class="tiny muted">Nine stops on this screen, one line each. Skip it any time.</div></span><span class="pill new">New</span></button>`
  );
}
if (typeof MENU !== "undefined" && Array.isArray(MENU) && !MENU.some(m => m[1] === "tour"))
  MENU.push(["Take the tour", "tour", "act", "About 90 seconds: where things are on Home, one line at a time"]);
