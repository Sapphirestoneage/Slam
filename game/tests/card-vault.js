/* ============================================================================
   SLAM the Game, test: tests/card-vault.js
   PURPOSE     Examine the card vault: the 5/24 count from the months opened, the spending of the
               budget that can go on a card, the credit band, if an offer fits, the offers that wait
               for high-interest debt, the dates worth knowing, adding a card by taps, the sheet, the
               spreadsheet rows, the skill link and the built row.
   INPUT       The game scripts, loaded by harness.cjs. data/cards2026.js. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/vault.js, data/cards2026.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    T = "2026-11-23",
    a = Object.assign(newChar(), {
      name: "Vault",
      led: true,
      placed: true,
      age: 31,
      ret: 60,
      incs: [R0({ k: "A main job", amt: 6000 })],
      spends: [
        R0({ k: "Home", amt: 2000 }),
        R0({ k: "Food", amt: 900 }),
        R0({ k: "Getting around", amt: 400 }),
        R0({ k: "Fun and everything else", amt: 700 }),
      ],
      cashes: [R0({ k: "Checking", amt: 8000 })],
      invs: [R0({ k: "IRA or Roth IRA", amt: 20000 })],
      debts: [],
      caught: { score: "670 to 739" },
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C(),
    L = CARDS2026,
    rule = L.rule;
  chk(
    "the library: dated, with its source, the rule and the offers",
    /^\d{4}-\d\d-\d\d$/.test(L.asOf) &&
      L.source.length > 20 &&
      rule.slots === 5 &&
      rule.months === 24 &&
      L.offers.length > 50 &&
      L.offers.every(o => o.id && o.bank && o.n)
  );
  /* the 5/24 count, worked by hand for 2026-11 */
  const cards = [
    { n: "A", ym: "2026-09" },
    { n: "B", ym: "2025-12" },
    { n: "C", ym: "2024-12" } /* 23 months ago: counts */,
    { n: "D", ym: "2024-11" } /* 24 months ago: does not count */,
    { n: "E", ym: "2026-01", biz: 1 } /* a business card: does not count */,
    { n: "F", ym: null },
  ];
  const S = vaultSlots(cards, T);
  chk(
    "5/24: 3 count, 2 slots left, the next slot comes back in Dec 2026",
    S.used === 3 && S.left === 2 && S.frees === "Dec 2026" && S.freesIn === 1,
    JSON.stringify(S)
  );
  const five = ["2026-10", "2026-06", "2026-01", "2025-08", "2025-03", "2025-01"].map(ym => ({ n: "x", ym })),
    S6 = vaultSlots(five, T);
  chk(
    "at 6 of 5: no slot left, and two cards must pass the window",
    S6.used === 6 && S6.left === 0 && S6.frees === "Mar 2027",
    JSON.stringify(S6)
  );
  /* the spending that can go on a card */
  const sp = vaultSpend(c);
  chk(
    "card spending is the budget without the home line",
    sp.v === 2000 && sp.budget === 2000 && !sp.given,
    JSON.stringify(sp)
  );
  chk("the credit band comes from the game's answer", vaultScore(c).v === "good" && vaultScore(c).known === true);
  /* one offer by hand: Sapphire Preferred, 75,000 points at 1 cent, $95 fee, $5,000 in 3 months */
  const o = vaultOffer("chase-sapphire-preferred"),
    me = vaultMe(c, T);
  chk(
    "the value of an offer at the floor, and after the fee",
    o && vaultValue(o) === o.amt * L.units[o.unit].v && vaultNet(o) === vaultValue(o) - o.fee
  );
  chk(
    "months to earn: the spending divided by the monthly card spending",
    vaultMonths({ spend: 5000, months: 3 }, 2000) === 3 &&
      vaultMonths({ spend: 5000, months: 3 }, 1500) === null &&
      vaultMonths({ spend: 0, months: 3 }, 0) === 1
  );
  const f1 = vaultFit({ bank: "Chase", spend: 4000, months: 3, min: "good", amt: 60000, unit: "ur", fee: 95 }, me);
  chk(
    "an offer the budget covers fits",
    f1.level === "fits" && f1.reasons.includes("Your usual spending covers the offer.") && f1.net === 505,
    JSON.stringify(f1)
  );
  const f2 = vaultFit({ bank: "Chase", spend: 9000, months: 3, min: "good", amt: 60000, unit: "ur", fee: 0 }, me);
  chk(
    "an offer that needs more than the usual spending is a maybe",
    f2.level === "maybe" && f2.reasons.some(r => r.includes("$3,000 a month"))
  );
  const f3 = vaultFit({ bank: "Chase", spend: 15000, months: 3, min: "good", amt: 60000, unit: "ur", fee: 0 }, me);
  chk("an offer that needs more than two times the usual spending waits", f3.level === "later");
  const f4 = vaultFit({ bank: "Chase", spend: 500, months: 3, min: "excellent", amt: 20000, unit: "cash", fee: 0 }, me);
  chk(
    "an offer above the credit band waits",
    f4.level === "later" && f4.reasons.includes("Usually needs excellent credit.")
  );
  const f5 = vaultFit(
    { bank: "Chase", spend: 500, months: 3, min: "good", amt: 200, unit: "cash", fee: 0 },
    Object.assign({}, me, { opened: 5 })
  );
  chk(
    "at 5 of 5 a Chase card waits, and a card of another bank does not",
    f5.level === "later" &&
      vaultFit(
        { bank: "Citi", spend: 500, months: 3, min: "good", amt: 200, unit: "cash", fee: 0 },
        Object.assign({}, me, { opened: 5 })
      ).level === "fits"
  );
  const mv = vaultMoves(c, T);
  chk(
    "the offers that fit: sorted by first-year value, none held, none above the band, none a program",
    mv.length > 3 &&
      mv.every((m, i) => !i || mv[i - 1].net >= m.net) &&
      mv.every(
        m => m.fit.level !== "later" && m.months != null && L.units[m.o.unit].cash && (VAULT_SCORE[m.o.min] || 0) <= 2
      ),
    mv.length
  );
  /* the sheet, and a card added by taps */
  X("vault");
  chk(
    "the sheet: the count, the budget, the offers, the date of the data",
    W.kind === "vault" &&
      ov().includes("0 of 5") &&
      ov().includes("$2,000 a month") &&
      ov().includes("Welcome offers that fit") &&
      ov().includes("Offers as of " + L.asOf) &&
      clean(ov()),
    junk(ov())
  );
  chk(
    "each label has an i",
    ["vt_vault", "vt_524", "vt_open", "vt_offer", "vt_spend", "vt_score", "vt_program"].every(
      k => ov().includes("term:" + k) && GLOSS[k]
    )
  );
  chk(
    "the answers are taps with Guess / Close / Exact, and no text box",
    ov().includes('data-a="kitset" data-k="vault|score"') && ov().includes("kitsure") && !ov().includes("<input")
  );
  X("vaultadd", "go");
  chk("add a card, step 1: the bank", ov().includes("Which bank?") && ov().includes('data-v="Chase"'));
  X("vaultpick", "Chase", "bank");
  chk("step 2: the card", ov().includes("Which card?") && ov().includes("Sapphire Preferred"));
  X("vaultpick", "chase-sapphire-preferred", "id");
  const y = todayISO().slice(0, 4);
  chk("step 3: the year", ov().includes("Which year did you open it?") && ov().includes('data-v="' + y + '"'));
  X("vaultpick", y, "y");
  chk("step 4: the month", ov().includes("Which month of " + y));
  X("vaultpick", "1", "m");
  const held = vaultStore(c).cards;
  chk(
    "the card is kept in the profile with its month, fee and offer window",
    held.length === 1 &&
      held[0].ym === y + "-01" &&
      held[0].fee === 95 &&
      held[0].months === 3 &&
      held[0].bank === "Chase"
  );
  chk(
    "the count moves, and the held card leaves the offers",
    vaultCalc(c).slots.used === 1 &&
      ov().includes("1 of 5") &&
      !vaultMoves(c).some(m => m.o.id === "chase-sapphire-preferred") &&
      clean(ov()),
    junk(ov())
  );
  chk(
    "the dates worth knowing show: the fee and the slot",
    ov().includes("Dates worth knowing") &&
      ov().includes("yearly fee posts") &&
      ov().includes("stops counting toward the 5 card limit")
  );
  X("vaultdel", "0");
  chk(
    "Remove takes it out and offers to put it back",
    vaultStore(c).cards.length === 0 && ov().includes("Put it back")
  );
  X("vaultundo");
  chk(
    "Put it back restores it",
    vaultStore(c).cards.length === 1 && vaultStore(c).cards[0].id === "chase-sapphire-preferred"
  );
  /* dates by hand */
  const D = vaultDates([{ n: "Card", ym: "2026-10", fee: 95, months: 3 }], T);
  chk(
    "dates: the offer deadline (Jan 2027), the fee (Oct 2027), the slot (Oct 2028)",
    D.length === 3 &&
      D[0].kind === "offer" &&
      D[0].when === "Jan 2027" &&
      D[1].kind === "fee" &&
      D[1].when === "Oct 2027" &&
      D[2].kind === "slot" &&
      D[2].when === "Oct 2028",
    JSON.stringify(D)
  );
  /* an answer on the screen changes the result */
  X("kitset", "500", "vault|spend", { t: "n" });
  chk(
    "a lower card spending drops the offers that need more",
    vaultSpend(c).v === 500 && vaultMoves(c, T).every(m => !m.o.spend || m.o.spend / 500 <= m.o.months)
  );
  X("kitset", "excellent", "vault|score", { t: "s" });
  chk("the answer on this screen wins over the older answer", vaultScore(c).v === "excellent");
  /* high-interest debt: the offers wait */
  c.debts.push(R0({ k: "Credit card balance", amt: 4000, high: true, apr: "15% to 25%", rate: 22, pay: 120 }));
  syncAll(c);
  X("vault");
  chk(
    "with high-interest debt the offers wait, gently",
    c.high === "yes" &&
      vaultMoves(c).length === 0 &&
      ov().includes("Offers wait for now") &&
      ov().includes('data-a="debtplan"') &&
      !/\b(bad|wrong|fail|irresponsible)\b/i.test(ov()) &&
      clean(ov()),
    junk(ov())
  );
  c.debts.length = 0;
  syncAll(c);
  X("close");
  /* the spreadsheet */
  delete kitStore(c, "vault").spend;
  const B = vaultBook(c),
    val = id => (B.rows.find(r => r.id === id) || {}).v;
  chk(
    "the spreadsheet rows: slots left, and the offer after its fee",
    val("vt_left") === Math.max(0, val("vt_limit") - val("vt_used")) &&
      val("vt_spend") === 2000 &&
      val("vt_net") === val("vt_value") - val("vt_fee1"),
    JSON.stringify(B.rows.map(r => [r.id, r.v]))
  );
  chk(
    "the spreadsheet of the plan has the section",
    bookSections(c).some(s => s.title === "Card vault")
  );
  /* the link from a skill, and the built list */
  const K = cxLink("credit-cards", 7);
  chk(
    "a real skill opens the card vault",
    K && K.a === "vault" && cxLink("credit-cards", 9).a === "vault",
    JSON.stringify(K)
  );
  X(K.a, K.v, K.v);
  chk("the link opens the sheet", W && W.kind === "vault");
  X("close");
  const row = btRows().find(r => r.n.startsWith("Card vault"));
  chk("the built list: built, with the action", row && row.st === "b" && row.a === "vault");
  chk("the menu and the screen i", MENU.some(m => m[1] === "vault") && !!NV_INFO.vault);
  const src =
    require("fs").readFileSync(GAME_DIR + "features/vault.js", "utf8") +
    require("fs").readFileSync(GAME_DIR + "data/cards2026.js", "utf8");
  chk("style: no em dash, no red", !/\u2014/.test(src) && !/var\(--(bad|red)\)|#f00|color:\s*red/i.test(src));
  G.chars.length = n0;
  G.active = 0;
  save();
}
{
  /* A car loan payment is not card spending. The rest of "Getting around" stays in. */
  const R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Car",
      led: true,
      placed: true,
      take: 5000,
      spend: 3600,
      spends: [R0({ k: "Home", amt: 1500 }), R0({ k: "Getting around", amt: 900 }), R0({ k: "Food", amt: 1200 })],
      debts: [R0({ k: "Car loan", amt: 12000, pay: 400 }), R0({ k: "Credit card balance", amt: 500, pay: 50 })],
    });
  chk("the car loan payment of a month", vaultCarPay(a) === 400);
  chk("card spending leaves out the home line and the car loan payment", vaultSpend(a).budget === 900 + 1200 - 400);
  a.debts[0].amt = 0;
  chk("a car loan that is paid off takes nothing away", vaultSpend(a).budget === 2100);
}
{
  /* The full card records, the cards of the admin (CARDS_EXTRA), the sheet of one card, the credits, the loader. */
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    T = "2026-11-23",
    L0 = CARDS2026,
    a = Object.assign(newChar(), {
      name: "Vault two",
      led: true,
      placed: true,
      age: 31,
      incs: [R0({ k: "A main job", amt: 7000 })],
      spends: [
        R0({ k: "Home", amt: 2000 }),
        R0({ k: "Food", amt: 1500 }),
        R0({ k: "Fun and everything else", amt: 1500 }),
      ],
      cashes: [R0({ k: "Checking", amt: 8000 })],
      invs: [],
      debts: [],
      caught: { score: "740 to 799" },
    });
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  const c = C();
  const bad = L0.offers.map(o => [o.id, cardCheck(o, L0.units)]).filter(x => x[1].length);
  chk(
    "each of the 93 cards is a full template record: cardCheck finds nothing",
    L0.offers.length === 93 && bad.length === 0,
    JSON.stringify(bad.slice(0, 3))
  );
  chk(
    "each card names its source and a date, and cardClean keeps its switches, rates, credits and unique rows",
    L0.offers.every(o => {
      const k = cardClean(o);
      return (
        o.source.length > 10 &&
        /^\d{4}-\d\d-\d\d$/.test(o.checked) &&
        k.earn.rates.length === o.earn.rates.length &&
        k.credits.length === o.credits.length &&
        k.unique.length === o.unique.length &&
        Object.keys(o.has).every(h => k.has[h]) &&
        Object.values(o.hasWords).every(w => typeof w === "string")
      );
    })
  );
  chk(
    "the rewards layer is in: 67 cards have earn words, and each rate names a category of the template",
    L0.offers.filter(
      o =>
        o.earn.words &&
        o.network !== undefined &&
        (o.earn.rates.length || o.credits.length || Object.keys(o.has).length)
    ).length >= 60 &&
      L0.offers.every(o => o.earn.rates.every(r => CARD_TEMPLATE.cats.some(k => k[0] === r.cat) && r.x > 0))
  );
  const sp = L0.offers.find(o => o.id === "chase-sapphire-preferred");
  chk(
    "one card by hand: Sapphire Preferred has its switches, its rates and its credits",
    sp.has.noForeignFee &&
      sp.has.rental &&
      sp.has.transfer &&
      sp.has.trusted &&
      sp.hasWords.rental.includes("Primary") &&
      sp.earn.rates.some(r => r.cat === "dining" && r.x === 3) &&
      sp.credits.length === 3 &&
      vaultCredits(sp) === 130 &&
      sp.network === "Visa",
    JSON.stringify(sp.has)
  );
  /* the loader: nothing harmful with no database client */
  const before = vaultLib();
  let threw = false,
    out;
  try {
    out = vaultLoadExtra();
  } catch (e) {
    threw = true;
  }
  chk(
    "the loader with no client: no error, no promise, and the file library stays",
    !threw && out === null && CARDS_EXTRA.cards.length === 0 && vaultLib() === before && vaultLib().offers.length === 93
  );
  /* a table that is missing: the error is recorded, and the library stays */
  const keepSb = SUPA.sb,
    errs0 = ERRLOG.length;
  SUPA.sb = {
    from: () => ({
      select: () => Promise.resolve({ data: null, error: new Error("relation card_library does not exist") }),
    }),
  };
  const pr = vaultLoadExtra();
  SUPA.sb = keepSb;
  chk("the loader with a missing table returns a promise that does not reject", pr && typeof pr.then === "function");
  pr.then(() =>
    chk(
      "a missing table leaves the file library, with one error record",
      vaultLib().offers.length >= 93 && ERRLOG.length === errs0 + 1,
      ERRLOG.length - errs0
    )
  );
  /* a card of the admin */
  const extra = cardClean({
    bank: "Test Bank",
    n: "Everyday Plus",
    network: "Visa",
    fee: 99,
    amt: 500,
    unit: "cash",
    spend: 1500,
    months: 3,
    min: "good",
    has: { noForeignFee: true, cellPhone: true },
    hasWords: { cellPhone: "Up to $600 a claim when the phone bill is on the card" },
    earn: {
      base: 1,
      rates: [
        { cat: "groceries", x: 4 },
        { cat: "gas", x: 3 },
      ],
      words: "4x groceries, 3x gas, 1x other",
    },
    credits: [{ name: "Streaming credit", value: 60, words: "$5 a month" }],
    unique: [{ label: "Free museum day", words: "One Saturday a month" }],
    source: "The page of the bank (a test record)",
    checked: "2026-11-23",
  });
  chk(
    "the new card is ready by the template",
    extra.id === "test-bank-everyday-plus" && cardCheck(extra, L0.units).length === 0
  );
  CARDS_EXTRA.cards = [extra];
  CARDS_EXTRA.at = "t1";
  chk(
    "a card in CARDS_EXTRA shows in the library",
    vaultLib().offers.length === 94 &&
      vaultOffer("test-bank-everyday-plus") &&
      vaultOffer("test-bank-everyday-plus").fee === 99
  );
  chk(
    "it is in the offers that fit, with its first-year value",
    vaultMoves(c, T).some(m => m.o.id === extra.id && m.net === 500 - 99)
  );
  X("vault");
  X("vaultadd", "go");
  chk("its bank is in the steps to add a card", ov().includes('data-v="Test Bank"'));
  X("vaultpick", "Test Bank", "bank");
  chk("and its name", ov().includes("Everyday Plus"));
  X("vaultpick", extra.id, "id");
  X("vaultpick", "old", "y");
  chk(
    "the card of the admin can be added to the vault",
    vaultStore(c).cards.length === 1 && vaultStore(c).cards[0].id === extra.id && vaultStore(c).cards[0].fee === 99
  );
  chk("the vault row has the button Details", ov().includes('data-a="vaultcard" data-v="' + extra.id + '"'));
  /* the sheet of one card */
  X("vaultcard", extra.id);
  chk(
    "the sheet of one card: switches with their detail, earn rates, credits with the total, unique rows, source and date",
    W.kind === "vaultcard" &&
      ov().includes("No foreign transaction fee") &&
      ov().includes("Cell phone protection") &&
      ov().includes("Up to $600 a claim") &&
      ov().includes("Groceries") &&
      ov().includes("4x") &&
      ov().includes("Everything else") &&
      ov().includes("Streaming credit") &&
      ov().includes("You count <b>$0</b> of $60 a year") &&
      ov().includes("Free museum day") &&
      ov().includes("The page of the bank (a test record)") &&
      ov().includes("2026-11-23") &&
      ov().includes("added by the SLAM team") &&
      ov().includes("This card is in your vault") &&
      clean(ov()),
    junk(ov())
  );
  chk(
    "each technical label of that sheet has an i",
    [
      "vt_fee",
      "vt_network",
      "vt_has",
      "vt_earn",
      "vt_credit",
      "vt_unique",
      "vt_source",
      "vtsw_noForeignFee",
      "vtsw_cellPhone",
    ].every(k => ov().includes("term:" + k) && GLOSS[k]),
    ov().length
  );
  chk(
    "each switch of the template has its i",
    CARD_TEMPLATE.toggles.every(t => GLOSS["vtsw_" + t.k]) && !!NV_INFO.vaultcard
  );
  X("navback");
  chk("Back returns to the vault", W && W.kind === "vault");
  /* the sheet of a file card, and "I have this card" */
  X("vaultcard", "chase-sapphire-preferred");
  chk(
    "the sheet of a file card is clean and has its parts",
    ov().includes("Rental car cover") &&
      ov().includes("Primary rental car coverage") &&
      ov().includes("Dining and takeout") &&
      ov().includes("You count <b>$0</b> of $130 a year") &&
      ov().includes("What is unique") &&
      ov().includes("2026-11-06") &&
      ov().includes('data-a="vaulthave"') &&
      clean(ov()),
    junk(ov())
  );
  const all = vaultLib().offers.map(o => {
    X("vaultcard", o.id);
    return clean(ov()) ? "" : o.id;
  });
  chk(
    "the sheet of each card of the library is clean",
    all.every(x => !x),
    all.filter(Boolean).slice(0, 4).join()
  );
  X("vaulthave", "chase-sapphire-preferred");
  chk(
    "I have this card opens the vault at the year",
    W.kind === "vault" && W.o.add.id === "chase-sapphire-preferred" && ov().includes("Which year did you open it?")
  );
  X("close");
  /* the same id takes the place of the file card, and hidden removes it */
  CARDS_EXTRA.cards = [cardClean(Object.assign({}, sp, { fee: 150 }))];
  CARDS_EXTRA.at = "t2";
  chk(
    "an extra card with the id of a file card takes its place",
    vaultLib().offers.length === 93 &&
      vaultOffer("chase-sapphire-preferred").fee === 150 &&
      vaultNet(vaultOffer("chase-sapphire-preferred")) === 750 - 150
  );
  CARDS_EXTRA.cards = [cardClean(Object.assign({}, sp, { hidden: true }))];
  CARDS_EXTRA.at = "t3";
  chk(
    "hidden: true removes the card",
    vaultLib().offers.length === 92 &&
      vaultOffer("chase-sapphire-preferred") === null &&
      !vaultMoves(c, T).some(m => m.o.id === "chase-sapphire-preferred")
  );
  vaultExtraSet(
    [
      { id: "x-one", data: { bank: "X", n: "One", fee: "0", source: "s", checked: "2026-11-23" } },
      { id: "", data: {} },
      null,
    ],
    "t4"
  );
  chk(
    "rows of the table go through cardClean, and a row with no id is dropped",
    CARDS_EXTRA.cards.length === 1 &&
      CARDS_EXTRA.cards[0].id === "x-one" &&
      CARDS_EXTRA.cards[0].fee === 0 &&
      vaultLib().offers.length === 94
  );
  CARDS_EXTRA.cards = [];
  CARDS_EXTRA.at = null;
  chk(
    "with no extra cards the library is the file again",
    vaultLib().offers.length === 93 && vaultOffer("chase-sapphire-preferred").fee === 95
  );
  /* the yearly credits: one choice for each credit of each card, default No */
  vaultStore(c).cards.length = 0;
  const near = (a, b) => Math.abs(a - b) < 0.005,
    m0 = vaultMoves(c, T).find(m => m.o.id === "chase-sapphire-preferred");
  chk(
    "credits are not counted by default",
    m0 &&
      m0.net === 750 - 95 &&
      vaultFee1(sp, 0) === 95 &&
      vaultFee1(sp, true) === 0 &&
      vaultCreditsUsed(vaultCred(c), sp) === 0
  );
  X("vaultcard", "chase-sapphire-preferred");
  chk(
    "the sheet of the card asks Would you use this? for each credit with a dollar value, and has Count all and Count none",
    (ov().match(/Would you use this\?/g) || []).length === 2 &&
      (ov().match(/data-a="vaultcred"/g) || []).length === 4 &&
      ov().includes('data-a="vaultcredall" data-v="chase-sapphire-preferred" data-k="1"') &&
      ov().includes('data-k="0">Count none')
  );
  X("vaultcred", "chase-sapphire-preferred", "1", { t: "1" });
  chk(
    "Yes on the $30 credit: stored in c.x.vault.cred, and only that credit comes off the fee",
    c.x.vault.cred["chase-sapphire-preferred"][1] === true &&
      vaultCreditsUsed(vaultCred(c), sp) === 30 &&
      vaultMoves(c, T).find(m => m.o.id === "chase-sapphire-preferred").net === 750 - 65 &&
      ov().includes("You count <b>$30</b> of $130 a year") &&
      clean(ov()),
    junk(ov())
  );
  X("vaultcredall", "chase-sapphire-preferred", "1");
  chk(
    "Count all: $130 counted, and the fee does not go under 0",
    vaultCreditsUsed(vaultCred(c), sp) === 130 &&
      vaultMoves(c, T).find(m => m.o.id === "chase-sapphire-preferred").net === 750 &&
      !c.x.vault.cred["chase-sapphire-preferred"][2]
  );
  chk(
    "the choice is for that card only",
    vaultMoves(c, T).every(m => m.o.id === "chase-sapphire-preferred" || m.net === vaultNet(m.o, 0))
  );
  const B = vaultBook(c),
    val = id => (B.rows.find(r => r.id === id) || {}).v;
  chk(
    "the spreadsheet row follows: value - MAX(0, fee - credits)",
    val("vt_net") === val("vt_value") - Math.max(0, val("vt_fee1") - val("vt_credit")),
    JSON.stringify(B.rows.map(r => [r.id, r.v]))
  );
  X("vaultcred", "chase-sapphire-preferred", "1", { t: "0" });
  chk("No takes one credit out", vaultCreditsUsed(vaultCred(c), sp) === 100);
  X("vaultcredall", "chase-sapphire-preferred", "0");
  chk(
    "Count none: back to the fee in full",
    vaultCreditsUsed(vaultCred(c), sp) === 0 && vaultNet(sp, vaultCreditsUsed(vaultCred(c), sp)) === 655
  );
  X("close");
  /* limits and picks as numbers */
  const withLimit = L0.offers.filter(o => o.earn.rates.some(r => r.cap > 0)),
    withPick = L0.offers.filter(o => (o.earn.picks || []).length);
  chk(
    "limits and picks are numbers: 11 cards or more with a limit, 7 or more with a pick, each with its period",
    withLimit.length >= 11 &&
      withPick.length >= 7 &&
      L0.offers.every(o =>
        o.earn.rates
          .concat(o.earn.picks || [])
          .every(r => !r.cap || (r.cap > 0 && CARD_TEMPLATE.pers.some(q => q[0] === r.per)))
      ) &&
      L0.offers.every(o => (o.earn.picks || []).every(q => q.x > 0 && q.count >= 1 && q.from.length >= q.count)),
    withLimit.length + " " + withPick.length
  );
  const bcp = vaultOffer("amex-blue-cash-preferred"),
    cash = vaultOffer("usb-cash-plus"),
    marr = vaultOffer("chase-marriott-boundless"),
    cc = vaultOffer("citi-custom-cash"),
    go4 = vaultOffer("usb-altitude-go");
  chk(
    "the numbers of the limits by hand",
    bcp.earn.rates.find(r => r.cat === "groceries").cap === 6000 &&
      bcp.earn.rates.find(r => r.cat === "groceries").per === "year" &&
      cash.earn.picks[0].count === 2 &&
      cash.earn.picks[0].cap === 2000 &&
      cash.earn.picks[0].per === "quarter" &&
      cash.earn.picks[1].x === 2 &&
      cc.earn.picks[0].cap === 500 &&
      cc.earn.picks[0].per === "month" &&
      go4.earn.rates.find(r => r.cat === "dining").cap === 2000 &&
      go4.earn.rates.find(r => r.cat === "dining").per === "quarter" &&
      marr.earn.picks[0].count === 3 &&
      marr.earn.picks[0].then === 2
  );
  chk(
    "a limit in plain words",
    vaultRateWords(
      bcp,
      bcp.earn.rates.find(r => r.cat === "groceries")
    ) === "6% on the first $6,000 each year, then 1%" &&
      vaultRateWords(
        sp,
        sp.earn.rates.find(r => r.cat === "dining")
      ) === "3x",
    vaultRateWords(bcp, bcp.earn.rates[0])
  );
  chk(
    "a pick in plain words, and categories with one limit together",
    vaultPickWords(cash, cash.earn.picks[0]).startsWith(
      "5% on the 2 categories you pick from: Phone plan, Streaming"
    ) &&
      vaultPickWords(cash, cash.earn.picks[0]).endsWith("(on the first $2,000 each quarter, then 1%)") &&
      vaultPickWords(cc, cc.earn.picks[0]).startsWith("5% on the 1 category you pick from: ") &&
      vaultPickWords(marr, marr.earn.picks[0]) ===
        "3x on Groceries, Gas and EV charging, Dining and takeout together, on the first $6,000 each year, then 2x",
    vaultPickWords(cash, cash.earn.picks[0]) + " | " + vaultPickWords(marr, marr.earn.picks[0])
  );
  X("vaultcard", "amex-blue-cash-preferred");
  chk(
    "the sheet of a card shows the limit",
    ov().includes("6% on the first $6,000 each year, then 1%") && clean(ov()),
    junk(ov())
  );
  X("vaultcard", "usb-cash-plus");
  chk(
    "the sheet of a card shows the pick",
    ov().includes("5% on the 2 categories you pick from:") && ov().includes("vaultpickrow") && clean(ov()),
    junk(ov())
  );
  X("close");
  /* the best card for each spending line. The budget: Food 1,500 and Fun 1,500, so 3,000 a month on a card. */
  const st0 = vaultCatStart(c);
  chk(
    "the categories start from the lines of the budget: Food 60 / 40, Fun 25 / 15 / 5, and the rest",
    st0.groceries === 900 &&
      st0.dining === 600 &&
      st0.online === 380 &&
      st0.travel === 230 &&
      st0.drugstore === 80 &&
      st0.gas === 0 &&
      st0.phone === 0 &&
      st0.other === 810,
    JSON.stringify(st0)
  );
  const K0 = vaultCats(c);
  chk(
    "the start adds up to the card spending, and it is a Guess",
    K0.sum === 3000 &&
      K0.budget === 3000 &&
      K0.diff === 0 &&
      K0.st === "Guess" &&
      K0.other === 810 &&
      K0.spend.groceries === 900 &&
      !("gas" in K0.spend)
  );
  /* by hand: groceries 10,800 a year: 6,000 at 6% and 4,800 at 1% = 408. All other lines 25,200 at 1% = 252. */
  const eB = vaultEarn(bcp, K0, 0);
  chk(
    "one cash card by hand, with its limit: $660 a year, $565 after the $95 fee",
    near(eB.dollars, 660) && near(eB.by.groceries, 408) && near(eB.by.dining, 72) && eB.fee === 95 && near(eB.net, 565),
    JSON.stringify(eB.by)
  );
  /* by hand: dining 7,200 at 3x = 21,600 points, travel 2,760 at 2x = 5,520, the rest 26,040 at 1x. 53,160 points at 1 cent. */
  const eS = vaultEarn(sp, K0, 0);
  chk(
    "one points card by hand: 53,160 points at the floor of 1 cent",
    near(eS.dollars, 531.6) &&
      near(eS.by.dining, 216) &&
      near(eS.by.travel, 55.2) &&
      near(eS.by.groceries, 108) &&
      near(eS.net, 436.6),
    JSON.stringify(eS.by)
  );
  chk(
    "a credit that the player counts comes off the yearly fee of the card",
    near(vaultEarn(sp, K0, 30).net, 531.6 - 65) && near(vaultEarn(sp, K0, 130).net, 531.6)
  );
  const qCard = {
    id: "q",
    bank: "Q",
    n: "Quarter",
    unit: "cash",
    fee: 0,
    earn: { base: 1, rates: [{ cat: "dining", x: 4, cap: 2000, per: "quarter", then: 1 }], picks: [] },
  };
  chk(
    "a limit for each quarter by hand: 7,200 of dining is under 8,000, so 4% on all of it",
    near(vaultEarn(qCard, K0, 0).by.dining, 288)
  );
  chk(
    "over the limit: 12,000 of dining is 8,000 at 4% and 4,000 at 1%",
    near(vaultEarn(qCard, { spend: { dining: 1000 }, other: 0 }, 0).dollars, 360)
  );
  const pCard = {
    id: "p",
    bank: "P",
    n: "Pick",
    unit: "cash",
    fee: 0,
    earn: {
      base: 1,
      rates: [],
      picks: [{ x: 5, count: 1, from: ["dining", "groceries"], cap: 500, per: "month", then: 1 }],
    },
  };
  chk(
    "a pick by hand: it goes to groceries, the bigger line: 6,000 at 5% and 4,800 at 1%",
    near(vaultEarn(pCard, K0, 0).by.groceries, 348) && near(vaultEarn(pCard, K0, 0).by.dining, 72)
  );
  const B0 = vaultBest(c, T);
  chk(
    "with no card in the vault: no number for your cards, and a best single card from the library",
    B0.yours === null &&
      B0.held.length === 0 &&
      B0.suggest &&
      B0.single &&
      B0.rows.every(r => r.mine === null && r.lib && r.lib.year > 0) &&
      B0.st === "Guess"
  );
  chk(
    "the best single card is the one with the most a year after its fee",
    L0.offers.every(
      o => o.biz || !L0.units[o.unit].cash || VAULT_SCORE[o.min] > 3 || vaultEarn(o, K0, 0).net <= B0.single.net + 1e-9
    ),
    B0.single.o.id
  );
  vaultStore(c).cards.push({
    id: "chase-sapphire-preferred",
    n: "Sapphire Preferred",
    bank: "Chase",
    ym: "2026-01",
    fee: 95,
    months: 3,
  });
  const B1 = vaultBest(c, T);
  chk(
    "one card held: your cards earn 531.60 less the 95 fee",
    near(B1.gross, 531.6) && B1.fees === 95 && near(B1.yours, 436.6) && B1.single.o.id !== "chase-sapphire-preferred"
  );
  vaultStore(c).cards.push({
    id: "amex-blue-cash-preferred",
    n: "Blue Cash Preferred",
    bank: "American Express",
    ym: "2026-02",
    fee: 95,
    months: 6,
  });
  const B2 = vaultBest(c, T),
    rowOf = k => B2.rows.find(r => r.k === k);
  /* dining 216 (Sapphire), groceries 408 (Blue Cash), online 45.60, travel 55.20 (Sapphire), drugstore 9.60, other 97.20 */
  chk(
    "two cards held: each line goes on the card that earns most there",
    rowOf("dining").mine.o.id === "chase-sapphire-preferred" &&
      near(rowOf("dining").mine.year, 216) &&
      rowOf("groceries").mine.o.id === "amex-blue-cash-preferred" &&
      near(rowOf("groceries").mine.year, 408) &&
      rowOf("travel").mine.o.id === "chase-sapphire-preferred" &&
      near(B2.gross, 831.6) &&
      B2.fees === 190 &&
      near(B2.yours, 641.6),
    B2.gross + " " + B2.fees
  );
  chk(
    "a held card is not the card of the library for a line",
    B2.rows.every(r => !r.lib || !["chase-sapphire-preferred", "amex-blue-cash-preferred"].includes(r.lib.o.id))
  );
  X("vault");
  chk(
    "the vault shows the block: the tile, a row for each line, the meter",
    ov().includes("Best card for each spending line") &&
      ov().includes("Your cards earn about") &&
      ov().includes("$642") &&
      ov().includes("after $190 of yearly fees") &&
      ov().includes("The best single card you do not hold") &&
      ov().includes("Yours: Chase Sapphire Preferred, $216 a year") &&
      ov().includes("Yours: American Express Blue Cash Preferred, $408 a year") &&
      ov().includes("Your categories add up to <b>$3,000</b> a month") &&
      ov().includes("They match.") &&
      ov().includes("term:vt_best") &&
      ov().includes("term:vt_cats") &&
      clean(ov()),
    junk(ov())
  );
  chk(
    "the questions of the categories are closed at first",
    !ov().includes('data-k="vault|cat_dining"') && ov().includes('data-a="vaultcats" data-v="1"')
  );
  X("vaultcats", "1");
  chk(
    "open: one row of chips for each of the 10 categories, with Guess / Close / Exact and the typed option",
    VAULT_CATS.length === 10 &&
      VAULT_CATS.every(
        k =>
          ov().includes('data-a="kitset" data-k="vault|cat_' + k + '"') &&
          ov().includes('data-a="kitpad" data-k="vault|cat_' + k + '"')
      ) &&
      ov().includes("kitsure") &&
      !ov().includes("<input") &&
      clean(ov()),
    junk(ov())
  );
  X("kitset", "300", "vault|cat_dining", { t: "n" });
  const K1 = vaultCats(c);
  chk(
    "a tap on a chip is the answer of the player, stored as { v, cf }",
    c.x.vault.cat_dining.v === 300 &&
      c.x.vault.cat_dining.cf === 2 &&
      K1.rows[0].given &&
      K1.sum === 2700 &&
      K1.diff === -300
  );
  chk(
    "the meter says what is in no category, with no verdict",
    ov().includes("$300 of your card spending is in no category yet.") &&
      !/\b(bad|wrong|too (much|little)|overspen)/i.test(ov())
  );
  chk(
    "the row of dining follows: 3,600 a year at 3x",
    near(vaultBest(c, T).rows.find(r => r.k === "dining").mine.year, 108)
  );
  X("kitset", "1200", "vault|cat_dining", { t: "n" });
  chk(
    "more than the budget shows as more, also with no verdict",
    vaultCats(c).diff === 600 && ov().includes("$600 more than your card spending.")
  );
  VAULT_CATS.forEach(k => {
    kitStore(c, "vault")["cat_" + k] = { v: vaultCats(c).rows.find(r => r.k === k).v, cf: 3 };
  });
  kitStore(c, "vault").spend = { v: 3000, cf: 3 };
  chk("Guess, Close, Exact follow the inputs", vaultBest(c, T).st === "Exact");
  VAULT_CATS.forEach(k => delete kitStore(c, "vault")["cat_" + k]);
  delete kitStore(c, "vault").spend;
  const B3 = vaultBook(c),
    v3 = id => (B3.rows.find(r => r.id === id) || {}).v;
  chk(
    "the spreadsheet rows: the 10 categories, their sum, your cards after fees, the best single card",
    VAULT_CATS.every(k => v3("vt_c_" + k) === vaultCats(c).rows.find(r => r.k === k).v) &&
      v3("vt_csum") === 3000 &&
      v3("vt_gross") === 831.6 &&
      v3("vt_heldfees") === 190 &&
      near(v3("vt_yours"), 641.6) &&
      v3("vt_single") === Math.round(B2.single.net * 100) / 100,
    JSON.stringify(B3.rows.slice(-6).map(r => [r.id, r.v]))
  );
  /* high-interest debt: your cards still show, and no card of the library is named */
  c.debts.push(R0({ k: "Credit card balance", amt: 4000, high: true, apr: "15% to 25%", rate: 22, pay: 120 }));
  syncAll(c);
  const B4 = vaultBest(c, T);
  X("vault");
  chk(
    "with high-interest debt: no new card is named in the block",
    c.high === "yes" &&
      !B4.suggest &&
      B4.single === null &&
      B4.rows.every(r => r.lib === null && r.mine) &&
      near(B4.yours, 641.6) &&
      ov().includes("New cards wait while you have high-interest debt") &&
      !ov().includes("The best single card you do not hold") &&
      !ov().includes("In the library:") &&
      clean(ov()),
    junk(ov())
  );
  c.debts.length = 0;
  syncAll(c);
  vaultStore(c).cards.length = 0;
  X("close");
  const src =
    require("fs").readFileSync(GAME_DIR + "features/vault.js", "utf8") +
    require("fs").readFileSync(GAME_DIR + "data/cards2026.js", "utf8");
  chk("style: no em dash in the vault or the library", !src.includes(String.fromCharCode(8212)));
  G.chars.length = n0;
  G.active = 0;
  save();
}
