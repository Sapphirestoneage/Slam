/* ============================================================================
   SLAM the Game, test: tests/product-xray.js
   PURPOSE     Examine the product X-ray: the two paths side by side, worked out by hand.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/xray.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    a = Object.assign(newChar(), { name: "Vic", led: true, placed: true, spend: 3044 });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  save();
  const c = C(),
    near = (x, y, t) => Math.abs(x - y) < (t || 0.01);
  /* by hand: $100 a month at 0% for 10 years is 100 x 120 = 12,000. */
  chk("a monthly amount at 0% is the sum of the payments", near(xrFv(100, 0, 10), 12000));
  /* by hand: $100 a month at 12% a year (1% a month) for 1 year: 100 x (1.01^12 - 1) / 0.01 = 1,268.25 */
  chk("a monthly amount at 1% a month for 12 months", near(xrFv(100, 0.12, 1), 1268.25, 0.01), xrFv(100, 0.12, 1));
  let R = xrCalc(c);
  chk("with no answers, the result is a Guess", R.st === "Guess" && R.kind === "life");
  /* insurance: $250 a month, 20 years, cash value at 3%, year 1 builds none, term $35, alternative 7% less 0.05%. */
  const cash = xrFv(250, 0.03, 20) - xrFv(250, 0.03, 1) * Math.pow(1 + 0.03 / 12, 19 * 12),
    alt = xrFv(215, 0.07 - 0.0005, 20);
  chk("insurance: the cash value leaves out the first year", near(R.A.v, cash), R.A.v);
  chk("insurance: the alternative invests the payment less term cover", near(R.B.v, alt) && R.B.side === 215, R.B.v);
  chk(
    "insurance: both paths pay the cover, and the alternative adds its balance",
    R.A.die === 500000 && near(R.B.die, 500000 + alt)
  );
  chk(
    "the difference in days of spending: difference / (spending / 30.44)",
    near(R.days, (alt - cash) / 100, 0.01),
    R.days
  );
  X("xray");
  chk(
    "the sheet: two columns, the difference, the cautions, the math",
    ov().includes("The path you are on") &&
      ov().includes("Term cover, and invest the rest") &&
      ov().includes("Before you change anything") &&
      ov().includes("not advice to cancel") &&
      ov().includes("Show the math") &&
      ov().includes("Guess") &&
      clean(ov()),
    junk(ov())
  );
  X("kitset", "fund", "xray|kind", { t: "s" });
  R = xrCalc(c);
  /* fees: $250 a month, 20 years, 7% less 1.5% with no sales charge, next to 7% less 0.05%. */
  chk(
    "an investment with fees: return less the fee",
    R.kind === "fund" && near(R.A.v, xrFv(250, 0.055, 20)) && near(R.B.v, xrFv(250, 0.0695, 20))
  );
  X("kitset", "0.0575", "xray|load", { t: "n" });
  chk("a sales charge comes off each payment", near(xrCalc(c).A.v, xrFv(250 * (1 - 0.0575), 0.055, 20)));
  ["kind", "pay", "years", "fee", "load", "ret"].forEach(k => {
    const s = kitStore(c, "xray");
    s[k] = {
      v: kitValue(c, "xray", k, { kind: "fund", pay: 250, years: 20, fee: 0.015, load: 0, ret: 0.07 }[k]).v,
      cf: 3,
    };
  });
  chk("with each answer Exact, the result is Exact", xrCalc(c).st === "Exact");
  const B = xrBook(c);
  chk(
    "the spreadsheet section has the formulas",
    B.rows.some(r => r.id === "xr_diff" && r.f === "={xr_alt}-{xr_prod}")
  );
  chk("built list", btRows().some(r => r.n.startsWith("Product X-ray") && r.st === "b") && btCount(btRows()).x === 0);
  G.chars.length = n0;
  G.active = 0;
  save();
}
