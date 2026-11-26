/* ============================================================================
   SLAM the Game: account/lock.js
   PURPOSE     App lock and passkeys (run Not built, groups 1 to 5, Part 10b). (1) App lock, on this device
               only: a PIN of 4 to 6 digits, or the device's own lock (fingerprint, face or the device PIN,
               through the browser's WebAuthn) where the browser has it. When the lock is on, a cover hides
               the game each time it opens, and again after the game was in the background for the minutes
               the player picked. The setting lives in this browser (localStorage "slam_lock"), never in the
               saved game or the cloud. (2) Passkey sign-in through Supabase Auth: built, and SWITCHED OFF by
               PASSKEY_READY until Eli turns passkeys on in the Supabase project (docs/PASSKEYS.md).
   INPUT       localStorage "slam_lock" ({ on, pin: { salt, hash }, bio: { id }, after }). The taps on the
               cover (its own data-lk buttons, with its own click handler: the cover works before ui.js).
   OUTPUT      PASSKEY_READY, LK_STORE. Functions: lkRead, lkWrite, lkHash, lkHasBio, lkBioMake, lkBioCheck,
               lkCover, lkShow, lkHide, lkLocked, lkTry, lkPasskeyApi, lkPasskeySignIn, lkPasskeyAdd.
               features/lockset.js has the settings sheet and its actions.
   DEPENDS ON  core/report.js. Uses later, behind a typeof test: account/supa.js (SUPA), screens/ui.js.
   RULES       The lock hides the game; it does not encrypt what the browser keeps. The PIN is never kept:
               only a salted SHA-256 of it. No secret key is in this file. The passkey path uses only the
               public Supabase client of supa.js.
   ========================================================================= */
/* PASSKEY_READY: false until Eli turns on passkeys in the Supabase project and checks one sign-in on the live site
   (docs/PASSKEYS.md). While it is false, no passkey button shows anywhere and no passkey call is made. */
const PASSKEY_READY = false;
const LK_STORE = "slam_lock";
let LK_STATE = { locked: false, typed: "", msg: "", hidAt: null };
function lkRead() {
  try {
    const s = typeof localStorage !== "undefined" ? localStorage.getItem(LK_STORE) : null;
    return s ? JSON.parse(s) : { on: false, after: 0 };
  } catch (e) {
    report(e, "lock.js: lkRead");
    return { on: false, after: 0 };
  }
}
function lkWrite(o) {
  try {
    localStorage.setItem(LK_STORE, JSON.stringify(o));
  } catch (e) {
    report(e, "lock.js: lkWrite");
  }
}
const lkHex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
const lkB64 = buf => btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(buf))));
const lkUnB64 = s => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));
const lkRand = n => {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
};
/* A salted SHA-256 of the PIN, as hex. */
async function lkHash(pin, salt) {
  const data = new TextEncoder().encode(salt + ":" + pin);
  return lkHex(await crypto.subtle.digest("SHA-256", data));
}
/* Does this browser have the device's own lock (a platform authenticator with a check of the person)? */
async function lkHasBio() {
  try {
    return (
      typeof window !== "undefined" &&
      !!window.PublicKeyCredential &&
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function" &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  } catch (e) {
    report(e, "lock.js: lkHasBio");
    return false;
  }
}
/* Make a key on this device for the lock. Nothing goes to a server: the key only proves the device's own check. */
async function lkBioMake() {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: lkRand(32),
      rp: { name: "SLAM" },
      user: { id: lkRand(16), name: "SLAM on this device", displayName: "SLAM" },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "discouraged",
      },
      timeout: 60000,
    },
  });
  return cred ? lkB64(cred.rawId) : null;
}
/* Ask the device to check the person with the key made above. True when the device says yes. */
async function lkBioCheck(id) {
  const a = await navigator.credentials.get({
    publicKey: {
      challenge: lkRand(32),
      allowCredentials: [{ type: "public-key", id: lkUnB64(id) }],
      userVerification: "required",
      timeout: 60000,
    },
  });
  return !!a;
}
function lkLocked() {
  return !!LK_STATE.locked;
}
/* The cover: plain HTML of its own, so it works before the screens are loaded. */
function lkCover() {
  const o = lkRead(),
    n = LK_STATE.typed.length,
    keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
  return (
    `<div class="lkin" role="dialog" aria-modal="true" aria-label="SLAM is locked"><h2>SLAM is locked</h2><div class="small muted">${o.pin ? "Type your PIN." : ""}${o.pin && o.bio ? " Or " : ""}${o.bio ? "use this device's lock." : ""}</div>` +
    (o.pin
      ? `<div class="lkdots" aria-live="polite">${"●".repeat(n)}${"○".repeat(Math.max(0, 4 - n))}</div><div class="lkpad">${keys.map(k => (k ? `<button class="lkkey" data-lk="${k}" aria-label="${k === "del" ? "Delete one digit" : k}">${k === "del" ? "⌫" : k}</button>` : `<button class="lkkey" data-lk="go" aria-label="Unlock">OK</button>`)).join("")}</div>`
      : "") +
    (o.bio ? `<button class="primary wide" data-lk="bio">Unlock with this device's lock</button>` : "") +
    `<div class="tiny muted" aria-live="polite">${LK_STATE.msg || "&nbsp;"}</div>` +
    `<details><summary class="small">Forgot the PIN?</summary><div class="tiny muted">The lock lives in this browser only. If you sign in with an account, your game is in the cloud: clear this site's data in the browser's settings, then sign in again. Without an account, clearing the site's data also clears the game on this device.</div></details></div>`
  );
}
function lkPaint() {
  if (typeof document === "undefined" || !document.getElementById) return;
  const el = document.getElementById("lkcover");
  if (el) el.innerHTML = lkCover();
}
function lkShow() {
  try {
    if (typeof document === "undefined" || !document.body || !document.createElement) return;
    LK_STATE.locked = true;
    LK_STATE.typed = "";
    let el = document.getElementById("lkcover");
    if (!el) {
      el = document.createElement("div");
      el.id = "lkcover";
      el.className = "lkcover";
      el.addEventListener("click", lkTap);
      document.body.appendChild(el);
    }
    el.hidden = false;
    ["app", "ov", "tabs"].forEach(id => {
      const x = document.getElementById(id);
      if (x) x.inert = true;
    });
    lkPaint();
  } catch (e) {
    report(e, "lock.js: lkShow");
  }
}
function lkHide() {
  LK_STATE.locked = false;
  LK_STATE.typed = "";
  LK_STATE.msg = "";
  if (typeof document === "undefined" || !document.getElementById) return;
  const el = document.getElementById("lkcover");
  if (el) el.hidden = true;
  ["app", "ov", "tabs"].forEach(id => {
    const x = document.getElementById(id);
    if (x) x.inert = false;
  });
}
/* Check the typed PIN. */
async function lkTry(pin) {
  const o = lkRead();
  if (!o.pin) return false;
  const ok = (await lkHash(pin, o.pin.salt)) === o.pin.hash;
  if (ok) lkHide();
  else {
    LK_STATE.typed = "";
    LK_STATE.msg = "That is not the PIN. Try again.";
    lkPaint();
  }
  return ok;
}
function lkTap(e) {
  const b = e.target.closest && e.target.closest("[data-lk]");
  if (!b) return;
  const k = b.dataset.lk;
  if (k === "bio") {
    lkBioCheck(lkRead().bio.id)
      .then(ok => (ok ? lkHide() : null))
      .catch(err => {
        report(err, "lock.js: lkTap");
        LK_STATE.msg = "The device did not unlock. Try again, or use the PIN.";
        lkPaint();
      });
    return;
  }
  if (k === "del") LK_STATE.typed = LK_STATE.typed.slice(0, -1);
  else if (k === "go") {
    if (LK_STATE.typed.length >= 4) lkTry(LK_STATE.typed);
    return;
  } else if (LK_STATE.typed.length < 6) LK_STATE.typed += k;
  LK_STATE.msg = "";
  lkPaint();
  if (LK_STATE.typed.length >= 4) {
    const t = LK_STATE.typed;
    lkHash(t, lkRead().pin.salt).then(h => {
      if (h === lkRead().pin.hash && LK_STATE.typed === t) lkHide();
    });
  }
}
/* On open: the cover, when the lock is on. In the background longer than the minutes picked: the cover again. */
if (typeof document !== "undefined" && document.body && document.createElement) {
  if (lkRead().on) lkShow();
  document.addEventListener("visibilitychange", () => {
    const o = lkRead();
    if (!o.on) return;
    if (document.hidden) LK_STATE.hidAt = Date.now();
    else if (LK_STATE.hidAt && Date.now() - LK_STATE.hidAt >= (o.after || 0) * 60000) lkShow();
  });
}

/* ---------- Passkey sign-in (off: PASSKEY_READY) ---------- */
/* The passkey calls of the Supabase client, found by name, because they are new in supabase-js and their names may
   change. null: this client has none (or the switch is off). Eli checks the names in docs/PASSKEYS.md first. */
function lkPasskeyApi() {
  try {
    if (!PASSKEY_READY || typeof SUPA === "undefined" || !SUPA.sb || !SUPA.sb.auth) return null;
    const a = SUPA.sb.auth,
      signIn = ["signInWithPasskey", "signInWithWebAuthn"].find(n => typeof a[n] === "function"),
      add = ["registerPasskey", "addPasskey"].find(n => typeof a[n] === "function");
    return signIn ? { a, signIn, add: add || null } : null;
  } catch (e) {
    report(e, "lock.js: lkPasskeyApi");
    return null;
  }
}
/* Sign in with a passkey. Returns { ok, why }. */
async function lkPasskeySignIn() {
  const P = lkPasskeyApi();
  if (!P)
    return {
      ok: false,
      why: PASSKEY_READY ? "This version of the sign-in library has no passkeys yet." : "Passkeys are off for now.",
    };
  try {
    const r = await P.a[P.signIn]();
    return r && r.error ? { ok: false, why: r.error.message || "The passkey did not sign in." } : { ok: true };
  } catch (e) {
    report(e, "lock.js: lkPasskeySignIn");
    return { ok: false, why: "The passkey did not sign in." };
  }
}
/* Add a passkey to the account that is signed in. Returns { ok, why }. */
async function lkPasskeyAdd() {
  const P = lkPasskeyApi();
  if (!P || !P.add || !SUPA.on) return { ok: false, why: "Passkeys are off for now." };
  try {
    const r = await P.a[P.add]();
    return r && r.error ? { ok: false, why: r.error.message || "The passkey was not added." } : { ok: true };
  } catch (e) {
    report(e, "lock.js: lkPasskeyAdd");
    return { ok: false, why: "The passkey was not added." };
  }
}
