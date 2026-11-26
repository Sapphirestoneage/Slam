/* ============================================================================
   SLAM the Game, test: tests/hard-moments.js
   PURPOSE     Examine Hard moments (run Not built, groups 1 to 5, Part 7). A made-up player: the copy
               of core/hardcore.js is current (js/math/hard.js and data/sources/hard-2026.json); every
               help line has a source, a link and a date; nothing is kept until Keep this is on (the
               profile has no c.x.hard), and turning it off takes the kept copy away; a coach or an
               admin who opens the game sees a private tile unless the player let the coach in;
               untangling (what each person ends up with, the debts still in both names); a roommate
               leaving on rowShare; the words to copy with the player's numbers; Leave this page goes
               to the neutral site with location.replace; every tab draws clean with no blame words;
               the row under Break in case of emergency; the spreadsheet rows only when kept; the menu
               and the built list row.
   INPUT       The game scripts, loaded by harness.cjs. Made-up profiles.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: core/hardcore.js, features/hard.js, features/transit.js,
               features/book.js, features/exletter.js.
   ========================================================================= */
{
  const fs = require("fs"),
    path = require("path"),
    cp = require("child_process");
  let stale = false;
  try {
    cp.execFileSync("node", [path.join(GAME_DIR, "..", "tools", "game_hard_build.mjs"), "--check"], { stdio: "pipe" });
  } catch (e) {
    stale = true;
  }
  chk("core/hardcore.js is a current copy (node tools/game_hard_build.mjs)", !stale);
  const ref = JSON.parse(fs.readFileSync(path.join(GAME_DIR, "..", "data", "sources", "hard-2026.json"), "utf8"));
  chk("HM_REF is the dated data file", HM_REF.checked === ref.checked && /^\d{4}-\d\d-\d\d$/.test(HM_REF.checked));
  chk(
    "every help line has a source, its own page and a date",
    Object.values(HM_REF.lines).every(L => L.source && /^https:\/\//.test(L.url) && L.checked)
  );
  chk(
    "every fact a step leans on has a source and a date",
    Object.values(HM_REF.tools).every(T =>
      (T.steps || []).every(
        s => !s.fact || (HM_REF.facts[s.fact] && HM_REF.facts[s.fact].url && HM_REF.facts[s.fact].checked)
      )
    )
  );

  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r);
  const c = Object.assign(newChar(), {
    name: "Noor",
    placed: true,
    incs: [R0({ k: "A main job", amt: 3800 })],
    spends: [R0({ k: "Home", amt: 1500 }), R0({ k: "Food", amt: 500 })],
    cashes: [R0({ k: "Checking", amt: 2500 })],
    invs: [],
    debts: [],
    debt: 0,
    take: 3800,
    spend: 3000,
    inv: 0,
  });
  G.chars.push(c);
  G.active = G.chars.length - 1;
  syncAll(c);
  G.demo = false;

  /* 1. nothing kept by default */
  X("hard", "untangle");
  chk("the sheet opens on Untangle", W && W.kind === "hard" && W.tab === "untangle");
  X("hmadd", "Joint checking", "have");
  X("hmadd", "A credit card", "owe");
  X("hmset", "5000", "untangle|item0.amount");
  X("hmset", "split", "untangle|item0.plan");
  X("hmset", "1000", "untangle|item1.amount");
  X("hmset", "them", "untangle|item1.plan");
  chk("the answers are on the screen", (W.o.untangle.items || []).length === 2);
  chk("nothing is in the profile until Keep this is on", !(c.x && c.x.hard));
  let h = ov();
  chk("the sheet has Leave this page", /data-a="hmexit"/.test(h) && h.includes(HM_REF.exit.label));
  chk("you end up with half the checking: $2,500", h.includes(money(2500)));
  chk("the card left to them stays in both names", /In both names/.test(h) && h.includes(money(1000)));
  const U = hmUntangle(W.o.untangle.items);
  chk(
    "untangling: mine 2500, theirs 2500 - 1000",
    U.mine.net === 2500 && U.theirs.net === 1500 && U.stillBoth.length === 1
  );
  chk("the spreadsheet has no rows while nothing is kept", hmBook(c) === null);

  /* 2. keep on, keep off */
  X("hmkeep", "1", "untangle");
  chk(
    "Keep this on: the tool is kept, the coach switch off",
    c.x.hard.untangle.keep === true && c.x.hard.untangle.coach === false
  );
  chk("the kept copy has the list", c.x.hard.untangle.items.length === 2);
  chk("the spreadsheet rows come from the kept list", hmBook(c).rows.find(r => r.id === "hm_net").v === 2500);
  X("hmkeep", "0", "untangle");
  chk("Keep this off: the kept copy is gone from the profile", !(c.x.hard && c.x.hard.untangle));
  chk("and the list stays on the screen until the sheet closes", W.o.untangle.items.length === 2);

  /* 3. a coach who opens the game */
  X("hmkeep", "1", "untangle");
  sessionStorage = { getItem: k => (k === "su_as" ? "someone" : null) };
  X("hard", "untangle");
  h = ov();
  chk("a coach sees a private tile, not the list", /private to the player/.test(h) && !h.includes(money(2500)));
  X("hmcoach", "1", "untangle");
  chk("a coach cannot turn the coach switch on", c.x.hard.untangle.coach === false);
  delete global.sessionStorage;
  X("hard", "untangle");
  X("hmcoach", "1", "untangle");
  sessionStorage = { getItem: k => (k === "su_as" ? "someone" : null) };
  X("hard", "untangle");
  h = ov();
  chk("with Let my coach see this on, the coach sees it", /lets you see this/.test(h) && h.includes(money(2500)));
  delete global.sessionStorage;

  /* 4. a roommate leaving, on rowShare */
  X("hard", "roomexit");
  ["3000|rent", "300|bills", "3|people", "6|monthsLeft", "2|cover", "3000|deposit"].forEach(p => {
    const [v, k] = p.split("|");
    X("hmset", v, "roomexit|" + k);
  });
  const Rx = hmRoommateExit(
    {
      rent: 3000,
      bills: 300,
      how: "equal",
      leaver: "P2",
      monthsLeft: 6,
      cover: 2,
      deposit: 3000,
      people: [{ id: "Me" }, { id: "P2" }, { id: "P3" }],
    },
    rowShare
  );
  chk("you pay 1,100 for 2 months, then 1,650 for 4: 8,800", Rx.rows[0].toEnd === 8800);
  chk("the whole lease is paid", Math.abs(Rx.total - 3300 * 6) < 1e-9);
  h = ov();
  chk("the sheet shows your total to the end", h.includes(money(8800)));

  /* 5. words with your numbers, every tab clean */
  X("hard", "medical");
  X("hmset", "2500", "medical|balance");
  X("hmset", "50", "medical|monthly");
  h = ov();
  chk("the payment plan words carry your $50", h.includes("I can pay " + money(50) + " a month"));
  chk("an empty number reads in words, never a blank", h.includes("I can pay an amount in one payment"));
  for (const t of Object.keys(HM_REF.tools)) {
    X("hmtab", t);
    h = ov();
    chk("the " + t + " tab draws clean", clean(h), junk(h));
    chk(
      "the " + t + " tab has no blame words",
      !/\b(mistake|failed|behind|off track|should have|fault)\b/i.test(h.replace(/<[^>]+>/g, " "))
    );
    chk("the " + t + " tab names who can help with a date", /Checked on/.test(h));
  }
  X("hmtab", "safety");
  h = ov();
  chk(
    "the private plan has the hotline from its source",
    h.includes(HM_REF.lines.ndvh.call) && h.includes("tel:18007997233")
  );
  chk("the private plan says what it cannot hide", h.includes(HM_REF.tools.safety.cannot[1]));
  X("hmtab", "sayno");
  chk("saying no starts with the pause line of the money sins", /The pause line/.test(ov()));

  /* 6. Leave this page */
  let went = null;
  global.location = { replace: u => (went = u) };
  const body = { innerHTML: "x" };
  const doc0 = global.document;
  global.document = Object.assign({}, doc0, { body, title: "" });
  X("hmexit");
  chk(
    "Leave this page blanks the screen and replaces the page with the neutral site",
    went === HM_REF.exit.to && body.innerHTML === ""
  );
  global.document = doc0;
  delete global.location;

  /* 7. the row under Break in case of emergency, the menu and the built list */
  W = { kind: "transit", tab: "dip" };
  chk(
    "Break in case of emergency shows Other hard moments",
    /Other hard moments/.test(trSheet()) && /data-a="hard"/.test(trSheet())
  );
  chk(
    "the menu has Hard moments",
    MENU.some(m => m[1] === "hard")
  );
  const row = WB.find(r => /^Hard moments/.test(r[1]));
  chk("the built list row is built and its probe passes", row && row[2] === "b" && row[3]());

  G.chars.splice(n0);
  G.active = 0;
  W = null;
  save();
}
