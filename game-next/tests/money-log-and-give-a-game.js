/* ============================================================================
   SLAM the Game, test: tests/money-log-and-give-a-game.js
   PURPOSE     Examine the money log, and the tool that gives a person their game as a code.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/moneylog.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo;
  G.demo = false;
  const t = todayISO(),
    ym = t.slice(0, 7),
    a = Object.assign(newChar(), {
      name: "Lu",
      led: true,
      placed: true,
      take: 4000,
      spend: 3000,
      incs: [{ k: "A main job", amt: 4000, s: true, cf: 3 }],
      spends: [
        { k: "Home", amt: 1500, s: true, cf: 3 },
        { k: "Food", amt: 600, s: true, cf: 3 },
      ],
      cashes: [
        { k: "Checking", amt: 3000, s: true, cf: 3 },
        { k: "Savings", amt: 1000, s: true, cf: 3 },
      ],
      invs: [],
      debts: [{ k: "Credit card balance", amt: 900, high: true, s: true, cf: 3 }],
      moves: [],
      x: {},
    });
  G.chars.push(a);
  G.active = n0;
  save();
  go("money");
  const c = C();
  chk("My Money has a way in", app().includes('data-a="mlog"'));
  X("mlog");
  chk(
    "an empty month says how to log",
    W.kind === "mlog" && ov().includes("Nothing logged in") && ov().includes("Log something now") && clean(ov()),
    junk(ov())
  );
  c.moves.push(
    { d: t, t: "in", amt: 2000, src: "A main job", k: "Checking", delta: 2000 },
    { d: t, t: "out", amt: 120, cat: "Food", fk: "Checking", k: "Checking", delta: -120 },
    { d: t, t: "out", amt: 60, cat: "Fun", fk: "Checking", k: "Checking", delta: -60 },
    { d: t, t: "pay", amt: 200, k: "Credit card balance", fk: "Checking", delta: 0 },
    { d: t, t: "xfer", amt: 300, fk: "Checking", k: "Savings", delta: 0 },
    { d: "2020-01-05", t: "out", amt: 999, cat: "Food", fk: "Checking", k: "Checking", delta: -999 }
  );
  const S = lgSum(c, ym);
  chk(
    "the month adds up by kind",
    S.in === 2000 &&
      S.out === 180 &&
      S.debt === 200 &&
      S.moved === 300 &&
      S.left === 1620 &&
      S.cats.Food === 120 &&
      S.n === 5,
    JSON.stringify(S).slice(0, 200)
  );
  X("mlog");
  chk(
    "totals, where it went, every entry",
    ov().includes("came in") &&
      ov().includes("$2,000") &&
      ov().includes("went to debt") &&
      ov().includes("Where it went") &&
      ov().includes("Every entry (5)") &&
      ov().includes("$1,620") &&
      ov().includes("was left over") &&
      clean(ov()),
    junk(ov())
  );
  chk("old months are a chip", lgMonths(c).includes("2020-01"));
  X("lgmonth", "2020-01");
  chk("switching month", W.ym === "2020-01" && ov().includes("$999") && ov().includes("more went out than came in"));
  const tx = lgText(c, ym);
  chk(
    "copies as plain text",
    tx.includes("Money log:") &&
      tx.includes("Came in $2,000") &&
      tx.includes("Food: $120") &&
      tx.split("\n").length >= 9,
    tx
  );
  X("lgcopy", ym);
  chk("copy confirms", W.copied === ym);
  X("close");
  // handing over
  /* run 16, D12: what More options held is on the Me tab, under People settings */
  X("people");
  const noCode = !ov().includes('data-a="handoff"');
  X("close");
  X("tab", "me");
  X("ppmore");
  chk(
    "People settings on Me has the code hand-off, and the sheet People does not",
    app().includes('data-a="handoff"') && noCode
  );
  X("ppmore");
  X("tab", "home");
  X("handoff");
  chk(
    "pick a person or paste a code",
    W.kind === "handoff" &&
      ov().includes("Hand someone their game") &&
      ov().includes("Add from a code") &&
      ov().includes("Lu") &&
      clean(ov()),
    junk(ov())
  );
  X("hopick", String(n0));
  const code = hoCode(G.chars[n0]);
  chk(
    "one person as a code, nothing else in it",
    ov().includes("Hand Lu their game") &&
      code.startsWith("SLAM1:") &&
      !code.includes('"chars"') &&
      JSON.parse(code.slice(6)).name === "Lu"
  );
  X("hocopy");
  chk("copy confirms", W.copied === true && ov().includes("Copied"));
  chk(
    "junk is turned away kindly",
    !!hoRead("hello").err &&
      !!hoRead('SLAM1:{"name":"x"').err &&
      !!hoRead('SLAM1:{"name":"x"}').err &&
      !!hoRead("SLAM1:[1]").err
  );
  X("handoff");
  W.o.imp = "blah";
  X("hoadd");
  chk(
    "a bad paste shows why and adds no one",
    G.chars.length === n0 + 1 && !!W.err && ov().includes("doesn't look like")
  );
  W.o.imp = "Here you go: " + code;
  X("hoadd");
  chk(
    "a good paste adds them beside the others, renamed if the name is taken",
    G.chars.length === n0 + 2 &&
      G.chars[n0 + 1].name === "Lu (2)" &&
      G.active === n0 + 1 &&
      G.chars[n0 + 1].moves.length === 6 &&
      G.chars[n0].name === "Lu" &&
      ov().includes("Lu (2) is here"),
    JSON.stringify(G.chars.map(x => x.name))
  );
  X("close");
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  save();
  go("home");
}
