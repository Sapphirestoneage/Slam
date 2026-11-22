// ---------- meet your character ----------
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo;
  G.demo = false;
  const a = Object.assign(newChar(), {
    name: "Rae",
    led: true,
    placed: true,
    age: 29,
    take: 5000,
    spend: 3500,
    inv: 30000,
    incs: [{ k: "A main job", amt: 5000, s: true, cf: 3 }],
    spends: [
      { k: "Home", amt: 1500, s: true, cf: 3 },
      { k: "Everything else", amt: 2000, s: true, cf: 3 },
    ],
    cashes: [{ k: "Checking", amt: 4000, s: true, cf: 3 }],
    invs: [{ k: "Retirement", amt: 30000, s: true, cf: 3 }],
    debts: [],
    x: {},
  });
  const tour0 = G.tourSeen;
  G.tourSeen = "2026-01-01";
  G.chars.push(a);
  G.active = n0;
  save();
  go("home");
  chk(
    "Home offers it once, plainly, under the main tiles",
    app().includes("Meet your character") &&
      app().includes('class="rowbtn homerow" data-a="reveal"') &&
      app().indexOf('class="quad"') > 0 &&
      app().indexOf('class="quad"') < app().indexOf('data-a="reveal"'),
    ""
  );
  go("me");
  chk("Me has the row too", app().includes("Meet your character"));
  X("reveal");
  chk(
    "card 1: name, age, chapter",
    W.kind === "reveal" &&
      W.i === 0 &&
      ov().includes("Rae") &&
      ov().includes("Your chapter") &&
      ov().includes("1 of 6") &&
      clean(ov()),
    junk(ov())
  );
  X("rvnext");
  chk(
    "card 2: the era and what is next",
    ov().includes("Your era") && ov().includes("of 9") && clean(ov()),
    junk(ov())
  );
  X("rvnext");
  chk(
    "card 3: who you are and who you are becoming",
    ov().includes("right now you are") && ov().includes(identityNow(C(), D).n) && clean(ov()),
    junk(ov())
  );
  X("rvnext");
  const R = rvData(C(), D);
  chk(
    "card 4: strongest number only from real numbers",
    ov().includes("Your strongest number") &&
      (R.strong ? ov().includes(R.strong.n) : ov().includes("Still forming") || ov().includes("Not known yet")) &&
      clean(ov()),
    junk(ov())
  );
  X("rvnext");
  chk(
    "card 5: the one worth a look, never a grade",
    ov().includes("The one worth a look") &&
      !/bad|fail|poor|behind/i.test(ov().replace(/<[^>]+>/g, " ")) &&
      clean(ov()),
    junk(ov())
  );
  X("rvnext");
  chk("card 6: one quest", ov().includes("Your quest") && ov().includes(esc(R.quest)));
  X("rvnext");
  chk(
    "the whole sheet, marked seen",
    W.i === 6 &&
      ov().includes("Your character sheet") &&
      ov().includes("Copy my character sheet") &&
      !!C().x.revSeen &&
      clean(ov()),
    junk(ov())
  );
  const tx = rvText(C(), D);
  chk("the sheet text has no dollar amounts", tx.includes("Rae") && tx.includes("Era ") && !/\$\d/.test(tx), tx);
  X("rvcopy");
  chk("copy confirms", W.copied && ov().includes("Copied"));
  X("close");
  go("home");
  chk("Home stops offering it once seen", !app().includes("Meet your character"));
  go("me");
  chk("Me keeps a way back", app().includes("My character sheet"));
  X("reveal");
  chk("opening again goes straight to the sheet", W.i === 6);
  X("rvagain");
  chk("and can replay", W.i === 0 && ov().includes("1 of 6"));
  const g = Object.assign(newChar(), { name: "Gus", led: true, placed: false, x: {} });
  G.chars.push(g);
  G.active = n0 + 1;
  save();
  go("home");
  const RG = rvData(C(), D);
  chk("all guesses: nothing is ranked", !RG.strong && !RG.watch && RG.real === 0);
  X("reveal");
  X("rvnext");
  X("rvnext");
  X("rvnext");
  chk("says so", ov().includes("a guess does not get ranked"));
  X("close");
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  if (tour0) G.tourSeen = tour0;
  else delete G.tourSeen;
  save();
  go("home");
}
