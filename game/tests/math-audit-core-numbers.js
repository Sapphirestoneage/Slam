/* ============================================================================
   SLAM the Game, test: tests/math-audit-core-numbers.js
   PURPOSE     The math audit of the core numbers. Each number is worked out a second way (by hand, or
               with a closed formula that the game does not use) and compared with the game: the FI
               number, the Coast FI number, the debt payoff, and the runway.
   INPUT       The game scripts, loaded by harness.cjs. Sample profiles with round numbers.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: core/engine.js (derive, fiNeed, survival), features/debts.js
               (dbPlan), features/drills.js (ldOf).
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    mk = o =>
      Object.assign(
        newChar(),
        {
          name: "Audit",
          led: true,
          placed: true,
          age: 30,
          ret: 60,
          home: "Renting",
          work: "Established",
          x: { ss: 0 },
        },
        o
      ),
    near = (a, b, t) => Math.abs(a - b) <= (t == null ? 0.5 : t);
  G.demo = false;
  /* 1. THE FI NUMBER. Spending $3,000 a month, no Social Security counted, no pension.
     By hand: 3,000 x 12 = 36,000 a year. 36,000 / 4% = 900,000. */
  const a = mk({
    take: 4000,
    spend: 3000,
    inv: 50000,
    incs: [R0({ k: "A main job", amt: 4000 })],
    spends: [R0({ k: "Home", amt: 2000 }), R0({ k: "Food", amt: 1000 })],
    cashes: [R0({ k: "Checking", amt: 6000 })],
    invs: [R0({ k: "IRA or Roth IRA", amt: 50000 })],
    debts: [],
  });
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  const d = derive(a);
  chk("FI number: yearly spending / 4% = 900,000", near(d.fi, 900000) && near(d.fiBase, 900000), d.fi);
  chk("the yearly spending behind it: 36,000", d.fiSpend === 36000);
  /* 2. COAST FI. The amount that grows to 900,000 by age 60 with no more saving, at 7% a year for 30 years.
     By hand: 1.07^30 = 7.612255. 900,000 / 7.612255 = 118,230. */
  chk("Coast FI: 900,000 / 1.07^30 = 118,230", near(d.coastNum, 118230, 1), d.coastNum);
  chk("the growth the other way: 118,230 x 1.07^30 is 900,000", near(d.coastNum * Math.pow(1.07, 30), 900000, 1));
  chk("the savings rate: (4,000 - 3,000) / 4,000 = 25%", near(d.rate, 0.25, 1e-9));
  /* 3. DEBT PAYOFF. One debt: $1,000 at 12% a year (1% a month), $100 a month.
     Closed formula for the balance after k payments: B x 1.01^k - 100 x (1.01^k - 1) / 0.01.
     After 10 payments: 1,000 x 1.104622 - 100 x 10.46221 = 58.40. Month 11: 58.40 x 1.01 = 58.98, the last payment.
     Paid in total: 1,058.98. Interest: 58.98. Months: 11. */
  const b = mk({ debts: [R0({ k: "Credit card balance", amt: 1000, rate: 12, pay: 100, high: true })] });
  syncAll(b);
  const P = dbPlan(b, "avalanche", 0),
    r10 = Math.pow(1.01, 10),
    bal10 = 1000 * r10 - (100 * (r10 - 1)) / 0.01,
    interest = 10 * 100 + bal10 * 1.01 - 1000;
  chk("debt payoff: 11 months", P.months === 11, P.months);
  chk(
    "debt payoff: interest 58.98, from the closed formula",
    near(P.interest, interest, 0.01) && near(P.interest, 58.98, 0.01),
    P.interest
  );
  /* At 0%: $1,200 at $100 a month is 12 months and no interest. */
  const z = mk({ debts: [R0({ k: "Owed to family or friends", amt: 1200, rate: 0, apr: "No interest", pay: 100 })] });
  syncAll(z);
  const Pz = dbPlan(z, "avalanche", 0);
  chk(
    "debt payoff at 0%: 12 months, no interest",
    Pz.months === 12 && near(Pz.interest, 0, 1e-9),
    JSON.stringify([Pz.months, Pz.interest])
  );
  /* Extra money: $1,000 at 12% with $100 + $100 extra. After 5 payments: 1,000 x 1.05101 - 200 x 5.10101 = 30.81. Month 6 ends it. */
  chk("debt payoff with $100 extra: 6 months", dbPlan(b, "avalanche", 100).months === 6);
  /* Two debts: the highest rate first never costs more interest than the smallest balance first. */
  const two = mk({
    debts: [
      R0({ k: "Credit card balance", amt: 3000, rate: 24, pay: 90, high: true }),
      R0({ k: "Car loan", amt: 1000, rate: 6, pay: 60 }),
    ],
  });
  syncAll(two);
  const av = dbPlan(two, "avalanche", 100),
    sn = dbPlan(two, "snowball", 100);
  chk(
    "two debts: highest rate first costs no more than smallest balance first",
    av.interest <= sn.interest + 1e-9 && av.months > 0 && sn.months > 0,
    JSON.stringify([av.interest, sn.interest])
  );
  chk("two debts: each plan pays the same money each month", av.paying === 250 && sn.paying === 250);
  /* 4. RUNWAY. Pay 2,000, spending 3,000, cash 6,000. Short 1,000 a month. 6,000 / 1,000 = 6 months. */
  const s = mk({
    take: 2000,
    spend: 3000,
    incs: [R0({ k: "A main job", amt: 2000 })],
    spends: [R0({ k: "Home", amt: 2000 }), R0({ k: "Food", amt: 1000 })],
    cashes: [R0({ k: "Checking", amt: 6000 })],
  });
  syncAll(s);
  const sv = survival(s, derive(s));
  chk(
    "runway while spending is over pay: cash / the shortfall = 6 months",
    !!sv && sv.short === 1000 && near(sv.runway, 6, 1e-9),
    JSON.stringify(sv)
  );
  /* If the pay stopped: cash 6,000 / spending 3,000 = 2 months. */
  const L = ldOf(a, d, "full");
  chk(
    "runway if the pay stopped: cash / spending = 2 months",
    near(L.cashMo, 2, 1e-9) && L.need === 3000,
    JSON.stringify([L.cashMo, L.need])
  );
  chk(
    "months of cushion on the reveal use the same division",
    near(elStats(a, d).find(x => x.id === "cushion").v, 2, 1e-9)
  );
  /* Found by the second engine (tools/audit, Nov 26 2026). (1) A month of growth is 1.07 to the power 1/12: twelve
     months make 7%, not the 7.23% of 7% / 12. (2) One rate for a debt everywhere. */
  chk("twelve months of RM make exactly 7%", near(Math.pow(1 + RM, 12), 1.07, 1e-12), RM);
  const one = (o, r, real) => {
    const x = Object.assign({ k: "Personal loan", amt: 1000, high: true }, o),
      a1 = debtRate(x),
      b1 = dbRate(x);
    return a1.r === r && b1.v === r && a1.real === real;
  };
  chk("a typed rate counts with no band, in the planner and everywhere", one({ rate: 9.9 }, 9.9, true));
  chk("8% to 15% is 11.5% in both places", one({ apr: "8% to 15%" }, 11.5, true));
  chk("a typed rate wins over the band", one({ apr: "Over 25%", rate: 26.5 }, 26.5, true));
  chk(
    "the one guess: heavy 20%, other 5%, payday 300%, family or medical 0%",
    one({}, 20, false) &&
      one({ high: false }, 5, false) &&
      one({ k: "Payday loan" }, 300, false) &&
      one({ k: "Medical bills" }, 0, false)
  );
  chk(
    "a heard rate (a live session, level 0) is not the player's own yet",
    debtRate({ k: "Car loan", rate: 7, ratecf: 0 }).real === false &&
      dbRate({ k: "Car loan", rate: 7, ratecf: 0 }).cf === 0
  );
  const tl = mk({
    debts: [R0({ k: "Personal loan", amt: 10000, rate: 9.9, high: true })],
    invs: [],
    incs: [R0({ k: "A main job", amt: 4000 })],
  });
  syncAll(tl);
  chk(
    "the time ledger and the debt plan use the same typed rate",
    near(timeLedger(tl, derive(tl)).dy, 990, 1e-9) && near(dbPlan(tl, "avalanche", 0).debts[0].apr, 0.099, 1e-12)
  );
  G.chars.length = n0;
  G.active = 0;
  save();
}
