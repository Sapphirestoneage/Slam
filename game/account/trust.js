/* ============================================================================
   SLAM the Game: account/trust.js
   PURPOSE     Trust. Three things: (1) the one line "Education and tools, not financial advice." and the
               link to the privacy page; (2) calm words for each answer of the sign-in service (the
               email is on its way, the email could not be sent, too many emails, and more), so the
               player never sees a raw error; (3) "Delete my account": remove what the player can
               remove, sign out, and say exactly what is gone and what stays.
   INPUT       The answers of the sign-in service (Supabase). The browser storage. The taps of the
               player (the actions in OUTPUT).
   OUTPUT      16 functions. Parts of functions in other files: tuGateFoot (the sign-up screen in
               supa.js), tuAcctRow (suAcctSheet in supa.js), tuFoot (renderBase in ui.js). Actions (ACT): tuprivacy. Menu: "Privacy".
   DEPENDS ON  core/report.js.
   USES LATER  Names from files that the browser loads later. tuWire() uses screens/ui.js (ACT) and
               screens/planner.js (MENU); planner.js calls it, thus both exist.
   RULES       privacy.html loads this file too, with no other game script. Thus this file uses no
               name of a different file at load time. The words never blame the player.
               The database function delete_my_account() is in
               supabase/migrations/20261125200000_delete_my_account.sql. Until the owner runs that
               file, tuDelete() removes the saved game and the copy on the device, and the sign-in
               stays. After it, tuDelete() removes all of it.
   STATE       None. The game of the player is in the table games (account/supa.js).
   ========================================================================= */
const TRUST_LINE = "Education and tools, not financial advice.";
const TRUST_MAIL = "stresslessaboutmoney@gmail.com";
const TRUST_PAGE = "./privacy.html";

/* ---------- 1. the line and the links ---------- */
/* Part of the sign-up screen (suGate in supa.js). The line, and the link to the privacy page. */
function tuGateFoot() {
  return `<p class="su-trust" style="margin:14px 0 0;font-size:13px">${TRUST_LINE} <a href="${TRUST_PAGE}" style="color:var(--a3,#8fb0ff);text-decoration:underline">Privacy: what is stored and who sees it</a></p>`;
}
/* Part of suAcctSheet() in supa.js. The way to the privacy page and to "Delete my account". */
function tuAcctRow() {
  return `<div class="tile small row between"><span><b>Privacy</b><div class="tiny muted">What is stored, who can see it, and how to delete your account.</div></span><a class="ghost" href="${TRUST_PAGE}" style="text-decoration:none;display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:10px;border:2px solid var(--line,#3a55a0);color:inherit;font-weight:600">Open</a></div>
 <div class="tile small row between"><span><b>Delete my account</b><div class="tiny muted">Removes your saved game. It asks two times first. It cannot be undone.</div></span><a class="ghost" href="${TRUST_PAGE}#delete" style="text-decoration:none;display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:10px;border:2px solid var(--line,#3a55a0);color:inherit;font-weight:600">Start</a></div>`;
}
/* Part of renderBase() in ui.js. The foot of each main screen: the line and the link to the privacy page. */
function tuFoot() {
  return `<div class="tiny muted trustfoot" style="text-align:center;margin:16px 0 4px">${TRUST_LINE} <a href="${TRUST_PAGE}" style="color:var(--a3,#8fb0ff);text-decoration:underline;display:inline-block;padding:12px 4px">Privacy</a></div>`;
}
/* The menu line and its action. planner.js calls it one time, after the menu exists. */
function tuWire() {
  if (MENU.some(m => m[1] === "tuprivacy")) return;
  MENU.push(["Privacy", "tuprivacy", "act", "What is stored, who can see it, and how to delete your account"]);
  ACT.tuprivacy = () => {
    if (typeof location !== "undefined") location.href = TRUST_PAGE;
  };
}
/* ---------- 2. calm words for the sign-in service ---------- */
/* What kind of answer is this? One word. The service gives a code, a status and a message; the three change
   between versions, thus each kind looks at all three. */
function tuAuthKind(err) {
  const m = String((err && err.message) || ""),
    c = String((err && err.code) || ""),
    st = +(err && err.status) || 0;
  if (c === "over_email_send_rate_limit" || /e-?mail rate limit/i.test(m)) return "mailrate";
  if (c === "email_address_not_authorized" || /not authorized/i.test(m)) return "mailclosed";
  if (/error sending .*e?-?mail/i.test(m) || (c === "unexpected_failure" && /send|smtp|mail/i.test(m)))
    return "mailsend";
  if (c === "email_not_confirmed" || /email not confirmed/i.test(m)) return "unconfirmed";
  if (c === "user_already_exists" || c === "email_exists" || /already registered|already been registered/i.test(m))
    return "exists";
  if (c === "invalid_credentials" || /invalid login/i.test(m)) return "nomatch";
  if (c === "same_password" || /different from the old/i.test(m)) return "samepw";
  if (c === "weak_password" || /password should/i.test(m)) return "weakpw";
  if (c === "email_address_invalid" || c === "validation_failed" || /invalid format|validate email/i.test(m))
    return "bademail";
  if (c === "signup_disabled" || /signups? (are )?not allowed|signups? disabled/i.test(m)) return "closed";
  if (c === "user_banned" || /banned/i.test(m)) return "paused";
  if (c === "over_request_rate_limit" || st === 429 || /only request this after|too many requests/i.test(m))
    return "wait";
  if (/fetch|network|load failed|timed? ?out/i.test(m) || (err && err.name === "AuthRetryableFetchError")) return "net";
  return "other";
}
/* The words for one kind. what: "up" (create an account), "in" (sign in), "reset" (forgot my password),
   "pw" (set a new password), "again" (send the email again). */
function tuAuthMsg(err, what) {
  const k = tuAuthKind(err),
    help = `If it keeps happening, write to ${TRUST_MAIL}.`;
  switch (k) {
    case "mailsend":
      return (
        "The email could not be sent. This is on our side, not yours: the email service did not answer. " +
        (what === "up" ? "Your account is not ready yet. " : "") +
        "Wait a few minutes, then try again with the same email. " +
        help
      );
    case "mailrate":
      return (
        "The email could not be sent: too many emails went out from SLAM in the last hour. Your address is fine. " +
        "Try again in an hour with the same email. " +
        help
      );
    case "mailclosed":
      return `The email could not be sent to that address: the email service of SLAM is still being set up. Write to ${TRUST_MAIL} and Eli will let you in.`;
    case "unconfirmed":
      return "Your email is not confirmed yet. Open the email from SLAM and tap the link in it, then sign in here.";
    case "exists":
      return 'That email already has an account. Tap "I already have an account" below.';
    case "nomatch":
      return "That email and password don't match. Try again, or tap Forgot my password.";
    case "weakpw":
      return "Use a longer password: at least 6 letters or numbers.";
    case "samepw":
      return "That is the password you have now. Type a different one.";
    case "bademail":
      return "That email address does not look complete. Check it and try again.";
    case "closed":
      return `New accounts are closed right now. Write to ${TRUST_MAIL} to get in.`;
    case "paused":
      return `This account is paused. Write to ${TRUST_MAIL}.`;
    case "wait":
      return "That was just tried. Wait a minute, then try again.";
    case "net":
      return "Could not reach the server. Check your internet, then try again.";
    default:
      return "That did not go through. Wait a minute, then try again. " + help;
  }
}
/* After "Create my account" with email confirmation on: what to do now, and what to do if nothing arrives. */
function tuCheckEmail(email) {
  return (
    `<b>Check your email.</b> We sent a link to ${tuEsc(email)}. Tap the link, then sign in here.` +
    `<div style="margin-top:8px">Nothing after 5 minutes? Look in Spam or Promotions, and check the address above for a typing slip. Then tap Send the email again.</div>`
  );
}
/* Create an account or sign in. The answer is one object, and the sign-up screen only shows it:
   state "in"      signed in (session)
   state "confirm" the account waits for the link in the email (msg, again: true = offer "Send the email again")
   state "msg"     something to tell the player (msg), and perhaps the same offer (again) */
async function tuAuth(sb, mode, email, pw, redirect) {
  let r;
  try {
    r =
      mode === "new"
        ? await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: redirect } })
        : await sb.auth.signInWithPassword({ email, password: pw });
  } catch (e) {
    report(e, "trust.js: tuAuth");
    r = { error: e || { message: "network" } };
  }
  if (r && r.error) {
    const k = tuAuthKind(r.error);
    if (k === "other") report(r.error, "trust.js: tuAuth (an answer with no words yet)");
    return { state: "msg", kind: k, msg: tuAuthMsg(r.error, mode === "new" ? "up" : "in"), again: k === "unconfirmed" };
  }
  const d = (r && r.data) || {};
  if (d.session) return { state: "in", session: d.session };
  if (mode === "new") {
    /* With confirmation on, the service answers a sign-up for an email that already has an account with a
       user that has no identities, and it sends no email. */
    if (d.user && Array.isArray(d.user.identities) && !d.user.identities.length)
      return {
        state: "msg",
        kind: "exists",
        msg: "That email already has an account. Sign in below. If you never got the first email, tap Send the email again.",
        again: true,
      };
    return { state: "confirm", kind: "confirm", msg: tuCheckEmail(email), again: true };
  }
  return { state: "msg", kind: "other", msg: tuAuthMsg({}, "in"), again: false };
}
/* "Send the email again": the confirmation email of a new account. */
async function tuResend(sb, email, redirect) {
  let r;
  try {
    r = await sb.auth.resend({ type: "signup", email, options: { emailRedirectTo: redirect } });
  } catch (e) {
    report(e, "trust.js: tuResend");
    r = { error: e || { message: "network" } };
  }
  if (r && r.error) return { ok: false, kind: tuAuthKind(r.error), msg: tuAuthMsg(r.error, "again") };
  return {
    ok: true,
    kind: "sent",
    msg: `Sent again to ${tuEsc(email)}. It can take a few minutes. If this address already confirmed, no new email comes: sign in below.`,
  };
}
/* "Forgot my password": the email with the link to set a new password. */
async function tuReset(sb, email, redirect) {
  let r;
  try {
    r = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirect });
  } catch (e) {
    report(e, "trust.js: tuReset");
    r = { error: e || { message: "network" } };
  }
  if (r && r.error) return { ok: false, kind: tuAuthKind(r.error), msg: tuAuthMsg(r.error, "reset") };
  return {
    ok: true,
    kind: "sent",
    msg: "Check your email for a link to set a new password. Nothing after 5 minutes? Look in Spam, then try again.",
  };
}
function tuEsc(s) {
  return String(s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]);
}

/* ---------- 3. delete my account ---------- */
/* The keys of the game in the browser storage: the saved game, the name of the account, the small notes
   of the game, and the sign-in of Supabase. The web app keeps its own keys (they start with "slam."). */
const TU_GAME_KEYS = /^(slamgame|slam_|su_|sb-.*-auth-token)/;
const TU_WEB_KEYS = /^slam\./;
/* Remove each key that matches, from one storage. Gives the number of keys removed. */
function tuWipe(store, re) {
  let n = 0;
  try {
    const ks = [];
    for (let i = 0; i < store.length; i++) ks.push(store.key(i));
    ks.filter(k => k && re.test(k)).forEach(k => {
      store.removeItem(k);
      n++;
    });
  } catch (e) {
    report(e, "trust.js: tuWipe");
  }
  return n;
}
/* True when the database says: I do not have that function or that table. */
function tuMissing(err) {
  const c = String((err && err.code) || ""),
    m = String((err && err.message) || "");
  return (
    c === "PGRST202" ||
    c === "PGRST205" ||
    c === "42883" ||
    c === "42P01" ||
    /could not find the (function|table)|does not exist/i.test(m)
  );
}
/* Delete the account of the signed-in player.
   First the database function delete_my_account(): it removes each row of the player and the sign-in.
   If the database does not have the function yet: remove the saved game with the rights of the player
   (the row rule "players own their games"), then look again to make sure that no row is left.
   Then the copy on this device, then sign out.
   The answer says what happened, and tuDeleteSays() turns it into words:
     stop     "" or the reason that nothing was removed: "net", "admin", "nouser"
     full     true = the database function removed all of it, the sign-in too
     games    the number of saved pieces removed (null = not known)
     left     the number of saved pieces still there after the delete (null = could not look)
     device   the number of keys removed from this device
     out      true = signed out */
async function tuDelete(sb, uid, stores) {
  const res = { stop: "", full: false, games: null, left: null, device: 0, out: false };
  if (!sb || !uid) {
    res.stop = "nouser";
    return res;
  }
  let fn = null;
  try {
    fn = await sb.rpc("delete_my_account");
  } catch (e) {
    report(e, "trust.js: tuDelete (1)");
    fn = { error: e || { message: "network" } };
  }
  if (fn && !fn.error) {
    res.full = true;
    res.games = fn.data && typeof fn.data.games === "number" ? fn.data.games : null;
    res.left = 0;
  } else if (/admin/i.test(String((fn.error && fn.error.message) || ""))) {
    res.stop = "admin";
    return res;
  } else if (!tuMissing(fn.error) && tuAuthKind(fn.error) === "net") {
    res.stop = "net";
    return res;
  } else {
    /* the function is not in the database yet: the rights of the player remove the saved game */
    try {
      const q = await sb.from("games").delete().eq("owner", uid).select("id");
      if (q.error) throw q.error;
      res.games = (q.data || []).length;
    } catch (e) {
      report(e, "trust.js: tuDelete (2)");
      if (tuAuthKind(e) === "net") {
        res.stop = "net";
        return res;
      }
    }
    try {
      const q = await sb.from("games").select("id").eq("owner", uid);
      if (q.error) throw q.error;
      res.left = (q.data || []).length;
    } catch (e) {
      report(e, "trust.js: tuDelete (3)");
    }
  }
  (stores || []).forEach(s => (res.device += tuWipe(s, TU_GAME_KEYS)));
  try {
    const o = await sb.auth.signOut();
    res.out = !(o && o.error);
  } catch (e) {
    report(e, "trust.js: tuDelete (4)");
  }
  /* the sign-in of Supabase is a key on this device too: remove it when the sign-out could not */
  (stores || []).forEach(s => (res.device += tuWipe(s, TU_GAME_KEYS)));
  return res;
}
/* The words for the answer of tuDelete(): a title, what is gone, what stays, and what to do next. */
function tuDeleteSays(res, email) {
  const who = email ? tuEsc(email) : "your email";
  if (res.stop === "nouser")
    return {
      title: "Sign in first",
      gone: [],
      stays: ["Nothing was removed. Sign in to the game, then come back to this page."],
      next: "",
    };
  if (res.stop === "net")
    return {
      title: "Nothing was removed",
      gone: [],
      stays: ["The server could not be reached, so your account is as it was. Check your internet, then try again."],
      next: "",
    };
  if (res.stop === "admin")
    return {
      title: "Nothing was removed",
      gone: [],
      stays: [
        "This is the account that runs SLAM. It is not deleted from the app, so the game is never left with no admin.",
      ],
      next: "",
    };
  const pieces =
    res.games === null
      ? "Your saved game"
      : `Your saved game (${res.games} saved ${res.games === 1 ? "piece" : "pieces"})`;
  if (res.full)
    return {
      title: "Your account is deleted",
      gone: [
        `${pieces}, from the database.`,
        `Your sign-in: ${who} and the password.`,
        "Your coach permissions, the notes a coach kept about you, and your lines of failed saves.",
        "The copy of the game on this device.",
      ],
      stays: [
        "Lines in the admin log about your account stay, with your email removed from them.",
        "A backup file that the admin downloaded before today can still hold your game. Write to " +
          TRUST_MAIL +
          " to have it removed there too.",
        "Copies on your other devices stay until you sign in there or clear that browser.",
      ],
      next: "You are signed out. To play again, make a new account.",
    };
  const gone = [];
  if (res.left === 0) gone.push(`${pieces}, from the database. We looked again: nothing of your game is left there.`);
  else if (res.games) gone.push(`${pieces}, from the database.`);
  gone.push("The copy of the game on this device.");
  const stays = [];
  if (res.left === null)
    stays.push(
      "We could not look again to make sure that the saved game is gone. Sign in one more time to check: an empty game means it is gone."
    );
  else if (res.left > 0)
    stays.push(`${res.left} saved ${res.left === 1 ? "piece" : "pieces"} of your game could not be removed.`);
  stays.push(
    `Your sign-in (${who} and the password) is still there. Removing it needs one step in the database that is not switched on yet. Write to ${TRUST_MAIL} from that address and Eli removes it by hand.`,
    "Kept until Eli removes the sign-in: lines in the admin log with your email, notes a coach kept about you, and lines of failed saves.",
    "A backup file that the admin downloaded before today can still hold your game.",
    "Copies on your other devices stay until you sign in there or clear that browser."
  );
  return {
    title: res.left === 0 ? "Your saved game is deleted" : "Part of it is deleted",
    gone,
    stays,
    next: res.out ? "You are signed out. If you sign in again, you start with an empty game." : "",
  };
}
