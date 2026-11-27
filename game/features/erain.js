/* ============================================================================
   SLAM the Game: features/erain.js
   PURPOSE     The 60-second demo "Find your era" (era/index.html, run CC-1, item 7, Nov 27 2026), and
               the way its answers come into the game. The demo is one small page outside the game. It
               asks six or seven questions by taps, and shows an era, one next move and a button "Start
               my full game". This file has (1) the questions and the math of the demo, so the demo and
               the game work an era out with one rule, and (2) erIn(): a new player who comes from the
               demo does not answer the same questions again.
   INPUT       The answers of the demo, as one plain object A: { age, spend, inv, save (the number of
               the range chip of the entry, CB_RNG), cush (one id of erCushOpts), debts (names of
               DEBT_KINDS), tax ("yes", "some" or "no") }. In the game: the device storage (ER_KEY).
   OUTPUT      Data: ER_KEY, ER_V, ER_DAYS, ER_QS, ER_TAX, ER_WORDS. Math: erCushOpts, erClean, erCb,
               erBase, erProfile, erName, erNext, erResult, erAsked, erPack, erUnpack. Part of a function
               in a different file: erIn (cbStart in couldbe.js). Storage: erRead, erDrop.
   DEPENDS ON  core/engine.js (newChar, derive, applyTypical, eraSteps, ERAS, NODES, COVER, DEBT_KINDS,
               todayISO, daysBetween), features/couldbe.js (CB_QS, cbRng, cbRows). In the game also:
               core/report.js, screens/ui.js (finishSetup, drawSheet). In the demo, era/gamecopy.js gives
               the names of couldbe.js and ui.js (a generated copy).
   RULES       The era comes from derive(), the one era rule of the game. The profile is made the way
               the game makes a new profile from the same taps: the rows of the entry (cbRows), the
               setup answers (c.can1k, c.cover, c.debtKinds, c.tax) and applyTypical(). So the era of the
               demo is the era that the game shows after "Start my full game". The next move is the key
               step of the next era (the step of the engine that opens the era), or its gate. No new
               math. The demo sends nothing: the answers stay on the device under one key, ER_KEY.
               erIn() reads what it knows and passes over the rest. It runs for a new player only
               (G.demo), one time: it removes the key.
   COMPAT      No new key on a profile. One new key in the device storage: ER_KEY, a JSON text
               { v: 1, at: an ISO day, a: A }. A text with a different v, or older than ER_DAYS days, is
               passed over.
   ========================================================================= */
const ER_KEY = "slam.era",
  ER_V = 1,
  ER_DAYS = 1;
/* The answers of the question about tax-friendly accounts: the words of the game's own question (Make your
   numbers real), and the value of c.tax for each. */
const ER_TAX = [
  ["All of them are full", "yes"],
  ["I put in some", "some"],
  ["Not yet", "no"],
];
/* The questions, in order. kind cb: a range question of the entry (its words and chips are CB_QS and CB_RNG).
   kind one: one tap. kind many: tap each that fits, then Next. when: the question is asked only then. */
const ER_QS = [
  { id: "age", kind: "cb" },
  { id: "spend", kind: "cb" },
  {
    id: "cush",
    kind: "one",
    l: "If money stopped coming in, how long could your cash cover your bills?",
    h: "Cash you can reach fast: checking and savings. Not investments.",
  },
  {
    id: "debts",
    kind: "many",
    l: "Do you owe on any of these?",
    h: "Tap each kind you have. No amounts. A mortgage does not count here.",
  },
  { id: "inv", kind: "cb" },
  { id: "save", kind: "cb" },
  {
    id: "tax",
    kind: "one",
    l: "How full are your tax-friendly accounts each year?",
    h: "Tax-friendly accounts are a Roth IRA, an HSA, and the retirement plan at work. Money inside them is taxed less, so it grows faster.",
    when: A => {
      const r = cbRng("inv", A.inv);
      return !!r && !r.zero;
    },
  },
];
/* The words under each "i" of the result. */
const ER_WORDS = {
  era: "An era is a stage of your money life. The game has ten. Each one opens when you meet its gate.",
  guess:
    "This is a guess from a few taps and typical amounts for people like you. The full game turns it into your real picture.",
  move: "The one step that opens your next era. The full game gives you this step with your real numbers.",
};

/* ---------- THE MATH ---------- */
/* The answers of the cushion question. Each one gives the two setup answers of the game: c.can1k and c.cover.
   The amount is the game's first cushion (the gate of the Buffer era), from the money words of the game. */
function erCushOpts() {
  return [{ id: "no1k", l: "I could not cover a " + money(1000) + " surprise", can1k: "No", cover: "" }].concat(
    Object.keys(COVER).map(k => ({ id: k, l: k, can1k: "Yes", cover: k }))
  );
}
/* The answers with only the parts that this version knows. Anything else is left out. */
function erClean(A) {
  const out = {};
  if (!A || typeof A !== "object") return out;
  CB_QS.forEach(Q => {
    if (Number.isInteger(A[Q.id]) && cbRng(Q.id, A[Q.id])) out[Q.id] = A[Q.id];
  });
  if (erCushOpts().some(o => o.id === A.cush)) out.cush = A.cush;
  if (Array.isArray(A.debts)) out.debts = DEBT_KINDS.map(d => d[0]).filter(k => A.debts.includes(k));
  if (ER_TAX.some(t => t[1] === A.tax)) out.tax = A.tax;
  return out;
}
/* The four answers of the entry, in the shape that a tap on a range chip writes (ACT.cbset in couldbe.js). */
function erCb(A) {
  const a = {};
  CB_QS.forEach(Q => {
    const r = Number.isInteger(A[Q.id]) ? cbRng(Q.id, A[Q.id]) : null;
    if (r) a[Q.id] = { v: r.v, i: A[Q.id], cf: 1, rg: [r.lo, r.hi] };
  });
  return a;
}
/* The new profile before setup finishes it: what cbMake() in couldbe.js makes from the four answers, plus the
   setup answers of the demo. null while one of the four answers is missing. */
function erBase(A0) {
  const A = erClean(A0),
    a = erCb(A);
  if (CB_QS.some(Q => !a[Q.id])) return null;
  const rows = cbRows(a),
    cu = erCushOpts().find(o => o.id === A.cush),
    has = rows.invs.length > 0,
    base = newChar(
      Object.assign(
        {
          age: Math.round(a.age.v),
          incKinds: ["A main job"],
          accts: ["Checking"].concat(has ? ["Retirement plan at work"] : []),
          invest: a.save.v > 0 ? "Every month" : "No",
        },
        rows,
        cu ? { can1k: cu.can1k } : {},
        cu && cu.cover ? { cover: cu.cover } : {},
        A.debts ? { debtKinds: A.debts.slice() } : {},
        /* an answer about the tax-friendly accounts is the player's own: applyTypical() keeps it */
        A.tax && has ? { tax: A.tax, sharp: { low: false, match: false, tax: true } } : {}
      )
    );
  base.x = { cb: { a, count: {}, off: {} } };
  return base;
}
/* The finished profile, for the demo: the same steps as finishSetupBase() in ui.js (the retirement age, then the
   typical amounts). tests/find-your-era-demo.js compares it with a profile that the game made. */
function erProfile(A) {
  const c = erBase(A);
  if (!c) return null;
  c.ret = Math.max(60, c.age + 5);
  applyTypical(c);
  return c;
}
/* The name of the era, as the game says it to a new player (eraName in ui.js): era 0 with nothing owed on balance
   is the Ground Floor. */
function erName(d) {
  return d.era === 0 && d.realm === "Surface" ? "Ground Floor" : ERAS[d.era].n;
}
/* The one next move: the key step of the next era (the step that opens it), else the gate of that era. null in the
   last era. */
function erNext(c, d) {
  if (d.era >= ERAS.length - 1) return null;
  const e = d.era + 1,
    key = eraSteps(c, d, e)
      .filter(s => !s.done)
      .map(s => NODES.find(n => n.id === s.id))
      .find(n => n && n.gate);
  return key
    ? { era: e, opens: ERAS[e].n, t: key.n, why: key.why, kind: "step", id: key.id }
    : { era: e, opens: ERAS[e].n, t: ERAS[e].gate, why: ERAS[e].one, kind: "gate", id: null };
}
/* The result of the demo: the era and the one next move. null while an answer of the entry is missing. */
function erResult(A) {
  const c = erProfile(A);
  if (!c) return null;
  const d = derive(c),
    ground = d.era === 0 && d.realm === "Surface";
  return {
    c,
    d,
    era: d.era,
    last: ERAS.length - 1,
    name: erName(d),
    /* the line of era 0 speaks of owing more than you own: it is not shown on the Ground Floor */
    one: ground ? "" : ERAS[d.era].one,
    is: ground ? [] : ERAS[d.era].is.slice(),
    next: erNext(c, d),
    st: "Guess",
  };
}
/* The questions that are asked for these answers, in order. */
function erAsked(A) {
  return ER_QS.filter(q => !q.when || q.when(A || {}));
}
/* The text that the demo keeps on the device for the game. */
function erPack(A, day) {
  return JSON.stringify({ v: ER_V, at: day || todayISO(), a: erClean(A) });
}
/* The answers from that text, or null: a text that is not JSON, a different version, or an old day. */
function erUnpack(text, day) {
  let P = null;
  if (typeof text !== "string" || text[0] !== "{") return null;
  try {
    P = JSON.parse(text);
  } catch (e) {
    /* a text that some other program wrote under the key: there is nothing to carry in */
    if (typeof report === "function") report(e, "erain.js: erUnpack");
    return null;
  }
  if (!P || P.v !== ER_V || !/^\d{4}-\d{2}-\d{2}$/.test(P.at || "")) return null;
  const age = daysBetween(P.at, day || todayISO());
  if (!(age >= 0 && age <= ER_DAYS)) return null;
  return erClean(P.a);
}

/* ---------- IN THE GAME ---------- */
function erRead() {
  try {
    return erUnpack(localStorage.getItem(ER_KEY));
  } catch (e) {
    report(e, "erain.js: erRead");
    return null;
  }
}
function erDrop() {
  try {
    localStorage.removeItem(ER_KEY);
  } catch (e) {
    report(e, "erain.js: erDrop");
  }
}
/* Part of cbStart() in couldbe.js and of wnLeave() in wants.js. Since run SLAM-ONBOARD-1 the first screen of a new
   player is What you want: cbStart() opens it, this function does nothing there (the step is not the entry), and
   wnLeave() calls it again when the player leaves that screen. A new player who comes from the demo: the four answers of the entry are filled
   in. With all four, the profile is made the way cbMake() makes it, with the setup answers of the demo added, and
   the flow goes on at "What it is". With fewer, the entry opens at the first open question. Returns true when it
   made the profile. */
function erIn() {
  try {
    if (!G.demo || !W || W.kind !== "cb" || W.step !== "entry") return false;
    const A = erRead();
    if (!A) return false;
    erDrop();
    const a = erCb(A);
    if (!Object.keys(a).length) return false;
    const base = erBase(A),
      wants = W.o && W.o.wants; /* wants.js: the picks of What you want, the screen before the entry */
    if (!base) {
      W.o.a = Object.assign(W.o.a || {}, a);
      W.q = Math.max(
        0,
        CB_QS.findIndex(Q => !a[Q.id])
      );
      drawSheet();
      return false;
    }
    /* the picks become goals, as cbMake() in couldbe.js makes them */
    if (wants && wants.length && typeof wnGoals === "function")
      base.goals = wnGoals(Object.assign({}, base, { spend: Math.max(1, Math.round(a.spend.v)) }), wants);
    W = { kind: "setup", mode: "new", step: 0, o: base, cbMade: true };
    finishSetup();
    return true;
  } catch (e) {
    report(e, "erain.js: erIn");
    return false;
  }
}
