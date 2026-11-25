#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Gig and self-employed math is written once, in js/math/gig.js (a module). SLAM the Game loads plain scripts with
// one global scope, so this tool writes the same code as a plain script: game/core/gigcore.js. It only removes the
// word "export" and puts the game's file header on top. Nothing else changes, so the two cannot drift.
// Usage: node tools/game_gig_build.mjs          write the copy
//        node tools/game_gig_build.mjs --check  change nothing; exit 1 when the copy is stale
// Both test suites run the check (test/gig.test.js, game/tests/working-for-yourself.js).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const from = new URL('../js/math/gig.js', import.meta.url), to = new URL('../game/core/gigcore.js', import.meta.url);
const HEAD = `/* ============================================================================
   SLAM the Game: core/gigcore.js
   PURPOSE     Gig and self-employed math with no tax engine: the price floor from a profit before tax
               and the billable hours, the set-aside so far, retirement room for the self-employed,
               invoices and how late they are, apps and tips added up, and a Profit First split. The
               sheet "Working for yourself" (features/gig.js) uses it.
   INPUT       Numbers, dates (YYYY-MM-DD) and lists. No profile, no screen.
   OUTPUT      Constants: GIG_OWNER_RATE, GIG_TERMS, GIG_AGES, GIG_NUDGES, GIG_PF_KEYS, GIG_PF_SAMPLE.
               Functions: gigNeedOf, gigHoursOf, gigFloorFrom, gigProfitFlat, gigSoFarFrom,
               gigLimitsOf, gigRetireOf, gigInvoiceOf, gigInvoicesOf, gigNudgeOf, gigAppsOf,
               gigProfitFirstOf.
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. The source is js/math/gig.js of the main SLAM app, so
               the small pages of the web app and the game have one copy of each rule. To change a
               rule, change the source, then run: node tools/game_gig_build.mjs. The tests fail when
               this copy is stale. Prettier does not format this file (.prettierignore).
   ========================================================================= */
`;
export function built() {
  const src = readFileSync(from, 'utf8');
  const body = src.split('\n').filter(l => !l.startsWith('// SPDX-License-Identifier')).join('\n').replace(/^export /gm, '');
  if (/^\s*import /m.test(body) || /\bexport\b/.test(body.replace(/\/\/.*$/gm, ''))) throw new Error('js/math/gig.js must stay free of imports, and export only at the start of a line.');
  return HEAD + body;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = built();
  if (process.argv.includes('--check')) {
    let now = ''; try { now = readFileSync(to, 'utf8'); } catch { now = ''; }
    if (now !== text) { console.log('game/core/gigcore.js is stale. Run: node tools/game_gig_build.mjs'); process.exit(1); }
    console.log('game/core/gigcore.js matches js/math/gig.js.');
  } else { writeFileSync(to, text); console.log('game/core/gigcore.js written.'); }
}
