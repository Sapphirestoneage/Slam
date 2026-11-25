/* ============================================================================
   SLAM the Game: account/supa.js
   PURPOSE     Accounts on the website. Each player signs in with an email address and a password, and
               gets a private saved game in the Supabase database. This file gives cloud.js the two
               objects that it uses (window.claude.use: db and user). It also has the tools for a coach
               and for the admin.
   INPUT       The game: G.active, G.chars, G.coachEdit, G.coachSeen, G.demo, G.suSeen. The open sheet
               (W.kind): suacct, sucoach, supw. The taps of the player (the actions in OUTPUT).
   OUTPUT      15 functions. Parts of functions in other files: saveCoachMark, homeCoachNote. Actions
               (ACT): sugot, suacct, sushare, suout, supwgo, sucoach, suall, subring. Menu: "My
               account", "Shared with me".
   DEPENDS ON  core/report.js, account/trust.js.
   USES LATER  Names from files that the browser loads later. Behind a typeof test, thus safe while the
               page loads: screens/ui.js, account/cloud.js, features/reveal.js. With no typeof test,
               thus safe only after the page has loaded all files: core/engine.js (newChar),
               screens/ui.js (ACT, G, KEY, SH, W, closeSheet, and 4 more), screens/planner.js (MENU).
   RULES       The two keys in this file are public keys. They are meant to be in the page. The rules of
               the database tables keep each saved game private. If the page already has window.claude
               (the retired copy inside Claude), this file does nothing.
   STATE       SUPA (on, sb, uid, email, ready, ids, share, shareKnown, invited, as, coach, t0). The switch
               EMAIL_READY. The browser storage: su_coach (the invite mark), su_uid, su_as.
   ========================================================================= */
const SUPA_URL = "https://twuxggigsfsdczsyvupk.supabase.co";
const SUPA_KEY = "sb_publishable_tSWobVdlrb-I5pTiGORWHA_z9JD5K-Z";
/* EMAIL_READY: false until the game can send email to each person (docs/EMAIL-SETUP.md, the last step).
   While it is false, the sign-in screen shows "Forgot your password? Contact Eli." with an email draft, in
   place of a reset email that would reach nobody. Set it to true when the test emails of that document arrive:
   then the sign-in screen shows "Forgot my password" and sends the reset email. */
const EMAIL_READY = false;
/* share: "Share with my coach". A new account from a public link starts with it off. A new account from the
   invite of a coach (the link has ?coach=1) starts with it on. An account that has a saved game keeps the value
   of that game (rowGet below). The player changes it under Menu, My account. */
const SUPA = { on: false, sb: null, uid: null, email: "", ready: null, ids: {}, share: false, invited: false };
/* True when this person came through the invite of a coach. The link has ?coach=1. The mark stays on this
   device until the first save, because the link in the confirmation email has no ?coach=1. */
function suInvited(search, store) {
  let yes = false;
  try {
    if (new URLSearchParams(search || "").get("coach") === "1") {
      yes = true;
      if (store) store.setItem("su_coach", "1");
    } else if (store) yes = store.getItem("su_coach") === "1";
  } catch (e) {
    report(e, "supa.js: suInvited");
  }
  return yes;
}
/* The invite mark has done its work when the account has its first saved row. */
function suInviteDone(store) {
  try {
    if (store) store.removeItem("su_coach");
  } catch (e) {
    report(e, "supa.js: suInviteDone");
  }
}
/* Part of the sign-up screen: one plain line that says how "Share with my coach" starts for this person. */
function suShareLine(invited) {
  return invited
    ? "You came through your coach's invite, so Share with my coach starts on: your coach can see your game to help you. You can turn it off anytime in Menu, then My account."
    : "Share with my coach starts off: no coach sees your game. You can turn it on anytime in Menu, then My account.";
}
/* Part of the sign-in screen: the way back in for a person with no password. With email ready: the button
   "Forgot my password". Before that: one line and an email draft to Eli. */
function suForgotHTML(ready) {
  return ready
    ? `<button type="button" class="su-link" data-forgot>Forgot my password</button>`
    : `<p class="su-forgot" style="margin:12px 0 0;font-size:13px">Forgot your password? Contact Eli. <a href="mailto:stresslessaboutmoney@gmail.com?subject=${encodeURIComponent("SLAM the Game: I forgot my password")}&body=${encodeURIComponent("Hi Eli, I forgot my password for SLAM the Game. The email of my account is: ")}" style="color:var(--a3,#8fb0ff);text-decoration:underline">Write to Eli</a></p>`;
}
if (typeof location !== "undefined" && typeof localStorage !== "undefined") {
  SUPA.invited = suInvited(location.search, localStorage);
  SUPA.share = SUPA.invited;
}

/* A share link has ?ref=code (features/founding.js makes it). The code a person arrives with is kept on this
   device from the first page load, through the sign-up, until setup is finished. The first code stays.
   suRefClean() takes only letters and digits, thus the link cannot carry anything else. */
const SU_REF = "slam_ref";
function suRefClean(s) {
  const c = String(s == null ? "" : s)
    .trim()
    .toLowerCase();
  return /^[a-z0-9]{4,32}$/.test(c) ? c : "";
}
function suRef() {
  try {
    return typeof localStorage === "undefined" ? "" : suRefClean(localStorage.getItem(SU_REF));
  } catch (e) {
    report(e, "supa.js: suRef");
    return "";
  }
}
function suRefKeep(search) {
  try {
    const q = suRefClean(new URLSearchParams(search || "").get("ref"));
    if (q && !suRef()) localStorage.setItem(SU_REF, q);
    return q;
  } catch (e) {
    report(e, "supa.js: suRefKeep");
    return "";
  }
}
if (typeof location !== "undefined") suRefKeep(location.search);

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
  } catch (e) {
    report(e, "supa.js: page load (1)");
  }
  SUPA.sb.auth.getSession().then(async ({ data }) => {
    const s = data && data.session;
    if (!s) {
      /* door.js: a new visitor sees the landing screen first. The sign-in screen opens from there. */
      if (typeof doorGate === "function") doorGate(done);
      else suGate(done);
      return;
    }
    suSet(s);
    if (asq) {
      let ok = false;
      try {
        const r = await SUPA.sb.rpc("is_admin");
        ok = r.data === true;
      } catch (e) {
        report(e, "supa.js: page load (2)");
      }
      /* A coach can open a game that is shared with the coach. The database rules allow nothing more. */
      let role = ok ? "admin" : "";
      if (!ok && asq !== s.user.id) {
        try {
          const c = await SUPA.sb.rpc("is_coach"),
            q =
              c.data === true
                ? await SUPA.sb
                    .from("games")
                    .select("id")
                    .eq("owner", asq)
                    .eq("name", "slam_meta")
                    .eq("share_with_coach", true)
                    .limit(1)
                : null;
          if (q && !q.error && q.data && q.data.length) {
            ok = true;
            role = "coach";
          }
        } catch (e) {
          report(e, "supa.js: page load (4)");
        }
      }
      if (ok && asq !== s.user.id) {
        SUPA.asRole = role;
        /* one line in the audit log: who opened the game of whom */
        SUPA.sb.rpc("audit_write", { act: "open_game", tgt: asq, nt: null }).then(
          () => {},
          () => {}
        );
        SUPA.me = SUPA.uid;
        SUPA.as = asq;
        /* A game that the admin or a coach starts for a client is a coaching game: sharing starts on.
           If the client has a saved game, its own value replaces this one (rowGet). */
        SUPA.share = true;
        SUPA.shareKnown = false;
        SUPA.uid = asq;
        suLocal(asq);
        suAsBar();
      } else {
        try {
          sessionStorage.removeItem("su_as");
          sessionStorage.removeItem("su_as_n");
        } catch (e) {
          report(e, "supa.js: page load (3)");
        }
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
      /* an account with a saved game keeps its own value. The first row found gives it, and slam_meta decides. */
      if (k === "slam_meta" || !SUPA.shareKnown) {
        SUPA.share = !!r.share_with_coach;
        SUPA.shareKnown = true;
        if (!SUPA.as) suInviteDone(localStorage);
      }
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
          } catch (e) {
            report(e, "supa.js: suLocal (1)");
          }
        }, 0);
      }
    }
    localStorage.setItem("su_uid", uid);
  } catch (e) {
    report(e, "supa.js: suLocal (2)");
  }
}
/* the admin, inside someone else's game: a bar that says so on every screen, and one way out */
function suAsBar() {
  const put = () => {
    if (document.getElementById("su-as")) return;
    let n = "";
    try {
      n = sessionStorage.getItem("su_as_n") || "";
    } catch (e) {
      report(e, "supa.js: put");
    }
    const el = document.createElement("div");
    el.id = "su-as";
    el.style.cssText =
      "position:sticky;top:0;z-index:9999;display:flex;gap:10px;align-items:center;justify-content:space-between;padding:8px 12px;background:#2a1d00;color:#ffe9b0;border-bottom:2px solid #c99a2e;font-size:14px";
    el.innerHTML = `<span>You are in <b>${esc2(n || "another person")}</b>'s game. What you change here changes their real game.</span><button id="su-as-x" style="flex:none;min-height:40px;padding:6px 12px;border-radius:10px;border:2px solid #c99a2e;background:#c99a2e;color:#1b1200;font-weight:700;cursor:pointer">Leave</button>`;
    document.body.insertBefore(el, document.body.firstChild);
    document.getElementById("su-as-x").onclick = async () => {
      try {
        if (typeof clFlush === "function") await clFlush();
      } catch (e) {
        report(e, "supa.js: document.getElementById(su-as-x).onclick (1)");
      }
      try {
        sessionStorage.removeItem("su_as");
        sessionStorage.removeItem("su_as_n");
        localStorage.removeItem(KEY);
      } catch (e) {
        report(e, "supa.js: document.getElementById(su-as-x).onclick (2)");
      }
      location.href = SUPA.asRole === "coach" ? "./coach.html" : "./admin.html";
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
  if (typeof doorSigned === "function") doorSigned(); /* door.js: the landing screen goes away */
}

/* the sign-in screen: two boxes and one button. Create account and Sign in are the same screen. */
/* mode0: "in" opens it on Sign in (door.js). With door.js, the screen has a button Back. */
function suGate(done, mode0) {
  const css = `#su-gate{position:fixed;inset:0;z-index:99999;background:var(--bg,#0b1630);display:flex;overflow:auto;padding:20px;font-family:inherit}
 #su-gate .su-card{width:100%;max-width:380px;margin:auto;background:var(--panel,#13224a);border:1px solid var(--line,#2a3f7a);border-radius:16px;padding:22px;color:var(--text,#e8eeff)}
 #su-gate h1{font-size:22px;margin:0 0 4px}#su-gate p{margin:0 0 14px;color:var(--muted,#9fb0dd);font-size:14px;line-height:1.4}
 #su-gate label{display:block;font-size:13px;margin:10px 0 4px;color:var(--muted,#9fb0dd)}
 #su-gate input{width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:2px solid var(--line,#3a55a0);background:var(--panel2,#0e1a3a);color:inherit;font-size:16px}
 #su-gate input:focus{outline:none;border-color:var(--a1,#5b8cff)}
 #su-gate .su-go{width:100%;margin-top:16px;padding:14px;border:0;border-radius:12px;background:var(--a1,#5b8cff);color:#fff;font-size:16px;font-weight:700;cursor:pointer}
 #su-gate .su-other{width:100%;margin-top:10px;padding:12px;border-radius:12px;border:2px solid var(--line,#3a55a0);background:transparent;color:inherit;font-size:15px;font-weight:600;cursor:pointer}
 #su-gate .su-rep{display:flex;justify-content:flex-end;margin-top:6px}
 #su-gate .su-msg{margin-top:12px;font-size:14px;min-height:18px}#su-gate .su-link{background:none;border:0;color:var(--a3,#8fb0ff);text-decoration:underline;font-size:13px;margin-top:10px;cursor:pointer;padding:0}`;
  const el = document.createElement("div");
  el.id = "su-gate";
  let mode = mode0 === "in" ? "in" : "new",
    em = "";
  const here = () => location.origin + location.pathname;
  const draw = (msg = "", again = false) => {
    el.innerHTML = `<style>${css}</style><form class="su-card" novalidate>
  <h1>${mode === "new" ? "Create your account" : "Sign in"}</h1><p>SLAM the Game. ${mode === "new" ? "Your game saves to your own account, so it follows you to any phone or laptop. You and the person who runs SLAM can see it. A coach sees it only while Share with my coach is on." : "Welcome back. Your game is waiting where you left it."}</p>
  <label for="su-e">Email</label><input id="su-e" type="email" autocomplete="email" inputmode="email" value="${esc2(em)}" required>
  <label for="su-p">Password ${mode === "new" ? "(at least 6 letters or numbers)" : ""}</label><input id="su-p" type="password" autocomplete="${mode === "new" ? "new-password" : "current-password"}" required>
  <button class="su-go" type="submit">${mode === "new" ? "Create my account" : "Sign in"}</button>
  <button type="button" class="su-other" data-m="${mode === "new" ? "in" : "new"}">${mode === "new" ? "I already have an account. Sign in" : "I'm new. Create an account"}</button>
  ${mode === "in" ? suForgotHTML(EMAIL_READY) : ""}
  ${mode === "new" ? `<p style="margin:12px 0 0;font-size:13px">${suShareLine(SUPA.invited)}</p><p style="margin:8px 0 0;font-size:13px">The owner of this app can view accounts for safety and support.</p>` : ""}<div class="su-msg" role="status">${msg}</div>${again ? `<button type="button" class="su-other" data-again>Send the email again</button>` : ""}${typeof tuGateFoot === "function" ? tuGateFoot() : ""}<div class="su-rep"><button type="button" class="rp-btn rp-open" data-a="flag">Report</button></div>${typeof doorGateBack === "function" ? doorGateBack() : ""}</form>`;
    const ag = el.querySelector("[data-again]");
    if (ag)
      ag.onclick = async () => {
        ag.disabled = true;
        ag.textContent = "One moment…";
        const r = await tuResend(SUPA.sb, em, here());
        draw(r.msg, true);
      };
    const bk = el.querySelector("[data-door-back]");
    if (bk)
      bk.onclick = () => {
        el.remove();
        doorBack(); /* door.js: back to the landing screen, or to the game on this device */
      };
    el.querySelectorAll("[data-m]").forEach(
      b =>
        (b.onclick = () => {
          mode = b.dataset.m;
          em = el.querySelector("#su-e").value.trim();
          draw();
        })
    );
    const fg = el.querySelector("[data-forgot]");
    if (fg)
      fg.onclick = async () => {
        const e = el.querySelector("#su-e").value.trim();
        em = e;
        if (!e) {
          draw("Type your email first, then tap Forgot my password.");
          return;
        }
        const r = await tuReset(SUPA.sb, e, here());
        draw(r.msg);
      };
    el.querySelector("form").onsubmit = async ev => {
      ev.preventDefault();
      const e = el.querySelector("#su-e").value.trim(),
        p = el.querySelector("#su-p").value;
      em = e;
      if (!e || !p) {
        draw("Fill in both boxes.");
        return;
      }
      const btn = el.querySelector(".su-go");
      btn.disabled = true;
      btn.textContent = "One moment…";
      /* trust.js: the answer of the sign-in service in calm words, never a raw error.
         data.ref: the code of the share link, kept with the account, thus it is not lost when the person
         confirms the email on a different device */
      const r = await tuAuth(SUPA.sb, mode, e, p, here(), suRef() ? { ref: suRef() } : null);
      if (r.state === "in") {
        suSet(r.session);
        done();
        return;
      }
      if (r.state === "confirm" || r.kind === "unconfirmed" || (r.kind === "exists" && r.again)) mode = "in";
      draw(r.msg, r.again);
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
        } catch (e) {
          report(e, "supa.js: on load (1)");
        }
      });
      {
        /* The time of the page load. From now, save() in ui.js runs saveCoachMark(), and home() adds homeCoachNote(). */
        SUPA.t0 = Date.now();
        setTimeout(() => {
          try {
            if (!SH) render();
          } catch (e) {
            report(e, "supa.js: on load (2)");
          }
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
          } catch (e) {
            report(e, "supa.js: suout (1)");
          }
          try {
            localStorage.removeItem(KEY);
          } catch (e) {
            report(e, "supa.js: suout (2)");
          }
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
          W.msg = r.error ? tuAuthMsg(r.error, "pw") : "Saved. You're signed in.";
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
            } catch (e) {
              report(e, "supa.js: suall");
            }
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
    } catch (e) {
      report(e, "supa.js: on load (3)");
    }
  });
}
/* Part of save() in ui.js. When the admin is in the game of a player, each save records the time of the change.
   The first 4 seconds after the page load do not count. It starts at page load on the website (SUPA.t0). */
function saveCoachMark() {
  if (!SUPA.t0) return;
  try {
    if (SUPA.as && G && !G.demo && Date.now() - SUPA.t0 > 4000)
      G.coachEdit = { at: Date.now(), by: SUPA.asRole || "admin" };
  } catch (e) {
    report(e, "supa.js: saveCoachMark");
  }
}
/* Part of home() in ui.js. Tells the player that the person who runs SLAM made a change in the game.
   It starts at page load on the website (SUPA.t0). */
function homeCoachNote(h) {
  if (!SUPA.t0) return h;
  try {
    const e = !SUPA.as && G && G.coachEdit;
    if (e && e.at > (G.coachSeen || 0)) {
      const n = `<div class="tile small row between homerow" style="border:2px solid var(--a3)"><span>${e.by === "coach" ? "Your coach" : "The person who runs SLAM"} made a change in your game on ${new Date(e.at).toLocaleDateString()}.</span><button class="ghost slim" data-a="sugot">Got it</button></div>`;
      return typeof homeRowAdd === "function"
        ? homeRowAdd(h, n)
        : /^<div class="stack[^"]*">/.test(h)
          ? h.replace(/^(<div class="stack[^"]*">)/, m => m + n)
          : n + h;
    }
  } catch (x) {
    report(x, "supa.js: homeCoachNote");
  }
  return h;
}
function suAcctSheet() {
  /* okay.js: a visitor with no account sees how to make one */
  if (typeof doorGuest === "function" && doorGuest() && typeof doorAcctSheet === "function") return doorAcctSheet();
  return (
    head("Your account", "My account") +
    `
 <div class="tile small"><b>Signed in as</b><div>${esc2(SUPA.email)}</div><div class="tiny muted">Your game saves to this account by itself. Sign in with the same email on any device and it's all there.</div></div>
 <div class="tile small row between"><span><b>Share with my coach</b><div class="tiny muted">${SUPA.share ? "On: your coach can see your game and help you with it." : "Off: your coach can't see your game. The person who runs SLAM still can."}</div></span>
 <button class="${SUPA.share ? "primary" : "ghost"}" data-a="sushare" aria-pressed="${SUPA.share}">${SUPA.share ? "Sharing" : "Share"}</button></div>
 ${W && W.msg ? `<div class="small" style="color:var(--good)">${W.msg}</div>` : ""}
 <button class="ghost wide" data-a="suout">Sign out</button>
 ${typeof tuAcctRow === "function" ? tuAcctRow() : ""}
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
      } catch (e) {
        report(e, "supa.js: suCoachLoad");
      }
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
