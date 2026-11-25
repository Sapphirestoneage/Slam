/* ============================================================================
   SLAM the Game: account/liveforget.js
   PURPOSE     Live Session Mode, Part 9: "Delete this transcript", after the review, for the coach and for the
               client. One tap, then one confirm. It removes the words of one session from each place that
               keeps them, and keeps the approved values themselves, their levels, and the record of who
               approved what and when, with one line "Transcript deleted on <date>".
               The places (docs/LIVE-SESSION-BUILD.md, "For Parts 8 and 9"):
                 1. the table live_lines (R.forget in account/liveio.js; the rule "the two members delete the
                    lines" of supabase/migrations/20261125210000_live_sessions.sql);
                 2. the store of this device: the lines that waited (lvBufKey) and the copy of the profile
                    while a save waited (slam_live_game_<uid>, cleared by the save of lgClient.act);
                 3. the client's saved game: the quotes in c.x.live (heard, marks, whatifs, review);
                 4. the Realtime channel keeps nothing, so there is nothing to delete there.
   INPUT       The profile c of the client. The room controller R (R.forget, R.game.act).
   OUTPUT      Values only: lvfForget, lvfGone. HTML: lvfCardHTML. The page: lvfRun, lvfClick.
   DEPENDS ON  core/report.js, account/liveland.js (lfStore), account/liveio.js (R.forget),
               account/livegame.js (R.game.act of each side: the saved game is read again, then saved),
               account/livescreen.js (lsEsc), screens/dash.js (dkCard). session.html loads this file.
   RULES       The words go; the numbers stay. A quote is made empty, the item stays (its value, level, who and
               when). Nothing else of the profile changes. The draft notes of the AI pass are on the coach's
               device only (account/liveai.js) and are not a part of the transcript.
   STORED      c.x.live.forgot = { [session id]: { at, by, n } }. New on Nov 25 2026: a profile with none reads
               as "the transcript is kept". Nothing was renamed or removed.
   STATE       R.fg = { ask, busy, msg }.
   ========================================================================= */

/* ---------- values only ---------- */
/* When the transcript of one session was deleted: { at, by, n } or null. */
function lvfGone(c, sid) {
  const L = c && c.x && c.x.live;
  return (L && L.forgot && L.forgot[sid]) || null;
}
/* MAKE THE WORDS OF ONE SESSION EMPTY on the profile. Each quote of the heard list (and the client's answer to
   a "Confirming"), each quote of the record of a value that this session heard, each quote of a what-if and of
   the review. The items, the values, the levels and the records stay. Gives { n } (how many quotes went). */
function lvfForget(c, sid, who, now) {
  const L = lfStore(c),
    lines = {},
    items = {};
  let n = 0;
  const blank = o => {
    if (o && o.quote) {
      o.quote = "";
      n++;
    }
  };
  L.heard.forEach(x => {
    if (x.sid !== sid) return;
    items[x.id] = true;
    if (x.line) lines[x.line] = true;
    blank(x);
    blank(x.answer);
  });
  Object.keys(L.marks).forEach(k => {
    const m = L.marks[k];
    const mine = m.sid === sid;
    if (mine) blank(m);
    (m.all || []).forEach(a => {
      if (mine || lines[a.line] || /^review-/.test(String(a.line || ""))) blank(a);
    });
    if (mine && m.yes) blank(m.yes);
  });
  L.whatifs.forEach(w => {
    if (w.sid === sid) blank(w);
  });
  const B = L.review || {};
  Object.keys(B).forEach(id => {
    if (items[id]) blank(B[id]);
  });
  L.forgot = L.forgot || {};
  L.forgot[sid] = { at: now, by: who || "coach", n };
  return { n };
}

/* ---------- HTML only ---------- */
const lvfDay = at => {
  try {
    return new Date(at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  } catch (e) {
    report(e, "liveforget.js: lvfDay");
    return "";
  }
};
/* The card on the ended screen of each side. c: the profile (null on a device that has no copy yet). */
function lvfCardHTML(R, c) {
  if (!R || !R.room || R.room.state !== "ended") return "";
  const F = R.fg || (R.fg = {}),
    gone = c ? lvfGone(c, R.sid) : null,
    coach = R.side === "coach";
  if (gone)
    return dkCard(
      "The transcript",
      `<p class="done">Transcript deleted on ${lsEsc(lvfDay(gone.at))}.</p><p class="tiny muted">The words of this call are gone. The numbers stay, with who approved them and when.</p>` +
        (F.msg ? `<p class="note">${lsEsc(F.msg)}</p>` : "") +
        (F.msg ? `<button class="wide" data-a="lvfyes">Delete the late lines</button>` : "")
    );
  const left = coach && c && typeof lrvCounts === "function" ? lrvCounts(c, R.sid).left : 0;
  return dkCard(
    "The transcript",
    `<p class="tiny muted">${
      coach
        ? "The words of this call are kept, as text, for you, your client and the admin, until one of you deletes them."
        : "The words of this call are kept, as text, for you, your coach and the admin, until one of you deletes them."
    }</p>` +
      (F.msg ? `<p class="note">${lsEsc(F.msg)}</p>` : "") +
      (F.ask
        ? `<p><b>Delete the words of this call for good?</b> The numbers stay, with who approved them and when. This cannot be taken back.</p>` +
          (left
            ? `<p class="note">${left} ${left === 1 ? "thing is" : "things are"} still to check. After this, the review shows them with no quote.</p>`
            : !coach
              ? `<p class="tiny muted">Your coach may still be checking the numbers. They keep the numbers, not the words.</p>`
              : "") +
          `<div class="ctl"><button data-a="lvfyes"${F.busy ? " disabled" : ""}>Yes, delete the transcript</button><button class="primary" data-a="lvfno">Keep it</button></div>`
        : `<button class="wide" data-a="lvfask">Delete this transcript</button>`)
  );
}

/* ---------- the page ---------- */
/* DELETE: the lines from the database and this device (R.forget), then the quotes of the saved game (each side
   saves through its own act: the saved game is read again first). Gives { ok, n, left } or { ok: false }. */
async function lvfRun(R, now) {
  const F = R.fg || (R.fg = {}),
    at = now == null ? Date.now() : now;
  F.busy = true;
  F.msg = "";
  const r = await R.forget();
  if (!r.ok) {
    F.busy = false;
    F.msg = r.why;
    return { ok: false };
  }
  const out =
    R.game && R.game.act ? await R.game.act(c => lvfForget(c, R.sid, R.side, at), "transcript deleted") : null;
  F.busy = false;
  F.ask = false;
  if (!out) {
    F.msg =
      "The lines are gone from the database. The quotes in the profile did not save yet: tap Delete this transcript again.";
    return { ok: false, gone: r.gone };
  }
  if (r.left)
    F.msg =
      r.left +
      (r.left === 1 ? " line is" : " lines are") +
      " still in the database (a device that was offline may have sent it late). Tap Delete this transcript again in a minute.";
  return { ok: true, n: out.n, gone: r.gone, left: r.left };
}
/* Part of livePartClick() in livereview.js: the three taps. True: the tap was taken. */
async function lvfClick(a, t, R) {
  if (!/^lvf/.test(a) || !R) return false;
  const F = R.fg || (R.fg = {});
  if (a === "lvfask") F.ask = true;
  else if (a === "lvfno") F.ask = false;
  else if (a === "lvfyes") await lvfRun(R);
  else return false;
  return true;
}
