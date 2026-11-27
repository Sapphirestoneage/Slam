#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Makes game/era/gamecopy.js for the 60-second demo "Find your era" (game/era/, run CC-1, item 7, Nov 27 2026).
// The demo is one small page outside the game. It asks the range questions of the game's own entry (What it is /
// What it could be) and shows the labels with the game's own money words. Those live in files that cannot load
// alone (features/couldbe.js, features/look.js, screens/ui.js). This tool copies the named declarations, word for
// word, so the demo and the game ask with one set of ranges and one formatter. Nothing is rewritten.
// Usage: node tools/game_era_build.mjs           write the copy
//        node tools/game_era_build.mjs --check   change nothing; exit 1 when the copy is stale
// test/era-demo.test.js and game/tests/find-your-era-demo.js fail when the copy is old.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../game/', import.meta.url), to = new URL('era/gamecopy.js', root);
// [file, the names to copy, in the order they are written]
const PARTS = [
  ['screens/ui.js', ['roughOn', 'money', 'esc']],
  ['features/look.js', ['lkK']],
  ['features/couldbe.js', ['CB_RNG', 'CB_QS', 'cbRng', 'cbRows', 'cbLab']],
];

// One top-level declaration: its first line starts at column 0 with "const NAME =" or "function NAME(". It goes on
// while a line is indented, empty, or starts with a closing bracket (Prettier puts each top-level statement so).
function take(src, name, file) {
  const lines = src.split('\n'), at = lines.findIndex(l => new RegExp(`^(?:const ${name} =|function ${name}\\()`).test(l));
  if (at < 0) throw new Error(`${file} has no top-level declaration of ${name}: change PARTS in tools/game_era_build.mjs`);
  let end = at + 1;
  while (end < lines.length && (/^\s/.test(lines[end]) || lines[end] === '' || /^[}\])]/.test(lines[end]))) end++;
  while (lines[end - 1] === '') end--;
  // the comment lines directly above it belong to it
  let from = at;
  while (from > 0 && /^(\/\*| {3}|\s*\*\/)/.test(lines[from - 1]) && !/^\s*$/.test(lines[from - 1])) {
    from--;
    if (/^\/\*/.test(lines[from])) break;
  }
  if (!/^\/\*/.test(lines[from])) from = at;
  return lines.slice(from, end).join('\n');
}

let body = '', all = [];
for (const [file, names] of PARTS) {
  const src = readFileSync(new URL(file, root), 'utf8');
  body += `\n/* ---------- from ${file} ---------- */\n` + names.map(n => take(src, n, file)).join('\n') + '\n';
  all = all.concat(names);
}
const hash = createHash('sha256').update(body).digest('hex').slice(0, 16);
const head = `/* ============================================================================
   SLAM the Game: era/gamecopy.js
   PURPOSE     The parts of the game that the demo "Find your era" (era/index.html) shows and that cannot
               load alone: the range chips of the entry and their labels, and the money words.
   INPUT       Nothing.
   OUTPUT      ${all.join(', ')}, and G (empty: the demo has no saved game).
   DEPENDS ON  core/engine.js (SPEND_K, SPLIT).
   RULES       GENERATED FILE. Do not edit it. Each part is a word-for-word copy of a declaration in
               ${PARTS.map(p => p[0]).join(', ')}.
               tools/game_era_build.mjs makes it. Change the source, then run the tool.
               The game does not load this file. Prettier does not format it (.prettierignore).
   SOURCE-HASH  ${hash}
   ========================================================================= */
/* The demo has no saved game. The money words read G for the switch "Rough numbers". */
const G = null;
`;
const out = head + body;
if (process.argv.includes('--check')) {
  let now = '';
  try { now = readFileSync(to, 'utf8'); } catch { now = ''; }
  if (now !== out) { console.error('game/era/gamecopy.js is stale: run node tools/game_era_build.mjs'); process.exit(1); }
  console.log('game/era/gamecopy.js is current.');
} else {
  writeFileSync(to, out);
  console.log(`game/era/gamecopy.js written (${all.length} names, hash ${hash}).`);
}
