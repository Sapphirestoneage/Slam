/* ============================================================================
   tools/game_walk/cmp.cjs
   PURPOSE     Compare two records from walk.cjs.
   USAGE       node tools/game_walk/cmp.cjs old.json new.json
   INPUT       Two JSON files from walk.cjs, made with the same seeds, steps, variant and states.
   OUTPUT      "SAME: <n> walks, <m> records", or the first record that differs in each walk.
   DEPENDS ON  Nothing.
   EXIT        0 when the records are the same. 1 when they differ.
   ========================================================================= */
const fs = require("fs");
const [a, b] = process.argv.slice(2, 4).map(f => JSON.parse(fs.readFileSync(f, "utf8")));
let bad = 0,
  steps = 0;
for (const k of Object.keys(a.walks)) {
  const x = a.walks[k],
    y = b.walks[k] || [];
  steps += x.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++)
    if (x[i] !== y[i]) {
      bad++;
      console.log(
        `seed ${k} differs at record ${i}:\n  A: ${x[i]}\n  B: ${y[i]}` + (i ? `\n  (previous: ${x[i - 1]})` : "")
      );
      break;
    }
}
console.log(
  bad
    ? `${bad} of ${Object.keys(a.walks).length} walks differ`
    : `SAME: ${Object.keys(a.walks).length} walks, ${steps} records`
);
process.exit(bad ? 1 : 0);
