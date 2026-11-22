/* ============================================================================
   SLAM the Game: account/cloud.js
   PURPOSE     The game saves itself to the account of the player. Thus the game goes with the player
               from a phone to a laptop. The copy in the browser stays as a backup for the time with no
               connection.
   INPUT       The game: G.active, G.chars, G.coach, G.demo, G.gone, G.savedAt. The taps of the player
               (the actions in OUTPUT).
   OUTPUT      18 functions. Parts of functions in other files: saveStamp, closeSheetCloud,
               menuSheetCloud. Actions (ACT): backup, prmyes, people.
   DEPENDS ON  core/report.js, core/engine.js, screens/ui.js, screens/profiles.js, screens/planner.js.
   STATE       CLOUD (st, at, err, db, uid, dev, busy, timer, last, pending).
   ========================================================================= */
const CLOUD = {
  st: "connecting",
  at: 0,
  err: "",
  db: null,
  uid: null,
  dev: "d" + Math.random().toString(36).slice(2, 9),
  busy: false,
  again: false,
  timer: null,
  last: {},
  pending: false,
};
const CL_PART = 180000;
function clRefs() {
  const col = CLOUD.db.collection("data/users/" + CLOUD.uid);
  return { meta: col.doc("slam_meta"), part: i => col.doc("slam_part_" + i) };
}
function clAgo(ms) {
  const s = Math.round((Date.now() - ms) / 1000);
  return s < 10
    ? "just now"
    : s < 60
      ? s + " seconds ago"
      : s < 3600
        ? Math.round(s / 60) + " min ago"
        : Math.round(s / 3600) + " hr ago";
}
function clStatus() {
  /* the sample game is never saved, so the status must not say "Saved" while it is open */
  if (G && G.demo && CLOUD.db) return "Sample game · not saved. Make your own character to save it to your account";
  return CLOUD.st === "on"
    ? "Saved to your account" + (CLOUD.at ? " · " + clAgo(CLOUD.at) : "")
    : CLOUD.st === "connecting"
      ? "Connecting to your account…"
      : CLOUD.st === "saving"
        ? "Saving to your account…"
        : "Saved on this phone only" + (CLOUD.err ? " (" + CLOUD.err + ")" : "");
}

/* Part of saveQuiet() in ui.js. Records the time of the save. Removes a name from the list of removed people when that person is back.
   After the save, saveQuiet() calls clQueue(): each save also goes to the account, a moment later, in one write. */
function saveStamp() {
  try {
    if (G) {
      G.savedAt = Date.now();
      if (G.gone) G.gone = G.gone.filter(n => !G.chars.some(c => c.name === n));
    }
  } catch (e) {
    report(e, "cloud.js: saveStamp");
  }
}
function clQueue() {
  if (!CLOUD.db || !CLOUD.uid || G.demo) return;
  clearTimeout(CLOUD.timer);
  CLOUD.timer = setTimeout(clPush, 1200);
}
async function clPush() {
  if (!CLOUD.db || G.demo) return;
  if (CLOUD.busy) {
    CLOUD.again = true;
    return;
  }
  CLOUD.busy = true;
  const prev = CLOUD.st;
  CLOUD.st = "saving";
  try {
    const r = clRefs();
    try {
      const m0 = await r.meta.get();
      if (m0.exists) {
        const mt = m0.data() || {};
        if (mt.dev !== CLOUD.dev && (mt.at || 0) > (CLOUD.seen || 0)) {
          CLOUD.seen = mt.at;
          if (await clMergeRemote(mt)) {
            G.savedAt = Date.now();
            clApply();
          }
        }
      }
    } catch (e) {
      report(e, "cloud.js: clPush");
    }
    const at = G.savedAt || Date.now(),
      s = JSON.stringify(G),
      n = Math.max(1, Math.ceil(s.length / CL_PART));
    for (let i = 0; i < n; i++) {
      const piece = s.slice(i * CL_PART, (i + 1) * CL_PART);
      if (CLOUD.last[i] === piece) continue;
      await r.part(i).set({ s: piece });
      CLOUD.last[i] = piece;
    }
    await r.meta.set({ n, at, dev: CLOUD.dev, len: s.length });
    CLOUD.seen = at;
    CLOUD.at = Date.now();
    CLOUD.st = "on";
    CLOUD.err = "";
  } catch (e) {
    CLOUD.st = "off";
    CLOUD.err = e && e.code === "quota_exceeded" ? "your account storage is full" : "couldn't reach your account";
  }
  CLOUD.busy = false;
  clPaint();
  if (CLOUD.again) {
    CLOUD.again = false;
    clPush();
  }
}
async function clPull(meta) {
  const mine = G && !G.demo && G.chars ? G.chars.slice() : [];
  const r = clRefs();
  let s = "";
  for (let i = 0; i < meta.n; i++) {
    const d = await r.part(i).get();
    if (!d.exists) return false;
    const p = (d.data() || {}).s || "";
    CLOUD.last[i] = p;
    s += p;
  }
  if (meta.len && s.length !== meta.len) return false;
  let g;
  try {
    g = JSON.parse(s);
  } catch (e) {
    return false;
  }
  if (!(g && g.chars && g.chars.length)) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify(g));
  } catch (e) {
    report(e, "cloud.js: clPull (1)");
  }
  const fresh = load();
  if (!fresh) return false;
  G = fresh;
  G.savedAt = meta.at;
  CLOUD.at = meta.at;
  CLOUD.seen = meta.at;
  const kept = clMergeChars(G, { chars: mine });
  try {
    localStorage.setItem(KEY, JSON.stringify(G));
  } catch (e) {
    report(e, "cloud.js: clPull (2)");
  }
  if (kept)
    setTimeout(() => {
      try {
        save();
      } catch (e) {
        report(e, "cloud.js: clPull (3)");
      }
    }, 0);
  return true;
}
/* two devices, two games: never let one replace the other. People the account has and this device doesn't are added, not lost. */
function clMergeChars(local, remote) {
  let n = 0;
  if (!remote || !remote.chars) return 0;
  remote.chars.forEach(rc => {
    if (rc && !rc.demo && !(local.gone || []).includes(rc.name) && !local.chars.some(lc => lc.name === rc.name)) {
      local.chars.push(Object.assign(newChar(), rc));
      n++;
    }
  });
  (remote.gone || []).forEach(nm => {
    if ((local.gone || []).includes(nm)) return;
    const i = local.chars.findIndex(lc => lc.name === nm);
    if (i >= 0 && local.chars.length > 1) {
      local.chars.splice(i, 1);
      if (local.active >= local.chars.length) local.active = local.chars.length - 1;
      else if (local.active > i) local.active--;
      local.gone = (local.gone || []).concat([nm]);
      n++;
    }
  });
  return n;
}
async function clMergeRemote(meta) {
  try {
    const r = clRefs();
    let s = "";
    for (let i = 0; i < meta.n; i++) {
      const d = await r.part(i).get();
      if (!d.exists) return 0;
      s += (d.data() || {}).s || "";
    }
    const g = JSON.parse(s),
      n = clMergeChars(G, g);
    if (n) {
      try {
        localStorage.setItem(KEY, JSON.stringify(G));
      } catch (e) {
        report(e, "cloud.js: clMergeRemote");
      }
    }
    return n;
  } catch (e) {
    return 0;
  }
}
function clApply() {
  if (SH && typeof profSheet !== "undefined" && (SH === profSheet || (W && W.kind === "people"))) {
    render();
    drawSheet();
    return;
  }
  if (SH) {
    CLOUD.pending = true;
    return;
  }
  CLOUD.pending = false;
  render();
}
/* finish any save that is under way, then save once more, and wait for it */
async function clFlush() {
  const idle = async () => {
    for (let i = 0; i < 80 && CLOUD.busy; i++) await new Promise(r => setTimeout(r, 100));
  };
  clearTimeout(CLOUD.timer);
  await idle();
  if (!G.demo) await clPush();
  await idle();
}
/* look at the account again: when you come back to the page, and when you open the list of people */
async function clCheck() {
  if (!CLOUD.db || !CLOUD.uid || CLOUD.checking || CLOUD.busy) return;
  CLOUD.checking = true;
  try {
    const r = clRefs(),
      m = await r.meta.get();
    if (m.exists) {
      const meta = m.data() || {};
      if (meta.dev !== CLOUD.dev) {
        if (G.demo || (meta.at || 0) > (G.savedAt || 0)) {
          if (await clPull(meta)) clApply();
        } else if ((meta.at || 0) > (CLOUD.seen || 0)) {
          CLOUD.seen = meta.at;
          if (await clMergeRemote(meta)) {
            save();
            clApply();
          }
        }
      }
    }
  } catch (e) {
    report(e, "cloud.js: clCheck");
  }
  CLOUD.checking = false;
}
function clPaint() {
  const el = document.querySelector && document.querySelector("[data-cloud]");
  if (el) el.textContent = clStatus();
  if (SH === menuSheet || SH === backupSheetCl) drawSheet();
}

async function clStart() {
  const deadline = setTimeout(() => {
    if (CLOUD.st === "connecting") {
      CLOUD.st = "off";
      CLOUD.err = "couldn't reach your account";
      clPaint();
    }
  }, 10000);
  try {
    if (!window.claude || !window.claude.use) {
      clearTimeout(deadline);
      CLOUD.st = "off";
      return;
    }
    const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
    const uid = user && user.id ? await user.id() : null;
    if (!db || !uid) {
      clearTimeout(deadline);
      CLOUD.st = "off";
      CLOUD.err = "sign in to Claude to save to your account";
      clPaint();
      return;
    }
    CLOUD.db = db;
    CLOUD.uid = uid;
    const r = clRefs(),
      m = await r.meta.get();
    clearTimeout(deadline);
    if (m.exists) {
      const meta = m.data();
      if (G.demo || (meta.at || 0) > (G.savedAt || 0)) {
        if (await clPull(meta)) {
          CLOUD.st = "on";
          clApply();
        } else {
          CLOUD.st = "on";
          if (!G.demo) clPush();
        }
      } else {
        CLOUD.st = "on";
        if (meta.at !== G.savedAt) {
          const added = await clMergeRemote(meta);
          if (added) clApply();
          clPush();
        }
      }
    } else {
      CLOUD.st = "on";
      if (!G.demo) clPush();
      /* signed in, nothing saved yet, and only the sample game on this device: start the player's own game, one time per account */
      else clFirstGame();
    }
    try {
      const ibRef = CLOUD.db.collection("data/users/" + CLOUD.uid).doc("slam_inbox"),
        ib = await ibRef.get();
      if (ib.exists) {
        const dd = ib.data() || {};
        if (dd.s && !dd.done) {
          let g = null;
          try {
            g = JSON.parse(dd.s);
          } catch (e) {
            report(e, "cloud.js: clStart (1)");
          }
          if (g && g.chars && g.chars.length) {
            if (G.demo) {
              G.chars = [];
              G.demo = false;
              G.active = 0;
            }
            const n0 = G.chars.length,
              n = clMergeChars(G, g);
            if (n) {
              if (g.coach) G.coach = true;
              if (typeof plSeedWeek === "function")
                G.chars.slice(n0).forEach(p => {
                  if (!(p.x && p.x.plan && p.x.plan.length)) {
                    try {
                      plSeedWeek(p);
                    } catch (e) {
                      report(e, "cloud.js: clStart (2)");
                    }
                  }
                });
              save();
              clApply();
            }
          }
          await clFlush();
          if (CLOUD.st === "on") await ibRef.set({ done: true, at: Date.now() });
        }
      }
    } catch (e) {
      report(e, "cloud.js: clStart (3)");
    }
    /* changes made on your other device show up here live */
    r.meta.onSnapshot(
      async s => {
        if (!s.exists || s.metadata.hasPendingWrites) return;
        const meta = s.data();
        if (meta.dev === CLOUD.dev || (meta.at || 0) <= (G.savedAt || 0)) return;
        if (await clPull(meta)) clApply();
      },
      () => {}
    );
    clPaint();
  } catch (e) {
    clearTimeout(deadline);
    CLOUD.st = "off";
    CLOUD.err = "couldn't reach your account";
    clPaint();
  }
}

/* Part of closeSheetQuiet() in ui.js. A change from another device waits while a sheet is open. Thus nothing moves below the finger. Draw it now. */
function closeSheetCloud() {
  if (CLOUD.pending) {
    CLOUD.pending = false;
    setTimeout(render, 0);
  }
}

/* Part of menuSheet() in planner.js. Adds one line at the top that says where the game is saved. */
function menuSheetCloud(h) {
  return h.replace(
    /(<div class="stack">)/,
    `<div class="tile small row between"><span><span class="lamp ${CLOUD.st === "on" ? "green" : CLOUD.st === "off" ? "yellow" : "yellow"}" style="width:10px;height:10px;margin-right:6px"></span><span data-cloud>${esc(clStatus())}</span></span></div>$1`
  );
}

function backupSheetCl() {
  return `<div class="banner small"><b>Your game saves itself to your account</b>, every time you tap. Open this page on another device while signed in and everyone is there. <span class="tiny muted" data-cloud>${esc(clStatus())}</span></div>`;
}
(() => {
  const _b = ACT.backup;
  ACT.backup = t => {
    _b(t);
    const inner = SH;
    SH = function () {
      return inner().replace(/(<div class="field">)/, backupSheetCl() + "$1");
    };
    drawSheet();
  };
})();
const _mi = MENU.findIndex(m => m[1] === "backup");
if (_mi >= 0) {
  const m = MENU.splice(_mi, 1)[0];
  m[0] = "Backup copy";
  m[3] = "It already saves to your account. This is an extra copy you can paste";
  MENU.splice(MENU.length - 1, 0, m);
}

(() => {
  const _rm = ACT.prmyes;
  ACT.prmyes = t => {
    const p = W && G.chars[W.rm];
    if (p && G.chars.length > 1) {
      G.gone = (G.gone || []).filter(n => n !== p.name).concat([p.name]);
    }
    _rm(t);
  };
  const _pp = ACT.people;
  ACT.people = t => {
    _pp(t);
    clCheck();
  };
})();
if (typeof window !== "undefined" && document && document.getElementById && document.getElementById("app")) {
  setTimeout(clStart, 0);
  try {
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) clCheck();
    });
    window.addEventListener("focus", () => clCheck());
    window.addEventListener("pageshow", () => clCheck());
  } catch (e) {
    report(e, "cloud.js: page load");
  }
}

/* A new account opens on the three sample people, and the sample game never saves.
   So the first time an account has no saved game, open setup for the player's own game.
   One time per account: if the player closes setup, the sample stays and Home still offers "Make your own character". */
function clFirstGame() {
  try {
    const k = "slam_first_" + CLOUD.uid;
    if (localStorage.getItem(k)) return;
    localStorage.setItem(k, "1");
    clPaint();
    setTimeout(() => {
      try {
        if (G.demo && !SH && typeof openSetup === "function") openSetup("new");
      } catch (e) {
        report(e, "cloud.js: clFirstGame (1)");
      }
    }, 300);
  } catch (e) {
    report(e, "cloud.js: clFirstGame (2)");
  }
}
