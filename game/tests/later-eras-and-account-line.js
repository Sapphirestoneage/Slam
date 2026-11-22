/* ============================================================================
   SLAM the Game, test: tests/later-eras-and-account-line.js
   PURPOSE     Examine the steps for Future You and for eras 6 to 9, the key moments, and the account
               line.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/eras.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    R2 = r => Object.assign({ s: true, cf: 3 }, r);
  const mk = (o, grand) => {
    const p = Object.assign(
      newChar(),
      {
        led: true,
        placed: true,
        name: "Jo",
        age: 30,
        ret: 60,
        work: "Working",
        match: "yes",
        high: "no",
        tax: "no",
        take: 6000,
        incs: [R2({ k: "A main job", amt: 6000 })],
        spends: [
          R2({ k: "Home", amt: 2000 }),
          R2({ k: "Food", amt: 800 }),
          R2({ k: "Fun and everything else", amt: 700 }),
        ],
        cashes: [R2({ k: "Savings", amt: 40000 })],
        invs: [R2({ k: "401k", amt: 60000 })],
        debts: [],
      },
      o
    );
    if (grand != null) p.x = Object.assign(p.x || {}, { es: { grand } });
    syncAll(p);
    return p;
  };
  G.demo = false;
  const a = mk({}, 0);
  G.chars.push(a);
  G.active = n0;
  save();
  go("home");
  let c = C(),
    d = derive(c);
  chk(
    "a new player with Fortress numbers stops before Future You until its key moment",
    d.era === 4 && d.g[4] && !d.g[5] && d.starWait === 5,
    JSON.stringify([d.era, d.g, d.starWait])
  );
  let st = eraSteps(c, d, 5).map(x => x.id);
  chk(
    "Future You has real steps, and keeps its protection steps and the 740 score",
    ["fy_rothopen", "fy_rothfill", "fy_hsaopen", "fy_hsafill", "fy_work", "fy_star"].every(k => st.includes(k)) &&
      st.includes("cd_740") &&
      st.includes("sf_benef"),
    st.join(",")
  );
  chk(
    "the key moment is marked with a star",
    eraSteps(c, d, 5)
      .find(x => x.id === "fy_star")
      .title.indexOf("★") === 0
  );
  X("node", "fy_hsaopen");
  let o = ov();
  chk(
    "a step screen: why, how, an i, the HSA question, and the four ways to answer",
    W.kind === "estep" &&
      o.includes("How to do it") &&
      o.includes("gloss:es_hsa") &&
      o.includes("Does your health plan allow an HSA?") &&
      o.includes("I did this") &&
      o.includes("Working on it") &&
      o.includes("I already did this") &&
      o.includes("Doesn't apply to me") &&
      !o.includes("<input") &&
      clean(o),
    junk(o)
  );
  X("esans", "no", "hsa");
  d = derive(c);
  chk("no HSA on the health plan: both HSA steps stop applying", !eraSteps(c, d, 5).some(x => /hsa/.test(x.id)));
  X("esans", "no", "hsa");
  chk(
    "tapping the answer again takes it back",
    eraSteps(c, derive(c), 5).some(x => x.id === "fy_hsaopen")
  );
  X("node", "fy_rothfill");
  o = ov();
  chk(
    "filling the Roth has four ranks and shows the math with a status",
    ["25%", "50%", "75%", "100%"].every(k => o.includes(">" + k + "<")) &&
      o.includes("Show the math") &&
      o.includes("$7,500") &&
      o.includes('class="tile stack acline"') &&
      /Exact numbers|Close, not exact|A guess so far/.test(o)
  );
  X("esdone", "fy_rothfill", "2");
  chk(
    "halfway counts as working on it at rank 2",
    esRank(c, derive(c), "fy_rothfill") === 2 && esX(c).s.fy_rothfill.st === "work" && !derive(c).g[5]
  );
  X("esdone", "fy_rothfill", "4");
  chk(
    "100% is done, but the key moment also needs the workplace plan",
    esRank(c, derive(c), "fy_rothfill") === 4 && !derive(c).g[5]
  );
  X("node", "fy_work");
  X("eswork", "fy_work");
  chk(
    "working on it is remembered and is not done",
    esX(c).s.fy_work.st === "work" && esRank(c, derive(c), "fy_work") === 0
  );
  X("esalready", "fy_work");
  d = derive(c);
  chk(
    "already done counts, the key moment ticks itself, and Future You opens",
    esRank(c, d, "fy_work") === 1 && esRank(c, d, "fy_star") === 1 && d.g[5] && d.era >= 5 && !!esX(c).star[5],
    JSON.stringify([d.era, d.g])
  );
  X("node", "fy_star");
  o = ov();
  chk(
    "the key moment screen shows its two parts and says it is reached",
    o.includes("★") &&
      o.includes("Reached") &&
      (o.match(/class="rowbtn" data-a="node"/g) || []).length === 2 &&
      clean(o)
  );
  esX(c).s.fy_rothfill.y = "2025";
  d = derive(c);
  chk(
    "a new year starts the yearly step fresh, and the key moment stays reached",
    esRank(c, d, "fy_rothfill") === 0 && d.g[5] && d.era >= 5
  );
  chk(
    "undone steps of an era you are in count toward the 85% mark",
    unfinished(c, d).list.some(x => x.id === "fy_rothfill") && unfinished(c, d).weak === true
  );
  X("esna", "fy_hsaopen");
  chk(
    "doesn't apply removes a step, and it can be brought back",
    !eraSteps(c, derive(c), 5).some(x => x.id === "fy_hsaopen")
  );
  X("node", "fy_hsaopen");
  chk("bring it back is offered", ov().includes("Bring it back"));
  X("esundo", "fy_hsaopen");
  chk(
    "back",
    eraSteps(c, derive(c), 5).some(x => x.id === "fy_hsaopen")
  );
  // eras 6 to 9
  c.invs[0].amt = 5000000;
  syncAll(c);
  save();
  d = derive(c);
  chk(
    "numbers for Freedom, but each era waits for its own key moment",
    d.g[6] && d.g[7] && d.g[8] && d.era === 5 && d.starWait === 6,
    JSON.stringify([d.era, d.g, d.starWait])
  );
  go("home");
  let ns = nextStep(c, derive(c));
  chk(
    "the missing key moment becomes the one thing to do",
    ns.t.indexOf("★") === 0 && ns.a === "node" && ns.v === "q_star",
    JSON.stringify(ns)
  );
  [6, 7, 8, 9].forEach(e => {
    const L = eraSteps(c, derive(c), e);
    chk(
      "era " + e + " has steps and exactly one key moment",
      L.length >= 4 && L.filter(x => x.star).length === 1,
      L.map(x => x.id).join(",")
    );
  });
  X("node", "q_star");
  X("esans", "ease", "re1");
  X("esdone", "q_star", "1");
  d = derive(c);
  chk("the reevaluation moment opens Quiet Quitting FI", d.era === 6 && d.starWait === 7);
  X("node", "c_star");
  X("esdone", "c_star", "1");
  d = derive(c);
  chk("the second reevaluation opens Coast", d.era === 7 && d.starWait === 8);
  X("node", "f_method");
  X("esans", "gk", "wm");
  chk("picking a method offers that method on your numbers", ov().includes('data-a="idea" data-v="gk"'));
  X("node", "f_pay");
  chk(
    "the first paycheck uses the method",
    ov().includes("guardrails, starting at 5%") && ov().includes(money(Math.round((c.inv * 0.05) / 12)))
  );
  X("esdone", "f_pay", "1");
  d = derive(c);
  chk(
    "a method plus a planned first paycheck is the Freedom key moment",
    esRank(c, d, "f_star") === 1 && d.era === 8,
    JSON.stringify([d.era, d.gs])
  );
  c.legacy = true;
  save();
  d = derive(c);
  chk("Legacy waits for the graduation choice", d.g[9] && d.era === 8 && d.starWait === 9);
  X("node", "l_star");
  X("esans", "teach", "grad");
  X("esdone", "l_star", "1");
  chk("and opens with it", derive(c).era === 9);
  // every step screen
  {
    const bad = [],
      miss = {};
    ES.forEach(s => {
      try {
        X("node", s.id);
        const h = ov();
        if (W.kind !== "estep" || !clean(h) || /\u2014/.test(h)) bad.push(s.id + " " + junk(h));
        (h.match(/gloss:[a-z0-9_]+/g) || []).forEach(k => {
          if (!GLOSS[k.slice(6)]) miss[k] = s.id;
        });
        if ((h.match(/class="primary[^"]*"/g) || []).length > 1) bad.push(s.id + " two main buttons");
        if (s.by && !h.includes("From: ")) bad.push(s.id + " no credit");
      } catch (e) {
        bad.push(s.id + " threw " + String(e).slice(0, 80));
      }
    });
    X("close");
    chk(
      "every step opens clean, with one main button at most and a credit where it borrows an idea",
      bad.length === 0,
      bad.slice(0, 5).join(" | ")
    );
    chk("every i on a step has a glossary entry", Object.keys(miss).length === 0, JSON.stringify(miss));
  }
  if (typeof PKSET === "function") {
    PKSET(PK1, false);
    X("node", "l_give");
    const off = ov();
    PKSET(PK1, true);
    X("node", "l_give");
    const on = ov();
    chk(
      "the giving plan gains its extra option only with the add-on",
      (on.match(/data-a="esans"/g) || []).length === (off.match(/data-a="esans"/g) || []).length + 1,
      [(off.match(/data-a="esans"/g) || []).length, (on.match(/data-a="esans"/g) || []).length]
    );
    X("close");
  }
  // nobody loses ground
  const g1 = mk({ name: "Old", tax: "yes", invs: [R2({ k: "401k", amt: 5000000 })] });
  G.chars.push(g1);
  G.active = n0 + 1;
  save();
  d = derive(C());
  chk(
    "a player who was already at Freedom stays there",
    d.era === 8 && esX(C()).grand === 8,
    JSON.stringify([d.era, esX(C()).grand])
  );
  chk(
    "their earlier answer counts as already done this year",
    esRank(C(), d, "fy_rothfill") === 4 && esRank(C(), d, "fy_work") === 1
  );
  // the account line
  const lo = mk(
    {
      name: "Lo",
      take: 3000,
      incs: [R2({ k: "A main job", amt: 3000 })],
      spends: [R2({ k: "Home", amt: 1500 }), R2({ k: "Food", amt: 700 })],
      invs: [R2({ k: "401k", amt: 5000 })],
      cashes: [R2({ k: "Savings", amt: 1500 })],
    },
    0
  );
  G.chars.push(lo);
  G.active = n0 + 2;
  save();
  c = C();
  d = derive(c);
  let Rr = acRec(c, d);
  chk(
    "low pay today: Roth first, and the line says why",
    Rr.roth &&
      Rr.rNow <= 0.12 &&
      /^Your Roth IRA, then your workplace plan/.test(Rr.line) &&
      /tax rate today/.test(Rr.line),
    Rr.line
  );
  chk("the first missing part to ask for is the HSA answer", acAsk(c, d, Rr)[2] === "fy_hsaopen");
  esX(c).a.hsa = "yes";
  c.match = "no";
  Rr = acRec(c, d);
  chk(
    "with a match to get and an HSA allowed, the order is match, HSA, then Roth",
    Rr.line.indexOf("Match first, then HSA, then your Roth IRA") === 0 &&
      Rr.order
        .map(q => q[0])
        .slice(0, 3)
        .join() === "match,hsa,roth",
    Rr.line
  );
  const hi = mk(
    {
      name: "Hi",
      ret: 65,
      take: 14000,
      incs: [R2({ k: "A main job", amt: 14000 })],
      spends: [R2({ k: "Home", amt: 2500 }), R2({ k: "Food", amt: 900 })],
      invs: [R2({ k: "401k", amt: 300000 })],
    },
    0
  );
  G.chars.push(hi);
  G.active = n0 + 3;
  save();
  c = C();
  d = derive(c);
  Rr = acRec(c, d);
  chk(
    "high pay and modest spending later: traditional first",
    !Rr.roth &&
      Rr.rNow > Rr.rLater &&
      /^Your workplace plan as traditional, then your Roth IRA/.test(Rr.line) &&
      !Rr.early,
    JSON.stringify([Rr.rNow, Rr.rLater, Rr.line])
  );
  {
    const e = mk({ name: "Early", ret: 50, take: 6500 }, 0),
      Re = acRec(e, derive(e));
    chk(
      "stopping before Social Security starts: it is left out of the retirement rate, and a bridge is in the order",
      Re.early && Re.order.some(q => q[0] === "tax") && Re.rLater === esBr(derive(e).fiSpend - 16100, false),
      JSON.stringify([Re.rLater, Re.order])
    );
  }
  chk(
    "bracket math: 2026 single, $100,000 taxable is 22% and $40,000 is 12%",
    esBr(100000, false) === 0.22 &&
      esBr(40000, false) === 0.12 &&
      esBr(40000, true) === 0.12 &&
      esBr(-5, false) === 0 &&
      esBr(20000, true) === 0.1
  );
  chk("the amounts never add up to more than what is kept", Rr.amt.reduce((t, q) => t + q[1], 0) <= Rr.kept + 1);
  chk(
    "Guess, Close or Exact follows how many parts are real",
    Rr.st === "Close" &&
      (() => {
        esX(c).a.hsa = "no";
        c.x.taxPct = 25;
        return acRec(c, d).st === "Exact";
      })()
  );
  G.active = n0 + 2;
  save();
  c = C();
  c.match = "no";
  save();
  go("home");
  chk(
    "the line shows on Home while Free Money is next",
    derive(c).era === 1 && app().includes('class="tile stack acline"') && app().includes("Which account first"),
    String(derive(c).era)
  );
  X("acwhy");
  o = ov();
  chk(
    "Why opens the order, rough amounts, the parts, the math, and replays the chain",
    W.kind === "acwhy" &&
      o.includes("The chain behind it") &&
      (o.match(/class="depw"/g) || []).length === 5 &&
      o.includes("The order") &&
      o.includes("Show the math") &&
      o.includes("gloss:acfirst") &&
      clean(o),
    junk(o)
  );
  X("close");
  W = { kind: "pay", o: null };
  let ps = "";
  try {
    X("payday");
    ps = ov();
  } catch (e) {}
  if (!ps.includes("acline")) {
    try {
      const ks = Object.keys(ACT).filter(k => /^pay/.test(k));
      ks.forEach(k => {
        if (!ps.includes("acline")) {
          try {
            X(k);
            ps = ov();
          } catch (e) {}
        }
      });
    } catch (e) {}
  }
  chk(
    "the line shows on the payday split",
    ps.includes('class="tile stack acline"'),
    Object.keys(ACT)
      .filter(k => /^pay/.test(k))
      .join(",")
  );
  X("close");
  // the mask, with the answers from today
  {
    const k = mk({ name: "Kid", deps: "Kids" }, 0),
      M = oxyMask(k);
    chk("someone with kids is asked for a tuition goal first", !M.on && M.next.id === "kids");
    k.goals = [
      {
        id: "gk",
        k: "Kids' tuition",
        n: "Kids' tuition",
        cost: 20000,
        s: true,
        era: 4,
        fund: 0,
        blk: null,
        d: todayISO(),
      },
    ];
    chk(
      "with the goal on the list the ask is gone",
      !oxyMask(k).parts.some(q => q.id === "kids") && GOAL_K.some(g => g[0] === "Kids' tuition")
    );
    const f = mk({ name: "Fid", age: 30, ret: 31, invs: [R2({ k: "401k", amt: 400000 })] }, 0),
      Mf = ((f.x.taxPct = 22), oxyMask(f)),
      pr = Mf.parts.find(q => q.id === "retire");
    chk(
      "either mark counts as on track: the plan by the stop age, or Fidelity's mark",
      pr.ok && /Fidelity/.test(pr.why),
      pr.why
    );
  }
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  closeSheet();
  save();
  go("home");
}
