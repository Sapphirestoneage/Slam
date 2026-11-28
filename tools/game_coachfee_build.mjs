#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// The coaching fee math is written once, in js/math/coachfee.js (a module, no imports). SLAM the Game loads plain
// scripts with one global scope, so this tool writes the same code as a plain script: game/core/coachfee.js. It
// removes the word "export" and puts the game's file header on top.
// Usage: node tools/game_coachfee_build.mjs          write the copy
//        node tools/game_coachfee_build.mjs --check  change nothing; exit 1 when the copy is stale
// Both test suites run the check (test/coachfee.test.js, game/tests/pays-for-itself.js).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const at = p => new URL(`../${p}`, import.meta.url);
const HEAD = `/* ============================================================================
   SLAM the Game: core/coachfee.js
   PURPOSE     The coaching fee math (run CC-1, items 21 and 22): what a first call found (fees, bonuses,
               interest saved) next to the one fee of the coach, and one portfolio with a flat fee next
               to a yearly fee on the assets. features/paysitself.js uses it, for a coach only.
   INPUT       Numbers only. No profile, no screen.
   OUTPUT      Constants: CO_RULES, CO_SOURCES. Functions: coFeesAbove, coPaysForItself, coFlatVsAum.
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. The source is js/math/coachfee.js of the main SLAM app. To
               change a rule, change the source, then run: node tools/game_coachfee_build.mjs. The tests
               fail when this copy is stale. Prettier does not format this file (.prettierignore).
   ========================================================================= */
`;
export function built() {
  const src = readFileSync(at('js/math/coachfee.js'), 'utf8');
  const body = src.split('\n').filter(l => !l.startsWith('// SPDX-License-Identifier')).join('\n').replace(/^export /gm, '');
  if (/^\s*import /m.test(body) || /\bexport\b/.test(body.replace(/\/\/.*$/gm, ''))) throw new Error('js/math/coachfee.js must stay free of imports, and export only at the start of a line.');
  return `${HEAD}${body}`;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const u = at('game/core/coachfee.js'), text = built();
  if (process.argv.includes('--check')) {
    let old = null;
    try { old = readFileSync(u, 'utf8'); } catch { /* missing counts as stale */ }
    if (old !== text) { console.log('game/core/coachfee.js is stale. Run: node tools/game_coachfee_build.mjs'); process.exit(1); }
    console.log('game/core/coachfee.js matches js/math/coachfee.js.');
  } else { writeFileSync(u, text); console.log('game/core/coachfee.js written.'); }
}
