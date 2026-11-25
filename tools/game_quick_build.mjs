#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// The quick calculators are written once, in js/math/quick.js (a module). SLAM the Game loads plain scripts with
// one global scope, so this tool writes the same code as a plain script: game/core/quick.js. It only removes the
// word "export" and puts the game's file header on top. Nothing else changes, so the two cannot drift.
// Usage: node tools/game_quick_build.mjs          write the copy
//        node tools/game_quick_build.mjs --check  change nothing; exit 1 when the copy is stale
// Both test suites run the check (test/quick.test.js, game/tests/quick-math.js).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const from = new URL('../js/math/quick.js', import.meta.url), to = new URL('../game/core/quick.js', import.meta.url);
const HEAD = `/* ============================================================================
   SLAM the Game: core/quick.js
   PURPOSE     The quick calculators: a HYSA switch, lump sum or a little each month, a warranty, cost
               per use, Return on Hassle, worth it, personal inflation, starting earlier, kids, a pet, a
               first apartment, New York unemployment and the runway with it. The sheet "Quick math"
               (features/quick.js) uses it.
   INPUT       Numbers only. No profile, no screen.
   OUTPUT      Constants: QC_KID_STAGES. Functions: qcGrow, qcMonthlyOf, qcNominal, qcHysa, qcDca,
               qcWarranty, qcPerUse, qcHassle, qcWorth, qcInflation, qcStart, qcKids, qcPet,
               qcApartment, qcUiNy, qcBenefitRunway.
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. The source is js/math/quick.js of the main SLAM app,
               so the small pages of the web app and the game have one copy of each rule. To change a
               rule, change the source, then run: node tools/game_quick_build.mjs. The tests fail when
               this copy is stale. Prettier does not format this file (.prettierignore).
   ========================================================================= */
`;
export function built() {
  const src = readFileSync(from, 'utf8');
  const body = src.split('\n').filter(l => !l.startsWith('// SPDX-License-Identifier')).join('\n').replace(/^export /gm, '');
  if (/^\s*import /m.test(body) || /\bexport\b/.test(body.replace(/\/\/.*$/gm, ''))) throw new Error('js/math/quick.js must stay free of imports, and export only at the start of a line.');
  return HEAD + body;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = built();
  if (process.argv.includes('--check')) {
    let now = ''; try { now = readFileSync(to, 'utf8'); } catch { now = ''; }
    if (now !== text) { console.log('game/core/quick.js is stale. Run: node tools/game_quick_build.mjs'); process.exit(1); }
    console.log('game/core/quick.js matches js/math/quick.js.');
  } else { writeFileSync(to, text); console.log('game/core/quick.js written.'); }
}
