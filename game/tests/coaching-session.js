// ---------- Coaching session: a list to send, and a fast picture in one tap for each area ----------
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo;
  const c = Object.assign(newChar(), { name: "Cl", placed: true, work: "Working", home: "Renting" });
  applyTypical(c);
  c.led = true;
  syncAll(c);
  G.demo = false;
  G.chars.push(c);
  G.active = n0;
  save();
  X("session");
  let o = ov();
  chk(
    "opens on the fast picture: five areas, one row of amounts each, and a counter",
    W.kind === "session" &&
      (o.match(/data-a="ssfast"/g) || []).length >= 6 &&
      (o.match(/data-a="ssfast"/g) || []).length <= 12 &&
      (o.match(/data-a="ssopen"/g) || []).length === 4 &&
      o.includes("0 of 5 set") &&
      o.includes("gloss:fastpic") &&
      clean(o),
    junk(o)
  );
  X("ssfast", "4250", "take");
  chk(
    "one tap sets the income total from the client",
    c.take === 4250 && allocSplit(c, "take").guess === 4250 && !isSharp(c, "take") && ov().includes("1 of 5 set")
  );
  X("ssfast", "3000", "spend");
  chk(
    "spending lines are scaled to the total, and stay guesses",
    c.spend === 3000 && c.spends.every(x => !x.s) && Math.abs(rsum(c.spends) - 3000) < 1
  );
  X("ssfast", "10000", "debt");
  chk(
    "a debt total makes one guessed debt when there is none",
    c.debt === 10000 && c.debts.length === 1 && !c.debts[0].s
  );
  X("ssfast", "0", "debt");
  chk("None sets debt to $0", c.debt === 0);
  X("ssfast", "7500", "cash");
  X("ssfast", "35000", "inv");
  chk(
    "five taps give the whole picture",
    ov().includes("5 of 5 set") && c.cash === undefined ? true : ov().includes("5 of 5 set")
  );
  c.incs[0].s = true;
  c.incs[0].amt = 5000;
  syncAll(c);
  X("ssfast", "2000", "take");
  drawSheet();
  chk(
    "an area with real lines is not changed",
    c.take === 5000 && ov().includes("Real already"),
    JSON.stringify([c.take, c.incs, W.kind])
  );
  X("sharp", "take");
  chk("then one button goes on to make the numbers real", W.kind === "sharp");
  X("close");
  X("session", "bring");
  o = ov();
  chk(
    "the list to send: six things to have open, and a copy button",
    (o.match(/<b>/g) || []).length >= 6 &&
      o.includes("Your credit card apps") &&
      o.includes('data-a="sscopy"') &&
      clean(o)
  );
  chk(
    "the message is plain and has every item",
    SS_BRING.every(b => ssMsg().includes(b[1])) && !/\u2014/.test(ssMsg())
  );
  chk(
    "the menu has it",
    MENU.some(m => m[1] === "session")
  );
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  closeSheet();
  save();
  go("home");
}
