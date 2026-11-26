#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Giving is written once, in js/math/giving.js (a module, no imports). SLAM the Game loads plain scripts with one
// global scope, so this tool writes the same code as a plain script: game/core/giving.js. It removes the word
// "export", puts the game's file header on top, and adds GV_TAX: the 2026 federal rows of data/reference-2026.json
// that bunching reads (the standard deduction, the brackets, the charitable rules of P.L. 119-21), so both apps read
// the same dated rows.
// Usage: node tools/game_giving_build.mjs          write the copy
//        node tools/game_giving_build.mjs --check  change nothing; exit 1 when the copy is stale
// Both test suites run the check (test/giving.test.js, game/tests/giving.js).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const at = p => new URL(`../${p}`, import.meta.url);
const HEAD = `/* ============================================================================
   SLAM the Game: core/giving.js
   PURPOSE     Giving (run Finish everything partly built, Part 16): the giving rate on the base the
               player picks, the target a share comes to (maaser is commonly 10%), one gift in hours,
               days and what it would have grown to, bunching two or three years of giving into one
               on the 2026 federal tax, envelopes inside one account, and the maaser credit for
               giving ahead. The sheet Giving (features/giving.js) uses it.
   INPUT       Numbers only. No profile, no screen.
   OUTPUT      Constants: GV_RULES, GV_BASES, GV_TAX. Functions: gvIsGiving, gvBase, gvRate,
               gvTarget, gvGift, gvStepped, gvYear, gvBunch, gvEnvelopes, gvCredit.
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. The source is js/math/giving.js of the main SLAM app, with
               the tax rows of data/reference-2026.json. To change a rule or a row, change the source,
               then run: node tools/game_giving_build.mjs. The tests fail when this copy is stale.
               Prettier does not format this file (.prettierignore).
   ========================================================================= */
`;
export function taxRows() {
  const t = JSON.parse(readFileSync(at('data/reference-2026.json'), 'utf8')).tax;
  return { std: t.standardDeduction, brackets: t.brackets, charity: t.charity };
}
export function built() {
  const src = readFileSync(at('js/math/giving.js'), 'utf8');
  const body = src.split('\n').filter(l => !l.startsWith('// SPDX-License-Identifier')).join('\n').replace(/^export /gm, '');
  if (/^\s*import /m.test(body) || /\bexport\b/.test(body.replace(/\/\/.*$/gm, ''))) throw new Error('js/math/giving.js must stay free of imports, and export only at the start of a line.');
  return `${HEAD}${body}// The 2026 federal rows of data/reference-2026.json that bunching reads.
const GV_TAX = ${JSON.stringify(taxRows())};
`;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const u = at('game/core/giving.js'), text = built();
  if (process.argv.includes('--check')) {
    let old = null;
    try { old = readFileSync(u, 'utf8'); } catch { /* missing counts as stale */ }
    if (old !== text) { console.log('game/core/giving.js is stale. Run: node tools/game_giving_build.mjs'); process.exit(1); }
    console.log('game/core/giving.js matches js/math/giving.js and data/reference-2026.json.');
  } else { writeFileSync(u, text); console.log('game/core/giving.js written.'); }
}
