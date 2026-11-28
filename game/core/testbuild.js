/* ============================================================================
   SLAM the Game: core/testbuild.js
   PURPOSE     The strip "TEST BUILD" at the top of each page of the test build. The test build is the
               same game at the address /game-next/. tools/promote.sh puts it there before it publishes
               to /game/ (docs/RELEASE.md).
   INPUT       The path of the address of the page.
   OUTPUT      2 functions: tbIsNext, tbStrip.
   DEPENDS ON  core/report.js. Each page of the game loads this file after it.
   RULES       The strip shows only when the path contains /game-next/. At /game/ this file does nothing.
               Amber, not red. The strip is not a button and covers no control.
   STATE       None.
   ========================================================================= */
/* Is this path the test build? */
function tbIsNext(path) {
  return /\/game-next(\/|$)/.test(String(path || ""));
}
/* Puts the strip at the top of the page, one time. */
function tbStrip(doc, path) {
  try {
    if (!tbIsNext(path) || !doc || !doc.body || doc.getElementById("tb-strip")) return false;
    const d = doc.createElement("div");
    d.id = "tb-strip";
    d.setAttribute("role", "note");
    d.style.cssText =
      "position:relative;z-index:1;margin:0;padding:6px 16px;text-align:center;font:700 13px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;letter-spacing:.04em;color:#f0c060;background:#1a1505;border-bottom:2px solid #f0c060";
    d.textContent = "TEST BUILD. The next version, on trial. It uses your real saved game.";
    doc.body.insertBefore(d, doc.body.firstChild);
    return true;
  } catch (e) {
    report(e, "testbuild.js: tbStrip");
    return false;
  }
}
(() => {
  if (typeof document === "undefined" || typeof location === "undefined") return;
  const go = () => tbStrip(document, location.pathname);
  if (document.body) go();
  else if (typeof document.addEventListener === "function") document.addEventListener("DOMContentLoaded", go);
})();
