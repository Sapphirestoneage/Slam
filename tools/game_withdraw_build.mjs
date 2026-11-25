#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// The ways to take money out are written once, in js/math/withdraw.js (a module). SLAM the Game loads plain scripts
// with one global scope, so this tool writes the same code as a plain script: game/core/withdraw.js. It only removes
// the word "export" and puts the game's file header on top. Nothing else changes, so the two cannot drift.
// Usage: node tools/game_withdraw_build.mjs          write the copy
//        node tools/game_withdraw_build.mjs --check  change nothing; exit 1 when the copy is stale
// Both test suites run the check (test/withdraw.test.js, game/tests/compare-the-ways.js).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const from = new URL('../js/math/withdraw.js', import.meta.url), to = new URL('../game/core/withdraw.js', import.meta.url);
const HEAD = `/* ============================================================================
   SLAM the Game: core/withdraw.js
   PURPOSE     The ways to take money out: the list of families and variants, the rule of each one for a
               year of spending, how the money is held, when the money comes out, and the summary of a
               set of market histories. "Compare the ways" (features/ways.js) and the replay of
               features/odds.js use it.
   INPUT       Numbers only. No profile, no screen.
   OUTPUT      Constants: UNIFORM, WAYS, WAY_FAMILIES, WAY_TIMINGS, WAY_HORIZONS, WAY_COLUMNS, WAY_FILTERS,
               WAY_CUSTOM_KINDS, WAY_CAPE, WAY_VPW, WAY_CASH_REAL, WAY_CUT_LINE. Functions: wayById,
               wayFamily, wayTolerance, wayCustom, wayOff, vpwShare, spendDownPayment, waySpend, wayReturn,
               wayPay, wayRandom, wayShuffle, wayCycle, wayHistory, waySort, wayFilter, wayPin, wayMeaning.
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. The source is js/math/withdraw.js of the main SLAM app,
               so the web app and the game have one copy of each rule. To change a rule, change the
               source, then run: node tools/game_withdraw_build.mjs. The tests fail when this copy is
               stale. Prettier does not format this file (.prettierignore).
   ========================================================================= */
`;
export function built() {
  const src = readFileSync(from, 'utf8');
  const body = src.split('\n').filter(l => !l.startsWith('// SPDX-License-Identifier')).join('\n').replace(/^export /gm, '');
  if (/^\s*import /m.test(body) || /\bexport\b/.test(body.replace(/\/\/.*$/gm, ''))) throw new Error('js/math/withdraw.js must stay free of imports, and export only at the start of a line.');
  return HEAD + body;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = built();
  if (process.argv.includes('--check')) {
    let now = ''; try { now = readFileSync(to, 'utf8'); } catch { now = ''; }
    if (now !== text) { console.log('game/core/withdraw.js is stale. Run: node tools/game_withdraw_build.mjs'); process.exit(1); }
    console.log('game/core/withdraw.js matches js/math/withdraw.js.');
  } else { writeFileSync(to, text); console.log('game/core/withdraw.js written.'); }
}
