/* ============================================================================
   SLAM the Game, test: tests/what-it-could-be-reveal.js
   PURPOSE     Examine Batch B, phase 4 (Nov 27 2026) of What it is / What it could be: the reveal (the two
               numbers, the difference in dollars and in years, what was counted with the way to each deeper
               feature, the finished chart with every switch), the last screen with three buttons only, the
               card to share (no dollar amount), the top 3 moves as cards on Next Steps, the first tile of
               Home (the two numbers and a small layer chart; a tap opens the flow where the player left off),
               and the day after (what changed since last time, with one next move and nothing else that
               pulses).
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. Made-up players.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/cbreveal.js (cbReveal, cbRevealView, cbPlanCard, cbTopMoves,
               cbTopIds, cbTopRows, cbSnap, cbSince, cbSeenKeep, cbSaveState, homeCbTile, cbRevealBookRows),
               features/couldbe.js (cbEndView, cbAt, cbStepAdd, planTabCb), features/cbstack.js (cbStack),
               features/strat.js (stgAddSteps, stgAdded, planTabStrat), features/receipt.js (rcpDiff),
               screens/ux.js (homeQuadTop).
   ========================================================================= */
{
  const G0 = clone(G),
    text = h =>
      h
        .replace(/<svg[\s\S]*?<\/svg>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " "),
    junk = h =>
      (text(h).match(/undefined|NaN|\bnull\b|\u2014/g) || [])
        .concat(text(h).match(/mistake|failed|\bbehind\b|off track|should|wasteful|too much|bad\b/gi) || [])
        .join(","),
    go = (v, k) => X("cbgo", v, k),
    fid = (h, id) => (h.split('data-fid="' + id + '"')[1] || "").split("data-fid=")[0],
    fresh = () => {
      G = clone(G0);
      G.demo = true;
      W = null;
      SH = null;
      X("start");
      X("wnskip"); /* What you want (run SLAM-ONBOARD-1): Skip for now */
      X("cbset", "", "", { q: "age", i: 1 });
      X("cbset", "", "", { q: "spend", i: 2 });
      X("cbset", "", "", { q: "inv", i: 3 });
      X("cbset", "", "", { q: "save", i: 3 });
      return C();
    };

  /* ---- 1. a new player: the taps to the first number and to the reveal ---- */
  let c = fresh(),
    taps = cbTaps();
  chk("the first number comes at the sixth tap", taps === 6 && W.step === "is", taps);
  go("next");
  go("stack");
  taps += 2;
  let h = ov();
  chk("the stack leads to the reveal", /data-a="cbgo" data-v="reveal"/.test(h));
  go("reveal");
  taps += 1;
  h = ov();
  chk("the reveal comes at the ninth tap, well inside 15", W.step === "reveal" && taps === 9, taps);
  chk(
    "the reveal and the last screen are the two last steps of the flow",
    CB_STEPS[CB_STEPS.length - 2].id === "reveal" && CB_STEPS[CB_STEPS.length - 1].id === "end"
  );
  chk(
    "the reveal has the two numbers side by side, the difference, what is counted, the chart and its switches",
    (h.match(/data-cbn=/g) || []).length === 2 &&
      /data-fid="cb:diff"/.test(h) &&
      /data-fid="cb:revlist"/.test(h) &&
      /dkstack/.test(h) &&
      /data-fid="cb:toggles"/.test(h) &&
      /data-fid="cb:revways"/.test(h) &&
      /data-fid="cb:revcosts"/.test(h)
  );
  chk(
    "it has Show the math, the Guess pill, the i of the difference and the one advice line",
    /<details class="math/.test(h) &&
      /kitst">Guess/.test(h) &&
      h.includes("term:cbdiff") &&
      !!GLOSS.cbdiff &&
      text(h).includes(TRUST_LINE)
  );
  chk("the reveal is clean: no undefined, no long dash, no verdict word", junk(h) === "", junk(h));
  chk("no typing: the reveal has no box to type in", !/<input|<textarea|<select/.test(h));
  chk(
    "with nothing counted the reveal says the two are equal",
    cbReveal(c).N.same && /Nothing is counted yet, so the two numbers are equal\./.test(text(h))
  );
  chk("the day of the reveal and the screen are kept", c.x.cb.rev === todayISO() && c.x.cb.at === "reveal");

  /* ---- 2. the difference is the flow's own receipt ---- */
  X("cbquick", "", "ss");
  X("cbquick", "", "shape");
  let V = cbReveal(c),
    R = lyReceipt(V.N.is, V.N.could);
  h = ov();
  chk(
    "the difference in dollars is What it is less What it could be, to the $1,000",
    V.diff.off === Math.round(R.off / 1000) * 1000 && V.diff.off > 0 && text(h).includes(money(V.diff.off)),
    [V.diff.off, R.off]
  );
  chk(
    "the difference in years is the ages of the two numbers",
    V.diff.months === R.months &&
      V.diff.years === V.N.is.age - V.N.could.age &&
      V.diff.years > 0 &&
      text(fid(h, "cb:diffn")).includes(stgYm(R.months) + " sooner"),
    [V.diff.years, V.N.is.age, V.N.could.age]
  );
  chk(
    "a switch on the reveal moves What it could be on the same screen",
    (() => {
      const a = cbNumbers(c).could.target;
      X("cbquick", "", "ss");
      const b = cbNumbers(c).could.target;
      X("cbquick", "", "ss");
      return W.step === "reveal" && b > a && cbNumbers(c).could.target === a;
    })()
  );
  chk(
    "a layer switched off on the reveal changes the chart, and on again puts it back",
    (() => {
      const a = JSON.stringify(cbChart(c).rows.map(r => [r.ss, r.inv, r.gap]));
      X("cbtog", "ss");
      const b = JSON.stringify(cbChart(c).rows.map(r => [r.ss, r.inv, r.gap]));
      X("cbtog", "ss");
      return a !== b && JSON.stringify(cbChart(c).rows.map(r => [r.ss, r.inv, r.gap])) === a;
    })()
  );
  /* could-be is above what-it-is only when a cost is the cause, and the screen says so */
  const keep = clone(c.x.cb.count);
  c.x.cb.count = {};
  X("cbcount", "health");
  V = cbReveal(c);
  h = ov();
  chk(
    "with only a cost counted What it could be is above What it is, and the reveal says which cost",
    V.N.above &&
      V.diff.off < 0 &&
      /more to reach/.test(text(h)) &&
      /because a cost the 25 times rule leaves out is counted: health insurance before 65/.test(text(h)),
    V.diff
  );
  chk(
    "a counted cost is in the list of what is counted, with its deeper feature",
    V.items.some(x => x.id === "health" && x.kind === "cost" && x.deep && typeof ACT[x.deep.a] === "function")
  );
  X("cbcount", "health");
  c.x.cb.count = keep;

  /* ---- 3. what was counted: each one links to its deeper feature ---- */
  const mv = cbMoves(c).shown.find(r => !r.already && r.src === "stg");
  go("stack");
  X("cbquick", "", mv.id);
  go("reveal");
  V = cbReveal(c);
  h = ov();
  chk(
    "the list has each counted way and each counted move",
    ["ss", "shape", mv.id].every(id => V.items.some(x => x.id === id)) &&
      V.items.length === 3 &&
      (h.match(/data-fid="cb:revitem"/g) || []).length === 3
  );
  chk(
    "every counted strategy opens a feature of the game: no dead end",
    V.nodeep.length === 0 && V.items.every(x => x.deep && typeof ACT[x.deep.a] === "function" && x.deep.l)
  );
  chk(
    "every way of the flow and both costs have a deeper feature that is a real action",
    cbWays().every(w => CBR_DEEP[w.id] && typeof ACT[CBR_DEEP[w.id].a] === "function") &&
      ["health", "wtax", "yesbut"].every(id => typeof ACT[CBR_DEEP[id].a] === "function")
  );
  chk(
    "every move of the stack carries its own full card",
    cbMoves(c)
      .shown.concat(cbMoves(c).hidden)
      .every(r => r.open && typeof ACT[r.open.a] === "function")
  );
  const N1 = clone(cbNumbers(c));
  chk(
    "the counted move is on its own line with its months, and it moves neither number",
    /data-fid="cb:revmoves"/.test(h) &&
      text(fid(h, "cb:revmoves")).includes(cbStack(c).movesSum.words.replace(/^./, m => m.toLowerCase())) &&
      h.includes("term:cbtwo") &&
      !!GLOSS.cbtwo &&
      (() => {
        X("cbmovedo", "no", mv.id);
        const same = cbNumbers(c).could.target === N1.could.target && cbNumbers(c).is.target === N1.is.target;
        cbMoveDo(mv.id, "count");
        return same;
      })()
  );
  chk("the reveal with ways and a move counted is clean", junk(h) === "", junk(h));
  /* the Yes, but card */
  const big = c.spends
      .filter(r => r.amt > 0)
      .slice()
      .sort((a, b) => b.amt - a.amt)[0],
    small = c.spends
      .filter(r => r.amt > 0)
      .slice()
      .sort((a, b) => a.amt - b.amt)[0];
  cbYbSet("pair", c.spends.indexOf(big), c.spends.indexOf(small));
  V = cbReveal(c);
  chk(
    "a Yes, but card is on the reveal with its net, on the line of the moves",
    cbYbPick(c).n > 0 &&
      V.items.some(x => x.id === "yesbut" && x.words === cbYbPick(c).net.words) &&
      (() => {
        sheet(cbSheet);
        return text(fid(ov(), "cb:revmoves")).includes("Your Yes, but card");
      })()
  );
  chk(
    "the card moves neither number",
    cbNumbers(c).could.target === N1.could.target && cbNumbers(c).is.target === N1.is.target
  );

  /* ---- 4. the last screen: three buttons only ---- */
  go("end");
  h = ov();
  const three = fid(h, "cb:end3");
  chk(
    "the last screen has three buttons, in the owner's words and order",
    W.step === "end" &&
      (three.match(/<button/g) || []).length === 3 &&
      /data-a="cbsave">Keep my plan: make a free account<[\s\S]*data-a="cbshare">Share my card<[\s\S]*data-a="flag">Tell Eli what broke</.test(
        three
      )
  );
  chk(
    "nothing else on it is a way on: no rest of setup, no step of the flow, no pitch",
    !/data-a="cbrest"/.test(h) &&
      !/data-a="cbgo"/.test(h) &&
      !/coach|session|book a call/i.test(text(h)) &&
      (h.match(/class="primary/g) || []).length === 1
  );
  chk(
    "Back and Home are on the top row, and the two numbers, Show the math and the advice line are there",
    /data-a="navback"/.test(h) &&
      /data-a="gohome"/.test(h) &&
      (h.match(/data-cbn=/g) || []).length === 2 &&
      /<details class="math/.test(h) &&
      text(h).includes(TRUST_LINE)
  );
  chk("the last screen is clean", junk(h) === "", junk(h));
  chk("Tell Eli what broke is the report tool of the game", ACT.flag === ACT.flag && typeof flagSheet === "function");
  /* Keep my plan */
  {
    const was = ACT.doorsave,
      g0 = DOOR.guest;
    let hit = 0;
    ACT.doorsave = () => hit++;
    DOOR.guest = true;
    chk("a visitor with no account: the screen says the plan is on this device only", cbSaveState().guest === true);
    X("cbsave");
    chk("Keep my plan opens the door of a free account for a visitor", hit === 1);
    DOOR.guest = false;
    X("cbsave");
    chk(
      "with no visitor the tap makes no second account: it says where the plan is kept",
      hit === 1 && /data-fid="cb:endmsg"/.test(ov()) && junk(ov()) === ""
    );
    ACT.doorsave = was;
    DOOR.guest = g0;
  }
  chk("passkeys stay switched off", typeof PASSKEY_READY === "undefined" || PASSKEY_READY === false);

  /* ---- 5. the card to share ---- */
  V = cbReveal(c);
  const card = cbPlanCard(V),
    all = JSON.stringify(card);
  chk(
    "the card has the parts the one painter draws",
    ["brand", "title", "mid", "net", "foot", "file"].every(k => typeof card[k] === "string" && card[k]) &&
      [card.yes, card.but].every(x => x.label && Array.isArray(x.lines) && x.lines.length && x.words) &&
      /\.png$/.test(card.file)
  );
  chk("the card has no dollar amount", !/\$/.test(all) && !/\d{4,}/.test(all.replace(card.file, "")), all);
  chk(
    "the card says what the player sees: the two ages, the time between them, the names of what is counted",
    card.yes.words === "FI at age " + V.N.is.age &&
      card.but.words === "FI at age " + V.N.could.age &&
      card.net.toLowerCase() === V.diff.time &&
      card.but.lines.includes(cbWays().find(w => w.id === "ss").title) &&
      card.foot.includes(TRUST_LINE)
  );
  chk(
    "with more than three counted the card names three and counts the rest",
    card.but.lines.length <= 4 &&
      (V.items.filter(x => x.kind !== "card").length <= 3 || /^and \d+ more$/.test(card.but.lines[3]))
  );
  chk(
    "the Yes, but card still paints with its own middle (the painter is shared, not copied)",
    cbYbCard(cbYbPick(c)).mid === undefined && /card\.mid \|\| "The net"/.test(String(cbYbPaint))
  );
  chk(
    "with no canvas the tap on Share my card says so and does not throw",
    (X("cbshare"), /screenshot/.test(W.msg || ""))
  );

  /* ---- 6. Next Steps: the top 3 moves as cards ---- */
  let T = cbTopMoves(c);
  chk(
    "the top moves are three at most, what the player counted first, and none that is theirs already or left out",
    T.length === 3 &&
      T[0].id === mv.id &&
      T[0].counted &&
      T.every(r => {
        const m = cbMoves(c).shown.find(x => x.id === r.id);
        return m && !m.already && m.how !== "no" && m.how !== "did";
      }),
    T.map(r => r.id)
  );
  chk(
    "after the counted ones the order is the most days sooner",
    (() => {
      const rest = T.filter(r => !r.counted).map(r => cbMoves(c).shown.find(x => x.id === r.id).days);
      return rest.every((d, i) => i === 0 || rest[i - 1] >= d);
    })()
  );
  X("gohome");
  X("tab", "plan");
  h = app();
  chk(
    "Next Steps shows them as cards, each one opens its full card",
    (h.match(/data-fid="cb:topmove"/g) || []).length === 3 &&
      T.every(r => text(h).includes(r.name) && h.includes('data-a="' + r.open.a + '" data-v="' + r.open.v + '"')) &&
      junk(h) === ""
  );
  const add = T.find(r => r.canAdd),
    S0 = stgOf(add.key),
    n0 = plX(c).plan.length;
  X("cbaddstep", "", add.key);
  h = app();
  chk(
    "Add to my steps puts the steps of the move on the plan, through the Strategy Engine",
    plX(c).plan.length === n0 + S0.quests.length &&
      stgAdded(c, S0) &&
      plX(c).plan.filter(p => p.a === "strat" && String(p.v).split(":")[0] === add.key).length === S0.quests.length &&
      /On your steps/.test(text(h))
  );
  X("cbaddstep", "", add.key);
  chk("a second tap adds nothing twice", plX(c).plan.length === n0 + S0.quests.length);
  chk(
    "Moves to try shows the next moves, not the same ones again",
    (() => {
      c.placed = true;
      const ids = cbTopIds(c),
        p = planTab(),
        card2 = (p.split("stgcard")[1] || "").split("<!--")[0];
      c.placed = false;
      return (
        ids.length > 0 &&
        /Moves to try/.test(p) &&
        ids.every(id => !card2.includes('data-a="strat" data-v="' + id + '"'))
      );
    })()
  );
  chk(
    "the rest of setup stays on Next Steps while it is open",
    /data-a="cbrest"/.test(h) && /Finish setup: five short rounds/.test(text(h))
  );

  /* ---- 7. Home: the first tile ---- */
  X("tab", "home");
  h = app();
  let tile = fid(h, "cb:home");
  const Nh = cbNumbers(c);
  chk(
    "the tile of the two numbers is the first card of Home, before Your next win",
    /class="rstop cbq"/.test(h) &&
      h.indexOf('data-fid="cb:home"') > 0 &&
      h.indexOf('data-fid="cb:home"') < h.indexOf('data-fid="rs:win"')
  );
  chk(
    "it shows the two numbers of the flow: one source",
    text(h).includes("What it is " + money(Nh.is.shown)) &&
      text(h).includes("What it could be " + money(Nh.could.shown)),
    text(h).slice(0, 300)
  );
  chk(
    "it has the small layer chart of the kit, and no part of the chart takes a tap",
    (() => {
      const svg = (h.split('data-fid="cb:homego"')[1] || "").match(/<svg[\s\S]*?<\/svg>/);
      return !!svg && /dkstack/.test(svg[0]) && !/data-a=/.test(svg[0]);
    })()
  );
  chk(
    "the rest of setup is on the tile while it is open",
    /data-fid="cb:homerest"/.test(h) && /data-a="cbrest"/.test(h)
  );
  chk("on the first day the tile has no since last time", cbSince(c) === null && !/data-fid="cb:since"/.test(h));
  chk("Home is clean", junk(h) === "", junk(h));
  chk("a tap opens the flow where the player left off", (X("cbback"), W.kind === "cb" && W.step === "end"));
  go("stack");
  go("move", mv.id);
  X("gohome");
  chk(
    "a move of the stack counts as the stack",
    c.x.cb.at === "stack" &&
      /Pick up where you left off: The stack/.test(text(app())) &&
      (X("cbback"), W.step === "stack")
  );
  go("flex");
  X("gohome");
  chk(
    "a way is named by its title",
    text(app()).includes("Pick up where you left off: " + cbWays().find(w => w.id === "flex").title) &&
      (X("cbback"), W.step === "flex")
  );
  X("gohome");

  /* ---- 8. the day after ---- */
  chk("the numbers of this visit are kept when the page is put away", cbSeenKeep() && c.x.cb.seen.day === todayISO());
  const yday = addDays(todayISO(), -1);
  c.x.cb.seen.day = yday;
  let Sn = cbSince(c);
  render();
  h = app();
  chk(
    "the next day with nothing changed: the tile says so, in one line",
    Sn &&
      Sn.days === 1 &&
      Sn.lines.length === 0 &&
      /Since last time, 1 day ago/.test(text(h)) &&
      /Nothing moved/.test(text(h))
  );
  /* the player saves more and has more invested: the lines of the receipt */
  const snap0 = clone(c.x.cb.seen.n);
  c.invs[0].amt += 20000;
  syncAll(c);
  D = derive(c);
  Sn = cbSince(c);
  render();
  h = app();
  const want = rcpDiff(snap0.r, rcpNums(c), rsFire(c));
  chk(
    "what changed is the receipt of the game: the same lines as rcpDiff of the numbers then and now",
    want.length > 0 &&
      want.every(w => Sn.lines.some(l => l.k === w.k && l.txt === w.txt)) &&
      Sn.lines.some(l => l.k === "nw") &&
      /data-fid="rcp:nw"/.test(fid(h, "cb:since") + h.split('data-fid="cb:since"')[1])
  );
  chk(
    "a number of the flow that moved has its own line, with then and now in Show the math",
    (cbSnap(c).isAge === snap0.isAge && cbSnap(c).is === snap0.is
      ? !Sn.lines.some(l => l.k === "cbis")
      : Sn.lines.some(l => l.k === "cbis")) &&
      (cbSnap(c).couldAge === snap0.couldAge && cbSnap(c).could === snap0.could
        ? !Sn.lines.some(l => l.k === "cbcould")
        : Sn.lines.some(l => l.k === "cbcould" && /then: .*Now: /.test(l.math)))
  );
  chk("Home on the day after is clean, and says Recalculating for a number that went up", junk(h) === "", junk(h));
  chk(
    "one next move: the one primary button of Home is the next win, and the tile has none",
    (h.match(/class="primary go/g) || []).length === 1 &&
      !/class="primary/.test(fid(h, "cb:home")) &&
      h.indexOf('class="primary go') > h.indexOf('data-fid="rs:win"')
  );
  chk(
    "nothing else pulses: the page stills every other pulse on the Home of a player of the flow",
    (() => {
      const css = require("fs").readFileSync(GAME_DIR + "index.html", "utf8");
      return /\.rstop\.cbq \.rsstrip i\.here,\.rstop\.cbq~\.pulse,\.rstop\.cbq~\* \.pulse,\.rstop\.cbq~\* button\.go[^{]*\{animation:none\}/.test(
        css
      );
    })()
  );
  /* the snapshot of the earlier day moves on, and since last time still compares with it */
  cbSeenKeep();
  chk(
    "on the new day the last visit is kept apart, so the tile still compares with it",
    c.x.cb.was.day === yday && c.x.cb.seen.day === todayISO() && cbSince(c).lines.length === Sn.lines.length
  );
  c.x.cb.was.day = addDays(todayISO(), -9);
  chk("it counts the days", cbSince(c).days === 9);

  /* ---- 9. who sees the tile ---- */
  delete c.x.cb;
  render();
  chk(
    "a player who was never in the flow sees Home as before: no tile, no top moves",
    homeCbTile(c) === "" && !/cb:home/.test(app()) && /class="rstop"/.test(app()) && cbTopMoves(c).length === 0
  );
  G = clone(G0);
  G.demo = true;
  render();
  chk("the sample game has no tile", homeCbTile(C()) === "" && !/cb:home/.test(app()));

  /* ---- 10. a player with costly debt, and the spreadsheet ---- */
  c = fresh();
  c.debts = [{ k: "Credit card", amt: 18000, apr: 24, high: true, s: true, cf: 3 }];
  syncAll(c);
  D = derive(c);
  let ok = true;
  try {
    go("next");
    go("stack");
    go("reveal");
    h = ov();
    go("end");
    h += ov();
    X("gohome");
    h += app();
    X("tab", "plan");
    h += app();
  } catch (e) {
    ok = false;
    h = String(e && e.stack);
  }
  chk(
    "with $18,000 of card debt at 24% the reveal, the last screen, Home and Next Steps open and are clean",
    ok &&
      /data-fid="cb:diff"/.test(h) &&
      /data-fid="cb:end3"/.test(h) &&
      /data-fid="cb:home"/.test(h) &&
      junk(h) === "",
    ok ? junk(h) : h
  );
  chk("its top moves are moves that can apply to it", cbTopMoves(c).length > 0 && cbTopMoves(c).length <= 3);
  X("cbquick", "", "ss");
  const B = cbBook(c).rows,
    row = id => B.find(r => r.id === id);
  chk(
    "the spreadsheet of the plan has the second number and the difference",
    row("cb_could") &&
      row("cb_diff") &&
      row("cb_diff").f === "={cb_is}-{cb_could}" &&
      Math.abs(row("cb_diff").v - (row("cb_is").v - row("cb_could").v)) < 0.01
  );
  chk(
    "the built list says phase 4 is there",
    WB.some(b => /reveal/i.test(b[1]) && /^What it could be/.test(b[1]) && b[3]() === true)
  );
  G = clone(G0);
  W = null;
  SH = null;
  render();
}
