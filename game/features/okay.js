/* ============================================================================
   SLAM the Game: features/okay.js
   PURPOSE     The question "Am I okay?" and its first answer. A visitor from the front door
               (account/door.js) answers the setup by taps, then sees this sheet: what the taps say
               about the cushion, a surprise bill, the money left from each paycheck, debt and
               investing, and the one next step. For a visitor with no account, the sheet offers to
               save the game by making an account. The Menu has the same sheet for each player.
   INPUT       The profile: c.can1k, c.cover, c.invest, c.months, c.high, c.debtKinds, c.payFreq,
               c.placed. The numbers of derive(): d.left, d.era. The open sheet (W.kind): okay, dooracct.
               The setup state (W.door).
   OUTPUT      Functions: okCalc, okSheet, doorAcctSheet, welcomeDoor. Parts of functions in other
               files: setupSheetDoor (setupSheet in ui.js), finishSetupOkay (finishSetup in ui.js),
               homeDoorRow (home in ui.js). Actions (ACT): okay, doorsave, doorin. Menu: "Am I okay?".
   DEPENDS ON  core/report.js, core/engine.js (derive), screens/ui.js (C, D, head, sheet, nextStep,
               eraName, money, esc), features/kit.js (kitPill, kitMenu, kitScreen), account/door.js.
   RULES       No new number and no new formula: each number on the sheet is a number that derive() or
               the profile already has (the months of cushion, the money left from each paycheck, the
               era). Thus the spreadsheet of the plan has no new rows. After the setup by taps each
               line is a Guess, and the sheet says so. A guess gets no verdict: the sheet repeats what
               the player tapped and gives the next step. When real numbers move it, the game says
               "Recalculating".
   ========================================================================= */
/* What the answers say. All values come from the profile and from derive(). */
function okCalc(c, d) {
  const gut = !!(c.can1k && c.cover),
    months = c.months || 0,
    ns = nextStep(c, d);
  return {
    gut,
    state: c.placed ? "Close" : "Guess",
    can1k: c.can1k || null,
    cover: c.cover || null,
    months,
    monthWords:
      months < 1 ? "under a month" : "about " + Math.round(months) + " month" + (Math.round(months) === 1 ? "" : "s"),
    left: d.left,
    pay: c.payFreq === "It varies" || !c.payFreq ? "each pay period" : "each paycheck",
    high: c.high === "yes",
    debts: (c.debtKinds || []).slice(),
    invest: c.invest || null,
    era: eraName(d),
    next: ns,
  };
}
/* The first sentence: what the player said, in the player's words. No verdict. */
function okHead(o) {
  if (!o.gut) return "The three gut checks are not answered yet. They are the heart of this answer.";
  if (o.can1k === "Yes" && o.months >= 1)
    return `From your taps: a $1,000 surprise would not make you borrow, and your bills are covered for ${o.monthWords}.`;
  if (o.can1k === "Yes")
    return "From your taps: a $1,000 surprise would not make you borrow today, and your cushion covers under a month of bills.";
  return "From your taps: money is tight right now, and a $1,000 surprise would mean borrowing. That is a place to start from, and it has a first step.";
}
function okRow(label, text) {
  return `<div class="tile small"><div class="row between"><b>${esc(label)}</b>${kitPill("Guess")}</div><div>${esc(text)}</div></div>`;
}
function okSheet() {
  const c = C(),
    d = D || derive(c),
    o = okCalc(c, d),
    guest = typeof doorGuest === "function" && doorGuest(),
    typ = o.state === "Guess" ? ", for a person with your answers." : ".",
    row = (label, text) => okRow(label, text).replace(kitPill("Guess"), kitPill(o.state)),
    rows = [
      o.gut ? row("Cushion", "Your bills are covered for " + o.monthWords + ".") : "",
      o.gut
        ? row(
            "A $1,000 surprise",
            o.can1k === "Yes" ? "You could pay it without borrowing." : "You would need to borrow for it today."
          )
        : "",
      row(
        "In and out",
        o.left >= 0
          ? "About " + money(o.left) + " is left from " + o.pay + typ
          : "About " + money(-o.left) + " more goes out than comes in " + o.pay + typ
      ),
      row(
        "Debt",
        o.high
          ? "You have debt with a high rate (" + (o.debts.join(", ") || "a card or a loan") + "). It costs the most."
          : o.debts.length
            ? "You have debt (" + o.debts.join(", ") + "), and none of it looks like a high rate."
            : "You tapped no debt."
      ),
      o.invest
        ? row(
            "Investing",
            o.invest === "Every month"
              ? "You put money in every month."
              : o.invest === "Sometimes"
                ? "You put money in sometimes."
                : "You do not put money in yet."
          )
        : "",
    ].join("");
  return (
    head("Your first answer", "Am I okay?") +
    `<div class="banner small" data-fid="ok:head">${esc(okHead(o))}</div>` +
    `<div class="tiny muted">${o.state === "Guess" ? "This is a Guess: it comes from your taps and from typical amounts for people like you, not from your real numbers." : "This is Close: it uses the real numbers you added so far."} No grade. Each real number you add recalculates it.</div>` +
    (o.gut ? "" : `<button class="ghost wide" data-a="plater" data-v="gut">Answer the three gut checks</button>`) +
    rows +
    `<div class="tile small"><b>Where that puts you</b><div>${esc(o.era)}, as a guess for people like you.</div></div>` +
    `<div class="tile small"><b>Your one next step</b><div>${esc(o.next.t)}</div>${o.next.s ? `<div class="tiny muted">${esc(o.next.s)}</div>` : ""}</div>` +
    (guest
      ? `<button class="primary wide go" data-a="doorsave">Save my answer: make a free account</button><div class="tiny muted">Right now your game is on this device only. An account keeps it and takes it to your other devices.</div><button class="ghost wide" data-a="${o.next.a}" data-v="${o.next.v == null ? "" : o.next.v}">${esc(o.next.l || "Do the next step")}</button>`
      : `<button class="primary wide go" data-a="${o.next.a}" data-v="${o.next.v == null ? "" : o.next.v}">${esc(o.next.l || "Do the next step")}</button>`) +
    `<button class="ghost wide" data-a="elem">Meet your character</button>` +
    `<details class="math"><summary>What this answer uses</summary><div class="inner tiny stack" style="gap:4px"><div>Cushion: your tap on "how long could you cover your bills", as months of typical spending. With your real cash and spending it becomes cash divided by a month of spending.</div><div>A $1,000 surprise: your own tap, yes or no.</div><div>In and out: typical take-home pay minus typical spending for your age, work and home, for one pay period.</div><div>Debt: the kinds you tapped. Cards, payday loans and the like count as a high rate.</div><div>Investing: your own tap.</div><div>Where that puts you: the first era whose step is not done yet.</div><div>Education and tools, not financial advice.</div></div></details>`
  );
}
/* Part of setupSheet() in ui.js. w is the setup state. A setup that came from the front door shows the
   question "Am I okay?" in place of "Getting started", and on the first page one line that says what comes. */
function setupSheetDoor(h, w) {
  if (!w || !w.door || w.mode === "edit") return h;
  h = h.replace("Getting started · page", "Am I okay? · page");
  if (w.step === 0)
    h = h.replace(
      "<h2>About you</h2>",
      `<h2>Am I okay?</h2><div class="small">A few pages of taps about you, then your first answer. No numbers, no typing.</div>`
    );
  return h;
}
/* Part of finishSetup() in ui.js. After a setup that came from the front door, opens the answer to "Am I okay?".
   A visitor with no account now has a game on this device, so the landing screen does not show again here. */
function finishSetupOkay() {
  try {
    if (typeof doorKept === "function") doorKept();
    if (typeof closeSheetNav === "function")
      closeSheetNav(); /* nav.js: the answer is the first screen, with no trail */
    W = { kind: "okay", first: true };
    sheet(okSheet);
  } catch (e) {
    report(e, "okay.js: finishSetupOkay");
  }
}
/* Part of home() in ui.js. A visitor with no account sees one row: the game is on this device only, and how to keep it. */
function homeDoorRow(h) {
  try {
    if (G.demo || typeof doorGuest !== "function" || !doorGuest() || typeof homeRowAdd !== "function") return h;
    return homeRowAdd(
      h,
      `<div class="homerow"><button class="rowbtn" data-a="doorsave"><span><b>Keep this game: make a free account</b><div class="tiny muted">Right now it is saved on this device only.</div></span><span class="caret">›</span></button></div>`
    );
  } catch (e) {
    report(e, "okay.js: homeDoorRow");
    return h;
  }
}
/* Part of welcome() in ux.js. The welcome screen for a visitor with no account who closed the first question. */
function welcomeDoor() {
  return `<div class="stack welcomebox"><h1>SLAM the Game</h1><div class="small muted">Your money, one small step at a time.</div><div class="card stack" style="gap:10px"><div class="small">Your first question: am I okay? About 2 minutes of taps.</div><button class="primary go wide" data-a="doorgo">Start</button><button class="ghost wide" data-a="doorin">I have an account. Sign in</button><div class="tiny muted">No numbers, no typing. Free. Education and tools, not financial advice.</div></div></div>`;
}
/* Part of suAcctSheet() in supa.js. "My account" for a visitor with no account. */
function doorAcctSheet() {
  return (
    head("Your account", "No account yet") +
    `<div class="tile small"><b>Your game is on this device only</b><div class="tiny muted">An account keeps it and takes it to your other devices. It is free.</div></div><button class="primary wide" data-a="doorsave">Make a free account</button><button class="ghost wide" data-a="doorin">I have an account. Sign in</button>`
  );
}
Object.assign(ACT, {
  okay: () => {
    W = { kind: "okay" };
    sheet(okSheet);
  },
  /* the sign-in screen, on "Create your account" */
  doorsave: () => {
    if (typeof doorSignIn === "function") doorSignIn("new");
  },
  /* the sign-in screen, on "Sign in" */
  doorin: () => {
    if (typeof doorSignIn === "function") doorSignIn("in");
  },
  /* the first question again, for a visitor who closed it */
  doorgo: () => {
    if (typeof doorBegin === "function") doorBegin();
  },
});
kitMenu("Am I okay?", "okay", "Your first answer from your taps, and the one next step", "quest");
kitScreen(
  "okay",
  "Am I okay?",
  "What your taps say about your cushion, a surprise bill, money left, debt and investing.",
  "After the setup by taps it is a Guess, with no grade. Each real number you add recalculates it."
);
