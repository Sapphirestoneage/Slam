/* ============================================================================
   SLAM the Game: core/firstnum.js
   PURPOSE     Time to the first number (run CC-1, item 8, Nov 27 2026). For a new player: the seconds
               and the taps from the first screen of the game to the first real number (What it is,
               the FI number of the opening). The admin page shows the median and the longest one, next
               to the target: under 2 minutes.
   INPUT       The clock. The taps that the opening counts (CB.taps in features/couldbe.js). The build
               version (fbVersion in features/fbreport.js). Whether an account is signed in (SUPA.uid).
   OUTPUT      Data: FN_TARGET, FN_TABLE, FN_FILE. Math: fnSecs, fnMake, fnRows, fnStats, fnWords. Parts
               of functions in other files: fnDone (finishSetupCb in couldbe.js). Device and database:
               fnSend, fnFlush.
   DEPENDS ON  core/report.js. In the game also: core/reportcore.js (rpId), features/fbreport.js (fbCfg,
               fbVersion), features/couldbe.js (CB), with a typeof test for each. The admin page loads this
               file for fnRows, fnStats and fnWords.
   RULES       One record holds four facts and nothing about the person: the seconds, the taps, the
               build version, and whether an account was signed in. No money number, no name, no email,
               no device. The seconds count only the time the page was in view. The record is kept on
               the profile (c.x.fn), so it travels with the saved game of an account, and the admin page
               reads it there. It is also sent to the table first_numbers, for visitors with no
               account; until that table exists (supabase/migrations/, the file FN_FILE, NOT APPLIED),
               the record stays on the device and the game says nothing.
   COMPAT      One optional key on a profile: c.x.fn { id, s (seconds), t (taps), v (version), in (true
               when signed in), sent (true when the table has it) }. An old saved game has none.
   ========================================================================= */
const FN_TARGET = 120; /* seconds: the target of the owner, "under 2 minutes" */
const FN_TABLE = "first_numbers";
const FN_FILE = "20261127150000_first_numbers.sql";
/* t0: when the first screen showed. hid: the milliseconds the page was out of view since then. */
const FN = { t0: Date.now(), hid: 0, hidAt: null, tried: false };

/* ---------- THE MATH ---------- */
/* The seconds from the first screen to now, without the time the page was out of view. Never under 0, and at
   most one day. */
function fnSecs(t0, now, hidden) {
  const s = Math.round((now - t0 - (hidden || 0)) / 1000);
  return isFinite(s) ? Math.max(0, Math.min(86400, s)) : null;
}
/* One record. null when a part is missing. */
function fnMake(o) {
  const s = fnSecs(o.t0, o.now, o.hidden),
    t = Math.round(+o.taps);
  if (s == null || !(t > 0) || !o.id) return null;
  return { id: String(o.id), s, t: Math.min(500, t), v: String(o.version || "").slice(0, 40), in: !!o.signed };
}
/* All records the admin page can see, each one time: the rows of the table (or null while it waits), and the
   records in the saved games. Returns [{ id, s, t, v, in }]. */
function fnRows(table, games) {
  const by = {};
  (table || []).forEach(r => {
    if (r && r.id) by[r.id] = { id: r.id, s: +r.secs, t: +r.taps, v: r.version || "", in: !!r.signed };
  });
  Object.keys(games || {}).forEach(o => {
    const g = games[o];
    ((g && g.chars) || []).forEach(c => {
      const f = c && c.x && c.x.fn;
      if (f && f.id && !by[f.id]) by[f.id] = { id: f.id, s: +f.s, t: +f.t, v: f.v || "", in: !!f.in };
    });
  });
  return Object.keys(by)
    .map(k => by[k])
    .filter(r => isFinite(r.s) && r.s >= 0 && isFinite(r.t) && r.t > 0);
}
/* The median and the longest one. rows: fnRows(). { n, medS, medT, maxS, maxT, over (how many took longer than the
   target), late (true when the median is over the target) }. n 0: nothing yet. */
function fnStats(rows) {
  const L = rows || [],
    med = a => {
      const s = a.slice().sort((x, y) => x - y),
        m = Math.floor(s.length / 2);
      return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null;
    };
  if (!L.length) return { n: 0, medS: null, medT: null, maxS: null, maxT: null, over: 0, late: false };
  const medS = med(L.map(r => r.s)),
    worst = L.reduce((a, r) => (r.s > a.s ? r : a), L[0]);
  return {
    n: L.length,
    medS,
    medT: med(L.map(r => r.t)),
    maxS: worst.s,
    maxT: worst.t,
    over: L.filter(r => r.s > FN_TARGET).length,
    late: medS > FN_TARGET,
  };
}
/* Seconds in words: "1 min 12 s", "48 s". */
function fnWords(s) {
  if (s == null) return "";
  const n = Math.round(s),
    m = Math.floor(n / 60);
  return m ? m + " min " + (n % 60) + " s" : n + " s";
}

/* ---------- IN THE GAME ---------- */
/* Part of finishSetupCb() in couldbe.js: What it is shows for a new profile, so the first number is on the screen.
   One record for a profile, kept on it. Returns the record, or null. */
function fnDone() {
  try {
    const c = typeof C === "function" ? C() : null;
    if (!c || G.demo || !c.x || !c.x.cb || c.x.fn) return null;
    const hid = FN.hid + (FN.hidAt ? Date.now() - FN.hidAt : 0),
      rec = fnMake({
        id: typeof rpId === "function" ? rpId() : "",
        t0: FN.t0,
        now: Date.now(),
        hidden: hid,
        taps: typeof CB !== "undefined" ? CB.taps : 0,
        version: typeof fbVersion === "function" ? fbVersion() : "",
        signed: typeof SUPA !== "undefined" && !!SUPA.uid,
      });
    if (!rec) return null;
    c.x.fn = rec;
    save();
    fnSend(c);
    return rec;
  } catch (e) {
    report(e, "firstnum.js: fnDone");
    return null;
  }
}
/* Send the record of one profile to the table. It says nothing on the screen. 'sent', or why it stays on the
   device: 'wait' (the table is not there yet, or there is no address), 'later'. */
async function fnSend(c) {
  try {
    const f = c && c.x && c.x.fn;
    if (!f || f.sent || typeof fbCfg !== "function") return "wait";
    /* only on the website, where the account code runs: a test or a copy opened from a file sends nothing */
    if (typeof SUPA === "undefined" || !SUPA.on) return "wait";
    const cfg = await fbCfg();
    if (!cfg.url || !cfg.key || !cfg.fetch) return "wait";
    const r = await cfg.fetch(cfg.url + "/rest/v1/" + FN_TABLE, {
      method: "POST",
      headers: {
        apikey: cfg.key,
        Authorization: "Bearer " + (cfg.token || cfg.key),
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ id: f.id, secs: f.s, taps: f.t, version: f.v, signed: f.in }),
    });
    if (r.ok || r.status === 409) {
      f.sent = true;
      save();
      return "sent";
    }
    return r.status === 404 ? "wait" : "later";
  } catch (e) {
    report(e, "firstnum.js: fnSend");
    return "later";
  }
}
/* Part of fbStart() in fbreport.js, at page load: one more try for a record that waits, one time for each visit.
   A coach or the admin who looks at the game of another person sends nothing. */
function fnFlush() {
  try {
    if (FN.tried || typeof C !== "function" || typeof G === "undefined" || G.demo) return;
    if (typeof SUPA !== "undefined" && SUPA.as) return;
    FN.tried = true;
    const c = C();
    if (c && c.x && c.x.fn && !c.x.fn.sent) fnSend(c);
  } catch (e) {
    report(e, "firstnum.js: fnFlush");
  }
}
if (typeof document !== "undefined" && document.addEventListener) {
  /* the time the page is out of view does not count */
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") FN.hidAt = Date.now();
    else if (FN.hidAt) {
      FN.hid += Date.now() - FN.hidAt;
      FN.hidAt = null;
    }
  });
}
