/* ============================================================================
   SLAM the Game, test: tests/bonus-cards-early.js
   PURPOSE     Examine the bank and card bonus moves in the opening (run CC-1, item 23): a player who
               fits sees both on the first screen of the stack, before "Show all"; a player with debt
               at 8% or more gets neither and sees each one under "ways that do not fit you yet", with
               the reason; the rule is the one the Strategy Engine already had; no bank and no card is
               named.
   INPUT       The game scripts, loaded by harness.cjs. The sample game.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: cbMoves, cbMovesFirst, CBM_BONUS of features/cbmoves.js,
               cbStackView of features/cbstack.js, the moves "bank" and "welcome" of data/strategies.js.
   ========================================================================= */
{
  const G0 = G;
  const fresh1 = costly => {
    G = clone(G0);
    G.demo = true;
    W = null;
    SH = null;
    X("start");
    X("wnskip");
    X("cbset", "", "", { q: "age", i: 1 });
    X("cbset", "", "", { q: "spend", i: 2 });
    X("cbset", "", "", { q: "inv", i: 3 });
    X("cbset", "", "", { q: "save", i: 3 });
    const c = C();
    if (costly)
      c.debts.push({ k: "Credit card balance", amt: 8000, high: true, apr: "15% to 25%", rate: 22, pay: 200, s: true });
    return c;
  };
  const stack = () => {
    W.step = "stack";
    W.all = false;
    drawSheet();
    return ov();
  };
  const text = h => h.replace(/<[^>]+>/g, " ");

  /* 1. THE RULE IS THE EXISTING ONE */
  const bank = STRATEGIES.find(s => s.id === "bank"),
    wel = STRATEGIES.find(s => s.id === "welcome");
  chk(
    "both bonus moves use the check of the Strategy Engine: no debt at 8% or more",
    [bank, wel].every(S => S.fitChecks.some(k => k.id === "mask" && k.fact === "debt8" && k.block === "mask"))
  );
  chk("the two moves are the bonus moves of the opening", CBM_BONUS.join() === "bank,welcome");

  /* 2. A PLAYER WHO FITS */
  let c = fresh1(false),
    M = cbMoves(c);
  const ids = M.shown.map(r => r.id);
  chk(
    "both moves apply, with no Not yet",
    ["stg:bank", "stg:welcome"].every(id => M.shown.some(r => r.id === id && r.applies && !r.notyet))
  );
  chk(
    "they are not in the first three by rank, so the rule matters",
    ids.indexOf("stg:bank") >= 3 || ids.indexOf("stg:welcome") >= 3,
    ids.join(" ")
  );
  let h = stack();
  chk(
    "the first screen of the stack shows both, before Show all",
    /data-k="stg:bank"/.test(h) &&
      /data-k="stg:welcome"/.test(h) &&
      /data-a="cbstkall"[^>]*aria-expanded="false"/.test(h)
  );
  chk("by their plain names", text(h).includes("Bank bonus loop") && text(h).includes("Card welcome bonus"));
  chk(
    "the rows are a few, not the whole list",
    (h.match(/data-fid="cb:stkmove"/g) || []).length <= 5 && M.shown.length > 5
  );
  chk(
    "no bank and no card is named on the rows",
    !/\b(Chase|Amex|American Express|Citi|Capital One|Discover|Wells Fargo|Bank of America|SoFi|Ally)\b/i.test(text(h))
  );
  chk("the screen shows no defect", clean(h), junk(h));
  X("cbgo", "move", "stg:bank");
  h = ov();
  chk(
    "the move opens inside the flow, with Count this and Not for me",
    W.step === "move" && /data-a="cbmovedo"[^>]*data-v="count"/.test(h) && /data-v="no"/.test(h)
  );
  chk("its screen has one pulse", (h.match(/\bcbnext\b/g) || []).length === 1);

  /* 3. A PLAYER WITH COSTLY DEBT */
  c = fresh1(true);
  chk("the game knows the debt is costly", hiDebt(c) > 0 && stgFact(c, "debt8") === "carry");
  M = cbMoves(c);
  chk("neither bonus move is offered", !M.shown.some(r => r.id === "stg:bank" || r.id === "stg:welcome"));
  const hid = M.hidden.filter(r => r.id === "stg:bank" || r.id === "stg:welcome");
  chk(
    "each one waits, with the reason",
    hid.length === 2 && hid.every(r => !r.applies && /Clear it first\./.test(r.why)),
    JSON.stringify(hid.map(r => r.why))
  );
  h = stack();
  chk(
    "the first screen of the stack has no bonus row",
    !/data-fid="cb:stkmove"[^>]*>\s*<button[^>]*data-k="stg:(bank|welcome)"/.test(h) &&
      !new RegExp('data-fid="cb:moves">[\\s\\S]*?data-k="stg:bank"[\\s\\S]*?cbstkall').test(h)
  );
  chk(
    "both are under the ways that do not fit yet, with why",
    /ways? that do not fit you yet, and why/.test(h) &&
      text(h).includes("Debt at 8% or more costs more each month than a bank bonus pays. Clear it first.") &&
      text(h).includes("A carried balance costs more than a welcome offer pays. Clear it first.")
  );
  chk("the first three moves are still there", (h.match(/data-fid="cb:stkmove"/g) || []).length === 3);
  chk("the words do not blame", !/\b(mistake|failed|behind|off track)\b/i.test(text(h)));
  chk("the screen shows no defect", clean(h), junk(h));

  /* 4. THE DEBT GOES: THE MOVES COME */
  c.debts.length = 0;
  M = cbMoves(c);
  chk(
    "with the costly debt gone, both moves are offered",
    ["stg:bank", "stg:welcome"].every(id => M.shown.some(r => r.id === id))
  );
  X("close");
  G = G0;
}
