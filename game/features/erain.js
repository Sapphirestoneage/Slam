/* ============================================================================
   SLAM the Game: features/erain.js
   PURPOSE     The 60-second demo "Find your era" (era/index.html, run CC-1, item 7, Nov 27 2026), and
               the way its answers come into the game. The demo is one small page outside the game. It
               asks six or seven questions by taps, and shows an era, one next move and a button "Start
               my full game". This file has (1) the questions and the math of the demo, so the demo and
               the game work an era out with one rule, and (2) erIn(): a new player who comes from the
               demo does not answer the same questions again.
   INPUT       The answers of the demo, as one plain object A: { age, spend, inv, save (the number of
               the range chip of the entry, CB_RNG; or "typ" for spend, inv and save: "I'm not sure",
               the typical value for the age), cush (one id of erCushOpts), debts (names of DEBT_KINDS),
               tax ("yes", "some" or "no") }. An answer of "I'm not sure" with no typical value is left out. In the game: the device storage (ER_KEY).
   OUTPUT      Data: ER_KEY, ER_V, ER_DAYS, ER_TYP, ER_QS, ER_TAX, ER_WORDS. Math: erCushOpts, erClean, erCb, erTyp,
               erBase, erProfile, erName, erNext, erResult, erAsked, erPack, erUnpack. Part of a function
               in a different file: erIn (cbStart in couldbe.js, wnLeave in wants.js). Storage: erRead, erDrop, erSigned.
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
   COMPAT      One optional key on a profile (run 16): c.x.cb.era, the names of the setup answers that came
               from the demo (cush, debts, tax). An old saved game has none: the rest of setup then asks
               them, as before. One new key in the device storage: ER_KEY, a JSON text
               { v: 1, at: an ISO day, a: A }. A text with a different v, or older than ER_DAYS days, is
               passed over.
   ========================================================================= */
/* The answer of a range question (spend, inv, save) when the visitor taps "I'm not sure". */
const ER_TYP = "typ";
const ER_KEY = "slam.era",
  ER_V = 1,
  ER_DAYS = 1;
/* The answers of the question about tax-friendly accounts (the words of run 16, C8), and the value of c.tax for
   each. "I'm not sure" (NOT_SURE) is the fourth choice of every question: the screen adds it (era.js). */
const ER_TAX = [
  ["Yes, the max", "yes"],
  ["Some", "some"],
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
    l: "If your pay stopped today, how long could you pay your bills?",
    h: "Count cash you can get today, like checking and savings. Do not count investments.",
  },
  {
    id: "debts",
    kind: "many",
    l: "Do you owe money on any of these?",
    h: "Tap each kind you have. No amounts. Do not count a home loan here.",
  },
  { id: "inv", kind: "cb" },
  { id: "save", kind: "cb" },
  {
    id: "tax",
    kind: "one",
    l: "Do you put the max into your 401(k) or IRA each year?",
    h: "A 401(k) and an IRA are accounts for when you are older. The law sets the most you can put in each year. That is the max.",
    when: A => {
      const a = erCb(A).inv;
      return !!a && a.v > 0;
    },
  },
];
/* The words of the result, and of the line about where the answers are kept. */
const ER_WORDS = {
  guess: "A guess from a few taps and typical amounts. The game turns it into your real picture.",
  ground: "You own more than you owe, but there's no cushion yet.",
  /* run 16, A4: where the answers are kept. The first line shows only to a visitor who is signed out. */
  out: "No account. Nothing is sent. Your answers stay on this device.",
  signed: "You are signed in. Your answers save to your account when you start your first move.",
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
    /* "I'm not sure": the typical value for the age stands in (ER_TYP). Age has none. */ else if (
      A[Q.id] === ER_TYP &&
      Q.id !== "age"
    )
      out[Q.id] = ER_TYP;
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
  /* "I'm not sure": the typical value for the age, as the chip of the entry writes it (ACT.cbtyp in couldbe.js).
     With no row for the age there is no answer. */
  CB_QS.forEach(Q => {
    const T = A[Q.id] === ER_TYP && a.age ? erTyp(Q.id, a.age.v) : null;
    if (T) a[Q.id] = { v: T.v, cf: 1, typ: true, band: T.band };
  });
  return a;
}
/* The typical value of a range question for an age: cbTypical of couldbe.js, the one source. null when the page
   has no reference data, or the data has no row for the age. */
function erTyp(q, age) {
  return typeof cbTypical === "function" ? cbTypical(q, age) : null;
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
  /* which setup answers came from the demo, so that the rest of setup shows them filled (openSetupCb in couldbe.js).
     A profile holds stock answers too (newChar): only the ones named here are the player's own. */
  base.x = {
    cb: {
      a,
      count: {},
      off: {},
      era: ["cush", "debts", "tax"].filter(k => (k === "tax" ? A.tax && has : A[k] != null)),
    },
  };
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
    /* the line of era 0 speaks of owing more than you own: the Ground Floor has its own line (eraOne in ui.js) */
    one: ground ? ER_WORDS.ground : ERAS[d.era].one,
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

/* True when an account of the game is signed in on this device: the mark that supa.js keeps (su_uid, suLocal) and
   the sign-in token of the account library. The demo has no account library, so it reads the two marks. */
function erSigned() {
  try {
    if (!localStorage.getItem("su_uid")) return false;
    for (let i = 0; i < localStorage.length; i++) if (/^sb-.*-auth-token/.test(localStorage.key(i) || "")) return true;
    return false;
  } catch (e) {
    /* a browser that keeps nothing: nobody is signed in here */
    if (typeof report === "function") report(e, "erain.js: erSigned");
    return false;
  }
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
/* Part of cbStart() in couldbe.js and of wnLeave() in wants.js. A new player who comes from the demo does not answer
   the same questions again (run 16, A2 and A3). With all four answers of the entry, the profile is made the way
   cbMake() makes it, with the setup answers of the demo added: every answer is a Guess of the profile. The player
   lands on Home, with the one next move of the demo as the first card (W.erHome: finishSetupCb in couldbe.js). With
   fewer answers (a text from an older page), the entry opens at the first open question; that case waits for the
   entry, so wnLeave() calls this function again. Returns true when it made the profile. */
function erIn() {
  try {
    if (!G.demo || !W || W.kind !== "cb") return false;
    const A = erRead();
    if (!A) return false;
    const base = erBase(A);
    if (!base && W.step !== "entry") return false;
    erDrop();
    const a = erCb(A);
    if (!Object.keys(a).length) return false;
    const wants = W.o && W.o.wants; /* wants.js: the picks of What you want, when that screen came first */
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
    W = { kind: "setup", mode: "new", step: 0, o: base, cbMade: true, erHome: true };
    finishSetup();
    return true;
  } catch (e) {
    report(e, "erain.js: erIn");
    return false;
  }
}
