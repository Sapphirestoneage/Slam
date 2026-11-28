/* ============================================================================
   SLAM the Game, test: tests/assumptions.js
   PURPOSE     Examine Assumptions (run CC-1, item 14, Nov 27 2026): the main screens show no assumption
               outside "Show the math"; each "Show the math" ends with the two rates of the engine and the
               button Assumptions; the sheet lists each assumption with Usual or Yours and an "i"; a tap
               changes a field the engines already read, and the numbers move; "Back to the usual value";
               a fixed assumption has no chip and says so; the sheet returns to the sheet it came from;
               no button inside the opening; a player with costly debt.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. Made-up players.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/assume.js (AS_LIST, asRows, asVal, asUsual, asMine,
               asSet, asMathRow, asSheet, the actions), screens/ui.js (mathBox), core/engine.js (R, SWR,
               derive), core/paylayers.js (LY_END).
   ========================================================================= */
{
  const G0 = clone(G),
    text = h =>
      h
        .replace(/<svg[\s\S]*?<\/svg>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " "),
    item = (h, id) => (h.split('data-as="' + id + '"')[1] || "").split('data-as="')[0],
    fresh = debt => {
      G = clone(G0);
      G.demo = true;
      W = null;
      SH = null;
      X("start");
      if (debt) {
        sitApply("carddebt");
        X("cbset", "", "", { q: "age", i: 1 });
        X("sitok");
      } else {
        X("wnskip");
        X("cbset", "", "", { q: "age", i: 1 });
        X("cbset", "", "", { q: "spend", i: 2 });
        X("cbset", "", "", { q: "inv", i: 3 });
        X("cbset", "", "", { q: "save", i: 3 });
      }
      return C();
    };

  /* ---- 1. the table: no value of its own ---- */
  chk(
    "the list has the two rates, three answers of the player and the last age of the chart",
    AS_LIST.map(A => A.id).join(",") === "grow,take,ret,death,ss,end"
  );
  chk(
    "a fixed assumption reads the constant of the engine",
    asVal({}, "grow") === R && asVal({}, "take") === SWR && asVal({}, "end") === LY_END
  );
  const src = require("fs")
    .readFileSync(GAME_DIR + "features/assume.js", "utf8")
    .split("kitTerms(")[0];
  chk("the code of the file holds no rate of its own (no 0.07, no 0.04)", !/0\.07|0\.04\b/.test(src));
  chk(
    "each assumption has an i with words",
    AS_LIST.every(A => GLOSS[A.term] && GLOSS[A.term][1].length > 20)
  );
  chk(
    "the words are clean",
    !/—|mistake|failed|\bbehind\b|off track|should\b/.test(JSON.stringify(AS_LIST.map(A => [A.n, GLOSS[A.term]])))
  );

  /* ---- 2. Show the math: the line and the button; not inside the opening ---- */
  let c = fresh(false);
  chk(
    "inside the opening the line of Show the math has no button",
    /Assumes 7% growth a year and 4% taken out a year\./.test(asMathRow()) && !/data-a="assume"/.test(asMathRow())
  );
  X("cbgo", "next");
  X("cbgo", "stack");
  X("cbgo", "reveal");
  chk(
    "the reveal of the opening has no button Assumptions",
    !/data-a="assume"/.test(ov()) && /Assumes 7% growth/.test(ov())
  );
  X("close");
  X("gohome");
  let home = app();
  chk(
    "the Show the math boxes of Home end with the line and the button",
    (home.match(/class="row between asrow"/g) || []).length > 0 &&
      !/asrow/.test(home.replace(/<details class="math">[\s\S]*?<\/details>/g, " ")) &&
      /data-a="assume">Assumptions</.test(home)
  );
  chk(
    "outside Show the math, Home names no growth rate and no take-out rate",
    !/7% growth|4% taken out|Assumes/.test(text(home.replace(/<details class="math">[\s\S]*?<\/details>/g, " ")))
  );
  chk("mathBox calls the part by name", /typeof asMathRow === "function" \? asMathRow\(\) : ""/.test(String(mathBox)));

  /* ---- 3. the sheet, for a new player and for a player with costly debt ---- */
  [false, true].forEach(debt => {
    const who = debt ? "costly debt: " : "new player: ";
    c = fresh(debt);
    X("close");
    X("gohome");
    if (debt) chk(who + "the player has a credit card balance", c.debtKinds.includes("Credit card balance"));
    X("assume");
    let h = ov();
    chk(
      who + "the sheet opens with six rows",
      W.kind === "assume" && AS_LIST.every(A => h.includes('data-as="' + A.id + '"'))
    );
    chk(
      who + "each row has Usual or Yours and an i",
      AS_LIST.every(
        A =>
          /class="pill kitst">(Usual|Yours)</.test(item(h, A.id)) &&
          item(h, A.id).includes('data-k="term:' + A.term + '"')
      )
    );
    chk(
      who + "the two rates and the last age of the chart are shown, with no chip, and the sheet says why",
      ["grow", "take", "end"].every(
        id =>
          !/data-a="asset"/.test(item(h, id)) &&
          /Set by the game\. Your own value is not possible here yet\./.test(item(h, id))
      ) &&
        item(h, "grow").includes("<b>7%</b>") &&
        item(h, "take").includes("<b>4%</b>") &&
        item(h, "end").includes("<b>Age " + LY_END + "</b>")
    );
    chk(
      who + "the three answers of the player have chips to tap, and no box to type in",
      ["ret", "death", "ss"].every(id => /class="chip/.test(item(h, id))) && !/<input/.test(h)
    );
    chk(who + "clean words", !/undefined|NaN|\bnull\b|—/.test(text(h)), text(h).match(/undefined|NaN|\bnull\b/));
    /* a change */
    const ret0 = c.ret,
      d0 = derive(c),
      to = [45, 50, 55, 60, 65, 70].filter(x => x > c.age && x !== ret0).pop();
    chk(
      who + "the age work is optional starts as the usual value",
      asUsual(c, "ret") === Math.max(60, c.age + 5) && (ret0 !== asUsual(c, "ret")) === asMine(c, "ret")
    );
    X("asset", String(to), "ret");
    h = ov();
    chk(who + "a tap changes the field the engines read", c.ret === to && asVal(c, "ret") === to);
    chk(
      who + "the row is marked Yours, with Back to the usual value",
      asMine(c, "ret") === (to !== asUsual(c, "ret")) &&
        (!asMine(c, "ret") ||
          (/>Yours</.test(item(h, "ret")) &&
            /data-a="asusual" data-k="ret">Back to the usual value \(Age \d+\)</.test(item(h, "ret"))))
    );
    chk(who + "the sheet says Recalculating", /Recalculating\./.test(h));
    chk(
      who + "the engine uses it: the need at that age is worked out again",
      derive(c).fiRet !== d0.fiRet || to === ret0,
      [derive(c).fiRet, d0.fiRet]
    );
    X("asusual", "", "ret");
    chk(
      who + "Back to the usual value",
      c.ret === asUsual(c, "ret") && !asMine(c, "ret") && />Usual</.test(item(ov(), "ret"))
    );
    /* Social Security: the same key as setup and My number */
    X("asset", "0.5", "ss");
    chk(
      who + "Social Security at one half is written to the one key",
      c.x.ss === 0.5 && asMine(c, "ss") && item(ov(), "ss").includes("<b>50%</b>")
    );
    X("asusual", "", "ss");
    chk(who + "Social Security back to all of it", c.x.ss === 1 && !asMine(c, "ss"));
    /* a value that is not on the list, and a fixed one */
    chk(
      who + "a value that is not on the list is refused",
      asSet(c, "death", 300) === false && asSet(c, "ret", "abc") === false
    );
    chk(
      who + "a fixed assumption cannot be set",
      asSet(c, "grow", 0.05) === false && asSet(c, "take", 0.035) === false && asSet(c, "end", 100) === false
    );
    X("asset", "100", "death");
    chk(who + "the age the money lasts to: a tap sets it", c.death === 100 && asMine(c, "death"));
    X("asusual", "", "death");
    X("asdone");
    chk(who + "Done closes the sheet when it came from a main screen", !SH && !W);
  });

  /* ---- 4. from a sheet: Back returns to it, with its state ---- */
  c = fresh(false);
  X("close");
  X("gohome");
  X("menu");
  const sh0 = SH;
  X("assume");
  chk(
    "from a sheet: the last button says Back to where you were",
    W.kind === "assume" && !!W.from && /data-a="asdone">Back to where you were</.test(ov())
  );
  X("assume");
  chk("a second tap keeps the way back", W.kind === "assume" && W.from && W.from.sh === sh0);
  X("asdone");
  chk("Back returns to the sheet it came from", SH === sh0 && (!W || W.kind !== "assume") && /Find a tool/.test(ov()));
  X("close");
  chk(
    "the built list has the row, and its probe passes",
    WB.some(r => /^Assumptions/i.test(r[1]) && r[2] === "b" && r[3]() === true)
  );

  G = G0;
  W = null;
  SH = null;
}
