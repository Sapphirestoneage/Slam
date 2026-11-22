/* ============================================================================
   SLAM the Game: core/report.js
   PURPOSE     One function, report(e, where), records each error that a catch block stops. Before
               2026-11-22 the code dropped these errors, and a defect could stay hidden.
   INPUT       report(e, where). e is the error. where is the file and the function, for example
               "cloud.js: clPush".
   OUTPUT      1 function.
   DEPENDS ON  Nothing. The browser loads this file first.
   RULES       report() shows nothing to the player and changes no game data. report() must not throw.
               To read the records, type ERRLOG in the browser console. To print each record when it
               occurs, type SLAM_DEBUG = true.
   STATE       ERRLOG (the last 100 records: at, where, msg).
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
