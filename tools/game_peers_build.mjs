#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Comparing with peers is written once, in js/math/peers.js (a module, no imports). SLAM the Game loads plain scripts
// with one global scope, so this tool writes the same code as a plain script: game/core/peers.js. It removes the word
// "export", puts the game's file header on top, and adds PE_PRIORS: the rows of data/priors-2026.json the peers
// screen reads (net worth by age, the savings rate, income, the shares) with their sources, so both apps read the
// same dated rows. Quest mode's rank (core/quest.js, qsRank) calls peNetWorth from this copy.
// Usage: node tools/game_peers_build.mjs          write the copy
//        node tools/game_peers_build.mjs --check  change nothing; exit 1 when the copy is stale
// Both test suites run the check (test/peers.test.js, game/tests/people-like-you.js).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const at = p => new URL(`../${p}`, import.meta.url);
export const PE_FIELDS = ['netWorth', 'savingRate', 'income', 'cover400', 'emergency3mo', 'retirement', 'card', 'studentLoans', 'cash'];
const HEAD = `/* ============================================================================
   SLAM the Game: core/peers.js
   PURPOSE     Comparing with peers (run Finish everything partly built, Part 9): net worth next to the
               middle household of your age, your savings rate next to the country's, your pay next to
               the middle household's, "people like you" lines from the published shares, and the next
               milestone of the journey. The sheet "You and people like you" (features/peers.js) and
               Quest mode's rank (core/quest.js, qsRank) use it.
   INPUT       Numbers only. No profile, no screen.
   OUTPUT      Constants: PE_RULES, PE_WORDS, PE_QUARTERS, PE_NOT_YET, PE_PRIORS. Functions: peRow,
               peSource, peWhere, peNetWorth, peSaving, peIncome, pePatterns, peNext.
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. The source is js/math/peers.js of the main SLAM app, with
               the rows of data/priors-2026.json. To change a rule or a row, change the source, then run:
               node tools/game_peers_build.mjs. The tests fail when this copy is stale.
               Prettier does not format this file (.prettierignore).
   ========================================================================= */
`;
export function peerRows() {
  const P = JSON.parse(readFileSync(at('data/priors-2026.json'), 'utf8'));
  const rows = P.rows.filter(r => PE_FIELDS.includes(r.field) && r.household == null && r.place == null);
  const used = [...new Set(rows.map(r => r.source))];
  return { asOf: P.asOf, sources: Object.fromEntries(used.map(k => [k, P.sources[k]])), rows };
}
export function built() {
  const src = readFileSync(at('js/math/peers.js'), 'utf8');
  const body = src.split('\n').filter(l => !l.startsWith('// SPDX-License-Identifier')).join('\n').replace(/^export /gm, '');
  if (/^\s*import /m.test(body) || /\bexport\b/.test(body.replace(/\/\/.*$/gm, ''))) throw new Error('js/math/peers.js must stay free of imports, and export only at the start of a line.');
  return `${HEAD}${body}// The rows of data/priors-2026.json the peers screen reads, with their sources.
const PE_PRIORS = ${JSON.stringify(peerRows())};
`;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const u = at('game/core/peers.js'), text = built();
  if (process.argv.includes('--check')) {
    let old = null;
    try { old = readFileSync(u, 'utf8'); } catch { /* missing counts as stale */ }
    if (old !== text) { console.log('game/core/peers.js is stale. Run: node tools/game_peers_build.mjs'); process.exit(1); }
    console.log('game/core/peers.js matches js/math/peers.js and data/priors-2026.json.');
  } else { writeFileSync(u, text); console.log('game/core/peers.js written.'); }
}
