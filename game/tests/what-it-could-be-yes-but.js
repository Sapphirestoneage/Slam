/* ============================================================================
   SLAM the Game, test: tests/what-it-could-be-yes-but.js
   PURPOSE     Examine Batch B, phase 3 (Nov 27 2026), the "Yes, but" card of What it is / What it could be.
               The card is one screen between the two groups of the stack. The top half is a cut, the bottom
               half is a keep or an upgrade, and the net is in the middle. Each price in months is the number
               of the engine's own function (stgImpact, the run behind Moves to try), and the net is one run
               with both changes. All taps. The pairs come from the ranked values, or by size with the reason
               behind an "i". The card changes no spending line and neither of the two pinned numbers. The
               image has no dollar amount. The idea has its credit in the list of famous money ideas.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. Made-up players.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/cbyesbut.js (cbYb, cbYbPick, cbYbSet, cbYbStep, cbYbImp,
               cbYbCard, cbYbBookRows, cbYbView, cbYbStackRow), features/cbstack.js (cbStackView),
               features/strat.js (stgImpact), features/cbmoves.js (cbMoveWords), features/values.js (vlStep,
               vlGet), features/ideas4.js (the idea yesbut).
   ========================================================================= */
{
  const G0 = clone(G),
    text = h =>
      h
        .replace(/<svg[\s\S]*?<\/svg>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " "),
    junk = h =>
      (text(h).match(/undefined|NaN|\bnull\b|\u2014/g) || [])
        .concat(text(h).match(/mistake|failed|\bbehind\b|off track|should|wasteful|too much|bad\b/gi) || [])
        .join(","),
    go = (v, k) => X("cbgo", v, k),
    F = m => ({ save: m, take: 0, equity: 0, once: 0, hours: 0, value: m }),
    same = (a, b) => JSON.stringify(a) === JSON.stringify(b),
    fid = (h, id) => (h.match(new RegExp('data-fid="' + id + '"[\\s\\S]*?</div></div>')) || [""])[0];

  /* ---- 1. a new player: the four taps, the stack, the card ---- */
  G = clone(G0);
  G.demo = true;
  W = null;
  X("start");
  X("wnskip"); /* What you want (run SLAM-ONBOARD-1): Skip for now */
  X("cbset", "", "", { q: "age", i: 1 });
  X("cbset", "", "", { q: "spend", i: 2 });
  X("cbset", "", "", { q: "inv", i: 3 });
  X("cbset", "", "", { q: "save", i: 3 });
  let c = C();
  const N0 = clone(cbNumbers(c)),
    spends0 = clone(c.spends);
  go("stack");
  let h = ov();
  chk(
    "the stack has the row of the card between its two groups",
    h.indexOf('data-fid="cb:after"') < h.indexOf('data-fid="cb:ybrow"') &&
      h.indexOf('data-fid="cb:ybrow"') < h.indexOf('data-fid="cb:moves"') &&
      /Make a card/.test(text(h))
  );
  chk(
    "the card is a step of the flow and not a way: no number, not counted in the stack",
    CB_STEPS.some(s => s.id === "yesbut" && !s.way) &&
      !cbWays().some(w => w.id === "yesbut") &&
      !cbStack(c).after.some(w => w.id === "yesbut")
  );
  go("yesbut");
  h = ov();
  chk(
    "the screen has the two pinned numbers, the one advice line, Next, Back and the way to all the ways",
    W.step === "yesbut" &&
      /data-fid="cb:top"/.test(h) &&
      text(h).includes(TRUST_LINE) &&
      /data-a="cbgo" data-v="next"/.test(h) &&
      /data-a="cbgo" data-v="prev"/.test(h) &&
      /data-a="cbgo" data-v="stack"/.test(h)
  );
  chk("the screen is clean: no undefined, no long dash, no verdict word", junk(h) === "", junk(h));
  chk("no typing: the screen has no box to type in", !/<input|<textarea|<select/.test(h));
  chk(
    "Yes is the top half, the net is in the middle, But is the bottom half",
    h.indexOf('data-fid="cbyb:yes"') > 0 &&
      h.indexOf('data-fid="cbyb:yes"') < h.indexOf('data-fid="cbyb:net"') &&
      h.indexOf('data-fid="cbyb:net"') < h.indexOf('data-fid="cbyb:but"')
  );
  chk(
    "it has Show the math, a Guess pill for the four taps, and an i for the card, the net and the pairs",
    /<details class="math/.test(h) &&
      cbYb(c).st === "Guess" &&
      /kitst">Guess/.test(h) &&
      ["cbyesbut", "cbybnet", "cbybpairs"].every(t => h.includes("term:" + t) && GLOSS[t])
  );

  /* ---- 2. the pairs of a player with no ranked values: by size, and the screen says so ---- */
  let Y = cbYb(c);
  const rows = c.spends.filter(r => r.amt > 0),
    big = rows.slice().sort((a, b) => b.amt - a.amt)[0],
    small = rows.slice().sort((a, b) => a.amt - b.amt)[0];
  chk(
    "with no ranked values the pairs go by size: the biggest line as the cut, the smallest as the keep",
    Y.basis === "size" &&
      Y.pairs.length >= 2 &&
      Y.pairs.length <= 3 &&
      Y.pairs[0].yn === big.k &&
      Y.pairs[0].bn === small.k &&
      Y.pairs.every(p => p.yn !== p.bn)
  );
  chk(
    "the screen says that the order is by size, and gives the way to rank what matters",
    /By size for now/.test(text(h)) && /data-a="values"/.test(h) && /size only/.test(GLOSS.cbybpairs[1])
  );
  chk("nothing is on the card yet, and no image button shows", Y.n === 0 && !/cbybsave/.test(h));

  /* ---- 3. one tap on a pair: each price is the engine's own number ---- */
  X("cbybpair", String(Y.pairs[0].b), String(Y.pairs[0].y));
  h = ov();
  Y = cbYb(c);
  const cut = vlStep(big.amt);
  chk(
    "one tap on a pair puts one line in each half",
    same(Y.yes.names, [big.k]) && same(Y.but.names, [small.k]) && Y.n === 2 && Y.pairs[0].on
  );
  chk(
    "the cut is a tenth of the line with the step of values.js, and its price is stgImpact of that spending change",
    Y.yes.month === cut &&
      cbYbStep(big.amt, 0.1, true) === cut &&
      same(Y.yes.imp, stgImpact(c, F(cut), "full")) &&
      Y.yes.words === cbMoveWords(stgImpact(c, F(cut), "full")) &&
      / sooner$/.test(Y.yes.words) &&
      text(h).includes(Y.yes.words)
  );
  chk(
    "a keep costs nothing more: no change to the date, and the net is the price of the Yes",
    Y.but.month === 0 &&
      Y.but.words === "No change to the date" &&
      same(Y.net.imp, Y.yes.imp) &&
      text(fid(h, "cbyb:net")).includes(Y.net.words)
  );

  /* ---- 4. an upgrade: months later, and the net is one run with both changes ---- */
  X("cbybsize", "10", "but");
  Y = cbYb(c);
  h = ov();
  const add = vlStep(small.amt);
  chk(
    "an upgrade of a tenth costs months: the price of the But is stgImpact of more spending",
    Y.but.month === add &&
      same(Y.but.imp, stgImpact(c, F(-add), "full")) &&
      / later$/.test(Y.but.words) &&
      text(h).includes(Y.but.words)
  );
  chk(
    "the net is stgImpact of the cut less the upgrade, and it is between the two prices",
    Y.net.month === cut - add &&
      same(Y.net.imp, stgImpact(c, F(cut - add), "full")) &&
      Y.net.months < Y.yes.imp.fi &&
      Y.net.months > Y.but.imp.fi &&
      text(fid(h, "cbyb:net")).includes(Y.net.words)
  );
  X("cbybsize", "50", "yes");
  Y = cbYb(c);
  chk(
    "a bigger cut is a bigger step with the same rounding, never more than the line, and more months",
    Y.yes.month === vlStep(big.amt * 5) &&
      Y.yes.month <= big.amt &&
      Y.yes.imp.fi > stgImpact(c, F(cut), "full").fi &&
      cbYbStep(15, 0.5, true) === 10 &&
      cbYbStep(8, 0.5, true) === 8 &&
      cbYbStep(100, 0, true) === 0
  );
  chk(
    "each line of a half shows its own price from the same engine",
    Y.yes.rows.length === rows.length &&
      Y.yes.rows.every(
        r => r.words === cbMoveWords(stgImpact(c, F(cbYbStep(r.amt, 0.5, true)), "full")) && r.month > 0
      ) &&
      Y.but.rows.every(r => r.words === cbMoveWords(stgImpact(c, F(-vlStep(r.amt)), "full")))
  );

  /* ---- 5. any Yes with any But; a line is in one half only ---- */
  const third = rows.find(r => r !== big && r !== small),
    at = r => c.spends.indexOf(r);
  X("cbybtap", "", "yes", { i: String(at(third)) });
  Y = cbYb(c);
  chk(
    "a second cut adds to the Yes half, and the half is priced as one change",
    Y.yes.names.length === 2 &&
      Y.yes.month === vlStep(big.amt * 5) + vlStep(third.amt * 5) &&
      same(Y.yes.imp, stgImpact(c, F(Y.yes.month), "full"))
  );
  X("cbybtap", "", "but", { i: String(at(big)) });
  Y = cbYb(c);
  chk(
    "a line that is tapped in the other half moves there: it is never in both",
    Y.but.names.includes(big.k) && !Y.yes.names.includes(big.k) && same(Y.yes.names, [third.k])
  );
  X("cbybtap", "", "but", { i: String(at(big)) });
  chk("a second tap takes a line off the card", !cbYb(c).but.names.includes(big.k));

  /* ---- 6. a what-if: no number of the player moves, and the profile holds no dollars of the card ---- */
  chk(
    "the card changes no spending line and neither of the two pinned numbers",
    same(c.spends, spends0) && same(cbNumbers(c), N0)
  );
  chk(
    "the profile holds the names of the lines and the two sizes, and no amount",
    same(Object.keys(c.x.cb.yb).sort(), ["bs", "but", "yes", "ys"]) &&
      c.x.cb.yb.yes.concat(c.x.cb.yb.but).every(k => typeof k === "string") &&
      !/\d{3}/.test(JSON.stringify(c.x.cb.yb))
  );
  go("stack");
  h = ov();
  Y = cbYbPick(c);
  chk(
    "the stack shows the net of the card, and the counter does not count the card",
    text(h).includes("Your card: " + Y.net.words.replace(/^./, m => m.toLowerCase())) && cbStack(c).stacked === 0
  );
  const B = cbYbBookRows(c),
    bv = id => B.find(r => r.id === id).v;
  chk(
    "the spreadsheet of the plan has the two halves and the net as a formula",
    B.length === 3 &&
      bv("cb_ybnet") === bv("cb_ybyes") - bv("cb_ybbut") &&
      B.find(r => r.id === "cb_ybnet").f === "={cb_ybyes}-{cb_ybbut}" &&
      cbBook(c).rows.some(r => r.id === "cb_ybnet")
  );

  /* ---- 7. the image: the names and the months, no dollar amount ---- */
  go("yesbut");
  h = ov();
  const card = cbYbCard(cbYbPick(c)),
    all = JSON.stringify(card);
  chk(
    "the words of the image have the lines, the months of each half and the net, and no dollar amount",
    !/\$/.test(all) &&
      !/\u2014/.test(all) &&
      card.yes.lines[0].startsWith(third.k) &&
      card.net === Y.net.words &&
      card.foot.includes(TRUST_LINE) &&
      card.file === "slam-yes-but.png" &&
      !all.includes(c.name || "\u0000")
  );
  chk("the screen has the button that saves the card as an image", /data-a="cbybsave"/.test(h));
  let threw = false;
  try {
    X("cbybsave");
  } catch (e) {
    threw = true;
  }
  chk(
    "where the page cannot draw, the save says so in plain words and nothing breaks",
    !threw && (cbYbPaint(card) === null ? /screenshot/.test(W.msg || "") : true)
  );
  X("cbybclear");
  chk("Start the card again takes every line off", cbYb(c).n === 0 && !/cbybsave/.test(ov()));

  /* ---- 8. the pairs from the ranked values ---- */
  c.x.vals = {
    rank: ["Health", "Home", "Fun"],
    serves: { [small.k]: ["Health"], [big.k]: [], [third.k]: ["Fun"] },
  };
  Y = cbYb(c);
  chk(
    "with ranked values the first cut is the line that serves none of them, the first keep serves the top one",
    Y.basis === "values" &&
      Y.yes.rows[0].name === big.k &&
      Y.yes.rows[1].name === third.k &&
      Y.but.rows[0].name === small.k &&
      Y.pairs[0].yn === big.k &&
      Y.pairs[0].bn === small.k
  );
  sheet(cbSheet);
  h = ov();
  chk(
    "the screen then says the pairs come from the ranking, and still has every line in each half",
    /From what you ranked/.test(text(h)) &&
      (h.match(/data-a="cbybtap" data-k="yes"/g) || []).length === rows.length &&
      (h.match(/data-a="cbybtap" data-k="but"/g) || []).length === rows.length
  );
  c.x.vals = { rank: ["Health"], serves: {} };
  chk("ranked values with no line answered yet: by size, with the reason", cbYb(c).basis === "size");
  delete c.x.vals;

  /* ---- 9. a player with no spending lines ---- */
  const keep = c.spends;
  c.spends = [];
  sheet(cbSheet);
  h = ov();
  chk(
    "with no spending lines the screen says what it needs, and the stack has no row for it",
    /data-fid="cbyb:none"/.test(h) && junk(h) === "" && cbYbStackRow(c) === "" && cbYbBookRows(c).length === 0
  );
  c.spends = keep;

  /* ---- 9b. a player with costly debt: the stack and the card still open (a repair of phase 2d) ---- */
  c.debts = [{ k: "Credit card", amt: 18000, apr: 24, high: true, s: true, cf: 3 }];
  syncAll(c);
  let debtOk = true;
  try {
    go("stack");
    h = ov();
    go("yesbut");
    h += ov();
  } catch (e) {
    debtOk = false;
  }
  chk(
    "with $18,000 of card debt the stack opens with the row of the card, and the card opens",
    debtOk && /data-fid="cb:ybrow"/.test(h) && /data-fid="cbyb:net"/.test(h) && junk(h) === "",
    junk(h)
  );
  c.debts = [];
  syncAll(c);

  /* ---- 10. the credit ---- */
  chk(
    "the idea has its credit in the list of famous money ideas, with a line for its source",
    !!IG.yesbut && IG.yesbut.by.length > 10 && IG_ORDER.includes("yesbut") && !!GLOSS.ig_yesbut
  );
  G.demo = false;
  X("idea", "yesbut", "");
  h = ov();
  chk(
    "the idea opens with its credit line and leads to the card",
    h.includes("From: ") && /data-a="cbyb"/.test(h) && junk(h) === "",
    junk(h)
  );
  X("cbyb");
  chk("its button opens the card in the flow", W.kind === "cb" && W.step === "yesbut");

  G = clone(G0);
  W = null;
}
