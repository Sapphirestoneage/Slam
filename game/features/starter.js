/* ============================================================================
   SLAM the Game: features/starter.js
   PURPOSE     Starter situations (run CC-1, item 10, Nov 27 2026): ten starting points for a new
               player, each one tap. A starting point fills the answers of the four questions with the
               typical value for the player's age, where the reference data has one for that situation,
               and marks each as a Guess. It fills the setup answers that the situation itself says (for
               example the work of a player who was just laid off), and puts the fitting quests on Next
               Steps. The player confirms on one screen and does not type.
   INPUT       The open sheet of the opening (W.kind cb): W.step starter (the list) and stok (the
               confirm screen), W.o.st (the id of the starting point), W.o.a (the four answers), W.o.wants.
               The profile after it: c.x.cb.st.
   OUTPUT      Data: SIT_LIST (the table of the ten starting points), SIT_KEYS. Functions: sitGet, sitApply
               (the one function that applies a starting point: the screen and the doors of the front
               page call it with a stable id), sitFill, sitEmpty, sitLeft, sitName, sitRows, sitSetupWords.
               Parts of functions in other files: sitRow (wnView in wants.js), sitView and sitOkView
               (cbScreen in couldbe.js), sitNext (cbAnswer in couldbe.js), sitBase (cbMake in couldbe.js),
               sitSetup (ACT.cbrest in couldbe.js), sitLeft (cbLeft in cbguide.js), sitName (cbEntryView in
               couldbe.js). Actions (ACT): sitopen, sitpick, sitskip, sitback, sitchg, sitok.
   DEPENDS ON  core/report.js, core/engine.js (NOT_SURE, TAP_ONE, HOMEMAP, todayISO), screens/ui.js
               (head, esc, sheet, drawSheet), screens/planner.js (plId), features/couldbe.js (CB_QS,
               cbTypical, cbMake, cbLab, cbM, cbFoot, cbSheet, CB), features/cbguide.js (cbNav, cbI,
               cbFold, cbFwdDrop, cbFwdKeep), features/wants.js (WN_LIST, wnPicked), features/kit.js
               (kitPill), features/look.js (lkK), screens/smart.js (smState).
   RULES       A starting point is one row of SIT_LIST. There is no code for one situation. No number is
               made up: a value comes from cbTypical() (the reference data, with its source), and a
               value that has no typical figure for the situation stays empty, so the entry asks it.
               The age has no typical value: it is always asked. A filled value is a Guess, and the
               player can change each one. The setup answers of a starting point are shown filled in
               the rest of setup, where the player confirms or changes them.
   COMPAT      One optional key on a profile: c.x.cb.st, the id of the starting point. An old saved game
               has none, and nothing changes for it.
   ========================================================================= */
/* The setup answers that a starting point can fill, with the words of the confirm screen. */
const SIT_KEYS = {
  work: "Work",
  incKinds: "Money comes from",
  homeQ: "Home",
  live: "Lives with you",
  rel: "Relationship",
  deps: "Relies on you",
  debtKinds: "You owe on",
};
/* THE TEN STARTING POINTS. id: stable, for the doors of the front page. l: the name. one: one line. typ: the
   questions of the entry (spend, inv, save) that take the typical value for the age. A question that is not on the
   list stays empty, and why says the reason. set: the setup answers that the situation itself says. wants: picks of
   What you want (WN_LIST). quests: the actions of the game that fit, for Next Steps. */
const SIT_LIST = [
  {
    id: "laidoff",
    l: "Just laid off",
    one: "Your pay stopped, or it will soon.",
    typ: ["spend", "inv"],
    why: { save: "With no pay, the typical saving of the country does not fit." },
    set: { work: "Between jobs", incKinds: ["Unemployment or benefits"] },
    wants: ["cushion"],
    quests: [
      { a: "transit", t: "See how long your cash lasts with no pay", s: "The number, the tripwires, the plan." },
      { a: "drills", t: "Practice a hard month on your own numbers", s: "A fire drill. Nothing changes in your plan." },
    ],
  },
  {
    id: "newjob",
    l: "New job",
    one: "You started a job, or you start soon.",
    typ: ["spend", "inv", "save"],
    why: {},
    set: { incKinds: ["A main job"] },
    wants: [],
    quests: [
      { a: "benefits", t: "See what your new benefits are worth", s: "The match, the health plans, the rest." },
      { a: "acwhy", t: "Pick which account gets your money first", s: "Roth, traditional, HSA or a regular account." },
    ],
  },
  {
    id: "married",
    l: "Getting married",
    one: "Two lives, one plan.",
    typ: ["spend", "inv", "save"],
    why: {},
    set: { rel: "Partnered", live: ["A partner"] },
    wants: [],
    quests: [
      { a: "estate", t: "See what changes when you marry", s: "Taxes, cover, papers. Married or partners." },
      { a: "fair", t: "Choose how you two share costs", s: "Five fair ways, side by side." },
    ],
  },
  {
    id: "carddebt",
    l: "Card debt",
    one: "A credit card balance that stays from month to month.",
    typ: ["spend", "inv", "save"],
    why: { debt: "The game has no typical card balance with a source. Setup asks yours." },
    set: { debtKinds: ["Credit card balance"] },
    wants: ["debt"],
    quests: [
      { a: "owed", t: "See what each debt costs you", s: "The interest still to come, as months of your life." },
      { a: "ivheat", t: "Invest or pay debt: see it on one grid", s: "Your debt rate next to a return." },
    ],
  },
  {
    id: "parents",
    l: "Living with parents",
    one: "You live with family, at little or no cost.",
    typ: ["inv"],
    why: {
      spend: "Typical spending is for a household that pays for its own home.",
      save: "Typical saving is worked out from typical spending.",
    },
    set: { homeQ: "No cost", live: ["Parents or family"] },
    wants: [],
    quests: [{ a: "family", t: "Look at family money: living at home", s: "Parents and kids at once." }],
  },
  {
    id: "selfemp",
    l: "Self-employed",
    one: "You work for yourself. No tax comes off your pay.",
    typ: ["spend", "inv", "save"],
    why: {},
    set: { work: "Self-employed", incKinds: ["My own business"] },
    wants: [],
    quests: [{ a: "gig", t: "Set tax aside first", s: "Taxes set aside, what one gig pays, your floor." }],
  },
  {
    id: "student",
    l: "Student",
    one: "You study now. Work comes after.",
    typ: ["spend"],
    why: {
      inv: "The typical balance is for families that have a retirement account.",
      save: "The typical saving of the country does not fit a student.",
    },
    set: { work: "Student" },
    wants: [],
    quests: [
      { a: "study", t: "Put your student loan plans side by side", s: "A few questions, then the plans." },
      { a: "career", t: "Look at three early career moves", s: "A course, a credential, the match that stays." },
    ],
  },
  {
    id: "firstapt",
    l: "First apartment",
    one: "Your first place of your own, with rent to pay.",
    typ: ["spend", "inv", "save"],
    why: {},
    set: { homeQ: "I rent" },
    wants: ["cushion"],
    quests: [
      { a: "fwwins", t: "Tick off a few quick wins", s: "Small fixes that stack." },
      { a: "fair", t: "Split rent and bills fairly", s: "For a place you share. Five fair ways." },
    ],
  },
  {
    id: "newbaby",
    l: "New baby",
    one: "A child is here, or on the way.",
    typ: ["spend", "inv", "save"],
    why: { kid: "The game has no typical cost of a baby with a source here. Setup asks your spending." },
    set: { deps: "Kids", live: ["Kids"] },
    wants: ["kids"],
    quests: [
      { a: "cover", t: "Check your insurance gap", s: "The gap in dollars for each kind of cover." },
      { a: "family", t: "Look at family money: kids and tuition", s: "Parents and kids at once." },
    ],
  },
  {
    id: "nearfi",
    l: "Near FI",
    one: "Work is close to being a choice.",
    typ: ["spend"],
    why: {
      inv: "The typical balance is far from yours. The entry asks it.",
      save: "The typical saving of the country does not fit this stage.",
    },
    set: {},
    wants: ["early"],
    quests: [
      { a: "takeout", t: "Plan how you take money out", s: "The order, guardrails, the years before 59 and a half." },
      { a: "odds", t: "Run your plan through random markets", s: "Retirement odds, on your numbers." },
    ],
  },
];

/* ---------- THE DATA ---------- */
function sitGet(id) {
  return SIT_LIST.find(x => x.id === id) || null;
}
function sitName(id) {
  const T = sitGet(id);
  return T ? "Your start: " + T.l : "";
}
/* Fill the open answers of the starting point with the typical value for the age, as the chip "I'm not sure"
   writes it (ACT.cbtyp in couldbe.js). An answer of the player stays. With no age, or no row for the age, nothing
   is filled. Returns the questions it filled. */
function sitFill(w) {
  const T = sitGet(w && w.o && w.o.st),
    a = w && w.o && w.o.a,
    out = [];
  if (!T || !a || !a.age) return out;
  T.typ.forEach(q => {
    if (a[q]) return;
    const V = cbTypical(q, a.age.v);
    if (!V) return;
    a[q] = { v: V.v, cf: 1, typ: true, band: V.band };
    out.push(q);
  });
  return out;
}
/* The questions of the entry that the starting point leaves empty, with the reason: [{ q, why }]. */
function sitEmpty(id) {
  const T = sitGet(id);
  if (!T) return [];
  return ["spend", "inv", "save"].filter(q => !T.typ.includes(q)).map(q => ({ q, why: T.why[q] || "" }));
}
/* Part of cbLeft() in cbguide.js. The taps that are left to the number: one for each open question, and one to
   confirm. Before the age is in, the questions that the typical values will fill do not count. */
function sitLeft(w) {
  const T = sitGet(w.o.st),
    a = w.o.a || {},
    open = CB_QS.filter(Q => !a[Q.id] && (a.age || Q.id === "age" || !T.typ.includes(Q.id))).length;
  return { n: Math.max(1, open + (w.step === "stok" ? 0 : 1)), to: "number" };
}
/* The rows of the confirm screen: the four answers as they are. */
function sitRows(w) {
  const a = (w.o && w.o.a) || {},
    names = {
      age: "Your age",
      spend: "What you spend",
      inv: "What you have invested",
      save: "What you save or invest",
    };
  return CB_QS.map(Q => {
    const x = a[Q.id];
    return {
      q: Q.id,
      name: names[Q.id],
      v: !x ? "" : Q.id === "age" ? String(Math.round(x.v)) : Q.id === "inv" ? cbM(x.v) : cbM(x.v) + " a month",
      typ: !!(x && x.typ),
      band: (x && x.band) || "",
      st: x && x.cf === 3 ? "Exact" : "Guess",
    };
  });
}
/* The setup answers of a starting point, in words: ["Work: Between jobs", ...]. */
function sitSetupWords(id) {
  const T = sitGet(id);
  if (!T) return [];
  return Object.keys(T.set).map(k => SIT_KEYS[k] + ": " + [].concat(T.set[k]).join(", "));
}

/* ---------- THE ONE FUNCTION ---------- */
/* APPLY A STARTING POINT. id: one id of SIT_LIST. For a new player only: it opens the opening when it is not open,
   keeps the id, adds the wants of the starting point to the picks, and goes to the first open question (the age).
   Returns true when it applied. */
function sitApply(id) {
  try {
    const T = sitGet(id);
    if (!T || !G.demo) return false;
    if (!W || W.kind !== "cb") {
      if (typeof cbStart !== "function" || !cbStart()) return false;
    }
    if (!W || W.kind !== "cb" || cbHas(C())) return false;
    const w = W;
    w.o = w.o || {};
    w.o.st = T.id;
    w.o.a = w.o.a || {};
    /* the wants: the picks so far, and the ones of the starting point */
    w.wp = (w.wp || []).concat(T.wants.filter(k => !(w.wp || []).includes(k) && WN_LIST.some(x => x.id === k)));
    w.o.wants = wnPicked(w);
    sitFill(w);
    const miss = CB_QS.findIndex(Q => !w.o.a[Q.id]);
    w.step = miss < 0 ? "stok" : "entry";
    w.q = Math.max(0, miss);
    CB.taps++;
    cbFwdDrop();
    sheet(cbSheet);
    return true;
  } catch (e) {
    report(e, "starter.js: sitApply");
    return false;
  }
}
/* Part of cbAnswer() in couldbe.js. After an answer of a player with a starting point: the typical values come in,
   and the next screen is the first open question, or the confirm screen. Returns true when it drew the screen. */
function sitNext(w) {
  if (!w || !w.o || !sitGet(w.o.st) || w.one) return false;
  sitFill(w);
  const miss = CB_QS.findIndex(Q => !w.o.a[Q.id]);
  if (miss >= 0) {
    w.q = miss;
    drawSheet();
  } else {
    w.step = "stok";
    sheet(cbSheet);
  }
  return true;
}
/* Part of cbMake() in couldbe.js, for a new profile. The id of the starting point stays on the profile, the kinds
   of debt of the starting point are kinds of the profile (as the demo Find your era writes them), and the quests go
   on Next Steps. The other setup answers wait for the rest of setup (sitSetup). */
function sitBase(base, id) {
  try {
    const T = sitGet(id);
    if (!T || !base || !base.x || !base.x.cb) return;
    base.x.cb.st = T.id;
    if (T.set.debtKinds) base.debtKinds = T.set.debtKinds.slice();
    const t = todayISO();
    base.x.plan = (base.x.plan || []).concat(
      T.quests
        .filter(q => typeof ACT[q.a] === "function")
        .map((q, i) => ({
          id: plId() + i,
          t: q.t,
          s: q.s,
          a: q.a,
          v: "st:" + T.id,
          mins: 10,
          when: t,
          slot: "Any",
          st: "todo",
          made: t,
          seed: 1,
        }))
    );
  } catch (e) {
    report(e, "starter.js: sitBase");
  }
}
/* Part of ACT.cbrest in couldbe.js. The rest of setup shows the setup answers of the starting point filled, with one
   tap to change each. An answer that the sheet already has stays. */
function sitSetup(w) {
  try {
    const c = C(),
      T = sitGet(c && c.x && c.x.cb && c.x.cb.st);
    if (!T || !w || w.kind !== "setup" || w.mode !== "new") return;
    const s = smState(w);
    Object.keys(T.set).forEach(k => {
      const v = T.set[k],
        cur = w.o[k];
      if (Array.isArray(v)) {
        if (cur && cur.length) return;
        w.o[k] = v.slice();
        s.md[k] = true;
      } else if (cur == null || cur === "") w.o[k] = v;
      s.auto[k] = true;
    });
  } catch (e) {
    report(e, "starter.js: sitSetup");
  }
}

/* ---------- THE VIEWS ---------- */
/* Part of wnView() in wants.js: the way to the list, as one row. It does not pulse, and it adds no tap for a player
   who passes it. */
function sitRow() {
  return `<div class="row" style="gap:8px;align-items:center" data-fid="st:row"><button class="rowbtn" style="flex:1" data-a="sitopen"><span><b>Or start from a situation like yours</b><div class="tiny muted">Optional. Ten starting points with typical numbers filled in.</div></span><span class="caret"><i class=chev aria-hidden=true></i></span></button>${cbI("starter")}</div>`;
}
/* THE LIST: ten starting points, one tap each. */
function sitView() {
  return (
    head("Optional", "Start from a situation") +
    `<div class="small muted">Tap the one closest to you. The game fills in typical numbers as guesses, and you confirm them. ${cbI("starter")}</div>` +
    `<div class="stack cbnext stlist" style="gap:8px" data-fid="st:list">${SIT_LIST.map(T => `<button class="rowbtn" data-a="sitpick" data-v="${T.id}"><span><b>${esc(T.l)}</b><div class="tiny muted">${esc(T.one)}</div></span><span class="caret"><i class=chev aria-hidden=true></i></span></button>`).join("")}</div>` +
    `<button class="ghost wide" data-a="sitskip">${NOT_SURE}</button>` +
    `<div class="tiny muted" data-fid="st:tapone">${TAP_ONE}</div>` +
    `<div class="tiny muted" data-fid="cb:left">For most: 3 taps left, then your number. Your situation, your age, one check. No typing needed.</div>` +
    cbNav({ back: `data-a="sitback"` }) +
    cbFoot()
  );
}
/* THE CONFIRM SCREEN: what the starting point filled, greyed and marked Guess, with one tap to change each. */
function sitOkView() {
  const w = W,
    T = sitGet(w.o.st),
    rows = sitRows(w),
    words = sitSetupWords(T.id),
    src = ["spend", "inv", "save"]
      .filter(q => w.o.a[q] && w.o.a[q].typ)
      .map(q => {
        const V = cbTypical(q, w.o.a.age.v) || {};
        return `<div class="tiny muted"><b>${esc(rows.find(r => r.q === q).name)}.</b> ${esc(V.source || "")} (read ${esc(V.date || "")}).</div>`;
      })
      .join("");
  return (
    head("Check", esc(T.l)) +
    `<div class="small muted" data-fid="st:lead">Typical amounts for your age, not yours yet. Each one is a Guess. Tap Change on any you know. ${cbI("stok")}</div>` +
    `<div class="stack" style="gap:8px" data-fid="st:rows">${rows
      .map(
        r =>
          `<div class="tile row between strow" style="gap:8px;align-items:center" data-q="${r.q}"><span class="small ${r.typ ? "muted" : ""}">${esc(r.name)}<div><b>${esc(r.v)}</b> ${kitPill(r.st)}</div>${r.typ ? `<div class="tiny muted">Typical for ages ${esc(r.band)}</div>` : ""}</span><button class="ghost slim" data-a="sitchg" data-q="${r.q}">Change</button></div>`
      )
      .join("")}</div>` +
    (words.length
      ? `<div class="tile small" data-fid="st:set"><b>Also filled in for setup</b><div class="tiny muted">${esc(words.join(". "))}. You confirm or change these in setup.</div></div>`
      : "") +
    `<div class="tile small" data-fid="st:quests"><b>On your Next Steps</b><div class="tiny muted">${esc(T.quests.map(q => q.t).join(". "))}.</div></div>` +
    cbFold("stsrc", "Where the typical amounts come from", src) +
    `<button class="primary wide go cbnext" data-a="sitok">Looks right: show my number</button>` +
    `<div class="tiny muted" data-fid="cb:left">1 tap left, then your number. No typing needed.</div>` +
    cbNav({ back: `data-a="sitchg" data-q="age" data-b="1"` }) +
    cbFoot()
  );
}

Object.assign(ACT, {
  /* What you want: open the list */
  sitopen: () => {
    if (!W || W.kind !== "cb" || W.step !== "wants") return;
    W.step = "starter";
    CB.taps++;
    cbFwdDrop();
    sheet(cbSheet);
  },
  sitpick: t => {
    if (!W || W.kind !== "cb" || W.step !== "starter") return;
    sitApply(t.dataset.v);
  },
  /* I'm not sure: no starting point. The four questions come, with the picks of What you want. */
  sitskip: () => {
    if (!W || W.kind !== "cb" || W.step !== "starter") return;
    W.step = "wants";
    ACT.wnnext();
  },
  sitback: () => {
    if (!W || W.kind !== "cb" || W.step !== "starter") return;
    cbFwdKeep();
    W.step = "wants";
    sheet(cbSheet);
  },
  /* the confirm screen: open one question. Its answer comes back to the confirm screen (sitNext). */
  sitchg: t => {
    if (!W || W.kind !== "cb" || W.step !== "stok") return;
    const i = CB_QS.findIndex(Q => Q.id === t.dataset.q);
    if (i < 0) return;
    if (t.dataset.b) cbFwdKeep();
    else cbFwdDrop();
    W.step = "entry";
    W.q = i;
    sheet(cbSheet);
  },
  /* Looks right: the profile is made from the four answers, and What it is opens */
  sitok: () => {
    if (!W || W.kind !== "cb" || W.step !== "stok" || CB_QS.some(Q => !W.o.a[Q.id])) return;
    CB.taps++;
    cbMake(W.o.a, W.o.wants);
  },
});
