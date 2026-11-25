#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Career and education is written once, in js/math/career.js (a module). SLAM the Game loads plain scripts with
// one global scope, so this tool writes the same code as a plain script: game/core/career.js. It only removes the
// word "export" and puts the game's file header on top. Nothing else changes, so the two cannot drift.
// Usage: node tools/game_career_build.mjs          write the copy
//        node tools/game_career_build.mjs --check  change nothing; exit 1 when the copy is stale
// Both test suites run the check (test/career.test.js, game/tests/career-and-education.js).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const from = new URL('../js/math/career.js', import.meta.url), to = new URL('../game/core/career.js', import.meta.url);
const HEAD = `/* ============================================================================
   SLAM the Game: core/career.js
   PURPOSE     Career and education: what a course or degree costs and pays back (the payback years, the
               lifetime value, the move for the FI date), the presets, two paths side by side, the
               credential stack with its overlaps, the dollars of the match left behind before it vests,
               and the three moves of the launch window (a job hop, Roth or traditional now, a house
               hack). The screen "Career and education" (features/career.js) uses it.
   INPUT       Numbers only. No profile, no screen.
   OUTPUT      Constants: CR_VEST, CR_VEST_SOURCE, CR_RULES, CR_PRESETS, CR_SAMPLE, CR_OPTS, CR_SOURCES.
               Functions: crRoi, crRoiWords, crRoiMath, crLevel, crCompare, crStack, crStackWords,
               crVested, crVestLeft, crVestWords, crVestMath, crVestLevel, crHop, crRothTrad, crHack,
               crDays, crDayWords, crLaunchMath, crLoanPayment.
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. The source is js/math/career.js of the main SLAM app,
               so career.html of the web app and the game have one copy of each rule. To change a rule,
               change the source, then run: node tools/game_career_build.mjs. The tests fail when this
               copy is stale. Prettier does not format this file (.prettierignore).
   ========================================================================= */
`;
export function built() {
  const src = readFileSync(from, 'utf8');
  const body = src.split('\n').filter(l => !l.startsWith('// SPDX-License-Identifier')).join('\n').replace(/^export /gm, '');
  if (/^\s*import /m.test(body) || /\bexport\b/.test(body.replace(/\/\/.*$/gm, ''))) throw new Error('js/math/career.js must stay free of imports, and export only at the start of a line.');
  return HEAD + body;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = built();
  if (process.argv.includes('--check')) {
    let now = ''; try { now = readFileSync(to, 'utf8'); } catch { now = ''; }
    if (now !== text) { console.log('game/core/career.js is stale. Run: node tools/game_career_build.mjs'); process.exit(1); }
    console.log('game/core/career.js matches js/math/career.js.');
  } else { writeFileSync(to, text); console.log('game/core/career.js written.'); }
}
