/* ============================================================================
   SLAM the Game, test: tests/credit-cards.js
   PURPOSE     Credit cards as a list of cards. Three players, by taps (Krug style: a real task each):
               A has one card paid in full. B has three cards (22%, 0% ending in 4 months with
               $3,000, and 6.66%). C has an old profile with one card balance. Also the rough total
               for all cards, the end of a 0%, and the hint about the rate.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/mycards.js, features/debts.js, features/strat.js,
               core/engine.js (syncDebt, derive), screens/ui.js (rowEdit, the Money list).
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    tour0 = G.tourSeen,
    R = r => Object.assign({ s: true }, r),
    mk = (name, debts) => {
      const a = Object.assign(newChar(), {
        name,
        led: true,
        placed: true,
        age: 31,
        ret: 60,
        take: 5000,
        spend: 3500,
        inv: 20000,
        work: "Established",
        incs: [R({ k: "A main job", amt: 5000 })],
        spends: [R({ k: "Home", amt: 2000 }), R({ k: "Food", amt: 1500 })],
        cashes: [R({ k: "Checking", amt: 9000 })],
        invs: [R({ k: "Retirement plan at work", amt: 20000 })],
        debts,
        debtKinds: debts.map(x => x.k),
      });
      G.chars.push(a);
      G.active = G.chars.length - 1;
      syncAll(a);
      save();
      go("home");
      return C();
    },
    type = (k, digits) => {
      X("padopen", null, k);
      String(digits)
        .split("")
        .forEach(d => X("key", d, k));
    },
    rate = digits =>
      X("ropen") ||
      String(digits)
        .split("")
        .forEach(d => X("rkey", d));
  G.demo = false;
  G.tourSeen = true;

  /* ---------- Player A: one card, paid in full ---------- */
  let c = mk("A", []);
  X("cards");
  chk(
    "A: the list opens empty, with a clear add button",
    W.kind === "cards" && ov().includes("+ Add a card") && clean(ov()),
    junk(ov())
  );
  X("cdadd");
  chk(
    "A: the first question is who issued it, by chips",
    W.kind === "cardadd" && W.st === "iss" && ov().includes("Who issued it?") && ov().includes("Capital One")
  );
  X("cdiss", "Discover");
  if (W.st === "vault") X("cdvault", "");
  chk("A: then, paid in full every month?", W.st === "full" && ov().includes("pay it off in full"));
  X("cdfull", "Yes");
  let o = ov();
  chk(
    "A: paid in full: no debt, the row says Paid in full, and the balance and rate were skipped",
    W.kind === "cards" &&
      c.debts.length === 1 &&
      c.debts[0].amt === 0 &&
      c.debt === 0 &&
      c.high === "no" &&
      o.includes("Paid in full") &&
      clean(o),
    junk(o)
  );
  chk("A: Home and Money draw with no defect", (go("home"), clean(app())) && (go("money"), clean(app())), junk(app()));

  /* ---------- Player B: three cards ---------- */
  c = mk("B", []);
  const ym4 = cardAddMonths(todayISO(), 4);
  // card 1: 22%, $4,000, typed
  X("cards");
  X("cdadd");
  X("cdiss", "Capital One");
  if (W.st === "vault") X("cdvault", "");
  X("cdfull", "No");
  let i1 = W.i;
  type("d:" + i1, "4000");
  X("cdbaluse");
  chk(
    "B: the rate chips include 0% promo, and nothing is picked before a tap",
    W.st === "rate" && ov().includes("0% promo") && !/chip on/.test(ov())
  );
  rate("22");
  X("cdrateuse");
  // card 2: 0% promo, $3,000, ends in 4 months, rate after not sure
  X("cdadd");
  X("cdiss", "Chase");
  if (W.st === "vault") X("cdvault", "");
  X("cdfull", "Sometimes");
  const i2 = W.i;
  type("d:" + i2, "3000");
  X("cdbaluse");
  X("cdrate", "0% promo");
  chk(
    "B: a 0% card asks when the 0% ends, with an i",
    W.st === "end" && ov().includes("When does the 0% end?") && ov().includes('data-k="term:cdpromo"')
  );
  X("cdmonth", ym4);
  chk("B: then the rate after it ends, with Not sure", W.st === "after" && ov().includes("Not sure"));
  X("cdafter", "ns");
  // card 3: 6.66% typed, $2,000
  X("cdadd");
  X("cdiss", "Citi");
  if (W.st === "vault") X("cdvault", "");
  X("cdfull", "No");
  const i3 = W.i;
  type("d:" + i3, "2000");
  X("cdbaluse");
  rate("6.66");
  X("cdrateuse");
  const M = cardMath(c),
    p2 = M.cards.find(x => x.i === i2);
  chk(
    "B: three card lines, each its own debt; the totals: owed, 8% or more, at 0%, soonest end",
    c.debts.filter(cardIs).length === 3 && M.total === 9000 && M.high === 4000 && M.zero === 3000 && M.soonest === ym4,
    [M.total, M.high, M.zero, M.soonest]
  );
  chk(
    "B: the exact rate keeps its decimals",
    c.debts[i3].rate === 6.66 && c.debts[i3].apr === "Under 8%" && !c.debts[i3].high
  );
  chk(
    "B: the 0% card is not costly debt yet",
    !c.debts[i2].high && c.debts[i2].apr === "No interest" && c.high === "yes"
  );
  chk(
    "B: pay $750 a month to clear the 0% card before it ends",
    p2.promo.left === 4 && p2.promo.pay === 750 && p2.promo.afterGuess,
    p2.promo
  );
  X("cdopen", String(i2));
  o = ov();
  chk(
    "B: the open 0% card says what to pay a month",
    o.includes("Pay $750 a month to clear it before the 0% ends.") && o.includes("25% a year (a guess)") && clean(o),
    junk(o)
  );
  chk("B: the order is highest rate first, the 0% card last", M.order.map(x => x.i).join() === [i1, i3, i2].join());
  const plan = dbPlan(c, "avalanche", 0);
  chk(
    "B: the payoff plan names each card and puts the 0% card last",
    plan.debts.length === 3 &&
      plan.debts[0].name === "Credit card: Capital One" &&
      plan.debts[2].name === "Credit card: Chase",
    plan.debts.map(d => d.name)
  );
  chk(
    "B: the 8% check is per card: only the 22% card counts",
    stgCards(c).bal === 4000 && stgCards(c).n === 1,
    stgCards(c)
  );
  const d = derive(c);
  chk("B: the derived picture reads the card list", c.debt === 9000 && d && isFinite(d.era));
  chk(
    "B: Home, Money and the plan draw with no defect",
    (go("home"), clean(app())) && (go("money"), clean(app())) && (go("plan"), clean(app())),
    junk(app())
  );
  go("money");
  chk(
    "B: the Money list shows each card by name",
    app().includes("Credit card: Capital One") && app().includes("Credit card: Citi")
  );
  // the 0% ends: the card takes the rate after (25%, a guess) and becomes costly debt
  cardSync(c, cardAddMonths(todayISO(), 6) + "-02");
  chk(
    "B: after the 0% ends, the card flips to 25% and counts as 8% or more",
    c.debts[i2].high && c.debts[i2].rate === 25
  );
  cardSync(c);
  chk("B: today again, it is 0% again", !c.debts[i2].high && c.debts[i2].rate === 0);
  const B = cardsBook(c),
    tot = B.rows.find(r => r.id === "cd_tot");
  chk(
    "B: the spreadsheet has the cards and a live total",
    tot && tot.v === 9000 && /\{cd_b0\}\+\{cd_b1\}\+\{cd_b2\}/.test(tot.f),
    B.rows.map(r => r.id)
  );
  // remove a card
  X("cards");
  X("cddel", String(i3));
  chk("B: a card can be removed", c.debts.filter(cardIs).length === 2 && c.debt === 7000);

  /* ---------- Player C: an old profile with one card balance ---------- */
  c = mk("C", [R({ k: "Credit card balance", amt: 3000, high: true, apr: "15% to 25%", rate: 20, pay: 150 })]);
  chk(
    "C: the old single card becomes Card 1 with its amount, rate and status kept",
    c.debts.length === 1 &&
      c.debts[0].card.nm === "Card 1" &&
      c.debts[0].amt === 3000 &&
      c.debts[0].rate === 20 &&
      c.debt === 3000 &&
      c.high === "yes" &&
      cardState(c.debts[0]) === "Close"
  );
  chk("C: with one plain card the debt keeps its old name", debtName(c.debts[0], c) === "Credit card balance");
  go("money");
  X("rowedit", "0", "debts");
  o = ov();
  chk(
    "C: tapping the card line opens Your credit cards, with Card 1 open",
    W.kind === "cards" &&
      o.includes("Your credit cards") &&
      o.includes("Card 1") &&
      o.includes("Remove this card") &&
      clean(o),
    junk(o)
  );
  chk("C: Home draws with no defect", (go("home"), clean(app())), junk(app()));

  /* ---------- the rough total for all cards ---------- */
  c = mk("D", []);
  X("cards");
  X("cdrough");
  X("cdrough", "10000");
  const rough = () => c.debts.find(x => cardIs(x) && x.card.rough);
  chk("rough: one total for all cards is allowed", rough() && rough().amt === 10000 && c.debt === 10000);
  X("cdadd");
  X("cdiss", "Other");
  if (W.st === "vault") X("cdvault", "");
  X("cdfull", "No");
  type("d:" + W.i, "4000");
  X("cdbaluse");
  X("cdrate", "15% to 25%");
  chk("rough: a card line takes its part from the rough total", rough().amt === 6000 && c.debt === 10000);
  X("cdadd");
  X("cdiss", "Store card");
  if (W.st === "vault") X("cdvault", "");
  X("cdfull", "No");
  type("d:" + W.i, "8000");
  X("cdbaluse");
  X("cdrate", "Over 25%");
  chk(
    "rough: when the lines pass the total, the lines win and the extra shows",
    rough().amt === 0 && c.debt === 12000 && cardMath(c).over === 2000
  );

  /* ---------- the hint about the rate ---------- */
  c = mk("E", [R({ k: "Car loan", amt: 0, high: false, s: false })]);
  go("money");
  X("rowedit", "0", "debts");
  chk(
    "hint: no assumption line before there is an amount",
    !ov().includes("For now the game assumes") && !ov().includes("treating this one")
  );
  closeSheet();
  c.debts[0].amt = 9000;
  X("rowedit", "0", "debts");
  chk(
    "hint: with an amount and no rate, it says the assumption and how to change it",
    ov().includes("Tap a rate to change it.")
  );
  closeSheet();

  /* ---------- the owner's answers of Nov 25: Not sure is 3 months, over 12 is 12, names and sorting ---------- */
  c = mk("F", []);
  X("cards");
  X("cdadd");
  X("cdiss", "Discover");
  if (W.st === "vault") X("cdvault", "");
  X("cdfull", "No");
  type("d:" + W.i, "3000");
  X("cdbaluse");
  X("cdrate", "0% promo");
  X("cdend", "ns");
  X("cdafter", "ns");
  const f0 = cardMath(c).cards[0];
  chk(
    "not sure of the end: 3 months, a Guess, $1,000 a month",
    f0.promo.left === 3 && f0.promo.pay === 1000 && f0.promo.endGuess && f0.st === "Guess",
    f0
  );
  chk("over 12 months counts as 12", CARD_END.find(r => r[0] === "m12")[2] === 12);
  const fi = f0.i;
  X("cdname", String(fi));
  chk(
    "name: chips and a short box",
    W.st === "name" && ov().includes("Balance transfer") && ov().includes('id="cdnick"')
  );
  X("cdnamek", "Balance transfer");
  chk(
    "name: the card shows its name everywhere",
    c.debts[fi].nick === "Balance transfer" &&
      ov().includes("Balance transfer") &&
      (go("money"), app().includes("Credit card: Balance transfer"))
  );
  X("cdadd");
  X("cdiss", "Citi");
  if (W.st === "vault") X("cdvault", "");
  X("cdfull", "No");
  type("d:" + W.i, "9000");
  X("cdbaluse");
  X("cdrate", "8% to 15%");
  X("cdsort", "bal");
  const ob = ov();
  chk(
    "sort: by biggest balance, the $9,000 card comes first",
    c.x.cardSort === "bal" && ob.indexOf("$9,000") < ob.indexOf("$3,000")
  );
  X("cdsort", "rate");
  chk("sort: by highest rate, the 0% card comes last", ov().indexOf("$9,000") < ov().indexOf("$3,000"));
  c = mk("G", [R({ k: "Car loan", amt: 9000, high: false, apr: "Under 8%" })]);
  go("money");
  X("rowedit", "0", "debts");
  W.o.rownick = "The Civic";
  X("rownick");
  X("rowsave");
  chk(
    "name: any money line can get its own name",
    c.debts[0].nick === "The Civic" && (go("money"), app().includes("The Civic"))
  );

  G.chars.splice(n0);
  G.active = act0;
  G.demo = demo0;
  G.tourSeen = tour0;
  save();
}
