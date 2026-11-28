/* ============================================================================
   SLAM the Game, test: tests/whats-built.js
   PURPOSE     Examine the list "What's built": each built row passes its probe, the counts agree, and
               the sheet opens.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/built.js.
   ========================================================================= */
{
  const R = btRows(),
    c = btCount(R);
  chk(
    "every built or partly row passes its probe against the loaded game",
    c.x === 0,
    R.filter(r => r.st === "x")
      .map(r => r.n)
      .join(" | ")
  );
  // btRows() gives the rows that this player can see. A row for the owner only is not in it for other players.
  // Thus the counts add up to R.length. They add up to WB.length (the full list) only for the owner.
  chk(
    "the three counts add up and none is empty",
    c.b + c.p + c.n === R.length && R.length <= WB.length && c.b > 20 && c.p > 3 && c.n > 10,
    JSON.stringify(c) + " rows " + R.length + " of " + WB.length
  );
  chk(
    "every built row that opens a screen names a real action",
    R.filter(r => r.a).every(r => typeof ACT[r.a] === "function"),
    R.filter(r => r.a && typeof ACT[r.a] !== "function")
      .map(r => r.a)
      .join()
  );
  chk(
    "every not-yet and partly row says what is missing",
    R.filter(r => r.st !== "b").every(r => r.note && r.note.length > 8),
    R.filter(r => r.st !== "b" && !(r.note && r.note.length > 8))
      .map(r => r.n)
      .join()
  );
  chk(
    "a probe that fails shows as missing, not built",
    (() => {
      const keep = ACT.quick;
      delete ACT.quick;
      const x = btRows().find(r => r.n.startsWith("Quick math"));
      ACT.quick = keep;
      return x.st === "x" && x.a === null && x.note.includes("Missing");
    })()
  );
  chk(
    "the menu has it",
    MENU.some(m => m[1] === "built")
  );
  X("built");
  chk(
    "the sheet: counts, groups, pills",
    W.kind === "built" &&
      ov().includes("Getting your numbers in") &&
      ov().includes("Built ✓") &&
      ov().includes("Not yet") &&
      ov().includes("Partly") &&
      ov().includes("Copy this list") &&
      clean(ov()),
    junk(ov())
  );
  X("btf", "n");
  chk(
    "filter to not yet",
    W.f === "n" && !ov().includes("Built ✓") && ov().includes("Show everything") && ov().includes("LGBTQ+ money tools")
  );
  X("btf", "all");
  const tx = btText();
  chk(
    "copies as plain text with the counts",
    tx.includes("Built " + c.b + ", partly " + c.p + ", not yet " + c.n) &&
      tx.includes("[Not yet] LGBTQ+ money tools") &&
      tx.includes("[Built] Two moves side by side"),
    tx.slice(0, 200)
  );
  X("btcopy");
  chk("copy confirms", W.copied);
  X("close");
  // These checks came from the older files for a group of features. They examine rows of the list "What's built".
  chk(
    "built list: the new screens pass their probes",
    [
      "Before you sign",
      "What each debt costs",
      "Student loan plans",
      "The Money Chart for more than two",
      "Your people, one layer at a time",
    ].every(n => btRows().some(r => r.n.startsWith(n) && r.st === "b")) && btCount(btRows()).x === 0,
    JSON.stringify(btCount(btRows()))
  );
  chk(
    "the checklist rows exist and every probe passes",
    btRows().some(r => r.n.startsWith("Sharing costs fairly") && r.st === "b") &&
      btRows().some(r => r.n.startsWith("Is my money going where I want") && r.st === "b") &&
      btCount(btRows()).x === 0
  );
  chk("no client names in the menu", !MENU.some(m => /Jacob|Brandon/.test(m.join(" "))));
}
