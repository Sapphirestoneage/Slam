/* ============================================================================
   SLAM the Game, test: tests/whats-new-note-and-test-build.js
   PURPOSE     Examine the note "What's new" on Home (it shows when SLAM changed since the last time,
               "Got it" puts it away until the next update, "Don't show again" keeps Home quiet, and
               the sheet What's new turns it back on), and the strip "TEST BUILD" (only at the address
               /game-next/).
   INPUT       The game scripts, loaded by harness.cjs. The sample game.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/founding.js (homeWhatsNew, pnFresh, pngot, pnoff,
               pnnote), core/testbuild.js, the five pages that load it.
   ========================================================================= */
{
  const fs = require("fs"),
    G0 = G,
    tab0 = tab,
    tour0 = G.tourSeen;
  const player = led => {
    G = fresh();
    const c = newChar({ name: "Dana", age: 31 });
    c.demo = false;
    applyTypical(c);
    c.led = led;
    G.chars = [c];
    G.demo = false;
    G.active = 0;
    G.tourSeen = true;
    tab = "home";
    render();
  };
  const L = pnList(),
    note = () => /class="[^"]*\bpn-new\b/.test(app());

  /* 1. WHICH ENTRIES ARE NEW */
  chk("the list has entries, the newest first", L.length > 3 && L[0].d >= L[1].d);
  chk("with no record, the newest entry only", pnFresh(L, "").length === 1 && pnFresh(L, "")[0] === L[0]);
  chk("the newest entry was seen: nothing is new", pnFresh(L, pnId(L[0])).length === 0);
  chk("the third entry was seen: two are new", pnFresh(L, pnId(L[2])).length === 2);
  chk("a record that is not in the list: the newest entry only", pnFresh(L, "1999-01-01|Gone").length === 1);
  chk("an empty list: nothing is new", pnFresh([], "").length === 0);

  /* 2. A NEW PLAYER STARTS WITH ALL ENTRIES AS READ */
  player(false);
  chk("a player in setup sees no note", !note());
  chk("and the newest entry counts as seen", G.fd.pnSeen === pnId(L[0]));
  C().led = true;
  render();
  chk("after setup, still no note", !note());

  /* 3. A PLAYER WHO WAS HERE BEFORE AN UPDATE */
  player(true);
  G.fd = { pnSeen: pnId(L[2]) };
  render();
  const h = app();
  chk("the note is on Home, with the title of the newest entry", note() && h.includes("What's new: " + esc(L[0].t)));
  chk("it says how many more", /, and 1 more update</.test(h));
  chk(
    "three buttons: See what changed, Got it, Don't show again",
    /data-a="whatsnew"[^>]*>See what changed</.test(h) &&
      /data-a="pngot"[^>]*>Got it</.test(h) &&
      /data-a="pnoff"[^>]*>Don't show again</.test(h)
  );
  chk("the note has no pulse: Home keeps its one pulse", !/pn-new[^>]*\b(cbnext|pulse)\b/.test(h));
  chk("the note shows no defect", clean(h), junk(h));
  X("pngot");
  chk("Got it: the note goes", !note() && G.fd.pnSeen === pnId(L[0]) && !G.fd.pnOff);
  G.fd.pnSeen = pnId(L[1]);
  render();
  chk("the next update brings the note back", note());
  X("whatsnew");
  chk("opening What's new counts as seen", G.fd.pnSeen === pnId(L[0]));
  X("close");
  chk("and the note is gone from Home", !note());

  /* 4. DON'T SHOW AGAIN, AND THE WAY BACK */
  G.fd.pnSeen = pnId(L[2]);
  render();
  X("pnoff");
  chk("Don't show again: the note goes and the choice is kept", !note() && G.fd.pnOff === true);
  G.fd.pnSeen = pnId(L[3]);
  render();
  chk("a later update shows no note", !note());
  X("whatsnew");
  chk(
    "What's new says Home is quiet, with a button to turn it on",
    /Tell me on Home/.test(ov()) && /data-a="pnnote"[^>]*>Turn on</.test(ov())
  );
  X("pnnote");
  chk("Turn on: the choice is undone", G.fd.pnOff === false && /data-a="pnnote"[^>]*>Turn off</.test(ov()));
  X("close");

  /* 5. THE DEMO AND A COACH INSIDE A GAME SEE NO NOTE */
  G.fd = { pnSeen: pnId(L[2]) };
  G.demo = true;
  render();
  chk("the demo shows no note", !note());
  G.demo = false;

  /* 6. THE STRIP "TEST BUILD" */
  chk(
    "the test build is the path with /game-next/",
    tbIsNext("/game-next/") && tbIsNext("/game-next/privacy.html") && tbIsNext("/Slam/game-next/index.html")
  );
  chk(
    "the real game and other paths are not",
    !tbIsNext("/game/") && !tbIsNext("/game/next/") && !tbIsNext("/game-nextdoor/") && !tbIsNext("")
  );
  const made = [],
    doc = () => ({
      body: { firstChild: null, insertBefore: (el, before) => made.push([el, before]) },
      getElementById: () => null,
      createElement: () => ({ style: {}, setAttribute() {} }),
    });
  chk("at /game/ nothing is added to the page", tbStrip(doc(), "/game/") === false && made.length === 0);
  chk(
    "at /game-next/ one strip goes to the top of the page",
    tbStrip(doc(), "/game-next/") === true && made.length === 1
  );
  const el = made[0] ? made[0][0] : { style: {}, textContent: "" };
  chk("the strip says TEST BUILD", /^TEST BUILD\b/.test(el.textContent || ""));
  chk(
    "amber, not red",
    /#f0c060/.test(el.style.cssText || "") && !/red|#f00|#e\d\d\b|#d\d\d\b/i.test(el.style.cssText || "")
  );
  chk(
    "a page that has the strip gets no second one",
    tbStrip(Object.assign(doc(), { getElementById: () => ({}) }), "/game-next/") === false && made.length === 1
  );
  chk(
    "each page of the game loads the strip right after the error record",
    ["index.html", "admin.html", "coach.html", "privacy.html", "session.html"].every(p =>
      /<script src="core\/report\.js\?v=[0-9a-f]+"><\/script>\s*<script src="core\/testbuild\.js\?v=[0-9a-f]+"><\/script>/.test(
        fs.readFileSync(GAME_DIR + p, "utf8")
      )
    )
  );
  chk(
    "no page of the game names /game/ in a script or link address: each address is relative, so /game-next/ works",
    ["index.html", "admin.html", "coach.html", "privacy.html", "session.html"].every(
      p => !/(src|href)="\/game\//.test(fs.readFileSync(GAME_DIR + p, "utf8"))
    )
  );

  /* put the game state back */
  G = G0;
  G.tourSeen = tour0;
  tab = tab0;
  render();
}
