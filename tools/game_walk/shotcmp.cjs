/* ============================================================================
   tools/game_walk/shotcmp.cjs
   PURPOSE     Compare two folders of screenshots from shots.cjs.
   USAGE       node tools/game_walk/shotcmp.cjs old-folder new-folder
   INPUT       Two folders with PNG files that have the same names.
   OUTPUT      The number of files that are the same byte for byte, and the name of each file that differs.
   DEPENDS ON  Nothing.
   EXIT        0 when all files are the same, or when only the multipliers board differs (its coin moves
               all the time). 1 for each other difference.
   ========================================================================= */
const fs = require("fs"),
  path = require("path");
const [A, B] = process.argv.slice(2);
const fa = fs
    .readdirSync(A)
    .filter(f => f.endsWith(".png"))
    .sort(),
  fb = fs
    .readdirSync(B)
    .filter(f => f.endsWith(".png"))
    .sort();
const onlyOne = fa.filter(f => !fb.includes(f)).concat(fb.filter(f => !fa.includes(f)));
const differ = fa.filter(
  f => fb.includes(f) && !fs.readFileSync(path.join(A, f)).equals(fs.readFileSync(path.join(B, f)))
);
const real = differ.filter(f => !/_sheet-mult\.png$/.test(f));
console.log(
  `screens compared: ${fa.length}. the same: ${fa.length - differ.length - onlyOne.filter(f => fa.includes(f)).length}. different: ${differ.length}. in one folder only: ${onlyOne.length}.`
);
differ.forEach(f =>
  console.log("  different: " + f + (real.includes(f) ? "" : "   (the multipliers board: its coin moves)"))
);
onlyOne.forEach(f => console.log("  in one folder only: " + f));
process.exit(real.length || onlyOne.length ? 1 : 0);
