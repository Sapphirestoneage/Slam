/* ============================================================================
   SLAM the Game: account/live.js
   PURPOSE     The rules of Live Session Mode, as functions that only work out values. No screen, no
               database, no microphone, no network: each function takes values and gives values back, so
               each rule is examined by a test with no device. The rules: (1) the invite link and its
               states; (2) the room: waiting, both tapped OK, live, paused, ended, and one Start for the
               whole call; (3) the listening status of one side and the restart of the browser's speech
               recognition; (4) the pill "Listening 23:14"; (5) the lines heard on this device, kept
               until the database confirms them, each with an id made on the device; (6) the labels You
               and Them; (7) the echo filter; (8) what a side says when its browser cannot listen.
   INPUT       Values only. A room is the row of the table live_sessions
               (supabase/migrations/20261125210000_live_sessions.sql), or the same shape made here.
   OUTPUT      Functions lv...: see each section. Constants LV_...
   DEPENDS ON  core/report.js. coach.html and session.html load this file. index.html does not.
   RULES       lvRoomDo() here and the database function live_session_set() follow the same rules, step
               for step. When one changes, change the other. No audio exists: a line is text.
               A time is a number of milliseconds, or the text of a date from the database.
   ========================================================================= */
/* ---------- the words of the brief, in one place ---------- */
const LV_CONSENT =
  "This session is transcribed. Text only, no audio is saved. After the call it is processed by AI to fill in your profile.";
/* One plain line under the consent words of the brief (Part 9), so the screen says the whole truth: the
   browser's speech recognition sends the sound to Google, and the AI step after the call sends the words to
   Anthropic. game/privacy.html says the same in more words. */
const LV_CONSENT_MORE =
  "To turn speech into words, Chrome sends the sound to Google while you talk; SLAM keeps the words only. The AI step after the call sends the words to Anthropic, and only when your coach runs it.";
const LV_JOIN_LINE = "Join the call from a laptop with Chrome, and use headphones if you can.";
const LV_BEST_LINE = "Sending the link before the call is best.";
const LV_INVITE_DAYS = 7;
const LV_FLUSH_MS = 3000; /* the lines go to the database each 3 seconds */
const LV_SEEN_MS = 30000; /* "I am in the room": the page says it each 30 seconds */
const LV_HERE_MS = 90000; /* a side counts as in the room for 90 seconds after it last said so */
/* THE ECHO FILTER, the two settings.
   ms       how far apart two lines can be heard (on this device's clock) and still be one sentence
   minWords a line with fewer words is never dropped: "yes" and "okay" are real answers of two people
   share    the lines are nearly the same when this share of their words is shared:
            2 x (words in both) / (words of one + words of the other)
   inside   strong only: or when this share of the words of the shorter line is in the longer line
            (the echo of half a sentence), for a shorter line of 3 words or more */
const LV_ECHO = {
  normal: { ms: 2000, minWords: 3, share: 0.8, inside: 0 },
  strong: { ms: 4000, minWords: 2, share: 0.6, inside: 0.8 },
};
/* THE RESTART of speech recognition. The browser ends it by itself after a silence: restart at once.
   After an error with no word heard since: wait, and wait longer each time (250 ms, then two times as
   long, at most 8 seconds). After 8 errors in a row, or a real stop (the microphone is refused or not
   there), the status is "stopped" and the person taps Reconnect. */
const LV_RESTART_FIRST = 250,
  LV_RESTART_TOP = 8000,
  LV_RESTART_MAX = 8;
const LV_HARD = ["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"];

/* ---------- small helpers ---------- */
function lvMs(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  const t = new Date(v).getTime();
  return isFinite(t) ? t : null;
}
function lvOther(side) {
  return side === "coach" ? "client" : "coach";
}
/* How one side names a side: "You", "Your coach", "Your client". */
function lvWho(side, me) {
  return side === me ? "You" : side === "coach" ? "Your coach" : "Your client";
}

/* ---------- 1. the invite link ---------- */
/* The address of the link: the session page next to the coach page, with the token. */
function lvInviteUrl(page, token) {
  return String(page || "").replace(/[^/]*$/, "") + "session.html?invite=" + encodeURIComponent(token);
}
/* The state of one invite for the coach: "sent", "signed" (signed up), "room" (in the room now), or
   "expired" (7 days went by and nobody used it). sessions: the coach's sessions. */
function lvInviteState(inv, sessions, now) {
  if (!inv) return "sent";
  if (!inv.used_at) return lvMs(inv.expires_at) != null && lvMs(inv.expires_at) <= now ? "expired" : "sent";
  const s = (sessions || []).find(
    x => x && x.state !== "ended" && (x.invite === inv.id || (inv.used_by && x.client === inv.used_by))
  );
  return s && lvHere(s, "client", now) ? "room" : "signed";
}
const LV_INVITE_WORD = { sent: "Sent", signed: "Signed up", room: "In the room", expired: "Expired" };
/* The invites of a coach, the newest first, each with its state. */
function lvInviteRows(invites, sessions, now) {
  return (invites || [])
    .slice()
    .sort((a, b) => (lvMs(b.made_at) || 0) - (lvMs(a.made_at) || 0))
    .map(inv => {
      const st = lvInviteState(inv, sessions, now);
      return { inv, state: st, word: LV_INVITE_WORD[st], name: inv.client_name || "A new client" };
    });
}
/* What the invite screen says for a link that cannot be used. No blame: the link is the subject. */
function lvInviteSays(state, coachName) {
  const ask = "Ask your coach for a new link";
  if (state === "used")
    return {
      title: "This link was already used",
      line:
        "An invite link opens one account, one time. " +
        (coachName ? coachName + " can send a new one." : "Your coach can send a new one."),
      ask,
    };
  if (state === "expired")
    return {
      title: "This link is past its 7 days",
      line:
        "An invite link works for " +
        LV_INVITE_DAYS +
        " days. " +
        (coachName ? coachName + " can send a new one." : "Your coach can send a new one."),
      ask,
    };
  if (state === "own")
    return {
      title: "This is your own invite link",
      line: "Send it to your client. It opens their account, not yours.",
      ask: "",
    };
  return {
    title: "This link does not open a session",
    line: "A part of the link may be missing. Copy the whole link from your coach's message and open it again.",
    ask,
  };
}
/* The name a coach shows to clients: what the coach typed, or the first part of the email. */
function lvCoachName(typed, email) {
  const t = String(typed == null ? "" : typed).trim();
  if (t) return t.slice(0, 60);
  const a = String(email || "")
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\d+/g, "")
    .trim();
  return a ? a.replace(/\b[a-z]/g, m => m.toUpperCase()).slice(0, 60) : "Your coach";
}

/* ---------- 2. the room ---------- */
function lvRoomNew(id, coach, client, now) {
  return {
    id,
    coach,
    client,
    invite: null,
    state: "waiting",
    made_at: now == null ? null : now,
    started_at: null,
    ended_at: null,
    paused_at: null,
    paused_ms: 0,
    coach_ok_at: null,
    client_ok_at: null,
    coach_headphones: null,
    client_headphones: null,
    coach_listens: null,
    client_listens: null,
    coach_mic: null,
    client_mic: null,
    coach_seen_at: null,
    client_seen_at: null,
  };
}
function lvOk(room, side) {
  return !!(room && room[side + "_ok_at"]);
}
function lvBothOk(room) {
  return lvOk(room, "coach") && lvOk(room, "client");
}
/* Where the room is: "consent" (waiting for both to tap OK), "ready" (both tapped, Start is possible),
   "live", "paused", "ended". */
function lvStage(room) {
  if (!room) return "consent";
  if (room.state === "waiting") return lvBothOk(room) ? "ready" : "consent";
  return room.state;
}
/* One side finished the steps before Start: OK, the microphone (allowed, refused, or a browser that cannot
   listen) and "Using headphones?". */
function lvSetDone(room, side) {
  return (
    lvOk(room, side) &&
    room[side + "_headphones"] != null &&
    (room[side + "_mic"] != null || room[side + "_listens"] === false)
  );
}
/* What the client still has to do before Start, as the coach reads it: "" when nothing. */
function lvClientWait(room) {
  if (!room || !lvOk(room, "client")) return "";
  if (room.client_mic == null && room.client_listens !== false) return "Waiting for them to allow the microphone.";
  if (room.client_headphones == null) return "Waiting for them to answer Using headphones?";
  return "";
}
/* Only the coach starts, one time, and only when both tapped OK and the client finished the microphone and
   headphones steps. solo: the coach goes on with their side only, while the client's steps are not done. */
function lvCanStart(room, side, solo) {
  return (
    !!room &&
    side === "coach" &&
    room.state === "waiting" &&
    lvBothOk(room) &&
    (solo === true || lvSetDone(room, "client"))
  );
}
/* True when this side said "I am in the room" in the last 90 seconds. */
function lvHere(room, side, now) {
  const t = lvMs(room && room[side + "_seen_at"]);
  return t != null && now - t <= LV_HERE_MS;
}
/* One step of one side. The same rules as live_session_set() in the database file.
   what: "seen", "ok", "headphones", "listens", "mic", "start", "pause", "resume", "end". For "start", flag
   true is "go on with my side only" (the client's microphone and headphones steps are not done).
   Gives { room, changed }. A step that the rules do not allow changes nothing. */
function lvRoomDo(room, side, what, now, flag) {
  const r = Object.assign({}, room),
    same = { room, changed: false };
  if (!room || (side !== "coach" && side !== "client")) return same;
  if (what === "seen") {
    r[side + "_seen_at"] = now;
    return { room: r, changed: true };
  }
  if (room.state === "ended") return same;
  if (what === "ok") {
    if (room[side + "_ok_at"]) return same;
    r[side + "_ok_at"] = now;
  } else if (what === "headphones" || what === "listens" || what === "mic") {
    const k = side + "_" + what;
    if (room[k] === !!flag) return same;
    r[k] = !!flag;
  } else if (what === "start") {
    if (!lvCanStart(room, side, flag === true)) return same;
    r.state = "live";
    r.started_at = room.started_at || now;
  } else if (what === "pause") {
    if (room.state !== "live") return same;
    r.state = "paused";
    r.paused_at = now;
  } else if (what === "resume") {
    if (room.state !== "paused") return same;
    r.state = "live";
    r.paused_ms =
      (room.paused_ms || 0) + Math.max(0, now - (lvMs(room.paused_at) == null ? now : lvMs(room.paused_at)));
    r.paused_at = null;
  } else if (what === "end") {
    if (room.state === "paused")
      r.paused_ms =
        (room.paused_ms || 0) + Math.max(0, now - (lvMs(room.paused_at) == null ? now : lvMs(room.paused_at)));
    r.state = "ended";
    r.ended_at = now;
    r.paused_at = null;
  } else return same;
  return { room: r, changed: true };
}
/* The line under the consent text: who is still to tap OK. */
function lvWaitLine(room, me) {
  const mine = lvOk(room, me),
    theirs = lvOk(room, lvOther(me)),
    them = me === "coach" ? "your client" : "your coach";
  if (mine && theirs)
    return me === "coach"
      ? lvClientWait(room)
        ? "Both of you tapped OK. " + lvClientWait(room)
        : "Both of you tapped OK. Press Start when you are ready."
      : "Both of you tapped OK. Your coach presses Start.";
  if (!mine && !theirs) return "Still to tap OK: you and " + them + ".";
  if (!mine) return "Still to tap OK: you. " + (me === "coach" ? "Your client" : "Your coach") + " tapped already.";
  return "Still to tap OK: " + them + ". You tapped already.";
}
/* The stronger echo filter is on when a side answered "No" to "Using headphones?". */
function lvEchoSet(room) {
  return room && (room.coach_headphones === false || room.client_headphones === false)
    ? LV_ECHO.strong
    : LV_ECHO.normal;
}

/* ---------- 3. the pill ---------- */
/* The time of listening so far, in milliseconds. Paused time does not count. */
function lvElapsed(room, now) {
  const a = lvMs(room && room.started_at);
  if (a == null) return 0;
  const end = lvMs(room.ended_at),
    pa = lvMs(room.paused_at),
    to = end != null ? end : room.state === "paused" && pa != null ? pa : now;
  return Math.max(0, to - a - (room.paused_ms || 0));
}
/* 1394000 gives "23:14". One hour and more: "1:02:05". */
function lvClock(ms) {
  const s = Math.max(0, Math.floor((+ms || 0) / 1000)),
    h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    p = n => (n < 10 ? "0" : "") + n;
  return (h ? h + ":" + p(m) : String(m)) + ":" + p(s % 60);
}
/* The text of the pill at the top. */
function lvPill(room, now) {
  const st = lvStage(room);
  if (st === "live") return "Listening " + lvClock(lvElapsed(room, now));
  if (st === "paused") return "Paused " + lvClock(lvElapsed(room, now));
  if (st === "ended") return "Ended " + lvClock(lvElapsed(room, now));
  return "Not started yet";
}

/* ---------- 4. the listening status of one side ---------- */
/* status: "off" (the room does not listen now), "working", "restarting", "stopped" (needs Reconnect),
   "cannot" (this browser has no speech recognition). */
function lvMicNew(can) {
  return { can: can !== false, status: can === false ? "cannot" : "off", errors: 0, why: "" };
}
/* The wait before the next restart, after this many errors in a row. */
function lvRestartWait(errors) {
  if (!errors || errors < 1) return 0;
  return Math.min(LV_RESTART_TOP, LV_RESTART_FIRST * Math.pow(2, errors - 1));
}
/* One event of the microphone. Gives { mic, wait }: wait is the number of milliseconds before the adapter
   starts speech recognition again, or null when it must not start.
   ev: "begin"  the room wants to listen (Start, Resume, Reconnect)
       "start"  the browser says that it listens
       "result" a word was heard
       "error"  the browser reports an error (code)
       "end"    the browser ended speech recognition
       "halt"   the room stops listening (Pause, End) */
function lvMicOn(mic, ev, code) {
  const m = Object.assign({}, mic);
  let wait = null;
  if (!m.can) {
    m.status = "cannot";
    return { mic: m, wait };
  }
  if (ev === "begin") {
    m.status = "restarting";
    m.errors = 0;
    m.why = "";
    wait = 0;
  } else if (ev === "halt") {
    m.status = "off";
    m.errors = 0;
    m.why = "";
  } else if (m.status === "off" || m.status === "stopped") {
    /* a late event of a recognizer that the room stopped: nothing changes */
  } else if (ev === "start") {
    m.status = "working";
  } else if (ev === "result") {
    m.status = "working";
    m.errors = 0;
  } else if (ev === "error") {
    if (LV_HARD.indexOf(code) >= 0) {
      m.status = "stopped";
      m.why = code;
    } else m.errors = (m.errors || 0) + 1;
  } else if (ev === "end") {
    if (m.errors >= LV_RESTART_MAX) {
      m.status = "stopped";
      m.why = "tries";
    } else {
      m.status = "restarting";
      wait = lvRestartWait(m.errors);
    }
  }
  return { mic: m, wait };
}
/* The light of one side: a color name and one word. No red: "stopped" is a neutral outline with the word. */
function lvLight(mic) {
  const st = mic ? mic.status : "off";
  if (st === "working") return { look: "green", word: "Working" };
  if (st === "restarting") return { look: "amber", word: "Restarting" };
  if (st === "stopped") return { look: "outline", word: "Stopped" };
  if (st === "cannot") return { look: "outline", word: "Can't listen" };
  return { look: "off", word: "Not listening" };
}
/* Why a microphone stopped, in plain words, for the side that owns it. */
function lvStopLine(mic) {
  const w = mic && mic.why;
  if (w === "not-allowed" || w === "service-not-allowed")
    return "The browser did not get permission for the microphone. Allow it in the address bar, then tap Reconnect.";
  if (w === "audio-capture")
    return "No microphone was found. Plug one in or pick one in the browser, then tap Reconnect.";
  if (w === "language-not-supported")
    return "This browser cannot listen in this language. Tap Reconnect to try once more.";
  return "Listening stopped after several tries. Check your internet, then tap Reconnect.";
}
/* True when this browser has speech recognition. win: the window, or a stand-in. */
function lvCanListen(win) {
  return !!(win && (win.SpeechRecognition || win.webkitSpeechRecognition));
}
/* The line when a side cannot listen. "" when both can, or when it is not known yet. */
function lvFallbackLine(room, me) {
  if (!room) return "";
  const mine = room[me + "_listens"],
    theirs = room[lvOther(me) + "_listens"];
  if (theirs === false && mine === false) return "Neither side can listen in this browser. Chrome on a laptop can.";
  if (theirs === false) return "Their side can't listen in this browser. The session goes on with your side only.";
  if (mine === false)
    return (
      "This browser can't listen. The session goes on with " +
      (me === "coach" ? "your client's" : "your coach's") +
      " side only. Chrome on a laptop can listen."
    );
  return "";
}

/* ---------- 5. the lines heard on this device ---------- */
/* The buffer of one device for one session: each line stays here, and on the device, until the database
   confirms it. */
function lvBufNew(sid, side) {
  return { sid, side, lines: [] };
}
function lvBufKey(sid, side) {
  return "slam_live_buf_" + sid + "_" + side;
}
/* Add one final line. id is made on the device (one id for one line, for ever). Gives the line, or null
   for an empty text. */
function lvBufAdd(buf, id, text, now) {
  const t = String(text == null ? "" : text)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
  if (!t || !id) return null;
  const was = buf.lines.find(l => l.id === id);
  if (was) return was;
  const line = { id, side: buf.side, text: t, at: now };
  buf.lines.push(line);
  return line;
}
/* The lines to send now: each line that is at least hold milliseconds old (the echo filter can still drop a
   younger one). With hold 0: all of them. */
function lvBufDue(buf, now, hold) {
  return buf.lines.filter(l => now - l.at >= (hold || 0));
}
/* The database confirmed these ids: they leave the buffer. Gives the number removed. */
function lvBufConfirm(buf, ids) {
  const n = buf.lines.length;
  buf.lines = buf.lines.filter(l => ids.indexOf(l.id) < 0);
  return n - buf.lines.length;
}
/* The echo filter dropped this line before it was sent. */
function lvBufDrop(buf, id) {
  return lvBufConfirm(buf, [id]) === 1;
}
/* The buffer as text for the storage of the device, and back. A text of a different session or side, or a
   damaged text, gives an empty buffer. */
function lvBufPack(buf) {
  return JSON.stringify({ sid: buf.sid, side: buf.side, lines: buf.lines });
}
function lvBufUnpack(text, sid, side) {
  const b = lvBufNew(sid, side);
  if (!text) return b;
  let o = null;
  try {
    o = JSON.parse(text);
  } catch (e) {
    report(e, "live.js: lvBufUnpack");
    return b;
  }
  if (!o || o.sid !== sid || o.side !== side || !Array.isArray(o.lines)) return b;
  o.lines.forEach(l => {
    if (l && l.id && typeof l.text === "string" && typeof l.at === "number") lvBufAdd(b, l.id, l.text, l.at);
  });
  return b;
}
/* One line as a row of the table live_lines. */
function lvLineRow(line, sid) {
  return { id: line.id, session: sid, side: line.side, body: line.text, at: new Date(line.at).toISOString() };
}
/* A row of the table as a line. */
function lvRowLine(row) {
  return { id: row.id, side: row.side, text: row.body, at: lvMs(row.at) };
}

/* ---------- 6. You and Them ---------- */
/* The label of a line: by the device that heard it. */
function lvLabel(lineSide, me) {
  return lineSide === me ? "You" : "Them";
}
/* Put lines in one list: no id two times, the oldest first. */
function lvMerge(have, more) {
  const by = {};
  (have || []).concat(more || []).forEach(l => {
    if (l && l.id && !by[l.id]) by[l.id] = l;
  });
  return Object.keys(by)
    .map(k => by[k])
    .sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
}

/* ---------- 7. the echo filter ---------- */
/* The words of a line: small letters, no punctuation. "What's your rent?" gives ["whats","your","rent"]. */
function lvWords(text) {
  return String(text == null ? "" : text)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9À-ɏ]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}
/* How alike two lines are. same: the same words in the same order. share: 2 x shared / (all words of both),
   each word counted as often as it is in both. inside: shared / words of the shorter line. */
function lvAlike(a, b) {
  const wa = lvWords(a),
    wb = lvWords(b),
    left = {};
  let shared = 0;
  wa.forEach(w => (left[w] = (left[w] || 0) + 1));
  wb.forEach(w => {
    if (left[w] > 0) {
      left[w]--;
      shared++;
    }
  });
  const min = Math.min(wa.length, wb.length);
  return {
    same: wa.length > 0 && wa.join(" ") === wb.join(" "),
    share: wa.length + wb.length ? (2 * shared) / (wa.length + wb.length) : 0,
    inside: min ? shared / min : 0,
    min,
  };
}
/* True when two lines are nearly the same words, by one setting of LV_ECHO. */
function lvNear(a, b, set) {
  const k = lvAlike(a, b);
  if (k.min < set.minWords) return false;
  return k.same || k.share >= set.share || (set.inside > 0 && k.min >= 3 && k.inside >= set.inside);
}
/* Is this line an echo? line was heard at time t on this device's clock. others: lines of the other device,
   each with t (when it was heard or when it arrived here, on this device's clock). Gives the line of the
   other device that it repeats, or null. */
function lvEchoOf(text, t, others, set) {
  return (others || []).find(o => o && Math.abs(t - o.t) <= set.ms && lvNear(text, o.text, set)) || null;
}
/* Two devices heard the same sentence, and each one sent its line before it saw the line of the other.
   Both devices use this one rule, so they agree: the line with more words stays (an echo loses words); with
   the same number of words, the line heard first stays; then the coach's line. Gives the line that stays. */
function lvEchoKeep(a, b) {
  const na = lvWords(a.text).length,
    nb = lvWords(b.text).length;
  if (na !== nb) return na > nb ? a : b;
  if (a.at !== b.at) return a.at < b.at ? a : b;
  return a.side === "coach" ? a : b;
}
