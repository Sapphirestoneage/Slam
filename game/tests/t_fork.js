// ---------- Fork Theory ----------
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    R = r => Object.assign({ s: false }, r),
    a = Object.assign(newChar(), {
      name: "Fen",
      led: true,
      placed: true,
      age: 30,
      ret: 60,
      take: 4000,
      spend: 3000,
      inv: 5000,
      incs: [R({ k: "A main job", amt: 4000 })],
      spends: [R({ k: "Home", amt: 1800 }), R({ k: "Subscriptions", amt: 60 })],
      cashes: [R({ k: "Checking", amt: 900 })],
      invs: [],
      debts: [R({ k: "Store card", amt: 120 })],
    });
  G.demo = false;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C();
  chk(
    "Home invites a first fork check, slim, with a button",
    app().includes("What is poking you today?") && app().includes('data-a="fork"')
  );
  X("fork");
  let o = ov();
  chk(
    "step 1: twelve chips plus Something else, an i, one main button",
    W.kind === "fork" &&
      (o.match(/data-a="fktog"/g) || []).length === 12 &&
      o.includes("Something else") &&
      o.includes("gloss:forks") &&
      (o.match(/class="primary[^"]*"/g) || []).length === 1 &&
      clean(o)
  );
  X("fktog", "bill");
  X("fktog", "debt");
  X("fktog", "hungry");
  X("fktog", "job");
  o = ov();
  chk(
    "picked chips are marked and removable",
    fkX(c).f.length === 4 && (o.match(/class="chip on"/g) || []).length === 4 && o.includes("Next: size them (4)")
  );
  X("fktog", "job");
  chk("tapping again takes it off", fkX(c).f.length === 3 && !fkX(c).f.find(f => f.k === "job"));
  X("fkmore");
  o = ov();
  chk(
    "Something else opens a preset list, no typing",
    (o.match(/data-a="fktog"/g) || []).length === 22 && !o.includes("<input")
  );
  X("fkmore");
  X("fknext");
  o = ov();
  chk(
    "step 2 is its own screen: one fork, three sizes with an example each",
    W.step === "size:0" &&
      o.includes("Fork 1 of 3") &&
      o.includes("Escargot fork") &&
      o.includes("Dinner fork") &&
      o.includes("Pitchfork") &&
      (o.match(/data-a="fksize"/g) || []).length === 3 &&
      o.includes("1 point") &&
      o.includes("10 points")
  );
  X("fksize", "1");
  chk("a tap moves to the next fork", W.step === "size:1" && fkX(c).f[0].s === 1);
  X("fksize", "10");
  X("fksize", "3");
  o = ov();
  chk(
    "step 3 asks for the biggest, tap one",
    W.step === "big" && o.includes("Which one is your biggest fork?") && (o.match(/data-a="fkbig"/g) || []).length === 3
  );
  X("fkbig", "debt");
  o = ov();
  chk(
    "the exchange game starts at 3 small forks, two buttons",
    W.step === "game:0" &&
      o.includes("Deal with 3 small forks") &&
      o.includes("Deal with your biggest fork") &&
      (o.match(/data-a="fkpick"/g) || []).length === 2
  );
  X("fkpick", "small");
  chk("rather the small ones: the number goes up", W.step === "game:1" && ov().includes("Deal with 6 small forks"));
  X("fkpick", "small");
  X("fkpick", "big");
  o = ov();
  chk(
    "the answer flips between 6 and 10: about 8",
    fkX(c).rate === 8 &&
      fkX(c).rateFor === "debt" &&
      o.includes("Your biggest fork = about 8 small ones") &&
      o.includes("Does this feel right?") &&
      o.includes('data-a="fkyes"') &&
      o.includes('data-a="fkredo"')
  );
  X("fkredo");
  chk("Redo starts the game again", W.step === "game:0" && fkX(c).rate === null);
  X("fkpick", "big");
  chk("fewer than 3 reads as about 2", fkX(c).rate === 2);
  X("fkredo");
  X("fkpick", "small");
  X("fkpick", "small");
  X("fkpick", "big");
  X("fkyes");
  o = ov();
  chk(
    "load: 1 + 8 + 3 = 12 of 10, the biggest counts at its exchange rate",
    fkLoad(c) === 12 &&
      fkX(c).lim === 10 &&
      fkFull(c) &&
      o.includes("12 of 10 points") &&
      o.includes("You're full right now")
  );
  chk(
    "one quick pull shows near the limit, matched to the biggest fork and the profile, with three buttons and a way to see the rest",
    o.includes("Pay off Store card ($120)") &&
      (o.match(/data-a="fkpull"/g) || []).length === 3 &&
      o.includes("Show 2 more") &&
      (o.match(/class="primary[^"]*"/g) || []).length === 2
  );
  X("fkall");
  o = ov();
  chk(
    "Show more lists the others, still one main Done",
    o.includes("Cancel one subscription") &&
      o.includes("Eat something") &&
      (o.match(/data-a="fkpull"/g) || []).length === 9 &&
      (o.match(/class="primary slim"/g) || []).length === 1
  );
  chk("the day score and the plate size come from the load now", c.spoons === 1 && c.slots === 3);
  chk(
    "history keeps one dated entry a day",
    fkX(c).hist.length === 1 &&
      fkX(c).hist[0].d === todayISO() &&
      fkX(c).hist[0].l === 12 &&
      fkX(c).hist[0].big === "debt"
  );
  closeSheet();
  go("home");
  o = app();
  chk(
    "Home shows the slim meter, collapsed, in amber when full",
    o.includes("fkrow") &&
      o.includes('class="hot') &&
      !o.includes("fkmore") &&
      o.includes("You're full right now") &&
      !/\b0%/.test(o.match(/aria-label="\d+% of your limit"/)[0])
  );
  chk(
    "at the limit the Do-this card is one quick pull",
    nextStep(c, derive(c)).s.includes("Everything else can wait") && nextStep(c, derive(c)).a === "fkopen"
  );
  go("plan");
  o = app();
  chk(
    "Next Steps shows one pull and the line, nothing else",
    o.includes("Everything else can wait.") &&
      (o.match(/class="tile stack fkpull"/g) || []).length === 1 &&
      !o.includes("msboard")
  );
  go("home");
  X("fkopen");
  o = app();
  chk(
    "tapping the meter opens it: forks, sizes, biggest, limit nudges",
    o.includes("fkmore") &&
      o.includes("Biggest") &&
      o.includes('data-a="fklim" data-v="-1"') &&
      o.includes("About right") &&
      o.includes('data-a="fklim" data-v="1"')
  );
  X("fklim", "1");
  chk(
    "Higher nudges the limit by 2 and marks it yours",
    fkX(c).lim === 12 && fkX(c).limOk === true && !fkFull(c) === false
  );
  X("fklim", "-1");
  X("fkpull", "done", "pay:Store card", { l: "debt" });
  chk(
    "Done steps the fork down and lightens the load",
    fkX(c).f.find(f => f.k === "debt").s === 3 &&
      fkLoad(c) === 1 + 4 + 3 &&
      fkX(c).pulls["pay:Store card"].st === "done"
  );
  closeSheet();
  chk(
    "below the limit the game opens back up",
    !fkFull(c) && c.slots === 3 && !nextStep(c, derive(c)).s.includes("Everything else can wait")
  );
  const l0 = fkLoad(c);
  X("fkpull", "na", "sub", { l: "bill" });
  chk(
    "Doesn't apply hides that pull for today, offers the next one for that fork, and leaves the load alone",
    fkLoad(c) === l0 && !fkPullList(c).some(p => p.id === "sub") && fkPullList(c).some(p => p.id === "p:bill")
  );
  X("fkpull", "later", "p:bill", { l: "bill" });
  chk("Later does the same", fkLoad(c) === l0 && !fkPullList(c).some(p => p.k === "bill"));
  X("daily");
  o = ov();
  chk(
    "the daily check-in asks about forks, not a 1-to-5 score",
    !o.includes("How well did you do with money today") &&
      (o.includes("What is poking you today?") || W.step !== undefined)
  );
  closeSheet();
  X("coach");
  o = ov();
  chk(
    "the coach view lists each person’s load and biggest fork",
    o.includes("Fork load, from each person") && o.includes("Fen") && o.includes("biggest is Debt or collections calls")
  );
  closeSheet();
  X("glossary");
  chk(
    "every new term has an explanation, with the credit line",
    ["forks", "forksize", "forkbig", "forkrate", "forkmeter", "forklimit", "pull"].every(
      k => GLOSS[k] && GLOSS[k][1].length > 30
    ) &&
      GLOSS.forks[1].includes("jenroses") &&
      GLOSS.forks[1].includes("Christine Miserandino")
  );
  closeSheet();
  chk(
    "the built list has the row and it passes",
    btRows().some(r => /^Fork Theory/.test(r.n) && r.st === "b")
  );
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  save();
  go("home");
}
