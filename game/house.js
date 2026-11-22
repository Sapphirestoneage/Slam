/* ===== house.js: Our household. For any household that is not "one person or one married couple": three partners, two homes, chosen family, a couple where one person leads on money. Three parts in one sheet, plus one page for a planner.
 (1) The picture: everyone's money added up, who brings what, how long the household's cash lasts, and what happens to the month if any one person's income stops.
 (2) The paperwork: what a marriage certificate gives two people automatically, as a checklist of taps, for everyone the law does not connect. It is a list of questions for a lawyer. It is not legal advice, and it says so.
 (3) A money agreement: who decides what, a spend-without-asking limit, a review date, and five safeguards that have to be true for it to count as agreed. The game records an agreement people made. It never enforces one: nobody is ever locked out of anything, and either person can end it with one tap.
 People come from Sharing costs fairly (profiles in this game, or guests added by tap). A made-up household of three can be loaded to look around; it lives only inside this tool and touches no real profile. ===== */
const HS_SAMPLE = [
  { n: "Rin", inc: 6200, spend: 3100, cash: 9000, inv: 42000, debt: 0, full: true },
  { n: "Sol", inc: 3400, spend: 2600, cash: 1800, inv: 6000, debt: 7400, full: true },
  { n: "Tay", inc: 1500, spend: 1500, cash: 400, inv: 0, debt: 2100, full: true },
];
const HS_DOCS = [
  [
    "benef",
    "Beneficiaries named on every account",
    "Retirement accounts, life insurance, and bank accounts with a pay-on-death form. The form on the account beats what a will says.",
  ],
  [
    "proxy",
    "A health care proxy for each person",
    "The paper that says who makes medical decisions when you cannot. Without it, hospitals turn to legal family.",
  ],
  ["hipaa", "A medical information release", "So the people you choose can be told what is going on."],
  ["poa", "A power of attorney for money", "Who can pay your bills and sign for you if you are unable to."],
  ["will", "A will for each person", "Without one, state law decides, and it gives everything to legal relatives."],
  [
    "home",
    "Whose name is on the lease or the deed",
    "The person not on it may have no right to stay. Worth knowing before it matters.",
  ],
  [
    "health",
    "Who is covered by whose health insurance",
    "A job's plan covering a partner you are not married to is often taxed as extra pay. Ask the benefits office.",
  ],
  [
    "agree",
    "A written agreement about what is shared",
    "What happens to the home, the pets and the shared things if someone leaves. Calm-day paperwork.",
  ],
  ["kids", "Who can act for the children", "School pickup, medical consent, and who you would name as guardian."],
  [
    "survivor",
    "A plan for what only a spouse gets",
    "Social Security survivor benefits and most pensions go only to a legal spouse. Life insurance is the usual way to fill that gap.",
  ],
  ["where", "One place where the papers live", "And everyone knows where that is."],
];
const HS_SAFE = [
  [
    "see",
    "Everyone can see everything",
    "All the numbers, all the accounts, any time. No hidden money in either direction.",
  ],
  ["exit", "Each person keeps their own exit fund", "Money in their own name that the agreement never touches."],
  [
    "basics",
    "The basics are never part of it",
    "Housing, food, health care and getting to work are not used as rewards or limits.",
  ],
  ["review", "It gets looked at again on a date", "An agreement that is never revisited stops being agreed."],
  ["end", "Anyone can end it, any time, with no penalty", "Saying stop is always allowed."],
];
function hsGet() {
  const h = G.hh || {};
  return { sample: !!h.sample, docs: h.docs || {}, ag: h.ag || null, ended: h.ended || [] };
}
function hsPut(patch) {
  G.hh = Object.assign(hsGet(), patch);
  save();
}
/* what the engine itself counts as owed, so this page and Key numbers never disagree */
function hsOwed(c) {
  return c.debt != null ? c.debt : (c.debts || []).reduce((a, x) => a + (x.amt || 0), 0);
}
function hsPeople() {
  if (hsGet().sample) return HS_SAMPLE.map(p => Object.assign({}, p));
  const base = typeof frPpl === "function" ? (frState().ppl ? frPpl() : []) : [];
  return base.map(p => {
    const c = p.linked ? G.chars[p.from] : null;
    if (!c) return { n: p.n, inc: p.inc || 0, spend: 0, cash: 0, inv: 0, debt: 0, full: false };
    const d = derive(c);
    return {
      n: p.n,
      inc: c.take || 0,
      spend: c.spend || 0,
      cash: d.cash || 0,
      inv: c.inv || 0,
      debt: hsOwed(c),
      full: true,
      guess: !c.led || [c.incs, c.spends, c.cashes].some(a => (a || []).some(r => !r.s)),
    };
  });
}
function hsSum(P) {
  const s = k => P.reduce((a, p) => a + (p[k] || 0), 0),
    inc = s("inc"),
    spend = s("spend"),
    cash = s("cash"),
    inv = s("inv"),
    debt = s("debt"),
    full = P.length > 0 && P.every(p => p.full);
  return {
    n: P.length,
    inc,
    spend,
    left: inc - spend,
    cash,
    inv,
    debt,
    nw: cash + inv - debt,
    months: spend > 0 ? cash / spend : null,
    full,
    guess: P.some(p => p.guess),
  };
}
function hsStop(P, i) {
  const S = hsSum(P),
    left = S.left - P[i].inc;
  return { left, months: left < 0 && S.cash > 0 ? S.cash / -left : null };
}
function hsMo(n) {
  return n == null
    ? ""
    : n >= 24
      ? (n / 12).toFixed(1) + " years"
      : n < 1
        ? "under a month"
        : (n < 10 ? n.toFixed(1) : Math.round(n)) + " months";
}
function hsPicture() {
  const P = hsPeople(),
    S = hsSum(P),
    H = hsGet();
  if (P.length < 2)
    return `<div class="tile small">A household needs at least two people. Add them under Sharing costs fairly, or look around with a made-up household of three.</div><button class="primary wide" data-a="fair">Add the people</button><button class="ghost wide slim" data-a="hssample" data-v="1">Load a made-up household</button>`;
  const top = Math.max.apply(null, P.map(p => p.inc).concat([1]));
  return `${H.sample ? `<div class="banner small"><b>Made-up household.</b> Rin, Sol and Tay are invented. Nothing here is saved to a real person. <button class="term" data-a="hssample" data-v="0">Clear it</button></div>` : ""}
 <div class="cpgrid" style="grid-template-columns:1fr 1fr">${cpCell(money(S.inc), "comes in a month")}${cpCell(money(S.spend), "goes out a month")}${cpCell(money(Math.abs(S.left)), S.left >= 0 ? "left over, together" : "short, together")}${cpCell(S.months == null ? "?" : hsMo(S.months), "the cash would last")}</div>
 <div class="cpgrid" style="grid-template-columns:1fr 1fr 1fr">${cpCell(money(S.cash), "cash")}${cpCell(money(S.inv), "invested")}${cpCell(money(S.debt), "owed")}</div>
 ${!S.full ? `<div class="tiny muted">Some people here are guests with only an income. Add them as people in the game for the full picture.</div>` : S.guess ? `<div class="tiny muted">Some of these numbers are still guesses, so the totals are too.</div>` : ""}
 <b class="small">Who brings what</b><div class="stack" style="gap:6px">${P.map(p => `<div><div class="row between small"><span>${esc(p.n)}</span><b>${money(p.inc)}${S.inc > 0 ? " · " + Math.round((p.inc / S.inc) * 100) + "%" : ""}</b></div><div class="kbar" style="margin:4px 0 2px"><i style="width:${Math.max(2, Math.round((p.inc / top) * 100))}%"></i></div></div>`).join("")}</div>
 <b class="small">If one person's income stopped</b><div class="stack" style="gap:6px">${P.map((p, i) => {
   const X = hsStop(P, i);
   return `<div class="tile small"><b>${esc(p.n)}:</b> ${X.left >= 0 ? "the household would still have " + money(Math.round(X.left)) + " left over each month." : "the household would run " + money(Math.round(-X.left)) + " short each month." + (X.months != null ? " Its cash could carry that for " + hsMo(X.months) + "." : "")}</div>`;
 }).join("")}</div>
 <div class="row" style="gap:8px"><button class="ghost slim" style="flex:1" data-a="fair">Split the costs</button>${H.sample ? "" : `<button class="ghost slim" style="flex:1" data-a="hssample" data-v="1">Try a made-up one</button>`}</div>
 ${mathBox(["Each person's own numbers, added up. Nothing is estimated for anyone.", "If each person entered only their own share of shared bills, the total going out is right. If two people both entered the whole rent, it is counted twice.", "The cash would last: all cash divided by everything going out in a month.", "If one income stopped: the household's left over, minus that person's income. Their spending is assumed to stay."])}`;
}
function hsPapers() {
  const H = hsGet(),
    done = HS_DOCS.filter(d => H.docs[d[0]] === "done").length,
    na = HS_DOCS.filter(d => H.docs[d[0]] === "na").length,
    open = HS_DOCS.length - done - na;
  return `<div class="small muted">Two married people get most of this automatically. Everyone else has to put it in writing. Tap where each one stands.</div>
 <div class="tile small" style="text-align:center"><b>${done}</b> done · <b>${open}</b> still open${na ? " · " + na + " not for us" : ""}</div>
 <div class="stack" style="gap:6px">${HS_DOCS.map(d => {
   const v = H.docs[d[0]] || "";
   return `<div class="tile stack" style="gap:6px"><b class="small">${v === "done" ? "✓ " : ""}${esc(d[1])}</b><div class="tiny muted">${esc(d[2])}</div><div class="seg">${[
     ["done", "We did this"],
     ["todo", "Not yet"],
     ["na", "Not for us"],
   ]
     .map(
       o =>
         `<button class="${v === o[0] ? "on" : ""}" data-a="hsdoc" data-k="${d[0]}" data-v="${o[0]}">${o[1]}</button>`
     )
     .join("")}</div></div>`;
 }).join("")}</div>
 <div class="banner small">This is a list of questions to bring to a lawyer, not legal advice. The rules are different in every state, and some of these need specific wording to count.</div>
 <button class="primary wide slim" data-a="hscopy" data-v="papers">${W.copied === "papers" ? "Copied ✓" : "Copy the open ones as questions"}</button>`;
}
function hsAgBody() {
  const H = hsGet(),
    a = H.ag || {},
    P = hsPeople(),
    names = P.map(p => p.n),
    safe = a.safe || {},
    nOn = HS_SAFE.filter(s => safe[s[0]]).length,
    ready = nOn === HS_SAFE.length && !!a.who,
    chips = (k, opts, cur, f) =>
      `<div class="chips">${opts.map(v => `<button class="chip sm ${cur === v ? "on" : ""}" data-a="hsag" data-k="${k}" data-v="${esc(String(v))}">${f(v)}</button>`).join("")}</div>`;
  const rv =
    a.d && a.review
      ? (() => {
          const dt = parseISO(a.d);
          dt.setMonth(dt.getMonth() + +a.review);
          return dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
        })()
      : null;
  return `<div class="small muted">Some households have one person lead on money. Some decide everything together. Either can work. What makes it an agreement, and not just a habit, is below.</div>
 ${q(
   "Who decides the day-to-day money?",
   chips("who", ["Together"].concat(names.map(n => n + " leads")).concat(["Each their own"]), a.who, v => esc(v))
 )}
 ${q(
   "Anyone can spend this much without asking",
   chips("limit", [50, 100, 250, 500, 1000], a.limit, v => money(v))
 )}
 ${q(
   "Look at it again every",
   chips("review", [1, 3, 6, 12], a.review, v => (v === 1 ? "Month" : v === 12 ? "Year" : v + " months")),
   rv ? "Next look: " + rv + "." : ""
 )}
 <b class="small">Five things that have to be true</b><div class="stack" style="gap:6px">${HS_SAFE.map(s => {
   const on = !!safe[s[0]];
   return `<button class="rowbtn" data-a="hssafe" data-v="${s[0]}" aria-pressed="${on}" style="gap:8px;align-items:flex-start"><span style="min-width:0"><b class="small">${on ? "✓ " : "○ "}${esc(s[1])}</b><div class="tiny muted">${esc(s[2])}</div></span><span class="pill ${on ? "okp" : ""}" style="flex:none">${on ? "True for us" : "Tap if true"}</span></button>`;
 }).join("")}</div>
 <div class="tile small" style="text-align:center">${ready ? "<b>Agreed.</b> All five are true" + (a.d ? ", as of " + nice(a.d) : "") + "." : "<b>Not an agreement yet.</b> " + (a.who ? "" : "Pick who decides. ") + (HS_SAFE.length - nOn) + " of the five " + (HS_SAFE.length - nOn === 1 ? "is" : "are") + " not marked true."}</div>
 <div class="tiny muted">The game only writes down what you agreed. It never limits what anyone can see or do here.</div>
 <div class="row" style="gap:8px"><button class="ghost slim" style="flex:1" data-a="hscopy" data-v="agree">${W.copied === "agree" ? "Copied ✓" : "Copy it"}</button>${H.ag ? `<button class="ghost slim" style="flex:1" data-a="hsend">End this agreement</button>` : ""}</div>
 ${H.ended.length ? `<div class="tiny muted">Ended before: ${H.ended.map(d => nice(d)).join(", ")}. Ending one is allowed, and so is starting again.</div>` : ""}`;
}
function hsText(kind) {
  const H = hsGet(),
    P = hsPeople();
  if (kind === "papers")
    return ["Questions for a lawyer (rules differ by state):"]
      .concat(HS_DOCS.filter(d => (H.docs[d[0]] || "todo") === "todo").map(d => "- " + d[1] + ". " + d[2]))
      .join("\n");
  const a = H.ag || {},
    safe = a.safe || {};
  return [
    "Our money agreement" + (a.d ? " (" + a.d + ")" : ""),
    "Who decides day to day: " + (a.who || "not picked yet"),
    a.limit ? "Anyone can spend " + money(a.limit) + " without asking." : "",
    a.review
      ? "We look at it again every " +
        (a.review === 1 ? "month" : a.review === 12 ? "year" : a.review + " months") +
        "."
      : "",
    "What has to be true:",
  ]
    .concat(HS_SAFE.map(s => (safe[s[0]] ? "[x] " : "[ ] ") + s[1]))
    .filter(Boolean)
    .join("\n");
}
function hsSheet() {
  const w = W,
    t = w.tab || "pic";
  return (
    head("People", "Our household") +
    `<div class="seg" style="align-self:flex-start">${[
      ["pic", "The picture"],
      ["docs", "The paperwork"],
      ["ag", "A money agreement"],
    ]
      .map(x => `<button class="${t === x[0] ? "on" : ""}" data-a="hstab" data-v="${x[0]}">${x[1]}</button>`)
      .join("")}</div>` +
    (t === "docs" ? hsPapers() : t === "ag" ? hsAgBody() : hsPicture())
  );
}
/* one page for a planner */
function onePage(c, d) {
  const L = [],
    K = typeof kwAll === "function" ? kwAll(c, d) : null,
    M = typeof knMetrics === "function" ? knMetrics(c, d).filter(m => m.num != null) : [],
    pick = KN_BASE.map(id => M.find(m => m.id === id)).filter(Boolean);
  L.push(
    String(c.name || "Client") +
      ", age " +
      c.age +
      ". " +
      chapterOf(c) +
      ". Era " +
      d.era +
      " of 9: " +
      eraName(d) +
      "."
  );
  L.push("");
  L.push(
    "MONTH: " +
      money(c.take || 0) +
      " in, " +
      money(c.spend || 0) +
      " out, " +
      money(Math.round((c.take || 0) - (c.spend || 0))) +
      " left."
  );
  L.push(
    "BALANCE: " + money(d.cash || 0) + " cash, " + money(c.inv || 0) + " invested, " + money(hsOwed(c)) + " owed."
  );
  L.push("");
  if (pick.length) {
    L.push("KEY NUMBERS");
    pick.forEach(m => L.push("- " + m.n + ": " + m.val + " (" + m.st + ")"));
    L.push("");
  }
  if (K) {
    L.push("HOW MUCH IS KNOWN: " + K.pct + "% (" + K.A.map(a => a.k + " " + a.pct + "%").join(", ") + ")");
    const open = [];
    K.A.forEach(a => a.facts.filter(f => f.v < 1).forEach(f => open.push(f.t + " (" + kwWord(f.v) + ")")));
    if (open.length) {
      L.push("STILL A GUESS OR CLOSE:");
      open.forEach(o => L.push("- " + o));
    }
    L.push("");
  }
  if (typeof gxOn === "function" && gxOn(c)) {
    const S = gxState(c);
    L.push(
      "SELF-EMPLOYED: " +
        money(S.mo) +
        " a month untaxed, setting aside " +
        S.pct +
        "%" +
        (S.known ? "" : " (guess)") +
        ". " +
        money(Math.round(S.T.set)) +
        " set aside, " +
        money(S.behind) +
        " to catch up."
    );
    L.push("");
  }
  if (typeof vlResult === "function") {
    const V = vlResult(c);
    if (V.complete) {
      L.push(
        "VALUES: " +
          V.V.top.join(", ") +
          ". " +
          V.pct +
          "% of spending lands on them." +
          (V.less[0] ? " Wants less of: " + V.less[0].k + "." : "")
      );
      L.push("");
    }
  }
  const P = hsPeople();
  if (P.length >= 2) {
    const S = hsSum(P),
      H = hsGet();
    L.push(
      "HOUSEHOLD OF " +
        P.length +
        (H.sample ? " (made-up sample)" : "") +
        ": " +
        money(S.inc) +
        " in, " +
        money(S.spend) +
        " out, " +
        money(S.cash) +
        " cash, " +
        money(S.debt) +
        " owed."
    );
    const open = HS_DOCS.filter(x => (H.docs[x[0]] || "todo") === "todo").length;
    L.push("Paperwork still open: " + open + " of " + HS_DOCS.length + ".");
    if (H.ag)
      L.push(
        "Money agreement: " +
          (H.ag.who || "who decides not picked") +
          ", " +
          HS_SAFE.filter(s => (H.ag.safe || {})[s[0]]).length +
          " of 5 safeguards marked true."
      );
    L.push("");
  }
  L.push("From SLAM the Game. Numbers are the person's own entries. Guess, Close and Exact say how sure each one is.");
  return L.join("\n");
}
function opSheet() {
  const c = C(),
    d = D || derive(c),
    tx = onePage(c, d);
  return (
    head("Menu", "One page for a planner") +
    `<div class="small muted">Everything a planner or coach asks for first, on one page. It says which numbers are solid and which are still guesses.</div><div class="tile"><pre class="oppre">${esc(tx)}</pre></div><button class="primary wide" data-a="opcopy">${W.copied ? "Copied ✓" : "Copy the page"}</button><div class="tiny muted">It has real numbers in it, so send it only to someone you chose.</div>`
  );
}
Object.assign(ACT, {
  house: t => {
    const v = t && t.dataset && t.dataset.v;
    if (typeof frState === "function" && !frState().ppl && !hsGet().sample) frPut({});
    W = { kind: "house", tab: ["docs", "ag"].includes(v) ? v : "pic" };
    sheet(hsSheet);
  },
  hstab: t => {
    W.tab = t.dataset.v;
    W.copied = null;
    drawSheet();
  },
  hssample: t => {
    hsPut({ sample: t.dataset.v === "1" });
    if (!W || W.kind !== "house") W = { kind: "house", tab: "pic" };
    sheet(hsSheet);
  },
  hsdoc: t => {
    const H = hsGet(),
      docs = Object.assign({}, H.docs),
      k = t.dataset.k,
      v = t.dataset.v;
    if (!HS_DOCS.some(d => d[0] === k) || !["done", "todo", "na"].includes(v)) return;
    docs[k] = v;
    hsPut({ docs });
    W.copied = null;
    drawSheet();
  },
  hsag: t => {
    const H = hsGet(),
      a = Object.assign({}, H.ag || {}),
      k = t.dataset.k;
    if (!["who", "limit", "review"].includes(k)) return;
    a[k] = k === "who" ? t.dataset.v : +t.dataset.v;
    a.d = todayISO();
    hsPut({ ag: a });
    W.copied = null;
    drawSheet();
  },
  hssafe: t => {
    const H = hsGet(),
      a = Object.assign({}, H.ag || {}),
      k = t.dataset.v;
    if (!HS_SAFE.some(s => s[0] === k)) return;
    a.safe = Object.assign({}, a.safe || {});
    a.safe[k] = !a.safe[k];
    a.d = todayISO();
    hsPut({ ag: a });
    W.copied = null;
    drawSheet();
  },
  hsend: () => {
    const H = hsGet();
    if (!H.ag) return;
    hsPut({ ag: null, ended: H.ended.concat([todayISO()]).slice(-6) });
    W.copied = null;
    drawSheet();
  },
  hscopy: t => {
    try {
      navigator.clipboard.writeText(hsText(t.dataset.v));
    } catch (e) {}
    W.copied = t.dataset.v;
    drawSheet();
  },
  onepage: () => {
    W = { kind: "onepage" };
    sheet(opSheet);
  },
  opcopy: () => {
    try {
      navigator.clipboard.writeText(onePage(C(), D || derive(C())));
    } catch (e) {}
    W.copied = true;
    drawSheet();
  },
});
(() => {
  const _p = profSheet;
  profSheet = function () {
    const h = _p(),
      a = '<button class="rowbtn" data-a="fair">';
    const row = `<button class="rowbtn" data-a="house"><span><b>Our household</b><div class="tiny muted">Everyone's money together, the paperwork, a money agreement</div></span><span class="caret">›</span></button>`;
    return h.indexOf(a) >= 0 ? h.replace(a, () => row + a) : h;
  };
})();
if (typeof MENU !== "undefined" && Array.isArray(MENU)) {
  if (!MENU.some(m => m[1] === "house")) {
    const i = MENU.findIndex(m => m[1] === "fair");
    MENU.splice(i >= 0 ? i + 1 : MENU.length, 0, [
      "Our household",
      "house",
      "act",
      "Two people or more: the picture, the paperwork, an agreement",
    ]);
  }
  if (!MENU.some(m => m[1] === "onepage")) {
    const i = MENU.findIndex(m => m[1] === "built");
    MENU.splice(i >= 0 ? i : MENU.length, 0, [
      "One page for a planner",
      "onepage",
      "act",
      "Your numbers on one page, with what is still a guess",
    ]);
  }
}
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
