#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Investing is written once, in js/math/invest.js (a module). SLAM the Game loads plain scripts with one global
// scope, so this tool writes the same code as a plain script: game/core/invest.js. It removes the word "export",
// drops the one import (crRothTrad, which the game already has from game/core/career.js, loaded before this file)
// and puts the game's file header on top. Nothing else changes, so the two cannot drift.
// Usage: node tools/game_invest_build.mjs          write the copy
//        node tools/game_invest_build.mjs --check  change nothing; exit 1 when the copy is stale
// Both test suites run the check (test/invest.test.js, game/tests/investing.js).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const from = new URL('../js/math/invest.js', import.meta.url), to = new URL('../game/core/invest.js', import.meta.url);
const HEAD = `/* ============================================================================
   SLAM the Game: core/invest.js
   PURPOSE     Investing (run Finish everything partly built, Part 13): the household mix across every
               account (the stock share next to a target, the three-fund check, employer stock and any
               one company), the fee and product X-ray (every fund, its fee in dollars, a sales charge,
               account and advisor fees), invest or pay debt as one small grid, and Roth or traditional
               account by account. The sheets "Investment mix and fees" (features/mix.js) and
               "Invest or pay debt" and "Roth or traditional, by account" (features/invest.js) use it.
   INPUT       Numbers only. No profile, no screen.
   OUTPUT      Constants: IV_RULES, IV_SOURCES, IV_CLASSES. Functions: ivMix, ivFees, ivHeatCell, ivHeat,
               ivTaxKind, ivRoth.
   DEPENDS ON  core/career.js (crRothTrad).
   RULES       GENERATED FILE. Do not edit it. The source is js/math/invest.js of the main SLAM app, so
               invest.html of the web app and the game have one copy of each rule. To change a rule,
               change the source, then run: node tools/game_invest_build.mjs. The tests fail when this
               copy is stale. Prettier does not format this file (.prettierignore).
   ========================================================================= */
`;
export function built() {
  const src = readFileSync(from, 'utf8');
  const body = src.split('\n').filter(l => !l.startsWith('// SPDX-License-Identifier') && l !== "import { crRothTrad } from './career.js';").join('\n').replace(/^export /gm, '');
  if (/^\s*import /m.test(body) || /\bexport\b/.test(body.replace(/\/\/.*$/gm, ''))) throw new Error('js/math/invest.js may import only crRothTrad from ./career.js, and export only at the start of a line.');
  return HEAD + body;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = built();
  if (process.argv.includes('--check')) {
    let now = ''; try { now = readFileSync(to, 'utf8'); } catch { now = ''; }
    if (now !== text) { console.log('game/core/invest.js is stale. Run: node tools/game_invest_build.mjs'); process.exit(1); }
    console.log('game/core/invest.js matches js/math/invest.js.');
  } else { writeFileSync(to, text); console.log('game/core/invest.js written.'); }
}
