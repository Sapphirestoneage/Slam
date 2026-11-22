/* ===== supa.js: accounts when the game runs on its own website (GitHub Pages) instead of inside Claude.
 Inside Claude this file does nothing: Claude gives the page its own window.claude.
 On the website it gives the game the same window.claude.use("db") and use("user") that cloud.js already uses,
 backed by Supabase. Each person signs in with an email and password and gets their own private save.
 The keys below are the public ones. They are meant to be in the page. The table rules in Supabase keep each save private. ===== */
const SUPA_URL = "https://twuxggigsfsdczsyvupk.supabase.co";
const SUPA_KEY = "sb_publishable_tSWobVdlrb-I5pTiGORWHA_z9JD5K-Z";
const SUPA = { on: false, sb: null, uid: null, email: "", ready: null, ids: {}, share: true };

(function () {
  if (typeof window === "undefined" || window.claude) return; /* inside Claude: use Claude's own saving */
  if (!window.supabase || !window.supabase.createClient) {
    return;
  }
  SUPA.on = true;
  SUPA.sb = window.supabase.createClient(SUPA_URL, SUPA_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  let done;
  SUPA.ready = new Promise(r => (done = r));
  let asq = null;
  try {
    const q = new URLSearchParams(location.search).get("as");
    if (q) sessionStorage.setItem("su_as", q);
    asq = sessionStorage.getItem("su_as");
  } catch (e) {}
  SUPA.sb.auth.getSession().then(async ({ data }) => {
    const s = data && data.session;
    if (!s) {
      suGate(done);
      return;
    }
    suSet(s);
    if (asq) {
      let ok = false;
      try {
        const r = await SUPA.sb.rpc("is_admin");
        ok = r.data === true;
      } catch (e) {}
      if (ok && asq !== s.user.id) {
        SUPA.me = SUPA.uid;
        SUPA.as = asq;
        SUPA.uid = asq;
        suLocal(asq);
        suAsBar();
      } else {
        try {
          sessionStorage.removeItem("su_as");
          sessionStorage.removeItem("su_as_n");
        } catch (e) {}
      }
    }
    done();
  });
  SUPA.sb.auth.onAuthStateChange((ev, s) => {
    if (ev === "SIGNED_OUT") {
      location.reload();
    } else if (s && s.user && !SUPA.uid) {
      suSet(s);
    }
  });

  /* one saved piece of the game = one row: name is the piece's key, data is what it holds */
  const tbl = () => SUPA.sb.from("games");
  async function rowGet(k) {
    const q = await tbl()
      .select("id,data,updated_at,share_with_coach")
      .eq("owner", SUPA.uid)
      .eq("name", k)
      .order("updated_at", { ascending: false })
      .limit(1);
    if (q.error) throw q.error;
    const r = q.data && q.data[0];
    if (r) {
      SUPA.ids[k] = r.id;
      if (k === "slam_meta") SUPA.share = !!r.share_with_coach;
    }
    return r || null;
  }
  async function rowSet(k, obj) {
    const now = new Date().toISOString();
    let id = SUPA.ids[k];
    if (!id) {
      const r = await rowGet(k);
      id = r && r.id;
    }
    if (id) {
      const u = await tbl().update({ data: obj, updated_at: now, share_with_coach: SUPA.share }).eq("id", id);
      if (u.error) throw u.error;
    } else {
      const i = await tbl()
        .insert({ owner: SUPA.uid, name: k, data: obj, updated_at: now, share_with_coach: SUPA.share })
        .select("id")
        .single();
      if (i.error) throw i.error;
      SUPA.ids[k] = i.data.id;
    }
  }
  function snap(r) {
    return { exists: !!r, data: () => (r ? r.data : undefined), metadata: { hasPendingWrites: false } };
  }
  function docRef(k) {
    return {
      get: async () => snap(await rowGet(k)),
      set: async obj => rowSet(k, obj),
      /* no live channel on the free setup: look again every 20 seconds and when you come back to the page */
      onSnapshot: (cb, err) => {
        let last = null;
        const look = async () => {
          try {
            const r = await rowGet(k);
            const at = r ? r.updated_at : null;
            if (at !== last) {
              if (last !== null) cb(snap(r));
              last = at;
            }
          } catch (e) {
            if (err) err(e);
          }
        };
        look();
        const t = setInterval(look, 20000);
        return () => clearInterval(t);
      },
    };
  }
  const db = { collection: path => ({ doc: k => docRef(k) }), doc: p => docRef(String(p).split("/").pop()) };
  const user = {
    id: async () => SUPA.uid,
    me: async () => ({ id: SUPA.uid, name: SUPA.email }),
    isOwner: () => false,
    canEdit: () => false,
    can: () => null,
    profiles: async () => ({}),
  };
  window.claude = {
    use: async name => {
      await SUPA.ready;
      return name === "db" ? db : name === "user" ? user : null;
    },
  };
})();

/* the copy of the game kept on this device belongs to one account at a time: when the account changes, start from that account's saved game */
function suLocal(uid) {
  try {
    const was = localStorage.getItem("su_uid");
    if (was && was !== uid) {
      localStorage.removeItem(KEY);
      if (typeof fresh === "function") {
        G = fresh();
        setTimeout(() => {
          try {
            render();
          } catch (e) {}
        }, 0);
      }
    }
    localStorage.setItem("su_uid", uid);
  } catch (e) {}
}
/* the admin, inside someone else's game: a bar that says so on every screen, and one way out */
function suAsBar() {
  const put = () => {
    if (document.getElementById("su-as")) return;
    let n = "";
    try {
      n = sessionStorage.getItem("su_as_n") || "";
    } catch (e) {}
    const el = document.createElement("div");
    el.id = "su-as";
    el.style.cssText =
      "position:sticky;top:0;z-index:9999;display:flex;gap:10px;align-items:center;justify-content:space-between;padding:8px 12px;background:#2a1d00;color:#ffe9b0;border-bottom:2px solid #c99a2e;font-size:14px";
    el.innerHTML = `<span>You are in <b>${esc2(n || "another person")}</b>'s game. What you change here changes their real game.</span><button id="su-as-x" style="flex:none;min-height:40px;padding:6px 12px;border-radius:10px;border:2px solid #c99a2e;background:#c99a2e;color:#1b1200;font-weight:700;cursor:pointer">Leave</button>`;
    document.body.insertBefore(el, document.body.firstChild);
    document.getElementById("su-as-x").onclick = async () => {
      try {
        if (typeof clFlush === "function") await clFlush();
      } catch (e) {}
      try {
        sessionStorage.removeItem("su_as");
        sessionStorage.removeItem("su_as_n");
        localStorage.removeItem(KEY);
      } catch (e) {}
      location.href = "./admin.html";
    };
  };
  document.body ? put() : document.addEventListener("DOMContentLoaded", put);
}
function suSet(s) {
  SUPA.uid = s.user.id;
  suLocal(SUPA.uid);
  SUPA.email = s.user.email || "";
  const g = document.getElementById("su-gate");
  if (g) g.remove();
}

/* the sign-in screen: two boxes and one button. Create account and Sign in are the same screen. */
function suGate(done) {
  const css = `#su-gate{position:fixed;inset:0;z-index:99999;background:var(--bg,#0b1630);display:flex;align-items:center;justify-content:center;padding:20px;font-family:inherit}
 #su-gate .su-card{width:100%;max-width:380px;background:var(--panel,#13224a);border:1px solid var(--line,#2a3f7a);border-radius:16px;padding:22px;color:var(--text,#e8eeff)}
 #su-gate h1{font-size:22px;margin:0 0 4px}#su-gate p{margin:0 0 14px;color:var(--muted,#9fb0dd);font-size:14px;line-height:1.4}
 #su-gate label{display:block;font-size:13px;margin:10px 0 4px;color:var(--muted,#9fb0dd)}
 #su-gate input{width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:2px solid var(--line,#3a55a0);background:var(--panel2,#0e1a3a);color:inherit;font-size:16px}
 #su-gate input:focus{outline:none;border-color:var(--a1,#5b8cff)}
 #su-gate .su-go{width:100%;margin-top:16px;padding:14px;border:0;border-radius:12px;background:var(--a1,#5b8cff);color:#fff;font-size:16px;font-weight:700;cursor:pointer}
 #su-gate .su-other{width:100%;margin-top:10px;padding:12px;border-radius:12px;border:2px solid var(--line,#3a55a0);background:transparent;color:inherit;font-size:15px;font-weight:600;cursor:pointer}
 #su-gate .su-msg{margin-top:12px;font-size:14px;min-height:18px}#su-gate .su-link{background:none;border:0;color:var(--a3,#8fb0ff);text-decoration:underline;font-size:13px;margin-top:10px;cursor:pointer;padding:0}`;
  const el = document.createElement("div");
  el.id = "su-gate";
  let mode = "new";
  const draw = (msg = "") => {
    el.innerHTML = `<style>${css}</style><form class="su-card" novalidate>
  <h1>${mode === "new" ? "Create your account" : "Sign in"}</h1><p>SLAM the Game. ${mode === "new" ? "Your game saves to your own account, so it follows you to any phone or laptop. Only you and the person who runs SLAM can see it." : "Welcome back. Your game is waiting where you left it."}</p>
  <label for="su-e">Email</label><input id="su-e" type="email" autocomplete="email" inputmode="email" required>
  <label for="su-p">Password ${mode === "new" ? "(at least 6 letters or numbers)" : ""}</label><input id="su-p" type="password" autocomplete="${mode === "new" ? "new-password" : "current-password"}" required>
  <button class="su-go" type="submit">${mode === "new" ? "Create my account" : "Sign in"}</button>
  <button type="button" class="su-other" data-m="${mode === "new" ? "in" : "new"}">${mode === "new" ? "I already have an account. Sign in" : "I'm new. Create an account"}</button>
  ${mode === "in" ? `<button type="button" class="su-link" data-forgot>Forgot my password</button>` : ""}
  ${mode === "new" ? `<p style="margin:12px 0 0;font-size:13px">Coach mode is on: your coach can see your game to help you. You can turn it off anytime in Menu, then My account.</p>` : ""}<div class="su-msg">${msg}</div></form>`;
    el.querySelectorAll("[data-m]").forEach(
      b =>
        (b.onclick = () => {
          mode = b.dataset.m;
          draw();
        })
    );
    const fg = el.querySelector("[data-forgot]");
    if (fg)
      fg.onclick = async () => {
        const e = el.querySelector("#su-e").value.trim();
        if (!e) {
          draw("Type your email first, then tap Forgot my password.");
          return;
        }
        const r = await SUPA.sb.auth.resetPasswordForEmail(e, { redirectTo: location.origin + location.pathname });
        draw(r.error ? esc2(r.error.message) : "Check your email for a link to set a new password.");
      };
    el.querySelector("form").onsubmit = async ev => {
      ev.preventDefault();
      const e = el.querySelector("#su-e").value.trim(),
        p = el.querySelector("#su-p").value;
      if (!e || !p) {
        draw("Fill in both boxes.");
        return;
      }
      const btn = el.querySelector(".su-go");
      btn.disabled = true;
      btn.textContent = "One moment…";
      const r =
        mode === "new"
          ? await SUPA.sb.auth.signUp({
              email: e,
              password: p,
              options: { emailRedirectTo: location.origin + location.pathname },
            })
          : await SUPA.sb.auth.signInWithPassword({ email: e, password: p });
      if (r.error) {
        const m = r.error.message || "";
        draw(
          /already registered/i.test(m)
            ? 'That email already has an account. Tap "I already have an account" below.'
            : /invalid login/i.test(m)
              ? "That email and password don't match. Try again, or tap Forgot my password."
              : esc2(m)
        );
        return;
      }
      if (r.data && r.data.session) {
        suSet(r.data.session);
        done();
        return;
      }
      mode = "in";
      draw("Almost there: check your email and tap the link to confirm, then sign in here.");
    };
  };
  draw();
  const put = () => document.body.appendChild(el);
  document.body ? put() : document.addEventListener("DOMContentLoaded", put);
}
function esc2(s) {
  return String(s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]);
}

/* After a reset-password link: ask for the new password */
if (SUPA.on)
  SUPA.sb.auth.onAuthStateChange(async ev => {
    if (ev !== "PASSWORD_RECOVERY") return;
    setTimeout(() => {
      if (typeof sheet === "function") {
        W = { kind: "supw" };
        sheet(
          () =>
            head("Almost done", "Set a new password") +
            `<div class="field"><label class="small" for="supw">New password</label><input id="supw" type="password" autocomplete="new-password"></div><button class="primary wide" data-a="supwgo">Save my new password</button>${W.msg ? `<div class="small">${W.msg}</div>` : ""}`
        );
      }
    }, 500);
  });

/* Menu: My account (who you're signed in as, sharing with your coach, sign out) and, for the coach, People who shared with me */
if (SUPA.on) {
  window.addEventListener("load", () => {
    try {
      MENU.splice(1, 0, ["My account", "suacct", "act", "Who you're signed in as, sharing with your coach, sign out"]);
      SUPA.ready.then(async () => {
        if (SUPA.as) return;
        try {
          const q = await SUPA.sb.from("coaches").select("user_id").eq("user_id", SUPA.uid);
          if (q.data && q.data.length) {
            SUPA.coach = true;
            MENU.splice(2, 0, [
              "Shared with me",
              "sucoach",
              "act",
              "For coaches: bring in the games people shared with you",
            ]);
            setTimeout(suCoachPing, 2500);
          }
        } catch (e) {}
      });
      {
        const t0 = Date.now(),
          _sv = save;
        save = function () {
          try {
            if (SUPA.as && G && !G.demo && Date.now() - t0 > 4000) G.coachEdit = { at: Date.now() };
          } catch (e) {}
          return _sv.apply(this, arguments);
        };
        SUPA.homeNote = true; /* from now, home() in ui.js adds homeCoachNote() */
        setTimeout(() => {
          try {
            if (!SH) render();
          } catch (e) {}
        }, 0);
      }
      Object.assign(ACT, {
        sugot: () => {
          G.coachSeen = Date.now();
          save();
          render();
        },
        suacct: () => {
          W = { kind: "suacct" };
          sheet(suAcctSheet);
        },
        sushare: async () => {
          SUPA.share = !SUPA.share;
          try {
            const q = await SUPA.sb.from("games").update({ share_with_coach: SUPA.share }).eq("owner", SUPA.uid);
            if (q.error) throw q.error;
            W.msg = SUPA.share ? "Your coach can now see your game." : "Your coach can no longer see your game.";
          } catch (e) {
            SUPA.share = !SUPA.share;
            W.msg = "Couldn't change that. Check your internet and try again.";
          }
          drawSheet();
        },
        suout: async () => {
          try {
            if (typeof clFlush === "function") await clFlush();
          } catch (e) {}
          try {
            localStorage.removeItem(KEY);
          } catch (e) {}
          await SUPA.sb.auth.signOut();
          location.reload();
        },
        supwgo: async () => {
          const p = (document.getElementById("supw") || {}).value || "";
          if (p.length < 6) {
            W.msg = "Use at least 6 letters or numbers.";
            drawSheet();
            return;
          }
          const r = await SUPA.sb.auth.updateUser({ password: p });
          W.msg = r.error ? esc2(r.error.message) : "Saved. You're signed in.";
          drawSheet();
          if (!r.error) setTimeout(closeSheet, 900);
        },
        sucoach: async () => {
          W = { kind: "sucoach", list: null, msg: "" };
          sheet(suCoachSheet);
          await suCoachLoad();
        },
        suall: async () => {
          const L = (W.list || []).filter(o => o.fresh);
          W.msg = "Bringing them in…";
          drawSheet();
          let n = 0;
          for (const o of L) {
            try {
              n += await suBring(o.owner, o.at);
            } catch (e) {}
          }
          W.list.forEach(o => (o.fresh = false));
          W.msg = n ? "Done. Tap the name at the top to switch between people." : "Already up to date.";
          drawSheet();
        },
        subring: async t => {
          const o = W.list && W.list[+t.dataset.v];
          if (!o) return;
          W.msg = "Bringing it in…";
          drawSheet();
          try {
            const n = await suBring(o.owner, o.at);
            o.fresh = false;
            W.msg = n ? "Added. Tap your name at the top to switch to them." : "Already up to date.";
          } catch (e) {
            W.msg = "Couldn't bring that in. Try again in a moment.";
          }
          drawSheet();
        },
      });
    } catch (e) {}
  });
}
/* Part of home() in ui.js. Tells the player that the person who runs SLAM made a change in the game.
   It starts at page load on the website (SUPA.homeNote). */
function homeCoachNote(h) {
  if (!SUPA.homeNote) return h;
  try {
    const e = !SUPA.as && G && G.coachEdit;
    if (e && e.at > (G.coachSeen || 0)) {
      const n = `<div class="tile small row between homerow" style="border:2px solid var(--a3)"><span>The person who runs SLAM made a change in your game on ${new Date(e.at).toLocaleDateString()}.</span><button class="ghost slim" data-a="sugot">Got it</button></div>`;
      return typeof homeRowAdd === "function"
        ? homeRowAdd(h, n)
        : /^<div class="stack[^"]*">/.test(h)
          ? h.replace(/^(<div class="stack[^"]*">)/, m => m + n)
          : n + h;
    }
  } catch (x) {}
  return h;
}
function suAcctSheet() {
  return (
    head("Your account", "My account") +
    `
 <div class="tile small"><b>Signed in as</b><div>${esc2(SUPA.email)}</div><div class="tiny muted">Your game saves to this account by itself. Sign in with the same email on any device and it's all there.</div></div>
 <div class="tile small row between"><span><b>Share with my coach</b><div class="tiny muted">${SUPA.share ? "On: your coach can see your game and help you with it." : "Off: your coach can't see your game. The person who runs SLAM still can."}</div></span>
 <button class="${SUPA.share ? "primary" : "ghost"}" data-a="sushare" aria-pressed="${SUPA.share}">${SUPA.share ? "Sharing" : "Share"}</button></div>
 ${W && W.msg ? `<div class="small" style="color:var(--good)">${W.msg}</div>` : ""}
 <button class="ghost wide" data-a="suout">Sign out</button>
 <div class="tiny muted">Moving from the old version inside Claude? Open it there, tap Menu, then Backup copy, then Copy my game. Come back here, tap Menu, then Backup copy, paste it in, and tap Load this game.</div>`
  );
}
async function suCoachLoad() {
  try {
    const q = await SUPA.sb
      .from("games")
      .select("owner,data,updated_at")
      .eq("name", "slam_meta")
      .eq("share_with_coach", true)
      .neq("owner", SUPA.uid);
    if (q.error) throw q.error;
    W.list = [];
    for (const r of q.data || []) {
      let nm = "";
      try {
        nm = await suPeek(r.owner);
      } catch (e) {}
      W.list.push({ owner: r.owner, at: r.updated_at, names: nm, fresh: suSeen()[r.owner] !== r.updated_at });
    }
  } catch (e) {
    W.list = [];
    W.msg = "Couldn't load the list. Check your internet.";
  }
  drawSheet();
}
async function suFetch(owner) {
  const q = await SUPA.sb.from("games").select("name,data").eq("owner", owner);
  if (q.error) throw q.error;
  const by = {};
  (q.data || []).forEach(r => (by[r.name] = r.data));
  const m = by.slam_meta;
  if (!m) return null;
  let s = "";
  for (let i = 0; i < m.n; i++) {
    const p = by["slam_part_" + i];
    if (!p) return null;
    s += p.s || "";
  }
  return JSON.parse(s);
}
async function suPeek(owner) {
  const g = await suFetch(owner);
  return g && g.chars
    ? g.chars
        .filter(c => !c.demo)
        .map(c => c.name || "Someone")
        .join(", ")
    : "";
}
function suSeen() {
  G.suSeen = G.suSeen || {};
  return G.suSeen;
}
/* coach pop-up: when a player shared for the first time, or saved since you last brought them in */
async function suCoachPing() {
  if (!SUPA.coach || SH) return;
  const tmp = { list: null };
  const q = await SUPA.sb
    .from("games")
    .select("owner,updated_at")
    .eq("name", "slam_meta")
    .eq("share_with_coach", true)
    .neq("owner", SUPA.uid);
  if (q.error || !q.data) return;
  const fresh = q.data.filter(r => suSeen()[r.owner] !== r.updated_at);
  if (!fresh.length || SH) return;
  W = { kind: "sucoach", list: null, msg: "", ping: true };
  sheet(suCoachSheet);
  await suCoachLoad();
}
async function suBring(owner, at) {
  const g = await suFetch(owner);
  if (!g || !g.chars) return 0;
  let n = 0;
  if (G.demo) {
    G.chars = [];
    G.demo = false;
    G.active = 0;
  }
  g.chars
    .filter(c => c && !c.demo)
    .forEach(rc => {
      const i = G.chars.findIndex(lc => lc.name === rc.name);
      const nc = Object.assign(newChar(), rc);
      if (i >= 0) {
        G.chars[i] = nc;
      } else {
        G.chars.push(nc);
      }
      n++;
    });
  if (at) suSeen()[owner] = at;
  save();
  if (n) render();
  return n;
}
function suCoachSheet() {
  const L = W.list,
    nf = L ? L.filter(o => o.fresh).length : 0;
  return (
    head("For coaches", W.ping ? "New from your players" : "Shared with me") +
    (nf > 1 ? `<button class="primary wide" data-a="suall">Bring in all ${nf}</button>` : "") +
    (L === null
      ? `<div class="small muted">Looking…</div>`
      : L.length
        ? `<div class="stack">${L.map((o, i) => `<div class="tile small row between"><span><b>${esc2(o.names || "Someone")}</b>${o.fresh ? ` <span class="pill">New</span>` : ""}<div class="tiny muted">Last saved ${new Date(o.at).toLocaleDateString()}</div></span><button class="${o.fresh ? "primary" : "ghost"}" data-a="subring" data-v="${i}">${o.fresh ? "Bring in" : "Update"}</button></div>`).join("")}</div><div class="tiny muted">Bringing someone in adds a copy to your game. Tap it again later to get their newest version. Changes you make stay on your copy.</div>`
        : `<div class="small muted">No one has shared with you yet. When a player turns on Share with my coach, they show up here.</div>`) +
    (W.msg ? `<div class="small" style="color:var(--good)">${W.msg}</div>` : "")
  );
}
