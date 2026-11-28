/* ============================================================================
   SLAM the Game, test: tests/how-it-connects.js
   PURPOSE     Examine How it all connects: the links between the skill tracks, and the links from a
               skill to a screen.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/connect.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    tour0 = G.tourSeen;
  G.demo = false;
  G.tourSeen = "2026-01-01";
  const R = r => Object.assign({ s: true, cf: 3 }, r);
  const T = Object.keys(SKILLS);
  chk(
    "every link joins two real tracks, never a track to itself, never twice, each with a reason",
    CX_E.every(e => SKILLS[e[0]] && SKILLS[e[1]] && e[0] !== e[1] && e[2].length > 20) &&
      new Set(CX_E.map(e => e[0] + ">" + e[1])).size === CX_E.length
  );
  chk(
    "every track is in the web: it feeds something or is fed by something",
    T.every(t => cxNeeds(t).length + cxOpens(t).length > 0),
    T.filter(t => cxNeeds(t).length + cxOpens(t).length === 0).join()
  );
  chk(
    'no loops: following "opens" never comes back around',
    (() => {
      const seen = {},
        stack = {};
      const go = t => {
        if (stack[t]) return false;
        if (seen[t]) return true;
        seen[t] = stack[t] = 1;
        const ok = cxOpens(t).every(e => go(e[1]));
        stack[t] = 0;
        return ok;
      };
      return T.every(go);
    })()
  );
  chk(
    "credit opens deals and real estate, as promised",
    cxOpens("credit-cards")
      .map(e => e[1])
      .sort()
      .join() === "deals-smart-buying,real-estate" && cxNeeds("credit-cards")[0][0] === "debt-leverage"
  );
  const cov = cxCoverage();
  chk(
    "a real share of skills lead to a screen, and every route is a live action",
    cov.tot === 625 && cov.n >= 50 && CX_ROUTES.every(r => typeof ACT[r[1]] === "function"),
    JSON.stringify(cov)
  );
  chk(
    "routes land on the right kind of skill",
    (() => {
      const hits = {};
      T.forEach(t =>
        SKILLS[t].skills.forEach((s, i) => {
          const l = cxLink(t, i);
          if (l) hits[l.a + ":" + l.v] = (hits[l.a + ":" + l.v] || 0) + 1;
        })
      );
      return Object.keys(hits).length >= 10;
    })()
  );
  const a = Object.assign(newChar(), {
    name: "Con",
    led: true,
    placed: true,
    age: 30,
    take: 4000,
    spend: 3000,
    incs: [R({ k: "A main job", amt: 4000 })],
    spends: [R({ k: "Home", amt: 3000 })],
    cashes: [R({ k: "Checking", amt: 500 })],
    invs: [],
    debts: [],
    moves: [],
    x: { revSeen: "x" },
  });
  G.chars.push(a);
  G.active = n0;
  save();
  go("home");
  const c = C();
  chk(
    "the menu has it, and the mission board points to it",
    MENU.some(m => m[1] === "connect") &&
      (() => {
        go("plan");
        const ok = app().includes("See how it all connects");
        go("home");
        return ok;
      })()
  );
  X("connect");
  const here = cxHere(c, D);
  chk(
    "opens on where you are: the picture, the track card, the next skills",
    W.kind === "connect" &&
      ov().includes("You are here") &&
      ov().includes('<svg class="cxsvg"') &&
      ov().includes('class="cxn ') &&
      ov().includes(esc(trackN(here))) &&
      ov().includes("Open this track on the map") &&
      clean(ov()),
    junk(ov())
  );
  X("cxfocus", "credit-cards");
  chk(
    "tap a circle to stand on it: what feeds it above, what it opens below",
    W.t === "credit-cards" &&
      ov().includes("Works best after") &&
      ov().includes("Opens up") &&
      ov().includes('data-v="debt-leverage"') &&
      ov().includes('data-v="deals-smart-buying"') &&
      ov().includes("Back to where I am") &&
      ov().includes("You can still start here")
  );
  chk(
    "a link is advice, never a lock",
    ov().includes("A link is advice, never a lock") &&
      !/locked|cannot start|not allowed/i.test(ov().replace(/<[^>]+>/g, " "))
  );
  X("cxview", "list");
  chk(
    "the list view: ten regions with levels, every track, after and opens",
    W.view === "list" &&
      REGIONS.filter(r => regionTrees(r.id).length).every(r => ov().includes(esc(r.n))) &&
      ov().includes("Level ") &&
      ov().includes("After: ") &&
      ov().includes("Opens: ") &&
      ov().includes("A starting point") &&
      clean(ov()),
    junk(ov())
  );
  X("cxfocus", "debt-leverage");
  chk("picking from the list goes back to the picture on that track", W.view === "pic" && W.t === "debt-leverage");
  const li = SKILLS["debt-leverage"].skills.findIndex((s, i) => cxLink("debt-leverage", i));
  chk("the debt track has a skill that opens the debt plan", li >= 0 && cxLink("debt-leverage", li).a === "debtplan");
  X("skill", "debt-leverage:" + li);
  chk(
    "a skill sheet now says how to do it in the game and where it connects",
    ov().includes("Do it in the game: Open the debt plan") && ov().includes("How Debt payoff connects"),
    ov().slice(-400)
  );
  X("cxdo", "", "debtplan");
  chk("and the button goes there", W && W.kind === "dbplan", W && W.kind);
  X("close");
  // an unlock, noticed once
  for (let i = 0; i < 4; i++) C().skills["cash-safety-net:" + i] = todayISO();
  save();
  chk("four skills is not level 1 yet", !cxStarted(C(), "cash-safety-net") && !cxReady(C(), "storms-windfalls"));
  X("skilldone", "cash-safety-net:4");
  X("close");
  chk(
    "the fifth takes the track to level 1 and names what it opened",
    cxStarted(C(), "cash-safety-net") &&
      !!cxNews(C()) &&
      cxNews(C()).from === "cash-safety-net" &&
      cxNews(C()).list.includes("storms-windfalls") &&
      !cxNews(C()).list.includes("debt-leverage"),
    JSON.stringify(C().x.unl)
  );
  go("home");
  chk(
    "Home says so once, under the tiles",
    app().includes("Just opened:") && app().includes('class="rowbtn homerow" data-a="connect"')
  );
  X("connect", "cash-safety-net");
  chk("the screen shows the news, then it is seen", ov().includes("Just opened:") && !cxNews(C()));
  X("close");
  go("home");
  chk("and Home stops saying it", !app().includes("Just opened:"));
  X("skilldone", "cash-safety-net:5");
  X("close");
  chk("a later skill in the same track does not announce again", !cxNews(C()));
  chk(
    "the checklist rows pass",
    btRows().some(
      r => r.n.startsWith("How it all connects") && r.st === "b" && /links between the 25 tracks/.test(r.note)
    ) && btCount(btRows()).x === 0
  );
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  if (tour0) G.tourSeen = tour0;
  else delete G.tourSeen;
  save();
  go("home");
}
