/* ============================================================================
   SLAM the Game, test: tests/estate-and-marriage.js
   PURPOSE     Examine Estate and marriage (run Finish everything partly built, Part 11). A made-up
               player: the copy of core/estate.js is current (js/math/estate.js, spousalExcess, the
               estate rules and data/sources/estate-2026.json); every fact has a source, a link and a
               date; Estate basics ticks the same checklist as My plan on one page; the simulator (who
               gets what, the step-up, the 10-year line, the estate lines) by hand; the 10 years three
               ways with the game's tax engine; married or partners (single and joint, the partner cover,
               the spousal top-up); nothing is kept in the profile; every tab draws clean with no blame
               words and no em dash; the menu and the built list row.
   INPUT       The game scripts, loaded by harness.cjs. Made-up profiles.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: core/estate.js, features/estate.js, features/plan.js,
               features/retire.js.
   ========================================================================= */
{
  const fs = require("fs"),
    path = require("path"),
    cp = require("child_process");
  let stale = false;
  try {
    cp.execFileSync("node", [path.join(GAME_DIR, "..", "tools", "game_estate_build.mjs"), "--check"], {
      stdio: "pipe",
    });
  } catch (e) {
    stale = true;
  }
  chk("core/estate.js is a current copy (node tools/game_estate_build.mjs)", !stale);
  const ref = JSON.parse(fs.readFileSync(path.join(GAME_DIR, "..", "data", "reference-2026.json"), "utf8"));
  chk(
    "ES_RULES is the estate row of the reference data",
    JSON.stringify(ES_RULES) === JSON.stringify(ref.estate) && ES_SS.spousalShare === ref.socialSecurity.spousalShare
  );
  chk(
    "every fact has a source, its own page and a date",
    Object.values(ES_REF.facts).every(
      f => f.text && f.source && /^https:\/\//.test(f.url) && /^\d{4}-\d\d-\d\d$/.test(f.checked)
    )
  );

  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r);
  const c = Object.assign(newChar(), {
    name: "Ari",
    placed: true,
    incs: [R0({ k: "A main job", amt: 5000 })],
    spends: [R0({ k: "Home", amt: 1800 })],
    cashes: [R0({ k: "Checking", amt: 4000 })],
    invs: [],
    debts: [],
    debt: 0,
    take: 5000,
    spend: 3000,
    inv: 0,
  });
  G.chars.push(c);
  G.active = G.chars.length - 1;
  syncAll(c);
  G.demo = false;
  const blame = /\b(mistak(?:e|es|en|enly)|failed|behind|off[ -]track)\b/i;

  /* 1. estate basics: the same checklist as My plan on one page */
  X("estate");
  chk("the sheet opens on Estate basics", W && W.kind === "estate" && W.tab === "basics");
  let h = ov();
  chk("the basics show the papers and the lawyer line", /A will/.test(h) && h.includes(ES_REF.lawyer.slice(0, 30)));
  X("summaryestate", "will");
  chk("a tick lands on the plan's own checklist", !!c.x.summary.estate.will);
  h = ov();
  chk("and shows Done here", /Done ✓/.test(h) && /1 of 3/.test(h));

  /* 2. what your people receive */
  X("estab", "heirs");
  X("esadd", "Spouse|spouse", "person");
  X("esadd", "Friend|other", "person");
  X("esadd", "Brokerage|taxable", "item");
  X("esadd", "401(k) or IRA|pretax", "item");
  const O = W.o.h,
    [sp, fr] = O.people;
  X("esset", "100000", "value|0");
  X("esset", "0.5", "paid|0");
  X("esset", sp.id, "to|0");
  X("esset", fr.id, "to|0");
  X("esset", "250000", "value|1");
  X("esset", fr.id, "to|1");
  const S = esHeirs(
    { items: O.items, people: O.people, deathYear: new Date().getFullYear(), started: false },
    ES_RULES
  );
  const yr = new Date().getFullYear();
  chk(
    "each gets half the brokerage; the friend gets the 401(k)",
    S.people[0].gets === 50000 && S.people[1].gets === 300000
  );
  chk("the step-up wipes out 50,000 of gain, 25,000 each", S.erased === 50000 && S.people[1].erased === 25000);
  chk(
    "the friend's 401(k): the 10 years, to December 31 ten years on",
    S.people[1].rule === "ten" && S.people[1].lastYear === yr + 10
  );
  chk(
    "the spouse's part comes off the federal base",
    S.estate.fedBase === 300000 && S.estate.federal.state === "under"
  );
  h = ov();
  chk("the sheet shows what they receive and the step-up", h.includes(money(350000)) && h.includes(money(50000)));
  chk("nothing is kept in the profile", !(c.x && (c.x.estate || c.x.heirs)));

  /* the 10 years, three ways, on the game's tax engine */
  X("esset", "60000", "tenother");
  const T = esTenYear({ balance: 250000, growth: 0, other: 60000, status: "single", deathYear: yr }, esTaxOf),
    t = g => retireTax(g, 0, "single", "", 40).federal;
  chk(
    "spread over 10 years: 10 x (tax on 85,000 - tax on 60,000)",
    Math.abs(T.ways.even.tax - 10 * (t(85000) - t(60000))) < 1e-6
  );
  chk("all at once costs more than spread out", T.ways.first.tax > T.ways.even.tax && T.best === "even");
  h = ov();
  chk("the sheet shows the three ways", /Spread over the 10 years/.test(h) && h.includes(money(T.ways.even.tax)));
  X("esset", "yes", "started");
  h = ov();
  chk(
    "required withdrawals started: all in year 10 is not open",
    /Not open: a withdrawal comes out every year/.test(h)
  );

  /* 3. married or partners */
  X("estab", "married");
  X("esset", "90000", "pay|0");
  X("esset", "30000", "pay|1");
  X("esset", "3000", "pia|0");
  X("esset", "1000", "pia|1");
  X("esset", "0", "coverby");
  X("esset", "6000", "cover");
  const K = esCompare(
    {
      people: [
        { pay: 90000, pia: 3000 },
        { pay: 30000, pia: 1000 },
      ],
      cover: 6000,
      coverBy: 0,
    },
    { taxOf: esTaxOf, spousalOf: (a, b) => spousalExcess(a, b, ES_SS) }
  );
  chk(
    "single and joint from the game's tax engine",
    K.single[0] === t(90000) && K.joint === retireTax(120000, 0, "joint", "", 40).federal
  );
  chk("the partner cover is taxed as pay", Math.abs(K.coverTax - (t(96000) - t(90000))) < 1e-6);
  chk("the spousal top-up: half of 3,000 less 1,000 = 500", K.ss[1].spousal === 500 && K.ss[0].spousal === 0);
  h = ov();
  chk("the sheet shows the joint return and the New York list", h.includes(money(K.joint)) && /New York first/.test(h));

  /* every tab clean */
  ["basics", "heirs", "married"].forEach(tab => {
    X("estab", tab);
    const s = ov();
    chk(
      tab + ": no undefined, NaN, blame word or em dash",
      !/undefined|NaN/.test(s) && !s.includes(String.fromCharCode(0x2014)) && !blame.test(s)
    );
  });

  chk(
    "the menu has Estate and marriage",
    MENU.some(m => m[1] === "estate")
  );
  const row = WB.find(r => /^Estate and marriage/.test(r[1]));
  chk("the built list row is built and its probe passes", row && row[2] === "b" && row[3]());

  G.chars.splice(n0);
  G.active = 0;
  W = null;
  save();
}
