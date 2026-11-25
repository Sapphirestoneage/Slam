/* ============================================================================
   SLAM the Game: screens/smart.js
   PURPOSE     The setup questions change with each answer. The probable answers come first, the
               improbable answers fade, and answers that cannot be true together go behind "Show more".
   INPUT       The profile: c.x.cal, c.x.incFreq. The taps of the player (the actions in OUTPUT).
   OUTPUT      15 functions. Parts of functions in other files: finishSetupPay, ledRowFreq. Actions
               (ACT): smage, set, setn, tog, togb, agedec, wback, wnext, smopen, small, smskip, smdone,
               incfreq.
   DEPENDS ON  core/engine.js, screens/ui.js.
   RULES       No answer is locked. Each answer is one tap away.
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
        hide: ["A main job", "A second job"],
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
      l: "What's your work right now?",
      s: "Work",
      o: ["Student", "First job", "A few jobs or gigs", "Established", "Between jobs", "Self-employed", "Retired"],
      h: "Tap the closest one. You'll see what it means.",
    },
    { k: "incKinds", l: "Where does your money come from?", s: "Money comes from", o: INC_KINDS, m: 1 },
    {
      k: "steady",
      l: "Is your money about the same each month, or does it move around?",
      s: "Same each month?",
      o: ["Steady", "Changes month to month"],
      h: "When each kind of money lands gets set later, on your month.",
    },
  ],
  2: [
    { k: "homeQ", l: "Where do you live?", s: "Home", o: Object.keys(HOMEMAP), h: "Rent, own, or no cost to you." },
    {
      k: "live",
      l: "Who lives there with you?",
      s: "Lives with you",
      o: ["On my own", "Roommates", "A partner", "Kids", "Parents or family"],
      m: 1,
    },
  ],
  3: [
    {
      k: "rel",
      l: "Relationship",
      s: "Relationship",
      o: ["Single by choice", "Single, seeking", "Dating", "Partnered", "Married"],
    },
    {
      k: "deps",
      l: "Does anyone rely on you for money?",
      s: "Relies on you",
      o: ["None", "Planning", "Kids", "Supporting a parent", "Pets"],
    },
    {
      k: "share",
      l: "Do you combine money with anyone?",
      s: "Combine money with",
      o: ["No one", "A partner", "More than one partner", "Family"],
      h: "Splitting rent or bills with a roommate doesn't count. This is about shared accounts or shared goals.",
    },
  ],
  0: [
    {
      k: "can1k",
      l: "A $1,000 surprise bill lands today. Could you pay it without borrowing?",
      s: "A $1,000 surprise",
      o: ["Yes", "No"],
    },
    {
      k: "cover",
      l: "If money stopped coming in, how long could you cover your bills?",
      s: "Could cover bills for",
      o: Object.keys(COVER),
    },
    { k: "invest", l: "Do you put money into investments?", s: "Investing", o: ["No", "Sometimes", "Every month"] },
  ],
  6: [
    {
      k: "ssq",
      l: "Should the game count Social Security in your plan?",
      s: "Social Security",
      o: ["Yes, at three quarters, to be careful", "Yes, in full", "No, leave it out"],
      opt: 1,
    },
    {
      k: "feel0",
      l: "When you think about your money, what's closest?",
      s: "How money feels",
      o: ["Mostly fine", "A bit stressed", "I'd rather not look"],
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
/* THE ORDER OF THE PAGES: the five rounds D, A, I, T, E (features/spiral.js). About you comes first.
   D: what you owe (4). A: where your money lives (5), your cushion (7). I: your work (1). T: what comes off
   the top (8). E: your home (2), your people (3), the last two (6). */
const SM_ORDER = [0, 4, 5, 7, 1, 8, 2, 3, 6];
/* T: the taxes round. A question about the match only for a player with a job. */
SM_Q[8] = [
  {
    k: "taxQ",
    l: "About how much of your pay goes to taxes before it lands?",
    s: "Taxes off the top",
    o: ["About 10%", "About 15%", "About 20%", "About 25%", "About 30%", "I don't know"],
    h: "A pay stub shows pay before taxes at the top and what lands at the bottom. A guess is fine.",
  },
  {
    k: "matchQ",
    l: "Does your job add money when you save for retirement (a match)?",
    s: "Match from your job",
    o: ["Yes, and I get all of it", "Yes, but not all of it", "My job has no match", "I don't know"],
    h: "A match is money your job adds when you put money in its retirement plan.",
  },
  {
    k: "taxAcctQ",
    l: "Do you put money into a tax-friendly account, like a 401(k), an IRA or an HSA?",
    s: "Tax-friendly saving",
    o: ["Yes, the most I'm allowed", "Yes, some", "Not this year", "I don't know"],
  },
];
const SM_TAXACCT = ["Retirement plan at work", "IRA or Roth IRA", "HSA"];
function smQs(w, i) {
  if (i === 0) return [];
  if (i === 7) return SM_Q[0];
  if (i === 8)
    return SM_Q[8].filter(
      q =>
        (q.k !== "matchQ" || (isEmployee(w.o) && (w.o.incKinds || []).some(k => /job/.test(k)))) &&
        (q.k !== "taxAcctQ" || (w.o.accts || []).some(a => SM_TAXACCT.includes(a)))
    );
  return SM_Q[i];
}
/* The page after page i, or null after the last page. */
function smNextPage(i) {
  const k = SM_ORDER.indexOf(i);
  return k >= 0 && k < SM_ORDER.length - 1 ? SM_ORDER[k + 1] : null;
}
function smPrevPage(i) {
  const k = SM_ORDER.indexOf(i);
  return k > 0 ? SM_ORDER[k - 1] : null;
}
const smIsLast = w => w.step === SM_ORDER[SM_ORDER.length - 1];
/* Go to the next page. Between two rounds, spiral.js shows the number of the round first. */
function smStepOn(w) {
  if (typeof spRoundEnd === "function" && spRoundEnd(w)) return; /* spiral.js: the round just ended */
  const n = smNextPage(w.step);
  if (n != null) w.step = n;
  if (typeof spUpSoon === "function") spUpSoon(); /* spiral.js: the new page starts at its top */
}
function smStepBack(w) {
  const n = smPrevPage(w.step);
  if (n != null) w.step = n;
}
/* Part of finishSetup() in ui.js. The answers of the taxes round go to the profile, then the work keys go. */
function finishSetupTax() {
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
    "How often does it come in?",
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
function smChips(w, q) {
  const s = smState(w),
    o = w.o,
    cur = o[q.k],
    multi = !!q.m,
    sel = v => (multi ? (cur || []).includes(v) : cur === v),
    od = smOrder(q.k, q.o, o, s.all[q.k]),
    none = multi ? !(cur || []).length : !cur,
    top = od.r.first.find(v => od.list.includes(v));
  return `<div class="chips">${od.list.map(v => `<button class="chip ${sel(v) ? "on" : ""} ${none && v === top ? "likely" : ""} ${od.r.dim.includes(v) && !sel(v) ? "dim" : ""}" data-a="${multi ? "tog" : "set"}" data-k="${q.k}" data-v="${esc(v)}">${esc(v)}</button>`).join("")}${od.hid.length ? `<button class="chip more" data-a="small" data-k="${q.k}">Show ${od.hid.length} more</button>` : ""}${q.opt ? `<button class="chip more" data-a="smskip" data-k="${q.k}">Skip</button>` : ""}</div>${od.moved && od.r.why && none ? `<div class="tiny muted">Most likely first, because ${od.r.why}.${od.hid.length ? " The rest are one tap away." : ""}</div>` : ""}`;
}
const smAns = (w, q) => {
  const s = smState(w),
    v = w.o[q.k];
  return q.m ? (v || []).length > 0 && !!s.md[q.k] : (v != null && v !== "") || !!(q.opt && s.sk[q.k]);
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
      pv && !pv.m && smAns(w, pv) && OPT_DESC[o[pv.k]]
        ? `<div class="tiny muted">✓ <b>${esc(o[pv.k])}:</b> ${OPT_DESC[o[pv.k]]}</div>`
        : "",
    auto = qs.filter(x => s.auto[x.k] && smAns(w, x) && x.k !== open).map(x => x.s);
  return (
    (typeof spOn === "function" && spOn(w)
      ? ""
      : smDots(w, qs, open, pre)) /* spiral.js: the checklist of the round takes its place */ +
    echo +
    (q
      ? `<div class="field smopen ${missing(w, q.k) ? "miss" : ""}"><div class="small"><b>${q.l}</b>${q.m ? " Tap all that fit." : ""}${q.opt ? " (optional)" : ""}</div>${smChips(w, q)}${!q.m && OPT_DESC[o[q.k]] ? `<div class="tile small"><b>${o[q.k]}:</b> ${OPT_DESC[o[q.k]]}</div>` : q.h ? `<div class="tiny muted">${q.h}</div>` : ""}${q.m ? `<button class="${(o[q.k] || []).length ? "primary go" : "ghost"} wide slim" data-a="smdone" data-k="${q.k}">That's all</button>` : ""}</div>`
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
SETUP[0].b = w => {
  const o = w.o,
    nm = w.add ? smName(w) : "";
  if (o.age != null) return nm + smBody(w, [], { now: false });
  const dots = typeof spOn === "function" && spOn(w) ? "" : smDots(w, [], null, { now: true });
  if (!o.ageDec) return nm + dots + q("How old are you?", chipsRow("ageDec", Object.keys(DECADES), "", "agedec"));
  const r = DECADES[o.ageDec],
    as = [];
  for (let a = r[0]; a <= r[1]; a++) as.push(a);
  return (
    nm +
    dots +
    q(
      "Exactly how old? You picked your " + esc(o.ageDec) + ".",
      `<div class="chips">${as.map(a => `<button class="chip" data-a="setn" data-k="age" data-v="${a}">${a}</button>`).join("")}</div>`
    )
  );
};
Object.assign(ACT, {
  smage: () => {
    if (W && W.kind === "setup") {
      W.o.age = null;
      W.o.ageDec = null;
      W.err = false;
      drawSheet();
    }
  },
});
[1, 2, 3].forEach(i => {
  SETUP[i].b = w => smBody(w, smQs(w, i));
});
SETUP[6].b = w => smBody(w, smQs(w, 6)) + (w.add || smQs(w, 6).some(q => !smAns(w, q)) ? "" : smName(w));
SETUP[6].t = "A last two";
SETUP.push(
  { t: "Your cushion", req: w => !!(w.o.can1k && w.o.cover && w.o.invest), b: w => smBody(w, smQs(w, 7)) },
  { t: "What comes off the top", req: w => true, b: w => smBody(w, smQs(w, 8)) }
);
SETUP[4].b = w =>
  smList(
    w,
    "debtKinds",
    DEBT_KINDS.map(d => d[0]).concat("Mortgage"),
    "Tap every kind you have. No amounts. If you have none, just tap Next.",
    (v, lk, dm) => {
      const m = v === "Mortgage",
        on = m ? !!w.o.mort : w.o.debtKinds.includes(v);
      return `<button class="rowbtn ${on ? "sel" : ""} ${dm && !on ? "dim" : ""}" data-a="${m ? "togb" : "tog"}" data-k="${m ? "mort" : "debtKinds"}" data-v="${esc(v)}"><span>${esc(v)}${lk && !on ? ` <span class="pill info">Likely</span>` : ""}</span><b>${on ? "Yes" : ""}</b></button>`;
    }
  );
SETUP[5].b = w =>
  smList(w, "accts", ACCT_KINDS, "Tap every kind of account you have. If none, just tap Next.", (v, lk, dm) => {
    const on = w.o.accts.includes(v);
    return `<button class="rowbtn ${on ? "sel" : ""} ${dm && !on ? "dim" : ""}" data-a="tog" data-k="accts" data-v="${esc(v)}"><span>${esc(v)}${lk && !on ? ` <span class="pill info">Likely</span>` : ""}${ACCT_HELP[v] ? `<div class="tiny muted">${ACCT_HELP[v]}</div>` : ""}</span><b>${on ? "Yes" : ""}</b></button>`;
  });
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
const smFull = w => SETUP[w.step].req(w) && (smQs(w, w.step) || []).every(q => smAns(w, q) || q.opt);
function smAfter(w, k, was) {
  const s = smState(w);
  s.open = null;
  smInc(w);
  smCascade(w, k);
  smInc(w);
  smCascade(w, "payFreq");
  const ok = SETUP[w.step].req(w),
    qs = smQs(w, w.step),
    all = !qs || qs.every(q => smAns(w, q) || q.opt);
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
    let a = w.o[k] || [];
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
  smskip: t => {
    const w = W,
      s = smState(w),
      k = t.dataset.k;
    s.sk[k] = true;
    w.o[k] = null;
    s.open = null;
    drawSheet();
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
