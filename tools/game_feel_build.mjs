#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Game feel is written once, in js/math/feel.js (a module, no imports). SLAM the Game loads plain scripts with one
// global scope, so this tool writes the same code as a plain script: game/core/feel.js. It removes the word "export",
// puts the game's file header on top, and adds GF_PRESETS: the plan's withdrawal rate and return after inflation from
// data/reference-2026.json (presets), so the web page end.html and the game's Start at the finish line read the same row.
// Usage: node tools/game_feel_build.mjs          write the copy
//        node tools/game_feel_build.mjs --check  change nothing; exit 1 when the copy is stale
// Both test suites run the check (test/feel.test.js, game/tests/game-feel.js).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const at = p => new URL(`../${p}`, import.meta.url);
const HEAD = `/* ============================================================================
   SLAM the Game: core/feel.js
   PURPOSE     Game feel (run Finish everything partly built, Part 20): start at the finish line (work
               back from what you need to what today has to look like), the race against your past
               self, the bottleneck finder (eight kinds, ranked from your numbers and your taps, and
               "Is this really it?"), and the made-up composite stories. features/feel.js uses it.
   INPUT       Numbers only. No profile, no screen.
   OUTPUT      Constants: GF_RULES, GF_NEED_MONTH, GF_WHEN_YEARS, GF_KINDS, GF_CHECKS, GF_REAL, GF_TAPS,
               GF_STORY_LABEL, GF_STORIES, GF_PRESETS. Functions: gfBackwards, gfPastSelf, gfBottleneck,
               gfStories.
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. The source is js/math/feel.js of the main SLAM app, with
               the presets of data/reference-2026.json. To change a rule, change the source, then run:
               node tools/game_feel_build.mjs. The tests fail when this copy is stale.
               Prettier does not format this file (.prettierignore).
   ========================================================================= */
`;
export function presets() {
  const p = JSON.parse(readFileSync(at('data/reference-2026.json'), 'utf8')).presets;
  return { withdrawalRate: p.withdrawalRate.default, realReturn: p.realReturn.default };
}
export function built() {
  const src = readFileSync(at('js/math/feel.js'), 'utf8');
  const body = src.split('\n').filter(l => !l.startsWith('// SPDX-License-Identifier')).join('\n').replace(/^export /gm, '');
  if (/^\s*import /m.test(body) || /\bexport\b/.test(body.replace(/\/\/.*$/gm, ''))) throw new Error('js/math/feel.js must stay free of imports, and export only at the start of a line.');
  return `${HEAD}${body}// The plan's presets of data/reference-2026.json that the finish line reads.
const GF_PRESETS = ${JSON.stringify(presets())};
`;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const u = at('game/core/feel.js'), text = built();
  if (process.argv.includes('--check')) {
    let old = null;
    try { old = readFileSync(u, 'utf8'); } catch { /* missing counts as stale */ }
    if (old !== text) { console.log('game/core/feel.js is stale. Run: node tools/game_feel_build.mjs'); process.exit(1); }
    console.log('game/core/feel.js matches js/math/feel.js and data/reference-2026.json.');
  } else { writeFileSync(u, text); console.log('game/core/feel.js written.'); }
}
