/* ============================================================================
   SLAM the Game, test: tests/spreadsheet-round-trip.js
   PURPOSE     Examine the way back of the spreadsheet: the plan goes out as CSV or tab text, the player
               changes values in "Your numbers", and the game reads the changes and applies them.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/book.js (bookFields, fieldsBook, bookRead,
               bookApply).
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Sheet",
      led: true,
      placed: true,
      age: 30,
      ret: 60,
      take: 4000,
      spend: 3000,
      incs: [R0({ k: "A main job", amt: 4000 })],
      spends: [R0({ k: "Home", amt: 1500 }), R0({ k: "Food", amt: 1500 })],
      cashes: [R0({ k: "Checking", amt: 5000 }), R0({ k: "Checking", amt: 700 })],
      invs: [R0({ k: "IRA or Roth IRA", amt: 800 })],
      debts: [R0({ k: "Credit card balance", amt: 5000, high: true, apr: "15% to 25%", rate: 20, pay: 150 })],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  const c = C(),
    F = bookFields(c),
    labels = F.map(f => f.label);
  chk(
    "one list of fields: each row of the profile, and two rows with the same name get a number",
    labels.includes("Cash: Checking") &&
      labels.includes("Cash: Checking (2)") &&
      labels.includes("Owed: Credit card balance, rate % a year"),
    labels.join("; ")
  );
  const csv = bookText(c, true),
    tsv = bookText(c, false);
  chk("the export has the section and each field", csv.includes("Your numbers") && labels.every(l => csv.includes(l)));
  chk(
    "a sheet that comes back with no change gives no changes",
    bookRead(c, csv).found === F.length && bookRead(c, csv).changes.length === 0,
    JSON.stringify(bookRead(c, csv))
  );
  const edit = t =>
      t
        .split("\n")
        .map(line => {
          const cells = bookCells(line);
          if (cells[1] === "Cash: Checking") cells[2] = "$6,250.50";
          if (cells[1] === "Owed: Credit card balance, rate % a year") cells[2] = "6.66%";
          if (cells[1] === "Age to stop work") cells[2] = "=1+1";
          return cells.join("\t");
        })
        .join("\n"),
    Rr = bookRead(c, edit(csv));
  chk(
    "two changed values are found, with money signs and a percent sign read, and a formula is left out",
    Rr.changes.length === 2 &&
      Rr.changes.some(x => x.label === "Cash: Checking" && x.to === 6250.5) &&
      Rr.changes.some(x => x.to === 6.66),
    JSON.stringify(Rr.changes)
  );
  chk("tab text from a sheet reads the same way", bookRead(c, edit(tsv)).changes.length === 2);
  chk(
    "a quoted CSV cell with a comma is one cell",
    bookCells('a,"b, c",3').length === 3 && bookCells('a,"b, c",3')[1] === "b, c"
  );
  X("book");
  chk(
    "the sheet offers the way back",
    ov().includes("Bring an edited sheet back") && ov().includes("Choose the CSV file")
  );
  lootText(edit(csv));
  chk(
    "a chosen file shows each change before it is used",
    ov().includes("2 values are different") &&
      ov().includes("6.66") &&
      ov().includes("Make a backup first") &&
      clean(ov()),
    junk(ov())
  );
  X("bookuse");
  chk(
    "the changes go into the profile",
    c.cashes[0].amt === 6250.5 && c.debts[0].rate === 6.66 && c.ret === 60,
    JSON.stringify([c.cashes[0].amt, c.debts[0].rate])
  );
  chk("the totals of the game follow", Math.abs(derive(c).cash - 6950.5) < 1e-6, derive(c).cash);
  chk("the sheet says what changed", ov().includes("2 numbers changed"));
  lootText("nothing,here\n1,2");
  chk("text with no known row says so", ov().includes("No row of"));
  G.chars.length = n0;
  G.active = 0;
  save();
}
