#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Makes game/core/paylayers.js from js/math/paylayers.js (What it is / What it could be, run A, Nov 27 2026), so the web app
// and the game have one copy of the two numbers and of the layer chart's year-by-year run. The game has classic
// scripts and no modules: this tool takes the import line and the word `export` off, and adds the game's file header.
// wayPay comes from game/core/withdraw.js, which the game loads first.
// Usage: node tools/game_paylayers_build.mjs           write the copy
//        node tools/game_paylayers_build.mjs --check   change nothing; exit 1 when the copy is stale
// Run the game steps after it (tools/game_stamp.cjs, tools/game_codemap.py). test/paylayers.test.js and
// game/tests/what-it-could-be.js fail when the copy is old.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const from = new URL('../js/math/paylayers.js', import.meta.url), to = new URL('../game/core/paylayers.js', import.meta.url);
const src = readFileSync(from, 'utf8');
const hash = createHash('sha256').update(src).digest('hex').slice(0, 16);
const body = src.replace(/^\/\/ SPDX-License-Identifier:.*\n/, '').replace(/^import .*\n/gm, '').replace(/^export /gm, '');
const names = [...src.matchAll(/^export (?:function|const) (\w+)/gm)].map(m => m[1]);
const head = `/* ============================================================================
   SLAM the Game: core/paylayers.js
   PURPOSE     What it is / What it could be: the standard FI number and its age, the same number after
               the things a player counted, and the year-by-year run of the layer chart from today to
               95 (what each year costs, which layer pays for it, and what is not covered yet).
   INPUT       Plain numbers from the caller (features/couldbe.js makes them from the profile). It
               reads no profile and no screen.
   OUTPUT      ${names.length} functions and constants: ${names.join(', ').replace(/(.{1,84})(, |$)/g, '$1$2\n               ').trimEnd()}
   DEPENDS ON  core/withdraw.js (wayPay: one year on one pile).
   RULES       GENERATED FILE. Do not edit it. It is a copy of js/math/paylayers.js of the main app.
               tools/game_paylayers_build.mjs makes it. Change the source, then run the tool.
               Prettier does not format this file (.prettierignore).
   SOURCE-HASH  ${hash}
   ========================================================================= */
`;
// The spending-shape default of the reference data (retirementPhases), for the game: it has no reference file of its own.
const all = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url), 'utf8')), ref = all.retirementPhases, ssRef = all.socialSecurity.trustFund;
const out = head + body + `// The go-go, slow-go and no-go shares and their source (data/reference-2026.json, retirementPhases), read with lyShapeBands.\nconst LY_SHAPE_REF = ${JSON.stringify(ref)};\n// The share of Social Security that the trust fund report says can still be paid (socialSecurity.trustFund).\nconst LY_SS_REF = ${JSON.stringify(ssRef)};\n`;
if (process.argv.includes('--check')) {
  let now = '';
  try { now = readFileSync(to, 'utf8'); } catch { now = ''; }
  if (now !== out) { console.error('game/core/paylayers.js is stale: run node tools/game_paylayers_build.mjs'); process.exit(1); }
  console.log('game/core/paylayers.js is current.');
} else {
  writeFileSync(to, out);
  console.log(`game/core/paylayers.js written from js/math/paylayers.js (${names.length} names, hash ${hash}).`);
}
