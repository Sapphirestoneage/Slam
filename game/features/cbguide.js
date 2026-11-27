/* ============================================================================
   SLAM the Game: features/cbguide.js
   PURPOSE     What it is / What it could be, run 14 (Nov 27 2026): the parts that make each screen of the
               flow easy to follow. (1) One pulse: each screen has exactly one control with the class
               cbnext, the next tap. (2) Folds: content that is not the headline, the number, the chart
               or a button sits behind one tap, closed. (3) Back and Forward: one row on each screen.
               Forward returns to the screen the player left with Back. (4) The screen keeps its place
               after a tap. (5) The "i" of a card, a chart, a number, a meter or a group of buttons: two
               lines, what it is and what it is for. Run 14, items 10, 12 and 13: (6) a tap outside an "i"
               that is open closes it. (7) The countdown: how many taps are left in this part of the flow.
               (8) One line before a button that leaves the flow.
   INPUT       The open sheet (W.kind cb): W.fo (the folds that are open, by key). CB.fwd (the screens
               that Forward returns to, the last one first out).
   OUTPUT      Data: CB_GUIDE (the two lines of each "i"). Views: cbI (the "i" button), cbFold, cbNav
               (the row Back and Forward), cbOne (exactly one cbnext in the HTML of a screen). Functions:
               cbFwdKeep, cbFwdDrop, cbFwdCan, cbStaySoon, cbLeft, cbLeftWords, cbLeftLine, cbLeaves, cbOutTap.
               Actions (ACT): cbi, cbfold, cbfwd.
   DEPENDS ON  core/report.js, screens/ui.js (head, esc, sheet, GLOSS). At the time of a tap:
               features/couldbe.js (CB, cbSheet, cbAt).
   RULES       No number is worked out here. The words of an "i" are plain: two short lines. A control
               that is not the next tap still works: it is only a little paler. A control that cannot be
               used says why in one line under the row.
   COMPAT      No key on a profile. W.fo and CB.fwd are not saved.
   STATE       None of its own: CB.fwd is in the CB of couldbe.js.
   ========================================================================= */
/* The two lines of each "i" of the flow: [the name, what it is, what it is for, a word of the glossary with more
   (optional)]. */
const CB_GUIDE = {
  top: [
    "The two numbers",
    "What it is: 25 times what you spend in a year. What it could be: the same number after what you count.",
    "They show how far each choice moves your number.",
    "cbfi",
  ],
  wants: [
    "What you want",
    "A list of things people want from money.",
    "Your picks tell the game why a step matters to you.",
  ],
  answers: [
    "The answers",
    "Each button is a range. The game counts the middle of the range you tap.",
    "One tap answers the question. The most usual answer for your age comes first.",
  ],
  pace: [
    "At today's pace",
    "The age when your investments reach your number, if you keep saving as you do now.",
    "It tells you when work can be a choice.",
  ],
  life: [
    "The rest of your life costs",
    "What you spend in a year, for each year from now to 95.",
    "It shows why your number is smaller: invested money keeps growing while you spend it.",
    "cblife",
  ],
  chart: [
    "The chart",
    "Each bar is 5 years of your life. Each color is a kind of money that pays for those years.",
    "It shows which years are paid for, and which are not yet.",
  ],
  words: [
    "What the chart says",
    "The chart in words: the years not paid for yet, and the age when steady income pays for your needs.",
    "Read it when the bars are hard to read.",
  ],
  layers: [
    "The layers",
    "One button for each kind of money: work, investments, Social Security, other.",
    "Tap one to take it off the chart. Tap again to put it on.",
  ],
  costs: [
    "What a year costs",
    "The parts of one year of spending: needs, wants, health insurance and tax.",
    "Tap a part to read about it, or to count it in What it could be.",
  ],
  layer: [
    "This part of the chart",
    "One color of the chart, the years it is there, and about how much a year.",
    "It shows what this money does for you.",
  ],
  health: [
    "A plan of your own",
    "What health insurance costs you each month, from the day work stops until Medicare at 65.",
    "Tap a range. The chart then uses your price.",
  ],
  stackn: [
    "Your count",
    "How many ways you counted, out of the ways that fit you.",
    "It shows how much there is still to try.",
  ],
  after: [
    "After work",
    "Ways to make your number smaller for the years after work.",
    "Count the ones that fit you. The biggest drop for you is first.",
  ],
  before: [
    "Before FI",
    "Moves that bring your date closer while you still work.",
    "Count one to see how many months sooner you get there.",
  ],
  choices: [
    "The choices",
    "Each button is one way to count this.",
    "Tap one. The line under the buttons says what it means.",
  ],
  drop: [
    "The drop for you",
    "How much smaller your number gets, and how many months sooner you reach it.",
    "It helps you choose: count this, or leave it out.",
  ],
  count3: [
    "Count it or not",
    "Three answers: count this, you already do it, or it is not for you.",
    "Your answer moves What it could be. You can change it at any time.",
  ],
  receipt: [
    "What your answer did",
    "The dollars your answer took off the number, and the months it changed.",
    "It shows what the tap did.",
  ],
  backup: [
    "The backup",
    "What has to go right for this way to work, and what you do if it does not.",
    "A backup keeps the plan steady when life changes.",
  ],
  plan: ["For your numbers", "What this way does with your own numbers.", "Read it before you count this way."],
  taxadds: [
    "What the tax adds",
    "How much the tax on money you take out adds to your number.",
    "It shows why the order you take money out matters.",
  ],
  cut: [
    "What a cut looks like",
    "The deepest cut in spending that this rule asked for in the past.",
    "It shows if your needs still fit in a hard year.",
  ],
  ybrow: [
    "Yes, but",
    "A card with one cut and one keep from your spending.",
    "It shows what the trade is worth in months.",
    "cbyesbut",
  ],
  nav: [
    "Back and Forward",
    "Back opens the screen before this one. Forward opens the screen you left with Back.",
    "Look again at a screen, and keep your place.",
  ],
  left: [
    "Taps left",
    "How many taps are left in this part, if you tap the main button each time.",
    "It shows how close you are to the end.",
  ],
  diff: [
    "The difference",
    "What it is less What it could be, and the time between the two ages.",
    "It shows what your choices are worth so far.",
    "cbdiff",
  ],
  dates: [
    "Moves and your card",
    "The months that your counted moves and your Yes, but card change.",
    "They move your date. They do not change the two numbers.",
    "cbtwo",
  ],
  typ: [
    "Typical values",
    "Answers the game filled in with what is usual for your age.",
    "Tap Make it mine to put in your own number.",
  ],
  counted: [
    "What you counted",
    "The list of what is in What it could be now.",
    "Tap a row with an arrow to open a deeper part of the game.",
  ],
  top3: [
    "Your top moves",
    "The moves that bring your date closest, the best one first.",
    "Tap one to read it and to count it.",
  ],
  switches: [
    "Ways and costs",
    "One button for each way to shrink the number, and one for each cost the 25 times rule leaves out.",
    "Tap one to count it or to take it out. The chart and the number follow.",
  ],
  cushion: [
    "The cushion",
    "Your money is expected to grow faster than you take it out.",
    "The extra is there for the years when the market goes down.",
  ],
  keep: [
    "Keep it, share it, or tell Eli",
    "Three buttons: keep your plan with a free account, share a card, or tell Eli about a problem.",
    "Your plan stays on this device as you go. Nothing is sent until you tap.",
  ],
  pairs: [
    "Pairs to try",
    "Each row is one cut and one keep, with the months they change together.",
    "Tap a row to put that pair on your card.",
    "cbybpairs",
  ],
  net: [
    "The net",
    "The months sooner or later with your cut and your keep together.",
    "It shows what the trade is worth.",
    "cbybnet",
  ],
  own: [
    "Your own pair",
    "Two lists of your spending lines: one to cut from, one to keep or give more to.",
    "Tap a line in each list to build a pair of your own.",
    "cbyesbut",
  ],
  movenums: ["The numbers of this move", "What this move changes for you.", "It shows where the months come from."],
};

/* ---------- THE "i" ---------- */
/* The "i" of a card, a chart, a number, a meter or a group of buttons of the flow. key: a key of CB_GUIDE. */
function cbI(key) {
  const g = CB_GUIDE[key];
  return g
    ? `<button class="i cbi" data-a="cbi" data-k="${key}" aria-label="What is this? ${esc(g[0])}">i</button>`
    : "";
}
/* The words of one "i": the two lines, and the longer text of the glossary when there is one. */
function cbGuideHtml(key) {
  const g = CB_GUIDE[key],
    more = g && g[3] && typeof GLOSS !== "undefined" && GLOSS[g[3]] ? GLOSS[g[3]][1] : "";
  if (!g) return "";
  return (
    head("In plain words", esc(g[0])) +
    `<div class="small" data-fid="cbi:is"><b>What it is.</b> ${esc(g[1])}</div>` +
    `<div class="small" data-fid="cbi:for"><b>What it is for.</b> ${esc(g[2])}</div>` +
    (more
      ? `<details class="math"><summary>More about it</summary><div class="inner small">${more}</div></details>`
      : "")
  );
}

/* ---------- FOLDS ---------- */
/* Content behind one tap, closed until the player opens it. key: the name of the fold on this screen. It stays open
   while the player is on the screen (W.fo), also when a tap inside it draws the screen again. */
function cbFold(key, label, html) {
  if (!html) return "";
  const open = !!(W && W.fo && W.fo[key]);
  return `<details class="math cbfold" data-fid="cb:fold:${key}"${open ? " open" : ""}><summary data-a="cbfold" data-k="${key}">${esc(label)}</summary><div class="inner stack" style="gap:8px">${html}</div></details>`;
}

/* ---------- BACK AND FORWARD ---------- */
/* Keep the screen the player leaves with Back, so that Forward returns to it. */
function cbFwdKeep() {
  if (!W || W.kind !== "cb") return;
  CB.fwd = CB.fwd || [];
  CB.fwd.push({ W, step: W.step, q: W.q });
  if (CB.fwd.length > 20) CB.fwd.shift();
}
/* The player moved on by another way. When the new screen is the one Forward would open, that one is used up. Any
   other move empties the list: there is nothing to return to. step: the step the player goes to (none: empty it). */
function cbFwdDrop(step, id) {
  const f = CB.fwd || [],
    top = f[f.length - 1];
  if (step && top && top.step === step && (top.W.id || null) === (id || null) && step !== "entry") f.pop();
  else CB.fwd = [];
}
function cbFwdCan() {
  return !!(CB.fwd && CB.fwd.length);
}
/* THE ROW Back and Forward of each screen of the flow. o.back: the attributes of the Back button (data-a and the
   rest), or null on the first screen. o.next: true when Back is the next tap of the screen. Under the row, one line
   says why a button cannot be used. */
function cbNav(o) {
  const back = o && o.back,
    fwd = cbFwdCan(),
    left = W && W.kind === "cb" && W.step !== "entry" ? cbLeftLine() : "",
    why = [back ? "" : "Back: this is the first screen.", fwd ? "" : "Forward works after you tap Back."]
      .filter(Boolean)
      .join(" ");
  return (
    `<div class="row cbnav" data-fid="cb:nav"><button class="ghost slim cbbk${o && o.next && back ? " cbnext" : ""}" ${back ? back + ' data-b="1"' : 'disabled aria-disabled="true"'}><i class=chevl aria-hidden=true></i> Back</button>` +
    `<button class="ghost slim cbfw" data-a="cbfwd"${fwd ? "" : ' disabled aria-disabled="true"'}>Forward <i class=chev aria-hidden=true></i></button>${cbI("nav")}</div>` +
    (why ? `<div class="tiny muted" data-fid="cb:navwhy">${why}</div>` : "") +
    left
  );
}

/* ---------- THE COUNTDOWN (run 14, item 12) ---------- */
/* How many taps are left in this part of the flow, when the player taps the main button of each screen. The four
   questions: the questions that are left. From What it is on: the screens to the result. Null where there is no
   count (What you want, a layer, a move, the result). It is never 0: the last screen of a part has no line. */
function cbLeft() {
  if (!W || W.kind !== "cb") return null;
  if (W.step === "entry")
    return W.one
      ? { n: 1, to: "back" }
      : { n: CB_QS.length - Math.max(0, Math.min(CB_QS.length - 1, W.q || 0)), to: "number" };
  if (W.step === "stack") return { n: 2, to: "result" };
  /* the main button of the chart opens the list of ways, and its main button opens the reveal */
  if (W.step === "chart" && typeof cbStackView === "function") return { n: 3, to: "result" };
  if (W.step === "is" && typeof cbStackView === "function") return { n: 4, to: "result" };
  if (W.step === "end" || !CB_STEPS.some(s => s.id === W.step)) return null;
  let n = 0;
  const c = C();
  for (let id = W.step; id !== "end" && n < 40; n++) id = cbStepNear(c, id, 1);
  return n > 0 ? { n, to: "result" } : null;
}
/* The words of the countdown. */
function cbLeftWords() {
  const L = cbLeft();
  if (!L) return "";
  const t = L.n === 1 ? "1 tap left" : L.n + " taps left";
  return L.to === "number"
    ? t + ", then your number. No typing needed."
    : L.to === "back"
      ? "1 tap, then you go back to where you were."
      : t + " to your result.";
}
/* The line of the countdown, with its "i". */
function cbLeftLine() {
  const t = cbLeftWords();
  return t
    ? `<div class="row between cbleft" style="gap:8px" data-fid="cb:left"><span class="tiny muted">${t}</span>${cbI("left")}</div>`
    : "";
}

/* ---------- ONE THING PER STEP (run 14, item 13) ---------- */
/* One line before a button that leaves the screens of the flow. what: the part of the game the button opens. */
function cbLeaves(what) {
  return `<div class="tiny muted cbleave" data-fid="cb:leave">The next button leaves these screens. It opens ${esc(what)}. Back brings you here again.</div>`;
}

/* ---------- A TAP OUTSIDE (run 14, item 10) ---------- */
/* A tap outside a sheet that is open on top of a screen of the flow (an "i", a word of the glossary) closes it: the
   screen of the flow is there again, at the same place. A screen of the flow is not a sheet on top of something: a tap
   outside it changes nothing, so no answer is lost. Returns true when a sheet was closed. */
function cbOutTap() {
  try {
    if (!SH || !W || W.kind !== "cb" || SH === cbSheet) return false;
    if (typeof ACT.navback === "function") ACT.navback();
    else closeSheet();
    return true;
  } catch (e) {
    report(e, "cbguide.js: cbOutTap");
    return false;
  }
}
if (typeof document !== "undefined" && document.addEventListener)
  document.addEventListener("click", e => {
    const t = e.target;
    if (t && t.classList && t.classList.contains("overlay") && t.parentNode && t.parentNode.id === "ov") cbOutTap();
  });

/* ---------- ONE PULSE ---------- */
/* Exactly one control of a screen has the class cbnext (the next tap). h: the HTML of the screen. When a view marked
   more than one, the first stays. When it marked none, the first main button gets it. */
function cbOne(h) {
  let n = 0;
  h = h.replace(/class="([^"]*\bcbnext\b[^"]*)"/g, (m, cls) =>
    n++
      ? `class="${cls
          .replace(/\b(cbnext|go|likely)\b/g, "")
          .replace(/\s+/g, " ")
          .trim()}"`
      : m
  );
  if (!n) h = h.replace(/class="(primary[^"]*)"/, (m, cls) => `class="${cls} cbnext"`);
  return h;
}

/* ---------- THE SCREEN KEEPS ITS PLACE ---------- */
/* After a move to another screen of the flow. The sheet keeps the place it had (drawSheetBase in ui.js). It never
   goes to the top. Only when the player was down the screen and the next tap is out of view, the sheet moves to
   the next tap. */
function cbStay() {
  try {
    if (typeof document === "undefined" || !document.querySelector) return;
    const s = document.querySelector("#ov .sheet"),
      el = s && s.querySelector ? s.querySelector(".cbnext") : null;
    if (!s || !el || !(s.scrollTop > 0) || !el.getBoundingClientRect || !el.scrollIntoView) return;
    const a = s.getBoundingClientRect(),
      b = el.getBoundingClientRect();
    if (b.top < a.top || b.bottom > a.bottom) el.scrollIntoView({ block: "center" });
  } catch (e) {
    report(e, "cbguide.js: cbStay");
  }
}
function cbStaySoon() {
  if (typeof setTimeout === "function") setTimeout(cbStay, 0);
}

Object.assign(ACT, {
  /* the "i" of a part of the flow: its two lines. Got it returns to the screen (nav.js) */
  cbi: t => {
    const key = t.dataset.k;
    if (!CB_GUIDE[key]) return;
    sheet(() => cbGuideHtml(key) + `<button class="primary wide" data-a="close">Got it</button>`);
  },
  /* a fold opens or closes. The browser moves the fold: this only keeps which ones are open */
  cbfold: t => {
    if (!W || W.kind !== "cb") return;
    W.fo = W.fo || {};
    W.fo[t.dataset.k] = !W.fo[t.dataset.k];
  },
  /* Forward: return to the screen the player left with Back */
  cbfwd: () => {
    if (!W || W.kind !== "cb" || !cbFwdCan()) return;
    const p = CB.fwd.pop();
    W = p.W;
    W.step = p.step;
    W.q = p.q;
    cbAt(W.step);
    sheet(cbSheet);
    cbStaySoon();
  },
});
