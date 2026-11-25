#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Home buying and renting is written once, in js/math/homebuy.js (a module). SLAM the Game loads plain scripts with
// one global scope, so this tool writes the same code as a plain script: game/core/homebuy.js. It only removes the
// word "export" and puts the game's file header on top. Nothing else changes, so the two cannot drift.
// Usage: node tools/game_homebuy_build.mjs          write the copy
//        node tools/game_homebuy_build.mjs --check  change nothing; exit 1 when the copy is stale
// Both test suites run the check (test/homebuy.test.js, game/tests/home-buying-and-renting.js).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const from = new URL('../js/math/homebuy.js', import.meta.url), to = new URL('../game/core/homebuy.js', import.meta.url);
const HEAD = `/* ============================================================================
   SLAM the Game: core/homebuy.js
   PURPOSE     Home buying and renting: the bank's payment (principal and interest), the true cost of
               owning line by line, the true cost of renting, the year owning comes out ahead, the
               price-to-rent ratio and the 5% rule. The simulator "Rent or buy"
               (features/sims/rentbuy.js) uses it.
   INPUT       Numbers only. No profile, no screen.
   OUTPUT      Constants: HB_RULES, HB_SOURCE, HB_OPTS, HB_LINES. Functions: hbPayment, hbRun,
               hbBreakeven, hbPriceToRent, hbFivePercent, hbBreakevenWords.
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. The source is js/math/homebuy.js of the main SLAM app,
               so home.html of the web app and the game have one copy of each rule. To change a rule,
               change the source, then run: node tools/game_homebuy_build.mjs. The tests fail when this
               copy is stale. Prettier does not format this file (.prettierignore).
   ========================================================================= */
`;
export function built() {
  const src = readFileSync(from, 'utf8');
  const body = src.split('\n').filter(l => !l.startsWith('// SPDX-License-Identifier')).join('\n').replace(/^export /gm, '');
  if (/^\s*import /m.test(body) || /\bexport\b/.test(body.replace(/\/\/.*$/gm, ''))) throw new Error('js/math/homebuy.js must stay free of imports, and export only at the start of a line.');
  return HEAD + body;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = built();
  if (process.argv.includes('--check')) {
    let now = ''; try { now = readFileSync(to, 'utf8'); } catch { now = ''; }
    if (now !== text) { console.log('game/core/homebuy.js is stale. Run: node tools/game_homebuy_build.mjs'); process.exit(1); }
    console.log('game/core/homebuy.js matches js/math/homebuy.js.');
  } else { writeFileSync(to, text); console.log('game/core/homebuy.js written.'); }
}
