#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Makes game/core/canonmath.js from js/math/canonmath.js (run Finish everything partly built, Part 21), so the web app
// and the game work out the F-You money meter, the Money Guy's nine, the hand-off check, the noodle budget, pay
// yourself first, Shockingly Simple Math and Your Money or Your Life steps 1b and 3 with one function each. The game
// has classic scripts and no modules: this tool takes the word `export` off each declaration and adds the game's file
// header. Run it after each change of the source, then the game steps.
// Usage: node tools/game_canonmath_build.mjs          write the copy
//        node tools/game_canonmath_build.mjs --check  change nothing; exit 1 when the copy is stale
// test/canonmath.test.js and game/tests/canon-meters.js run the check.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const from = new URL('../js/math/canonmath.js', import.meta.url), to = new URL('../game/core/canonmath.js', import.meta.url);
export function built() {
  const src = readFileSync(from, 'utf8');
  const body = src.replace(/^\/\/ SPDX-License-Identifier:.*\n/, '').replace(/^export /gm, '');
  if (/^\s*import /m.test(body) || /\bexport\b/.test(body.replace(/\/\/.*$/gm, ''))) throw new Error('js/math/canonmath.js must stay free of imports, and export only at the start of a line.');
  const names = [...src.matchAll(/^export (?:function|const) (\w+)/gm)].map(m => m[1]);
  const head = `/* ============================================================================
   SLAM the Game: core/canonmath.js
   PURPOSE     The canon rows finished in Part 21: the F-You money meter, the Money Guy's nine, the
               hand-off check of the hourly value of your time, the noodle budget, pay yourself first,
               Shockingly Simple Math, and Your Money or Your Life steps 1b and 3. features/meters.js
               uses it.
   INPUT       Numbers only. No profile, no screen.
   OUTPUT      ${names.join(', ').replace(/(.{1,84})(, |$)/g, '$1$2\n               ').trimEnd().replace(/ +\n/g, '\n')}
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. The source is js/math/canonmath.js of the main SLAM app.
               To change a rule, change the source, then run: node tools/game_canonmath_build.mjs. The
               tests fail when this copy is stale. Prettier does not format this file (.prettierignore).
   ========================================================================= */
`;
  return head + body;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = built();
  if (process.argv.includes('--check')) {
    let now = ''; try { now = readFileSync(to, 'utf8'); } catch { now = ''; }
    if (now !== text) { console.log('game/core/canonmath.js is stale. Run: node tools/game_canonmath_build.mjs'); process.exit(1); }
    console.log('game/core/canonmath.js matches js/math/canonmath.js.');
  } else { writeFileSync(to, text); console.log('game/core/canonmath.js written.'); }
}
