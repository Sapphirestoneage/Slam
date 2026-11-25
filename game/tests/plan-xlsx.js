/* ============================================================================
   SLAM the Game, test: tests/plan-xlsx.js
   PURPOSE     Examine the .xlsx export of the plan: the data that the game gives to the one export engine
               (js/sheet/planbook.js and js/sheet/excel.js of the web app), the FIRE sheet tab made from
               it, the functions that the formulas use, the way back through the same module, the Export
               row of the menu, and the button for a blank FIRE sheet.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/book.js, features/firelink.js. The module of the web
               app comes in with require() (Node.js 22.12 or later). ExcelJS comes from node_modules. When
               one of them is absent, the checks that need it print SKIP.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Xlsx",
      led: true,
      placed: true,
      age: 38,
      ret: 60,
      take: 6500,
      spend: 4500,
      inv: 120000,
      incs: [R0({ k: "A main job", amt: 6500 })],
      spends: [R0({ k: "Home", amt: 2500 }), R0({ k: "Food", amt: 2000 })],
      cashes: [R0({ k: "Checking", amt: 12000 })],
      invs: [R0({ k: "Retirement plan at work", amt: 80000 }), R0({ k: "Other investments", amt: 40000 })],
      debts: [R0({ k: "Credit card balance", amt: 3000, high: true, apr: "15% to 25%", rate: 20, pay: 150 })],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C(),
    D = bookWorkbookData(c),
    F = D.fire,
    P = oddsInputs(c);
  chk(
    "the FIRE sheet input has the numbers of the plan",
    F.age === 38 &&
      F.stopAge === P.ret &&
      F.lastAge === P.death &&
      F.income === 78000 &&
      F.spending === 54000 &&
      F.spendingAfter === P.spend &&
      F.invested === 120000 &&
      F.safeRate === SWR,
    JSON.stringify(F).slice(0, 300)
  );
  chk(
    "what goes in is by account type, and its sum is the money invested each year",
    F.contributions.length >= 2 &&
      Math.abs(F.contributions.reduce((s, x) => s + x.amount, 0) - P.monthly * 12) < 1 &&
      F.contributions.some(x => /plan at work/.test(x.label)),
    JSON.stringify(F.contributions)
  );
  chk(
    "the way to take money out is the one the plan has, from the list of the game",
    F.method.id === P.method && RETIRE_METHODS.some(m => m[0] === F.method.id && m[1] === F.method.name)
  );
  chk(
    "the replay of history goes with a note that a spreadsheet cannot replay it",
    F.carried.length >= 1 && F.carried[0].value === oddsCalc(c).of100 && /cannot/.test(F.carried[0].note)
  );
  const T = bookTable(c);
  chk(
    "each row of the plan is in the data, a formula as a formula and a number as a number",
    D.rows.length === T.T.length - 1 &&
      D.rows.some(r => r.f && /^=/.test(r.f) && typeof r.v === "number") &&
      D.rows.some(r => !r.f && typeof r.v === "number" && !r.carried) &&
      D.rows.some(r => r.carried)
  );
  /* the screen */
  X("book");
  chk(
    "the Export screen has the .xlsx button as its one main button, next to the CSV",
    ov().includes('data-a="bookxlsx"') &&
      ov().includes("Download for Excel or Google Sheets (.xlsx)") &&
      ov().includes('data-a="bookfile"') &&
      (ov().match(/class="primary/g) || []).length === 1 &&
      clean(ov()),
    junk(ov())
  );
  chk(
    "the help line gives the steps for Google Sheets",
    ov().includes("Open in Google Sheets") && ov().includes("File, Import")
  );
  chk(
    "the button for a blank FIRE sheet links to the copy link, and says what it is",
    ov().includes('href="https://docs.google.com/spreadsheets/d/1HZBHzEeDgQRmGcqwzaXW1jgd2N3SPSddZkhS7svZhHY/copy"') &&
      ov().includes("Start from a blank FIRE sheet") &&
      ov().includes("stands alone") &&
      ov().includes("full plan") &&
      ov().includes('target="_blank"')
  );
  chk(
    "the menu has one row Export, and it opens this screen",
    MENU.filter(m => m[0] === "Export").length === 1 && MENU.find(m => m[0] === "Export")[1] === "book"
  );
  /* with no network the import() fails: the screen says so, and the CSV stays */
  X("bookxlsx");
  const fs = require("fs"),
    path = require("path");
  let M = null,
    ExcelJS = null;
  try {
    M = require(path.join(GAME_DIR, "..", "js", "sheet", "planbook.js"));
  } catch (e) {
    skip("the module js/sheet/planbook.js did not load with require(): " + String(e.message).slice(0, 80));
  }
  try {
    ExcelJS = require(path.join(GAME_DIR, "..", "node_modules", "exceljs"));
  } catch (e) {
    skip("ExcelJS is not installed (npm install): the file is not written in this test");
  }
  if (M) {
    const plan = M.planBookPlan(D),
      formulas = [];
    plan.sheets.forEach(s => s.rows.forEach(r => (r || []).forEach(cell => cell && cell.f && formulas.push(cell.f))));
    const used = {};
    formulas.forEach(f =>
      (f.replace(/"[^"]*"/g, "").match(/[A-Z][A-Z0-9.]*(?=\()/g) || []).forEach(n => (used[n] = 1))
    );
    chk(
      "the workbook starts with the FIRE sheet, then the plan",
      plan.sheets[0].name === "FIRE sheet" && plan.sheets[1].name === "My plan",
      plan.sheets.map(s => s.name)
    );
    chk(
      "the formulas use only functions that Google Sheets, Excel and LibreOffice all have",
      formulas.length > 100 && Object.keys(used).every(n => /^(IF|AND|OR|MIN|MAX|SUM|ROUND|FV)$/.test(n)),
      Object.keys(used)
    );
    chk(
      "the FIRE sheet has one row for each year, and the default way (guardrails) is a live formula",
      plan.fire.rows.length === P.death - P.age + 1 &&
        plan.fire.model.known &&
        plan.fire.model.kind === "guardrails" &&
        plan.fire.rows.filter(r => r.stage === "Stop work").length === 1 &&
        plan.fire.rows.find(r => r.stage === "Stop work").age === P.ret
    );
    chk(
      "no cell of the workbook shows undefined or NaN",
      plan.sheets.every(s =>
        s.rows.every(r =>
          (r || []).every(
            cell =>
              !cell ||
              !/undefined|NaN/.test(String(cell.v) === "undefined" ? "" : String(cell.v) + String(cell.f || ""))
          )
        )
      )
    );
    /* a way that a formula cannot follow: the sheet says so and uses the same amount each year */
    kitStore(c, "odds").method = { v: "vpw", cf: 2 };
    const U = M.planBookPlan(bookWorkbookData(c)).fire;
    chk(
      "a way to take money out that a formula cannot follow says so on the sheet",
      !U.model.known &&
        U.model.kind === "steady" &&
        U.sheet.rows.some(r => r && r[0] && /cannot work out "A share of what is left"/.test(String(r[0].v)))
    );
    delete kitStore(c, "odds").method;
    if (ExcelJS) {
      const X2 = require(path.join(GAME_DIR, "..", "js", "sheet", "excel.js"));
      X2.workbookBuffer(ExcelJS, plan)
        .then(buf => X2.readWorkbook(ExcelJS, buf).then(grid => ({ buf, grid })))
        .then(({ buf, grid }) => {
          const back = bookRead(c, M.planBookText(grid));
          chk(
            "the file read back with no edit shows no change",
            back.found === bookFields(c).length && back.changes.length === 0,
            JSON.stringify(back)
          );
          /* edit one value in the file, the way a person does in a spreadsheet */
          const wb = new ExcelJS.Workbook();
          return wb.xlsx.load(buf).then(() => {
            const ws = wb.getWorksheet("My plan");
            let done = false;
            ws.eachRow(row => {
              if (!done && row.getCell(2).value === "Cash: Checking") {
                row.getCell(3).value = 9100;
                done = true;
              }
            });
            return wb.xlsx.writeBuffer().then(b2 => X2.readWorkbook(ExcelJS, b2));
          });
        })
        .then(grid => {
          lootTextBook(M.planBookText(grid));
          chk(
            "an edited .xlsx file shows the one change before the game uses it",
            W.inn.changes.length === 1 &&
              W.inn.changes[0].label === "Cash: Checking" &&
              W.inn.changes[0].to === 9100 &&
              ov().includes("1 value is different") &&
              c.cashes[0].amt === 12000,
            JSON.stringify(W.inn)
          );
          X("bookuse");
          chk("the change goes into the profile after the tap", c.cashes[0].amt === 9100);
        })
        .catch(e => chk("the .xlsx round trip runs", false, String(e && e.stack).slice(0, 300)))
        .then(tables);
    } else tables();
  } else tables();
  /* the tables of the retirement engine: when they are ready, the FIRE sheet gets the game's own values */
  function tables() {
    const wait = (n, done) => {
      const t = oddsTabs(c);
      if (t || n > 400) done(t);
      else setTimeout(() => wait(n + 1, done), 25);
    };
    wait(0, t => {
      const D2 = bookWorkbookData(c);
      chk(
        "with the engine ready, the data has its three tables and the game's values by year",
        t &&
          D2.tabs.length === 3 &&
          D2.tabs.every(x => /cannot/.test(x.note)) &&
          D2.fire.app &&
          D2.fire.app.years.length > 10 &&
          D2.fire.app.years.some(y => y.withdrawal > 0) &&
          D2.fire.carried.length === 2,
        JSON.stringify(D2.fire.app || {}).slice(0, 200)
      );
      if (M) {
        const p2 = M.planBookPlan(D2);
        chk(
          "the workbook then has the three engine tabs, and the FIRE sheet has the two columns from the game",
          p2.sheets.map(s => s.name).join("|") === "FIRE sheet|My plan|Percentiles|Cash flow|Withdrawals" &&
            p2.fire.cols.includes("appW") &&
            p2.fire.cols.includes("appB"),
          p2.sheets.map(s => s.name)
        );
      }
      const src =
        fs.readFileSync(GAME_DIR + "features/book.js", "utf8") +
        fs.readFileSync(GAME_DIR + "features/firelink.js", "utf8");
      chk("no em dash, no en dash and no red in the two files", !/[—–]|#ff4d6a|var\(--bad\)/.test(src));
      chk(
        "the game has no spreadsheet writer of its own: the file comes from the module of the web app",
        /import\("\.\.\/\.\.\/js\/sheet\/planbook\.js"\)/.test(src) && !/exceljs|xl\/worksheets|PK\\x03/i.test(src)
      );
      G.chars.length = n0;
      G.active = 0;
      save();
    });
  }
}
