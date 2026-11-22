/* ============================================================================
   SLAM the Game: report.js
   PURPOSE    One function, report(e, where), records each error that a catch block stops.
              Before, the code dropped these errors, and a defect could stay hidden.
   INPUT      report(e, where). e is the error. where is the file and the function, for example
              "cloud.js: clPush".
   OUTPUT     ERRLOG: the last 100 records. Each record has the time, the place and the message.
              To read the records, type ERRLOG in the browser console.
              To print each record when it occurs, type SLAM_DEBUG = true in the browser console.
   RULES      report() shows nothing to the player and changes no game data. It cannot stop the game.
   DEPENDS ON Nothing. The browser loads this file first.
   ========================================================================= */
const ERRLOG = [];
function report(e, where) {
  try {
    ERRLOG.push({ at: new Date().toISOString(), where: String(where), msg: String(e && e.message ? e.message : e) });
    if (ERRLOG.length > 100) ERRLOG.shift();
    if (typeof window !== "undefined" && window.SLAM_DEBUG && typeof console !== "undefined")
      console.warn("[SLAM] " + where + ":", e);
  } catch (x) {
    /* No record is possible here. report() must not stop the game. */
  }
}
