#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Makes game/core/hardcore.js from js/math/hard.js and data/sources/hard-2026.json, so the web app and the game work
// out the hard moments (the roommate leaving, untangling, the checklists, the words to copy, money that waits) with
// one function each, on one dated list of steps, scripts and resource lines. The game has classic scripts and no
// modules: this tool takes the word `export` off each declaration, adds the game's file header, and writes the data as
// HM_REF. Run it after each change of either file, then the game steps (prettier, tools/game_stamp.cjs,
// tools/game_codemap.py).
// Usage: node tools/game_hard_build.mjs          write the copy
//        node tools/game_hard_build.mjs --check  change nothing; exit 1 when the copy is stale
// test/hard.test.js and game/tests/hard-moments.js run the check.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const from = new URL('../js/math/hard.js', import.meta.url), data = new URL('../data/sources/hard-2026.json', import.meta.url), to = new URL('../game/core/hardcore.js', import.meta.url);
export function built() {
  const src = readFileSync(from, 'utf8'), ref = JSON.parse(readFileSync(data, 'utf8'));
  const hash = createHash('sha256').update(src + JSON.stringify(ref)).digest('hex').slice(0, 16);
  const body = src.replace(/^\/\/ SPDX-License-Identifier:.*\n/, '').replace(/^export /gm, '');
  if (/^\s*import /m.test(body)) throw new Error('js/math/hard.js must stay free of imports.');
  const names = [...src.matchAll(/^export (?:function|const) (\w+)/gm)].map(m => m[1]);
  const head = `/* ============================================================================
   SLAM the Game: core/hardcore.js
   PURPOSE     The math and the words of Hard moments (run Not built, groups 1 to 5, Part 7): the split
               of the rent, a roommate leaving, untangling after a breakup, a checklist, words to copy
               with the player's numbers, money that waits; and HM_REF, the dated steps, scripts and
               help lines of data/sources/hard-2026.json.
   INPUT       Plain numbers and lists from the caller. It reads no profile and no screen.
   OUTPUT      ${names.length + 1} functions and constants: HM_REF, ${names.join(', ').replace(/(.{1,84})(, |$)/g, '$1$2\n               ').trimEnd()}
   DEPENDS ON  Nothing. hmRoommateExit and splitSharesOf take rowShare from the caller (core/trip.js).
   RULES       GENERATED FILE. Do not edit it. It is a copy of js/math/hard.js of the main app, and
               HM_REF is data/sources/hard-2026.json. tools/game_hard_build.mjs makes it. Change the
               source, then run the tool. Prettier does not format this file (.prettierignore).
   SOURCE-HASH  ${hash}
   ========================================================================= */
/* The dated steps, scripts and help lines (data/sources/hard-2026.json): each line names its source and date. */
const HM_REF = ${JSON.stringify(ref)};
`;
  return head + body;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = built();
  if (process.argv.includes('--check')) {
    let now = ''; try { now = readFileSync(to, 'utf8'); } catch { now = ''; }
    if (now !== text) { console.log('game/core/hardcore.js is stale. Run: node tools/game_hard_build.mjs'); process.exit(1); }
    console.log('game/core/hardcore.js matches js/math/hard.js and data/sources/hard-2026.json.');
  } else { writeFileSync(to, text); console.log('game/core/hardcore.js written.'); }
}
