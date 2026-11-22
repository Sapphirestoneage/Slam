/* ============================================================================
   SLAM the Game, test: tests/addon-sealed-files.js
   PURPOSE     Examine that each sealed add-on file opens to its exact source.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. Private files: see
               RULES.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: account/addon.js, x1.json, x2.json.
   ========================================================================= */
{
  const fs = require("fs"),
    V = JSON.parse(fs.readFileSync("/home/claude/packs/vault.json", "utf8"));
  Object.keys(V).forEach(id => {
    const x = V[id],
      j = JSON.parse(fs.readFileSync("/home/claude/game/" + x.f, "utf8")),
      src = fs.readFileSync("/home/claude/packs/" + id + ".src.js", "utf8");
    chk("the sealed file opens to the exact source: " + x.f, adOpen(j.d, x) === src);
    chk(
      "a wrong key opens nothing: " + x.f,
      adOpen(j.d, Object.assign({}, x, { k: x.k.replace(/^../, x.k.slice(0, 2) === "00" ? "01" : "00") })) === null
    );
    chk(
      "the sealed file shows no readable word: " + x.f,
      !/[A-Za-z]{4,} [A-Za-z]{4,} [A-Za-z]{4,}/.test(Buffer.from(j.d, "base64").toString("latin1"))
    );
  });
}
