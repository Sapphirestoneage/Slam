/* ============================================================================
   SLAM the Game: account/liveflag.js
   PURPOSE     The ONE switch of Live Session Mode (a coaching call that fills the client's profile while
               the two talk). While LIVE_SESSION_READY is false: the coach page shows the two buttons as a
               calm "Coming soon" card, the session page (session.html) shows the card "Coming soon", no
               player sees any part of the feature, and nothing of it runs. This file also keeps the token
               of an invite link on the device, so the token is not lost when the person confirms the
               email (the same way as ?coach=1 and ?ref= in supa.js).
   INPUT       The address of the page (?invite=token). The browser storage: slam_live_invite.
   OUTPUT      The switch LIVE_SESSION_READY. Functions: liveOn, liveTokenClean, liveTokenKeep, liveToken,
               liveTokenDone, liveBack.
   DEPENDS ON  core/report.js. index.html, coach.html and session.html load this file.
   RULES       Set the switch to true only when the tests of the last part of the build pass and the
               owner ran supabase/migrations/20261125210000_live_sessions.sql. The tests set it on by
               themselves. A token is letters and digits only, thus a link cannot carry anything else.
   STATE       LIVE_SESSION_READY. The browser storage: slam_live_invite.
   ========================================================================= */
let LIVE_SESSION_READY = false;
const LIVE_KEY = "slam_live_invite";
/* True when Live Session Mode is switched on. Each way into the feature asks this first. */
function liveOn() {
  return LIVE_SESSION_READY === true;
}
/* The token of a link, or "" when the text is not a token. */
function liveTokenClean(s) {
  const t = String(s == null ? "" : s).trim();
  return /^[A-Za-z0-9]{32,80}$/.test(t) ? t : "";
}
/* Read ?invite= from the address and keep it on this device. Returns the token of the address, or "". */
function liveTokenKeep(search, store) {
  if (!liveOn()) return "";
  try {
    const t = liveTokenClean(new URLSearchParams(search || "").get("invite"));
    if (t && store) store.setItem(LIVE_KEY, t);
    return t;
  } catch (e) {
    report(e, "liveflag.js: liveTokenKeep");
    return "";
  }
}
/* The token that waits on this device, or "". */
function liveToken(store) {
  if (!liveOn()) return "";
  try {
    return store ? liveTokenClean(store.getItem(LIVE_KEY)) : "";
  } catch (e) {
    report(e, "liveflag.js: liveToken");
    return "";
  }
}
/* The token has done its work: the account used it, or the link cannot be used. */
function liveTokenDone(store) {
  try {
    if (store) store.removeItem(LIVE_KEY);
  } catch (e) {
    report(e, "liveflag.js: liveTokenDone");
  }
}
/* The game (index.html) calls this when the page loads. The link in the confirmation email can lead to the
   game and not to the session page. When an invite waits on this device, go to the session page: it uses
   the invite and opens the room. Returns the address it goes to, or "" when it does nothing. */
function liveBack(loc, store) {
  if (!liveOn() || !loc || !store) return "";
  const t = liveToken(store);
  if (
    !t ||
    /session\.html$/.test(loc.pathname || "") ||
    /coach\.html$|admin\.html$|privacy\.html$/.test(loc.pathname || "")
  )
    return "";
  const to = String(loc.pathname || "").replace(/[^/]*$/, "") + "session.html" + (loc.search || "") + (loc.hash || "");
  if (typeof loc.replace === "function") loc.replace(to);
  return to;
}
if (typeof location !== "undefined" && typeof localStorage !== "undefined") liveBack(location, localStorage);
