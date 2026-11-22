/* ============================================================================
   SLAM the Game: tests/run.cjs (the test runner)
   PURPOSE     Run each test file in its own process and print one summary.
   USAGE       npm run test:game                          Run all test files.
               node game/tests/run.cjs fork-theory.js     Run one file.
   INPUT       Each .js file in this folder: one file for each feature (README.md has the list).
               known-failures.json: the failures that are known, with the reason for each one.
   OUTPUT      One line for each file, then the totals, then the result of the version stamps.
   DEPENDS ON  harness.cjs, tools/game_stamp.cjs.
   EXIT        0 when all checks pass, or when the only failures are in known-failures.json.
               1 for a new failure, or for an old version stamp.
   RULES       A failure that is in known-failures.json is shown, not hidden.
               A test file that cannot run here prints a line that starts with SKIP. The runner
               shows that line.
   ========================================================================= */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const dir = __dirname;
const known = JSON.parse(fs.readFileSync(path.join(dir, "known-failures.json"), "utf8"));
const only = process.argv.slice(2);
// Each .js file in this folder is one test file. The runner does not read the folder "retired".
const files = fs
  .readdirSync(dir)
  .filter(f => /\.js$/.test(f) && (!only.length || only.includes(f)))
  .sort();

let ok = 0,
  failed = 0,
  fresh = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [path.join(dir, "harness.cjs"), path.join(dir, f)], {
    encoding: "utf8",
    timeout: 180000,
  });
  const out = (r.stdout || "") + (r.stderr || "");
  const m = out.match(/(\d+) ok, (\d+) failed\s*$/);
  if (!m) {
    console.log(`CRASH  ${f}\n${out.split("\n").slice(-6).join("\n")}`);
    fresh++;
    failed++;
    continue;
  }
  const o = +m[1],
    x = +m[2],
    allowed = (known[f] && known[f].count) || 0;
  ok += o;
  failed += x;
  const tag = x === 0 ? "ok    " : x <= allowed ? "KNOWN " : "FAIL  ";
  if (x > allowed) fresh++;
  const skip = out.match(/^SKIP (.*)$/m);
  const note = x && x <= allowed ? "   (" + known[f].why + ")" : skip ? "   (SKIP: " + skip[1] + ")" : "";
  console.log(`${tag} ${f.padEnd(40)} ${String(o).padStart(4)} ok ${String(x).padStart(3)} failed${note}`);
  if (x > allowed)
    console.log(
      out
        .split("\n")
        .filter(l => /^FAIL/.test(l))
        .slice(0, 8)
        .join("\n")
    );
}
console.log(`\n${files.length} files, ${ok} checks ok, ${failed} failed, ${fresh} files with a new failure.`);

// Each script address has a version stamp that comes from the content of the script. An old stamp is a failure.
const oldStamps = require(path.join(dir, "..", "..", "tools", "game_stamp.cjs")).check();
console.log(
  oldStamps.length
    ? `Version stamps: OLD in ${oldStamps.join(", ")}. Run: node tools/game_stamp.cjs`
    : "Version stamps: correct."
);
process.exit(fresh || oldStamps.length ? 1 : 0);
