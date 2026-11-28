/* ============================================================================
   SLAM the Game: intake/intake.js
   PURPOSE     The form before a first call (run CC-1, item 11, Nov 27 2026): intake/index.html. A lead
               of a coach answers the questions of the demo Find your era by taps, then makes an account.
               This file holds only the words of this page and its last screen. The questions, the taps
               and the hand-off are the ones of the demo (era/era.js, features/erain.js).
   INPUT       The address of the page: ?coach=1 is the mark of a coach's invite (suInvited in
               account/supa.js reads it in the game). The answers so far (ERA.A in era/era.js).
   OUTPUT      window.ERA_PAGE, read by era/era.js when it loads. Functions: inInvited, inTo, inResult.
   DEPENDS ON  era/era.js loads after this file and gives eraTop, eraFoot, esc; features/erain.js
               (erResult, ER_WORDS). No account code and no network request on this page.
   RULES       Nothing is sent from this page. The answers go to the game on this device (the key
               slam.era, with the mark of a lead), and the game opens its own sign-up screen. The
               account is what lets the coach see the answers, and only with Share with my coach on,
               which the invite mark turns on. The page holds no name and no code of a coach. A person
               never sees a coach feature here.
   ========================================================================= */
/* True when the address has the mark of a coach's invite. */
function inInvited(search) {
  try {
    return new URLSearchParams(search || "").get("coach") === "1";
  } catch (e) {
    report(e, "intake.js: inInvited");
    return false;
  }
}
/* The address that the last button opens: the game, with the invite mark when this page had it. */
function inTo(search) {
  return "../" + (inInvited(search) ? "?coach=1" : "");
}
/* THE LAST SCREEN: thanks, what comes next, one button, a small Back. */
function inResult() {
  const R = erResult(ERA.A),
    inv = inInvited(location.search);
  return (
    eraTop() +
    `<section class="card lead" id="result"><span class="dklabel">That is all</span><h1 class="glow">Ready for our call</h1>` +
    `<p id="why">These few taps give your first session a head start. Every answer counts as a guess until we look at it together.</p></section>` +
    `<section class="tile" id="era-now"><div class="row between"><span class="dklabel">Where you start</span><span class="pill">${esc(R.st)}</span></div><h2>${esc(R.name)}</h2><p class="small">${esc(R.one)}</p></section>` +
    `<section class="tile" id="next"><span class="dklabel">What comes next</span><p class="small">One more step: make your account. It needs an email and a password, the only things you type. Then your game opens with your answers in it.</p>` +
    `<p class="small" id="share">${inv ? "This link came from your coach, so Share with my coach starts on: your coach can see your game to help you. You can turn it off anytime in Menu, then My account." : "This link has no coach invite, so no coach sees your game. You can turn sharing on in Menu, then My account."}</p></section>` +
    `<button class="primary wide big go" data-a="go">Create my account</button>` +
    (ERA.kept
      ? ""
      : `<div class="note" role="status">This browser does not keep answers right now (private mode does that). Home, at the top, opens the game, and it asks the first four again.</div>`) +
    `<div class="row"><button class="ghost slim" data-a="back"><i class=chevl aria-hidden=true></i> Back</button></div>` +
    eraFoot()
  );
}
window.ERA_PAGE = {
  name: "Before our call",
  hero: ["Before our call", "About 2 minutes. Taps only. No typing."],
  foot: "Nothing is sent from this page. Your answers stay on this device until you make your account.",
  lead: true,
  result: inResult,
  to: () => inTo(location.search),
};
