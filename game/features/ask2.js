/* ============================================================================
   SLAM the Game: features/ask2.js
   PURPOSE     The same pattern as ask.js for three more places: the details of one debt, the questions
               of Key numbers, and the questions about the job match and the tax accounts. This file
               also writes each side mission from the list "What you already know" as a plain action.
   INPUT       The profile: c.x.dplan. The open sheet (W.kind): askdone. The taps of the player (the
               actions in OUTPUT).
   OUTPUT      9 functions. Parts of functions in other files: dbOneBodyAsk, knAskBodyAsk, knOneSaved,
               afterSharpAsk, sharpSheetAsk2, msSideAsk. Actions (ACT): knans, metric, sharpdone,
               akskip, akprev, dbset.
   DEPENDS ON  core/engine.js, screens/ui.js, core/metrics.js, features/debts.js, features/ask.js.
   RULES       Nothing here changes the math. The same actions as before save the answers (dbset, knans,
               set). Each money word has an explanation on the screen where it first shows.
   ========================================================================= */
const AK_DB = {
  apr: {
    q: "What yearly rate does this debt charge?",
    what: "When you borrow money, you pay back extra. The extra is called interest. The yearly rate is a percent, and bills call it APR.",
    why: "The rate decides which debt costs you the most every month.",
    find: "Look for the letters APR on your bill or in the lender's app.",
    set: x => (x.apr ? "Rate: " + (x.rate != null ? x.rate + "%" : String(x.apr).toLowerCase()) : null),
  },
  pay: {
    q: "How much do you pay on this each month?",
    what: "The amount you send every month. If it changes, use what you sent last month.",
    why: "So the game can tell you the month this debt will be gone.",
    find: "Open your bank app. Find last month's payment to this lender.",
    set: x => (x.pay != null ? "You pay " + money(x.pay) + " a month" : null),
  },
  lim: {
    q: "What is the most this card lets you borrow?",
    what: "That number is called the credit limit.",
    why: "Using only a small part of your limit helps your credit score. The game works out how much you use.",
    find: "Open the card's app. Look for Credit limit.",
    set: x => (x.lim != null ? "Limit: " + money(x.lim) : null),
  },
  hassle: {
    q: "How much does this debt bother you?",
    what: "1 means you barely think about it. 5 means it is on your mind a lot.",
    why: "Some people feel better clearing the most annoying debt first. This lets the game build that plan too.",
    find: "Nowhere to look. Go with your gut.",
    set: x => (x.hassle != null ? "It bothers you " + x.hassle + " out of 5" : null),
  },
};
function akSteps(x) {
  return /card/i.test(x.k) ? ["apr", "pay", "lim", "hassle"] : ["apr", "pay", "hassle"];
}
function akHas(x, k) {
  return k === "apr" ? dbRate(x).cf > 0 : k === "pay" ? x.pay != null : k === "lim" ? x.lim != null : x.hassle != null;
}
function akPad(w, k, i) {
  const key = "db_" + k;
  return w.pad === key
    ? `<div class="val">${money((w.o || {})[key] || 0)}</div>${keypad(key)}<button class="primary wide" data-a="dbset" data-k="${k}" data-l="${i}" data-v="typed">Use ${money((w.o || {})[key] || 0)}</button>`
    : `<button class="ghost slim" data-a="padopen" data-k="${key}">Type the exact number</button>`;
}
/* Part of dbOneBody() in debts.js. In the sheet for one debt (W.kind "dbone"), asks one small question at a time: the rate, the payment, the limit, how much it bugs you. Returns null in all other sheets. */
function dbOneBodyAsk(c, i) {
  const x = c.debts[i],
    w = W;
  if (!x || !w || w.kind !== "dbone") return null;
  const S = akSteps(x);
  w.ak = true;
  if (w.step == null) {
    const f = S.findIndex(k => !akHas(x, k));
    w.step = f < 0 ? 0 : f;
  }
  if (w.step >= S.length) {
    const P = (c.x && c.x.dplan) || {},
      pl = dbPlan(c, w.order || P.order || "avalanche", w.extra != null ? w.extra : P.extra || 0),
      me = pl.debts.find(d => d.i === i),
      st = dbStatus(c),
      nx = dbLive(c).find(o => o.i !== i && dbMissing(o.x).length),
      got = S.map(k => AK_DB[k].set(x)).filter(Boolean),
      miss = S.filter(k => k !== "hassle" && !akHas(x, k));
    return (
      head("What you owe", esc(x.k)) +
      `<div class="tile stack" style="gap:6px"><b>What you just did</b>${got.length ? got.map(t => `<div class="small bkdid"><span class="bktick">✓</span><span>${esc(t)}</span></div>`).join("") : `<div class="small">Nothing was changed.</div>`}${miss.length ? `<div class="small">Still a guess: ${miss.map(k => (k === "apr" ? "the rate" : k === "pay" ? "the payment" : "the limit")).join(", ")}. That is fine. Come back when you have it.</div>` : ""}</div>` +
      `<div class="tile stack" style="gap:6px"><b>What that changed</b><div class="small">${me && me.off != null ? "On these payments, this debt is gone by <b>" + dbMonth(me.off) + "</b>, with about " + money(Math.round(me.interest)) + " more in interest." : "On these payments this debt does not clear yet. A bigger payment gives it an end date."}</div><div class="small">Your debt plan is now <span class="pill">${st}</span></div></div>` +
      (nx
        ? `<div class="tile small"><b>What comes next:</b> the same few questions for ${esc(nx.x.k)}.</div><button class="primary wide go" data-a="dbone" data-v="${nx.i}">Next debt: ${esc(nx.x.k)}</button><button class="ghost wide" data-a="debtplan">See my debt plan</button>`
        : `<button class="primary wide go" data-a="debtplan">See my debt plan</button>`)
    );
  }
  const k = S[w.step],
    A = AK_DB[k],
    est = dbEst(x),
    po = [est]
      .concat([0.5, 1.5, 2, 3, 5].map(f => dbNice(est * f)))
      .filter((v, n, a) => v > 0 && a.indexOf(v) === n)
      .sort((a, b) => a - b),
    r = dbRate(x);
  const body =
    k === "apr"
      ? dbChips("apr", i, APR_BANDS.concat(["No interest"]), x.apr, v => v) +
        (r.cf === 0 ? `<div class="tiny muted">Until you pick, the game guesses ${r.v}%.</div>` : "") +
        `<button class="ghost slim" data-a="rowedit" data-k="debts" data-v="${i}">Type the exact rate</button>`
      : k === "pay"
        ? dbChips("pay", i, po, x.pay) +
          (x.pay == null ? `<div class="tiny muted">The game's guess is about ${money(est)} a month.</div>` : "") +
          akPad(w, "pay", i)
        : k === "lim"
          ? dbChips("lim", i, [500, 1000, 2500, 5000, 10000, 20000, 40000], x.lim) + akPad(w, "lim", i)
          : dbChips("hassle", i, [1, 2, 3, 4, 5], x.hassle, v =>
              v === 1 ? "1 · barely" : v === 5 ? "5 · a lot" : String(v)
            );
  return (
    head("What you owe", esc(x.k)) +
    `<div class="tiny muted">Question ${w.step + 1} of ${S.length} · you owe ${money(x.amt)} on this</div><div class="tile"><div class="eyebrow">${esc(x.k)}</div><h2 style="margin:4px 0 0">${A.q}</h2></div>` +
    askParts({
      what: A.what,
      body:
        body +
        (akHas(x, k) ? askBtn("akskip", "Keep this answer, next", "primary go") : "") +
        askBtn("akskip", k === "hassle" ? "Skip this one" : "I don't know yet", "ghost") +
        (w.step > 0 ? askBtn("akprev", "Back one", "ghost slim") : ""),
      why: A.why,
      find: A.find,
    })
  );
}
const AK_KN = {
  tax: {
    q: "Out of every $100 you earn, about how many dollars are taken out before you get paid?",
    what: "Taxes and a few other things come out of your pay before it reaches your bank.",
    why: "So the game can tell your pay before taxes from the money you really get.",
    find: "A pay stub. The top shows pay before taxes. The bottom shows what you got.",
    lab: v => "$" + v,
  },
  debtPay: {
    q: "How much do you pay toward all your debts in one month?",
    what: "Add up every payment: cards, loans, a car.",
    why: "So the game can show how much of your pay goes to debt.",
    find: "Open your bank app. Add up last month's payments to lenders.",
  },
  limit: {
    q: "If you add up the limits on all your cards, what do you get?",
    what: "A card's limit is the most it lets you borrow.",
    why: "Using a small part of your limits helps your credit score. The game works out how much you use.",
    find: "Each card's app shows Credit limit.",
  },
  pre: {
    q: "How much of your pay goes into a retirement plan at work each month?",
    what: "This comes out before your pay lands. No plan at work means $0.",
    why: "This is saving you already do. The game should count it.",
    find: "Your pay stub: a line that says 401(k), 403(b) or retirement.",
  },
  matchAmt: {
    q: "How much does your job add to that plan each month?",
    what: "Some jobs add money when you do. That is called a match. No match means $0.",
    why: "A match is free money. The game counts it as part of what you save.",
    find: "Your pay stub or benefits site. Look for Employer match.",
  },
  pay1: {
    q: "About a year ago, how much did you bring home in a month?",
    what: "Close is fine. From here on the game keeps track for you.",
    why: "So the game can show whether your pay is growing.",
    find: "Open your bank app. Look at the deposits from a year ago.",
  },
  fee: {
    q: "What do your investments cost you each year?",
    what: "Funds charge a small yearly fee, shown as a percent. An advisor adds their own fee on top.",
    why: "A small fee takes a big bite over many years. The game shows it in dollars.",
    find: "Next to each fund, look for the words Expense ratio.",
  },
  carPay: {
    q: "How much is your car payment each month?",
    what: "Only the loan or lease payment. No car payment means $0.",
    why: "So the game can compare it to your pay.",
    find: "Open your bank app. Find last month's payment to the car lender.",
  },
  give: {
    q: "How much do you give away each month?",
    what: "Charity, tithing, or supporting someone.",
    why: "Giving is part of where your money goes. The game shows it as a share of your pay.",
    find: "Your bank app, or your best memory.",
  },
};
/* Part of knAskBody() in metrics.js. For a key number in AK_KN, asks one small question with a why and a where-to-look. Returns null for all other numbers. */
function knAskBodyAsk(c, k) {
  const a = KN_ASK[k],
    A = AK_KN[k];
  if (!a || !A) return null;
  const cur = knGot(c, k),
    o = W.o || {},
    opts = a.rel
      ? a.rel.map(f => Math.round(((c.take || 0) * f) / 50) * 50).filter((v, i, arr) => v > 0 && arr.indexOf(v) === i)
      : a.opts,
    lab = A.lab || (v => (a.pct ? v + "%" : money(v)));
  return (
    `<div class="tile"><h2 style="margin:0">${A.q}</h2></div>` +
    askParts({
      what: A.what,
      body:
        `<div class="small">Tap the closest one.</div><div class="chips">${opts.map(v => `<button class="chip ${cur && cur.v === v ? "on" : ""}" data-a="knans" data-k="${k}" data-v="${v}">${lab(v)}</button>`).join("")}</div>${a.pct ? "" : W.pad === "ask_" + k ? `<div class="val">${money(o["ask_" + k] || 0)}</div>${keypad("ask_" + k)}<button class="primary wide" data-a="knans" data-k="${k}" data-v="typed">Use ${money(o["ask_" + k] || 0)}</button>` : `<button class="ghost slim" data-a="padopen" data-k="ask_${k}">Type the exact number</button>`}${(k === "debtPay" || k === "limit") && (c.debts || []).some(x => x.amt > 0) ? `<button class="ghost slim" data-a="debtplan">Or answer for each debt, one at a time</button>` : ""}` +
        askBtn("keynums", "I don't know yet", "ghost"),
      why: A.why,
      find: A.find,
    })
  );
}
(() => {
  const _a = ACT.knans;
  ACT.knans = t => {
    const k = t.dataset.k;
    _a(t);
    if (W && W.kind === "metric" && !W.ask) {
      W.just = k;
      drawSheet();
    }
  };
  const _m = ACT.metric;
  ACT.metric = t => {
    _m(t);
    if (W) W.just = null;
  };
})();
/* Part of knOne() in metrics.js. Directly after an answer, adds the line "Saved. This number now runs on your answer". */
function knOneSaved(h) {
  if (!W || !W.just) return h;
  const i = h.indexOf('<div class="tile');
  return i < 0
    ? h
    : h.slice(0, i) +
        `<div class="tile small askwhy"><b>Saved.</b> This number now runs on your answer, not on a guess. You can change it any time.</div>` +
        h.slice(i);
}

const AK_SH = {
  match: {
    thing: "Your job",
    q: "Does your job add money to your retirement plan when you do?",
    what: "Some jobs do this. It is called a match, and it is free money.",
    why: "If there is a match you are not getting, that is usually the first money move to make.",
    opts: [
      ["Yes, and I get all of it", "Yes, and I get all of it"],
      ["Yes, but I don't get all of it", "Yes, but I don't get all of it"],
      ["My job has no match", "No, my job has no match"],
      ["I'm not sure", "I'm not sure"],
    ],
    res: c =>
      c.match === "yes"
        ? "You get the full match. That step is done."
        : c.match === "no match offered"
          ? "Your job has no match. The game skips that step."
          : "There is a match you are not fully getting. The game moved it near the top of your list.",
  },
  tax: {
    thing: "Your accounts",
    q: "Do you put money in accounts that lower your taxes?",
    what: "These are a Roth IRA, an HSA, and the retirement plan at work. Money inside them is taxed less, so it grows faster.",
    why: "The game checks whether this step is done, or still ahead of you.",
    opts: [
      ["All of them are full", "Yes, as much as the rules allow"],
      ["I put in some", "Yes, some"],
      ["Not yet", "Not yet"],
    ],
    res: c =>
      c.tax === "yes"
        ? "Your tax-friendly accounts are full. That step is done."
        : c.tax === "some"
          ? "You use them, with room left. The game keeps that step open."
          : "Not yet. The game will bring it up when it is your next step.",
  },
};
var AKX = { pend: null };
(() => {
  const _d = ACT.sharpdone;
  ACT.sharpdone = () => {
    const k = W && W.kind === "sharp" ? W.q : null;
    AKX.pend = AK_SH[k] && W.o && W.o[k] ? k : null;
    try {
      _d();
    } finally {
      AKX.pend = null;
    }
  };
})();
/* Part of afterSharp() in ui.js. After one small question from sharpSheetAsk2(), opens the sheet "Done": what the player did, what that changed, what comes next.
   Returns true when it opened the sheet. Returns false when afterSharpBase() must run. */
function afterSharpAsk(c) {
  const k = AKX.pend;
  AKX.pend = null;
  if (!k || (!c.placed && sharpPct(c) >= 100)) return false;
  const nx = sharpNext(c, todayISO());
  W = { kind: "askdone", q: k };
  sheet(
    () =>
      head("Done", SHARP_Q[k]) +
      `<div class="tile stack" style="gap:6px"><b>What you just did</b><div class="small bkdid"><span class="bktick">✓</span><span>You answered one question about ${k === "match" ? "your job" : "your accounts"}.</span></div></div><div class="tile stack" style="gap:6px"><b>What that changed</b><div class="small">${AK_SH[k].res(c)}</div></div>` +
      (nx
        ? `<div class="tile small"><b>What comes next:</b> ${SHARP_Q[nx]}. One small question at a time.</div>` +
          askBtn("askmore", "Keep going", "primary go") +
          askBtn("close", "Stop here for now", "ghost")
        : askBtn("askmore", "Done", "primary go"))
  );
  return true;
}

/* Part of sharpSheet() in ui.js. The questions in AK_SH (the job match, the accounts) have their own form. Returns null for all other questions. */
function sharpSheetAsk2() {
  const w = W,
    k = w && w.q,
    A = AK_SH[k];
  if (!A || !w.o) return null;
  const cur = w.o[k];
  return (
    head("Make your numbers real", SHARP_Q[k]) +
    `<div class="tile"><div class="eyebrow">${A.thing}</div><h2 style="margin:4px 0 0">${A.q}</h2></div>` +
    askParts({
      what: A.what,
      body:
        `<div class="stack" style="gap:6px">${A.opts.map(o => `<button class="rowbtn ${cur === o[0] ? "sel" : ""}" data-a="set" data-k="${k}" data-v="${o[0]}"><span>${o[1]}</span><span class="caret"><i class=chev aria-hidden=true></i></span></button>`).join("")}</div>` +
        (k === "tax" ? askBtn("sharpskip", "I'm not sure", "ghost") : ""),
      why: A.why,
      find: SHARP_FIND[k],
    })
  );
}

Object.assign(ACT, {
  akskip: () => {
    const w = W;
    if (!w || w.kind !== "dbone") return;
    w.pad = null;
    w.step = (w.step || 0) + 1;
    drawSheet();
  },
  akprev: () => {
    const w = W;
    if (!w || w.kind !== "dbone") return;
    w.pad = null;
    w.step = Math.max(0, (w.step || 0) - 1);
    drawSheet();
  },
});
(() => {
  const _s = ACT.dbset;
  ACT.dbset = t => {
    const w = W,
      on = w && w.kind === "dbone" && w.ak,
      c = C(),
      i = +t.dataset.l,
      x = c.debts[i],
      k = t.dataset.k,
      S = x ? akSteps(x) : [],
      at = on ? S[w.step] : null;
    _s(t);
    if (on && W && W.kind === "dbone" && at === k) {
      W.step = (W.step || 0) + 1;
      drawSheet();
    }
  };
})();
const AK_MS = {
  "What you owe": "Tell the game what you owe",
  "Whether you owe anything": "Answer one question: do you owe money?",
  "How much you owe on each": "Check how much you owe on each debt",
  "The rate on each": "Find the rate on each debt",
  "What you pay on each a month": "Enter what you pay on each debt",
  "A plan for which one goes first": "Pick which debt to pay first",
  "Cash you can reach": "Check how much cash you have",
  "What you have invested": "Check what your investments are worth",
  "What your investments cost a year": "Find what your investments cost you",
  "Whether you have anything invested": "Answer one question: do you have money invested?",
  "Where your money goes each month": "Check what you spend each month",
  "Your spending checked against a real statement": "Check your spending against a bank statement",
  "What comes in each month": "Check how much money comes in",
  "What one unit of your work really pays": "Work out what one shift or gig really pays",
  "Whether your job adds to your savings": "Answer one question about your job's match",
  "Your lowest normal month": "Enter what a slow month brings in",
  "How much to set aside from untaxed money": "Set how much to save for taxes",
  "Which of your accounts are tax-friendly": "Answer one question about your accounts",
  "Your tax rate": "Enter how much of your pay goes to taxes",
};
/* Part of msSide() in missions.js. Gives each mission "know" a plain title, a plain reward line and a plain reason. */
function msSideAsk(out) {
  return out.map(m => {
    if (String(m.id).indexOf("know:") !== 0) return m;
    const f = String(m.id).split(":").slice(2).join(":"),
      t = AK_MS[f];
    const g = /^(.*) goes from (\d+)% to (\d+)% known$/.exec(String(m.pay || "")),
      pay = g ? "What you know about " + g[1].toLowerCase() + ": " + g[2] + "% to " + g[3] + "%" : m.pay;
    return t ? Object.assign({}, m, { t, pay, why: "One more thing you know for sure, instead of a guess." }) : m;
  });
}

if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
