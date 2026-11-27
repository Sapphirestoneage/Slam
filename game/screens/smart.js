/* ============================================================================
   SLAM the Game: screens/smart.js
   PURPOSE     The setup questions change with each answer. The probable answers come first, the
               improbable answers fade, and answers that cannot be true together go behind "Show more".
   INPUT       The profile: c.x.cal, c.x.incFreq. The taps of the player (the actions in OUTPUT).
   OUTPUT      Functions. The order of the pages: SM_ORDER, SM_ORDER_V, smSkip, smLive, smNextPage. The one
               choice "I'm not sure": SM_OWN, SM_UNSURE, SM_CUSH, smLab, smUnsureFill, smCushOk, smListUnsure. Parts of
               functions in other files: finishSetupPay, ledRowFreq, smSpotFix (openSetupQuest in
               questlog.js, cbRestSpot in couldbe.js). Actions
               (ACT): smage, set, setn, tog, togb, agedec, wback, wnext, smopen, small, smskip, smdone,
               incfreq. Run CC-1, item 9: the question about shared money waits for a quest of Next Steps
               (features/waitq.js: wqWaits in smQs and SETUP[3].req, wqFill in finishSetupTax).
   DEPENDS ON  core/engine.js, screens/ui.js.
   RULES       No answer is locked. Each answer is one tap away. Each question has "I'm not sure".
   COMPAT      One optional key on a profile (run 16): c.x.unsure, the names of the setup answers that were
               "I'm not sure" (a Guess of the game). An old saved game has none: every answer is the
               player's own, as before. The values that the questions keep did not change.
   ========================================================================= */
const SM_EMP = ["First job", "Established", "A few jobs or gigs"],
  SM_SINGLE = ["Single by choice", "Single, seeking"];
/* each rule looks at the answers so far and returns {first, dim, hide, only, why} */
const SM = {
  work: o => {
    const a = o.age;
    if (a == null) return {};
    const why = "of your age";
    return a < 20
      ? { first: ["Student", "First job", "A few jobs or gigs"], dim: ["Retired", "Established"], why }
      : a < 26
        ? { first: ["First job", "Student", "A few jobs or gigs", "Established"], dim: ["Retired"], why }
        : a < 56
          ? {
              first: ["Established", "Self-employed", "A few jobs or gigs", "Between jobs"],
              dim: ["Retired", a >= 35 ? "Student" : null],
              why,
            }
          : a < 65
            ? { first: ["Established", "Retired", "Self-employed"], dim: ["Student", "First job"], why }
            : { first: ["Retired", "Self-employed", "Established"], dim: ["Student", "First job"], why };
  },
  incKinds: o =>
    ({
      Student: {
        first: ["Help from family", "Side gigs", "A main job"],
        dim: ["Retirement income", "My own business"],
        why: "you're a student",
      },
      "First job": {
        first: ["A main job", "Side gigs"],
        dim: ["Retirement income", "Unemployment or benefits"],
        why: "you're in your first job",
      },
      Established: {
        first: ["A main job", "A second job", "Side gigs"],
        dim: ["Retirement income", "Unemployment or benefits"],
        why: "you have an established job",
      },
      "A few jobs or gigs": {
        first: ["Side gigs", "A main job", "A second job"],
        dim: ["Retirement income"],
        why: "you work a few jobs or gigs",
      },
      "Between jobs": {
        first: ["Unemployment or benefits", "Side gigs", "Help from family"],
        dim: ["A main job"] /* a part-time job while looking stays one tap away (UX pass, test profile 1) */,
        hide: ["A second job"],
        why: "you're between jobs",
      },
      "Self-employed": {
        first: ["My own business", "Side gigs"],
        dim: ["Unemployment or benefits", "Retirement income"],
        why: "you work for yourself",
      },
      Retired: {
        first: ["Retirement income", "Side gigs"],
        hide: ["A main job", "Unemployment or benefits"],
        why: "you're retired",
      },
    })[o.work] || {},
  steady: o => {
    const k = o.incKinds || [];
    if (o.payFreq === "It varies") return { only: "Changes month to month", why: "you said it varies" };
    if (o.work === "Retired" || (SM_EMP.slice(0, 2).includes(o.work) && k.length === 1 && k[0] === "A main job"))
      return { first: ["Steady"], why: "one paycheck is usually steady" };
    if (["Self-employed", "A few jobs or gigs", "Between jobs"].includes(o.work))
      return { first: ["Changes month to month"], why: "that kind of income usually moves around" };
    return {};
  },
  homeQ: o =>
    o.age == null
      ? {}
      : o.age < 23
        ? { first: ["No cost", "I rent"], dim: ["I own"], why: "of your age" }
        : { first: ["I rent", "I own"] },
  live: o =>
    o.homeQ === "No cost"
      ? { first: ["Parents or family"], dim: ["On my own"], why: "you live at no cost" }
      : o.age != null && o.age < 30
        ? { first: ["Roommates", "On my own", "A partner"] }
        : { first: ["On my own", "A partner", "Kids"] },
  rel: o =>
    (o.live || []).includes("A partner")
      ? { first: ["Partnered", "Married"], hide: SM_SINGLE, why: "you live with a partner" }
      : {},
  deps: o =>
    (o.live || []).includes("Kids")
      ? { first: ["Kids"], dim: ["None", "Planning"], why: "kids live with you" }
      : { first: ["None"] },
  share: o =>
    SM_SINGLE.includes(o.rel)
      ? { first: ["No one"], hide: ["A partner", "More than one partner"], why: "you're single" }
      : o.rel === "Dating"
        ? { first: ["No one", "A partner"] }
        : o.rel
          ? { first: ["A partner", "No one"], why: "you're " + String(o.rel).toLowerCase() }
          : {},
  debtKinds: o => {
    const a = o.age == null ? 30 : o.age;
    return {
      first: [
        "Credit card balance",
        a < 40 || o.work === "Student" ? "Student loans" : null,
        o.homeQ === "I own" ? "Mortgage" : null,
        "Car loan",
        a < 35 ? "Buy now, pay later" : null,
      ],
      dim: a >= 55 ? ["Student loans"] : [],
      hide: o.homeQ && o.homeQ !== "I own" ? ["Mortgage"] : [],
      why: o.homeQ === "I own" ? "you own your home" : "of your age",
    };
  },
  accts: o =>
    o.invest && o.invest !== "No" && !SM_EMP.includes(o.work)
      ? { first: ["Checking", "Savings", "IRA or Roth IRA", "Other investments"], why: "you invest" }
      : SM_EMP.includes(o.work)
        ? { first: ["Checking", "Savings", "Retirement plan at work"], why: "you have a job" }
        : o.work === "Student"
          ? { first: ["Checking", "Savings"], dim: ["Retirement plan at work", "HSA"], why: "you're a student" }
          : o.work === "Retired"
            ? { first: ["Checking", "Savings", "IRA or Roth IRA", "Other investments"], why: "you're retired" }
            : o.work
              ? {
                  first: ["Checking", "Savings", "IRA or Roth IRA"],
                  dim: ["Retirement plan at work"],
                  why: "you don't have an employer right now",
                }
              : {},
  cover: o =>
    o.can1k === "No"
      ? {
          first: ["Less than a month", "1 to 3 months"],
          dim: ["3 to 6 months", "Longer than 6 months"],
          why: "a $1,000 bill would be a stretch",
        }
      : o.can1k === "Yes"
        ? { first: ["1 to 3 months", "3 to 6 months"] }
        : {},
};
const SM_DEP = {
  age: ["work", "homeQ"],
  work: ["incKinds", "payFreq", "steady", "accts"],
  incKinds: ["payFreq", "steady"],
  payFreq: ["steady"],
  homeQ: ["live", "debtKinds"],
  live: ["rel", "deps"],
  rel: ["share"],
  can1k: ["cover"],
};
const SM_Q = {
  1: [
    {
      k: "work",
      l: "What is your work right now?",
      s: "Work",
      o: ["Student", "First job", "A few jobs or gigs", "Established", "Between jobs", "Self-employed", "Retired"],
      h: "Tap the closest one. You'll see what it means.",
    },
    {
      k: "incKinds",
      l: "Where does your money come from?",
      s: "Money comes from",
      o: INC_KINDS,
      m: 1,
      lab: {
        "A main job": "Job",
        "Unemployment or benefits": "Unemployment",
        "Help from family": "Allowance or family help",
        "Side gigs": "Side gig",
        "Other income": "Other",
      },
      h: "Tap each one you have. How much and how often come next, one at a time.",
    },
    {
      k: "steady",
      l: "Is your pay about the same each month?",
      s: "Same each month?",
      o: ["Steady", "Changes month to month"],
      lab: { Steady: "Yes, about the same", "Changes month to month": "No, it changes" },
      h: "The day each pay comes is set later, on your month.",
    },
  ],
  2: [
    {
      k: "homeQ",
      l: "Do you rent or own your home?",
      s: "Home",
      o: Object.keys(HOMEMAP),
      lab: { "No cost": "I live for free, with family for example" },
      h: "Rent means you pay a landlord. Own means the home is yours, with or without a home loan.",
    },
    {
      k: "live",
      l: "Who lives with you?",
      s: "Lives with you",
      o: ["On my own", "Roommates", "A partner", "Kids", "Parents or family"],
      m: 1,
    },
  ],
  3: [
    {
      k: "rel",
      l: "Are you in a relationship?",
      s: "Relationship",
      o: ["Single by choice", "Single, seeking", "Dating", "Partnered", "Married"],
    },
    {
      k: "deps",
      l: "Do you pay for anyone else, like a kid or a parent?",
      s: "Relies on you",
      o: ["None", "Planning", "Kids", "Supporting a parent", "Pets"],
      lab: { None: "No one", Planning: "Not yet, but I plan to", "Supporting a parent": "A parent" },
    },
    {
      k: "share",
      l: "Do you share your money with anyone, like a joint bank account?",
      s: "Combine money with",
      o: ["No one", "A partner", "More than one partner", "Family"],
      h: "Splitting rent or bills with a roommate does not count.",
    },
    /* the last question of About you (run SLAM-ONBOARD-1): "I'd rather not look" turns gentle mode on at once */
    {
      k: "feel0",
      l: "How do you feel when you think about money?",
      s: "How money feels",
      o: ["Mostly fine", "A bit stressed", "I'd rather not look"],
      opt: 1,
    },
  ],
  0: [
    {
      k: "can1k",
      l: "A surprise $1,000 bill comes today. Could you pay it with your own money?",
      s: "A $1,000 surprise",
      o: ["Yes", "No"],
    },
    {
      k: "cover",
      l: "If your pay stopped today, how long could you pay your bills?",
      s: "Could cover bills for",
      o: Object.keys(COVER),
    },
    {
      k: "invest",
      l: "Do you put money into investments, like a 401(k) or stocks?",
      s: "Investing",
      o: ["No", "Sometimes", "Every month"],
    },
  ],
  6: [
    {
      k: "ssq",
      l: "Should your plan count on Social Security?",
      s: "Social Security",
      o: ["Yes, at three quarters, to be careful", "Yes, in full", "No, leave it out"],
      lab: {
        "Yes, at three quarters, to be careful": "Yes, but only 3/4 of it, to be safe",
        "Yes, in full": "Yes, all of it",
      },
      h: "Social Security is money the government pays you each month when you are older.",
      opt: 1,
    },
  ],
};
/* each income source keeps its own rhythm */
const PF_O = ["Daily", "Weekly", "Every 2 weeks", "Twice a month", "Monthly", "It varies"];
const PF_R = {
  "A main job": {
    first: ["Every 2 weeks", "Twice a month", "Weekly", "Monthly"],
    dim: ["Daily"],
    why: "most paychecks come every two weeks",
  },
  "A second job": { first: ["Every 2 weeks", "Weekly"], why: "second jobs usually pay weekly or every two weeks" },
  "Side gigs": { first: ["It varies", "Weekly", "Daily"], why: "gig money comes in unevenly" },
  "My own business": { first: ["It varies", "Monthly"], why: "business income moves around" },
  "Unemployment or benefits": {
    first: ["Weekly", "Every 2 weeks", "Monthly"],
    dim: ["Daily"],
    why: "benefits usually pay weekly or every two weeks",
  },
  "Help from family": {
    first: ["Monthly", "It varies"],
    dim: ["Daily"],
    why: "family help is usually monthly, or now and then",
  },
  "Retirement income": { first: ["Monthly"], dim: ["Daily", "Weekly"], why: "retirement income is usually monthly" },
};
const pfSort = ks => ks.slice().sort((a, b) => (INC_W[b] || 0) - (INC_W[a] || 0));
/* THE ORDER OF THE PAGES (run SLAM-ONBOARD-1, Nov 27 2026): About you, then the five rounds D, A, I, T, E
   (features/spiral.js). About you: your age (0), your work (1), your home (2), your people (3), all taps and no
   numbers. D: what you owe, the kinds (4), your credit cards (9), each debt (10). A: where your money lives (5),
   each account (11), your cushion (7). I: each source of money (12). T: what comes off the top (8). E: spending
   group by group (13), the last one (6). Pages 9 to 13 are in features/amounts.js. A page with skip(w) true is
   passed over (for example the amounts in "Change my answers"). SM_ORDER_V is the number of this order: a copy
   of a round that was left under an older order has no such number (smSpotFix). */
const SM_ORDER = [0, 1, 2, 3, 4, 9, 10, 5, 11, 7, 12, 8, 13, 6];
const SM_ORDER_V = 2;
const smSkip = (w, p) => !!(w && SETUP[p] && SETUP[p].skip && SETUP[p].skip(w));
/* The pages this player sees, in order (for "page 2 of 11"). The page open now always counts. */
/* A page that is still ahead and that a later answer can bring in (each debt, each source of money: maybe(w) in
   amounts.js) counts too, so that N of "page X of N" does not grow while the player goes on. */
const smMaybe = (w, p) =>
  !!(w && SETUP[p] && SETUP[p].maybe && SETUP[p].maybe(w) && SM_ORDER.indexOf(p) > SM_ORDER.indexOf(w.step));
const smLive = w => SM_ORDER.filter(p => p === (w && w.step) || !smSkip(w, p) || smMaybe(w, p));
/* T: the taxes round. A question about the match only for a player with a job. */
SM_Q[8] = [
  {
    k: "taxQ",
    l: "How much of your pay goes to taxes?",
    s: "Taxes off the top",
    o: ["About 10%", "About 15%", "About 20%", "About 25%", "About 30%", "I don't know"],
    h: "Look at a pay stub. The top number is your pay. The bottom number is what you get. Your best guess is fine.",
  },
  {
    k: "matchQ",
    l: "Does your job add free money to your retirement plan?",
    s: "Match from your job",
    o: ["Yes, and I get all of it", "Yes, but not all of it", "My job has no match", "I don't know"],
    lab: { "My job has no match": "No, my job does not do that" },
    h: "This is called a match: you put money in the plan at work, and your job adds some too.",
  },
  {
    k: "taxAcctQ",
    l: "Do you put the max into your 401(k) or IRA each year?",
    s: "Tax-friendly saving",
    o: ["Yes, the most I'm allowed", "Yes, some", "Not this year", "I don't know"],
    lab: { "Yes, the most I'm allowed": "Yes, the max", "Yes, some": "Some", "Not this year": "Not yet" },
    h: "A 401(k) and an IRA are accounts for when you are older. The law sets the most you can put in each year. That is the max.",
  },
];
const SM_TAXACCT = ["Retirement plan at work", "IRA or Roth IRA", "HSA"];
/* Did the player already answer Social Security in What it is / What it could be (the way ss of couldbe.js)?
   Count this, Already doing it and Not for me are all answers. */
function smSsDone(w) {
  const o = w && w.o;
  if (!o || !o.x || !o.x.cb || typeof cbWayState !== "function") return false;
  const st = cbWayState(o, "ss");
  return !!(st.counted || st.how);
}
function smQs(w, i) {
  if (i === 0) return [];
  if (i === 6) return SM_Q[6].filter(q => q.k !== "ssq" || !smSsDone(w));
  if (i === 2 && typeof amHouseQs === "function")
    return amHouseQs(w, SM_Q[2]); /* amounts.js: how many roommates, kids */
  if (i === 7) return SM_Q[0];
  /* waitq.js (run CC-1, item 9): who the player shares money with waits for a quest of Next Steps */
  if (i === 3 && typeof wqWaits === "function" && wqWaits(w, "share")) return SM_Q[3].filter(q => q.k !== "share");
  if (i === 8)
    return SM_Q[8].filter(
      q =>
        (q.k !== "matchQ" || (isEmployee(w.o) && (w.o.incKinds || []).some(k => /job/.test(k)))) &&
        (q.k !== "taxAcctQ" || (w.o.accts || []).some(a => SM_TAXACCT.includes(a)))
    );
  return SM_Q[i];
}
/* The page after page i, or null after the last page. */
function smNextPage(i, w) {
  for (let k = SM_ORDER.indexOf(i) + 1; k > 0 && k < SM_ORDER.length; k++)
    if (!smSkip(w, SM_ORDER[k])) return SM_ORDER[k];
  return null;
}
function smPrevPage(i, w) {
  for (let k = SM_ORDER.indexOf(i) - 1; k >= 0; k--) if (!smSkip(w, SM_ORDER[k])) return SM_ORDER[k];
  return null;
}
const smIsLast = w => smNextPage(w.step, w) == null;
/* Go to the next page. Between two rounds, spiral.js shows the number of the round first. */
function smStepOn(w) {
  if (typeof spRoundEnd === "function" && spRoundEnd(w)) return; /* spiral.js: the round just ended */
  const n = smNextPage(w.step, w);
  if (n != null) w.step = n;
  if (typeof spUpSoon === "function") spUpSoon(); /* spiral.js: the new page starts at its top */
}
function smStepBack(w) {
  const n = smPrevPage(w.step, w);
  if (n != null) w.step = n;
}
/* Part of openSetupQuest() in questlog.js and of cbRestSpot() in couldbe.js. A copy of a round that was left under
   an older order of the pages comes back on the first page of About you that still needs an answer, so that no
   page is passed over. The answers so far stay. A copy of this order is not changed. */
function smSpotFix(w) {
  if (!w || w.kind !== "setup" || w.ord === SM_ORDER_V) return w;
  w.ord = SM_ORDER_V;
  if (w.mode === "edit") return w;
  const miss = [0, 1, 2, 3].find(p => !smSkip(w, p) && !SETUP[p].req(w));
  if (miss != null && SM_ORDER.indexOf(miss) < SM_ORDER.indexOf(w.step)) {
    w.step = miss;
    w.sp = null;
    w.spBeat = null;
    if (w.sm) w.sm.open = null;
  }
  return w;
}
/* Part of finishSetup() in ui.js. The answers of the taxes round go to the profile, then the work keys go. */
function finishSetupTax() {
  /* the names of the answers that were "I'm not sure": a Guess of the game, not the player's own (c.x.unsure) */
  if (typeof wqFill === "function") wqFill(W); /* waitq.js: a question that waited is a Guess, and becomes a quest */
  const sk = (W.sm && W.sm.sk) || {},
    un = Object.keys(SM_UNSURE)
      .concat(SM_CUSH)
      .filter(k => sk[k]);
  W.o.x = W.o.x || {};
  if (un.length) W.o.x.unsure = un;
  else delete W.o.x.unsure;
  smTaxApply(W.o);
  ["taxQ", "matchQ", "taxAcctQ"].forEach(k => delete W.o[k]);
}
/* The answers of the taxes round on a profile (also used on a copy, for the number of a round). */
function smTaxApply(o) {
  o.sharp = o.sharp || {};
  o.x = o.x || {};
  const p = /^About (\d+)%/.exec(o.taxQ || "");
  if (p) {
    o.x.taxPct = +p[1];
    o.x.kin = o.x.kin || {};
    o.x.kin.taxcf = 2;
  }
  const m = {
    "Yes, and I get all of it": "yes",
    "Yes, but not all of it": "no",
    "My job has no match": "no match offered",
  }[o.matchQ];
  if (m) {
    o.match = m;
    o.sharp.match = true;
  }
  const t = { "Yes, the most I'm allowed": "yes", "Yes, some": "some", "Not this year": "no" }[o.taxAcctQ];
  if (t) {
    o.tax = t;
    o.sharp.tax = true;
  }
}
/* setup only asks what you have. When it lands is set on the calendar, so here the game just holds a guess. */
function smInc(w) {
  const o = w.o,
    s = smState(w),
    ks = pfSort(o.incKinds || []);
  if (!ks.length) {
    if (s.pfg) o.payFreq = null;
    return;
  }
  if (!o.payFreq || s.pfg) {
    o.payFreq = ((PF_R[ks[0]] || {}).first || ["Every 2 weeks"])[0];
    s.pfg = true;
  }
}
const incFreqOf = (c, k) => ((c.x || {}).incFreq || {})[k] || null;
function incFreqEd(k) {
  const c = C(),
    cur = incFreqOf(c, k);
  return q(
    "How often do you get this money?",
    `<div class="chips">${smOrder("pf:" + k, PF_O, {})
      .list.map(
        v =>
          `<button class="chip ${cur === v ? "on" : ""}" data-a="incfreq" data-k="${esc(k)}" data-v="${v}">${v}</button>`
      )
      .join("")}</div>`
  );
}
function smState(w) {
  if (!w.sm) {
    w.sm = { md: {}, all: {}, auto: {}, sk: {}, open: null, note: null, adv: 0 };
    if (w.mode === "edit") {
      ["incKinds", "live"].forEach(k => (w.sm.md[k] = true));
      ["ssq", "feel0"].forEach(k => (w.sm.sk[k] = true));
      /* the answers that were "I'm not sure" (c.x.unsure) are not sure still */
      ((w.o.x && w.o.x.unsure) || []).forEach(k => (w.sm.sk[k] = true));
      w.sm.pfg = !!(w.o.x && w.o.x.payGuess);
    }
  }
  return w.sm;
}
function smRule(k, o) {
  const r = k.indexOf("pf:") === 0 ? PF_R[k.slice(3)] || {} : SM[k] ? SM[k](o) || {} : {},
    f = x => (x || []).filter(Boolean);
  return { first: f(r.first), dim: f(r.dim), hide: f(r.hide), only: r.only || null, why: r.why || "" };
}
function smOrder(k, opts, o, all) {
  const r = smRule(k, o),
    cur = o[k],
    sel = v => (Array.isArray(cur) ? cur.includes(v) : cur === v || (k === "debtKinds" && v === "Mortgage" && o.mort)),
    hid = all ? [] : r.hide.filter(v => opts.includes(v) && !sel(v)),
    rank = v => {
      const i = r.first.indexOf(v);
      return i >= 0 ? i : (r.dim.includes(v) ? 1000 : 100) + opts.indexOf(v);
    };
  return {
    list: opts.filter(v => !hid.includes(v)).sort((a, b) => rank(a) - rank(b)),
    hid,
    r,
    moved: r.first.length > 0 || hid.length > 0,
  };
}
/* THE ONE CHOICE "I'M NOT SURE" (run 16, C8). Each question has it, with the helper line TAP_ONE under the choices.
   A question whose list already had such a choice ("I don't know", "Skip") keeps the value it stores, and shows it
   with the words NOT_SURE (SM_OWN). Every other question gets one more chip (the action smskip). For a question of
   About you the game then uses the most likely choice for the answers so far, else the stock answer of a new
   profile (SM_UNSURE), and says so under the chips: it is a Guess. For the cushion and the optional questions the
   game keeps nothing. The names of the answers that are not the player's own go to c.x.unsure when setup ends
   (finishSetupTax), so that "Change my answers" shows them open again. */
const SM_OWN = ["I don't know", "Skip"];
const SM_UNSURE = {
  work: "First job",
  incKinds: ["A main job"],
  steady: "Steady",
  homeQ: "I rent",
  live: ["On my own"],
  rel: "Single, seeking",
  deps: "None",
  share: "No one",
};
const SM_CUSH = ["can1k", "cover", "invest"];
const smLab = (q, v) => (SM_OWN.includes(v) ? NOT_SURE : (q.lab && q.lab[v]) || v);
function smUnsureFill(w, q) {
  if (!(q.k in SM_UNSURE)) return null;
  const top = smRule(q.k, w.o).first.find(v => q.o.includes(v));
  return q.m ? [top || SM_UNSURE[q.k][0]] : top || SM_UNSURE[q.k];
}
function smChips(w, q) {
  const s = smState(w),
    o = w.o,
    cur = o[q.k],
    multi = !!q.m,
    un = !!s.sk[q.k],
    own = q.o.some(v => SM_OWN.includes(v)),
    sel = v => !un && (multi ? (cur || []).includes(v) : cur === v),
    od = smOrder(q.k, q.o, o, s.all[q.k]),
    none = !un && (multi ? !(cur || []).length : !cur),
    top = od.r.first.find(v => od.list.includes(v)),
    used =
      un && cur != null && String(cur) !== ""
        ? []
            .concat(cur)
            .map(v => smLab(q, v))
            .join(", ")
        : "";
  return `<div class="chips">${od.list.map(v => `<button class="chip ${sel(v) ? "on" : ""} ${none && v === top ? "likely" : ""} ${od.r.dim.includes(v) && !sel(v) ? "dim" : ""}" data-a="${multi ? "tog" : "set"}" data-k="${q.k}" data-v="${esc(v)}">${esc(smLab(q, v))}</button>`).join("")}${od.hid.length ? `<button class="chip more" data-a="small" data-k="${q.k}">Show ${od.hid.length} more</button>` : ""}${own ? "" : `<button class="chip ${un ? "on" : ""}" data-a="smskip" data-k="${q.k}" aria-pressed="${un ? "true" : "false"}">${NOT_SURE}</button>`}</div><div class="tiny muted" data-fid="sm:tapone">${TAP_ONE}</div>${used ? `<div class="tiny muted" data-fid="sm:unsure" role="status">Not sure is fine. For now the game uses "${esc(used)}", as a Guess. Tap your own answer any time.</div>` : ""}${od.moved && od.r.why && none ? `<div class="tiny muted">Most likely first, because ${od.r.why}.${od.hid.length ? " The rest are one tap away." : ""}</div>` : ""}`;
}
const smAns = (w, q) => {
  const s = smState(w),
    v = w.o[q.k];
  return !!s.sk[q.k] || (q.m ? (v || []).length > 0 && !!s.md[q.k] : v != null && v !== "");
};
/* one question on screen at a time. Above it, a row of numbered circles: a tick when answered, lit for the one you are on. Tap a circle to go back and change that answer. Answers no longer stack up and push the question down. */
function smDots(w, qs, open, pre) {
  const off = pre ? 1 : 0,
    n = qs.length + off,
    at = pre && pre.now ? 1 : open ? qs.findIndex(q => q.k === open) + 1 + off : 0;
  return `<div class="smdots">${pre ? `<button class="smdot ${pre.now ? "now" : "done"}" data-a="smage" aria-label="Question 1 of ${n}: Age${pre.now ? "" : ". Answered. Tap to change"}">${pre.now ? 1 : "✓"}</button>` : ""}${qs
    .map((q, i) => {
      const done = smAns(w, q),
        now = q.k === open;
      return `<button class="smdot ${now ? "now" : done ? "done" : ""}" data-a="smopen" data-k="${q.k}" aria-label="Question ${i + 1 + off} of ${n}: ${esc(q.s)}${done ? ". Answered. Tap to change" : ""}">${done && !now ? "✓" : i + 1 + off}</button>`;
    })
    .join(
      ""
    )}<span class="tiny muted">${at ? `Question ${at} of ${n}` : "All answered. Tap a number to change one."}</span></div>`;
}
function smBody(w, qs, pre) {
  const s = smState(w),
    o = w.o;
  let open = s.open && qs.find(q => q.k === s.open) ? s.open : null;
  if (!open) {
    const n = qs.find(q => !smAns(w, q));
    open = n ? n.k : null;
  }
  const q = qs.find(x => x.k === open),
    pi = (q ? qs.indexOf(q) : qs.length) - 1,
    pv = pi >= 0 ? qs[pi] : null,
    echo =
      pv && !pv.m && !s.sk[pv.k] && smAns(w, pv) && OPT_DESC[o[pv.k]]
        ? `<div class="tiny muted">✓ <b>${esc(o[pv.k])}:</b> ${OPT_DESC[o[pv.k]]}</div>`
        : "",
    auto = qs.filter(x => s.auto[x.k] && smAns(w, x) && x.k !== open).map(x => x.s);
  return (
    (typeof spOn === "function" && spOn(w)
      ? ""
      : smDots(w, qs, open, pre)) /* spiral.js: the checklist of the round takes its place */ +
    echo +
    (q
      ? `<div class="field smopen ${missing(w, q.k) ? "miss" : ""}"><div class="small"><b>${q.l}</b>${q.m ? " Tap each one that fits." : ""}${q.opt ? " (optional)" : ""}</div>${smChips(w, q)}${!q.m && !s.sk[q.k] && OPT_DESC[o[q.k]] ? `<div class="tile small"><b>${o[q.k]}:</b> ${OPT_DESC[o[q.k]]}</div>` : q.h ? `<div class="tiny muted">${q.h}</div>` : ""}${q.m ? `<button class="${(o[q.k] || []).length ? "primary go" : "ghost"} wide slim" data-a="smdone" data-k="${q.k}">That's all</button>` : ""}</div>`
      : "") +
    (auto.length
      ? `<div class="tiny muted">Filled in for you from what you already said: ${esc(auto.join(", "))}. Tap its number to change it.</div>`
      : "") +
    (s.note ? `<div class="tile tiny">${esc(s.note)}</div>` : "")
  );
}
/* how many questions are still ahead, across every page of setup */
function smLeft(w) {
  const at = Math.max(0, SM_ORDER.indexOf(w.step));
  return (
    (w.o.age == null ? 1 : 0) +
    SM_ORDER.reduce(
      (n, p, i) =>
        n + (p === 4 || p === 5 ? (i >= at ? 1 : 0) : (smQs(w, p) || []).filter(q => !q.opt && !smAns(w, q)).length),
      0
    )
  );
}
function smList(w, k, opts, help, rowOf) {
  const s = smState(w),
    od = smOrder(k, opts, w.o, s.all[k]);
  return `<div class="small muted">${help}</div>${od.moved && od.r.why ? `<div class="tiny muted">Most likely first, because ${od.r.why}.</div>` : ""}<div class="stack">${od.list.map(v => rowOf(v, od.r.first.includes(v), od.r.dim.includes(v))).join("")}${od.hid.length ? `<button class="ghost wide slim" data-a="small" data-k="${k}">Show ${od.hid.length} more</button>` : ""}</div>`;
}
const smName = w =>
  `<div class="field"><label class="small" for="name">${w.add ? "Who is this? A name for this person" : "A name for your character (optional)"}</label><input type="text" id="name" data-k="name" maxlength="20" value="${esc(w.o.name === "You" ? "" : w.o.name)}" placeholder="${w.add ? "Their name" : "You"}"></div>`;
/* age follows the same one-question-at-a-time shape as the rest of setup: the decade, then the exact age, then it folds to a row you can change */
/* The age that the player already gave (the four questions of couldbe.js), filled, with one tap to change it. */
function smAgeRow(w) {
  return `<div class="tile row between smage" data-fid="sm:age" style="gap:8px"><span class="small">Your age: <b>${esc(String(w.o.age))}</b><div class="tiny muted">From your four answers.</div></span><button class="ghost" data-a="smage">Change</button></div>`;
}
/* The age page is passed over in the rest of setup when the four questions already have the age. "Change" on the
   next page (smage) opens it again. */
SETUP[0].skip = w =>
  !!(w && w.cbRest && !w.ageAsk && w.o.age != null && typeof spOn === "function" && spOn(w) && !w.add);
SETUP[0].b = w => {
  const o = w.o,
    nm = w.add ? smName(w) : "";
  if (o.age != null && typeof spOn === "function" && spOn(w) && w.cbRest) return nm + smAgeRow(w);
  if (o.age != null) return nm + smBody(w, [], { now: false });
  const dots = typeof spOn === "function" && spOn(w) ? "" : smDots(w, [], null, { now: true });
  const un = `<button class="ghost wide slim" data-a="smskip" data-k="age">${NOT_SURE}</button><div class="tiny muted" data-fid="sm:tapone">${TAP_ONE}</div>${smState(w).note ? `<div class="tile tiny" role="status">${esc(smState(w).note)}</div>` : ""}`;
  if (!o.ageDec) return nm + dots + q("How old are you?", chipsRow("ageDec", Object.keys(DECADES), "", "agedec")) + un;
  const r = DECADES[o.ageDec],
    as = [];
  for (let a = r[0]; a <= r[1]; a++) as.push(a);
  return (
    nm +
    dots +
    q(
      "What is your exact age? You picked your " + esc(o.ageDec) + ".",
      `<div class="chips">${as.map(a => `<button class="chip" data-a="setn" data-k="age" data-v="${a}">${a}</button>`).join("")}</div>`
    ) +
    un
  );
};
Object.assign(ACT, {
  smage: () => {
    if (W && W.kind === "setup") {
      W.o.age = null;
      W.o.ageDec = null;
      W.err = false;
      W.ageAsk = true;
      W.step = 0;
      drawSheet();
    }
  },
});
[1, 2, 3].forEach(i => {
  SETUP[i].b = w => (i === 1 && smSkip(w, 0) ? smAgeRow(w) : "") + smBody(w, smQs(w, i));
});
SETUP[6].b = w => smBody(w, smQs(w, 6)) + (w.add || smQs(w, 6).some(q => !smAns(w, q)) ? "" : smName(w));
SETUP[6].t = "A last one";
/* The three questions of the cushion have an answer, or the player said "I'm not sure" (nothing is kept then, and
   the cushion of the profile stays the stock Guess). The last page needs the same. */
function smCushOk(w) {
  const s = smState(w);
  return SM_CUSH.every(k => !!w.o[k] || !!s.sk[k]);
}
SETUP[6].req = w => smCushOk(w);
/* Your people: the question about shared money can wait (waitq.js), so the page does not need its answer then. */
SETUP[3].req = w => !!(w.o.rel && w.o.deps && (w.o.share || (typeof wqWaits === "function" && wqWaits(w, "share"))));
SETUP.push(
  { t: "Your cushion", req: w => smCushOk(w), b: w => smBody(w, smQs(w, 7)) },
  { t: "What comes off the top", req: w => true, b: w => smBody(w, smQs(w, 8)) }
);
SETUP[4].b = w =>
  smList(
    w,
    "debtKinds",
    DEBT_KINDS.map(d => d[0]).concat("Mortgage"),
    typeof spOn === "function" && spOn(w) && !w.add
      ? "Tap each kind of debt you have. Your cards and how much come next, one at a time. If you have none, tap Next."
      : "Tap each kind of debt you have. No amounts. If you have none, tap Next.",
    (v, lk, dm) => {
      const m = v === "Mortgage",
        on = m ? !!w.o.mort : w.o.debtKinds.includes(v);
      return `<button class="rowbtn ${on ? "sel" : ""} ${dm && !on ? "dim" : ""}" data-a="${m ? "togb" : "tog"}" data-k="${m ? "mort" : "debtKinds"}" data-v="${esc(v)}"><span>${esc(v)}${lk && !on ? ` <span class="pill info">Likely</span>` : ""}</span><b>${on ? "Yes" : ""}</b></button>`;
    }
  ) + smListUnsure();
SETUP[5].b = w =>
  smList(w, "accts", ACCT_KINDS, "Tap each kind of account you have. If you have none, tap Next.", (v, lk, dm) => {
    if (typeof amAcctRow === "function" && amAcctRow(w, v) != null)
      return amAcctRow(w, v); /* amounts.js: IRA, Roth IRA */
    const on = w.o.accts.includes(v);
    return `<button class="rowbtn ${on ? "sel" : ""} ${dm && !on ? "dim" : ""}" data-a="tog" data-k="accts" data-v="${esc(v)}"><span>${esc(v)}${lk && !on ? ` <span class="pill info">Likely</span>` : ""}${ACCT_HELP[v] ? `<div class="tiny muted">${ACCT_HELP[v]}</div>` : ""}</span><b>${on ? "Yes" : ""}</b></button>`;
  }) + smListUnsure();
/* "I'm not sure" on a list of kinds (what you owe, where your money lives): nothing more is kept, and setup goes on
   as Next does. The stock amounts of the profile stay a Guess. */
function smListUnsure() {
  return `<button class="ghost wide slim" data-a="wnext">${NOT_SURE}</button><div class="tiny muted" data-fid="sm:tapone">${TAP_ONE}</div>`;
}
/* when an answer changes: clear later answers it rules out, fill in ones it settles, and move on if the step is complete */
function smCascade(w, k, seen) {
  const s = smState(w),
    o = w.o;
  seen = seen || {};
  if (seen[k]) return;
  seen[k] = 1;
  (SM_DEP[k] || []).forEach(d => {
    const r = smRule(d, o),
      cur = o[d];
    let ch = false;
    if (Array.isArray(cur)) {
      const keep = cur.filter(v => !r.hide.includes(v));
      if (keep.length !== cur.length) {
        o[d] = keep;
        ch = true;
        s.md[d] = false;
      }
    } else if (cur && r.hide.includes(cur)) {
      o[d] = null;
      ch = true;
    }
    if (d === "debtKinds" && o.mort && r.hide.includes("Mortgage")) {
      o.mort = false;
      ch = true;
    }
    if (r.only && (!o[d] || s.auto[d]) && o[d] !== r.only) {
      o[d] = r.only;
      s.auto[d] = true;
      ch = true;
    } else if (!r.only && s.auto[d]) {
      delete s.auto[d];
      o[d] = null;
    }
    if (ch) {
      const q = [].concat(SM_Q[0], SM_Q[1], SM_Q[2], SM_Q[3], SM_Q[6], SM_Q[8]).find(x => x.k === d);
      if (!r.only)
        s.note =
          'Your answer changed what fits for "' + (q ? q.s : d) + '", so that one was cleared. Tap it to answer again.';
      smCascade(w, d, seen);
    }
  });
}
/* A page is full when each question has an answer. An optional question counts when it is answered or skipped, so
   that the page waits for it (the last question of About you). */
const smFull = w => SETUP[w.step].req(w) && (smQs(w, w.step) || []).every(q => smAns(w, q));
function smAfter(w, k, was) {
  const s = smState(w);
  s.open = null;
  smInc(w);
  smCascade(w, k);
  smInc(w);
  smCascade(w, "payFreq");
  const ok = SETUP[w.step].req(w),
    qs = smQs(w, w.step),
    all = !qs || qs.every(q => smAns(w, q));
  if (!was && ok && all && !smIsLast(w) && !(w.add && w.step === 0)) {
    smStepOn(w);
    w.err = false;
    s.adv = Date.now();
    s.note = null;
  }
  drawSheet();
}
(() => {
  const _set = ACT.set,
    _setn = ACT.setn,
    _tog = ACT.tog,
    _togb = ACT.togb,
    _next = ACT.wnext,
    _back = ACT.wback,
    _dec = ACT.agedec,
    su = () => W && W.kind === "setup";
  ACT.set = t => {
    if (!su()) return _set(t);
    if (typeof spBeatOn === "function" && spBeatOn(W)) return; /* spiral.js: the pick shows for a beat */
    const w = W,
      s = smState(w),
      k = t.dataset.k,
      was = smFull(w);
    s.adv = 0;
    s.note = null;
    w.o[k] = t.dataset.v;
    if (k === "feel0") w.o.gentle = w.o[k] === "I'd rather not look"; /* gentle mode for the rest of setup */
    w.err = false;
    delete s.auto[k];
    delete s.sk[k];
    if (k === "payFreq") s.pfg = false;
    if (typeof spBeatStart === "function") spBeatStart(w, k); /* spiral.js: show the pick for a beat */
    smAfter(w, k, was);
  };
  ACT.setn = t => {
    if (!su()) return _setn(t);
    const w = W,
      s = smState(w),
      was = smFull(w);
    s.adv = 0;
    w.o[t.dataset.k] = +t.dataset.v;
    smAfter(w, t.dataset.k, was);
  };
  ACT.tog = t => {
    if (!su()) return _tog(t);
    if (typeof spBeatOn === "function" && spBeatOn(W)) return; /* spiral.js: the pick shows for a beat */
    const w = W,
      s = smState(w),
      k = t.dataset.k,
      v = t.dataset.v;
    s.adv = 0;
    s.note = null;
    /* a tap after "I'm not sure" starts the player's own list */
    let a = s.sk[k] ? [] : w.o[k] || [];
    delete s.sk[k];
    a = a.includes(v) ? a.filter(x => x !== v) : a.concat(v);
    if (k === "live" && a.includes(v)) a = v === "On my own" ? ["On my own"] : a.filter(x => x !== "On my own");
    w.o[k] = a;
    w.err = false;
    smInc(w);
    smCascade(w, k);
    smInc(w);
    smCascade(w, "payFreq");
    drawSheet();
  };
  ACT.togb = t => {
    if (su()) smState(W).adv = 0;
    return _togb(t);
  };
  ACT.agedec = t => {
    if (su()) smState(W).adv = 0;
    return _dec(t);
  };
  ACT.wback = t => {
    if (su()) {
      const s = smState(W);
      s.adv = 0;
      s.open = null;
      s.note = null;
    }
    return _back(t);
  };
  ACT.wnext = t => {
    if (su()) {
      const s = smState(W);
      if (s.adv && Date.now() - s.adv < 600) {
        s.adv = 0;
        return;
      }
      s.adv = 0;
      s.open = null;
      s.note = null;
      const qs = smQs(W, W.step);
      if (qs)
        qs.forEach(q => {
          if (q.m && (W.o[q.k] || []).length) s.md[q.k] = true;
        });
    }
    return _next(t);
  };
})();
Object.assign(ACT, {
  smopen: t => {
    const s = smState(W),
      k = t.dataset.k;
    s.adv = 0;
    s.open = k;
    s.md[k] = false;
    drawSheet();
  },
  small: t => {
    smState(W).all[t.dataset.k] = true;
    drawSheet();
  },
  /* I'm not sure (run 16, C8). Age has no typical value: nothing is kept, and the page says why it waits. A
     question of About you takes the most likely answer as a Guess (smUnsureFill). Any other one keeps nothing. */
  smskip: t => {
    const w = W,
      s = smState(w),
      k = t.dataset.k;
    if (k === "age") {
      s.note = "Your age is the one answer the plan needs. Your best guess is fine.";
      drawSheet();
      return;
    }
    const was = smFull(w),
      q = [].concat(SM_Q[0], SM_Q[1], SM_Q[2], SM_Q[3], SM_Q[6], SM_Q[8], smQs(w, w.step) || []).find(x => x.k === k),
      fill = q ? smUnsureFill(w, q) : null;
    s.sk[k] = true;
    s.note = null;
    w.o[k] = fill != null ? fill : q && q.m ? [] : null;
    smAfter(w, k, was);
  },
  smdone: t => {
    const w = W,
      s = smState(w),
      k = t.dataset.k;
    if (!(w.o[k] || []).length) {
      w.err = true;
      drawSheet();
      return;
    }
    const was = SETUP[w.step].req(w) && (smQs(w, w.step) || []).every(q => smAns(w, q) || q.opt);
    s.md[k] = true;
    if (typeof spBeatStart === "function") spBeatStart(w, k); /* spiral.js: show the picks for a beat */
    smAfter(w, k, was);
  },
});
/* Part of finishSetup() in ui.js. Keeps the pay frequency of each income kind that the player still has. Removes the work keys of the setup sheet. */
function finishSetupPay() {
  const o = W.o,
    m = {},
    ks = o.incKinds || [],
    old = (o.x || {}).incFreq || {};
  ks.forEach(k => {
    if (old[k]) m[k] = old[k];
  });
  Object.keys(o).forEach(k => {
    if (k.indexOf("pf:") === 0) delete o[k];
  });
  o.x = o.x || {};
  o.x.incFreq = m;
  o.x.payGuess = !!(W.sm && W.sm.pfg);
}
/* Part of ledRow() in ui.js. An income row shows how often it comes. */
function ledRowFreq(h, sec, x) {
  const f = sec === "incs" ? incFreqOf(C(), x.k) : null;
  return f
    ? h.replace(
        "<span>" + esc(x.k),
        "<span>" + esc(x.k) + ` <span class="pill">${f === "It varies" ? "Varies" : f}</span>`
      )
    : h;
}
ACT.incfreq = t => {
  const c = C();
  c.x = c.x || {};
  c.x.incFreq = c.x.incFreq || {};
  c.x.incFreq[t.dataset.k] = t.dataset.v;
  if (c.x.cal) {
    if (c.x.cal.src) delete c.x.cal.src[t.dataset.k];
    if (c.x.cal.vary) delete c.x.cal.vary[t.dataset.k];
  }
  save();
  render();
  drawSheet();
};
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
