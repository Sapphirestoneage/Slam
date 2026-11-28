/* ============================================================================
   SLAM the Game: core/cjcore.js
   PURPOSE     The Confidence and Joy check (run CC-1, item 18, Nov 28 2026): the math of two tap scales,
               1 to 10. The log of the checks of one profile, when the next check is due (at the start,
               then each month), the before and the after, the change inside one year (for Your year),
               and the averages across players for the admin page, with no name and no account.
   INPUT       Numbers and dates only. No profile, no screen.
   OUTPUT      Data: CJ_MIN, CJ_MAX, CJ_EVERY, CJ_LATER, CJ_PLAYERS. Math: cjClean, cjUpsert, cjDue,
               cjChange, cjYear, cjRows, cjStats.
   DEPENDS ON  Nothing. The admin page loads this file for cjRows and cjStats.
   RULES       A scale with no tap is null: it is never a 0 and never counts in an average. A lower
               number is a record, not a result: nothing here judges it. The admin page gets counts and
               averages only, and nothing at all while fewer than CJ_PLAYERS players answered, so no one
               person can be picked out. A change needs two checks on two different days.
   COMPAT      One optional key on a profile: c.x.cj { log: [{ d: "YYYY-MM-DD", c: 1..10 or null,
               j: 1..10 or null }], later: "YYYY-MM-DD" (the day "Later" was tapped) }. An old saved
               game has none.
   ========================================================================= */
const CJ_MIN = 1,
  CJ_MAX = 10,
  CJ_EVERY = 30 /* days between two checks: "then monthly" */,
  CJ_LATER = 7 /* days the note stays away after "Later" */,
  CJ_PLAYERS = 5; /* the fewest players before the admin page shows an average */
const cjOk = v => Number.isInteger(v) && v >= CJ_MIN && v <= CJ_MAX;
const cjDay = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
/* d plus n days, as "YYYY-MM-DD". */
function cjAdd(d, n) {
  const t = new Date(d + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}
/* The log, in order of the day, with only the entries that hold a tap. */
function cjClean(log) {
  return (Array.isArray(log) ? log : [])
    .filter(e => e && cjDay(e.d))
    .map(e => ({ d: e.d, c: cjOk(e.c) ? e.c : null, j: cjOk(e.j) ? e.j : null }))
    .filter(e => e.c !== null || e.j !== null)
    .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
}
/* One tap. k: "c" (confidence) or "j" (joy). v: 1 to 10, or null to clear it. One entry for each day: a second
   tap on the same day changes that entry. Returns the new log. */
function cjUpsert(log, d, k, v) {
  const L = cjClean(log),
    val = cjOk(v) ? v : null;
  if (!cjDay(d) || (k !== "c" && k !== "j")) return L;
  let e = L.find(x => x.d === d);
  if (!e) {
    e = { d, c: null, j: null };
    L.push(e);
  }
  e[k] = val;
  return cjClean(L);
}
/* IS A CHECK DUE? first: no check yet. next: the first day the next one is due. later: the day "Later" was tapped. */
function cjDue(log, today, later) {
  const L = cjClean(log),
    last = L.length ? L[L.length - 1] : null,
    next = last ? cjAdd(last.d, CJ_EVERY) : today,
    wait = cjDay(later) ? cjAdd(later, CJ_LATER) : null,
    /* the two taps of today: a check that has one of the two is still open today */
    half = !!last && last.d === today && (last.c === null || last.j === null);
  return {
    first: !last,
    last: last ? last.d : null,
    next,
    due: (today >= next || half) && !(wait && today < wait),
    snoozed: !!wait && today < wait,
  };
}
/* BEFORE AND AFTER for one scale. k: "c" or "j". { n, first, last, change }: first and last are { d, v }. change is
   null until two checks on two days. Null when the scale has no tap. */
function cjChange(log, k) {
  const L = cjClean(log).filter(e => e[k] !== null);
  if (!L.length) return null;
  const a = L[0],
    b = L[L.length - 1];
  return {
    n: L.length,
    first: { d: a.d, v: a[k] },
    last: { d: b.d, v: b[k] },
    change: L.length > 1 ? b[k] - a[k] : null,
    vals: L.map(e => e[k]),
  };
}
/* The same, for the checks of one year ("2026"). */
function cjYear(log, yr) {
  const L = cjClean(log).filter(e => e.d.slice(0, 4) === String(yr));
  return { n: L.length, conf: cjChange(L, "c"), joy: cjChange(L, "j") };
}
/* ACROSS PLAYERS. games: the saved games of the admin page ({ owner: G }). One row for each profile that has a
   check, with numbers only: no owner, no name. A sample profile (c.demo) is not a player. */
function cjRows(games) {
  const out = [];
  Object.keys(games || {}).forEach(o => {
    const g = games[o];
    ((g && g.chars) || []).forEach(c => {
      if (!c || c.demo || !c.x || !c.x.cj) return;
      const C1 = cjChange(c.x.cj.log, "c"),
        J1 = cjChange(c.x.cj.log, "j");
      if (!C1 && !J1) return;
      out.push({
        c0: C1 ? C1.first.v : null,
        c1: C1 ? C1.last.v : null,
        cd: C1 ? C1.change : null,
        j0: J1 ? J1.first.v : null,
        j1: J1 ? J1.last.v : null,
        jd: J1 ? J1.change : null,
      });
    });
  });
  return out;
}
/* The averages. rows: cjRows(). { n (players who answered), show (n is at least CJ_PLAYERS), conf, joy }. Each of
   conf and joy: { n, first, last, n2 (players with two checks), change (their average change, null while n2 is
   under CJ_PLAYERS) }. first and last are null while n is under CJ_PLAYERS. */
function cjStats(rows) {
  const R = rows || [],
    avg = a => (a.length ? a.reduce((t, v) => t + v, 0) / a.length : null),
    part = (k0, k1, kd) => {
      const has = R.filter(r => r[k0] !== null),
        two = R.filter(r => r[kd] !== null),
        ok = has.length >= CJ_PLAYERS;
      return {
        n: has.length,
        first: ok ? avg(has.map(r => r[k0])) : null,
        last: ok ? avg(has.map(r => r[k1])) : null,
        n2: two.length,
        change: two.length >= CJ_PLAYERS ? avg(two.map(r => r[kd])) : null,
      };
    };
  return { n: R.length, show: R.length >= CJ_PLAYERS, conf: part("c0", "c1", "cd"), joy: part("j0", "j1", "jd") };
}
