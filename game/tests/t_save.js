// ---------- Save status: the sample game must never claim it is saved ----------
{
  const db0 = CLOUD.db,
    demo0 = G.demo;
  CLOUD.db = {};
  G.demo = true;
  chk(
    "sample game with an account: the status says it is not saved",
    /^Sample game · not saved/.test(clStatus()),
    clStatus()
  );
  render();
  chk('sample game: no "Saved" claim in the status text', !/^Saved/.test(clStatus()));
  G.demo = false;
  CLOUD.st = "on";
  CLOUD.at = Date.now();
  chk("own game with an account: the status says saved", /^Saved to your account/.test(clStatus()), clStatus());
  chk("the first-game helper exists", typeof clFirstGame === "function");
  CLOUD.db = db0;
  G.demo = demo0;
}
