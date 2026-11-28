/* ============================================================================
   SLAM the Game, test: tests/pays-for-itself.js
   PURPOSE     Examine "Pays for itself" (run CC-1, item 21): only a coach sees it (a player has no
               row, no menu line, and the action does nothing); the three parts come from their own
               engines; a part that was not found is "Not found yet" and is not counted; with no fee
               set there is no headline number; with a fee the headline is the sum next to the fee.
   INPUT       The game scripts, loaded by harness.cjs. The sample game. A coach is a stand-in:
               SUPA.as is set by the test, with no sign-in.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/paysitself.js, core/coachfee.js, data/offer.js.
   ========================================================================= */
{
  const { execFileSync } = require("child_process");
  const G0 = G,
    as0 = SUPA.as,
    role0 = SUPA.asRole,
    fee0 = COACH_OFFER.fee,
    roles0 = Object.assign({}, ROLES);
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
    X("close");
    W = null;
    const c = C();
    if (costly)
      c.debts.push({
        k: "Credit card balance",
        amt: 8000,
        high: true,
        apr: "15% to 25%",
        rate: 22,
        pay: 200,
        s: true,
        cf: 3,
      });
    G.tourSeen = true;
    tab = "home";
    render();
    return c;
  };
  const coach = on => {
    SUPA.as = on ? "made-up-client" : null;
    SUPA.asRole = on ? "coach" : null;
    G.demo = !on;
    render();
  };
  const text = h => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  /* 0. THE GAME'S COPY OF THE MATH IS CURRENT, AND THE FEE IS A SETTING THAT IS EMPTY */
  let stale = "";
  try {
    execFileSync(process.execPath, [GAME_DIR + "../tools/game_coachfee_build.mjs", "--check"], { encoding: "utf8" });
  } catch (e) {
    stale = String(e.stdout || e.message);
  }
  chk("core/coachfee.js matches js/math/coachfee.js", stale === "", stale);
  chk(
    "the fee is one named setting, empty until the owner fills it",
    Object.keys(COACH_OFFER).includes("fee") && fee0 === null
  );
  chk(
    "no value of the offer is filled in code",
    Object.values(COACH_OFFER).every(v => v === null)
  );

  /* 1. A PLAYER NEVER SEES IT */
  let c = fresh1(false);
  chk("a player is not a coach", !pfiCan());
  chk("Home of a player has no row", !/data-a="pfi"/.test(app()));
  X("pfi");
  chk("the action does nothing for a player", !W || W.kind !== "pfi");
  chk("the menu of a player has no line", !menuItems().some(m => m[1] === "pfi"));
  chk(
    "the row is a coach row by rule",
    RO_ONLY.pfi === "coach" && MENU_GROUPS.find(g => g[0] === "coach")[3].includes("pfi")
  );

  /* 2. A COACH IN THE GAME OF A CLIENT: NO FEE SET */
  coach(true);
  chk("a coach in the game of a client may see it", pfiCan());
  chk(
    "Home has the row, and says only the coach sees it",
    /data-a="pfi"/.test(app()) && /Only you see this/.test(app())
  );
  X("pfi");
  let h = ov(),
    R = pfiRead(c);
  chk("the screen opens", W && W.kind === "pfi" && /Pays for itself/.test(h), JSON.stringify(W) + h.slice(0, 900));
  chk(
    "three parts, each with an i",
    R.parts.map(p => p.id).join() === "fees,bonus,interest" &&
      ["pfifees", "pfibonus", "pfiinterest"].every(k => h.includes("term:" + k))
  );
  chk(
    "no fee set: no headline number, and it says what it needs",
    !R.R.ready &&
      /No headline number yet\./.test(h) &&
      /It needs the coaching fee\./.test(text(h)) &&
      /placeholder until Eli sets it/.test(h)
  );
  chk("no times and no net are worked out", R.R.net === null && R.R.times === null && !/times the fee/.test(h));
  const fees = R.parts[0],
    bonus = R.parts[1],
    intr = R.parts[2];
  chk(
    "fees from typical funds are a guess: Not found yet, not $0",
    mixCalc(c).st === "Guess" && fees.amount === null && /data-pfp="fees"[\s\S]*?Not found yet/.test(h)
  );
  const rk = stgRank(c),
    want = ["bank", "welcome"]
      .map(id => rk.find(r => r.S.id === id))
      .filter(r => r.V.v === "fits")
      .reduce((t, r) => t + Math.max(0, r.F.value) * 12, 0);
  chk(
    "the bonuses are the two moves of the Strategy Engine, for one year",
    bonus.amount === want && want > 0 && bonus.st === "Guess"
  );
  chk(
    "no debt listed: interest saved is a real $0, with the reason",
    intr.amount === 0 && /No debt is listed/.test(intr.note)
  );
  chk(
    "the total leaves the missing part out and says so",
    R.R.total === want &&
      R.R.missing.join() === "Fees found (X-ray)" &&
      text(h).includes("At least " + money(Math.round(want)))
  );
  chk(
    "Show the math is closed, and one button is filled",
    /<details class="math"/.test(h) &&
      !/<details class="math" open/.test(h) &&
      (h.match(/class="primary/g) || []).length === 1
  );
  chk(
    "each part has a button to its tool",
    ["mix", "strat", "debtplan"].every(a => new RegExp('data-a="' + a + '"').test(h))
  );
  chk(
    "the screen shows no defect and no verdict word",
    clean(h) && !/\b(mistake|failed|behind|off track|guarantee)\b/i.test(text(h)),
    junk(h)
  );
  X("close");

  /* 3. THE FEE IS SET: ONE HEADLINE NUMBER */
  COACH_OFFER.fee = 500;
  X("pfi");
  h = ov();
  R = pfiRead(c);
  chk(
    "with a fee the headline is ready",
    R.R.ready && R.R.fee === 500 && R.R.net === want - 500 && Math.abs(R.R.times - want / 500) < 1e-9
  );
  chk(
    "the headline shows the sum next to the fee",
    text(h).includes("At least " + money(Math.round(want))) &&
      text(h).includes("next to your fee of " + money(500)) &&
      /times the fee/.test(h)
  );
  chk(
    "a sum under the fee is said plainly",
    (() => {
      COACH_OFFER.fee = 1000000;
      drawSheet();
      const t = text(ov());
      COACH_OFFER.fee = 500;
      return /less than the fee/.test(t) && !/\b(bad|poor|not worth)\b/i.test(t);
    })()
  );
  X("close");

  /* 4. A CLIENT WITH COSTLY DEBT */
  coach(false);
  c = fresh1(true);
  coach(true);
  R = pfiRead(c);
  chk(
    "costly debt: the bonuses wait, a known $0 with the reason",
    R.parts[1].amount === 0 && /waits/.test(R.parts[1].note) && /Clear it first/.test(R.parts[1].note)
  );
  chk(
    "no extra on the Debt plan yet: interest saved is Not found yet",
    R.parts[2].amount === null && /no extra amount a month yet/.test(R.parts[2].note)
  );
  c.x.dplan = { extra: 200, order: "avalanche" };
  R = pfiRead(c);
  const p0 = dbPlan(c, "avalanche", 0),
    p1 = dbPlan(c, "avalanche", 200);
  chk(
    "with an extra: the interest of the plan without it, less the interest with it",
    p0.months != null && Math.abs(R.parts[2].amount - (p0.interest - p1.interest)) < 1e-6 && R.parts[2].amount > 0
  );
  chk(
    "the total is the parts that were found",
    Math.abs(R.R.total - (R.parts[1].amount + R.parts[2].amount)) < 1e-6 && R.R.ready
  );
  X("pfi");
  h = ov();
  chk(
    "the screen of this client shows the interest saved",
    text(h).includes(money(Math.round(p0.interest - p1.interest))) && clean(h),
    junk(h)
  );
  X("close");

  /* 5. A COACH IN THEIR OWN GAME HAS THE MENU LINE */
  coach(false);
  ROLES.coach = true;
  chk("an account with the coach role has the menu line", menuItems().some(m => m[1] === "pfi") && pfiCan());
  Object.assign(ROLES, roles0);
  COACH_OFFER.fee = fee0;
  SUPA.as = as0;
  SUPA.asRole = role0;
  G = G0;
}
