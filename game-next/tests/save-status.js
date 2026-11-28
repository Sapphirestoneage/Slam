/* ============================================================================
   SLAM the Game, test: tests/save-status.js
   PURPOSE     Examine the save status: the sample game must never say that it is saved.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: account/cloud.js.
   ========================================================================= */
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
