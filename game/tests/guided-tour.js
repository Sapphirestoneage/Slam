/* ============================================================================
   SLAM the Game, test: tests/guided-tour.js
   PURPOSE     Examine the guided tour (run CC-1, item 17, Nov 27 2026): under ten stops, one line each;
               Next, Back, Skip the tour and Done; the count is never "0 of"; Home offers it one time and
               the menu row starts it again; the tour is in the short menu; the tour changes no number;
               the one pulse (the style sheet stops every other pulse while the tour runs, and the button
               Next does not pulse); a player with costly debt.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. Made-up players. The
               harness has no page, so the place of a stop is examined in the browser by
               tools/e2e/tour_walk.cjs.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/tour.js (TOUR, TOUR_ST, tourStops, tourHtml, tourEnd,
               homeTourRow, the actions), features/firstweek.js (FW_CORE), index.html (the style lines).
   ========================================================================= */
{
  const G0 = clone(G),
    fs = require("fs"),
    idx = fs.readFileSync(GAME_DIR + "index.html", "utf8"),
    src = fs.readFileSync(GAME_DIR + "features/tour.js", "utf8"),
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
      X("close");
      X("gohome");
      return C();
    };

  /* ---- 1. the stops ---- */
  chk("the tour has under ten stops", TOUR.length >= 5 && TOUR.length < 10, TOUR.length);
  chk(
    "each stop has a place, a name and one line (one or two short sentences, under 110 letters)",
    TOUR.every(S => S.id && S.sel && S.t && S.l && S.l.length < 110 && !/\n/.test(S.l)),
    TOUR.filter(S => S.l.length >= 110)
      .map(S => S.id)
      .join(",")
  );
  chk("the ids of the stops are not used twice", new Set(TOUR.map(S => S.id)).size === TOUR.length);
  chk(
    "the words are clean: no em dash, no blame word, no Save by hand",
    !/\u2014|mistake|failed|\bbehind\b|off track|should|Save\b/.test(JSON.stringify(TOUR))
  );
  const words = TOUR.reduce((n, S) => n + (S.t + " " + S.l).split(/\s+/).length, 0);
  chk("the words of all stops read in well under 90 seconds (under 220 words)", words < 220, words);

  /* ---- 2. the card ---- */
  const L = tourStops();
  let h = tourHtml(0, L);
  chk(
    "the first card: the name, the line, Stop 1 of N, Skip the tour, Next, and no Back",
    h.includes(TOUR[0].t) &&
      h.includes("Stop 1 of " + L.length) &&
      /data-a="tourdone">Skip the tour</.test(h) &&
      /class="primary tournext" data-a="tournext">Next</.test(h) &&
      !/tourback/.test(h)
  );
  chk("no count reads 0 of", !/\b0 of\b/.test(h));
  chk(
    "the button Next does not pulse (no class go, pulse or cbnext on the card)",
    !/class="[^"]*\b(go|pulse|cbnext)\b/.test(h)
  );
  h = tourHtml(1, L);
  chk("the second card has Back", /data-a="tourback">Back</.test(h) && h.includes("Stop 2 of " + L.length));
  h = tourHtml(L.length - 1, L);
  chk(
    "the last card: Done, Back, no Skip, and where to start it again",
    /data-a="tourdone">Done</.test(h) &&
      /tourback/.test(h) &&
      !/Skip the tour/.test(h) &&
      /the menu, Take the tour/.test(h)
  );

  /* ---- 3. the one pulse: the style sheet ---- */
  chk(
    "while the tour runs every other pulse stops",
    /body\.touring \.go,body\.touring \.pulse,body\.touring \.cbnext\{animation:none!important\}/.test(idx)
  );
  chk(
    "only the place of the stop pulses, with the pulse of the game",
    /body\.touring \.tourpulse\{animation:pulse 1\.6s ease-in-out infinite!important/.test(idx)
  );
  chk("the buttons of the card are 44 pixels high or more", /#tourcard button\{min-height:44px\}/.test(idx));
  chk(
    "the tour takes the pulse off the last place before it puts it on the next",
    /querySelectorAll\("\.tourpulse"\)\.forEach\(e => e\.classList\.remove\("tourpulse"\)\)/.test(src)
  );
  chk(
    "index.html loads tour.js after drills.js",
    idx.indexOf('src="features/tour.js') > idx.indexOf('src="features/drills.js')
  );

  /* ---- 4. the flow, for a new player and for a player with costly debt ---- */
  [false, true].forEach(debt => {
    const who = debt ? "costly debt: " : "new player: ";
    const c = fresh(debt);
    c.led = true;
    delete G.tourSeen;
    go("home");
    chk(who + "Home offers the tour one time", /data-a="tour"><span><b>New here\? Take the 90-second tour/.test(app()));
    const before = JSON.stringify(derive(c)),
      pulses = (app().match(/class="[^"]*\b(go|cbnext)\b/g) || []).length;
    X("tour");
    chk(
      who + "the tour starts on Home at the first stop, with no sheet",
      TOUR_ST.on && TOUR_ST.i === 0 && tab === "home" && !SH
    );
    chk(who + "while it runs Home does not offer it again", !/Take the 90-second tour/.test(app()));
    chk(
      who + "the tour adds no pulse to the words of Home",
      (app().match(/class="[^"]*\b(go|cbnext)\b/g) || []).length === pulses && !/tourpulse/.test(app())
    );
    X("tournext");
    X("tournext");
    chk(who + "Next goes on", TOUR_ST.i === 2);
    X("tourback");
    chk(who + "Back goes back", TOUR_ST.i === 1);
    X("tourback");
    X("tourback");
    chk(who + "Back on the first stop stays there", TOUR_ST.i === 0);
    for (let i = 0; i < TOUR.length - 1; i++) X("tournext");
    chk(who + "the last stop is reached, and the tour is still on", TOUR_ST.on && TOUR_ST.i === TOUR.length - 1);
    X("tournext");
    chk(
      who + "Next on the last stop ends the tour, and the game keeps the day",
      !TOUR_ST.on && G.tourSeen === todayISO()
    );
    chk(who + "Home does not offer it again", !/Take the 90-second tour/.test(app()));
    chk(who + "the tour changed no number", JSON.stringify(derive(c)) === before);
    /* again from the menu, and Skip */
    X("menu");
    chk(who + "the short menu has the row Take the tour", /data-a="menugo" data-k="act" data-v="tour"/.test(ov()));
    X("menugo", "tour", "act");
    chk(who + "the menu row starts it again, and the menu is closed", TOUR_ST.on && TOUR_ST.i === 0 && !SH);
    X("tourdone");
    chk(who + "Skip the tour ends it", !TOUR_ST.on && TOUR_ST.el === null);
    /* from another tab */
    go("money");
    X("tour");
    chk(who + "from another tab the tour goes to Home", TOUR_ST.on && tab === "home");
    X("tourdone");
  });
  chk("the tour is a core row of the short menu", FW_CORE.includes("tour") && MENU.some(m => m[1] === "tour"));
  chk(
    "the built list has the row, and its probe passes",
    WB.some(r => /guided tour/i.test(r[1]) && r[2] === "b" && r[3]() === true)
  );

  tourEnd();
  G = G0;
  W = null;
  SH = null;
}
