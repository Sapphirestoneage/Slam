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
   OUTPUT      Functions: bookSections, bookTable, bookText, bookTabText, bookButtons, knSheetBook, bookSheet. Actions
               (ACT): book, bookcopy, bookfile. Parts of functions in other files: knSheetBook (knSheet in
               metrics.js). Menu: "My plan as a spreadsheet".
   DEPENDS ON  screens/ui.js, core/metrics.js, the feature files above, features/kit.js.
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
  pathsBook,
  simBook,
  tkoBook,
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
    s.rows.forEach(x => {
      const v = typeof x.v === "number" ? Math.round(x.v * 10000) / 10000 : x.v == null ? "" : String(x.v);
      T.push([
        "",
        x.label,
        x.f ? cell(x.f) : v,
        x.f ? words(x.f) : "",
        x.note || (x.f ? "" : "A value you can change"),
      ]);
    });
  });
  return { T, pos, val, S };
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
/* The two buttons, for any screen. */
function bookButtons() {
  return `<button class="ghost slim" data-a="bookcopy">${W && W.bookCopied ? "Copied. Paste it into a sheet ✓" : "Copy as a spreadsheet"}</button><button class="ghost slim" data-a="book">See the spreadsheet</button>`;
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
function bookSheet() {
  const c = C(),
    B = bookTable(c),
    n = B.T.length - 1 - B.S.length;
  return (
    head("Plan", "My plan as a spreadsheet") +
    `<div class="small muted">Every number of your plan, with its formula. Paste it into Google Sheets or Excel, change any value, and the formulas follow. ${kitInfo("book")}</div>` +
    `<div class="row wrap" style="gap:8px">${bookButtons()}<button class="ghost slim" data-a="bookfile">Save as a CSV file</button></div>` +
    `<div class="tiny muted">${n} rows in ${B.S.length} sections.</div>` +
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
  "My plan as a spreadsheet",
  "Every number of your plan, with the formula behind it.",
  "Copy it into a sheet and change any value to see the math follow."
);
Object.assign(ACT, {
  book: () => {
    W = { kind: "book", o: {} };
    sheet(bookSheet);
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
        tab = v != null && v !== "",
        url = URL.createObjectURL(
          new Blob([tab ? bookTabText(C(), +v, true) : bookText(C(), true)], { type: "text/csv" })
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = "slam-plan-" + (tab ? "table" + (+v + 1) + "-" : "") + todayISO() + ".csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      report(e, "book.js: bookfile");
    }
  },
});
kitMenu(
  "My plan as a spreadsheet",
  "book",
  "Every number of your plan with its formula, for Google Sheets or Excel",
  "summary"
);
