// ---------- Rocket Money's export in the statement import (run Finish everything partly built, Part 18) ----------
// Made-up rows only. The header is the one Rocket Money writes (IM_ROCKET_COLS, from data/reference-2026.json).
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo;
  const c = Object.assign(newChar(), { name: "Rm", placed: true, work: "Working", home: "Renting" });
  applyTypical(c);
  c.led = true;
  syncAll(c);
  G.demo = false;
  G.chars.push(c);
  G.active = n0;
  save();
  const head = IM_ROCKET_COLS.map(x => (x.includes(",") ? '"' + x + '"' : x)).join(",");
  const row = (d, name, custom, amt, cat, ign) =>
    [
      d,
      d,
      "Credit Card",
      "Sample Card",
      "1234",
      "Sample Bank",
      name,
      custom,
      amt,
      name,
      cat,
      "",
      ign || "",
      "",
      "",
    ].join(",");
  const text = [
    head,
    row("2026-10-03", "QQ MARKET 44", "", "120.00", "Groceries"),
    row("2026-10-05", "Sample Diner", "", "40.00", "Dining & Drinks"),
    row("2026-10-07", "ZZ TRANSIT", "", "60.00", "Auto & Transport"),
    row("2026-10-09", "Card payment", "", "500.00", "Credit Card Payment"),
    row("2026-10-11", "Sample Streaming", "My TV", "15.00", "Software & Tech"),
    row("2026-10-12", "Old thing", "", "999.00", "Shopping", "Everything"),
    row("2026-10-15", "Payroll Sample Co", "", "-2000.00", "Income"),
  ].join("\n");
  const rows = csvRows(text);
  chk(
    "the Rocket Money header is known: 6 rows (the ignored one is out), money out turned negative, the app kept",
    rows.length === 6 && rows.every(r => r.app === "rocket") && rows[0].a === -120 && rows[5].a === 2000,
    JSON.stringify(rows)
  );
  chk("a Custom Name wins over the Name", rows.find(r => r.a === -15).n === "My TV");
  const R = imRead(rows, {});
  chk(
    "Rocket Money's own categories sort the lines, a card payment stays out, and the pay is money in",
    R.app === "Rocket Money" &&
      R.avg.Food === 160 &&
      R.avg["Getting around"] === 60 &&
      R.avg["Bills and subscriptions"] === 20 &&
      R.move === 500 &&
      R.income === 2000 &&
      R.unsure.length === 0,
    JSON.stringify(R)
  );
  chk(
    "a plain bank file still reads the generic way",
    csvRows("Date,Description,Amount\n2026-10-01,Shop,-12.50").length === 1
  );
  X("import2");
  lootTextImport(text);
  const o = ov();
  chk("the sheet says it read a Rocket Money export", o.includes("Read as a Rocket Money export") && clean(o), junk(o));
  closeSheet();
  G.chars.splice(n0, 1);
  G.active = act0;
  G.demo = demo0;
  save();
}
