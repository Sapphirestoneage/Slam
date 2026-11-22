/* ============================================================================
   SLAM the Game, test: tests/addon-sealed-files.js
   PURPOSE     Examine the sealed add-on files (x1.json, x2.json). Part 1: a sealed file shows no
               readable word. Part 2: each sealed file opens to its exact source, and a wrong key
               opens nothing.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. The sealed files in
               game/. For part 2: the private folder with the add-on source.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: account/addon.js, x1.json, x2.json.
   RULES       The add-on source is private. It is not in this repository. Part 2 runs only when the
               private folder exists. Set the environment variable SLAM_PACKS_DIR to its path.
               With no folder, part 2 prints SKIP and part 1 runs alone.
   ========================================================================= */
{
  const fs = require("fs"),
    packs = (process.env.SLAM_PACKS_DIR || "/home/claude/packs").replace(/\/?$/, "/");

  // Part 1. Each sealed file in game/ shows no readable word (three words of four letters or more in a row).
  fs.readdirSync(GAME_DIR)
    .filter(f => /^x\d+\.json$/.test(f))
    .sort()
    .forEach(f => {
      const j = JSON.parse(fs.readFileSync(GAME_DIR + f, "utf8"));
      chk(
        "the sealed file shows no readable word: " + f,
        !/[A-Za-z]{4,} [A-Za-z]{4,} [A-Za-z]{4,}/.test(Buffer.from(j.d, "base64").toString("latin1"))
      );
    });

  // Part 2. With the private folder: each sealed file opens to its exact source, and a wrong key opens nothing.
  if (!fs.existsSync(packs + "vault.json")) skip("part 2 needs the private add-on folder (SLAM_PACKS_DIR)");
  else {
    const V = JSON.parse(fs.readFileSync(packs + "vault.json", "utf8"));
    Object.keys(V).forEach(id => {
      const x = V[id],
        j = JSON.parse(fs.readFileSync(GAME_DIR + x.f, "utf8")),
        src = fs.readFileSync(packs + id + ".src.js", "utf8");
      chk("the sealed file opens to the exact source: " + x.f, adOpen(j.d, x) === src);
      chk(
        "a wrong key opens nothing: " + x.f,
        adOpen(j.d, Object.assign({}, x, { k: x.k.replace(/^../, x.k.slice(0, 2) === "00" ? "01" : "00") })) === null
      );
    });
  }
}
