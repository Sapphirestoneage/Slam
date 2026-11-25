/* ============================================================================
   SLAM the Game: core/soon.js
   PURPOSE     A part of the game that is not ready must never show as a broken or blank screen. This
               file has the one card "Coming soon" and the three safe ways into the game's code: a tap
               (soonTap), the HTML of one screen (soonDraw) and a full draw (soonRun). A tap with no
               action, and a screen that throws while it draws, both end in the card.
   INPUT       soonTap(name, t): name is the data-a value of the tapped button, t is the button.
               soonDraw(fn, where): fn returns the HTML of a sheet or a tab. soonRun(fn, where, el):
               fn draws something, el is the selector to put the card in when fn throws.
   OUTPUT      8 functions. The tap "soonclose" (the button of the card) is handled here, not in ACT,
               thus the card can close when the actions themselves are damaged.
   DEPENDS ON  core/report.js. The browser loads this file second.
   USES LATER  Names from files that the browser loads later, each behind a typeof test: ACT, SH, W, tab,
               sheet, closeSheet, render (screens/ui.js).
   RULES       The card hides nothing. Each stopped error goes to report() (ERRLOG) first. Then, by
               SOON_AFTER: "later" (the game in a browser) throws the same error again after the card
               is on the screen, so the browser console and each test tool that listens for page
               errors still see it. "now" (tests/harness.cjs) throws at once and shows no card, so a
               test fails on a real defect. "none" shows the card only (the tests of this file).
   STATE       SOON_AFTER. SOON_N (how many times the card was shown since the page loaded).
   ========================================================================= */
let SOON_AFTER = "later",
  SOON_N = 0;
/* The card. It says what is true and what the player can do. No error text, no blame. */
function soonHTML() {
  return `<div class="card stack soon" role="status"><div class="eyebrow">Coming soon</div><h2>This part is not ready yet</h2><div class="small muted">Nothing of yours changed, and the rest of the game works as before.</div><div class="row"><button class="primary" data-a="soonclose">Back to the game</button></div></div>`;
}
/* The same calm words for one part inside a screen that is built but waits (first use: the phone scripts of
   Recalculating, until the owner has read them). A tag, the title of the part, and one line. No button. */
function soonPart(title, line) {
  const e = s =>
    String(s == null ? "" : s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]);
  return `<div class="tile small soonpart" role="note" style="border-style:dashed"><span class="pill">Coming soon</span> <b>${e(title)}</b><div class="tiny muted" style="margin-top:4px">${e(line)}</div></div>`;
}
/* The sheet with the card. */
function soonSheet() {
  return soonHTML();
}
/* Record the error, then go on by SOON_AFTER. Returns only when the card must show. */
function soonNote(e, where) {
  report(e, where);
  if (SOON_AFTER === "now") throw e;
  SOON_N++;
  if (SOON_AFTER === "later" && typeof setTimeout === "function")
    setTimeout(() => {
      throw e; /* On purpose: the error stays visible in the console and to the test tools. */
    }, 0);
}
/* Put the card on the screen as a sheet. If the sheet code itself is damaged, write the card directly. */
function soonShow() {
  try {
    if (typeof W !== "undefined") W = null;
    if (typeof sheet === "function") sheet(soonSheet); /* the usual way, so Back and the browser history work */
    else soonWrite("#ov", `<div class="overlay"><div class="sheet stack">${soonHTML()}</div></div>`);
  } catch (e) {
    report(e, "soon.js: soonShow");
    soonWrite("#ov", `<div class="overlay"><div class="sheet stack">${soonHTML()}</div></div>`);
  }
}
function soonWrite(sel, html) {
  if (typeof document === "undefined" || !document.querySelector) return;
  const el = document.querySelector(sel);
  if (el) el.innerHTML = html;
}
/* The button of the card: close the card, go to Home, draw. */
function soonClose() {
  try {
    if (typeof tab !== "undefined") tab = "home";
    if (typeof closeSheet === "function") closeSheet(); /* the usual way */
    if (typeof render === "function") render();
  } catch (e) {
    report(e, "soon.js: soonClose");
    if (SOON_AFTER === "now") throw e;
    /* The usual way is damaged: take the card off directly. */
    if (typeof SH !== "undefined") SH = null;
    if (typeof W !== "undefined") W = null;
    soonWrite("#ov", "");
  }
}
/* ONE TAP. The click handler and the menu send each tap through here.
   Returns true when the action ran, false when the card was shown. */
function soonTap(name, t) {
  if (name === "soonclose") {
    soonClose();
    return true;
  }
  const f = typeof ACT !== "undefined" && ACT ? ACT[name] : null;
  if (typeof f !== "function") {
    soonNote(new Error('No action for the tap "' + name + '"'), "soon.js: soonTap");
    soonShow();
    return false;
  }
  try {
    const r = f(t);
    /* An action that waits (sign-in, save): its late error is recorded and stays visible. No card: a late
       error is most often the network, not a part that is not built. */
    if (r && typeof r.then === "function")
      r.then(null, e => {
        report(e, "soon.js: soonTap " + name + " (late)");
        throw e;
      });
    return true;
  } catch (e) {
    soonNote(e, "soon.js: soonTap " + name);
    soonShow();
    return false;
  }
}
/* THE HTML OF ONE SCREEN. Returns fn(), or the card when fn throws or returns no text. */
function soonDraw(fn, where) {
  const at = where + (fn && fn.name ? " " + fn.name : "");
  try {
    const h = fn();
    if (typeof h === "string") return h;
    throw new Error("The screen returned no HTML");
  } catch (e) {
    soonNote(e, at);
    return soonHTML();
  }
}
/* A FULL DRAW. Runs fn(). When fn throws, the card goes into the element sel. */
function soonRun(fn, where, sel) {
  try {
    return fn();
  } catch (e) {
    soonNote(e, where);
    soonWrite(sel, soonHTML());
  }
}
