/* ============================================================================
   SLAM the Game: features/import.js
   PURPOSE     Fill in the spending from a bank or card statement file. The browser reads the file. The
               file goes nowhere. The game keeps only the monthly totals that the player accepts.
   INPUT       The game: G.demo. The profile: c.x.imp. The open sheet (W.kind): import. The taps of the
               player (the actions in OUTPUT).
   OUTPUT      9 functions, with imAppCat and imAppCols (Rocket Money's own export: its columns and its
               categories, run Finish everything partly built, Part 18). Parts of functions in other files:
               lootTextImport, moneyTabImport, imAppCols (csvRows in games2.js). imPut: the one function
               that writes a total of a file to the profile. Actions (ACT): import2, imtog, imcat, imapply,
               imundo. features/cofill.js adds the way of a coach by three named parts: cfImportWords and
               cfSentView (imSheet), cfSend (ACT.imapply).
   DEPENDS ON  core/engine.js, screens/ui.js, features/games2.js.
   RULES       The game asks each time before it reads a file (a rule from the owner). The rows of the
               file are dropped when the sheet closes.
   ========================================================================= */
const IM_CATS = [
  ["Home", "Home"],
  ["Food", "Food"],
  ["Getting around", "Getting around"],
  ["Bills and subscriptions", "Bills"],
  ["Fun and everything else", "Fun"],
];
const IM_MOVE =
  /(credit ?card|card) ?(pay|pmt)|payment[ -]*thank you|online payment|autopay|auto pay|payment received|transfer (to|from)|\bxfer\b|\btfr\b|to savings|from savings|to checking|from checking|venmo cashout|brokerage|vanguard|fidelity|schwab|robinhood|acorns|betterment|wealthfront/i;
const IM_DEBT =
  /navient|nelnet|mohela|aidvantage|sallie mae|student loan|great lakes|auto loan|car loan|loan pmt|loan payment|affirm|klarna|afterpay|upstart|sofi loan|lendingclub/i;
const IM_RULES = [
  ["Food", /uber ?eats|doordash|grubhub|seamless|postmates|instacart/i],
  [
    "Home",
    /\brent\b|mortgage|landlord|property|\bhoa\b|apartment|leasing|realty|home depot|lowe'?s|ikea|furniture|con ?ed|pseg|national grid|orange ?(and|&)? ?rockland|electric|water (bill|dept|util)|sewer|utilit/i,
  ],
  [
    "Getting around",
    /\buber\b|lyft|\bshell\b|exxon|mobil|\bbp\b|sunoco|chevron|citgo|speedway|wawa|gulf oil|\bgas\b|fuel|parking|\btoll|e-?z ?pass|\bmta\b|transit|metrocard|omny|amtrak|geico|progressive|state farm|allstate|\bdmv\b|car wash|jiffy|tire|auto (parts|zone|service|repair)|autozone|valvoline/i,
  ],
  [
    "Bills and subscriptions",
    /netflix|spotify|hulu|disney|hbo|\bmax\b|peacock|paramount|apple\.com|apple com|itunes|icloud|google|youtube|prime video|amazon prime|audible|verizon|t-?mobile|at&t|\batt\b|sprint|mint mobile|comcast|xfinity|optimum|spectrum|internet|wireless|insurance|gym|planet fitness|equinox|membership|subscription|patreon|microsoft|adobe|openai|anthropic|dropbox|nytimes|new york times/i,
  ],
  [
    "Food",
    /grocer|supermarket|\bmarket\b|whole foods|trader joe|shoprite|stop ?(and|&)? ?shop|kroger|safeway|aldi|costco|wegmans|publix|walmart|\btarget\b|bj'?s|restaurant|cafe|coffee|starbucks|dunkin|mcdonald|chipotle|pizza|grill|kitchen|\bdeli\b|bagel|diner|sushi|burger|taco|bakery|\bbar\b|\bpub\b|wendy|chick-?fil|subway|panera|shake shack|falafel/i,
  ],
];
function imKey(n) {
  return String(n || "")
    .toUpperCase()
    .replace(/[^A-Z ]/g, " ")
    .replace(/\b(COM|WWW|INC|LLC|POS|DEBIT|PURCHASE|CARD|CHECKCARD|RECURRING|PAYPAL|SQ|TST)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 2)
    .join(" ");
}
/* Rocket Money's export (run Finish everything partly built, Part 18). The columns are the header row as Rocket
   Money writes it, from data/reference-2026.json (importFormats, "rocket"; sources: help.rocketmoney.com, article
   10296106 "Exporting transactions", and the converter linked there; checked 2026-11-06). Spending is a positive
   amount in this file. The categories are Rocket Money's own names (importCategories, "rocket", same date), each to a
   line of the game. A name with null goes to the word rules. test/rocket-game.test.js of the main app checks that
   these lists and the reference file agree. */
const IM_ROCKET_COLS = [
  "Date",
  "Original Date",
  "Account Type",
  "Account Name",
  "Account Number",
  "Institution Name",
  "Name",
  "Custom Name",
  "Amount",
  "Description",
  "Category",
  "Note",
  "Ignored From",
  "Tax Deductible",
  "Transaction Tags",
];
const IM_ROCKET_DETECT = ["Date", "Original Date", "Account Name", "Custom Name", "Amount", "Category"];
const IM_ROCKET_CATS = {
  "Auto & Transport": "Getting around",
  "Bills & Utilities": "Bills and subscriptions",
  "Software & Tech": "Bills and subscriptions",
  "Dining & Drinks": "Food",
  Groceries: "Food",
  "Home & Garden": "Home",
  "Credit Card Payment": "_move",
  "Internal Transfers": "_move",
  Investment: "_move",
  "Loan Payment": "_debt",
  "Charitable Donations": "Fun and everything else",
  Education: "Fun and everything else",
  "Entertainment & Rec.": "Fun and everything else",
  "Family Care": "Fun and everything else",
  Fees: "Fun and everything else",
  Gifts: "Fun and everything else",
  "Health & Wellness": "Fun and everything else",
  Legal: "Fun and everything else",
  Medical: "Fun and everything else",
  "Personal Care": "Fun and everything else",
  Pets: "Fun and everything else",
  Shopping: "Fun and everything else",
  "Travel & Vacation": "Fun and everything else",
  Income: null,
  Business: null,
  "Cash & Checks": null,
  Taxes: null,
  Uncategorized: null,
};
/* Part of csvRows() in games2.js. The header row (in lower case) to the columns of a known app export, or null for any
   other file (the generic reader of csvRows takes it). */
function imAppCols(H) {
  const at = n => H.indexOf(n.toLowerCase());
  if (!IM_ROCKET_DETECT.every(n => at(n) >= 0)) return null;
  return {
    app: "rocket",
    di: at("Date"),
    ni: [at("Custom Name"), at("Name")],
    ai: at("Amount"),
    ci: at("Category"),
    ig: at("Ignored From"),
    flip: true,
  };
}
/* The line of the game for an app's own category name, or null (the word rules decide). */
function imAppCat(app, cat) {
  if (app !== "rocket" || !cat) return null;
  const v = IM_ROCKET_CATS[String(cat).trim()];
  return v === undefined ? null : v;
}
function imCat(n, over, app, cat) {
  const k = imKey(n);
  if (over && over[k]) return over[k];
  const own = imAppCat(app, cat);
  if (own) return own;
  if (IM_MOVE.test(n)) return "_move";
  if (IM_DEBT.test(n)) return "_debt";
  for (const r of IM_RULES) if (r[1].test(n)) return r[0];
  return "Fun and everything else";
}
/* rows -> monthly averages per category, income, and the biggest things the game filed under Fun without being sure */
function imRead(rows, over) {
  if (!rows || !rows.length) return null;
  const neg = rows.filter(r => r.a < 0).length,
    sign = neg >= rows.length - neg ? -1 : 1,
    ms = [...new Set(rows.map(r => r.m))].sort((a, b) => a - b),
    months = Math.max(1, ms.length),
    tot = {},
    unsure = {};
  let move = 0,
    debt = 0,
    inc = 0,
    nOut = 0;
  IM_CATS.forEach(c => (tot[c[0]] = 0));
  rows.forEach(r => {
    const out = r.a * sign > 0,
      a = Math.abs(r.a),
      cat = imCat(r.n, over, r.app, r.cat);
    if (cat === "_move") {
      move += a;
      return;
    }
    if (!out) {
      inc += a;
      return;
    }
    nOut++;
    if (cat === "_debt") {
      debt += a;
      return;
    }
    tot[cat] += a;
    if (cat === "Fun and everything else" && !(over && over[imKey(r.n)]) && !imAppCat(r.app, r.cat)) {
      const k = imKey(r.n);
      if (k.length >= 3) {
        unsure[k] = unsure[k] || { k, n: k.charAt(0) + k.slice(1).toLowerCase(), a: 0, c: 0 };
        unsure[k].a += a;
        unsure[k].c++;
      }
    }
  });
  const spendTot = IM_CATS.reduce((t, c) => t + tot[c[0]], 0),
    avg = {};
  IM_CATS.forEach(c => (avg[c[0]] = Math.round(tot[c[0]] / months / 10) * 10));
  return {
    n: rows.length,
    app: rows.some(r => r.app === "rocket") ? "Rocket Money" : null,
    nOut,
    months,
    first: ms[0],
    last: ms[ms.length - 1],
    avg,
    spend: IM_CATS.reduce((t, c) => t + avg[c[0]], 0),
    move: Math.round(move / months),
    debt: Math.round(debt / months),
    income: Math.round(inc / months / 10) * 10,
    card: inc < spendTot * 0.2,
    unsure: Object.values(unsure)
      .sort((a, b) => b.a - a.a)
      .slice(0, 5)
      .map(u => Object.assign(u, { mo: Math.round(u.a / months) })),
  };
}
/* WRITE ONE TOTAL OF A FILE to the profile, at the level Close. k: a name of c.spends, or "_inc" for the one line
   of money coming in. The one place that does it: the player's own file (ACT.imapply) and a line of the coach
   that the player confirms (cofill.js). Returns true when a row was written. */
function imPut(c, k, amt) {
  const r = k === "_inc" ? ((c.incs || []).length === 1 ? c.incs[0] : null) : (c.spends || []).find(s => s.k === k);
  if (!r) return false;
  r.amt = amt;
  r.s = true;
  r.cf = 2;
  return true;
}
function imMonthName(m) {
  return (
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m % 12] +
    " " +
    Math.floor(m / 12)
  );
}
function imSheet() {
  const c = C(),
    w = W,
    CW = typeof cfImportWords === "function" ? cfImportWords(c) : null /* cofill.js: the words for a coach */,
    consent = CW
      ? CW.consent
      : `<div class="tiny muted">The file is read on this phone and never sent anywhere. Only the monthly totals you say yes to are kept.</div>`,
    pick = lab =>
      `<label class="filebtn">${lab}<input type="file" accept=".csv,text/csv,text/plain" data-loot="1"></label>`;
  if (w.sent) return cfSentView(w); /* cofill.js: a coach sent the totals to the client to confirm */
  if (w.done)
    return (
      head("My Money", "Filled in") +
      `<div class="tile stack" style="gap:4px">${w.done.map(x => `<div class="row between small"><span>${esc(x[0])}</span><span><span class="tiny muted">${money(x[1])} → </span><b>${money(x[2])}</b></span></div>`).join("")}</div><div class="small muted">These now read Close everywhere in the game. Cash spending isn't in a statement, so add to any line that runs on cash.</div>${typeof rcpInline === "function" ? rcpInline() : ""}<button class="ghost wide" data-a="close">Done</button><button class="ghost wide slim" data-a="imundo">Undo, put my old numbers back</button>`
    );
  if (!w.rows || !w.rows.length)
    return (
      head("My Money", "Fill it in from a statement") +
      `<div class="small muted">Download a file from your bank or card and the game adds up your spending for you.</div><div class="tile stack" style="gap:6px"><b class="small">How to get the file</b><div class="small mrow k-note">Open your bank or card's website or app.</div><div class="small mrow k-note">Find Download or Export on your list of transactions.</div><div class="small mrow k-note">Pick CSV and the last 3 months.</div><div class="small mrow k-note">Rocket Money: on the web, Transactions, then Export. The file comes by email.</div></div>${pick("Choose a statement file")}${consent}${w.err ? `<div class="banner small">${esc(w.err)}</div>` : ""}`
    );
  const R = imRead(w.rows, w.over),
    use = w.use,
    cur = k => {
      const r = (c.spends || []).find(x => x.k === k);
      return r ? r.amt : null;
    },
    rows = IM_CATS.filter(x => cur(x[0]) != null),
    oneInc = (c.incs || []).length === 1;
  return (
    head("My Money", "What the file showed") +
    (R.app
      ? `<div class="small">Read as a ${R.app} export: its own categories sort the lines, and card payments and moves between accounts stay out.</div>`
      : "") +
    `<div class="small muted">${R.n} lines over ${R.months} month${R.months === 1 ? "" : "s"} (${imMonthName(R.first)}${R.last !== R.first ? " to " + imMonthName(R.last) : ""})${w.files > 1 ? ", from " + w.files + " files" : ""}. Tap a line to switch it.</div><div class="tiny muted">One card or account rarely shows everything, so lines you already made real stay as they are unless you switch them.</div>` +
    `<div class="stack" style="gap:6px">${rows
      .map(x => {
        const on = use[x[0]] !== false,
          a = R.avg[x[0]],
          v = cur(x[0]);
        return `<button class="rowbtn imrow ${on ? "on" : ""}" data-a="imtog" data-v="${esc(x[0])}"><span class="pn"><b>${x[0]}</b><div class="tiny muted">You had ${money(v)} · the file says ${money(a)} a month</div></span><span class="pill ${on ? "okp" : ""}">${on ? "Use " + money(a) : "Keep " + money(v)}</span></button>`;
      })
      .join("")}</div>` +
    (R.unsure.length
      ? `<div class="tile stack" style="gap:8px"><b class="small">Help the game sort these</b><div class="tiny muted">The biggest ones it filed under Fun without being sure. Tap where each belongs.</div>${R.unsure.map(u => `<div class="stack" style="gap:4px"><div class="small"><b>${esc(u.n)}</b> <span class="tiny muted">${money(u.mo)} a month</span></div><div class="chips imch">${IM_CATS.map(x => `<button class="chip ${x[0] === "Fun and everything else" ? "" : ""}" data-a="imcat" data-k="${esc(u.k)}" data-v="${esc(x[0])}">${x[1]}</button>`).join("")}</div></div>`).join("")}</div>`
      : "") +
    `<div class="tile stack" style="gap:4px">${R.card ? `<div class="small">This looks like a card statement, so it has no pay in it.</div>` : `<div class="row between small"><span>Coming in, on average</span><b>${money(R.income)}</b></div><div class="tiny muted">${oneInc ? "You had " + money(c.incs[0].amt) + "." : "You have " + (c.incs || []).length + " sources, so update each one in My Money."}</div>`}${R.debt ? `<div class="row between small"><span>Loan payments it saw</span><b>${money(R.debt)} a month</b></div>` : ""}${R.move ? `<div class="row between small"><span>Left out: card payments and moves between accounts</span><b>${money(R.move)} a month</b></div>` : ""}</div>` +
    (!R.card && oneInc
      ? `<button class="rowbtn imrow ${use._inc ? "on" : ""}" data-a="imtog" data-v="_inc"><span class="pn"><b>Also update what comes in</b><div class="tiny muted">${esc(c.incs[0].k)}: ${money(c.incs[0].amt)} → ${money(R.income)}</div></span><span class="pill ${use._inc ? "okp" : ""}">${use._inc ? "Yes" : "No"}</span></button>`
      : "") +
    `<button class="primary wide" data-a="imapply">${CW ? esc(CW.go) : "Use these numbers"}</button>${pick("Add another file (a second card or account)")}${consent}${w.err ? `<div class="banner small">${esc(w.err)}</div>` : ""}`
  );
}
Object.assign(ACT, {
  import2: () => {
    W = { kind: "import", rows: [], files: 0, over: {}, use: {} };
    sheet(imSheet);
  },
  imtog: t => {
    if (!W || W.kind !== "import") return;
    const k = t.dataset.v;
    if (k === "_inc") W.use._inc = !W.use._inc;
    else W.use[k] = W.use[k] === false;
    drawSheet();
  },
  imcat: t => {
    if (!W || W.kind !== "import") return;
    W.over[t.dataset.k] = t.dataset.v;
    drawSheet();
  },
  imapply: () => {
    const c = C(),
      w = W;
    if (!w || w.kind !== "import" || !w.rows.length) return;
    const R = imRead(w.rows, w.over);
    /* cofill.js: a coach in the game of a client changes no number. The totals go to the client as a list. */
    if (typeof cfCoach === "function" && cfCoach()) {
      const sent = cfSend(c, R, w.use);
      if (!sent.length) return closeSheet();
      W = { kind: "import", rows: [], files: 0, over: {}, use: {}, sent };
      return drawSheet();
    }
    const pr = D.realm,
      prev = { spends: JSON.parse(JSON.stringify(c.spends)), incs: JSON.parse(JSON.stringify(c.incs)) },
      done = [];
    IM_CATS.forEach(x => {
      if (w.use[x[0]] === false) return;
      const r = (c.spends || []).find(s => s.k === x[0]);
      if (!r) return;
      done.push([x[0], r.amt, R.avg[x[0]]]);
      imPut(c, x[0], R.avg[x[0]]);
    });
    if (w.use._inc && !R.card && c.incs.length === 1) {
      done.push([c.incs[0].k, c.incs[0].amt, R.income]);
      imPut(c, "_inc", R.income);
    }
    if (!done.length) {
      closeSheet();
      return;
    }
    c.x.imp = { d: todayISO(), months: R.months, n: R.n };
    afterMoney(c, pr, false);
    save();
    render();
    W = { kind: "import", rows: [], files: 0, over: {}, use: {}, done, prev };
    drawSheet();
  },
  imundo: () => {
    const c = C(),
      w = W;
    if (!w || !w.prev) return;
    const pr = D.realm;
    c.spends = w.prev.spends;
    c.incs = w.prev.incs;
    delete c.x.imp;
    afterMoney(c, pr, false);
    save();
    render();
    closeSheet();
  },
});
/* Part of lootText() in games2.js. In the import sheet, reads the file as a bank or card statement. Returns true when it used the file. Returns false in all other sheets. */
function lootTextImport(text) {
  if (!W || W.kind !== "import") return false;
  const rows = csvRows(text);
  if (!rows.length) {
    W.err = "That file didn't look like a statement. It needs columns for date, description and amount.";
    drawSheet();
    return true;
  }
  W.err = null;
  W.rows = (W.rows || []).concat(rows);
  W.files = (W.files || 0) + 1;
  if (W.files === 1) {
    const c = C();
    IM_CATS.forEach(x => {
      const r = (c.spends || []).find(s => s.k === x[0]);
      if (r && r.s) W.use[x[0]] = false;
    });
  }
  drawSheet();
  return true;
}
/* Part of moneyTab() in ui.js. Adds the button that fills in the spending from a statement file. */
function moneyTabImport(h) {
  const a = '<div class="card"><div class="row between"><h3>Money going out each month</h3>';
  if (G.demo || h.indexOf(a) < 0) return h;
  return h.replace(
    a,
    () => `<button class="ghost wide slim" data-a="import2">Fill in your spending from a statement</button>` + a
  );
}

if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
