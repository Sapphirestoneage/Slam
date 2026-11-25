/* ============================================================================
   SLAM the Game: account/livesim.js
   PURPOSE     A stand-in for each adapter of account/liveio.js, with the same shape: the database
               (simDb), the realtime channel (simHub), speech recognition (simSpeech), the wake lock
               (simWake), the storage (simStore), the clock (simClock), the ids (simId). The tests use
               them to run a whole session of two devices with scripted lines: no microphone, no
               network, no database. The session page uses them for "Try the room with a made-up
               client" (session.html?sim=coach or ?sim=client), so the room can be seen on one device.
   INPUT       Values only.
   OUTPUT      Functions: simClock, simStore, simWake, simId, simSpeech, simHub, simDb, simPair,
               simScript, simGame, simScriptFill.
   DEPENDS ON  account/live.js, account/liveio.js (simPair makes two lioRoom controllers). With o.game,
               simPair also needs account/livefill.js and account/liveland.js (lfAttach).
               session.html loads this file. The tests load it by themselves.
   RULES       simDb follows the rules of supabase/migrations/20261125210000_live_sessions.sql: a link
               works one time and for 7 days, only a coach makes a link, only the two members read a
               session and its lines, a side adds only its own lines, and each id is taken one time.
               Each name and each number of simScript() is made up.
   ========================================================================= */
/* A clock that the test moves by hand. run(ms) moves the time and runs each timer that is due, in order. */
function simClock(t0) {
  const C = { t: t0 || 1000000, q: [], n: 0 };
  C.now = () => C.t;
  C.set = (f, ms) => {
    C.q.push({ id: ++C.n, at: C.t + Math.max(0, ms || 0), f });
    return C.n;
  };
  C.clear = id => {
    C.q = C.q.filter(x => x.id !== id);
  };
  C.settle = () => new Promise(r => setTimeout(r, 0));
  C.run = async ms => {
    const end = C.t + (ms || 0);
    await C.settle();
    for (;;) {
      const due = C.q.filter(x => x.at <= end).sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!due) break;
      C.q = C.q.filter(x => x !== due);
      C.t = Math.max(C.t, due.at);
      due.f();
      await C.settle();
    }
    C.t = end;
    await C.settle();
  };
  return C;
}
function simStore() {
  const S = { m: {} };
  S.get = k => (k in S.m ? S.m[k] : null);
  S.set = (k, v) => {
    S.m[k] = String(v);
    return true;
  };
  S.del = k => {
    delete S.m[k];
  };
  return S;
}
function simWake() {
  const W0 = { held: false, asks: 0 };
  W0.on = () => {
    W0.held = true;
    W0.asks++;
  };
  W0.off = () => {
    W0.held = false;
  };
  return W0;
}
function simId(prefix) {
  let n = 0;
  return () => (prefix || "id") + "-" + String(++n).padStart(5, "0");
}
/* Speech recognition. can: false stands for a browser with no speech recognition (a phone, Safari, Firefox).
   say(text): a final line. soft(text): words that are not final. drop(code): the browser ends listening,
   with an error code or with none. deny: true stands for a refused microphone. */
function simSpeech(can) {
  const S = { can: can !== false, on: {}, running: false, starts: 0, deny: false };
  const call = (k, v) => {
    if (typeof S.on[k] === "function") S.on[k](v);
  };
  S.start = () => {
    if (!S.can) return;
    S.starts++;
    if (S.deny) {
      call("error", "not-allowed");
      call("end");
      return;
    }
    S.running = true;
    call("start");
  };
  S.stop = () => {
    if (!S.running) return;
    S.running = false;
    call("end");
  };
  S.say = text => {
    if (S.running) call("final", text);
    return S.running;
  };
  S.soft = text => {
    if (S.running) call("interim", text);
  };
  S.drop = code => {
    if (!S.running) return;
    S.running = false;
    if (code) call("error", code);
    call("end");
  };
  return S;
}
/* The realtime channels. A signal reaches the other device after lag milliseconds. down: true drops each
   signal (the live link is off). */
function simHub(clock, lag) {
  const H = { rooms: {}, lag: lag == null ? 100 : lag, down: false, sent: 0 };
  const tell = name => {
    const sides = (H.rooms[name] || []).map(x => x.side);
    (H.rooms[name] || []).forEach(x => x.on({ k: "here", sides }));
  };
  H.chan = (sid, side) => {
    const name = "live:" + sid;
    let me = null;
    return {
      open(on) {
        me = { side, on };
        (H.rooms[name] = H.rooms[name] || []).push(me);
        on({ k: "link", ok: !H.down });
        tell(name);
      },
      send(p) {
        if (!me || H.down) return;
        H.sent++;
        const copy = JSON.parse(JSON.stringify(p));
        (H.rooms[name] || [])
          .filter(x => x !== me)
          .forEach(x => clock.set(() => (H.rooms[name] || []).indexOf(x) >= 0 && x.on({ k: "sig", p: copy }), H.lag));
      },
      close() {
        H.rooms[name] = (H.rooms[name] || []).filter(x => x !== me);
        me = null;
        tell(name);
      },
    };
  };
  return H;
}
/* The database. S.as(uid) gives the adapter of one signed-in account (uid null: a visitor).
   S.coaches[uid] = true makes a coach. S.admins[uid] = true makes the admin. S.shared[uid] = true: that
   account shares its game with its coach. S.missing = true: the database file has not run. S.down = true:
   the server cannot be reached. */
function simDb(clock, opt) {
  const S = {
    invites: [],
    tags: [],
    sessions: [],
    lines: [],
    coaches: {},
    admins: {},
    shared: {},
    missing: !!(opt && opt.missing),
    down: false,
    n: 0,
    writes: 0,
  };
  const DAY = 864e5,
    ok = data => ({ ok: true, data: data === undefined ? null : JSON.parse(JSON.stringify(data)) }),
    no = why => ({ ok: false, why }),
    tok = () => {
      let s = "";
      while (s.length < 64) s += Math.floor(Math.random() * 16).toString(16);
      return s;
    },
    member = (s, uid) => !!s && !!uid && (s.coach === uid || s.client === uid),
    tag = (coach, client, invite) => {
      if (!S.tags.some(t => t.coach === coach && t.client === client))
        S.tags.push({ coach, client, invite: invite || null, since: clock.now() });
    },
    open = (coach, client) =>
      S.sessions
        .filter(s => s.coach === coach && s.client === client && s.state !== "ended")
        .sort((a, b) => b.made_at - a.made_at)[0],
    make = (coach, client, invite) => {
      const s = lvRoomNew("sess-" + ++S.n, coach, client, clock.now());
      s.invite = invite || null;
      S.sessions.push(s);
      return s;
    };
  S.as = uid => {
    const gate =
      f =>
      async (...a) => {
        if (S.missing) return { ok: false, wait: true };
        if (S.down) return { ok: false, net: true };
        return f(...a);
      };
    return {
      inviteMake: gate((clientName, coachName) => {
        if (!S.coaches[uid] && !S.admins[uid]) return no("coach or admin only");
        const r = {
          id: "inv-" + ++S.n,
          token: tok(),
          coach: uid,
          coach_name: String(coachName || "").slice(0, 60),
          client_name: String(clientName || "").slice(0, 60),
          made_at: clock.now(),
          expires_at: clock.now() + LV_INVITE_DAYS * DAY,
          used_at: null,
          used_by: null,
        };
        S.invites.push(r);
        return ok({
          id: r.id,
          token: r.token,
          client_name: r.client_name,
          made_at: r.made_at,
          expires_at: r.expires_at,
        });
      }),
      inviteCheck: gate(t => {
        const r = S.invites.find(x => x.token === t);
        if (!r) return ok({ state: "none" });
        return ok({
          state: r.used_at
            ? uid && r.used_by === uid
              ? "mine"
              : "used"
            : r.expires_at <= clock.now()
              ? "expired"
              : "open",
          coach_name: r.coach_name,
          client_name: r.client_name,
        });
      }),
      inviteUse: gate(t => {
        if (!uid) return no("sign in first");
        const r = S.invites.find(x => x.token === t);
        if (!r) return ok({ state: "none" });
        if (r.coach === uid) return ok({ state: "own" });
        if (r.used_at && r.used_by !== uid) return ok({ state: "used" });
        if (!r.used_at) {
          if (r.expires_at <= clock.now()) return ok({ state: "expired" });
          r.used_at = clock.now();
          r.used_by = uid;
          tag(r.coach, uid, r.id);
        }
        return ok({ state: "ok", session: open(r.coach, uid) || make(r.coach, uid, r.id), coach_name: r.coach_name });
      }),
      invites: gate(() =>
        ok(S.invites.filter(r => r.coach === uid || S.admins[uid]).sort((a, b) => b.made_at - a.made_at))
      ),
      sessions: gate(() =>
        ok(S.sessions.filter(s => member(s, uid) || S.admins[uid]).sort((a, b) => b.made_at - a.made_at))
      ),
      sessionOpen: gate(client => {
        if (!S.coaches[uid] && !S.admins[uid]) return no("coach or admin only");
        if (!client || client === uid) return no("not with your own account");
        if (!S.tags.some(t => t.coach === uid && t.client === client) && !S.shared[client])
          return no("not your client");
        return ok(open(uid, client) || make(uid, client, null));
      }),
      session: gate(sid => {
        const s = S.sessions.find(x => x.id === sid);
        return ok(member(s, uid) || (s && S.admins[uid]) ? s : null);
      }),
      mine: gate(() =>
        ok(
          S.sessions.filter(s => member(s, uid) && s.state !== "ended").sort((a, b) => b.made_at - a.made_at)[0] || null
        )
      ),
      set: gate((sid, what, flag) => {
        const i = S.sessions.findIndex(x => x.id === sid),
          s = S.sessions[i];
        if (!s) return no("no such session");
        if (!member(s, uid)) return no("not a member");
        const side = s.coach === uid ? "coach" : "client";
        if (what === "seen" && side === "client") tag(s.coach, s.client, s.invite);
        S.sessions[i] = lvRoomDo(s, side, what, clock.now(), flag).room;
        return ok(S.sessions[i]);
      }),
      lines: gate(sid => {
        const s = S.sessions.find(x => x.id === sid);
        if (!member(s, uid) && !(s && S.admins[uid])) return ok([]);
        return ok(S.lines.filter(l => l.session === sid).sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0)));
      }),
      addLines: gate(rows => {
        for (const r of rows) {
          const s = S.sessions.find(x => x.id === r.session),
            side = s && s.coach === uid ? "coach" : s && s.client === uid ? "client" : "",
            open2 =
              s &&
              (s.state === "live" || s.state === "paused" || (s.state === "ended" && clock.now() - s.ended_at < 36e5));
          if (!side || side !== r.side || !open2) return no("new row violates row-level security policy");
        }
        rows.forEach(r => {
          if (S.lines.some(l => l.id === r.id)) return; /* an id is taken one time */
          S.lines.push(Object.assign({ by: uid }, r));
          S.writes++;
        });
        return ok(rows.map(r => r.id));
      }),
    };
  };
  return S;
}
/* Two devices in one session, each with its own controller and its own stand-ins. o: { clock, db, hub, sid,
   coach, client, coachCan, clientCan, change }. Gives { coach, client }: each one is { R, speech, wake,
   store }. A store can be passed in again (o.stores) to stand for a reload of the page. */
function simPair(o) {
  const one = (side, uid, can) => {
    const dev = {
      speech: simSpeech(can),
      wake: simWake(),
      store: (o.stores && o.stores[side]) || simStore(),
    };
    dev.R = lioRoom({
      sid: o.sid,
      side,
      db: o.db.as(uid),
      chan: o.hub.chan(o.sid, side),
      speech: dev.speech,
      wake: dev.wake,
      store: dev.store,
      clock: o.clock,
      id: simId(side + "-" + (o.tag || "a")),
      change: o.change,
    });
    return dev;
  };
  const P = { coach: one("coach", o.coach, o.coachCan), client: one("client", o.client, o.clientCan) };
  /* o.game (simGame): the client's device holds the game and fills it; the coach's device shows the list */
  if (o.game && typeof lfAttach === "function") {
    lfAttach(P.client.R, { game: o.game, clock: o.clock });
    lfAttach(P.coach.R, { clock: o.clock });
  }
  return P;
}
/* A stand-in for the device that holds the client's game: one profile, and a count of the saves. */
function simGame(c) {
  const g = { c, saves: 0 };
  g.get = () => g.c;
  g.save = () => {
    g.saves++;
  };
  return g;
}
/* A short made-up call: [milliseconds after the line before, side, words]. */
function simScript() {
  return [
    [1500, "coach", "Thanks for joining. Let's start with what comes in."],
    [2500, "client", "I get paid every two weeks, about two thousand one hundred each time."],
    [3000, "coach", "And what is your rent?"],
    [2500, "client", "Rent is fourteen hundred a month."],
    [3000, "coach", "Any cards with a balance?"],
    [2500, "client", "One card, about three thousand two hundred on it."],
    [3000, "coach", "Good. That gives us a first picture."],
  ];
}
/* A longer made-up call for the live fill (Parts 3, 4 and 5): topics and answers, a rough number, a
   correction, a "Confirming" with yes, one with no, and what-ifs. Same shape as simScript(). */
function simScriptFill() {
  return [
    [1500, "coach", "Thanks for joining. How often do you get paid?"],
    [2500, "client", "I get paid every two weeks, about two thousand one hundred each time."],
    [4000, "coach", "And what is your rent?"],
    [2500, "client", "Rent is eighteen fifty a month."],
    [4000, "coach", "What about groceries?"],
    [2500, "client", "400-ish, maybe 500."],
    [4000, "coach", "Any cards with a balance?"],
    [2500, "client", "One card, about three thousand two hundred on it."],
    [2500, "client", "No wait, 3,400."],
    [4000, "coach", "What is the rate on that card?"],
    [2500, "client", "24.99 percent."],
    [4000, "coach", "How much is in savings?"],
    [2500, "client", "Between 3 and 4 thousand."],
    [4000, "coach", "Confirming rent 1,850."],
    [2000, "client", "Yes."],
    [4000, "coach", "Confirming the card balance 3,400."],
    [2000, "client", "Actually it went up a little."],
    [4000, "client", "If I moved in with my sister, rent would be 900."],
    [4000, "coach", "What if you picked up a second job?"],
    [3000, "client", "Someday I want to take a trip to Japan."],
    [4000, "coach", "Good. That gives us a first picture."],
  ];
}
