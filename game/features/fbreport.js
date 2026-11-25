/* ============================================================================
   SLAM the Game: features/fbreport.js
   PURPOSE     Report a bug or idea, from each screen. One button "Report" in the top bar of each tab, at
               the end of each sheet, on the welcome screen and on the sign-in screen. One sheet: tap Bug,
               Idea or Confusing, a note and a picture if the player wants. The report carries the screen
               name, the last 3 taps, the device, the width and the app version. It replaces "Flag this
               screen": the old flags (G.flags) stay readable under Me. When the admin marks a report
               Fixed, the player sees one note on Home, one time.
   INPUT       The game: G.flags, G.rpTold. The open sheet (W.kind) and the tab. The list on the device
               (localStorage, RP_STORE). The account (SUPA) for the sending. The address: ?at=<screen>,
               next to ?as=<owner>, from the admin inbox.
   OUTPUT      Functions: fbScreen, fbVersion, fbFacts, fbTap, fbBtn, fbOpen, fbSendNow, fbFlushNow,
               fbStart, fbAtGo. Parts of functions in other files: topbarReport (topbarHTML in
               planner.js), sheetReportRow (drawSheetBase in ui.js), welcomeReport (welcome in ux.js),
               meReports (meTab in ui.js), homeReportFixed (home in ui.js), renderReportAt (render in
               ui.js). Actions (ACT): fbgot. The action "flag" (ui.js) opens this sheet.
   DEPENDS ON  core/report.js, core/reportcore.js, screens/ui.js, account/supa.js, features/reveal.js
               (homeRowAdd).
   RULES       A report carries no money number: the names of screens and buttons only, never a value.
               The picture is chosen by the player. Nothing takes a picture of the screen by itself.
               Before the database file runs (supabase/migrations/20261125190000_reports.sql), a report
               stays on the device, and the sheet says so.
   STATE       FB (taps, fixed, at, q).
   ========================================================================= */
const FB = { taps: [], fixed: [], at: null, q: null, atDone: false };
const FB_TABS = ["home", "plan", "money", "map", "goals", "me", "play"];
const fbHasDoc = () => typeof document !== "undefined" && typeof document.createElement === "function";
const fbLS = () => (typeof localStorage !== "undefined" ? localStorage : null);

/* The name of the screen the player is on: the tab, and the open sheet. Names only. */
function fbScreen() {
  try {
    if (typeof document !== "undefined" && document.getElementById && document.getElementById("su-gate"))
      return "sign-in";
    if (typeof document !== "undefined" && document.body && document.body.classList.contains("welcome") && !SH)
      return "welcome";
  } catch (e) {
    report(e, "fbreport.js: fbScreen");
  }
  const t = typeof tab === "string" ? tab : "home",
    k = typeof W !== "undefined" && W && W.kind ? W.kind : typeof SH !== "undefined" && SH ? "sheet" : "";
  return t + (k ? " > " + k : "");
}
/* The app version: one code from the content stamps of the scripts of this page. */
function fbVersion() {
  if (typeof document === "undefined" || !document.querySelectorAll) return "";
  const st = Array.prototype.slice
    .call(document.querySelectorAll("script[src]"))
    .map(s => (s.getAttribute("src") || "").match(/([a-z0-9\/-]+\.js)\?v=([0-9a-f]+)/))
    .filter(Boolean)
    .map(m => m[1] + "?" + m[2]);
  return rpVersion(st);
}
function fbFacts() {
  const d = rpDevice(
    typeof navigator !== "undefined" ? navigator.userAgent : "",
    typeof innerWidth === "number" ? innerWidth : 0
  );
  return {
    screen: fbScreen(),
    taps: FB.taps.slice(),
    width: d.width,
    device: d.device,
    browser: d.browser,
    version: fbVersion(),
  };
}
/* Records the name of one tap. The tap on "Report" is not recorded: the report shows what came before it. */
function fbTap(name) {
  if (name && name !== "flag" && name !== "fbgot") FB.taps = rpTap(FB.taps, name);
}
function fbQueue() {
  if (!FB.q) FB.q = rpLoad(fbLS());
  return FB.q;
}
/* The address, the public key and the sign-in of the account (when there is one). */
async function fbCfg() {
  const cfg = {
    url: typeof SUPA_URL === "string" ? SUPA_URL : "",
    key: typeof SUPA_KEY === "string" ? SUPA_KEY : "",
    fetch: typeof fetch === "function" ? (u, o) => fetch(u, o) : null,
    token: null,
    uid: null,
  };
  try {
    if (typeof SUPA !== "undefined" && SUPA.on && SUPA.sb) {
      const s = await SUPA.sb.auth.getSession(),
        ses = s && s.data && s.data.session;
      if (ses) {
        cfg.token = ses.access_token;
        cfg.uid = ses.user.id;
      }
    }
  } catch (e) {
    report(e, "fbreport.js: fbCfg");
  }
  return cfg;
}
/* Keeps one report on the device, then tries to send all that wait. Returns 'sent', or why it stays here. */
async function fbSendNow(o, cfg) {
  const f = o.facts || fbFacts(),
    row = rpMake(
      Object.assign({}, f, {
        type: o.type,
        note: o.note,
        shot: o.shot,
        app: "game",
        ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
      })
    );
  if (!row) return "none";
  FB.q = rpKeep(fbLS() || { setItem: () => {} }, rpQueueAdd(fbQueue(), row));
  const state = await fbFlushNow(cfg);
  if (typeof render === "function" && typeof SH !== "undefined" && !SH) render();
  return state;
}
async function fbFlushNow(cfg) {
  if (!rpPending(fbQueue()).length) return "sent";
  const r = await rpFlush(fbQueue(), cfg || (await fbCfg()));
  if (r.sent) FB.q = rpKeep(fbLS() || { setItem: () => {} }, r.q);
  return r.state;
}
/* The button. cls adds a class for the place (the top bar, a sheet). */
function fbBtn(cls) {
  return `<button type="button" class="rp-btn rp-open${cls ? " " + cls : ""}" data-a="flag">Report</button>`;
}
/* Opens the sheet over the screen. The screen under it stays as it is. */
function fbOpen() {
  if (!fbHasDoc() || !document.body) return;
  const f = fbFacts();
  rpDialog(document, Object.assign({}, f, { send: o => fbSendNow(Object.assign({ facts: f }, o)) }));
}
/* Part of topbarHTML() in planner.js. The button "Report" in the top bar, on each tab. */
function topbarReport() {
  return fbBtn("rp-top");
}
/* Part of drawSheetBase() in ui.js. The button "Report" at the end of each sheet. */
function sheetReportRow() {
  return `<div class="rp-sheetrow">${fbBtn()}</div>`;
}
/* Part of welcome() in ux.js. The button "Report" under the welcome card. */
function welcomeReport() {
  return `<div class="rp-sheetrow">${fbBtn()}</div>`;
}
/* Part of meTab() in ui.js. The reports made on this device, and the screens flagged before (G.flags). */
function meReports() {
  const q = fbQueue(),
    old = G.flags || [],
    fixed = FB.fixed.map(r => r.id),
    line = x =>
      `<div class="small">${esc(nice(String(x.row.made_at).slice(0, 10)))} · ${esc(x.row.screen)} · <b>${esc(rpTypeLabel(x.row.type))}</b> · ${fixed.includes(x.row.id) ? "Fixed" : x.state === "sent" ? "Sent" : "Saved on this device"}</div>`;
  return `<details><summary>Your reports (${q.length + old.length})</summary><div class="inner stack">${
    q.length || old.length
      ? q.map(line).join("") +
        old
          .map(f => `<div class="small">${nice(f.d)} · ${esc(f.where)} · <b>${esc(f.kind)}</b> · Flagged</div>`)
          .join("") +
        (rpPending(q).length
          ? `<div class="tiny muted">The ones saved on this device send themselves when the report inbox is ready.</div>`
          : "")
      : `<div class="small muted">Tap "Report" at the top of any screen.</div>`
  }</div></details>`;
}
/* Part of home() in ui.js. One calm note for each report the admin marked Fixed, shown one time. */
function homeReportFixed(h) {
  try {
    if (typeof SUPA !== "undefined" && SUPA.as) return h;
    const fresh = rpFixedNew(FB.fixed, G.rpTold);
    if (!fresh.length || typeof homeRowAdd !== "function") return h;
    const r = fresh[0],
      more = fresh.length - 1;
    return homeRowAdd(
      h,
      `<div class="tile small row between homerow rp-fixed" style="border:2px solid var(--a3)"><span><b>${esc(RP_SAID.fixed)}</b><br><span class="tiny muted">${esc(rpTypeLabel(r.type))} on ${esc(r.screen || "a screen")}${more ? ", and " + more + " more" : ""}</span></span><button class="ghost slim" data-a="fbgot">Got it</button></div>`
    );
  } catch (e) {
    report(e, "fbreport.js: homeReportFixed");
    return h;
  }
}
/* Opens the screen named in a report: the tab, then the sheet. Returns what it opened. */
function fbAtGo(at) {
  const w = rpWhere(at),
    a = w.kind === "setup" ? "start" : w.kind;
  if (FB_TABS.includes(w.tab) && typeof go === "function") go(w.tab);
  if (a && a !== "sheet" && Object.prototype.hasOwnProperty.call(ACT, a) && typeof ACT[a] === "function") {
    try {
      ACT[a]({ dataset: { a, v: "", k: "" } });
      return w.tab + " > " + a;
    } catch (e) {
      report(e, "fbreport.js: fbAtGo");
    }
  }
  return w.tab;
}
/* Part of render() in ui.js. The admin opened this game from a report: go to that screen, one time, after the
   game of the person has loaded. */
function renderReportAt() {
  if (!FB.at || FB.atDone || typeof SUPA === "undefined" || !SUPA.as) return;
  if (typeof CLOUD !== "undefined" && CLOUD.st === "connecting") return;
  FB.atDone = true;
  const at = FB.at;
  try {
    sessionStorage.removeItem("rp_at");
  } catch (e) {
    report(e, "fbreport.js: renderReportAt");
  }
  setTimeout(() => fbAtGo(at), 0);
}
/* At page load: send what waits, and ask which reports were fixed. */
async function fbStart() {
  try {
    if (typeof SUPA !== "undefined" && SUPA.ready) await SUPA.ready;
    const cfg = await fbCfg();
    await fbFlushNow(cfg);
    if (cfg.token && !(typeof SUPA !== "undefined" && SUPA.as)) {
      FB.fixed = await rpFixedFetch(cfg);
      if (rpFixedNew(FB.fixed, G.rpTold).length && typeof render === "function" && !SH) render();
    }
  } catch (e) {
    report(e, "fbreport.js: fbStart");
  }
}
Object.assign(ACT, {
  fbgot: () => {
    G.rpTold = (G.rpTold || []).concat(FB.fixed.map(r => r.id)).slice(-200);
    save();
    render();
  },
});
(() => {
  if (!fbHasDoc()) return;
  try {
    rpStyle(document, {
      bg: "var(--panel)",
      text: "var(--text)",
      line: "var(--muted)",
      a: "var(--a1)",
      muted: "var(--muted)",
      in: "var(--panel2)",
    });
    const q = new URLSearchParams(location.search).get("at");
    if (q) sessionStorage.setItem("rp_at", q);
    FB.at = sessionStorage.getItem("rp_at");
  } catch (e) {
    report(e, "fbreport.js: page load");
  }
  document.addEventListener(
    "click",
    e => {
      const t = e.target && e.target.closest ? e.target.closest("[data-a]") : null;
      if (t) fbTap(t.dataset.a);
    },
    true
  );
  if (typeof addEventListener === "function") addEventListener("online", () => fbFlushNow());
  fbStart();
})();
