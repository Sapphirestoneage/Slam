// ---------- our household: picture, paperwork, agreement, one page ----------
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    fair0 = G.fair,
    hh0 = G.hh,
    house0 = JSON.stringify(G.house);
  G.demo = false;
  delete G.fair;
  delete G.hh;
  const R = r => Object.assign({ s: true, cf: 3 }, r);
  const mk = (n, t, sp, cash, debt) =>
    Object.assign(newChar(), {
      name: n,
      led: true,
      placed: true,
      age: 30,
      take: t,
      spend: sp,
      inv: 0,
      incs: [R({ k: "A main job", amt: t })],
      spends: [R({ k: "Home", amt: sp })],
      cashes: [R({ k: "Checking", amt: cash })],
      invs: [],
      debts: debt ? [R({ k: "Credit card balance", amt: debt, high: true })] : [],
      moves: [],
      x: { revSeen: "x" },
    });
  const S0 = hsSum(HS_SAMPLE);
  chk(
    "the made-up household adds up by hand",
    S0.inc === 11100 &&
      S0.spend === 7200 &&
      S0.left === 3900 &&
      S0.cash === 11200 &&
      S0.debt === 9500 &&
      S0.nw === 11200 + 48000 - 9500 &&
      Math.abs(S0.months - 11200 / 7200) < 1e-9 &&
      S0.full
  );
  chk(
    "if the biggest income stops: short 2,300 and the cash carries it under five months",
    hsStop(HS_SAMPLE, 0).left === -2300 &&
      Math.abs(hsStop(HS_SAMPLE, 0).months - 11200 / 2300) < 1e-9 &&
      hsStop(HS_SAMPLE, 2).left === 2400 &&
      hsStop(HS_SAMPLE, 2).months === null
  );
  chk(
    "the sample people are invented, not anyone in this game",
    HS_SAMPLE.every(p => !/jacob|brandon|eli\b/i.test(p.n))
  );
  G.chars.push(mk("Uma", 5000, 3000, 4000, 0), mk("Vee", 3000, 2500, 500, 2000), mk("Wyn", 2000, 1800, 300, 0));
  G.active = n0;
  save();
  go("home");
  chk(
    "the menu and the people sheet lead here",
    MENU.some(m => m[1] === "house") &&
      MENU.some(m => m[1] === "onepage") &&
      (() => {
        X("people");
        const ok = ov().includes('data-a="house"');
        X("close");
        return ok;
      })()
  );
  X("house");
  const P = hsPeople(),
    S = hsSum(P);
  chk(
    "real people: three profiles added up",
    W.kind === "house" &&
      P.filter(p => ["Uma", "Vee", "Wyn"].includes(p.n)).length === 3 &&
      P.every(p => p.full) &&
      ov().includes("Who brings what") &&
      ov().includes("If one person's income stopped") &&
      ov().includes("comes in a month") &&
      clean(ov()),
    junk(ov())
  );
  chk("the game's own older household setting is untouched", JSON.stringify(G.house) === house0);
  X("hssample", "1");
  chk(
    "the made-up one loads only inside this tool",
    hsGet().sample &&
      hsPeople()
        .map(p => p.n)
        .join() === "Rin,Sol,Tay" &&
      ov().includes("Made-up household") &&
      ov().includes("$11,100") &&
      G.chars.length === n0 + 3 &&
      !G.chars.some(c => c.name === "Rin")
  );
  X("hssample", "0");
  chk("and clears", !hsGet().sample && hsPeople().some(p => p.n === "Uma"));
  X("hstab", "docs");
  chk(
    "paperwork: eleven items, three states each, and it says it is not legal advice",
    HS_DOCS.length === 11 &&
      HS_DOCS.every(d => ov().includes(esc(d[1]))) &&
      ov().includes("not legal advice") &&
      ov().includes("different in every state") &&
      ov().includes("Not for us") &&
      clean(ov()),
    junk(ov())
  );
  X("hsdoc", "done", "will");
  X("hsdoc", "na", "kids");
  chk(
    "taps are kept and counted",
    hsGet().docs.will === "done" &&
      hsGet().docs.kids === "na" &&
      ov().includes("<b>1</b> done") &&
      ov().includes("<b>9</b> still open") &&
      ov().includes("✓ A will for each person")
  );
  const pt = hsText("papers");
  chk(
    "the open ones copy as questions, without the done or not-for-us ones",
    pt.includes("Questions for a lawyer") &&
      pt.split("\n").length === 10 &&
      !pt.includes("A will for each person") &&
      !pt.includes("children"),
    pt.slice(0, 200)
  );
  X("hstab", "ag");
  chk(
    "agreement: who decides, a limit, a review, five safeguards, and not agreed until they are true",
    ov().includes("Who decides the day-to-day money?") &&
      ov().includes("Uma leads") &&
      ov().includes("Five things that have to be true") &&
      ov().includes("Not an agreement yet") &&
      ov().includes("never limits what anyone can see or do") &&
      clean(ov()),
    junk(ov())
  );
  X("hsag", "Vee leads", "who");
  X("hsag", "100", "limit");
  X("hsag", "3", "review");
  chk(
    "choices are kept and a next look date shows",
    hsGet().ag.who === "Vee leads" && hsGet().ag.limit === 100 && ov().includes("Next look: ")
  );
  HS_SAFE.slice(0, 4).forEach(s => X("hssafe", s[0]));
  chk(
    "four of five is still not an agreement",
    ov().includes("Not an agreement yet") && ov().includes("1 of the five is not marked true")
  );
  X("hssafe", "end");
  chk("all five true: agreed", ov().includes("<b>Agreed.</b>") && HS_SAFE.every(s => hsGet().ag.safe[s[0]]));
  X("hssafe", "exit");
  chk("untick one and it stops counting", ov().includes("Not an agreement yet"));
  X("hssafe", "exit");
  const at = hsText("agree");
  chk(
    "copies with the safeguards listed",
    at.includes("Vee leads") && at.includes("$100") && at.split("[x]").length === 6
  );
  chk("ending is always one tap away", ov().includes('data-a="hsend"'));
  X("hsend");
  chk(
    "ended: gone, with a dated record and no blame",
    hsGet().ag === null &&
      hsGet().ended.length === 1 &&
      ov().includes("Ending one is allowed") &&
      !ov().includes('data-a="hsend"')
  );
  chk(
    "nothing in the tool can hide or lock anything",
    !/lock(ed)? out|hide from|restrict/i.test(hsPicture() + hsPapers() + hsAgBody())
  );
  X("close");
  X("onepage");
  const op = onePage(C(), D);
  chk(
    "one page: the month, the balance, key numbers with how sure, what is known, the household",
    W.kind === "onepage" &&
      op.includes("Uma, age 30") &&
      op.includes("MONTH: $5,000 in, $3,000 out, $2,000 left") &&
      op.includes("BALANCE: $4,000 cash") &&
      op.includes("HOW MUCH IS KNOWN:") &&
      op.includes("HOUSEHOLD OF " + hsPeople().length) &&
      op.includes("Paperwork still open: 9 of 11") &&
      /\((Guess|Close|Exact)\)/.test(op) &&
      clean(ov()),
    op.slice(0, 400)
  );
  X("opcopy");
  chk("copy confirms", W.copied === true);
  X("close");
  chk(
    "the checklist flipped four rows and every probe passes",
    [
      "Our household",
      "What only marriage gives you",
      "A money agreement between partners",
      "One page for a planner",
    ].every(n => btRows().some(r => r.n.startsWith(n) && r.st === "b")) && btCount(btRows()).x === 0
  );
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  if (fair0) G.fair = fair0;
  else delete G.fair;
  if (hh0) G.hh = hh0;
  else delete G.hh;
  save();
  go("home");
}
