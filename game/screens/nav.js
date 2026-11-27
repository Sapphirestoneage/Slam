/* ============================================================================
   SLAM the Game: screens/nav.js
   PURPOSE     The same four things on each sheet: Back (one screen back), Forward, Close, and an "i"
               with two sentences about the screen.
   INPUT       The taps of the player (the actions in OUTPUT).
   OUTPUT      13 functions. Parts of functions in other files: drawSheetNav, closeSheetNav. Actions
               (ACT): navback, navfwd, navclose.
   DEPENDS ON  screens/ui.js, screens/ux.js.
   USES LATER  Names from files that the browser loads later. Behind a typeof test, thus safe while the
               page loads: screens/tidy.js, features/questlog.js.
   RULES       A screen is identified by its kind and its place in a flow (step, question, person). Thus
               Back in a flow moves one question and keeps the entered data. When a sheet closes, the
               list is emptied. A button with only "Done" or "Close" gets words that say what it does. A
               sheet kind with no entry in NV_INFO shows no "i".
   STATE       NVX.st (the sheets that the player passed since a sheet opened), NVX.fw (the sheets for
               Forward). NV_INFO has the two sentences for each sheet kind.
   ========================================================================= */
const NV_KEYS = ["q", "v", "i", "st", "sti", "step", "id", "g", "tab", "t", "pass", "who", "r", "n"];
var NVX = { st: [], fw: [] };
const NV_INFO = {
  ahead: [
    "The year ahead",
    "Your next 12 months, with the big costs you know are coming.",
    "It is for seeing a costly month before it arrives.",
  ],
  askdone: [
    "What just happened",
    "A short note after you answer something.",
    "It tells you what you did, what changed, and what comes next.",
  ],
  backup: [
    "Save or move my game",
    "Your game saves by itself. This screen makes a copy you can move to another phone.",
    "It is for moving your game, or keeping a spare.",
  ],
  bins: [
    "Need, want or joy",
    "A sorting game for your spending.",
    "It shows how much of your month is must-pay, nice-to-have, or what makes life good.",
  ],
  bon: ["Save point", "A rest stop after you finish a layer.", "It shows what you unlocked. Your place is saved."],
  boss: [
    "Boss fights",
    "Each debt shown as a boss with a health bar.",
    "It is for seeing every payment knock the debt down.",
  ],
  built: [
    "What's built",
    "A list of every idea for this game, and whether it is built yet.",
    "It is for checking what works today and what is still coming.",
  ],
  cal: ["Your month", "A calendar you paint with paydays and bills.", "It finds the tightest day of your month."],
  cals: [
    "Calendars",
    "A list of calendars your life runs on, like school or holidays.",
    "Turning one on puts its costly times on your year.",
  ],
  catch: [
    "One quick thing",
    "A follow-up question after you finish a step.",
    "It helps the game remember the detail that matters.",
  ],
  chance: [
    "Chance test",
    "Your plan run through many made-up futures, good and bad.",
    "It shows how often the money lasts.",
  ],
  chart: [
    "Money Chart",
    "Your money personality as five elements.",
    "It is for knowing your habits. It is not a grade.",
  ],
  compare: [
    "Side by side",
    "Two what-if moves next to each other, on your numbers.",
    "It is for choosing between two changes.",
  ],
  connect: [
    "How it all connects",
    "A map of the skill areas and which ones open others.",
    "It shows what to learn first, and why.",
  ],
  cross: [
    "Crossroads",
    "A choice point: you have enough saved to change course.",
    "It lays out your options. You pick.",
  ],
  daily: ["Daily check", "One or two quick taps a day.", "It keeps your numbers fresh without any homework."],
  dbone: ["One debt", "A few questions about one debt, one at a time.", "Your answers give that debt an end date."],
  dbplan: ["Debt plan", "All your debts, and three ways to pay them off.", "It shows the month you will be debt free."],
  detail: ["Details", "A few extra facts about your accounts and debts.", "They make your numbers sharper."],
  dq: ["Daily question", "One short money question a day.", "It teaches one idea at a time. A miss costs nothing."],
  draft: ["Card draft", "Five things people save for. You keep the ones that are yours.", "It starts your goals list."],
  drills: [
    "Fire drills",
    "A money fear, run on your own numbers.",
    "Practicing on a calm day makes the real thing smaller.",
  ],
  fair: [
    "Sharing costs fairly",
    "Five ways to split what you share with other people.",
    "It is for picking the split that feels fair to everyone.",
  ],
  find: ["Find your era", "Five quick taps about you.", "It tells you which money stage you are in."],
  flow: ["Log money", "A place to record money that came in, went out, or moved.", "It keeps your balances right."],
  fog: [
    "Your map",
    "Your money picture in patches. Each answer clears one.",
    "It shows what the game still does not know.",
  ],
  funds: [
    "True expenses",
    "Costs that do not come every month, like car repairs or gifts.",
    "Saving a little each month stops them from being a surprise.",
  ],
  gadd: [
    "Add a goal",
    "Three taps to add something you want to save for.",
    "It goes on your goals list with a price and a date.",
  ],
  games: ["All the games", "Every mini-game in one list.", "Each game fills in part of your money picture."],
  gear: [
    "Your gear",
    "The money tools you have, like a savings account or a retirement plan.",
    "It shows what you have and what is missing.",
  ],
  ghost: ["Ghost run", "This month's you next to last month's you.", "It is only ever you against you."],
  gig: [
    "Working for yourself",
    "Tools for money you earn on your own, with no taxes taken out.",
    "It helps you set tax money aside and know what a job really pays.",
  ],
  goal: ["A goal", "One thing you are saving for.", "You can change its price, its date, or remove it."],
  grow: ["Watch it grow", "A picture of money growing over time.", "It shows what a monthly amount turns into."],
  gwin: ["One small win", "One tiny thing to do right now.", "A quick win before any numbers."],
  handoff: [
    "Send or add a person",
    "A code that carries one person's game to another phone.",
    "It is for handing someone their own game.",
  ],
  hl1: ["Higher or lower", "A guessing game that finds one number in a few taps.", "No typing needed."],
  house: [
    "Our household",
    "Everyone in your home added together.",
    "It shows the shared picture, and what happens if one income stops.",
  ],
  hrs: [
    "Your real hourly wage",
    "What you really earn per hour, after travel time and work costs.",
    "It lets you price things in hours of your life.",
  ],
  import: [
    "Fill it in from a statement",
    "Reads a file from your bank and adds up your spending.",
    "It saves you from typing. The file stays on your phone.",
  ],
  keynums: [
    "Key numbers",
    "The numbers money people talk about, worked out for you.",
    "It shows where you stand on each one.",
  ],
  know: [
    "What you already know",
    "Everything about your money you have nailed down so far.",
    "It shows what is done and the next thing to find out.",
  ],
  l1: [
    "Three quick games",
    "Your gear, your people, and your numbers.",
    "Together they take about two minutes and build your first picture.",
  ],
  ladder: [
    "If the pay stopped",
    "Your own money, in the order you would reach for it.",
    "It shows how long you could last.",
  ],
  lever: [
    "Which lever matters most",
    "Six ways to move your money forward, each in dollars a year.",
    "It shows which change is worth the most to you.",
  ],
  life: [
    "Make it exact",
    "A few questions about your future, like a pension.",
    "They make your long-term plan sharper.",
  ],
  lvq: [
    "Guess which one wins",
    "Five quick guesses about what grows money most.",
    "You learn the rule. Nothing is lost for a miss.",
  ],
  mcq: [
    "Money Chart questions",
    "Short statements. You say how true each one is for you.",
    "Your answers draw your Money Chart.",
  ],
  metric: [
    "One key number",
    "One number, what it means, and what people say is healthy.",
    "You choose whether to work on it.",
  ],
  mlog: ["Money log", "A list of every money move you logged.", "It is your record, month by month."],
  month: ["Monthly session", "A ten-minute check once a month.", "You update what changed. The rest stays."],
  months: ["The next few months", "What is coming up, month by month.", "It is for seeing ahead."],
  move: ["One move", "One change, tried on your numbers.", "Nothing changes until you choose it."],
  moves: [
    "Try a move",
    "A list of changes you could make, tried on your numbers.",
    "It shows what each would do before you do it.",
  ],
  mt: ["Money type", "Short statements about how you handle money.", "It finds your money type."],
  mult: [
    "The multipliers board",
    "The extras a dollar can pick up, like a match at work or card rewards.",
    "It adds up what they are worth to you in a year.",
  ],
  node: ["One step", "One thing to do, with how to do it.", "Mark it done when it is done."],
  nwg: [
    "Same page",
    "Questions two people answer apart, then compare.",
    "It shows where you agree about money and where you differ.",
  ],
  onepage: ["One page for a planner", "Your whole money picture on one page.", "It is for showing a planner or coach."],
  owed: [
    "What each debt costs you",
    "The interest still to come on each debt.",
    "It shows that cost as months of your life.",
  ],
  party: ["Your people", "The people your money touches.", "It is for telling the game who you share money with."],
  pay: ["Payday round", "A few taps when a paycheck lands.", "It splits the paycheck on purpose."],
  people: ["Who are you looking at?", "The people in this game.", "Tap a name to switch to their numbers."],
  plpost: ["After payday", "A quick check on how payday went.", "The plan learns from it. No guilt either way."],
  plpre: ["Before payday", "What this paycheck is for.", "Pick up to three jobs for it."],
  plst: ["Plan it", "Pick a day for a step, or say it is done.", "It puts the step on your calendar."],
  quick: ["Quick math", "Fast answers to common money questions.", "It uses your own pay."],
  reveal: [
    "Meet your character",
    "Your money picture as a character sheet.",
    "It shows your strengths and what to build next.",
  ],
  review: ["Yearly review", "A look back and ahead, once a year.", "You pick the date."],
  rough: ["Close numbers", "Numbers that are close but not exact.", "You can make each one exact here."],
  rt: ["Something that repeats", "A task that comes back on a schedule.", "It shows up under Today on its day."],
  safe: [
    "Is it safe to spend this?",
    "A check before you buy something.",
    "It always answers with a trade-off, never a flat no.",
  ],
  setup: ["Getting started", "A few taps about you.", "No numbers yet. It builds your starting picture."],
  share: ["Share card", "A picture of a win you can screenshot.", "It shows no dollar amounts."],
  sharp: [
    "Make your numbers real",
    "One number at a time, checked against your real accounts.",
    "Real numbers make every other screen right.",
  ],
  sign: [
    "Before you sign",
    "Four questions about a loan you are thinking about.",
    "It shows what the loan really costs you.",
  ],
  since: [
    "Since last time",
    "What you did last visit, and what moved since.",
    "It is for picking up where you left off.",
  ],
  skill: ["One skill", "One thing to learn or do, with why it matters.", "Mark it done when it is done."],
  study: ["Student loan plans", "A few questions about your student loans.", "It puts the payment plans side by side."],
  subs: [
    "Find your subscriptions",
    "Common subscriptions. Tap the ones you pay for.",
    "It adds up what they cost you.",
  ],
  thinkaloud: [
    "Tester drives",
    "A think-aloud test the tester runs alone.",
    "It counts the taps of each task and keeps Report this open.",
  ],
  testkit: [
    "Test with a friend",
    "A script for watching someone try the game.",
    "It is for finding what confuses people.",
  ],
  tier: [
    "Tier list",
    "Rank your spending by how much joy it gives.",
    "It shows where your money buys the most happiness.",
  ],
  together: [
    "Money Chart, together",
    "Everyone's Money Chart side by side.",
    "It shows who leans on what. Nobody is ranked.",
  ],
  tour: ["A quick tour", "Three screens that show where things are.", "You can skip it."],
  tp: [
    "What your hours are worth",
    "Ten quick choices between money and time.",
    "They find what an hour of your time is worth to you.",
  ],
  values: [
    "Is my money going where I want?",
    "What matters to you, next to where your money goes.",
    "It shows how well the two line up.",
  ],
};
(() => {
  const G0 = {};
  Object.keys(NV_INFO).forEach(k => {
    const x = NV_INFO[k];
    G0["scr_" + k] = [x[0], x[1] + " " + x[2]];
  });
  Object.assign(GLOSS, G0);
})();
function nvPos(w) {
  const p = {};
  NV_KEYS.forEach(k => {
    if (w[k] !== undefined && typeof w[k] !== "object") p[k] = w[k];
  });
  if (w.pp) p.pp = { r: w.pp.r, i: w.pp.i, q: w.pp.q };
  return p;
}
const NV_FID = new WeakMap();
let NV_N = 0;
function nvFid(f) {
  if (typeof f !== "function") return 0;
  let n = NV_FID.get(f);
  if (!n) {
    n = ++NV_N;
    NV_FID.set(f, n);
  }
  return n;
}
function nvSig(w) {
  return w.kind + "|" + JSON.stringify(nvPos(w)) + "#" + nvFid(SH);
}
function nvTrack() {
  if (!SH || !W) {
    NVX.st = [];
    NVX.fw = [];
    return;
  }
  if (NVX.go) return;
  const sig = nvSig(W),
    top = NVX.st[NVX.st.length - 1];
  if (top && top.sig === sig) {
    top.W = W;
    top.SH = SH;
    return;
  }
  NVX.st.push({ sig, SH, W, pos: nvPos(W) });
  if (NVX.st.length > 40) NVX.st.shift();
  NVX.fw = [];
}
function nvApply(t) {
  if (t.W !== W) W = t.W;
  NV_KEYS.forEach(k => {
    if (k in t.pos) W[k] = t.pos[k];
    else if (W[k] !== undefined && typeof W[k] !== "object") delete W[k];
  });
  if (t.pos.pp) W.pp = { r: t.pos.pp.r, i: t.pos.pp.i, q: t.pos.pp.q };
  W.pad = null;
  SH = t.SH;
}
/* nvRow(small) makes the top row of a sheet: Back, Forward, Close. nvRowBase() is the part from this file. */
function nvRow(small) {
  let h = nvRowBase(small);
  if (typeof nvRowTidy === "function") h = nvRowTidy(h); /* tidy.js: where you came from, the progress track */
  return h;
}
function nvRowBase(small) {
  const k = W && W.kind,
    info =
      k &&
      NV_INFO[k] &&
      !/data-a="info"/.test(small) &&
      !/^(In plain words|Glossary|What it means)/.test(String(small).trim());
  return `<div class="row between nvhead"><span class="row" style="gap:6px;flex:none"><button class="ghost slim backbtn" data-a="navback">‹ Back</button>${typeof nvRowHome === "function" ? nvRowHome() : "" /* results.js: Home */}${typeof menuSheet === "function" && SH === menuSheet ? "" : `<button class="ghost slim nvmenu" data-a="menu" aria-label="Menu">☰</button>`}${NVX.fw.length ? `<button class="ghost slim" data-a="navfwd" aria-label="Forward to where you were">›</button>` : ""}</span><span class="tiny muted nvsmall">${small}</span><span class="row" style="gap:6px;flex:none">${typeof nvRowQuest === "function" && !(typeof fwCalm === "function" && fwCalm()) ? nvRowQuest() : "" /* firstweek.js: in the first week Where am I waits in the menu */}${info ? `<button class="ghost slim nvi" data-a="info" data-k="gloss:scr_${k}" aria-label="What is this screen?">i</button>` : ""}<button class="ghost slim" data-a="navclose" aria-label="Close">✕</button></span></div>`;
}
const NV_HEAD =
  /<div class="row between"><span class="tiny muted">([\s\S]*?)<\/span><button class="ghost slim" data-a="close">Close<\/button><\/div>/;
/* nvText(h) puts the top row and plain button words in the HTML of a sheet. nvTextBase() is the part from this file. */
function nvText(h) {
  let o = nvTextBase(h);
  /* tidy.js: a top row on each sheet, full height for some sheets */
  if (typeof nvTextTidy === "function") o = nvTextTidy(o);
  return o;
}
function nvTextBase(h) {
  return h
    .replace(NV_HEAD, (m, small) => nvRow(small))
    .replace(/(<button[^>]*data-a=")close("[^>]*>)Got it(<\/button>)/g, (m, x, y, z) =>
      NVX.st.length > 1 ? x + "navback" + y + "Got it, go back" + z : m
    )
    .replace(/(<button[^>]*data-a="close"[^>]*>)Done(<\/button>)/g, "$1Done, close this$2")
    .replace(/(<button[^>]*data-a="close"[^>]*>)Close(<\/button>)/g, "$1Close this$2");
}
/* Part of drawSheetOnce() in ui.js. Records the sheet in the trail. Then draws the row Back / Forward / Close. */
function drawSheetNav() {
  nvTrack();
  nvPaint();
}

/* Part of closeSheet() in ui.js. Forgets the trail of sheets (Back and Forward). */
function closeSheetNav() {
  NVX.st = [];
  NVX.fw = [];
}

function nvPaint() {
  if (!SH || typeof document === "undefined" || !document.querySelector) return;
  const el = document.querySelector("#ov");
  if (!el) return;
  const sh = el.querySelector ? el.querySelector(".sheet") : null;
  if (!sh) {
    if (typeof el.innerHTML === "string" && el.innerHTML) el.innerHTML = nvText(el.innerHTML);
    return;
  }
  const cb = sh.querySelector('.row.between>[data-a="close"]');
  if (cb && cb.parentNode && !cb.parentNode.classList.contains("nvhead")) {
    const sp = cb.parentNode.querySelector("span");
    cb.parentNode.outerHTML = nvRow(sp ? sp.innerHTML : "");
  }
  Array.prototype.slice.call(sh.querySelectorAll('[data-a="close"]')).forEach(b => {
    const t = (b.textContent || "").trim();
    if (t === "Got it" && NVX.st.length > 1) {
      b.dataset.a = "navback";
      b.textContent = "Got it, go back";
    } else if (t === "Done") b.textContent = "Done, close this";
    else if (t === "Close") b.textContent = "Close this";
  });
}
function nvGo(t) {
  nvApply(t);
  const keepSt = NVX.st.slice(),
    keepFw = NVX.fw.slice();
  NVX.go = true;
  try {
    drawSheet();
  } catch (e) {
    NVX.go = false;
    closeSheet();
    return;
  }
  NVX.go = false;
  NVX.st = keepSt;
  NVX.fw = keepFw;
  const top = NVX.st[NVX.st.length - 1];
  if (top && SH && W) {
    top.sig = nvSig(W);
    top.pos = nvPos(W);
    top.W = W;
    top.SH = SH;
  }
  nvPaint();
}
Object.assign(ACT, {
  navback: () => {
    if (NVX.st.length <= 1) {
      closeSheet();
      if (typeof render === "function") render();
      return;
    }
    const cur = NVX.st.pop();
    NVX.fw.push(cur);
    nvGo(NVX.st[NVX.st.length - 1]);
  },
  navfwd: () => {
    if (!NVX.fw.length) return;
    const t = NVX.fw.pop();
    NVX.st.push(t);
    nvGo(t);
  },
  navclose: () => {
    closeSheet();
    if (typeof render === "function") render();
  },
});
/* opening an explanation used to leave a floating "Back to ..." chip that could sit on top of the next screen. Back does that job now. The chip still appears when you switch tabs in the middle of a task. */
["info", "glossary"].forEach(n => {
  const f = ACT[n];
  if (f)
    ACT[n] = t => {
      const r = f(t);
      if (typeof UX_RET !== "undefined" && UX_RET) {
        UX_RET = null;
        if (typeof uxChip === "function") uxChip();
      }
      return r;
    };
});
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
