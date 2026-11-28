/* ============================================================================
   SLAM the Game, test: tests/life-timeline.js
   PURPOSE     Examine Your life timeline (run FIRE statuses and the life timeline, Part 2): each date on
               the line is the date of the engine that owns it; a moved milestone is a what-if that
               recalculates the others and changes nothing in the saved plan; Keep it changes the plan
               and Undo puts it back; a milestone of the player counts only from the player's own answer
               in its simulator; a missing input gives the incomplete state; players see no coach rows.
   INPUT       The game scripts, loaded by harness.cjs. The sample game.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/lifeline.js, stGame of features/coast.js, ltMapHtml
               of features/lifemap.js, fwRowRule of features/firstweek.js.
   ========================================================================= */
{
  const G0 = G;
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
    const c = C();
    if (costly) {
      c.debts.push({ k: "Credit card balance", amt: 8000, high: true, apr: "15% to 25%", rate: 22, pay: 200, s: true });
      syncAll(c);
    }
    G.chars.forEach(x => (x.hist[0].d = addDays(todayISO(), -40)));
    G.menuAll = true;
    closeSheet();
    save();
    return c;
  };
  const text = h => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const by = (X1, id) => X1.rows.concat(X1.wait).find(m => m.id === id) || null;

  /* 1. A PLAYER WITH NO DEBT: EACH DATE IS THE DATE OF ITS ENGINE */
  let c = fresh1(false),
    d = derive(c),
    P = llCalc(c, null),
    K = stGame(c, d);
  chk("no debt: the line has no debt marker (no row with a zero)", !by(P, "debt") && dbLive(c).length === 0);
  chk("today is on the line at the age of the player", by(P, "today").age === c.age);
  const fi = by(P, "st:FI"),
    sFi = K.list.find(s => s.key === "FI");
  chk(
    "FI is the FI status of the game (stGame), with the months of freeAt",
    fi && fi.value === sFi.value && (sFi.reached ? fi.state === "done" : fi.months === Math.round(freeAt(c))),
    fi && fi.months + " / " + freeAt(c)
  );
  ["Coast", "Lean"].forEach(k => {
    const s = K.list.find(z => z.key === k),
      m = by(P, "st:" + k);
    chk(
      k + ": the marker is the status of the game, or there is none when the game has no number",
      s.value == null ? !m : m && m.value === s.value && (s.reached ? m.state === "done" : m.months === s.months)
    );
  });
  chk(
    "the statuses with no number in the game (Barista, Chubby, Fat) get no marker",
    !by(P, "st:Barista") && !by(P, "st:Chubby") && !by(P, "st:Fat")
  );
  const cu = by(P, "cushion"),
    at4 = goalSim(c).eraAt[4];
  chk(
    "the cushion is era 4 of the plan run (goalSim)",
    d.era >= 4 ? cu.state === "done" : at4 == null ? cu.state === "need" : cu.months === Math.max(0, at4)
  );
  chk(
    "the age you chose is c.ret",
    by(P, "stop").age === c.ret && by(P, "stop").year === +todayISO().slice(0, 4) + (c.ret - c.age)
  );
  chk("Medicare is the age of the chart (LY_MEDICARE)", by(P, "medicare").age === LY_MEDICARE);
  const ps = passives(c);
  chk(
    "Social Security: at 67 when the engine expects a benefit, else no marker",
    ps.full > 0 ? by(P, "ss").age === 67 && text(by(P, "ss").sub).includes(money(Math.round(ps.ss))) : !by(P, "ss")
  );
  chk(
    "the two ages spending eases come from the reference data",
    by(P, "phase:slow").age === LY_SHAPE_REF.slowGoAge && by(P, "phase:no").age === LY_SHAPE_REF.noGoAge
  );
  chk("the age the plan pays to is the assumption (c.death)", by(P, "end") && by(P, "end").age === asVal(c, "death"));
  chk(
    "the rows are in the order of time",
    P.rows.every((m, i) => i === 0 || m.months >= P.rows[i - 1].months)
  );

  /* 2. THE SHEET */
  X("lifeline");
  let h = ov();
  chk("the sheet opens with its title", text(h).includes("Your life timeline"));
  chk("no “0 of”, no undefined, no NaN", !/\b0 of\b|undefined|NaN/.test(text(h)));
  chk("no em dash", !h.includes("—"));
  chk(
    "the level shows, and a guess is greyed",
    /class="pill kitst">(Guess|Close|Exact)</.test(h) && (P.st !== "Guess" || /class="small guess"/.test(h))
  );
  chk(
    "each row is a button with the drawn chevron",
    (h.match(/class="llrow"/g) || []).length === P.rows.length + P.wait.length && /class=chev/.test(h)
  );
  X("llopen", "st:FI");
  h = ov();
  chk(
    "a tap opens the card: what, what for, an i, Show the math with the assumptions line",
    /data-ll="card"/.test(h) &&
      text(h).includes("What for") &&
      /data-k="term:ll_status"/.test(h) &&
      /Show the math/.test(h) &&
      /class="row between asrow"/.test(h)
  );
  chk("the i has its words in the glossary", !!GLOSS.ll_status && !!GLOSS.ll_own && !!GLOSS.scr_lifeline);
  X("llopen", "st:FI");
  chk("the same tap closes the card", !/data-ll="card"/.test(ov()));

  /* 3. MOVE THE AGE: A WHAT-IF, THEN KEEP, THEN UNDO */
  const ret0 = c.ret,
    saved0 = JSON.stringify(c),
    coast0 = by(P, "st:Coast");
  X("llopen", "stop");
  X("llret", "-1");
  X("llret", "-1");
  chk("moving the age changes nothing in the saved plan", JSON.stringify(C()) === saved0 && W.wi.ret === ret0 - 2);
  let Xw = llCalc(c, W.wi);
  const c2 = Object.assign(clone(c), { ret: ret0 - 2 }),
    K2 = stGame(c2, derive(c2));
  chk("the what-if is on", Xw.on && Xw.wiRet === ret0 - 2 && by(Xw, "stop").age === ret0 - 2);
  ["Coast", "FI", "Lean"].forEach(k => {
    const s = K2.list.find(z => z.key === k),
      m = by(Xw, "st:" + k);
    chk(
      "what-if, " + k + ": the date is the engine's date for the moved age",
      s.value == null
        ? !m
        : m && Math.abs(m.value - s.value) < 1e-6 && (s.reached ? m.state === "done" : m.months === s.months)
    );
  });
  if (coast0 && coast0.state === "dated") {
    const m = by(Xw, "st:Coast");
    chk(
      "the Coast date recalculates when the age moves, with the shift next to the plan's date",
      m.shift === m.months - coast0.months && m.shift !== 0 && Xw.moved.some(z => z.id === "st:Coast"),
      coast0.months + " to " + m.months
    );
  }
  h = ov();
  chk(
    "the band says What if and Recalculating, with Keep it and Back to my plan",
    /data-ll="band"/.test(h) &&
      text(h).includes("Recalculating") &&
      /data-a="llkeep"/.test(h) &&
      /data-a="llplan"/.test(h)
  );
  chk("one primary on the screen: Keep it", (h.match(/class="primary[ "]/g) || []).length === 1);
  chk("the tone: none of the words the game never says", !/\b(mistake|failed|behind|off track)\b/i.test(text(h)));
  X("llplan");
  chk(
    "Back to my plan ends the what-if, and the plan is as it was",
    !llCalc(c, W.wi).on && JSON.stringify(C()) === saved0
  );
  X("llret", "-1");
  X("llkeep");
  chk(
    "Keep it changes the plan: the age every engine reads",
    C().ret === ret0 - 1 && derive(C()).toRet === derive(Object.assign(clone(c), { ret: ret0 - 1 })).toRet
  );
  h = ov();
  chk("after Keep it there is Undo, and no what-if", /data-a="llundo"/.test(h) && !/data-ll="band"/.test(h));
  X("llundo");
  chk("Undo puts the old age back", C().ret === ret0 && !/data-a="llundo"/.test(ov()));

  /* 4. A MILESTONE OF YOUR OWN */
  X("lladd");
  h = ov();
  chk("Add shows the kinds, by taps", LL_KINDS.every(k => h.includes('data-v="' + k.k + '"')) && !/<input/.test(h));
  X("llkind", "baby");
  X("llwhen", "3");
  c = C();
  let own = c.x.life.own;
  chk(
    "the baby is on the line 3 years from now",
    own.length === 1 && own[0].age === c.age + 3 && W.id === "own:" + own[0].id
  );
  let E = llOwnEffect(c, own[0]);
  chk("no answer in the simulator yet: the incomplete state, no number", E.state === "need" && !E.opt);
  h = ov();
  chk(
    "the card says it is not counted and what to answer",
    /data-ll="noeffect"/.test(h) &&
      text(h).includes("Answer the yearly cost in the simulator") &&
      /data-a="simopen" data-v="kid"/.test(h) &&
      !/data-a="llcount"/.test(h)
  );
  chk(
    "a marker moves no date",
    llCalc(c, { ret: null, own: { [own[0].id]: true } }).on === false ||
      llCalc(c, { ret: null, own: { [own[0].id]: true } }).moved.length === 0
  );
  const before = llCalc(c, null);
  kitStore(c, "sim_kid").cost = { v: 12000, cf: 2 };
  E = llOwnEffect(c, own[0]);
  const def = SIMS.kid,
    xk = simInputs(c, def, { when: 3 }),
    rk = simRaw(c, def, xk);
  chk(
    "with the player's own cost it counts, through the simulator's own option",
    E.state === "ok" &&
      E.opt.monthly === rk.options[0].extra &&
      E.opt.once === (rk.options[0].once || 0) &&
      E.opt.monthly > 0
  );
  X("llcount", own[0].id);
  Xw = llCalc(c, W.wi);
  const fiW = by(Xw, "st:FI"),
    fiE = freeAt(c, E.opt);
  chk(
    "the FI date of the what-if is the plan run with that option (freeAt)",
    fiE == null ? fiW.state === "need" : fiW.months === Math.max(0, Math.round(fiE)),
    fiW.months + " / " + fiE
  );
  chk(
    "and it is later than the plan's FI date, shown as a shift",
    by(before, "st:FI").state !== "dated" || fiW.lost || fiW.shift > 0
  );
  chk(
    "counting it changes nothing in the saved plan but the marker",
    freeAt(c) === freeAt(Object.assign(clone(c), { x: Object.assign({}, c.x, { life: undefined }) }))
  );
  h = ov();
  chk(
    "the band says a milestone of your own stays a what-if",
    /data-ll="band"/.test(h) && !/data-a="llkeep"/.test(h) && text(h).includes("never changes your saved plan")
  );
  X("llmove", "1");
  chk("1 year later moves the marker", C().x.life.own[0].age === c.age + 4);
  X("llmove", "-1");
  chk("1 year sooner moves it back", C().x.life.own[0].age === c.age + 3);
  W.o.name = "Twins";
  X("llname", own[0].id);
  chk("the name is the only typing", C().x.life.own[0].n === "Twins" && text(ov()).includes("Twins"));
  X("llgone", own[0].id);
  chk(
    "Take it off my line removes it, with a way back",
    C().x.life.own.length === 0 && /data-a="llputback"/.test(ov()) && !llCalc(C(), W.wi).on
  );
  X("llputback");
  chk("Put it back restores it", C().x.life.own.length === 1 && C().x.life.own[0].n === "Twins");
  X("lladd");
  X("llkind", "home");
  X("llwhen", "5");
  own = C().x.life.own;
  E = llOwnEffect(C(), own[1]);
  chk(
    "a home is a marker with no effect, and says so",
    E.state === "none" && /no sourced cost/.test(E.why) && /data-a="simopen" data-v="rentbuy"/.test(ov())
  );

  /* 5. A PLAYER WITH COSTLY DEBT */
  c = fresh1(true);
  P = llCalc(c, null);
  const dp = dbPlan(c, "avalanche", 0),
    db = by(P, "debt");
  chk(
    "costly debt: the debt marker is the end of the debt plan (dbPlan)",
    db && (dp.months == null ? db.state === "need" : db.months === dp.months),
    db && db.months + " / " + dp.months
  );
  X("lifeline");
  h = ov();
  chk(
    "the debt marker is on the sheet, with no red and no verdict word",
    /data-ll="debt"/.test(h) && !/\b(mistake|failed|behind|off track|bad|poor)\b/i.test(text(h))
  );
  /* a goal that is not placed has no date: the incomplete state */
  c.goals.push({ id: "gtest", k: "Travel", n: "Big trip", cost: 5000, fund: 0, era: null, d: todayISO() });
  P = llCalc(c, null);
  const gm = by(P, "goal:gtest");
  chk(
    "a goal with no place on the path is not on the line: it waits with what to do",
    gm && gm.state === "need" && gm.months == null && P.wait.includes(gm) && /Place this goal/.test(gm.need)
  );
  drawSheet();
  h = ov();
  chk(
    "the sheet shows it under Not on the line yet",
    text(h).includes("Not on the line yet") && /data-ll="wait"/.test(h)
  );
  c.goals[c.goals.length - 1].era = derive(c).era;
  P = llCalc(c, null);
  const ga = goalSim(c).goalAt.gtest;
  chk(
    "placed, its date is the plan run's date for the goal (goalSim)",
    ga == null ? by(P, "goal:gtest").state === "need" : by(P, "goal:gtest").months === Math.max(0, ga)
  );
  /* an age that is not set */
  const death0 = c.death;
  c.death = null;
  chk("no age the plan pays to: the marker waits, it is not age 0", by(llCalc(c, null), "end").state === "need");
  c.death = death0;

  /* 6. WHERE IT LIVES */
  chk(
    "one menu row, in Plans and what-ifs",
    MENU.filter(m => m[1] === "lifeline").length === 1 &&
      MENU_GROUPS.find(g => g[0] === "plans")[3].includes("lifeline")
  );
  chk(
    "a new player sees the row after the reveal, not before",
    fwRowRule("lifeline", "plans", { short: true, seen: {}, rev: false, weekOver: false }) === "" &&
      fwRowRule("lifeline", "plans", { short: true, seen: {}, rev: true, weekOver: false }) === "unlocked"
  );
  chk("the life map has the way to the timeline", /data-a="lifeline"/.test(ltMapHtml(c, derive(c))));
  closeSheet();
  X("menu");
  h = ov();
  chk(
    "players see no coach rows in the menu",
    !/data-g="coach"/.test(h) && !/data-g="admin"/.test(h) && !/data-v="session"/.test(h)
  );
  closeSheet();
  G = G0;
}
