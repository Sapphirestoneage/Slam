/* ============================================================================
   SLAM the Game: account/livegame.js
   PURPOSE     Live Session Mode: join the live fill (account/liveland.js) to the REAL saved game of the
               client. (1) The client's device loads the client's own saved game, or makes the first
               game of a new client, gives it to lfAttach, and saves each change. (2) The coach's device
               reads the shared game of the client, and saves the review of Part 7 into it.
   INPUT       A Supabase client (or the stand-in simSb of account/livesim.js). The id of the account.
               The store of the device (lioStore). A clock (lioClock).
   OUTPUT      Functions: lgFirst, lgPerson, lgClient, lgCoach, lgAttach.
   DEPENDS ON  core/report.js, core/engine.js (newChar, migrate), account/cloud.js (clSig,
               clMergePerson: the stamp of each person, and the merge of two copies of one person),
               account/coachpage.js (cpGame, cpSaveGame: the one function that reads, changes and saves
               the pieces of a saved game outside the game page), account/liveland.js (lfAttach,
               lfHeard, lfCounts). session.html loads this file.
   RULES       No second saver. The game page saves with save() in screens/ui.js, which needs the whole
               game on the page. This page has no game screen, so it saves with cpSaveGame, the same
               function that the coach page uses: it reads the saved game again, merges, and writes the
               same pieces (slam_part_N, slam_meta) that the game reads.
               THE STAMP. Each person has c.mod, the time of the last real change (cloud.js). A change
               of the call sets c.mod, so the game on another device takes this copy. When the saved
               copy of the person is newer and this page changed nothing, the saved copy wins. The open
               tasks of the other copy are never lost (clMergePerson).
               A change is on the device (the store) from the first moment, and in the account a moment
               later. A reload of the page in the middle of a call loses no value.
               What this page does NOT do: afterMoney() of the game (the snapshot of today and the
               badges). The totals are summed here (syncAll, by liveland.js). The game does the rest at
               its next change of a money number.
   STATE       R.game (one adapter for each room controller).
   ========================================================================= */
const LG_KEY = "slam_live_game_"; /* + the id of the account: the profile of the call, kept on the device */
const LG_SAVE_MS = 800; /* a change goes to the account this long after the last change */
const LG_RETRY_MS = 15000; /* a save that did not go through is sent again */
const LG_LINK_TRIES = 60; /* after a load, wait this many half seconds for the live link before the list goes out */

/* The first game of a new client: the shape of fresh() in screens/ui.js, with one new person and no sample
   people. tests/live-game-join.js compares the keys with fresh(), so the two cannot drift apart. */
function lgFirst(name) {
  return {
    v: 4,
    chars: [
      newChar({
        name:
          String(name || "")
            .trim()
            .slice(0, 60) || "You",
      }),
    ],
    active: 0,
    house: { share: "No one" },
    gamer: false,
    coachDiary: true,
    flags: [],
    rpTold: [],
    demo: false,
  };
}
/* The person of the call in one game: the active person, or the first one that is not a sample. */
function lgPerson(g) {
  if (!g || !Array.isArray(g.chars)) return null;
  const a = g.chars[g.active];
  return a && !a.demo ? a : g.chars.find(c => c && !c.demo) || null;
}
/* Read the saved game of one account. Gives { ok, g } (g is null when the account has no game yet),
   or { ok: false, net } (the server cannot be reached, or the saved game is not whole). */
async function lgRead(sb, owner) {
  try {
    const q = await sb.from("games").select("id,name,data,updated_at,share_with_coach").eq("owner", owner);
    if (q.error) return { ok: false, net: true };
    const rows = q.data || [],
      G0 = cpGame(rows);
    if (!G0) return rows.some(r => r.name === "slam_meta") ? { ok: false, net: false } : { ok: true, g: null };
    if (G0.g && Array.isArray(G0.g.chars)) G0.g.chars = G0.g.chars.map(migrate);
    return { ok: true, g: G0.g, share: G0.share };
  } catch (e) {
    report(e, "livegame.js: lgRead");
    return { ok: false, net: true };
  }
}

/* THE CLIENT'S DEVICE. o: { sb, uid, name, store, clock, change }. Gives the adapter that lfAttach wants:
   get() gives the profile (null until the game is loaded), save(c) keeps the change. Also: load(), flush(),
   st ("load", "on", "saving", "off"), says (one line for the screen). */
function lgClient(o) {
  const A = { side: "client", g: null, c: null, st: "load", first: false, saves: 0, pushes: 0, sig: "", dirty: false };
  let timer = null,
    busy = false,
    again = false;
  const key = LG_KEY + o.uid,
    tell = () => {
      if (typeof o.change === "function") o.change(A);
    },
    later = ms => {
      if (timer != null) o.clock.clear(timer);
      timer = o.clock.set(() => {
        timer = null;
        A.push();
      }, ms);
    };
  A.get = () => A.c;
  A.says = () =>
    A.st === "on"
      ? "Saved to your profile."
      : A.st === "saving"
        ? "Saving to your profile…"
        : A.st === "off"
          ? "Not in your account yet. It is kept on this device, and this page tries again by itself."
          : "Opening your profile…";
  /* Load the saved game. A copy that waited on this device (a reload before the save went out) is merged
     in by the stamps. A new client gets the first game, and it is saved at once. */
  A.load = async () => {
    const r = await lgRead(o.sb, o.uid);
    if (!r.ok) {
      A.st = A.c ? "off" : "load";
      A.retry = o.clock.set(() => A.load(), 5000);
      tell();
      return false;
    }
    A.first = !r.g;
    A.g = r.g || lgFirst(o.name);
    let c = lgPerson(A.g);
    if (!c) {
      c = newChar({
        name:
          String(o.name || "")
            .trim()
            .slice(0, 60) || "You",
      });
      A.g.chars.push(c);
      A.g.active = A.g.chars.length - 1;
    }
    let kept = null;
    try {
      const raw = o.store ? o.store.get(key) : null;
      kept = raw ? JSON.parse(raw) : null;
    } catch (e) {
      report(e, "livegame.js: lgClient load");
    }
    A.c = c;
    A.sig = clSig(c);
    if (kept && kept.c && kept.c.name === c.name && clMergePerson(kept.c, c) === null) {
      /* the copy of this device is the later one: it takes the place, and goes to the account */
      A.g.chars[A.g.chars.indexOf(c)] = A.c = migrate(kept.c);
      A.dirty = true;
    }
    A.st = "on";
    if (A.first || A.dirty) await A.push();
    tell();
    return true;
  };
  /* lfAttach calls this after each line that changed the profile. */
  A.save = c => {
    A.saves++;
    if (c && c !== A.c) A.c = c;
    const sig = clSig(A.c);
    if (sig !== A.sig) {
      A.c.mod = Date.now();
      A.sig = sig;
    }
    A.dirty = true;
    if (o.store) o.store.set(key, JSON.stringify({ at: Date.now(), c: A.c }));
    later(LG_SAVE_MS);
  };
  /* Send the profile to the account now. */
  A.push = async () => {
    if (!A.c) return false;
    if (busy) {
      again = true;
      return false;
    }
    if (timer != null) o.clock.clear(timer);
    timer = null;
    busy = true;
    A.st = "saving";
    let ok = false;
    try {
      CP.sb = o.sb;
      const mine = A.c,
        g = await cpSaveGame(
          o.uid,
          g0 => {
            const i = g0.chars.findIndex(x => x && !x.demo && x.name === mine.name);
            if (i < 0) {
              g0.chars.push(mine);
              if (!lgPerson(g0) || g0.demo) g0.active = g0.chars.length - 1;
            } else if (g0.chars[i] !== mine) {
              const m = clMergePerson(mine, g0.chars[i]);
              g0.chars[i] = m || mine;
            }
            g0.demo = false;
            g0.savedAt = Date.now();
            return g0;
          },
          () => A.g
        );
      A.g = g;
      /* the same object stays the profile of the call when this device won the merge */
      const now = g.chars.find(x => x && !x.demo && x.name === mine.name);
      if (now && now !== A.c && A.c === mine) {
        A.c = now;
        A.sig = clSig(now);
      }
      A.pushes++;
      A.first = false;
      A.dirty = false;
      A.st = "on";
      if (o.store) o.store.del(key);
      ok = true;
    } catch (e) {
      report(e, "livegame.js: lgClient push");
      A.st = "off";
      later(LG_RETRY_MS); /* no change is dropped: it stays on the device and is sent again */
    }
    busy = false;
    if (again) {
      again = false;
      if (A.dirty) return A.push();
    }
    tell();
    return ok;
  };
  /* Send what waits, with no delay: when the session ends, and when the page goes to the background. */
  A.flush = async () => (A.dirty ? A.push() : true);
  /* One change of the client's own, after the call ("Delete this transcript", account/liveforget.js): send
     what waits, read the saved game again (the coach may have changed it in the review), change the person of
     the call with fn(c, g), and save. The same shape as act() of the coach. Gives what fn gave, or null. */
  A.act = async fn => {
    await A.flush();
    A.err = "";
    let out = null,
      g1 = null,
      c1 = null;
    try {
      CP.sb = o.sb;
      out = await cpSaveGame(o.uid, g => {
        const c = lgPerson(g);
        if (!c) return null;
        const r = fn(c, g);
        if (r === null || r === undefined || r === false) return null;
        c.mod = Date.now();
        g.savedAt = c.mod;
        g1 = g;
        c1 = c;
        return r;
      });
      if (out !== null && g1) {
        A.g = g1;
        A.c = c1;
        A.sig = clSig(c1);
        A.dirty = false;
        if (o.store) o.store.del(key); /* the copy of the profile on this device had the old words */
      }
    } catch (e) {
      report(e, "livegame.js: lgClient act");
      A.err = "That did not save. Check your internet, then tap it again.";
      out = null;
    }
    tell();
    return out;
  };
  return A;
}

/* THE COACH'S DEVICE. o: { sb, owner (the id of the client's account), clock, change }. The coach reads
   the game that the client shares, and changes it only in the review after the call (act). */
function lgCoach(o) {
  const A = { side: "coach", g: null, c: null, st: "load", owner: o.owner, busy: false, err: "", sb: o.sb };
  const tell = () => {
    if (typeof o.change === "function") o.change(A);
  };
  A.get = () => A.c;
  A.load = async () => {
    const r = await lgRead(o.sb, o.owner);
    if (r.ok) {
      A.g = r.g;
      A.c = r.g ? lgPerson(r.g) : null;
      A.st = A.c ? "on" : "none";
    } else A.st = A.c ? "on" : "off";
    tell();
    return r.ok && !!A.c;
  };
  /* One change of the review: read the client's saved game again, change the person of the call with
     fn(c, g), and save. fn gives null when nothing changes. The person gets a new stamp, and the game gets
     the mark "a coach changed this" (the same mark as a quest from the coach page). Gives what fn gave,
     or null. A change that does not save changes nothing on this device. */
  A.act = async (fn, note) => {
    if (A.busy) return null;
    A.busy = true;
    A.err = "";
    let out = null;
    try {
      CP.sb = o.sb;
      out = await cpSaveGame(o.owner, g => {
        const c = lgPerson(g);
        if (!c) return null;
        const r = fn(c, g);
        if (r === null || r === undefined || r === false) return null;
        const now = Date.now();
        c.mod = now;
        g.coachEdit = { at: now, by: "coach" };
        g.savedAt = now;
        A.g = g;
        A.c = c;
        return r;
      });
      /* one line in the audit log: a coach changed the game of a client (the action name is one of the
         names that the function audit_write knows) */
      if (out !== null && typeof o.sb.rpc === "function")
        Promise.resolve(
          o.sb.rpc("audit_write", { act: "session_note", tgt: o.owner, nt: "Live session review: " + (note || "") })
        ).then(
          () => {},
          () => {}
        );
    } catch (e) {
      report(e, "livegame.js: lgCoach act");
      A.err = "That did not save. Check your internet, then tap it again.";
      out = null;
    }
    A.busy = false;
    tell();
    return out;
  };
  return A;
}

/* JOIN ONE ROOM TO THE GAME. liveroom.js calls this before R.join(), and simPair (livesim.js) for a made-up
   session. o: { sb, uid, name, owner, store, clock, change }.
   The client's device: R.game is lgClient, and the live fill writes into it. The coach's device: R.game is
   lgCoach, and the live fill only shows what the other device heard.
   R.game.ready is a promise: the game is loaded (or the load failed and tries again). */
function lgAttach(R, o) {
  const client = R.side === "client",
    A = client
      ? lgClient({ sb: o.sb, uid: o.uid, name: o.name, store: o.store, clock: o.clock, change: o.change })
      : lgCoach({ sb: o.sb, owner: o.owner, clock: o.clock, change: o.change });
  R.game = A;
  lfAttach(R, client ? { game: A, clock: o.clock } : { clock: o.clock });
  if (typeof lsAttach === "function") lsAttach(R, o); /* livescreen.js: what the two screens show */
  const whole = () => {
    /* the heard list of this session is on the profile: after a load or a reload it is whole again */
    const c = A.get();
    if (!client || !c) return;
    R.fill.heard = lfHeard(c, R.sid).slice();
    R.fill.n = lfCounts(c, R.sid);
    R.tell({ k: "fill", all: R.fill.heard, n: R.fill.n });
    R.fire("fill", { all: R.fill.heard, n: R.fill.n, here: true });
  };
  /* the list goes to the other device when the live link is open: the load can end before R.join() opened it
     (R.room is set by R.join after the channel opened; R.link alone is true before that) */
  let tries = 0;
  const wholeWhenLinked = () => {
    if (R.closed) return;
    if ((R.room && R.link) || tries >= LG_LINK_TRIES) return whole();
    tries++;
    o.clock.set(wholeWhenLinked, 500);
  };
  A.ready = A.load().then(
    ok => {
      wholeWhenLinked();
      return ok;
    },
    e => {
      report(e, "livegame.js: lgAttach");
      return false;
    }
  );
  R.hooks.room.push(room => {
    if (room.state !== "ended" || A.ended) return;
    A.ended = true;
    if (client) A.flush();
    else o.clock.set(() => A.load(), 1500); /* the client's last save is in the account by then */
  });
  return A;
}
