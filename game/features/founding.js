/* ============================================================================
   SLAM the Game: features/founding.js
   PURPOSE     Three small things for the soft launch.
               1. Founding Testers: the first 50 accounts that finish setup get a mark, and one card,
                  one time, that offers a 20-minute walkthrough with Eli (an email draft, nothing is
                  sent by the game).
               2. Share SLAM: one personal link for each account (?ref=code). No rewards.
               3. What's new: the patch notes (data/patchnotes.js), the newest first.
   INPUT       The game: G.demo, G.chars, G.fd (row: the answer of the database, card: how the card
               was closed). SUPA (account/supa.js): the signed-in account. The code a person arrived
               with (suRef in supa.js). PATCH_NOTES. The open sheet (W.kind): fdshare, whatsnew.
   OUTPUT      17 functions. Parts of functions in other files: finishSetupFounding, homeFoundingCard,
               meTabFounding, profSheetFounding, rvSheetFounding. Actions (ACT): fdshare, fdcopy,
               fdnative, fdmail, fdnot, whatsnew, pnall. Menu: "What's new", "Share SLAM".
   DEPENDS ON  core/report.js, account/supa.js, screens/ui.js, screens/planner.js, features/reveal.js,
               data/patchnotes.js.
   RULES       Only the database knows who the first 50 are
               (supabase/migrations/20261125190000_founding_and_referrals.sql, setup_finished). The game
               never works it out and never guesses. With no answer from the database there is no mark
               and no card. The answer is kept with the id of the account, thus a game that is loaded
               into a different account shows no mark.
               The share code is the first 8 letters of the SHA-256 of the account id. The database
               makes the same 8 letters. A share never carries a money number, a name or an email.
   STATE       FD (tried, busy, wait: the database part did not answer).
   ========================================================================= */
const FD_MAIL = "stresslessaboutmoney@gmail.com",
  FD_LIMIT = 50,
  FD_SITE = "https://sapphirestoneage.github.io/Slam/game/",
  FD_MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FD = { tried: false, busy: false, wait: false };

/* SHA-256 of a text, as hex. The browser has one, but it only answers later (a promise) and only on a
   secure page. The share code must be there when the sheet is drawn, thus this small copy. */
function fdSha256(text) {
  const K = [],
    H = [],
    isPrime = n => {
      for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
      return true;
    },
    frac = x => ((x - Math.floor(x)) * 4294967296) | 0,
    rot = (x, n) => (x >>> n) | (x << (32 - n));
  for (let n = 2; K.length < 64; n++)
    if (isPrime(n)) {
      if (H.length < 8) H.push(frac(Math.sqrt(n)));
      K.push(frac(Math.cbrt(n)));
    }
  const bytes = [];
  for (const ch of unescape(encodeURIComponent(String(text)))) bytes.push(ch.charCodeAt(0));
  const bits = bytes.length * 8;
  bytes.push(128);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (bits >>> (i * 8)) & 255);
  for (let o = 0; o < bytes.length; o += 64) {
    const w = [];
    for (let i = 0; i < 16; i++)
      w[i] =
        (bytes[o + i * 4] << 24) | (bytes[o + i * 4 + 1] << 16) | (bytes[o + i * 4 + 2] << 8) | bytes[o + i * 4 + 3];
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15],
        b = w[i - 2];
      w[i] = (w[i - 16] + (rot(a, 7) ^ rot(a, 18) ^ (a >>> 3)) + w[i - 7] + (rot(b, 17) ^ rot(b, 19) ^ (b >>> 10))) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0,
        t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, h].forEach((v, i) => (H[i] = (H[i] + v) | 0));
  }
  return H.map(v => (v >>> 0).toString(16).padStart(8, "0")).join("");
}
/* The share code of an account. The database file has the same rule (share_code_of). */
function fdCode(uid) {
  return uid ? fdSha256(String(uid).toLowerCase()).slice(0, 8) : "";
}
/* What the game keeps: G.fd. */
function fdX() {
  if (!G.fd || typeof G.fd !== "object") G.fd = {};
  return G.fd;
}
/* The account that is signed in on the website, or "" (the demo, a page with no connection). */
function fdUid() {
  return typeof SUPA !== "undefined" && SUPA && SUPA.on && SUPA.uid ? String(SUPA.uid) : "";
}
/* The answer of the database for THIS account, or null. A row of a different account does not count. */
function fdRow() {
  const r = G && G.fd && G.fd.row,
    u = fdUid();
  return r && u && r.u === u ? r : null;
}
/* The founding number (1 to 50), or 0. Only from the answer of the database. */
function fdNo() {
  const r = fdRow(),
    n = r ? +r.no : 0;
  return Number.isInteger(n) && n >= 1 && n <= FD_LIMIT ? n : 0;
}
/* The link to send. With no account there is no code, and the link is the plain one. */
function fdLink(code, base) {
  const b =
    base ||
    (typeof location !== "undefined" && /^https?:/.test(location.origin || "")
      ? location.origin + location.pathname.replace(/index\.html$/, "")
      : FD_SITE);
  return code ? b + "?ref=" + encodeURIComponent(code) : b;
}
function fdMyCode() {
  const r = fdRow();
  return r && r.code ? r.code : fdCode(fdUid());
}
/* The email draft. The game sends nothing: the mail app of the person opens with this text. */
function fdMailto() {
  const sub = "SLAM walkthrough (Founding Tester)",
    body =
      "Hi Eli,\n\nI'm one of the first 50 on SLAM the Game, and I'd like the free 20-minute walkthrough.\n\nTimes that work for me:\n\n";
  return "mailto:" + FD_MAIL + "?subject=" + encodeURIComponent(sub) + "&body=" + encodeURIComponent(body);
}
/* Keep the answer of the database: { at, no, code, ref }. */
function fdTake(d, uid) {
  const n = +d.no;
  fdX().row = {
    u: uid,
    no: Number.isInteger(n) && n >= 1 && n <= FD_LIMIT ? n : null,
    code: typeof suRefClean === "function" ? suRefClean(d.code) : "",
    at: d.at || null,
    ref: d.ref || null,
  };
  save();
}
/* Tell the database one time that setup is finished. It answers with the row of this account.
   Not in the demo, not for the admin or a coach inside the game of another person, and not before a
   real profile exists. With no database function (the file has not run) nothing changes. */
function fdTry() {
  if (FD.tried || FD.busy) return;
  const uid = fdUid();
  if (!uid || SUPA.as || !SUPA.sb || !SUPA.ready) return;
  if (!G || G.demo || !(G.chars || []).some(c => c && !c.demo)) return;
  if (fdRow()) {
    FD.tried = true;
    return;
  }
  FD.busy = true;
  const end = () => {
    FD.busy = false;
    FD.tried = true;
  };
  SUPA.ready
    .then(() => (SUPA.as || fdUid() !== uid ? null : SUPA.sb.rpc("setup_finished", { ref: suRef() || null })))
    .then(
      r => {
        end();
        if (!r) return;
        if (r.error || !r.data) {
          FD.wait = true; /* the database file has not run yet: no mark, no card, try again at the next visit */
          return;
        }
        if (SUPA.as || fdUid() !== uid || G.demo) return;
        fdTake(r.data, uid);
        try {
          if (!SH) render();
        } catch (e) {
          report(e, "founding.js: fdTry (1)");
        }
      },
      e => {
        end();
        FD.wait = true;
        report(e, "founding.js: fdTry (2)");
      }
    );
}
/* Part of finishSetup() in ui.js. Setup is finished: tell the account. */
function finishSetupFounding() {
  try {
    fdTry();
  } catch (e) {
    report(e, "founding.js: finishSetupFounding");
  }
}
const fdPill = () => `<span class="pill okp">Founding Tester</span>`;
/* Part of home() in ui.js. The card of a Founding Tester. It shows one time: "Email Eli" and "Not now"
   both close it for good. It also asks the database when the game opens with setup already finished. */
function homeFoundingCard(h) {
  try {
    fdTry();
    if (G.demo || !fdNo() || fdX().card || SUPA.as || typeof homeRowAdd !== "function") return h;
    return homeRowAdd(
      h,
      `<div class="card stack homerow" style="flex-direction:column;align-items:stretch;border:2px solid var(--a3)"><div>${fdPill()}</div><b>You're one of the first ${FD_LIMIT}.</b><div class="small">Want a free 20-minute walkthrough with Eli?</div><div class="row" style="gap:8px;flex-wrap:wrap"><button class="primary" data-a="fdmail">Email Eli</button><button class="ghost" data-a="fdnot">Not now</button></div><div class="tiny muted">Email Eli opens a draft in your mail app. Nothing is sent until you send it.</div></div>`
    );
  } catch (e) {
    report(e, "founding.js: homeFoundingCard");
    return h;
  }
}
/* Part of meTab() in ui.js. The mark, next to the name. */
function meTabFounding(h) {
  try {
    if (!fdNo()) return h;
    const nm = `<h1>${esc(C().name)}</h1>`;
    return h.replace(nm, () => nm.replace("</h1>", ` <span style="vertical-align:middle">${fdPill()}</span></h1>`));
  } catch (e) {
    report(e, "founding.js: meTabFounding");
    return h;
  }
}
/* Part of profSheet() in profiles.js. The mark, above the list of people. */
function profSheetFounding(h) {
  try {
    if (!fdNo() || G.demo) return h;
    const at = '<div class="stack" style="gap:6px">';
    return h.replace(
      at,
      () =>
        `<div class="row" style="gap:8px;justify-content:flex-start;align-items:center">${fdPill()}<span class="tiny muted">This account is one of the first ${FD_LIMIT} to finish setup.</span></div>` +
        at
    );
  } catch (e) {
    report(e, "founding.js: profSheetFounding");
    return h;
  }
}
/* Part of rvSheet() in reveal.js. The mark, as one line of the character sheet. */
function rvSheetFounding(h) {
  try {
    if (!fdNo() || G.demo) return h;
    const at = '<div class="tiny muted">No dollar amounts on this sheet';
    return h.replace(
      at,
      () =>
        `<div class="row between"><span class="tiny muted">One of the first ${FD_LIMIT}</span>${fdPill()}</div>` + at
    );
  } catch (e) {
    report(e, "founding.js: rvSheetFounding");
    return h;
  }
}
/* THE SHEET "SHARE SLAM". */
function fdShareSheet() {
  const w = W || {},
    code = fdMyCode(),
    link = fdLink(code),
    can = typeof navigator !== "undefined" && typeof navigator.share === "function";
  return (
    head("Menu", "Share SLAM") +
    `<div class="tile stack" style="gap:6px"><div class="tiny muted">${code ? "Your link" : "The link to the game"}</div><div class="small" style="word-break:break-all;user-select:all">${esc(link)}</div></div>` +
    `<button class="primary wide" data-a="fdcopy">${w.copied ? "Copied ✓" : code ? "Copy my link" : "Copy the link"}</button>` +
    (can ? `<button class="ghost wide" data-a="fdnative">Send it with an app on this device</button>` : "") +
    (w.msg ? `<div class="small">${esc(w.msg)}</div>` : "") +
    `<div class="small">No rewards yet. ${code ? "The link only lets Eli see who invited whom." : "Sign in on the website to get a link of your own."}</div>` +
    `<div class="tiny muted">${code ? "The link carries one short code." : "The link carries nothing about you."} It never carries a money number, your name or your email.</div>` +
    (fdNo()
      ? `<div class="tile stack" style="gap:6px"><div>${fdPill()}</div><div class="small">You're one of the first ${FD_LIMIT}. The free 20-minute walkthrough with Eli is yours when you want it.</div><button class="ghost" data-a="fdmail">Email Eli</button></div>`
      : "")
  );
}
/* THE SHEET "WHAT'S NEW". */
/* The notes, the newest first. For one date, the later entry of the file comes first. */
function pnSorted(list) {
  return (list || [])
    .map((e, i) => ({ e, i }))
    .filter(x => x.e && x.e.d && x.e.t)
    .sort((a, b) => (a.e.d === b.e.d ? b.i - a.i : a.e.d < b.e.d ? 1 : -1))
    .map(x => x.e);
}
/* "2026-11-25" as "Nov 25, 2026". No clock and no time zone. */
function pnDay(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || ""));
  return m && FD_MON[+m[2] - 1] ? FD_MON[+m[2] - 1] + " " + +m[3] + ", " + m[1] : "";
}
function pnSheet() {
  const L = pnSorted(typeof PATCH_NOTES !== "undefined" ? PATCH_NOTES : []),
    all = !!(W && W.all),
    show = all ? L : L.slice(0, 3);
  return (
    head("Menu", "What's new") +
    (L.length
      ? `<div class="tiny muted">What changed in SLAM, the newest first.</div>` +
        show
          .map(
            e =>
              `<div class="tile stack" style="gap:4px"><div class="tiny muted">${esc(pnDay(e.d))}</div><b>${esc(e.t)}</b><ul class="small" style="margin:0;padding-left:18px">${(e.l || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>`
          )
          .join("") +
        (L.length > 3
          ? `<button class="ghost wide slim" data-a="pnall">${all ? "Show only the newest" : "Show older updates (" + (L.length - 3) + ")"}</button>`
          : "")
      : `<div class="small muted">Nothing here yet.</div>`)
  );
}
Object.assign(ACT, {
  fdshare: () => {
    W = { kind: "fdshare" };
    sheet(fdShareSheet);
  },
  fdcopy: () => {
    try {
      navigator.clipboard.writeText(fdLink(fdMyCode()));
      W.copied = true;
      W.msg = "";
    } catch (e) {
      report(e, "founding.js: fdcopy");
      W.msg = "This device did not let the game copy. Press and hold the link above to copy it.";
    }
    drawSheet();
  },
  fdnative: () => {
    try {
      const p = navigator.share({
        title: "SLAM the Game",
        text: "A money game I'm trying. It's free and it starts with a few taps.",
        url: fdLink(fdMyCode()),
      });
      /* closing the share sheet of the phone is not an error (AbortError) */
      if (p && p.catch)
        p.catch(e => {
          if (!e || e.name !== "AbortError") report(e, "founding.js: fdnative (1)");
        });
    } catch (e) {
      report(e, "founding.js: fdnative (2)");
    }
  },
  fdmail: () => {
    const x = fdX();
    if (!x.card) {
      x.card = "mail";
      save();
    }
    try {
      if (typeof location !== "undefined") location.href = fdMailto();
    } catch (e) {
      report(e, "founding.js: fdmail");
    }
    if (SH) drawSheet();
    else render();
  },
  fdnot: () => {
    fdX().card = "no";
    save();
    render();
  },
  whatsnew: () => {
    W = { kind: "whatsnew", all: false };
    sheet(pnSheet);
  },
  pnall: () => {
    W.all = !W.all;
    drawSheet();
  },
});
if (typeof MENU !== "undefined" && Array.isArray(MENU)) {
  const at = () => {
    const i = MENU.findIndex(m => m[1] === "flag");
    return i >= 0 ? i : MENU.length;
  };
  if (!MENU.some(m => m[1] === "whatsnew"))
    MENU.splice(at(), 0, ["What's new", "whatsnew", "act", "What changed in SLAM, the newest first"]);
  if (!MENU.some(m => m[1] === "fdshare"))
    MENU.splice(at(), 0, ["Share SLAM", "fdshare", "act", "Your own link to send to a friend. No money numbers in it"]);
}
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
