/* ============================================================================
   SLAM the Game, test: tests/stars.js
   PURPOSE     Examine the Galaxy: 25 constellations and 625 stars, the distance from FI by level, the state
               of a star (it follows the status of the skill), the next star, the lanes (they come from the
               real links of connect.js and from the text of the skills), the gateway stars, the headline,
               the panel of a star, "Do this" (it opens a real screen), the fly to a lane, and the two
               doors (the Skills screen and the Quest Log).
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/stars.js and its parts in ui.js and questlog.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Star",
      led: true,
      placed: true,
      age: 30,
      ret: 60,
      take: 5000,
      spend: 4000,
      inv: 20000,
      incs: [R0({ k: "A main job", amt: 5000 })],
      spends: [R0({ k: "Home", amt: 2000 }), R0({ k: "Food", amt: 2000 })],
      cashes: [R0({ k: "Checking", amt: 3000 })],
      invs: [R0({ k: "IRA or Roth IRA", amt: 20000 })],
      debts: [],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C(),
    L = starsLayout(),
    T = Object.keys(SKILLS);
  /* ---------- the places ---------- */
  chk("25 constellations and 625 stars", L.trees.length === 25 && L.list.length === 625);
  chk(
    "one star for each skill, and each id is a real skill",
    L.list.every(s => skillOf(s.id) && L.by[s.id] === s) && new Set(L.list.map(s => s.id)).size === 625
  );
  chk(
    "distance from FI follows the level: each next skill of a track is nearer",
    T.every(t => {
      for (let i = 1; i < treeSize(t); i++) if (!(L.by[t + ":" + i].r < L.by[t + ":" + (i - 1)].r)) return false;
      return true;
    })
  );
  chk(
    "the band of a star is its level, 5 stars for each level",
    L.list.every(s => s.band === Math.floor(s.i / 5)) && L.by["main-path:24"].band === 4
  );
  chk(
    "no two stars are in the same place",
    new Set(L.list.map(s => s.x.toFixed(3) + "," + s.y.toFixed(3))).size === 625
  );
  /* ---------- the state follows the skill status ---------- */
  const nx = starsNext(c, D);
  chk("there is one next star, and it is an open skill", nx && L.by[nx] && !skillDone(c, nx), nx);
  chk("a skill that is not done is dim", starsState(c, "the-long-game:20", nx) === "dim");
  c.skills["the-long-game:20"] = todayISO();
  chk("a skill that is done is a bright star", starsState(c, "the-long-game:20", nx) === "done");
  delete c.skills["the-long-game:20"];
  c.na["the-long-game:21"] = true;
  chk("a skill that does not apply is greyed", starsState(c, "the-long-game:21", nx) === "na");
  chk("the next star is the pulsing one", starsState(c, nx, nx) === "next");
  c.skills[nx] = todayISO();
  const nx2 = starsNext(c, D);
  chk("when the next skill is done, the pulse moves to a different star", nx2 && nx2 !== nx && !skillDone(c, nx2));
  if (typeof questContinue === "function") {
    const q = questContinue(c),
      hit =
        q &&
        L.list.find(s => {
          const K = !skillDone(c, s.id) && !c.na[s.id] && cxLink(s.t, s.i);
          return K && K.a === q.a && (K.v || "") === (q.v || "");
        });
    chk("the next star is the pick of Continue when a star does that screen", !hit || nx2 === hit.id);
  }
  /* ---------- the headline ---------- */
  const N = starsCount(c);
  chk(
    "the headline: lit stars over the stars that apply",
    N.lit === T.reduce((s, t) => s + treeDone(c, t), 0) &&
      N.na === 1 &&
      N.of === 624 &&
      N.pct === Math.round((N.lit / 624) * 100)
  );
  chk(
    "the count of each constellation is the count of the skill list",
    N.rows.length === 25 && N.rows.every(r => r.done === treeDone(c, r.t) && r.size === treeSize(r.t))
  );
  /* ---------- the lanes come from real links ---------- */
  const lanes = starsLanes(),
    fromCx = lanes.filter(l => l.src === "connect"),
    fromText = lanes.filter(l => l.src === "text");
  chk(
    "each link of connect.js is one lane, with its reason",
    fromCx.length === CX_E.length &&
      CX_E.every(e => fromCx.some(l => l.from.split(":")[0] === e[0] && l.to === e[1] + ":0" && l.why === e[2]))
  );
  chk(
    "a text lane exists only when the text of the skill names the other track",
    fromText.length > 10 &&
      fromText.every(l => {
        const s = skillOf(l.from),
          u = l.to.split(":")[0];
        return u !== l.from.split(":")[0] && STARS_WORDS[u].test(s[0] + " " + s[1]);
      })
  );
  chk(
    "each lane joins two real stars of different constellations",
    lanes.every(l => L.by[l.from] && L.by[l.to] && L.by[l.from].t !== L.by[l.to].t)
  );
  const gate = starsGateways();
  chk(
    "a gateway star reaches 2 or more other constellations, and no other star has a ring",
    Object.keys(gate).length > 0 &&
      L.list.every(s => {
        const reach = new Set(starsLanesOf(s.id).out.map(l => l.to.split(":")[0])).size;
        return reach >= 2 ? gate[s.id] === reach : !gate[s.id];
      })
  );
  /* ---------- the sheet ---------- */
  go("map");
  chk(
    "the Skills screen has the door, and the list is still there",
    app().includes('data-a="galaxy"') && app().includes('data-a="mode"')
  );
  X("quest");
  chk("the Quest Log has the door", ov().includes('data-a="galaxy"'));
  X("galaxy");
  chk(
    "the sheet: the headline, one canvas, the count for each constellation",
    W.kind === "galaxy" &&
      ov().includes(N.pct + "% of the galaxy lit") &&
      (ov().match(/<canvas/g) || []).length === 1 &&
      (ov().match(/data-a="starcenter"/g) || []).length === 25 &&
      clean(ov()),
    junk(ov())
  );
  chk("one canvas, not 625 elements", ov().length < 30000 && !ov().includes('data-a="skill"'));
  X("navback");
  chk("Back returns to the Quest Log", W && W.kind === "quest");
  X("galaxy");
  const g = Object.keys(gate)[0],
    S = skillOf(g);
  X("starfly", g);
  chk(
    "a tap on a star: the name, what it is, when it is done, and Do this",
    STARS.sel === g &&
      ov().includes(esc(S[1])) &&
      ov().includes("You've done this when:") &&
      ov().includes(esc(S[2])) &&
      ov().includes('data-a="stardo" data-v="' + g + '"') &&
      clean(ov()),
    junk(ov())
  );
  const outs = starsLanesOf(g).out;
  chk(
    "the panel lists what this opens, one row for each lane",
    ov().includes("This opens") &&
      outs.every(l => ov().includes('data-a="starfly" data-v="' + l.to + '"')) &&
      ov().includes("gateway star")
  );
  X("starfly", outs[0].to);
  chk(
    "a tap on a lane flies there: the star is chosen and in the middle",
    STARS.sel === outs[0].to &&
      Math.abs(STARS.v.x - L.by[outs[0].to].x) < 1e-9 &&
      Math.abs(STARS.v.y - L.by[outs[0].to].y) < 1e-9
  );
  X("starcenter", "real-estate");
  const re = L.list.filter(s => s.t === "real-estate");
  chk(
    "a constellation can be put in the middle",
    Math.abs(STARS.v.x - re.reduce((s, x) => s + x.x, 0) / 25) < 1e-9 && STARS.v.z > 1
  );
  X("starzoom", "reset");
  chk("Whole galaxy shows all of it again", STARS.v.x === 0 && STARS.v.y === 0 && STARS.v.z === 1);
  /* ---------- the pick by a finger ---------- */
  const p = starsToScreen(L.by["tax-strategy:3"], 360, 360),
    hit = starsPick(p[0] + 3, p[1] - 2, 360, 360);
  chk(
    "a finger near a star picks a star within 22 pixels",
    hit && Math.hypot(...starsToScreen(hit, 360, 360).map((v, i) => v - [p[0] + 3, p[1] - 2][i])) <= 22
  );
  chk("a finger far from each star picks none", starsPick(2, 2, 360, 360) === null);
  const w0 = starsToWorld(100, 80, 360, 360),
    back = starsToScreen({ x: w0[0], y: w0[1] }, 360, 360);
  chk("screen to world and back is the same point", Math.abs(back[0] - 100) < 1e-9 && Math.abs(back[1] - 80) < 1e-9);
  chk(
    "a double tap finds the constellation under the finger",
    starsTreeAt(L.by["knowledge:12"].x, L.by["knowledge:12"].y) === "knowledge"
  );
  /* ---------- Do this opens a real screen ---------- */
  const linked = L.list.find(s => cxLink(s.t, s.i)),
    plain = L.list.find(s => !cxLink(s.t, s.i));
  X("galaxy");
  X("stardo", linked.id);
  chk(
    "Do this on a linked skill opens the screen of connect.js",
    W && W.kind !== "galaxy" && ov().length > 200 && clean(ov()),
    (W && W.kind) + " " + junk(ov())
  );
  X("galaxy");
  X("stardo", plain.id);
  chk(
    "Do this on a skill with no link opens the sheet of that skill",
    W && W.kind === "skill" && W.id === plain.id && ov().includes("I did this")
  );
  X("navback");
  chk("Back from the skill returns to the galaxy", W && W.kind === "galaxy");
  chk(
    "each star opens a real screen: its link is a real action, or it has a skill sheet",
    L.list.every(s => {
      const K = cxLink(s.t, s.i);
      return K ? typeof ACT[K.a] === "function" : !!skillOf(s.id);
    })
  );
  chk(
    "the menu and the i of the screen",
    MENU.some(m => m[1] === "galaxy") && NV_INFO.galaxy && GLOSS.gateway && GLOSS.galaxy
  );
  chk("no em dash in the text of the sheet", !/—/.test(ov()));
  X("close");
  G.chars.length = n0;
  G.active = 0;
  save();
}
