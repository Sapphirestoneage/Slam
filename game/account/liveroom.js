/* ============================================================================
   SLAM the Game: account/liveroom.js
   PURPOSE     The screens of the session page (session.html) of Live Session Mode. (1) The invite
               screen: a link with a token opens "<coach> invited you to SLAM", with name, email and
               password only. (2) A link that cannot be used says so in calm words. (3) The room: the
               consent text with one OK for each side, the microphone step, the headphones question,
               Start (the coach, one time), the pill "Listening 23:14" with the two lights You and
               Them, Pause and End. The body of the room is plain for now.
   INPUT       The address of the page: ?invite=token (a new client), ?s=id (the coach opens a room),
               ?sim=coach or ?sim=client (a made-up session on one device). The Supabase client. The
               taps (data-a) and the one form (sign up or sign in).
   OUTPUT      Functions that give HTML: lrSoon, lrInviteHTML, lrDeadHTML, lrSignInHTML, lrNoneHTML,
               lrWaitHTML, lrLights, lrLobbyHTML, lrPlainBody, lrControls, lrEndedHTML, lrRoomHTML.
               Functions of the page: lrBoot, lrDraw, lrClick, lrSubmit, lrRoom, lrSim.
   DEPENDS ON  core/report.js, core/soon.js (soonPart), account/supa.js (SUPA_URL, SUPA_KEY,
               suShareLine, suForgotHTML), account/trust.js (tuAuth, tuResend, tuReset, tuGateFoot), account/liveflag.js,
               account/live.js, account/liveio.js, account/livesim.js. Only session.html loads this file.
   PARTS FOR LATER  Three named parts replace the plain body when a later file defines them. Each one gets
               the room controller R (lioRoom in liveio.js) and gives HTML:
                 livePartCoach(R)   the coach's screen during the call (Part 6: profile and next question)
                 livePartClient(R)  the client's calm screen during the call (Part 6)
                 livePartEnded(R)   the screen after End (Part 7: the review)
               A later file adds its taps with livePartClick(a, t, R): it gives true when it took the tap.
   RULES       With the switch off (liveflag.js) the page shows "Coming soon" and does nothing else: no
               sign-in, no database, no channel, no microphone. During the call there are two things to
               press: Pause and End (and Reconnect, only when listening stopped). No red: a stopped
               microphone is a plain outline with the word "Stopped". The room is drawn again only when
               what it shows changed, so a tap is never lost; the clock and the faint words change in
               place. The sign-up form is built once and is not drawn again while a person types.
   STATE       LR.
   ========================================================================= */
const LR = {
  sb: null,
  db: null,
  user: null,
  tok: "",
  inv: null,
  mode: "load",
  form: "new",
  msg: "",
  again: false,
  em: "",
  R: null,
  side: "",
  ending: false,
  last: "",
  tick: null,
  sim: "",
  coachName: "",
};
const lrEsc = s =>
  String(s == null ? "" : s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]);
const lrHome = () => (LR.side === "coach" ? "./coach.html" : "./");
const lrBackLink = () =>
  `<div class="row"><a class="btn" href="${lrHome()}">‹ ${LR.side === "coach" ? "Back to the coach page" : "Back to the game"}</a></div>`;

/* ---------- HTML only ---------- */
/* The switch is off: one calm card, and the way back. */
function lrSoon() {
  return (
    `<div class="row"><a class="btn" href="./">‹ Back to the game</a></div><h1>Live sessions</h1>` +
    `<div class="card">${soonPart("A coaching call that fills in your profile", "This part is being built. Nothing of yours changed, and the game works as before.")}</div>`
  );
}
/* The invite screen: name, email, password. Nothing else, because the call fills in the rest. */
function lrInviteHTML(inv, form, em) {
  const coach = (inv && inv.coach_name) || "Your coach",
    name = (inv && inv.client_name) || "";
  if (form === "in")
    return `<h1>Sign in to join your session</h1><form class="card" id="lrf" novalidate>
 <div><label for="lre">Email</label><input id="lre" type="email" autocomplete="email" inputmode="email" value="${lrEsc(em)}" required></div>
 <div><label for="lrp">Password</label><input id="lrp" type="password" autocomplete="current-password" required></div>
 <button class="primary wide" type="submit">Sign in and join</button>
 ${typeof suForgotHTML === "function" ? suForgotHTML(typeof EMAIL_READY !== "undefined" && EMAIL_READY).replace("data-forgot", 'data-a="lrforgot"') : ""}
 <button type="button" class="wide" data-a="lrform" data-v="new">I'm new. Create my account</button>
 <div class="msg" id="lrmsg" role="status"></div></form>`;
  return `<h1>${lrEsc(coach)} invited you to SLAM</h1><p class="muted">Three boxes, and you are in. The call fills in the rest.</p><form class="card" id="lrf" novalidate>
 <div><label for="lrn">Your first name</label><input id="lrn" type="text" autocomplete="given-name" value="${lrEsc(name)}" required></div>
 <div><label for="lre">Email</label><input id="lre" type="email" autocomplete="email" inputmode="email" value="${lrEsc(em)}" required></div>
 <div><label for="lrp">Password</label><input id="lrp" type="password" autocomplete="new-password" required><div class="hint">At least 6 letters or numbers.</div></div>
 <button class="primary wide" type="submit">Create my account and join</button>
 <button type="button" class="wide" data-a="lrform" data-v="in">I already have an account. Sign in</button>
 <div class="msg" id="lrmsg" role="status"></div>
 <p class="note"><b>${LV_JOIN_LINE}</b></p>
 <p class="muted">${typeof suShareLine === "function" ? suShareLine(true) : ""}</p>
 <p class="muted">You are joining as ${lrEsc(coach)}'s coaching client. The person who runs SLAM can view accounts for safety and support.</p>
 ${typeof tuGateFoot === "function" ? tuGateFoot() : ""}</form>`;
}
/* A link that cannot be used: what is true, and one thing to do. */
function lrDeadHTML(state, coachName, signedIn) {
  const s = lvInviteSays(state, coachName);
  return (
    `<h1>${lrEsc(s.title)}</h1><div class="card"><p>${lrEsc(s.line)}</p>` +
    (s.ask ? `<p class="note"><b>${lrEsc(s.ask)}.</b> A new link takes your coach one tap.</p>` : "") +
    (signedIn
      ? `<button class="wide" data-a="lrmine">Look for my session</button>`
      : `<button class="wide" data-a="lrform" data-v="in">I already have an account. Sign in</button>`) +
    `<a class="btn" href="./">‹ Back to the game</a></div>`
  );
}
/* No invite in the address and nobody signed in. */
function lrSignInHTML(em) {
  return (
    lrInviteHTML(null, "in", em).replace(
      `<button type="button" class="wide" data-a="lrform" data-v="new">I'm new. Create my account</button>`,
      ""
    ) +
    `<p class="muted">New here? Open the invite link from your coach. It makes your account.</p><div class="row"><a class="btn" href="./">‹ Back to the game</a></div>`
  );
}
/* Signed in, and no session is open for this account. */
function lrNoneHTML(msg) {
  return `<h1>No session is open yet</h1><div class="card"><p>${lrEsc(msg || "Your coach opens the session. When they do, this page takes you into the room.")}</p><button class="primary wide" data-a="lrmine">Check again</button><a class="btn" href="./">‹ Back to the game</a></div>`;
}
/* The database file has not run yet. */
function lrWaitHTML() {
  return `<h1>Live sessions</h1><div class="card"><p>This part waits for one database file (supabase/migrations/20261125210000_live_sessions.sql). The person who runs SLAM runs it one time. Nothing of yours changed.</p><button class="wide" data-a="lrreload">Check again</button><a class="btn" href="./">‹ Back to the game</a></div>`;
}
/* The pill and the two lights. */
function lrLights(R, now) {
  const mine = lvLight(R.mic),
    other = lvOther(R.side),
    there = R.here[other] || lvHere(R.room, other, now),
    theirs =
      R.room[other + "_listens"] === false
        ? { look: "outline", word: "Can't listen" }
        : !there
          ? { look: "off", word: "Not in the room" }
          : lvLight({ status: R.their.status }),
    one = (who, l) => `<span class="light ${l.look}"><i aria-hidden="true"></i>${who}: <b>${l.word}</b></span>`;
  return `<div class="top"><span class="pillbig ${lvStage(R.room)}" id="lrpill">${lvPill(R.room, now)}</span><span class="lights">${one("You", mine)}${one("Them", theirs)}</span></div>`;
}
/* Before Start: the consent, the microphone, the headphones, and who is still to tap. */
function lrLobbyHTML(R, now) {
  const me = R.side,
    other = lvOther(me),
    ok = lvOk(R.room, me),
    hp = R.room[me + "_headphones"],
    there = R.here[other] || lvHere(R.room, other, now),
    can = lvCanStart(R.room, me),
    strong = lvEchoSet(R.room) === LV_ECHO.strong;
  return (
    `<div class="card"><p class="muted">${lvWho(other, me)} is ${there ? "in the room" : "not in the room yet"}.</p></div>` +
    `<div class="card"><h2>1. Before you start</h2><p>${LV_CONSENT}</p><p class="muted">${LV_CONSENT_MORE} <a href="./privacy.html#live" target="_blank" rel="noopener">What happens to the words</a></p>` +
    (ok ? `<p class="done">You tapped OK.</p>` : `<button class="primary wide" data-a="lrok">OK</button>`) +
    `<p class="muted" id="lrwho">${lvWaitLine(R.room, me)}</p></div>` +
    `<div class="card"><h2>2. Microphone</h2>` +
    (R.mic.can
      ? (R.ready === "yes"
          ? `<p class="done">The microphone is ready.</p>`
          : `<p class="muted">The browser asks one time if this page may use the microphone. It hears words only: no audio is saved.</p><button class="wide" data-a="lrmic">Allow the microphone</button>`) +
        (R.ready === "no" ? `<p class="note">${lvStopLine(R.mic)}</p>` : "")
      : `<p class="note">${lvFallbackLine(Object.assign({}, R.room, { [me + "_listens"]: false }), me)}</p>`) +
    `</div>` +
    `<div class="card"><h2>3. Using headphones?</h2><div class="chips"><button class="chip ${hp === true ? "on" : ""}" data-a="lrhp" data-v="1" aria-pressed="${hp === true}">Yes</button><button class="chip ${hp === false ? "on" : ""}" data-a="lrhp" data-v="0" aria-pressed="${hp === false}">No</button></div>` +
    `<p class="muted">${strong ? "A side has no headphones, so the stronger echo filter is on: a sentence that both devices hear is kept one time." : "With headphones, each device hears one voice."}</p></div>` +
    (me === "coach" ? lrStartHTML(R, ok, can) : lrClientReadyHTML(R))
  );
}
/* The coach's Start. It waits until the client finished the microphone and headphones steps, so those steps do
   not vanish from the client's screen before they answer. While they wait, the coach can go on with their
   own side only. */
function lrStartHTML(R, ok, can) {
  const wait = lvBothOk(R.room) ? lvClientWait(R.room) : "",
    solo = !!wait && lvCanStart(R.room, "coach", true);
  return (
    `<div class="card"><button class="${ok ? "primary " : ""}wide big" data-a="lrstart"${can ? "" : " disabled"}>Start</button>` +
    `<p class="muted">${
      can
        ? "One Start for the whole call. Both devices listen until End."
        : wait
          ? wait + " Start works when they are done."
          : "Start works when both of you tapped OK. " + lvWaitLine(R.room, "coach")
    }</p>` +
    (solo
      ? `<button class="wide" data-a="lrstartsolo">Start with my side only</button><p class="muted tiny">Their screen moves on to the call. If their browser can listen, it asks for the microphone by itself.</p>`
      : "") +
    `</div>`
  );
}
/* The client's card under the steps: what is still to do on this side, then that the coach presses Start. */
function lrClientReadyHTML(R) {
  const room = R.room,
    left = !lvOk(room, "client")
      ? "Tap OK above."
      : room.client_mic == null && room.client_listens !== false
        ? "Tap Allow the microphone above."
        : room.client_headphones == null
          ? "Answer Using headphones? above."
          : "";
  return `<div class="card"><p>${
    left
      ? left + " Then your coach presses Start."
      : lvBothOk(room)
        ? "All set. Your coach presses Start, and this screen changes by itself."
        : "All set on your side. After your coach taps OK, they press Start."
  }</p></div>`;
}
/* The plain body during the call: how many lines, and the last three. Part 6 replaces it. */
function lrPlainBody(R) {
  const last = R.lines.slice(-3);
  return (
    `<div class="card"><h2>Heard so far: ${R.lines.length} ${R.lines.length === 1 ? "line" : "lines"}</h2>` +
    (last.length
      ? `<ul class="heard">${last.map(l => `<li><b>${lvLabel(l.side, R.side)}</b> ${lrEsc(l.text)}</li>`).join("")}</ul>`
      : `<p class="muted">The words show here as each sentence ends.</p>`) +
    `<p class="soft" id="lrsoft" aria-hidden="true"></p></div>`
  );
}
/* Pause and End. And Reconnect, only when listening stopped on this device. */
function lrControls(R, ending) {
  const st = R.room.state;
  if (ending)
    return `<div class="card"><p><b>End the session for both of you?</b> Listening stops on both devices. The words heard so far are kept.</p><div class="ctl"><button class="big" data-a="lrendyes">Yes, end the session</button><button class="big primary" data-a="lrendno">Keep going</button></div></div>`;
  return (
    (R.mic.status === "stopped"
      ? `<div class="card"><p class="note">${lvStopLine(R.mic)}</p><button class="wide big" data-a="lrre">Reconnect</button></div>`
      : "") +
    `<div class="ctl"><button class="big" data-a="${st === "paused" ? "lrresume" : "lrpause"}">${st === "paused" ? "Resume" : "Pause"}</button><button class="big" data-a="lrend">End</button></div>`
  );
}
/* After End, plain. Part 7 replaces it with the review. */
function lrEndedHTML(R) {
  const n = R.buf.lines.length;
  return (
    `<div class="card"><h2>The session has ended</h2><p>${R.forgot ? "The words of this call are deleted. No audio was ever saved." : `Heard ${R.lines.length} ${R.lines.length === 1 ? "line" : "lines"}, as text. No audio was saved.`}</p>` +
    (R.forgot
      ? ""
      : n
        ? `<p class="note">${n} ${n === 1 ? "line waits" : "lines wait"} on this device. Keep this page open: ${n === 1 ? "it goes" : "they go"} to your account as soon as the internet is back.</p>`
        : `<p class="done">Each line is saved.</p>`) +
    `</div>` +
    lrBackLink()
  );
}
/* The whole room. */
function lrRoomHTML(R, now, ending) {
  if (R.wait) return lrWaitHTML();
  if (!R.room) return `<p class="muted">${lrEsc(R.msg || "Opening the room…")}</p>`;
  const st = lvStage(R.room),
    fall = lvFallbackLine(R.room, R.side),
    part = (name, plain) =>
      typeof window !== "undefined" && typeof window[name] === "function" ? window[name](R) : plain(R);
  return (
    (LR.sim
      ? `<p class="note">A made-up session: a script plays the other side. Nothing is saved and no microphone is used.</p>`
      : "") +
    lrLights(R, now) +
    (fall && st !== "consent" && st !== "ready" ? `<p class="note">${fall}</p>` : "") +
    (!R.link && st !== "ended"
      ? `<p class="note">The live link between the two devices is not on yet. Each side still saves its own lines, and this screen checks again each 30 seconds.</p>`
      : "") +
    (R.msg ? `<p class="note">${lrEsc(R.msg)}</p>` : "") +
    (st === "consent" || st === "ready"
      ? lrBackLink() + lrLobbyHTML(R, now)
      : st === "ended"
        ? part("livePartEnded", lrEndedHTML)
        : part(R.side === "coach" ? "livePartCoach" : "livePartClient", lrPlainBody) + lrControls(R, ending))
  );
}

/* ---------- the page ---------- */
function lrPut(html) {
  const el = document.getElementById("app");
  if (el) el.innerHTML = html;
  LR.last = html;
}
function lrSay(msg, html) {
  const el = document.getElementById("lrmsg");
  if (el) el.innerHTML = html ? msg : lrEsc(msg);
}
/* Draw the screen of the mode. The room is drawn only when its HTML changed. */
function lrDraw() {
  if (LR.mode === "room" && LR.R) {
    const h = lrRoomHTML(LR.R, Date.now(), LR.ending).replace(/(id="lrpill">)[^<]*/, "$1");
    if (h !== LR.last) lrPut(h);
    lrTick();
    const soft = document.getElementById("lrsoft");
    if (soft) soft.textContent = LR.R.interim || "";
    return;
  }
  if (LR.mode === "soon") return lrPut(lrSoon());
  if (LR.mode === "wait") return lrPut(lrWaitHTML());
  if (LR.mode === "invite") return lrPut(lrInviteHTML(LR.inv, LR.form, LR.em));
  if (LR.mode === "dead")
    return lrPut(
      LR.form === "in" && !LR.user
        ? lrInviteHTML(LR.inv, "in", LR.em)
        : lrDeadHTML(LR.inv && LR.inv.state, LR.inv && LR.inv.coach_name, !!LR.user)
    );
  if (LR.mode === "signin") return lrPut(lrSignInHTML(LR.em));
  if (LR.mode === "none") return lrPut(lrNoneHTML(LR.msg));
  lrPut(`<p class="muted">${lrEsc(LR.msg || "One moment…")}</p>`);
}
/* The clock of the pill changes in place, each second. */
function lrTick() {
  const el = document.getElementById("lrpill");
  if (el && LR.R && LR.R.room) el.textContent = lvPill(LR.R.room, LR.sim ? LR.R.now() : Date.now());
}
/* Open the room of one session for the signed-in person. */
async function lrRoom(sid) {
  const r = await LR.db.session(sid);
  if (r.wait) {
    LR.mode = "wait";
    return lrDraw();
  }
  if (!r.ok || !r.data) {
    LR.mode = "none";
    LR.msg = r.net ? "Could not reach the server. Check your internet, then tap Check again." : "";
    return lrDraw();
  }
  LR.side = r.data.coach === LR.user.id ? "coach" : "client";
  LR.R = lioRoom({
    sid,
    side: LR.side,
    db: LR.db,
    chan: lioChan(LR.sb, sid, LR.side),
    speech: lioSpeech(window),
    wake: lioWake(navigator, document),
    store: lioStore(localStorage),
    clock: lioClock(),
    id: lioId,
    change: lrDraw,
  });
  LR.R.now = () => Date.now();
  /* livegame.js: the client's device loads the client's own saved game, fills it and saves it; the coach's
     device reads the client's shared game (and saves the review into it). Then the screens of livescreen.js. */
  if (typeof lgAttach === "function")
    lgAttach(LR.R, {
      sb: LR.sb,
      uid: LR.user.id,
      name: lrName(),
      owner: r.data.client,
      store: lioStore(localStorage),
      clock: lioClock(),
      change: lrDraw,
    });
  else if (typeof lfAttach === "function") lfAttach(LR.R, { clock: lioClock() });
  LR.mode = "room";
  LR.ending = false;
  await LR.R.join();
  lrDraw();
  if (!LR.tick) LR.tick = setInterval(lrTick, 1000);
}
/* The first name of the client: typed on the invite screen (on this device, and in the account). */
function lrName() {
  let n = "";
  try {
    n = localStorage.getItem("slam_live_name") || "";
  } catch (e) {
    report(e, "liveroom.js: lrName");
  }
  return n || (LR.user && LR.user.user_metadata && LR.user.user_metadata.name) || "";
}
/* Look for the open session of the signed-in person. */
async function lrMine() {
  const r = await LR.db.mine();
  if (r.wait) LR.mode = "wait";
  else if (r.ok && r.data) return lrRoom(r.data.id);
  else {
    LR.mode = "none";
    LR.msg = r.net ? "Could not reach the server. Check your internet, then tap Check again." : "";
  }
  lrDraw();
}
/* Use the invite that waits on this device, for the signed-in person, and open the room. */
async function lrUse() {
  const r = await LR.db.inviteUse(LR.tok);
  if (r.wait) {
    LR.mode = "wait";
    return lrDraw();
  }
  if (!r.ok) {
    LR.mode = "none";
    LR.msg = "Could not reach the server. Check your internet, then tap Check again.";
    return lrDraw();
  }
  if (r.data.state === "ok") {
    liveTokenDone(localStorage);
    return lrRoom(r.data.session.id);
  }
  liveTokenDone(localStorage);
  LR.tok = "";
  if (r.data.state === "own") {
    location.href = "./coach.html";
    return;
  }
  LR.inv = Object.assign({}, LR.inv, { state: r.data.state });
  LR.mode = "dead";
  lrDraw();
}
/* The page loads. With the switch off: the card, and nothing else. */
async function lrBoot() {
  if (!liveOn()) {
    LR.mode = "soon";
    return lrDraw();
  }
  const q = new URLSearchParams(location.search);
  if (q.get("sim") === "coach" || q.get("sim") === "client") return lrSim(q.get("sim"));
  LR.tok = liveTokenKeep(location.search, localStorage) || liveToken(localStorage);
  LR.mode = "load";
  lrDraw();
  LR.sb = window.supabase.createClient(SUPA_URL, SUPA_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  LR.db = lioDb(LR.sb);
  const s = await LR.sb.auth.getSession();
  LR.user = (s.data && s.data.session && s.data.session.user) || null;
  if (!LR.tok && LR.user && LR.user.user_metadata) LR.tok = liveTokenClean(LR.user.user_metadata.live_invite);
  if (q.get("s") && LR.user) return lrRoom(q.get("s"));
  if (LR.tok) {
    const c = await LR.db.inviteCheck(LR.tok);
    if (c.wait) {
      LR.mode = "wait";
      return lrDraw();
    }
    LR.inv = c.ok && c.data ? c.data : { state: c.net ? "net" : "none" };
    if (LR.inv.state === "net") {
      LR.mode = "none";
      LR.msg = "Could not reach the server. Check your internet, then tap Check again.";
      return lrDraw();
    }
    if (LR.user && (LR.inv.state === "open" || LR.inv.state === "mine")) return lrUse();
    if (LR.inv.state === "open") LR.mode = "invite";
    else {
      /* the link cannot be used: it leaves this device, and a sign-in from here looks for the person's session */
      LR.mode = "dead";
      LR.tok = "";
      liveTokenDone(localStorage);
    }
    return lrDraw();
  }
  if (LR.user) return lrMine();
  LR.mode = "signin";
  lrDraw();
}
/* The one form: create the account, or sign in. Each answer of the sign-in service comes back in calm
   words from tuAuth (trust.js). */
async function lrSubmit(form) {
  const val = id => ((document.getElementById(id) || {}).value || "").trim(),
    name = val("lrn"),
    em = val("lre"),
    pw = (document.getElementById("lrp") || {}).value || "",
    isNew = LR.mode === "invite" && LR.form === "new";
  LR.em = em;
  if (!em || !pw || (isNew && !name)) return lrSay(isNew ? "Fill in the three boxes." : "Fill in both boxes.");
  const btn = form.querySelector("button[type=submit]"),
    label = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "One moment…";
  }
  const r = await tuAuth(
    LR.sb,
    isNew ? "new" : "in",
    em,
    pw,
    location.origin + location.pathname,
    isNew ? { name: name.slice(0, 60), live_invite: LR.tok } : null
  );
  if (isNew && (r.state === "in" || r.state === "confirm")) {
    /* the same mark as the link ?coach=1 (supa.js): the first save of this account has Share with my coach on */
    lioStore(localStorage).set("su_coach", "1");
    lioStore(localStorage).set("slam_live_name", name.slice(0, 60));
  }
  if (r.state === "in") {
    LR.user = r.session.user;
    if (LR.tok) return lrUse();
    return lrMine();
  }
  if (btn) {
    btn.disabled = false;
    btn.textContent = label;
  }
  if (r.state === "confirm") {
    lrSay(
      r.msg +
        `<div style="margin-top:8px">The link in the email brings you back here, and your invite is kept on this device.</div><button type="button" class="wide" data-a="lragain" style="margin-top:8px">Send the email again</button>`,
      true
    );
    return;
  }
  lrSay(
    r.kind === "exists" ? 'That email already has an account. Tap "I already have an account. Sign in" below.' : r.msg,
    false
  );
}
async function lrClick(t) {
  const a = t.dataset.a,
    R = LR.R;
  if (typeof livePartClick === "function" && R && (await livePartClick(a, t, R))) return;
  if (a === "lrform") {
    LR.em = ((document.getElementById("lre") || {}).value || "").trim();
    LR.form = t.dataset.v;
    return lrDraw();
  }
  if (a === "lragain") {
    t.disabled = true;
    const r = await tuResend(LR.sb, LR.em, location.origin + location.pathname);
    return lrSay(r.msg, true);
  }
  if (a === "lrforgot") {
    LR.em = ((document.getElementById("lre") || {}).value || "").trim();
    if (!LR.em) return lrSay("Type your email first, then tap Forgot my password.");
    return lrSay((await tuReset(LR.sb, LR.em, location.origin + location.pathname)).msg);
  }
  if (a === "lrreload") return location.reload();
  if (a === "lrmine") {
    LR.mode = "load";
    lrDraw();
    return lrMine();
  }
  if (!R) return;
  if (a === "lrok") await R.act("ok");
  else if (a === "lrhp") await R.act("headphones", t.dataset.v === "1");
  else if (a === "lrmic") R.micCheck();
  else if (a === "lrstart") await R.act("start");
  else if (a === "lrstartsolo") await R.act("start", true);
  else if (a === "lrpause") await R.act("pause");
  else if (a === "lrresume") await R.act("resume");
  else if (a === "lrre") R.reconnect();
  else if (a === "lrend") LR.ending = true;
  else if (a === "lrendno") LR.ending = false;
  else if (a === "lrendyes") {
    LR.ending = false;
    await R.act("end");
  }
  lrDraw();
}
/* "Try the room with a made-up client": one device, a script for the other side, stand-ins for the
   database, the channel and the microphone. Nothing is saved, and nothing is sent. */
async function lrSim(side) {
  const clock = lioClock(),
    db = simDb(clock),
    hub = simHub(clock, 150),
    sb = typeof simSb === "function" && typeof lgAttach === "function" ? simSb(clock) : null;
  if (sb) sb.coaches.c1 = true;
  db.coaches.c1 = true;
  const made = await db.as("c1").inviteMake("Sam (sample)", "Coach (sample)"),
    used = await db.as("u1").inviteUse(made.data.token),
    other = lvOther(side);
  let played = false;
  const P = simPair({
    clock,
    db,
    hub,
    sid: used.data.session.id,
    coach: "c1",
    client: "u1",
    sb,
    name: "Sam (sample)",
    change: R => {
      if (!R || typeof R.act !== "function") return lrDraw(); /* a change of the game of either device */
      if (R.side === side) return lrDraw();
      /* the script of the other side: Start (when it is the coach), then the lines */
      if (R.side === "coach" && lvCanStart(R.room, "coach")) R.act("start");
    },
  });
  LR.sim = side;
  LR.side = side;
  LR.R = P[side].R;
  /* the AI pass of a made-up call answers from a stand-in: nothing is sent (livesim.js, simAi) */
  if (side === "coach" && typeof simAi === "function") LR.R.aiFn = simAi(simAiReply).fn;
  LR.R.now = () => clock.now();
  LR.mode = "room";
  P[side].R.hooks.room.push(room => {
    if (room.state !== "live" || played) return;
    played = true;
    let at = 0;
    (sb && typeof simScriptFill === "function" ? simScriptFill() : simScript()).forEach(l => {
      at += l[0];
      clock.set(() => P[l[1]].speech.say(l[2]), at);
    });
  });
  await P.coach.R.join();
  await P.client.R.join();
  clock.set(() => P[other].R.act("ok"), 1500);
  clock.set(() => P[other].R.act("headphones", true), 2500);
  clock.set(() => P[other].R.micCheck(), 3500); /* the other side's microphone step (a stand-in microphone) */
  lrDraw();
  if (!LR.tick) LR.tick = setInterval(lrTick, 1000);
}
