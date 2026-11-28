/* ============================================================================
   SLAM the Game: account/livecoach.js
   PURPOSE     The part of the coach page (coach.html) for Live Session Mode. One card with the button
               "Start session with a new client": it makes a one-time invite link (the coach types only
               the client's name, and that is optional), shows the link to copy or to put in an email,
               and lists each invite with its state (sent, signed up, in the room), the newest first.
               In the card of each client of the roster: the button "Start session".
               While the switch is off (liveflag.js) the card says "Coming soon" and nothing else runs.
   INPUT       The Supabase client of the coach page (CP.sb), CP.session, CPX.demo. The functions of
               the database file supabase/migrations/20261125210000_live_sessions.sql.
   OUTPUT      Functions that only work out values: lcMail, lcDemoRows. Also lcDemoSet. Parts of functions in
               coachpage.js: lcLoad (cpLoad), lcCard (cpDraw), lcClientRow (cpClientCard), lcClick
               (cpClick).
   DEPENDS ON  core/report.js, core/soon.js (soonPart), account/liveflag.js, account/live.js,
               account/liveio.js, account/coachpage.js (CP, cpEsc, cpDay, cpDraw), account/roles.js
               (roAudit). Only coach.html loads this file.
   RULES       In the demo nothing is read from the database and nothing is written: the list shows
               made-up invites, each with "(sample)". Before the database file has run, the card says
               what waits. One line of the audit log for each invite.
   STATE       LC.
   ========================================================================= */
const LC = {
  db: null,
  demo: false,
  invites: null,
  sessions: [],
  wait: false,
  open: false,
  made: null,
  msg: "",
  name: "",
};
const LC_NAME = "slam_live_coach_name";
/* The email with the link, for the coach's own mail app. No address: the coach picks the person. */
function lcMail(clientName, url, coachName) {
  const body =
    "Hi" +
    (clientName ? " " + clientName : "") +
    ",\n\nThis is your link for our session. It makes your account in one step: your name, your email and a password.\n\n" +
    url +
    "\n\n" +
    LV_JOIN_LINE +
    "\n\nThe link works one time, for " +
    LV_INVITE_DAYS +
    " days. Our session is written down as text only. No audio is saved.\n\n" +
    (coachName || "Your coach");
  return (
    "mailto:?subject=" + encodeURIComponent("Your link for our SLAM session") + "&body=" + encodeURIComponent(body)
  );
}
/* The made-up invites of the demo: one in each state. */
function lcDemoRows(now) {
  const d = 864e5,
    inv = (id, name, ago, used) => ({
      id,
      token: "",
      client_name: name,
      made_at: now - ago,
      expires_at: now - ago + LV_INVITE_DAYS * d,
      used_at: used ? now - ago / 2 : null,
      used_by: used ? id + "u" : null,
    });
  return {
    invites: [
      inv("d1", "Jo (sample)", 36e5, true),
      inv("d2", "Riley (sample)", d, true),
      inv("d3", "Sam (sample)", 2 * d, false),
    ],
    sessions: [Object.assign(lvRoomNew("ds1", "me", "d1u", now - 6e5), { invite: "d1", client_seen_at: now - 5000 })],
  };
}
function lcDemo() {
  return typeof CPX !== "undefined" && CPX.demo;
}
/* Going into the demo puts the made-up invites in the list. Going out of it takes them away. */
function lcDemoSet() {
  if (lcDemo() && !LC.demo) {
    const d = lcDemoRows(Date.now());
    Object.assign(LC, { demo: true, invites: d.invites, sessions: d.sessions, wait: false, made: null, open: false });
  } else if (!lcDemo() && LC.demo)
    Object.assign(LC, { demo: false, invites: null, sessions: [], made: null, open: false });
}
function lcCoachName() {
  let typed = "";
  try {
    typed = localStorage.getItem(LC_NAME) || "";
  } catch (e) {
    report(e, "livecoach.js: lcCoachName");
  }
  return lvCoachName(typed, CP.session && CP.session.user ? CP.session.user.email : "");
}
/* Part of cpLoad() in coachpage.js. Reads the coach's invites and sessions. */
async function lcLoad() {
  if (!liveOn()) return;
  if (lcDemo()) return lcDemoSet(); /* the demo reads nothing */
  if (!CP.sb || !CP.session) return;
  LC.db = LC.db || lioDb(CP.sb);
  const a = await LC.db.invites(),
    b = await LC.db.sessions();
  LC.wait = !!(a.wait || b.wait);
  LC.invites = a.ok ? a.data || [] : [];
  LC.sessions = b.ok ? b.data || [] : [];
  if (a.net || b.net) LC.msg = "The invites did not load. Check your internet, then tap Check again.";
}
/* Part of cpDraw() in coachpage.js. The card of Live Session Mode. */
function lcCard() {
  if (!liveOn())
    return `<div class="card">${soonPart("Live sessions: Start session with a new client, and Start session", "A coaching call that fills in your client's profile while you talk. This part is being built.")}</div>`;
  lcDemoSet();
  const page = location.origin + location.pathname,
    rows = lvInviteRows(LC.invites || [], LC.sessions, Date.now()),
    wait = LC.wait
      ? `<p class="flag">Live sessions wait for one database file (supabase/migrations/20261125210000_live_sessions.sql). Run it one time in the Supabase SQL Editor. Until then no link can be made.</p>`
      : "",
    made = LC.made
      ? `<div class="who"><b>The link${LC.made.client_name ? " for " + cpEsc(LC.made.client_name) : ""}</b><div class="lclink">${cpEsc(lvInviteUrl(page, LC.made.token))}</div><div class="row"><button class="primary" data-a="lccopy" data-v="${cpEsc(LC.made.token)}">Copy the link</button><button data-a="lcmail" data-v="${cpEsc(LC.made.token)}" data-k="${cpEsc(LC.made.client_name || "")}">Write it in my mail app</button></div><p class="muted">It works one time, for ${LV_INVITE_DAYS} days. It opens "${cpEsc(lcCoachName())} invited you to SLAM": name, email and password only.</p></div>`
      : "",
    form = LC.open
      ? `<div class="who"><div><label for="lcn">Their first name (optional)</label><input id="lcn" type="text" autocomplete="off" value="${cpEsc(LC.name)}"></div><div><label for="lcme">Your name, as your client sees it</label><input id="lcme" type="text" autocomplete="off" value="${cpEsc(lcCoachName())}"></div><button class="primary wide" data-a="lcmake">Make the link</button></div>`
      : `<button class="${LC.made ? "" : "primary "}wide" data-a="lcnew"${LC.wait ? " disabled" : ""}>${LC.made ? "Make another link" : "Start session with a new client"}</button>` +
        (LC.wait ? `<p class="muted">This button works after the database file has run.</p>` : ""),
    list = rows.length
      ? `<div class="who"><b>Your invites</b>${rows
          .map(r => {
            const s = (LC.sessions || []).find(
              x => x.state !== "ended" && (x.invite === r.inv.id || (r.inv.used_by && x.client === r.inv.used_by))
            );
            return `<div class="row lcrow"><span><b>${cpEsc(r.name)}</b> <span class="pill">${r.word}</span><div class="muted">Made ${cpDay(r.inv.made_at)}</div></span>${
              r.state === "sent" && r.inv.token
                ? `<button data-a="lccopy" data-v="${cpEsc(r.inv.token)}">Copy the link</button>`
                : s && !lcDemo()
                  ? `<a class="btn" href="./session.html?s=${encodeURIComponent(s.id)}">Open the room <i class=chev aria-hidden=true></i></a>`
                  : ""
            }</div>`;
          })
          .join("")}</div>`
      : LC.invites
        ? `<p class="muted">No invite yet.</p>`
        : "";
  return (
    `<div class="card"><b>Live sessions</b><p class="muted">One Start, and your client's profile fills in while you talk. Text only: no audio is saved.</p>` +
    wait +
    (LC.msg ? `<p class="ok">${cpEsc(LC.msg)}</p>` : "") +
    made +
    form +
    `<p class="muted">${LV_BEST_LINE}</p>` +
    list +
    `</div>`
  );
}
/* Part of cpClientCard() in coachpage.js. "Start session" for a person of the roster. */
function lcClientRow(cl) {
  if (!liveOn()) return "";
  return `<div class="who"><b>Live session</b><button class="wide" data-a="lcstart" data-o="${cl.owner}"${LC.wait ? " disabled" : ""}>Start session</button><p class="muted">${LC.wait ? "This button works after the database file of Live sessions has run." : "It opens the room. Your client opens the game's session page, and both of you tap OK before Start."}</p></div>`;
}
/* Part of cpClick() in coachpage.js. Gives true when the tap was one of this file. */
async function lcClick(t) {
  const a = t.dataset.a;
  if (!/^lc/.test(a || "")) return false;
  if (!liveOn()) return true;
  LC.msg = "";
  const page = location.origin + location.pathname,
    demoSay = () => {
      LC.msg = "This is the demo: no link is made and no room opens. Leave the demo to invite a real client.";
      cpDraw();
      return true;
    };
  if (a === "lcnew") {
    if (lcDemo()) return demoSay();
    LC.open = true;
    LC.name = "";
    cpDraw();
    const el = document.getElementById("lcn");
    if (el) el.focus();
    return true;
  }
  if (a === "lcmake") {
    const nm = ((document.getElementById("lcn") || {}).value || "").trim().slice(0, 60),
      me = ((document.getElementById("lcme") || {}).value || "").trim().slice(0, 60);
    try {
      if (me) localStorage.setItem(LC_NAME, me);
    } catch (e) {
      report(e, "livecoach.js: lcmake");
    }
    LC.name = nm;
    const r = await LC.db.inviteMake(nm, me || lcCoachName());
    if (r.ok && r.data) {
      LC.made = r.data;
      LC.open = false;
      roAudit(CP.sb, "invite", null, "live session link" + (nm ? " for " + nm : ""));
      await lcLoad();
      LC.msg = "The link is ready. Copy it, or put it in an email.";
    } else if (r.wait) {
      LC.wait = true;
      LC.open = false;
    } else
      LC.msg = r.net
        ? "The link was not made: the server could not be reached. Check your internet, then tap Make the link again."
        : "The link was not made. This button is for an account with the coach role.";
    cpDraw();
    return true;
  }
  if (a === "lccopy") {
    const url = lvInviteUrl(page, t.dataset.v);
    try {
      await navigator.clipboard.writeText(url);
      LC.msg = "Copied. Paste it in a message to your client.";
    } catch (e) {
      report(e, "livecoach.js: lccopy");
      LC.msg = "The browser did not copy it. Press and hold the link above, then copy.";
      LC.made = LC.made || (LC.invites || []).find(x => x.token === t.dataset.v) || null;
    }
    cpDraw();
    return true;
  }
  if (a === "lcmail") {
    location.href = lcMail(t.dataset.k, lvInviteUrl(page, t.dataset.v), lcCoachName());
    return true;
  }
  if (a === "lcstart") {
    if (lcDemo()) return demoSay();
    const r = await LC.db.sessionOpen(t.dataset.o);
    if (r.ok && r.data) {
      location.href = "./session.html?s=" + encodeURIComponent(r.data.id);
      return true;
    }
    if (r.wait) LC.wait = true;
    else
      CP.msg = r.net
        ? "The room did not open: the server could not be reached. Check your internet, then tap Start session again."
        : "The room did not open for this person. They are on your roster when they share their game with you.";
    cpDraw();
    return true;
  }
  return true;
}
