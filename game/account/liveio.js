/* ============================================================================
   SLAM the Game: account/liveio.js
   PURPOSE     The thin adapters of Live Session Mode, and the room controller that joins them to the
               rules of account/live.js. An adapter is the only code that touches one outside thing:
               the database (lioDb), the realtime channel of one session (lioChan), the browser's speech
               recognition (lioSpeech), the screen wake lock (lioWake), the storage of the device
               (lioStore), the clock and the timers (lioClock), a new id (lioId). The controller
               (lioRoom) takes one of each. account/livesim.js has a stand-in for each adapter, with the
               same shape, for the tests and for a simulated session with no microphone and no network.
   INPUT       The Supabase client of the page. The window of the browser.
   OUTPUT      Functions: lioAnswer, lioDb, lioChan, lioSpeech, lioWake, lioStore, lioClock, lioId,
               lioRoom.
   DEPENDS ON  core/report.js, account/trust.js (tuMissing, tuAuthKind), account/live.js.
               coach.html and session.html load this file. index.html does not.
   RULES       NO AUDIO IS RECORDED OR STORED. This file asks the browser for words only: the speech
               recognizer shows its own permission prompt, and the page never opens the microphone
               itself, never records, and keeps no sound. Only a final result becomes a line. Text that
               is not final can show on the screen, and it is never saved.
               The database row is the truth of the room. A signal on the channel only says "read the
               row again". A line has one id, made on the device: the database takes each id one time.
   ========================================================================= */
/* The answer of the database as one small object:
   ok    true: data has the answer
   wait  true: the database does not have the table or the function yet (the owner has not run the file)
   net   true: the server could not be reached
   why   the words of the database for a refused step ("not your client", "coach or admin only") */
function lioAnswer(r) {
  if (r && !r.error) return { ok: true, data: r.data === undefined ? null : r.data };
  const e = (r && r.error) || { message: "no answer" };
  if (typeof tuMissing === "function" && tuMissing(e)) return { ok: false, wait: true };
  if (typeof tuAuthKind === "function" && tuAuthKind(e) === "net") return { ok: false, net: true };
  return { ok: false, why: String(e.message || ""), code: String(e.code || "") };
}
/* THE DATABASE. sb: the Supabase client. Each function gives a promise of lioAnswer(). */
function lioDb(sb) {
  const run = async (where, f) => {
    try {
      return lioAnswer(await f());
    } catch (e) {
      report(e, "liveio.js: lioDb " + where);
      return lioAnswer({ error: e || { message: "network" } });
    }
  };
  return {
    inviteMake: (clientName, coachName) =>
      run("inviteMake", () =>
        sb.rpc("live_invite_make", { client_name: clientName || "", coach_name: coachName || "" })
      ),
    inviteCheck: tok => run("inviteCheck", () => sb.rpc("live_invite_check", { tok })),
    inviteUse: tok => run("inviteUse", () => sb.rpc("live_invite_use", { tok })),
    invites: () =>
      run("invites", () =>
        sb
          .from("live_invites")
          .select("id,token,client_name,made_at,expires_at,used_at,used_by")
          .order("made_at", { ascending: false })
          .limit(50)
      ),
    sessions: () =>
      run("sessions", () => sb.from("live_sessions").select("*").order("made_at", { ascending: false }).limit(50)),
    sessionOpen: client => run("sessionOpen", () => sb.rpc("live_session_open", { target: client })),
    session: sid =>
      run("session", async () => {
        const q = await sb.from("live_sessions").select("*").eq("id", sid).limit(1);
        return q.error ? q : { data: (q.data && q.data[0]) || null };
      }),
    /* the open session of the signed-in person, the newest first */
    mine: () =>
      run("mine", async () => {
        const q = await sb
          .from("live_sessions")
          .select("*")
          .neq("state", "ended")
          .order("made_at", { ascending: false })
          .limit(1);
        return q.error ? q : { data: (q.data && q.data[0]) || null };
      }),
    set: (sid, what, flag) =>
      run("set", () => sb.rpc("live_session_set", { sid, what, flag: flag === undefined ? null : flag })),
    lines: sid =>
      run("lines", () =>
        sb.from("live_lines").select("id,side,body,at").eq("session", sid).order("at", { ascending: true }).limit(5000)
      ),
    /* Add lines. An id that the database has already is skipped, not added again. */
    addLines: rows =>
      run("addLines", async () => {
        const q = await sb.from("live_lines").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
        if (q.error && String(q.error.code) === "23505") return { data: rows.map(r => r.id) };
        return q.error ? q : { data: rows.map(r => r.id) };
      }),
  };
}
/* THE REALTIME CHANNEL of one session: Broadcast (signals) and Presence (who is in the room).
   on(ev): ev.k is "sig" (ev.p: the signal of the other device), "here" (ev.sides: the sides in the room) or
   "link" (ev.ok: the channel is connected or not). */
function lioChan(sb, sid, side) {
  let ch = null;
  return {
    open(on) {
      try {
        ch = sb.channel("live:" + sid, { config: { broadcast: { self: false }, presence: { key: side } } });
        ch.on("broadcast", { event: "sig" }, m => on({ k: "sig", p: (m && m.payload) || {} }));
        ch.on("presence", { event: "sync" }, () => on({ k: "here", sides: Object.keys(ch.presenceState() || {}) }));
        ch.subscribe(st => {
          if (st === "SUBSCRIBED") {
            on({ k: "link", ok: true });
            ch.track({ side });
          } else if (st === "CHANNEL_ERROR" || st === "TIMED_OUT" || st === "CLOSED") on({ k: "link", ok: false });
        });
      } catch (e) {
        report(e, "liveio.js: lioChan open");
        on({ k: "link", ok: false });
      }
    },
    send(p) {
      try {
        if (ch) ch.send({ type: "broadcast", event: "sig", payload: p });
      } catch (e) {
        report(e, "liveio.js: lioChan send");
      }
    },
    close() {
      try {
        if (ch) sb.removeChannel(ch);
      } catch (e) {
        report(e, "liveio.js: lioChan close");
      }
      ch = null;
    },
  };
}
/* SPEECH RECOGNITION of the browser. It runs without end (continuous). on: { start, final(text),
   interim(text), error(code), end }. The recognizer asks for the microphone by itself. This adapter gets
   words, never sound. */
function lioSpeech(win) {
  const C = win && (win.SpeechRecognition || win.webkitSpeechRecognition),
    sp = { can: !!C, on: {}, rec: null };
  const call = (k, v) => {
    if (typeof sp.on[k] === "function") sp.on[k](v);
  };
  sp.start = () => {
    if (!C) return;
    try {
      if (sp.rec) sp.rec.onend = sp.rec.onerror = sp.rec.onresult = sp.rec.onstart = null;
      const r = new C();
      sp.rec = r;
      r.continuous = true;
      r.interimResults = true;
      r.lang = (win.navigator && win.navigator.language) || "en-US";
      r.onstart = () => call("start");
      r.onerror = ev => call("error", (ev && ev.error) || "unknown");
      r.onend = () => call("end");
      r.onresult = ev => {
        let soft = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i],
            txt = (res[0] && res[0].transcript) || "";
          if (res.isFinal) call("final", txt);
          else soft += txt;
        }
        call("interim", soft);
      };
      r.start();
    } catch (e) {
      report(e, "liveio.js: lioSpeech start");
      call("error", "unknown");
      call("end");
    }
  };
  sp.stop = () => {
    try {
      if (sp.rec) sp.rec.abort();
    } catch (e) {
      report(e, "liveio.js: lioSpeech stop");
    }
  };
  return sp;
}
/* THE WAKE LOCK: the screen stays on during the call. The browser drops the lock when the page is hidden,
   so it is asked for again when the page shows again. Where the browser has no wake lock, nothing is said. */
function lioWake(nav, doc) {
  const w = { want: false, lock: null };
  const ask = async () => {
    if (!w.want || !nav || !nav.wakeLock || !nav.wakeLock.request) return;
    if (doc && doc.visibilityState && doc.visibilityState !== "visible") return;
    try {
      w.lock = await nav.wakeLock.request("screen");
    } catch (e) {
      report(e, "liveio.js: lioWake (the browser said no; the call goes on)");
    }
  };
  if (doc && doc.addEventListener)
    doc.addEventListener("visibilitychange", () => {
      if (!doc.visibilityState || doc.visibilityState === "visible") ask();
    });
  w.on = () => {
    w.want = true;
    return ask();
  };
  w.off = () => {
    w.want = false;
    try {
      if (w.lock && w.lock.release) w.lock.release();
    } catch (e) {
      report(e, "liveio.js: lioWake off");
    }
    w.lock = null;
  };
  return w;
}
/* THE STORAGE of the device. A browser that refuses storage gives null and keeps nothing. */
function lioStore(storage) {
  return {
    get(k) {
      try {
        return storage ? storage.getItem(k) : null;
      } catch (e) {
        report(e, "liveio.js: lioStore get");
        return null;
      }
    },
    set(k, v) {
      try {
        if (storage) storage.setItem(k, v);
        return true;
      } catch (e) {
        report(e, "liveio.js: lioStore set");
        return false;
      }
    },
    del(k) {
      try {
        if (storage) storage.removeItem(k);
      } catch (e) {
        report(e, "liveio.js: lioStore del");
      }
    },
  };
}
function lioClock() {
  return { now: () => Date.now(), set: (f, ms) => setTimeout(f, ms), clear: id => clearTimeout(id) };
}
/* A new id for one line, made on the device. */
function lioId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  const h = n => {
    let s = "";
    for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s;
  };
  return h(8) + "-" + h(4) + "-4" + h(3) + "-a" + h(3) + "-" + h(12);
}

/* THE ROOM CONTROLLER of one device.
   d: { sid, side ("coach" or "client"), db, chan, speech, wake, store, clock, id, change }
      change() is called after each change, so the screen draws again.
   It gives the object R:
     R.room     the row of the session (the truth comes from the database)
     R.mic      the listening status of this device; R.their: of the other device
     R.here     { coach, client }: who is on the channel now
     R.lines    each line of the session that this device knows, the oldest first: { id, side, text, at }
     R.buf      the lines of this device that the database has not confirmed yet
     R.interim  the words that the browser is still working on (shown faintly, never saved)
     R.wait     true: the database file has not run yet
     R.link     false: the realtime channel is not connected
     R.ready    the microphone check: "" (not tried), "yes", "no"
     R.hooks    { line: [], drop: [], room: [] }: functions of later parts. line(line) for each line that
                stays, of both sides; drop(id) when the echo filter takes a line back; room(room) after
                each change of the room.
   Functions: join, act (ok, headphones, start, pause, resume, end), micCheck, reconnect, flush, leave. */
function lioRoom(d) {
  const R = {
    sid: d.sid,
    side: d.side,
    room: null,
    mic: lvMicNew(d.speech.can),
    their: { status: "off" },
    here: {},
    lines: [],
    buf: lvBufNew(d.sid, d.side),
    heard: [] /* the last lines of the other device, each with t: when it arrived here */,
    interim: "",
    wait: false,
    link: true,
    ready: "",
    msg: "",
    dropped: 0,
    closed: false,
    hooks: { line: [], drop: [], room: [] },
  };
  const key = lvBufKey(d.sid, d.side),
    T = { restart: null, flush: null, hold: null, seen: null };
  let checking = false,
    flushing = false;
  const now = () => d.clock.now(),
    draw = () => {
      if (!R.closed && typeof d.change === "function") d.change(R);
    },
    hook = (k, v) =>
      R.hooks[k].forEach(f => {
        try {
          f(v, R);
        } catch (e) {
          report(e, "liveio.js: lioRoom hook " + k);
        }
      }),
    keep = () => d.store.set(key, lvBufPack(R.buf)),
    stop = k => {
      if (T[k] != null) d.clock.clear(T[k]);
      T[k] = null;
    },
    tellMic = () => d.chan.send({ k: "mic", side: R.side, status: R.mic.status });

  /* ----- the microphone ----- */
  function mic(ev, code) {
    const was = R.mic.status,
      r = lvMicOn(R.mic, ev, code);
    R.mic = r.mic;
    stop("restart");
    if (r.wait != null && R.mic.can)
      T.restart = d.clock.set(() => {
        T.restart = null;
        if (R.mic.status === "restarting") d.speech.start();
      }, r.wait);
    if (R.mic.status !== was) {
      tellMic();
      draw();
    }
  }
  d.speech.on = {
    start: () => {
      if (checking) {
        R.ready = "yes";
        d.speech.stop();
        return;
      }
      mic("start");
    },
    final: text => {
      if (checking) return; /* the check keeps no word */
      mic("result");
      heardHere(text);
    },
    interim: text => {
      if (checking) return;
      R.interim = String(text || "");
      draw();
    },
    error: code => {
      if (checking) {
        if (LV_HARD.indexOf(code) >= 0) {
          R.ready = "no";
          R.mic = Object.assign({}, R.mic, { why: code });
        }
        return;
      }
      mic("error", code);
    },
    end: () => {
      if (checking) {
        checking = false;
        if (!R.ready) R.ready = "no";
        draw();
        return;
      }
      R.interim = "";
      mic("end");
    },
  };
  function listen() {
    if (!R.mic.can) return;
    checking = false;
    mic("begin");
  }
  function halt() {
    stop("restart");
    R.interim = "";
    const was = R.mic.status;
    R.mic = lvMicOn(R.mic, "halt").mic;
    d.speech.stop();
    if (was !== R.mic.status) tellMic();
  }

  /* ----- the lines ----- */
  /* A final line of this device. An echo of the other device is dropped here and never sent. */
  function heardHere(text) {
    if (!R.room || R.room.state !== "live") return;
    const t = now(),
      set = lvEchoSet(R.room);
    R.heard = R.heard.filter(o => t - o.t <= LV_ECHO.strong.ms);
    if (lvEchoOf(text, t, R.heard, set)) {
      R.dropped++;
      return;
    }
    const line = lvBufAdd(R.buf, d.id(), text, t);
    if (!line) return;
    keep();
    R.lines = lvMerge(R.lines, [line]);
    d.chan.send({ k: "line", line });
    hook("line", line);
    stop("hold");
    T.hold = d.clock.set(() => {
      T.hold = null;
      flush();
    }, set.ms + 50);
    draw();
  }
  /* A line of the other device arrived. When it repeats a line of this device that is not sent yet, the two
     devices crossed: lvEchoKeep() says which one stays, and both devices use that rule. */
  function heardThere(line) {
    if (!line || !line.id || line.side === R.side || typeof line.text !== "string") return;
    const t = now(),
      set = lvEchoSet(R.room),
      mine = lvEchoOf(
        line.text,
        t,
        R.buf.lines.map(l => ({ id: l.id, side: l.side, text: l.text, at: l.at, t: l.at })),
        set
      );
    if (mine) {
      if (lvEchoKeep(mine, line).id === mine.id) return; /* this device keeps its line; the other drops its own */
      lvBufDrop(R.buf, mine.id);
      keep();
      R.lines = R.lines.filter(l => l.id !== mine.id);
      R.dropped++;
      hook("drop", mine.id);
    }
    const got = { id: line.id, side: line.side, text: line.text.slice(0, 2000), at: +line.at || t };
    R.heard.push(Object.assign({ t }, got));
    if (!R.lines.some(l => l.id === got.id)) {
      R.lines = lvMerge(R.lines, [got]);
      hook("line", got);
    }
    draw();
  }
  /* Send the waiting lines to the database. hold: the age a line must have (the window of the echo filter);
     0 sends all. A line leaves the device only when the database confirmed it. */
  async function flush(hold) {
    if (flushing || R.wait) return 0;
    const due = lvBufDue(R.buf, now(), hold == null ? lvEchoSet(R.room).ms : hold);
    if (!due.length) return 0;
    flushing = true;
    let n = 0;
    try {
      const r = await d.db.addLines(due.map(l => lvLineRow(l, R.sid)));
      if (r.ok) {
        n = lvBufConfirm(
          R.buf,
          due.map(l => l.id)
        );
        keep();
        R.msg = "";
      } else if (r.wait) R.wait = true;
      else R.msg = "Your lines wait on this device. They go to your account when the internet is back.";
    } finally {
      flushing = false;
    }
    draw();
    return n;
  }
  function flushLoop() {
    stop("flush");
    if (R.closed) return;
    T.flush = d.clock.set(async () => {
      T.flush = null;
      await flush();
      if (R.room && (R.room.state === "live" || R.buf.lines.length)) flushLoop();
    }, LV_FLUSH_MS);
  }

  /* ----- the room ----- */
  function apply(row) {
    if (!row) return;
    const was = R.room ? R.room.state : null;
    R.room = row;
    if (row.state !== was) {
      if (row.state === "live") {
        listen();
        d.wake.on();
        flushLoop();
      } else if (row.state === "paused") {
        halt();
        flush(0);
      } else if (row.state === "ended") {
        halt();
        d.wake.off();
        stop("seen");
        flush(0);
        flushLoop(); /* until each waiting line is confirmed */
      }
    }
    hook("room", row);
    draw();
  }
  async function reread() {
    const r = await d.db.session(R.sid);
    if (r.ok && r.data) apply(r.data);
    else if (r.wait) {
      R.wait = true;
      draw();
    }
    return r;
  }
  function seenLoop() {
    stop("seen");
    if (R.closed) return;
    T.seen = d.clock.set(async () => {
      T.seen = null;
      if (R.room && R.room.state !== "ended") {
        const r = await d.db.set(R.sid, "seen");
        if (r.ok && r.data) apply(r.data);
        seenLoop();
      }
    }, LV_SEEN_MS);
  }
  function signal(ev) {
    if (R.closed) return;
    if (ev.k === "link") {
      R.link = !!ev.ok;
      if (ev.ok) d.chan.send({ k: "hello", side: R.side });
      draw();
    } else if (ev.k === "here") {
      R.here = { coach: ev.sides.indexOf("coach") >= 0, client: ev.sides.indexOf("client") >= 0 };
      draw();
    } else if (ev.k === "sig") {
      const p = ev.p || {};
      if (p.k === "room") reread(); /* the row is the truth, not the signal */
      else if (p.k === "mic" && p.side !== R.side) {
        R.their = { status: String(p.status || "off") };
        draw();
      } else if (p.k === "hello" && p.side !== R.side) tellMic();
      else if (p.k === "line") heardThere(p.line);
    }
  }
  /* Join, or join again after a reload: read the row, take back the lines that waited on this device, read
     the lines that the database has, open the channel, and send what waited. */
  R.join = async () => {
    R.buf = lvBufUnpack(d.store.get(key), R.sid, R.side);
    R.lines = lvMerge([], R.buf.lines);
    const r = await d.db.session(R.sid);
    if (!r.ok || !r.data) {
      R.wait = !!r.wait;
      R.msg = r.wait
        ? ""
        : r.net
          ? "Could not reach the server. Check your internet, then tap Check again."
          : "This session is not open for this account.";
      draw();
      return false;
    }
    const L = await d.db.lines(R.sid);
    if (L.ok) R.lines = lvMerge(R.lines, (L.data || []).map(lvRowLine));
    d.chan.open(signal);
    const seen = await d.db.set(R.sid, "seen");
    apply(seen.ok && seen.data ? seen.data : r.data);
    if (R.room[R.side + "_listens"] !== R.mic.can) await R.act("listens", R.mic.can, true);
    seenLoop();
    if (R.buf.lines.length) {
      await flush(0);
      flushLoop();
    }
    return true;
  };
  /* One step of this side. The rules are checked here first (lvRoomDo), then by the database. */
  R.act = async (what, flag, quiet) => {
    if (!R.room) return false;
    if (!lvRoomDo(R.room, R.side, what, now(), flag).changed) {
      /* this device may have missed a signal: read the row one time, then look again */
      await reread();
      if (!R.room || !lvRoomDo(R.room, R.side, what, now(), flag).changed) return false;
    }
    const r = await d.db.set(R.sid, what, flag);
    if (!r.ok) {
      R.wait = !!r.wait;
      if (!quiet && !r.wait) R.msg = "That did not go through. Check your internet, then tap it again.";
      draw();
      return false;
    }
    R.msg = "";
    apply(r.data);
    d.chan.send({ k: "room" });
    return true;
  };
  /* The step "Allow the microphone", before Start: the recognizer starts for a moment, so the browser shows
     its permission prompt, and stops at once. No word of the check is kept. */
  R.micCheck = () => {
    if (!R.mic.can || checking || (R.room && R.room.state === "live")) return;
    checking = true;
    R.ready = "";
    d.speech.start();
    draw();
  };
  R.reconnect = () => {
    if (R.room && R.room.state === "live") listen();
  };
  R.flush = flush;
  R.leave = () => {
    R.closed = true;
    Object.keys(T).forEach(stop);
    d.speech.on = {};
    d.speech.stop();
    d.wake.off();
    d.chan.close();
  };
  return R;
}
