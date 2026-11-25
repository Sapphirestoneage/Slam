/* ============================================================================
   SLAM the Game: features/book.js
   PURPOSE     The spreadsheet of the plan. Each number of the Plan batch, with its formula, in one table
               that the player can copy into Google Sheets or Excel, or save as a CSV file. A row from an
               input is a plain value that the player can change. A row from a formula is a live
               spreadsheet formula on the cells of its inputs, so a change of an input changes the result.
               A row that a spreadsheet cannot work out (a replay of market history, a month-by-month run)
               says so in its note.
   INPUT       The profile. The rows of each feature (taxvBook, oddsBook, coverBook, mixBook, sleptBook,
               pathsBook, simBook, frontBook, quotaBook, summaryBook). The open sheet (W.kind): book.
   OUTPUT      Functions: bookSections, bookTable, bookText, bookTabText, bookButtons, knSheetBook, bookSheet,
               bookFire, bookWorkbookData, bookModule, bookSave, bookFileIn. Actions (ACT): book, bookcopy,
               bookfile, bookxlsx, bookskip. Parts of functions in other files: knSheetBook (knSheet in
               metrics.js). Menu: "Export".
   XLSX        The button "Download for Excel or Google Sheets (.xlsx)" makes a workbook with live formulas.
               ONE EXPORT ENGINE: the game has no writer of its own. bookWorkbookData(c) gives plain data
               (the FIRE sheet input, the rows of the plan, the engine tables). bookModule() loads the
               module js/sheet/planbook.js of the web app with import(), and that module writes the file
               with js/sheet/excel.js. The same module reads an .xlsx back (bookFileIn), and the game
               shows each change before it uses it. The module and its spreadsheet tool come from the
               network, thus the .xlsx needs a connection. The CSV file and the copy need none.
   DEPENDS ON  screens/ui.js, core/metrics.js, the feature files above, features/kit.js, features/firelink.js,
               features/odds.js, features/retire.js (the list of the ways to take money out).
   TABS        The percentile table, the cash flow table and the withdrawal schedule of the retirement
               engine are three more tabs, each with its own copy and CSV file (oddsTabs in odds.js).
   RULES       Columns: A the section, B the name, C the value, D the formula in words, E a note. A formula
               uses only + - * / ^, MIN, MAX, ROUND and FV, so it works in Google Sheets, Excel and LibreOffice.
               The copy is text with tabs. The file is CSV. Nothing is sent anywhere.
   ========================================================================= */
const BOOK_PARTS = [
  taxvBook,
  oddsBook,
  coverBook,
  mixBook,
  sleptBook,
  rcBook,
  mauBook,
  cstBook,
  pathsBook,
  simBook,
  tkoBook,
  cmpBook,
  agesBook,
  stressBook,
  blocksBook,
  windBook,
  cdnBook,
  offerBook,
  nxaBook,
  frontBook,
  quotaBook,
  summaryBook,
  ledgBook,
  vaultBook,
  elBook,
  fieldsBook,
  stgBook,
  trBook,
  xrBook,
  cardsBook,
];
/* The sections of the spreadsheet: { title, rows: [{ id, label, v, f, note }] }. */
function bookSections(c) {
  const out = [];
  BOOK_PARTS.forEach(fn => {
    try {
      const s = fn(c);
      if (s && s.rows && s.rows.length) out.push(s);
    } catch (e) {
      report(e, "book.js: bookSections");
    }
  });
  return out;
}
/* THE TABLE: a list of rows of 5 cells. A formula points at the cells (column C) of the rows it uses. */
function bookTable(c) {
  const S = bookSections(c),
    T = [["Section", "Name", "Value", "How it is worked out", "Note"]],
    X = [],
    pos = {},
    label = {},
    val = {};
  let r = 1;
  S.forEach(s => {
    r++;
    s.rows.forEach(x => {
      r++;
      pos[x.id] = r;
      label[x.id] = x.label;
      val[x.id] = x.v;
    });
  });
  const cell = f =>
      f.replace(/\{(\w+)\}/g, (m, id) => (pos[id] ? "C" + pos[id] : String(val[id] != null ? val[id] : 0))),
    words = f => f.replace(/^=/, "").replace(/\{(\w+)\}/g, (m, id) => "[" + (label[id] || id) + "]");
  S.forEach(s => {
    T.push([s.title, "", "", "", ""]);
    X.push({ section: s.title });
    s.rows.forEach(x => {
      const v = typeof x.v === "number" ? Math.round(x.v * 10000) / 10000 : x.v == null ? "" : String(x.v),
        row = [
          "",
          x.label,
          x.f ? cell(x.f) : v,
          x.f ? words(x.f) : "",
          x.note || (x.f ? "" : "A value you can change"),
        ];
      T.push(row);
      /* the same row as data, for the workbook: the value stays a number, the formula stays a formula */
      X.push({
        label: x.label,
        v: typeof x.v === "number" ? (x.f ? x.v : v) : v,
        f: x.f ? row[2] : null,
        words: row[3],
        note: row[4],
        carried: !x.f && /cannot/i.test(x.note || ""),
      });
    });
  });
  return { T, pos, val, S, X };
}
/* The table as text: tabs for the copy, or CSV for the file. */
function bookText(c, csv) {
  const T = bookTable(c).T,
    clean = s => String(s).replace(/[\t\r\n]+/g, " "),
    q = s => {
      const t = clean(s);
      return /[",]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    };
  return T.map(row => row.map(csv ? q : clean).join(csv ? "," : "\t")).join("\n");
}
/* The two buttons, for any screen. here is true on the Export screen itself: it needs no button to itself. */
function bookButtons(here) {
  return `<button class="ghost slim" data-a="bookcopy">${W && W.bookCopied ? "Copied. Paste it into a sheet ✓" : "Copy as a spreadsheet"}</button>${here ? "" : `<button class="ghost slim" data-a="book">See the spreadsheet</button>`}`;
}
/* Part of knSheet() in metrics.js. The spreadsheet buttons next to "Copy all my numbers". */
function knSheetBook(h) {
  try {
    return h.replace(
      /(<button class="ghost wide slim" data-a="kncopy">[\s\S]*?<\/button>)/,
      m => m + `<div class="row wrap" style="gap:8px">${bookButtons()}</div>`
    );
  } catch (e) {
    report(e, "book.js: knSheetBook");
    return h;
  }
}
/* One tab of the engine tables (odds.js: oddsTabs) as text: tabs for the copy, or CSV for the file. */
function bookTabText(c, i, csv) {
  const T = (typeof oddsTabs === "function" ? oddsTabs(c) : null) || [],
    t = T[i];
  if (!t) return "";
  const q = v => {
    const x = String(v);
    return csv && /[",]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x;
  };
  return [t.cols]
    .concat(t.table)
    .map(r => r.map(q).join(csv ? "," : "\t"))
    .join("\n");
}
/* THE FIRE SHEET: the input of the first tab of the workbook (js/sheet/fire.js of the web app lays it out
   and writes its formulas). One row for each year from now to the last year of the plan. The numbers are
   the ones the retirement odds use (oddsInputs). The way to take money out is the one the plan has
   (RETIRE_METHODS): a new way in that list comes here with no change. The values that a spreadsheet
   cannot work out (random markets, the replay of history) go with a note that says so. */
function bookFire(c) {
  const P = oddsInputs(c),
    m = RETIRE_METHODS.find(x => x[0] === P.method) || RETIRE_METHODS[0],
    O = oddsCalc(c),
    Rr = oddsRandom(c),
    ready = !!Rr && !Rr.error,
    kinds = [
      ["traditional_401k", "a retirement plan at work"],
      ["roth_ira", "an IRA"],
      ["hsa", "an HSA"],
      ["taxable", "other investments"],
    ],
    by = {};
  let accts = [];
  try {
    accts = retireAccounts(c, P.ret, P.monthly);
  } catch (e) {
    report(e, "book.js: bookFire");
  }
  accts.forEach(a => (by[a.type] = (by[a.type] || 0) + a.annualContribution));
  const put = kinds.filter(k => by[k[0]] != null).map(k => ({ label: k[1], amount: Math.round(by[k[0]] * 100) / 100 })),
    flow = {},
    carried = [
      {
        label: "Real start years of history that work, out of 100",
        value: O.of100,
        note:
          "From the game: a replay of " +
          O.n +
          " stretches of market history. A spreadsheet cannot replay them, so this is a value.",
      },
    ];
  if (ready) {
    Rr.cashflow.forEach(r => (flow[r.age] = r.withdrawals));
    carried.push({
      label: "Random markets that work, out of 100",
      value: Rr.of100,
      note: "From the game: 1,000 random markets with your way to take money out. A spreadsheet cannot run them, so this is a value.",
    });
  }
  return {
    year: +todayISO().slice(0, 4),
    age: P.age,
    stopAge: P.ret,
    lastAge: P.death,
    income: (c.take || 0) * 12,
    incomeLabel: "Take-home pay a year",
    spending: (c.spend || 0) * 12,
    spendingAfter: P.spend,
    invested: P.inv,
    contributions: put.length ? put : [{ label: "your investments", amount: P.monthly * 12 }],
    realReturn: R,
    safeRate: SWR,
    other: P.ss,
    otherAge: 67,
    otherLabel: "Social Security a year, from 67",
    method: { id: m[0], name: m[1] },
    app: ready
      ? {
          from: "game",
          note:
            "The game's numbers are the middle of 1,000 random markets (the retirement engine), with taxes and your way to take money out (" +
            m[1] +
            ").",
          years: Rr.percentiles.map(r => ({
            age: r.age,
            balance: r.p50,
            withdrawal: r.age >= P.ret && flow[r.age] != null ? flow[r.age] : null,
          })),
        }
      : null,
    carried,
    back: 'This tab is for trying numbers. To bring a change back into the game, change it on the tab "My plan", in the section "Your numbers".',
  };
}
/* THE WORKBOOK AS DATA: the FIRE sheet input, each row of the plan, and the tables of the retirement engine.
   Plain data only, thus the module of the web app can lay it out and write it (the header says how). */
function bookWorkbookData(c) {
  const names = ["Percentiles", "Cash flow", "Withdrawals"],
    tabs = (typeof oddsTabs === "function" ? oddsTabs(c) : null) || [];
  return {
    at: todayISO(),
    fire: bookFire(c),
    rows: bookTable(c).X,
    tabs: tabs.map((t, i) => ({
      name: names[i] || "Table " + (i + 1),
      title: t.title,
      note: "Worked out by the game: the retirement engine, 1,000 random markets, in today's dollars. A spreadsheet cannot run them, so this tab holds values.",
      cols: t.cols,
      table: t.table,
    })),
  };
}
/* The module of the web app that writes and reads the .xlsx file. The path is from this script to the
   folder js/sheet/ of the site. The browser loads it the first time, then keeps it. */
function bookModule() {
  return import("../../js/sheet/planbook.js");
}
/* Give the player a file to save. */
function bookSave(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/* A file that the player chose in the part "Bring an edited sheet back": an .xlsx file goes through the
   module of the web app, a CSV file is text. Both end in lootTextBook, which shows each change. */
function bookFileIn(file) {
  const fr = new FileReader(),
    x = /\.xlsx$/i.test(file.name || ""),
    bad = e => {
      report(e, "book.js: bookFileIn");
      if (W && W.kind === "book") {
        W.inErr = true;
        drawSheet();
      }
    };
  fr.onload = () => {
    if (!x) return lootTextBook(String(fr.result || ""));
    bookModule()
      .then(M => M.planBookRead(fr.result))
      .then(text => lootTextBook(text), bad);
  };
  if (x) fr.readAsArrayBuffer(file);
  else fr.readAsText(file);
}
if (typeof document !== "undefined" && document.addEventListener)
  document.addEventListener("change", e => {
    const el = e.target;
    if (!el || !el.dataset || !el.dataset.bookx || !el.files || !el.files[0]) return;
    bookFileIn(el.files[0]);
  });
/* THE WAY BACK: an edited sheet comes back into the game.
   bookFields(c) is the one list of the numbers that the player can change in the sheet. The export
   (fieldsBook) and the import (bookRead, bookApply) both use this list, so a new field is in both. */
function bookFields(c) {
  const F = [],
    seen = {},
    add = (label, v, set) => {
      seen[label] = (seen[label] || 0) + 1;
      F.push({ label: seen[label] > 1 ? label + " (" + seen[label] + ")" : label, v: +v || 0, set });
    },
    num = (o, k) => v => {
      o[k] = v;
    },
    rows = (pre, list) =>
      (list || []).forEach(r =>
        add(pre + ": " + r.k, r.amt, v => {
          r.amt = v;
          r.s = true;
        })
      );
  add("Age", c.age, num(c, "age"));
  add("Age to stop work", c.ret, num(c, "ret"));
  if (c.led) {
    rows("Money in a month", c.incs);
    rows("Spending a month", c.spends);
    rows("Cash", c.cashes);
    rows("Invested", c.invs);
    (c.debts || []).forEach(r => {
      add("Owed: " + r.k, r.amt, v => {
        r.amt = v;
        r.s = true;
      });
      add("Owed: " + r.k + ", rate % a year", r.rate != null ? r.rate : debtRate(r).r, num(r, "rate"));
      add("Owed: " + r.k + ", payment a month", r.pay || 0, num(r, "pay"));
    });
  } else {
    add("Take-home pay a month", c.take, num(c, "take"));
    add("Spending a month", c.spend, num(c, "spend"));
    add("Invested", c.inv, num(c, "inv"));
    add("Owed", c.debt, num(c, "debt"));
  }
  return F;
}
const BOOK_IN_TITLE = "Your numbers";
function fieldsBook(c) {
  return {
    title: BOOK_IN_TITLE + " (change these, then bring the sheet back)",
    rows: bookFields(c).map((f, i) => ({
      id: "in_" + i,
      label: f.label,
      v: f.v,
      note: "The game reads this row when the sheet comes back",
    })),
  };
}
/* One line of CSV or of tab text, as cells. */
function bookCells(line) {
  if (line.indexOf("\t") >= 0) return line.split("\t");
  const out = [];
  let cur = "",
    q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}
/* Read an edited sheet. Returns { found, changes: [{ label, from, to, i }] }: the rows of "Your numbers"
   with a new value. A row with no number, or with a formula, is left out. */
function bookRead(c, text) {
  const F = bookFields(c),
    by = {},
    changes = [];
  let found = 0;
  F.forEach((f, i) => (by[f.label] = i));
  String(text || "")
    .split(/\r?\n/)
    .forEach(line => {
      const cells = bookCells(line),
        label = String(cells[1] || "").trim(),
        raw = String(cells[2] == null ? "" : cells[2]).trim();
      if (!(label in by) || raw === "" || raw[0] === "=") return;
      const v = Number(raw.replace(/[$,\s]/g, "").replace(/%$/, ""));
      if (!isFinite(v) || v < 0) return;
      found++;
      const f = F[by[label]];
      if (Math.abs(v - f.v) > 0.0049) changes.push({ label, from: f.v, to: v, i: by[label] });
      delete by[label];
    });
  return { found, changes };
}
/* Put the changes into the profile. Returns the number of changes. */
function bookApply(c, changes) {
  const F = bookFields(c);
  let n = 0;
  (changes || []).forEach(x => {
    if (!x.skip && F[x.i] && F[x.i].label === x.label) {
      F[x.i].set(x.to);
      n++;
    }
  });
  if (n) {
    if (typeof syncAll === "function") syncAll(c);
    save();
    render();
  }
  return n;
}
/* Part of lootText() in games2.js. In the spreadsheet sheet, the file is an edited copy of the plan. */
function lootTextBook(text) {
  if (!W || W.kind !== "book") return false;
  W.inn = bookRead(C(), text);
  W.inDone = null;
  W.inErr = null;
  drawSheet();
  return true;
}
/* The part of the sheet for the way back. */
function bookSheetIn() {
  const w = W || {},
    R = w.inn,
    num = v => (Math.abs(v) < 100 && v % 1 ? String(Math.round(v * 100) / 100) : Math.round(v).toLocaleString()),
    use = R ? R.changes.filter(x => !x.skip).length : 0;
  return (
    `<details class="math bookin"${R || w.inDone != null || w.inErr ? " open" : ""}><summary>Bring an edited sheet back</summary><div class="inner stack" style="gap:8px"><div class="small">Change values in the section "${BOOK_IN_TITLE}" of your sheet (in the .xlsx file it is on the tab "My plan"). Then choose the file here, or copy the rows and paste them. You see each change before the game uses it.</div><div class="tiny muted">From Google Sheets, download it first: File, Download, Microsoft Excel (.xlsx).</div>` +
    `<label class="filebtn">Choose the file (.xlsx or CSV)<input type="file" accept=".xlsx,.csv,text/csv,text/plain" data-bookx="1"></label>` +
    (w.inErr
      ? `<div class="tile small">That file did not open. Choose the .xlsx file that the game made, or save the sheet as a CSV file. An .xlsx file needs a connection to the internet.</div>`
      : "") +
    `<div class="field"><label class="small" for="bookpaste">Or paste the rows here</label><textarea id="bookpaste" rows="3" style="border:1px solid var(--line);border-radius:10px;width:100%"></textarea></div><button class="ghost slim" data-a="bookpaste">Read what I pasted</button>` +
    (w.inDone != null
      ? `<div class="tile small"><b>${w.inDone} ${w.inDone === 1 ? "number" : "numbers"} changed.</b> Each screen of the game now uses the new values. Undo is in the menu, under Save my game, when you made a backup first.</div>`
      : R
        ? R.found === 0
          ? `<div class="tile small">No row of "${BOOK_IN_TITLE}" was found in that text. Copy the rows with their names in the second column, the way the sheet came out.</div>`
          : R.changes.length === 0
            ? `<div class="tile small">${R.found} rows read. No value is different from the game.</div>`
            : `<div class="tile stack" style="gap:6px"><b class="small">${R.changes.length} ${R.changes.length === 1 ? "value is" : "values are"} different. Tap one to leave it out.</b>${R.changes.map((x, i) => `<button class="ghost slim row between bookchg" data-a="bookskip" data-v="${i}" aria-pressed="${x.skip ? "false" : "true"}" style="gap:8px;text-align:left"><span>${esc(x.label)}</span><span><span class="tiny muted">${num(x.from)} → </span><b>${num(x.to)}</b> <span class="tiny">${x.skip ? "Left out" : "Use ✓"}</span></span></button>`).join("")}</div><div class="row" style="gap:8px"><button class="ghost slim" data-a="backup">Make a backup first</button>${use ? `<button class="primary slim go" data-a="bookuse">Use ${use === 1 ? "this change" : "these " + use + " changes"}</button>` : `<span class="small muted">No change is picked.</span>`}</div>`
        : "") +
    `</div></details>`
  );
}
/* The part of the sheet for the .xlsx file: the one main button, what the file holds, and the steps for
   Google Sheets. */
function bookSheetXlsx() {
  const x = (W && W.xl) || {},
    words = typeof FIRE_EXPORT_WORDS !== "undefined" ? FIRE_EXPORT_WORDS : null;
  return (
    `<div class="stack bookxl" style="gap:6px"><button class="primary wide" data-a="bookxlsx"${x.busy ? " disabled" : ""}>${x.busy ? "Making the file…" : words ? words.xlsx : "Download the .xlsx file"}</button>` +
    (x.err
      ? `<div class="tile small">The file needs a connection to the internet to be made. Check the connection, then tap the button again. The CSV file below works with no connection.</div>`
      : x.done
        ? `<div class="tile small"><b>The file is saved ✓</b> Look in your downloads.</div>`
        : "") +
    `<div class="small">The first tab is the <b>FIRE sheet</b>: one row for each year, with your inputs in blue at the top. The tab "My plan" has every number with its formula.</div>` +
    (words ? `<div class="tiny muted">${words.sheetsHelp}</div>` : "") +
    `</div>`
  );
}
function bookSheet() {
  const c = C(),
    B = bookTable(c),
    n = B.T.length - 1 - B.S.length;
  return (
    head("Export", "My plan as a spreadsheet") +
    `<div class="small muted">Every number of your plan, with its formula. Change any value in the sheet, and the formulas follow. ${kitInfo("book")}</div>` +
    bookSheetXlsx() +
    `<div class="row wrap" style="gap:8px">${bookButtons(true)}<button class="ghost slim" data-a="bookfile">Save as a CSV file</button></div>` +
    `<div class="tiny muted">${n} rows in ${B.S.length} sections.</div>` +
    bookSheetIn() +
    (typeof fireBlankButton === "function"
      ? `<div class="stack bookblank" style="gap:4px">${fireBlankButton({ button: "linkbtn" })}</div>`
      : "") +
    (tabs =>
      tabs == null
        ? `<div class="tile small kitwait">The retirement engine is making its three tables…</div>`
        : tabs.length
          ? `<div class="stack booktabs" style="gap:6px"><div class="small"><b>Tables of the retirement engine</b>, each its own tab, in today's dollars:</div>${tabs.map((t, i) => `<div class="tile row wrap between" style="gap:6px"><span class="small">${esc(t.title)} (${t.table.length} rows)</span><span class="row" style="gap:6px"><button class="ghost slim" data-a="bookcopy" data-v="${i}">Copy</button><button class="ghost slim" data-a="bookfile" data-v="${i}">CSV file</button></span></div>`).join("")}</div>`
          : "")(typeof oddsTabs === "function" ? oddsTabs(c) : []) +
    B.S.map(
      s =>
        `<details><summary>${esc(s.title)} (${s.rows.length})</summary><div class="inner stack" style="gap:4px">${s.rows.map(x => `<div class="small bookrow"><div class="row between" style="gap:8px"><span>${esc(x.label)}</span><b>${esc(typeof x.v === "number" ? (Math.abs(x.v) < 1 && x.v !== 0 ? String(Math.round(x.v * 10000) / 10000) : money(x.v)) : String(x.v == null ? "" : x.v))}</b></div>${x.f ? `<div class="tiny muted">${esc(x.f.replace(/^=/, "= ").replace(/\{(\w+)\}/g, "$1"))}</div>` : ""}${x.note ? `<div class="tiny muted">${esc(x.note)}</div>` : ""}</div>`).join("")}</div></details>`
    ).join("")
  );
}
kitTerms({
  book: [
    "The spreadsheet of your plan",
    "Each number with the formula behind it. Inputs are plain values. Results are formulas on those values, so a change of an input changes the results.",
  ],
});
kitScreen(
  "book",
  "Export: my plan as a spreadsheet",
  "Every number of your plan, with the formula behind it, as a file for Excel or Google Sheets.",
  "Change any value in the sheet to see the math follow. Bring the sheet back to use your changes."
);
Object.assign(ACT, {
  book: () => {
    W = { kind: "book", o: {} };
    sheet(bookSheet);
  },
  bookpaste: () => {
    const el = typeof document !== "undefined" && document.getElementById ? document.getElementById("bookpaste") : null;
    if (!W) return;
    W.inn = bookRead(C(), (el && el.value) || W.pasted || "");
    W.inDone = null;
    drawSheet();
  },
  bookskip: t => {
    const x = W && W.inn && W.inn.changes[+(t && t.dataset && t.dataset.v)];
    if (!x) return;
    x.skip = !x.skip;
    drawSheet();
  },
  bookxlsx: () => {
    if (!W || W.kind !== "book" || (W.xl && W.xl.busy)) return;
    const set = v => {
      if (W && W.kind === "book") {
        W.xl = v;
        drawSheet();
      }
    };
    set({ busy: true });
    try {
      const data = bookWorkbookData(C());
      bookModule()
        .then(M => M.planBookFile(data))
        .then(blob => {
          bookSave(blob, "slam-plan-" + todayISO() + ".xlsx");
          set({ done: true });
        })
        .catch(e => {
          report(e, "book.js: bookxlsx");
          set({ err: true });
        });
    } catch (e) {
      report(e, "book.js: bookxlsx");
      set({ err: true });
    }
  },
  bookuse: () => {
    if (!W || !W.inn) return;
    W.inDone = bookApply(C(), W.inn.changes);
    W.inn = null;
    drawSheet();
  },
  bookcopy: t => {
    const v = t && t.dataset && t.dataset.v,
      txt = v != null && v !== "" ? bookTabText(C(), +v, false) : bookText(C(), false),
      done = () => {
        if (W) {
          W.bookCopied = true;
          drawSheet();
        }
      };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, done);
      else done();
    } catch (e) {
      report(e, "book.js: bookcopy");
      done();
    }
  },
  bookfile: t => {
    try {
      if (typeof Blob === "undefined" || typeof URL === "undefined" || typeof document.createElement !== "function")
        return;
      const v = t && t.dataset && t.dataset.v,
        tab = v != null && v !== "";
      bookSave(
        new Blob([tab ? bookTabText(C(), +v, true) : bookText(C(), true)], { type: "text/csv" }),
        "slam-plan-" + (tab ? "table" + (+v + 1) + "-" : "") + todayISO() + ".csv"
      );
    } catch (e) {
      report(e, "book.js: bookfile");
    }
  },
});
kitMenu(
  "Export",
  "book",
  "Your plan as a spreadsheet for Excel or Google Sheets, a CSV file, or a blank FIRE sheet",
  "summary"
);
