/* ============================================================================
   SLAM the Game: features/life.js
   PURPOSE     Five play parts (run Not built, groups 1 to 5, Part 10b). (1) The daily life-sim challenge:
               after the daily question, one surprise cost at the player's level, sized in days of their own
               spending, and three ways to meet it with what each way leaves. Practice only: no number of
               the profile changes. (2) Roots and branches: the past (the saved check-ins, the steps done,
               the proof kept) as the roots and the trunk, today, and four futures as branches. (3) Proof on
               steps: a done step can keep a proof (what kind, and a number or a date), with the line "How
               you know it's done" of the step. (4) Theme blends: one theme's words with lines and step names
               mixed in from a second theme. (5) The book curator: books from the library of famous money
               ideas, matched to the track of the step.
   INPUT       The profile (c.x.ls, c.x.proof, c.hist, c.skills), G.voice2, derive(), candidates().
   OUTPUT      LS_CHALLENGES, BC_BOOKS. Functions: lsLevel, lsPick, lsToday, lsRun, lsCardApr, lsDailyPart,
               lsSheet, rbData, rbSheet, pfOf, pfCount, pfStepPart, pfSheet, tbBlend, tbVO, tbPick,
               tbBlendPart, bcFor, bcStepPart, bcSheet, lifeBook. Parts of functions in other files:
               lsDailyPart (dqSheet in games2.js), pfStepPart and bcStepPart (skillSheetBase in ui.js), tbVO
               (VO in ui.js), tbPick (stepThemed and BT in ui.js), tbBlendPart (themeCard in ui.js).
               Named functions Home can call later: lsToday, rbData, pfCount, bcFor. Actions (ACT): lsopen,
               lsway, lsrate, roots, pfkind, pfnum, pfdel, proofs, tbmix, books. Menu: "Daily challenge",
               "Roots and branches", "Proof you kept", "Books for your next step".
   DEPENDS ON  core/report.js, core/play.js (plChallenge, plChallengeCost), core/engine.js (derive, yearsTo,
               treeSize, nextSkill, skillDone, candidates), screens/ui.js (THEMES, VC, money, esc, head,
               sheet), screens/dash.js (the kit), features/ideas*.js (IG: the books), the debts (c.debts: a card's rate).
   RULES       No profile number is changed by the challenge. A guess gets no verdict. A book row names an
               idea of the library, and the idea's own "by" line names the book (tests/play-and-people.js).
   ========================================================================= */

/* ---------- (1) The daily life-sim challenge ---------- */
/* Each challenge: id, t (what happens), days (its size in days of the player's own spending), from and to (the eras
   it fits), no (true: saying no is one of the ways). The words are the game's own. */
const LS_CHALLENGES = [
  { id: "ticket", t: "A parking ticket on the windshield", days: 1, from: 0, to: 9 },
  { id: "flat", t: "A flat tire on the way to work", days: 2, from: 0, to: 6 },
  { id: "show", t: "Tickets to a show you love went on sale today", days: 3, from: 0, to: 9, no: true },
  { id: "phone", t: "Your phone screen cracked", days: 4, from: 0, to: 9 },
  { id: "tooth", t: "A filling the dentist says cannot wait", days: 5, from: 1, to: 9 },
  { id: "vet", t: "The cat ate something it should not have", days: 6, from: 1, to: 9 },
  { id: "home", t: "A last-minute trip home for a family day", days: 8, from: 1, to: 9, no: true },
  { id: "wedding", t: "A friend asks you to be in their wedding", days: 10, from: 1, to: 9, no: true },
  { id: "fridge", t: "The fridge stopped cooling", days: 12, from: 2, to: 9 },
  { id: "laptop", t: "The laptop you work on will not turn on", days: 15, from: 2, to: 9 },
  { id: "roof", t: "A leak in the roof after a storm", days: 30, from: 4, to: 9 },
  { id: "hvac", t: "The heat stopped on the coldest week", days: 45, from: 5, to: 9 },
];
const LS_WAYS = [
  ["cushion", "From your cushion"],
  ["card", "On a card, paid off in 3 months"],
  ["half", "Half from the cushion, half on a card"],
];
function lsX(c) {
  c.x = c.x || {};
  return (c.x.ls = c.x.ls || { n: 0 });
}
/* The player's level for the challenge: the era of the plan. */
function lsLevel(c, d) {
  return Math.max(0, Math.min(9, (d || derive(c)).era || 0));
}
/* The challenge of a day: the same one all day, a new one each day, from those that fit the level. */
function lsPick(c, d, day) {
  const lv = lsLevel(c, d),
    fit = LS_CHALLENGES.filter(x => lv >= x.from && lv <= x.to),
    s = String(day || todayISO()).replace(/-/g, ""),
    h = s.split("").reduce((t, ch) => (t * 31 + ch.charCodeAt(0)) % 9973, 7);
  return fit[h % fit.length] || LS_CHALLENGES[0];
}
/* The card rate the card way uses: the highest rate of the player's cards, or the rate they tapped today. */
function lsCardApr(c) {
  try {
    const st = lsX(c);
    if (st.rate != null && st.d === todayISO()) return { apr: st.rate / 100, tapped: true };
    const rates = (c.debts || [])
        .filter(x => /card/i.test(x.k || "") && x.rate != null && +x.rate > 0)
        .map(x => +x.rate),
      r = rates.length ? Math.max(...rates) : null;
    return r ? { apr: r / 100, tapped: false } : { apr: null, tapped: false };
  } catch (e) {
    report(e, "life.js: lsCardApr");
    return { apr: null, tapped: false };
  }
}
/* Today's challenge on the player's numbers. Home can call this later (one line: today's challenge). */
function lsToday(c) {
  const d = derive(c),
    x = lsPick(c, d),
    cost = plChallengeCost(x.days, c.spend),
    A = lsCardApr(c),
    R = plChallenge({ cost, cash: Math.max(0, d.cash), spendMonth: c.spend, cardApr: A.apr }),
    st = lsX(c);
  return {
    x,
    cost,
    R,
    A,
    done: st.d === todayISO() && st.id === x.id ? st.way : null,
    n: st.n || 0,
    lv: lsLevel(c, d),
  };
}
/* One way, as a small tile: what it takes from the cushion, what goes on a card, the months of cushion left. */
function lsWayTile(w, o, L) {
  const card = o.fromCard > 0,
    extra = o.card
      ? "About " + money(o.card.interest) + " of interest, " + money(o.card.payment) + " a month for 3 months"
      : card
        ? "Tap your card's rate to see the interest"
        : "No interest";
  return `<div class="tile stack" style="gap:2px"><b class="small">${esc(L)}</b><div class="tiny">${o.fromCash > 0 ? money(o.fromCash) + " from the cushion" : "Nothing from the cushion"}${card ? ", " + money(o.fromCard) + " on a card" : ""}</div><div class="tiny muted">${esc(extra)}. Cushion after: ${o.monthsAfter.toFixed(1)} months of spending.</div></div>`;
}
/* The challenge body (the daily question and its own sheet show the same). */
function lsRun(c) {
  const T = lsToday(c),
    R = T.R;
  if (!R.ready)
    return dkCard(
      "Daily challenge",
      `<div class="small">${esc(T.x.t)}.</div><div class="tiny muted">It needs ${esc(R.needs.join(" and "))} first. A guess is fine.</div><button class="ghost wide slim" data-a="sharp">Add a rough number</button>`
    );
  const ways = LS_WAYS.concat(T.x.no ? [["no", "Say no this time"]] : []);
  const picked = T.done;
  const body =
    `<div class="small"><b>${esc(T.x.t)}.</b> It costs about ${money(T.cost)}: ${Math.round(R.days)} days of your spending.</div>` +
    `<div class="tiny muted">Practice. Nothing in your plan changes. You have ${R.ways.cushion.monthsBefore.toFixed(1)} months of spending in cash today.</div>` +
    (R.cardApr == null
      ? `<div class="small" style="margin-top:6px">Your card's rate, for the card way </div><div class="chips">${[18, 22, 25, 29].map(r => `<button class="chip" data-a="lsrate" data-v="${r}">${r}%</button>`).join("")}</div>`
      : `<div class="tiny muted">The card way uses ${Math.round(R.cardApr * 1000) / 10}% a year${T.A.tapped ? ", the rate you tapped" : ", your highest card rate"}.</div>`) +
    (picked
      ? `<div class="tile small" data-fid="ls:picked"><b>You picked: ${esc((ways.find(w => w[0] === picked) || [, ""])[1])}.</b> ${picked === "no" ? "The cushion stays at " + R.ways.cushion.monthsBefore.toFixed(1) + " months." : "Cushion after: " + R.ways[picked].monthsAfter.toFixed(1) + " months of spending" + (R.ways[picked].card ? ", and about " + money(R.ways[picked].card.interest) + " of interest" : "") + "."} A new one comes tomorrow.</div>`
      : "") +
    `<details class="math" ${picked ? "" : "open"}><summary>The ways, side by side</summary><div class="inner stack" style="gap:6px">${LS_WAYS.map(w => lsWayTile(w[0], R.ways[w[0]], w[1])).join("")}</div></details>` +
    (picked
      ? ""
      : `<div class="stack" style="gap:6px">${ways.map(w => `<button class="ghost wide" data-a="lsway" data-v="${w[0]}">${esc(w[1])}</button>`).join("")}</div>`) +
    `<details class="math"><summary>Show the math</summary><div class="inner tiny stack" style="gap:4px"><div>Size: ${money(c.spend)} a month ÷ 30 × ${T.x.days} days = ${money(T.cost)} (to the nearest $10)</div><div>Cushion in months: cash ÷ ${money(c.spend)} a month</div><div>The card: 3 equal payments at the rate a year ÷ 12 each month</div></div></details>`;
  return dkCard("Daily challenge", body, {
    right: dkPill("Level " + (T.lv + 1)),
    cap: T.n ? T.n + " played so far" : "One a day, at your level",
  });
}
/* Part of dqSheet() in games2.js: after the daily question, the challenge of the day. */
function lsDailyPart(c) {
  try {
    if (!c.placed || G.demo) return "";
    return lsRun(c);
  } catch (e) {
    report(e, "life.js: lsDailyPart");
    return "";
  }
}
function lsSheet() {
  const c = C();
  return (
    head("Daily challenge", "Today's surprise") +
    dkCaption("One surprise cost a day, at your level. Pick a way and see what it leaves.") +
    (c.placed ? lsRun(c) : `<div class="tile small">Finish the first setup and the challenges start.</div>`) +
    `<button class="ghost wide slim" data-a="close">Done</button>`
  );
}

/* ---------- (2) Roots and branches ---------- */
/* The numbers of the tree. Home can call this later. Roots: the saved check-ins (c.hist), the steps done, the proof
   kept. Trunk: today. Branches: the years to work optional (yearsTo, the same as the plan) at four paces. */
function rbData(c) {
  const d = derive(c),
    h = (c.hist || []).filter(x => x && x.d),
    first = h[0] || null,
    steps = Object.keys(c.skills || {}).filter(k => c.skills[k]).length,
    tracks =
      typeof TREES !== "undefined" && typeof SKILLS !== "undefined" ? Object.keys(TREES).filter(t => SKILLS[t]) : [],
    full = tracks.filter(t => nextSkill(c, t) < 0),
    yrs = s => yearsTo(c.inv, s, d.fi),
    ten = Math.round((c.take || 0) * 0.1) * 12;
  const branches = [
    { id: "now", n: "As you are", save: d.save, yrs: yrs(d.save) },
    { id: "plus100", n: "$100 more a month", save: d.save + 1200, yrs: yrs(d.save + 1200) },
    { id: "plus10", n: "10% more of take-home", save: d.save + ten, yrs: yrs(d.save + ten) },
    { id: "pause", n: "A year with no saving, then as you are", save: d.save, yrs: d.yrs == null ? null : d.yrs + 1 },
  ];
  return {
    d,
    first,
    hist: h,
    series: h.map(x => x.nw),
    steps,
    full: full.length,
    proof: pfCount(c),
    trunk: { nw: d.nw, yrs: d.yrs, age: c.age },
    branches,
  };
}
function rbSheet() {
  const c = C(),
    R = rbData(c),
    yr = v => (v == null ? "past 80 years" : v === 0 ? "now" : v + (v === 1 ? " year" : " years"));
  const roots = dkCard(
    "Roots: where you came from",
    (R.first
      ? `<div class="small">Your first saved check-in was ${esc(nice(R.first.d))}, at ${money(R.first.nw)} of net worth.</div>`
      : `<div class="small">Your first check-in becomes the first root.</div>`) +
      (R.series.length > 1 ? dkArea(R.series, { label: "Net worth at each check-in" }) : "") +
      dkStatRow([
        dkTile("Check-ins saved", String(R.hist.length)),
        dkTile("Steps done", String(R.steps)),
        dkTile("Tracks finished", String(R.full)),
        dkTile("Steps with proof", String(R.proof), { act: "proofs" }),
      ])
  );
  const trunk = dkCard(
    "The trunk: today",
    `<div class="small">${money(R.trunk.nw)} of net worth. Work optional: ${esc(yr(R.trunk.yrs))}${R.trunk.yrs ? " (about age " + (R.trunk.age + R.trunk.yrs) + ")" : ""}.</div>`
  );
  const br = dkCard(
    "Branches: futures from here",
    `<div class="stack" style="gap:6px">${R.branches.map(b => `<div class="row between small" data-fid="rb:${b.id}"><span>${esc(b.n)}<div class="tiny muted">${money(b.save)} a year into the plan</div></span><b>${esc(yr(b.yrs))}</b></div>`).join("")}</div>` +
      `<details class="math"><summary>Show the math</summary><div class="inner tiny stack" style="gap:4px"><div>Each branch grows what you have invested (${money(c.inv)}) by the plan's return each year, adds that year's saving, and counts the years to the full number (${money(R.d.fi)}).</div><div>The same count as the date on Home.</div></div></details>` +
      `<button class="ghost wide slim" data-a="blocks">Try a life event as a branch</button>`,
    { cap: "The same roots feed every branch. Only the pace changes." }
  );
  return (
    head("Roots and branches", "Your past is the trunk of your futures") +
    roots +
    trunk +
    br +
    `<button class="ghost wide slim" data-a="close">Done</button>`
  );
}

/* ---------- (3) Proof on steps ---------- */
const PF_KINDS = [
  ["num", "A number I can see now"],
  ["shot", "A screenshot I kept"],
  ["paper", "A statement or receipt"],
  ["seen", "Someone saw it with me"],
];
function pfOf(c, id) {
  return (c.x && c.x.proof && c.x.proof[id]) || null;
}
/* How many done steps keep a proof. Home can call this later. */
function pfCount(c) {
  const P = (c.x && c.x.proof) || {};
  return Object.keys(P).filter(id => skillDone(c, id)).length;
}
/* Part of skillSheetBase() in ui.js: on a done step, the proof (optional). */
function pfStepPart(c, id, done) {
  try {
    if (!done || G.demo) return "";
    const p = pfOf(c, id),
      s = SKILLS[id.split(":")[0]].skills[+id.split(":")[1]];
    return dkCard(
      "Proof (optional)",
      `<div class="tiny muted">How you know it's done: ${esc(s[2])}</div>` +
        (p
          ? `<div class="small" data-fid="pf:kept"><b>Kept:</b> ${esc((PF_KINDS.find(k => k[0] === p.k) || [, ""])[1])}${p.n != null ? ", " + money(p.n) : ""}, on ${esc(nice(p.d))}.</div><button class="ghost wide slim" data-a="pfdel" data-v="${id}">Take the proof off</button>`
          : `<div class="chips">${PF_KINDS.map(k => `<button class="chip" data-a="pfkind" data-k="${id}" data-v="${k[0]}">${esc(k[1])}</button>`).join("")}</div>`) +
        (p && p.k === "num"
          ? `<div class="field"><label class="small" for="pfnum">The number you see</label><input id="pfnum" type="number" inputmode="decimal" value="${p.n == null ? "" : p.n}"><div class="tiny muted">A balance or an amount. Only you and the people you share with see it.</div></div><button class="ghost wide slim" data-a="pfnum" data-v="${id}">Keep the number</button>`
          : ""),
      { cap: "A step is done when you say it is. A proof is for you, for later." }
    );
  } catch (e) {
    report(e, "life.js: pfStepPart");
    return "";
  }
}
function pfSheet() {
  const c = C(),
    P = (c.x && c.x.proof) || {},
    ids = Object.keys(P).filter(id => skillDone(c, id));
  return (
    head("Proof you kept", ids.length + (ids.length === 1 ? " step with proof" : " steps with proof")) +
    (ids.length
      ? `<div class="stack" style="gap:6px">${ids
          .map(id => {
            const p = P[id],
              s = SKILLS[id.split(":")[0]].skills[+id.split(":")[1]];
            return `<button class="rowbtn" data-a="skill" data-v="${id}"><span><b>${esc(s[0])}</b><div class="tiny muted">${esc((PF_KINDS.find(k => k[0] === p.k) || [, ""])[1])}${p.n != null ? ", " + money(p.n) : ""}, ${esc(nice(p.d))}</div></span><span class="caret"><i class=chev aria-hidden=true></i></span></button>`;
          })
          .join("")}</div>`
      : `<div class="tile small">No proof kept yet. Open a done step and tap the kind of proof you have.</div>`) +
    `<button class="ghost wide slim" data-a="close">Done</button>`
  );
}

/* ---------- (4) Theme blends ---------- */
/* Two voices as one: every word of the main voice, the words it lacks from the second, and the praise and the
   whispers taken in turn from both. */
function tbBlend(A, B) {
  const mix = (a, b) => {
    const out = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i]) out.push(a[i]);
      if (b[i]) out.push(b[i]);
    }
    return out;
  };
  const o = Object.assign({}, B, A);
  o.praise = mix(A.praise || [], B.praise || []);
  o.whisper = mix(A.whisper || [], B.whisper || []);
  if (!o.praise.length) delete o.praise;
  if (!o.whisper.length) delete o.whisper;
  return o;
}
let TB_CACHE = null;
/* The second voice, when it is set, can be used and differs from the main voice. */
function tbSecond() {
  try {
    const v = G && G.voice2;
    return v && THEMES[v] && v !== VC() && typeof thUse === "function" && thUse(v, null) === v ? v : null;
  } catch (e) {
    report(e, "life.js: tbSecond");
    return null;
  }
}
/* Part of VO() in ui.js: the blended voice, or null for the plain one. */
function tbVO() {
  const b = tbSecond();
  if (!b) return null;
  const k = VC() + "+" + b;
  if (!TB_CACHE || TB_CACHE.k !== k) TB_CACHE = { k, v: tbBlend(THEMES[VC()], THEMES[b]) };
  return TB_CACHE.v;
}
/* Part of stepThemed() and BT() in ui.js: the entry of a table for the main voice, or for the second voice when the
   main voice has none (Rings has no step names of its own; blended with Tabletop, the steps get Tabletop's). */
function tbPick(map) {
  if (!map) return null;
  const a = map[VC()];
  if (a) return a;
  const b = tbSecond();
  return b ? map[b] || null : null;
}
/* Part of themeCard() in ui.js, inside "Blend two themes": the second voice to mix in. */
function tbBlendPart(ids) {
  const v2 = tbSecond();
  return q(
    "Mixes in words from",
    `<div class="chips"><button class="chip ${v2 ? "" : "on"}" data-a="tbmix" data-v="">No blend</button>${ids
      .filter(t => t !== VC() && t !== "sapphire")
      .map(t => `<button class="chip ${v2 === t ? "on" : ""}" data-a="tbmix" data-v="${t}">${THEMES[t].n}</button>`)
      .join("")}</div>`,
    "The praise and the whispers come from both. Words and step names the first voice lacks come from the second."
  );
}

/* ---------- (5) The book curator ---------- */
/* Books in the library of famous money ideas (features/ideas*.js), each with the idea that tells it and the tracks it
   fits. The tracks are SLAM's own reading by topic. The title is in the idea's own "by" line. */
const BC_BOOKS = [
  {
    idea: "bach",
    title: "The Automatic Millionaire",
    trees: ["main-path", "cash-safety-net", "financial-ops-tooling"],
  },
  { idea: "trench", title: "Set for Life", trees: ["main-path", "income-career", "real-estate"] },
  { idea: "sabatier", title: "Financial Freedom", trees: ["side-hustles", "income-career", "time-capital"] },
  {
    idea: "shen",
    title: "Quit Like a Millionaire",
    trees: ["main-path", "geo-arbitrage-location", "withdrawal-decumulation"],
  },
  { idea: "hester", title: "Work Optional", trees: ["pre-retirement-design", "withdrawal-decumulation"] },
  { idea: "wci", title: "The White Coat Investor", trees: ["debt-leverage", "insurance-protection", "income-career"] },
  { idea: "newport", title: "So Good They Can't Ignore You", trees: ["income-career"] },
  { idea: "hormozi", title: "$100M Offers", trees: ["entrepreneurship", "side-hustles"] },
  { idea: "naval", title: "The Almanack of Naval Ravikant", trees: ["entrepreneurship", "knowledge"] },
  { idea: "sanchez", title: "Main Street Millionaire", trees: ["entrepreneurship"] },
  { idea: "guillebeau", title: "The $100 Startup", trees: ["side-hustles", "entrepreneurship"] },
  { idea: "brooks", title: "From Strength to Strength", trees: ["the-long-game", "pre-retirement-design"] },
  { idea: "minir", title: "The 4-Hour Workweek", trees: ["time-capital"] },
  { idea: "pricebook", title: "The Tightwad Gazette", trees: ["deals-smart-buying"] },
  { idea: "flanders", title: "The Year of Less", trees: ["money-psychology", "deals-smart-buying"] },
  { idea: "babylon", title: "The Richest Man in Babylon", trees: ["main-path", "money-psychology"] },
  { idea: "hours168", title: "168 Hours", trees: ["time-capital"] },
  { idea: "hack", title: "The House Hacking Strategy", trees: ["real-estate"] },
  { idea: "clear", title: "Atomic Habits", trees: ["money-psychology", "financial-ops-tooling"] },
  { idea: "future", title: "Your Future Self", trees: ["money-psychology", "the-long-game"] },
  { idea: "duke", title: "Thinking in Bets", trees: ["alternatives-speculation", "knowledge", "storms-windfalls"] },
  { idea: "bloom", title: "The 5 Types of Wealth", trees: ["social-capital", "the-long-game"] },
  { idea: "robbins", title: "Money: Master the Game", trees: ["portfolio-design"] },
  { idea: "twist", title: "The Soul of Money", trees: ["family-generational-wealth", "money-psychology"] },
  { idea: "weeks", title: "Four Thousand Weeks", trees: ["time-capital", "the-long-game"] },
  { idea: "lieber", title: "The Opposite of Spoiled", trees: ["family-generational-wealth"] },
  { idea: "moneydate", title: "Her First $100K", trees: ["social-capital", "family-generational-wealth"] },
];
/* The books for a track, or for a step id ("tree:index"). Home can call this later. */
function bcFor(idOrTree) {
  const t = String(idOrTree || "").split(":")[0];
  return BC_BOOKS.filter(b => b.trees.includes(t) && typeof IG !== "undefined" && IG[b.idea]);
}
function bcRow(b) {
  const I = IG[b.idea];
  return `<button class="rowbtn" data-a="idea" data-v="${b.idea}"><span><b>${esc(b.title)}</b><div class="tiny muted">${esc(I.by)}. The idea in the game: ${esc(I.n)}.</div></span><span class="caret"><i class=chev aria-hidden=true></i></span></button>`;
}
/* Part of skillSheetBase() in ui.js: a book for this step. */
function bcStepPart(c, id) {
  try {
    const B = bcFor(id).slice(0, 2);
    if (!B.length) return "";
    return `<details class="math"><summary>A book for this step</summary><div class="inner stack" style="gap:6px">${B.map(bcRow).join("")}<div class="tiny muted">From the library of famous money ideas, matched by the track of this step.</div></div></details>`;
  } catch (e) {
    report(e, "life.js: bcStepPart");
    return "";
  }
}
function bcSheet() {
  const c = C(),
    all = candidates(c, D, todayISO()).filter(x => x.kind === "skill"),
    seen = {},
    trees = [];
  all.forEach(x => {
    const t = x.id.split(":")[0];
    if (!seen[t] && bcFor(t).length) {
      seen[t] = 1;
      trees.push({ t, step: x });
    }
  });
  return (
    head("Books for your next step", "From the library, matched to your steps") +
    dkCaption("Each book is told as an idea in the game, in plain words. Open it to see it on your numbers.") +
    (trees.length
      ? trees
          .slice(0, 4)
          .map(o =>
            dkCard(
              trackN(o.t),
              `<div class="tiny muted">Your next step here: ${esc(o.step.title)}</div>` +
                bcFor(o.t).slice(0, 3).map(bcRow).join("")
            )
          )
          .join("")
      : `<div class="tile small">No book in the library fits your next steps yet.</div>`) +
    `<button class="ghost wide slim" data-a="close">Done</button>`
  );
}

/* ---------- the spreadsheet of the plan (book.js) ---------- */
/* The numbers of the challenge of the day and of the branches, each with its formula. */
function lifeBook(c) {
  try {
    if (!c.placed) return null;
    const T = lsToday(c),
      d = derive(c),
      rows = [];
    if (T.R.ready) {
      rows.push({ id: "ls_spend", label: "Spending a month", v: c.spend });
      rows.push({ id: "ls_days", label: "Daily challenge: days of spending (" + T.x.t + ")", v: T.x.days });
      rows.push({
        id: "ls_cost",
        label: "Daily challenge: the cost",
        v: T.cost,
        f: "=MAX(10,ROUND({ls_spend}*{ls_days}/30/10,0)*10)",
      });
      rows.push({ id: "ls_cash", label: "Cash today", v: T.R.cash });
      rows.push({
        id: "ls_left",
        label: "Daily challenge: cash left, all from the cushion",
        v: T.R.ways.cushion.cashLeft,
        f: "=MAX(0,{ls_cash}-{ls_cost})",
      });
    }
    rows.push({ id: "rb_save", label: "Branches: saving a year as you are", v: d.save });
    rows.push({
      id: "rb_plus",
      label: "Branches: saving a year with $100 more a month",
      v: d.save + 1200,
      f: "={rb_save}+1200",
    });
    return { title: "Play: the daily challenge and the branches", rows };
  } catch (e) {
    report(e, "life.js: lifeBook");
    return null;
  }
}

Object.assign(ACT, {
  lsopen: () => {
    W = { kind: "ls" };
    sheet(lsSheet);
  },
  lsway: t => {
    const c = C(),
      T = lsToday(c),
      st = lsX(c);
    if (st.d === todayISO() && st.id === T.x.id && st.way) return drawSheet();
    st.n = (st.n || 0) + 1;
    st.d = todayISO();
    st.id = T.x.id;
    st.way = t.dataset.v;
    save();
    drawSheet();
  },
  lsrate: t => {
    const st = lsX(C());
    st.rate = +t.dataset.v;
    st.d = todayISO();
    save();
    drawSheet();
  },
  roots: () => {
    W = { kind: "roots" };
    sheet(rbSheet);
  },
  pfkind: t => {
    const c = C(),
      id = t.dataset.k;
    if (!skillDone(c, id)) return;
    c.x = c.x || {};
    c.x.proof = c.x.proof || {};
    c.x.proof[id] = { k: t.dataset.v, d: todayISO(), n: null };
    save();
    drawSheet();
  },
  pfnum: t => {
    const c = C(),
      p = pfOf(c, t.dataset.v),
      el = typeof document !== "undefined" && document.getElementById ? document.getElementById("pfnum") : null,
      v = el && el.value !== "" ? +el.value : null;
    if (!p) return;
    p.n = v != null && isFinite(v) ? v : null;
    save();
    drawSheet();
  },
  pfdel: t => {
    const c = C();
    if (c.x && c.x.proof) delete c.x.proof[t.dataset.v];
    save();
    drawSheet();
  },
  proofs: () => {
    W = { kind: "proofs" };
    sheet(pfSheet);
  },
  tbmix: t => {
    G.voice2 = t.dataset.v || null;
    TB_CACHE = null;
    save();
    render();
    if (typeof thRedraw === "function") thRedraw();
  },
  books: () => {
    W = { kind: "books" };
    sheet(bcSheet);
  },
});
if (typeof MENU !== "undefined") {
  MENU.push(["Daily challenge", "lsopen", "act", "One surprise cost a day at your level, and three ways to meet it"]);
  MENU.push(["Roots and branches", "roots", "act", "Your past as the trunk, and four futures from here"]);
  MENU.push(["Proof you kept", "proofs", "act", "The done steps with a proof, for later"]);
  MENU.push(["Books for your next step", "books", "act", "Books from the library, matched to your steps"]);
}
