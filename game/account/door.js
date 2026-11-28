/* ============================================================================
   SLAM the Game: account/door.js
   PURPOSE     The front door. A person who arrives from the QR code or a link, with no account on this
               device, sees one landing screen: one promise (your FI number, then how much smaller it
               could be), one big Start button, four outlined doors "Start here" (run CC-1, item 15:
               Start and then one starting point of features/starter.js), Sign in, one trust line (who
               built it), and "What is this?" (closed by default). Start needs no account and no typing: it opens the one opening
               of a new player, What it is / What it could be (features/couldbe.js). The setup by taps
               with the question "Am I okay?" (features/okay.js) comes after it. The game of such a
               visitor stays on this device until the visitor makes an account.
   INPUT       The browser storage: slam_guest ("1" = tapped Start, "2" = has a game on this device),
               su_uid (the account that the copy on this device belongs to), the sign-in token of
               Supabase. The address of the page (a sign-in link that comes back from an email).
   OUTPUT      Functions: doorGuest, doorHasGame, doorHtml, doorFireBtn, doorShow, doorHide,
               doorGate, doorFromDemo, doorStart, doorBegin, doorSignIn, doorBack, doorGateBack, doorSigned, doorKept,
               doorEarly, doorJustSaved, doorRedraw, doorSitRow, doorSitGo. The table DOOR_SITS. The constant DOOR_LINK (the link for the slide and the QR code).
   DEPENDS ON  core/report.js, features/firelink.js (fireBlankButton), account/trust.js (TRUST_LINE,
               TRUST_PAGE: the advice line and the privacy page). index.html loads both before this
               file.
   USES LATER  Names from files that the browser loads later. Behind a typeof test, thus safe while the
               page loads: account/supa.js (suGate), screens/ui.js (ACT, G, KEY, W, fresh, openSetup,
               drawSheet, render), features/couldbe.js (cbStart: the one opening of a new player), features/starter.js (sitApply).
   RULES       The button Report is the button of features/fbreport.js (the same class and the same
               action "flag"); fbScreen() there names this screen "front door". One primary button (Start). The landing never shows to a person who is signed in, and
               never to a visitor who already has a game on this device. The address of the page is not
               changed, so link marks such as ?ref= and ?as= stay for the files that read them.
               tools/qr_slam.py makes docs/qr-slam.png from DOOR_LINK; test/launch-link.test.js compares
               the link here, in the tool and in docs/LAUNCH-LINK.md.
   STATE       DOOR (done, want, el, guest, shown, saved, sit).
   ========================================================================= */
const DOOR_LINK = "https://play.stresslessaboutmoney.com/game/";
const DOOR = { done: null, want: "", el: null, guest: false, shown: false, sit: "" };

function doorGet(k) {
  try {
    return localStorage.getItem(k);
  } catch (e) {
    report(e, "door.js: doorGet");
    return null;
  }
}
function doorPut(k, v) {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch (e) {
    report(e, "door.js: doorPut");
  }
}
/* True for a visitor who plays with no account. */
function doorGuest() {
  return DOOR.guest;
}
/* True when a visitor with no account already has a game on this device. */
function doorHasGame() {
  return doorGet("slam_guest") === "2";
}
/* The button to Eli's blank FIRE sheet: the shared button of features/firelink.js, with the look of this screen. */
function doorFireBtn() {
  return typeof fireBlankButton === "function" ? fireBlankButton({ button: "door-sheet", line: "door-tiny" }) : "";
}
/* THE DOORS "START HERE" (run CC-1, item 15). Four outlined buttons under Start. Each one is Start and then one
   starting point of features/starter.js (sitApply). l: the words of the button. sit: the id in SIT_LIST. */
const DOOR_SITS = [
  { id: "fire", l: "FIRE", sit: "nearfi" },
  { id: "debt", l: "In debt", sit: "carddebt" },
  { id: "two", l: "Couple or household", sit: "married" },
  { id: "self", l: "Self-employed", sit: "selfemp" },
];
/* The row of the four doors, as HTML. Part of doorHtml(). */
function doorSitRow() {
  return `<div class="door-sits" data-fid="door:sits"><p class="door-tiny">Or start here. One tap fills in typical numbers as guesses.</p><div class="door-sitg">${DOOR_SITS.map(D => `<button type="button" class="door-sit" data-door="sit" data-sit="${D.id}">${D.l}</button>`).join("")}</div></div>`;
}
/* The tap on one door: Start, and then the starting point. The starting point waits in DOOR.sit until the opening
   is open (doorBegin). */
function doorSitGo(id) {
  const D = DOOR_SITS.find(x => x.id === id);
  DOOR.sit = D ? D.sit : "";
  doorStart();
}
/* The landing screen, as HTML. "wait" is true while the sign-in screen is not ready yet. */
function doorHtml(wait) {
  const css = `#door{position:fixed;inset:0;z-index:99998;background:var(--bg,#0b1630);color:var(--text,#e8eeff);overflow:auto;font-family:inherit}
 #door .door-in{max-width:420px;margin:0 auto;padding:7vh 20px 20px;display:flex;flex-direction:column;gap:14px}
 #door .door-eye{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted,#9fb0dd);margin:0}
 #door h1{font-size:27px;line-height:1.25;margin:0}
 #door .door-q{font-size:16px;line-height:1.4;margin:0;color:var(--muted,#9fb0dd)}
 #door .door-go{width:100%;min-height:64px;padding:14px;border:2px solid var(--a1,#5b8cff);border-radius:14px;background:var(--a1,#5b8cff);color:#fff;font-size:22px;font-weight:800;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.35)}
 #door .door-in2{width:100%;min-height:48px;padding:10px;border-radius:12px;border:2px solid var(--line,#3a55a0);background:transparent;color:inherit;font-size:16px;font-weight:600;cursor:pointer}
 #door .door-sits{display:flex;flex-direction:column;gap:6px}#door .door-sits p{margin:0}
 #door .door-sitg{display:grid;grid-template-columns:1fr 1fr;gap:8px}
 #door .door-sit{min-height:44px;padding:8px 10px;border-radius:12px;border:2px solid var(--line,#3a55a0);background:transparent;color:inherit;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 2px 0 rgba(0,0,0,.25)}
 #door .door-sit:focus-visible{outline:3px solid var(--a3,#8fb0ff);outline-offset:2px}#door .door-sit:active{transform:translateY(1px)}
 @media (max-height:700px){#door .door-in{padding-top:10px;gap:8px}#door h1{font-size:25px}#door .door-sits{gap:4px}}
 #door .door-go:focus-visible,#door .door-in2:focus-visible,#door summary:focus-visible,#door a:focus-visible{outline:3px solid var(--a3,#8fb0ff);outline-offset:2px}
 #door .door-go:active,#door .door-in2:active{transform:translateY(1px)}
 #door details{border:2px solid var(--line,#3a55a0);border-radius:12px;background:var(--panel,#13224a)}
 #door summary{min-height:44px;padding:10px 14px;font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:space-between;list-style:none}
 #door summary::-webkit-details-marker{display:none}#door summary::after{content:"Show";font-size:13px;font-weight:600;color:var(--a3,#8fb0ff);text-decoration:underline}
 #door details[open] summary::after{content:"Hide"}
 #door .door-what{padding:0 14px 14px;display:flex;flex-direction:column;gap:8px;font-size:15px;line-height:1.4}
 #door .door-what p{margin:0}#door .door-tiny{font-size:13px;line-height:1.35;color:var(--muted,#9fb0dd)}
 #door .door-sheet{display:block;text-align:center;min-height:44px;box-sizing:border-box;padding:11px 10px;border-radius:12px;border:2px solid var(--line,#3a55a0);color:inherit;font-size:15px;font-weight:600;text-decoration:none;box-shadow:0 2px 0 rgba(0,0,0,.25)}
 #door .door-link{color:var(--a3,#8fb0ff);text-decoration:underline}
 #door .door-by{margin:0;text-align:center}#door .door-msg{min-height:18px;font-size:14px}#door .door-rep{display:flex;justify-content:flex-end}`;
  return `<style>${css}</style><div class="door-in">
 <p class="door-eye">SLAM the Game</p>
 <h1>See your FI number, then see how much smaller it could be.</h1>
 <p class="door-q">About 2 minutes. All taps. Free.</p>
 <button type="button" class="door-go" data-door="start">Start</button>
 ${doorSitRow()}
 <button type="button" class="door-in2" data-door="in">I have an account. Sign in</button>
 <p class="door-tiny door-by">Built by Eli Saperstein, money coach. 250+ people coached.</p>
 <div class="door-msg" role="status">${wait ? "One moment. The sign-in screen is on its way." : ""}</div>
 <details><summary>What is this?</summary><div class="door-what">
 <p>A money game by a money coach. You tap your answers and it shows where you stand and one next step.</p>
 <p>It is free.</p>
 <p>Nothing is typed. Nothing is saved to an account until you choose to make one.</p>
 <p><b>${typeof TRUST_LINE === "string" ? TRUST_LINE : "Education and tools, not financial advice."}</b></p>
 ${typeof TRUST_PAGE === "string" ? `<p><a class="door-link" href="${TRUST_PAGE}">Privacy: what is stored and who sees it</a></p>` : ""}
 ${doorFireBtn()}
 </div></details>
 <div class="door-rep"><button type="button" class="rp-btn rp-open" data-a="flag">Report</button></div></div>`;
}
/* Put the landing screen on the page. */
function doorShow() {
  if (typeof document === "undefined" || !document.createElement || !document.body) return;
  if (DOOR.el) return;
  const el = document.createElement("div");
  el.id = "door";
  el.innerHTML = doorHtml(false);
  el.onclick = ev => {
    const b = ev.target && ev.target.closest ? ev.target.closest("[data-door]") : null;
    if (!b) return;
    if (b.dataset.door === "start") doorStart();
    else if (b.dataset.door === "sit") doorSitGo(b.dataset.sit);
    else doorSignIn("in");
  };
  document.body.appendChild(el);
  DOOR.el = el;
  DOOR.shown = true;
}
function doorHide() {
  if (DOOR.el && DOOR.el.remove) DOOR.el.remove();
  DOOR.el = null;
  DOOR.shown = false;
}
/* supa.js calls this when nobody is signed in. "done" tells the game that the account is ready. */
function doorGate(done) {
  DOOR.done = done;
  if (DOOR.want) {
    const m = DOOR.want;
    DOOR.want = "";
    doorSignIn(m);
  } else if (DOOR.guest) {
    /* The visitor tapped Start before this call. The game runs. */
  } else if (doorHasGame()) DOOR.guest = true;
  else if (
    doorGet("slam.era") &&
    typeof erRead !== "function" &&
    typeof window !== "undefined" &&
    window.addEventListener
  )
    /* the sign-in check came back before the last script: decide when the page has loaded */
    window.addEventListener("load", () => {
      if (DOOR.guest || DOOR.el) return;
      if (doorFromDemo()) doorStart();
      else doorShow();
    });
  else if (doorFromDemo()) doorStart();
  else doorShow();
}
/* True when the visitor comes from the demo Find your era with its answers (features/erain.js: erRead). The tap on
   "Start my first move" there was the tap on Start: the landing does not ask for it again (run 16, A3). */
function doorFromDemo() {
  try {
    return typeof erRead === "function" && !!erRead();
  } catch (e) {
    report(e, "door.js: doorFromDemo");
    return false;
  }
}
/* The tap on Start. No account, no typing. */
function doorStart() {
  DOOR.guest = true;
  if (!doorHasGame()) doorPut("slam_guest", "1");
  doorHide();
  if (typeof ACT !== "undefined" && typeof openSetup === "function") doorBegin();
  else if (typeof window !== "undefined" && window.addEventListener) window.addEventListener("load", doorBegin);
}
/* Open the first question. A copy of the game of an account that is still on this device is put away first:
   it belongs to that account, and the account has its own copy. */
function doorBegin() {
  try {
    const owner = doorGet("su_uid");
    if (owner && !G.demo) {
      doorPut(KEY + ".was", doorGet(KEY));
      doorPut(KEY, null);
      G = fresh();
    }
    if (owner) doorPut("su_uid", null);
    if (G.demo) {
      render();
      /* couldbe.js: a new player starts with What it is / What it could be. The setup rounds come after it. */
      if (!(typeof cbStart === "function" && cbStart())) {
        openSetup("new");
        W.door = true;
        drawSheet();
      } else if (DOOR.sit && typeof sitApply === "function")
        sitApply(DOOR.sit); /* starter.js: the door's starting point */
      DOOR.sit = "";
    } else render();
  } catch (e) {
    report(e, "door.js: doorBegin");
  }
}
/* Open the sign-in screen. mode: "in" (sign in) or "new" (make an account). */
function doorSignIn(mode) {
  if (!DOOR.done || typeof suGate !== "function") {
    DOOR.want = mode;
    if (DOOR.el) DOOR.el.innerHTML = doorHtml(true);
    return;
  }
  doorHide();
  suGate(DOOR.done, mode);
}
/* The sign-in screen was closed with its button Back. A visitor with no game sees the landing again. */
function doorBack() {
  if (!DOOR.guest) doorShow();
}
/* The button Back of the sign-in screen (suGate in supa.js). */
function doorGateBack() {
  return `<button type="button" class="su-other" data-door-back>${DOOR.guest ? "Not now. Keep playing on this device" : "Back"}</button>`;
}
/* supa.js calls this when a person is signed in. The landing goes away, and the game is no more a guest game. */
function doorSigned() {
  doorHide();
  const was = DOOR.guest;
  DOOR.guest = false;
  DOOR.want = "";
  if (doorGet("slam_guest")) doorPut("slam_guest", null);
  if (was) {
    DOOR.saved = true;
    doorRedraw();
  }
}
/* True after a visitor made an account in this visit: the answer sheet then says that the game is kept. */
function doorJustSaved() {
  return !!DOOR.saved;
}
/* The game of a visitor now belongs to an account. Draw the screen and the open sheet again, so that no row and
   no button still offers to make an account. */
function doorRedraw() {
  try {
    if (typeof render === "function" && typeof G !== "undefined") render();
    if (typeof SH !== "undefined" && SH && typeof drawSheet === "function") drawSheet();
  } catch (e) {
    report(e, "door.js: doorRedraw");
  }
}
/* The visitor with no account now has a game on this device. The landing does not show again here. */
function doorKept() {
  if (DOOR.guest) doorPut("slam_guest", "2");
}
/* When the page loads: show the landing at once to a new visitor, before the sign-in check comes back.
   Not when a sign-in token is on this device, not when the address carries a sign-in link, and not in the tests. */
function doorEarly() {
  if (typeof window === "undefined" || window.claude || !window.supabase || !window.supabase.createClient) return;
  if (typeof location === "undefined" || typeof localStorage === "undefined") return;
  if (doorHasGame()) {
    DOOR.guest = true;
    return;
  }
  let token = false;
  try {
    for (let i = 0; i < localStorage.length; i++) if (/^sb-.*-auth-token/.test(localStorage.key(i) || "")) token = true;
  } catch (e) {
    report(e, "door.js: doorEarly");
  }
  const back =
    /access_token=|refresh_token=|type=recovery|error_description=/.test(location.hash || "") ||
    /[?&]code=/.test(location.search || "");
  /* the answers of the demo Find your era wait on this device: the landing waits for doorGate(), which starts the
     game with them, or shows the landing when they are too old */
  if (!token && !back && !doorGet("slam.era")) doorShow();
}
doorEarly();
